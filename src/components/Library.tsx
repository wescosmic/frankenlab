'use client';

/**
 * The component library.
 *
 * Every component the product knows about, grouped by discipline. Each entry
 * carries its confidence level, because that is part of what a component *is*
 * in FrankenLab — not a footnote.
 */

import { useLabStore } from '@/state/lab';
import { DISCIPLINE_COLOURS, DISCIPLINE_ORDER } from '@/world';
import { DRAG_TYPE } from '@/drag';
import { EXPERIMENTS } from '@/scenarios';
import { CONFIDENCE_LABEL } from '@/confidence';
import type { ComponentDefinition } from '@/kernel/types';

function InventoryVisual({ definition, colour }: { definition: ComponentDefinition; colour: string }) {
  const visual = definition.inventoryVisual;
  const image = visual?.thumbnail ?? visual?.image;
  return (
    <div
      className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded border border-lab-line bg-[#111820]"
      style={{ boxShadow: `inset 0 0 18px ${colour}22` }}
      aria-label={visual?.alt ?? `${definition.name} technical silhouette`}
    >
      {image ? (
        // Local artwork is preferred, but every card has the CSS fallback below.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={visual?.alt ?? definition.name} className="h-full w-full object-contain p-1" />
      ) : (
        <div className="relative h-9 w-9" aria-hidden>
          <div
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-2 ${
              definition.visual.shape === 'cylinder' ? 'h-8 w-5 rounded-full' :
              definition.visual.shape === 'sphere' || definition.visual.shape === 'organic' ? 'h-8 w-8 rounded-full' :
              definition.visual.shape === 'torus' ? 'h-8 w-8 rounded-full border-[5px]' :
              definition.visual.shape === 'plate' ? 'h-3 w-9 rounded-sm' : 'h-6 w-8 rounded-sm'
            }`}
            style={{ borderColor: colour, background: `${colour}22`, boxShadow: `0 0 12px ${colour}44` }}
          />
          <span className="absolute bottom-0 left-1/2 h-px w-8 -translate-x-1/2 bg-lab-dim/60" />
        </div>
      )}
      <span className="absolute bottom-0.5 right-1 text-[8px] uppercase tracking-widest text-lab-dim">
        {visual?.kind === 'cutaway' ? 'CUT' : 'LAB'}
      </span>
    </div>
  );
}

export function Library() {
  const registry = useLabStore((s) => s.registry);
  const experiment = useLabStore((s) => s.experiment);
  const selectedId = useLabStore((s) => s.selectedId);
  const select = useLabStore((s) => s.select);
  const addComponentHere = useLabStore((s) => s.addComponentHere);
  const loadExperiment = useLabStore((s) => s.loadExperiment);

  const disciplines = registry.listDisciplines().filter((d) => d.id !== '__couplings__');
  const ordered = [
    ...DISCIPLINE_ORDER.map((id) => disciplines.find((d) => d.id === id)).filter(
      (d): d is NonNullable<typeof d> => Boolean(d),
    ),
    ...disciplines.filter((d) => !DISCIPLINE_ORDER.includes(d.id as never)),
  ];

  return (
    <aside className="flex h-full min-h-0 w-full flex-col bg-lab-panel">
      <div className="border-b border-lab-line px-4 py-3">
        <h2 className="lab-label m-0">Experiments</h2>
        <p className="mt-1 text-[13px] leading-snug text-lab-muted">
          One bench, several sciences. Open one and run it.
        </p>
      </div>

      <div className="border-b border-lab-line px-2 py-2">
        {EXPERIMENTS.map((entry) => {
          const active = experiment.id === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => loadExperiment(entry.id)}
              title={entry.summary}
              className={[
                'mb-1 w-full rounded-md border px-2.5 py-2 text-left transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lab-accent',
                active
                  ? 'border-lab-accent/60 bg-lab-accent/10'
                  : 'border-transparent hover:border-lab-line hover:bg-lab-panel-raised',
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] text-lab-text">{entry.name}</span>
                <span className="flex gap-1">
                  {entry.disciplines.map((discipline) => (
                    <span
                      key={discipline}
                      className="h-2 w-2 rounded-full"
                      style={{ background: DISCIPLINE_COLOURS[discipline] ?? '#4fd1c5' }}
                      aria-hidden
                    />
                  ))}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-lab-dim">{entry.summary}</p>
            </button>
          );
        })}
      </div>

      <div className="border-b border-lab-line px-4 py-3">
        <h2 className="lab-label m-0">Components</h2>
        <p className="mt-1 text-[13px] leading-snug text-lab-muted">
          {/* Dragging is a pointer gesture. A phone gets the add button. */}
          <span className="hidden lg:inline">
            Drag a part onto the bench, or press the add button to put it there.
          </span>
          <span className="lg:hidden">
            Press the add button to put a part on the bench.
          </span>
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        {ordered.map((discipline) => {
          const colour = DISCIPLINE_COLOURS[discipline.id] ?? '#4fd1c5';
          return (
            <section key={discipline.id} className="mb-4">
              <div className="flex items-center gap-2 px-2 pb-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: colour }}
                  aria-hidden
                />
                <h3 className="lab-label m-0">{discipline.name}</h3>
              </div>
              <ul className="space-y-1">
                {discipline.components.map((definition) => {
                  const used = experiment.components.filter(
                    (c) => c.type === definition.type,
                  );
                  const active = used.some((c) => c.id === selectedId);

                  return (
                    <li key={definition.type} className="flex items-stretch gap-1">
                      <button
                        type="button"
                        draggable
                        onDragStart={(event) => {
                          // The bench takes the part type and puts a part of
                          // that type where it is dropped.
                          event.dataTransfer.setData(DRAG_TYPE, definition.type);
                          event.dataTransfer.effectAllowed = 'copy';
                        }}
                        onClick={() => select(used[0]?.id ?? null)}
                        title={`Drag onto the bench to add a ${definition.name}`}
                        className={[
                          'flex-1 cursor-grab rounded-md border px-2.5 py-2 text-left transition-colors active:cursor-grabbing',
                          'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lab-accent',
                          active
                            ? 'border-lab-accent/60 bg-lab-accent/10'
                            : 'border-transparent hover:border-lab-line hover:bg-lab-panel-raised',
                        ].join(' ')}
                      >
                        <div className="flex items-center gap-2">
                          <InventoryVisual definition={definition} colour={colour} />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="truncate text-[13px] text-lab-text">{definition.name}</span>
                              {used.length > 0 && (
                                <span className="lab-value rounded bg-lab-line px-1.5 py-0.5 text-[10px] text-lab-muted">
                                  {used.length}
                                </span>
                              )}
                            </span>
                            <span className="mt-0.5 block text-[10px] leading-snug text-lab-muted">{definition.description}</span>
                            <span className="mt-1 block text-[9px] uppercase tracking-wider text-lab-dim">
                              {CONFIDENCE_LABEL[definition.confidence] ?? definition.confidence} · {definition.inventoryVisual?.kind ?? 'technical silhouette'}
                            </span>
                          </span>
                        </div>
                      </button>

                      {/* Dragging is a pointer gesture. This is the same
                          action, reachable from the keyboard. */}
                      <button
                        type="button"
                        onClick={() => addComponentHere(definition.type)}
                        aria-label={`Add a ${definition.name} to the bench`}
                        title={`Add a ${definition.name} to the bench`}
                        className={[
                          'w-8 shrink-0 rounded-md border border-transparent text-[15px] leading-none text-lab-dim',
                          'transition-colors hover:border-lab-accent/40 hover:text-lab-accent',
                          'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lab-accent',
                        ].join(' ')}
                      >
                        +
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </aside>
  );
}
