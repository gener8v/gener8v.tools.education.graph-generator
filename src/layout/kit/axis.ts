import { defaultStyle } from "../../core/style";
import { MAX_VALUE_TICKS } from "../../core/value-scale";
import type { SceneNode } from "../scene";
import { fmt } from "./format";
import { linearScale } from "./scale";
import { DEFAULT_FONT_STACK, textWidth } from "./text";
import { isTickValue, tickLabel } from "./ticks";
import { TICK_LABEL_DROP } from "./value-scale";

/**
 * Which side of an axis its tick labels are written on, on the page: `below` or `above` for an axis
 * running more across the page than up it, `left` or `right` for one running more up it.
 */
export type AxisSide = "below" | "above" | "left" | "right";

/** An axis to draw: where it runs on the page, the values at its ends, and its ticks. */
export interface AxisOptions {
  /** The page point of the axis's `domain[0]` end. */
  readonly from: readonly [number, number];
  /** The page point of the axis's `domain[1]` end. */
  readonly to: readonly [number, number];
  /** The axis's min and max, drawn at `from` and `to`. */
  readonly domain: readonly [number, number];
  /** The tick values, from `niceTicks`. */
  readonly ticks: readonly number[];
  /** The tick spacing, from `niceTicks`, which sets how many decimals a tick label shows. */
  readonly spacing: number;
  /**
   * Text to write at a tick in place of its value (NLC-REQ-019), already cleaned by the caller: a
   * `Map` of at most `MAX_VALUE_TICKS` entries, read only as the options' own key (security review
   * SEC-002). A label is matched to the tick its value stands for (`isTickValue`), so ⅔ matches the
   * tick listed as 0.666666666667 (code review CR-007).
   */
  readonly labels?: ReadonlyMap<number, string>;
  readonly showTickLabels: boolean;
  readonly side: AxisSide;
  /**
   * The color of the axis line and its ticks, a resolved `#rrggbb`; the default line color when
   * absent or undefined. Read only as the options' own key. Tick labels keep the text color
   * (graph-library NLC TICKET-002 DEL-001).
   */
  readonly lineColor?: string;
}

/** Space between a tick's end and its label, in drawing units. */
const LABEL_GAP = 4;

const finite = (...values: readonly number[]) => values.every(Number.isFinite);

/**
 * The options' custom labels, read own-key, else undefined. Throws on options `niceTicks` and the
 * validator never give: ends or ticks that are not finite, a domain that does not increase, a
 * spacing that is not a finite number above 0, more than `MAX_VALUE_TICKS` ticks, or labels that
 * are not a `Map` of at most that many entries. Such options are a layout bug, which then becomes
 * the fixed `internal_error` rather than a wrong drawing (security review SEC-004). O(ticks).
 */
function checkedLabels(options: AxisOptions): ReadonlyMap<number, string> | undefined {
  const { from, to, domain, ticks, spacing } = options;
  const labels = Object.hasOwn(options, "labels") ? options.labels : undefined;
  const sound =
    finite(...from, ...to) &&
    finite(...domain) &&
    domain[1] > domain[0] &&
    spacing > 0 &&
    Number.isFinite(spacing) &&
    ticks.length <= MAX_VALUE_TICKS &&
    finite(...ticks) &&
    (labels === undefined || (labels instanceof Map && labels.size <= MAX_VALUE_TICKS));
  if (!sound) throw new RangeError("drawAxis(): the options do not describe a drawable axis");
  return labels;
}

const line = (x1: number, y1: number, x2: number, y2: number, width: number, color: string): SceneNode => ({
  kind: "line",
  attrs: [
    ["x1", fmt(x1)],
    ["y1", fmt(y1)],
    ["x2", fmt(x2)],
    ["y2", fmt(y2)],
    ["stroke", color],
    ["stroke-width", fmt(width)],
  ],
});

/**
 * An axis (NLC-REQ-004, NLC-REQ-006, NLC-REQ-007): its line from `from` to `to`, a tick across the
 * line at each value of `ticks`, at its proportional place along the line (`linearScale` of the
 * domain), in `lineColor` or the default line color, and, when `showTickLabels`, each tick's label on `side`: the caller's text for that
 * value, else the value with the decimals the spacing needs (`tickLabel`). Ticks are
 * perpendicular to the line and centered on it, so the same call draws a number line, either axis
 * of an x,y graph through its origin, or a diagonal axis of an x,y,z graph. Hidden labels leave the
 * ticks. On a sloping axis each label moves out far enough to clear the line, by its estimated
 * width (`textWidth`, prd/TC-001). Every number passes through `fmt()` (AD-007). Throws on options
 * no validated axis gives (`checkedLabels`).
 */
// @spec NLC-REQ-004, NLC-REQ-006, NLC-REQ-007
export function drawAxis(options: AxisOptions): SceneNode[] {
  const labels = checkedLabels(options);
  const { from, to, domain, ticks, spacing, showTickLabels, side } = options;
  const color = (Object.hasOwn(options, "lineColor") ? options.lineColor : undefined) ?? defaultStyle.colors.line;
  const [x0, y0] = from;
  const [x1, y1] = to;
  const length = Math.hypot(x1 - x0, y1 - y0);
  // The unit normal: ticks run along it, half on each side of the line.
  const [nx, ny] = length > 0 ? [-(y1 - y0) / length, (x1 - x0) / length] : [0, 1];
  const half = defaultStyle.tickLength / 2;
  const at = linearScale([domain[0], domain[1]], [0, 1]);
  const fontSize = defaultStyle.fontSizes.tickLabel;
  const across = side === "below" || side === "above";
  // How far a tick reaches toward the label side, so the label clears it.
  const reach = half * (across ? Math.abs(ny) : Math.abs(nx));
  // On a sloping axis the line climbs toward one end of a label: move the label out by that much,
  // half the label's width (or height) times the slope, so it clears the line (quality review QR-007).
  const [ux, uy] = length > 0 ? [(x1 - x0) / length, (y1 - y0) / length] : [1, 0];
  const climb = (labelWidth: number) =>
    across ? (Math.abs(ux) > 1e-9 ? (Math.abs(uy / ux) * labelWidth) / 2 : 0) : Math.abs(uy) > 1e-9 ? (Math.abs(ux / uy) * fontSize) / 2 : 0;

  const custom = labels === undefined ? [] : [...labels];
  const labelAt = (tick: number) => {
    for (const [value, text] of custom) if (isTickValue(value, tick, spacing)) return text;
    return tickLabel(tick, spacing);
  };

  const nodes: SceneNode[] = [line(x0, y0, x1, y1, defaultStyle.lineWidths.axis, color)];
  const texts: SceneNode[] = [];
  for (const value of ticks) {
    const t = at(value);
    const x = x0 + t * (x1 - x0);
    const y = y0 + t * (y1 - y0);
    nodes.push(line(x - nx * half, y - ny * half, x + nx * half, y + ny * half, defaultStyle.lineWidths.tick, color));
    if (!showTickLabels) continue;
    const text = labelAt(value);
    const clear = reach + LABEL_GAP + climb(textWidth(text, fontSize));
    const [lx, ly, anchor] =
      side === "below"
        ? [x, y + clear + fontSize * 0.8, "middle"]
        : side === "above"
          ? [x, y - clear - fontSize * 0.2, "middle"]
          : side === "left"
            ? [x - clear, y + fontSize * TICK_LABEL_DROP, "end"]
            : [x + clear, y + fontSize * TICK_LABEL_DROP, "start"];
    texts.push({
      kind: "text",
      attrs: [
        ["x", fmt(lx)],
        ["y", fmt(ly)],
        ["fill", defaultStyle.colors.text],
        ["font-family", DEFAULT_FONT_STACK],
        ["font-size", fmt(fontSize)],
        ["text-anchor", anchor],
      ],
      text,
    });
  }
  // Labels after every tick, so no tick is drawn over a label.
  for (const node of texts) nodes.push(node);
  return nodes;
}
