import { describe, expect, it } from "vitest";
import {
  CATEGORY_LIMIT,
  type GivenValueScale,
  MAX_VALUE_TICKS,
  categoriesCheck,
  categoriesProperty,
  categories as categoriesSpec,
  checkCategories,
  checkValueScale,
  dataGraphProperties,
  resolveValueScale,
} from "../../src/core/definitions/categories";
import type { Registry } from "../../src/core/definitions/index";
import { sharedProperties } from "../../src/core/definitions/shared";
import { type DescriptionBase, type DomainCheck, type GraphTypeDefinition, defineProperties } from "../../src/core/definitions/types";
import { pointer } from "../../src/core/issues";
import type { Issue, ValidationResult } from "../../src/core/result";
import { validateWith } from "../../src/core/validate/index";
import { circle } from "../fixtures/definitions/circle";

// Stand-in data graphs: the real line graph, bar graph and pictograph arrive in DGP TICKET-002,
// TICKET-003 and TICKET-005. Each uses the shared categories and checks the way those tickets will:
// values at `values/*`, the scale check on them, and the bar graph's categories carrying a color.

const values = {
  term: "values",
  kind: "array",
  required: true,
  maxItems: CATEGORY_LIMIT,
  description: "One value per category.",
  items: { kind: "number", min: -1e9, max: 1e9, description: "A category's value." },
} as const;

function scaleCheck(allowNegative: boolean): DomainCheck {
  return {
    name: "values fit the value scale",
    inputs: ["valueScale/minimum", "valueScale/maximum", "valueScale/tickInterval", "values/*"],
    check: (description: DescriptionBase) =>
      checkValueScale(
        (description["values"] as number[]).map((value, i) => ({ path: pointer("values", i), term: `values[${i}]`, value })),
        description["valueScale"] as GivenValueScale | undefined,
        { allowNegative },
      ),
  };
}

const dataGraph = (type: "line-graph" | "bar-graph" | "pictograph", categories = categoriesSpec): GraphTypeDefinition => ({
  type,
  title: type,
  description: `A test-only ${type}.`,
  properties: defineProperties({ categories, values }),
  derivations: [],
  checks: [categoriesCheck, scaleCheck(type === "line-graph")],
  describe: () => `A ${type}.`,
});

const registry: Registry = Object.freeze(
  Object.assign(Object.create(null) as Record<string, GraphTypeDefinition>, {
    circle,
    "line-graph": dataGraph("line-graph"),
    "bar-graph": dataGraph("bar-graph", categoriesProperty({ color: sharedProperties.color })),
    pictograph: dataGraph("pictograph"),
  }),
);

const check = (input: unknown) => validateWith(input, registry);

function issuesOf(result: ValidationResult<unknown>): Issue[] {
  if (result.valid) throw new Error(`expected an invalid result, got ${JSON.stringify(result)}`);
  return result.issues;
}

const codesAndPaths = (input: unknown) => issuesOf(check(input)).map((issue) => `${issue.code} ${issue.path}`);

function described(input: unknown): DescriptionBase {
  const result = check(input);
  if (!result.valid) throw new Error(`expected a valid result, got ${JSON.stringify(result.issues)}`);
  return result.description;
}

const named = (...names: string[]) => names.map((name) => ({ name }));
const bar = (extra: Record<string, unknown> = {}) => ({ type: "bar-graph", categories: named("Mon", "Tue", "Wed"), values: [3, 5, 2], ...extra });
const line = (extra: Record<string, unknown> = {}) => ({ type: "line-graph", categories: named("Mon", "Tue", "Wed"), values: [3, -5, 2], ...extra });
const pictograph = (extra: Record<string, unknown> = {}) => ({ type: "pictograph", categories: named("Cats", "Dogs"), values: [4, 6], ...extra });

describe("categories (DGP-REQ-001, DGP-REQ-003)", () => {
  it("are accepted as an ordered list of plain-text names, kept in the order given", () => {
    expect(described(bar({ categories: named("Wed", "Mon", "Tue") }))["categories"]).toEqual(named("Wed", "Mon", "Tue"));
  });

  it("are required, and an empty list is reported as missing", () => {
    const none: Record<string, unknown> = bar();
    delete none["categories"];
    expect(codesAndPaths(none)).toEqual(["missing_property /categories"]);
    expect(codesAndPaths(bar({ categories: [], values: [] }))).toEqual(["missing_property /categories"]);
    expect(issuesOf(check(bar({ categories: [], values: [] })))[0]!.message).toBe("categories is required for a bar-graph; add it.");
  });

  it(`hold at most ${CATEGORY_LIMIT}`, () => {
    const many = Array.from({ length: CATEGORY_LIMIT + 1 }, (_, i) => ({ name: `C${i}` }));
    expect(codesAndPaths(bar({ categories: many }))).toEqual(["too_large /categories"]);
    expect(check(bar({ categories: many.slice(1), values: many.slice(1).map(() => 1) })).valid).toBe(true);
  });

  it("each need a plain-text name", () => {
    expect(codesAndPaths(bar({ categories: ["Mon", { name: 2 }, {}] }))).toEqual([
      "wrong_kind /categories/0",
      "wrong_kind /categories/1/name",
      "missing_property /categories/2/name",
    ]);
  });

  it("report a repeated name at the later category, naming the first", () => {
    const issues = issuesOf(check(bar({ categories: named("Mon", "Tue", "Mon", "Mon"), values: [1, 2, 3, 4] })));
    expect(issues).toEqual([
      {
        code: "duplicate_name",
        path: "/categories/2/name",
        message: 'categories[2].name ("Mon") repeats categories[0].name; give each one a different name.',
        conflicts: ["/categories/0/name"],
      },
      {
        code: "duplicate_name",
        path: "/categories/3/name",
        message: 'categories[3].name ("Mon") repeats categories[0].name; give each one a different name.',
        conflicts: ["/categories/0/name"],
      },
    ]);
  });

  it("compare names as drawn: letter case differs, so it is a different name", () => {
    expect(check(bar({ categories: named("Mon", "mon", "MON") })).valid).toBe(true);
    // Names that differ only by characters cleaning removes draw the same.
    expect(checkCategories([{ name: "Mon" }, { name: "Mo­n" }], "bar-graph").map((i) => i.path)).toEqual(["/categories/1/name"]);
  });

  it("skip a category that failed on its own, rather than report it again", () => {
    expect(checkCategories([null, { name: "A" }, null, { name: "A" }], "bar-graph").map((i) => i.path)).toEqual(["/categories/3/name"]);
  });

  it("declare what the check reads", () => {
    expect(categoriesCheck.inputs).toEqual(["categories", "categories/*/name"]);
  });
});

describe("axis and unit labels (DGP-REQ-002)", () => {
  it("accepts category-axis and value-axis labels on line and bar graphs", () => {
    for (const make of [bar, line]) {
      const graph = described(make({ categoryAxisLabel: "Day", valueAxisLabel: "Hours" }));
      expect([graph["categoryAxisLabel"], graph["valueAxisLabel"]]).toEqual(["Day", "Hours"]);
    }
  });

  it("accepts a value-unit label on pictographs", () => {
    expect(described(pictograph({ valueUnitLabel: "students" }))["valueUnitLabel"]).toBe("students");
  });

  it("treats an empty value-unit label as no label, so the key says “units” (DEL-002)", () => {
    const graph = described(pictograph({ valueUnitLabel: "" }));
    expect("valueUnitLabel" in graph).toBe(false);
    // A blank (whitespace) label is kept: only the empty text means no label.
    expect(described(pictograph({ valueUnitLabel: " " }))["valueUnitLabel"]).toBe(" ");
  });

  it.each([
    ["pictograph", pictograph({ categoryAxisLabel: "Pet" }), "/categoryAxisLabel"],
    ["pictograph", pictograph({ valueAxisLabel: "Count" }), "/valueAxisLabel"],
    ["bar graph", bar({ valueUnitLabel: "students" }), "/valueUnitLabel"],
    ["line graph", line({ valueUnitLabel: "students" }), "/valueUnitLabel"],
    ["circle", { type: "circle", radius: 2, valueUnitLabel: "cm" }, "/valueUnitLabel"],
  ])("reports a label given on a %s as not applying", (_, input, path) => {
    expect(codesAndPaths(input)).toEqual([`inapplicable_property ${path}`]);
  });

  it("names the term and the graph type in the message", () => {
    expect(issuesOf(check(bar({ valueUnitLabel: "students" })))[0]!.message).toBe(
      "valueUnitLabel does not apply for a bar-graph; remove it.",
    );
  });

  it("reports a category color as not applying on a pictograph, and accepts it on a bar graph", () => {
    expect(described(bar({ categories: [{ name: "Mon", color: "red" }, { name: "Tue" }, { name: "Wed" }] }))["categories"]).toEqual([
      { name: "Mon", color: "#c62828" },
      { name: "Tue" },
      { name: "Wed" },
    ]);
    expect(codesAndPaths(pictograph({ categories: [{ name: "Cats", color: "red" }, { name: "Dogs" }] }))).toEqual([
      "inapplicable_property /categories/0/color",
    ]);
  });
});

describe("value scale terms (DGP-REQ-005)", () => {
  it("accepts a minimum, maximum and tick interval on line and bar graphs, each optional", () => {
    expect(described(bar({ valueScale: { minimum: 0, maximum: 10, tickInterval: 2 } }))["valueScale"]).toEqual({
      minimum: 0,
      maximum: 10,
      tickInterval: 2,
    });
    expect(check(line({ valueScale: { minimum: -10 } })).valid).toBe(true);
    expect(check(bar({ valueScale: { tickInterval: 1 } })).valid).toBe(true);
    expect(check(bar({ valueScale: {} })).valid).toBe(true);
  });

  it.each([
    ["pictograph", pictograph({ valueScale: { maximum: 10 } })],
    ["circle", { type: "circle", radius: 2, valueScale: { maximum: 10 } }],
  ])("reports a value scale on a %s as not applying", (_, input) => {
    expect(codesAndPaths(input)).toEqual(["inapplicable_property /valueScale"]);
  });

  it("reports a maximum not above the minimum once, in stage 2", () => {
    expect(codesAndPaths(bar({ valueScale: { minimum: 10, maximum: 10 } }))).toEqual(["out_of_range /valueScale/maximum"]);
  });

  it("reports an unknown part with a suggestion", () => {
    const [issue] = issuesOf(check(bar({ valueScale: { maximun: 10 } })));
    expect(issue).toMatchObject({ code: "unknown_property", path: "/valueScale/maximun", suggestion: "maximum" });
  });

  it("lists the data-graph terms with where they apply", () => {
    expect(Object.keys(dataGraphProperties)).toEqual(["valueUnitLabel", "valueScale"]);
    expect([...dataGraphProperties.valueUnitLabel.appliesTo]).toEqual(["pictograph"]);
    expect([...dataGraphProperties.valueScale.appliesTo]).toEqual(["line-graph", "bar-graph"]);
    expect(dataGraphProperties.valueScale.ordered).toEqual([["minimum", "maximum"]]);
  });
});

describe("value scale checks (DGP-REQ-007, DGP-REQ-008)", () => {
  it.each([0, -2])("reports a tick interval of %d as tick_spacing_invalid", (tickInterval) => {
    const [issue, ...rest] = issuesOf(check(bar({ valueScale: { maximum: 10, tickInterval } })));
    expect(rest).toEqual([]);
    expect(issue).toEqual({
      code: "tick_spacing_invalid",
      path: "/valueScale/tickInterval",
      message: `valueScale.tickInterval must be a number greater than 0; got ${tickInterval}.`,
    });
  });

  it("reports a tick interval that does not divide the scale", () => {
    expect(issuesOf(check(bar({ valueScale: { maximum: 10, tickInterval: 3 } })))).toEqual([
      {
        code: "tick_interval_not_dividing",
        path: "/valueScale/tickInterval",
        message: "valueScale.tickInterval must divide the value scale into whole intervals; got 3. Use a value that divides the scale range exactly.",
      },
    ]);
    expect(codesAndPaths(line({ valueScale: { minimum: -5, maximum: 5, tickInterval: 4 } }))).toEqual([
      "tick_interval_not_dividing /valueScale/tickInterval",
    ]);
  });

  it("accepts decimal intervals that divide the scale, despite binary rounding", () => {
    for (const valueScale of [
      { minimum: 0, maximum: 0.3, tickInterval: 0.1 },
      { minimum: 0.1, maximum: 0.7, tickInterval: 0.2 },
      { minimum: 0, maximum: 10, tickInterval: 2.5 },
      { maximum: 1.2, tickInterval: 0.3 },
    ]) {
      expect(check(bar({ values: [0.1, 0.2, 0.3], valueScale })).valid, JSON.stringify(valueScale)).toBe(true);
    }
  });

  it(`reports an interval giving more than ${MAX_VALUE_TICKS} ticks, without listing them`, () => {
    const [issue] = issuesOf(check(bar({ valueScale: { maximum: 100, tickInterval: 0.5 } })));
    expect(issue).toMatchObject({ code: "too_many_ticks", path: "/valueScale/tickInterval" });
    expect(issue!.message).toBe(
      "valueScale.tickInterval would draw 201 ticks, more than the limit of 100; use a larger tick spacing, such as 2.",
    );
    // A tiny interval over a huge range is counted, not listed: the check stays instant.
    const started = performance.now();
    expect(codesAndPaths(bar({ valueScale: { maximum: 1e9, tickInterval: 1e-300 } }))).toEqual(["too_many_ticks /valueScale/tickInterval"]);
    expect(performance.now() - started).toBeLessThan(100);
    expect(check(bar({ valueScale: { maximum: 99, tickInterval: 1 } })).valid).toBe(true);
  });

  it("reports each value outside a given scale at the value's own path", () => {
    const issues = issuesOf(check(bar({ values: [3, 12, 15], valueScale: { maximum: 10 } })));
    expect(issues.map((issue) => `${issue.code} ${issue.path}`)).toEqual(["scale_excludes_value /values/1", "scale_excludes_value /values/2"]);
    expect(issues[0]).toEqual({
      code: "scale_excludes_value",
      path: "/values/1",
      message: "values[1] (12) is outside the value scale, from 0 to 10; widen the scale or leave the scale out.",
      range: { min: 0, max: 10 },
    });
    expect(codesAndPaths(line({ values: [3, -5, 2], valueScale: { minimum: 0 } }))).toEqual(["scale_excludes_value /values/1"]);
  });

  it("reports a given maximum below the minimum chosen for it", () => {
    expect(issuesOf(check(bar({ values: [1, 2, 3], valueScale: { maximum: -5 } })))).toEqual([
      {
        code: "out_of_range",
        path: "/valueScale/maximum",
        message: "valueScale.maximum must be a number greater than 0; got -5.",
        range: { min: 0, exclusiveMin: true },
      },
    ]);
  });

  it("checks nothing when no scale is given: the default scale fits every value", () => {
    expect(checkValueScale([{ path: "/values/0", term: "values[0]", value: 1e9 }], undefined, { allowNegative: false })).toEqual([]);
    expect(check(line({ values: [-1e9, 1e9] })).valid).toBe(true);
  });

  it("uses a given scale exactly and never extends it", () => {
    expect(resolveValueScale({ minimum: 2, maximum: 7, tickInterval: 5 }, [100, -100], { allowNegative: true })).toEqual({
      minimum: 2,
      maximum: 7,
      tickInterval: 5,
    });
    expect(resolveValueScale({ maximum: 10 }, [30], { allowNegative: false }).maximum).toBe(10);
    expect(resolveValueScale({ minimum: 5 }, [-30], { allowNegative: true }).minimum).toBe(5);
  });
});
