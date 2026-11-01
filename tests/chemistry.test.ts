/**
 * FrankenLab — chemistry tests.
 *
 * Chemistry is the boundary test for the kernel. A fifth discipline plugs in
 * without a line of kernel code changing, so these tests check both the
 * chemistry itself and the fact that the plug-in works.
 *
 * The chemistry model is deliberately small. These tests do not claim it is
 * accurate; they claim it is honest, conserved and deterministic.
 */

import { describe, expect, it } from 'vitest';
import { createTestRegistry } from './world';
import { Simulation } from '../src/kernel/simulator';
import { arrheniusRate, chemistryEngine, equilibriumExtent } from '../src/engines/chemistry/engine';
import { validateExperiment } from '../src/kernel/validate';
import type { ExperimentDefinition } from '../src/kernel/types';

const registry = createTestRegistry();

/** A single closed vessel running A + B ⇌ C. */
function createVessel(
  overrides: {
    initialA?: number;
    initialB?: number;
    rateConstant?: number;
    activationEnergy?: number;
    referenceTemperature?: number;
    equilibriumConstant?: number;
    temperature?: number;
    dt?: number;
    duration?: number;
  } = {},
): ExperimentDefinition {
  return {
    id: 'vessel',
    name: 'Reaction vessel',
    description: 'A closed vessel running a reversible reaction.',
    discipline: 'chemistry',
    tags: ['chemistry'],
    modelVersion: '0.1.0',
    dt: overrides.dt ?? 1,
    duration: overrides.duration ?? 600,
    seed: 1,
    components: [
      {
        id: 'vessel',
        type: 'chemistry.reaction-vessel',
        label: 'Vessel',
        position: { x: 0, y: 0, z: 0 },
        parameters: {
          initial_a: { value: overrides.initialA ?? 1, unit: 'mol_per_L' },
          initial_b: { value: overrides.initialB ?? 1, unit: 'mol_per_L' },
          rate_constant: { value: overrides.rateConstant ?? 0.01, unit: 'L_per_mol_per_s' },
          activation_energy: {
            value: overrides.activationEnergy ?? 25000,
            unit: 'J_per_mol',
          },
          reference_temperature: {
            value: overrides.referenceTemperature ?? 25,
            unit: 'degC',
          },
          equilibrium_constant: {
            value: overrides.equilibriumConstant ?? 4,
            unit: 'unitless',
          },
        },
      },
    ],
    connections: [],
    environment: {
      variables: [
        {
          id: 'temperature',
          label: 'Ambient temperature',
          value: { value: overrides.temperature ?? 25, unit: 'degC' },
          min: { value: -50, unit: 'degC' },
          max: { value: 400, unit: 'degC' },
          description: 'The temperature the vessel sits at.',
        },
      ],
    },
  };
}

describe('the chemistry boundary', () => {
  it('registers as a discipline with no kernel changes', () => {
    expect(chemistryEngine.id).toBe('chemistry');
    expect(registry.tryGetDefinition('chemistry.reaction-vessel')).toBeDefined();
    expect(registry.tryGetDefinition('chemistry.substance')).toBeDefined();
  });

  it('validates and runs inside the same kernel as every other discipline', () => {
    const experiment = createVessel();
    expect(validateExperiment(experiment, registry).valid).toBe(true);

    const result = new Simulation(experiment, registry).run();
    expect(result.success).toBe(true);
    expect(result.steps).toBe(600);
  });
});

describe('the reaction', () => {
  it('conserves the stoichiometric balance', () => {
    const result = new Simulation(createVessel(), registry).run();

    for (const point of result.dataPoints) {
      const balance = point.values['vessel.stoichiometric_balance']!.value;
      // A + B ⇌ C takes one A and one B for every C it makes, so A + C is
      // the quantity that must not change. The plain sum of concentrations
      // does fall, because two moles become one.
      expect(balance).toBeCloseTo(1, 9);
    }
  });

  it('produces product from the reactants', () => {
    const result = new Simulation(createVessel(), registry).run();
    const first = result.dataPoints[0]!.values;
    const last = result.dataPoints.at(-1)!.values;

    expect(first['vessel.product']!.value).toBeGreaterThanOrEqual(0);
    expect(last['vessel.product']!.value).toBeGreaterThan(first['vessel.product']!.value);
  });

  it('runs faster at a higher temperature', () => {
    const cool = new Simulation(createVessel({ temperature: 10 }), registry).run();
    const hot = new Simulation(createVessel({ temperature: 80 }), registry).run();

    expect(hot.dataPoints.at(-1)!.values['vessel.product']!.value).toBeGreaterThan(
      cool.dataPoints.at(-1)!.values['vessel.product']!.value,
    );
  });

  it('makes the rate more temperature-sensitive as the activation energy rises', () => {
    const productAfter = (activationEnergy: number, temperature: number) =>
      new Simulation(
        createVessel({ activationEnergy, temperature }),
        registry,
      ).run().dataPoints.at(-1)!.values['vessel.product']!.value;

    // Below the reference temperature a larger barrier means a slower
    // reaction; above it, a larger barrier means a faster one. Both directions
    // are the same fact: the Arrhenius factor is 1 at the reference
    // temperature and grows away from it in proportion to the barrier.
    expect(productAfter(80000, 10)).toBeLessThan(productAfter(10000, 10));
    expect(productAfter(80000, 80)).toBeGreaterThan(productAfter(10000, 80));
  });

  it('never lets a concentration go negative', () => {
    const result = new Simulation(
      createVessel({ initialA: 0.1, initialB: 5, rateConstant: 1 }),
      registry,
    ).run();

    for (const point of result.dataPoints) {
      expect(point.values['vessel.product']!.value).toBeGreaterThanOrEqual(0);
      expect(point.values['vessel.reactant_a']!.value).toBeGreaterThanOrEqual(0);
      expect(point.values['vessel.reactant_b']!.value).toBeGreaterThanOrEqual(0);
      // B + C is conserved on the B side: 5 + 0.
      const bSide = point.values['vessel.reactant_b']!.value + point.values['vessel.product']!.value;
      expect(bSide).toBeCloseTo(5, 9);
    }
  });

  it('publishes the extent as a total, not a per-step increment', () => {
    const result = new Simulation(createVessel(), registry).run();
    const extents = result.dataPoints.map((point) => point.values['vessel.extent']!.value);

    // The extent is how far the reaction has moved from the starting
    // mixture, so it only ever grows on a forward reaction.
    for (let index = 1; index < extents.length; index += 1) {
      expect(extents[index]!).toBeGreaterThan(extents[index - 1]!);
    }
    // And it ends at the product concentration, because the vessel started
    // with no product at all.
    expect(extents.at(-1)!).toBeCloseTo(result.measurements['vessel.product']!.value, 9);
  });
});

describe('the equilibrium extent', () => {
  it('satisfies the mass-action law it is solved from', () => {
    for (const [a0, b0, k] of [
      [1, 1, 4],
      [1, 5, 4],
      [0.5, 0.5, 1],
      [1, 1, 1000],
    ] as const) {
      const x = equilibriumExtent(a0, b0, k);
      const a = a0 - x;
      const b = b0 - x;
      const c = x;
      // K = c / (a * b)
      expect(c / (a * b)).toBeCloseTo(k, 6);
    }
  });

  it('is never larger than the smaller starting concentration', () => {
    expect(equilibriumExtent(1, 5, 4)).toBeLessThanOrEqual(1);
    expect(equilibriumExtent(0.2, 0.8, 50)).toBeLessThanOrEqual(0.2);
  });

  it('does not depend on the rate constant or the catalyst', () => {
    // This is the whole point of the catalysis experiment: the catalyst
    // changes the rate constant, and the equilibrium cannot move.
    const plain = new Simulation(
      createVessel({ rateConstant: 0.0002 }),
      registry,
    ).run();
    const fast = new Simulation(
      createVessel({ rateConstant: 0.002 }),
      registry,
    ).run();

    // Both are heading for the same place; the faster one just gets there
    // sooner.
    expect(equilibriumExtent(1, 1, 4)).toBeCloseTo(0.6096118, 7);
    expect(plain.dataPoints.at(-1)!.values['vessel.product']!.value).toBeLessThan(0.609611);
    expect(fast.dataPoints.at(-1)!.values['vessel.product']!.value).toBeGreaterThan(
      plain.dataPoints.at(-1)!.values['vessel.product']!.value,
    );
  });

  it('is reported as an observation when the vessel arrives', () => {
    const result = new Simulation(
      createVessel({ rateConstant: 0.05, dt: 1, duration: 300 }),
      registry,
    ).run();
    const codes = result.observations.map((observation) => observation.code);
    expect(codes).toContain('chemistry.equilibrium');
  });
});

describe('the Arrhenius rate', () => {
  it('returns the quoted rate at the reference temperature', () => {
    expect(arrheniusRate(0.01, 25000, 298.15, 298.15)).toBeCloseTo(0.01, 12);
  });

  it('increases with temperature', () => {
    const cold = arrheniusRate(0.01, 25000, 273.15, 298.15);
    const hot = arrheniusRate(0.01, 25000, 373.15, 298.15);
    expect(hot).toBeGreaterThan(cold);
  });

  it('is positive at every temperature', () => {
    expect(arrheniusRate(0.01, 25000, 100, 298.15)).toBeGreaterThan(0);
    expect(arrheniusRate(0.01, 25000, 5000, 298.15)).toBeGreaterThan(0);
  });
});
