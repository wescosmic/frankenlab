/**
 * Two reaction vessels, side by side, running the same reaction.
 *
 * One has no catalyst. One has a catalyst. Both start from the same mixture,
 * and both end up in the same place.
 *
 * That is the point of the experiment. A catalyst changes how *fast* a
 * reaction gets to equilibrium. It does not change *where* equilibrium is,
 * because equilibrium is set by the ratio of the forward and reverse rates
 * and a catalyst multiplies both by the same factor. A catalyst that moved
 * the equilibrium would be a different claim, and a wrong one.
 *
 * The conservation check is exact throughout: the vessel is closed, so the
 * sum of A and C never changes.
 */

import type { ExperimentDefinition } from '@/kernel/types';

export interface CatalysisOptions {
  /** How much the catalysed vessel is speeded up. */
  readonly catalyst?: number;
  /** The temperature both vessels run at, in degrees Celsius. */
  readonly temperature?: number;
  readonly name?: string;
  readonly seed?: number;
}

export function createCatalysis(options: CatalysisOptions = {}): ExperimentDefinition {
  const catalyst = options.catalyst ?? 8;
  const temperature = options.temperature ?? 25;
  const seed = options.seed ?? 20261031;

  /** The mixture both vessels start from. */
  const mixture = {
    initial_a: { value: 1, unit: 'mol_per_L' as const },
    initial_b: { value: 1, unit: 'mol_per_L' as const },
    // A rate constant that puts the whole story inside four simulated hours:
    // the uncatalysed vessel is still climbing at the end of the run, and the
    // catalysed one has been sitting on its equilibrium for most of it. The
    // rate is illustrative; the ratio between the two vessels is the point.
    rate_constant: { value: 0.0006 },
    activation_energy: { value: 25_000, unit: 'J_per_mol' as const },
    reference_temperature: { value: 25, unit: 'degC' as const },
    equilibrium_constant: { value: 4, unit: 'unitless' as const },
    enthalpy: { value: -30_000, unit: 'J_per_mol' as const },
    volume: { value: 1, unit: 'L' as const },
  };

  return {
    id: 'catalysis',
    name: options.name ?? 'Catalysis Comparison',
    description:
      'The same reaction in two vessels. One is catalysed and one is not. They reach the same equilibrium, and the catalysed one gets there first.',
    discipline: 'chemistry',
    tags: ['chemistry', 'catalysis', 'kinetics', 'interdisciplinary'],
    modelVersion: '1.0.0',
    dt: 60, // one simulated minute per step
    duration: 4 * 3600, // four simulated hours
    seed,
    trackedSeries: [
      { key: 'plain.product', label: 'Product, no catalyst', colour: '#f0b350' },
      { key: 'catalysed.product', label: 'Product, catalysed', colour: '#4fd1c5' },
      { key: 'plain.extent', label: 'Extent, no catalyst', colour: '#c2a084' },
      { key: 'catalysed.extent', label: 'Extent, catalysed', colour: '#7bc96f' },
    ],
    components: [
      {
        id: 'plain',
        type: 'chemistry.reaction-vessel',
        label: 'No catalyst',
        position: { x: -2.6, y: 0, z: 0 },
        parameters: {
          ...mixture,
          catalyst: { value: 1 },
          label: { value: 'Plain' },
        },
      },
      {
        id: 'catalysed',
        type: 'chemistry.reaction-vessel',
        label: 'Catalysed',
        position: { x: 2.6, y: 0, z: 0 },
        parameters: {
          ...mixture,
          catalyst: { value: catalyst },
          label: { value: 'Catalysed' },
        },
      },
    ],
    connections: [],
    environment: {
      variables: [
        {
          id: 'temperature',
          label: 'Vessel temperature',
          value: { value: temperature, unit: 'degC' },
          min: { value: 0, unit: 'degC' },
          max: { value: 120, unit: 'degC' },
          description:
            'The temperature both vessels run at. The rate follows the Arrhenius equation, so a warmer vessel reacts faster.',
        },
      ],
    },
  };
}

/**
 * The numbers this experiment quotes, measured from the simulation.
 *
 * Measured by `scripts/measure-catalysis.ts`, not written by hand. If the
 * numbers here and that script disagree, the script is right.
 *
 * The headline claim is the one that matters: the two vessels end up in the
 * same place, and the catalysed one gets there nine times sooner.
 */
export const CATALYSIS_MEASURED = {
  /** The extent the mass-action law solves for, in mol per litre. */
  equilibriumExtent: 0.609612,
  /** Where the uncatalysed vessel ends up after four hours. */
  plainProduct: 0.609569,
  /** Where the catalysed vessel ends up after four hours. */
  catalysedProduct: 0.609612,
  /** How far apart the two vessels end, in mol per litre. */
  finalGap: 0.000043,
  /** Minutes for the uncatalysed vessel to settle to within one per cent. */
  plainSettleMinutes: 110,
  /** Minutes for the catalysed vessel to settle to within one per cent. */
  catalysedSettleMinutes: 12,
  /** How many times sooner the catalysed vessel gets there. */
  speedUp: 9.2,
} as const;
