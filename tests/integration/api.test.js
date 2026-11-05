import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';

let root, server, base;
before(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'webvado-api-'));
  process.env.PORT = '0';
  process.env.NODE_ENV = 'test';
  process.env.WEBVADO_PROJECTS_DIR = root;
  ({ server } = await import('../../backend/server.js'));
  assert.ok(server, 'server must expose its listener for isolated tests');
  if (!server.listening) await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (root) await fs.remove(root);
});
async function request(url, method = 'GET', body) {
  const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, data: await response.json() };
}

test('missing API and static files are real 404s', async () => {
  for (const url of ['/api/missing', '/js/missing.js']) {
    const res = await fetch(base + url);
    assert.equal(res.status, 404);
    assert.ok(!(await res.text()).includes('<!DOCTYPE html>'));
  }
});

test('isolated project CRUD, input validation and confined artifact downloads', async () => {
  const created = await request('/api/projects', 'POST', { name: 'api_project' });
  assert.equal(created.status, 201);
  assert.equal(path.dirname(created.data.path), root);
  const id = created.data.id;
  const url = `/api/build/${id}`;
  assert.equal((await request(url + '/netlist')).status, 404);
  assert.equal((await request(url + '/implement', 'POST', { frequency: -1 })).status, 400);
  assert.equal((await request(url + '/implement', 'POST', { package: '--bad' })).status, 400);
  assert.equal((await request(`/api/files/${id}/srcs/rtl/top.v`, 'POST', { content: 'module top(input a, output b); assign b=a; endmodule' })).status, 201);
  assert.equal((await request(url + '/compile', 'POST', {})).data.success, true);
  assert.equal((await request(url + '/synthesize', 'POST', {})).data.success, true);
  const netlist = await request(url + '/netlist');
  assert.ok(netlist.data.netlist.modules.top);
  const implementation = await request(url + '/implement', 'POST', { package: 'ct256', frequency: 12 });
  assert.equal(implementation.status, 200, JSON.stringify(implementation.data));
  assert.equal(implementation.data.report.package, 'ct256');
  const bitstream = await request(url + '/bitstream', 'POST', { package: 'ct256', frequency: 12 });
  assert.equal(bitstream.status, 200, JSON.stringify(bitstream.data));
  assert.ok(bitstream.data.artifacts[0].url.endsWith('/artifacts/bitstream.bin'));
  const binary = await fetch(base + bitstream.data.artifacts[0].url);
  assert.ok((await binary.arrayBuffer()).byteLength > 1000);
  const download = await fetch(base + url + '/artifacts/synth.json');
  assert.equal(download.status, 200);
  assert.ok(download.headers.get('content-disposition').includes('attachment'));
  assert.ok((await download.json()).modules.top);
  const buildDir = path.join(created.data.path, '.webvado/build');
  await fs.symlink(path.join(created.data.path, '.webvado/project.json'), path.join(buildDir, 'escape.json'));
  assert.equal((await request(url + '/artifacts/escape.json')).status, 403);
  assert.equal((await request(url + '/artifacts/%2e%2e%2fproject.json')).status, 403);
  assert.equal((await request(`/api/files/${id}/.webvado/project.json`)).status, 403);
  assert.equal((await request(`/api/files/${id}/missing.v`, 'PUT', { content: '' })).status, 404);
  assert.equal((await request(`/api/projects/${id}`, 'PUT', { settings: { target_frequency_mhz: -1 } })).status, 400);
  assert.equal((await request(`/api/projects/${id}`, 'DELETE')).status, 200);
  assert.equal((await request(`/api/projects/${id}`)).status, 404);
});
