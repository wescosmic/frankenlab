---
name: add-a-discipline
description: Add a new scientific discipline to FrankenLab without touching the simulation kernel.
---

# Add a discipline to FrankenLab

The structural claim of the whole project is that **the kernel knows nothing
about any science**. A discipline is a plugin. If adding a discipline needs a
kernel change, the design has been broken, and the fix is to move the
knowledge out of the kernel rather than to add a special case to it.

## The shape of a discipline

```ts
export const myFieldEngine: DisciplineEngine = {
  id: 'myfield',
  name: 'My field',
  version: '1.0.0',
  components: [myComponentDefinition],
  behaviors: new Map([['myfield.thing', myComponentBehavior]]),
  connectionRules: myRules,
};
```

Register it in `src/world.ts`:

```ts
registry.registerEngine(myFieldEngine);
```

That is the whole integration. The component appears in the catalogue, the
validator and the workbench, and the kernel has not been touched.

## The definition is pure data

`ComponentDefinition` is serialisable. It holds metadata, ports, parameters,
initial state, confidence, assumptions, visual hints and readings. It holds
no behaviour.

`ComponentBehavior` is the behavioural half, registered separately by
component type:

```ts
step(state, inputs, context): State
outputs?(state, context): Record<string, Quantity>
observe?(state, context): readonly Observation[]
```

`outputs` publishes readings without advancing time. `observe` reports the
moments that matter. Neither may advance the clock.

## A port is a connection point

A port has a direction, a channel and a unit. The channel is what decides
whether two disciplines may be wired together, and the rules that permit it
live in `src/interactions/couplings.ts`. A port is not a place to publish a
diagnostic. A resistor's internal voltage is a reported quantity, not
something you can wire to, so it is declared as a reading:

```ts
readings: [
  { id: 'voltage', label: 'Voltage', unit: 'V', description: 'Voltage across the resistor terminals.' },
]
```

## The rules for a new discipline

1. **The kernel does not change.** If it needs to, the knowledge belongs in
   the plugin.
2. **Engines never import each other.** Cross-discipline behaviour is a named
   rule in `src/interactions/couplings.ts`, never an import.
3. **Units are mandatory.** Every published quantity carries one.
4. **The behaviour is deterministic.** Same state, same inputs, same
   context, same output.
5. **The discipline states its assumptions** in plain English, and each one
   is true of the code.
6. **The discipline has a confidence level**, and it is earned. See
   `references/confidence-levels.md`.
7. **Its events are reachable.** Prove the model reaches every threshold it
   declares. See the `verify-a-model` skill.

## Cross-discipline behaviour is a rule, not a special case

If your new discipline needs to influence another one, write a coupling rule:

```ts
{
  id: 'myfield-to-materials',
  sourceChannel: 'myfield',
  targetChannel: 'moisture',
  transfer: { kind: 'identity' },
  description: 'How the new field changes the medium.',
}
```

Rules are matched by specificity, so a specific rule beats a generic one.
That ordering is what lets two disciplines share one graph without knowing
about each other.

## Before you finish

- `npm run typecheck`, `npm run lint` and `npm test` are clean.
- The new discipline has tests of its own, and at least one property test
  for a conservation law it should obey.
- The workbench shows the new component with a name, a confidence level and
  its assumptions, without any change to the workbench code.
