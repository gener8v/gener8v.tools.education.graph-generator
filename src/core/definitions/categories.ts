import { cleanText, quoteText } from "../format";
import { createIssue, pointer } from "../issues";
import type { Issue } from "../result";
import { MAX_VALUE_TICKS, VALUE_LIMIT } from "../value-scale";
import type { ScopedPropertySpec } from "./shared";
import { ALWAYS_RUNS, type DescriptionBase, type DomainCheck, type GraphType, type PropertyMap, type PropertySpec, defineProperties } from "./types";

// The value scale's arithmetic and checks live in `src/core/value-scale.ts` (quality review QR-005);
// they are re-exported here, where DGP TICKET-002, TICKET-003 and TICKET-005 expect them.
export {
  type GivenValueScale,
  MAX_VALUE_TICKS,
  type ScaleOptions,
  type ScaledValue,
  VALUE_LIMIT,
  type ValueScale,
  checkTickInterval,
  checkValueScale,
  niceInterval,
  resolveValueScale,
  tickIntervalCheck,
  valueTicks,
} from "../value-scale";

/** The most categories a data graph may have: curriculum graphs use a handful, 50 at most (DGP Edge Cases). */
export const CATEGORY_LIMIT = 100;

/**
 * The most characters a category name may have. Provisional, pending the Product Owner's
 * caller-text length decision (GSS TICKET-002 SEC-002): names are drawn whole, so an unbounded
 * name let a valid description render millions of text nodes (DGP TICKET-005 security review
 * SEC-001). Curriculum category names are a few words.
 */
export const CATEGORY_NAME_LIMIT = 200;

/**
 * The one definition of the `values` term, which the pictograph, each line-graph series and the bar
 * graph share: a term has one definition in the vocabulary (GSV-REQ-012). What a value means for the
 * type goes in its item's description.
 */
export const VALUES_DESCRIPTION = "One value per category, in the same order as the categories.";

/**
 * The text alternative's sentences for a data graph's axis labels, in order, each left out when its
 * label is absent or blank: "The category axis is labeled “Day”." (DGP-REQ-004; the line graph and
 * the bar graph alike).
 */
export function axisLabelSentences(g: { readonly categoryAxisLabel?: string; readonly valueAxisLabel?: string }): string[] {
  const sentences: string[] = [];
  for (const [label, axis] of [
    [g.categoryAxisLabel, "category"],
    [g.valueAxisLabel, "value"],
  ] as const) {
    const cleaned = label === undefined ? "" : cleanText(label);
    if (cleaned !== "") sentences.push(`The ${axis} axis is labeled ${quoteText(cleaned)}.`);
  }
  return sentences;
}

/**
 * The one definition of the `orientation` term, shared by the pictograph and the bar graph, whose
 * defaults differ: each type's value descriptions say which is its default (DGP TICKET-003).
 */
export const ORIENTATION_DESCRIPTION =
  "Which way the categories' rows, columns or bars run: horizontal or vertical. The default is horizontal for a pictograph and vertical for a bar graph.";

/**
 * The `categories` list (DGP-REQ-001, DGP-REQ-003): at least one and at most `CATEGORY_LIMIT`
 * categories, drawn in the order given, each an object with a plain-text `name`. A graph type adds
 * what its categories carry beyond the name: the bar graph nests the shared `color` spec, so a
 * per-category color applies to bars only and is reported as not applying on a pictograph (DGP
 * TICKET-001 DEL-001). Every graph type lists the result in its own properties.
 */
// @spec DGP-REQ-001, DGP-REQ-003
export function categoriesProperty(elementProperties: PropertyMap = {}): PropertySpec {
  // Returned defined (frozen, no prototypes), so a definition can list it as it is and an unused
  // call can be dropped by a bundler (quality review QR-008).
  return defineProperties({
    categories: {
      term: "categories",
      kind: "array",
      required: true,
      maxItems: CATEGORY_LIMIT,
      description: `The categories, drawn in the order given: at least 1 and at most ${CATEGORY_LIMIT}, each with a different name.`,
      items: {
        kind: "object",
        description: "One category.",
        properties: {
          name: {
            term: "name",
            kind: "string",
            required: true,
            maxLength: CATEGORY_NAME_LIMIT,
            description: `The category's name, as plain text, at most ${CATEGORY_NAME_LIMIT} characters. A long name wraps onto more lines; it is never cut short.`,
          },
          ...elementProperties,
        },
      },
    },
  }).categories;
}

/** The `categories` list with names only, as the line graph and the pictograph use it. */
export const categories: PropertySpec = /* @__PURE__ */ categoriesProperty();

const scaleEnd = (term: "minimum" | "maximum", description: string) =>
  ({ term, kind: "number", required: false, min: -VALUE_LIMIT, max: VALUE_LIMIT, description }) as const;

/**
 * The data-graph terms that apply to some graph types and not others, with where each applies, as
 * for the shared presentation options (both are scoped terms, `ScopedPropertySpec`): `propertiesOf` merges each into the types its `appliesTo`
 * names, and the validator reports it as not applying anywhere else (DGP-REQ-002, DGP-REQ-005).
 * The category-axis and value-axis labels are shared presentation options (`shared.ts`).
 */
// @spec DGP-REQ-002, DGP-REQ-005
export const dataGraphProperties = defineProperties({
  valueUnitLabel: {
    term: "valueUnitLabel",
    kind: "string",
    required: false,
    // DGP TICKET-001 DEL-002: an empty label is no label, so the key says "units".
    emptyIsAbsent: true,
    description:
      'What one unit of value counts, as plain text, such as "students"; the key names the picture, as in "each apple = 2 students". Left out, empty or blank, it says "units". In the drawing, a key longer than two lines is cut short with “…”; the text alternative states the label whole.',
    appliesTo: ["pictograph"],
    elementsOf: [],
  },
  valueScale: {
    term: "valueScale",
    kind: "object",
    required: false,
    description:
      "The value axis's scale: its minimum, maximum and tick interval, each optional. A part that is given is used exactly and never extended, and must include every value; a part left out is chosen to fit the data: the minimum is zero, or lower for a line graph's negative values, and the axis ends on a tick.",
    properties: {
      minimum: scaleEnd("minimum", `The lowest value on the value axis, from ${-VALUE_LIMIT} to ${VALUE_LIMIT}: 0, or at least 0.000000001 in size.`),
      maximum: scaleEnd(
        "maximum",
        `The highest value on the value axis, from ${-VALUE_LIMIT} to ${VALUE_LIMIT}: 0, or at least 0.000000001 in size; above the minimum by at least a billionth of the larger end's size.`,
      ),
      tickInterval: {
        term: "tickInterval",
        kind: "number",
        required: false,
        max: 2 * VALUE_LIMIT,
        description: `The distance between neighbouring ticks on the value axis: greater than 0, dividing the scale into whole intervals, with at most ${MAX_VALUE_TICKS} ticks.`,
      },
    },
    ordered: [["minimum", "maximum"]],
    appliesTo: ["line-graph", "bar-graph"],
    elementsOf: [],
  },
} as const satisfies Readonly<Record<string, ScopedPropertySpec>>);

/**
 * A category as a validated description holds it; a category that failed stage 2 is `null`. Through
 * the validator a failed category skips the check (it touches `categories/*\/name`), so `null`
 * reaches here only from a direct call.
 */
type CategoryEntry = { readonly name?: unknown } | null;

/**
 * A name as it is compared for duplicates: cleaned like drawn text, in Unicode NFC form (a composed
 * and a decomposed "é" are one letter), with default-ignorable characters (joiners, variation
 * selectors, Hangul fillers) removed and runs of spaces collapsed, so names that look the same are
 * the same. Letter case still differs, and lookalike letters from other scripts (Latin "o",
 * Cyrillic "о") are not caught (security review SEC-005).
 */
export function nameKey(name: string): string {
  return cleanText(name)
    .normalize("NFC")
    .replace(/\p{Default_Ignorable_Code_Point}/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

/**
 * The category checks every data graph shares (DGP-REQ-001, DGP Edge Cases): an empty list is
 * reported as `missing_property`, the required list being absent in effect ("categories is required
 * for a bar-graph; add it."), and each name that repeats
 * an earlier one, compared as `nameKey` (as the names look), as `duplicate_name` at the later
 * category, naming the first. Work grows with the number of categories only.
 */
// @spec DGP-REQ-001
export function checkCategories(list: readonly CategoryEntry[], graphType: GraphType): Issue[] {
  if (list.length === 0) return [createIssue("missing_property", pointer("categories"), { term: "categories", graphType })];
  const issues: Issue[] = [];
  const firstWithName = new Map<string, number>();
  list.forEach((category, index) => {
    if (category === null || typeof category.name !== "string") return;
    const key = nameKey(category.name);
    const first = firstWithName.get(key);
    if (first === undefined) {
      firstWithName.set(key, index);
      return;
    }
    issues.push(
      createIssue("duplicate_name", pointer("categories", index, "name"), {
        term: `categories[${index}].name`,
        got: category.name,
        conflicts: [pointer("categories", first, "name")],
        conflictTerms: [`categories[${first}].name`],
      }),
    );
  });
  return issues;
}

/** The category checks as a domain check, for a data graph's `checks` list. */
export const categoriesCheck: DomainCheck = {
  name: "categories are given, each with a different name",
  // Names only: a failure elsewhere in a category, such as an unknown bar color, never hides a
  // duplicate name (code review CR-002). With no list at all the check does not run.
  inputs: ["categories/*/name"],
  check: (description: DescriptionBase) => checkCategories(description["categories"] as readonly CategoryEntry[], description.type),
};

/**
 * The check that a top-level list, `values` by default, has one entry per category, reporting
 * `series_length_mismatch` at the list (DGP-REQ-026; the bar graph's TICKET-003 the same). It reads
 * only the two lists' lengths, which a failed element does not change, so it always runs and a bad
 * value or name never hides a mismatch (code review CR-002; quality review QR-004). A list that
 * failed whole, or is missing, is absent, and the check stays silent.
 */
// @spec DGP-REQ-026
/* @__NO_SIDE_EFFECTS__ */
export function valuesPerCategoryCheck(term = "values"): DomainCheck {
  return {
    name: term === "values" ? "one value per category" : `one value per category in ${term}`,
    inputs: ALWAYS_RUNS,
    check: (description: DescriptionBase) => {
      const list: unknown = description[term];
      const names: unknown = description["categories"];
      // No categories is the categories check's issue; a length against none would follow from it
      // (AD-004; quality review QR-005 on DGP TICKET-002).
      if (!Array.isArray(list) || !Array.isArray(names) || names.length === 0 || list.length === names.length) return [];
      return [createIssue("series_length_mismatch", pointer(term), { term, valueCount: list.length, categoryCount: names.length })];
    },
  };
}

/**
 * The check that a line graph's series each hold one value per category (DGP-REQ-016): a series
 * whose `values` length differs, an empty list included, is reported as `series_length_mismatch`
 * at `/series/<i>/values`, and an empty `series` list as `missing_property` at `/series`, as an
 * absent one already is (DGP Edge Cases: "at least one series is required"). Like `valuesPerCategoryCheck`, it
 * reads only lengths, so it always runs: a failed series reaches it as `null` and is skipped, and a
 * failed value inside a series keeps its list's length.
 */
// @spec DGP-REQ-010, DGP-REQ-016
/* @__NO_SIDE_EFFECTS__ */
export function seriesValuesPerCategoryCheck(): DomainCheck {
  return {
    name: "one value per category in every series",
    inputs: ALWAYS_RUNS,
    check: (description: DescriptionBase) => {
      const series: unknown = description["series"];
      const names: unknown = description["categories"];
      if (series === undefined) return [];
      if (Array.isArray(series) && series.length === 0) {
        return [createIssue("missing_property", pointer("series"), { term: "series", graphType: description.type })];
      }
      // No categories is the categories check's issue; lengths against none would follow from it.
      if (!Array.isArray(series) || !Array.isArray(names) || names.length === 0) return [];
      const issues: Issue[] = [];
      series.forEach((entry: unknown, index) => {
        const values: unknown = entry !== null && typeof entry === "object" ? (entry as { values?: unknown }).values : undefined;
        if (!Array.isArray(values) || values.length === names.length) return;
        issues.push(
          createIssue("series_length_mismatch", pointer("series", index, "values"), {
            term: `series[${index}].values`,
            valueCount: values.length,
            categoryCount: names.length,
          }),
        );
      });
      return issues;
    },
  };
}
