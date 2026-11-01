import { describe, expect, it } from 'vitest';
import { createWorld } from '@/world';
import { activeCouplings } from '@/interactions/active-couplings';
import { ALL_COUPLINGS } from '@/interactions/couplings';
import { createBioCircuit } from '@/scenarios/biocircuit';
import { createThresholdAlarm } from '@/scenarios/threshold-alarm';
import { createCatalysis } from '@/scenarios/catalysis';

const registry = createWorld();

describe('The couplings panel tells the truth about the bench', () => {
  it('finds the named rules that carry the flagship across its disciplines', () => {
    const summary = activeCouplings(createBioCircuit(), registry);

    // Three disciplines share the flagship's graph: biology, materials and
    // electronics. The panel has to say so, because that is the claim the
    // product is built on.
    expect(summary.disciplines).toContain('biology');
    expect(summary.disciplines).toContain('materials');
    expect(summary.disciplines).toContain('electronics');

    const names = summary.couplings.map((entry) => entry.coupling.name);
    expect(names).toContain('Substrate-controlled growth');
    expect(names).toContain('Water exchange with the medium');
    expect(names).toContain('Material-dependent conductance');
  });

  it('counts every wire a named rule governs', () => {
    const experiment = createBioCircuit();
    const summary = activeCouplings(experiment, registry);

    const links = summary.couplings.flatMap((entry) => entry.links);
    expect(links).toHaveLength(summary.linkCount);

    // Every link names a connection that is really on the bench.
    for (const link of links) {
      expect(experiment.connections.map((c) => c.id)).toContain(link.connectionId);
    }
  });

  it('agrees with the rule the kernel itself applies to the wire', () => {
    const experiment = createBioCircuit();
    const summary = activeCouplings(experiment, registry);

    for (const entry of summary.couplings) {
      for (const link of entry.links) {
        const rule = registry.findRule(
          { discipline: link.sourceDiscipline, channel: link.sourceChannel },
          { discipline: link.targetDiscipline, channel: link.targetChannel },
        );

        // The panel must not name a rule the simulation would not use.
        expect(rule).toBeDefined();
        expect(rule!.sourceDiscipline).toBe(link.sourceDiscipline);
        expect(rule!.targetDiscipline).toBe(link.targetDiscipline);
        expect(rule!.sourceChannel).toBe(link.sourceChannel);
        expect(rule!.targetChannel).toBe(link.targetChannel);
      }
    }
  });

  it('leaves the electronics alone when nothing crosses over', () => {
    const summary = activeCouplings(createThresholdAlarm(), registry);

    // The threshold alarm is the same circuit with the biology taken out.
    // Nothing crosses a discipline boundary, so there is no coupling to show.
    expect(summary.couplings).toHaveLength(0);
    expect(summary.linkCount).toBe(0);
  });

  it('leaves the chemistry alone when nothing crosses over', () => {
    const summary = activeCouplings(createCatalysis(), registry);
    expect(summary.couplings).toHaveLength(0);
  });

  it('follows the bench when a wire is cut', () => {
    const experiment = createBioCircuit();
    const before = activeCouplings(experiment, registry);

    // Cut the wire that carries the substrate's moisture into the probe.
    const cut = {
      ...experiment,
      connections: experiment.connections.filter((c) => c.id !== 'c-substrate-sensor'),
    };
    const after = activeCouplings(cut, registry);

    expect(after.linkCount).toBe(before.linkCount - 1);
    expect(after.couplings.map((e) => e.coupling.id)).not.toContain('materials-to-electronics');
  });

  it('never invents a coupling that is not declared', () => {
    const summary = activeCouplings(createBioCircuit(), registry);
    const declared = new Set(ALL_COUPLINGS.map((c) => c.id));

    for (const entry of summary.couplings) {
      expect(declared.has(entry.coupling.id)).toBe(true);
    }
  });

  it('names the parts the way the user sees them', () => {
    const summary = activeCouplings(createBioCircuit(), registry);
    const links = summary.couplings.flatMap((entry) => entry.links);
    const labels = links.flatMap((link) => [link.sourceLabel, link.targetLabel]);

    // These are the labels on the bench, not the internal type names.
    expect(labels).toContain('Substrate');
    expect(labels).toContain('Moisture probe');
    expect(labels).not.toContain('materials.substrate');
  });
});
