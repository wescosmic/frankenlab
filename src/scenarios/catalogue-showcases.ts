/**
 * FrankenLab showcase experiments for the expanded component catalogue.
 *
 * These are intentionally small starter benches. They make the new inventory
 * objects immediately discoverable while the user remains free to wire a more
 * ambitious version on the shared workbench.
 */

import type { ExperimentDefinition } from '@/kernel/types';

const part = (id: string, type: string, label: string, x: number, y: number) => ({
  id,
  type,
  label,
  position: { x, y, z: 0 },
  parameters: { label: { value: label } },
});

export function createMicrobialFuelCell(): ExperimentDefinition {
  return {
    id: 'microbial-fuel-cell',
    name: 'Microbial Fuel Cell',
    description: 'A culture, electrode and capacitor form a living energy experiment.',
    discipline: 'biology + materials + electronics',
    tags: ['biology', 'materials', 'electronics', 'energy'],
    modelVersion: '1.0.0',
    dt: 3600,
    duration: 86400 * 3,
    seed: 20261109,
    trackedSeries: [
      { key: 'culture.biomass', label: 'Culture biomass', colour: '#7bc96f' },
      { key: 'electrode.activity', label: 'Electrode activity', colour: '#c2a084' },
    ],
    components: [
      part('culture', 'biology.microbial-culture', 'Culture flask', -3.5, 0),
      part('electrode', 'materials.electrode', 'Bio-electrode', -0.5, 0),
      part('capacitor', 'electronics.capacitor', 'Storage capacitor', 2.5, 0),
      part('logger', 'electronics.data-logger', 'Data logger', 5, 0),
    ],
    connections: [],
    environment: { variables: [] },
  };
}

export function createEnzymeOptimisation(): ExperimentDefinition {
  return {
    id: 'enzyme-optimisation',
    name: 'Enzyme Optimisation',
    description: 'Explore how substrate, pH and temperature shape a catalytic system.',
    discipline: 'biology + chemistry',
    tags: ['biology', 'chemistry', 'discovery'],
    modelVersion: '1.0.0',
    dt: 3600,
    duration: 86400 * 2,
    seed: 20261110,
    trackedSeries: [
      { key: 'enzyme.activity', label: 'Enzyme activity', colour: '#7bc96f' },
      { key: 'ph.measurement', label: 'pH measurement', colour: '#f0b350' },
    ],
    components: [
      part('enzyme', 'biology.enzyme', 'Catalytic enzyme', -3.5, 0),
      part('ph', 'chemistry.ph-meter', 'pH meter', -0.5, 0),
      part('bath', 'chemistry.heat-bath', 'Heat bath', 2.5, 0),
      part('logger', 'electronics.data-logger', 'Data logger', 5, 0),
    ],
    connections: [],
    environment: { variables: [] },
  };
}

export function createWaterPurification(): ExperimentDefinition {
  return {
    id: 'water-purification',
    name: 'Water Purification',
    description: 'Compare a membrane, filter media and separator as a purification train.',
    discipline: 'biology + chemistry + materials',
    tags: ['chemistry', 'materials', 'water'],
    modelVersion: '1.0.0',
    dt: 3600,
    duration: 86400,
    seed: 20261111,
    trackedSeries: [
      { key: 'membrane.permeate', label: 'Membrane permeate', colour: '#4fc3f7' },
      { key: 'filter.filtrate', label: 'Filter filtrate', colour: '#c2a084' },
      { key: 'separator.separated', label: 'Separated fraction', colour: '#f0b350' },
    ],
    components: [
      part('membrane', 'biology.membrane', 'Selective membrane', -4, 0),
      part('filter', 'materials.filter-media', 'Filter media', -1, 0),
      part('separator', 'chemistry.separator', 'Separator', 2, 0),
      part('logger', 'electronics.data-logger', 'Data logger', 5, 0),
    ],
    connections: [],
    environment: { variables: [] },
  };
}
