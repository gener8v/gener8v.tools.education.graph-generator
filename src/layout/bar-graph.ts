import { type BarGraph, barGraph as barGraphDefinition } from "../core/definitions/bar-graph";
import { sourceOf } from "../core/format";
import type { Provenance } from "../core/result";
import { defaultStyle } from "../core/style";
import { displayValue, fmt } from "./kit/format";
import type { Box } from "./kit/labels";
import { textWidth, wrap } from "./kit/text";
import { LINE_HEIGHT, SCENE_MARGIN, textLines, titleBlock } from "./kit/title";
import {
  CATEGORY_NAME_WIDTH,
  type CategorySlot,
  NAME_GAP,
  type ValueScale,
  axisLabelDepth,
  axisLabelLines,
  categorySlots,
  drawBottomAxisLabel,
  drawCategoryNames,
  drawLeftAxisLabel,
  drawValueAxis,
  resolveValueScale,
  tickLabel,
  valueAxisExtent,
  valuePosition,
  valueTicks,
} from "./kit/value-scale";
import type { Layout } from "./registry";
import { SCENE_WIDTH, type Scene, type SceneNode } from "./scene";

/** The height of upright bars' plot, in drawing units. */
const PLOT_HEIGHT = 240;
/** Horizontal bars' plot is at least this tall, so a few rows and the category-axis label have room. */
const MIN_ROWS_HEIGHT = 120;
/** The least height of one horizontal bar's row. */
const MIN_ROW = 20;
/** A bar fills this share of its slot, up to `MAX_BAR_THICKNESS`; the rest is the gap between bars. */
export const BAR_FILL = 0.7;
export const MAX_BAR_THICKNESS = 48;
/** Space between the plot, its labels and the title, and between a bar and its value label. */
const GAP = 8;
const VALUE_LABEL_GAP = 4;
/** A horizontal bar's value label wraps to this width; an upright bar's to its slot, at least `MIN_VALUE_LABEL_WIDTH`. */
const VALUE_LABEL_WIDTH = 72;
const MIN_VALUE_LABEL_WIDTH = 24;

const fontSize = defaultStyle.fontSizes.tickLabel;
const lineHeight = fontSize * LINE_HEIGHT;

/** A bar's color: its category's own, else the graph's `barColor`, else the default (DGP-REQ-019). */
// @spec DGP-REQ-019
export function barColorOf(g: BarGraph, index: number): string {
  return g.categories[index]?.color ?? g.barColor ?? defaultStyle.colors.accent;
}

/**
 * A bar's length along an axis `axisLength` long: exactly value ÷ (maximum − minimum) of it, rounded
 * once by `fmt()`, so lengths stay in proportion to values (DGP-REQ-036).
 */
// @spec DGP-REQ-017, DGP-REQ-036
export function barLength(value: number, scale: ValueScale, axisLength: number): number {
  return fmt((value / (scale.maximum - scale.minimum)) * axisLength);
}

/** A value label's lines (DGP-REQ-020): the value exactly as supplied, wrapped to `width` and never cut. */
// @spec DGP-REQ-020
function valueLabelLines(g: BarGraph, provenance: Provenance, index: number, width: number): string[] {
  return wrap(displayValue(g.values[index] ?? 0, sourceOf(provenance, `values/${index}`)), width, fontSize);
}

const widestOf = (lines: readonly string[]) => {
  let widest = 0;
  for (const line of lines) widest = Math.max(widest, textWidth(line, fontSize));
  return widest;
};

const rect = (x: number, y: number, width: number, height: number, color: string): SceneNode => ({
  kind: "rect",
  attrs: [
    ["x", fmt(x)],
    ["y", fmt(y)],
    ["width", fmt(width)],
    ["height", fmt(height)],
    ["fill", color],
  ],
});

const axisLine = (x1: number, y1: number, x2: number, y2: number): SceneNode => ({
  kind: "line",
  attrs: [
    ["x1", fmt(x1)],
    ["y1", fmt(y1)],
    ["x2", fmt(x2)],
    ["y2", fmt(y2)],
    ["stroke", defaultStyle.colors.line],
    ["stroke-width", fmt(defaultStyle.lineWidths.axis)],
  ],
});

/** How far the scale's widest end tick label reaches past the end of a horizontal value axis. */
function tickLabelOverhang(scale: ValueScale): number {
  let widest = 0;
  for (const tick of [scale.minimum, scale.maximum]) widest = Math.max(widest, textWidth(tickLabel(tick), fontSize));
  return widest / 2;
}

/** Space kept between neighbouring tick labels along a horizontal value axis. */
const TICK_LABEL_GAP = 6;

/** Whether every tick label of `scale` fits beside its neighbours along an axis `length` long. */
function tickLabelsFit(scale: ValueScale, length: number): boolean {
  const ticks = valueTicks(scale);
  for (let i = 1; i < ticks.length; i++) {
    const apart = ((ticks[i]! - ticks[i - 1]!) / (scale.maximum - scale.minimum)) * length;
    const needed = (textWidth(tickLabel(ticks[i - 1]!), fontSize) + textWidth(tickLabel(ticks[i]!), fontSize)) / 2 + TICK_LABEL_GAP;
    if (apart < needed) return false;
  }
  return true;
}

/**
 * The scale of horizontal bars and the plot width it leaves: when the tick interval is chosen, as
 * few intervals as it takes for every tick's label to fit along the shorter axis, so every tick
 * stays labeled (DGP-REQ-009; DEL-004). A given interval is used as given: crowding is then the
 * caller's choice.
 */
function horizontalScale(g: BarGraph, widthFor: (scale: ValueScale) => number): { scale: ValueScale; width: number } {
  let scale = resolveValueScale(g.valueScale, g.values, { allowNegative: false });
  let width = widthFor(scale);
  for (let intervals = 9; intervals >= 1 && g.valueScale?.tickInterval === undefined && !tickLabelsFit(scale, width); intervals--) {
    scale = resolveValueScale(g.valueScale, g.values, { allowNegative: false, intervals });
    width = widthFor(scale);
  }
  return { scale, width };
}

/** Upright bars: the value axis on the left, bars rising from zero, names and the category-axis label below. */
// @spec DGP-REQ-017, DGP-REQ-018, DGP-REQ-020, DGP-REQ-022
function drawVertical(g: BarGraph, provenance: Provenance, top: number, nodes: SceneNode[]): number {
  const scale = resolveValueScale(g.valueScale, g.values, { allowNegative: false });
  const valueLabel = axisLabelLines(g.valueAxisLabel, PLOT_HEIGHT);
  const labelDepth = axisLabelDepth(valueLabel);
  const left = SCENE_MARGIN + (labelDepth > 0 ? labelDepth + GAP : 0) + valueAxisExtent(scale, "vertical");
  const width = SCENE_WIDTH - SCENE_MARGIN - left;
  const slotWidth = width / Math.max(1, g.categories.length);

  // Room above the plot for the top tick's label, and for the value labels when shown.
  const labelWidth = Math.max(MIN_VALUE_LABEL_WIDTH, slotWidth - 2);
  const labels = g.showValues === true ? g.categories.map((_, i) => valueLabelLines(g, provenance, i, labelWidth)) : [];
  let tallest = 0;
  for (const lines of labels) tallest = Math.max(tallest, lines.length * lineHeight);
  const headroom = Math.max(fontSize / 2, tallest > 0 ? tallest + VALUE_LABEL_GAP : 0);
  const box: Box = { x: left, y: top + headroom, width, height: PLOT_HEIGHT };
  const bottom = box.y + box.height;

  for (const node of drawLeftAxisLabel(valueLabel, SCENE_MARGIN, box)) nodes.push(node);
  for (const node of drawValueAxis(scale, "vertical", box)) nodes.push(node);
  nodes.push(axisLine(box.x, bottom, box.x + box.width, bottom));

  const zero = fmt(valuePosition(scale, "vertical", box)(0));
  if (scale.minimum < 0) nodes.push(axisLine(box.x, zero, box.x + box.width, zero));
  const slots = categorySlots(g.categories, box, "vertical");
  const thickness = fmt(Math.min(MAX_BAR_THICKNESS, slotWidth * BAR_FILL));
  for (const slot of slots) {
    const value = g.values[slot.index] ?? 0;
    const length = barLength(value, scale, box.height);
    // A zero value draws no bar; its slot and name remain (DGP-REQ-022).
    if (length > 0) nodes.push(rect(slot.center - thickness / 2, zero - length, thickness, length, barColorOf(g, slot.index)));
    const lines = labels[slot.index];
    if (lines !== undefined) {
      const labelTop = zero - length - VALUE_LABEL_GAP - lines.length * lineHeight;
      // Centered on the bar, but kept inside the plot's span when crowded columns make it wider (DEL-001).
      const half = widestOf(lines) / 2;
      const center = Math.max(box.x + half, Math.min(slot.center, box.x + box.width - half));
      for (const node of textLines(lines, center, labelTop, fontSize, defaultStyle.colors.text)) nodes.push(node);
    }
  }

  let nameHeight = 0;
  for (const slot of slots) nameHeight = Math.max(nameHeight, slot.labelHeight);
  for (const node of drawCategoryNames(slots, "vertical", box)) nodes.push(node);
  let y = bottom + NAME_GAP + nameHeight;
  const categoryLabel = axisLabelLines(g.categoryAxisLabel, box.width);
  if (categoryLabel.length > 0) {
    for (const node of drawBottomAxisLabel(categoryLabel, box, y + GAP)) nodes.push(node);
    y += GAP + axisLabelDepth(categoryLabel);
  }
  return y;
}

/** Bars across: names on the left, each row sized to its name, bars growing right from zero, the value axis below. */
// @spec DGP-REQ-017, DGP-REQ-018, DGP-REQ-020, DGP-REQ-022
function drawHorizontal(g: BarGraph, provenance: Provenance, top: number, nodes: SceneNode[]): number {
  const count = Math.max(1, g.categories.length);
  const categoryLabelSample = axisLabelLines(g.categoryAxisLabel, MIN_ROWS_HEIGHT);
  const labelDepth = axisLabelDepth(categoryLabelSample);
  const left = SCENE_MARGIN + (labelDepth > 0 ? labelDepth + GAP : 0) + CATEGORY_NAME_WIDTH + NAME_GAP;

  // Right of the plot: the value labels when shown, and the last tick label's overhang.
  const labels = g.showValues === true ? g.categories.map((_, i) => valueLabelLines(g, provenance, i, VALUE_LABEL_WIDTH)) : [];
  let widestLabel = 0;
  for (const lines of labels) widestLabel = Math.max(widestLabel, widestOf(lines));
  const valueLabelRoom = widestLabel > 0 ? widestLabel + VALUE_LABEL_GAP : 0;
  const { scale, width } = horizontalScale(g, (candidate) => SCENE_WIDTH - SCENE_MARGIN - Math.max(tickLabelOverhang(candidate), valueLabelRoom) - left);

  // Each row as tall as its name, its value label and a bar need, and the rows at least MIN_ROWS_HEIGHT in all.
  const slots: CategorySlot[] = categorySlots(g.categories, { x: left, y: top, width, height: 0 }, "horizontal", CATEGORY_NAME_WIDTH, (nameHeight) =>
    Math.max(MIN_ROW, nameHeight + NAME_GAP, MIN_ROWS_HEIGHT / count),
  );
  // A long value label can be taller than its row's name: grow the rows that need it.
  const rows = slots.map((slot) => {
    const needed = (labels[slot.index]?.length ?? 0) * lineHeight + NAME_GAP;
    return Math.max(slot.end - slot.start, needed);
  });
  let y = top;
  const placed = slots.map((slot, i) => {
    const size = rows[i]!;
    const moved = { ...slot, start: y, end: y + size, center: y + size / 2 };
    y += size;
    return moved;
  });
  const box: Box = { x: left, y: top, width, height: y - top };
  const bottom = box.y + box.height;

  for (const node of drawLeftAxisLabel(axisLabelLines(g.categoryAxisLabel, box.height), SCENE_MARGIN, box)) nodes.push(node);
  for (const node of drawValueAxis(scale, "horizontal", box)) nodes.push(node);
  nodes.push(axisLine(box.x, box.y, box.x, bottom));

  const zero = fmt(valuePosition(scale, "horizontal", box)(0));
  if (scale.minimum < 0) nodes.push(axisLine(zero, box.y, zero, bottom));
  let thinnest = Infinity;
  for (const size of rows) thinnest = Math.min(thinnest, size);
  const thickness = fmt(Math.min(MAX_BAR_THICKNESS, thinnest * BAR_FILL));
  for (const slot of placed) {
    const value = g.values[slot.index] ?? 0;
    const length = barLength(value, scale, box.width);
    if (length > 0) nodes.push(rect(zero, slot.center - thickness / 2, length, thickness, barColorOf(g, slot.index)));
    const lines = labels[slot.index];
    if (lines !== undefined) {
      const widest = widestOf(lines);
      const labelLeft = zero + length + VALUE_LABEL_GAP;
      for (const node of textLines(lines, labelLeft + widest / 2, slot.center - (lines.length * lineHeight) / 2, fontSize, defaultStyle.colors.text)) {
        nodes.push(node);
      }
    }
  }
  for (const node of drawCategoryNames(placed, "horizontal", box)) nodes.push(node);

  let end = bottom + valueAxisExtent(scale, "horizontal");
  const valueLabel = axisLabelLines(g.valueAxisLabel, box.width);
  if (valueLabel.length > 0) {
    for (const node of drawBottomAxisLabel(valueLabel, box, end + GAP)) nodes.push(node);
    end += GAP + axisLabelDepth(valueLabel);
  }
  return end;
}

/**
 * The bar graph's layout (DGP-REQ-017..022, DGP-REQ-036): the title, then one bar per category in
 * description order, upright (the default) or across, each as long as value ÷ (maximum − minimum)
 * of the value axis, from zero. A default scale starts at zero. A bar is its category's color, else
 * `barColor`, else the default; with `showValues` its value is written beside it as supplied. A
 * zero value draws no bar and keeps its slot and name. Every number goes through `fmt()` (AD-007).
 */
// @spec DGP-REQ-017, DGP-REQ-018, DGP-REQ-019, DGP-REQ-020, DGP-REQ-022, DGP-REQ-036
export const barGraphLayout: Layout<BarGraph> = (g: BarGraph, provenance: Provenance): Scene => {
  const nodes: SceneNode[] = [];
  const title = titleBlock(g.title);
  for (const node of title.nodes) nodes.push(node);
  const top = title.height + GAP;
  const end = g.orientation === "horizontal" ? drawHorizontal(g, provenance, top, nodes) : drawVertical(g, provenance, top, nodes);
  return {
    width: SCENE_WIDTH,
    height: fmt(end + SCENE_MARGIN),
    textAlternative: barGraphDefinition.describe(g, provenance),
    nodes,
  };
};
