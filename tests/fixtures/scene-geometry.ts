import { textWidth } from "../../src/layout/kit/text";
import type { SceneNode } from "../../src/layout/scene";

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
const num = (node: SceneNode, name: string) => Number(attr(node, name));

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
    .map((pair) => pair.split(",").map(Number) as [number, number]);

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
