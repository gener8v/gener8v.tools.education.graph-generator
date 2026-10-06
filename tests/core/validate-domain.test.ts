import { describe, expect, it } from "vitest";
import type { GraphType, GraphTypeDefinition } from "../../src/core/definitions/types";
import { createIssue, pointer } from "../../src/core/issues";
import type { Issue, ValidationResult } from "../../src/core/result";
import { validateWith } from "../../src/core/validate/index";
import { DESCRIPTION_VALUE_LIMIT } from "../../src/core/validate/structure";
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
