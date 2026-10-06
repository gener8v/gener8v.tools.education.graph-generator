import type { GraphType, GraphTypeDefinition } from "./types";

/**
 * Every graph type's definition, keyed by its `type` value. Each type ticket adds one import and
 * one entry here; TICKET-006 then requires all eleven graph types (GSV-REQ-003).
 */
// @spec GSV-REQ-003, GSV-REQ-012
export const definitions: Readonly<Partial<Record<GraphType, GraphTypeDefinition>>> = Object.freeze({});
