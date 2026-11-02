import fc from "fast-check";
import { describe, expect, it, vi } from "vitest";
import { AXIS_LIMIT, axisChecks, axisDomainChecks, axisProperties, axisProperty } from "../../src/core/definitions/axis";
import { type GraphType, type GraphTypeDefinition, defineProperties } from "../../src/core/definitions/types";
import type { Issue, ValidationResult } from "../../src/core/result";
import { axisTooNarrow, drawableTicks, tickCount } from "../../src/core/value-scale";
import { validateWith } from "../../src/core/validate/index";

// The constant-time checks count the kit calls the axis checks make rather than time them (graph-library
// CPSE TICKET-010): the count arithmetic is `tickCount`, listing ticks is `drawableTicks`. The real
// functions still do the work.
const calls = vi.hoisted(() => ({ tickCount: 0, drawableTicks: 0 }));
vi.mock("../../src/core/value-scale", async (importOriginal) => {
  const scale = await importOriginal<typeof import("../../src/core/value-scale")>();
  const tickCount: typeof scale.tickCount = (...args) => {
    calls.tickCount++;
    return scale.tickCount(...args);
  };
  const drawableTicks: typeof scale.drawableTicks = (...args) => {
    calls.drawableTicks++;
    return scale.drawableTicks(...args);
  };
  return { ...scale, tickCount, drawableTicks };
});

/** The kit calls made while `run` runs. */
function kitCalls(run: () => void): { tickCount: number; drawableTicks: number } {
  Object.assign(calls, { tickCount: 0, drawableTicks: 0 });
  run();
  return { ...calls };
}

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

  it("counts an absurd spacing arithmetically, without listing ticks", () => {
    let issue: Issue | undefined;
    const work = kitCalls(() => {
      [issue] = issuesOf(check({ min: -AXIS_LIMIT, max: AXIS_LIMIT, tickSpacing: 1e-300 }));
    });
    // The count is made once for the axis and its (valid) neighbour is not listed either; nothing is listed for the absurd one.
    expect(work.drawableTicks).toBe(0);
    expect(work.tickCount).toBe(1);
    expect(issue).toMatchObject({ code: "too_many_ticks", path: "/xAxis/tickSpacing" });
    expect(issue!.message).toMatch(/would draw \d+ ticks/);
  });

  it("reports fewer than two ticks as too_few_ticks, stating the count, the minimum and a spacing that fits", () => {
    const [none, ...rest] = issuesOf(check({ min: 1, max: 9, tickSpacing: 10 }));
    expect(rest).toEqual([]);
    expect(none).toMatchObject({ code: "too_few_ticks", path: "/xAxis/tickSpacing" });
    expect(none!.message).toBe("xAxis.tickSpacing would draw 0 ticks, fewer than the minimum of 2; use a smaller tick spacing, such as 0.5.");
    const [one, ...more] = issuesOf(check({ min: 0.5, max: 1.5, tickSpacing: 1 }));
    expect(more).toEqual([]);
    expect(one).toMatchObject({ code: "too_few_ticks", path: "/xAxis/tickSpacing" });
    expect(one!.message).toContain("would draw 1 tick, fewer");
    // The spacing named fits: it is the axis's default, 7 to 20 ticks.
    expect(issuesOf(check({ min: 1, max: 9, tickSpacing: 0.5 }))).toEqual([]);
    expect(issuesOf(check({ min: 0.5, max: 1.5, tickSpacing: 0.1 }))).toEqual([]);
  });

  it("allows exactly two ticks, and counts by the multiples in range, not by the range's width", () => {
    expect(issuesOf(check({ min: 0, max: 10, tickSpacing: 10 }))).toEqual([]);
    expect(issuesOf(check({ min: 0, max: 10, tickSpacing: 8 }))).toEqual([]);
    expect(issuesOf(check({ min: 0, max: 1, tickSpacing: 1 }))).toEqual([]);
    // 0.5 to 1.5 is as wide as 0 to 1, but holds one multiple of 1.
    expect(codesAndPaths({ min: 0.5, max: 1.5, tickSpacing: 1 })).toEqual(["too_few_ticks /xAxis/tickSpacing"]);
    expect(codesAndPaths({ min: 0, max: 10, tickSpacing: 11 })).toEqual(["too_few_ticks /xAxis/tickSpacing"]);
  });

  it("never reports a missing tick spacing, as the default always gives ticks", () => {
    for (const axis of [{ min: 1, max: 9 }, { min: 0.5, max: 1.5 }, { min: 1, max: 9, showTickLabels: false }]) expect(issuesOf(check(axis))).toEqual([]);
  });

  it("gives one spacing issue at most: 0 or less, over 100 ticks, or a range too narrow to draw win over too few", () => {
    expect(codesAndPaths({ min: 1, max: 9, tickSpacing: 0 })).toEqual(["tick_spacing_invalid /xAxis/tickSpacing"]);
    expect(codesAndPaths({ min: 1, max: 9, tickSpacing: -10 })).toEqual(["tick_spacing_invalid /xAxis/tickSpacing"]);
    expect(codesAndPaths({ min: 0, max: 10, tickSpacing: 0.01 })).toEqual(["too_many_ticks /xAxis/tickSpacing"]);
    expect(codesAndPaths({ min: 0, max: 1e-10, tickSpacing: 1 })).toEqual(["out_of_range /xAxis/max"]);
  });

  it("counts a huge or tiny spacing arithmetically, listing no more than the 100 ticks a spacing may give", () => {
    const work = kitCalls(() => {
      expect(codesAndPaths({ min: 1, max: 9, tickSpacing: 2e9 })).toEqual(["too_few_ticks /xAxis/tickSpacing"]);
      expect(codesAndPaths({ min: 1, max: 9, tickSpacing: 2.1e9 })).toEqual(["out_of_range /xAxis/tickSpacing"]);
      expect(codesAndPaths({ min: -AXIS_LIMIT, max: AXIS_LIMIT, tickSpacing: AXIS_LIMIT })).toEqual([]);
      expect(codesAndPaths({ min: -AXIS_LIMIT, max: AXIS_LIMIT, tickSpacing: 2 * AXIS_LIMIT })).toEqual(["too_few_ticks /xAxis/tickSpacing"]);
    });
    // Each listing is of at most 2 ticks (the three axes that reach it), whatever the numbers.
    expect(work.drawableTicks).toBeLessThanOrEqual(5);
    for (const spacing of [1e-300, 5e-324, 1e-9]) {
      const huge = kitCalls(() => expect(codesAndPaths({ min: -AXIS_LIMIT, max: AXIS_LIMIT, tickSpacing: spacing })).toEqual(["too_many_ticks /xAxis/tickSpacing"]));
      expect(huge.drawableTicks, `${spacing}`).toBe(0);
    }
  });

  it("lists ticks only when the count is within the limit, so a spacing over 100 ticks is never enumerated", () => {
    const over = kitCalls(() => issuesOf(check({ min: 0, max: 10, tickSpacing: 0.01 })));
    expect(over.drawableTicks).toBe(0);
    const within = kitCalls(() => issuesOf(check({ min: 0, max: 10, tickSpacing: 0.2 })));
    expect(within.drawableTicks).toBeGreaterThan(0);
  });

  it("decides fewer than two ticks by the ticks drawn, which differs from the count at the edge of the 1e-12 tolerance (NLC TICKET-007 SEC-001)", () => {
    // tickCount matches an end within 1e-12 of a multiple, relative to the multiple; drawableTicks
    // keeps a tick within 1e-12 of the larger end. Far from zero they differ by one (counted 2,
    // drawn 1), which the count cannot see.
    const drawn = (min: number, max: number, spacing: number) => drawableTicks(min, max, spacing)?.ticks.length;
    const edge = 57.8 * 17 * (1 - 1e-12);
    expect([tickCount(0, edge, 57.8), drawn(0, edge, 57.8)]).toEqual([18, 17]);
    for (const axis of [
      { min: 2635.2, max: 2641.2999999973586, tickSpacing: 6.1 },
      { min: 3543.5000000035425, max: 3580.799999996419, tickSpacing: 37.3 },
      { min: -12253.599999987746, max: -12195.800000012194, tickSpacing: 57.8 },
    ]) {
      expect([tickCount(axis.min, axis.max, axis.tickSpacing), drawn(axis.min, axis.max, axis.tickSpacing)], JSON.stringify(axis)).toEqual([2, 1]);
      expect(codesAndPaths(axis), JSON.stringify(axis)).toEqual(["too_few_ticks /xAxis/tickSpacing"]);
      expect(issuesOf(check(axis))[0]!.message).toContain("would draw 1 tick, fewer");
    }
    // The ends exactly on two multiples draw two.
    expect(codesAndPaths({ min: 2635.2, max: 2641.3, tickSpacing: 6.1 })).toEqual([]);
  });

  it("reports too_few_ticks exactly when fewer than two ticks are drawn, for ranges with at most 100 ticks counted", () => {
    const nudge = fc.constantFrom(0, 1e-13, -1e-13, 9.9992e-13, -9.9992e-13, 1e-12, -1e-12, 1.0001e-12, -1.0001e-12, 2e-12, -2e-12);
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9999 }),
        fc.integer({ min: -3, max: 4 }),
        fc.integer({ min: -10_000, max: 10_000 }),
        fc.integer({ min: 1, max: 4 }),
        nudge,
        nudge,
        (digits, exponent, first, span, lowNudge, highNudge) => {
          const spacing = Number((digits * 10 ** exponent).toPrecision(12));
          const min = first * spacing * (1 + lowNudge);
          const max = (first + span) * spacing * (1 + highNudge);
          fc.pre(max > min && !axisTooNarrow(min, max) && Math.abs(min) <= AXIS_LIMIT && Math.abs(max) <= AXIS_LIMIT && tickCount(min, max, spacing) <= 100);
          const drawn = drawableTicks(min, max, spacing)?.ticks.length ?? 0;
          expect(codesAndPaths({ min, max, tickSpacing: spacing }).includes("too_few_ticks /xAxis/tickSpacing"), `${spacing} from ${min} to ${max}`).toBe(drawn < 2);
        },
      ),
      { numRuns: 2000 },
    );
  });

  it("names a spacing that fits, or says to leave it out where none does, and applying either validates (NLC TICKET-007 SEC-002)", () => {
    // A range a few billionths wide: the finest spacing the default chooses is 1e-9, which draws one tick.
    const [narrow] = issuesOf(check({ min: 5e-10, max: 1.6e-9, tickSpacing: 1 }));
    expect(narrow).toMatchObject({ code: "too_few_ticks", path: "/xAxis/tickSpacing" });
    expect(narrow!.message).toBe("xAxis.tickSpacing would draw 0 ticks, fewer than the minimum of 2; leave the tick spacing out.");
    expect(issuesOf(check({ min: 5e-10, max: 1.6e-9 }))).toEqual([]);
    const applied = (axis: { min: number; max: number; tickSpacing: number }, issue: Issue): unknown => {
      const named = /such as (\S+)\.$/.exec(issue.message)?.[1];
      return named === undefined ? { min: axis.min, max: axis.max } : { ...axis, tickSpacing: Number(named) };
    };
    const cases = fc.record({
      mantissa: fc.double({ min: -5, max: 5, noNaN: true }),
      width: fc.double({ min: 0.05, max: 40, noNaN: true }),
      exponent: fc.integer({ min: -10, max: 8 }),
      spacingExponent: fc.integer({ min: -10, max: 9 }),
      step: fc.constantFrom(1, 2, 5),
    });
    let reported = 0;
    let left = 0;
    fc.assert(
      fc.property(cases, ({ mantissa, width, exponent, spacingExponent, step }) => {
        const min = mantissa * 10 ** exponent;
        const axis = { min, max: min + width * 10 ** exponent, tickSpacing: step * 10 ** spacingExponent };
        fc.pre(Math.abs(axis.max) <= AXIS_LIMIT && !axisTooNarrow(axis.min, axis.max));
        const issues = issuesOf(check(axis)).filter((issue) => issue.path === "/xAxis/tickSpacing");
        fc.pre(issues.length === 1 && issues[0]!.code === "too_few_ticks");
        reported++;
        const fixed = applied(axis, issues[0]!);
        if (!("tickSpacing" in (fixed as object))) left++;
        expect(issuesOf(check(fixed)), `${JSON.stringify(axis)} -> ${JSON.stringify(fixed)}`).toEqual([]);
      }),
      { numRuns: 3000 },
    );
    expect(reported).toBeGreaterThan(100);
    // The leave-it-out suggestion is applied to the generated cases too.
    expect(left).toBeGreaterThan(0);
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
