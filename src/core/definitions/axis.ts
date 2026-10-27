import { createIssue, pointer } from "../issues";
import type { Issue } from "../result";
import { MAX_VALUE_TICKS, SCALE_RESOLUTION, VALUE_LIMIT, axisTooNarrow, tickCount, tooManyTicks } from "../value-scale";
import { type DescriptionBase, type DomainCheck, type PropertyMap, type PropertySpec, defineProperties } from "./types";

/**
 * The largest magnitude of an axis end, the bound the data graphs put on their values too, so
 * every axis prints as plain numbers and projects without overflow (GSS TICKET-001 security review
 * SEC-002).
 */
export const AXIS_LIMIT = VALUE_LIMIT;

/** One axis of a number line, x,y graph or x,y,z graph, as a normalized description holds it. */
export interface Axis {
  readonly min: number;
  readonly max: number;
  readonly tickSpacing?: number;
  /** Whether the axis's tick labels are drawn; absent means shown (NLC-REQ-006). */
  readonly showTickLabels?: boolean;
}

/**
 * The terms of one axis (NLC-REQ-002..006), shared by every axis of every type, so each term has
 * one definition in the vocabulary. `tickSpacing` has no lower bound here: one of 0 or less is
 * reported by `axisChecks` as `tick_spacing_invalid`, naming the axis (NLC-REQ-009).
 */
// @spec NLC-REQ-002, NLC-REQ-003, NLC-REQ-004, NLC-REQ-005, NLC-REQ-006
export const axisProperties: PropertyMap = /* @__PURE__ */ defineProperties({
  min: {
    term: "min",
    kind: "number",
    required: true,
    min: -AXIS_LIMIT,
    max: AXIS_LIMIT,
    description: `The lowest value on an axis: negative, zero or positive, whole or decimal, from ${-AXIS_LIMIT} to ${AXIS_LIMIT}, and below the axis's max.`,
  },
  max: {
    term: "max",
    kind: "number",
    required: true,
    min: -AXIS_LIMIT,
    max: AXIS_LIMIT,
    description: `The highest value on an axis: negative, zero or positive, whole or decimal, from ${-AXIS_LIMIT} to ${AXIS_LIMIT}, and above the axis's min by at least a billionth of the larger end's size (and at least 0.000000001).`,
  },
  tickSpacing: {
    term: "tickSpacing",
    kind: "number",
    required: false,
    max: 2 * AXIS_LIMIT,
    description: `The distance between neighbouring ticks on an axis: greater than 0 and at most ${2 * AXIS_LIMIT}, giving at most ${MAX_VALUE_TICKS} ticks. Ticks fall at every whole multiple of it inside the range, so zero is always ticked when the range includes it, and an end that is not a multiple has no tick. When it is left out, the spacing is 1, 2 or 5 times a power of ten, chosen to give between 5 and 20 ticks on a range at least 0.001 wide (fewer on a narrower one), or coarser, down to two ticks, where the axis is drawn too short for its tick labels to stand apart.`,
  },
  showTickLabels: {
    term: "showTickLabels",
    kind: "boolean",
    required: false,
    description: "Whether an axis's ticks are labeled with their values; shown unless false. A label shows no more decimal places than the tick spacing needs.",
  },
});

/**
 * An axis property, such as a number line's `axis` or an x,y graph's `xAxis`: an object of the
 * shared axis terms (NLC-REQ-002), its `min` below its `max`, which the structure stage checks and
 * reports once at `/<term>/max` (GSV-REQ-022, GSV TICKET-003 code review CR-002).
 */
// @spec NLC-REQ-002
export function axisProperty(term: string, name: string): PropertySpec {
  return {
    term,
    kind: "object",
    required: true,
    description: `The ${name} axis: its range from min to max, and optionally its tick spacing and whether its ticks are labeled.`,
    properties: axisProperties,
    ordered: [["min", "max"]],
  };
}

/** `x` rounded up (or down) at 10 significant digits, so a suggested end stays valid once printed. */
function roundOutward(x: number, up: boolean): number {
  const step = 10 ** (Math.floor(Math.log10(Math.max(Math.abs(x), 1e-300))) - 9);
  return Number(((up ? Math.ceil(x / step) : Math.floor(x / step)) * step).toPrecision(10));
}

/**
 * `out_of_range` for a range too narrow to draw (`axisTooNarrow`), with an end the caller can use:
 * the smallest valid `max` for this `min`, or, when that would pass the axis limit, the largest
 * valid `min` for this `max` (code review CR-003).
 */
function narrowRange(term: string, min: number, max: number): Issue {
  // The width needed grows with the new end, so widen a little past the first estimate.
  const width = (end: number) => SCALE_RESOLUTION * Math.max(1, Math.abs(min), Math.abs(max), Math.abs(end)) * (1 + 1e-6);
  const upper = roundOutward(min + width(min + width(min)), true);
  if (upper <= AXIS_LIMIT && !axisTooNarrow(min, upper)) {
    return createIssue("out_of_range", pointer(term, "max"), { term: `${term}.max`, got: max, range: { min: upper } });
  }
  const lower = roundOutward(max - width(max - width(max)), false);
  return createIssue("out_of_range", pointer(term, "min"), { term: `${term}.min`, got: min, range: { max: lower } });
}

/**
 * The domain checks of the axis at the top-level term `term` (such as `xAxis`), once its range has
 * passed the structure stage (AD-004), each reported on its own:
 * - a range narrower than `SCALE_RESOLUTION` of its larger end (and than `SCALE_RESOLUTION`), whose
 *   ticks a double cannot tell apart: `out_of_range`, with an end that fits, as for a data graph's
 *   value scale;
 * - a tick spacing of 0 or less: `tick_spacing_invalid` (NLC-REQ-009);
 * - on a range that can be drawn, a tick spacing giving more than `MAX_VALUE_TICKS` ticks:
 *   `too_many_ticks`, with the limit and a spacing that fits (NLC-REQ-008), counted
 *   arithmetically, never listed.
 * Work is constant, whatever the numbers.
 */
// @spec NLC-REQ-008, NLC-REQ-009
export function axisChecks(term: string, axis: Axis): Issue[] {
  return [...axisRangeIssues(term, axis), ...axisSpacingIssues(term, axis)];
}

/** The range part of `axisChecks`: reads `min` and `max` only. */
function axisRangeIssues(term: string, { min, max }: Axis): Issue[] {
  return axisTooNarrow(min, max) ? [narrowRange(term, min, max)] : [];
}

/**
 * The tick-spacing part of `axisChecks`: silent on a range too narrow to draw, which the range part
 * reports. The optional spacing is read own-key, so a polluted `Object.prototype` cannot supply one
 * to an axis given as a plain object (security review SEC-002).
 */
function axisSpacingIssues(term: string, axis: Axis): Issue[] {
  const { min, max } = axis;
  const tickSpacing = Object.hasOwn(axis, "tickSpacing") ? axis.tickSpacing : undefined;
  if (tickSpacing === undefined) return [];
  const spacingTerm = `${term}.tickSpacing`;
  if (!(tickSpacing > 0)) return [createIssue("tick_spacing_invalid", pointer(term, "tickSpacing"), { term: spacingTerm, got: tickSpacing })];
  if (axisTooNarrow(min, max)) return [];
  const count = tickCount(min, max, tickSpacing);
  return count > MAX_VALUE_TICKS ? [tooManyTicks(pointer(term, "tickSpacing"), spacingTerm, count, max - min)] : [];
}

/**
 * `axisChecks` for the axis at the top-level term `term`, as two domain checks: one reading the
 * range only, so a failed tick spacing never hides a range too narrow to draw (code review CR-002),
 * and one reading the tick spacing with it. Register both: `checks: [...axisDomainChecks("xAxis")]`.
 */
export function axisDomainChecks(term: string): readonly DomainCheck[] {
  return [
    {
      name: `the ${term} range can be drawn`,
      inputs: [`${term}/min`, `${term}/max`],
      check: (description: DescriptionBase) => axisRangeIssues(term, description[term] as Axis),
    },
    {
      name: `the ${term} tick spacing is greater than 0 and gives at most ${MAX_VALUE_TICKS} ticks`,
      inputs: [`${term}/min`, `${term}/max`, `${term}/tickSpacing`],
      check: (description: DescriptionBase) => axisSpacingIssues(term, description[term] as Axis),
    },
  ];
}
