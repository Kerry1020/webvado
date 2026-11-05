import { execa } from 'execa';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pino from 'pino';

const logger = pino({ name: 'ToolchainManager' });

// Toolchain bundled inside the repo (not committed): tools/oss-cad-suite/bin.
// WEBVADO_TOOLCHAIN overrides it. Searched before the system PATH.
// dist/ builds keep the directory tree, so the repo-level tools/ is one level up from dist.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BUNDLED_BIN = [
  path.join(ROOT, 'tools', 'oss-cad-suite', 'bin'),
  path.join(ROOT, '..', 'tools', 'oss-cad-suite', 'bin')
].find(dir => fs.existsSync(dir)) || path.join(ROOT, 'tools', 'oss-cad-suite', 'bin');

/**
 * ToolchainManager detects and manages hardware toolchain installations
 * on the system (iverilog, verilator, yosys, nextpnr, icepack, etc.)
 */
export class ToolchainManager {
  constructor() {
    this.bin = path.resolve(process.env.WEBVADO_TOOLCHAIN || BUNDLED_BIN);
    this.cache = null;
    this.cacheTime = null;
    this.cacheTTL = 60000; // 1 minute cache
  }

  /** Environment for child processes: bundled toolchain first on PATH */
  env() {
    const dirs = fs.existsSync(this.bin) ? [this.bin] : [];
    return { ...process.env, PATH: [...dirs, process.env.PATH].join(path.delimiter) };
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

    const specs = {
      iverilog: [['-V'], /Icarus Verilog version ([\d.]+)/],
      vvp: [['-V'], /Icarus Verilog runtime version ([\d.]+)/],
      verilator: [['--version'], /Verilator ([\d.]+)/],
      yosys: [['-V'], /Yosys ([\d.+\w-]+)/],
      'nextpnr-ice40': [['--version'], /--\s+(\S+)/],
      'nextpnr-ecp5': [['--version'], /--\s+(\S+)/],
      icepack: [['-h'], /()icepack/i],
      iceprog: [['-h'], /()iceprog/],
      openFPGALoader: [['--version'], /openFPGALoader\s+(?:v(?:ersion)?\s*)?([^\s]+)/i]
    };

    const env = this.env();
    const entries = await Promise.all(Object.entries(specs).map(async ([name, [args, re]]) =>
      [name, await this._detectTool(name, args, re, env)]));
    const tools = Object.fromEntries(entries);

    this.cache = tools;
    this.cacheTime = Date.now();
    
    logger.info({ tools: Object.entries(tools).map(([name, info]) => `${name}: ${info.found}`) }, 'Tool detection complete');
    
    return tools;
  }

  /**
   * Detect a single tool
   * @private
   */
  async _detectTool(name, versionArgs, versionRegex, env) {
    try {
      const whichResult = await execa('which', [name], { timeout: 5000, reject: false, env });
      if (whichResult.exitCode !== 0) {
        return { found: false, path: null, version: null };
      }

      const toolPath = whichResult.stdout.trim();
      let version = 'unknown';
      try {
        const versionResult = await execa(toolPath, versionArgs, { timeout: 10000, reject: false, all: true, env });
        const match = (versionResult.all || '').match(versionRegex);
        if (versionResult.timedOut || !match) {
          return { found: false, path: toolPath, version: null, error: (versionResult.all || 'Tool could not run').slice(0, 1000) };
        }
        version = match[1] || 'detected';
      } catch (versionErr) {
        logger.warn({ tool: name, error: versionErr.message }, 'Failed to detect version');
        return { found: false, path: toolPath, version: null, error: versionErr.message };
      }

      return { found: true, path: toolPath, version, bundled: toolPath.startsWith(this.bin + path.sep) };
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
      const err = new Error(`Required tool '${name}' is not installed or not in PATH.`);
      err.code = 'TOOL_MISSING';
      throw err;
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
