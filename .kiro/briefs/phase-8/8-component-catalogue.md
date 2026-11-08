# Phase 8 — Expand the component catalogue

## Goal

Expand FrankenLab from a small demo catalogue into a recognizable experimental
toolkit. Implement the high-value additions first, then a second sector wave.
Every component must be deterministic, honest about assumptions, connected by
declared physical channels, and usable from the existing drag/add inventory.

## High-value wave

Add these component types to the existing engines:

- `biology.microbial-culture`: nutrient input, oxygen input, biomass output,
  waste output; parameters growth rate, carrying capacity, oxygen demand.
- `biology.enzyme`: substrate input, product output, activity output;
  parameters catalytic rate, optimum temperature, pH sensitivity.
- `biology.membrane`: feed input, permeate output, retained output;
  parameters permeability and selectivity.
- `biology.gas-exchange`: oxygen input, carbon-dioxide output, activity input;
  parameters exchange rate and capacity.
- `chemistry.ph-meter`: sample input, measurement output; parameters offset and
  sensitivity. Use illustrative confidence and bounded pH output.
- `chemistry.catalyst-bed`: reactant input, product output, activity output;
  parameters active area and rate multiplier.
- `chemistry.heat-bath`: vessel input, temperature output; parameters setpoint,
  ramp rate, and thermal capacity.
- `chemistry.separator`: mixture input, separated output and waste output;
  parameters efficiency and throughput.
- `electronics.capacitor`: terminal_a, terminal_b, voltage output;
  parameters capacitance and initial voltage. Include charge/discharge behavior
  in the electronics network solver where practical.
- `electronics.photovoltaic-cell`: light input, positive/negative electrical
  ports, power output; parameters irradiance, efficiency, and open-circuit
  voltage. It must be able to drive a resistive load.
- `electronics.motor`: electrical input ports and speed/torque outputs;
  parameters resistance, torque constant, and load.
- `electronics.data-logger`: signal input and recorded output; parameters sample
  interval and capacity. It should expose readings without changing the source.

## Second sector wave

Add these components using existing disciplines where possible:

- `biology.root-system`: moisture/nutrient inputs, uptake output, biomass signal.
- `biology.greenhouse`: light, temperature, humidity inputs and growth multiplier.
- `biology.compost-reactor`: organic feed input, heat and nutrient outputs.
- `materials.filter-media`: mixture input, filtrate and retained outputs;
  parameters pore size, porosity, and capture efficiency.
- `materials.thermal-mass`: heat input/output and temperature state;
  parameters mass, heat capacity, and initial temperature.
- `materials.electrode`: electrolyte input, positive/negative electrical ports,
  and reaction activity output.
- `environment.light-source`: irradiance output and controllable intensity.
- `environment.temperature-chamber`: temperature output and setpoint control.

If an environment engine is not already present, add the smallest new
`environment` discipline engine needed, including registry registration,
discipline colour/order, validation rules, and tests.

## Inventory visuals

Extend `ComponentDefinition` with optional serialisable visual metadata:

```ts
inventoryVisual?: {
  image?: string;
  thumbnail?: string;
  alt: string;
  kind: 'technical-render' | 'cutaway' | 'diagram' | 'silhouette';
};
```

Give every existing and new component a consistent inventory visual. Prefer
local lightweight SVG or CSS/Three.js technical illustrations over external
URLs. The Library should show a thumbnail, discipline colour, component name,
confidence, and a one-line description. Preserve drag, add, keyboard focus,
and mobile behavior. Use an attractive dark studio-card treatment and a
fallback silhouette when no asset is available.

## Experiments to add

Add at least three catalogue experiments that demonstrate the new components:

1. Microbial Fuel Cell: microbial culture -> electrode/bioelectric source ->
   capacitor -> LED/load.
2. Enzyme Optimization: enzyme + substrate + pH meter + heat bath, with tracked
   activity and product output.
3. Water Purification: mixture -> membrane -> filter media -> separator, with
   tracked purity and throughput.

Use explicit illustrative assumptions. Do not claim clinical or industrial
accuracy. Keep remote compute out of this phase; local deterministic runs are
the product default.

## Acceptance criteria

- All high-value and second-wave component definitions are registered and appear
  in the inventory grouped by discipline.
- New components can be added to the bench without crashes and serialize in an
  experiment definition.
- Ports and cross-discipline rules reject invalid links and accept the intended
  links.
- At least three new experiments run end-to-end and publish tracked readings.
- Inventory visuals render locally with accessible alt text and a fallback.
- Add unit/integration tests for each new behavior family, registry coverage,
  visual metadata, and deterministic repeatability.
- `npm run verify` and `npm run build` pass.

## Kiro workflow

Use the engine-builder for model work, kernel-guardian for routing/validation,
science-reviewer for assumptions, and ui-integration for inventory visuals.
Update this brief with implementation notes before finishing.
