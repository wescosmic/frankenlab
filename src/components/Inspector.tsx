'use client';

/**
 * The inspector.
 *
 * Everything the product knows about the selected component: what it is, how
 * much to trust it, and what you can change. The confidence level and the
 * stated assumptions sit next to the controls, not behind a menu.
 */

import React from 'react';
import { useLabStore } from '@/state/lab';
import { DISCIPLINE_COLOURS } from '@/world';

const CONFIDENCE_COPY: Record<string, { label: string; blurb: string }> = {
  'physical-law': {
    label: 'Physical law',
    blurb: 'Conserved and independently verifiable. Follows from established physics.',
  },
  'established-simplified': {
    label: 'Simplified model',
    blurb: 'An established model reduced for teaching. Directionally sound, not a prediction.',
  },
  illustrative: {
    label: 'Illustrative',
    blurb: 'Qualitative. Useful for feel, not for numbers you would publish.',
  },
  hypothetical: {
    label: 'Hypothetical',
    blurb: 'Speculative by design.',
  },
};

/**
 * The experiment's environment.
 *
 * Some parts of an experiment are driven by the world around them rather
 * than by another part on the bench. The temperature a reaction vessel runs
 * at is one of those. The section shows whatever the current experiment
 * actually declares, so an experiment with no environment does not get one.
 */
function EnvironmentPanel() {
  const experiment = useLabStore((s) => s.experiment);
  const setEnvironmentVariable = useLabStore((s) => s.setEnvironmentVariable);
  const variables = experiment.environment.variables;

  if (variables.length === 0) return null;

  return (
    <div className="border-b border-lab-line px-4 py-3">
      <div className="lab-label">Environment</div>
      <div className="mt-2 space-y-3">
        {variables.map((variable) => {
          const min = variable.min.value;
          const max = variable.max.value;
          const value = variable.value.value;
          return (
            <label key={variable.id} className="block">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[12px] text-lab-muted">{variable.label}</span>
                <span className="lab-value text-[12px] text-lab-text">
                  {Number(value.toFixed(2))} {variable.value.unit}
                </span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={(max - min) / 100 || 1}
                value={value}
                onChange={(event) =>
                  setEnvironmentVariable(variable.id, Number(event.target.value))
                }
                className="mt-1.5 w-full accent-[var(--color-lab-accent)]"
              />
              <p className="mt-1 text-[11px] leading-snug text-lab-dim">
                {variable.description}
              </p>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function Inspector() {
  const experiment = useLabStore((s) => s.experiment);
  const registry = useLabStore((s) => s.registry);
  const simulation = useLabStore((s) => s.simulation);
  const status = useLabStore((s) => s.status);
  const selectedId = useLabStore((s) => s.selectedId);
  const selectedConnectionId = useLabStore((s) => s.selectedConnectionId);
  const setParameter = useLabStore((s) => s.setParameter);
  const setSubstrate = useLabStore((s) => s.setSubstrate);
  const removeComponent = useLabStore((s) => s.removeComponent);
  const removeConnection = useLabStore((s) => s.removeConnection);

  // Track whether the last parameter change caused a restart.
  const [lastRestarted, setLastRestarted] = React.useState(false);

  const instance = experiment.components.find((c) => c.id === selectedId) ?? null;
  const definition = instance ? registry.tryGetDefinition(instance.type) : null;
  const connection = experiment.connections.find((c) => c.id === selectedConnectionId) ?? null;

  // The name of a part, for a wire that runs between two of them.
  const partName = (componentId: string, portId: string): string => {
    const part = experiment.components.find((c) => c.id === componentId);
    const partDefinition = part ? registry.tryGetDefinition(part.type) : null;
    const port = partDefinition?.ports.find((p) => p.id === portId);
    return `${part?.label ?? partDefinition?.name ?? componentId} · ${port?.label ?? portId}`;
  };

  if (connection) {
    return (
      <div className="flex h-full flex-col overflow-y-auto">
        <div className="border-b border-lab-line px-4 py-3">
          <div className="lab-label">Wire</div>
          <h2 className="mt-1 text-[15px] font-medium text-lab-text">
            {partName(connection.source.componentId, connection.source.portId)}
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-lab-muted">
            to {partName(connection.target.componentId, connection.target.portId)}
          </p>
        </div>

        <div className="border-b border-lab-line px-4 py-3">
          <div className="lab-label">What it carries</div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-lab-muted">
            {connection.channel}
            {connection.transfer.kind !== 'identity' && (
              <> · {connection.transfer.kind} transfer</>
            )}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-lab-dim">
            A wire is only allowed when a named rule says this coupling exists.
            Cut it and the two parts stop talking to each other.
          </p>
        </div>

        <EnvironmentPanel />

        <div className="px-4 py-3">
          <button
            type="button"
            onClick={() => removeConnection(connection.id)}
            className="w-full rounded-md border border-lab-warn/40 bg-lab-warn/10 px-3 py-2 text-[12px] text-lab-warn transition-colors hover:bg-lab-warn/20"
          >
            Cut this wire
          </button>
          <p className="mt-2 text-[11px] leading-relaxed text-lab-dim">
            Cutting a wire restarts the run.
          </p>
        </div>
      </div>
    );
  }

  if (!instance || !definition) {
    return (
      <div className="flex h-full flex-col overflow-y-auto">
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="lab-label">Nothing selected</div>
          <p className="mt-2 text-[13px] leading-relaxed text-lab-dim">
            Pick a component on the bench or from the library to see how it behaves
            and what it assumes.
          </p>
        </div>
        <EnvironmentPanel />
      </div>
    );
  }

  const colour = DISCIPLINE_COLOURS[definition.discipline] ?? '#4fd1c5';
  const confidence = CONFIDENCE_COPY[definition.confidence];

  // The wires attached to this part, so they can be cut from here too.
  const attachedWires = experiment.connections.filter(
    (c) => c.source.componentId === instance.id || c.target.componentId === instance.id,
  );

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <EnvironmentPanel />
      <div className="border-b border-lab-line px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: colour }} aria-hidden />
          <span className="lab-label">{definition.discipline}</span>
        </div>
        <h2 className="mt-1 text-[15px] font-medium text-lab-text">
          {instance.label ?? definition.name}
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-lab-muted">
          {definition.description}
        </p>
      </div>

      <div className="border-b border-lab-line px-4 py-3">
        <div className="lab-label">How much to trust it</div>
        <div className="mt-1.5 flex items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider"
            style={{
              background: `${colour}1f`,
              color: colour,
              border: `1px solid ${colour}55`,
            }}
          >
            {confidence?.label ?? definition.confidence}
          </span>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-lab-dim">
          {confidence?.blurb}
        </p>
        <ul className="mt-2 space-y-1">
          {definition.assumptions.map((assumption) => (
            <li key={assumption} className="flex gap-2 text-[12px] leading-relaxed text-lab-muted">
              <span className="text-lab-dim">—</span>
              <span>{assumption}</span>
            </li>
          ))}
        </ul>
      </div>

      {instance.id === 'substrate' && (
        <div className="border-b border-lab-line px-4 py-3">
          <div className="lab-label">Swap the medium</div>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {(['sandy', 'loamy', 'clay', 'hydrogel'] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setSubstrate(preset)}
                className="rounded-md border border-lab-line bg-lab-panel-raised px-2 py-1.5 text-[12px] capitalize text-lab-muted transition-colors hover:border-lab-accent/60 hover:text-lab-text"
              >
                {preset}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-lab-dim">
            The medium decides how fast the plant drinks, and therefore when the
            alarm goes off.
          </p>
        </div>
      )}

      <div className="border-b border-lab-line px-4 py-3">
        <div className="lab-label">Parameters</div>
        <div className="mt-2 space-y-3">
          {definition.parameters
            .filter((parameter) => parameter.kind === 'number')
            .map((parameter) => {
              const supplied = instance.parameters[parameter.id];
              const raw = supplied?.value ?? parameter.defaultValue;
              const value = typeof raw === 'number' ? raw : Number(raw) || 0;
              const min = parameter.min ?? 0;
              const max = parameter.max ?? 100;

              // Check if this parameter can be changed live (mid-run) or requires a rebuild.
              const isLive = simulation.isParameterLive(instance.id, parameter.id);

              const handleChange = (newValue: number) => {
                const restarted = setParameter(instance.id, parameter.id, newValue);
                // If the run restarted, show a brief notification and clear after 3 seconds.
                if (restarted) {
                  setLastRestarted(true);
                  setTimeout(() => setLastRestarted(false), 3000);
                }
              };

              // Disable the slider if running and the parameter is baked (would restart).
              const isDisabled = status === 'running' && !isLive;

              return (
                <label key={parameter.id} className="block">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[12px] text-lab-muted">
                      {parameter.label}
                      {isLive && status === 'running' && (
                        <span className="ml-1.5 text-[10px] uppercase tracking-wide text-lab-accent">
                          · live
                        </span>
                      )}
                      {!isLive && (
                        <span className="ml-1.5 text-[10px] uppercase tracking-wide text-lab-warn">
                          · restarts
                        </span>
                      )}
                    </span>
                    <span className="lab-value text-[12px] text-lab-text">
                      {Number(value.toFixed(4))}
                      {parameter.unit ? ` ${parameter.unit}` : ''}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={parameter.step ?? 0.01}
                    value={value}
                    disabled={isDisabled}
                    onChange={(event) => handleChange(Number(event.target.value))}
                    className="mt-1.5 w-full accent-[var(--color-lab-accent)] disabled:opacity-40"
                  />
                  <p className="mt-1 text-[11px] leading-snug text-lab-dim">
                    {parameter.description}
                  </p>
                </label>
              );
            })}

          {/* Notification when a baked parameter change caused a restart */}
          {lastRestarted && (
            <div className="mt-3 rounded-md border border-lab-warn/40 bg-lab-warn/10 px-3 py-2">
              <p className="text-[11px] leading-snug text-lab-warn">
                This change restarted the run from the beginning.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="lab-label">Ports</div>
        <ul className="mt-2 space-y-1.5">
          {definition.ports.map((port) => (
            <li key={port.id} className="text-[12px] leading-snug">
              <span className="text-lab-text">{port.label}</span>
              <span className="ml-1.5 text-lab-dim">
                {port.direction} · {port.channel}
                {port.unit ? ` · ${port.unit}` : ''}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {attachedWires.length > 0 && (
        <div className="border-t border-lab-line px-4 py-3">
          <div className="lab-label">Wires</div>
          <ul className="mt-2 space-y-2">
            {attachedWires.map((wire) => (
              <li key={wire.id} className="flex items-center justify-between gap-2">
                <span className="text-[12px] leading-snug text-lab-muted">
                  {partName(wire.source.componentId, wire.source.portId)}
                  {' → '}
                  {partName(wire.target.componentId, wire.target.portId)}
                </span>
                <button
                  type="button"
                  onClick={() => removeConnection(wire.id)}
                  className="shrink-0 rounded border border-lab-line px-2 py-0.5 text-[10px] uppercase tracking-wider text-lab-dim transition-colors hover:border-lab-warn/50 hover:text-lab-warn"
                >
                  Cut
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-lab-line px-4 py-3">
        <button
          type="button"
          onClick={() => removeComponent(instance.id)}
          className="w-full rounded-md border border-lab-warn/40 bg-lab-warn/10 px-3 py-2 text-[12px] text-lab-warn transition-colors hover:bg-lab-warn/20"
        >
          Take this part off the bench
        </button>
        <p className="mt-2 text-[11px] leading-relaxed text-lab-dim">
          Taking a part off, or changing the experiment, restarts the run.
        </p>
      </div>
    </div>
  );
}
