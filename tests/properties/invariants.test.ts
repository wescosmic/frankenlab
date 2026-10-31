/**
 * FrankenLab — scientific invariants.
 *
 * Property-based tests for the properties that must hold for every input, not
 * just the ones we thought to check. These are the scientific guard rails:
 *
 *   - a passive circuit never generates energy
 *   - a divider output always lies between the rails
 *   - water is conserved in the medium
 *   - no physical quantity ever goes negative or leaves its natural range
 *   - the same experiment always produces the same result
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { createTestRegistry } from '../world';
import { createBioCircuit } from '../../src/scenarios/biocircuit';
import { Simulation } from '../../src/kernel/simulator';
import type { ExperimentDefinition } from '../../src/kernel/types';

const registry = createTestRegistry();

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

/** A short run, so the property checks stay fast. */
function runShort(experiment: ExperimentDefinition) {
  return new Simulation(experiment, registry, { duration: 3 * 86400 }).run();
}

/**
 * Arbitraries are drawn from the ranges the component definitions declare,
 * because the validator refuses anything outside them. Property testing the
 * invalid region would only measure the validator.
 */
const referenceOhms = fc.double({ min: 0.1, max: 1e7, noNaN: true });
const probeKiloOhms = fc.double({ min: 0.01, max: 1000, noNaN: true });
const supplyVoltage = fc.double({ min: 0.1, max: 48, noNaN: true });
const seed = fc.integer({ min: 0, max: 2 ** 31 - 1 });

describe('the circuit conserves energy', () => {
  it('delivers exactly the power the resistors dissipate', () => {
    fc.assert(
      fc.property(referenceOhms, probeKiloOhms, supplyVoltage, (rRef, rProbe, v) => {
        let experiment = withParameter(createBioCircuit(), 'divider', 'resistance', rRef);
        experiment = withParameter(experiment, 'battery', 'voltage', v);
        // Calibrate the probe so it sits at a known resistance.
        experiment = withParameter(experiment, 'sensor', 'resistance_at_zero', rProbe);
        experiment = withParameter(experiment, 'sensor', 'resistance_at_full', rProbe);

        const result = runShort(experiment);
        const first = result.dataPoints[0]!.values;

        const sourceVoltage = first['battery.voltage']!.value;
        const current = Math.abs(first['battery.current']!.value);
        const delivered = sourceVoltage * current;

        const probeResistance = first['sensor.resistance']!.value;
        const referenceResistance = first['divider.resistance']!.value;
        const dissipated = current * current * (probeResistance + referenceResistance);

        expect(dissipated).toBeCloseTo(delivered, 9);
        expect(delivered).toBeGreaterThan(0);
      }),
    );
  });

  it('never drives current backwards through the source', () => {
    fc.assert(
      fc.property(referenceOhms, supplyVoltage, (rRef, v) => {
        let experiment = withParameter(createBioCircuit(), 'divider', 'resistance', rRef);
        experiment = withParameter(experiment, 'battery', 'voltage', v);

        const result = runShort(experiment);
        for (const point of result.dataPoints) {
          // The source pushes current out of its positive terminal. The sign
          // convention in the solver reports it as negative.
          expect(point.values['battery.current']!.value).toBeLessThanOrEqual(0);
        }
      }),
    );
  });
});

describe('the divider output stays between the rails', () => {
  it('never leaves the unit interval', () => {
    fc.assert(
      fc.property(referenceOhms, probeKiloOhms, (rRef, rProbe) => {
        let experiment = withParameter(createBioCircuit(), 'divider', 'resistance', rRef);
        experiment = withParameter(experiment, 'sensor', 'resistance_at_zero', rProbe);
        experiment = withParameter(experiment, 'sensor', 'resistance_at_full', rProbe);

        const result = runShort(experiment);
        for (const point of result.dataPoints) {
          const signal = point.values['sensor.signal']!.value;
          expect(signal).toBeGreaterThanOrEqual(0);
          expect(signal).toBeLessThanOrEqual(1);
          // With finite positive resistances the tap is strictly between the
          // rails, so the reading is strictly inside the interval.
          expect(signal).toBeGreaterThan(0);
          expect(signal).toBeLessThan(1);
        }
      }),
    );
  });
});

describe('the medium conserves water', () => {
  it('never gains water when nothing is added to it', () => {
    fc.assert(
      fc.property(fc.constantFrom('sandy', 'loamy', 'clay', 'hydrogel'), (substrate) => {
        // No irrigation: the plant is the only thing drawing on the medium.
        const result = runShort(createBioCircuit({ substrate, irrigationRate: 0 }));
        const points = result.dataPoints;

        let previous = points[0]!.values['substrate.totalMoisture']!.value;
        for (const point of points) {
          const total = point.values['substrate.totalMoisture']!.value;
          expect(total).toBeLessThanOrEqual(previous + 1e-9);
          previous = total;
        }
      }),
    );
  });

  it('never lets a reservoir go negative', () => {
    fc.assert(
      fc.property(fc.constantFrom('sandy', 'loamy', 'clay', 'hydrogel'), (substrate) => {
        const result = runShort(createBioCircuit({ substrate, irrigationRate: 0 }));
        for (const point of result.dataPoints) {
          expect(point.values['substrate.freeWater']!.value).toBeGreaterThanOrEqual(0);
          expect(point.values['substrate.boundWater']!.value).toBeGreaterThanOrEqual(0);
          expect(point.values['substrate.totalMoisture']!.value).toBeGreaterThanOrEqual(0);
        }
      }),
    );
  });
});

describe('physical quantities stay in range', () => {
  it('keeps every normalised reading between 0 and 1', () => {
    fc.assert(
      fc.property(fc.constantFrom('sandy', 'loamy', 'clay', 'hydrogel'), (substrate) => {
        const result = runShort(createBioCircuit({ substrate }));
        const normalised = [
          'plant.biomass',
          'plant.health',
          'substrate.moisture',
          'nutrients.availability',
          'sensor.signal',
          'comparator.decision',
          'alert.brightness',
        ];

        for (const point of result.dataPoints) {
          for (const key of normalised) {
            const value = point.values[key];
            if (!value) continue;
            expect(value.value, key).toBeGreaterThanOrEqual(0);
            expect(value.value, key).toBeLessThanOrEqual(1);
          }
        }
      }),
    );
  });
});

describe('runs are reproducible', () => {
  it('produces identical results for the same seed', () => {
    fc.assert(
      fc.property(seed, (s) => {
        const experiment = createBioCircuit({ seed: s, substrate: 'sandy' });
        const first = new Simulation(experiment, registry, { duration: 2 * 86400 }).run();
        const second = new Simulation(experiment, registry, { duration: 2 * 86400 }).run();

        expect(first.steps).toBe(second.steps);
        expect(first.dataPoints.length).toBe(second.dataPoints.length);
        expect(first.dataPoints.at(-1)).toEqual(second.dataPoints.at(-1));
        expect(first.measurements).toEqual(second.measurements);
      }),
    );
  });
});
