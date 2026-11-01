/**
 * Where a new part goes on the bench.
 *
 * A part dropped with the mouse lands exactly where the pointer was released.
 * A part added from the keyboard has no pointer, so it needs a spot of its
 * own that is not sitting on top of anything already on the bench.
 *
 * The search is deterministic. The same bench always produces the same spot,
 * so a run can be replayed and a screenshot can be compared with the one
 * before it.
 */

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** How close two parts have to be before they count as overlapping. */
const CLEARANCE = 2.4;

/** The rows of the bench, from the left of the view to the right. */
const COLUMNS = [-9, -7.5, -6, -4.5, -3, -1.5, 0, 1.5, 3, 4.5, 6, 7.5, 9];

/** The heights a part can sit at. The bench is a flat plane with a little depth. */
const ROWS = [2.4, 1.2, 0, -1.2, -2.4];

/** In front of everything, used when the bench is full. */
const FALLBACK: Vec3 = { x: 0, y: 0, z: 4 };

function distance(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * The clearest spot on the bench for one more part.
 *
 * The scan starts at the top left and works across, so a part added twice
 * lands in the same place both times rather than wandering.
 */
export function freeSpot(existing: readonly Vec3[]): Vec3 {
  let best: { spot: Vec3; clearance: number } | null = null;

  for (const y of ROWS) {
    for (const x of COLUMNS) {
      const spot: Vec3 = { x, y, z: 0 };
      const clearance = existing.reduce(
        (smallest, taken) => Math.min(smallest, distance(spot, taken)),
        Number.POSITIVE_INFINITY,
      );

      if (clearance >= CLEARANCE) return spot;

      if (!best || clearance > best.clearance) best = { spot, clearance };
    }
  }

  // Every spot is crowded. Put the part in front of the bench rather than on
  // top of something, and let the user drag it into place.
  return best && best.clearance > 0 ? best.spot : FALLBACK;
}
