# FrankenLab — demo script

Target length: **2 minutes 45 seconds**. The rules allow under 3 minutes.

The last fifteen seconds must show one concrete Kiro moment that changed the
product, with a visible outcome. That is section 8, and it is not optional.

Every day quoted below is the measured day. Run `npx tsx scripts/measure-beats.ts`
to confirm any of them before recording.

---

## 0:00 — 0:12 · Cold open

**Screen.** The bench, already running. Slow speed. The plant, the substrate,
the sensor, the battery, the comparator and the LED lit on a dark bench.

**Voiceover.**
> This is FrankenLab. A plant drinks a soil dry. The soil drives a sensor. The
> sensor drives a comparator. The comparator lights an alert.

**Caption.** Four sciences. One simulation.

---

## 0:12 — 0:40 · The bench

**Screen.** Slow pan across the bench. Hover the substrate so its label and
its confidence badge show: **established-simplified**.

**Voiceover.**
> Every part on this bench comes from a different discipline. Every part says
> how much it can be trusted. The solver is real. The electronics are solved
> with modified nodal analysis, not a lookup table.

**On screen.** The confidence badges: physical-law, established-simplified,
illustrative.

---

## 0:40 — 1:05 · The run tells a story

**Screen.** Switch to the **Timeline** tab. The run is at around day 11.

**Voiceover.**
> The run is not a graph of noise. It is a sequence of events. On day eleven
> the moisture falls below the threshold and the alert fires. On day twenty
> the plant's vigour drops and growth stalls. On day twenty-one the medium
> dries past the point where the plant can draw water, and it wilts.

**On screen.** The timeline entries, each with its time and severity:
ERROR "The alert has fired", WARNING "The plant's vigour is falling",
WARNING "The medium dried past the point where the plant can draw water."

---

## 1:05 — 1:25 · Every number has a unit

**Screen.** Switch to the **Measurements** tab. Scroll the substrate group.

**Voiceover.**
> Every quantity the simulation produced is named, with its unit. Field
> capacity. Wilting point. Saturation. Biomass. Signal. Nothing is a bare
> float.

**On screen.** `Field capacity 0.18 ratio`, `Wilting point 0.06 ratio`,
`Saturation 0.38 ratio`, `Biomass 0.42 g`.

---

## 1:25 — 2:00 · You can save the plant

**Screen.** The run has reached day 21 and the timeline shows the medium
wilting. Press **Pause**.

**Voiceover.**
> Here is the part that matters. The plant is dying. You can stop the run, open
> the inspector, turn the irrigation up, and press run again.

**Screen.** Inspector, **Moisture source** selected. Drag **Delivery rate**
from 0 to 0.05. The badge next to it says **live**, not *restarts*. Press
**Run**.

**Screen.** The timeline. Two new entries, one green and one blue:

- SUCCESS "The medium has recovered above the wilting point." (21d 8h)
- INFO "The alert has cleared." (23d 3h)

**Voiceover.**
> The medium recovers. The alert clears. The simulation is deterministic, and
> the user is in the loop.

---

## 2:00 — 2:18 · The assistant does not guess

**Screen.** The assistant panel. Type: *Why did the alert fire?*

**Voiceover.**
> The assistant reads the run. It does not have an opinion about soil. It
> quotes the numbers the simulation produced and tells you how sure it is.

**On screen.** The reply cites the moisture reading and the comparator
threshold, and carries the confidence level.

---

## 2:18 — 2:30 · The Frankenstein part

**Screen.** The bench, wide shot. The connections between the four
disciplines.

**Voiceover.**
> Biology, electronics, materials and chemistry, sharing one component graph
> and one clock. The simulation kernel has never heard of any of them. Each
> discipline is a plug-in.

---

## 2:30 — 2:45 · The Kiro moment

**This is the last fifteen seconds. It must show the change, not a file tree.**

**0:30 — 0:35.** Cut to a terminal running the Kiro CLI. Show the audit brief
and the reviewer's decision table for sand: field capacity 0.12 becomes 0.18,
wilting point 0.04 becomes 0.06.

**Caption.** Kiro's science reviewer checked the soil physics against
published data.

**0:35 — 0:42.** Cut back to the app. The Timeline tab. The alert on day
eleven, the wilting on day twenty-one.

**Caption.** Before the audit: day 8 and day 16. The audit moved the whole
story by three days.

**0:42 — 0:45.** The Measurements tab. Field capacity 0.18.

**Voiceover.**
> Kiro found a number that was wrong against the published data. The timeline
> moved. That is the whole story of this build.

---

## Recording notes

- Record at 1920 by 1080, 30 frames a second.
- Use **Slow** for the run sections and **Fast** for any transition.
- The timeline and the measurements are the two screens that must be legible.
  Zoom, do not cut.
- Every number on screen must match `scripts/measure-beats.ts`. If the
  simulation changes, re-measure and re-record the captions.
- The last fifteen seconds are shot separately, so they can be redone if the
  numbers move.

## What to show if there is no time

The minimum is section 1, section 5 and section 8. The run, the recovery, and
the Kiro moment. Everything else is cuttable.
