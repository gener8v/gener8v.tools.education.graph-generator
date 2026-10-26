import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { describe as describeGraph, validate } from "../../src/core/index";
import { NUMBER_LINE_POINT_LIMIT, type NumberLine, hasArrow, numberLine } from "../../src/core/definitions/number-line";
import { CALLER_TEXT_LIMIT } from "../../src/core/definitions/shared";
import type { Issue, ValidationResult } from "../../src/core/result";
import { MAX_VALUE_TICKS } from "../../src/core/value-scale";
import { findUnsafeTextChar, cleanText, quoteText } from "../../src/core/format";
import { BENIGN_TEXT, HOSTILE_TEXT, SMUGGLED_TEXT } from "../fixtures/plain-text";

const issuesOf = (result: ValidationResult<unknown>): Issue[] => (result.valid ? [] : result.issues);
const codesAndPaths = (description: unknown) => issuesOf(validate(description)).map((issue) => `${issue.code} ${issue.path}`);
const line = (extra: object = {}) => ({ type: "number-line", axis: { min: -10, max: 10 }, ...extra });
const example: unknown = JSON.parse(readFileSync("examples/number-line.json", "utf8"));

describe("the number line's terms (NLC-REQ-001, NLC-REQ-011, NLC-REQ-015, NLC-REQ-017, NLC-REQ-019, NLC-REQ-021)", () => {
  it("validates the documented example", () => {
    expect(issuesOf(validate(example))).toEqual([]);
  });

  it("leaves both arrowheads on when the settings are left out, and turns each off by false alone", () => {
    const result = validate(line());
    if (!result.valid) throw new Error(JSON.stringify(result.issues));
    const normalized = result.description as NumberLine;
    expect([normalized.leftArrow, normalized.rightArrow]).toEqual([undefined, undefined]);
    expect([hasArrow(undefined), hasArrow(true), hasArrow(false)]).toEqual([true, true, false]);
    expect(describeGraph(line())).toContain("with arrowheads at both ends");
  });

  it("takes camelCase booleans only", () => {
    expect(codesAndPaths(line({ arrowheads: "both" }))).toEqual(["unknown_property /arrowheads"]);
    expect(codesAndPaths(line({ left_arrow: false }))).toEqual(["unknown_property /left_arrow"]);
    expect(codesAndPaths(line({ leftArrow: "no" }))).toEqual(["wrong_kind /leftArrow"]);
  });

  it("reports a top-level label or color as belonging on each point", () => {
    expect(issuesOf(validate(line({ label: "x" })))[0]!.message).toBe("label does not apply for a number-line as a whole; give it on each point instead.");
  });

  it("accepts a blank custom label, and a text at the limit; refuses one character more", () => {
    expect(codesAndPaths(line({ tickLabels: [{ value: 0, text: "" }] }))).toEqual([]);
    expect(codesAndPaths(line({ tickLabels: [{ value: 0, text: "x".repeat(CALLER_TEXT_LIMIT) }] }))).toEqual([]);
    expect(codesAndPaths(line({ tickLabels: [{ value: 0, text: "x".repeat(CALLER_TEXT_LIMIT + 1) }] }))).toEqual(["too_large /tickLabels/0/text"]);
    expect(codesAndPaths(line({ tickLabels: [{ value: 0 }] }))).toEqual(["missing_property /tickLabels/0/text"]);
  });

  it("holds at most the documented number of points and custom labels", () => {
    const at = (value: number) => ({ value: 0, text: String(value) });
    expect(codesAndPaths(line({ points: Array.from({ length: NUMBER_LINE_POINT_LIMIT }, () => ({ value: 0 })) }))).toEqual([]);
    expect(codesAndPaths(line({ points: Array.from({ length: NUMBER_LINE_POINT_LIMIT + 1 }, () => ({ value: 0 })) }))).toEqual(["too_large /points"]);
    expect(codesAndPaths(line({ tickLabels: Array.from({ length: MAX_VALUE_TICKS + 1 }, (_, i) => at(i)) }))).toEqual(["too_large /tickLabels"]);
  });

  it("matches each invalid example to its one issue", () => {
    const of = (file: string) => codesAndPaths(JSON.parse(readFileSync(`examples/invalid/${file}`, "utf8")));
    expect(of("number-line-point-outside.json")).toEqual(["outside_axis_range /points/0/value"]);
    expect(of("number-line-label-off-tick.json")).toEqual(["tick_label_not_on_tick /tickLabels/0/value"]);
  });
});

describe("points outside the range (NLC-REQ-010)", () => {
  it("reports a point outside the range at its value, naming the range", () => {
    expect(issuesOf(validate(line({ points: [{ value: 12 }] })))).toEqual([
      {
        code: "outside_axis_range",
        path: "/points/0/value",
        message: "points[0].value (12) is outside the axis range, from -10 to 10; move it inside the range or widen the axis.",
        range: { min: -10, max: 10 },
      },
    ]);
  });

  it("accepts a point exactly on either end, as written", () => {
    expect(codesAndPaths(line({ points: [{ value: -10 }, { value: 10 }] }))).toEqual([]);
    expect(codesAndPaths(line({ axis: { min: 0.1, max: 0.3 }, points: [{ value: 0.3 }, { value: 0.1 }] }))).toEqual([]);
  });

  it("reports every outside point once, in order", () => {
    expect(codesAndPaths(line({ points: [{ value: -11 }, { value: 0 }, { value: 1e9 }, { value: -1e9 }] }))).toEqual([
      "outside_axis_range /points/0/value",
      "outside_axis_range /points/2/value",
      "outside_axis_range /points/3/value",
    ]);
  });

  it("does not check points against a range the axis checks refuse", () => {
    expect(codesAndPaths(line({ axis: { min: 5, max: 1 }, points: [{ value: 3 }] }))).toEqual(["out_of_range /axis/max"]);
  });
});

describe("custom labels off a tick (NLC-REQ-020)", () => {
  it("accepts a label at a tick, including one written in full on a spacing of a third", () => {
    expect(codesAndPaths(line({ axis: { min: 0, max: 1, tickSpacing: 1 / 3 }, tickLabels: [{ value: 2 / 3, text: "two thirds" }] }))).toEqual([]);
    // A computed value is matched to its tick, as the drawing matches it (isTickValue): 0.1 + 0.2 is the 0.3 tick.
    expect(codesAndPaths(line({ axis: { min: 0, max: 1, tickSpacing: 0.1 }, tickLabels: [{ value: 0.1 + 0.2, text: "three tenths" }] }))).toEqual([]);
  });

  it("accepts a label at the end tick of a spacing longer than twelve significant digits (NLC TICKET-006 security review SEC-001)", () => {
    const end = 2.9999999999958;
    expect(codesAndPaths(line({ axis: { min: 0, max: end, tickSpacing: end / 10 }, tickLabels: [{ value: end, text: "end" }] }))).toEqual([]);
  });

  it("reports a label between ticks, past the tolerance, or off the range", () => {
    expect(codesAndPaths(line({ axis: { min: 0, max: 10, tickSpacing: 1 }, tickLabels: [{ value: 0.5, text: "half" }] }))).toEqual(["tick_label_not_on_tick /tickLabels/0/value"]);
    expect(codesAndPaths(line({ axis: { min: 0, max: 1, tickSpacing: 1 / 3 }, tickLabels: [{ value: 2 / 3 + 1e-5, text: "near" }] }))).toEqual(["tick_label_not_on_tick /tickLabels/0/value"]);
    expect(codesAndPaths(line({ axis: { min: 0, max: 10, tickSpacing: 1 }, tickLabels: [{ value: 20, text: "far" }] }))).toEqual(["tick_label_not_on_tick /tickLabels/0/value"]);
    // 0 is a multiple of every spacing, but not a tick of a range that leaves it out.
    expect(codesAndPaths(line({ axis: { min: 1, max: 10, tickSpacing: 3 }, tickLabels: [{ value: 0, text: "zero" }] }))).toEqual(["tick_label_not_on_tick /tickLabels/0/value"]);
  });

  it("names the ticks in its message: the spacing drawn, given or default, and the range (code review CR-004)", () => {
    const [far] = issuesOf(validate(line({ axis: { min: 0, max: 10, tickSpacing: 1 }, tickLabels: [{ value: 20, text: "far" }] })));
    expect(far).toEqual({
      code: "tick_label_not_on_tick",
      path: "/tickLabels/0/value",
      message: "tickLabels[0].value is at 20, which is not a tick position; use a tick: a multiple of 1 from 0 to 10.",
      range: { min: 0, max: 10 },
    });
    expect(issuesOf(validate(line({ tickLabels: [{ value: 3, text: "x" }] })))[0]!.message).toBe(
      "tickLabels[0].value is at 3, which is not a tick position; use a tick: a multiple of 2 from -10 to 10.",
    );
  });

  it("checks labels against the default spacing when none is given", () => {
    // -10..10 by default ticks every 2: every 1 would give 21 ticks, past the 20 the default aims at.
    expect(codesAndPaths(line({ tickLabels: [{ value: 4, text: "four" }, { value: 3, text: "x" }] }))).toEqual(["tick_label_not_on_tick /tickLabels/1/value"]);
  });

  it("leaves labels to the axis checks when the axis has too many ticks or a bad spacing, never failing itself", () => {
    expect(codesAndPaths(line({ axis: { min: 0, max: 10, tickSpacing: 0.01 }, tickLabels: [{ value: 0.5, text: "x" }] }))).toEqual(["too_many_ticks /axis/tickSpacing"]);
    expect(codesAndPaths(line({ axis: { min: 0, max: 10, tickSpacing: -1 }, tickLabels: [{ value: 0.5, text: "x" }] }))).toEqual(["tick_spacing_invalid /axis/tickSpacing"]);
  });
});

describe("the text alternative (NLC-REQ-012, NLC-REQ-016, NLC-REQ-019, NLC-REQ-021)", () => {
  it("states the title, line label, range, spacing, arrowheads, custom labels and every point with its label", () => {
    expect(describeGraph(example)).toBe(
      "A number line titled “Temperatures at noon”, labeled “Degrees Celsius”, from -10 to 10, ticked every 2, with arrowheads at both ends. Ticks labeled: 0 as “zero”. 2 points are marked: -3 labeled “Monday” and 4 labeled “Tuesday”.",
    );
  });

  it("says which ends have arrowheads", () => {
    expect(describeGraph(line({ leftArrow: false }))).toContain("with an arrowhead at the right end only");
    expect(describeGraph(line({ rightArrow: false }))).toContain("with an arrowhead at the left end only");
    expect(describeGraph(line({ leftArrow: false, rightArrow: false }))).toContain("with no arrowheads");
  });

  it("states a default spacing rounded and a supplied one as written, and values as written", () => {
    expect(describeGraph(line())).toContain("ticked every 2,");
    // Values the two-decimal rounding of derived values would change (quality review QR-003).
    expect(describeGraph(line({ axis: { min: -0.125, max: 1.875, tickSpacing: 0.125 }, points: [{ value: 0.375, label: "three eighths" }] }))).toBe(
      "A number line from -0.125 to 1.875, ticked every 0.125, with arrowheads at both ends. 1 point is marked: 0.375 labeled “three eighths”.",
    );
    expect(describeGraph(line({ axis: { min: 0, max: 1, tickSpacing: 0.25 }, points: [{ value: 0.1 }] }))).toBe(
      "A number line from 0 to 1, ticked every 0.25, with arrowheads at both ends. 1 point is marked: 0.1.",
    );
  });

  it("states a blank custom label, only the first label at a tick, and none when tick labels are hidden", () => {
    const labels = [{ value: 6, text: "" }, { value: 0, text: "start" }, { value: 0, text: "second" }];
    // In tick order, the first label at a tick winning.
    expect(describeGraph(line({ tickLabels: labels }))).toContain("Ticks labeled: 0 as “start” and 6 left blank.");
    expect(describeGraph(line({ axis: { min: -10, max: 10, showTickLabels: false }, tickLabels: labels }))).toContain("Its ticks are not labeled.");
    expect(describeGraph(line({ axis: { min: -10, max: 10, showTickLabels: false }, tickLabels: labels }))).not.toContain("start");
  });

  it("says no points are marked, and leaves out a blank title and line label", () => {
    expect(describeGraph(line({ title: "  ", lineLabel: "" }))).toBe("A number line from -10 to 10, ticked every 2, with arrowheads at both ends. No points are marked.");
  });

  it("quotes every caller text, or the description is refused for an unsafe character; nothing unsafe reaches the text", () => {
    for (const text of [...BENIGN_TEXT, ...HOSTILE_TEXT, SMUGGLED_TEXT]) {
      const description = line({ title: text, lineLabel: text, points: [{ value: 1, label: text }], tickLabels: [{ value: 0, text }] });
      const result = validate(description);
      if (!result.valid) {
        expect(findUnsafeTextChar(text), JSON.stringify(text)).not.toBe(-1);
        continue;
      }
      const stated = numberLine.describe(result.description as NumberLine, result.provenance);
      expect(findUnsafeTextChar(stated), JSON.stringify(text)).toBe(-1);
      expect(stated.startsWith("A number line"), JSON.stringify(text)).toBe(true);
      // The title, line label, point label and custom tick label, each quoted.
      expect(stated.split(quoteText(cleanText(text))).length - 1, JSON.stringify(text)).toBe(4);
    }
  });
});
