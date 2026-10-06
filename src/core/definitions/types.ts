import type { Terms } from "../issues";
import type { Issue } from "../result";

/**
 * The graph types of this change (GSV-REQ-003), as `type` values in kebab case (AD-005).
 * TICKET-006 checks that every one of them has a registered definition.
 */
// @spec GSV-REQ-003
export const GRAPH_TYPES = Object.freeze([
  "number-line",
  "xy-graph",
  "xyz-graph",
  "line-graph",
  "bar-graph",
  "pictograph",
  "circle",
  "square",
  "triangle",
  "cube",
  "cylinder",
] as const);

export type GraphType = (typeof GRAPH_TYPES)[number];

/** The kinds of value a property accepts. There is no markup kind: text is always plain. */
export const PROPERTY_KINDS = Object.freeze([
  "number",
  "integer",
  "string",
  "boolean",
  "color",
  "enum",
  "object",
  "array",
] as const);

export type PropertyKind = (typeof PROPERTY_KINDS)[number];

/**
 * Which shared presentation option a property is (GSV-REQ-040). `elementLabel` and
 * `elementColor` sit on one point, segment or category, so they affect that element only
 * (GSV-REQ-045).
 */
// @spec GSV-REQ-040, GSV-REQ-045
export type PresentationOption = "title" | "lineColor" | "lineLabel" | "axisLabel" | "elementLabel" | "elementColor";

interface ValueBase {
  /** Plain-English definition, published with the schema and the vocabulary. */
  description: string;
}

/** A number; bounds are inclusive unless the matching flag is set, as in an issue's `range`. */
export interface NumberValue extends ValueBase {
  kind: "number" | "integer";
  min?: number;
  max?: number;
  exclusiveMin?: boolean;
  exclusiveMax?: boolean;
}

/**
 * Plain text, never interpreted as markup (GSV-REQ-043). Every output encodes it for its own
 * context: React text, an escaped string literal in exported source, quoted and cleaned text in
 * a text alternative or message. It is never rendered as HTML, Markdown or code.
 */
export interface StringValue extends ValueBase {
  kind: "string";
}

export interface BooleanValue extends ValueBase {
  kind: "boolean";
}

/** A published color name or a hexadecimal code (GSV-REQ-042); see `resolveColor`. */
export interface ColorValue extends ValueBase {
  kind: "color";
}

export interface EnumValue extends ValueBase {
  kind: "enum";
  values: Terms;
  /** A plain-English description of some or all values, published in the vocabulary (such as each pictograph image). */
  valueDescriptions?: Readonly<Record<string, string>>;
}

export interface ObjectValue extends ValueBase {
  kind: "object";
  properties: PropertyMap;
  /**
   * Pairs of number terms whose values must increase: in each `[lower, upper]`, lower < upper,
   * as for an axis's `min` and `max` (GSV-REQ-022). Checked once both values pass on their own.
   */
  ordered?: ReadonlyArray<readonly [lower: string, upper: string]>;
}

export interface ArrayValue extends ValueBase {
  kind: "array";
  /** What each element is. */
  items: ValueSpec;
  /**
   * The most elements the list may hold, a curriculum-sized number set by each graph type. A
   * longer list is reported once as `too_large`, and its elements are not checked (Product Owner
   * decision 2026-10-06, GSV TICKET-003 security review SEC-001).
   */
  maxItems: number;
}

/** The kind of value accepted, with what that kind needs. */
export type ValueSpec = NumberValue | StringValue | BooleanValue | ColorValue | EnumValue | ObjectValue | ArrayValue;

/**
 * One property of a description. A property's key in its map equals its `term`, and the spec
 * declares that term with its definition (GSV-REQ-012).
 */
// @spec GSV-REQ-012, GSV-REQ-043
export type PropertySpec = ValueSpec & {
  /** The vocabulary term, a camel-cased noun phrase (AD-005). */
  term: string;
  required: boolean;
  presentation?: PresentationOption;
};

/** A map of properties by term. Built with `defineProperties`, so it is frozen and has no prototype. */
export type PropertyMap = Readonly<Record<string, PropertySpec>>;

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const inner of Object.values(value)) deepFreeze(inner);
  }
  return value;
}

/**
 * A copy of an object on a null prototype, with nested objects treated the same. An object that
 * is already frozen was already defined, so it is kept as is: shared specs stay the same object
 * wherever they are used.
 */
function withoutPrototype<T extends object>(value: T): T {
  const copy = Object.assign(Object.create(null) as T, value);
  for (const [key, inner] of Object.entries(copy)) {
    if (inner !== null && typeof inner === "object" && !Array.isArray(inner) && !Object.isFrozen(inner)) {
      (copy as Record<string, unknown>)[key] = withoutPrototype(inner);
    }
  }
  return copy;
}

/**
 * A property map as definitions must publish it: every map and spec on a null prototype, and
 * frozen all the way down, so description keys such as `__proto__` or `toString` find nothing
 * and no module can change the vocabulary at runtime.
 */
export function defineProperties<const M extends PropertyMap>(properties: M): M {
  return deepFreeze(withoutPrototype(properties));
}

/** The spec for a key of a description, looked up as an own property only. */
export function propertySpec(properties: PropertyMap, key: string): PropertySpec | undefined {
  return Object.hasOwn(properties, key) ? properties[key] : undefined;
}

/** A description of some graph type, before its type-specific shape is known. */
export interface DescriptionBase {
  readonly type: GraphType;
  readonly [property: string]: unknown;
}

/**
 * A group of mutually determining values, such as radius, diameter and circumference
 * (GSV-REQ-035). Readable data: the schema generator and the documentation publish `members`
 * and `description`.
 */
// @spec GSV-REQ-035
export interface Derivation {
  /**
   * The members, each a top-level `number` term of the type with a positive `min` and a finite
   * `max`, in the documented defining order: the first supplied member that passed stage 2 defines
   * the rest (GSV-REQ-036). Every derived value is checked against its own member's range.
   */
  members: Terms;
  /** How the members relate, in plain English: "diameter = 2 × radius; circumference = 2π × radius". */
  description: string;
  /** Whether one member must be given; if none is, the graph cannot be determined (`insufficient`). */
  required: boolean;
  /** Every member's value, from the value of one member. */
  derive(term: string, value: number): Readonly<Record<string, number>>;
}

/**
 * A type-specific check that reports issues the shape alone cannot (domain stage, AD-004), such
 * as points outside an axis range. It runs only when the top-level property of each input is
 * present and no earlier failure touches any path it reads, so its issues never follow from
 * another issue. It receives the normalized description frozen, must build every issue with
 * `createIssue`, and must do work that grows with the description's size, never with a value's
 * magnitude.
 */
export interface DomainCheck<D extends DescriptionBase = DescriptionBase> {
  /** A short name for tests and documentation, such as "points inside the axes". */
  name: string;
  /**
   * The paths the check reads, as JSON Pointers without the leading slash; `*` stands for any
   * list position: `["xAxis/min", "xAxis/max", "points/*\/x"]`. A failure elsewhere, such as a
   * bad tick spacing or a typo in another key, does not stop the check.
   */
  inputs: Terms;
  // Method syntax keeps the parameter bivariant, so a check written for one graph type's
  // description can sit in the registry typed by `DescriptionBase`.
  check(description: D): readonly Issue[];
}

/** Everything about one graph type, the single source for types, schemas, vocabulary and validation (AD-003). */
export interface GraphTypeDefinition<D extends DescriptionBase = DescriptionBase> {
  type: D["type"];
  /** A short name, e.g. "Circle". */
  title: string;
  description: string;
  /**
   * The type's own terms, built with `defineProperties`. Shared top-level options are never
   * listed here: `propertiesOf(type)` merges in those whose `appliesTo` names the type.
   */
  properties: PropertyMap;
  derivations: readonly Derivation[];
  checks: readonly DomainCheck<D>[];
  /** The plain-text alternative for a normalized description. */
  describe(normalized: D): string;
}
