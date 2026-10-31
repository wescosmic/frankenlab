#!/usr/bin/env node
/**
 * Kiro hook: give the agent the repo state at the start of a session.
 *
 * Trigger: SessionStart (CLI V3, IDE 1.0)
 * Contract: exit 0 -> stdout is added to the agent's context.
 *
 * A Kiro session that starts knowing which branch it is on, whether the tree
 * is clean, and which task is next is far cheaper than one that starts by
 * asking. This prints that in one shot.
 */
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { readEvent } from './hook-event.mjs';

// Drain the event payload so the hook process never leaves the writer blocked.
readEvent();

function git(args) {
  const result = spawnSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) return '';
  return (result.stdout ?? '').trim();
}

const lines = [];

const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
const lastCommit = git(['log', '-1', '--pretty=%h %s']);
const status = git(['status', '--short']);

lines.push('FrankenLab session context');
lines.push(`branch: ${branch || 'unknown'}`);
if (lastCommit) lines.push(`last commit: ${lastCommit}`);
lines.push(status ? `working tree:\n${status}` : 'working tree: clean');

const tasksPath = '.kiro/specs/frankenlab/tasks.md';
if (existsSync(tasksPath)) {
  const headings = readFileSync(tasksPath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    // Phase 0 is a done checklist. Phases 1 to 5 are numbered work items
    // written as headings, so the headings are the open tasks.
    .filter((line) => /^###\s+\d+\.\d+\s+/.test(line))
    .map((line) => line.replace(/^###\s+/, ''));

  if (headings.length) {
    lines.push(
      `open work from ${tasksPath} (${headings.length} items, phases 1 to 5):`,
    );
    for (const heading of headings.slice(0, 6)) lines.push(`  ${heading}`);
    if (headings.length > 6) lines.push(`  ... and ${headings.length - 6} more`);
  } else {
    lines.push(`no open items found in ${tasksPath}.`);
  }
}

lines.push(
  'Dependency rule: the kernel never imports an engine, engines never import each other, and cross-discipline behaviour is a named rule in src/interactions/couplings.ts.',
);
lines.push('Definition of done: npm run typecheck, npm run lint, npm test, all clean.');

console.log(lines.join('\n'));
process.exit(0);
