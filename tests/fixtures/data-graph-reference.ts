import type { BarGraph } from "../../src/core/definitions/bar-graph";
import type { LineGraph } from "../../src/core/definitions/line-graph";
import { defaultStyle } from "../../src/core/style";
import { DEFAULT_VALUE_INTERVALS, resolveValueScale } from "../../src/core/value-scale";
import { MARKER_REACH } from "../../src/layout/kit/markers";
import { textWidth } from "../../src/layout/kit/text";
import { titleBlock } from "../../src/layout/kit/title";
import { axisLabelDepth, axisLabelLines, tickLabelOverhang, tickLabelsFit, valueAxisExtent } from "../../src/layout/kit/value-scale";

// The positions DGP-NFR-001 expects of line-graph points and bar lengths, worked out from the data
// and the layouts' documented constants and the value-scale rule, never from a drawn Scene or its
// axes (the lesson of graph-library NLC TICKET-005 code review CR-001). The numbers are written out
// on purpose: a layout whose constant changes must fail this reference, not move it along.
//
// What it does share with `src/` (DGP TICKET-006 code review CR-004): `resolveValueScale` (the
// scale rule, which the validator also uses), `titleBlock` (the title's height and wrapping),
// `valueAxisExtent`, `axisLabelDepth` and `axisLabelLines` (the width a value axis and an axis label
// take, which measure text), `tickLabelOverhang`, `tickLabelsFit` and `textWidth` (how far the end
// tick label reaches, whether labels fit apart, and how wide a written value is: text measures), `MARKER_REACH` (a marker's reach past a
// point) and `drawMarker` (the shape a marker is drawn as, used by the accuracy test). So the
// proportions of values to lengths and positions, and the documented constants, are checked
// independently; the offsets those helpers produce and the marker shapes are not: a bug in one moves
// the reference along with the layout, and is covered only by that helper's own tests.
// (graph-library DGP TICKET-006.)

/** The drawing's width and the margin kept all round. */
const DRAWING_WIDTH = 400;
const MARGIN = 16;
/** Space between a plot, its labels and the title. */
const GAP = 8;
/** The height of a line graph's plot and of upright bars' plot. */
const PLOT_HEIGHT = 240;
/** Horizontal bars: the names' column, and the gap between it and the plot. */
const NAME_COLUMN = 96;
const NAME_GAP = 4;
/** Horizontal bars' plot is at least this tall; a value label is at most 72 wide, and 4 clear of its bar. */
const MIN_ROWS_HEIGHT = 120;
const VALUE_LABEL_WIDTH = 72;
const VALUE_LABEL_GAP = 4;
/** A line graph leaves half a tick label's height above its plot, so the top tick's label is not cut. */
const TOP_TICK_ROOM = defaultStyle.fontSizes.tickLabel / 2;

const linear = (domain: readonly [number, number], range: readonly [number, number]) => (value: number) =>
  range[0] + ((value - domain[0]) / (domain[1] - domain[0])) * (range[1] - range[0]);

/**
 * A line graph: the value axis (its label, tick labels and ticks) sits left of the plot, which is
 * 240 tall and ends a marker's reach short of the right margin; it starts below the title, 8 units
 * and half a tick label's height down. The categories take equal slots across it, and a point sits
 * at its slot's center, at its value's height on the scale from the minimum (bottom) to the maximum.
 */
export function lineGraphReference(description: LineGraph) {
  const values = description.series.flatMap((series) => [...series.values]);
  const scale = resolveValueScale(description.valueScale, values, { allowNegative: true });
  const label = axisLabelLines(description.valueAxisLabel, PLOT_HEIGHT);
  const left = MARGIN + (label.length > 0 ? axisLabelDepth(label) + GAP : 0) + valueAxisExtent(scale, "vertical");
  const width = DRAWING_WIDTH - MARGIN - MARKER_REACH - left;
  const top = titleBlock(description.title).height + GAP + TOP_TICK_ROOM;
  const yOf = linear([scale.minimum, scale.maximum], [top + PLOT_HEIGHT, top]);
  const slot = width / description.categories.length;
  return { scale, xOf: (index: number) => left + (index + 0.5) * slot, yOf };
}

/**
 * The scales bars across may be drawn on: the default scale, then, when the caller gave no tick
 * interval, one for each smaller number of intervals the layout may fall back to (ten at most, one
 * at least), each with the axis length it would have with no category-axis label and no written
 * values. The layout takes the first whose tick labels fit apart on its (shorter, with those terms)
 * axis.
 */
function acrossScales(description: BarGraph) {
  const options = { allowNegative: false } as const;
  const left = MARGIN + NAME_COLUMN + NAME_GAP;
  const candidate = (scale: ReturnType<typeof resolveValueScale>) => ({ scale, overhang: tickLabelOverhang(scale), axisLength: DRAWING_WIDTH - MARGIN - tickLabelOverhang(scale) - left });
  const scales = [candidate(resolveValueScale(description.valueScale, description.values, options))];
  if (description.valueScale?.tickInterval === undefined) {
    for (let intervals = DEFAULT_VALUE_INTERVALS - 1; intervals >= 1; intervals--) {
      scales.push(candidate(resolveValueScale(description.valueScale, description.values, { ...options, intervals })));
    }
  }
  return { left, scales };
}

/**
 * Bars: a bar is value ÷ (maximum − minimum) of its value axis long, from zero. Upright bars have a
 * value axis 240 tall, from `start` (the zero line's y) up; written values add room above the plot,
 * which no restatement gives, so `start.exact` is false with them and `start.value` is then the
 * least it can be. Across, the plot starts right of the names' column (96 wide, 4 clear of the
 * plot) and ends short of the right margin by half the widest end tick label; the scale's interval,
 * when it is chosen, is the one with the most intervals (ten at most) whose tick labels all fit
 * apart. A category-axis label (on the left) or written values (on the right) narrow the plot by
 * amounts that depend on the drawn rows, so the absolute length across, and where it starts, are
 * exact only without those two terms (`horizontalBarsReferenced` says when); with them,
 * `barGraphBounds` gives the proportion and the limits the axis length may lie between.
 */
export function barGraphReference(description: BarGraph) {
  const horizontal = description.orientation === "horizontal";
  if (!horizontal) {
    const scale = resolveValueScale(description.valueScale, description.values, { allowNegative: false });
    const top = titleBlock(description.title).height + GAP + TOP_TICK_ROOM;
    const zero = top + PLOT_HEIGHT - linear([scale.minimum, scale.maximum], [0, PLOT_HEIGHT])(0);
    return {
      horizontal,
      scale,
      axisLength: PLOT_HEIGHT,
      lengthOf: (value: number) => (value / (scale.maximum - scale.minimum)) * PLOT_HEIGHT,
      start: { value: zero, exact: description.showValues !== true },
    };
  }
  const { left, scales } = acrossScales(description);
  let chosen = scales[0]!;
  if (description.valueScale?.tickInterval === undefined) {
    chosen = scales.find(({ scale, axisLength }) => tickLabelsFit(scale, axisLength)) ?? scales[scales.length - 1]!;
  }
  const { scale, axisLength } = chosen;
  const zero = left + linear([scale.minimum, scale.maximum], [0, axisLength])(0);
  return {
    horizontal,
    scale,
    axisLength,
    lengthOf: (value: number) => (value / (scale.maximum - scale.minimum)) * axisLength,
    start: { value: zero, exact: horizontalBarsReferenced(description) },
  };
}

/**
 * What can be said of bars across with a category-axis label or written values without restating the
 * plot's edges: for each scale the layout may have chosen, the range it spans and the least and most
 * the axis may be long, and the plot's left edge at the most and least. The axis ends short of the
 * right margin by the end tick label's overhang or, with written values, the room of the widest
 * (72 at most, and 4 clear of its bar; as wide as its text, the shared measure of `textWidth`),
 * whichever is more. The plot starts right of the names' column and the category-axis label. The
 * label is at least one line deep, and at most as deep as its lines wrapped to the shortest plot
 * there is (120 tall; a taller plot wraps to no more lines), with 8 clear of the names' column.
 * Without a label the axis is exact. Both limits are positive: the axis keeps room for the bars.
 */
export function barGraphBounds(description: BarGraph) {
  const { left, scales } = acrossScales(description);
  const label = axisLabelLines(description.categoryAxisLabel, MIN_ROWS_HEIGHT);
  const leftest = left + (label.length > 0 ? axisLabelDepth(label.slice(0, 1)) + GAP : 0);
  const rightest = left + (label.length > 0 ? axisLabelDepth(label) + GAP : 0);
  const written = description.showValues === true ? description.values.map((value) => Math.min(VALUE_LABEL_WIDTH, textWidth(String(value), defaultStyle.fontSizes.tickLabel))) : [];
  const widest = Math.max(0, ...written);
  const room = (overhang: number) => Math.max(overhang, widest > 0 ? widest + VALUE_LABEL_GAP : 0);
  return {
    left,
    candidates: scales.map(({ scale, overhang }) => ({
      range: scale.maximum - scale.minimum,
      most: DRAWING_WIDTH - MARGIN - room(overhang) - leftest,
      least: DRAWING_WIDTH - MARGIN - room(overhang) - rightest,
    })),
  };
}

/** Whether `barGraphReference` can place these bars exactly: across, no category-axis label and no written values. */
export const horizontalBarsReferenced = (description: BarGraph): boolean =>
  description.orientation !== "horizontal" || (description.categoryAxisLabel === undefined && description.showValues !== true);
