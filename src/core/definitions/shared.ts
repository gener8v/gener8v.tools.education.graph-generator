import { GRAPH_TYPES, defineProperties, type GraphType, type PropertySpec } from "./types";

/**
 * A scoped term: defined once, rather than in one type's definition, with where it applies. The
 * shared presentation options (GSV-REQ-040) are scoped terms, as are the data-graph terms such as
 * `valueScale` (`categories.ts`, DGP TICKET-001):
 * - `appliesTo`: the graph types whose description carries it at the top level. These are merged
 *   into the type's properties by `propertiesOf`; a definition never lists them itself.
 * - `elementsOf`: the graph types whose elements (points, segments, series, categories) carry it.
 *   The type's definition nests this same spec object in its element spec, so the option applies
 *   to that element only (GSV-REQ-045).
 */
export type ScopedPropertySpec = PropertySpec & {
  readonly appliesTo: readonly GraphType[];
  readonly elementsOf: readonly GraphType[];
};

/** The earlier name of `ScopedPropertySpec`, from when only presentation options were scoped. */
export type SharedPropertySpec = ScopedPropertySpec;

const FIGURES = ["circle", "square", "triangle", "cube", "cylinder"] as const;

/**
 * The most characters (code points) a title, label or other caller-written text may have
 * (GSV-REQ-052; GSV OQ-009, Product Owner 2026-10-21). A drawn title shows at most 3 lines and a
 * label 2 to 4, about 200 characters at most, so longer text was already cut on the figure while it
 * still reached the text alternative, the tool summary and the render cost whole. Published as
 * `maxLength` (GSV-REQ-054); a longer text is reported as `too_large`, never cut.
 */
// @spec GSV-REQ-052
export const CALLER_TEXT_LIMIT = 200;

/**
 * The most characters (code points) a unit written after a measurement may have, such as "cm" or
 * "square centimetres" (GSV-REQ-053; GSV OQ-009). A unit is repeated after every stated value, in
 * the drawing and the text alternative, so it is held far below a label's limit. Published as
 * `maxLength`; a longer unit is reported as `too_large`.
 */
// @spec GSV-REQ-053
export const UNIT_TEXT_LIMIT = 20;

/**
 * The one definition of the `points` term, for every type that marks points: a term has one
 * definition in the vocabulary (GSV-REQ-015), so it names no type and no limit. Each type's
 * `maxItems` and its own description state its limit (graph-library NLC TICKET-003).
 */
export const POINTS_DESCRIPTION =
  "The points marked on the graph, each at its position (its value on a number line, its x and y on a coordinate graph) and optionally with a label and a color. Points may share a position: each is drawn, and their labels are placed apart where the drawing has room.";

/**
 * The shared presentation options. Labels and titles are plain text (GSV-REQ-043); colors are a
 * color name or a hex code (GSV-REQ-042). Where each applies follows the per-type option lists
 * of the NLC, DGP and GSS specifications (DEL-002); the number line's `title` and `lineColor`
 * extend NLC's list by Product Owner decision (code review CR-003).
 */
// @spec GSV-REQ-040, GSV-REQ-043, GSV-REQ-045, GSV-REQ-052, GSV-REQ-054, DGP-REQ-002
export const sharedProperties = defineProperties({
  title: {
    term: "title",
    kind: "string",
    maxLength: CALLER_TEXT_LIMIT,
    required: false,
    presentation: "title",
    description:
      `A title shown above the graph, as plain text, at most ${CALLER_TEXT_LIMIT} characters. In the drawing, a title longer than three lines is cut short with “…”; the text alternative states it whole.`,
    appliesTo: GRAPH_TYPES,
    elementsOf: [],
  },
  lineColor: {
    term: "lineColor",
    kind: "color",
    required: false,
    presentation: "lineColor",
    description:
      "The color of a line: the number line itself, a figure's outline, or one series of a line graph. A color name or a hex code such as #0072b2.",
    appliesTo: ["number-line", ...FIGURES],
    elementsOf: ["line-graph"],
  },
  lineLabel: {
    term: "lineLabel",
    kind: "string",
    maxLength: CALLER_TEXT_LIMIT,
    required: false,
    presentation: "lineLabel",
    description:
      `A label for a line: the number line itself, or one series of a line graph, as plain text, at most ${CALLER_TEXT_LIMIT} characters. In the drawing, a label longer than two lines is cut short with “…”: below a number line, or in a line graph's legend. The text alternative states it whole.`,
    appliesTo: ["number-line"],
    elementsOf: ["line-graph"],
  },
  xAxisLabel: {
    term: "xAxisLabel",
    kind: "string",
    maxLength: CALLER_TEXT_LIMIT,
    required: false,
    presentation: "axisLabel",
    description:
      `A label for the x-axis, as plain text, at most ${CALLER_TEXT_LIMIT} characters.`,
    appliesTo: ["xy-graph", "xyz-graph"],
    elementsOf: [],
  },
  yAxisLabel: {
    term: "yAxisLabel",
    kind: "string",
    maxLength: CALLER_TEXT_LIMIT,
    required: false,
    presentation: "axisLabel",
    description:
      `A label for the y-axis, as plain text, at most ${CALLER_TEXT_LIMIT} characters.`,
    appliesTo: ["xy-graph", "xyz-graph"],
    elementsOf: [],
  },
  zAxisLabel: {
    term: "zAxisLabel",
    kind: "string",
    maxLength: CALLER_TEXT_LIMIT,
    required: false,
    presentation: "axisLabel",
    description:
      `A label for the z-axis, as plain text, at most ${CALLER_TEXT_LIMIT} characters.`,
    appliesTo: ["xyz-graph"],
    elementsOf: [],
  },
  categoryAxisLabel: {
    term: "categoryAxisLabel",
    kind: "string",
    maxLength: CALLER_TEXT_LIMIT,
    required: false,
    presentation: "axisLabel",
    description:
      `A label for the axis that lists the categories, as plain text, at most ${CALLER_TEXT_LIMIT} characters. In the drawing, a label longer than two lines is cut short with “…”; the text alternative states it whole.`,
    appliesTo: ["line-graph", "bar-graph"],
    elementsOf: [],
  },
  valueAxisLabel: {
    term: "valueAxisLabel",
    kind: "string",
    maxLength: CALLER_TEXT_LIMIT,
    required: false,
    presentation: "axisLabel",
    description:
      `A label for the axis that shows the values, as plain text, at most ${CALLER_TEXT_LIMIT} characters. In the drawing, a label longer than two lines is cut short with “…”; the text alternative states it whole.`,
    appliesTo: ["line-graph", "bar-graph"],
    elementsOf: [],
  },
  label: {
    term: "label",
    kind: "string",
    maxLength: CALLER_TEXT_LIMIT,
    required: false,
    presentation: "elementLabel",
    description:
      `A label for this one point, segment or measured object, as plain text, at most ${CALLER_TEXT_LIMIT} characters. In the drawing, a long label is cut short with “…”; the text alternative states it whole.`,
    appliesTo: [],
    elementsOf: ["number-line", "ruler", "xy-graph", "xyz-graph"],
  },
  color: {
    term: "color",
    kind: "color",
    required: false,
    presentation: "elementColor",
    description: "The color of this one point, segment, bar or measured object: a color name or a hex code such as #0072b2.",
    appliesTo: [],
    elementsOf: ["number-line", "ruler", "xy-graph", "xyz-graph", "bar-graph"],
  },
} as const satisfies Readonly<Record<string, ScopedPropertySpec>>);

export type SharedTerm = keyof typeof sharedProperties;
