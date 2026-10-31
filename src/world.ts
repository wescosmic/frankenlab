/**
 * FrankenLab — the world.
 *
 * One place that builds the registry every part of the product shares: the
 * workbench, the assistant, the diagnostics and the tests. If they disagree,
 * a passing test stops meaning anything.
 *
 * Adding a discipline means adding one line here. Nothing in the kernel
 * changes.
 */

import { ComponentRegistry } from './kernel/registry';
import { biologyEngine } from './engines/biology/engine';
import { chemistryEngine } from './engines/chemistry/engine';
import { electronicsEngine } from './engines/electronics/engine';
import { materialsEngine } from './engines/materials/engine';
import { ALL_COUPLINGS } from './interactions/couplings';
import type { ConnectionRule } from './kernel/types';

export const DISCIPLINE_ORDER = ['electronics', 'biology', 'materials', 'chemistry'] as const;

export const DISCIPLINE_COLOURS: Readonly<Record<string, string>> = {
  electronics: '#ef6461',
  biology: '#7bc96f',
  materials: '#c2a084',
  chemistry: '#f0b350',
};

/**
 * Build the registry: every discipline engine, plus the interdisciplinary
 * coupling rules registered as a synthetic engine so they enter the same rule
 * table the validator consults.
 */
export function createWorld(): ComponentRegistry {
  const registry = new ComponentRegistry();
  registry.registerEngine(electronicsEngine);
  registry.registerEngine(biologyEngine);
  registry.registerEngine(materialsEngine);
  registry.registerEngine(chemistryEngine);

  const couplingRules: ConnectionRule[] = ALL_COUPLINGS.flatMap((c) => [...c.rules]);
  registry.registerEngine({
    id: '__couplings__',
    name: 'Interdisciplinary couplings',
    version: '1.0.0',
    components: [],
    behaviors: new Map(),
    connectionRules: couplingRules,
  });

  return registry;
}
