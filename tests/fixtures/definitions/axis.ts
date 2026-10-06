import type { PropertySpec } from "../../../src/core/definitions/types";

/** An axis property group, as NLC TICKET-001 will define it for real. */
export function axis(term: string, name: string): PropertySpec {
  return {
    term,
    kind: "object",
    required: true,
    description: `The ${name} axis: its range and tick spacing.`,
    properties: {
      min: { term: "min", kind: "number", required: true, description: "The smallest value on the axis." },
      max: { term: "max", kind: "number", required: true, description: "The largest value on the axis." },
      tickSpacing: {
        term: "tickSpacing",
        kind: "number",
        required: false,
        exclusiveMin: true,
        min: 0,
        description: "The distance between neighbouring ticks.",
      },
      showTickLabels: { term: "showTickLabels", kind: "boolean", required: false, description: "Whether tick labels are shown." },
    },
    ordered: [["min", "max"]],
  };
}
