import { sharedProperties } from "../../../src/core/definitions/shared";
import { defineProperties, type GraphTypeDefinition } from "../../../src/core/definitions/types";
import { axis } from "./axis";

const point = {
  kind: "object",
  description: "A point given by its x and y coordinates.",
  properties: {
    x: { term: "x", kind: "number", required: true, description: "The x coordinate." },
    y: { term: "y", kind: "number", required: true, description: "The y coordinate." },
  },
} as const;

/** A test-only x,y graph. NLC TICKET-003 defines the real one. */
export const xyGraph: GraphTypeDefinition = {
  type: "xy-graph",
  title: "x,y graph",
  description: "A coordinate plane with points and segments.",
  properties: defineProperties({
    xAxis: axis("xAxis", "x"),
    yAxis: axis("yAxis", "y"),
    showGrid: { term: "showGrid", kind: "boolean", required: false, description: "Whether grid lines are drawn." },
    points: {
      term: "points",
      kind: "array",
      maxItems: 1000,
      required: false,
      description: "Marked points.",
      items: {
        kind: "object",
        description: "One marked point.",
        properties: { ...point.properties, label: sharedProperties.label, color: sharedProperties.color },
      },
    },
    segments: {
      term: "segments",
      kind: "array",
      maxItems: 1000,
      required: false,
      description: "Line segments between two points.",
      items: {
        kind: "object",
        description: "One line segment.",
        properties: {
          from: { term: "from", required: true, ...point, description: "Where the segment starts." },
          to: { term: "to", required: true, ...point, description: "Where the segment ends." },
          label: sharedProperties.label,
          color: sharedProperties.color,
        },
      },
    },
  }),
  derivations: [],
  checks: [],
  describe: () => "An x,y graph.",
};
