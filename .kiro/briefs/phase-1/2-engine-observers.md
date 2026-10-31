# Brief 2 — The engines report what happened

**Agent:** `engine-builder` · **Phase:** 1 · **Do not commit.**

## Context

This is FrankenLab, a scientific sandbox at
`C:\Users\Wesley\.mavis\workspace\frankenlab`. Read these before you touch
anything:

- `.kiro/steering/scientific-integrity.md`
- `.kiro/steering/architecture.md`
- `docs/ARCHITECTURE.md`

Brief 1 added an optional `observe(state, context)` method to
`ComponentBehavior` in `src/kernel/types.ts`, and the kernel now collects what
a behaviour reports. Read that interface before you write anything.

Your job is to make the four discipline engines report the moments that
matter, in plain English, with the time they happened.

## What to build

Each engine gets an `observe` implementation on the behaviours that can
meaningfully report something. At minimum:

**Materials** — `src/engines/materials/engine.ts`

- The medium reached its wilting point. Severity `warning`.
- The medium recovered above the wilting point. Severity `success`.

**Biology** — `src/engines/biology/engine.ts`

- Growth stalled. Severity `warning`.
- The plant reached maturity. Severity `success`.

**Electronics** — `src/engines/electronics/engine.ts`

- The alert fired. Severity `error`.
- The alert cleared. Severity `info`.

**Chemistry** — `src/engines/chemistry/engine.ts`

- The reaction approached equilibrium. Severity `info`.

## The hard part: fire once, at the transition

An observation is a *moment*, not a state. "The medium is below its wilting
point" is true on every tick from day 6 onwards. That is not a moment, and it
would flood the timeline.

- Detect the **transition**, not the condition.
- Track whether it has already fired in the component's own state, so it
  fires once per crossing, and fires again if the state genuinely reverses and
  crosses back.
- The observation's message is a complete plain-English sentence a
  non-specialist can read. "The medium dried past the point where the plant
  can draw water." is good. "wilting" is not.
- The severity reflects what it means for the experiment, and it must be
  consistent across every engine.

## Rules that are not negotiable

- An engine never imports another engine. The coupling is a named rule in
  `src/interactions/couplings.ts`.
- Determinism is a hard requirement. No `Date.now()`. No `Math.random()`
  outside the seeded RNG in the context.
- An observation carries a time, an optional component id, a severity and a
  message. It never carries a raw physical number that did not come from the
  kernel. If you want to mention a value, read it from the state that the
  kernel produced.
- Do not change the physics. You are reporting on the physics, not altering it.
  If you think a threshold is wrong, say so in your report rather than
  changing it.

## Tests

In the existing engine test files:

- The alert observation fires on the day the alert fires, for the sand
  substrate.
- The wilting observation fires once and not again on every subsequent tick.
- The medium recovering fires the recovery observation.
- Observations are ordered by time within a run.

## A note about the shell on this machine

The shell tool here is Windows PowerShell, where `&&` is **not** a valid
statement separator. `cd "somewhere" && npm test` fails with a parser error.
Chain commands with `;`, or run them one at a time.

## When you are done

Run `npm run typecheck` and `npm test` and report the real output. Read a
failure before changing anything.

Do not commit. Report what you changed, the exact days and messages each
observation fires with, and anything you left unfinished.
