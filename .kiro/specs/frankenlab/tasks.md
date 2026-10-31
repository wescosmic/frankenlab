# FrankenLab — Tasks

**Spec status:** foundation complete, product in progress.
**Last updated:** 2026-10-31.

Each task names the files it touches, what "done" means, and how you check it.
Work top to bottom. The ordering is a dependency order, not a preference.

Legend: `[x]` done and verified · `[ ]` not started

---

## Phase 0 — Foundation (complete)

- [x] **0.1** Scaffold the repository: Next.js 16, React 19, TypeScript 5
      strict, Tailwind 4, Three.js, Zustand, Vitest, fast-check, pnpm.
- [x] **0.2** Write the dimensional unit system with affine temperature
      handling and refusal on incompatible dimensions.
- [x] **0.3** Write the core contracts: definitions, behaviours, ports,
      channels, rules, confidence levels, experiments, results.
- [x] **0.4** Write the registry with specificity-ordered rule matching.
- [x] **0.5** Write the validator and its plain-English explanations.
- [x] **0.6** Write the simulation kernel: fixed timestep, seeded RNG, stable
      ordering, connection resolution, network solving, snapshots.
- [x] **0.7** Write the electronics engine with real modified nodal analysis.
- [x] **0.8** Write the biology engine: logistic growth, transpiration,
      nutrient reservoir, moisture source.
- [x] **0.9** Write the materials engine: two-reservoir water balance,
      percolation, retention, plant-available water, conductive specimens.
- [x] **0.10** Write the interdisciplinary coupling rules.
- [x] **0.11** Write the assistant: structured context, five executable
      tools, the local explainer, the ungrounded-number guard.
- [x] **0.12** Build the flagship experiment, Project BioCircuit.
- [x] **0.13** Add the chemistry boundary: a substance catalogue entry and a
      reversible reaction vessel with Arrhenius kinetics.
- [x] **0.14** Build the workbench: catalogue, 3D scene, inspector, readouts,
      chart, assistant panel.
- [x] **0.15** Establish the tooling: eslint flat config, vitest config,
      typecheck, the `verify` script.
- [x] **0.16** Write the Kiro steering documents and this spec.

---

## Phase 1 — Correctness and coverage (do this first)

The foundation works, but three things are not yet right. Fix them before
building anything new.

### 1.1 The MNA solver's node indexing

**Files:** `src/engines/electronics/engine.ts`
**Problem:** node indices are assigned lazily by `nodeOf()` *after* the
reduced unknown set has been built from `nodeIndex.values()`, so most nodes
are missing from the unknown set and the matrix is singular.
**Fix:** assign indices for **all** element terminals first, then derive
`reducedIndex`, then stamp. Nodes with no element stamp must be excluded from
the unknown set, and the LED section must look up its node index without
creating one.
**Done when:** the solver returns non-zero voltages for every element and
`scripts/debug-solver.ts` prints real numbers.

### 1.2 The comparator's output port key

**Files:** `src/engines/electronics/engine.ts`
**Problem:** the comparator publishes its decision under the key `decision`,
but its output port is named `output`, so the connection to the LED delivers
nothing and the alert never lights.
**Fix:** publish under the port id `output`, and keep `decision` as a
readable alias.
**Done when:** the LED's brightness follows the comparator's decision.

### 1.3 The sensor's reported reading

**Files:** `src/engines/electronics/engine.ts`
**Problem:** the sensor falls back to the raw sensed value whenever the solve
produces no `signal`, so the comparator thresholds the moisture instead of a
circuit quantity and the electronics is decorative.
**Fix:** report the **solved divider tap voltage**, normalised to the supply.
The tap is the sensor's node that is not a source rail.
**Done when:** changing the reference resistor changes the reading and the day
the alert fires.

> Note: parts of 1.1–1.3 have already been applied and are covered by
> `tests/electronics.test.ts`. Confirm the current behaviour before changing
> anything, and keep the tests passing.

### 1.4 Add the missing test coverage

**Files:** `tests/`
Still to add:

- Serialisation and restoration: an experiment survives a JSON round trip and
  produces the same result.
- Validation edge cases: a required port left unconnected; a port direction
  violation; a parameter outside its enum options.
- `findRule` specificity: an explicit coupling beats a generic rule.
- The assistant's `findUnsupportedNumbers` on a reply that invents a value.

**Done when:** `npm test` passes with each new case named after a behaviour.

---

## Phase 2 — The workbench becomes an instrument

### 2.1 Drag-and-drop wiring

**Files:** `src/three/lab-scene.ts`, `src/state/lab.ts`, `src/components/`
Let the user drag a component from the catalogue onto the bench and connect
ports by dragging from one port to another.

**Done when:** a user can build a working circuit in the scene, and the
validator rejects an invalid connection with a readable message in the UI.

### 2.2 Parameter editing that does not reset the run

**Files:** `src/state/lab.ts`
Today `setParameter` rebuilds the simulation, which is correct but blunt.
Let a parameter change apply to the live run where the model allows it.

**Done when:** moving a slider changes the reading without the run restarting,
and the change is still reproducible from the same seed.

### 2.3 A real results panel

**Files:** `src/components/Readouts.tsx`
Show the full measurement set, not just four tracked series. Add a
per-component table with units.

**Done when:** every measurement the kernel produced is reachable in the UI.

### 2.4 Observations

**Files:** `src/kernel/simulator.ts`, `src/engines/`
The kernel already carries an `Observation` type and nothing produces any.
Make the engines emit them: "the medium has reached its wilting point", "the
alert fired", "the plant's growth has stalled".

**Done when:** the run shows a timeline of what happened and why.

---

## Phase 3 — Content

### 3.1 A second experiment

**Files:** `src/scenarios/`
A pure electronics experiment (a resistive divider with a comparator) and a
chemistry experiment (a reaction vessel driven by temperature).

**Done when:** the catalogue can list and open both, and each has its own
acceptance criteria in the spec.

### 3.2 The chemistry boundary becomes a real experiment

**Files:** `src/engines/chemistry/engine.ts`, `src/scenarios/`
Give the vessel a second reaction, a catalyst parameter and a concentration
feed, so a user can watch a reaction rate change.

**Done when:** the chemistry experiment runs end to end in the UI and its
conservation check is visible.

### 3.3 Material properties in a circuit

**Files:** `src/engines/materials/engine.ts`, `src/interactions/couplings.ts`
Put a `materials.conductor` in the BioCircuit's divider so the reference
resistor's material decides the operating point.

**Done when:** choosing copper instead of graphite changes the day the alert
fires.

---

## Phase 4 — The assistant grows a provider

### 4.1 Provider-agnostic LLM integration

**Files:** `src/assistant/`
Keep `LocalExplainProvider` as the fallback. Add an optional provider that
calls a configured endpoint.

**Done when:** the product works identically with the provider disabled, and
the provider path is covered by tests that stub the network.

### 4.2 `modify_parameter` and `compare_experiments`

Only after an undo model and a run history exist. Both are excluded from the
MVP on purpose.

**Done when:** the assistant can change a parameter and the user can undo it,
and two runs can be compared with real numbers on both sides.

### 4.3 The ungrounded-number guard in the UI

**Files:** `src/components/Assistant.tsx`
Surface the guard's verdict to the user rather than only using it in tests.

**Done when:** a provider that invents a number is visibly flagged.

---

## Phase 5 — Shipping

### 5.1 Deployment

**Files:** `Dockerfile` or the platform config, `README.md`
The app must be reachable free of charge until 29 January 2027, and it must
work with no API key set.

**Done when:** a fresh visitor on a public URL sees the working laboratory.

### 5.2 The demonstration

**Files:** `docs/DEMO.md`
A three-minute script built on the five beats in
`BIOCIRCUIT_BEATS`: planted, growing, drying out, alert triggered, recovery.

**Done when:** the script has been recorded against the deployed build and
the recording is under three minutes.

### 5.3 The README

**Files:** `README.md`
What it is, the architecture in one diagram, how to run it, how to extend it
with a new discipline, and the honest limitations.

**Done when:** a stranger can clone, run and extend it from the README alone.

---

## Definition of done, for every task

1. `npm run typecheck` is clean.
2. `npm run lint` is clean.
3. `npm test` passes.
4. New behaviour has a test that fails without the change.
5. New components have a confidence level and stated assumptions.
6. New cross-discipline links are named rules in `src/interactions/couplings.ts`.
7. Nothing in the UI or the assistant shows a number that did not come out of
   the kernel.
