import { describe, expect, it, vi } from "vitest";
import { describe as describeGraph, formatList, formatMeasurement, formatNumber } from "../../src/core/describe";

// Register a fixture definition for the dispatch tests only; no real graph type exists yet.
vi.mock("../../src/core/definitions/index", () => ({
  definitions: {
    square: {
      type: "square",
      title: "Square",
      description: "A fixture.",
      properties: {},
      derivations: [],
      checks: [],
      describe: (normalized: { sideLength: number; unit?: string }) =>
        `A square with sides of ${formatMeasurement(normalized.sideLength, normalized.unit)}.`,
    },
  },
}));

describe("describe", () => {
  it("dispatches to the graph type's own text alternative", () => {
    expect(describeGraph({ type: "square", sideLength: 2.5, unit: "cm" })).toBe("A square with sides of 2.5 cm.");
  });

  it("throws for a type with no registered definition", () => {
    expect(() => describeGraph({ type: "circle" })).toThrow(/No definition is registered for graph type "circle"/);
    const fromJs = describeGraph as (normalized: { type: string }) => string;
    expect(() => fromJs({ type: "toString" })).toThrow(/No definition/);
  });
});

describe("formatting helpers", () => {
  it.each([
    [5, "5"],
    [31.415926, "31.42"],
    [2.5, "2.5"],
    [2.1, "2.1"],
    [-3.004, "-3"],
    [-0.001, "0"],
    [-0, "0"],
    [1e12, "1000000000000"],
  ])("formatNumber(%d) is %s", (value, text) => {
    expect(formatNumber(value)).toBe(text);
  });

  it("joins lists in plain English", () => {
    expect(formatList([])).toBe("");
    expect(formatList(["radius"])).toBe("radius");
    expect(formatList(["radius", "diameter"])).toBe("radius and diameter");
    expect(formatList(["radius", "diameter", "circumference"])).toBe("radius, diameter and circumference");
  });

  it("adds the unit only when one is given", () => {
    expect(formatMeasurement(10, "cm")).toBe("10 cm");
    expect(formatMeasurement(10)).toBe("10");
    expect(formatMeasurement(10, "")).toBe("10");
  });
});
