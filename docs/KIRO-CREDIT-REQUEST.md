# Kiro credit request — draft answers

**Deadline: 1 December 2026, 12:00 PM Pacific** (allow 48 business hours for review).
Drafted 31 October 2026, updated 1 November 2026. Paste these into the form and send today.

Request: **4,000 credits**.

> Fill in the form's own field labels where they differ. The text below is written
> so it can be pasted into a free-text answer without editing.

---

## Project name

**FrankenLab — the experimental universe**

## One-line description

A playable scientific sandbox where incompatible scientific models share one
component graph, and an AI companion interprets only the numbers the
simulation actually produced.

## What are you building?

FrankenLab is a browser-based laboratory where a user builds an experiment out
of parts drawn from four different scientific disciplines — electronics,
biology, materials and chemistry — wires them together, and runs them in one
shared deterministic simulation. The point of the project is the *collision*:
a plant's transpiration dries a substrate, the substrate's moisture changes a
resistive probe's resistance, the probe sits on the tap of a voltage divider,
and when the medium runs dry the comparator trips and the alert LED lights.
No discipline knows about any other. They only share a component-and-
connection contract, and the cross-discipline behaviour lives in named
coupling rules.

Three experiments ship with it. **Project BioCircuit** is the flagship above.
**Threshold Alarm** is the same circuit with the biology removed, so the
operating point can be moved on its own. **Catalysis Comparison** runs the
same reaction in two closed vessels, one catalysed and one not: the
catalysed vessel reaches 99 per cent of the equilibrium at minute 12 and the
uncatalysed one at minute 110, and the two finish 0.000043 mol/L apart.

## How will you use the credits?

The build is being driven **through Kiro**, mostly through the CLI in
headless mode, which is the part of Kiro we can script and repeat. Credits
will pay for:

- **Agent work on the simulation kernel and the four discipline engines**,
  with a reviewer agent checking the science against published behaviour.
- **Spec-driven task sequences** for the interactive workbench (timeline,
  measurements panel, experiment builder).
- **Long unattended runs through Kiro Crew** for the test sweep and the
  accessibility and performance passes.
- **MCP server integration** so the build can reach a documentation source
  and a design reference during implementation.

The account's monthly request quota was exhausted part-way through the
build, and two phases had to be implemented directly rather than by an agent.
The credits pay for the remaining agent passes: a final review over the
hand-built work by the `science-reviewer` and `kernel-guardian` agents, the
Crew property sweep at full strength, and the accessibility and performance
passes.

Concretely, the remaining agent work is:

| Agent pass | What it produces |
|---|---|
| `science-reviewer` over the hand-built chemistry and trust guard | A checked mass-action equilibrium and a checked ungrounded-number guard, with the assumptions restated in the open. |
| `kernel-guardian` over the floating-island fix and the MNA solve | A solver reviewed against the nodal-analysis specification, plus a regression test for the three real bugs the port contract found. |
| `ui-integrator` over the workbench and the new Couplings panel | An accessibility pass on the keyboard path, the tab structure and the focus order, plus the contrast check on the confidence badges. |
| Kiro Crew property sweep | An unattended randomised run over the kernel invariants at full strength, looking for the cases the hand-written tests do not reach. |
| `lab-lead` final pass | One last review of the whole repository against the spec before submission. |

## Which Kiro features will you use?

| Feature | How |
|---|---|
| IDE | Spec authoring and steering. This is where the product decisions get made and written down. |
| CLI | The primary build surface. Every implementation task runs as a headless one-shot pass, so the whole build is repeatable and the transcript is the evidence. |
| Web | The deployed app is the test surface. |
| Crew | Unattended sweeps: the full test suite, the lint and typecheck pass, and the accessibility audit. |
| Custom agents | Five specialists in the repo: a lab lead, a kernel guardian, an engine builder, a science reviewer and a UI integrator. |
| Agent hooks | Four hooks that actually fire: session context injection, lint on save, a guard that blocks destructive shell commands before they run, and a verify-on-stop that runs the test suite at the end of every agent turn. |
| Spec-driven development | A written spec with numbered requirements, acceptance criteria and a phase plan, in the repo at `.kiro/specs/`. |
| Steering docs | Four documents that constrain the work: product, architecture, engineering standards and scientific integrity. |
| MCP | A documentation server during implementation. |
| Property-based testing | fast-check against conservation laws: charge conservation in the circuit, water conservation in the medium, every normalised reading inside its unit interval, and identical results for identical seeds. |
| Kiro powers | A power to run the test and lint sweep as a single command, and one to summarise a change against the spec. |

## Why is this worth credits rather than a free tier?

The build is genuinely long-running. The simulation kernel, four discipline
engines, the cross-discipline couplings, the workbench, and the deployment
all land inside a single fortnight, with an agent doing the implementation
work and a reviewer agent auditing the science. The default model is
MiniMax M2.5 at 0.25x, which keeps the credit cost low, but the total token
volume across the whole build still needs the full request.

It also ran into a hard limit, and the numbers are specific. The account is on
the Kiro Free tier, which allows **50 credits a month**. The build spent all
50, and every agent run since has returned:

```
ServiceQuotaExceededException: "You have reached the limit."
reason: "MONTHLY_REQUEST_COUNT"
```

The limit counts requests, not spend, so it is the same on every model:
`minimax-m2.5` at 0.25x, `minimax-m2.1` at 0.15x and `qwen3-coder-next` at
0.05x all fail identically. The cycle resets on **1 December 2026**, which is
three days before the submission deadline and too late to be a plan. So the
last phases were built by hand and the remaining agent work — the final review
of that work, the Crew sweeps and the accessibility pass — needs credits to
happen at all. At the M2.5 multiplier, 4,000 credits is roughly 16,000 agent
invocations, which is more than the remaining build needs by a wide margin and
leaves room for the Crew sweeps to run unattended overnight.

## Timeline

- Credits redeemed by **4 December 2026**.
- App deployed and publicly reachable before submission.
- Hackathon submission: **4 December 2026, 2:00 PM Pacific**.

## Anything else

The app is fully functional with **no API key and no network access**. The AI
companion runs a deterministic local explainer that can only cite numbers
that came out of the kernel, so the demonstration never depends on a
third-party service being reachable. Every answer it gives ends with what it
is worth trusting for: the confidence of the weakest model in the experiment,
named, with a plain-English explanation of that confidence level.
