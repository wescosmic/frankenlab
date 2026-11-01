'use client';

/**
 * Live readouts.
 *
 * The numbers the kernel actually produced, plus a chart of how they moved.
 * Every value on this panel came out of a simulation run.
 */

import { useState } from 'react';
import { useLabStore, TRACKED_SERIES } from '@/state/lab';

const SERIES_COLOURS: Record<string, string> = {
  'substrate.moisture': '#7bc96f',
  'sensor.signal': '#4fd1c5',
  'plant.biomass': '#c2a084',
  'comparator.decision': '#ef6461',
};

const SEVERITY_COLOURS: Record<'info' | 'success' | 'warning' | 'error', { bg: string; text: string; border: string }> = {
  info: { bg: 'rgba(79, 209, 197, 0.1)', text: 'text-lab-accent', border: 'border-lab-accent/30' },
  success: { bg: 'rgba(123, 201, 111, 0.1)', text: 'text-lab-biology', border: 'border-lab-biology/30' },
  warning: { bg: 'rgba(240, 179, 80, 0.1)', text: 'text-lab-chemistry', border: 'border-lab-chemistry/30' },
  error: { bg: 'rgba(239, 100, 97, 0.1)', text: 'text-lab-electronics', border: 'border-lab-electronics/30' },
};

const SEVERITY_FALLBACK = SEVERITY_COLOURS.info;

function formatElapsed(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days === 0) return `${hours}h`;
  return `${days}d ${hours}h`;
}

function SeriesChart() {
  const series = useLabStore((s) => s.series);
  const width = 620;
  const height = 132;
  const padding = 4;

  if (series.length < 2) {
    return (
      <div className="flex h-[132px] items-center justify-center text-[12px] text-lab-dim">
        Run the experiment to see the readings move.
      </div>
    );
  }

  const first = series[0]!.t;
  const last = series.at(-1)!.t;
  const span = Math.max(1, last - first);

  const pathFor = (key: string): string =>
    series
      .map((point, index) => {
        const value = point.values[key];
        if (value === undefined) return '';
        const x = padding + ((point.t - first) / span) * (width - padding * 2);
        const y = height - padding - value * (height - padding * 2);
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .filter(Boolean)
      .join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-[132px] w-full"
      role="img"
      aria-label="Readings over the run"
    >
      {[0, 0.5, 1].map((level) => (
        <line
          key={level}
          x1={padding}
          x2={width - padding}
          y1={height - padding - level * (height - padding * 2)}
          y2={height - padding - level * (height - padding * 2)}
          stroke="var(--color-lab-line)"
          strokeWidth={1}
        />
      ))}

      {TRACKED_SERIES.map(({ key }) => (
        <path
          key={key}
          d={pathFor(key)}
          fill="none"
          stroke={SERIES_COLOURS[key]}
          strokeWidth={1.6}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

function ReadingsTab() {
  const readings = useLabStore((s) => s.readings);

  return (
    <>
      <div className="grid grid-cols-2 gap-px bg-lab-line md:grid-cols-4">
        {TRACKED_SERIES.map(({ key, label }) => {
          const quantity = readings[key];
          const value = quantity?.value ?? 0;
          const colour = SERIES_COLOURS[key] ?? '#4fd1c5';

          return (
            <div key={key} className="bg-lab-panel px-4 py-3">
              <div className="lab-label">{label}</div>
              <div className="lab-value mt-1 text-[20px] leading-none" style={{ color: colour }}>
                {value.toFixed(3)}
              </div>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-lab-line">
                <div
                  className="h-full rounded-full transition-[width] duration-150"
                  style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: colour }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-3 pb-2 pt-2">
        <SeriesChart />
      </div>
    </>
  );
}

function TimelineTab() {
  const observations = useLabStore((s) => s.observations);

  if (observations.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-[12px] text-lab-dim">
        No observations recorded yet.
      </div>
    );
  }

  return (
    <div className="max-h-56 overflow-y-auto px-3 pb-3">
      <div className="space-y-2">
        {observations.map((obs, index) => {
          const colours = SEVERITY_COLOURS[obs.severity] ?? SEVERITY_FALLBACK;
          return (
            <div
              key={`${obs.time}-${index}`}
              className={`rounded border bg-lab-panel-raised px-3 py-2 ${colours.border}`}
            >
              <div className="flex items-center justify-between">
                <span className={`lab-label ${colours.text}`}>{obs.severity}</span>
                <span className="lab-value text-[11px] text-lab-dim">{formatElapsed(obs.time)}</span>
              </div>
              <div className="mt-1 text-[13px] text-lab-text">{obs.message}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MeasurementsTab() {
  const readings = useLabStore((s) => s.readings);
  const experiment = useLabStore((s) => s.experiment);
  const registry = useLabStore((s) => s.registry);

  // Resolve a measurement key to a label, checking ports first, then readings.
  const resolveLabel = (componentId: string, portId: string): string => {
    const component = experiment.components.find((c) => c.id === componentId);
    if (!component) return portId;
    const definition = registry.getDefinition(component.type);
    if (!definition) return portId;

    // Check if it's a port first.
    const portDef = definition.ports.find((p) => p.id === portId);
    if (portDef) return portDef.label;

    // Check if it's a declared reading.
    const readingDef = definition.readings?.find((r) => r.id === portId);
    if (readingDef) return readingDef.label;

    // Fall back to the raw identifier.
    return portId;
  };

  // Group readings by component
  const byComponent = new Map<string, Map<string, { value: number; unit: string; label: string }>>();
  for (const [key, quantity] of Object.entries(readings)) {
    const dotIndex = key.indexOf('.');
    if (dotIndex === -1) continue;
    const componentId = key.slice(0, dotIndex);
    const portId = key.slice(dotIndex + 1);
    if (!byComponent.has(componentId)) {
      byComponent.set(componentId, new Map());
    }
    const label = resolveLabel(componentId, portId);
    byComponent.get(componentId)!.set(portId, {
      value: quantity.value,
      unit: quantity.unit,
      label,
    });
  }

  if (byComponent.size === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-[12px] text-lab-dim">
        No measurements recorded yet.
      </div>
    );
  }

  return (
    <div className="max-h-56 overflow-y-auto px-3 pb-3">
      <div className="space-y-3">
        {experiment.components.map((component) => {
          const componentReadings = byComponent.get(component.id);
          if (!componentReadings || componentReadings.size === 0) return null;

          const definition = registry.getDefinition(component.type);
          const componentName = definition?.name ?? component.type;

          return (
            <div key={component.id} className="rounded border border-lab-line bg-lab-panel-raised px-3 py-2">
              <div className="lab-label mb-2">{componentName}</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {Array.from(componentReadings.entries()).map(([portId, { value, unit, label }]) => (
                  <div key={portId} className="flex justify-between">
                    <span className="text-[11px] text-lab-dim">{label}</span>
                    <span className="lab-value text-[11px] text-lab-text">
                      {value.toFixed(3)} <span className="text-lab-dim">{unit}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type TabId = 'readings' | 'timeline' | 'measurements';

export function Readouts() {
  const elapsed = useLabStore((s) => s.elapsed);
  const status = useLabStore((s) => s.status);
  const experiment = useLabStore((s) => s.experiment);
  const [tab, setTab] = useState<TabId>('readings');

  const tabs: { id: TabId; label: string }[] = [
    { id: 'readings', label: 'Readings' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'measurements', label: 'Measurements' },
  ];

  return (
    <div className="border-t border-lab-line bg-lab-panel">
      <div className="flex items-center justify-between border-b border-lab-line px-3 pt-2">
        <div className="flex gap-1">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={[
                'px-3 py-1.5 text-[10px] uppercase tracking-wider transition-colors',
                tab === id
                  ? 'text-lab-text'
                  : 'text-lab-dim hover:text-lab-muted',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-lab-dim">
          <span className="lab-value">{formatElapsed(elapsed)}</span>
          <span>of</span>
          <span className="lab-value">{formatElapsed(experiment.duration)}</span>
          <span
            className="rounded-full px-2 py-0.5 uppercase tracking-wider"
            style={{
              background:
                status === 'running'
                  ? 'rgba(79, 209, 197, 0.15)'
                  : 'var(--color-lab-line)',
              color: status === 'running' ? 'var(--color-lab-accent)' : 'var(--color-lab-dim)',
            }}
          >
            {status}
          </span>
        </div>
      </div>

      <div className="py-2">
        {tab === 'readings' && <ReadingsTab />}
        {tab === 'timeline' && <TimelineTab />}
        {tab === 'measurements' && <MeasurementsTab />}
      </div>
    </div>
  );
}