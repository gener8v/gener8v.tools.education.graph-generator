import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { circle, circleDisplay, type Circle } from "../../src/core/definitions/circle";
import { definitions } from "../../src/core/definitions/index";
import { describe as describeGraph, validate } from "../../src/core/index";
import type { Issue, ValidationResult } from "../../src/core/result";
import { createGraph } from "../../src/graph";

function valid(result: ValidationResult<unknown>) {
  if (!result.valid) throw new Error(`expected a valid result, got ${JSON.stringify(result.issues)}`);
  return { description: result.description as Circle, provenance: result.provenance };
}

function issuesOf(result: ValidationResult<unknown>): Issue[] {
  if (result.valid) throw new Error(`expected an invalid result, got ${JSON.stringify(result)}`);
  return result.issues;
}

describe("the circle is registered (GSS-REQ-001)", () => {
  it("is the package's circle definition", () => {
    expect(definitions.circle).toBe(circle);
  });
});

describe("circle derivation (GSS-REQ-001, GSS-REQ-002; AD-004)", () => {
  it("derives diameter and circumference from a radius, with provenance", () => {
    const { description, provenance } = valid(validate({ type: "circle", radius: 5 }));
    expect(description.diameter).toBe(10);
    expect(description.circumference).toBeCloseTo(31.4159, 4);
    expect(provenance).toEqual({ "/radius": "supplied", "/diameter": "derived", "/circumference": "derived" });
  });

  it("derives the other two from a diameter alone", () => {
    const { description, provenance } = valid(validate({ type: "circle", diameter: 10 }));
    expect(description.radius).toBe(5);
    expect(description.circumference).toBeCloseTo(10 * Math.PI, 9);
    expect(provenance).toEqual({ "/diameter": "supplied", "/radius": "derived", "/circumference": "derived" });
  });

  it("derives the other two from a circumference alone", () => {
    const { description, provenance } = valid(validate({ type: "circle", circumference: 2 * Math.PI }));
    expect(description.radius).toBeCloseTo(1, 12);
    expect(description.diameter).toBeCloseTo(2, 12);
    expect(provenance).toEqual({ "/circumference": "supplied", "/radius": "derived", "/diameter": "derived" });
  });

  it("accepts a dependent value within 1%, keeping it as supplied", () => {
    const { description, provenance } = valid(validate({ type: "circle", radius: 5, circumference: 31.4 }));
    expect(description.circumference).toBe(31.4);
    expect(provenance["/circumference"]).toBe("supplied");
  });

  it("reports one contradiction naming /radius and /diameter, with the agreeing value", () => {
    const issues = issuesOf(validate({ type: "circle", radius: 5, diameter: 12 }));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ code: "contradiction", path: "/diameter", conflicts: ["/radius"] });
    expect(issues[0]!.message).toContain("a value of 10 would agree");
  });

  it("needs one of radius, diameter or circumference", () => {
    expect(issuesOf(validate({ type: "circle", showCenter: true }))).toEqual([
      expect.objectContaining({ code: "insufficient", path: "" }),
    ]);
  });

  it.each([
    ["radius", 0],
    ["radius", -5],
    ["diameter", 0],
    ["diameter", -1],
    ["circumference", 0],
    ["circumference", -31.4],
  ])("reports %s %d as out of range, and draws nothing", (term, value) => {
    const description = { type: "circle", [term]: value };
    expect(issuesOf(validate(description))).toEqual([expect.objectContaining({ code: "out_of_range", path: `/${term}` })]);
    const result = createGraph(description);
    expect(result.ok).toBe(false);
    expect("scene" in result).toBe(false);
  });

  it("keeps every derived value inside its own member's range (GSV TICKET-004 code review CR-001)", () => {
    // The largest circumference derives a radius just above the radius maximum.
    expect(issuesOf(validate({ type: "circle", circumference: 6_283_186 }))).toEqual([
      expect.objectContaining({ code: "out_of_range", path: "/circumference" }),
    ]);
    for (const radius of [0.001, 1_000_000]) {
      const { description } = valid(validate({ type: "circle", radius }));
      expect(valid(validate({ type: "circle", diameter: description.diameter })).description.radius).toBeCloseTo(radius, 9);
      expect(valid(validate({ type: "circle", circumference: description.circumference })).description.radius).toBeCloseTo(radius, 9);
    }
  });

  it("validates its own normalized description again, unchanged", () => {
    const first = valid(validate({ type: "circle", circumference: 31.4, showRadius: true }));
    expect(valid(validate(first.description)).description).toEqual(first.description);
  });
});

describe("label switches agree with what turns them on (GSS-REQ-006, GSS-REQ-035)", () => {
  it("labels a measurement given custom text, and draws a labeled radius or diameter", () => {
    const shown = circleDisplay(valid(validate({ type: "circle", radius: 1, radiusLabelText: "r", labelDiameter: true })).description);
    expect(shown.radius).toEqual({ drawn: true, labeled: true, customText: "r" });
    expect(shown.diameter).toEqual({ drawn: true, labeled: true, customText: undefined });
    expect(shown.circumference).toEqual({ drawn: false, labeled: false, customText: undefined });
  });

  it("never draws the circumference as a segment", () => {
    const shown = circleDisplay(valid(validate({ type: "circle", radius: 1, labelCircumference: true })).description);
    expect(shown.circumference).toEqual({ drawn: false, labeled: true, customText: undefined });
  });

  it.each([
    [{ labelRadius: false, radiusLabelText: "r" }, "/radiusLabelText", "/labelRadius"],
    [{ labelDiameter: false, diameterLabelText: "d" }, "/diameterLabelText", "/labelDiameter"],
    [{ labelCircumference: false, circumferenceLabelText: "C" }, "/circumferenceLabelText", "/labelCircumference"],
    [{ showRadius: false, labelRadius: true }, "/labelRadius", "/showRadius"],
    [{ showRadius: false, radiusLabelText: "" }, "/radiusLabelText", "/showRadius"],
    [{ showDiameter: false, labelDiameter: true }, "/labelDiameter", "/showDiameter"],
    [{ showDiameter: false, diameterLabelText: "d" }, "/diameterLabelText", "/showDiameter"],
  ])("reports %j as a contradiction", (options, path, conflict) => {
    const issues = issuesOf(validate({ type: "circle", radius: 1, ...options }));
    expect(issues).toEqual([expect.objectContaining({ code: "contradiction", path, conflicts: [conflict] })]);
  });

  it("accepts switches that agree, or that are off with nothing turning them on", () => {
    for (const options of [
      { labelRadius: true, radiusLabelText: "r", showRadius: true },
      { labelRadius: false, showRadius: false, labelDiameter: false, showDiameter: false, labelCircumference: false },
      { showRadius: false, labelRadius: false },
    ]) {
      expect(validate({ type: "circle", radius: 1, ...options }).valid, JSON.stringify(options)).toBe(true);
    }
  });

  it("keeps empty custom text as a blank label, not as no label (GSV TICKET-003 code review CR-007; DEL-003)", () => {
    const { description } = valid(validate({ type: "circle", radius: 1, radiusLabelText: "" }));
    expect(description.radiusLabelText).toBe("");
    expect(circleDisplay(description).radius).toEqual({ drawn: true, labeled: true, customText: "" });
  });
});

describe("circle text alternative (GSS-REQ-036, GSS-REQ-033, GSS-REQ-034, GSS-REQ-035)", () => {
  it("names the circle and its radius, with the unit", () => {
    expect(describeGraph({ type: "circle", radius: 5, unit: "cm" })).toBe("A circle with radius 5 cm.");
    expect(describeGraph({ type: "circle", radius: 5 })).toBe("A circle with radius 5.");
  });

  it("states every shown measurement: the diameter when drawn, the circumference when labeled", () => {
    expect(describeGraph({ type: "circle", radius: 5, showDiameter: true, labelCircumference: true, unit: "m" })).toBe(
      "A circle with radius 5 m, diameter 10 m and circumference 31.42 m. Its diameter is drawn.",
    );
  });

  it("states supplied values as supplied and derived ones rounded", () => {
    expect(describeGraph({ type: "circle", radius: 5, circumference: 31.4, labelCircumference: true })).toBe(
      "A circle with radius 5 and circumference 31.4.",
    );
    expect(describeGraph({ type: "circle", diameter: 7, labelRadius: true })).toBe("A circle with radius 3.5. Its radius is drawn.");
    // More than 2 decimals: kept when supplied, rounded when derived.
    expect(describeGraph({ type: "circle", radius: 1.2345, labelDiameter: true })).toBe(
      "A circle with radius 1.2345 and diameter 2.47. Its diameter is drawn.",
    );
  });

  it("says what is drawn and marked", () => {
    expect(describeGraph({ type: "circle", radius: 2, showCenter: true, showRadius: true, showDiameter: true })).toBe(
      "A circle with radius 2 and diameter 4. Its center is marked, and its radius and diameter are drawn.",
    );
    expect(describeGraph({ type: "circle", radius: 2, showCenter: true })).toBe("A circle with radius 2. Its center is marked.");
  });

  it("quotes custom label text and still states the value; says a blank label is left blank", () => {
    expect(describeGraph({ type: "circle", radius: 5, unit: "cm", radiusLabelText: "r", circumferenceLabelText: "" })).toBe(
      "A circle with radius 5 cm and circumference 31.42 cm. Its radius is drawn. The radius is labeled “r”. The circumference label is left blank.",
    );
  });

  it("quotes and cleans the title and the unit, and never lets caller text close a quotation", () => {
    expect(describeGraph({ type: "circle", radius: 1, title: "Pi “day”", unit: "  cm " })).toBe(
      'A circle titled “Pi "day"” with radius 1 cm.',
    );
  });

  it("does not state a title that is blank once cleaned, as none is drawn (code review CR-001)", () => {
    for (const title of ["   ", "\u200b", " \u00a0 "]) {
      const result = createGraph({ type: "circle", radius: 5, title });
      if (!result.ok) continue; // text plain text forbids
      expect(result.scene.textAlternative, JSON.stringify(title)).toBe("A circle with radius 5.");
      expect(result.scene.nodes.filter((node) => node.kind === "text")).toEqual([]);
    }
    expect(describeGraph({ type: "circle", radius: 5, title: "   " })).toBe("A circle with radius 5.");
  });

  it("matches the documented example", () => {
    const example: unknown = JSON.parse(readFileSync("examples/circle.json", "utf8"));
    expect(describeGraph(example)).toBe(
      "A circle titled “Find the circumference” with radius 5 cm, diameter 10 cm and circumference 31.4 cm. Its center is marked, and its radius and diameter are drawn. The radius is labeled “r”. The diameter is labeled “d”. The circumference is labeled “C = ?”.",
    );
  });
});

describe("circle examples (GSV-NFR-005)", () => {
  it("the example is valid; each invalid example fails for its stated reason", () => {
    expect(validate(JSON.parse(readFileSync("examples/circle.json", "utf8"))).valid).toBe(true);
    expect(issuesOf(validate(JSON.parse(readFileSync("examples/invalid/circle-contradiction.json", "utf8"))))).toEqual([
      expect.objectContaining({ code: "contradiction", path: "/diameter" }),
    ]);
    expect(issuesOf(validate(JSON.parse(readFileSync("examples/invalid/circle-negative-radius.json", "utf8"))))).toEqual([
      expect.objectContaining({ code: "out_of_range", path: "/radius" }),
    ]);
  });
});
