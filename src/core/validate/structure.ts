import { propertiesOf } from "../definitions/index";
import { sharedProperties } from "../definitions/shared";
import { type GraphType, type PropertyMap, type ValueSpec, propertySpec } from "../definitions/types";
import { findUnsafeTextChar } from "../format";
import { type Terms, createIssue, pointer } from "../issues";
import type { Issue, Provenance, Range } from "../result";
import { resolveColor, namedColors } from "../style";
import { type Registry, isPlainObject } from "./envelope";
import { closestTerm } from "./suggest";

/** The value failed its own check; nothing further is checked on it (AD-004: no cascades). */
const FAILED = Symbol("failed");
/** The value is valid and stands for nothing, such as an empty label (GSV Edge Cases). */
const OMITTED = Symbol("omitted");
type Checked = unknown;

export interface StructureResult {
  issues: Issue[];
  /** The known properties that passed, with empty presentation text dropped and colors resolved. */
  description: Record<string, unknown>;
  /** Every value kept in `description`, by JSON Pointer, marked as supplied. */
  provenance: Provenance;
}

interface Walk {
  graphType: GraphType;
  issues: Issue[];
  provenance: Provenance;
}

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

const COLOR_NAMES = Object.keys(namedColors) as unknown as Terms;
const PLAIN_TEXT = "plain text without control, line-break or text-direction characters";

function asTerms(terms: readonly string[]): Terms {
  if (terms.length === 0) throw new Error("A property map with no terms cannot list allowed terms");
  return terms as unknown as Terms;
}

function rangeOf(spec: ValueSpec & { kind: "number" | "integer" }): Range {
  const range: Range = {};
  if (spec.min !== undefined) range.min = spec.min;
  if (spec.max !== undefined) range.max = spec.max;
  if (spec.exclusiveMin) range.exclusiveMin = true;
  if (spec.exclusiveMax) range.exclusiveMax = true;
  return range;
}

function outOfRange(value: number, range: Range): boolean {
  const { min, max, exclusiveMin, exclusiveMax } = range;
  if (min !== undefined && (exclusiveMin ? value <= min : value < min)) return true;
  if (max !== undefined && (exclusiveMax ? value >= max : value > max)) return true;
  return false;
}

/** Check one value against its spec; the normalized value, or FAILED or OMITTED. */
// @spec GSV-REQ-005, GSV-REQ-021, GSV-REQ-022, GSV-REQ-043
function checkValue(spec: ValueSpec, value: unknown, place: Place, walk: Walk, presentation: boolean): Checked {
  const path = pointer(...place.segments);
  const wrongKind = (expected: string) => {
    walk.issues.push(createIssue("wrong_kind", path, { term: place.term, got: value, expected }));
    return FAILED;
  };
  const supplied = (normalized: unknown) => {
    walk.provenance[path] = "supplied";
    return normalized;
  };

  switch (spec.kind) {
    case "number":
    case "integer": {
      // Finite numbers only: NaN, Infinity and numeric strings such as "5" are never coerced.
      if (typeof value !== "number" || !Number.isFinite(value)) return wrongKind(spec.kind === "integer" ? "a whole number" : "a number");
      if (spec.kind === "integer" && !Number.isInteger(value)) return wrongKind("a whole number");
      const range = rangeOf(spec);
      if (outOfRange(value, range)) {
        walk.issues.push(createIssue("out_of_range", path, { term: place.term, got: value, range }));
        return FAILED;
      }
      return supplied(value);
    }
    case "string": {
      if (typeof value !== "string") return wrongKind("plain text");
      if (findUnsafeTextChar(value) !== -1) return wrongKind(PLAIN_TEXT);
      // An empty label or title is no label (GSV Edge Cases).
      if (value === "" && presentation) return OMITTED;
      return supplied(value);
    }
    case "boolean":
      return typeof value === "boolean" ? supplied(value) : wrongKind("true or false");
    case "color": {
      if (typeof value !== "string") return wrongKind("a color name or a hex code such as #0072b2");
      const hex = resolveColor(value);
      if (hex === undefined) {
        walk.issues.push(createIssue("unknown_color", path, { term: place.term, got: value, allowed: COLOR_NAMES }));
        return FAILED;
      }
      return supplied(hex);
    }
    case "enum":
      return typeof value === "string" && (spec.values as readonly string[]).includes(value)
        ? supplied(value)
        : wrongKind(`one of: ${spec.values.join(", ")}`);
    case "object": {
      if (!isPlainObject(value)) return wrongKind("an object");
      const normalized = checkMap(value, spec.properties, place, walk);
      for (const [lower, upper] of spec.ordered ?? []) {
        const [low, high] = [normalized[lower], normalized[upper]];
        if (typeof low === "number" && typeof high === "number" && !(low < high)) {
          const at = child(place, upper);
          walk.issues.push(
            createIssue("out_of_range", pointer(...at.segments), { term: at.term, got: high, range: { min: low, exclusiveMin: true } }),
          );
        }
      }
      return normalized;
    }
    case "array": {
      // A plain list: every position holds a value and nothing else is attached. Comparing the
      // key count avoids walking the holes of a huge sparse array.
      if (!Array.isArray(value) || Object.keys(value).length !== value.length) return wrongKind("a list");
      const normalized: unknown[] = [];
      value.forEach((element: unknown, index) => {
        normalized.push(checkValue(spec.items, element, item(place, index), walk, false));
      });
      return normalized;
    }
  }
}

/**
 * Check every key of an object against its property map: unknown and inapplicable keys, each
 * value's kind and range, and every missing required property (GSV-REQ-017).
 */
// @spec GSV-REQ-017, GSV-REQ-018, GSV-REQ-019, GSV-REQ-020, GSV-REQ-041
function checkMap(value: Readonly<Record<string, unknown>>, properties: PropertyMap, place: Place, walk: Walk): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    if (place.segments.length === 0 && (key === "type" || key === "version")) continue;
    const element = value[key];
    // An explicit undefined disappears in JSON, so it counts as absent.
    if (element === undefined) continue;
    const at = child(place, key);
    const path = pointer(...at.segments);
    const spec = propertySpec(properties, key);
    if (spec === undefined) {
      if (propertySpec(sharedProperties, key) !== undefined) {
        // A presentation option outside its appliesTo or elementsOf (GSV-REQ-041).
        walk.issues.push(createIssue("inapplicable_property", path, { term: at.term, graphType: walk.graphType }));
      } else {
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
    const checked = checkValue(spec, element, at, walk, spec.presentation !== undefined);
    if (checked !== FAILED && checked !== OMITTED) normalized[spec.term] = checked;
  }
  for (const spec of Object.values(properties)) {
    if (spec.required && (!Object.hasOwn(value, spec.term) || value[spec.term] === undefined)) {
      const at = child(place, spec.term);
      walk.issues.push(createIssue("missing_property", pointer(...at.segments), { term: at.term, graphType: walk.graphType }));
    }
  }
  return normalized;
}

/**
 * Stage 2 (AD-004): check every property of a description whose envelope passed, against the
 * terms its graph type accepts (`propertiesOf`). Collects every issue; a value that fails is not
 * checked further.
 */
// @spec GSV-REQ-017, GSV-REQ-018, GSV-REQ-019, GSV-REQ-021, GSV-REQ-022, GSV-REQ-041
export function checkStructure(description: Readonly<Record<string, unknown>>, type: GraphType, registry: Registry): StructureResult {
  const walk: Walk = { graphType: type, issues: [], provenance: {} };
  const normalized = checkMap(description, propertiesOf(type, registry), { segments: [], term: "" }, walk);
  const version = description["version"];
  return {
    issues: walk.issues,
    description: { type, ...(version === undefined ? {} : { version }), ...normalized },
    provenance: walk.provenance,
  };
}
