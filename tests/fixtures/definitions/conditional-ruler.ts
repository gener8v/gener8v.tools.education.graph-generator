import { type GraphType, type GraphTypeDefinition, type PropertySpec, defineProperties } from "../../../src/core/definitions/types";
import { createIssue } from "../../../src/core/issues";

// The unit and its conditional division, defined once and nested at the top level, in an object
// and in list elements (quality review QR-005).
const unit: PropertySpec = {
  term: "unit",
  kind: "enum",
  required: true,
  values: ["centimeters", "inches"],
  valueDescriptions: { centimeters: "Marked in centimetres and millimetres.", inches: "Marked in inches and fractions of an inch." },
  description: "The unit a ruler is marked in.",
};
const smallestDivision: PropertySpec = {
  term: "smallestDivision",
  kind: "enum",
  required: false,
  values: ["half", "quarter", "eighth", "sixteenth"],
  description: "An inch ruler's smallest division.",
  appliesWhen: { term: "unit", values: ["inches"] },
};
const markings = defineProperties({ unit, smallestDivision });

/**
 * A test-only ruler-like definition for the conditional-term mechanism (rulers GSV TICKET-001): a
 * two-value `unit` and a `smallestDivision` that applies only when `unit` is `inches`
 * (GSV-REQ-051), at the top level, inside `spare` and inside each of `extras`. It has its own
 * registry, outside `fixtureRegistry`, so no other fixture test changes with it. It is also
 * outside the definitions test's `allDefinitions()`: the shared `label` and `color` list `ruler`
 * in `elementsOf`, which this fixture does not nest, so the applicability check would refuse it.
 * The real ruler definition comes with rulers NLC TICKET-002.
 */
export const conditionalRuler: GraphTypeDefinition = {
  type: "ruler",
  title: "Conditional ruler (test only)",
  description: "A ruler-like fixture for terms that apply only while a sibling has given values.",
  properties: defineProperties({
    unit,
    smallestDivision,
    length: { term: "length", kind: "integer", required: true, min: 1, max: 30, description: "How many units long a ruler is." },
    spare: { term: "spare", kind: "object", required: false, description: "A second set of markings, for nested conditions.", properties: markings },
    extras: {
      term: "extras",
      kind: "array",
      required: false,
      maxItems: 3,
      description: "More sets of markings, for conditions in list elements.",
      items: { kind: "object", description: "One set of markings.", properties: markings },
    },
  }),
  derivations: [],
  checks: [
    {
      // Reads the division as optional: absent means the default sixteenth on an inch ruler.
      name: "an inch ruler marked to sixteenths needs at least 2 units",
      inputs: ["unit", "length"],
      optionalInputs: ["smallestDivision"],
      check: (description) =>
        description["unit"] === "inches" && (description["smallestDivision"] ?? "sixteenth") === "sixteenth" && description["length"] === 1
          ? [createIssue("out_of_range", "/length", { term: "length", got: 1, range: { min: 2 } })]
          : [],
    },
    {
      // A probe: it reports whenever it runs and finds no division, so a test can see whether it ran.
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
