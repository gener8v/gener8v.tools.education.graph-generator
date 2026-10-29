import { createIssue, pointer } from "../issues";
import { cleanText, formatList, quoteText, sourceOf, stateMeasurement } from "../format";
import type { Provenance } from "../result";
import { unitProperty } from "./figure";
import { CALLER_TEXT_LIMIT } from "./shared";
import { defineProperties, type DescriptionBase, type DomainCheck, type GraphTypeDefinition } from "./types";

/** A normalized circle description: all three measurements are present once validated. */
export interface Circle extends DescriptionBase {
  readonly type: "circle";
  readonly radius: number;
  readonly diameter: number;
  readonly circumference: number;
  readonly showRadius?: boolean;
  readonly showDiameter?: boolean;
  readonly showCenter?: boolean;
  readonly labelRadius?: boolean;
  readonly labelDiameter?: boolean;
  readonly labelCircumference?: boolean;
  readonly radiusLabelText?: string;
  readonly diameterLabelText?: string;
  readonly circumferenceLabelText?: string;
  readonly unit?: string;
  readonly title?: string;
  readonly lineColor?: string;
}

/** The circle's measurements, in the documented defining order (AD-004). */
export const CIRCLE_MEASUREMENTS = ["radius", "diameter", "circumference"] as const;
export type CircleMeasurement = (typeof CIRCLE_MEASUREMENTS)[number];

/** How one measurement is shown: whether it is drawn as a segment, labeled, and with what custom text. */
export interface MeasurementDisplay {
  /** Drawn as a segment (never true for the circumference, which is the outline). */
  readonly drawn: boolean;
  readonly labeled: boolean;
  /** Custom text in place of the value (GSS-REQ-035); `""` or blank after cleaning is a blank label. */
  readonly customText: string | undefined;
}

const LABEL_SWITCH = { radius: "labelRadius", diameter: "labelDiameter", circumference: "labelCircumference" } as const;
const LABEL_TEXT = { radius: "radiusLabelText", diameter: "diameterLabelText", circumference: "circumferenceLabelText" } as const;
const DRAW_SWITCH = { radius: "showRadius", diameter: "showDiameter" } as const;

/**
 * What a valid circle shows, the one rule `describe` and the layout share: custom label text
 * labels its measurement, and a labeled radius or diameter is drawn, since its label sits on its
 * segment. An explicit `false` against either rule is a contradiction, so it never reaches here.
 */
// @spec GSS-REQ-003, GSS-REQ-004, GSS-REQ-006, GSS-REQ-035
export function circleDisplay(circle: Circle): Readonly<Record<CircleMeasurement, MeasurementDisplay>> {
  const display = (term: CircleMeasurement): MeasurementDisplay => {
    const customText = circle[LABEL_TEXT[term]];
    const labeled = circle[LABEL_SWITCH[term]] === true || customText !== undefined;
    const drawn = term !== "circumference" && (circle[DRAW_SWITCH[term]] === true || labeled);
    return { drawn, labeled, customText };
  };
  return { radius: display("radius"), diameter: display("diameter"), circumference: display("circumference") };
}

// Curriculum-sized limits that agree: each member's bounds are what the radius bounds derive,
// rounded outward, so no radius in range derives a diameter or circumference out of range
// (GSV TICKET-004 code review CR-001).
const measurement = (term: CircleMeasurement, min: number, max: number, description: string) =>
  ({ term, kind: "number", required: false, min, max, description }) as const;

const flag = (term: string, description: string) => ({ term, kind: "boolean", required: false, description }) as const;

const labelText = (term: string, measured: string) =>
  ({
    term,
    kind: "string",
    required: false,
    maxLength: CALLER_TEXT_LIMIT,
    description: `Text shown in place of the ${measured} label, at most ${CALLER_TEXT_LIMIT} characters, such as "r" or "?"; it also labels the ${measured}. It replaces the whole label, unit included, so add the unit to the text if it should show. An empty text is a blank label, for example a space to fill in. Text too long to fit beside the figure is placed below it, and text longer than four lines is cut short with “…”. The text alternative still states the value.`,
  }) as const;

/** A switch that custom text, or a label, turns on: giving both with the switch `false` disagrees. */
function agrees(name: string, switchTerm: string, impliedBy: string): DomainCheck<Circle> {
  return {
    name,
    inputs: [switchTerm, impliedBy],
    check: (circle) =>
      circle[switchTerm] === false && circle[impliedBy] !== false
        ? [
            createIssue("contradiction", pointer(impliedBy), {
              term: impliedBy,
              got: circle[impliedBy],
              conflicts: [pointer(switchTerm)],
              conflictTerms: [switchTerm],
            }),
          ]
        : [],
  };
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * The circle (GSS-REQ-001, GSS-REQ-002): given by any one of radius, diameter or circumference,
 * the others derived, with an optional drawn radius, diameter and center, and a label on each
 * measurement with its value and unit or custom text.
 */
// @spec GSS-REQ-001, GSS-REQ-002, GSS-REQ-003, GSS-REQ-004, GSS-REQ-005, GSS-REQ-006, GSS-REQ-035, GSV-REQ-052, GSV-REQ-053
export const circle: GraphTypeDefinition<Circle> = {
  type: "circle",
  title: "Circle",
  description:
    "A circle drawn to scale from its radius, diameter or circumference (give one; any other given must agree within 1%). The radius, the diameter and the center can be drawn, and each measurement labeled with its value and unit or with custom text.",
  properties: defineProperties({
    radius: measurement("radius", 0.001, 1_000_000, "The distance from the center to the circle, from 0.001 to 1,000,000."),
    diameter: measurement(
      "diameter",
      0.002,
      2_000_000,
      "The distance across the circle through its center, twice the radius, from 0.002 to 2,000,000.",
    ),
    circumference: measurement(
      "circumference",
      0.006,
      6_283_186,
      "The distance around the circle, 2π times the radius, from 0.006 to 6,283,186.",
    ),
    showRadius: flag("showRadius", "Whether the radius is drawn, from the center horizontally to the right."),
    showDiameter: flag("showDiameter", "Whether the diameter is drawn through the center; it never lies on the radius."),
    showCenter: flag("showCenter", "Whether the center is marked with a point."),
    labelRadius: flag("labelRadius", "Whether the radius is labeled with its measurement; a labeled radius is drawn."),
    labelDiameter: flag("labelDiameter", "Whether the diameter is labeled with its measurement; a labeled diameter is drawn."),
    labelCircumference: flag("labelCircumference", "Whether the circumference is labeled with its measurement, next to the circle."),
    radiusLabelText: labelText("radiusLabelText", "radius"),
    diameterLabelText: labelText("diameterLabelText", "diameter"),
    circumferenceLabelText: labelText("circumferenceLabelText", "circumference"),
    unit: unitProperty,
  }),
  derivations: [
    {
      members: CIRCLE_MEASUREMENTS,
      description: "diameter = 2 × radius; circumference = 2π × radius",
      required: true,
      derive: (term, value) => {
        const radius = term === "radius" ? value : term === "diameter" ? value / 2 : value / (2 * Math.PI);
        return { radius, diameter: 2 * radius, circumference: 2 * Math.PI * radius };
      },
    },
  ],
  checks: [
    agrees("radius label text needs the radius labeled", "labelRadius", "radiusLabelText"),
    agrees("diameter label text needs the diameter labeled", "labelDiameter", "diameterLabelText"),
    agrees("circumference label text needs the circumference labeled", "labelCircumference", "circumferenceLabelText"),
    agrees("a labeled radius is drawn", "showRadius", "labelRadius"),
    agrees("radius label text draws the radius", "showRadius", "radiusLabelText"),
    agrees("a labeled diameter is drawn", "showDiameter", "labelDiameter"),
    agrees("diameter label text draws the diameter", "showDiameter", "diameterLabelText"),
  ],
  /**
   * "A circle titled “Wheel” with radius 5 cm, diameter 10 cm and circumference 31.4 cm. Its center
   * is marked, and its radius and diameter are drawn. The radius is labeled “r”." The radius is
   * always stated; the diameter when drawn and the circumference when labeled. Custom label text
   * is quoted, and the value is stated anyway (GSS-REQ-035).
   */
  // @spec GSS-REQ-033, GSS-REQ-034, GSS-REQ-036
  describe: (circle: Circle, provenance: Provenance) => {
    const shown = circleDisplay(circle);
    const measured = (term: CircleMeasurement) => `${term} ${stateMeasurement(circle[term], sourceOf(provenance, term), circle.unit)}`;
    const measures = [measured("radius")];
    if (shown.diameter.drawn) measures.push(measured("diameter"));
    if (shown.circumference.labeled) measures.push(measured("circumference"));
    // A title that is blank once cleaned is not drawn (`titleBlock`), so it is not stated either
    // (code review CR-001).
    const title = circle.title === undefined ? "" : cleanText(circle.title);
    const titled = title === "" ? "" : ` titled ${quoteText(title)}`;
    const sentences = [`A circle${titled} with ${formatList(measures)}.`];

    const marks: string[] = [];
    if (circle.showCenter === true) marks.push("its center is marked");
    const drawn = (["radius", "diameter"] as const).filter((term) => shown[term].drawn);
    if (drawn.length > 0) marks.push(`its ${formatList(drawn)} ${drawn.length > 1 ? "are" : "is"} drawn`);
    if (marks.length > 0) sentences.push(`${capitalize(marks.join(", and "))}.`);

    for (const term of CIRCLE_MEASUREMENTS) {
      const text = shown[term].customText;
      if (text === undefined) continue;
      sentences.push(cleanText(text) === "" ? `The ${term} label is left blank.` : `The ${term} is labeled ${quoteText(text)}.`);
    }
    return sentences.join(" ");
  },
};
