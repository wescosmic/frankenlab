/**
 * Build the static export.
 *
 * `next.config.mjs` only turns on `output: 'export'` when
 * `NEXT_STATIC_EXPORT=1` is set, so the normal `npm run build` keeps
 * producing a server build. Setting an environment variable from a shell is
 * not portable: PowerShell, cmd and bash all want something different.
 *
 * This script sets it in one place and then runs the Next.js build, so
 * `npm run build:static` does the same thing on every machine.
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

process.env.NEXT_STATIC_EXPORT = '1';

const require = createRequire(import.meta.url);
const nextBin = require.resolve('next/dist/bin/next');

const result = spawnSync(process.execPath, [nextBin, 'build'], {
  stdio: 'inherit',
  env: process.env,
});

// A failed build must fail the command, not print a warning and exit zero.
process.exit(result.status ?? 1);
