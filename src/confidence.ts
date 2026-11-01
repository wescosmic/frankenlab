/**
 * FrankenLab — the vocabulary of confidence.
 *
 * Confidence is first-class data in this product. Every component carries a
 * level, every coupling rule carries a level, and every answer from the
 * assistant ends by saying what that answer is worth.
 *
 * This module is the one place those levels are named, described and
 * coloured, so the badge in the library, the badge in the inspector, the
 * badge on an assistant reply and the badge on a coupling rule cannot drift
 * apart from one another.
 */

import type { ConfidenceLevel } from './kernel/types';

/** Confidence levels, strongest first. */
export const CONFIDENCE_ORDER: readonly ConfidenceLevel[] = [
  'physical-law',
  'established-simplified',
  'illustrative',
  'hypothetical',
];

/** The short name that goes on a badge. */
export const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  'physical-law': 'Physical law',
  'established-simplified': 'Simplified model',
  illustrative: 'Illustrative',
  hypothetical: 'Hypothetical',
};

/** What each level means, in one sentence a non-specialist can act on. */
export const CONFIDENCE_NOTE: Record<ConfidenceLevel, string> = {
  'physical-law':
    'It follows from a law that is conserved and checkable, so you can verify it yourself.',
  'established-simplified':
    'It comes from an established model that has been simplified for teaching. Trust the direction more than the last decimal.',
  illustrative:
    'It is illustrative. It shows what the model does, not what would really happen.',
  hypothetical:
    'It is speculative by design. It is here to explore, not to predict.',
};

/** The longer form, for the inspector panel. */
export const CONFIDENCE_BLURB: Record<ConfidenceLevel, string> = {
  'physical-law':
    'Conserved and independently verifiable. Follows from established physics.',
  'established-simplified':
    'An established model reduced for teaching. Directionally sound, not a prediction.',
  illustrative: 'Qualitative. Useful for feel, not for numbers you would publish.',
  hypothetical: 'Speculative by design.',
};

/** The classes a confidence badge takes. */
export const CONFIDENCE_TONE: Record<ConfidenceLevel, string> = {
  'physical-law': 'text-lab-biology border-lab-biology/40 bg-lab-biology/10',
  'established-simplified': 'text-lab-accent border-lab-accent/40 bg-lab-accent/10',
  illustrative: 'text-lab-chemistry border-lab-chemistry/40 bg-lab-chemistry/10',
  hypothetical: 'text-lab-muted border-lab-line bg-lab-line/30',
};
