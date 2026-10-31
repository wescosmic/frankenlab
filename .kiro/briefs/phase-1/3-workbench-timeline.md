# Brief 3 — The workbench tells the story

**Agent:** `ui-integration` · **Phase:** 1 · **Do not commit.**

## Context

This is FrankenLab, a scientific sandbox at
`C:\Users\Wesley\.mavis\workspace\frankenlab`. Read these first:

- `.kiro/steering/product.md`
- `.kiro/steering/engineering-standards.md`
- `docs/ARCHITECTURE.md`

Brief 1 gave the kernel an `observe` contract and Brief 2 made the four engines
report the moments that matter. Your job is to show them.

## The run you are showing

The flagship is now **sand** over **21 days**, and it produces exactly three
observations, in this order:

| Day | Observation | Severity |
|---|---|---|
| 8.25 | the alert fires | warning |
| 15.96 | plant growth stalls | warning |
| 16.46 | the medium wilts | error |

A fourth event, the medium recovering, exists in the engine but cannot happen
yet: recovery needs a discrete watering action, and the workbench cannot do
that until a later phase. Do not fake a recovery in the UI.

`BIOCIRCUIT_BEATS` in `src/scenarios/biocircuit.ts` lists the same narrative
with the day each beat lands on. Use it rather than hardcoding days.

## What is already true, so you do not have to rebuild it

Read `src/state/lab.ts` first. Three things are worth knowing:

1. **`readings` already holds every measurement.** `snapshotReadings()` walks
   every component's outputs and keys them `"componentId.portId"`. The four
   headline numbers are only a *selection*: `TRACKED_SERIES` picks which four
   get a big card and a chart line. So the measurements panel is a rendering
   of data you already have, not a new data path.

   Each entry is a `Quantity` and already carries its unit. The human label
   comes from the registry: `registry.getDefinition(componentType)` gives the
   component's name, and the port definition gives the port's label. Look at
   how `Inspector.tsx` already resolves labels and copy that approach.

2. **The assistant is currently given no observations at all.** In
   `LabStore.ask()`, the `latestResult` object hardcodes `observations: []`.
   That is now wrong and wrong on purpose to fix: pass the real observations
   from the live simulation. The assistant already knows how to read them.

3. **`simulation.snapshot()` is called three times per publish.** Once in
   `snapshotReadings()`, once in `snapshotSeries()`, and you would add a third
   for observations. Take one snapshot per publish and read all three things
   off it. This is a small change to `src/state/lab.ts` and it keeps the frame
   loop cheap.

## What to build

### 1. The store publishes the story

`src/state/lab.ts` must publish, alongside the existing `readings` and
`series`:

- `observations` — every observation the kernel has produced, in time order.
- the full measurement set, which is `readings` today.

The store reads these from the simulation. It never computes them.

### 2. A timeline the user can read at a glance

A timeline panel listing the observations in time order. Each entry shows:

- when it happened, in the same day-and-hour format the readouts already use;
- the message, in plain English;
- a severity mark: `info`, `success`, `warning`, `error`, each visually
  distinct.

It updates live while the experiment runs. A run that has produced nothing yet
says so, rather than showing an empty box.

### 3. Every measurement, with its unit

A results panel listing every measurement the kernel produced: the component
it came from, the label, the value and its unit. This is the "show me the
whole instrument" view, as opposed to the four headline numbers.

Group it by component so it reads like a set of instruments rather than a flat
dump. Show the component's name, not its id.

### 4. Where they go

The bottom panel under the 3D scene currently holds the readings and the
chart. Give it three tabs — **Readings**, **Timeline**, **Measurements** —
so the narrative has room without crowding the bench. Keep the existing
readings view exactly as it is; it is the default tab.

Use the existing Tailwind lab tokens in `src/app/globals.css` (`lab-panel`,
`lab-line`, `lab-text`, `lab-muted`, `lab-dim`, `lab-accent`, and any severity
colours already there). Do not introduce a new colour system.

## Rules that are not negotiable

- **The UI never mutates simulation state directly.** It reads state and
  issues intents. If a panel needs a new value, the kernel has to publish it.
  Do not recompute a physical quantity in a React component.
- **No number on screen that did not come out of the kernel.** Every value,
  every unit, every observation message. If you find yourself writing a
  threshold in the UI to decide how to colour something, that belongs in the
  engine.
- Plain English, short sentences, British spellings. No em dashes in copy.
- Small uppercase labels under plain-English headlines. Match the existing
  panels.
- The Three.js scene is animated from real readings. Do not move the frame
  loop into a component, and do not reintroduce the CSS2DRenderer label bug
  (`width: max-content` on labels, canvas and label layer sharing an origin).

## A note about the shell on this machine

The shell tool here is Windows PowerShell, where `&&` is **not** a valid
statement separator. Chain commands with `;`, or run them one at a time.

## Acceptance

- A 21-day run in sand shows a readable narrative: the alert fires on day 8,
  growth stalls on day 16, the medium wilts the same day.
- The timeline lists every observation the kernel produced. No filtering, no
  truncation to the most recent few.
- The measurements panel lists every measurement the kernel produced, grouped
  by component, with units.
- The assistant now receives the real observations, and mentions them when
  asked what happened during the run.
- Switching tabs does not restart or reset the run.
- `npm run typecheck`, `npm run lint` and `npm test` are clean.
- Open the app and confirm there are no console errors and the 3D scene still
  renders with its labels in the right place.

## When you are done

Report what you changed, what you saw in the browser, and anything you left
unfinished. Do not commit.
