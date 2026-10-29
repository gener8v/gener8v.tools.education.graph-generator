import { dataGraphProperties } from "./categories";
import { barGraph } from "./bar-graph";
import { circle } from "./circle";
import { lineGraph } from "./line-graph";
import { numberLine } from "./number-line";
import { pictograph } from "./pictograph";
import { ruler } from "./ruler";
import { square } from "./square";
import { triangle } from "./triangle";
import { type ScopedPropertySpec, sharedProperties } from "./shared";
import { xyGraph } from "./xy-graph";
import { xyzGraph } from "./xyz-graph";
import { GRAPH_TYPES, type GraphType, type GraphTypeDefinition, type PropertyMap, type PropertySpec, defineProperties } from "./types";

/** A set of graph-type definitions, keyed by `type` value. */
export type Registry = Readonly<Partial<Record<GraphType, GraphTypeDefinition>>>;

/**
 * Every graph type's definition, keyed by its `type` value, on a null prototype. Each type ticket
 * adds one import and one entry here, with no cast: `satisfies` checks that each entry is a whole
 * definition (GSS TICKET-002 quality review QR-005). GSV TICKET-006 then requires every graph
 * type in `GRAPH_TYPES` (GSV-REQ-003): graph-library's eleven and the `rulers` change's ruler.
 */
// Marked pure so a bundler drops the table, and every definition in it, wherever nothing reads it:
// per-type components validate with their own definition only (GSS TICKET-002 DEL-002; CPSE
// TICKET-003 code review CR-002).
// @spec GSV-REQ-003, GSV-REQ-012
export const definitions: Registry = /* @__PURE__ */ Object.freeze(
  /* @__PURE__ */ Object.assign(/* @__PURE__ */ Object.create(null) as Partial<Record<GraphType, GraphTypeDefinition>>, {
    "number-line": numberLine,
    "xy-graph": xyGraph,
    "xyz-graph": xyzGraph,
    "line-graph": lineGraph,
    "bar-graph": barGraph,
    pictograph,
    circle,
    ruler,
    square,
    triangle,
  } satisfies Partial<Record<GraphType, GraphTypeDefinition>>),
);

/** Schema versions this package accepts; a description without `version` is the current one. */
export const SUPPORTED_VERSIONS = Object.freeze([1] as const);
export const CURRENT_VERSION = 1;

/**
 * The graph types with a registered definition, in `GRAPH_TYPES` order. The one rule the
 * validator, the schema, the vocabulary and the types all use (quality review QR-005 on TICKET-005).
 */
export function registeredTypes(registry: Registry): GraphType[] {
  return GRAPH_TYPES.filter((type) => Object.hasOwn(registry, type) && registry[type] !== undefined);
}

/**
 * The terms defined once with where they apply, rather than in one type's definition: the shared
 * presentation options, and the data-graph terms such as `valueScale` (DGP TICKET-001). Each term
 * is in one map only; the definitions test checks it.
 */
export const scopedPropertyMaps: ReadonlyArray<Readonly<Record<string, ScopedPropertySpec>>> = [sharedProperties, dataGraphProperties];

/** The scoped spec for a term, with its `appliesTo` and `elementsOf`, or `undefined` for any other key. */
export function scopedProperty(key: string): ScopedPropertySpec | undefined {
  for (const map of scopedPropertyMaps) {
    // An own key only, as `propertySpec` looks it up, keeping the scoped type.
    if (Object.hasOwn(map, key)) return map[key];
  }
  return undefined;
}

/**
 * Every top-level term a graph type accepts: its definition's own properties plus each scoped
 * term whose `appliesTo` names the type. The one place the validator, the schema generator and
 * the documentation read a type's terms from (code review CR-002). The registry is always passed,
 * never defaulted to `definitions` (GSS TICKET-002 DEL-002).
 */
// @spec GSV-REQ-012, GSV-REQ-040, DGP-REQ-002, DGP-REQ-005
export function propertiesOf(type: GraphType, registry: Registry): PropertyMap {
  const merged: Record<string, PropertySpec> = {};
  for (const map of scopedPropertyMaps) {
    for (const spec of Object.values(map)) {
      if (spec.appliesTo.includes(type)) merged[spec.term] = spec;
    }
  }
  const definition = Object.hasOwn(registry, type) ? registry[type] : undefined;
  if (definition !== undefined) Object.assign(merged, definition.properties);
  return defineProperties(merged);
}
