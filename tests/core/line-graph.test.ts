import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SERIES_LIMIT, lineGraph, type LineGraph } from "../../src/core/definitions/line-graph";
import { describe as describeGraph, validate } from "../../src/core/index";
import { createGraph } from "../../src/graph";
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

const base = {
  type: "line-graph",
  categories: [{ name: "Mon" }, { name: "Tue" }, { name: "Wed" }],
  series: [{ values: [3, 5, 2] }],
};
const with_ = (extra: Record<string, unknown>) => ({ ...base, ...extra });
const example = JSON.parse(readFileSync("examples/line-graph.json", "utf8")) as Record<string, unknown>;

describe("line-graph terms (DGP-REQ-010, DGP-REQ-011)", () => {
  it("validates categories and series, each series with its values, label and color", () => {
    const { description } = valid(
      validate(with_({ series: [{ values: [3, 5, 2], lineLabel: "Week 1", lineColor: "red" }, { values: [1, 2, 3] }], title: "Temps" })),
    );
    expect(description).toMatchObject({
      categories: [{ name: "Mon" }, { name: "Tue" }, { name: "Wed" }],
      series: [{ values: [3, 5, 2], lineLabel: "Week 1", lineColor: "#c62828" }, { values: [1, 2, 3] }],
      title: "Temps",
    });
  });

  it("validates the shipped example, which uses every optional term", () => {
    const { description } = valid(validate(example));
    expect(Object.keys(description as object).sort()).toEqual(["categories", "categoryAxisLabel", "series", "title", "type", "valueAxisLabel", "valueScale"]);
    const series = (description as LineGraph).series;
    expect(series.some((s) => s.lineLabel !== undefined && s.lineColor !== undefined)).toBe(true);
    expect(series.some((s) => s.values.some((v) => v < 0))).toBe(true);
  });

  it("requires categories and series", () => {
    expect(codesAndPaths({ type: "line-graph" })).toEqual(["missing_property /categories", "missing_property /series"]);
  });

  it("treats an empty series label as no label", () => {
    const { description } = valid(validate(with_({ series: [{ values: [3, 5, 2], lineLabel: "" }] })));
    expect("lineLabel" in (description as LineGraph).series[0]!).toBe(false);
  });

  it("reports a line label or line color at the top level as not applying: they belong on each series (GSV-REQ-040)", () => {
    expect(issuesOf(validate(with_({ lineLabel: "All", lineColor: "red" })))).toEqual([
      {
        code: "inapplicable_property",
        path: "/lineLabel",
        message: "lineLabel does not apply for a line-graph as a whole; give it on each series instead.",
      },
      {
        code: "inapplicable_property",
        path: "/lineColor",
        message: "lineColor does not apply for a line-graph as a whole; give it on each series instead.",
      },
    ]);
  });

  it("reports an unknown series color and a per-category color as not applying", () => {
    expect(codesAndPaths(with_({ series: [{ values: [3, 5, 2], lineColor: "chartreuse" }] }))).toEqual(["unknown_color /series/0/lineColor"]);
    expect(codesAndPaths(with_({ categories: [{ name: "Mon", color: "red" }, { name: "Tue" }, { name: "Wed" }] }))).toEqual([
      "inapplicable_property /categories/0/color",
    ]);
    expect(codesAndPaths(with_({ valueUnitLabel: "°C" }))).toEqual(["inapplicable_property /valueUnitLabel"]);
  });
});

describe("series issues (DGP-REQ-016, DGP Edge Cases)", () => {
  it("reports no series as missing", () => {
    expect(issuesOf(validate(with_({ series: [] })))).toEqual([
      { code: "missing_property", path: "/series", message: "series is required for a line-graph; add it." },
    ]);
  });

  it("reports each series whose length differs from the categories, an empty list included", () => {
    expect(issuesOf(validate(with_({ series: [{ values: [3, 5, 2] }, { values: [4, 1] }, { values: [] }] })))).toEqual([
      {
        code: "series_length_mismatch",
        path: "/series/1/values",
        message: "series[1].values has 2 values but there are 3 categories; give one value per category.",
      },
      {
        code: "series_length_mismatch",
        path: "/series/2/values",
        message: "series[2].values has 0 values but there are 3 categories; give one value per category.",
      },
    ]);
  });

  it("reports a series longer than the categories, so no value is silently left out (quality review QR-002)", () => {
    expect(issuesOf(validate(with_({ series: [{ values: [3, 5, 2, 9, 1] }] })))).toEqual([
      {
        code: "series_length_mismatch",
        path: "/series/0/values",
        message: "series[0].values has 5 values but there are 3 categories; give one value per category.",
      },
    ]);
  });

  it("reports no knock-on length issues when there are no categories (quality review QR-005)", () => {
    expect(codesAndPaths(with_({ categories: [], series: [{ values: [1, 2] }, { values: [] }] }))).toEqual(["missing_property /categories"]);
  });

  it("reports a length mismatch even beside a bad value or a bad series", () => {
    expect(codesAndPaths(with_({ series: [{ values: [3, "x"] }, 7] }))).toEqual([
      "wrong_kind /series/0/values/1",
      "wrong_kind /series/1",
      "series_length_mismatch /series/0/values",
    ]);
  });

  it(`allows at most ${SERIES_LIMIT} series, the number of default series styles`, () => {
    const many = (n: number) => Array.from({ length: n }, () => ({ values: [1, 2, 3] }));
    expect(validate(with_({ series: many(SERIES_LIMIT) })).valid).toBe(true);
    expect(codesAndPaths(with_({ series: many(SERIES_LIMIT + 1) }))).toEqual(["too_large /series"]);
  });

  it("reports the shipped invalid examples", () => {
    expect(codesAndPaths(JSON.parse(readFileSync("examples/invalid/line-graph-length-mismatch.json", "utf8")))).toEqual([
      "series_length_mismatch /series/1/values",
    ]);
    expect(codesAndPaths(JSON.parse(readFileSync("examples/invalid/line-graph-no-series.json", "utf8")))).toEqual(["missing_property /series"]);
  });
});

describe("values and the value scale (DGP-REQ-015, DGP-REQ-007, DGP-REQ-008)", () => {
  it("accepts negative values", () => {
    expect(validate(with_({ series: [{ values: [-3, 0, 2.5] }] })).valid).toBe(true);
  });

  it("chooses a minimum below zero for negative values when only the maximum is given", () => {
    expect(validate(with_({ series: [{ values: [-3, 0, 2.5] }], valueScale: { maximum: 10 } })).valid).toBe(true);
    // A maximum below zero, with a minimum chosen below it.
    expect(validate(with_({ series: [{ values: [-8, -5, -3] }], valueScale: { maximum: -1 } })).valid).toBe(true);
    expect(codesAndPaths(with_({ series: [{ values: [-3, 0, 2.5] }], valueScale: { minimum: 0, maximum: 10 } }))).toEqual([
      "scale_excludes_value /series/0/values/0",
    ]);
  });

  it("bounds every value to ±1,000,000,000 (DGP TICKET-001 SEC-003)", () => {
    expect(codesAndPaths(with_({ series: [{ values: [1e10, 0, -1e10] }] }))).toEqual(["out_of_range /series/0/values/0", "out_of_range /series/0/values/2"]);
  });

  it("reports a value outside a given scale at its own position, in any series", () => {
    expect(codesAndPaths(with_({ series: [{ values: [3, 5, 2] }, { values: [1, -4, 2] }], valueScale: { minimum: 0, maximum: 10 } }))).toEqual([
      "scale_excludes_value /series/1/values/1",
    ]);
    // Series and value positions differ, so a swapped path would show (quality review QR-002).
    expect(codesAndPaths(with_({ series: [{ values: [3, 5, 12] }, { values: [1, 4, 2] }], valueScale: { minimum: 0, maximum: 10 } }))).toEqual([
      "scale_excludes_value /series/0/values/2",
    ]);
  });

  it("reports a tick interval that does not divide the scale", () => {
    expect(codesAndPaths(with_({ valueScale: { minimum: 0, maximum: 10, tickInterval: 3 } }))).toEqual(["tick_interval_not_dividing /valueScale/tickInterval"]);
  });

  it("reports a scale too fine to draw near ±1,000,000,000, rather than drawing it (DGP TICKET-001 SEC-001; code review CR-004)", () => {
    // Every value inside the given scale, so the span alone is at fault.
    const tiny = with_({ series: [{ values: [999_999_999, 999_999_999, 999_999_999.000001] }], valueScale: { minimum: 999_999_999, maximum: 999_999_999.000001 } });
    expect(codesAndPaths(tiny)).toEqual(["out_of_range /valueScale/maximum"]);
    expect(createGraph(tiny).ok).toBe(false);
  });

  it("checks the scale on values that passed, skipping it when a value failed", () => {
    expect(codesAndPaths(with_({ series: [{ values: [3, "x", 2] }], valueScale: { minimum: 0, maximum: 1 } }))).toEqual(["wrong_kind /series/0/values/1"]);
  });
});

describe("the text alternative (DGP-REQ-004)", () => {
  it("names the type, the title, both axis labels, and every series with every category and its value", () => {
    expect(describeGraph(example)).toBe(
      "A line graph titled “Morning temperatures over one week”. The category axis is labeled “Day”. The value axis is labeled “Temperature (°C)”. It shows 3 series. " +
        "“Week 1”: “Mon” is 3, “Tue” is 5, “Wed” is -2, “Thu” is 4 and “Fri” is 8. " +
        "“Week 2”: “Mon” is -4, “Tue” is 0, “Wed” is 2, “Thu” is 6 and “Fri” is 7. " +
        "Series 3: “Mon” is 10, “Tue” is 12, “Wed” is 9, “Thu” is 11 and “Fri” is 13.",
    );
  });

  it('calls an unlabeled or blank-labeled series "Series N", and leaves out a blank title and blank axis labels', () => {
    expect(describeGraph(with_({ title: " ", valueAxisLabel: " ", series: [{ values: [3, 5, 2], lineLabel: "  " }] }))).toBe(
      "A line graph. It shows 1 series. Series 1: “Mon” is 3, “Tue” is 5 and “Wed” is 2.",
    );
  });

  it("states supplied values exactly as written", () => {
    expect(describeGraph(with_({ series: [{ values: [0.1, 1234567.25, -0.000001] }] }))).toContain("“Mon” is 0.1, “Tue” is 1234567.25 and “Wed” is -0.000001");
  });

  it("states caller text whole and quoted, or the description is refused; nothing unsafe reaches the text", () => {
    for (const text of [...BENIGN_TEXT, ...HOSTILE_TEXT, SMUGGLED_TEXT]) {
      const result = validate(
        with_({ title: text, categoryAxisLabel: text, valueAxisLabel: text, categories: [{ name: text.slice(0, 200) }, { name: "Tue" }, { name: "Wed" }], series: [{ values: [1, 2, 3], lineLabel: text }] }),
      );
      if (!result.valid) {
        expect(findUnsafeTextChar(text) !== -1 || result.issues.every((issue) => issue.code === "duplicate_name"), JSON.stringify(text)).toBe(true);
        continue;
      }
      const stated = lineGraph.describe(result.description as LineGraph, result.provenance);
      expect(findUnsafeTextChar(stated), JSON.stringify(text)).toBe(-1);
      expect(stated.startsWith("A line graph"), JSON.stringify(text)).toBe(true);
    }
  });
});
