import { createIssue, pointer } from "../issues";
import type { Issue } from "../result";
import { MAX_VALUE_TICKS, SCALE_RESOLUTION, VALUE_LIMIT, cleanDecimal, tickCount, tooManyTicks } from "../value-scale";
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
    description: `The distance between neighbouring ticks on an axis: greater than 0, giving at most ${MAX_VALUE_TICKS} ticks. Ticks fall at every whole multiple of it inside the range, so zero is always ticked when the range includes it, and an end that is not a multiple has no tick. When it is left out, the spacing is 1, 2 or 5 times a power of ten, chosen to give between 5 and 20 ticks.`,
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

/**
 * The domain checks of the axis at `path` (a top-level term such as `xAxis`), once its range has
 * passed the structure stage (AD-004):
 * - a tick spacing of 0 or less: `tick_spacing_invalid` (NLC-REQ-009);
 * - a tick spacing giving more than `MAX_VALUE_TICKS` ticks: `too_many_ticks`, with the limit and a
 *   spacing that fits (NLC-REQ-008), counted arithmetically, never listed;
 * - a range narrower than `SCALE_RESOLUTION` of its larger end (and than `SCALE_RESOLUTION`), whose
 *   ticks a double cannot tell apart: `out_of_range` at `max`, as for a data graph's value scale.
 * Work is constant, whatever the numbers.
 */
// @spec NLC-REQ-008, NLC-REQ-009
export function axisChecks(path: string, axis: Axis): Issue[] {
  const { min, max, tickSpacing } = axis;
  const spacingTerm = `${path}.tickSpacing`;
  if (tickSpacing !== undefined && !(tickSpacing > 0)) {
    return [createIssue("tick_spacing_invalid", pointer(path, "tickSpacing"), { term: spacingTerm, got: tickSpacing })];
  }
  const span = max - min;
  const resolution = SCALE_RESOLUTION * Math.max(1, Math.abs(min), Math.abs(max));
  if (span < resolution) {
    return [createIssue("out_of_range", pointer(path, "max"), { term: `${path}.max`, got: max, range: { min: cleanDecimal(min + resolution) } })];
  }
  if (tickSpacing !== undefined) {
    const count = tickCount(min, max, tickSpacing);
    if (count > MAX_VALUE_TICKS) return [tooManyTicks(pointer(path, "tickSpacing"), spacingTerm, count, span)];
  }
  return [];
}

/** `axisChecks` for the axis at the top-level term `path`, as a domain check reading only that axis. */
export function axisCheck(path: string): DomainCheck {
  return {
    name: `the ${path} tick spacing and range can be drawn`,
    inputs: [`${path}/min`, `${path}/max`, `${path}/tickSpacing`],
    check: (description: DescriptionBase) => axisChecks(path, description[path] as Axis),
  };
}
