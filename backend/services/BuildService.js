import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';
import pino from 'pino';
import { parseVCD } from '../parsers/VCDParser.js';

const logger = pino({ name: 'BuildService' });

/**
 * BuildService - Handles Verilog compilation and simulation with iverilog/vvp
 */
export class BuildService {
  constructor(projectManager, toolchainManager, wsManager) {
    this.projectManager = projectManager;
    this.toolchainManager = toolchainManager;
    this.wsManager = wsManager;
    this.activeBuilds = new Map(); // projectId -> build state
  }

  /**
   * Compile Verilog files with iverilog
   * @param {string} projectId - Project ID or name
   * @param {Object} options - Compilation options
   * @param {string} options.topModule - Top module name (optional, auto-detected if not provided)
   * @returns {Promise<Object>} Compilation result
   */
  async compile(projectId, { topModule } = {}) {
    // Ensure iverilog is available
    await this.toolchainManager.requireTool('iverilog');

    const project = await this.projectManager.getProject(projectId);
    if (!project) {
      throw new Error(`Project "${projectId}" not found`);
    }

    // Mark build as active
    this.activeBuilds.set(project.id, { stage: 'compile', startTime: Date.now() });

    try {
      this.broadcastProgress(project.id, 'compile', 10, 'Locating source files...');

      // Gather all Verilog source files
      const srcsPath = path.join(project.path, 'srcs', 'rtl');
      const verilogFiles = await this._findVerilogFiles(srcsPath);

      if (verilogFiles.length === 0) {
        throw new Error('No Verilog source files found in srcs/rtl/');
      }

      this.broadcastProgress(project.id, 'compile', 30, `Found ${verilogFiles.length} source file(s)`);

      // Create build output directory
      const buildDir = path.join(project.path, '.webvado', 'build');
      await fs.ensureDir(buildDir);

      const outFile = path.join(buildDir, 'design.vvp');

      this.broadcastProgress(project.id, 'compile', 50, 'Compiling with iverilog...');

      // Build iverilog command
      const args = [
        '-g2012',          // SystemVerilog-2012 standard
        '-Wall',           // All warnings
        '-o', outFile,
        ...verilogFiles
      ];

      if (topModule) {
        args.unshift('-s', topModule); // Specify top module
      }

      logger.info({ project: project.name, files: verilogFiles, topModule }, 'Starting iverilog compilation');

      // Run iverilog
      const result = await execa('iverilog', args, {
        cwd: project.path,
        timeout: 60000,
        reject: false,
        all: true
      });

      this.broadcastProgress(project.id, 'compile', 90, 'Parsing compilation output...');

      // Parse errors and warnings
      const diagnostics = this.parseErrors(result.stderr || result.stdout || '');

      const hasErrors = diagnostics.some(d => d.severity === 'error');

      if (hasErrors || result.exitCode !== 0) {
        this.broadcastProgress(project.id, 'compile', 100, 'Compilation failed');
        
        this.broadcast(project.id, 'build:complete', {
          stage: 'compile',
          success: false,
          errors: diagnostics,
          exitCode: result.exitCode
        });

        await this.projectManager.updateProject(project.id, {
          build_status: {
            last_compile: {
              success: false,
              timestamp: new Date().toISOString(),
              errors: diagnostics
            }
          }
        });

        return {
          success: false,
          diagnostics,
          exitCode: result.exitCode
        };
      }

      // Success
      this.broadcastProgress(project.id, 'compile', 100, 'Compilation successful');
      
      this.broadcast(project.id, 'build:complete', {
        stage: 'compile',
        success: true,
        errors: diagnostics, // May contain warnings
        outputFile: path.relative(project.path, outFile)
      });

      await this.projectManager.updateProject(project.id, {
        build_status: {
          last_compile: {
            success: true,
            timestamp: new Date().toISOString(),
            warnings: diagnostics.filter(d => d.severity === 'warning')
          }
        }
      });

      logger.info({ project: project.name, outputFile: outFile }, 'Compilation successful');

      return {
        success: true,
        diagnostics,
        outputFile: path.relative(project.path, outFile)
      };

    } catch (error) {
      this.broadcast(project.id, 'build:error', {
        stage: 'compile',
        error: error.message
      });

      logger.error({ project: project.name, error }, 'Compilation failed with exception');
      throw error;
    } finally {
      this.activeBuilds.delete(project.id);
    }
  }

  /**
   * Run simulation with vvp and generate VCD output
   * @param {string} projectId - Project ID or name
   * @param {Object} options - Simulation options
   * @param {string} options.topModule - Top module (for reference)
   * @param {number} options.runTime - Simulation time in nanoseconds (default: 1000000)
   * @returns {Promise<Object>} Simulation result with VCD data
   */
  async simulate(projectId, { topModule, runTime = 1000000 } = {}) {
    const project = await this.projectManager.getProject(projectId);
    if (!project) {
      throw new Error(`Project "${projectId}" not found`);
    }

    const buildDir = path.join(project.path, '.webvado', 'build');
    const vvpFile = path.join(buildDir, 'design.vvp');

    // Check if compiled file exists
    if (!await fs.pathExists(vvpFile)) {
      throw new Error('Design not compiled. Run compilation first.');
    }

    this.activeBuilds.set(project.id, { stage: 'simulate', startTime: Date.now() });

    try {
      this.broadcastProgress(project.id, 'simulate', 10, 'Starting simulation...');

      const vcdFile = path.join(buildDir, 'simulation.vcd');

      // Check if testbench generates VCD (assume it does via $dumpfile/$dumpvars)
      // If not, we'd need to inject it, but that's complex - assume testbench handles it

      logger.info({ project: project.name, runTime }, 'Starting vvp simulation');

      this.broadcastProgress(project.id, 'simulate', 30, 'Running vvp simulation...');

      // Run vvp
      const result = await execa('vvp', [vvpFile], {
        cwd: buildDir,
        timeout: 60000,
        reject: false,
        all: true
      });

      this.broadcastProgress(project.id, 'simulate', 70, 'Simulation complete, parsing VCD...');

      if (result.exitCode !== 0) {
        throw new Error(`Simulation failed: ${result.stderr || result.stdout}`);
      }

      // Check if VCD was generated
      if (!await fs.pathExists(vcdFile)) {
        // VCD file might have a different name specified in testbench
        // Try to find any .vcd file in build dir
        const files = await fs.readdir(buildDir);
        const vcdFiles = files.filter(f => f.endsWith('.vcd'));
        
        if (vcdFiles.length === 0) {
          throw new Error('No VCD file generated. Ensure your testbench includes $dumpfile and $dumpvars.');
        }

        // Use the first VCD found
        const foundVcd = path.join(buildDir, vcdFiles[0]);
        logger.info({ vcdFile: foundVcd }, 'Found VCD file');
        
        // Copy to expected location
        await fs.copy(foundVcd, vcdFile);
      }

      this.broadcastProgress(project.id, 'simulate', 90, 'Parsing waveform data...');

      // Parse VCD file
      const vcdContent = await fs.readFile(vcdFile, 'utf8');
      const waveformData = parseVCD(vcdContent);

      this.broadcastProgress(project.id, 'simulate', 100, 'Simulation complete');

      this.broadcast(project.id, 'build:complete', {
        stage: 'simulate',
        success: true,
        signals: waveformData.signals.length
      });

      await this.projectManager.updateProject(project.id, {
        build_status: {
          ...project.build_status,
          last_simulate: {
            success: true,
            timestamp: new Date().toISOString(),
            signals: waveformData.signals.length
          }
        }
      });

      logger.info({ project: project.name, signals: waveformData.signals.length }, 'Simulation successful');

      return {
        success: true,
        waveformData,
        vcdFile: path.relative(project.path, vcdFile)
      };

    } catch (error) {
      this.broadcast(project.id, 'build:error', {
        stage: 'simulate',
        error: error.message
      });

      logger.error({ project: project.name, error }, 'Simulation failed');
      throw error;
    } finally {
      this.activeBuilds.delete(project.id);
    }
  }

  /**
   * Parse iverilog stderr output into structured diagnostics
   * @param {string} stderr - iverilog stderr output
   * @returns {Array} Array of diagnostic objects
   */
  parseErrors(stderr) {
    if (!stderr || stderr.trim().length === 0) {
      return [];
    }

    const diagnostics = [];
    const lines = stderr.split('\n');

    for (const line of lines) {
      // Format: "file.v:line: error: message"
      // or     "file.v:line: warning: message"
      const match = line.match(/^(.+?):(\d+):\s*(error|warning):\s*(.+)$/);
      
      if (match) {
        const [, file, lineNum, severity, message] = match;
        diagnostics.push({
          file: path.basename(file),
          line: parseInt(lineNum, 10),
          col: null,
          severity: severity.toLowerCase(),
          message: message.trim()
        });
      } else if (line.trim().length > 0 && !line.startsWith(' ')) {
        // Some messages don't have file:line format - treat as info
        if (line.includes('error') || line.includes('Error')) {
          diagnostics.push({
            file: null,
            line: null,
            col: null,
            severity: 'error',
            message: line.trim()
          });
        } else if (line.includes('warning') || line.includes('Warning')) {
          diagnostics.push({
            file: null,
            line: null,
            col: null,
            severity: 'warning',
            message: line.trim()
          });
        }
      }
    }

    return diagnostics;
  }

  /**
   * Find all Verilog files in a directory recursively
   * @private
   */
  async _findVerilogFiles(dir) {
    const files = [];

    if (!await fs.pathExists(dir)) {
      return files;
    }

    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const subFiles = await this._findVerilogFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (ext === '.v' || ext === '.sv' || ext === '.vh') {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  /**
   * Broadcast build progress via WebSocket
   * @param {string} projectId - Project ID
   * @param {string} stage - Build stage (compile, simulate, etc.)
   * @param {number} percent - Progress percentage (0-100)
   * @param {string} message - Progress message
   */
  broadcastProgress(projectId, stage, percent, message) {
    this.broadcast(projectId, 'build:progress', {
      stage,
      percent,
      message
    });

    this.broadcast(projectId, 'build:log', {
      level: 'info',
      message
    });

    logger.debug({ projectId, stage, percent, message }, 'Build progress');
  }

  /**
   * Broadcast a message via WebSocket manager
   * @param {string} projectId - Project ID
   * @param {string} type - Message type
   * @param {Object} payload - Message payload
   */
  broadcast(projectId, type, payload) {
    if (this.wsManager) {
      this.wsManager.broadcast(projectId, type, payload);
    }
  }

  /**
   * Get current build status for a project
   * @param {string} projectId - Project ID or name
   * @returns {Promise<Object>}
   */
  async getBuildStatus(projectId) {
    const project = await this.projectManager.getProject(projectId);
    if (!project) {
      throw new Error(`Project "${projectId}" not found`);
    }

    const activeBuild = this.activeBuilds.get(project.id);

    return {
      active: !!activeBuild,
      stage: activeBuild?.stage || null,
      history: project.build_status || {}
    };
  }
}

export default BuildService;
