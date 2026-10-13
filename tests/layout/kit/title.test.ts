import { describe, expect, it } from "vitest";
import { defaultStyle } from "../../../src/core/style";
import { LINE_HEIGHT, SCENE_MARGIN, TITLE_MAX_LINES, textLines, titleBlock } from "../../../src/layout/kit/title";
import { DEFAULT_FONT_STACK, textWidth } from "../../../src/layout/kit/text";
import { SCENE_WIDTH, type SceneNode } from "../../../src/layout/scene";

const attr = (node: SceneNode, name: string) => node.attrs.find(([key]) => key === name)?.[1];
const textOf = (node: SceneNode) => (node.kind === "text" ? node.text : "");

describe("textLines: stacked, centered lines of text (GSS TICKET-002 DEL-004; quality review QR-002)", () => {
  it("makes one centered text node per line, in the given font, size, color and weight", () => {
    const nodes = textLines(["first", "second"], 120, 10, 14, "#222222", "bold");
    expect(nodes.map(textOf)).toEqual(["first", "second"]);
    for (const node of nodes) {
      expect(node.kind).toBe("text");
      expect(attr(node, "x")).toBe(120);
      expect(attr(node, "text-anchor")).toBe("middle");
      expect(attr(node, "font-family")).toBe(DEFAULT_FONT_STACK);
      expect(attr(node, "font-size")).toBe(14);
      expect(attr(node, "fill")).toBe("#222222");
      expect(attr(node, "font-weight")).toBe("bold");
    }
  });

  it("has no font weight unless one is given", () => {
    const [node] = textLines(["plain"], 0, 0, 14, "#222222");
    expect(node!.attrs.some(([key]) => key === "font-weight")).toBe(false);
  });

  it("spaces consecutive lines LINE_HEIGHT × the font size apart, the first baseline about 0.8 em into its line", () => {
    const fontSize = 20;
    const lineHeight = fontSize * LINE_HEIGHT;
    const ys = textLines(["a", "b", "c"], 0, 50, fontSize, "#000000").map((node) => Number(attr(node, "y")));
    expect(ys[0]).toBeCloseTo(50 + (lineHeight - fontSize) / 2 + fontSize * 0.8, 2);
    expect(ys[1]! - ys[0]!).toBeCloseTo(lineHeight, 2);
    expect(ys[2]! - ys[1]!).toBeCloseTo(lineHeight, 2);
  });
});

describe("titleBlock: the shared title above a graph (GSV-REQ-040; quality review QR-002)", () => {
  it.each([undefined, "", "   ", "   "])("draws nothing and takes no height for %j", (title) => {
    expect(titleBlock(title)).toEqual({ nodes: [], height: 0 });
  });

  it("draws a short title as one bold line centered on the drawing, below the margin", () => {
    const { nodes, height } = titleBlock("  Wheel ");
    const fontSize = defaultStyle.fontSizes.title;
    expect(nodes.map(textOf)).toEqual(["Wheel"]);
    expect(attr(nodes[0]!, "x")).toBe(SCENE_WIDTH / 2);
    expect(attr(nodes[0]!, "font-weight")).toBe("bold");
    expect(attr(nodes[0]!, "font-size")).toBe(fontSize);
    expect(height).toBeCloseTo(SCENE_MARGIN + fontSize * LINE_HEIGHT, 6);
    expect(Number(attr(nodes[0]!, "y"))).toBeGreaterThan(SCENE_MARGIN);
  });

  it("wraps a long title within the drawing's side margins, and takes the height of every line", () => {
    const title = "How far does the wheel travel in one full turn along the ground, in centimetres?";
    const { nodes, height } = titleBlock(title);
    const fontSize = defaultStyle.fontSizes.title;
    expect(nodes.length).toBeGreaterThan(1);
    expect(nodes.map(textOf).join(" ")).toBe(title);
    for (const node of nodes) {
      expect(attr(node, "x")).toBe(SCENE_WIDTH / 2);
      expect(attr(node, "font-weight")).toBe("bold");
      expect(textWidth(textOf(node), fontSize)).toBeLessThanOrEqual(SCENE_WIDTH - 2 * SCENE_MARGIN);
    }
    expect(height).toBeCloseTo(SCENE_MARGIN + nodes.length * fontSize * LINE_HEIGHT, 6);
  });

  it("draws at most TITLE_MAX_LINES lines, the last ending in an ellipsis (security review SEC-001)", () => {
    const { nodes, height } = titleBlock("A very long title about circles ".repeat(5_000));
    const fontSize = defaultStyle.fontSizes.title;
    expect(nodes).toHaveLength(TITLE_MAX_LINES);
    expect(textOf(nodes[TITLE_MAX_LINES - 1]!).endsWith("…")).toBe(true);
    expect(height).toBeCloseTo(SCENE_MARGIN + TITLE_MAX_LINES * fontSize * LINE_HEIGHT, 6);
  });
});
