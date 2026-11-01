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
import type { DataPoint, ExperimentDefinition, Observation, Quantity } from '@/kernel/types';
import { createBioCircuit } from '@/scenarios/biocircuit';
import { createWorld } from '@/world';
import { LocalExplainProvider, type AssistantContext, type AssistantMessage } from '@/assistant/assistant';

export interface SeriesPoint {
  readonly t: number;
  readonly values: Readonly<Record<string, number>>;
}

export type LabStatus = 'idle' | 'running' | 'paused' | 'complete';

/** Speed options: simulated hours per wall-clock second. */
export type Speed = 'slow' | 'fast';

/** How many series points to keep in memory. */
const SERIES_LIMIT = 600;

/** Default speed: the full 21-day run takes about 56 seconds. */
export const DEFAULT_SPEED: Speed = 'slow';

/**
 * Speed values in simulated hours per wall-clock second.
 *
 * The flagship is 504 simulated hours. Slow puts the alert about 21 seconds
 * in and the wilting about 43 seconds in, which is long enough to follow.
 * Fast gets to the end state in about five seconds.
 */
export const SPEED_VALUES: Record<Speed, number> = {
  slow: 9, // 504 hours / 9 = 56 seconds
  fast: 100, // 504 hours / 100 = 5 seconds
};

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
  readonly speed: Speed;
  readonly readings: Readonly<Record<string, Quantity>>;
  readonly series: readonly SeriesPoint[];
  readonly observations: readonly Observation[];
  readonly selectedId: string | null;
  readonly messages: readonly AssistantMessage[];
  readonly assistantBusy: boolean;

  select(id: string | null): void;
  start(): void;
  pause(): void;
  reset(): void;
  /** Advance the simulation by a number of steps and publish the readings. */
  advance(steps: number): void;
  setSpeed(speed: Speed): void;
  /** @returns true if the run was restarted, false if it was a live update. */
  setParameter(componentId: string, parameterId: string, value: number): boolean;
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

interface Snapshot {
  readonly readings: Record<string, Quantity>;
  readonly seriesPoint: SeriesPoint;
  readonly observations: readonly Observation[];
}

function takeSnapshot(simulation: Simulation): Snapshot {
  const snap = simulation.snapshot();

  // readings: all outputs keyed by component.port
  const readings: Record<string, Quantity> = {};
  for (const [componentId, values] of Object.entries(snap.outputs)) {
    for (const [portId, value] of Object.entries(values)) {
      readings[`${componentId}.${portId}`] = value;
    }
  }

  // seriesPoint: the four tracked series
  const seriesPoint: SeriesPoint = {
    t: simulation.elapsed,
    values: Object.fromEntries(
      TRACKED_SERIES.map(({ key }) => {
        const [componentId, portId] = key.split('.');
        const value = snap.outputs[componentId!]?.[portId!];
        return [key, value?.value ?? 0];
      }),
    ),
  };

  // observations: all observations from the kernel
  const observations = snap.observations;

  return { readings, seriesPoint, observations };
}

export const useLabStore = create<LabStore>((set, get) => {
  const experiment = createBioCircuit();
  const simulation = buildSimulation(experiment);
  const initial = takeSnapshot(simulation);

  /** Rebuild the simulation from an edited experiment and publish it. */
  const rebuild = (next: ExperimentDefinition) => {
    const fresh = buildSimulation(next);
    const snap = takeSnapshot(fresh);
    set({
      experiment: next,
      simulation: fresh,
      status: 'idle',
      elapsed: 0,
      readings: snap.readings,
      series: [snap.seriesPoint],
      observations: snap.observations,
    });
  };

  return {
    experiment,
    registry,
    simulation,

    status: 'idle',
    elapsed: 0,
    speed: DEFAULT_SPEED,
    readings: initial.readings,
    series: [initial.seriesPoint],
    observations: initial.observations,
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
      const snap = takeSnapshot(fresh);
      set({
        simulation: fresh,
        status: 'idle',
        elapsed: 0,
        readings: snap.readings,
        series: [snap.seriesPoint],
        observations: snap.observations,
      });
    },

    setSpeed(speed: Speed) {
      set({ speed });
    },

    advance(steps) {
      const { simulation: current, status, series, experiment } = get();
      if (status !== 'running') return;

      for (let i = 0; i < steps; i++) {
        if (current.elapsed >= experiment.duration) break;
        current.tick();
      }

      const snap = takeSnapshot(current);
      const next = [...series, snap.seriesPoint];
      set({
        elapsed: current.elapsed,
        readings: snap.readings,
        series: next.length > SERIES_LIMIT ? next.slice(next.length - SERIES_LIMIT) : next,
        observations: snap.observations,
        status: current.elapsed >= experiment.duration ? 'complete' : 'running',
      });
    },

    /**
     * Set a parameter on a component.
     *
     * For live parameters, updates the running simulation directly.
     * For baked parameters, rebuilds the simulation (which restarts the run).
     * Returns true if the run was restarted, false if it was a live update.
     */
    setParameter(componentId: string, parameterId: string, value: number): boolean {
      const { simulation: current, experiment: currentExp } = get();
      const isLive = current.isParameterLive(componentId, parameterId);

      if (isLive) {
        // Live update: modify the running simulation directly.
        // The parameter change takes effect on the next step.
        current.updateParameter(componentId, parameterId, value);

        // Update the experiment definition too, so the change persists if the
        // user resets or exports the experiment.
        const components = currentExp.components.map((component) =>
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
        const next = { ...currentExp, components };
        set({ experiment: next });

        // Publish updated readings without advancing the simulation.
        const snap = takeSnapshot(current);
        set({ readings: snap.readings });

        // Return false to indicate no restart happened.
        return false;
      } else {
        // Baked parameter: need to rebuild the simulation (restarts the run).
        const components = currentExp.components.map((component) =>
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
        rebuild({ ...currentExp, components });

        // Return true to indicate a restart happened.
        return true;
      }
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
      const { experiment: current, registry: reg, simulation: live, series, observations } = get();
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
          observations,
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
