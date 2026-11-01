/**
 * FrankenLab — Experiment validation.
 *
 * Validation runs before every simulation. It is not a formality: an invalid
 * connection must produce a clear, designed explanation in the UI rather than
 * a wrong number later. A failed validation is a demo beat, not an error state.
 */

import type { ComponentRegistry } from './registry';
import type {
  ComponentInstance,
  Connection,
  Environment,
  ExperimentDefinition,
  ValidationIssue,
  ValidationResult,
} from './types';

const MAX_CONNECTION_ERRORS = 50;

export function validateExperiment(
  experiment: ExperimentDefinition,
  registry: ComponentRegistry,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  validateComponents(experiment, registry, issues);
  validateConnections(experiment, registry, issues);
  validateEnvironment(experiment.environment, issues);
  validateTiming(experiment, issues);

  return {
    valid: !issues.some((i) => i.severity === 'error'),
    issues,
  };
}

function validateComponents(
  experiment: ExperimentDefinition,
  registry: ComponentRegistry,
  issues: ValidationIssue[],
): void {
  const seen = new Set<string>();

  for (const instance of experiment.components) {
    if (seen.has(instance.id)) {
      issues.push({
        severity: 'error',
        code: 'duplicate-component-id',
        message: `Component id "${instance.id}" appears more than once.`,
        componentId: instance.id,
      });
      continue;
    }
    seen.add(instance.id);

    const definition = registry.tryGetDefinition(instance.type);
    if (!definition) {
      issues.push({
        severity: 'error',
        code: 'unknown-component-type',
        message: `Component "${instance.id}" has unknown type "${instance.type}".`,
        componentId: instance.id,
      });
      continue;
    }

    for (const parameter of definition.parameters) {
      const supplied = instance.parameters[parameter.id];
      if (supplied === undefined) {
        issues.push({
          severity: 'warning',
          code: 'parameter-at-default',
          message: `Component "${instance.id}" leaves "${parameter.label}" at its default value.`,
          componentId: instance.id,
        });
        continue;
      }
      if (parameter.kind === 'number' && typeof supplied.value === 'number') {
        if (parameter.min !== undefined && supplied.value < parameter.min) {
          issues.push({
            severity: 'error',
            code: 'parameter-below-range',
            message: `${definition.name}: "${parameter.label}" is ${supplied.value}, below the minimum of ${parameter.min}.`,
            componentId: instance.id,
          });
        }
        if (parameter.max !== undefined && supplied.value > parameter.max) {
          issues.push({
            severity: 'error',
            code: 'parameter-above-range',
            message: `${definition.name}: "${parameter.label}" is ${supplied.value}, above the maximum of ${parameter.max}.`,
            componentId: instance.id,
          });
        }
        if (parameter.unit && supplied.unit && parameter.unit !== supplied.unit) {
          issues.push({
            severity: 'warning',
            code: 'parameter-unit-mismatch',
            message: `${definition.name}: "${parameter.label}" is supplied in "${supplied.unit}" but defined in "${parameter.unit}".`,
            componentId: instance.id,
          });
        }
      }
      if (parameter.kind === 'enum' && typeof supplied.value === 'string') {
        if (parameter.options && !parameter.options.includes(supplied.value)) {
          issues.push({
            severity: 'error',
            code: 'parameter-invalid-option',
            message: `${definition.name}: "${parameter.label}" has unsupported option "${supplied.value}".`,
            componentId: instance.id,
          });
        }
      }
    }
  }
}

function validateConnections(
  experiment: ExperimentDefinition,
  registry: ComponentRegistry,
  issues: ValidationIssue[],
): void {
  const byId = new Map<string, ComponentInstance>(
    experiment.components.map((c) => [c.id, c]),
  );

  for (const connection of experiment.connections) {
    if (issues.length > MAX_CONNECTION_ERRORS) break;
    checkConnection(connection, byId, registry, issues);
  }

  // Required ports must be connected.
  for (const instance of experiment.components) {
    const definition = registry.tryGetDefinition(instance.type);
    if (!definition) continue;
    const connectedTargets = new Set(
      experiment.connections.map((c) => `${c.target.componentId}:${c.target.portId}`),
    );
    for (const port of definition.ports) {
      if (port.direction === 'output' || !port.required) continue;
      if (!connectedTargets.has(`${instance.id}:${port.id}`)) {
        issues.push({
          severity: 'warning',
          code: 'required-port-unconnected',
          message: `${definition.name}: "${port.label}" is not connected.`,
          componentId: instance.id,
        });
      }
    }
  }
}

/**
 * Check one connection and report what is wrong with it.
 *
 * Both the whole-experiment validation and the workbench's live wiring use
 * this, so a connection refused on the bench is refused for exactly the same
 * reason as one that would fail a run. The two can never disagree.
 */
function checkConnection(
  connection: Connection,
  byId: Map<string, ComponentInstance>,
  registry: ComponentRegistry,
  issues: ValidationIssue[],
): void {
  const sourceInstance = byId.get(connection.source.componentId);
  const targetInstance = byId.get(connection.target.componentId);

  if (!sourceInstance || !targetInstance) {
    issues.push({
      severity: 'error',
      code: 'connection-dangling',
      message: 'A wire refers to a part that is not on the bench.',
      connectionId: connection.id,
    });
    return;
  }

  const sourceDefinition = registry.tryGetDefinition(sourceInstance.type);
  const targetDefinition = registry.tryGetDefinition(targetInstance.type);

  if (!sourceDefinition || !targetDefinition) return;

  const sourcePort = sourceDefinition.ports.find((p) => p.id === connection.source.portId);
  const targetPort = targetDefinition.ports.find((p) => p.id === connection.target.portId);

  if (!sourcePort) {
    issues.push({
      severity: 'error',
      code: 'unknown-source-port',
      message: `${sourceDefinition.name} has no port called "${connection.source.portId}".`,
      connectionId: connection.id,
    });
    return;
  }
  if (!targetPort) {
    issues.push({
      severity: 'error',
      code: 'unknown-target-port',
      message: `${targetDefinition.name} has no port called "${connection.target.portId}".`,
      connectionId: connection.id,
    });
    return;
  }

  if (sourcePort.direction === 'input') {
    issues.push({
      severity: 'error',
      code: 'source-port-is-input',
      message: `"${sourcePort.label}" is an input on ${sourceDefinition.name}, so nothing comes out of it.`,
      connectionId: connection.id,
    });
  }
  if (targetPort.direction === 'output') {
    issues.push({
      severity: 'error',
      code: 'target-port-is-output',
      message: `"${targetPort.label}" is an output on ${targetDefinition.name}, so nothing goes into it.`,
      connectionId: connection.id,
    });
  }

  const rule = registry.findRule(
    { discipline: sourceDefinition.discipline, channel: sourcePort.channel },
    { discipline: targetDefinition.discipline, channel: targetPort.channel },
  );

  if (!rule) {
    const crossDiscipline = sourceDefinition.discipline !== targetDefinition.discipline;
    issues.push({
      severity: 'error',
      code: crossDiscipline ? 'no-interdisciplinary-rule' : 'no-connection-rule',
      message: crossDiscipline
        ? `No defined transfer exists from ${sourceDefinition.name} (${sourcePort.channel}) to ${targetDefinition.name} (${targetPort.channel}). These disciplines cannot be coupled directly.`
        : `No defined transfer exists from "${sourcePort.label}" to "${targetPort.label}".`,
      connectionId: connection.id,
    });
    return;
  }

  if (!registry.isTransferCompatible(rule, sourcePort.unit, targetPort.unit)) {
    issues.push({
      severity: 'error',
      code: 'incompatible-units',
      message: `"${sourcePort.label}" (${sourcePort.unit}) cannot drive "${targetPort.label}" (${targetPort.unit}) — incompatible physical dimensions.`,
      connectionId: connection.id,
    });
  }

  // A cross-discipline coupling is allowed to change the semantic channel
  // (a moisture reading can legitimately become a normalised electrical
  // signal). What matters is that a rule explicitly sanctions the pair,
  // which `findRule` above has already established.
  if (sourcePort.channel !== targetPort.channel && rule.sourceChannel === rule.targetChannel) {
    issues.push({
      severity: 'error',
      code: 'channel-mismatch',
      message: `A wire carries ${sourcePort.channel} into a ${targetPort.channel} port, and no rule permits that change.`,
      connectionId: connection.id,
    });
  }
}

/**
 * Check a connection the user is about to make on the bench.
 *
 * Returns the reasons it cannot be made. An empty list means the connection
 * is allowed. The reasons come from the same code the whole-experiment
 * validation uses, so the message the user reads on the bench is the same
 * message the simulator would have given.
 */
export function validateConnection(
  experiment: ExperimentDefinition,
  registry: ComponentRegistry,
  source: { readonly componentId: string; readonly portId: string },
  target: { readonly componentId: string; readonly portId: string },
): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (source.componentId === target.componentId) {
    issues.push({
      severity: 'error',
      code: 'connection-to-self',
      message: 'A part cannot be wired to itself.',
    });
    return issues;
  }

  const byId = new Map<string, ComponentInstance>(
    experiment.components.map((c) => [c.id, c]),
  );

  checkConnection(
    {
      id: 'proposed',
      source,
      target,
      channel: 'electrical-potential',
      transfer: { kind: 'identity' },
    },
    byId,
    registry,
    issues,
  );

  return issues;
}

function validateEnvironment(environment: Environment, issues: ValidationIssue[]): void {
  for (const variable of environment.variables) {
    const value = variable.value.value;
    const min = variable.min.value;
    const max = variable.max.value;
    if (min > max) {
      issues.push({
        severity: 'error',
        code: 'environment-range-inverted',
        message: `Environment variable "${variable.label}" has its minimum above its maximum.`,
      });
      continue;
    }
    if (value < min || value > max) {
      issues.push({
        severity: 'warning',
        code: 'environment-value-out-of-range',
        message: `Environment variable "${variable.label}" is outside its permitted range.`,
      });
    }
  }
}

function validateTiming(experiment: ExperimentDefinition, issues: ValidationIssue[]): void {
  if (experiment.dt <= 0) {
    issues.push({
      severity: 'error',
      code: 'invalid-timestep',
      message: 'The simulation timestep must be greater than zero.',
    });
  }
  if (experiment.duration <= 0) {
    issues.push({
      severity: 'error',
      code: 'invalid-duration',
      message: 'The experiment duration must be greater than zero.',
    });
  }
  if (experiment.dt > 0 && experiment.duration > 0 && experiment.duration / experiment.dt > 200_000) {
    issues.push({
      severity: 'error',
      code: 'simulation-too-long',
      message: 'This configuration would require more than 200,000 steps. Reduce the duration or increase the timestep.',
    });
  }
}

/**
 * Render validation issues as a single human-readable explanation.
 *
 * Used by the UI error state and by the assistant when asked "why will this
 * not run?".
 */
export function explainValidation(result: ValidationResult): string {
  if (result.valid && result.issues.length === 0) {
    return 'This configuration is valid.';
  }
  const errors = result.issues.filter((i) => i.severity === 'error');
  const warnings = result.issues.filter((i) => i.severity === 'warning');
  const parts: string[] = [];
  if (errors.length) {
    parts.push(`${errors.length} blocking problem${errors.length === 1 ? '' : 's'}:`);
    parts.push(...errors.map((e) => `• ${e.message}`));
  }
  if (warnings.length) {
    parts.push(`${warnings.length} warning${warnings.length === 1 ? '' : 's'}:`);
    parts.push(...warnings.map((w) => `• ${w.message}`));
  }
  return parts.join('\n');
}
