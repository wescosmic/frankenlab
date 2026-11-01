/**
 * FrankenLab — trust guard tests.
 *
 * The guard is the last thing between a plausible-sounding answer and a
 * number the simulation never produced. These tests check the two things it
 * promises: that an answer says what it is worth trusting for, and that it
 * cannot cite a number the experiment does not contain.
 */

import { describe, expect, it } from 'vitest';
import { createTestRegistry } from './world';
import { createBioCircuit } from '../src/scenarios/biocircuit';
import { createCatalysis } from '../src/scenarios/catalysis';
import { Simulation } from '../src/kernel/simulator';
import { explainLocally, type AssistantContext } from '../src/assistant/assistant';
import { guardResponse, summariseTrust } from '../src/assistant/trust';

const registry = createTestRegistry();

function makeContext(experiment = createBioCircuit()): AssistantContext {
  const latestResult = new Simulation(experiment, registry).run();
  return {
    experiment,
    components: experiment.components.map((instance) => registry.getDefinition(instance.type)),
    latestResult,
    runCount: 1,
    validations: [],
  };
}

describe('the trust summary', () => {
  it('is set by the weakest model on the bench', () => {
    const trust = summariseTrust(makeContext());

    // The irrigation source is the illustrative model in the flagship.
    expect(trust.level).toBe('illustrative');
    expect(trust.weakest.map((model) => model.type)).toContain('biology.moisture-source');
  });

  it('ignores models that are not in the experiment', () => {
    // The catalysis experiment has no irrigation and no plant, so the
    // flagship's illustrative model cannot weaken it.
    const trust = summariseTrust(makeContext(createCatalysis()));

    expect(trust.level).toBe('established-simplified');
    expect(trust.disciplines).toEqual(['chemistry']);
  });

  it('names the disciplines the experiment uses', () => {
    const trust = summariseTrust(makeContext());
    expect(trust.disciplines).toEqual(['biology', 'electronics', 'materials']);
  });
});

describe('the guard', () => {
  it('ends every answer with what to trust', () => {
    const context = makeContext();
    const guarded = guardResponse('The plant is doing fine.', context);

    expect(guarded.text).toMatch(/what to trust here/i);
    expect(guarded.text).toMatch(/illustrative/i);
    expect(guarded.text).toMatch(/irrigation/i);
  });

  it('removes a number the simulation did not produce', () => {
    const context = makeContext();
    const guarded = guardResponse('The medium reached 87.5 % by the end.', context);

    expect(guarded.removed).toContain('87.5');
    // The number no longer stands as a claim about the experiment.
    expect(guarded.text).toMatch(/reached \[not a measured value\] %/);
    // The removal is stated, not hidden — the reader is told which number
    // went and why.
    expect(guarded.text).toMatch(/removed 1 number/i);
    expect(guarded.text).toMatch(/`87\.5`/);
  });

  it('leaves a real measurement alone', () => {
    const context = makeContext();
    const signal = context.latestResult!.measurements['sensor.signal']!.value;

    const guarded = guardResponse(`The probe reads ${signal.toFixed(2)}.`, context);

    expect(guarded.removed).toEqual([]);
    expect(guarded.text).toMatch(new RegExp(signal.toFixed(2)));
  });

  it('allows a real number restated with fewer digits', () => {
    const context = makeContext();
    const signal = context.latestResult!.measurements['sensor.signal']!.value;

    const guarded = guardResponse(`The probe reads ${signal.toFixed(1)}.`, context);

    expect(guarded.removed).toEqual([]);
  });

  it('leaves the local explainer\'s own answers untouched', () => {
    const context = makeContext();

    for (const question of [
      'What is this experiment?',
      'What happened in the results?',
      'How much should I trust these models?',
      'How do the disciplines interact?',
      'Explain the components',
      'Is the wiring valid?',
    ]) {
      const answer = explainLocally(question, context);
      const guarded = guardResponse(answer, context);
      expect(guarded.removed, `the guard removed something from "${question}"`).toEqual([]);
    }
  });

  it('still answers when the experiment has not been run', () => {
    const experiment = createBioCircuit();
    const context: AssistantContext = {
      experiment,
      components: experiment.components.map((instance) => registry.getDefinition(instance.type)),
      latestResult: undefined,
      runCount: 0,
      validations: [],
    };

    const guarded = guardResponse('Nothing has run yet.', context);

    expect(guarded.text).toMatch(/what to trust here/i);
    expect(guarded.removed).toEqual([]);
  });
});
