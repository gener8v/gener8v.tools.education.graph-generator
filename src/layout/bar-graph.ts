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
  drawAxisLine,
  drawBottomAxisLabel,
  drawCategoryNames,
  drawLeftAxisLabel,
  drawValueAxis,
  fitHorizontalValueAxis,
  offsetAlong,
  resolveValueScale,
  tickLabelOverhang,
  valueAxisExtent,
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
/**
 * A horizontal bar's value label wraps to the free width right of its bar, at least this; an upright
 * bar's to its slot, at least `MIN_VALUE_LABEL_WIDTH`, or this in crowded columns, where labels may
 * touch as names do (DEL-001). Wider wrapping keeps a long value's line count small, never cut
 * (code review CR-001).
 */
const VALUE_LABEL_WIDTH = 72;
export const MIN_VALUE_LABEL_WIDTH = 24;

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

/**
 * The entry at `index` of a list the layout built, never one inherited through a polluted prototype:
 * the value labels' list is empty without `showValues` (security review SEC-003).
 */
const ownEntry = <T>(list: readonly T[], index: number): T | undefined => (Object.hasOwn(list, index) ? list[index] : undefined);

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

/**
 * Upright bars, appending their nodes to `nodes` from `top`: the value axis on the left, bars rising
 * from zero, names and the category-axis label below. Returns the y where the drawing's content ends.
 */
// @spec DGP-REQ-017, DGP-REQ-018, DGP-REQ-020, DGP-REQ-022
function drawVertical(g: BarGraph, provenance: Provenance, top: number, nodes: SceneNode[]): number {
  const scale = resolveValueScale(g.valueScale, g.values, { allowNegative: false });
  const valueLabel = axisLabelLines(g.valueAxisLabel, PLOT_HEIGHT);
  const labelDepth = axisLabelDepth(valueLabel);
  const left = SCENE_MARGIN + (labelDepth > 0 ? labelDepth + GAP : 0) + valueAxisExtent(scale, "vertical");
  const width = SCENE_WIDTH - SCENE_MARGIN - left;
  const slotWidth = width / Math.max(1, g.categories.length);

  // Room above the plot for the top tick's label, and for the value labels when shown. In crowded
  // columns, narrower than a line of text, a label takes VALUE_LABEL_WIDTH rather than its slot.
  const labelWidth = slotWidth < lineHeight ? VALUE_LABEL_WIDTH : Math.max(MIN_VALUE_LABEL_WIDTH, slotWidth - 2);
  const labels = g.showValues === true ? g.categories.map((_, i) => valueLabelLines(g, provenance, i, labelWidth)) : [];
  let tallest = 0;
  for (const lines of labels) tallest = Math.max(tallest, lines.length * lineHeight);
  const headroom = Math.max(fontSize / 2, tallest > 0 ? tallest + VALUE_LABEL_GAP : 0);
  const box: Box = { x: left, y: top + headroom, width, height: PLOT_HEIGHT };
  const bottom = box.y + box.height;

  for (const node of drawLeftAxisLabel(valueLabel, SCENE_MARGIN, box)) nodes.push(node);
  for (const node of drawValueAxis(scale, "vertical", box)) nodes.push(node);
  nodes.push(drawAxisLine(box.x, bottom, box.x + box.width, bottom));

  const zero = fmt(bottom - offsetAlong(scale, box.height, 0));
  if (scale.minimum < 0) nodes.push(drawAxisLine(box.x, zero, box.x + box.width, zero));
  const slots = categorySlots(g.categories, box, "vertical");
  const thickness = fmt(Math.min(MAX_BAR_THICKNESS, slotWidth * BAR_FILL));
  for (const slot of slots) {
    const value = g.values[slot.index] ?? 0;
    const length = barLength(value, scale, box.height);
    // A zero value draws no bar; its slot and name remain (DGP-REQ-022).
    if (length > 0) nodes.push(rect(slot.center - thickness / 2, zero - length, thickness, length, barColorOf(g, slot.index)));
    const lines = ownEntry(labels, slot.index);
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

/**
 * A horizontal bar's value label: its lines, and whether it sits before the zero line, in the part of
 * the plot a negative minimum leaves free, rather than after its bar (security review SEC-001).
 */
interface ValueLabel {
  readonly lines: readonly string[];
  readonly beforeZero: boolean;
}

/** Where horizontal bars go: measured before anything is drawn. */
interface HorizontalPlan {
  readonly scale: ValueScale;
  readonly box: Box;
  /** The category slots, one row each, top to bottom. */
  readonly rows: readonly CategorySlot[];
  /** Each category's value label, when shown. */
  readonly labels: readonly ValueLabel[];
  /** The category-axis label, wrapped to the plot's height. */
  readonly categoryLabel: readonly string[];
}

/**
 * Measures horizontal bars for a category-axis label `depthLines` lines deep, in this order:
 * 1. the plot's left edge, after the category-axis label and the names' column;
 * 2. the room right of the plot for the value labels (each at most `VALUE_LABEL_WIDTH` wide) and the
 *    end tick label, which with the left edge gives the plot's width, and so the scale, whose chosen
 *    interval keeps every tick label apart (`fitHorizontalValueAxis`);
 * 3. each value label, wrapped once, to the free width right of its own bar (code review CR-001), or,
 *    when it would wrap there and the plot left of the zero line is wider, to that width, placed
 *    there: values are never negative, so no bar is drawn there (security review SEC-001);
 * 4. the rows, each as tall as its name, its value label and a bar need, at least
 *    `MIN_ROWS_HEIGHT` in all; then the category-axis label wrapped to their height.
 */
function planHorizontal(g: BarGraph, provenance: Provenance, top: number, depthLines: number): HorizontalPlan {
  const depth = depthLines * defaultStyle.fontSizes.label * LINE_HEIGHT;
  const left = SCENE_MARGIN + (depth > 0 ? depth + GAP : 0) + CATEGORY_NAME_WIDTH + NAME_GAP;

  const written = g.showValues === true ? g.categories.map((_, i) => displayValue(g.values[i] ?? 0, sourceOf(provenance, `values/${i}`))) : [];
  let widestLabel = 0;
  for (const text of written) widestLabel = Math.max(widestLabel, Math.min(VALUE_LABEL_WIDTH, textWidth(text, fontSize)));
  const labelRoom = widestLabel > 0 ? widestLabel + VALUE_LABEL_GAP : 0;
  const { scale, length: width } = fitHorizontalValueAxis(
    g.valueScale,
    g.values,
    { allowNegative: false },
    (candidate) => SCENE_WIDTH - SCENE_MARGIN - Math.max(tickLabelOverhang(candidate), labelRoom) - left,
  );

  const zero = left + offsetAlong(scale, width, 0);
  const before = zero - left - VALUE_LABEL_GAP;
  const labels = written.map((text, i): ValueLabel => {
    const after = Math.max(VALUE_LABEL_WIDTH, SCENE_WIDTH - SCENE_MARGIN - (zero + barLength(g.values[i] ?? 0, scale, width) + VALUE_LABEL_GAP));
    const beforeZero = textWidth(text, fontSize) > after && before > after;
    return { lines: wrap(text, beforeZero ? before : after, fontSize), beforeZero };
  });

  const count = Math.max(1, g.categories.length);
  const rows = categorySlots(g.categories, { x: left, y: top, width, height: 0 }, "horizontal", CATEGORY_NAME_WIDTH, (nameHeight, index) =>
    Math.max(MIN_ROW, nameHeight + NAME_GAP, (ownEntry(labels, index)?.lines.length ?? 0) * lineHeight + NAME_GAP, MIN_ROWS_HEIGHT / count),
  );
  const height = (rows.at(-1)?.end ?? top) - top;
  return { scale, box: { x: left, y: top, width, height }, rows, labels, categoryLabel: axisLabelLines(g.categoryAxisLabel, height) };
}

/**
 * Bars across, appending their nodes to `nodes` from `top`: names on the left, each row sized to its
 * name, bars growing right from zero, each value label after its bar or, with room only there,
 * before the zero line, the value axis and its label below. Returns the y where the
 * drawing's content ends. The plot is measured for the category-axis label's depth, which depends on
 * the plot's height: measured again until the two agree (at most twice more), so no band is left
 * empty beside the plot (quality review QR-007).
 */
// @spec DGP-REQ-017, DGP-REQ-018, DGP-REQ-020, DGP-REQ-022
function drawHorizontal(g: BarGraph, provenance: Provenance, top: number, nodes: SceneNode[]): number {
  let plan = planHorizontal(g, provenance, top, axisLabelLines(g.categoryAxisLabel, MIN_ROWS_HEIGHT).length);
  for (let tries = 0; tries < 2; tries++) {
    const again = planHorizontal(g, provenance, top, plan.categoryLabel.length);
    if (again.categoryLabel.length === plan.categoryLabel.length) {
      plan = again;
      break;
    }
    plan = again;
  }
  const { scale, box, rows, labels, categoryLabel } = plan;
  const bottom = box.y + box.height;

  for (const node of drawLeftAxisLabel(categoryLabel, SCENE_MARGIN, box)) nodes.push(node);
  for (const node of drawValueAxis(scale, "horizontal", box)) nodes.push(node);
  nodes.push(drawAxisLine(box.x, box.y, box.x, bottom));

  const zero = fmt(box.x + offsetAlong(scale, box.width, 0));
  if (scale.minimum < 0) nodes.push(drawAxisLine(zero, box.y, zero, bottom));
  let thinnest = Infinity;
  for (const row of rows) thinnest = Math.min(thinnest, row.end - row.start);
  const thickness = fmt(Math.min(MAX_BAR_THICKNESS, thinnest * BAR_FILL));
  for (const row of rows) {
    const length = barLength(g.values[row.index] ?? 0, scale, box.width);
    if (length > 0) nodes.push(rect(zero, row.center - thickness / 2, length, thickness, barColorOf(g, row.index)));
    const label = ownEntry(labels, row.index);
    if (label !== undefined) {
      const { lines, beforeZero } = label;
      const half = widestOf(lines) / 2;
      const center = beforeZero ? zero - VALUE_LABEL_GAP - half : zero + length + VALUE_LABEL_GAP + half;
      for (const node of textLines(lines, center, row.center - (lines.length * lineHeight) / 2, fontSize, defaultStyle.colors.text)) nodes.push(node);
    }
  }
  for (const node of drawCategoryNames(rows, "horizontal", box)) nodes.push(node);

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
