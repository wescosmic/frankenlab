import { describe, expect, it, beforeEach } from 'vitest';
import { useLabStore } from '@/state/lab';
import { validateConnection } from '@/kernel/validate';
import { createBioCircuit } from '@/scenarios/biocircuit';
import { createWorld } from '@/world';

/**
 * The bench lets the user build an experiment, so the rules about what may be
 * wired to what have to hold on the bench exactly as they hold in a run.
 *
 * The store is a singleton, so each test puts it back the way it found it.
 */
const pristine = createBioCircuit();
const registry = createWorld();

function reset() {
  useLabStore.setState({ experiment: pristine, notice: null, selectedId: null, selectedConnectionId: null });
  useLabStore.getState().reset();
}

beforeEach(reset);

describe('Wiring rules', () => {
  it('allows a wire the coupling rules sanction', () => {
    const issues = validateConnection(
      pristine,
      registry,
      { componentId: 'substrate', portId: 'moisture' },
      { componentId: 'sensor', portId: 'sense' },
    );
    expect(issues.filter((issue) => issue.severity === 'error')).toHaveLength(0);
  });

  it('refuses a wire that runs out of an input', () => {
    const issues = validateConnection(
      pristine,
      registry,
      { componentId: 'sensor', portId: 'sense' },
      { componentId: 'alert', portId: 'trigger' },
    );
    const codes = issues.map((issue) => issue.code);
    expect(codes).toContain('source-port-is-input');
  });

  it('refuses a wire between disciplines that have no coupling rule', () => {
    const issues = validateConnection(
      pristine,
      registry,
      { componentId: 'alert', portId: 'anode' },
      { componentId: 'substrate', portId: 'supply' },
    );
    const codes = issues.map((issue) => issue.code);
    expect(codes).toContain('no-interdisciplinary-rule');
  });

  it('refuses a part being wired to itself', () => {
    const issues = validateConnection(
      pristine,
      registry,
      { componentId: 'plant', portId: 'transpiration' },
      { componentId: 'plant', portId: 'nutrientDemand' },
    );
    expect(issues.map((issue) => issue.code)).toContain('connection-to-self');
  });

  it('gives every refusal a message a person can read', () => {
    const issues = validateConnection(
      pristine,
      registry,
      { componentId: 'sensor', portId: 'sense' },
      { componentId: 'alert', portId: 'trigger' },
    );
    for (const issue of issues) {
      expect(issue.message.length).toBeGreaterThan(10);
      expect(issue.message).not.toContain('undefined');
    }
  });
});

describe('Building on the bench', () => {
  it('puts a part on the bench with the values its definition gives it', () => {
    const id = useLabStore.getState().addComponent('electronics.led', { x: 4, y: 0, z: 2 });
    expect(id).not.toBeNull();

    const instance = useLabStore
      .getState()
      .experiment.components.find((c) => c.id === id);
    expect(instance).toBeDefined();
    expect(instance!.type).toBe('electronics.led');
    expect(instance!.position).toEqual({ x: 4, y: 0, z: 2 });

    const definition = registry.getDefinition('electronics.led');
    for (const parameter of definition.parameters) {
      expect(instance!.parameters[parameter.id]?.value).toEqual(parameter.defaultValue);
    }
  });

  it('gives a second part of the same kind a different id', () => {
    const first = useLabStore.getState().addComponent('electronics.led', { x: 4, y: 0, z: 2 });
    const second = useLabStore.getState().addComponent('electronics.led', { x: 6, y: 0, z: 2 });
    expect(first).not.toBe(second);

    const ids = useLabStore.getState().experiment.components.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('makes a legal wire and says so', () => {
    const made = useLabStore
      .getState()
      .connect(
        { componentId: 'substrate', portId: 'moisture' },
        { componentId: 'sensor', portId: 'sense' },
      );
    expect(made).toBe(true);
    expect(useLabStore.getState().experiment.connections.length).toBe(pristine.connections.length + 1);
  });

  it('refuses an illegal wire and says why in plain English', () => {
    const made = useLabStore
      .getState()
      .connect(
        { componentId: 'sensor', portId: 'sense' },
        { componentId: 'alert', portId: 'trigger' },
      );
    expect(made).toBe(false);
    expect(useLabStore.getState().experiment.connections.length).toBe(pristine.connections.length);

    const notice = useLabStore.getState().notice;
    expect(notice).toBeTruthy();
    expect(notice).toMatch(/input/i);
    expect(notice).not.toContain('undefined');
  });

  it('takes the wires off a part that is taken off the bench', () => {
    const made = useLabStore
      .getState()
      .connect(
        { componentId: 'substrate', portId: 'moisture' },
        { componentId: 'sensor', portId: 'sense' },
      );
    expect(made).toBe(true);

    useLabStore.getState().removeComponent('sensor');

    const experiment = useLabStore.getState().experiment;
    expect(experiment.components.some((c) => c.id === 'sensor')).toBe(false);
    expect(
      experiment.connections.some(
        (c) => c.source.componentId === 'sensor' || c.target.componentId === 'sensor',
      ),
    ).toBe(false);
  });

  it('cuts one wire and leaves the others', () => {
    const before = useLabStore.getState().experiment.connections.length;
    useLabStore.getState().removeConnection('c-substrate-sensor');

    const after = useLabStore.getState().experiment.connections;
    expect(after.length).toBe(before - 1);
    expect(after.some((c) => c.id === 'c-substrate-sensor')).toBe(false);
  });

  it('selects the part it adds and clears the selection when a wire is picked', () => {
    const id = useLabStore.getState().addComponent('electronics.led', { x: 4, y: 0, z: 2 });
    expect(useLabStore.getState().selectedId).toBe(id);

    useLabStore.getState().selectConnection('c-substrate-sensor');
    expect(useLabStore.getState().selectedConnectionId).toBe('c-substrate-sensor');
    expect(useLabStore.getState().selectedId).toBeNull();
  });

  it('keeps the run reproducible after a part is added', () => {
    useLabStore.getState().addComponent('electronics.led', { x: 4, y: 0, z: 2 });
    const experiment = useLabStore.getState().experiment;
    expect(experiment.seed).toBe(pristine.seed);
    expect(experiment.dt).toBe(pristine.dt);
  });
});
