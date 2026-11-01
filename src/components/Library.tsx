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

const CONFIDENCE_LABEL: Record<string, string> = {
  'physical-law': 'Physical law',
  'established-simplified': 'Simplified model',
  illustrative: 'Illustrative',
  hypothetical: 'Hypothetical',
};

export function Library() {
  const registry = useLabStore((s) => s.registry);
  const experiment = useLabStore((s) => s.experiment);
  const selectedId = useLabStore((s) => s.selectedId);
  const select = useLabStore((s) => s.select);

  const disciplines = registry.listDisciplines().filter((d) => d.id !== '__couplings__');
  const ordered = [
    ...DISCIPLINE_ORDER.map((id) => disciplines.find((d) => d.id === id)).filter(
      (d): d is NonNullable<typeof d> => Boolean(d),
    ),
    ...disciplines.filter((d) => !DISCIPLINE_ORDER.includes(d.id as never)),
  ];

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-lab-line bg-lab-panel">
      <div className="border-b border-lab-line px-4 py-3">
        <div className="lab-label">Components</div>
        <p className="mt-1 text-[13px] leading-snug text-lab-muted">
          Drag a part onto the bench to add it.
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
                <span className="lab-label">{discipline.name}</span>
              </div>

              <ul className="space-y-1">
                {discipline.components.map((definition) => {
                  const used = experiment.components.filter(
                    (c) => c.type === definition.type,
                  );
                  const active = used.some((c) => c.id === selectedId);

                  return (
                    <li key={definition.type}>
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
                          'w-full cursor-grab rounded-md border px-2.5 py-2 text-left transition-colors active:cursor-grabbing',
                          active
                            ? 'border-lab-accent/60 bg-lab-accent/10'
                            : 'border-transparent hover:border-lab-line hover:bg-lab-panel-raised',
                        ].join(' ')}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] text-lab-text">{definition.name}</span>
                          {used.length > 0 && (
                            <span className="lab-value rounded bg-lab-line px-1.5 py-0.5 text-[10px] text-lab-muted">
                              {used.length}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-[10px] uppercase tracking-wider text-lab-dim">
                          {CONFIDENCE_LABEL[definition.confidence] ?? definition.confidence}
                        </div>
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
