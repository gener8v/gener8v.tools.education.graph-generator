import { cleanText, formatList, quoteText, sourceOf, stateMeasurement } from "../format";
import { createIssue, pointer } from "../issues";
import type { Provenance } from "../result";
import { type GivenValueScale, checkValueScale, tickIntervalCheck } from "../value-scale";
import {
  CATEGORY_LIMIT,
  ORIENTATION_DESCRIPTION,
  VALUES_DESCRIPTION,
  VALUE_LIMIT,
  categoriesCheck,
  categoriesProperty,
  valuesPerCategoryCheck,
} from "./categories";
import { sharedProperties } from "./shared";
import { type DescriptionBase, type DomainCheck, type GraphTypeDefinition, defineProperties } from "./types";

/** A normalized bar-graph description. */
export interface BarGraph extends DescriptionBase {
  readonly type: "bar-graph";
  /** Each category, with an optional color for its bar (a resolved `#rrggbb`). */
  readonly categories: ReadonlyArray<{ readonly name: string; readonly color?: string }>;
  readonly values: readonly number[];
  readonly orientation?: "vertical" | "horizontal";
  /** The color of every bar without its own (a resolved `#rrggbb`). */
  readonly barColor?: string;
  readonly showValues?: boolean;
  readonly valueScale?: GivenValueScale;
  readonly categoryAxisLabel?: string;
  readonly valueAxisLabel?: string;
  readonly title?: string;
}

/**
 * The value-scale checks over the values (DGP-REQ-007, DGP-REQ-008): a given scale includes every
 * value, and one too fine to draw is reported. Bars never go below zero (DGP-REQ-021), so a chosen
 * minimum is zero.
 */
// @spec DGP-REQ-021
const valueScaleCheck: DomainCheck<BarGraph> = {
  name: "every value fits the value scale",
  inputs: ["valueScale/minimum", "valueScale/maximum", "valueScale/tickInterval", "values/*"],
  check: (g) =>
    checkValueScale(
      g.values.map((value, i) => ({ path: pointer("values", i), term: `values[${i}]`, value })),
      g.valueScale,
      { allowNegative: false },
    ),
};

/**
 * A given minimum above zero (DGP Edge Cases): bars must start at zero to be faithful, so their
 * lengths stay in proportion to their values (DGP-REQ-036).
 */
// @spec DGP-REQ-036
const scaleStartsAtZeroCheck: DomainCheck<BarGraph> = {
  name: "the value scale starts at or below zero",
  inputs: ["valueScale/minimum"],
  check: (g) => {
    const minimum = g.valueScale?.minimum;
    if (minimum === undefined || !(minimum > 0)) return [];
    return [createIssue("out_of_range", pointer("valueScale", "minimum"), { term: "valueScale.minimum", got: minimum, range: { max: 0 } })];
  },
};

/**
 * The bar graph (DGP-REQ-017..022, DGP-REQ-036): one bar per category, upright (the default) or
 * across, its length in exact proportion to its value.
 */
// @spec DGP-REQ-004, DGP-REQ-017, DGP-REQ-018, DGP-REQ-019, DGP-REQ-020, DGP-REQ-021
export const barGraph: GraphTypeDefinition<BarGraph> = /* @__PURE__ */ defineBarGraph();

/**
 * Builds the bar-graph definition. A function marked free of side effects, so a bundle that never
 * reads the definition drops it, as the other types' are dropped (DGP TICKET-005 DEL-002).
 */
/* @__NO_SIDE_EFFECTS__ */
function defineBarGraph(): GraphTypeDefinition<BarGraph> {
  return {
    type: "bar-graph",
    title: "Bar graph",
    description: `A bar graph: one bar per category, upright (the default) or across, its length in exact proportion to the category's value, from zero. Values are 0 or more. At most ${CATEGORY_LIMIT} categories.`,
    properties: defineProperties({
      // The shared color, nested in each category, colors that category's bar (DGP-REQ-019).
      categories: categoriesProperty({ color: sharedProperties.color }),
      values: {
        term: "values",
        kind: "array",
        required: true,
        maxItems: CATEGORY_LIMIT,
        description: VALUES_DESCRIPTION,
        items: { kind: "number", min: 0, max: VALUE_LIMIT, description: `A category's value, its bar's length: from 0 to ${VALUE_LIMIT}.` },
      },
      // @spec DGP-REQ-018
      orientation: {
        term: "orientation",
        kind: "enum",
        required: false,
        values: ["vertical", "horizontal"],
        valueDescriptions: {
          vertical: "Upright bars rising from the value axis, names below (the default).",
          horizontal: "Bars across, growing to the right, names on the left.",
        },
        description: ORIENTATION_DESCRIPTION,
      },
      // @spec DGP-REQ-019
      barColor: {
        term: "barColor",
        kind: "color",
        required: false,
        description: "The color of every bar, unless a category gives its own: a color name or a hex code such as #0072b2.",
      },
      // @spec DGP-REQ-020
      showValues: {
        term: "showValues",
        kind: "boolean",
        required: false,
        description: "Whether to write each bar's value beside it, exactly as given; a zero bar shows 0.",
      },
    }),
    derivations: [],
    checks: [categoriesCheck, valuesPerCategoryCheck(), tickIntervalCheck, valueScaleCheck, scaleStartsAtZeroCheck],
    // A top-level color belongs on a category, or is barColor (DGP TICKET-002 code review CR-003).
    elementsHint: "each category, or use barColor for every bar",
    /**
     * "A bar graph titled “Pets”. The category axis is labeled “Pet”. The value axis is labeled
     * “Count”. “Cats” is 7, “Dogs” is 4.5 and “Fish” is 0." Caller text is quoted, values are stated
     * as supplied (DGP-REQ-004).
     */
    // @spec DGP-REQ-004
    describe: (g: BarGraph, provenance: Provenance) => {
      const title = g.title === undefined ? "" : cleanText(g.title);
      const sentences = [`A bar graph${title === "" ? "" : ` titled ${quoteText(title)}`}.`];
      for (const [term, axis] of [
        ["categoryAxisLabel", "category"],
        ["valueAxisLabel", "value"],
      ] as const) {
        const label = g[term] === undefined ? "" : cleanText(g[term]);
        if (label !== "") sentences.push(`The ${axis} axis is labeled ${quoteText(label)}.`);
      }
      const entries: string[] = [];
      g.categories.forEach((category, i) => {
        const value = g.values[i];
        if (value !== undefined) entries.push(`${quoteText(category.name)} is ${stateMeasurement(value, sourceOf(provenance, `values/${i}`))}`);
      });
      sentences.push(`${formatList(entries)}.`);
      return sentences.join(" ");
    },
  };
}
