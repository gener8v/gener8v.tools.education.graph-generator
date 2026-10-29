import { cleanText, formatList, formatMeasurement, formatSupplied, quoteText, sourceOf, stateMeasurement } from "../format";
import { TRIANGLE_ANGLES, TRIANGLE_SIDES, TRIANGLE_VERTICES, type TriangleInput, solveTriangle } from "../geometry/triangle-solver";
import { createIssue, pointer } from "../issues";
import type { Issue, Provenance } from "../result";
import { rangeBroken } from "../validate/numbers";
import { unitProperty } from "./figure";
import { CALLER_TEXT_LIMIT } from "./shared";
import { coordinates } from "./xy-graph";
import { type DescriptionBase, type GraphTypeDefinition, type PropertySpec, defineProperties } from "./types";

/** A vertex of a triangle given by its vertices, in mathematical coordinates (y up). */
export interface TriangleVertex {
  readonly x: number;
  readonly y: number;
}

/** A normalized triangle description: all three sides and angles are present once validated. */
export interface Triangle extends DescriptionBase {
  readonly type: "triangle";
  readonly sideA: number;
  readonly sideB: number;
  readonly sideC: number;
  readonly angleA: number;
  readonly angleB: number;
  readonly angleC: number;
  readonly vertices?: readonly TriangleVertex[];
  readonly vertexNames?: readonly string[];
  readonly unit?: string;
  readonly title?: string;
  readonly lineColor?: string;
}

/** The most a side may measure, and the most a vertex coordinate may be from 0. */
export const TRIANGLE_LENGTH_LIMIT = 1_000_000;
/** The shortest side. */
export const TRIANGLE_SIDE_MIN = 0.001;

const VERTEX_NAMES = TRIANGLE_VERTICES;
const SIDE_TERMS = TRIANGLE_SIDES;
const ANGLE_TERMS = TRIANGLE_ANGLES;

const side = (term: (typeof SIDE_TERMS)[number], name: string, from: string, to: string): PropertySpec => ({
  term,
  kind: "number",
  required: false,
  min: TRIANGLE_SIDE_MIN,
  max: TRIANGLE_LENGTH_LIMIT,
  description: `The length of side ${name}, opposite vertex ${name.toUpperCase()} (the side from ${from} to ${to}), from 0.001 to 1,000,000.`,
});

const angle = (term: (typeof ANGLE_TERMS)[number], name: string): PropertySpec => ({
  term,
  kind: "number",
  required: false,
  min: 0,
  exclusiveMin: true,
  max: 180,
  exclusiveMax: true,
  description: `The angle at vertex ${name}, in degrees, greater than 0 and less than 180. Derived sides and angles are exact to about nine significant digits while every angle is at least 0.02°; a thinner triangle is accepted with fewer.`,
});

/** The range of a vertex coordinate. The shared `x` and `y` terms have no bounds of their own. */
const COORDINATE_RANGE = { min: -TRIANGLE_LENGTH_LIMIT, max: TRIANGLE_LENGTH_LIMIT } as const;

/**
 * Each vertex coordinate beyond ±1,000,000, as `out_of_range` at its own path, checked before the
 * solver reads any, so its work stays finite and fixed (graph-library GSS TICKET-004 DEL-004).
 */
// @spec GSS-REQ-013
function coordinateIssues(vertices: readonly TriangleVertex[]): Issue[] {
  const issues: Issue[] = [];
  vertices.forEach((vertex, index) => {
    for (const axis of ["x", "y"] as const) {
      const value = vertex[axis];
      if (rangeBroken(value, COORDINATE_RANGE) !== undefined) {
        issues.push(createIssue("out_of_range", pointer("vertices", index, axis), { term: `vertices[${index}].${axis}`, got: value, range: COORDINATE_RANGE }));
      }
    }
  });
  return issues;
}

/**
 * The triangle (GSS-REQ-010..019): given by three sides; two sides and the angle between them; two
 * angles and a side; or its three vertices. Its solver derives the other sides and angles, checks
 * every value beyond the determining set within 1%, and reports an impossible, ambiguous or
 * undetermined triangle. Built by a function free of side effects, so a bundle that never reads
 * the triangle drops it. Not registered until it can be drawn (graph-library GSS TICKET-005, DEL-002).
 */
// @spec GSS-REQ-010, GSS-REQ-011, GSS-REQ-012, GSS-REQ-013, GSS-REQ-014, GSS-REQ-015, GSS-REQ-016, GSS-REQ-017, GSS-REQ-018, GSS-REQ-019, GSV-REQ-052, GSV-REQ-053
export const triangle: GraphTypeDefinition<Triangle> = /* @__PURE__ */ defineTriangle();

/**
 * Builds the triangle definition. A function marked free of side effects, so a bundle that never
 * reads the definition drops it.
 */
// @spec GSS-REQ-010, GSS-REQ-011, GSS-REQ-012, GSS-REQ-013, GSS-REQ-014
/* @__NO_SIDE_EFFECTS__ */
function defineTriangle(): GraphTypeDefinition<Triangle> {
  return {
    type: "triangle",
    title: "Triangle",
    description:
      "A triangle drawn to scale. Side a is opposite vertex A, side b opposite B and side c opposite C; angles are in degrees. Give one determining set: the three vertices; three sides; two sides and the angle between them; two angles and a side; or two sides and an angle not between them, when only one triangle fits. The vertices are used when given; otherwise the first complete set in that order. The other sides and angles are derived, and any other value given must agree within 1%.",
    properties: defineProperties({
      sideA: side("sideA", "a", "B", "C"),
      sideB: side("sideB", "b", "C", "A"),
      sideC: side("sideC", "c", "A", "B"),
      angleA: angle("angleA", "A"),
      angleB: angle("angleB", "B"),
      angleC: angle("angleC", "C"),
      vertices: {
        term: "vertices",
        kind: "array",
        required: false,
        maxItems: 3,
        description:
          "The three vertices A, B and C, in that order, each an x and a y coordinate from -1,000,000 to 1,000,000; at most 3. When given, they determine the triangle, and the sides and angles are derived from them; a list of fewer than three is an error even when the sides or angles alone would determine the triangle. They must not lie on one line or share a point.",
        items: {
          kind: "object",
          description: "One vertex: its x and y coordinates.",
          properties: coordinates,
        },
      },
      vertexNames: {
        term: "vertexNames",
        kind: "array",
        required: false,
        maxItems: 3,
        description: `The names shown at the vertices A, B and C, in that order, such as "P", "Q" and "R"; at most 3 names, each at most ${CALLER_TEXT_LIMIT} characters.`,
        items: { kind: "string", maxLength: CALLER_TEXT_LIMIT, description: "The name of one vertex, as plain text." },
      },
      unit: unitProperty,
    }),
    derivations: [],
    checks: [],
    solve: {
      inputs: [...SIDE_TERMS, ...ANGLE_TERMS, "vertices"],
      scaled: SIDE_TERMS,
      solve: (values) => {
        const input = values as TriangleInput;
        const outside = input.vertices === undefined ? [] : coordinateIssues(input.vertices);
        if (outside.length > 0) return { issues: outside };
        const solved = solveTriangle(input);
        if (Array.isArray(solved)) return { issues: solved };
        const { sides, angles } = solved;
        return {
          derived: { sideA: sides.a, sideB: sides.b, sideC: sides.c, angleA: angles.A, angleB: angles.B, angleC: angles.C },
          scale: solved.scale,
        };
      },
    },
    /**
     * "A triangle titled “Roof” with sides a 3 cm, b 4 cm and c 5 cm, and angles A 36.87°, B 53.13°
     * and C 90°. Its vertices are named “P”, “Q” and “R”." Supplied values are stated as written,
     * derived ones rounded; names are quoted.
     */
    // @spec GSS-REQ-014, GSS-REQ-033, GSS-REQ-034
    describe: (triangle: Triangle, provenance: Provenance) => {
      const title = triangle.title === undefined ? "" : cleanText(triangle.title);
      const titled = title === "" ? "" : ` titled ${quoteText(title)}`;
      const sides = SIDE_TERMS.map((term, i) => `${VERTEX_NAMES[i]!.toLowerCase()} ${stateMeasurement(triangle[term], sourceOf(provenance, term), triangle.unit)}`);
      const angles = ANGLE_TERMS.map((term, i) => `${VERTEX_NAMES[i]} ${formatMeasurement(triangle[term], sourceOf(provenance, term))}°`);
      const sentences = [`A triangle${titled} with sides ${formatList(sides)}, and angles ${formatList(angles)}.`];

      if (triangle.vertices !== undefined) {
        const points = triangle.vertices.map((vertex) => `(${formatSupplied(vertex.x)}, ${formatSupplied(vertex.y)})`);
        sentences.push(`Its vertices are at ${formatList(points)}.`);
      }
      const named = (triangle.vertexNames ?? [])
        .slice(0, VERTEX_NAMES.length)
        .map((name, i) => ({ vertex: VERTEX_NAMES[i]!, name }))
        .filter(({ name }) => cleanText(name) !== "");
      if (named.length === VERTEX_NAMES.length) {
        sentences.push(`Its vertices are named ${formatList(named.map(({ name }) => quoteText(name)))}.`);
      } else if (named.length > 0) {
        const [first, ...rest] = named.map(({ vertex, name }) => `vertex ${vertex} ${quoteText(name)}`);
        const opening = first!.replace(/^vertex (\w) /, "Vertex $1 is named ");
        sentences.push(`${formatList([opening, ...rest])}.`);
      }
      return sentences.join(" ");
    },
  };
}
