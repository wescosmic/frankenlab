# FrankenLab — Architecture

This is the reference for anyone changing the code. It explains how the system
is put together and, where a choice was not obvious, why it was made that
way.

---

## 1. The one decision that matters

**The kernel knows nothing about any scientific discipline.**

It knows about components, ports, connections, parameters, state, time and
observations. A discipline is a plugin that supplies component definitions and
a step function. Adding a discipline must never require editing the kernel.

This is what makes the Frankenstein claim structurally true rather than
aspirational. An electrical netlist and a logistic growth curve genuinely do
share one representation, because the representation is the thing that knows
neither of them.

It is also testable. When chemistry was added, the only file outside
`src/engines/chemistry/` that changed was `src/world.ts` (one line) and
`src/kernel/units.ts` (new units). Nothing in the simulation lifecycle
needed to know chemistry existed.

## 2. Layers

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
└──────────────────────────────────────────────────────────────┘
```

Dependencies point downward only. The kernel never imports an engine. Engines
never import each other.

## 3. The core contracts

### 3.1 Definition and behaviour are separate

`ComponentDefinition` is pure serialisable data: metadata, ports, parameters,
initial state, confidence, assumptions, visual hints. **No behaviour.**

`ComponentBehavior` is the behavioural half, registered separately by
component type:

```ts
step(state, inputs, context): State
outputs?(state, context): Record<string, Quantity>
```

Splitting them makes a component testable in isolation, an experiment
serialisable, and the catalogue browsable without executing model code.

`domain` — more precisely `discipline` — is a free-form string, not a union of
four literals. The core type must know nothing about any discipline, and a
fifth discipline must not require editing the core.

### 3.2 Ports carry a channel, not just a unit

```ts
interface PortDefinition {
  id: string;
  label: string;
  direction: 'input' | 'output' | 'bidirectional';
  channel: PortChannel;
  unit: string;
  required: boolean;
  description: string;
}
```

Units alone are insufficient: a 1.5 V reference and a 1.5 V sensor reading
share dimensions but are not interchangeable. The channel captures what a
quantity *means*.

### 3.3 Rules are matched by specificity

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

`registry.findRule` picks the candidate with the fewest wildcards, so an
explicit interdisciplinary coupling governs a link in preference to a generic
same-channel rule.

## 4. The simulation lifecycle

```
Construction
  ├─ validateExperiment()   refuse to run an invalid experiment
  ├─ initialiseStates()     definition initialState + __param_* values
  ├─ initialiseOutputs()    publish each component's starting readings
  ├─ solveNetworks()        establish the initial operating point
  └─ publishNetworkOutputs() publish the solved values

tick()
  1. resolveConnectionValues()  read the values on every connection
  2. solveNetworks()             each discipline analyses its own subgraph
  3. step every component         in a stable, sorted order
  4. recompute outputs            from the new states
  5. advance time by dt
```

### 4.1 Why the initial operating point is solved

Without the last three construction steps, the first network solve sees no
values on any connection. A resistive probe reads "nothing connected" and
behaves as though the medium were bone dry, so a freshly planted experiment
opens in an alarm state. The initial solve fixes that.

This is the single most valuable lesson from building it: **the first frame
must show the experiment the user set up, not an empty one.**

### 4.2 The explicit update scheme

A component acts on the values published on the previous tick. One hop in a
connection chain costs one timestep, which stands in for real sampling and
propagation delay.

This is deliberate. The flagship experiment contains a genuine cycle — the
substrate feeds the plant and the plant feeds the substrate — so no
topological order exists, and a fixed-point iteration would be the only
alternative. The one-tick lag is cheap, honest and documented.

### 4.3 Network solvers are a kernel-level concept

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

## 5. The electronics solver

Real modified nodal analysis, in `src/engines/electronics/engine.ts`:

1. **Union-find** merges terminals that are wired together into nodes.
2. **Every node that carries an element stamp is indexed before the reduced
   unknown set is built.** This is load-bearing. Indexing lazily during
   stamping leaves most nodes out of the unknown set, the matrix becomes
   singular, and the solve "succeeds" with zeros for everything. This was a
   real bug and it looked like a working simulation.
3. Nodes with no element stamp — an unconnected LED, for example — are
   excluded from the unknown set, and looked up rather than created.
4. The source's negative terminal is ground.
5. The MNA matrix is stamped and solved by Gaussian elimination with partial
   pivoting.
6. The solved voltage, current and resistance are reported per element.

### 5.1 The sensor reports a circuit quantity

The sensor's reading is the **divider tap voltage**, normalised to the supply.
The tap is the sensor's node that is not a source rail.

```
battery(+) ──▶ probe.terminal_a
                probe.terminal_b ──▶ reference resistor ──▶ battery(−)
                                     │
                                  tap voltage
                                     ▼
                            comparator ──▶ alert LED
```

As the medium dries the probe's resistance rises, the tap voltage falls, and
the inverted comparator fires. Because the comparator thresholds the solved
voltage rather than the moisture, changing the reference resistor changes the
day the alarm goes off. That is what makes the electronics load-bearing.

### 5.2 A comparator with no input has no decision

The comparator returns "no decision" when its input is unconnected, rather
than comparing zero against the threshold. An inverted comparator would
otherwise report an alarm for a circuit that is simply not connected.

## 6. Units

`DimensionVector` carries exponents over the seven SI base dimensions. The
unit table in `src/kernel/units.ts` is explicit rather than generated, because
every entry is a modelling decision and the table should be auditable at a
glance.

- `convert()` throws on incompatible dimensions.
- Temperature units carry an affine offset (`°C` → `K`).
- A failed conversion is a rejected connection, never a silent coercion.

Chemistry added `mol`, `mol_per_L`, `J`, `J_per_mol` and `L_per_mol_per_s`
when it arrived. The table grew; the engine did not.

## 7. The workbench

- `src/state/lab.ts` — a Zustand store holding the experiment, the running
  simulation and the published readings.
- `src/three/lab-scene.ts` — a class owning the renderer, camera, meshes,
  connections and label layer. It holds **no** simulation state and **no**
  React state.
- `src/components/Workbench.tsx` — owns the frame loop. It advances the
  simulation and republishes readings every 90 ms, so a long run stays smooth
  without flooding React with renders.

The scene reads the store imperatively inside its loop, so the 3D view never
waits on a React render.

### 7.1 A Three.js detail worth knowing

`CSS2DRenderer` resets `display` on every label element each frame and never
sets `position` on it. A label therefore becomes a full-width block unless
its width is pinned with `width: max-content`, and the canvas and the label
layer must share an origin or the labels drift away from the parts they name.

## 8. The assistant

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

Two deliberately do **not**: `modify_parameter` (no undo model) and
`compare_experiments` (no persisted run history). A tool that cannot be
executed reliably is worse than no tool.

`LocalExplainProvider` answers from the same structured context with no
network and no API key, which is what guarantees the demonstration can be
recorded without a working provider.

`findUnsupportedNumbers` flags any number in an assistant reply that does not
appear in the experiment. A provider that breaks the rule is caught by a test.

## 9. Error handling

- Validation runs before every simulation and produces structured issues with
  codes, severities and component or connection ids.
- A failed validation is a **demo beat**, not an error state.
- The kernel never returns a partial result silently. If it cannot run, it
  refuses with a reason.
- The assistant never substitutes a plausible number for a failed
  calculation.
- A singular circuit solve returns zeros and says so, rather than inventing
  node voltages.

## 10. Testing

| File | Covers |
| --- | --- |
| `tests/kernel.test.ts` | Units, determinism, validation, the flagship run. |
| `tests/electronics.test.ts` | The divider solves, Ohm's law, the electronics is load-bearing, the alert's behaviour. |
| `tests/interactions.test.ts` | The couplings are real; explicit rules govern cross-discipline links. |
| `tests/assistant.test.ts` | Tools read real state; the local explainer works; the guard fires. |
| `tests/chemistry.test.ts` | The fifth discipline plugs in without a kernel change; the vessel conserves its balance. |
| `tests/properties/invariants.test.ts` | Energy balance, rail bounds, water conservation, range limits, reproducibility. |

Property-test inputs are drawn from the ranges the component definitions
declare. Drawing from outside them measures the validator, not the model.

Every test builds the world through `tests/world.ts`, which re-exports
`src/world.ts`. If the tests and the product ever built different worlds, a
passing test would stop meaning anything.
