'use client';

/**
 * The couplings panel.
 *
 * This is the panel that makes the Frankenstein claim visible.
 *
 * A circuit cannot know about a plant, and a plant cannot know about a
 * circuit. What they share is a named rule, declared in
 * `src/interactions/couplings.ts`, that says which quantity crosses the
 * boundary and how much the crossing is worth.
 *
 * The panel shows the rules that are carrying this experiment right now. It
 * is derived from the live graph, so cutting a wire or adding a part changes
 * it. And when nothing crosses over, it says so rather than pretending
 * otherwise.
 */

import { useMemo } from 'react';
import { useLabStore } from '@/state/lab';
import { activeCouplings, type CouplingLink } from '@/interactions/active-couplings';
import type { InteractionCoupling } from '@/interactions/couplings';
import { DISCIPLINE_COLOURS, DISCIPLINE_ORDER } from '@/world';
import { CONFIDENCE_LABEL, CONFIDENCE_TONE } from '@/confidence';

/** Spell out a small count, so the sentence reads like English. */
const NUMBER_WORDS = [
  'no',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
];

function countWord(n: number, singular: string, plural: string): string {
  const word = NUMBER_WORDS[n] ?? String(n);
  return `${word} ${n === 1 ? singular : plural}`;
}

/** Start a sentence with a capital, because the counts are spelled out. */
function sentence(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function CouplingCard({
  coupling,
  links,
}: {
  coupling: InteractionCoupling;
  links: readonly CouplingLink[];
}) {
  return (
    <div className="rounded border border-lab-line bg-lab-panel-raised px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[13px] leading-snug text-lab-text">{coupling.name}</span>
        <span
          className={[
            'shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider',
            CONFIDENCE_TONE[coupling.confidence],
          ].join(' ')}
        >
          {CONFIDENCE_LABEL[coupling.confidence]}
        </span>
      </div>

      <p className="mt-1 text-[12px] leading-snug text-lab-muted">{coupling.chain}</p>

      <ul className="mt-2 space-y-1">
        {links.map((link) => (
          <li key={link.connectionId} className="flex items-center gap-1.5 text-[11px]">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: DISCIPLINE_COLOURS[link.sourceDiscipline] ?? '#4fd1c5' }}
              aria-hidden
            />
            <span className="text-lab-text">{link.sourceLabel}</span>
            <span className="text-lab-dim" aria-hidden>
              →
            </span>
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: DISCIPLINE_COLOURS[link.targetDiscipline] ?? '#4fd1c5' }}
              aria-hidden
            />
            <span className="text-lab-text">{link.targetLabel}</span>
            <span className="ml-auto pl-2 text-lab-dim">{link.sourceChannel}</span>
          </li>
        ))}
      </ul>

      {coupling.notes.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-lab-dim hover:text-lab-muted">
            What this rule leaves out
          </summary>
          <ul className="mt-1 space-y-1">
            {coupling.notes.map((note) => (
              <li key={note} className="text-[11px] leading-snug text-lab-dim">
                {note}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export function Couplings() {
  const experiment = useLabStore((s) => s.experiment);
  const registry = useLabStore((s) => s.registry);

  const summary = useMemo(() => activeCouplings(experiment, registry), [experiment, registry]);

  const disciplines = useMemo(() => {
    const engineNames = new Map(
      registry.listDisciplines().map((engine) => [engine.id, engine.name] as const),
    );
    return summary.disciplines
      .map((id) => ({ id, name: engineNames.get(id) ?? id }))
      .sort(
        (a, b) =>
          DISCIPLINE_ORDER.indexOf(a.id as (typeof DISCIPLINE_ORDER)[number]) -
          DISCIPLINE_ORDER.indexOf(b.id as (typeof DISCIPLINE_ORDER)[number]),
      );
  }, [registry, summary.disciplines]);

  if (summary.couplings.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center px-8 text-center text-[12px] leading-relaxed text-lab-dim">
        Nothing crosses over on this bench. Every wire stays inside one discipline, so there is no coupling to
        declare.
      </div>
    );
  }

  return (
    <div className="max-h-56 overflow-y-auto px-3 pb-3">
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-lab-dim">
        <span className="flex flex-wrap items-center gap-3">
          {disciplines.map(({ id, name }) => (
            <span key={id} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: DISCIPLINE_COLOURS[id] ?? '#4fd1c5' }}
                aria-hidden
              />
              <span className="text-lab-muted">{name}</span>
            </span>
          ))}
        </span>
        <span>
          {sentence(
            `${countWord(disciplines.length, 'discipline', 'disciplines')} on this bench, held together by ` +
              `${countWord(summary.couplings.length, 'declared coupling', 'declared couplings')} across ` +
              `${countWord(summary.linkCount, 'wire', 'wires')}.`,
          )}
        </span>
      </div>

      <div className="space-y-2">
        {summary.couplings.map((entry) => (
          <CouplingCard key={entry.coupling.id} coupling={entry.coupling} links={entry.links} />
        ))}
      </div>
    </div>
  );
}
