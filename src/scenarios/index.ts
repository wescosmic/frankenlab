/**
 * The catalogue of experiments.
 *
 * One experiment is a demo. Three is a platform. Each one lives in its own
 * file under `src/scenarios/`, and each one is a different set of disciplines
 * sharing the same kernel, the same clock and the same component graph.
 */

import type { ExperimentDefinition } from '@/kernel/types';
import { createBioCircuit } from './biocircuit';
import { createCatalysis } from './catalysis';
import { createThresholdAlarm } from './threshold-alarm';

export interface ExperimentEntry {
  readonly id: string;
  readonly name: string;
  /** One line, in plain English, saying what the experiment is for. */
  readonly summary: string;
  /** The disciplines the experiment puts on the bench together. */
  readonly disciplines: readonly string[];
  readonly create: () => ExperimentDefinition;
}

export const EXPERIMENTS: readonly ExperimentEntry[] = [
  {
    id: 'biocircuit',
    name: 'Project BioCircuit',
    summary:
      'A plant drinks a soil dry. The soil drives a probe, the probe drives a comparator, and the comparator lights an alert.',
    disciplines: ['biology', 'electronics', 'materials'],
    create: () => createBioCircuit(),
  },
  {
    id: 'threshold-alarm',
    name: 'Threshold Alarm',
    summary:
      'The same circuit with the biology taken out. Tune the reference resistor and watch the operating point move.',
    disciplines: ['electronics'],
    create: () => createThresholdAlarm(),
  },
  {
    id: 'catalysis',
    name: 'Catalysis Comparison',
    summary:
      'Two reaction vessels running the same reaction, one catalysed and one not. Same destination, different speed.',
    disciplines: ['chemistry'],
    create: () => createCatalysis(),
  },
];

/** The experiment the bench opens on. */
export const DEFAULT_EXPERIMENT_ID = 'biocircuit';

/** Find an experiment in the catalogue. */
export function findExperiment(id: string): ExperimentEntry | undefined {
  return EXPERIMENTS.find((entry) => entry.id === id);
}
