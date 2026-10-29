import { describe, expect, it } from "vitest";
import { defaultStyle } from "../../../src/core/style";
import {
  GAP,
  LABEL_MAX_LINES,
  LABEL_MAX_WIDTH,
  besideHorizontal,
  besideVertical,
  labelSize,
  placeLabels,
  segmentNode,
  type Bounds,
} from "../../../src/layout/kit/figure-labels";
import { type Obstacle } from "../../../src/layout/kit/labels";
import { textWidth } from "../../../src/layout/kit/text";
import { LINE_HEIGHT } from "../../../src/layout/kit/title";
import type { SceneNode } from "../../../src/layout/scene";

const fontSize = defaultStyle.fontSizes.label;
const bounds: Bounds = { left: 0, top: 0, right: 400, bottom: 300 };
const attr = (node: SceneNode, name: string) => node.attrs.find(([key]) => key === name)?.[1];

describe("labelSize", () => {
  it("measures one line by its width and the line height", () => {
    const size = labelSize("5 cm", fontSize);
    expect(size.lines).toEqual(["5 cm"]);
    expect(size.width).toBe(textWidth("5 cm", fontSize));
    expect(size.height).toBe(fontSize * LINE_HEIGHT);
  });

  it("wraps at the label width and cuts at the line cap, ending in an ellipsis", () => {
    const size = labelSize("word ".repeat(200), fontSize);
    expect(size.lines).toHaveLength(LABEL_MAX_LINES);
    expect(size.lines.at(-1)!.endsWith("…")).toBe(true);
    expect(size.width).toBeLessThanOrEqual(LABEL_MAX_WIDTH + 1);
  });

  it("takes text of any length without spreading it into arguments", () => {
    expect(() => labelSize("a".repeat(500_000), fontSize)).not.toThrow();
  });
});

describe("candidates beside a segment", () => {
  const size = { width: 20, height: 10 };

  it("puts them above then below a horizontal segment, centered on each x", () => {
    expect(besideHorizontal([50, 80], 100, size)).toEqual([
      { x: 40, y: 100 - GAP - 10 },
      { x: 40, y: 100 + GAP },
      { x: 70, y: 100 - GAP - 10 },
      { x: 70, y: 100 + GAP },
    ]);
  });

  it("puts them left then right of a vertical segment, centered on each y", () => {
    expect(besideVertical(100, [50], size)).toEqual([
      { x: 100 - GAP - 20, y: 45 },
      { x: 100 + GAP, y: 45 },
    ]);
  });
});

describe("segmentNode", () => {
  it("is a stroked line in the given color", () => {
    const node = segmentNode({ x1: 1, y1: 2, x2: 3, y2: 4 }, "#123456");
    expect(node.kind).toBe("line");
    expect([attr(node, "x1"), attr(node, "y2"), attr(node, "stroke")]).toEqual([1, 4, "#123456"]);
  });
});

describe("placeLabels (AD-010, DEL-006)", () => {
  const at = (x: number, y: number) => () => [{ x, y }];

  it("places a label at its first clear candidate inside the bounds, and adds its box as an obstacle", () => {
    const obstacles: Obstacle[] = [];
    const { nodes, bottom } = placeLabels([{ text: "5", candidates: () => [{ x: -50, y: 10 }, { x: 100, y: 10 }] }], obstacles, bounds, 200);
    expect(nodes).toHaveLength(1);
    expect(bottom).toBe(200);
    expect(obstacles).toHaveLength(1);
    expect(obstacles[0]).toMatchObject({ y: 10 });
    expect((obstacles[0] as { x: number }).x).toBe(100);
  });

  it("clears the boxes it placed earlier", () => {
    const obstacles: Obstacle[] = [];
    placeLabels([{ text: "5 cm", candidates: at(100, 10) }, { text: "5 cm", candidates: () => [{ x: 100, y: 10 }, { x: 100, y: 100 }] }], obstacles, bounds, 200);
    expect((obstacles[1] as { y: number }).y).toBe(100);
  });

  it("stacks a label with no clear place below the stack top, centered, and reports the new bottom", () => {
    const obstacles: Obstacle[] = [{ x: 0, y: 0, width: 400, height: 300 }];
    const { nodes, bottom } = placeLabels([{ text: "a", candidates: at(10, 10) }, { text: "b", candidates: at(10, 10) }], obstacles, bounds, 200);
    const height = fontSize * LINE_HEIGHT;
    expect(nodes.map((node) => (node as { text: string }).text)).toEqual(["a", "b"]);
    expect(nodes.map((node) => attr(node, "x"))).toEqual([200, 200]);
    expect(bottom).toBeCloseTo(200 + 2 * (GAP + height), 9);
    expect(obstacles).toHaveLength(1);
  });

  it("stacks a label whose candidates all lie outside the bounds", () => {
    const { bottom } = placeLabels([{ text: "a", candidates: at(390, 10) }], [], { ...bounds, right: 395 }, 200);
    expect(bottom).toBeGreaterThan(200);
  });

  it("draws nothing for a blank label", () => {
    expect(placeLabels([{ text: "", candidates: at(10, 10) }], [], bounds, 200)).toEqual({ nodes: [], bottom: 200 });
  });

  it("returns the stack top when there are no labels", () => {
    expect(placeLabels([], [], bounds, 123)).toEqual({ nodes: [], bottom: 123 });
  });

  it("places many labels without spreading, however many", () => {
    const requests = Array.from({ length: 70_000 }, () => ({ text: "", candidates: at(0, 0) }));
    expect(() => placeLabels(requests, [], bounds, 0)).not.toThrow();
  });
});
