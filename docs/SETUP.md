# FrankenLab — Setup and development guide

Everything you need to run, test and extend FrankenLab.

---

## 1. Requirements

| Tool     | Version | Notes                                      |
| -------- | ------- | ------------------------------------------ |
| Node.js  | 20 or newer | The build uses `node:` imports and modern syntax. |
| npm      | 10 or newer | pnpm also works and is the declared package manager. |

Check yours:

```bash
node --version
npm --version
```

## 2. Install

```bash
cd frankenlab
npm install
```

This installs 466 packages. There is no postinstall step, no database, no
container and no API key to set.

### Using pnpm instead

The repository ships an npm lockfile, so npm is the supported path. pnpm works
too, if you prefer it.

```bash
pnpm install
```

Do not mix the two in the same checkout — that produces two `node_modules`
trees and confusing failures. If you switch, delete `node_modules` and the
lockfile you are not using first.

## 3. Run the laboratory

```bash
npm run dev
```

Open <http://localhost:4310>.

You should see the 3D bench with Project BioCircuit on it, the component
catalogue on the left, the inspector on the right, and the readings along the
bottom. The readings start at their true initial values: available moisture
1.000, probe reading 0.909.

Press **Run**. Over about two seconds the plant drinks the medium dry, the
probe reading falls, and the alert LED lights. Press **Reset** to start over.

### Other scripts

```bash
npm run build       # production build
npm run start       # serve the production build on 4310
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest run
npm run test:watch  # vitest in watch mode
npm run test:pbt    # property-based tests only
npm run verify      # typecheck + lint + test
```

## 4. Diagnostics

Two scripts help when a model does not behave as you expect.

```bash
npx tsx scripts/inspect.ts
```

Prints the biology, the materials and the electronics side by side for every
substrate preset, plus the day the alert first fires. This is the harness the
models were tuned with, and it is the fastest way to see what a change did.

```bash
npx tsx scripts/debug-solver.ts
```

Runs the electronics network solver in isolation and prints the solved
voltages, currents and resistances. Use this when a circuit reading looks
wrong.

## 5. Project layout

```
src/
  kernel/          the domain-agnostic simulation core
  engines/         one folder per discipline
  interactions/    the interdisciplinary coupling rules
  scenarios/       ready-made experiments
  assistant/       the AI lab assistant
  state/           the workbench store
  three/           the Three.js laboratory scene
  components/      the React panels
  app/             the Next.js routes
  world.ts         the one place that builds the registry
tests/
  properties/      property-based invariant tests
scripts/           diagnostic harnesses
docs/              architecture, setup, roadmap
.kiro/             Kiro specs and steering
```

The dependency rule: **downward only.** `kernel` imports nothing from
`engines`. `engines` import nothing from each other. Cross-discipline
behaviour is expressed as rules in `src/interactions/couplings.ts`.

## 6. Extending it

### 6.1 A new component in an existing discipline

1. Write the definition in the engine's file:

   ```ts
   export const myDefinition: ComponentDefinition = {
     type: 'electronics.my-thing',
     name: 'My thing',
     discipline: 'electronics',
     category: 'Passive',
     description: 'One sentence a user would understand.',
     confidence: 'established-simplified',
     assumptions: ['What it leaves out.', 'What it does not model.'],
     ports: [/* ... */],
     parameters: [/* ... */],
     initialState: { /* ... */ },
     visual: { shape: 'box', color: '#8899aa' },
   };
   ```

2. Write the behaviour:

   ```ts
   export const myBehavior: ComponentBehavior = {
     type: 'electronics.my-thing',
     step(state, inputs, context) {
       // Return the next state. Deterministic, no Date.now(), no Math.random().
       return { ...state, /* ... */ };
     },
   };
   ```

3. Register both in the engine's `components` and `behaviors` arrays.

4. Write a test. A component without a test is not finished.

### 6.2 A new discipline

Follow the recipe in the README. One folder, one export, one line in
`src/world.ts`. The kernel does not change.

### 6.3 A new cross-discipline link

1. Add a rule to the relevant coupling in `src/interactions/couplings.ts`:

   ```ts
   {
     sourceChannel: 'moisture',
     targetChannel: 'signal',
     transfer: { kind: 'identity' },
     sourceDiscipline: 'materials',
     targetDiscipline: 'electronics',
     description: 'A plain sentence explaining the physical chain.',
     confidence: 'established-simplified',
   }
   ```

2. Add the coupling's `chain` text — the story of why the two belong
   together. The UI and the assistant show it.

3. Write a test that fails if the link stops working.

## 7. Troubleshooting

**`npm run dev` fails with a port error.** Something else is on 4310. Change
the port in `package.json`, or stop the other process.

**The 3D scene is blank.** Check the browser console. WebGL is required. A
headless or software-rendered environment may not have it. The rest of the
application still works without the scene.

**The tests fail after a model change.** Read the failure carefully before
changing anything. Most failures in this codebase have been real modelling
errors rather than broken tests — the chemistry vessel's "conserved total"
and the Arrhenius activation-energy direction were both genuine mistakes that
the tests caught.

**`npm run lint` reports unused imports.** Type-only imports need
`import type`. The rule is `@typescript-eslint/no-explicit-any` as an error:
use `unknown` and narrow it.

**Next.js modified `tsconfig.json`.** It adds `.next/dev/types/**/*.ts` to
`include` and sets `jsx: react-jsx`. Both are expected. Keep them.

## 8. Before you commit

```bash
npm run verify
```

Typecheck, lint and tests must all be clean. Then check the list in
`.kiro/specs/frankenlab/tasks.md` — every task ends with the same definition
of done, and the scientific-integrity steering document adds two more
requirements: a new component needs a confidence level and stated
assumptions, and a new cross-discipline link needs to be a named rule.
