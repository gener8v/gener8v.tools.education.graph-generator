import { cleanText } from "../core/format";

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

/**
 * A string (a color, a keyword, or a `points`, `d` or `transform` value built with `fmtPoints`,
 * `pathData` or `translate`) or a `fmt()`-ed number. Strings are checked by `checkScene`
 * (src/layout/kit/check.ts), which every layout test runs: no unrounded numbers, no `url(…)`.
 */
export type AttrValue = string | Rounded;

export type Attrs = ReadonlyArray<readonly [SvgAttr, AttrValue]>;

/** A primitive with no content. */
export interface ShapeNode {
  readonly kind: Exclude<SceneNodeKind, "text" | "group" | "svg">;
  readonly attrs: Attrs;
}

/** A `text` node: its content prints as a text child, never as markup. */
export interface TextNode {
  readonly kind: "text";
  readonly attrs: Attrs;
  readonly text: string;
}

/** A `group` or nested `svg` viewport (which clips its children; AD-008). */
export interface ContainerNode {
  readonly kind: "group" | "svg";
  readonly attrs: Attrs;
  readonly children: readonly SceneNode[];
}

/** One SVG primitive. `attrs` print in the order given; each name appears at most once. */
// @spec CPSE-REQ-011
export type SceneNode = ShapeNode | TextNode | ContainerNode;

/** A whole drawing in the 400-unit space, with its generated text alternative. */
// @spec CPSE-REQ-011, CPSE-REQ-012, CPSE-REQ-013
export interface Scene {
  readonly width: typeof SCENE_WIDTH;
  readonly height: Rounded;
  readonly textAlternative: string;
  readonly nodes: readonly SceneNode[];
}

// Any letter, number, punctuation or symbol (marks alone do not count), excluding blank-looking
// symbols (braille blank, Hangul fillers) that would leave the graph effectively unnamed.
const VISIBLE = /[^\s\p{Cc}\p{Cf}\p{M}\p{Z}\u2800\u115f\u1160\u3164\uffa0]/u;

/**
 * The accessible name a graph carries: the caller's text alternative, cleaned like any caller text
 * (control and hidden characters removed), when anything visible is left; otherwise the Scene's
 * generated one (prd/CC-002). Never throws, whatever the caller passed.
 */
// @spec CPSE-REQ-012
export function textAlternativeFor(scene: Scene, supplied: unknown): string {
  if (typeof supplied !== "string") return scene.textAlternative;
  const cleaned = cleanText(supplied);
  return VISIBLE.test(cleaned) ? cleaned : scene.textAlternative;
}

/**
 * The root `<svg>` attributes, in print order, for a Scene and its accessible name. The printed
 * markup is: `<svg {rootAttrs}>`, then `<title>{name}</title>` as the first child, then each node in
 * Scene order. `SceneSvg` and the source exporter's printer (CPSE TICKET-005) both follow this.
 */
// @spec CPSE-REQ-012, CPSE-REQ-013
export function rootAttrs(scene: Scene, name: string): ReadonlyArray<readonly [string, string]> {
  return [
    ["role", "img"],
    ["aria-label", name],
    ["viewBox", `0 0 ${scene.width} ${scene.height}`],
    ["width", "100%"],
  ];
}
