import { fmt, fmtPoints } from "../layout/kit/format";

// Every helper here is marked `@__NO_SIDE_EFFECTS__`, so a bundler drops the calls in an image module
// that nothing reads, and importing a type or a constant from the images bundles no drawing
// (quality review QR-006).
import type { ShapeNode, SvgAttr } from "../layout/scene";

/**
 * A Scene shape for an image, with every number passed through `fmt()` (AD-007) and every string
 * attribute kept as written: colors, and `d` or `points` values written with whole numbers.
 */
/* @__NO_SIDE_EFFECTS__ */
export function shape(kind: ShapeNode["kind"], attrs: ReadonlyArray<readonly [SvgAttr, number | string]>): ShapeNode {
  return { kind, attrs: attrs.map(([name, value]) => [name, typeof value === "number" ? fmt(value) : value] as const) };
}

/** `count` points evenly around (`cx`, `cy`), starting straight up, alternating `outer` and `inner` radii when `inner` is given. */
/* @__NO_SIDE_EFFECTS__ */
export function ring(cx: number, cy: number, count: number, outer: number, inner?: number): Array<readonly [number, number]> {
  const points: Array<readonly [number, number]> = [];
  const steps = inner === undefined ? count : count * 2;
  for (let i = 0; i < steps; i++) {
    const radius = inner !== undefined && i % 2 === 1 ? inner : outer;
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / steps;
    points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
  }
  return points;
}

/** A `points` value for a polygon, every coordinate through `fmt()`. */
/* @__NO_SIDE_EFFECTS__ */
export function points(list: ReadonlyArray<readonly [number, number]>): string {
  return fmtPoints(list);
}

/** `count` circles of radius `r` evenly around (`cx`, `cy`) at `distance`, starting straight up: petals. */
/* @__NO_SIDE_EFFECTS__ */
export function circlesAround(cx: number, cy: number, count: number, distance: number, r: number, fill: string): ShapeNode[] {
  return ring(cx, cy, count, distance).map(([x, y]) =>
    shape("circle", [
      ["cx", x],
      ["cy", y],
      ["r", r],
      ["fill", fill],
    ]),
  );
}
