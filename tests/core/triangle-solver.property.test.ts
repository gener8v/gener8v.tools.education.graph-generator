import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { type TriangleInput, type TriangleSolution, solveTriangle } from "../../src/core/geometry/triangle-solver";

/**
 * GSS-NFR-002: derived sides and angles reproduce the supplied ones within 10⁻⁹ relative error
 * when recomputed, over at least 1,000 generated triangles per determining set.
 *
 * The generated triangles have every angle at least 0.1° (so at most 179.8°) and a longest side from
 * 0.01 to 1,000,000, the definition's whole range of sizes, so a side can be about 570 times
 * another. Only exactly degenerate triangles are outside the requirement (TR-008). Below about
 * 0.01° the recomputation below, not the solver, loses the last digits (measured at 1.0–1.7 × 10⁻⁹
 * during delivery), so 0.1° is the thinnest angle this test holds to 10⁻⁹.
 */
const RUNS = 1_000;
const RELATIVE = 1e-9;
const RADIANS = Math.PI / 180;
const MIN_ANGLE = 0.1;

const SIDES = ["sideA", "sideB", "sideC"] as const;
const ANGLES = ["angleA", "angleB", "angleC"] as const;
type Term = (typeof SIDES)[number] | (typeof ANGLES)[number];

interface Generated {
  readonly sides: readonly [number, number, number];
  readonly angles: readonly [number, number, number];
}

const finite = (min: number, max: number) => fc.double({ min, max, noNaN: true, noDefaultInfinity: true });

/** Angles A and B with every angle at least 5°, and a scale: the sides follow by the law of sines. */
const triangles = (angleA = finite(MIN_ANGLE, 180 - 2 * MIN_ANGLE)): fc.Arbitrary<Generated> =>
  fc
    .tuple(angleA, finite(0, 1), finite(0.01, 1_000_000))
    .map(([a, share, longest]) => {
      const b = MIN_ANGLE + share * (180 - 2 * MIN_ANGLE - a);
      const angles = [a, b, 180 - a - b] as const;
      const sines = angles.map((angle) => Math.sin(angle * RADIANS));
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
 * the law of cosines from the other two sides and its opposite angle, an angle as what the other
 * two leave of 180°.
 */
function recomputed(values: Record<Term, number>, term: Term): number {
  const index = [...SIDES, ...ANGLES].indexOf(term) % 3;
  const [j, k] = [(index + 1) % 3, (index + 2) % 3];
  if (term.startsWith("angle")) return 180 - values[ANGLES[j]!] - values[ANGLES[k]!];
  const [sj, sk] = [values[SIDES[j]!], values[SIDES[k]!]];
  return Math.sqrt(sj * sj + sk * sk - 2 * sj * sk * Math.cos(values[ANGLES[index]!] * RADIANS));
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
