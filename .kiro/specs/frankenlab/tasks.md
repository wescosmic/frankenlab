# FrankenLab — Tasks

**Spec status:** phases 0 to 4 complete, phase 5 in progress.
**Last updated:** 2026-11-01.

Each task names the files it touches, what "done" means, and how you check it.
Work top to bottom. The ordering is a dependency order, not a preference.

Legend: `[x]` done and verified · `[ ]` not started · `[~]` deliberately deferred

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

**Complete.** The foundation works, but three things were not yet right. They
were fixed before anything new was built.

### 1.1 The MNA solver's node indexing — done

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

### 1.2 The comparator's output port key — done

**Files:** `src/engines/electronics/engine.ts`
**Problem:** the comparator publishes its decision under the key `decision`,
but its output port is named `output`, so the connection to the LED delivers
nothing and the alert never lights.
**Fix:** publish under the port id `output`, and keep `decision` as a
readable alias.
**Done when:** the LED's brightness follows the comparator's decision.

### 1.3 The sensor's reported reading — done

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

### 1.4 Add the missing test coverage — done

**Files:** `tests/`
Added:

- Serialisation and restoration: an experiment survives a JSON round trip and
  produces the same result.
- Validation edge cases: a required port left unconnected; a port direction
  violation; a parameter outside its enum options.
- `findRule` specificity: an explicit coupling beats a generic rule.
- The assistant's `findUnsupportedNumbers` on a reply that invents a value.

**Done when:** `npm test` passes with each new case named after a behaviour.

### 1.5 The port contract — done, and it was overdue

**Files:** `tests/ports.test.ts`, `src/engines/`
**Problem:** a connection is resolved by looking up the source's port id in
the values the source publishes. A value published under any other name is a
value no wire can carry, and it fails silently. The chemistry vessel published
`stoichiometricBalance` while the port was called `stoichiometric_balance`.
**Fix:** every output port publishes under its own port id. The test wires
every component in the world into one graph and checks three things: every
component type is covered, every output port publishes under its own port id,
and nothing is published that is not a port or a declared reading.

**Done when:** the contract test passes, and the three bugs it found are
fixed: the floating-island collapse, the battery's missing terminals, and the
undeclared diagnostics.

### 1.6 An unwired part must not break the circuit — done

**Files:** `src/engines/electronics/engine.ts`
**Problem:** a part dropped on the bench but not wired in formed its own
island of nodes with no path to a source. The nodal analysis matrix became
singular and every reading in the circuit dropped to zero.
**Fix:** find the islands before the matrix is built and drop the ones that
cannot carry current.

**Done when:** an unwired switch on the bench leaves the divider reading
unchanged.

---

## Phase 2 — The workbench becomes an instrument

**Complete.**

### 2.1 Drag-and-drop wiring — done

**Files:** `src/three/lab-scene.ts`, `src/state/lab.ts`, `src/components/`
Let the user drag a component from the catalogue onto the bench and connect
ports by dragging from one port to another.

**Done when:** a user can build a working circuit in the scene, and the
validator rejects an invalid connection with a readable message in the UI.

### 2.2 Parameter editing that does not reset the run — done

**Files:** `src/state/lab.ts`
Today `setParameter` rebuilds the simulation, which is correct but blunt.
Let a parameter change apply to the live run where the model allows it.

**Done when:** moving a slider changes the reading without the run restarting,
and the change is still reproducible from the same seed.

### 2.3 A real results panel — done

**Files:** `src/components/Readouts.tsx`
Show the full measurement set, not just four tracked series. Add a
per-component table with units.

**Done when:** every measurement the kernel produced is reachable in the UI.

### 2.4 Observations — done

**Files:** `src/kernel/simulator.ts`, `src/engines/`
The kernel already carries an `Observation` type and nothing produces any.
Make the engines emit them: "the medium has reached its wilting point", "the
alert fired", "the plant's growth has stalled".

**Done when:** the run shows a timeline of what happened and why.

---

## Phase 3 — Content

**Complete, with 3.3 deferred on purpose.**

### 3.1 A second experiment — done, and then a third

**Files:** `src/scenarios/`
A pure electronics experiment (a resistive divider with a comparator) and a
chemistry experiment (a reaction vessel driven by temperature). Both exist,
plus the flagship. The catalogue lists them and each opens on the bench.

**Done when:** the catalogue can list and open both, and each has its own
acceptance criteria in the spec.

### 3.2 The chemistry boundary becomes a real experiment — done

**Files:** `src/engines/chemistry/engine.ts`, `src/scenarios/`
Give the vessel a catalyst parameter, so a user can watch a reaction rate
change and see that the catalyst cannot move the equilibrium.

**Done when:** the chemistry experiment runs end to end in the UI and its
conservation check is visible.

> The concentration feed was dropped on purpose. The vessel is closed, and a
> feed would make the conservation check approximate rather than exact. The
> catalyst does the job the feed was going to do: it changes the rate, and it
> changes nothing else.

### 3.3 Material properties in a circuit — deferred

**Files:** `src/engines/materials/engine.ts`, `src/interactions/couplings.ts`
Put a `materials.conductor` in the BioCircuit's divider so the reference
resistor's material decides the operating point.

**Deferred.** The materials engine would have to contribute elements to the
electronics solve, which is a larger change than the time allowed. The
materials-to-electronics coupling is already visible in the flagship, where
the medium's moisture decides the day the alert goes off: sand on day 11,
loam on day 13, clay on day 17, hydrogel not within 24 days.

---

## Phase 4 — The assistant earns trust

### 4.1 Provider-agnostic LLM integration — not started

**Files:** `src/assistant/`
Keep `LocalExplainProvider` as the fallback. Add an optional provider that
calls a configured endpoint.

**Done when:** the product works identically with the provider disabled, and
the provider path is covered by tests that stub the network.

### 4.2 `modify_parameter` and `compare_experiments` — not started

Only after an undo model and a run history exist. Both are excluded from the
MVP on purpose.

**Done when:** the assistant can change a parameter and the user can undo it,
and two runs can be compared with real numbers on both sides.

### 4.3 The ungrounded-number guard in the UI — done

**Files:** `src/components/Assistant.tsx`, `src/assistant/trust.ts`
Surface the guard's verdict to the user rather than only using it in tests.

**Done when:** a provider that invents a number is visibly flagged.

### 4.4 The assistant explains confidence — done, and on every reply

**Files:** `src/assistant/trust.ts`
The confidence of an experiment is the confidence of its weakest model, so
every reply names the part that sets the limit and says what that level
means in plain English. The panel shows it as a badge.

**Done when:** every reply ends with what to trust, and the badge agrees
with it.

**Done when:** a judge can break the assistant on purpose and watch it refuse.

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

---

# Hackathon delivery plan

**Deadline: 4 December 2026, 2:00 PM Pacific.** Today: 31 October 2026.
The Kiro credit request form is due **1 December 2026, 12:00 PM Pacific**.

This plan replaces the old phase ordering. The old one optimised for a clean
product. This one optimises for the five judging criteria, weighted equally:
Potential Impact, Technological Implementation, Design, Innovation,
Presentation.

Judges watch a three-minute video. Every phase below exists because it is
visible in that video or in the ten seconds a judge spends deciding whether
the project is real.

| Phase | What it adds | Criteria it moves | Effort |
| ----- | ------------ | ----------------- | ------ |
| 1 | The run tells a story: observations, a live timeline, every measurement | Design, Presentation | Medium |
| 2 | The user builds experiments: drag-and-drop wiring, live parameters, saved experiments | Impact, Innovation | High |
| 3 | More science: chemistry end to end, materials in the circuit, a second experiment | Innovation, Technological Implementation | Medium-high |
| 4 | The assistant earns trust: live provider, grounded-number guard in the UI, run comparison | Innovation, Impact | Medium |
| 5 | Ship and present: deployment, video, README, screenshots, public repo | Presentation, and the Stage One gate | Medium |

Nothing here replaces the earlier work. Phases 1 to 5 sit on top of the
foundation that is already verified.

## Phase 1 — The run tells a story

**Why first.** A run currently produces numbers and nothing else. A judge
watching two minutes of a chart learns very little. A run that narrates itself
is the difference between a simulator and an instrument.

**1.1 Observations become a first-class output**

The kernel already carries an `Observation` type and an empty `#observations`
array. Nothing populates it. Give the behaviour contract an optional
`observe(state, context)` that returns observations, and have the kernel
collect them after each step.

- The kernel collects. It does not know what an observation means.
- Observers live in the engines, next to the physics that justifies them.
- An observation carries a time, an optional component id, a severity and a
  plain-English message.

**1.2 The engines report what happened**

- materials: the medium reached its wilting point; the medium recovered.
- biology: growth stalled; the plant reached maturity.
- electronics: the alert fired; the alert cleared.
- chemistry: the reaction approached equilibrium.

**1.3 The workbench shows the story**

- A timeline panel listing observations in time order, colour-coded by severity.
- A results panel showing every measurement the kernel produced, with units,
  not just the four tracked series.
- The assistant already reads observations. It now has real ones.

**Done when:** a 14-day BioCircuit run produces a readable narrative — the
medium dries, the plant wilts, the alert fires, the medium recovers — visible
in the UI without reading the numbers, and the assistant can explain the run
from the same record.

**Acceptance:**

- `npm test` includes a case that asserts the alert observation fires on the
  day the alert fires, and that observations are ordered by time.
- The timeline renders every observation the kernel produced, with no
  filtering.
- No number in the timeline or the results panel is computed in the UI.

## Phase 2 — The user builds experiments

**Why.** The brief describes a journey where the user assembles a circuit and
watches it behave. Right now they can only watch the one experiment we built.
That is the largest gap between the product and the brief.

**2.1 Drag a component onto the bench.** From the catalogue, onto the 3D
scene. It appears, with its ports, and it takes part in the simulation.

**2.2 Connect two ports by dragging.** The validator rejects an invalid
connection with a readable message in the UI, not a silent no-op.

**2.3 Edit a parameter without restarting the run.** Where the model allows
it, a slider change applies to the live experiment and the run stays
reproducible from the same seed.

**2.4 Save and reopen an experiment.** An experiment survives a JSON round trip
and produces the same result.

**Done when:** a user can build a working circuit from nothing and watch the
same physics we ship with.

**Acceptance:**

- A test builds an experiment through the public API, not through a fixture.
- A test asserts an invalid connection is rejected with a message a
  non-specialist can read.
- A test asserts a saved experiment reloads to an identical result.

## Phase 3 — More science

**Why.** One experiment is a demo. Three is a platform. The judges are
scoring whether the architecture is real, and the fastest proof is a second
discipline that needed no kernel work.

**3.1 The chemistry boundary becomes a real experiment.** A second reaction,
a catalyst parameter and a concentration feed, so a user can watch a rate
change. The conservation check is visible.

**3.2 Material properties decide a circuit's operating point.** Put a
`materials.conductor` in the BioCircuit divider, so the reference resistor's
material decides the day the alert fires.

**3.3 A second experiment in the catalogue.** A pure electronics experiment
and a chemistry experiment, each with its own acceptance criteria.

**Done when:** the catalogue lists at least three experiments and each one
demonstrates a different pairing of disciplines.

## Phase 4 — The assistant earns trust

**Why.** "The simulation computes. The AI interprets. The user decides." The
first two are done. The third is not, because the assistant cannot yet be
shown to refuse a number.

**4.1 Surface the grounded-number guard in the UI.** A provider that invents a
number is visibly flagged, in front of the user, not only in a test.

**4.2 An optional live provider.** `LocalExplainProvider` stays the default
and the product works identically with the provider disabled. The provider
path is covered by tests that stub the network.

**4.3 Compare two runs.** The assistant can put two experiments side by side
with real numbers on both sides.

**4.4 The assistant explains confidence.** It says which parts of its answer
are physical law and which are teaching simplification.

**Done when:** a judge can break the assistant on purpose and watch it refuse.

## Phase 5 — Ship and present

**Why.** Without this there is no submission.

**5.1 Deployment.** A public URL, working with no API key, reachable free of
charge until 29 January 2027.

**5.2 The three-minute video.** Built on five beats: planted, growing, drying
out, alert triggered, recovery. Script first, then record against the deployed
build. Public on YouTube, under three minutes.

**5.3 The README.** What it is, the architecture in one diagram, how to run
it, how to add a discipline, and the honest limitations.

**5.4 Screenshots.** The workbench, the catalogue, the inspector, a mid-run
chart and the timeline.

**5.5 The public repository.** Pushed, public, with a visible OSS licence and
`/.kiro` at the root, not gitignored.

**5.6 The social post.** Starts with `#KiroweenHackathon26`.

**Done when:** a stranger can clone, run and extend it from the README alone,
and the video shows the app running for real.

