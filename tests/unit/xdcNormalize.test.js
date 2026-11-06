import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { parseXdc, normalizeXdcForNextpnr } from '../../backend/services/XdcNormalize.js';

test('parseXdc reads Vivado -dict brace form with trailing semicolons', () => {
  const { attrs, clocks } = parseXdc(`
# comment
set_property -dict { PACKAGE_PIN P17   IOSTANDARD LVCMOS33 } [get_ports { clk }];
create_clock -add -name sys_clk_pin -period 10.00 -waveform {0 5} [get_ports { clk }];
set_property -dict { PACKAGE_PIN P5    IOSTANDARD LVCMOS33 } [get_ports { sw[0] }];
`);
  assert.equal(attrs.get('clk').PACKAGE_PIN, 'P17');
  assert.equal(attrs.get('sw[0]').PACKAGE_PIN, 'P5');
  assert.deepEqual(clocks, [{ port: 'clk', period: 10 }]);
});

test('parseXdc reads flat PACKAGE_PIN form', () => {
  const { attrs } = parseXdc('set_property PACKAGE_PIN V17 [get_ports {SW7}]');
  assert.equal(attrs.get('SW7').PACKAGE_PIN, 'V17');
});

test('normalizeXdcForNextpnr emits only lines nextpnr-xilinx can parse', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'xdc-'));
  await fs.writeFile(path.join(dir, 'a.xdc'), `
set_property -dict { PACKAGE_PIN K3 IOSTANDARD LVCMOS33 } [get_ports { LED0 }];
set_property -dict { PACKAGE_PIN L1 IOSTANDARD LVCMOS33 } [get_ports { LED14 }];
set_property -dict { PACKAGE_PIN M1 IOSTANDARD LVCMOS33 } [get_ports { LED15 }];
create_clock -period 10.00 [get_ports { clk }];
`);
  await fs.writeFile(path.join(dir, 'README.md'), 'ignore me');
  const out = await normalizeXdcForNextpnr(dir);
  assert.match(out, /^set_property PACKAGE_PIN K3 \[get_ports LED0\]$/m);
  // bus names keep braces; pins come before properties, clock last
  assert.ok(out.indexOf('PACKAGE_PIN') < out.indexOf('create_clock'));
  assert.match(out, /create_clock -period 10 \[get_ports clk\]/);
  assert.doesNotMatch(out, /-dict|\[list/);
  await fs.remove(dir);
});

test('normalizeXdcForNextpnr returns null without constraints', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'xdc-empty-'));
  assert.equal(await normalizeXdcForNextpnr(path.join(dir, 'missing')), null);
  assert.equal(await normalizeXdcForNextpnr(dir), null);
  await fs.remove(dir);
});
