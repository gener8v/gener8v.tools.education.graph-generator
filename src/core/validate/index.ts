import { type Registry, definitions } from "../definitions/index";
import type { DescriptionBase } from "../definitions/types";
import { createIssue, pointer } from "../issues";
import { type ValidationResult, invalidResult, validResult } from "../result";
import { propertiesOf } from "../definitions/index";
import { checkDerivations } from "./derive";
import { runDomainChecks } from "./domain";
import { checkEnvelope } from "./envelope";
import type { StageState } from "./state";
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
    // Over the description's value limit: nothing further is checked.
    if (structure.failed.has(pointer())) return invalidResult(structure.issues);

    // Stages 3 and 4 run on the values that passed stage 2, even when stage 2 found issues, so
    // every independent problem is reported in one pass (AD-004, GSV-REQ-017).
    const definition = registry[envelope.type]!;
    const state: StageState = {
      description: structure.description,
      provenance: structure.provenance,
      failed: new Set(structure.failed),
      issues: [...structure.issues],
    };
    checkDerivations(definition, propertiesOf(envelope.type, registry), envelope.type, state);
    runDomainChecks(definition, state);

    if (state.issues.length > 0) return invalidResult(state.issues);
    return validResult(state.description as DescriptionBase, state.provenance);
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
// @spec GSV-REQ-004, GSV-REQ-016, GSV-REQ-017, GSV-REQ-026, GSV-REQ-028, GSV-REQ-039
export function validate(input: unknown): ValidationResult<DescriptionBase> {
  return validateWith(input, definitions);
}

/** `normalize` against the given graph-type definitions. */
export function normalizeWith(input: unknown, registry: Registry): DescriptionBase {
  const result = validateWith(input, registry);
  if (!result.valid) throw new Error("normalize: the description is not valid; call validate first and read its issues");
  return result.description;
}

/**
 * The normalized description of a valid input: known properties only, derived values filled in,
 * colors resolved, empty labels dropped (GSV-REQ-028). For use after `validate` reported the input
 * valid; throws for an invalid one. Which values were derived is in `validate`'s `provenance`.
 */
// @spec GSV-REQ-028
export function normalize(input: unknown): DescriptionBase {
  return normalizeWith(input, definitions);
}
