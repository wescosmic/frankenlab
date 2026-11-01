# Brief 5b — Apply the audit and re-measure the flagship

**Agent:** `engine-builder` · **Phase:** 5 · **Do not commit.**

## Context

FrankenLab, at `C:\Users\Wesley\.mavis\workspace\frankenlab`.

The science reviewer audited the substrate presets against published figures
and found that several of our teaching figures sit outside the published
ranges. The substrate claims `established-simplified`, which claims they are
defensible reduced figures, so they have to be corrected.

This brief applies the corrections. Read `.kiro/powers/frankenlab/skills/verify-a-model/SKILL.md`
first. It is the checklist, and step three of it, *"the threshold has to be
reachable"*, is the part this change puts at risk.

## The corrections

| Medium | Figure | Was | Becomes |
|---|---|---|---|
| Sand | field capacity | 0.12 | **0.18** |
| Sand | wilting point | 0.04 | **0.06** |
| Sand | saturation | 0.24 | **0.38** |
| Loam | all three | 0.28 / 0.12 / 0.48 | **unchanged** |
| Clay | field capacity | 0.42 | **0.42, unchanged** |
| Clay | wilting point | 0.22 | **0.18** |
| Clay | saturation | 0.56 | **0.50** |
| Hydrogel | field capacity | 0.75 | **0.75, unchanged** |
| Hydrogel | wilting point | 0.15 | **0.10** |
| Hydrogel | saturation | 0.95 | **0.95, unchanged** |

The sources, so you can check them yourself:

- Minnesota PCA Stormwater Manual, *Soil water storage properties*:
  https://stormwater.pca.state.mn.us/soil_water_storage_properties
  Sand: porosity 0.43, field capacity 0.17, wilting point 0.025 to 0.09.
  Loam: porosity 0.47, field capacity 0.25 to 0.32, wilting point 0.09 to 0.15.
  Clay: porosity 0.47, field capacity 0.32, wilting point 0.20.
  Its footnote 2 states: *"Soil saturation is assumed to be equal to the
  porosity."* That is the convention our saturation figure follows.
- Cornell University, *Soil water content and tension*:
  https://nrcca.cals.cornell.edu/soil/CA2/CA2_SoftChalk/CA29.html

The numbers are volumetric fractions, which is what our model uses.

### The assumptions

Check the substrate's `assumptions` list against the code. The reviewer
believed the saturation ceiling was missing from it. If it is already there,
leave it. If it is not, add it. Do not add it twice.

## The part that will bite

**Changing the constants changes the physics.** The medium now holds more
water before it wilts, so the alert fires on a different day, the plant
stalls on a different day, and the medium wilts on a different day.

Everything that quotes a day has to be re-measured and updated:

- `src/scenarios/biocircuit.ts`, the `BIOCIRCUIT_MEASURED_DAYS` map and the
  `atDay` on each beat in `BIOCIRCUIT_BEATS`.
- `docs/ROADMAP.md` and `README.md`, wherever they quote an alert day.
- `.kiro/specs/frankenlab/requirements.md`, acceptance criteria AC-2 and
  AC-8, and `.kiro/specs/frankenlab/design.md`, the paragraph that describes
  when the alert fires.
- `tests/observations.test.ts` and any test that asserts a day.

**Measure, do not guess.** Run the simulation and print the days. The
reviewer's change might push the wilting beat past the end of the current
21-day run, in which case the run has to get longer, and the run length is
itself a documented fact. If that happens, extend the run to the smallest
length that still reaches every beat with a day of margin, and say so.

The order of the beats must not change. The alert still fires before the
plant stalls, and the plant still stalls before or at the same time as the
medium wilts.

### What must not change

- The **default medium** stays sand.
- The default run stays long enough to reach every beat.
- The coupling chain stays the same. The medium still decides when the alert
  fires, and sand still alarms before clay.

## Tests

- Every preset's saturation point is above its field capacity.
- The water content never exceeds the saturation point, at any irrigation
  rate.
- The available moisture reading stays between 0 and 1.
- The flagship's beats fire on the days you measured, and the days in the
  docs match the days the code produces. A test that asserts a day is worth
  more than a test that asserts a shape.

## Acceptance

- The four presets carry the corrected figures.
- The assumptions match the code.
- Every day quoted anywhere in the repository is the measured day, not an old
  one and not an estimate.
- The flagship reaches all of its beats inside the run.
- `npm run typecheck`, `npm run lint` and `npm test` are clean.

## When you are done

Report the new figures, the new measured days, and every file you updated.
If a day moved, say which and why.

Do not commit.
