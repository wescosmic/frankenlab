/**
 * FrankenLab — AI assistant tests.
 *
 * The assistant's credibility rests on one thing: it must not invent numbers.
 * Every tool must read real kernel state, and the local explainer must answer
 * from the experiment it was given.
 */

import { describe, expect, it } from 'vitest';
import { createTestRegistry } from './world';
import { createBioCircuit } from '../src/scenarios/biocircuit';
import { Simulation } from '../src/kernel/simulator';
import {
  LocalExplainProvider,
  buildAssistantTools,
  executeTool,
  explainLocally,
  findUnsupportedNumbers,
  type AssistantContext,
} from '../src/assistant/assistant';

const registry = createTestRegistry();

function makeContext(): AssistantContext {
  const experiment = createBioCircuit();
  const latestResult = new Simulation(experiment, registry).run();

  return {
    experiment,
    components: experiment.components.map(
      (c) => registry.getDefinition(c.type),
    ),
    latestResult,
    runCount: 1,
    validations: [],
  };
}

describe('the tool set', () => {
  it('exposes only tools that can be executed reliably', () => {
    const names = buildAssistantTools().map((t) => t.name);

    expect(names).toContain('inspect_experiment');
    expect(names).toContain('inspect_component');
    expect(names).toContain('validate_connections');
    expect(names).toContain('retrieve_observations');
    expect(names).toContain('explain_confidence');

    // These need an undo model and a run history the kernel does not have.
    expect(names).not.toContain('modify_parameter');
    expect(names).not.toContain('compare_experiments');
  });

  it('gives every tool a description and a parameter schema', () => {
    for (const tool of buildAssistantTools()) {
      expect(tool.description.length).toBeGreaterThan(20);
      expect(tool.parameters).toHaveProperty('type');
    }
  });
});

describe('tool execution', () => {
  const context = makeContext();

  it('reports the real structure of the experiment', () => {
    const result = executeTool('inspect_experiment', {}, context, registry);
    expect(result.ok).toBe(true);

    const data = result.data as {
      components: { id: string; type: string }[];
      connections: { from: string; to: string }[];
    };
    expect(data.components).toHaveLength(context.experiment.components.length);
    expect(data.connections).toHaveLength(context.experiment.connections.length);
    expect(data.components.map((c) => c.id)).toContain('sensor');
  });

  it('returns a component\'s confidence and assumptions', () => {
    const result = executeTool(
      'inspect_component',
      { type: 'electronics.sensor' },
      context,
      registry,
    );
    expect(result.ok).toBe(true);

    const data = result.data as { confidence: string; assumptions: string[]; ports: unknown[] };
    expect(data.confidence).toBe('established-simplified');
    expect(data.assumptions.length).toBeGreaterThan(0);
    expect(data.ports.length).toBeGreaterThan(0);
  });

  it('fails cleanly on an unknown component type', () => {
    const result = executeTool(
      'inspect_component',
      { type: 'not.a.component' },
      context,
      registry,
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/unknown/i);
  });

  it('reports the real validation result', () => {
    const result = executeTool('validate_connections', {}, context, registry);
    expect(result.ok).toBe(true);
    const data = result.data as { valid: boolean };
    expect(data.valid).toBe(true);
  });

  it('returns the real measurements from the last run', () => {
    const result = executeTool('retrieve_observations', {}, context, registry);
    expect(result.ok).toBe(true);

    const data = result.data as {
      hasRun: boolean;
      measurements: Record<string, string>;
    };
    expect(data.hasRun).toBe(true);
    // Measurements are handed to the model as formatted strings so a number
    // can never be misread as a different quantity.
    expect(typeof data.measurements['substrate.moisture']).toBe('string');
    expect(Number.parseFloat(data.measurements['substrate.moisture']!)).toBeGreaterThan(0);
    expect(data.measurements['sensor.signal']).toBeDefined();
  });

  it('never reports a run that did not happen', () => {
    const withoutRun: AssistantContext = { ...makeContext(), latestResult: undefined };
    const result = executeTool('retrieve_observations', {}, withoutRun, registry);

    // The tool succeeds, but it says plainly that there is nothing to report
    // rather than returning an empty measurement set that looks like a result.
    expect(result.ok).toBe(true);
    const data = result.data as { hasRun: boolean; message: string; measurements?: unknown };
    expect(data.hasRun).toBe(false);
    expect(data.message).toMatch(/no simulation/i);
    expect(data.measurements).toBeUndefined();
  });
});

describe('the local explainer', () => {
  const context = makeContext();

  it('answers about the experiment from its own state', () => {
    const answer = explainLocally('What is this experiment?', context);
    expect(answer).toMatch(/BioCircuit/i);
    expect(answer.length).toBeGreaterThan(40);
  });

  it('explains the components and their confidence', () => {
    const answer = explainLocally('Explain the components', context);
    expect(answer).toMatch(/confidence|established|illustrative|hypothetical/i);
  });

  it('reports the real measurements when asked about results', () => {
    const answer = explainLocally('What happened in the results?', context);
    expect(answer).toMatch(/moisture/i);
  });

  it('names the interdisciplinary couplings', () => {
    const answer = explainLocally('How do the disciplines interact?', context);
    expect(answer.length).toBeGreaterThan(40);
  });

  it('works with no provider and no network', async () => {
    const provider = new LocalExplainProvider();
    expect(provider.isAvailable()).toBe(true);

    const reply = await provider.respond({
      messages: [{ role: 'user', content: 'What is this experiment?' }],
      context,
    });
    expect(reply.length).toBeGreaterThan(40);
  });
});

describe('the ungrounded-number guard', () => {
  it('flags a number the experiment does not contain', () => {
    const context = makeContext();
    const result = context.latestResult!;
    const real = result.measurements['substrate.moisture']!.value;

    const flagged = findUnsupportedNumbers(`The moisture is ${real.toFixed(4)}.`, context);
    expect(flagged).toEqual([]);

    const invented = findUnsupportedNumbers('The moisture is 87.5 %.', context);
    expect(invented.length).toBeGreaterThan(0);
  });
});
