import { fmt } from "../layout/kit/format";
import type { ShapeNode, SvgAttr } from "../layout/scene";

/** Who drew the initial image set, and how (DGP TICKET-004; Product Owner sign-off pending, EXT-001). */
export const IN_HOUSE = Object.freeze({
  license: "MIT",
  author: "gener8v",
  provenance: "Drawn in-house for this package from basic shapes, 2026-10-14.",
} as const);

/**
 * A Scene shape for an image, with every number passed through `fmt()` (AD-007) and every string
 * attribute kept as written: colors, and `d` or `points` values written with whole numbers.
 */
export function shape(kind: ShapeNode["kind"], attrs: ReadonlyArray<readonly [SvgAttr, number | string]>): ShapeNode {
  return { kind, attrs: attrs.map(([name, value]) => [name, typeof value === "number" ? fmt(value) : value] as const) };
}

/** `count` points evenly around (`cx`, `cy`), starting straight up, alternating `outer` and `inner` radii when `inner` is given. */
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
