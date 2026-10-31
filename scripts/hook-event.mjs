/**
 * Shared reader for the Kiro hook event payload.
 *
 * Kiro writes the event as JSON on the hook process's STDIN. Two things bite
 * on Windows: the payload arrives with a UTF-8 BOM, and it arrives with CRLF
 * line endings. JSON.parse chokes on a leading BOM, so strip it before
 * parsing. An unreadable payload is never an error: the caller decides what to
 * do with a null event.
 */
import { readFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Hook exit codes, from the Kiro exit-code reference.
 *
 *   0  -> hook succeeded, stdout is added to the agent's context
 *   2  -> PreToolUse: the tool call is BLOCKED and stderr goes to the agent
 *   *  -> the hook failed, stderr is shown as a warning and the tool still runs
 *
 * Exiting 1 does not block anything. That is the trap: a guard hook that
 * exits 1 reports its refusal and then lets the command through.
 */
export const HOOK_EXIT = {
  SUCCESS: 0,
  BLOCK: 2,
};

/**
 * @returns {Record<string, unknown> | null}
 */
export function readEvent() {
  let raw = '';
  try {
    raw = readFileSync(0, 'utf8');
  } catch {
    return null;
  }

  const cleaned = raw.replace(/^\uFEFF/, '').trim();
  if (!cleaned) return null;

  try {
    const parsed = JSON.parse(cleaned);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Append the raw event to a log so a hook that misbehaves can be diagnosed
 * instead of guessed at. The log is gitignored.
 *
 * @param {Record<string, unknown> | null} event
 */
export function logEvent(name, event) {
  try {
    const line = JSON.stringify({ at: new Date().toISOString(), hook: name, event }) ?? 'null';
    appendFileSync(path.join(process.cwd(), 'scripts', 'hook-payload.log'), `${line}\n`, 'utf8');
  } catch {
    // A hook must never fail because it could not write a diagnostic.
  }
}

/**
 * Find the first string value under `key`, searching depth first.
 *
 * @param {unknown} node
 * @param {string} key
 * @returns {string | null}
 */
function deepFindString(node, key) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = deepFindString(item, key);
      if (found) return found;
    }
    return null;
  }
  for (const [k, value] of Object.entries(node)) {
    if (k === key && typeof value === 'string' && value.trim()) return value;
  }
  for (const value of Object.values(node)) {
    const found = deepFindString(value, key);
    if (found) return found;
  }
  return null;
}

/**
 * Pull the saved file path out of a hook event. The documented file-event
 * payload carries the path, but the exact key is not guaranteed across
 * surfaces, so every plausible location is checked.
 *
 * @param {Record<string, unknown> | null} event
 * @returns {string | null}
 */
export function eventFilePath(event) {
  if (!event) return null;

  const keys = ['file_path', 'filePath', 'path', 'file', 'target_file', 'targetFile'];
  const containers = [event, event.tool_input, event.file, event.event, event.input];

  for (const container of containers) {
    if (!container || typeof container !== 'object') continue;
    for (const key of keys) {
      const value = container[key];
      if (typeof value === 'string' && value.trim()) return value;
    }
  }

  return deepFindString(event, 'file_path') ?? deepFindString(event, 'path');
}

/**
 * Pull the shell command out of a Pre Tool Use event.
 *
 * The V3 engine sends the tool arguments wrapped in `rawInput`, so the
 * documented `tool_input.command` path alone is not enough. Check the
 * documented shapes first, then `rawInput`, then search the whole payload.
 *
 * @param {Record<string, unknown> | null} event
 * @returns {string}
 */
export function eventCommand(event) {
  if (!event) return '';

  const direct = event.command ?? event.cmd ?? event.script;
  if (typeof direct === 'string' && direct.trim()) return direct;

  const containers = [event.tool_input, event.toolInput, event.input];

  for (const container of containers) {
    if (!container || typeof container !== 'object') continue;
    if (typeof container.command === 'string' && container.command.trim()) {
      return container.command;
    }
  }

  for (const container of containers) {
    if (!container || typeof container !== 'object') continue;
    const raw = container.rawInput;
    if (raw && typeof raw === 'object' && typeof raw.command === 'string' && raw.command.trim()) {
      return raw.command;
    }
  }

  return deepFindString(event, 'command') ?? '';
}
