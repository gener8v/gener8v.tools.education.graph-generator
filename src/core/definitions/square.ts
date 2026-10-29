import { cleanText, quoteText, sourceOf, stateMeasurement } from "../format";
import type { Provenance } from "../result";
import { unitProperty } from "./figure";
import { CALLER_TEXT_LIMIT } from "./shared";
import { type DescriptionBase, type GraphTypeDefinition, defineProperties } from "./types";

/** A normalized square description. */
export interface Square extends DescriptionBase {
  readonly type: "square";
  readonly sideLength: number;
  readonly labelSides?: "one" | "all";
  readonly sideLabelText?: string;
  readonly showRightAngles?: boolean;
  readonly unit?: string;
  readonly title?: string;
  readonly lineColor?: string;
}

/** How many sides carry a label, and with what custom text. */
export interface SideLabels {
  /** 0 for none, 1 for the bottom side, 4 for all four. */
  readonly count: 0 | 1 | 4;
  /** Custom text in place of the value (GSS-REQ-035); `""` or blank after cleaning is a blank label. */
  readonly customText: string | undefined;
}

/**
 * What a valid square labels, the one rule `describe` and the layout share: `labelSides` says how
 * many sides, and custom text alone labels one side. Nothing can contradict custom text, so there
 * is no domain check.
 */
// @spec GSS-REQ-008, GSS-REQ-035
export function squareLabels(square: Square): SideLabels {
  const customText = square.sideLabelText;
  if (square.labelSides === "all") return { count: 4, customText };
  if (square.labelSides === "one" || customText !== undefined) return { count: 1, customText };
  return { count: 0, customText };
}

/**
 * The square (GSS-REQ-007..009): one side length, an optional label on one side or all four with
 * the value and unit or custom text, and optional right-angle marks. Built by a function free of
 * side effects, so a bundle that never reads the square drops it (as the ruler's is dropped).
 */
// @spec GSS-REQ-007, GSS-REQ-008, GSS-REQ-009, GSS-REQ-035, GSV-REQ-052, GSV-REQ-053
export const square: GraphTypeDefinition<Square> = /* @__PURE__ */ defineSquare();

/**
 * Builds the square definition. A function marked free of side effects, so a bundle that never
 * reads the definition drops it.
 */
// @spec GSS-REQ-007, GSS-REQ-008, GSS-REQ-009, GSS-REQ-035
/* @__NO_SIDE_EFFECTS__ */
function defineSquare(): GraphTypeDefinition<Square> {
  return {
    type: "square",
    title: "Square",
    description:
      "A square drawn to scale from its side length. One side or all four can be labeled with the length and unit or with custom text, and its right angles can be marked.",
    properties: defineProperties({
      sideLength: {
        term: "sideLength",
        kind: "number",
        required: true,
        min: 0.001,
        max: 1_000_000,
        description: "The length of each side of the square, from 0.001 to 1,000,000.",
      },
      labelSides: {
        term: "labelSides",
        kind: "enum",
        required: false,
        values: ["one", "all"],
        valueDescriptions: {
          one: "Label one side, the bottom side, with the side length.",
          all: "Label all four sides with the side length.",
        },
        description: "Which sides are labeled with the side length: one side (the bottom) or all four. Without it, no side is labeled unless sideLabelText is given.",
      },
      sideLabelText: {
        term: "sideLabelText",
        kind: "string",
        required: false,
        maxLength: CALLER_TEXT_LIMIT,
        description: `Text shown in place of the side label, at most ${CALLER_TEXT_LIMIT} characters, such as "s" or "?"; given alone it labels one side, and with labelSides "all" it labels all four sides. It replaces the whole label, unit included, so add the unit to the text if it should show. An empty text is a blank label, for example a space to fill in. Text too long to fit beside the figure is placed below it, and text longer than four lines is cut short with “…”. The text alternative still states the value.`,
      },
      showRightAngles: {
        term: "showRightAngles",
        kind: "boolean",
        required: false,
        description: "Whether the four right angles are marked, with a small right-angle mark in each corner.",
      },
      unit: unitProperty,
    }),
    derivations: [],
    checks: [],
    /**
     * "A square titled “Tile” with side length 4 cm. Its right angles are marked. All four sides
     * are labeled." The side length is always stated, as written when supplied. Custom label text
     * is quoted, and the value is stated anyway (GSS-REQ-035).
     */
    // @spec GSS-REQ-033, GSS-REQ-034, GSS-REQ-036
    describe: (square: Square, provenance: Provenance) => {
      // A title that is blank once cleaned is not drawn (`titleBlock`), so it is not stated either.
      const title = square.title === undefined ? "" : cleanText(square.title);
      const titled = title === "" ? "" : ` titled ${quoteText(title)}`;
      const sentences = [`A square${titled} with side length ${stateMeasurement(square.sideLength, sourceOf(provenance, "sideLength"), square.unit)}.`];
      if (square.showRightAngles === true) sentences.push("Its right angles are marked.");
      const labels = squareLabels(square);
      if (labels.count > 0) {
        const which = labels.count === 4 ? "All four sides are" : "One side is";
        if (labels.customText === undefined) sentences.push(`${which} labeled.`);
        else if (cleanText(labels.customText) === "") sentences.push(labels.count === 4 ? "The side labels are left blank." : "The side label is left blank.");
        else sentences.push(`${which} labeled ${quoteText(labels.customText)}.`);
      }
      return sentences.join(" ");
    },
  };
}
