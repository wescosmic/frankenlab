import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EXPERIMENTS } from '@/scenarios';
import { createWorld } from '@/world';
import { COMPONENT_MODEL_PATHS } from '@/visual-assets';

const ROOT = join(__dirname, '..');

function localAsset(path: string): string {
  return join(ROOT, 'public', path.replace(/^\//, ''));
}

describe('presentation assets stay judge-ready', () => {
  it('gives every component a local GLB model', () => {
    const missing = createWorld()
      .listComponents()
      .map((definition) => ({
        type: definition.type,
        model: definition.inventoryVisual?.model ?? COMPONENT_MODEL_PATHS[definition.type],
      }))
      .filter(({ model }) => !model || !existsSync(localAsset(model)));

    expect(missing).toEqual([]);
  });

  it('gives every experiment a first-run story', () => {
    for (const entry of EXPERIMENTS) {
      expect(entry.question.length, entry.id).toBeGreaterThan(20);
      expect(entry.steps.length, entry.id).toBeGreaterThanOrEqual(3);
      expect(entry.watch.length, entry.id).toBeGreaterThan(20);
      expect(entry.why.length, entry.id).toBeGreaterThan(20);
    }
  });
});
