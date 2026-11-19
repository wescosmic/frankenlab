import type { ComponentBehavior, ParameterDefinition, Quantity } from './types';
import { quantity } from './units';

const bounded = (value: number, max = 1) => Math.min(max, Math.max(0, value));
const control = (id: string, label: string, unit: string, value: number, min: number, max: number, step: number): ParameterDefinition =>
  ({ id, label, unit, kind: 'number', defaultValue: value, min, max, step, description: `${label} for this illustrative teaching model.` });

export const catalogueParameters: Readonly<Record<string, readonly ParameterDefinition[]>> = {
  'environment.light-source': [control('irradiance', 'Light intensity', 'ratio', 0.8, 0, 1, 0.05)],
  'environment.temperature-chamber': [control('temperature', 'Temperature', 'K', 298.15, 273.15, 373.15, 1)],
  'chemistry.heat-bath': [control('temperature', 'Bath setpoint', 'K', 298.15, 273.15, 373.15, 1)],
  'biology.enzyme': [control('optimal_temperature', 'Optimal temperature', 'K', 310.15, 273.15, 373.15, 1)],
};

/** Qualitative signal models, not species-specific chemistry or a transient circuit solver.
 * Memory uses exponential relaxation so both second and hour timesteps remain bounded.
 * Unconnected feeds are zero; ambient temperature/oxygen have explicit defaults.
 */
export function catalogueBehaviour(type: string): ComponentBehavior {
  return {
    type,
    outputs(state) {
      // Source settings apply at t=0 as well as after the first tick.
      if (type === 'environment.light-source') return { irradiance: quantity(bounded(Number(state.__param_irradiance ?? 0.8)), 'ratio') };
      if (type === 'environment.temperature-chamber') return { temperature: quantity(Number(state.__param_temperature ?? 298.15), 'K') };
      return (state.outputs ?? {}) as Readonly<Record<string, Quantity>>;
    },
    step(state, inputs, context) {
      const previous = (state.outputs ?? {}) as Readonly<Record<string, Quantity>>;
      const read = (id: string, fallback = 0) => inputs[id]?.value ?? fallback;
      const ratio = (id: string, fallback = 0) => bounded(read(id, fallback));
      const concentration = (id: string) => bounded(read(id), 100);
      const parameter = (id: string, fallback: number) => Number(state[`__param_${id}`] ?? fallback);
      const relax = (id: string, target: number, seconds: number, initial = 0) =>
        (previous[id]?.value ?? initial) + (target - (previous[id]?.value ?? initial)) * -Math.expm1(-context.dt / seconds);
      let values: Record<string, number>;
      switch (type) {
        case 'biology.microbial-culture': {
          const biomass = relax('biomass', ratio('nutrient') * ratio('oxygen', 0.8), 21600, 0.2);
          values = { biomass, waste: biomass * ratio('nutrient') * 0.1 }; break;
        }
        case 'biology.enzyme': {
          const activity = Math.exp(-(((read('temperature', 298.15) - parameter('optimal_temperature', 310.15)) / 20) ** 2))
            * concentration('substrate') / (0.1 + concentration('substrate'));
          values = { activity, product: concentration('substrate') * activity }; break;
        }
        case 'biology.membrane': values = { permeate: concentration('feed') * 0.3, retained: concentration('feed') * 0.7 }; break;
        case 'biology.gas-exchange': values = { carbon_dioxide: ratio('oxygen') * ratio('activity') }; break;
        case 'chemistry.ph-meter':
          // Sample interpreted as hydrogen-ion concentration; publish pH / 14, as the port promises a ratio.
          values = { measurement: bounded(-Math.log10(Math.max(1e-14, read('sample', 1e-7))) / 14) }; break;
        case 'chemistry.catalyst-bed': values = { product: concentration('reactant') * 0.8, activity: concentration('reactant') > 0 ? 0.8 : 0 }; break;
        case 'chemistry.heat-bath': values = { temperature: relax('temperature', bounded(parameter('temperature', 298.15) + read('vessel') / 4184, 473.15), 600, 298.15) }; break;
        case 'chemistry.separator': values = { separated: concentration('mixture') * 0.8, waste: concentration('mixture') * 0.2 }; break;
        case 'electronics.capacitor': values = { voltage: relax('voltage', bounded(read('terminal_a') - read('terminal_b'), 100), 10) }; break;
        case 'electronics.photovoltaic-cell': values = { positive: ratio('light') * 5, negative: 0, power: ratio('light') * 0.5 }; break;
        case 'electronics.motor': values = { speed: bounded(read('voltage') / 12), torque: bounded(read('voltage') / 12) * 0.1 }; break;
        case 'electronics.data-logger': values = { recorded: ratio('signal') }; break;
        case 'biology.root-system': values = { uptake: Math.min(ratio('moisture'), ratio('nutrient')) }; break;
        case 'biology.greenhouse': values = { growth: ratio('light') * ratio('humidity') * Math.exp(-(((read('temperature', 298.15) - 298.15) / 15) ** 2)) }; break;
        case 'biology.compost-reactor': values = { heat: ratio('organic_feed') * 4184, nutrient: ratio('organic_feed') * 0.6 }; break;
        case 'materials.filter-media': values = { filtrate: concentration('mixture') * 0.2, retained: concentration('mixture') * 0.8 }; break;
        case 'materials.thermal-mass': values = { temperature: relax('temperature', 298.15 + bounded(read('heat'), 1e6) / 1000, 3600, 298.15) }; break;
        case 'materials.electrode': {
          const activity = concentration('electrolyte') / (0.1 + concentration('electrolyte'));
          values = { positive: 1.1 * activity, negative: 0, activity }; break;
        }
        case 'environment.light-source': values = { irradiance: bounded(parameter('irradiance', 0.8)) }; break;
        case 'environment.temperature-chamber': values = { temperature: parameter('temperature', 298.15) }; break;
        default: throw new Error(`Missing catalogue behaviour: ${type}`);
      }
      const outputs = Object.fromEntries(Object.entries(values).map(([id, value]) =>
        [id, quantity(value, previous[id]?.unit ?? 'ratio')]));
      return { ...state, outputs };
    },
  };
}
