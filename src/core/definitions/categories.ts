import { cleanText } from "../format";
import { createIssue, pointer } from "../issues";
import type { Issue } from "../result";
import type { SharedPropertySpec } from "./shared";
import { type DescriptionBase, type DomainCheck, type GraphType, type PropertyMap, type PropertySpec, defineProperties } from "./types";

/** The most categories a data graph may have: curriculum graphs use a handful, 50 at most (DGP Edge Cases). */
export const CATEGORY_LIMIT = 100;

/**
 * The largest magnitude of a value-scale end, and the bound each data graph puts on its values, so
 * every scale computed from them prints as a plain number in the drawing.
 */
export const VALUE_LIMIT = 1_000_000_000;

/** The most ticks a value axis may draw, the same limit as a number line's axis (NLC TICKET-001). */
export const MAX_VALUE_TICKS = 100;

/** A default scale has at most this many intervals between ticks, so tick labels stay readable. */
const DEFAULT_INTERVALS = 10;

/**
 * The finest tick interval a default scale uses. Data spanning less than this (say, every value
 * 1e-300) is drawn on a scale of this resolution, rather than one whose interval underflows to 0.
 */
const MIN_DEFAULT_INTERVAL = 1e-9;

/** Relative tolerance for whole-number tests on decimal values, so 0.3 / 0.1 counts as 3. */
const EPSILON = 1e-9;

/**
 * The `categories` list (DGP-REQ-001, DGP-REQ-003): at least one and at most `CATEGORY_LIMIT`
 * categories, drawn in the order given, each an object with a plain-text `name`. A graph type adds
 * what its categories carry beyond the name: the bar graph nests the shared `color` spec, so a
 * per-category color applies to bars only and is reported as not applying on a pictograph (DGP
 * TICKET-001 DEL-001). Every graph type lists the result in its own properties.
 */
// @spec DGP-REQ-001, DGP-REQ-003
export function categoriesProperty(elementProperties: PropertyMap = {}): PropertySpec {
  return {
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
  };
}

/** The `categories` list with names only, as the line graph and the pictograph use it. */
export const categories: PropertySpec = defineProperties({ categories: categoriesProperty() }).categories;

const scaleEnd = (term: "minimum" | "maximum", description: string) =>
  ({ term, kind: "number", required: false, min: -VALUE_LIMIT, max: VALUE_LIMIT, description }) as const;

/**
 * The data-graph terms that apply to some graph types and not others, with where each applies, as
 * for the shared presentation options: `propertiesOf` merges each into the types its `appliesTo`
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
      "The value axis's scale: its minimum, maximum and tick interval, each optional. A part that is given is used exactly and never extended, and must include every value; a part left out is chosen to fit the data, starting at zero.",
    properties: {
      minimum: scaleEnd("minimum", `The lowest value on the value axis, from ${-VALUE_LIMIT} to ${VALUE_LIMIT}.`),
      maximum: scaleEnd("maximum", `The highest value on the value axis, from ${-VALUE_LIMIT} to ${VALUE_LIMIT}; above the minimum.`),
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
} as const satisfies Readonly<Record<string, SharedPropertySpec>>);

/** A value scale as a description gives it: any part may be left out. */
export interface GivenValueScale {
  readonly minimum?: number;
  readonly maximum?: number;
  readonly tickInterval?: number;
}

/** A complete value scale: ticks at `minimum + k × tickInterval` up to `maximum`. */
export interface ValueScale {
  readonly minimum: number;
  readonly maximum: number;
  readonly tickInterval: number;
}

export interface ScaleOptions {
  /** Whether a default scale may start below zero for negative values: line graphs only (DGP-REQ-015). */
  readonly allowNegative: boolean;
}

/** `x` with the binary noise of decimal arithmetic removed (0.1 × 3 → 0.3). */
const clean = (x: number) => (x === 0 ? 0 : Number(x.toPrecision(12)));

/** Whether `x` is a whole number, allowing for decimal noise. */
const isWhole = (x: number) => Math.abs(x - Math.round(x)) <= EPSILON * Math.max(1, Math.abs(x));

/** The smallest whole number at or above `x`, allowing for decimal noise (`ceilWhole(3.0000000001)` → 3). */
const ceilWhole = (x: number) => (isWhole(x) ? Math.round(x) : Math.ceil(x));
const floorWhole = (x: number) => (isWhole(x) ? Math.round(x) : Math.floor(x));

/**
 * The smallest tick interval of the form 1, 2 or 5 × 10ⁿ that covers `span` in at most `intervals`
 * intervals. Kept here until the number line's `ticks.ts` exists to share it (DGP TICKET-001 Notes).
 */
export function niceInterval(span: number, intervals: number = DEFAULT_INTERVALS): number {
  const target = Math.max((span > 0 ? span : 1) / intervals, MIN_DEFAULT_INTERVAL);
  const magnitude = 10 ** Math.floor(Math.log10(target));
  for (const multiple of [1, 2, 5, 10]) {
    const interval = clean(multiple * magnitude);
    if (interval * (1 + EPSILON) >= target) return interval;
  }
  return clean(10 * magnitude);
}

/** The lowest and highest of `values` and zero, by a loop: never spread a caller-sized list into arguments. */
function extent(values: readonly number[]): [number, number] {
  let low = 0;
  let high = 0;
  for (const value of values) {
    if (value < low) low = value;
    if (value > high) high = value;
  }
  return [low, high];
}

/**
 * The scale a data graph draws (DGP-REQ-005, DGP-REQ-006): each part the description gives, used
 * exactly; each part left out, chosen to fit `values`. A chosen minimum is zero, or with
 * `allowNegative` and a negative value, the first tick at or below the lowest value. A chosen
 * maximum is the first tick at or above the highest value, at least one interval above the minimum.
 * A chosen interval is 1, 2 or 5 × 10ⁿ, at most ten intervals over the data's span; all-zero data
 * gives 0 to 1. With nothing given this is the default scale, which always includes every value.
 */
// @spec DGP-REQ-005, DGP-REQ-006
export function resolveValueScale(given: GivenValueScale | undefined, values: readonly number[], options: ScaleOptions): ValueScale {
  const [low, high] = extent(values);
  const floor = options.allowNegative ? low : 0;
  const from = given?.minimum ?? floor;
  const to = given?.maximum ?? high;
  const tickInterval = given?.tickInterval ?? niceInterval(to - from);
  let minimum = given?.minimum ?? (floor < 0 ? clean(floorWhole(floor / tickInterval) * tickInterval) : 0);
  // The noise tolerance must never leave a value outside a chosen end.
  if (given?.minimum === undefined && minimum > floor) minimum = clean(minimum - tickInterval);
  // With nothing above the minimum (all-zero data), the scale spans one unit, or one given interval.
  const top = high > minimum ? high : minimum + (given?.tickInterval ?? tickInterval * DEFAULT_INTERVALS);
  let maximum = given?.maximum ?? clean(minimum + Math.max(1, ceilWhole((top - minimum) / tickInterval)) * tickInterval);
  if (given?.maximum === undefined && maximum < high) maximum = clean(maximum + tickInterval);
  return { minimum, maximum, tickInterval };
}

/** A value read by a scale check: where it is, its readable term (`values[3]`), and the number. */
export interface ScaledValue {
  readonly path: string;
  readonly term: string;
  readonly value: number;
}

const SCALE = "valueScale";
const scalePath = (part: keyof GivenValueScale) => pointer(SCALE, part);
const scaleTerm = (part: keyof GivenValueScale) => `${SCALE}.${part}`;

/**
 * The value-scale checks every line and bar graph shares (DGP-REQ-007, DGP-REQ-008), on a given
 * scale and the graph's values:
 * - a tick interval of 0 or less: `tick_spacing_invalid`;
 * - a given maximum not above the minimum chosen for it: `out_of_range`;
 * - a tick interval that would draw more than `MAX_VALUE_TICKS` ticks: `too_many_ticks`, counted
 *   arithmetically, never by listing the ticks;
 * - a tick interval that does not divide the scale into whole intervals: `tick_interval_not_dividing`;
 * - each value beyond a given end: `scale_excludes_value` at the value's own path.
 * A scale part left out never excludes a value, and a given scale is never extended. Work grows
 * with the number of values only. Whether a bar graph's minimum may be above zero is the bar
 * graph's own check (DGP TICKET-003).
 */
// @spec DGP-REQ-007, DGP-REQ-008
export function checkValueScale(values: readonly ScaledValue[], given: GivenValueScale | undefined, options: ScaleOptions): Issue[] {
  if (given === undefined) return [];
  const issues: Issue[] = [];
  const interval = given.tickInterval;
  const intervalValid = interval === undefined || interval > 0;
  if (!intervalValid) {
    issues.push(createIssue("tick_spacing_invalid", scalePath("tickInterval"), { term: scaleTerm("tickInterval"), got: interval }));
  }
  const usable: GivenValueScale = intervalValid ? given : { minimum: given.minimum, maximum: given.maximum };
  const scale = resolveValueScale(
    usable,
    values.map((v) => v.value),
    options,
  );
  if (!(scale.maximum > scale.minimum)) {
    // Only a given maximum against a chosen minimum: two given ends are ordered in stage 2.
    issues.push(
      createIssue("out_of_range", scalePath("maximum"), {
        term: scaleTerm("maximum"),
        got: scale.maximum,
        range: { min: scale.minimum, exclusiveMin: true },
      }),
    );
    return issues;
  }
  if (interval !== undefined && intervalValid) {
    const intervals = (scale.maximum - scale.minimum) / interval;
    const tickCount = floorWhole(intervals) + 1;
    if (tickCount > MAX_VALUE_TICKS) {
      issues.push(
        createIssue("too_many_ticks", scalePath("tickInterval"), {
          term: scaleTerm("tickInterval"),
          tickCount: Number.isFinite(tickCount) ? tickCount : Number.MAX_SAFE_INTEGER,
          maxTicks: MAX_VALUE_TICKS,
          fittingSpacing: niceInterval(scale.maximum - scale.minimum, MAX_VALUE_TICKS - 1),
        }),
      );
    } else if (!isWhole(intervals)) {
      issues.push(createIssue("tick_interval_not_dividing", scalePath("tickInterval"), { term: scaleTerm("tickInterval"), got: interval }));
    }
  }
  for (const { path, term, value } of values) {
    const below = given.minimum !== undefined && value < given.minimum;
    const above = given.maximum !== undefined && value > given.maximum;
    if (below || above) {
      issues.push(createIssue("scale_excludes_value", path, { term, got: value, range: { min: scale.minimum, max: scale.maximum } }));
    }
  }
  return issues;
}

/** A category as a validated description holds it; a category that failed stage 2 is `null`. */
type CategoryEntry = { readonly name?: unknown } | null;

/**
 * The category checks every data graph shares (DGP-REQ-001, DGP Edge Cases): an empty list is
 * reported as `missing_property` ("at least one category is required"), and each name that repeats
 * an earlier one, compared as drawn (cleaned of hidden characters), as `duplicate_name` at the later
 * category, naming the first. Work grows with the number of categories only.
 */
// @spec DGP-REQ-001
export function checkCategories(list: readonly CategoryEntry[], graphType: GraphType): Issue[] {
  if (list.length === 0) return [createIssue("missing_property", pointer("categories"), { term: "categories", graphType })];
  const issues: Issue[] = [];
  const firstWithName = new Map<string, number>();
  list.forEach((category, index) => {
    if (category === null || typeof category.name !== "string") return;
    const drawn = cleanText(category.name);
    const first = firstWithName.get(drawn);
    if (first === undefined) {
      firstWithName.set(drawn, index);
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
  inputs: ["categories", "categories/*/name"],
  check: (description: DescriptionBase) => checkCategories(description["categories"] as readonly CategoryEntry[], description.type),
};
