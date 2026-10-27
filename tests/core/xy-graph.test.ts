import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { describe as describeGraph, validate } from "../../src/core/index";
import { definitions } from "../../src/core/definitions/index";
import { POINTS_DESCRIPTION } from "../../src/core/definitions/shared";
import { PLANE_MAX_RATIO, PLANE_MIN_RATIO, XY_ELEMENT_LIMIT, type XyGraph, planeShape, quadrantCount, xyGraph } from "../../src/core/definitions/xy-graph";
import { cleanText, findUnsafeTextChar, quoteText } from "../../src/core/format";
import type { Issue, ValidationResult } from "../../src/core/result";
import { BENIGN_TEXT, HOSTILE_TEXT, SMUGGLED_TEXT } from "../fixtures/plain-text";

const issuesOf = (result: ValidationResult<unknown>): Issue[] => (result.valid ? [] : result.issues);
const codesAndPaths = (description: unknown) => issuesOf(validate(description)).map((issue) => `${issue.code} ${issue.path}`);
const graph = (extra: object = {}) => ({ type: "xy-graph", xAxis: { min: -10, max: 10 }, yAxis: { min: -10, max: 10 }, ...extra });
const example: unknown = JSON.parse(readFileSync("examples/xy-graph.json", "utf8"));
const normalized = (description: unknown): XyGraph => {
  const result = validate(description);
  if (!result.valid) throw new Error(JSON.stringify(result.issues));
  return result.description as XyGraph;
};

describe("the x,y graph's terms (NLC-REQ-001, NLC-REQ-022, NLC-REQ-026..031)", () => {
  it("is registered, and validates the documented example", () => {
    expect(definitions["xy-graph"]).toBe(xyGraph);
    expect(issuesOf(validate(example))).toEqual([]);
  });

  it("requires both axes, and refuses a reversed range on either", () => {
    expect(codesAndPaths({ type: "xy-graph", xAxis: { min: 0, max: 1 } })).toEqual(["missing_property /yAxis"]);
    expect(codesAndPaths(graph({ yAxis: { min: 5, max: 1 } }))).toEqual(["out_of_range /yAxis/max"]);
  });

  it("takes a tick spacing per axis, independently, and the default rule for each when left out (NLC-REQ-027)", () => {
    const both = normalized(graph({ xAxis: { min: 0, max: 10, tickSpacing: 1 }, yAxis: { min: 0, max: 100, tickSpacing: 25 } }));
    expect([both.xAxis.tickSpacing, both.yAxis.tickSpacing]).toEqual([1, 25]);
    expect(describeGraph(graph({ xAxis: { min: 0, max: 10, tickSpacing: 1 }, yAxis: { min: 0, max: 100, tickSpacing: 25 } }))).toContain(
      "x from 0 to 10 ticked every 1, y from 0 to 100 ticked every 25,",
    );
    // -10..10 ticks every 2 by default; 0..100 every 10.
    expect(describeGraph(graph({ yAxis: { min: 0, max: 100 } }))).toContain("x from -10 to 10 ticked every 2, y from 0 to 100 ticked every 10,");
    expect(describeGraph(graph({ xAxis: { min: -10, max: 10, tickSpacing: 5 } }))).toContain("x from -10 to 10 ticked every 5, y from -10 to 10 ticked every 2,");
    expect(codesAndPaths(graph({ yAxis: { min: 0, max: 10, tickSpacing: 0 } }))).toEqual(["tick_spacing_invalid /yAxis/tickSpacing"]);
    expect(codesAndPaths(graph({ xAxis: { min: 0, max: 10, tickSpacing: 0.01 } }))).toEqual(["too_many_ticks /xAxis/tickSpacing"]);
  });

  it("leaves the grid off unless showGrid is true, and says so in its definition (NLC-REQ-026)", () => {
    expect(normalized(graph()).showGrid).toBeUndefined();
    expect(xyGraph.properties["showGrid"]!.description).toContain("off unless true");
    expect(codesAndPaths(graph({ grid: true }))).toEqual(["unknown_property /grid"]);
    expect(codesAndPaths(graph({ showGrid: "yes" }))).toEqual(["wrong_kind /showGrid"]);
  });

  it("takes axis labels and a title, and a label and color on each point and segment, never at the top level", () => {
    expect(codesAndPaths(graph({ title: "T", xAxisLabel: "x", yAxisLabel: "y", points: [{ x: 1, y: 1, label: "A", color: "red" }], segments: [{ from: { x: 0, y: 0 }, to: { x: 1, y: 1 }, label: "s", color: "#123456" }] }))).toEqual([]);
    expect(issuesOf(validate(graph({ color: "red" })))[0]!.message).toBe("color does not apply for an xy-graph as a whole; give it on each point or segment instead.");
    expect(codesAndPaths(graph({ textAlternative: "An x,y graph." }))).toEqual(["unknown_property /textAlternative"]);
  });

  it("holds at most the documented number of points and of segments, each stated in the type's description", () => {
    const points = (length: number) => Array.from({ length }, () => ({ x: 0, y: 0 }));
    const segments = (length: number) => Array.from({ length }, () => ({ from: { x: 0, y: 0 }, to: { x: 1, y: 1 } }));
    expect(codesAndPaths(graph({ points: points(XY_ELEMENT_LIMIT) }))).toEqual([]);
    expect(codesAndPaths(graph({ points: points(XY_ELEMENT_LIMIT + 1) }))).toEqual(["too_large /points"]);
    expect(codesAndPaths(graph({ segments: segments(XY_ELEMENT_LIMIT + 1) }))).toEqual(["too_large /segments"]);
    expect(xyGraph.description).toContain(`points (at most ${XY_ELEMENT_LIMIT})`);
    expect(xyGraph.description).toContain(`line segments (at most ${XY_ELEMENT_LIMIT})`);
  });

  it("shares one definition of points with the number line, naming no type's limit (GSV-REQ-015)", () => {
    expect(xyGraph.properties["points"]!.description).toBe(POINTS_DESCRIPTION);
    expect(definitions["number-line"]!.properties["points"]!.description).toBe(POINTS_DESCRIPTION);
    expect(POINTS_DESCRIPTION).not.toMatch(/\d/);
  });

  it("matches each invalid example to its one issue", () => {
    const of = (file: string) => codesAndPaths(JSON.parse(readFileSync(`examples/invalid/${file}`, "utf8")));
    expect(of("xy-graph-outside-range.json")).toEqual(["outside_axis_range /segments/0/to/y"]);
    expect(of("xy-graph-degenerate-segment.json")).toEqual(["degenerate_segment /segments/0"]);
  });
});

describe("points and segment ends outside the ranges (NLC-REQ-010)", () => {
  it("reports a point coordinate outside its axis at its own path, naming the range", () => {
    expect(issuesOf(validate(graph({ points: [{ x: 3, y: 12 }] })))).toEqual([
      {
        code: "outside_axis_range",
        path: "/points/0/y",
        message: "points[0].y (12) is outside the axis range, from -10 to 10; move it inside the range or widen the axis.",
        range: { min: -10, max: 10 },
      },
    ]);
  });

  it("reports each coordinate on its own axis: x against the x range, y against the y range", () => {
    const description = { type: "xy-graph", xAxis: { min: 0, max: 5 }, yAxis: { min: 100, max: 200 }, points: [{ x: 150, y: 3 }, { x: 2, y: 150 }] };
    expect(codesAndPaths(description)).toEqual(["outside_axis_range /points/0/x", "outside_axis_range /points/0/y"]);
  });

  it("reports a segment end at its JSON Pointer, both coordinates of both ends", () => {
    expect(codesAndPaths(graph({ segments: [{ from: { x: 0, y: 0 }, to: { x: 1, y: 11 } }, { from: { x: -11, y: 20 }, to: { x: 0, y: 0 } }] }))).toEqual([
      "outside_axis_range /segments/0/to/y",
      "outside_axis_range /segments/1/from/x",
      "outside_axis_range /segments/1/from/y",
    ]);
    expect(issuesOf(validate(graph({ segments: [{ from: { x: 0, y: 0 }, to: { x: 1, y: 11 } }] })))[0]!.message).toContain("segments[0].to.y (11)");
  });

  it("accepts points and ends exactly on a range's ends, as written", () => {
    expect(codesAndPaths(graph({ points: [{ x: -10, y: 10 }, { x: 10, y: -10 }], segments: [{ from: { x: -10, y: -10 }, to: { x: 10, y: 10 } }] }))).toEqual([]);
    expect(codesAndPaths(graph({ xAxis: { min: 0.1, max: 0.3 }, points: [{ x: 0.3, y: 0 }, { x: 0.1, y: 0 }] }))).toEqual([]);
  });

  it("reports a point and a segment fault each, so a failed point never hides a segment", () => {
    expect(codesAndPaths(graph({ points: [{ x: 50, y: 0 }], segments: [{ from: { x: 0, y: 0 }, to: { x: 0, y: -50 } }] }))).toEqual([
      "outside_axis_range /points/0/x",
      "outside_axis_range /segments/0/to/y",
    ]);
  });

  it("does not check coordinates against a range the axis checks refuse", () => {
    expect(codesAndPaths(graph({ xAxis: { min: 5, max: 1 }, points: [{ x: 3, y: 0 }] }))).toEqual(["out_of_range /xAxis/max"]);
  });
});

describe("degenerate segments (NLC-REQ-033)", () => {
  it("reports a segment whose ends are the same point, once, at the segment", () => {
    expect(issuesOf(validate(graph({ segments: [{ from: { x: 1, y: 2 }, to: { x: 3, y: 2 } }, { from: { x: 1, y: 2 }, to: { x: 1, y: 2 } }] })))).toEqual([
      { code: "degenerate_segment", path: "/segments/1", message: "segments[1] starts and ends at the same point; give it two different points." },
    ]);
  });

  it("accepts ends that share one coordinate only, and reports a degenerate segment off the range for both faults", () => {
    expect(codesAndPaths(graph({ segments: [{ from: { x: 1, y: 2 }, to: { x: 1, y: 5 } }, { from: { x: 0, y: 2 }, to: { x: 1, y: 2 } }] }))).toEqual([]);
    expect(codesAndPaths(graph({ segments: [{ from: { x: 20, y: 2 }, to: { x: 20, y: 2 } }] }))).toEqual([
      "outside_axis_range /segments/0/from/x",
      "outside_axis_range /segments/0/to/x",
      "degenerate_segment /segments/0",
    ]);
  });
});

describe("the plane's shape (NLC-REQ-023, NLC-REQ-032)", () => {
  const axis = (min: number, max: number) => ({ min, max });

  it.each([
    [0, 10, 0, 10, 1],
    [-10, 10, 0, 10, 2],
    [0, 10, -10, 10, 2],
    [-10, 10, -10, 10, 4],
    [-10, 0, -10, 0, 1],
    [2, 9, 3, 7, 1],
  ])("x %d..%d and y %d..%d show %d quadrant(s)", (x0, x1, y0, y1, count) => {
    expect(quadrantCount(axis(x0, x1), axis(y0, y1))).toBe(count);
  });

  it("keeps equal units inside the ratio bounds, and holds the ratio at the nearer bound outside them", () => {
    expect(planeShape(axis(-10, 10), axis(-2, 2))).toEqual({ ratio: 0.2, equalUnits: true });
    expect(planeShape(axis(-1, 1), axis(-3, 3))).toEqual({ ratio: PLANE_MAX_RATIO, equalUnits: true });
    expect(planeShape(axis(0, 1000), axis(0, 1))).toEqual({ ratio: PLANE_MIN_RATIO, equalUnits: false });
    expect(planeShape(axis(0, 1), axis(0, 100))).toEqual({ ratio: PLANE_MAX_RATIO, equalUnits: false });
  });
});

describe("the text alternative (NLC-REQ-012, NLC-REQ-023, NLC-REQ-026, NLC-REQ-031, NLC-REQ-032)", () => {
  it("states the type, title, both ranges and spacings, quadrants, grid, axis labels and every point and segment with its label", () => {
    expect(describeGraph(example)).toBe(
      "A coordinate graph titled “A walk across town”, x from -5 to 5 ticked every 1, y from -5 to 5 ticked every 1, showing all four quadrants, with grid lines. The x-axis is labeled “Blocks east”. The y-axis is labeled “Blocks north”. 2 points are plotted: (1, 2) labeled “Home” and (-3, 4) labeled “School”. 1 segment is drawn: from (1, 2) to (-3, 4) labeled “Route”.",
    );
  });

  it("states one and two quadrants, no grid, and an empty graph", () => {
    expect(describeGraph({ type: "xy-graph", xAxis: { min: 0, max: 10 }, yAxis: { min: 0, max: 10 } })).toBe(
      "A coordinate graph, x from 0 to 10 ticked every 1, y from 0 to 10 ticked every 1, showing one quadrant. No points or segments are drawn.",
    );
    expect(describeGraph(graph({ yAxis: { min: 0, max: 10 } }))).toContain("showing two quadrants.");
  });

  it("states values as written, a supplied spacing as written and a default one rounded", () => {
    expect(describeGraph(graph({ xAxis: { min: -0.125, max: 1.875, tickSpacing: 0.125 }, yAxis: { min: -1.5, max: 0.5 }, points: [{ x: 0.375, y: -1.005 }] }))).toBe(
      "A coordinate graph, x from -0.125 to 1.875 ticked every 0.125, y from -1.5 to 0.5 ticked every 0.2, showing all four quadrants. 1 point is plotted: (0.375, -1.005).",
    );
  });

  it("says when units are not equal, and which way, and when tick labels are hidden", () => {
    expect(describeGraph({ type: "xy-graph", xAxis: { min: 0, max: 1000 }, yAxis: { min: 0, max: 1 } })).toContain("To fit, one y unit is drawn longer than one x unit.");
    expect(describeGraph({ type: "xy-graph", xAxis: { min: 0, max: 1 }, yAxis: { min: 0, max: 100 } })).toContain("To fit, one y unit is drawn shorter than one x unit.");
    expect(describeGraph(graph({ yAxis: { min: -2, max: 2 } }))).not.toContain("unit");
    expect(describeGraph(graph({ yAxis: { min: -10, max: 10, showTickLabels: false } }))).toContain("The y-axis ticks are not labeled.");
  });

  it("leaves out a blank title, axis label and element label", () => {
    expect(describeGraph(graph({ title: " ", xAxisLabel: "", points: [{ x: 1, y: 1, label: "  " }] }))).toBe(
      "A coordinate graph, x from -10 to 10 ticked every 2, y from -10 to 10 ticked every 2, showing all four quadrants. 1 point is plotted: (1, 1).",
    );
  });

  it("quotes every caller text, or the description is refused for an unsafe character; nothing unsafe reaches the text", () => {
    for (const text of [...BENIGN_TEXT, ...HOSTILE_TEXT, SMUGGLED_TEXT]) {
      const description = graph({
        title: text,
        xAxisLabel: text,
        yAxisLabel: text,
        points: [{ x: 1, y: 1, label: text }],
        segments: [{ from: { x: 0, y: 0 }, to: { x: 1, y: 2 }, label: text }],
      });
      const result = validate(description);
      if (!result.valid) {
        expect(findUnsafeTextChar(text), JSON.stringify(text)).not.toBe(-1);
        continue;
      }
      const stated = xyGraph.describe(result.description as XyGraph, result.provenance);
      expect(findUnsafeTextChar(stated), JSON.stringify(text)).toBe(-1);
      expect(stated.startsWith("A coordinate graph"), JSON.stringify(text)).toBe(true);
      // The title, both axis labels, the point label and the segment label, each quoted.
      expect(stated.split(quoteText(cleanText(text))).length - 1, JSON.stringify(text)).toBe(5);
    }
  });
});
