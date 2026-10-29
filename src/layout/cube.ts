import { type Cube, cube as cubeDefinition, cubeDisplay } from "../core/definitions/cube";
import { sourceOf } from "../core/format";
import type { Provenance } from "../core/result";
import { defaultStyle } from "../core/style";
import { fmt } from "./kit/format";
import { GAP, type LabelRequest, type LabelSize, type Point, besidePoint, placeLabels, segmentNode } from "./kit/figure-labels";
import { HIDDEN_DASH, ISO_SCALE, type Point3, faceVisible, isometric } from "./kit/isometric";
import type { Obstacle, Segment } from "./kit/labels";
import { measurementLabel } from "./kit/measure";
import { LINE_HEIGHT, SCENE_MARGIN, titleBlock } from "./kit/title";
import { type Vec, add, dot, sub, times } from "./kit/vec";
import type { Layout } from "./registry";
import { SCENE_WIDTH, type Scene, type SceneNode } from "./scene";

/**
 * The drawn length of every edge: every cube is drawn at this size, whatever its edge length, so
 * it fits the drawing (GSS-REQ-031), and all twelve edges draw equal (GSS-REQ-030).
 */
export const DRAWN_EDGE = 120;

/**
 * The cube's edge in drawing units before projection: the drawn edge undone by the isometric
 * foreshortening. The caller's edge length never reaches `isometric()`, so a cube at the
 * 1,000,000 limit projects the same finite corners as any other (GSS TICKET-001 SEC-002).
 */
const MODEL_EDGE = DRAWN_EDGE / ISO_SCALE;

const CENTER_X = SCENE_WIDTH / 2;

type Bit = 0 | 1;
type Corner = readonly [Bit, Bit, Bit];

/** One of the twelve edges: its two corners, and whether a face it bounds faces the viewer. */
export interface CubeEdge {
  readonly from: Corner;
  readonly to: Corner;
  readonly visible: boolean;
}

type Axis = 0 | 1 | 2;

/** The corner with `value` on `axis` and `a`, `b` on the other two axes, in order. */
/** The two axes other than each axis, in order (quality review QR-003: a lookup, not nested conditionals). */
const OTHER_AXES: Readonly<Record<Axis, readonly [Axis, Axis]>> = { 0: [1, 2], 1: [0, 2], 2: [0, 1] };

/** The corner with `value` on `axis` and `a`, `b` on the other two axes, in order. */
function cornerOf(axis: Axis, value: Bit, a: Bit, b: Bit): Corner {
  const corner: [Bit, Bit, Bit] = [0, 0, 0];
  const [first, second] = OTHER_AXES[axis];
  corner[axis] = value;
  corner[first] = a;
  corner[second] = b;
  return corner;
}

/** The outward normal of the face at `bit` on `axis`: + for 1, − for 0. */
const faceNormal = (axis: Axis, bit: Bit): Point3 => {
  const normal: [number, number, number] = [0, 0, 0];
  normal[axis] = bit === 1 ? 1 : -1;
  return normal;
};

/** Builds `CUBE_EDGES`: along each axis, the four edges at each 0 or 1 on the other two. Marked free of side effects. */
/* @__NO_SIDE_EFFECTS__ */
function cubeEdges(): CubeEdge[] {
  const edges: CubeEdge[] = [];
  for (const axis of [0, 1, 2] as const) {
    const [first, second] = OTHER_AXES[axis];
    for (const a of [0, 1] as const) {
      for (const b of [0, 1] as const) {
        const visible = faceVisible(faceNormal(first, a)) || faceVisible(faceNormal(second, b));
        edges.push({ from: cornerOf(axis, 0, a, b), to: cornerOf(axis, 1, a, b), visible });
      }
    }
  }
  return edges;
}

/**
 * The twelve edges of the unit cube, each from a corner with a 0 on its axis to the corner with a
 * 1. An edge bounds two faces, one for each axis it does not run along, facing + where its
 * coordinate on that axis is 1 and − where it is 0; it is visible when either face is (AD-009:
 * hidden lines found analytically, prd/TC-010). The 9 visible and the 3 hidden edges, which meet
 * at the back bottom corner (0, 0, 0), follow from `faceVisible` (GSS-REQ-023, GSS-REQ-024).
 */
// @spec GSS-REQ-023, GSS-REQ-024, GSS-REQ-032
export const CUBE_EDGES: readonly CubeEdge[] = /* @__PURE__ */ cubeEdges();

/** The edge `labelEdges: "one"` labels: the hexagon's bottom right outer edge, from (0, 1, 0) to (1, 1, 0) (GSS-REQ-025). */
const BOTTOM_RIGHT: readonly [Corner, Corner] = [
  [0, 1, 0],
  [1, 1, 0],
];
/**
 * The three visible edges meeting at the front top corner (1, 1, 1), which `labelEdges: "three"`
 * labels: straight down along z, up and right along x, and up and left along y (GSS-REQ-025).
 */
const FRONT_CORNER_EDGES: ReadonlyArray<readonly [Corner, Corner]> = [
  [[1, 1, 1], [1, 1, 0]],
  [[1, 1, 1], [0, 1, 1]],
  [[1, 1, 1], [1, 0, 1]],
];


/**
 * Candidates for an edge's label: beside the edge along each of `normals`, from its middle outward,
 * at two distances. An outer edge takes its outward normal only, so its label sits outside the
 * hexagon; an edge at the front corner takes both, so its label sits between it and the hidden
 * edges either side (GSS TICKET-001 CR-004), which are obstacles when drawn.
 */
const edgeCandidates = (p: Vec, q: Vec, normals: readonly Vec[], lineHeight: number) => (size: LabelSize): Point[] => {
  const along = sub(q, p);
  const found: Point[] = [];
  for (const gap of [GAP, GAP + lineHeight / 2]) {
    for (const t of [0.5, 0.4, 0.6, 0.3, 0.7]) {
      for (const normal of normals) found.push(besidePoint(add(p, times(along, t)), normal, gap, size));
    }
  }
  return found;
};

/** The unit normals of the segment `p`–`q`, the one pointing away from `center` first. */
function normalsOf(p: Vec, q: Vec, center: Vec): [Vec, Vec] {
  const along = sub(q, p);
  const n = Math.hypot(along[0], along[1]);
  let normal: Vec = [-along[1] / n, along[0] / n];
  if (dot(normal, sub(add(p, times(along, 0.5)), center)) < 0) normal = times(normal, -1);
  return [normal, times(normal, -1)];
}


/** The edges labeled for each `labelEdges` count: none, the bottom-right outer edge, or the three at the front corner. */
const LABELED_EDGES: Readonly<Record<0 | 1 | 3, ReadonlyArray<readonly [Corner, Corner]>>> = { 0: [], 1: [BOTTOM_RIGHT], 3: FRONT_CORNER_EDGES };
/**
 * The cube's layout (AD-002, AD-009). The cube is drawn at the one fixed edge `DRAWN_EDGE`,
 * whatever its edge length (GSS-REQ-031), in the solids' shared isometric viewpoint (GSS-REQ-032),
 * so all twelve edges draw equal (GSS-REQ-030) and it reads as a solid (GSS-REQ-023): a regular
 * hexagon, centered below the title, whose centre joins the three visible edges at the front top
 * corner and the three hidden ones at the back bottom corner, the two corners projecting to one
 * point (GSS TICKET-001 CR-004). The 9 visible edges are solid; the 3 hidden ones dashed, or not
 * drawn when omitted (GSS-REQ-024).
 *
 * One edge (the bottom right, labeled outside the hexagon) or the three visible edges at the front
 * corner (each labeled inside the hexagon, between the spokes) carry the value and unit or custom
 * text (GSS-REQ-025). Labels are placed with `placeLabels` clear of every drawn edge, dashed ones
 * included, and of each other (AD-010, GSS-NFR-003); a label with no clear place is stacked below
 * the figure, naming its edge.
 */
// @spec GSS-REQ-023, GSS-REQ-024, GSS-REQ-025, GSS-REQ-030, GSS-REQ-031, GSS-REQ-032, GSS-REQ-033, GSS-REQ-034, GSS-REQ-035, GSS-REQ-036
export const cubeLayout: Layout<Cube> = (normalized: Cube, provenance: Provenance): Scene => {
  const shown = cubeDisplay(normalized);
  const lineColor = normalized.lineColor ?? defaultStyle.colors.line;
  const lineHeight = defaultStyle.fontSizes.label * LINE_HEIGHT;
  const title = titleBlock(normalized.title);

  // The hexagon reaches one drawn edge above and below its centre.
  const top = title.height + SCENE_MARGIN;
  const center: Vec = [CENTER_X, top + DRAWN_EDGE];
  const figureBottom = top + 2 * DRAWN_EDGE + GAP + lineHeight;
  // Each corner's drawn point, rounded once (AD-007), so the lines and the obstacles agree.
  const at = (corner: Corner): Vec => {
    const [x, y] = isometric(corner[0] * MODEL_EDGE, corner[1] * MODEL_EDGE, corner[2] * MODEL_EDGE);
    return [fmt(center[0] + x), fmt(center[1] + y)];
  };
  const segmentOf = (from: Corner, to: Corner): Segment => {
    const [x1, y1] = at(from);
    const [x2, y2] = at(to);
    return { x1, y1, x2, y2 };
  };

  const nodes: SceneNode[] = [...title.nodes];
  // The title is kept clear by the candidates' bounds below, not as an obstacle.
  const obstacles: Obstacle[] = [];
  // Hidden edges first, so the visible ones are drawn over them where they meet.
  if (shown.hiddenDashed) {
    for (const edge of CUBE_EDGES) {
      if (edge.visible) continue;
      const segment = segmentOf(edge.from, edge.to);
      const line = segmentNode(segment, lineColor);
      nodes.push({ ...line, attrs: [...line.attrs, ["stroke-dasharray", HIDDEN_DASH]] });
      obstacles.push(segment);
    }
  }
  for (const edge of CUBE_EDGES) {
    if (!edge.visible) continue;
    const segment = segmentOf(edge.from, edge.to);
    nodes.push(segmentNode(segment, lineColor));
    obstacles.push(segment);
  }

  const labeled = LABELED_EDGES[shown.labeled];
  // A blank label leaves its place empty; the text alternative still states the value (GSS TICKET-002 DEL-003).
  const text = measurementLabel(normalized.edgeLength, sourceOf(provenance, "edgeLength"), normalized.unit, shown.customText);
  const requests: LabelRequest[] = [];
  for (const [from, to] of labeled) {
    const p = at(from);
    const q = at(to);
    const [outward, inward] = normalsOf(p, q, center);
    const outer = shown.labeled === 1;
    // Each says what it labels when stacked below the figure, away from it.
    requests.push({ text, candidates: edgeCandidates(p, q, outer ? [outward] : [outward, inward], lineHeight), stackedText: `edge = ${text}` });
  }
  // Candidates must keep the label inside the drawing, between the title and the figure's bottom.
  // Labels with no clear place are stacked below the figure (GSS TICKET-002 DEL-006).
  const placed = placeLabels(requests, obstacles, { left: SCENE_MARGIN, top: title.height, right: SCENE_WIDTH - SCENE_MARGIN, bottom: figureBottom }, figureBottom);
  for (const node of placed.nodes) nodes.push(node);

  return {
    width: SCENE_WIDTH,
    height: fmt(placed.bottom + SCENE_MARGIN),
    textAlternative: cubeDefinition.describe(normalized, provenance),
    nodes,
  };
};
