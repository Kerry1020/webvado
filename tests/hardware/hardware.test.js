import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { HardwareService } from '../../backend/services/HardwareService.js';

async function fixture(t, execute) {
  const root = await mkdtemp(path.join(tmpdir(), 'wv-hardware-'));
  const project = { id: 'test', path: path.join(root, 'project') };
  await mkdir(path.join(project.path, '.webvado/build'), { recursive: true });
  await writeFile(path.join(project.path, '.webvado/build/bitstream.bin'), Buffer.from([0x7e, 0xaa, 0x99, 0x7e]));
  t.after(() => rm(root, { recursive: true, force: true }));
  const calls = [];
  const svc = new HardwareService(
    { getProject: async id => id === project.id ? project : null },
    { requireTool: async () => ({ path: '/tools/openFPGALoader' }), env: () => ({ PATH: '/tools' }) },
    { execute: async (...args) => { calls.push(args); return execute ? execute(...args) : { exitCode: 0, all: 'done' }; } }
  );
  return { svc, calls, project, root };
}

test('program SRAM uses the generated file and explicit selector, flash adds -f', async t => {
  const { svc, calls, project } = await fixture(t);
  await svc.program('test', { board: 'ice40_generic', target: 'sram' });
  assert.deepEqual(calls[0][1], ['-b', 'ice40_generic', path.join(project.path, '.webvado/build/bitstream.bin')]);
  await svc.program('test', { cable: 'ft2232', serial: 'ABC123', target: 'flash' });
  assert.deepEqual(calls[1][1], ['-c', 'ft2232', '--usb-serial-num', 'ABC123', '-f', path.join(project.path, '.webvado/build/bitstream.bin')]);
});

test('invalid selector, missing board and missing artifact never run a tool', async t => {
  const { svc, calls, project } = await fixture(t);
  await assert.rejects(svc.program('test', { board: '--help' }), { code: 'INVALID_INPUT' });
  await assert.rejects(svc.program('test', {}), { code: 'INVALID_INPUT' });
  await assert.rejects(svc.program('test', { board: 'ice40', target: 'erase' }), { code: 'INVALID_INPUT' });
  await rm(path.join(project.path, '.webvado/build/bitstream.bin'));
  await assert.rejects(svc.program('test', { board: 'ice40' }), { code: 'NO_BITSTREAM' });
  assert.equal(calls.length, 0);
});

test('an artifact symlink outside the project is rejected', async t => {
  const { svc, calls, project, root } = await fixture(t);
  const artifact = path.join(project.path, '.webvado/build/bitstream.bin');
  await rm(artifact);
  await writeFile(path.join(root, 'external.bin'), 'external');
  await symlink(path.join(root, 'external.bin'), artifact);
  await assert.rejects(svc.program('test', { board: 'ice40' }), { code: 'INVALID_ARTIFACT' });
  assert.equal(calls.length, 0);
});

test('no connected device is a failed detection, and failed programming is not success', async t => {
  const { svc } = await fixture(t, async () => ({ exitCode: 1, all: 'No cable found' }));
  const result = await svc.detect({ board: 'ice40' });
  assert.equal(result.detected, false);
  assert.equal(result.success, false);
  assert.match(result.log, /No cable/);
  await assert.rejects(svc.program('test', { board: 'ice40' }), { code: 'PROGRAM_FAILED' });
});

test('concurrent hardware commands are rejected until the first finishes', async t => {
  let release;
  let notifyStarted;
  const started = new Promise(resolve => { notifyStarted = resolve; });
  const { svc } = await fixture(t, () => {
    notifyStarted();
    return new Promise(resolve => { release = () => resolve({ exitCode: 0, all: 'IDCODE 0x123' }); });
  });
  const first = svc.detect({ board: 'ice40' });
  await started;
  await assert.rejects(svc.detect({ board: 'ice40' }), { code: 'HARDWARE_BUSY' });
  release();
  assert.equal((await first).detected, true);
});

test('board discovery parses colored CLI rows without including headers', async t => {
  const { svc } = await fixture(t, async () => ({ exitCode: 0, all: '\u001b[32mboard name                 cable_name         fpga_part\u001b[0m\n\u001b[34mice40_generic              ft2232             ice40\u001b[0m\n' }));
  assert.deepEqual((await svc.listBoards()).boards, ['ice40_generic']);
});

test('malformed request bodies are input errors rather than process failures', async t => {
  const { svc, calls } = await fixture(t);
  for (const value of [null, [], 'ice40', 1]) {
    await assert.rejects(svc.detect(value), { code: 'INVALID_INPUT' });
  }
  assert.equal(calls.length, 0);
});

test('a stale bitstream is rejected before the programmer runs', async t => {
  const { svc, calls } = await fixture(t);
  svc.requireFresh = async () => { throw Object.assign(new Error('Bitstream is stale'), { code: 'PREREQUISITE_MISSING' }); };
  await assert.rejects(svc.program('test', { board: 'ice40' }), { code: 'PREREQUISITE_MISSING' });
  assert.equal(calls.length, 0);
});
