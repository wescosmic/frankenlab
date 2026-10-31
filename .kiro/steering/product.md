---
inclusion: always
---

# FrankenLab — Product

## What this is

FrankenLab is an interactive scientific laboratory where multiple disciplines
are connected through one shared simulation graph. The user assembles an
experiment from components drawn from different sciences, connects them, runs
the simulation, and observes the consequences.

The central premise: **a circuit, a plant and a bag of soil can be wired
together into one system that behaves sensibly, and you can see exactly how
each part influences the others.**

## Who it is for

Students and educators exploring STEM concepts; makers and hobbyists who want
to experiment without lab equipment; researchers and inventors prototyping
systems that do not exist yet.

## The one thing that must be true

**The simulation computes. The AI interprets. The user decides.**

- Simulation engines calculate results from established models. They never ask
  a language model for a number.
- The AI assistant may only cite measurements that exist in the most recent
  kernel run. It never invents a value and never claims a run happened when
  the kernel did not execute one.
- The user chooses what to build, what to change and what to run.

## Scientific honesty is a product feature, not a disclaimer

Every component carries a `confidence` classification:

| Level | Meaning |
|---|---|
| `physical-law` | Conserved and independently verifiable. |
| `established-simplified` | An established model, simplified for teaching. |
| `illustrative` | Qualitative. Directionally meaningful, not quantitatively predictive. |
| `hypothetical` | Speculative by design — the point is exploration, not prediction. |

These are surfaced in the UI, given to the assistant, and written into results.
**A speculative simulation must never be able to masquerade as a validated
prediction.** If a change would blur that line, reject the change.

## Scope discipline

FrankenLab is a competition product with a hard deadline. Depth beats breadth.
Two disciplines done properly, plus one memorable interdisciplinary moment,
beats four done superficially.

The chemistry engine is the first thing to be cut, not the first thing to be
built. Adding a fourth discipline is only worth it if the three already in the
platform are convincing.

## Language

Plain English. Short sentences. No abstract nouns where a concrete one works.
"The LED lights when the soil dries out" — not "the system enables intelligent
environmental responsiveness".

## What the user should feel

They should feel they are at a workbench, not in a dashboard. The interface is
an instrument: dark, precise, physical. Objects sit in space and can be
picked up, connected and adjusted. Results appear where the experiment
happened, not on a separate report screen.
