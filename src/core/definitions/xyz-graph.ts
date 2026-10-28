import { cleanText, formatList, quoteText, sourceOf, stateMeasurement } from "../format";
import { createIssue, pointer } from "../issues";
import type { Issue, Provenance } from "../result";
import { defaultStyle } from "../style";
import { type AxisRoom, axisSpacing } from "../value-scale";
import { type Axis, axisDomainChecks, axisProperty } from "./axis";
import { POINTS_DESCRIPTION, sharedProperties } from "./shared";
import { type DescriptionBase, type DomainCheck, type GraphTypeDefinition, type PropertySpec, defineProperties } from "./types";
import { coordinate, coordinates } from "./xy-graph";

/** A position on an x,y,z graph, in its axes' own numbers. */
export interface XyzCoordinates {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** One plotted point of an x,y,z graph (NLC-REQ-037, NLC-REQ-011). */
export interface XyzPoint extends XyzCoordinates {
  readonly label?: string;
  /** A resolved `#rrggbb` color. */
  readonly color?: string;
}

/** A normalized x,y,z graph description (NLC-REQ-034). */
export interface XyzGraph extends DescriptionBase {
  readonly type: "xyz-graph";
  readonly xAxis: Axis;
  readonly yAxis: Axis;
  readonly zAxis: Axis;
  /** Whether guide lines run from each point to the x,y plane; absent means not (NLC-REQ-038). */
  readonly guideLines?: boolean;
  readonly points?: readonly XyzPoint[];
  readonly title?: string;
  readonly xAxisLabel?: string;
  readonly yAxisLabel?: string;
  readonly zAxisLabel?: string;
}

/**
 * The most points an x,y,z graph may hold: a curriculum-sized bound on label placement and the
 * text alternative, as for the x,y graph (GSV TICKET-003 security review SEC-001).
 */
export const XYZ_POINT_LIMIT = 1000;

/**
 * How long each axis is drawn, in drawing units before projection, whatever its range: so the
 * figure, a 240 × 278 hexagon on the page, fits the drawing's width with room for its labels.
 * Here, not in the layout, so the default tick spacing `describe` states can read it (NLC TICKET-009).
 */
export const AXIS_LENGTH = 170;

/**
 * How long each axis is drawn on the page: `AXIS_LENGTH` foreshortened by the projection's
 * `ISO_SCALE`, √(2/3) (`src/layout/kit/isometric.ts`), which `./core` must not import;
 * `tests/layout/xyz-graph.test.ts` pins the two together.
 */
export const AXIS_PAGE_LENGTH = Math.sqrt(2 / 3) * AXIS_LENGTH;

/** The cosine of the 30° the x-axis and y-axis are drawn below the horizontal. */
const COS_30 = Math.sqrt(3) / 2;

/**
 * The room each axis's tick labels have (`AxisRoom`), for the default spacing `describe` states and
 * the layout draws (NLC-REQ-005, NLC-REQ-039): every axis is `AXIS_PAGE_LENGTH` long on the page,
 * and neighbouring labels keep a fifth of the tick font size apart, as on the x,y graph. An x or a
 * y label is written straight below its tick, on an axis 30° off the horizontal, so neighbours
 * `apart` along it stand `apart × cos 30°` apart across the page, which must clear half of each
 * label's width and the gap: both are divided by cos 30°. A z label, beside its upright axis, needs
 * its height. An axis with hidden tick labels has no room, and keeps the range's own spacing (NLC
 * TICKET-009).
 */
// @spec NLC-REQ-005, NLC-REQ-039
export function xyzRooms(graph: XyzGraph): { x: AxisRoom | undefined; y: AxisRoom | undefined; z: AxisRoom | undefined } {
  const tickFont = defaultStyle.fontSizes.tickLabel;
  const gap = tickFont / 5;
  const slanted: AxisRoom = { length: AXIS_PAGE_LENGTH, extent: gap / COS_30, textSize: tickFont / COS_30 };
  const upright: AxisRoom = { length: AXIS_PAGE_LENGTH, extent: tickFont * 1.2 + gap, textSize: 0 };
  return {
    x: graph.xAxis.showTickLabels === false ? undefined : slanted,
    y: graph.yAxis.showTickLabels === false ? undefined : slanted,
    z: graph.zAxis.showTickLabels === false ? undefined : upright,
  };
}

/** Caller text cleaned of hidden characters, or `""` when absent. */
const cleaned = (text: string | undefined): string => (text === undefined ? "" : cleanText(text));

/** The `z` term, beside the shared `x` and `y` (GSV-REQ-015); off its axis it is reported by `pointsInRange`. */
const zCoordinate = {
  term: "z",
  kind: "number",
  required: true,
  description: "A position along the z-axis, in its own numbers: a point's z coordinate, inside the z-axis range, ends included.",
} as const satisfies PropertySpec;

/**
 * The x,y,z graph's own terms (NLC-REQ-001, NLC-REQ-034, NLC-REQ-037..039): its three axes, each
 * with its own tick spacing, the guide-line setting, and the points with the shared label and color
 * nested. The title and axis labels are shared options that `propertiesOf` adds, never listed here.
 * Built by a function free of side effects, so a bundle that never reads the x,y,z graph drops it.
 */
// @spec NLC-REQ-001, NLC-REQ-034, NLC-REQ-037, NLC-REQ-038, NLC-REQ-039
/* @__NO_SIDE_EFFECTS__ */
function defineXyzGraphProperties() {
  return defineProperties({
    // The x,y graph's own `xAxis` and `yAxis` wording: a term has one definition (GSV-REQ-015).
    xAxis: axisProperty("xAxis", "coordinate graph's x"),
    yAxis: axisProperty("yAxis", "coordinate graph's y"),
    zAxis: axisProperty("zAxis", "three-dimensional coordinate graph's upright z"),
    guideLines: {
      term: "guideLines",
      kind: "boolean",
      required: false,
      description:
        "Whether a three-dimensional coordinate graph draws dashed guide lines from each point straight to the x,y plane, and from there to the x-axis and the y-axis, so the point's depth can be read; off unless true.",
    },
    points: {
      term: "points",
      kind: "array",
      required: false,
      maxItems: XYZ_POINT_LIMIT,
      description: POINTS_DESCRIPTION,
      items: {
        kind: "object",
        description: "One plotted point: its x, y and z, and optionally its label and color.",
        // The shared element options, nested per point (GSV-REQ-045).
        properties: { ...coordinates, z: zCoordinate, label: sharedProperties.label, color: sharedProperties.color },
      },
    },
  });
}

/**
 * Every point coordinate outside its axis's range, each reported once as `outside_axis_range` at
 * its own path (`/points/2/z`), naming the range; an end as written is inside (NLC-REQ-010).
 * O(points).
 */
// @spec NLC-REQ-010
const pointsInRange: DomainCheck<XyzGraph> = {
  name: "every point lies inside all three axis ranges",
  inputs: ["xAxis/min", "xAxis/max", "yAxis/min", "yAxis/max", "zAxis/min", "zAxis/max", "points/*/x", "points/*/y", "points/*/z"],
  check: (graph) => {
    const issues: Issue[] = [];
    (graph.points ?? []).forEach((point, i) => {
      for (const name of ["x", "y", "z"] as const) {
        const { min, max } = graph[`${name}Axis`];
        const got = point[name];
        if (got < min || got > max) issues.push(createIssue("outside_axis_range", pointer("points", i, name), { term: `points[${i}].${name}`, got, range: { min, max } }));
      }
    });
    return issues;
  },
};

/**
 * The x,y,z coordinate graph (NLC-REQ-001, NLC-REQ-034..039): three axes in the package's one
 * isometric projection, each drawn the same length, plotted points, and optional guide lines.
 */
// @spec NLC-REQ-001, NLC-REQ-034, NLC-REQ-035
export const xyzGraph: GraphTypeDefinition<XyzGraph> = /* @__PURE__ */ defineXyzGraph();

/**
 * Builds the x,y,z graph definition. A function marked free of side effects, so a bundle that never
 * reads the definition drops it, as the other types' are dropped.
 */
/* @__NO_SIDE_EFFECTS__ */
function defineXyzGraph(): GraphTypeDefinition<XyzGraph> {
  return {
    type: "xyz-graph",
    title: "x,y,z coordinate graph",
    description: `A three-dimensional coordinate graph: an x-axis, a y-axis and a z-axis meeting at the origin (or, for a range without zero, at its end nearest zero), drawn in isometric projection, the same fixed view as cubes and cylinders: z straight up the page, x toward the lower left and y toward the lower right, each 30° below the horizontal, the three 120° apart. Each axis is drawn the same length whatever its range. Points (at most ${XYZ_POINT_LIMIT}) are plotted at their x, y and z, optionally with dashed guide lines to the x,y plane.`,
    properties: defineXyzGraphProperties(),
    derivations: [],
    checks: [...axisDomainChecks("xAxis"), ...axisDomainChecks("yAxis"), ...axisDomainChecks("zAxis"), pointsInRange],
    // A top-level label or color belongs on a point (GSV-REQ-045).
    elementsHint: "each point",
    /**
     * "A three-dimensional coordinate graph titled “Room”, x from 0 to 5 ticked every 1, y from 0
     * to 5 ticked every 1, z from 0 to 5 ticked every 1, in isometric projection, with guide lines
     * from each point to the x,y plane. The z-axis is labeled “Height”. 1 point is plotted: (1, 2,
     * 3) labeled “A”." Supplied values are stated as written, and so is a default spacing, the one
     * the layout draws (`xyzRooms`, NLC TICKET-009). Axes of different spans are said to draw their
     * units at different lengths, so the text alternative says what the figure shows (prd/CC-002).
     */
    // @spec NLC-REQ-012, NLC-REQ-035, NLC-REQ-038, NLC-REQ-039
    describe: (graph: XyzGraph, provenance: Provenance) => {
      const at = (path: string, value: number) => stateMeasurement(value, sourceOf(provenance, path));
      // The spacing the layout draws: a default one fitted to the axis's drawn length (NLC TICKET-009).
      const rooms = xyzRooms(graph);
      const axis = (name: "x" | "y" | "z") => {
        const { min, max, tickSpacing } = graph[`${name}Axis`];
        const given = Object.hasOwn(graph[`${name}Axis`], "tickSpacing") ? tickSpacing : undefined;
        // Exactly as drawn, given or default (NLC TICKET-009 security review SEC-001).
        const spacing = stateMeasurement(axisSpacing(min, max, given, rooms[name]), "supplied");
        return `${name} from ${at(`${name}Axis/min`, min)} to ${at(`${name}Axis/max`, max)} ticked every ${spacing}`;
      };
      const point = (path: string, p: XyzCoordinates) =>
        `(${at(`${path}/x`, coordinate(p.x, graph.xAxis))}, ${at(`${path}/y`, coordinate(p.y, graph.yAxis))}, ${at(`${path}/z`, coordinate(p.z, graph.zAxis))})`;
      const title = cleaned(graph.title);
      const sentences = [
        `A three-dimensional coordinate graph${title === "" ? "" : ` titled ${quoteText(title)}`}, ${axis("x")}, ${axis("y")}, ${axis("z")}, in isometric projection${graph.guideLines === true ? ", with guide lines from each point to the x,y plane" : ""}.`,
      ];
      for (const name of ["x", "y", "z"] as const) {
        const label = cleaned(graph[`${name}AxisLabel`]);
        if (label !== "") sentences.push(`The ${name}-axis is labeled ${quoteText(label)}.`);
        if (graph[`${name}Axis`].showTickLabels === false) sentences.push(`The ${name}-axis ticks are not labeled.`);
      }
      const span = (a: Axis) => a.max - a.min;
      if (span(graph.xAxis) !== span(graph.yAxis) || span(graph.yAxis) !== span(graph.zAxis)) {
        sentences.push("Each axis is drawn the same length, so one unit is not drawn the same length on every axis.");
      }
      const points = graph.points ?? [];
      if (points.length === 0) sentences.push("No points are plotted.");
      else {
        const entries = points.map((p, i) => {
          const text = point(`points/${i}`, p);
          return cleaned(p.label) === "" ? text : `${text} labeled ${quoteText(cleaned(p.label))}`;
        });
        sentences.push(`${points.length} ${points.length === 1 ? "point is" : "points are"} plotted: ${formatList(entries)}.`);
      }
      return sentences.join(" ");
    },
  };
}
