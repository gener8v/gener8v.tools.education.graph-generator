import { type Registry, SUPPORTED_VERSIONS, registeredTypes } from "../definitions/index";
import type { GraphType } from "../definitions/types";
import { asTerms, createIssue, pointer } from "../issues";
import type { Issue } from "../result";
import { type ObjectContents, isPlainObject, readObject } from "./json";

export { CURRENT_VERSION, SUPPORTED_VERSIONS, registeredTypes } from "../definitions/index";

export type EnvelopeResult =
  | {
      ok: true;
      /** The description's own properties, read once; later stages never read the input again. */
      contents: ObjectContents;
      type: GraphType;
      /** The checked version, when one was given. */
      version: number | undefined;
    }
  | { ok: false; issues: Issue[] };

/**
 * Stage 1 (AD-004): the input is a JSON object, names a supported graph type, and is written for
 * a supported schema version. Any failure here stops validation, since nothing type-specific can
 * be checked.
 */
// @spec GSV-REQ-001, GSV-REQ-002, GSV-REQ-005, GSV-REQ-006, GSV-REQ-024, GSV-REQ-025
export function checkEnvelope(input: unknown, registry: Registry): EnvelopeResult {
  // JSON text is not parsed: parsing is the caller's job (GSV Assumptions).
  const contents = isPlainObject(input) ? readObject(input) : undefined;
  if (contents === undefined) {
    return { ok: false, issues: [createIssue("not_an_object", pointer(), { got: input })] };
  }
  const issues: Issue[] = [];
  for (const key of ["type", "version"]) {
    if (contents.opaque.includes(key)) {
      issues.push(createIssue("wrong_kind", pointer(key), { term: key, got: undefined, expected: "plain JSON data" }));
    }
  }
  if (issues.length > 0) return { ok: false, issues };

  const registered = registeredTypes(registry);
  // The registered types exactly. A registry with none is a package defect: `asTerms` throws and
  // the validator reports `internal_error` (GSV TICKET-003 code review CR-004, quality review QR-006).
  const allowed = asTerms(registered);
  const type = contents.values.get("type");
  if (type === undefined) {
    issues.push(createIssue("unknown_graph_type", pointer("type"), { allowed }));
  } else if (typeof type !== "string" || !(registered as readonly string[]).includes(type)) {
    issues.push(createIssue("unknown_graph_type", pointer("type"), { got: type, allowed }));
  }

  const version = contents.values.get("version");
  if (version !== undefined && !(SUPPORTED_VERSIONS as readonly unknown[]).includes(version)) {
    issues.push(createIssue("unsupported_version", pointer("version"), { got: version, allowed: asTerms(SUPPORTED_VERSIONS.map(String)) }));
  }

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, contents, type: type as GraphType, version: version as number | undefined };
}
