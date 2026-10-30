import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { BarGraph } from "../../src/core/definitions/bar-graph";
import type { LineGraph } from "../../src/core/definitions/line-graph";
import { validate } from "../../src/core/index";
import { seriesStyles } from "../../src/core/style";
import { barGraphLayout } from "../../src/layout/bar-graph";
import { lineGraphLayout } from "../../src/layout/line-graph";
import { drawMarker } from "../../src/layout/kit/markers";
import type { Scene, SceneNode } from "../../src/layout/scene";
import { barGraphBounds, barGraphReference, horizontalBarsReferenced, lineGraphReference } from "../fixtures/data-graph-reference";
import { barGraphArb, lineGraphArb } from "../fixtures/data-graphs";
import { loadExample } from "../fixtures/examples";
import { attr, near as nearWithin, num } from "../fixtures/scene-readers";

// DGP-REQ-036, DGP-NFR-001: every bar length and every line-graph point is drawn within 0.5 px of its
// exact position, at the default size (one Scene unit is one pixel at the 400-unit drawing width),
// for the shipped examples and for generated descriptions. The exact positions come from
// `tests/fixtures/data-graph-reference.ts`, which works them out from the data and the layouts'
// documented constants and the value-scale rule and reads no drawn Scene, so an axis that is shifted
// or rescaled together with everything on it fails. Bars across with a category-axis label or written
// values are the one exception to exact lengths: those terms narrow the plot by amounts that depend
// on the drawn rows, so there the bars are checked for proportion and for an axis length between
// limits the reference gives (see `checkProportionalBars`). Pictograph positions are not named by
// DGP-NFR-001; their widths are DGP-NFR-002 (tests/layout/pictograph.test.ts). Generated
// descriptions are filtered through `validate()`; a failing property prints fast-check's
// counterexample, and every assertion names the description. (graph-library DGP TICKET-006.)
const RUNS = 500;
const TOLERANCE = 0.5;
/** Drawn numbers are rounded to 0.01 (AD-007); a few of them added may differ by twice that. */
const ROUNDING = 0.02;
/** A length under this rounds to nothing, and a bar is not drawn; it is also the most rounding moves a length. */
const HALF_HUNDREDTH = 0.005;

function normalized<T>(input: unknown): { description: T; provenance: Extract<ReturnType<typeof validate>, { valid: true }>["provenance"] } {
  const result = validate(input);
  if (!result.valid) throw new Error(`the description is not valid: ${JSON.stringify(result.issues)}`);
  return { description: result.description as T, provenance: result.provenance };
}

/** The numbers a drawn marker or polyline is placed by: a circle's center, or a polygon's or polyline's corners, in order. */
function coordinatesOf(node: SceneNode): number[] {
  if (node.kind === "circle") return [num(node, "cx"), num(node, "cy")];
  return String(attr(node, "points"))
    .split(/[ ,]/)
    .map(Number);
}

const MARKER_KINDS = new Set(["circle", "polygon"]);

/** Fails when a point is not where the reference puts it, naming the description. */
function checkLinePoints(input: unknown, scene: Scene): void {
  const { description } = normalized<LineGraph>(input);
  const expected = lineGraphReference(description);
  const where = JSON.stringify(input);
  const count = description.categories.length;
  const polylines = scene.nodes.filter((node) => node.kind === "polyline");
  // One polyline per series when there is a line to draw; every marker follows the lines, series by series.
  const markers = scene.nodes.filter((node) => MARKER_KINDS.has(node.kind));
  expect(markers.length, where).toBeGreaterThanOrEqual(description.series.length * count);
  description.series.forEach((series, s) => {
    const style = seriesStyles[s % seriesStyles.length]!;
    const points = series.values.map((value, i) => [expected.xOf(i), expected.yOf(value)] as const);
    if (count > 1) {
      const drawn = coordinatesOf(polylines[s]!);
      expect(drawn, `${where}: series ${s} polyline`).toHaveLength(points.length * 2);
      points.forEach(([x, y], i) => {
        nearWithin(drawn[2 * i]!, x, `${where}: series ${s} point ${i} x`, TOLERANCE);
        nearWithin(drawn[2 * i + 1]!, y, `${where}: series ${s} point ${i} y (value ${series.values[i]})`, TOLERANCE);
      });
    }
    // The marker of each point, in its series' shape, centered on the exact position.
    points.forEach(([x, y], i) => {
      const drawn = coordinatesOf(markers[s * count + i]!);
      const want = coordinatesOf(drawMarker(style.marker, x, y, "#000000"));
      expect(drawn, `${where}: series ${s} marker ${i}`).toHaveLength(want.length);
      want.forEach((coordinate, k) => nearWithin(drawn[k]!, coordinate, `${where}: series ${s} marker ${i} coordinate ${k}`, TOLERANCE));
    });
  });
}

/** The bars drawn, with where each starts along its length's axis and its position among the others. */
function barsOf(scene: Scene, horizontal: boolean) {
  return scene.nodes
    .filter((node) => node.kind === "rect")
    .map((bar) => ({
      length: num(bar, horizontal ? "width" : "height"),
      start: horizontal ? num(bar, "x") : num(bar, "y") + num(bar, "height"),
      along: num(bar, horizontal ? "y" : "x"),
    }));
}

/** Fails when the bars do not come in category order, down the rows or along the columns. */
function checkOrder(bars: ReturnType<typeof barsOf>, where: string): void {
  bars.forEach((bar, i) => {
    if (i > 0) expect(bar.along, `${where}: bar ${i} comes after bar ${i - 1}`).toBeGreaterThan(bars[i - 1]!.along);
  });
}

/** Fails when a bar is not as long as the reference says, or does not start at the zero line, naming the description. */
function checkBars(input: unknown, scene: Scene): void {
  const { description } = normalized<BarGraph>(input);
  const expected = barGraphReference(description);
  const where = JSON.stringify(input);
  const bars = barsOf(scene, expected.horizontal);
  // A bar that would round to no length is not drawn; the others come in category order.
  const drawnValues = description.values.filter((value) => Math.round(expected.lengthOf(value) * 100) > 0);
  expect(bars, `${where}: one bar for every value that has a length`).toHaveLength(drawnValues.length);
  checkOrder(bars, where);
  drawnValues.forEach((value, i) => {
    nearWithin(bars[i]!.length, expected.lengthOf(value), `${where}: bar for ${value} on ${expected.scale.minimum} to ${expected.scale.maximum}`, TOLERANCE);
    // Every bar grows from the zero line. With written values upright, room is added above the plot, which pushes it down.
    if (expected.start.exact) nearWithin(bars[i]!.start, expected.start.value, `${where}: bar for ${value} starts at the zero line`, TOLERANCE);
    else expect(bars[i]!.start, `${where}: bar for ${value} starts no higher than the zero line`).toBeGreaterThanOrEqual(expected.start.value - TOLERANCE);
    nearWithin(bars[i]!.start, bars[0]!.start, `${where}: bar for ${value} starts where the first bar does`, ROUNDING);
  });
}

/**
 * Fails when bars across, with a category-axis label or written values, are not in proportion to
 * their values, or lie on an axis outside the limits the reference gives, naming the description.
 * Without the plot's exact edges the scale is not known either, so: (a) each bar is as long as its
 * value times the longest bar's length per unit of value, within 0.5; (b) for some scale the layout
 * may have chosen, the axis length that implies (length per unit times the scale's range) lies
 * between `barGraphBounds`' least and most, widened by what rounding the longest bar to 0.01 can
 * move it; and the bars all start at one edge, no further left than the plot can start.
 */
function checkProportionalBars(input: unknown, scene: Scene): void {
  const { description } = normalized<BarGraph>(input);
  const { left, candidates } = barGraphBounds(description);
  const where = JSON.stringify(input);
  const bars = barsOf(scene, true);
  checkOrder(bars, where);
  const positive = description.values.filter((value) => value > 0);
  const highest = Math.max(0, ...positive);
  const longest = Math.max(0, ...bars.map((bar) => bar.length));
  if (longest === 0) {
    // No bar is long enough to draw: the most the axis allows must give every value under half a hundredth.
    expect(
      candidates.some((candidate) => highest * (candidate.most / candidate.range) < HALF_HUNDREDTH),
      `${where}: no bar is drawn`,
    ).toBe(true);
    return;
  }
  // The longest bar is the highest value's. The length per unit has the rounding of that bar (0.005), so a
  // value whose bar is about half a hundredth long may or may not have been drawn: it was when a bar is left
  // over after those that certainly were.
  const perUnit = longest / highest;
  const certain = positive.map((value) => ((longest - HALF_HUNDREDTH) * value) / highest >= HALF_HUNDREDTH);
  const never = positive.map((value) => ((longest + HALF_HUNDREDTH) * value) / highest < HALF_HUNDREDTH);
  let next = 0;
  positive.forEach((value, i) => {
    const laterCertain = certain.slice(i + 1).filter(Boolean).length;
    if (never[i]) return;
    if (!certain[i] && bars.length - next <= laterCertain) return;
    expect(bars[next], `${where}: a bar for ${value}`).toBeDefined();
    nearWithin(bars[next]!.length, value * perUnit, `${where}: bar for ${value} in proportion to the longest`, TOLERANCE);
    next++;
  });
  expect(next, `${where}: one bar for every value that has a length`).toBe(bars.length);
  const implied = candidates.map((candidate) => ({ ...candidate, length: perUnit * candidate.range, slack: (ROUNDING * candidate.range) / highest }));
  expect(
    implied.some(({ length, least, most, slack }) => least > 0 && length >= least - slack && length <= most + slack),
    `${where}: the axis is ${[...new Set(implied.map(({ length, least, most }) => `${length} (between ${least} and ${most})`))].join(" or ")} long`,
  ).toBe(true);
  bars.forEach((bar, i) => {
    nearWithin(bar.start, bars[0]!.start, `${where}: bar ${i} starts where the first bar does`, ROUNDING);
    expect(bar.start, `${where}: bar ${i} starts no further left than the plot can`).toBeGreaterThanOrEqual(left - TOLERANCE);
  });
}

/** What a run of generated samples covered, so a test can show each half of its property ran. */
interface Coverage {
  runs: number;
  [feature: string]: number;
}

function check<T>(arbitrary: fc.Arbitrary<T>, property: (sample: T, covered: Coverage) => void): Coverage {
  const covered: Coverage = { runs: 0 };
  fc.assert(
    fc.property(arbitrary, (sample) => {
      property(sample, covered);
      covered.runs++;
    }),
    { numRuns: RUNS },
  );
  return covered;
}

const tally = (covered: Coverage, feature: string, applies: boolean) => {
  covered[feature] = (covered[feature] ?? 0) + (applies ? 1 : 0);
};

const hasDecimals = (values: readonly number[]) => values.some((value) => !Number.isInteger(value));

describe("a line graph's points are drawn to scale with its values (DGP-REQ-036, DGP-NFR-001)", () => {
  it("puts every point of the example within 0.5 of the position computed from the data", () => {
    const input = loadExample("line-graph");
    const { description, provenance } = normalized<LineGraph>(input);
    checkLinePoints(input, lineGraphLayout(description, provenance));
  });

  it(`puts every point, line vertex and marker within ${TOLERANCE} of the position computed from the data, over ${RUNS} generated descriptions`, () => {
    const covered = check(lineGraphArb, (input, covered) => {
      const { description, provenance } = normalized<LineGraph>(input);
      checkLinePoints(input, lineGraphLayout(description, provenance));
      const values = description.series.flatMap((series) => [...series.values]);
      tally(covered, "several series", description.series.length >= 2);
      tally(covered, "negative values", values.some((value) => value < 0));
      tally(covered, "decimal values", hasDecimals(values));
      tally(covered, "a given scale", description.valueScale !== undefined);
      tally(covered, "a single category", description.categories.length === 1);
      tally(covered, "ten or more categories", description.categories.length >= 10);
      tally(covered, "a value-axis label", description.valueAxisLabel !== undefined);
      tally(covered, "a title", description.title !== undefined);
    });
    expect(covered.runs).toBe(RUNS);
    expect(covered["several series"]).toBeGreaterThan(RUNS / 4);
    expect(covered["negative values"]).toBeGreaterThan(RUNS / 4);
    expect(covered["decimal values"]).toBeGreaterThan(RUNS / 4);
    expect(covered["a given scale"]).toBeGreaterThan(RUNS / 10);
    expect(covered["a single category"]).toBeGreaterThan(0);
    expect(covered["ten or more categories"]).toBeGreaterThan(RUNS / 10);
    expect(covered["a value-axis label"]).toBeGreaterThan(RUNS / 4);
    expect(covered["a title"]).toBeGreaterThan(RUNS / 4);
  });
});

describe("a bar graph's bars are drawn to scale with its values (DGP-REQ-036, DGP-NFR-001)", () => {
  it("draws the example's bars within 0.5 of their length computed from the data", () => {
    const input = loadExample("bar-graph");
    const { description, provenance } = normalized<BarGraph>(input);
    checkBars(input, barGraphLayout(description, provenance));
  });

  it(`draws every bar within ${TOLERANCE} of its length computed from the data, over ${RUNS} generated descriptions`, () => {
    const covered = check(barGraphArb, (sample, covered) => {
      // Across, a category-axis label or written values move the plot's edges by what the drawn rows
      // hold, which no restatement gives (see `barGraphReference`): those samples are checked for
      // proportion and bounds instead of exact lengths.
      const { description, provenance } = normalized<BarGraph>(sample);
      const scene = barGraphLayout(description, provenance);
      if (horizontalBarsReferenced(description)) checkBars(sample, scene);
      else checkProportionalBars(sample, scene);
      tally(covered, "across with a category-axis label", description.orientation === "horizontal" && description.categoryAxisLabel !== undefined);
      tally(covered, "across with written values", description.orientation === "horizontal" && description.showValues === true);
      tally(covered, "across, checked exactly", description.orientation === "horizontal" && horizontalBarsReferenced(description));
      tally(covered, "upright", description.orientation !== "horizontal");
      tally(covered, "across", description.orientation === "horizontal");
      tally(covered, "decimal values", hasDecimals(description.values));
      tally(covered, "a given scale", description.valueScale !== undefined);
      tally(covered, "a zero bar", description.values.includes(0));
      tally(covered, "written values", description.showValues === true);
      tally(covered, "a category-axis label", description.categoryAxisLabel !== undefined);
      tally(covered, "a single category", description.categories.length === 1);
      tally(covered, "ten or more categories", description.categories.length >= 10);
    });
    expect(covered.runs).toBe(RUNS);
    expect(covered["upright"]).toBeGreaterThan(RUNS / 4);
    expect(covered["across"]).toBeGreaterThan(RUNS / 5);
    expect(covered["decimal values"]).toBeGreaterThan(RUNS / 4);
    expect(covered["a given scale"]).toBeGreaterThan(RUNS / 10);
    expect(covered["a zero bar"]).toBeGreaterThan(0);
    expect(covered["written values"]).toBeGreaterThan(RUNS / 10);
    expect(covered["a category-axis label"]).toBeGreaterThan(RUNS / 10);
    expect(covered["across with a category-axis label"]).toBeGreaterThan(RUNS / 20);
    expect(covered["across with written values"]).toBeGreaterThan(RUNS / 20);
    expect(covered["across, checked exactly"]).toBeGreaterThan(0);
    expect(covered["a single category"]).toBeGreaterThan(0);
    expect(covered["ten or more categories"]).toBeGreaterThan(RUNS / 10);
  });
});
