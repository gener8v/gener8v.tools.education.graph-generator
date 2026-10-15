/**
 * The published color names (GSV-REQ-042, GSV OQ-006), each a fixed hex value with at least 3:1
 * contrast against the default background.
 */
// @spec GSV-REQ-042, GSV-NFR-004
export const namedColors = Object.freeze({
  black: "#000000",
  gray: "#595959",
  red: "#c62828",
  orange: "#b36b00",
  green: "#2e7d32",
  blue: "#0072b2",
  purple: "#6a1b9a",
  brown: "#795548",
});

export type ColorName = keyof typeof namedColors;

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const ASCII_WORD = /^[A-Za-z]+$/;

/**
 * A color name (any case) or a `#rgb` / `#rrggbb` code, as lowercase `#rrggbb`; `undefined` for
 * anything else. Codes with transparency are not accepted, so contrast stays knowable.
 */
// @spec GSV-REQ-042
export function resolveColor(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  // Lowercase ASCII letters only: full Unicode case mapping turns the Kelvin sign into "k".
  const name = ASCII_WORD.test(value) ? value.toLowerCase() : undefined;
  if (name !== undefined && Object.hasOwn(namedColors, name)) return namedColors[name as ColorName];
  const hex = HEX.exec(value)?.[1]?.toLowerCase();
  if (hex === undefined) return undefined;
  return `#${hex.length === 3 ? [...hex].map((digit) => digit + digit).join("") : hex}`;
}

/**
 * The one default style (GSV-REQ-044), as values for SVG presentation attributes (`stroke`,
 * `fill`, `stroke-width`, `font-size`, `font-family`; AD-011). Sizes are in the 400-unit drawing
 * space (AD-007). Every color has at least 3:1 contrast against `background` (GSV-NFR-004).
 */
// @spec GSV-REQ-044, GSV-NFR-004
export const defaultStyle = Object.freeze({
  background: "#ffffff",
  colors: Object.freeze({
    /** Titles, labels and tick labels. */
    text: "#1a1a1a",
    /** Figure outlines, axes and ticks. */
    line: "#222222",
    grid: "#8a8a8a",
    /** Marked points and other highlighted elements. */
    accent: "#0072b2",
  }),
  lineWidths: Object.freeze({
    figure: 2,
    axis: 1.5,
    tick: 1.5,
    grid: 1,
    series: 2.5,
  }),
  /** The system sans-serif stack: no bundled font (AD-010, prd/CC-001). */
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontSizes: Object.freeze({
    title: 18,
    label: 14,
    tickLabel: 12,
  }),
  markerSize: 6,
  tickLength: 6,
});

export type MarkerShape = "circle" | "square" | "triangle" | "diamond" | "cross" | "star";

export interface SeriesStyle {
  color: string;
  marker: MarkerShape;
  /** A `stroke-dasharray` value; `"none"` is a solid line. */
  dash: string;
}

/**
 * Default styles for series in order. Colors are Okabe–Ito hues (yellow and sky blue dropped),
 * each scaled in brightness so that every one has at least 3:1 contrast on white (GSV-NFR-004)
 * and any two differ by at least 15% in relative luminance, so they stay apart in greyscale
 * (DGP-NFR-004; code review CR-005). Each series also differs in marker shape and dash pattern,
 * so color is never the only cue (prd/CC-002).
 */
// @spec GSV-REQ-044, GSV-NFR-004, DGP-NFR-004
export const seriesStyles: readonly SeriesStyle[] = Object.freeze(
  (
    [
      { color: "#006fad", marker: "circle", dash: "none" },
      { color: "#bd5300", marker: "square", dash: "8 4" },
      { color: "#a77200", marker: "triangle", dash: "2 4" },
      { color: "#009a70", marker: "diamond", dash: "8 4 2 4" },
      { color: "#cb78a6", marker: "cross", dash: "12 4" },
      { color: "#000000", marker: "star", dash: "4 4" },
    ] as const
  ).map((style) => Object.freeze({ ...style })),
);
