import type { Issue, Provenance } from "../result";

/** What stages 3 and 4 work on: stage 2's results, extended in place. */
export interface StageState {
  /** The normalized description (null prototype); derived values are added by term. */
  description: Record<string, unknown>;
  provenance: Provenance;
  /** JSON Pointers of values that did not pass a stage; later checks skip anything they touch. */
  failed: Set<string>;
  issues: Issue[];
}

const segmentsOf = (pointer: string) => (pointer === "" ? [] : pointer.slice(1).split("/"));

/**
 * Whether a path pattern touches a failure: the failure is at, inside or around a path the
 * pattern names. Patterns are JSON Pointers without the leading slash, where `*` matches any list
 * position (`points/*\/x`); `""` as a failure is the whole description.
 */
export function touchesFailed(pattern: string, failed: ReadonlySet<string>): boolean {
  const wanted = pattern.split("/");
  for (const failure of failed) {
    const found = segmentsOf(failure);
    const shared = Math.min(wanted.length, found.length);
    let related = true;
    for (let i = 0; i < shared && related; i++) {
      related = wanted[i] === "*" ? /^\d+$/.test(found[i]!) : wanted[i] === found[i];
    }
    if (related) return true;
  }
  return false;
}

/** Freeze a value and everything inside it. */
export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const inner of Object.values(value)) deepFreeze(inner);
  }
  return value;
}
