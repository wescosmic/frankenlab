# Brief 2a — The user authors an experiment

**Agent:** `ui-integration` · **Phase:** 2 · **Do not commit.**

## Context

FrankenLab, at `C:\Users\Wesley\.mavis\workspace\frankenlab`. Read
`.kiro/steering/product.md`, `.kiro/steering/engineering-standards.md` and
`docs/ARCHITECTURE.md` first.

Right now the product ships one experiment and the user can only watch it.
Phase 2 makes the user an author. This brief is the **state layer** of that:
the store must be able to hold an experiment the user is building. Brief 2b
adds the 3D interaction that drives it.

## What already exists, so you do not rebuild it

- `src/kernel/validate.ts` exports `validateExperiment(experiment, registry)`,
  which returns a `ValidationResult`, and `explainValidation(result)`, which
  turns it into plain English. **Use these.** Do not write a second validator.
- `src/kernel/types.ts` has the `ExperimentDefinition` shape: components carry
  `id`, `type`, `parameters` and `position`; connections carry `id`,
  `source`, `target`, `channel` and `transfer`.
- `src/state/lab.ts` already has a `rebuild(next)` helper that rebuilds the
  simulation from an edited experiment and republishes.
- `src/three/lab-scene.ts` already has `setExperiment(experiment, registry)`,
  which tears the scene down and rebuilds it from the experiment. It is already
  data-driven. It does not need to know about any particular experiment.

## What to build

### 1. The store owns a mutable experiment

`src/state/lab.ts` must be able to:

- **add a component** — given a component `type` from the registry and a bench
  position, create an instance with a fresh unique id, sensible default
  parameters taken from the definition, and add it to the experiment;
- **remove a component** — and every connection that touched it;
- **connect two ports** — given a source port and a target port, add a
  connection;
- **disconnect** — remove a connection by id.

Every one of these rebuilds the simulation and republishes, through the
existing `rebuild` path. The running experiment must never be left in a state
the kernel would reject.

### 2. Validation is part of the state, not a side effect

The store publishes the current `ValidationResult`. When an edit produces an
invalid experiment, the user sees **why**, in plain English, from
`explainValidation`. Not a generic "invalid configuration".

The product must never show a number that did not come from a valid run. If
the experiment is invalid, the readings panel says so rather than showing
stale numbers as if they were current.

### 3. Reading a connection's channel and transfer

A connection needs a `channel` and a `transfer`. Do not invent a default that
contradicts the physics. Look at how `src/scenarios/biocircuit.ts` builds its
connections and how `src/interactions/couplings.ts` names its channels, and
derive the channel from the source and target ports. If a connection cannot be
given a sensible channel, reject it with a readable message.

## Rules that are not negotiable

- **The UI never mutates simulation state directly.** It issues intents to the
  store. The store owns the experiment and the simulation lifecycle.
- A component id must be unique. Never reuse an id.
- Determinism: the same experiment plus the same seed gives the same result.
  Adding a component changes the experiment, and that is fine, but the run
  must still be reproducible.
- Plain English, short sentences, British spellings. No em dashes in copy.

## Acceptance

- Tests in `tests/` that build an experiment through the store's public API:
  add a component, connect two ports, and assert the validator accepts it.
- A test that connects two ports that cannot be connected, and asserts the
  validation result explains why in plain English.
- A test that removing a component removes its connections.
- `npm run typecheck`, `npm run lint` and `npm test` are clean.

## A note about the shell on this machine

The shell tool here is Windows PowerShell, where `&&` is **not** a valid
statement separator. Chain commands with `;`, or run them one at a time.

## When you are done

Report what you changed, the public API you added to the store, and anything
you left unfinished. Do not commit.
