import { execa } from 'execa';
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { stripVTControlCharacters } from 'node:util';

function failure(code, message, log = '') {
  return Object.assign(new Error(message), { code, log });
}

export class HardwareService {
  constructor(projectManager, toolchainManager, { execute = execa, requireFresh = null } = {}) {
    this.projects = projectManager;
    this.tools = toolchainManager;
    this.execute = execute;
    this.requireFresh = requireFresh;
    this.busy = false;
  }

  selectors(options = {}) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
      throw failure('INVALID_INPUT', 'Hardware options must be an object');
    }
    const { board, cable, serial } = options;
    const args = [];
    for (const [value, flag] of [[board, '-b'], [cable, '-c'], [serial, '--usb-serial-num']]) {
      if (value === undefined || value === '') continue;
      if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(value)) {
        throw failure('INVALID_INPUT', 'Invalid board, cable or serial identifier');
      }
      args.push(flag, value);
    }
    return args;
  }

  async command(args) {
    if (this.busy) throw failure('HARDWARE_BUSY', 'A hardware operation is already running');
    this.busy = true;
    try {
      const tool = await this.tools.requireTool('openFPGALoader');
      const result = await this.execute(tool.path, args, {
        env: this.tools.env(), all: true, reject: false, timeout: 120000, maxBuffer: 1024 * 1024
      });
      return { success: result.exitCode === 0 && !result.timedOut, log: (result.all || '').slice(-200000) };
    } finally {
      this.busy = false;
    }
  }

  async listBoards() {
    const result = await this.command(['--list-boards']);
    if (!result.success) throw failure('HARDWARE_FAILED', 'Unable to list supported boards', result.log);
    const boards = stripVTControlCharacters(result.log).split('\n').map(line => line.trim().split(/\s+/)[0])
      .filter(name => /^[a-zA-Z0-9][\w.-]+$/.test(name) && !/^(board|board_name|name|supported|available)$/i.test(name));
    return { boards: [...new Set(boards)], log: result.log };
  }

  async detect(options = {}) {
    const result = await this.command([...this.selectors(options), '--detect']);
    return { ...result, detected: result.success };
  }

  async program(projectId, options = {}) {
    const args = this.selectors(options);
    if (!options.board && !options.cable) throw failure('INVALID_INPUT', 'Select a board or programming cable');
    const target = options.target || 'sram';
    if (!['sram', 'flash'].includes(target)) throw failure('INVALID_INPUT', 'target must be sram or flash');
    const project = await this.projects.getProject(projectId);
    if (!project) throw failure('PROJECT_NOT_FOUND', 'Project not found');
    // 与 BuildService 的实际产物名保持一致；有 requireFresh 时同时拒绝过期位流。
    const build = path.join(project.path, '.webvado', 'build');
    const artifact = path.join(build, 'bitstream.bin');
    let resolved;
    try {
      resolved = await realpath(artifact);
      const info = await stat(resolved);
      if (!info.isFile() || info.size === 0) throw failure('NO_BITSTREAM', 'Generate a non-empty bitstream first');
    } catch (error) {
      if (error.code === 'ENOENT') throw failure('NO_BITSTREAM', 'Generate a bitstream first');
      throw error;
    }
    // realpath 也检查构建目录本身被替换为符号链接的情况。
    const realProject = await realpath(project.path);
    if (resolved !== path.join(realProject, '.webvado', 'build', 'bitstream.bin')) {
      throw failure('INVALID_ARTIFACT', 'Bitstream must be inside the project build directory');
    }
    if (this.requireFresh) await this.requireFresh(projectId);
    if (target === 'flash') args.push('-f');
    const result = await this.command([...args, artifact]);
    if (!result.success) throw failure('PROGRAM_FAILED', 'Device programming failed', result.log);
    return result;
  }
}
