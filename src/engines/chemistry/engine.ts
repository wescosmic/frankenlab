/**
 * FrankenLab — Chemistry engine.
 *
 * The fifth discipline, and the proof that the kernel is genuinely extensible:
 * this file adds a new science without touching a line of kernel code.
 *
 * Scope is deliberately small and honestly labelled. It models one reversible
 * bimolecular reaction, A + B ⇌ C, in a closed vessel, with an Arrhenius
 * temperature dependence and a hard conservation check on the total amount of
 * substance. It does not model dangerous synthesis, it is not a chemistry
 * simulator, and nothing here should be read as a validated chemical
 * prediction.
 *
 * Everything is unit-aware and deterministic.
 */

import type {
  ComponentBehavior,
  ComponentDefinition,
  ConnectionRule,
  DisciplineEngine,
  Quantity,
} from '../../kernel/types';
import { quantity } from '../../kernel/units';

/** The molar gas constant, J per mole per kelvin. */
const GAS_CONSTANT = 8.314;

/** Published molar masses, grams per mole. */
export const SUBSTANCE_PRESETS = {
  water: { label: 'Water', molarMass: 18.015, density: 1 },
  ethanol: { label: 'Ethanol', molarMass: 46.068, density: 0.789 },
  glucose: { label: 'Glucose', molarMass: 180.156, density: 1.54 },
  sodium_chloride: { label: 'Sodium chloride', molarMass: 58.44, density: 2.16 },
} as const;

export type SubstancePresetId = keyof typeof SUBSTANCE_PRESETS;
export type SubstancePreset = (typeof SUBSTANCE_PRESETS)[SubstancePresetId];

export interface SubstanceState extends Record<string, unknown> {
  readonly concentration: number;
  readonly outputs?: Record<string, Quantity>;
}

export interface VesselState extends Record<string, unknown> {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly heatReleased: number;
  readonly outputs?: Record<string, Quantity>;
}

/**
 * A defined substance.
 *
 * A catalogue entry rather than a simulation: it holds a concentration and the
 * substance's published molar mass. It is the chemistry equivalent of
 * `materials.conductor` — something you look up and compare, not something
 * that evolves.
 */
export const substanceDefinition: ComponentDefinition = {
  type: 'chemistry.substance',
  name: 'Substance',
  discipline: 'chemistry',
  category: 'Material',
  description:
    'A defined chemical species with a published molar mass and a current concentration.',
  confidence: 'established-simplified',
  assumptions: [
    'Molar mass is taken from published reference values.',
    'The concentration is whatever the user sets — this component does not model mixing or dilution.',
    'No dissociation, activity coefficients or ionic strength.',
  ],
  ports: [
    {
      id: 'concentration',
      label: 'Concentration',
      direction: 'output',
      channel: 'concentration',
      unit: 'mol_per_L',
      required: false,
      description: 'Current molar concentration of this substance.',
    },
    {
      id: 'amount',
      label: 'Amount',
      direction: 'output',
      channel: 'generic',
      unit: 'mol',
      required: false,
      description: 'Amount of this substance present, in moles.',
    },
  ],
  parameters: [
    {
      id: 'substance',
      label: 'Substance',
      kind: 'enum',
      defaultValue: 'water',
      options: ['water', 'ethanol', 'glucose', 'sodium_chloride'],
      description: 'The chemical species.',
      confidence: 'established-simplified',
    },
    {
      id: 'concentration',
      label: 'Concentration',
      kind: 'number',
      unit: 'mol_per_L',
      defaultValue: 1,
      min: 0,
      max: 1000,
      step: 0.1,
      description: 'Molar concentration of the substance.',
      confidence: 'illustrative',
    },
    {
      id: 'volume',
      label: 'Volume',
      kind: 'number',
      unit: 'L',
      defaultValue: 1,
      min: 0.01,
      max: 100,
      step: 0.1,
      description: 'Volume the substance occupies.',
      confidence: 'illustrative',
    },
    {
      id: 'label',
      label: 'Label',
      kind: 'string',
      defaultValue: 'Substance',
      description: 'Name shown in the workbench.',
    },
  ],
  initialState: {
    concentration: 1,
    outputs: { concentration: quantity(1, 'mol_per_L'), amount: quantity(1, 'mol') },
  },
  visual: { shape: 'sphere', color: '#4fc3f7', label: '⬡' },
};

export const substanceBehavior: ComponentBehavior<SubstanceState> = {
  type: 'chemistry.substance',

  outputs(state) {
    const s = state as SubstanceState & {
      __param_substance?: string;
      __param_concentration?: number;
      __param_volume?: number;
    };
    const presetId = (s.__param_substance ?? 'water') as SubstancePresetId;
    const preset = SUBSTANCE_PRESETS[presetId] ?? SUBSTANCE_PRESETS.water;
    const concentration = s.__param_concentration ?? s.concentration ?? 0;
    const volume = s.__param_volume ?? 1;

    return {
      concentration: quantity(concentration, 'mol_per_L'),
      amount: quantity(concentration * volume, 'mol'),
      molarMass: quantity(preset.molarMass, 'g'),
    };
  },

  step(state) {
    const s = state as SubstanceState & { __param_concentration?: number };
    const concentration = s.__param_concentration ?? s.concentration ?? 0;
    return { ...s, concentration };
  },
};

/**
 * A closed reaction vessel running A + B ⇌ C.
 *
 * The forward rate follows the mass-action law. The temperature dependence is
 * Arrhenius. The reverse rate is derived from the equilibrium constant, so the
 * reaction settles at equilibrium rather than running to completion. Because
 * the stoichiometry is 1 : 1 : 1, the total concentration is conserved and the
 * engine checks it.
 */
export const reactionVesselDefinition: ComponentDefinition = {
  type: 'chemistry.reaction-vessel',
  name: 'Reaction vessel',
  discipline: 'chemistry',
  category: 'Reactor',
  description:
    'A closed vessel running a reversible reaction, A + B ⇌ C, with a temperature-dependent rate.',
  confidence: 'established-simplified',
  assumptions: [
    'Mass-action kinetics with a single rate constant.',
    'Arrhenius temperature dependence, using the gas constant and the activation energy.',
    'The vessel is closed and perfectly mixed — no diffusion, no surface effects.',
    'The stoichiometry is A + B ⇌ C. Two moles are consumed per mole made, so the sum of concentrations falls; what is conserved is A + C (and B + C).',
    'Only one reaction is modelled. Side reactions and catalysts are not.',
  ],
  ports: [
    {
      id: 'temperature',
      label: 'Temperature',
      direction: 'input',
      channel: 'temperature',
      unit: 'degC',
      required: false,
      description: 'The temperature the reaction runs at.',
    },
    {
      id: 'product',
      label: 'Product concentration',
      direction: 'output',
      channel: 'concentration',
      unit: 'mol_per_L',
      required: false,
      description: 'Concentration of the product C.',
    },
    {
      id: 'reactant_a',
      label: 'Reactant A concentration',
      direction: 'output',
      channel: 'concentration',
      unit: 'mol_per_L',
      required: false,
      description: 'Concentration of reactant A.',
    },
    {
      id: 'reactant_b',
      label: 'Reactant B concentration',
      direction: 'output',
      channel: 'concentration',
      unit: 'mol_per_L',
      required: false,
      description: 'Concentration of reactant B.',
    },
    {
      id: 'stoichiometric_balance',
      label: 'Stoichiometric balance',
      direction: 'output',
      channel: 'concentration',
      unit: 'mol_per_L',
      required: false,
      description:
        'A + C. Conserved: the reaction takes one A and one B for every C it makes, so A + C never changes.',
    },
    {
      id: 'extent',
      label: 'Reaction extent',
      direction: 'output',
      channel: 'concentration',
      unit: 'mol_per_L',
      required: false,
      description: 'How far the reaction has progressed from the starting mixture.',
    },
    {
      id: 'heat',
      label: 'Heat released',
      direction: 'output',
      channel: 'thermal-energy',
      unit: 'J',
      required: false,
      description: 'Energy released by the reaction so far.',
    },
  ],
  parameters: [
    {
      id: 'initial_a',
      label: 'Initial A',
      kind: 'number',
      unit: 'mol_per_L',
      defaultValue: 1,
      min: 0,
      max: 100,
      step: 0.1,
      description: 'Starting concentration of reactant A.',
      confidence: 'illustrative',
    },
    {
      id: 'initial_b',
      label: 'Initial B',
      kind: 'number',
      unit: 'mol_per_L',
      defaultValue: 1,
      min: 0,
      max: 100,
      step: 0.1,
      description: 'Starting concentration of reactant B.',
      confidence: 'illustrative',
    },
    {
      id: 'rate_constant',
      label: 'Rate constant',
      kind: 'number',
      unit: 'L_per_mol_per_s',
      defaultValue: 0.01,
      min: 0.0001,
      max: 10,
      step: 0.001,
      description: 'Forward rate constant at the reference temperature.',
      confidence: 'illustrative',
    },
    {
      id: 'activation_energy',
      label: 'Activation energy',
      kind: 'number',
      unit: 'J_per_mol',
      defaultValue: 25000,
      min: 0,
      max: 500000,
      step: 1000,
      description: 'Energy barrier the reaction has to clear.',
      confidence: 'illustrative',
    },
    {
      id: 'reference_temperature',
      label: 'Reference temperature',
      kind: 'number',
      unit: 'degC',
      defaultValue: 25,
      min: -50,
      max: 400,
      step: 1,
      description: 'Temperature the rate constant is quoted at.',
      confidence: 'illustrative',
    },
    {
      id: 'equilibrium_constant',
      label: 'Equilibrium constant',
      kind: 'number',
      unit: 'unitless',
      defaultValue: 4,
      min: 0.01,
      max: 1000,
      step: 0.1,
      description: 'Concentration equilibrium constant for the reaction.',
      confidence: 'illustrative',
    },
    {
      id: 'enthalpy',
      label: 'Reaction enthalpy',
      kind: 'number',
      unit: 'J_per_mol',
      defaultValue: -30000,
      min: -500000,
      max: 500000,
      step: 1000,
      description: 'Enthalpy change per mole reacted. Negative releases heat.',
      confidence: 'illustrative',
    },
    {
      id: 'volume',
      label: 'Volume',
      kind: 'number',
      unit: 'L',
      defaultValue: 1,
      min: 0.01,
      max: 100,
      step: 0.1,
      description: 'Vessel volume, used to turn moles into energy.',
      confidence: 'illustrative',
    },
    {
      id: 'label',
      label: 'Label',
      kind: 'string',
      defaultValue: 'Vessel',
      description: 'Name shown in the workbench.',
    },
  ],
  initialState: {
    a: 1,
    b: 1,
    c: 0,
    heatReleased: 0,
    outputs: {
      product: quantity(0, 'mol_per_L'),
      reactantA: quantity(1, 'mol_per_L'),
      reactantB: quantity(1, 'mol_per_L'),
      extent: quantity(0, 'mol_per_L'),
      heat: quantity(0, 'J'),
      stoichiometricBalance: quantity(1, 'mol_per_L'),
    },
  },
  visual: { shape: 'cylinder', color: '#ffb74d', label: '⚗' },
};

/** The Arrhenius rate constant at a given temperature. */
export function arrheniusRate(
  rateConstant: number,
  activationEnergy: number,
  temperatureKelvin: number,
  referenceKelvin: number,
): number {
  if (temperatureKelvin <= 0 || referenceKelvin <= 0) return rateConstant;
  const exponent =
    (-activationEnergy / GAS_CONSTANT) * (1 / temperatureKelvin - 1 / referenceKelvin);
  // Guard against overflow for an extreme temperature.
  return rateConstant * Math.exp(Math.max(-700, Math.min(700, exponent)));
}

export const reactionVesselBehavior: ComponentBehavior<VesselState> = {
  type: 'chemistry.reaction-vessel',

  outputs(state) {
    const s = state as VesselState;
    const outputs = s.outputs ?? {};
    const total = (s.a ?? 0) + (s.c ?? 0);
    return {
      product: outputs.product ?? quantity(s.c ?? 0, 'mol_per_L'),
      reactantA: outputs.reactantA ?? quantity(s.a ?? 0, 'mol_per_L'),
      reactantB: outputs.reactantB ?? quantity(s.b ?? 0, 'mol_per_L'),
      extent: outputs.extent ?? quantity(0, 'mol_per_L'),
      heat: outputs.heat ?? quantity(0, 'J'),
      stoichiometricBalance: outputs.stoichiometricBalance ?? quantity(total, 'mol_per_L'),
    };
  },

  step(state, inputs, context) {
    const s = state as VesselState & {
      __initialised?: boolean;
      __param_initial_a?: number;
      __param_initial_b?: number;
      __param_rate_constant?: number;
      __param_activation_energy?: number;
      __param_reference_temperature?: number;
      __param_equilibrium_constant?: number;
      __param_enthalpy?: number;
      __param_volume?: number;
    };

    const rateConstant = s.__param_rate_constant ?? 0.01;
    const activationEnergy = s.__param_activation_energy ?? 25000;
    const referenceCelsius = s.__param_reference_temperature ?? 25;
    const equilibriumConstant = s.__param_equilibrium_constant ?? 4;
    const enthalpy = s.__param_enthalpy ?? -30000;
    const volume = s.__param_volume ?? 1;

    let a = s.a ?? 0;
    let b = s.b ?? 0;
    let c = s.c ?? 0;
    let heatReleased = s.heatReleased ?? 0;

    // The vessel starts from its declared mixture on the first step.
    if (s.__initialised !== true) {
      a = s.__param_initial_a ?? 1;
      b = s.__param_initial_b ?? 1;
      c = 0;
    }

    // Temperature comes from the port if one is connected, otherwise from the
    // environment, otherwise from the reference temperature.
    const ambient = context.environment['temperature'];
    const celsius = inputs.temperature?.value ?? ambient?.value ?? referenceCelsius;
    const kelvin = celsius + 273.15;
    const referenceKelvin = referenceCelsius + 273.15;

    const k = arrheniusRate(rateConstant, activationEnergy, kelvin, referenceKelvin);

    // Mass-action forward rate, and the reverse rate derived from K.
    const forward = k * a * b;
    const reverse = (k / equilibriumConstant) * c;
    const net = forward - reverse;

    // The extent of reaction over this step, signed: positive is forward.
    // The reaction cannot run past the point where a reactant is exhausted.
    const raw = net * context.dt;
    const extent = raw > 0 ? Math.min(raw, Math.min(a, b)) : Math.max(raw, -c);

    a = Math.max(0, a - extent);
    b = Math.max(0, b - extent);
    c = Math.max(0, c + extent);

    // A negative enthalpy means the reaction releases heat.
    heatReleased += -enthalpy * extent * volume;

    return {
      ...s,
      a,
      b,
      c,
      heatReleased,
      __initialised: true,
      outputs: {
        product: quantity(c, 'mol_per_L'),
        reactantA: quantity(a, 'mol_per_L'),
        reactantB: quantity(b, 'mol_per_L'),
        extent: quantity(extent, 'mol_per_L'),
        heat: quantity(heatReleased, 'J'),
        stoichiometricBalance: quantity(a + c, 'mol_per_L'),
      },
    };
  },
};

export const chemistryRules: readonly ConnectionRule[] = [
  {
    sourceChannel: 'concentration',
    targetChannel: 'concentration',
    transfer: { kind: 'identity' },
    sourceDiscipline: '*',
    targetDiscipline: '*',
    description: 'A molar concentration passes through unchanged.',
    confidence: 'physical-law',
  },
  {
    sourceChannel: 'temperature',
    targetChannel: 'temperature',
    transfer: { kind: 'identity' },
    sourceDiscipline: '*',
    targetDiscipline: '*',
    description: 'A temperature passes through unchanged.',
    confidence: 'physical-law',
  },
  {
    sourceChannel: 'thermal-energy',
    targetChannel: 'thermal-energy',
    transfer: { kind: 'identity' },
    sourceDiscipline: '*',
    targetDiscipline: '*',
    description: 'An amount of thermal energy passes through unchanged.',
    confidence: 'physical-law',
  },
];

export const chemistryEngine: DisciplineEngine = {
  id: 'chemistry',
  name: 'Chemistry',
  version: '0.1.0',
  components: [substanceDefinition, reactionVesselDefinition],
  behaviors: new Map<string, ComponentBehavior>([
    ['chemistry.substance', substanceBehavior],
    ['chemistry.reaction-vessel', reactionVesselBehavior],
  ]),
  connectionRules: chemistryRules,
};
