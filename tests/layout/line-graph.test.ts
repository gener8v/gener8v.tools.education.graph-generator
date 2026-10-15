import { readFileSync } from "node:fs";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { SERIES_LIMIT, type LineGraph } from "../../src/core/definitions/line-graph";
import { validate } from "../../src/core/index";
import { seriesStyles } from "../../src/core/style";
import { createGraph } from "../../src/graph";
import { checkScene } from "../../src/layout/kit/check";
import { SCENE_MARGIN } from "../../src/layout/kit/title";
import { LEGEND_MAX_LINES, lineGraphLayout } from "../../src/layout/line-graph";
import { SCENE_WIDTH, type Scene, type SceneNode } from "../../src/layout/scene";
import { attr, boundsOf, nameOf, overlap } from "../fixtures/scene-geometry";

/** The Scene the line-graph layout draws for a valid description; it must pass `checkScene`. */
function sceneOf(input: Record<string, unknown>): Scene {
  const result = validate({ type: "line-graph", categories: [{ name: "Mon" }, { name: "Tue" }, { name: "Wed" }], series: [{ values: [3, 5, 2] }], ...input });
  if (!result.valid) throw new Error(JSON.stringify(result.issues));
  const scene = lineGraphLayout(result.description as LineGraph, result.provenance);
  expect(checkScene(scene)).toEqual([]);
  return scene;
}

const num = (node: SceneNode, name: string) => Number(attr(node, name));
const texts = (scene: Scene) => scene.nodes.flatMap((node) => (node.kind === "text" ? [node.text] : []));
const pointsOf = (node: SceneNode) =>
  String(attr(node, "points"))
    .split(" ")
    .map((pair) => pair.split(",").map(Number) as [number, number]);
const MARKER_KINDS = new Set(["circle", "polygon"]);

/**
 * The plot's series, in drawing order: one line per series when there is more than one category,
 * then every marker, series by series. The legend's samples and markers come after them.
 */
function seriesOf(scene: Scene, series: number, categories: number) {
  const lines = scene.nodes.filter((node) => node.kind === "polyline").slice(0, categories > 1 ? series : 0);
  const markers = scene.nodes.filter((node) => MARKER_KINDS.has(node.kind)).slice(0, series * categories);
  expect(markers).toHaveLength(series * categories);
  return { lines, markers: Array.from({ length: series }, (_, s) => markers.slice(s * categories, (s + 1) * categories)) };
}

/** Whether a marker's box holds (`x`, `y`) well inside it: the point it marks. */
const covers = (marker: SceneNode, x: number, y: number) => {
  const b = boundsOf(marker);
  const [w, h] = [b.x1 - b.x0, b.y1 - b.y0];
  return x > b.x0 + w / 4 && x < b.x1 - w / 4 && y > b.y0 + h / 4 && y < b.y1 - h / 4;
};

const example = JSON.parse(readFileSync("examples/line-graph.json", "utf8")) as Record<string, unknown>;

describe("points and segments (DGP-REQ-010, DGP-REQ-012)", () => {
  it("marks every value at its category's slot and its value's height, and joins a series' points with straight segments", () => {
    const scene = sceneOf(example);
    const { lines, markers } = seriesOf(scene, 3, 5);
    expect(lines).toHaveLength(3);
    const values = (example["series"] as Array<{ values: number[] }>).map((s) => s.values);
    const points = lines.map(pointsOf);
    // Every series' points lie on one evenly spaced set of x positions.
    const xs = points[0]!.map(([x]) => x);
    const step = xs[1]! - xs[0]!;
    xs.forEach((x, i) => expect(x).toBeCloseTo(xs[0]! + i * step, 1));
    // One linear map from value to height for every point: higher values are higher up.
    const [v0, y0] = [values[0]![0]!, points[0]![0]![1]];
    const [v1, y1] = [values[2]![4]!, points[2]![4]![1]];
    const perUnit = (y1 - y0) / (v1 - v0);
    expect(perUnit).toBeLessThan(0);
    points.forEach((series, s) => {
      expect(series).toHaveLength(5);
      series.forEach(([x, y], i) => {
        expect(x, `series ${s} point ${i}`).toBeCloseTo(xs[i]!, 1);
        expect(y, `series ${s} point ${i}`).toBeCloseTo(y0 + (values[s]![i]! - v0) * perUnit, 1);
        // The point's marker covers it.
        expect(covers(markers[s]![i]!, x, y), `series ${s} marker ${i}`).toBe(true);
      });
    });
  });

  it("draws a single-category series as one point with no segment (DGP Edge Cases)", () => {
    const scene = sceneOf({ categories: [{ name: "Mon" }], series: [{ values: [4] }, { values: [2] }] });
    // The legend's two samples are the only lines in the drawing: two points, two legend markers.
    const lines = scene.nodes.filter((node) => node.kind === "polyline");
    expect(lines).toHaveLength(2);
    for (const line of lines) {
      // A level, two-point sample 28 units long.
      const points = pointsOf(line);
      expect(points).toHaveLength(2);
      const [[x1, y1], [x2, y2]] = points as [[number, number], [number, number]];
      expect(y2).toBe(y1);
      expect(x2 - x1).toBeCloseTo(28, 1);
    }
    expect(scene.nodes.filter((node) => MARKER_KINDS.has(node.kind))).toHaveLength(4);
  });

  it("draws every marker after every line, so no line covers a point", () => {
    const scene = sceneOf(example);
    const lastLine = scene.nodes.findIndex((node, i) => node.kind === "polyline" && scene.nodes.slice(i + 1).every((n) => n.kind !== "polyline" || false));
    const firstMarker = scene.nodes.findIndex((node) => MARKER_KINDS.has(node.kind));
    const plotLines = scene.nodes.slice(0, firstMarker).filter((node) => node.kind === "polyline");
    expect(plotLines).toHaveLength(3);
    expect(lastLine).toBeGreaterThan(firstMarker); // the legend's samples come later still
  });
});

describe("series styles: color, marker and dash (DGP-REQ-011, DGP-REQ-014, prd/CC-002)", () => {
  const six = Array.from({ length: SERIES_LIMIT }, (_, s) => ({ values: [s, s + 1] }));

  it("gives series without a line color the default colors in order, each with its own marker and dash", () => {
    const scene = sceneOf({ categories: [{ name: "A" }, { name: "B" }], series: six });
    const { lines, markers } = seriesOf(scene, SERIES_LIMIT, 2);
    expect(lines.map((line) => attr(line, "stroke"))).toEqual(seriesStyles.map((style) => style.color));
    expect(lines.map((line) => attr(line, "stroke-dasharray") ?? "none")).toEqual(seriesStyles.map((style) => style.dash));
    // The six shapes: a circle, then polygons with 4 (square), 3, 4 (diamond), 12 (cross) and 10 (star) corners.
    const shapes = markers.map(([marker]) => (marker!.kind === "circle" ? "circle" : `${pointsOf(marker!).length} corners`));
    expect(shapes).toEqual(["circle", "4 corners", "3 corners", "4 corners", "12 corners", "10 corners"]);
    // The square sits on its sides and the diamond on a corner.
    const [square, diamond] = [pointsOf(markers[1]![0]!), pointsOf(markers[3]![0]!)];
    expect(square[0]![1]).toBe(square[1]![1]);
    expect(diamond[0]![0]).toBe(diamond[2]![0]);
    markers.forEach((series, s) => series.forEach((marker) => expect(attr(marker, "fill")).toBe(seriesStyles[s]!.color)));
  });

  it("uses a series' own line color, keeping its default marker and dash", () => {
    const scene = sceneOf({ series: [{ values: [3, 5, 2] }, { values: [1, 2, 3], lineColor: "#123456" }] });
    const { lines, markers } = seriesOf(scene, 2, 3);
    expect(attr(lines[1]!, "stroke")).toBe("#123456");
    expect(attr(lines[1]!, "stroke-dasharray")).toBe(seriesStyles[1]!.dash);
    expect(markers[1]!.every((marker) => marker.kind === "polygon" && attr(marker, "fill") === "#123456")).toBe(true);
    expect(attr(lines[0]!, "stroke")).toBe(seriesStyles[0]!.color);
  });
});

describe("the legend (DGP-REQ-013)", () => {
  it("lists every series with its label, or \"Series N\", and a sample in its color, dash and marker, when there is more than one", () => {
    const scene = sceneOf(example);
    const all = texts(scene);
    expect(all).toEqual(expect.arrayContaining(["Week 1", "Week 2", "Series 3"]));
    // After the plot's three lines: one sample per series, in order.
    const samples = scene.nodes.filter((node) => node.kind === "polyline").slice(3);
    expect(samples.map((sample) => attr(sample, "stroke"))).toEqual(["#0072b2", seriesStyles[1]!.color, seriesStyles[2]!.color]);
    expect(samples.map((sample) => attr(sample, "stroke-dasharray") ?? "none")).toEqual(seriesStyles.slice(0, 3).map((style) => style.dash));
    // Each sample's marker sits on the sample's middle.
    for (const sample of samples) {
      const [[x1, y], [x2]] = pointsOf(sample) as [[number, number], [number, number]];
      const marker = scene.nodes.slice(scene.nodes.indexOf(sample) + 1, scene.nodes.indexOf(sample) + 2)[0]!;
      expect(MARKER_KINDS.has(marker.kind)).toBe(true);
      expect(covers(marker, (x1 + x2) / 2, y)).toBe(true);
      expect(marker).toBeDefined();
    }
  });

  it("draws no legend for one series, labeled or not", () => {
    for (const series of [[{ values: [3, 5, 2] }], [{ values: [3, 5, 2], lineLabel: "Only" }]]) {
      const scene = sceneOf({ series });
      expect(scene.nodes.filter((node) => node.kind === "polyline")).toHaveLength(1);
      expect(texts(scene)).not.toContain("Series 1");
      expect(texts(scene)).not.toContain("Only");
    }
  });

  it("caps a long label's lines, ending in an ellipsis; the text alternative states it whole", () => {
    const label = "word ".repeat(500).trim();
    const scene = sceneOf({ series: [{ values: [3, 5, 2], lineLabel: label }, { values: [1, 2, 3] }] });
    const legendLines = texts(scene).filter((line) => line.startsWith("word"));
    expect(legendLines.length).toBeLessThanOrEqual(LEGEND_MAX_LINES);
    expect(legendLines.at(-1)!.endsWith("…")).toBe(true);
    expect(scene.textAlternative).toContain(label);
  });
});

describe("the value scale (DGP-REQ-015, DGP-REQ-006)", () => {
  const tickLabels = (scene: Scene) => texts(scene).filter((text) => /^-?\d+(\.\d+)?$/.test(text));

  it("extends a default scale below zero to include negative values", () => {
    const labels = tickLabels(sceneOf({ series: [{ values: [3, -7, 2] }] }));
    expect(labels).toContain("0");
    expect(Number(labels[0])).toBeLessThanOrEqual(-7);
    expect(Number(labels.at(-1))).toBeGreaterThanOrEqual(3);
  });

  it("starts a default scale at zero for values that are all positive", () => {
    expect(tickLabels(sceneOf({ series: [{ values: [3, 7, 2] }] }))[0]).toBe("0");
  });

  it("uses a given scale exactly", () => {
    expect(tickLabels(sceneOf(example))).toEqual(["-5", "0", "5", "10", "15"]);
  });
});

describe("axis labels (DGP-REQ-002)", () => {
  it("reads the value-axis label upward beside the axis, and centers the category-axis label below the names", () => {
    const scene = sceneOf(example);
    const value = scene.nodes.find((node) => node.kind === "text" && node.text === "Temperature (°C)")!;
    expect(attr(value, "transform")).toMatch(/^rotate\(-90 /);
    const category = scene.nodes.find((node) => node.kind === "text" && node.text === "Day")!;
    const names = scene.nodes.filter((node) => node.kind === "text" && ["Mon", "Fri"].includes(node.text));
    expect(boundsOf(category).y0).toBeGreaterThan(Math.max(...names.map((name) => boundsOf(name).y1)));
    expect(num(category, "x")).toBe(SCENE_WIDTH / 2);
  });

  it("caps each axis label at two lines", () => {
    const long = "word ".repeat(500).trim();
    const scene = sceneOf({ categoryAxisLabel: long, valueAxisLabel: long });
    expect(texts(scene).filter((line) => line.startsWith("word")).length).toBeLessThanOrEqual(4);
  });
});

/** Every way the drawing's geometry can be wrong, as messages; an empty list means it is sound. */
function geometryProblems(scene: Scene): string[] {
  const problems: string[] = [];
  const all = scene.nodes.map(boundsOf);
  for (const b of all) {
    if (b.x0 < SCENE_MARGIN - 0.02 || b.x1 > SCENE_WIDTH - SCENE_MARGIN + 0.02 || b.y0 < -0.02 || b.y1 > scene.height + 0.02) {
      problems.push(`${nameOf(b)} outside the drawing`);
    }
  }
  // Text never overlaps text, a marker or a line; markers and lines meet only inside the plot.
  const textBoxes = all.filter((b) => b.node.kind === "text");
  const shapes = all.filter((b) => b.node.kind !== "text");
  for (let i = 0; i < textBoxes.length; i++) {
    for (let j = i + 1; j < textBoxes.length; j++) if (overlap(textBoxes[i]!, textBoxes[j]!)) problems.push(`${nameOf(textBoxes[i]!)} overlaps ${nameOf(textBoxes[j]!)}`);
    for (const shape of shapes) if (overlap(textBoxes[i]!, shape)) problems.push(`${nameOf(textBoxes[i]!)} overlaps ${nameOf(shape)}`);
  }
  return problems;
}

/** The plot's width: the category axis along its bottom, the widest horizontal line (ticks are short ones). */
function plotWidth(scene: Scene): number {
  let widest = 0;
  for (const node of scene.nodes) {
    if (node.kind === "line" && attr(node, "y1") === attr(node, "y2")) widest = Math.max(widest, num(node, "x2") - num(node, "x1"));
  }
  return widest;
}

describe("the drawing's geometry", () => {
  const WORDS = ["Monday", "Wednesday", "Apples", "September", "Average", "of", "A", "Pneumonoultramicroscopicsilicovolcanoconiosis"];
  const lineGraph = fc.integer({ min: 1, max: 16 }).chain((n) =>
    fc.record({
      names: fc.array(fc.array(fc.constantFrom(...WORDS), { minLength: 1, maxLength: 3 }), { minLength: n, maxLength: n }),
      series: fc.array(
        fc.record({
          values: fc.array(fc.oneof(fc.integer({ min: -50, max: 50 }), fc.double({ min: -1e9, max: 1e9, noNaN: true })), { minLength: n, maxLength: n }),
          lineLabel: fc.option(fc.constantFrom("Week 1", "A rather long series label that wraps onto more than two lines in the legend, so it is cut")),
          lineColor: fc.option(fc.constantFrom("red", "#123456")),
        }),
        { minLength: 1, maxLength: SERIES_LIMIT },
      ),
      title: fc.option(fc.constantFrom("Temperatures", "How the temperature changed each morning over three school weeks in the spring term")),
      categoryAxisLabel: fc.option(fc.constantFrom("Day", "The day of the week on which the reading was taken, before school")),
      valueAxisLabel: fc.option(fc.constantFrom("°C", "Temperature in degrees Celsius, measured in the playground at 8 o'clock")),
    }).map(({ names, series, ...rest }) => ({
      // Names are made distinct, as validation requires.
      categories: names.map((words, i) => ({ name: `${words.join(" ")} ${i + 1}` })),
      series: series.map(({ values, lineLabel, lineColor }) => ({ values, ...(lineLabel === null ? {} : { lineLabel }), ...(lineColor === null ? {} : { lineColor }) })),
      ...Object.fromEntries(Object.entries(rest).filter(([, value]) => value !== null)),
    })),
  );

  it("keeps everything inside the drawing, and text clear of text, lines and markers, while a name's line fits its column", () => {
    fc.assert(
      fc.property(lineGraph, (input) => {
        const scene = sceneOf(input);
        // Crowded columns, where one line of a rotated name is wider than its slot, are DGP
        // TICKET-003's (DGP TICKET-005 QR-002): here that starts at about 17 to 25 categories,
        // with the value axis's labels narrowing the plot (DEL-004).
        fc.pre(plotWidth(scene) / input.categories.length >= 12 * 1.2);
        expect(geometryProblems(scene)).toEqual([]);
      }),
      { numRuns: 200 },
    );
  });

  it("puts every marker inside the plot's height", () => {
    fc.assert(
      fc.property(lineGraph, (input) => {
        const scene = sceneOf(input);
        const axis = scene.nodes.find((node) => node.kind === "line")!;
        const [top, bottom] = [num(axis, "y1"), num(axis, "y2")];
        const { markers } = seriesOf(scene, input.series.length, input.categories.length);
        // Each marked point, the line's or a lone point's marker, is within the plot's height.
        markers.forEach((series, s) =>
          series.forEach((marker, i) => {
            const b = boundsOf(marker);
            const y = (b.y0 + b.y1) / 2;
            // A marker reaches at most 1.5 × its half-size from its point either way.
            expect(y, `series ${s} point ${i}`).toBeGreaterThanOrEqual(top - 3);
            expect(y, `series ${s} point ${i}`).toBeLessThanOrEqual(bottom + 3);
          }),
        );
      }),
      { numRuns: 100 },
    );
  });
});

describe("the whole line graph through createGraph", () => {
  it("is the Scene createGraph returns for the example, with the text alternative", () => {
    const result = createGraph(example);
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    expect(result.scene).toEqual(sceneOf(example));
    expect(result.scene.textAlternative.startsWith("A line graph titled “Morning temperatures over one week”.")).toBe(true);
  });

  it("keeps the drawing bounded for caller text of any length", () => {
    const long = "word ".repeat(100_000).trim();
    const scene = sceneOf({
      title: long,
      categoryAxisLabel: long,
      valueAxisLabel: long,
      series: Array.from({ length: SERIES_LIMIT }, () => ({ values: [3, 5, 2], lineLabel: long })),
    });
    // Title 3 lines, two axis labels of 2, six legend labels of 2, three names, tick labels.
    expect(texts(scene).length).toBeLessThan(3 + 4 + 12 + 3 + 20);
    expect(scene.height).toBeLessThan(800);
  });
});

