import type { Derivation, GraphTypeDefinition, NumberValue } from "../definitions/types";
import { propertySpec } from "../definitions/types";
import { createIssue, pointer } from "../issues";
import type { Range } from "../result";
import { type RangeSide, rangeBroken, rangeOf } from "./numbers";
import { type StageState, touchesFailed } from "./state";
import { withinTolerance } from "../tolerance";

// The 1% agreement rule lives in `../tolerance`, shared with the geometry solvers, which sit below
// the validator (GSS TICKET-004 quality review QR-004); re-exported for the validator's callers.
export { TOLERANCE, withinTolerance } from "../tolerance";

/** "a or b", "a, b or c". */
const alternatives = (terms: readonly string[]) =>
  terms.length === 1 ? terms[0]! : `${terms.slice(0, -1).join(", ")} or ${terms[terms.length - 1]}`;

/** Remove a value that did not pass from the result, and mark it failed. */
function dropFailed(state: StageState, term: string): void {
  const path = pointer(term);
  state.failed.add(path);
  delete state.description[term];
  delete state.provenance[path];
}

/** A group member's spec. Definitions are checked to make every member a number property. */
function memberSpec(definition: GraphTypeDefinition, term: string): NumberValue {
  const spec = propertySpec(definition.properties, term);
  if (spec === undefined || spec.kind !== "number") throw new Error(`Derivation member ${term} is not a number property`);
  return spec;
}

/**
 * Every member's value from the defining one, checked for package defects: a `derive` that
 * leaves a member out or returns something that is not a number throws, which the validator
 * reports as `internal_error` (code review CR-004 on TICKET-004).
 */
function deriveAll(group: Derivation, term: string, value: number): Readonly<Record<string, number>> {
  const derived = group.derive(term, value);
  for (const member of group.members) {
    if (typeof derived[member] !== "number" || Number.isNaN(derived[member])) {
      throw new Error(`Derivation did not give a number for ${member}`);
    }
  }
  return derived;
}

/**
 * The range the defining value must stay in so that every derived member stays in its own: the
 * defining spec's range, narrowed by the defining value each member's bound would derive (a
 * diameter of at most 150 gives a radius of at most 75). A member with no bound on a side is
 * bounded by what keeps it finite and non-zero.
 */
function definingRange(group: Derivation, definition: GraphTypeDefinition, defining: string): Range {
  const range = rangeOf(memberSpec(definition, defining));
  for (const member of group.members) {
    if (member === defining) continue;
    const spec = memberSpec(definition, member);
    const low = group.derive(member, spec.min ?? Number.MIN_VALUE)[defining];
    if (low !== undefined && Number.isFinite(low) && (range.min === undefined || low > range.min)) {
      range.min = low;
      if (spec.exclusiveMin) range.exclusiveMin = true;
      else delete range.exclusiveMin;
    }
    const high = group.derive(member, spec.max ?? Number.MAX_VALUE)[defining];
    if (high !== undefined && Number.isFinite(high) && (range.max === undefined || high < range.max)) {
      range.max = high;
      if (spec.exclusiveMax) range.exclusiveMax = true;
      else delete range.exclusiveMax;
    }
  }
  return range;
}

/**
 * Stage 3 (AD-004): for each derivation group, take the first supplied member that passed stage 2
 * as defining (in the group's documented order), derive every other member, check each other
 * supplied member against its derived value, and add the members that were not supplied. Every
 * derived value must stay within its own member's range; when one would not, the defining value
 * is reported out of range, with the range that would keep every member in its own.
 */
// @spec GSV-REQ-023, GSV-REQ-028, GSV-REQ-036, GSV-REQ-037, GSV-REQ-038, GSV-REQ-039
export function checkDerivations(definition: GraphTypeDefinition, state: StageState): void {
  for (const group of definition.derivations) {
    const failed = (term: string) => touchesFailed(term, state.failed);
    const supplied = group.members.filter((term) => Object.hasOwn(state.description, term) && !failed(term));

    if (supplied.length === 0) {
      // A member that did not pass stage 2 was reported already; asking for one again would cascade.
      if (group.required && !group.members.some(failed)) {
        state.issues.push(
          createIssue("insufficient", pointer(), { term: definition.type, detail: `one of ${alternatives(group.members)} is needed` }),
        );
      }
      continue;
    }

    const defining = supplied[0]!;
    const definingValue = state.description[defining] as number;
    const derived = deriveAll(group, defining, definingValue);
    const toAdd = group.members.filter((term) => term !== defining && !supplied.includes(term) && !failed(term));

    // Every derived value must satisfy its own member's spec (quality review QR-001, security
    // reviews SEC-001 and SEC-002 on TICKET-004): too small (including underflow to 0), too large
    // (including overflow to Infinity). The defining value is the cause, so it carries the issue.
    const broken = toAdd
      .map((term) => {
        const value = derived[term]!;
        const side: RangeSide | undefined = Number.isFinite(value) ? rangeBroken(value, rangeOf(memberSpec(definition, term))) : "max";
        return { term, side };
      })
      .find((entry) => entry.side !== undefined);
    if (broken !== undefined) {
      const range = definingRange(group, definition, defining);
      state.issues.push(createIssue("out_of_range", pointer(defining), { term: defining, got: definingValue, range }));
      dropFailed(state, defining);
      continue;
    }

    for (const term of group.members) {
      if (term === defining) continue;
      const value = derived[term]!;
      const path = pointer(term);
      if (supplied.includes(term)) {
        const given = state.description[term] as number;
        if (!withinTolerance(given, value)) {
          state.issues.push(
            createIssue("contradiction", path, {
              term,
              got: given,
              conflicts: [pointer(defining)],
              conflictTerms: [defining],
              agreeingValue: value,
            }),
          );
          dropFailed(state, term);
        }
      } else if (toAdd.includes(term)) {
        // Added by vocabulary term on the null-prototype description, never by an input key.
        state.description[term] = value;
        state.provenance[path] = "derived";
      }
    }
  }
}
