/**
 * FrankenLab — the assistant trust guard.
 *
 * Two jobs, and both of them are about not overclaiming.
 *
 *  1. Every answer ends with what to trust. The confidence of an experiment is
 *     the confidence of its weakest model, and the answer says so in plain
 *     English, naming the component that sets the limit.
 *
 *  2. Every answer may only cite numbers the experiment contains. A number the
 *     simulation did not produce is removed from the reply, and the removal is
 *     stated rather than hidden.
 *
 * The guard runs on every reply, whoever wrote it. That is the point: a
 * provider that invents a measurement is caught by the same code that checks
 * the local explainer, so the guarantee does not depend on which provider is
 * configured.
 */

import type { ConfidenceLevel, Quantity } from '../kernel/types';
import type { AssistantContext } from './assistant';
import { CONFIDENCE_LABEL, CONFIDENCE_NOTE, CONFIDENCE_ORDER } from '../confidence';

// The confidence vocabulary lives in one place, because four different panels
// show it and a label that drifts between them is a label that lies.
export { CONFIDENCE_LABEL, CONFIDENCE_NOTE, CONFIDENCE_ORDER } from '../confidence';

/** A component that sets the confidence limit of the experiment. */
export interface WeakestModel {
  readonly type: string;
  readonly name: string;
  readonly discipline: string;
}

export interface TrustSummary {
  /** The confidence of the weakest model in the experiment. */
  readonly level: ConfidenceLevel;
  /** The components at that level. */
  readonly weakest: readonly WeakestModel[];
  /** Every discipline the experiment uses. */
  readonly disciplines: readonly string[];
}

/**
 * Work out what to trust in this experiment.
 *
 * The experiment is only as trustworthy as its weakest model, so the guard
 * reports the lowest confidence among the components actually on the bench —
 * not the lowest in the whole catalogue. A component the user has not used
 * cannot weaken their experiment.
 */
export function summariseTrust(context: AssistantContext): TrustSummary {
  const usedTypes = new Set(context.experiment.components.map((instance) => instance.type));
  const used = context.components.filter((definition) => usedTypes.has(definition.type));

  if (used.length === 0) {
    return { level: 'hypothetical', weakest: [], disciplines: [] };
  }

  let level: ConfidenceLevel = 'physical-law';
  for (const definition of used) {
    if (CONFIDENCE_ORDER.indexOf(definition.confidence) > CONFIDENCE_ORDER.indexOf(level)) {
      level = definition.confidence;
    }
  }

  const weakest = used
    .filter((definition) => definition.confidence === level)
    .map((definition) => {
      // Name the part the way the user sees it on the bench. "Irrigation" is
      // more use to someone reading an answer than "Moisture source" is.
      const instances = context.experiment.components.filter(
        (instance) => instance.type === definition.type,
      );
      return {
        type: definition.type,
        name: instances.map((instance) => instance.label ?? definition.name).join(', '),
        discipline: definition.discipline,
      };
    });

  const disciplines = [...new Set(used.map((definition) => definition.discipline))].sort();

  return { level, weakest, disciplines };
}

/**
 * Every number the experiment contains.
 *
 * A reply may cite any of these and nothing else. Values are collected raw
 * and rounded, because a real number may legitimately be restated with fewer
 * digits — 0.9091 is still 0.909 — but a number the experiment never
 * produced is not allowed through.
 */
export function collectAllowedNumbers(context: AssistantContext): Set<number> {
  const allowed = new Set<number>();

  const add = (value: number): void => {
    if (Number.isFinite(value)) allowed.add(value);
  };

  const addQuantity = (quantity: Quantity): void => {
    add(quantity.value);
    add(Number(quantity.value.toFixed(2)));
  };

  const result = context.latestResult;
  if (result) {
    for (const value of Object.values(result.measurements)) addQuantity(value);
    for (const point of result.dataPoints) {
      for (const value of Object.values(point.values)) addQuantity(value);
    }
    for (const observation of result.observations) add(observation.time);
    add(result.seed);
    add(result.steps);
    add(result.durationSeconds);
  }

  const experiment = context.experiment;
  add(experiment.seed);
  add(experiment.dt);
  add(experiment.duration);
  add(experiment.components.length);
  add(experiment.connections.length);

  for (const variable of experiment.environment.variables) {
    addQuantity(variable.value);
    add(variable.min.value);
    add(variable.max.value);
  }

  for (const instance of experiment.components) {
    for (const parameter of Object.values(instance.parameters)) {
      if (typeof parameter.value === 'number') add(parameter.value);
    }
  }

  for (const definition of context.components) {
    for (const parameter of definition.parameters) {
      if (typeof parameter.defaultValue === 'number') add(parameter.defaultValue);
      if (typeof parameter.min === 'number') add(parameter.min);
      if (typeof parameter.max === 'number') add(parameter.max);
    }
  }

  return allowed;
}

/**
 * Find numbers in a reply that the experiment does not contain.
 *
 * A bare integer at or below 1 is left alone: "day 1", "one step" and "two
 * moles" are far more likely to be writing than a measurement. A decimal is
 * not: "0.75" reads as a measurement, so it has to be one the simulation
 * actually produced, however small it is.
 */
export function findUnsupportedNumbers(
  response: string,
  context: AssistantContext,
): string[] {
  const allowed = collectAllowedNumbers(context);

  const candidates = response.match(/-?\d+(?:\.\d+)?/g) ?? [];
  const suspicious = candidates.filter((token) => {
    const numeric = Number(token);
    if (!Number.isFinite(numeric)) return false;
    if (Math.abs(numeric) <= 1 && !token.includes('.')) return false;
    // A real number may be restated with fewer digits.
    for (const value of allowed) {
      if (Math.abs(numeric - value) <= 5e-4 * Math.max(1, Math.abs(value))) return false;
    }
    return true;
  });

  return [...new Set(suspicious)];
}

export interface GuardResult {
  /** The reply, with unsupported numbers removed and the trust footer added. */
  readonly text: string;
  /** The numbers that were removed. */
  readonly removed: readonly string[];
  /** What the answer is worth trusting for. */
  readonly trust: TrustSummary;
}

/**
 * Put an answer through the guard.
 *
 * The numbers come out first, so the reader sees the correction before the
 * answer rather than buried under it.
 */
export function guardResponse(response: string, context: AssistantContext): GuardResult {
  const trust = summariseTrust(context);
  const removed = findUnsupportedNumbers(response, context);

  let text = response;
  for (const token of removed) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
    text = text.replace(new RegExp(`(?<![\\w.])${escaped}(?![\\w.])`, 'g'), '[not a measured value]');
  }

  const notes: string[] = [];
  if (removed.length > 0) {
    notes.push(
      `I removed ${removed.length} number${removed.length === 1 ? '' : 's'} the simulation did not produce: ${removed
        .map((token) => `\`${token}\``)
        .join(', ')}.`,
    );
  }

  const weakestNames = trust.weakest.map((model) => model.name);
  const who =
    weakestNames.length === 0
      ? 'the models in this experiment'
      : weakestNames.join(', ');

  notes.push(
    `**What to trust here:** the weakest model on the bench is **${CONFIDENCE_LABEL[trust.level]}** (${who}). ${CONFIDENCE_NOTE[trust.level]}`,
  );

  return {
    text: `${text}\n\n---\n\n${notes.join('\n\n')}`,
    removed,
    trust,
  };
}
