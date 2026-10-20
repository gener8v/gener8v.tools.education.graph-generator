import { type RulerMarkRank, type RulerUnit, divisionsPerUnit, rulerMarks } from "../../core/ruler";
import { defaultStyle } from "../../core/style";
import type { SceneNode } from "../scene";
import { fmt } from "./format";
import { linearScale } from "./scale";
import { DEFAULT_FONT_STACK, textWidth } from "./text";
import { TICK_LABEL_DROP } from "./value-scale";

/**
 * Each rank's mark length, in drawing units, longest first (NLC-REQ-045, NLC-REQ-048): on a
 * centimetre ruler whole 20, half 14 and millimetre 8; on an inch ruler whole 22, half 17, quarter
 * 13, eighth 9.5 and sixteenth 6.5. Strictly decreasing, so every rank is told apart by length.
 */
export const RULER_MARK_LENGTHS: Readonly<Record<RulerUnit, readonly number[]>> = Object.freeze({
  centimeters: Object.freeze([20, 14, 8]),
  inches: Object.freeze([22, 17, 13, 9.5, 6.5]),
});

/** Space between a whole mark's end and its number, in drawing units. */
const NUMBER_GAP = 3;

/**
 * The narrowest a mark is drawn, in drawing units, however close the marks: never 0 after `fmt()`
 * (code review CR-004). Whether marks this narrow keep 3:1 contrast depends on the size the ruler
 * is shown at, which the ruler's layout decides.
 */
export const RULER_MIN_MARK_WIDTH = 0.25;

/** A ruler's marked edge to draw: where it runs on the page, the ruler's unit, length and division. */
export interface RulerMarksOptions {
  /** The page point of the ruler's 0. */
  readonly from: readonly [number, number];
  /** The page point of the ruler's length. */
  readonly to: readonly [number, number];
  readonly unit: RulerUnit;
  /** A whole number of units, from 1 to the unit's maximum. */
  readonly length: number;
  /** An inch ruler's smallest division; a sixteenth when absent. Never given on a centimetre ruler. */
  readonly division?: string;
  /**
   * Which side of the edge the marks run into, seen travelling from `from` to `to`: on an edge
   * drawn left to right, `right` is down the page.
   */
  readonly side: "left" | "right";
  /**
   * The numbers' font size, in drawing units; the default tick-label size (12) when absent. Read
   * only as the options' own key. Two-digit numbers need about 1.2 × their size per unit, so a
   * 30 cm ruler across 360 units needs at most about 9.8 (code review CR-005).
   */
  readonly fontSize?: number;
}

const line = (x1: number, y1: number, x2: number, y2: number, width: number): SceneNode => ({
  kind: "line",
  attrs: [
    ["x1", fmt(x1)],
    ["y1", fmt(y1)],
    ["x2", fmt(x2)],
    ["y2", fmt(y2)],
    ["stroke", defaultStyle.colors.line],
    ["stroke-width", fmt(width)],
  ],
});

/**
 * A ruler's marks and numbers (NLC-REQ-043, NLC-REQ-044, NLC-REQ-045, NLC-REQ-047, NLC-REQ-048):
 * a mark at every value of `rulerMarks`, at its proportional place along the edge from `from` to
 * `to` (`linearScale`), running perpendicular into `side` for its rank's length
 * (`RULER_MARK_LENGTHS`), and a number past every whole mark, from 0 to the length, at `fontSize`.
 * No other text is drawn. A mark's width is the default tick width, or half the space between
 * neighbouring marks on the page when that is less, so a 30 cm ruler's millimetres stay apart
 * (DEL-002), and never less than `RULER_MIN_MARK_WIDTH` (code review CR-004). Marks come
 * before numbers, and every number passes through `fmt()` (AD-007). Never uses `drawAxis`, whose
 * 100-tick limit a ruler's 301 marks exceed. Throws `RangeError` on options no validated ruler
 * gives, so a layout bug becomes the fixed `internal_error` rather than a wrong ruler.
 */
// @spec NLC-REQ-043, NLC-REQ-044, NLC-REQ-045, NLC-REQ-047, NLC-REQ-048
export function drawRulerMarks(options: RulerMarksOptions): SceneNode[] {
  const { from, to, unit, length, side } = options;
  const division = Object.hasOwn(options, "division") ? options.division : undefined;
  const fontSize = Object.hasOwn(options, "fontSize") ? options.fontSize : defaultStyle.fontSizes.tickLabel;
  const divisions = divisionsPerUnit(unit, division);
  const marks = rulerMarks(unit, length, division);
  const [x0, y0] = from;
  const [x1, y1] = to;
  const edge = Math.hypot(x1 - x0, y1 - y0);
  if (divisions === undefined || marks === undefined || ![x0, y0, x1, y1].every(Number.isFinite) || !(edge > 0) || (side !== "left" && side !== "right") || !(typeof fontSize === "number" && fontSize > 0 && Number.isFinite(fontSize))) {
    throw new RangeError("drawRulerMarks(): the options do not describe a drawable ruler");
  }
  // The unit normal toward `side`: (−dy, dx) is to the right of travel on the page, where y runs down.
  const turn = side === "right" ? 1 : -1;
  const [nx, ny] = [(turn * -(y1 - y0)) / edge, (turn * (x1 - x0)) / edge];
  const at = linearScale([0, length], [0, 1]);
  const lengths = RULER_MARK_LENGTHS[unit];
  const width = Math.max(RULER_MIN_MARK_WIDTH, Math.min(defaultStyle.lineWidths.tick, edge / (length * divisions) / 2));

  const nodes: SceneNode[] = [];
  const numbers: SceneNode[] = [];
  for (const { value, rank } of marks) {
    const t = at(value);
    const [x, y] = [x0 + t * (x1 - x0), y0 + t * (y1 - y0)];
    const reach = markLength(lengths, rank);
    nodes.push(line(x, y, x + nx * reach, y + ny * reach, width));
    if (rank !== 0) continue;
    const text = String(Math.round(value));
    // Centre the number past the mark's end, far enough along the normal to clear it whatever the edge's direction.
    const clear = reach + NUMBER_GAP + (Math.abs(nx) * textWidth(text, fontSize)) / 2 + (Math.abs(ny) * fontSize) / 2;
    numbers.push({
      kind: "text",
      attrs: [
        ["x", fmt(x + nx * clear)],
        ["y", fmt(y + ny * clear + fontSize * TICK_LABEL_DROP)],
        ["fill", defaultStyle.colors.text],
        ["font-family", DEFAULT_FONT_STACK],
        ["font-size", fmt(fontSize)],
        ["text-anchor", "middle"],
      ],
      text,
    });
  }
  for (const node of numbers) nodes.push(node);
  return nodes;
}

/** The length of a mark of `rank`, from its unit's table. */
function markLength(lengths: readonly number[], rank: RulerMarkRank): number {
  const reach = lengths[rank];
  if (reach === undefined) throw new RangeError(`drawRulerMarks(): no mark length for rank ${rank}`);
  return reach;
}
