// The framework-neutral drawing every layout produces and every printer prints (AD-002). A Scene
// is plain data: `SceneSvg` (src/react/SceneSvg.tsx) and the source exporter's JSX printer
// (CPSE TICKET-005) both read the two mapping tables below, so their markup cannot drift
// (CPSE-NFR-001).

declare const roundedBrand: unique symbol;

/**
 * A number that has passed `fmt()` (src/layout/kit/format.ts): rounded to 2 decimal places with
 * no negative zero (AD-007, prd/TC-002). Only `fmt()` produces one, so a raw number written into
 * Scene attrs is a type error.
 */
export type Rounded = number & { readonly [roundedBrand]: true };

/** Every Scene is this many units wide; height follows the graph's aspect ratio (AD-007). */
export const SCENE_WIDTH = 400;

export type SceneNodeKind =
  | "line"
  | "polyline"
  | "polygon"
  | "path"
  | "circle"
  | "ellipse"
  | "rect"
  | "text"
  | "group"
  | "svg";

/** The SVG element each node kind prints as. */
export const ELEMENT_FOR_KIND: Readonly<Record<SceneNodeKind, string>> = Object.freeze({
  line: "line",
  polyline: "polyline",
  polygon: "polygon",
  path: "path",
  circle: "circle",
  ellipse: "ellipse",
  rect: "rect",
  text: "text",
  group: "g",
  svg: "svg",
});

/**
 * The attributes a Scene may carry, by SVG name, with the React prop each prints as. The set is
 * closed: geometry and presentation attributes only (AD-011). Nothing that names or references
 * an element (`id`, `href`, `clip-path`, `marker-*`, `url(#…)` holders; AD-008), no `class` or
 * `style`, and no event handlers.
 */
export const REACT_PROP = Object.freeze({
  // geometry
  x: "x",
  y: "y",
  x1: "x1",
  y1: "y1",
  x2: "x2",
  y2: "y2",
  cx: "cx",
  cy: "cy",
  r: "r",
  rx: "rx",
  ry: "ry",
  width: "width",
  height: "height",
  points: "points",
  d: "d",
  transform: "transform",
  viewBox: "viewBox",
  preserveAspectRatio: "preserveAspectRatio",
  // presentation
  fill: "fill",
  "fill-opacity": "fillOpacity",
  "fill-rule": "fillRule",
  stroke: "stroke",
  "stroke-width": "strokeWidth",
  "stroke-dasharray": "strokeDasharray",
  "stroke-linecap": "strokeLinecap",
  "stroke-linejoin": "strokeLinejoin",
  "stroke-opacity": "strokeOpacity",
  opacity: "opacity",
  // text
  "font-family": "fontFamily",
  "font-size": "fontSize",
  "font-weight": "fontWeight",
  "font-style": "fontStyle",
  "text-anchor": "textAnchor",
  "dominant-baseline": "dominantBaseline",
  // decorative parts hidden from assistive technology
  "aria-hidden": "aria-hidden",
} as const);

export type SvgAttr = keyof typeof REACT_PROP;

/** A string (a color, a `points` list built with `fmtPoints`, a keyword) or a `fmt()`-ed number. */
export type AttrValue = string | Rounded;

/** One SVG primitive. `attrs` print in the order given. */
// @spec CPSE-REQ-011
export interface SceneNode {
  readonly kind: SceneNodeKind;
  readonly attrs: ReadonlyArray<readonly [SvgAttr, AttrValue]>;
  /** Child nodes of a `group` or `svg`. */
  readonly children?: readonly SceneNode[];
  /** The text content of a `text` node, printed as a text child, never as markup. */
  readonly text?: string;
}

/** A whole drawing in the 400-unit space, with its generated text alternative. */
// @spec CPSE-REQ-011, CPSE-REQ-012, CPSE-REQ-013
export interface Scene {
  readonly width: typeof SCENE_WIDTH;
  readonly height: Rounded;
  readonly textAlternative: string;
  readonly nodes: readonly SceneNode[];
}
