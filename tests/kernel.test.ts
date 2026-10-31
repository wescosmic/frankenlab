/**
 * FrankenLab — kernel tests.
 *
 * These cover the guarantees the rest of the product depends on: determinism,
 * unit discipline, connection validation, and the refusal to run an invalid
 * experiment.
 */

import { describe, expect, it } from 'vitest';
import { createTestRegistry } from './world';
import { createBioCircuit } from '../src/scenarios/biocircuit';
import { Simulation, createSeededRandom } from '../src/kernel/simulator';
import { validateExperiment, explainValidation } from '../src/kernel/validate';
import { convert, areCompatible, formatQuantity, quantity } from '../src/kernel/units';
import type { ExperimentDefinition } from '../src/kernel/types';

describe('units', () => {
  it('converts between compatible units', () => {
    expect(convert(quantity(1, 'V'), 'mV').value).toBeCloseTo(1000);
    expect(convert(quantity(1000, 'mV'), 'V').value).toBeCloseTo(1);
    expect(convert(quantity(1, 'kohm'), 'ohm').value).toBeCloseTo(1000);
  });

  it('converts temperature with its affine offset', () => {
    expect(convert(quantity(0, 'degC'), 'K').value).toBeCloseTo(273.15);
    expect(convert(quantity(273.15, 'K'), 'degC').value).toBeCloseTo(0);
    expect(convert(quantity(212, 'degF'), 'degC').value).toBeCloseTo(100);
  });

  it('refuses to convert between incompatible dimensions', () => {
    expect(() => convert(quantity(1, 'V'), 'g')).toThrow(/incompatible/i);
    expect(areCompatible('V', 'mV')).toBe(true);
    expect(areCompatible('V', 'A')).toBe(false);
  });

  it('formats quantities with their unit symbol', () => {
    expect(formatQuantity(quantity(1.5, 'V'))).toBe('1.50 V');
    expect(formatQuantity(quantity(3, 'ratio'))).toBe('3');
  });
});

describe('determinism', () => {
  it('produces a seeded random sequence that repeats', () => {
    const a = createSeededRandom(42);
    const b = createSeededRandom(42);
    const first = [a(), a(), a()];
    const second = [b(), b(), b()];
    expect(first).toEqual(second);
  });

  it('produces different sequences for different seeds', () => {
    const a = createSeededRandom(1);
    const b = createSeededRandom(2);
    expect(a()).not.toBe(b());
  });

  it('runs the same experiment twice with identical results', () => {
    const registry = createTestRegistry();
    const experiment = createBioCircuit();

    const first = new Simulation(experiment, registry).run();
    const second = new Simulation(experiment, registry).run();

    expect(first.steps).toBe(second.steps);
    expect(first.seed).toBe(second.seed);
    expect(first.measurements).toEqual(second.measurements);
    expect(first.dataPoints.length).toBe(second.dataPoints.length);
    expect(first.dataPoints[0]).toEqual(second.dataPoints[0]);
    expect(first.dataPoints.at(-1)).toEqual(second.dataPoints.at(-1));
  });

  it('produces different results for different seeds', () => {
    const registry = createTestRegistry();
    const a = new Simulation(createBioCircuit({ seed: 1 }), registry).run();
    const b = new Simulation(createBioCircuit({ seed: 2 }), registry).run();
    // The seed drives the stochastic parts of the models.
    expect(a.seed).not.toBe(b.seed);
  });
});

describe('BioCircuit validation', () => {
  it('accepts the flagship experiment as valid', () => {
    const registry = createTestRegistry();
    const result = validateExperiment(createBioCircuit(), registry);
    expect(result.issues.filter((i) => i.severity === 'error')).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('rejects a connection with no defined transfer', () => {
    const registry = createTestRegistry();
    const experiment = createBioCircuit();
    const tampered: ExperimentDefinition = {
      ...experiment,
      connections: [
        ...experiment.connections,
        {
          id: 'c-bad',
          source: { componentId: 'battery', portId: 'positive' },
          target: { componentId: 'plant', portId: 'water' },
          channel: 'electrical-potential',
          transfer: { kind: 'identity' },
        },
      ],
    };

    const result = validateExperiment(tampered, registry);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'no-interdisciplinary-rule')).toBe(true);
  });

  it('rejects a parameter outside its declared range', () => {
    const registry = createTestRegistry();
    const experiment = createBioCircuit();
    const tampered: ExperimentDefinition = {
      ...experiment,
      components: experiment.components.map((c) =>
        c.id === 'divider'
          ? {
              ...c,
              parameters: { ...c.parameters, resistance: { value: -5, unit: 'ohm' } },
            }
          : c,
      ),
    };

    const result = validateExperiment(tampered, registry);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'parameter-below-range')).toBe(true);
  });

  it('rejects a dangling connection', () => {
    const registry = createTestRegistry();
    const experiment = createBioCircuit();
    const tampered: ExperimentDefinition = {
      ...experiment,
      connections: [
        ...experiment.connections,
        {
          id: 'c-ghost',
          source: { componentId: 'does-not-exist', portId: 'positive' },
          target: { componentId: 'alert', portId: 'anode' },
          channel: 'electrical-potential',
          transfer: { kind: 'identity' },
        },
      ],
    };

    const result = validateExperiment(tampered, registry);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'connection-dangling')).toBe(true);
  });

  it('refuses to simulate an invalid experiment', () => {
    const registry = createTestRegistry();
    const experiment = createBioCircuit();
    const tampered: ExperimentDefinition = {
      ...experiment,
      duration: 0,
    };

    expect(() => new Simulation(tampered, registry)).toThrow(/cannot run/i);
  });

  it('explains validation issues in plain language', () => {
    const registry = createTestRegistry();
    const experiment = createBioCircuit();
    const tampered: ExperimentDefinition = { ...experiment, duration: -1 };
    const result = validateExperiment(tampered, registry);
    const text = explainValidation(result);
    expect(text).toMatch(/blocking problem/i);
    expect(text).toMatch(/duration/i);
  });
});

describe('BioCircuit simulation', () => {
  it('runs the full fourteen-day experiment', () => {
    const registry = createTestRegistry();
    const result = new Simulation(createBioCircuit(), registry).run();
    expect(result.success).toBe(true);
    expect(result.steps).toBe(336); // 14 days at one-hour steps
    expect(result.measurements['plant.biomass']).toBeDefined();
    expect(result.measurements['substrate.moisture']).toBeDefined();
    expect(result.measurements['comparator.decision']).toBeDefined();
  });

  it('keeps every reported measurement inside 0–1 for normalised signals', () => {
    const registry = createTestRegistry();
    const result = new Simulation(createBioCircuit(), registry).run();

    for (const key of ['plant.biomass', 'plant.health', 'substrate.moisture']) {
      const value = result.measurements[key];
      expect(value, key).toBeDefined();
      expect(value!.value, key).toBeGreaterThanOrEqual(0);
      expect(value!.value, key).toBeLessThanOrEqual(1);
    }
  });

  it('shows the plant growing over the run', () => {
    const registry = createTestRegistry();
    const result = new Simulation(createBioCircuit(), registry).run();
    const first = result.dataPoints[0]!;
    const last = result.dataPoints.at(-1)!;
    expect(last.values['plant.biomass']!.value).toBeGreaterThan(first.values['plant.biomass']!.value);
  });

  it('shows the substrate drying as the plant draws water', () => {
    const registry = createTestRegistry();
    const result = new Simulation(createBioCircuit(), registry).run();
    const first = result.dataPoints[0]!;
    const last = result.dataPoints.at(-1)!;
    expect(last.values['substrate.moisture']!.value).toBeLessThan(
      first.values['substrate.moisture']!.value,
    );
  });

  it('produces different moisture curves for different substrates', () => {
    const registry = createTestRegistry();
    const sandy = new Simulation(createBioCircuit({ substrate: 'sandy' }), registry).run();
    const clay = new Simulation(createBioCircuit({ substrate: 'clay' }), registry).run();

    const sandyEnd = sandy.dataPoints.at(-1)!.values['substrate.moisture']!.value;
    const clayEnd = clay.dataPoints.at(-1)!.values['substrate.moisture']!.value;

    // Clay holds water better than sand — that is the whole point of the demo.
    expect(clayEnd).toBeGreaterThan(sandyEnd);
  });
});
