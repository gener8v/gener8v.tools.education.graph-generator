import type { IssueCode } from "./issues";

/** Allowed numeric range for a value. Bounds are inclusive unless the matching flag is set. */
export interface Range {
  min?: number;
  max?: number;
  exclusiveMin?: boolean;
  exclusiveMax?: boolean;
}

/**
 * One problem found in a description. Plain JSON data: optional fields are omitted, never
 * `undefined`, so an issue survives `JSON.parse(JSON.stringify(issue))` unchanged.
 */
// @spec GSV-REQ-029, GSV-REQ-030, GSV-REQ-031, GSV-REQ-032, GSV-REQ-033
export interface Issue {
  code: IssueCode;
  /** JSON Pointer (RFC 6901) to the offending property; `""` is the whole description. */
  path: string;
  /** Plain-English message naming the property and what would make it acceptable. */
  message: string;
  /** The kind of value the property accepts, e.g. "a number". */
  expected?: string;
  range?: Range;
  /** JSON Pointers of the other properties involved in a contradiction. */
  conflicts?: string[];
  /** The closest applicable vocabulary term, for an unknown property name. */
  suggestion?: string;
  /** The accepted values: terms, graph types, color names or image names. */
  allowed?: string[];
}

/** Whether each value in a normalized description was supplied by the caller or derived. */
export type Provenance = Record<string, "supplied" | "derived">;

/** At least one issue. */
export type Issues = [Issue, ...Issue[]];

/**
 * The outcome of validating a description. `D` is the normalized description type, which the
 * validator defines.
 */
// @spec GSV-REQ-027, GSV-REQ-029, GSV-REQ-033
export type ValidationResult<D = unknown> =
  | { valid: true; description: D; provenance: Provenance }
  | { valid: false; issues: Issues };

export function validResult<D>(description: D, provenance: Provenance): ValidationResult<D> {
  return { valid: true, description, provenance };
}

/** An invalid result. Throws when given no issues: an invalid result always says why. */
export function invalidResult<D = never>(issues: readonly Issue[]): ValidationResult<D> {
  const [first, ...rest] = issues;
  if (first === undefined) {
    throw new Error("invalidResult needs at least one issue");
  }
  return { valid: false, issues: [first, ...rest] };
}
