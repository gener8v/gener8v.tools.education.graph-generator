import { type Registry, definitions } from "./definitions/index";
import type { DescriptionBase } from "./definitions/types";
import { describeValue } from "./issues";
import { validateWith } from "./validate/index";

/**
 * The text alternative of a description that is already normalized, written by its graph type's
 * definition. For package code that holds `validate(...).description`. Throws when the value has
 * no registered graph type; the error quotes and clips whatever `type` was given.
 */
export function describeNormalized(normalized: DescriptionBase, registry: Registry = definitions): string {
  const type: unknown = (normalized as { type?: unknown } | null | undefined)?.type;
  const definition = typeof type === "string" && Object.hasOwn(registry, type) ? registry[type as DescriptionBase["type"]] : undefined;
  if (definition === undefined) {
    throw new Error(`No definition is registered for graph type ${describeValue(type)}`);
  }
  return definition.describe(normalized);
}

/**
 * The plain-text alternative for a description. It validates the input first, so a type's text
 * alternative only ever reads normalized values; throws one fixed error for an invalid input
 * (security review SEC-005 on TICKET-004). Call `validate` to learn why.
 */
export function describe(input: unknown): string {
  return describeWith(input, definitions);
}

/** `describe` against the given graph-type definitions. */
export function describeWith(input: unknown, registry: Registry): string {
  const result = validateWith(input, registry);
  if (!result.valid) throw new Error("describe: the description is not valid; call validate first and read its issues");
  return describeNormalized(result.description, registry);
}
