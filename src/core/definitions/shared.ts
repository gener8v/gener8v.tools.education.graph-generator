import { GRAPH_TYPES, defineProperties, type GraphType, type PropertySpec } from "./types";

/**
 * A presentation option defined once (GSV-REQ-040), with where it applies:
 * - `appliesTo`: the graph types whose description carries it at the top level. These are merged
 *   into the type's properties by `propertiesOf`; a definition never lists them itself.
 * - `elementsOf`: the graph types whose elements (points, segments, series, categories) carry it.
 *   The type's definition nests this same spec object in its element spec, so the option applies
 *   to that element only (GSV-REQ-045).
 */
export type SharedPropertySpec = PropertySpec & {
  readonly appliesTo: readonly GraphType[];
  readonly elementsOf: readonly GraphType[];
};

const FIGURES = ["circle", "square", "triangle", "cube", "cylinder"] as const;

/**
 * The shared presentation options. Labels and titles are plain text (GSV-REQ-043); colors are a
 * color name or a hex code (GSV-REQ-042). Where each applies follows the per-type option lists
 * of the NLC, DGP and GSS specifications (DEL-002); the number line's `title` and `lineColor`
 * extend NLC's list by Product Owner decision (code review CR-003).
 */
// @spec GSV-REQ-040, GSV-REQ-043, GSV-REQ-045
export const sharedProperties = defineProperties({
  title: {
    term: "title",
    kind: "string",
    required: false,
    presentation: "title",
    description: "A title shown above the graph, as plain text.",
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
    required: false,
    presentation: "lineLabel",
    description: "A label for a line: the number line itself, or one series of a line graph, as plain text.",
    appliesTo: ["number-line"],
    elementsOf: ["line-graph"],
  },
  xAxisLabel: {
    term: "xAxisLabel",
    kind: "string",
    required: false,
    presentation: "axisLabel",
    description: "A label for the x-axis, as plain text.",
    appliesTo: ["xy-graph", "xyz-graph"],
    elementsOf: [],
  },
  yAxisLabel: {
    term: "yAxisLabel",
    kind: "string",
    required: false,
    presentation: "axisLabel",
    description: "A label for the y-axis, as plain text.",
    appliesTo: ["xy-graph", "xyz-graph"],
    elementsOf: [],
  },
  zAxisLabel: {
    term: "zAxisLabel",
    kind: "string",
    required: false,
    presentation: "axisLabel",
    description: "A label for the z-axis, as plain text.",
    appliesTo: ["xyz-graph"],
    elementsOf: [],
  },
  categoryAxisLabel: {
    term: "categoryAxisLabel",
    kind: "string",
    required: false,
    presentation: "axisLabel",
    description: "A label for the axis that lists the categories, as plain text.",
    appliesTo: ["line-graph", "bar-graph"],
    elementsOf: [],
  },
  valueAxisLabel: {
    term: "valueAxisLabel",
    kind: "string",
    required: false,
    presentation: "axisLabel",
    description: "A label for the axis that shows the values, as plain text.",
    appliesTo: ["line-graph", "bar-graph"],
    elementsOf: [],
  },
  label: {
    term: "label",
    kind: "string",
    required: false,
    presentation: "elementLabel",
    description: "A label for this one point or segment, as plain text.",
    appliesTo: [],
    elementsOf: ["number-line", "xy-graph", "xyz-graph"],
  },
  color: {
    term: "color",
    kind: "color",
    required: false,
    presentation: "elementColor",
    description: "The color of this one point, segment or bar: a color name or a hex code such as #0072b2.",
    appliesTo: [],
    elementsOf: ["number-line", "xy-graph", "xyz-graph", "bar-graph"],
  },
} as const satisfies Readonly<Record<string, SharedPropertySpec>>);

export type SharedTerm = keyof typeof sharedProperties;
