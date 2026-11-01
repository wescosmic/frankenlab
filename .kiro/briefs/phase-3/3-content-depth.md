# Brief 3 — More science, to prove the platform is real

**Agent:** `engine-builder` · **Phase:** 3 · **Do not commit.**

## Context

FrankenLab, at `the repository root`. Read
`.kiro/steering/scientific-integrity.md`, `.kiro/steering/architecture.md`
and `docs/ARCHITECTURE.md` first.

One experiment is a demo. Three is a platform. The judges are scoring whether
the architecture is real, and the fastest proof is a second discipline that
needed no kernel work.

## 3.1 The chemistry boundary becomes a real experiment

The chemistry engine already has `chemistry.substance` and
`chemistry.reaction-vessel`, with a closed reversible reaction, mass-action
kinetics and Arrhenius temperature dependence. It is a boundary, not an
experiment.

Grow it into something a user can change and watch:

- **A second reaction** in the same vessel, so the user can compare a
  reversible reaction with an irreversible one.
- **A catalyst parameter.** It changes the rate and nothing else. It must not
  change the equilibrium position, because a catalyst does not change
  equilibrium. If your model gets that wrong, fix it before moving on.
- **A concentration feed**, so material can be added to the vessel over time
  rather than only being present at the start.

Every new parameter needs units, a range, and a stated assumption. Every new
capability needs a test.

**The conservation check must stay true.** For `A + B ⇌ C`, two moles become
one, so the conserved quantity is `A + C`. Do not break that.

## 3.2 A material decides a circuit's operating point

`src/interactions/couplings.ts` already has a `materials-to-electronics` rule
on the `electrical-potential` channel, and the materials engine already has
conductivity per preset. So the coupling exists; the scenario does not use it.

Put a `materials.conductor` in the BioCircuit's voltage divider, so the
reference resistor's material decides the operating point.

**Done when:** choosing copper instead of graphite changes the day the alert
fires. That is the acceptance criterion, and it is the whole point: a
materials property changing an electronic outcome is the Frankenstein claim
made visible.

## 3.3 A catalogue of experiments

The library panel currently lists components by discipline. It also needs to
list **experiments**, and the user must be able to open one.

- Project BioCircuit, the flagship.
- A pure electronics experiment: a divider and a comparator, with no biology
  in it.
- A chemistry experiment: the reaction vessel driven by temperature, showing
  the rate change and the conservation check.

Each experiment lives in its own file under `src/scenarios/`, with its own
acceptance criteria in the spec. Switching experiments rebuilds the
simulation, the scene and the catalogue, and the readings panel must not show
numbers from the previous experiment.

## Rules that are not negotiable

- An engine never imports another engine. Cross-discipline behaviour is a
  named rule in `src/interactions/couplings.ts`.
- The kernel does not change. If a task seems to need a kernel change, say so
  in your report instead of making it.
- Determinism. No `Date.now()`. No `Math.random()` outside the seeded RNG.
- Every physical value is a `Quantity` with a unit.
- Every new component carries a confidence level and stated assumptions.
- Do not claim accuracy the model does not have. A teaching model says so.

## A note about the shell on this machine

The shell tool here is Windows PowerShell, where `&&` is **not** a valid
statement separator. Chain commands with `;`, or run them one at a time.

## Acceptance

- The chemistry experiment runs end to end, and its conservation check is
  visible and asserted by a test.
- A catalyst changes the rate and leaves the equilibrium position unchanged,
  and a test says so.
- Changing the divider's material changes the day the alert fires, and a test
  says so.
- The catalogue lists all three experiments and each one opens and runs.
- `npm run typecheck`, `npm run lint` and `npm test` are clean.

## When you are done

Report what you changed, the new day the alert fires for each material, and
anything you left unfinished. Do not commit.
