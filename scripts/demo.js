import { readFile } from 'node:fs/promises';

const base = process.env.WEBVADO_URL || 'http://localhost:3000';
async function request(route, body) {
  const response = await fetch(`${base}${route}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || data.error || `HTTP ${response.status}`);
  return data;
}
try {
  const health = await request('/api/health');
  if (health.status !== 'ok') throw new Error('WebVado health check failed');
  const name = process.argv[2] || `counter_demo_${Date.now().toString(36)}`;
  const project = await request('/api/projects', { name, part: 'ice40hx8k', language: 'verilog' });
  for (const [dir, file] of [['rtl', 'counter.v'], ['sim', 'counter_tb.v']]) {
    const content = await readFile(new URL(`../examples/counter/${file}`, import.meta.url), 'utf8');
    await request(`/api/files/${encodeURIComponent(project.id)}/srcs/${dir}/${file}`, { content });
  }
  console.log(`Created ${name}. Open it at ${base} → File → Open Project.`);
  console.log('Run Simulation should display COUNTER_PASS and the VCD waveform.');
} catch (error) {
  console.error(error.message);
  console.error('Start the server with npm start. Existing project names are never overwritten.');
  process.exitCode = 1;
}
