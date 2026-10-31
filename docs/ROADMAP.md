# FrankenLab — Roadmap

What is built, what is next, and what each piece waits for.

**Last updated:** 2026-10-31.

---

## Where the product stands

| Area | State | Notes |
| --- | --- | --- |
| Simulation kernel | **Working** | Units, validation, lifecycle, determinism, network solvers. |
| Electronics | **Working** | Real modified nodal analysis. DC resistive only. |
| Biology | **Working** | Logistic growth, transpiration, nutrients. Teaching scale. |
| Materials | **Working** | Two-reservoir water balance, four presets, conductors. |
| Chemistry | **Boundary only** | One reversible reaction in one closed vessel. |
| Interdisciplinary coupling | **Working** | Five named couplings, specificity-ordered rules. |
| AI assistant | **Working, offline** | Five tools and a deterministic local explainer. |
| 3D workbench | **Working** | Scene, selection, animation, labels. No drag-and-drop yet. |
| Experiment builder | **Not built** | Parameters can be edited; components cannot be placed. |
| Missions and notebooks | **Not built** | |
| Persistence | **Not built** | In-memory only. |
| Deployment | **Not done** | Builds locally. |

The full, ordered task list is in `.kiro/specs/frankenlab/tasks.md`. This
document is the shape of the road; that file is the work list.

---

## Phase 1 — Correctness and coverage

**Do this before anything else.** The foundation works, but the coverage has
gaps.

- Serialisation: an experiment survives a JSON round trip and produces the
  same result.
- Validation edge cases: required ports left unconnected, port direction
  violations, enum parameters out of range.
- Rule specificity: an explicit coupling beats a generic rule.
- The assistant's ungrounded-number guard, exercised on a reply that invents
  a value.

**Blocks nothing.** It is simply the cheapest way to make the next phase
safe.

## Phase 2 — The workbench becomes an instrument

- **Drag-and-drop wiring.** Drag a component from the catalogue onto the
  bench, connect ports by dragging. This is the single biggest gap between
  the current product and the product the brief describes.
- **Live parameter editing.** Today a parameter change rebuilds the
  simulation, which is correct but blunt. Where the model allows it, a change
  should apply to the running experiment.
- **A real results panel.** Show every measurement the kernel produced, with
  units, not just four tracked series.
- **Observations.** The kernel already carries an `Observation` type and
  nothing produces any. The engines should: "the medium has reached its
  wilting point", "the alert fired", "growth has stalled". The timeline is
  what makes a run tell a story.

**Blocked by:** Phase 1.

## Phase 3 — Content

More experiments, so the product is a sandbox rather than one demo.

- A pure electronics experiment: a divider and a comparator.
- A chemistry experiment: a reaction vessel driven by temperature, showing
  the rate change and the conservation check.
- Material properties in a circuit: put a conductor in the BioCircuit's
  divider so the material decides the operating point.
- A second plant or a nutrient variant.

**Blocked by:** Phase 2, partially. The chemistry experiment needs the
chemistry boundary to grow a second reaction and a catalyst parameter first.

## Phase 4 — The assistant grows a provider

- **Provider-agnostic LLM integration**, keeping the local explainer as the
  fallback. The product must keep working with the provider disabled.
- **`modify_parameter`** and **`compare_experiments`**, once an undo model and
  a run history exist.
- **Surface the ungrounded-number guard in the UI**, so a provider that
  invents a number is visibly flagged rather than only caught in tests.

**Blocked by:** the run history for `compare_experiments`; the undo model for
`modify_parameter`.

## Phase 5 — Shipping

- **Deployment** to a public URL, working with no API key set, reachable
  free of charge.
- **The three-minute demonstration**, built on the five beats in
  `BIOCIRCUIT_BEATS`: planted, growing, drying out, alert triggered,
  recovery.
- **The README** polished for a reader who has never seen the code.
- **Screenshots** of the workbench, the catalogue, the inspector and a
  mid-run chart.

**Blocked by:** Phases 2 and 4.

---

## Things that are deliberately not planned

Recording these keeps scope honest.

- **A general-purpose circuit simulator.** SPICE is a large project and the
  brief explicitly excludes it. DC resistive nodal analysis is enough to
  make the electronics load-bearing.
- **A crop growth model.** The biology is a teaching model and should say so.
- **Real-time collaborative experiments.** The brief does not need it.
- **User accounts.** Local-first storage is enough for the demonstration, and
  an account system is a product in itself.
- **A mobile layout.** The workbench is a desktop instrument. A phone-shaped
  version would be a worse version of the same thing.

---

## Open questions

Things worth deciding before the relevant phase starts.

1. **Where does the deployed demo live?** Vercel is the obvious default.
   The Lucid Mind Labs platform is the alternative, and it has a path
   prefix, which affects how assets are resolved.
2. **Should chemistry get a real experiment, or stay a boundary?** A full
   chemistry experiment is a meaningful chunk of work. If it is not going to
   be in the demonstration, the boundary may be enough — but the brief asks
   for chemistry as a primary discipline, so this needs a decision before
   Phase 3.
3. **Does the experiment builder need to be a visual drag-and-drop tool, or
   is a parameter-driven configuration enough?** Drag-and-drop is a large
   piece of work and the demonstration does not need it. The brief's
   description of the user journey suggests it does.
4. **How much of the mission system is worth building before the
   demonstration?** Missions are a strong framing but they compete with the
   workbench for the same time.
