// A ruler's marks: where they fall, how long each is, and whether a value is one of them. The rule
// lives in core, beside the axis tick rule, because the ruler's validation checks an object's ends
// with it and its layout draws with it, so the two cannot disagree (DEL-001).

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
 * How far `value × divisions` may sit from a whole number and still be a mark, in marks. Far below
 * one mark, so it absorbs only the noise of decimal arithmetic in a caller's computed values (0.1 + 0.2
 * is 0.30000000000000004). A written decimal such as 0.7, times 10, is already exact.
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

const isOwnKey = <T extends object>(table: T, key: unknown): key is keyof T => typeof key === "string" && Object.hasOwn(table, key);

/**
 * How many marks a ruler draws per unit: 10 for centimetres, or the denominator of an inch ruler's
 * smallest division (a sixteenth when none is given). Undefined for an unknown unit or division,
 * and for a division given on a centimetre ruler, which has none.
 */
// @spec NLC-REQ-044, NLC-REQ-046, NLC-REQ-047
export function divisionsPerUnit(unit: unknown, division?: unknown): number | undefined {
  if (unit === "centimeters") return division === undefined ? MILLIMETERS_PER_CENTIMETER : undefined;
  if (unit !== "inches") return undefined;
  const name = division ?? DEFAULT_INCH_DIVISION;
  return isOwnKey(INCH_DIVISIONS, name) ? INCH_DIVISIONS[name] : undefined;
}

/** `a` and `b`'s greatest common divisor, for whole numbers at least 0. */
function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

/**
 * The rank of the mark with index `index` on a ruler of `divisions` marks per unit, from the index
 * alone, never from its decimal value. A centimetre mark is whole when 10 divides its index and
 * half when 5 does. An inch mark's rank is how many times the inch is halved to reach it: index 8
 * of 16 is a half, index 4 a quarter, an odd index a sixteenth.
 */
// @spec NLC-REQ-045, NLC-REQ-048
export function rulerMarkRank(index: number, divisions: number): RulerMarkRank {
  if (divisions === MILLIMETERS_PER_CENTIMETER) return index % 10 === 0 ? 0 : index % 5 === 0 ? 1 : 2;
  return Math.log2(divisions / gcd(index, divisions)) as RulerMarkRank;
}

/**
 * A ruler's marks (NLC-REQ-044, NLC-REQ-047): one at every multiple of its smallest division from
 * 0 to its length, ends included, each `k / divisions` for an integer `k` (never a running sum, and
 * never `k × 0.1`, so the seventh millimetre is exactly 0.7), with its rank. Undefined, never
 * thrown, for a ruler no validated description gives: an unknown unit or division, or a length
 * that is not a whole number from 1 to the unit's maximum. The count is known before any mark is
 * listed: at most 301.
 */
// @spec NLC-REQ-044, NLC-REQ-045, NLC-REQ-047, NLC-REQ-048
export function rulerMarks(unit: unknown, length: unknown, division?: unknown): RulerMark[] | undefined {
  const divisions = divisionsPerUnit(unit, division);
  if (divisions === undefined || !isRulerLength(unit as RulerUnit, length)) return undefined;
  const marks: RulerMark[] = [];
  // A bounded counter: at most 301 turns (30 cm), from the length limit.
  for (let index = 0; index <= length * divisions; index++) {
    marks.push({ value: index / divisions, index, rank: rulerMarkRank(index, divisions) });
  }
  return marks;
}

/** Whether `length` is a whole number from 1 to `unit`'s maximum (NLC-REQ-042). */
export function isRulerLength(unit: RulerUnit, length: unknown): length is number {
  return Number.isInteger(length) && (length as number) >= 1 && (length as number) <= RULER_MAX_LENGTH[unit];
}

/**
 * Whether `value` is one of the marks of a ruler with `divisions` marks per unit: `value ×
 * divisions` within decimal noise of a whole number, so 0.7, 2.3 and 0.1 + 0.2 cm are marks and 3.25 cm is not
 * (NLC-REQ-053). It says nothing about the ruler's length: whether a value lies on the ruler is a
 * separate check. The one rule for an object's ends, checked and drawn.
 */
// @spec NLC-REQ-053
export function isRulerMark(value: number, divisions: number): boolean {
  const position = value * divisions;
  return Number.isFinite(position) && Math.abs(position - Math.round(position)) <= MARK_NOISE;
}

/**
 * The marks on either side of `value` on a ruler with `divisions` marks per unit, for an issue
 * naming where an object's end could go: 3.25 cm gives 3.2 and 3.3, and 1.3 in on a ruler marked to
 * eighths gives 1.25 and 1.375. A value that is a mark is both.
 */
export function nearestRulerMarks(value: number, divisions: number): readonly [number, number] {
  if (isRulerMark(value, divisions)) {
    const mark = Math.round(value * divisions) / divisions;
    return [mark, mark];
  }
  const position = value * divisions;
  return [Math.floor(position) / divisions, Math.ceil(position) / divisions];
}
