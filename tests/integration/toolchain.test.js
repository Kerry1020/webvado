import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { ProjectManager } from '../../backend/services/ProjectManager.js';
import { ToolchainManager } from '../../backend/services/ToolchainManager.js';
import { BuildService } from '../../backend/services/BuildService.js';

let root, pm, service;
before(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'webvado-toolchain-'));
  pm = new ProjectManager(root);
  service = new BuildService(pm, new ToolchainManager());
});
after(async () => { await fs.remove(root); });

async function fixture(name, part = 'ice40hx8k') {
  const project = await pm.createProject({ name, part });
  await fs.writeFile(path.join(project.path, 'srcs/rtl/counter.v'), `module counter(input clk, output led);
reg [7:0] count = 0;
always @(posedge clk) count <= count + 1;
assign led = count[7];
endmodule`);
  await fs.writeFile(path.join(project.path, 'srcs/sim/tb.v'), '`timescale 1ns/1ps\n' + `module tb;
reg clk = 0;
wire led;
counter dut(clk, led);
always #5 clk = ~clk;
initial begin $dumpfile("counter.vcd"); $dumpvars(0, tb); #5000; $display("FINISHED_EARLY_TEST"); $finish; end
endmodule`);
  return project;
}

test('real Icarus compile and simulation enforce nanosecond runtime, preserve aliases', { timeout: 30000 }, async () => {
  const project = await fixture('simulation');
  assert.equal((await service.compile(project.id)).success, true);
  const result = await service.simulate(project.id, { runTime: 100 });
  assert.equal(result.success, true);
  assert.equal(result.waveformData.timescale, '1ps');
  assert.equal(result.waveformData.endtime, 100000);
  assert.ok(!result.output.includes('FINISHED_EARLY_TEST'));
  const clk = result.waveformData.signals.find(s => s.id === 'tb.clk');
  const alias = result.waveformData.signals.find(s => s.id === 'tb.dut.clk');
  assert.ok(clk.values.length >= 20);
  assert.deepEqual(clk.values, alias.values);
  await fs.writeFile(path.join(project.path, 'srcs/rtl/broken.v'), 'module broken(; endmodule');
  await assert.rejects(service.compile(project.id), error => error.code === 'COMPILE_FAILED' && error.diagnostics.length > 0);
});

for (const [part, pkg] of [['ice40hx8k', 'ct256'], ['ice40up5k', 'sg48']]) {
  test(`real ${part}/${pkg} synthesis, placement, routing and bitstream`, { timeout: 180000 }, async () => {
    const project = await fixture(part, part);
    const synthesis = await service.synthesize(project.id);
    assert.equal(synthesis.success, true);
    assert.equal(synthesis.report.top, 'counter');
    assert.ok(synthesis.report.cells > 0);
    const netlist = await service.getNetlist(project.id);
    assert.ok(netlist.modules.counter.ports.clk);
    const implementation = await service.implement(project.id, { package: pkg, frequency: 12 });
    assert.equal(implementation.success, true);
    assert.equal(implementation.report.package, pkg);
    assert.ok(implementation.report.utilization);
    assert.ok(implementation.artifacts.some(a => a.name === 'implementation.asc'));
    const bitstream = await service.bitstream(project.id, { package: pkg, frequency: 12 });
    assert.equal(bitstream.success, true);
    const binary = await fs.readFile(path.join(project.path, '.webvado/build/bitstream.bin'));
    assert.ok(binary.length > 1000);
    assert.ok(binary.includes(Buffer.from([0x7e, 0xaa, 0x99, 0x7e])));
    assert.equal(await service.requireFreshBitstream(project.id), path.join(project.path, '.webvado/build/bitstream.bin'));
    console.log(JSON.stringify({ part, package: pkg, cells: synthesis.report.cells, bytes: binary.length, report: implementation.report }));
    await fs.writeFile(path.join(project.path, 'srcs/rtl/broken.v'), 'module broken(; endmodule');
    await assert.rejects(service.requireFreshBitstream(project.id), { code: 'PREREQUISITE_MISSING' });
    await assert.rejects(service.implement(project.id, { package: pkg, frequency: 12 }), { code: 'PREREQUISITE_MISSING' });
    await assert.rejects(service.synthesize(project.id), { code: 'SYNTH_FAILED' });
    await assert.rejects(service.getNetlist(project.id), { code: 'ARTIFACT_NOT_FOUND' });
    await assert.rejects(service.bitstream(project.id), { code: 'PREREQUISITE_MISSING' });
  });
}

test('physical implementation clearly rejects unsupported devices', async () => {
  const project = await fixture('unsupported', 'ecp5-25k');
  await assert.rejects(service.implement(project.id), { code: 'UNSUPPORTED_DEVICE' });
});

test('real generic and ECP5 synthesis use explicit top and preserve nonempty statistics', { timeout: 120000 }, async () => {
  for (const part of ['generic', 'ecp5-25k']) {
    const project = await fixture(`synth_${part}`, part);
    const result = await service.synthesize(project.id, { topModule: 'counter' });
    assert.equal(result.report.top, 'counter');
    assert.ok(result.report.cells > 0);
    assert.ok(Object.keys(result.report.cellTypes).length > 0);
  }
});
