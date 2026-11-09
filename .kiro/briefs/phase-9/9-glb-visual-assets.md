# Phase 9 — Wire inventory artwork and GLB bench assets

## Goal

Make the new component catalogue visually compelling without changing the
simulation contract. Inventory cards should use local component artwork, and
the Three.js bench should prefer a local GLB model for a component while
retaining the existing procedural geometry as a safe fallback.

## Requirements

- Extend `ComponentDefinition.inventoryVisual` with optional `model` and
  `thumbnail` paths. Paths must be local `/assets/...` URLs, never remote URLs.
- Add local technical SVG thumbnails for the component catalogue. They should
  read as product-style lab objects at 56px and include accessible alt text.
- Add a GLB asset map under `public/assets/glb/` for the showcase components.
  Models may be deliberately low-poly and stylised, but must be licensed or
  generated for this project.
- Use `GLTFLoader` in `src/three/lab-scene.ts`. Load models asynchronously,
  clone them per component, scale them to the existing part bounds, and apply
  the existing shadow and selection behavior to every mesh child.
- A failed or missing GLB must never break the bench. The procedural shape must
  remain visible until a model is ready and must remain available on error.
- Preserve labels, port markers, raycast selection, drag/drop, connection
  pulses, determinism, and reduced-motion behavior.
- Keep simulation readings authoritative. Models are presentation only.

## Acceptance

- Inventory cards render a local thumbnail for every new component with a
  fallback silhouette.
- The bench loads at least the showcase GLBs when available and logs no error
  for missing optional assets.
- `npm run verify` and `npm run build` pass.
- Add a test for metadata coverage and a unit-level loader/fallback test where
  practical.
