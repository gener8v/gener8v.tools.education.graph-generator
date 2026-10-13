import type { DescriptionBase, DomainCheck } from "./definitions/types";
import { createIssue, pointer } from "./issues";
import type { Issue } from "./result";

// The value scale of the data graphs (DGP-REQ-005..009): its arithmetic and checks, in core so the
// validator and the layouts share one rule (DGP TICKET-001 quality review QR-005). A future shared
// tick rule (the number line's, NLC TICKET-001) belongs here too, not in the layout kit, which core
// cannot import.

/**
 * The largest magnitude of a value-scale end, and the bound each data graph puts on its values, so
 * every scale computed from them prints as a plain number in the drawing.
 */
export const VALUE_LIMIT = 1_000_000_000;

/** The most ticks a value axis may draw, the same limit as a number line's axis (NLC TICKET-001). */
export const MAX_VALUE_TICKS = 100;

/** A chosen interval gives at most this many intervals over the data, so tick labels stay readable. */
const DEFAULT_INTERVALS = 10;

/**
 * The finest interval a scale chooses. Data spanning less than this (say, every value 1e-300) is
 * drawn on a scale of this resolution, rather than one whose interval underflows to 0.
 */
const MIN_CHOSEN_INTERVAL = 1e-9;

/** Relative tolerance for whole-number tests on decimal values, so 0.3 / 0.1 counts as 3. */
const EPSILON = 1e-9;

/** A value scale as a description gives it: any part may be left out. */
export interface GivenValueScale {
  readonly minimum?: number;
  readonly maximum?: number;
  readonly tickInterval?: number;
}

/**
 * A complete value scale. Ticks sit at both ends and at every `tickBase + k × tickInterval` between
 * them that is at least one interval from each end (`valueTicks`). With a given interval the base is
 * the minimum, and the interval divides the scale; with a chosen one the base is zero.
 */
export interface ValueScale {
  readonly minimum: number;
  readonly maximum: number;
  readonly tickInterval: number;
  readonly tickBase: number;
}

export interface ScaleOptions {
  /** Whether a chosen minimum may be below zero for negative values: line graphs only (DGP-REQ-015). */
  readonly allowNegative: boolean;
}

/** `x` with the binary noise of decimal arithmetic removed (0.1 × 3 → 0.3). */
export const cleanDecimal = (x: number): number => (x === 0 ? 0 : Number(x.toPrecision(12)));

/** Whether `x` is a whole number, allowing for decimal noise. */
const isWhole = (x: number) => Math.abs(x - Math.round(x)) <= EPSILON * Math.max(1, Math.abs(x));
const ceilWhole = (x: number) => (isWhole(x) ? Math.round(x) : Math.ceil(x));
const floorWhole = (x: number) => (isWhole(x) ? Math.round(x) : Math.floor(x));

/**
 * How many whole intervals of `interval` fit in `span`, allowing for decimal noise, and whether they
 * fill it exactly. The one count the checks and `valueTicks` share (quality review QR-003): computed
 * arithmetically, so a tiny interval over a huge span is counted, never listed.
 */
export function intervalsIn(span: number, interval: number): { count: number; exact: boolean } {
  const ratio = span / interval;
  return { count: floorWhole(ratio), exact: isWhole(ratio) };
}

/**
 * The smallest interval of the form 1, 2 or 5 × 10ⁿ that covers `span` in at most `intervals`
 * intervals, and never finer than 1e-9.
 */
export function niceInterval(span: number, intervals: number = DEFAULT_INTERVALS): number {
  const target = Math.max((span > 0 ? span : 1) / intervals, MIN_CHOSEN_INTERVAL);
  const magnitude = 10 ** Math.floor(Math.log10(target));
  for (const multiple of [1, 2, 5, 10]) {
    const interval = cleanDecimal(multiple * magnitude);
    if (interval * (1 + EPSILON) >= target) return interval;
  }
  return cleanDecimal(10 * magnitude);
}

/** The lowest and highest of `values` and zero, by a loop: never spread a caller-sized list into arguments. */
function extent(values: readonly number[]): [number, number] {
  let low = 0;
  let high = 0;
  for (const value of values) {
    if (value < low) low = value;
    if (value > high) high = value;
  }
  return [low, high];
}

/**
 * The scale a data graph draws (DGP-REQ-005, DGP-REQ-006): each part the description gives, used
 * exactly; each part left out, chosen to fit `values`.
 * - A chosen interval is 1, 2 or 5 × 10ⁿ, at most ten intervals over the scale's span, chosen first.
 * - A chosen minimum is zero; with `allowNegative` and a negative value, it is a tick at or below
 *   the lowest value: counted down from a given maximum by a given interval, so that interval
 *   divides the scale (code review CR-004), and otherwise a multiple of the interval.
 * - A chosen maximum is the first tick at or above the highest value, above the minimum: a multiple
 *   of a chosen interval, or a whole number of given intervals from the minimum.
 * A given end that is not on a chosen interval still gets its own tick (`valueTicks`), so the axis
 * always ends on a labeled tick, and never with crowded labels (quality review QR-002, superseding
 * code review CR-001's dividing interval). All-zero data gives 0 to 1. With nothing given this is
 * the default scale, which always includes every value.
 */
// @spec DGP-REQ-005, DGP-REQ-006
export function resolveValueScale(given: GivenValueScale | undefined, values: readonly number[], options: ScaleOptions): ValueScale {
  const [low, high] = extent(values);
  const floor = options.allowNegative ? low : 0;
  const givenInterval = given?.tickInterval;
  const interval = givenInterval ?? niceInterval((given?.maximum ?? high) - (given?.minimum ?? floor));

  let minimum: number;
  if (given?.minimum !== undefined) minimum = given.minimum;
  else if (floor >= 0) minimum = 0;
  else if (given?.maximum !== undefined && givenInterval !== undefined) {
    minimum = cleanDecimal(given.maximum - ceilWhole((given.maximum - floor) / interval) * interval);
  } else minimum = cleanDecimal(floorWhole(floor / interval) * interval);
  // The noise tolerance must never leave a value outside a chosen end.
  if (given?.minimum === undefined && minimum > floor) minimum = cleanDecimal(minimum - interval);

  let maximum: number;
  if (given?.maximum !== undefined) maximum = given.maximum;
  else {
    // With nothing above the minimum (all-zero data), the scale spans one unit, or one given interval.
    const top = high > minimum ? high : minimum + (givenInterval ?? 1);
    // A given interval counts from the minimum; a chosen one from zero, so the end is a multiple of it.
    const base = givenInterval === undefined ? 0 : minimum;
    const steps = Math.max(ceilWhole((top - base) / interval), floorWhole((minimum - base) / interval) + 1);
    maximum = cleanDecimal(base + steps * interval);
    if (maximum < high) maximum = cleanDecimal(maximum + interval);
  }
  return { minimum, maximum, tickInterval: interval, tickBase: givenInterval === undefined ? 0 : minimum };
}

/**
 * Every tick of a scale (DGP-REQ-009): both ends, and each `tickBase + k × tickInterval` between them
 * that is at least one interval from either end. A given end off the grid therefore replaces the grid
 * tick beside it rather than crowding it (`{ maximum: 97 }` → 0, 10, … 80, 97), and labels are never
 * closer than one interval (quality review QR-002). Decimal noise is removed (0.1 × 3 → 0.3). A scale
 * with more than `MAX_VALUE_TICKS` grid ticks is a layout bug and throws rather than listing millions.
 */
// @spec DGP-REQ-009
export function valueTicks(scale: ValueScale): number[] {
  const { minimum, maximum, tickInterval, tickBase } = scale;
  const first = ceilWhole((minimum - tickBase) / tickInterval);
  const last = floorWhole((maximum - tickBase) / tickInterval);
  const gridTicks = last - first + 1;
  if (!(tickInterval > 0) || !(maximum > minimum) || !Number.isFinite(gridTicks) || gridTicks > MAX_VALUE_TICKS) {
    throw new RangeError(`valueTicks(): ${tickInterval} does not give a drawable number of ticks from ${minimum} to ${maximum}`);
  }
  const clearance = tickInterval * (1 - EPSILON);
  const ticks = [minimum];
  for (let k = first; k <= last; k++) {
    const tick = cleanDecimal(tickBase + k * tickInterval);
    if (tick - minimum >= clearance && maximum - tick >= clearance) ticks.push(tick);
  }
  ticks.push(maximum);
  return ticks;
}

/** A value read by a scale check: where it is, its readable term (`values[3]`), and the number. */
export interface ScaledValue {
  readonly path: string;
  readonly term: string;
  readonly value: number;
}

const SCALE = "valueScale";
const scalePath = (part: keyof GivenValueScale) => pointer(SCALE, part);
const scaleTerm = (part: keyof GivenValueScale) => `${SCALE}.${part}`;

/**
 * A given tick interval of 0 or less, reported as `tick_spacing_invalid` (DGP-REQ-008). Separate
 * from `checkValueScale`, which reads every scale part and value, so a failure there never hides
 * it: register `tickIntervalCheck` alongside the scale check (code review CR-006).
 */
// @spec DGP-REQ-008
export function checkTickInterval(given: GivenValueScale | undefined): Issue[] {
  const interval = given?.tickInterval;
  if (interval === undefined || interval > 0) return [];
  return [createIssue("tick_spacing_invalid", scalePath("tickInterval"), { term: scaleTerm("tickInterval"), got: interval })];
}

/** `checkTickInterval` as a domain check, reading the tick interval only. */
export const tickIntervalCheck: DomainCheck = {
  name: "the value-scale tick interval is greater than 0",
  inputs: ["valueScale/tickInterval"],
  check: (description: DescriptionBase) => checkTickInterval(description["valueScale"] as GivenValueScale | undefined),
};

/**
 * The value-scale checks every line and bar graph shares (DGP-REQ-007, DGP-REQ-008), on a given
 * scale and the graph's values. A tick interval of 0 or less is `checkTickInterval`'s; here it is
 * left out of the scale, so nothing below reports on it:
 * - a given maximum not above the minimum chosen for it: `out_of_range`;
 * - a given interval that would draw more than `MAX_VALUE_TICKS` ticks: `too_many_ticks`;
 * - a given interval that does not divide the scale into whole intervals: `tick_interval_not_dividing`;
 * - each value beyond a given end: `scale_excludes_value` at the value's own path.
 * Intervals are counted with `intervalsIn`, the count `valueTicks` uses. A scale part left out never
 * excludes a value, and a given scale is never extended. Work grows with the number of values only.
 * Whether a bar graph's minimum may be above zero is the bar graph's own check (DGP TICKET-003).
 */
// @spec DGP-REQ-007, DGP-REQ-008
export function checkValueScale(values: readonly ScaledValue[], given: GivenValueScale | undefined, options: ScaleOptions): Issue[] {
  if (given === undefined) return [];
  const issues: Issue[] = [];
  const interval = given.tickInterval;
  const intervalValid = interval === undefined || interval > 0;
  const usable: GivenValueScale = intervalValid ? given : { minimum: given.minimum, maximum: given.maximum };
  const scale = resolveValueScale(
    usable,
    values.map((v) => v.value),
    options,
  );
  if (!(scale.maximum > scale.minimum)) {
    // Only a given maximum against a chosen minimum: two given ends are ordered in stage 2.
    issues.push(
      createIssue("out_of_range", scalePath("maximum"), {
        term: scaleTerm("maximum"),
        got: scale.maximum,
        range: { min: scale.minimum, exclusiveMin: true },
      }),
    );
    return issues;
  }
  if (interval !== undefined && intervalValid) {
    const span = scale.maximum - scale.minimum;
    const { count, exact } = intervalsIn(span, interval);
    const tickCount = count + 1;
    if (tickCount > MAX_VALUE_TICKS) {
      issues.push(
        createIssue("too_many_ticks", scalePath("tickInterval"), {
          term: scaleTerm("tickInterval"),
          tickCount: Number.isFinite(tickCount) ? tickCount : Number.MAX_SAFE_INTEGER,
          maxTicks: MAX_VALUE_TICKS,
          fittingSpacing: niceInterval(span, MAX_VALUE_TICKS - 1),
        }),
      );
    } else if (!exact) {
      issues.push(createIssue("tick_interval_not_dividing", scalePath("tickInterval"), { term: scaleTerm("tickInterval"), got: interval }));
    }
  }
  for (const { path, term, value } of values) {
    const below = given.minimum !== undefined && value < given.minimum;
    const above = given.maximum !== undefined && value > given.maximum;
    if (below || above) {
      issues.push(createIssue("scale_excludes_value", path, { term, got: value, range: { min: scale.minimum, max: scale.maximum } }));
    }
  }
  return issues;
}
