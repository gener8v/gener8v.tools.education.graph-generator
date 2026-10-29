import { type Triangle, triangle as triangleDefinition, triangleDisplay } from "../core/definitions/triangle";
import { sourceOf } from "../core/format";
import { TRIANGLE_ANGLES, TRIANGLE_SIDES, type TriangleSideTerm } from "../core/geometry/triangle-solver";
import type { Provenance } from "../core/result";
import { defaultStyle } from "../core/style";
import { fmt, fmtPoints } from "./kit/format";
import { GAP, type LabelRequest, type LabelSize, type Point, placeLabels } from "./kit/figure-labels";
import type { Obstacle } from "./kit/labels";
import { measurementLabel } from "./kit/measure";
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

type Index = 0 | 1 | 2;
type Vec = readonly [number, number];

/**
 * Each side's ends, in the order they are drawn left to right when the triangle stands on that
 * side, counter-clockwise: side a from B to C, side b from C to A, side c from A to B (GSS-REQ-022).
 */
// @spec GSS-REQ-022
export const SIDE_ENDS: Readonly<Record<TriangleSideTerm, readonly [Index, Index]>> = { sideA: [1, 2], sideB: [2, 0], sideC: [0, 1] };
const INDICES: readonly Index[] = [0, 1, 2];

const add = (p: Vec, q: Vec): Vec => [p[0] + q[0], p[1] + q[1]];
const sub = (p: Vec, q: Vec): Vec => [p[0] - q[0], p[1] - q[1]];
const times = (p: Vec, k: number): Vec => [p[0] * k, p[1] * k];
const dot = (p: Vec, q: Vec) => p[0] * q[0] + p[1] * q[1];
const cross = (p: Vec, q: Vec) => p[0] * q[1] - p[1] * q[0];
const length = (p: Vec) => Math.hypot(p[0], p[1]);
const rotate = (p: Vec, angle: number): Vec => [p[0] * Math.cos(angle) - p[1] * Math.sin(angle), p[0] * Math.sin(angle) + p[1] * Math.cos(angle)];

/** `p` scaled to length 1, or `fallback` when it has no length: never a division by zero. */
function unit(p: Vec, fallback: Vec): Vec {
  const n = length(p);
  return n > 0 && Number.isFinite(n) ? [p[0] / n, p[1] / n] : fallback;
}

/**
 * The vertices A, B and C in the description's own units, y up. A triangle given by its vertices
 * keeps them. Otherwise it stands on `base`: its ends at (0, 0) and (length, 0), counter-clockwise
 * (`SIDE_ENDS`), and the third vertex above, at its side's length and the base's first angle from
 * the first end (GSS-REQ-022). Only cosines and sines are taken: nothing is divided.
 */
// @spec GSS-REQ-013, GSS-REQ-022
function modelVertices(triangle: Triangle, base: TriangleSideTerm): [Vec, Vec, Vec] {
  const given = triangle.vertices;
  if (given !== undefined && given.length === 3) return [[given[0]!.x, given[0]!.y], [given[1]!.x, given[1]!.y], [given[2]!.x, given[2]!.y]];
  const [p, q] = SIDE_ENDS[base];
  const r = (3 - p - q) as Index;
  const points: Vec[] = [];
  const angle = triangle[TRIANGLE_ANGLES[p]] * RADIANS;
  // The side between p and r is the one opposite q.
  const reach = triangle[TRIANGLE_SIDES[q]];
  points[p] = [0, 0];
  points[q] = [triangle[base], 0];
  points[r] = [reach * Math.cos(angle), reach * Math.sin(angle)];
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

/** How far a box of `size`, centered on a point, reaches from it in the direction `u` (a unit vector). */
const reach = (u: Vec, size: LabelSize) => (Math.abs(u[0]) * size.width) / 2 + (Math.abs(u[1]) * size.height) / 2;

/** The top-left corner of a box of `size` whose nearest side lies `gap` from `from` in the direction `u`, centered on that line. */
function besidePoint(from: Vec, u: Vec, gap: number, size: LabelSize): Point {
  const center = add(from, times(u, gap + reach(u, size)));
  return { x: center[0] - size.width / 2, y: center[1] - size.height / 2 };
}

/** Whether `p` lies strictly inside the triangle `v`. */
function insideTriangle(p: Vec, v: readonly [Vec, Vec, Vec]): boolean {
  const s0 = cross(sub(v[1], v[0]), sub(p, v[0]));
  const s1 = cross(sub(v[2], v[1]), sub(p, v[1]));
  const s2 = cross(sub(v[0], v[2]), sub(p, v[2]));
  return (s0 > 0 && s1 > 0 && s2 > 0) || (s0 < 0 && s1 < 0 && s2 < 0);
}

/** A stroked, unfilled polyline through `points`, every number through `fmt()`. */
function polylineNode(points: readonly Vec[], color: string, join: "round" | "miter"): SceneNode {
  return {
    kind: "polyline",
    attrs: [
      ["points", fmtPoints(points)],
      ["fill", "none"],
      ["stroke", color],
      ["stroke-width", fmt(defaultStyle.lineWidths.figure)],
      ["stroke-linejoin", join],
    ],
  };
}

const rounded = (p: Vec): Vec => [fmt(p[0]), fmt(p[1])];

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
  const model = modelVertices(normalized, shown.base);
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
    nodes.push(polylineNode(marked, lineColor, "miter"));
    for (let k = 0; k + 1 < marked.length; k++) obstacles.push({ x1: marked[k]![0], y1: marked[k]![1], x2: marked[k + 1]![0], y2: marked[k + 1]![1] });
  };

  // Per vertex: the unit vectors along its two sides, and the reach of its marks, kept inside the
  // triangle by the vertex's distance to the opposite side (a product over a side length, which a
  // valid triangle never has at zero; guarded all the same).
  const corner = INDICES.map((i) => {
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
  });

  // Angle marks (GSS-REQ-020, GSS-REQ-021): a right-angle mark, or an arc as a short polyline.
  const markReach: number[] = [0, 0, 0];
  for (const i of INDICES) {
    const label = shown.angles[TRIANGLE_ANGLES[i]];
    if (!label.labeled) continue;
    const { u1, u2, height, shortest } = corner[i]!;
    if (label.rightAngle) {
      const m = Math.min(RIGHT_ANGLE_MARK, 0.4 * shortest, 0.6 * height);
      pushPolyline([add(v[i], times(u1, m)), add(v[i], add(times(u1, m), times(u2, m))), add(v[i], times(u2, m))]);
      markReach[i] = m * Math.SQRT2;
      continue;
    }
    const r = Math.min(ARC_RADIUS, 0.4 * shortest, 0.8 * height);
    const from = Math.atan2(u1[1], u1[0]);
    let sweep = Math.atan2(u2[1], u2[0]) - from;
    if (sweep > Math.PI) sweep -= 2 * Math.PI;
    if (sweep <= -Math.PI) sweep += 2 * Math.PI;
    const pieces = Math.max(1, Math.ceil(Math.abs(sweep) / ARC_STEP));
    const arc: Vec[] = [];
    for (let k = 0; k <= pieces; k++) {
      const angle = from + (sweep * k) / pieces;
      arc.push(add(v[i], [r * Math.cos(angle), r * Math.sin(angle)]));
    }
    pushPolyline(arc);
    markReach[i] = r;
  }

  // Candidates, each a top-left corner for a label of the given size.
  const nameCandidates = (i: Index) => (size: LabelSize): Point[] => {
    const o = corner[i]!.outward;
    const directions: Vec[] = [o, rotate(o, Math.PI / 6), rotate(o, -Math.PI / 6), rotate(o, Math.PI / 3), rotate(o, -Math.PI / 3), rotate(o, Math.PI / 2), rotate(o, -Math.PI / 2), [0, -1], [0, 1], [-1, 0], [1, 0]];
    return directions.map((u) => besidePoint(v[i], u, GAP, size));
  };
  const sideCandidates = (term: TriangleSideTerm) => (size: LabelSize): Point[] => {
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
  const angleCandidates = (i: Index) => (size: LabelSize): Point[] => {
    const b = corner[i]!.bisector;
    const found: Point[] = [];
    // Further in along the bisector for a narrow angle, whose sides close in on a label near it.
    for (const extra of [0, lineHeight / 2, lineHeight, 2 * lineHeight, 3 * lineHeight, 4 * lineHeight, 6 * lineHeight]) {
      const at = besidePoint(v[i], b, markReach[i]! + GAP + extra, size);
      // Only inside the triangle: a box clear of the sides with its center inside lies inside.
      if (insideTriangle([at.x + size.width / 2, at.y + size.height / 2], v)) found.push(at);
    }
    return found;
  };

  const requests: LabelRequest[] = [];
  for (const i of INDICES) requests.push({ text: shown.names[i], candidates: nameCandidates(i) });
  for (const term of TRIANGLE_SIDES) {
    const label = shown.sides[term];
    if (!label.labeled) continue;
    // A blank label leaves its place empty; the text alternative still states the value (DEL-003).
    requests.push({ text: measurementLabel(normalized[term], sourceOf(provenance, term), normalized.unit, label.customText), candidates: sideCandidates(term) });
  }
  for (const i of INDICES) {
    const term = TRIANGLE_ANGLES[i];
    const label = shown.angles[term];
    if (!label.labeled) continue;
    const text = label.customText === undefined ? `${measurementLabel(normalized[term], sourceOf(provenance, term))}°` : measurementLabel(normalized[term], sourceOf(provenance, term), undefined, label.customText);
    requests.push({ text, candidates: angleCandidates(i) });
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
