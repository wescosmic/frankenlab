import { describe, expect, it } from 'vitest';
import { createWorld } from '@/world';
import { Simulation } from '@/kernel/simulator';
import { validateConnection } from '@/kernel/validate';
import { catalogueDefinitions } from '@/kernel/catalogue-components';
import { createEnzymeOptimisation, createMicrobialFuelCell, createWaterPurification } from '@/scenarios/catalogue-showcases';
import type { Connection, ExperimentDefinition } from '@/kernel/types';
import { useLabStore } from '@/state/lab';
import { TABLE_BOUNDS } from '@/state/placement';

const registry = createWorld();
const graph = (types: string[]): ExperimentDefinition => ({
  id: 'audit', name: 'Audit', description: '', discipline: 'cross-disciplinary', tags: [], modelVersion: '1',
  seed: 1, dt: 3600, duration: 36000, environment: { variables: [] }, connections: [],
  components: types.map((type, i) => ({ id: `part${i}`, type, parameters: {}, position: { x: i * 2, y: 0, z: 0 } })),
});

describe('catalogue audit', () => {
  it.each(catalogueDefinitions)('$type responds to its inputs and publishes only declared outputs', definition => {
    const behaviour = registry.getBehavior(definition.type);
    const context = { dt: 3600, time: 0, seed: 1, random: () => 0.5, environment: {}, network: new Map(), componentId: 'test' };
    const initial = definition.initialState ?? {};
    const inputs = definition.ports.filter(p => p.direction === 'input');
    const low = Object.fromEntries(inputs.map(p => [p.id, { value: p.unit === 'K' ? 310.15 : 0, unit: p.unit }]));
    const high = Object.fromEntries(inputs.map(p => [p.id, { value: p.unit === 'K' ? 310.15 : p.id === 'terminal_b' ? 0 : 1, unit: p.unit }]));
    const a = behaviour.outputs!(behaviour.step(initial, low, context), context);
    const b = behaviour.outputs!(behaviour.step(initial, high, context), context);
    if (inputs.length) expect(b, definition.type).not.toEqual(a);
    expect(Object.keys(b).sort()).toEqual(definition.ports.filter(p => p.direction === 'output').map(p => p.id).sort());
    for (const p of definition.ports.filter(p => p.direction === 'output')) {
      expect(Number.isFinite(b[p.id]!.value)).toBe(true);
      expect(b[p.id]!.unit).toBe(p.unit);
    }
  });

  it('runs every sanctioned directed port pair without nonfinite values or missing outputs', () => {
    let checked = 0;
    for (const source of registry.listComponents()) for (const target of registry.listComponents()) {
      const experiment = graph([source.type, target.type]);
      for (const from of source.ports.filter(p => p.direction !== 'input')) for (const to of target.ports.filter(p => p.direction !== 'output')) {
        const src = { componentId: 'part0', portId: from.id }, dst = { componentId: 'part1', portId: to.id };
        if (validateConnection(experiment, registry, src, dst).some(i => i.severity === 'error')) continue;
        const rule = registry.findRule({ discipline: source.discipline, channel: from.channel }, { discipline: target.discipline, channel: to.channel })!;
        const wire: Connection = { id: 'wire', source: src, target: dst, channel: from.channel, transfer: rule.transfer };
        const result = new Simulation({ ...experiment, connections: [wire] }, registry).run();
        expect(result.success, `${source.type}.${from.id} → ${target.type}.${to.id}`).toBe(true);
        for (const value of Object.values(result.measurements)) expect(Number.isFinite(value.value)).toBe(true);
        for (const port of target.ports.filter(p => p.direction === 'output')) expect(result.measurements[`part1.${port.id}`]).toBeDefined();
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it.each([createMicrobialFuelCell, createEnzymeOptimisation, createWaterPurification])('runs a connected showcase: %s', create => {
    const experiment = create();
    expect(experiment.connections.length).toBeGreaterThan(2);
    const result = new Simulation(experiment, registry).run();
    expect(result.success).toBe(true);
    for (const series of experiment.trackedSeries ?? []) expect(Number.isFinite(result.measurements[series.key]!.value)).toBe(true);
    const active = experiment.id === 'microbial-fuel-cell' ? 'capacitor.voltage' : experiment.id === 'enzyme-optimisation' ? 'logger.recorded' : 'separator.separated';
    expect(result.measurements[active]!.value).toBeGreaterThan(0);
  });

  it('preserves separation fractions through the full purification train', () => {
    const result = new Simulation(createWaterPurification(), registry).run();
    expect(result.measurements['separator.separated']!.value).toBeCloseTo(1 * 0.3 * 0.2 * 0.8);
  });

  it('places, moves and removes every component through the workbench store', () => {
    for (const definition of registry.listComponents()) {
      useLabStore.getState().loadExperiment('build-your-own');
      const id = useLabStore.getState().addComponent(definition.type, { x: 100, y: -10, z: 100 })!;
      expect(useLabStore.getState().experiment.components[0]!.position).toEqual({ x: TABLE_BOUNDS.x.max, y: 0, z: TABLE_BOUNDS.z.max });
      useLabStore.getState().moveComponent(id, { x: -100, y: 100, z: -100 });
      expect(useLabStore.getState().experiment.components[0]!.position).toEqual({ x: TABLE_BOUNDS.x.min, y: TABLE_BOUNDS.y.max, z: TABLE_BOUNDS.z.min });
      expect(new Simulation({ ...useLabStore.getState().experiment, duration: 3600 }, registry).run().success).toBe(true);
      useLabStore.getState().removeComponent(id);
      expect(useLabStore.getState().experiment.components).toHaveLength(0);
    }
  });

  it('rejects competing scalar drivers, and releases an input when its source is removed', () => {
    const store = () => useLabStore.getState();
    store().loadExperiment('build-your-own');
    const first = store().addComponent('environment.light-source', { x: 0, y: 0, z: 0 })!;
    const second = store().addComponent('environment.light-source', { x: 2, y: 0, z: 0 })!;
    const cell = store().addComponent('electronics.photovoltaic-cell', { x: 4, y: 0, z: 0 })!;
    const target = { componentId: cell, portId: 'light' };
    expect(store().connect({ componentId: first, portId: 'irradiance' }, target)).toBe(true);
    expect(store().connect({ componentId: second, portId: 'irradiance' }, target)).toBe(false);
    expect(store().notice).toMatch(/already has a source/);
    store().removeComponent(first);
    expect(store().experiment.connections).toHaveLength(0);
    expect(store().connect({ componentId: second, portId: 'irradiance' }, target)).toBe(true);
  });

  it('lights an LED from a light source and solar cell, then turns it off in darkness', () => {
    const store = () => useLabStore.getState();
    store().loadExperiment('build-your-own');
    const add = (type: string) => { store().addComponent(type, { x: 0, y: 0, z: 0 }); return store().selectedId!; };
    const lamp = add('environment.light-source'), solar = add('electronics.photovoltaic-cell'), led = add('electronics.led');
    expect(store().connect({ componentId: lamp, portId: 'irradiance' }, { componentId: solar, portId: 'light' })).toBe(true);
    expect(store().connect({ componentId: solar, portId: 'positive' }, { componentId: led, portId: 'anode' })).toBe(true);
    const run = () => new Simulation({ ...store().experiment, dt: 1, duration: 10 }, registry).run();
    expect(run().measurements[`${led}.brightness`]!.value).toBeGreaterThan(0);
    store().setParameter(lamp, 'irradiance', 0);
    expect(run().measurements[`${led}.brightness`]!.value).toBe(0);
  });
});
