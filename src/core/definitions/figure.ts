import { createIssue, pointer } from "../issues";
import { CALLER_TEXT_LIMIT, UNIT_TEXT_LIMIT } from "./shared";
import { type DescriptionBase, type DomainCheck, defineProperties } from "./types";

const flag = (term: string, description: string) => ({ term, kind: "boolean", required: false, description }) as const;

/**
 * Custom label text for a measurement, the house style every figure's label text follows: at most
 * `CALLER_TEXT_LIMIT` characters, replacing the whole label, blank when empty, stacked below the
 * figure when it has no clear place, cut after four lines.
 */
export const measurementLabelText = (term: string, measured: string) =>
  ({
    term,
    kind: "string",
    required: false,
    maxLength: CALLER_TEXT_LIMIT,
    description: `Text shown in place of the ${measured} label, at most ${CALLER_TEXT_LIMIT} characters, such as "r" or "?"; it also labels the ${measured}. It replaces the whole label, unit included, so add the unit to the text if it should show. An empty text is a blank label, for example a space to fill in. Text too long to fit beside the figure is placed below it, and text longer than four lines is cut short with “…”. The text alternative still states the value.`,
  }) as const;

/**
 * The terms the figures that state a length share (the circle, the square, the triangle, the
 * cube, the cylinder): a term
 * has one definition in the vocabulary (GSV-REQ-015). Built by `defineProperties`, so each spec is
 * frozen with no prototype before any definition uses it, and every figure holds the same object;
 * a plain or merely frozen literal would be copied per figure, or keep `Object.prototype` (GSS
 * TICKET-003 security review SEC-001). Marked pure, so a bundle with no figure drops it; it
 * imports no figure.
 */
// @spec GSS-REQ-003, GSS-REQ-004, GSS-REQ-006, GSS-REQ-008, GSS-REQ-020, GSS-REQ-027, GSS-REQ-029, GSS-REQ-033, GSS-REQ-035, GSV-REQ-015, GSV-REQ-053
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
  // The circle's and the cylinder's radius and diameter (graph-library GSS TICKET-007): one term
  // each, so one definition (GSV-REQ-015). Their limits agree: each diameter bound is twice the
  // radius bound (GSV TICKET-004 code review CR-001).
  radius: {
    term: "radius",
    kind: "number",
    required: false,
    min: 0.001,
    max: 1_000_000,
    description: "The radius of a circle, or of a cylinder's base: the distance from the center to the edge, from 0.001 to 1,000,000.",
  },
  diameter: {
    term: "diameter",
    kind: "number",
    required: false,
    min: 0.002,
    max: 2_000_000,
    description: "The diameter of a circle, or of a cylinder's base: the distance across through the center, twice the radius, from 0.002 to 2,000,000.",
  },
  showRadius: flag(
    "showRadius",
    "Whether the radius is drawn: on a circle, from the center horizontally to the right; on a cylinder, on its top face, from the center toward the lower right.",
  ),
  showDiameter: flag(
    "showDiameter",
    "Whether the diameter is drawn: on a circle, through its center; on a cylinder, across its top face through the center. It never lies on the radius.",
  ),
  labelRadius: flag("labelRadius", "Whether the radius is labeled with its measurement; a labeled radius is drawn."),
  labelDiameter: flag("labelDiameter", "Whether the diameter is labeled with its measurement; a labeled diameter is drawn."),
  radiusLabelText: measurementLabelText("radiusLabelText", "radius"),
  diameterLabelText: measurementLabelText("diameterLabelText", "diameter"),
});

/** The one `unit` term spec (`figureTerms.unit`), shared by identity. */
export const unitProperty = figureTerms.unit;

/** The one `labelSides` term spec (`figureTerms.labelSides`), shared by identity by the square and the triangle. */
export const labelSidesProperty = figureTerms.labelSides;

/**
 * The radius and diameter terms the circle and the cylinder share by identity (graph-library GSS
 * TICKET-007): the measurements, their drawn and labeled switches, and their label texts. A
 * figure spreads these into its own `defineProperties` map, which keeps each spec object itself.
 */
export const radiusProperties = {
  radius: figureTerms.radius,
  diameter: figureTerms.diameter,
  showRadius: figureTerms.showRadius,
  showDiameter: figureTerms.showDiameter,
  labelRadius: figureTerms.labelRadius,
  labelDiameter: figureTerms.labelDiameter,
  radiusLabelText: figureTerms.radiusLabelText,
  diameterLabelText: figureTerms.diameterLabelText,
} as const;

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
