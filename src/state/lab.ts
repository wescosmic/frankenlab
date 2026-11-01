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
import { validateConnection } from '@/kernel/validate';
import type {
  ComponentDefinition,
  ComponentInstance,
  Connection,
  DataPoint,
  ExperimentDefinition,
  Observation,
  ParameterValue,
  TrackedSeries,
  PortRef,
  Quantity,
} from '@/kernel/types';
import { createBioCircuit } from '@/scenarios/biocircuit';
import { findExperiment } from '@/scenarios';
import { createWorld } from '@/world';
import { LocalExplainProvider, type AssistantContext, type AssistantMessage } from '@/assistant/assistant';
import { guardResponse } from '@/assistant/trust';

export interface SeriesPoint {
  readonly t: number;
  readonly values: Readonly<Record<string, number>>;
}

export type LabStatus = 'idle' | 'running' | 'paused' | 'complete';

/** Speed options: simulated hours per wall-clock second. */
export type Speed = 'slow' | 'fast';

/** How many series points to keep in memory. */
const SERIES_LIMIT = 600;

/** Default speed: the full 24-day run takes about 64 seconds. */
export const DEFAULT_SPEED: Speed = 'slow';

/**
 * How long a run takes on the wall clock, at each speed.
 *
 * The speed is a target wall time for the whole experiment, not a fixed
 * number of simulated hours per second. A chemistry experiment steps once a
 * minute and the flagship steps once an hour, and both should take about the
 * same time to watch. The rate is worked out from the experiment's own
 * duration, so "slow" means the same thing for every experiment.
 */
export const SPEED_TARGET_SECONDS: Record<Speed, number> = {
  slow: 64,
  fast: 6,
};

/**
 * The readings the flagship follows, in the order they appear.
 *
 * Each experiment carries its own list. This is the flagship's.
 */
export const BIOCIRCUIT_SERIES = [
  { key: 'substrate.moisture', label: 'Available moisture', colour: '#7bc96f' },
  { key: 'sensor.signal', label: 'Probe reading', colour: '#4fd1c5' },
  { key: 'plant.biomass', label: 'Biomass', colour: '#c2a084' },
  { key: 'comparator.decision', label: 'Alert', colour: '#ef6461' },
] as const;

/**
 * The readings an experiment follows.
 *
 * An experiment that does not declare its own falls back to the flagship's,
 * so an experiment nobody has thought about still shows something sensible.
 */
export function trackedSeriesFor(experiment: ExperimentDefinition): readonly TrackedSeries[] {
  return experiment.trackedSeries ?? BIOCIRCUIT_SERIES;
}

/** A port on a component, as the bench refers to it. */
export type { PortRef } from '@/kernel/types';

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
  readonly selectedConnectionId: string | null;
  readonly messages: readonly AssistantMessage[];
  readonly assistantBusy: boolean;
  /** A plain-English note about the last thing the user tried to do. */
  readonly notice: string | null;

  select(id: string | null): void;
  /** Pick out a wire on the bench. */
  selectConnection(id: string | null): void;
  /** Open a different experiment from the catalogue. */
  loadExperiment(id: string): void;
  /** Change one of the experiment's environment variables. */
  setEnvironmentVariable(id: string, value: number): void;
  start(): void;
  pause(): void;
  reset(): void;
  /** Advance the simulation by a number of steps and publish the readings. */
  advance(steps: number): void;
  setSpeed(speed: Speed): void;
  /** @returns true if the run was restarted, false if it was a live update. */
  setParameter(componentId: string, parameterId: string, value: number): boolean;
  setSubstrate(substrate: 'sandy' | 'loamy' | 'clay' | 'hydrogel'): void;
  /** Put a new part on the bench. @returns the new component's id. */
  addComponent(type: string, position: { x: number; y: number; z: number }): string | null;
  /** Wire two ports together. @returns true if the connection was made. */
  connect(source: PortRef, target: PortRef): boolean;
  /** Take a part off the bench, and any wire that was attached to it. */
  removeComponent(id: string): void;
  /** Cut a wire. */
  removeConnection(id: string): void;
  dismissNotice(): void;
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

function takeSnapshot(
  simulation: Simulation,
  tracked: readonly TrackedSeries[],
): Snapshot {
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
      tracked.map(({ key }) => {
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

/** A short, readable name for a component type: `materials.substrate` becomes `substrate`. */
function shortName(type: string): string {
  return type.split('.').pop() ?? type;
}

/** A component id that is not already on the bench. */
function uniqueComponentId(experiment: ExperimentDefinition, type: string): string {
  const base = shortName(type);
  const taken = new Set(experiment.components.map((c) => c.id));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/** A connection id that is not already on the bench. */
function uniqueConnectionId(experiment: ExperimentDefinition): string {
  const taken = new Set(experiment.connections.map((c) => c.id));
  let n = 1;
  while (taken.has(`c-user-${n}`)) n += 1;
  return `c-user-${n}`;
}

/** The default parameter values for a part, taken from its definition. */
function defaultParameters(definition: ComponentDefinition): Record<string, ParameterValue> {
  const parameters: Record<string, ParameterValue> = {};
  for (const parameter of definition.parameters) {
    parameters[parameter.id] = {
      value: parameter.defaultValue,
      ...(parameter.unit ? { unit: parameter.unit } : {}),
    };
  }
  return parameters;
}

export const useLabStore = create<LabStore>((set, get) => {
  const experiment = createBioCircuit();
  const simulation = buildSimulation(experiment);
  const initial = takeSnapshot(simulation, trackedSeriesFor(experiment));

  /** Rebuild the simulation from an edited experiment and publish it. */
  const rebuild = (next: ExperimentDefinition) => {
    const fresh = buildSimulation(next);
    const snap = takeSnapshot(fresh, trackedSeriesFor(next));
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
    selectedConnectionId: null,
    messages: [],
    assistantBusy: false,
    notice: null,

    select(id) {
      set({ selectedId: id, selectedConnectionId: null });
    },

    selectConnection(id) {
      set({ selectedConnectionId: id, selectedId: null });
    },

    loadExperiment(id) {
      const entry = findExperiment(id);
      if (!entry) {
        set({ notice: `There is no experiment called "${id}".` });
        return;
      }
      rebuild(entry.create());
      set({
        selectedId: null,
        selectedConnectionId: null,
        notice: `${entry.name} is on the bench.`,
      });
    },

    setEnvironmentVariable(id, value) {
      const { experiment: current } = get();
      const variable = current.environment.variables.find((v) => v.id === id);
      if (!variable) return;

      const variables = current.environment.variables.map((v) =>
        v.id === id ? { ...v, value: { ...v.value, value } } : v,
      );
      rebuild({ ...current, environment: { ...current.environment, variables } });
      set({ notice: `${variable.label} is now ${value} ${variable.value.unit}. The run has restarted.` });
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
      const snap = takeSnapshot(fresh, trackedSeriesFor(get().experiment));
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

      const snap = takeSnapshot(current, trackedSeriesFor(get().experiment));
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
        const snap = takeSnapshot(current, trackedSeriesFor(get().experiment));
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

    addComponent(type, position) {
      const { experiment: current, registry: reg } = get();
      const definition = reg.tryGetDefinition(type);
      if (!definition) {
        set({ notice: `There is no part called "${type}".` });
        return null;
      }

      const instance: ComponentInstance = {
        id: uniqueComponentId(current, type),
        type,
        parameters: defaultParameters(definition),
        position,
      };

      rebuild({ ...current, components: [...current.components, instance] });
      set({
        selectedId: instance.id,
        notice: `${definition.name} is on the bench. The run has restarted.`,
      });
      return instance.id;
    },

    connect(source, target) {
      const { experiment: current, registry: reg } = get();

      // The bench and the simulator must agree about what a legal wire is, so
      // the bench asks the kernel's own validator.
      const issues = validateConnection(current, reg, source, target);
      const errors = issues.filter((issue) => issue.severity === 'error');
      if (errors.length > 0) {
        set({ notice: errors.map((error) => error.message).join(' ') });
        return false;
      }

      const sourceInstance = current.components.find((c) => c.id === source.componentId);
      const targetInstance = current.components.find((c) => c.id === target.componentId);
      if (!sourceInstance || !targetInstance) {
        set({ notice: 'That connection refers to a part that is not on the bench.' });
        return false;
      }

      const sourceDefinition = reg.tryGetDefinition(sourceInstance.type);
      const targetDefinition = reg.tryGetDefinition(targetInstance.type);
      const sourcePort = sourceDefinition?.ports.find((p) => p.id === source.portId);
      const targetPort = targetDefinition?.ports.find((p) => p.id === target.portId);
      if (!sourceDefinition || !targetDefinition || !sourcePort || !targetPort) {
        set({ notice: 'That connection refers to a port that does not exist.' });
        return false;
      }

      const rule = reg.findRule(
        { discipline: sourceDefinition.discipline, channel: sourcePort.channel },
        { discipline: targetDefinition.discipline, channel: targetPort.channel },
      );
      if (!rule) {
        set({
          notice:
            `No defined transfer exists from ${sourceDefinition.name} to ` +
            `${targetDefinition.name}. These disciplines cannot be coupled directly.`,
        });
        return false;
      }

      const connection: Connection = {
        id: uniqueConnectionId(current),
        source,
        target,
        channel: sourcePort.channel,
        transfer: rule.transfer,
      };

      rebuild({ ...current, connections: [...current.connections, connection] });
      set({ notice: 'Wired. The run has restarted.' });
      return true;
    },

    removeComponent(id) {
      const { experiment: current } = get();
      const instance = current.components.find((c) => c.id === id);
      if (!instance) return;

      rebuild({
        ...current,
        components: current.components.filter((c) => c.id !== id),
        connections: current.connections.filter(
          (c) => c.source.componentId !== id && c.target.componentId !== id,
        ),
      });
      set({
        selectedId: null,
        selectedConnectionId: null,
        notice: `${instance.label ?? instance.type} taken off the bench. The run has restarted.`,
      });
    },

    removeConnection(id) {
      const { experiment: current } = get();
      if (!current.connections.some((c) => c.id === id)) return;

      rebuild({
        ...current,
        connections: current.connections.filter((c) => c.id !== id),
      });
      set({ selectedConnectionId: null, notice: 'Wire cut. The run has restarted.' });
    },

    dismissNotice() {
      set({ notice: null });
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
      const rawReply = await provider.respond({
        messages: [...get().messages],
        context,
      });

      // Every reply goes through the trust guard, whatever produced it. The
      // guard removes numbers the simulation did not produce and ends the
      // answer with what it is worth trusting for.
      const guarded = guardResponse(rawReply, context);

      set({
        messages: [
          ...get().messages,
          {
            role: 'assistant',
            content: guarded.text,
            confidence: guarded.trust.level,
          },
        ],
        assistantBusy: false,
      });
    },
  };
});
