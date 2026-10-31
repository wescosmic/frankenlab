#!/usr/bin/env node
/**
 * Kiro hook: run the verification suite when the agent finishes its turn.
 *
 * Trigger: Agent Stop (IDE and CLI)
 * Contract: exit 0  -> stdout is added to the agent's context.
 *           exit != 0 -> stderr is sent to the agent as an error.
 *
 * The point is to make "the tests still pass" a fact the agent knows, rather
 * than a claim it makes. It runs the same command a human would run.
 */
import { spawnSync } from 'node:child_process';
import { readEvent } from './hook-event.mjs';

// Drain the event payload so the hook process never leaves the writer blocked.
readEvent();

const result = spawnSync('npm', ['run', 'verify'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  shell: process.platform === 'win32',
});

const stdout = result.stdout ?? '';
const stderr = result.stderr ?? '';
const combined = `${stdout}\n${stderr}`;

// Vitest colours its summary even when stdout is a pipe, so the digits are
// wrapped in escape sequences and a naive pattern finds nothing.
const plain = (text) => text.replace(/\u001b\[[0-9;]*m/g, '');

if (result.status === 0) {
  const testFiles = (plain(stdout).match(/Test Files\s+(\d+) passed/) ?? [])[1];
  const testCount = (plain(stdout).match(/Tests\s+(\d+) passed/) ?? [])[1];
  const summary =
    testFiles && testCount ? `${testCount} tests across ${testFiles} files` : 'all checks passed';
  console.log(`npm run verify passed: typecheck, lint and ${summary}.`);
  process.exit(0);
}

const lines = combined.trim().split('\n');
const tail = lines.slice(-40).join('\n');
console.error(`npm run verify failed.\n${tail}`);
process.exit(result.status ?? 1);
