import { DEFAULT_VALUE_INTERVALS, type GivenValueScale, type ScaleOptions, type ValueScale, resolveValueScale, valueTicks } from "../../core/value-scale";
import { cleanText, formatSupplied } from "../../core/format";
import { defaultStyle } from "../../core/style";
import type { SceneNode } from "../scene";
import { fmt, rotate } from "./format";
import type { Box } from "./labels";
import { linearScale } from "./scale";
import { DEFAULT_FONT_STACK, textWidth, widestWord, wrap } from "./text";
import { LINE_HEIGHT, textLines } from "./title";

// The scale arithmetic is core's, shared with the validator (quality reviews QR-003, QR-005).
export { DEFAULT_VALUE_INTERVALS, resolveValueScale, type ScaleOptions, type ValueScale, valueTicks } from "../../core/value-scale";

/**
 * Which way values run: `"vertical"` draws the value axis up the left side of the plot and the
 * categories along the bottom (upright bars); `"horizontal"` draws the value axis along the bottom
 * and the categories down the left side.
 */
export type Orientation = "vertical" | "horizontal";

/** How far below its tick a vertical axis's tick label's baseline sits, as a share of the font size, so the digits center on the tick. */
export const TICK_LABEL_DROP = 0.35;

/** Space between a tick and its label, in drawing units. */
const LABEL_GAP = 4;
/**
 * Space between the plot and the category names, in drawing units: names end this far left of a
 * horizontal plot and start this far below a vertical one. A layout leaves this much room for them
 * (quality review QR-006).
 */
export const NAME_GAP = 4;
/** Category names beside a horizontal plot wrap to this width unless the caller gives another. */
export const CATEGORY_NAME_WIDTH = 96;

/**
 * The scale a data graph draws with nothing given (DGP-REQ-006): from zero (or below, for negative
 * values when `allowNegative`, line graphs only) to a tick at or above the largest value; all-zero
 * data gives 0 to 1. The rule is `resolveValueScale`'s, shared with the validator.
 */
// @spec DGP-REQ-006
export function defaultValueScale(values: readonly number[], options: ScaleOptions): ValueScale {
  return resolveValueScale(undefined, values, options);
}

/** The text of a tick label: the value as a plain number, never in exponent form. */
export const tickLabel = (value: number): string => formatSupplied(value);

/**
 * How far a value axis's ticks and labels reach outside the plot box: to the left of a vertical
 * axis, or below a horizontal one. A layout leaves this much room when it places the box.
 */
export function valueAxisExtent(scale: ValueScale, orientation: Orientation): number {
  const fontSize = defaultStyle.fontSizes.tickLabel;
  if (orientation === "horizontal") return defaultStyle.tickLength + LABEL_GAP + fontSize * LINE_HEIGHT;
  let widest = 0;
  for (const tick of valueTicks(scale)) widest = Math.max(widest, textWidth(tickLabel(tick), fontSize));
  return defaultStyle.tickLength + LABEL_GAP + widest;
}

/** Where `value` lies along the value axis of `box`: a y for a vertical axis, an x for a horizontal one. */
export function valuePosition(scale: ValueScale, orientation: Orientation, box: Box): (value: number) => number {
  return orientation === "vertical"
    ? linearScale([scale.minimum, scale.maximum], [box.y + box.height, box.y])
    : linearScale([scale.minimum, scale.maximum], [box.x, box.x + box.width]);
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
 * The value axis of a plot `box` (DGP-REQ-009): the axis line along the box's left edge (vertical)
 * or bottom edge (horizontal), a tick at every value of `valueTicks(scale)`, and every tick labeled
 * with its value. Every coordinate passes through `fmt()` (AD-007).
 */
// @spec DGP-REQ-009
export function drawValueAxis(scale: ValueScale, orientation: Orientation, box: Box): SceneNode[] {
  const at = valuePosition(scale, orientation, box);
  const tickLength = defaultStyle.tickLength;
  const fontSize = defaultStyle.fontSizes.tickLabel;
  const bottom = box.y + box.height;
  const nodes: SceneNode[] = [
    orientation === "vertical"
      ? line(box.x, box.y, box.x, bottom, defaultStyle.lineWidths.axis)
      : line(box.x, bottom, box.x + box.width, bottom, defaultStyle.lineWidths.axis),
  ];
  for (const tick of valueTicks(scale)) {
    const p = at(tick);
    const label = (x: number, y: number, anchor: "end" | "middle"): SceneNode => ({
      kind: "text",
      attrs: [
        ["x", fmt(x)],
        ["y", fmt(y)],
        ["fill", defaultStyle.colors.text],
        ["font-family", DEFAULT_FONT_STACK],
        ["font-size", fmt(fontSize)],
        ["text-anchor", anchor],
      ],
      text: tickLabel(tick),
    });
    if (orientation === "vertical") {
      nodes.push(line(box.x - tickLength, p, box.x, p, defaultStyle.lineWidths.tick));
      // The baseline a little below the tick, so the digits sit centered on it.
      nodes.push(label(box.x - tickLength - LABEL_GAP, p + fontSize * TICK_LABEL_DROP, "end"));
    } else {
      nodes.push(line(p, bottom, p, bottom + tickLength, defaultStyle.lineWidths.tick));
      nodes.push(label(p, bottom + tickLength + LABEL_GAP + fontSize * 0.8, "middle"));
    }
  }
  return nodes;
}

/** One category's place along the category axis. */
export interface CategorySlot {
  /** The category's position in the description. */
  readonly index: number;
  readonly name: string;
  /** Where the slot starts and ends along the category axis (x for vertical, y for horizontal). */
  readonly start: number;
  readonly end: number;
  readonly center: number;
  /** The name broken into lines, every word kept: a long name wraps, it is never cut short. */
  readonly lines: readonly string[];
  /** The width the name's lines are wrapped to. */
  readonly labelWidth: number;
  /**
   * How far the name reaches across the plot's edge: the height of its lines beside a horizontal
   * plot or below an unrotated vertical one, and the width of its widest line when it is rotated.
   */
  readonly labelHeight: number;
  /** Whether the name is turned to read upward below a vertical plot (quality review QR-002). */
  readonly rotated: boolean;
}

/**
 * The width a rotated name's lines are wrapped to: at least the name width and its widest word, so
 * no word is split, and wide enough that its lines, side by side, fit across its slot. Widened in
 * steps until they do; one line always fits, so the loop ends, and each step is linear in the name.
 */
function rotatedLines(name: string, slotSize: number, fontSize: number, widestWord: number): { lines: string[]; width: number } {
  const lineHeight = fontSize * LINE_HEIGHT;
  const maxLines = Math.max(1, Math.floor(slotSize / lineHeight));
  let width = Math.max(CATEGORY_NAME_WIDTH, widestWord, textWidth(name, fontSize) / maxLines);
  let lines = wrap(name, width, fontSize);
  while (lines.length > maxLines) {
    width *= 1.25;
    lines = wrap(name, width, fontSize);
  }
  return { lines, width };
}

/**
 * The category slots of a plot `box` (DGP-REQ-003): equal slots in description order, left to right
 * along the bottom (vertical) or top to bottom down the left side (horizontal). Each name is wrapped
 * with the kit's `wrap` and never truncated (DGP Scale and Layout; prd/TC-011):
 * - beside a horizontal plot, to `nameWidth`;
 * - below a vertical plot, to its slot's width, when every word of every name fits there. When one
 *   does not, every name is rotated to read upward, wrapped between words only, with as many lines
 *   as fit side by side across its slot, so a word is never split (quality review QR-002). Past
 *   about 25 categories one line no longer fits a slot and rotated names touch (DGP TICKET-003).
 *
 * `slotSize`, beside a horizontal plot only, sizes each slot from its own wrapped name's height (and
 * its index, so a layout can add what else the row holds, such as a value label), so a
 * layout places the slots and wraps each name once (quality review QR-006), and one long name makes
 * one tall slot, not every slot tall (security review SEC-002). The slots then follow one another
 * from the box's top, and the box's height is not used.
 */
// @spec DGP-REQ-001, DGP-REQ-003
export function categorySlots(
  categories: ReadonlyArray<{ readonly name: string }>,
  box: Box,
  orientation: Orientation,
  nameWidth: number = CATEGORY_NAME_WIDTH,
  slotSize?: (nameHeight: number, index: number) => number,
): CategorySlot[] {
  const fontSize = defaultStyle.fontSizes.tickLabel;
  const lineHeight = fontSize * LINE_HEIGHT;
  const along = orientation === "vertical" ? box.x : box.y;
  const share = (orientation === "vertical" ? box.width : box.height) / Math.max(1, categories.length);
  const names = categories.map((category) => cleanText(category.name));

  let named: Array<{ lines: string[]; labelWidth: number; labelHeight: number; rotated: boolean }>;
  if (orientation === "horizontal") {
    named = names.map((name) => {
      const lines = wrap(name, nameWidth, fontSize);
      return { lines, labelWidth: nameWidth, labelHeight: lines.length * lineHeight, rotated: false };
    });
  } else {
    const slotWidth = share - NAME_GAP;
    const widest = names.map((name) => widestWord(name, fontSize));
    if (slotWidth > 0 && widest.every((width) => width <= slotWidth)) {
      named = names.map((name) => {
        const lines = wrap(name, slotWidth, fontSize);
        return { lines, labelWidth: slotWidth, labelHeight: lines.length * lineHeight, rotated: false };
      });
    } else {
      named = names.map((name, i) => {
        const { lines, width } = rotatedLines(name, share, fontSize, widest[i]!);
        let longest = 0;
        for (const line of lines) longest = Math.max(longest, textWidth(line, fontSize));
        return { lines, labelWidth: width, labelHeight: longest, rotated: true };
      });
    }
  }

  const sizeOf = orientation === "horizontal" && slotSize !== undefined ? slotSize : () => share;
  let start = along;
  return categories.map((category, index) => {
    const size = sizeOf(named[index]!.labelHeight, index);
    const slot = { index, name: category.name, start, end: start + size, center: start + size / 2, ...named[index]! };
    start += size;
    return slot;
  });
}

/**
 * Lines of text read upward, side by side from `left` in the order `textLines` stacks them, each
 * turned about its own anchor at height `y`: ending there (`"end"`, a name hanging below a plot) or
 * centered on it (`"middle"`, an axis label beside one). The one rule for rotated text in the kit
 * (quality review QR-003).
 */
function upwardLines(lines: readonly string[], left: number, y: number, fontSize: number, anchor: "end" | "middle"): SceneNode[] {
  const lineHeight = fontSize * LINE_HEIGHT;
  return lines.map((text, i) => {
    const x = left + i * lineHeight + (lineHeight - fontSize) / 2 + fontSize * 0.8;
    return {
      kind: "text",
      attrs: [
        ["x", fmt(x)],
        ["y", fmt(y)],
        ["fill", defaultStyle.colors.text],
        ["font-family", DEFAULT_FONT_STACK],
        ["font-size", fmt(fontSize)],
        ["text-anchor", anchor],
        ["transform", rotate(-90, x, y)],
      ],
      text,
    };
  });
}

/**
 * A rotated name's lines below a vertical plot: each reads upward and ends `NAME_GAP` below the
 * plot, the lines side by side and centered on the slot. A block wider than its slot (crowded
 * columns, where names may touch: "legibility is the caller's choice", DGP Edge Cases) is moved
 * inward at the ends, so it never leaves the plot's span and the drawing (DGP TICKET-003 DEL-001).
 */
function rotatedNameLines(slot: CategorySlot, box: Box, fontSize: number): SceneNode[] {
  const width = slot.lines.length * fontSize * LINE_HEIGHT;
  const centered = slot.center - width / 2;
  const left = Math.max(box.x, Math.min(centered, box.x + box.width - width));
  return upwardLines(slot.lines, left, box.y + box.height + NAME_GAP, fontSize, "end");
}

/**
 * The category names for `slots`, every line of every name drawn: below a vertical plot, centered
 * under each slot, or rotated to read upward when `categorySlots` rotated them; beside a horizontal
 * plot, centered in a column `labelWidth` wide that ends `NAME_GAP` left of the plot, and centered
 * on the slot vertically.
 */
// @spec DGP-REQ-001, DGP-REQ-003
export function drawCategoryNames(slots: readonly CategorySlot[], orientation: Orientation, box: Box): SceneNode[] {
  const fontSize = defaultStyle.fontSizes.tickLabel;
  const nodes: SceneNode[] = [];
  for (const slot of slots) {
    if (orientation === "vertical" && slot.rotated) {
      for (const node of rotatedNameLines(slot, box, fontSize)) nodes.push(node);
      continue;
    }
    const [centerX, top] =
      orientation === "vertical"
        ? [slot.center, box.y + box.height + NAME_GAP]
        : [box.x - NAME_GAP - slot.labelWidth / 2, slot.center - slot.labelHeight / 2];
    // A loop, not a spread: a slot's lines grow with its name (GSS TICKET-002 security review SEC-001).
    for (const node of textLines(slot.lines, centerX, top, fontSize, defaultStyle.colors.text)) nodes.push(node);
  }
  return nodes;
}

/** An axis label longer than this many lines is cut, ending in "…"; the text alternative states it whole. */
export const AXIS_LABEL_MAX_LINES = 2;

/**
 * An axis label's lines (DGP-REQ-002): the caller's text, cleaned, wrapped to `length` and capped
 * at `AXIS_LABEL_MAX_LINES`, so caller-sized text yields a bounded Scene (GSS TICKET-002 SEC-001).
 * No lines for a label that is absent or blank.
 */
export function axisLabelLines(text: string | undefined, length: number): string[] {
  const cleaned = text === undefined ? "" : cleanText(text);
  return cleaned === "" ? [] : wrap(cleaned, length, defaultStyle.fontSizes.label, AXIS_LABEL_MAX_LINES);
}

/** How far an axis label's lines reach across the axis: their count times the line height. */
export const axisLabelDepth = (lines: readonly string[]): number => lines.length * defaultStyle.fontSizes.label * LINE_HEIGHT;

/**
 * An axis label beside a plot `box`, on its left: read upward and centered on the plot's height,
 * its lines side by side from `left` toward the plot. The value axis's label of upright bars or a
 * line graph, the category axis's label of horizontal bars (DGP TICKET-003 DEL-002).
 */
// @spec DGP-REQ-002
export function drawLeftAxisLabel(lines: readonly string[], left: number, box: Box): SceneNode[] {
  return upwardLines(lines, left, box.y + box.height / 2, defaultStyle.fontSizes.label, "middle");
}

/**
 * An axis label under a plot `box`: its lines, wrapped to the plot's width with `axisLabelLines`,
 * centered under the plot from `top`. The category axis's label of upright bars or a line graph,
 * the value axis's label of horizontal bars (DGP TICKET-003 DEL-002).
 */
// @spec DGP-REQ-002
export function drawBottomAxisLabel(lines: readonly string[], box: Box, top: number): SceneNode[] {
  return textLines(lines, box.x + box.width / 2, top, defaultStyle.fontSizes.label, defaultStyle.colors.text);
}

/** An axis line from (`x1`, `y1`) to (`x2`, `y2`), in the axis color and width: a plot's category axis, or its zero line. */
export function drawAxisLine(x1: number, y1: number, x2: number, y2: number): SceneNode {
  return line(x1, y1, x2, y2, defaultStyle.lineWidths.axis);
}

/** Where `value` lies along a value axis `length` long, from the axis's minimum end. */
export const offsetAlong = (scale: ValueScale, length: number, value: number): number => ((value - scale.minimum) / (scale.maximum - scale.minimum)) * length;

/** How far the scale's wider end tick label reaches past either end of a horizontal value axis. */
export function tickLabelOverhang(scale: ValueScale): number {
  const fontSize = defaultStyle.fontSizes.tickLabel;
  return Math.max(textWidth(tickLabel(scale.minimum), fontSize), textWidth(tickLabel(scale.maximum), fontSize)) / 2;
}

/** Space kept between neighbouring tick labels along a horizontal value axis. */
const TICK_LABEL_GAP = 6;

/** Whether every tick label of `scale` fits beside its neighbours along a horizontal axis `length` long. */
export function tickLabelsFit(scale: ValueScale, length: number): boolean {
  const fontSize = defaultStyle.fontSizes.tickLabel;
  const ticks = valueTicks(scale);
  for (let i = 1; i < ticks.length; i++) {
    const apart = offsetAlong(scale, length, ticks[i]!) - offsetAlong(scale, length, ticks[i - 1]!);
    const needed = (textWidth(tickLabel(ticks[i - 1]!), fontSize) + textWidth(tickLabel(ticks[i]!), fontSize)) / 2 + TICK_LABEL_GAP;
    if (apart < needed) return false;
  }
  return true;
}

/**
 * The scale of a horizontal value axis and the length it gets, `lengthFor(scale)`: when the tick
 * interval is chosen, as few intervals as it takes for every tick's label to fit, so every tick stays
 * labeled (DGP-REQ-009; DGP TICKET-003 DEL-004). A given interval is used as given: crowding is then
 * the caller's choice.
 */
// @spec DGP-REQ-009
export function fitHorizontalValueAxis(
  given: GivenValueScale | undefined,
  values: readonly number[],
  options: ScaleOptions,
  lengthFor: (scale: ValueScale) => number,
): { scale: ValueScale; length: number } {
  let scale = resolveValueScale(given, values, options);
  let length = lengthFor(scale);
  if (given?.tickInterval !== undefined) return { scale, length };
  for (let intervals = DEFAULT_VALUE_INTERVALS - 1; intervals >= 1 && !tickLabelsFit(scale, length); intervals--) {
    scale = resolveValueScale(given, values, { ...options, intervals });
    length = lengthFor(scale);
  }
  return { scale, length };
}

