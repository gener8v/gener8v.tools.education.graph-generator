import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validate } from "../../src/core/index";
import { CALLER_TEXT_LIMIT } from "../../src/core/definitions/shared";
import { AXIS_PAGE_LENGTH, type XyzGraph, xyzGraph as xyzGraphDefinition, xyzRooms } from "../../src/core/definitions/xyz-graph";
import { defaultStyle, namedColors } from "../../src/core/style";
import { axisTickLabel, niceTicks } from "../../src/core/value-scale";
import { createGraph } from "../../src/graph";
import { checkScene } from "../../src/layout/kit/check";
import { ISO_SCALE, isometric } from "../../src/layout/kit/isometric";
import { SCENE_MARGIN, titleBlock } from "../../src/layout/kit/title";
import { SCENE_WIDTH, type Scene, type SceneNode } from "../../src/layout/scene";
import { AXIS_LENGTH, GUIDE_DASH, xyzGraphLayout } from "../../src/layout/xyz-graph";
import { oneClusterTexts, wordsOf } from "../fixtures/plain-text";
import { attr, boundsOf, nameOf, overlap } from "../fixtures/scene-geometry";

type Text = Extract<SceneNode, { kind: "text" }>;
type Range = readonly [number, number];
type Name = "x" | "y" | "z";
const NAMES = ["x", "y", "z"] as const;

/** The normalized description, which `xyzRooms` reads. */
function normalizedOf(description: unknown): XyzGraph {
  const result = validate(description);
  if (!result.valid) throw new Error(`expected a valid x,y,z graph, got ${JSON.stringify(result.issues)}`);
  return result.description as XyzGraph;
}

/** The Scene for a valid description, which must pass checkScene (AD-007, AD-008). */
function sceneOf(description: unknown): Scene {
  const result = validate(description);
  if (!result.valid) throw new Error(`expected a valid x,y,z graph, got ${JSON.stringify(result.issues)}`);
  const scene = xyzGraphLayout(result.description as XyzGraph, result.provenance);
  expect(checkScene(scene)).toEqual([]);
  return scene;
}

const num = (node: SceneNode, name: string) => Number(attr(node, name));
const graph = (x: Range, y: Range, z: Range, extra: object = {}) => ({
  type: "xyz-graph",
  xAxis: { min: x[0], max: x[1] },
  yAxis: { min: y[0], max: y[1] },
  zAxis: { min: z[0], max: z[1] },
  ...extra,
});
const lines = (scene: Scene) => scene.nodes.filter((node) => node.kind === "line");
const lengthOf = (node: SceneNode) => Math.hypot(num(node, "x2") - num(node, "x1"), num(node, "y2") - num(node, "y1"));
/** The axis lines and ticks, in the line color: the axes first in each `drawAxis` call, x, y then z. */
const axisNodes = (scene: Scene) => lines(scene).filter((node) => attr(node, "stroke") === defaultStyle.colors.line);
const axisLines = (scene: Scene) => axisNodes(scene).filter((node) => lengthOf(node) > 10);
const guideLines = (scene: Scene) => lines(scene).filter((node) => attr(node, "stroke-dasharray") !== undefined);
const markers = (scene: Scene) => scene.nodes.filter((node) => node.kind === "circle");
const texts = (scene: Scene) => scene.nodes.filter((node): node is Text => node.kind === "text");
const tickTexts = (scene: Scene) => texts(scene).filter((node) => num(node, "font-size") === defaultStyle.fontSizes.tickLabel);
const labelTexts = (scene: Scene) => texts(scene).filter((node) => num(node, "font-size") === defaultStyle.fontSizes.label);

/** Each axis's ticks as the layout draws them: its own spacing, or the default fitted to its drawn length (`xyzRooms`). */
function ticksOf(description: unknown) {
  const normalized = normalizedOf(description);
  const rooms = xyzRooms(normalized);
  const of = (name: Name) => {
    const axis = normalized[`${name}Axis`];
    return niceTicks(axis.min, axis.max, Object.hasOwn(axis, "tickSpacing") ? axis.tickSpacing : undefined, rooms[name]);
  };
  return { x: of("x"), y: of("y"), z: of("z") };
}

/**
 * The page position the test expects for (x, y, z): each value scaled into drawing units from where
 * the axes meet, `AXIS_LENGTH` for its whole range, projected by `isometric()` alone, and moved by
 * the one translation read off the drawn x-axis's min end (NLC-NFR-001: within 0.5 of the projection).
 */
function projectionOf(scene: Scene, description: { xAxis: { min: number; max: number }; yAxis: { min: number; max: number }; zAxis: { min: number; max: number } }) {
  const axes = { x: description.xAxis, y: description.yAxis, z: description.zAxis };
  const meet = { x: Math.min(axes.x.max, Math.max(axes.x.min, 0)), y: Math.min(axes.y.max, Math.max(axes.y.min, 0)), z: Math.min(axes.z.max, Math.max(axes.z.min, 0)) };
  const unit = (name: Name, value: number) => ((value - meet[name]) * AXIS_LENGTH) / (axes[name].max - axes[name].min);
  const raw = (x: number, y: number, z: number) => isometric(unit("x", x), unit("y", y), unit("z", z));
  const xAxis = axisLines(scene)[0]!;
  const [rx, ry] = raw(axes.x.min, meet.y, meet.z);
  const [dx, dy] = [num(xAxis, "x1") - rx, num(xAxis, "y1") - ry];
  return {
    meet,
    pageOf: (x: number, y: number, z: number): [number, number] => {
      const [px, py] = raw(x, y, z);
      return [px + dx, py + dy];
    },
  };
}

/** Whether (`x`, `y`) is within half a unit of `expected`. */
const near = ([x, y]: readonly [number, number], expected: readonly [number, number]) => Math.hypot(x - expected[0], y - expected[1]) <= 0.5;

/**
 * Each axis's tick labels as drawn, in order along it. The layout writes them axis by axis, x, y
 * then z, tick by tick, leaving out a label at the meeting point whose text an earlier axis wrote
 * there, and a label with no clear place (code review CR-001); the test reads them back in that
 * order, a tick whose text is not the next drawn being one left out.
 */
function tickLabelsByAxis(scene: Scene, description: { xAxis: object; yAxis: object; zAxis: object }) {
  const ticks = ticksOf(description);
  const normalized = normalizedOf(description);
  const meet = projectionOf(scene, normalized).meet;
  const drawn = tickTexts(scene);
  const seen = new Set<string>();
  let next = 0;
  const byAxis: Record<Name, Text[]> = { x: [], y: [], z: [] };
  for (const name of NAMES) {
    if (normalized[`${name}Axis`].showTickLabels === false) continue;
    for (const tick of ticks[name].ticks) {
      const text = axisTickLabel(tick, ticks[name].spacing);
      if (tick === meet[name] && seen.has(text)) continue;
      const node = drawn[next];
      if (node?.text !== text) continue;
      if (tick === meet[name]) seen.add(text);
      next++;
      byAxis[name].push(node);
    }
  }
  expect(next).toBe(drawn.length);
  return byAxis;
}

/** The neighbouring labels that overlap (`boundsOf`, `overlap`), as "a / b". */
const crowded = (labels: readonly Text[]) =>
  labels.slice(1).flatMap((label, i) => (overlap(boundsOf(labels[i]!), boundsOf(label)) ? [`${labels[i]!.text} / ${label.text}`] : []));

const example = JSON.parse(readFileSync("examples/xyz-graph.json", "utf8"));

describe("the fixed isometric projection (NLC-REQ-034, NLC-REQ-035, NLC-REQ-037; NLC-NFR-001)", () => {
  const cases: Array<[Range, Range, Range]> = [
    [[0, 5], [0, 5], [0, 5]],
    [[-10, 10], [2, 9], [-0.5, 0.25]],
    [[-10, -2], [0, 1000], [5, 6]],
    [[-1e9, 1e9], [-1 / 3, 2 / 3], [-666666666.6666666, 1e9]],
  ];

  it("draws every axis end and tick within half a unit of isometric() of its scaled value, each axis through the meeting point", () => {
    for (const [x, y, z] of cases) {
      const description = graph(x, y, z);
      const scene = sceneOf(description);
      const { meet, pageOf } = projectionOf(scene, description);
      const at = (name: Name, value: number) => pageOf(name === "x" ? value : meet.x, name === "y" ? value : meet.y, name === "z" ? value : meet.z);
      const nodes = axisNodes(scene);
      const ticks = ticksOf(description);
      const starts = nodes.flatMap((node, i) => (lengthOf(node) > 10 ? [i] : []));
      expect(starts, JSON.stringify(description)).toHaveLength(3);
      NAMES.forEach((name, k) => {
        const line = nodes[starts[k]!]!;
        const range = { x, y, z }[name];
        expect(near([num(line, "x1"), num(line, "y1")], at(name, range[0])), `${name} min end`).toBe(true);
        expect(near([num(line, "x2"), num(line, "y2")], at(name, range[1])), `${name} max end`).toBe(true);
        const marks = nodes.slice(starts[k]! + 1, starts[k + 1] ?? nodes.length);
        expect(marks, name).toHaveLength(ticks[name].ticks.length);
        marks.forEach((mark, i) => {
          const middle = [(num(mark, "x1") + num(mark, "x2")) / 2, (num(mark, "y1") + num(mark, "y2")) / 2] as const;
          expect(near(middle, at(name, ticks[name].ticks[i]!)), `${name} tick ${ticks[name].ticks[i]}`).toBe(true);
        });
      });
    }
  });

  it("draws each axis the same length on the page, AXIS_LENGTH foreshortened by ISO_SCALE, z straight up, x to the lower left and y to the lower right", () => {
    for (const [x, y, z] of cases) {
      const [xLine, yLine, zLine] = axisLines(sceneOf(graph(x, y, z)));
      for (const line of [xLine!, yLine!, zLine!]) expect(Math.abs(lengthOf(line) - ISO_SCALE * AXIS_LENGTH)).toBeLessThanOrEqual(0.02);
      expect(num(zLine!, "x1")).toBe(num(zLine!, "x2"));
      expect(num(zLine!, "y2")).toBeLessThan(num(zLine!, "y1"));
      expect([num(xLine!, "x2") < num(xLine!, "x1"), num(xLine!, "y2") > num(xLine!, "y1")]).toEqual([true, true]);
      expect([num(yLine!, "x2") > num(yLine!, "x1"), num(yLine!, "y2") > num(yLine!, "y1")]).toEqual([true, true]);
    }
  });

  it("plots each point at isometric() of its scaled (x, y, z) within half a unit, in its own color or the accent", () => {
    for (const [x, y, z] of cases) {
      const points = [
        { x: x[0], y: y[0], z: z[1], color: "red" },
        { x: x[1], y: y[1], z: z[0] },
        { x: (x[0] + x[1]) / 2, y: y[0] + (y[1] - y[0]) / 3, z: z[0] + (z[1] - z[0]) / 4, color: "#123456" },
      ];
      const description = graph(x, y, z, { points });
      const scene = sceneOf(description);
      const { pageOf } = projectionOf(scene, description);
      const drawn = markers(scene);
      expect(drawn).toHaveLength(3);
      drawn.forEach((marker, i) => {
        const point = points[i]!;
        expect(near([num(marker, "cx"), num(marker, "cy")], pageOf(point.x, point.y, point.z)), JSON.stringify(point)).toBe(true);
      });
      expect(drawn.map((marker) => attr(marker, "fill"))).toEqual([namedColors.red, defaultStyle.colors.accent, "#123456"]);
    }
  });

  it("centers the figure's box across the drawing and starts it below the title", () => {
    const scene = sceneOf(example);
    const [xLine, yLine] = axisLines(scene);
    // For equal ranges from 0, the box's leftmost and rightmost corners are the x-axis and y-axis max ends.
    expect(Math.abs((num(xLine!, "x2") + num(yLine!, "x2")) / 2 - SCENE_WIDTH / 2)).toBeLessThanOrEqual(0.01);
    const block = titleBlock(example.title);
    expect(scene.nodes.slice(0, block.nodes.length)).toEqual(block.nodes);
    const top = Math.min(...scene.nodes.slice(block.nodes.length).map((node) => boundsOf(node).y0));
    expect(top).toBeGreaterThanOrEqual(block.height + SCENE_MARGIN - 1);
  });

  it("projects only through isometric(): the layout writes no projection of its own", () => {
    const source = readFileSync("src/layout/xyz-graph.ts", "utf8");
    expect(source).toContain('from "./kit/isometric"');
    for (const own of ["Math.cos", "Math.sin", "Math.sqrt", "Math.PI", "ISO_SCALE", "0.866", "0.816"]) expect(source, own).not.toContain(own);
  });

  it("lays out an example at the axis limits, ±1e9 on every axis with points at the corners, never failing (GSS TICKET-001 SEC-002)", () => {
    const corners = [-1e9, 1e9].flatMap((x) => [-1e9, 1e9].flatMap((y) => [-1e9, 1e9].map((z) => ({ x, y, z, label: "corner" }))));
    const result = createGraph(graph([-1e9, 1e9], [-1e9, 1e9], [-1e9, 1e9], { guideLines: true, points: corners }));
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    expect(markers(result.scene)).toHaveLength(8);
    for (const [low, high] of [[-1e9, -1e9 + 1], [1e9 - 1, 1e9], [0, 1e9]] as const) {
      expect(createGraph(graph([low, high], [low, high], [low, high], { points: [{ x: high, y: low, z: high }] })).ok, `${low}..${high}`).toBe(true);
    }
  });

  it("fails closed on an axis no validation gives", () => {
    expect(() => xyzGraphLayout({ type: "xyz-graph", xAxis: { min: 1, max: 1 }, yAxis: { min: 0, max: 1 }, zAxis: { min: 0, max: 1 } } as XyzGraph, {})).toThrow(RangeError);
  });
});

describe("tick spacing per axis (NLC-REQ-039, NLC-REQ-004, NLC-REQ-005; NLC TICKET-009)", () => {
  it("mirrors the layout's own numbers: core's page length is ISO_SCALE × AXIS_LENGTH (code review CR-003 on NLC TICKET-009)", () => {
    expect(AXIS_PAGE_LENGTH).toBe(ISO_SCALE * AXIS_LENGTH);
  });

  it("uses a supplied tick spacing as given on each axis, independently", () => {
    const description = { ...graph([0, 10], [0, 10], [0, 10]), xAxis: { min: 0, max: 10, tickSpacing: 2.5 }, yAxis: { min: 0, max: 10, tickSpacing: 0.5 }, zAxis: { min: 0, max: 10, tickSpacing: 5 } };
    const byAxis = tickLabelsByAxis(sceneOf(description), description);
    expect(byAxis.x.map((node) => node.text)).toEqual(["0", "2.5", "5", "7.5", "10"]);
    expect(byAxis.y.map((node) => node.text)).toHaveLength(20);
    expect(byAxis.z.map((node) => node.text)).toEqual(["5", "10"]);
    expect(sceneOf(description).textAlternative).toContain("x from 0 to 10 ticked every 2.5, y from 0 to 10 ticked every 0.5, z from 0 to 10 ticked every 5,");
  });

  it("labels a spacing worked out in floating point with the value meant (defect sweep DS-001)", () => {
    const description = { ...graph([0, 1.2], [0, 5], [0, 5]), xAxis: { min: 0, max: 1.2, tickSpacing: 0.1 * 3 } };
    expect(tickLabelsByAxis(sceneOf(description), description).x.map((node) => node.text)).toEqual(["0", "0.3", "0.6", "0.9", "1.2"]);
    const z = { ...graph([0, 5], [0, 5], [0, 1.2]), zAxis: { min: 0, max: 1.2, tickSpacing: 0.1 * 3 } };
    // The x-axis labels the origin; the z-axis leaves its 0 to it.
    expect(tickLabelsByAxis(sceneOf(z), z).z.map((node) => node.text)).toEqual(["0.3", "0.6", "0.9", "1.2"]);
  });

  it("labels the origin once, by the first axis that shows its tick labels", () => {
    const zeros = (description: object) => tickTexts(sceneOf(description)).filter((node) => node.text === "0");
    expect(zeros(graph([0, 5], [0, 5], [0, 5]))).toHaveLength(1);
    expect(zeros(graph([-5, 5], [-5, 5], [-5, 5]))).toHaveLength(1);
    const hidden = { ...graph([0, 5], [0, 5], [0, 5]), xAxis: { min: 0, max: 5, showTickLabels: false } };
    const byAxis = tickLabelsByAxis(sceneOf(hidden), hidden);
    expect([byAxis.x.length, byAxis.y[0]!.text, byAxis.z[0]!.text]).toEqual([0, "0", "1"]);
    const none = { ...hidden, yAxis: { min: 0, max: 5, showTickLabels: false }, zAxis: { min: 0, max: 5, showTickLabels: false } };
    expect(tickTexts(sceneOf(none))).toHaveLength(0);
    // Away from the origin each axis labels its own value at the meeting point.
    expect(tickTexts(sceneOf(graph([2, 9], [-10, -2], [5, 6], { xAxis: { min: 2, max: 9, tickSpacing: 1 } }))).map((node) => node.text)).toContain("2");
  });

  it("keeps a supplied spacing's labels and the default's neighbours apart, none of them over a line of the axes", () => {
    const scene = sceneOf(example);
    const byAxis = tickLabelsByAxis(scene, example);
    const axes = axisLines(scene);
    for (const name of NAMES) {
      expect(crowded(byAxis[name]), name).toEqual([]);
      for (const label of byAxis[name]) {
        const box = boundsOf(label);
        for (const line of axes) {
          // A box well clear of a line: its middle at least half the box's height off the line.
          const [x1, y1, x2, y2] = [num(line, "x1"), num(line, "y1"), num(line, "x2"), num(line, "y2")];
          const [cx, cy] = [(box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2];
          const t = Math.max(0, Math.min(1, ((cx - x1) * (x2 - x1) + (cy - y1) * (y2 - y1)) / ((x2 - x1) ** 2 + (y2 - y1) ** 2)));
          expect(Math.hypot(cx - (x1 + t * (x2 - x1)), cy - (y1 + t * (y2 - y1))), `${name} ${label.text}`).toBeGreaterThan((box.y1 - box.y0) / 2);
        }
      }
    }
  });

  it("draws no two neighbouring default tick labels overlapping, on any of the three axes, over short, negative, zero-excluding and wide ranges", () => {
    const ranges: Range[] = [
      [0, 5],
      [0, 1],
      [0, 10],
      [-10, 10],
      [0, 100],
      [-100, 100],
      [2, 9],
      [-10, -2],
      [0.001, 0.002],
      [-1 / 3, 2 / 3],
      [-0.5, 0.25],
      [1e8, 1e9],
      [-666666666.6666666, 1e9],
      [-1e9, 1e9],
    ];
    for (const varied of ranges) {
      for (const other of [[0, 5], [-5, 5], [-1e9, 1e9]] as const) {
        for (const name of NAMES) {
          const range = (axis: Name) => (axis === name ? varied : other);
          const description = graph(range("x"), range("y"), range("z"));
          const byAxis = tickLabelsByAxis(sceneOf(description), description);
          for (const axis of NAMES) expect(crowded(byAxis[axis]), `${axis} of ${JSON.stringify(description)}`).toEqual([]);
        }
      }
    }
  });

  it("draws no text over another, across axes too, leaving out a tick label with no clear place (code review CR-001)", () => {
    // Ranges with and without zero, negative-only, narrow and wide, on every axis in turn: 512 graphs.
    const ranges: Range[] = [[0, 5], [-5, 5], [-5, 0], [-3, 8], [2, 7], [-8, -2], [0, 100], [-1e9, 1e9]];
    let labels = 0;
    let ticks = 0;
    for (const x of ranges) {
      for (const y of ranges) {
        for (const z of ranges) {
          const description = graph(x, y, z, { points: [{ x: x[0], y: y[1], z: z[1], label: "P" }] });
          const scene = sceneOf(description);
          const drawn = texts(scene);
          const boxes = drawn.map(boundsOf);
          const overlaps = boxes.flatMap((a, i) => boxes.slice(i + 1).flatMap((b, j) => (overlap(a, b) ? [`${drawn[i]!.text} / ${drawn[i + 1 + j]!.text}`] : [])));
          expect(overlaps, JSON.stringify([x, y, z])).toEqual([]);
          // Every axis keeps its name.
          expect(labelTexts(scene).map((node) => node.text)).toEqual(expect.arrayContaining(["x", "y", "z"]));
          labels += tickTexts(scene).length;
          // Every tick, a value repeated where the axes meet counted once, as it is labeled once.
          const all = ticksOf(description);
          const { meet } = projectionOf(scene, description);
          const atMeeting = new Set<string>();
          for (const name of NAMES) {
            for (const tick of all[name].ticks) {
              const text = axisTickLabel(tick, all[name].spacing);
              if (tick === meet[name] && atMeeting.has(text)) continue;
              if (tick === meet[name]) atMeeting.add(text);
              ticks++;
            }
          }
        }
      }
    }
    // Few labels are left out: measured 2026-10-28, 97.4% of ticks in this sweep are labeled.
    expect(labels / ticks).toBeGreaterThan(0.95);
  });

  it("ticks each axis at the default describe states, fitted to the length every axis is drawn", () => {
    for (const [range, spacing] of [
      [[0, 5], 1],
      [[0, 10], 2],
      [[-10, 10], 5],
      [[0, 100], 20],
      [[0, 1], 0.2],
    ] as Array<[Range, number]>) {
      const description = graph(range, range, range);
      const ticks = ticksOf(description);
      for (const name of NAMES) expect(ticks[name].spacing, `${name} ${range}`).toBe(spacing);
      expect(sceneOf(description).textAlternative).toContain(`z from ${range[0]} to ${range[1]} ticked every ${spacing},`);
    }
  });
});

describe("guide lines (NLC-REQ-038)", () => {
  it("draws, with guideLines true, dashed lines from each point to the x,y plane and on to the x-axis and the y-axis", () => {
    const description = graph([0, 5], [0, 5], [0, 5], { guideLines: true, points: [{ x: 1, y: 2, z: 3 }] });
    const scene = sceneOf(description);
    const { pageOf } = projectionOf(scene, description);
    const guides = guideLines(scene);
    expect(guides).toHaveLength(3);
    for (const guide of guides) {
      expect(attr(guide, "stroke-dasharray")).toBe(GUIDE_DASH);
      expect(attr(guide, "stroke")).toBe(defaultStyle.colors.grid);
      expect(num(guide, "stroke-width")).toBe(defaultStyle.lineWidths.grid);
    }
    const ends = guides.map((guide) => [[num(guide, "x1"), num(guide, "y1")], [num(guide, "x2"), num(guide, "y2")]] as const);
    const foot = pageOf(1, 2, 0);
    expect(near(ends[0]![0], pageOf(1, 2, 3)) && near(ends[0]![1], foot)).toBe(true);
    expect(near(ends[1]![0], foot) && near(ends[1]![1], pageOf(1, 0, 0))).toBe(true);
    expect(near(ends[2]![0], foot) && near(ends[2]![1], pageOf(0, 2, 0))).toBe(true);
    // Under the axes and the markers.
    const index = (node: SceneNode) => scene.nodes.indexOf(node);
    expect(index(guides.at(-1)!)).toBeLessThan(index(axisLines(scene)[0]!));
  });

  it("goes to the plane where the z-axis meets the others, and leaves out a piece of no length", () => {
    // z from 2 to 8 meets the others at z = 2; a point on the plane at x = 0 has only the line to the x-axis.
    const description = graph([0, 5], [0, 5], [2, 8], { guideLines: true, points: [{ x: 0, y: 3, z: 2 }, { x: 4, y: 0, z: 5 }] });
    const scene = sceneOf(description);
    const { pageOf } = projectionOf(scene, description);
    const guides = guideLines(scene);
    expect(guides).toHaveLength(3);
    const ends = guides.map((guide) => [[num(guide, "x1"), num(guide, "y1")], [num(guide, "x2"), num(guide, "y2")]] as const);
    expect(near(ends[0]![0], pageOf(0, 3, 2)) && near(ends[0]![1], pageOf(0, 0, 2))).toBe(true);
    expect(near(ends[1]![0], pageOf(4, 0, 5)) && near(ends[1]![1], pageOf(4, 0, 2))).toBe(true);
    expect(near(ends[2]![0], pageOf(4, 0, 2)) && near(ends[2]![1], pageOf(0, 0, 2))).toBe(true);
    // A point where the axes meet has none.
    expect(guideLines(sceneOf(graph([0, 5], [0, 5], [0, 5], { guideLines: true, points: [{ x: 0, y: 0, z: 0 }] })))).toEqual([]);
  });

  it("draws none by default or when guideLines is false", () => {
    const points = [{ x: 1, y: 2, z: 3 }];
    expect(guideLines(sceneOf(graph([0, 5], [0, 5], [0, 5], { points })))).toEqual([]);
    expect(guideLines(sceneOf(graph([0, 5], [0, 5], [0, 5], { points, guideLines: false })))).toEqual([]);
    expect(lines(sceneOf(graph([0, 5], [0, 5], [0, 5], { points }))).filter((node) => attr(node, "stroke") === defaultStyle.colors.grid)).toEqual([]);
  });
});

describe("axis labels, point labels, title and text alternative (NLC-REQ-036, NLC-REQ-037, NLC-REQ-012)", () => {
  it("labels each axis with its name by default, beyond its max end, z above its top", () => {
    const scene = sceneOf(graph([0, 5], [0, 5], [0, 5]));
    const [xLine, yLine, zLine] = axisLines(scene);
    const label = (text: string) => boundsOf(labelTexts(scene).find((node) => node.text === text)!);
    expect(labelTexts(scene).map((node) => node.text).sort()).toEqual(["x", "y", "z"]);
    expect(label("x").x1).toBeLessThan(num(xLine!, "x2"));
    expect(label("y").x0).toBeGreaterThan(num(yLine!, "x2"));
    expect(label("z").y1).toBeLessThan(num(zLine!, "y2"));
  });

  it("labels each axis with its supplied label instead, and a blank one with its name", () => {
    const scene = sceneOf(example);
    expect(labelTexts(scene).filter((node) => ["Length", "Width", "Height"].includes(node.text))).toHaveLength(3);
    expect(labelTexts(scene).filter((node) => ["x", "y", "z"].includes(node.text))).toEqual([]);
    expect(labelTexts(sceneOf(graph([0, 5], [0, 5], [0, 5], { zAxisLabel: "  " }))).map((node) => node.text)).toContain("z");
  });

  it("labels each point beside its marker, clear of the other labels, in the text color", () => {
    const scene = sceneOf(example);
    const { pageOf } = projectionOf(scene, example);
    for (const { x, y, z, label } of example.points as Array<{ x: number; y: number; z: number; label: string }>) {
      const node = labelTexts(scene).find((text) => text.text === label)!;
      const box = boundsOf(node);
      const [px, py] = pageOf(x, y, z);
      expect(Math.hypot((box.x0 + box.x1) / 2 - px, (box.y0 + box.y1) / 2 - py), label).toBeLessThan(30);
      expect(attr(node, "fill")).toBe(defaultStyle.colors.text);
    }
    const boxes = texts(scene).map(boundsOf);
    for (const [i, a] of boxes.entries()) for (const b of boxes.slice(i + 1)) expect(overlap(a, b), `${nameOf(a)} / ${nameOf(b)}`).toBe(false);
  });

  it("cuts long axis and point labels to two lines and the title to three", () => {
    const long = wordsOf(CALLER_TEXT_LIMIT);
    const scene = sceneOf(graph([0, 5], [0, 5], [0, 5], { title: long, xAxisLabel: long, yAxisLabel: long, zAxisLabel: long, points: [{ x: 1, y: 1, z: 1, label: long }] }));
    expect(texts(scene).filter((node) => num(node, "font-size") === defaultStyle.fontSizes.title)).toHaveLength(3);
    expect(labelTexts(scene)).toHaveLength(8);
  });

  it("states the definition's text alternative as its own", () => {
    const result = validate(example);
    if (!result.valid) throw new Error(JSON.stringify(result.issues));
    expect(sceneOf(example).textAlternative).toBe(xyzGraphDefinition.describe(result.description as XyzGraph, result.provenance));
    expect(sceneOf(example).textAlternative).toContain("three-dimensional coordinate graph");
  });
});

describe("the drawing stays inside its bounds (NLC-NFR-001; GSV-REQ-052)", () => {
  const inside = (scene: Scene) => {
    for (const b of scene.nodes.map(boundsOf)) {
      expect(b.x0 >= -0.02 && b.x1 <= SCENE_WIDTH + 0.02 && b.y0 >= -0.02 && b.y1 <= scene.height + 0.02, nameOf(b)).toBe(true);
    }
    for (const node of texts(scene)) {
      const b = boundsOf(node);
      expect(b.x0 >= SCENE_MARGIN - 0.02 && b.x1 <= SCENE_WIDTH - SCENE_MARGIN + 0.02, nameOf(b)).toBe(true);
    }
  };

  it("keeps every node inside, and every text inside the side margins, at the extremes of range and text", () => {
    const long = wordsOf(CALLER_TEXT_LIMIT);
    const ranges: Array<[Range, Range, Range]> = [
      [[-1e9, 1e9], [-1e9, 1e9], [-1e9, 1e9]],
      [[0.001, 0.002], [-1, 1], [0, 1000]],
      [[-10, -2], [-9, -3], [-8, -1]],
      [[0, 5], [-1e9, 0], [1e8, 1e9]],
      [[-1 / 3, 2 / 3], [-666666666.6666666, 1e9], [0, 1]],
    ];
    for (const [x, y, z] of ranges) {
      for (const text of [undefined, long, ...Object.values(oneClusterTexts(CALLER_TEXT_LIMIT))]) {
        const extra = text === undefined ? {} : { title: text, xAxisLabel: text, yAxisLabel: text, zAxisLabel: text };
        const corners = [x[0], x[1]].flatMap((px) => [y[0], y[1]].map((py) => ({ x: px, y: py, z: z[1], label: text })));
        inside(sceneOf(graph(x, y, z, { ...extra, guideLines: true, points: [...corners, { x: x[1], y: y[1], z: z[0], label: text }] })));
      }
    }
  });
});
