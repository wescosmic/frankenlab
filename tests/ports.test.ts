/**
 * FrankenLab — the port contract.
 *
 * A connection is resolved by looking up the source component's port id in
 * the values that component publishes. So a value published under any other
 * name is a value no wire can ever carry: the port looks empty, the circuit
 * does not close, and the reading quietly reads zero.
 *
 * That failure is invisible from the outside, so it gets a test. This file
 * wires every component in the world into one graph and checks that:
 *
 *   1. every component type in the world is covered here
 *   2. every output port publishes a value under its own port id
 *   3. every published value is either a port or a declared reading
 *
 * The chemistry vessel broke rule 2 for a while: it published
 * `stoichiometricBalance` while the port was called `stoichiometric_balance`,
 * so the conservation reading could never be read off a wire.
 */

import { describe, expect, it } from 'vitest';
import { Simulation } from '@/kernel/simulator';
import { createWorld } from '@/world';
import type { ExperimentDefinition } from '@/kernel/types';

const registry = createWorld();

/**
 * Every component in the world, in one graph.
 *
 * The wiring is the flagship's wiring, minus the parts that would need a
 * second battery. The switch and the two chemistry parts are left unconnected
 * on purpose: a user can drag any part onto the bench, and a part that breaks
 * the circuit solve when it is not wired in is a bug in the bench.
 */
function createHarness(): ExperimentDefinition {
  return {
    id: 'port-harness',
    name: 'Port harness',
    description: 'Every component in the world, wired together.',
    discipline: 'cross-disciplinary',
    tags: ['test'],
    modelVersion: '1.0.0',
    dt: 3600,
    duration: 3600,
    seed: 7,
    components: [
      {
        id: 'battery',
        type: 'electronics.voltage-source',
        label: 'Battery',
        position: { x: -4, y: -2, z: 0 },
        parameters: { voltage: { value: 5, unit: 'V' }, label: { value: 'V1' } },
      },
      {
        id: 'probe',
        type: 'electronics.sensor',
        label: 'Probe',
        position: { x: -4, y: 0, z: 0 },
        parameters: {
          resistance_at_zero: { value: 40, unit: 'kohm' },
          resistance_at_full: { value: 1, unit: 'kohm' },
          label: { value: 'S1' },
        },
      },
      {
        id: 'reference',
        type: 'electronics.resistor',
        label: 'Reference resistor',
        position: { x: -1, y: 0, z: 0 },
        parameters: { resistance: { value: 10_000, unit: 'ohm' }, label: { value: 'R1' } },
      },
      {
        id: 'comparator',
        type: 'electronics.comparator',
        label: 'Comparator',
        position: { x: 2, y: 0, z: 0 },
        parameters: { threshold: { value: 0.4, unit: 'ratio' }, invert: { value: true } },
      },
      {
        id: 'alert',
        type: 'electronics.led',
        label: 'Alert LED',
        position: { x: 5, y: 0, z: 0 },
        parameters: {
          forward_voltage: { value: 2, unit: 'V' },
          max_current: { value: 20, unit: 'mA' },
        },
      },
      {
        id: 'spare',
        type: 'electronics.switch',
        label: 'Spare switch',
        position: { x: -7, y: 2, z: 0 },
        parameters: { closed: { value: true } },
      },
      {
        id: 'medium',
        type: 'materials.substrate',
        label: 'Substrate',
        position: { x: -4, y: 2.5, z: 0 },
        parameters: {
          preset: { value: 'sandy' },
          volume: { value: 500, unit: 'cm3' },
          initial_fill: { value: 1, unit: 'ratio' },
        },
      },
      {
        id: 'plant',
        type: 'biology.plant',
        label: 'Plant',
        position: { x: -4, y: 4, z: 0 },
        parameters: {
          max_biomass: { value: 1, unit: 'ratio' },
          growth_rate: { value: 0.08 },
          water_optimum: { value: 0.6, unit: 'ratio' },
          nutrient_optimum: { value: 0.5, unit: 'ratio' },
        },
      },
      {
        id: 'nutrients',
        type: 'biology.nutrient-source',
        label: 'Nutrients',
        position: { x: -7, y: 3.5, z: 0 },
        parameters: { capacity: { value: 1, unit: 'ratio' }, regeneration: { value: 0.01 } },
      },
      {
        id: 'irrigation',
        type: 'biology.moisture-source',
        label: 'Irrigation',
        position: { x: -7, y: 1.5, z: 0 },
        parameters: { rate: { value: 0 } },
      },
      {
        id: 'bio-battery',
        type: 'biology.bio-battery',
        label: 'Bio-battery',
        position: { x: 0, y: 6, z: 0 },
        parameters: { max_voltage: { value: 3.2, unit: 'V' } },
      },
      {
        id: 'conductor',
        type: 'materials.conductor',
        label: 'Copper wire',
        position: { x: 2, y: 3, z: 0 },
        parameters: {
          material: { value: 'copper' },
          cross_section: { value: 2, unit: 'mm' },
          length: { value: 1, unit: 'm' },
        },
      },
      {
        id: 'substance',
        type: 'chemistry.substance',
        label: 'Substance',
        position: { x: 5, y: 3, z: 0 },
        parameters: {
          substance: { value: 'water' },
          concentration: { value: 1, unit: 'mol_per_L' },
          volume: { value: 1, unit: 'L' },
        },
      },
      {
        id: 'vessel',
        type: 'chemistry.reaction-vessel',
        label: 'Vessel',
        position: { x: 5, y: 5, z: 0 },
        parameters: {
          initial_a: { value: 1, unit: 'mol_per_L' },
          initial_b: { value: 1, unit: 'mol_per_L' },
          rate_constant: { value: 0.01, unit: 'L_per_mol_per_s' },
          equilibrium_constant: { value: 4, unit: 'unitless' },
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
      },
      {
        id: 'c-probe-reference',
        source: { componentId: 'probe', portId: 'terminal_b' },
        target: { componentId: 'reference', portId: 'terminal_a' },
        channel: 'electrical-potential',
        transfer: { kind: 'identity' },
      },
      {
        id: 'c-reference-ground',
        source: { componentId: 'reference', portId: 'terminal_b' },
        target: { componentId: 'battery', portId: 'negative' },
        channel: 'electrical-potential',
        transfer: { kind: 'identity' },
      },
      {
        id: 'c-probe-comparator',
        source: { componentId: 'probe', portId: 'signal' },
        target: { componentId: 'comparator', portId: 'input' },
        channel: 'signal',
        transfer: { kind: 'identity' },
      },
      {
        id: 'c-comparator-alert',
        source: { componentId: 'comparator', portId: 'output' },
        target: { componentId: 'alert', portId: 'trigger' },
        channel: 'signal',
        transfer: { kind: 'identity' },
      },
      {
        id: 'c-medium-probe',
        source: { componentId: 'medium', portId: 'moisture' },
        target: { componentId: 'probe', portId: 'sense' },
        channel: 'moisture',
        transfer: { kind: 'identity' },
      },
      {
        id: 'c-medium-plant',
        source: { componentId: 'medium', portId: 'moisture' },
        target: { componentId: 'plant', portId: 'water' },
        channel: 'moisture',
        transfer: { kind: 'identity' },
      },
      {
        id: 'c-nutrients-plant',
        source: { componentId: 'nutrients', portId: 'availability' },
        target: { componentId: 'plant', portId: 'nutrients' },
        channel: 'nutrient',
        transfer: { kind: 'identity' },
      },
      {
        id: 'c-plant-nutrients',
        source: { componentId: 'plant', portId: 'nutrientDemand' },
        target: { componentId: 'nutrients', portId: 'demand' },
        channel: 'nutrient',
        transfer: { kind: 'identity' },
      },
      {
        id: 'c-plant-medium',
        source: { componentId: 'plant', portId: 'transpiration' },
        target: { componentId: 'medium', portId: 'uptake' },
        channel: 'moisture',
        transfer: { kind: 'identity' },
      },
      {
        id: 'c-irrigation-medium',
        source: { componentId: 'irrigation', portId: 'supply' },
        target: { componentId: 'medium', portId: 'supply' },
        channel: 'moisture',
        transfer: { kind: 'identity' },
      },
      {
        id: 'c-battery-conductor',
        source: { componentId: 'battery', portId: 'positive' },
        target: { componentId: 'conductor', portId: 'potential' },
        channel: 'electrical-potential',
        transfer: { kind: 'identity' },
      },
    ],
    environment: { variables: [] },
  };
}

describe('the port contract', () => {
  const harness = createHarness();

  it('covers every component type in the world', () => {
    const worldTypes = new Set(
      registry
        .listDisciplines()
        .flatMap((discipline) => discipline.components.map((definition) => definition.type)),
    );
    const harnessTypes = new Set(harness.components.map((instance) => instance.type));

    expect([...worldTypes].sort()).toEqual([...harnessTypes].sort());
  });

  it('runs the whole world on one graph without breaking the circuit solve', () => {
    const result = new Simulation(harness, registry).run();

    expect(result.success).toBe(true);
    // The divider really was solved. A singular matrix would read zero here.
    expect(result.measurements['probe.signal']?.value).toBeGreaterThan(0);
  });

  it('publishes every output port under its own port id', () => {
    const result = new Simulation(harness, registry).run();

    for (const instance of harness.components) {
      const definition = registry.getDefinition(instance.type);
      for (const port of definition.ports.filter((entry) => entry.direction === 'output')) {
        const key = `${instance.id}.${port.id}`;
        expect(result.measurements[key], `${instance.type} does not publish "${port.id}"`).toBeDefined();
      }
    }
  });

  it('publishes nothing that is not a port or a declared reading', () => {
    const result = new Simulation(harness, registry).run();

    for (const instance of harness.components) {
      const definition = registry.getDefinition(instance.type);
      const known = new Set([
        ...definition.ports.map((port) => port.id),
        ...(definition.readings ?? []).map((reading) => reading.id),
      ]);

      for (const key of Object.keys(result.measurements)) {
        if (!key.startsWith(`${instance.id}.`)) continue;
        const name = key.slice(instance.id.length + 1);
        expect(known.has(name), `${instance.type} publishes undeclared "${name}"`).toBe(true);
      }
    }
  });
});
