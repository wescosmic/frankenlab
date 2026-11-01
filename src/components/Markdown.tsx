'use client';

/**
 * A small markdown renderer for the assistant panel.
 *
 * The assistant writes markdown — bold, code, bullets, rules — and the panel
 * used to show the raw asterisks. This renders it properly.
 *
 * It is deliberately not a markdown library: the assistant's output is
 * generated text, it only needs a handful of marks, and building React
 * elements means there is no HTML injection anywhere in the panel.
 */

import type { ReactNode } from 'react';

const INLINE = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`)/g;

/** Render the inline marks in a line of text. */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let index = 0;

  INLINE.lastIndex = 0;
  let match = INLINE.exec(text);
  while (match !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));

    const token = match[0];
    if (token.startsWith('**')) {
      nodes.push(<strong key={`${keyPrefix}-b${index}`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('`')) {
      nodes.push(
        <code
          key={`${keyPrefix}-c${index}`}
          className="rounded bg-lab-line px-1 py-px font-mono text-[11px] text-lab-text"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      nodes.push(<em key={`${keyPrefix}-i${index}`}>{token.slice(1, -1)}</em>);
    }

    index += 1;
    lastIndex = match.index + token.length;
    match = INLINE.exec(text);
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

/**
 * Render a block of markdown.
 *
 * Supports: headings, bullet lists, horizontal rules, bold, italic and inline
 * code. Anything else is shown as a paragraph, which is the right fallback
 * for prose.
 */
export function Markdown({ text }: { readonly text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.split('\n');
  let bullets: string[] = [];

  const flushBullets = (): void => {
    if (bullets.length === 0) return;
    const key = `ul-${blocks.length}`;
    blocks.push(
      <ul key={key} className="my-1 list-disc space-y-0.5 pl-4">
        {bullets.map((item, index) => (
          <li key={`${key}-${index}`}>{renderInline(item, `${key}-${index}`)}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('- ')) {
      bullets.push(trimmed.slice(2));
      continue;
    }

    flushBullets();

    if (trimmed.length === 0) continue;

    if (trimmed === '---') {
      blocks.push(<hr key={`hr-${blocks.length}`} className="my-2 border-lab-line" />);
      continue;
    }

    if (trimmed.startsWith('### ')) {
      const key = `h-${blocks.length}`;
      blocks.push(
        <p key={key} className="mt-2 text-[12px] font-semibold text-lab-text">
          {renderInline(trimmed.slice(4), key)}
        </p>,
      );
      continue;
    }

    const key = `p-${blocks.length}`;
    blocks.push(<p key={key}>{renderInline(trimmed, key)}</p>);
  }

  flushBullets();

  return <div className="space-y-0.5">{blocks}</div>;
}
