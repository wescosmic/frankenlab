# FrankenLab - Devpost submission copy

Use this refreshed package for the partial submission update. The project story
between `## About the project` and `## Built with` is kept under Devpost's 5,000
character limit.

## Category

**Frankenstein**

## Tagline

```text
Four sciences. One bench. Discoverable experiments.
```

## Short pitch

```text
A playable sandbox where biology, materials, electronics and chemistry share one inspectable graph: a plant dries a medium, the medium changes a solved circuit, and an LED reacts. Built with Kiro.
```

## About the project

### Inspiration

Most science simulators teach one subject at a time and stop at their
discipline boundary. FrankenLab explores the experiments between those
boundaries by putting the plant, growing medium, circuit and chemistry in one
inspectable model.

### What it does

FrankenLab is a playable scientific sandbox. Users choose an experiment, drag
components onto a 3D laboratory bench, connect ports, run the simulation, change
parameters, inspect readings, and compare outcomes.

In **Project BioCircuit**, a plant transpires, the medium dries, moisture
changes a resistive probe, and the probe changes a voltage divider. A comparator
turns the solved divider voltage into an LED alert. The electronics uses
modified nodal analysis, so changing the reference resistor changes the real
operating point instead of changing a scripted threshold.

The catalogue has seven ready-to-run experiments: Project BioCircuit, Threshold
Alarm, Catalysis Comparison, Bio-Battery, Microbial Fuel Cell, Enzyme
Optimisation, and Water Purification. It also includes discovery mode, snapshots,
run comparison, timeline and measurement tabs, a Couplings panel, and an
assistant.

The assistant is grounded in simulation output. It removes unsupported numbers
and ends with the confidence limit of the weakest model on the bench.

The interface is a spatial lab: a bright room, neutral grid work surface,
floating panels, local GLB models, and animated signal pulses make causality
visible. CC0 beaker, pipette, cell-membrane and benchtop pH-meter models are
credited in the repository.

### How we built it

The kernel knows components, ports, connections, parameters, state, time and
units, but not plants, electricity or chemistry. Each discipline is a plugin
with deterministic behaviour. Cross-discipline behaviour lives in named
coupling rules, so the app can show exactly what quantity crosses a boundary.

The frontend uses Next.js, React, TypeScript, Tailwind and Three.js. Vitest and
fast-check protect the simulation contracts.

We built the project with Kiro. The Kiro CLI was the main implementation
surface; the IDE was used for specifications and review; Kiro Crew drove CLI
work through the Agent Client Protocol. The repository contains the numbered
spec, steering documents, custom agents, hooks, MCP configuration, powers and
property-based tests in `.kiro/`.

Kiro's science reviewer checked the soil parameters against published references
and caught a field-capacity value that was too low for sand. Correcting it moved
the observable story: the alert fires on day 11, growth stalls on day 20, and
the medium wilts on day 21. Those values come from measurement scripts and
tests, not presentation copy.

### Challenges we ran into

The hardest problem was making disciplines interact without turning the kernel
into special cases. Explicit ports, channels and coupling rules let one
validator power both the UI and simulator.

Visual plausibility also hid a broken model: the comparator once used a raw
sensed value instead of the solved divider voltage. Contract tests and browser
review made the electronics genuinely load-bearing.

One Kiro guard hook initially returned the wrong exit code. Testing it against
the real command exposed the mistake; the hook and workflow were corrected.

### Accomplishments that we're proud of

- Four sciences share one deterministic component graph and simulation kernel.
- Biology and materials drive solved electronics in the flagship experiment.
- The Couplings panel makes the Frankenstein claim inspectable.
- Catalysis changes reaction speed without changing equilibrium.
- Discovery mode turns the sandbox into a reproducible exploration tool.
- The assistant states confidence and cannot invent measurements.
- The catalogue uses recognizable local GLB models instead of generic shapes.
- The public MIT repository contains the Kiro configuration and 191 automated
  tests.

### What we learned

Reproducibility is more persuasive than a claim: important numbers should come
from a script or a test. Trust has to be part of the interaction through
confidence labels, assumptions, named couplings and grounded answers. A 3D
scene should communicate which part changed, which wire carried the signal, and
which reading moved.

### What's next for FrankenLab

The final submission pass is focused on judge clarity: a guided first-run path,
a presentation mode, experiment story cards, visual QA, and a concise
three-minute walkthrough.

After the hackathon, the open-source local simulator remains the free core. A
paid education tier can add saved experiments, classroom workspaces, missions
and lab reports. A professional tier can add private component libraries, team
collaboration, versioned notebooks, audit trails, APIs and larger sweeps.

Cloud CPU/GPU execution is later. The product value is a reproducible job with
known inputs, cost, status, seeds, artifacts and comparable results. Persistence
and workspaces come first.

## Built with

```text
Kiro, Next.js, React, TypeScript, Tailwind CSS, Three.js, WebGL, Zustand, Vitest, fast-check, Vercel, Node.js, MCP, deterministic simulation
```

## Links

- Live app: https://frankenlab.vercel.app
- Source: https://github.com/wescosmic/frankenlab
- Kiro documentation: https://github.com/wescosmic/frankenlab/tree/main/docs

## Suggested demo description

```text
FrankenLab is a playable scientific sandbox where biology, materials, electronics and chemistry share one simulation graph.

In Project BioCircuit, a plant drinks a growing medium dry. The medium changes a resistive probe, the probe changes a voltage divider, and a comparator turns the solved circuit voltage into an LED alert. Change the reference resistor or irrigation and the result changes for a physical reason.

The demo also shows catalysis comparison, discovery mode, named cross-discipline couplings, grounded assistant answers, local GLB component models, and the Kiro science review that corrected the soil physics.

Try it: https://frankenlab.vercel.app
Code: https://github.com/wescosmic/frankenlab

#KiroweenHackathon26
```
