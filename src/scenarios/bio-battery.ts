import type { ExperimentDefinition } from '../kernel/types';

/** A nutrient-powered living cell that drives a real electronic load. */
export function createBioBattery(): ExperimentDefinition {
  return {
    id: 'bio-battery',
    name: 'Bio-Battery',
    description: 'Nutrient activity powers a living electrochemical cell, which drives a resistor and lights an LED.',
    discipline: 'biology + electronics',
    tags: ['biology', 'chemistry', 'electronics', 'frankenstein'],
    modelVersion: '1.0.0',
    dt: 3600,
    duration: 86400 * 10,
    seed: 20261108,
    trackedSeries: [
      { key: 'cell.voltage', label: 'Cell voltage', colour: '#4fd1c5' },
      { key: 'cell.activity', label: 'Cell activity', colour: '#7bc96f' },
      { key: 'load.current', label: 'Load current', colour: '#f0b350' },
      { key: 'indicator.brightness', label: 'LED brightness', colour: '#ef6461' },
    ],
    components: [
      { id: 'nutrients', type: 'biology.nutrient-source', label: 'Nutrient feed', position: { x: -4, y: 0, z: 0 }, parameters: { capacity: { value: 1, unit: 'ratio' }, regeneration: { value: 0, unit: 'ratio' }, label: { value: 'Feed' } } },
      { id: 'cell', type: 'biology.bio-battery', label: 'Bio-cell', position: { x: -1.5, y: 0.8, z: 0 }, parameters: { max_voltage: { value: 3.2, unit: 'V' }, label: { value: 'BIO-1' } } },
      { id: 'load', type: 'electronics.resistor', label: 'Load resistor', position: { x: 1.5, y: 0.8, z: 0 }, parameters: { resistance: { value: 220, unit: 'ohm' }, label: { value: 'RLOAD' } } },
      { id: 'indicator', type: 'electronics.led', label: 'Indicator LED', position: { x: 4.2, y: 0.8, z: 0 }, parameters: { forward_voltage: { value: 2, unit: 'V' }, max_current: { value: 20, unit: 'mA' }, label: { value: 'LED1' } } },
    ],
    connections: [
      { id: 'c-feed-cell', source: { componentId: 'nutrients', portId: 'availability' }, target: { componentId: 'cell', portId: 'nutrient' }, channel: 'nutrient', transfer: { kind: 'identity' }, label: 'Nutrient activity' },
      { id: 'c-cell-load', source: { componentId: 'cell', portId: 'positive' }, target: { componentId: 'load', portId: 'terminal_a' }, channel: 'electrical-potential', transfer: { kind: 'identity' }, label: 'Bioelectric output' },
      { id: 'c-load-return', source: { componentId: 'load', portId: 'terminal_b' }, target: { componentId: 'cell', portId: 'negative' }, channel: 'electrical-potential', transfer: { kind: 'identity' }, label: 'Load return path' },
      { id: 'c-activity-indicator', source: { componentId: 'cell', portId: 'activity' }, target: { componentId: 'indicator', portId: 'trigger' }, channel: 'signal', transfer: { kind: 'identity' }, label: 'Living activity signal' },
    ],
    environment: { variables: [] },
  };
}
