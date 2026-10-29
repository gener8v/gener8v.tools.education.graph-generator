import type { DescriptionBase, GraphTypeDefinition } from "../definitions/types";
import { isIssueCode } from "../issues";
import type { Issue } from "../result";
import { type StageState, deepFreeze, touchesFailed } from "./state";

/** The longest message a check's issue may carry; `createIssue` keeps messages far shorter. */
const MAX_MESSAGE_LENGTH = 2_000;

/**
 * An issue from a check or a solver must be one `createIssue` could build; anything else is a
 * package defect. `source` names where it came from, for the defect's own message.
 */
export function assertIssue(issue: Issue, source: string): Issue {
  if (!isIssueCode(issue.code) || typeof issue.path !== "string" || typeof issue.message !== "string" || issue.message.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`${source} returned an issue createIssue would not build`);
  }
  return issue;
}

/**
 * A check's optional inputs, read as its own list only: a polluted `Object.prototype` cannot add
 * any (security review SEC-004 on rulers GSV TICKET-001).
 */
function optionalInputsOf(check: GraphTypeDefinition["checks"][number]): readonly string[] {
  const optional = Object.hasOwn(check, "optionalInputs") ? check.optionalInputs : undefined;
  return Array.isArray(optional) ? optional : [];
}

/**
 * Stage 4 (AD-004): run each domain check whose inputs are present and untouched by any earlier
 * failure, and whose optional inputs, present or not, are untouched by any failure (code review
 * CR-002 on rulers GSV TICKET-001), and merge their issues into the one list. A check that would read a failed value is
 * skipped, so its issues never follow from another issue. The description is frozen first, so a
 * check cannot change the result (security review SEC-004 on TICKET-004).
 */
// @spec GSV-REQ-023
export function runDomainChecks(definition: GraphTypeDefinition, state: StageState): void {
  deepFreeze(state.description);
  for (const check of definition.checks) {
    const ready =
      check.inputs.every((input) => Object.hasOwn(state.description, input.split("/")[0]!) && !touchesFailed(input, state.failed)) &&
      optionalInputsOf(check).every((input) => !touchesFailed(input, state.failed));
    if (!ready) continue;
    for (const issue of check.check(state.description as DescriptionBase)) state.issues.push(assertIssue(issue, `Domain check "${check.name}"`));
  }
}
