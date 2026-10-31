# FrankenLab — Requirements

**Spec status:** foundation complete, product in progress.
**Last updated:** 2026-10-31.

FrankenLab is an interactive scientific sandbox. It lets a user assemble
components from different scientific disciplines into one experiment, run it,
watch the parts respond to each other, and ask an assistant to explain what
happened.

The point is not four separate simulators. It is **one shared environment** in
which an electrical netlist and a logistic growth curve genuinely interact,
because the representation they share knows neither of them.

---

## 1. Functional requirements

### 1.1 The simulation kernel

- **FR-1.1** The kernel shall model components, ports, connections,
  parameters, state, environment variables, observations and time.
- **FR-1.2** The kernel shall not import or reference any scientific
  discipline. Adding a discipline shall never require editing the kernel.
- **FR-1.3** The kernel shall register component definitions and behaviours
  separately, so a definition is pure serialisable data.
- **FR-1.4** The kernel shall validate an experiment before running it and
  refuse to run an invalid one, listing every blocking problem in plain
  English.
- **FR-1.5** The kernel shall advance time by a fixed timestep only.
- **FR-1.6** The kernel shall use a seeded random generator only.
- **FR-1.7** The kernel shall step components in a stable, sorted order.
- **FR-1.8** Given the same experiment and the same seed, the kernel shall
  produce identical results across runs.
- **FR-1.9** The kernel shall publish each component's initial outputs before
  the first step, so a fresh experiment starts from its stated condition
  rather than from an empty one.
- **FR-1.10** The kernel shall expose the live state as a snapshot that the
  UI and the assistant both read.

### 1.2 Units and channels

- **FR-1.11** Every physical value shall be a `{ value, unit }` pair. A
  bare number is a defect.
- **FR-1.12** The unit system shall convert between compatible units,
  including affine temperature conversion.
- **FR-1.13** Converting between incompatible dimensions shall throw rather
  than coerce.
- **FR-1.14** Every port shall declare a semantic channel in addition to its
  unit, so a reference voltage cannot be wired to a sensor reading.
- **FR-1.15** A connection between incompatible channels shall be rejected
  unless a rule explicitly sanctions the change.

### 1.3 Disciplines

- **FR-1.16** Electronics shall solve resistive networks by modified nodal
  analysis, not by scripted answers.
- **FR-1.17** The electronics solver shall report the solved node voltage,
  branch current and resistance for each element.
- **FR-1.18** Biology shall model plant growth as logistic growth limited by
  water, nutrients and temperature, with transpiration as an absolute rate.
- **FR-1.19** Materials shall model a medium as two water reservoirs
  (free and bound) with percolation, retention and plant-available water
  normalised between the wilting point and field capacity.
- **FR-1.20** Chemistry shall model a closed vessel running a reversible
  reaction with mass-action kinetics and an Arrhenius temperature
  dependence.
- **FR-1.21** Each discipline shall publish its own connection rules.
- **FR-1.22** Each component shall declare a confidence level and its stated
  assumptions.

### 1.4 Interdisciplinary coupling

- **FR-1.23** Every cross-discipline link shall be a named, documented rule
  with a confidence level and a written explanation of the physical chain.
- **FR-1.24** When several rules could match a proposed connection, the most
  specific rule shall govern.
- **FR-1.25** A connection with no matching rule shall be rejected with an
  explanation.
- **FR-1.26** The flagship experiment shall exercise at least three
  disciplines in one causal chain, with each link visibly load-bearing.

### 1.5 The AI lab assistant

- **FR-1.27** The assistant shall receive a structured context: the
  experiment, component definitions, the latest kernel result and validation
  issues.
- **FR-1.28** Every assistant tool shall read or act on real kernel state.
  No tool shall return a synthesised number.
- **FR-1.29** The product shall remain fully usable with no AI provider
  configured. A deterministic local explainer shall answer from the same
  structured context.
- **FR-1.30** The assistant shall never claim an experiment has been run
  unless the kernel executed it.
- **FR-1.31** The assistant shall cite the confidence level and assumptions of
  any model it describes.
- **FR-1.32** The assistant shall flag any number in its output that does not
  appear in the experiment.

### 1.6 The laboratory workbench

- **FR-1.33** The workbench shall render the experiment in a Three.js scene,
  with one mesh per component and visible connections.
- **FR-1.34** The 3D scene shall animate from real simulation outputs.
- **FR-1.35** The user shall be able to select a component from the scene or
  from the catalogue, and inspect its definition, confidence, assumptions,
  parameters and ports.
- **FR-1.36** The user shall be able to change a parameter and re-run.
- **FR-1.37** The workbench shall show live readings and a chart of the
  tracked series.
- **FR-1.38** The workbench shall offer run, pause and reset.
- **FR-1.39** The catalogue shall list every component in the product,
  grouped by discipline, with its confidence level.

### 1.7 Experiments

- **FR-1.40** An experiment shall be fully described by serialisable data:
  components, connections, parameters, environment, timestep, duration and
  seed.
- **FR-1.41** The product shall ship at least one ready-made experiment.

---

## 2. Non-functional requirements

- **NFR-1** The core simulation shall not depend on any AI provider, any
  network call or any external service.
- **NFR-2** The core simulation shall not import React, Three.js or any UI
  library.
- **NFR-3** The product shall build and run with no API key set.
- **NFR-4** `npm run typecheck`, `npm run lint` and `npm test` shall all pass
  before any change is considered complete.
- **NFR-5** The project shall use no dependency that is not already needed.
  Three.js is used directly, not through React Three Fiber, so the kernel
  owns the frame loop with no reconciler inside it.
- **NFR-6** A simulation of the flagship experiment shall complete in under
  one second on ordinary desktop hardware.
- **NFR-7** The workbench shall remain usable at a 1280-pixel viewport.
- **NFR-8** The 3D scene shall run at a stable frame rate on integrated
  graphics.

---

## 3. Acceptance criteria for the flagship experiment

Project BioCircuit is a plant in a medium, with a resistive probe, a voltage
divider, a comparator and an alert LED. The user changes the medium or the
circuit and watches the alert change.

- **AC-1** The experiment validates with zero errors.
- **AC-2** A 21-day run at a one-hour timestep completes in 504 steps.
- **AC-3** The plant's biomass increases over the run.
- **AC-4** The medium dries, and clay stays wetter than sand.
- **AC-5** The probe's resistance rises as the medium dries.
- **AC-6** The probe's reported reading is the **solved divider voltage**,
  not the moisture that drove it.
- **AC-7** Changing the reference resistor changes the reading, and changes
  the day the alert fires.
- **AC-8** The alert fires on day 8 in sand, on day 13 in loam and on day 15 in
  clay, and does not fire at all in hydrogel inside a 21-day run.
- **AC-9** The alert never fires on a freshly planted experiment.
- **AC-10** The source delivers exactly the power the resistors dissipate.
- **AC-11** Two runs with the same seed produce identical results.

---

## 4. Out of scope for the foundation

These are deliberately not built yet, and are recorded in
`docs/ROADMAP.md` with their entry conditions:

- Drag-and-drop wiring in the 3D scene.
- The mission and experiment-notebook system.
- Saving and sharing experiments to a backend.
- A chemistry experiment that a user can run end to end.
- A third-party LLM provider integration.
- `modify_parameter` and `compare_experiments` assistant tools.
