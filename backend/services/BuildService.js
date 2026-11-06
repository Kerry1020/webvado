import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';
import { createHash } from 'node:crypto';
import pino from 'pino';
import { parseVCD } from '../parsers/VCDParser.js';
import { normalizeXdcForNextpnr } from './XdcNormalize.js';

const logger = pino({ name: 'BuildService' });

const HDL_EXT = new Set(['.v', '.sv']);
const MAX_LOG = 200_000;
const SYNTH_OUTPUTS = ['synth.json', 'synth_stat.json', 'synthesis-config.json'];
const IMPLEMENT_OUTPUTS = ['implementation.asc', 'implementation.json', 'implementation-config.json',
  'xc7-design.json', 'xc7-design.fasm', 'xc7-design.xdc', 'xc7-implementation.json'];
const BITSTREAM_OUTPUTS = ['bitstream.bin', 'bitstream-config.json', 'xc7-design.frames'];

// Yosys synth command per device family (from project.part)
const SYNTH_BY_FAMILY = {
  ice40: 'synth_ice40',
  ecp5: 'synth_ecp5',
  xc7: 'synth_xilinx',
  generic: 'synth'
};

// openXC7 (Docker) is used for Artix-7 place & route / bitstream.
const OPENXC7_IMAGE = process.env.WEBVADO_OPENXC7_IMAGE || 'regymm/openxc7:latest';
const XC7_PARTS = {
  xc7a35t: { bitstreamPart: 'xc7a35tcsg324-1', chipdb: 'xc7a35t.bin', dbFamily: 'artix7' }
};

export class BuildError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.code = code;
    Object.assign(this, extra);
  }
}

/**
 * BuildService - iverilog/vvp simulation and Yosys synthesis for a project.
 * Sources: srcs/rtl (design), srcs/sim (testbenches). Outputs: .webvado/build.
 */
export class BuildService {
  constructor(projectManager, toolchainManager, wsManager) {
    this.projectManager = projectManager;
    this.toolchainManager = toolchainManager;
    this.wsManager = wsManager;
    this.activeBuilds = new Map(); // project.id -> { stage, startTime }
  }

  // ── Public steps ────────────────────────────────────────────────

  /** Compile design sources with iverilog (syntax / elaboration check). */
  async compile(projectId, { topModule } = {}) {
    return this.withBuild(projectId, 'compile', async (project, buildDir) => {
      const iverilog = await this.toolchainManager.requireTool('iverilog');
      const design = await this.sources(project, 'rtl');
      if (design.length === 0) {
        throw new BuildError('NO_SOURCES', 'No Verilog source files in srcs/rtl. Add a design source first.');
      }

      const top = topModule || project.top_module || null;
      const result = await this.exec(project, iverilog.path, [
        '-g2012', '-Wall',
        ...(top ? ['-s', top] : []),
        '-o', path.join(buildDir, 'design.vvp'),
        ...this.includeArgs(project),
        ...this.rel(project, design)
      ]);

      const diagnostics = this.parseIverilog(result.all);
      const success = result.exitCode === 0 && !diagnostics.some(d => d.severity === 'error');
      await this.recordStatus(project, 'last_compile', { success, errors: diagnostics.filter(d => d.severity === 'error').length });
      if (!success) {
        throw new BuildError('COMPILE_FAILED', 'Compilation failed', { diagnostics, log: result.all });
      }
      return { success: true, diagnostics, log: result.all };
    });
  }

  /** Compile design + testbench, run vvp, parse the VCD the testbench dumps. */
  async simulate(projectId, { topModule, runTime } = {}) {
    return this.withBuild(projectId, 'simulate', async (project, buildDir) => {
      const iverilog = await this.toolchainManager.requireTool('iverilog');
      const vvp = await this.toolchainManager.requireTool('vvp');
      const design = await this.sources(project, 'rtl');
      const benches = await this.sources(project, 'sim');
      if (benches.length === 0) {
        throw new BuildError('NO_TESTBENCH',
          'No testbench in srcs/sim. Add a simulation source (Add Sources > Simulation source) that calls $dumpfile/$dumpvars.');
      }

      const simTop = topModule || await this.findTestbenchTop(benches);
      const duration = runTime === undefined ? 1000 : Number(runTime);
      if (!Number.isInteger(duration) || duration <= 0 || duration > 1e9) {
        throw new BuildError('INVALID_INPUT', 'runTime must be a positive integer (max 1e9 ns)');
      }
      const timer = path.join(buildDir, 'webvado_timer.v');
      await fs.writeFile(timer, '`timescale 1ns/1ps\n' +
        `module __webvado_timer; initial begin #${duration}; $finish; end endmodule\n`);
      const vvpFile = path.join(buildDir, 'sim.vvp');
      const compile = await this.exec(project, iverilog.path, [
        '-g2012', '-Wall',
        ...(simTop ? ['-s', simTop] : []), '-s', '__webvado_timer',
        '-o', vvpFile,
        ...this.includeArgs(project),
        ...this.rel(project, [...design, ...benches, timer])
      ]);
      const diagnostics = this.parseIverilog(compile.all);
      if (compile.exitCode !== 0 || diagnostics.some(d => d.severity === 'error')) {
        await this.recordStatus(project, 'last_simulate', { success: false });
        throw new BuildError('COMPILE_FAILED', 'Testbench compilation failed', { diagnostics, log: compile.all });
      }

      // Remove old dumps so a stale VCD is never shown as the new result
      for (const f of await fs.readdir(buildDir)) {
        if (f.endsWith('.vcd')) await fs.remove(path.join(buildDir, f));
      }

      // A separate simulation root limits simulated nanoseconds, even for forever clocks.
      const run = await this.exec(project, vvp.path, ['-n', vvpFile], { cwd: buildDir, timeout: 120000 });
      if (run.timedOut) {
        throw new BuildError('SIM_TIMEOUT', 'Simulation did not finish within 120 s. Make sure the testbench calls $finish.', { log: run.all });
      }
      if (run.exitCode !== 0) {
        throw new BuildError('SIM_FAILED', `vvp exited with code ${run.exitCode}`, { diagnostics, log: run.all });
      }

      const vcd = (await fs.readdir(buildDir)).find(f => f.endsWith('.vcd'));
      if (!vcd) {
        throw new BuildError('NO_VCD',
          'Simulation ran but produced no VCD. Add $dumpfile("simulation.vcd"); $dumpvars(0, <tb>); to the testbench.',
          { log: run.all });
      }

      const waveformData = parseVCD(await fs.readFile(path.join(buildDir, vcd), 'utf8'));
      await this.recordStatus(project, 'last_simulate', { success: true, signals: waveformData.signals.length });
      return {
        success: true,
        top: simTop,
        diagnostics,
        output: run.all.trim(),
        log: [compile.all, run.all].filter(Boolean).join('\n'),
        runTime: duration,
        waveformData,
        vcdFile: path.posix.join('.webvado/build', vcd)
      };
    });
  }

  /** Synthesize design sources with Yosys and return a cell utilization report. */
  async synthesize(projectId, { topModule } = {}) {
    return this.withBuild(projectId, 'synthesize', async (project, buildDir) => {
      const yosys = await this.toolchainManager.requireTool('yosys');
      const design = await this.sources(project, 'rtl');
      if (design.length === 0) {
        throw new BuildError('NO_SOURCES', 'No Verilog source files in srcs/rtl. Add a design source first.');
      }

      const family = this.family(project.part);
      const top = topModule || project.top_module || null;
      const statFile = path.join(buildDir, 'synth_stat.json');
      await this.invalidate(buildDir, [...SYNTH_OUTPUTS, ...IMPLEMENT_OUTPUTS, ...BITSTREAM_OUTPUTS]);
      const fingerprint = await this.fingerprint(project);

      const read = this.rel(project, design).map(f => `read_verilog -sv -Isrcs/rtl ${this.quote(f)}`).join('; ');
      // openXC7 expects a flattened netlist with per-bit top-level IO names.
      const synth = family === 'xc7'
        ? `synth_xilinx -flatten ${top ? `-top ${top}` : ''}`
        : `${SYNTH_BY_FAMILY[family]} ${top ? `-top ${top}` : ''}`;
      const script = [
        read,
        `hierarchy -check ${top ? `-top ${top}` : '-auto-top'}`,
        synth,
        `write_json ${this.quote(path.join(buildDir, 'synth.json'))}`,
        `tee -q -o ${this.quote(statFile)} stat -json`
      ].join('; ');

      const result = await this.exec(project, yosys.path, ['-p', script], { timeout: 300000 });
      const diagnostics = this.parseYosys(result.all);
      if (result.exitCode !== 0) {
        await this.recordStatus(project, 'last_synthesis', { success: false });
        throw new BuildError('SYNTH_FAILED', 'Synthesis failed', {
          diagnostics: diagnostics.length ? diagnostics : [{ severity: 'error', file: null, line: null, message: result.all.trim().split('\n').pop() || 'yosys failed' }],
          log: result.all
        });
      }

      const netlist = await fs.readJson(path.join(buildDir, 'synth.json'));
      const report = this.parseStat(await fs.readJson(statFile), family);
      report.top = Object.entries(netlist.modules).find(([, module]) => Number(module.attributes?.top) === 1)?.[0] || report.top;
      if (fingerprint !== await this.fingerprint(await this.requireProject(project.id))) {
        throw new BuildError('SOURCE_CHANGED', 'Design changed during synthesis. Run synthesis again.');
      }
      await fs.writeJson(path.join(buildDir, 'synthesis-config.json'), { fingerprint, top: report.top });
      await this.recordStatus(project, 'last_synthesis', { success: true, top: report.top, cells: report.cells });
      return { success: true, diagnostics, log: result.all.trim(), report,
        artifacts: await this.artifacts(project, ['synth.json', 'synth_stat.json']) };
    });
  }

  device(project, options = {}) {
    const part = String(project.part).toLowerCase();
    if (part === 'xc7a35t') {
      const frequency = Number(options.frequency ?? project.settings?.target_frequency_mhz ?? 100);
      if (!Number.isFinite(frequency) || frequency <= 0 || frequency > 1000) {
        throw new BuildError('INVALID_INPUT', 'frequency must be greater than 0 and at most 1000 MHz');
      }
      return { family: 'xc7', part, bitstreamPart: XC7_PARTS.xc7a35t.bitstreamPart, frequency };
    }
    const devices = { ice40hx8k: { chip: 'hx8k', package: 'ct256' }, ice40up5k: { chip: 'up5k', package: 'sg48' } };
    const device = devices[part];
    if (!device) throw new BuildError('UNSUPPORTED_DEVICE',
      'Physical implementation supports ice40hx8k/ct256, ice40up5k/sg48 and xc7a35t (EGO1). ECP5 and other devices are synthesis-only.');
    const pkg = options.package || project.settings?.package || device.package;
    if (pkg !== device.package) throw new BuildError('INVALID_INPUT', `${project.part} currently supports package ${device.package}`);
    const frequency = Number(options.frequency ?? project.settings?.target_frequency_mhz ?? 50);
    if (!Number.isFinite(frequency) || frequency <= 0 || frequency > 1000) {
      throw new BuildError('INVALID_INPUT', 'frequency must be greater than 0 and at most 1000 MHz');
    }
    return { ...device, package: pkg, frequency, part: project.part };
  }

  xc7ChipdbPath() {
    const env = process.env.WEBVADO_XC7_CHIPDB;
    if (env) return path.resolve(env);
    const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
    return path.join(root, 'tools', 'chipdb', XC7_PARTS.xc7a35t.chipdb);
  }

  // Run a command inside the openXC7 image with the project mounted at /w.
  async dockerRun(project, shellCmd, { timeout = 600000 } = {}) {
    const chipdb = this.xc7ChipdbPath();
    if (!await fs.pathExists(chipdb)) {
      throw new BuildError('CHIPDB_MISSING',
        `Artix-7 chip database not found at ${chipdb}. Generate it once with the openXC7 image (see docs/EGO1.md).`);
    }
    const args = ['run', '--rm', '--platform', 'linux/amd64',
      '-v', `${project.path}:/w`, '-v', `${chipdb}:/chipdb/${path.basename(chipdb)}:ro`,
      OPENXC7_IMAGE, 'bash', '-lc', `cd /w && ${shellCmd}`];
    const result = await execa('docker', args, { reject: false, all: true, timeout });
    const output = result.all || '';
    return { ...result, all: output.length > MAX_LOG ? `[Earlier log truncated]\n${output.slice(-MAX_LOG)}` : output };
  }

  async implement(projectId, options = {}) {
    return this.withBuild(projectId, 'implement', async (project, buildDir) => {
      const device = this.device(project, options);
      await this.invalidate(buildDir, [...IMPLEMENT_OUTPUTS, ...BITSTREAM_OUTPUTS]);
      const fingerprint = await this.fingerprint(project, true);
      if (!await fs.pathExists(path.join(buildDir, 'synth.json'))) {
        throw new BuildError('PREREQUISITE_MISSING', 'Run synthesis successfully before implementation.');
      }
      const synthesis = await fs.readJson(path.join(buildDir, 'synthesis-config.json')).catch(() => null);
      if (synthesis?.fingerprint !== await this.fingerprint(project)) {
        throw new BuildError('PREREQUISITE_MISSING', 'Design sources or device settings changed. Run synthesis again.');
      }

      if (device.family === 'xc7') {
        const xdc = await normalizeXdcForNextpnr(path.join(project.path, 'srcs/constrs'));
        if (!xdc) {
          throw new BuildError('NO_CONSTRAINTS',
            'Artix-7 implementation needs pin constraints: add an .xdc file under srcs/constrs (Add Sources > Constraints).');
        }
        const relXdc = '.webvado/build/xc7-design.xdc';
        await fs.writeFile(path.join(buildDir, 'xc7-design.xdc'), xdc);
        const cmd = `nextpnr-xilinx --chipdb /chipdb/${XC7_PARTS.xc7a35t.chipdb} ` +
          `--xdc ${relXdc} --json .webvado/build/synth.json ` +
          `--write .webvado/build/xc7-implementation.json --fasm .webvado/build/xc7-design.fasm`;
        const run = await this.dockerRun(project, cmd);
        if (run.exitCode !== 0) {
          await this.invalidate(buildDir, IMPLEMENT_OUTPUTS);
          throw new BuildError('IMPLEMENT_FAILED', 'Place and route failed', { log: run.all });
        }
        if (fingerprint !== await this.fingerprint(await this.requireProject(projectId), true)) {
          throw new BuildError('SOURCE_CHANGED', 'Design changed during implementation. Run synthesis and implementation again.');
        }
        await fs.writeJson(path.join(buildDir, 'implementation-config.json'), { ...device, fingerprint });
        const report = { ...device, utilization: this.parseNextpnrReport(run.all) };
        await this.recordStatus(project, 'last_implementation', { success: true, ...device });
        return { success: true, log: run.all, report,
          artifacts: await this.artifacts(project, ['xc7-design.fasm', 'xc7-implementation.json']) };
      }

      const tool = await this.toolchainManager.requireTool('nextpnr-ice40');
      const constraints = (await this.findFiles(path.join(project.path, 'srcs/constrs'), new Set(['.pcf'])));
      const pcf = path.join(buildDir, 'constraints.pcf');
      if (constraints.length) await fs.writeFile(pcf, (await Promise.all(constraints.map(f => fs.readFile(f, 'utf8')))).join('\n'));
      const args = [`--${device.chip}`, '--package', device.package, '--freq', String(device.frequency),
        '--json', path.join(buildDir, 'synth.json'), '--asc', path.join(buildDir, 'implementation.asc'),
        '--report', path.join(buildDir, 'implementation.json'),
        ...(constraints.length ? ['--pcf', pcf] : ['--pcf-allow-unconstrained'])];
      const run = await this.exec(project, tool.path, args, { timeout: 300000 });
      if (run.exitCode !== 0) {
        await this.invalidate(buildDir, ['implementation.asc', 'implementation.json']);
        throw new BuildError('IMPLEMENT_FAILED', 'Place and route failed', { log: run.all });
      }
      if (fingerprint !== await this.fingerprint(await this.requireProject(project.id), true)) {
        throw new BuildError('SOURCE_CHANGED', 'Design changed during implementation. Run synthesis and implementation again.');
      }
      await fs.writeJson(path.join(buildDir, 'implementation-config.json'), { ...device, fingerprint });
      const report = { ...await fs.readJson(path.join(buildDir, 'implementation.json')), ...device,
        unconstrained: constraints.length === 0 };
      await this.recordStatus(project, 'last_implementation', { success: true, ...device });
      return { success: true, log: run.all, report,
        artifacts: await this.artifacts(project, ['implementation.asc', 'implementation.json']) };
    });
  }

  async bitstream(projectId, options = {}) {
    return this.withBuild(projectId, 'bitstream', async (project, buildDir) => {
      const device = this.device(project, options);
      await fs.remove(path.join(buildDir, 'bitstream.bin'));
      const configPath = path.join(buildDir, 'implementation-config.json');
      if (!await fs.pathExists(configPath)) {
        throw new BuildError('PREREQUISITE_MISSING', 'Run implementation successfully before generating a bitstream.');
      }
      const config = await fs.readJson(configPath);
      if (config.part !== device.part || config.frequency !== device.frequency || config.fingerprint !== await this.fingerprint(project, true)) {
        throw new BuildError('PREREQUISITE_MISSING', 'Implementation settings changed. Run implementation again with these settings.');
      }

      let run;
      if (device.family === 'xc7') {
        if (!await fs.pathExists(path.join(buildDir, 'xc7-design.fasm'))) {
          throw new BuildError('PREREQUISITE_MISSING', 'Run implementation successfully before generating a bitstream.');
        }
        const db = `/nextpnr-xilinx/xilinx/external/prjxray-db/${XC7_PARTS.xc7a35t.dbFamily}`;
        const part = device.bitstreamPart;
        const cmd = `/prjxray/env/bin/fasm2frames --part ${part} --db-root ${db} .webvado/build/xc7-design.fasm > .webvado/build/xc7-design.frames` +
          ` && xc7frames2bit --part_file ${db}/${part}/part.yaml --part_name ${part}` +
          ` --frm_file .webvado/build/xc7-design.frames --output_file .webvado/build/bitstream.bin`;
        run = await this.dockerRun(project, cmd);
      } else {
        if (!await fs.pathExists(path.join(buildDir, 'implementation.asc'))) {
          throw new BuildError('PREREQUISITE_MISSING', 'Run implementation successfully before generating a bitstream.');
        }
        const tool = await this.toolchainManager.requireTool('icepack');
        run = await this.exec(project, tool.path, [path.join(buildDir, 'implementation.asc'), path.join(buildDir, 'bitstream.bin')]);
      }
      if (run.exitCode !== 0) {
        await fs.remove(path.join(buildDir, 'bitstream.bin'));
        throw new BuildError('BITSTREAM_FAILED', 'Bitstream generation failed', { log: run.all });
      }
      const artifacts = await this.artifacts(project, ['bitstream.bin']);
      if (config.fingerprint !== await this.fingerprint(await this.requireProject(project.id), true)) {
        throw new BuildError('SOURCE_CHANGED', 'Design changed during bitstream generation. Rebuild the project.');
      }
      const digest = createHash('sha256').update(await fs.readFile(path.join(buildDir, 'bitstream.bin'))).digest('hex');
      await fs.writeJson(path.join(buildDir, 'bitstream-config.json'), { ...config, digest,
        settings: project.settings, created: new Date().toISOString() });
      await this.recordStatus(project, 'last_bitstream', { success: true, ...device });
      return { success: true, log: run.all || `generated bitstream.bin (${artifacts[0].size} bytes)`,
        report: { ...device, bytes: artifacts[0].size }, artifacts };
    });
  }

  async invalidate(buildDir, names) {
    await Promise.all(names.map(name => fs.remove(path.join(buildDir, name))));
  }

  async clearStage(buildDir, stage) {
    const names = stage === 'compile' ? ['design.vvp', ...SYNTH_OUTPUTS, ...IMPLEMENT_OUTPUTS, ...BITSTREAM_OUTPUTS]
      : stage === 'synthesize' ? [...SYNTH_OUTPUTS, ...IMPLEMENT_OUTPUTS, ...BITSTREAM_OUTPUTS]
      : stage === 'implement' ? [...IMPLEMENT_OUTPUTS, ...BITSTREAM_OUTPUTS]
      : stage === 'bitstream' ? BITSTREAM_OUTPUTS
      : stage === 'simulate' ? ['sim.vvp', ...(await fs.readdir(buildDir)).filter(name => name.endsWith('.vcd'))] : [];
    await this.invalidate(buildDir, names);
  }

  async requireFreshBitstream(projectId) {
    const project = await this.requireProject(projectId);
    if (this.activeBuilds.has(project.id)) throw new BuildError('BUILD_BUSY', 'A build is in progress');
    const file = await this.artifactPath(project.id, 'bitstream.bin');
    const manifest = await fs.readJson(path.join(path.dirname(file), 'bitstream-config.json')).catch(() => null);
    const digest = createHash('sha256').update(await fs.readFile(file)).digest('hex');
    if (!manifest || manifest.fingerprint !== await this.fingerprint(project, true) || manifest.digest !== digest ||
        JSON.stringify(manifest.settings) !== JSON.stringify(project.settings)) {
      throw new BuildError('PREREQUISITE_MISSING', 'Bitstream is stale. Rebuild synthesis, implementation and bitstream.');
    }
    return file;
  }

  async fingerprint(project, constraints = false) {
    const files = await this.findFiles(path.join(project.path, 'srcs/rtl'), new Set(['.v', '.sv', '.vh', '.svh']));
    if (constraints) files.push(...await this.findFiles(path.join(project.path, 'srcs/constrs'), new Set(['.pcf', '.xdc'])));
    const hash = createHash('sha256').update(JSON.stringify([project.part, project.top_module]));
    for (const file of files.sort()) hash.update(path.relative(project.path, file)).update('\0').update(await fs.readFile(file)).update('\0');
    return hash.digest('hex');
  }

  async artifactPath(projectId, name) {
    const project = await this.requireProject(projectId);
    if (typeof name !== 'string' || !/^[A-Za-z0-9_.-]+$/.test(name) || name === '.' || name === '..') {
      throw new BuildError('INVALID_ARTIFACT', 'Invalid artifact name');
    }
    const buildDir = await this.buildDirectory(project);
    const file = path.join(buildDir, name);
    let stat;
    try { stat = await fs.lstat(file); } catch (error) {
      if (error.code === 'ENOENT') throw new BuildError('ARTIFACT_NOT_FOUND', `Artifact ${name} not found`);
      throw error;
    }
    if (!stat.isFile() || stat.isSymbolicLink()) throw new BuildError('INVALID_ARTIFACT', 'Artifact must be a regular file');
    return file;
  }

  async getNetlist(projectId) {
    return fs.readJson(await this.artifactPath(projectId, 'synth.json'));
  }

  async artifacts(project, names) {
    return Promise.all(names.map(async name => {
      const stat = await fs.stat(await this.artifactPath(project.id, name));
      return { name, path: `.webvado/build/${name}`, size: stat.size, type: path.extname(name).slice(1),
        modified: stat.mtime.toISOString(), url: `/api/build/${encodeURIComponent(project.id)}/artifacts/${encodeURIComponent(name)}` };
    }));
  }

  async buildDirectory(project) {
    for (const relative of ['.webvado', '.webvado/build']) {
      const target = path.join(project.path, relative);
      try {
        if ((await fs.lstat(target)).isSymbolicLink()) throw new BuildError('INVALID_ARTIFACT', 'Build directory cannot be a symlink');
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    const buildDir = path.join(project.path, '.webvado/build');
    if (await fs.pathExists(buildDir)) {
      if ((await fs.readdir(buildDir, { withFileTypes: true })).some(entry => entry.isSymbolicLink())) {
        throw new BuildError('INVALID_ARTIFACT', 'Build directory cannot contain symlinks');
      }
    }
    return buildDir;
  }

  async getBuildStatus(projectId) {
    const project = await this.requireProject(projectId);
    const active = this.activeBuilds.get(project.id);
    return { active: !!active, stage: active?.stage || null, history: project.build_status || {} };
  }

  // ── Helpers ─────────────────────────────────────────────────────

  async requireProject(projectId) {
    const project = await this.projectManager.getProject(projectId);
    if (!project) throw new BuildError('PROJECT_NOT_FOUND', `Project "${projectId}" not found`);
    return project;
  }

  // One build per project at a time; progress over WebSocket
  async withBuild(projectId, stage, fn) {
    const project = await this.requireProject(projectId);
    if (project.top_module && !/^[A-Za-z_][\w$]{0,127}$/.test(project.top_module)) {
      throw new BuildError('INVALID_INPUT', 'Project top_module must be a Verilog identifier');
    }
    if (this.activeBuilds.has(project.id)) {
      throw new BuildError('BUILD_BUSY', `A ${this.activeBuilds.get(project.id).stage} run is already in progress`);
    }
    this.activeBuilds.set(project.id, { stage, startTime: Date.now() });
    this.broadcast(project.id, 'build:progress', { stage, percent: 0 });
    let buildDir;
    try {
      buildDir = await this.buildDirectory(project);
      await fs.ensureDir(buildDir);
      if (stage !== 'compile') await this.clearStage(buildDir, stage);
      const result = await fn(project, buildDir);
      await fs.writeFile(path.join(buildDir, `${stage}.log`), result.log || '');
      this.broadcast(project.id, 'build:complete', { stage, success: true });
      logger.info({ project: project.name, stage }, 'Build step succeeded');
      return result;
    } catch (error) {
      if (buildDir) {
        await this.clearStage(buildDir, stage);
        await fs.writeFile(path.join(buildDir, `${stage}.log`), error.log || error.message);
      }
      const key = { compile: 'last_compile', simulate: 'last_simulate', synthesize: 'last_synthesis', implement: 'last_implementation', bitstream: 'last_bitstream' }[stage];
      if (key) await this.recordStatus(project, key, { success: false });
      this.broadcast(project.id, 'build:complete', { stage, success: false, error: error.message });
      logger.warn({ project: project.name, stage, code: error.code, message: error.message }, 'Build step failed');
      throw error;
    } finally {
      this.activeBuilds.delete(project.id);
    }
  }

  async exec(project, file, args, { cwd = project.path, timeout = 60000 } = {}) {
    const result = await execa(file, args, {
      cwd,
      timeout,
      reject: false,
      all: true,
      env: this.toolchainManager.env()
    });
    const output = result.all || '';
    return { ...result, all: output.length > MAX_LOG ? `[Earlier log truncated]\n${output.slice(-MAX_LOG)}` : output };
  }

  async sources(project, sub) {
    return this.findFiles(path.join(project.path, 'srcs', sub));
  }

  async findFiles(dir, extensions = HDL_EXT) {
    if (!await fs.pathExists(dir)) return [];
    const out = [];
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...await this.findFiles(full, extensions));
      else if (entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase())) out.push(full);
    }
    return out.sort();
  }

  // .vh headers are found through include paths, not compiled on their own
  includeArgs() {
    return ['-I', 'srcs/rtl', '-I', 'srcs/sim'];
  }

  rel(project, files) {
    return files.map(f => path.relative(project.path, f));
  }

  quote(s) {
    return `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }

  family(part = '') {
    if (/^ice40/i.test(part)) return 'ice40';
    if (/^ecp5/i.test(part)) return 'ecp5';
    if (/^xc7[aks]?|^artix/i.test(part)) return 'xc7';
    return 'generic';
  }

  /** Extract the "Device utilisation" table from a nextpnr-xilinx log. */
  parseNextpnrReport(log = '') {
    const used = {};
    const m = log.match(/Max frequency for clock [^\n']*:\s*([\d.]+) MHz/);
    if (m) used.fmax_mhz = parseFloat(m[1]);
    for (const line of log.split('\n')) {
      const u = line.match(/Info:\s+\*?\s*([A-Z0-9_]+):\s*(\d+)\/\s*(\d+)/);
      if (u && !used[u[1]]) used[u[1]] = { used: Number(u[2]), total: Number(u[3]) };
    }
    return used;
  }

  // First testbench module that is not instantiated by another testbench file
  async findTestbenchTop(benches) {
    const modules = [];
    const text = (await Promise.all(benches.map(f => fs.readFile(f, 'utf8')))).join('\n');
    const clean = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    for (const m of clean.matchAll(/^\s*module\s+([A-Za-z_][\w$]*)/gm)) modules.push(m[1]);
    const instantiated = new Set(modules.filter(name =>
      new RegExp(`^\\s*${name}\\s*(#\\s*\\(|[A-Za-z_][\\w$]*\\s*\\()`, 'm').test(clean)));
    return modules.find(m => !instantiated.has(m)) || modules[0] || null;
  }

  async recordStatus(project, key, data) {
    try {
      const fresh = await this.projectManager.getProject(project.id);
      await this.projectManager.updateProject(project.id, {
        build_status: { ...(fresh?.build_status || {}), [key]: { ...data, timestamp: new Date().toISOString() } }
      });
    } catch (error) {
      logger.warn({ error: error.message }, 'Failed to record build status');
    }
  }

  /** "srcs/rtl/a.v:12: error: msg" and "srcs/rtl/a.v:12: syntax error" */
  parseIverilog(output = '') {
    const diagnostics = [];
    for (const line of output.split('\n')) {
      const m = line.match(/^(.+?):(\d+):\s*(?:(error|warning|sorry):\s*)?(.+)$/i);
      if (!m) continue;
      const [, file, lineNum, kind, message] = m;
      const severity = /warning/i.test(kind || '') ? 'warning'
        : (kind || /error/i.test(message)) ? 'error' : null;
      if (!severity) continue;
      diagnostics.push({ file: path.basename(file), path: file, line: parseInt(lineNum, 10), severity, message: message.trim() });
    }
    if (!diagnostics.length && /error/i.test(output)) {
      const first = output.split('\n').find(l => /error/i.test(l));
      diagnostics.push({ file: null, path: null, line: null, severity: 'error', message: first.trim() });
    }
    return diagnostics;
  }

  /** "srcs/rtl/a.v:12: ERROR: msg" / "Warning: msg" */
  parseYosys(output = '') {
    const diagnostics = [];
    for (const line of output.split('\n')) {
      let m = line.match(/^(.+?\.s?v):(\d+):\s*(ERROR|Warning):\s*(.+)$/i);
      if (m) {
        diagnostics.push({ file: path.basename(m[1]), path: m[1], line: parseInt(m[2], 10), severity: /error/i.test(m[3]) ? 'error' : 'warning', message: m[4].trim() });
        continue;
      }
      m = line.match(/^(ERROR|Warning):\s*(.+)$/);
      if (m) diagnostics.push({ file: null, path: null, line: null, severity: m[1] === 'ERROR' ? 'error' : 'warning', message: m[2].trim() });
    }
    return diagnostics;
  }

  parseStat(stat, family) {
    const modules = stat.modules || {};
    const top = Object.keys(modules).find(name => modules[name]?.top) || Object.keys(modules).pop() || '';
    const mod = (stat.design && stat.design.num_cells !== undefined) ? stat.design : modules[top] || {};
    const cellTypes = mod.num_cells_by_type || {};
    return {
      top: top.replace(/^\\/, ''),
      family,
      cells: mod.num_cells ?? Object.values(cellTypes).reduce((a, b) => a + b, 0),
      wires: mod.num_wires ?? 0,
      cellTypes: Object.fromEntries(Object.entries(cellTypes).sort((a, b) => b[1] - a[1]))
    };
  }

  broadcast(projectId, type, payload) {
    this.wsManager?.broadcast(projectId, type, payload);
  }
}

export default BuildService;
