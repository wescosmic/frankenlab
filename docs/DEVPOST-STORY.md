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

### Challenges we ran into

The hardest problem was making disciplines interact without turning the kernel
into special cases. Explicit ports, channels and coupling rules let one
validator power both the UI and simulator.

Visual plausibility also hid a broken model: the comparator once used a raw
sensed value instead of the solved divider voltage. Contract tests and browser
review made the electronics genuinely load-bearing.

### Accomplishments that we're proud of

Four sciences share one deterministic graph. Biology and materials affect a
solved circuit; named couplings make that chain inspectable. Discovery runs are
reproducible, the assistant filters unsupported numbers, and the MIT repository
ships the Kiro workflow with 225 passing tests.

### What we learned

- I learned that Kiro CLI can do much more than answer questions in a terminal. I used it to work directly in the repo, turn briefs into working features, and check the result with real commands. That made an idea as broad as FrankenLab feel possible to build.
- I learned how much better the CLI works when it has a proper map. The spec gave it the goal, steering files kept the science and architecture consistent, and specialist agents let me bring the right perspective to each task. I could ask for a new component without explaining the whole project again.
- Kiro's hooks and reviews changed how I worked. The science reviewer caught a wrong sand value that shifted the whole experiment's timeline. Verification hooks and property tests then gave me a way to check the fix instead of just trusting a convincing-looking simulation.
### What's next for FrankenLab

The next step is saved experiments and classroom workspaces. The current
catalogue models are illustrative teaching tools, not calibrated predictions.

After the hackathon, education plans could add classrooms and reports; professional plans could add private libraries and larger sweeps.
