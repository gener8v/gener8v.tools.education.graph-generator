import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { describe as describeGraph, validate } from "../../src/core/index";
import { definitions } from "../../src/core/definitions/index";
import { POINTS_DESCRIPTION, sharedProperties } from "../../src/core/definitions/shared";
import { XYZ_POINT_LIMIT, type XyzGraph, xyzGraph, xyzRooms } from "../../src/core/definitions/xyz-graph";
import { cleanText, findUnsafeTextChar, quoteText } from "../../src/core/format";
import type { Issue, ValidationResult } from "../../src/core/result";
import { BENIGN_TEXT, HOSTILE_TEXT, SMUGGLED_TEXT } from "../fixtures/plain-text";

const issuesOf = (result: ValidationResult<unknown>): Issue[] => (result.valid ? [] : result.issues);
const codesAndPaths = (description: unknown) => issuesOf(validate(description)).map((issue) => `${issue.code} ${issue.path}`);
const axis = (min: number, max: number, extra: object = {}) => ({ min, max, ...extra });
const graph = (extra: object = {}) => ({ type: "xyz-graph", xAxis: axis(0, 5), yAxis: axis(0, 5), zAxis: axis(0, 5), ...extra });
const example: unknown = JSON.parse(readFileSync("examples/xyz-graph.json", "utf8"));
const normalized = (description: unknown): XyzGraph => {
  const result = validate(description);
  if (!result.valid) throw new Error(JSON.stringify(result.issues));
  return result.description as XyzGraph;
};

describe("the x,y,z graph's terms (NLC-REQ-001, NLC-REQ-034, NLC-REQ-035, NLC-REQ-037..039)", () => {
  it("is registered, and validates the documented example", () => {
    expect(definitions["xyz-graph"]).toBe(xyzGraph);
    expect(issuesOf(validate(example))).toEqual([]);
  });

  it("requires all three axes, and refuses a reversed range on any of them", () => {
    expect(codesAndPaths({ type: "xyz-graph", xAxis: axis(0, 1), yAxis: axis(0, 1) })).toEqual(["missing_property /zAxis"]);
    expect(codesAndPaths(graph({ zAxis: axis(5, 1) }))).toEqual(["out_of_range /zAxis/max"]);
    expect(codesAndPaths(graph({ yAxis: axis(1, 1) }))).toEqual(["out_of_range /yAxis/max"]);
  });

  it("takes a tick spacing per axis, independently, and reports a bad one on its own axis (NLC-REQ-039)", () => {
    const given = normalized(graph({ xAxis: axis(0, 10, { tickSpacing: 1 }), yAxis: axis(0, 100, { tickSpacing: 25 }), zAxis: axis(-1, 1, { tickSpacing: 0.5 }) }));
    expect([given.xAxis.tickSpacing, given.yAxis.tickSpacing, given.zAxis.tickSpacing]).toEqual([1, 25, 0.5]);
    expect(codesAndPaths(graph({ zAxis: axis(0, 10, { tickSpacing: 0 }) }))).toEqual(["tick_spacing_invalid /zAxis/tickSpacing"]);
    expect(codesAndPaths(graph({ zAxis: axis(0, 10, { tickSpacing: 0.01 }) }))).toEqual(["too_many_ticks /zAxis/tickSpacing"]);
    expect(codesAndPaths(graph({ xAxis: axis(0, 10, { tickSpacing: -1 }), yAxis: axis(0, 10, { tickSpacing: 0.001 }) }))).toEqual([
      "tick_spacing_invalid /xAxis/tickSpacing",
      "too_many_ticks /yAxis/tickSpacing",
    ]);
  });

  it("leaves the guide lines off unless guideLines is true, and says so in its definition (NLC-REQ-038)", () => {
    expect(normalized(graph()).guideLines).toBeUndefined();
    expect(xyzGraph.properties["guideLines"]!.description).toContain("off unless true");
    expect(codesAndPaths(graph({ guideLines: "yes" }))).toEqual(["wrong_kind /guideLines"]);
  });

  it("takes three axis labels and a title, and a label and color on each point, never at the top level", () => {
    expect(codesAndPaths(graph({ title: "T", xAxisLabel: "x", yAxisLabel: "y", zAxisLabel: "z", points: [{ x: 1, y: 1, z: 1, label: "A", color: "red" }] }))).toEqual([]);
    expect(issuesOf(validate(graph({ color: "red" })))[0]!.message).toBe("color does not apply for an xyz-graph as a whole; give it on each point instead.");
    expect(codesAndPaths(graph({ textAlternative: "A graph." }))).toEqual(["unknown_property /textAlternative"]);
    expect(codesAndPaths(graph({ segments: [] }))).toEqual(["unknown_property /segments"]);
    expect(codesAndPaths(graph({ points: [{ x: 1, y: 1 }] }))).toEqual(["missing_property /points/0/z"]);
  });

  it("leaves the axis labels absent when none is given: the drawing names each axis by default (NLC-REQ-036)", () => {
    const { xAxisLabel, yAxisLabel, zAxisLabel } = normalized(graph());
    expect([xAxisLabel, yAxisLabel, zAxisLabel]).toEqual([undefined, undefined, undefined]);
    expect(describeGraph(graph())).not.toContain("labeled");
  });

  it("holds at most the documented number of points, stated in the type's description", () => {
    const points = (length: number) => Array.from({ length }, () => ({ x: 0, y: 0, z: 0 }));
    expect(codesAndPaths(graph({ points: points(XYZ_POINT_LIMIT) }))).toEqual([]);
    expect(codesAndPaths(graph({ points: points(XYZ_POINT_LIMIT + 1) }))).toEqual(["too_large /points"]);
    expect(xyzGraph.description).toContain(`Points (at most ${XYZ_POINT_LIMIT})`);
  });

  it("shares one definition of points, x and y with the other coordinate graphs, and the shared label and color (GSV-REQ-015)", () => {
    const points = xyzGraph.properties["points"]!;
    expect(points.description).toBe(POINTS_DESCRIPTION);
    if (points.kind !== "array" || points.items.kind !== "object") throw new Error("points is not a list of objects");
    const xyPoints = definitions["xy-graph"]!.properties["points"]!;
    if (xyPoints.kind !== "array" || xyPoints.items.kind !== "object") throw new Error("points is not a list of objects");
    expect(points.items.properties["x"]).toEqual(xyPoints.items.properties["x"]);
    expect(points.items.properties["y"]).toEqual(xyPoints.items.properties["y"]);
    expect(points.items.properties["label"]).toBe(sharedProperties.label);
    expect(points.items.properties["color"]).toBe(sharedProperties.color);
  });

  it("describes its projection as isometric, in the definition and the published schema (NLC-REQ-035)", () => {
    expect(xyzGraph.description).toContain("isometric");
    expect(xyzGraph.description).toContain("z straight up the page, x toward the lower left and y toward the lower right");
    expect(readFileSync("src/generated/schema.json", "utf8")).toContain(JSON.stringify(xyzGraph.description));
  });

  it("matches the invalid example to its one issue", () => {
    const of = (file: string) => codesAndPaths(JSON.parse(readFileSync(`examples/invalid/${file}`, "utf8")));
    expect(of("xyz-graph-outside-range.json")).toEqual(["outside_axis_range /points/0/z"]);
  });
});

describe("points outside the ranges (NLC-REQ-010)", () => {
  it("reports a point coordinate outside its axis at its own path, naming the range", () => {
    expect(issuesOf(validate(graph({ zAxis: axis(-2, 2), points: [{ x: 3, y: 1, z: 2.5 }] })))).toEqual([
      {
        code: "outside_axis_range",
        path: "/points/0/z",
        message: "points[0].z (2.5) is outside the axis range, from -2 to 2; move it inside the range or widen the axis.",
        range: { min: -2, max: 2 },
      },
    ]);
  });

  it("reports each coordinate against its own axis, every one off its range", () => {
    const description = { type: "xyz-graph", xAxis: axis(0, 5), yAxis: axis(100, 200), zAxis: axis(-10, -5), points: [{ x: 150, y: 3, z: 0 }, { x: 2, y: 150, z: -7 }] };
    expect(codesAndPaths(description)).toEqual(["outside_axis_range /points/0/x", "outside_axis_range /points/0/y", "outside_axis_range /points/0/z"]);
  });

  it("accepts points exactly on a range's ends, as written", () => {
    expect(codesAndPaths(graph({ points: [{ x: 0, y: 5, z: 0 }, { x: 5, y: 0, z: 5 }] }))).toEqual([]);
    expect(codesAndPaths(graph({ zAxis: axis(0.1, 0.3), points: [{ x: 0, y: 0, z: 0.3 }, { x: 0, y: 0, z: 0.1 }] }))).toEqual([]);
  });

  it("does not check coordinates against a range the axis checks refuse", () => {
    expect(codesAndPaths(graph({ zAxis: axis(5, 1), points: [{ x: 3, y: 0, z: 9 }] }))).toEqual(["out_of_range /zAxis/max"]);
  });
});

describe("a default tick spacing the drawn axis has room for (NLC-REQ-005, NLC-REQ-039; NLC TICKET-009)", () => {
  it("fits each axis's default to the length every axis is drawn, and states it", () => {
    const cases: Array<[[number, number], number]> = [
      [[0, 5], 1],
      [[0, 10], 2],
      [[-10, 10], 5],
      [[0, 100], 20],
      [[0, 1], 0.2],
    ];
    for (const [[min, max], spacing] of cases) {
      const stated = describeGraph(graph({ xAxis: axis(min, max), yAxis: axis(min, max), zAxis: axis(min, max) }));
      for (const name of ["x", "y", "z"]) expect(stated, `${name} ${min}..${max}`).toContain(`${name} from ${min} to ${max} ticked every ${spacing}`);
    }
  });

  it("gives an axis with hidden tick labels no room, so it keeps the range's own spacing, and states a supplied spacing as written", () => {
    const hidden = normalized(graph({ zAxis: axis(0, 100, { showTickLabels: false }) }));
    expect(xyzRooms(hidden).z).toBeUndefined();
    // Shown, 0..100 is ticked every 20 to fit; hidden, every 10, the range's own.
    expect(describeGraph(graph({ zAxis: axis(0, 100) }))).toContain("z from 0 to 100 ticked every 20");
    expect(describeGraph(graph({ zAxis: axis(0, 100, { showTickLabels: false }) }))).toContain("z from 0 to 100 ticked every 10");
    expect(describeGraph(graph({ xAxis: axis(0, 1, { tickSpacing: 0.05 }) }))).toContain("x from 0 to 1 ticked every 0.05");
  });
});

describe("the text alternative (NLC-REQ-012, NLC-REQ-035, NLC-REQ-038)", () => {
  it("states the type, title, the three ranges and spacings, the projection, guide lines, axis labels and every point with its label", () => {
    expect(describeGraph(example)).toBe(
      "A three-dimensional coordinate graph titled “Corners of a box”, x from 0 to 5 ticked every 1, y from 0 to 5 ticked every 1, z from 0 to 5 ticked every 1, in isometric projection, with guide lines from each point to the x,y plane. The x-axis is labeled “Length”. The y-axis is labeled “Width”. The z-axis is labeled “Height”. 3 points are plotted: (1, 2, 3) labeled “A”, (4, 1, 2) labeled “B” and (2, 5, 1) labeled “C”.",
    );
  });

  it("states an empty graph, and says when the axes' spans differ that one unit is drawn differently on each", () => {
    expect(describeGraph(graph())).toBe(
      "A three-dimensional coordinate graph, x from 0 to 5 ticked every 1, y from 0 to 5 ticked every 1, z from 0 to 5 ticked every 1, in isometric projection. No points are plotted.",
    );
    expect(describeGraph(graph({ zAxis: axis(0, 10) }))).toContain("Each axis is drawn the same length, so one unit is not drawn the same length on every axis.");
    expect(describeGraph(graph({ xAxis: axis(-5, 0), yAxis: axis(10, 15), zAxis: axis(2.5, 7.5) }))).not.toContain("unit");
  });

  it("states values as written, and a point's noise as the value meant", () => {
    expect(describeGraph(graph({ xAxis: axis(-0.125, 1.875, { tickSpacing: 0.125 }), points: [{ x: 0.375, y: 0.1 + 0.2, z: Math.sin(Math.PI) }] }))).toContain(
      "x from -0.125 to 1.875 ticked every 0.125,",
    );
    expect(describeGraph(graph({ points: [{ x: 0.1 + 0.2, y: 5e-324, z: Math.sin(Math.PI) }] }))).toContain("1 point is plotted: (0.3, 0, 0).");
  });

  it("says when an axis's tick labels are hidden, and leaves out a blank title, axis label and point label", () => {
    expect(describeGraph(graph({ yAxis: axis(0, 5, { showTickLabels: false }) }))).toContain("The y-axis ticks are not labeled.");
    expect(describeGraph(graph({ title: " ", zAxisLabel: "", points: [{ x: 1, y: 1, z: 1, label: "  " }] }))).toBe(
      "A three-dimensional coordinate graph, x from 0 to 5 ticked every 1, y from 0 to 5 ticked every 1, z from 0 to 5 ticked every 1, in isometric projection. 1 point is plotted: (1, 1, 1).",
    );
  });

  it("quotes every caller text, or the description is refused for an unsafe character; nothing unsafe reaches the text", () => {
    for (const text of [...BENIGN_TEXT, ...HOSTILE_TEXT, SMUGGLED_TEXT]) {
      const description = graph({ title: text, xAxisLabel: text, yAxisLabel: text, zAxisLabel: text, points: [{ x: 1, y: 1, z: 1, label: text }] });
      const result = validate(description);
      if (!result.valid) {
        expect(findUnsafeTextChar(text), JSON.stringify(text)).not.toBe(-1);
        continue;
      }
      const stated = xyzGraph.describe(result.description as XyzGraph, result.provenance);
      expect(findUnsafeTextChar(stated), JSON.stringify(text)).toBe(-1);
      expect(stated.startsWith("A three-dimensional coordinate graph"), JSON.stringify(text)).toBe(true);
      // The title, the three axis labels and the point label, each quoted.
      expect(stated.split(quoteText(cleanText(text))).length - 1, JSON.stringify(text)).toBe(5);
    }
  });
});
