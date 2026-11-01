import { describe, expect, it } from 'vitest';
import { freeSpot } from '@/state/placement';
import { createBioCircuit } from '../src/scenarios/biocircuit';

const flagship = createBioCircuit();

describe('where a part goes when there is no pointer', () => {
  it('puts a part on a spot of its own', () => {
    const spot = freeSpot(flagship.components.map((c) => c.position));

    for (const taken of flagship.components) {
      const distance = Math.hypot(
        spot.x - taken.position.x,
        spot.y - taken.position.y,
        spot.z - taken.position.z,
      );
      expect(distance, `${spot.x},${spot.y} is on top of ${taken.id}`).toBeGreaterThan(2);
    }
  });

  it('gives the same answer for the same bench', () => {
    const positions = flagship.components.map((c) => c.position);

    expect(freeSpot(positions)).toEqual(freeSpot(positions));
  });

  it('does not put a second part on the first one', () => {
    const first = freeSpot([]);
    const second = freeSpot([first]);

    expect(second).not.toEqual(first);
    const distance = Math.hypot(second.x - first.x, second.y - first.y, second.z - first.z);
    expect(distance).toBeGreaterThan(2);
  });

  it('still returns a spot when the bench is full', () => {
    const crowded = Array.from({ length: 60 }, (_, i) => ({
      x: (i % 12) * 1.5 - 9,
      y: Math.floor(i / 12) * 1.2 - 2.4,
      z: 0,
    }));

    const spot = freeSpot(crowded);

    expect(Number.isFinite(spot.x)).toBe(true);
    expect(Number.isFinite(spot.y)).toBe(true);
    expect(Number.isFinite(spot.z)).toBe(true);
  });
});
