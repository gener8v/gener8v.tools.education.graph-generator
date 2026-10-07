import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createGraph, createGraphWith } from "../src/graph";
import { definitions } from "../src/core/definitions/index";
import { getLayout, layouts } from "../src/layout/registry";
import { checkScene } from "../src/layout/kit/check";
import { fixtureRegistry } from "./fixtures/definitions";
import { circleLayout, fixtureLayouts, throwingLayouts } from "./fixtures/layouts";

const LEAKED_FRAME = /file:|\/node_modules\/| {4}at /;

describe("layout registry (CPSE-REQ-007, CPSE-REQ-008)", () => {
  it("ships no layouts until the graph-type tickets register theirs", () => {
    expect(Object.keys(layouts)).toEqual([]);
    expect(Object.isFrozen(layouts)).toBe(true);
  });

  it("finds a registered layout by its type, and nothing for anything else", () => {
    expect(getLayout("circle", fixtureLayouts)).toBe(circleLayout);
    for (const type of ["square", "constructor", "__proto__", "toString", 7, undefined, null, {}]) {
      expect(getLayout(type, fixtureLayouts)).toBeUndefined();
    }
  });
});

describe("createGraph (CPSE-REQ-009)", () => {
  it("returns the normalized description, its provenance and the Scene for a valid description", () => {
    const result = createGraphWith({ type: "circle", diameter: 10, unit: "cm" }, fixtureRegistry, fixtureLayouts);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.description).toMatchObject({ type: "circle", radius: 5, diameter: 10, unit: "cm" });
    expect(result.provenance).toMatchObject({ "/diameter": "supplied", "/radius": "derived" });
    expect(result.scene.textAlternative).toBe("A circle with radius 5.");
    expect(checkScene(result.scene)).toEqual([]);
  });

  it("returns every issue for an invalid description", () => {
    const result = createGraphWith({ type: "circle", radius: -1, colour: "red" }, fixtureRegistry, fixtureLayouts);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map((issue) => issue.code).sort()).toEqual(["out_of_range", "unknown_property"]);
  });

  it("reports a defined type with no layout as an issue, not a throw", () => {
    const result = createGraphWith({ type: "number-line", axis: { min: 0, max: 10 } }, fixtureRegistry, fixtureLayouts);
    expect(result).toMatchObject({ ok: false, issues: [{ code: "unknown_graph_type", path: "/type", allowed: ["circle"] }] });
  });

  it("reports internal_error when no type can be drawn at all", () => {
    const result = createGraphWith({ type: "circle", radius: 1 }, fixtureRegistry, layouts);
    expect(result).toMatchObject({ ok: false, issues: [{ code: "internal_error", path: "" }] });
  });

  it("uses the package's definitions and layouts", () => {
    // Both are empty until the graph-type tickets land, so every type is unknown for now.
    expect(Object.keys(definitions)).toEqual([]);
    expect(createGraph({ type: "circle", radius: 1 })).toMatchObject({ ok: false, issues: [{ code: "unknown_graph_type" }] });
    expect(createGraph(undefined)).toMatchObject({ ok: false, issues: [{ code: "not_an_object" }] });
  });
});

describe("createGraph never throws (CPSE-REQ-018; CPSE TICKET-002 CR-006, SEC-003)", () => {
  it("sends a layout that throws to internal_error, with no exception text or stack", () => {
    const result = createGraphWith({ type: "circle", radius: 1 }, fixtureRegistry, throwingLayouts);
    expect(result).toEqual({ ok: false, issues: [expect.objectContaining({ code: "internal_error", path: "" })] });
    const text = JSON.stringify(result);
    expect(text).not.toMatch(LEAKED_FRAME);
    expect(text).not.toMatch(/RangeError|fmt\(\)/);
  });

  it("returns a result for any JSON value", () => {
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        for (const result of [createGraph(value), createGraphWith(value, fixtureRegistry, fixtureLayouts)]) {
          expect(typeof result.ok).toBe("boolean");
          if (!result.ok) expect(result.issues.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 300 },
    );
  });

  it("returns a result for circle-shaped values of any content", () => {
    const circleLike = fc.record(
      { type: fc.constant("circle"), radius: fc.oneof(fc.double(), fc.jsonValue()), diameter: fc.jsonValue(), unit: fc.jsonValue() },
      { requiredKeys: ["type"] },
    );
    fc.assert(
      fc.property(circleLike, (value) => {
        const result = createGraphWith(value, fixtureRegistry, fixtureLayouts);
        if (result.ok) expect(checkScene(result.scene)).toEqual([]);
      }),
      { numRuns: 300 },
    );
  });

  it("returns a result for hostile values: getters that throw, revoked proxies, cycles", () => {
    const throwing = Object.defineProperty({}, "type", {
      enumerable: true,
      get() {
        throw new Error("boom at file:///secret.js");
      },
    });
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();
    const cyclic: Record<string, unknown> = { type: "circle", radius: 1 };
    cyclic.self = cyclic;
    for (const value of [throwing, proxy, cyclic, Symbol("x"), 10n, () => 1]) {
      const result = createGraphWith(value, fixtureRegistry, fixtureLayouts);
      expect(result.ok).toBe(false);
      expect(JSON.stringify(result)).not.toMatch(LEAKED_FRAME);
    }
  });
});
