import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { barGraph, type BarGraph } from "../../src/core/definitions/bar-graph";
import { describe as describeGraph, validate } from "../../src/core/index";
import type { Issue, ValidationResult } from "../../src/core/result";
import { findUnsafeTextChar } from "../../src/core/format";
import { BENIGN_TEXT, HOSTILE_TEXT, SMUGGLED_TEXT } from "../fixtures/plain-text";

function valid(result: ValidationResult<unknown>) {
  if (!result.valid) throw new Error(`expected a valid result, got ${JSON.stringify(result.issues)}`);
  return result;
}

function issuesOf(result: ValidationResult<unknown>): Issue[] {
  if (result.valid) throw new Error(`expected an invalid result, got ${JSON.stringify(result)}`);
  return result.issues;
}

const codesAndPaths = (input: unknown) => issuesOf(validate(input)).map((issue) => `${issue.code} ${issue.path}`);

const base = { type: "bar-graph", categories: [{ name: "Walk" }, { name: "Bus" }, { name: "Car" }], values: [12, 7, 9] };
const with_ = (extra: Record<string, unknown>) => ({ ...base, ...extra });
const example = JSON.parse(readFileSync("examples/bar-graph.json", "utf8")) as Record<string, unknown>;

describe("bar-graph terms (DGP-REQ-017..020)", () => {
  it("validates categories with optional colors, values, orientation, barColor and showValues", () => {
    const { description } = valid(
      validate(with_({ categories: [{ name: "Walk" }, { name: "Bus", color: "orange" }, { name: "Car" }], orientation: "horizontal", barColor: "green", showValues: true })),
    );
    expect(description).toMatchObject({
      categories: [{ name: "Walk" }, { name: "Bus", color: "#b36b00" }, { name: "Car" }],
      values: [12, 7, 9],
      orientation: "horizontal",
      barColor: "#2e7d32",
      showValues: true,
    });
  });

  it("validates the shipped example, which uses every optional term", () => {
    const { description } = valid(validate(example));
    expect(Object.keys(description as object).sort()).toEqual([
      "barColor",
      "categories",
      "categoryAxisLabel",
      "orientation",
      "showValues",
      "title",
      "type",
      "valueAxisLabel",
      "valueScale",
      "values",
    ]);
    const { categories, values } = description as BarGraph;
    expect(categories.some((category) => category.color !== undefined)).toBe(true);
    expect(values).toContain(0);
    expect(values.some((value) => !Number.isInteger(value))).toBe(true);
  });

  it("requires categories and values", () => {
    expect(codesAndPaths({ type: "bar-graph" })).toEqual(["missing_property /categories", "missing_property /values"]);
  });

  it("accepts vertical and horizontal, vertical by default", () => {
    expect(validate(with_({ orientation: "vertical" })).valid).toBe(true);
    expect("orientation" in (valid(validate(base)).description as object)).toBe(false);
    expect(codesAndPaths(with_({ orientation: "diagonal" }))).toEqual(["wrong_kind /orientation"]);
  });

  it("reports an unknown bar or category color, and a showValues that is not true or false", () => {
    expect(codesAndPaths(with_({ barColor: "chartreuse", showValues: "yes", categories: [{ name: "Walk", color: "#12" }, { name: "Bus" }, { name: "Car" }] }))).toEqual([
      "unknown_color /categories/0/color",
      "unknown_color /barColor",
      "wrong_kind /showValues",
    ]);
  });

  it("reports options that do not apply, and a top-level color with where it goes", () => {
    expect(codesAndPaths(with_({ valueUnitLabel: "pupils", lineColor: "red", unitImage: "apple" }))).toEqual([
      "inapplicable_property /valueUnitLabel",
      "inapplicable_property /lineColor",
      "unknown_property /unitImage",
    ]);
    expect(issuesOf(validate(with_({ color: "red" })))).toEqual([
      {
        code: "inapplicable_property",
        path: "/color",
        message: "color does not apply for a bar-graph as a whole; give it on each category, or use barColor for every bar instead.",
      },
    ]);
  });
});

describe("bar-graph issues (DGP-REQ-021, DGP Edge Cases)", () => {
  it("reports a negative value at its own position", () => {
    expect(codesAndPaths(with_({ values: [12, -3, 9] }))).toEqual(["out_of_range /values/1"]);
  });

  it("accepts non-integer values", () => {
    expect(validate(with_({ values: [2.5, 0.125, 9] })).valid).toBe(true);
  });

  it("reports a values list whose length differs from the categories, and no knock-on issue without categories", () => {
    expect(codesAndPaths(with_({ values: [12, 7] }))).toEqual(["series_length_mismatch /values"]);
    expect(codesAndPaths(with_({ categories: [], values: [1] }))).toEqual(["missing_property /categories"]);
  });

  it("reports a given scale minimum above zero, since bars must start at zero", () => {
    expect(issuesOf(validate(with_({ valueScale: { minimum: 5, maximum: 15 } })))).toEqual([
      {
        code: "out_of_range",
        path: "/valueScale/minimum",
        message: "valueScale.minimum must be a number at most 0; got 5.",
        range: { max: 0 },
      },
    ]);
    // Zero and below are fine: the bars start at the zero line.
    expect(validate(with_({ valueScale: { minimum: 0, maximum: 15 } })).valid).toBe(true);
    expect(validate(with_({ valueScale: { minimum: -5, maximum: 15 } })).valid).toBe(true);
  });

  it("reports a value outside a given scale, and a tick interval that does not divide it", () => {
    expect(codesAndPaths(with_({ valueScale: { maximum: 10 } }))).toEqual(["scale_excludes_value /values/0"]);
    expect(codesAndPaths(with_({ values: [9, 7, 2], valueScale: { minimum: 0, maximum: 10, tickInterval: 3 } }))).toEqual([
      "tick_interval_not_dividing /valueScale/tickInterval",
    ]);
  });

  it("cannot be given a scale too fine to draw near 1,000,000,000: its minimum must be at most zero (DGP TICKET-001 SEC-001)", () => {
    // The span is then at least the maximum, so the tiny-span case of the line graph cannot arise;
    // the attempt is reported, not drawn.
    expect(codesAndPaths(with_({ values: [999_999_999, 999_999_999, 999_999_999], valueScale: { minimum: 999_999_999, maximum: 999_999_999.000001 } }))).toContain(
      "out_of_range /valueScale/minimum",
    );
  });

  it("reads only the values each check needs: no scale issue follows a bad value, and a bad value never hides the minimum's (quality review QR-003)", () => {
    expect(codesAndPaths(with_({ values: [12, "x", 9], valueScale: { maximum: 10 } }))).toEqual(["wrong_kind /values/1"]);
    expect(codesAndPaths(with_({ values: [12, -1, 9], valueScale: { minimum: 5, maximum: 15 } }))).toEqual(["out_of_range /values/1", "out_of_range /valueScale/minimum"]);
  });

  it("reports the shipped invalid examples", () => {
    expect(codesAndPaths(JSON.parse(readFileSync("examples/invalid/bar-graph-negative.json", "utf8")))).toEqual(["out_of_range /values/1"]);
    expect(codesAndPaths(JSON.parse(readFileSync("examples/invalid/bar-graph-scale-above-zero.json", "utf8")))).toEqual(["out_of_range /valueScale/minimum"]);
  });
});

describe("the text alternative (DGP-REQ-004)", () => {
  it("names the type, the title, both axis labels, and every category with its value as supplied", () => {
    expect(describeGraph(example)).toBe(
      "A bar graph titled “How we get to school”. The category axis is labeled “Way of travelling”. The value axis is labeled “Pupils”. " +
        "“Walk” is 12, “Bus” is 7.5, “Car” is 9, “Bike” is 0 and “Scooter” is 3.",
    );
  });

  it("states every value as supplied, with all its digits, not rounded as a derived value would be (code review CR-003)", () => {
    expect(describeGraph(with_({ values: [1234.56789012, 0.123456789, 9] }))).toContain("“Walk” is 1234.56789012, “Bus” is 0.123456789 and “Car” is 9");
  });

  it("leaves out a blank title and blank axis labels, and states values exactly as written", () => {
    expect(describeGraph(with_({ title: " ", categoryAxisLabel: " ", values: [0.1, 1234567.25, 0.000001] }))).toBe(
      "A bar graph. “Walk” is 0.1, “Bus” is 1234567.25 and “Car” is 0.000001.",
    );
  });

  it("states caller text whole and quoted, or the description is refused; nothing unsafe reaches the text", () => {
    for (const text of [...BENIGN_TEXT, ...HOSTILE_TEXT, SMUGGLED_TEXT]) {
      const result = validate(with_({ title: text, categoryAxisLabel: text, valueAxisLabel: text, categories: [{ name: text.slice(0, 200) }, { name: "Bus" }, { name: "Car" }] }));
      if (!result.valid) {
        expect(findUnsafeTextChar(text) !== -1 || result.issues.every((issue) => issue.code === "duplicate_name"), JSON.stringify(text)).toBe(true);
        continue;
      }
      const stated = barGraph.describe(result.description as BarGraph, result.provenance);
      expect(findUnsafeTextChar(stated), JSON.stringify(text)).toBe(-1);
      expect(stated.startsWith("A bar graph"), JSON.stringify(text)).toBe(true);
    }
  });
});
