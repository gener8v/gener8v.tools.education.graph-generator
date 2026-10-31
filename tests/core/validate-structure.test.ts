import { describe, expect, it, vi } from "vitest";
import type { GraphType, GraphTypeDefinition, PropertyMap, StringValue } from "../../src/core/definitions/types";
import { definitions, registeredTypes, scopedPropertyMaps } from "../../src/core/definitions/index";
import { CALLER_TEXT_LIMIT, UNIT_TEXT_LIMIT } from "../../src/core/definitions/shared";
import { validate } from "../../src/core/index";
import type { Issue, ValidationResult } from "../../src/core/result";
import { validateWith } from "../../src/core/validate/index";
import { checkEnvelope } from "../../src/core/validate/envelope";
import { DESCRIPTION_VALUE_LIMIT, checkStructure } from "../../src/core/validate/structure";
import { runInNewContext } from "node:vm";
import { closestTerm, editDistance } from "../../src/core/validate/suggest";
import { fixtureExamples, fixtureRegistry } from "../fixtures/definitions/index";
import { conditionalRegistry } from "../fixtures/definitions/conditional-ruler";
import { defineProperties, describeCondition } from "../../src/core/definitions/types";
import { BENIGN_TEXT, HOSTILE_TEXT, SMUGGLED_TEXT, UNSAFE_CHARS } from "../fixtures/plain-text";

const check = (input: unknown) => validateWith(input, fixtureRegistry);

// The 1 MB check counts the validator's work rather than time it (graph-library CPSE TICKET-010):
// every issue the validator makes, kept or not, goes through `createIssue`. The real function still
// makes each one.
const made = vi.hoisted(() => ({ issues: 0 }));
vi.mock("../../src/core/issues", async (importOriginal) => {
  const issues = await importOriginal<typeof import("../../src/core/issues")>();
  const createIssue: typeof issues.createIssue = (code, path, params) => {
    made.issues++;
    return issues.createIssue(code, path, params);
  };
  return { ...issues, createIssue };
});

/** `value` read through a view that counts its own-property reads, the only way the validator reads a value. */
function countingReads<T extends object>(value: T): { value: T; reads: () => number } {
  let reads = 0;
  const view = new Proxy(value, {
    getOwnPropertyDescriptor(target, key) {
      reads++;
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  return { value: view, reads: () => reads };
}

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

  it("returns the known properties, marking supplied and derived values", () => {
    expect(check({ type: "circle", radius: 5, lineColor: "Blue", unit: "cm" })).toEqual({
      valid: true,
      description: { type: "circle", radius: 5, lineColor: "#0072b2", unit: "cm", diameter: 10, circumference: 10 * Math.PI },
      provenance: {
        "/radius": "supplied",
        "/lineColor": "supplied",
        "/unit": "supplied",
        "/diameter": "derived",
        "/circumference": "derived",
      },
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
    expect(codesAndPaths({ type: "circle", radius: undefined })).toEqual(["insufficient "]);
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
    expect(issue!.allowed).toEqual(["title", "lineColor", "radius", "diameter", "circumference", "showCenter", "unit", "shadedFraction"]);
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
  });

  it("reports an element option given at the top level as unknown, with the top-level terms, when the type gives no hint (QR-009)", () => {
    // A number line's points carry `label`; at the top level its own options are lineLabel and lineColor.
    const [issue] = issuesOf(check({ ...NUMBER_LINE, label: "Temperature" }));
    expect(issue).toMatchObject({ code: "unknown_property", path: "/label" });
    expect((issue as { allowed?: string[] }).allowed).toEqual(expect.arrayContaining(["lineLabel", "lineColor", "title"]));
  });

  it("reports an element option given at the top level as not applying, with where it goes, when the type's definition names it (DGP TICKET-002 DEL-002, CR-003)", () => {
    const hinted = Object.freeze({ ...fixtureRegistry, "number-line": { ...fixtureRegistry["number-line"]!, elementsHint: "each point or segment" } });
    const issues = issuesOf(validateWith({ ...NUMBER_LINE, label: "Temperature", color: "red" }, hinted));
    expect(issues).toEqual([
      {
        code: "inapplicable_property",
        path: "/label",
        message: "label does not apply for a number-line as a whole; give it on each point or segment instead.",
      },
      {
        code: "inapplicable_property",
        path: "/color",
        message: "color does not apply for a number-line as a whole; give it on each point or segment instead.",
      },
    ]);
    // Inside an element the rule is unchanged: an option valid elsewhere is unknown there.
    expect(issuesOf(validateWith({ ...NUMBER_LINE, axis: { min: 0, max: 10, title: "t" } }, hinted))[0]).toMatchObject({ code: "unknown_property", path: "/axis/title" });
  });

  it("ignores an elementsHint inherited through a polluted prototype (DGP TICKET-002 security review SEC-002)", () => {
    const proto = Object.prototype as Record<string, unknown>;
    proto["elementsHint"] = "<attacker text>";
    try {
      const [issue] = issuesOf(check({ ...NUMBER_LINE, label: "Temperature" }));
      expect(issue).toMatchObject({ code: "unknown_property", path: "/label" });
      expect(issue!.message).not.toContain("attacker");
    } finally {
      delete proto["elementsHint"];
    }
  });

  it("reports an option that applies elsewhere in the type as unknown inside an element or nested object, with the terms valid there", () => {
    // title applies to a number line, but not inside its axis (quality review QR-009).
    const [axisTitle] = issuesOf(check({ ...NUMBER_LINE, axis: { min: 0, max: 10, title: "t" } }));
    expect(axisTitle).toMatchObject({
      code: "unknown_property",
      path: "/axis/title",
      allowed: ["min", "max", "tickSpacing", "showTickLabels"],
    });
    // label applies to xy-graph points and segments, but not to a segment's end.
    const [endLabel] = issuesOf(check({ ...XY, segments: [{ from: { x: 0, y: 0, label: "A" }, to: { x: 1, y: 1 } }] }));
    expect(endLabel).toMatchObject({ code: "unknown_property", path: "/segments/0/from/label", allowed: ["x", "y"] });
    // label applies at no position of a circle.
    expect(codesAndPaths({ type: "circle", radius: 1, label: "c" })).toEqual(["inapplicable_property /label"]);
  });

  it("lists the terms of the nested position for an unknown nested property", () => {
    const [issue] = issuesOf(check({ ...NUMBER_LINE, points: [{ value: 1, sise: 2 }] }));
    expect(issue).toMatchObject({ code: "unknown_property", path: "/points/0/sise", allowed: ["value", "label", "color"] });
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
    expect(codesAndPaths({ ...NUMBER_LINE, points: new Array(1e9) })).toEqual(["too_large /points"]);
    const holes: unknown[] = [];
    holes[999] = { value: 1 };
    expect(codesAndPaths({ ...NUMBER_LINE, points: holes })).toEqual(["wrong_kind /points"]);
    expect(performance.now() - start).toBeLessThan(100);
  });

  it("rejects values JSON cannot produce, without running getters (code review CR-001, security review SEC-004)", () => {
    const holeAndKey = Object.assign([{ value: 1 }, undefined, { value: 3 }], { extra: { value: 99 } });
    delete holeAndKey[1];
    expect(codesAndPaths({ ...NUMBER_LINE, points: holeAndKey })).toEqual(["wrong_kind /points"]);

    const hidden = { type: "circle" };
    Object.defineProperty(hidden, "radius", { value: -5, enumerable: false });
    expect(codesAndPaths(hidden)).toEqual(["wrong_kind /radius"]);

    let reads = 0;
    const getter = {
      type: "circle",
      get radius() {
        reads += 1;
        return 5;
      },
    };
    expect(codesAndPaths(getter)).toEqual(["wrong_kind /radius"]);
    const getterVersion = { type: "circle", radius: 1, get version() {
      reads += 1;
      return 1;
    } };
    expect(codesAndPaths(getterVersion)).toEqual(["wrong_kind /version"]);
    expect(reads).toBe(0);
    expect(issuesOf(check(hidden))[0]!.expected).toBe("plain JSON data");
  });

  it("classifies hostile objects as the caller's input, not a package defect (code review CR-006, quality review QR-004)", () => {
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    const throwingKeys = new Proxy({}, { ownKeys: () => { throw new Error("boom"); } });
    const throwingDescriptor = new Proxy(
      { type: "circle", radius: 1 },
      { getOwnPropertyDescriptor: () => { throw new Error("boom"); } },
    );
    expect(codesAndPaths(revoked.proxy)).toEqual(["not_an_object "]);
    expect(codesAndPaths(throwingKeys)).toEqual(["not_an_object "]);
    expect(codesAndPaths(throwingDescriptor)).toEqual(["not_an_object "]);
    expect(codesAndPaths({ type: "circle", radius: revoked.proxy })).toEqual(["wrong_kind /radius"]);
    expect(codesAndPaths({ ...NUMBER_LINE, axis: revoked.proxy })).toEqual(["wrong_kind /axis"]);
    expect(codesAndPaths({ ...NUMBER_LINE, points: new Proxy([{ value: 1 }], { getOwnPropertyDescriptor: () => { throw new Error("boom"); } }) })).toEqual([
      "wrong_kind /points",
    ]);
  });

  it("accepts a JSON object from another realm", () => {
    const foreign = runInNewContext('JSON.parse(\'{"type":"circle","radius":2,"lineColor":"red"}\')') as unknown;
    expect(check(foreign)).toMatchObject({ valid: true, description: { type: "circle", radius: 2, lineColor: "#c62828" } });
    const foreignList = runInNewContext('JSON.parse(\'{"type":"number-line","axis":{"min":0,"max":1},"points":[{"value":0.5}]}\')') as unknown;
    expect(check(foreignList).valid).toBe(true);
  });
});

describe("ranges (GSV-REQ-022)", () => {
  it.each([[0], [-2]])("reports a non-positive radius %d", (radius) => {
    const [issue] = issuesOf(check({ type: "circle", radius }));
    expect(issue).toEqual({
      code: "out_of_range",
      path: "/radius",
      message: `radius must be a number between 0.000001 and 1000000; got ${radius}.`,
      range: { min: 0.000001, max: 1_000_000 },
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
  it.each(Object.entries(UNSAFE_CHARS))(
    "rejects %s in a label",
    (_name, unsafe) => {
      const [issue] = issuesOf(check({ type: "circle", radius: 1, title: `A${unsafe}B` }));
      expect(issue).toMatchObject({
        code: "wrong_kind",
        path: "/title",
        expected: "plain text without control, line-break, text-direction or invisible characters",
      });
      expect(issue!.message).not.toContain(unsafe);
    },
  );

  it("accepts ordinary text, emoji, zero-width joiners and markup-like text, which is never interpreted", () => {
    for (const title of [...BENIGN_TEXT, "<b>bold</b>", `a${String.fromCharCode(0x200d)}b`, "Fractions */ x /*"]) {
      expect(check({ type: "circle", radius: 1, title }).valid, title).toBe(true);
    }
  });

  it("rejects text that hides instructions in tag characters (security review SEC-002)", () => {
    const [issue] = issuesOf(check({ type: "circle", radius: 1, title: SMUGGLED_TEXT }));
    expect(issue).toMatchObject({ code: "wrong_kind", path: "/title" });
    // The flags of England, Scotland and Wales are tag sequences, so they are rejected too.
    const england = String.fromCodePoint(0x1f3f4, 0xe0067, 0xe0062, 0xe0065, 0xe006e, 0xe0067, 0xe007f);
    expect(codesAndPaths({ type: "circle", radius: 1, title: england })).toEqual(["wrong_kind /title"]);
  });

  it("treats an empty label as no label", () => {
    expect(check({ ...NUMBER_LINE, title: "", lineLabel: "", points: [{ value: 1, label: "" }] })).toEqual({
      valid: true,
      description: { ...NUMBER_LINE, points: [{ value: 1 }] },
      provenance: { "/axis/min": "supplied", "/axis/max": "supplied", "/points/0/value": "supplied" },
    });
  });
});

describe("ranges at their edges", () => {
  it("checks an exclusive maximum", () => {
    expect(check({ type: "circle", radius: 1, shadedFraction: 0.99 }).valid).toBe(true);
    const [issue] = issuesOf(check({ type: "circle", radius: 1, shadedFraction: 1 }));
    expect(issue).toMatchObject({ code: "out_of_range", range: { min: 0, max: 1, exclusiveMax: true } });
    expect(issue!.message).toBe("shadedFraction must be a number at least 0 and less than 1; got 1.");
  });

  it("compares an ordered pair only when both values are present and passed", () => {
    expect(codesAndPaths({ ...XY, xAxis: { max: -5 } })).toEqual(["missing_property /xAxis/min"]);
  });

  it("reports an enum given a number as a wrong kind", () => {
    expect(codesAndPaths({ ...NUMBER_LINE, arrowheads: 2 })).toEqual(["wrong_kind /arrowheads"]);
  });
});

describe("size limits (Product Owner decision on GSV TICKET-003 SEC-001)", () => {
  it("reports a list longer than its maximum once, without checking its elements", () => {
    const points = Array.from({ length: 1_001 }, () => "not a point");
    const issues = issuesOf(check({ ...NUMBER_LINE, points }));
    expect(issues).toEqual([
      {
        code: "too_large",
        path: "/points",
        message: "points has 1001 items, more than the limit of 1000; use fewer.",
      },
    ]);
  });

  it("reports a description over the value limit once", () => {
    const description: Record<string, unknown> = { type: "circle", radius: 1 };
    for (let i = 0; i < DESCRIPTION_VALUE_LIMIT; i++) description[`junk${i}`] = i;
    expect(issuesOf(check(description))).toEqual([
      { code: "too_large", path: "", message: `description has more than ${DESCRIPTION_VALUE_LIMIT} values; use fewer.` },
    ]);
  });

  it("counts values at every depth", () => {
    const xy = {
      ...XY,
      points: Array.from({ length: 1_000 }, (_, i) => ({ x: i, y: i, label: "p" })),
      segments: Array.from({ length: 1_000 }, () => ({ from: { x: 0, y: 0 }, to: { x: 1, y: 1 } })),
    };
    expect(codesAndPaths(xy)).toEqual(["too_large "]);
  });

  it("answers a 1 MB hostile description quickly, with a bounded issue list", () => {
    // Counted, not timed (CPSE TICKET-010): each key is read once and no issue is made for any of
    // them, and a list over its limit is never read, so the answer costs one pass over the keys.
    const keys = Object.fromEntries(Array.from({ length: 60_000 }, (_, i) => [`k${i}`, 0]));
    const many = countingReads({ type: "circle", radius: 1, ...keys });
    const list = countingReads(Array.from({ length: 500_000 }, () => 0));
    const lists = { ...NUMBER_LINE, points: list.value };
    for (const [input, reads, most] of [
      [many.value, many.reads, Object.keys(many.value).length],
      [lists, list.reads, 0],
    ] as const) {
      expect(JSON.stringify(input).length).toBeGreaterThan(500_000);
      made.issues = 0;
      const before = reads();
      const issues = issuesOf(check(input));
      expect(issues).toHaveLength(1);
      expect(made.issues).toBe(1);
      expect(reads() - before).toBeLessThanOrEqual(most);
    }
  });
});

describe("the structure stage's output when issues exist (code review CR-003, quality review QR-001)", () => {
  it("keeps only the values that passed, and names every failed value", () => {
    const envelope = checkEnvelope(
      { type: "xy-graph", xAxis: { min: 5, max: 1 }, yAxis: { min: "0", max: 5 }, points: [{ x: 1, y: 2 }, { x: Number.NaN, y: 1 }, 7] },
      fixtureRegistry,
    );
    if (!envelope.ok) throw new Error("envelope failed");
    const result = checkStructure(envelope.contents, envelope.type, envelope.version, fixtureRegistry);
    expect(result.description).toEqual({
      type: "xy-graph",
      xAxis: { min: 5 },
      yAxis: { max: 5 },
      points: [{ x: 1, y: 2 }, { y: 1 }, null],
    });
    expect([...result.failed].sort()).toEqual(["/points/1/x", "/points/2", "/xAxis/max", "/yAxis/min"]);
    expect(result.provenance).toEqual({
      "/xAxis/min": "supplied",
      "/yAxis/max": "supplied",
      "/points/0/x": "supplied",
      "/points/0/y": "supplied",
      "/points/1/y": "supplied",
    });
    expect(JSON.stringify(result.description)).not.toContain("Symbol");
  });
});

describe("prototype pollution elsewhere in the process (security review SEC-003, quality review QR-003)", () => {
  it("never puts an inherited value into a valid result", () => {
    const prototype = Object.prototype as Record<string, unknown>;
    prototype["version"] = "polluted";
    prototype["lineColor"] = 'red" onload="alert(1)';
    try {
      const result = check({ type: "circle", radius: 1 });
      if (!result.valid) throw new Error("expected a valid result");
      const description = result.description as Record<string, unknown>;
      expect(Object.getPrototypeOf(description)).toBeNull();
      expect(Object.getPrototypeOf(result.provenance)).toBeNull();
      expect(description["version"]).toBeUndefined();
      expect(description["lineColor"]).toBeUndefined();
      expect(check(result.description).valid).toBe(true);
    } finally {
      delete prototype["version"];
      delete prototype["lineColor"];
    }
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

describe("a term that applies only while a sibling has given values (GSV-REQ-051, rulers GSV TICKET-001)", () => {
  const ruler = (extra: Record<string, unknown>) => validateWith({ type: "ruler", length: 6, ...extra }, conditionalRegistry);
  const issues = (extra: Record<string, unknown>) => {
    const result = ruler(extra);
    return result.valid ? [] : result.issues;
  };
  const found = (extra: Record<string, unknown>) => issues(extra).map((issue) => `${issue.code} ${issue.path}`);

  it("checks the term as usual when the sibling has one of the values", () => {
    expect(ruler({ unit: "inches", smallestDivision: "eighth" })).toMatchObject({ valid: true, description: { unit: "inches", smallestDivision: "eighth" } });
    expect(found({ unit: "inches", smallestDivision: "third" })).toEqual(["wrong_kind /smallestDivision"]);
  });

  it("reports the term as not applying when the sibling has another value, naming the condition and the sibling's path", () => {
    const [issue, ...rest] = issues({ unit: "centimeters", smallestDivision: "half" });
    expect(rest).toEqual([]);
    expect(issue).toEqual({
      code: "inapplicable_property",
      path: "/smallestDivision",
      message: 'smallestDivision applies to a ruler only when unit is "inches"; remove it.',
      conflicts: ["/unit"],
    });
    // Its value is not checked: a bad division on a centimetre ruler is reported once, as not applying.
    expect(found({ unit: "centimeters", smallestDivision: "third" })).toEqual(["inapplicable_property /smallestDivision"]);
  });

  it("names a nested or listed sibling in full, with its path (code review CR-003)", () => {
    const [nested] = issues({ unit: "inches", spare: { unit: "centimeters", smallestDivision: "half" } });
    expect(nested).toMatchObject({ path: "/spare/smallestDivision", conflicts: ["/spare/unit"] });
    expect(nested!.message).toContain('only when spare.unit is "inches"');
    const [listed] = issues({ unit: "inches", extras: [{ unit: "inches" }, { unit: "centimeters", smallestDivision: "half" }] });
    expect(listed).toMatchObject({ path: "/extras/1/smallestDivision", conflicts: ["/extras/1/unit"] });
    expect(listed!.message).toContain('only when extras[1].unit is "inches"');
  });

  it("still checks the term's own value when the sibling failed or is missing, reporting every problem in one pass (code review CR-001)", () => {
    // Whether it applies cannot be known, so that is not reported; a division fine for some unit gives no second issue.
    expect(found({ unit: "cm", smallestDivision: "half" })).toEqual(["wrong_kind /unit"]);
    expect(found({ smallestDivision: "half" })).toEqual(["missing_property /unit"]);
    // A division wrong under any unit is reported too.
    expect(found({ unit: "cm", smallestDivision: "third" })).toEqual(["wrong_kind /unit", "wrong_kind /smallestDivision"]);
    expect(found({ unit: "cm", smallestDivision: 16 })).toEqual(["wrong_kind /unit", "wrong_kind /smallestDivision"]);
    expect(found({ smallestDivision: 16 })).toEqual(["missing_property /unit", "wrong_kind /smallestDivision"]);
  });

  it("runs a check that reads the term as an optional input when it is absent, and skips it when the term failed or does not apply (code review CR-002)", () => {
    // Absent: the check runs, reading the default sixteenth.
    expect(found({ unit: "inches", length: 1 })).toEqual(["out_of_range /length"]);
    expect(found({ unit: "inches", smallestDivision: "sixteenth", length: 1 })).toEqual(["out_of_range /length"]);
    expect(found({ unit: "inches", smallestDivision: "half", length: 1 })).toEqual([]);
    expect(found({ unit: "centimeters", length: 1 })).toEqual([]);
    // Failed or not applying: the check is skipped, so it never reads a value that was reported.
    expect(found({ unit: "inches", smallestDivision: "third", length: 1 })).toEqual(["wrong_kind /smallestDivision"]);
    expect(found({ unit: "centimeters", smallestDivision: "sixteenth", length: 1 })).toEqual(["inapplicable_property /smallestDivision"]);
    expect(found({ unit: "cm", smallestDivision: "sixteenth", length: 1 })).toEqual(["wrong_kind /unit"]);
  });

  it("marks a nested term it leaves out as failed, so a check reading it is skipped though its parent is present", () => {
    const spare = (unit: string) => found({ unit: "inches", spare: { unit, smallestDivision: "half" } });
    // The probe check runs, and reports, when the division is absent and nothing failed (quality review QR-002).
    expect(found({ unit: "inches", spare: { unit: "inches" } })).toEqual(["missing_property /spare/smallestDivision"]);
    expect(spare("inches")).toEqual([]);
    expect(spare("cm")).toEqual(["wrong_kind /spare/unit"]);
    expect(spare("centimeters")).toEqual(["inapplicable_property /spare/smallestDivision"]);
  });

  it("decides the same whichever order the keys are written in", () => {
    const backwards = validateWith({ smallestDivision: "half", length: 6, unit: "centimeters", type: "ruler" }, conditionalRegistry);
    expect(backwards.valid ? [] : backwards.issues.map((issue) => `${issue.code} ${issue.path}`)).toEqual(["inapplicable_property /smallestDivision"]);
    expect(validateWith({ smallestDivision: "half", length: 6, unit: "inches", type: "ruler" }, conditionalRegistry).valid).toBe(true);
  });

  it("reports a value outside a fixed list with every accepted name, in the message and in allowed (GSV-REQ-049, GSV-REQ-050; code review CR-008)", () => {
    const [issue] = issues({ unit: "cm" });
    expect(issue).toMatchObject({ code: "wrong_kind", path: "/unit", expected: "one of: centimeters, inches", allowed: ["centimeters", "inches"] });
    expect(issue!.message).toContain("centimeters");
    expect(issue!.message).toContain("inches");
    const [division] = issues({ unit: "inches", smallestDivision: "1/8" });
    expect(division!.message).toContain("half, quarter, eighth, sixteenth");
    expect(division!.allowed).toEqual(["half", "quarter", "eighth", "sixteenth"]);
  });
});

describe("leaving a conditional term out (rulers GSV TICKET-001 quality review QR-002, QR-004)", () => {
  const structureOf = (input: Record<string, unknown>, registry = conditionalRegistry) => {
    const envelope = checkEnvelope(input, registry);
    if (!envelope.ok) throw new Error("expected the envelope to pass");
    return checkStructure(envelope.contents, envelope.type, envelope.version, registry);
  };

  it("keeps a left-out term out of the description and the provenance, and lists it as failed, at the top level and nested", () => {
    const result = structureOf({ type: "ruler", length: 6, unit: "cm", smallestDivision: "half", spare: { unit: "cm", smallestDivision: "half" } });
    expect(result.description["smallestDivision"]).toBeUndefined();
    expect((result.description["spare"] as Record<string, unknown>)["smallestDivision"]).toBeUndefined();
    expect(Object.keys(result.provenance).filter((key) => key.endsWith("smallestDivision"))).toEqual([]);
    expect([...result.failed].filter((key) => key.endsWith("smallestDivision")).sort()).toEqual(["/smallestDivision", "/spare/smallestDivision"]);
  });

  const objectTerm = {
    type: "ruler" as const,
    title: "Conditional object (test only)",
    description: "A conditional term that is an object.",
    properties: defineProperties({
      unit: { term: "unit", kind: "enum", required: true, values: ["centimeters", "inches", "feet"], description: "A unit." },
      detail: {
        term: "detail",
        kind: "object",
        required: false,
        description: "Details for inches and feet.",
        appliesWhen: { term: "unit", values: ["inches", "feet"] },
        properties: defineProperties({ a: { term: "a", kind: "number", required: true, description: "A number." } }),
      },
    }),
    derivations: [],
    checks: [],
    describe: () => "A test-only conditional object.",
  };
  const objectRegistry = Object.freeze(Object.assign(Object.create(null) as Record<string, unknown>, { ruler: objectTerm })) as typeof conditionalRegistry;

  it("removes the provenance under a left-out object term too", () => {
    const result = structureOf({ type: "ruler", unit: "cm", detail: { a: 1 } }, objectRegistry);
    expect(result.description["detail"]).toBeUndefined();
    expect(Object.keys(result.provenance)).toEqual([]);
    expect(result.failed.has("/detail")).toBe(true);
    // And keeps it when the condition holds.
    expect(structureOf({ type: "ruler", unit: "feet", detail: { a: 1 } }, objectRegistry).provenance).toEqual({ "/unit": "supplied", "/detail/a": "supplied" });
  });

  it("counts a left-out term's values against the description limit, so failing siblings cannot hide a huge list (security review SEC-003)", () => {
    // Each element's conditional term is decided at the end of that element, before the next is
    // counted: two halves of the limit, each left out, still pass it together.
    const half = Math.ceil(DESCRIPTION_VALUE_LIMIT / 2) + 1;
    const element = defineProperties({
      unit: { term: "unit", kind: "enum", required: true, values: ["centimeters", "inches"], description: "A unit." },
      marks: {
        term: "marks",
        kind: "array",
        required: false,
        maxItems: DESCRIPTION_VALUE_LIMIT,
        description: "Marks for inches.",
        appliesWhen: { term: "unit", values: ["inches"] },
        items: { kind: "number", description: "A mark." },
      },
    });
    const listTerm = {
      ...objectTerm,
      properties: defineProperties({
        extras: { term: "extras", kind: "array", required: true, maxItems: 2, description: "Sets of marks.", items: { kind: "object", description: "One set.", properties: element } },
      }),
    };
    const registry = Object.freeze(Object.assign(Object.create(null) as Record<string, unknown>, { ruler: listTerm })) as typeof conditionalRegistry;
    const marks = Array.from({ length: half }, (_, i) => i);
    const result = validateWith({ type: "ruler", extras: [{ unit: "cm", marks }, { unit: "cm", marks }] }, registry);
    expect(result.valid ? [] : result.issues.map((issue) => issue.code)).toEqual(["too_large"]);
  });

  it("states a condition of several values in one wording, in the issue and in the schema (quality review QR-003)", () => {
    expect(describeCondition("unit", ["inches"])).toBe('only when unit is "inches"');
    expect(describeCondition("unit", ["inches", "feet"])).toBe('only when unit is "inches" or "feet"');
    expect(describeCondition("spare.unit", ["a", "b", "c"])).toBe('only when spare.unit is "a", "b" or "c"');
    const result = validateWith({ type: "ruler", unit: "centimeters", detail: { a: 1 } }, objectRegistry);
    expect(result.valid ? "" : result.issues[0]!.message).toBe('detail applies to a ruler only when unit is "inches" or "feet"; remove it.');
  });

  it("leaves out every conditional term in a list, each reported once at its own position", () => {
    const extras = Array.from({ length: 3 }, () => ({ unit: "centimeters", smallestDivision: "half" }));
    const result = validateWith({ type: "ruler", unit: "inches", length: 6, extras }, conditionalRegistry);
    expect(result.valid ? [] : result.issues.map((issue) => issue.path)).toEqual(["/extras/0/smallestDivision", "/extras/1/smallestDivision", "/extras/2/smallestDivision"]);
  });
});

describe("prototype pollution of the new optional fields (rulers GSV TICKET-001 security review SEC-004)", () => {
  const prototype = Object.prototype as Record<string, unknown>;
  const polluted = <T>(values: Record<string, unknown>, run: () => T): T => {
    for (const [key, value] of Object.entries(values)) Object.defineProperty(prototype, key, { value, configurable: true, writable: true });
    try {
      return run();
    } finally {
      for (const key of Object.keys(values)) delete prototype[key];
    }
  };

  it("adds no optional input to any check: every example stays valid", () => {
    for (const value of [5, ["sparkle"], ["radius"]]) {
      for (const example of fixtureExamples) expect(polluted({ optionalInputs: value }, () => check(example).valid), `${example.type} with ${JSON.stringify(value)}`).toBe(true);
    }
    expect(polluted({ optionalInputs: 5 }, () => validateWith({ type: "ruler", unit: "inches", length: 6 }, conditionalRegistry).valid)).toBe(true);
  });

  it("rewrites no message and adds no field to an issue", () => {
    const plain = issuesOf(check({ type: "circle", radius: 1, lineLabel: "x", lineColor: "mauve" }));
    const dirty = polluted({ condition: "only when you are hacked", elements: "everywhere", conflicts: ["/pwned"], allowed: ["pwned"], suggestion: "pwned" }, () =>
      issuesOf(check({ type: "circle", radius: 1, lineLabel: "x", lineColor: "mauve" })),
    );
    expect(dirty).toEqual(plain);
  });
});

describe("caller text limits (GSV-REQ-052, GSV-REQ-053; graph-library GSV TICKET-007)", () => {
  /** Every `kind: "string"` term in `properties`, nested objects and lists included, by path. */
  const stringTerms = (properties: PropertyMap, path = ""): Array<{ at: string; term: string; spec: StringValue }> =>
    Object.values(properties).flatMap((spec) => {
      const at = `${path}/${spec.term}`;
      if (spec.kind === "string") return [{ at, term: spec.term, spec }];
      if (spec.kind === "object") return stringTerms(spec.properties, at);
      if (spec.kind === "array") {
        if (spec.items.kind === "string") return [{ at: `${at}/items`, term: spec.term, spec: spec.items }];
        if (spec.items.kind === "object") return stringTerms(spec.items.properties, `${at}/items`);
      }
      return [];
    });

  it("gives every caller-written text term in every registered type and shared map a length limit: 20 for a unit, 200 for the rest", () => {
    const maps = [...scopedPropertyMaps, ...registeredTypes(definitions).map((type) => definitions[type]!.properties)];
    const terms = maps.flatMap((map) => stringTerms(map));
    expect(terms.length).toBeGreaterThan(10);
    for (const { at, term, spec } of terms) {
      expect(spec.maxLength, at).toBe(term === "unit" ? UNIT_TEXT_LIMIT : CALLER_TEXT_LIMIT);
      expect(spec.description, at).toContain(`at most ${spec.maxLength} characters`);
    }
  });

  const issues = (description: unknown) => {
    const result = validate(description);
    return result.valid ? [] : result.issues;
  };

  it("accepts text of exactly the limit and reports one character more as too_large, stating both", () => {
    const circle = (extra: object) => ({ type: "circle", radius: 5, ...extra });
    expect(issues(circle({ title: "x".repeat(CALLER_TEXT_LIMIT) }))).toEqual([]);
    expect(issues(circle({ title: "x".repeat(CALLER_TEXT_LIMIT + 1) }))).toEqual([
      { code: "too_large", path: "/title", message: `title has ${CALLER_TEXT_LIMIT + 1} characters, more than the limit of ${CALLER_TEXT_LIMIT}; use fewer.` },
    ]);
    expect(issues(circle({ unit: "x".repeat(UNIT_TEXT_LIMIT) }))).toEqual([]);
    expect(issues(circle({ unit: "x".repeat(UNIT_TEXT_LIMIT + 1) }))).toEqual([
      { code: "too_large", path: "/unit", message: `unit has ${UNIT_TEXT_LIMIT + 1} characters, more than the limit of ${UNIT_TEXT_LIMIT}; use fewer.` },
    ]);
    const ruler = (label: string) => ({ type: "ruler", rulerUnit: "centimeters", length: 5, measuredObject: { start: 1, end: 2, label } });
    expect(issues(ruler("x".repeat(CALLER_TEXT_LIMIT)))).toEqual([]);
    expect(issues(ruler("x".repeat(CALLER_TEXT_LIMIT + 1))).map((issue) => `${issue.code} ${issue.path}`)).toEqual(["too_large /measuredObject/label"]);
  });

  it("checks a text's length before scanning it, so a huge text is refused as too large (security review SEC-004)", () => {
    const huge = `${"x".repeat(10_000_000)}\u202e`;
    expect(issues({ type: "circle", radius: 5, title: huge }).map((issue) => `${issue.code} ${issue.path}`)).toEqual(["too_large /title"]);
    // Within the limit, an unsafe character is still refused as not plain text.
    expect(issues({ type: "circle", radius: 5, title: "x\u202e" }).map((issue) => issue.code)).toEqual(["wrong_kind"]);
  });

  it("counts characters as code points, as JSON Schema does: 200 emoji are accepted and 201 are not", () => {
    const title = (count: number) => ({ type: "circle", radius: 5, title: "🍎".repeat(count) });
    expect(issues(title(CALLER_TEXT_LIMIT))).toEqual([]);
    expect(issues(title(CALLER_TEXT_LIMIT + 1)).map((issue) => issue.message)).toEqual([
      `title has ${CALLER_TEXT_LIMIT + 1} characters, more than the limit of ${CALLER_TEXT_LIMIT}; use fewer.`,
    ]);
  });
});
