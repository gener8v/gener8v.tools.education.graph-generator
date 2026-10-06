import type { Issue, Range } from "./result";

/**
 * The fixed issue-code set (GSV-REQ-030). Renaming or removing a code is a breaking change
 * (GSV-REQ-034, CPSE-REQ-042); a graph type that needs a new code adds it here with its
 * documentation (dependency-map RES-008), never inline.
 */
// @spec GSV-REQ-030, GSV-REQ-034
export const ISSUE_CODES = Object.freeze([
  "not_an_object",
  "unknown_graph_type",
  "unsupported_version",
  "missing_property",
  "unknown_property",
  "inapplicable_property",
  "wrong_kind",
  "out_of_range",
  "contradiction",
  "insufficient",
  "ambiguous",
  "not_a_triangle",
  "too_many_ticks",
  "tick_spacing_invalid",
  "tick_label_not_on_tick",
  "outside_axis_range",
  "degenerate_segment",
  "scale_excludes_value",
  "tick_interval_not_dividing",
  "series_length_mismatch",
  "unknown_image",
  "unknown_color",
  "invalid_json",
  "internal_error",
] as const);

export type IssueCode = (typeof ISSUE_CODES)[number];

/** What each code means, for documentation and for callers deciding how to react. */
// @spec GSV-REQ-030
export const issueDocs: Readonly<Record<IssueCode, string>> = Object.freeze({
  not_an_object: "The description is not a JSON object (for example an array, a string or null).",
  unknown_graph_type: "The `type` field is missing or names a graph type the package does not support.",
  unsupported_version: "The `version` field names a schema version this package does not support.",
  missing_property: "A property the graph type requires is missing.",
  unknown_property: "A property name is not a vocabulary term of this graph type.",
  inapplicable_property: "A vocabulary term, such as a presentation option, does not apply to this graph type.",
  wrong_kind: "A value has the wrong kind, for example text where a number is required.",
  out_of_range: "A value is outside its allowed range, for example a length that is not positive.",
  contradiction: "Two or more values disagree, for example a radius and a diameter.",
  insufficient: "The supplied values do not determine the figure, for example three angles with no side.",
  ambiguous: "The supplied values fit more than one figure, for example two sides and a non-included angle.",
  not_a_triangle: "Side lengths or vertices cannot form a triangle.",
  too_many_ticks: "An axis would draw more ticks than the allowed maximum.",
  tick_spacing_invalid: "A tick spacing is zero or negative.",
  tick_label_not_on_tick: "A custom tick label is placed at a value that is not a tick position.",
  outside_axis_range: "A point or segment end lies outside its axis range.",
  degenerate_segment: "A line segment starts and ends at the same point.",
  scale_excludes_value: "A given value scale does not include every data value.",
  tick_interval_not_dividing: "A tick interval does not divide the value scale into whole intervals.",
  series_length_mismatch: "A series has a different number of values than there are categories.",
  unknown_image: "A unit image name is not in the published image set.",
  unknown_color: "A color is neither a published color name nor a hexadecimal color code.",
  invalid_json:
    "The model tool's input is text that is not valid JSON. Emitted only by the tool handler.",
  internal_error:
    "A defect in the package stopped the check. It is not a problem with the description; report it.",
});

/** Values used to compose an issue's message and optional fields. */
export interface IssueParams {
  /** The property's vocabulary term, e.g. "radius"; the subject of the message. */
  term: string;
  /** The value that was supplied, if any. */
  got?: unknown;
  /** The kind of value accepted, e.g. "a number". */
  expected?: string;
  range?: Range;
  allowed?: readonly string[];
  suggestion?: string;
  /** JSON Pointers of the other properties involved. */
  conflicts?: readonly string[];
  /** The graph type the description names, e.g. "circle". */
  graphType?: string;
  /** A value that would make the description consistent. */
  agreeingValue?: number;
  /** Extra explanation for codes whose fix depends on the case. */
  detail?: string;
}

/** A short, readable rendering of a supplied value for messages. */
export function describeValue(value: unknown): string {
  if (value === undefined) return "nothing";
  if (typeof value === "number" && !Number.isFinite(value)) return String(value);
  if (typeof value === "string") return JSON.stringify(value.length > 40 ? `${value.slice(0, 37)}...` : value);
  if (Array.isArray(value)) return "a list";
  if (value === null) return "null";
  if (typeof value === "object") return "an object";
  return String(value);
}

/** "a number greater than 0", "a number between 1 and 100", … */
export function describeRange(range: Range, kind = "a number"): string {
  const { min, max, exclusiveMin, exclusiveMax } = range;
  const lower = min === undefined ? undefined : exclusiveMin ? `greater than ${min}` : `at least ${min}`;
  const upper = max === undefined ? undefined : exclusiveMax ? `less than ${max}` : `at most ${max}`;
  if (min !== undefined && max !== undefined && !exclusiveMin && !exclusiveMax) {
    return `${kind} between ${min} and ${max}`;
  }
  return [kind, [lower, upper].filter(Boolean).join(" and ")].filter(Boolean).join(" ");
}

const list = (values: readonly string[] | undefined) => (values && values.length > 0 ? values.join(", ") : "none");
const aGraph = (graphType: string | undefined) => (graphType ? ` for a ${graphType}` : "");

/**
 * The plain-English message for an issue: it names the property by its vocabulary term and
 * says what would make the value acceptable (GSV-REQ-031).
 */
// @spec GSV-REQ-031
export function issueMessage(code: IssueCode, p: IssueParams): string {
  const got = describeValue(p.got);
  const range = p.range ? describeRange(p.range) : "a valid value";
  switch (code) {
    case "not_an_object":
      return `A graph ${p.term} must be a JSON object with a "type" field; got ${got}.`;
    case "unknown_graph_type":
      return p.got === undefined
        ? `${p.term} is required; use one of: ${list(p.allowed)}.`
        : `${p.term} must be one of: ${list(p.allowed)}; got ${got}.`;
    case "unsupported_version":
      return `${p.term} ${got} is not supported; use one of: ${list(p.allowed)}, or leave it out for the current version.`;
    case "missing_property":
      return `${p.term} is required${aGraph(p.graphType)}; add it.`;
    case "unknown_property":
      return p.suggestion
        ? `${p.term} is not a property${aGraph(p.graphType)}; did you mean ${p.suggestion}?`
        : `${p.term} is not a property${aGraph(p.graphType)}; use one of: ${list(p.allowed)}.`;
    case "inapplicable_property":
      return `${p.term} does not apply${aGraph(p.graphType)}; remove it.`;
    case "wrong_kind":
      return `${p.term} must be ${p.expected ?? "a different kind of value"}; got ${got}.`;
    case "out_of_range":
      return `${p.term} must be ${range}; got ${got}.`;
    case "contradiction": {
      const others = list(p.conflicts);
      const fix =
        p.agreeingValue === undefined
          ? "change one of them so they agree, or remove all but one"
          : `a value of ${p.agreeingValue} would agree, or remove one of them`;
      return `${p.term} (${got}) disagrees with ${others}; ${fix}.`;
    }
    case "insufficient":
      return `${p.term} cannot be determined${p.detail ? `: ${p.detail}` : ""}; add the missing value.`;
    case "ambiguous":
      return `${p.term} is ambiguous${p.detail ? `: ${p.detail}` : ""}; supply a value that fixes one figure.`;
    case "not_a_triangle":
      return `${p.term} cannot form a triangle${p.detail ? `: ${p.detail}` : ""}; change the values so they do.`;
    case "too_many_ticks":
      return `${p.term} would draw more than ${p.range?.max ?? "the maximum number of"} ticks; use a larger tick spacing.`;
    case "tick_spacing_invalid":
      return `${p.term} must be a number greater than 0; got ${got}.`;
    case "tick_label_not_on_tick":
      return `${p.term} is at ${got}, which is not a tick position; use a value that is a multiple of the tick spacing.`;
    case "outside_axis_range":
      return `${p.term} (${got}) is outside the axis range, ${range}; move it inside the range or widen the axis.`;
    case "degenerate_segment":
      return `${p.term} starts and ends at the same point; give it two different points.`;
    case "scale_excludes_value":
      return `${p.term} (${got}) is outside the value scale, ${range}; widen the scale or leave the scale out.`;
    case "tick_interval_not_dividing":
      return `${p.term} must divide the value scale into whole intervals; got ${got}. Use a value that divides the scale range exactly.`;
    case "series_length_mismatch":
      return `${p.term} has ${got} values but there are ${p.expected ?? "a different number of"} categories; give one value per category.`;
    case "unknown_image":
      return `${p.term} must be one of the published images: ${list(p.allowed)}; got ${got}.`;
    case "unknown_color":
      return `${p.term} must be a color name (${list(p.allowed)}) or a hex code such as #0072b2; got ${got}.`;
    case "invalid_json":
      return `The ${p.term} is not valid JSON${p.detail ? ` (${p.detail})` : ""}; send a JSON object.`;
    case "internal_error":
      return `The ${p.term} could not be checked because of a defect in the package${p.detail ? ` (${p.detail})` : ""}; please report it. The description itself may be valid.`;
  }
}

/**
 * Escape one JSON Pointer reference token (RFC 6901 §3): `~` → `~0`, then `/` → `~1`.
 */
export function escapePointerToken(token: string | number): string {
  return String(token).replace(/~/g, "~0").replace(/\//g, "~1");
}

/** A JSON Pointer to a property: `pointer("points", 2, "x")` → `"/points/2/x"`; no segments → `""`. */
// @spec GSV-REQ-029
export function pointer(...segments: Array<string | number>): string {
  return segments.map((segment) => `/${escapePointerToken(segment)}`).join("");
}

/**
 * Build an issue with its message, leaving out every optional field that has no value, so the
 * issue is plain JSON data (GSV-REQ-033).
 */
// @spec GSV-REQ-029, GSV-REQ-031, GSV-REQ-032, GSV-REQ-033
export function createIssue(code: IssueCode, path: string, params: IssueParams): Issue {
  const issue: Issue = { code, path, message: issueMessage(code, params) };
  if (params.expected !== undefined) issue.expected = params.expected;
  if (params.range !== undefined) {
    const range: Range = {};
    if (params.range.min !== undefined) range.min = params.range.min;
    if (params.range.max !== undefined) range.max = params.range.max;
    if (params.range.exclusiveMin) range.exclusiveMin = true;
    if (params.range.exclusiveMax) range.exclusiveMax = true;
    issue.range = range;
  }
  if (params.conflicts !== undefined && params.conflicts.length > 0) issue.conflicts = [...params.conflicts];
  if (params.suggestion !== undefined) issue.suggestion = params.suggestion;
  if (params.allowed !== undefined && params.allowed.length > 0) issue.allowed = [...params.allowed];
  return issue;
}
