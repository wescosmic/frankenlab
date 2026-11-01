# FrankenLab — Setup and development guide

Everything you need to run, test and extend FrankenLab.

---

## 1. Requirements

| Tool     | Version    | Notes                                                              |
| -------- | ---------- | ------------------------------------------------------------------ |
| Node.js  | 20.9 or newer | Next.js 16.4.3 requires `>=20.9.0`. The build uses `node:` imports. |
| npm      | 10 or newer | npm is the supported package manager. The repository ships an npm lockfile. |

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

This installs 575 packages. There is no postinstall step, no database, no
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

Press **Run**. Over about a minute the plant drinks the medium dry, the
probe reading falls, and the alert LED lights. Press **Reset** to start over.

Two speeds sit next to Run and Reset. **Slow** is the default and plays the
24-day run in about 64 seconds, so the alert at day 11 and the wilting at day
21 are both long enough to see coming. **Fast** finishes the same run in
about six seconds. The speed changes how fast the run plays, never what it
produces: the same seed gives the same numbers at either speed.

Under the bench, **Timeline** lists every moment the simulation reported, and
**Measurements** lists every quantity it produced, grouped by part and
carrying its unit.

### The recovery beat

The run has a fifth beat, and it needs you.

1. Let the run reach the alert, around day 11.
2. Press **Pause** once the timeline shows the medium dried, around day 21.
3. Select **Moisture source** in the catalogue on the left.
4. Drag **Delivery rate** from 0 up to about 0.05.
5. Press **Run** again.

The run continues from where it stopped. The medium comes back above its
wilting point within a couple of hours of simulated time, the recovery
appears on the timeline, and the alert LED goes out a few hours later.

Moving the delivery rate does not restart the experiment, because the rate is
a live parameter. The substrate's medium and its initial fill are not, since
they decide the physical constants the water balance is measured against;
changing either of those rebuilds the run, and the interface says so.

### Building it for a browser

The whole application runs in the browser. There is no server route, no
database and no API, so it can be published as a static site.

```bash
npm run build              # server build, for `npm start`
npm run start              # serve that build on 4310
```

To produce the static site instead, run the static build:

```bash
npm run build:static
```

That script sets the one environment variable the config needs and then calls
the build, so it behaves the same on Windows, macOS and Linux. If you would
rather set it by hand:

```bash
# Windows PowerShell
$env:NEXT_STATIC_EXPORT='1'; npm run build

# macOS or Linux
NEXT_STATIC_EXPORT=1 npm run build
```

That writes a self-contained site to `out/`, with `out/index.html` at the root.
Any static host will serve it. To look at it locally:

```bash
python -m http.server 4312 --directory out
```

Open <http://localhost:4312>. The export behaves exactly like the server
build, because it is the same application.

The export is opt-in on purpose: an ordinary `npm run build` stays a server
build so that `npm start` keeps working for a local review.

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

## 4. Working with Kiro

The primary development environment for this project is the **Kiro CLI**. It is
not a reduced IDE: it is the same agent harness reading the same `.kiro/`
configuration, plus headless mode and ACP.

### 4.1 Install

Windows (PowerShell, needs Windows 11 and Windows Terminal or PowerShell):

```powershell
irm 'https://cli.kiro.dev/install.ps1' | iex
```

macOS:

```bash
brew install kiro-cli
```

macOS and Linux:

```bash
curl -fsSL https://cli.kiro.dev/install | bash
```

Then sign in and check the install:

```powershell
kiro-cli login
kiro-cli diagnostic
```

`kiro-cli doctor` was removed. `kiro-cli diagnostic` replaced it.

### 4.2 Open the project

```powershell
cd frankenlab
kiro-cli chat --v3 --agent lab-lead
```

**Trust the workspace when prompted.** Until you do, Kiro loads none of the
workspace's steering files, custom agents, MCP servers, skills or workflows,
and it asks before every shell command.

### 4.3 What ships in this repository

| Path                    | Purpose                                                      |
| ----------------------- | ------------------------------------------------------------ |
| `.kiro/specs/frankenlab/` | Requirements, design and tasks                              |
| `.kiro/steering/`       | Product, architecture, engineering standards, scientific integrity |
| `.kiro/agents/`         | Five specialist agent profiles                                |
| `.kiro/hooks/`          | Four hooks, and the scripts behind them                      |
| `docs/CLI-WORKFLOW.md`  | The full operating procedure                                 |

### 4.4 The agents

| Agent              | Owns                                                        |
| ------------------ | ----------------------------------------------------------- |
| `lab-lead`         | Orchestrates and delegates. The default.                     |
| `kernel-guardian`  | `src/kernel/`, `src/interactions/`, `src/world.ts`           |
| `engine-builder`   | `src/engines/**` and engine tests                            |
| `science-reviewer` | Read-only review of scientific honesty                       |
| `ui-integration`   | `src/app/`, `src/components/`, `src/state/`, `src/three/`    |

Switch with `/agent swap <name>`. The lead can run them in parallel; press
`Ctrl+G` to watch them.

### 4.5 The hooks

| Hook                      | Trigger       | Effect                                                    |
| ------------------------- | ------------- | --------------------------------------------------------- |
| `session-context`         | `SessionStart` | Prints branch, last commit, working tree, next open tasks |
| `eslint-on-save`          | `PostFileSave` | Runs `eslint --fix` on the saved TypeScript file           |
| `guard-destructive-shell` | `PreToolUse`  | Blocks force push, hard reset, `git clean`, repo-wide `rm -rf` |
| `verify-on-stop`          | `Stop`        | Runs `npm run verify` and feeds the result back to the agent |

The name in the table is the hook's own `name` field, which is not always the
file name: `eslint-on-save` is the hook inside `lint-on-save.json`. The scripts
are in `scripts/hook-*.mjs`.

A hook communicates through its **exit code**, and the codes are not "zero or
non-zero":

| Code      | Meaning                                                        |
| --------- | -------------------------------------------------------------- |
| `0`       | The hook succeeded. Its stdout is added to the agent's context. |
| `2`       | PreToolUse only: the tool call is blocked. stderr goes to the agent. |
| anything else | The hook failed. stderr is shown as a **warning**, and the tool still runs. |

**To block a tool call, exit 2.** Exiting 1 blocks nothing. That is the trap:
a guard hook that exits 1 prints its refusal and then lets the command
through. The guard in this repository was written with exit 1 first, tested
against a real `git reset --hard HEAD`, and the reset happened. The exit code
is now 2, and the same command is refused before it runs.

### 4.6 Models

```powershell
kiro-cli chat --list-models --format json
```

This account sees these models. The multiplier is the credit cost.

| Model              | Context | Credits | Note                       |
| ------------------ | ------- | ------- | -------------------------- |
| `auto`             | 1M      | 1.00x   | Chosen by task             |
| `claude-sonnet-4.5`| 200K    | 1.30x   |                            |
| `claude-haiku-4.5` | 200K    | 0.40x   |                            |
| `glm-5`            | 200K    | 0.50x   |                            |
| `deepseek-3.2`     | 164K    | 0.25x   | Experimental preview       |
| `minimax-m2.5`     | 196K    | 0.25x   | **The default for this project** |
| `minimax-m2.1`     | 196K    | 0.15x   | Experimental preview       |
| `qwen3-coder-next` | 256K    | 0.05x   | Experimental preview       |

The catalogue is served live and it changes. Check it rather than trusting
this table.

**MiniMax M2.5 is in Kiro's own catalogue** at 0.25x credit cost, and this
project pins it:

```powershell
kiro-cli settings chat.defaultModel minimax-m2.5
```

You cannot supply your own MiniMax API key: Kiro has no custom provider or
base URL setting, and inference always runs on Kiro's endpoints.

### 4.7 The full procedure

[CLI-WORKFLOW.md](CLI-WORKFLOW.md) covers the install, the model table, the
scripted one-shot pass, ACP, Kiro Crew, the credit deadlines and the gotchas.

## 5. Diagnostics

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

Two more scripts print the numbers this project quotes in its documentation:

```bash
npx tsx scripts/measure-beats.ts       # when the alert fires, and when the plant wilts
npx tsx scripts/measure-catalysis.ts   # how far apart the two reaction vessels finish
```

## 6. Project layout

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
scripts/           diagnostic harnesses and the Kiro hook scripts
docs/              architecture, setup, roadmap, CLI workflow
.kiro/             Kiro specs, steering, agents and hooks
```

The dependency rule: **downward only.** `kernel` imports nothing from
`engines`. `engines` import nothing from each other. Cross-discipline
behaviour is expressed as rules in `src/interactions/couplings.ts`.

## 7. Extending it

### 7.1 A new component in an existing discipline

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

### 7.2 A new discipline

Follow the recipe in the README. One folder, one export, one line in
`src/world.ts`. The kernel does not change.

### 7.3 A new cross-discipline link

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

## 8. Troubleshooting

**`npm run dev` fails with a port error.** Something else is on 4310. Change
the port in `package.json`, or stop the other process.

**`npm run build` says another build is already running.** Two builds
overlapped and the first one still holds the lock. Wait for it to finish, or
stop the `.next` directory and build again.

**The 3D scene is blank.** Check the browser console. WebGL is required. A
headless or software-rendered environment may not have it. The rest of the
application still works without the scene.

**The tests fail after a model change.** Read the failure carefully before
changing anything. Most failures in this codebase have been real modelling
errors rather than broken tests — the chemistry vessel's "conserved total"
and the Arrhenius activation-energy direction were both genuine mistakes that
the tests caught.

**The tests pass but the run says "Failed to terminate worker".** That is
teardown noise from the test runner on a busy machine, not a failing test. The
assertions all ran and passed. Free some memory and run it again.

**`npm run lint` reports unused imports.** Type-only imports need
`import type`. The rule is `@typescript-eslint/no-explicit-any` as an error:
use `unknown` and narrow it.

**Next.js modified `tsconfig.json`.** It adds `.next/dev/types/**/*.ts` to
`include` and sets `jsx: react-jsx`. Both are expected. Keep them.

**Kiro loads none of the workspace's configuration.** Trust the workspace
when it asks. Until you do, it sees no steering, no agents, no hooks and no
MCP servers.

**A Kiro guard hook says no but the command runs anyway.** It exited 1, which
is a warning, not a block. It must exit 2. See the exit-code table in
section 4.5.

## 9. Before you commit

```bash
npm run verify
```

Typecheck, lint and tests must all be clean. Then check the list in
`.kiro/specs/frankenlab/tasks.md` — every task ends with the same definition
of done, and the scientific-integrity steering document adds two more
requirements: a new component needs a confidence level and stated
assumptions, and a new cross-discipline link needs to be a named rule.
