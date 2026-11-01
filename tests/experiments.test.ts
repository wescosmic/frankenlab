import { describe, expect, it } from 'vitest';
import { Simulation } from '@/kernel/simulator';
import { createWorld } from '@/world';
import { createCatalysis } from '@/scenarios/catalysis';
import { createThresholdAlarm } from '@/scenarios/threshold-alarm';
import { EXPERIMENTS, findExperiment } from '@/scenarios';
import { useLabStore } from '@/state/lab';

const registry = createWorld();

/** The product concentration in a vessel at the end of a run. */
function finalProduct(experiment: ReturnType<typeof createCatalysis>, vesselId: string): number {
  const result = new Simulation(experiment, registry).run();
  return result.measurements[`${vesselId}.product`]?.value ?? 0;
}

/** The step at which a vessel first gets within one per cent of its final product. */
function stepsToSettle(experiment: ReturnType<typeof createCatalysis>, vesselId: string): number {
  const simulation = new Simulation(experiment, registry);
  const total = simulation.run().steps;
  const final = finalProduct(experiment, vesselId);

  const fresh = new Simulation(experiment, registry);
  for (let step = 1; step <= total; step++) {
    fresh.tick();
    const product = fresh.snapshot().outputs[vesselId]?.['product']?.value ?? 0;
    if (product >= final * 0.99) return step;
  }
  return total;
}

describe('A catalyst changes the speed, not the destination', () => {
  it('brings the reaction to the same equilibrium with or without one', () => {
    const plain = finalProduct(createCatalysis({ catalyst: 1 }), 'plain');
    const catalysed = finalProduct(createCatalysis({ catalyst: 8 }), 'catalysed');

    expect(plain).toBeGreaterThan(0);
    // The two vessels must agree. If they do not, the catalyst is moving the
    // equilibrium, which is the one thing a catalyst may never do.
    expect(Math.abs(plain - catalysed)).toBeLessThan(plain * 0.02);
  });

  it('gets there sooner', () => {
    const plainSteps = stepsToSettle(createCatalysis({ catalyst: 1 }), 'plain');
    const catalysedSteps = stepsToSettle(createCatalysis({ catalyst: 8 }), 'catalysed');
    expect(catalysedSteps).toBeLessThan(plainSteps);
  });

  it('leaves the conservation check exact', () => {
    const result = new Simulation(createCatalysis(), registry).run();
    for (const vesselId of ['plain', 'catalysed']) {
      const balance = result.measurements[`${vesselId}.stoichiometric_balance`]?.value ?? 0;
      // A + C, where the mixture started at one mole per litre of A.
      expect(balance).toBeCloseTo(1, 6);
    }
  });

  it('reports that the reaction reached equilibrium', () => {
    const result = new Simulation(createCatalysis(), registry).run();
    const codes = result.observations.map((observation) => observation.code);
    expect(codes).toContain('chemistry.equilibrium');
  });
});

describe('The catalogue of experiments', () => {
  it('lists three experiments', () => {
    expect(EXPERIMENTS.length).toBeGreaterThanOrEqual(3);
    expect(new Set(EXPERIMENTS.map((entry) => entry.id)).size).toBe(EXPERIMENTS.length);
  });

  it.each(EXPERIMENTS.map((entry) => [entry.name, entry] as const))(
    'runs %s end to end and publishes readings',
    (_name, entry) => {
      const result = new Simulation(entry.create(), registry).run();
      expect(result.success).toBe(true);
      expect(result.steps).toBeGreaterThan(0);
      expect(Object.keys(result.measurements).length).toBeGreaterThan(0);
    },
  );

  it('opens the flagship by default', () => {
    expect(findExperiment('biocircuit')).toBeDefined();
    expect(findExperiment('nonsense')).toBeUndefined();
  });

  it('rebuilds the bench when the user opens a different experiment', () => {
    const store = useLabStore.getState();
    store.loadExperiment('catalysis');
    expect(useLabStore.getState().experiment.id).toBe('catalysis');
    expect(useLabStore.getState().experiment.components.length).toBe(2);

    store.loadExperiment('threshold-alarm');
    expect(useLabStore.getState().experiment.id).toBe('threshold-alarm');
    expect(useLabStore.getState().experiment.components.length).toBe(5);

    store.loadExperiment('biocircuit');
    expect(useLabStore.getState().experiment.id).toBe('biocircuit');
  });

  it('says so when the experiment does not exist', () => {
    useLabStore.getState().loadExperiment('nonsense');
    expect(useLabStore.getState().notice).toMatch(/no experiment/i);
  });
});

describe('The threshold alarm', () => {
  it('trips the alarm at its default operating point', () => {
    const result = new Simulation(createThresholdAlarm(), registry).run();
    expect(result.measurements['comparator.decision']?.value).toBeGreaterThan(0.5);
    // The LED is wired to the comparator, so the decision has to reach it.
    expect(result.measurements['alert.brightness']?.value).toBeGreaterThan(0.5);
  });

  it('moves the operating point when the reference resistance changes', () => {
    const low = new Simulation(createThresholdAlarm({ referenceResistance: 1_000 }), registry).run();
    const high = new Simulation(createThresholdAlarm({ referenceResistance: 100_000 }), registry).run();
    const lowSignal = low.measurements['probe.signal']?.value ?? 0;
    const highSignal = high.measurements['probe.signal']?.value ?? 0;
    expect(lowSignal).not.toBeCloseTo(highSignal, 3);
  });

  it('goes quiet when the divider drops below the threshold', () => {
    // A 10 kOhm reference against a 40 kOhm probe puts the tap at 0.2, below
    // the 0.4 threshold, so the alarm must not be on.
    const result = new Simulation(createThresholdAlarm({ referenceResistance: 10_000 }), registry).run();
    expect(result.measurements['probe.signal']?.value).toBeCloseTo(0.2, 6);
    expect(result.measurements['comparator.decision']?.value).toBe(0);
    expect(result.measurements['alert.brightness']?.value).toBe(0);
  });
});
