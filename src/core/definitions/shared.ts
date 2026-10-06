import { GRAPH_TYPES, type GraphType, type PropertySpec } from "./types";

/** A presentation property defined once, with the graph types whose descriptions may carry it. */
export type SharedPropertySpec = PropertySpec & { readonly appliesTo: readonly GraphType[] };

/**
 * The top-level presentation options (GSV-REQ-040). Labels and titles are plain text
 * (GSV-REQ-043); a color is a color name or hex code (GSV-REQ-042). A type ticket adds these to
 * its graph type by listing it in `appliesTo`, never by redefining them.
 */
// @spec GSV-REQ-040, GSV-REQ-043
export const sharedProperties = {
  title: {
    term: "title",
    kind: "string",
    required: false,
    presentation: "title",
    description: "A title shown above the graph, as plain text.",
    appliesTo: GRAPH_TYPES,
  },
  lineColor: {
    term: "lineColor",
    kind: "color",
    required: false,
    presentation: "lineColor",
    description: "The color of the graph's main line or the figure's outline: a color name or a hex code such as #0072b2.",
    appliesTo: ["number-line", "circle", "square", "triangle", "cube", "cylinder"],
  },
  lineLabel: {
    term: "lineLabel",
    kind: "string",
    required: false,
    presentation: "lineLabel",
    description: "A label for the number line itself, as plain text.",
    appliesTo: ["number-line"],
  },
  xAxisLabel: {
    term: "xAxisLabel",
    kind: "string",
    required: false,
    presentation: "axisLabel",
    description: "A label for the x-axis, as plain text.",
    appliesTo: ["xy-graph", "xyz-graph"],
  },
  yAxisLabel: {
    term: "yAxisLabel",
    kind: "string",
    required: false,
    presentation: "axisLabel",
    description: "A label for the y-axis, as plain text.",
    appliesTo: ["xy-graph", "xyz-graph"],
  },
  zAxisLabel: {
    term: "zAxisLabel",
    kind: "string",
    required: false,
    presentation: "axisLabel",
    description: "A label for the z-axis, as plain text.",
    appliesTo: ["xyz-graph"],
  },
  categoryAxisLabel: {
    term: "categoryAxisLabel",
    kind: "string",
    required: false,
    presentation: "axisLabel",
    description: "A label for the axis that lists the categories, as plain text.",
    appliesTo: ["line-graph", "bar-graph"],
  },
  valueAxisLabel: {
    term: "valueAxisLabel",
    kind: "string",
    required: false,
    presentation: "axisLabel",
    description: "A label for the axis that shows the values, as plain text.",
    appliesTo: ["line-graph", "bar-graph"],
  },
} as const satisfies Readonly<Record<string, SharedPropertySpec>>;

export type SharedTerm = keyof typeof sharedProperties;

/**
 * Presentation options of one element: a point, a segment or a series. A type ticket nests these
 * in its item specs, so the option applies to that element and nothing else (GSV-REQ-045).
 */
// @spec GSV-REQ-040, GSV-REQ-043, GSV-REQ-045
export const itemProperties = {
  label: {
    term: "label",
    kind: "string",
    required: false,
    presentation: "itemLabel",
    description: "A label for this one element, as plain text.",
  },
  color: {
    term: "color",
    kind: "color",
    required: false,
    presentation: "itemColor",
    description: "The color of this one element: a color name or a hex code such as #0072b2.",
  },
} as const satisfies Readonly<Record<string, PropertySpec>>;
