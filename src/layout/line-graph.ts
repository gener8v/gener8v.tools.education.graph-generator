import { type LineGraph, type LineSeries, lineGraph as lineGraphDefinition, seriesLabelOf, seriesName } from "../core/definitions/line-graph";
import type { Provenance } from "../core/result";
import { type SeriesStyle, defaultStyle, seriesStyles } from "../core/style";
import { fmt, fmtPoints } from "./kit/format";
import type { Box } from "./kit/labels";
import { MARKER_REACH, drawMarker } from "./kit/markers";
import { textWidth, wrap } from "./kit/text";
import { LINE_HEIGHT, SCENE_MARGIN, textLines, titleBlock } from "./kit/title";
import {
  NAME_GAP,
  axisLabelDepth,
  axisLabelLines,
  categorySlots,
  drawCategoryAxisLabel,
  drawCategoryNames,
  drawValueAxis,
  drawValueAxisLabel,
  resolveValueScale,
  valueAxisExtent,
  valuePosition,
} from "./kit/value-scale";
import type { Layout } from "./registry";
import { type Attrs, SCENE_WIDTH, type Scene, type SceneNode } from "./scene";

/** The plot's height, in drawing units. */
const PLOT_HEIGHT = 240;
/** Space between the plot, its labels, the legend and the title. */
const GAP = 8;
/** Room above the plot, so the top tick's label is not cut by what is above it. */
const TOP_TICK_ROOM = defaultStyle.fontSizes.tickLabel / 2;
/** A legend entry's line sample, with the series' dash pattern and marker. */
const SAMPLE_LENGTH = 28;
/** A legend label wraps to this width and is cut after `LEGEND_MAX_LINES` lines. */
const LEGEND_TEXT_WIDTH = 140;
export const LEGEND_MAX_LINES = 2;
/** Space between a sample and its label, and between legend entries. */
const LEGEND_INNER_GAP = 6;
const LEGEND_ENTRY_GAP = 16;

/** How series `index` is drawn: its own color when it has one, else its default style's; always its default marker and dash. */
// @spec DGP-REQ-011, DGP-REQ-014
export function seriesStyleOf(series: LineSeries, index: number): SeriesStyle {
  const style = seriesStyles[index % seriesStyles.length]!;
  return { ...style, color: series.lineColor ?? style.color };
}

/** A series' line through its points, in its color and dash pattern; nothing for a single point. */
// @spec DGP-REQ-012
function seriesLine(points: ReadonlyArray<readonly [number, number]>, style: SeriesStyle): SceneNode[] {
  if (points.length < 2) return [];
  const attrs: Attrs = [
    ["points", fmtPoints(points)],
    ["fill", "none"],
    ["stroke", style.color],
    ["stroke-width", fmt(defaultStyle.lineWidths.series)],
    ["stroke-linejoin", "round"],
    ...(style.dash === "none" ? [] : ([["stroke-dasharray", style.dash]] as const)),
  ];
  return [{ kind: "polyline", attrs }];
}

interface LegendEntry {
  readonly style: SeriesStyle;
  readonly lines: readonly string[];
  readonly width: number;
  readonly height: number;
}

/**
 * The legend (DGP-REQ-013), drawn only for more than one series: one entry per series, in order,
 * each a line sample in its color and dash pattern with its marker, and its label ("Series N" when
 * it has none) wrapped and capped at `LEGEND_MAX_LINES`. Entries flow in rows across the drawing,
 * each row centered, from `top`. Returns the nodes and the height they take.
 */
// @spec DGP-REQ-011, DGP-REQ-013, DGP-REQ-014
function drawLegend(g: LineGraph, top: number): { nodes: SceneNode[]; height: number } {
  if (g.series.length < 2) return { nodes: [], height: 0 };
  const fontSize = defaultStyle.fontSizes.tickLabel;
  const lineHeight = fontSize * LINE_HEIGHT;
  const entries: LegendEntry[] = g.series.map((series, i) => {
    const lines = wrap(seriesLabelOf(series) ?? seriesName(i), LEGEND_TEXT_WIDTH, fontSize, LEGEND_MAX_LINES);
    let widest = 0;
    for (const line of lines) widest = Math.max(widest, textWidth(line, fontSize));
    return { style: seriesStyleOf(series, i), lines, width: SAMPLE_LENGTH + LEGEND_INNER_GAP + widest, height: lines.length * lineHeight };
  });

  // Rows: as many entries as fit across the drawing.
  const available = SCENE_WIDTH - 2 * SCENE_MARGIN;
  const rows: LegendEntry[][] = [];
  let row: LegendEntry[] = [];
  let rowWidth = 0;
  for (const entry of entries) {
    const needed = row.length === 0 ? entry.width : rowWidth + LEGEND_ENTRY_GAP + entry.width;
    if (row.length > 0 && needed > available) {
      rows.push(row);
      row = [entry];
      rowWidth = entry.width;
    } else {
      row.push(entry);
      rowWidth = needed;
    }
  }
  rows.push(row);

  const nodes: SceneNode[] = [];
  let y = top;
  for (const entriesInRow of rows) {
    let width = 0;
    let height = 0;
    for (const entry of entriesInRow) {
      width += entry.width;
      height = Math.max(height, entry.height);
    }
    width += LEGEND_ENTRY_GAP * (entriesInRow.length - 1);
    let x = SCENE_MARGIN + (available - width) / 2;
    for (const entry of entriesInRow) {
      // The sample sits level with the label's first line.
      const sampleY = y + lineHeight / 2;
      nodes.push(...seriesLine([[x, sampleY], [x + SAMPLE_LENGTH, sampleY]], entry.style));
      nodes.push(drawMarker(entry.style.marker, x + SAMPLE_LENGTH / 2, sampleY, entry.style.color));
      const textLeft = x + SAMPLE_LENGTH + LEGEND_INNER_GAP;
      const textWidthOf = entry.width - SAMPLE_LENGTH - LEGEND_INNER_GAP;
      for (const node of textLines(entry.lines, textLeft + textWidthOf / 2, y, fontSize, defaultStyle.colors.text)) nodes.push(node);
      x += entry.width + LEGEND_ENTRY_GAP;
    }
    y += height + GAP / 2;
  }
  return { nodes, height: y - GAP / 2 - top };
}

/**
 * The line graph's layout (DGP-REQ-010..015): the title; the plot, with the value axis on the left
 * (its label read upward beside it) and the categories along the bottom, one evenly spaced slot
 * each; each series as a line through one point per category, in its own color and dash pattern,
 * with its own marker at every point; the category names and the category-axis label below; and,
 * for more than one series, the legend. A default scale includes every value and extends below
 * zero for negative ones. Every number goes through `fmt()` (AD-007).
 */
// @spec DGP-REQ-010, DGP-REQ-012, DGP-REQ-014, DGP-REQ-015
export const lineGraphLayout: Layout<LineGraph> = (g: LineGraph, provenance: Provenance): Scene => {
  const nodes: SceneNode[] = [];
  const title = titleBlock(g.title);
  for (const node of title.nodes) nodes.push(node);

  const values: number[] = [];
  for (const series of g.series) for (const value of series.values) values.push(value);
  const scale = resolveValueScale(g.valueScale, values, { allowNegative: true });

  // Left of the plot: the value-axis label, then the tick labels and ticks.
  const valueLabel = axisLabelLines(g.valueAxisLabel, PLOT_HEIGHT);
  const labelDepth = axisLabelDepth(valueLabel);
  const left = SCENE_MARGIN + (labelDepth > 0 ? labelDepth + GAP : 0) + valueAxisExtent(scale, "vertical");
  const box: Box = { x: left, y: title.height + GAP + TOP_TICK_ROOM, width: SCENE_WIDTH - SCENE_MARGIN - left, height: PLOT_HEIGHT };
  const bottom = box.y + box.height;

  for (const node of drawValueAxisLabel(valueLabel, SCENE_MARGIN, box)) nodes.push(node);
  for (const node of drawValueAxis(scale, "vertical", box)) nodes.push(node);
  // The category axis along the bottom of the plot.
  nodes.push({
    kind: "line",
    attrs: [
      ["x1", fmt(box.x)],
      ["y1", fmt(bottom)],
      ["x2", fmt(box.x + box.width)],
      ["y2", fmt(bottom)],
      ["stroke", defaultStyle.colors.line],
      ["stroke-width", fmt(defaultStyle.lineWidths.axis)],
    ],
  });

  // The series: every line first, then every marker, so no line covers a point.
  const slots = categorySlots(g.categories, box, "vertical");
  const at = valuePosition(scale, "vertical", box);
  const markers: SceneNode[] = [];
  g.series.forEach((series, s) => {
    const style = seriesStyleOf(series, s);
    const points: Array<readonly [number, number]> = [];
    for (const slot of slots) {
      const value = series.values[slot.index];
      if (value !== undefined) points.push([slot.center, at(value)]);
    }
    for (const node of seriesLine(points, style)) nodes.push(node);
    for (const [x, y] of points) markers.push(drawMarker(style.marker, x, y, style.color));
  });
  for (const node of markers) nodes.push(node);

  // Below the plot: the category names, clear of a marker on the bottom edge, the category-axis
  // label and the legend.
  let nameHeight = 0;
  for (const slot of slots) nameHeight = Math.max(nameHeight, slot.labelHeight);
  for (const node of drawCategoryNames(slots, "vertical", { ...box, height: box.height + MARKER_REACH })) nodes.push(node);
  let y = bottom + MARKER_REACH + NAME_GAP + nameHeight;
  const categoryLabel = axisLabelLines(g.categoryAxisLabel, SCENE_WIDTH - 2 * SCENE_MARGIN);
  if (categoryLabel.length > 0) {
    // Centered on the drawing, so a two-line label is never wider than the space it has.
    const full: Box = { x: SCENE_MARGIN, y: box.y, width: SCENE_WIDTH - 2 * SCENE_MARGIN, height: box.height };
    for (const node of drawCategoryAxisLabel(categoryLabel, full, y + GAP)) nodes.push(node);
    y += GAP + axisLabelDepth(categoryLabel);
  }
  const legend = drawLegend(g, y + GAP);
  for (const node of legend.nodes) nodes.push(node);
  if (legend.height > 0) y += GAP + legend.height;

  return {
    width: SCENE_WIDTH,
    height: fmt(y + SCENE_MARGIN),
    textAlternative: lineGraphDefinition.describe(g, provenance),
    nodes,
  };
};
