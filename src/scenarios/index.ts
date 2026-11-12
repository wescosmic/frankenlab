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
import { createBioBattery } from './bio-battery';
import { createEnzymeOptimisation, createMicrobialFuelCell, createWaterPurification } from './catalogue-showcases';

export interface ExperimentEntry {
  readonly id: string;
  readonly name: string;
  /** One line, in plain English, saying what the experiment is for. */
  readonly summary: string;
  /** The disciplines the experiment puts on the bench together. */
  readonly disciplines: readonly string[];
  /** The question a first-time user should be able to answer. */
  readonly question: string;
  /** The short sequence that makes the experiment legible in a demo. */
  readonly steps: readonly string[];
  /** The signal or relationship to watch while it runs. */
  readonly watch: string;
  /** Why this experiment matters beyond the toy bench. */
  readonly why: string;
  readonly create: () => ExperimentDefinition;
}

export const EXPERIMENTS: readonly ExperimentEntry[] = [
  {
    id: 'biocircuit',
    name: 'Project BioCircuit',
    summary:
      'A plant drinks a soil dry. The soil drives a probe, the probe drives a comparator, and the comparator lights an alert.',
    disciplines: ['biology', 'electronics', 'materials'],
    question: 'Can a living system trigger a measurable electrical response?',
    steps: ['Run the bench', 'Watch the alert change', 'Turn up irrigation to recover the medium'],
    watch: 'Moisture -> probe resistance -> divider voltage -> alert LED',
    why: 'It makes the Frankenstein thesis visible: biology and materials change a solved circuit.',
    create: () => createBioCircuit(),
  },
  {
    id: 'threshold-alarm',
    name: 'Threshold Alarm',
    summary:
      'The same circuit with the biology taken out. Tune the reference resistor and watch the operating point move.',
    disciplines: ['electronics'],
    question: 'How does the reference resistor move the circuit operating point?',
    steps: ['Run the circuit', 'Select the reference resistor', 'Compare the alert threshold'],
    watch: 'Reference resistance -> divider tap voltage -> comparator decision',
    why: 'It isolates the electronics so the user can see the solver, not a hidden script.',
    create: () => createThresholdAlarm(),
  },
  {
    id: 'catalysis',
    name: 'Catalysis Comparison',
    summary:
      'Two reaction vessels running the same reaction, one catalysed and one not. Same destination, different speed.',
    disciplines: ['chemistry'],
    question: 'Can a catalyst change speed without changing the destination?',
    steps: ['Run both vessels', 'Open Measurements', 'Compare time-to-equilibrium'],
    watch: 'Catalysed and uncatalysed reaction curves converge on one equilibrium',
    why: 'It turns a chemistry idea into a measurable, falsifiable comparison.',
    create: () => createCatalysis(),
  },
  {
    id: 'bio-battery',
    name: 'Bio-Battery',
    summary: 'Nutrient activity powers a living cell, a real load, and an indicator LED.',
    disciplines: ['biology', 'electronics'],
    question: 'Can nutrient activity power a usable electrical load?',
    steps: ['Run the cell', 'Watch the activity signal', 'Inspect the LED and load'],
    watch: 'Nutrient activity -> bio-cell voltage -> load current -> indicator',
    why: 'It shows a living component entering an electronics solve through an explicit port contract.',
    create: () => createBioBattery(),
  },
  {
    id: 'microbial-fuel-cell',
    name: 'Microbial Fuel Cell',
    summary: 'A living culture, electrode and capacitor make a small biological energy system.',
    disciplines: ['biology', 'materials', 'electronics'],
    question: 'Can a microbial culture become a repeatable energy source?',
    steps: ['Run the culture', 'Inspect the electrode coupling', 'Compare stored capacitor energy'],
    watch: 'Culture activity -> electrode potential -> capacitor storage',
    why: 'It combines living matter, materials and electronics in one inspectable bench.',
    create: () => createMicrobialFuelCell(),
  },
  {
    id: 'enzyme-optimisation',
    name: 'Enzyme Optimisation',
    summary: 'Use temperature and acidity as discovery variables for a catalytic system.',
    disciplines: ['biology', 'chemistry'],
    question: 'Which temperature and acidity conditions maximize enzyme activity?',
    steps: ['Open Discovery', 'Choose temperature or acidity', 'Run a bounded sweep'],
    watch: 'Environment variables -> enzyme activity -> product formation',
    why: 'It turns the simulator into a small reproducible discovery instrument.',
    create: () => createEnzymeOptimisation(),
  },
  {
    id: 'water-purification',
    name: 'Water Purification',
    summary: 'Assemble a membrane, filter and separator into a visible purification train.',
    disciplines: ['biology', 'chemistry', 'materials'],
    question: 'How do membrane, filter media and separation change water quality?',
    steps: ['Run the train', 'Inspect each material stage', 'Follow permeate and retained signals'],
    watch: 'Feed concentration -> membrane transport -> filtration -> separated stream',
    why: 'It makes a multi-stage process understandable by exposing every handoff.',
    create: () => createWaterPurification(),
  },
];

/** The experiment the bench opens on. */
export const DEFAULT_EXPERIMENT_ID = 'biocircuit';

/** Find an experiment in the catalogue. */
export function findExperiment(id: string): ExperimentEntry | undefined {
  return EXPERIMENTS.find((entry) => entry.id === id);
}
