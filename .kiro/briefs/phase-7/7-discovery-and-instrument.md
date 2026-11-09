# Phase 7 — Discovery instrument

## Goal

Make FrankenLab compelling to use and materially stronger as a scientific
discovery tool without abandoning its local-first, deterministic design.

## Scope

Deliver these in one coherent pass, in this order:

1. Run snapshots and side-by-side comparison.
2. A visual causal-flow pass in the existing Three.js scene.
3. Local Discovery Mode for deterministic parameter sweeps.
4. A new cross-disciplinary Bio-Battery experiment.

## Product constraints

- The simulation computes; the AI interprets; the user decides.
- Keep all ordinary playback local and offline.
- Preserve seeded determinism and the existing trust/confidence language.
- Do not add a remote API key or cloud dependency in this phase.
- Preserve mobile behavior and the current public deployment path.
- Prefer small composable modules over a rewrite of the renderer or kernel.

## Acceptance criteria

### Comparison

- A completed or paused run can be saved as a named snapshot without changing
  the live run.
- The user can save at least two snapshots and open a comparison view.
- The comparison shows the same tracked series and key observations side by
  side, with units and clear labels.
- Comparison data is serializable and does not use the live simulation object.
- Tests cover save, restore/compare, deterministic equality, and different
  parameter results.

### Visual instrument

- Keep WebGL as the compatibility path.
- Add visible causal flow: animated pulses on active connections, with colors
  tied to the connection's discipline/channel.
- Improve depth with safe lighting/contact-shadow cues, material variation,
  and restrained bloom/glow or equivalent emphasis for active signals.
- Make selection and running state unmistakable without relying only on text.
- Avoid label clutter and preserve pointer interaction, resize behavior, and
  mobile performance.
- Do not introduce a heavy asset pipeline or remote textures.

### Discovery Mode

- The user can choose a parameter, a range, a number of trials, and an outcome
  to optimize from a bounded UI.
- Sweeps run locally in a Web Worker or equivalent non-blocking path.
- Every trial is deterministic from the base seed plus trial index.
- Results include best trial, worst trial, ranked rows, and a compact chart or
  visual summary with units.
- The UI explains that discovery results are model results and carries the
  weakest confidence level.
- Tests cover bounds, determinism, ranking, cancellation or safety limits, and
  invalid configurations.

### Bio-Battery

- Add a new experiment that genuinely couples biology/chemistry/materials to
  electronics, not just a decorative visualization.
- Reuse existing engine contracts and add only the smallest new component or
  coupling needed.
- Expose at least one meaningful output that drives an electronics threshold
  or load, plus observations that tell a clear story.
- Add a catalogue entry, tracked series, measurements, and tests.
- Keep assumptions and confidence honest; label teaching-scale models clearly.

## Verification

Run `npm run verify`, the relevant property tests, and a production build.
Record the Kiro agent, steering, hooks, and test evidence in the final handoff.
