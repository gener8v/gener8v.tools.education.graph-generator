import { type XyGraph, MAX_PLOT_HEIGHT, PLANE_MAX_RATIO, planeRooms, planeShape, quadrantCount, xyGraph as xyGraphDefinition } from "../core/definitions/xy-graph";
import type { Axis } from "../core/definitions/axis";
import type { Provenance } from "../core/result";
import { defaultStyle } from "../core/style";
import { niceTicks } from "../core/value-scale";
import { drawAxis, drawLine } from "./kit/axis";
import { fmt } from "./kit/format";
import { type Box, type Obstacle, type PlacedLabel, placeElementLabel } from "./kit/labels";
import { MARKER_REACH, drawMarker } from "./kit/markers";
import { linearScale } from "./kit/scale";
import { DEFAULT_FONT_STACK, textWidth } from "./kit/text";
import { tickLabel } from "./kit/ticks";
import { BASELINE, LINE_HEIGHT, SCENE_MARGIN, textLines, titleBlock } from "./kit/title";
import { TICK_LABEL_DROP, axisLabelDepth, axisLabelLines, drawBottomAxisLabel, drawLeftAxisLabel } from "./kit/value-scale";
import type { Layout } from "./registry";
import { SCENE_WIDTH, type Scene, type SceneNode } from "./scene";

// The label cut is the kit's, the same as the number line's (quality review QR-002 on NLC TICKET-003).
export { ELEMENT_LABEL_MAX_LINES as LABEL_MAX_LINES } from "./kit/labels";

// The tallest plot is core's, so the default tick spacing can read it (NLC TICKET-009).
export { MAX_PLOT_HEIGHT };
/**
 * The narrowest a plot is drawn, still room for a few tick labels: the tallest plot over the
 * tallest ratio `planeShape` keeps (`PLANE_MAX_RATIO`), so the layout and the text alternative
 * agree on when units stop being equal.
 */
export const MIN_PLOT_WIDTH = MAX_PLOT_HEIGHT / PLANE_MAX_RATIO;
/** The length the y-axis label wraps to, read upward beside the plot; it may reach past a short plot. */
const Y_LABEL_LENGTH = 160;
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

/** `value` held to `[min, max]`. */
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
  const xAxis: Axis = { min: xRange[0], max: xRange[1] };
  const yAxis: Axis = { min: yRange[0], max: yRange[1] };
  const { ratio, equalUnits } = planeShape(xAxis, yAxis);
  const width = Math.min(maxWidth, MAX_PLOT_HEIGHT / ratio);
  return {
    quadrants: quadrantCount(xAxis, yAxis),
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

/** Each axis's ticks (`niceTicks`, at its own spacing, NLC-REQ-027) and whether its tick labels show. */
interface PlaneTicks {
  readonly x: { readonly ticks: number[]; readonly spacing: number };
  readonly y: { readonly ticks: number[]; readonly spacing: number };
  readonly showX: boolean;
  readonly showY: boolean;
}

/** Which axes leave their tick label at 0 blank, so the origin is labeled once. */
interface ZeroBlanks {
  readonly x: boolean;
  readonly y: boolean;
}

/**
 * The plot on the page: its sides, the page x of the y-axis and the page y of the x-axis, and the
 * page position of an x or a y value (NLC-REQ-007). What every phase after `plotRoom` reads
 * (quality review QR-001 on NLC TICKET-003).
 */
interface Plot {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  readonly originX: number;
  readonly originY: number;
  readonly xOf: (x: number) => number;
  readonly yOf: (y: number) => number;
}

/** The plot `plotRoom` sizes and places, the room it is centered in, and the depth its edge needs below it. */
interface PlotRoom {
  /** The plane sized to the room (`planeAxes`). */
  readonly plane: PlaneAxes;
  readonly plot: Plot;
  /** The room across the drawing the plot is centered in, left of the y-axis label's room excluded. */
  readonly left: number;
  readonly right: number;
  /** How far below the plot the x tick labels, a marker's reach, half a y tick label or the y-axis label reach. */
  readonly below: number;
}

/**
 * The plot sized and placed (NLC-REQ-031, NLC-REQ-032). Room beside it: the y-axis label and the y
 * tick labels (`yTickLabels` in place of their value) on their side of `axes`, half the widest x
 * tick label at either end, and a marker's reach for a point on the edge. `planeAxes` sizes the
 * plane within that room, and the plot is centered in it. Room above and below it: the x tick
 * labels on their side, half a y tick label, a marker's reach, and room for the y-axis label where
 * it reaches past a short plot; the plot starts below the title's `titleHeight` (quality review
 * QR-001 on NLC TICKET-003).
 */
// @spec NLC-REQ-007, NLC-REQ-031, NLC-REQ-032
function plotRoom(
  graph: XyGraph,
  axes: PlaneAxes,
  ticks: PlaneTicks,
  yTickLabels: ReadonlyMap<number, string>,
  yLabel: readonly string[],
  titleHeight: number,
): PlotRoom {
  const { xAxis, yAxis } = graph;
  const { x: xTicks, y: yTicks, showX, showY } = ticks;
  const tickFont = defaultStyle.fontSizes.tickLabel;
  const half = defaultStyle.tickLength / 2;
  const yLabelRoom = yLabel.length > 0 ? axisLabelDepth(yLabel) + GAP : 0;
  const yTickRoom = half + (showY ? TICK_LABEL_GAP + widest(yTicks.ticks.map((tick) => (yTickLabels.get(tick) ?? tickLabel(tick, yTicks.spacing)))) : 0);
  const xOverhang = showX ? widest(xTicks.ticks.map((tick) => tickLabel(tick, xTicks.spacing))) / 2 : 0;
  const left = SCENE_MARGIN + yLabelRoom + Math.max(MARKER_REACH, xOverhang, axes.yLabelSide === "left" ? yTickRoom : 0);
  const right = SCENE_WIDTH - SCENE_MARGIN - Math.max(MARKER_REACH, xOverhang, axes.yLabelSide === "right" ? yTickRoom : 0);
  const plane = planeAxes([xAxis.min, xAxis.max], [yAxis.min, yAxis.max], right - left);
  const plotLeft = left + (right - left - plane.width) / 2;
  const plotRight = plotLeft + plane.width;

  const xTickRoom = half + (showX ? TICK_LABEL_GAP + tickFont * LINE_HEIGHT : 0);
  const edge = Math.max(MARKER_REACH, showY ? tickFont / 2 : 0);
  let yLabelReach = 0;
  for (const text of yLabel) yLabelReach = Math.max(yLabelReach, textWidth(text, defaultStyle.fontSizes.label) / 2);
  const overhang = Math.max(0, yLabelReach - plane.height / 2);
  const plotTop = titleHeight + SCENE_MARGIN + Math.max(edge, plane.xLabelSide === "above" ? xTickRoom : 0, overhang);
  const plotBottom = plotTop + plane.height;
  const xOf = linearScale([xAxis.min, xAxis.max], [plotLeft, plotRight]);
  const yOf = linearScale([yAxis.min, yAxis.max], [plotBottom, plotTop]);
  return {
    plane,
    plot: { left: plotLeft, right: plotRight, top: plotTop, bottom: plotBottom, originX: xOf(plane.yAxisAt), originY: yOf(plane.xAxisAt), xOf, yOf },
    left,
    right,
    below: Math.max(edge, plane.xLabelSide === "below" ? xTickRoom : 0, overhang),
  };
}

/**
 * Which axes leave their 0 blank. The origin is labeled once, and only where the axes cross at
 * (0, 0); an edge axis labels its 0 as the true value it is (code review CR-001). At the origin, the
 * x-axis leaves its 0 blank where the y-axis runs down through it, and the y-axis leaves its 0
 * blank where the x-axis would label the origin or runs left through the label; the "0" is then
 * written below-left of the origin (`originLabel`).
 */
// @spec NLC-REQ-024, NLC-REQ-025
function zeroBlanks(graph: XyGraph, axes: PlaneAxes, showX: boolean): ZeroBlanks {
  const atOrigin = axes.xAxisAt === 0 && axes.yAxisAt === 0;
  return { x: atOrigin && graph.yAxis.min < 0, y: atOrigin && (showX || graph.xAxis.min < 0) };
}

/**
 * Whether the origin's "0", ending at `zeroRight` with its top at `zeroTop`, clears by `GAP` the x
 * tick label left of the origin and the y tick label below it. An axis with hidden tick labels, or
 * no tick there, is clear. The y tick label's top is its baseline, `TICK_LABEL_DROP` of the font
 * size below its tick (`drawAxis`), less `BASELINE` of it (quality review QR-006 on NLC TICKET-003).
 */
function originLabelFits(graph: XyGraph, ticks: PlaneTicks, plot: Plot, zeroRight: number, zeroTop: number): boolean {
  const { x: xTicks, y: yTicks, showX, showY } = ticks;
  const tickFont = defaultStyle.fontSizes.tickLabel;
  const [before, below] = [-xTicks.spacing, -yTicks.spacing];
  const clearOfX =
    !showX || before < graph.xAxis.min || plot.xOf(before) + textWidth(tickLabel(before, xTicks.spacing), tickFont) / 2 + GAP <= zeroRight - textWidth("0", tickFont);
  const clearOfY = !showY || below < graph.yAxis.min || plot.yOf(below) + tickFont * (TICK_LABEL_DROP - BASELINE) >= zeroTop + tickFont + GAP;
  return clearOfX && clearOfY;
}

/**
 * The origin's own "0", below-left of it, written for whichever axis blanked its own 0 and shows
 * its tick labels: the x-axis's, else the y-axis's. `undefined` when neither did, or where the "0"
 * would not clear the neighbouring tick labels (`originLabelFits`): on axes ticked too densely the
 * origin is left unlabeled (quality review QR-001 on NLC TICKET-003).
 */
// @spec NLC-REQ-024
function originLabel(graph: XyGraph, ticks: PlaneTicks, blanks: ZeroBlanks, plot: Plot): SceneNode | undefined {
  if (!(ticks.showX ? blanks.x : ticks.showY && blanks.y)) return undefined;
  const tickFont = defaultStyle.fontSizes.tickLabel;
  const half = defaultStyle.tickLength / 2;
  const zeroRight = plot.originX - half - TICK_LABEL_GAP;
  const zeroTop = plot.originY + half + TICK_LABEL_GAP;
  if (!originLabelFits(graph, ticks, plot, zeroRight, zeroTop)) return undefined;
  return {
    kind: "text",
    attrs: [
      ["x", fmt(zeroRight)],
      ["y", fmt(zeroTop + tickFont * BASELINE)],
      ["fill", defaultStyle.colors.text],
      ["font-family", DEFAULT_FONT_STACK],
      ["font-size", fmt(tickFont)],
      ["text-anchor", "end"],
    ],
    text: "0",
  };
}

/** With `showGrid`, one line across the plot at every tick of each axis; none without (NLC-REQ-026). */
// @spec NLC-REQ-026
function gridLines(graph: XyGraph, ticks: PlaneTicks, plot: Plot): SceneNode[] {
  if (graph.showGrid !== true) return [];
  const { grid } = defaultStyle.colors;
  const width = defaultStyle.lineWidths.grid;
  const nodes: SceneNode[] = [];
  for (const tick of ticks.x.ticks) nodes.push(drawLine(plot.xOf(tick), plot.top, plot.xOf(tick), plot.bottom, width, grid));
  for (const tick of ticks.y.ticks) nodes.push(drawLine(plot.left, plot.yOf(tick), plot.right, plot.yOf(tick), width, grid));
  return nodes;
}

/**
 * The segments, lines between their ends (NLC-REQ-029), then the points' circle markers over them
 * at their coordinates (NLC-REQ-028), each in its own color or the accent (NLC-REQ-030,
 * NLC-REQ-011). With them, what a label must clear: both axes, the segments and the markers.
 */
// @spec NLC-REQ-007, NLC-REQ-011, NLC-REQ-028, NLC-REQ-029, NLC-REQ-030
function figures(graph: XyGraph, plot: Plot): { nodes: SceneNode[]; obstacles: Obstacle[] } {
  const { xOf, yOf } = plot;
  const accent = defaultStyle.colors.accent;
  const nodes: SceneNode[] = [];
  const obstacles: Obstacle[] = [
    { x1: plot.left, y1: plot.originY, x2: plot.right, y2: plot.originY },
    { x1: plot.originX, y1: plot.bottom, x2: plot.originX, y2: plot.top },
  ];
  for (const { from, to, color } of graph.segments ?? []) {
    const [x1, y1, x2, y2] = [xOf(from.x), yOf(from.y), xOf(to.x), yOf(to.y)];
    nodes.push(drawLine(x1, y1, x2, y2, defaultStyle.lineWidths.figure, color ?? accent));
    obstacles.push({ x1, y1, x2, y2 });
  }
  for (const { x, y, color } of graph.points ?? []) {
    nodes.push(drawMarker("circle", xOf(x), yOf(y), color ?? accent));
    obstacles.push({ x: xOf(x) - MARKER_REACH, y: yOf(y) - MARKER_REACH, width: 2 * MARKER_REACH, height: 2 * MARKER_REACH });
  }
  return { nodes, obstacles };
}

/**
 * The segment labels, then the point labels, each placed by `placeElementLabel` clear of
 * `obstacles` and every label placed before it, at a candidate kept inside the plot, give or take a
 * marker's reach. A segment's goes at its middle, a point's beside its marker (NLC-REQ-011,
 * NLC-REQ-030; quality review QR-001 on NLC TICKET-003).
 */
// @spec NLC-REQ-011, NLC-REQ-030
function elementLabels(graph: XyGraph, plot: Plot, obstacles: Obstacle[]): PlacedLabel[] {
  const { xOf, yOf } = plot;
  // Each candidate, given as [x, y] for a label's size, kept inside the plot, give or take a marker's reach.
  const within = (at: number, low: number, high: number, size: number) => clamp(at, low - MARKER_REACH, Math.max(low - MARKER_REACH, high + MARKER_REACH - size));
  const inside =
    (around: (width: number, height: number) => Array<[number, number]>) =>
    (width: number, height: number): Array<{ x: number; y: number }> =>
      around(width, height).map(([x, y]) => ({ x: within(x, plot.left, plot.right, width), y: within(y, plot.top, plot.bottom, height) }));
  const reach = MARKER_REACH + GAP / 2;
  const labels: PlacedLabel[] = [];
  for (const { from, to, label } of graph.segments ?? []) {
    const [mx, my] = [(xOf(from.x) + xOf(to.x)) / 2, (yOf(from.y) + yOf(to.y)) / 2];
    // Centered above or below the middle, then beside it, then off each corner, which clears a
    // level or upright segment and an axis through the middle.
    const placed = placeElementLabel(
      label,
      inside((w, h) => [
        [mx - w / 2, my - GAP - h],
        [mx - w / 2, my + GAP],
        [mx + GAP, my - h / 2],
        [mx - GAP - w, my - h / 2],
        [mx + GAP, my - GAP - h],
        [mx - GAP - w, my - GAP - h],
        [mx + GAP, my + GAP],
        [mx - GAP - w, my + GAP],
      ]),
      obstacles,
    );
    if (placed !== undefined) labels.push(placed);
  }
  for (const { x, y, label } of graph.points ?? []) {
    const [px, py] = [xOf(x), yOf(y)];
    // Off each corner of the marker, then centered above and below it, on `LABEL_ROWS` rows
    // outward, so labels of points close together find room.
    const placed = placeElementLabel(
      label,
      inside((w, h) => {
        const candidates: Array<[number, number]> = [];
        for (let row = 0; row < LABEL_ROWS; row++) {
          const [above, below] = [py - reach - h - row * (h + GAP), py + reach + row * (h + GAP)];
          for (const at of [above, below]) candidates.push([px + reach, at], [px - reach - w, at]);
          candidates.push([px - w / 2, above], [px - w / 2, below]);
        }
        return candidates;
      }),
      obstacles,
    );
    if (placed !== undefined) labels.push(placed);
  }
  return labels;
}

/**
 * The x,y graph's layout (AD-002). From the top: the title (`titleBlock`), then the plot with the
 * y-axis label read upward on its left and the x-axis label centered below it (`axisLabelLines`,
 * NLC-REQ-031). By phase (quality review QR-001 on NLC TICKET-003):
 *
 * - `plotRoom` sizes the plot by `planeAxes` from the room left beside the y tick labels and half
 *   the widest x tick label, and centers it in that room.
 * - `gridLines`, with `showGrid`: a grid line crosses the plot at every tick of both axes, under
 *   everything else, and nowhere else (NLC-REQ-026).
 * - Each axis is drawn by `drawAxis` with its own ticks (`niceTicks`, its own spacing,
 *   NLC-REQ-027; a default one fitted to the axis's drawn length by `planeRooms`, NLC-REQ-006) at
 *   the place `planeAxes` gives, so an edge axis is ticked and labeled with its true
 *   values (NLC-REQ-025). The origin is labeled once, by the x-axis (`zeroBlanks`): the y-axis
 *   leaves its 0 blank where the x-axis crosses it, and when the y-axis runs down through the
 *   x-axis's 0, that "0" moves below-left of the origin where the neighbouring tick labels leave
 *   room for it (`originLabel`).
 * - `figures`: segments are lines between their ends (NLC-REQ-029), then points circle markers at
 *   their coordinates (NLC-REQ-028), each in its own color or the accent (NLC-REQ-030, NLC-REQ-011).
 * - `elementLabels`: labels, wrapped and cut to `LABEL_MAX_LINES`, are placed by
 *   `placeElementLabel` clear of the axes, the segments, the markers and every label placed before:
 *   a point's beside it, a segment's at its middle. A label with no clear place takes its first
 *   candidate (NLC OQ-005).
 *
 * Every number passes through `fmt()` (AD-007), and no caller-sized list is spread into arguments.
 */
// @spec NLC-REQ-006, NLC-REQ-007, NLC-REQ-022, NLC-REQ-024, NLC-REQ-025, NLC-REQ-026, NLC-REQ-027, NLC-REQ-028, NLC-REQ-029, NLC-REQ-030, NLC-REQ-031
export const xyGraphLayout: Layout<XyGraph> = (graph: XyGraph, provenance: Provenance): Scene => {
  const { xAxis, yAxis } = graph;
  // A default spacing fitted to the length each axis is drawn at, as `describe` states it (NLC TICKET-009).
  const rooms = planeRooms(graph);
  const ticks: PlaneTicks = {
    x: niceTicks(xAxis.min, xAxis.max, Object.hasOwn(xAxis, "tickSpacing") ? xAxis.tickSpacing : undefined, rooms.x),
    y: niceTicks(yAxis.min, yAxis.max, Object.hasOwn(yAxis, "tickSpacing") ? yAxis.tickSpacing : undefined, rooms.y),
    showX: xAxis.showTickLabels !== false,
    showY: yAxis.showTickLabels !== false,
  };
  // Where the axes go, which no width changes; `plotRoom` sizes the plane once the room is known.
  const axes = planeAxes([xAxis.min, xAxis.max], [yAxis.min, yAxis.max]);
  const blanks = zeroBlanks(graph, axes, ticks.showX);
  const xLabels = new Map<number, string>(blanks.x ? [[0, ""]] : []);
  const yLabels = new Map<number, string>(blanks.y ? [[0, ""]] : []);
  const yLabel = axisLabelLines(graph.yAxisLabel, Y_LABEL_LENGTH);
  const title = titleBlock(graph.title);
  const { plane, plot, left, right, below } = plotRoom(graph, axes, ticks, yLabels, yLabel, title.height);

  const nodes: SceneNode[] = [];
  for (const node of title.nodes) nodes.push(node);
  // The grid, under everything.
  for (const node of gridLines(graph, ticks, plot)) nodes.push(node);
  const axisLines = [
    { from: [plot.left, plot.originY], to: [plot.right, plot.originY], domain: [xAxis.min, xAxis.max], ...ticks.x, labels: xLabels, showTickLabels: ticks.showX, side: plane.xLabelSide },
    { from: [plot.originX, plot.bottom], to: [plot.originX, plot.top], domain: [yAxis.min, yAxis.max], ...ticks.y, labels: yLabels, showTickLabels: ticks.showY, side: plane.yLabelSide },
  ] as const;
  for (const options of axisLines) for (const node of drawAxis(options)) nodes.push(node);
  const zero = originLabel(graph, ticks, blanks, plot);
  if (zero !== undefined) nodes.push(zero);
  // Segments, then the points' markers over them, then their labels.
  const drawn = figures(graph, plot);
  for (const node of drawn.nodes) nodes.push(node);
  let bottom = plot.bottom + below;
  for (const { lines, box } of elementLabels(graph, plot, drawn.obstacles)) {
    bottom = Math.max(bottom, box.y + box.height);
    for (const node of textLines(lines, box.x + box.width / 2, box.y, defaultStyle.fontSizes.label, defaultStyle.colors.text)) nodes.push(node);
  }

  // The axis labels: the y-axis's read upward on the left, centered on the plot; the x-axis's below.
  const plotBox: Box = { x: plot.left, y: plot.top, width: plane.width, height: plane.height };
  // Beside the plot however far it was narrowed, so the label stays next to its axis.
  for (const node of drawLeftAxisLabel(yLabel, SCENE_MARGIN + plot.left - left, plotBox)) nodes.push(node);
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
