import { readFileSync } from "node:fs";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { validate } from "../../src/core/index";
import { CALLER_TEXT_LIMIT } from "../../src/core/definitions/shared";
import { PLANE_MIN_RATIO, type XyGraph, xyGraph as xyGraphDefinition } from "../../src/core/definitions/xy-graph";
import { defaultStyle, namedColors } from "../../src/core/style";
import { niceTicks } from "../../src/core/value-scale";
import { checkScene } from "../../src/layout/kit/check";
import { linearScale } from "../../src/layout/kit/scale";
import { titleBlock } from "../../src/layout/kit/title";
import { SCENE_WIDTH, type Scene, type SceneNode } from "../../src/layout/scene";
import { LABEL_MAX_LINES, MAX_PLOT_HEIGHT, MIN_PLOT_WIDTH, planeAxes, xyGraphLayout } from "../../src/layout/xy-graph";
import { oneClusterTexts, wordsOf } from "../fixtures/plain-text";
import { attr, boundsOf, nameOf, overlap } from "../fixtures/scene-geometry";

type Text = Extract<SceneNode, { kind: "text" }>;

/** The Scene for a valid description, which must pass checkScene (AD-007, AD-008). */
function sceneOf(description: unknown): Scene {
  const result = validate(description);
  if (!result.valid) throw new Error(`expected a valid x,y graph, got ${JSON.stringify(result.issues)}`);
  const scene = xyGraphLayout(result.description as XyGraph, result.provenance);
  expect(checkScene(scene)).toEqual([]);
  return scene;
}

const num = (node: SceneNode, name: string) => Number(attr(node, name));
const graph = (x: [number, number], y: [number, number], extra: object = {}) => ({
  type: "xy-graph",
  xAxis: { min: x[0], max: x[1] },
  yAxis: { min: y[0], max: y[1] },
  ...extra,
});
const lines = (scene: Scene) => scene.nodes.filter((node) => node.kind === "line");
const length = (node: SceneNode) => Math.hypot(num(node, "x2") - num(node, "x1"), num(node, "y2") - num(node, "y1"));
/** The two axis lines, in the line color and longer than a tick: the x-axis first, as drawn. */
const axisLines = (scene: Scene) => lines(scene).filter((node) => attr(node, "stroke") === defaultStyle.colors.line && length(node) > 10);
const gridLines = (scene: Scene) => lines(scene).filter((node) => attr(node, "stroke") === defaultStyle.colors.grid);
const segmentLines = (scene: Scene) => lines(scene).filter((node) => num(node, "stroke-width") === defaultStyle.lineWidths.figure);
const markers = (scene: Scene) => scene.nodes.filter((node) => node.kind === "circle");
const texts = (scene: Scene) => scene.nodes.filter((node): node is Text => node.kind === "text");
/** The tick labels drawn, leaving out the blank one an axis writes at its 0 when the origin is labeled by the other. */
const tickTexts = (scene: Scene) => texts(scene).filter((node) => num(node, "font-size") === defaultStyle.fontSizes.tickLabel && node.text !== "");
const labelTexts = (scene: Scene) => texts(scene).filter((node) => num(node, "font-size") === defaultStyle.fontSizes.label && attr(node, "transform") === undefined);

/** The plot read off the drawing: the x-axis spans its width and the y-axis its height, ends included. */
function plotOf(scene: Scene, x: [number, number], y: [number, number]) {
  const [xAxis, yAxis] = axisLines(scene);
  const [left, right] = [num(xAxis!, "x1"), num(xAxis!, "x2")];
  const [bottom, top] = [num(yAxis!, "y1"), num(yAxis!, "y2")];
  return {
    left,
    right,
    top,
    bottom,
    width: right - left,
    height: bottom - top,
    /** The page y of the x-axis and the page x of the y-axis. */
    xAxisY: num(xAxis!, "y1"),
    yAxisX: num(yAxis!, "x1"),
    xOf: linearScale(x, [left, right]),
    yOf: linearScale(y, [bottom, top]),
  };
}

describe("quadrants and where the axes go (NLC-REQ-023, NLC-REQ-024, NLC-REQ-025)", () => {
  it.each([
    [[0, 10], [0, 10], 1],
    [[-10, 10], [0, 10], 2],
    [[0, 10], [-10, 10], 2],
    [[-10, 10], [-10, 10], 4],
  ] as const)("x %j, y %j: %i quadrant(s), each axis through the origin", (x, y, count) => {
    expect(planeAxes(x, y).quadrants).toBe(count);
    const plot = plotOf(sceneOf(graph([...x], [...y])), [...x], [...y]);
    expect(Math.abs(plot.xAxisY - plot.yOf(0))).toBeLessThanOrEqual(0.5);
    expect(Math.abs(plot.yAxisX - plot.xOf(0))).toBeLessThanOrEqual(0.5);
  });

  it("draws an axis along the nearest edge when the other range excludes zero: bottom and left for positive-only, top and right for negative-only", () => {
    const positive = plotOf(sceneOf(graph([2, 10], [3, 9])), [2, 10], [3, 9]);
    expect([positive.xAxisY, positive.yAxisX]).toEqual([positive.bottom, positive.left]);
    const negative = plotOf(sceneOf(graph([-10, -2], [-9, -3])), [-10, -2], [-9, -3]);
    expect([negative.xAxisY, negative.yAxisX]).toEqual([negative.top, negative.right]);
    // One range spanning zero, the other not: one axis through the origin, the other on an edge.
    const mixed = plotOf(sceneOf(graph([-10, 10], [4, 8])), [-10, 10], [4, 8]);
    expect(mixed.xAxisY).toBe(mixed.bottom);
    expect(Math.abs(mixed.yAxisX - mixed.xOf(0))).toBeLessThanOrEqual(0.5);
    expect(planeAxes([-10, -2], [3, 9])).toMatchObject({ xAxisAt: 3, yAxisAt: -2, xLabelSide: "below", yLabelSide: "right" });
    expect(planeAxes([2, 10], [-9, -3])).toMatchObject({ xAxisAt: -3, yAxisAt: 2, xLabelSide: "above", yLabelSide: "left" });
  });

  it("labels an edge axis's ticks with their true values, and draws no 0 at the corner", () => {
    const scene = sceneOf(graph([2, 10], [3, 9], { xAxis: { min: 2, max: 10, tickSpacing: 1 }, yAxis: { min: 3, max: 9, tickSpacing: 1 } }));
    const shown = tickTexts(scene).map((node) => node.text);
    expect(shown).toEqual(["2", "3", "4", "5", "6", "7", "8", "9", "10", "3", "4", "5", "6", "7", "8", "9"]);
    const negative = tickTexts(sceneOf(graph([-10, -2], [-9, -3], { xAxis: { min: -10, max: -2, tickSpacing: 2 } }))).map((node) => node.text);
    expect(negative).not.toContain("0");
    expect(negative).toContain("-2");
    expect(negative).toContain("-3");
  });

  it("labels a 0 on an edge axis as the true value it is, where the other axis crosses away from the origin (code review CR-001)", () => {
    // The y-axis on the left edge at x = 5: y = 0 is a tick on it, not the origin.
    const edgeY = tickTexts(sceneOf(graph([5, 10], [-5, 5], { xAxis: { min: 5, max: 10, tickSpacing: 1 }, yAxis: { min: -5, max: 5, tickSpacing: 1 } }))).map((node) => node.text);
    expect(edgeY).toEqual(["5", "6", "7", "8", "9", "10", "-5", "-4", "-3", "-2", "-1", "0", "1", "2", "3", "4", "5"]);
    // The x-axis on the top edge at y = -2: x = 0 is a tick on it, not the origin.
    const edgeX = tickTexts(sceneOf(graph([-5, 5], [-10, -2], { xAxis: { min: -5, max: 5, tickSpacing: 1 }, yAxis: { min: -10, max: -2, tickSpacing: 2 } }))).map((node) => node.text);
    expect(edgeX.filter((text) => text === "0")).toHaveLength(1);
  });

  it("labels the origin once when only the y-axis shows its tick labels (code review CR-001)", () => {
    for (const [x, y] of [[[0, 10], [0, 10]], [[-10, 10], [0, 10]], [[0, 10], [-10, 10]], [[-10, 10], [-10, 10]]] as const) {
      const zeros = tickTexts(sceneOf(graph([...x], [...y], { xAxis: { min: x[0], max: x[1], showTickLabels: false } }))).filter((node) => node.text === "0");
      expect(zeros, `${x} ${y}`).toHaveLength(1);
    }
    const hidden = { xAxis: { min: -10, max: 10, showTickLabels: false }, yAxis: { min: -10, max: 10, showTickLabels: false } };
    expect(tickTexts(sceneOf(graph([-10, 10], [-10, 10], hidden)))).toHaveLength(0);
  });

  it("labels the origin once: below it, or below-left where the y-axis runs down through it", () => {
    for (const [x, y] of [[[0, 10], [0, 10]], [[-10, 10], [0, 10]], [[0, 10], [-10, 10]], [[-10, 10], [-10, 10]]] as const) {
      const zeros = tickTexts(sceneOf(graph([...x], [...y]))).filter((node) => node.text === "0");
      expect(zeros, `${x} ${y}`).toHaveLength(1);
    }
    const scene = sceneOf(graph([-10, 10], [-10, 10]));
    const plot = plotOf(scene, [-10, 10], [-10, 10]);
    const zero = boundsOf(tickTexts(scene).find((node) => node.text === "0")!);
    expect(zero.x1).toBeLessThan(plot.yAxisX);
    expect(zero.y0).toBeGreaterThan(plot.xAxisY);
    for (const other of tickTexts(scene).filter((node) => node.text !== "0").map(boundsOf)) expect(overlap(zero, other), nameOf(other)).toBe(false);
  });

  it("leaves the origin unlabeled rather than crowd its neighbours on densely ticked axes", () => {
    const scene = sceneOf(graph([-2, 2], [-5, 5]));
    const boxes = tickTexts(scene).map(boundsOf);
    const zero = boxes.filter((box) => (box.node as Text).text === "0");
    for (const box of zero) for (const other of boxes) if (other !== box) expect(overlap(box, other), nameOf(other)).toBe(false);
  });
});

describe("tick spacing per axis (NLC-REQ-027, NLC-REQ-004, NLC-REQ-005)", () => {
  it("ticks each axis at its own spacing, or its default, at positions proportional to value", () => {
    const cases: Array<[{ min: number; max: number; tickSpacing?: number }, { min: number; max: number; tickSpacing?: number }]> = [
      [{ min: -10, max: 10, tickSpacing: 5 }, { min: -10, max: 10, tickSpacing: 1 }],
      [{ min: 0, max: 100 }, { min: -3, max: 3 }],
    ];
    for (const [x, y] of cases) {
      const scene = sceneOf({ type: "xy-graph", xAxis: x, yAxis: y, showGrid: true });
      const plot = plotOf(scene, [x.min, x.max], [y.min, y.max]);
      const vertical = gridLines(scene).filter((node) => num(node, "x1") === num(node, "x2"));
      const horizontal = gridLines(scene).filter((node) => num(node, "y1") === num(node, "y2"));
      const xTicks = niceTicks(x.min, x.max, x.tickSpacing).ticks;
      const yTicks = niceTicks(y.min, y.max, y.tickSpacing).ticks;
      expect(vertical).toHaveLength(xTicks.length);
      expect(horizontal).toHaveLength(yTicks.length);
      vertical.forEach((node, i) => expect(Math.abs(num(node, "x1") - plot.xOf(xTicks[i]!))).toBeLessThanOrEqual(0.5));
      horizontal.forEach((node, i) => expect(Math.abs(num(node, "y1") - plot.yOf(yTicks[i]!))).toBeLessThanOrEqual(0.5));
    }
  });

  it("labels a spacing worked out in floating point with the value meant, on both axes (defect sweep DS-001)", () => {
    const description = { type: "xy-graph", xAxis: { min: 0, max: 1.2, tickSpacing: 0.1 * 3 }, yAxis: { min: 0, max: 1.2, tickSpacing: 0.1 * 3 } };
    const shown = tickTexts(sceneOf(description)).map((node) => node.text);
    // The x-axis labels the origin; the y-axis leaves its 0 to it.
    expect(shown).toEqual(["0", "0.3", "0.6", "0.9", "1.2", "0.3", "0.6", "0.9", "1.2"]);
  });

  it("hides an axis's tick labels when its showTickLabels is false, keeping its ticks", () => {
    const scene = sceneOf(graph([0, 10], [0, 10], { xAxis: { min: 0, max: 10, showTickLabels: false } }));
    // The y-axis labels the origin, since the x-axis does not (code review CR-001).
    expect(tickTexts(scene).map((node) => node.text)).toEqual(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
  });
});

describe("the grid (NLC-REQ-026)", () => {
  it("draws a grid line across the plot at every tick of both axes, and nowhere else, under everything", () => {
    const scene = sceneOf(graph([-5, 5], [-3, 3], { showGrid: true, xAxis: { min: -5, max: 5, tickSpacing: 1 }, yAxis: { min: -3, max: 3, tickSpacing: 1 } }));
    const plot = plotOf(scene, [-5, 5], [-3, 3]);
    const grid = gridLines(scene);
    expect(grid).toHaveLength(11 + 7);
    for (const node of grid) {
      const vertical = num(node, "x1") === num(node, "x2");
      if (vertical) expect([num(node, "y1"), num(node, "y2")]).toEqual([plot.top, plot.bottom]);
      else expect([num(node, "x1"), num(node, "x2")]).toEqual([plot.left, plot.right]);
      expect(num(node, "stroke-width")).toBe(defaultStyle.lineWidths.grid);
    }
    const xs = grid.filter((node) => num(node, "x1") === num(node, "x2")).map((node) => num(node, "x1"));
    expect(xs).toEqual([-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].map((v) => Math.round(plot.xOf(v) * 100) / 100));
    const firstOther = scene.nodes.findIndex((node) => node.kind === "line" && attr(node, "stroke") !== defaultStyle.colors.grid);
    expect(Math.max(...grid.map((node) => scene.nodes.indexOf(node)))).toBeLessThan(firstOther);
  });

  it("draws no grid by default or when showGrid is false", () => {
    expect(gridLines(sceneOf(graph([-5, 5], [-5, 5])))).toEqual([]);
    expect(gridLines(sceneOf(graph([-5, 5], [-5, 5], { showGrid: false })))).toEqual([]);
  });
});

describe("points and segments (NLC-REQ-028, NLC-REQ-029, NLC-REQ-030, NLC-REQ-011, NLC-NFR-001)", () => {
  const x: [number, number] = [-8, 6];
  const y: [number, number] = [-3, 9];

  it("plots each point at (xScale(x), yScale(y)) and joins each segment's ends, within half a unit", () => {
    const points = [{ x: -8, y: 9 }, { x: 0, y: 0 }, { x: 2.5, y: -1.25 }, { x: 6, y: -3 }];
    const segments = [{ from: { x: -8, y: -3 }, to: { x: 6, y: 9 } }, { from: { x: 1, y: 2 }, to: { x: 1, y: 7 } }];
    const scene = sceneOf(graph(x, y, { points, segments }));
    const plot = plotOf(scene, x, y);
    expect(markers(scene)).toHaveLength(points.length);
    markers(scene).forEach((marker, i) => {
      expect(Math.abs(num(marker, "cx") - plot.xOf(points[i]!.x))).toBeLessThanOrEqual(0.5);
      expect(Math.abs(num(marker, "cy") - plot.yOf(points[i]!.y))).toBeLessThanOrEqual(0.5);
    });
    expect(segmentLines(scene)).toHaveLength(segments.length);
    segmentLines(scene).forEach((node, i) => {
      const { from, to } = segments[i]!;
      for (const [got, want] of [
        [num(node, "x1"), plot.xOf(from.x)],
        [num(node, "y1"), plot.yOf(from.y)],
        [num(node, "x2"), plot.xOf(to.x)],
        [num(node, "y2"), plot.yOf(to.y)],
      ]) {
        expect(Math.abs(got! - want!)).toBeLessThanOrEqual(0.5);
      }
    });
  });

  it("applies a point's or a segment's color to that element only, and the accent when none is given; labels stay the text color", () => {
    const scene = sceneOf(
      graph(x, y, {
        points: [{ x: 1, y: 1, label: "red one", color: "red" }, { x: 3, y: 3, label: "plain" }],
        segments: [{ from: { x: 0, y: 0 }, to: { x: 2, y: 5 }, label: "green one", color: "green" }, { from: { x: -5, y: 0 }, to: { x: -2, y: 5 } }],
      }),
    );
    expect(markers(scene).map((node) => attr(node, "fill"))).toEqual([namedColors.red, defaultStyle.colors.accent]);
    expect(segmentLines(scene).map((node) => attr(node, "stroke"))).toEqual([namedColors.green, defaultStyle.colors.accent]);
    expect(scene.nodes.filter((node) => node.attrs.some(([, value]) => value === namedColors.red))).toHaveLength(1);
    expect(scene.nodes.filter((node) => node.attrs.some(([, value]) => value === namedColors.green))).toHaveLength(1);
    expect(labelTexts(scene).every((node) => attr(node, "fill") === defaultStyle.colors.text)).toBe(true);
  });

  it("labels a segment near its middle, and places labels clear of one another, the markers, the segments and the axes", () => {
    const scene = sceneOf(
      graph([-10, 10], [-10, 10], {
        points: [{ x: 2, y: 3, label: "A" }, { x: 2, y: 3, label: "B" }, { x: 2.5, y: 3, label: "C" }, { x: -4, y: -4, label: "D" }],
        segments: [{ from: { x: -8, y: 2 }, to: { x: 8, y: 2 }, label: "the long road" }],
      }),
    );
    const plot = plotOf(scene, [-10, 10], [-10, 10]);
    const labels = labelTexts(scene).map(boundsOf);
    expect(labels.map((b) => (b.node as Text).text)).toEqual(["the long road", "A", "B", "C", "D"]);
    // Beside the segment's middle: the glyphs come within a gap of it, diagonally, plus the line's half leading.
    const road = labels[0]!;
    const [mx, my] = [plot.xOf(0), plot.yOf(2)];
    expect(Math.hypot(Math.max(road.x0 - mx, 0, mx - road.x1), Math.max(road.y0 - my, 0, my - road.y1))).toBeLessThanOrEqual(8);
    const others = [...markers(scene), ...axisLines(scene), ...segmentLines(scene)].map(boundsOf);
    labels.forEach((label, i) => {
      for (const other of [...labels.slice(i + 1), ...others]) expect(overlap(label, other), `${nameOf(label)} / ${nameOf(other)}`).toBe(false);
    });
  });

  it("wraps a long label and cuts it to its line limit", () => {
    const scene = sceneOf(graph([-10, 10], [-10, 10], { points: [{ x: 0, y: 5, label: wordsOf(CALLER_TEXT_LIMIT) }] }));
    expect(labelTexts(scene)).toHaveLength(LABEL_MAX_LINES);
    expect(labelTexts(scene).at(-1)!.text.endsWith("…")).toBe(true);
  });

  it("draws empty axes for a graph with no points or segments, and the grid when it is on", () => {
    const empty = sceneOf(graph([-10, 10], [-10, 10]));
    expect(markers(empty)).toEqual([]);
    expect(segmentLines(empty)).toEqual([]);
    expect(labelTexts(empty)).toEqual([]);
    expect(axisLines(empty)).toHaveLength(2);
    expect(empty.nodes.every((node) => ["line", "text"].includes(node.kind))).toBe(true);
    expect(gridLines(sceneOf(graph([-10, 10], [-10, 10], { showGrid: true })))).toHaveLength(22);
  });
});

describe("equal units (NLC-REQ-032, prd/TC-001)", () => {
  const unitLengths = (scene: Scene, x: [number, number], y: [number, number]) => {
    const plot = plotOf(scene, x, y);
    return { plot, xUnit: plot.width / (x[1] - x[0]), yUnit: plot.height / (y[1] - y[0]) };
  };

  it("draws one x unit and one y unit the same length: x -10..10 and y -2..2 is wider than tall", () => {
    const { plot, xUnit, yUnit } = unitLengths(sceneOf(graph([-10, 10], [-2, 2])), [-10, 10], [-2, 2]);
    expect(plot.width).toBeGreaterThan(plot.height);
    expect(Math.abs(xUnit / yUnit - 1)).toBeLessThan(0.001);
  });

  it("keeps equal units across generated ranges inside the ratio bounds, the height derived from the ranges", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 50 }), fc.integer({ min: 1, max: 50 }), fc.integer({ min: -60, max: 60 }), (xSpan, ySpan, start) => {
        fc.pre(ySpan / xSpan >= PLANE_MIN_RATIO && ySpan / xSpan <= 3);
        const [x, y]: [[number, number], [number, number]] = [[start, start + xSpan], [-ySpan, 0]];
        const { plot, xUnit, yUnit } = unitLengths(sceneOf(graph(x, y)), x, y);
        expect(Math.abs(xUnit / yUnit - 1)).toBeLessThan(0.002);
        expect(plot.height).toBeLessThanOrEqual(MAX_PLOT_HEIGHT + 0.01);
      }),
      { numRuns: 100 },
    );
  });

  it("narrows a plot too tall at full width, centered, keeping equal units", () => {
    // Tick labels of one width, so both drawings leave the same room beside the plot.
    const spaced = (x: [number, number], y: [number, number]) => sceneOf(graph(x, y, { xAxis: { min: x[0], max: x[1], tickSpacing: 1 }, yAxis: { min: y[0], max: y[1], tickSpacing: 1 } }));
    const tall = spaced([-2, 2], [-5, 5]);
    const { plot, xUnit, yUnit } = unitLengths(tall, [-2, 2], [-5, 5]);
    expect(plot.height).toBeCloseTo(MAX_PLOT_HEIGHT, 1);
    expect(plot.width).toBeCloseTo(MAX_PLOT_HEIGHT / 2.5, 1);
    expect(Math.abs(xUnit / yUnit - 1)).toBeLessThan(0.001);
    // Centered in the room a square plane of the same axes would fill.
    const wide = plotOf(spaced([-5, 5], [-5, 5]), [-5, 5], [-5, 5]);
    expect(Math.abs((plot.left + plot.right) / 2 - (wide.left + wide.right) / 2)).toBeLessThan(1);
    expect(tall.textAlternative).not.toContain("unit");
  });

  it("holds the plot at the narrowest width and the tallest height when narrowing is not enough, and says the units differ", () => {
    const scene = sceneOf(graph([0, 1], [0, 100]));
    const { plot, xUnit, yUnit } = unitLengths(scene, [0, 1], [0, 100]);
    expect(plot.width).toBeCloseTo(MIN_PLOT_WIDTH, 1);
    expect(plot.height).toBeCloseTo(MAX_PLOT_HEIGHT, 1);
    expect(yUnit).toBeLessThan(xUnit);
    expect(scene.textAlternative).toContain("one y unit is drawn shorter than one x unit");
  });

  it("holds a plot too flat at the lowest ratio, and says the units differ", () => {
    const scene = sceneOf(graph([0, 1000], [0, 1]));
    const { plot, xUnit, yUnit } = unitLengths(scene, [0, 1000], [0, 1]);
    expect(plot.height / plot.width).toBeCloseTo(PLANE_MIN_RATIO, 3);
    expect(yUnit).toBeGreaterThan(xUnit);
    expect(scene.textAlternative).toContain("one y unit is drawn longer than one x unit");
  });

  it("sizes the plot from the ranges alone: the same ranges always draw the same plot", () => {
    expect(planeAxes([-10, 10], [-2, 2], 300)).toEqual({ quadrants: 4, xAxisAt: 0, yAxisAt: 0, xLabelSide: "below", yLabelSide: "left", width: 300, height: 60, equalUnits: true });
    expect(planeAxes([0, 1], [0, 100], 300)).toMatchObject({ width: MIN_PLOT_WIDTH, height: MAX_PLOT_HEIGHT, equalUnits: false });
  });
});

describe("axis labels, title and text alternative (NLC-REQ-031, NLC-REQ-012, GSV-REQ-040)", () => {
  const example: unknown = JSON.parse(readFileSync("examples/xy-graph.json", "utf8"));

  it("draws the title first with titleBlock, the y-axis label upward on the left and the x-axis label below", () => {
    const scene = sceneOf(example);
    const block = titleBlock("A walk across town");
    expect(scene.nodes.slice(0, block.nodes.length)).toEqual(block.nodes);
    const plot = plotOf(scene, [-5, 5], [-5, 5]);
    const yLabel = texts(scene).find((node) => node.text === "Blocks north")!;
    expect(String(attr(yLabel, "transform"))).toMatch(/^rotate\(-90 /);
    expect(boundsOf(yLabel).x1).toBeLessThan(plot.left);
    const xLabel = texts(scene).find((node) => node.text === "Blocks east")!;
    expect(boundsOf(xLabel).y0).toBeGreaterThan(Math.max(...tickTexts(scene).map((node) => boundsOf(node).y1)));
  });

  it("cuts long axis labels to two lines and the title to three", () => {
    const long = wordsOf(CALLER_TEXT_LIMIT);
    const scene = sceneOf(graph([-10, 10], [-10, 10], { title: long, xAxisLabel: long, yAxisLabel: long }));
    expect(texts(scene).filter((node) => num(node, "font-size") === defaultStyle.fontSizes.title)).toHaveLength(3);
    expect(texts(scene).filter((node) => attr(node, "transform") !== undefined)).toHaveLength(2);
    expect(labelTexts(scene)).toHaveLength(2);
  });

  it("states the definition's text alternative as its own", () => {
    const result = validate(example);
    if (!result.valid) throw new Error(JSON.stringify(result.issues));
    expect(sceneOf(example).textAlternative).toBe(xyGraphDefinition.describe(result.description as XyGraph, result.provenance));
  });

  it("fails closed on an axis no validation gives", () => {
    expect(() => xyGraphLayout({ type: "xy-graph", xAxis: { min: 1, max: 1 }, yAxis: { min: 0, max: 1 } } as XyGraph, {})).toThrow(RangeError);
  });
});

describe("the drawing stays inside its bounds (NLC-NFR-001; GSV-REQ-052)", () => {
  const inside = (scene: Scene) => {
    for (const b of scene.nodes.map(boundsOf)) {
      expect(b.x0 >= -0.02 && b.x1 <= SCENE_WIDTH + 0.02 && b.y0 >= -0.02 && b.y1 <= scene.height + 0.02, nameOf(b)).toBe(true);
    }
  };

  it("keeps every node inside, at the extremes of range, ratio and text", () => {
    const long = wordsOf(CALLER_TEXT_LIMIT);
    for (const [x, y] of [
      [[-1e9, 1e9], [-1e9, 1e9]],
      [[0.001, 0.002], [-1, 1]],
      [[0, 1], [0, 100]],
      [[0, 1000], [0, 1]],
      [[-10, -2], [-9, -3]],
      [[-1 / 3, 2 / 3], [-666666666.6666666, 1e9]],
    ] as Array<[[number, number], [number, number]]>) {
      for (const text of [undefined, long, ...Object.values(oneClusterTexts(CALLER_TEXT_LIMIT))]) {
        const extra = text === undefined ? {} : { title: text, xAxisLabel: text, yAxisLabel: text };
        const corners = [{ x: x[0], y: y[0], label: text }, { x: x[1], y: y[1], label: text }, { x: x[0], y: y[1] }, { x: x[1], y: y[0], label: text }];
        inside(sceneOf(graph(x, y, { ...extra, showGrid: true, points: corners, segments: [{ from: { x: x[0], y: y[0] }, to: { x: x[1], y: y[1] }, label: text }] })));
      }
    }
  });

  it("keeps every node inside over generated graphs, every marker within half a unit", () => {
    const WORDS = ["A", "B", "Home", "the freezing point of water", "x"];
    const arbitrary = fc
      .record({
        xMin: fc.integer({ min: -1000, max: 990 }),
        xSpan: fc.integer({ min: 1, max: 1000 }),
        yMin: fc.integer({ min: -1000, max: 990 }),
        ySpan: fc.integer({ min: 1, max: 1000 }),
        showGrid: fc.boolean(),
        points: fc.array(fc.record({ u: fc.double({ min: 0, max: 1, noNaN: true }), v: fc.double({ min: 0, max: 1, noNaN: true }), label: fc.option(fc.constantFrom(...WORDS)) }), { maxLength: 6 }),
      })
      .map(({ xMin, xSpan, yMin, ySpan, showGrid, points }) => {
        const plotted = points.map(({ u, v, label }) => ({ x: xMin + u * xSpan, y: yMin + v * ySpan, ...(label !== null && { label }) }));
        return {
          x: [xMin, xMin + xSpan] as [number, number],
          y: [yMin, yMin + ySpan] as [number, number],
          plotted,
          description: graph([xMin, xMin + xSpan], [yMin, yMin + ySpan], { showGrid, points: plotted }),
        };
      });
    fc.assert(
      fc.property(arbitrary, ({ x, y, plotted, description }) => {
        const scene = sceneOf(description);
        inside(scene);
        const plot = plotOf(scene, x, y);
        markers(scene).forEach((marker, i) => {
          const point = plotted[i]!;
          expect(Math.abs(num(marker, "cx") - plot.xOf(point.x))).toBeLessThanOrEqual(0.5);
          expect(Math.abs(num(marker, "cy") - plot.yOf(point.y))).toBeLessThanOrEqual(0.5);
        });
      }),
      { numRuns: 200 },
    );
  });
});
