import { beforeEach, describe, expect, it } from 'vitest';
import { useLabStore, type RunSnapshot } from '../src/state/lab';
import { createBioCircuit } from '../src/scenarios/biocircuit';
import { Simulation } from '../src/kernel/simulator';
import { createTestRegistry } from './world';

function mockSnapshot(id: string): RunSnapshot {
  const experiment = createBioCircuit();
  const simulation = new Simulation(experiment, createTestRegistry());
  simulation.run({ maxSteps: 2 });
  const result = simulation.snapshot();
  const readings = Object.fromEntries(
    Object.entries(result.outputs).flatMap(([componentId, outputs]) =>
      Object.entries(outputs).map(([portId, value]) => [`${componentId}.${portId}`, value]),
    ),
  );
  return {
    id,
    name: id,
    experiment: structuredClone(experiment),
    elapsed: simulation.elapsed,
    readings,
    series: [{ t: simulation.elapsed, values: { 'plant.biomass': 0.5 } }],
    observations: [...result.observations],
    seed: experiment.seed,
    createdAt: 1,
  };
}

describe('snapshot comparison', () => {
  beforeEach(() => {
    useLabStore.setState({ snapshots: [], comparingSnapshots: null, notice: null });
  });

  it('keeps snapshot payloads isolated', () => {
    const a = mockSnapshot('a');
    const b = mockSnapshot('b');
    expect(a.experiment).not.toBe(b.experiment);
    expect(a.series).not.toBe(b.series);
    expect(a.readings).not.toBe(b.readings);
  });

  it('selects two snapshots for comparison', () => {
    useLabStore.setState({ snapshots: [mockSnapshot('a'), mockSnapshot('b')] });
    useLabStore.getState().addToComparison('a');
    useLabStore.getState().addToComparison('b');
    expect(useLabStore.getState().comparingSnapshots).toEqual(['a', 'b']);
  });

  it('does not add the same snapshot twice', () => {
    useLabStore.setState({ snapshots: [mockSnapshot('a')] });
    useLabStore.getState().addToComparison('a');
    useLabStore.getState().addToComparison('a');
    expect(useLabStore.getState().comparingSnapshots).toEqual(['a', null]);
  });

  it('clears comparison when a selected snapshot is deleted', () => {
    useLabStore.setState({ snapshots: [mockSnapshot('a'), mockSnapshot('b')] });
    useLabStore.getState().addToComparison('a');
    useLabStore.getState().addToComparison('b');
    useLabStore.getState().deleteSnapshot('a');
    expect(useLabStore.getState().snapshots.map((item) => item.id)).toEqual(['b']);
    expect(useLabStore.getState().comparingSnapshots).toBeNull();
  });

  it('saves an independent copy of the live experiment', () => {
    useLabStore.getState().reset();
    useLabStore.getState().advance(2);
    useLabStore.getState().saveSnapshot('Run A');
    const saved = useLabStore.getState().snapshots[0];
    expect(saved?.name).toBe('Run A');
    expect(saved?.experiment).not.toBe(useLabStore.getState().experiment);
    expect(saved?.series.length).toBeGreaterThan(0);
  });
});
