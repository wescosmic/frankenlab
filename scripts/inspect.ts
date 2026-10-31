/**
 * A scratch harness for inspecting BioCircuit behaviour.
 * Run with: npx tsx scripts/inspect.ts
 *
 * It prints the biology, the materials and the electronics side by side for
 * each substrate preset, plus the day the alert first fires. This is the
 * harness used to tune the model, so it stays in the repository.
 */
import { createTestRegistry } from '../tests/world';
import { createBioCircuit } from '../src/scenarios/biocircuit';
import { Simulation } from '../src/kernel/simulator';

const registry = createTestRegistry();

const keys = [
  'substrate.moisture',
  'substrate.totalMoisture',
  'substrate.freeWater',
  'substrate.boundWater',
  'plant.biomass',
  'plant.health',
  'plant.transpiration',
  'nutrients.availability',
  'sensor.signal',
  'sensor.voltage',
  'sensor.resistance',
  'battery.current',
  'comparator.decision',
  'alert.brightness',
];

for (const substrate of ['sandy', 'loamy', 'clay', 'hydrogel'] as const) {
  const result = new Simulation(createBioCircuit({ substrate }), registry).run();
  const points = result.dataPoints;
  const first = points[0]!;
  const mid = points[Math.floor(points.length / 2)]!;
  const last = points.at(-1)!;

  console.log(`\n=== ${substrate} ===`);
  for (const key of keys) {
    const f = first.values[key]?.value;
    const m = mid.values[key]?.value;
    const l = last.values[key]?.value;
    console.log(
      `  ${key.padEnd(26)} start=${f?.toFixed(4) ?? '-'}  mid=${m?.toFixed(4) ?? '-'}  end=${l?.toFixed(4) ?? '-'}`,
    );
  }

  const fired = points.find((p) => (p.values['comparator.decision']?.value ?? 0) > 0.5);
  const cleared = fired
    ? points.find(
        (p) =>
          p.time > fired.time && (p.values['comparator.decision']?.value ?? 0) < 0.5,
      )
    : undefined;
  console.log(
    `  alert first fires: ${fired ? `day ${(fired.time / 86400).toFixed(1)}` : 'never'}` +
      `${cleared ? `  |  clears: day ${(cleared.time / 86400).toFixed(1)}` : ''}`,
  );
}
