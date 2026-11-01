/**
 * Measure every day this project quotes.
 *
 * The alert days, the wilting day and the recovery days appear in README.md,
 * in the spec and in `BIOCIRCUIT_MEASURED_DAYS`. They are facts about the
 * simulation, so they are measured rather than written by hand. Run this after
 * any change to an engine, to the scenario or to the substrate constants.
 *
 *   npx tsx scripts/measure-beats.ts
 *
 * The output is the source of truth. If a number in the documentation drifts
 * away from this output, the documentation is wrong.
 */
import { createBioCircuit } from '../src/scenarios/biocircuit';
import { createWorld } from '../src/world';
import { Simulation } from '../src/kernel/simulator';
import type { Observation } from '../src/kernel/types';

const DAY = 86400;
const MEDIUMS = ['sandy', 'loamy', 'clay', 'hydrogel'] as const;
const PROBE_DAYS = 60;
/** The irrigation rate the demonstration turns up to in the inspector. */
const RESCUE_RATE = 0.05;

function dayOf(time: number): number {
  return time / DAY;
}

function firstDays(observations: readonly Observation[]): Map<string, number> {
  const first = new Map<string, number>();
  for (const observation of observations) {
    if (!first.has(observation.code)) {
      first.set(observation.code, dayOf(observation.time));
    }
  }
  return first;
}

function format(days: Map<string, number>): string {
  if (days.size === 0) return 'no observations';
  return [...days.entries()]
    .map(([code, day]) => `${code} ${day.toFixed(2)}`)
    .join(', ');
}

/**
 * How many steps the flagship takes at its shipped duration.
 */
function flagshipSteps(): number {
  const experiment = createBioCircuit();
  const result = new Simulation(experiment, createWorld()).run();
  return result.steps;
}

/**
 * The day the medium wilts in sand, which is where the demonstration pauses.
 */
function wiltingStep(): number {
  const experiment = createBioCircuit({ substrate: 'sandy' });
  const simulation = new Simulation(experiment, createWorld());
  const result = simulation.run({ maxSteps: PROBE_DAYS * 24 });
  const wilting = result.observations.find((o) => o.code === 'materials.wilting');
  if (!wilting) throw new Error('The medium never wilts in sand. The story is broken.');
  return Math.ceil(wilting.time / experiment.dt);
}

/**
 * The recovery beat: the user pauses once the medium has wilted, turns the
 * irrigation up, and the medium comes back above the wilting point.
 */
function recoveryDays(): Map<string, number> {
  const experiment = createBioCircuit({ substrate: 'sandy' });
  const simulation = new Simulation(experiment, createWorld());

  simulation.run({ maxSteps: wiltingStep() + 1 });
  simulation.updateParameter('irrigation', 'rate', RESCUE_RATE);
  const result = simulation.run();

  return firstDays(result.observations);
}

const registry = createWorld();

console.log('=== Per medium, over 60 days ===');
for (const medium of MEDIUMS) {
  // The shipped duration is overridden so that a medium which dries slowly
  // still shows every beat. The shipped run is measured separately below.
  const experiment = { ...createBioCircuit({ substrate: medium }), duration: DAY * PROBE_DAYS };
  const result = new Simulation(experiment, registry).run();
  console.log(`${medium.padEnd(10)} ${format(firstDays(result.observations))}`);
}

const flagship = createBioCircuit();
const flagshipResult = new Simulation(flagship, registry).run();
console.log('\n=== The shipped flagship ===');
console.log(`duration ${flagship.duration / DAY} days, ${flagshipResult.steps} steps`);
console.log(format(firstDays(flagshipResult.observations)));

console.log('\n=== The recovery beat (irrigation turned up after wilting) ===');
console.log(format(recoveryDays()));

console.log('\n=== Update these when the numbers move ===');
console.log(`AC-2 steps: ${flagshipSteps()}`);
