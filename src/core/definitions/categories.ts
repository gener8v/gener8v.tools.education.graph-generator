import { cleanText } from "../format";
import { createIssue, pointer } from "../issues";
import type { Issue } from "../result";
import { MAX_VALUE_TICKS, VALUE_LIMIT } from "../value-scale";
import type { ScopedPropertySpec } from "./shared";
import { type DescriptionBase, type DomainCheck, type GraphType, type PropertyMap, type PropertySpec, defineProperties } from "./types";

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
            description: "The category's name, as plain text. A long name wraps onto more lines; it is never cut short.",
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
      'What one unit of value counts, as plain text, such as "students"; the key reads "each ★ = 2 students". Left out or empty, the key says "units".',
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
function nameKey(name: string): string {
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
