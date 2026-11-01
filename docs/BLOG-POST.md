# Building a scientific sandbox where four disciplines share one simulation

*How FrankenLab was built with Kiro, what the agents actually did, and the
moment the bot found a number that was wrong.*

---

Most science simulators teach one subject. You open a circuit simulator, or a
plant growth model, or a soil chemistry tool. Each one is good at its own
thing, and each one stops dead at its own edge.

FrankenLab starts from a different premise. The interesting experiments live in
the gaps between subjects, so the software should not have edges.

## The idea

There is one simulation kernel. It knows nothing about electricity, plants,
soil or chemistry. It knows about components, ports, connections, parameters,
state and time. Nothing else.

A discipline is a plug-in. It supplies component definitions and a step
function, and it never imports another discipline. Cross-discipline behaviour
lives in named coupling rules, not in imports.

That sounds like an architecture diagram. It is not, because of this: a plant
drinks water out of a soil, and the soil's moisture changes the resistance of
a probe that sits on the tap of a voltage divider. When the soil runs dry, the
probe's resistance rises, the divider's tap voltage falls, and a comparator
trips and lights an alert LED.

None of those parts know about each other. The plant does not know it is
changing a resistor. The resistor does not know a plant exists. The comparator
does not know what moisture is. They only share a component-and-connection
contract, and the chain of cause and effect is real, because the electronics
is solved, not scripted.

The electronics is real modified nodal analysis. The comparator thresholds a
solved circuit quantity, not the moisture that drove it. Change the reference
resistor and the day the alarm goes off moves with it. That is the test of
whether a simulator is honest, and FrankenLab passes it.

## The rules, and showing them

A coupling is not allowed to be implicit. When a soil's moisture becomes a
probe's resistance, that is a named rule, declared in one file, that says which
quantity crosses the boundary and how much the crossing is worth.

The **Couplings** tab lists the rules carrying the experiment on the bench
right now. For the flagship it says: three disciplines, four declared
couplings, six wires. It names the part that sends, the part that receives,
the channel in between, the confidence the rule carries, and what the rule
leaves out. It is derived from the live graph, so cutting a wire removes the
rule that wire was carrying.

Open the Threshold Alarm and the same panel says nothing crosses over, because
in that experiment nothing does. A panel that always showed a list would be
decoration. This one measures the bench.

## Three experiments, not one

A sandbox with a single experiment in it is a demonstration, so there are
three.

**Project BioCircuit** is the flagship. Sand, a plant, a probe and an alarm,
over 24 simulated days. The soil decides the pace: the alert fires on day 11
in sand, day 13 in loam, day 17 in clay, and not within 24 days in hydrogel.

**Threshold Alarm** is the same circuit with the biology removed. A 40 kOhm
probe against a 40 kOhm reference puts the tap at 2.5 V, the normalised
reading at 0.5, and the alarm on. Move the reference to 10 kOhm and the
reading falls to 0.2 and the alarm goes out.

**Catalysis Comparison** runs one reaction in two closed vessels, one
catalysed and one not, and it is the sharpest of the three.

## The catalyst, and why the equilibrium is solved rather than guessed

Most teaching models decide a reaction has finished because the rate got
small. That is a feeling, not a criterion, and it moves around when the
timestep moves.

FrankenLab solves for it instead. For A + B ⇌ C starting from a₀ and b₀ with
no product, the mass-action law gives

```
K = x / ((a₀ − x)(b₀ − x))
```

which rearranges into a quadratic in the extent of reaction x. The smaller
root is the physical one, and it is where the reaction is heading.

Now the interesting part. That expression contains no rate constant, no
activation energy and no catalyst. Equilibrium depends on the ratio of the
forward and reverse rates, so a catalyst, which multiplies both by the same
factor, cannot move it. The model says so, and the model is right.

The experiment then measures what the model predicts. The uncatalysed vessel
reaches 99 per cent of the solved equilibrium at minute 110. The catalysed one
gets there at minute 12. After four hours the two vessels hold 0.609569 and
0.609612 mol per litre: forty-three millionths apart.

Same destination. Nine times sooner. And the claim is checkable, because
`scripts/measure-catalysis.ts` measures it rather than restating it.

## Building it with Kiro

The Kiroween rules ask for a write-up covering eight Kiro surfaces, so this
project used all eight, and the full account is in the repository at
`docs/KIRO-WRITEUP.md`.

The **Kiro CLI** was the build surface. Almost every implementation task was a
brief in `.kiro/briefs/` and a headless run against it, wrapped by a script
that streams the events and reports which hooks fired. The CLI is not a
reduced IDE: it reads the same `.kiro/` directory, with the same steering
files, specs, hooks, custom agents, MCP servers, skills and powers. The one
thing it adds is a headless mode that returns machine-readable events, and
that is exactly what a deadline needs.

The **IDE** was the spec desk, and the place where the camera framing was
fixed, because that loop needs eyes on a picture.

**Kiro Web** was evaluated rather than used, for two honest reasons: its
sandbox clones from GitHub or GitLab and this repository was private and local
for the whole build window, and it needs a Pro-tier plan and a Google sign-in
from the account holder.

**Kiro Crew** was installed from its own Windows desktop installer and is a
layer on top of the CLI: it starts `kiro-cli acp` and drives it over the
Agent Client Protocol. What it adds is persistence. A Crew task takes a
Markdown spec, decomposes it into steps, runs each one and verifies each one
with a command.

Five **custom agents** live in `.kiro/agents/`: a lab lead that delegates, a
kernel guardian that protects the discipline-agnostic core, an engine builder,
a science reviewer, and a UI integrator.

Four **hooks** in `.kiro/hooks/` actually fire, and one of them earns its
place by catching a mistake in the others. The guard hook was written to exit
`1` to block a destructive shell command, because the documentation suggests
any non-zero exit code blocks. It does not. The hook was tested against a real
`git reset --hard HEAD` and the reset happened. The exit code is now `2`,
which does block. Exit code `1` only warns.

The **spec** is in `.kiro/specs/frankenlab/`, with numbered requirements,
acceptance criteria and a phase plan. Four **steering documents** constrain
the work: product, architecture, engineering standards and scientific
integrity. An **MCP server** (a fetch server, added after the first science
audit failed on shell timeouts) lets the agents reach a documentation source.
**Property-based tests** with fast-check hold the conservation laws: the source
delivers exactly the power the resistors dissipate, the medium never gains
water when nothing is added to it, every normalised reading stays inside its
unit interval, and the same seed gives the same result every time. And a
**Kiro power** gives the project its own skills, including an eight-step
scientific-integrity checklist for reviewing any model before a user sees it.

## The moment the agent changed the product

The substrate model claims `established-simplified` confidence, which means it
is allowed to be simpler than reality but not to be wrong.

The `science-reviewer` agent checked the four substrate presets against two
published sources: the Minnesota PCA Stormwater Manual and Cornell
University's soil water content notes. It found that sand's field capacity was
0.12, below the published range of 0.17 to 0.25. It found that sand's wilting
point was below the published range, and that clay's wilting point sat above
the published range for clay. It also found that the saturation assumption was
already in the code, which it had assumed was missing.

Then the `engine-builder` agent applied the decision table and re-measured
every day the project quoted, because changing the physics moves the
timeline. It extended the flagship's run so the whole story still fitted
inside it.

The visible outcome is in the product. Before the audit the alert fired on day
8 and the medium wilted on day 16. After it, the alert fires on day 11, growth
stalls on day 20 and the medium wilts on day 21, and the recovery and the
alert clearing follow. Those days are on the Timeline tab, in the README, in
the spec and in the code, and they all agree because a measurement script
measures them rather than restating them.

Two separate agents, one read-only and one writing, produced a change to the
physics that is traceable to a named published source. That is the moment.

## The failure that mattered

Part-way through the build, the Kiro account's monthly request quota ran out.

```
ServiceQuotaExceededException: "You have reached the limit."
reason: "MONTHLY_REQUEST_COUNT"
```

It is model-independent. The cheap models fail identically, which is how you
tell a request count from a spend limit. It also explained a Crew failure that
had looked like an MCP timeout: the session never started, so the MCP server
had nothing to answer.

Two phases were therefore built by hand instead of by an agent: the
drag-and-drop bench, and the chemistry work with the trust guard. Everything
else was built by Kiro agents.

The honest cost is worth saying. Those two phases most needed a second pair of
eyes, and a second pair of eyes is exactly what a specialist agent is. The
hand-built work was not wasted: a new port contract test found three real
bugs that no agent had been asked to look for, including a bug where dropping
an unwired part on the bench collapsed the whole circuit solve to zero. But it
would have been better if a reviewer agent had checked the new equilibrium
maths, and it would have been better if the kernel guardian had checked the
floating-island fix against the specification.

The write-up in the repository says all of this. A write-up that only listed
successes would be marketing.

## The assistant that says what it is worth

The product principle is: the simulation computes, the AI interprets, the user
decides.

So the assistant is never the source of a number. It reads the same structured
context the UI reads. With no provider configured it still works, because a
deterministic local explainer answers from that same context.

And every answer ends with what it is worth:

> **What to trust here:** the weakest model on the bench is **Illustrative**
> (Irrigation). It is illustrative. It shows what the model does, not what
> would really happen.

The confidence of an experiment is the confidence of its weakest model, so the
answer names the part that sets the limit. A model that is not on the bench
cannot weaken your experiment.

The guard runs on every reply, whoever wrote it. A number the simulation did
not produce is removed from the reply, and the removal is stated rather than
hidden. The allowed set is every number the experiment contains, in raw and
rounded form, so a real measurement restated with fewer digits survives and an
invented one does not.

## What is left

The chemistry model is one reversible reaction in one closed vessel. The
biology is a teaching model, not a crop simulator. The electronics solver is
DC resistive nodal analysis, with no capacitance and no transients. Runs are
not persisted, so two runs cannot yet be compared side by side. And a conductor
cannot yet sit inside a circuit, so a material does not get to decide an
operating point, which is the next thing to build.

FrankenLab is a learning environment. It does not replace a laboratory.

## Try it

```bash
npm install
npm run dev
```

No API key. No database. No network calls. Open the laboratory, press **Run**,
and watch a plant drink a soil dry.

The code is at the repository linked below, and `.kiro/` is tracked at the
root, so the whole build is inspectable.
