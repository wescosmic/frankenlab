# FrankenLab — demo script

Target length: **2 minutes 41 seconds**. The rules allow under 3 minutes.

The last fifteen seconds must show one concrete Kiro moment that changed the
product, with a visible outcome. That is section 9, and it is not optional.

Every number quoted below is a measured number. Run
`npx tsx scripts/measure-beats.ts` for the flagship and
`npx tsx scripts/measure-catalysis.ts` for the catalysis comparison before
recording. If a number on screen does not match, re-measure and re-record the
caption.

---

## 1 · 0:00 — 0:12 · Cold open

**Screen.** The bench, already running. Slow speed. The plant, the substrate,
the sensor, the battery, the comparator and the LED lit on a dark bench.

**Voiceover.**
> This is FrankenLab. A plant drinks a soil dry. The soil drives a sensor. The
> sensor drives a comparator. The comparator lights an alert.

**Caption.** Four sciences. One simulation.

---

## 2 · 0:12 — 0:32 · The bench

**Screen.** Slow pan across the bench. Hover the substrate so its label and
its confidence badge show: **established-simplified**.

**Voiceover.**
> Every part on this bench comes from a different discipline. Every part says
> how much it can be trusted. The solver is real. The electronics are solved
> with modified nodal analysis, not a lookup table.

**On screen.** The confidence badges: physical-law, established-simplified,
illustrative.

---

## 3 · 0:32 — 0:54 · The run tells a story

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

## 4 · 0:54 — 1:08 · Every number has a unit

**Screen.** Switch to the **Measurements** tab. Scroll the substrate group.

**Voiceover.**
> Every quantity the simulation produced is named, with its unit. Field
> capacity. Wilting point. Saturation. Biomass. Signal. Nothing is a bare
> float.

**On screen.** `Field capacity 0.18 ratio`, `Wilting point 0.06 ratio`,
`Saturation 0.38 ratio`, `Biomass 0.42 g`.

---

## 5 · 1:08 — 1:34 · You can save the plant

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

## 6 · 1:34 — 1:54 · The catalyst

**Screen.** Open the experiment catalogue. Choose **Catalysis Comparison**.
Two vessels appear. Press **Run**, then **Fast**.

**Voiceover.**
> The same reaction, twice. One vessel has a catalyst, eight times stronger.
> The catalysed one races ahead and flattens out in twelve minutes. The other
> is still climbing at one hundred and ten.

**Screen.** The readings panel. Two numbers side by side: product, no
catalyst, and product, catalysed.

**On screen.** `Product, no catalyst 0.610`, `Product, catalysed 0.610`. The
same place. Then the timeline: "The reaction has reached equilibrium at
0.610 mol/L."

**Voiceover.**
> And they end in the same place. Four three-millionths of a mole per litre
> apart. A catalyst changes how fast you get there. It does not change where
> there is. That is not a claim. It is solved from the equilibrium constant
> and then measured.

---

## 7 · 1:54 — 2:06 · Build it yourself

**Screen.** Drag a **Resistor** from the catalogue onto the bench. Drag from
one of its dots to the dot on the battery. Try to drag from the comparator's
output to the LED's input.

**Voiceover.**
> You can build on the bench. Drag a part in, drag between the dots to wire it.
> And if the wire makes no sense, the bench refuses it and tells you why, in
> plain English.

**On screen.** The refusal: *"Trigger" is an input on LED, so nothing comes
out of it.*

---

## 8 · 2:06 — 2:18 · The assistant does not guess

**Screen.** The assistant panel. Type: *How much should I trust these models?*

**Voiceover.**
> The assistant reads the run. It quotes only the numbers the simulation
> produced, and it ends every answer by saying what that answer is worth.

**On screen.** The reply, ending with:

> **What to trust here:** the weakest model on the bench is **Illustrative**
> (Irrigation). It is illustrative. It shows what the model does, not what
> would really happen.

And the badge in the corner of the reply: **ILLUSTRATIVE**.

---

## 9 · 2:18 — 2:26 · The Frankenstein part

**Screen.** The bench, wide shot. The connections between the four
disciplines.

**Voiceover.**
> Biology, electronics, materials and chemistry, sharing one component graph
> and one clock. The simulation kernel has never heard of any of them. Each
> discipline is a plug-in.

---

## 10 · 2:26 — 2:41 · The Kiro moment

**This is the last fifteen seconds. It must show the change, not a file tree.**

**2:26 — 2:31.** Cut to a terminal running the Kiro CLI. Show the audit brief
and the reviewer's decision table for sand: field capacity 0.12 becomes 0.18,
wilting point 0.04 becomes 0.06.

**Caption.** Kiro's science reviewer checked the soil physics against
published data.

**2:31 — 2:38.** Cut back to the app. The Timeline tab. The alert on day
eleven, the wilting on day twenty-one.

**Caption.** Before the audit: day 8 and day 16. The audit moved the whole
story by three days.

**2:38 — 2:41.** The Measurements tab. Field capacity 0.18.

**Voiceover.**
> Kiro found a number that was wrong against the published data. The timeline
> moved. That is the whole story of this build.

---

## Recording notes

- Record at 1920 by 1080, 30 frames a second.
- Use **Slow** for the run sections and **Fast** for any transition.
- The timeline and the measurements are the two screens that must be legible.
  Zoom, do not cut.
- Every number on screen must match `scripts/measure-beats.ts` and
  `scripts/measure-catalysis.ts`. If the simulation changes, re-measure and
  re-record the captions.
- The last fifteen seconds are shot separately, so they can be redone if the
  numbers move.
- Section 6 needs the catalysis experiment to have been run once at least, so
  the numbers are on screen rather than computed on the spot.

## What to show if there is no time

The minimum is sections 1, 5 and 10. The run, the recovery, and the Kiro
moment. Everything else is cuttable. If there is room for exactly one more,
cut section 7 and keep section 6: the catalyst is the clearest proof that
the simulation is real rather than scripted.
