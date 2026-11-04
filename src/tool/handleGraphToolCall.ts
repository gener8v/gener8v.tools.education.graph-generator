import { definitions } from "../core/definitions/index";
import type { DescriptionBase } from "../core/definitions/types";
import { describeNormalized } from "../core/describe";
import { createIssue, formatIssue, pointer } from "../core/issues";
import type { Issue, Issues, Provenance } from "../core/result";
import { validate } from "../core/validate/index";
import { isPlainObject, readList, readObject } from "../core/validate/json";
import { DESCRIPTION_VALUE_LIMIT } from "../core/validate/structure";
import { closestTerm } from "../core/validate/suggest";
import { TOOL_NAME } from "./graphTool";

/**
 * The most characters tool input given as JSON text may have, counted as UTF-16 code units (a
 * string's `length`, so a character outside the Basic Multilingual Plane counts twice). Longer text
 * is refused as `too_large` without being parsed (CPSE OQ-008). Measured 2026-11-04: the largest
 * valid description, an x,y graph at its limits (1,000 labeled points and 740 labeled segments,
 * every text 200 × `"` or 200 emoji), sent with every optional property as `null`, is 876,079
 * units of compact JSON and 1,019,031 indented by two spaces; this is about 2.3 and 1.96 times
 * those. A model that writes every character outside ASCII as a `\u` escape can pass it with
 * descriptions far below the limits (4,362,079 units for the emoji case). Input given as an object
 * is not measured: the validator's value and text limits bound it.
 */
export const TOOL_INPUT_LIMIT = 2_000_000;

/**
 * The most characters (code points) of the text alternative a result carries, in `textAlternative`
 * and in `summary`; a longer one is cut there and ends in "…". An x,y graph at its limits states
 * about 560,000 characters, which would fill a model's context. `describe(description)` from
 * `./core` gives it whole.
 */
export const TEXT_ALTERNATIVE_LIMIT = 4000;

/** The most issues `summary` lists; the rest are counted (GSV TICKET-002 security review SEC-002). */
const SUMMARY_ISSUE_LIMIT = 20;

/**
 * The most keys and list elements copied while removing `null`s: four times the description's value
 * limit, above the largest input the tool schema accepts (an x,y graph with every property given,
 * 14,018). Past it the rest is passed to `validate` as it is, which refuses it.
 */
const COPY_LIMIT = 4 * DESCRIPTION_VALUE_LIMIT;

/** Where the description is in the tool input, and what the root's issues name it after. */
const GRAPH_KEY = "graph";
const ROOT_ALLOWED = [GRAPH_KEY] as const;
const ROOT = "tool";

/**
 * What `handleGraphToolCall` returns. Plain data. `summary` is plain text to return to the model as
 * the tool's result.
 * - Success: the normalized description, to pass to `<Graph>` or `exportSource`, which of its
 *   values were derived, and its text alternative (cut at `TEXT_ALTERNATIVE_LIMIT`).
 * - Failure: every issue, with paths into the tool input (`/graph/radius`). `summary` lists the
 *   first 20.
 */
export type ToolResult =
  | { ok: true; description: DescriptionBase; provenance: Provenance; textAlternative: string; summary: string }
  | { ok: false; issues: Issues; summary: string };

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The numbered issue lines, the first `SUMMARY_ISSUE_LIMIT`, each printed by `formatIssue`, never raw. */
function failureSummary(issues: Issues): string {
  const lines = issues.slice(0, SUMMARY_ISSUE_LIMIT).map((issue, index) => `${index + 1}. ${formatIssue(issue)}`);
  if (issues.length > SUMMARY_ISSUE_LIMIT) lines.push(`…and ${issues.length - SUMMARY_ISSUE_LIMIT} more`);
  const header =
    `The graph was not produced: ${count(issues.length, "issue", "issues")}. ` +
    `Fix ${issues.length === 1 ? "it" : "them"} and call ${TOOL_NAME} again with {"graph": <the description>}.`;
  return [header, ...lines].join("\n");
}

/** A failure. Throws when given no issues, a package defect the handler reports as `internal_error`. */
function failure(issues: readonly Issue[]): ToolResult {
  const [first, ...rest] = issues;
  if (first === undefined) throw new Error("A failure needs at least one issue");
  const all: Issues = [first, ...rest];
  return { ok: false, issues: all, summary: failureSummary(all) };
}

/** `text` cut to `TEXT_ALTERNATIVE_LIMIT` code points, ending in "…"; never splits a surrogate pair. */
function capped(text: string): string {
  if (text.length <= TEXT_ALTERNATIVE_LIMIT) return text;
  let end = 0;
  for (let characters = 0; characters < TEXT_ALTERNATIVE_LIMIT && end < text.length; characters++) {
    end += text.codePointAt(end)! > 0xffff ? 2 : 1;
  }
  return end >= text.length ? text : `${text.slice(0, end)}…`;
}

/**
 * An issue `validate` reported for the description, with its path, and the paths in `conflicts`,
 * pointing into the tool input, where the model wrote it.
 */
function inGraph(issue: Issue): Issue {
  const moved: Issue = { ...issue, path: pointer(GRAPH_KEY) + issue.path };
  if (issue.conflicts !== undefined) moved.conflicts = issue.conflicts.map((path) => pointer(GRAPH_KEY) + path);
  return moved;
}

/**
 * A copy of `graph` without its `null`-valued properties, at any depth: in the tool's schema `null`
 * means "not given" (AD-006), which the published description does not allow, so this happens here
 * and never in `validate`. List elements that are `null` stay. Own properties are read once, through
 * their descriptors, so no getter runs; a getter or hidden property is copied as it is, for
 * `validate` to report. Anything that is not a plain object or list, or cannot be read, is passed on
 * as it is. Iterative, and stops copying after `COPY_LIMIT` keys and elements, so neither a deep nor
 * a wide input costs more than that.
 */
// @spec CPSE-REQ-030
function withoutNulls(graph: unknown): unknown {
  let budget = COPY_LIMIT;
  const pending: Array<() => void> = [];
  const copy = (value: unknown): unknown => {
    if (typeof value !== "object" || value === null || budget <= 0) return value;
    try {
      const names = Object.getOwnPropertyNames(value);
      budget -= names.length;
      if (budget < 0) return value;
      if (Array.isArray(value)) {
        const elements = readList(value);
        if (elements === undefined) return value;
        const target: unknown[] = [];
        pending.push(() => {
          for (const element of elements) target.push(copy(element));
        });
        return target;
      }
      if (!isPlainObject(value)) return value;
      const descriptors = names.map((name) => [name, Object.getOwnPropertyDescriptor(value, name)] as const);
      // A null prototype, so a `__proto__` key is an ordinary property, as `JSON.parse` makes it.
      const target = Object.create(null) as Record<string, unknown>;
      pending.push(() => {
        for (const [name, descriptor] of descriptors) {
          if (descriptor === undefined) continue;
          if (!descriptor.enumerable || !("value" in descriptor)) Object.defineProperty(target, name, descriptor);
          else if (descriptor.value !== null) target[name] = copy(descriptor.value);
        }
      });
      return target;
    } catch {
      // A Proxy whose traps throw: `validate` reads it, and refuses it, as it would the original.
      return value;
    }
  };
  const result = copy(graph);
  while (pending.length > 0) pending.pop()!();
  return result;
}

/** The tool input, parsed: an object whose `graph` property holds the description. */
// @spec CPSE-REQ-032, CPSE-REQ-033, CPSE-REQ-034
function handleInput(input: unknown): ToolResult {
  const contents = isPlainObject(input) ? readObject(input) : undefined;
  if (contents === undefined) return failure([createIssue("not_an_object", pointer(), { got: input })]);
  // As many keys as a description may hold values: past that, one issue rather than one per key.
  const keys = contents.values.size + contents.opaque.length;
  if (keys > DESCRIPTION_VALUE_LIMIT) {
    return failure([createIssue("too_large", pointer(), { term: "input", limit: DESCRIPTION_VALUE_LIMIT, unit: "values", count: keys })]);
  }

  const issues: Issue[] = [];
  const graphPath = pointer(GRAPH_KEY);
  const graph = contents.values.get(GRAPH_KEY);
  let checked: ReturnType<typeof validate> | undefined;
  // Own keys only (`readObject`): a `graph` on a polluted prototype is not the model's input.
  if (contents.opaque.includes(GRAPH_KEY)) {
    issues.push(createIssue("wrong_kind", graphPath, { term: GRAPH_KEY, got: undefined, expected: "plain JSON data" }));
  } else if (graph === undefined) {
    issues.push(createIssue("missing_property", graphPath, { term: GRAPH_KEY, graphType: ROOT }));
  } else {
    checked = validate(withoutNulls(graph));
    if (!checked.valid) issues.push(...checked.issues.map(inGraph));
  }
  // The input's other keys, after the description's issues, so a description sent without the
  // wrapper is reported first as a missing `graph`. An explicit `undefined` disappears in JSON, so
  // it counts as absent, as in `validate`.
  const others = [...contents.values].filter(([key, value]) => key !== GRAPH_KEY && value !== undefined).map(([key]) => key);
  for (const key of [...others, ...contents.opaque.filter((key) => key !== GRAPH_KEY)]) {
    const suggestion = closestTerm(key, ROOT_ALLOWED);
    issues.push(
      createIssue("unknown_property", pointer(key), { term: key, graphType: ROOT, allowed: ROOT_ALLOWED, ...(suggestion === undefined ? {} : { suggestion }) }),
    );
  }
  if (issues.length > 0 || checked === undefined || !checked.valid) return failure(issues);

  const { description, provenance } = checked;
  // The validated description is described directly; `describe` would validate it again
  // (GSV TICKET-004 security review SEC-005).
  const textAlternative = capped(describeNormalized(description, provenance, definitions));
  return { ok: true, description, provenance, textAlternative, summary: `The ${description.type} was produced.\nText alternative: ${textAlternative}` };
}

/**
 * Handles one call of `graphTool` (AD-015): `input` is the call's input as the provider gives it,
 * an object or JSON text. Text longer than `TOOL_INPUT_LIMIT` is refused unparsed; text that is not
 * JSON, such as JSON inside prose, is `invalid_json`. The description in `graph` loses its `null`s
 * and is validated; the result holds it normalized with its text alternative, or every issue, each
 * with a `summary` to return to the model. Never throws: an unexpected error is `internal_error`,
 * whose message is fixed, so no exception text or stack reaches the model. Calls no model and
 * makes no network request.
 */
// @spec CPSE-REQ-030, CPSE-REQ-031, CPSE-REQ-032, CPSE-REQ-033, CPSE-REQ-034, CPSE-REQ-035, CPSE-REQ-036
export function handleGraphToolCall(input: unknown): ToolResult {
  try {
    if (typeof input !== "string") return handleInput(input);
    if (input.length > TOOL_INPUT_LIMIT) {
      return failure([createIssue("too_large", pointer(), { term: "input", limit: TOOL_INPUT_LIMIT, unit: "characters", count: input.length })]);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch (error) {
      // Only the parser's message is passed on, as the issue's detail, which the issue escapes and clips.
      const detail = error instanceof SyntaxError ? error.message : undefined;
      return failure([createIssue("invalid_json", pointer(), detail === undefined ? {} : { detail })]);
    }
    return handleInput(parsed);
  } catch {
    // A package defect: the issue's fixed message, never the exception's (GSV TICKET-002 SEC-003).
    return failure([createIssue("internal_error", pointer(), {})]);
  }
}
