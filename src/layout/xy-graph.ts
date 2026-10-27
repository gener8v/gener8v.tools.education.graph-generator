import { type XyGraph, PLANE_MAX_RATIO, planeShape, quadrantCount, xyGraph as xyGraphDefinition } from "../core/definitions/xy-graph";
import type { Axis } from "../core/definitions/axis";
import { cleanText } from "../core/format";
import type { Provenance } from "../core/result";
import { defaultStyle } from "../core/style";
import { niceTicks } from "../core/value-scale";
import { drawAxis } from "./kit/axis";
import { fmt } from "./kit/format";
import { type Box, type Obstacle, placeLabel } from "./kit/labels";
import { MARKER_REACH, drawMarker } from "./kit/markers";
import { linearScale } from "./kit/scale";
import { DEFAULT_FONT_STACK, textWidth } from "./kit/text";
import { tickLabel } from "./kit/ticks";
import { LINE_HEIGHT, SCENE_MARGIN, textBlock, textLines, titleBlock } from "./kit/title";
import { TICK_LABEL_DROP, axisLabelDepth, axisLabelLines, drawBottomAxisLabel, drawLeftAxisLabel } from "./kit/value-scale";
import type { Layout } from "./registry";
import { SCENE_WIDTH, type Scene, type SceneNode } from "./scene";

/**
 * The tallest a plot is drawn: a little less than the drawing's width, so a square plane fits a
 * page column beside its text. A plot that would be taller at equal units is narrowed instead,
 * centered, down to `MIN_PLOT_WIDTH` (NLC-REQ-032).
 */
export const MAX_PLOT_HEIGHT = 360;
/**
 * The narrowest a plot is drawn, still room for a few tick labels: the tallest plot over the
 * tallest ratio `planeShape` keeps (`PLANE_MAX_RATIO`), so the layout and the text alternative
 * agree on when units stop being equal.
 */
export const MIN_PLOT_WIDTH = MAX_PLOT_HEIGHT / PLANE_MAX_RATIO;
/** The length the y-axis label wraps to, read upward beside the plot; it may reach past a short plot. */
const Y_LABEL_LENGTH = 160;
/** Point and segment labels wider than this wrap, to at most `LABEL_MAX_LINES` lines. */
const LABEL_MAX_WIDTH = 120;
/**
 * A point or segment label longer than this many lines is cut, ending in "…", so caller text yields
 * a bounded Scene; the text alternative states it whole (GSS TICKET-002 SEC-001).
 */
export const LABEL_MAX_LINES = 2;
/** How many rows outward from a point its label may move, to clear the labels near it. */
const LABEL_ROWS = 2;
/** Space between the plot, its labels and the title, and between a label and what it labels. */
const GAP = 4;
/** How far a tick label sits from its tick, as `drawAxis` places it. */
const TICK_LABEL_GAP = 4;

/** Where the plane's axes go, and the plot's size, for two axis ranges. */
export interface PlaneAxes {
  /** How many quadrants the ranges show: 1, 2 or 4 (NLC-REQ-023). */
  readonly quadrants: number;
  /** The y value the x-axis is drawn at: 0, or the y range's end nearest it (NLC-REQ-024, NLC-REQ-025). */
  readonly xAxisAt: number;
  /** The x value the y-axis is drawn at: 0, or the x range's end nearest it. */
  readonly yAxisAt: number;
  /** Which side of the x-axis its tick labels go: above only on the top edge, so they stay outside the plot. */
  readonly xLabelSide: "below" | "above";
  /** Which side of the y-axis its tick labels go: right only on the right edge. */
  readonly yLabelSide: "left" | "right";
  /** The plot's size within `maxWidth`, and whether one x unit and one y unit have the same length. */
  readonly width: number;
  readonly height: number;
  readonly equalUnits: boolean;
}

/** `value` held to `[min, max]`: 0 for a range that includes it, else its nearest end. */
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * The plane for an x range and a y range (NLC-REQ-023..025, NLC-REQ-032):
 * - the quadrants shown, from whether each range has values on both sides of zero;
 * - each axis through the origin when the other's range includes zero, else along the nearest edge:
 *   the x-axis at the bottom for a positive-only y range and at the top for a negative-only one,
 *   the y-axis at the left for a positive-only x range and at the right for a negative-only one;
 * - the plot's size at equal units (TC-001: from the ranges, never the container): height = width ×
 *   y span / x span. Too tall, it is narrowed to `MAX_PLOT_HEIGHT` tall, down to `MIN_PLOT_WIDTH`
 *   wide; still too tall, or flatter than `PLANE_MIN_RATIO`, its ratio is held at the bound and the
 *   units differ (`planeShape`, which the text alternative states).
 */
// @spec NLC-REQ-023, NLC-REQ-024, NLC-REQ-025, NLC-REQ-032
export function planeAxes(xRange: readonly [number, number], yRange: readonly [number, number], maxWidth = SCENE_WIDTH - 2 * SCENE_MARGIN): PlaneAxes {
  const [xAxis, yAxis]: Axis[] = [
    { min: xRange[0], max: xRange[1] },
    { min: yRange[0], max: yRange[1] },
  ];
  const { ratio, equalUnits } = planeShape(xAxis!, yAxis!);
  const width = Math.min(maxWidth, MAX_PLOT_HEIGHT / ratio);
  return {
    quadrants: quadrantCount(xAxis!, yAxis!),
    xAxisAt: clamp(0, yRange[0], yRange[1]),
    yAxisAt: clamp(0, xRange[0], xRange[1]),
    xLabelSide: yRange[1] < 0 ? "above" : "below",
    yLabelSide: xRange[1] < 0 ? "right" : "left",
    width,
    height: width * ratio,
    equalUnits,
  };
}

/** The widest of `texts` at the tick-label size, by a loop (never a spread). */
function widest(texts: Iterable<string>): number {
  let width = 0;
  for (const text of texts) width = Math.max(width, textWidth(text, defaultStyle.fontSizes.tickLabel));
  return width;
}

const line = (x1: number, y1: number, x2: number, y2: number, color: string, width: number): SceneNode => ({
  kind: "line",
  attrs: [
    ["x1", fmt(x1)],
    ["y1", fmt(y1)],
    ["x2", fmt(x2)],
    ["y2", fmt(y2)],
    ["stroke", color],
    ["stroke-width", fmt(width)],
  ],
});

/** A label to place: its wrapped lines and box size, and where it may go, in order of preference. */
interface PendingLabel {
  readonly lines: string[];
  readonly width: number;
  readonly height: number;
  readonly candidates: Array<{ x: number; y: number }>;
}

/**
 * The x,y graph's layout (AD-002). From the top: the title (`titleBlock`), then the plot with the
 * y-axis label read upward on its left and the x-axis label centered below it (`axisLabelLines`,
 * NLC-REQ-031).
 *
 * The plot is sized by `planeAxes` from the room left beside the y tick labels and half the widest x
 * tick label, and centered in that room. With `showGrid`, a grid line crosses the plot at every
 * tick of both axes, under everything else, and nowhere else (NLC-REQ-026). Each axis is drawn by
 * `drawAxis` with its own ticks (`niceTicks`, its own spacing, NLC-REQ-027) at the place
 * `planeAxes` gives, so an edge axis is ticked and labeled with its true values (NLC-REQ-025). The
 * origin is labeled once, by the x-axis: the y-axis leaves its 0 blank where the x-axis crosses
 * it, and when the y-axis runs down through the x-axis's 0, that "0" moves below-left of the origin
 * where the neighbouring tick labels leave room for it.
 *
 * Segments are lines between their ends (NLC-REQ-029), then points circle markers at their
 * coordinates (NLC-REQ-028), each in its own color or the accent (NLC-REQ-030, NLC-REQ-011). Labels,
 * wrapped and cut to `LABEL_MAX_LINES`, are placed by `placeLabel` clear of the axes, the
 * segments, the markers and every label placed before: a point's beside it, a segment's at its
 * middle. A label with no clear place takes its first candidate (NLC OQ-005). Every number passes
 * through `fmt()` (AD-007), and no caller-sized list is spread into arguments.
 */
// @spec NLC-REQ-007, NLC-REQ-022, NLC-REQ-024, NLC-REQ-025, NLC-REQ-026, NLC-REQ-027, NLC-REQ-028, NLC-REQ-029, NLC-REQ-030, NLC-REQ-031
export const xyGraphLayout: Layout<XyGraph> = (graph: XyGraph, provenance: Provenance): Scene => {
  const { xAxis, yAxis } = graph;
  const xTicks = niceTicks(xAxis.min, xAxis.max, Object.hasOwn(xAxis, "tickSpacing") ? xAxis.tickSpacing : undefined);
  const yTicks = niceTicks(yAxis.min, yAxis.max, Object.hasOwn(yAxis, "tickSpacing") ? yAxis.tickSpacing : undefined);
  const showX = xAxis.showTickLabels !== false;
  const showY = yAxis.showTickLabels !== false;
  const tickFont = defaultStyle.fontSizes.tickLabel;
  const half = defaultStyle.tickLength / 2;
  // Where the axes go, which no width changes; the plot's size is taken again once the room is known.
  const shape = planeAxes([xAxis.min, xAxis.max], [yAxis.min, yAxis.max]);

  // The origin is labeled once: the y-axis leaves its 0 blank where the x-axis crosses it, and the
  // x-axis leaves its 0 blank where the y-axis runs down through it, writing it below-left instead.
  const yZeroBlank = shape.xAxisAt === 0;
  const xZeroBlank = shape.yAxisAt === 0 && yAxis.min < 0;
  const yLabels = new Map<number, string>(yZeroBlank ? [[0, ""]] : []);
  const xLabels = new Map<number, string>(xZeroBlank ? [[0, ""]] : []);

  // Room beside the plot: the y-axis label and the y tick labels on their side, half the widest x
  // tick label at either end, and a marker's reach for a point on the edge.
  const yLabel = axisLabelLines(graph.yAxisLabel, Y_LABEL_LENGTH);
  const yLabelRoom = yLabel.length > 0 ? axisLabelDepth(yLabel) + GAP : 0;
  const yTickRoom = half + (showY ? TICK_LABEL_GAP + widest(yTicks.ticks.map((tick) => (yLabels.get(tick) ?? tickLabel(tick, yTicks.spacing)))) : 0);
  const xOverhang = showX ? widest(xTicks.ticks.map((tick) => tickLabel(tick, xTicks.spacing))) / 2 : 0;
  const left = SCENE_MARGIN + yLabelRoom + Math.max(MARKER_REACH, xOverhang, shape.yLabelSide === "left" ? yTickRoom : 0);
  const right = SCENE_WIDTH - SCENE_MARGIN - Math.max(MARKER_REACH, xOverhang, shape.yLabelSide === "right" ? yTickRoom : 0);
  const plane = planeAxes([xAxis.min, xAxis.max], [yAxis.min, yAxis.max], right - left);
  const plotLeft = left + (right - left - plane.width) / 2;
  const plotRight = plotLeft + plane.width;

  // Room above and below: the x tick labels on their side, half a y tick label, a marker's reach,
  // and room for the y-axis label where it reaches past a short plot.
  const xTickRoom = half + (showX ? TICK_LABEL_GAP + tickFont * LINE_HEIGHT : 0);
  const edge = Math.max(MARKER_REACH, showY ? tickFont / 2 : 0);
  let yLabelReach = 0;
  for (const text of yLabel) yLabelReach = Math.max(yLabelReach, textWidth(text, defaultStyle.fontSizes.label) / 2);
  const overhang = Math.max(0, yLabelReach - plane.height / 2);
  const title = titleBlock(graph.title);
  const plotTop = title.height + SCENE_MARGIN + Math.max(edge, plane.xLabelSide === "above" ? xTickRoom : 0, overhang);
  const plotBottom = plotTop + plane.height;
  const xOf = linearScale([xAxis.min, xAxis.max], [plotLeft, plotRight]);
  const yOf = linearScale([yAxis.min, yAxis.max], [plotBottom, plotTop]);
  const [originX, originY] = [xOf(plane.yAxisAt), yOf(plane.xAxisAt)];

  const nodes: SceneNode[] = [];
  for (const node of title.nodes) nodes.push(node);

  // The grid, under everything: one line across the plot at every tick of each axis.
  if (graph.showGrid === true) {
    const { grid } = defaultStyle.colors;
    for (const tick of xTicks.ticks) nodes.push(line(xOf(tick), plotTop, xOf(tick), plotBottom, grid, defaultStyle.lineWidths.grid));
    for (const tick of yTicks.ticks) nodes.push(line(plotLeft, yOf(tick), plotRight, yOf(tick), grid, defaultStyle.lineWidths.grid));
  }

  const axes = [
    { from: [plotLeft, originY], to: [plotRight, originY], domain: [xAxis.min, xAxis.max], ...xTicks, labels: xLabels, showTickLabels: showX, side: plane.xLabelSide },
    { from: [originX, plotBottom], to: [originX, plotTop], domain: [yAxis.min, yAxis.max], ...yTicks, labels: yLabels, showTickLabels: showY, side: plane.yLabelSide },
  ] as const;
  for (const options of axes) for (const node of drawAxis(options)) nodes.push(node);
  // The origin's own "0", below-left of it, where it clears the x tick label left of the origin and
  // the y tick label below it; on axes ticked too densely for that the origin is left unlabeled.
  const zeroRight = originX - half - TICK_LABEL_GAP;
  const zeroTop = originY + half + TICK_LABEL_GAP;
  const [before, below] = [-xTicks.spacing, -yTicks.spacing];
  const clearOfX = before < xAxis.min || xOf(before) + textWidth(tickLabel(before, xTicks.spacing), tickFont) / 2 + GAP <= zeroRight - textWidth("0", tickFont);
  const clearOfY = !showY || below < yAxis.min || yOf(below) + tickFont * (TICK_LABEL_DROP - 0.8) >= zeroTop + tickFont + GAP;
  if (xZeroBlank && showX && clearOfX && clearOfY) {
    nodes.push({
      kind: "text",
      attrs: [
        ["x", fmt(zeroRight)],
        ["y", fmt(zeroTop + tickFont * 0.8)],
        ["fill", defaultStyle.colors.text],
        ["font-family", DEFAULT_FONT_STACK],
        ["font-size", fmt(tickFont)],
        ["text-anchor", "end"],
      ],
      text: "0",
    });
  }

  // Segments, then the points' markers over them.
  const accent = defaultStyle.colors.accent;
  const segments = graph.segments ?? [];
  const points = graph.points ?? [];
  const obstacles: Obstacle[] = [
    { x1: plotLeft, y1: originY, x2: plotRight, y2: originY },
    { x1: originX, y1: plotBottom, x2: originX, y2: plotTop },
  ];
  for (const { from, to, color } of segments) {
    const [x1, y1, x2, y2] = [xOf(from.x), yOf(from.y), xOf(to.x), yOf(to.y)];
    nodes.push(line(x1, y1, x2, y2, color ?? accent, defaultStyle.lineWidths.figure));
    obstacles.push({ x1, y1, x2, y2 });
  }
  for (const { x, y, color } of points) {
    nodes.push(drawMarker("circle", xOf(x), yOf(y), color ?? accent));
    obstacles.push({ x: xOf(x) - MARKER_REACH, y: yOf(y) - MARKER_REACH, width: 2 * MARKER_REACH, height: 2 * MARKER_REACH });
  }

  // Labels: each candidate kept inside the plot, give or take a marker's reach.
  const labelFont = defaultStyle.fontSizes.label;
  const within = (at: number, low: number, high: number, size: number) => clamp(at, low - MARKER_REACH, Math.max(low - MARKER_REACH, high + MARKER_REACH - size));
  const inside = (x: number, y: number, width: number, height: number) => ({ x: within(x, plotLeft, plotRight, width), y: within(y, plotTop, plotBottom, height) });
  const pending = (label: string | undefined, around: (width: number, height: number) => Array<[number, number]>): PendingLabel | undefined => {
    const text = label === undefined ? "" : cleanText(label);
    if (text === "") return undefined;
    const { lines, width, height } = textBlock(text, LABEL_MAX_WIDTH, labelFont, LABEL_MAX_LINES);
    return { lines, width, height, candidates: around(width, height).map(([x, y]) => inside(x, y, width, height)) };
  };
  const reach = MARKER_REACH + GAP / 2;
  const labels: PendingLabel[] = [];
  for (const { from, to, label } of segments) {
    const [mx, my] = [(xOf(from.x) + xOf(to.x)) / 2, (yOf(from.y) + yOf(to.y)) / 2];
    // Centered above or below the middle, then beside it, then off each corner, which clears a
    // level or upright segment and an axis through the middle.
    const placed = pending(label, (w, h) => [
      [mx - w / 2, my - GAP - h],
      [mx - w / 2, my + GAP],
      [mx + GAP, my - h / 2],
      [mx - GAP - w, my - h / 2],
      [mx + GAP, my - GAP - h],
      [mx - GAP - w, my - GAP - h],
      [mx + GAP, my + GAP],
      [mx - GAP - w, my + GAP],
    ]);
    if (placed !== undefined) labels.push(placed);
  }
  for (const { x, y, label } of points) {
    const [px, py] = [xOf(x), yOf(y)];
    // Off each corner of the marker, then centered above and below it, on `LABEL_ROWS` rows
    // outward, so labels of points close together find room.
    const placed = pending(label, (w, h) => {
      const candidates: Array<[number, number]> = [];
      for (let row = 0; row < LABEL_ROWS; row++) {
        const [above, below] = [py - reach - h - row * (h + GAP), py + reach + row * (h + GAP)];
        for (const y of [above, below]) candidates.push([px + reach, y], [px - reach - w, y]);
        candidates.push([px - w / 2, above], [px - w / 2, below]);
      }
      return candidates;
    });
    if (placed !== undefined) labels.push(placed);
  }
  let bottom = plotBottom + Math.max(edge, plane.xLabelSide === "below" ? xTickRoom : 0, overhang);
  for (const { lines, width, height, candidates } of labels) {
    const box: Box = placeLabel({ width, height }, candidates, obstacles) ?? { ...candidates[0]!, width, height };
    obstacles.push(box);
    bottom = Math.max(bottom, box.y + box.height);
    for (const node of textLines(lines, box.x + box.width / 2, box.y, labelFont, defaultStyle.colors.text)) nodes.push(node);
  }

  // The axis labels: the y-axis's read upward on the left, centered on the plot; the x-axis's below.
  const plotBox: Box = { x: plotLeft, y: plotTop, width: plane.width, height: plane.height };
  // Beside the plot however far it was narrowed, so the label stays next to its axis.
  for (const node of drawLeftAxisLabel(yLabel, SCENE_MARGIN + plotLeft - left, plotBox)) nodes.push(node);
  const xLabel = axisLabelLines(graph.xAxisLabel, right - left);
  if (xLabel.length > 0) {
    for (const node of drawBottomAxisLabel(xLabel, { ...plotBox, x: left, width: right - left }, bottom + GAP)) nodes.push(node);
    bottom += GAP + axisLabelDepth(xLabel);
  }

  return {
    width: SCENE_WIDTH,
    height: fmt(bottom + SCENE_MARGIN),
    textAlternative: xyGraphDefinition.describe(graph, provenance),
    nodes,
  };
};
