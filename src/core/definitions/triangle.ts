import { cleanText, formatList, formatMeasurement, formatSupplied, quoteText, sourceOf, stateMeasurement } from "../format";
import {
  TRIANGLE_ANGLES,
  TRIANGLE_MIN_ANGLE,
  TRIANGLE_SIDES,
  TRIANGLE_VERTICES,
  type TriangleAngleTerm,
  type TriangleInput,
  type TriangleSideTerm,
  solveTriangle,
} from "../geometry/triangle-solver";
import { createIssue, pointer } from "../issues";
import type { Issue, Provenance } from "../result";
import { withinTolerance } from "../tolerance";
import { rangeBroken } from "../validate/numbers";
import { agrees, labelSidesProperty, unitProperty } from "./figure";
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
  readonly labelSides?: "one" | "all";
  readonly labelAngles?: boolean;
  readonly sideALabelText?: string;
  readonly sideBLabelText?: string;
  readonly sideCLabelText?: string;
  readonly angleALabelText?: string;
  readonly angleBLabelText?: string;
  readonly angleCLabelText?: string;
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
  min: TRIANGLE_MIN_ANGLE,
  max: 180,
  exclusiveMax: true,
  description: `The angle at vertex ${name}, in degrees, at least ${TRIANGLE_MIN_ANGLE} and less than 180. A triangle whose derived angles include one under ${TRIANGLE_MIN_ANGLE}° is too thin to draw.`,
});

/** Each side's and angle's custom label text term. */
export const TRIANGLE_LABEL_TEXT = {
  sideA: "sideALabelText",
  sideB: "sideBLabelText",
  sideC: "sideCLabelText",
  angleA: "angleALabelText",
  angleB: "angleBLabelText",
  angleC: "angleCLabelText",
} as const satisfies Record<TriangleSideTerm | TriangleAngleTerm, string>;

/** Whether one side or angle is labeled, and with what custom text. */
export interface TriangleLabel {
  readonly labeled: boolean;
  /** Custom text in place of the value (GSS-REQ-035); `""` or blank after cleaning is a blank label. */
  readonly customText: string | undefined;
}

/** A shown angle's label, and whether it is marked as a right angle instead of with an arc (GSS-REQ-021). */
export interface TriangleAngleLabel extends TriangleLabel {
  readonly rightAngle: boolean;
}

/** What a valid triangle shows: the one rule `describe` and the layout share. */
export interface TriangleDisplay {
  /**
   * The first-named side: the first side in the order a, b, c whose length was supplied, side a
   * when none was. A triangle given by sides and angles stands on it (GSS-REQ-022); for one given
   * by its vertices it is always side a. `labelSides: "one"` labels it.
   */
  readonly base: TriangleSideTerm;
  readonly sides: Readonly<Record<TriangleSideTerm, TriangleLabel>>;
  readonly angles: Readonly<Record<TriangleAngleTerm, TriangleAngleLabel>>;
  /** The name at each vertex A, B and C, cleaned; `""` for none. */
  readonly names: readonly [string, string, string];
}

/** Whether an angle is drawn with a right-angle mark: within the GSV tolerance (1%) of 90° (GSS-REQ-021). */
// @spec GSS-REQ-021
export const isRightAngle = (degrees: number): boolean => withinTolerance(degrees, 90);

/**
 * What a valid triangle shows (GSS-REQ-020, GSS-REQ-021, GSS-REQ-035), the one rule `describe` and
 * the layout share. `labelSides` labels one side (the first-named, `base`) or all three, and a
 * side's custom text alone labels that side, as the square's does: nothing can contradict it.
 * `labelAngles` labels all three angles, and an angle's custom text alone labels that angle, as
 * the circle's does: an explicit `labelAngles: false` against it is a contradiction, so it never
 * reaches here. A shown angle within 1% of 90° gets a right-angle mark instead of an arc.
 */
// @spec GSS-REQ-020, GSS-REQ-021, GSS-REQ-022, GSS-REQ-035
export function triangleDisplay(triangle: Triangle, provenance: Provenance): TriangleDisplay {
  const base = triangle.vertices === undefined ? (SIDE_TERMS.find((term) => sourceOf(provenance, term) === "supplied") ?? "sideA") : "sideA";
  const side = (term: TriangleSideTerm): TriangleLabel => {
    const customText = triangle[TRIANGLE_LABEL_TEXT[term]];
    const labeled = triangle.labelSides === "all" || (triangle.labelSides === "one" && term === base) || customText !== undefined;
    return { labeled, customText };
  };
  const angle = (term: TriangleAngleTerm): TriangleAngleLabel => {
    const customText = triangle[TRIANGLE_LABEL_TEXT[term]];
    const labeled = triangle.labelAngles === true || customText !== undefined;
    return { labeled, customText, rightAngle: labeled && isRightAngle(triangle[term]) };
  };
  const names = triangle.vertexNames ?? [];
  const name = (i: number) => (names[i] === undefined ? "" : cleanText(names[i]));
  return {
    base,
    sides: { sideA: side("sideA"), sideB: side("sideB"), sideC: side("sideC") },
    angles: { angleA: angle("angleA"), angleB: angle("angleB"), angleC: angle("angleC") },
    names: [name(0), name(1), name(2)],
  };
}

const labelText = (term: string, labeled: string, switchNote: string) =>
  ({
    term,
    kind: "string",
    required: false,
    maxLength: CALLER_TEXT_LIMIT,
    description: `Text shown in place of the ${labeled} label, at most ${CALLER_TEXT_LIMIT} characters, such as "x" or "?"; given alone it labels ${labeled}${switchNote}. It replaces the whole label, ${labeled.startsWith("side") ? "unit" : "degree sign"} included, so add it to the text if it should show. An empty text is a blank label, for example a space to fill in. Text with no clear place beside the figure is placed below it, and text longer than four lines is cut short with “…”. The text alternative still states the value.`,
  }) as const satisfies PropertySpec;

/**
 * The sentences for one kind of label, in place: the value labels in one sentence ("All three sides
 * are labeled with their lengths.", "Side a is labeled with its length."), then each custom text,
 * quoted, or left blank.
 */
// @spec GSS-REQ-020, GSS-REQ-035, GSS-REQ-036
function labelSentences(
  sentences: string[],
  labels: ReadonlyArray<{ readonly name: string; readonly label: TriangleLabel }>,
  kind: "side" | "angle",
  plural: string,
  singular: string,
): void {
  const valued = labels.filter(({ label }) => label.labeled && label.customText === undefined).map(({ name }) => name);
  const Kind = kind === "side" ? "Side" : "Angle";
  if (valued.length === 3) sentences.push(`All three ${kind}s are labeled with their ${plural}.`);
  else if (valued.length === 2) sentences.push(`${Kind}s ${formatList(valued)} are labeled with their ${plural}.`);
  else if (valued.length === 1) sentences.push(`${Kind} ${valued[0]} is labeled with ${singular}.`);
  for (const { name, label } of labels) {
    if (label.customText === undefined) continue;
    sentences.push(cleanText(label.customText) === "" ? `The ${kind} ${name} label is left blank.` : `${Kind} ${name} is labeled ${quoteText(label.customText)}.`);
  }
}

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
 * the triangle drops it. Its sides, angles and vertices can be labeled (GSS-REQ-020), with the
 * value or custom text, and a shown right angle is marked (GSS-REQ-021).
 */
// @spec GSS-REQ-010, GSS-REQ-011, GSS-REQ-012, GSS-REQ-013, GSS-REQ-014, GSS-REQ-015, GSS-REQ-016, GSS-REQ-017, GSS-REQ-018, GSS-REQ-019, GSS-REQ-020, GSS-REQ-021, GSS-REQ-035, GSV-REQ-052, GSV-REQ-053
export const triangle: GraphTypeDefinition<Triangle> = /* @__PURE__ */ defineTriangle();

/**
 * Builds the triangle definition. A function marked free of side effects, so a bundle that never
 * reads the definition drops it.
 */
// @spec GSS-REQ-010, GSS-REQ-011, GSS-REQ-012, GSS-REQ-013, GSS-REQ-014, GSS-REQ-020
/* @__NO_SIDE_EFFECTS__ */
function defineTriangle(): GraphTypeDefinition<Triangle> {
  return {
    type: "triangle",
    title: "Triangle",
    description:
      "A triangle drawn to scale. Side a is opposite vertex A, side b opposite B and side c opposite C; angles are in degrees. Give one determining set: the three vertices; three sides; two sides and the angle between them; two angles and a side; or two sides and an angle not between them, when only one triangle fits. The vertices are used when given; otherwise the first complete set in that order. The other sides and angles are derived, and any other value given must agree within 1%. A triangle given by sides and angles stands on the first side given, in the order a, b, c, drawn horizontal at the bottom with the third vertex above it; one given by its vertices keeps their positions. Sides, angles and vertices can be labeled, and a labeled right angle is marked.",
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
        description: `The names shown at the vertices A, B and C, in that order, such as "P", "Q" and "R"; at most 3 names, each at most ${CALLER_TEXT_LIMIT} characters. Each is shown outside its vertex; a name with no clear place there is placed below the figure, and one longer than four lines is cut short with “…”. An empty name shows nothing.`,
        items: { kind: "string", maxLength: CALLER_TEXT_LIMIT, description: `The name of one vertex, as plain text, at most ${CALLER_TEXT_LIMIT} characters.` },
      },
      labelSides: labelSidesProperty,
      labelAngles: {
        term: "labelAngles",
        kind: "boolean",
        required: false,
        description:
          "Whether the three angles are labeled with their measures in degrees, each inside its angle with an arc; an angle within 1% of 90° gets a right-angle mark instead of the arc.",
      },
      sideALabelText: labelText("sideALabelText", "side a", ""),
      sideBLabelText: labelText("sideBLabelText", "side b", ""),
      sideCLabelText: labelText("sideCLabelText", "side c", ""),
      angleALabelText: labelText("angleALabelText", "angle A", ", and must not be given with labelAngles false"),
      angleBLabelText: labelText("angleBLabelText", "angle B", ", and must not be given with labelAngles false"),
      angleCLabelText: labelText("angleCLabelText", "angle C", ", and must not be given with labelAngles false"),
      unit: unitProperty,
    }),
    derivations: [],
    checks: [
      agrees<Triangle>("angle A label text needs the angles labeled", "labelAngles", "angleALabelText"),
      agrees<Triangle>("angle B label text needs the angles labeled", "labelAngles", "angleBLabelText"),
      agrees<Triangle>("angle C label text needs the angles labeled", "labelAngles", "angleCLabelText"),
    ],
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
     * and C 90°. Its vertices are named “P”, “Q” and “R”. All three sides are labeled with their
     * lengths. Angle C is labeled “θ”. Angle C is marked as a right angle." Supplied values are
     * stated as written, derived ones rounded; names and custom label text are quoted, and every
     * value is stated anyway (GSS-REQ-035).
     */
    // @spec GSS-REQ-014, GSS-REQ-020, GSS-REQ-021, GSS-REQ-033, GSS-REQ-034, GSS-REQ-035, GSS-REQ-036
    describe: (triangle: Triangle, provenance: Provenance) => {
      const shown = triangleDisplay(triangle, provenance);
      const title = triangle.title === undefined ? "" : cleanText(triangle.title);
      const titled = title === "" ? "" : ` titled ${quoteText(title)}`;
      const sides = SIDE_TERMS.map((term, i) => `${VERTEX_NAMES[i]!.toLowerCase()} ${stateMeasurement(triangle[term], sourceOf(provenance, term), triangle.unit)}`);
      const angles = ANGLE_TERMS.map((term, i) => `${VERTEX_NAMES[i]} ${formatMeasurement(triangle[term], sourceOf(provenance, term))}°`);
      const sentences = [`A triangle${titled} with sides ${formatList(sides)}, and angles ${formatList(angles)}.`];

      if (triangle.vertices !== undefined) {
        const points = triangle.vertices.map((vertex) => `(${formatSupplied(vertex.x)}, ${formatSupplied(vertex.y)})`);
        sentences.push(`Its vertices are at ${formatList(points)}.`);
      }
      const named = shown.names.map((name, i) => ({ vertex: VERTEX_NAMES[i]!, name })).filter(({ name }) => name !== "");
      if (named.length === VERTEX_NAMES.length) {
        sentences.push(`Its vertices are named ${formatList(named.map(({ name }) => quoteText(name)))}.`);
      } else if (named.length > 0) {
        const [first, ...rest] = named.map(({ vertex, name }) => `vertex ${vertex} ${quoteText(name)}`);
        const opening = first!.replace(/^vertex (\w) /, "Vertex $1 is named ");
        sentences.push(`${formatList([opening, ...rest])}.`);
      }
      labelSentences(sentences, SIDE_TERMS.map((term, i) => ({ name: VERTEX_NAMES[i]!.toLowerCase(), label: shown.sides[term] })), "side", "lengths", "its length");
      labelSentences(sentences, ANGLE_TERMS.map((term, i) => ({ name: VERTEX_NAMES[i]!, label: shown.angles[term] })), "angle", "measures", "its measure");
      const right = ANGLE_TERMS.flatMap((term, i) => (shown.angles[term].rightAngle ? [VERTEX_NAMES[i]!] : []));
      if (right.length > 0) sentences.push(right.length === 1 ? `Angle ${right[0]} is marked as a right angle.` : `Angles ${formatList(right)} are marked as right angles.`);
      return sentences.join(" ");
    },
  };
}
