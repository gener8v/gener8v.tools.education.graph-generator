import { type Square, square as squareDefinition, squareLabels } from "../core/definitions/square";
import { sourceOf } from "../core/format";
import type { Provenance } from "../core/result";
import { defaultStyle } from "../core/style";
import { fmt, fmtPoints } from "./kit/format";
import { GAP, type LabelRequest, type LabelSize, type Point, placeLabels, polylineNode } from "./kit/figure-labels";
import type { Obstacle, Segment } from "./kit/labels";
import { measurementLabel } from "./kit/measure";
import { LINE_HEIGHT, SCENE_MARGIN, titleBlock } from "./kit/title";
import type { Layout } from "./registry";
import { SCENE_WIDTH, type Scene, type SceneNode } from "./scene";

/** The drawn side: every square is scaled to it, so it fits the drawing at any size (GSS-REQ-031). */
export const DRAWN_SIDE = 200;
/** The side of the small square that marks a right angle, drawn inside its corner (GSS-REQ-009). */
export const RIGHT_ANGLE_MARK = 14;

const CENTER_X = SCENE_WIDTH / 2;

/**
 * The square's layout (AD-002): the square at a fixed drawn side, centered below the title, each
 * side a figure line and an obstacle. One side (the bottom) or all four are labeled outside the
 * square with `placeLabels`, which keeps each label clear of the sides and the other labels
 * (AD-010) and stacks one with no clear place below the figure, so labels never overlap, however
 * small the square's side length: it is always drawn at the same size (GSS-REQ-031). The right
 * angles are marked with a small square-corner polyline inside each corner.
 */
// @spec GSS-REQ-007, GSS-REQ-008, GSS-REQ-009, GSS-REQ-033, GSS-REQ-034, GSS-REQ-035, GSS-REQ-036
export const squareLayout: Layout<Square> = (normalized: Square, provenance: Provenance): Scene => {
  const lineColor = normalized.lineColor ?? defaultStyle.colors.line;
  const fontSize = defaultStyle.fontSizes.label;
  const lineHeight = fontSize * LINE_HEIGHT;
  const title = titleBlock(normalized.title);

  // Room for one line of labels above and below the square.
  const left = CENTER_X - DRAWN_SIDE / 2;
  const right = left + DRAWN_SIDE;
  const top = title.height + SCENE_MARGIN + lineHeight + GAP;
  const bottom = top + DRAWN_SIDE;
  const figureBottom = bottom + GAP + lineHeight;
  const nodes: SceneNode[] = [...title.nodes];
  // The title is kept clear by the candidates' bounds below, not as an obstacle.
  const obstacles: Obstacle[] = [];

  const corners: ReadonlyArray<readonly [number, number]> = [
    [left, top],
    [right, top],
    [right, bottom],
    [left, bottom],
  ];
  nodes.push({
    kind: "polygon",
    attrs: [
      ["points", fmtPoints(corners)],
      ["fill", "none"],
      ["stroke", lineColor],
      ["stroke-width", fmt(defaultStyle.lineWidths.figure)],
      ["stroke-linejoin", "round"],
    ],
  });
  const sides: Record<"top" | "right" | "bottom" | "left", Segment> = {
    top: { x1: left, y1: top, x2: right, y2: top },
    right: { x1: right, y1: top, x2: right, y2: bottom },
    bottom: { x1: left, y1: bottom, x2: right, y2: bottom },
    left: { x1: left, y1: top, x2: left, y2: bottom },
  };
  for (const side of [sides.top, sides.right, sides.bottom, sides.left]) obstacles.push(side);

  if (normalized.showRightAngles === true) {
    // Each mark runs from a point along one side, through the corner's inner point, to a point
    // along the other side.
    const m = RIGHT_ANGLE_MARK;
    const marks: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
      [[left + m, top], [left + m, top + m], [left, top + m]],
      [[right - m, top], [right - m, top + m], [right, top + m]],
      [[right - m, bottom], [right - m, bottom - m], [right, bottom - m]],
      [[left + m, bottom], [left + m, bottom - m], [left, bottom - m]],
    ];
    for (const mark of marks) {
      nodes.push(polylineNode(mark, lineColor));
      for (let i = 0; i + 1 < mark.length; i++) {
        obstacles.push({ x1: mark[i]![0], y1: mark[i]![1], x2: mark[i + 1]![0], y2: mark[i + 1]![1] });
      }
    }
  }

  // Candidates outside a side: centered on it, then a quarter of the side either way.
  const offsets = [0, -DRAWN_SIDE / 4, DRAWN_SIDE / 4];
  const outside = {
    bottom: (size: LabelSize): Point[] => offsets.map((dx) => ({ x: CENTER_X + dx - size.width / 2, y: bottom + GAP })),
    top: (size: LabelSize): Point[] => offsets.map((dx) => ({ x: CENTER_X + dx - size.width / 2, y: top - GAP - size.height })),
    left: (size: LabelSize): Point[] => offsets.map((dy) => ({ x: left - GAP - size.width, y: (top + bottom) / 2 + dy - size.height / 2 })),
    right: (size: LabelSize): Point[] => offsets.map((dy) => ({ x: right + GAP, y: (top + bottom) / 2 + dy - size.height / 2 })),
  };

  const labels = squareLabels(normalized);
  const text = measurementLabel(normalized.sideLength, sourceOf(provenance, "sideLength"), normalized.unit, labels.customText);
  const requests: LabelRequest[] = [];
  // One label is on the bottom side; all four, bottom first. A blank text draws nothing (DEL-003).
  if (labels.count >= 1) requests.push({ text, candidates: outside.bottom });
  if (labels.count === 4) {
    requests.push({ text, candidates: outside.top }, { text, candidates: outside.left }, { text, candidates: outside.right });
  }
  const placed = placeLabels(requests, obstacles, { left: SCENE_MARGIN, top: title.height, right: SCENE_WIDTH - SCENE_MARGIN, bottom: figureBottom }, figureBottom);
  for (const node of placed.nodes) nodes.push(node);

  return {
    width: SCENE_WIDTH,
    height: fmt(placed.bottom + SCENE_MARGIN),
    textAlternative: squareDefinition.describe(normalized, provenance),
    nodes,
  };
};
