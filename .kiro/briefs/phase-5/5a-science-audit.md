# Brief 5a — Audit the medium constants against published figures

**Agent:** `science-reviewer` · **Phase:** 5 · **Do not commit.**

## Context

FrankenLab, at `C:\Users\Wesley\.mavis\workspace\frankenlab`.

This brief exists to answer two things at once: are our numbers honest, and
does the Kiro setup actually earn its keep? It is a real audit with a real
outcome, and it is also the first run that uses the project's own Kiro Power
and an MCP server.

Two things are new and you should use them.

**The `frankenlab` Power is installed.** It carries two skills and a
reference:

- `verify-a-model` — the checklist a science model has to pass.
- `add-a-discipline` — how a discipline is added without touching the kernel.
- `references/confidence-levels.md` — what each confidence level requires.

Read `verify-a-model` before you start. It is the procedure.

**The `fetch` MCP server is configured for this workspace.** It fetches a URL
and returns the text. Use it to read published figures rather than working
from memory.

## The task

The materials engine carries four teaching presets. Each one states a field
capacity, a wilting point and, as of the Phase 2 work, a saturation point.
Those numbers are presented in the workbench, in the inspector and to the
assistant, and they are labelled `established-simplified`, which means they
claim to be defensible reduced figures rather than invented ones.

**Find out whether they are.**

1. Read `src/engines/materials/engine.ts` and list every preset with its
   three numbers.
2. For each medium, use the `fetch` MCP server to read a published source
   for the standard values of:
   - field capacity, the water a soil holds against gravity;
   - the wilting point, the water a plant cannot draw;
   - the water content at saturation, or porosity.

   Sources worth trying: university extension service pages on soil
   texture, the USDA or NRCS soil survey documents, FAO irrigation
   manuals, and encyclopaedia entries on soil water content. Prefer a
   university, a government agency or a reference work over a blog.
3. Compare. Write down, for each medium, what the published range is and
   where our figure sits inside it.
4. **Decide, do not just report.** If a figure is outside the published
   range, change it to a defensible value and say what you changed and why.
   If a figure is inside the range but on the edge, leave it and say so.
   If the published ranges overlap too much to justify separate figures for
   the four media, say that too, and keep the figures that are defensible.

### On the saturation point

The saturation figure was added in the Phase 2 work. It is the hardest of
the three to pin down, because the published quantity is usually porosity
rather than "water content at saturation", and those are not the same thing.
Handle that carefully: say which quantity you are comparing against and
why, rather than quietly treating them as equal.

The figure has to satisfy two constraints at once:

- **Above field capacity.** A medium cannot hold less water when saturated
  than when merely damp.
- **Below the level where the model misbehaves.** With the old model, a
  tap turned up far enough pushed the total water content past 3, because
  the medium had no ceiling at all.

### On the units

These are normalised fractions of the medium's volume, not percentages of
gravimetric water content. Where a published figure is in the other units,
convert it or say that you did not, and do not present the two as if they
were the same.

## Rules

- Plain English, short sentences, British spellings. No em dashes.
- Every number you state from a source has to have the source next to it.
- Do not invent a citation. If you cannot fetch a source, say what you
  could not fetch.
- Do not change the model behaviour. This is an audit of the numbers and
  the stated assumptions, not a rewrite of the engine.
- If you change a preset, update the assumptions that mention it.

## What to produce

**`docs/MATERIALS-AUDIT.md`**, with:

- a table: medium, field capacity, wilting point, saturation, the published
  range for each, and whether ours sits inside it;
- the source for each published range, as a URL;
- what you changed and why;
- what you could not verify.

**The engine's assumptions updated** to match anything you changed.

**A test** that asserts every preset's saturation point is above its field
capacity, and that the water content can never exceed the saturation point
at any irrigation rate.

## Acceptance

- `docs/MATERIALS-AUDIT.md` exists, every published range has a URL beside
  it, and no figure is stated without a source.
- Every preset's saturation point is above its field capacity.
- The medium's total water content never exceeds its saturation point, at
  any irrigation rate.
- The stated assumptions match the numbers in the code.
- `npm run typecheck`, `npm run lint` and `npm test` are clean.

## When you are done

Report what the published sources said, what you changed, and what you could
not verify. If the numbers turned out to be fine, say that plainly too. A
clean audit is a result.

Do not commit.
