/**
 * A purely electronic experiment: a threshold alarm you tune.
 *
 * The flagship shows biology and materials driving an electronic decision.
 * This one takes them away, so what is left is the circuit and nothing else:
 * a battery, a probe, a reference resistor, a comparator and an LED. The
 * whole experiment is one question — where does this circuit's operating
 * point sit, and does it trip the alarm?
 *
 * The probe's signal is the normalised voltage across the reference resistor,
 * solved by modified nodal analysis, not a lookup. Change the reference
 * resistance and the alarm really does move.
 */

import type { ExperimentDefinition } from '@/kernel/types';

export interface ThresholdAlarmOptions {
  /** The reference resistance in ohms. */
  readonly referenceResistance?: number;
  /** The comparator threshold, 0 to 1. */
  readonly threshold?: number;
  readonly name?: string;
  readonly seed?: number;
}

export function createThresholdAlarm(options: ThresholdAlarmOptions = {}): ExperimentDefinition {
  // The reference resistor sets the operating point. With a 40 kOhm probe and
  // a 40 kOhm reference the divider sits at 2.5 V, so the normalised reading
  // is 0.5 and the alarm — thresholded at 0.4 — is on. Lower the reference to
  // 10 kOhm and the reading falls to 0.2 and the alarm goes out.
  const referenceResistance = options.referenceResistance ?? 40_000;
  const threshold = options.threshold ?? 0.4;
  const seed = options.seed ?? 20261031;

  return {
    id: 'threshold-alarm',
    name: options.name ?? 'Threshold Alarm',
    description:
      'A battery, a probe, a reference resistor and a comparator. The divider is solved, so the reading is real. Change the reference resistance and the alarm moves. No biology, no soil, just the circuit.',
    discipline: 'electronics',
    tags: ['electronics', 'operating-point', 'interdisciplinary'],
    modelVersion: '1.0.0',
    dt: 60, // one simulated minute per step
    duration: 3600, // one simulated hour
    seed,
    trackedSeries: [
      { key: 'probe.signal', label: 'Probe reading', colour: '#4fd1c5' },
      { key: 'comparator.decision', label: 'Alarm decision', colour: '#ef6461' },
      { key: 'alert.brightness', label: 'LED brightness', colour: '#f0b350' },
      { key: 'probe.voltage', label: 'Probe voltage', colour: '#7bc96f' },
    ],
    components: [
      {
        id: 'battery',
        type: 'electronics.voltage-source',
        label: 'Battery',
        position: { x: -3.2, y: -1.2, z: 0 },
        parameters: {
          voltage: { value: 5, unit: 'V' },
          label: { value: 'V1' },
        },
      },
      {
        id: 'probe',
        type: 'electronics.sensor',
        label: 'Probe',
        position: { x: -3.2, y: 0.6, z: 0 },
        parameters: {
          // A fixed probe: the same resistance wet or dry, so the only thing
          // the user can move is the reference resistor and the threshold.
          // The probe has nothing to sense, which is the point of this
          // experiment: it takes the biology out and leaves the circuit.
          resistance_at_zero: { value: 40, unit: 'kohm' },
          resistance_at_full: { value: 40, unit: 'kohm' },
          label: { value: 'S1' },
        },
      },
      {
        id: 'reference',
        type: 'electronics.resistor',
        label: 'Reference resistor',
        position: { x: 0.4, y: 0.6, z: 0 },
        parameters: {
          resistance: { value: referenceResistance, unit: 'ohm' },
          label: { value: 'R1' },
        },
      },
      {
        id: 'comparator',
        type: 'electronics.comparator',
        label: 'Threshold comparator',
        position: { x: 3.4, y: 0, z: 0 },
        parameters: {
          threshold: { value: threshold, unit: 'ratio' },
          // Not inverted here. The alarm goes off when the reading rises above
          // the threshold, which is the usual reading of a comparator.
          invert: { value: false },
          label: { value: 'U1' },
        },
      },
      {
        id: 'alert',
        type: 'electronics.led',
        label: 'Alert LED',
        position: { x: 5.8, y: 0, z: 0 },
        parameters: {
          forward_voltage: { value: 2, unit: 'V' },
          max_current: { value: 20, unit: 'mA' },
          label: { value: 'LED1' },
        },
      },
    ],
    connections: [
      {
        id: 'c-battery-probe',
        source: { componentId: 'battery', portId: 'positive' },
        target: { componentId: 'probe', portId: 'terminal_a' },
        channel: 'electrical-potential',
        transfer: { kind: 'identity' },
        label: 'Supply rail',
      },
      {
        id: 'c-probe-reference',
        source: { componentId: 'probe', portId: 'terminal_b' },
        target: { componentId: 'reference', portId: 'terminal_a' },
        channel: 'electrical-potential',
        transfer: { kind: 'identity' },
        label: 'Probe to reference',
      },
      {
        id: 'c-reference-ground',
        source: { componentId: 'reference', portId: 'terminal_b' },
        target: { componentId: 'battery', portId: 'negative' },
        channel: 'electrical-potential',
        transfer: { kind: 'identity' },
        label: 'Return path',
      },
      {
        id: 'c-probe-comparator',
        source: { componentId: 'probe', portId: 'signal' },
        target: { componentId: 'comparator', portId: 'input' },
        channel: 'signal',
        transfer: { kind: 'identity' },
        label: 'Solved divider voltage',
      },
      {
        id: 'c-comparator-alert',
        source: { componentId: 'comparator', portId: 'output' },
        target: { componentId: 'alert', portId: 'trigger' },
        channel: 'signal',
        transfer: { kind: 'identity' },
        label: 'Alert trigger',
      },
    ],
    environment: {
      variables: [],
    },
  };
}
