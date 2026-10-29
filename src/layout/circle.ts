import { circle as circleDefinition, circleDisplay, type Circle, type CircleMeasurement } from "../core/definitions/circle";
import { sourceOf } from "../core/format";
import type { Provenance } from "../core/result";
import { defaultStyle } from "../core/style";
import { fmt } from "./kit/format";
import { GAP, LABEL_MAX_LINES, type LabelRequest, type Point, besideHorizontal, besideVertical, placeLabels, segmentNode } from "./kit/figure-labels";
import type { Obstacle, Segment } from "./kit/labels";
import { measurementLabel } from "./kit/measure";
import { LINE_HEIGHT, SCENE_MARGIN, titleBlock } from "./kit/title";
import type { Layout } from "./registry";
import { SCENE_WIDTH, type Scene, type SceneNode } from "./scene";

/** The drawn radius: every circle is scaled to it, so it fits the drawing at any size (GSS-REQ-031). */
export const DRAWN_RADIUS = 110;

const CENTER_X = SCENE_WIDTH / 2;
/** Re-exported: the label line cap now lives with the kit's label code, shared with the square. */
export { LABEL_MAX_LINES };
const CENTER_MARK_RADIUS = 3;
/** The outline as this many straight pieces, as obstacles for label placement. */
const OUTLINE_PIECES = 72;

/**
 * The directions from the center to try a label beside the outline, as exact unit vectors (x right,
 * y up): upper right first, then the other diagonals, then top, bottom, right and left. Exact zeros
 * matter: `besideOutline` centers a box on any axis where the direction is 0, and `Math.cos(π / 2)`
 * is 6e-17, not 0 (quality review QR-007).
 */
const OUTLINE_DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [Math.SQRT1_2, Math.SQRT1_2],
  [-Math.SQRT1_2, Math.SQRT1_2],
  [Math.SQRT1_2, -Math.SQRT1_2],
  [-Math.SQRT1_2, -Math.SQRT1_2],
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
];

/**
 * Candidate top-left corners for a label of `size` beside the outline (GSS Behaviors & Rules: a
 * label for a value with no segment sits next to the outline), one per `OUTLINE_DIRECTIONS`. Each
 * places the box's corner nearest the circle just outside it, so the box lies outside the circle;
 * along an axis, the box is centered on that axis.
 */
export function besideOutline(center: Point, size: { width: number; height: number }): Point[] {
  return OUTLINE_DIRECTIONS.map(([dx, dy]) => {
    const px = center.x + (DRAWN_RADIUS + GAP) * dx;
    const py = center.y - (DRAWN_RADIUS + GAP) * dy;
    const x = dx > 0 ? px : dx < 0 ? px - size.width : px - size.width / 2;
    const y = dy > 0 ? py - size.height : dy < 0 ? py : py - size.height / 2;
    return { x, y };
  });
}

/**
 * The circle's layout (AD-002): the circle at a fixed drawn radius, centered below the title; the
 * radius from the center horizontally to the right; the diameter through the center, horizontal,
 * or vertical when the radius is drawn too, so the two never lie on each other; a point at the
 * center. Each label is placed with `placeLabel` clear of the lines, the outline and the other
 * labels (AD-010): on its segment for the radius and diameter, beside the outline for the
 * circumference. A label with no clear candidate goes below the figure, so labels never overlap.
 * The radius segment is the drawn radius and the diameter twice it, so their ratio is exactly the
 * measurements' ratio (GSS-REQ-030, GSS-NFR-001).
 */
// @spec GSS-REQ-001, GSS-REQ-003, GSS-REQ-004, GSS-REQ-005, GSS-REQ-006, GSS-REQ-033, GSS-REQ-034, GSS-REQ-035, GSS-REQ-036
export const circleLayout: Layout<Circle> = (normalized: Circle, provenance: Provenance): Scene => {
  const shown = circleDisplay(normalized);
  const lineColor = normalized.lineColor ?? defaultStyle.colors.line;
  const fontSize = defaultStyle.fontSizes.label;
  const lineHeight = fontSize * LINE_HEIGHT;
  const title = titleBlock(normalized.title);

  // Room for one line of labels above and below the circle.
  const center: Point = { x: CENTER_X, y: title.height + SCENE_MARGIN + lineHeight + GAP + DRAWN_RADIUS };
  const figureBottom = center.y + DRAWN_RADIUS + GAP + lineHeight;
  const nodes: SceneNode[] = [...title.nodes];
  // The title is kept clear by the candidates' bounds below, not as an obstacle.
  const obstacles: Obstacle[] = [];

  nodes.push({
    kind: "circle",
    attrs: [
      ["cx", fmt(center.x)],
      ["cy", fmt(center.y)],
      ["r", fmt(DRAWN_RADIUS)],
      ["fill", "none"],
      ["stroke", lineColor],
      ["stroke-width", fmt(defaultStyle.lineWidths.figure)],
    ],
  });
  for (let i = 0; i < OUTLINE_PIECES; i++) {
    const a = (2 * Math.PI * i) / OUTLINE_PIECES;
    const b = (2 * Math.PI * (i + 1)) / OUTLINE_PIECES;
    obstacles.push({
      x1: center.x + DRAWN_RADIUS * Math.cos(a),
      y1: center.y + DRAWN_RADIUS * Math.sin(a),
      x2: center.x + DRAWN_RADIUS * Math.cos(b),
      y2: center.y + DRAWN_RADIUS * Math.sin(b),
    });
  }

  const radius: Segment = { x1: center.x, y1: center.y, x2: center.x + DRAWN_RADIUS, y2: center.y };
  const diameterVertical = shown.radius.drawn;
  const diameter: Segment = diameterVertical
    ? { x1: center.x, y1: center.y - DRAWN_RADIUS, x2: center.x, y2: center.y + DRAWN_RADIUS }
    : { x1: center.x - DRAWN_RADIUS, y1: center.y, x2: center.x + DRAWN_RADIUS, y2: center.y };
  if (shown.diameter.drawn) {
    nodes.push(segmentNode(diameter, lineColor));
    obstacles.push(diameter);
  }
  if (shown.radius.drawn) {
    nodes.push(segmentNode(radius, lineColor));
    obstacles.push(radius);
  }
  if (normalized.showCenter === true) {
    nodes.push({
      kind: "circle",
      attrs: [
        ["cx", fmt(center.x)],
        ["cy", fmt(center.y)],
        ["r", fmt(CENTER_MARK_RADIUS)],
        ["fill", lineColor],
      ],
    });
    const side = 2 * CENTER_MARK_RADIUS;
    obstacles.push({ x: center.x - CENTER_MARK_RADIUS, y: center.y - CENTER_MARK_RADIUS, width: side, height: side });
  }

  const candidatesFor = (term: CircleMeasurement, size: { width: number; height: number }): Point[] => {
    if (term === "radius") {
      const mid = center.x + DRAWN_RADIUS / 2;
      return besideHorizontal([mid, mid - DRAWN_RADIUS / 4, mid + DRAWN_RADIUS / 4], center.y, size);
    }
    if (term === "diameter") {
      return diameterVertical
        ? besideVertical(center.x, [center.y - DRAWN_RADIUS / 2, center.y + DRAWN_RADIUS / 2], size)
        : besideHorizontal([center.x - DRAWN_RADIUS / 2, center.x, center.x + DRAWN_RADIUS / 2], center.y, size);
    }
    return besideOutline(center, size);
  };
  const requests: LabelRequest[] = [];
  for (const term of ["radius", "diameter", "circumference"] as const) {
    const display = shown[term];
    if (!display.labeled) continue;
    // A blank label leaves its place empty; the text alternative still states the value (DEL-003).
    const text = measurementLabel(normalized[term], sourceOf(provenance, term), normalized.unit, display.customText);
    requests.push({ text, candidates: (size) => candidatesFor(term, size) });
  }
  // Candidates must keep the label inside the drawing, between the title and the figure's bottom.
  // Labels with no clear place beside their line are stacked below the figure (DEL-006).
  const placed = placeLabels(
    requests,
    obstacles,
    { left: SCENE_MARGIN, top: title.height, right: SCENE_WIDTH - SCENE_MARGIN, bottom: figureBottom },
    figureBottom,
  );
  for (const node of placed.nodes) nodes.push(node);
  const bottom = placed.bottom;

  return {
    width: SCENE_WIDTH,
    height: fmt(bottom + SCENE_MARGIN),
    textAlternative: circleDefinition.describe(normalized, provenance),
    nodes,
  };
};
