import { type MarkerShape, defaultStyle } from "../../core/style";
import type { SceneNode } from "../scene";
import { fmt, fmtPoints } from "./format";

/**
 * How far any marker reaches from its point, at the default size: the star's points, the farthest
 * of the shapes, reach 1.5 × half the size. A layout leaves this much room around a plot whose
 * points may sit on its edge.
 */
export const MARKER_REACH = (defaultStyle.markerSize / 2) * 1.5;

/**
 * A point marker of `shape` centered on (`x`, `y`), filled with `color` and about `size` across
 * (`defaultStyle.markerSize` by default). Each shape is its own Scene shape, never an SVG
 * `<marker>` with an id (AD-008), so series differ by shape without color (AD-011, prd/CC-002).
 * The shapes have about the same visual weight, so none reads as a larger value.
 */
// @spec DGP-REQ-012, DGP-REQ-014
export function drawMarker(shape: MarkerShape, x: number, y: number, color: string, size: number = defaultStyle.markerSize): SceneNode {
  const r = size / 2;
  const polygon = (corners: ReadonlyArray<readonly [number, number]>): SceneNode => ({
    kind: "polygon",
    attrs: [
      ["points", fmtPoints(corners.map(([dx, dy]) => [x + dx, y + dy] as const))],
      ["fill", color],
    ],
  });
  switch (shape) {
    case "circle":
      return {
        kind: "circle",
        attrs: [
          ["cx", fmt(x)],
          ["cy", fmt(y)],
          ["r", fmt(r * 1.1)],
          ["fill", color],
        ],
      };
    case "square":
      return polygon([
        [-r, -r],
        [r, -r],
        [r, r],
        [-r, r],
      ]);
    case "triangle":
      return polygon([
        [0, -r * 1.3],
        [r * 1.2, r * 0.8],
        [-r * 1.2, r * 0.8],
      ]);
    case "diamond":
      return polygon([
        [0, -r * 1.35],
        [r * 1.35, 0],
        [0, r * 1.35],
        [-r * 1.35, 0],
      ]);
    case "cross": {
      // A plus sign as one outline, so it fills like the others.
      const [a, b] = [r * 0.4, r * 1.3];
      return polygon([
        [-a, -b],
        [a, -b],
        [a, -a],
        [b, -a],
        [b, a],
        [a, a],
        [a, b],
        [-a, b],
        [-a, a],
        [-b, a],
        [-b, -a],
        [-a, -a],
      ]);
    }
    case "star": {
      const corners: Array<readonly [number, number]> = [];
      for (let i = 0; i < 10; i++) {
        const angle = -Math.PI / 2 + (i * Math.PI) / 5;
        const radius = i % 2 === 0 ? r * 1.5 : r * 0.65;
        corners.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
      }
      return polygon(corners);
    }
  }
}
