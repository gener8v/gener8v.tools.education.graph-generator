import { describe, expect, it, vi } from "vitest";
import { describe as describeGraph } from "../../src/core/describe";
import { formatMeasurement } from "../../src/core/format";

// Register a fixture definition for the dispatch tests only; no real graph type exists yet.
vi.mock("../../src/core/definitions/index", () => ({
  definitions: Object.assign(Object.create(null), {
    square: {
      type: "square",
      title: "Square",
      description: "A fixture.",
      properties: {},
      derivations: [],
      checks: [],
      describe: (normalized: { sideLength: number; unit?: string }) =>
        `A square with sides of ${formatMeasurement(normalized.sideLength, "supplied", normalized.unit)}.`,
    },
  }),
}));

type AnyInput = (normalized: unknown) => string;
const describeAnything = describeGraph as AnyInput;

describe("describe", () => {
  it("dispatches to the graph type's own text alternative", () => {
    expect(describeGraph({ type: "square", sideLength: 2.5, unit: "cm" })).toBe("A square with sides of 2.5 cm.");
  });

  it("throws for a type with no registered definition", () => {
    expect(() => describeGraph({ type: "circle" })).toThrow('No definition is registered for graph type "circle"');
    expect(() => describeAnything({ type: "toString" })).toThrow('graph type "toString"');
    expect(() => describeAnything({ type: "__proto__" })).toThrow('graph type "__proto__"');
  });

  it("throws the same documented error for any input that is not a described graph (security review SEC-005)", () => {
    const longType = "t".repeat(1_000_000);
    const cases: Array<[unknown, string]> = [
      [null, "nothing"],
      [undefined, "nothing"],
      [{}, "nothing"],
      [{ type: 10n }, "a big integer"],
      [{ type: Symbol("s") }, "a symbol"],
      [{ type: { toString: () => "square" } }, "an object"],
      [{ type: longType }, `"${"t".repeat(37)}..."`],
    ];
    for (const [input, shown] of cases) {
      expect(() => describeAnything(input)).toThrow(`No definition is registered for graph type ${shown}`);
    }
    try {
      describeAnything({ type: longType });
    } catch (error) {
      expect((error as Error).message.length).toBeLessThan(100);
    }
  });
});
