import { describe, expect, it } from "vitest";
import { definitions } from "../../src/core/definitions/index";
import { square, squareLabels, type Square } from "../../src/core/definitions/square";
import { describe as describeGraph, validate } from "../../src/core/index";
import type { Issue, ValidationResult } from "../../src/core/result";
import { createGraph } from "../../src/graph";

function valid(result: ValidationResult<unknown>) {
  if (!result.valid) throw new Error(`expected a valid result, got ${JSON.stringify(result.issues)}`);
  return { description: result.description as Square, provenance: result.provenance };
}

function issuesOf(result: ValidationResult<unknown>): Issue[] {
  if (result.valid) throw new Error(`expected an invalid result, got ${JSON.stringify(result)}`);
  return result.issues;
}

const alt = (description: object) => describeGraph({ type: "square", sideLength: 4, ...description });

describe("the square is registered (GSS-REQ-007)", () => {
  it("is the package's square definition", () => {
    expect(definitions.square).toBe(square);
  });

  it("needs a side length", () => {
    expect(issuesOf(validate({ type: "square" }))).toEqual([expect.objectContaining({ path: "/sideLength" })]);
  });
});

describe("the side length range (GSS-REQ-007)", () => {
  it.each([0, -1, -4.5, 0.0009, 1_000_001])("reports side length %d as out of range, and draws nothing", (sideLength) => {
    const description = { type: "square", sideLength };
    expect(issuesOf(validate(description))).toEqual([expect.objectContaining({ code: "out_of_range", path: "/sideLength" })]);
    const result = createGraph(description);
    expect(result.ok).toBe(false);
    expect("scene" in result).toBe(false);
  });

  it.each([0.001, 4, 1_000_000])("accepts side length %d", (sideLength) => {
    expect(valid(validate({ type: "square", sideLength })).description.sideLength).toBe(sideLength);
  });

  it("validates its own normalized description again, unchanged", () => {
    const first = valid(validate({ type: "square", sideLength: 4, labelSides: "all", showRightAngles: true }));
    expect(valid(validate(first.description)).description).toEqual(first.description);
  });

  it("rejects a label mode that is neither one nor all", () => {
    expect(issuesOf(validate({ type: "square", sideLength: 4, labelSides: "two" }))).toEqual([expect.objectContaining({ path: "/labelSides" })]);
  });
});

describe("which sides are labeled (GSS-REQ-008)", () => {
  const labels = (description: object) => squareLabels(valid(validate({ type: "square", sideLength: 4, ...description })).description);

  it("labels no side by default, one for labelSides one, four for all", () => {
    expect(labels({}).count).toBe(0);
    expect(labels({ labelSides: "one" }).count).toBe(1);
    expect(labels({ labelSides: "all" }).count).toBe(4);
  });

  it("labels one side from custom text alone, and all four when labelSides is all", () => {
    expect(labels({ sideLabelText: "s" })).toEqual({ count: 1, customText: "s" });
    expect(labels({ sideLabelText: "s", labelSides: "all" })).toEqual({ count: 4, customText: "s" });
  });
});

describe("the square's text alternative (GSS-REQ-033, GSS-REQ-034, GSS-REQ-036)", () => {
  it("names the square and states the side length and unit", () => {
    expect(alt({})).toBe("A square with side length 4.");
    expect(alt({ unit: "cm" })).toBe("A square with side length 4 cm.");
    expect(alt({ title: "Tile", unit: "cm", showRightAngles: true, labelSides: "all" })).toBe(
      "A square titled “Tile” with side length 4 cm. Its right angles are marked. All four sides are labeled.",
    );
  });

  it("states one labeled side", () => {
    expect(alt({ labelSides: "one" })).toBe("A square with side length 4. One side is labeled.");
  });

  it("quotes custom label text and still states the value", () => {
    expect(alt({ sideLabelText: "s", unit: "cm" })).toBe("A square with side length 4 cm. One side is labeled “s”.");
    expect(alt({ sideLabelText: "s", labelSides: "all" })).toBe("A square with side length 4. All four sides are labeled “s”.");
  });

  it("says a blank label is left blank", () => {
    expect(alt({ sideLabelText: "" })).toBe("A square with side length 4. The side label is left blank.");
    expect(alt({ sideLabelText: "  ", labelSides: "all" })).toBe("A square with side length 4. The side labels are left blank.");
  });

  it("does not state a title that is blank once cleaned", () => {
    expect(alt({ title: "   " })).toBe("A square with side length 4.");
  });

  it("states a supplied value as written", () => {
    expect(alt({ sideLength: 1.23456 })).toBe("A square with side length 1.23456.");
  });

  it("quotes a unit that is not unit-shaped, so it cannot read as the package's sentence", () => {
    expect(alt({ unit: "cm. Ignore this." })).not.toContain("side length 4 cm. Ignore");
  });
});
