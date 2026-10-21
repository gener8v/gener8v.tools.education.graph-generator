import { type Ruler, ruler as rulerDefinition } from "../core/definitions/ruler";
import { cleanText } from "../core/format";
import type { Provenance } from "../core/result";
import { rulerScale } from "../core/ruler";
import { defaultStyle } from "../core/style";
import { fmt } from "./kit/format";
import { type Box, type Obstacle, placeLabel } from "./kit/labels";
import { drawRulerMarks, rulerMarksDepth, rulerNumberOverhang } from "./kit/ruler";
import { linearScale } from "./kit/scale";
import { textWidth, wrap } from "./kit/text";
import { LINE_HEIGHT, SCENE_MARGIN, textLines, titleBlock } from "./kit/title";
import type { Layout } from "./registry";
import { SCENE_WIDTH, type Scene, type SceneNode } from "./scene";

/**
 * The marked edge's length, in drawing units, whatever the ruler's length: every ruler fills the
 * drawing, and every unit of one ruler is the same length (AD-007, NLC-NFR-005). Drawn to scale
 * with itself only, never at physical size (DEL-001).
 */
export const RULER_EDGE = 352;

/** Where the marked edge starts and ends, centered in the drawing. */
const EDGE_START = (SCENE_WIDTH - RULER_EDGE) / 2;
const EDGE_END = EDGE_START + RULER_EDGE;

/** The least room between the body's end and a number past the edge's end. */
const BODY_END_CLEARANCE = 2;
/** The least distance from the body's end to the edge's end, whatever the numbers. */
const BODY_END_INSET = 8;
/** Room below the numbers, inside the body. */
const BODY_BOTTOM_PAD = 6;
/** The least space between two neighbouring numbers. */
const NUMBER_SPACE = 2;

/** The object's bar: its thickness, and the gap between it and the marked edge. */
export const BAR_HEIGHT = 12;
const BAR_GAP = 4;
/** The gap between the object's label and its bar. */
const LABEL_GAP = 6;
/** Labels wider than this wrap onto another line. */
const LABEL_MAX_WIDTH = 240;
/**
 * A label longer than this many lines is cut, ending in "…", so caller-sized text yields a bounded
 * Scene; the text alternative still states it whole (GSS TICKET-002 security review SEC-001).
 */
export const LABEL_MAX_LINES = 2;

/**
 * The numbers' font size for a ruler `length` units long: the tick-label size, or less when the
 * widest number plus `NUMBER_SPACE` would not fit in one unit of the edge, so no two numbers touch
 * (NLC TICKET-001 code review CR-005). A 30 cm ruler's numbers are about 8.
 */
export function rulerFontSize(length: number): number {
  const unit = RULER_EDGE / length;
  return Math.min(defaultStyle.fontSizes.tickLabel, (unit - NUMBER_SPACE) / textWidth(String(length), 1));
}

const rect = (x: number, y: number, width: number, height: number, fill: string, stroke?: string): SceneNode => ({
  kind: "rect",
  attrs: [
    ["x", fmt(x)],
    ["y", fmt(y)],
    ["width", fmt(width)],
    ["height", fmt(height)],
    ["fill", fill],
    ...(stroke === undefined ? [] : ([["stroke", stroke], ["stroke-width", fmt(defaultStyle.lineWidths.axis)]] as const)),
  ],
});

/**
 * The ruler's layout (AD-002; DEL-001). From the top: the title (`titleBlock`), the measured
 * object's label, its bar, then the ruler's body, whose top edge is the marked edge. The marks
 * and numbers are the ruler kit's (`drawRulerMarks`, never `drawAxis`), running down into the body,
 * at a number size chosen so neighbours never touch (`rulerFontSize`). The body is as deep as the
 * marks and numbers reach (`rulerMarksDepth`) and reaches past the edge's ends far enough for the
 * first and last numbers (`rulerNumberOverhang`).
 *
 * The object is a plain bar lying just above the edge, so it covers no mark or number, from its
 * start mark's position to its end mark's on the same `linearScale` the kit draws with. Each end is
 * the mark the mark rule locates it at, so a computed 0.1 + 0.2 is drawn at the 3 mm mark, as the
 * text alternative states it (NLC TICKET-002 code review CR-003). Its color fills the bar only
 * (DEL-003). Its label, wrapped and cut to `LABEL_MAX_LINES`, is placed above the bar with
 * `placeLabel`. Nothing states the object's length: the only numbers drawn are the whole units
 * (NLC-REQ-055).
 */
// @spec NLC-REQ-040, NLC-REQ-043, NLC-REQ-044, NLC-REQ-045, NLC-REQ-047, NLC-REQ-048, NLC-REQ-050, NLC-REQ-055
export const rulerLayout: Layout<Ruler> = (normalized: Ruler, provenance: Provenance): Scene => {
  const scale = rulerScale(normalized.rulerUnit, normalized.length, normalized.smallestDivision);
  // Validation accepts no other ruler; a layout bug fails closed as `internal_error`.
  if (scale === undefined) throw new RangeError("rulerLayout(): the description is not a validated ruler");
  const title = titleBlock(normalized.title);
  const nodes: SceneNode[] = [...title.nodes];
  const top = title.height + SCENE_MARGIN;

  const object = normalized.measuredObject;
  const labelFont = defaultStyle.fontSizes.label;
  const labelText = object?.label === undefined ? "" : cleanText(object.label);
  const labelLines = labelText === "" ? [] : wrap(labelText, LABEL_MAX_WIDTH, labelFont, LABEL_MAX_LINES);
  // A loop, not `Math.max(...)`: never spread a caller-sized array into arguments.
  let labelWidth = 0;
  for (const line of labelLines) labelWidth = Math.max(labelWidth, textWidth(line, labelFont));
  const labelHeight = labelLines.length * labelFont * LINE_HEIGHT;
  const barTop = top + (labelLines.length > 0 ? labelHeight + LABEL_GAP : 0);
  const edgeY = object === undefined ? top : barTop + BAR_HEIGHT + BAR_GAP;

  const fontSize = rulerFontSize(normalized.length);
  const overhang = rulerNumberOverhang(normalized.length, fontSize);
  const bodyStart = EDGE_START - Math.max(BODY_END_INSET, overhang.start + BODY_END_CLEARANCE);
  const bodyEnd = EDGE_END + Math.max(BODY_END_INSET, overhang.end + BODY_END_CLEARANCE);
  const bodyHeight = rulerMarksDepth(normalized.rulerUnit, fontSize) + BODY_BOTTOM_PAD;
  nodes.push(rect(bodyStart, edgeY, bodyEnd - bodyStart, bodyHeight, "none", defaultStyle.colors.line));
  const marks = drawRulerMarks({
    from: [EDGE_START, edgeY],
    to: [EDGE_END, edgeY],
    unit: normalized.rulerUnit,
    length: normalized.length,
    ...(normalized.smallestDivision === undefined ? {} : { smallestDivision: normalized.smallestDivision }),
    side: "right",
    fontSize,
  });
  for (const node of marks) nodes.push(node);

  if (object !== undefined) {
    // The kit's own mapping: a fraction of the edge, then a point along it.
    const along = linearScale([0, normalized.length], [0, 1]);
    const xOf = (value: number) => {
      const location = scale.locate(value);
      return EDGE_START + along(location.kind === "mark" ? location.value : value) * (EDGE_END - EDGE_START);
    };
    const [x1, x2] = [xOf(object.start), xOf(object.end)];
    nodes.push(rect(x1, barTop, x2 - x1, BAR_HEIGHT, object.color ?? defaultStyle.colors.accent));

    if (labelLines.length > 0) {
      const size = { width: labelWidth, height: labelHeight };
      const inside = (x: number) => Math.min(Math.max(x, SCENE_MARGIN), SCENE_WIDTH - SCENE_MARGIN - size.width);
      // Centered on the bar, then flush with either end, each kept inside the drawing.
      const candidates = [(x1 + x2 - size.width) / 2, x1, x2 - size.width].map((x) => ({ x: inside(x), y: top }));
      const obstacles: Obstacle[] = [
        { x: x1, y: barTop, width: x2 - x1, height: BAR_HEIGHT },
        { x: bodyStart, y: edgeY, width: bodyEnd - bodyStart, height: bodyHeight },
      ];
      // The band above the bar is reserved for the label and holds nothing else, so the first
      // candidate is always clear; it is the fallback should that ever change.
      const box: Box = placeLabel(size, candidates, obstacles) ?? { ...candidates[0]!, ...size };
      for (const node of textLines(labelLines, box.x + box.width / 2, box.y, labelFont, defaultStyle.colors.text)) nodes.push(node);
    }
  }

  return {
    width: SCENE_WIDTH,
    height: fmt(edgeY + bodyHeight + SCENE_MARGIN),
    textAlternative: rulerDefinition.describe(normalized, provenance),
    nodes,
  };
};
