## Inspiration

Most science simulators teach one subject. You open a circuit simulator, a
plant growth model, or a soil chemistry tool. Each is good at its own thing
and stops dead at its edge. The interesting experiments live in the gaps
between subjects, so FrankenLab's software has no edges.

## What it does

FrankenLab is a playable scientific sandbox. Electronics, biology, materials
and chemistry share one component graph and one simulation kernel. No API key,
no network calls.

The flagship, **Project BioCircuit**, is a plant, a soil, a probe, a comparator
and an LED. A plant drinks the soil dry, the moisture changes the probe's
resistance, the probe sits on the tap of a voltage divider, and when the tap
voltage crosses the comparator's threshold the LED lights.

None of those parts know about each other. The chain is real because the
electronics is **solved**, not scripted: modified nodal analysis. Change the
reference resistor and the day the alarm fires moves with it. That is the test
of an honest simulator.

The assistant is never the source of a number. Every answer ends with what it
is worth: the weakest model in the experiment, named. A number the simulation
did not produce is removed, and the removal stated.

## How we built it

The kernel knows about components, ports, connections, parameters, state and
time, and nothing about electricity, plants, soil or chemistry. A discipline is
a plugin that supplies component definitions and a step function, and never
imports another discipline. Cross-discipline behaviour lives in named coupling
rules, and the **Couplings** tab shows the ones carrying the experiment right
now, derived from the live graph.

The **Kiro CLI** was the build surface: most implementation work was a brief
in `.kiro/briefs/` and a headless run against it. The IDE was the spec desk;
Kiro Crew drove the CLI over the Agent Client Protocol. Five custom agents,
four working hooks, a numbered spec, four steering documents, an MCP server,
property-based tests and custom powers live in `.kiro/`.

There are three experiments, not one: a sandbox with a single experiment is a
demonstration. **Threshold Alarm** is the same circuit with the biology
removed; **Catalysis Comparison** solves equilibrium from the mass-action law,
and a catalyst moves the speed and provably not the destination: after four
hours the two vessels hold 0.609569 and 0.609612 mol/L apart.

## Challenges we ran into

The **guard hook** was written to exit `1` to block a destructive shell
command, because the documentation says any non-zero exit code blocks. It does
not: we tested it against a real `git reset --hard HEAD` and the reset
happened. The exit code is now `2`, which does block. Exit code `1` only warns.

Part-way through, the Kiro account's monthly request quota ran out
(`MONTHLY_REQUEST_COUNT`, model-independent, which is how you tell a request
count from a spend limit). Two phases were built by hand instead: the
drag-and-drop bench, and the chemistry work with the trust guard. Those two
phases most needed a second pair of eyes.

## Accomplishments that we're proud of

**An agent found our soil physics was wrong.** The `science-reviewer` agent
checked the substrate presets against the Minnesota PCA Stormwater Manual and
Cornell's soil water notes. Sand's field capacity was 0.12, below the published
range of 0.17 to 0.25. The `engine-builder` agent applied the decision table
and re-measured every day the project quoted, because changing the physics
moves the timeline. Before the audit the alert fired on day 8 and the medium
wilted on day 16. After it, the alert fires on day 11, growth stalls on day 20
and the medium wilts on day 21. Those days are in the Timeline tab, the spec,
the code and the README, and they agree because a measurement script measures
them.

## What we learned

That a guard is worth nothing until it is tested against the thing it is
supposed to stop. We learned it the expensive way, with a real `git reset`.

That "reproducible" has to mean a measurement script and not a claim in a
README: we now have `measure`, `measure:catalysis` and `measure:nutrients`, and
182 tests across fifteen files asserting the days the project quotes.

That the confidence of an experiment is the confidence of its weakest model,
and saying so beats a number with no caveat. A model off the bench cannot
weaken your experiment.

## What's next for FrankenLab

Runs are not persisted yet, so two runs cannot be compared side by side. That is
next, and it would answer "what if the soil had been sand".

A conductor cannot yet sit inside a circuit, so a material does not decide an
operating point. The electronics solver is DC resistive nodal analysis with no
capacitance and no transients. The chemistry model is one reversible reaction
and the biology is a teaching model.

**[Try it live](https://frankenlab.vercel.app)** or read
**[the code](https://github.com/wescosmic/frankenlab)**.
