import { AXIS_LENGTH, type XyzGraph, xyzGraph as xyzGraphDefinition, xyzRooms } from "../core/definitions/xyz-graph";
import type { Axis } from "../core/definitions/axis";
import { cleanText } from "../core/format";
import type { Provenance } from "../core/result";
import { defaultStyle } from "../core/style";
import { niceTicks } from "../core/value-scale";
import { drawAxis, drawLine } from "./kit/axis";
import { fmt } from "./kit/format";
import { HIDDEN_DASH, type Point3, isometric } from "./kit/isometric";
import { type Box, type Obstacle, type PlacedLabel, type Segment, placeElementLabel, placeLabel } from "./kit/labels";
import { MARKER_REACH, drawMarker } from "./kit/markers";
import { textWidth } from "./kit/text";
import { tickLabel } from "./kit/ticks";
import { LINE_HEIGHT, SCENE_MARGIN, textBlock, textLines, titleBlock } from "./kit/title";
import { AXIS_LABEL_MAX_LINES } from "./kit/value-scale";
import type { Layout } from "./registry";
import { SCENE_WIDTH, type Scene, type SceneNode } from "./scene";

// The axis length is core's, so the default tick spacing can read it (NLC TICKET-009).
export { AXIS_LENGTH };
/** The width an axis label wraps to, at most `AXIS_LABEL_MAX_LINES` lines. */
export const AXIS_LABEL_WIDTH = 120;
/**
 * The dash pattern of a guide line (NLC-REQ-038): the isometric kit's one dash, which a cube's
 * hidden edges use too, so every dashed line in the shared viewpoint reads alike (GSS TICKET-006
 * code review CR-001).
 */
export const GUIDE_DASH = HIDDEN_DASH;
/** How many rows outward from a point its label may move, to clear the labels near it. */
const LABEL_ROWS = 2;
/** Space between a tick, an axis's end or a marker and its label. */
const GAP = 4;

type AxisName = "x" | "y" | "z";
type Page = readonly [number, number];

/** `value` held to `[min, max]`. */
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** A box's left edge `x`, for a box `width` wide, held inside the drawing's side margins. */
const holdX = (x: number, width: number) => clamp(x, SCENE_MARGIN, Math.max(SCENE_MARGIN, SCENE_WIDTH - SCENE_MARGIN - width));

/**
 * Where the figure goes, before it is moved down below the title: the values the axes meet at, the
 * page position of a point in the axes' own numbers, and how far across the drawing the figure's
 * box reaches.
 */
interface Frame {
  /** Where the axes meet, in each axis's own numbers: 0, or the range's end nearest it. */
  readonly meet: Readonly<Record<AxisName, number>>;
  /** The page position of (`x`, `y`, `z`), in the axes' own numbers. */
  readonly pageOf: (x: number, y: number, z: number) => Page;
  /** The page x of the leftmost and rightmost corners of the figure's box. */
  readonly left: number;
  readonly right: number;
}

/**
 * The frame of an x,y,z graph (NLC-REQ-035, NLC-REQ-037). The axes meet at (0, 0, 0), or, on an
 * axis whose range leaves out zero, at its end nearest zero, and each runs its whole range through
 * that point. Each value is first scaled into drawing units relative to it, `AXIS_LENGTH` for the
 * axis's whole range, so every axis is drawn the same length and no value past ±`AXIS_LENGTH`
 * reaches the projection (GSS TICKET-001 security review SEC-002), then projected by `isometric()`
 * alone (AD-009, RES-003). The figure's box, all three ranges, is centered across the drawing.
 */
// @spec NLC-REQ-034, NLC-REQ-035, NLC-REQ-037
function frameOf(graph: XyzGraph): Frame {
  const { xAxis, yAxis, zAxis } = graph;
  const meet = { x: clamp(0, xAxis.min, xAxis.max), y: clamp(0, yAxis.min, yAxis.max), z: clamp(0, zAxis.min, zAxis.max) };
  const unit = (axis: Axis, value: number, at: number) => (value - at) * (AXIS_LENGTH / (axis.max - axis.min));
  const scaled = (x: number, y: number, z: number): Point3 => [unit(xAxis, x, meet.x), unit(yAxis, y, meet.y), unit(zAxis, z, meet.z)];
  const project = (x: number, y: number, z: number) => isometric(...scaled(x, y, z));
  let [left, right] = [Infinity, -Infinity];
  for (const x of [xAxis.min, xAxis.max]) {
    for (const y of [yAxis.min, yAxis.max]) {
      for (const z of [zAxis.min, zAxis.max]) {
        const [across] = project(x, y, z);
        [left, right] = [Math.min(left, across), Math.max(right, across)];
      }
    }
  }
  const offset = SCENE_WIDTH / 2 - (left + right) / 2;
  return {
    meet,
    pageOf: (x, y, z) => {
      const [across, down] = project(x, y, z);
      return [offset + across, down];
    },
    left: offset + left,
    right: offset + right,
  };
}

/** One axis as drawn: its page ends, its unit direction on the page from min to max, and its ticks. */
interface AxisGeometry {
  readonly name: AxisName;
  readonly axis: Axis;
  readonly from: Page;
  readonly to: Page;
  readonly direction: Page;
  /** Whether the axis runs more across the page than up it, so its tick labels go below or above. */
  readonly across: boolean;
  readonly ticks: { readonly spacing: number; readonly ticks: number[] };
  readonly show: boolean;
  /** The page position of `value` on the axis. */
  readonly at: (value: number) => Page;
}

/**
 * The three axes (NLC-REQ-034, NLC-REQ-039): each from its min to its max through the meeting
 * point, ticked at its own spacing or a default fitted to the length it is drawn at (`xyzRooms`,
 * the decision `describe` states; NLC TICKET-009), its tick spacing read own-key.
 */
// @spec NLC-REQ-034, NLC-REQ-039
function axesOf(graph: XyzGraph, frame: Frame): AxisGeometry[] {
  const rooms = xyzRooms(graph);
  const { meet, pageOf } = frame;
  return (["x", "y", "z"] as const).map((name) => {
    const axis = graph[`${name}Axis`];
    const at = (value: number) => pageOf(name === "x" ? value : meet.x, name === "y" ? value : meet.y, name === "z" ? value : meet.z);
    const [from, to] = [at(axis.min), at(axis.max)];
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const direction: Page = [(to[0] - from[0]) / length, (to[1] - from[1]) / length];
    return {
      name,
      axis,
      from,
      to,
      direction,
      across: Math.abs(direction[0]) >= Math.abs(direction[1]),
      ticks: niceTicks(axis.min, axis.max, Object.hasOwn(axis, "tickSpacing") ? axis.tickSpacing : undefined, rooms[name]),
      show: axis.showTickLabels !== false,
      at,
    };
  });
}

/** Each axis's line and its ticks, as segments, as `drawAxis` draws them: what every label must clear. */
function axisObstacles(axes: readonly AxisGeometry[]): Obstacle[] {
  const half = defaultStyle.tickLength / 2;
  const obstacles: Obstacle[] = [];
  for (const { from, to, direction, ticks, at } of axes) {
    obstacles.push({ x1: from[0], y1: from[1], x2: to[0], y2: to[1] });
    const [nx, ny] = [-direction[1], direction[0]];
    for (const tick of ticks.ticks) {
      const [x, y] = at(tick);
      obstacles.push({ x1: x - nx * half, y1: y - ny * half, x2: x + nx * half, y2: y + ny * half });
    }
  }
  return obstacles;
}

/** A tick label placed: its text and its one-line box. */
interface TickText {
  readonly text: string;
  readonly box: Box;
}

/** The rules every tick label's candidates share, worked out once from the figure. */
interface TickRules {
  /** Whether an x or y label tries above its axis first: where the z-axis runs below the meeting point. */
  readonly aboveFirst: boolean;
  /** Whether a z label tries the right of its axis first: where the figure has more room there. */
  readonly rightFirst: boolean;
  /** How far left or right of the meeting point a label clears the slanted axes, if they slope. */
  readonly wedge: number | undefined;
}

/**
 * The rules for `axes` in `frame`. Where the z-axis runs below the meeting point, between the x-axis
 * and the y-axis, the x and y labels go above their axes first, leaving that wedge to the z labels.
 * A z label goes on the left of the z-axis unless the figure has more than 1 unit more room on its
 * right. The open wedges left and right of the meeting point lie between the slanted axes: a label
 * level with it clears them `wedge` out, from the least slope among them.
 */
function tickRules(axes: readonly AxisGeometry[], frame: Frame): TickRules {
  const height = defaultStyle.fontSizes.tickLabel * LINE_HEIGHT;
  const zAxis = axes.find((axis) => axis.name === "z")!;
  // Left on a tie, which the figure's symmetric box gives up to rounding.
  const zSide = zAxis.from[0];
  let slope = Infinity;
  for (const { across, direction } of axes) if (across) slope = Math.min(slope, Math.abs(direction[1] / direction[0]));
  return {
    aboveFirst: zAxis.axis.min < frame.meet.z,
    rightFirst: frame.right - zSide > zSide - frame.left + 1,
    wedge: slope > 1e-9 && Number.isFinite(slope) ? (height / 2 + GAP) / slope : undefined,
  };
}

/**
 * Where a tick label `width` wide may go, in order, as top-left corners held inside the side margins.
 * An x or a y label goes straight below its tick, moved down just enough to clear the slanted line,
 * by half its width times the line's slope on the page, as `drawAxis` does; then above it (above
 * first by `rules`). A z label goes beside its tick, left then right (right first by `rules`). A
 * label where the axes meet may also go in the open wedge left or right of it. Then each side one
 * step farther out: a row for an x or y label, a gap for a z label (code review CR-001).
 */
function tickCandidates(axis: AxisGeometry, tick: number, width: number, meeting: boolean, rules: TickRules): Array<{ x: number; y: number }> {
  const height = defaultStyle.fontSizes.tickLabel * LINE_HEIGHT;
  const half = defaultStyle.tickLength / 2;
  const [ux, uy] = axis.direction;
  const [tx, ty] = axis.at(tick);
  let candidates: Array<{ x: number; y: number }>;
  if (axis.across) {
    const clear = half * Math.abs(ux) + GAP + (Math.abs(uy / ux) * width) / 2;
    const [below, above] = [
      { x: tx - width / 2, y: ty + clear },
      { x: tx - width / 2, y: ty - clear - height },
    ];
    candidates = rules.aboveFirst ? [above, below] : [below, above];
  } else {
    const clear = half * Math.abs(uy) + GAP + (Math.abs(ux / uy) * height) / 2;
    const [left, right] = [
      { x: tx - clear - width, y: ty - height / 2 },
      { x: tx + clear, y: ty - height / 2 },
    ];
    candidates = rules.rightFirst ? [right, left] : [left, right];
  }
  if (meeting && rules.wedge !== undefined) {
    candidates.push({ x: tx - rules.wedge - width, y: ty - height / 2 }, { x: tx + rules.wedge, y: ty - height / 2 });
  }
  const [stepX, stepY] = axis.across ? [0, height + GAP] : [width / 2 + GAP, 0];
  for (const { x, y } of candidates.slice(0, 2)) {
    candidates.push({ x: x + Math.sign(x + width / 2 - tx) * stepX, y: y + Math.sign(y + height / 2 - ty) * stepY });
  }
  return candidates.map(({ x, y }) => ({ x: holdX(x, width), y }));
}

/**
 * The tick labels (NLC-REQ-004, NLC-REQ-039), each placed by `placeLabel` at the first of its
 * `tickCandidates` clear of the axes, their ticks, the axis names and every label placed before it
 * (AD-010). A label with no clear place is left out, its tick still drawn, so no label covers another
 * (code review CR-001). The meeting point is labeled once per value: where the axes meet at (0, 0, 0),
 * the origin is labeled "0" once, by the first axis that shows its tick labels and finds it room, and
 * the other axes leave their 0 unlabeled. Values come from `tickLabel`, never rounded again (DS-001).
 */
// @spec NLC-REQ-035, NLC-REQ-039
function tickLabels(axes: readonly AxisGeometry[], frame: Frame, obstacles: Obstacle[]): TickText[] {
  const tickFont = defaultStyle.fontSizes.tickLabel;
  const height = tickFont * LINE_HEIGHT;
  const rules = tickRules(axes, frame);
  // The texts already written at the meeting point.
  const atMeeting = new Set<string>();
  const placed: TickText[] = [];
  for (const axis of axes) {
    if (!axis.show) continue;
    for (const tick of axis.ticks.ticks) {
      const text = tickLabel(tick, axis.ticks.spacing);
      const meeting = tick === frame.meet[axis.name];
      if (meeting && atMeeting.has(text)) continue;
      const width = textWidth(text, tickFont);
      const box = placeLabel({ width, height }, tickCandidates(axis, tick, width, meeting, rules), obstacles);
      if (box === undefined) continue;
      if (meeting) atMeeting.add(text);
      obstacles.push(box);
      placed.push({ text, box });
    }
  }
  return placed;
}

/**
 * With `guideLines: true`, each point's dashed guide lines (NLC-REQ-038): from the point (x, y, z)
 * straight to (x, y, z₀) on the x,y plane, z₀ being where the axes meet on the z-axis, then from
 * there to (x, y₀, z₀) on the x-axis and to (x₀, y, z₀) on the y-axis, so its depth can be read. A
 * piece whose two ends are the same point is left out. None without.
 */
// @spec NLC-REQ-038
function guideSegments(graph: XyzGraph, frame: Frame): Segment[] {
  if (graph.guideLines !== true) return [];
  const { meet, pageOf } = frame;
  const segments: Segment[] = [];
  const join = (a: Page, b: Page) => segments.push({ x1: a[0], y1: a[1], x2: b[0], y2: b[1] });
  for (const { x, y, z } of graph.points ?? []) {
    const foot = pageOf(x, y, meet.z);
    if (z !== meet.z) join(pageOf(x, y, z), foot);
    if (y !== meet.y) join(foot, pageOf(x, meet.y, meet.z));
    if (x !== meet.x) join(foot, pageOf(meet.x, y, meet.z));
  }
  return segments;
}

/** An axis label placed: its wrapped lines and their box. */
interface AxisText {
  readonly lines: string[];
  readonly box: Box;
}

/**
 * The axis labels (NLC-REQ-036): the supplied `xAxisLabel`, `yAxisLabel` or `zAxisLabel`, or the
 * axis's name when it is absent or blank, wrapped to `AXIS_LABEL_WIDTH` and cut to
 * `AXIS_LABEL_MAX_LINES` (`textBlock`). Each goes just beyond its axis's max end: for the x-axis and
 * y-axis level with the end, then along the axis, then below or above the end; for the z-axis above
 * its end, then higher, clear of the top tick's label, then beside it; then each of those a row
 * higher and a row lower. Each is placed by `placeLabel` `GAP / 2` clear of `obstacles`, else at its
 * first candidate, and held inside the side margins. Placed before the tick labels, which give way
 * to it (code review CR-001).
 */
// @spec NLC-REQ-036
function axisLabels(graph: XyzGraph, axes: readonly AxisGeometry[], obstacles: Obstacle[]): AxisText[] {
  const half = defaultStyle.tickLength / 2;
  const tickHeight = defaultStyle.fontSizes.tickLabel * LINE_HEIGHT;
  const placed: AxisText[] = [];
  for (const { name, to, direction, across } of axes) {
    const text = cleanText(graph[`${name}AxisLabel`] ?? "");
    const { lines, width, height } = textBlock(text === "" ? name : text, AXIS_LABEL_WIDTH, defaultStyle.fontSizes.label, AXIS_LABEL_MAX_LINES);
    const [ex, ey] = to;
    const [ux, uy] = direction;
    // Far enough along the axis past its end that the box's nearest side is `GAP` from it.
    const out = GAP + (Math.abs(ux) * width + Math.abs(uy) * height) / 2;
    const beyond = { x: ex + ux * out - width / 2, y: ey + uy * out - height / 2 };
    const near = (
      across
        ? [
            // Raised a little, so it clears a tick label below the end.
            { x: ux < 0 ? ex - half - GAP - width : ex + half + GAP, y: ey - height / 2 - GAP },
            beyond,
            { x: ex - width / 2, y: ey + half + GAP },
            { x: ex - width / 2, y: ey - half - GAP - height },
          ]
        : [
            beyond,
            { x: ex - width / 2, y: ey - tickHeight / 2 - GAP - height },
            { x: ex + half + GAP, y: ey - height / 2 },
            { x: ex - half - GAP - width, y: ey - height / 2 },
          ]
    );
    // Then each of those a row higher and a row lower, for two axes whose ends meet where both
    // ranges stop at zero (code review CR-001).
    const rows = near.flatMap(({ x, y }) => [-1, 1].map((row) => ({ x, y: y + row * (height + GAP) })));
    const candidates = [...near, ...rows].map(({ x, y }) => ({ x: holdX(x, width), y }));
    const box = placeLabel({ width, height }, candidates, obstacles, GAP / 2) ?? { x: candidates[0]!.x, y: candidates[0]!.y, width, height };
    obstacles.push(box);
    placed.push({ lines, box });
  }
  return placed;
}

/**
 * The point labels (NLC-REQ-011, NLC-REQ-037), each placed by `placeElementLabel` clear of
 * `obstacles` and every label placed before it: off each corner of its marker, then centered above
 * and below it, on `LABEL_ROWS` rows outward, held inside the drawing's side margins.
 */
// @spec NLC-REQ-011, NLC-REQ-037
function pointLabels(graph: XyzGraph, frame: Frame, obstacles: Obstacle[]): PlacedLabel[] {
  const reach = MARKER_REACH + GAP / 2;
  const labels: PlacedLabel[] = [];
  for (const { x, y, z, label } of graph.points ?? []) {
    const [px, py] = frame.pageOf(x, y, z);
    const placed = placeElementLabel(
      label,
      (w, h) => {
        const candidates: Array<{ x: number; y: number }> = [];
        for (let row = 0; row < LABEL_ROWS; row++) {
          const [above, below] = [py - reach - h - row * (h + GAP), py + reach + row * (h + GAP)];
          for (const at of [above, below]) candidates.push({ x: px + reach, y: at }, { x: px - reach - w, y: at });
          candidates.push({ x: px - w / 2, y: above }, { x: px - w / 2, y: below });
        }
        return candidates.map((candidate) => ({ x: holdX(candidate.x, w), y: candidate.y }));
      },
      obstacles,
    );
    if (placed !== undefined) labels.push(placed);
  }
  return labels;
}

/**
 * The x,y,z graph's layout (AD-002, AD-009). From the top: the title (`titleBlock`), then the
 * figure, its box centered across the drawing and its top `SCENE_MARGIN` below the title. By phase:
 *
 * - `frameOf` scales every value into drawing units and projects it with `isometric()` only, the
 *   one fixed view of cubes and cylinders (NLC-REQ-035); `axesOf` gives each axis its ends and its
 *   ticks, at its own spacing or the default `describe` states (NLC-REQ-039).
 * - `axisLabels` first, so every axis keeps its name: each placed clear of the axes, their ticks and
 *   the names before it, else at its first candidate (code review CR-001).
 * - `tickLabels` places each tick label clear of those and the labels before it (AD-010), the
 *   origin's "0" once; a tick label with no clear place is left out.
 * - `guideSegments`, with `guideLines`: dashed lines from each point to the x,y plane and on to the
 *   x-axis and y-axis (NLC-REQ-038), in the grid's color and width, under the axes.
 * - The points: circle markers at their projected (x, y, z), each in its color or the accent
 *   (NLC-REQ-037, NLC-REQ-011).
 * - `pointLabels`: labels placed clear of everything before them, held inside the side margins. A
 *   label with no clear place takes its first candidate (NLC OQ-005).
 *
 * The figure is laid out first, then moved down as a whole so its topmost mark sits below the title;
 * the drawing's height is its lowest mark plus the margin. Every number passes through `fmt()`
 * (AD-007, prd/TC-002), and no caller-sized list is spread into arguments.
 */
// @spec NLC-REQ-034, NLC-REQ-035, NLC-REQ-036, NLC-REQ-037, NLC-REQ-038, NLC-REQ-039
export const xyzGraphLayout: Layout<XyzGraph> = (graph: XyzGraph, provenance: Provenance): Scene => {
  const frame = frameOf(graph);
  const axes = axesOf(graph, frame);
  const obstacles = axisObstacles(axes);
  // The axis names first, which are always drawn; a tick label gives way to them (code review CR-001).
  const names = axisLabels(graph, axes, obstacles);
  const ticks = tickLabels(axes, frame, obstacles);
  const guides = guideSegments(graph, frame);
  for (const guide of guides) obstacles.push(guide);
  const accent = defaultStyle.colors.accent;
  const markers = (graph.points ?? []).map(({ x, y, z, color }) => {
    const [px, py] = frame.pageOf(x, y, z);
    obstacles.push({ x: px - MARKER_REACH, y: py - MARKER_REACH, width: 2 * MARKER_REACH, height: 2 * MARKER_REACH });
    return { x: px, y: py, color: color ?? accent };
  });
  const labels = pointLabels(graph, frame, obstacles);

  // Everything drawn is in `obstacles`: the figure's top and bottom are theirs.
  let [top, bottom] = [Infinity, -Infinity];
  for (const obstacle of obstacles) {
    const [high, low] = "x1" in obstacle ? [Math.min(obstacle.y1, obstacle.y2), Math.max(obstacle.y1, obstacle.y2)] : [obstacle.y, obstacle.y + obstacle.height];
    [top, bottom] = [Math.min(top, high), Math.max(bottom, low)];
  }
  const title = titleBlock(graph.title);
  const down = title.height + SCENE_MARGIN - top;

  const { text: textColor, grid } = defaultStyle.colors;
  const nodes: SceneNode[] = [];
  for (const node of title.nodes) nodes.push(node);
  for (const { x1, y1, x2, y2 } of guides) {
    const line = drawLine(x1, y1 + down, x2, y2 + down, defaultStyle.lineWidths.grid, grid);
    nodes.push({ ...line, attrs: [...line.attrs, ["stroke-dasharray", GUIDE_DASH]] });
  }
  for (const { axis, from, to, across, ticks: axisTicks } of axes) {
    const options = { from: [from[0], from[1] + down], to: [to[0], to[1] + down], domain: [axis.min, axis.max], ...axisTicks, showTickLabels: false, side: across ? "below" : "left" } as const;
    for (const node of drawAxis(options)) nodes.push(node);
  }
  const tickFont = defaultStyle.fontSizes.tickLabel;
  for (const { text, box } of ticks) for (const node of textLines([text], box.x + box.width / 2, box.y + down, tickFont, textColor)) nodes.push(node);
  for (const { x, y, color } of markers) nodes.push(drawMarker("circle", x, y + down, color));
  const labelFont = defaultStyle.fontSizes.label;
  // The point labels, then the axis labels, over everything else.
  for (const group of [labels, names]) {
    for (const { lines, box } of group) for (const node of textLines(lines, box.x + box.width / 2, box.y + down, labelFont, textColor)) nodes.push(node);
  }

  return {
    width: SCENE_WIDTH,
    height: fmt(bottom + down + SCENE_MARGIN),
    textAlternative: xyzGraphDefinition.describe(graph, provenance),
    nodes,
  };
};
