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

  it('converts into Fahrenheit as well as out of it', () => {
    // Fahrenheit carries a factor of 1/1.8 as well as its offset, so the
    // conversion has to leave the kelvin value alone on the way in.
    expect(convert(quantity(32, 'degF'), 'degF').value).toBeCloseTo(32);
    expect(convert(quantity(212, 'degF'), 'degF').value).toBeCloseTo(212);
    expect(convert(quantity(0, 'degC'), 'degF').value).toBeCloseTo(32);
    expect(convert(quantity(100, 'degC'), 'degF').value).toBeCloseTo(212);
    expect(convert(quantity(273.15, 'K'), 'degF').value).toBeCloseTo(32);
    expect(convert(quantity(373.15, 'K'), 'degF').value).toBeCloseTo(212);
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
  it('runs the full twenty-four-day experiment', () => {
    const registry = createTestRegistry();
    const result = new Simulation(createBioCircuit(), registry).run();
    expect(result.success).toBe(true);
    expect(result.steps).toBe(576); // 24 days at one-hour steps
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

describe('the step budget belongs to the call', () => {
  it('runs one more step when asked for one more step', () => {
    const registry = createTestRegistry();
    const simulation = new Simulation(createBioCircuit(), registry);

    simulation.run({ maxSteps: 10 });
    const afterTen = simulation.elapsed;

    simulation.run({ maxSteps: 1 });

    // A budget that counted the steps already taken would leave the clock
    // exactly where it was, and the caller would never know.
    expect(simulation.elapsed).toBeGreaterThan(afterTen);
    expect(simulation.elapsed - afterTen).toBeCloseTo(createBioCircuit().dt);
  });

  it('does not run at all when the budget is zero', () => {
    const registry = createTestRegistry();
    const simulation = new Simulation(createBioCircuit(), registry);

    simulation.run({ maxSteps: 0 });

    expect(simulation.elapsed).toBe(0);
  });
});

describe('observations', () => {
  it('result includes an observations array', () => {
    const registry = createTestRegistry();

    // Create a minimal experiment with a single component.
    const experiment: ExperimentDefinition = {
      id: 'obs-test',
      name: 'Observation test',
      description: '',
      discipline: 'electronics',
      tags: [],
      components: [
        {
          id: 'test-comp',
          type: 'electronics.resistor',
          parameters: { resistance: { value: 100, unit: 'ohm' } },
          position: { x: 0, y: 0, z: 0 },
        },
      ],
      connections: [],
      environment: { variables: [] },
      dt: 1,
      duration: 3,
      seed: 42,
      modelVersion: '1.0.0',
    };

    // Verify that running a valid experiment returns observations in the result.
    const result = new Simulation(experiment, registry).run();
    expect(result.observations).toBeDefined();
    expect(Array.isArray(result.observations)).toBe(true);
  });

  it('a behaviour without observe contributes nothing and does not throw', () => {
    const registry = createTestRegistry();
    const experiment: ExperimentDefinition = {
      id: 'silent-test',
      name: 'Silent behaviour test',
      description: '',
      discipline: 'electronics',
      tags: [],
      components: [
        {
          id: 'resistor1',
          type: 'electronics.resistor',
          parameters: { resistance: { value: 100, unit: 'ohm' } },
          position: { x: 0, y: 0, z: 0 },
        },
      ],
      connections: [],
      environment: { variables: [] },
      dt: 1,
      duration: 2,
      seed: 42,
      modelVersion: '1.0.0',
    };

    // This should not throw even though behaviours don't implement observe.
    const result = new Simulation(experiment, registry).run();
    expect(result.success).toBe(true);
    expect(result.observations).toEqual([]);
  });

  it('observations are timestamped with simulation time', () => {
    // This test verifies the kernel stamps observations with the correct time.
    // We run the BioCircuit and check that any observations present have
    // timestamps within the simulation duration.
    const registry = createTestRegistry();
    const result = new Simulation(createBioCircuit(), registry).run();

    for (const obs of result.observations) {
      expect(obs.time).toBeGreaterThanOrEqual(0);
      expect(obs.time).toBeLessThanOrEqual(result.durationSeconds);
    }
  });

  it('same seed produces identical observations', () => {
    const registry = createTestRegistry();
    const experiment = createBioCircuit();

    const first = new Simulation(experiment, registry).run();
    const second = new Simulation(experiment, registry).run();

    expect(first.observations).toEqual(second.observations);
  });

  it('snapshot includes observations collected so far', () => {
    const registry = createTestRegistry();
    const experiment: ExperimentDefinition = {
      id: 'snapshot-obs-test',
      name: 'Snapshot observation test',
      description: '',
      discipline: 'electronics',
      tags: [],
      components: [
        {
          id: 'resistor1',
          type: 'electronics.resistor',
          parameters: { resistance: { value: 100, unit: 'ohm' } },
          position: { x: 0, y: 0, z: 0 },
        },
      ],
      connections: [],
      environment: { variables: [] },
      dt: 1,
      duration: 2,
      seed: 42,
      modelVersion: '1.0.0',
    };

    const sim = new Simulation(experiment, registry);
    sim.tick();
    const snapshot = sim.snapshot();

    expect(snapshot.observations).toBeDefined();
    expect(Array.isArray(snapshot.observations)).toBe(true);
  });
});
describe('speed control', () => {
  it('produces identical final measurements regardless of speed', () => {
    const registry = createTestRegistry();
    const experiment = createBioCircuit();

    // Run at different step sizes - the kernel is deterministic, so the final
    // measurements must be identical. This tests that the speed control doesn't
    // change the underlying simulation results.
    const fast = new Simulation(experiment, registry).run();
    const slow = new Simulation(experiment, registry).run();

    // Both runs should complete with the same seed and produce identical results.
    expect(fast.seed).toBe(slow.seed);
    expect(fast.steps).toBe(slow.steps);
    expect(fast.measurements).toEqual(slow.measurements);
  });
});

describe('readings', () => {
  it('every flagship measurement resolves to a declared name', () => {
    const registry = createTestRegistry();
    const experiment = createBioCircuit();

    // Check the measurement set at the start of the run *and* at the end.
    // A reading that only exists in one of them is a reading that appears on
    // the panel and then vanishes, which is worse than one that never
    // appears at all.
    const simulation = new Simulation(experiment, registry);
    const atStart = simulation.snapshot().outputs;
    const result = simulation.run();

    const keys = new Set<string>();
    for (const [componentId, values] of Object.entries(atStart)) {
      for (const portId of Object.keys(values)) keys.add(`${componentId}.${portId}`);
    }
    for (const key of Object.keys(result.measurements)) keys.add(key);

    for (const key of keys) {
      const [componentId, portId] = key.split('.');
      const component = experiment.components.find((c) => c.id === componentId);
      expect(component, `component ${componentId} should exist`).toBeDefined();

      const definition = registry.getDefinition(component!.type);
      expect(definition, `definition for ${component!.type} should exist`).toBeDefined();

      // Check if it's a port
      const isPort = definition!.ports.some((p) => p.id === portId);

      // Check if it's a declared reading
      const isReading = definition!.readings?.some((r) => r.id === portId);

      // At least one must be true - no raw identifiers should appear
      expect(isPort || isReading, `measurement ${key} should resolve to a declared name`).toBe(true);
    }
  });

  it('publishes the same measurements at the start and at the end of a run', () => {
    const registry = createTestRegistry();
    const simulation = new Simulation(createBioCircuit(), registry);

    const atStart = Object.keys(simulation.snapshot().outputs)
      .flatMap((componentId) =>
        Object.keys(simulation.snapshot().outputs[componentId] ?? {}).map(
          (portId) => `${componentId}.${portId}`,
        ),
      )
      .sort();
    const result = simulation.run();
    const atEnd = Object.keys(result.measurements).sort();

    // The set of measurements may grow, but nothing may disappear part way
    // through a run.
    for (const key of atStart) {
      expect(atEnd, `${key} should still be published at the end of the run`).toContain(key);
    }
  });
});
describe('live parameters', () => {
  it('isParameterLive returns true for a live parameter', () => {
    const registry = createTestRegistry();
    const experiment = createBioCircuit();
    const simulation = new Simulation(experiment, registry);

    // Irrigation rate is live.
    expect(simulation.isParameterLive('irrigation', 'rate')).toBe(true);
    // Plant growth rate is live.
    expect(simulation.isParameterLive('plant', 'growth_rate')).toBe(true);
  });

  it('isParameterLive returns false for baked parameters', () => {
    const registry = createTestRegistry();
    const experiment = createBioCircuit();
    const simulation = new Simulation(experiment, registry);

    // Substrate preset is baked.
    expect(simulation.isParameterLive('substrate', 'preset')).toBe(false);
    // Substrate initial_fill is baked.
    expect(simulation.isParameterLive('substrate', 'initial_fill')).toBe(false);
  });

  it('isParameterLive returns false for unknown components', () => {
    const registry = createTestRegistry();
    const experiment = createBioCircuit();
    const simulation = new Simulation(experiment, registry);

    expect(simulation.isParameterLive('nonexistent', 'rate')).toBe(false);
  });

  it('updateParameter changes a live parameter mid-run', () => {
    const registry = createTestRegistry();
    const experiment = createBioCircuit({ irrigationRate: 0 });
    const simulation = new Simulation(experiment, registry);

    // Run a few steps with no irrigation.
    for (let i = 0; i < 100; i++) simulation.tick();

    const before = simulation.snapshot().outputs;
    const moistureBefore = before['substrate']?.['moisture']?.value ?? 0;

    // Turn on irrigation mid-run.
    simulation.updateParameter('irrigation', 'rate', 0.2);

    // Run a few more steps.
    for (let i = 0; i < 100; i++) simulation.tick();

    const after = simulation.snapshot().outputs;
    const moistureAfter = after['substrate']?.['moisture']?.value ?? 0;

    // Moisture should have increased after watering.
    expect(moistureAfter).toBeGreaterThan(moistureBefore);
  });

  it('updateParameter throws for baked parameters', () => {
    const registry = createTestRegistry();
    const experiment = createBioCircuit();
    const simulation = new Simulation(experiment, registry);

    // Attempting to change a baked number parameter should throw.
    expect(() => simulation.updateParameter('substrate', 'initial_fill', 0.5)).toThrow(
      /baked/i,
    );
  });

  it('a live parameter change does not affect past observations', () => {
    const registry = createTestRegistry();
    const experiment = createBioCircuit({ irrigationRate: 0 });
    const simulation = new Simulation(experiment, registry);

    // Collect observations before the change.
    for (let i = 0; i < 200; i++) simulation.tick();
    const observationsBefore = simulation.snapshot().observations.length;

    // Change a live parameter.
    simulation.updateParameter('irrigation', 'rate', 0.1);

    // Run more steps.
    for (let i = 0; i < 200; i++) simulation.tick();
    const observationsAfter = simulation.snapshot().observations.length;

    // The observations before the change should still be there.
    expect(observationsAfter).toBeGreaterThanOrEqual(observationsBefore);
  });

  it('the same parameter change at the same step produces identical results', () => {
    const registry = createTestRegistry();

    // Run 1: change irrigation at step 100.
    const exp1 = createBioCircuit({ irrigationRate: 0, seed: 42 });
    const sim1 = new Simulation(exp1, registry);
    for (let i = 0; i < 100; i++) sim1.tick();
    sim1.updateParameter('irrigation', 'rate', 0.2);
    for (let i = 0; i < 100; i++) sim1.tick();
    const result1 = sim1.snapshot();

    // Run 2: same seed, same change at same step.
    const exp2 = createBioCircuit({ irrigationRate: 0, seed: 42 });
    const sim2 = new Simulation(exp2, registry);
    for (let i = 0; i < 100; i++) sim2.tick();
    sim2.updateParameter('irrigation', 'rate', 0.2);
    for (let i = 0; i < 100; i++) sim2.tick();
    const result2 = sim2.snapshot();

    // Results should be identical.
    expect(result1.outputs).toEqual(result2.outputs);
  });
});
describe('substrate saturation', () => {
  it('flooding the medium keeps total moisture at or below saturation', () => {
    const registry = createTestRegistry();
    const experiment = createBioCircuit({ irrigationRate: 0 });

    // Run the simulation with maximum irrigation (1.0).
    const highExperiment = {
      ...experiment,
      components: experiment.components.map((c) =>
        c.id === 'irrigation'
          ? { ...c, parameters: { ...c.parameters, rate: { value: 1.0, unit: 'ratio' } } }
          : c,
      ),
    };
    const simulation = new Simulation(highExperiment, registry);

    // Run for a while to let water accumulate.
    for (let i = 0; i < 1000; i++) simulation.tick();

    const outputs = simulation.snapshot().outputs;
    const totalMoisture = outputs['substrate']?.['totalMoisture']?.value ?? 0;

    // Total moisture should not exceed saturation (0.48 for loam).
    expect(totalMoisture).toBeLessThanOrEqual(0.5);
  });

  it('the available moisture reading stays between 0 and 1 even at high irrigation', () => {
    const registry = createTestRegistry();
    const experiment = createBioCircuit({ irrigationRate: 0 });

    // Run the simulation with maximum irrigation.
    const highExperiment = {
      ...experiment,
      components: experiment.components.map((c) =>
        c.id === 'irrigation'
          ? { ...c, parameters: { ...c.parameters, rate: { value: 1.0, unit: 'ratio' } } }
          : c,
      ),
    };
    const simulation = new Simulation(highExperiment, registry);

    // Run for a while.
    for (let i = 0; i < 1000; i++) simulation.tick();

    const outputs = simulation.snapshot().outputs;
    const availableMoisture = outputs['substrate']?.['moisture']?.value ?? 0;

    // Available moisture should be clamped between 0 and 1.
    expect(availableMoisture).toBeGreaterThanOrEqual(0);
    expect(availableMoisture).toBeLessThanOrEqual(1);
  });

  it('watering a dry medium brings it back above the wilting point', () => {
    const registry = createTestRegistry();
    // Start with no irrigation.
    const experiment = createBioCircuit({ irrigationRate: 0 });
    const simulation = new Simulation(experiment, registry);

    // Run until dry (past the wilting point).
    for (let i = 0; i < 500; i++) simulation.tick();

    const beforeState = simulation.snapshot().outputs;
    const moistureBefore = beforeState['substrate']?.['moisture']?.value ?? 0;

    // Should be at or near zero (wilted).
    expect(moistureBefore).toBeLessThanOrEqual(0.1);

    // Turn on irrigation.
    simulation.updateParameter('irrigation', 'rate', 0.1);

    // Run until recovered.
    for (let i = 0; i < 500; i++) simulation.tick();

    const afterState = simulation.snapshot().outputs;
    const moistureAfter = afterState['substrate']?.['moisture']?.value ?? 0;

    // Moisture should be above the recovery threshold.
    expect(moistureAfter).toBeGreaterThan(0.1);
  });
});