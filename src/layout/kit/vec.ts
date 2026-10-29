/**
 * Plane vectors for the figure layouts, in drawing units: the triangle's and the cube's (GSS
 * TICKET-006 quality review QR-001). Nothing here is rounded; `fmt()` rounds once, when a value is
 * written into a Scene.
 */

/** A point or a direction in the drawing. */
export type Vec = readonly [number, number];

export const add = (p: Vec, q: Vec): Vec => [p[0] + q[0], p[1] + q[1]];
export const sub = (p: Vec, q: Vec): Vec => [p[0] - q[0], p[1] - q[1]];
export const times = (p: Vec, k: number): Vec => [p[0] * k, p[1] * k];
export const dot = (p: Vec, q: Vec) => p[0] * q[0] + p[1] * q[1];
export const cross = (p: Vec, q: Vec) => p[0] * q[1] - p[1] * q[0];
export const length = (p: Vec) => Math.hypot(p[0], p[1]);
export const rotate = (p: Vec, angle: number): Vec => [p[0] * Math.cos(angle) - p[1] * Math.sin(angle), p[0] * Math.sin(angle) + p[1] * Math.cos(angle)];

/** `p` scaled to length 1, or `fallback` when it has no length: never a division by zero. */
export function unit(p: Vec, fallback: Vec): Vec {
  const n = length(p);
  return n > 0 && Number.isFinite(n) ? [p[0] / n, p[1] / n] : fallback;
}
