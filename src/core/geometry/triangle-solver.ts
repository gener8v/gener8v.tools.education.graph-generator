import { formatDerived } from "../format";
import { createIssue, pointer } from "../issues";
import type { Issue } from "../result";
import { withinTolerance } from "../tolerance";

/** A vertex, in the description's own coordinates (mathematical y-up). */
export interface TrianglePoint {
  readonly x: number;
  readonly y: number;
}

/**
 * What a triangle's description supplies: side a opposite vertex A (the side BC), b opposite B,
 * c opposite C; angles in degrees at A, B and C; or the vertices A, B and C, in that order.
 */
export interface TriangleInput {
  readonly sideA?: number;
  readonly sideB?: number;
  readonly sideC?: number;
  readonly angleA?: number;
  readonly angleB?: number;
  readonly angleC?: number;
  readonly vertices?: readonly TrianglePoint[];
}

export type TriangleSideTerm = "sideA" | "sideB" | "sideC";
export type TriangleAngleTerm = "angleA" | "angleB" | "angleC";
export type TriangleTerm = TriangleSideTerm | TriangleAngleTerm | "vertices";

/**
 * The determining sets, in the order the first complete one is taken: three vertices, three sides,
 * two sides and the angle between them, two angles and the side between them (ASA) or another
 * side (AAS), two sides and an angle that is not between them (SSA).
 */
export type TriangleSet = "vertices" | "SSS" | "SAS" | "ASA" | "AAS" | "SSA";

/** A solved triangle: every side and angle (degrees), and what determined it. */
export interface TriangleSolution {
  readonly sides: { readonly a: number; readonly b: number; readonly c: number };
  readonly angles: { readonly A: number; readonly B: number; readonly C: number };
  readonly set: TriangleSet;
  /** The supplied terms that make up the determining set; every other supplied value was checked against them. */
  readonly defining: readonly TriangleTerm[];
  /** The supplied term that sets the triangle's size: the set's first side, or the vertices. */
  readonly scale: TriangleSideTerm | "vertices";
}

/**
 * The triangle's terms and vertex letters, in the order A, B, C: the one list the definition and
 * the solver both read (GSS TICKET-004 quality review QR-005).
 */
export const TRIANGLE_SIDES = ["sideA", "sideB", "sideC"] as const satisfies readonly TriangleSideTerm[];
export const TRIANGLE_ANGLES = ["angleA", "angleB", "angleC"] as const satisfies readonly TriangleAngleTerm[];
export const TRIANGLE_VERTICES = ["A", "B", "C"] as const;
const SIDES = TRIANGLE_SIDES;
const ANGLES = TRIANGLE_ANGLES;
const VERTEX_NAMES = TRIANGLE_VERTICES;
type Index = 0 | 1 | 2;
const INDICES: readonly Index[] = [0, 1, 2];

/**
 * How close, relative to the values, counts as "equal" when deciding whether a triangle is
 * degenerate: sides 0.1, 0.2 and 0.3 add up to 0.30000000000000004 in binary, but are no triangle.
 * Inside this margin a triangle is flatter than any drawing could show (TR-008).
 */
const DEGENERATE = 1e-12;

/**
 * The smallest angle a triangle may have, in degrees (Product Owner decision, Thomas Eaves,
 * 2026-10-29; GSS TICKET-004 security review SEC-001). Below about 0.01° the sides, as doubles,
 * no longer fix the angles within the 1% tolerance, so a normalized description could fail
 * `validate` again; 0.02° is also the floor GSS-NFR-002 is verified at. A supplied angle below it
 * is out of range; a derived one makes the triangle too thin to draw.
 */
export const TRIANGLE_MIN_ANGLE = 0.02;

/** 180° less two angles, as (90 − p) + (90 − q): exact when both are at least 45° (Sterbenz), where 180 − p − q loses digits against a third angle near 180° (SEC-001). */
const remainingAngle = (p: number, q: number) => (90 - p) + (90 - q);

const RADIANS = Math.PI / 180;
const DEGREES = 180 / Math.PI;

/** The sine of an angle in degrees, accurate near 180° as well as near 0°. */
const sinDeg = (degrees: number) => Math.sin(Math.min(degrees, 180 - degrees) * RADIANS);
const cosDeg = (degrees: number) => Math.cos(degrees * RADIANS);

/**
 * Four times a triangle's area from its sides, by Kahan's form of Heron's formula, which stays
 * accurate for a needle-thin triangle where the plain form cancels to 0 (TR-008). The sides must
 * satisfy the triangle inequality; a product rounded below 0 counts as 0.
 */
function fourTimesArea(sides: readonly number[]): number {
  const [a, b, c] = [...sides].sort((x, y) => y - x) as [number, number, number];
  const product = (a + (b + c)) * (c - (a - b)) * (c + (a - b)) * (a + (b - c));
  return product > 0 ? Math.sqrt(product) : 0;
}

/**
 * The angle opposite `opposite`, from the law of cosines and the area: tan = 4·area / (q² + r² − p²).
 * `atan2` keeps a tiny angle accurate where `acos` of a cosine rounded to 1 gives 0°, and never
 * sees an argument outside its domain, so no clamp is needed (TR-008, which asked for `acos`
 * clamped to [−1, 1]: a clamped `acos` turned a valid needle-thin triangle into "too flat").
 */
function cosineAngle(opposite: number, first: number, second: number, area4: number): number {
  // q² + r² − p² as (q − p)(q + p) + r², q the side nearer p, so two nearly equal squares never
  // cancel (q − p is exact when they are close).
  const [near, far] = Math.abs(first - opposite) <= Math.abs(second - opposite) ? [first, second] : [second, first];
  return Math.atan2(area4, (near - opposite) * (near + opposite) + far * far) * DEGREES;
}

const third = (i: Index, j: Index): Index => (3 - i - j) as Index;

/** The term an issue about the whole triangle names. */
const TRIANGLE = "triangle";

function solution(sides: readonly number[], angles: readonly number[], set: TriangleSet, defining: readonly TriangleTerm[], scale: TriangleSolution["scale"]): TriangleSolution {
  return {
    sides: { a: sides[0]!, b: sides[1]!, c: sides[2]! },
    angles: { A: angles[0]!, B: angles[1]!, C: angles[2]! },
    set,
    defining,
    scale,
  };
}

/** Every value the solution holds, by term. */
function valuesOf(solved: TriangleSolution): Record<TriangleSideTerm | TriangleAngleTerm, number> {
  const { sides, angles } = solved;
  return { sideA: sides.a, sideB: sides.b, sideC: sides.c, angleA: angles.A, angleB: angles.B, angleC: angles.C };
}

/**
 * Whether a solved triangle can be drawn, by the one rule every determining set shares (security
 * review SEC-001): every side a positive finite length, the longest shorter than the other two
 * together by more than the `DEGENERATE` margin (as three sides are checked), and every angle at
 * least `TRIANGLE_MIN_ANGLE` and below 180°.
 */
function drawable(solved: TriangleSolution): boolean {
  const { sides, angles } = solved;
  const lengths = [sides.a, sides.b, sides.c];
  if (!lengths.every((side) => Number.isFinite(side) && side > 0)) return false;
  const longest = Math.max(sides.a, sides.b, sides.c);
  if (sides.a + sides.b + sides.c - 2 * longest <= DEGENERATE * longest) return false;
  return [angles.A, angles.B, angles.C].every((angle) => angle >= TRIANGLE_MIN_ANGLE && angle < 180);
}

const terms = (list: readonly TriangleTerm[]) => list as unknown as readonly [string, ...string[]];
const pointers = (list: readonly TriangleTerm[]) => list.map((term) => pointer(term)) as unknown as readonly [string, ...string[]];

/**
 * Every supplied value beyond the determining set is a statement to check (GSV-REQ-038): within
 * 1% of the derived value, or a contradiction naming the determining terms. A triangle that came
 * out flatter than can be drawn is no triangle.
 */
// @spec GSS-REQ-014, GSV-REQ-038
function checked(input: TriangleInput, solved: TriangleSolution): TriangleSolution | Issue[] {
  if (!drawable(solved)) {
    return [createIssue("not_a_triangle", pointer(), { term: TRIANGLE, detail: `the values give a triangle too flat or too thin to draw, with an angle under ${TRIANGLE_MIN_ANGLE}°` })];
  }
  const derived = valuesOf(solved);
  const issues: Issue[] = [];
  for (const term of [...SIDES, ...ANGLES]) {
    const given = input[term];
    if (given === undefined || solved.defining.includes(term)) continue;
    if (!withinTolerance(given, derived[term])) {
      issues.push(
        createIssue("contradiction", pointer(term), {
          term,
          got: given,
          conflicts: pointers(solved.defining),
          conflictTerms: terms(solved.defining),
          agreeingValue: derived[term],
        }),
      );
    }
  }
  return issues.length > 0 ? issues : solved;
}

/**
 * Three vertices define everything: each side is the distance between two of them, and each
 * angle is measured between the two sides at its vertex. Coincident or collinear vertices are not
 * a triangle (GSS-REQ-019); so are vertices so nearly in line that the triangle could not be drawn.
 */
// @spec GSS-REQ-013, GSS-REQ-014, GSS-REQ-019
function fromVertices(input: TriangleInput, vertices: readonly TrianglePoint[]): TriangleSolution | Issue[] {
  if (vertices.length !== 3) {
    return [createIssue("insufficient", pointer("vertices"), { term: "vertices", detail: `three vertices are needed, A, B and C in that order; got ${vertices.length}` })];
  }
  const [p, q, r] = vertices as readonly [TrianglePoint, TrianglePoint, TrianglePoint];
  for (const [i, j] of [[0, 1], [1, 2], [0, 2]] as const) {
    if (vertices[i]!.x === vertices[j]!.x && vertices[i]!.y === vertices[j]!.y) {
      return [createIssue("not_a_triangle", pointer("vertices"), { term: "vertices", detail: `vertices ${VERTEX_NAMES[i]} and ${VERTEX_NAMES[j]} are at the same point` })];
    }
  }
  // The angle at a vertex, between the vectors to the other two, from their cross and dot products.
  const angleAt = (at: TrianglePoint, to: TrianglePoint, from: TrianglePoint) => {
    const ux = to.x - at.x;
    const uy = to.y - at.y;
    const vx = from.x - at.x;
    const vy = from.y - at.y;
    return { cross: Math.abs(ux * vy - uy * vx), dot: ux * vx + uy * vy, lengths: Math.hypot(ux, uy) * Math.hypot(vx, vy) };
  };
  const corners = [angleAt(p, q, r), angleAt(q, r, p), angleAt(r, p, q)];
  if (corners.some((corner) => corner.cross <= DEGENERATE * corner.lengths)) {
    return [createIssue("not_a_triangle", pointer("vertices"), { term: "vertices", detail: "the three vertices lie on one line" })];
  }
  const sides = [Math.hypot(r.x - q.x, r.y - q.y), Math.hypot(p.x - r.x, p.y - r.y), Math.hypot(q.x - p.x, q.y - p.y)];
  const angles = corners.map((corner) => Math.atan2(corner.cross, corner.dot) * DEGREES);
  return checked(input, solution(sides, angles, "vertices", ["vertices"], "vertices"));
}

/** Three sides (GSS-REQ-010): the angles by the law of cosines, once the triangle inequality holds (GSS-REQ-015). */
// @spec GSS-REQ-010, GSS-REQ-014, GSS-REQ-015
function fromThreeSides(input: TriangleInput, sides: readonly number[]): TriangleSolution | Issue[] {
  // The longest side must be shorter than the other two together: equal is a flat line (3, 4, 7).
  const longest = INDICES.reduce((best, i) => (sides[i]! > sides[best]! ? i : best), 0 as Index);
  const others = INDICES.filter((i) => i !== longest);
  const [first, second] = [sides[others[0]!]!, sides[others[1]!]!];
  if (first + second - sides[longest]! <= DEGENERATE * sides[longest]!) {
    const conflicting = others.map((i) => SIDES[i]) as TriangleTerm[];
    return [
      createIssue("contradiction", pointer(SIDES[longest]), {
        term: SIDES[longest],
        got: sides[longest],
        conflicts: pointers(conflicting),
        conflictTerms: terms(conflicting),
      }),
    ];
  }
  const area4 = fourTimesArea(sides);
  const angles = INDICES.map((i) => cosineAngle(sides[i]!, sides[(i + 1) % 3]!, sides[(i + 2) % 3]!, area4));
  return checked(input, solution(sides, angles, "SSS", SIDES, "sideA"));
}

/**
 * Two sides and the angle between them (GSS-REQ-011): the third side by the law of cosines, in
 * its half-angle form, which does not cancel for a small angle, and the other two angles from the
 * triangle's coordinates.
 */
// @spec GSS-REQ-011, GSS-REQ-014
function fromTwoSidesAndIncluded(input: TriangleInput, given: readonly number[], i: Index, j: Index): TriangleSolution | Issue[] {
  const k = third(i, j);
  const [si, sj, angle] = [given[i]!, given[j]!, input[ANGLES[k]]!];
  const half = sinDeg(angle / 2);
  const sk = Math.sqrt((si - sj) * (si - sj) + 4 * si * sj * half * half);
  // With the vertex of the given angle at the origin and side i along the x axis.
  const angleI = Math.atan2(si * sinDeg(angle), sj - si * cosDeg(angle)) * DEGREES;
  const angleJ = Math.atan2(sj * sinDeg(angle), si - sj * cosDeg(angle)) * DEGREES;
  const sides: number[] = [];
  const angles: number[] = [];
  [sides[i], sides[j], sides[k]] = [si, sj, sk];
  [angles[i], angles[j], angles[k]] = [angleI, angleJ, angle];
  return checked(input, solution(sides, angles, "SAS", [SIDES[i], SIDES[j], ANGLES[k]], SIDES[i]));
}

/**
 * Two angles and one side (GSS-REQ-012): the third angle makes 180°, and the other sides follow by
 * the law of sines. The side between the two angles makes ASA; any other side, AAS.
 */
// @spec GSS-REQ-012, GSS-REQ-014
function fromTwoAnglesAndSide(input: TriangleInput, p: Index, q: Index, m: Index): TriangleSolution | Issue[] {
  const r = third(p, q);
  const angles: number[] = [];
  angles[p] = input[ANGLES[p]]!;
  angles[q] = input[ANGLES[q]]!;
  angles[r] = remainingAngle(angles[p]!, angles[q]!);
  const side = input[SIDES[m]]!;
  const ratio = side / sinDeg(angles[m]!);
  const sides = INDICES.map((i) => (i === m ? side : ratio * sinDeg(angles[i]!)));
  const set = m === r ? "ASA" : "AAS";
  return checked(input, solution(sides, angles, set, [ANGLES[p], ANGLES[q], SIDES[m]], SIDES[m]));
}

/**
 * Two sides and an angle that is not between them (SSA): angle α at vertex `g`, the side `a`
 * opposite it, and another side `b`. With h = b·sin α, the third side is b·cos α ± √(a² − h²):
 * one triangle when a ≥ b, or α is right or obtuse with a > b, or a = h (a right angle opposite b);
 * two when h < a < b with α acute, reported as ambiguous with both third sides (GSS-REQ-018, GSS
 * OQ-004 open: no choice of one); none otherwise, a contradiction.
 */
// @spec GSS-REQ-014, GSS-REQ-018
function fromTwoSidesAndOther(input: TriangleInput, given: readonly number[], g: Index, o: Index): TriangleSolution | Issue[] {
  const t = third(g, o);
  const alpha = input[ANGLES[g]]!;
  const [a, b] = [given[g]!, given[o]!];
  const h = b * sinDeg(alpha);
  const [first, second] = g < o ? [g, o] : [o, g];
  const defining: TriangleTerm[] = [SIDES[first], SIDES[second], ANGLES[g]];
  const none = () => {
    const conflicting = [SIDES[o], ANGLES[g]] as TriangleTerm[];
    return [createIssue("contradiction", pointer(SIDES[g]), { term: SIDES[g], got: a, conflicts: pointers(conflicting), conflictTerms: terms(conflicting) })];
  };

  const fit = ssaFit(alpha, a, b, h);
  if (fit === "none") return none();
  // √(a² − h²), the distance either solution's third vertex lies from the foot of the height; 0
  // when the side just reaches it.
  const reach = fit === "right" ? 0 : Math.sqrt((a - h) * (a + h));

  const along = b * cosDeg(alpha);
  const near = along + reach;
  if (fit === "two") {
    const far = along - reach;
    const detail = `${SIDES[g]}, ${SIDES[o]} and ${ANGLES[g]} fit two triangles, one with ${SIDES[t]} ${formatDerived(near)} and one with ${SIDES[t]} ${formatDerived(far)}`;
    return [createIssue("ambiguous", pointer(), { term: TRIANGLE, detail })];
  }
  // The angle opposite b is acute in the one solution (b < a, or the right angle when a = h).
  const beta = Math.atan2(h, reach) * DEGREES;
  const sides: number[] = [];
  const angles: number[] = [];
  [sides[g], sides[o], sides[t]] = [a, b, near];
  [angles[g], angles[o], angles[t]] = [alpha, beta, remainingAngle(alpha, beta)];
  return checked(input, solution(sides, angles, "SSA", defining, SIDES[first]));
}

/**
 * How many triangles fit two sides and an angle not between them (quality review QR-003): side `a`
 * opposite the given angle `alpha`, side `b` beside it, and `h = b·sin alpha`, the height from the
 * far end of `b`. With alpha right or obtuse, one when a > b, else none; with alpha acute, one when
 * a ≥ b, none when a < h, one right triangle when a = h, and two when h < a < b. "Equal" is within
 * the `DEGENERATE` margin. The one place GSS OQ-004 (choosing one of two) would change.
 */
function ssaFit(alpha: number, a: number, b: number, h: number): "none" | "one" | "right" | "two" {
  if (alpha >= 90) return a - b <= DEGENERATE * a ? "none" : "one";
  if (a - b >= -DEGENERATE * a) return "one";
  if (a - h < -DEGENERATE * a) return "none";
  if (a - h <= DEGENERATE * a) return "right";
  return "two";
}

/**
 * Supplied angles must leave room for a triangle: any two less than 180° together, and all three
 * adding up to 180° within the GSV 1% tolerance (GSS-REQ-016).
 */
// @spec GSS-REQ-016
function angleProblems(input: TriangleInput, given: readonly Index[]): Issue[] {
  const value = (i: Index) => input[ANGLES[i]]!;
  if (given.length === 3) {
    const sum = value(0) + value(1) + value(2);
    if (!withinTolerance(sum, 180)) {
      const rest = remainingAngle(value(0), value(1));
      return [
        createIssue("contradiction", pointer("angleC"), {
          term: "angleC",
          got: value(2),
          conflicts: [pointer("angleA"), pointer("angleB")],
          conflictTerms: ["angleA", "angleB"],
          ...(rest > 0 ? { agreeingValue: rest } : {}),
        }),
      ];
    }
  }
  if (given.length >= 2 && value(given[0]!) + value(given[1]!) >= 180) {
    const [first, second] = [ANGLES[given[0]!], ANGLES[given[1]!]];
    return [createIssue("contradiction", pointer(second), { term: second, got: value(given[1]!), conflicts: [pointer(first)], conflictTerms: [first] })];
  }
  return [];
}

/**
 * Solve a triangle from whichever determining set its description supplies (GSS-REQ-014): the
 * vertices when given; otherwise the first complete set in the order three sides, two sides and
 * the angle between them, two angles and a side, two sides and another angle. Every other value
 * supplied is checked against the solution within 1%. Angles are in degrees (GSS OQ-006). Pure,
 * and a fixed amount of work whatever the values. Returns the issues instead when the values give
 * no triangle, more than one, or too little to fix one.
 */
// @spec GSS-REQ-014, GSS-REQ-016, GSS-REQ-017, GSV-REQ-038
export function solveTriangle(input: TriangleInput): TriangleSolution | Issue[] {
  if (input.vertices !== undefined) return fromVertices(input, input.vertices);

  const sides = SIDES.map((term) => input[term]);
  const givenSides = INDICES.filter((i) => sides[i] !== undefined);
  const givenAngles = INDICES.filter((i) => input[ANGLES[i]] !== undefined);
  const sideValues = sides as number[];

  const problems = angleProblems(input, givenAngles);
  if (problems.length > 0) return problems;

  if (givenSides.length === 3) return fromThreeSides(input, sideValues);
  if (givenSides.length === 2) {
    const [i, j] = givenSides as [Index, Index];
    if (givenAngles.includes(third(i, j))) return fromTwoSidesAndIncluded(input, sideValues, i, j);
  }
  if (givenAngles.length >= 2 && givenSides.length >= 1) return fromTwoAnglesAndSide(input, givenAngles[0]!, givenAngles[1]!, givenSides[0]!);
  if (givenSides.length === 2 && givenAngles.length === 1) {
    const g = givenAngles[0]!;
    return fromTwoSidesAndOther(input, sideValues, g, givenSides.find((i) => i !== g)!);
  }
  const detail =
    givenAngles.length === 3
      ? "three angles fix its shape but not its size, so one side length is needed too"
      : "it needs three sides, two sides and the angle between them, two angles and a side, or three vertices";
  return [createIssue("insufficient", pointer(), { term: TRIANGLE, detail })];
}
