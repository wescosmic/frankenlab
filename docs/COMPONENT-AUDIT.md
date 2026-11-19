# Workbench component audit — 17 November 2026

The audit exercises the same registry, simulator, placement and connection store used by the workbench. It covers 34 component types and 515 permitted directed port pairings (including bidirectional electrical terminals). Pair tests check successful execution, finite readings and declared output availability; they do not prove the physical correctness of every possible multi-component graph.

## Faults corrected

- Twenty extended catalogue components copied input values into their state without calculating their declared outputs. They now implement bounded, deterministic teaching behaviours.
- The port-contract test claimed full coverage but only exercised the fourteen original types. It now includes the entire registry.
- Separate voltage-source islands shared a single reference, potentially making the whole electrical solve singular. Each island now has a reference.
- Solar cells, electrodes and capacitor outputs now participate as sources in the electrical network. A light-source → solar-cell → LED chain is tested through the workbench store, including darkness.
- Multiple sources targeting a scalar input previously used whichever connection was processed last. The validator now rejects a second driver with an actionable message. Shared electrical nodes remain supported.
- Microbial Fuel Cell, Enzyme Optimisation and Water Purification previously opened without connections. They now include feeds and connected chains that run immediately.
- Light and temperature sources have inspector controls. Enzymes expose an optimal temperature; heat baths expose a setpoint. Source settings apply before the first tick.
- Component selection opens the desktop inspector through a store subscription, removing the synchronous effect update flagged by lint.

## Behaviour and limitations

| Components | Implemented behaviour | Limit |
| --- | --- | --- |
| Culture, roots, greenhouse, compost, gas exchange | Nutrient/water/light/temperature-dependent bounded responses | Qualitative signals; no species-specific kinetics or fluid transport |
| Enzyme and catalyst | Substrate-dependent conversion; enzyme temperature response | No full reaction network, enzyme pH response or depletion feedback |
| Membrane, filter, separator | Fixed partition fractions propagated through the chain | Concentration signal partitioning, not a flow/volume mass-balance solver |
| pH probe | Treats input as hydrogen-ion concentration; publishes pH divided by 14 | Not a general acidity prediction for arbitrary chemical mixtures |
| Heat bath and thermal mass | Stable relaxation toward a heat-dependent temperature | Illustrative heat capacity and time constants |
| Capacitor | Bounded exponential charging and discharging; voltage output drives downstream circuits | Buffered teaching source, not load-dependent transient SPICE analysis |
| Solar cell and electrode | Input-dependent source voltage | No detailed IV curve, electrochemical species model or load-dependent efficiency |
| Motor and data logger | Voltage-dependent drive response; passive normalised signal recording | No rotor mechanics or instrument noise |

The existing electrical, plant, material and reaction tests remain in the verification suite. New tests also exercise every type through add/move/remove actions, table bounds, competing scalar inputs, source removal, connected showcases and separation-chain outputs.

## Scope still requiring care

- Arbitrary multi-source circuits, especially contradictory ideal sources or shorts, are not guaranteed to have a unique solution. This audit does not certify every graph as physically meaningful.
- Automatic placement keeps component origins within table bounds; a crowded table can still contain overlapping models.
- This is a simulator/store audit, not an exhaustive pointer, touch, accessibility or visual-model review.
- Catalogue results remain marked `illustrative`; do not present them as calibrated scientific predictions.

Run `npm run verify` for type checking, lint and the complete regression suite.
