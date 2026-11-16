'use client';

/**
 * The component library.
 *
 * Every component the product knows about, grouped by discipline. Each entry
 * carries its confidence level, because that is part of what a component *is*
 * in FrankenLab — not a footnote.
 */

import { useState } from 'react';
import { useLabStore } from '@/state/lab';
import { DISCIPLINE_COLOURS, DISCIPLINE_ORDER } from '@/world';
import { DRAG_TYPE } from '@/drag';
import { CONFIDENCE_LABEL } from '@/confidence';
import type { ComponentDefinition } from '@/kernel/types';
import { COMPONENT_MODEL_ALT, COMPONENT_THUMBNAIL_PATHS } from '@/visual-assets';

function InventoryThumbnail({ type, shape, colour, alt }: { type: string; shape: ComponentDefinition['visual']['shape']; colour: string; alt: string }) {
  const resistor = type.endsWith('.resistor');
  const battery = type.endsWith('.voltage-source');
  const led = type.endsWith('.led');
  const plant = type === 'biology.plant';
  const glassware = type.startsWith('chemistry.') || type.includes('culture') || type.includes('nutrient');
  return (
    <svg viewBox="0 0 128 128" role="img" aria-label={alt} className="absolute inset-0 z-0 h-full w-full p-1">
      <rect width="128" height="128" rx="14" fill="#111820" />
      {resistor ? <>
        <path d="M12 64h28M88 64h28" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
        <rect x="38" y="47" width="52" height="34" rx="7" fill="#d3a36b" stroke="#f4d2a3" strokeWidth="3" />
        <path d="M49 48v32M60 48v32M71 48v32M82 48v32" stroke="#8f3d32" strokeWidth="6" />
      </> : battery ? <>
        <rect x="27" y="40" width="74" height="48" rx="8" fill="#1f2937" stroke="#4fd1c5" strokeWidth="3" />
        <rect x="101" y="54" width="8" height="20" rx="2" fill="#f0b350" />
        <path d="M43 48v32M58 48v32" stroke="#94a3b8" strokeWidth="3" />
        <text x="71" y="70" textAnchor="middle" fill="#e5e7eb" fontSize="13" fontFamily="sans-serif">DC</text>
      </> : led ? <>
        <path d="M42 89h44M50 89l-5 17M78 89l5 17" stroke="#cbd5e1" strokeWidth="3" />
        <path d="M64 22c-18 0-28 14-28 29 0 12 7 19 15 25h26c8-6 15-13 15-25 0-15-10-29-28-29Z" fill="#ef6461" fillOpacity=".78" stroke="#ff9b68" strokeWidth="4" />
        <circle cx="55" cy="43" r="6" fill="#fff" fillOpacity=".55" />
      </> : plant ? <>
        <path d="M39 72h50l-7 34H46Z" fill="#8a5a44" stroke="#d6a47c" strokeWidth="3" />
        <path d="M64 75V30M64 51c-20-2-25-14-25-22 18 0 27 8 25 22ZM65 62c20-2 25-14 25-22-18 0-27 8-25 22Z" fill={colour} fillOpacity=".9" stroke="#b9ef8d" strokeWidth="3" />
      </> : glassware ? <>
        <path d="M49 23h30M54 23v22L34 93c-2 7 4 12 11 12h38c7 0 13-5 11-12L74 45V23" fill="#9ed9eb" fillOpacity=".32" stroke="#9ed9eb" strokeWidth="4" />
        <path d="M42 82h44" stroke="#4fd1c5" strokeWidth="5" /><circle cx="81" cy="38" r="4" fill="#fff" fillOpacity=".7" />
      </> : <>
        <rect x="25" y="30" width="78" height="62" rx="10" fill={colour} fillOpacity=".22" stroke={colour} strokeWidth="4" />
        {(shape === 'sphere' || shape === 'organic') && <circle cx="64" cy="61" r="27" fill={colour} fillOpacity=".32" stroke={colour} strokeWidth="4" />}
        {shape === 'cylinder' && <ellipse cx="64" cy="30" rx="28" ry="9" fill={colour} fillOpacity=".4" stroke={colour} strokeWidth="3" />}
        <path d="M38 108h52" stroke="#64748b" strokeWidth="3" /><circle cx="92" cy="105" r="4" fill="#f0b350" />
      </>}
    </svg>
  );
}

function InventoryVisual({ definition, colour }: { definition: ComponentDefinition; colour: string }) {
  const visual = definition.inventoryVisual;
  const image = visual?.thumbnail ?? visual?.image;
  const productImage = COMPONENT_THUMBNAIL_PATHS[definition.type];
  if (productImage || visual?.model) return (
    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-lab-line bg-lab-panel-raised" style={{ boxShadow: `inset 0 0 18px ${colour}22` }} aria-label={visual?.alt ?? COMPONENT_MODEL_ALT[definition.type] ?? `${definition.name} model`}>
      {productImage ? (
        // These are local, generated product photos—not remote URLs or CSS silhouettes.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={productImage} alt={visual?.alt ?? definition.name} className="h-full w-full object-cover" loading="eager" decoding="async" draggable={false} />
      ) : (
        <InventoryThumbnail type={definition.type} shape={definition.visual.shape} colour={colour} alt={visual?.alt ?? definition.name} />
      )}
    </div>
  );
  return (
    <div
      className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-lab-line bg-lab-panel-raised"
      style={{ boxShadow: `inset 0 0 18px ${colour}22` }}
      aria-label={visual?.alt ?? definition.name}
    >
      {image ? (
        // Local artwork is preferred, but every card has a visible fallback.
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
    </div>
  );
}

export function Library({ onCollapse, onPartAdded }: { onCollapse?: () => void; onPartAdded?: () => void } = {}) {
  const registry = useLabStore((s) => s.registry);
  const experiment = useLabStore((s) => s.experiment);
  const selectedId = useLabStore((s) => s.selectedId);
  const select = useLabStore((s) => s.select);
  const addComponentHere = useLabStore((s) => s.addComponentHere);
  const [collapsedDisciplines, setCollapsedDisciplines] = useState<Set<string>>(new Set());

  const disciplines = registry.listDisciplines().filter((d) => d.id !== '__couplings__');
  const ordered = [
    ...DISCIPLINE_ORDER.map((id) => disciplines.find((d) => d.id === id)).filter(
      (d): d is NonNullable<typeof d> => Boolean(d),
    ),
    ...disciplines.filter((d) => !DISCIPLINE_ORDER.includes(d.id as never)),
  ];

  return (
    <aside className="flex h-full min-h-0 w-full flex-col bg-lab-panel">
      <div className="shrink-0 border-b border-lab-line px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="lab-label m-0">Components inventory</h2>
            <p className="mt-1 text-[14px] leading-snug text-lab-muted">
              <span className="hidden lg:inline">
                Drag a part onto the bench, or use + to place it there.
              </span>
              <span className="lg:hidden">
                Use + to place a part on the bench.
              </span>
            </p>
          </div>
          {onCollapse && <button
            type="button"
            onClick={onCollapse}
            aria-label="Collapse components inventory"
            title="Collapse components inventory"
            className="lab-hoverable flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-lab-line text-lab-dim hover:text-lab-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lab-accent"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="m15 18-6-6 6-6" /></svg>
          </button>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        {ordered.map((discipline) => {
          const colour = DISCIPLINE_COLOURS[discipline.id] ?? '#4fd1c5';
          const collapsed = collapsedDisciplines.has(discipline.id);
          return (
            <section key={discipline.id} className="mb-4">
              <button
                type="button"
                onClick={() => setCollapsedDisciplines((current) => {
                  const next = new Set(current);
                  if (next.has(discipline.id)) next.delete(discipline.id);
                  else next.add(discipline.id);
                  return next;
                })}
                aria-expanded={!collapsed}
                className="flex w-full items-center gap-2 px-2 pb-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lab-accent"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: colour }}
                  aria-hidden
                />
                <span className="lab-label m-0 flex-1">{discipline.name}</span>
                <span className="text-[14px] text-lab-dim" aria-hidden>{collapsed ? '+' : '−'}</span>
              </button>
              {!collapsed && <ul className="space-y-1">
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
                          'lab-hoverable flex-1 cursor-grab rounded-xl border px-2 py-2 text-left active:cursor-grabbing',
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
                              <span className="truncate text-[15px] font-medium text-lab-text">{definition.name}</span>
                              {used.length > 0 && (
                                <span className="lab-value rounded bg-lab-line px-1.5 py-0.5 text-[10px] text-lab-muted">
                                  {used.length}
                                </span>
                              )}
                            </span>
                            <span className="mt-1 block text-[12px] leading-snug text-lab-muted">{definition.description}</span>
                            <span className="mt-1.5 block text-[10px] uppercase tracking-wider text-lab-dim">
                              {CONFIDENCE_LABEL[definition.confidence] ?? definition.confidence}
                            </span>
                          </span>
                        </div>
                      </button>

                      {/* Dragging is a pointer gesture. This is the same
                          action, reachable from the keyboard. */}
                      <button
                        type="button"
                        onClick={() => {
                          if (addComponentHere(definition.type)) onPartAdded?.();
                        }}
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
              </ul>}
            </section>
          );
        })}
      </div>
    </aside>
  );
}
