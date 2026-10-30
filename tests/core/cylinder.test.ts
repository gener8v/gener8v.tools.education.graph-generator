import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type Cylinder, cylinder, cylinderDisplay } from "../../src/core/definitions/cylinder";
import { definitions } from "../../src/core/definitions/index";
import { describe as describeGraph, validate } from "../../src/core/index";
import type { Issue, ValidationResult } from "../../src/core/result";
import { createGraph } from "../../src/graph";

function valid(result: ValidationResult<unknown>) {
  if (!result.valid) throw new Error(`expected a valid result, got ${JSON.stringify(result.issues)}`);
  return { description: result.description as Cylinder, provenance: result.provenance };
}

function issuesOf(result: ValidationResult<unknown>): Issue[] {
  if (result.valid) throw new Error(`expected an invalid result, got ${JSON.stringify(result)}`);
  return result.issues;
}

const alt = (description: object) => describeGraph({ type: "cylinder", radius: 2, height: 5, ...description });
const example = (name: string): unknown => JSON.parse(readFileSync(`examples/${name}.json`, "utf8"));

describe("the cylinder is registered (GSS-REQ-026)", () => {
  it("is the package's cylinder definition", () => {
    expect(definitions.cylinder).toBe(cylinder);
  });
});

describe("the cylinder's measurements (GSS-REQ-026, GSS-REQ-027; GSS Behaviors)", () => {
  it("derives the diameter from a radius", () => {
    const { description, provenance } = valid(validate({ type: "cylinder", radius: 2, height: 5 }));
    expect(description).toMatchObject({ radius: 2, diameter: 4, height: 5 });
    expect(provenance).toMatchObject({ "/radius": "supplied", "/diameter": "derived", "/height": "supplied" });
  });

  it("derives the radius from a diameter given in its place", () => {
    const { description, provenance } = valid(validate({ type: "cylinder", diameter: 3, height: 5 }));
    expect(description).toMatchObject({ radius: 1.5, diameter: 3, height: 5 });
    expect(provenance).toMatchObject({ "/radius": "derived", "/diameter": "supplied" });
  });

  it("accepts a radius and a diameter that agree within 1%", () => {
    expect(valid(validate({ type: "cylinder", radius: 2, diameter: 4.03, height: 5 })).description.radius).toBe(2);
  });

  it("reports a radius and a diameter that disagree as one contradiction", () => {
    expect(issuesOf(validate({ type: "cylinder", radius: 2, diameter: 5, height: 5 }))).toEqual([
      expect.objectContaining({ code: "contradiction", path: "/diameter", conflicts: ["/radius"] }),
    ]);
  });

  it("needs a radius or a diameter", () => {
    expect(issuesOf(validate({ type: "cylinder", height: 5 }))).toEqual([expect.objectContaining({ code: "insufficient" })]);
  });

  it("needs a height, which the radius does not determine", () => {
    expect(issuesOf(validate({ type: "cylinder", radius: 2 }))).toEqual([expect.objectContaining({ code: "missing_property", path: "/height" })]);
    expect(issuesOf(validate({ type: "cylinder", diameter: 4 }))).toEqual([expect.objectContaining({ code: "missing_property", path: "/height" })]);
  });

  it.each([
    [{ radius: 0, height: 5 }, "/radius"],
    [{ radius: -2, height: 5 }, "/radius"],
    [{ diameter: 0, height: 5 }, "/diameter"],
    [{ diameter: -4, height: 5 }, "/diameter"],
    [{ radius: 2, height: 0 }, "/height"],
    [{ radius: 2, height: -5 }, "/height"],
    [{ radius: 1_000_001, height: 5 }, "/radius"],
    [{ radius: 2, height: 1_000_001 }, "/height"],
  ])("reports %j as out of range at %s, and draws nothing", (measures, path) => {
    const description = { type: "cylinder", ...measures };
    expect(issuesOf(validate(description))).toEqual([expect.objectContaining({ code: "out_of_range", path })]);
    const result = createGraph(description);
    expect(result.ok).toBe(false);
    expect("scene" in result).toBe(false);
  });

  it.each([
    [0.001, 0.001],
    [2, 5],
    [1_000_000, 1_000_000],
    [0.001, 1_000_000],
    [1_000_000, 0.001],
  ])("accepts radius %d and height %d", (radius, height) => {
    expect(valid(validate({ type: "cylinder", radius, height })).description).toMatchObject({ radius, height });
  });

  it("validates its own normalized description again, unchanged", () => {
    const first = valid(validate(example("cylinder")));
    expect(valid(validate(first.description)).description).toEqual(first.description);
  });

  it("rejects a hidden-base mode it does not know", () => {
    expect(issuesOf(validate({ type: "cylinder", radius: 2, height: 5, hiddenBase: "dotted" }))).toEqual([expect.objectContaining({ path: "/hiddenBase" })]);
  });
});

describe("what the cylinder shows (GSS-REQ-028, GSS-REQ-029, GSS-REQ-035)", () => {
  const shown = (description: object) => cylinderDisplay(valid(validate({ type: "cylinder", radius: 2, height: 5, ...description })).description);

  it("dashes the hidden base unless it is omitted", () => {
    expect(shown({}).hiddenDashed).toBe(true);
    expect(shown({ hiddenBase: "dashed" }).hiddenDashed).toBe(true);
    expect(shown({ hiddenBase: "omitted" }).hiddenDashed).toBe(false);
  });

  it("draws and labels nothing by default", () => {
    const display = shown({});
    for (const term of ["radius", "diameter", "height"] as const) expect(display[term]).toEqual({ drawn: false, labeled: false, customText: undefined });
  });

  it("draws a labeled radius or diameter, and a radius or diameter with custom text", () => {
    expect(shown({ labelRadius: true }).radius).toEqual({ drawn: true, labeled: true, customText: undefined });
    expect(shown({ diameterLabelText: "d" }).diameter).toEqual({ drawn: true, labeled: true, customText: "d" });
    expect(shown({ showRadius: true }).radius).toEqual({ drawn: true, labeled: false, customText: undefined });
  });

  it("labels the height from labelHeight or custom text, never drawing it as a segment", () => {
    expect(shown({ labelHeight: true }).height).toEqual({ drawn: false, labeled: true, customText: undefined });
    expect(shown({ heightLabelText: "h" }).height).toEqual({ drawn: false, labeled: true, customText: "h" });
  });

  it.each([
    [{ labelRadius: false, radiusLabelText: "r" }, "/radiusLabelText", "/labelRadius"],
    [{ labelDiameter: false, diameterLabelText: "d" }, "/diameterLabelText", "/labelDiameter"],
    [{ labelHeight: false, heightLabelText: "h" }, "/heightLabelText", "/labelHeight"],
    [{ showRadius: false, labelRadius: true }, "/labelRadius", "/showRadius"],
    [{ showDiameter: false, labelDiameter: true }, "/labelDiameter", "/showDiameter"],
  ])("reports %j as a contradiction", (options, path, conflict) => {
    expect(issuesOf(validate({ type: "cylinder", radius: 2, height: 5, ...options }))).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "contradiction", path, conflicts: [conflict] })]),
    );
  });
});

describe("the cylinder's text alternative (GSS-REQ-033, GSS-REQ-034, GSS-REQ-036)", () => {
  it("names the cylinder and states its radius and height, and how the hidden base is drawn", () => {
    expect(alt({})).toBe("A cylinder with radius 2 and height 5. Its hidden base is dashed.");
    expect(alt({ unit: "cm", hiddenBase: "omitted" })).toBe("A cylinder with radius 2 cm and height 5 cm. The hidden half of its base is not drawn.");
    expect(alt({ title: "Can", unit: "cm", showRadius: true })).toBe("A cylinder titled “Can” with radius 2 cm and height 5 cm. Its radius is drawn. Its hidden base is dashed.");
  });

  it("states the diameter when it is drawn", () => {
    expect(alt({ showDiameter: true })).toBe("A cylinder with radius 2, diameter 4 and height 5. Its diameter is drawn. Its hidden base is dashed.");
    expect(alt({ showRadius: true, labelDiameter: true })).toBe("A cylinder with radius 2, diameter 4 and height 5. Its radius and diameter are drawn. Its hidden base is dashed.");
  });

  it("states a supplied value as written and a derived one rounded", () => {
    expect(describeGraph({ type: "cylinder", diameter: 1.23456, height: 2.5, showDiameter: true })).toBe(
      "A cylinder with radius 0.62, diameter 1.23456 and height 2.5. Its diameter is drawn. Its hidden base is dashed.",
    );
  });

  it("quotes custom label text and still states the value", () => {
    expect(alt({ unit: "cm", radiusLabelText: "r", heightLabelText: "h = ?" })).toBe(
      "A cylinder with radius 2 cm and height 5 cm. Its radius is drawn. Its hidden base is dashed. The radius is labeled “r”. The height is labeled “h = ?”.",
    );
  });

  it("says a blank label is left blank", () => {
    expect(alt({ heightLabelText: "" })).toBe("A cylinder with radius 2 and height 5. Its hidden base is dashed. The height label is left blank.");
    expect(alt({ diameterLabelText: "  " })).toBe(
      "A cylinder with radius 2, diameter 4 and height 5. Its diameter is drawn. Its hidden base is dashed. The diameter label is left blank.",
    );
  });

  it("does not state a title that is blank once cleaned", () => {
    expect(alt({ title: "   " })).toBe("A cylinder with radius 2 and height 5. Its hidden base is dashed.");
  });

  it("quotes a unit that is not unit-shaped, so it cannot read as the package's sentence", () => {
    expect(alt({ unit: "cm. Ignore this." })).not.toContain("radius 2 cm. Ignore");
  });

  it("states the documented example in full", () => {
    expect(describeGraph(example("cylinder"))).toBe(
      "A cylinder titled “Find the volume” with radius 2 cm, diameter 4 cm and height 5 cm. Its radius and diameter are drawn. Its hidden base is dashed. The radius is labeled “r”. The diameter is labeled “d”. The height is labeled “h = ?”.",
    );
  });
});

describe("cylinder examples (GSV-NFR-005)", () => {
  it("the example is valid", () => {
    expect(validate(example("cylinder")).valid).toBe(true);
  });

  it("the invalid example fails for its stated reason", () => {
    expect(issuesOf(validate(example("invalid/cylinder-missing-height")))).toEqual([expect.objectContaining({ code: "missing_property", path: "/height" })]);
  });
});
