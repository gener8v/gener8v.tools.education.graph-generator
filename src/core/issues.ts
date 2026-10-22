import { forEachCodePoint, formatSupplied, isUnsafeCodePoint } from "./format";
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
  "too_large",
  "duplicate_name",
  "not_on_mark",
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
    inapplicable_property:
      "A vocabulary term, such as a presentation option, does not apply to this graph type, or applies only while another term has a given value; that term is then in conflicts.",
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
    too_large: "A list, or the whole description, holds more values than its documented limit, or a text has more characters than its limit.",
    duplicate_name: "Two entries of a list that must be told apart by name, such as two categories, have the same name.",
    not_on_mark: "A value that must be one of a ruler's drawn marks lies between two of them; the issue names both.",
  } satisfies Record<IssueCode, string>),
);

/** One or more names or values. */
export type Terms = readonly [string, ...string[]];

/** A list as `Terms`, checking that it is not empty; an empty list is a package defect. */
export function asTerms(list: readonly string[]): Terms {
  if (list.length === 0) throw new Error("An issue cannot list zero allowed values");
  return list as unknown as Terms;
}

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
  /**
   * `elements`, when given, names where the option goes instead, such as "each series".
   * `condition`, when given, is package-authored text saying when the term applies, such as
   * `only when unit is "inches"`, and `conflicts` then holds the JSON Pointer of the term it
   * depends on (rulers GSV TICKET-001 DEL-003, code review CR-003).
   */
  inapplicable_property: { term: Term; graphType: string } & (
    | { elements?: string; condition?: never; conflicts?: never }
    | { condition: string; conflicts: Terms; elements?: never }
  );
  /**
   * `expected` is the kind of value accepted, e.g. "a number"; `allowed`, for a value outside a
   * fixed list, holds every accepted value (rulers GSV TICKET-001 code review CR-008).
   */
  wrong_kind: { term: Term; got: unknown; expected: string; allowed?: Terms };
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
  /** `spacing` is the tick spacing drawn, given or default; `range` is the axis range. */
  tick_label_not_on_tick: { term: Term; got: unknown; spacing: number; range: Range };
  /** `range` is the axis range. */
  outside_axis_range: { term: Term; got: unknown; range: Range };
  degenerate_segment: { term: Term };
  /** `range` is the value scale. */
  scale_excludes_value: { term: Term; got: unknown; range: Range };
  tick_interval_not_dividing: { term: Term; got: unknown };
  series_length_mismatch: { term: Term; valueCount: number; categoryCount: number };
  /** `suggestion` is the published name closest to `got`, for a near miss such as "Apple". */
  unknown_image: { term: Term; got: unknown; allowed: Terms; suggestion?: string };
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
  /**
   * `limit` is the documented maximum; `count` the number found, when known (a description is
   * not counted past its limit). `unit` names what is counted.
   */
  too_large: { term: Term; limit: number; unit: "items" | "values" | "images" | "characters"; count?: number };
  /**
   * `got` is the repeated name; `conflicts` holds the JSON Pointer of the earlier entry with that
   * name, for the issue, and `conflictTerms` names it for the message (DGP TICKET-001 DEL-003).
   */
  duplicate_name: { term: Term; got: unknown; conflicts: Terms; conflictTerms: Terms };
  /**
   * `below` and `above` are the drawn marks on either side of `got` (rulers NLC TICKET-002 DEL-003),
   * stated exactly, never rounded: 2.0625 is a mark and 2.063 is not (code review CR-001).
   */
  not_on_mark: { term: Term; got: unknown; below: number; above: number };
}

const MAX_VALUE_CHARS = 40;
const MAX_TERM_CHARS = 64;
const MAX_DETAIL_CHARS = 200;

const TERM_SHAPE = /^[A-Za-z][A-Za-z0-9-]*(?:\.[A-Za-z][A-Za-z0-9-]*|\[\d+\])*$/;

// Messages escape every code point plain text may not hold (the policy in ./format), and the
// zero-width joiners too, so a message shows exactly what was supplied.
const escapedInMessages = (code: number) => isUnsafeCodePoint(code) || code === 0x200c || code === 0x200d;

/** Replace each escaped code point with JSON-style \uXXXX escapes, one per UTF-16 unit. */
function escapeChars(text: string): string {
  let result = "";
  forEachCodePoint(text, (code, char) => {
    if (!escapedInMessages(code)) result += char;
    else for (let i = 0; i < char.length; i++) result += `\\u${char.charCodeAt(i).toString(16).padStart(4, "0")}`;
  });
  return result;
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 3)}...` : text);

/** Quoted, clipped, with every control and invisible character escaped. */
function quote(text: string, max: number): string {
  // JSON.stringify escapes the C0 controls, quotes and backslashes.
  return escapeChars(JSON.stringify(clip(text, max)));
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
  return escapeChars(clip(detail, MAX_DETAIL_CHARS));
}

/** A computed number rounded for reading, e.g. 9.549296585513721 → 9.549. */
function describeNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(4)));
}

/** A range's four fields, every key present, so reading or destructuring it never reaches the prototype. */
export interface OwnRange {
  readonly min: number | undefined;
  readonly max: number | undefined;
  readonly exclusiveMin: boolean | undefined;
  readonly exclusiveMax: boolean | undefined;
}

/**
 * A range's bounds and flags, each read own-key, so a polluted `Object.prototype.min` or `.max`
 * is never a bound and its text never reaches a message (rulers NLC TICKET-002 security review
 * SEC-001). Every reader of a range, or of a number spec's bounds, goes through this.
 */
export function ownRange(range: Range): OwnRange {
  const read = <K extends keyof Range>(key: K): Range[K] => (Object.hasOwn(range, key) ? range[key] : undefined);
  return { min: read("min"), max: read("max"), exclusiveMin: read("exclusiveMin"), exclusiveMax: read("exclusiveMax") };
}

/**
 * The range with only finite bounds, and only the exclusive flags whose bound remains;
 * `undefined` when no bound remains.
 */
export function normalizeRange(range: Range): Range | undefined {
  const { min, max, exclusiveMin, exclusiveMax } = ownRange(range);
  const result: Range = {};
  if (Number.isFinite(min)) {
    result.min = min;
    if (exclusiveMin === true) result.exclusiveMin = true;
  }
  if (Number.isFinite(max)) {
    result.max = max;
    if (exclusiveMax === true) result.exclusiveMax = true;
  }
  return result.min === undefined && result.max === undefined ? undefined : result;
}

/** "between 1 and 100", "greater than 0 and at most 5", … ; "" for no bounds. */
function describeBounds(range: Range): string {
  const { min, max, exclusiveMin, exclusiveMax } = ownRange(normalizeRange(range) ?? {});
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
  const { min, max, exclusiveMin, exclusiveMax } = ownRange(normalizeRange(range) ?? {});
  if (min !== undefined && max !== undefined && !exclusiveMin && !exclusiveMax) {
    return `from ${min} to ${max}`;
  }
  return describeBounds(range) || "unbounded";
}

const list = (values: Terms) => values.map(describeTerm).join(", ");
const article = (word: string) => (/^([aeiou]|x[^aeiou])/i.test(word) ? "an" : "a");
/** "a ruler", "an xy-graph": a graph type with its article. */
const aGraph = (graphType: string) => {
  const name = describeTerm(graphType);
  return `${article(name)} ${name}`;
};
const forGraph = (graphType: string) => `for ${aGraph(graphType)}`;
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
  inapplicable_property: (p) =>
    p.condition !== undefined
      ? `${describeTerm(p.term)} applies to ${aGraph(p.graphType)} ${describeDetail(p.condition)}; remove it.`
      : p.elements === undefined
        ? `${describeTerm(p.term)} does not apply ${forGraph(p.graphType)}; remove it.`
        : `${describeTerm(p.term)} does not apply ${forGraph(p.graphType)} as a whole; give it on ${p.elements} instead.`,
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
    `${describeTerm(p.term)} is at ${describeValue(p.got)}, which is not a tick position; use a tick: a multiple of ${describeNumber(p.spacing)} ${describeInterval(p.range)}.`,
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
    p.suggestion === undefined
      ? `${describeTerm(p.term)} must be one of the published images: ${list(p.allowed)}; got ${describeValue(p.got)}.`
      : `${describeTerm(p.term)} must be one of the published images: ${list(p.allowed)}; got ${describeValue(p.got)}. Did you mean ${describeTerm(p.suggestion)}?`,
  unknown_color: (p) =>
    `${describeTerm(p.term)} must be a color name (${list(p.allowed)}) or a hex code such as #0072b2; got ${describeValue(p.got)}.`,
  invalid_json: (p) =>
    `The tool input is not valid JSON${p.detail === undefined ? "" : ` (${describeDetail(p.detail)})`}; send a JSON object.`,
  internal_error: () =>
    "The description could not be checked because of a defect in the package; please report it. The description itself may be valid.",
  too_large: (p) => {
    // Pictures are drawn from values, not listed: the fix is a larger unit value or smaller values.
    if (p.unit === "images") {
      const drawn = p.count === undefined ? `more than ${p.limit}` : `${p.count}`;
      return `${describeTerm(p.term)} would draw ${drawn} pictures, more than the limit of ${p.limit}; use a larger unitValue or smaller values.`;
    }
    return p.count === undefined
      ? `${describeTerm(p.term)} has more than ${p.limit} ${p.unit}; use fewer.`
      : `${describeTerm(p.term)} has ${p.count} ${p.unit}, more than the limit of ${p.limit}; use fewer.`;
  },
  duplicate_name: (p) =>
    `${describeTerm(p.term)} (${describeValue(p.got)}) repeats ${list(p.conflictTerms)}; give each one a different name.`,
  not_on_mark: (p) =>
    `${describeTerm(p.term)} must be on a mark of the ruler; got ${describeValue(p.got)}, between the marks at ${formatSupplied(p.below)} and ${formatSupplied(p.above)}.`,
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
  return template(ownParams(params));
}

/**
 * An issue's params, own keys only, on a null prototype: an optional input a polluted
 * `Object.prototype` holds (`condition`, `elements`, `conflicts`, …) reads as absent, so it can
 * neither rewrite a message nor add a field (security review SEC-004 on rulers GSV TICKET-001).
 */
function ownParams<P>(params: P): P {
  return Object.assign(Object.create(null) as P & object, params);
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
  const own = ownParams(params);
  const issue: Issue = { code, path, message: issueMessage(code, own) };
  const fields = own as { expected?: string; range?: Range; conflicts?: Terms; suggestion?: string; allowed?: Terms };
  if (fields.expected !== undefined) issue.expected = fields.expected;
  const range = fields.range && normalizeRange(fields.range);
  if (range !== undefined) issue.range = range;
  if (fields.conflicts !== undefined) issue.conflicts = [...fields.conflicts];
  if (fields.suggestion !== undefined) issue.suggestion = fields.suggestion;
  if (fields.allowed !== undefined) issue.allowed = [...fields.allowed];
  return issue;
}

// A pointer whose every segment looks like a term or a list position is printed as written.
const PLAIN_POINTER = /^(?:\/[A-Za-z0-9_-]{1,64})+$/;

/**
 * One issue as a line of text: `<path>: <message>`, or the message alone for the whole
 * description. The path is a faithful JSON Pointer and may hold any characters from caller keys,
 * so it gets the same policy as terms in messages: a plain pointer (`/points/2/x`) as written,
 * anything else quoted, clipped to 64 characters and escaped. The message is escaped again, which
 * leaves a package-built message unchanged. Every place the package prints an issue as text uses
 * this, and consumers should too (GSV TICKET-002 security review SEC-001; CPSE TICKET-003
 * security review SEC-003, SEC-004).
 */
// @spec CPSE-REQ-015
export function formatIssue(issue: Pick<Issue, "path" | "message">): string {
  const message = escapeChars(String(issue.message));
  const path = String(issue.path);
  if (path === "") return message;
  return `${PLAIN_POINTER.test(path) ? path : quote(path, MAX_TERM_CHARS)}: ${message}`;
}
