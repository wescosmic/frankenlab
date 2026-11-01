/**
 * The mime type the catalogue uses to hand a part type to the bench.
 *
 * The drag crosses from the catalogue, which is React, into the Three.js
 * scene, which knows nothing about React. The type name is the only thing
 * they share, so it lives on its own.
 */
export const DRAG_TYPE = 'application/x-frankenlab-part';
