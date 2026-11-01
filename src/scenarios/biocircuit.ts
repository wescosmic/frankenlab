/**
 * FrankenLab — Project BioCircuit.
 *
 * The flagship vertical slice: a living environmental sensor.
 *
 * A plant grows in a substrate; the substrate's moisture drives a resistive
 * probe; the probe sits above the tap of a voltage divider; when the plant
 * draws the medium dry the probe's resistance rises, the tap voltage falls
 * below the comparator's threshold, and an LED signals that the system needs
 * water.
 *
 * Three disciplines, one graph, and a visible causal chain the user can
 * change and observe. This is the experiment the demonstration is built on.
 */

import type { ExperimentDefinition } from '../kernel/types';

/**
 * Build the BioCircuit experiment.
 *
 * Parameters are exposed so the workbench can preconfigure variants — a
 * sandy substrate that dries fast, a hydrogel substrate that holds water, a
 * different growth rate.
 */
export interface BioCircuitOptions {
  readonly substrate?: 'sandy' | 'loamy' | 'clay' | 'hydrogel';
  readonly initialMoisture?: number;
  readonly comparatorThreshold?: number;
  readonly irrigationRate?: number;
  readonly name?: string;
  readonly seed?: number;
}

export function createBioCircuit(options: BioCircuitOptions = {}): ExperimentDefinition {
  // Sand is the default medium because it is the one that tells the whole
  // story inside the run: the alert fires on day 11, growth stalls on day 20
  // and the medium wilts on day 21. Loam reaches the same beats later,
  // clay later still, and hydrogel holds its water past the end of the run.
  // The workbench still lets the user swap the medium and see the difference.
  const substrate = options.substrate ?? 'sandy';
  const initialMoisture = options.initialMoisture ?? 1;
  const comparatorThreshold = options.comparatorThreshold ?? 0.4;
  // No irrigation by default: the plant drinks the medium dry over the
  // twenty-four days and the alert fires. Turning irrigation up is the recovery
  // beat in the demonstration.
  const irrigationRate = options.irrigationRate ?? 0;
  const seed = options.seed ?? 20261030;

  return {
    id: 'biocircuit',
    name: options.name ?? 'Project BioCircuit',
    description:
      'A living environmental sensor. A plant draws water from a substrate; the substrate moisture drives a resistive sensor; a comparator turns the reading into an alert when the medium runs dry.',
    discipline: 'cross-disciplinary',
    tags: ['biology', 'electronics', 'materials', 'flagship', 'interdisciplinary'],
    modelVersion: '1.0.0',
    dt: 3600, // one simulated hour per step
    // The run is long enough to reach every beat with a day to spare. The
    // medium wilts on day 21, the recovery lands on day 21 and a third, and
    // the alert clears a day and a half later. A shorter run would cut the
    // recovery off mid-sentence.
    duration: 86400 * 24, // twenty-four simulated days
    seed,
    trackedSeries: [
      { key: 'substrate.moisture', label: 'Available moisture', colour: '#7bc96f' },
      { key: 'sensor.signal', label: 'Probe reading', colour: '#4fd1c5' },
      { key: 'plant.biomass', label: 'Biomass', colour: '#c2a084' },
      { key: 'comparator.decision', label: 'Alert', colour: '#ef6461' },
    ],
    components: [
      {
        id: 'substrate',
        type: 'materials.substrate',
        label: 'Substrate',
        position: { x: -4.0, y: 0, z: 0 },
        parameters: {
          preset: { value: substrate },
          volume: { value: 500, unit: 'cm3' },
          initial_fill: { value: initialMoisture, unit: 'ratio' },
          label: { value: 'Substrate' },
        },
      },
      {
        id: 'plant',
        type: 'biology.plant',
        label: 'Plant',
        position: { x: -4.0, y: 1.6, z: 0 },
        parameters: {
          max_biomass: { value: 1, unit: 'ratio' },
          growth_rate: { value: 0.08 },
          water_optimum: { value: 0.6, unit: 'ratio' },
          nutrient_optimum: { value: 0.5, unit: 'ratio' },
          label: { value: 'Plant' },
        },
      },
      {
        id: 'nutrients',
        type: 'biology.nutrient-source',
        label: 'Nutrients',
        position: { x: -6.2, y: 0.5, z: 0 },
        parameters: {
          capacity: { value: 1, unit: 'ratio' },
          // The reservoir regenerates more slowly than the plant draws, so the
          // drawdown is visible: over the twenty-four days the plant takes
          // about seven per cent of the store out of it. The plant is limited
          // by water long before it is limited by nutrients.
          regeneration: { value: 0.003 },
          label: { value: 'Nutrients' },
        },
      },
      {
        id: 'irrigation',
        type: 'biology.moisture-source',
        label: 'Irrigation',
        position: { x: -6.2, y: -1.3, z: 0 },
        parameters: {
          rate: { value: irrigationRate },
          label: { value: 'Irrigation' },
        },
      },
      {
        id: 'sensor',
        type: 'electronics.sensor',
        label: 'Moisture probe',
        position: { x: -0.4, y: -0.3, z: 0 },
        parameters: {
          // A resistive soil probe conducts better when wet, so its
          // resistance is highest when the medium is dry.
          resistance_at_zero: { value: 40, unit: 'kohm' },
          resistance_at_full: { value: 1, unit: 'kohm' },
          label: { value: 'S1' },
        },
      },
      {
        id: 'battery',
        type: 'electronics.voltage-source',
        label: 'Battery',
        position: { x: -0.4, y: -2.1, z: 0 },
        parameters: {
          voltage: { value: 5, unit: 'V' },
          label: { value: 'V1' },
        },
      },
      {
        id: 'divider',
        type: 'electronics.resistor',
        label: 'Reference resistor',
        position: { x: -0.4, y: 1.5, z: 0 },
        parameters: {
          resistance: { value: 10000, unit: 'ohm' },
          label: { value: 'R1' },
        },
      },
      {
        id: 'comparator',
        type: 'electronics.comparator',
        label: 'Threshold comparator',
        position: { x: 3.0, y: 0.4, z: 0 },
        parameters: {
          threshold: { value: comparatorThreshold, unit: 'ratio' },
          // Inverted: the comparator fires when the reading falls *below* the
          // threshold, because a falling reading means the medium is dry.
          invert: { value: true },
          label: { value: 'U1' },
        },
      },
      {
        id: 'alert',
        type: 'electronics.led',
        label: 'Alert LED',
        position: { x: 5.6, y: 0.4, z: 0 },
        parameters: {
          forward_voltage: { value: 2, unit: 'V' },
          max_current: { value: 20, unit: 'mA' },
          label: { value: 'LED1' },
        },
      },
    ],
    connections: [
      // --- Biology ↔ Materials ---
      {
        id: 'c-irrigation-substrate',
        source: { componentId: 'irrigation', portId: 'supply' },
        target: { componentId: 'substrate', portId: 'supply' },
        channel: 'moisture',
        transfer: { kind: 'identity' },
        label: 'Irrigation',
      },
      {
        id: 'c-substrate-plant',
        source: { componentId: 'substrate', portId: 'moisture' },
        target: { componentId: 'plant', portId: 'water' },
        channel: 'moisture',
        transfer: { kind: 'identity' },
        label: 'Root zone moisture',
      },
      {
        id: 'c-nutrients-plant',
        source: { componentId: 'nutrients', portId: 'availability' },
        target: { componentId: 'plant', portId: 'nutrients' },
        channel: 'nutrient',
        transfer: { kind: 'identity' },
        label: 'Nutrient uptake',
      },
      {
        id: 'c-plant-nutrients',
        source: { componentId: 'plant', portId: 'nutrientDemand' },
        target: { componentId: 'nutrients', portId: 'demand' },
        channel: 'nutrient',
        transfer: { kind: 'identity' },
        label: 'Nutrient consumption',
      },
      {
        id: 'c-plant-substrate',
        source: { componentId: 'plant', portId: 'transpiration' },
        target: { componentId: 'substrate', portId: 'uptake' },
        channel: 'moisture',
        transfer: { kind: 'identity' },
        label: 'Root uptake',
      },

      // --- Materials → Electronics ---
      {
        id: 'c-substrate-sensor',
        source: { componentId: 'substrate', portId: 'moisture' },
        target: { componentId: 'sensor', portId: 'sense' },
        channel: 'moisture',
        transfer: { kind: 'identity' },
        label: 'Moisture transduction',
      },

      // --- Electronics internal ---
      // A real voltage divider: battery → moisture probe → tap → reference
      // resistor → ground. This is the standard arrangement for a resistive
      // soil probe. As the medium dries the probe's resistance rises, so the
      // tap voltage falls — and the comparator thresholds that solved voltage,
      // not the moisture reading that drove it.
      {
        id: 'c-battery-sensor',
        source: { componentId: 'battery', portId: 'positive' },
        target: { componentId: 'sensor', portId: 'terminal_a' },
        channel: 'electrical-potential',
        transfer: { kind: 'identity' },
        label: 'Supply rail',
      },
      {
        id: 'c-sensor-divider',
        source: { componentId: 'sensor', portId: 'terminal_b' },
        target: { componentId: 'divider', portId: 'terminal_a' },
        channel: 'electrical-potential',
        transfer: { kind: 'identity' },
        label: 'Divider tap',
      },
      {
        id: 'c-divider-ground',
        source: { componentId: 'divider', portId: 'terminal_b' },
        target: { componentId: 'battery', portId: 'negative' },
        channel: 'electrical-potential',
        transfer: { kind: 'identity' },
        label: 'Return to ground',
      },
      {
        id: 'c-sensor-comparator',
        source: { componentId: 'sensor', portId: 'signal' },
        target: { componentId: 'comparator', portId: 'input' },
        channel: 'signal',
        transfer: { kind: 'identity' },
        label: 'Divider voltage',
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
      variables: [
        {
          id: 'temperature',
          label: 'Ambient temperature',
          value: { value: 22, unit: 'degC' },
          min: { value: -10, unit: 'degC' },
          max: { value: 50, unit: 'degC' },
          description: 'Surrounding temperature. Affects growth rate and evaporation.',
        },
        {
          id: 'light',
          label: 'Light level',
          value: { value: 0.7, unit: 'ratio' },
          min: { value: 0, unit: 'ratio' },
          max: { value: 1, unit: 'ratio' },
          description: 'Relative light availability. Simplified into the growth factor.',
        },
      ],
    },
  };
}

/**
 * The narrative milestones shown in the workbench as the experiment runs.
 *
 * Each is a plain-language statement about what the user should be able to
 * see. They double as the demo script's checkpoints.
 *
 * The `atDay` values are the days the default flagship actually reaches them,
 * measured from the simulation rather than written by hand. Sand is the
 * default medium, so these are the numbers the demonstration is built on. The
 * workbench still lets the user swap the medium, which pushes every beat
 * later. The recovery beat has no day because it needs the user to water the
 * medium, which they can do at any point in the run.
 */
export const BIOCIRCUIT_BEATS = [
  {
    id: 'planted',
    atDay: 0,
    label: 'Planted',
    detail: 'The plant is established in the substrate with nutrients available.',
    expects: 'A small plant sits in the medium; moisture is above the wilting point.',
  },
  {
    id: 'growing',
    atDay: 1,
    label: 'Growing',
    detail: 'Biomass increases as long as moisture and nutrients hold up.',
    expects: 'The plant visibly grows and the vigour reading stays near 1.',
  },
  {
    id: 'drying',
    atDay: 4,
    label: 'Drying out',
    detail: 'Root uptake outpaces irrigation, so the medium dries.',
    expects: 'Moisture falls; the sensor resistance climbs.',
  },
  {
    id: 'alert',
    atDay: 11,
    label: 'Alert triggered',
    detail: 'The comparator inverts: below the threshold means the medium is too dry.',
    expects: 'The LED lights to signal that the system needs water.',
  },
  {
    id: 'stalled',
    atDay: 20,
    label: 'Growth stalled',
    detail: 'The plant can no longer take up enough water to keep building tissue.',
    expects: 'The biomass curve flattens and the vigour reading starts to fall.',
  },
  {
    id: 'wilting',
    atDay: 21,
    label: 'Wilting',
    detail: 'The medium has dropped below its wilting point.',
    expects: 'The plant droops and the medium reads dry.',
  },
  {
    id: 'recovery',
    atDay: null,
    label: 'Recovery',
    detail: 'Watering the medium restores moisture and the alert clears.',
    expects: 'The LED switches off and growth resumes.',
  },
] as const;

/**
 * The days the flagship's beats actually land on, measured from the
 * simulation.
 *
 * The first three come from a run with no irrigation, which is the default.
 * The recovery needs the user to turn the tap on, so its day depends on when
 * they do it. Measured on a run that is paused the moment the medium wilts,
 * watered, and then allowed to continue: the medium comes back at 21d 8h and
 * the alert clears at 23d 3h.
 *
 * These are measured by `scripts/measure-beats.ts`, not written by hand. If
 * the numbers here and that script disagree, the script is right.
 */
export const BIOCIRCUIT_MEASURED_DAYS = {
  alertFired: 10.92,
  growthStalled: 20.33,
  mediumWilting: 20.67,
  mediumRecovered: 21.0,
  alertCleared: 22.79,
} as const;
