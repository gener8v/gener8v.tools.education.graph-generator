import fc from "fast-check";
import { CALLER_TEXT_LIMIT } from "../../src/core/definitions/shared";
import { validate } from "../../src/core/index";

// fast-check arbitraries for valid number-line, x,y and x,y,z descriptions (graph-library NLC
// TICKET-005). Every sample is filtered through `validate()`, so only valid descriptions reach a
// layout; values are built on a quarter-unit grid so the arithmetic is exact and the ranges give
// at most 41 ticks per axis, far under the limit.

const SPACINGS = [0.25, 0.5, 1, 2, 5, 10] as const;
const COLORS = ["red", "blue", "green", "#123456"] as const;

interface AxisTerms {
  min: number;
  max: number;
  tickSpacing?: number;
  showTickLabels?: boolean;
}

/** One axis: a range of 1 to 40 spacings, starting on a spacing, with the spacing given or left to the default. */
const axisArb: fc.Arbitrary<AxisTerms> = fc
  .record({
    spacing: fc.constantFrom(...SPACINGS),
    start: fc.integer({ min: -20, max: 20 }),
    steps: fc.integer({ min: 1, max: 40 }),
    given: fc.boolean(),
    labels: fc.constantFrom(true, undefined, false),
  })
  .map(({ spacing, start, steps, given, labels }) => ({
    min: start * spacing,
    max: (start + steps) * spacing,
    ...(given && { tickSpacing: spacing }),
    ...(labels !== undefined && { showTickLabels: labels }),
  }));

/** A value inside the range, to four decimals and clamped so rounding never leaves it. */
const within = (min: number, max: number, fraction: number): number => Math.min(max, Math.max(min, Number((min + fraction * (max - min)).toFixed(4))));

const fractionArb = fc.double({ min: 0, max: 1, noNaN: true });
/** A label of plain printable text, within the caller-text limit. */
const labelArb = fc.string({ unit: "grapheme-ascii", maxLength: 40 }).map((text) => text.slice(0, CALLER_TEXT_LIMIT));
const colorArb = fc.constantFrom(...COLORS);

/** The terms `label` and `color` optionally add to an element. */
const decorationArb = fc
  .record({ label: fc.option(labelArb, { nil: undefined }), color: fc.option(colorArb, { nil: undefined }) })
  .map(({ label, color }) => ({ ...(label !== undefined && { label }), ...(color !== undefined && { color }) }));

const titleArb = fc.option(labelArb, { nil: undefined });
const arrowArb = fc.constantFrom(true, false, undefined);

/** Keeps only descriptions the validator accepts, so a layout never sees an invalid one. */
const valid = <T>(arbitrary: fc.Arbitrary<T>): fc.Arbitrary<T> => arbitrary.filter((description) => validate(description).valid);

/** A valid number-line description: an axis, up to 8 points on it, and optional arrows, title and labels. */
export const numberLineArb: fc.Arbitrary<Record<string, unknown>> = valid(
  axisArb.chain((axis) =>
    fc
      .record({
        points: fc.array(fc.tuple(fractionArb, decorationArb), { maxLength: 8 }),
        title: titleArb,
        lineLabel: titleArb,
        leftArrow: arrowArb,
        rightArrow: arrowArb,
      })
      .map(({ points, title, lineLabel, leftArrow, rightArrow }) => ({
        type: "number-line",
        axis,
        ...(points.length > 0 && { points: points.map(([fraction, decoration]) => ({ value: within(axis.min, axis.max, fraction), ...decoration })) }),
        ...(title !== undefined && { title }),
        ...(lineLabel !== undefined && { lineLabel }),
        ...(leftArrow !== undefined && { leftArrow }),
        ...(rightArrow !== undefined && { rightArrow }),
      })),
  ),
);

/** A valid x,y graph description: two axes, up to 8 points and 4 segments within them, and optional grid and labels. */
export const xyGraphArb: fc.Arbitrary<Record<string, unknown>> = valid(
  fc.tuple(axisArb, axisArb).chain(([xAxis, yAxis]) => {
    const coordinates = fc.tuple(fractionArb, fractionArb).map(([fx, fy]) => ({ x: within(xAxis.min, xAxis.max, fx), y: within(yAxis.min, yAxis.max, fy) }));
    return fc
      .record({
        points: fc.array(fc.tuple(coordinates, decorationArb), { maxLength: 8 }),
        segments: fc.array(fc.tuple(coordinates, coordinates, decorationArb), { maxLength: 4 }),
        showGrid: fc.constantFrom(true, false, undefined),
        title: titleArb,
        xAxisLabel: titleArb,
        yAxisLabel: titleArb,
      })
      .map(({ points, segments, showGrid, title, xAxisLabel, yAxisLabel }) => ({
        type: "xy-graph",
        xAxis,
        yAxis,
        ...(points.length > 0 && { points: points.map(([at, decoration]) => ({ ...at, ...decoration })) }),
        ...(segments.length > 0 && { segments: segments.map(([from, to, decoration]) => ({ from, to, ...decoration })) }),
        ...(showGrid !== undefined && { showGrid }),
        ...(title !== undefined && { title }),
        ...(xAxisLabel !== undefined && { xAxisLabel }),
        ...(yAxisLabel !== undefined && { yAxisLabel }),
      }));
  }),
);

/** A valid x,y,z graph description: three axes, up to 8 points within them, and optional guide lines and labels. */
export const xyzGraphArb: fc.Arbitrary<Record<string, unknown>> = valid(
  fc.tuple(axisArb, axisArb, axisArb).chain(([xAxis, yAxis, zAxis]) => {
    const coordinates = fc
      .tuple(fractionArb, fractionArb, fractionArb)
      .map(([fx, fy, fz]) => ({ x: within(xAxis.min, xAxis.max, fx), y: within(yAxis.min, yAxis.max, fy), z: within(zAxis.min, zAxis.max, fz) }));
    return fc
      .record({
        points: fc.array(fc.tuple(coordinates, decorationArb), { maxLength: 8 }),
        guideLines: fc.constantFrom(true, false, undefined),
        title: titleArb,
        xAxisLabel: titleArb,
        yAxisLabel: titleArb,
        zAxisLabel: titleArb,
      })
      .map(({ points, guideLines, title, xAxisLabel, yAxisLabel, zAxisLabel }) => ({
        type: "xyz-graph",
        xAxis,
        yAxis,
        zAxis,
        ...(points.length > 0 && { points: points.map(([at, decoration]) => ({ ...at, ...decoration })) }),
        ...(guideLines !== undefined && { guideLines }),
        ...(title !== undefined && { title }),
        ...(xAxisLabel !== undefined && { xAxisLabel }),
        ...(yAxisLabel !== undefined && { yAxisLabel }),
        ...(zAxisLabel !== undefined && { zAxisLabel }),
      }));
  }),
);
