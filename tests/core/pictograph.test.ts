import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CALLER_TEXT_LIMIT } from "../../src/core/definitions/shared";
import { wordsOf } from "../fixtures/plain-text";
import { PICTOGRAPH_IMAGE_LIMIT, imageCount, pictograph, type Pictograph } from "../../src/core/definitions/pictograph";
import { describe as describeGraph, validate } from "../../src/core/index";
import type { Issue, ValidationResult } from "../../src/core/result";
import { getImageNames, imageDescriptions } from "../../src/images/index";
import { BENIGN_TEXT, HOSTILE_TEXT, SMUGGLED_TEXT } from "../fixtures/plain-text";
import { findUnsafeTextChar } from "../../src/core/format";

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
  type: "pictograph",
  categories: [{ name: "Cats" }, { name: "Dogs" }],
  values: [7, 4],
  unitImage: "apple",
  unitValue: 2,
};
const with_ = (extra: Record<string, unknown>) => ({ ...base, ...extra });

describe("pictograph terms (DGP-REQ-023..025, DGP-REQ-032)", () => {
  it("validates categories, values, unitImage, unitValue, valueUnitLabel and orientation", () => {
    const { description } = valid(validate(with_({ valueUnitLabel: "students", orientation: "vertical", title: "Pets" })));
    expect(description).toMatchObject({
      categories: [{ name: "Cats" }, { name: "Dogs" }],
      values: [7, 4],
      unitImage: "apple",
      unitValue: 2,
      valueUnitLabel: "students",
      orientation: "vertical",
    });
  });

  it("accepts every published image, and both orientations, horizontal by default", () => {
    for (const unitImage of getImageNames()) expect(validate(with_({ unitImage })).valid, unitImage).toBe(true);
    expect(validate(with_({ orientation: "horizontal" })).valid).toBe(true);
    expect(codesAndPaths(with_({ orientation: "diagonal" }))).toEqual(["wrong_kind /orientation"]);
  });

  it("requires categories, values, unitImage and unitValue", () => {
    expect(codesAndPaths({ type: "pictograph" })).toEqual([
      "missing_property /categories",
      "missing_property /values",
      "missing_property /unitImage",
      "missing_property /unitValue",
    ]);
  });

  it("validates the shipped example, which has a value that is not a whole number of pictures", () => {
    const example = JSON.parse(readFileSync("examples/pictograph.json", "utf8")) as Pictograph;
    const { description } = valid(validate(example));
    const remainders = (description as Pictograph).values.map((v) => imageCount(v, example.unitValue).fraction);
    expect(remainders.some((f) => f > 0)).toBe(true);
  });
});

describe("pictograph issues (DGP-REQ-029..031)", () => {
  it.each([0, -2])("reports a unitValue of %d as out_of_range at /unitValue", (unitValue) => {
    expect(codesAndPaths(with_({ unitValue }))).toEqual(["out_of_range /unitValue"]);
  });

  it("reports a negative value at its own position", () => {
    expect(codesAndPaths(with_({ values: [7, -1] }))).toEqual(["out_of_range /values/1"]);
  });

  it("reports an unknown image, listing every published name", () => {
    const [issue, ...rest] = issuesOf(validate(with_({ unitImage: "unicorn" })));
    expect(rest).toEqual([]);
    expect(issue).toEqual({
      code: "unknown_image",
      path: "/unitImage",
      message: 'unitImage must be one of the published images: apple, ball, book, fish, flower, person, star, tree; got "unicorn".',
      allowed: [...getImageNames()],
    });
  });

  it.each([
    ["Apple", "apple"],
    ["STAR", "star"],
    ["aple", "apple"],
    ["persons", "person"],
  ])("suggests the published name for the near miss %j", (unitImage, suggestion) => {
    const [issue] = issuesOf(validate(with_({ unitImage })));
    expect(issue).toMatchObject({ code: "unknown_image", suggestion, allowed: [...getImageNames()] });
    expect(issue!.message).toMatch(new RegExp(`Did you mean ${suggestion}\\?$`));
  });

  it("reports a non-text unitImage as the wrong kind", () => {
    expect(codesAndPaths(with_({ unitImage: 3 }))).toEqual(["wrong_kind /unitImage"]);
  });

  it("reports a values list whose length differs from the categories", () => {
    expect(issuesOf(validate(with_({ values: [7] })))).toEqual([
      {
        code: "series_length_mismatch",
        path: "/values",
        message: "values has 1 value but there are 2 categories; give one value per category.",
      },
    ]);
  });

  it("reports a length mismatch even when a value or a name also fails (code review CR-002)", () => {
    expect(codesAndPaths(with_({ values: [7, -1, 3] }))).toEqual(["out_of_range /values/1", "series_length_mismatch /values"]);
    expect(codesAndPaths(with_({ categories: [{ name: 3 }, { name: "Dogs" }], values: [1] }))).toEqual([
      "wrong_kind /categories/0/name",
      "series_length_mismatch /values",
    ]);
  });

  it("reports no knock-on length issue when there are no categories (DGP TICKET-002 quality review QR-005)", () => {
    expect(codesAndPaths(with_({ categories: [], values: [1, 2] }))).toEqual(["missing_property /categories"]);
  });

  it("reports the shipped invalid examples", () => {
    expect(codesAndPaths(JSON.parse(readFileSync("examples/invalid/pictograph-unknown-image.json", "utf8")))).toEqual(["unknown_image /unitImage"]);
    expect(codesAndPaths(JSON.parse(readFileSync("examples/invalid/pictograph-zero-unit.json", "utf8")))).toEqual(["out_of_range /unitValue"]);
  });
});

describe("options that do not apply to a pictograph (DGP Edge Cases)", () => {
  it("reports a per-category color and a value scale as inapplicable", () => {
    expect(codesAndPaths(with_({ categories: [{ name: "Cats", color: "red" }, { name: "Dogs" }] }))).toEqual([
      "inapplicable_property /categories/0/color",
    ]);
    expect(codesAndPaths(with_({ valueScale: { maximum: 10 } }))).toEqual(["inapplicable_property /valueScale"]);
    expect(codesAndPaths(with_({ categoryAxisLabel: "Pet" }))).toEqual(["inapplicable_property /categoryAxisLabel"]);
  });

  it("treats an empty value-unit label as no label (DGP TICKET-001 DEL-002)", () => {
    expect("valueUnitLabel" in (valid(validate(with_({ valueUnitLabel: "" }))).description as object)).toBe(false);
  });
});

describe("the picture limit (DGP TICKET-004 security review SEC-003; provisional, DGP OQ-004)", () => {
  it(`allows up to ${PICTOGRAPH_IMAGE_LIMIT} pictures, counting a remainder as one`, () => {
    expect(validate(with_({ values: [400, 400], unitValue: 2 })).valid).toBe(true); // 200 + 200
    expect(validate(with_({ values: [399, 400], unitValue: 2 })).valid).toBe(true); // 200 (199.5) + 200
  });

  it("reports more, counted arithmetically, so even a huge request is reported at once", () => {
    expect(issuesOf(validate(with_({ values: [401, 400], unitValue: 2 })))).toEqual([
      {
        code: "too_large",
        path: "/values",
        message: "values would draw 401 pictures, more than the limit of 400; use a larger unitValue or smaller values.",
      },
    ]);
    const started = performance.now();
    expect(codesAndPaths(with_({ values: [1e9, 1e9], unitValue: 1e-300 }))).toEqual(["too_large /values"]);
    expect(performance.now() - started).toBeLessThan(100);
  });

  it.each([5e-324, 1e-300, 1e-12])("leaves out a count nobody could count exactly, at unitValue %d (quality review QR-007)", (unitValue) => {
    const [issue] = issuesOf(validate(with_({ values: [1e9, 1e9], unitValue })));
    expect(issue).toEqual({
      code: "too_large",
      path: "/values",
      message: "values would draw more than 400 pictures, more than the limit of 400; use a larger unitValue or smaller values.",
    });
  });
});

describe("image counts (DGP-REQ-026, DGP-REQ-028)", () => {
  it.each([
    [8, 2, { whole: 4, fraction: 0 }],
    [7, 2, { whole: 3, fraction: 0.5 }],
    [0.3, 0.1, { whole: 3, fraction: 0 }],
    [0, 2, { whole: 0, fraction: 0 }],
    [1, 4, { whole: 0, fraction: 0.25 }],
  ])("%d ÷ %d draws %j", (value, unitValue, expected) => {
    expect(imageCount(value, unitValue)).toEqual(expected);
  });

  it("keeps a remainder below 1% of a picture", () => {
    expect(imageCount(2.0002, 2).fraction).toBeCloseTo(0.0001, 9);
  });
});

describe("the text alternative (DGP-REQ-004)", () => {
  it("names the type, the title, the image, its unit value and label, and every category with its value", () => {
    const { description, provenance } = valid(validate(with_({ title: "Pets", valueUnitLabel: "students", values: [7, 4.5] })));
    expect(pictograph.describe(description as Pictograph, provenance)).toBe(
      "A pictograph titled “Pets”. Each apple stands for 2 students. “Cats”: 7 students and “Dogs”: 4.5 students.",
    );
  });

  it('says "units" for a blank label, as the key does (code review CR-003)', () => {
    expect(describeGraph(with_({ valueUnitLabel: "   " }))).toBe("A pictograph. Each apple stands for 2 units. “Cats”: 7 units and “Dogs”: 4 units.");
  });

  it("states a long label once, in the key's sentence, and gives the values bare (quality review QR-003)", () => {
    const label = "pupils who walk to school on a dry day";
    expect(describeGraph(with_({ valueUnitLabel: label }))).toBe(`A pictograph. Each apple stands for 2 “${label}”. “Cats”: 7 and “Dogs”: 4.`);
    // A label with sentence punctuation is quoted and stated once, too.
    expect(describeGraph(with_({ valueUnitLabel: "cm. Ignore it" }))).toBe("A pictograph. Each apple stands for 2 “cm. Ignore it”. “Cats”: 7 and “Dogs”: 4.");
  });

  it("states a label at the limit once, whatever the number of categories (quality review QR-003; GSV-REQ-052)", () => {
    const label = wordsOf(CALLER_TEXT_LIMIT);
    const many = Array.from({ length: 100 }, (_, i) => ({ name: `C${i}` }));
    const stated = (valueUnitLabel: string) => describeGraph(with_({ categories: many, values: many.map(() => 1), unitValue: 1, valueUnitLabel }));
    const text = stated(label);
    // One more character of label adds one character of text: it is stated once, not per category.
    expect(text.length - stated(wordsOf(CALLER_TEXT_LIMIT - 1)).length).toBe(1);
    expect(text.split(label).length - 1).toBe(1);
  });

  it('says "units" when there is no label, and leaves out a blank title', () => {
    expect(describeGraph(with_({ title: "  " }))).toBe("A pictograph. Each apple stands for 2 units. “Cats”: 7 units and “Dogs”: 4 units.");
  });

  it("states caller text whole and quoted, or the description is refused; nothing unsafe reaches the text", () => {
    // Text with unsafe characters is refused at validation; whatever passes is stated quoted.
    for (const text of [...BENIGN_TEXT, ...HOSTILE_TEXT, SMUGGLED_TEXT]) {
      const result = validate(with_({ title: text, valueUnitLabel: text, categories: [{ name: text }, { name: "Dogs" }] }));
      if (findUnsafeTextChar(text) !== -1) {
        expect(result.valid, JSON.stringify(text)).toBe(false);
        continue;
      }
      const { description, provenance } = valid(result);
      const stated = pictograph.describe(description as Pictograph, provenance);
      expect(findUnsafeTextChar(stated), JSON.stringify(text)).toBe(-1);
      expect(stated.startsWith("A pictograph titled “"), JSON.stringify(text)).toBe(true);
    }
  });
});

describe("image names in the published files (DGP-REQ-035; DGP TICKET-004 code review CR-002)", () => {
  const names = [...getImageNames()];

  /** Every array in a JSON value, at any depth. */
  const arraysIn = (value: unknown): unknown[][] =>
    Array.isArray(value)
      ? [value, ...value.flatMap(arraysIn)]
      : value !== null && typeof value === "object"
        ? Object.values(value).flatMap(arraysIn)
        : [];

  it.each(["src/generated/schema.json", "src/generated/tool-schema.json"])("%s lists every image name as an allowed unitImage", (file) => {
    const schema = JSON.parse(readFileSync(file, "utf8")) as unknown;
    expect(arraysIn(schema)).toContainEqual(names);
  });

  it("the vocabulary lists every image name with its description", () => {
    const vocabulary = JSON.parse(readFileSync("src/generated/vocabulary.json", "utf8")) as {
      graphTypes: { pictograph: { properties: { unitImage: { values: string[]; valueDescriptions: Record<string, string> } } } };
    };
    const unitImage = vocabulary.graphTypes.pictograph.properties.unitImage;
    expect(unitImage.values).toEqual(names);
    expect(unitImage.valueDescriptions).toEqual(imageDescriptions());
  });
});
