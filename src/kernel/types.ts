/**
 * FrankenLab — Core kernel contracts.
 *
 * Design rule #1: the kernel knows nothing about electricity, plants or
 * chemistry. It knows about components, ports, connections, parameters, state
 * and time. A discipline is a plugin that supplies component definitions and
 * a step function.
 *
 * Design rule #2: a component definition is pure, serialisable data. Behaviour
 * lives in a separate registry keyed by component type. This is what makes an
 * experiment serialisable, a component testable in isolation, and the
 * "incompatible disciplines share one graph" claim literally true rather than
 * aspirational.
 */

import type { Quantity } from './units';

export type { Quantity } from './units';

/** Free-form discipline identifier. The kernel never enumerates these. */
export type DisciplineId = string;

/**
 * How much confidence a model places in its own output.
 *
 * This is a first-class field, not documentation. The UI surfaces it, the
 * assistant must report it, and every result carries it through to the user.
 * A speculative simulation must never be able to masquerade as a validated
 * prediction.
 */
export type ConfidenceLevel =
  /** Physics that is conserved and independently verifiable. */
  | 'physical-law'
  /** Established model, simplified for teaching. */
  | 'established-simplified'
  /** Qualitative or heuristic. Directionally meaningful, not quantitatively predictive. */
  | 'illustrative'
  /** Speculative by design — the point is to explore, not to predict. */
  | 'hypothetical';

export type ParameterKind = 'number' | 'boolean' | 'enum' | 'string';

/** A tunable value with a unit, a range and a human description. */
export interface ParameterDefinition {
  readonly id: string;
  readonly label: string;
  readonly kind: ParameterKind;
  /** Unit id from the unit registry. Required for numeric parameters. */
  readonly unit?: string;
  readonly defaultValue: number | boolean | string;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly options?: readonly string[];
  readonly description: string;
  /** Confidence contribution of this parameter's range. */
  readonly confidence?: ConfidenceLevel;
}

/** A live parameter value in a running experiment. */
export interface ParameterValue {
  readonly value: number | boolean | string;
  readonly unit?: string;
}

/** Direction a port may carry a quantity. */
export type PortDirection = 'input' | 'output' | 'bidirectional';

/**
 * The semantic channel a port carries.
 *
 * Dimensions alone are not enough to validate a connection. A voltage output
 * and a current output share different dimensions, but a 1.5 V reference and a
 * 1.5 V sensor reading are also not interchangeable. The channel captures
 * what the quantity *means*, so the kernel can reject physically nonsensical
 * joins even when the units match.
 */
export type PortChannel =
  | 'electrical-potential'
  | 'electrical-current'
  | 'electrical-resistance'
  | 'electrical-power'
  | 'thermal-energy'
  | 'temperature'
  | 'moisture'
  | 'nutrient'
  | 'biomass'
  | 'growth-rate'
  | 'concentration'
  | 'pressure'
  | 'mechanical-force'
  | 'signal'
  | 'generic';

export interface PortDefinition {
  readonly id: string;
  readonly label: string;
  readonly direction: PortDirection;
  readonly channel: PortChannel;
  /** Unit id the port's quantity is expressed in. */
  readonly unit: string;
  /** Whether this port must be connected for the component to function. */
  readonly required: boolean;
  readonly description: string;
}

/** A diagnostic reading a component publishes, beyond its ports. */
export interface ReadingDefinition {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  readonly description: string;
}

/**
 * How a value crosses a connection.
 *
 * `identity` passes the source value through. `scale` multiplies by a factor.
 * `threshold` is a comparator — used for the bioelectronic interface, where
 * a biological state becomes a switching decision.
 */
export type TransferFunction =
  | { readonly kind: 'identity' }
  | { readonly kind: 'scale'; readonly factor: number; readonly offset?: number }
  | { readonly kind: 'threshold'; readonly threshold: number; readonly invert?: boolean };

/**
 * The declarative half of a component: metadata, ports and parameters.
 *
 * Contains no behaviour. Behaviour is registered separately by component type,
 * which keeps definitions trivially serialisable and testable.
 */
export interface ComponentDefinition {
  readonly type: string;
  readonly name: string;
  readonly discipline: DisciplineId;
  readonly category: string;
  readonly description: string;
  readonly ports: readonly PortDefinition[];
  readonly parameters: readonly ParameterDefinition[];
  /** Initial state variables, keyed by name, with units where meaningful. */
  readonly initialState?: Readonly<
    Record<string, Quantity | number | boolean | Readonly<Record<string, Quantity>>>
  >;
  /** The model's confidence for this component. */
  readonly confidence: ConfidenceLevel;
  /** Stated assumptions and simplifications — shown in the UI and given to the assistant. */
  readonly assumptions: readonly string[];
  /** Visual hints for the 3D workbench. */
  readonly visual: {
    readonly shape: 'box' | 'cylinder' | 'sphere' | 'torus' | 'plate' | 'organic' | 'custom';
    readonly color: string;
    readonly emissive?: string;
    readonly label?: string;
    /**
     * How far above the part its name floats, in world units. Parts that grow
     * taller than they are wide need a taller label, or the name ends up
     * inside the foliage.
     */
    readonly labelHeight?: number;
  };
  /** Diagnostic readings this component publishes, keyed by output id. */
  readonly readings?: readonly ReadingDefinition[];
}

/**
 * The behavioural half of a component, supplied by a discipline engine.
 *
 * `step` receives the component's own state plus the resolved input values
 * from its connected input ports, and returns the next state. It must be
 * deterministic: no `Date.now()`, no `Math.random()` outside the seeded RNG
 * handed in via context.
 */
export interface ComponentBehavior<S = ComponentState> {
  readonly type: string;
  /**
   * Advance one component by one time step.
   *
   * @param state current internal state
   * @param inputs resolved values for this component's input ports, by port id
   * @param context shared simulation context (time, dt, seed, environment)
   */
  step(state: S, inputs: Readonly<Record<string, Quantity>>, context: StepContext): S;
  /**
   * Derive the component's output port values from its state.
   *
   * Defaults to reading `state.outputs`. Overridden when an output is a
   * computed function of state rather than a stored value.
   */
  outputs?(state: S, context: StepContext): Readonly<Record<string, Quantity>>;
  /**
   * Report observations from this component's behaviour.
   *
   * The kernel collects what a behaviour reports and never interprets it. A
   * behaviour reports what happened in its own discipline; the kernel does not
   * know what any of it means. The observations are timestamped and tagged
   * with the component id by the kernel.
   */
  observe?(state: S, context: StepContext): readonly Observation[];
}

/** Arbitrary per-component state. Structure is owned by the discipline. */
export type ComponentState = Readonly<Record<string, unknown>>;

/** An environment variable — temperature, ambient humidity, light level. */
export interface EnvironmentVariable {
  readonly id: string;
  readonly label: string;
  readonly value: Quantity;
  readonly min: Quantity;
  readonly max: Quantity;
  readonly description: string;
}

export interface Environment {
  readonly variables: readonly EnvironmentVariable[];
}

/** Shared context handed to every component step. */
export interface StepContext {
  /** Simulated time since the experiment started, in seconds. */
  readonly time: number;
  /** Fixed timestep in seconds. */
  readonly dt: number;
  /** Deterministic seed for this experiment. */
  readonly seed: number;
  readonly environment: Readonly<Record<string, Quantity>>;
  /** Seeded random source. Use this, never `Math.random()`. */
  readonly random: () => number;
  /**
   * Network-level results computed by the discipline solver before this step,
   * keyed by component id then output name.
   */
  readonly network: ReadonlyMap<string, Readonly<Record<string, Quantity>>>;
  /** The component's own instance id. */
  readonly componentId: string;
}

/** A placed instance of a component within an experiment. */
export interface ComponentInstance {
  readonly id: string;
  readonly type: string;
  readonly label?: string;
  readonly parameters: Readonly<Record<string, ParameterValue>>;
  /** Position on the workbench. */
  readonly position: { readonly x: number; readonly y: number; readonly z: number };
  readonly rotation?: { readonly x: number; readonly y: number; readonly z: number };
  readonly notes?: string;
}

/** A directed link between two component ports. */
export interface Connection {
  readonly id: string;
  readonly source: { readonly componentId: string; readonly portId: string };
  readonly target: { readonly componentId: string; readonly portId: string };
  readonly channel: PortChannel;
  readonly transfer: TransferFunction;
  readonly label?: string;
  readonly notes?: string;
}

/**
 * A port on a component, as the bench refers to it.
 *
 * The workbench draws and drags ports, and the store's wiring intent takes
 * them, so the reference lives in the kernel rather than in either of them.
 */
export interface PortRef {
  readonly componentId: string;
  readonly portId: string;
}

/** A recorded observation emitted by the simulation. */
export interface Observation {
  readonly time: number;
  readonly componentId?: string;
  readonly severity: 'info' | 'success' | 'warning' | 'error';
  readonly code: string;
  readonly message: string;
  /** Quantities referenced by the observation, so the assistant can cite real values. */
  readonly data?: Readonly<Record<string, Quantity>>;
}

/** A time series point. */
export interface DataPoint {
  readonly time: number;
  readonly values: Readonly<Record<string, Quantity>>;
}

/** The outcome of one simulation run. */
export interface SimulationResult {
  readonly success: boolean;
  readonly measurements: Readonly<Record<string, Quantity>>;
  readonly observations: readonly Observation[];
  readonly warnings: readonly string[];
  readonly dataPoints: readonly DataPoint[];
  /** Engine + model versions, so an old notebook entry stays interpretable. */
  readonly modelVersion: string;
  readonly seed: number;
  readonly durationSeconds: number;
  readonly steps: number;
}

/** Validation of a proposed configuration, before any simulation runs. */
export interface ValidationIssue {
  readonly severity: 'error' | 'warning';
  readonly code: string;
  readonly message: string;
  readonly componentId?: string;
  readonly connectionId?: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly issues: readonly ValidationIssue[];
}

/** The full description of an experiment — the unit of save, share and replay. */
export interface ExperimentDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly discipline: DisciplineId;
  /** Free-form tags — a cross-disciplinary experiment is tagged with all four. */
  readonly tags: readonly string[];
  readonly components: readonly ComponentInstance[];
  readonly connections: readonly Connection[];
  readonly environment: Environment;
  /** Fixed timestep. Determinism depends on this being fixed, not wall-clock. */
  readonly dt: number;
  /** Total simulated duration in seconds. */
  readonly duration: number;
  /** Deterministic seed. Same seed + same config = same result, always. */
  readonly seed: number;
  /** Version of the engine bundle that produced this experiment. */
  readonly modelVersion: string;
}

/** Options for a simulation run. */
export interface RunOptions {
  /** Override the experiment's duration. */
  readonly duration?: number;
  /** Override the experiment's seed. */
  readonly seed?: number;
  /** Stop early once this predicate is satisfied. */
  readonly until?: (state: RuntimeSnapshot) => boolean;
  /** Maximum steps, a hard safety bound against runaway loops. */
  readonly maxSteps?: number;
}

/** A snapshot of the live simulation, used by the UI and by `until`. */
export interface RuntimeSnapshot {
  readonly time: number;
  readonly components: Readonly<Record<string, ComponentState>>;
  readonly outputs: Readonly<Record<string, Readonly<Record<string, Quantity>>>>;
  readonly observations: readonly Observation[];
}

/** Input handed to a discipline's network solver. */
export interface NetworkSolveInput {
  readonly components: readonly ComponentInstance[];
  readonly connections: readonly Connection[];
  readonly states: ReadonlyMap<string, ComponentState>;
  /** Resolved values on each input port, keyed `componentId:portId`. */
  readonly resolvedInputs: ReadonlyMap<string, Quantity>;
  /** Fixed timestep, for solvers with transient behaviour. */
  readonly dt: number;
  /**
   * Port definitions per component type, so a solver can discover which
   * terminals exist without hard-coding component internals.
   */
  readonly componentPorts: ReadonlyMap<string, readonly PortDefinition[]>;
}

/**
 * A discipline-level solver that computes results for a whole connected
 * network before individual components are stepped.
 *
 * This is how a discipline analyses its own subgraph without the kernel
 * learning anything about that discipline. The electronics engine uses it to
 * run nodal analysis; the kernel just calls it.
 */
export interface NetworkSolver {
  readonly discipline: DisciplineId;
  /**
   * Compute network-level results.
   *
   * @returns values keyed by component id, then by output name.
   */
  solve(input: NetworkSolveInput): ReadonlyMap<string, Readonly<Record<string, Quantity>>>;
}

/** A discipline plugin. The kernel consumes only this interface. */
export interface DisciplineEngine {
  readonly id: DisciplineId;
  readonly name: string;
  readonly version: string;
  /** Component definitions this discipline supplies. */
  readonly components: readonly ComponentDefinition[];
  /** Behaviours keyed by component type. */
  readonly behaviors: ReadonlyMap<string, ComponentBehavior>;
  /**
   * Connections this discipline is willing to accept between its own
   * components. Used to reject cross-discipline links that have no defined
   * transfer semantics.
   */
  readonly connectionRules?: readonly ConnectionRule[];
  /**
   * Optional network solver. When present, the kernel calls it before each
   * step so the discipline can analyse its own connected subgraph.
   */
  readonly networkSolver?: NetworkSolver;
}

/**
 * Declares which port pairs may be connected.
 *
 * This is where interdisciplinary coupling is made explicit. If no rule
 * matches a proposed connection, the kernel rejects it rather than guessing.
 */
/** A channel wildcard matching any channel. Used only in connection rules. */
export type ChannelWildcard = '*';

export interface ConnectionRule {
  readonly sourceChannel: PortChannel | ChannelWildcard;
  readonly targetChannel: PortChannel | ChannelWildcard;
  readonly transfer: TransferFunction;
  /** Which discipline pair this rule describes. `*` matches any. */
  readonly sourceDiscipline: DisciplineId | '*';
  readonly targetDiscipline: DisciplineId | '*';
  readonly description: string;
  /** Confidence of the coupling this rule represents. */
  readonly confidence: ConfidenceLevel;
}
