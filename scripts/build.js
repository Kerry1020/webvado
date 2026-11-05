import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// 保留 ESM 和目录结构，避免 import.meta.url 与 pino worker 在打包后失效。
const root = fileURLToPath(new URL('../', import.meta.url));
const target = process.argv[2];
const targets = target ? [target] : ['backend', 'frontend'];
if (targets.some(name => !['backend', 'frontend'].includes(name))) {
  throw new Error('Usage: node scripts/build.js [backend|frontend]');
}
await mkdir(path.join(root, 'dist'), { recursive: true });
for (const name of targets) {
  const destination = path.join(root, 'dist', name);
  await rm(destination, { recursive: true, force: true });
  await cp(path.join(root, name), destination, { recursive: true });
  console.log(`Built dist/${name}`);
}
await cp(path.join(root, 'package.json'), path.join(root, 'dist/package.json'));
console.log('Run: node dist/backend/server.js (dependencies are resolved from node_modules/)');
