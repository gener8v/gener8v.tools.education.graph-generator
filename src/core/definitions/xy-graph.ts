import { cleanText, formatList, quoteText, sourceOf, stateMeasurement } from "../format";
import { createIssue, pointer } from "../issues";
import type { Issue, Provenance } from "../result";
import { defaultStyle } from "../style";
import { type AxisRoom, axisSpacing, axisTickLabel, cleanDecimal, drawableTicks, tickLabelWidth } from "../value-scale";
import { type Axis, axisDomainChecks, axisProperty } from "./axis";
import { POINTS_DESCRIPTION, sharedProperties } from "./shared";
import { type DescriptionBase, type DomainCheck, type GraphTypeDefinition, type PropertySpec, defineProperties } from "./types";

/** A position on an x,y graph, in its axes' own numbers. */
export interface XyCoordinates {
  readonly x: number;
  readonly y: number;
}

/** One plotted point of an x,y graph (NLC-REQ-028, NLC-REQ-011). */
export interface XyPoint extends XyCoordinates {
  readonly label?: string;
  /** A resolved `#rrggbb` color. */
  readonly color?: string;
}

/** One line segment of an x,y graph, from one point to another (NLC-REQ-029, NLC-REQ-030). */
export interface XySegment {
  readonly from: XyCoordinates;
  readonly to: XyCoordinates;
  readonly label?: string;
  /** A resolved `#rrggbb` color. */
  readonly color?: string;
}

/** A normalized x,y graph description (NLC-REQ-022). */
export interface XyGraph extends DescriptionBase {
  readonly type: "xy-graph";
  readonly xAxis: Axis;
  readonly yAxis: Axis;
  /** Whether grid lines are drawn at the ticks; absent means not (NLC-REQ-026). */
  readonly showGrid?: boolean;
  readonly points?: readonly XyPoint[];
  readonly segments?: readonly XySegment[];
  readonly title?: string;
  readonly xAxisLabel?: string;
  readonly yAxisLabel?: string;
}

/**
 * The most points, and separately the most segments, an x,y graph may hold: a curriculum-sized
 * bound on label placement and the text alternative (GSV TICKET-003 security review SEC-001).
 */
export const XY_ELEMENT_LIMIT = 1000;

/**
 * The plot's height over its width is kept between these, so a plot is never a sliver: no flatter
 * than a sixth, and no taller than three times its width. Inside them one x unit and one y unit are
 * drawn the same length (NLC-REQ-032); outside, the plot takes the nearer bound and the units
 * differ, which the text alternative states (graph-library NLC TICKET-003 delivery record; NLC
 * OQ-004 stays open, so there is no setting to turn equal units off). A ratio, not a size, so
 * `describe` and the layout make the one decision without measuring any text.
 */
export const PLANE_MIN_RATIO = 1 / 6;
export const PLANE_MAX_RATIO = 3;

/**
 * The plot's shape for two axes (NLC-REQ-032): `ratio`, its height over its width, and whether
 * one x unit and one y unit are drawn the same length. The one rule `describe` and the layout share.
 */
// @spec NLC-REQ-032
export function planeShape(xAxis: Axis, yAxis: Axis): { ratio: number; equalUnits: boolean } {
  const exact = (yAxis.max - yAxis.min) / (xAxis.max - xAxis.min);
  const ratio = Math.min(PLANE_MAX_RATIO, Math.max(PLANE_MIN_RATIO, exact));
  return { ratio, equalUnits: ratio === exact };
}

/**
 * The tallest a plot is drawn: a little less than the drawing's width, so a square plane fits a
 * page column beside its text. A plot that would be taller at equal units is narrowed instead,
 * centered, down to `MIN_PLOT_WIDTH` (NLC-REQ-032). Here, not in the layout, so `planeLengths` can
 * read it; the layout re-exports it (NLC TICKET-009).
 */
export const MAX_PLOT_HEIGHT = 360;

/** Caller text cleaned of hidden characters, or `""` when absent. */
const cleaned = (text: string | undefined): string => (text === undefined ? "" : cleanText(text));

/**
 * The width the plot and the room beside it share: the 400-unit drawing less its 16-unit margin on
 * each side (`SCENE_WIDTH` and `SCENE_MARGIN` in `src/layout`, which `./core` must not import).
 */
const PLANE_ROOM = 368;

/**
 * A lower bound on the plot's width (`x`) and height (`y`) as the layout draws it (NLC-REQ-032),
 * from numbers alone, mirroring the layout's `plotRoom`: the room across less two lines of y-axis
 * label (`AXIS_LABEL_MAX_LINES`, `LINE_HEIGHT`, then a 4-unit gap) when there is one, and on each
 * side the most of a marker's reach (`MARKER_REACH`), half the widest x tick label and, on the y
 * labels' side, half a tick, the 4-unit gap and the widest y tick label. Labels are measured at
 * the given spacing or the range's own: a coarser one never prints a wider label, so the layout
 * draws a plot at least this long (NLC TICKET-009).
 */
// @spec NLC-REQ-005, NLC-REQ-032
export function planeLengths(graph: XyGraph): { x: number; y: number } {
  const { tickLabel: tickFont, label: labelFont } = defaultStyle.fontSizes;
  const widest = (axis: Axis): number => {
    if (axis.showTickLabels === false) return 0;
    const drawn = drawableTicks(axis.min, axis.max, Object.hasOwn(axis, "tickSpacing") ? axis.tickSpacing : undefined);
    let width = 0;
    for (const tick of drawn?.ticks ?? []) width = Math.max(width, tickLabelWidth(axisTickLabel(tick, drawn!.spacing), tickFont));
    return width;
  };
  const yLabelRoom = cleaned(graph.yAxisLabel) === "" ? 0 : 2 * labelFont * 1.2 + 4;
  const xOverhang = widest(graph.xAxis) / 2;
  const yTickRoom = defaultStyle.tickLength / 2 + (graph.yAxis.showTickLabels === false ? 0 : 4 + widest(graph.yAxis));
  const onLeft = !(graph.xAxis.max < 0);
  const reach = (yLabels: boolean) => Math.max((defaultStyle.markerSize / 2) * 1.5, xOverhang, yLabels ? yTickRoom : 0);
  const { ratio } = planeShape(graph.xAxis, graph.yAxis);
  const x = Math.min(PLANE_ROOM - yLabelRoom - reach(onLeft) - reach(!onLeft), MAX_PLOT_HEIGHT / ratio);
  return { x, y: x * ratio };
}

/**
 * The room each axis's tick labels have (`AxisRoom`), for the default spacing `describe` states and
 * the layout draws (NLC-REQ-005, NLC-REQ-006, NLC-REQ-027): each axis's `planeLengths`, and a gap
 * of a fifth of the tick font size between neighbouring labels, so stacked y labels sit a line
 * height apart. The Engineer chose that gap (Thomas Eaves, 2026-10-27) over the bar graph's 6
 * units, which would change drawings whose labels already clear by up to 6. An x label needs its
 * width; a y label, level with its tick, its height. An axis with hidden tick labels has no room,
 * and keeps the range's own spacing (NLC TICKET-009).
 */
// @spec NLC-REQ-005, NLC-REQ-006, NLC-REQ-027
export function planeRooms(graph: XyGraph): { x: AxisRoom | undefined; y: AxisRoom | undefined } {
  const tickFont = defaultStyle.fontSizes.tickLabel;
  const gap = tickFont / 5;
  const { x, y } = planeLengths(graph);
  return {
    x: graph.xAxis.showTickLabels === false ? undefined : { length: x, extent: gap, textSize: tickFont },
    y: graph.yAxis.showTickLabels === false ? undefined : { length: y, extent: tickFont + gap, textSize: 0 },
  };
}

/**
 * How many quadrants two axes show (NLC-REQ-023): two across an axis whose range has values on
 * both sides of zero, one otherwise, so 1, 2 or 4.
 */
// @spec NLC-REQ-023
export const quadrantCount = (xAxis: Axis, yAxis: Axis): number => (xAxis.min < 0 && xAxis.max > 0 ? 2 : 1) * (yAxis.min < 0 && yAxis.max > 0 ? 2 : 1);

/**
 * The `x` and `y` terms, one definition each for a point and a segment's ends (GSV-REQ-015). No
 * structural bounds: a value off its axis is reported with the axis's range by the domain checks,
 * as the number line's `value` is (NLC TICKET-002 DEL-009).
 */
const coordinates = {
  x: {
    term: "x",
    kind: "number",
    required: true,
    description: "A position along the x-axis, in its own numbers: a point's or a segment end's x coordinate, inside the x-axis range, ends included.",
  },
  y: {
    term: "y",
    kind: "number",
    required: true,
    description: "A position along the y-axis, in its own numbers: a point's or a segment end's y coordinate, inside the y-axis range, ends included.",
  },
} as const satisfies Record<string, PropertySpec>;

/**
 * The x,y graph's own terms (NLC-REQ-001, NLC-REQ-026, NLC-REQ-027, NLC-REQ-028..030): its two axes,
 * each with its own tick spacing, the grid setting, and the points and segments with the shared
 * label and color nested. The title and axis labels are shared options that `propertiesOf` adds,
 * never listed here. Built by a function free of side effects, so a bundle that never reads the
 * x,y graph drops it.
 */
// @spec NLC-REQ-001, NLC-REQ-026, NLC-REQ-027, NLC-REQ-028, NLC-REQ-029, NLC-REQ-030
/* @__NO_SIDE_EFFECTS__ */
function defineXyGraphProperties() {
  const end = (term: "from" | "to", where: string): PropertySpec => ({
    term,
    kind: "object",
    required: true,
    description: `Where a line segment ${where}: its x and y coordinates.`,
    properties: coordinates,
  });
  return defineProperties({
    xAxis: axisProperty("xAxis", "coordinate graph's horizontal x"),
    yAxis: axisProperty("yAxis", "coordinate graph's vertical y"),
    showGrid: {
      term: "showGrid",
      kind: "boolean",
      required: false,
      description: "Whether a coordinate graph has grid lines across it at every tick of both axes; off unless true.",
    },
    points: {
      term: "points",
      kind: "array",
      required: false,
      maxItems: XY_ELEMENT_LIMIT,
      description: POINTS_DESCRIPTION,
      items: {
        kind: "object",
        description: "One plotted point: its x and y, and optionally its label and color.",
        // The shared element options, nested per point (GSV-REQ-045).
        properties: { ...coordinates, label: sharedProperties.label, color: sharedProperties.color },
      },
    },
    segments: {
      term: "segments",
      kind: "array",
      required: false,
      maxItems: XY_ELEMENT_LIMIT,
      description: `The line segments drawn on a coordinate graph, at most ${XY_ELEMENT_LIMIT}, each from one point to another, and optionally with a label at its middle and a color.`,
      items: {
        kind: "object",
        description: "One line segment: its two ends, and optionally its label and color.",
        properties: { from: end("from", "starts"), to: end("to", "ends"), label: sharedProperties.label, color: sharedProperties.color },
      },
    },
  });
}

/** `outside_axis_range` for each of `at`'s coordinates off its axis, at `path/x` or `path/y` (NLC-REQ-010). */
function offAxis(graph: XyGraph, at: XyCoordinates, path: Array<string | number>, term: string, issues: Issue[]): void {
  for (const name of ["x", "y"] as const) {
    const { min, max } = name === "x" ? graph.xAxis : graph.yAxis;
    const got = at[name];
    if (got < min || got > max) issues.push(createIssue("outside_axis_range", pointer(...path, name), { term: `${term}.${name}`, got, range: { min, max } }));
  }
}

const AXIS_ENDS = ["xAxis/min", "xAxis/max", "yAxis/min", "yAxis/max"];

/**
 * Every point coordinate outside its axis's range, each reported once as `outside_axis_range` at
 * its own path (`/points/2/x`), naming the range; an end as written is inside (NLC-REQ-010).
 * O(points).
 */
// @spec NLC-REQ-010
const pointsInRange: DomainCheck<XyGraph> = {
  name: "every point lies inside both axis ranges",
  inputs: [...AXIS_ENDS, "points/*/x", "points/*/y"],
  check: (graph) => {
    const issues: Issue[] = [];
    (graph.points ?? []).forEach((point, i) => offAxis(graph, point, ["points", i], `points[${i}]`, issues));
    return issues;
  },
};

/**
 * Every segment end coordinate outside its axis's range, at its own path (`/segments/0/to/y`),
 * as for points (NLC-REQ-010). A check of its own, so a failed point never hides it. O(segments).
 */
// @spec NLC-REQ-010
const segmentsInRange: DomainCheck<XyGraph> = {
  name: "every segment end lies inside both axis ranges",
  inputs: [...AXIS_ENDS, "segments/*/from/x", "segments/*/from/y", "segments/*/to/x", "segments/*/to/y"],
  check: (graph) => {
    const issues: Issue[] = [];
    (graph.segments ?? []).forEach((segment, i) => {
      offAxis(graph, segment.from, ["segments", i, "from"], `segments[${i}].from`, issues);
      offAxis(graph, segment.to, ["segments", i, "to"], `segments[${i}].to`, issues);
    });
    return issues;
  },
};

/** Every segment whose two ends are the same point, as written, reported once as `degenerate_segment` at the segment (NLC-REQ-033). O(segments). */
// @spec NLC-REQ-033
const segmentsHaveLength: DomainCheck<XyGraph> = {
  name: "every segment joins two different points",
  inputs: ["segments/*/from/x", "segments/*/from/y", "segments/*/to/x", "segments/*/to/y"],
  check: (graph) => {
    const issues: Issue[] = [];
    (graph.segments ?? []).forEach(({ from, to }, i) => {
      if (from.x === to.x && from.y === to.y) issues.push(createIssue("degenerate_segment", pointer("segments", i), { term: `segments[${i}]` }));
    });
    return issues;
  },
};

const QUADRANTS = ["", "one quadrant", "two quadrants", "", "all four quadrants"];

/**
 * The x,y coordinate graph (NLC-REQ-001, NLC-REQ-022..033): two axes, each through the origin or
 * along the nearest edge, one, two or four quadrants, equal units, an optional grid, and plotted
 * points and line segments.
 */
// @spec NLC-REQ-001, NLC-REQ-022
export const xyGraph: GraphTypeDefinition<XyGraph> = /* @__PURE__ */ defineXyGraph();

/**
 * A point's or segment end's coordinate as the text alternative states it: closer to 0 than a
 * trillionth of its axis's span is 0, and anything else at most 12 significant digits
 * (`cleanDecimal`). So computed noise reads as the value meant (sin π = 1.2e-16 reads 0, 0.1 + 0.2
 * reads 0.3), a typed value reads as written, and a subnormal is never written out in 326 digits
 * (NLC TICKET-003 security review SEC-001, Product Owner — Thomas Eaves, 2026-10-27).
 */
// @spec NLC-REQ-012
export function coordinate(value: number, axis: Axis): number {
  return Math.abs(value) < (axis.max - axis.min) * 1e-12 ? 0 : cleanDecimal(value);
}

/**
 * Builds the x,y graph definition. A function marked free of side effects, so a bundle that never
 * reads the definition drops it, as the other types' are dropped.
 */
/* @__NO_SIDE_EFFECTS__ */
function defineXyGraph(): GraphTypeDefinition<XyGraph> {
  return {
    type: "xy-graph",
    title: "x,y coordinate graph",
    description: `A coordinate graph: an x-axis and a y-axis, each through the origin when the other's range includes zero and along the nearest edge otherwise, showing one, two or four quadrants, one unit drawn the same length on both axes; optionally a grid, points (at most ${XY_ELEMENT_LIMIT}) and line segments (at most ${XY_ELEMENT_LIMIT}).`,
    properties: defineXyGraphProperties(),
    derivations: [],
    checks: [...axisDomainChecks("xAxis"), ...axisDomainChecks("yAxis"), pointsInRange, segmentsInRange, segmentsHaveLength],
    // A top-level label or color belongs on a point or segment (GSV-REQ-045).
    elementsHint: "each point or segment",
    /**
     * "A coordinate graph titled “Distance”, x from -5 to 5 ticked every 1, y from -5 to 5 ticked
     * every 1, showing all four quadrants, with grid lines. The x-axis is labeled “Time”. 2 points
     * are plotted: (1, 2) labeled “A” and (-3, 4). 1 segment is drawn: from (1, 2) to (-3, 4)
     * labeled “AB”." Supplied values are stated as written and a default spacing rounded; unequal
     * units are said, so the text alternative says what the figure shows (prd/CC-002).
     */
    // @spec NLC-REQ-012, NLC-REQ-023, NLC-REQ-026, NLC-REQ-031, NLC-REQ-032
    describe: (graph: XyGraph, provenance: Provenance) => {
      const at = (path: string, value: number) => stateMeasurement(value, sourceOf(provenance, path));
      // The spacing the layout draws: a default one fitted to the axis's drawn length (NLC TICKET-009).
      const rooms = planeRooms(graph);
      const axis = (name: "x" | "y") => {
        const { min, max, tickSpacing } = graph[`${name}Axis`];
        const given = Object.hasOwn(graph[`${name}Axis`], "tickSpacing") ? tickSpacing : undefined;
        const spacing = stateMeasurement(axisSpacing(min, max, given, rooms[name]), given === undefined ? "derived" : "supplied");
        return `${name} from ${at(`${name}Axis/min`, min)} to ${at(`${name}Axis/max`, max)} ticked every ${spacing}`;
      };
      const point = (path: string, p: XyCoordinates) =>
        `(${at(`${path}/x`, coordinate(p.x, graph.xAxis))}, ${at(`${path}/y`, coordinate(p.y, graph.yAxis))})`;
      const labeled = (text: string, label: string | undefined) => (cleaned(label) === "" ? text : `${text} labeled ${quoteText(cleaned(label))}`);
      const title = cleaned(graph.title);
      const sentences = [
        `A coordinate graph${title === "" ? "" : ` titled ${quoteText(title)}`}, ${axis("x")}, ${axis("y")}, showing ${QUADRANTS[quadrantCount(graph.xAxis, graph.yAxis)]}${graph.showGrid === true ? ", with grid lines" : ""}.`,
      ];
      for (const name of ["x", "y"] as const) {
        const label = cleaned(graph[`${name}AxisLabel`]);
        if (label !== "") sentences.push(`The ${name}-axis is labeled ${quoteText(label)}.`);
        if (graph[`${name}Axis`].showTickLabels === false) sentences.push(`The ${name}-axis ticks are not labeled.`);
      }
      const shape = planeShape(graph.xAxis, graph.yAxis);
      if (!shape.equalUnits) sentences.push(`To fit, one y unit is drawn ${shape.ratio === PLANE_MAX_RATIO ? "shorter" : "longer"} than one x unit.`);
      const points = graph.points ?? [];
      const segments = graph.segments ?? [];
      if (points.length > 0) {
        const entries = points.map((p, i) => labeled(point(`points/${i}`, p), p.label));
        sentences.push(`${points.length} ${points.length === 1 ? "point is" : "points are"} plotted: ${formatList(entries)}.`);
      }
      if (segments.length > 0) {
        const entries = segments.map((s, i) => labeled(`from ${point(`segments/${i}/from`, s.from)} to ${point(`segments/${i}/to`, s.to)}`, s.label));
        sentences.push(`${segments.length} ${segments.length === 1 ? "segment is" : "segments are"} drawn: ${formatList(entries)}.`);
      }
      if (points.length + segments.length === 0) sentences.push("No points or segments are drawn.");
      return sentences.join(" ");
    },
  };
}
