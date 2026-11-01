/**
 * FrankenLab — observation tests.
 *
 * An observation is a *moment*, not a state. The tests here check the three
 * things that make a run worth watching:
 *
 *   1. the flagship actually produces a story, in the order it happened;
 *   2. a crossing is reported once, not on every tick afterwards;
 *   3. the same experiment and the same seed produce the same observations.
 *
 * They also check that the observation thresholds are thresholds this model
 * can actually reach. An event that can never fire is not an event.
 */

import { describe, expect, it } from 'vitest';
import { createTestRegistry } from './world';
import { createBioCircuit, BIOCIRCUIT_MEASURED_DAYS } from '../src/scenarios/biocircuit';
import { Simulation } from '../src/kernel/simulator';
import { substrateBehavior, type SubstrateState } from '../src/engines/materials/engine';
import type { Quantity, StepContext } from '../src/kernel/types';
import { quantity } from '../src/kernel/units';

const registry = createTestRegistry();

function run(options: Parameters<typeof createBioCircuit>[0] = {}) {
  return new Simulation(createBioCircuit(options), registry).run();
}

function codes(result: { observations: readonly { code: string }[] }): string[] {
  return result.observations.map((o) => o.code);
}

describe('the flagship tells a story', () => {
  it('produces the narrative the demonstration is built on', () => {
    const result = run({ substrate: 'sandy' });

    // Planted, growing, drying out, alert triggered. The medium wilting and
    // the plant losing vigour are the last two beats.
    expect(codes(result)).toEqual([
      'electronics.alert_fired',
      'biology.growth_stalled',
      'materials.wilting',
    ]);
  });

  it('fires the beats on the days the documentation quotes', () => {
    // A test that asserts a shape is worth less than a test that asserts a
    // day. The README, the spec and the demo all quote these days, and they
    // are only true if the simulation still produces them.
    const result = run({ substrate: 'sandy' });
    const dayOf = (code: string): number => {
      const observation = result.observations.find((o) => o.code === code);
      if (!observation) return NaN;
      return observation.time / 86400;
    };

    expect(dayOf('electronics.alert_fired')).toBeCloseTo(BIOCIRCUIT_MEASURED_DAYS.alertFired, 1);
    expect(dayOf('biology.growth_stalled')).toBeCloseTo(BIOCIRCUIT_MEASURED_DAYS.growthStalled, 1);
    expect(dayOf('materials.wilting')).toBeCloseTo(BIOCIRCUIT_MEASURED_DAYS.mediumWilting, 1);
  });

  it('recovers on the days the demonstration says it does', () => {
    // The rescue: the medium wilts, the irrigation is turned up, and the
    // medium comes back. These are the days the demo's last beats narrate.
    const experiment = createBioCircuit({ substrate: 'sandy' });

    // Find the step the medium wilts on. This has to be a throwaway run: the
    // shipped experiment is twenty-four days long, so a run that goes past the
    // wilting has already reached the end of the story and cannot be rewound
    // to rescue it.
    const probe = new Simulation(experiment, registry).run();
    const wilted = probe.observations.find((o) => o.code === 'materials.wilting');
    expect(wilted, 'the medium never wilts in sand').toBeDefined();
    const wiltingStep = Math.ceil(wilted!.time / experiment.dt);

    // Now the demonstration's own sequence: run to the wilting, turn the
    // irrigation up, and resume.
    const simulation = new Simulation(experiment, registry);
    simulation.run({ maxSteps: wiltingStep + 1 });
    simulation.updateParameter('irrigation', 'rate', 0.05);
    const result = simulation.run();

    const dayOf = (code: string): number => {
      const observation = result.observations.find((o) => o.code === code);
      return observation ? observation.time / 86400 : NaN;
    };

    expect(dayOf('materials.recovered')).toBeCloseTo(BIOCIRCUIT_MEASURED_DAYS.mediumRecovered, 1);
    expect(dayOf('electronics.alert_cleared')).toBeCloseTo(BIOCIRCUIT_MEASURED_DAYS.alertCleared, 1);
  });

  it('tells the same story for loam, but later', () => {
    const sand = run({ substrate: 'sandy' });
    const loam = run({ substrate: 'loamy' });

    const sandAlert = sand.observations.find((o) => o.code === 'electronics.alert_fired')!;
    const loamAlert = loam.observations.find((o) => o.code === 'electronics.alert_fired')!;

    expect(loamAlert).toBeDefined();
    expect(loamAlert.time).toBeGreaterThan(sandAlert.time);
  });

  it('never fires the alert in a medium that holds its water', () => {
    expect(codes(run({ substrate: 'hydrogel' }))).not.toContain('electronics.alert_fired');
  });

  it('orders every observation by time', () => {
    for (const substrate of ['sandy', 'loamy', 'clay'] as const) {
      const times = run({ substrate }).observations.map((o) => o.time);
      expect(times.every((t, i) => i === 0 || t >= times[i - 1]!)).toBe(true);
    }
  });
});

describe('an observation marks a moment', () => {
  it('fires the alert observation on the day the comparator trips', () => {
    const result = run({ substrate: 'sandy' });
    const observation = result.observations.find((o) => o.code === 'electronics.alert_fired')!;

    const tripped = result.dataPoints.find(
      (point) => (point.values['comparator.decision']?.value ?? 0) > 0.5,
    )!;

    expect(observation).toBeDefined();
    expect(observation.time).toBe(tripped.time);
  });

  it('reports the alert once, not on every tick it stays on', () => {
    const result = run({ substrate: 'sandy' });

    const alerts = result.observations.filter((o) => o.code === 'electronics.alert_fired');
    expect(alerts).toHaveLength(1);

    // The alert stays lit for the rest of the run, and the timeline must not
    // repeat itself for every one of those hours.
    const stillLit = result.dataPoints.filter(
      (point) => (point.values['comparator.decision']?.value ?? 0) > 0.5,
    ).length;
    expect(stillLit).toBeGreaterThan(100);
  });

  it('reports the medium wilting once', () => {
    const result = run({ substrate: 'sandy' });
    expect(result.observations.filter((o) => o.code === 'materials.wilting')).toHaveLength(1);
  });

  it('gives every observation a plain-English message and a severity', () => {
    for (const observation of run({ substrate: 'sandy' }).observations) {
      expect(observation.message.length).toBeGreaterThanOrEqual(20);
      expect(observation.message.endsWith('.')).toBe(true);
      expect(['info', 'success', 'warning', 'error']).toContain(observation.severity);
      expect(observation.code).toMatch(/^[a-z]+\.[a-z_]+$/);
    }
  });

  it('stamps each observation with the component it came from', () => {
    const result = run({ substrate: 'sandy' });
    for (const observation of result.observations) {
      expect(observation.componentId).toBeTruthy();
      expect(
        result.observations.filter((o) => o.code === observation.code).length,
      ).toBeGreaterThan(0);
    }
  });
});

describe('observations are reproducible', () => {
  it('gives the same observations for the same seed', () => {
    const first = run({ substrate: 'sandy', seed: 4242 });
    const second = run({ substrate: 'sandy', seed: 4242 });

    expect(codes(first)).toEqual(codes(second));
    expect(first.observations.map((o) => o.time)).toEqual(second.observations.map((o) => o.time));
  });
});

/**
 * The medium's own behaviour, driven directly.
 *
 * The flagship cannot recover on its own: irrigation is a drip, and once the
 * medium is dry the drip is far too slow to refill it. Recovery is the user
 * turning the tap on, which is a later phase. The behaviour is tested here
 * directly so that the recovery event is known to work when the product grows
 * the action that reaches it.
 */
describe('the medium reports drying and recovery', () => {
  const DT = 3600;

  function context(time: number): StepContext {
    return {
      time,
      dt: DT,
      seed: 1,
      environment: {},
      random: () => 0.5,
      network: new Map(),
      componentId: 'substrate',
    };
  }

  function inputs(supply: number, uptake: number): Record<string, Quantity> {
    return {
      supply: quantity(supply, 'ratio'),
      uptake: quantity(uptake, 'ratio'),
    };
  }

  function start(): SubstrateState {
    return {
      freeWater: 0,
      boundWater: 0,
      outputs: {},
      __param_preset: 'sandy',
      __param_initial_fill: 1,
    } as unknown as SubstrateState;
  }

  it('reports the medium drying past the wilting point, once', () => {
    let state = start();
    let time = 0;
    const seen: string[] = [];

    // Draw the medium down. It starts at field capacity and has to lose
    // everything above the wilting point before it is wilted.
    for (let i = 0; i < 240; i++) {
      state = substrateBehavior.step(state, inputs(0, 0.05), context(time)) as SubstrateState;
      for (const observation of substrateBehavior.observe?.(state, context(time)) ?? []) {
        seen.push(observation.code);
      }
      time += DT;
    }

    expect(seen.filter((code) => code === 'materials.wilting')).toHaveLength(1);
  });

  it('reports the medium recovering once it is watered', () => {
    let state = start();
    let time = 0;
    const seen: string[] = [];

    // Dry it out.
    for (let i = 0; i < 240; i++) {
      state = substrateBehavior.step(state, inputs(0, 0.05), context(time)) as SubstrateState;
      for (const observation of substrateBehavior.observe?.(state, context(time)) ?? []) {
        seen.push(observation.code);
      }
      time += DT;
    }
    expect(seen).toContain('materials.wilting');

    // Now water it. The tap is an absolute rate, so this is a flood.
    for (let i = 0; i < 240; i++) {
      state = substrateBehavior.step(state, inputs(0.02, 0), context(time)) as SubstrateState;
      for (const observation of substrateBehavior.observe?.(state, context(time)) ?? []) {
        seen.push(observation.code);
      }
      time += DT;
    }

    expect(seen.filter((code) => code === 'materials.recovered')).toHaveLength(1);
  });

  it('does not flap when the medium sits on the threshold', () => {
    let state = start();
    let time = 0;
    const seen: string[] = [];

    // A trickle that keeps the medium hovering around the wilting point.
    for (let i = 0; i < 480; i++) {
      state = substrateBehavior.step(state, inputs(0.002, 0.05), context(time)) as SubstrateState;
      for (const observation of substrateBehavior.observe?.(state, context(time)) ?? []) {
        seen.push(observation.code);
      }
      time += DT;
    }

    // Whatever happens, the timeline must not contradict itself every hour.
    expect(seen.length).toBeLessThanOrEqual(2);
  });
});
