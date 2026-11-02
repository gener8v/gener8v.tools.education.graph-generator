import { type Triangle, triangle as triangleDefinition, triangleDisplay } from "../core/definitions/triangle";
import { sourceOf } from "../core/format";
import { TRIANGLE_ANGLES, TRIANGLE_SIDES, TRIANGLE_VERTICES, type TriangleSideTerm, fourTimesArea } from "../core/geometry/triangle-solver";
import type { Provenance } from "../core/result";
import { defaultStyle } from "../core/style";
import { fmt, fmtPoints } from "./kit/format";
import { GAP, type LabelRequest, type LabelSize, type Point, besidePoint, placeLabels, polylineNode } from "./kit/figure-labels";
import type { Obstacle } from "./kit/labels";
import { measurementLabel } from "./kit/measure";
import { type Vec, add, cross, dot, length, rotate, sub, times, unit } from "./kit/vec";
import { LINE_HEIGHT, SCENE_MARGIN, titleBlock } from "./kit/title";
import type { Layout } from "./registry";
import { SCENE_WIDTH, type Scene, type SceneNode } from "./scene";

/** The widest and tallest the triangle is drawn: it is scaled to fit this box by its bounding box (GSS-REQ-031). */
export const FIGURE_WIDTH = 240;
export const FIGURE_HEIGHT = 200;
/** The radius of the arc that marks a shown angle, at most (GSS-REQ-020). */
export const ARC_RADIUS = 20;
/** The side of the small square that marks a shown right angle, at most (GSS-REQ-021). */
export const RIGHT_ANGLE_MARK = 12;

const CENTER_X = SCENE_WIDTH / 2;
const RADIANS = Math.PI / 180;
/** An arc is drawn as straight pieces of at most this angle. */
const ARC_STEP = Math.PI / 12;
/**
 * How far past a whole number of `ARC_STEP`s an angle may be and still take that many pieces. An
 * angle of 15°, 30°, 45° and so on is a whole number of steps, and the last bit of `Math.atan2`,
 * which engines compute differently, decided whether it took one piece more (CPSE TICKET-004 code
 * review CR-002, TR-002).
 */
const PIECE_TOLERANCE = 1e-9;

type Index = 0 | 1 | 2;
/**
 * Each side's ends, in the order they are drawn left to right when the triangle stands on that
 * side, counter-clockwise: side a from B to C, side b from C to A, side c from A to B (GSS-REQ-022).
 */
// @spec GSS-REQ-022
export const SIDE_ENDS: Readonly<Record<TriangleSideTerm, readonly [Index, Index]>> = { sideA: [1, 2], sideB: [2, 0], sideC: [0, 1] };
const INDICES: readonly Index[] = [0, 1, 2];

/**
 * The third vertex of a triangle standing on a base of length `b` from (0, 0) to (b, 0): `s` from
 * the first end and `t` from the second, above the base. x = (s² + b² − t²) ÷ 2b and y = 4·area ÷ 2b,
 * with Kahan's area, which keeps a needle-thin triangle's height (TR-008). No angle is taken: `cos`
 * and `sin` of an angle from `atan2` put the vertex's last bit where an engine's own functions decide
 * it, and a vertex on a rounding boundary was drawn one way in one engine and the other in another;
 * arithmetic and `sqrt` are the same in every engine (CPSE TICKET-004 code review CR-002, AD-007,
 * TR-002, graph-library GSS TICKET-009). The sides must be validated: each from 0.001 to 1,000,000
 * and meeting the triangle inequality, so `b` is never 0 and the squares never overflow (GSS
 * TICKET-009 security review SEC-001); unvalidated input is not drawn (`fmt()` refuses a
 * non-finite number).
 */
// @spec GSS-REQ-010, CPSE-NFR-005
export function thirdVertexFromSides(b: number, s: number, t: number): Vec {
  return [(s * s + b * b - t * t) / (2 * b), fourTimesArea([b, s, t]) / (2 * b)];
}

/**
 * The vertices A, B and C in the description's own units, y up. A triangle given by its vertices
 * keeps them. Otherwise it stands on `base`: its ends at (0, 0) and (length, 0), counter-clockwise
 * (`SIDE_ENDS`), and the third vertex above, at its side's length and the base's first angle from
 * the first end (GSS-REQ-022). A triangle given by its three sides (`bySides`) has the third vertex
 * from the sides alone (`thirdVertexFromSides`); any other set takes cosines and sines.
 */
// @spec GSS-REQ-010, GSS-REQ-013, GSS-REQ-022, CPSE-NFR-005
function modelVertices(triangle: Triangle, base: TriangleSideTerm, bySides: boolean): [Vec, Vec, Vec] {
  const given = triangle.vertices;
  if (given !== undefined && given.length === 3) return [[given[0]!.x, given[0]!.y], [given[1]!.x, given[1]!.y], [given[2]!.x, given[2]!.y]];
  const [p, q] = SIDE_ENDS[base];
  const r = (3 - p - q) as Index;
  const points: Vec[] = [];
  // The side between p and r is the one opposite q.
  const reach = triangle[TRIANGLE_SIDES[q]];
  points[p] = [0, 0];
  points[q] = [triangle[base], 0];
  if (bySides) {
    points[r] = thirdVertexFromSides(triangle[base], reach, triangle[TRIANGLE_SIDES[p]]);
  } else {
    const angle = triangle[TRIANGLE_ANGLES[p]] * RADIANS;
    points[r] = [reach * Math.cos(angle), reach * Math.sin(angle)];
  }
  return [points[0]!, points[1]!, points[2]!];
}

/**
 * The scale that fits a bounding box of `width` by `height` into `FIGURE_WIDTH` by `FIGURE_HEIGHT`,
 * keeping its proportions (GSS-REQ-030, GSS-REQ-031). A dimension of zero sets no limit, so a
 * needle-thin triangle is scaled by its length alone and never divided by its height (GSS
 * TICKET-004 SEC-001).
 */
// @spec GSS-REQ-030, GSS-REQ-031
function fitScale(width: number, height: number): number {
  let scale = Infinity;
  if (width > 0) scale = Math.min(scale, FIGURE_WIDTH / width);
  if (height > 0) scale = Math.min(scale, FIGURE_HEIGHT / height);
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}


/** Whether `p` lies strictly inside the triangle `v`. */
function insideTriangle(p: Vec, v: readonly [Vec, Vec, Vec]): boolean {
  const s0 = cross(sub(v[1], v[0]), sub(p, v[0]));
  const s1 = cross(sub(v[2], v[1]), sub(p, v[1]));
  const s2 = cross(sub(v[0], v[2]), sub(p, v[2]));
  return (s0 > 0 && s1 > 0 && s2 > 0) || (s0 < 0 && s1 < 0 && s2 < 0);
}

const rounded = (p: Vec): Vec => [fmt(p[0]), fmt(p[1])];

/** One vertex's geometry: the unit vectors along its two sides, its bisectors, and how far its marks may reach. */
interface Corner {
  readonly u1: Vec;
  readonly u2: Vec;
  /** Into the angle, between its sides. */
  readonly bisector: Vec;
  /** Away from the triangle, opposite the bisector. */
  readonly outward: Vec;
  /** The vertex's distance to the opposite side. */
  readonly height: number;
  /** The shorter of its two sides. */
  readonly shortest: number;
}

/**
 * Vertex `i`'s geometry in the drawn triangle `v`. The distance to the opposite side is a product
 * over a side length, which a valid triangle never has at zero; guarded all the same, so marks are
 * kept inside the triangle and nothing is divided by zero (quality review QR-001).
 */
function cornerGeometry(v: readonly [Vec, Vec, Vec], centroid: Vec, i: Index): Corner {
  const u = v[((i + 1) % 3) as Index];
  const w = v[((i + 2) % 3) as Index];
  const toU = sub(u, v[i]);
  const toW = sub(w, v[i]);
  const inward = unit(sub(centroid, v[i]), [0, -1]);
  const u1 = unit(toU, inward);
  const u2 = unit(toW, inward);
  const opposite = length(sub(w, u));
  const height = opposite > 0 ? Math.abs(cross(sub(w, u), sub(v[i], u))) / opposite : 0;
  const shortest = Math.min(length(toU), length(toW));
  return { u1, u2, bisector: unit(add(u1, u2), inward), outward: unit(times(add(u1, u2), -1), times(inward, -1)), height, shortest };
}

/** An arc of `radius` around `vertex` from the direction `u1` to `u2`, the short way, in pieces of at most `ARC_STEP`. */
// @spec CPSE-NFR-005
function arcPoints(vertex: Vec, u1: Vec, u2: Vec, radius: number): Vec[] {
  const from = Math.atan2(u1[1], u1[0]);
  let sweep = Math.atan2(u2[1], u2[0]) - from;
  if (sweep > Math.PI) sweep -= 2 * Math.PI;
  if (sweep <= -Math.PI) sweep += 2 * Math.PI;
  const pieces = Math.max(1, Math.ceil(Math.abs(sweep) / ARC_STEP - PIECE_TOLERANCE));
  const arc: Vec[] = [];
  for (let k = 0; k <= pieces; k++) {
    const angle = from + (sweep * k) / pieces;
    arc.push(add(vertex, [radius * Math.cos(angle), radius * Math.sin(angle)]));
  }
  return arc;
}

/**
 * A shown angle's mark at `vertex` (GSS-REQ-020, GSS-REQ-021): a right-angle mark, or an arc, each
 * shrunk to fit a small angle's sides; with how far it reaches from the vertex, so the angle's label
 * starts beyond it.
 */
// @spec GSS-REQ-020, GSS-REQ-021
function angleMark(vertex: Vec, corner: Corner, rightAngle: boolean): { points: Vec[]; reach: number } {
  const { u1, u2, height, shortest } = corner;
  if (rightAngle) {
    const m = Math.min(RIGHT_ANGLE_MARK, 0.4 * shortest, 0.6 * height);
    return { points: [add(vertex, times(u1, m)), add(vertex, add(times(u1, m), times(u2, m))), add(vertex, times(u2, m))], reach: m * Math.SQRT2 };
  }
  const r = Math.min(ARC_RADIUS, 0.4 * shortest, 0.8 * height);
  return { points: arcPoints(vertex, u1, u2, r), reach: r };
}

/** Candidates for vertex `i`'s name: outside the vertex, along its outward bisector and turned from it, then the four axis directions. */
const nameCandidates = (v: readonly [Vec, Vec, Vec], corner: Corner, i: Index) => (size: LabelSize): Point[] => {
  const o = corner.outward;
  const directions: Vec[] = [o, rotate(o, Math.PI / 6), rotate(o, -Math.PI / 6), rotate(o, Math.PI / 3), rotate(o, -Math.PI / 3), rotate(o, Math.PI / 2), rotate(o, -Math.PI / 2), [0, -1], [0, 1], [-1, 0], [1, 0]];
  return directions.map((u) => besidePoint(v[i], u, GAP, size));
};

/** Candidates for a side's label: outside the side along its outward normal, from its middle outward, at two distances. */
const sideCandidates = (v: readonly [Vec, Vec, Vec], term: TriangleSideTerm, lineHeight: number) => (size: LabelSize): Point[] => {
  const [p, q] = SIDE_ENDS[term];
  const r = (3 - p - q) as Index;
  const along = sub(v[q], v[p]);
  let normal = unit([-along[1], along[0]], [0, 1]);
  if (dot(normal, sub(v[r], v[p])) > 0) normal = times(normal, -1);
  const found: Point[] = [];
  for (const gap of [GAP, GAP + lineHeight / 2]) {
    for (const t of [0.5, 0.35, 0.65, 0.2, 0.8]) found.push(besidePoint(add(v[p], times(along, t)), normal, gap, size));
  }
  return found;
};

/**
 * Candidates for an angle's label: inside the angle along its bisector, beyond its mark, further in
 * for a narrow angle whose sides close in on a label near it; only those whose center is inside the
 * triangle (a box clear of the sides with its center inside lies inside).
 */
const angleCandidates = (v: readonly [Vec, Vec, Vec], corner: Corner, i: Index, markReach: number, lineHeight: number) => (size: LabelSize): Point[] => {
  const found: Point[] = [];
  for (const extra of [0, lineHeight / 2, lineHeight, 2 * lineHeight, 3 * lineHeight, 4 * lineHeight, 6 * lineHeight]) {
    const at = besidePoint(v[i], corner.bisector, markReach + GAP + extra, size);
    if (insideTriangle([at.x + size.width / 2, at.y + size.height / 2], v)) found.push(at);
  }
  return found;
};


/**
 * The triangle's layout (AD-002). A triangle given by sides and angles stands on its first-named
 * side (the first side supplied, in the order a, b, c), horizontal at the bottom, its ends
 * counter-clockwise left to right and the third vertex above (GSS-REQ-022); one given by its
 * vertices keeps their positions, with y flipped from the description's y-up to the drawing's
 * y-down, so it is never mirrored. Either is scaled to fit `FIGURE_WIDTH` by `FIGURE_HEIGHT` by its
 * bounding box, keeping its proportions (GSS-REQ-030, GSS-REQ-031), centered below the title.
 *
 * Side labels sit outside each side, along its outward normal, near its middle; angle labels inside
 * each angle along its bisector, beyond its arc; vertex names outside each vertex. All are placed
 * with `placeLabels`, clear of the sides, the marks and each other (AD-010), and a label with no
 * clear place is stacked below the figure, so a needle-thin triangle's labels never overlap. A
 * shown angle is marked with an arc, or with a right-angle mark when within 1% of 90°
 * (GSS-REQ-021); marks shrink to fit inside small angles' sides. Nothing is divided by a height,
 * an inradius or a sine, so every coordinate is finite.
 */
// @spec GSS-REQ-020, GSS-REQ-021, GSS-REQ-022, GSS-REQ-030, GSS-REQ-031, GSS-REQ-033, GSS-REQ-034, GSS-REQ-035, GSS-REQ-036
export const triangleLayout: Layout<Triangle> = (normalized: Triangle, provenance: Provenance): Scene => {
  const shown = triangleDisplay(normalized, provenance);
  const lineColor = normalized.lineColor ?? defaultStyle.colors.line;
  const lineHeight = defaultStyle.fontSizes.label * LINE_HEIGHT;
  const title = titleBlock(normalized.title);

  // Scale the description's y-up vertices to the drawing, y down, centered below the title with
  // room for one line of labels above and below.
  const bySides = normalized.vertices === undefined && TRIANGLE_SIDES.every((side) => sourceOf(provenance, side) === "supplied");
  const model = modelVertices(normalized, shown.base, bySides);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of model) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const scale = fitScale(maxX - minX, maxY - minY);
  const top = title.height + SCENE_MARGIN + lineHeight + GAP;
  const middleX = (minX + maxX) / 2;
  const v = model.map(([x, y]) => [CENTER_X + (x - middleX) * scale, top + (maxY - y) * scale] as Vec) as [Vec, Vec, Vec];
  const drawn = v.map(rounded) as [Vec, Vec, Vec];
  const figureBottom = top + (maxY - minY) * scale + GAP + lineHeight;
  const centroid: Vec = times(add(add(v[0], v[1]), v[2]), 1 / 3);

  const nodes: SceneNode[] = [...title.nodes];
  // The title is kept clear by the candidates' bounds below, not as an obstacle.
  const obstacles: Obstacle[] = [];
  nodes.push({
    kind: "polygon",
    attrs: [
      ["points", fmtPoints(drawn)],
      ["fill", "none"],
      ["stroke", lineColor],
      ["stroke-width", fmt(defaultStyle.lineWidths.figure)],
      ["stroke-linejoin", "round"],
    ],
  });
  for (const i of INDICES) {
    const p = drawn[i];
    const q = drawn[((i + 1) % 3) as Index];
    obstacles.push({ x1: p[0], y1: p[1], x2: q[0], y2: q[1] });
  }
  const pushPolyline = (points: readonly Vec[]) => {
    const marked = points.map(rounded);
    nodes.push(polylineNode(marked, lineColor));
    for (let k = 0; k + 1 < marked.length; k++) obstacles.push({ x1: marked[k]![0], y1: marked[k]![1], x2: marked[k + 1]![0], y2: marked[k + 1]![1] });
  };

  const corner = INDICES.map((i) => cornerGeometry(v, centroid, i));

  // Angle marks (GSS-REQ-020, GSS-REQ-021): a right-angle mark, or an arc as a short polyline.
  const markReach: number[] = [0, 0, 0];
  for (const i of INDICES) {
    const label = shown.angles[TRIANGLE_ANGLES[i]];
    if (!label.labeled) continue;
    const mark = angleMark(v[i], corner[i]!, label.rightAngle);
    pushPolyline(mark.points);
    markReach[i] = mark.reach;
  }

  const requests: LabelRequest[] = [];
  // Each says what it labels when stacked below the figure, away from it (code review CR-001).
  for (const i of INDICES) requests.push({ text: shown.names[i], candidates: nameCandidates(v, corner[i]!, i), stackedText: `vertex ${TRIANGLE_VERTICES[i]}: ${shown.names[i]}` });
  for (const term of TRIANGLE_SIDES) {
    const label = shown.sides[term];
    if (!label.labeled) continue;
    // A blank label leaves its place empty; the text alternative still states the value (GSS TICKET-002 DEL-003).
    const text = measurementLabel(normalized[term], sourceOf(provenance, term), normalized.unit, label.customText);
    requests.push({ text, candidates: sideCandidates(v, term, lineHeight), stackedText: `${TRIANGLE_VERTICES[TRIANGLE_SIDES.indexOf(term)]!.toLowerCase()} = ${text}` });
  }
  for (const i of INDICES) {
    const term = TRIANGLE_ANGLES[i];
    const label = shown.angles[term];
    if (!label.labeled) continue;
    const text = label.customText === undefined ? `${measurementLabel(normalized[term], sourceOf(provenance, term))}°` : measurementLabel(normalized[term], sourceOf(provenance, term), undefined, label.customText);
    requests.push({ text, candidates: angleCandidates(v, corner[i]!, i, markReach[i]!, lineHeight), stackedText: `∠${TRIANGLE_VERTICES[i]} = ${text}` });
  }
  // Candidates must keep the label inside the drawing, between the title and the figure's bottom.
  // Labels with no clear place are stacked below the figure (GSS TICKET-002 DEL-006).
  const placed = placeLabels(requests, obstacles, { left: SCENE_MARGIN, top: title.height, right: SCENE_WIDTH - SCENE_MARGIN, bottom: figureBottom }, figureBottom);
  for (const node of placed.nodes) nodes.push(node);

  return {
    width: SCENE_WIDTH,
    height: fmt(placed.bottom + SCENE_MARGIN),
    textAlternative: triangleDefinition.describe(normalized, provenance),
    nodes,
  };
};
