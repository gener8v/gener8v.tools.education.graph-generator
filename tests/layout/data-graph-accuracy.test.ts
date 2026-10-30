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
import { barGraphReference, horizontalBarsReferenced, lineGraphReference } from "../fixtures/data-graph-reference";
import { barGraphArb, lineGraphArb } from "../fixtures/data-graphs";
import { loadExample } from "../fixtures/examples";
import { attr, near as nearWithin, num } from "../fixtures/scene-readers";

// DGP-REQ-036, DGP-NFR-001: every bar length and every line-graph point is drawn within 0.5 px of its
// exact position, at the default size (one Scene unit is one pixel at the 400-unit drawing width),
// for the shipped examples and for generated descriptions. The exact positions come from
// `tests/fixtures/data-graph-reference.ts`, which works them out from the data and the layouts'
// documented constants and the value-scale rule and reads no drawn Scene, so an axis that is shifted
// or rescaled together with everything on it fails. Pictograph positions are not named by
// DGP-NFR-001; their widths are DGP-NFR-002 (tests/layout/pictograph.test.ts). Generated
// descriptions are filtered through `validate()`; a failing property prints fast-check's
// counterexample, and every assertion names the description. (graph-library DGP TICKET-006.)
const RUNS = 500;
const TOLERANCE = 0.5;

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

/** Fails when a bar is not as long as the reference says, naming the description. */
function checkBars(input: unknown, scene: Scene): void {
  const { description } = normalized<BarGraph>(input);
  const expected = barGraphReference(description);
  const where = JSON.stringify(input);
  const bars = scene.nodes.filter((node) => node.kind === "rect");
  // A bar that would round to no length is not drawn; the others come in category order.
  const drawnValues = description.values.filter((value) => Math.round(expected.lengthOf(value) * 100) > 0);
  expect(bars, `${where}: one bar for every value that has a length`).toHaveLength(drawnValues.length);
  drawnValues.forEach((value, i) => {
    const drawn = num(bars[i]!, expected.horizontal ? "width" : "height");
    nearWithin(drawn, expected.lengthOf(value), `${where}: bar for ${value} on ${expected.scale.minimum} to ${expected.scale.maximum}`, TOLERANCE);
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
      // hold, which no restatement gives (see `barGraphReference`): those two terms are left out of
      // the samples drawn across, so every sample is checked. Upright bars keep them.
      const across = Object.fromEntries(Object.entries(sample).filter(([term]) => term !== "categoryAxisLabel" && term !== "showValues"));
      const input = sample["orientation"] === "horizontal" ? across : sample;
      const { description, provenance } = normalized<BarGraph>(input);
      expect(horizontalBarsReferenced(description), JSON.stringify(input)).toBe(true);
      checkBars(input, barGraphLayout(description, provenance));
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
    expect(covered["a single category"]).toBeGreaterThan(0);
    expect(covered["ten or more categories"]).toBeGreaterThan(RUNS / 10);
  });
});
