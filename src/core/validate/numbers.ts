import type { NumberValue } from "../definitions/types";
import { ownRange } from "../issues";
import type { Range } from "../result";

/**
 * The allowed range of a number spec, in the shape an issue's `range` takes. The spec's bounds
 * are read own-key, so a term with none (a ruler's `length`) takes none from a polluted
 * prototype (rulers NLC TICKET-002 security review SEC-001).
 */
export function rangeOf(spec: NumberValue): Range {
  const { min, max, exclusiveMin, exclusiveMax } = ownRange(spec);
  const range: Range = {};
  if (min !== undefined) range.min = min;
  if (max !== undefined) range.max = max;
  if (exclusiveMin === true) range.exclusiveMin = true;
  if (exclusiveMax === true) range.exclusiveMax = true;
  return range;
}

export type RangeSide = "min" | "max";

/** Which side of the range a number breaks, or `undefined` when it is inside; the range is read own-key. */
export function rangeBroken(value: number, range: Range): RangeSide | undefined {
  const { min, max, exclusiveMin, exclusiveMax } = ownRange(range);
  if (min !== undefined && (exclusiveMin ? value <= min : value < min)) return "min";
  if (max !== undefined && (exclusiveMax ? value >= max : value > max)) return "max";
  return undefined;
}
