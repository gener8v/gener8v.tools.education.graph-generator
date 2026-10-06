import { describe, expect, it } from "vitest";
import { defineProperties, type GraphType, type GraphTypeDefinition } from "../../src/core/definitions/types";
import { describe as describeGraph, describeNormalized, describeWith } from "../../src/core/describe";
import { formatMeasurement, quoteText } from "../../src/core/format";

// A fixture definition for the dispatch tests only; no real graph type is registered yet.
const square: GraphTypeDefinition = {
  type: "square",
  title: "Square",
  description: "A fixture.",
  properties: defineProperties({
    sideLength: { term: "sideLength", kind: "number", required: true, min: 0.000001, max: 1_000_000, description: "The side length." },
    unit: { term: "unit", kind: "string", required: false, description: "The unit of length." },
  }),
  derivations: [],
  checks: [],
  describe: (normalized) =>
    `A square titled ${quoteText(String(normalized["title"] ?? ""))} with sides of ${formatMeasurement(normalized["sideLength"] as number, "supplied", normalized["unit"] as string | undefined)}.`,
};
const registry: Partial<Record<GraphType, GraphTypeDefinition>> = { square };
const describeAnything = describeNormalized as (normalized: unknown, registry?: Partial<Record<GraphType, GraphTypeDefinition>>) => string;

describe("describe", () => {
  it("validates, then dispatches to the graph type's own text alternative", () => {
    expect(describeWith({ type: "square", sideLength: 2.5, unit: "cm", title: "Tiles" }, registry)).toBe(
      "A square titled “Tiles” with sides of 2.5 cm.",
    );
  });

  it("throws one fixed error for an invalid description, so a type never reads unchecked values (security review SEC-005)", () => {
    for (const input of [{ type: "square", sideLength: -1 }, { type: "square" }, { type: "pie" }, null, "square", { type: "square", sideLength: 2, extra: 1 }]) {
      expect(() => describeWith(input, registry)).toThrow("describe: the description is not valid; call validate first and read its issues");
    }
  });

  it("is the public entry, against the registered types", () => {
    // No type is registered yet, so every description is invalid.
    expect(() => describeGraph({ type: "square", sideLength: 1 })).toThrow(/not valid/);
  });
});

describe("describeNormalized (package use, after validate)", () => {
  it("dispatches a normalized description", () => {
    expect(describeAnything({ type: "square", sideLength: 3 }, registry)).toBe("A square titled “” with sides of 3.");
  });

  it("throws the same documented error for any input that is not a described graph (GSV TICKET-001 SEC-005)", () => {
    const longType = "t".repeat(1_000_000);
    const cases: Array<[unknown, string]> = [
      [{ type: "circle" }, '"circle"'],
      [{ type: "toString" }, '"toString"'],
      [{ type: "__proto__" }, '"__proto__"'],
      [null, "nothing"],
      [undefined, "nothing"],
      [{}, "nothing"],
      [{ type: 10n }, "a big integer"],
      [{ type: Symbol("s") }, "a symbol"],
      [{ type: { toString: () => "square" } }, "an object"],
      [{ type: longType }, `"${"t".repeat(37)}..."`],
    ];
    for (const [input, shown] of cases) {
      expect(() => describeAnything(input, registry)).toThrow(`No definition is registered for graph type ${shown}`);
    }
    try {
      describeAnything({ type: longType }, registry);
    } catch (error) {
      expect((error as Error).message.length).toBeLessThan(100);
    }
  });
});
