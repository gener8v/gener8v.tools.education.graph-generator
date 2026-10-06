import type { DescriptionBase, GraphTypeDefinition } from "../definitions/types";
import { pointer } from "../issues";
import { type StageState, touchesFailed } from "./state";

/**
 * Stage 4 (AD-004): run the type's domain checks whose inputs are all present and untouched by
 * any earlier failure, and merge their issues into the one list. A check that would read a
 * failed value is skipped, so its issues never follow from another issue.
 */
// @spec GSV-REQ-023
export function runDomainChecks(definition: GraphTypeDefinition, state: StageState): void {
  for (const check of definition.checks) {
    const ready = check.inputs.every(
      (term) => Object.hasOwn(state.description, term) && !touchesFailed(pointer(term), state.failed),
    );
    if (!ready) continue;
    state.issues.push(...check.check(state.description as DescriptionBase));
  }
}
