/**
 * FrankenLab — interdisciplinary interaction tests.
 *
 * The Frankenstein claim is that disciplines which normally never meet can be
 * wired together. These tests check that the couplings are real: that the
 * material decides how fast the biology runs, that the biology decides how the
 * circuit reads, and that the rules connecting them are explicit rather than
 * accidental.
 */

import { describe, expect, it } from 'vitest';
import { createTestRegistry } from './world';
import { createBioCircuit } from '../src/scenarios/biocircuit';
import { Simulation } from '../src/kernel/simulator';
import { ALL_COUPLINGS, findCoupling, interdisciplinaryChannels } from '../src/interactions/couplings';
import { validateExperiment } from '../src/kernel/validate';

const registry = createTestRegistry();

describe('the coupling catalogue', () => {
  it('names every pair of disciplines it connects', () => {
    expect(ALL_COUPLINGS.length).toBeGreaterThanOrEqual(5);
    for (const coupling of ALL_COUPLINGS) {
      expect(coupling.id).toBeTruthy();
      expect(coupling.chain.length).toBeGreaterThan(20);
      expect(coupling.disciplines.length).toBeGreaterThanOrEqual(2);
      expect(coupling.rules.length).toBeGreaterThan(0);
    }
  });

  it('finds a coupling for every discipline pair the product uses', () => {
    expect(findCoupling('biology', 'electronics')).toBeDefined();
    expect(findCoupling('materials', 'biology')).toBeDefined();
    expect(findCoupling('biology', 'materials')).toBeDefined();
    expect(findCoupling('materials', 'electronics')).toBeDefined();
  });

  it('lists the channels that cross a discipline boundary', () => {
    const channels = interdisciplinaryChannels();
    expect(channels).toContain('moisture');
    expect(channels).toContain('nutrient');
    expect(channels).toContain('signal');
  });
});

describe('materials decide how the biology runs', () => {
  it('makes the medium\'s drainage set the pace of the whole experiment', () => {
    const run = (substrate: 'sandy' | 'clay') =>
      new Simulation(createBioCircuit({ substrate }), registry).run();

    const sandy = run('sandy').dataPoints.at(-1)!.values['substrate.moisture']!.value;
    const clay = run('clay').dataPoints.at(-1)!.values['substrate.moisture']!.value;

    // Clay holds water; sand drains. The coupling is what makes this true.
    expect(clay).toBeGreaterThan(sandy);
  });

  it('makes the plant draw the medium down as it grows', () => {
    const result = new Simulation(createBioCircuit({ substrate: 'sandy' }), registry).run();
    const points = result.dataPoints;

    const firstBiomass = points[0]!.values['plant.biomass']!.value;
    const lastBiomass = points.at(-1)!.values['plant.biomass']!.value;
    const firstMoisture = points[0]!.values['substrate.moisture']!.value;
    const lastMoisture = points.at(-1)!.values['substrate.moisture']!.value;

    // The plant grows, and the medium dries because the plant is alive.
    expect(lastBiomass).toBeGreaterThan(firstBiomass);
    expect(lastMoisture).toBeLessThan(firstMoisture);
  });

  it('closes the loop: the plant gives water back to the medium', () => {
    const result = new Simulation(createBioCircuit({ substrate: 'sandy' }), registry).run();
    const last = result.dataPoints.at(-1)!.values;

    // Transpiration is the plant's contribution to the medium's loss.
    expect(last['plant.transpiration']!.value).toBeGreaterThan(0);
  });
});

describe('biology decides how the circuit reads', () => {
  it('moves the circuit reading as the medium dries', () => {
    const result = new Simulation(createBioCircuit({ substrate: 'sandy' }), registry).run();
    const points = result.dataPoints;

    const firstSignal = points[0]!.values['sensor.signal']!.value;
    const lastSignal = points.at(-1)!.values['sensor.signal']!.value;

    // Wet at the start, dry at the end: the reading falls.
    expect(firstSignal).toBeGreaterThan(0.8);
    expect(lastSignal).toBeLessThan(firstSignal);
  });

  it('drives the probe\'s resistance from the medium\'s state', () => {
    const result = new Simulation(createBioCircuit({ substrate: 'sandy' }), registry).run();
    const points = result.dataPoints;

    const firstResistance = points[0]!.values['sensor.resistance']!.value;
    const lastResistance = points.at(-1)!.values['sensor.resistance']!.value;

    // A resistive probe conducts better when wet.
    expect(lastResistance).toBeGreaterThan(firstResistance);
  });
});

describe('cross-discipline connections are governed by explicit rules', () => {
  it('rejects a connection no rule sanctions', () => {
    const experiment = createBioCircuit();
    const tampered = {
      ...experiment,
      connections: [
        ...experiment.connections,
        {
          id: 'c-nonsense',
          source: { componentId: 'nutrients', portId: 'availability' },
          target: { componentId: 'alert', portId: 'anode' },
          channel: 'nutrient' as const,
          transfer: { kind: 'identity' as const },
        },
      ],
    };

    const result = validateExperiment(tampered, registry);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'no-interdisciplinary-rule')).toBe(true);
  });

  it('accepts every connection the flagship declares', () => {
    const result = validateExperiment(createBioCircuit(), registry);
    expect(result.issues.filter((i) => i.severity === 'error')).toEqual([]);
  });

  it('uses the more specific rule when several could match', () => {
    // The substrate's moisture reaches the sensor as a normalised signal. The
    // generic materials-to-biology rule does not apply, so the explicit
    // materials-to-electronics coupling must be the one that governs.
    const coupling = findCoupling('materials', 'electronics');
    expect(coupling).toBeDefined();
    expect(
      coupling!.rules.some((r) => r.sourceChannel === 'moisture' && r.targetChannel === 'signal'),
    ).toBe(true);
  });
});

describe('the nutrient reservoir is a real coupling', () => {
  const REGENERATION = 0.003;
  const CAPACITY = 1;

  it('is actually drawn down by the plant', () => {
    const result = new Simulation(createBioCircuit({ substrate: 'sandy' }), registry).run();
    const points = result.dataPoints;

    const first = points[0]!.values['nutrients.availability']!.value;
    const last = points.at(-1)!.values['nutrients.availability']!.value;

    // A reservoir that never falls is a reservoir the plant does not drink
    // from, which is the bug this test was written for.
    expect(last).toBeLessThan(first);
    expect(last).toBeCloseTo(0.9253, 3);
  });

  it('treats the plant\'s demand as a rate, not as a step', () => {
    // The contract, exactly: over one step the reservoir gives back its
    // regeneration and loses the plant's demand multiplied by the length of
    // the step. If the demand were a step's growth instead of a rate, this
    // would not balance.
    const experiment = createBioCircuit({ substrate: 'sandy' });
    const simulation = new Simulation(experiment, registry);
    simulation.run({ maxSteps: 60 });

    const before = simulation.snapshot();
    const stored = (before.components['nutrients'] as { stored?: number }).stored ?? NaN;
    const demand = before.outputs['plant']!['nutrientDemand']!.value;
    expect(demand).toBeGreaterThan(0);

    simulation.run({ maxSteps: 1 });
    const after = (simulation.snapshot().components['nutrients'] as { stored?: number }).stored ?? NaN;

    const days = experiment.dt / 86400;
    const expected = stored - demand * days + REGENERATION * CAPACITY * days;
    expect(after).toBeCloseTo(expected, 10);
  });

  it('leaves the plant short of nutrients long after it is short of water', () => {
    const result = new Simulation(createBioCircuit({ substrate: 'sandy' }), registry).run();
    const last = result.dataPoints.at(-1)!.values;

    // The plant's nutrient response has a plateau between a tenth and nine
    // tenths. The reservoir never falls below nine tenths in the flagship, so
    // nutrients never touch the growth and water sets the pace.
    expect(last['nutrients.availability']!.value).toBeGreaterThan(0.9);
    expect(last['substrate.moisture']!.value).toBeLessThan(0.1);
  });
});
