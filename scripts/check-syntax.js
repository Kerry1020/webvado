import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
let count = 0;
async function check(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await check(file);
    else if (/\.(js|cjs|mjs)$/.test(entry.name)) {
      const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
      if (result.status !== 0) throw new Error(`Syntax check failed: ${file}`);
      count++;
    }
  }
}
for (const dir of ['backend', 'frontend/js', 'scripts', 'tests']) await check(path.join(root, dir));
console.log(`Syntax checked ${count} JavaScript files.`);
