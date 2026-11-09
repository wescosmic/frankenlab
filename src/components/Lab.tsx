'use client';

/**
 * The laboratory shell.
 *
 * The bench is the subject. The chrome around it stays quiet: a catalogue on
 * the left, the experiment and its readings in the middle, and the inspector
 * and assistant on the right.
 *
 * That arrangement does not fit on a phone — three columns of 256 and 320
 * pixels leave the bench nothing. So below a desktop width the three columns
 * become one: the bench and its readings stay on the screen, and the
 * catalogue, the inspector and the assistant move into a sheet that slides up
 * from the bottom. The sheet is a panel the user opens on purpose, not a
 * layout the user is stuck with, and the run keeps going underneath it.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Workbench } from './Workbench';
import { Library } from './Library';
import { Inspector } from './Inspector';
import { Readouts, tabKeyHandler } from './Readouts';
import { Assistant } from './Assistant';
import { useLabStore, type Speed } from '@/state/lab';

type SideTab = 'inspector' | 'assistant';
type Sheet = 'none' | 'parts' | SideTab;

const SIDE_TABS: { id: SideTab; label: string }[] = [
  { id: 'inspector', label: 'Inspector' },
  { id: 'assistant', label: 'Assistant' },
];

/** The three panels a phone can reach from the bar at the bottom. */
const SHEET_BUTTONS: { id: Exclude<Sheet, 'none'>; label: string }[] = [
  { id: 'parts', label: 'Parts' },
  { id: 'inspector', label: 'Inspect' },
  { id: 'assistant', label: 'Ask' },
];

const SHEET_TITLES: Record<Exclude<Sheet, 'none'>, string> = {
  parts: 'Parts and experiments',
  inspector: 'Inspector',
  assistant: 'Assistant',
};

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
  const [sheet, setSheet] = useState<Sheet>('none');

  /** Where the focus goes back to when the sheet closes. */
  const openerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const running = status === 'running';

  const openSheet = (id: Exclude<Sheet, 'none'>, opener: HTMLElement) => {
    // The opener is remembered rather than read from the document, because a
    // finger on a phone does not move the focus to the button it pressed.
    openerRef.current = opener;
    setSheet(id);
  };

  const closeSheet = useCallback(() => {
    setSheet('none');
    openerRef.current?.focus();
  }, []);

  // Escape closes the sheet. A rotation back to a desktop width closes it too,
  // because on a desktop the panel is already on the screen.
  useEffect(() => {
    if (sheet === 'none') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeSheet();
    };
    const onResize = () => {
      if (window.matchMedia('(min-width: 1280px)').matches) setSheet('none');
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [sheet, closeSheet]);

  // Move the focus into the sheet, so a keyboard user is not left standing on
  // the button that opened it.
  useEffect(() => {
    if (sheet !== 'none') closeRef.current?.focus();
  }, [sheet]);

  const resetButton = (
    <button
      type="button"
      onClick={reset}
      className="rounded-md border border-lab-line bg-lab-panel-raised px-2.5 py-1 text-[11px] text-lab-muted transition-colors hover:border-lab-accent/60 hover:text-lab-text focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lab-accent"
    >
      Reset
    </button>
  );

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-lab-void supports-[height:100dvh]:h-dvh">
      {/* The first thing a keyboard user reaches. It is invisible until it is
          focused, which is the point of it. */}
      <a
        href="#bench"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:border focus:border-lab-accent focus:bg-lab-panel focus:px-3 focus:py-2 focus:text-[12px] focus:text-lab-accent"
      >
        Skip to the laboratory
      </a>

      <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 border-b border-lab-line bg-lab-panel px-3 py-2 sm:h-14 sm:px-4 lg:py-0">
        <h1 className="m-0 shrink-0 text-[13px] font-semibold tracking-[0.2em] text-lab-text sm:text-[15px] sm:tracking-[0.22em]">
          FRANKENLAB
        </h1>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden text-right lg:block">
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
                className="rounded-md border border-lab-line bg-lab-panel-raised px-2.5 py-1.5 text-[12px] text-lab-muted transition-colors hover:border-lab-accent/60 hover:text-lab-text focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lab-accent sm:px-3"
              >
                Pause
              </button>
            ) : (
              <button
                type="button"
                onClick={start}
                className="rounded-md border border-lab-accent/40 bg-lab-accent/10 px-2.5 py-1.5 text-[12px] text-lab-accent transition-colors hover:bg-lab-accent/20 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lab-accent sm:px-3"
              >
                {status === 'complete' ? 'Run again' : 'Run'}
              </button>
            )}
            {/* On a phone the reset lives in the sheet, because the header
                only has room for the control that starts the run. */}
            <span className="hidden sm:inline-flex">{resetButton}</span>
          </div>

          <div className="flex items-center gap-0.5 rounded-md border border-lab-line bg-lab-panel-raised px-0.5 py-0.5 sm:px-1">
            {(['slow', 'fast'] as Speed[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={[
                  'rounded px-1.5 py-1 text-[10px] uppercase tracking-wider transition-colors sm:px-2 sm:text-[11px]',
                  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lab-accent',
                  speed === s
                    ? 'bg-lab-accent/20 text-lab-accent'
                    : 'text-lab-dim hover:text-lab-text',
                ].join(' ')}
              >
                {s}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={(event) => openSheet('parts', event.currentTarget)}
            className="rounded-md border border-lab-accent/40 bg-lab-accent/10 px-2.5 py-1.5 text-[11px] uppercase tracking-wider text-lab-accent transition-colors hover:bg-lab-accent/20 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lab-accent xl:hidden"
          >
            Parts
          </button>
        </div>

        {/* The experiment's name, on its own line where there is no room for
            it beside the wordmark. */}
        <div className="w-full min-w-0 truncate text-[11px] text-lab-dim sm:hidden">
          {experiment.name} · {experiment.discipline} · model {experiment.modelVersion}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* The catalogue. A column on a desktop, a sheet on a phone. */}
        <div className="hidden min-h-0 xl:flex xl:w-72 xl:shrink-0 xl:border-r xl:border-lab-line">
          <Library />
        </div>

        <main id="bench" className="flex min-w-0 flex-1 flex-col">
          <div className="relative h-[48vh] min-h-[220px] shrink-0 lg:h-auto lg:min-h-0 lg:flex-1">
            <Workbench />
            {notice && (
              <div
                role="status"
                className="absolute bottom-10 left-1/2 flex w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 items-start gap-3 rounded-md border border-lab-accent/40 bg-lab-panel/95 px-3 py-2 text-[12px] leading-snug text-lab-text shadow-lg sm:w-auto"
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
              {/* Dragging is a pointer gesture. A phone gets the add button. */}
              <span className="hidden lg:inline">
                Drag a part in · drag between the dots to wire · drag to orbit
              </span>
              <span className="lg:hidden">Tap + in Parts to add a part</span>
            </div>
          </div>
          <Readouts />
        </main>

        {/* The inspector and the assistant. A column on a desktop, a sheet on
            a phone. */}
        <aside className="hidden min-h-0 xl:flex xl:w-80 xl:shrink-0 xl:border-l xl:border-lab-line">
          <div className="flex h-full w-full flex-col bg-lab-panel">
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
          </div>
        </aside>
      </div>

      {/* The panels a phone can reach. */}
      <nav
        className="flex shrink-0 border-t border-lab-line bg-lab-panel xl:hidden"
        aria-label="Panels"
      >
        {SHEET_BUTTONS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={(event) => openSheet(id, event.currentTarget)}
            aria-expanded={sheet === id}
            aria-controls="lab-sheet"
            className={[
              'flex-1 border-t-2 px-3 py-2.5 text-[11px] uppercase tracking-wider transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lab-accent',
              sheet === id
                ? 'border-t-lab-accent text-lab-accent'
                : 'border-t-transparent text-lab-dim hover:text-lab-text',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </nav>

      {sheet !== 'none' && (
        <>
          {/* The backdrop. It is a button, so it closes the sheet for a
              keyboard user as well as for a finger. */}
          <button
            type="button"
            aria-label="Close the panel"
            onClick={closeSheet}
            className="fixed inset-0 z-40 bg-black/60 xl:hidden"
          />

          <div
            id="lab-sheet"
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col overflow-hidden rounded-t-xl border-t border-lab-line bg-lab-panel shadow-2xl xl:hidden"
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-lab-line px-4 py-2.5">
              <h2 className="lab-label m-0">{SHEET_TITLES[sheet]}</h2>
              <div className="flex items-center gap-2">
                {resetButton}
                <button
                  ref={closeRef}
                  type="button"
                  onClick={closeSheet}
                  className="rounded-md border border-lab-line bg-lab-panel-raised px-2.5 py-1 text-[11px] text-lab-muted transition-colors hover:border-lab-accent/60 hover:text-lab-text focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lab-accent"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              {sheet === 'parts' ? (
                <Library />
              ) : sheet === 'inspector' ? (
                <Inspector />
              ) : (
                <Assistant />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
