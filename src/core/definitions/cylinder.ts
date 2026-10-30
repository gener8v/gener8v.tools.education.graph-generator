import { cleanText, formatList, quoteText, sourceOf, stateMeasurement } from "../format";
import type { Provenance } from "../result";
import type { MeasurementDisplay } from "./circle";
import { agrees, measurementLabelText, radiusProperties, unitProperty } from "./figure";
import { type DescriptionBase, type GraphTypeDefinition, defineProperties } from "./types";

/** A normalized cylinder description: radius and diameter are both present once validated. */
export interface Cylinder extends DescriptionBase {
  readonly type: "cylinder";
  readonly radius: number;
  readonly diameter: number;
  readonly height: number;
  readonly hiddenBase?: "dashed" | "omitted";
  readonly showRadius?: boolean;
  readonly showDiameter?: boolean;
  readonly labelRadius?: boolean;
  readonly labelDiameter?: boolean;
  readonly labelHeight?: boolean;
  readonly radiusLabelText?: string;
  readonly diameterLabelText?: string;
  readonly heightLabelText?: string;
  readonly unit?: string;
  readonly title?: string;
  readonly lineColor?: string;
}

/** The cylinder's base measurements, in the documented defining order (AD-004). */
export const CYLINDER_BASE_MEASUREMENTS = ["radius", "diameter"] as const;
export type CylinderMeasurement = (typeof CYLINDER_BASE_MEASUREMENTS)[number] | "height";

/** The most a height may measure. */
export const CYLINDER_HEIGHT_LIMIT = 1_000_000;
/** The shortest height. */
export const CYLINDER_HEIGHT_MIN = 0.001;

/** What a valid cylinder shows: the one rule `describe` and the layout share. */
export interface CylinderDisplay {
  /** Whether the hidden half of the base is drawn dashed (the default) or left out (GSS-REQ-028). */
  readonly hiddenDashed: boolean;
  /** The radius and the diameter, each drawn on the top face and labeled; the height, labeled beside the side (never "drawn": the side is). */
  readonly radius: MeasurementDisplay;
  readonly diameter: MeasurementDisplay;
  readonly height: MeasurementDisplay;
}

const LABEL_SWITCH = { radius: "labelRadius", diameter: "labelDiameter", height: "labelHeight" } as const;
const LABEL_TEXT = { radius: "radiusLabelText", diameter: "diameterLabelText", height: "heightLabelText" } as const;
const DRAW_SWITCH = { radius: "showRadius", diameter: "showDiameter" } as const;

/**
 * What a valid cylinder shows, the one rule `describe` and the layout share, the circle's rule
 * (`circleDisplay`): custom label text labels its measurement, and a labeled radius or diameter is
 * drawn, since its label sits on its segment. The height is the side line, always drawn. An
 * explicit `false` against either rule is a contradiction, so it never reaches here.
 */
// @spec GSS-REQ-028, GSS-REQ-029, GSS-REQ-035
export function cylinderDisplay(cylinder: Cylinder): CylinderDisplay {
  const display = (term: CylinderMeasurement): MeasurementDisplay => {
    const customText = cylinder[LABEL_TEXT[term]];
    const labeled = cylinder[LABEL_SWITCH[term]] === true || customText !== undefined;
    const drawn = term !== "height" && (cylinder[DRAW_SWITCH[term]] === true || labeled);
    return { drawn, labeled, customText };
  };
  return { hiddenDashed: cylinder.hiddenBase !== "omitted", radius: display("radius"), diameter: display("diameter"), height: display("height") };
}

/**
 * The cylinder (GSS-REQ-026..029): upright, given by its radius or its diameter (the other
 * derived) and its height, drawn in the solids' one isometric viewpoint with the hidden half of its
 * base dashed or omitted, and its radius or diameter drawn and labeled on the top face and its
 * height labeled beside the side. The radius and diameter terms are the circle's, shared by
 * identity (GSV-REQ-015). Built by a function free of side effects, so a bundle that never reads
 * the cylinder drops it.
 */
// @spec GSS-REQ-026, GSS-REQ-027, GSS-REQ-028, GSS-REQ-029, GSS-REQ-035, GSV-REQ-052, GSV-REQ-053
export const cylinder: GraphTypeDefinition<Cylinder> = /* @__PURE__ */ defineCylinder();

/**
 * Builds the cylinder definition. A function marked free of side effects, so a bundle that never
 * reads the definition drops it.
 */
// @spec GSS-REQ-026, GSS-REQ-027, GSS-REQ-028, GSS-REQ-029, GSS-REQ-035
/* @__NO_SIDE_EFFECTS__ */
function defineCylinder(): GraphTypeDefinition<Cylinder> {
  return {
    type: "cylinder",
    title: "Cylinder",
    description:
      "An upright cylinder drawn to scale from its radius or diameter (give one; if both are given they must agree within 1%) and its height, seen from one fixed viewpoint above (isometric), the same as the cube's. The hidden half of its base is dashed, or can be left out. The radius or the diameter can be drawn and labeled on the top face, and the height labeled beside the side, with the value and unit or with custom text.",
    properties: defineProperties({
      radius: radiusProperties.radius,
      diameter: radiusProperties.diameter,
      height: {
        term: "height",
        kind: "number",
        required: true,
        min: CYLINDER_HEIGHT_MIN,
        max: CYLINDER_HEIGHT_LIMIT,
        description: "The height of the cylinder, from its base to its top face, from 0.001 to 1,000,000.",
      },
      hiddenBase: {
        term: "hiddenBase",
        kind: "enum",
        required: false,
        values: ["dashed", "omitted"],
        valueDescriptions: {
          dashed: "Draw the half of the base hidden behind the cylinder as a dashed curve.",
          omitted: "Leave the hidden half of the base out, drawing only its front half.",
        },
        description: "How the half of the base hidden behind the cylinder is drawn: dashed (the default) or omitted.",
      },
      showRadius: radiusProperties.showRadius,
      showDiameter: radiusProperties.showDiameter,
      labelRadius: radiusProperties.labelRadius,
      labelDiameter: radiusProperties.labelDiameter,
      labelHeight: {
        term: "labelHeight",
        kind: "boolean",
        required: false,
        description: "Whether the height is labeled with its measurement, beside the right side of the cylinder.",
      },
      radiusLabelText: radiusProperties.radiusLabelText,
      diameterLabelText: radiusProperties.diameterLabelText,
      heightLabelText: measurementLabelText("heightLabelText", "height"),
      unit: unitProperty,
    }),
    derivations: [
      {
        members: CYLINDER_BASE_MEASUREMENTS,
        description: "diameter = 2 × radius",
        required: true,
        derive: (term, value) => {
          const radius = term === "radius" ? value : value / 2;
          return { radius, diameter: 2 * radius };
        },
      },
    ],
    checks: [
      agrees<Cylinder>("radius label text needs the radius labeled", "labelRadius", "radiusLabelText"),
      agrees<Cylinder>("diameter label text needs the diameter labeled", "labelDiameter", "diameterLabelText"),
      agrees<Cylinder>("height label text needs the height labeled", "labelHeight", "heightLabelText"),
      agrees<Cylinder>("a labeled radius is drawn", "showRadius", "labelRadius"),
      agrees<Cylinder>("radius label text draws the radius", "showRadius", "radiusLabelText"),
      agrees<Cylinder>("a labeled diameter is drawn", "showDiameter", "labelDiameter"),
      agrees<Cylinder>("diameter label text draws the diameter", "showDiameter", "diameterLabelText"),
    ],
    /**
     * "A cylinder titled “Can” with radius 2 cm and height 5 cm. Its radius is drawn. Its hidden
     * base is dashed." The radius and the height are always stated, the diameter when drawn. Custom
     * label text is quoted, and the value is stated anyway (GSS-REQ-035).
     */
    // @spec GSS-REQ-026, GSS-REQ-027, GSS-REQ-028, GSS-REQ-029, GSS-REQ-033, GSS-REQ-034, GSS-REQ-036
    describe: (cylinder: Cylinder, provenance: Provenance) => {
      const shown = cylinderDisplay(cylinder);
      const measured = (term: CylinderMeasurement) => `${term} ${stateMeasurement(cylinder[term], sourceOf(provenance, term), cylinder.unit)}`;
      const measures = [measured("radius")];
      if (shown.diameter.drawn) measures.push(measured("diameter"));
      measures.push(measured("height"));
      // A title that is blank once cleaned is not drawn (`titleBlock`), so it is not stated either.
      const title = cylinder.title === undefined ? "" : cleanText(cylinder.title);
      const titled = title === "" ? "" : ` titled ${quoteText(title)}`;
      const sentences = [`A cylinder${titled} with ${formatList(measures)}.`];

      const drawn = CYLINDER_BASE_MEASUREMENTS.filter((term) => shown[term].drawn);
      if (drawn.length > 0) sentences.push(`Its ${formatList(drawn)} ${drawn.length > 1 ? "are" : "is"} drawn.`);
      sentences.push(shown.hiddenDashed ? "Its hidden base is dashed." : "The hidden half of its base is not drawn.");

      for (const term of ["radius", "diameter", "height"] as const) {
        const text = shown[term].customText;
        if (text === undefined) continue;
        sentences.push(cleanText(text) === "" ? `The ${term} label is left blank.` : `The ${term} is labeled ${quoteText(text)}.`);
      }
      return sentences.join(" ");
    },
  };
}
