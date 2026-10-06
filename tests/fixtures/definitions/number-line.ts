import { sharedProperties } from "../../../src/core/definitions/shared";
import { defineProperties, type GraphTypeDefinition } from "../../../src/core/definitions/types";
import { axis } from "./axis";

/** A test-only number line. NLC TICKET-002 defines the real one. */
export const numberLine: GraphTypeDefinition = {
  type: "number-line",
  title: "Number line",
  description: "A number line with marked points.",
  properties: defineProperties({
    axis: axis("axis", "number line's"),
    points: {
      term: "points",
      kind: "array",
      required: false,
      description: "Marked points.",
      items: {
        kind: "object",
        description: "One marked point.",
        properties: {
          value: { term: "value", kind: "number", required: true, description: "Where the point is on the line." },
          label: sharedProperties.label,
          color: sharedProperties.color,
        },
      },
    },
    arrowheads: {
      term: "arrowheads",
      kind: "enum",
      values: ["none", "left", "right", "both"],
      required: false,
      description: "Which ends of the line have arrowheads.",
    },
    tickCount: { term: "tickCount", kind: "integer", required: false, min: 1, max: 100, description: "How many ticks to draw." },
  }),
  derivations: [],
  checks: [],
  describe: () => "A number line.",
};
