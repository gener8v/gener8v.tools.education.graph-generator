import { describe, expect, it } from "vitest";
import { normalize } from "../../src/core/index";
import type { Issue, ValidationResult } from "../../src/core/result";
import { withinTolerance } from "../../src/core/validate/derive";
import { normalizeWith, validateWith } from "../../src/core/validate/index";
import { fixtureRegistry } from "../fixtures/definitions/index";

const check = (input: unknown) => validateWith(input, fixtureRegistry);

function issuesOf(result: ValidationResult<unknown>): Issue[] {
  if (result.valid) throw new Error(`expected an invalid result, got ${JSON.stringify(result)}`);
  return result.issues;
}

function validOf(result: ValidationResult<unknown>): { description: Record<string, unknown>; provenance: Record<string, string> } {
  if (!result.valid) throw new Error(`expected a valid result, got ${JSON.stringify(result.issues)}`);
  return { description: result.description as Record<string, unknown>, provenance: result.provenance };
}

const codesAndPaths = (input: unknown) => issuesOf(check(input)).map((issue) => `${issue.code} ${issue.path}`);
const CIRCUMFERENCE_OF_5 = 10 * Math.PI;

describe("deriving dependent values (GSV-REQ-036, GSV-REQ-037)", () => {
  it.each([
    ["radius", 5],
    ["diameter", 10],
    ["circumference", CIRCUMFERENCE_OF_5],
  ])("derives every other member from the %s alone", (term, value) => {
    const result = validOf(check({ type: "circle", [term]: value }));
    expect(result.description).toMatchObject({ radius: 5, diameter: 10 });
    expect((result.description as Record<string, number>)["circumference"]).toBeCloseTo(CIRCUMFERENCE_OF_5, 12);
    expect(result.provenance).toEqual({
      "/radius": term === "radius" ? "supplied" : "derived",
      "/diameter": term === "diameter" ? "supplied" : "derived",
      "/circumference": term === "circumference" ? "supplied" : "derived",
    });
  });

  it("reports a circle with none of its measurements as insufficient", () => {
    const issues = issuesOf(check({ type: "circle", showCenter: true }));
    expect(issues).toEqual([
      {
        code: "insufficient",
        path: "",
        message: "circle cannot be determined: one of radius, diameter or circumference is needed; add the missing value.",
      },
    ]);
  });

  it("derives nothing from a member that failed, and reports nothing else about it", () => {
    expect(codesAndPaths({ type: "circle", radius: -1 })).toEqual(["out_of_range /radius"]);
    const result = check({ type: "circle", radius: "5", diameter: 10 });
    expect(issuesOf(result).map((issue) => `${issue.code} ${issue.path}`)).toEqual(["wrong_kind /radius"]);
  });

  it("reports a value so large that a derived value overflows", () => {
    const [issue] = issuesOf(check({ type: "circle", radius: 1e308 }));
    expect(issue).toMatchObject({ code: "out_of_range", path: "/radius", range: { max: Number.MAX_SAFE_INTEGER } });
  });
});

describe("checking supplied dependent values (GSV-REQ-023, GSV-REQ-038)", () => {
  it("accepts values within 1%, the boundary included, and rejects values just over it", () => {
    expect(withinTolerance(10.099, 10)).toBe(true); // 0.99%
    expect(withinTolerance(10.1, 10)).toBe(true); // exactly 1%
    expect(withinTolerance(9.9, 10)).toBe(true); // exactly 1% below
    expect(withinTolerance(10.101, 10)).toBe(false); // 1.01%
    expect(withinTolerance(9.899, 10)).toBe(false);
    expect(check({ type: "circle", radius: 5, diameter: 10.099 }).valid).toBe(true);
    expect(codesAndPaths({ type: "circle", radius: 5, diameter: 10.101 })).toEqual(["contradiction /diameter"]);
  });

  it("accepts values computed with π ≈ 3.14 or 22/7", () => {
    expect(check({ type: "circle", radius: 5, circumference: 31.4 }).valid).toBe(true);
    expect(check({ type: "circle", radius: 7, circumference: 44 }).valid).toBe(true);
  });

  it("keeps a supplied value that agrees, as supplied", () => {
    const result = validOf(check({ type: "circle", radius: 5, circumference: 31.4 }));
    expect(result.description).toMatchObject({ radius: 5, diameter: 10, circumference: 31.4 });
    expect(result.provenance).toMatchObject({ "/circumference": "supplied", "/diameter": "derived" });
  });

  it("reports a contradiction naming every member involved and the value that would agree", () => {
    const [issue] = issuesOf(check({ type: "circle", radius: 5, diameter: 12 }));
    expect(issue).toEqual({
      code: "contradiction",
      path: "/diameter",
      message: "diameter (12) disagrees with radius; a value of 10 would agree, or remove one of them.",
      conflicts: ["/radius"],
    });
  });

  it("takes the first supplied member in the documented order as defining", () => {
    // Diameter and circumference without a radius: diameter defines.
    expect(check({ type: "circle", diameter: 10, circumference: 31.4 }).valid).toBe(true);
    const [issue] = issuesOf(check({ type: "circle", circumference: 40, diameter: 10 }));
    expect(issue).toMatchObject({ code: "contradiction", path: "/circumference", conflicts: ["/diameter"] });
    expect(issue!.message).toBe("circumference (40) disagrees with diameter; a value of 31.42 would agree, or remove one of them.");
  });

  it("checks every other supplied member against the defining one", () => {
    expect(codesAndPaths({ type: "circle", radius: 5, diameter: 12, circumference: 40 })).toEqual([
      "contradiction /diameter",
      "contradiction /circumference",
    ]);
  });

  it("reports derivation issues alongside structure issues, in one pass (GSV-REQ-017)", () => {
    expect(codesAndPaths({ type: "circle", radius: 5, diameter: 12, showCenter: "yes" })).toEqual([
      "wrong_kind /showCenter",
      "contradiction /diameter",
    ]);
  });
});

describe("the normalized description (GSV-REQ-028, GSV-REQ-039)", () => {
  it("keeps provenance beside the description, never inside it", () => {
    const result = validOf(check({ type: "circle", diameter: 10 }));
    for (const value of Object.values(result.description)) expect(typeof value === "object" && value !== null).toBe(false);
    expect(Object.keys(result.provenance).sort()).toEqual(["/circumference", "/diameter", "/radius"]);
  });

  it("validates again to the same description (idempotence)", () => {
    for (const input of [
      { type: "circle", circumference: 31.4, title: "", lineColor: "Blue" },
      { type: "circle", diameter: 3, showCenter: false, unit: "cm" },
    ]) {
      const first = validOf(check(input));
      const second = validOf(check(first.description));
      expect(second.description).toEqual(first.description);
      expect(Object.values(second.provenance).every((source) => source === "supplied")).toBe(true);
    }
  });

  it("is built on null prototypes, and a parsed __proto__ key adds nothing", () => {
    const result = validOf(check({ type: "circle", radius: 2 }));
    expect(Object.getPrototypeOf(result.description)).toBeNull();
    expect(Object.getPrototypeOf(result.provenance)).toBeNull();
    const parsed = JSON.parse('{"type":"circle","radius":2,"__proto__":{"diameter":99}}') as unknown;
    expect(codesAndPaths(parsed)).toEqual(["unknown_property /__proto__"]);
  });

  it("is plain JSON data", () => {
    const result = check({ type: "circle", circumference: 31.4 });
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });
});

describe("normalize", () => {
  it("returns the normalized description of a valid input", () => {
    expect(normalizeWith({ type: "circle", radius: 1 }, fixtureRegistry)).toMatchObject({ type: "circle", radius: 1, diameter: 2 });
  });

  it("throws for an invalid input", () => {
    expect(() => normalizeWith({ type: "circle", radius: 5, diameter: 12 }, fixtureRegistry)).toThrow(/not valid; call validate first/);
    expect(() => normalize({ type: "pie" })).toThrow(/not valid/);
  });
});
