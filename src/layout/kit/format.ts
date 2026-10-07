import { formatDerived, formatSupplied } from "../../core/format";
import type { Rounded } from "../scene";

/**
 * The one rounding function for every number written into a Scene (AD-007, prd/TC-002): 2 decimal
 * places, with negative zero normalized to zero. A non-finite value is a layout bug and throws,
 * so it can never reach markup as `NaN` or `Infinity`.
 */
// @spec CPSE-REQ-011
export function fmt(n: number): Rounded {
  if (!Number.isFinite(n)) throw new RangeError(`fmt() received a non-finite number: ${n}`);
  const rounded = Math.round(n * 100) / 100;
  return (rounded === 0 ? 0 : rounded) as Rounded;
}

/** A `points` attribute value ("x,y x,y …") with every coordinate through `fmt()`. */
// @spec CPSE-REQ-011
export function fmtPoints(points: ReadonlyArray<readonly [number, number]>): string {
  return points.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(" ");
}

/**
 * A measurement value as displayed in a label: a supplied value exactly as given, a derived value
 * at the documented display precision (GSS-REQ-034). Built on the same formatters as the text
 * alternatives, so labels and text alternatives state the same numbers (GSV TICKET-001 code
 * review CR-007).
 */
export function displayValue(n: number, supplied: boolean): string {
  return supplied ? formatSupplied(n) : formatDerived(n);
}
