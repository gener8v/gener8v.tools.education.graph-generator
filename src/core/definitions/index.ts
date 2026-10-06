import { sharedProperties } from "./shared";
import { GRAPH_TYPES, type GraphType, type GraphTypeDefinition, type PropertyMap, type PropertySpec, defineProperties } from "./types";

/** A set of graph-type definitions, keyed by `type` value. */
export type Registry = Readonly<Partial<Record<GraphType, GraphTypeDefinition>>>;

/**
 * Every graph type's definition, keyed by its `type` value, on a null prototype. Each type ticket
 * adds one import and one entry here; TICKET-006 then requires all eleven graph types
 * (GSV-REQ-003).
 */
// @spec GSV-REQ-003, GSV-REQ-012
export const definitions: Registry = Object.freeze(
  Object.assign(Object.create(null) as Partial<Record<GraphType, GraphTypeDefinition>>, {}),
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
 * Every top-level term a graph type accepts: its definition's own properties plus each shared
 * option whose `appliesTo` names the type. The one place the validator, the schema generator and
 * the documentation read a type's terms from (code review CR-002).
 */
// @spec GSV-REQ-012, GSV-REQ-040
export function propertiesOf(type: GraphType, registry: Registry = definitions): PropertyMap {
  const merged: Record<string, PropertySpec> = {};
  for (const spec of Object.values(sharedProperties)) {
    if ((spec.appliesTo as readonly GraphType[]).includes(type)) merged[spec.term] = spec;
  }
  const definition = Object.hasOwn(registry, type) ? registry[type] : undefined;
  if (definition !== undefined) Object.assign(merged, definition.properties);
  return defineProperties(merged);
}
