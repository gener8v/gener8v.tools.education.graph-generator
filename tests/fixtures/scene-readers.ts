import { defaultStyle } from "../../src/core/style";
import type { Scene, SceneNode } from "../../src/layout/scene";
import { attr, num } from "./scene-geometry";
import { expect } from "vitest";

// Readers for the nodes of a Scene, shared by the tests that read drawn positions (graph-library
// NLC TICKET-005 quality review QR-003). `attr` and `num` are scene-geometry's.
export { attr, num };

export const lines = (scene: Scene): SceneNode[] => scene.nodes.filter((node) => node.kind === "line");
export const circles = (scene: Scene): SceneNode[] => scene.nodes.filter((node) => node.kind === "circle");
export const lengthOf = (node: SceneNode): number => Math.hypot(num(node, "x2") - num(node, "x1"), num(node, "y2") - num(node, "y1"));

/** A tick mark is no longer than the style's tick length; axes and figure lines are far longer or wider. */
export const isTick = (node: SceneNode): boolean => node.kind === "line" && node.attrs.some(([key, value]) => key === "stroke-width" && Number(value) === defaultStyle.lineWidths.tick) && lengthOf(node) <= defaultStyle.tickLength + 0.02;

/** Fails when a drawn number is not within `tolerance` of the computed one, naming both. */
export const near = (got: number, want: number, what: string, tolerance: number): void => {
  expect(Math.abs(got - want), `${what}: drawn ${got}, computed ${want}`).toBeLessThanOrEqual(tolerance);
};
