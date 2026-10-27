import { cleanText } from "../../core/format";
import { defaultStyle } from "../../core/style";
import { SCENE_WIDTH, type SceneNode } from "../scene";
import { fmt } from "./format";
import { DEFAULT_FONT_STACK, textWidth, wrap } from "./text";

/** Space kept between the drawing's edge and anything in it, in drawing units. */
export const SCENE_MARGIN = 16;

/** Line spacing for every multi-line text, as a multiple of the font size. */
export const LINE_HEIGHT = 1.2;

/**
 * How far below the top of a line of text its baseline sits, as a share of the font size: about
 * four fifths, the usual ascent of the system sans-serif fonts (AD-010). The one value for every
 * text the kit writes from its top (quality review QR-006 on NLC TICKET-003).
 */
export const BASELINE = 0.8;

/**
 * Text nodes for `lines`, one per line, centered on `centerX` and stacked from `top` (SVG text does
 * not wrap; prd/TC-011). The baseline sits `BASELINE` of the font size below the top of each line's
 * glyphs, which are centered in the line's height (AD-010).
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
      ["y", fmt(top + i * lineHeight + (lineHeight - fontSize) / 2 + fontSize * BASELINE)],
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
 * A title longer than this many lines is cut, ending in "…", so caller-sized text yields a bounded
 * Scene; the text alternative still states it whole (GSS TICKET-002 security review SEC-001, DEL-008).
 */
export const TITLE_MAX_LINES = 3;

/**
 * `text` broken into at most `maxLines` lines no wider than `maxWidth`, with the size of its box:
 * the widest line's estimated width, and the lines' height (quality review QR-005).
 */
export function textBlock(text: string, maxWidth: number, fontSize: number, maxLines: number): { lines: string[]; width: number; height: number } {
  const lines = wrap(text, maxWidth, fontSize, maxLines);
  // A loop, not `Math.max(...)`: never spread a caller-sized array into arguments (GSS TICKET-002 SEC-001).
  let width = 0;
  for (const line of lines) width = Math.max(width, textWidth(line, fontSize));
  return { lines, width, height: lines.length * fontSize * LINE_HEIGHT };
}

/**
 * The shared title above a graph (GSV-REQ-040): the title wrapped to the drawing's width, at most
 * `TITLE_MAX_LINES` lines, and centered, with the height it takes, margin included. No title, or
 * one that is blank once cleaned, takes no height.
 */
export function titleBlock(title: string | undefined): { nodes: SceneNode[]; height: number } {
  const text = title === undefined ? "" : cleanText(title);
  if (text === "") return { nodes: [], height: 0 };
  const fontSize = defaultStyle.fontSizes.title;
  const lines = wrap(text, SCENE_WIDTH - 2 * SCENE_MARGIN, fontSize, TITLE_MAX_LINES);
  return {
    nodes: textLines(lines, SCENE_WIDTH / 2, SCENE_MARGIN, fontSize, defaultStyle.colors.text, "bold"),
    height: SCENE_MARGIN + lines.length * fontSize * LINE_HEIGHT,
  };
}
