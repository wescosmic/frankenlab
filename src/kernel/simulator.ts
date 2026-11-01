/**
 * FrankenLab — Simulation kernel.
 *
 * The kernel advances every component in a fixed order, resolves the values
 * travelling along connections, and records observations. It knows nothing
 * about any discipline's physics; it only knows how to run steps and move
 * quantities between ports.
 *
 * Determinism is a hard requirement, not a nice-to-have:
 *   - time advances by a fixed `dt`, never by wall-clock time
 *   - randomness comes from a seeded generator, never `Math.random()`
 *   - components are stepped in a stable, sorted order
 * Therefore: same experiment + same seed = byte-identical result, always.
 */

import { ComponentRegistry } from './registry';
import type {
  ComponentInstance,
  ComponentState,
  Connection,
  DataPoint,
  DisciplineEngine,
  ExperimentDefinition,
  Observation,
  PortDefinition,
  Quantity,
  RunOptions,
  RuntimeSnapshot,
  SimulationResult,
  StepContext,
} from './types';
import { convert } from './units';
import { validateExperiment } from './validate';

/** Deterministic PRNG (mulberry32). Seeded, portable, and reproducible. */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class SimulationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SimulationError';
  }
}

export class Simulation {
  readonly #registry: ComponentRegistry;
  readonly #experiment: ExperimentDefinition;
  #states = new Map<string, ComponentState>();
  readonly #outputs = new Map<string, Readonly<Record<string, Quantity>>>();
  readonly #networkResults = new Map<string, Readonly<Record<string, Quantity>>>();
  readonly #observations: Observation[] = [];
  readonly #componentPorts = new Map<string, readonly PortDefinition[]>();
  readonly #seed: number;
  readonly #dt: number;
  readonly #duration: number;
  #time = 0;
  #step = 0;
  readonly #random: () => number;

  constructor(
    experiment: ExperimentDefinition,
    registry: ComponentRegistry,
    options: RunOptions = {},
  ) {
    const validation = validateExperiment(experiment, registry);
    if (!validation.valid) {
      const blocking = validation.issues
        .filter((i) => i.severity === 'error')
        .map((i) => i.message)
        .join('\n');
      throw new SimulationError(`Experiment cannot run:\n${blocking}`);
    }

    this.#registry = registry;
    this.#experiment = experiment;
    this.#seed = options.seed ?? experiment.seed;
    this.#dt = experiment.dt;
    this.#duration = options.duration ?? experiment.duration;
    this.#random = createSeededRandom(this.#seed);

    this.#initialiseStates();
    this.#initialiseOutputs();

    // Establish the initial operating point. The disciplines solve their own
    // networks against the starting condition, and the solved values are
    // published so the first step already sees a live circuit rather than an
    // empty one.
    this.#solveNetworks(this.#resolveConnectionValues());
    this.#publishNetworkOutputs();
  }

  #initialiseStates(): void {
    for (const instance of this.#experiment.components) {
      const definition = this.#registry.getDefinition(instance.type);
      const behaviour = this.#registry.getBehavior(instance.type);
      const initial: Record<string, unknown> = {};

      this.#componentPorts.set(instance.type, definition.ports);

      for (const [key, value] of Object.entries(definition.initialState ?? {})) {
        initial[key] = value;
      }

      // Seed the state with the instance's parameter values so a behaviour can
      // read its own configuration without being handed it separately.
      for (const parameter of definition.parameters) {
        const supplied = instance.parameters[parameter.id];
        if (supplied !== undefined) {
          initial[`__param_${parameter.id}`] = supplied.value;
        } else {
          initial[`__param_${parameter.id}`] = parameter.defaultValue;
        }
      }

      void behaviour;
      this.#states.set(instance.id, initial);
    }
  }

  /**
   * Publish each component's outputs before the first step.
   *
   * Without this the first network solve sees no values on any connection, so
   * a sensor would read "nothing connected" rather than its starting
   * condition — a freshly planted experiment would look like a bone-dry one
   * and the alert would fire before anything happened.
   */
  #initialiseOutputs(): void {
    for (const instance of this.#experiment.components) {
      const behaviour = this.#registry.getBehavior(instance.type);
      const state = this.#states.get(instance.id) ?? {};
      const outputs = behaviour.outputs
        ? behaviour.outputs(state, this.#context(instance.id))
        : ((state as { outputs?: Readonly<Record<string, Quantity>> }).outputs ?? {});
      this.#outputs.set(instance.id, outputs);
    }
  }

  /**
   * Publish the values the disciplines' network solvers produced.
   *
   * Solved values are output values: a node voltage, a branch current, a
   * divider reading. Publishing them means the workbench shows a live
   * circuit from the first frame.
   */
  #publishNetworkOutputs(): void {
    for (const [componentId, values] of this.#networkResults) {
      const published = this.#outputs.get(componentId);
      if (!published) continue;
      this.#outputs.set(componentId, { ...published, ...values });
    }
  }

  /** Resolve the value on every connection at the current instant. */
  #resolveConnectionValues(): Map<string, Quantity> {
    const resolved = new Map<string, Quantity>();

    for (const connection of this.#experiment.connections) {
      const sourceOutputs = this.#outputs.get(connection.source.componentId);
      const raw = sourceOutputs?.[connection.source.portId];
      if (!raw) continue;

      const targetDefinition = this.#registry.getDefinition(
        this.#component(connection.target.componentId).type,
      );
      const targetPort = targetDefinition.ports.find((p) => p.id === connection.target.portId);
      if (!targetPort) continue;

      let value: Quantity;
      try {
        value = convert(raw, targetPort.unit);
      } catch {
        // Dimensionally incompatible — validation should have caught this.
        // Skip rather than corrupt the run.
        continue;
      }

      value = applyTransfer(connection, value);
      resolved.set(`${connection.target.componentId}:${connection.target.portId}`, value);
    }

    return resolved;
  }

  #component(id: string): ComponentInstance {
    const instance = this.#experiment.components.find((c) => c.id === id);
    if (!instance) {
      throw new SimulationError(`Unknown component "${id}".`);
    }
    return instance;
  }

  #context(componentId: string): StepContext {
    const environment: Record<string, Quantity> = {};
    for (const variable of this.#experiment.environment.variables) {
      environment[variable.id] = variable.value;
    }
    return {
      time: this.#time,
      dt: this.#dt,
      seed: this.#seed,
      environment,
      random: this.#random,
      network: this.#networkResults,
      componentId,
    };
  }

  /**
   * Run each discipline's network solver over its own connected subgraph.
   *
   * A discipline analyses its own components; the kernel only routes the call.
   * This is what lets the electronics engine perform nodal analysis without
   * the kernel knowing what a node or a voltage is.
   */
  #solveNetworks(resolvedInputs: ReadonlyMap<string, Quantity>): void {
    for (const engine of this.#registry.listDisciplines()) {
      const solver = engine.networkSolver;
      if (!solver) continue;

      const disciplineComponents = this.#experiment.components.filter(
        (component) =>
          this.#registry.tryGetDefinition(component.type)?.discipline === engine.id,
      );
      if (disciplineComponents.length === 0) continue;

      const componentIds = new Set(disciplineComponents.map((c) => c.id));
      const disciplineConnections = this.#experiment.connections.filter(
        (connection) =>
          componentIds.has(connection.source.componentId) &&
          componentIds.has(connection.target.componentId),
      );

      const results = solver.solve({
        components: disciplineComponents,
        connections: disciplineConnections,
        states: this.#states,
        resolvedInputs,
        dt: this.#dt,
        componentPorts: this.#componentPorts,
      });

      for (const [componentId, values] of results) {
        this.#networkResults.set(componentId, values);
      }
    }
  }

  /** Advance the simulation by exactly one timestep. */
  tick(): void {
    const incoming = this.#resolveConnectionValues();

    // Let each discipline analyse its own connected subgraph before any
    // component steps. A resistor's voltage depends on the whole circuit.
    this.#solveNetworks(incoming);

    // Step in a stable order so results never depend on array ordering.
    const ordered = [...this.#experiment.components].sort((a, b) =>
      a.id.localeCompare(b.id),
    );

    const nextStates = new Map<string, ComponentState>();

    for (const instance of ordered) {
      const behaviour = this.#registry.getBehavior(instance.type);
      const current = this.#states.get(instance.id) ?? {};

      const inputs: Record<string, Quantity> = {};
      for (const port of this.#registry.getDefinition(instance.type).ports) {
        if (port.direction !== 'input') continue;
        const value = incoming.get(`${instance.id}:${port.id}`);
        if (value) inputs[port.id] = value;
      }

      const next = behaviour.step(current, inputs, this.#context(instance.id));
      nextStates.set(instance.id, next);
    }

    this.#states = nextStates;

    // Recompute outputs from the new states.
    for (const instance of ordered) {
      const behaviour = this.#registry.getBehavior(instance.type);
      const state = this.#states.get(instance.id) ?? {};
      const context = this.#context(instance.id);
      const outputs = behaviour.outputs
        ? behaviour.outputs(state, context)
        : ((state as { outputs?: Readonly<Record<string, Quantity>> }).outputs ?? {});
      this.#outputs.set(instance.id, outputs);
    }

    // Collect observations after the step, in the same stable order.
    for (const instance of ordered) {
      const behaviour = this.#registry.getBehavior(instance.type);
      const state = this.#states.get(instance.id) ?? {};
      const context = this.#context(instance.id);

      if (behaviour.observe) {
        const componentObservations = behaviour.observe(state, context);
        for (const obs of componentObservations) {
          this.#observations.push({
            ...obs,
            // The state a behaviour is looking at is the state *after* the
            // step, so the observation belongs to the end of the step, not
            // the start. The clock has not been advanced yet, so the end of
            // this step is one timestep from now. Stamping it with the
            // current time instead puts every observation one step before
            // the data point that shows the same thing.
            time: this.#time + this.#dt,
            componentId: instance.id,
          });
        }
      }
    }

    this.#time += this.#dt;
    this.#step += 1;
  }

  /** Run to completion (or until the `until` predicate fires). */
  run(options: RunOptions = {}): SimulationResult {
    const maxSteps = options.maxSteps ?? 500_000;
    const until = options.until;
    const dataPoints: DataPoint[] = [];

    while (this.#time < this.#duration && this.#step < maxSteps) {
      this.tick();

      dataPoints.push({
        time: this.#time,
        values: this.#collectMeasurements(),
      });

      if (until && until(this.snapshot())) {
        break;
      }
    }

    return {
      success: true,
      measurements: this.#collectMeasurements(),
      observations: [...this.#observations],
      warnings: [],
      dataPoints,
      modelVersion: this.#experiment.modelVersion,
      seed: this.#seed,
      durationSeconds: this.#time,
      steps: this.#step,
    };
  }

  #collectMeasurements(): Record<string, Quantity> {
    const measurements: Record<string, Quantity> = {};
    for (const [componentId, outputs] of this.#outputs) {
      for (const [portId, value] of Object.entries(outputs)) {
        measurements[`${componentId}.${portId}`] = value;
      }
    }
    return measurements;
  }

  /**
   * Update a live parameter on a running component.
   *
   * The next step will read the new value from `__param_<id>`.
   *
   * @param componentId - the component to update
   * @param parameterId - the parameter to change
   * @param value - the new numeric value
   * @throws if the component or parameter does not exist, or if the parameter
   *           is baked into the initial state (use rebuild() for those)
   */
  updateParameter(componentId: string, parameterId: string, value: number): void {
    const instance = this.#experiment.components.find((c) => c.id === componentId);
    if (!instance) {
      throw new SimulationError(`Unknown component "${componentId}".`);
    }

    const definition = this.#registry.getDefinition(instance.type);
    const param = definition.parameters.find((p) => p.id === parameterId);
    if (!param) {
      throw new SimulationError(`Unknown parameter "${parameterId}" on ${instance.type}.`);
    }

    // Baked parameters are those whose values are folded into the initial
    // state and cannot be changed mid-run without breaking the water balance
    // (e.g., substrate preset determines wilting point and field capacity).
    const isBaked = this.#isBakedParameter(instance.type, parameterId);
    if (isBaked) {
      throw new SimulationError(
        `Parameter "${parameterId}" is baked into the initial state and cannot be changed mid-run.`,
      );
    }

    const state = this.#states.get(componentId);
    if (state) {
      this.#states.set(componentId, { ...state, [`__param_${parameterId}`]: value });
    }
  }

  /**
   * Check whether a parameter is baked (cannot be changed mid-run).
   *
   * These are parameters that affect the physical constants of the model —
   * substrate properties that define the water balance, not tunable knobs.
   */
  #isBakedParameter(componentType: string, parameterId: string): boolean {
    // Substrate preset and initial_fill define the physical properties
    // (wilting point, field capacity) against which the water balance is computed.
    if (componentType === 'materials.substrate') {
      return parameterId === 'preset' || parameterId === 'initial_fill';
    }
    return false;
  }

  /**
   * Check if a parameter can be updated live (mid-run) or requires a rebuild.
   */
  isParameterLive(componentId: string, parameterId: string): boolean {
    const instance = this.#experiment.components.find((c) => c.id === componentId);
    if (!instance) return false;

    return !this.#isBakedParameter(instance.type, parameterId);
  }

  snapshot(): RuntimeSnapshot {
    const outputs: Record<string, Readonly<Record<string, Quantity>>> = {};
    for (const [componentId, value] of this.#outputs) {
      outputs[componentId] = value;
    }
    return {
      time: this.#time,
      components: Object.fromEntries(this.#states),
      outputs,
      observations: [...this.#observations],
    };
  }

  get elapsed(): number {
    return this.#time;
  }

  get steps(): number {
    return this.#step;
  }
}

/** Apply a connection's transfer function to a value. */
export function applyTransfer(connection: Connection, value: Quantity): Quantity {
  switch (connection.transfer.kind) {
    case 'identity':
      return value;
    case 'scale': {
      const offset = connection.transfer.offset ?? 0;
      return { value: value.value * connection.transfer.factor + offset, unit: value.unit };
    }
    case 'threshold': {
      const invert = connection.transfer.invert ?? false;
      const passed = invert ? value.value < connection.transfer.threshold : value.value > connection.transfer.threshold;
      return { value: passed ? 1 : 0, unit: 'unitless' };
    }
    default: {
      const exhaustive: never = connection.transfer;
      throw new SimulationError(`Unknown transfer ${JSON.stringify(exhaustive)}`);
    }
  }
}

/**
 * Build the standard registry with the given engines.
 *
 * Kept here rather than in an app-specific file so tests and the assistant
 * construct the same world the workbench does.
 */
export function createRegistry(engines: readonly DisciplineEngine[]): ComponentRegistry {
  return new ComponentRegistry().registerEngineAll(engines);
}
