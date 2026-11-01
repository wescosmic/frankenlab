---
name: verify-a-model
description: Check that a science model in FrankenLab is honest, reachable and correctly scaled before it ships.
---

# Verify a FrankenLab model

FrankenLab's claim is that it never fakes a scientific result. This skill is
the checklist that keeps that claim true. Use it whenever a model, a
threshold, a unit or an observation changes.

## Step 1 — the confidence level has to be earned

Every component carries one of four levels. Read
`references/confidence-levels.md` for what each one requires. The test is
simple: could a reviewer check this number against the physics?

- `physical-law` means conservation holds and the result is derivable from
  first principles.
- `established-simplified` means a published model has been reduced and the
  reduction is stated.
- `illustrative` means the number is plausible and useful for feel, and
  nobody should publish it.
- `hypothetical` means it is made up on purpose.

If a model is really `illustrative` but is filed as `physical-law`, that is a
bug in the product, not a detail.

## Step 2 — every stated assumption has to be true

`ComponentDefinition.assumptions` is a list of plain-English sentences. Each
one has to be a thing the code actually does. If the code changed and an
assumption no longer holds, the assumption is now a lie and the confidence
level is suspect.

## Step 3 — the threshold has to be reachable

**An event that can never fire is not an event.** Before shipping an
observation or a threshold, prove the model reaches it.

Do not reason about it. Run it:

```bash
npx vitest run tests/observations.test.ts
```

Or write a probe that runs the flagship at several durations and prints what
the model actually reaches:

```ts
const result = new Simulation(createBioCircuit({ substrate: 'sandy' }), registry).run();
for (const point of result.dataPoints) {
  if ((point.values['comparator.decision']?.value ?? 0) > 0.5) {
    console.log(`alert at day ${point.time / 86400}`);
  }
}
```

If a threshold is not reached, either retarget it at a value the model
genuinely reaches, or retire the event. Do not lower the threshold until it
fires, and do not invent a value to make it fire.

## Step 4 — the units have to survive

`Quantity` always carries a unit. A number without a unit is a bug, not a
shortcut. Check:

- the behaviour publishes the unit the definition declares;
- a value published by one unit is not read as another. Kiloohms and ohms
  are the classic mistake in this codebase, because the sensor's calibration
  is in kiloohms while the network solver reports ohms.

## Step 5 — a reading has to be named

Every quantity a component publishes must resolve to a human name, from the
port list or from the component's `readings`. A raw identifier such as
`totalMoisture` on the screen is a defect.

A measurement must also be published on **every** step, not only at the
start. A reading that appears when the experiment is fresh and vanishes when
the run begins is worse than one that never appears.

## Step 6 — determinism must survive

Fixed timestep, seeded randomness, stable ordering. No `Date.now()`, no
`Math.random()` outside the seeded generator, no iteration over a `Map` or
`Set` whose order depends on insertion.

The test: the same experiment plus the same seed gives byte-identical
results, every time.

## Step 7 — the conservation laws still hold

Run the property tests. They are the cheapest guard in the repository:

```bash
npm run test:pbt
```

Charge is conserved in the circuit, water is conserved in the medium, every
normalised reading stays inside its unit interval, and a divider output
always lies between its rails.

## Step 8 — say what you changed and what you did not verify

Report honestly. Say which steps you ran and which you did not. If a claim
in the code turned out to be wrong, say so and fix the claim, not the test.
