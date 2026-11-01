# Brief 4 — The bench reads at a glance, and the run is watchable

**Agent:** `ui-integration` · **Phase:** 1 · **Do not commit.**

## Context

This is FrankenLab, a scientific sandbox at
`the repository root`.

Brief 3 added the timeline and the measurements panel. This brief is about the
two things a judge will judge in the first ten seconds of watching: the run
has to be watchable, and the bench has to be legible.

Read `.kiro/steering/product.md` and `.kiro/steering/engineering-standards.md`
first.

## Problem 1 — the run flashes past

`src/components/Workbench.tsx` advances the simulation 18 steps every 90
milliseconds. The flagship is 504 steps. The whole 21-day experiment finishes
in about **two and a half seconds**, and it is over before anyone has read the
header.

That is fine for a test and useless for a demonstration. The interesting part
of this experiment is the *spacing* of its beats:

| Day | What happens |
|---|---|
| 8 | the alert fires |
| 16 | growth stalls and the medium wilts |

At two and a half seconds, a viewer cannot tell that anything happened.

### What to build

A **speed control** in the header, next to Run and Reset. At least two
speeds, and they must be labelled in plain language a non-scientist
understands. Something like "Slow" and "Fast" is better than "1x" and "16x",
because "16x" says nothing about what the viewer is about to see.

- **Slow**, the default. The full 21-day run should take roughly 45 to 60
  seconds. That puts the alert about 18 seconds in and the wilting about 40
  seconds in, which is long enough to read the timeline as it fills.
- **Fast**. The full run finishes in about 5 seconds, for someone who wants
  to get to the end state.

### How to implement it

- Express the speed in **simulated hours per second of wall clock**, not in
  steps per frame. A speed of 8 simulated hours per second means the 21-day
  run takes 63 seconds.
- The frame loop must then compute how many steps to advance from the wall
  clock time since the last frame. Do not keep a fixed "steps per publish".
  A fixed step count makes the run speed depend on the frame rate, which
  makes it different on a fast laptop and a slow one.
- **The result must not change with the speed.** The kernel is a fixed
  timestep stepper, so the same seed produces the same run at any speed. That
  is a property worth protecting: add a test that the final measurements are
  identical at slow and fast speeds.
- Keep the readings republishing at a sensible cadence so React is not
  flooded. A republish every 90 milliseconds is fine.

## Problem 2 — the bench does not read

Two things are wrong with the 3D scene at the default camera position.

**The scene is small and far away.** The camera sits at a fixed
`(8.5, 6, 12.5)` looking at the origin, so the bench occupies a small patch
in the middle of a large empty frame. Most of the screen is black.

**The labels collide.** "Plant" sits behind "Reference resistor", and
"Substrate" overlaps "Moisture probe". Two labels on top of each other means
neither can be read, and in a demonstration video that reads as a bug.

### What to build

1. **Frame the experiment, not the origin.** Compute the bounding box of the
   component positions in the scene and move the camera so the bench fills a
   sensible part of the viewport. The bounding box changes when the
   experiment changes, and Phase 2 will let the user build their own, so this
   has to be computed at build time, not hardcoded.

   Keep the current viewing angle and the orbit controls. The user can still
   drag to orbit and scroll to zoom. This is about the starting framing, not
   about taking control away.

2. **No two labels overlap** at the default camera position, at 1280 by 800
   and at 1920 by 1080. Check both sizes.

   Two ways to get there, and you may find a third:

   - Lay the scenario out so the parts are further apart. The component
     positions live in `src/scenarios/biocircuit.ts`. The electronics chain
     currently stacks three parts at the same `x`, which is why they pile up.
   - Place each label so it does not fight its neighbours. `CSS2DRenderer`
     resets `display` every frame, so a label's width has to be pinned with
     `width: max-content` and the canvas and the label layer must share an
     origin. Both are already handled in `src/three/lab-scene.ts`; keep them
     working.

   Do not solve this by hiding labels. Every part keeps its name.

## Problem 3 — half the measurements have no name

The Measurements tab shows a mix of proper names and raw identifiers:

```
Available moisture   0.000 ratio      totalMoisture      0.040 ratio
Transpiration        0.008 ratio      freeWater         0.003 ratio
```

The named ones are ports, which the component definition declares. The
identifiers are the other quantities the component reports: a resistor's
voltage, current and resistance, a substrate's field capacity and wilting
point, the LED's brightness.

### What to build

Every measurement gets a proper name, the way the ports already have one.

**Do not declare the diagnostics as ports.** A port is a connection point with
a channel, and you cannot wire a resistor's internal voltage to anything.
`docs/ARCHITECTURE.md` is explicit that the network solver *reports* the
solved voltage, current and resistance per element. Reporting is not
connecting.

**Do not humanise the identifier in the component.** Splitting
`totalMoisture` into words at the point of display works, but it puts a
naming rule in the UI and it will drift.

Instead, let the component definition declare the readings it publishes,
alongside the ports it already declares:

```ts
interface ReadingDefinition {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  readonly description: string;
}

interface ComponentDefinition {
  // ...everything it has today...
  readonly readings?: readonly ReadingDefinition[];
}
```

Then each component that reports something outside its ports declares those
readings. The six that do today:

| Component | Reads to declare |
|---|---|
| `materials.substrate` | totalMoisture, freeWater, boundWater, fieldCapacity, wiltingPoint, thermalConductivity, conductivity |
| `electronics.sensor` | resistance, current, voltage |
| `electronics.voltage-source` | voltage, current |
| `electronics.resistor` | voltage, current, resistance |
| `electronics.comparator` | decision |
| `electronics.led` | brightness, conducting, voltage, current |

Use the unit the behaviour already publishes for that quantity. Write the
description as one plain-English sentence that says what the number means, in
the same voice as the existing port descriptions.

The Measurements tab then resolves a name in this order:

1. the port label, if the measurement is a port;
2. the reading label from the definition, if it is a declared reading;
3. the identifier, only if it is somehow neither.

Add a test that every measurement the flagship produces resolves to a
declared name rather than falling through to the third case. That test is
what stops the identifiers coming back.

## Rules

- Plain English, short sentences, British spellings. No em dashes in copy.
- Small uppercase labels under plain-English headlines. Match the existing
  panels.
- Use the existing Tailwind lab tokens in `src/app/globals.css`. Do not
  introduce a new colour system.
- The UI never mutates simulation state directly. It reads state and issues
  intents.
- No number on screen that did not come out of the kernel.

## A note about the shell on this machine

The shell tool here is Windows PowerShell, where `&&` is **not** a valid
statement separator. Chain commands with `;`, or run them one at a time.

## Acceptance

- The default speed runs the flagship in 45 to 60 seconds, and the fast speed
  finishes it in about 5 seconds.
- Changing the speed mid-run does not change the final result.
- A test proves the final measurements are identical at two different speeds.
- The bench fills the frame at the default camera position.
- No two labels overlap at 1280 by 800 or at 1920 by 1080.
- Every measurement in the Measurements tab has a proper name. No raw
  identifiers like `totalMoisture` are visible.
- A test proves every measurement the flagship produces resolves to a
  declared name.
- Dragging to orbit and scrolling to zoom still work.
- `npm run typecheck`, `npm run lint` and `npm test` are clean.
- Open the app and confirm there are no console errors.

## When you are done

Report what you changed, what you saw in the browser, and anything you left
unfinished. Do not commit.
