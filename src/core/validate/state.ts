import type { Issue, Provenance } from "../result";

/** What stages 3 and 4 work on: stage 2's results, extended in place. */
export interface StageState {
  /** The normalized description (null prototype); derived values are added by term. */
  description: Record<string, unknown>;
  provenance: Provenance;
  /** JSON Pointers of values that failed a stage; later checks skip anything they touch. */
  failed: Set<string>;
  issues: Issue[];
}

/**
 * Whether a value touches a failure: it failed, something inside it failed, or something it is
 * inside failed (`""` is the whole description).
 */
export function touchesFailed(path: string, failed: ReadonlySet<string>): boolean {
  for (const failure of failed) {
    if (failure === "" || failure === path || failure.startsWith(`${path}/`) || path.startsWith(`${failure}/`)) return true;
  }
  return false;
}
