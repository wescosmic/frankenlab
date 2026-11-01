# Brief 5a — Check the medium constants against published figures

**Agent:** `science-reviewer` (read-only) · **Phase:** 5 · **Do not commit.**

## Context

FrankenLab, at `the repository root`.

You have no write access, by design. This brief asks for research and a
judgement, not an edit. A later pass applies whatever you conclude.

Two things are new and you should use them.

**The `frankenlab` Power is installed.** It carries two skills and a
reference:

- `verify-a-model` — the checklist a science model has to pass.
- `add-a-discipline` — how a discipline is added without touching the kernel.
- `references/confidence-levels.md` — what each confidence level requires.

Read `verify-a-model` first. It is the procedure you are about to follow, and
you are the reason it exists.

**The `fetch` MCP server is configured for this workspace.** It fetches a URL
and returns the text. Use it to read published figures rather than working
from memory. That is the point of this brief.

**How to fetch, on this machine.** Use the `fetch` MCP tool or the built-in
web tools. Do **not** fetch with `curl` or `Invoke-WebRequest` in the shell.
This is Windows PowerShell 5.1, where `curl` is an alias for
`Invoke-WebRequest`, `head` does not exist, and `&&` is a parser error. The
shell fetch path fails in three different ways and wastes the run.

A workable pattern:

1. Use the web search tool to find a page that states the figures, and take
   the URL from the result.
2. Fetch that URL with the `fetch` MCP tool.
3. If a fetch fails or times out, try a different source rather than
   retrying the same one. Several large government and university sites are
   slow or blocked from this network.

Aim for **two** solid sources per medium rather than ten flaky ones. A
university extension service or a reference work is a good source. A blog
is not.

## The question

The materials engine carries four teaching presets. Each states a field
capacity, a wilting point and a saturation point. Those numbers are shown in
the workbench, in the inspector and to the assistant, and the substrate
carries the confidence level `established-simplified`, which claims they are
defensible reduced figures rather than invented ones.

**Are they?**

1. Read `src/engines/materials/engine.ts` and list every preset with its
   three numbers, and with the assumptions the definition states.
2. For each medium, use the `fetch` MCP server to read published figures for:
   - field capacity, the water a soil holds against gravity;
   - the wilting point, the water a plant cannot draw;
   - the water content at saturation, or porosity.

   Sources worth trying: university extension service pages on soil
   texture, USDA and NRCS soil survey documents, FAO irrigation manuals,
   and reference works on soil water content. Prefer a university, a
   government agency or a reference work over a blog or a forum.
3. For each medium, compare our figure against the published range and say
   whether ours sits inside it, above it, or below it.

### The saturation point is the hard one

The saturation figure is the newest, and the published quantity is usually
**porosity** rather than "water content at saturation". Those are not the
same thing. Porosity is the volume of voids in the soil; the water content
at saturation is the fraction of those voids that are full of water, which
is usually less than one. Handle the conversion carefully, or say plainly
that you did not, and do not present the two as if they were the same.

Our figures are normalised fractions of the medium's volume. Published
figures are often gravimetric (kilograms of water per kilogram of dry soil)
or given against a bulk density. Where the units differ, convert them and
show the working, or say that you did not convert and why.

### The two constraints the figure has to satisfy

- **Above field capacity.** A medium cannot hold less water when saturated
  than when merely damp.
- **Usable by the model.** The old model had no ceiling at all, so a tap
  turned up far enough pushed the total water content past 3 on a scale
  that runs from 0 to 1.

### Also check the assumptions while you are there

The substrate's assumption list says the values are "representative teaching
figures, not measurements of a specific product". Is that still true of the
saturation figure, now that it has one? Is there anything the list should
say and does not?

## What to report

Report in full, in your reply. This is the output that gets acted on, so
nothing can be left implicit.

For each of the four media:

| Medium | Our field capacity | Published range | Inside? | Our wilting point | Published range | Inside? | Our saturation | Published range | Inside? |
|---|---|---|---|---|---|---|---|---|---|

Then:

- the URL for every published figure you used;
- your conversion working, where the units differ;
- **a decision per figure**: keep it, or change it to what value and why;
- which of our four media you believe the published ranges actually
  distinguish, and which ones the literature does not support
  separating as sharply as we do;
- anything in the assumptions that no longer matches the code.

## Rules

- Every published number carries its URL, beside it.
- Do not invent a citation. If you cannot fetch a source, say what you could
  not fetch.
- Plain English, short sentences, British spellings. No em dashes.
- If the numbers turn out to be fine, say that plainly. A clean audit is a
  result.

## Acceptance

- Every preset figure has a published range and a URL beside it.
- Every figure has a decision: keep, or change to what.
- The unit conversion is shown, or its absence is stated.
- The assumptions are checked against the code.

## When you are done

Report your findings. Do not edit files. Do not commit.
