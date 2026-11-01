import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { DISCIPLINE_COLOURS, DISCIPLINE_ORDER } from '@/world';

/**
 * The design contract.
 *
 * A Tailwind utility for a colour that was never defined does not fail. It
 * simply does not exist, so the element falls back to whatever it inherited and
 * the styling quietly disappears. That is how a destructive button ends up
 * looking like an ordinary one.
 *
 * These tests make the palette a contract, the same way the port contract and
 * the couplings contract make the wiring a contract.
 */

const ROOT = join(__dirname, '..');
const CSS_PATH = join(ROOT, 'src', 'app', 'globals.css');
const SRC_PATH = join(ROOT, 'src');

const css = readFileSync(CSS_PATH, 'utf8');

/** The colour tokens declared in the `@theme` block, as name -> hex. */
const theme = (() => {
  const block = css.split('@theme', 2)[1]?.split(/\n}/, 1)[0] ?? '';
  return new Map(
    [...block.matchAll(/--color-lab-([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1], m[2]]),
  );
})();

/** Every source file under `src/`, so the scan cannot be evaded by a new file. */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const files = sourceFiles(SRC_PATH);

/** Colour utilities that name a `lab-*` token, e.g. `text-lab-dim`. */
const UTILITY = /\b(text|bg|border|ring|shadow|outline|fill|stroke|from|to|via|divide|decoration|accent|caret|placeholder)-lab-([a-z0-9-]+)/g;

interface Use {
  token: string;
  asText: boolean;
  where: string;
}

const uses: Use[] = files.flatMap((file) => {
  const source = readFileSync(file, 'utf8');
  const here = relative(ROOT, file);
  return [...source.matchAll(UTILITY)].map((m) => ({
    token: m[2]!,
    asText: m[1] === 'text',
    where: here,
  }));
});

/** WCAG 2.1 relative luminance. */
function luminance(hex: string): number {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255);
  const linear = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

/** WCAG 2.1 contrast ratio, from 1 to 21. */
function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

describe('The palette is a contract, not a suggestion', () => {
  it('finds the colour utilities the product actually uses', () => {
    // If this ever fails, the scan is broken rather than the product.
    expect(uses.length).toBeGreaterThan(20);
    expect(new Set(uses.map((u) => u.token)).size).toBeGreaterThan(4);
  });

  it('defines every colour the product asks for', () => {
    const missing = uses
      .filter((use) => !theme.has(use.token))
      .map((use) => `${use.token} (${use.where})`);

    // An undefined token is not an error. It is an element with no styling,
    // which is worse, because nothing says so.
    expect([...new Set(missing)]).toEqual([]);
  });

  it('gives every token a real hex value', () => {
    for (const [name, value] of theme) {
      expect(value, name).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('keeps every text colour readable on the panel it sits on', () => {
    const panel = theme.get('panel')!;
    const raised = theme.get('panel-raised')!;

    const failures = uses
      .filter((use) => use.asText && theme.has(use.token))
      .map((use) => {
        const hex = theme.get(use.token)!;
        const worst = Math.min(contrast(hex, panel), contrast(hex, raised));
        return { token: use.token, worst, where: use.where };
      })
      .filter((row) => row.worst < 4.5);

    // 4.5:1 is WCAG AA for text of this size, and every one of these tokens is
    // used on small helper copy that a judge has to read off a projector.
    expect(
      failures.map((f) => `${f.token} at ${f.worst.toFixed(2)}:1 (${f.where})`),
    ).toEqual([]);
  });

  it('uses the same discipline colour in the stylesheet and the 3D scene', () => {
    // The palette comment promises that a part's colour always tells you what
    // kind of science it is. That only holds while the two copies agree.
    for (const discipline of DISCIPLINE_ORDER) {
      expect(DISCIPLINE_COLOURS[discipline], discipline).toBe(theme.get(discipline));
    }
  });
});
