import { defaultStyle } from "../../core/style";
import { SCENE_WIDTH, type SceneNode } from "../scene";
import { fmt, fmtPoints } from "./format";
import { type Obstacle, type Segment, placeLabel } from "./labels";
import { textBlock, textLines } from "./title";
import { type Vec, add, times } from "./vec";

/** Clearance between a label and the line it labels or the outline it sits by. */
export const GAP = 6;
/** Labels wider than this wrap onto more lines. */
export const LABEL_MAX_WIDTH = 160;
/**
 * A label longer than this many lines is cut, ending in "…", so caller-sized text yields a bounded
 * Scene; the text alternative still states it whole (GSS TICKET-002 security review SEC-001, DEL-008).
 */
export const LABEL_MAX_LINES = 4;

/** A point in drawing units. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** The size of a label's box. */
export interface LabelSize {
  readonly width: number;
  readonly height: number;
}

/** A label's text broken into lines, with the size of the box they fill. */
export interface LabelBlock extends LabelSize {
  readonly lines: string[];
}

/** A label's text broken into at most `LABEL_MAX_LINES` lines, with the size of its box. */
// @spec GSS-REQ-006, GSS-REQ-008
export function labelBlock(text: string, fontSize: number): LabelBlock {
  // `textBlock` measures with a loop, never `Math.max(...)`: no caller-sized spread (SEC-001).
  return textBlock(text, LABEL_MAX_WIDTH, fontSize, LABEL_MAX_LINES);
}

/** Candidates above and below a horizontal segment at `y`, centered on each of `xs`. */
export const besideHorizontal = (xs: readonly number[], y: number, size: LabelSize): Point[] =>
  xs.flatMap((x) => [
    { x: x - size.width / 2, y: y - GAP - size.height },
    { x: x - size.width / 2, y: y + GAP },
  ]);

/** Candidates left and right of a vertical segment at `x`, centered on each of `ys`. */
export const besideVertical = (x: number, ys: readonly number[], size: LabelSize): Point[] =>
  ys.flatMap((y) => [
    { x: x - GAP - size.width, y: y - size.height / 2 },
    { x: x + GAP, y: y - size.height / 2 },
  ]);

/** How far a box of `size`, centered on a point, reaches from it in the direction `u` (a unit vector). */
const reach = (u: Vec, size: LabelSize) => (Math.abs(u[0]) * size.width) / 2 + (Math.abs(u[1]) * size.height) / 2;

/**
 * The top-left corner of a box of `size` whose nearest side lies `gap` from `from` in the direction
 * `u`, centered on that line: a label candidate beside a vertex or a side, for the triangle and the
 * cube (GSS TICKET-006 quality review QR-001).
 */
export function besidePoint(from: Vec, u: Vec, gap: number, size: LabelSize): Point {
  const center = add(from, times(u, gap + reach(u, size)));
  return { x: center[0] - size.width / 2, y: center[1] - size.height / 2 };
}

/** A figure line as a stroked Scene node. */
export function segmentNode(s: Segment, color: string): SceneNode {
  return {
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
  };
}

/**
 * A stroked, unfilled polyline through `points`, every number through `fmt()`, with mitred joins:
 * a figure's angle and right-angle marks (GSS TICKET-005 quality review QR-002).
 */
export function polylineNode(points: ReadonlyArray<readonly [number, number]>, color: string): SceneNode {
  return {
    kind: "polyline",
    attrs: [
      ["points", fmtPoints(points)],
      ["fill", "none"],
      ["stroke", color],
      ["stroke-width", fmt(defaultStyle.lineWidths.figure)],
      ["stroke-linejoin", "miter"],
    ],
  };
}

/** The edges a placed label must stay within, in drawing units. */
export interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** One label to place: its text (blank draws nothing) and where to try it, given its size. */
export interface LabelRequest {
  readonly text: string;
  readonly candidates: (size: LabelSize) => Point[];
  /**
   * The text drawn instead when the label has no clear place and is stacked below the figure,
   * away from what it labels, such as "∠A = 30°" for an angle's "30°" (GSS TICKET-005 code review
   * CR-001). Without it the stacked label shows `text`.
   */
  readonly stackedText?: string;
}

/**
 * Places each label, in order, with `placeLabel` at the first of its candidates that lies inside
 * `bounds` and clear of `obstacles` (AD-010), and pushes each placed box onto `obstacles`, so a
 * later label clears it. A label with no clear candidate is stacked below `stackTop`, centered, in
 * the order given (GSS TICKET-002 DEL-006), after the placed ones. Blank text draws nothing
 * (DEL-003). Returns the text nodes and the drawing's new bottom (`stackTop` when nothing stacked).
 */
// @spec GSS-REQ-006, GSS-REQ-008, GSS-REQ-035
export function placeLabels(
  requests: readonly LabelRequest[],
  obstacles: Obstacle[],
  bounds: Bounds,
  stackTop: number,
): { nodes: SceneNode[]; bottom: number } {
  const fontSize = defaultStyle.fontSizes.label;
  const color = defaultStyle.colors.text;
  const nodes: SceneNode[] = [];
  const unplaced: string[] = [];
  for (const request of requests) {
    if (request.text === "") continue;
    const size = labelBlock(request.text, fontSize);
    const inside = (p: Point) =>
      p.x >= bounds.left && p.x + size.width <= bounds.right && p.y >= bounds.top && p.y + size.height <= bounds.bottom;
    const box = placeLabel(size, request.candidates(size).filter(inside), obstacles);
    if (box === undefined) {
      unplaced.push(request.stackedText ?? request.text);
      continue;
    }
    obstacles.push(box);
    for (const node of textLines(size.lines, box.x + box.width / 2, box.y, fontSize, color)) nodes.push(node);
  }
  // Outside `placeLabel`: nothing is above them to avoid.
  let bottom = stackTop;
  for (const text of unplaced) {
    const size = labelBlock(text, fontSize);
    const top = bottom + GAP;
    for (const node of textLines(size.lines, SCENE_WIDTH / 2, top, fontSize, color)) nodes.push(node);
    bottom = top + size.height;
  }
  return { nodes, bottom };
}
