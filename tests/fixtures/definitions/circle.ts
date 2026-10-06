import { defineProperties, type DescriptionBase, type GraphTypeDefinition } from "../../../src/core/definitions/types";

interface Circle extends DescriptionBase {
  type: "circle";
  radius: number;
}

/** A test-only circle: a radius, two options and a unit. GSS TICKET-002 defines the real one. */
export const circle: GraphTypeDefinition<Circle> = {
  type: "circle",
  title: "Circle",
  description: "A circle drawn from its radius.",
  properties: defineProperties({
    radius: { term: "radius", kind: "number", required: true, min: 0, exclusiveMin: true, description: "The radius." },
    showCenter: { term: "showCenter", kind: "boolean", required: false, description: "Whether the center is marked." },
    unit: { term: "unit", kind: "string", required: false, description: "The unit of length, such as cm." },
    shadedFraction: {
      term: "shadedFraction",
      kind: "number",
      required: false,
      min: 0,
      max: 1,
      exclusiveMax: true,
      description: "The share of the circle that is shaded, less than the whole.",
    },
  }),
  derivations: [],
  checks: [],
  describe: (normalized) => `A circle with radius ${normalized.radius}.`,
};
