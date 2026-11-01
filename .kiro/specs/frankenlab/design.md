# FrankenLab — Design

**Spec status:** foundation complete, product in progress.
**Last updated:** 2026-10-31.

This document describes how the system is built and, where a choice was not
obvious, why it was made that way. It is the reference a new contributor reads
before changing anything.

---

## 1. Shape of the system

```
┌──────────────────────────────────────────────────────────────┐
│  UI: React panels + Three.js scene                           │
│  Library · Workbench · Inspector · Readouts · Assistant      │
└───────────────┬──────────────────────────────┬───────────────┘
                │ reads                        │ issues intents
┌───────────────▼──────────────────────────────▼───────────────┐
│  Application: workbench store (Zustand) + assistant facade   │
└───────────────┬──────────────────────────────┬───────────────┘
                │ calls                         │ structured context
┌───────────────▼──────────────────────────────▼───────────────┐
│  KERNEL — knows no discipline                                │
│  units · types · registry · validate · simulator             │
└───────────────┬──────────────────────────────────────────────┘
                │ plugin interface
┌───────────────▼──────────────────────────────────────────────┐
│  ENGINES: electronics · biology · materials · chemistry      │
│  Each supplies definitions, behaviours, rules, optionally     │
│  a network solver.                                           │
└──────────────────────────────────────────────────────────────┘
```

**The rule that makes the whole thing work:** the kernel never imports an
engine and an engine never imports another engine. Everything cross-
disciplinary is expressed as a *rule* in `src/interactions/couplings.ts`.

---

## 2. The component contract

### 2.1 Definition and behaviour are separate

```ts
interface ComponentDefinition {
  type: string;              // 'electronics.resistor'
  name: string;
  discipline: string;        // free-form, not a union
  category: string;
  description: string;
  ports: readonly PortDefinition[];
  parameters: readonly ParameterDefinition[];
  initialState?: Record<string, Quantity | number | boolean | Record<string, Quantity>>;
  confidence: ConfidenceLevel;
  assumptions: readonly string[];
  visual: { shape; color; emissive?; label? };
}

interface ComponentBehavior<S> {
  type: string;
  step(state: S, inputs: Record<string, Quantity>, context: StepContext): S;
  outputs?(state: S, context: StepContext): Record<string, Quantity>;
}
```

**Why split?** A definition is pure data. That makes a component testable in
isolation, an experiment serialisable, and the catalogue browsable without
executing a single line of model code. The catalogue is a real feature, not a
mock.

**Why is `discipline` a free-form string rather than a union of five
literals?** Because the core type must know nothing about any discipline. If
it named them, a sixth discipline would require editing the kernel, and the
"kernel knows nothing" claim would be a convention rather than a fact.

### 2.2 Ports carry a channel, not just a unit

```ts
interface PortDefinition {
  id: string;
  label: string;
  direction: 'input' | 'output' | 'bidirectional';
  channel: PortChannel;      // 'moisture' | 'signal' | 'electrical-potential' | …
  unit: string;
  required: boolean;
  description: string;
}
```

Units alone are not enough. A 1.5 V reference and a 1.5 V sensor reading share
dimensions but are not interchangeable. The channel says what a quantity
*means*.

### 2.3 Rules are matched by specificity

```ts
interface ConnectionRule {
  sourceChannel: PortChannel | '*';
  targetChannel: PortChannel | '*';
  transfer: TransferFunction;
  sourceDiscipline: string | '*';
  targetDiscipline: string | '*';
  description: string;
  confidence: ConfidenceLevel;
}
```

`registry.findRule` picks the candidate with the **fewest wildcards**. An
explicit interdisciplinary coupling therefore governs a link in preference to a
generic same-channel rule.

---

## 3. The simulation lifecycle

```
Simulation constructed
  ├─ validateExperiment(...)  → refuse to run an invalid experiment
  ├─ initialiseStates()       → definition initialState + __param_* values
  ├─ initialiseOutputs()      → publish each component's starting readings
  ├─ solveNetworks(...)       → establish the initial operating point
  └─ publishNetworkOutputs()  → publish the solved values

tick()
  1. resolveConnectionValues()   read the values on every connection
  2. solveNetworks(...)          each discipline analyses its own subgraph
  3. step every component        in a stable, sorted order
  4. recompute outputs           from the new states
  5. advance time by dt
```

### 3.1 Why the initial operating point is solved

Without step 2–4 of construction, the first network solve sees no values on
any connection. A resistive probe would read "nothing connected" and behave as
though the medium were bone dry — so a freshly planted experiment would open
in an alarm state. The initial solve fixes that, and the alert now first
fires on day 11 in sand, as it should.

### 3.2 The explicit update scheme

A component acts on the values published on the **previous** tick. One hop in
a connection chain therefore costs one timestep, which stands in for real
sampling and propagation delay.

This is a deliberate choice, not an oversight. The flagship experiment
contains a genuine cycle — the substrate feeds the plant and the plant feeds
the substrate — so no topological order exists and a fixed-point iteration
would be the only alternative. The one-tick lag is cheap, honest and
documented. The tests assert the causal chain, including the delay.

### 3.3 Network solvers are a kernel-level concept

```ts
interface NetworkSolver {
  discipline: string;
  solve(input: NetworkSolveInput): Map<string, Record<string, Quantity>>;
}
```

A discipline may analyse its own connected subgraph before any component
steps. The kernel routes the call and knows nothing about nodes or voltages.
This is how the electronics engine runs nodal analysis without the kernel
knowing what a node is.

---

## 4. The electronics solver

Real modified nodal analysis:

1. Union-find merges terminals that are wired together into nodes.
2. **Every node that carries an element stamp is indexed before the reduced
   unknown set is built.** This is load-bearing. Indexing lazily during
   stamping leaves most nodes out of the unknown set, the matrix becomes
   singular, and the solve "succeeds" with zeros for everything.
3. Nodes with no element stamp — an unconnected LED, for example — are
   excluded from the unknown set, and are looked up rather than created.
4. The source's negative terminal is ground.
5. Stamp the MNA matrix, solve by Gaussian elimination with partial pivoting.
6. Report the solved voltage, current and resistance per element.

The sensor's reported reading is the **divider tap voltage**, found as the
sensor's node that is not a source rail. The comparator thresholds that, not
the biological value that drove it. This is what makes the electronics
load-bearing rather than decorative: change the reference resistor and the
day the alert fires changes with it.

### 4.1 The BioCircuit wiring

```
battery(+) ──▶ probe.terminal_a
                probe.terminal_b ──▶ reference resistor ──▶ battery(−)
                                     │
                                  tap voltage
                                     ▼
                            comparator ──▶ alert LED
```

As the medium dries, the probe's resistance rises, the tap voltage falls,
the comparator (inverted) fires, and the LED lights. With a 10 kΩ reference
resistor and a 0.4 threshold, the alert fires on day 11 in sand, day 13 in
loam and day 17 in clay. Hydrogel holds its water for longer than the 24-day
run, so it never alarms in this experiment.

---

## 5. The unit system

`DimensionVector` carries exponents over the seven SI base dimensions.
Units are declared explicitly in one table rather than generated, because
every entry is a modelling decision and the table should be auditable at a
glance.

- `convert()` throws on incompatible dimensions.
- Temperature units carry an affine offset (`°C` → `K`).
- A conversion failure is a rejected connection, never a silent coercion.

Chemistry added `mol`, `mol_per_L`, `J`, `J_per_mol` and
`L_per_mol_per_s` when that discipline arrived — the table grew, the engine
did not.

---

## 6. The workbench

- `src/state/lab.ts` — a Zustand store holding the experiment, the running
  simulation and the published readings.
- `src/three/lab-scene.ts` — a class owning the renderer, the camera, the
  meshes, the connections and the label layer. It holds **no** simulation
  state and **no** React state.
- `src/components/Workbench.tsx` — owns the frame loop. It advances the
  simulation and republishes the readings on a fixed cadence (90 ms), so a
  long run stays smooth without flooding React with renders.

The scene reads the store imperatively inside its loop, so the 3D view never
waits on a React render.

### 6.1 A Three.js detail worth knowing

`CSS2DRenderer` resets `display` on every label element and never sets
`position` on it. A label therefore becomes a full-width block unless its
width is pinned with `width: max-content`, and the canvas and the label layer
must share an origin or the labels drift away from the parts they name.

---

## 7. The assistant

```ts
interface AssistantContext {
  experiment: ExperimentDefinition;
  components: readonly ComponentDefinition[];
  latestResult?: SimulationResult;
  runCount: number;
  validations: readonly { code: string; message: string }[];
}
```

Five tools ship: `inspect_experiment`, `inspect_component`,
`validate_connections`, `retrieve_observations`, `explain_confidence`.

Two deliberately do **not** ship: `modify_parameter` (there is no undo model)
and `compare_experiments` (there is no persisted run history). A tool that
cannot be executed reliably is worse than no tool.

`LocalExplainProvider` answers from the same structured context with no
network and no API key, which is what guarantees the demonstration can be
recorded without a working provider.

---

## 8. Testing strategy

| File | Covers |
| --- | --- |
| `tests/kernel.test.ts` | Units, determinism, validation, the flagship run. |
| `tests/electronics.test.ts` | The divider solves, Ohm's law, the electronics is load-bearing, the alert's behaviour. |
| `tests/interactions.test.ts` | The couplings are real, and explicit rules govern cross-discipline links. |
| `tests/assistant.test.ts` | Tools read real state; the local explainer works; the ungrounded-number guard fires. |
| `tests/chemistry.test.ts` | The fifth discipline plugs in without a kernel change; the vessel conserves its stoichiometric balance. |
| `tests/properties/invariants.test.ts` | Energy balance, rail bounds, water conservation, range limits, reproducibility. |

Property-test inputs are drawn from the ranges the component definitions
declare. Drawing from outside them measures the validator, not the model.
