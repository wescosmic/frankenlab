#!/usr/bin/env node
/**
 * Run one Kiro CLI task headlessly and print what happened.
 *
 * This is the scripted pass the hackathon write-up talks about: no TUI, no
 * scraping a terminal, a machine-readable result that a script can act on.
 *
 *   node scripts/kiro-run.mjs --agent lab-lead --prompt-file brief.md
 *   node scripts/kiro-run.mjs --prompt "Say hello" --cwd C:\path\to\repo
 *
 * The CLI's `--output-format stream-json` emits ACP events, one JSON object
 * per line. This parses them and prints the agent's own words, the hooks that
 * fired, and the tool calls that were blocked or failed.
 *
 * Exits with the CLI's exit code, so it can be used in CI.
 */
import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const CLI_CANDIDATES = [
  process.env.KIRO_CLI,
  'C:\\Users\\Wesley\\AppData\\Local\\Kiro-Cli\\kiro-cli.exe',
  path.join(process.env.LOCALAPPDATA ?? '', 'Kiro-Cli', 'kiro-cli.exe'),
  'kiro-cli',
].filter(Boolean);

function parseArgs(argv) {
  const args = { prompt: null, promptFile: null, agent: null, cwd: null, extra: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--prompt') args.prompt = argv[++i];
    else if (arg === '--prompt-file') args.promptFile = argv[++i];
    else if (arg === '--agent') args.agent = argv[++i];
    else if (arg === '--cwd') args.cwd = argv[++i];
    else args.extra.push(arg);
  }
  return args;
}

function resolvePrompt(args) {
  if (args.prompt) return args.prompt;
  if (args.promptFile) {
    if (!existsSync(args.promptFile)) throw new Error(`No such file: ${args.promptFile}`);
    return readFileSync(args.promptFile, 'utf8');
  }
  throw new Error('Pass --prompt or --prompt-file');
}

function resolveCli() {
  for (const candidate of CLI_CANDIDATES) {
    if (candidate === 'kiro-cli') return candidate;
    if (existsSync(candidate)) return candidate;
  }
  return 'kiro-cli';
}

const args = parseArgs(process.argv.slice(2));
const prompt = resolvePrompt(args);

const cliArgs = [
  'chat',
  '--v3',
  '--no-interactive',
  '--trust-workspace',
  '--trust-all-tools',
  '--output-format',
  'stream-json',
];
if (args.agent) cliArgs.push('--agent', args.agent);
cliArgs.push(prompt);

const child = spawn(resolveCli(), cliArgs, {
  cwd: args.cwd ?? process.cwd(),
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe'],
});

const messages = [];
const hooks = [];
const blocked = [];
const agents = [];
const steering = [];

let buffer = '';
child.stdout.on('data', (chunk) => {
  buffer += chunk.toString('utf8');
  const lines = buffer.split('\n');
  buffer = lines.pop() ?? '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) continue;
    let event;
    try {
      event = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (event.type !== 'sessionUpdate') continue;
    const update = event.data?.update ?? {};
    const kind = update.sessionUpdate;

    if (kind === 'agent_message_chunk' && update.content?.text) {
      messages.push(update.content.text);
    }

    if (kind === 'available_commands_update') {
      for (const command of update.availableCommands ?? []) {
        const origin = command._meta?.kiro?.resource?.source?.origin;
        if (origin === 'workspace' && !agents.includes(command.name)) agents.push(command.name);
      }
    }

    if (kind === 'session_info_update') {
      const meta = update._meta?.kiro ?? {};
      if (meta.kind === 'hook_update' && meta.hook) {
        hooks.push(`${meta.hook.name}: ${meta.hook.status}`);
      }
      if (meta.kind === 'steering_inclusion') {
        for (const doc of meta.steeringDocuments ?? []) {
          steering.push(path.basename(doc));
        }
      }
      if (meta.kind === 'turn_completion') {
        blocked.push(`credits: ${meta.usage ?? 'unreported'}`);
      }
    }

    if (kind === 'tool_call_update' && update.status === 'failed') {
      const text =
        update.rawOutput?.message ??
        update.content?.map?.((c) => c.content?.text ?? '').join(' ') ??
        '';
      blocked.push(`BLOCKED: ${String(text).slice(0, 300)}`);
    }
  }
});

let stderr = '';
child.stderr.on('data', (chunk) => {
  stderr += chunk.toString('utf8');
});

child.on('close', (code) => {
  console.log('=== agent output ===');
  console.log(messages.join('').trim() || '(no message)');
  if (agents.length) {
    console.log('\n=== workspace agents registered ===');
    console.log(agents.join(', '));
  }
  if (steering.length) {
    console.log('\n=== steering included ===');
    console.log([...new Set(steering)].join(', '));
  }
  if (hooks.length) {
    console.log('\n=== hooks fired ===');
    console.log(hooks.join(', '));
  }
  if (blocked.length) {
    console.log('\n=== notable events ===');
    console.log(blocked.join('\n'));
  }
  const warnings = stderr
    .split('\n')
    .filter((line) => /\[ERROR\]|error:/i.test(line))
    .slice(0, 10);
  if (warnings.length) {
    console.log('\n=== stderr warnings ===');
    console.log(warnings.join('\n'));
  }
  console.log(`\n=== kiro-cli exit code: ${code} ===`);
  process.exit(code ?? 1);
});
