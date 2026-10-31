'use client';

/**
 * The inspector.
 *
 * Everything the product knows about the selected component: what it is, how
 * much to trust it, and what you can change. The confidence level and the
 * stated assumptions sit next to the controls, not behind a menu.
 */

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

export function Inspector() {
  const experiment = useLabStore((s) => s.experiment);
  const registry = useLabStore((s) => s.registry);
  const selectedId = useLabStore((s) => s.selectedId);
  const setParameter = useLabStore((s) => s.setParameter);
  const setSubstrate = useLabStore((s) => s.setSubstrate);

  const instance = experiment.components.find((c) => c.id === selectedId) ?? null;
  const definition = instance ? registry.tryGetDefinition(instance.type) : null;

  if (!instance || !definition) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="lab-label">Nothing selected</div>
        <p className="mt-2 text-[13px] leading-relaxed text-lab-dim">
          Pick a component on the bench or from the library to see how it behaves
          and what it assumes.
        </p>
      </div>
    );
  }

  const colour = DISCIPLINE_COLOURS[definition.discipline] ?? '#4fd1c5';
  const confidence = CONFIDENCE_COPY[definition.confidence];

  return (
    <div className="flex h-full flex-col overflow-y-auto">
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

              return (
                <label key={parameter.id} className="block">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[12px] text-lab-muted">{parameter.label}</span>
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
                    onChange={(event) =>
                      setParameter(instance.id, parameter.id, Number(event.target.value))
                    }
                    className="mt-1.5 w-full accent-[var(--color-lab-accent)]"
                  />
                  <p className="mt-1 text-[11px] leading-snug text-lab-dim">
                    {parameter.description}
                  </p>
                </label>
              );
            })}
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
    </div>
  );
}
