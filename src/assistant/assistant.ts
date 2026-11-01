/**
 * FrankenLab — AI Lab Assistant.
 *
 * Three rules govern everything in this file:
 *
 *  1. The assistant never invents a measurement. It is handed a structured
 *     snapshot of the experiment and may only cite values that exist in it.
 *  2. The assistant never claims an experiment ran unless the kernel actually
 *     executed it. Run history is a kernel fact, not a conversational claim.
 *  3. The assistant is not required. If no provider is configured, a
 *     deterministic local explainer answers from the same structured context.
 *
 * The assistant is given tools, but the tools are narrow and every one of them
 * either reads real state or performs a real action on the kernel.
 */

import type { ComponentRegistry } from '../kernel/registry';
import { validateExperiment } from '../kernel/validate';
import type {
  ComponentDefinition,
  ConfidenceLevel,
  ExperimentDefinition,
  SimulationResult,
} from '../kernel/types';
import { formatQuantity } from '../kernel/units';
import { ALL_COUPLINGS } from '../interactions/couplings';

/** The structured context handed to the assistant on every turn. */
export interface AssistantContext {
  readonly experiment: ExperimentDefinition;
  readonly components: readonly ComponentDefinition[];
  readonly latestResult?: SimulationResult;
  readonly runCount: number;
  readonly validations: readonly { readonly code: string; readonly message: string }[];
}

export interface AssistantMessage {
  readonly role: 'user' | 'assistant';
  readonly content: string;
  /**
   * The confidence of the weakest model behind an assistant reply.
   *
   * Set by the trust guard, so the panel can show it without reading the
   * text. Absent on user messages.
   */
  readonly confidence?: ConfidenceLevel;
}

/** A tool the assistant may call. */
export interface AssistantTool {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, unknown>;
}

/** The result of a tool invocation. */
export interface ToolResult {
  readonly ok: boolean;
  readonly data: unknown;
  readonly error?: string;
}

/** The contract a language-model provider must satisfy. */
export interface LlmProvider {
  readonly id: string;
  readonly name: string;
  /** Whether this provider can currently be called. */
  isAvailable(): boolean;
  /**
   * Produce a reply given the conversation, the structured context and the
   * tools available.
   */
  respond(input: {
    readonly messages: readonly AssistantMessage[];
    readonly context: AssistantContext;
    readonly tools: readonly AssistantTool[];
    readonly signal?: AbortSignal;
  }): Promise<string>;
}

/**
 * The deterministic local explainer.
 *
 * This is not a placeholder. It answers real questions from real state by
 * reading the structured context, and it is the thing that guarantees the
 * product works with no network, no API key and no provider configured.
 */
export class LocalExplainProvider implements LlmProvider {
  readonly id = 'local-explain';
  readonly name = 'Local deterministic explainer';

  isAvailable(): boolean {
    return true;
  }

  async respond(input: {
    readonly messages: readonly AssistantMessage[];
    readonly context: AssistantContext;
  }): Promise<string> {
    const question = [...input.messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    return explainLocally(question, input.context);
  }
}

/**
 * Build the tool set.
 *
 * Only tools that are reliably executable are exposed. `compare_experiments`
 * and `modify_parameter` are deliberately absent from the MVP — the first
 * needs run history the kernel does not yet persist, the second needs an
 * undo model that does not exist yet. Adding a tool is a one-line change
 * once its prerequisites exist; shipping a tool that lies is not acceptable.
 */
export function buildAssistantTools(): AssistantTool[] {
  return [
    {
      name: 'inspect_experiment',
      description:
        'Return the full structure of the active experiment: components, connections, environment and configuration.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'inspect_component',
      description:
        'Return the definition of one component type: its ports, parameters, confidence level and stated assumptions.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Component type id, e.g. biology.plant' },
        },
        required: ['type'],
      },
    },
    {
      name: 'validate_connections',
      description:
        'Re-run connection validation and return any blocking problems or warnings.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'retrieve_observations',
      description:
        'Return the observations and measurements recorded by the most recent simulation run.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'explain_confidence',
      description:
        'Return the confidence classification of every component in the experiment, with its assumptions.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  ];
}

/**
 * Execute a tool against the kernel.
 *
 * Every branch reads real state. There is no path here that returns an
 * invented number.
 */
export function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  context: AssistantContext,
  registry: ComponentRegistry,
): ToolResult {
  switch (toolName) {
    case 'inspect_experiment': {
      const experiment = context.experiment;
      return {
        ok: true,
        data: {
          id: experiment.id,
          name: experiment.name,
          description: experiment.description,
          discipline: experiment.discipline,
          tags: experiment.tags,
          dt: experiment.dt,
          duration: experiment.duration,
          seed: experiment.seed,
          modelVersion: experiment.modelVersion,
          components: experiment.components.map((c) => ({
            id: c.id,
            type: c.type,
            label: c.label ?? c.id,
            parameters: c.parameters,
          })),
          connections: experiment.connections.map((c) => ({
            id: c.id,
            from: `${c.source.componentId}.${c.source.portId}`,
            to: `${c.target.componentId}.${c.target.portId}`,
            channel: c.channel,
            transfer: c.transfer,
          })),
          environment: experiment.environment.variables.map((v) => ({
            id: v.id,
            label: v.label,
            value: v.value,
          })),
        },
      };
    }

    case 'inspect_component': {
      const type = args['type'];
      if (typeof type !== 'string') {
        return { ok: false, data: null, error: 'inspect_component requires a "type" argument.' };
      }
      const definition = registry.tryGetDefinition(type);
      if (!definition) {
        return { ok: false, data: null, error: `Unknown component type "${type}".` };
      }
      return {
        ok: true,
        data: {
          type: definition.type,
          name: definition.name,
          discipline: definition.discipline,
          description: definition.description,
          confidence: definition.confidence,
          assumptions: definition.assumptions,
          ports: definition.ports.map((p) => ({
            id: p.id,
            label: p.label,
            direction: p.direction,
            channel: p.channel,
            unit: p.unit,
            required: p.required,
          })),
          parameters: definition.parameters.map((p) => ({
            id: p.id,
            label: p.label,
            unit: p.unit ?? null,
            defaultValue: p.defaultValue,
            min: p.min ?? null,
            max: p.max ?? null,
            description: p.description,
          })),
        },
      };
    }

    case 'validate_connections': {
      const validation = validateForAssistant(context, registry);
      return {
        ok: true,
        data: {
          valid: validation.valid,
          issues: validation.issues.map((i) => ({
            severity: i.severity,
            code: i.code,
            message: i.message,
          })),
        },
      };
    }

    case 'retrieve_observations': {
      const result = context.latestResult;
      if (!result) {
        return {
          ok: true,
          data: {
            hasRun: false,
            message:
              'No simulation has been run yet. Run the experiment before asking about results.',
          },
        };
      }
      return {
        ok: true,
        data: {
          hasRun: true,
          runCount: context.runCount,
          success: result.success,
          modelVersion: result.modelVersion,
          seed: result.seed,
          durationSeconds: result.durationSeconds,
          steps: result.steps,
          measurements: Object.fromEntries(
            Object.entries(result.measurements).map(([k, v]) => [k, formatQuantity(v)]),
          ),
          observations: result.observations.map((o) => ({
            time: o.time,
            severity: o.severity,
            code: o.code,
            message: o.message,
          })),
          dataPointCount: result.dataPoints.length,
        },
      };
    }

    case 'explain_confidence': {
      return {
        ok: true,
        data: context.components.map((c) => ({
          type: c.type,
          name: c.name,
          discipline: c.discipline,
          confidence: c.confidence,
          assumptions: c.assumptions,
        })),
      };
    }

    default:
      return { ok: false, data: null, error: `Unknown tool "${toolName}".` };
  }
}

function validateForAssistant(context: AssistantContext, registry: ComponentRegistry) {
  return validateExperiment(context.experiment, registry);
}

/**
 * The deterministic local answer.
 *
 * Reads the question, picks a strategy, and answers from real state.
 */
export function explainLocally(question: string, context: AssistantContext): string {
  const q = question.toLowerCase();

  if (q.includes('confidence') || q.includes('reliable') || q.includes('accurate') || q.includes('trust')) {
    return explainConfidence(context);
  }
  if (q.includes('connect') || q.includes('valid') || q.includes('wrong') || q.includes('broken')) {
    return explainValidation(context);
  }
  if (q.includes('result') || q.includes('happened') || q.includes('measure') || q.includes('output')) {
    return explainResults(context);
  }
  if (
    q.includes('interdisciplin') ||
    q.includes('cross') ||
    q.includes('combine') ||
    q.includes('coupling') ||
    q.includes('interact') ||
    q.includes('disciplin')
  ) {
    return explainCouplings(context);
  }
  if (q.includes('component') || q.includes('part') || q.includes('element')) {
    return explainComponents(context);
  }
  return explainOverview(context);
}

function explainOverview(context: AssistantContext): string {
  const { experiment } = context;
  const disciplines = new Set(
    experiment.components.map((c) => context.components.find((d) => d.type === c.type)?.discipline),
  );
  const named = [...disciplines].filter(Boolean) as string[];

  return [
    `**${experiment.name}** — ${experiment.description}`,
    '',
    `This experiment connects ${experiment.components.length} components across ${named.length} discipline${named.length === 1 ? '' : 's'}: ${named.join(', ')}.`,
    `It runs for ${formatQuantity({ value: experiment.duration, unit: 's' })} in steps of ${formatQuantity({ value: experiment.dt, unit: 's' })}, with seed ${experiment.seed}.`,
    context.runCount === 0
      ? 'No simulation has been run yet. Run the experiment to see measurements.'
      : `It has been run ${context.runCount} time${context.runCount === 1 ? '' : 's'}.`,
    '',
    'Ask me about the components, the connections, the confidence of the models, or the results.',
  ].join('\n');
}

function explainComponents(context: AssistantContext): string {
  const lines = context.experiment.components.map((instance) => {
    const definition = context.components.find((d) => d.type === instance.type);
    if (!definition) return `- \`${instance.id}\`: unknown type \`${instance.type}\``;
    const keyParams = definition.parameters
      .filter((p) => p.kind === 'number' && p.unit)
      .slice(0, 3)
      .map((p) => {
        const supplied = instance.parameters[p.id];
        const value = supplied?.value ?? p.defaultValue;
        const unit = supplied?.unit ?? p.unit ?? '';
        return `${p.label} ${value}${unit ? ` ${unit}` : ''}`;
      });
    return [
      `- **${instance.label ?? definition.name}** (${definition.discipline}) — ${definition.description}`,
      keyParams.length ? `  - ${keyParams.join(', ')}` : '',
      `  - Confidence: *${definition.confidence}*`,
    ]
      .filter(Boolean)
      .join('\n');
  });

  return ['**Components in this experiment**', '', ...lines].join('\n');
}

function explainValidation(context: AssistantContext): string {
  const errors = context.validations.filter((v) => v.code.includes('error') || v.code.includes('no-') || v.code.includes('invalid'));
  if (context.validations.length === 0) {
    return 'Every connection in this experiment is valid. There are no blocking problems.';
  }
  return [
    '**Connection validation**',
    '',
    ...context.validations.map((v) => `- ${v.message}`),
    '',
    errors.length
      ? 'The simulation cannot run until the blocking problems above are fixed.'
      : 'These are warnings only — the simulation can run.',
  ].join('\n');
}

function explainResults(context: AssistantContext): string {
  const result = context.latestResult;
  if (!result) {
    return [
      'No simulation has been run yet, so there are no measurements to interpret.',
      '',
      'Run the experiment first. I will only report values that the simulation actually produced.',
    ].join('\n');
  }

  const measurements = Object.entries(result.measurements);
  const observations = result.observations;

  const lines = [
    `**Results from the most recent run** (seed ${result.seed}, model ${result.modelVersion}, ${result.steps} steps)`,
    '',
    measurements.length
      ? 'Measurements:'
      : 'The run produced no output measurements.',
    ...measurements.slice(0, 14).map(([key, value]) => `- \`${key}\`: ${formatQuantity(value)}`),
  ];

  if (observations.length) {
    lines.push('', 'Observations:', ...observations.map((o) => `- ${o.message}`));
  }

  lines.push(
    '',
    'Every value above came from the simulation kernel. I have not estimated or inferred any of them.',
  );

  return lines.join('\n');
}

function explainConfidence(context: AssistantContext): string {
  const lines = context.components.map((definition) => {
    const instances = context.experiment.components
      .filter((c) => c.type === definition.type)
      .map((c) => c.label ?? c.id);
    return [
      `- **${definition.name}** (${definition.discipline}) — *${definition.confidence}*`,
      instances.length ? `  - Used by: ${instances.join(', ')}` : '  - Not used in this experiment.',
      ...definition.assumptions.slice(0, 2).map((a) => `  - ${a}`),
    ].join('\n');
  });

  return [
    '**How much to trust each model**',
    '',
    'FrankenLab labels every component with a confidence level. These are the labels used here:',
    '',
    '- `physical-law` — conserved and independently verifiable.',
    '- `established-simplified` — an established model simplified for teaching.',
    '- `illustrative` — qualitative; directionally meaningful, not quantitatively predictive.',
    '- `hypothetical` — speculative by design.',
    '',
    ...lines,
  ].join('\n');
}

function explainCouplings(context: AssistantContext): string {
  const disciplines = new Set(
    context.experiment.components.map((c) => context.components.find((d) => d.type === c.type)?.discipline),
  );
  const relevant = ALL_COUPLINGS.filter((c) =>
    c.disciplines.some((d) => disciplines.has(d)),
  );

  const lines = relevant.map((coupling) => [
    `### ${coupling.name}`,
    '',
    coupling.chain,
    '',
    ...coupling.notes.map((n) => `- ${n}`),
  ].join('\n'));

  return [
    '**How the disciplines interact here**',
    '',
    ...lines,
  ].join('\n');
}

/**
 * Guard against unsupported numeric claims.
 *
 * A response that mentions a measurement must only mention measurements that
 * exist in the result. Used by the provider layer and by the test suite.
 *
 * The implementation lives in the trust guard, because the guard and this
 * check have to agree on what "a number the experiment contains" means.
 */
export { findUnsupportedNumbers } from './trust';
