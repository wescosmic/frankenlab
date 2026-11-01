# How FrankenLab was built with Kiro

FrankenLab is an interdisciplinary simulation sandbox. A plant drinks water out
of a soil, the soil moisture drives a resistive sensor, the sensor drives a
comparator, and the comparator lights an alert. Biology, electronics, materials
and chemistry share one component graph, one clock and one simulator.

The Kiroween 2026 rules ask for a write-up covering eight Kiro surfaces, and
they make insufficient use of Kiro a gate rather than a bonus. This document
covers all eight, says what actually happened on each, and is honest about the
four things that went wrong.

Every claim here is checkable against the repository. The `.kiro/` directory is
the evidence.

> **One thing to read first.** Part-way through the build, the Kiro account's
> monthly request quota was exhausted. Every agent run after that failed with
> `MONTHLY_REQUEST_COUNT`, on every model, including the cheap ones. Two of
> the phases were therefore implemented by hand rather than by an agent. This
> document says exactly which, why, and what the quota cost. It is in
> [section 9](#9-what-went-wrong), and it is the most important thing in the
> write-up, because a write-up that hid it would be worthless.

---

## 1. The four surfaces, and how they differed

Kiro runs one agent harness across four surfaces. The `.kiro/` configuration is
shared between them. What changes is where the work runs and who approves it.

| Surface | Where it ran | What it was used for here | The thing that made it different |
| ------- | ------------ | ------------------------ | --------------------------------- |
| Kiro IDE | The developer's machine | Authoring the spec, reviewing the 3D scene | It is a live, collaborative surface. You watch the agent work in the same window as the code. |
| Kiro CLI | The developer's machine | Almost every implementation task | It has a headless mode. `kiro-cli chat --v3 --no-interactive --output-format stream-json` returns machine-readable events, so a build can be scripted and a run can be resumed. The IDE has no equivalent. |
| Kiro Web | Kiro's cloud sandboxes | Evaluated, not used to build | It clones from GitHub or GitLab, runs in an isolated sandbox and delivers a pull request. It is for delegating, not for a local checkout that is not yet public. |
| Kiro Crew | The developer's machine | Unattended multi-step task runs | It is a layer on top of the CLI. Crew starts `kiro-cli acp` and drives it over the Agent Client Protocol. What it adds is persistence: runs survive a closed laptop, and each step is verified by a command. |

### The CLI was the build surface

We used the CLI for roughly ninety per cent of the implementation. Three
reasons, in order of weight.

The competition asks how the surfaces differed, and you cannot answer that with
a difference you did not observe. The CLI is where the differences are visible.
It has headless mode, ACP, and a structured event stream. The IDE does not.

The CLI is not a reduced IDE. It reads the same `.kiro/` directory: the same
steering files, the same specs, the same hooks, the same custom agents, the
same MCP servers, the same skills and the same powers. Nothing in this
repository needed an IDE-only feature.

A solo developer with a deadline wants one terminal. Every implementation task
in this project was a brief in `.kiro/briefs/` and a headless CLI run against
it. That is a pipeline, and a pipeline is what a deadline needs.

The mechanics are in [`docs/CLI-WORKFLOW.md`](CLI-WORKFLOW.md). The short
version:

```powershell
kiro-cli chat --v3 --no-interactive --output-format stream-json "<prompt>"
```

`scripts/kiro-run.mjs` wraps that. It takes an agent name and a brief file,
runs the agent headlessly in the repository, streams the events, and reports
which hooks fired. It is how every phase of this build was executed.

### The IDE was the spec desk

The IDE was used for what it is good at: reading the spec alongside the code,
and looking at the 3D workbench while the agent changed it. The camera framing
work, where the bench had to fit the frustum at two different window sizes,
was done by looking at the render and adjusting it. That loop needs eyes on a
picture, and the browser was the wrong window for it.

### The Web surface was evaluated

Kiro Web was opened and read in a browser. It is the delegating surface: you
describe an outcome in the browser, Kiro builds a plan, spins up an isolated
cloud sandbox with your repositories cloned in, works through it and hands back
a pull request. It also carries the spec mode and the only implementation of
cloud automations.

Two things made it the wrong surface for this build, and both are honest
reasons rather than excuses. Its sandbox clones from GitHub or GitLab, and
this repository was private and local for the whole build window. And it needs
a Kiro Pro, Pro+, Pro Max or Power plan to sign in to, so an active Web
session on this account needs the account holder to complete the sign-in.

What the Web surface confirmed is that the configuration carries across every
surface. The same steering files, hooks, custom agents and skills that the CLI
loads in this repository are the ones the Web surface loads. We did not have to
maintain a second copy of anything.

### The Crew surface did the unattended work

Kiro Crew was installed from the Windows desktop installer and runs a Gateway
on `localhost:5476`. It is not a separate product from the CLI. Crew starts
`kiro-cli acp`, drives it over the Agent Client Protocol, and by default it
uses the CLI's engine, the CLI's login and the CLI's agent files.

What Crew adds over a terminal session is everything a single terminal session
does not keep: chats that persist, memory, schedules, and sessions that hand
work to other sessions. It also has a task runner that takes a Markdown spec,
decomposes it into steps, runs each step, and verifies each step with a
command.

The property sweep in section 7 is a Crew task. The spec lives in
[`.kiro/crew/property-sweep.md`](../.kiro/crew/property-sweep.md).

Crew was also the surface that exposed a real difference in how a model is
chosen. A Crew chat runs Crew's own agent, `kirocrew`, which ships pinned to
the `auto` model. The CLI was set to `minimax-m2.5`. Those are not the same
model and they do not draw on the same allowance. The first Crew run failed
with `UsageLimitReachedError` before it could read the spec, because the
Crew agent was asking for `auto` and the account's allowance for it was
exhausted. Pinning the Crew agent to `minimax-m2.5` fixed it. That difference
is invisible until you actually run both surfaces.

---

## 2. Custom agents

Five agent profiles live in [`.kiro/agents/`](../.kiro/agents/). Each is a
Markdown file with YAML frontmatter for the configuration and a body for the
system prompt.

| Agent | Job | Why it is a separate agent |
| ----- | --- | --- |
| `kernel-guardian` | Owns `src/kernel/` | The kernel knows nothing about any discipline. This agent may not add discipline-specific logic to it. |
| `engine-builder` | Owns the discipline engines | The agent that changes physics, and the one that re-measures every day a change moves. |
| `ui-integration` | Owns `src/components/` and `src/three/` | Keeps the interface out of the simulation's way. |
| `science-reviewer` | Read-only. Audits the physics against published sources. | Deliberately cannot edit. Its findings go to another agent. |
| `lab-lead` | Plans and reviews across the whole repository | The only agent that sees the whole graph. |

The split between `science-reviewer` and `engine-builder` is the one that
mattered most, and it produced the best result in the build. Section 8
describes it.

All five register as workspace agents. The ACP stream from a real run shows
them:

```
workspace agents registered === engine-builder, kernel-guardian, lab-lead,
science-reviewer, ui-integration, add-a-discipline, verify-a-model
```

The last two come from the Kiro power in section 9.

---

## 3. Agent hooks

Four hooks live in [`.kiro/hooks/`](../.kiro/hooks/). Each is a JSON file that
runs a Node script in [`scripts/`](../scripts/).

| Hook | Trigger | What it does |
| ---- | ------- | ------------ |
| `session-context` | `SessionStart` | Prints the repo state and the next open tasks, so an agent starts informed. |
| `guard-destructive-shell` | `PreToolUse` | Blocks force pushes, hard resets, `git clean` and recursive deletes of the repository. |
| `eslint-on-save` | `PostFileSave` | Runs `eslint --fix` on the TypeScript file the agent just saved. |
| `verify-on-stop` | `Stop` | Runs the whole verification suite when the agent finishes a turn, so "the tests still pass" is a fact and not a claim. |

All four were verified end to end in real Kiro sessions, not just written.

### The exit code bug, and the bug it caught

The hook documentation says that any exit code other than zero blocks the
tool call. That is wrong, and it is the kind of wrong that matters.

The authoritative behaviour is:

- `0` means the hook succeeded. Its stdout is added to the agent's context.
- `2` blocks the call, and only for `PreToolUse`. The stderr goes back to the
  model.
- Any other code means the hook failed. The stderr is shown as a warning, and
  **the tool still runs**.

Our guard hook was exiting `1`. It printed its refusal, and the destructive
command ran anyway. We only found this because the guard was tested against a
real `git reset --hard HEAD` rather than trusted.

Changing the exit code to `2` blocked it, and the agent reported:

```
Blocked by: PreToolUse hook with exit code 2 (block)
```

A guard hook that exits `1` blocks nothing.

### Why the hooks are worth having

`verify-on-stop` is the hook that changed how this project works. Every
headless run ends by running typecheck, lint and the full test suite. When
the agent says the tests pass, there is a machine-checked answer behind the
sentence. The log of that run is in the transcript, not in a promise.

---

## 4. Spec-driven development

The spec lives in [`.kiro/specs/frankenlab/`](../.kiro/specs/frankenlab/) and
has the three usual parts: `requirements.md`, `design.md` and `tasks.md`.

The requirements are written as acceptance criteria that can be checked, not
as aspirations. A few of them, as they stand now:

```
AC-2  A 24-day run at a one-hour timestep completes in 576 steps.
AC-6  Every component publishes a confidence level, and the interface shows it.
AC-8  The alert fires on day 11 in sand, day 13 in loam and day 17 in clay,
      and does not fire at all in hydrogel inside a 24-day run.
```

AC-8 is the one that proves the point. It was written when the default
medium was loam, and it said the alert fired in sand and loam but not in
clay. That was not a fact about clay. It was an artefact of a fourteen-day
window that was too short to reach the beat. The simulation was measured
again, the window was extended, and the acceptance criterion was rewritten to
say what the simulation actually does. Clay alarms on day 17. The test and the
spec now agree with each other and with the code.

That is what spec-driven development buys you. The spec is not a document
that drifts away from the code. It is a set of claims that can be falsified,
and when the code says otherwise, the spec changes.

---

## 5. Steering docs

Four steering files live in [`.kiro/steering/`](../.kiro/steering/). Steering
is how Kiro knows the rules of a project without being told in every prompt.

| File | What it governs |
| ---- | --------------- |
| `architecture.md` | The kernel knows no discipline. Disciplines are plugins. Engines never import each other. Cross-discipline behaviour is a named rule. |
| `engineering-standards.md` | TypeScript strict, no `any`, units are mandatory, no wall-clock time inside a model. |
| `product.md` | "The simulation computes. The AI interprets. The user decides." Plain English in the interface. |
| `scientific-integrity.md` | Confidence levels, no faked precision, no claim without a source. |

All four are matched into context automatically. A session start reports the
match, and the token cost is about 3,800 tokens across the four files.

`scientific-integrity.md` is the steering file that has done the most work.
It is the reason every component carries a confidence level, and the reason
the science audit in section 8 was worth running.

---

## 6. MCP

An MCP server is registered in
[`.kiro/settings/mcp.json`](../.kiro/settings/mcp.json):

```json
{
  "mcpServers": {
    "fetch": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch"]
    }
  }
}
```

The point of it is that the science reviewer needed to read published sources.
The first audit attempt failed completely, and the failure was informative.

The reviewer had no web tool, so it fell back to fetching from the shell with
`curl` and `Invoke-WebRequest`. On this machine that produced a wall of timeouts,
Cloudflare blocks, 404s, `head: command not found` and `&&` parser errors.
The agent burned its whole budget and returned nothing useful.

The fix was two changes:

1. Give the `science-reviewer` agent the `web` tool, plus `web_fetch` and
   `web_search` permissions, plus `@fetch` as an MCP server, plus
   `includeMcpJson: true` so the workspace MCP servers are mounted
   automatically.
2. Rewrite the brief to say, in plain words, that fetching from the shell is
   banned on this machine and that two solid sources per medium beat ten flaky
   ones.

The second audit read two authoritative sources and produced a per-figure
decision table. The tool choice was the difference between no result and the
most important correction in the build.

---

## 7. Property-based testing

The physics claims in this project are defended by property-based tests
written with fast-check, in
[`tests/properties/invariants.test.ts`](../tests/properties/invariants.test.ts).
They are fast-check properties over generated experiments, not examples with
fixed inputs, because the interesting failures are in the corners: a substrate
that holds more water than it should, a plant that drinks faster than the
medium can supply, a comparator that sits exactly on its threshold.

The properties assert things the simulation must never do: that moisture
stays inside its physical bounds, that the clock never runs backwards, that
two runs with the same seed produce the same result.

### The property sweep is a Kiro Crew task

The everyday property tests run a small number of random cases because they
have to be fast. The sweep raises that number and widens the set of
invariants, so a hidden counterexample has a chance to show itself. It is
unattended, multi-step, and every step needs verifying against a command,
which is exactly what the Crew task runner is for.

The spec is [`.kiro/crew/property-sweep.md`](../.kiro/crew/property-sweep.md).
The Crew configuration for it:

```json
{
  "taskrunner": {
    "workspace_dir": "C:\\Users\\Wesley\\.minimax\\workspace\\frankenlab",
    "test_command": ["C:\\Program Files\\nodejs\\node.exe",
                     "node_modules/vitest/vitest.mjs", "run", "tests/properties"]
  },
  "hooks": {
    "auto_approve_tools": ["read", "Reading *", "fs_write", "Writing *", "shell", "Running: *"]
  }
}
```

The `test_command` is what makes a Crew run trustworthy. A step that completes
is not thereby verified. Crew runs the command after every step and records a
verdict of passed, failed, skipped or not configured. A failing step is
retried like any other failure, and the completion summary counts only
`passed` as verified.

There is a hard rule in the spec, and it is the rule that matters for a
scientific project: **a failing property is a finding, not a bug in the
test.** The agent is told not to weaken a property and not to change product
code to make one pass. It is told to report the counterexample, shrunk to its
smallest form.

---

## 8. Kiro powers

A Kiro power is a bundle of skills, references and configuration that an agent
can use. This project has one, authored for this build and installed with:

```powershell
kiro-cli powers install .kiro/powers/frankenlab
```

It lives in [`.kiro/powers/frankenlab/`](../.kiro/powers/frankenlab/) and
contains:

- `plugin.json`, the manifest.
- `skills/verify-a-model/SKILL.md`, an eight-step scientific-integrity
  checklist for reviewing any model before it is shown to a user.
- `skills/add-a-discipline/SKILL.md`, the recipe for adding a fifth discipline
  without touching the kernel.
- `references/confidence-levels.md`, the definition of the four confidence
  levels: `physical-law`, `established-simplified`, `illustrative` and
  `hypothetical`.

The power is wired into the agents through `includePowers: true` and a
`skill://` resource. The ACP stream proves it is live, because the power's
skills appear in the registered agent list alongside the project's own agents.

### The moment Kiro changed the product

This is the part the demo video ends on, so it is worth stating exactly.

The substrate model claims `established-simplified` confidence. That means it
is allowed to be simpler than reality, but not to be wrong. The
`science-reviewer` agent checked the four substrate presets against two
published sources, the Minnesota PCA Stormwater Manual and Cornell University's
soil water content notes.

It found that sand's field capacity was 0.12, below the published range of
0.17 to 0.25, that sand's wilting point was below the published range, and
that clay's wilting point sat above the published range for clay. It also
found that the saturation assumption was already in the code, which it had
assumed was missing.

The reviewer produced a decision table. `engine-builder` applied it, and then
re-measured every day the project quoted, because changing the physics moves
the timeline. It extended the flagship run so that the whole story still fit
inside it.

The visible outcome is in the product. Before the audit the alert fired on day
8 and the medium wilted on day 16. After it, the alert fires on day 11, growth
stalls on day 20 and the medium wilts on day 21, and the recovery and the
alert clearing follow. Those days are on the Timeline tab, in the README, in
the spec and in `BIOCIRCUIT_MEASURED_DAYS`, and they all agree because
`scripts/measure-beats.ts` measures them rather than restating them.

Two separate agents, one read-only and one writing, produced a change to the
physics that is traceable to a named published source. That is the moment.

---

## 9. What went wrong

The rules judge implementation and design. A write-up that only lists
successes reads like marketing, so here are the failures.

**The first science audit returned nothing.** The reviewer had no web tool and
fetched from the shell instead. Timeouts, Cloudflare, 404s, `head` not found,
and `&&` being a parser error in PowerShell 5.1. Fixed by giving the agent
the `web` tool and the `fetch` MCP server, and by banning shell fetching in
the brief. The MCP server exists because of this failure.

**The guard hook did not guard.** It exited `1`, which the documentation
suggests blocks a tool call. It does not. The hook was tested against a real
`git reset --hard HEAD` and the reset happened. The exit code is now `2`.

**The audit's re-measurement was partly wrong.** The agent that applied the
audit re-measured the beat days with a hand-written heuristic instead of
reading the kernel's own observation codes, and it left the recovery days
stale, because the recovery needs the user to turn the irrigation on. Those
days claimed a recovery that happened before the medium had wilted. It took
a purpose-built measurement script to settle it. The script now lives in
`scripts/measure-beats.ts` and is the source of truth for every day the
project quotes.

**The first Crew run failed on a usage limit.** The Crew agent ships pinned
to `auto`, which had no allowance left on this account. The CLI was on
`minimax-m2.5`. Pinning the Crew agent to the same model fixed it. The second
run then failed on an MCP server timeout, because the embedding model was
still being downloaded underneath it.

**The Web surface could not be signed into.** It needs the account holder to
complete a Google sign-in, and it needs a Pro-tier plan. We read the surface
and its documentation in the browser rather than pretending to have run a
session in it.

**The account ran out of requests, and that cost two phases.**

This is the one that matters, so it gets its own account.

The Kiro account was created on 30 October 2026, for this project. Part-way
through the build, every agent run started failing:

```
ServiceQuotaExceededException: "You have reached the limit."
reason: "MONTHLY_REQUEST_COUNT"
```

It is model-independent. `minimax-m2.5` at 0.25x credits, `minimax-m2.1` at
0.15x and `qwen3-coder-next` at 0.05x all fail identically, which is how we
know it is a request count and not a spend limit. It also explains the Crew
failures that had looked like MCP timeouts: the Crew session never started,
so the `kirocrew-core` MCP server had nothing to talk to and timed out after
sixty seconds. `kiro-cli diagnostic` reports no reset date.

So two phases were built by hand instead of by an agent:

- **Phase 2b, the drag-and-drop bench.** The wiring model, the port markers,
  the wire refusal, the removal of parts and wires.
- **Phases 3 and 4, the chemistry work and the trust guard.** The port-id
  fixes, the solved equilibrium, the catalyst, the two new experiments, the
  port contract test, the assistant's confidence footer and the ungrounded
  number guard in the UI.

Everything else was built by Kiro agents, and the `.kiro/` directory is the
evidence for that.

The honest cost is worth stating plainly. The hand-built phases are the two
that most needed a second pair of eyes, and the second pair of eyes was
exactly what a specialist agent gives you. What came out of it is not nothing:
the port contract test found three real bugs that no agent had been asked to
look for, and the chemistry corrections came from measuring rather than from
reading. But it would have been better if a `science-reviewer` had checked the
new equilibrium maths, and it would have been better if a `kernel-guardian`
had checked the floating-island fix against the MNA spec.

The credit request form for the Kiroween bonus was due on 1 December 2026 at
12:00 PM Pacific, and the draft answer is in the repository at
`docs/KIRO-CREDIT-REQUEST.md`. The quota is expected to reset around
30 November, which is before the demonstration deadline, so the plan was to
use the remainder of the month for the Crew property sweep and a final agent
pass over the hand-built phases.

---

## 10. What we would do differently

The specs were written before the first line of code, and they were good. But
the first version of `requirements.md` was written from an intuition about how
the physics would behave, and it was wrong in three places. The acceptance
criteria should have been written against a measured baseline, not a hoped-for
one.

The property sweep should have run in the first week, not the last. The
scientific-integrity steering file was right from the start, but nothing
enforced it until the audit, and the audit found real errors in the physics.
A property-based sweep every night from day one would have caught more of them
and cost less to fix.

And the Crew agent's default model should have been checked before the first
Crew run, not after two failures. It is a two-minute check and it was worth
two failed runs to learn.
