import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { parseVCD } from '../../backend/parsers/VCDParser.js';
import { FileManager } from '../../backend/services/FileManager.js';
import { ProjectManager } from '../../backend/services/ProjectManager.js';
import { ToolchainManager } from '../../backend/services/ToolchainManager.js';
import { BuildService } from '../../backend/services/BuildService.js';

test('VCD preserves multiline timescale, hierarchy and symbol aliases', () => {
  const wave = parseVCD(`$timescale\n  10 ps\n$end
$scope module tb $end
$var wire 1 ! clk $end
$scope module dut $end
$var wire 1 ! clk $end
$var wire 4 " data [3:0] $end
$upscope $end
$upscope $end
$enddefinitions $end
#0
$dumpvars
0!
bx "
$end
#20
1!
b1010 "
#40`);
  assert.equal(wave.timescale, '10ps');
  assert.equal(wave.endtime, 40);
  assert.deepEqual(wave.signals.map(s => s.id), ['tb.clk', 'tb.dut.clk', 'tb.dut.data']);
  assert.deepEqual(wave.signals[0].values, [{ time: 0, value: '0' }, { time: 20, value: '1' }]);
  assert.deepEqual(wave.signals[1].values, wave.signals[0].values);
  assert.deepEqual(wave.signals[2].values[1], { time: 20, value: '1010' });
});

describe('filesystem and project boundaries', () => {
  let root, project, pm, fm;
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'webvado-unit-'));
    pm = new ProjectManager(path.join(root, 'projects'));
    project = await pm.createProject({ name: 'safe' });
    fm = new FileManager();
  });
  afterEach(async () => fs.remove(root));

  test('root listing works and hides metadata', async () => {
    const names = (await fm.listDirectory(project.path)).map(x => x.name);
    assert.ok(names.includes('srcs') && names.includes('README.md'));
    assert.equal(names.includes('.webvado'), false);
  });

  test('rejects traversal and symlink reads/writes including metadata aliases', async () => {
    const secret = path.join(root, 'secret.txt');
    await fs.writeFile(secret, 'private');
    await fs.symlink(root, path.join(project.path, 'escape'));
    await fs.symlink(path.join(project.path, '.webvado'), path.join(project.path, 'metadata'));
    await assert.rejects(fm.readFile(project.path, '../../secret.txt'), /path traversal/);
    await assert.rejects(fm.readFile(project.path, 'escape/secret.txt'), /path traversal/);
    await assert.rejects(fm.writeFile(project.path, 'escape/new.txt', 'bad'), /path traversal/);
    await assert.rejects(fm.writeFile(project.path, 'metadata/project.json', '{}'), /path traversal/);
    await assert.rejects(fm.readFile(project.path, '.WEBVADO/project.json'), /path traversal/);
    assert.equal(await fs.readFile(secret, 'utf8'), 'private');
    assert.equal(await fs.pathExists(path.join(root, 'new.txt')), false);
  });

  test('partial settings updates preserve defaults and protect identity', async () => {
    const updated = await pm.updateProject(project.id, {
      settings: { target_frequency_mhz: 12 }, id: 'bad', name: 'bad', path: '/bad', created_at: 'bad'
    });
    assert.equal(updated.settings.simulator, 'iverilog');
    assert.equal(updated.settings.target_frequency_mhz, 12);
    assert.equal(updated.id, project.id);
    assert.equal(updated.name, 'safe');
    assert.notEqual(updated.created_at, 'bad');
    assert.equal((await fs.readJson(path.join(project.path, '.webvado/project.json'))).path, undefined);
  });

  test('simultaneous project creation never overwrites existing sources or identity', async () => {
    const results = await Promise.allSettled([pm.createProject({ name: 'race' }), pm.createProject({ name: 'race' })]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(results.filter(r => r.status === 'rejected').length, 1);
  });

  test('metadata rejects executable identifiers and invalid clock settings', async () => {
    await assert.rejects(pm.createProject({ name: 'invalid', part: {} }), /Invalid part/);
    await assert.rejects(pm.updateProject(project.id, { top_module: 'top; shell bad' }), /Verilog identifier/);
    await assert.rejects(pm.updateProject(project.id, { settings: { target_frequency_mhz: -1 } }), /target_frequency/);
    await assert.rejects(pm.updateProject(project.id, { settings: null }), /settings/);
  });

  test('tool discovery does not mark a failing executable as available', async () => {
    const bin = path.join(root, 'bin');
    await fs.ensureDir(bin);
    await fs.writeFile(path.join(bin, 'yosys'), '#!/bin/sh\necho "loader failed" >&2\nexit 127\n', { mode: 0o755 });
    const tm = new ToolchainManager();
    const tool = await tm._detectTool('yosys', ['-V'], /Yosys ([\d.]+)/, { ...process.env, PATH: bin + path.delimiter + process.env.PATH });
    assert.equal(tool.found, false);
  });

  test('parallel metadata updates retain both settings', async () => {
    await Promise.all([
      pm.updateProject(project.id, { settings: { target_frequency_mhz: 24 } }),
      pm.updateProject(project.id, { top_module: 'counter' })
    ]);
    const updated = await pm.getProject(project.id);
    assert.equal(updated.settings.target_frequency_mhz, 24);
    assert.equal(updated.top_module, 'counter');
  });

  test('one build per project, lock released after failures', async () => {
    const service = new BuildService(pm, new ToolchainManager());
    let release, entered;
    const started = new Promise(resolve => { entered = resolve; });
    const waiting = new Promise(resolve => { release = resolve; });
    const first = service.withBuild(project.id, 'compile', async () => { entered(); await waiting; throw new Error('expected'); });
    const failed = assert.rejects(first, /expected/);
    await started;
    await assert.rejects(service.withBuild(project.id, 'synthesize', async () => ({})), { code: 'BUILD_BUSY' });
    release();
    await failed;
    assert.deepEqual(await service.withBuild(project.id, 'compile', async () => ({ success: true })), { success: true });
  });

  test('a failed build clears its outputs and downstream artifacts even when tools are missing', async () => {
    const service = new BuildService(pm, { requireTool: async () => { throw Object.assign(new Error('missing'), { code: 'TOOL_MISSING' }); } });
    const build = path.join(project.path, '.webvado/build');
    await fs.ensureDir(build);
    for (const stage of ['compile', 'simulate', 'synthesize', 'implement', 'bitstream']) {
      for (const file of ['design.vvp', 'sim.vvp', 'old.vcd', 'synth.json', 'implementation.asc', 'bitstream.bin', 'bitstream-config.json']) {
        await fs.writeFile(path.join(build, file), 'old result');
      }
      await assert.rejects(service[stage](project.id));
      const absent = stage === 'simulate' ? ['sim.vvp', 'old.vcd']
        : stage === 'bitstream' ? ['bitstream.bin', 'bitstream-config.json']
        : stage === 'implement' ? ['implementation.asc', 'bitstream.bin', 'bitstream-config.json']
        : ['synth.json', 'implementation.asc', 'bitstream.bin', 'bitstream-config.json'];
      for (const file of absent) assert.equal(await fs.pathExists(path.join(build, file)), false, `${stage}: ${file}`);
    }
  });

  test('programming freshness rejects edited source, settings and binary contents', async () => {
    const service = new BuildService(pm, new ToolchainManager());
    const build = path.join(project.path, '.webvado/build');
    await fs.ensureDir(build);
    const source = path.join(project.path, 'srcs/rtl/top.v');
    await fs.writeFile(source, 'module top; endmodule');
    const file = path.join(build, 'bitstream.bin');
    await fs.writeFile(file, 'binary fixture');
    const metadata = await pm.getProject(project.id);
    await fs.writeJson(path.join(build, 'bitstream-config.json'), {
      fingerprint: await service.fingerprint(metadata, true), settings: metadata.settings,
      digest: createHash('sha256').update('binary fixture').digest('hex')
    });
    assert.equal(await service.requireFreshBitstream(project.id), file);
    await fs.writeFile(source, 'module other; endmodule');
    await assert.rejects(service.requireFreshBitstream(project.id), { code: 'PREREQUISITE_MISSING' });
    await fs.writeFile(source, 'module top; endmodule');
    await pm.updateProject(project.id, { settings: { target_frequency_mhz: 20 } });
    await assert.rejects(service.requireFreshBitstream(project.id), { code: 'PREREQUISITE_MISSING' });
    await pm.updateProject(project.id, { settings: { target_frequency_mhz: 50 } });
    await fs.writeFile(file, 'different binary');
    await assert.rejects(service.requireFreshBitstream(project.id), { code: 'PREREQUISITE_MISSING' });
  });
});
