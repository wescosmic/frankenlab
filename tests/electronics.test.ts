/**
 * FrankenLab — electronics tests.
 *
 * These cover the claim the whole flagship rests on: the circuit is
 * load-bearing. The comparator must threshold a *solved* circuit quantity, so
 * changing a resistor has to change the reading, and changing the reading has
 * to change when the alert fires.
 *
 * If the electronics were decorative, every test here would fail.
 */

import { describe, expect, it } from 'vitest';
import { createTestRegistry } from './world';
import { createBioCircuit } from '../src/scenarios/biocircuit';
import { Simulation } from '../src/kernel/simulator';
import type { ExperimentDefinition } from '../src/kernel/types';

const registry = createTestRegistry();

function run(experiment: ExperimentDefinition = createBioCircuit()) {
  return new Simulation(experiment, registry).run();
}

/** Replace one numeric parameter on one component. */
function withParameter(
  experiment: ExperimentDefinition,
  componentId: string,
  parameterId: string,
  value: number,
): ExperimentDefinition {
  return {
    ...experiment,
    components: experiment.components.map((c) =>
      c.id === componentId
        ? { ...c, parameters: { ...c.parameters, [parameterId]: { value } } }
        : c,
    ),
  };
}

/** The day the alert first fires, or null if it never does. */
function firstAlertDay(result: ReturnType<typeof run>): number | null {
  const fired = result.dataPoints.find(
    (p) => (p.values['comparator.decision']?.value ?? 0) > 0.5,
  );
  return fired ? fired.time / 86400 : null;
}

describe('the voltage divider', () => {
  it('solves a real divider voltage rather than falling back to the sensed value', () => {
    const result = run();
    const first = result.dataPoints[0]!.values;

    // At t = 0 the medium is at field capacity, so the probe sits at its wet
    // calibration (1 kΩ) against a 10 kΩ reference resistor.
    const expected = 10_000 / (10_000 + 1_000);
    expect(first['sensor.signal']!.value).toBeCloseTo(expected, 6);
    expect(first['substrate.moisture']!.value).toBeCloseTo(1, 6);
  });

  it('obeys Ohm\'s law across the probe', () => {
    const result = run();
    const first = result.dataPoints[0]!.values;

    const voltage = first['sensor.voltage']!.value;
    const current = Math.abs(first['sensor.current']?.value ?? 0);
    const resistance = first['sensor.resistance']!.value;

    expect(resistance).toBeCloseTo(1_000, 3);
    expect(current).toBeCloseTo(voltage / resistance, 9);
  });

  it('drives the same current through the whole series loop', () => {
    const result = run();
    const first = result.dataPoints[0]!.values;

    // One loop: battery, probe, reference resistor. The same current flows
    // through all three.
    const source = Math.abs(first['battery.current']!.value);
    const probe = Math.abs(first['sensor.current']!.value);

    expect(probe).toBeCloseTo(source, 9);
    // 5 V across 11 kΩ.
    expect(source).toBeCloseTo(5 / 11_000, 9);
  });

  it('scales the solved voltage with the supply', () => {
    const base = run();
    const doubled = run(
      withParameter(createBioCircuit(), 'battery', 'voltage', 10),
    );

    const baseVoltage = base.dataPoints[0]!.values['sensor.voltage']!.value;
    const doubledVoltage = doubled.dataPoints[0]!.values['sensor.voltage']!.value;

    expect(doubledVoltage).toBeCloseTo(baseVoltage * 2, 6);
  });
});

describe('the electronics is load-bearing', () => {
  it('changes the reading when the reference resistor changes', () => {
    const base = run().dataPoints[0]!.values['sensor.signal']!.value;

    const smaller = run(
      withParameter(createBioCircuit(), 'divider', 'resistance', 1_000),
    ).dataPoints[0]!.values['sensor.signal']!.value;

    const larger = run(
      withParameter(createBioCircuit(), 'divider', 'resistance', 100_000),
    ).dataPoints[0]!.values['sensor.signal']!.value;

    // 10 kΩ / 1 kΩ / 100 kΩ against a 1 kΩ probe.
    expect(base).toBeCloseTo(10 / 11, 6);
    expect(smaller).toBeCloseTo(0.5, 6);
    expect(larger).toBeCloseTo(100 / 101, 6);

    // A sensor that merely passed the moisture through would ignore all of
    // this. It does not.
    expect(smaller).not.toBeCloseTo(base, 3);
    expect(larger).not.toBeCloseTo(base, 3);
  });

  it('changes when the alert fires when the reference resistor changes', () => {
    const withTenKiloOhm = firstAlertDay(run(createBioCircuit({ substrate: 'sandy' })));
    const withHundredKiloOhm = firstAlertDay(
      run(
        withParameter(
          createBioCircuit({ substrate: 'sandy' }),
          'divider',
          'resistance',
          100_000,
        ),
      ),
    );

    expect(withTenKiloOhm).not.toBeNull();
    // A stiff reference resistor holds the tap high, so the same drying medium
    // never reaches the threshold.
    expect(withHundredKiloOhm).toBeNull();
  });

  it('does not report the raw sensed value as its reading', () => {
    const result = run(createBioCircuit({ substrate: 'sandy' }));
    const last = result.dataPoints.at(-1)!.values;

    const moisture = last['substrate.moisture']!.value;
    const signal = last['sensor.signal']!.value;

    // They are related but they are not the same quantity: the reading is the
    // divider output, not the moisture.
    expect(signal).not.toBeCloseTo(moisture, 3);
  });
});

describe('the alert', () => {
  it('fires for sand first, then loam, then clay, and never for hydrogel', () => {
    const sand = firstAlertDay(run(createBioCircuit({ substrate: 'sandy' })));
    const loam = firstAlertDay(run(createBioCircuit({ substrate: 'loamy' })));
    const clay = firstAlertDay(run(createBioCircuit({ substrate: 'clay' })));
    const hydrogel = firstAlertDay(run(createBioCircuit({ substrate: 'hydrogel' })));

    expect(sand).not.toBeNull();
    expect(loam).not.toBeNull();
    expect(clay).not.toBeNull();
    expect(hydrogel).toBeNull();

    // The medium that holds its water keeps the probe high for longest, so the
    // alert arrives latest. That ordering is the whole point of the coupling.
    expect(sand!).toBeLessThan(loam!);
    expect(loam!).toBeLessThan(clay!);
  });

  it('holds the clay alert off past the day the sand has already alarmed', () => {
    // Clay does eventually dry out and trip the alert, but only after the
    // twenty-one-day run in this experiment would have ended. An earlier
    // version of this test claimed clay never alarmed at all. That was an
    // artefact of a fourteen-day window, not a fact about clay.
    const clayAt21Days = firstAlertDay(run(createBioCircuit({ substrate: 'clay' })));
    expect(clayAt21Days).not.toBeNull();
    expect(clayAt21Days!).toBeGreaterThan(15);

    const sandAt21Days = firstAlertDay(run(createBioCircuit({ substrate: 'sandy' })));
    expect(sandAt21Days!).toBeLessThan(clayAt21Days!);
  });

  it('never fires on a freshly planted experiment', () => {
    // A brand new experiment must not start in an alarm state.
    const result = run();
    expect(result.dataPoints[0]!.values['comparator.decision']!.value).toBe(0);
    expect(result.dataPoints[0]!.values['alert.brightness']!.value).toBe(0);
  });

  it('propagates the alert through the chain with one tick of delay per hop', () => {
    const result = run(createBioCircuit({ substrate: 'sandy' }));
    const points = result.dataPoints;
    const threshold = 0.4;

    // The kernel uses an explicit update scheme: a component acts on the
    // values published on the previous tick. One hop therefore costs one
    // timestep, which stands in for real sampling and propagation delay.
    for (let i = 1; i < points.length; i++) {
      const signal = points[i - 1]!.values['sensor.signal']!.value;
      const decision = points[i]!.values['comparator.decision']!.value;
      // The comparator is inverted: it fires when the reading falls below the
      // threshold.
      expect(decision).toBe(signal < threshold ? 1 : 0);
    }
  });

  it('lights the LED only while the alert is on', () => {
    const result = run(createBioCircuit({ substrate: 'sandy' }));
    const points = result.dataPoints;

    for (let i = 1; i < points.length; i++) {
      const decision = points[i - 1]!.values['comparator.decision']!.value;
      const brightness = points[i]!.values['alert.brightness']!.value;
      expect(brightness > 0.5).toBe(decision > 0.5);
    }
  });
});
