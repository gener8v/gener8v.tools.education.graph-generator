import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { type TriangleInput, type TriangleSolution, solveTriangle } from "../../src/core/geometry/triangle-solver";

/**
 * GSS-NFR-002: derived sides and angles reproduce the supplied ones within 10⁻⁹ relative error
 * when recomputed, over at least 1,000 generated triangles per determining set.
 *
 * The generated triangles have every angle at least 0.02° (so at most 179.96°) and a longest side
 * from 0.01 to 1,000,000, the definition's whole range of sizes. Each supplied value is recomputed
 * in a form that is well conditioned for its triangle (`recomputed`). Below about 0.01° the
 * rounding of the generated inputs themselves, not the solver, decides the last digits (measured
 * at 1.2–2.5 × 10⁻⁹ from 0.001° down, with 5,000 triangles per set, during code review CR-003 and
 * quality review QR-001). At 0.01° about one run in twenty missed by a hair (1.0014 × 10⁻⁹); at
 * 0.02° none of 60,000 triangles per set did, so 0.02° is the floor this test holds. Only exactly
 * degenerate triangles are outside the requirement (TR-008).
 */
const RUNS = 1_000;
const RELATIVE = 1e-9;
const RADIANS = Math.PI / 180;
const MIN_ANGLE = 0.02;

const SIDES = ["sideA", "sideB", "sideC"] as const;
const ANGLES = ["angleA", "angleB", "angleC"] as const;
type Term = (typeof SIDES)[number] | (typeof ANGLES)[number];

interface Generated {
  readonly sides: readonly [number, number, number];
  readonly angles: readonly [number, number, number];
}

const finite = (min: number, max: number) => fc.double({ min, max, noNaN: true, noDefaultInfinity: true });

/** Angles A and B with every angle at least `MIN_ANGLE`, and a scale: the sides follow by the law of sines. */
const triangles = (angleA = finite(MIN_ANGLE, 180 - 2 * MIN_ANGLE)): fc.Arbitrary<Generated> =>
  fc
    .tuple(angleA, finite(0, 1), finite(0.01, 1_000_000))
    .map(([a, share, longest]) => {
      const b = MIN_ANGLE + share * (180 - 2 * MIN_ANGLE - a);
      const angles = [a, b, 180 - a - b] as const;
      // The sine of the angle or its supplement, whichever is smaller: exact near 180° as near 0°.
      const sines = angles.map((angle) => Math.sin(Math.min(angle, 180 - angle) * RADIANS));
      const scale = longest / Math.max(...sines);
      return { angles, sides: [scale * sines[0]!, scale * sines[1]!, scale * sines[2]!] as const };
    });

function solved(input: TriangleInput): TriangleSolution {
  const result = solveTriangle(input);
  if (Array.isArray(result)) throw new Error(`expected a triangle for ${JSON.stringify(input)}, got ${JSON.stringify(result)}`);
  return result;
}

function valuesOf(solution: TriangleSolution): Record<Term, number> {
  const { sides, angles } = solution;
  return { sideA: sides.a, sideB: sides.b, sideC: sides.c, angleA: angles.A, angleB: angles.B, angleC: angles.C };
}

/**
 * Each supplied value recomputed from the other five, which include the derived ones: a side by
 * the law of cosines from the other two sides and its opposite angle, in its half-angle form
 * a² = (b − c)² + 4bc·sin²(A/2), which does not cancel for a small angle as b² + c² − 2bc·cos A does;
 * an angle in whichever of two forms is well conditioned for the triangle. When no angle is
 * obtuse, from the three sides, as atan2(4·area, (q − p)(q + p) + r²) with Kahan's form of Heron's
 * area: 180° minus two angles near 90° would lose a tiny angle's digits. When one angle is obtuse,
 * as what the other two leave of 180°: there the sides fix a tiny angle only through their small
 * differences, so recomputing it from them would lose its digits instead.
 */
function recomputed(values: Record<Term, number>, term: Term): number {
  const index = [...SIDES, ...ANGLES].indexOf(term) % 3;
  const [j, k] = [(index + 1) % 3, (index + 2) % 3];
  const [sj, sk] = [values[SIDES[j]!], values[SIDES[k]!]];
  if (term.startsWith("angle")) {
    if (Math.max(values.angleA, values.angleB, values.angleC) > 90) return 180 - values[ANGLES[j]!] - values[ANGLES[k]!];
    const p = values[SIDES[index]!];
    const [a, b, c] = [p, sj, sk].sort((x, y) => y - x) as [number, number, number];
    const area4 = Math.sqrt(Math.max(0, (a + (b + c)) * (c - (a - b)) * (c + (a - b)) * (a + (b - c))));
    const [near, far] = Math.abs(sj - p) <= Math.abs(sk - p) ? [sj, sk] : [sk, sj];
    return Math.atan2(area4, (near - p) * (near + p) + far * far) / RADIANS;
  }
  const half = Math.sin((values[ANGLES[index]!] / 2) * RADIANS);
  return Math.sqrt((sj - sk) * (sj - sk) + 4 * sj * sk * half * half);
}

const relativeError = (actual: number, expected: number) => Math.abs(actual - expected) / Math.abs(expected);

/** Solve from the supplied terms of a generated triangle, and recompute each supplied value. */
function roundTrips(triangle: Generated, supplied: readonly Term[], set: TriangleSolution["set"]): void {
  const given: Record<Term, number> = {
    sideA: triangle.sides[0],
    sideB: triangle.sides[1],
    sideC: triangle.sides[2],
    angleA: triangle.angles[0],
    angleB: triangle.angles[1],
    angleC: triangle.angles[2],
  };
  const input = Object.fromEntries(supplied.map((term) => [term, given[term]])) as TriangleInput;
  const solution = solved(input);
  expect(solution.set).toBe(set);
  const values = valuesOf(solution);
  for (const term of supplied) {
    const error = relativeError(recomputed(values, term), given[term]);
    if (!(error <= RELATIVE)) throw new Error(`${term} came back with relative error ${error} from ${JSON.stringify(input)}`);
  }
}

describe("triangle round trip (GSS-NFR-002)", () => {
  it("three sides", () => {
    fc.assert(fc.property(triangles(), (triangle) => roundTrips(triangle, ["sideA", "sideB", "sideC"], "SSS")), { numRuns: RUNS });
  });

  it("two sides and the angle between them", () => {
    fc.assert(fc.property(triangles(), (triangle) => roundTrips(triangle, ["sideB", "sideC", "angleA"], "SAS")), { numRuns: RUNS });
  });

  it("two angles and the side between them", () => {
    fc.assert(fc.property(triangles(), (triangle) => roundTrips(triangle, ["angleA", "angleB", "sideC"], "ASA")), { numRuns: RUNS });
  });

  it("two angles and another side", () => {
    fc.assert(fc.property(triangles(), (triangle) => roundTrips(triangle, ["angleA", "angleB", "sideA"], "AAS")), { numRuns: RUNS });
  });

  it("two sides and an angle not between them, with one solution", () => {
    // One solution: the side opposite the given angle is the longer of the two given sides, so the
    // given angle A is the larger of A and B. Here A ≥ B + 1°, which keeps B from approaching 90°.
    const oneSolution = triangles().filter((triangle) => triangle.angles[0] >= triangle.angles[1] + 1);
    fc.assert(fc.property(oneSolution, (triangle) => roundTrips(triangle, ["sideA", "sideB", "angleA"], "SSA")), { numRuns: RUNS });
  });

  it("three vertices", () => {
    const placed = fc.tuple(triangles(), finite(-1_000, 1_000), finite(-1_000, 1_000), finite(0, 2 * Math.PI), fc.boolean());
    fc.assert(
      fc.property(placed, ([triangle, x, y, turn, clockwise]) => {
        const [, b, c] = triangle.sides;
        const turnAtA = (clockwise ? -1 : 1) * triangle.angles[0] * RADIANS;
        const vertices = [
          { x, y },
          { x: x + c * Math.cos(turn), y: y + c * Math.sin(turn) },
          { x: x + b * Math.cos(turn + turnAtA), y: y + b * Math.sin(turn + turnAtA) },
        ];
        const solution = solved({ vertices });
        expect(solution.set).toBe("vertices");
        // The vertices recomputed from A, the direction of AB and the derived sides and angle at A.
        const [p, q, r] = vertices as [(typeof vertices)[0], (typeof vertices)[0], (typeof vertices)[0]];
        const direction = Math.atan2(q.y - p.y, q.x - p.x);
        const sign = (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x) < 0 ? -1 : 1;
        const back = [
          { x: p.x + solution.sides.c * Math.cos(direction), y: p.y + solution.sides.c * Math.sin(direction) },
          {
            x: p.x + solution.sides.b * Math.cos(direction + sign * solution.angles.A * RADIANS),
            y: p.y + solution.sides.b * Math.sin(direction + sign * solution.angles.A * RADIANS),
          },
        ];
        // Relative to the triangle's size: a vertex's own coordinates may be near 0.
        const size = Math.max(solution.sides.a, solution.sides.b, solution.sides.c);
        for (const [rebuilt, original] of [[back[0]!, q], [back[1]!, r]] as const) {
          const error = Math.hypot(rebuilt.x - original.x, rebuilt.y - original.y) / size;
          if (!(error <= RELATIVE)) throw new Error(`a vertex came back with relative error ${error} from ${JSON.stringify(vertices)}`);
        }
        // And the angles add up to 180°.
        expect(relativeError(solution.angles.A + solution.angles.B + solution.angles.C, 180)).toBeLessThanOrEqual(RELATIVE);
      }),
      { numRuns: RUNS },
    );
  });
});
