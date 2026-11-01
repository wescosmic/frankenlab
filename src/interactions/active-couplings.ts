/**
 * FrankenLab — Which declared couplings the experiment is actually using.
 *
 * `couplings.ts` declares every interdisciplinary rule the product knows about.
 * This module answers a narrower question: of those rules, which ones are
 * carrying a wire in the experiment the user is looking at right now?
 *
 * The answer is derived from the live graph rather than from a hand-written
 * list, so it stays true when the user wires a new part onto the bench or
 * cuts a wire. A wire only counts as a coupling when a *named* coupling rule
 * governs it. Everything else is an ordinary link inside one discipline and is
 * not a coupling at all.
 */

import type { ComponentRegistry } from '../kernel/registry';
import type {
  Connection,
  ConnectionRule,
  DisciplineId,
  ExperimentDefinition,
  PortChannel,
} from '../kernel/types';
import { ALL_COUPLINGS, type InteractionCoupling } from './couplings';

/** One wire that a declared coupling rule governs. */
export interface CouplingLink {
  readonly connectionId: string;
  /** The label the user sees on the bench for the sending part. */
  readonly sourceLabel: string;
  readonly sourceDiscipline: DisciplineId;
  readonly sourceChannel: PortChannel;
  readonly targetLabel: string;
  readonly targetDiscipline: DisciplineId;
  readonly targetChannel: PortChannel;
}

/** A declared coupling that at least one wire in the experiment uses. */
export interface ActiveCoupling {
  readonly coupling: InteractionCoupling;
  readonly links: readonly CouplingLink[];
}

/** Everything the panel needs in order to describe the couplings in play. */
export interface CouplingSummary {
  readonly couplings: readonly ActiveCoupling[];
  /** The disciplines that take part in at least one active coupling. */
  readonly disciplines: readonly DisciplineId[];
  /** How many wires are governed by a named coupling rule. */
  readonly linkCount: number;
}

/**
 * Work out which declared couplings this experiment is using.
 *
 * A wire is governed by a coupling rule when the rule names the disciplines
 * and the channels of that wire. Where more than one rule could match, the
 * most specific one wins — the same rule the kernel itself uses when it
 * resolves a connection.
 */
export function activeCouplings(
  experiment: ExperimentDefinition,
  registry: ComponentRegistry,
): CouplingSummary {
  const byCoupling = new Map<string, ActiveCoupling>();

  for (const connection of experiment.connections) {
    const link = describeLink(connection, experiment, registry);
    if (!link) continue;

    const match = matchCouplingRule(
      link.sourceDiscipline,
      link.sourceChannel,
      link.targetDiscipline,
      link.targetChannel,
    );
    if (!match) continue;

    const existing = byCoupling.get(match.coupling.id);
    byCoupling.set(match.coupling.id, {
      coupling: match.coupling,
      links: existing ? [...existing.links, link] : [link],
    });
  }

  const couplings = [...byCoupling.values()];
  const disciplines = new Set<DisciplineId>();
  let linkCount = 0;
  for (const entry of couplings) {
    linkCount += entry.links.length;
    for (const link of entry.links) {
      disciplines.add(link.sourceDiscipline);
      disciplines.add(link.targetDiscipline);
    }
  }

  return { couplings, disciplines: [...disciplines], linkCount };
}

/**
 * Describe a wire in the terms the panel shows: the names of the parts on
 * either end, the discipline each belongs to, and the channel it carries.
 */
function describeLink(
  connection: Connection,
  experiment: ExperimentDefinition,
  registry: ComponentRegistry,
): CouplingLink | undefined {
  const sourceInstance = experiment.components.find((c) => c.id === connection.source.componentId);
  const targetInstance = experiment.components.find((c) => c.id === connection.target.componentId);
  if (!sourceInstance || !targetInstance) return undefined;

  const sourceDefinition = registry.tryGetDefinition(sourceInstance.type);
  const targetDefinition = registry.tryGetDefinition(targetInstance.type);
  if (!sourceDefinition || !targetDefinition) return undefined;

  const sourcePort = sourceDefinition.ports.find((p) => p.id === connection.source.portId);
  const targetPort = targetDefinition.ports.find((p) => p.id === connection.target.portId);

  return {
    connectionId: connection.id,
    sourceLabel: sourceInstance.label ?? sourceDefinition.name,
    sourceDiscipline: sourceDefinition.discipline,
    sourceChannel: sourcePort?.channel ?? connection.channel,
    targetLabel: targetInstance.label ?? targetDefinition.name,
    targetDiscipline: targetDefinition.discipline,
    targetChannel: targetPort?.channel ?? connection.channel,
  };
}

/** The declared coupling rule that governs a wire, if there is one. */
function matchCouplingRule(
  sourceDiscipline: DisciplineId,
  sourceChannel: PortChannel,
  targetDiscipline: DisciplineId,
  targetChannel: PortChannel,
): { coupling: InteractionCoupling; rule: ConnectionRule } | undefined {
  let best: { coupling: InteractionCoupling; rule: ConnectionRule } | undefined;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const coupling of ALL_COUPLINGS) {
    for (const rule of coupling.rules) {
      if (!ruleMatches(rule, sourceDiscipline, sourceChannel, targetDiscipline, targetChannel)) {
        continue;
      }
      const score = specificity(rule);
      if (score < bestScore) {
        best = { coupling, rule };
        bestScore = score;
      }
    }
  }

  return best;
}

/** Does this rule cover the wire being described? */
function ruleMatches(
  rule: ConnectionRule,
  sourceDiscipline: DisciplineId,
  sourceChannel: PortChannel,
  targetDiscipline: DisciplineId,
  targetChannel: PortChannel,
): boolean {
  return (
    (rule.sourceDiscipline === '*' || rule.sourceDiscipline === sourceDiscipline) &&
    (rule.targetDiscipline === '*' || rule.targetDiscipline === targetDiscipline) &&
    (rule.sourceChannel === '*' || rule.sourceChannel === sourceChannel) &&
    (rule.targetChannel === '*' || rule.targetChannel === targetChannel)
  );
}

/**
 * How many dimensions of the rule are wildcards. Fewer is more specific.
 *
 * This mirrors the kernel's own rule resolution, so the panel names the same
 * rule the simulation actually applies.
 */
function specificity(rule: ConnectionRule): number {
  let score = 0;
  if (rule.sourceDiscipline === '*') score += 1;
  if (rule.targetDiscipline === '*') score += 1;
  if (rule.sourceChannel === '*') score += 1;
  if (rule.targetChannel === '*') score += 1;
  return score;
}
