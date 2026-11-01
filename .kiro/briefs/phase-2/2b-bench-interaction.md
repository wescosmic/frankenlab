# Brief 2b — Build it on the bench

**Agent:** `ui-integration` · **Phase:** 2 · **Do not commit.**

## Context

FrankenLab, at `the repository root`. Read
`.kiro/steering/product.md`, `.kiro/steering/engineering-standards.md` and
`docs/ARCHITECTURE.md` first.

Brief 2a gave the store the ability to add components and connections. This
brief gives the user the means: drag a part from the catalogue onto the bench,
then drag from one port to another to wire it up.

## What already exists, so you do not rebuild it

Read `src/three/lab-scene.ts` and `src/components/Library.tsx` first.

- `LabScene` already has `setExperiment(experiment, registry)`, which tears the
  scene down and rebuilds it from the experiment definition. It is already
  data-driven and it already draws connections as arcs. **Keep it that way.**
- `LabSceneOptions` already has `onSelect(componentId)`. Add to it rather than
  replacing it.
- The scene already raycasts on `pointerdown` and selects the component under
  the cursor.
- `Library.tsx` already lists every component definition, grouped by
  discipline, with its confidence level. Clicking one currently selects an
  existing instance of that type.

## What to build

### 1. Drag a component from the catalogue onto the bench

The catalogue entry becomes a drag source. Dropping it on the bench creates a
component of that type at the drop point and hands it to the store's
`addComponent` intent from Brief 2a.

The bench must show a clear affordance while a drag is in progress: where the
part would land, and that the drop is happening. The existing hint at the
bottom of the bench should mention that parts can be dragged in.

### 2. Pick ports and wire them

Every component shows its ports as small, visible markers positioned from its
definition. The markers must be derived from the component definition — the
port's direction and id — **not** hard-coded per component type. A component
type nobody has seen before must still get its ports in sensible places.

- Dragging from a port starts a connection. A line follows the pointer.
- Releasing over another port completes the connection, and hands it to the
  store.
- Releasing anywhere else cancels it.
- Clicking a connection selects it, and the user can remove it.

**The pointer conflict.** The scene currently orbits the camera on drag and
selects a component on click. A drag that starts on a port must not orbit the
camera, and must not select the component. A drag that starts on a component
body must keep behaving exactly as it does now. Get this right or the bench
becomes unusable.

### 3. Feedback when a connection is refused

If the store refuses a connection, the user is told **why**, in plain English,
from the same validation text the rest of the product uses. Do not silently
do nothing, and do not show a generic failure.

### 4. The scene must animate a user-built experiment

`applyReadings` currently reads four fixed reading keys — `plant.biomass`,
`substrate.moisture`, `sensor.signal`, `alert.brightness` — so it only
animates the shipped experiment. An experiment the user built has different
component ids.

Change it to find the component **by type** rather than by id: find the
component of type `biology.plant` and use its biomass output, and so on. A
user-built experiment then animates the same way.

## Rules that are not negotiable

- **The UI never mutates simulation state directly.** It issues intents to the
  store.
- Port markers are derived from the definition. No per-type hard-coded port
  positions.
- The frame loop stays in the scene. Do not move it into a React component.
- Do not reintroduce the CSS2DRenderer label bug: labels need
  `width: max-content`, and the canvas and the label layer must share an
  origin.
- Plain English, short sentences, British spellings. No em dashes in copy.

## Acceptance

- A component can be dragged from the catalogue onto the bench and appears.
- Two ports can be connected by dragging, and the connection is drawn.
- An invalid connection is refused with a readable reason.
- A drag starting on a port does not orbit the camera.
- An experiment with different component ids still animates from its readings.
- `npm run typecheck`, `npm run lint` and `npm test` are clean.
- Open the app and drive it yourself: drag a part in, wire it up, and confirm
  there are no console errors.

## A note about the shell on this machine

The shell tool here is Windows PowerShell, where `&&` is **not** a valid
statement separator. Chain commands with `;`, or run them one at a time.

## When you are done

Report what you changed, what you did in the browser, and anything you left
unfinished. Do not commit.
