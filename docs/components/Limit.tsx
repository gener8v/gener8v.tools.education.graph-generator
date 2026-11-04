import type { ReactElement } from "react";
import { MAX_INPUT_BYTES, MAX_ISSUES_PRINTED } from "../../src/cli-limits";
import { CALLER_TEXT_LIMIT, UNIT_TEXT_LIMIT } from "../../src/core/definitions/shared";
import { DESCRIPTION_VALUE_LIMIT } from "../../src/core/validate/structure";
import { handleGraphToolCall, TEXT_ALTERNATIVE_LIMIT, TOOL_INPUT_LIMIT } from "../../src/tool/index";

// The numeric limits the pages state, read from the package's own constants, so a page cannot
// type a number that drifts (graph-library CPSE TICKET-008 code review CR-002, quality review
// QR-003). tests/docs/examples-valid.test.ts fails on a page that types one of these numbers.

/**
 * The most issues the tool's `summary` lists. The package does not export it, so it is measured:
 * the handler is given more issues than any limit would allow, and the numbered lines are counted.
 */
function toolSummaryIssues(): number {
  const graph: Record<string, unknown> = { type: "circle", radius: 3 };
  for (let index = 0; index < 100; index += 1) graph[`unknownTerm${index}`] = 1;
  return handleGraphToolCall({ graph }).summary.split("\n").filter((line) => /^\d+\. /.test(line)).length;
}

/** Every limit a page states, by the constant's name (or, for the tool's summary, a name of its own). */
export const LIMITS = {
  CALLER_TEXT_LIMIT,
  UNIT_TEXT_LIMIT,
  DESCRIPTION_VALUE_LIMIT,
  TOOL_INPUT_LIMIT,
  TEXT_ALTERNATIVE_LIMIT,
  MAX_INPUT_BYTES,
  MAX_ISSUES_PRINTED,
  TOOL_SUMMARY_ISSUES: toolSummaryIssues(),
} as const;

export type LimitName = keyof typeof LIMITS;

/** A number with thousands separators, as the pages write it: `2,000,000`. */
export const grouped = (value: number): string => value.toLocaleString("en-US");

/** The text a page shows for a limit: `MAX_INPUT_BYTES` as `3 MiB (3,145,728 bytes)`, any other as its number. */
export function limitText(name: LimitName): string {
  const value = LIMITS[name];
  return name === "MAX_INPUT_BYTES" ? `${value / (1024 * 1024)} MiB (${grouped(value)} bytes)` : grouped(value);
}

/** A limit, written in a page's text: `<Limit name="CALLER_TEXT_LIMIT" />`. */
export function Limit({ name }: { name: LimitName }): ReactElement {
  return <>{limitText(name)}</>;
}
