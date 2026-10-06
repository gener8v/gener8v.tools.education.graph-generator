import { sharedProperties } from "./shared";
import { type GraphType, type GraphTypeDefinition, type PropertyMap, type PropertySpec, defineProperties } from "./types";

/**
 * Every graph type's definition, keyed by its `type` value, on a null prototype. Each type ticket
 * adds one import and one entry here; TICKET-006 then requires all eleven graph types
 * (GSV-REQ-003).
 */
// @spec GSV-REQ-003, GSV-REQ-012
export const definitions: Readonly<Partial<Record<GraphType, GraphTypeDefinition>>> = Object.freeze(
  Object.assign(Object.create(null) as Partial<Record<GraphType, GraphTypeDefinition>>, {}),
);

/**
 * Every top-level term a graph type accepts: its definition's own properties plus each shared
 * option whose `appliesTo` names the type. The one place the validator, the schema generator and
 * the documentation read a type's terms from (code review CR-002).
 */
// @spec GSV-REQ-012, GSV-REQ-040
export function propertiesOf(type: GraphType, registry = definitions): PropertyMap {
  const merged: Record<string, PropertySpec> = {};
  for (const spec of Object.values(sharedProperties)) {
    if ((spec.appliesTo as readonly GraphType[]).includes(type)) merged[spec.term] = spec;
  }
  const definition = Object.hasOwn(registry, type) ? registry[type] : undefined;
  if (definition !== undefined) Object.assign(merged, definition.properties);
  return defineProperties(merged);
}
