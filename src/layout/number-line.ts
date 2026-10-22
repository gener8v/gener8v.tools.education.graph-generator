import { type NumberLine, numberLine as numberLineDefinition, customLabelsByTick, hasArrow, numberLineTicks } from "../core/definitions/number-line";
import { cleanText } from "../core/format";
import type { Provenance } from "../core/result";
import { defaultStyle } from "../core/style";
import { drawAxis } from "./kit/axis";
import { fmt, fmtPoints } from "./kit/format";
import { type Box, type Obstacle, placeLabel } from "./kit/labels";
import { MARKER_REACH, drawMarker } from "./kit/markers";
import { linearScale } from "./kit/scale";
import { textWidth, wrap } from "./kit/text";
import { tickLabel } from "./kit/ticks";
import { LINE_HEIGHT, SCENE_MARGIN, textLines, titleBlock } from "./kit/title";
import type { Layout } from "./registry";
import { SCENE_WIDTH, type Scene, type SceneNode } from "./scene";

/** How far an arrowhead's line runs past the range's end, and the head's length and half width. */
const ARROW_EXTENSION = 8;
const ARROW_HEAD_LENGTH = 9;
const ARROW_HEAD_HALF_WIDTH = 4.5;
/** Room past each end of the range for an arrowhead, whether or not it is drawn (DEL-002). */
const ARROW_ROOM = ARROW_EXTENSION + ARROW_HEAD_LENGTH;

/**
 * A custom tick label is cut to one line ending in "…" at the room between neighbouring ticks on
 * the span drawn, so it stays clear of their labels, but never narrower than `TICK_LABEL_MIN_WIDTH`
 * nor wider than `TICK_LABEL_MAX_WIDTH`. Below the minimum, on a densely ticked line, neighbouring
 * labels may touch, as numeric ones may (DEL-003; code review CR-002).
 */
export const TICK_LABEL_MAX_WIDTH = 80;
export const TICK_LABEL_MIN_WIDTH = 24;
/** Space kept between a custom tick label and its neighbours' labels. */
const TICK_LABEL_SPACE = 4;
/** Point labels wider than this wrap, to at most `LABEL_MAX_LINES` lines. */
const LABEL_MAX_WIDTH = 120;
/**
 * A point label or the line label longer than this many lines is cut, ending in "…", so caller
 * text yields a bounded Scene; the text alternative states it whole (GSS TICKET-002 SEC-001).
 */
export const LABEL_MAX_LINES = 2;
/** How many rows above the line a point label may move up to, to clear the others (DEL-007). */
export const LABEL_ROWS = 4;
/** Clearance between a label and what it labels, or the label below it. */
const GAP = 4;
/**
 * How far a shifted candidate moves a label off its point's center, in label widths plus `GAP`:
 * one, so it sits beside the centered label and labels at one value find room (code review CR-003).
 */
const SHIFT = 1;

type Size = { readonly width: number; readonly height: number };

/** `text` broken into at most `maxLines` lines no wider than `maxWidth`, with the size of its box. */
function measure(text: string, maxWidth: number, fontSize: number, maxLines: number): { lines: string[] } & Size {
  const lines = wrap(text, maxWidth, fontSize, maxLines);
  // A loop, not `Math.max(...)`: never spread a caller-sized array into arguments.
  let width = 0;
  for (const line of lines) width = Math.max(width, textWidth(line, fontSize));
  return { lines, width, height: lines.length * fontSize * LINE_HEIGHT };
}

/** A filled triangle pointing along `direction` (−1 left, 1 right) with its tip at `tipX`. */
function arrowhead(tipX: number, y: number, direction: -1 | 1, color: string): SceneNode {
  const baseX = tipX - direction * ARROW_HEAD_LENGTH;
  return {
    kind: "polygon",
    attrs: [
      [
        "points",
        fmtPoints([
          [tipX, y],
          [baseX, y - ARROW_HEAD_HALF_WIDTH],
          [baseX, y + ARROW_HEAD_HALF_WIDTH],
        ]),
      ],
      ["fill", color],
    ],
  };
}

const segment = (x1: number, x2: number, y: number, color: string): SceneNode => ({
  kind: "line",
  attrs: [
    ["x1", fmt(x1)],
    ["y1", fmt(y)],
    ["x2", fmt(x2)],
    ["y2", fmt(y)],
    ["stroke", color],
    ["stroke-width", fmt(defaultStyle.lineWidths.axis)],
  ],
});

/**
 * The number line's layout (AD-002). From the top: the title (`titleBlock`), the band of point
 * labels, the line with its ticks, tick labels and arrowheads (`drawAxis`), then the line label.
 *
 * The range maps onto a span inset by room for an arrowhead and for half the widest tick label at
 * each end, whatever the arrow settings, so turning an arrow on or off never moves a tick (DEL-002).
 * An end with an arrowhead extends the line `ARROW_EXTENSION` past the range and ends in a filled
 * triangle polygon (AD-008: no `<marker>`, no ids); an end without one stops at the range end
 * (NLC-REQ-016, NLC-REQ-017). The line, its ticks and its arrowheads take `lineColor` (DEL-001).
 *
 * Each point is a circle marker at `linearScale(value)` in its own color or the accent (NLC-REQ-018,
 * NLC-REQ-011). Its label, wrapped and cut to `LABEL_MAX_LINES`, is placed by `placeLabel` above
 * the line: centered on the point, then shifted right and left, on up to `LABEL_ROWS` rows, clear of
 * the line, the markers and every label placed before it. A label with no clear place takes the
 * first candidate (DEL-007; NLC OQ-005), so every point and label is drawn, coincident ones too.
 * Custom tick labels replace the numeric label at their tick, the first at a tick winning, each cut
 * to one line no wider than the room between ticks (NLC-REQ-019; DEL-003, DEL-008). Labels are in the text
 * color (GSV-REQ-045).
 */
// @spec NLC-REQ-007, NLC-REQ-011, NLC-REQ-014, NLC-REQ-016, NLC-REQ-018, NLC-REQ-019, NLC-REQ-021
export const numberLineLayout: Layout<NumberLine> = (normalized: NumberLine, provenance: Provenance): Scene => {
  const { min, max } = normalized.axis;
  const drawn = numberLineTicks(normalized.axis);
  // Validation accepts no other axis; a layout bug fails closed as `internal_error`.
  if (drawn === undefined) throw new RangeError("numberLineLayout(): the axis cannot be drawn");
  const lineColor = normalized.lineColor ?? defaultStyle.colors.line;
  const tickFont = defaultStyle.fontSizes.tickLabel;
  const labelFont = defaultStyle.fontSizes.label;
  const lineHeight = labelFont * LINE_HEIGHT;
  const showTickLabels = normalized.axis.showTickLabels !== false;

  // Custom labels, each cleaned and cut to one line no wider than the room between ticks on a span;
  // a blank stays blank (DEL-003, DEL-004).
  const customLabels = customLabelsByTick(drawn.ticks, drawn.spacing, normalized.tickLabels ?? []);
  const cutTo = (span: number): Map<number, string> => {
    const room = (span * drawn.spacing) / (max - min) - TICK_LABEL_SPACE;
    const width = Math.min(TICK_LABEL_MAX_WIDTH, Math.max(TICK_LABEL_MIN_WIDTH, room));
    const cut = new Map<number, string>();
    for (const [tick, text] of customLabels) {
      const shown = cleanText(text);
      cut.set(tick, shown === "" ? "" : (wrap(shown, width, tickFont, 1)[0] ?? ""));
    }
    return cut;
  };
  // First on the widest span the line can have, which sizes the end room.
  let labels = cutTo(SCENE_WIDTH - 2 * (SCENE_MARGIN + ARROW_ROOM));
  // Room at each end for half the widest tick label, so labels at the ends stay inside the drawing.
  let halfLabel = 0;
  if (showTickLabels) {
    for (const tick of drawn.ticks) halfLabel = Math.max(halfLabel, textWidth(labels.get(tick) ?? tickLabel(tick, drawn.spacing), tickFont) / 2);
  }
  const inset = SCENE_MARGIN + Math.max(ARROW_ROOM, halfLabel);
  const [left, right] = [inset, SCENE_WIDTH - inset];
  // Then again on the span drawn, which that room narrowed. A cut only narrows a label, so the
  // labels still fit the room at the ends (code review CR-002).
  if (right - left < SCENE_WIDTH - 2 * (SCENE_MARGIN + ARROW_ROOM)) labels = cutTo(right - left);
  const xOf = linearScale([min, max], [left, right]);

  // Point labels, placed relative to the line at y = 0, then moved below the title.
  const points = normalized.points ?? [];
  const markerBoxes: Obstacle[] = points.map((point) => {
    const x = xOf(point.value);
    return { x: x - MARKER_REACH, y: -MARKER_REACH, width: 2 * MARKER_REACH, height: 2 * MARKER_REACH };
  });
  const obstacles: Obstacle[] = [{ x1: left, y1: 0, x2: right, y2: 0 }, ...markerBoxes];
  const placed: Array<{ lines: string[]; box: Box }> = [];
  points.forEach((point) => {
    const text = point.label === undefined ? "" : cleanText(point.label);
    if (text === "") return;
    const size = measure(text, LABEL_MAX_WIDTH, labelFont, LABEL_MAX_LINES);
    const x = xOf(point.value);
    const inside = (cx: number) => Math.min(Math.max(cx, SCENE_MARGIN), SCENE_WIDTH - SCENE_MARGIN - size.width);
    const candidates: Array<{ x: number; y: number }> = [];
    for (let row = 0; row < LABEL_ROWS; row++) {
      const y = -MARKER_REACH - GAP - size.height - row * (LABEL_MAX_LINES * lineHeight + GAP);
      for (const offset of [0, SHIFT, -SHIFT]) candidates.push({ x: inside(x - size.width / 2 + offset * (size.width + GAP)), y });
    }
    const box: Box = placeLabel(size, candidates, obstacles) ?? { ...candidates[0]!, ...size };
    obstacles.push(box);
    placed.push({ lines: size.lines, box });
  });
  let labelTop = -MARKER_REACH;
  for (const { box } of placed) labelTop = Math.min(labelTop, box.y);

  const title = titleBlock(normalized.title);
  const lineY = title.height + SCENE_MARGIN - labelTop;
  const nodes: SceneNode[] = [...title.nodes];

  // The line, its ticks and labels, then an arrowhead or a plain end at each end.
  for (const node of drawAxis({
    from: [left, lineY],
    to: [right, lineY],
    domain: [min, max],
    ticks: drawn.ticks,
    spacing: drawn.spacing,
    labels,
    showTickLabels,
    side: "below",
    lineColor,
  })) {
    nodes.push(node);
  }
  if (hasArrow(normalized.leftArrow)) {
    nodes.push(segment(left - ARROW_EXTENSION, left, lineY, lineColor), arrowhead(left - ARROW_ROOM, lineY, -1, lineColor));
  }
  if (hasArrow(normalized.rightArrow)) {
    nodes.push(segment(right, right + ARROW_EXTENSION, lineY, lineColor), arrowhead(right + ARROW_ROOM, lineY, 1, lineColor));
  }

  for (const point of points) nodes.push(drawMarker("circle", xOf(point.value), lineY, point.color ?? defaultStyle.colors.accent));
  for (const { lines, box } of placed) {
    for (const node of textLines(lines, box.x + box.width / 2, lineY + box.y, labelFont, defaultStyle.colors.text)) nodes.push(node);
  }

  // The line label, centered below the tick labels (DEL-011).
  let bottom = lineY + defaultStyle.tickLength / 2 + GAP + (showTickLabels ? tickFont * LINE_HEIGHT : 0);
  const lineLabel = normalized.lineLabel === undefined ? "" : cleanText(normalized.lineLabel);
  if (lineLabel !== "") {
    const size = measure(lineLabel, SCENE_WIDTH - 2 * SCENE_MARGIN, labelFont, LABEL_MAX_LINES);
    for (const node of textLines(size.lines, SCENE_WIDTH / 2, bottom + GAP, labelFont, defaultStyle.colors.text)) nodes.push(node);
    bottom += GAP + size.height;
  }

  return {
    width: SCENE_WIDTH,
    height: fmt(bottom + SCENE_MARGIN),
    textAlternative: numberLineDefinition.describe(normalized, provenance),
    nodes,
  };
};
