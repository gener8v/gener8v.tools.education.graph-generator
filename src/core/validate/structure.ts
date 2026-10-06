import { type Registry, propertiesOf } from "../definitions/index";
import { sharedProperties } from "../definitions/shared";
import { type GraphType, type PropertyMap, type ValueSpec, propertySpec } from "../definitions/types";
import { findUnsafeTextChar } from "../format";
import { asTerms, createIssue, pointer } from "../issues";
import type { Issue, Provenance } from "../result";
import { namedColors, resolveColor } from "../style";
import { type ObjectContents, isPlainObject, readList, readObject } from "./json";
import { rangeBroken, rangeOf } from "./numbers";
import { closestTerm } from "./suggest";

/**
 * The most values one description may hold: every property and list element counts, known or
 * not. A larger description is reported once as `too_large` and not checked further (Product
 * Owner decision 2026-10-06, GSV TICKET-003 security review SEC-001).
 */
export const DESCRIPTION_VALUE_LIMIT = 10_000;

/** The outcome of checking one value (quality review QR-001). */
type Outcome =
  | { kind: "passed"; value: unknown }
  /** Valid and stands for nothing, such as an empty label (GSV Edge Cases). */
  | { kind: "omitted" }
  /** Reported; nothing further is checked on it (AD-004: no cascades). */
  | { kind: "failed" };

const FAILED: Outcome = { kind: "failed" };
const OMITTED: Outcome = { kind: "omitted" };

export interface StructureResult {
  issues: Issue[];
  /**
   * The values that passed, built on null prototypes: known properties only, empty presentation
   * text dropped, colors resolved. A failed value is left out; a failed list element stays as
   * `null`, so later positions keep their index.
   */
  description: Record<string, unknown>;
  /** Every kept leaf value, by JSON Pointer, marked as supplied. */
  provenance: Provenance;
  /**
   * The JSON Pointer of every value that did not pass: one that failed its own check (including
   * the upper end of an `ordered` pair), a required value that is missing, and a property that is
   * not plain data. Unknown keys are not listed: they never reach `description`. Later stages skip
   * anything these touch (AD-004).
   */
  failed: ReadonlySet<string>;
}

interface Walk {
  graphType: GraphType;
  issues: Issue[];
  provenance: Provenance;
  failed: Set<string>;
  /** Values visited so far, against `DESCRIPTION_VALUE_LIMIT`. */
  count: number;
}

/** Thrown, and caught by `checkStructure`, when a description passes its value limit. */
class TooLarge extends Error {}

/** Where a value is: its JSON Pointer segments and its readable term, such as `points[2].x`. */
interface Place {
  segments: Array<string | number>;
  term: string;
}

const child = (place: Place, key: string): Place => ({
  segments: [...place.segments, key],
  term: place.term === "" ? key : `${place.term}.${key}`,
});
const item = (place: Place, index: number): Place => ({
  segments: [...place.segments, index],
  term: `${place.term}[${index}]`,
});

const COLOR_NAMES = asTerms(Object.keys(namedColors));
const PLAIN_TEXT = "plain text without control, line-break, text-direction or invisible characters";
const PLAIN_DATA = "plain JSON data";

const emptyRecord = (): Record<string, unknown> => Object.create(null) as Record<string, unknown>;

function count(walk: Walk, values: number): void {
  walk.count += values;
  if (walk.count > DESCRIPTION_VALUE_LIMIT) throw new TooLarge();
}

/** Check one value against its spec. */
// @spec GSV-REQ-005, GSV-REQ-021, GSV-REQ-022, GSV-REQ-043
function checkValue(spec: ValueSpec, value: unknown, place: Place, walk: Walk, presentation: boolean): Outcome {
  const path = pointer(...place.segments);
  const fail = (issue: Issue): Outcome => {
    walk.issues.push(issue);
    walk.failed.add(path);
    return FAILED;
  };
  const wrongKind = (expected: string) => fail(createIssue("wrong_kind", path, { term: place.term, got: value, expected }));
  const pass = (normalized: unknown): Outcome => {
    walk.provenance[path] = "supplied";
    return { kind: "passed", value: normalized };
  };

  switch (spec.kind) {
    case "number":
    case "integer": {
      // Finite numbers only: NaN, Infinity and numeric strings such as "5" are never coerced.
      if (typeof value !== "number" || !Number.isFinite(value)) return wrongKind(spec.kind === "integer" ? "a whole number" : "a number");
      if (spec.kind === "integer" && !Number.isInteger(value)) return wrongKind("a whole number");
      const range = rangeOf(spec);
      if (rangeBroken(value, range) !== undefined) return fail(createIssue("out_of_range", path, { term: place.term, got: value, range }));
      return pass(value);
    }
    case "string": {
      if (typeof value !== "string") return wrongKind("plain text");
      if (findUnsafeTextChar(value) !== -1) return wrongKind(PLAIN_TEXT);
      // An empty label or title is no label (GSV Edge Cases); this applies to shared
      // presentation options only (code review CR-007).
      if (value === "" && presentation) return OMITTED;
      return pass(value);
    }
    case "boolean":
      return typeof value === "boolean" ? pass(value) : wrongKind("true or false");
    case "color": {
      if (typeof value !== "string") return wrongKind("a color name or a hex code such as #0072b2");
      const hex = resolveColor(value);
      if (hex === undefined) return fail(createIssue("unknown_color", path, { term: place.term, got: value, allowed: COLOR_NAMES }));
      return pass(hex);
    }
    case "enum":
      return typeof value === "string" && (spec.values as readonly string[]).includes(value)
        ? pass(value)
        : wrongKind(`one of: ${spec.values.join(", ")}`);
    case "object": {
      const contents = isPlainObject(value) ? readObject(value) : undefined;
      if (contents === undefined) return wrongKind("an object");
      const normalized = checkMap(contents, spec.properties, place, walk);
      for (const [lower, upper] of spec.ordered ?? []) {
        const [low, high] = [normalized[lower], normalized[upper]];
        if (typeof low === "number" && typeof high === "number" && !(low < high)) {
          const at = child(place, upper);
          const upperPath = pointer(...at.segments);
          walk.issues.push(createIssue("out_of_range", upperPath, { term: at.term, got: high, range: { min: low, exclusiveMin: true } }));
          // The upper value failed: it leaves the result like any other failed value.
          walk.failed.add(upperPath);
          delete normalized[upper];
          delete walk.provenance[upperPath];
        }
      }
      return { kind: "passed", value: normalized };
    }
    case "array": {
      if (!Array.isArray(value)) return wrongKind("a list");
      let length: number;
      try {
        length = value.length;
      } catch {
        return wrongKind("a list");
      }
      // An over-long list is reported once and its elements are not checked.
      if (length > spec.maxItems) {
        return fail(createIssue("too_large", path, { term: place.term, limit: spec.maxItems, unit: "items", count: length }));
      }
      count(walk, length);
      const elements = readList(value);
      if (elements === undefined) return wrongKind("a list");
      const normalized = elements.map((element, index) => {
        const outcome = checkValue(spec.items, element, item(place, index), walk, false);
        return outcome.kind === "passed" ? outcome.value : null;
      });
      return { kind: "passed", value: normalized };
    }
  }
}

/** Whether a shared option applies anywhere in this graph type: at the top level or on its elements. */
function appliesToType(key: string, graphType: GraphType): boolean | undefined {
  const shared = propertySpec(sharedProperties, key);
  if (shared === undefined) return undefined;
  const option = shared as (typeof sharedProperties)[keyof typeof sharedProperties];
  return (option.appliesTo as readonly GraphType[]).includes(graphType) || (option.elementsOf as readonly GraphType[]).includes(graphType);
}

/**
 * Check every key of an object against its property map: unknown and inapplicable keys, each
 * value's kind and range, and every missing required property (GSV-REQ-017).
 */
// @spec GSV-REQ-017, GSV-REQ-018, GSV-REQ-019, GSV-REQ-020, GSV-REQ-041
function checkMap(contents: ObjectContents, properties: PropertyMap, place: Place, walk: Walk): Record<string, unknown> {
  const normalized = emptyRecord();
  const atTop = place.segments.length === 0;
  count(walk, contents.values.size + contents.opaque.length);
  for (const key of contents.opaque) {
    if (atTop && (key === "type" || key === "version")) continue;
    const at = child(place, key);
    const path = pointer(...at.segments);
    walk.issues.push(createIssue("wrong_kind", path, { term: at.term, got: undefined, expected: PLAIN_DATA }));
    walk.failed.add(path);
  }
  for (const [key, element] of contents.values) {
    if (atTop && (key === "type" || key === "version")) continue;
    // An explicit undefined disappears in JSON, so it counts as absent.
    if (element === undefined) continue;
    const at = child(place, key);
    const path = pointer(...at.segments);
    const spec = propertySpec(properties, key);
    if (spec === undefined) {
      // Not recorded in `failed`: an unknown key never reaches the description, so no later
      // check can read it (code review CR-003 on TICKET-004).
      if (appliesToType(key, walk.graphType) === false) {
        // A presentation option this graph type has nowhere (GSV-REQ-041).
        walk.issues.push(createIssue("inapplicable_property", path, { term: at.term, graphType: walk.graphType }));
      } else {
        // Not a term here; a shared option that applies elsewhere in this type is still unknown
        // at this position, with the terms that are valid here (quality review QR-009).
        const allowed = asTerms(Object.keys(properties));
        const suggestion = closestTerm(key, allowed);
        walk.issues.push(
          createIssue("unknown_property", path, {
            term: at.term,
            graphType: walk.graphType,
            allowed,
            ...(suggestion === undefined ? {} : { suggestion }),
          }),
        );
      }
      continue;
    }
    // Keys are only ever vocabulary terms (camel case), so assigning them is safe.
    const outcome = checkValue(spec, element, at, walk, spec.presentation !== undefined);
    if (outcome.kind === "passed") normalized[spec.term] = outcome.value;
  }
  for (const spec of Object.values(properties)) {
    // Presence is decided from the properties actually read (security review SEC-004).
    if (spec.required && contents.values.get(spec.term) === undefined && !contents.opaque.includes(spec.term)) {
      const at = child(place, spec.term);
      const path = pointer(...at.segments);
      walk.issues.push(createIssue("missing_property", path, { term: at.term, graphType: walk.graphType }));
      // A required value that is missing did not pass, so checks that read it are skipped
      // (quality review QR-002, security review SEC-003 on TICKET-004).
      walk.failed.add(path);
    }
  }
  return normalized;
}

/**
 * Stage 2 (AD-004): check every property of a description whose envelope passed, against the
 * terms its graph type accepts (`propertiesOf`). Collects every issue; a value that fails is not
 * checked further. A description over `DESCRIPTION_VALUE_LIMIT` values yields one `too_large`
 * issue instead.
 */
// @spec GSV-REQ-017, GSV-REQ-018, GSV-REQ-019, GSV-REQ-021, GSV-REQ-022, GSV-REQ-041
export function checkStructure(
  contents: ObjectContents,
  type: GraphType,
  version: number | undefined,
  registry: Registry,
): StructureResult {
  const walk: Walk = { graphType: type, issues: [], provenance: emptyRecord() as Provenance, failed: new Set(), count: 0 };
  let normalized: Record<string, unknown>;
  try {
    normalized = checkMap(contents, propertiesOf(type, registry), { segments: [], term: "" }, walk);
  } catch (error) {
    if (!(error instanceof TooLarge)) throw error;
    const issue = createIssue("too_large", pointer(), { term: "description", limit: DESCRIPTION_VALUE_LIMIT, unit: "values" });
    return { issues: [issue], description: emptyRecord(), provenance: emptyRecord() as Provenance, failed: new Set([pointer()]) };
  }
  const description = emptyRecord();
  description["type"] = type;
  if (version !== undefined) description["version"] = version;
  Object.assign(description, normalized);
  return { issues: walk.issues, description, provenance: walk.provenance, failed: walk.failed };
}
