'use client';

/**
 * Live readouts.
 *
 * The numbers the kernel actually produced, plus a chart of how they moved.
 * Every value on this panel came out of a simulation run.
 */

import { useLabStore, TRACKED_SERIES } from '@/state/lab';

const SERIES_COLOURS: Record<string, string> = {
  'substrate.moisture': '#7bc96f',
  'sensor.signal': '#4fd1c5',
  'plant.biomass': '#c2a084',
  'comparator.decision': '#ef6461',
};

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

export function Readouts() {
  const readings = useLabStore((s) => s.readings);
  const elapsed = useLabStore((s) => s.elapsed);
  const status = useLabStore((s) => s.status);
  const experiment = useLabStore((s) => s.experiment);

  return (
    <div className="border-t border-lab-line bg-lab-panel">
      <div className="flex items-center justify-between px-4 pt-3">
        <div className="lab-label">Readings</div>
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
    </div>
  );
}
