'use client';

/**
 * FrankenLab — laboratory state.
 *
 * One store holds the experiment, the running simulation and everything the
 * panels read. The 3D scene reads it imperatively inside its own frame loop,
 * so the scene never waits on a React render.
 *
 * The store owns the simulation lifecycle. Changing a parameter rebuilds the
 * simulation, because the parameter is baked into the component's initial
 * state — there is no hot-swapping of a running model.
 */

import { create } from 'zustand';
import { Simulation } from '@/kernel/simulator';
import type { ComponentRegistry } from '@/kernel/registry';
import type { DataPoint, ExperimentDefinition, Quantity } from '@/kernel/types';
import { createBioCircuit } from '@/scenarios/biocircuit';
import { createWorld } from '@/world';
import { LocalExplainProvider, type AssistantContext, type AssistantMessage } from '@/assistant/assistant';

export interface SeriesPoint {
  readonly t: number;
  readonly values: Readonly<Record<string, number>>;
}

export type LabStatus = 'idle' | 'running' | 'paused' | 'complete';

/** How many series points to keep in memory. */
const SERIES_LIMIT = 600;

/** Readings the panels and the chart care about, in the order they appear. */
export const TRACKED_SERIES = [
  { key: 'substrate.moisture', label: 'Available moisture' },
  { key: 'sensor.signal', label: 'Probe reading' },
  { key: 'plant.biomass', label: 'Biomass' },
  { key: 'comparator.decision', label: 'Alert' },
] as const;

export interface LabStore {
  readonly experiment: ExperimentDefinition;
  readonly registry: ComponentRegistry;
  readonly simulation: Simulation;

  readonly status: LabStatus;
  readonly elapsed: number;
  readonly readings: Readonly<Record<string, Quantity>>;
  readonly series: readonly SeriesPoint[];
  readonly selectedId: string | null;
  readonly messages: readonly AssistantMessage[];
  readonly assistantBusy: boolean;

  select(id: string | null): void;
  start(): void;
  pause(): void;
  reset(): void;
  /** Advance the simulation by a number of steps and publish the readings. */
  advance(steps: number): void;
  setParameter(componentId: string, parameterId: string, value: number): void;
  setSubstrate(substrate: 'sandy' | 'loamy' | 'clay' | 'hydrogel'): void;
  ask(question: string): Promise<void>;
}

const registry = createWorld();

function buildSimulation(experiment: ExperimentDefinition): Simulation {
  return new Simulation(experiment, registry);
}

function snapshotReadings(simulation: Simulation): Record<string, Quantity> {
  const outputs = simulation.snapshot().outputs;
  const readings: Record<string, Quantity> = {};
  for (const [componentId, values] of Object.entries(outputs)) {
    for (const [portId, value] of Object.entries(values)) {
      readings[`${componentId}.${portId}`] = value;
    }
  }
  return readings;
}

function snapshotSeries(simulation: Simulation): SeriesPoint {
  const outputs = simulation.snapshot().outputs;
  const values: Record<string, number> = {};
  for (const { key } of TRACKED_SERIES) {
    const [componentId, portId] = key.split('.');
    const value = outputs[componentId!]?.[portId!];
    if (value) values[key] = value.value;
  }
  return { t: simulation.elapsed, values };
}

export const useLabStore = create<LabStore>((set, get) => {
  const experiment = createBioCircuit();
  const simulation = buildSimulation(experiment);

  /** Rebuild the simulation from an edited experiment and publish it. */
  const rebuild = (next: ExperimentDefinition) => {
    const fresh = buildSimulation(next);
    set({
      experiment: next,
      simulation: fresh,
      status: 'idle',
      elapsed: 0,
      readings: snapshotReadings(fresh),
      series: [snapshotSeries(fresh)],
    });
  };

  return {
    experiment,
    registry,
    simulation,

    status: 'idle',
    elapsed: 0,
    readings: snapshotReadings(simulation),
    series: [snapshotSeries(simulation)],
    selectedId: null,
    messages: [],
    assistantBusy: false,

    select(id) {
      set({ selectedId: id });
    },

    start() {
      if (get().status === 'complete') get().reset();
      set({ status: 'running' });
    },

    pause() {
      if (get().status === 'running') set({ status: 'paused' });
    },

    reset() {
      const fresh = buildSimulation(get().experiment);
      set({
        simulation: fresh,
        status: 'idle',
        elapsed: 0,
        readings: snapshotReadings(fresh),
        series: [snapshotSeries(fresh)],
      });
    },

    advance(steps) {
      const { simulation: current, status, series, experiment } = get();
      if (status !== 'running') return;

      for (let i = 0; i < steps; i++) {
        if (current.elapsed >= experiment.duration) break;
        current.tick();
      }

      const point = snapshotSeries(current);
      const next = [...series, point];
      set({
        elapsed: current.elapsed,
        readings: snapshotReadings(current),
        series: next.length > SERIES_LIMIT ? next.slice(next.length - SERIES_LIMIT) : next,
        status: current.elapsed >= experiment.duration ? 'complete' : 'running',
      });
    },

    setParameter(componentId, parameterId, value) {
      const { experiment: current } = get();
      const components = current.components.map((component) =>
        component.id === componentId
          ? {
              ...component,
              parameters: {
                ...component.parameters,
                [parameterId]: { value },
              },
            }
          : component,
      );
      rebuild({ ...current, components });
    },

    setSubstrate(substrate) {
      const { experiment: current } = get();
      const components = current.components.map((component) =>
        component.id === 'substrate'
          ? {
              ...component,
              parameters: {
                ...component.parameters,
                preset: { value: substrate },
              },
            }
          : component,
      );
      rebuild({ ...current, components });
    },

    async ask(question) {
      const { experiment: current, registry: reg, simulation: live, series } = get();
      set({
        messages: [...get().messages, { role: 'user', content: question }],
        assistantBusy: true,
      });

      const dataPoints: DataPoint[] = series.map((point) => ({
        time: point.t,
        values: Object.fromEntries(
          Object.entries(point.values).map(([key, value]) => [key, { value, unit: 'ratio' }]),
        ),
      }));

      const context: AssistantContext = {
        experiment: current,
        components: Array.from(
          new Map(current.components.map((c) => [c.type, reg.getDefinition(c.type)])).values(),
        ),
        latestResult: {
          success: true,
          measurements: snapshotReadings(live),
          observations: [],
          warnings: [],
          dataPoints,
          modelVersion: current.modelVersion,
          seed: current.seed,
          durationSeconds: live.elapsed,
          steps: live.steps,
        },
        runCount: series.length > 1 ? 1 : 0,
        validations: [],
      };

      const provider = new LocalExplainProvider();
      const reply = await provider.respond({
        messages: [...get().messages],
        context,
      });

      set({
        messages: [...get().messages, { role: 'assistant', content: reply }],
        assistantBusy: false,
      });
    },
  };
});
