/**
 * FrankenLab's catalogue extensions.
 *
 * These are deliberately small teaching components. They give the inventory
 * useful, recognisable laboratory objects and expose honest signal contracts;
 * deeper domain models can replace each behaviour without changing the UI or
 * experiment format.
 */

import type { ComponentBehavior, ComponentDefinition, ComponentState, DisciplineId, PortDefinition, Quantity } from '../kernel/types';
import { quantity } from '../kernel/units';
import { COMPONENT_MODEL_ALT, COMPONENT_MODEL_PATHS } from '../visual-assets';

type CatalogueDefinition = ComponentDefinition & { readonly discipline: DisciplineId };

const labelParameter = (value: string) => ({
  id: 'label',
  label: 'Label',
  kind: 'string' as const,
  defaultValue: value,
  description: 'Name shown in the workbench.',
});

function makeDefinition(
  type: string,
  name: string,
  discipline: DisciplineId,
  category: string,
  description: string,
  ports: readonly PortDefinition[],
  outputDefaults: Readonly<Record<string, Quantity>>,
  shape: ComponentDefinition['visual']['shape'],
  colour: string,
  kind: NonNullable<ComponentDefinition['inventoryVisual']>['kind'] = 'technical-render',
): CatalogueDefinition {
  return {
    type, name, discipline, category, description, ports,
    parameters: [labelParameter(name)],
    initialState: { outputs: outputDefaults },
    confidence: 'illustrative',
    assumptions: [
      'This is a bounded teaching model, not a calibrated instrument or clinical prediction.',
      'The component publishes normalised signals unless a port states a physical unit.',
      'Unmodelled geometry, noise and material-specific variation are omitted.',
    ],
    visual: { shape, color: colour, label: name.slice(0, 2).toUpperCase() },
    inventoryVisual: {
      model: COMPONENT_MODEL_PATHS[type] ?? `/assets/glb/${shape}.glb`,
      thumbnail: `/assets/inventory/${shape}.svg`,
      alt: COMPONENT_MODEL_ALT[type] ?? `${name} technical ${kind}`,
      kind,
    },
  };
}

function passThroughBehaviour(type: string): ComponentBehavior {
  return {
    type,
    outputs(state) {
      return ((state as ComponentState & { outputs?: Readonly<Record<string, Quantity>> }).outputs ?? {});
    },
    step(state, inputs) {
      const current = (state as ComponentState & { outputs?: Readonly<Record<string, Quantity>> }).outputs ?? {};
      const next = { ...current };
      for (const [port, value] of Object.entries(inputs)) next[port] = value;
      return { ...state, outputs: next };
    },
  };
}

const input = (id: string, label: string, channel: PortDefinition['channel'], unit: string): PortDefinition => ({ id, label, direction: 'input', channel, unit, required: false, description: `${label} entering the component.` });
const output = (id: string, label: string, channel: PortDefinition['channel'], unit: string): PortDefinition => ({ id, label, direction: 'output', channel, unit, required: false, description: `${label} published by the component.` });

export const catalogueDefinitions: readonly CatalogueDefinition[] = [
  makeDefinition('biology.microbial-culture', 'Microbial culture', 'biology', 'Culture', 'A teaching culture that converts nutrient availability into biomass and waste.', [input('nutrient', 'Nutrient feed', 'nutrient', 'ratio'), input('oxygen', 'Oxygen', 'signal', 'ratio'), output('biomass', 'Biomass', 'biomass', 'ratio'), output('waste', 'Waste', 'concentration', 'mol_per_L')], { biomass: quantity(0.2, 'ratio'), waste: quantity(0, 'mol_per_L') }, 'cylinder', '#7bc96f', 'cutaway'),
  makeDefinition('biology.enzyme', 'Enzyme', 'biology', 'Biocatalyst', 'A simplified enzyme that turns substrate availability into product activity.', [input('substrate', 'Substrate', 'concentration', 'mol_per_L'), input('temperature', 'Temperature', 'temperature', 'K'), output('product', 'Product', 'concentration', 'mol_per_L'), output('activity', 'Activity', 'signal', 'ratio')], { product: quantity(0, 'mol_per_L'), activity: quantity(0.5, 'ratio') }, 'organic', '#8bcf6a'),
  makeDefinition('biology.membrane', 'Biological membrane', 'biology', 'Transport', 'A selective barrier that passes part of a feed signal and retains the rest.', [input('feed', 'Feed', 'concentration', 'mol_per_L'), output('permeate', 'Permeate', 'concentration', 'mol_per_L'), output('retained', 'Retained', 'concentration', 'mol_per_L')], { permeate: quantity(0, 'mol_per_L'), retained: quantity(0, 'mol_per_L') }, 'plate', '#65c9a1', 'cutaway'),
  makeDefinition('biology.gas-exchange', 'Gas exchange', 'biology', 'Environment', 'A bounded exchange surface for oxygen and carbon dioxide signals.', [input('oxygen', 'Oxygen', 'signal', 'ratio'), input('activity', 'Activity', 'signal', 'ratio'), output('carbon_dioxide', 'Carbon dioxide', 'signal', 'ratio')], { carbon_dioxide: quantity(0, 'ratio') }, 'organic', '#70b7d8'),
  makeDefinition('chemistry.ph-meter', 'pH meter', 'chemistry', 'Instrument', 'An illustrative probe that reports acidity from a sample signal.', [input('sample', 'Sample', 'concentration', 'mol_per_L'), output('measurement', 'pH', 'signal', 'ratio')], { measurement: quantity(0.5, 'ratio') }, 'box', '#f0b350'),
  makeDefinition('chemistry.catalyst-bed', 'Catalyst bed', 'chemistry', 'Reactor', 'A packed catalyst cartridge that increases the fraction of reactant converted.', [input('reactant', 'Reactant', 'concentration', 'mol_per_L'), output('product', 'Product', 'concentration', 'mol_per_L'), output('activity', 'Activity', 'signal', 'ratio')], { product: quantity(0, 'mol_per_L'), activity: quantity(0.8, 'ratio') }, 'cylinder', '#e39a35', 'cutaway'),
  makeDefinition('chemistry.heat-bath', 'Heat bath', 'chemistry', 'Thermal control', 'A benchtop bath that provides a controlled temperature signal.', [input('vessel', 'Vessel', 'thermal-energy', 'J'), output('temperature', 'Temperature', 'temperature', 'K')], { temperature: quantity(298.15, 'K') }, 'box', '#e07855'),
  makeDefinition('chemistry.separator', 'Separator', 'chemistry', 'Purification', 'A teaching separator that divides a mixture into product and waste streams.', [input('mixture', 'Mixture', 'concentration', 'mol_per_L'), output('separated', 'Separated', 'concentration', 'mol_per_L'), output('waste', 'Waste', 'concentration', 'mol_per_L')], { separated: quantity(0, 'mol_per_L'), waste: quantity(0, 'mol_per_L') }, 'cylinder', '#d7a64a', 'cutaway'),
  makeDefinition('electronics.capacitor', 'Capacitor', 'electronics', 'Energy storage', 'A simplified capacitor that stores an electrical potential for later release.', [input('terminal_a', 'Positive terminal', 'electrical-potential', 'V'), input('terminal_b', 'Negative terminal', 'electrical-potential', 'V'), output('voltage', 'Stored voltage', 'electrical-potential', 'V')], { voltage: quantity(0, 'V') }, 'cylinder', '#ef6461', 'technical-render'),
  makeDefinition('electronics.photovoltaic-cell', 'Photovoltaic cell', 'electronics', 'Energy conversion', 'A light-responsive source that converts irradiance into a teaching-scale voltage.', [input('light', 'Irradiance', 'signal', 'ratio'), output('positive', 'Positive terminal', 'electrical-potential', 'V'), output('negative', 'Negative terminal', 'electrical-potential', 'V'), output('power', 'Power', 'electrical-power', 'W')], { positive: quantity(2.5, 'V'), negative: quantity(0, 'V'), power: quantity(0, 'W') }, 'plate', '#72a8e8', 'cutaway'),
  makeDefinition('electronics.motor', 'Motor', 'electronics', 'Actuator', 'An illustrative motor that turns electrical input into speed and torque.', [input('voltage', 'Voltage', 'electrical-potential', 'V'), output('speed', 'Speed', 'signal', 'ratio'), output('torque', 'Torque', 'mechanical-force', 'N')], { speed: quantity(0, 'ratio'), torque: quantity(0, 'N') }, 'cylinder', '#d95b63'),
  makeDefinition('electronics.data-logger', 'Data logger', 'electronics', 'Instrument', 'A passive instrument that records a signal without changing its source.', [input('signal', 'Signal', 'signal', 'ratio'), output('recorded', 'Recorded signal', 'signal', 'ratio')], { recorded: quantity(0, 'ratio') }, 'box', '#8d9ee8'),
  makeDefinition('biology.root-system', 'Root system', 'biology', 'Organism', 'A simplified root network that turns water and nutrient availability into uptake.', [input('moisture', 'Moisture', 'moisture', 'ratio'), input('nutrient', 'Nutrient', 'nutrient', 'ratio'), output('uptake', 'Uptake', 'biomass', 'ratio')], { uptake: quantity(0.2, 'ratio') }, 'organic', '#6fae59'),
  makeDefinition('biology.greenhouse', 'Greenhouse', 'biology', 'Environment', 'A controlled growing enclosure with a bounded growth multiplier.', [input('light', 'Light', 'signal', 'ratio'), input('temperature', 'Temperature', 'temperature', 'K'), input('humidity', 'Humidity', 'moisture', 'ratio'), output('growth', 'Growth multiplier', 'growth-rate', 'ratio')], { growth: quantity(0.5, 'ratio') }, 'box', '#77bd8a', 'cutaway'),
  makeDefinition('biology.compost-reactor', 'Compost reactor', 'biology', 'Circular systems', 'A teaching reactor that turns organic feed into heat and nutrient availability.', [input('organic_feed', 'Organic feed', 'nutrient', 'ratio'), output('heat', 'Heat', 'thermal-energy', 'J'), output('nutrient', 'Nutrient output', 'nutrient', 'ratio')], { heat: quantity(0, 'J'), nutrient: quantity(0.2, 'ratio') }, 'cylinder', '#8d6e63', 'cutaway'),
  makeDefinition('materials.filter-media', 'Filter media', 'materials', 'Separation', 'A porous material that captures a fraction of particles from a mixture.', [input('mixture', 'Mixture', 'concentration', 'mol_per_L'), output('filtrate', 'Filtrate', 'concentration', 'mol_per_L'), output('retained', 'Retained', 'concentration', 'mol_per_L')], { filtrate: quantity(0, 'mol_per_L'), retained: quantity(0, 'mol_per_L') }, 'plate', '#c2a084', 'cutaway'),
  makeDefinition('materials.thermal-mass', 'Thermal mass', 'materials', 'Thermal storage', 'A material block that stores heat and slows temperature changes.', [input('heat', 'Heat input', 'thermal-energy', 'J'), output('temperature', 'Temperature', 'temperature', 'K')], { temperature: quantity(298.15, 'K') }, 'box', '#b78561', 'cutaway'),
  makeDefinition('materials.electrode', 'Electrode', 'materials', 'Electrochemistry', 'A conductive interface that couples an electrolyte signal to an electrical circuit.', [input('electrolyte', 'Electrolyte', 'concentration', 'mol_per_L'), output('positive', 'Positive terminal', 'electrical-potential', 'V'), output('negative', 'Negative terminal', 'electrical-potential', 'V'), output('activity', 'Reaction activity', 'signal', 'ratio')], { positive: quantity(1.1, 'V'), negative: quantity(0, 'V'), activity: quantity(0.4, 'ratio') }, 'plate', '#b5b9c9', 'cutaway'),
  makeDefinition('environment.light-source', 'Light source', 'materials', 'Environment', 'A controllable irradiance source for plant, photovoltaic, and photochemistry experiments.', [output('irradiance', 'Irradiance', 'signal', 'ratio')], { irradiance: quantity(0.8, 'ratio') }, 'sphere', '#f5cf65'),
  makeDefinition('environment.temperature-chamber', 'Temperature chamber', 'materials', 'Environment', 'A bounded chamber that provides a stable temperature signal.', [output('temperature', 'Temperature', 'temperature', 'K')], { temperature: quantity(298.15, 'K') }, 'box', '#8cb8d6', 'cutaway'),
];

export const catalogueBehaviours = new Map(
  catalogueDefinitions.map((definition) => [definition.type, passThroughBehaviour(definition.type)]),
);

export const catalogueByDiscipline = (discipline: DisciplineId) => catalogueDefinitions.filter((definition) => definition.discipline === discipline);
