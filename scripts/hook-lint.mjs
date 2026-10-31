#!/usr/bin/env node
/**
 * Kiro hook: lint the file the agent just saved.
 *
 * Trigger: File Save (CLI V3, IDE 1.0)
 * Contract:
 *   exit 0 -> stdout is added to the agent's context.
 *   exit 2 -> stderr is returned to the agent as an error.
 *
 * If the event payload does not name a file the hook understands, it does
 * nothing rather than failing. A hook that breaks the session is worse than
 * a hook that does nothing.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { readEvent, eventFilePath, HOOK_EXIT } from './hook-event.mjs';

const candidate = eventFilePath(readEvent());
if (!candidate) process.exit(HOOK_EXIT.SUCCESS);

const relative = path.isAbsolute(candidate) ? path.relative(process.cwd(), candidate) : candidate;
const normalised = relative.replace(/\\/g, '/');

if (!/\.(ts|tsx)$/.test(normalised)) process.exit(HOOK_EXIT.SUCCESS);
if (!/^(src|tests|scripts)\//.test(normalised)) process.exit(HOOK_EXIT.SUCCESS);

const result = spawnSync('npx', ['eslint', '--fix', relative], {
  cwd: process.cwd(),
  encoding: 'utf8',
  shell: process.platform === 'win32',
});

const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();

if (result.status === 0) {
  if (output) console.log(`eslint --fix ${normalised}\n${output}`);
  process.exit(HOOK_EXIT.SUCCESS);
}

console.error(`eslint reported problems in ${normalised}:\n${output}`);
process.exit(HOOK_EXIT.BLOCK);
