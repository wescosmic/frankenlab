/**
 * Debug the electronics network solver in isolation.
 */
import { createTestRegistry } from '../tests/world';
import { createBioCircuit } from '../src/scenarios/biocircuit';
import { Simulation } from '../src/kernel/simulator';
import { electronicsNetworkSolver } from '../src/engines/electronics/engine';
import { convert } from '../src/kernel/units';
import type { PortDefinition } from '../src/kernel/types';

const registry = createTestRegistry();
const experiment = createBioCircuit();

// Build the initial states the way the simulator does.
const simulation = new Simulation(experiment, registry, { duration: 3600 });
const snapshot = simulation.snapshot();

const electronicIds = new Set(
  experiment.components
    .filter((c) => c.type.startsWith('electronics.'))
    .map((c) => c.id),
);

const components = experiment.components.filter((c) => electronicIds.has(c.id));
const connections = experiment.connections.filter(
  (c) => electronicIds.has(c.source.componentId) && electronicIds.has(c.target.componentId),
);

const componentPorts = new Map<string, readonly PortDefinition[]>();
for (const c of components) {
  componentPorts.set(c.type, registry.getDefinition(c.type).ports);
}

console.log('components:', components.map((c) => `${c.id}(${c.type})`).join(', '));
console.log('connections:', connections.map((c) => `${c.source.componentId}.${c.source.portId} -> ${c.target.componentId}.${c.target.portId}`).join('\n            '));

const results = electronicsNetworkSolver.solve({
  components,
  connections,
  states: new Map(Object.entries(snapshot.components)),
  resolvedInputs: new Map(),
  dt: experiment.dt,
  componentPorts,
});

console.log('\nsolver results:');
for (const [id, values] of results) {
  console.log(`  ${id}:`, Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.value])));
}

// Also check what the simulator's own outputs say.
console.log('\nsimulator snapshot outputs:');
for (const [id, outputs] of Object.entries(snapshot.outputs)) {
  if (!electronicIds.has(id)) continue;
  console.log(`  ${id}:`, Object.fromEntries(Object.entries(outputs).map(([k, v]) => [k, v.value])));
}

void convert;
