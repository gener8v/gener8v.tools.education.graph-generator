import { describe, expect, it } from "vitest";
import { type MarkerShape, defaultStyle, seriesStyles } from "../../../src/core/style";
import { MARKER_REACH, drawMarker } from "../../../src/layout/kit/markers";
import { checkScene } from "../../../src/layout/kit/check";
import { fmt } from "../../../src/layout/kit/format";
import { SCENE_WIDTH } from "../../../src/layout/scene";
import { boundsOf } from "../../fixtures/scene-geometry";

const SHAPES: MarkerShape[] = ["circle", "square", "triangle", "diamond", "cross", "star"];

describe("point markers (DGP-REQ-012, DGP-REQ-014, AD-008, AD-011)", () => {
  it("draws every series style's shape as a plain filled shape, with no <marker> or id", () => {
    expect(seriesStyles.map((style) => style.marker)).toEqual(SHAPES);
    for (const shape of SHAPES) {
      const node = drawMarker(shape, 100.123, 50.456, "#123456");
      expect(["circle", "polygon"], shape).toContain(node.kind);
      expect(node.attrs.find(([key]) => key === "fill")?.[1]).toBe("#123456");
      expect(checkScene({ width: SCENE_WIDTH, height: fmt(100), textAlternative: "A marker.", nodes: [node] }), shape).toEqual([]);
    }
  });

  it("keeps every shape within MARKER_REACH of its point, and each at least half that far, so all read about the same size", () => {
    for (const shape of SHAPES) {
      const b = boundsOf(drawMarker(shape, 100, 50, "#000000"));
      const reach = Math.max(100 - b.x0, b.x1 - 100, 50 - b.y0, b.y1 - 50);
      expect(reach, shape).toBeLessThanOrEqual(MARKER_REACH + 0.01);
      expect(reach, shape).toBeGreaterThanOrEqual(MARKER_REACH / 2);
    }
    expect(MARKER_REACH).toBe((defaultStyle.markerSize / 2) * 1.5);
  });

  it("gives each shape a different outline", () => {
    const outlines = SHAPES.map((shape) => JSON.stringify(drawMarker(shape, 0, 0, "#000000").attrs.filter(([key]) => key !== "fill")));
    expect(new Set(outlines).size).toBe(SHAPES.length);
  });
});
