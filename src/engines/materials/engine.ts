/**
 * FrankenLab — Materials engine.
 *
 * Materials are the bridge discipline: a substrate holds water (biology) and
 * conducts heat and electricity (materials, electronics). Its properties are
 * published reference ranges, deliberately simplified.
 *
 * The substrate model is a two-reservoir bucket: a free-water reservoir that
 * drains under gravity, and a bound reservoir that holds moisture against
 * gravity and releases it slowly. This is the standard teaching simplification
 * of soil water dynamics and it behaves correctly for the questions the demo
 * asks: which substrate holds water longest, and how fast does it dry out?
 */

import type {
  ComponentBehavior,
  ComponentDefinition,
  ConnectionRule,
  DisciplineEngine,
  Observation,
  Quantity,
} from '../../kernel/types';
import { quantity } from '../../kernel/units';
import { catalogueByDiscipline, catalogueBehaviours } from '../../kernel/catalogue-components';

export interface SubstrateState extends Record<string, unknown> {
  readonly freeWater: number;
  readonly boundWater: number;
  readonly outputs: Record<string, Quantity>;
  readonly __initialised?: boolean;
  /** True once the medium has dried past the wilting point. */
  readonly __wilting?: boolean;
  /** The value of `__wilting` before the last step, for transition detection. */
  readonly __prev_wilting?: boolean;
  readonly __param_field_capacity?: number;
  readonly __param_wilting_point?: number;
  readonly __param_percolation_rate?: number;
  readonly __param_retention_rate?: number;
}

/**
 * How far above the wilting point the medium must come before it counts as
 * recovered.
 *
 * Without a deadband, a medium sitting right on the threshold reports that it
 * dried out and that it recovered in the same hour, which is both confusing
 * and false.
 */
const RECOVERY_MARGIN = 0.08;

/** Published-ish property values for the substrates we ship. */
export const SUBSTRATE_PRESETS = {
  sandy: {
    label: 'Sandy soil',
    fieldCapacity: 0.18,
    wiltingPoint: 0.06,
    saturation: 0.38,
    percolationRate: 0.35,
    retentionRate: 0.02,
    thermalConductivity: 0.25,
    conductivity: 0.02,
    description: 'Drains fast and holds little water. Good drainage, poor drought reserve.',
  },
  loamy: {
    label: 'Loamy soil',
    fieldCapacity: 0.28,
    wiltingPoint: 0.12,
    saturation: 0.48,
    percolationRate: 0.12,
    retentionRate: 0.06,
    thermalConductivity: 0.4,
    conductivity: 0.05,
    description: 'Balanced drainage and retention. The general-purpose substrate.',
  },
  clay: {
    label: 'Clay',
    fieldCapacity: 0.42,
    wiltingPoint: 0.18,
    saturation: 0.50,
    percolationRate: 0.03,
    retentionRate: 0.12,
    thermalConductivity: 0.8,
    conductivity: 0.01,
    description: 'Holds a lot of water but drains slowly. Risk of waterlogging.',
  },
  hydrogel: {
    label: 'Hydrogel substrate',
    fieldCapacity: 0.75,
    wiltingPoint: 0.10,
    saturation: 0.95,
    percolationRate: 0.05,
    retentionRate: 0.35,
    thermalConductivity: 0.15,
    conductivity: 0.03,
    description: 'A synthetic superabsorbent medium. Holds far more water than soil.',
  },
} as const;

export type SubstratePresetId = keyof typeof SUBSTRATE_PRESETS;
export type SubstratePreset = (typeof SUBSTRATE_PRESETS)[SubstratePresetId];

/** A growing medium that stores water and passes it to the plant. */
export const substrateDefinition: ComponentDefinition = {
  type: 'materials.substrate',
  name: 'Substrate',
  discipline: 'materials',
  category: 'Medium',
  description:
    'A porous medium that stores water and releases it to a plant. Different materials hold water very differently.',
  confidence: 'established-simplified',
  assumptions: [
    'Water is held in two reservoirs: a free reservoir that drains under gravity and a bound reservoir that holds against it.',
    'Field capacity and wilting point are preset values, not measured from the actual medium.',
    'The medium has a finite saturation point — water above it drains away rather than accumulating.',
    'No capillary rise, no preferential flow, and no root-volume feedback.',
    'Thermal and electrical properties are constant and independent of moisture — a real simplification.',
    'Values are representative teaching figures, not measurements of a specific product.',
  ],
  ports: [
    {
      id: 'moisture',
      label: 'Available moisture',
      direction: 'output',
      channel: 'moisture',
      unit: 'ratio',
      required: false,
      description:
        'Plant-available water: 0 at the wilting point, 1 at field capacity.',
    },
    {
      id: 'supply',
      label: 'Water supply',
      direction: 'input',
      channel: 'moisture',
      unit: 'ratio',
      required: false,
      description: 'Water arriving from a moisture source.',
    },
    {
      id: 'uptake',
      label: 'Plant uptake',
      direction: 'input',
      channel: 'moisture',
      unit: 'ratio',
      required: false,
      description: 'Water being drawn from the substrate by a plant.',
    },
  ],
  parameters: [
    {
      id: 'preset',
      label: 'Material preset',
      kind: 'enum',
      defaultValue: 'loamy',
      options: ['sandy', 'loamy', 'clay', 'hydrogel'],
      description: 'The material whose published properties are used.',
      confidence: 'established-simplified',
    },
    {
      id: 'volume',
      label: 'Volume',
      kind: 'number',
      unit: 'cm3',
      defaultValue: 500,
      min: 10,
      max: 10000,
      step: 10,
      description: 'Volume of medium. Larger volumes buffer changes in moisture.',
      confidence: 'illustrative',
    },
    {
      id: 'initial_fill',
      label: 'Initial fill',
      kind: 'number',
      unit: 'ratio',
      defaultValue: 1,
      min: 0.05,
      max: 1,
      step: 0.05,
      description:
        'Starting water content as a fraction of field capacity, so every medium begins at a comparable relative wetness.',
      confidence: 'illustrative',
    },
    {
      id: 'label',
      label: 'Label',
      kind: 'string',
      defaultValue: 'Substrate',
      description: 'Name shown in the workbench.',
    },
  ],
  initialState: { freeWater: 0.18, boundWater: 0.06 },
  visual: { shape: 'cylinder', color: '#a1887f', label: '⬢' },
  readings: [
    {
      id: 'totalMoisture',
      label: 'Total moisture',
      unit: 'ratio',
      description: 'Total water in the medium relative to field capacity.',
    },
    {
      id: 'freeWater',
      label: 'Free water',
      unit: 'ratio',
      description: 'Water that drains freely under gravity.',
    },
    {
      id: 'boundWater',
      label: 'Bound water',
      unit: 'ratio',
      description: 'Water held against gravity, released slowly.',
    },
    {
      id: 'fieldCapacity',
      label: 'Field capacity',
      unit: 'ratio',
      description: 'Water content at which drainage nearly stops.',
    },
    {
      id: 'wiltingPoint',
      label: 'Wilting point',
      unit: 'ratio',
      description: 'Water content below which plants cannot recover.',
    },
    {
      id: 'saturation',
      label: 'Saturation',
      unit: 'ratio',
      description: 'Maximum water content the medium can hold.',
    },
    {
      id: 'thermalConductivity',
      label: 'Thermal conductivity',
      unit: 'W_per_mK',
      description: 'How well this medium conducts heat.',
    },
    {
      id: 'conductivity',
      label: 'Electrical conductivity',
      unit: 'S_per_m',
      description: 'How well this medium conducts electricity.',
    },
  ],
};

/**
 * The medium's water balance at one instant, and the readings derived from it.
 *
 * Kept separate from the step function so the same numbers can be published
 * without advancing time. The workbench and the first network solve both need
 * to see the medium's starting condition.
 */
interface SubstrateReadings {
  readonly preset: SubstratePreset;
  readonly free: number;
  readonly bound: number;
  readonly total: number;
  readonly available: number;
}

/**
 * Plant-available water: the fraction of the medium's water that lies between
 * the wilting point and field capacity. This is the quantity a plant can
 * actually draw on, and the quantity the sensor reports.
 */
function plantAvailable(preset: SubstratePreset, total: number): number {
  const availableRange = preset.fieldCapacity - preset.wiltingPoint;
  return Math.max(0, (total - preset.wiltingPoint) / availableRange);
}

/** Read the medium's current balance without changing it. */
function readSubstrate(state: SubstrateState): SubstrateReadings {
  const s = state as SubstrateState & { __param_preset?: string; __param_initial_fill?: number };
  const presetId = (s.__param_preset ?? 'loamy') as SubstratePresetId;
  const preset = SUBSTRATE_PRESETS[presetId] ?? SUBSTRATE_PRESETS.loamy;
  const initialFill = s.__param_initial_fill ?? 1;

  let free = s.freeWater ?? 0;
  let bound = s.boundWater ?? 0;

  // The medium starts at a consistent *relative* fill: at field capacity by
  // default. Starting from a fixed absolute water content would make a sandy
  // pot start "wet" and a clay pot start "dry", which is backwards.
  if (s.__initialised !== true) {
    const starting = preset.fieldCapacity * initialFill;
    free = starting * 0.65;
    bound = starting * 0.35;
  }

  const total = free + bound;
  return { preset, free, bound, total, available: plantAvailable(preset, total) };
}

/** The published readings for a given balance. */
function substrateOutputs(readings: SubstrateReadings): Record<string, Quantity> {
  const { preset, free, bound, total, available } = readings;
  return {
    moisture: quantity(Math.min(1, available), 'ratio'),
    totalMoisture: quantity(total, 'ratio'),
    freeWater: quantity(free, 'ratio'),
    boundWater: quantity(bound, 'ratio'),
    fieldCapacity: quantity(preset.fieldCapacity, 'ratio'),
    wiltingPoint: quantity(preset.wiltingPoint, 'ratio'),
    saturation: quantity(preset.saturation, 'ratio'),
    thermalConductivity: quantity(preset.thermalConductivity, 'W_per_mK'),
    conductivity: quantity(preset.conductivity, 'S_per_m'),
  };
}

export const substrateBehavior: ComponentBehavior<SubstrateState> = {
  type: 'materials.substrate',

  /**
   * Publish the readings without advancing time.
   *
   * This is what makes the medium's starting condition visible at t = 0, so a
   * fresh experiment does not look like a disconnected one.
   */
  outputs(state) {
    return substrateOutputs(readSubstrate(state));
  },

  step(state, inputs, context) {
    const s = state as SubstrateState & { __param_preset?: string; __param_initial_fill?: number };
    const readings = readSubstrate(state);
    const preset = readings.preset;

    const days = context.dt / 86400;

    let free = readings.free;
    let bound = readings.bound;

    const supply = inputs.supply?.value ?? 0;
    const uptake = inputs.uptake?.value ?? 0;

    // Irrigation is an absolute rate: the same watering, regardless of how
    // much the medium happens to hold. If it scaled with capacity, a larger
    // medium would automatically receive more water and the comparison
    // between substrates would be meaningless.
    free += supply * days;

    // Saturation ceiling: the medium cannot hold more water than its saturation
    // point. Water above this drains away immediately. This prevents the
    // medium from accumulating unlimited water when irrigation outruns drainage.
    const totalWater = free + bound;
    if (totalWater > preset.saturation) {
      const excess = totalWater - preset.saturation;
      // Drain the excess proportionally from both reservoirs.
      const freeFraction = free / totalWater;
      const boundFraction = bound / totalWater;
      free = Math.max(0, free - excess * freeFraction);
      bound = Math.max(0, bound - excess * boundFraction);
    }

    // Percolation: only water above field capacity drains away under gravity.
    const excess = Math.max(0, free - preset.fieldCapacity);
    const drained = excess * preset.percolationRate * days;
    free = Math.max(0, free - drained);

    // Retention: a fraction of the free water is bound to the medium, and
    // bound water is released slowly back into the free reservoir. The
    // exchange is conservative — water moves between the two reservoirs,
    // it never leaves the medium.
    const boundExchange = free * preset.retentionRate * days;
    free -= boundExchange;
    const release = bound * preset.retentionRate * days;
    bound = Math.max(0, bound - release + boundExchange);
    free += release;

    // Plant uptake: transpiration is an absolute rate set by the plant. It
    // draws first from free water, then from bound water — but never below
    // the wilting point, because that water is not available to the plant.
    const totalBefore = free + bound;
    const drawable = Math.max(0, totalBefore - preset.wiltingPoint);
    const drawn = Math.min(uptake * days, drawable);
    const fromFree = Math.min(free, drawn);
    free -= fromFree;
    const fromBound = Math.min(bound, drawn - fromFree);
    bound = Math.max(0, bound - fromBound);

    const available = plantAvailable(preset, free + bound);

    // Hysteresis. Once the medium is wilted it stays wilted until the
    // available water is clearly back above the wilting point. Without the
    // deadband, a medium hovering at the threshold flips twice an hour and
    // the timeline reports that it dried out and recovered in the same minute.
    const wasWilting = s.__wilting ?? false;
    const isWilting = available <= 0 ? true : available >= RECOVERY_MARGIN ? false : wasWilting;

    const next: SubstrateState & { __initialised?: boolean } = {
      ...s,
      freeWater: free,
      boundWater: bound,
      __initialised: true,
      __prev_wilting: wasWilting,
      __wilting: isWilting,
    };

    return {
      ...next,
      outputs: substrateOutputs({
        preset,
        free,
        bound,
        total: free + bound,
        available,
      }),
    };
  },

  observe(state, context) {
    const s = state as SubstrateState;
    const observations: Observation[] = [];
    const wasWilting = s.__prev_wilting;
    const isWilting = s.__wilting ?? false;

    // The medium dried past the wilting point.
    if (wasWilting === false && isWilting === true) {
      observations.push({
        time: context.time,
        componentId: context.componentId,
        severity: 'warning',
        code: 'materials.wilting',
        message: 'The medium dried past the point where the plant can draw water.',
      });
    }

    // The medium came back above the wilting point.
    if (wasWilting === true && isWilting === false) {
      observations.push({
        time: context.time,
        componentId: context.componentId,
        severity: 'success',
        code: 'materials.recovered',
        message: 'The medium has recovered above the wilting point.',
      });
    }

    return observations;
  },
};

/**
 * A conductive material specimen — wire, rod or sheet — whose properties are
 * queried rather than simulated. Lets a user explore why one material suits
 * a circuit and another does not.
 */
export const conductorDefinition: ComponentDefinition = {
  type: 'materials.conductor',
  name: 'Conductive material',
  discipline: 'materials',
  category: 'Material',
  description:
    'A material specimen with published electrical and thermal properties. Used to compare materials within a circuit.',
  confidence: 'established-simplified',
  assumptions: [
    'Properties are taken from published reference ranges for the named material.',
    'All properties are constant; temperature dependence is not modelled.',
    'No contact resistance between materials is represented.',
  ],
  ports: [
    {
      id: 'potential',
      label: 'Potential',
      direction: 'bidirectional',
      channel: 'electrical-potential',
      unit: 'V',
      required: false,
      description:
        'Potential at this specimen relative to the circuit reference. Wire it in and it carries the potential it sits at; leave it alone and it reads zero.',
    },
  ],
  parameters: [
    {
      id: 'material',
      label: 'Material',
      kind: 'enum',
      defaultValue: 'copper',
      options: ['copper', 'aluminium', 'gold', 'silver', 'graphite', 'carbon_fibre', 'conductive_polymer'],
      description: 'The material whose reference properties are used.',
      confidence: 'established-simplified',
    },
    {
      id: 'cross_section',
      label: 'Cross-section',
      kind: 'number',
      unit: 'mm',
      defaultValue: 2,
      min: 0.1,
      max: 100,
      step: 0.1,
      description: 'Conductor cross-sectional area in square millimetres.',
      confidence: 'established-simplified',
    },
    {
      id: 'length',
      label: 'Length',
      kind: 'number',
      unit: 'm',
      defaultValue: 1,
      min: 0.01,
      max: 100,
      step: 0.01,
      description: 'Length of the specimen in metres.',
      confidence: 'established-simplified',
    },
    {
      id: 'label',
      label: 'Label',
      kind: 'string',
      defaultValue: 'Conductor',
      description: 'Name shown in the workbench.',
    },
  ],
  initialState: { outputs: { resistance: quantity(0, 'ohm') } },
  visual: { shape: 'cylinder', color: '#b87333', label: 'Cu' },
  readings: [
    {
      id: 'resistance',
      label: 'Resistance',
      unit: 'ohm',
      description: 'The resistance of the specimen, from its length, area and conductivity.',
    },
    {
      id: 'conductivity',
      label: 'Electrical conductivity',
      unit: 'S_per_m',
      description: 'Published electrical conductivity of the material.',
    },
    {
      id: 'thermalConductivity',
      label: 'Thermal conductivity',
      unit: 'W_per_mK',
      description: 'Published thermal conductivity of the material.',
    },
    {
      id: 'density',
      label: 'Density',
      unit: 'kg_per_m3',
      description: 'Published density of the material.',
    },
  ],
};

/** Electrical conductivity in S/m for the materials we expose. */
export const MATERIAL_CONDUCTIVITY: Record<string, { conductivity: number; thermal: number; density: number }> = {
  copper: { conductivity: 5.96e7, thermal: 401, density: 8960 },
  aluminium: { conductivity: 3.5e7, thermal: 237, density: 2700 },
  gold: { conductivity: 4.25e7, thermal: 317, density: 19300 },
  silver: { conductivity: 6.3e7, thermal: 429, density: 10490 },
  graphite: { conductivity: 1e4, thermal: 195, density: 2260 },
  carbon_fibre: { conductivity: 1e4, thermal: 7, density: 1600 },
  conductive_polymer: { conductivity: 1e3, thermal: 0.2, density: 1100 },
};

export const conductorBehavior: ComponentBehavior = {
  type: 'materials.conductor',
  step(state, inputs, _context) {
    const s = state as { outputs?: Record<string, Quantity> };
    const material = ((s as { __param_material?: string }).__param_material ?? 'copper');
    const area = ((s as { __param_cross_section?: number }).__param_cross_section ?? 2) * 1e-6;
    const length = (s as { __param_length?: number }).__param_length ?? 1;
    const props = MATERIAL_CONDUCTIVITY[material] ?? MATERIAL_CONDUCTIVITY.copper!;

    // R = ρL/A, where ρ = 1/σ.
    const resistance = length / (props.conductivity * area);
    const outputs = (s.outputs ?? {}) as Record<string, Quantity>;
    const potential = inputs.potential ?? quantity(0, 'V');

    return {
      ...s,
      outputs: {
        ...outputs,
        resistance: quantity(resistance, 'ohm'),
        conductivity: quantity(props.conductivity, 'S_per_m'),
        thermalConductivity: quantity(props.thermal, 'W_per_mK'),
        density: quantity(props.density, 'kg_per_m3'),
        potential,
      },
    };
  },
};

export const materialsRules: readonly ConnectionRule[] = [
  {
    sourceChannel: 'moisture',
    targetChannel: 'moisture',
    transfer: { kind: 'identity' },
    sourceDiscipline: '*',
    targetDiscipline: '*',
    description: 'Moisture content is transferred between media.',
    confidence: 'established-simplified',
  },
  {
    sourceChannel: 'electrical-potential',
    targetChannel: 'electrical-potential',
    transfer: { kind: 'identity' },
    sourceDiscipline: '*',
    targetDiscipline: '*',
    description: 'Electrical potential passes through a material unchanged.',
    confidence: 'physical-law',
  },
];

export const materialsEngine: DisciplineEngine = {
  id: 'materials',
  name: 'Materials',
  version: '1.0.0',
  components: [substrateDefinition, conductorDefinition, ...catalogueByDiscipline('materials')],
  behaviors: new Map([
    ['materials.substrate', substrateBehavior],
    ['materials.conductor', conductorBehavior],
    ...catalogueByDiscipline('materials').map((definition) => [definition.type, catalogueBehaviours.get(definition.type)!] as const),
  ]),
  connectionRules: materialsRules,
};
