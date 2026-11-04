# Devpost submission

Everything for the Kiroween 2026 Devpost project page, in the order the form
asks for it.

The project story is in its own file, [`DEVPOST-STORY.md`](DEVPOST-STORY.md),
so the whole of that file can be copied straight into the "About the project"
field without picking up any of this checklist.

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

The file is `docs/demo/frankenlab-demo.mp4`, 2 minutes 22 seconds, which is
inside the limit. It has to be uploaded to YouTube by hand because there is no
YouTube connector in this environment, and then the URL goes in the field and
the `Demo:` line of the social post.

---

## Notes

- The story covers all eight Kiro surfaces the rules ask about: CLI, IDE, Web
  (evaluated and honestly not used, for the reasons in `docs/KIRO-WRITEUP.md`),
  Crew, custom agents, hooks, spec-driven development, steering documents, MCP,
  property-based testing and powers. The stage one gate is a pass or fail on
  applying Kiro, so it is named in the first line of the Kiro section rather
  than buried.
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
