import type { Terms } from "../issues";
import type { Issue, Provenance } from "../result";

/**
 * The supported graph types (GSV-REQ-003), as `type` values in kebab case (AD-005): graph-library's
 * eleven and the `rulers` change's ruler. A listed type is offered only once its definition is
 * registered (`registeredTypes`). GSV TICKET-006 checks that every one of them has one.
 */
// @spec GSV-REQ-003
export const GRAPH_TYPES = Object.freeze([
  "number-line",
  "ruler",
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
 * `elementColor` sit on one point, segment, category or measured object, so they affect that
 * element only (GSV-REQ-045).
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
  /**
   * Whether an empty text means no text: the value is dropped, as if it were not given. Shared
   * presentation options always behave this way; another term opts in here, for example the
   * pictograph's value-unit label, whose key then says "units" (GSV TICKET-003 code review CR-007,
   * DGP TICKET-001 DEL-002). Without it, an empty text is kept, for example a blank label. Only for
   * an optional property: on a required one an empty text would satisfy the requirement, and on a
   * list item it would leave a hole; the definitions test rejects both (quality review QR-006).
   */
  emptyIsAbsent?: boolean;
  /**
   * The most characters (Unicode code points, as JSON Schema counts them) the text may have. A
   * longer text is reported as `too_large`, never cut, so caller text that is drawn whole stays
   * bounded (DGP TICKET-005 security review SEC-001).
   */
  maxLength?: number;
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
  /**
   * The issue code for a text value outside `values`, when the list is a published set with its own
   * code: `unknown_image` lists every allowed value and suggests the closest for a near miss, such
   * as "Apple" (DGP-REQ-031). Without it, a value outside the list is `wrong_kind`.
   */
  unknownCode?: "unknown_image";
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
// @spec GSV-REQ-012, GSV-REQ-043, GSV-REQ-051
export type PropertySpec = ValueSpec & {
  /** The vocabulary term, a camel-cased noun phrase (AD-005). */
  term: string;
  required: boolean;
  presentation?: PresentationOption;
  /**
   * When the property applies only while a sibling term has one of given values, as an inch
   * ruler's `smallestDivision` applies only when `unit` is `inches` (GSV-REQ-051). Given otherwise,
   * it is `inapplicable_property` at its own path, stating the condition, and its value is not
   * checked. When the sibling failed or is missing, which is already reported, the property's own
   * value is still checked, but whether it applies is not reported; either way it is left out
   * (DEL-002, code review CR-001). The schemas state the condition in the term's description.
   * Rules, which the definitions test checks: `term` names an `enum` sibling and `values` some of
   * its values; the property is optional, since a required one could never be satisfied on the
   * other values; and the sibling has no condition of its own, since conditions are not chained
   * (code review CR-007).
   */
  appliesWhen?: AppliesWhen;
};

/** When a property applies: while its sibling `term` has one of `values` (GSV-REQ-051). */
export interface AppliesWhen {
  readonly term: string;
  readonly values: Terms;
}

/**
 * A condition as words, `only when unit is "inches"` or `only when unit is "inches" or "feet"`,
 * with `name` the sibling as the reader should see it: its term in a schema, its full place
 * (`spare.unit`) in an issue. The one wording for the validator and the schemas, so the two cannot
 * drift (quality review QR-003).
 */
export function describeCondition(name: string, values: Terms): string {
  const quoted = values.map((value) => JSON.stringify(value));
  const choices = quoted.length === 1 ? quoted[0]! : `${quoted.slice(0, -1).join(", ")} or ${quoted[quoted.length - 1]!}`;
  return `only when ${name} is ${choices}`;
}

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
 * The inputs of a domain check that always runs, even after another value failed, and guards
 * itself (quality review QR-004): a failed list element reaches it as `null`, keeping the list's
 * length, and a failed or missing property is absent.
 */
export const ALWAYS_RUNS: readonly string[] = /* @__PURE__ */ Object.freeze([]);

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
   * bad tick spacing or a typo in another key, does not stop the check. `ALWAYS_RUNS` (an empty
   * list) means the check always runs and guards itself against a missing or failed value, as a
   * check that reads only list lengths does: a failed element stays as `null` and does not change
   * a length (DGP TICKET-005 code review CR-002). Such a check must read its description as
   * `unknown`, whatever its parameter type says.
   */
  inputs: readonly string[];
  /**
   * Paths the check reads that may be absent, such as an optional term with a default: the check
   * runs without them, and is skipped only when one of them failed, so it never reads a value
   * that was reported or left out (rulers GSV TICKET-001 code review CR-002). Unlike `inputs`, the
   * top-level property need not be present; below it, both lists behave the same, since `inputs`
   * checks presence only at the top level. A path belongs in one list, never both; the definitions
   * test refuses it in both (quality review QR-006). An inch ruler's
   * `smallestDivision` is one: absent means the default sixteenth, but a refused division
   * ("eighths") or one given on a centimetre ruler must stop a check that reads the ruler's marks.
   */
  optionalInputs?: readonly string[];
  // Method syntax keeps the parameter bivariant, so a check written for one graph type's
  // description can sit in the registry typed by `DescriptionBase`.
  check(description: D): readonly Issue[];
}

/**
 * What a solver returns: the values it determined, or the issues that stop it.
 * - `derived`: a value for each term the supplied values determine, the supplied ones included. The
 *   validator adds those that were not supplied, with provenance `derived`, and never changes a
 *   supplied one; the solver has already checked the supplied ones (GSV-REQ-038).
 * - `scale`: the supplied input whose value sets the figure's size, such as the first side of a
 *   triangle's determining set. A derived value outside its own term's range is reported as
 *   `out_of_range` there, with the range that keeps every `scaled` term in its own.
 * - `issues`: built with `createIssue`, as for a domain check.
 */
export type SolverResult =
  | { readonly derived: Readonly<Record<string, number>>; readonly scale: string }
  | { readonly issues: readonly Issue[] };

/**
 * A stage-3 solver, for a figure whose values are determined by sets of terms rather than by any
 * one member, such as a triangle's three sides, or two angles and a side (graph-library GSS
 * TICKET-004 DEL-001). It runs after the derivation groups and before the domain checks, and only
 * when no earlier failure touches any of its inputs, so its issues never follow from another issue
 * (AD-004). It receives a frozen copy of the inputs that are present, must build every issue with
 * `createIssue`, and must do a fixed amount of work. A result that breaks this contract (a derived
 * term that is not one of its top-level number inputs, a value that is not a finite number, a
 * `scale` that was not supplied, a hand-built issue) is a package defect, reported as
 * `internal_error`.
 */
export interface Solver<D extends DescriptionBase = DescriptionBase> {
  /** The top-level terms the solver reads; every term it derives is one of them. */
  readonly inputs: readonly string[];
  /**
   * The number inputs that grow in proportion to the figure's size, such as a triangle's sides
   * (not its angles): each has a positive `min` and a finite `max`, which the definitions test checks.
   */
  readonly scaled: readonly string[];
  // Method syntax keeps the parameter bivariant, as for `DomainCheck.check`.
  solve(values: Readonly<Partial<D>>): SolverResult;
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
  /** The type's stage-3 solver, for values determined by sets of terms (see `Solver`). */
  solve?: Solver<D>;
  /**
   * Where the type's element options go, such as "each series" for a line graph: given at the top
   * level, an option that applies only to the type's elements (a series' `lineLabel`) is reported
   * as not applying, with "give it on each series instead". Without a hint such a key is unknown
   * at the top level, with the terms valid there, which may name a whole-graph alternative (GSV
   * TICKET-003 QR-009; DGP TICKET-002 DEL-002, code review CR-003).
   */
  elementsHint?: string;
  /**
   * The plain-text alternative for a normalized description. `provenance` says which values were
   * supplied and which derived, so a supplied value is stated as written and a derived one rounded
   * (GSS-REQ-034): pass both to `formatMeasurement` (GSS TICKET-002 DEL-001).
   */
  describe(normalized: D, provenance: Provenance): string;
}
