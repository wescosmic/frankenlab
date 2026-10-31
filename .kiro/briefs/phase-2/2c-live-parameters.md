# Brief 2c — Move a slider and the run keeps going

**Agent:** `kernel-guardian` for the kernel part, then `ui-integration` for the
interface · **Phase:** 2 · **Do not commit.**

## Context

FrankenLab, at `C:\Users\Wesley\.mavis\workspace\frankenlab`. Read
`.kiro/steering/product.md`, `.kiro/steering/engineering-standards.md` and
`docs/ARCHITECTURE.md` first.

This brief is the recovery beat of the demonstration.

Today `setParameter` in `src/state/lab.ts` rebuilds the whole simulation, so
moving a slider restarts the run from zero. That is correct but blunt, and it
means the user cannot water a dry plant and watch it come back.

The scenario's own comment says it: *"Turning irrigation up is the recovery beat
in the demonstration."* Right now that is impossible.

## Part one — the kernel can change a parameter mid-run

`src/kernel/simulator.ts` needs a way to update a component's parameter while
the simulation is running, so the **next** step uses the new value.

The parameters already reach behaviours as `__param_<id>` keys in the
component's state, and behaviours read them on every step. So the kernel
change is small: a method that writes the new value into the component's
state, and the next step picks it up.

**Audit every parameter before you change anything.** Some parameters are
genuinely baked into the component's initial state and cannot be live —
changing them mid-run would make the run incoherent. For each parameter,
decide and record:

- **live** — the behaviour reads it from `__param_*` on every step, so a
  change takes effect on the next step;
- **baked** — it is folded into the initial state, so changing it has to
  rebuild the simulation.

Report the split. Do not pretend everything can be live.

The irrigation rate is the one that matters here, and it must be live.

### Rules

- A live parameter change must not break determinism. The same experiment plus
  the same seed plus the same sequence of parameter changes gives the same
  result, every time.
- A live parameter change must not change the past. It changes what happens
  from the next step onwards.
- The kernel must not learn what any particular parameter means.
- No `Date.now()`. No `Math.random()` outside the seeded RNG.

### Tests

- A live parameter change takes effect on the next step, and not before.
- The same parameter changed at the same step with the same seed gives the
  same result.
- A live change does not alter the observations already recorded.

## Part two — the interface stops restarting the run

`src/state/lab.ts` currently rebuilds the simulation on every parameter
change. Change it so that:

- a **live** parameter updates the running simulation and the readings move
  without the run restarting;
- a **baked** parameter still rebuilds the run, and the user is told that it
  restarted rather than being left to wonder why the clock jumped back to
  zero.

`src/components/Inspector.tsx` already renders parameter sliders. It needs to
show which parameters are live and which restart the run. The labels in this
product are small and uppercase, under a plain-English headline.

The flagship's irrigation slider must be live, because it is the recovery
beat.

## Acceptance

- Turn the irrigation rate up while a dry run is in progress: the medium's
  moisture rises, the alert clears, and the run does not restart.
- The run's elapsed time does not go backwards.
- A baked parameter still rebuilds the run, and the interface says so.
- `npm run typecheck`, `npm run lint` and `npm test` are clean.
- Open the app, run the flagship until the alert fires, turn the irrigation
  up, and confirm the LED goes out and the timeline shows the recovery.

## A note about the shell on this machine

The shell tool here is Windows PowerShell, where `&&` is **not** a valid
statement separator. Chain commands with `;`, or run them one at a time.

## When you are done

Report which parameters are live and which are baked, what you changed, and
anything you left unfinished. Do not commit.
