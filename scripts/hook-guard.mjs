#!/usr/bin/env node
/**
 * Kiro hook: block destructive shell commands.
 *
 * Trigger: Pre Tool Use (IDE and CLI)
 * Contract: exit 0  -> the tool call proceeds.
 *           exit != 0 -> the tool invocation is blocked and stderr reaches the
 *                        agent.
 *
 * The point is not to sandbox the agent. It is to stop one irreversible
 * command from silently destroying work that exists only in this checkout.
 */
import { readEvent, eventCommand, logEvent } from './hook-event.mjs';

const BLOCKED = [
  {
    label: 'force push',
    pattern: /\bgit\s+push\b[^\n]*(--force\b|-f\b)/,
    reason: 'Force push can rewrite shared history. Use --force-with-lease and say so out loud.',
  },
  {
    label: 'hard reset',
    pattern: /\bgit\s+reset\s+--hard\b/,
    reason: 'git reset --hard discards uncommitted work irreversibly.',
  },
  {
    label: 'git clean',
    pattern: /\bgit\s+clean\b[^\n]*-[a-z]*f/,
    reason: 'git clean removes untracked files that git cannot restore.',
  },
  {
    label: 'discard working tree',
    pattern: /\bgit\s+(checkout\s+--\s+\.|restore\s+\.)/,
    reason: 'That discards every uncommitted change in the working tree.',
  },
  {
    label: 'history rewrite',
    pattern: /\bgit\s+(filter-branch|filter-repo)\b/,
    reason: 'History rewriting is not recoverable from the local clone.',
  },
  {
    label: 'npm publish',
    pattern: /\bnpm\s+publish\b/,
    reason: 'Publishing is not part of the hackathon workflow.',
  },
  {
    label: 'recursive delete of the repository',
    pattern: /\brm\s+-[a-z]*r[a-z]*f[a-z]*\s+[^\n]*(\.\s*$|\/\s*$|~\s*$|\*)/,
    reason: 'Recursive delete aimed at the repository or the home directory.',
  },
];

const event = readEvent();
logEvent('guard-destructive-shell', event);

const command = eventCommand(event);
if (!command) process.exit(0);

// `rm -rf` inside node_modules or .next is build detritus, not work.
const isBuildDetritus = /\brm\s+-[a-z]*r[a-z]*f[a-z]*\s+[^\n]*(node_modules|\.next|dist|coverage)\b/.test(
  command,
);

for (const rule of BLOCKED) {
  if (!rule.pattern.test(command)) continue;
  if (rule.label === 'recursive delete of the repository' && isBuildDetritus) continue;
  console.error(
    `Blocked by the FrankenLab guard hook: ${rule.label}.\n` +
      `Command: ${command}\n` +
      `Reason: ${rule.reason}\n` +
      'If this is genuinely required, run it yourself outside the agent session.',
  );
  process.exit(1);
}

process.exit(0);
