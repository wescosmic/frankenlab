# Confidence levels

Every component in FrankenLab carries one of these four levels. The level is
shown in the workbench, given to the assistant, and used when a judge asks
how much to trust a number. It is a product feature, not metadata.

The question behind every level: **could a reviewer check this number
against the physics?**

## `physical-law`

Conserved and independently verifiable. The result follows from established
physics, and a reviewer with a calculator can reproduce it.

Required:

- a conservation law holds and is tested by a property test;
- the result follows from first principles, not from a fitted number;
- the assumptions list says where the idealisation is.

Examples in this codebase: the resistor, the battery, the voltage divider
and the comparator. The circuit is solved by real modified nodal analysis,
and the test asserts that the source delivers exactly the power the
resistors dissipate.

## `established-simplified`

An established model, reduced for teaching. Directionally sound. Not a
prediction you would publish.

Required:

- the model is a published one, or a recognisable reduction of one;
- the reduction is stated in the assumptions list, in plain English;
- the quantities keep their real units and their real order of magnitude.

Examples: the plant's logistic growth, the substrate's two-reservoir water
balance, the resistive sensor's calibration curve.

The substrate is the clearest case. Its field capacity and wilting point are
representative teaching figures for each medium, not measurements of a
specific product, and the definition says so.

## `illustrative`

Qualitative. Useful for feel, not for numbers you would publish.

Required:

- the shape of the behaviour is right;
- the numbers are plausible but are not claimed to be accurate;
- the UI and the assistant must not present them as if they were.

Examples: the moisture source's delivery rate, the substrate's volume, the
plant's initial fill.

## `hypothetical`

Speculative by design. The component is a placeholder for something that
does not exist yet.

Required:

- it is labelled as such in the catalogue;
- nothing downstream depends on its numbers being real.

## Choosing honestly

The temptation is to file a model one level higher than it deserves, because
`physical-law` sounds better in a demo. Resist it. The competition judges
technical implementation and scientific integrity, and a wrong confidence
level is evidence against both.

If a model turns out to deserve a lower level than it had, lower it and say
so. That happened in this project: the biology's maturity event was retired
entirely because the model could not reach it, rather than being kept with a
threshold that never fired.
