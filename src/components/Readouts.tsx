'use client';

/**
 * Live readouts.
 *
 * The numbers the kernel actually produced, plus a chart of how they moved.
 * Every value on this panel came out of a simulation run.
 */

import { useState, type KeyboardEvent } from 'react';
import { useLabStore, trackedSeriesFor } from '@/state/lab';
import { Couplings } from '@/components/Couplings';

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
  const experiment = useLabStore((s) => s.experiment);
  const tracked = trackedSeriesFor(experiment);
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

  // Each series is drawn against its own largest value, so a chart of molar
  // concentrations fills the same space as a chart of ratios. The number is
  // not changed — only where the line is drawn.
  const peakFor = (key: string): number => {
    let peak = 0;
    for (const point of series) {
      const value = point.values[key];
      if (value !== undefined && value > peak) peak = value;
    }
    return peak > 0 ? peak : 1;
  };

  const pathFor = (key: string): string => {
    const peak = peakFor(key);
    return series
      .map((point, index) => {
        const value = point.values[key];
        if (value === undefined) return '';
        const x = padding + ((point.t - first) / span) * (width - padding * 2);
        const y = height - padding - (value / peak) * (height - padding * 2);
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .filter(Boolean)
      .join(' ');
  };

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

      {tracked.map(({ key, colour }) => (
        <path
          key={key}
          d={pathFor(key)}
          fill="none"
          stroke={colour ?? SERIES_COLOURS[key] ?? '#4fd1c5'}
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
  const experiment = useLabStore((s) => s.experiment);
  const tracked = trackedSeriesFor(experiment);

  return (
    <>
      <div className="grid grid-cols-2 gap-px bg-lab-line md:grid-cols-4">
        {tracked.map(({ key, label, colour }) => {
          const quantity = readings[key];
          const value = quantity?.value ?? 0;
          const tone = colour ?? SERIES_COLOURS[key] ?? '#4fd1c5';

          return (
            <div key={key} className="bg-lab-panel px-4 py-3">
              <div className="lab-label">{label}</div>
              <div className="lab-value mt-1 text-[20px] leading-none" style={{ color: tone }}>
                {value.toFixed(3)}
              </div>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-lab-line">
                <div
                  className="h-full rounded-full transition-[width] duration-150"
                  style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: tone }}
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

function SnapshotsTab() {
  const snapshots = useLabStore((s) => s.snapshots);
  const comparingSnapshots = useLabStore((s) => s.comparingSnapshots);
  const saveSnapshot = useLabStore((s) => s.saveSnapshot);
  const deleteSnapshot = useLabStore((s) => s.deleteSnapshot);
  const addToComparison = useLabStore((s) => s.addToComparison);
  const elapsed = useLabStore((s) => s.elapsed);
  const status = useLabStore((s) => s.status);
  const [snapshotName, setSnapshotName] = useState('');

  const handleSave = () => {
    if (!snapshotName.trim()) return;
    saveSnapshot(snapshotName.trim());
    setSnapshotName('');
  };

  const canSave = status !== 'idle' && elapsed > 0;

  return (
    <div className="max-h-56 overflow-y-auto px-3 pb-3">
      <div className="mb-3 flex gap-2">
        <input
          type="text"
          value={snapshotName}
          onChange={(e) => setSnapshotName(e.target.value)}
          placeholder="Snapshot name..."
          className="flex-1 rounded border border-lab-line bg-lab-panel-raised px-2 py-1 text-[12px] text-lab-text placeholder:text-lab-dim focus:border-lab-accent focus:outline-none"
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || !snapshotName.trim()}
          className="rounded bg-lab-accent px-3 py-1 text-[11px] font-medium text-lab-text transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save
        </button>
      </div>

      {snapshots.length === 0 ? (
        <div className="flex h-20 items-center justify-center text-[12px] text-lab-dim">
          No saved snapshots. Run the experiment and save to compare.
        </div>
      ) : (
        <div className="space-y-2">
          {snapshots.map((snap) => {
            const isComparing = comparingSnapshots?.[0] === snap.id || comparingSnapshots?.[1] === snap.id;
            const day = (snap.elapsed / 86400).toFixed(1);
            return (
              <div
                key={snap.id}
                className={`flex items-center justify-between rounded border px-3 py-2 ${
                  isComparing
                    ? 'border-lab-accent bg-lab-accent/10'
                    : 'border-lab-line bg-lab-panel-raised'
                }`}
              >
                <div>
                  <div className="lab-label">{snap.name}</div>
                  <div className="text-[11px] text-lab-dim">Day {day}</div>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => addToComparison(snap.id)}
                    className="rounded px-2 py-1 text-[10px] text-lab-accent hover:bg-lab-accent/20"
                  >
                    Compare
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteSnapshot(snap.id)}
                    className="rounded px-2 py-1 text-[10px] text-lab-electronics hover:bg-lab-electronics/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CompareTab() {
  const snapshots = useLabStore((s) => s.snapshots);
  const comparingSnapshots = useLabStore((s) => s.comparingSnapshots);
  const clearComparison = useLabStore((s) => s.clearComparison);

  const snapshotA = comparingSnapshots?.[0] ? snapshots.find((s) => s.id === comparingSnapshots[0]) : null;
  const snapshotB = comparingSnapshots?.[1] ? snapshots.find((s) => s.id === comparingSnapshots[1]) : null;

  if (!snapshotA) {
    return (
      <div className="flex h-32 items-center justify-center text-[12px] text-lab-dim">
        Select two snapshots from the Snapshots tab to compare.
      </div>
    );
  }

  // Keep the comparison readable: use the experiment's labels and units,
  // while still tolerating a snapshot captured before a series was populated.
  const tracked = trackedSeriesFor(snapshotA.experiment).filter((series) =>
    snapshotA.series.some((point) => Object.prototype.hasOwnProperty.call(point.values, series.key)),
  );

  return (
    <div className="max-h-56 overflow-y-auto px-3 pb-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-4">
          <div className="rounded border border-lab-line bg-lab-panel-raised px-3 py-2">
            <div className="lab-label text-lab-biology">{snapshotA.name}</div>
            <div className="text-[11px] text-lab-dim">Day {(snapshotA.elapsed / 86400).toFixed(1)}</div>
          </div>
          {snapshotB && (
            <div className="rounded border border-lab-line bg-lab-panel-raised px-3 py-2">
              <div className="lab-label text-lab-chemistry">{snapshotB.name}</div>
              <div className="text-[11px] text-lab-dim">Day {(snapshotB.elapsed / 86400).toFixed(1)}</div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={clearComparison}
          className="rounded px-2 py-1 text-[10px] text-lab-dim hover:bg-lab-line"
        >
          Clear
        </button>
      </div>

      {tracked.length === 0 ? (
        <div className="text-[12px] text-lab-dim">No series data to compare.</div>
      ) : (
        <div className="space-y-2">
          {tracked.map((series) => {
            const key = series.key;
            const unit = snapshotA.readings[key]?.unit ?? '';
            const valA = snapshotA.series.at(-1)?.values[key] ?? 0;
            const valB = snapshotB ? (snapshotB.series.at(-1)?.values[key] ?? 0) : null;
            const diff = valB !== null ? valB - valA : null;

            return (
              <div key={key} className="grid grid-cols-3 gap-2 rounded border border-lab-line bg-lab-panel-raised px-3 py-2 text-[12px]">
                <span className="text-lab-dim">{series.label}{unit ? ` (${unit})` : ''}</span>
                <span className="text-lab-biology">{valA.toFixed(3)}{unit ? ` ${unit}` : ''}</span>
                <span className={diff !== null ? (diff > 0 ? 'text-lab-biology' : diff < 0 ? 'text-lab-chemistry' : 'text-lab-dim') : 'text-lab-dim'}>
                  {valB !== null ? `${valB.toFixed(3)}${unit ? ` ${unit}` : ''}` : '—'}
                  {diff !== null && diff !== 0 && (
                    <span className="ml-1 text-[10px]">
                      ({diff > 0 ? '+' : ''}{diff.toFixed(3)})
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Show final observations from each snapshot */}
      {(snapshotA.observations.length > 0 || (snapshotB && snapshotB.observations.length > 0)) && (
        <div className="mt-4">
          <div className="lab-label mb-2">Observations</div>
          <div className="space-y-1">
            {snapshotA.observations.slice(-3).map((obs, i) => (
              <div key={`a-${i}`} className="text-[11px] text-lab-biology">
                • {obs.message}
              </div>
            ))}
            {snapshotB && snapshotB.observations.slice(-3).map((obs, i) => (
              <div key={`b-${i}`} className="text-[11px] text-lab-chemistry">
                • {obs.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DiscoveryTab() {
  const experiment = useLabStore((s) => s.experiment);
  const registry = useLabStore((s) => s.registry);
  const sweepResult = useLabStore((s) => s.sweepResult);
  const sweepRunning = useLabStore((s) => s.sweepRunning);
  const sweepProgress = useLabStore((s) => s.sweepProgress);
  const startSweep = useLabStore((s) => s.startSweep);
  const cancelSweep = useLabStore((s) => s.cancelSweep);
  const clearSweep = useLabStore((s) => s.clearSweep);
  const [componentId, setComponentId] = useState(experiment.components[0]?.id ?? '');
  const [parameterId, setParameterId] = useState('');
  const [outcomeKey, setOutcomeKey] = useState(experiment.trackedSeries?.[0]?.key ?? '');
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(1);
  const [trials, setTrials] = useState(12);
  const [optimizeFor, setOptimizeFor] = useState<'max' | 'min'>('max');

  const component = experiment.components.find((item) => item.id === componentId) ?? experiment.components[0];
  const definition = component ? registry.getDefinition(component.type) : undefined;
  const numericParameters = definition?.parameters.filter((parameter) => parameter.kind === 'number' && parameter.id !== 'label') ?? [];
  const parameter = numericParameters.find((item) => item.id === parameterId) ?? numericParameters[0];
  const outcomeOptions = experiment.trackedSeries ?? [];

  const run = () => {
    if (!component || !parameter || !outcomeKey) return;
    void startSweep({ componentId: component.id, parameterId: parameter.id, min, max, trials: Math.max(2, Math.min(48, trials)), outcomeKey, optimizeFor });
  };

  return (
    <div className="max-h-56 overflow-y-auto px-3 pb-3 text-[12px]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <div className="lab-label text-lab-accent">DISCOVERY MODE</div>
          <div className="mt-1 text-lab-dim">Sweep one model parameter locally and find a measured outcome.</div>
        </div>
        {sweepRunning ? (
          <button type="button" onClick={cancelSweep} className="rounded border border-lab-electronics/50 px-2 py-1 text-[10px] text-lab-electronics">Stop</button>
        ) : sweepResult ? (
          <button type="button" onClick={clearSweep} className="rounded border border-lab-line px-2 py-1 text-[10px] text-lab-dim">Clear</button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-lab-dim">Component<select value={component?.id ?? ''} onChange={(event) => { setComponentId(event.target.value); setParameterId(''); }} className="mt-1 w-full rounded border border-lab-line bg-lab-panel-raised px-2 py-1 text-lab-text">{experiment.components.map((item) => <option key={item.id} value={item.id}>{item.label ?? item.id}</option>)}</select></label>
        <label className="text-lab-dim">Parameter<select value={parameter?.id ?? ''} onChange={(event) => setParameterId(event.target.value)} className="mt-1 w-full rounded border border-lab-line bg-lab-panel-raised px-2 py-1 text-lab-text">{numericParameters.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label className="text-lab-dim">From<input type="number" value={min} onChange={(event) => setMin(Number(event.target.value))} className="mt-1 w-full rounded border border-lab-line bg-lab-panel-raised px-2 py-1 text-lab-text" /></label>
        <label className="text-lab-dim">To<input type="number" value={max} onChange={(event) => setMax(Number(event.target.value))} className="mt-1 w-full rounded border border-lab-line bg-lab-panel-raised px-2 py-1 text-lab-text" /></label>
        <label className="text-lab-dim">Outcome<select value={outcomeKey} onChange={(event) => setOutcomeKey(event.target.value)} className="mt-1 w-full rounded border border-lab-line bg-lab-panel-raised px-2 py-1 text-lab-text">{outcomeOptions.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
        <label className="text-lab-dim">Trials<input type="number" min={2} max={48} value={trials} onChange={(event) => setTrials(Number(event.target.value))} className="mt-1 w-full rounded border border-lab-line bg-lab-panel-raised px-2 py-1 text-lab-text" /></label>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <label className="text-lab-dim">Find<select value={optimizeFor} onChange={(event) => setOptimizeFor(event.target.value as 'max' | 'min')} className="ml-1 rounded border border-lab-line bg-lab-panel-raised px-2 py-1 text-lab-text"><option value="max">highest outcome</option><option value="min">lowest outcome</option></select></label>
        <button type="button" disabled={sweepRunning || !parameter || !outcomeKey || min >= max} onClick={run} className="ml-auto rounded bg-lab-accent px-3 py-1.5 text-[10px] font-medium text-lab-text disabled:cursor-not-allowed disabled:opacity-40">{sweepRunning ? `${Math.round(sweepProgress * 100)}%` : 'Run sweep'}</button>
      </div>

      {sweepResult && (
        <div className="mt-3 space-y-2 rounded border border-lab-accent/30 bg-lab-accent/5 p-3">
          <div className="lab-label text-lab-accent">BEST MODEL RESULT</div>
          <div className="flex justify-between"><span className="text-lab-dim">{parameter?.label}</span><span className="lab-value">{sweepResult.bestTrial.parameterValue.toFixed(3)}</span></div>
          <div className="flex justify-between"><span className="text-lab-dim">{outcomeKey}</span><span className="lab-value text-lab-biology">{sweepResult.bestTrial.outcomeValue.toFixed(3)}</span></div>
          <div className="text-[10px] text-lab-dim">{sweepResult.trials.length} deterministic trials · weakest model: {sweepResult.weakestConfidence}</div>
        </div>
      )}
    </div>
  );
}

type TabId = 'readings' | 'timeline' | 'measurements' | 'couplings' | 'snapshots' | 'compare' | 'discover';

const TABS: { id: TabId; label: string }[] = [
  { id: 'readings', label: 'Readings' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'measurements', label: 'Measurements' },
  { id: 'couplings', label: 'Couplings' },
  { id: 'snapshots', label: 'Snapshots' },
  { id: 'compare', label: 'Compare' },
  { id: 'discover', label: 'Discover' },
];

/**
 * Arrow keys move between tabs, as the tabs pattern expects.
 *
 * Without this, a keyboard user has to tab through every tab to reach the
 * panel they want, and the tab list announces as four separate controls
 * rather than as one.
 */
export function tabKeyHandler(
  event: KeyboardEvent<HTMLButtonElement>,
  tabs: readonly { id: string }[],
  current: string,
  select: (id: string) => void,
  idPrefix = 'tab-',
): void {
  const index = tabs.findIndex((t) => t.id === current);
  if (index === -1) return;

  let next = index;
  if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
  else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = tabs.length - 1;
  else return;

  event.preventDefault();
  select(tabs[next]!.id);
  // Move the focus with the selection, so the keyboard stays where the eye is.
  // The prefix matters: the readouts and the side tabs are two different
  // tab lists with two different id schemes.
  const target = document.getElementById(`${idPrefix}${tabs[next]!.id}`);
  target?.focus();
}

export function Readouts() {
  const elapsed = useLabStore((s) => s.elapsed);
  const status = useLabStore((s) => s.status);
  const experiment = useLabStore((s) => s.experiment);
  const [tab, setTab] = useState<TabId>('readings');

  return (
    <div className="min-h-0 flex-1 overflow-y-auto border-t border-lab-line bg-lab-panel lg:flex-none lg:overflow-visible">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-lab-line px-3 pt-2">
        <div
          className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide"
          role="tablist"
          aria-label="Readouts"
        >
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={tab === id}
              aria-controls={tab === id ? `panel-${id}` : undefined}
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
              onKeyDown={(event) => tabKeyHandler(event, TABS, tab, (next) => setTab(next as TabId))}
              className={[
                'shrink-0 px-3 py-1.5 text-[10px] uppercase tracking-wider transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lab-accent',
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

      <div
        className="py-2"
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        tabIndex={0}
      >
        {tab === 'readings' && <ReadingsTab />}
        {tab === 'timeline' && <TimelineTab />}
        {tab === 'measurements' && <MeasurementsTab />}
        {tab === 'couplings' && <Couplings />}
        {tab === 'snapshots' && <SnapshotsTab />}
        {tab === 'compare' && <CompareTab />}
        {tab === 'discover' && <DiscoveryTab />}
      </div>
    </div>
  );
}
