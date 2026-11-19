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
assistant. Start an empty bench to build your own experiment, connect a battery
to an LED, and reposition parts with bounded XYZ controls. Dark/light mode,
collapsible panels and a presentation mode support exploration and demos.

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

Kiro CLI was the main implementation surface, with specs, steering, specialist
agents and verification hooks committed in `.kiro/`. Kiro IDE supported spec
work and review. Web was evaluated; Crew runs were attempted but did not
complete. Codex assisted with later UI, media, integration and regression fixes.
The repository documents these contributions and limitations explicitly.

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

### Accomplishments that we're proud of

- Four sciences share one deterministic component graph and simulation kernel.
- Biology and materials drive solved electronics in the flagship experiment.
- The Couplings panel makes the Frankenstein claim inspectable.
- Catalysis changes reaction speed without changing equilibrium.
- Discovery mode turns the sandbox into a reproducible exploration tool.
- The local assistant cites simulation data and filters unsupported numbers.
- The catalogue uses recognizable local GLB models instead of generic shapes.
- The public MIT repository contains the Kiro configuration and 225 automated
  tests.

### What's next for FrankenLab

The submission includes a guided first-run path, presentation mode, experiment
story cards and a 2:02 walkthrough. The audit covers all 34 component types and
515 compatible directed port pairs. Expanded catalogue models are illustrative
teaching models, not calibrated scientific predictions; limitations are visible
in the app and documented in the repository.

After the hackathon, the open-source local simulator remains the free core. A
paid education tier can add saved experiments, classroom workspaces, missions
and lab reports. A professional tier can add private component libraries, team
collaboration, versioned notebooks, audit trails, APIs and larger sweeps.

Persistence and workspaces come before cloud CPU/GPU execution.
