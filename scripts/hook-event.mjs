/**
 * Shared reader for the Kiro hook event payload.
 *
 * Kiro writes the event as JSON on the hook process's STDIN. Two things bite
 * on Windows: the payload arrives with a UTF-8 BOM, and it arrives with CRLF
 * line endings. JSON.parse chokes on a leading BOM, so strip it before
 * parsing. An unreadable payload is never an error: the caller decides what to
 * do with a null event.
 */
import { readFileSync } from 'node:fs';

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

  return null;
}

/**
 * Pull the shell command out of a Pre Tool Use event.
 *
 * @param {Record<string, unknown> | null} event
 * @returns {string}
 */
export function eventCommand(event) {
  if (!event) return '';

  const direct = event.command ?? event.cmd ?? event.script;
  if (typeof direct === 'string') return direct;

  const nested = event.tool_input ?? event.input;
  if (nested && typeof nested === 'object' && typeof nested.command === 'string') {
    return nested.command;
  }

  return '';
}
