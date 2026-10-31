# Brief 1 — Give the kernel an observation contract

**Agent:** `kernel-guardian` · **Phase:** 1 · **Do not commit.**

## Context

This is FrankenLab, a scientific sandbox at
`C:\Users\Wesley\.mavis\workspace\frankenlab`. Read these before you touch
anything:

- `.kiro/steering/architecture.md`
- `.kiro/steering/scientific-integrity.md`
- `docs/ARCHITECTURE.md`

The kernel in `src/kernel/` is domain-agnostic. It knows nothing about any
discipline. A discipline is a plugin that supplies component definitions and
behaviours.

The kernel already defines an `Observation` interface in `src/kernel/types.ts`
and holds an empty `#observations` array in `src/kernel/simulator.ts`. The
array is exposed on the result and on the snapshot. **Nothing ever adds to it,
and no engine can produce one.** That is the gap you are closing.

## What to build

1. **In `src/kernel/types.ts`**, add one optional method to the
   `ComponentBehavior` interface:

   ```ts
   observe?(state: S, context: StepContext): readonly Observation[];
   ```

   Document it plainly: the kernel collects what a behaviour reports and never
   interprets it. A behaviour reports what happened in its own discipline; the
   kernel does not know what any of it means.

2. **In `src/kernel/simulator.ts`**, call `observe` for every component after
   its step, and collect the returned observations.

   - Each observation is stamped with the simulation time and the component id.
   - The order is stable and deterministic. Same experiment, same seed, same
     observations in the same order.
   - A behaviour that does not implement `observe` contributes nothing, and
     that must not be an error.

3. **Do not change anything else** in the kernel. In particular, the kernel
   must not import anything from `src/engines/`, and it must not learn
   anything discipline-specific.

4. **Tests, in `tests/kernel.test.ts`.** At least:
   - a behaviour that returns observations has them collected;
   - observations are ordered by time;
   - a behaviour without `observe` contributes nothing and does not throw;
   - the same seed produces the same observations, every time.

## Rules that are not negotiable

- Dependencies point downward only. The kernel never imports an engine.
- Determinism is a hard requirement. No `Date.now()`. No `Math.random()`
  outside the seeded RNG in the context.
- Every physical value is a `Quantity` with a unit. A bare number is a
  scientific-integrity defect.
- The UI and the assistant must never show a number that did not come out of
  the kernel.

## When you are done

Run `npm run typecheck` and `npm test` and report the real output. If a test
fails, read the failure before changing anything: in this codebase the tests
have twice caught real modelling errors that the implementation got wrong.

Do not commit. Report what you changed, what you ran, and anything you left
unfinished.
