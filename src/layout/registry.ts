import type { DescriptionBase, GraphType } from "../core/definitions/types";
import type { Provenance } from "../core/result";
import { circleLayout } from "./circle";
import type { Scene } from "./scene";

/**
 * A graph type's layout: a pure function from a normalized description of that type, and which of
 * its values were supplied or derived, to a Scene (AD-002, Layout contract). It is only ever called
 * with `validate(...).description` and `validate(...).provenance`; the provenance is how a label
 * shows a supplied value as written and a derived one rounded (GSS-REQ-034; GSS TICKET-002 DEL-001). Typed by the
 * type's description, like `GraphTypeDefinition<D>`; method syntax keeps the parameter bivariant,
 * as `GraphTypeDefinition.describe` does, so a layout typed for one graph type still fits the
 * shared table (quality review QR-002).
 */
export type Layout<D extends DescriptionBase = DescriptionBase> = { draw(normalized: D, provenance: Provenance): Scene }["draw"];

/** A set of layouts, keyed by graph type. */
export type LayoutRegistry = Readonly<Partial<Record<GraphType, Layout>>>;

/**
 * Every graph type's layout, keyed by its `type` value, on a null prototype. A graph-type ticket
 * registers its layout by adding one import and one entry here, the same rule as the definitions
 * in `src/core/definitions/index.ts`. Registration is not a call made when a type's module loads:
 * the package declares `"sideEffects": false`, so a bundler may drop such a call (CPSE TICKET-003
 * DEL-003).
 */
// Marked pure so a bundler drops the table, and every layout in it, wherever nothing reads it:
// per-type components draw with their own layout only (code review CR-002).
// @spec CPSE-REQ-007, CPSE-REQ-008
export const layouts: LayoutRegistry = /* @__PURE__ */ Object.freeze(
  /* @__PURE__ */ Object.assign(/* @__PURE__ */ Object.create(null) as Partial<Record<GraphType, Layout>>, {
    circle: circleLayout as Layout,
  }),
);

/**
 * The layout registered for `type` in `registry`, or `undefined` when there is none (including for
 * a value that is not a string). Reads own entries only, so a name such as `"constructor"` finds
 * nothing. The registry is always passed, never defaulted to `layouts`, so code that reads one
 * type's layout does not keep every layout in a bundle (code review CR-002).
 */
// @spec CPSE-REQ-008
export function getLayout(type: unknown, registry: LayoutRegistry): Layout | undefined {
  return typeof type === "string" && Object.hasOwn(registry, type) ? registry[type as GraphType] : undefined;
}
