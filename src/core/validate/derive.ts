import type { GraphType, GraphTypeDefinition, PropertyMap } from "../definitions/types";
import { propertySpec } from "../definitions/types";
import { createIssue, pointer } from "../issues";
import { type StageState, touchesFailed } from "./state";

/** A supplied dependent value agrees within 1% (relative) of the derived value (GSV Behaviors & Rules). */
export const TOLERANCE = 0.01;

/**
 * Whether a supplied value agrees with the derived one: within 1% of it, exactly 1% included,
 * so values computed with π ≈ 3.14 or 22/7 are accepted.
 */
// @spec GSV-REQ-038
export function withinTolerance(supplied: number, derived: number): boolean {
  return Math.abs(supplied - derived) <= TOLERANCE * Math.abs(derived);
}

/** "a or b", "a, b or c". */
const alternatives = (terms: readonly string[]) =>
  terms.length === 1 ? terms[0]! : `${terms.slice(0, -1).join(", ")} or ${terms[terms.length - 1]}`;

/** Remove a value that failed from the result, and mark it failed. */
function dropFailed(state: StageState, term: string): void {
  const path = pointer(term);
  state.failed.add(path);
  delete state.description[term];
  delete state.provenance[path];
}

/**
 * Stage 3 (AD-004): for each derivation group, take the first supplied member that passed stage 2
 * as defining (in the group's documented order), derive every other member, check each other
 * supplied member against its derived value, and add the members that were not supplied.
 */
// @spec GSV-REQ-023, GSV-REQ-028, GSV-REQ-036, GSV-REQ-037, GSV-REQ-038, GSV-REQ-039
export function checkDerivations(
  definition: GraphTypeDefinition,
  properties: PropertyMap,
  graphType: GraphType,
  state: StageState,
): void {
  for (const group of definition.derivations) {
    const failed = (term: string) => touchesFailed(pointer(term), state.failed);
    const supplied = group.members.filter((term) => Object.hasOwn(state.description, term) && !failed(term));

    if (supplied.length === 0) {
      // A member that failed stage 2 was reported already; asking for one again would cascade.
      if (group.required && !group.members.some(failed)) {
        state.issues.push(
          createIssue("insufficient", pointer(), {
            term: graphType,
            detail: `one of ${alternatives(group.members)} is needed`,
          }),
        );
      }
      continue;
    }

    const defining = supplied[0]!;
    const definingValue = state.description[defining] as number;
    const derived = group.derive(defining, definingValue);

    // A value so large that a derived value overflows (a radius of 1e308) cannot be drawn.
    if (group.members.some((term) => !Number.isFinite(derived[term]))) {
      const spec = propertySpec(properties, defining);
      const max = spec !== undefined && (spec.kind === "number" || spec.kind === "integer") && spec.max !== undefined ? spec.max : Number.MAX_SAFE_INTEGER;
      state.issues.push(createIssue("out_of_range", pointer(defining), { term: defining, got: definingValue, range: { max } }));
      dropFailed(state, defining);
      continue;
    }

    for (const term of group.members) {
      if (term === defining) continue;
      const value = derived[term]!;
      // Every member is strictly positive by its stage-2 range, so no derived value is 0 and the
      // relative tolerance is always defined.
      if (value === 0) throw new Error("A derivation produced 0");
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
      } else if (!failed(term)) {
        // Added by vocabulary term on the null-prototype description, never by an input key.
        state.description[term] = value;
        state.provenance[path] = "derived";
      }
    }
  }
}
