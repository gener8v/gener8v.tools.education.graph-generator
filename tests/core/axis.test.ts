import { describe, expect, it } from "vitest";
import { AXIS_LIMIT, axisChecks, axisDomainChecks, axisProperties, axisProperty } from "../../src/core/definitions/axis";
import { type GraphType, type GraphTypeDefinition, defineProperties } from "../../src/core/definitions/types";
import type { Issue, ValidationResult } from "../../src/core/result";
import { validateWith } from "../../src/core/validate/index";

/** A test-only graph with two axes built from the real axis group and its checks. */
const twoAxes: GraphTypeDefinition = {
  type: "xy-graph",
  title: "Two axes",
  description: "Two axes, for the axis tests.",
  properties: defineProperties({ xAxis: axisProperty("xAxis", "x"), yAxis: axisProperty("yAxis", "y") }),
  derivations: [],
  checks: [...axisDomainChecks("xAxis"), ...axisDomainChecks("yAxis")],
  describe: () => "Two axes.",
};
const registry = Object.freeze(Object.assign(Object.create(null) as Partial<Record<GraphType, GraphTypeDefinition>>, { "xy-graph": twoAxes }));

const check = (xAxis: unknown, yAxis: unknown = { min: 0, max: 10 }) => validateWith({ type: "xy-graph", xAxis, yAxis }, registry);
const issuesOf = (result: ValidationResult<unknown>): Issue[] => (result.valid ? [] : result.issues);
const codesAndPaths = (xAxis: unknown, yAxis?: unknown) => issuesOf(check(xAxis, yAxis)).map((issue) => `${issue.code} ${issue.path}`);

describe("the axis property group (NLC-REQ-002, NLC-REQ-006)", () => {
  it("is defined once and reused: every axis holds the same terms", () => {
    const x = axisProperty("xAxis", "x");
    const y = axisProperty("yAxis", "y");
    expect(x.kind === "object" && y.kind === "object" && x.properties === axisProperties && y.properties === axisProperties).toBe(true);
    expect(Object.keys(axisProperties)).toEqual(["min", "max", "tickSpacing", "showTickLabels"]);
    expect(x.kind === "object" && x.ordered).toEqual([["min", "max"]]);
    expect(axisProperties["showTickLabels"]?.required).toBe(false);
  });

  it.each([
    [{ max: 10 }, "missing_property /xAxis/min"],
    [{ min: 0 }, "missing_property /xAxis/max"],
  ])("reports a missing end at the axis's own path: %j", (xAxis, expected) => {
    expect(codesAndPaths(xAxis)).toEqual([expected]);
  });

  it("names the axis in a missing end on the second axis", () => {
    expect(codesAndPaths({ min: 0, max: 1 }, { min: 0 })).toEqual(["missing_property /yAxis/max"]);
  });

  it.each([
    [-10, -2],
    [0, 0.001],
    [-3.5, 7.25],
    [-AXIS_LIMIT, AXIS_LIMIT],
  ])("accepts negative, zero, positive and decimal ranges: %d to %d (NLC-REQ-003)", (min, max) => {
    expect(issuesOf(check({ min, max }))).toEqual([]);
  });

  it("reports an end beyond ±1e9 at its path, as out_of_range (GSS TICKET-001 security review SEC-002)", () => {
    expect(codesAndPaths({ min: -2e9, max: 0 })).toEqual(["out_of_range /xAxis/min"]);
    expect(codesAndPaths({ min: 0, max: 1e308 })).toEqual(["out_of_range /xAxis/max"]);
  });

  it("reports a reversed or empty range once, at max, and runs no tick check on it (GSV-REQ-022, AD-004)", () => {
    expect(codesAndPaths({ min: 5, max: 5, tickSpacing: -1 })).toEqual(["out_of_range /xAxis/max"]);
    expect(codesAndPaths({ min: 5, max: 1, tickSpacing: 1e-12 })).toEqual(["out_of_range /xAxis/max"]);
  });

  it("accepts showTickLabels true and false, and reports any other kind", () => {
    expect(issuesOf(check({ min: 0, max: 1, showTickLabels: false }))).toEqual([]);
    expect(codesAndPaths({ min: 0, max: 1, showTickLabels: "no" })).toEqual(["wrong_kind /xAxis/showTickLabels"]);
  });
});

describe("tick spacing checks (NLC-REQ-008, NLC-REQ-009)", () => {
  it.each([0, -1, -0.5])("reports a tick spacing of %d as tick_spacing_invalid, naming the axis", (tickSpacing) => {
    const [issue, ...rest] = issuesOf(check({ min: 0, max: 10, tickSpacing }));
    expect(rest).toEqual([]);
    expect(issue).toMatchObject({ code: "tick_spacing_invalid", path: "/xAxis/tickSpacing" });
    expect(issue!.message).toContain("xAxis.tickSpacing");
  });

  it("reports more than 100 ticks as too_many_ticks, stating the limit and a spacing that fits", () => {
    const [issue, ...rest] = issuesOf(check({ min: 0, max: 10, tickSpacing: 0.05 }));
    expect(rest).toEqual([]);
    expect(issue).toMatchObject({ code: "too_many_ticks", path: "/xAxis/tickSpacing" });
    expect(issue!.message).toContain("201 ticks");
    expect(issue!.message).toContain("limit of 100");
    expect(issue!.message).toContain("such as 0.2");
    // The suggested spacing fits: 0 to 10 by 0.2 is 51 ticks.
    expect(issuesOf(check({ min: 0, max: 10, tickSpacing: 0.2 }))).toEqual([]);
  });

  it("allows exactly 100 ticks", () => {
    expect(issuesOf(check({ min: 1, max: 100, tickSpacing: 1 }))).toEqual([]);
    expect(codesAndPaths({ min: 0, max: 100, tickSpacing: 1 })).toEqual(["too_many_ticks /xAxis/tickSpacing"]);
  });

  it("counts an absurd spacing arithmetically, in constant time, without listing ticks", () => {
    const started = performance.now();
    const [issue] = issuesOf(check({ min: -AXIS_LIMIT, max: AXIS_LIMIT, tickSpacing: 1e-300 }));
    expect(performance.now() - started).toBeLessThan(50);
    expect(issue).toMatchObject({ code: "too_many_ticks", path: "/xAxis/tickSpacing" });
    expect(issue!.message).toMatch(/would draw \d+ ticks/);
  });

  it("reports a range too narrow to tell its ticks apart at max, as for a value scale", () => {
    expect(codesAndPaths({ min: 1e6, max: 1e6 + 1e-6 })).toEqual(["out_of_range /xAxis/max"]);
    expect(codesAndPaths({ min: 0, max: 1e-10 })).toEqual(["out_of_range /xAxis/max"]);
    expect(issuesOf(check({ min: 0, max: 1e-9 }))).toEqual([]);
  });

  it("reports a range too narrow to draw even when its tick spacing fails too (code review CR-002)", () => {
    expect(codesAndPaths({ min: 0, max: 1e-10, tickSpacing: 0 })).toEqual(["out_of_range /xAxis/max", "tick_spacing_invalid /xAxis/tickSpacing"]);
    // Structure reports the spacing first; the range check still runs, as it does not read it.
    expect(codesAndPaths({ min: 0, max: 1e-10, tickSpacing: 3e9 })).toEqual(["out_of_range /xAxis/tickSpacing", "out_of_range /xAxis/max"]);
    // A narrow range is reported once: no too_many_ticks on top of it.
    expect(codesAndPaths({ min: 0, max: 1e-10, tickSpacing: 1e-15 })).toEqual(["out_of_range /xAxis/max"]);
  });

  it("suggests an end that is itself valid, at max, or at min when max would pass the limit (code review CR-003)", () => {
    const suggested = (min: number, max: number) => {
      const [issue] = issuesOf(check({ min, max }));
      const range = (issue as { range?: { min?: number; max?: number } }).range ?? {};
      return { path: issue!.path, end: range.min ?? range.max! };
    };
    for (const [min, max] of [
      [0, 1e-10],
      [1e6, 1e6 + 1e-6],
      [-5e8, -5e8 + 0.1],
      [999_999_999.5, 999_999_999.6],
      [AXIS_LIMIT - 1e-3, AXIS_LIMIT],
      [-AXIS_LIMIT, -AXIS_LIMIT + 1e-3],
    ] as const) {
      const { path, end } = suggested(min, max);
      const fixed = path === "/xAxis/max" ? { min, max: end } : { min: end, max };
      expect(issuesOf(check(fixed)), `${min} to ${max}: ${path} ${end}`).toEqual([]);
    }
    expect(suggested(AXIS_LIMIT - 1e-3, AXIS_LIMIT).path).toBe("/xAxis/min");
  });

  it("checks each axis on its own", () => {
    expect(codesAndPaths({ min: 0, max: 10, tickSpacing: 0 }, { min: 0, max: 10, tickSpacing: 0.01 })).toEqual([
      "tick_spacing_invalid /xAxis/tickSpacing",
      "too_many_ticks /yAxis/tickSpacing",
    ]);
  });

  it("reads only its own axis", () => {
    expect(axisDomainChecks("yAxis").map((c) => c.inputs)).toEqual([
      ["yAxis/min", "yAxis/max"],
      ["yAxis/min", "yAxis/max", "yAxis/tickSpacing"],
    ]);
    expect(axisChecks("axis", { min: 0, max: 10, tickSpacing: 2 })).toEqual([]);
  });

  it("reads the tick spacing own-key, so a polluted Object.prototype supplies none (security review SEC-002)", () => {
    const prototype = Object.prototype as Record<string, unknown>;
    Object.defineProperty(prototype, "tickSpacing", { value: 1e-300, configurable: true, writable: true });
    try {
      expect(axisChecks("xAxis", { min: 0, max: 10 })).toEqual([]);
      expect(issuesOf(check({ min: 0, max: 10 }))).toEqual([]);
    } finally {
      delete prototype["tickSpacing"];
    }
  });
});
