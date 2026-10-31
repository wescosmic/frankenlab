/**
 * FrankenLab — Component and discipline registry.
 *
 * The registry is the single place that knows which component types exist,
 * what they look like, and how they behave. Everything else — the workbench,
 * the validator, the simulator, the assistant — resolves through it.
 */

import type {
  ComponentBehavior,
  ComponentDefinition,
  ConnectionRule,
  DisciplineEngine,
  DisciplineId,
  PortChannel,
  TransferFunction,
} from './types';
import { areCompatible, dimensionsEqual, dimensionOf } from './units';

export class RegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RegistryError';
  }
}

export class ComponentRegistry {
  readonly #definitions = new Map<string, ComponentDefinition>();
  readonly #behaviors = new Map<string, ComponentBehavior>();
  readonly #disciplines = new Map<DisciplineId, DisciplineEngine>();
  readonly #rules: ConnectionRule[] = [];

  /** Register a discipline engine and everything it supplies. */
  registerEngine(engine: DisciplineEngine): this {
    if (this.#disciplines.has(engine.id)) {
      throw new RegistryError(`Discipline "${engine.id}" is already registered.`);
    }
    for (const definition of engine.components) {
      const existing = this.#definitions.get(definition.type);
      if (existing) {
        throw new RegistryError(
          `Component type "${definition.type}" is already registered by discipline "${existing.discipline}".`,
        );
      }
      if (!engine.behaviors.has(definition.type)) {
        throw new RegistryError(
          `Discipline "${engine.id}" defines component "${definition.type}" but supplies no behaviour for it.`,
        );
      }
      this.#definitions.set(definition.type, definition);
    }
    for (const [type, behavior] of engine.behaviors) {
      this.#behaviors.set(type, behavior);
    }
    this.#disciplines.set(engine.id, engine);
    if (engine.connectionRules) {
      this.#rules.push(...engine.connectionRules);
    }
    return this;
  }

  registerEngineAll(engines: readonly DisciplineEngine[]): this {
    for (const engine of engines) this.registerEngine(engine);
    return this;
  }

  getDefinition(type: string): ComponentDefinition {
    const definition = this.#definitions.get(type);
    if (!definition) {
      throw new RegistryError(`Unknown component type "${type}".`);
    }
    return definition;
  }

  tryGetDefinition(type: string): ComponentDefinition | undefined {
    return this.#definitions.get(type);
  }

  getBehavior(type: string): ComponentBehavior {
    const behavior = this.#behaviors.get(type);
    if (!behavior) {
      throw new RegistryError(`No behaviour registered for component type "${type}".`);
    }
    return behavior;
  }

  getEngine(id: DisciplineId): DisciplineEngine | undefined {
    return this.#disciplines.get(id);
  }

  listDisciplines(): readonly DisciplineEngine[] {
    return [...this.#disciplines.values()];
  }

  listComponents(discipline?: DisciplineId): readonly ComponentDefinition[] {
    const all = [...this.#definitions.values()];
    return discipline ? all.filter((c) => c.discipline === discipline) : all;
  }

  listRules(): readonly ConnectionRule[] {
    return this.#rules;
  }

  /**
   * Find the rule that governs a proposed connection.
   *
   * Matching is by specificity: a rule that names both disciplines beats a
   * wildcard rule. This is what makes an explicit interdisciplinary coupling
   * take precedence over a generic same-channel rule, so the declared
   * coupling is the one that actually governs the link.
   *
   * Returns undefined when the kernel has no defined transfer semantics for
   * the pair. An undefined result is a validation error — never a silent pass.
   */
  findRule(
    source: { discipline: DisciplineId; channel: PortChannel },
    target: { discipline: DisciplineId; channel: PortChannel },
  ): ConnectionRule | undefined {
    const matches = this.#rules.filter(
      (rule) =>
        (rule.sourceChannel === source.channel || rule.sourceChannel === '*') &&
        (rule.targetChannel === target.channel || rule.targetChannel === '*') &&
        (rule.sourceDiscipline === source.discipline || rule.sourceDiscipline === '*') &&
        (rule.targetDiscipline === target.discipline || rule.targetDiscipline === '*'),
    );
    if (matches.length === 0) return undefined;

    // Prefer the most specific rule: fewest wildcard dimensions.
    const specificity = (rule: ConnectionRule): number => {
      let score = 0;
      if (rule.sourceDiscipline === '*') score += 1;
      if (rule.targetDiscipline === '*') score += 1;
      if (rule.sourceChannel === '*') score += 1;
      if (rule.targetChannel === '*') score += 1;
      return score;
    };

    let best = matches[0]!;
    let bestScore = specificity(best);
    for (const rule of matches.slice(1)) {
      const score = specificity(rule);
      if (score < bestScore) {
        best = rule;
        bestScore = score;
      }
    }
    return best;
  }
  /** Validate that a transfer function is dimensionally coherent for a rule. */
  isTransferCompatible(rule: ConnectionRule, sourceUnit: string, targetUnit: string): boolean {
    if (rule.transfer.kind === 'threshold') return areCompatible(sourceUnit, targetUnit);
    if (rule.transfer.kind === 'identity') return areCompatible(sourceUnit, targetUnit);
    // A scale transfer must preserve the dimension — scaling is not converting.
    return areCompatible(sourceUnit, targetUnit);
  }
}

/** Structural check used by the validator and by property-based tests. */
export function portChannelsCompatible(
  sourceUnit: string,
  targetUnit: string,
  sourceChannel: PortChannel,
  targetChannel: PortChannel,
): boolean {
  if (sourceChannel !== targetChannel) return false;
  if (sourceUnit === targetUnit) return true;
  return dimensionsEqual(dimensionOf(sourceUnit), dimensionOf(targetUnit));
}

/** Convenience for building a rule with the default identity transfer. */
export function identityRule(
  sourceDiscipline: DisciplineId | '*',
  targetDiscipline: DisciplineId | '*',
  channel: PortChannel,
  description: string,
  confidence: ConnectionRule['confidence'],
): ConnectionRule {
  return {
    sourceChannel: channel,
    targetChannel: channel,
    transfer: { kind: 'identity' },
    sourceDiscipline,
    targetDiscipline,
    description,
    confidence,
  };
}

export type { TransferFunction };
