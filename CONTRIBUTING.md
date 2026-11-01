# Contributing to FrankenLab

FrankenLab is a scientific sandbox: four incompatible scientific models share
one component graph, one clock and one kernel that has never heard of any of
them. Most of the rules here exist to keep that true.

This file is for people changing the code. For how to run it, read
[docs/SETUP.md](docs/SETUP.md). For how it is built and why, read
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and
`.kiro/specs/frankenlab/design.md`.

## The short version

```bash
npm install
npm run dev          # http://localhost:4310
npm run verify       # typecheck, lint, tests
```

Node 20.9 or newer. No API key, no database, no network calls.

## The rules that are load-bearing

Five of them are enforced by tests, so a change that breaks one fails the
build rather than passing review.

**1. The kernel is domain-agnostic.**
`src/kernel/` may not import anything from `src/engines/`. The kernel knows
about components, ports, units and time. It does not know that biology
exists. Enforced by `tests/architecture.test.ts`.

**2. Engines never import each other.**
Electronics does not know what a plant is. Chemistry does not know what a
resistor is. What they share is the kernel and the port contract. Also
enforced by `tests/architecture.test.ts`.

**3. Cross-discipline behaviour is a named rule.**
Two disciplines may only touch through a rule in `src/interactions/couplings.ts`,
with a confidence level and a plain-English note saying what it leaves out. An
engine that reaches for the rules directly is doing the coupling by hand.

**4. Every output port publishes under its own port id.**
A connection resolves by looking up the source's port id in the values the
source publishes. A value published under any other name is a value no wire
can carry, and it fails silently. Enforced by `tests/ports.test.ts`, which
found three real bugs.

**5. The panel names the same rule the kernel applies.**
The couplings panel must show the rule that is actually in force for each
wire, and must not show anything that is not declared. A panel that invents a
rule is as bad as an assistant that invents a measurement. Enforced by
`tests/couplings.test.ts`.

There is a sixth, newer one: **the palette is a contract.**
A Tailwind utility for a colour that was never defined does not fail, it simply
does not exist, and the element falls back to whatever it inherited. That is
how a destructive button ends up looking like an ordinary one. Every colour the
product asks for has to be declared in `src/app/globals.css`, and every token
used for text has to clear WCAG AA against the panel it sits on. Enforced by
`tests/design-tokens.test.ts`.

## Measuring numbers, not writing them

Almost every number in this repository is a fact about the simulation, not a
fact about the code. The alert fires on day 10.92. The equilibrium extent is
0.609612 mol/L. Those are measurements, and the documentation quotes them from
the measurement script rather than from memory.

If you change an engine, a scenario or a substrate constant, measure again:

```bash
npm run measure             # the alert, wilting and recovery days
npm run measure:catalysis   # the equilibrium numbers
npm run measure:nutrients   # the reservoir's balance
```

If a number in the README, the spec or a test disagrees with that output, the
documentation is wrong. Fix the documentation.

The reservoir's balance is worth measuring rather than describing. The plant's
demand is a rate, the reservoir regenerates at its own rate, and the tank
cannot hold more than its capacity — so the three numbers only balance if the
series is aligned to the step the model actually took. `npm run
measure:nutrients` prints that balance, and `tests/interactions.test.ts`
asserts it.

## Adding a discipline

A new discipline is one folder and one line. See "Adding a discipline" in the
[README](README.md#adding-a-discipline) for the shape of it. The checklist:

1. `src/engines/myfield/engine.ts`, exporting a `DisciplineEngine`.
2. `registry.registerEngine(myFieldEngine)` in `src/world.ts`. That is the whole
   integration. The kernel does not change.
3. Every component publishes its readings under its own port id. Run
   `npm test` and the port contract will tell you if you missed one.
4. A colour for the discipline in `src/app/globals.css`, and the same hex in
   `DISCIPLINE_COLOURS` in `src/world.ts`. The design contract checks that the
   two copies agree, because the promise is that a part's colour always tells
   you what kind of science it is.
5. A confidence level for each behaviour, from `src/confidence.ts`. A component
   with no confidence level is an unfinished component.

## Adding a coupling

1. Declare it in `src/interactions/couplings.ts`, with a channel, a chain, a
   confidence level and a note about what the rule leaves out.
2. Make sure the rule is specific enough to win over the general ones. The
   matcher prefers the most specific rule.
3. Run `npm test`. `tests/couplings.test.ts` will tell you if the panel and the
   kernel disagree about what is in force.

## Working on the interface

- The 3D bench is Three.js, used directly. There is no React Three Fiber.
- State is one Zustand store in `src/state/lab.ts`. It owns the experiment, the
  run and the notice line.
- Only the active tab is in the DOM. Reading a hidden panel's value is a bug.
- Every model carries a confidence level, and the interface shows it. A
  reading without a badge is a reading a judge cannot trust.

## Using Kiro on this repository

The repository carries a full `.kiro/` directory: a spec, four steering docs,
five agents, four hooks, an MCP server and a Kiro Power. It is not decoration.
See [docs/CLI-WORKFLOW.md](docs/CLI-WORKFLOW.md) for the commands and
[docs/KIRO-WRITEUP.md](docs/KIRO-WRITEUP.md) for what each surface was used
for and what went wrong.

Two things worth knowing before you start an agent run:

- **Check your quota first.** The account's limit is a monthly request count,
  not a spend balance, and it fails the same way on every model. The CLI has no
  usage command; `docs/CLI-WORKFLOW.md` shows how to read the figure yourself.
- **A hook that wants to block must exit 2.** Exit 0 succeeds, exit 2 blocks a
  `PreToolUse` call, and any other exit code only prints a warning while the
  tool still runs.

## Commit messages

Say what changed and why. If a number moved, say which measurement moved it and
why. If a claim in the documentation changed, say what the old claim got wrong.
A commit message is the place to be honest about what you did not do.

## Before you open a pull request

```bash
npm run verify
```

That is typecheck, lint and the whole test suite. It is also what the
`verify-on-stop` hook runs when an agent finishes a turn, so the same check
runs whether a person or an agent did the work.

Then check the honest claims:

- If you changed a simulation, re-run `npm run measure` and update every place
  that quotes the old number.
- If you changed a coupling rule, check that the couplings panel still names
  the rule in force.
- If you changed an engine, check the "Honest limitations" section of the
  README still describes the engine you now have.
