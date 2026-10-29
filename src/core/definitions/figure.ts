import { createIssue, pointer } from "../issues";
import { UNIT_TEXT_LIMIT } from "./shared";
import { type DescriptionBase, type DomainCheck, defineProperties } from "./types";

/**
 * The terms the figures that state a length share (the circle, the square, the triangle): a term
 * has one definition in the vocabulary (GSV-REQ-015). Built by `defineProperties`, so each spec is
 * frozen with no prototype before any definition uses it, and every figure holds the same object;
 * a plain or merely frozen literal would be copied per figure, or keep `Object.prototype` (GSS
 * TICKET-003 security review SEC-001). Marked pure, so a bundle with no figure drops it; it
 * imports no figure.
 */
// @spec GSS-REQ-008, GSS-REQ-020, GSS-REQ-033, GSV-REQ-015, GSV-REQ-053
const figureTerms = /* @__PURE__ */ defineProperties({
  unit: {
    term: "unit",
    kind: "string",
    required: false,
    maxLength: UNIT_TEXT_LIMIT,
    description: `The unit of length shown after each measurement, such as cm, at most ${UNIT_TEXT_LIMIT} characters. A unit with sentence punctuation is quoted in the text alternative.`,
  },
  // The square's and the triangle's one side-label switch (graph-library GSS TICKET-005): one
  // term, so one definition (GSV-REQ-015).
  labelSides: {
    term: "labelSides",
    kind: "enum",
    required: false,
    values: ["one", "all"],
    valueDescriptions: {
      one: "Label one side, the bottom side, with its length: for a triangle, the side it is drawn standing on, or side a when it is given by its vertices.",
      all: "Label every side with its length: all four sides of a square, all three of a triangle.",
    },
    description: "Which sides are labeled with their length: one side (the bottom) or every side. Without it, no side is labeled unless a side's label text is given.",
  },
});

/** The one `unit` term spec (`figureTerms.unit`), shared by identity. */
export const unitProperty = figureTerms.unit;

/** The one `labelSides` term spec (`figureTerms.labelSides`), shared by identity by the square and the triangle. */
export const labelSidesProperty = figureTerms.labelSides;

/**
 * A switch that custom text, or a label, turns on: giving both with the switch `false` disagrees,
 * reported as a `contradiction` at the implied term. The circle's rule, shared with the triangle's
 * angle labels (graph-library GSS TICKET-005).
 */
// @spec GSS-REQ-006, GSS-REQ-020, GSS-REQ-035
export function agrees<D extends DescriptionBase>(name: string, switchTerm: string, impliedBy: string): DomainCheck<D> {
  return {
    name,
    inputs: [switchTerm, impliedBy],
    check: (description) =>
      description[switchTerm] === false && description[impliedBy] !== false
        ? [
            createIssue("contradiction", pointer(impliedBy), {
              term: impliedBy,
              got: description[impliedBy],
              conflicts: [pointer(switchTerm)],
              conflictTerms: [switchTerm],
            }),
          ]
        : [],
  };
}
