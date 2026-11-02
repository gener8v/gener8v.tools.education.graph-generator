import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { validate } from "../../src/core/index";
import type { NumberLine } from "../../src/core/definitions/number-line";
import type { XyGraph } from "../../src/core/definitions/xy-graph";
import type { XyzGraph } from "../../src/core/definitions/xyz-graph";
import { defaultStyle } from "../../src/core/style";
import { numberLineLayout } from "../../src/layout/number-line";
import type { Scene, SceneNode } from "../../src/layout/scene";
import { xyGraphLayout } from "../../src/layout/xy-graph";
import { xyzGraphLayout } from "../../src/layout/xyz-graph";
import { expectCovered } from "../helpers/sampling";
import { numberLineArb, xyGraphArb, xyzGeometryTopArb, xyzGraphArb } from "../fixtures/nlc-generators";
import { numberLineReference, xyReference, xyzReference } from "../fixtures/nlc-reference";
import { attr, circles, isTick, lengthOf, lines, near as nearWithin, num } from "../fixtures/scene-readers";

// NLC-NFR-001: every axis end, tick, point and segment endpoint of a number line, x,y graph or x,y,z
// graph is drawn within 0.5 px of the position computed from the description, at the default size
// (one Scene unit is one pixel at the 400-unit drawing width). The expected positions come from
// `tests/fixtures/nlc-reference.ts`, which restates the layouts' documented constants and rules and
// reads no drawn Scene, so an axis that is shifted or shortened together with everything on it
// fails. The one rule that no restatement can give is which x,y,z mark is topmost (it depends on
// label placement); `expectedMoveDown` below says how that is handled and the test counts how often
// the description alone fixed it. `isometric()` is the x,y,z
// projection, as the ticket names it. Generated descriptions are filtered through `validate()`.
//
// This overlaps the per-type tests, which pin fixed examples and may be dropped in favor of this one
// later: tests/layout/number-line.test.ts (ticks and points on the linear scale), tests/layout/
// xy-graph.test.ts (every marker and segment end within half a unit, a 200-run marker variant) and
// tests/layout/xyz-graph.test.ts (ticks, points and axis ends against `isometric()`).
// (graph-library NLC TICKET-005; code review CR-001, quality review QR-001, QR-003.)
const RUNS = 200;
/**
 * The seed of a sample of the x,y,z generator that shows it gives guide lines often enough: 64 of
 * 200 from this seed. Counted in the unseeded property instead, at the generator's rate of 0.34
 * (measured over 20,000 samples, 2026-10-31), five standard deviations below the expected 67 would
 * leave 34, short of the threshold of 50, and 49 had been seen against it (CPSE TICKET-010). The
 * property itself runs unseeded, so it meets new descriptions on every run (CPSE TICKET-010 code
 * review CR-003). Every count in a property here is unseeded, its threshold at least five standard
 * deviations below its measured rate (each stated beside it, and checked by `expectCovered`; see
 * tests/helpers/sampling.ts). To re-pick the seed if the arbitrary changes, try seeds until
 * `fc.sample(xyzGraphArb, { seed, numRuns: RUNS })` gives at least 65 with guide lines (a count
 * above RUNS / 4 is what the test below needs; 64 is today's).
 */
const XYZ_SEED = 20_261_031;
const TOLERANCE = 0.5;
const near = (got: number, want: number, what: string) => nearWithin(got, want, what, TOLERANCE);

/** A text line's box starts 0.9 of the font size above its baseline: the baseline sits 0.8 below the glyphs' top, which are centered in a line 1.2 tall. */
const BASELINE_BELOW_TOP = 0.9;

type Normalized<T> = { description: T; provenance: Extract<ReturnType<typeof validate>, { valid: true }>["provenance"] };

function normalized<T>(description: unknown): Normalized<T> {
  const result = validate(description);
  if (!result.valid) throw new Error(`the generator gave an invalid description: ${JSON.stringify(result.issues)}`);
  return { description: result.description as T, provenance: result.provenance };
}

/** What a run of generated samples covered, so a test can show each half of its property ran. */
interface Coverage {
  runs: number;
  withPoints: number;
  withSegments: number;
  /** x,y,z samples whose move down the description alone fixed (a mark of geometry was topmost). */
  moveDownFromRules: number;
}

/** Runs a property over `RUNS` valid samples and returns what they covered. */
function check<T>(arbitrary: fc.Arbitrary<T>, property: (sample: T, covered: Coverage) => void): Coverage {
  const covered: Coverage = { runs: 0, withPoints: 0, withSegments: 0, moveDownFromRules: 0 };
  fc.assert(
    fc.property(arbitrary, (sample) => {
      property(sample, covered);
      covered.runs++;
    }),
    { numRuns: RUNS },
  );
  return covered;
}

/** A line with the axis style: an axis or a tick, not a grid line, a dashed guide or a figure's segment. */
const hasAxisStyle = (node: SceneNode) => attr(node, "stroke-dasharray") === undefined && num(node, "stroke-width") === defaultStyle.lineWidths.axis;

describe("a number line is drawn to scale with its values (NLC-NFR-001)", () => {
  it(`puts the line's ends, every tick and every point within ${TOLERANCE} of the position computed from the description, over ${RUNS} generated descriptions`, () => {
    const covered = check(numberLineArb, (input, covered) => {
      const { description, provenance } = normalized<NumberLine>(input);
      const scene = numberLineLayout(description, provenance);
      const expected = numberLineReference(description);
      const axisLines = lines(scene).filter(hasAxisStyle);
      const marks = axisLines.filter(isTick);
      const [axis] = axisLines.filter((node) => !isTick(node) && num(node, "y1") === num(node, "y2") && lengthOf(node) > 100);
      expect(axis, JSON.stringify(input)).toBeDefined();
      near(num(axis!, "x1"), expected.left, "line left end");
      near(num(axis!, "x2"), expected.right, "line right end");
      expect(marks, JSON.stringify(input)).toHaveLength(expected.ticks.length);
      marks.forEach((mark, i) => {
        near(num(mark, "x1"), expected.xOf(expected.ticks[i]!), `tick ${expected.ticks[i]}`);
        near((num(mark, "y1") + num(mark, "y2")) / 2, num(axis!, "y1"), `tick ${expected.ticks[i]} on the line`);
      });
      const points = description.points ?? [];
      const drawn = circles(scene);
      expect(drawn, JSON.stringify(input)).toHaveLength(points.length);
      drawn.forEach((marker, i) => {
        near(num(marker, "cx"), expected.xOf(points[i]!.value), `point ${points[i]!.value}`);
        near(num(marker, "cy"), num(axis!, "y1"), `point ${points[i]!.value} on the line`);
      });
      if (points.length > 0) covered.withPoints++;
    });
    expect(covered.runs).toBe(RUNS);
    // Measured rate 0.81 (2026-10-31): 162 expected, 134 five standard deviations below.
    expectCovered(covered.withPoints, RUNS / 2, RUNS, 0.80);
  });
});

describe("an x,y graph is drawn to scale with its values (NLC-NFR-001)", () => {
  it(`puts the axes' ends, every tick, point and segment endpoint within ${TOLERANCE} of the position computed from the description, over ${RUNS} generated descriptions`, () => {
    const covered = check(xyGraphArb, (input, covered) => {
      const { description, provenance } = normalized<XyGraph>(input);
      const scene = xyGraphLayout(description, provenance);
      const expected = xyReference(description);
      // The x-axis is drawn first, level; the y-axis second, upright, from its min (bottom) to its max (top).
      const axisLines = lines(scene).filter(hasAxisStyle);
      const [xLine, yLine] = axisLines.filter((node) => !isTick(node));
      expect(xLine, JSON.stringify(input)).toBeDefined();
      expect(yLine, JSON.stringify(input)).toBeDefined();
      for (const [line, ends, name] of [[xLine!, expected.xAxisEnds, "x-axis"], [yLine!, expected.yAxisEnds, "y-axis"]] as const) {
        near(num(line, "x1"), ends[0][0], `${name} min end x`);
        near(num(line, "y1"), ends[0][1], `${name} min end y`);
        near(num(line, "x2"), ends[1][0], `${name} max end x`);
        near(num(line, "y2"), ends[1][1], `${name} max end y`);
      }
      const marks = axisLines.filter(isTick);
      const upright = marks.filter((mark) => num(mark, "x1") === num(mark, "x2"));
      const across = marks.filter((mark) => num(mark, "y1") === num(mark, "y2"));
      expect(upright, JSON.stringify(input)).toHaveLength(expected.xTicks.length);
      expect(across, JSON.stringify(input)).toHaveLength(expected.yTicks.length);
      upright.forEach((mark, i) => {
        near(num(mark, "x1"), expected.xOf(expected.xTicks[i]!), `x tick ${expected.xTicks[i]}`);
        near((num(mark, "y1") + num(mark, "y2")) / 2, expected.xAxisEnds[0][1], `x tick ${expected.xTicks[i]} on the x-axis`);
      });
      across.forEach((mark, i) => {
        near(num(mark, "y1"), expected.yOf(expected.yTicks[i]!), `y tick ${expected.yTicks[i]}`);
        near((num(mark, "x1") + num(mark, "x2")) / 2, expected.yAxisEnds[0][0], `y tick ${expected.yTicks[i]} on the y-axis`);
      });
      const points = description.points ?? [];
      const drawn = circles(scene);
      expect(drawn, JSON.stringify(input)).toHaveLength(points.length);
      drawn.forEach((marker, i) => {
        near(num(marker, "cx"), expected.xOf(points[i]!.x), `point ${i} x`);
        near(num(marker, "cy"), expected.yOf(points[i]!.y), `point ${i} y`);
      });
      const segments = description.segments ?? [];
      const drawnSegments = lines(scene).filter((node) => num(node, "stroke-width") === defaultStyle.lineWidths.figure);
      expect(drawnSegments, JSON.stringify(input)).toHaveLength(segments.length);
      drawnSegments.forEach((node, i) => {
        const { from, to } = segments[i]!;
        near(num(node, "x1"), expected.xOf(from.x), `segment ${i} from x`);
        near(num(node, "y1"), expected.yOf(from.y), `segment ${i} from y`);
        near(num(node, "x2"), expected.xOf(to.x), `segment ${i} to x`);
        near(num(node, "y2"), expected.yOf(to.y), `segment ${i} to y`);
      });
      if (points.length > 0) covered.withPoints++;
      if (segments.length > 0) covered.withSegments++;
    });
    expect(covered.runs).toBe(RUNS);
    // Measured rates 0.80 and 0.80 (2026-10-31): 160 expected, 132 five standard deviations below.
    expectCovered(covered.withPoints, RUNS / 2, RUNS, 0.80);
    expectCovered(covered.withSegments, RUNS / 2, RUNS, 0.80);
  });
});

/** The top of everything drawn but the title: line ends, a marker's reach and a text line's box. */
function drawnTops(scene: Scene): { geometry: number; all: number } {
  const reach = (defaultStyle.markerSize / 2) * 1.5;
  let [geometry, all] = [Infinity, Infinity];
  for (const node of scene.nodes) {
    const top =
      node.kind === "line"
        ? Math.min(num(node, "y1"), num(node, "y2"))
        : node.kind === "circle"
          ? num(node, "cy") - reach
          : textTop(node) ?? Infinity;
    if (node.kind !== "text") geometry = Math.min(geometry, top);
    all = Math.min(all, top);
  }
  return { geometry, all };
}

/** The top of a text line's box, or nothing for a title line or a node that is not text. */
const textTop = (node: SceneNode): number | undefined =>
  node.kind === "text" && num(node, "font-size") !== defaultStyle.fontSizes.title ? num(node, "y") - BASELINE_BELOW_TOP * num(node, "font-size") : undefined;

/**
 * How far the x,y,z figure was moved down, as the layout's rule gives it: the figure's topmost mark
 * sits one margin below the title. The topmost of all marks, labels included, must sit there. The
 * move itself is then:
 * - fixed by the description alone (`fromRules`) when the topmost mark is geometry (an axis end, a
 *   tick, a marker or a guide line): `titleBottom - geometryTop`;
 * - otherwise a label was placed above the geometry, in a place the description does not fix (the
 *   z-axis's name above its top end, say, moved aside to clear the axes), so the move is read from
 *   the drawn geometry's topmost mark (one mark, not the x-axis), and there only the horizontal
 *   position, the scale and every mark's place relative to the others hold the line.
 */
function expectedMoveDown(scene: Scene, reference: ReturnType<typeof xyzReference>, what: string): { down: number; fromRules: boolean } {
  const tops = drawnTops(scene);
  near(tops.all, reference.titleBottom, `${what}: the topmost mark below the title`);
  if (Math.abs(tops.geometry - reference.titleBottom) <= TOLERANCE) return { down: reference.titleBottom - reference.geometryTop, fromRules: true };
  return { down: tops.geometry - reference.geometryTop, fromRules: false };
}

/** Checks one x,y,z description: its drawn axis ends, ticks and points against `isometric()` of the values scaled from where the axes meet. */
function expectXyzDrawnToScale(input: unknown, covered: Coverage): void {
  const { description, provenance } = normalized<XyzGraph>(input);
  const scene = xyzGraphLayout(description, provenance);
  const reference = xyzReference(description);
  const { down, fromRules } = expectedMoveDown(scene, reference, JSON.stringify(input));
  const page = (at: readonly [number, number]) => [at[0], at[1] + down] as const;
  // Each axis is drawn as its line, then its ticks: the three lines split the axis lines into runs.
  const drawn = lines(scene).filter(hasAxisStyle);
  const starts = drawn.flatMap((node, i) => (isTick(node) ? [] : [i]));
  expect(starts, JSON.stringify(input)).toHaveLength(3);
  (["x", "y", "z"] as const).forEach((name, k) => {
    const axis = description[`${name}Axis`];
    const line = drawn[starts[k]!]!;
    const [from, to] = [page(reference.onAxis(name, axis.min)), page(reference.onAxis(name, axis.max))];
    near(num(line, "x1"), from[0], `${name} min end x`);
    near(num(line, "y1"), from[1], `${name} min end y`);
    near(num(line, "x2"), to[0], `${name} max end x`);
    near(num(line, "y2"), to[1], `${name} max end y`);
    const marks = drawn.slice(starts[k]! + 1, starts[k + 1] ?? drawn.length);
    expect(marks, `${name} ticks of ${JSON.stringify(input)}`).toHaveLength(reference.ticks[name].length);
    marks.forEach((mark, i) => {
      const [wantX, wantY] = page(reference.onAxis(name, reference.ticks[name][i]!));
      near((num(mark, "x1") + num(mark, "x2")) / 2, wantX, `${name} tick ${reference.ticks[name][i]} x`);
      near((num(mark, "y1") + num(mark, "y2")) / 2, wantY, `${name} tick ${reference.ticks[name][i]} y`);
    });
  });
  const points = description.points ?? [];
  const markers = circles(scene);
  expect(markers, JSON.stringify(input)).toHaveLength(points.length);
  markers.forEach((marker, i) => {
    const [wantX, wantY] = page(reference.at(points[i]!.x, points[i]!.y, points[i]!.z));
    near(num(marker, "cx"), wantX, `point ${i} x`);
    near(num(marker, "cy"), wantY, `point ${i} y`);
  });
  if (points.length > 0) covered.withPoints++;
  if (fromRules) covered.moveDownFromRules++;
}

describe("an x,y,z graph is drawn to scale with its values (NLC-NFR-001)", () => {
  it(`puts every axis end, tick and point within ${TOLERANCE} of isometric() of its value scaled from where the axes meet, over ${RUNS} generated descriptions`, () => {
    const covered = check(xyzGraphArb, expectXyzDrawnToScale);
    expect(covered.runs).toBe(RUNS);
    // Measured rate 0.80 (20,000 samples, 2026-10-31): 160 expected, 131 five standard deviations below.
    expectCovered(covered.withPoints, RUNS / 2, RUNS, 0.80);
  });

  it(`gives that property guide lines in about a third of its descriptions (a sample of ${RUNS} from a fixed seed)`, () => {
    // From `XYZ_SEED`, so a fixed count (64): see there. Apart from the property, so the property keeps
    // its run-to-run variety (code review CR-003).
    const withGuides = fc.sample(xyzGraphArb, { seed: XYZ_SEED, numRuns: RUNS }).filter((input) => normalized<XyzGraph>(input).description.guideLines === true);
    expect(withGuides.length, "guide lines in the sample from XYZ_SEED; re-pick the seed, see there").toBeGreaterThan(RUNS / 4);
  });

  it(`fixes the whole figure's place, down to its height, by the description alone where geometry is topmost, over ${RUNS} generated descriptions`, () => {
    const covered = check(xyzGeometryTopArb, expectXyzDrawnToScale);
    expect(covered.runs).toBe(RUNS);
    // Every sample was checked against absolute positions, none against a mark read from the Scene.
    expect(covered.moveDownFromRules).toBe(RUNS);
    // Measured rate 0.80 (2026-10-31): 159 expected, 130 five standard deviations below.
    expectCovered(covered.withPoints, RUNS / 2, RUNS, 0.80);
  });
});
