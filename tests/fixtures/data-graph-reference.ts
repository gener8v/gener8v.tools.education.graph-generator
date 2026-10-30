import type { BarGraph } from "../../src/core/definitions/bar-graph";
import type { LineGraph } from "../../src/core/definitions/line-graph";
import { defaultStyle } from "../../src/core/style";
import { DEFAULT_VALUE_INTERVALS, resolveValueScale } from "../../src/core/value-scale";
import { MARKER_REACH } from "../../src/layout/kit/markers";
import { titleBlock } from "../../src/layout/kit/title";
import { axisLabelDepth, axisLabelLines, tickLabelOverhang, tickLabelsFit, valueAxisExtent } from "../../src/layout/kit/value-scale";

// The positions DGP-NFR-001 expects of line-graph points and bar lengths, worked out from the data
// and the layouts' documented constants and the value-scale rule (`resolveValueScale`, which the
// validator shares), never from a drawn Scene or its axes (the lesson of graph-library NLC
// TICKET-005 code review CR-001). The numbers are written out on purpose: a layout whose constant
// changes must fail this reference, not move it along. Only the text-measuring and title-wrapping
// helpers are the layouts' own, since text width is an estimate no test can restate.
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
 * Bars: a bar is value ÷ (maximum − minimum) of its value axis long, from zero. Upright bars have a
 * value axis 240 tall. Across, the plot starts right of the names' column (96 wide, 4 clear of the
 * plot) and ends short of the right margin by half the widest end tick label; the scale's interval,
 * when it is chosen, is the one with the most intervals (ten at most) whose tick labels all fit
 * apart. A category-axis label or written values would move the plot's edges by amounts that depend
 * on the drawn rows, which no restatement gives, so `horizontalBarsReferenced` says when this holds.
 */
export function barGraphReference(description: BarGraph) {
  const horizontal = description.orientation === "horizontal";
  const options = { allowNegative: false } as const;
  if (!horizontal) {
    const scale = resolveValueScale(description.valueScale, description.values, options);
    return { horizontal, scale, axisLength: PLOT_HEIGHT, lengthOf: (value: number) => (value / (scale.maximum - scale.minimum)) * PLOT_HEIGHT };
  }
  const left = MARGIN + NAME_COLUMN + NAME_GAP;
  const lengthFor = (candidate: ReturnType<typeof resolveValueScale>) => DRAWING_WIDTH - MARGIN - tickLabelOverhang(candidate) - left;
  let scale = resolveValueScale(description.valueScale, description.values, options);
  let axisLength = lengthFor(scale);
  if (description.valueScale?.tickInterval === undefined) {
    for (let intervals = DEFAULT_VALUE_INTERVALS - 1; intervals >= 1 && !tickLabelsFit(scale, axisLength); intervals--) {
      scale = resolveValueScale(description.valueScale, description.values, { ...options, intervals });
      axisLength = lengthFor(scale);
    }
  }
  return { horizontal, scale, axisLength, lengthOf: (value: number) => (value / (scale.maximum - scale.minimum)) * axisLength };
}

/** Whether `barGraphReference` can place these bars: across, no category-axis label and no written values. */
export const horizontalBarsReferenced = (description: BarGraph): boolean =>
  description.orientation !== "horizontal" || (description.categoryAxisLabel === undefined && description.showValues !== true);
