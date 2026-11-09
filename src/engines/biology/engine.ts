/**
 * FrankenLab — Biology engine.
 *
 * Biological models here are educational simplifications, and they say so in
 * their own `assumptions` field, which the UI and the assistant both surface.
 *
 * The plant model is a logistic growth curve modulated by three limiting
 * factors — water, nutrients and temperature. Each factor is a saturating
 * response function of a single environmental variable. This is a standard
 * teaching abstraction, not a crop model.
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

export interface PlantState extends Record<string, unknown> {
  readonly biomass: number;
  readonly health: number;
  readonly waterUptake: number;
  /** The demand the plant put on the nutrient reservoir at the last step. */
  readonly nutrientDemand: number;
  readonly outputs: Record<string, Quantity>;
  readonly __prev_health?: number;
  readonly __prev_biomass?: number;
  readonly __param_max_biomass?: number;
  readonly __param_growth_rate?: number;
  readonly __param_transpiration_rate?: number;
  readonly __param_water_optimum?: number;
  readonly __param_nutrient_optimum?: number;
}

/**
 * Saturating response centred on an optimum.
 *
 * Returns 1 when the input equals the optimum, tapering smoothly to 0 at
 * twice the tolerance. `tolerance` is the half-width of the plateau band.
 */
export function saturatingResponse(
  value: number,
  optimum: number,
  tolerance: number,
): number {
  if (tolerance <= 0) return value === optimum ? 1 : 0;
  const distance = Math.abs(value - optimum) / tolerance;
  if (distance <= 1) return 1;
  if (distance >= 2) return 0;
  const t = distance - 1;
  return 1 - t * t;
}

/** A plant. Grows over time, consuming water and nutrients. */
export const plantDefinition: ComponentDefinition = {
  type: 'biology.plant',
  name: 'Plant',
  discipline: 'biology',
  category: 'Organism',
  description:
    'A simplified plant that grows over time. Growth is limited by water, nutrients and temperature.',
  confidence: 'established-simplified',
  assumptions: [
    'Growth follows a logistic curve: the rate falls as the plant approaches its maximum size.',
    'Water, nutrient and temperature responses are independent saturating functions multiplied together.',
    'The model tracks total biomass only — no morphology, no species, no phenology.',
    'Transpiration is proportional to biomass and available water; no stomatal detail is modelled.',
    'Values are illustrative for teaching and are NOT validated crop predictions.',
  ],
  ports: [
    {
      id: 'water',
      label: 'Water uptake',
      direction: 'input',
      channel: 'moisture',
      unit: 'ratio',
      required: true,
      description:
        'Plant-available water, from 0 (wilting point) to 1 (field capacity).',
    },
    {
      id: 'nutrients',
      label: 'Nutrient uptake',
      direction: 'input',
      channel: 'nutrient',
      unit: 'ratio',
      required: true,
      description: 'Nutrient availability as a fraction of the required amount.',
    },
    {
      id: 'transpiration',
      label: 'Transpiration',
      direction: 'output',
      channel: 'moisture',
      unit: 'ratio',
      required: false,
      description: 'Water returned to the surroundings per unit time, normalised.',
    },
    {
      id: 'biomass',
      label: 'Biomass',
      direction: 'output',
      channel: 'biomass',
      unit: 'ratio',
      required: false,
      description: 'Current biomass as a fraction of maximum biomass.',
    },
    {
      id: 'health',
      label: 'Vigour',
      direction: 'output',
      channel: 'signal',
      unit: 'ratio',
      required: false,
      description: 'A 0–1 index of how well conditions suit the plant.',
    },
    {
      id: 'nutrientDemand',
      label: 'Nutrient demand',
      direction: 'output',
      channel: 'nutrient',
      unit: 'ratio',
      required: false,
      description: 'Rate at which nutrients are being consumed by growth.',
    },
  ],
  parameters: [
    {
      id: 'max_biomass',
      label: 'Maximum biomass',
      kind: 'number',
      unit: 'ratio',
      defaultValue: 1,
      min: 0.01,
      max: 1,
      step: 0.01,
      description: 'Carrying capacity for growth, as a fraction.',
      confidence: 'established-simplified',
    },
    {
      id: 'growth_rate',
      label: 'Growth rate',
      kind: 'number',
      unit: 'ratio',
      defaultValue: 0.05,
      min: 0.001,
      max: 1,
      step: 0.005,
      description: 'Intrinsic growth rate per simulated day.',
      confidence: 'established-simplified',
    },
    {
      id: 'transpiration_rate',
      label: 'Transpiration rate',
      kind: 'number',
      unit: 'ratio',
      defaultValue: 0.03,
      min: 0,
      max: 1,
      step: 0.005,
      description:
        'Water lost per unit biomass per simulated day. An absolute rate, so the same plant dries different media at different rates.',
      confidence: 'established-simplified',
    },
    {
      id: 'water_optimum',
      label: 'Optimal available water',
      kind: 'number',
      unit: 'ratio',
      defaultValue: 0.8,
      min: 0.1,
      max: 1,
      step: 0.01,
      description:
        'Plant-available water fraction at which growth is unimpeded. 1 means field capacity; 0 means the wilting point.',
      confidence: 'established-simplified',
    },
    {
      id: 'nutrient_optimum',
      label: 'Optimal nutrients',
      kind: 'number',
      unit: 'ratio',
      defaultValue: 0.5,
      min: 0.1,
      max: 1,
      step: 0.01,
      description: 'Nutrient fraction at which growth is unimpeded.',
      confidence: 'established-simplified',
    },
    {
      id: 'label',
      label: 'Label',
      kind: 'string',
      defaultValue: 'Plant',
      description: 'Name shown in the workbench.',
    },
  ],
  initialState: { biomass: 0.1, health: 1, waterUptake: 0, nutrientDemand: 0 },
  visual: { shape: 'organic', color: '#66bb6a', label: '🌱', labelHeight: 2.1 },
};

export const plantBehavior: ComponentBehavior<PlantState> = {
  type: 'biology.plant',

  /**
   * Publish the plant's condition without advancing time.
   *
   * At t = 0 there is no growth yet, so the demand on nutrients is zero and
   * the transpiration is whatever the plant was already losing. After that
   * both come from the state the last step left behind, so the reservoir
   * really is drawn down by the plant that is growing.
   */
  outputs(state) {
    const maxBiomass = state.__param_max_biomass ?? 1;
    const biomass = state.biomass ?? 0;
    return {
      transpiration: quantity(state.waterUptake ?? 0, 'ratio'),
      biomass: quantity(biomass / maxBiomass, 'ratio'),
      health: quantity(state.health ?? 0, 'ratio'),
      nutrientDemand: quantity(state.nutrientDemand ?? 0, 'ratio'),
    };
  },

  step(state, inputs, context) {
    const water = inputs.water?.value ?? 0;
    const nutrients = inputs.nutrients?.value ?? 0;

    const maxBiomass = state.__param_max_biomass ?? 1;
    const growthRate = state.__param_growth_rate ?? 0.05;
    const transpirationRate = state.__param_transpiration_rate ?? 0.03;

    // Convert the timestep into simulated days — growth is slow relative to
    // a circuit solver's timestep.
    const days = context.dt / 86400;

    // The substrate reports *plant-available* water: 0 means the medium has
    // reached its wilting point, 1 means it is at field capacity.
    const waterResponse = saturatingResponse(
      water,
      state.__param_water_optimum ?? 0.8,
      0.4,
    );
    const nutrientResponse = saturatingResponse(
      nutrients,
      state.__param_nutrient_optimum ?? 0.5,
      0.4,
    );

    const vigour = waterResponse * nutrientResponse;

    // Logistic growth: dB/dt = r·B·(1 − B/K), scaled by the limiting factors.
    const growth = growthRate * state.biomass * (1 - state.biomass / maxBiomass) * vigour;
    const biomass = Math.max(0, Math.min(maxBiomass, state.biomass + growth * days));

    // Transpiration is an ABSOLUTE rate: a plant of a given leaf area loses a
    // given volume of water per day regardless of what it is growing in.
    // This is why a clay pot and a sandy pot holding the same plant dry out
    // at different rates — the clay holds more water to begin with.
    //
    // The medium clamps the actual draw; the plant does not know how much
    // water the medium has left.
    const transpiration = biomass * transpirationRate * (0.3 + 0.7 * vigour);

    // Nutrient consumption tracks growth: a plant that is not growing is not
    // drawing down the reservoir.
    //
    // The demand is a RATE, the same way transpiration is. The reservoir
    // multiplies it by the step to get an amount, exactly as the medium does
    // with the plant's uptake. Publishing the growth of one step instead would
    // have made the reservoir draw down at a rate that depends on the
    // timestep, which is how it ended up regenerating faster than the plant
    // could ever consume.
    const nutrientDemand =
      growthRate * state.biomass * (1 - state.biomass / maxBiomass) * vigour * 0.5;

    return {
      ...state,
      biomass,
      health: vigour,
      waterUptake: transpiration,
      // The demand is kept in the state, because the published outputs are
      // recomputed from the state after every step. A value computed here and
      // thrown away would never reach the reservoir.
      nutrientDemand,
      // Track previous values for transition detection in observe.
      __prev_health: state.health,
      __prev_biomass: state.biomass,
      outputs: {
        transpiration: quantity(transpiration, 'ratio'),
        biomass: quantity(biomass / maxBiomass, 'ratio'),
        health: quantity(vigour, 'ratio'),
        nutrientDemand: quantity(nutrientDemand, 'ratio'),
      },
    };
  },

  observe(state, context) {
    const s = state as PlantState;
    const observations: Observation[] = [];
    const currentHealth = s.health ?? 0;
    const previousHealth = s.__prev_health;

    // Growth stalled: the plant's vigour has fallen below the level at which
    // it can still grow at its normal rate.
    //
    // The threshold is 0.8 because that is where this model actually goes. The
    // vigour is the product of the plant's water response and its nutrient
    // response, and in a drying medium it settles around 0.7 rather than
    // collapsing to zero. A threshold below that would describe a condition
    // this model cannot reach, and an event that can never fire is not an
    // event. The plant is usually nutrient-limited by the time this fires,
    // which is why the message does not claim a cause.
    if (previousHealth !== undefined && previousHealth > 0.8 && currentHealth <= 0.8) {
      observations.push({
        time: context.time,
        componentId: context.componentId,
        severity: 'warning',
        code: 'biology.growth_stalled',
        message: "The plant's vigour is falling. It is no longer growing at its normal rate.",
      });
    }

    return observations;
  },
};

/**
 * A nutrient reservoir. Supplies a fraction of the required nutrients and
 * slowly depletes as the plant consumes them.
 */
export const nutrientSourceDefinition: ComponentDefinition = {
  type: 'biology.nutrient-source',
  name: 'Nutrient source',
  discipline: 'biology',
  category: 'Resource',
  description:
    'A finite reservoir of nutrients. Availability falls as it is consumed, and refills slowly.',
  confidence: 'established-simplified',
  assumptions: [
    'Availability is a single scalar fraction, not distinct nutrient species.',
    'Consumption is proportional to the plant\'s uptake.',
    'Regeneration is linear and constant.',
  ],
  ports: [
    {
      id: 'availability',
      label: 'Availability',
      direction: 'output',
      channel: 'nutrient',
      unit: 'ratio',
      required: false,
      description: 'Fraction of required nutrients currently available.',
    },
    {
      id: 'demand',
      label: 'Consumption',
      direction: 'input',
      channel: 'nutrient',
      unit: 'ratio',
      required: false,
      description: 'Rate at which the reservoir is being drawn down.',
    },
  ],
  parameters: [
    {
      id: 'capacity',
      label: 'Capacity',
      kind: 'number',
      unit: 'ratio',
      defaultValue: 1,
      min: 0.05,
      max: 1,
      step: 0.05,
      description: 'Total nutrient capacity as a fraction.',
      confidence: 'established-simplified',
    },
    {
      id: 'regeneration',
      label: 'Regeneration',
      kind: 'number',
      unit: 'ratio',
      defaultValue: 0.003,
      min: 0,
      max: 1,
      step: 0.001,
      description: 'Fraction of capacity restored per simulated day.',
      confidence: 'established-simplified',
    },
    {
      id: 'label',
      label: 'Label',
      kind: 'string',
      defaultValue: 'Nutrients',
      description: 'Name shown in the workbench.',
    },
  ],
  initialState: { stored: 1 },
  visual: { shape: 'cylinder', color: '#8d6e63', label: 'N' },
};

export const nutrientSourceBehavior: ComponentBehavior = {
  type: 'biology.nutrient-source',

  /** Publish the reservoir's availability without advancing time. */
  outputs(state) {
    const s = state as { stored?: number; __param_capacity?: number };
    const capacity = s.__param_capacity ?? 1;
    const stored = s.stored ?? capacity;
    return { availability: quantity(stored / capacity, 'ratio') };
  },

  step(state, inputs, context) {
    const s = state as { stored?: number; outputs?: Record<string, Quantity> };
    const capacity = ((s as { __param_capacity?: number }).__param_capacity ?? 1);
    const regeneration = ((s as { __param_regeneration?: number }).__param_regeneration ?? 0.003);
    const days = context.dt / 86400;

    const demand = inputs.demand?.value ?? 0;
    // The plant's demand is a rate, like its transpiration, so it is turned
    // into an amount over the step here. The reservoir regenerates at its own
    // rate, which is why the two can be compared at all.
    const stored = Math.max(0, Math.min(capacity, (s.stored ?? capacity) - demand * days + regeneration * capacity * days));

    return {
      ...s,
      stored,
      outputs: { availability: quantity(stored / capacity, 'ratio') },
    };
  },
};

/**
 * An environmental moisture source. Supplies moisture at a controlled rate —
 * irrigation, rainfall, or a controlled chamber atmosphere.
 */
export const moistureSourceDefinition: ComponentDefinition = {
  type: 'biology.moisture-source',
  name: 'Moisture source',
  discipline: 'biology',
  category: 'Resource',
  description: 'Supplies water to the system at a controlled rate, such as irrigation.',
  confidence: 'illustrative',
  assumptions: [
    'Delivers moisture at a constant rate.',
    'Has unlimited supply — depletion is not modelled.',
    'The delivered rate is not reduced by the receiving medium.',
  ],
  ports: [
    {
      id: 'supply',
      label: 'Supply',
      direction: 'output',
      channel: 'moisture',
      unit: 'ratio',
      required: false,
      description: 'Moisture delivered per unit time, normalised.',
    },
  ],
  parameters: [
    {
      id: 'rate',
      label: 'Delivery rate',
      kind: 'number',
      unit: 'ratio',
      defaultValue: 0.05,
      min: 0,
      max: 1,
      step: 0.01,
      description: 'Moisture delivered per unit time.',
      confidence: 'illustrative',
    },
    {
      id: 'label',
      label: 'Label',
      kind: 'string',
      defaultValue: 'Irrigation',
      description: 'Name shown in the workbench.',
    },
  ],
  initialState: { outputs: { supply: quantity(0.05, 'ratio') } },
  visual: { shape: 'plate', color: '#4fc3f7', label: '💧' },
};

export const moistureSourceBehavior: ComponentBehavior = {
  type: 'biology.moisture-source',
  step(state, _inputs, _context) {
    const s = state as { outputs?: Record<string, Quantity> };
    const rate = ((s as { __param_rate?: number }).__param_rate ?? 0.05);
    const outputs = (s.outputs ?? {}) as Record<string, Quantity>;
    return { ...s, outputs: { ...outputs, supply: quantity(rate, 'ratio') } };
  },
};

/**
 * A teaching-scale bio-electrochemical cell. Nutrient availability controls
 * the open-circuit voltage; the electronics solver treats it as a dynamic
 * voltage source, so the biology is load-bearing rather than decorative.
 */
export const bioBatteryDefinition: ComponentDefinition = {
  type: 'biology.bio-battery',
  name: 'Bio-battery',
  discipline: 'biology',
  category: 'Transducer',
  description: 'A living electrochemical cell that converts nutrient activity into a usable voltage.',
  confidence: 'illustrative',
  assumptions: [
    'Voltage is a teaching abstraction for electrochemical potential.',
    'The cell has no internal resistance or electrode kinetics.',
    'Nutrient availability is the only biological driver.',
  ],
  ports: [
    { id: 'nutrient', label: 'Nutrient activity', direction: 'input', channel: 'nutrient', unit: 'ratio', required: false, description: 'Available nutrient activity driving the cell.' },
    { id: 'positive', label: 'Positive electrode', direction: 'output', channel: 'electrical-potential', unit: 'V', required: false, description: 'Positive electrical terminal.' },
    { id: 'negative', label: 'Negative electrode', direction: 'input', channel: 'electrical-potential', unit: 'V', required: false, description: 'Return terminal.' },
    { id: 'activity', label: 'Cell activity signal', direction: 'output', channel: 'signal', unit: 'ratio', required: false, description: 'Activity signal for an electronic indicator.' },
  ],
  parameters: [
    { id: 'max_voltage', label: 'Maximum voltage', kind: 'number', unit: 'V', defaultValue: 3.2, min: 0.5, max: 12, step: 0.1, description: 'Open-circuit voltage at full nutrient activity.', confidence: 'illustrative' },
    { id: 'label', label: 'Label', kind: 'string', defaultValue: 'Bio-cell', description: 'Name shown in the workbench.' },
  ],
  initialState: { outputs: { voltage: quantity(2.6, 'V'), positive: quantity(2.6, 'V'), negative: quantity(0, 'V'), activity: quantity(0.8, 'ratio') } },
  visual: { shape: 'organic', color: '#8fd694', emissive: '#4fd1c5', label: 'BIO' },
  readings: [
    { id: 'voltage', label: 'Cell voltage', unit: 'V', description: 'Voltage produced by the living cell.' },
    { id: 'activity', label: 'Cell activity', unit: 'ratio', description: 'Normalised biological activity.' },
  ],
};

export const bioBatteryBehavior: ComponentBehavior = {
  type: 'biology.bio-battery',
  step(state, inputs) {
    const s = state as { outputs?: Record<string, Quantity>; __param_max_voltage?: number };
    const activity = Math.max(0, Math.min(1, inputs.nutrient?.value ?? 0.8));
    const voltage = (s.__param_max_voltage ?? 3.2) * (0.35 + activity * 0.65);
    return {
      ...s,
      outputs: {
        ...(s.outputs ?? {}),
        voltage: quantity(voltage, 'V'),
        positive: quantity(voltage, 'V'),
        negative: quantity(0, 'V'),
        activity: quantity(activity, 'ratio'),
      },
    };
  },
};

export const biologyRules: readonly ConnectionRule[] = [
  {
    sourceChannel: 'moisture',
    targetChannel: 'moisture',
    transfer: { kind: 'identity' },
    sourceDiscipline: '*',
    targetDiscipline: '*',
    description: 'Moisture is transferred unchanged between compatible media.',
    confidence: 'established-simplified',
  },
  {
    sourceChannel: 'nutrient',
    targetChannel: 'nutrient',
    transfer: { kind: 'identity' },
    sourceDiscipline: '*',
    targetDiscipline: '*',
    description: 'Nutrient availability is transferred unchanged.',
    confidence: 'established-simplified',
  },
  {
    sourceChannel: 'biomass',
    targetChannel: 'signal',
    transfer: { kind: 'identity' },
    sourceDiscipline: 'biology',
    targetDiscipline: '*',
    description: 'A biological state is exposed to electronics as a normalised signal.',
    confidence: 'established-simplified',
  },
  {
    sourceChannel: 'signal',
    targetChannel: 'signal',
    transfer: { kind: 'identity' },
    sourceDiscipline: '*',
    targetDiscipline: '*',
    description: 'A normalised signal passes through unchanged.',
    confidence: 'physical-law',
  },
];

export const biologyEngine: DisciplineEngine = {
  id: 'biology',
  name: 'Biology',
  version: '1.0.0',
  components: [plantDefinition, nutrientSourceDefinition, moistureSourceDefinition, bioBatteryDefinition, ...catalogueByDiscipline('biology')],
  behaviors: new Map([
    ['biology.plant', plantBehavior],
    ['biology.nutrient-source', nutrientSourceBehavior],
    ['biology.moisture-source', moistureSourceBehavior],
    ['biology.bio-battery', bioBatteryBehavior],
    ...catalogueByDiscipline('biology').map((definition) => [definition.type, catalogueBehaviours.get(definition.type)!] as const),
  ]),
  connectionRules: biologyRules,
};
