import { readFileSync } from "node:fs";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { labelSidesProperty, unitProperty } from "../../src/core/definitions/figure";
import { definitions } from "../../src/core/definitions/index";
import { CALLER_TEXT_LIMIT, UNIT_TEXT_LIMIT } from "../../src/core/definitions/shared";
import { type Triangle, isRightAngle, triangle, triangleDisplay } from "../../src/core/definitions/triangle";
import { TRIANGLE_MIN_ANGLE } from "../../src/core/geometry/triangle-solver";
import { coordinates } from "../../src/core/definitions/xy-graph";
import type { Issue, Provenance, ValidationResult } from "../../src/core/result";
import { validateWith } from "../../src/core/validate/index";

// Registered by graph-library GSS TICKET-005, which draws it.
const registry = definitions;
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

describe("the triangle is registered (graph-library GSS TICKET-005)", () => {
  it("is the package's triangle definition", () => {
    expect(definitions.triangle).toBe(triangle);
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
  it.each([0, 0.019, 180, -5, 200])("reports an angle of %d° as out of range, in degrees, from the 0.02° floor (security review SEC-001)", (angleA) => {
    const [issue, ...rest] = issuesOf(check({ sideB: 3, sideC: 4, angleA }));
    expect(rest).toEqual([]);
    expect(issue).toMatchObject({ code: "out_of_range", path: "/angleA", range: { min: 0.02, max: 180, exclusiveMax: true } });
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
    const [issue, ...rest] = issuesOf(check({ vertices: [{ x: -600_000, y: 0 }, { x: 600_000, y: 0 }, { x: 0, y: 600_000 }] }));
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
  it("uses the one labelSides term with the square, by identity (graph-library GSS TICKET-005)", () => {
    expect(triangle.properties["labelSides"]).toBe(labelSidesProperty);
    expect(definitions.square!.properties["labelSides"]).toBe(labelSidesProperty);
  });

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

describe("a valid triangle's normalized description is valid again, unchanged (security review SEC-001)", () => {
  const RADIANS = Math.PI / 180;
  // Just above the floor, so no derived angle rounds under it.
  const floor = TRIANGLE_MIN_ANGLE * 1.005;
  const finite = (min: number, max: number) => fc.double({ min, max, noNaN: true, noDefaultInfinity: true });

  /** Every side and angle of a triangle inside the definition's ranges, from two angles and the longest side. */
  const triangles = fc
    .tuple(finite(floor, 180 - 2 * floor), finite(0, 1), finite(0.01, 1_000_000))
    .map(([a, share, longest]) => {
      const b = floor + share * (180 - 2 * floor - a);
      const angles = [a, b, 180 - a - b] as const;
      const sines = angles.map((angle) => Math.sin(Math.min(angle, 180 - angle) * RADIANS));
      const scale = longest / Math.max(...sines);
      return { angles, sides: sines.map((sine) => scale * sine) as [number, number, number] };
    })
    // A hair inside the side range, so a derived side at the limit cannot round past it.
    .filter(({ sides }) => sides.every((side) => side >= 0.001 * (1 + 1e-6) && side <= 1_000_000 * (1 - 1e-6)));

  const sets: ReadonlyArray<readonly [string, (t: { angles: readonly number[]; sides: readonly number[] }) => object]> = [
    ["three sides", ({ sides }) => ({ sideA: sides[0], sideB: sides[1], sideC: sides[2] })],
    ["two sides and the angle between them", ({ sides, angles }) => ({ sideB: sides[1], sideC: sides[2], angleA: angles[0] })],
    ["two angles and the side between them", ({ sides, angles }) => ({ angleA: angles[0], angleB: angles[1], sideC: sides[2] })],
    ["two angles and another side", ({ sides, angles }) => ({ angleA: angles[0], angleB: angles[1], sideA: sides[0] })],
    ["three vertices", ({ sides, angles }) => {
      const [b, c] = [sides[1]!, sides[2]!];
      return { vertices: [{ x: 0, y: 0 }, { x: c, y: 0 }, { x: b * Math.cos(angles[0]! * RADIANS), y: b * Math.sin(Math.min(angles[0]!, 180 - angles[0]!) * RADIANS) }] };
    }],
  ];

  it.each(sets)("holds for %s", (_, inputOf) => {
    fc.assert(
      fc.property(triangles, (generated) => {
        // Every generated triangle is inside the ranges and above the floor, so it is valid.
        const result = check(inputOf(generated));
        expect(result.valid).toBe(true);
        if (!result.valid) return;
        const again = check(result.description);
        expect(again.valid).toBe(true);
        if (again.valid) expect(again.description).toEqual(result.description);
      }),
      { numRuns: 1_000 },
    );
  });
});


describe("what a triangle labels (GSS-REQ-020, GSS-REQ-021, GSS-REQ-035)", () => {
  const shown = (input: object) => {
    const { description, provenance } = valid(check(input));
    return triangleDisplay(description, provenance);
  };
  const labeled = (display: ReturnType<typeof shown>, kind: "sides" | "angles") => Object.entries(display[kind]).flatMap(([term, label]) => (label.labeled ? [term] : []));

  it("labels nothing by default", () => {
    const display = shown({ sideA: 3, sideB: 4, sideC: 5 });
    expect(labeled(display, "sides")).toEqual([]);
    expect(labeled(display, "angles")).toEqual([]);
    expect(display.names).toEqual(["", "", ""]);
  });

  it.each<[object, string]>([
    [{ sideA: 3, sideB: 4, sideC: 5 }, "sideA"],
    [{ sideB: 4, sideC: 5, angleA: 36.87 }, "sideB"],
    [{ angleA: RIGHT_A, angleB: 90 - RIGHT_A, sideC: 5 }, "sideC"],
    [{ sideA: 3, sideB: 4, angleC: 90 }, "sideA"],
    [{ vertices: [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 3.2, y: 2.4 }] }, "sideA"],
    [{ vertices: [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 3.2, y: 2.4 }], sideC: 5 }, "sideA"],
  ])("stands %j on its first given side in the order a, b, c, and labels that side for labelSides one", (input, base) => {
    const display = shown({ ...input, labelSides: "one" });
    expect(display.base).toBe(base);
    expect(labeled(display, "sides")).toEqual([base]);
  });

  it("labels every side for labelSides all, and every angle for labelAngles", () => {
    const display = shown({ sideA: 3, sideB: 4, sideC: 5, labelSides: "all", labelAngles: true });
    expect(labeled(display, "sides")).toEqual(["sideA", "sideB", "sideC"]);
    expect(labeled(display, "angles")).toEqual(["angleA", "angleB", "angleC"]);
  });

  it("labels a side or an angle from its custom text alone", () => {
    const display = shown({ sideA: 3, sideB: 4, sideC: 5, sideBLabelText: "x", angleALabelText: "" });
    expect(labeled(display, "sides")).toEqual(["sideB"]);
    expect(display.sides.sideB.customText).toBe("x");
    expect(labeled(display, "angles")).toEqual(["angleA"]);
    expect(display.angles.angleA.customText).toBe("");
  });

  it("refuses angle label text with labelAngles false, as the circle refuses its label text against a false switch", () => {
    expect(issuesOf(check({ sideA: 3, sideB: 4, sideC: 5, labelAngles: false, angleBLabelText: "θ" }))).toEqual([
      expect.objectContaining({ code: "contradiction", path: "/angleBLabelText", conflicts: ["/labelAngles"] }),
    ]);
    valid(check({ sideA: 3, sideB: 4, sideC: 5, labelAngles: false, labelSides: "one", sideALabelText: "x" }));
  });

  it("marks a shown angle within 1% of 90° as a right angle, and no other", () => {
    expect(isRightAngle(90)).toBe(true);
    expect(isRightAngle(90.9)).toBe(true);
    expect(isRightAngle(89.1)).toBe(true);
    expect(isRightAngle(91)).toBe(false);
    expect(isRightAngle(89)).toBe(false);
    expect(shown({ sideA: 3, sideB: 4, sideC: 5, labelAngles: true }).angles.angleC.rightAngle).toBe(true);
    expect(shown({ sideA: 3, sideB: 4, sideC: 5 }).angles.angleC.rightAngle).toBe(false);
    expect(shown({ sideA: 3, sideB: 4, sideC: 5, labelAngles: true }).angles.angleA.rightAngle).toBe(false);
  });

  it("cleans vertex names, a blank one showing nothing", () => {
    expect(shown({ sideA: 3, sideB: 4, sideC: 5, vertexNames: [" P ", "   ", "R"] }).names).toEqual(["P", "", "R"]);
  });

  it("holds every label text to the caller-text limit", () => {
    for (const term of ["sideALabelText", "sideBLabelText", "sideCLabelText", "angleALabelText", "angleBLabelText", "angleCLabelText"]) {
      expect(codesAndPaths({ sideA: 3, sideB: 4, sideC: 5, [term]: "x".repeat(CALLER_TEXT_LIMIT + 1) })).toEqual([`too_large /${term}`]);
      valid(check({ sideA: 3, sideB: 4, sideC: 5, [term]: "x".repeat(CALLER_TEXT_LIMIT) }));
    }
  });
});

describe("the text alternative states the shown labels (GSS-REQ-020, GSS-REQ-035, GSS-REQ-036)", () => {
  const alt = (input: object) => {
    const { description, provenance } = valid(check({ sideA: 3, sideB: 4, sideC: 5, ...input }));
    return triangle.describe(description, provenance);
  };
  const VALUES = "A triangle with sides a 3, b 4 and c 5, and angles A 36.87°, B 53.13° and C 90°.";

  it("states labeled sides and angles, and the right-angle mark", () => {
    expect(alt({ labelSides: "all", labelAngles: true })).toBe(
      `${VALUES} All three sides are labeled with their lengths. All three angles are labeled with their measures. Angle C is marked as a right angle.`,
    );
    expect(alt({ labelSides: "one" })).toBe(`${VALUES} Side a is labeled with its length.`);
  });

  it("quotes custom text, still stating the value, and states a blank label", () => {
    expect(alt({ labelSides: "one", sideCLabelText: "x", angleBLabelText: "θ", angleALabelText: " " })).toBe(
      `${VALUES} Side a is labeled with its length. Side c is labeled “x”. The angle A label is left blank. Angle B is labeled “θ”.`,
    );
    expect(alt({ labelAngles: true, angleCLabelText: "?" })).toBe(
      `${VALUES} Angles A and B are labeled with their measures. Angle C is labeled “?”. Angle C is marked as a right angle.`,
    );
  });
});

describe("triangle examples (GSV-NFR-005)", () => {
  const example = (name: string): unknown => JSON.parse(readFileSync(`examples/${name}.json`, "utf8"));

  it("each example, one per determining set, is valid", () => {
    for (const name of ["triangle", "triangle-sas", "triangle-asa", "triangle-vertices"]) expect(validateWith(example(name), registry).valid, name).toBe(true);
  });

  it("each invalid example fails for its stated reason", () => {
    expect(issuesOf(validateWith(example("invalid/triangle-ambiguous"), registry))).toEqual([expect.objectContaining({ code: "ambiguous", path: "" })]);
    expect(issuesOf(validateWith(example("invalid/triangle-inequality"), registry))).toEqual([expect.objectContaining({ code: "contradiction", path: "/sideC" })]);
  });
});

describe("vertex names are read as the caller's own elements (security review SEC-001)", () => {
  it("never draws or states a name inherited from a polluted Array.prototype", () => {
    const proto = Array.prototype as unknown as Record<string, unknown>;
    try {
      proto["1"] = "INHERITED";
      proto["2"] = "INHERITED";
      for (const vertexNames of [undefined, ["P"]]) {
        const { description, provenance } = valid(check({ sideA: 3, sideB: 4, sideC: 5, ...(vertexNames === undefined ? {} : { vertexNames }) }));
        expect(triangle.describe(description, provenance)).not.toContain("INHERITED");
      }
    } finally {
      delete proto["1"];
      delete proto["2"];
    }
  });
});

