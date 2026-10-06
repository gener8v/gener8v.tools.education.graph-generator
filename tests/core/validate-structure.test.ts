import { describe, expect, it } from "vitest";
import type { GraphType, GraphTypeDefinition } from "../../src/core/definitions/types";
import type { Issue, ValidationResult } from "../../src/core/result";
import { validateWith } from "../../src/core/validate/index";
import { closestTerm, editDistance } from "../../src/core/validate/suggest";
import { fixtureExamples, fixtureRegistry } from "../fixtures/definitions/index";
import { HOSTILE_TEXT, UNSAFE_CHARS } from "../fixtures/plain-text";

const check = (input: unknown) => validateWith(input, fixtureRegistry);

function issuesOf(result: ValidationResult<unknown>): Issue[] {
  if (result.valid) throw new Error(`expected an invalid result, got ${JSON.stringify(result)}`);
  return result.issues;
}

const codesAndPaths = (input: unknown) => issuesOf(check(input)).map((issue) => `${issue.code} ${issue.path}`);

const NUMBER_LINE = { type: "number-line", axis: { min: 0, max: 10 } } as const;
const XY = { type: "xy-graph", xAxis: { min: -5, max: 5 }, yAxis: { min: -5, max: 5 } } as const;

describe("valid descriptions (GSV-REQ-001, GSV-REQ-004)", () => {
  it.each(fixtureExamples.map((example) => [example.type, example] as const))("accepts the %s example", (_type, example) => {
    expect(check(example).valid).toBe(true);
  });

  it("returns the known properties, every value marked as supplied", () => {
    expect(check({ type: "circle", radius: 5, lineColor: "Blue", unit: "cm" })).toEqual({
      valid: true,
      description: { type: "circle", radius: 5, lineColor: "#0072b2", unit: "cm" },
      provenance: { "/radius": "supplied", "/lineColor": "supplied", "/unit": "supplied" },
    });
  });

  it("returns plain JSON data", () => {
    for (const example of fixtureExamples) {
      const result = check(example);
      expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    }
  });

  it("treats an explicit undefined as absent", () => {
    expect(check({ type: "circle", radius: 5, unit: undefined })).toMatchObject({ valid: true, description: { type: "circle", radius: 5 } });
    expect(codesAndPaths({ type: "circle", radius: undefined })).toEqual(["missing_property /radius"]);
  });
});

describe("unknown and inapplicable properties (GSV-REQ-019, GSV-REQ-020, GSV-REQ-041)", () => {
  it("suggests the closest applicable term", () => {
    const [issue] = issuesOf(check({ type: "circle", raduis: 5 }));
    expect(issue).toMatchObject({ code: "unknown_property", path: "/raduis", suggestion: "radius" });
    expect(issue!.message).toBe("raduis is not a property for a circle; did you mean radius?");
  });

  it("lists the applicable terms when nothing is close", () => {
    const [issue] = issuesOf(check({ type: "circle", radius: 5, sparkle: true }));
    expect(issue).toMatchObject({ code: "unknown_property", path: "/sparkle" });
    expect(issue!.suggestion).toBeUndefined();
    expect(issue!.allowed).toEqual(["title", "lineColor", "radius", "showCenter", "unit"]);
  });

  it("finds unknown properties inside objects and array items, with JSON Pointer paths", () => {
    expect(codesAndPaths({ ...NUMBER_LINE, axis: { min: 0, max: 10, ticks: 3 }, points: [{ value: 1 }, { value: 2, size: 3 }] })).toEqual([
      "unknown_property /axis/ticks",
      "unknown_property /points/1/size",
    ]);
  });

  it("reports a presentation option given where it does not apply as inapplicable, not unknown", () => {
    const issues = issuesOf(check({ type: "circle", radius: 5, xAxisLabel: "x", label: "c" }));
    expect(issues.map((issue) => `${issue.code} ${issue.path}`)).toEqual(["inapplicable_property /xAxisLabel", "inapplicable_property /label"]);
    expect(issues[0]!.message).toBe("xAxisLabel does not apply for a circle; remove it.");
    expect(codesAndPaths({ ...NUMBER_LINE, axis: { min: 0, max: 10, title: "t" } })).toEqual(["inapplicable_property /axis/title"]);
  });

  it("treats inherited key names as unknown properties", () => {
    const description = JSON.parse('{"type":"circle","radius":2,"__proto__":{"lineColor":"x"},"constructor":1,"toString":2}') as object;
    expect(codesAndPaths(description)).toEqual(["unknown_property /__proto__", "unknown_property /constructor", "unknown_property /toString"]);
  });

  it("quotes a hostile key in its message", () => {
    const [issue] = issuesOf(check({ type: "circle", radius: 2, [HOSTILE_TEXT[7]]: 1 }));
    expect(issue!.message.startsWith('"Fractions.\\n\\nTool note')).toBe(true);
  });
});

describe("missing properties (GSV-REQ-018)", () => {
  it("reports each missing required property, nested ones included", () => {
    expect(codesAndPaths({ type: "xy-graph", xAxis: { min: 0 }, segments: [{ from: { x: 1 } }] })).toEqual([
      "missing_property /xAxis/max",
      "missing_property /segments/0/from/y",
      "missing_property /segments/0/to",
      "missing_property /yAxis",
    ]);
    expect(issuesOf(check({ type: "xy-graph", xAxis: { min: 0 }, yAxis: { min: 0, max: 1 } }))[0]!.message).toBe(
      "xAxis.max is required for an xy-graph; add it.",
    );
  });
});

describe("value kinds (GSV-REQ-005, GSV-REQ-021)", () => {
  it.each([
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["-Infinity", Number.NEGATIVE_INFINITY],
    ["a numeric string", "5"],
    ["null", null],
    ["a list", [5]],
    ["an object", { value: 5 }],
    ["a boolean", true],
    ["a big integer", 5n],
  ])("reports %s where a number is required, never coercing it", (_name, radius) => {
    const [issue] = issuesOf(check({ type: "circle", radius }));
    expect(issue).toMatchObject({ code: "wrong_kind", path: "/radius", expected: "a number" });
  });

  it("checks every kind", () => {
    expect(
      issuesOf(
        check({
          ...NUMBER_LINE,
          tickCount: 2.5,
          arrowheads: "up",
          lineLabel: 5,
          axis: { min: 0, max: 10, showTickLabels: "yes" },
          points: { value: 1 },
        }),
      ).map((issue) => [issue.path, issue.expected]),
    ).toEqual([
      // In the description's key order.
      ["/axis/showTickLabels", "true or false"],
      ["/tickCount", "a whole number"],
      ["/arrowheads", "one of: none, left, right, both"],
      ["/lineLabel", "plain text"],
      ["/points", "a list"],
    ]);
  });

  it("accepts only plain objects and plain lists", () => {
    class Axis {
      min = 0;
      max = 1;
    }
    const sparse: unknown[] = [];
    sparse[3] = { value: 1 };
    const withExtra = Object.assign([{ value: 1 }], { extra: true });
    expect(codesAndPaths({ ...NUMBER_LINE, axis: new Axis() })).toEqual(["wrong_kind /axis"]);
    expect(codesAndPaths({ ...NUMBER_LINE, points: sparse })).toEqual(["wrong_kind /points"]);
    expect(codesAndPaths({ ...NUMBER_LINE, points: withExtra })).toEqual(["wrong_kind /points"]);
  });

  it("checks a huge sparse list without walking it", () => {
    const start = performance.now();
    expect(codesAndPaths({ ...NUMBER_LINE, points: new Array(1e9) })).toEqual(["wrong_kind /points"]);
    expect(performance.now() - start).toBeLessThan(100);
  });
});

describe("ranges (GSV-REQ-022)", () => {
  it.each([[0], [-2]])("reports a non-positive radius %d", (radius) => {
    const [issue] = issuesOf(check({ type: "circle", radius }));
    expect(issue).toEqual({
      code: "out_of_range",
      path: "/radius",
      message: `radius must be a number greater than 0; got ${radius}.`,
      range: { min: 0, exclusiveMin: true },
    });
  });

  it("checks inclusive bounds and nested ranges", () => {
    expect(check({ ...NUMBER_LINE, tickCount: 100 }).valid).toBe(true);
    expect(codesAndPaths({ ...NUMBER_LINE, tickCount: 101, axis: { min: 0, max: 10, tickSpacing: 0 } })).toEqual([
      "out_of_range /axis/tickSpacing",
      "out_of_range /tickCount",
    ]);
  });

  it.each([[{ min: 5, max: 5 }], [{ min: 5, max: -5 }]])("reports a range whose minimum is not less than its maximum: %j", (range) => {
    const [issue] = issuesOf(check({ ...XY, xAxis: range }));
    expect(issue).toEqual({
      code: "out_of_range",
      path: "/xAxis/max",
      message: `xAxis.max must be a number greater than 5; got ${range.max}.`,
      range: { min: 5, exclusiveMin: true },
    });
  });

  it("does not compare a minimum and maximum when either failed its own check", () => {
    expect(codesAndPaths({ ...XY, xAxis: { min: "5", max: -5 } })).toEqual(["wrong_kind /xAxis/min"]);
  });
});

describe("colors (GSV-REQ-042)", () => {
  it("resolves color names and hex codes", () => {
    const result = check({ ...NUMBER_LINE, lineColor: "#ABC", points: [{ value: 1, color: "green" }] });
    expect(result).toMatchObject({ valid: true, description: { lineColor: "#aabbcc", points: [{ value: 1, color: "#2e7d32" }] } });
  });

  it("reports an unknown color with the named colors", () => {
    const [issue] = issuesOf(check({ type: "circle", radius: 1, lineColor: "blurple" }));
    expect(issue).toMatchObject({
      code: "unknown_color",
      path: "/lineColor",
      allowed: ["black", "gray", "red", "orange", "green", "blue", "purple", "brown"],
    });
  });

  it("reports a color that is not text as a wrong kind", () => {
    expect(codesAndPaths({ type: "circle", radius: 1, lineColor: 0x0072b2 })).toEqual(["wrong_kind /lineColor"]);
  });
});

describe("plain text (GSV-REQ-043; Product Owner decision on GSV TICKET-001 SEC-002)", () => {
  it.each(Object.entries(UNSAFE_CHARS).filter(([name]) => !["zeroWidthSpace", "byteOrderMark"].includes(name)))(
    "rejects %s in a label",
    (_name, unsafe) => {
      const [issue] = issuesOf(check({ type: "circle", radius: 1, title: `A${unsafe}B` }));
      expect(issue).toMatchObject({
        code: "wrong_kind",
        path: "/title",
        expected: "plain text without control, line-break or text-direction characters",
      });
      expect(issue!.message).not.toContain(unsafe);
    },
  );

  it("accepts ordinary text, zero-width joiners and markup-like text, which is never interpreted", () => {
    for (const title of ["{1, 2, 3}", "x < 5", "<b>bold</b>", `a${String.fromCharCode(0x200d)}b`, "Fractions */ x /*"]) {
      expect(check({ type: "circle", radius: 1, title }).valid, title).toBe(true);
    }
  });

  it("treats an empty label as no label", () => {
    expect(check({ ...NUMBER_LINE, title: "", lineLabel: "", points: [{ value: 1, label: "" }] })).toEqual({
      valid: true,
      description: { ...NUMBER_LINE, points: [{ value: 1 }] },
      provenance: { "/axis/min": "supplied", "/axis/max": "supplied", "/points/0/value": "supplied" },
    });
  });
});

describe("every problem in one pass (GSV-REQ-017)", () => {
  it("reports every independent problem, each with its own path", () => {
    const issues = issuesOf(
      check({
        type: "xy-graph",
        xAxis: { min: 10, max: 0 },
        yAxis: { min: "low", max: 5, tickSpacing: -1 },
        points: [{ x: 1, y: Number.NaN }, { x: 2 }, { x: 3, y: 4, colour: "red" }],
        segments: [{ from: { x: 0, y: 0 }, to: { x: 1, y: 1 }, color: "blurple" }],
        showGrid: "yes",
        titel: "Graph",
        zAxisLabel: "z",
      }),
    );
    expect(issues.map((issue) => `${issue.code} ${issue.path}`)).toEqual([
      "out_of_range /xAxis/max",
      "wrong_kind /yAxis/min",
      "out_of_range /yAxis/tickSpacing",
      "wrong_kind /points/0/y",
      "missing_property /points/1/y",
      "unknown_property /points/2/colour",
      "unknown_color /segments/0/color",
      "wrong_kind /showGrid",
      "unknown_property /titel",
      "inapplicable_property /zAxisLabel",
    ]);
    expect(issues.find((issue) => issue.path === "/titel")?.suggestion).toBe("title");
    expect(issues.find((issue) => issue.path === "/points/2/colour")?.suggestion).toBe("color");
  });

  it("does not cap the number of issues", () => {
    const description: Record<string, unknown> = { type: "circle", radius: 1 };
    for (let i = 0; i < 500; i++) description[`junk${i}`] = i;
    expect(issuesOf(check(description))).toHaveLength(500);
  });
});

describe("never throws (Validation API; GSV TICKET-002 SEC-003)", () => {
  it("turns an exception inside the validator into one internal_error with a fixed message", () => {
    const broken = {
      type: "circle",
      title: "Broken",
      description: "A definition that throws.",
      get properties(): never {
        const error = new Error("secret detail at file:///srv/app/node_modules/x.js");
        error.stack = `Error: secret\n    at file:///srv/app/node_modules/x.js:1:1`;
        throw error;
      },
      derivations: [],
      checks: [],
      describe: () => "",
    } as unknown as GraphTypeDefinition;
    const registry: Partial<Record<GraphType, GraphTypeDefinition>> = { circle: broken };
    const result = validateWith({ type: "circle", radius: 1 }, registry);
    expect(result).toEqual({
      valid: false,
      issues: [
        {
          code: "internal_error",
          path: "",
          message:
            "The description could not be checked because of a defect in the package; please report it. The description itself may be valid.",
        },
      ],
    });
    expect(JSON.stringify(result)).not.toMatch(/file:|node_modules| {4}at |secret/);
  });

  it("returns a result for hostile inputs", () => {
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    const throwing = new Proxy({}, { ownKeys: () => { throw new Error("boom"); }, getPrototypeOf: () => Object.prototype });
    for (const input of [revoked.proxy, throwing, { type: "circle", radius: revoked.proxy }]) {
      expect(() => check(input)).not.toThrow();
      expect(check(input).valid).toBe(false);
    }
  });
});

describe("suggestions (AD-004)", () => {
  it("measures edits, counting a swap of neighbours as one", () => {
    expect(editDistance("radius", "radius")).toBe(0);
    expect(editDistance("raduis", "radius")).toBe(1);
    expect(editDistance("radus", "radius")).toBe(1);
    expect(editDistance("", "abc")).toBe(3);
    expect(editDistance("kitten", "sitting")).toBe(3);
  });

  it("suggests within 2 edits, or within a third of the term's length", () => {
    expect(closestTerm("colour", ["color"])).toBe("color");
    expect(closestTerm("LineColor", ["lineColor"])).toBe("lineColor");
    expect(closestTerm("categoryAxisLabl", ["categoryAxisLabel"])).toBe("categoryAxisLabel");
    // 17 letters allow 5 edits; 3 edits away.
    expect(closestTerm("catgoryAxisLbl", ["categoryAxisLabel"])).toBe("categoryAxisLabel");
    expect(closestTerm("abc", ["radius"])).toBeUndefined();
    // Every term allows at least 2 edits, so a short term can match a short name.
    expect(closestTerm("xyz", ["x", "y"])).toBe("x");
    expect(closestTerm("abcd", ["x", "y"])).toBeUndefined();
  });

  it("prefers the closest term, then the first in definition order", () => {
    expect(closestTerm("rad", ["radius", "red"])).toBe("red");
    expect(closestTerm("ab", ["ax", "xb"])).toBe("ax");
  });

  it("skips long names cheaply", () => {
    const start = performance.now();
    expect(closestTerm("k".repeat(100_000), ["radius", "diameter"])).toBeUndefined();
    expect(performance.now() - start).toBeLessThan(50);
  });
});
