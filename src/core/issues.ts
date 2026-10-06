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

const CODE_SET: ReadonlySet<string> = new Set(ISSUE_CODES);

/** Whether a value is one of the issue codes, e.g. a code read back from stored issue data. */
// @spec GSV-REQ-030
export function isIssueCode(value: unknown): value is IssueCode {
  return typeof value === "string" && CODE_SET.has(value);
}

/**
 * What each code means, for documentation and for callers deciding how to react. It has no
 * prototype, so a lookup by a string that is not a code finds nothing.
 */
// @spec GSV-REQ-030
export const issueDocs: Readonly<Record<IssueCode, string>> = Object.freeze(
  Object.assign(Object.create(null) as Record<IssueCode, string>, {
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
    invalid_json: "The model tool's input is text that is not valid JSON. Emitted only by the tool handler.",
    internal_error:
      "A defect in the package stopped the check. It is not a problem with the description; report it.",
  } satisfies Record<IssueCode, string>),
);

/** One or more names or values. */
export type Terms = readonly [string, ...string[]];

/**
 * A property's vocabulary term or readable path, e.g. "radius" or "points[2].x". It may come
 * from the caller's own keys (an unknown property name), so a message shows it as written only
 * when it looks like a term, and quoted and escaped otherwise.
 */
type Term = string;

/**
 * The inputs each code's message needs, so the compiler requires exactly those. `createIssue`
 * copies only `expected`, `range`, `conflicts`, `suggestion` and `allowed` into the issue; every
 * other input is used in the message alone.
 */
// @spec GSV-REQ-031, GSV-REQ-032
export interface IssueParamsByCode {
  not_an_object: { got: unknown };
  /** `got` is left out when the description has no `type`. */
  unknown_graph_type: { got?: unknown; allowed: Terms };
  unsupported_version: { got: unknown; allowed: Terms };
  missing_property: { term: Term; graphType: string };
  /** `suggestion` is the closest applicable term, when one is close enough. */
  unknown_property: { term: Term; graphType: string; allowed: Terms; suggestion?: string };
  inapplicable_property: { term: Term; graphType: string };
  /** `expected` is the kind of value accepted, e.g. "a number". */
  wrong_kind: { term: Term; got: unknown; expected: string };
  /** `range` is the allowed range of the value at the issue's path. */
  out_of_range: { term: Term; got: unknown; range: Range };
  /**
   * `conflicts` holds the JSON Pointers of the other properties, for the issue; `conflictTerms`
   * names the same properties for the message. `agreeingValue` would make the subject agree.
   */
  contradiction: { term: Term; got: unknown; conflicts: Terms; conflictTerms: Terms; agreeingValue?: number };
  /** `detail` is package-authored text saying what is missing. */
  insufficient: { term: Term; detail: string };
  /** `detail` is package-authored text saying why more than one figure fits. */
  ambiguous: { term: Term; detail: string };
  /** `detail` is package-authored text, e.g. "3 + 4 is not greater than 9". */
  not_a_triangle: { term: Term; detail: string };
  /** `fittingSpacing` is a tick spacing that would stay within `maxTicks`. */
  too_many_ticks: { term: Term; tickCount: number; maxTicks: number; fittingSpacing: number };
  tick_spacing_invalid: { term: Term; got: unknown };
  tick_label_not_on_tick: { term: Term; got: unknown };
  /** `range` is the axis range. */
  outside_axis_range: { term: Term; got: unknown; range: Range };
  degenerate_segment: { term: Term };
  /** `range` is the value scale. */
  scale_excludes_value: { term: Term; got: unknown; range: Range };
  tick_interval_not_dividing: { term: Term; got: unknown };
  series_length_mismatch: { term: Term; valueCount: number; categoryCount: number };
  unknown_image: { term: Term; got: unknown; allowed: Terms };
  unknown_color: { term: Term; got: unknown; allowed: Terms };
  /**
   * `detail` is the JSON parser's message, at most a short excerpt of the input. Never a stack
   * trace.
   */
  invalid_json: { detail?: string };
  /**
   * No inputs: the message is fixed so exception text and stack traces never reach a model or a
   * page (security review SEC-003).
   */
  internal_error: Record<string, never>;
}

const MAX_VALUE_CHARS = 40;
const MAX_TERM_CHARS = 64;
const MAX_DETAIL_CHARS = 200;

// Code points JSON.stringify leaves alone that can break lines, reorder text or hide it: DEL and
// C1 controls, soft hyphen, Arabic letter mark, Mongolian vowel separator, zero-width and bidi
// marks, line and paragraph separators, word joiners, bidi isolates, BOM. Written as numbers so
// the source holds no invisible characters itself.
const INVISIBLE: ReadonlyArray<readonly [number, number]> = [
  [0x7f, 0x9f],
  [0xad, 0xad],
  [0x61c, 0x61c],
  [0x180e, 0x180e],
  [0x200b, 0x200f],
  [0x2028, 0x202e],
  [0x2060, 0x2064],
  [0x2066, 0x206f],
  [0xfeff, 0xfeff],
];
const TERM_SHAPE = /^[A-Za-z][A-Za-z0-9-]*(?:\.[A-Za-z][A-Za-z0-9-]*|\[\d+\])*$/;

const isInvisible = (code: number) => INVISIBLE.some(([low, high]) => code >= low && code <= high);
const isControl = (code: number) => code < 0x20;

/** Replace each matching character with its JSON-style \uXXXX escape. */
function escapeChars(text: string, matches: (code: number) => boolean): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    result += matches(code) ? `\\u${code.toString(16).padStart(4, "0")}` : text[i];
  }
  return result;
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 3)}...` : text);

/** Quoted, clipped, with every control and invisible character escaped. */
function quote(text: string, max: number): string {
  // JSON.stringify escapes the C0 controls, quotes and backslashes.
  return escapeChars(JSON.stringify(clip(text, max)), isInvisible);
}

/** A short, readable rendering of a supplied value for messages. Never throws. */
export function describeValue(value: unknown): string {
  switch (typeof value) {
    case "undefined":
      return "nothing";
    case "string":
      return quote(value, MAX_VALUE_CHARS);
    case "number":
    case "boolean":
      return String(value);
    case "bigint":
      return "a big integer";
    case "symbol":
      return "a symbol";
    case "function":
      return "a function";
  }
  if (value === null) return "null";
  try {
    return Array.isArray(value) ? "a list" : "an object";
  } catch {
    // A revoked Proxy throws on Array.isArray.
    return "an object";
  }
}

/** A term as written when it looks like a vocabulary term or readable path; quoted otherwise. */
export function describeTerm(term: string): string {
  return term.length <= MAX_TERM_CHARS && TERM_SHAPE.test(term) ? term : quote(term, MAX_TERM_CHARS);
}

/** Package-authored explanation, clipped, with control and invisible characters escaped. */
function describeDetail(detail: string): string {
  return escapeChars(clip(detail, MAX_DETAIL_CHARS), (code) => isControl(code) || isInvisible(code));
}

/** A computed number rounded for reading, e.g. 9.549296585513721 → 9.549. */
function describeNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(4)));
}

/**
 * The range with only finite bounds, and only the exclusive flags whose bound remains;
 * `undefined` when no bound remains.
 */
export function normalizeRange(range: Range): Range | undefined {
  const result: Range = {};
  if (Number.isFinite(range.min)) {
    result.min = range.min;
    if (range.exclusiveMin) result.exclusiveMin = true;
  }
  if (Number.isFinite(range.max)) {
    result.max = range.max;
    if (range.exclusiveMax) result.exclusiveMax = true;
  }
  return result.min === undefined && result.max === undefined ? undefined : result;
}

/** "between 1 and 100", "greater than 0 and at most 5", … ; "" for no bounds. */
function describeBounds(range: Range): string {
  const { min, max, exclusiveMin, exclusiveMax } = normalizeRange(range) ?? {};
  if (min !== undefined && max !== undefined && !exclusiveMin && !exclusiveMax) {
    return `between ${min} and ${max}`;
  }
  const lower = min === undefined ? undefined : exclusiveMin ? `greater than ${min}` : `at least ${min}`;
  const upper = max === undefined ? undefined : exclusiveMax ? `less than ${max}` : `at most ${max}`;
  return [lower, upper].filter(Boolean).join(" and ");
}

/** "a number greater than 0", "a number between 1 and 100", … */
export function describeRange(range: Range, kind = "a number"): string {
  return [kind, describeBounds(range)].filter(Boolean).join(" ");
}

/** An interval such as an axis range: "from -10 to 10", or its bounds when it is open. */
export function describeInterval(range: Range): string {
  const normalized = normalizeRange(range);
  if (normalized?.min !== undefined && normalized.max !== undefined && !normalized.exclusiveMin && !normalized.exclusiveMax) {
    return `from ${normalized.min} to ${normalized.max}`;
  }
  return describeBounds(range) || "unbounded";
}

const list = (values: Terms) => values.map(describeTerm).join(", ");
const article = (word: string) => (/^([aeiou]|x[^aeiou])/i.test(word) ? "an" : "a");
const forGraph = (graphType: string) => {
  const name = describeTerm(graphType);
  return `for ${article(name)} ${name}`;
};
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

type Templates = { readonly [C in IssueCode]: (p: IssueParamsByCode[C]) => string };

/**
 * The plain-English message for each code: it names the property by its vocabulary term and
 * says what would make the value acceptable (GSV-REQ-031). A missing key is a compile error.
 */
// @spec GSV-REQ-031
const templates: Templates = {
  not_an_object: (p) => `A graph description must be a JSON object with a "type" field; got ${describeValue(p.got)}.`,
  unknown_graph_type: (p) =>
    p.got === undefined
      ? `type is required; use one of: ${list(p.allowed)}.`
      : `type must be one of: ${list(p.allowed)}; got ${describeValue(p.got)}.`,
  unsupported_version: (p) =>
    `version ${describeValue(p.got)} is not supported; use one of: ${list(p.allowed)}, or leave it out for the current version.`,
  missing_property: (p) => `${describeTerm(p.term)} is required ${forGraph(p.graphType)}; add it.`,
  unknown_property: (p) =>
    p.suggestion === undefined
      ? `${describeTerm(p.term)} is not a property ${forGraph(p.graphType)}; use one of: ${list(p.allowed)}.`
      : `${describeTerm(p.term)} is not a property ${forGraph(p.graphType)}; did you mean ${describeTerm(p.suggestion)}?`,
  inapplicable_property: (p) => `${describeTerm(p.term)} does not apply ${forGraph(p.graphType)}; remove it.`,
  wrong_kind: (p) => `${describeTerm(p.term)} must be ${describeDetail(p.expected)}; got ${describeValue(p.got)}.`,
  out_of_range: (p) => `${describeTerm(p.term)} must be ${describeRange(p.range)}; got ${describeValue(p.got)}.`,
  contradiction: (p) => {
    const fix =
      p.agreeingValue === undefined
        ? "change one of them so they agree, or remove all but one"
        : `a value of ${describeNumber(p.agreeingValue)} would agree, or remove one of them`;
    return `${describeTerm(p.term)} (${describeValue(p.got)}) disagrees with ${list(p.conflictTerms)}; ${fix}.`;
  },
  insufficient: (p) => `${describeTerm(p.term)} cannot be determined: ${describeDetail(p.detail)}; add the missing value.`,
  ambiguous: (p) =>
    `${describeTerm(p.term)} is ambiguous: ${describeDetail(p.detail)}; supply a value that fixes one figure.`,
  not_a_triangle: (p) =>
    `${describeTerm(p.term)} cannot form a triangle: ${describeDetail(p.detail)}; change the values so they do.`,
  too_many_ticks: (p) =>
    `${describeTerm(p.term)} would draw ${p.tickCount} ticks, more than the limit of ${p.maxTicks}; use a larger tick spacing, such as ${describeNumber(p.fittingSpacing)}.`,
  tick_spacing_invalid: (p) => `${describeTerm(p.term)} must be a number greater than 0; got ${describeValue(p.got)}.`,
  tick_label_not_on_tick: (p) =>
    `${describeTerm(p.term)} is at ${describeValue(p.got)}, which is not a tick position; use a value that is a multiple of the tick spacing.`,
  outside_axis_range: (p) =>
    `${describeTerm(p.term)} (${describeValue(p.got)}) is outside the axis range, ${describeInterval(p.range)}; move it inside the range or widen the axis.`,
  degenerate_segment: (p) => `${describeTerm(p.term)} starts and ends at the same point; give it two different points.`,
  scale_excludes_value: (p) =>
    `${describeTerm(p.term)} (${describeValue(p.got)}) is outside the value scale, ${describeInterval(p.range)}; widen the scale or leave the scale out.`,
  tick_interval_not_dividing: (p) =>
    `${describeTerm(p.term)} must divide the value scale into whole intervals; got ${describeValue(p.got)}. Use a value that divides the scale range exactly.`,
  series_length_mismatch: (p) =>
    `${describeTerm(p.term)} has ${count(p.valueCount, "value", "values")} but there ${p.categoryCount === 1 ? "is" : "are"} ${count(p.categoryCount, "category", "categories")}; give one value per category.`,
  unknown_image: (p) =>
    `${describeTerm(p.term)} must be one of the published images: ${list(p.allowed)}; got ${describeValue(p.got)}.`,
  unknown_color: (p) =>
    `${describeTerm(p.term)} must be a color name (${list(p.allowed)}) or a hex code such as #0072b2; got ${describeValue(p.got)}.`,
  invalid_json: (p) =>
    `The tool input is not valid JSON${p.detail === undefined ? "" : ` (${describeDetail(p.detail)})`}; send a JSON object.`,
  internal_error: () =>
    "The description could not be checked because of a defect in the package; please report it. The description itself may be valid.",
};

/**
 * The message for an issue. Throws on a string that is not an issue code, which only a
 * JavaScript caller can pass; the validator turns that into `internal_error`.
 */
// @spec GSV-REQ-031
export function issueMessage<C extends IssueCode>(code: C, params: IssueParamsByCode[C]): string {
  if (!Object.hasOwn(templates, code)) {
    throw new Error(`Unknown issue code: ${describeValue(code)}`);
  }
  const template = templates[code] as (p: IssueParamsByCode[C]) => string;
  return template(params);
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
 * issue is plain JSON data (GSV-REQ-033). Only the inputs that mean what `Issue` documents are
 * copied into its fields (GSV-REQ-032).
 */
// @spec GSV-REQ-029, GSV-REQ-031, GSV-REQ-032, GSV-REQ-033
export function createIssue<C extends IssueCode>(code: C, path: string, params: IssueParamsByCode[C]): Issue {
  const issue: Issue = { code, path, message: issueMessage(code, params) };
  const fields = params as { expected?: string; range?: Range; conflicts?: Terms; suggestion?: string; allowed?: Terms };
  if (fields.expected !== undefined) issue.expected = fields.expected;
  const range = fields.range && normalizeRange(fields.range);
  if (range !== undefined) issue.range = range;
  if (fields.conflicts !== undefined) issue.conflicts = [...fields.conflicts];
  if (fields.suggestion !== undefined) issue.suggestion = fields.suggestion;
  if (fields.allowed !== undefined) issue.allowed = [...fields.allowed];
  return issue;
}
