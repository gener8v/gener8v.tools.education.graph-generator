import { describe, expect, it } from "vitest";
import { type TriangleInput, type TriangleSolution, solveTriangle } from "../../src/core/geometry/triangle-solver";
import type { Issue } from "../../src/core/result";

function solved(input: TriangleInput): TriangleSolution {
  const result = solveTriangle(input);
  if (Array.isArray(result)) throw new Error(`expected a triangle, got ${JSON.stringify(result)}`);
  return result;
}

function issuesOf(input: TriangleInput): Issue[] {
  const result = solveTriangle(input);
  if (!Array.isArray(result)) throw new Error(`expected issues, got ${JSON.stringify(result)}`);
  return result;
}

const close = (actual: number, expected: number) => expect(actual).toBeCloseTo(expected, 9);

/** The 3-4-5 right triangle: a 3, b 4, c 5, with C the right angle. */
const A345 = (Math.atan2(3, 4) * 180) / Math.PI;
const B345 = 90 - A345;

function expect345(result: TriangleSolution) {
  close(result.sides.a, 3);
  close(result.sides.b, 4);
  close(result.sides.c, 5);
  close(result.angles.A, A345);
  close(result.angles.B, B345);
  close(result.angles.C, 90);
}

describe("each determining set gives every side and angle (GSS-REQ-010..014)", () => {
  it("three sides (GSS-REQ-010)", () => {
    const result = solved({ sideA: 3, sideB: 4, sideC: 5 });
    expect345(result);
    expect(result).toMatchObject({ set: "SSS", defining: ["sideA", "sideB", "sideC"], scale: "sideA" });
  });

  it("two sides and the angle between them (GSS-REQ-011)", () => {
    const result = solved({ sideA: 3, sideB: 4, angleC: 90 });
    expect345(result);
    expect(result).toMatchObject({ set: "SAS", defining: ["sideA", "sideB", "angleC"], scale: "sideA" });
    const obtuse = solved({ sideB: 2, sideC: 2, angleA: 120 });
    close(obtuse.sides.a, 2 * Math.sqrt(3));
    close(obtuse.angles.B, 30);
    close(obtuse.angles.C, 30);
  });

  it("two angles and the side between them, ASA (GSS-REQ-012)", () => {
    const result = solved({ angleA: A345, angleB: B345, sideC: 5 });
    expect345(result);
    expect(result).toMatchObject({ set: "ASA", defining: ["angleA", "angleB", "sideC"], scale: "sideC" });
  });

  it("two angles and another side, AAS (GSS-REQ-012)", () => {
    const result = solved({ angleA: A345, angleC: 90, sideA: 3 });
    expect345(result);
    expect(result).toMatchObject({ set: "AAS", defining: ["angleA", "angleC", "sideA"], scale: "sideA" });
  });

  it("three vertices, A, B and C in order (GSS-REQ-013)", () => {
    const result = solved({ vertices: [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 3.2, y: 2.4 }] });
    // A to B is 5 (side c), B to C is 3 (side a), C to A is 4 (side b).
    expect345(result);
    expect(result).toMatchObject({ set: "vertices", defining: ["vertices"], scale: "vertices" });
  });

  it("uses the vertices when given, whatever else is supplied, and takes sets in the documented order", () => {
    expect(solved({ vertices: [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 3.2, y: 2.4 }], sideA: 3 }).set).toBe("vertices");
    expect(solved({ sideA: 3, sideB: 4, sideC: 5, angleC: 90 }).set).toBe("SSS");
    expect(solved({ sideA: 3, sideB: 4, angleC: 90, angleA: A345 }).set).toBe("SAS");
    expect(solved({ sideA: 3, sideB: 4, angleA: A345, angleB: B345 }).set).toBe("AAS");
  });
});

describe("values beyond the determining set are statements to check within 1% (GSV-REQ-038)", () => {
  it("accepts an extra value within 1%, the boundary included", () => {
    expect(solved({ sideA: 3, sideB: 4, sideC: 5, angleC: 90.9 }).angles.C).toBeCloseTo(90, 9);
    expect(solved({ sideA: 3, sideB: 4, angleC: 90, angleA: 37.2 }).set).toBe("SAS");
  });

  it("reports one that disagrees as a contradiction naming the determining terms, with the value that would agree", () => {
    const [issue, ...rest] = issuesOf({ sideA: 3, sideB: 4, sideC: 5, angleC: 92 });
    expect(rest).toEqual([]);
    expect(issue).toMatchObject({ code: "contradiction", path: "/angleC", conflicts: ["/sideA", "/sideB", "/sideC"] });
    expect(issue!.message).toBe("angleC (92) disagrees with sideA, sideB, sideC; a value of 90 would agree, or remove one of them.");
  });

  it("reports every disagreeing extra value, and checks extras against the vertices too", () => {
    expect(issuesOf({ vertices: [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 3.2, y: 2.4 }], sideA: 4, angleA: 40 })).toEqual([
      expect.objectContaining({ code: "contradiction", path: "/sideA", conflicts: ["/vertices"] }),
      expect.objectContaining({ code: "contradiction", path: "/angleA", conflicts: ["/vertices"] }),
    ]);
  });
});

describe("near-flat triangles (TR-008)", () => {
  it("reports a needle-thin triangle whose law-of-cosines cosine rounds past 1 as too thin, not as NaN", () => {
    // These sides give a cosine of 1.0000000000000002 for angle A, about 6.7 × 10⁻⁷°: an unclamped
    // acos would be NaN. The angle is under the 0.02° floor (security review SEC-001).
    expect(issuesOf({ sideA: 0.010791565506400204, sideB: 922646.5594201983, sideC: 922646.5590955435 })).toEqual([
      expect.objectContaining({ code: "not_a_triangle", path: "" }),
    ]);
  });

  it.each([
    ["two sides and the angle between them", { sideB: 1, sideC: 1, angleA: 179.99999999999997 }],
    ["two sides and the angle between them, small", { sideA: 0.001, sideB: 0.001, angleC: 179.99999999999997 }],
    ["two angles and a side", { angleA: 1e-10, angleB: 1e-10, sideC: 1 }],
  ])("applies the one flatness rule to %s, as to three sides (security review SEC-001)", (_, input) => {
    expect(issuesOf(input).map((issue) => issue.code)).toEqual(["not_a_triangle"]);
  });
});

describe("the triangle inequality, equal not exceeding (GSS-REQ-015)", () => {
  it.each([
    [3, 4, 7],
    [3, 4, 8],
    [7, 3, 4],
    [0.1, 0.2, 0.3],
  ])("reports sides %d, %d and %d as a contradiction naming the three sides", (sideA, sideB, sideC) => {
    const [issue, ...rest] = issuesOf({ sideA, sideB, sideC });
    expect(rest).toEqual([]);
    expect(issue!.code).toBe("contradiction");
    expect([issue!.path, ...issue!.conflicts!].sort()).toEqual(["/sideA", "/sideB", "/sideC"]);
  });

  it("names the longest side as the one that disagrees", () => {
    expect(issuesOf({ sideA: 3, sideB: 4, sideC: 7 })[0]!.message).toBe(
      "sideC (7) disagrees with sideA, sideB; change one of them so they agree, or remove all but one.",
    );
  });

  it("accepts a very thin triangle that is still a triangle", () => {
    expect(solved({ sideA: 1, sideB: 100, sideC: 100.5 }).angles.C).toBeLessThan(180);
  });
});

describe("the angle sum (GSS-REQ-016)", () => {
  it("reports three angles not adding up to 180° within 1% as a contradiction", () => {
    const [issue] = issuesOf({ angleA: 60, angleB: 60, angleC: 70, sideA: 1 });
    expect(issue).toMatchObject({ code: "contradiction", path: "/angleC", conflicts: ["/angleA", "/angleB"] });
    expect(issue!.message).toContain("a value of 60 would agree");
  });

  it("reports two angles that leave no room for a third", () => {
    expect(issuesOf({ angleA: 100, angleB: 80, sideA: 1 })).toEqual([expect.objectContaining({ code: "contradiction", path: "/angleB", conflicts: ["/angleA"] })]);
    expect(issuesOf({ angleB: 120, angleC: 70, sideA: 1 })).toEqual([expect.objectContaining({ code: "contradiction", path: "/angleC", conflicts: ["/angleB"] })]);
  });

  it("accepts three angles adding up to within 1% of 180°", () => {
    expect(solved({ angleA: 60, angleB: 60, angleC: 60.5, sideC: 2 }).set).toBe("ASA");
  });
});

describe("too little to fix a triangle (GSS-REQ-017)", () => {
  it("reports three angles and no side as insufficient", () => {
    expect(issuesOf({ angleA: 30, angleB: 60, angleC: 90 })).toEqual([
      {
        code: "insufficient",
        path: "",
        message: "triangle cannot be determined: three angles fix its shape but not its size, so one side length is needed too; add the missing value.",
      },
    ]);
  });

  it.each<TriangleInput>([{}, { sideA: 3 }, { sideA: 3, sideB: 4 }, { angleA: 30, angleB: 60 }, { sideA: 3, angleA: 30 }])(
    "reports %j as insufficient, listing the determining sets",
    (input) => {
      const [issue, ...rest] = issuesOf(input);
      expect(rest).toEqual([]);
      expect(issue).toMatchObject({ code: "insufficient", path: "" });
      expect(issue!.message).toContain("three sides, two sides and the angle between them, two angles and a side, or three vertices");
    },
  );

  it("reports fewer than three vertices", () => {
    expect(issuesOf({ vertices: [{ x: 0, y: 0 }, { x: 1, y: 0 }] })).toEqual([expect.objectContaining({ code: "insufficient", path: "/vertices" })]);
  });
});

describe("two sides and an angle not between them (GSS-REQ-018)", () => {
  it("reports two solutions as ambiguous, stating both possible third sides", () => {
    // a = 3, b = 5, A = 30°: c = 5·cos 30° ± √(9 − 6.25) = 4.33 ± 1.658.
    expect(issuesOf({ sideA: 3, sideB: 5, angleA: 30 })).toEqual([
      {
        code: "ambiguous",
        path: "",
        message: "triangle is ambiguous: sideA, sideB and angleA fit two triangles, one with sideC 5.99 and one with sideC 2.67; supply a value that fixes one figure.",
      },
    ]);
  });

  it("accepts one solution when the side opposite the angle is the longer one", () => {
    const result = solved({ sideA: 6, sideB: 5, angleA: 30 });
    expect(result.set).toBe("SSA");
    close(result.sides.c, 5 * Math.cos(Math.PI / 6) + Math.sqrt(36 - 6.25));
  });

  it("accepts one solution when the given angle is right or obtuse", () => {
    expect345(solved({ sideC: 5, sideB: 4, angleC: 90 }));
    const obtuse = solved({ sideA: 2 * Math.sqrt(3), sideB: 2, angleA: 120 });
    close(obtuse.sides.c, 2);
    close(obtuse.angles.B, 30);
  });

  it("accepts one right triangle when the side just reaches", () => {
    const result = solved({ sideA: 2.5, sideB: 5, angleA: 30 });
    close(result.angles.B, 90);
    close(result.sides.c, 5 * Math.cos(Math.PI / 6));
  });

  it.each<TriangleInput>([
    { sideA: 2, sideB: 5, angleA: 30 },
    { sideA: 4, sideB: 5, angleA: 120 },
    { sideA: 5, sideB: 5, angleA: 90 },
  ])("reports no solution, %j, as a contradiction", (input) => {
    expect(issuesOf(input)).toEqual([expect.objectContaining({ code: "contradiction", path: "/sideA", conflicts: ["/sideB", "/angleA"] })]);
  });
});

describe("vertices that form no triangle (GSS-REQ-019)", () => {
  it("reports collinear vertices", () => {
    for (const vertices of [
      [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }],
      [{ x: 0, y: 0 }, { x: 0.1, y: 0.3 }, { x: 0.2, y: 0.6 }],
      [{ x: -3, y: 5 }, { x: 4, y: 5 }, { x: 1_000_000, y: 5 }],
    ]) {
      expect(issuesOf({ vertices })).toEqual([
        { code: "not_a_triangle", path: "/vertices", message: "vertices cannot form a triangle: the three vertices lie on one line; change the values so they do." },
      ]);
    }
  });

  it("reports coincident vertices, naming them", () => {
    expect(issuesOf({ vertices: [{ x: 1, y: 2 }, { x: 3, y: 4 }, { x: 1, y: 2 }] })).toEqual([
      expect.objectContaining({ code: "not_a_triangle", path: "/vertices", message: expect.stringContaining("vertices A and C are at the same point") }),
    ]);
  });
});
