---
inclusion: always
---

# FrankenLab — Scientific Integrity

This document exists because the product's central claim is that its numbers
mean something. Everything below is a hard rule, not a preference. If a change
breaks one of them, the change is wrong.

## 1. Never invent a measurement

Every number the product shows must come out of the simulation kernel.

- The UI reads `SimulationResult`, never a model of what the result "should"
  look like.
- The assistant reads the same result. It may explain, summarise and cite a
  value. It may not estimate, interpolate or recall a value from training.
- The 3D scene reads the same result. Animation is driven by real outputs, not
  by a decorative animation that implies a measurement.

`findUnsupportedNumbers` in the assistant exists to catch a provider that
breaks this rule. A number in an assistant reply that is not in the experiment
is a bug. The single exemption is a whole number at or below 1: "day 1" and
"one step" are writing far more often than they are measurements. A decimal is
checked however small it is.

## 2. Never present a simplification as a validated prediction

Every component carries a `confidence` level. It is not documentation — it is
data, and it must reach the user.

| Level | Means |
| --- | --- |
| `physical-law` | Conserved and independently verifiable. |
| `established-simplified` | An established model reduced for teaching. Directionally sound, not a prediction. |
| `illustrative` | Qualitative. Useful for feel, not for numbers you would publish. |
| `hypothetical` | Speculative by design. |

Rules:

- A component without a confidence level is a bug. There is no default.
- Every component states its **assumptions** in plain English, and they are
  shown in the UI next to the controls.
- A new model must state what it leaves out, not only what it does.
- FrankenLab is a learning environment. It does not replace physical
  laboratories, and no copy may imply that it does.

## 3. Never silently substitute a plausible answer for a failed calculation

- A model that cannot compute must return nothing, not a default that looks
  like a result.
- A singular circuit solve returns zeros and says so, rather than inventing
  node voltages.
- The kernel refuses to run an invalid experiment, with a list of reasons.
- The comparator treats a missing input as "no decision", not as zero.
- If a unit conversion is impossible, the connection is rejected — never
  coerced.

## 4. Keep the physics honest, and keep the boundaries visible

- A cross-discipline link is a **named, documented rule** with its own
  confidence level. There is no implicit coupling.
- If no rule matches a proposed connection, validation rejects it.
- A boundary that changes the meaning of a quantity must say so. A resistive
  soil probe reports a **divider output**, not the moisture it measured — the
  comparator must threshold the solved circuit quantity, not the biological
  value that drove it.
- Rates are absolute or normalised, and the choice is stated. A model must
  not quietly scale one medium's behaviour by another medium's properties.

## 5. Determinism is part of the scientific claim

- Fixed timestep. Never wall-clock time.
- Seeded randomness only. Never `Math.random()`.
- Stable component ordering.
- Same experiment + same seed = identical result, and there is a test that
  proves it.

A result that cannot be reproduced is not a result.

## 6. Conservation is checked, not asserted

Wherever a model has a conserved quantity, the engine publishes it and a test
asserts it.

- The circuit: the source delivers exactly the power the resistors dissipate.
- The medium: water moves between reservoirs, it never appears from nothing.
- The vessel: `A + C` is conserved for `A + B ⇌ C`. Note that the plain sum
  is **not** conserved — two moles become one. Get this right; getting it
  wrong is the kind of error that destroys a submission's credibility.

## 7. Tests are the contract

- Every claim in this document that can be checked, is checked by a test.
- Prefer a property-based test over an example test when a range is involved.
- Draw property-test inputs from the ranges the component definitions
  declare. Testing outside them measures the validator, not the model.
- A test that passes for the wrong reason is worse than no test. When one
  fails, find out what it is actually telling you before changing it.
