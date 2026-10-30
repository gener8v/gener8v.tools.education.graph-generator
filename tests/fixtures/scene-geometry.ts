import { defaultStyle } from "../../src/core/style";
import type { Box, Segment } from "../../src/layout/kit/labels";
import { textWidth } from "../../src/layout/kit/text";
import { LINE_HEIGHT } from "../../src/layout/kit/title";
import { TICK_LABEL_DROP } from "../../src/layout/kit/value-scale";
import type { Scene, SceneNode } from "../../src/layout/scene";

// Bounding boxes of drawn Scene nodes, for the layout tests' bounds and overlap checks (DGP
// TICKET-005 quality review QR-001; shared with the line graph, DGP TICKET-002).

/** A drawn node's bounding box, in drawing units. */
export interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  node: SceneNode;
}

export const attr = (node: SceneNode, name: string) => node.attrs.find(([key]) => key === name)?.[1];
export const num = (node: SceneNode, name: string) => Number(attr(node, name));

/**
 * A number attribute that must be there and finite: the strict reader of the cross-figure checks,
 * which would otherwise pass a broken figure, since a `NaN` box overlaps nothing and is never outside
 * the viewBox (GSS TICKET-008 security review SEC-001). `num` stays lenient for the older tests.
 */
function finite(node: SceneNode, name: string): number {
  const value = num(node, name);
  if (!Number.isFinite(value)) throw new Error(`${node.kind} has no finite ${name}: ${String(attr(node, name))}`);
  return value;
}

/** Every number must be finite: a broken coordinate fails the check instead of slipping through it. */
function allFinite<T extends number[]>(values: T, what: string): T {
  for (const value of values) if (!Number.isFinite(value)) throw new Error(`${what} has a coordinate that is not a finite number`);
  return values;
}

const ROTATE = /^rotate\((-?[\d.]+) (-?[\d.]+) (-?[\d.]+)\)$/;

/** The box around a list of points. */
function around(points: ReadonlyArray<readonly [number, number]>, node: SceneNode): Bounds {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of points) [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
  return { x0, y0, x1, y1, node };
}

const pointsOf = (node: SceneNode): Array<[number, number]> =>
  String(attr(node, "points"))
    .split(" ")
    .map((pair) => allFinite(pair.split(",").map(Number) as [number, number], `${node.kind} points`));

/**
 * A node's bounding box: a nested picture's viewport, a shape's extent, or a text line's glyphs. A
 * line's stroke adds half its width across the line; along it the default butt caps add nothing,
 * so a horizontal or vertical line is padded on its two long sides only. `textLines` puts the baseline 0.8 of the font size
 * below a glyph's top; a text turned with `rotate(-90 x y)` about its own anchor is turned too.
 */
export function boundsOf(node: SceneNode): Bounds {
  switch (node.kind) {
    case "svg":
    case "rect":
      return { x0: num(node, "x"), y0: num(node, "y"), x1: num(node, "x") + num(node, "width"), y1: num(node, "y") + num(node, "height"), node };
    case "circle": {
      const [cx, cy, r] = [num(node, "cx"), num(node, "cy"), num(node, "r")];
      return { x0: cx - r, y0: cy - r, x1: cx + r, y1: cy + r, node };
    }
    case "polygon":
      return around(pointsOf(node), node);
    case "polyline":
    case "line": {
      const half = (Number(attr(node, "stroke-width")) || 0) / 2;
      const ends: Array<[number, number]> =
        node.kind === "line"
          ? [
              [num(node, "x1"), num(node, "y1")],
              [num(node, "x2"), num(node, "y2")],
            ]
          : pointsOf(node);
      const box = around(ends, node);
      const [padX, padY] = box.y0 === box.y1 ? [0, half] : box.x0 === box.x1 ? [half, 0] : [half, half];
      return { x0: box.x0 - padX, y0: box.y0 - padY, x1: box.x1 + padX, y1: box.y1 + padY, node };
    }
    case "text": {
      const [x, y, size] = [num(node, "x"), num(node, "y"), num(node, "font-size")];
      const width = textWidth(node.text, size);
      const anchor = attr(node, "text-anchor") ?? "start";
      // Along the line, before any turn: where the text starts relative to its anchor.
      const [along0, along1] = anchor === "middle" ? [-width / 2, width / 2] : anchor === "end" ? [-width, 0] : [0, width];
      const transform = attr(node, "transform");
      if (transform === undefined) return { x0: x + along0, y0: y - 0.8 * size, x1: x + along1, y1: y + 0.2 * size, node };
      const turn = ROTATE.exec(String(transform));
      if (turn === null || Number(turn[1]) !== -90 || Number(turn[2]) !== x || Number(turn[3]) !== y) {
        throw new Error(`unexpected transform ${String(transform)} on text at ${x},${y}`);
      }
      // rotate(-90) about the anchor turns (dx, dy) into (dy, −dx).
      return { x0: x - 0.8 * size, y0: y - along1, x1: x + 0.2 * size, y1: y - along0, node };
    }
    default:
      throw new Error(`no bounds for a ${node.kind}`);
  }
}

/** Two boxes overlapping by more than rounding to the 0.01 grid. */
export const overlap = (a: Bounds, b: Bounds): boolean =>
  Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0.02 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0.02;

/** A short name for a node in a test message. */
export const nameOf = (b: Bounds): string =>
  b.node.kind === "text" ? `text "${b.node.text.slice(0, 20)}"` : `${b.node.kind} at ${b.x0.toFixed(2)},${b.y0.toFixed(2)}`;

/**
 * A data graph's value axis, read from the drawing: the first axis-width line, which `drawValueAxis`
 * draws first. `from` is its minimum end, `to` its maximum end, along y when upright.
 */
export function valueAxisOf(scene: Scene): { from: number; to: number; vertical: boolean } {
  const axis = scene.nodes.find((node) => node.kind === "line" && attr(node, "stroke-width") === defaultStyle.lineWidths.axis)!;
  const vertical = attr(axis, "x1") === attr(axis, "x2");
  return vertical ? { from: num(axis, "y2"), to: num(axis, "y1"), vertical } : { from: num(axis, "x1"), to: num(axis, "x2"), vertical };
}

/** The value axis's tick labels: its numeric texts anchored as the axis anchors them (end when upright, middle when across). */
export function tickLabelNodes(scene: Scene): SceneNode[] {
  const { vertical } = valueAxisOf(scene);
  return scene.nodes.filter((node) => node.kind === "text" && attr(node, "transform") === undefined && /^-?[\d.]+$/.test(node.text) && attr(node, "text-anchor") === (vertical ? "end" : "middle"));
}

/**
 * Each tick's value and its position along the value axis (y when upright, x when across): a tick
 * label's number, paired with the tick line level with it. Numeric texts with no tick beside them,
 * such as value labels, are left out.
 */
export function ticksOf(scene: Scene): Array<{ value: number; at: number }> {
  const { vertical } = valueAxisOf(scene);
  const marks = scene.nodes.filter((node) => node.kind === "line" && attr(node, "stroke-width") === defaultStyle.lineWidths.tick);
  return tickLabelNodes(scene).flatMap((label) => {
    if (label.kind !== "text") return [];
    const at = vertical ? num(label, "y") - defaultStyle.fontSizes.tickLabel * TICK_LABEL_DROP : num(label, "x");
    const mark = marks.find((line) => Math.abs((vertical ? num(line, "y1") : num(line, "x1")) - at) < 0.02);
    return mark === undefined ? [] : [{ value: Number(label.text), at }];
  });
}

/** Where `value` is drawn along the value axis, read off its first and last ticks. */
export function positionOf(scene: Scene, value: number): number {
  const all = ticksOf(scene);
  const [low, high] = [all[0]!, all.at(-1)!];
  return low.at + ((value - low.value) * (high.at - low.at)) / (high.value - low.value);
}


// Figure geometry for the geometric shapes and solids' proportion and overlap tests (graph-library
// GSS TICKET-008): drawn lengths, the points of every figure node, label boxes rebuilt from text
// nodes, and the figure's lines as obstacles. Estimated text boxes only, no DOM measurement.

const numbersIn = (text: string): number[] => (text.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);

/** The length of a `line` node's drawn segment. */
const lengthOfLine = (node: SceneNode): number => Math.hypot(finite(node, "x2") - finite(node, "x1"), finite(node, "y2") - finite(node, "y1"));

/** A `line` node as a segment. */
export const segmentOfLine = (node: SceneNode): Segment => ({ x1: finite(node, "x1"), y1: finite(node, "y1"), x2: finite(node, "x2"), y2: finite(node, "y2") });

/** The drawn length of every `line` node of a Scene, in drawing order. */
export const lineLengths = (scene: Scene): number[] => scene.nodes.filter((node) => node.kind === "line").map(lengthOfLine);

/** The drawn length of each side of a closed polygon, from corner i to corner i + 1. */
export function polygonSides(node: SceneNode): number[] {
  const corners = pointsOf(node);
  return corners.map(([x, y], i) => Math.hypot(corners[(i + 1) % corners.length]![0] - x, corners[(i + 1) % corners.length]![1] - y));
}

/** An elliptical arc `path` as the layout writes it: `M sx cy A rx ry 0 0 1 ex cy`. */
export function arcOfPath(node: SceneNode): { sx: number; ex: number; cy: number; rx: number; ry: number } {
  const [sx, cy, rx, ry, , , , ex] = numbersIn(String(attr(node, "d")));
  if (sx === undefined || cy === undefined || rx === undefined || ry === undefined || ex === undefined) throw new Error(`not an arc path: ${String(attr(node, "d"))}`);
  allFinite([sx, cy, rx, ry, ex], "path");
  return { sx, ex, cy, rx, ry };
}

/**
 * Every point a node draws at, for fitting a Scene to its viewBox: a shape's corners, a line's ends,
 * the four extremes of a circle or ellipse, and the ends and the far point of an arc path.
 */
export function drawnPoints(node: SceneNode): Array<[number, number]> {
  switch (node.kind) {
    case "polygon":
    case "polyline":
      return pointsOf(node);
    case "line":
      return [
        [finite(node, "x1"), finite(node, "y1")],
        [finite(node, "x2"), finite(node, "y2")],
      ];
    case "circle":
    case "ellipse": {
      const [cx, cy] = [finite(node, "cx"), finite(node, "cy")];
      const [rx, ry] = node.kind === "circle" ? [finite(node, "r"), finite(node, "r")] : [finite(node, "rx"), finite(node, "ry")];
      return [[cx - rx, cy], [cx + rx, cy], [cx, cy - ry], [cx, cy + ry]];
    }
    case "path": {
      const { sx, ex, cy, rx, ry } = arcOfPath(node);
      const back = sx < ex;
      return [[sx, cy], [ex, cy], [(sx + ex) / 2, back ? cy - ry : cy + ry], [(sx + ex) / 2 - rx, cy], [(sx + ex) / 2 + rx, cy]];
    }
    default:
      // A kind this check cannot read must fail it, not be skipped (security review SEC-001).
      throw new Error(`drawnPoints cannot read a ${node.kind} node`);
  }
}

/**
 * Which text box to use: `boundsOf` for any node's bounds (the viewBox checks and the older per-type
 * tests; for a text it is the glyph extent). `labelBoxOf` for a label line's estimated box, as the
 * layout reserves it (the full line height), shrunk for rounding, for the overlap checks.
 *
 * The estimated box of a text node as the layout reserved it (centered on its anchor), shrunk by `fmt()`'s 0.01 rounding step on every side.
 */
export function labelBoxOf(node: SceneNode): Box {
  if (node.kind !== "text") throw new Error(`not a text node: ${node.kind}`);
  const size = finite(node, "font-size");
  if (attr(node, "text-anchor") !== "middle") throw new Error(`label "${node.text}" is not centered on its anchor`);
  const lineHeight = size * LINE_HEIGHT;
  const width = textWidth(node.text, size);
  return { x: finite(node, "x") - width / 2 + 0.01, y: finite(node, "y") - size * 0.8 - (lineHeight - size) / 2 + 0.01, width: width - 0.02, height: lineHeight - 0.02 };
}

/**
 * The box around everything the nodes of the given kinds draw (`drawnPoints`): the extent of a
 * figure's outline, for checking that it fills the frame it is scaled to (GSS-REQ-031).
 */
export function extentOf(scene: Scene, kinds: ReadonlyArray<SceneNode["kind"]>): { width: number; height: number } {
  const box = around(
    scene.nodes.filter((node) => kinds.includes(node.kind)).flatMap(drawnPoints),
    scene.nodes[0]!,
  );
  return { width: box.x1 - box.x0, height: box.y1 - box.y0 };
}

const ROUND_PIECES = 360;
/** An ellipse (a half, from angle `from` to `to`, y down) as short segments. */
function curve(cx: number, cy: number, rx: number, ry: number, from: number, to: number, pieces: number): Segment[] {
  return Array.from({ length: pieces }, (_, i) => {
    const a = from + ((to - from) * i) / pieces;
    const b = from + ((to - from) * (i + 1)) / pieces;
    return { x1: cx + rx * Math.cos(a), y1: cy + ry * Math.sin(a), x2: cx + rx * Math.cos(b), y2: cy + ry * Math.sin(b) };
  });
}

/** Every drawn figure line of a Scene as an obstacle: lines, polygon and polyline sides, circles and ellipses, and base arcs. */
export function figureLines(scene: Scene): Segment[] {
  const found: Segment[] = [];
  for (const node of scene.nodes) {
    switch (node.kind) {
      case "line":
        found.push(segmentOfLine(node));
        break;
      case "polygon":
      case "polyline": {
        const corners = pointsOf(node);
        const count = node.kind === "polygon" ? corners.length : corners.length - 1;
        for (let i = 0; i < count; i++) {
          const [p, q] = [corners[i]!, corners[(i + 1) % corners.length]!];
          found.push({ x1: p[0], y1: p[1], x2: q[0], y2: q[1] });
        }
        break;
      }
      case "circle":
        found.push(...curve(finite(node, "cx"), finite(node, "cy"), finite(node, "r"), finite(node, "r"), 0, 2 * Math.PI, ROUND_PIECES));
        break;
      case "ellipse":
        found.push(...curve(finite(node, "cx"), finite(node, "cy"), finite(node, "rx"), finite(node, "ry"), 0, 2 * Math.PI, ROUND_PIECES));
        break;
      case "path": {
        const { sx, ex, cy, rx, ry } = arcOfPath(node);
        // The back half runs left to right over the top (angles π to 2π, y down), the front half right to left under the bottom.
        found.push(...(sx < ex ? curve((sx + ex) / 2, cy, rx, ry, Math.PI, 2 * Math.PI, ROUND_PIECES / 2) : curve((sx + ex) / 2, cy, rx, ry, 0, Math.PI, ROUND_PIECES / 2)));
        break;
      }
      case "text":
        // Labels, not figure lines.
        break;
      default:
        // A kind this check cannot read must fail it, not be skipped (security review SEC-001).
        throw new Error(`figureLines cannot read a ${node.kind} node`);
    }
  }
  return found;
}

/** Two boxes sharing area: their interiors intersect with positive width and height (touching edges do not count). */
const boxesOverlap = (a: Box, b: Box): boolean =>
  Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 0 && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 0;

/**
 * Whether a segment passes through the inside of a box for a positive length. The segment is clipped
 * to the box's four sides (Liang-Barsky); it crosses the inside if the clipped piece has length and
 * its middle is strictly inside. A segment that only touches a corner or runs along a side does not.
 */
function segmentCrosses(s: Segment, box: Box): boolean {
  const [dx, dy] = [s.x2 - s.x1, s.y2 - s.y1];
  let [t0, t1] = [0, 1];
  const clips: Array<[number, number]> = [
    [-dx, s.x1 - box.x],
    [dx, box.x + box.width - s.x1],
    [-dy, s.y1 - box.y],
    [dy, box.y + box.height - s.y1],
  ];
  for (const [p, q] of clips) {
    if (p === 0) {
      if (q < 0) return false; // parallel to this side and outside it
    } else if (p < 0) t0 = Math.max(t0, q / p);
    else t1 = Math.min(t1, q / p);
  }
  if (!(t1 - t0 > 1e-9)) return false;
  const [mx, my] = [s.x1 + dx * ((t0 + t1) / 2), s.y1 + dy * ((t0 + t1) / 2)];
  return mx > box.x && mx < box.x + box.width && my > box.y && my < box.y + box.height;
}

/**
 * Every text line of a Scene that overlaps another text line or a figure line, by its estimated box
 * (GSS-NFR-003). The metrics are the layout's estimates (`textWidth`, `LINE_HEIGHT`, as AD-010
 * requires); the overlap logic is this file's own, so it does not share a defect with the layout's
 * `placeLabel`: box against box by interior intersection, segment against box by clipping.
 */
export function labelOverlaps(scene: Scene): string[] {
  const found: string[] = [];
  const texts = scene.nodes.filter((node): node is Extract<SceneNode, { kind: "text" }> => node.kind === "text");
  const boxes = texts.map(labelBoxOf);
  const lines = figureLines(scene);
  boxes.forEach((box, i) => {
    const onLabel = boxes.some((other, j) => j !== i && boxesOverlap(box, other));
    if (onLabel || lines.some((line) => segmentCrosses(line, box))) found.push(texts[i]!.text.slice(0, 40));
  });
  return found;
}

/** Every drawn point or text box of a Scene that lies outside its viewBox (0..width, 0..height). */
export function outsideViewBox(scene: Scene): string[] {
  const found: string[] = [];
  for (const node of scene.nodes) {
    if (node.kind === "text") {
      const box = labelBoxOf(node);
      if (box.x < 0 || box.y < 0 || box.x + box.width > scene.width || box.y + box.height > scene.height) found.push(`text "${node.text.slice(0, 20)}"`);
      continue;
    }
    for (const [x, y] of drawnPoints(node)) if (x < 0 || y < 0 || x > scene.width || y > scene.height) found.push(`${node.kind} at ${x},${y}`);
  }
  return found;
}
