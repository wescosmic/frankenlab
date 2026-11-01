# FrankenLab — Roadmap

What is built, what is next, and what each piece waits for.

**Last updated:** 2026-11-01.

---

## Where the product stands

| Area | State | Notes |
| --- | --- | --- |
| Simulation kernel | **Working** | Units, validation, lifecycle, determinism, network solvers, observations. |
| Electronics | **Working** | Real modified nodal analysis. DC resistive only. |
| Biology | **Working** | Logistic growth, transpiration, nutrients. Teaching scale. |
| Materials | **Working** | Two-reservoir water balance, four presets, conductors. |
| Chemistry | **Working** | One reversible reaction in one closed vessel, a catalyst parameter, a solved equilibrium. |
| Interdisciplinary coupling | **Working** | Five named couplings, specificity-ordered rules, and a panel that shows which ones carry the experiment. |
| Observations | **Working** | The kernel collects them; the four engines report them. |
| AI assistant | **Working, offline** | Five tools, a deterministic local explainer, and a trust guard on every reply. |
| 3D workbench | **Working** | Scene, selection, animation, labels, drag-and-drop wiring. |
| Timeline, measurements and couplings | **Working** | Four tabs under the bench. |
| Experiment catalogue | **Three experiments** | BioCircuit, Threshold Alarm, Catalysis Comparison. |
| Experiment builder | **Working** | Parts are dragged onto the bench and wired by dragging. |
| Run comparison | **Not built** | |
| Missions and notebooks | **Not built** | |
| Persistence | **Not built** | In-memory only. |
| Deployment | **Prepared** | The static export is verified. It has not been published. |

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

| Phase | What it adds | Effort | State |
| ----- | ------------ | ------ | ----- |
| 1 | The run tells a story: observations, a timeline, every measurement | Medium | Done |
| 2 | The user builds experiments: drag-and-drop wiring, live parameters | High | Done |
| 3 | More science: chemistry end to end, a catalyst, three experiments | Medium-high | Done |
| 4 | The assistant earns trust: the guard, the confidence badge | Medium | Done, except run comparison |
| 5 | Ship and present: deployment, video, README, screenshots, public repo | Medium | Partly done |
| 6 | Make the thesis visible: the couplings panel | Medium | Done |

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

**Done.** This was the biggest gap between the product and the brief, and it
is now the part a judge can try in ten seconds.

- **Drag-and-drop wiring.** A part is dragged from the catalogue onto the
  bench. Ports are dots on the part; dragging between two dots draws a wire.
  The wire is validated by the same validator the simulator uses, so a wire
  refused on the bench is refused for exactly the same reason.
- **Live parameter editing.** Where the model allows it, a parameter change
  applies to the running experiment. This is what makes the recovery beat
  possible: turn the irrigation up and watch the medium come back.
- **A saturation ceiling on the medium.** A pot cannot hold unlimited water,
  so the model has an upper bound and the readings stay on their scale.
- **Parts come off the bench.** A selected part can be removed, and so can
  any individual wire.

Two real bugs were found by driving it in a browser rather than by reading the
code: the scene never unsubscribed its pointer listeners, so one drop added
two parts; and the CSS2D labels of removed parts stayed in the DOM, so the
bench showed two of every label.

## Phase 3 — More science

**Done, with one thing deliberately left out.**

- **A pure electronics experiment.** *Threshold Alarm* is the flagship's
  circuit with the biology taken out, so the operating point can be moved on
  its own. A 40 kOhm probe against a 40 kOhm reference puts the tap at
  2.5 V, the normalised reading at 0.5 and the alarm on. Lower the reference
  to 10 kOhm and the reading falls to 0.2 and the alarm goes out.
- **A chemistry experiment.** *Catalysis Comparison* runs the same reaction
  in two vessels, one catalysed and one not. The equilibrium is not guessed
  at from a rate that "looks small": the mass-action law gives a quadratic in
  the extent of reaction, and the smaller root is where the reaction is
  heading. Measured by `scripts/measure-catalysis.ts`, the uncatalysed vessel
  reaches 99 per cent of it at minute 110, the catalysed vessel at minute 12,
  and the two finish 0.000043 mol/L apart.
- **The chemistry engine was corrected.** It published `stoichiometricBalance`
  while the port was called `stoichiometric_balance`, so the conservation
  reading could never travel down a wire. It published the per-step
  increment as the extent of reaction, which broke the equilibrium check.
  All three are fixed, and `tests/ports.test.ts` now holds the line.
- **Each experiment carries its own tracked series**, so the chart follows
  what that experiment is about rather than what the flagship was about.

**Left out on purpose:** a conductor inside the BioCircuit's divider, so that
the material decides the operating point. The materials-to-electronics
coupling is already visible in the flagship, where the medium's moisture
decides the day the alarm goes off: sand on day 11, loam on day 13, clay on
day 17, hydrogel not within 24 days. Putting a conductor in the divider
would need the materials engine to contribute elements to the electronics
solve, which is a larger change than the remaining time allows.

## Phase 4 — The assistant earns trust

**Done, except run comparison.**

- **Every answer ends with what to trust.** The confidence of an experiment
  is the confidence of its weakest model, so the answer names the part that
  sets the limit and says what that level means in plain English. The panel
  shows it as a badge.
- **The ungrounded-number guard is in the UI, not just in the tests.** The
  guard runs on every reply, whoever wrote it. A number the simulation did
  not produce is removed from the reply and the removal is stated. The
  allowed set is every number the experiment contains, in raw and rounded
  form, so a real measurement restated with fewer digits survives and an
  invented one does not.
- **The local explainer is still the default**, and it still works with no
  provider, no API key and no network.

**Left out:** provider-agnostic LLM integration. The product must keep
working with the provider disabled, and it does, so the integration is
additive rather than urgent. It is the natural next change.

## Phase 5 — Shipping

**Partly done.** The repository is built, the video is cut and the writing is
drafted. What is left needs the account holder, not the developer.

- **The demonstration.** Cut and verified: 2 minutes 18 seconds, 1920 by 1080,
  with the narration in sync. Committed at `docs/demo/frankenlab-demo.mp4`. It
  still has to be uploaded to YouTube and made public. The best beat in it is
  the catalysis comparison: two vessels, one catalyst, and a number that
  proves the catalyst changed the speed and not the destination. The last
  fifteen seconds are the Kiro moment — the science audit moving the timeline
  from day 8 and day 16 to day 11 and day 21.
- **The public repository**, with the licence visible and `.kiro/` tracked at
  the root. The MIT licence and the README are in place; the repository itself
  has not been created.
- **Deployment** to a public URL, working with no API key set, reachable free
  of charge. The static export is prepared and verified. It has not been
  published.
- **Screenshots** of the workbench, the measurements, the catalysis
  comparison, the assistant, the couplings panel and the Kiro audit. The first
  five are frames taken from the demo itself, so the README cannot drift from
  the product.
- **The blog post** and the social post. Both are drafted and waiting on the
  two links they need.

## Phase 6 — Make the thesis visible

**Done.**

The Frankenstein claim was true in the architecture and invisible in the
interface. The coupling rules existed in `src/interactions/couplings.ts`, the
assistant could explain them, and no panel showed them. A judge who ran the
app would have seen mixed parts on a bench and had to take the thesis on
trust.

- **A couplings panel.** The fourth tab under the bench lists the named rules
  carrying the experiment right now: which part sends what to which part, on
  which channel, with the rule's own confidence level and what it leaves out.
- **It is derived from the live graph.** Cut a wire and the rule that wire was
  carrying goes with it. The panel cannot drift from the simulation, and
  `tests/couplings.test.ts` checks that it names the same rule the kernel
  applies.
- **It says when nothing crosses over.** The Threshold Alarm is the flagship's
  circuit with the biology taken out, so it has no couplings, and the panel
  says so instead of showing a decorative list.
- **The confidence vocabulary now lives in one place.** Four panels show a
  confidence badge and they shared three copies of the label map, which could
  and would have drifted apart. They share one now, in `src/confidence.ts`.

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
2. **Should chemistry get a second reaction, or stay one reaction?** The
   catalyst comparison needs one reaction to be interesting. A second
   reaction would need a second equilibrium constant and a way to choose
   between them, and it is not in the demonstration.
3. **How much of the mission system is worth building before the
   demonstration?** Missions are a strong framing but they compete with the
   workbench for the same time.

---

## A note on how the phases were built

Most of this was built with Kiro agents: the observations contract, the
timeline and measurements panels, the watchable run speed, the live
parameters, the science audit that corrected the substrate physics, the
Kiro Power, the agent profiles and the hooks.

Two phases were not. The Kiro account's monthly request quota was exhausted
part-way through the build, and every agent run since then fails with
`MONTHLY_REQUEST_COUNT`. Phase 2b and Phases 3 and 4 were implemented directly
instead, by hand, with the same tests and the same review. The full account
is in [KIRO-WRITEUP.md](KIRO-WRITEUP.md), because a write-up that hid this
would be worthless.
