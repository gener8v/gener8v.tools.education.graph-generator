import { type GraphType, type GraphTypeDefinition, defineProperties } from "../../../src/core/definitions/types";
import { createIssue } from "../../../src/core/issues";

/**
 * A test-only ruler-like definition for the conditional-term mechanism (rulers GSV TICKET-001): a
 * two-value `unit` and a `smallestDivision` that applies only when `unit` is `inches`
 * (GSV-REQ-051). Not in `fixtureRegistry`, so no other fixture test changes with it; it has its
 * own registry. The real ruler definition comes with rulers NLC TICKET-002.
 */
export const conditionalRuler: GraphTypeDefinition = {
  type: "ruler",
  title: "Conditional ruler (test only)",
  description: "A ruler-like fixture for terms that apply only while a sibling has given values.",
  properties: defineProperties({
    unit: {
      term: "unit",
      kind: "enum",
      required: true,
      values: ["centimeters", "inches"],
      valueDescriptions: { centimeters: "Marked in centimetres and millimetres.", inches: "Marked in inches and fractions of an inch." },
      description: "The unit a ruler is marked in.",
    },
    smallestDivision: {
      term: "smallestDivision",
      kind: "enum",
      required: false,
      values: ["half", "quarter", "eighth", "sixteenth"],
      description: "An inch ruler's smallest division; applies only when unit is inches.",
      appliesWhen: { term: "unit", values: ["inches"] },
    },
    length: { term: "length", kind: "integer", required: true, min: 1, max: 30, description: "How many units long a ruler is." },
    // The same condition inside an object, where a left-out term's parent is still present.
    spare: {
      term: "spare",
      kind: "object",
      required: false,
      description: "A second set of markings, for nested conditions.",
      properties: defineProperties({
        unit: {
          term: "unit",
          kind: "enum",
          required: true,
          values: ["centimeters", "inches"],
          valueDescriptions: { centimeters: "Marked in centimetres and millimetres.", inches: "Marked in inches and fractions of an inch." },
          description: "The unit a ruler is marked in.",
        },
        smallestDivision: {
          term: "smallestDivision",
          kind: "enum",
          required: false,
          values: ["half", "quarter", "eighth", "sixteenth"],
          description: "An inch ruler's smallest division; applies only when unit is inches.",
          appliesWhen: { term: "unit", values: ["inches"] },
        },
      }),
    },
  }),
  derivations: [],
  checks: [
    {
      name: "a sixteenth needs at least 2 units",
      inputs: ["smallestDivision", "length"],
      check: (description) =>
        description["smallestDivision"] === "sixteenth" && description["length"] === 1
          ? [createIssue("out_of_range", "/length", { term: "length", got: 1, range: { min: 2 } })]
          : [],
    },
    {
      name: "the spare markings name a division",
      inputs: ["spare/smallestDivision"],
      check: (description) => {
        const spare = description["spare"] as { smallestDivision?: unknown };
        return spare.smallestDivision === undefined ? [createIssue("missing_property", "/spare/smallestDivision", { term: "spare.smallestDivision", graphType: "ruler" })] : [];
      },
    },
  ],
  describe: () => "A test-only ruler.",
};

/** A registry holding only the conditional ruler. */
export const conditionalRegistry: Readonly<Partial<Record<GraphType, GraphTypeDefinition>>> = Object.freeze(
  Object.assign(Object.create(null) as Partial<Record<GraphType, GraphTypeDefinition>>, { ruler: conditionalRuler }),
);
