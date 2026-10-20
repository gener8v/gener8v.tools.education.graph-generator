// A ruler's marks: where they fall, how long each is, and where a value lies among them. The rule
// lives in core, beside the axis tick rule, because the ruler's validation checks an object's ends
// with it and its layout draws with it, so the two cannot disagree (DEL-001). Both build one
// `rulerScale` and ask it, so every question uses the same marks and the same allowance (quality
// review QR-001).

/** A ruler's units, as `unit` values in the vocabulary's spelling (GSV-REQ-049). */
export const RULER_UNITS = Object.freeze(["centimeters", "inches"] as const);

export type RulerUnit = (typeof RULER_UNITS)[number];

/** An inch ruler's smallest divisions, and how many of each make an inch (NLC-REQ-046, GSV-REQ-050). */
export const INCH_DIVISIONS = Object.freeze({ half: 2, quarter: 4, eighth: 8, sixteenth: 16 } as const);

export type InchDivision = keyof typeof INCH_DIVISIONS;

/** The smallest division of an inch ruler that names none (NLC-REQ-046). */
export const DEFAULT_INCH_DIVISION: InchDivision = "sixteenth";

/**
 * The longest ruler of each unit, in whole units (NLC-REQ-042): 30 cm (301 millimetre marks) and
 * 12 in (193 sixteenth marks). Provisional until the Product Owner settles NLC OQ-009.
 */
export const RULER_MAX_LENGTH: Readonly<Record<RulerUnit, number>> = Object.freeze({ centimeters: 30, inches: 12 });

/** Millimetres in a centimetre: a centimetre ruler's marks per unit. */
const MILLIMETERS_PER_CENTIMETER = 10;

/**
 * How far a value may sit from a mark, or past a ruler's end, and still count as there, in marks.
 * Far below one mark, so it absorbs only the noise of decimal arithmetic in a caller's computed
 * values (0.1 + 0.2 is 0.30000000000000004). A written decimal such as 0.7, times 10, is already
 * exact.
 */
const MARK_NOISE = 1e-9;

/**
 * A mark's rank, 0 for the longest: on a centimetre ruler 0 whole, 1 half, 2 millimetre; on an
 * inch ruler 0 whole, 1 half, 2 quarter, 3 eighth, 4 sixteenth. A rank is the same fraction
 * whatever the ruler's smallest division, so a quarter mark is as long on a ruler marked to
 * quarters as on one marked to sixteenths.
 */
export type RulerMarkRank = 0 | 1 | 2 | 3 | 4;

/** One mark of a ruler: its value in the ruler's unit, its index from 0, and its rank. */
export interface RulerMark {
  readonly value: number;
  readonly index: number;
  readonly rank: RulerMarkRank;
}

/**
 * Where a value lies on a ruler: on the mark with this index (and this value, the mark's own),
 * between two neighbouring marks, or off the ruler.
 */
export type RulerLocation =
  | { readonly kind: "mark"; readonly index: number; readonly value: number }
  | { readonly kind: "between"; readonly below: number; readonly above: number }
  | { readonly kind: "off" };

/** A ruler of a given unit, length and smallest division: its marks, and where a value lies among them. */
export interface RulerScale {
  readonly unit: RulerUnit;
  readonly length: number;
  /** Marks per unit: 10 for centimetres, or the smallest division's count per inch. */
  readonly marksPerUnit: number;
  /** Every mark from 0 to the length, ends included, in order. */
  readonly marks: readonly RulerMark[];
  /**
   * Where `value` lies; anything but a number is off the ruler. Two ends are in order when the
   * first's mark `index` is below the second's.
   */
  locate(value: unknown): RulerLocation;
}

const isOwnKey = <T extends object>(table: T, key: unknown): key is keyof T => typeof key === "string" && Object.hasOwn(table, key);

/**
 * How many marks a ruler draws per unit: 10 for centimetres, or the count of an inch ruler's
 * smallest division per inch (a sixteenth when none is given). Undefined for an unknown unit or
 * division, `null` included, and for a division given on a centimetre ruler, which has none. Only
 * an absent (undefined) division takes the default (code review CR-001).
 */
// @spec NLC-REQ-044, NLC-REQ-046, NLC-REQ-047
export function marksPerUnit(unit: unknown, smallestDivision?: unknown): number | undefined {
  if (unit === "centimeters") return smallestDivision === undefined ? MILLIMETERS_PER_CENTIMETER : undefined;
  if (unit !== "inches") return undefined;
  const name = smallestDivision === undefined ? DEFAULT_INCH_DIVISION : smallestDivision;
  return isOwnKey(INCH_DIVISIONS, name) ? INCH_DIVISIONS[name] : undefined;
}

/** Whether `length` is a whole number from 1 to `unit`'s maximum (NLC-REQ-042). */
// @spec NLC-REQ-042
export function isRulerLength(unit: unknown, length: unknown): length is number {
  return isOwnKey(RULER_MAX_LENGTH, unit) && Number.isInteger(length) && (length as number) >= 1 && (length as number) <= RULER_MAX_LENGTH[unit];
}

/** An inch mark's rank, by its index's reduced denominator: 1 a whole inch, 2 a half, … 16 a sixteenth. */
const INCH_RANKS: Readonly<Record<number, RulerMarkRank>> = Object.freeze({ 1: 0, 2: 1, 4: 2, 8: 3, 16: 4 });

/** `a` and `b`'s greatest common divisor, for whole numbers at least 0. */
function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

/**
 * The rank of the mark with index `index` on a `unit` ruler of `perUnit` marks per unit, from the
 * index alone, never from its decimal value. A centimetre mark is whole when its index is a
 * multiple of 10 and half when it is a multiple of 5. An inch mark's rank is how many times the
 * inch is halved to reach it: index 8 of 16 is a half, index 4 a quarter, an odd index a sixteenth
 * (quality review QR-007: a table, so no value outside the rank type can be returned).
 */
// @spec NLC-REQ-045, NLC-REQ-048
function markRank(unit: RulerUnit, index: number, perUnit: number): RulerMarkRank {
  if (unit === "centimeters") {
    if (index % MILLIMETERS_PER_CENTIMETER === 0) return 0;
    if (index % (MILLIMETERS_PER_CENTIMETER / 2) === 0) return 1;
    return 2;
  }
  const rank = INCH_RANKS[perUnit / gcd(index, perUnit)];
  if (rank === undefined) throw new RangeError(`markRank(): no rank for mark ${index} of ${perUnit} per inch`);
  return rank;
}

/**
 * Where `value` lies on a ruler of `length` units with `perUnit` marks per unit, with one allowance
 * for decimal noise (`MARK_NOISE`, in marks) at the ends and at every mark, so 0.1 + 0.2 cm is the
 * 3 mm mark, 0.1 × 3 × 100 (30.000000000000004) is a 30 cm ruler's end and −2.8e-17 is its 0
 * (code review CR-003). Off the ruler is decided first, so the marks named either side of a value
 * between marks are always on it. A mark's value is `index / perUnit`, never −0. Anything but a
 * number is off the ruler, never converted: `null`, `""` and `"2.3"` are not marks, no `valueOf`
 * runs, and a BigInt cannot throw (security review SEC-001).
 */
// @spec NLC-REQ-052, NLC-REQ-053
function locateOnRuler(value: unknown, length: number, perUnit: number): RulerLocation {
  if (typeof value !== "number") return { kind: "off" };
  const position = value * perUnit;
  if (!Number.isFinite(position) || position < -MARK_NOISE || position > length * perUnit + MARK_NOISE) return { kind: "off" };
  const index = Math.round(position) + 0;
  if (Math.abs(position - index) <= MARK_NOISE) return { kind: "mark", index, value: index / perUnit };
  return { kind: "between", below: Math.floor(position) / perUnit, above: Math.ceil(position) / perUnit };
}

/**
 * A ruler (NLC-REQ-044..048): its marks, one at every multiple of its smallest division from 0 to
 * its length, ends included, each `index / marksPerUnit` for an integer index (never a running sum,
 * and never `index × 0.1`, so the seventh millimetre is exactly 0.7), with its rank; and `locate`,
 * the one answer to where an object's end lies (NLC-REQ-052, NLC-REQ-053). Undefined, never thrown,
 * for a ruler no validated description gives: an unknown unit or smallest division, or a length
 * that is not a whole number from 1 to the unit's maximum. These are checked before any mark is
 * listed: at most 301.
 */
// @spec NLC-REQ-044, NLC-REQ-045, NLC-REQ-046, NLC-REQ-047, NLC-REQ-048
export function rulerScale(unit: unknown, length: unknown, smallestDivision?: unknown): RulerScale | undefined {
  const perUnit = marksPerUnit(unit, smallestDivision);
  if (perUnit === undefined || !isRulerLength(unit, length)) return undefined;
  const rulerUnit = unit as RulerUnit;
  const marks: RulerMark[] = [];
  // A bounded counter: at most 301 turns (30 cm), from the length limit.
  for (let index = 0; index <= length * perUnit; index++) {
    marks.push(Object.freeze({ value: index / perUnit, index, rank: markRank(rulerUnit, index, perUnit) }));
  }
  return Object.freeze({
    unit: rulerUnit,
    length,
    marksPerUnit: perUnit,
    marks: Object.freeze(marks),
    locate: (value: unknown) => locateOnRuler(value, length, perUnit),
  });
}
