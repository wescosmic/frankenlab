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
import { EXPERIMENTS } from '@/scenarios';
import { DISCIPLINE_COLOURS } from '@/world';

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
  const loadExperiment = useLabStore((s) => s.loadExperiment);
  const [tab, setTab] = useState<SideTab>('inspector');
  const [sheet, setSheet] = useState<Sheet>('none');
  const [experimentsOpen, setExperimentsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(true);
  const [judgeMode, setJudgeMode] = useState(false);
  const [libraryCollapsed, setLibraryCollapsed] = useState(false);
  const [toolsCollapsed, setToolsCollapsed] = useState(false);
  const selectedId = useLabStore((s) => s.selectedId);
  // Keep the first render identical on the server and in the browser. The
  // persisted preference is applied after hydration so localStorage and
  // matchMedia can never change the server-rendered markup.
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  /** Where the focus goes back to when the sheet closes. */
  const openerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const experimentsButtonRef = useRef<HTMLButtonElement | null>(null);
  const experimentCloseRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem('frankenlab-theme');
    const nextTheme: 'light' | 'dark' = saved === 'dark' || saved === 'light'
      ? saved
      : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    window.setTimeout(() => setTheme(nextTheme), 0);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem('frankenlab-theme', nextTheme);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const guideDismissed = window.localStorage.getItem('frankenlab-guide-dismissed') === 'true';
    const savedLibrary = window.localStorage.getItem('frankenlab-library-collapsed') === 'true';
    const savedTools = window.localStorage.getItem('frankenlab-tools-collapsed') === 'true';
    window.setTimeout(() => {
      if (guideDismissed) setGuideOpen(false);
      setLibraryCollapsed(savedLibrary);
      setToolsCollapsed(savedTools);
    }, 0);
  }, []);

  const collapseLibrary = (collapsed: boolean) => {
    setLibraryCollapsed(collapsed);
    window.localStorage.setItem('frankenlab-library-collapsed', String(collapsed));
  };

  const collapseTools = (collapsed: boolean) => {
    setToolsCollapsed(collapsed);
    window.localStorage.setItem('frankenlab-tools-collapsed', String(collapsed));
  };

  useEffect(() => {
    if (!selectedId) return;
    setTab('inspector');
    if (window.matchMedia('(min-width: 1280px)').matches) collapseTools(false);
  }, [selectedId]);

  const running = status === 'running';
  const experimentEntry = EXPERIMENTS.find((entry) => entry.id === experiment.id) ?? EXPERIMENTS[0]!;

  const dismissGuide = () => {
    setGuideOpen(false);
    window.localStorage.setItem('frankenlab-guide-dismissed', 'true');
  };

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
    if (sheet === 'none' && !experimentsOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (experimentsOpen) {
        setExperimentsOpen(false);
        experimentsButtonRef.current?.focus();
      } else {
        closeSheet();
      }
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
  }, [sheet, experimentsOpen, closeSheet]);

  // Move the focus into the sheet, so a keyboard user is not left standing on
  // the button that opened it.
  useEffect(() => {
    if (sheet !== 'none') closeRef.current?.focus();
    if (experimentsOpen) experimentCloseRef.current?.focus();
  }, [sheet, experimentsOpen]);

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
    <div data-theme={theme} className="flex h-screen w-full flex-col overflow-hidden bg-lab-void supports-[height:100dvh]:h-dvh">
      {/* The first thing a keyboard user reaches. It is invisible until it is
          focused, which is the point of it. */}
      <a
        href="#bench"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:border focus:border-lab-accent focus:bg-lab-panel focus:px-3 focus:py-2 focus:text-[12px] focus:text-lab-accent"
      >
        Skip to the laboratory
      </a>

      <header className="relative z-30 flex shrink-0 flex-wrap items-center justify-between gap-x-3 border-b border-lab-line/80 bg-lab-panel/90 px-3 py-2 shadow-[0_1px_0_rgba(36,48,59,0.03)] backdrop-blur-xl sm:h-14 sm:px-5 lg:py-0">
        <h1 className="m-0 shrink-0 text-[13px] font-semibold tracking-[0.2em] text-lab-text sm:text-[15px] sm:tracking-[0.22em]">
          FRANKENLAB
        </h1>

          <div className="flex items-center gap-2 sm:gap-4">
          <button
            ref={experimentsButtonRef}
            type="button"
            onClick={() => setExperimentsOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={experimentsOpen}
            className="rounded-full border border-lab-line bg-lab-panel-raised px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-lab-muted transition-colors hover:border-lab-accent/60 hover:text-lab-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lab-accent sm:px-4"
          >
            Experiments
          </button>
          <div className="hidden text-right lg:block">
            <div className="text-[13px] text-lab-text">{experiment.name}</div>
            <div className="text-[10px] uppercase tracking-wider text-lab-dim">
              {experiment.discipline} · model {experiment.modelVersion}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setJudgeMode((mode) => !mode)}
            aria-pressed={judgeMode}
            className={["hidden rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] transition-colors xl:inline-flex", judgeMode ? "border-lab-accent bg-lab-accent text-white" : "border-lab-line bg-lab-panel-raised text-lab-muted hover:border-lab-accent/60 hover:text-lab-accent"].join(' ')}
          >
            {judgeMode ? 'Exit focus' : 'Judge mode'}
          </button>

          <button
            type="button"
            onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            aria-pressed={theme === 'dark'}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            className="lab-hoverable flex h-9 w-9 items-center justify-center rounded-full border border-lab-line bg-lab-panel-raised text-lab-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lab-accent"
          >
            <span aria-hidden>
              {theme === 'light' ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="3.5" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.6 8.6 0 1 0 20.5 15.2Z" />
                </svg>
              )}
            </span>
            <span className="sr-only">{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
          </button>

          <div className="flex items-center gap-2">
            <div role="status" aria-live="polite" className="hidden items-center gap-2 rounded-full border border-lab-line bg-lab-panel-raised px-3 py-1.5 sm:flex">
              <span className={`h-2 w-2 rounded-full ${running ? 'animate-pulse bg-lab-biology' : status === 'paused' ? 'bg-lab-alert' : status === 'complete' ? 'bg-lab-accent' : 'bg-lab-dim'}`} aria-hidden />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-lab-text">{status}</span>
            </div>
            <button
              type="button"
              onClick={running ? pause : start}
              aria-label={running ? 'Pause simulation' : status === 'paused' ? 'Resume simulation' : status === 'complete' ? 'Run simulation again' : 'Run simulation'}
              className="lab-hoverable inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-lab-accent px-4 text-[13px] font-semibold text-white shadow-[0_5px_18px_rgba(31,95,158,0.28)] hover:bg-lab-accent-dim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lab-accent sm:min-w-28 sm:px-5 sm:text-[14px]"
            >
              {running ? (
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden><rect x="4" y="3" width="4" height="14" rx="1" /><rect x="12" y="3" width="4" height="14" rx="1" /></svg>
              ) : (
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden><path d="M5 3.5a1 1 0 0 1 1.5-.86l10 6.5a1 1 0 0 1 0 1.72l-10 6.5A1 1 0 0 1 5 16.5v-13Z" /></svg>
              )}
              {running ? 'Pause' : status === 'paused' ? 'Resume' : status === 'complete' ? 'Run again' : 'Run'}
            </button>
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

      {experimentsOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#08111dcc] px-4 py-12 backdrop-blur-sm sm:py-20" role="dialog" aria-modal="true" aria-labelledby="experiments-title">
          <button
            type="button"
            aria-label="Close experiments"
            onClick={() => { setExperimentsOpen(false); experimentsButtonRef.current?.focus(); }}
            className="absolute inset-0 cursor-default"
          />
          <section className="relative z-10 w-full max-w-3xl overflow-hidden rounded-2xl border border-lab-line-bright bg-lab-panel shadow-2xl" aria-describedby="experiments-description">
            <div className="flex items-start justify-between gap-4 border-b border-lab-line px-5 py-4">
              <div>
                <h2 id="experiments-title" className="m-0 text-[19px] font-semibold text-lab-text sm:text-[21px]">Choose an experiment</h2>
                <p id="experiments-description" className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-lab-muted sm:text-[15px]">Open a ready-to-run bench or switch the disciplines on the table.</p>
              </div>
              <button
                ref={experimentCloseRef}
                type="button"
                onClick={() => { setExperimentsOpen(false); experimentsButtonRef.current?.focus(); }}
                aria-label="Close experiments dialog"
                title="Close experiments"
                className="lab-hoverable flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-lab-line bg-lab-panel-raised text-lab-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lab-accent"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <div className="grid max-h-[70vh] gap-3 overflow-y-auto p-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => { loadExperiment('build-your-own'); setExperimentsOpen(false); setGuideOpen(false); collapseLibrary(false); collapseTools(false); experimentsButtonRef.current?.focus(); }}
                className="rounded-lg border border-lab-accent/50 bg-lab-accent/10 px-4 py-3 text-left transition-colors hover:border-lab-accent hover:bg-lab-accent/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lab-accent sm:col-span-2"
              >
                <span className="block text-[16px] font-semibold text-lab-text">Build your own experiment</span>
                <span className="mt-1 block text-[13px] leading-relaxed text-lab-muted">Start with a clear tabletop. Add a battery and LED, connect their ports, then run your circuit.</span>
              </button>
              {EXPERIMENTS.map((entry) => {
                const active = experiment.id === entry.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => { loadExperiment(entry.id); setExperimentsOpen(false); experimentsButtonRef.current?.focus(); }}
                    className={["rounded-lg border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lab-accent", active ? "border-lab-accent/70 bg-lab-accent/10" : "border-lab-line bg-lab-panel-raised hover:border-lab-accent/50"].join(' ')}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[15px] font-semibold text-lab-text sm:text-[16px]">{entry.name}</span>
                      <span className="flex gap-1.5">
                        {entry.disciplines.map((discipline) => <span key={discipline} className="h-2.5 w-2.5 rounded-full" style={{ background: DISCIPLINE_COLOURS[discipline] ?? '#4fd1c5' }} aria-label={discipline} />)}
                      </span>
                    </div>
                    <p className="mt-2.5 text-[13px] leading-relaxed text-lab-muted sm:text-[14px]">{entry.summary}</p>
                    <p className="mt-2.5 text-[13px] font-medium leading-relaxed text-lab-text sm:text-[14px]">{entry.question}</p>
                    <div className="mt-3 rounded-md border border-lab-line bg-lab-panel/70 px-3 py-2.5">
                      <div className="lab-label text-lab-accent">Watch for</div>
                      <p className="mt-1.5 text-[12px] leading-relaxed text-lab-muted sm:text-[13px]">{entry.watch}</p>
                    </div>
                    <ol className="mt-3 space-y-1.5 text-[12px] leading-relaxed text-lab-muted sm:text-[13px]">
                      {entry.steps.map((step, index) => <li key={step}><span className="mr-1.5 font-mono text-lab-accent">0{index + 1}</span>{step}</li>)}
                    </ol>
                    {active && <span className="mt-3 block text-[10px] font-semibold uppercase tracking-widest text-lab-accent">Current experiment</span>}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}

      <div className="relative flex min-h-0 flex-1">
        {/* The catalogue. A column on a desktop, a sheet on a phone. */}
        <div className={[judgeMode || libraryCollapsed ? 'hidden' : 'hidden xl:flex', 'min-h-0 xl:absolute xl:bottom-5 xl:left-5 xl:top-5 xl:z-20 xl:w-80 xl:shrink-0 xl:overflow-hidden xl:rounded-2xl xl:border xl:border-white/80 xl:bg-lab-panel/90 xl:shadow-[0_18px_50px_rgba(59,68,75,0.16)] xl:backdrop-blur-xl'].join(' ')}>
          <Library onCollapse={() => collapseLibrary(true)} />
        </div>

        {!judgeMode && libraryCollapsed && (
          <button
            type="button"
            onClick={() => collapseLibrary(false)}
            className="absolute left-5 top-5 z-30 hidden items-center gap-2 rounded-full border border-lab-accent/50 bg-lab-panel/95 px-4 py-2.5 text-[13px] font-medium text-lab-accent shadow-lg backdrop-blur-xl transition-colors hover:bg-lab-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lab-accent xl:flex"
          >
            <span aria-hidden>☷</span> Components
          </button>
        )}

        <main id="bench" className="relative flex min-w-0 flex-1 flex-col bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.9),rgba(235,232,225,0.35)_62%,rgba(219,216,208,0.55))]">
          <div className="relative h-[48vh] min-h-[220px] shrink-0 lg:h-auto lg:min-h-0 lg:flex-1">
            {judgeMode && (
              <div className="pointer-events-none absolute left-1/2 top-5 z-20 w-[min(520px,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-white/80 bg-lab-panel/90 px-4 py-3 text-center shadow-[0_18px_50px_rgba(59,68,75,0.16)] backdrop-blur-xl">
                <div className="lab-label text-lab-accent">PRESENTATION MODE</div>
                <div className="mt-1 text-[18px] font-medium text-lab-text">{experiment.name}</div>
                <p className="mt-1 text-[12px] text-lab-muted">{experimentEntry.question}</p>
                <div className="mt-2 text-[10px] uppercase tracking-wider text-lab-dim">Watch: {experimentEntry.watch}</div>
              </div>
            )}
            {guideOpen && !judgeMode && (
              <section className="absolute left-1/2 top-5 z-20 w-[min(430px,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-white/80 bg-lab-panel/95 p-4 shadow-[0_18px_50px_rgba(59,68,75,0.16)] backdrop-blur-xl" aria-labelledby="getting-started-title">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="lab-label text-lab-accent">FIRST RUN</div>
                    <h2 id="getting-started-title" className="mt-1 text-[16px] font-medium text-lab-text">Make the causal chain move</h2>
                  </div>
                  <button type="button" onClick={dismissGuide} aria-label="Dismiss getting started guide" className="text-[18px] leading-none text-lab-dim hover:text-lab-text">×</button>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-lab-muted">{experimentEntry.summary}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {experimentEntry.steps.map((step, index) => (
                    <div key={step} className="rounded-xl border border-lab-line bg-lab-panel-raised px-2.5 py-2">
                      <div className="font-mono text-[10px] text-lab-accent">0{index + 1}</div>
                      <div className="mt-1 text-[11px] leading-snug text-lab-text">{step}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                  <button type="button" onClick={() => setExperimentsOpen(true)} className="rounded-full border border-lab-line px-3 py-1.5 text-[10px] uppercase tracking-wider text-lab-muted hover:border-lab-accent/60 hover:text-lab-accent">Choose experiment</button>
                  <button type="button" onClick={() => { if (experiment.id !== 'biocircuit') loadExperiment('biocircuit'); start(); dismissGuide(); setExperimentsOpen(false); }} className="rounded-full bg-lab-accent px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-white hover:bg-lab-accent/90">Run flagship</button>
                </div>
              </section>
            )}
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
        <aside className={[judgeMode || toolsCollapsed ? 'hidden' : 'hidden xl:flex', 'min-h-0 xl:absolute xl:bottom-5 xl:right-5 xl:top-5 xl:z-20 xl:w-80 xl:overflow-hidden xl:rounded-2xl xl:border xl:border-white/80 xl:bg-lab-panel/90 xl:shadow-[0_18px_50px_rgba(59,68,75,0.16)] xl:backdrop-blur-xl'].join(' ')}>
          <div className="flex h-full w-full flex-col">
            <div className="flex shrink-0 border-b border-lab-line" role="tablist" aria-label="Tools">
              <div className="flex min-w-0 flex-1">
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
                      'lab-hoverable flex-1 px-4 py-2.5 text-[12px] uppercase tracking-wider',
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
              <button
                type="button"
                onClick={() => collapseTools(true)}
                aria-label="Collapse inspector and assistant panel"
                title="Collapse tools panel"
                className="lab-hoverable flex w-10 shrink-0 items-center justify-center border-l border-lab-line text-lab-dim hover:text-lab-accent focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lab-accent"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </button>
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

        {!judgeMode && toolsCollapsed && (
          <button
            type="button"
            onClick={() => collapseTools(false)}
            aria-label="Open inspector and assistant panel"
            title="Open tools panel"
            className="absolute right-5 top-5 z-30 hidden items-center gap-2 rounded-full border border-lab-accent/50 bg-lab-panel/95 px-4 py-2.5 text-[13px] font-medium text-lab-accent shadow-lg backdrop-blur-xl transition-colors hover:bg-lab-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lab-accent xl:flex"
          >
            <span aria-hidden>◁</span> Tools
          </button>
        )}
      </div>

      {/* The panels a phone can reach. */}
      <nav
        className={[judgeMode ? 'hidden' : 'flex', 'shrink-0 border-t border-lab-line bg-lab-panel xl:hidden'].join(' ')}
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
              'lab-hoverable flex-1 border-t-2 px-3 py-2.5 text-[12px] uppercase tracking-wider',
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
                <Library onPartAdded={closeSheet} />
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
