import { definitions } from "./definitions/index";
import type { DescriptionBase } from "./definitions/types";
import { describeValue } from "./issues";

/**
 * The plain-text alternative for a normalized description, written by its graph type's
 * definition. Throws when the value has no registered graph type, which a validated description
 * never lacks; the error quotes and clips whatever `type` was given.
 */
export function describe(normalized: DescriptionBase): string {
  const type: unknown = (normalized as { type?: unknown } | null | undefined)?.type;
  const definition = typeof type === "string" && Object.hasOwn(definitions, type) ? definitions[type as DescriptionBase["type"]] : undefined;
  if (definition === undefined) {
    throw new Error(`No definition is registered for graph type ${describeValue(type)}`);
  }
  return definition.describe(normalized);
}
