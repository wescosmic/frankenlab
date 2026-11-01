/**
 * FrankenLab — Interdisciplinary interaction layer.
 *
 * This is the file that makes the Frankenstein claim concrete.
 *
 * A circuit cannot "know" about a plant, and a plant cannot "know" about a
 * circuit. What they share is a mediated coupling: water flows from a
 * substrate into a plant's roots and back out as transpiration; the substrate's
 * moisture drives a sensor's resistance; the sensor's resistance sits in a
 * voltage divider; the comparator turns that into a decision.
 *
 * Every coupling is declared here as a named, testable, documented rule with
 * its own confidence level. Nothing is implicit.
 */

import type { ConnectionRule, PortChannel } from '../kernel/types';

/**
 * A named interdisciplinary coupling.
 *
 * `chain` documents the physical story so the UI and the assistant can
 * explain *why* these components belong together.
 */
export interface InteractionCoupling {
  readonly id: string;
  readonly name: string;
  readonly disciplines: readonly string[];
  readonly chain: string;
  readonly rules: readonly ConnectionRule[];
  readonly confidence: ConnectionRule['confidence'];
  readonly notes: readonly string[];
}

/**
 * Biology → Electronics: a biological state becomes an electrical signal.
 *
 * The plant's vigour is read as a normalised signal by the sensor, whose
 * resistance then responds. The coupling is linear and dimensionless — which
 * is exactly why it must be declared rather than assumed.
 */
export const biologyToElectronics: InteractionCoupling = {
  id: 'bio-to-electronics',
  name: 'Biological signal transduction',
  disciplines: ['biology', 'electronics'],
  chain:
    'Plant vigour (biology) is read as a normalised 0–1 signal. The sensor converts that signal into a resistance, which participates in an ordinary electrical circuit.',
  confidence: 'established-simplified',
  notes: [
    'The biological quantity is normalised before transduction; absolute units are not preserved across the boundary.',
    'Real bioelectronic interfaces use much smaller signals and require amplification — the threshold comparator stands in for that.',
  ],
  rules: [
    {
      sourceChannel: 'signal',
      targetChannel: 'signal',
      transfer: { kind: 'identity' },
      sourceDiscipline: 'biology',
      targetDiscipline: 'electronics',
      description:
        'A normalised biological state is delivered to an electronic sensor input.',
      confidence: 'established-simplified',
    },
  ],
};

/**
 * Materials → Biology: the medium's water-holding capacity governs the plant.
 *
 * Substrate is not a passive backdrop. Swapping sandy soil for clay changes
 * how long the plant survives without irrigation — that is the entire point
 * of the flagship experiment.
 */
export const materialsToBiology: InteractionCoupling = {
  id: 'materials-to-biology',
  name: 'Substrate-controlled growth',
  disciplines: ['materials', 'biology'],
  chain:
    'Substrate water content (materials) becomes the moisture available to the roots (biology). Retention and drainage properties of the chosen medium set the pace of the whole experiment.',
  confidence: 'established-simplified',
  notes: [
    'The substrate supplies a volumetric moisture fraction, not a volumetric flow rate.',
    'Field capacity and wilting point are preset per material rather than measured.',
  ],
  rules: [
    {
      sourceChannel: 'moisture',
      targetChannel: 'moisture',
      transfer: { kind: 'identity' },
      sourceDiscipline: 'materials',
      targetDiscipline: 'biology',
      description: 'A medium delivers its available moisture to a biological component.',
      confidence: 'established-simplified',
    },
  ],
};

/**
 * Biology → Materials: the plant draws water back out of the medium.
 *
 * Without this return path the system is not coupled at all — water would
 * flow one way only and the plant could never affect its own substrate.
 */
export const biologyToMaterials: InteractionCoupling = {
  id: 'biology-to-materials',
  name: 'Water exchange with the medium',
  disciplines: ['biology', 'materials'],
  chain:
    'A plant and the medium it grows in exchange water. Roots draw water out of the medium and return a portion of it to the environment as transpiration, and a moisture source can put water back. The medium therefore dries because the plant is alive, not because time passed.',
  confidence: 'established-simplified',
  notes: [
    'Uptake is modelled as a normalised rate, not a volumetric flow.',
    'Transpiration is proportional to biomass and available water.',
  ],
  rules: [
    {
      sourceChannel: 'moisture',
      targetChannel: 'moisture',
      transfer: { kind: 'identity' },
      sourceDiscipline: 'biology',
      targetDiscipline: 'materials',
      description: 'A plant draws water from the medium it grows in.',
      confidence: 'established-simplified',
    },
  ],
};

/**
 * Materials → Electronics: a conductive specimen changes circuit behaviour.
 */
export const materialsToElectronics: InteractionCoupling = {
  id: 'materials-to-electronics',
  name: 'Material-dependent conductance',
  disciplines: ['materials', 'electronics'],
  chain:
    'A conductive specimen contributes its resistance to the circuit. Choosing copper rather than graphite changes the operating point of the same circuit. A medium\'s state can also be read directly by an electronic probe.',
  confidence: 'physical-law',
  notes: [
    'Resistance is computed from published conductivity, cross-section and length.',
    'Temperature dependence of conductivity is not modelled.',
    'A medium state reaching a probe is a transduction, not a physical continuity: the probe measures an effect, it does not touch the medium.',
  ],
  rules: [
    {
      sourceChannel: 'electrical-potential',
      targetChannel: 'electrical-potential',
      transfer: { kind: 'identity' },
      sourceDiscipline: 'materials',
      targetDiscipline: 'electronics',
      description: 'A material specimen sits in a potential path.',
      confidence: 'physical-law',
    },
    {
      sourceChannel: 'moisture',
      targetChannel: 'signal',
      transfer: { kind: 'identity' },
      sourceDiscipline: 'materials',
      targetDiscipline: 'electronics',
      description:
        'A medium\'s moisture state is delivered to a resistive probe as a normalised signal.',
      confidence: 'established-simplified',
    },
  ],
};

/**
 * Biology → Biology: nutrient consumption depletes a reservoir.
 */
export const biologyToBiology: InteractionCoupling = {
  id: 'bio-to-bio',
  name: 'Nutrient depletion',
  disciplines: ['biology', 'biology'],
  chain:
    'A nutrient reservoir supplies the plant and is drawn down by uptake, regenerating at its own rate. Over the flagship\'s twenty-four days the plant takes about seven per cent of the store out of it, and the reservoir puts back about half of what the plant drank.',
  confidence: 'established-simplified',
  notes: [
    'Single scalar nutrient pool; no distinct nutrient species.',
    'The plant runs out of water long before it runs out of nutrients, so this rule never decides the flagship\'s story. What it leaves out is any feedback from a nutrient shortage onto growth: the reservoir has to fall below nine tenths of its capacity before the plant feels it at all, and below a tenth before nutrients stop it.',
  ],
  rules: [
    {
      sourceChannel: 'nutrient',
      targetChannel: 'nutrient',
      transfer: { kind: 'identity' },
      sourceDiscipline: 'biology',
      targetDiscipline: 'biology',
      description: 'A nutrient reservoir delivers availability to a consuming organism.',
      confidence: 'established-simplified',
    },
  ],
};

export const ALL_COUPLINGS: readonly InteractionCoupling[] = [
  biologyToElectronics,
  materialsToBiology,
  biologyToMaterials,
  materialsToElectronics,
  biologyToBiology,
];

/** Look up a coupling by the pair of disciplines it connects. */
export function findCoupling(source: string, target: string): InteractionCoupling | undefined {
  return ALL_COUPLINGS.find(
    (c) =>
      (c.disciplines.includes(source) && c.disciplines.includes(target)) ||
      (c.disciplines.includes(target) && c.disciplines.includes(source)),
  );
}

/** All channels that participate in an interdisciplinary coupling. */
export function interdisciplinaryChannels(): readonly PortChannel[] {
  const channels = new Set<PortChannel>();
  for (const coupling of ALL_COUPLINGS) {
    for (const rule of coupling.rules) {
      if (rule.sourceChannel !== '*') channels.add(rule.sourceChannel);
      if (rule.targetChannel !== '*') channels.add(rule.targetChannel);
    }
  }
  return [...channels];
}
