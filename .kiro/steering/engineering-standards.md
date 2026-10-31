---
inclusion: always
---

# FrankenLab — Engineering Standards

## Layout

```
src/
  kernel/         domain-agnostic simulation core. Knows no discipline.
    types.ts        the contracts
    units.ts        the dimensional unit system
    registry.ts     component registration and rule lookup
    validate.ts     experiment validation
    simulator.ts    the lifecycle: step, solve, observe, snapshot
  engines/        one folder per discipline. Plugins.
    electronics/  biology/  materials/  chemistry/
  interactions/   interdisciplinary coupling rules
  scenarios/      ready-made experiments (BioCircuit)
  assistant/      the AI lab assistant
  state/          the workbench store
  three/          the Three.js laboratory scene
  components/     the React panels
  world.ts        the one place that builds the registry
tests/            unit, integration and property tests
  properties/     property-based invariant tests
scripts/          diagnostic harnesses
```

The dependency rule: **downward only.** `kernel` imports nothing from
`engines`. `engines` import nothing from each other. Cross-discipline
behaviour is expressed as rules in `interactions`, never as an import.

## TypeScript

- `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`. Keep it that way.
- `import type` for type-only imports.
- No `any`. `@typescript-eslint/no-explicit-any` is an error.
- Prefer `readonly` on interfaces and arrays that describe data.
- Use discriminated unions where the shape depends on a literal field.

## Style

- British spellings: behaviour, colour, analyse, initialise.
- Plain English. Short sentences. No abstract nouns. No em dashes.
- Comments explain **why**, not **what**. If the code already says it, delete
  the comment.
- Every file starts with a block comment explaining what the file is for and
  the decision it encodes.

## Naming

- Components are `<discipline>.<thing>`: `electronics.resistor`,
  `biology.plant`, `materials.substrate`, `chemistry.reaction-vessel`.
- Behaviour functions are `xxxBehavior`, definitions are `xxxDefinition`.
- The engine's public object is `xxxEngine`.
- A rule's description is a full sentence that a user could read.

## Testing

- Vitest. `npm test` runs everything; `npm run test:pbt` runs only the
  property tests.
- One test file per concern: `kernel`, `electronics`, `interactions`,
  `assistant`, `chemistry`, and `properties/invariants`.
- A test name states the behaviour, not the implementation: "the alert never
  fires on a freshly planted experiment", not "test advance".
- Tests build the world through `tests/world.ts`, which re-exports
  `src/world.ts`. Never construct a different registry in a test.
- When a test fails, understand it before changing it. Most failures in this
  codebase have been real modelling errors.

## Definition of done

A change is done when:

1. `npm run typecheck` is clean.
2. `npm run lint` is clean.
3. `npm test` passes.
4. Any new behaviour has a test that would fail without it.
5. Any new component has a confidence level and stated assumptions.
6. Any new coupling is a named rule in `interactions/couplings.ts`.

## Commands

```bash
npm run dev        # dev server on http://localhost:4310
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm test           # vitest run
npm run test:pbt   # property-based tests only
npm run verify     # typecheck + lint + test
npx tsx scripts/inspect.ts   # BioCircuit behaviour diagnostics
```
