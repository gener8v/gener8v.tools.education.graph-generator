import { cleanText } from "../../core/format";
import { defaultStyle } from "../../core/style";
import { SCENE_WIDTH, type SceneNode } from "../scene";
import { fmt } from "./format";
import { DEFAULT_FONT_STACK, wrap } from "./text";

/** Space kept between the drawing's edge and anything in it, in drawing units. */
export const SCENE_MARGIN = 16;

/** Line spacing for every multi-line text, as a multiple of the font size. */
export const LINE_HEIGHT = 1.2;

/**
 * Text nodes for `lines`, one per line, centered on `centerX` and stacked from `top` (SVG text does
 * not wrap; prd/TC-011). The baseline sits at about four fifths of the font size below each line's
 * top, the usual ascent of the system sans-serif fonts (AD-010).
 */
export function textLines(
  lines: readonly string[],
  centerX: number,
  top: number,
  fontSize: number,
  color: string,
  weight?: "bold",
): SceneNode[] {
  const lineHeight = fontSize * LINE_HEIGHT;
  return lines.map((line, i) => ({
    kind: "text",
    attrs: [
      ["x", fmt(centerX)],
      ["y", fmt(top + i * lineHeight + (lineHeight - fontSize) / 2 + fontSize * 0.8)],
      ["fill", color],
      ["font-family", DEFAULT_FONT_STACK],
      ["font-size", fmt(fontSize)],
      ...(weight === undefined ? [] : ([["font-weight", weight]] as const)),
      ["text-anchor", "middle"],
    ],
    text: line,
  }));
}

/**
 * The shared title above a graph (GSV-REQ-040): the title wrapped to the drawing's width and
 * centered, with the height it takes, margin included. No title, or one that is blank once
 * cleaned, takes no height.
 */
export function titleBlock(title: string | undefined): { nodes: SceneNode[]; height: number } {
  const text = title === undefined ? "" : cleanText(title);
  if (text === "") return { nodes: [], height: 0 };
  const fontSize = defaultStyle.fontSizes.title;
  const lines = wrap(text, SCENE_WIDTH - 2 * SCENE_MARGIN, fontSize);
  return {
    nodes: textLines(lines, SCENE_WIDTH / 2, SCENE_MARGIN, fontSize, defaultStyle.colors.text, "bold"),
    height: SCENE_MARGIN + lines.length * fontSize * LINE_HEIGHT,
  };
}
