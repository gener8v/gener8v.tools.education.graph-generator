import { defaultStyle } from "../../core/style";
import type { SceneNode } from "../scene";
import { fmt } from "./format";
import { linearScale } from "./scale";
import { DEFAULT_FONT_STACK } from "./text";
import { tickLabel } from "./ticks";
import { TICK_LABEL_DROP } from "./value-scale";

/** Which side of an axis its tick labels are written on, on the page. */
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
  /** Text to write at a tick in place of its value (NLC-REQ-019), already cleaned by the caller. */
  readonly labels?: ReadonlyMap<number, string>;
  readonly showTickLabels: boolean;
  readonly side: AxisSide;
}

/** Space between a tick's end and its label, in drawing units. */
const LABEL_GAP = 4;

const line = (x1: number, y1: number, x2: number, y2: number, width: number): SceneNode => ({
  kind: "line",
  attrs: [
    ["x1", fmt(x1)],
    ["y1", fmt(y1)],
    ["x2", fmt(x2)],
    ["y2", fmt(y2)],
    ["stroke", defaultStyle.colors.line],
    ["stroke-width", fmt(width)],
  ],
});

/**
 * An axis (NLC-REQ-004, NLC-REQ-006, NLC-REQ-007): its line from `from` to `to`, a tick across the
 * line at each value of `ticks`, at its proportional place along the line (`linearScale` of the
 * domain), and, when `showTickLabels`, each tick's label on `side`: the caller's text for that
 * value, else the value with the decimals the spacing needs (`tickLabel`). Ticks are
 * perpendicular to the line and centered on it, so the same call draws a number line, either axis
 * of an x,y graph through its origin, or a diagonal axis of an x,y,z graph. Hidden labels leave the
 * ticks. Every number passes through `fmt()` (AD-007); tick labels are short, so no text is
 * measured (prd/TC-001).
 */
// @spec NLC-REQ-004, NLC-REQ-006, NLC-REQ-007
export function drawAxis(options: AxisOptions): SceneNode[] {
  const { from, to, domain, ticks, spacing, labels, showTickLabels, side } = options;
  const [x0, y0] = from;
  const [x1, y1] = to;
  const length = Math.hypot(x1 - x0, y1 - y0);
  // The unit normal: ticks run along it, half on each side of the line.
  const [nx, ny] = length > 0 ? [-(y1 - y0) / length, (x1 - x0) / length] : [0, 1];
  const half = defaultStyle.tickLength / 2;
  const at = linearScale([domain[0], domain[1]], [0, 1]);
  const fontSize = defaultStyle.fontSizes.tickLabel;
  // How far a tick reaches toward the label side, so the label clears it on a diagonal axis too.
  const reach = half * (side === "below" || side === "above" ? Math.abs(ny) : Math.abs(nx));

  const nodes: SceneNode[] = [line(x0, y0, x1, y1, defaultStyle.lineWidths.axis)];
  const texts: SceneNode[] = [];
  for (const value of ticks) {
    const t = at(value);
    const x = x0 + t * (x1 - x0);
    const y = y0 + t * (y1 - y0);
    nodes.push(line(x - nx * half, y - ny * half, x + nx * half, y + ny * half, defaultStyle.lineWidths.tick));
    if (!showTickLabels) continue;
    const [lx, ly, anchor] =
      side === "below"
        ? [x, y + reach + LABEL_GAP + fontSize * 0.8, "middle"]
        : side === "above"
          ? [x, y - reach - LABEL_GAP - fontSize * 0.2, "middle"]
          : side === "left"
            ? [x - reach - LABEL_GAP, y + fontSize * TICK_LABEL_DROP, "end"]
            : [x + reach + LABEL_GAP, y + fontSize * TICK_LABEL_DROP, "start"];
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
      text: labels?.get(value) ?? tickLabel(value, spacing),
    });
  }
  // Labels after every tick, so no tick is drawn over a label.
  for (const node of texts) nodes.push(node);
  return nodes;
}
