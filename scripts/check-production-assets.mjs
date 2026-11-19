// Network smoke check; deliberately does not claim browser interaction coverage.
import { readFile } from 'node:fs/promises';

const base = process.argv[2] ?? 'https://frankenlab.vercel.app';
const source = await readFile(new URL('../src/visual-assets.ts', import.meta.url), 'utf8');
const paths = [...new Set([...source.matchAll(/['"](\/assets\/[^'"\s]+\.(?:png|webp|glb))['"]/g)].map(match => match[1]))];
const failures = [];
let checked = 0;
const page = await fetch(base, { signal: AbortSignal.timeout(30000) });
if (!page.ok) throw new Error(`Page: ${page.status}`);
const html = await page.text();
if (!html.includes('FrankenLab')) throw new Error('Unexpected page content');
const scripts = [...new Set([...html.matchAll(/src="([^" ]+\.js(?:\?[^" ]*)?)"/g)].map(match => match[1]))];
const queue = [...paths, ...scripts];
await Promise.all(Array.from({ length: 4 }, async () => {
  while (queue.length) {
    const path = queue.shift();
    try {
      const response = await fetch(new URL(path, base), { method: 'HEAD', signal: AbortSignal.timeout(30000) });
      const type = response.headers.get('content-type') ?? '';
      if (!response.ok || type.includes('text/html')) failures.push({ path, status: response.status, type });
      else checked++;
    } catch (error) { failures.push({ path, error: error.message }); }
  }
}));
console.log(JSON.stringify({ base, page: page.status, componentAssets: paths.length, scripts: scripts.length, checked, failures }, null, 2));
if (failures.length) process.exitCode = 1;
