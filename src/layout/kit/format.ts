import { formatDerived, formatSupplied } from "../../core/format";
import type { Rounded } from "../scene";

/** The largest magnitude `fmt()` accepts: beyond it, `String(n)` switches to exponent form. */
const MAX_DRAWING_VALUE = 1e21;

/**
 * The one rounding function for every number written into a Scene (AD-007, prd/TC-002): 2 decimal
 * places, with negative zero normalized to zero. A non-finite input or result, or one too large to
 * print without exponent form, is a layout bug and throws, so it never reaches markup.
 */
// @spec CPSE-REQ-011
export function fmt(n: number): Rounded {
  const rounded = Math.round(n * 100) / 100;
  if (!Number.isFinite(rounded) || Math.abs(rounded) >= MAX_DRAWING_VALUE) {
    throw new RangeError(`fmt() cannot print ${n} as a drawing coordinate`);
  }
  return (rounded === 0 ? 0 : rounded) as Rounded;
}

/** A `points` attribute value ("x,y x,y …") with every coordinate through `fmt()`. */
// @spec CPSE-REQ-011
export function fmtPoints(points: ReadonlyArray<readonly [number, number]>): string {
  return points.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(" ");
}

export type PathCommand = "M" | "L" | "H" | "V" | "C" | "S" | "Q" | "T" | "A" | "Z";

/**
 * A `d` attribute value from commands and their numbers, every number through `fmt()`:
 * `pathData([["M", 0, 0], ["L", 10, 10], ["Z"]])` → `"M 0 0 L 10 10 Z"`. Arc flags are numbers too.
 */
// @spec CPSE-REQ-011
export function pathData(commands: ReadonlyArray<readonly [PathCommand, ...number[]]>): string {
  return commands.map(([command, ...values]) => [command, ...values.map(fmt)].join(" ")).join(" ");
}

/** A `transform` attribute value moving by (`x`, `y`), both through `fmt()`. */
// @spec CPSE-REQ-011
export function translate(x: number, y: number): string {
  return `translate(${fmt(x)} ${fmt(y)})`;
}

/**
 * A measurement value as displayed in a label: a supplied value exactly as given, a derived value
 * at the documented display precision (GSS-REQ-034). Built on the same formatters as the text
 * alternatives, so labels and text alternatives state the same numbers (GSV TICKET-001 code
 * review CR-007). Measurement labels use `measurementLabel` (src/layout/kit/measure.ts), which
 * adds the unit or custom text over the same formatters (GSS TICKET-002 code review CR-002).
 */
export function displayValue(n: number, provenance: "supplied" | "derived"): string {
  return provenance === "supplied" ? formatSupplied(n) : formatDerived(n);
}
