import { type Registry, definitions } from "../definitions/index";
import type { DescriptionBase } from "../definitions/types";
import { createIssue, pointer } from "../issues";
import { type ValidationResult, invalidResult, validResult } from "../result";
import { checkEnvelope } from "./envelope";
import { checkStructure } from "./structure";

/**
 * Check a description against the given graph-type definitions. Never throws: an unexpected
 * exception becomes one `internal_error` issue with a fixed message, so no exception text, path
 * or stack reaches a caller or a model (GSV TICKET-002 security review SEC-003).
 */
export function validateWith(input: unknown, registry: Registry): ValidationResult<DescriptionBase> {
  try {
    const envelope = checkEnvelope(input, registry);
    if (!envelope.ok) return invalidResult(envelope.issues);
    const structure = checkStructure(envelope.contents, envelope.type, envelope.version, registry);
    // Stages 3 (derivation) and 4 (domain) are added by GSV TICKET-004.
    if (structure.issues.length > 0) return invalidResult(structure.issues);
    return validResult(structure.description as DescriptionBase, structure.provenance);
  } catch {
    return invalidResult([createIssue("internal_error", pointer(), {})]);
  }
}

/**
 * The single point of entry for checking a description of any graph type (GSV-REQ-004). Runs
 * without rendering and without a browser (GSV-REQ-026), and reports every independent issue in
 * one pass (GSV-REQ-017). Callers render only from the description of a valid result
 * (GSV-REQ-016).
 */
// @spec GSV-REQ-004, GSV-REQ-016, GSV-REQ-017, GSV-REQ-026
export function validate(input: unknown): ValidationResult<DescriptionBase> {
  return validateWith(input, definitions);
}
