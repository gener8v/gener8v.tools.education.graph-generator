import { getImageNames, imageDescriptions, type ImageName } from "../../images/index";
import { cleanText, formatList, quoteText, sourceOf, stateMeasurement } from "../format";
import { createIssue, pointer } from "../issues";
import type { Provenance } from "../result";
import { intervalsIn } from "../value-scale";
import { CATEGORY_LIMIT, VALUE_LIMIT, categories, categoriesCheck } from "./categories";
import { type DescriptionBase, type DomainCheck, type GraphTypeDefinition, defineProperties } from "./types";

/** A normalized pictograph description. */
export interface Pictograph extends DescriptionBase {
  readonly type: "pictograph";
  readonly categories: ReadonlyArray<{ readonly name: string }>;
  readonly values: readonly number[];
  readonly unitImage: ImageName;
  readonly unitValue: number;
  readonly orientation?: "horizontal" | "vertical";
  readonly valueUnitLabel?: string;
  readonly title?: string;
}

/**
 * The most images a pictograph may draw in total, whole and partial. Provisional, pending the
 * Product Owner's limit under DGP OQ-004: one image costs up to 9 Scene nodes, so an unbounded count
 * would let a short description exhaust a server (DGP TICKET-004 security review SEC-003; DEL-001).
 * 400, so even one category's row or column keeps its pictures at least half a drawing unit wide,
 * the size at which a 0.01-unit rounding stays within DGP-NFR-002's 2% (code review CR-001).
 */
export const PICTOGRAPH_IMAGE_LIMIT = 400;

/** What each category's value draws: whole images, then the remaining fraction of one (0 when none). */
export interface ImageCount {
  readonly whole: number;
  readonly fraction: number;
}

/**
 * The images for one value (DGP-REQ-026, DGP-REQ-028): ⌊value ÷ unitValue⌋ whole images and the
 * remaining fraction of one. The count allows for decimal noise, so 0.3 ÷ 0.1 is exactly 3 whole
 * images (`intervalsIn`, shared with the value scale). Computed, never enumerated.
 */
// @spec DGP-REQ-026, DGP-REQ-028
export function imageCount(value: number, unitValue: number): ImageCount {
  if (!(value > 0)) return { whole: 0, fraction: 0 };
  const { count, exact } = intervalsIn(value, unitValue);
  if (exact) return { whole: count, fraction: 0 };
  const fraction = value / unitValue - count;
  return { whole: count, fraction: fraction > 0 ? Math.min(fraction, 1) : 0 };
}

/** How many images a value draws: whole images plus one for a remainder. */
const imagesDrawn = ({ whole, fraction }: ImageCount) => whole + (fraction > 0 ? 1 : 0);

const UNITS = "units";

/**
 * What one unit is called, in the key and the text alternative alike: the value-unit label cleaned
 * of hidden characters, or "units" when it is missing or blank (DGP Pictograph Units; code review
 * CR-003).
 */
// @spec DGP-REQ-027
export function unitLabelOf(p: Pick<Pictograph, "valueUnitLabel">): string {
  const label = p.valueUnitLabel === undefined ? "" : cleanText(p.valueUnitLabel);
  return label === "" ? UNITS : label;
}

/**
 * The pictograph (DGP-REQ-023..032, DGP-REQ-037): one row (or column) per category built from
 * repeated copies of one published image, each standing for `unitValue` units, with a key.
 */
// @spec DGP-REQ-004, DGP-REQ-023, DGP-REQ-024, DGP-REQ-025, DGP-REQ-026, DGP-REQ-029, DGP-REQ-030, DGP-REQ-032
export const pictograph: GraphTypeDefinition<Pictograph> = /* @__PURE__ */ definePictograph();

/**
 * Builds the pictograph definition. A function marked free of side effects, so a bundle that never
 * reads the definition (the circle's, through the definitions module) drops it and every image
 * drawing it names (DGP TICKET-004 code review CR-004; DEL-002).
 */
/* @__NO_SIDE_EFFECTS__ */
function definePictograph(): GraphTypeDefinition<Pictograph> {
  return {
    type: "pictograph",
    title: "Pictograph",
    description: `A pictograph: one row of pictures per category (or one column, upright), each picture standing for a number of units, with a key such as "each apple = 2 students". A value that is not a whole number of pictures ends in one cropped picture. At most ${CATEGORY_LIMIT} categories and ${PICTOGRAPH_IMAGE_LIMIT} pictures in all.`,
    properties: defineProperties({
      categories,
      values: {
        term: "values",
        kind: "array",
        required: true,
        maxItems: CATEGORY_LIMIT,
        description: "One value per category, in the same order: how many units the category has.",
        items: { kind: "number", min: 0, max: VALUE_LIMIT, description: `A category's value, from 0 to ${VALUE_LIMIT}.` },
      },
      // @spec DGP-REQ-024, DGP-REQ-031, DGP-REQ-035
      unitImage: {
        term: "unitImage",
        kind: "enum",
        required: true,
        // The published image set, so the validator, both schemas and the vocabulary list the same
        // names and descriptions (DGP-REQ-035; GSV TICKET-005 DEL-008).
        values: getImageNames(),
        valueDescriptions: imageDescriptions(),
        unknownCode: "unknown_image",
        description: "The picture every unit is drawn with, by name from the published image set.",
      },
      unitValue: {
        term: "unitValue",
        kind: "number",
        required: true,
        min: 0,
        exclusiveMin: true,
        max: VALUE_LIMIT,
        description: `How many units one picture stands for: greater than 0, at most ${VALUE_LIMIT}.`,
      },
      orientation: {
        term: "orientation",
        kind: "enum",
        required: false,
        values: ["horizontal", "vertical"],
        valueDescriptions: {
          horizontal: "One row of pictures per category, names on the left (the default).",
          vertical: "One upright column of pictures per category, names below.",
        },
        description: "Whether the pictures run in rows (horizontal, the default) or columns (vertical).",
      },
    }),
    derivations: [],
    checks: [
      categoriesCheck,
      {
        name: "one value per category",
        // No inputs: the check reads only the two lists' lengths, which a failed element does not
        // change (it stays as null), so a bad value or name never hides a mismatch (code review
        // CR-002). A list that failed whole, or is missing, is absent, and the check stays silent.
        inputs: [],
        // @spec DGP-REQ-026
        check: (p) => {
          const values: unknown = p.values;
          const names: unknown = p.categories;
          if (!Array.isArray(values) || !Array.isArray(names) || values.length === names.length) return [];
          return [createIssue("series_length_mismatch", pointer("values"), { term: "values", valueCount: values.length, categoryCount: names.length })];
        },
      },
      {
        name: "the pictures drawn stay within the limit",
        inputs: ["values/*", "unitValue"],
        // Counted arithmetically, value by value, never by listing pictures (DGP TICKET-004 SEC-003).
        check: (p) => {
          let total = 0;
          for (const value of p.values) total += imagesDrawn(imageCount(value, p.unitValue));
          if (!(total > PICTOGRAPH_IMAGE_LIMIT)) return [];
          const count = Number.isFinite(total) ? total : Number.MAX_SAFE_INTEGER;
          return [createIssue("too_large", pointer("values"), { term: "values", limit: PICTOGRAPH_IMAGE_LIMIT, unit: "images", count })];
        },
      } satisfies DomainCheck<Pictograph>,
    ],
    /**
     * "A pictograph titled “Pets”. Each apple stands for 2 students. “Cats”: 7 students; “Dogs”: 4
     * students." The type, the title, the image, its unit value and label, and every category with
     * its value; caller text is quoted (DGP-REQ-004).
     */
    // @spec DGP-REQ-004, DGP-REQ-027
    describe: (p: Pictograph, provenance: Provenance) => {
      const title = p.title === undefined ? "" : cleanText(p.title);
      const titled = title === "" ? "" : ` titled ${quoteText(title)}`;
      const unit = unitLabelOf(p);
      const sentences = [
        `A pictograph${titled}.`,
        `Each ${p.unitImage} stands for ${stateMeasurement(p.unitValue, sourceOf(provenance, "unitValue"), unit)}.`,
      ];
      const entries: string[] = [];
      p.categories.forEach((category, i) => {
        const value = p.values[i];
        if (value !== undefined) entries.push(`${quoteText(category.name)}: ${stateMeasurement(value, sourceOf(provenance, `values/${i}`), unit)}`);
      });
      sentences.push(`${formatList(entries)}.`);
      return sentences.join(" ");
    },
  };
}
