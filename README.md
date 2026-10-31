# FrankenLab

**The experimental universe.** An interactive scientific sandbox where
electronics, biology, materials and chemistry share one component graph and
one simulation kernel.

Build it. Break it. Discover it.

---

## What this is

Most science simulators teach one subject. FrankenLab's premise is different:
the interesting experiments live in the gaps between subjects.

So FrankenLab has a **shared simulation kernel** that knows nothing about any
science. A discipline is a plugin that supplies component definitions and a
step function. Adding a fifth discipline — chemistry — touched no kernel
code at all.

That is what makes the Frankenstein claim structurally true rather than
aspirational. An electrical netlist and a logistic growth curve genuinely do
share one representation, because the representation is the thing that knows
neither of them.

The flagship experiment, **Project BioCircuit**, is the proof:

```
  plant  ──transpires──▶  medium  ──moisture──▶  resistive probe
                                                        │
                                              divider tap voltage
                                                        ▼
                                    comparator  ──▶  alert LED
```

A plant drinks a medium dry. The medium's moisture drives a resistive probe.
The probe sits above the tap of a voltage divider, so as the medium dries the
probe's resistance rises and the tap voltage falls. When the tap crosses the
comparator's threshold, the LED lights.

The comparator thresholds a **solved circuit quantity**, not the moisture that
drove it. Change the reference resistor and the day the alarm goes off
changes with it. The electronics is load-bearing, not decoration.

| Medium  | Alert fires        |
| ------- | ------------------ |
| Sand    | day 8              |
| Loam    | day 13             |
| Clay    | never              |
| Hydrogel| never              |

## Principles

**The simulation computes. The AI interprets. The user decides.**

The AI assistant is never the source of a number. It reads the same
structured context the UI reads, and it cites the values it uses. With no
provider configured it still works, because a deterministic local explainer
answers from the same context.

**Scientific honesty is a product feature.** Every component carries a
confidence level and states its own assumptions in plain English:

| Level                  | Meaning                                                        |
| ---------------------- | -------------------------------------------------------------- |
| `physical-law`         | Conserved and independently verifiable.                         |
| `established-simplified` | An established model reduced for teaching.                     |
| `illustrative`         | Qualitative. Useful for feel, not for numbers you would publish. |
| `hypothetical`         | Speculative by design.                                          |

**Reproducible means reproducible.** Fixed timestep, seeded randomness, stable
ordering. Same experiment plus same seed gives an identical result, and there
is a property-based test that proves it.

## Running it

```bash
npm install
npm run dev          # http://localhost:4310
```

Then open the laboratory, press **Run**, and watch the plant drink the medium
dry while the readout falls and the alarm lights.

Other commands:

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm test             # vitest run
npm run test:pbt     # property-based tests only
npm run verify       # all three
npm run build        # production build
```

Requires Node 20 or newer. No API key. No database. No network calls.

See [docs/SETUP.md](docs/SETUP.md) for the full setup and troubleshooting.

## Architecture

```
React + Three.js  ──▶  workbench store  ──▶  KERNEL  ──▶  discipline engines
   (UI layer)          (application)       (domain-      (electronics,
                                           agnostic)      biology,
                                                            materials,
                                                            chemistry)
```

The rule that makes it work: **dependencies point downward only.** The kernel
never imports an engine. Engines never import each other. Cross-discipline
behaviour is expressed as named rules in `src/interactions/couplings.ts`,
never as an import.

| Folder                | What lives there                                            |
| --------------------- | ------------------------------------------------------------ |
| `src/kernel/`         | The domain-agnostic core: units, types, registry, validation, lifecycle. |
| `src/engines/`        | One folder per discipline. Plugins.                           |
| `src/interactions/`   | The interdisciplinary coupling rules.                         |
| `src/scenarios/`      | Ready-made experiments.                                       |
| `src/assistant/`      | The AI lab assistant and its tools.                           |
| `src/three/`          | The Three.js laboratory scene.                                |
| `src/components/`     | The React panels.                                             |
| `src/state/`          | The workbench store.                                          |
| `src/world.ts`        | The one place that builds the registry.                       |
| `tests/`              | Unit, integration and property tests.                         |

Full detail in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and
`.kiro/specs/frankenlab/design.md`.

## Adding a discipline

A new discipline is one folder and one line.

```ts
// src/engines/myfield/engine.ts
export const myFieldEngine: DisciplineEngine = {
  id: 'myfield',
  name: 'My field',
  version: '1.0.0',
  components: [myComponentDefinition],
  behaviors: new Map([['myfield.thing', myComponentBehavior]]),
  connectionRules: myRules,
};
```

```ts
// src/world.ts
registry.registerEngine(myFieldEngine);
```

That is the whole integration. The kernel does not change, and the component
appears in the catalogue, the validator and the workbench.

## Tests

```bash
npm test
```

72 tests across six files. The interesting ones are the property-based
invariants in `tests/properties/`:

- The source delivers exactly the power the resistors dissipate.
- A divider output always lies between the rails.
- The medium never gains water when nothing is added to it.
- No normalised reading leaves 0–1.
- The same seed gives the same result, every time.

## Honest limitations

- The chemistry model is deliberately small: one reversible reaction in one
  closed vessel.
- The biology is a teaching model, not a crop simulator.
- The electronics solver is DC resistive nodal analysis. There is no
  capacitance, no inductance and no transient behaviour.
- The assistant uses a deterministic local explainer. A live model provider
  is not wired up.
- Components cannot yet be dragged and rewired in the 3D scene.
- FrankenLab is a learning environment. It does not replace a laboratory.

## Licence

MIT. See [LICENSE](LICENSE).
