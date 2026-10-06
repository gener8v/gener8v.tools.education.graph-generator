import { definitions } from "./definitions/index";
import type { DescriptionBase } from "./definitions/types";

/**
 * The plain-text alternative for a normalized description, written by its graph type's
 * definition. Throws when the type has no definition, which a validated description never lacks.
 */
export function describe(normalized: DescriptionBase): string {
  const definition = Object.hasOwn(definitions, normalized.type) ? definitions[normalized.type] : undefined;
  if (definition === undefined) {
    throw new Error(`No definition is registered for graph type ${JSON.stringify(normalized.type)}`);
  }
  return definition.describe(normalized);
}

/** A number for reading: at most two decimals, trailing zeros dropped, never "-0". */
export function formatNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

/** "a", "a and b", "a, b and c". */
export function formatList(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** A measurement with its unit when one is given: "5 cm", or "5". */
export function formatMeasurement(value: number, unit?: string): string {
  return unit ? `${formatNumber(value)} ${unit}` : formatNumber(value);
}
