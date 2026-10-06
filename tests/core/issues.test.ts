import { describe, expect, it } from "vitest";
import {
  ISSUE_CODES,
  type IssueCode,
  type IssueParams,
  createIssue,
  describeRange,
  issueDocs,
  issueMessage,
  pointer,
} from "../../src/core/issues";
import { type ValidationResult, invalidResult, validResult } from "../../src/core/result";

describe("issue-code set (GSV-REQ-030, GSV-REQ-034)", () => {
  it("is the fixed initial set from the design", () => {
    // Renaming or removing a code breaks callers that match on it (GSV-REQ-034, CPSE-REQ-042).
    // Changing this snapshot is a breaking change: release it as one. Adding a code is not.
    expect([...ISSUE_CODES]).toMatchInlineSnapshot(`
      [
        "not_an_object",
        "unknown_graph_type",
        "unsupported_version",
        "missing_property",
        "unknown_property",
        "inapplicable_property",
        "wrong_kind",
        "out_of_range",
        "contradiction",
        "insufficient",
        "ambiguous",
        "not_a_triangle",
        "too_many_ticks",
        "tick_spacing_invalid",
        "tick_label_not_on_tick",
        "outside_axis_range",
        "degenerate_segment",
        "scale_excludes_value",
        "tick_interval_not_dividing",
        "series_length_mismatch",
        "unknown_image",
        "unknown_color",
        "invalid_json",
        "internal_error",
      ]
    `);
  });

  it("has no duplicates and cannot be changed at runtime", () => {
    expect(new Set(ISSUE_CODES).size).toBe(ISSUE_CODES.length);
    expect(Object.isFrozen(ISSUE_CODES)).toBe(true);
    expect(Object.isFrozen(issueDocs)).toBe(true);
  });

  it("documents every code, and documents nothing else", () => {
    expect(Object.keys(issueDocs).sort()).toEqual([...ISSUE_CODES].sort());
    for (const code of ISSUE_CODES) {
      expect(issueDocs[code].length, code).toBeGreaterThan(20);
    }
  });

  it("documents invalid_json as tool-only and internal_error as a package defect", () => {
    expect(issueDocs.invalid_json).toMatch(/only by the tool handler/);
    expect(issueDocs.internal_error).toMatch(/not a problem with the description/);
  });
});

// Representative parameters for every code, as a validator stage would supply them.
const SAMPLES: Record<IssueCode, IssueParams> = {
  not_an_object: { term: "description", got: [1, 2] },
  unknown_graph_type: { term: "type", got: "pie", allowed: ["circle", "square"] },
  unsupported_version: { term: "version", got: 9, allowed: ["1"] },
  missing_property: { term: "radius", graphType: "circle" },
  unknown_property: { term: "raduis", graphType: "circle", suggestion: "radius" },
  inapplicable_property: { term: "xAxisLabel", graphType: "circle" },
  wrong_kind: { term: "radius", expected: "a number", got: "5" },
  out_of_range: { term: "radius", got: -2, range: { min: 0, exclusiveMin: true } },
  contradiction: { term: "diameter", got: 12, conflicts: ["/radius"], agreeingValue: 10 },
  insufficient: { term: "triangle", detail: "three angles fix its shape but not its size" },
  ambiguous: { term: "triangle", detail: "two triangles have these sides and angle" },
  not_a_triangle: { term: "sideLengths", detail: "3 + 4 is not greater than 9" },
  too_many_ticks: { term: "xAxis.tickSpacing", got: 0.001, range: { max: 100 } },
  tick_spacing_invalid: { term: "xAxis.tickSpacing", got: 0 },
  tick_label_not_on_tick: { term: "tickLabels[0].value", got: 2.5 },
  outside_axis_range: { term: "points[2].x", got: 12, range: { min: -10, max: 10 } },
  degenerate_segment: { term: "segments[0]" },
  scale_excludes_value: { term: "values[3]", got: 140, range: { min: 0, max: 100 } },
  tick_interval_not_dividing: { term: "valueScale.tickInterval", got: 7 },
  series_length_mismatch: { term: "series[1].values", got: 4, expected: "5" },
  unknown_image: { term: "unitImage", got: "unicorn", allowed: ["apple", "star"] },
  unknown_color: { term: "lineColor", got: "blurple", allowed: ["black", "blue", "red"] },
  invalid_json: { term: "tool input", detail: "Unexpected token } at position 14" },
  internal_error: { term: "description", detail: "layout returned no nodes" },
};

const FIX_WORDS =
  /\b(add|remove|use|must|did you mean|give|change|move|widen|leave|send|supply|report)\b/i;

describe("issue messages (GSV-REQ-031)", () => {
  for (const code of ISSUE_CODES) {
    it(`${code}: names the property and says how to fix it`, () => {
      const message = issueMessage(code, SAMPLES[code]);
      expect(message).toContain(SAMPLES[code].term);
      expect(message).toMatch(FIX_WORDS);
      expect(message).not.toMatch(/undefined|\[object Object\]/);
    });
  }

  it("matches the ticket's example wording", () => {
    expect(issueMessage("out_of_range", SAMPLES.out_of_range)).toBe(
      "radius must be a number greater than 0; got -2.",
    );
  });

  it("states the agreeing value for a contradiction", () => {
    expect(issueMessage("contradiction", SAMPLES.contradiction)).toBe(
      "diameter (12) disagrees with /radius; a value of 10 would agree, or remove one of them.",
    );
  });

  it("lists the applicable terms when no suggestion is close", () => {
    expect(issueMessage("unknown_property", { term: "zzz", graphType: "circle", allowed: ["radius", "diameter"] })).toBe(
      "zzz is not a property for a circle; use one of: radius, diameter.",
    );
  });

  it("describes ranges in plain English", () => {
    expect(describeRange({ min: 0, exclusiveMin: true })).toBe("a number greater than 0");
    expect(describeRange({ min: 1, max: 100 })).toBe("a number between 1 and 100");
    expect(describeRange({ min: 0, max: 5, exclusiveMin: true })).toBe("a number greater than 0 and at most 5");
    expect(describeRange({ max: 10 })).toBe("a number at most 10");
  });
});

describe("issues and results are plain JSON data (GSV-REQ-029, GSV-REQ-032, GSV-REQ-033)", () => {
  const roundTrip = <T>(value: T): T => JSON.parse(JSON.stringify(value));

  it("omits optional fields that have no value", () => {
    const issue = createIssue("missing_property", pointer("radius"), SAMPLES.missing_property);
    expect(issue).toEqual({ code: "missing_property", path: "/radius", message: "radius is required for a circle; add it." });
    expect(Object.values(issue)).not.toContain(undefined);
    expect(roundTrip(issue)).toEqual(issue);
  });

  it("carries expected kind, range, conflicts, suggestion and allowed values where they apply", () => {
    expect(createIssue("wrong_kind", "/radius", SAMPLES.wrong_kind).expected).toBe("a number");
    expect(createIssue("out_of_range", "/radius", SAMPLES.out_of_range).range).toEqual({ min: 0, exclusiveMin: true });
    expect(createIssue("contradiction", "/diameter", SAMPLES.contradiction).conflicts).toEqual(["/radius"]);
    expect(createIssue("unknown_property", "/raduis", SAMPLES.unknown_property).suggestion).toBe("radius");
    expect(createIssue("unknown_image", "/unitImage", SAMPLES.unknown_image).allowed).toEqual(["apple", "star"]);
  });

  it("survives JSON round-trips for every code", () => {
    for (const code of ISSUE_CODES) {
      const issue = createIssue(code, pointer("x"), SAMPLES[code]);
      expect(roundTrip(issue), code).toEqual(issue);
    }
  });

  it("does not share arrays with the caller's parameters", () => {
    const allowed = ["apple"];
    const issue = createIssue("unknown_image", "/unitImage", { term: "unitImage", got: "x", allowed });
    allowed.push("pear");
    expect(issue.allowed).toEqual(["apple"]);
  });

  it("round-trips valid and invalid results", () => {
    const valid = validResult({ type: "circle", radius: 5, diameter: 10 }, { "/radius": "supplied", "/diameter": "derived" });
    const invalid = invalidResult([createIssue("out_of_range", "/radius", SAMPLES.out_of_range)]);
    expect(roundTrip(valid)).toEqual(valid);
    expect(roundTrip(invalid)).toEqual(invalid);
  });
});

describe("validation results (GSV-REQ-027, GSV-REQ-029)", () => {
  it("states validity and carries the description and provenance when valid", () => {
    const result: ValidationResult<{ type: string }> = validResult({ type: "square" }, { "/sideLength": "supplied" });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.description).toEqual({ type: "square" });
      expect(result.provenance).toEqual({ "/sideLength": "supplied" });
    }
  });

  it("lists every issue when invalid", () => {
    const issues = [
      createIssue("missing_property", "/radius", SAMPLES.missing_property),
      createIssue("inapplicable_property", "/xAxisLabel", SAMPLES.inapplicable_property),
    ];
    const result = invalidResult(issues);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues.map((i) => i.path)).toEqual(["/radius", "/xAxisLabel"]);
  });

  it("refuses an invalid result with no issues", () => {
    expect(() => invalidResult([])).toThrow(/at least one issue/);
  });
});

describe("JSON Pointer paths (RFC 6901, AD-005)", () => {
  it("joins segments, including array indexes", () => {
    expect(pointer("points", 2, "x")).toBe("/points/2/x");
  });

  it("is empty for the whole description", () => {
    expect(pointer()).toBe("");
  });

  it("escapes ~ before /", () => {
    expect(pointer("a/b")).toBe("/a~1b");
    expect(pointer("m~n")).toBe("/m~0n");
    expect(pointer("~/")).toBe("/~0~1");
  });
});
