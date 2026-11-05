import { execa } from 'execa';
import pino from 'pino';

const logger = pino({ name: 'ToolchainManager' });

/**
 * ToolchainManager detects and manages hardware toolchain installations
 * on the system (iverilog, verilator, yosys, nextpnr, icepack, etc.)
 */
export class ToolchainManager {
  constructor() {
    this.cache = null;
    this.cacheTime = null;
    this.cacheTTL = 60000; // 1 minute cache
  }

  /**
   * Detect all available tools on the system
   * @returns {Promise<Object>} Map of tool names to their status
   */
  async detect() {
    // Return cached result if still valid
    if (this.cache && this.cacheTime && (Date.now() - this.cacheTime < this.cacheTTL)) {
      return this.cache;
    }

    const tools = {
      iverilog: await this._detectTool('iverilog', ['-V'], /Icarus Verilog version ([\d.]+)/),
      verilator: await this._detectTool('verilator', ['--version'], /Verilator ([\d.]+)/),
      yosys: await this._detectTool('yosys', ['-V'], /Yosys ([\d.]+)/),
      'nextpnr-ice40': await this._detectTool('nextpnr-ice40', ['--version'], /nextpnr-ice40.*?--\s+([\d.]+)/),
      'nextpnr-ecp5': await this._detectTool('nextpnr-ecp5', ['--version'], /nextpnr-ecp5.*?--\s+([\d.]+)/),
      icepack: await this._detectTool('icepack', ['-h'], /IceStorm/), // icepack doesn't have --version
      iceprog: await this._detectTool('iceprog', ['-h'], /iceprog/)
    };

    this.cache = tools;
    this.cacheTime = Date.now();
    
    logger.info({ tools: Object.entries(tools).map(([name, info]) => `${name}: ${info.found}`) }, 'Tool detection complete');
    
    return tools;
  }

  /**
   * Detect a single tool
   * @private
   */
  async _detectTool(name, versionArgs, versionRegex) {
    try {
      // First check if tool exists in PATH
      const whichResult = await execa('which', [name], {
        timeout: 5000,
        reject: false
      });

      if (whichResult.exitCode !== 0) {
        return { found: false, path: null, version: null };
      }

      const path = whichResult.stdout.trim();

      // Try to get version
      let version = null;
      try {
        const versionResult = await execa(name, versionArgs, {
          timeout: 5000,
          reject: false,
          all: true
        });

        const output = versionResult.all || versionResult.stdout || versionResult.stderr || '';
        const match = output.match(versionRegex);
        if (match) {
          version = match[1] || 'detected';
        } else {
          version = 'unknown';
        }
      } catch (versionErr) {
        // Tool exists but version detection failed
        version = 'unknown';
        logger.warn({ tool: name, error: versionErr.message }, 'Failed to detect version');
      }

      return { found: true, path, version };
    } catch (err) {
      logger.debug({ tool: name, error: err.message }, 'Tool not found');
      return { found: false, path: null, version: null };
    }
  }

  /**
   * Check if a specific tool is available
   * @param {string} name - Tool name
   * @returns {Promise<boolean>}
   */
  async isAvailable(name) {
    const tools = await this.detect();
    return tools[name]?.found || false;
  }

  /**
   * Require a tool to be present, throw if not found
   * @param {string} name - Tool name
   * @throws {Error} If tool is not found
   */
  async requireTool(name) {
    const tools = await this.detect();
    const tool = tools[name];

    if (!tool || !tool.found) {
      throw new Error(
        `Required tool '${name}' is not installed or not in PATH. ` +
        `Please install it before proceeding.`
      );
    }

    return tool;
  }

  /**
   * Get information about a specific tool
   * @param {string} name - Tool name
   * @returns {Promise<Object|null>}
   */
  async getTool(name) {
    const tools = await this.detect();
    return tools[name] || null;
  }

  /**
   * Clear the cache (useful for testing or after installations)
   */
  clearCache() {
    this.cache = null;
    this.cacheTime = null;
  }
}

export default ToolchainManager;
