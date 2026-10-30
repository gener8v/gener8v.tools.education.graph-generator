import { type Cylinder, type CylinderMeasurement, cylinder as cylinderDefinition, cylinderDisplay } from "../core/definitions/cylinder";
import { sourceOf } from "../core/format";
import type { Provenance } from "../core/result";
import { defaultStyle } from "../core/style";
import { fmt, pathData } from "./kit/format";
import { GAP, type LabelRequest, type LabelSize, type Point, besidePoint, besideVertical, placeLabels, segmentNode } from "./kit/figure-labels";
import { ELLIPSE_RATIO, HIDDEN_DASH, ISO_SCALE, isoEllipse, isometric } from "./kit/isometric";
import type { Obstacle, Segment } from "./kit/labels";
import { measurementLabel } from "./kit/measure";
import { LINE_HEIGHT, SCENE_MARGIN, titleBlock } from "./kit/title";
import { type Vec, add, sub, times, unit } from "./kit/vec";
import type { Layout } from "./registry";
import { type AttrValue, SCENE_WIDTH, type Scene, type SceneNode, type SvgAttr } from "./scene";

/**
 * The box every cylinder is scaled to fit, in drawing units: its drawn outline (the top ellipse,
 * the sides and the base) is as large as fits in it, whatever its measurements, with its
 * proportions kept, so a very tall or a very wide cylinder is drawn to scale within the drawing
 * (GSS-REQ-031, GSS Edge Cases).
 */
export const FIT_WIDTH = 220;
export const FIT_HEIGHT = 260;

const CENTER_X = SCENE_WIDTH / 2;
/** Each ellipse as this many straight pieces, as obstacles for label placement. */
const ELLIPSE_PIECES = 72;

/**
 * The drawing units per unit of measurement: the largest that fits the cylinder's projected
 * outline in `FIT_WIDTH` × `FIT_HEIGHT`. The outline is `2r` wide (the top and base ellipses' full
 * width, `isoEllipse`) and `h × ISO_SCALE + 2r × ELLIPSE_RATIO` tall. Computed from the
 * measurements' ratios, never by projecting them: both are at most 1,000,000, so the scale and
 * everything drawn with it is finite (GSS TICKET-001 SEC-002).
 */
// @spec GSS-REQ-030, GSS-REQ-031
export function cylinderScale(radius: number, height: number): number {
  return Math.min(FIT_WIDTH / (2 * radius), FIT_HEIGHT / (height * ISO_SCALE + 2 * radius * ELLIPSE_RATIO));
}

/** An ellipse as `ELLIPSE_PIECES` segments from angle `from` to `to` (radians, y down), for label obstacles. */
function ellipseSegments(cx: number, cy: number, rx: number, ry: number, from: number, to: number, pieces: number): Segment[] {
  const segments: Segment[] = [];
  for (let i = 0; i < pieces; i++) {
    const a = from + ((to - from) * i) / pieces;
    const b = from + ((to - from) * (i + 1)) / pieces;
    segments.push({ x1: cx + rx * Math.cos(a), y1: cy + ry * Math.sin(a), x2: cx + rx * Math.cos(b), y2: cy + ry * Math.sin(b) });
  }
  return segments;
}

/** A stroked, unfilled `path` node of `d`. */
function pathNode(d: string, color: string, dashed: boolean): SceneNode {
  const attrs: Array<readonly [SvgAttr, AttrValue]> = [
    ["d", d],
    ["fill", "none"],
    ["stroke", color],
    ["stroke-width", fmt(defaultStyle.lineWidths.figure)],
  ];
  if (dashed) attrs.push(["stroke-dasharray", HIDDEN_DASH]);
  return { kind: "path", attrs };
}

/** Candidates for a segment's label: beside its middle, along each normal, at two distances (as the cube's edges). */
const segmentCandidates = (s: Segment, lineHeight: number) => (size: LabelSize): Point[] => {
  const p: Vec = [s.x1, s.y1];
  const along = sub([s.x2, s.y2], p);
  const n = unit([-along[1], along[0]], [0, -1]);
  const found: Point[] = [];
  for (const gap of [GAP, GAP + lineHeight / 2]) {
    for (const t of [0.5, 0.4, 0.6, 0.3, 0.7]) {
      for (const normal of [n, times(n, -1)]) found.push(besidePoint(add(p, times(along, t)), normal, gap, size));
    }
  }
  return found;
};

/**
 * The cylinder's layout (AD-002, AD-009). Upright in the solids' shared isometric viewpoint
 * (GSS-REQ-032), so it reads as a solid (GSS-REQ-026): the top face an ellipse (`isoEllipse`), two
 * side lines at its left and right ends, which are the outline's tangents, and the base as two
 * `path` arcs, its front half solid and its back half, hidden behind the cylinder, dashed or not
 * drawn (GSS-REQ-028; no clip paths or ids, AD-008). Scaled by `cylinderScale` to fit a fixed box
 * (GSS-REQ-031), every measurement turned into drawing units before it is projected (GSS TICKET-001
 * SEC-002).
 *
 * The radius is drawn on the top face along the view's projected y axis, from the center toward
 * the lower right, its end on the ellipse: the cylinder's documented radius direction. The
 * diameter runs through the center along the projected x axis when the radius is drawn too, else
 * along y. Along a projected axis a length is foreshortened by `ISO_SCALE`, the same as the
 * height's side line, so the drawn radius : height is the measurements' ratio (GSS-REQ-030; GSS
 * TICKET-001 CR-003); a radius across the page would not be. The height is labeled beside the right
 * side line (GSS-REQ-029). Labels are placed with `placeLabels` clear of every drawn line and of
 * each other (AD-010, GSS-NFR-003); a label with no clear place is stacked below the figure,
 * naming what it labels.
 */
// @spec GSS-REQ-026, GSS-REQ-027, GSS-REQ-028, GSS-REQ-029, GSS-REQ-030, GSS-REQ-031, GSS-REQ-032, GSS-REQ-033, GSS-REQ-034, GSS-REQ-035, GSS-REQ-036
export const cylinderLayout: Layout<Cylinder> = (normalized: Cylinder, provenance: Provenance): Scene => {
  const shown = cylinderDisplay(normalized);
  const lineColor = normalized.lineColor ?? defaultStyle.colors.line;
  const lineHeight = defaultStyle.fontSizes.label * LINE_HEIGHT;
  const strokeWidth = fmt(defaultStyle.lineWidths.figure);
  const title = titleBlock(normalized.title);

  // Drawing units, before any projection.
  const scale = cylinderScale(normalized.radius, normalized.height);
  const r = normalized.radius * scale;
  const h = normalized.height * scale;
  const ry = r * ELLIPSE_RATIO;

  // The top face's center sits one ellipse half-height, and a line of labels, below the title.
  const topCenter = isometric(0, 0, h);
  const offset: Vec = [CENTER_X - topCenter[0], title.height + SCENE_MARGIN + lineHeight + GAP + ry - topCenter[1]];
  // A point of the cylinder's space, projected, placed and rounded once (AD-007).
  const at = (x: number, y: number, z: number): Vec => {
    const [px, py] = isometric(x, y, z);
    return [fmt(offset[0] + px), fmt(offset[1] + py)];
  };
  const top = isoEllipse([0, 0, h], r);
  const base = isoEllipse([0, 0, 0], r);
  const cx = fmt(offset[0] + top.cx);
  const rx = fmt(top.rx);
  const ryDrawn = fmt(top.ry);
  const topY = fmt(offset[1] + top.cy);
  const baseY = fmt(offset[1] + base.cy);
  const left = fmt(cx - rx);
  const right = fmt(cx + rx);
  const figureBottom = baseY + ryDrawn + GAP + lineHeight;

  const nodes: SceneNode[] = [...title.nodes];
  // The title is kept clear by the candidates' bounds below, not as an obstacle.
  const obstacles: Obstacle[] = [];

  // The back half of the base first, so the sides are drawn over it where they meet: the base
  // ellipse's upper half on the page, from its left end over the top to its right end.
  if (shown.hiddenDashed) {
    nodes.push(pathNode(pathData([["M", left, baseY], ["A", rx, ryDrawn, 0, 0, 1, right, baseY]]), lineColor, true));
    for (const s of ellipseSegments(cx, baseY, rx, ryDrawn, Math.PI, 2 * Math.PI, ELLIPSE_PIECES / 2)) obstacles.push(s);
  }
  // The front half of the base: from the right end under the bottom to the left end.
  nodes.push(pathNode(pathData([["M", right, baseY], ["A", rx, ryDrawn, 0, 0, 1, left, baseY]]), lineColor, false));
  for (const s of ellipseSegments(cx, baseY, rx, ryDrawn, 0, Math.PI, ELLIPSE_PIECES / 2)) obstacles.push(s);

  const leftSide: Segment = { x1: left, y1: topY, x2: left, y2: baseY };
  const rightSide: Segment = { x1: right, y1: topY, x2: right, y2: baseY };
  for (const side of [leftSide, rightSide]) {
    nodes.push(segmentNode(side, lineColor));
    obstacles.push(side);
  }

  nodes.push({
    kind: "ellipse",
    attrs: [
      ["cx", cx],
      ["cy", topY],
      ["rx", rx],
      ["ry", ryDrawn],
      ["fill", "none"],
      ["stroke", lineColor],
      ["stroke-width", strokeWidth],
    ],
  });
  for (const s of ellipseSegments(cx, topY, rx, ryDrawn, 0, 2 * Math.PI, ELLIPSE_PIECES)) obstacles.push(s);

  // The radius and the diameter on the top face, along projected axes (GSS TICKET-001 CR-003).
  const segmentBetween = (p: Vec, q: Vec): Segment => ({ x1: p[0], y1: p[1], x2: q[0], y2: q[1] });
  const radius = segmentBetween(at(0, 0, h), at(0, r, h));
  const diameter = shown.radius.drawn ? segmentBetween(at(r, 0, h), at(-r, 0, h)) : segmentBetween(at(0, -r, h), at(0, r, h));
  if (shown.diameter.drawn) {
    nodes.push(segmentNode(diameter, lineColor));
    obstacles.push(diameter);
  }
  if (shown.radius.drawn) {
    nodes.push(segmentNode(radius, lineColor));
    obstacles.push(radius);
  }

  const candidatesFor = (term: CylinderMeasurement): ((size: LabelSize) => Point[]) => {
    if (term === "radius") return segmentCandidates(radius, lineHeight);
    if (term === "diameter") return segmentCandidates(diameter, lineHeight);
    // Beside the right side line, outside the cylinder, from its middle outward.
    const ys = [0.5, 0.4, 0.6, 0.3, 0.7].map((t) => topY + (baseY - topY) * t);
    return (size) => besideVertical(right, ys, size).filter((p) => p.x > right);
  };
  const STACKED = { radius: "r", diameter: "d", height: "h" } as const;
  const requests: LabelRequest[] = [];
  for (const term of ["radius", "diameter", "height"] as const) {
    const display = shown[term];
    if (!display.labeled) continue;
    // A blank label leaves its place empty; the text alternative still states the value (GSS TICKET-002 DEL-003).
    const text = measurementLabel(normalized[term], sourceOf(provenance, term), normalized.unit, display.customText);
    requests.push({ text, candidates: candidatesFor(term), stackedText: `${STACKED[term]} = ${text}` });
  }
  // Candidates must keep the label inside the drawing, between the title and the figure's bottom.
  // Labels with no clear place are stacked below the figure (GSS TICKET-002 DEL-006).
  const placed = placeLabels(requests, obstacles, { left: SCENE_MARGIN, top: title.height, right: SCENE_WIDTH - SCENE_MARGIN, bottom: figureBottom }, figureBottom);
  for (const node of placed.nodes) nodes.push(node);

  return {
    width: SCENE_WIDTH,
    height: fmt(placed.bottom + SCENE_MARGIN),
    textAlternative: cylinderDefinition.describe(normalized, provenance),
    nodes,
  };
};
