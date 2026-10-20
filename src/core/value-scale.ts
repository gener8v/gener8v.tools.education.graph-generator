import type { DescriptionBase, DomainCheck } from "./definitions/types";
import { formatSupplied } from "./format";
import { createIssue, pointer } from "./issues";
import type { Issue } from "./result";

// The value scale of the data graphs (DGP-REQ-005..009) and the axis ticks of the number line and
// coordinate graphs (NLC-REQ-004, NLC-REQ-005): their arithmetic and checks, in core so the
// validator and the layouts share one rule (DGP TICKET-001 quality review QR-005). Both choose
// intervals with `niceInterval`, parameterised by how many intervals they aim at.

/**
 * The largest magnitude of a value-scale end, and the bound each data graph puts on its values, so
 * every scale computed from them prints as a plain number in the drawing.
 */
export const VALUE_LIMIT = 1_000_000_000;

/** The most ticks a value axis may draw, the same limit as a number line's axis (NLC TICKET-001). */
export const MAX_VALUE_TICKS = 100;

/** A chosen interval gives at most this many intervals over the data, so tick labels stay readable. */
/** At most how many intervals a chosen tick interval divides a scale into, unless a layout asks for fewer. */
export const DEFAULT_VALUE_INTERVALS = 10;

/**
 * The finest interval a scale chooses. Data spanning less than this (say, every value 1e-300) is
 * drawn on a scale of this resolution, rather than one whose interval underflows to 0.
 */
const MIN_CHOSEN_INTERVAL = 1e-9;

/**
 * The finest a scale may be: a non-zero given end at least this large, and a span at least this
 * fraction of the ends' size (and at least this much). Finer scales print tick labels hundreds of
 * digits long, or tick positions a double cannot tell apart (security review SEC-001, SEC-003).
 */
export const SCALE_RESOLUTION = 1e-9;

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
  /**
   * At most how many intervals a chosen tick interval divides the span into (10 by default). A
   * layout whose axis is short for its tick labels asks for fewer, so every tick keeps its label
   * without crowding (DGP-REQ-009; DGP TICKET-003 DEL-004). A given interval is used as given.
   */
  readonly intervals?: number;
}

/** `x` with the binary noise of decimal arithmetic removed (0.1 × 3 → 0.3). */
export const cleanDecimal = (x: number): number => (x === 0 ? 0 : Number(x.toPrecision(12)));

/** Whether `x` is a whole number, allowing for decimal noise. */
const isWhole = (x: number) => Math.abs(x - Math.round(x)) <= EPSILON * Math.max(1, Math.abs(x));
const ceilWhole = (x: number) => (isWhole(x) ? Math.round(x) : Math.ceil(x));
const floorWhole = (x: number) => (isWhole(x) ? Math.round(x) : Math.floor(x));

/**
 * `x` as a tick value: decimal noise removed, and a leftover far below the interval (1e-25 where 0
 * was meant) taken as exactly 0, so no tick label prints dozens of digits (security review SEC-003).
 */
const onGrid = (x: number, interval: number): number => (Math.abs(x) < interval * EPSILON ? 0 : cleanDecimal(x));

/**
 * How many whole intervals of `interval` fit in `span`, allowing for decimal noise, and whether they
 * fill it exactly. The one count the checks and `valueTicks` share (quality review QR-003): computed
 * arithmetically, so a tiny interval over a huge span is counted, never listed.
 */
export function intervalsIn(span: number, interval: number): { count: number; exact: boolean } {
  const ratio = span / interval;
  const count = floorWhole(ratio);
  // At least one whole interval: 0.35 / 2e9 rounds to 0 but does not divide (security review SEC-004).
  return { count, exact: isWhole(ratio) && count >= 1 };
}

/**
 * The smallest interval of the form 1, 2 or 5 × 10ⁿ that covers `span` in at most `intervals`
 * intervals, and never finer than 1e-9.
 */
export function niceInterval(span: number, intervals: number = DEFAULT_VALUE_INTERVALS): number {
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
  // Read own-key: an inherited `intervals` would change every chosen scale (security review SEC-003).
  const intervals = Object.hasOwn(options, "intervals") ? options.intervals : undefined;
  const interval = givenInterval ?? niceInterval((given?.maximum ?? high) - (given?.minimum ?? floor), intervals);

  let minimum: number;
  if (given?.minimum !== undefined) minimum = given.minimum;
  else if (floor >= 0) minimum = 0;
  else if (given?.maximum !== undefined && givenInterval !== undefined) {
    minimum = onGrid(given.maximum - ceilWhole((given.maximum - floor) / interval) * interval, interval);
  } else minimum = onGrid(floorWhole(floor / interval) * interval, interval);
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
    maximum = onGrid(base + steps * interval, interval);
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
  // Grid indices past 2^53 cannot be counted (`k++` stops changing k), so such a scale is refused
  // rather than looped over forever (security review SEC-001).
  const countable = Number.isSafeInteger(first) && Number.isSafeInteger(last);
  if (!(tickInterval > 0) || !(maximum > minimum) || !countable || !(gridTicks <= MAX_VALUE_TICKS)) {
    throw new RangeError(`valueTicks(): ${tickInterval} does not give a drawable number of ticks from ${minimum} to ${maximum}`);
  }
  const clearance = tickInterval * (1 - EPSILON);
  const ticks = [minimum];
  // A bounded counter: at most `MAX_VALUE_TICKS` turns, whatever the numbers.
  for (let j = 0; j < gridTicks; j++) {
    const tick = onGrid(tickBase + (first + j) * tickInterval, tickInterval);
    if (tick - minimum >= clearance && maximum - tick >= clearance) ticks.push(tick);
  }
  ticks.push(maximum);
  return ticks;
}

/**
 * `too_many_ticks` at `path`, with a finite count and a finite interval that fits: a value scale's
 * tick interval or an axis's tick spacing.
 */
export function tooManyTicks(path: string, term: string, tickCount: number, span: number): Issue {
  const fitting = niceInterval(span, MAX_VALUE_TICKS - 1);
  return createIssue("too_many_ticks", path, {
    term,
    tickCount: Number.isFinite(tickCount) ? Math.min(Math.floor(tickCount), Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER,
    maxTicks: MAX_VALUE_TICKS,
    fittingSpacing: Number.isFinite(fitting) ? fitting : niceInterval(2 * VALUE_LIMIT, MAX_VALUE_TICKS - 1),
  });
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
 * - a non-zero given part smaller than `SCALE_RESOLUTION`, or a scale narrower than
 *   `SCALE_RESOLUTION` of its ends' size: `out_of_range`, since neither can be drawn;
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
  const numbers = values.map((v) => v.value);

  // A non-zero given part too small to print as a tick label (security review SEC-003). A tick
  // interval of 0 or less is `checkTickInterval`'s; one too fine for its scale is reported below as
  // `too_many_ticks`, whose message suggests an interval that fits.
  const tooSmall = (part: keyof GivenValueScale) => {
    const end = given[part];
    if (end === undefined || end === 0 || Math.abs(end) >= SCALE_RESOLUTION) return;
    const range = end > 0 ? { min: SCALE_RESOLUTION } : { max: -SCALE_RESOLUTION };
    issues.push(createIssue("out_of_range", scalePath(part), { term: scaleTerm(part), got: end, range }));
  };
  tooSmall("minimum");
  tooSmall("maximum");
  if (issues.length > 0) return issues;

  // An interval far too fine for the scale is counted before anything divides by it, so the scale
  // is never resolved to NaN or Infinity (security review SEC-004).
  if (interval !== undefined && intervalValid) {
    const [low, high] = extent(numbers);
    const roughSpan = (given.maximum ?? high) - (given.minimum ?? (options.allowNegative ? low : 0));
    if (roughSpan / interval >= MAX_VALUE_TICKS) {
      issues.push(tooManyTicks(scalePath("tickInterval"), scaleTerm("tickInterval"), roughSpan / interval + 1, roughSpan));
      return issues;
    }
    tooSmall("tickInterval");
    if (issues.length > 0) return issues;
  }

  const usable: GivenValueScale = intervalValid ? given : { minimum: given.minimum, maximum: given.maximum };
  const scale = resolveValueScale(usable, numbers, options);
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

  // A span too narrow for the size of its ends: ticks a double cannot tell apart (security review
  // SEC-001). Reported at a given end, the only way such a scale arises.
  const span = scale.maximum - scale.minimum;
  const resolution = SCALE_RESOLUTION * Math.max(1, Math.abs(scale.minimum), Math.abs(scale.maximum));
  if (span < resolution) {
    if (given.maximum !== undefined) {
      issues.push(
        createIssue("out_of_range", scalePath("maximum"), {
          term: scaleTerm("maximum"),
          got: given.maximum,
          range: { min: cleanDecimal(scale.minimum + resolution) },
        }),
      );
    } else {
      issues.push(
        createIssue("out_of_range", scalePath("minimum"), {
          term: scaleTerm("minimum"),
          got: given.minimum,
          range: { max: cleanDecimal(scale.maximum - resolution) },
        }),
      );
    }
    return issues;
  }

  if (interval !== undefined && intervalValid) {
    const { count, exact } = intervalsIn(span, interval);
    if (count + 1 > MAX_VALUE_TICKS) issues.push(tooManyTicks(scalePath("tickInterval"), scaleTerm("tickInterval"), count + 1, span));
    else if (!exact) {
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

/**
 * How many intervals an axis's chosen tick spacing aims at: at most 19, so at most 20 ticks. The
 * candidates 1, 2 and 5 × 10ⁿ are at most 2.5 times apart, so the spacing chosen gives more than
 * 19 / 2.5 intervals, and every range 0.001 to 10⁶ wide gets between 7 and 20 ticks (NLC-REQ-005).
 */
export const AXIS_DEFAULT_INTERVALS = 19;

/**
 * How close `k × spacing` must come to a value to count as on it, as a share of the larger of the
 * value's size and the spacing. Far below an axis's resolution (`SCALE_RESOLUTION`), so it absorbs
 * only the noise of decimal arithmetic (0.3 / 0.1), whatever the tick's index (code review CR-001).
 */
const AXIS_NOISE = 1e-12;

/** Whether `value` is the multiple `k × spacing`, allowing for decimal noise in value terms. */
const isMultiple = (value: number, k: number, spacing: number) =>
  Math.abs(k * spacing - value) <= AXIS_NOISE * Math.max(Math.abs(value), spacing);

/**
 * Whether the tick `tick` stands for `value`: equal within a millionth of the spacing, so a value
 * written in full (2/3) matches the tick listed at 12 significant digits (0.666666666667). The one
 * rule for custom tick labels, drawn and checked (code review CR-007).
 */
export const isTickValue = (value: number, tick: number, spacing: number): boolean => Math.abs(value - tick) <= spacing * 1e-6;

/**
 * The index range `first..last` of the multiples `k × spacing` inside `[min, max]`. An end counts as
 * a multiple when `k × spacing` is within decimal noise of it, measured in value terms rather than
 * in the index, so an axis far from zero gains no tick outside its range (code review CR-001).
 * Arithmetic only: never lists a tick.
 */
function multiplesIn(min: number, max: number, spacing: number): { first: number; last: number } {
  const [low, high] = [min / spacing, max / spacing];
  const [nearLow, nearHigh] = [Math.round(low), Math.round(high)];
  return {
    first: isMultiple(min, nearLow, spacing) ? nearLow : Math.ceil(low),
    last: isMultiple(max, nearHigh, spacing) ? nearHigh : Math.floor(high),
  };
}

/**
 * Whether an axis's range is too narrow to draw: narrower than `SCALE_RESOLUTION` of its larger
 * end, and than `SCALE_RESOLUTION`, so a double cannot tell its ticks apart.
 */
export function axisTooNarrow(min: number, max: number): boolean {
  return max - min < SCALE_RESOLUTION * Math.max(1, Math.abs(min), Math.abs(max));
}

/**
 * How many ticks an axis from `min` to `max` draws with `spacing`: the whole multiples of the
 * spacing inside the range, counted arithmetically, so a spacing of 1e-300 is counted, never
 * listed (NLC-REQ-008). Infinity when the count overflows.
 */
// @spec NLC-REQ-004, NLC-REQ-008
export function tickCount(min: number, max: number, spacing: number): number {
  const { first, last } = multiplesIn(min, max, spacing);
  const count = last - first + 1;
  return Number.isFinite(count) ? Math.max(0, count) : Number.POSITIVE_INFINITY;
}

/** The spacing an axis draws with: the given one, else 1, 2 or 5 × 10ⁿ for 7 to 20 ticks (NLC-REQ-005). */
// @spec NLC-REQ-005
export function axisSpacing(min: number, max: number, spacing?: number): number {
  return spacing ?? niceInterval(max - min, AXIS_DEFAULT_INTERVALS);
}

/**
 * The tick `k × spacing`, with the noise of decimal arithmetic removed at the spacing's own
 * precision (three decimals finer), not at 12 significant digits, so a tick far from zero keeps
 * its value: 3 × 0.1 gives 0.3, and 40000000001 × 0.0025 gives 100000000.0025 (quality review
 * QR-002). The data graphs' value scale keeps `onGrid`.
 */
function axisTick(k: number, spacing: number): number {
  const tick = Number((k * spacing).toFixed(Math.min(100, decimalPlaces(spacing) + 3)));
  return tick === 0 ? 0 : tick;
}

/**
 * An axis's ticks (NLC-REQ-004, NLC-REQ-005) when the axis can be drawn, else undefined: every
 * whole multiple `k × spacing` inside `[min, max]`, endpoints included, anchored at zero, so zero
 * is ticked whenever the range holds it and an endpoint off the grid gets no tick. Each tick is
 * `k × spacing` for an integer `k`, never a running sum (`axisTick`). Without a spacing, it is 1, 2
 * or 5 × 10ⁿ, giving 7 to 20 ticks (`AXIS_DEFAULT_INTERVALS`). An axis cannot be drawn when its
 * ends are not finite and increasing, its range is too narrow (`axisTooNarrow`), its spacing is not
 * a finite number above 0, or it would have more than `MAX_VALUE_TICKS` ticks. Never throws, so a
 * domain check can read the ticks of an axis another check may be reporting (code review CR-006):
 * checks use this, layouts `niceTicks`. The one decision on whether an axis can be drawn (quality
 * review QR-005).
 */
// @spec NLC-REQ-004, NLC-REQ-005
export function drawableTicks(min: number, max: number, spacing?: number): { spacing: number; ticks: number[] } | undefined {
  if (!Number.isFinite(min) || !Number.isFinite(max) || !(max > min) || axisTooNarrow(min, max)) return undefined;
  if (spacing !== undefined && !(spacing > 0 && Number.isFinite(spacing))) return undefined;
  const used = axisSpacing(min, max, spacing);
  const { first, last } = multiplesIn(min, max, used);
  const count = tickCount(min, max, used);
  if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last) || !(count <= MAX_VALUE_TICKS)) return undefined;
  const ticks: number[] = [];
  // A bounded counter: at most `MAX_VALUE_TICKS` turns.
  for (let j = 0; j < count; j++) ticks.push(axisTick(first + j, used));
  return { spacing: used, ticks };
}

/**
 * An axis's ticks, as `drawableTicks`, for a layout drawing a validated description. An axis that
 * cannot be drawn is one the validator refuses, so here it is a layout bug, and throws rather
 * than drawing nonsense.
 */
// @spec NLC-REQ-004, NLC-REQ-005
export function niceTicks(min: number, max: number, spacing?: number): { spacing: number; ticks: number[] } {
  const result = drawableTicks(min, max, spacing);
  if (result === undefined) throw new RangeError(`niceTicks(): ${spacing ?? "the default spacing"} does not give a drawable axis from ${min} to ${max}`);
  return result;
}

/** The number of decimal places in `spacing` written out in full: 0.25 → 2, 2 → 0, 1e-7 → 7. */
function decimalPlaces(spacing: number): number {
  const text = formatSupplied(Math.abs(spacing));
  const point = text.indexOf(".");
  return point < 0 ? 0 : text.length - point - 1;
}

/**
 * A tick's label (NLC-REQ-004, Behaviors & Rules → Ticks): its value with no more decimal places
 * than the spacing needs, and trailing zeros dropped: spacing 0.25 gives "0.75" and "0.5",
 * spacing 2 gives "4". Never in exponent form and never "-0".
 */
// @spec NLC-REQ-004
export function axisTickLabel(value: number, spacing: number): string {
  const rounded = Number(value.toFixed(Math.min(100, decimalPlaces(spacing))));
  return formatSupplied(rounded === 0 ? 0 : rounded);
}
