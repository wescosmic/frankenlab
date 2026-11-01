'use client';

/**
 * The laboratory shell.
 *
 * The bench is the subject. The chrome around it stays quiet: a catalogue on
 * the left, the experiment and its readings in the middle, and the inspector
 * and assistant on the right.
 */

import { useState } from 'react';
import { Workbench } from './Workbench';
import { Library } from './Library';
import { Inspector } from './Inspector';
import { Readouts, tabKeyHandler } from './Readouts';
import { Assistant } from './Assistant';
import { useLabStore, type Speed } from '@/state/lab';

type SideTab = 'inspector' | 'assistant';

const SIDE_TABS: { id: SideTab; label: string }[] = [
  { id: 'inspector', label: 'Inspector' },
  { id: 'assistant', label: 'Assistant' },
];

export function Lab() {
  const experiment = useLabStore((s) => s.experiment);
  const status = useLabStore((s) => s.status);
  const speed = useLabStore((s) => s.speed);
  const notice = useLabStore((s) => s.notice);
  const dismissNotice = useLabStore((s) => s.dismissNotice);
  const start = useLabStore((s) => s.start);
  const pause = useLabStore((s) => s.pause);
  const reset = useLabStore((s) => s.reset);
  const setSpeed = useLabStore((s) => s.setSpeed);
  const [tab, setTab] = useState<SideTab>('inspector');

  const running = status === 'running';

  return (
    <div className="flex h-screen w-screen flex-col bg-lab-void">
      {/* The first thing a keyboard user reaches. It is invisible until it is
          focused, which is the point of it. */}
      <a
        href="#bench"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:border focus:border-lab-accent focus:bg-lab-panel focus:px-3 focus:py-2 focus:text-[12px] focus:text-lab-accent"
      >
        Skip to the laboratory
      </a>

      <header className="flex h-14 shrink-0 items-center justify-between border-b border-lab-line bg-lab-panel px-4">
        <div className="flex items-baseline gap-4">
          <h1 className="m-0 text-[15px] font-semibold tracking-[0.22em] text-lab-text">
            FRANKENLAB
          </h1>
          <span className="hidden text-[12px] text-lab-dim sm:inline">
            The experimental universe
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[13px] text-lab-text">{experiment.name}</div>
            <div className="text-[10px] uppercase tracking-wider text-lab-dim">
              {experiment.discipline} · model {experiment.modelVersion}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {running ? (
              <button
                type="button"
                onClick={pause}
                className="rounded-md border border-lab-line bg-lab-panel-raised px-3 py-1.5 text-[12px] text-lab-muted transition-colors hover:border-lab-accent/60 hover:text-lab-text"
              >
                Pause
              </button>
            ) : (
              <button
                type="button"
                onClick={start}
                className="rounded-md border border-lab-accent/40 bg-lab-accent/10 px-3 py-1.5 text-[12px] text-lab-accent transition-colors hover:bg-lab-accent/20"
              >
                {status === 'complete' ? 'Run again' : 'Run'}
              </button>
            )}
            <button
              type="button"
              onClick={reset}
              className="rounded-md border border-lab-line bg-lab-panel-raised px-3 py-1.5 text-[12px] text-lab-muted transition-colors hover:border-lab-accent/60 hover:text-lab-text"
            >
              Reset
            </button>
          </div>

          <div className="flex items-center gap-1 rounded-md border border-lab-line bg-lab-panel-raised px-1 py-0.5">
            {(['slow', 'fast'] as Speed[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={[
                  'rounded px-2 py-1 text-[11px] uppercase tracking-wider transition-colors',
                  speed === s
                    ? 'bg-lab-accent/20 text-lab-accent'
                    : 'text-lab-dim hover:text-lab-text',
                ].join(' ')}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <Library />

        <main id="bench" className="flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1">
            <Workbench />
            {notice && (
              <div
                role="status"
                className="absolute bottom-10 left-1/2 flex max-w-lg -translate-x-1/2 items-start gap-3 rounded-md border border-lab-accent/40 bg-lab-panel/95 px-3 py-2 text-[12px] leading-snug text-lab-text shadow-lg"
              >
                <span className="flex-1">{notice}</span>
                <button
                  type="button"
                  onClick={dismissNotice}
                  className="shrink-0 text-[11px] uppercase tracking-wider text-lab-dim transition-colors hover:text-lab-text"
                >
                  Close
                </button>
              </div>
            )}
            <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-lab-line bg-lab-void/70 px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-lab-dim">
              Drag a part in · drag between the dots to wire · drag to orbit
            </div>
          </div>
          <Readouts />
        </main>

        <aside className="flex h-full w-80 shrink-0 flex-col border-l border-lab-line bg-lab-panel">
          <div className="flex shrink-0 border-b border-lab-line" role="tablist" aria-label="Tools">
            {SIDE_TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`side-tab-${id}`}
                aria-selected={tab === id}
                aria-controls={tab === id ? `side-panel-${id}` : undefined}
                tabIndex={tab === id ? 0 : -1}
                onClick={() => setTab(id)}
                onKeyDown={(event) =>
                  tabKeyHandler(event, SIDE_TABS, tab, (next) => setTab(next as SideTab), 'side-tab-')
                }
                className={[
                  'flex-1 px-4 py-2.5 text-[11px] uppercase tracking-wider transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lab-accent',
                  tab === id
                    ? 'border-b-2 border-lab-accent text-lab-text'
                    : 'border-b-2 border-transparent text-lab-dim hover:text-lab-muted',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
          <div
            className="min-h-0 flex-1"
            role="tabpanel"
            id={`side-panel-${tab}`}
            aria-labelledby={`side-tab-${tab}`}
            tabIndex={0}
          >
            {tab === 'inspector' ? <Inspector /> : <Assistant />}
          </div>
        </aside>
      </div>
    </div>
  );
}
