import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * The Frankenstein contract.
 *
 * The whole point of this project is that four incompatible scientific models
 * share one component graph and one clock. That only works if the kernel has
 * never heard of any of them, and if the only place two disciplines are allowed
 * to touch is a named, reviewable rule.
 *
 * These tests read the import graph and make sure it stays that way.
 */

const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');

function filesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...filesUnder(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** Every module specifier imported by a file, with its own directory. */
function importsOf(file: string): { specifier: string; resolved: string }[] {
  const source = readFileSync(file, 'utf8');
  const specifiers = [...source.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]!);
  return specifiers.map((specifier) => {
    let resolved = specifier;
    if (specifier.startsWith('.')) {
      resolved = relative(ROOT, join(file, '..', specifier)).replace(/\\/g, '/');
      resolved = resolved.replace(/\.(ts|tsx)$/, '');
    }
    return { specifier, resolved };
  });
}

const kernelFiles = filesUnder(join(SRC, 'kernel'));
const engineFiles = filesUnder(join(SRC, 'engines'));
const engineNames = readdirSync(join(SRC, 'engines'), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

describe('The Frankenstein contract', () => {
  it('has the four disciplines this project claims to have', () => {
    // Without this, every rule below would pass on an empty folder.
    expect(engineNames.sort()).toEqual(['biology', 'chemistry', 'electronics', 'materials']);
    expect(kernelFiles.length).toBeGreaterThanOrEqual(4);
  });

  it('has a kernel that has never heard of any discipline', () => {
    const offenders: string[] = [];

    for (const file of kernelFiles) {
      for (const { resolved } of importsOf(file)) {
        if (resolved.includes('engines/')) {
          offenders.push(`${relative(ROOT, file)} imports ${resolved}`);
        }
      }
    }

    // The kernel knows about components, ports, units and time. It does not
    // know that biology exists. If it ever does, the whole design is wrong.
    expect(offenders).toEqual([]);
  });

  it('has engines that never import each other', () => {
    const offenders: string[] = [];

    for (const file of engineFiles) {
      const own = engineNames.find((name) => file.includes(`engines/${name}`));
      for (const { resolved } of importsOf(file)) {
        for (const name of engineNames) {
          if (name === own) continue;
          if (resolved.includes(`engines/${name}`)) {
            offenders.push(`${relative(ROOT, file)} imports ${resolved}`);
          }
        }
      }
    }

    // Electronics does not know what a plant is. Chemistry does not know what a
    // resistor is. What they share is the kernel and the port contract.
    expect(offenders).toEqual([]);
  });

  it('has engines that depend on the kernel and nothing else', () => {
    const offenders: string[] = [];

    for (const file of engineFiles) {
      for (const { specifier, resolved } of importsOf(file)) {
        if (specifier.startsWith('@/')) {
          offenders.push(`${relative(ROOT, file)} imports ${specifier}`);
          continue;
        }
        const insideSrc = resolved.startsWith('src/');
        if (insideSrc && !resolved.startsWith('src/kernel/')) {
          offenders.push(`${relative(ROOT, file)} imports ${resolved}`);
        }
      }
    }

    // An engine that reached into the interface, the store or a scenario would
    // be a engine that could not be lifted out and used somewhere else.
    expect(offenders).toEqual([]);
  });

  it('keeps every cross-discipline rule in one reviewable file', () => {
    const offenders: string[] = [];

    for (const file of engineFiles) {
      for (const { resolved } of importsOf(file)) {
        if (resolved.includes('interactions/')) {
          offenders.push(`${relative(ROOT, file)} imports ${resolved}`);
        }
      }
    }

    // Cross-discipline behaviour is a named rule with a confidence level, and
    // the rules live in `src/interactions/couplings.ts`. An engine that reached
    // for the rules directly would be doing the coupling by hand.
    expect(offenders).toEqual([]);
  });

  it('has one file that owns the coupling rules', () => {
    const interactionFiles = filesUnder(join(SRC, 'interactions'));

    expect(interactionFiles.map((f) => relative(ROOT, f).replace(/\\/g, '/')).sort()).toEqual([
      'src/interactions/active-couplings.ts',
      'src/interactions/couplings.ts',
    ]);
  });
});
