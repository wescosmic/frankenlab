# Brief 4 — The assistant earns trust

**Agent:** `lab-lead` · **Phase:** 4 · **Do not commit.**

## Context

FrankenLab, at `C:\Users\Wesley\.mavis\workspace\frankenlab`. Read
`.kiro/steering/scientific-integrity.md`, `.kiro/steering/product.md` and
`docs/ARCHITECTURE.md` first.

The product's rule is: **the simulation computes, the AI interprets, the user
decides.** The first two are done. The third is not, because the assistant has
never been shown refusing a number in front of the user.

That refusal is the most convincing thing the assistant can do. A judge who
can break it on purpose and watch it hold is worth more than a judge who reads
a paragraph about trustworthiness.

## 4.1 Surface the grounded-number guard in the UI

`src/assistant/assistant.ts` already has a `findUnsupportedNumbers` guard
that catches a reply containing a number the kernel did not produce. It is
currently exercised only in tests.

Show it. When a reply contains an unsupported number, the user sees that it
was flagged, in the assistant panel, next to the reply. Not a silent fix. Not
a generic error. A visible mark on the specific number.

## 4.2 An optional live provider

`LocalExplainProvider` stays the default and the product must keep working
identically with the provider disabled — no API key, no network.

Add one optional provider that calls a configured endpoint. It must be
configured entirely through the environment, and with nothing configured the
product behaves exactly as it does now.

The provider path is covered by tests that stub the network. **Do not make a
real network call in a test.**

## 4.3 Compare two runs

The assistant can put two experiments side by side with real numbers on both
sides. This is `compare_experiments`, which was deliberately excluded from the
MVP until a run history existed. It needs one.

Keep the run history in the store: what was run, with which substrate and
which parameters, and its observations. Nothing persisted to a server. Nothing
that survives a reload.

## 4.4 The assistant explains confidence

Every component carries a confidence level: `physical-law`,
`established-simplified`, `illustrative`, `hypothetical`. When the assistant
answers, it should be able to say which parts of its answer rest on physics
and which rest on a teaching simplification.

This is the product's scientific-honesty claim, expressed in the one place a
user asks questions. It should be visible without being asked, and it should
be honest about the parts of the model that are illustrative.

## Rules that are not negotiable

- The assistant is never the source of a number. It cites what the kernel
  produced.
- The product works with no API key and no network. That is what makes the
  demonstration safe to record.
- No claim of accuracy the model does not have.
- Plain English, short sentences, British spellings. No em dashes in copy.

## Acceptance

- A provider that invents a number is visibly flagged in the assistant panel.
- The product behaves identically with the provider disabled and with no
  environment variables set.
- The provider path has tests that stub the network, and no test makes a real
  network call.
- The assistant can compare two runs and cites real numbers on both sides.
- The assistant states the confidence level of the components it is talking
  about.
- `npm run typecheck`, `npm run lint` and `npm test` are clean.

## A note about the shell on this machine

The shell tool here is Windows PowerShell, where `&&` is **not** a valid
statement separator. Chain commands with `;`, or run them one at a time.

## When you are done

Report what you changed, what the assistant says when it is asked about a
component's confidence, and anything you left unfinished. Do not commit.
