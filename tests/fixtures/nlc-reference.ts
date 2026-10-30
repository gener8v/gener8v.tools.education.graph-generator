import type { NumberLine } from "../../src/core/definitions/number-line";
import { type XyGraph, planeRooms } from "../../src/core/definitions/xy-graph";
import { type XyzGraph, xyzRooms } from "../../src/core/definitions/xyz-graph";
import { defaultStyle } from "../../src/core/style";
import { niceTicks } from "../../src/core/value-scale";
import { isometric } from "../../src/layout/kit/isometric";
import { textWidth } from "../../src/layout/kit/text";
import { tickLabel } from "../../src/layout/kit/ticks";
import { titleBlock } from "../../src/layout/kit/title";
import { axisLabelDepth, axisLabelLines } from "../../src/layout/kit/value-scale";

// The positions NLC-NFR-001 expects, worked out from the layouts' documented constants and rules and
// from the description alone, never from a drawn Scene (graph-library NLC TICKET-005 code review
// CR-001, quality review QR-001). The numbers are written out here on purpose: a layout whose
// constant changes must fail this reference, not move it along. Only the text-measuring and
// title-wrapping helpers are the layouts' own, since text width is an estimate no test can restate.

/** The drawing's width, the margin kept all round, and the style's line height as a multiple of font size. */
const DRAWING_WIDTH = 400;
const MARGIN = 16;
const LINE_HEIGHT = 1.2;
/** Space between a plot, a label and a tick label. */
const GAP = 4;
/** How far a marker reaches from its center: the marker size's half, times 1.5. */
const MARKER_REACH = (defaultStyle.markerSize / 2) * 1.5;
const HALF_TICK = defaultStyle.tickLength / 2;
const TICK_FONT = defaultStyle.fontSizes.tickLabel;

type Page = readonly [number, number];
type Axis = { min: number; max: number; tickSpacing?: number; showTickLabels?: boolean };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const linear = (domain: readonly [number, number], range: readonly [number, number]) => (value: number) =>
  range[0] + ((value - domain[0]) / (domain[1] - domain[0])) * (range[1] - range[0]);
const ticksOf = (axis: Axis, room?: Parameters<typeof niceTicks>[3]) => niceTicks(axis.min, axis.max, Object.hasOwn(axis, "tickSpacing") ? axis.tickSpacing : undefined, room);
const widest = (texts: string[]) => texts.reduce((width, text) => Math.max(width, textWidth(text, TICK_FONT)), 0);

/**
 * A number line: the line runs from `left` to `right` across the drawing. Each end keeps the room
 * for an arrowhead (an 8-unit extension and a 9-unit head, 17 in all, drawn or not) or for half the
 * widest tick label, whichever is more, beyond the 16-unit margin; the range is spread linearly
 * between them. Its height depends on where point labels fall, so only the horizontal is fixed.
 */
export function numberLineReference(description: NumberLine): { left: number; right: number; xOf: (value: number) => number; ticks: number[] } {
  const { axis } = description;
  const { ticks, spacing } = ticksOf(axis);
  const halfLabel = axis.showTickLabels === false ? 0 : widest(ticks.map((tick) => tickLabel(tick, spacing))) / 2;
  const inset = MARGIN + Math.max(8 + 9, halfLabel);
  const [left, right] = [inset, DRAWING_WIDTH - inset];
  return { left, right, xOf: linear([axis.min, axis.max], [left, right]), ticks };
}

/**
 * An x,y graph: the plot is centered in the room left between the margins, the y-axis label's depth,
 * the widest tick label on the y-axis's side and half the widest x tick label (at least a marker's
 * reach); it is at most 360 tall and 1/6 to 3 as tall as wide, one unit of each axis the same length
 * when that fits. It starts below the title and the room its tick labels and y-axis label need above.
 * The axes cross at 0, or at the range's end nearest it.
 */
export function xyReference(description: XyGraph) {
  const { xAxis, yAxis } = description;
  const rooms = planeRooms(description);
  const [xTicks, yTicks] = [ticksOf(xAxis, rooms.x), ticksOf(yAxis, rooms.y)];
  const showX = xAxis.showTickLabels !== false;
  const showY = yAxis.showTickLabels !== false;
  const yLabel = axisLabelLines(description.yAxisLabel, 160);
  const yLabelRoom = yLabel.length > 0 ? axisLabelDepth(yLabel) + GAP : 0;
  const yTickRoom = HALF_TICK + (showY ? GAP + widest(yTicks.ticks.map((tick) => tickLabel(tick, yTicks.spacing))) : 0);
  const xOverhang = showX ? widest(xTicks.ticks.map((tick) => tickLabel(tick, xTicks.spacing))) / 2 : 0;
  const yOnRight = xAxis.max < 0;
  const left = MARGIN + yLabelRoom + Math.max(MARKER_REACH, xOverhang, yOnRight ? 0 : yTickRoom);
  const right = DRAWING_WIDTH - MARGIN - Math.max(MARKER_REACH, xOverhang, yOnRight ? yTickRoom : 0);
  const ratio = clamp((yAxis.max - yAxis.min) / (xAxis.max - xAxis.min), 1 / 6, 3);
  const width = Math.min(right - left, 360 / ratio);
  const height = width * ratio;
  const plotLeft = left + (right - left - width) / 2;
  const xTickRoom = HALF_TICK + (showX ? GAP + TICK_FONT * LINE_HEIGHT : 0);
  const yLabelReach = yLabel.reduce((reach, text) => Math.max(reach, textWidth(text, defaultStyle.fontSizes.label) / 2), 0);
  const above = yAxis.max < 0;
  const plotTop = titleBlock(description.title).height + MARGIN + Math.max(MARKER_REACH, showY ? TICK_FONT / 2 : 0, above ? xTickRoom : 0, Math.max(0, yLabelReach - height / 2));
  const [plotRight, plotBottom] = [plotLeft + width, plotTop + height];
  const xOf = linear([xAxis.min, xAxis.max], [plotLeft, plotRight]);
  const yOf = linear([yAxis.min, yAxis.max], [plotBottom, plotTop]);
  const [originX, originY] = [xOf(clamp(0, xAxis.min, xAxis.max)), yOf(clamp(0, yAxis.min, yAxis.max))];
  return {
    xOf,
    yOf,
    xTicks: xTicks.ticks,
    yTicks: yTicks.ticks,
    /** The x-axis, from its min end to its max end, level through the origin row. */
    xAxisEnds: [[plotLeft, originY], [plotRight, originY]] as [Page, Page],
    /** The y-axis, from its min end (bottom) to its max end (top), upright through the origin column. */
    yAxisEnds: [[originX, plotBottom], [originX, plotTop]] as [Page, Page],
  };
}

/** The length each x,y,z axis is drawn across its whole range, before projection. */
const AXIS_LENGTH = 170;

/**
 * An x,y,z graph: the axes meet at 0, or at the end of a range that leaves 0 out; a value is scaled
 * from there, 170 units for the whole range of its axis, and projected by `isometric()` alone. The
 * figure's box (all eight corners of the three ranges) is centered across the drawing, and the
 * figure is moved down so its topmost mark sits one margin below the title.
 *
 * Which mark is topmost depends on where labels are placed, which no restatement of the rules can
 * give. So the page position is returned as `at(x, y, z)` plus the pieces of the move down:
 * `geometryTop` (the topmost axis end, tick end, marker edge or guide line, before the move) and
 * `titleBottom` (where the topmost mark of all must sit). The move down is `titleBottom - geometryTop` when geometry
 * is topmost, and more when a label rises above it.
 */
export function xyzReference(description: XyzGraph) {
  const axes = { x: description.xAxis, y: description.yAxis, z: description.zAxis };
  const names = ["x", "y", "z"] as const;
  type Name = (typeof names)[number];
  const meet = Object.fromEntries(names.map((name) => [name, clamp(0, axes[name].min, axes[name].max)])) as Record<Name, number>;
  const unit = (name: Name, value: number) => ((value - meet[name]) * AXIS_LENGTH) / (axes[name].max - axes[name].min);
  const project = (x: number, y: number, z: number): Page => isometric(unit("x", x), unit("y", y), unit("z", z));
  const across = [axes.x.min, axes.x.max].flatMap((x) => [axes.y.min, axes.y.max].flatMap((y) => [axes.z.min, axes.z.max].map((z) => project(x, y, z)[0])));
  const dx = DRAWING_WIDTH / 2 - (Math.min(...across) + Math.max(...across)) / 2;
  const onAxis = (name: Name, value: number): Page => project(name === "x" ? value : meet.x, name === "y" ? value : meet.y, name === "z" ? value : meet.z);
  const rooms = xyzRooms(description);

  // The topmost of everything drawn that is not text: axis ends, ticks' ends (half a tick either
  // side of the axis, square to it), a marker's reach and, with guide lines, their ends.
  const tops: number[] = [];
  for (const name of names) {
    const [from, to] = [onAxis(name, axes[name].min), onAxis(name, axes[name].max)];
    const run = Math.hypot(to[0] - from[0], to[1] - from[1]);
    tops.push(from[1], to[1]);
    for (const tick of ticksOf(axes[name], rooms[name]).ticks) {
      const tickY = onAxis(name, tick)[1];
      const half = (HALF_TICK * (to[0] - from[0])) / run;
      tops.push(tickY - Math.abs(half));
    }
  }
  for (const { x, y, z } of description.points ?? []) {
    tops.push(project(x, y, z)[1] - MARKER_REACH);
    if (description.guideLines === true) tops.push(project(x, y, meet.z)[1], project(x, meet.y, meet.z)[1], project(meet.x, y, meet.z)[1]);
  }
  return {
    /** The page position of (x, y, z) before the move down: x already centered. */
    at: (x: number, y: number, z: number): Page => {
      const [px, py] = project(x, y, z);
      return [px + dx, py];
    },
    onAxis: (name: Name, value: number): Page => {
      const [px, py] = onAxis(name, value);
      return [px + dx, py];
    },
    /** Each axis's tick values (`niceTicks`, at the spacing given or the default for the length drawn). */
    ticks: { x: ticksOf(axes.x, rooms.x).ticks, y: ticksOf(axes.y, rooms.y).ticks, z: ticksOf(axes.z, rooms.z).ticks },
    geometryTop: Math.min(...tops),
    titleBottom: titleBlock(description.title).height + MARGIN,
  };
}
