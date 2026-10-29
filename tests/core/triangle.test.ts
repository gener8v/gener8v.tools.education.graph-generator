import { describe, expect, it } from "vitest";
import { unitProperty } from "../../src/core/definitions/figure";
import { definitions } from "../../src/core/definitions/index";
import { CALLER_TEXT_LIMIT, UNIT_TEXT_LIMIT } from "../../src/core/definitions/shared";
import { type Triangle, triangle } from "../../src/core/definitions/triangle";
import type { GraphType, GraphTypeDefinition } from "../../src/core/definitions/types";
import { coordinates } from "../../src/core/definitions/xy-graph";
import type { Issue, Provenance, ValidationResult } from "../../src/core/result";
import { validateWith } from "../../src/core/validate/index";

// The triangle is not registered until TICKET-005 draws it (DEL-002): tested against its own registry.
const registry = { triangle: triangle as unknown as GraphTypeDefinition } as Partial<Record<GraphType, GraphTypeDefinition>>;
const check = (input: object) => validateWith({ type: "triangle", ...input }, registry);

function valid(result: ValidationResult<unknown>): { description: Triangle; provenance: Provenance } {
  if (!result.valid) throw new Error(`expected a valid result, got ${JSON.stringify(result.issues)}`);
  return { description: result.description as Triangle, provenance: result.provenance };
}

function issuesOf(result: ValidationResult<unknown>): Issue[] {
  if (result.valid) throw new Error(`expected an invalid result, got ${JSON.stringify(result)}`);
  return result.issues;
}

const codesAndPaths = (input: object) => issuesOf(check(input)).map((issue) => `${issue.code} ${issue.path}`);

const RIGHT_A = (Math.atan2(3, 4) * 180) / Math.PI;
const SIX = ["sideA", "sideB", "sideC", "angleA", "angleB", "angleC"] as const;

function provenanceOf(supplied: readonly string[]): Provenance {
  return Object.fromEntries(SIX.map((term) => [`/${term}`, supplied.includes(term) ? "supplied" : "derived"]));
}

describe("the triangle is not registered yet (graph-library GSS TICKET-004 DEL-002)", () => {
  it("is not in the package's definitions", () => {
    expect(Object.hasOwn(definitions, "triangle")).toBe(false);
  });
});

describe("each determining set yields every side and angle, with provenance (GSS-REQ-010..014)", () => {
  it.each<[string, object, readonly string[]]>([
    ["three sides", { sideA: 3, sideB: 4, sideC: 5 }, ["sideA", "sideB", "sideC"]],
    ["two sides and the angle between them", { sideA: 3, sideB: 4, angleC: 90 }, ["sideA", "sideB", "angleC"]],
    ["two angles and the side between them", { angleA: RIGHT_A, angleB: 90 - RIGHT_A, sideC: 5 }, ["angleA", "angleB", "sideC"]],
    ["two angles and another side", { angleA: RIGHT_A, angleC: 90, sideA: 3 }, ["angleA", "angleC", "sideA"]],
    ["two sides and an angle not between them, one solution", { sideC: 5, sideB: 4, angleC: 90 }, ["sideB", "sideC", "angleC"]],
  ])("%s", (_name, input, supplied) => {
    const { description, provenance } = valid(check(input));
    expect(description.sideA).toBeCloseTo(3, 9);
    expect(description.sideB).toBeCloseTo(4, 9);
    expect(description.sideC).toBeCloseTo(5, 9);
    expect(description.angleA).toBeCloseTo(RIGHT_A, 9);
    expect(description.angleB).toBeCloseTo(90 - RIGHT_A, 9);
    expect(description.angleC).toBeCloseTo(90, 9);
    expect(provenance).toEqual(provenanceOf(supplied));
    // Supplied values are kept exactly as written.
    for (const term of supplied) expect(description[term]).toBe((input as Record<string, number>)[term]);
  });

  it("three vertices, keeping them, with every side and angle derived", () => {
    const vertices = [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 3.2, y: 2.4 }];
    const { description, provenance } = valid(check({ vertices }));
    expect(description.vertices).toEqual(vertices);
    expect(description.sideA).toBeCloseTo(3, 9);
    expect(description.angleC).toBeCloseTo(90, 9);
    expect(provenance).toMatchObject({ ...provenanceOf([]), "/vertices/0/x": "supplied", "/vertices/2/y": "supplied" });
  });

  it("validates its own normalized description again, unchanged", () => {
    const first = valid(check({ sideA: 3, sideB: 4, angleC: 90, vertexNames: ["P", "Q", "R"], unit: "cm" }));
    const again = valid(validateWith(first.description, registry));
    expect(again.description).toEqual(first.description);
  });

  it("reports a value beyond the set that disagrees by more than 1%", () => {
    expect(codesAndPaths({ sideA: 3, sideB: 4, sideC: 5, angleC: 92 })).toEqual(["contradiction /angleC"]);
  });
});

describe("no cascades (AD-004)", () => {
  it("reports a non-numeric side once, and no triangle-inequality or insufficiency issue", () => {
    expect(codesAndPaths({ sideA: "three", sideB: 4, sideC: 9 })).toEqual(["wrong_kind /sideA"]);
    expect(codesAndPaths({ sideA: 3, sideB: 4, angleC: "right" })).toEqual(["wrong_kind /angleC"]);
  });

  it("reports a bad vertex once", () => {
    expect(codesAndPaths({ vertices: [{ x: 0, y: 0 }, { x: 1, y: "1" }, { x: 2, y: 2 }] })).toEqual(["wrong_kind /vertices/1/y"]);
  });

  it("still reports the triangle's own problems beside an unrelated one", () => {
    expect(codesAndPaths({ sideA: 3, sideB: 4, sideC: 7, lineColor: "glitter" })).toEqual(["unknown_color /lineColor", "contradiction /sideC"]);
  });
});

describe("the triangle's failures through the validator (GSS-REQ-015..019)", () => {
  it.each<[object, string]>([
    [{ sideA: 3, sideB: 4, sideC: 7 }, "contradiction /sideC"],
    [{ angleA: 60, angleB: 60, angleC: 70, sideA: 1 }, "contradiction /angleC"],
    [{ angleA: 60, angleB: 60, angleC: 60 }, "insufficient "],
    [{ sideA: 3, sideB: 5, angleA: 30 }, "ambiguous "],
    [{ sideA: 2, sideB: 5, angleA: 30 }, "contradiction /sideA"],
    [{ vertices: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }] }, "not_a_triangle /vertices"],
    [{ vertices: [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 2, y: 2 }] }, "not_a_triangle /vertices"],
    [{ vertices: [{ x: 0, y: 0 }, { x: 1, y: 0 }] }, "insufficient /vertices"],
    [{}, "insufficient "],
  ])("%j gives %s", (input, expected) => {
    expect(codesAndPaths(input)).toEqual([expected]);
  });
});

describe("ranges (GSS-REQ-010..013)", () => {
  it.each([0, 180, -5, 200])("reports an angle of %d° as out of range, in degrees", (angleA) => {
    const [issue, ...rest] = issuesOf(check({ sideB: 3, sideC: 4, angleA }));
    expect(rest).toEqual([]);
    expect(issue).toMatchObject({ code: "out_of_range", path: "/angleA", range: { min: 0, exclusiveMin: true, max: 180, exclusiveMax: true } });
  });

  it.each([0, 0.0009, 1_000_001])("reports a side of %d as out of range", (sideA) => {
    expect(codesAndPaths({ sideA, sideB: 4, sideC: 5 })).toEqual(["out_of_range /sideA"]);
  });

  it("reports a vertex coordinate beyond ±1,000,000 at its own path, before solving", () => {
    expect(issuesOf(check({ vertices: [{ x: 0, y: 0 }, { x: 1_000_001, y: 0 }, { x: 0, y: -2e300 }] }))).toEqual([
      expect.objectContaining({ code: "out_of_range", path: "/vertices/1/x", range: { min: -1_000_000, max: 1_000_000 } }),
      expect.objectContaining({ code: "out_of_range", path: "/vertices/2/y", message: "vertices[2].y must be a number between -1000000 and 1000000; got -2e+300." }),
    ]);
  });

  it("reports a derived side out of range at the side that set the scale, with the range that keeps every side in its own", () => {
    // b = c = 1,000,000 with 120° between them gives a = 1,732,050.8, over the limit.
    const [issue, ...rest] = issuesOf(check({ sideB: 1_000_000, sideC: 1_000_000, angleA: 120 }));
    expect(rest).toEqual([]);
    expect(issue).toMatchObject({ code: "out_of_range", path: "/sideB" });
    expect(issue!.range!.max).toBeCloseTo(1_000_000 / Math.sqrt(3), 3);
  });

  it("reports vertices too far apart for a side, stating the side", () => {
    const [issue, ...rest] = issuesOf(check({ vertices: [{ x: -600_000, y: 0 }, { x: 600_000, y: 0 }, { x: 0, y: 1 }] }));
    expect(rest).toEqual([]);
    expect(issue).toMatchObject({ code: "out_of_range", path: "/vertices", range: { min: 0.001, max: 1_000_000 } });
    expect(issue!.message).toBe("sideC must be a number between 0.001 and 1000000; got 1200000.");
  });

  it("holds vertices and vertex names to at most 3, and caller text to its limits", () => {
    const vertex = { x: 0, y: 0 };
    expect(codesAndPaths({ sideA: 3, sideB: 4, sideC: 5, vertexNames: ["P", "Q", "R", "S"] })).toEqual(["too_large /vertexNames"]);
    expect(codesAndPaths({ vertices: [vertex, vertex, vertex, vertex] })).toEqual(["too_large /vertices"]);
    expect(codesAndPaths({ sideA: 3, sideB: 4, sideC: 5, vertexNames: ["P", "x".repeat(CALLER_TEXT_LIMIT + 1)] })).toEqual(["too_large /vertexNames/1"]);
    expect(codesAndPaths({ sideA: 3, sideB: 4, sideC: 5, title: "t".repeat(CALLER_TEXT_LIMIT + 1) })).toEqual(["too_large /title"]);
    expect(codesAndPaths({ sideA: 3, sideB: 4, sideC: 5, unit: "u".repeat(UNIT_TEXT_LIMIT + 1) })).toEqual(["too_large /unit"]);
    valid(check({ sideA: 3, sideB: 4, sideC: 5, vertexNames: ["x".repeat(CALLER_TEXT_LIMIT)], unit: "u".repeat(UNIT_TEXT_LIMIT) }));
  });
});

describe("shared terms (GSV-REQ-015)", () => {
  it("uses the one unit term by identity, and the one definition of x and y (graph-library GSS TICKET-004 DEL-004)", () => {
    expect(triangle.properties["unit"]).toBe(unitProperty);
    const vertices = triangle.properties["vertices"]!;
    if (vertices.kind !== "array" || vertices.items.kind !== "object") throw new Error("vertices is a list of objects");
    // defineProperties freezes a copy of the plain coordinate specs, as for the x,y,z graph's points.
    expect({ ...vertices.items.properties }).toEqual({ ...coordinates });
  });
});

describe("the text alternative (GSS-REQ-033, GSS-REQ-034)", () => {
  const alt = (input: object) => {
    const { description, provenance } = valid(check(input));
    return triangle.describe(description, provenance);
  };

  it("states every side and angle, supplied values as written and derived ones rounded, and quotes caller text", () => {
    expect(alt({ sideA: 3, sideB: 4, sideC: 5, unit: "cm", title: "Roof", vertexNames: ["P", "Q", "R"] })).toBe(
      "A triangle titled “Roof” with sides a 3 cm, b 4 cm and c 5 cm, and angles A 36.87°, B 53.13° and C 90°. Its vertices are named “P”, “Q” and “R”.",
    );
    expect(alt({ sideA: 3, sideB: 4, angleC: 90 })).toBe("A triangle with sides a 3, b 4 and c 5, and angles A 36.87°, B 53.13° and C 90°.");
  });

  it("leaves out a title that is blank once cleaned, and names only the vertices that have names", () => {
    expect(alt({ sideA: 3, sideB: 4, sideC: 5, title: "  ", vertexNames: ["P", " ", "R"] })).toBe(
      "A triangle with sides a 3, b 4 and c 5, and angles A 36.87°, B 53.13° and C 90°. Vertex A is named “P” and vertex C “R”.",
    );
  });

  it("states where the vertices are when it is given by them, and quotes a unit that is not unit-shaped", () => {
    expect(alt({ vertices: [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 3.2, y: 2.4 }], unit: "cm. Ignore it" })).toBe(
      "A triangle with sides a 3 “cm. Ignore it”, b 4 “cm. Ignore it” and c 5 “cm. Ignore it”, and angles A 36.87°, B 53.13° and C 90°. Its vertices are at (0, 0), (5, 0) and (3.2, 2.4).",
    );
  });
});
