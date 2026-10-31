---
inclusion: always
---

# FrankenLab — Architecture

## The one architectural decision that matters

**The kernel knows nothing about any scientific discipline.**

It knows about components, ports, connections, parameters, state, time and
observations. A discipline is a plugin that supplies component definitions and
a step function. Adding a discipline must never require editing the kernel.

This is what makes the Frankenstein claim structurally true rather than
aspirational: an electrical netlist and a logistic growth curve genuinely do
share one representation, because the representation is the thing that knows
neither of them.

## Layering

```
UI layer (React + Three.js)
    ↓ reads state, issues intents
Application layer (workbench store, experiment CRUD, assistant panel)
    ↓ calls the kernel
KERNEL (domain-agnostic)
    ├── component registry
    ├── connection rules + validation
    ├── simulation lifecycle (fixed timestep, seeded RNG)
    ├── serialisation
    └── interdisciplinary coupling rules
    ↓ implements the Model interface
DISCIPLINE ENGINES (plugins)
    ├── electronics
    ├── biology
    ├── materials
    └── chemistry (later)
```

Dependencies point downward only. The kernel never imports an engine. Engines
never import each other. Cross-discipline coupling is expressed as **rules in
the kernel**, not as imports between engines.

## Core contracts

- `ComponentDefinition` — pure serialisable data. Metadata, ports, parameters,
  visual hints, confidence, stated assumptions. **No behaviour.**
- `ComponentBehavior` — the behavioural half, registered separately by
  component type. `step(state, inputs, context)` and optional
  `outputs(state, context)`.

Splitting these is what makes components testable in isolation, experiments
serialisable, and the catalogue browsable without executing code.

- `PortDefinition` — direction, **channel**, unit, required-ness.
- `ConnectionRule` — which channel pairs may connect, between which
  disciplines, with what transfer function and what confidence.

**The channel is not optional.** Units alone are insufficient: a 1.5 V
reference and a 1.5 V sensor reading share dimensions but are not
interchangeable. The channel captures what a quantity *means*.

## Units are mandatory

Every physical value is a `Quantity`: `{ value, unit }`. Unit-less numbers are
a scientific-integrity bug, because the assistant cannot know whether `12`
means 12 °C, 12 mV or 12 lux.

The dimensional system supports SI base dimensions with affine temperature
handling and explicit unit conversion. Connecting incompatible dimensions is a
validation error, never a silent coercion.

## Determinism is a hard requirement

- Time advances by a fixed `dt`. Never by wall-clock time.
- Randomness comes from a seeded mulberry32 generator. Never `Math.random()`.
- Components are stepped in a stable, sorted order.

Therefore: **same experiment + same seed = identical result, every time.** This
is what makes "reproducible" a claim rather than an adjective, and it is what
lets the notebook feature and the property-based tests work at all.

## Interdisciplinary coupling

Every cross-discipline link is a named, documented rule with a confidence
level. There is no implicit coupling, no engine-to-engine import, and no
"the simulator figures it out".

If no rule matches a proposed connection, validation rejects it with an
explanation. The error state is a designed screen, not a crash.

## Error handling

- Validation runs before every simulation and produces structured issues with
  codes, severities and component/connection ids.
- A failed validation is a **demo beat**, not an error state.
- The kernel never returns a partial result silently. If it cannot run, it
  refuses with a reason.
- The assistant never substitutes a plausible number for a failed calculation.

## Testing

- Property-based testing (fast-check) for invariants: no passive component
  generates energy; concentrations never go negative; material properties stay
  in range; identical inputs produce identical outputs.
- Deterministic fixtures for every engine.
- The same seed must produce byte-identical results across runs — this is a
  test, not an aspiration.

## AI assistant architecture

The assistant receives a **structured context** — the experiment, component
definitions, the latest kernel result, validation issues — and a **narrow tool
set**. Every tool either reads real kernel state or performs a real action.

The assistant is not required for the product to work. A deterministic local
explainer answers from the same structured context when no provider is
configured. This guarantees the app functions with no API key and no network,
and it is what makes the demonstration safe to record.
