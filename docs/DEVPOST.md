# Devpost submission

Earlier submission preparation notes. The current submitted copy is in
[`DEVPOST-SUBMISSION-UPDATED.md`](DEVPOST-SUBMISSION-UPDATED.md), and the current
film is `docs/demo/submission-cut-v7/frankenlab-submission-v10.mp4`. The older
pitch and upload instructions below are retained as history.

The refreshed copy-paste package is in [`DEVPOST-SUBMISSION-UPDATED.md`](DEVPOST-SUBMISSION-UPDATED.md).
The story section can be copied straight into the "About the project" field;
the rest of the file contains the suggested category, pitch, links and video
description.

---

## 1. Tagline

*Project overview, step 2.*

```
Four sciences, one bench, one simulation.
```

41 characters.

## 2. Pitch

*Project overview, step 2.*

```
A sandbox where electronics, biology, materials and chemistry share one component graph and one kernel. A plant dries a soil, the moisture trips a real circuit, an LED lights. Built with Kiro.
```

192 characters.

## 3. About the project

*Project details, step 3. The Project Story field. Markdown is accepted.*

Copy the whole of [`DEVPOST-STORY.md`](DEVPOST-STORY.md). Its headings are the
seven Devpost asks for, in the order Devpost asks for them:

1. Inspiration
2. What it does
3. How we built it
4. Challenges we ran into
5. Accomplishments that we're proud of
6. What we learned
7. What's next for FrankenLab

## 4. Built with

*Project details, step 3. Up to 25 tags. Devpost lower-cases them; pick the
ones it offers in its list and type the rest.*

```
kiro
nextjs
react
typescript
tailwindcss
threejs
zustand
vitest
fast-check
vercel
node.js
webgl
mcp
ai
simulation
```

15 tags. The first one is the important one: the rules ask for Kiro to be
visible in the submission.

## 5. "Try it out" links

*Project details, step 3. Add one link at a time with the "Add another link"
button.*

| URL | Suggested label |
| --- | --- |
| `https://frankenlab.vercel.app` | Play the live app |
| `https://github.com/wescosmic/frankenlab` | Source code (MIT licence) |
| `https://github.com/wescosmic/frankenlab/tree/main/docs` | Documentation and the Kiro write-up |

## 6. Image gallery

*Project details, step 3. Up to 15 images, 5 MB each. These are 1200x800, which
is the 3:2 ratio Devpost asks for. Upload them in this order.*

| # | File | What it shows |
| --- | --- | --- |
| 1 | `docs/devpost/01-the-bench-alert.png` | The flagship, alert lit, timeline showing day 11 |
| 2 | `docs/devpost/02-couplings.png` | The named rules carrying the experiment |
| 3 | `docs/devpost/03-measurements.png` | Every quantity, named and with its unit |
| 4 | `docs/devpost/04-assistant.png` | An answer that ends with what it is worth |
| 5 | `docs/devpost/05-catalysis.png` | Two vessels, one reaction, nine times sooner |
| 6 | `docs/devpost/06-kiro-audit.png` | The Kiro science review that moved the timeline |

Regenerate them with `python scripts/make-gallery.py`.

## 7. Demo video URL

*Project details, step 3. YouTube only, public or unlisted, and only the first
three minutes are reviewed.*

This section documents the earlier cut. The submitted film is the 2:02 cut at
`docs/demo/submission-cut-v7/frankenlab-submission-v10.mp4`.

### The upload, ready to make

| Setting | Value |
| --- | --- |
| File | `docs/demo/frankenlab-demo.mp4` (11,475,153 bytes, 2:22.36) |
| Visibility | **Public** or unlisted. Not private. |
| Thumbnail | `docs/devpost/youtube-thumbnail.png` (1280x720) |
| Category | Science & Technology |

**Title** (65 characters)

```
FrankenLab: a plant's thirst trips a real circuit | Kiroween 2026
```

**Description**

```
A plant drinks a soil dry. The soil's moisture changes the resistance of a
probe that sits on the tap of a voltage divider. When the tap voltage crosses
the comparator's threshold, the LED lights.

None of those parts know about each other. Electronics, biology, materials and
chemistry share one component graph and one simulation kernel, and the chain is
real because the electronics is solved, not scripted.

Built with Kiro. The part worth watching: a science-reviewer agent checked our
soil physics against published data, found a field capacity below the published
range, and the whole timeline moved three days. The audit was the product.

Try it: https://frankenlab.vercel.app
Code: https://github.com/wescosmic/frankenlab

#KiroweenHackathon26
```

**Tags**

```
frankenlab, kiroween, kiroween2026, kiro, scientific simulation, simulation, sandbox, electronics, biology, materials, chemistry, nextjs, react, three.js, open source
```

Once the video is up, paste the URL into the `Demo:` line of both versions in
`docs/SOCIAL-POST.md` and into the blog post at `docs/BLOG-POST.md`.

---

## Notes

- The submitted story describes Kiro CLI use, the committed specs, steering,
  agents and hooks, and the incomplete Crew runs. The Kiro write-up records the
  broader workflow and its limits.
- Every number in the story is measured by a script in `scripts/`, not written
  by hand, and the tests assert them. Do not hand-edit a figure in the story
  without re-running the script that produced it.
- The pitch and the tagline are measured. If either is edited, re-check the
  character count before saving.
- Run `python scripts/check-devpost.py` before saving. It checks the story is
  inside Devpost's limit, that the seven headings are the ones Devpost asked
  for in the right order, that every figure in the story is still a measured
  one, and that nothing will paste badly.
- The longer version of the story is the blog post, `docs/BLOG-POST.md`. If the
  field turns out to take more than 5,000 characters, use that instead.
