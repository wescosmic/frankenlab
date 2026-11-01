# FrankenLab — Roadmap

What is built, what is next, and what each piece waits for.

**Last updated:** 2026-10-31.

---

## Where the product stands

| Area | State | Notes |
| --- | --- | --- |
| Simulation kernel | **Working** | Units, validation, lifecycle, determinism, network solvers, observations. |
| Electronics | **Working** | Real modified nodal analysis. DC resistive only. |
| Biology | **Working** | Logistic growth, transpiration, nutrients. Teaching scale. |
| Materials | **Working** | Two-reservoir water balance, four presets, conductors. |
| Chemistry | **Boundary only** | One reversible reaction in one closed vessel. |
| Interdisciplinary coupling | **Working** | Five named couplings, specificity-ordered rules. |
| Observations | **Working** | The kernel collects them; the four engines report them. |
| AI assistant | **Working, offline** | Five tools and a deterministic local explainer. |
| 3D workbench | **Working** | Scene, selection, animation, labels. No drag-and-drop yet. |
| Timeline and measurements | **Working** | Three tabs under the bench. |
| Experiment builder | **Not built** | Parameters can be edited; components cannot be placed. |
| Missions and notebooks | **Not built** | |
| Persistence | **Not built** | In-memory only. |
| Deployment | **Not done** | Builds locally. |

The full, ordered task list is in `.kiro/specs/frankenlab/tasks.md`. This
document is the shape of the road; that file is the work list.

### Development environment

The build runs on the **Kiro CLI**, not the IDE. Same harness, same `.kiro/`
configuration, plus headless mode and ACP. The competition asks for an
explanation of how the IDE, CLI, Web and Crew differ, so the differences are
observed rather than assumed.

The repository ships five specialist agents in `.kiro/agents/` and four hooks in
`.kiro/hooks/`, including a destructive-shell guard and a verify-on-stop hook
that makes "the tests still pass" a fact the agent knows. The full procedure is
in [CLI-WORKFLOW.md](CLI-WORKFLOW.md).

`scripts/kiro-run.mjs` runs a Kiro task headlessly and prints what happened:
the agent's own words, the hooks that fired, and the tool calls that were
blocked. That is the scripted one-shot pass, and it is how the phases below
were built.

### The delivery plan

The phases below are ordered for the **hackathon**, not for a tidy product.
The deadline is 4 December 2026, 2:00 PM Pacific, and the judging criteria are
weighted equally: Potential Impact, Technological Implementation, Design,
Innovation, Presentation. Every phase is visible in the three-minute video or
in the ten seconds a judge spends deciding whether the project is real.

| Phase | What it adds | Effort |
| ----- | ------------ | ------ |
| 1 | The run tells a story: observations, a timeline, every measurement | Medium |
| 2 | The user builds experiments: drag-and-drop wiring, live parameters, saved experiments | High |
| 3 | More science: chemistry end to end, materials in the circuit, a second experiment | Medium-high |
| 4 | The assistant earns trust: grounded-number guard in the UI, run comparison | Medium |
| 5 | Ship and present: deployment, video, README, screenshots, public repo | Medium |

The full brief for each phase is in `.kiro/specs/frankenlab/tasks.md`, and the
per-task briefs Kiro actually runs from are in `.kiro/briefs/`.

---

## Phase 1 — The run tells a story

**Done.** The kernel has an `observe` contract, the four engines report the
moments that matter, and the workbench shows them.

- **Observations.** `ComponentBehavior.observe?(state, context)` is the
  sibling of `outputs`. The kernel collects them after the step, stamps each
  one with its component and its time, and the flagship produces three:
  the alert on day 11, growth stalling on day 20, the medium wilting on
  day 21.
- **A timeline.** Every observation, in time order, with a severity mark
  and a plain-English message.
- **A measurements panel.** Every measurement the kernel produced, grouped
  by component, with the label, the value and the unit.
- **The assistant sees the story.** It used to be handed an empty list of
  observations, so it could never mention an event that had happened.

Three things were corrected along the way, and the corrections are the point:

- The flagship ran 14 days, which was not long enough to reach the wilting
  and stress beats. It now runs 24, which is long enough to reach the
  recovery beat as well.
- The default medium is sand. It is the only one that reaches all three
  beats inside the run.
- An earlier claim that the alert never fires in clay turned out to be an
  artefact of the 14-day window rather than a fact about clay. Clay alarms
  on day 17. The test and the specs now say what the simulation does.

## Phase 2 — The user builds experiments

**Next.** The biggest gap between the current product and the product the
brief describes.

- **Drag-and-drop wiring.** Drag a component from the catalogue onto the
  bench, connect ports by dragging.
- **Live parameter editing.** A parameter change currently rebuilds the
  simulation, which is correct but blunt. Where the model allows it, a
  change should apply to the running experiment. This is what makes the
  recovery beat possible: turn the tap on and watch the medium come back.
- **Saved experiments**, so a build is reproducible and shareable.
- **A saturation ceiling on the medium.** A pot cannot hold unlimited
  water. The model has no upper bound today, so a tap turned up far enough
  pushes the water readings off the end of their scale.

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

## Phase 4 — The assistant earns trust

- **Provider-agnostic LLM integration**, keeping the local explainer as the
  fallback. The product must keep working with the provider disabled.
- **Surface the ungrounded-number guard in the UI**, so a provider that
  invents a number is visibly flagged rather than only caught in tests.
- **Compare runs**, once a run history exists.

**Blocked by:** the run history for comparing runs.

## Phase 5 — Shipping

- **Deployment** to a public URL, working with no API key set, reachable
  free of charge.
- **The three-minute demonstration**, built on the beats in
  `BIOCIRCUIT_BEATS`: planted, growing, drying out, alert triggered,
  recovery.
- **The README** polished for a reader who has never seen the code.
- **Screenshots** of the workbench, the catalogue, the inspector and a
  mid-run chart.
- **The public repository**, with the licence visible and `.kiro/` tracked
  at the root.

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
