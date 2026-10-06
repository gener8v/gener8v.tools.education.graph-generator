import type { NumberValue } from "../definitions/types";
import type { Range } from "../result";

/** The allowed range of a number spec, in the shape an issue's `range` takes. */
export function rangeOf(spec: NumberValue): Range {
  const range: Range = {};
  if (spec.min !== undefined) range.min = spec.min;
  if (spec.max !== undefined) range.max = spec.max;
  if (spec.exclusiveMin) range.exclusiveMin = true;
  if (spec.exclusiveMax) range.exclusiveMax = true;
  return range;
}

export type RangeSide = "min" | "max";

/** Which side of the range a number breaks, or `undefined` when it is inside. */
export function rangeBroken(value: number, range: Range): RangeSide | undefined {
  const { min, max, exclusiveMin, exclusiveMax } = range;
  if (min !== undefined && (exclusiveMin ? value <= min : value < min)) return "min";
  if (max !== undefined && (exclusiveMax ? value >= max : value > max)) return "max";
  return undefined;
}
