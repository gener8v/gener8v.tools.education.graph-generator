import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ruler } from "../../src/core/definitions/ruler";
import { sharedProperties } from "../../src/core/definitions/shared";
import type { GraphType, GraphTypeDefinition } from "../../src/core/definitions/types";
import type { Issue, ValidationResult } from "../../src/core/result";
import { validateWith } from "../../src/core/validate/index";

// The ruler is registered with its layout (rulers NLC TICKET-003; DEL-002), so it is tested here
// against a registry holding only it.
const registry = Object.freeze(
  Object.assign(Object.create(null) as Partial<Record<GraphType, GraphTypeDefinition>>, { ruler: ruler as GraphTypeDefinition }),
);
const check = (input: Record<string, unknown>) => validateWith(input, registry);
const issuesOf = (result: ValidationResult<unknown>): Issue[] => (result.valid ? [] : result.issues);
const found = (input: Record<string, unknown>) => issuesOf(check(input)).map((issue) => `${issue.code} ${issue.path}`);
const cm = (extra: Record<string, unknown> = {}) => ({ type: "ruler", rulerUnit: "centimeters", length: 15, ...extra });
const inches = (extra: Record<string, unknown> = {}) => ({ type: "ruler", rulerUnit: "inches", length: 6, ...extra });
const object = (start: unknown, end: unknown, extra: Record<string, unknown> = {}) => ({ measuredObject: { start, end, ...extra } });
const example = (path: string) => JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
const textOf = (input: Record<string, unknown>) => {
  const result = check(input);
  if (!result.valid) throw new Error(`expected a valid ruler: ${JSON.stringify(result.issues)}`);
  return ruler.describe(result.description as never, result.provenance);
};

describe("the ruler's terms (NLC-REQ-001, NLC-REQ-041, NLC-REQ-046, NLC-REQ-049; DEL-001)", () => {
  it("names its terms in camel case, the unit rulerUnit since unit is the circle's", () => {
    expect(ruler.type).toBe("ruler");
    expect(Object.keys(ruler.properties)).toEqual(["rulerUnit", "length", "smallestDivision", "measuredObject"]);
    const measured = ruler.properties["measuredObject"]!;
    expect(measured.kind === "object" && Object.keys(measured.properties)).toEqual(["start", "end", "label", "color"]);
  });

  it("nests the shared label and color themselves on the measured object (GSV-REQ-040)", () => {
    const measured = ruler.properties["measuredObject"]!;
    expect(measured.kind === "object" && measured.properties["label"]).toBe(sharedProperties.label);
    expect(measured.kind === "object" && measured.properties["color"]).toBe(sharedProperties.color);
  });

  it("takes the unit and division lists from the mark rule, and makes the division apply only to inches (GSV-REQ-049..051)", () => {
    expect(ruler.properties["rulerUnit"]).toMatchObject({ kind: "enum", values: ["centimeters", "inches"] });
    expect(ruler.properties["smallestDivision"]).toMatchObject({
      kind: "enum",
      required: false,
      values: ["half", "quarter", "eighth", "sixteenth"],
      appliesWhen: { term: "rulerUnit", values: ["inches"] },
    });
  });
});

describe("validating a ruler (NLC-REQ-041, NLC-REQ-042)", () => {
  it("accepts both units, the examples, and every length up to each unit's maximum", () => {
    expect(check(example("examples/ruler.json")).valid).toBe(true);
    expect(check(cm()).valid).toBe(true);
    expect(check(cm({ length: 30 })).valid).toBe(true);
    expect(check(inches({ length: 12 })).valid).toBe(true);
    expect(check(inches({ length: 1, smallestDivision: "half" })).valid).toBe(true);
  });

  it.each(["cm", "centimetres", "feet", "Inches"])("reports the unit %j, listing the accepted names", (rulerUnit) => {
    const [issue, ...rest] = issuesOf(check(cm({ rulerUnit })));
    expect(rest).toEqual([]);
    expect(issue).toMatchObject({ code: "wrong_kind", path: "/rulerUnit", allowed: ["centimeters", "inches"] });
    expect(issue!.message).toContain("centimeters, inches");
  });

  it("reports a length that is not whole, not positive, or past its unit's maximum, with the lengths allowed", () => {
    expect(found(cm({ length: 4.5 }))).toEqual(["wrong_kind /length"]);
    expect(found(cm({ length: 0 }))).toEqual(["out_of_range /length"]);
    expect(found(cm({ length: -3 }))).toEqual(["out_of_range /length"]);
    expect(found(cm({ length: 31 }))).toEqual(["out_of_range /length"]);
    const [inch] = issuesOf(check(inches({ length: 13 })));
    expect(inch).toMatchObject({ code: "out_of_range", path: "/length", range: { min: 1, max: 12 } });
    expect(inch!.message).toBe("length must be a number between 1 and 12; got 13.");
  });

  it("reports a smallest division on a centimeter ruler as not applying (GSV-REQ-051)", () => {
    const [issue, ...rest] = issuesOf(check(cm({ smallestDivision: "half" })));
    expect(rest).toEqual([]);
    expect(issue).toMatchObject({ code: "inapplicable_property", path: "/smallestDivision", conflicts: ["/rulerUnit"] });
    expect(issue!.message).toBe('smallestDivision applies to a ruler only when rulerUnit is "inches"; remove it.');
    expect(found(inches({ smallestDivision: "eighths" }))).toEqual(["wrong_kind /smallestDivision"]);
  });

  it("reports a label or color given for the whole ruler as belonging on the measured object", () => {
    const [issue] = issuesOf(check(cm({ label: "pencil" })));
    expect(issue).toMatchObject({ code: "inapplicable_property", path: "/label" });
    expect(issue!.message).toContain("the measuredObject");
  });
});

describe("the measured object (NLC-REQ-049, NLC-REQ-051..054)", () => {
  it("accepts an object from any mark to any later mark, the ruler's ends included, with a label and color", () => {
    expect(check(cm(object(0, 15))).valid).toBe(true);
    expect(check(cm(object(3.4, 7.1, { label: "crayon", color: "blue" }))).valid).toBe(true);
    expect(check(cm(object(0.7, 2.3))).valid).toBe(true);
    expect(check(inches(object(2.0625, 5.9375))).valid).toBe(true);
    expect(check(inches(object(1, 3.5, { label: "" }))).valid).toBe(true);
  });

  it("accepts ends a caller's code computed with decimal noise, at a mark and at the ruler's ends", () => {
    expect(check(cm(object(0.1 + 0.2, 1.1 + 2.2))).valid).toBe(true);
    expect(check(cm({ length: 30, ...object(0.3 - 0.1 - 0.2, 0.1 * 3 * 100) })).valid).toBe(true);
  });

  it("reports an object whose start is not before its end, once, at its end (NLC-REQ-051)", () => {
    expect(found(cm(object(2, 2)))).toEqual(["out_of_range /measuredObject/end"]);
    expect(found(cm(object(5, 3)))).toEqual(["out_of_range /measuredObject/end"]);
    // The same mark written two ways passes the structure stage's order check, and is still reported.
    expect(0.3 > 0.1 + 0.2).toBe(false);
    const [issue, ...rest] = issuesOf(check(cm(object(0.3, 0.1 + 0.2))));
    expect(rest).toEqual([]);
    expect(issue).toMatchObject({ code: "out_of_range", path: "/measuredObject/end", range: { min: 0.3, exclusiveMin: true } });
  });

  it("reports an end off the ruler at its path, naming the ruler's range, and not also between marks (NLC-REQ-052)", () => {
    const [issue, ...rest] = issuesOf(check(cm(object(2, 15.05))));
    expect(rest).toEqual([]);
    expect(issue).toMatchObject({ code: "out_of_range", path: "/measuredObject/end", range: { min: 0, max: 15 } });
    expect(found(inches(object(1, 7)))).toEqual(["out_of_range /measuredObject/end"]);
    expect(found(cm(object(-0.1, 3)))).toEqual(["out_of_range /measuredObject/start"]);
    expect(found(cm(object(2, 31)))).toEqual(["out_of_range /measuredObject/end"]);
  });

  it("reports an end between marks, naming the nearest marks on either side (NLC-REQ-053, DEL-003)", () => {
    const [issue, ...rest] = issuesOf(check(cm(object(2, 7.25))));
    expect(rest).toEqual([]);
    expect(issue).toEqual({
      code: "not_on_mark",
      path: "/measuredObject/end",
      message: "measuredObject.end must be on a mark of the ruler; got 7.25, between the marks at 7.2 and 7.3.",
    });
    expect(found(inches({ smallestDivision: "eighth", ...object(1.3, 2) }))).toEqual(["not_on_mark /measuredObject/start"]);
    expect(issuesOf(check(inches({ smallestDivision: "eighth", ...object(1.3, 2) })))[0]!.message).toContain("between the marks at 1.25 and 1.375");
    // 2.0625 is a sixteenth: a mark at the default division, not at eighths.
    expect(check(inches(object(2.0625, 3))).valid).toBe(true);
    expect(found(inches({ smallestDivision: "eighth", ...object(2.0625, 3) }))).toEqual(["not_on_mark /measuredObject/start"]);
  });

  it("checks no end against the wrong marks: a refused or inapplicable division skips the check (NLC TICKET-001 code review CR-001)", () => {
    expect(found(inches({ smallestDivision: "eighths", ...object(2.0625, 3) }))).toEqual(["wrong_kind /smallestDivision"]);
    expect(found(cm({ smallestDivision: "eighth", ...object(2.05, 3) }))).toEqual(["inapplicable_property /smallestDivision"]);
    // And an inch ruler too long for its unit reports the length only.
    expect(found(inches({ length: 20, ...object(1.3, 19) }))).toEqual(["out_of_range /length"]);
  });

  it("reports both ends when both are wrong, each once", () => {
    expect(found(cm(object(-1, 7.25)))).toEqual(["out_of_range /measuredObject/start", "not_on_mark /measuredObject/end"]);
  });
});

describe("the text alternative (NLC-REQ-056, NLC-REQ-055)", () => {
  it("states the unit, the length, the smallest division, and the object's label and marks", () => {
    expect(textOf(example("examples/ruler.json"))).toBe(
      'A ruler titled “How long is the pencil?”, 6 inches long, numbered every inch and marked to eighths of an inch. An object labeled “pencil” lies along it from the 1.5 in mark to the 4.25 in mark.',
    );
    expect(textOf(cm(object(2, 7.5)))).toBe(
      "A ruler, 15 centimeters long, numbered every centimeter and marked to millimeters. An object lies along it from the 2 cm mark to the 7.5 cm mark.",
    );
  });

  it("states the default division when none is given, and a one-unit ruler in the singular", () => {
    expect(textOf(inches({ length: 1 }))).toBe("A ruler, 1 inch long, numbered every inch and marked to sixteenths of an inch.");
  });

  it("never states the object's length", () => {
    const text = textOf(cm(object(2, 7.5, { label: "pencil" })));
    expect(text).not.toMatch(/5\.5/);
    expect(text).not.toMatch(/\blength\b|\bmeasures\b/i);
  });

  it("quotes the caller's label and title, and treats a blank one as none", () => {
    expect(textOf(cm(object(2, 3, { label: 'a "pencil"' })))).toContain('labeled “a "pencil"”');
    expect(textOf(cm({ title: "   ", ...object(2, 3, { label: "  " }) }))).toBe(
      "A ruler, 15 centimeters long, numbered every centimeter and marked to millimeters. An object lies along it from the 2 cm mark to the 3 cm mark.",
    );
  });
});

describe("the ruler's examples", () => {
  it("gives each invalid example exactly its documented issue", () => {
    expect(found(example("examples/invalid/ruler-object-between-marks.json"))).toEqual(["not_on_mark /measuredObject/end"]);
    expect(found(example("examples/invalid/ruler-unknown-unit.json"))).toEqual(["wrong_kind /rulerUnit"]);
  });

  it("uses every optional term once in examples/ruler.json", () => {
    const main = example("examples/ruler.json");
    expect(Object.keys(main).sort()).toEqual(["length", "measuredObject", "rulerUnit", "smallestDivision", "title", "type"]);
    expect(Object.keys(main["measuredObject"] as object).sort()).toEqual(["color", "end", "label", "start"]);
  });
});
