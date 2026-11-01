'use client';

/**
 * The lab assistant.
 *
 * The assistant reads the experiment and the readings through the same kernel
 * the rest of the product uses. With no provider configured it answers from
 * the structured context alone, so the panel always works.
 */

import { useState } from 'react';
import { useLabStore } from '@/state/lab';
import { Markdown } from '@/components/Markdown';
import { CONFIDENCE_LABEL, CONFIDENCE_TONE } from '@/confidence';

const SUGGESTIONS = [
  'What is this experiment?',
  'What happened in the results?',
  'How much should I trust these models?',
  'How do the disciplines interact?',
];

export function Assistant() {
  const messages = useLabStore((s) => s.messages);
  const busy = useLabStore((s) => s.assistantBusy);
  const ask = useLabStore((s) => s.ask);
  const [draft, setDraft] = useState('');

  const send = (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || busy) return;
    setDraft('');
    void ask(trimmed);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-lab-line px-4 py-3">
        <div className="lab-label">Lab assistant</div>
        <p className="mt-1 text-[12px] leading-relaxed text-lab-muted">
          It answers from the experiment and the readings, not from memory.
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="space-y-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => send(suggestion)}
                className="block w-full rounded-md border border-lab-line bg-lab-panel-raised px-3 py-2 text-left text-[12px] text-lab-muted transition-colors hover:border-lab-accent/60 hover:text-lab-text"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={[
              'rounded-lg px-3 py-2 text-[12px] leading-relaxed',
              message.role === 'user'
                ? 'ml-6 bg-lab-accent/10 text-lab-text'
                : 'mr-4 bg-lab-panel-raised text-lab-muted',
            ].join(' ')}
          >
            {message.role === 'user' ? (
              message.content
            ) : (
              <>
                <Markdown text={message.content} />
                {message.confidence && (
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={[
                        'rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider',
                        CONFIDENCE_TONE[message.confidence] ?? CONFIDENCE_TONE['hypothetical'],
                      ].join(' ')}
                    >
                      {CONFIDENCE_LABEL[message.confidence]}
                    </span>
                    <span className="text-[10px] text-lab-dim">weakest model in this experiment</span>
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        {busy && (
          <div className="mr-4 rounded-lg bg-lab-panel-raised px-3 py-2 text-[12px] text-lab-dim">
            Reading the experiment…
          </div>
        )}
      </div>

      <form
        className="flex gap-2 border-t border-lab-line p-3"
        onSubmit={(event) => {
          event.preventDefault();
          send(draft);
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask about the experiment…"
          aria-label="Ask about the experiment"
          className="min-w-0 flex-1 rounded-md border border-lab-line bg-lab-void px-3 py-2 text-[12px] text-lab-text placeholder:text-lab-dim focus:border-lab-accent/60 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lab-accent"
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="rounded-md border border-lab-accent/40 bg-lab-accent/10 px-3 py-2 text-[12px] text-lab-accent transition-colors hover:bg-lab-accent/20 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lab-accent disabled:opacity-40"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
