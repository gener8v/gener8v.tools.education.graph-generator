import { cleanText, quoteText, sourceOf, stateMeasurement } from "../format";
import type { Provenance } from "../result";
import { unitProperty } from "./figure";
import { CALLER_TEXT_LIMIT } from "./shared";
import { type DescriptionBase, type GraphTypeDefinition, defineProperties } from "./types";

/** A normalized cube description. */
export interface Cube extends DescriptionBase {
  readonly type: "cube";
  readonly edgeLength: number;
  readonly hiddenEdges?: "dashed" | "omitted";
  readonly labelEdges?: "one" | "three";
  readonly edgeLabelText?: string;
  readonly unit?: string;
  readonly title?: string;
  readonly lineColor?: string;
}

/** The most an edge may measure. */
export const CUBE_EDGE_LIMIT = 1_000_000;
/** The shortest edge. */
export const CUBE_EDGE_MIN = 0.001;

/** What a valid cube shows: the one rule `describe` and the layout share. */
export interface CubeDisplay {
  /** Whether the three hidden edges are drawn dashed (the default) or left out (GSS-REQ-024). */
  readonly hiddenDashed: boolean;
  /**
   * How many edges carry a label (GSS-REQ-025): 0 for none, 1 for the hexagon's bottom-right outer
   * edge, 3 for the three visible edges meeting at the front corner.
   */
  readonly labeled: 0 | 1 | 3;
  /** Custom text in place of the value (GSS-REQ-035); `""` or blank after cleaning is a blank label. */
  readonly customText: string | undefined;
}

/**
 * What a valid cube shows, the one rule `describe` and the layout share: hidden edges dashed unless
 * omitted; `labelEdges` says which edges are labeled, and custom text alone labels one edge, as the
 * square's does. Nothing can contradict custom text, so there is no domain check.
 */
// @spec GSS-REQ-024, GSS-REQ-025, GSS-REQ-035
export function cubeDisplay(cube: Cube): CubeDisplay {
  const customText = cube.edgeLabelText;
  // Three edges when asked; one when asked or when custom text alone is given; else none.
  let labeled: 0 | 1 | 3 = 0;
  if (cube.labelEdges === "three") labeled = 3;
  else if (cube.labelEdges === "one" || customText !== undefined) labeled = 1;
  return { hiddenDashed: cube.hiddenEdges !== "omitted", labeled, customText };
}

/**
 * The cube (GSS-REQ-023..025): one edge length, drawn in the solids' one isometric viewpoint with
 * its hidden edges dashed or omitted, and optionally one edge or the three visible edges meeting at
 * the front corner labeled with the value and unit or custom text. Built by a function free of side
 * effects, so a bundle that never reads the cube drops it.
 */
// @spec GSS-REQ-023, GSS-REQ-024, GSS-REQ-025, GSS-REQ-035, GSV-REQ-052, GSV-REQ-053
export const cube: GraphTypeDefinition<Cube> = /* @__PURE__ */ defineCube();

/**
 * Builds the cube definition. A function marked free of side effects, so a bundle that never reads
 * the definition drops it.
 */
// @spec GSS-REQ-023, GSS-REQ-024, GSS-REQ-025, GSS-REQ-035
/* @__NO_SIDE_EFFECTS__ */
function defineCube(): GraphTypeDefinition<Cube> {
  return {
    type: "cube",
    title: "Cube",
    description:
      "A cube drawn from its edge length, seen from one fixed viewpoint above a front corner (isometric), so all twelve edges are drawn the same length. Its three hidden edges are dashed, or can be left out. One edge, or the three visible edges meeting at the front corner, can be labeled with the length and unit or with custom text.",
    properties: defineProperties({
      edgeLength: {
        term: "edgeLength",
        kind: "number",
        required: true,
        min: CUBE_EDGE_MIN,
        max: CUBE_EDGE_LIMIT,
        description: "The length of each edge of the cube, from 0.001 to 1,000,000.",
      },
      hiddenEdges: {
        term: "hiddenEdges",
        kind: "enum",
        required: false,
        values: ["dashed", "omitted"],
        valueDescriptions: {
          dashed: "Draw the three hidden edges, behind the cube, as dashed lines.",
          omitted: "Leave the three hidden edges out, drawing only the nine visible edges.",
        },
        description: "How the three edges hidden behind the cube are drawn: dashed (the default) or omitted.",
      },
      labelEdges: {
        term: "labelEdges",
        kind: "enum",
        required: false,
        values: ["one", "three"],
        valueDescriptions: {
          one: "Label one edge, the bottom right edge, with its length.",
          three: "Label the three visible edges that meet at the front corner, each with its length.",
        },
        description: "Which edges are labeled with their length: one edge (the bottom right) or the three visible edges meeting at the front corner. Without it, no edge is labeled unless the edge label text is given.",
      },
      edgeLabelText: {
        term: "edgeLabelText",
        kind: "string",
        required: false,
        maxLength: CALLER_TEXT_LIMIT,
        description: `Text shown in place of the edge label, at most ${CALLER_TEXT_LIMIT} characters, such as "s" or "?"; given alone it labels one edge, and with labelEdges "three" it labels all three edges meeting at the front corner. It replaces the whole label, unit included, so add the unit to the text if it should show. An empty text is a blank label, for example a space to fill in. Text with no clear place beside its edge is placed below the figure, and text longer than four lines is cut short with “…”. The text alternative still states the value.`,
      },
      unit: unitProperty,
    }),
    derivations: [],
    checks: [],
    /**
     * "A cube titled “Box” with edge length 3 cm. Its hidden edges are dashed. Three edges meeting
     * at a corner are labeled." The edge length is always stated, as written when supplied. Custom
     * label text is quoted, and the value is stated anyway (GSS-REQ-035).
     */
    // @spec GSS-REQ-023, GSS-REQ-024, GSS-REQ-025, GSS-REQ-033, GSS-REQ-034, GSS-REQ-036
    describe: (cube: Cube, provenance: Provenance) => {
      // A title that is blank once cleaned is not drawn (`titleBlock`), so it is not stated either.
      const title = cube.title === undefined ? "" : cleanText(cube.title);
      const titled = title === "" ? "" : ` titled ${quoteText(title)}`;
      const sentences = [`A cube${titled} with edge length ${stateMeasurement(cube.edgeLength, sourceOf(provenance, "edgeLength"), cube.unit)}.`];
      const shown = cubeDisplay(cube);
      sentences.push(shown.hiddenDashed ? "Its hidden edges are dashed." : "Its hidden edges are not drawn.");
      if (shown.labeled > 0) {
        const which = shown.labeled === 3 ? "Three edges meeting at a corner are" : "One edge is";
        if (shown.customText === undefined) sentences.push(`${which} labeled.`);
        else if (cleanText(shown.customText) === "") sentences.push(shown.labeled === 3 ? "The edge labels are left blank." : "The edge label is left blank.");
        else sentences.push(`${which} labeled ${quoteText(shown.customText)}.`);
      }
      return sentences.join(" ");
    },
  };
}
