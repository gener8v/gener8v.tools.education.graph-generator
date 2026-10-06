import { GRAPH_TYPES, type GraphType, type GraphTypeDefinition } from "../definitions/types";
import type { Terms } from "../issues";
import { createIssue, pointer } from "../issues";
import type { Issue } from "../result";

/** Schema versions this package accepts; a description without `version` is the current one. */
export const SUPPORTED_VERSIONS = Object.freeze([1] as const);
export const CURRENT_VERSION = 1;

export type Registry = Readonly<Partial<Record<GraphType, GraphTypeDefinition>>>;

/** A JSON object: not an array, and made by an object literal, `JSON.parse` or `Object.create(null)`. */
export function isPlainObject(value: unknown): value is Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** The graph types with a registered definition, in `GRAPH_TYPES` order. */
export function registeredTypes(registry: Registry): GraphType[] {
  return GRAPH_TYPES.filter((type) => Object.hasOwn(registry, type) && registry[type] !== undefined);
}

export type EnvelopeResult =
  | { ok: true; description: Readonly<Record<string, unknown>>; type: GraphType }
  | { ok: false; issues: Issue[] };

/**
 * Stage 1 (AD-004): the input is a JSON object, names a supported graph type, and is written for
 * a supported schema version. Any failure here stops validation, since nothing type-specific can
 * be checked.
 */
// @spec GSV-REQ-001, GSV-REQ-002, GSV-REQ-005, GSV-REQ-006, GSV-REQ-024, GSV-REQ-025
export function checkEnvelope(input: unknown, registry: Registry): EnvelopeResult {
  if (!isPlainObject(input)) {
    // JSON text is not parsed: parsing is the caller's job (GSV Assumptions).
    return { ok: false, issues: [createIssue("not_an_object", pointer(), { got: input })] };
  }
  const issues: Issue[] = [];

  const registered = registeredTypes(registry);
  // Only while no type is registered yet (before the type tickets land) is the full list shown.
  const allowed = (registered.length > 0 ? registered : [...GRAPH_TYPES]) as unknown as Terms;
  const type = Object.hasOwn(input, "type") ? input["type"] : undefined;
  const known = typeof type === "string" && (registered as readonly string[]).includes(type);
  if (type === undefined) {
    issues.push(createIssue("unknown_graph_type", pointer("type"), { allowed }));
  } else if (!known) {
    issues.push(createIssue("unknown_graph_type", pointer("type"), { got: type, allowed }));
  }

  const version = Object.hasOwn(input, "version") ? input["version"] : undefined;
  if (version !== undefined && !(SUPPORTED_VERSIONS as readonly unknown[]).includes(version)) {
    const allowedVersions = SUPPORTED_VERSIONS.map(String) as unknown as Terms;
    issues.push(createIssue("unsupported_version", pointer("version"), { got: version, allowed: allowedVersions }));
  }

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, description: input, type: type as GraphType };
}
