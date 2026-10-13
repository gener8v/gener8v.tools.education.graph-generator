import { type Registry, definitions, registeredTypes } from "./core/definitions/index";
import type { DescriptionBase } from "./core/definitions/types";
import { asTerms, createIssue, pointer } from "./core/issues";
import type { Issues, Provenance } from "./core/result";
import { type LayoutRegistry, getLayout, layouts } from "./layout/registry";
import type { Scene } from "./layout/scene";
import { checkScene } from "./layout/kit/check";
import { validateWith } from "./core/validate/index";

/**
 * What `createGraph` returns: a renderable graph with the normalized description it was drawn
 * from and which of its values were derived, or the issues that stop it being drawn. Plain data.
 */
export type CreateGraphResult =
  | { ok: true; description: DescriptionBase; provenance: Provenance; scene: Scene }
  | { ok: false; issues: Issues };

const internalError = (): CreateGraphResult => ({ ok: false, issues: [createIssue("internal_error", pointer(), {})] });

/** `createGraph` against the given definitions and layouts. */
export function createGraphWith(input: unknown, registry: Registry, layoutRegistry: LayoutRegistry): CreateGraphResult {
  try {
    const result = validateWith(input, registry);
    if (!result.valid) return { ok: false, issues: result.issues };
    const { description, provenance } = result;
    const layout = getLayout(description.type, layoutRegistry);
    if (layout === undefined) {
      // A defined type with no layout yet: say which types can be drawn.
      const drawable = registeredTypes(registry).filter((type) => getLayout(type, layoutRegistry) !== undefined);
      const issue =
        drawable.length > 0
          ? createIssue("unknown_graph_type", pointer("type"), { got: description.type, allowed: asTerms(drawable) })
          : createIssue("internal_error", pointer(), {});
      return { ok: false, issues: [issue] };
    }
    const scene = layout(description, provenance);
    // A layout that returns a malformed Scene, rather than throwing, is the same defect: the
    // components would throw while drawing it. checkScene throws on some shapes; the catch below
    // takes those too (security review SEC-002).
    if (checkScene(scene).length > 0) return internalError();
    return { ok: true, description, provenance, scene };
  } catch {
    // A layout that throws (for example `fmt()` on an extreme value), or a malformed Scene, is a
    // package defect. Its message and stack never reach the caller (GSV TICKET-002 SEC-003).
    return internalError();
  }
}

/**
 * The single entry function (CPSE-REQ-009): checks a description of any graph type and returns
 * either `{ ok: true, description, provenance, scene }` — the normalized description, which values
 * were derived, and the drawing — or `{ ok: false, issues }` with every issue found. Never throws,
 * whatever it is given (CPSE-REQ-018).
 *
 * The validator bounds its own work, but it still reads the whole input object: a server that
 * renders descriptions from requests must keep its own request-body size limit (GSV TICKET-003
 * security review SEC-001).
 */
// @spec CPSE-REQ-009, CPSE-REQ-014, CPSE-REQ-018
export function createGraph(description: unknown): CreateGraphResult {
  return createGraphWith(description, definitions, layouts);
}
