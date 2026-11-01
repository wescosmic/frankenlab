/**
 * Measure every number the catalysis experiment quotes.
 *
 * The claim this experiment makes is precise: a catalyst changes how fast a
 * reaction gets to equilibrium, and not where equilibrium is. That claim only
 * means something if the numbers behind it are measured, so they are.
 *
 *   npx tsx scripts/measure-catalysis.ts
 *
 * The output is the source of truth. If a number in the documentation, in the
 * scenario or in `CATALYSIS_MEASURED` drifts away from this output, the
 * documentation is wrong.
 */
import { createCatalysis } from '../src/scenarios/catalysis';
import { equilibriumExtent } from '../src/engines/chemistry/engine';
import { createWorld } from '../src/world';
import { Simulation } from '../src/kernel/simulator';
import type { ExperimentDefinition, Observation } from '../src/kernel/types';

const registry = createWorld();

/** The step and the time at which a vessel first sits within one per cent of equilibrium. */
function settleStep(
  experiment: ExperimentDefinition,
  vesselId: string,
  equilibrium: number,
): { step: number; minutes: number } {
  const simulation = new Simulation(experiment, registry);
  const total = simulation.run().steps;
  const threshold = equilibrium * 0.99;

  const fresh = new Simulation(experiment, registry);
  for (let step = 1; step <= total; step += 1) {
    fresh.tick();
    const product = fresh.snapshot().outputs[vesselId]?.['product']?.value ?? 0;
    if (product >= threshold) {
      return { step, minutes: (step * experiment.dt) / 60 };
    }
  }
  return { step: total, minutes: (total * experiment.dt) / 60 };
}

function equilibriumObservation(
  result: { observations: readonly Observation[] },
  componentId: string,
): string {
  const observation = result.observations.find(
    (entry) => entry.code === 'chemistry.equilibrium' && entry.componentId === componentId,
  );
  if (!observation) return 'never reached';
  return `at ${(observation.time / 60).toFixed(1)} min`;
}

const experiment = createCatalysis();
const result = new Simulation(experiment, registry).run();

const equilibrium = equilibriumExtent(1, 1, 4);
const plain = settleStep(experiment, 'plain', equilibrium);
const catalysed = settleStep(experiment, 'catalysed', equilibrium);

console.log('=== The catalysis comparison ===');
console.log(`run length: ${experiment.duration / 3600} hours, ${result.steps} steps of ${experiment.dt}s`);
console.log(`solved equilibrium extent: ${equilibrium.toFixed(6)} mol/L`);
console.log('');

for (const vesselId of ['plain', 'catalysed'] as const) {
  const product = result.measurements[`${vesselId}.product`]?.value ?? 0;
  const balance = result.measurements[`${vesselId}.stoichiometric_balance`]?.value ?? 0;
  const settle = vesselId === 'plain' ? plain : catalysed;
  console.log(`${vesselId.padEnd(10)} product ${product.toFixed(6)} mol/L`);
  console.log(`${''.padEnd(10)} A + C ${balance.toFixed(9)} mol/L (must stay 1)`);
  console.log(`${''.padEnd(10)} within 1% of equilibrium at step ${settle.step} (${settle.minutes.toFixed(1)} min)`);
  console.log(`${''.padEnd(10)} equilibrium reported ${equilibriumObservation(result, vesselId)}`);
}

console.log('');
console.log(
  `the catalysed vessel arrives ${(plain.step / Math.max(1, catalysed.step)).toFixed(1)}x sooner`,
);
console.log(
  `the two vessels end ${Math.abs(
    (result.measurements['plain.product']?.value ?? 0) -
      (result.measurements['catalysed.product']?.value ?? 0),
  ).toFixed(6)} mol/L apart`,
);
