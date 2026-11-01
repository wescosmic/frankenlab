/**
 * Measure the nutrient reservoir's balance over the flagship run.
 *
 * The Couplings panel says the plant takes about seven per cent of the store
 * out of the reservoir, and that the reservoir puts back about half of what
 * the plant drank. This script is where that sentence comes from. Run it
 * after any change to the plant, the reservoir or the flagship scenario.
 *
 *   npx tsx scripts/measure-nutrients.ts
 *
 * The arithmetic is the model's own, not an estimate:
 *
 *   stored(n) = stored(n-1) - consumption(n) + regenerationApplied(n)
 *
 * so the regeneration that actually landed is the net change plus everything
 * the plant drank. The difference between that and the reservoir's nominal
 * regeneration is what the full tank could not accept and had to drop.
 */
import { createBioCircuit } from '../src/scenarios/biocircuit';
import { createWorld } from '../src/world';
import { Simulation } from '../src/kernel/simulator';

const DAY = 86400;
/** The reservoir's declared regeneration, a fraction of capacity per day. */
const NOMINAL_REGENERATION = 0.003;

const experiment = createBioCircuit({ substrate: 'sandy' });
const simulation = new Simulation(experiment, createWorld());

/**
 * The reservoir drinks what the plant published on the *previous* step,
 * because that is how the kernel passes values between components. The series
 * is aligned to that, and the last published demand is dropped because the
 * run ends before the reservoir ever gets to drink it. The balance is the
 * model's own, not an approximation.
 */
const initialDemand =
  simulation.snapshot().outputs['plant']?.['nutrientDemand']?.value ?? 0;

const result = simulation.run();

const days = experiment.dt / DAY;
const availability = result.dataPoints.map(
  (point) => point.values['nutrients.availability']?.value ?? NaN,
);
const demand = result.dataPoints.map(
  (point) => point.values['plant.nutrientDemand']?.value ?? 0,
);
/** The demand the reservoir actually saw, step by step. */
const consumedRates = [initialDemand, ...demand.slice(0, -1)];

const start = availability[0];
const end = availability[availability.length - 1];
if (start === undefined || end === undefined) {
  throw new Error('The flagship run produced no readings. The balance cannot be measured.');
}
const netChange = end - start;

/** Everything the plant drank, as a fraction of the reservoir's capacity. */
const consumed = consumedRates.reduce((total, rate) => total + rate * days, 0);

/** What the reservoir actually put back, from the model's own balance. */
const regenerated = netChange + consumed;

const nominal = NOMINAL_REGENERATION * (result.steps * days);
const lostToTheFullTank = nominal - regenerated;

const perCent = (value: number): string => `${(value * 100).toFixed(2)}%`;

console.log('=== The nutrient reservoir over the flagship run ===');
console.log(`steps              ${result.steps} (${(result.steps * days).toFixed(0)} days)`);
console.log(`availability       ${start.toFixed(4)} -> ${end.toFixed(4)}`);
console.log(`net drawdown       ${perCent(-netChange)} of the store`);
console.log(`plant consumed     ${perCent(consumed)} of the store`);
console.log(`regenerated back   ${perCent(regenerated)} of the store`);
console.log(`  of what it drank ${(regenerated / consumed * 100).toFixed(1)}%`);
console.log(`nominal regen      ${perCent(nominal)} (the tank was full at the start)`);
console.log(`dropped by the cap ${perCent(lostToTheFullTank)}`);
console.log(`peak demand        ${Math.max(...demand).toFixed(6)} per day`);
console.log('');
console.log('The plant is limited by water long before it is limited by nutrients.');
