import { defineProperties, type DescriptionBase, type GraphTypeDefinition } from "../../../src/core/definitions/types";

export interface Circle extends DescriptionBase {
  type: "circle";
  radius: number;
  diameter: number;
  circumference: number;
}

// Curriculum-sized limits: every derivation member needs a positive minimum and a finite maximum.
const measurement = (term: string, min: number, max: number, description: string) =>
  ({ term, kind: "number", required: false, min, max, description }) as const;

/**
 * A test-only circle given by any one of radius, diameter or circumference, with two options, a
 * unit and a shaded share. GSS TICKET-002 defines the real one.
 */
export const circle: GraphTypeDefinition<Circle> = {
  type: "circle",
  title: "Circle",
  description: "A circle drawn from its radius.",
  properties: defineProperties({
    radius: measurement("radius", 0.000001, 1_000_000, "The distance from the center to the edge."),
    diameter: measurement("diameter", 0.000002, 2_000_000, "The distance across the circle through its center."),
    circumference: measurement("circumference", 0.0000063, 6_283_185, "The distance around the circle."),
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
  derivations: [
    {
      members: ["radius", "diameter", "circumference"],
      description: "diameter = 2 × radius; circumference = 2π × radius",
      required: true,
      derive: (term, value) => {
        const radius = term === "radius" ? value : term === "diameter" ? value / 2 : value / (2 * Math.PI);
        return { radius, diameter: 2 * radius, circumference: 2 * Math.PI * radius };
      },
    },
  ],
  checks: [],
  describe: (normalized) => `A circle with radius ${normalized.radius}.`,
};
