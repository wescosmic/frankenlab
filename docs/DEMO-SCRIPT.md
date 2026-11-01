# FrankenLab — demo script

Target length: **2 minutes 22 seconds**. The rules allow under 3 minutes.

The last fifteen seconds must show one concrete Kiro moment that changed the
product, with a visible outcome. That is section 11, and it is not optional.

Every number quoted below is a measured number. Run
`npx tsx scripts/measure-beats.ts` for the flagship and
`npx tsx scripts/measure-catalysis.ts` for the catalysis comparison before
recording. If a number on screen does not match, re-measure and re-record the
caption.

The timings below are the narration timings. The recording starts a few
seconds earlier, while the page loads, and the narration is shifted onto the
video at the mux step.

---

## 1 · 0:00 — 0:11 · Cold open

**Screen.** The bench, already running. Slow speed. The plant, the substrate,
the sensor, the battery, the comparator and the LED lit on a dark bench.

**Voiceover.**
> This is FrankenLab. A plant drinks a soil dry. The soil drives a sensor. The
> sensor drives a comparator. The comparator lights an alert.

**Caption.** Four sciences. One simulation.

---

## 2 · 0:11 — 0:27 · The bench

**Screen.** Slow pan across the bench. The parts carry their own labels and
their own confidence badges.

**Voiceover.**
> Every part on this bench comes from a different discipline, and every part
> says how much it can be trusted. The electronics are solved with modified
> nodal analysis, not looked up from a table. Change the reference resistor
> and the day the alarm goes off moves with it.

**On screen.** The confidence badges: physical law, simplified model,
illustrative.

---

## 3 · 0:27 — 0:40 · The run tells a story

**Screen.** Switch to the **Timeline** tab. The run is at around day 11.

**Voiceover.**
> The run is not a graph of noise. It is a sequence of events. On day eleven
> the moisture falls below the threshold and the alert fires. On day twenty
> the plant's vigour drops and its growth stalls.

**On screen.** The timeline entries, each with its time and severity:
ERROR "The alert has fired", WARNING "The plant's vigour is falling."

---

## 4 · 0:40 — 0:51 · Every number has a unit

**Screen.** Switch to the **Measurements** tab.

**Voiceover.**
> Every quantity the simulation produced is named, with its unit. Field
> capacity. Wilting point. Saturation. Biomass. Signal. Nothing here is a bare
> float.

**On screen.** `Field capacity 0.18 ratio`, `Wilting point 0.06 ratio`,
`Saturation 0.38 ratio`, `Biomass` in grams.

---

## 5 · 0:51 — 1:03 · You can save the plant

**Screen.** The timeline shows the growth stall and the medium wilting. Press
**Pause**. The clock stops.

**Voiceover.**
> Now the plant is failing. Its growth has stalled, and the medium has dried
> past the point where it can draw water. Stop the run, turn the irrigation up
> in the inspector, and press run again.

**Screen.** Inspector, **Moisture source** selected. Drag **Delivery rate** from
0 to 0.05. The badge next to it says **live**, not *restarts*. Press **Run**.

---

## 6 · 1:03 — 1:12 · The recovery

**Screen.** The timeline again. Two new entries, one green and one blue.

**Voiceover.**
> The medium comes back above its wilting point and the alert clears. The
> simulation is deterministic, and you are in the loop.

**On screen.**

- SUCCESS "The medium has recovered above the wilting point." (21d 8h)
- INFO "The alert has cleared." (23d 3h)

---

## 7 · 1:12 — 1:35 · The catalyst

**Screen.** Open the experiment catalogue. Choose **Catalysis Comparison**. Two
vessels appear. Press **Run**, then **slow**. Switch to **Measurements**.

**Voiceover.**
> Here is the same reaction, twice. One vessel has a catalyst eight times
> stronger. The catalysed vessel settles in twelve minutes. The other takes a
> hundred and ten.

**On screen.** Two vessels side by side. The catalysed one has flattened on its
equilibrium; the plain one is still climbing.

**Then.** Press **fast**. Both vessels arrive together.

**Voiceover.**
> And they finish in the same place, forty-three millionths of a mole apart. A
> catalyst changes how fast you get there. It does not change where there is.

**On screen.** `Product, no catalyst 0.610`, `Product, catalysed 0.610`. The
same place.

---

## 8 · 1:35 — 1:43 · Build it yourself

**Screen.** Back to **Project BioCircuit**. Drag a **Resistor** from the
catalogue onto the bench. It arrives selected.

**Voiceover.**
> You can build on the bench as well. Drag a part in and it arrives with its
> ports, its assumptions, and how much it can be trusted.

**On screen.** The new part on the bench with its port markers. The inspector
shows the part's confidence badge and what it assumes.

---

## 9 · 1:43 — 1:54 · The assistant does not guess

**Screen.** The assistant panel. Ask: *How much should I trust these models?*

**Voiceover.**
> Our assistant reads the run. It quotes only the numbers the simulation
> produced, and it ends every answer by saying what that answer is worth, and
> which model to trust least.

**On screen.** The reply, ending with:

> **What to trust here:** the weakest model on the bench is **Illustrative**
> (Irrigation). It is illustrative. It shows what the model does, not what
> would really happen.

And the badge on the reply: **ILLUSTRATIVE**.

---

## 10 · 1:53 — 2:09 · The Frankenstein part

**Screen.** The Couplings tab, under the bench. The flagship's rules, listed:
which part sends what to which part, on which channel, and what the rule
leaves out. The panel says how many disciplines are on the bench and how many
declared couplings are carrying it.

**Voiceover.**
> Four disciplines: biology, electronics, materials and chemistry. Three of them
> share this bench, one component graph and one clock. The simulation kernel has
> never heard of any of them. Each discipline is a plug-in.

**Why three and not four.** The voice names all four disciplines the product
has. The panel reports the three that this bench actually uses, because
chemistry runs in its own experiment. The screen corrects the voice rather than
agreeing with it, and that is the point of the whole product.

---

## 11 · 2:09 — 2:22 · The Kiro moment

**This is the last fifteen seconds. It must show the change, not a file tree.**

**2:07 — 2:14.** Cut to a terminal running the Kiro CLI. Show the audit brief
and the reviewer's decision table for sand: field capacity 0.12 becomes 0.18,
wilting point 0.04 becomes 0.06.

**Caption.** Kiro's science reviewer checked the soil physics against
published data.

**2:14 — 2:22.** Cut back to the app. The Timeline tab. The alert on day
eleven, the wilting on day twenty-one.

**Caption.** Before the audit: day 8 and day 16. The audit moved the whole
story by three days.

**Voiceover.**
> We built this with Kiro. Its science reviewer checked our soil physics
> against published data, found a field capacity that was below the published
> range, and the whole timeline moved three days. That is the whole story of
> this build.

---

## Recording notes

- Record at 1920 by 1080, 30 frames a second.
- Use **slow** for the run sections and **fast** for any transition.
- The timeline and the measurements are the two screens that must be legible.
  Zoom, do not cut.
- Every number on screen must match `scripts/measure-beats.ts` and
  `scripts/measure-catalysis.ts`. If the simulation changes, re-measure and
  re-record the captions.
- Clicking is done from inside the page, not through Playwright's own click
  helper. Playwright waits for an element to be stable before it clicks, and
  on a page that is drawing three dimensions that wait costs three to six
  seconds. On a busy page the simulation keeps running while it waits, so the
  run loses hours and the picture drifts away from the voice.
- The run is never fast-forwarded. The recovery happens because the user
  pauses, turns the irrigation up, and presses run again.

## What to show if there is no time

The minimum is sections 1, 5, 6 and 11. The run, the recovery, and the Kiro
moment. Everything else is cuttable. If there is room for exactly one more,
cut section 8 and keep section 7: the catalyst is the clearest proof that
the simulation is real rather than scripted.
