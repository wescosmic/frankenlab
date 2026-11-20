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

Four sciences share one deterministic graph. Biology and materials affect a
solved circuit; named couplings make that chain inspectable. Discovery runs are
reproducible, the assistant filters unsupported numbers, and the MIT repository
ships the Kiro workflow with 225 passing tests.

### What we learned

1. **Measure the story.** Kiro's science review found that sand's field capacity
   was too low. Correcting it changed the alert day, so scripts and tests now
   verify every quoted milestone.
2. **Test the interfaces between sciences.** A believable animation hid a
   comparator using raw moisture instead of solved voltage. Port contracts and
   circuit tests exposed the error.
3. **Show model limits.** A simulation can be reproducible without being a
   calibrated prediction. Every component declares assumptions and confidence;
   the assistant grounds its numbers in actual readings.
4. **Make the builder prove the product.** An empty bench, clear wiring feedback,
   and component movement matter as much as presets. Auditing all 34 parts and
   515 compatible port pairs found inert catalogue behaviours and conflicting
   inputs before submission.

### What's next for FrankenLab

The next step is saved experiments and classroom workspaces. The current
catalogue models are illustrative teaching tools, not calibrated predictions.

After the hackathon, education plans could add classrooms and reports; professional plans could add private libraries and larger sweeps.
