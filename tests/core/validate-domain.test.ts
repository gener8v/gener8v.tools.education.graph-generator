import { describe, expect, it } from "vitest";
import { ALWAYS_RUNS, type GraphType, type GraphTypeDefinition } from "../../src/core/definitions/types";
import { createIssue, pointer } from "../../src/core/issues";
import type { Issue, ValidationResult } from "../../src/core/result";
import { validateWith } from "../../src/core/validate/index";
import { touchesFailed } from "../../src/core/validate/state";
import { DESCRIPTION_VALUE_LIMIT } from "../../src/core/validate/structure";
import { xyGraph } from "../fixtures/definitions/xy-graph";
import { fixtureRegistry } from "../fixtures/definitions/index";
import { circle } from "../fixtures/definitions/circle";

const check = (input: unknown, registry = fixtureRegistry) => validateWith(input, registry);

function issuesOf(result: ValidationResult<unknown>): Issue[] {
  if (result.valid) throw new Error(`expected an invalid result, got ${JSON.stringify(result)}`);
  return result.issues;
}

const codesAndPaths = (input: unknown, registry = fixtureRegistry) =>
  issuesOf(check(input, registry)).map((issue) => `${issue.code} ${issue.path}`);

const AXES = { xAxis: { min: -5, max: 5 }, yAxis: { min: -5, max: 5 } };

describe("which failures a check's input paths touch", () => {
  const failed = new Set(["/xAxis/max", "/points/1/y"]);
  it.each([
    ["xAxis/max", true], // the failure itself
    ["xAxis", true], // a failure inside
    ["xAxis/max/deep", true], // inside a failure
    ["xAxis/min", false],
    ["points/*/y", true], // * matches the failed position
    ["points/*/x", false],
    ["points/1/y", true],
    ["points/0/y", false],
    ["yAxis", false],
  ])("%s touches a failure: %s", (pattern, touches) => {
    expect(touchesFailed(pattern, failed)).toBe(touches);
  });

  it("treats a failure of the whole description as touching everything", () => {
    expect(touchesFailed("radius", new Set([""]))).toBe(true);
  });

  it("does not match a list wildcard to a property name", () => {
    expect(touchesFailed("points/*/x", new Set(["/points/extra/x"]))).toBe(false);
  });
});

describe("domain checks (AD-004 stage 4)", () => {
  it("reports what the type's checks find", () => {
    const [issue] = issuesOf(check({ type: "xy-graph", ...AXES, points: [{ x: 1, y: 2 }, { x: 9, y: 0 }] }));
    expect(issue).toEqual({
      code: "outside_axis_range",
      path: "/points/1/x",
      message: "points[1].x (9) is outside the axis range, from -5 to 5; move it inside the range or widen the axis.",
      range: { min: -5, max: 5 },
    });
  });

  it("merges domain issues with structure issues into one list (GSV-REQ-017)", () => {
    expect(codesAndPaths({ type: "xy-graph", ...AXES, showGrid: "yes", points: [{ x: 9, y: 9 }] })).toEqual([
      "wrong_kind /showGrid",
      "outside_axis_range /points/0/x",
      "outside_axis_range /points/0/y",
    ]);
  });

  it("skips a check whose input failed an earlier stage, so no issue follows from another", () => {
    // A reversed axis: the range itself is reported, not every point against it.
    expect(codesAndPaths({ type: "xy-graph", xAxis: { min: 5, max: -5 }, yAxis: AXES.yAxis, points: [{ x: 9, y: 0 }] })).toEqual([
      "out_of_range /xAxis/max",
    ]);
    // One bad point: its own issue only.
    expect(codesAndPaths({ type: "xy-graph", ...AXES, points: [{ x: 9, y: 0 }, { x: 1, y: Number.NaN }] })).toEqual([
      "wrong_kind /points/1/y",
    ]);
  });

  it("still runs a check when the failure is somewhere it does not read (code review CR-003)", () => {
    const outside = { x: 9, y: 0 };
    expect(codesAndPaths({ type: "xy-graph", xAxis: { min: -5, max: 5, sparkle: 1 }, yAxis: AXES.yAxis, points: [outside] })).toEqual([
      "unknown_property /xAxis/sparkle",
      "outside_axis_range /points/0/x",
    ]);
    expect(codesAndPaths({ type: "xy-graph", xAxis: { min: -5, max: 5, tickSpacing: -1 }, yAxis: AXES.yAxis, points: [outside] })).toEqual([
      "out_of_range /xAxis/tickSpacing",
      "outside_axis_range /points/0/x",
    ]);
    expect(codesAndPaths({ type: "xy-graph", ...AXES, points: [outside, { x: 1, y: 1, label: 5 }] })).toEqual([
      "wrong_kind /points/1/label",
      "outside_axis_range /points/0/x",
    ]);
  });

  it("skips a check that reads a required value that is missing (quality review QR-002, security review SEC-003)", () => {
    const strict: GraphTypeDefinition = {
      ...xyGraph,
      checks: [
        {
          name: "reads every segment start",
          inputs: ["segments/*/from/x"],
          // Written to the contract: it dereferences a required nested value.
          check: (description) =>
            (description["segments"] as Array<{ from: { x: number } }>).flatMap((segment, index) =>
              segment.from.x > 100 ? [createIssue("degenerate_segment", pointer("segments", index), { term: `segments[${index}]` })] : [],
            ),
        },
      ],
    };
    const registry: Partial<Record<GraphType, GraphTypeDefinition>> = { "xy-graph": strict };
    expect(codesAndPaths({ type: "xy-graph", ...AXES, showGrid: "yes", segments: [{ to: { x: 1, y: 1 } }] }, registry)).toEqual([
      "wrong_kind /showGrid",
      "missing_property /segments/0/from",
    ]);
    expect(codesAndPaths({ type: "xy-graph", xAxis: { min: -5 }, yAxis: AXES.yAxis, points: [{ x: 9, y: 0 }] })).toEqual([
      "missing_property /xAxis/max",
    ]);
  });

  it("hands checks a frozen description, so a check cannot change the result (security review SEC-004)", () => {
    const sorting: GraphTypeDefinition = {
      ...xyGraph,
      checks: [
        {
          name: "sorts points in place",
          inputs: ["points/*/x"],
          check: (description) => {
            (description["points"] as Array<{ x: number }>).sort((a, b) => a.x - b.x);
            return [];
          },
        },
      ],
    };
    const result = check({ type: "xy-graph", ...AXES, points: [{ x: 2, y: 0 }, { x: 1, y: 0 }] }, { "xy-graph": sorting });
    expect(issuesOf(result).map((issue) => issue.code)).toEqual(["internal_error"]);
    const valid = check({ type: "xy-graph", ...AXES, points: [{ x: 2, y: 0 }] });
    if (!valid.valid) throw new Error("expected valid");
    expect(Object.isFrozen(valid.description)).toBe(true);
  });

  it("treats an issue a check built by hand as a package defect (security review SEC-004)", () => {
    const handmade = (issue: unknown): GraphTypeDefinition => ({
      ...xyGraph,
      checks: [{ name: "hand-built issue", inputs: ["points/*/x"], check: () => [issue as Issue] }],
    });
    for (const issue of [
      { code: "not_a_code", path: "/points", message: "Bad." },
      { code: "degenerate_segment", path: "/points", message: "x".repeat(5_000) },
      { code: "degenerate_segment", path: 3, message: "Bad." },
    ]) {
      const result = check({ type: "xy-graph", ...AXES, points: [{ x: 1, y: 1 }] }, { "xy-graph": handmade(issue) });
      expect(issuesOf(result).map((found) => found.code)).toEqual(["internal_error"]);
    }
  });

  it("runs a check with no inputs (ALWAYS_RUNS) after another value failed, handing it failed elements as null (DGP TICKET-005 quality review QR-004)", () => {
    const seen: unknown[] = [];
    const always: GraphTypeDefinition = {
      ...xyGraph,
      checks: [
        {
          name: "always runs",
          inputs: ALWAYS_RUNS,
          check: (description) => {
            seen.push(description["points"]);
            return [];
          },
        },
      ],
    };
    expect(ALWAYS_RUNS).toEqual([]);
    expect(Object.isFrozen(ALWAYS_RUNS)).toBe(true);
    expect(codesAndPaths({ type: "xy-graph", ...AXES, points: [{ x: 1, y: 1 }, 3, { x: 1, y: Number.NaN }] }, { "xy-graph": always })).toEqual([
      "wrong_kind /points/1",
      "wrong_kind /points/2/y",
    ]);
    // A failed list element stays as null, keeping the length; a failed property is left out.
    expect(seen).toEqual([[{ x: 1, y: 1 }, null, { x: 1 }]]);
    // A missing list is absent, not an error: the check runs and must guard itself.
    seen.length = 0;
    expect(check({ type: "xy-graph", ...AXES }, { "xy-graph": always }).valid).toBe(true);
    expect(seen).toEqual([undefined]);
  });

  it("skips a check whose input is absent", () => {
    expect(check({ type: "xy-graph", ...AXES }).valid).toBe(true);
  });

  it("skips a check whose input contradicted another value", () => {
    const flagged: GraphTypeDefinition = {
      ...(circle as GraphTypeDefinition),
      checks: [
        {
          name: "flags every diameter",
          inputs: ["diameter"],
          check: () => [createIssue("degenerate_segment", pointer("diameter"), { term: "diameter" })],
        },
      ],
    };
    const registry: Partial<Record<GraphType, GraphTypeDefinition>> = { circle: flagged };
    expect(codesAndPaths({ type: "circle", radius: 5, diameter: 12 }, registry)).toEqual(["contradiction /diameter"]);
    // A derived diameter passed, so the check runs on it.
    expect(codesAndPaths({ type: "circle", radius: 5 }, registry)).toEqual(["degenerate_segment /diameter"]);
  });

  it("runs no later stage on a description over the value limit", () => {
    const description: Record<string, unknown> = { type: "xy-graph", ...AXES, points: [{ x: 9, y: 9 }] };
    for (let i = 0; i < DESCRIPTION_VALUE_LIMIT; i++) description[`junk${i}`] = i;
    expect(codesAndPaths(description)).toEqual(["too_large "]);
  });
});
