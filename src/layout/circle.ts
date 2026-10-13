import { circle as circleDefinition, circleDisplay, type Circle, type CircleMeasurement } from "../core/definitions/circle";
import { sourceOf } from "../core/format";
import type { Provenance } from "../core/result";
import { defaultStyle } from "../core/style";
import { fmt } from "./kit/format";
import { type Box, type Obstacle, type Segment, placeLabel } from "./kit/labels";
import { measurementLabel } from "./kit/measure";
import { textWidth, wrap } from "./kit/text";
import { LINE_HEIGHT, SCENE_MARGIN, textLines, titleBlock } from "./kit/title";
import type { Layout } from "./registry";
import { SCENE_WIDTH, type Scene, type SceneNode } from "./scene";

/** The drawn radius: every circle is scaled to it, so it fits the drawing at any size (GSS-REQ-031). */
export const DRAWN_RADIUS = 110;

const CENTER_X = SCENE_WIDTH / 2;
/** Clearance between a label and the line it labels or the outline it sits by. */
const GAP = 6;
/** Labels wider than this wrap onto more lines. */
const LABEL_MAX_WIDTH = 160;
/**
 * A label longer than this many lines is cut, ending in "…", so caller-sized text yields a bounded
 * Scene; the text alternative still states it whole (GSS TICKET-002 security review SEC-001, DEL-008).
 */
export const LABEL_MAX_LINES = 4;
const CENTER_MARK_RADIUS = 3;
/** The outline as this many straight pieces, as obstacles for label placement. */
const OUTLINE_PIECES = 72;

type Point = { readonly x: number; readonly y: number };

/** A label's text broken into at most `LABEL_MAX_LINES` lines, with the size of its box. */
function measure(text: string, fontSize: number): { lines: string[]; width: number; height: number } {
  const lines = wrap(text, LABEL_MAX_WIDTH, fontSize, LABEL_MAX_LINES);
  // A loop, not `Math.max(...)`: never spread a caller-sized array into arguments (security review SEC-001).
  let width = 0;
  for (const line of lines) width = Math.max(width, textWidth(line, fontSize));
  return { lines, width, height: lines.length * fontSize * LINE_HEIGHT };
}

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

/** Candidates above and below a horizontal segment at `y`, centered on each of `xs`. */
const besideHorizontal = (xs: readonly number[], y: number, size: { width: number; height: number }): Point[] =>
  xs.flatMap((x) => [
    { x: x - size.width / 2, y: y - GAP - size.height },
    { x: x - size.width / 2, y: y + GAP },
  ]);

/** Candidates left and right of a vertical segment at `x`, centered on each of `ys`. */
const besideVertical = (x: number, ys: readonly number[], size: { width: number; height: number }): Point[] =>
  ys.flatMap((y) => [
    { x: x - GAP - size.width, y: y - size.height / 2 },
    { x: x + GAP, y: y - size.height / 2 },
  ]);

const line = (s: Segment, color: string): SceneNode => ({
  kind: "line",
  attrs: [
    ["x1", fmt(s.x1)],
    ["y1", fmt(s.y1)],
    ["x2", fmt(s.x2)],
    ["y2", fmt(s.y2)],
    ["stroke", color],
    ["stroke-width", fmt(defaultStyle.lineWidths.figure)],
    ["stroke-linecap", "round"],
  ],
});

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
    nodes.push(line(diameter, lineColor));
    obstacles.push(diameter);
  }
  if (shown.radius.drawn) {
    nodes.push(line(radius, lineColor));
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
  // Candidates must keep the label inside the drawing, between the title and the figure's bottom.
  const inside = (p: Point, size: { width: number; height: number }) =>
    p.x >= SCENE_MARGIN && p.x + size.width <= SCENE_WIDTH - SCENE_MARGIN && p.y >= title.height && p.y + size.height <= figureBottom;

  let bottom = figureBottom;
  const unplaced: Array<{ lines: string[]; width: number; height: number }> = [];
  for (const term of ["radius", "diameter", "circumference"] as const) {
    const display = shown[term];
    if (!display.labeled) continue;
    const text = measurementLabel(normalized[term], sourceOf(provenance, term), normalized.unit, display.customText);
    // A blank label leaves its place empty; the text alternative still states the value (DEL-003).
    if (text === "") continue;
    const size = measure(text, fontSize);
    const box = placeLabel(
      size,
      candidatesFor(term, size).filter((p) => inside(p, size)),
      obstacles,
    );
    if (box === undefined) {
      unplaced.push(size);
      continue;
    }
    obstacles.push(box);
    for (const node of textLines(size.lines, box.x + box.width / 2, box.y, fontSize, defaultStyle.colors.text)) nodes.push(node);
  }
  // Labels with no clear place beside their line, stacked below the figure, outside `placeLabel`:
  // nothing is above them to avoid. The text alternative still says which measurement each states
  // (GSS TICKET-002 DEL-006).
  for (const size of unplaced) {
    const box: Box = { x: CENTER_X - size.width / 2, y: bottom + GAP, width: size.width, height: size.height };
    for (const node of textLines(size.lines, CENTER_X, box.y, fontSize, defaultStyle.colors.text)) nodes.push(node);
    bottom = box.y + box.height;
  }

  return {
    width: SCENE_WIDTH,
    height: fmt(bottom + SCENE_MARGIN),
    textAlternative: circleDefinition.describe(normalized, provenance),
    nodes,
  };
};
