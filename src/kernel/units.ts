/**
 * FrankenLab — Dimensional unit system.
 *
 * Every physical quantity in FrankenLab carries a unit. This is not decoration:
 * it is the mechanism that makes interdisciplinary connections safe. A sensor
 * that emits volts cannot be wired to a substrate that carries kilograms without
 * the kernel rejecting it, and the AI assistant can never be handed a bare
 * number whose meaning is ambiguous.
 *
 * Dimensions are expressed as exponents over the SI base dimensions.
 */

export interface DimensionVector {
  /** Mass — kilograms. */
  readonly mass: number;
  /** Length — metres. */
  readonly length: number;
  /** Time — seconds. */
  readonly time: number;
  /** Electric current — amperes. */
  readonly current: number;
  /** Thermodynamic temperature — kelvin. */
  readonly temperature: number;
  /** Amount of substance — moles. */
  readonly amount: number;
  /** Luminous intensity — candela. */
  readonly luminous: number;
}

export const DIMENSIONLESS: DimensionVector = {
  mass: 0,
  length: 0,
  time: 0,
  current: 0,
  temperature: 0,
  amount: 0,
  luminous: 0,
};

export interface UnitDefinition {
  readonly id: string;
  readonly symbol: string;
  /** Exponents over SI base dimensions. */
  readonly dimension: DimensionVector;
  /** Multiplier converting a value in this unit into the SI base unit. */
  readonly factor: number;
  /** Human-facing description used by the UI and the assistant. */
  readonly description: string;
}

const base = (
  mass: number,
  length: number,
  time: number,
  current: number,
  temperature: number,
  amount: number,
  luminous: number,
): DimensionVector => ({
  mass,
  length,
  time,
  current,
  temperature,
  amount,
  luminous,
});

/**
 * The unit registry. Keep this explicit rather than generating it — every entry
 * is a deliberate modelling decision, and a reader can audit the whole system
 * in one screen.
 */
export const UNITS: readonly UnitDefinition[] = [
  // --- Dimensionless ---
  { id: 'unitless', symbol: '', dimension: DIMENSIONLESS, factor: 1, description: 'No physical dimension.' },
  { id: 'percent', symbol: '%', dimension: DIMENSIONLESS, factor: 0.01, description: 'Fraction expressed out of 100.' },
  { id: 'ratio', symbol: '', dimension: DIMENSIONLESS, factor: 1, description: 'Dimensionless ratio, typically 0 to 1.' },

  // --- Length ---
  { id: 'm', symbol: 'm', dimension: base(0, 1, 0, 0, 0, 0, 0), factor: 1, description: 'Metre.' },
  { id: 'cm', symbol: 'cm', dimension: base(0, 1, 0, 0, 0, 0, 0), factor: 0.01, description: 'Centimetre.' },
  { id: 'mm', symbol: 'mm', dimension: base(0, 1, 0, 0, 0, 0, 0), factor: 0.001, description: 'Millimetre.' },
  { id: 'm3', symbol: 'm³', dimension: base(0, 3, 0, 0, 0, 0, 0), factor: 1, description: 'Cubic metre.' },
  { id: 'cm3', symbol: 'cm³', dimension: base(0, 3, 0, 0, 0, 0, 0), factor: 1e-6, description: 'Cubic centimetre.' },

  // --- Mass ---
  { id: 'kg', symbol: 'kg', dimension: base(1, 0, 0, 0, 0, 0, 0), factor: 1, description: 'Kilogram.' },
  { id: 'g', symbol: 'g', dimension: base(1, 0, 0, 0, 0, 0, 0), factor: 0.001, description: 'Gram.' },
  { id: 'mg', symbol: 'mg', dimension: base(1, 0, 0, 0, 0, 0, 0), factor: 1e-6, description: 'Milligram.' },

  // --- Time ---
  { id: 's', symbol: 's', dimension: base(0, 0, 1, 0, 0, 0, 0), factor: 1, description: 'Second.' },
  { id: 'ms', symbol: 'ms', dimension: base(0, 0, 1, 0, 0, 0, 0), factor: 0.001, description: 'Millisecond.' },
  { id: 'min', symbol: 'min', dimension: base(0, 0, 1, 0, 0, 0, 0), factor: 60, description: 'Minute.' },
  { id: 'h', symbol: 'h', dimension: base(0, 0, 1, 0, 0, 0, 0), factor: 3600, description: 'Hour.' },
  { id: 'day', symbol: 'd', dimension: base(0, 0, 1, 0, 0, 0, 0), factor: 86400, description: 'Day.' },

  // --- Temperature ---
  { id: 'K', symbol: 'K', dimension: base(0, 0, 0, 0, 1, 0, 0), factor: 1, description: 'Kelvin.' },
  { id: 'degC', symbol: '°C', dimension: base(0, 0, 0, 0, 1, 0, 0), factor: 1, description: 'Degrees Celsius (offset applied at conversion).' },
  { id: 'degF', symbol: '°F', dimension: base(0, 0, 0, 0, 1, 0, 0), factor: 1 / 1.8, description: 'Degrees Fahrenheit (offset applied at conversion).' },

  // --- Electric ---
  { id: 'V', symbol: 'V', dimension: base(1, 2, -3, -1, 0, 0, 0), factor: 1, description: 'Volt.' },
  { id: 'mV', symbol: 'mV', dimension: base(1, 2, -3, -1, 0, 0, 0), factor: 0.001, description: 'Millivolt.' },
  { id: 'A', symbol: 'A', dimension: base(0, 0, 0, 1, 0, 0, 0), factor: 1, description: 'Ampere.' },
  { id: 'mA', symbol: 'mA', dimension: base(0, 0, 0, 1, 0, 0, 0), factor: 0.001, description: 'Milliampere.' },
  { id: 'ohm', symbol: 'Ω', dimension: base(1, 2, -3, -2, 0, 0, 0), factor: 1, description: 'Ohm.' },
  { id: 'kohm', symbol: 'kΩ', dimension: base(1, 2, -3, -2, 0, 0, 0), factor: 1000, description: 'Kilohm.' },
  { id: 'Mohm', symbol: 'MΩ', dimension: base(1, 2, -3, -2, 0, 0, 0), factor: 1e6, description: 'Megaohm.' },
  { id: 'F', symbol: 'F', dimension: base(-1, -2, 4, 2, 0, 0, 0), factor: 1, description: 'Farad.' },
  { id: 'uF', symbol: 'µF', dimension: base(-1, -2, 4, 2, 0, 0, 0), factor: 1e-6, description: 'Microfarad.' },
  { id: 'W', symbol: 'W', dimension: base(1, 2, -3, 0, 0, 0, 0), factor: 1, description: 'Watt.' },
  { id: 'C', symbol: 'C', dimension: base(0, 0, 1, 1, 0, 0, 0), factor: 1, description: 'Coulomb.' },

  // --- Material properties ---
  { id: 'S_per_m', symbol: 'S/m', dimension: base(-1, -3, 3, 2, 0, 0, 0), factor: 1, description: 'Siemens per metre — electrical conductivity.' },
  { id: 'S_per_cm', symbol: 'S/cm', dimension: base(-1, -3, 3, 2, 0, 0, 0), factor: 100, description: 'Siemens per centimetre — electrical conductivity.' },
  { id: 'W_per_mK', symbol: 'W/m·K', dimension: base(1, 1, -3, 0, -1, 0, 0), factor: 1, description: 'Thermal conductivity.' },
  { id: 'kg_per_m3', symbol: 'kg/m³', dimension: base(1, -3, 0, 0, 0, 0, 0), factor: 1, description: 'Density.' },
  { id: 'Pa', symbol: 'Pa', dimension: base(1, -1, -2, 0, 0, 0, 0), factor: 1, description: 'Pascal.' },
  { id: 'kPa', symbol: 'kPa', dimension: base(1, -1, -2, 0, 0, 0, 0), factor: 1000, description: 'Kilopascal.' },

  // --- Flow ---
  { id: 'kg_per_s', symbol: 'kg/s', dimension: base(1, 0, -1, 0, 0, 0, 0), factor: 1, description: 'Mass flow rate.' },
  { id: 'm3_per_s', symbol: 'm³/s', dimension: base(0, 3, -1, 0, 0, 0, 0), factor: 1, description: 'Volumetric flow rate.' },
  { id: 'g_per_s', symbol: 'g/s', dimension: base(1, 0, -1, 0, 0, 0, 0), factor: 0.001, description: 'Mass flow rate in grams per second.' },
  { id: 'm3_per_s_per_m2', symbol: 'm³/s/m²', dimension: base(0, 1, -1, 0, 0, 0, 0), factor: 1, description: 'Volumetric flux per unit area.' },

  // --- Amount of substance ---
  { id: 'mol', symbol: 'mol', dimension: base(0, 0, 0, 0, 0, 1, 0), factor: 1, description: 'Mole — the SI unit of amount of substance.' },
  { id: 'mmol', symbol: 'mmol', dimension: base(0, 0, 0, 0, 0, 1, 0), factor: 1e-3, description: 'Millimole.' },
  { id: 'L', symbol: 'L', dimension: base(0, 3, 0, 0, 0, 0, 0), factor: 1e-3, description: 'Litre.' },
  { id: 'mL', symbol: 'mL', dimension: base(0, 3, 0, 0, 0, 0, 0), factor: 1e-6, description: 'Millilitre.' },
  { id: 'mol_per_L', symbol: 'mol/L', dimension: base(0, -3, 0, 0, 0, 1, 0), factor: 1000, description: 'Molar concentration.' },
  { id: 'mmol_per_L', symbol: 'mmol/L', dimension: base(0, -3, 0, 0, 0, 1, 0), factor: 1, description: 'Millimolar concentration.' },

  // --- Energy ---
  { id: 'J', symbol: 'J', dimension: base(1, 2, -2, 0, 0, 0, 0), factor: 1, description: 'Joule.' },
  { id: 'kJ', symbol: 'kJ', dimension: base(1, 2, -2, 0, 0, 0, 0), factor: 1000, description: 'Kilojoule.' },
  { id: 'J_per_mol', symbol: 'J/mol', dimension: base(1, 2, -2, 0, 0, -1, 0), factor: 1, description: 'Energy per mole.' },
  { id: 'L_per_mol_per_s', symbol: 'L/(mol·s)', dimension: base(0, 3, -1, 0, 0, -1, 0), factor: 1e-3, description: 'Second-order rate constant.' },
];

/** Units with an affine (offset) conversion to their SI base unit. */
const AFFINE_UNITS: Record<string, { toBase: (v: number) => number; fromBase: (v: number) => number }> = {
  degC: { toBase: (v) => v + 273.15, fromBase: (v) => v - 273.15 },
  degF: { toBase: (v) => (v - 32) * (5 / 9) + 273.15, fromBase: (v) => (v - 273.15) * (9 / 5) + 32 },
};

const UNIT_BY_ID: ReadonlyMap<string, UnitDefinition> = new Map(UNITS.map((u) => [u.id, u]));

export function getUnit(id: string): UnitDefinition {
  const unit = UNIT_BY_ID.get(id);
  if (!unit) {
    throw new Error(`Unknown unit "${id}". Register it in UNITS before using it.`);
  }
  return unit;
}

export function hasUnit(id: string): boolean {
  return UNIT_BY_ID.has(id);
}

/** A value with an explicit unit. */
export interface Quantity {
  readonly value: number;
  readonly unit: string;
}

export function quantity(value: number, unit: string): Quantity {
  return { value, unit };
}

export function dimensionOf(unitId: string): DimensionVector {
  return getUnit(unitId).dimension;
}

export function dimensionsEqual(a: DimensionVector, b: DimensionVector): boolean {
  return (
    a.mass === b.mass &&
    a.length === b.length &&
    a.time === b.time &&
    a.current === b.current &&
    a.temperature === b.temperature &&
    a.amount === b.amount &&
    a.luminous === b.luminous
  );
}

/** True when a quantity in `from` can be converted into `to` without loss. */
export function areCompatible(from: string, to: string): boolean {
  return dimensionsEqual(dimensionOf(from), dimensionOf(to));
}

/**
 * Convert a quantity into another unit. Throws when the dimensions differ —
 * silently coercing incompatible units is exactly the class of bug this module
 * exists to prevent.
 */
export function convert(q: Quantity, to: string): Quantity {
  const from = getUnit(q.unit);
  const target = getUnit(to);
  if (!dimensionsEqual(from.dimension, target.dimension)) {
    throw new Error(
      `Cannot convert ${from.id} to ${target.id}: incompatible dimensions.`,
    );
  }
  const affine = AFFINE_UNITS[from.id];
  const baseValue = affine ? affine.toBase(q.value) : q.value * from.factor;
  const targetAffine = AFFINE_UNITS[to];
  const converted = targetAffine
    ? targetAffine.fromBase(baseValue / target.factor)
    : baseValue / target.factor;
  return { value: converted, unit: to };
}

/** Convert a quantity into the SI base unit for its dimension. */
export function toBase(q: Quantity): Quantity {
  const unit = getUnit(q.unit);
  const affine = AFFINE_UNITS[q.unit];
  const baseValue = affine ? affine.toBase(q.value) : q.value * unit.factor;
  return { value: baseValue, unit: baseUnitIdFor(unit.dimension) };
}

/**
 * The SI base unit for a dimension vector. Only the dimensions FrankenLab
 * actually uses are supported; anything else is a modelling error.
 */
export function baseUnitIdFor(dimension: DimensionVector): string {
  const { mass, length, time, current, temperature, amount, luminous } = dimension;
  if (amount !== 0 || luminous !== 0) {
    throw new Error('Amount-of-substance and luminous-intensity dimensions are not modelled yet.');
  }
  if (mass !== 0 && length === 0 && time === 0 && current === 0 && temperature === 0) return 'kg';
  if (mass === 0 && length !== 0 && time === 0 && current === 0 && temperature === 0) return 'm';
  if (mass === 0 && length === 0 && time !== 0 && current === 0 && temperature === 0) return 's';
  if (mass === 0 && length === 0 && time === 0 && current !== 0 && temperature === 0) return 'A';
  if (mass === 0 && length === 0 && time === 0 && current === 0 && temperature !== 0) return 'K';
  throw new Error(`No base unit defined for dimension ${JSON.stringify(dimension)}.`);
}

/** Format a quantity for display, e.g. "1.20 V". */
export function formatQuantity(q: Quantity, digits = 2): string {
  const symbol = getUnit(q.unit).symbol;
  const rendered = Number.isInteger(q.value) ? String(q.value) : q.value.toFixed(digits);
  return symbol ? `${rendered} ${symbol}` : rendered;
}

/** Unit ids grouped by the discipline that most often uses them, for the UI. */
export const UNITS_BY_DISCIPLINE: Readonly<Record<string, readonly string[]>> = {
  electronics: ['V', 'mV', 'A', 'mA', 'ohm', 'kohm', 'Mohm', 'F', 'uF', 'W'],
  biology: ['ratio', 'percent', 'degC', 'day', 'h', 'g', 'mg'],
  materials: ['S_per_m', 'S_per_cm', 'W_per_mK', 'kg_per_m3', 'kPa', 'degC'],
  chemistry: ['ratio', 'mol' in UNIT_BY_ID ? 'mol' : 'ratio', 'degC', 'kPa'],
  common: ['unitless', 'ratio', 'percent', 'degC', 's', 'min', 'h', 'day'],
};
