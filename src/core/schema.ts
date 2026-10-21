import { type Registry, SUPPORTED_VERSIONS, definitions, propertiesOf, registeredTypes } from "./definitions/index";
import { type GraphType, type PropertyKind, type PropertyMap, type PropertySpec, type ValueSpec, describeCondition } from "./definitions/types";
import { PLAIN_TEXT_PATTERN } from "./format";
import type { Range } from "./result";
import { namedColors } from "./style";
import { deepFreeze } from "./validate/state";
import { DESCRIPTION_VALUE_LIMIT } from "./validate/structure";

// The published schema, the strict tool schema, the vocabulary and the description types are all
// built here from the one set of definitions (AD-003, GSV-REQ-015). `scripts/generate.ts` writes
// them to files; the getters build them at run time from the same code, so files, getters and the
// validator cannot disagree.

/** A JSON Schema object, as plain JSON data. */
export type JsonSchema = { [keyword: string]: unknown };

/** A value and everything inside it, read-only: what the getters return, frozen. */
export type DeepReadonly<T> = T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;

const SCHEMA_DIALECT = "https://json-schema.org/draft/2020-12/schema";
const COLOR_NAMES = Object.keys(namedColors);

/** The `type` and `version` terms every description carries, described once for every output. */
const TYPE_DEFINITION = "The graph type: which kind of graph the description draws.";
const VERSION_DEFINITION = `The schema version the description is written for. Leave it out for the current version, ${SUPPORTED_VERSIONS[SUPPORTED_VERSIONS.length - 1]}.`;

// The rules every value follows, stated once at the root rather than on every property (quality
// review QR-008 on TICKET-005), including those only the validator checks (DEL-003).
const RULES =
  `Text is plain text: control, line-break, text-direction and invisible characters are not accepted. ` +
  `A color is a color name (${COLOR_NAMES.join(", ")}) in any case, or a hex code such as #0072b2. ` +
  `The package's validator also checks what this schema cannot: tag characters, rare variation selectors and broken ` +
  `surrogates in text; values that determine one another must agree within 1%; ranges must have their minimum below ` +
  `their maximum; a term given only when another term has a stated value; type-specific rules such as points inside ` +
  `the axes; and at most ${DESCRIPTION_VALUE_LIMIT} values in ` +
  `one description. Schema and validator agree on the JSON form of a description.`;

/** "radius, diameter or circumference". */
const alternatives = (terms: readonly string[]) =>
  terms.length === 1 ? terms[0]! : `${terms.slice(0, -1).join(", ")} or ${terms[terms.length - 1]}`;

/**
 * A pattern accepting what `resolveColor` accepts: a named color in any ASCII case, or a `#rgb`
 * or `#rrggbb` code (code review CR-006 and security review SEC-004 on TICKET-001).
 */
export const COLOR_PATTERN = `^(?:#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})|${COLOR_NAMES.map((name) =>
  [...name].map((letter) => `[${letter.toUpperCase()}${letter}]`).join(""),
).join("|")})$`;

type Profile = "published" | "tool";

const JSON_TYPE: Record<PropertyKind, string> = {
  number: "number",
  integer: "integer",
  string: "string",
  boolean: "boolean",
  color: "string",
  enum: "string",
  object: "object",
  array: "array",
};

function describeValue(spec: ValueSpec): string {
  const notes = [spec.description];
  if (spec.kind === "object") {
    for (const [lower, upper] of spec.ordered ?? []) notes.push(`${upper} must be greater than ${lower}.`);
  }
  return notes.join(" ");
}

/**
 * A property's description: its value's, with the condition only the validator checks stated as a
 * note, in the validator's own words (`describeCondition`; code review CR-006, quality review
 * QR-003).
 */
function describeProperty(spec: PropertySpec): string {
  const note = spec.appliesWhen === undefined ? [] : [`Give it ${describeCondition(spec.appliesWhen.term, spec.appliesWhen.values)}.`];
  return [describeValue(spec), ...note].join(" ");
}

/** The schema of one value. In the tool profile, an optional value also accepts `null`. */
// @spec GSV-REQ-054
function valueSchema(spec: ValueSpec, profile: Profile, nullable: boolean): JsonSchema {
  const jsonType = JSON_TYPE[spec.kind];
  const schema: JsonSchema = { type: nullable ? [jsonType, "null"] : jsonType, description: describeValue(spec) };
  switch (spec.kind) {
    case "number":
    case "integer":
      if (spec.min !== undefined) schema[spec.exclusiveMin ? "exclusiveMinimum" : "minimum"] = spec.min;
      if (spec.max !== undefined) schema[spec.exclusiveMax ? "exclusiveMaximum" : "maximum"] = spec.max;
      break;
    case "string":
      // The published schema checks the plain-text policy up to U+FFFF (security review SEC-001);
      // the tool profile leaves it to the validator, which the tool handler always runs.
      if (profile === "published") schema["pattern"] = PLAIN_TEXT_PATTERN;
      if (spec.maxLength !== undefined) schema["maxLength"] = spec.maxLength;
      break;
    case "color":
      schema["pattern"] = COLOR_PATTERN;
      break;
    case "enum":
      schema["enum"] = nullable ? [...spec.values, null] : [...spec.values];
      break;
    case "object":
      Object.assign(schema, objectSchema(spec.properties, profile));
      break;
    case "array":
      schema["items"] = valueSchema(spec.items, profile, false);
      schema["maxItems"] = spec.maxItems;
      break;
  }
  return schema;
}

/** `properties`, `required` and `additionalProperties: false` for a property map. */
function objectSchema(properties: PropertyMap, profile: Profile, extra: Record<string, JsonSchema> = {}): JsonSchema {
  const schemas: Record<string, JsonSchema> = { ...extra };
  const required: string[] = Object.keys(extra);
  for (const spec of Object.values(properties)) {
    const optionalInTool = profile === "tool" && !spec.required;
    schemas[spec.term] = valueSchema(spec, profile, optionalInTool);
    schemas[spec.term]!["description"] = describeProperty(spec);
    // The strict profile lists every property as required; optional ones accept null instead.
    if (spec.required || profile === "tool") required.push(spec.term);
  }
  return { properties: schemas, required, additionalProperties: false };
}

/** One graph type's closed object, in either profile (AD-006). */
function typeSchema(type: GraphType, registry: Registry, profile: Profile): JsonSchema {
  const definition = registry[type]!;
  const groups = definition.derivations.filter((group) => group.required);
  const description = [
    definition.description,
    ...groups.map((group) => `Give one of ${alternatives(group.members)}; the others are worked out from it.`),
  ].join(" ");
  const versions = [...SUPPORTED_VERSIONS];
  const envelope: Record<string, JsonSchema> =
    profile === "published"
      ? {
          type: { const: type, description: TYPE_DEFINITION },
          version: { enum: versions, description: VERSION_DEFINITION },
        }
      : {
          // `enum`, not `const`: the most widely supported form in provider subsets (DEL-007).
          type: { type: "string", enum: [type], description: TYPE_DEFINITION },
          version: { type: ["integer", "null"], enum: [...versions, null], description: `${VERSION_DEFINITION} Null means the current version.` },
        };
  const schema: JsonSchema = { type: "object", title: definition.title, description, ...objectSchema(propertiesOf(type, registry), profile, envelope) };
  if (profile === "published") {
    // `version` is optional in the published profile.
    schema["required"] = (schema["required"] as string[]).filter((term) => term !== "version");
    // A required derivation group: one of its members must be present (DEL-005).
    if (groups.length === 1) schema["anyOf"] = groups[0]!.members.map((member) => ({ required: [member] }));
    if (groups.length > 1) schema["allOf"] = groups.map((group) => ({ anyOf: group.members.map((member) => ({ required: [member] })) }));
  }
  return schema;
}

const NO_TYPES = "No graph types are registered yet.";

/**
 * The published JSON Schema 2020-12 of the unified description: a root `anyOf` of one closed
 * object per graph type, each selected by `type` as a `const` (AD-006 supersedes the `oneOf`
 * reading of GSV-REQ-008).
 */
// @spec GSV-REQ-007, GSV-REQ-008, GSV-REQ-009, GSV-REQ-011, GSV-REQ-015
export function buildSchema(registry: Registry): JsonSchema {
  const types = registeredTypes(registry);
  const root: JsonSchema = { $schema: SCHEMA_DIALECT, title: "Graph description" };
  if (types.length === 0) return { ...root, description: NO_TYPES, not: {} };
  return {
    ...root,
    description: `One graph, described by its type and the values that type accepts. ${RULES}`,
    anyOf: types.map((type) => typeSchema(type, registry, "published")),
  };
}

/**
 * The strict tool-profile schema: an object root holding the description under `graph`, every
 * object closed, every property required, optional values nullable (AD-006, prd/IC-001).
 */
// @spec GSV-REQ-015
export function buildToolSchema(registry: Registry): JsonSchema {
  const types = registeredTypes(registry);
  const graph: JsonSchema =
    types.length === 0
      ? // Still within the strict profile while no type exists (code review CR-006 on TICKET-005).
        { type: "object", description: NO_TYPES, properties: {}, required: [], additionalProperties: false }
      : {
          description: `One graph, described by its type and the values that type accepts; null means "not given". ${RULES}`,
          anyOf: types.map((type) => typeSchema(type, registry, "tool")),
        };
  return { type: "object", properties: { graph }, required: ["graph"], additionalProperties: false };
}

/** How one graph type uses a term (or one list element), in the published vocabulary. */
export interface TermUse {
  kind: PropertyKind;
  required?: boolean;
  range?: Range;
  values?: string[];
  /** Plain-English descriptions of enum values, where the definition gives them. */
  valueDescriptions?: Record<string, string>;
  maxItems?: number;
  /** The most characters a text may have, where the definition sets one. */
  maxLength?: number;
  ordered?: Array<[string, string]>;
  /**
   * When the term applies only while a sibling term has one of these values (GSV-REQ-051). The
   * JSON schemas still accept the term there; validation reports it as `inapplicable_property`.
   */
  appliesWhen?: { term: string; values: string[] };
  items?: TermUse;
  properties?: Record<string, TermUse>;
}

export interface Vocabulary {
  /** The description schema versions this package accepts; the last is the current one. */
  descriptionVersions: number[];
  /** Every term once, with its plain-English definition and the kind of value it takes. */
  terms: Record<string, { definition: string; kind: PropertyKind }>;
  /** Per graph type: what it is, the terms it accepts, and how values determine one another. */
  graphTypes: Partial<
    Record<
      GraphType,
      {
        title: string;
        description: string;
        properties: Record<string, TermUse>;
        derivations: Array<{ members: string[]; description: string; required: boolean }>;
        checks: string[];
      }
    >
  >;
  colors: Record<string, string>;
  limits: { descriptionValues: number };
}

type Terms = Vocabulary["terms"];

/** Record a term's definition once; the table has no prototype, so any term name is safe (SEC-002). */
function defineTerm(terms: Terms, term: string, definition: string, kind: PropertyKind): void {
  if (!Object.hasOwn(terms, term)) terms[term] = { definition, kind };
}

// @spec GSV-REQ-054
function termUse(spec: ValueSpec, required: boolean | undefined, terms: Terms): TermUse {
  const use: TermUse = { kind: spec.kind };
  if (required !== undefined) use.required = required;
  if (spec.kind === "number" || spec.kind === "integer") {
    const range: Range = {};
    if (spec.min !== undefined) range.min = spec.min;
    if (spec.max !== undefined) range.max = spec.max;
    if (spec.exclusiveMin) range.exclusiveMin = true;
    if (spec.exclusiveMax) range.exclusiveMax = true;
    if (Object.keys(range).length > 0) use.range = range;
  }
  if (spec.kind === "enum") {
    use.values = [...spec.values];
    if (spec.valueDescriptions !== undefined) use.valueDescriptions = { ...spec.valueDescriptions };
  }
  if (spec.kind === "string" && spec.maxLength !== undefined) use.maxLength = spec.maxLength;
  if (spec.kind === "array") {
    use.maxItems = spec.maxItems;
    use.items = termUse(spec.items, undefined, terms);
  }
  if (spec.kind === "object") {
    use.properties = termUses(spec.properties, terms);
    if (spec.ordered !== undefined) use.ordered = spec.ordered.map(([lower, upper]) => [lower, upper]);
  }
  return use;
}

/**
 * How a map's terms are used, each defined once in `terms`, with every fixed list of values and
 * its descriptions (GSV-REQ-049, GSV-REQ-050) and every condition on a term (GSV-REQ-051).
 */
// @spec GSV-REQ-049, GSV-REQ-050, GSV-REQ-051
function termUses(properties: PropertyMap, terms: Terms): Record<string, TermUse> {
  const uses: Record<string, TermUse> = {};
  for (const spec of Object.values(properties) as PropertySpec[]) {
    // One entry per term: the definitions test guarantees each term has one definition.
    defineTerm(terms, spec.term, spec.description, spec.kind);
    uses[spec.term] = termUse(spec, spec.required, terms);
    if (spec.appliesWhen !== undefined) uses[spec.term]!.appliesWhen = { term: spec.appliesWhen.term, values: [...spec.appliesWhen.values] };
  }
  return uses;
}

/**
 * The published vocabulary: every term with its definition, and per graph type the terms it
 * accepts (required or optional, kind, range), its derivation groups and its checks
 * (GSV-REQ-013, GSV-REQ-014, GSV-REQ-035). `type` and `version` are terms too (GSV-REQ-012). The
 * shared options' `appliesTo` and `elementsOf` are not published; their effect is in each type's
 * terms.
 */
// @spec GSV-REQ-012, GSV-REQ-013, GSV-REQ-014, GSV-REQ-015, GSV-REQ-035
export function buildVocabulary(registry: Registry): Vocabulary {
  const terms = Object.create(null) as Terms;
  const graphTypes: Vocabulary["graphTypes"] = {};
  const types = registeredTypes(registry);
  if (types.length > 0) {
    defineTerm(terms, "type", TYPE_DEFINITION, "enum");
    defineTerm(terms, "version", VERSION_DEFINITION, "integer");
  }
  const versions = [...SUPPORTED_VERSIONS];
  for (const type of types) {
    const definition = registry[type]!;
    graphTypes[type] = {
      title: definition.title,
      description: definition.description,
      properties: {
        type: { kind: "enum", required: true, values: [type] },
        version: { kind: "integer", required: false, range: { min: Math.min(...versions), max: Math.max(...versions) } },
        ...termUses(propertiesOf(type, registry), terms),
      },
      derivations: definition.derivations.map((group) => ({
        members: [...group.members],
        description: group.description,
        required: group.required,
      })),
      checks: definition.checks.map((check) => check.name),
    };
  }
  const sortedTerms: Terms = {};
  for (const term of Object.keys(terms).sort()) sortedTerms[term] = terms[term]!;
  return {
    descriptionVersions: versions,
    terms: sortedTerms,
    graphTypes,
    colors: { ...namedColors },
    limits: { descriptionValues: DESCRIPTION_VALUE_LIMIT },
  };
}

const pascal = (type: string) => type.split("-").map((part) => part[0]!.toUpperCase() + part.slice(1)).join("");
const comment = (text: string, indent: string) => `${indent}/** ${text.replace(/\*\//g, "*\\/")} */\n`;

function tsType(spec: ValueSpec, indent: string): string {
  switch (spec.kind) {
    case "number":
    case "integer":
      return "number";
    case "string":
    case "color":
      return "string";
    case "boolean":
      return "boolean";
    case "enum":
      return spec.values.map((value) => JSON.stringify(value)).join(" | ");
    case "array":
      return `ReadonlyArray<${tsType(spec.items, indent)}>`;
    case "object":
      return `{\n${tsMembers(spec.properties, `${indent}  `)}${indent}}`;
  }
}

function tsMembers(properties: PropertyMap, indent: string): string {
  return Object.values(properties)
    .map((spec) => `${comment(spec.description, indent)}${indent}${spec.term}${spec.required ? "" : "?"}: ${tsType(spec, indent)};\n`)
    .join("");
}

/**
 * TypeScript source for the description types: one interface per graph type and their union,
 * `GraphDescription` (`never` while no type is registered).
 */
// @spec GSV-REQ-015
export function buildDescriptionTypes(registry: Registry): string {
  const types = registeredTypes(registry);
  const header = "// Generated by scripts/generate.ts from the graph-type definitions. Do not edit.\n";
  const versions = SUPPORTED_VERSIONS.map(String).join(" | ");
  const interfaces = types.map((type) => {
    const definition = registry[type]!;
    return (
      `${comment(definition.description, "")}export interface ${pascal(type)}Description {\n` +
      comment(TYPE_DEFINITION, "  ") +
      `  type: ${JSON.stringify(type)};\n` +
      comment(VERSION_DEFINITION, "  ") +
      `  version?: ${versions};\n` +
      tsMembers(propertiesOf(type, registry), "  ") +
      "}\n"
    );
  });
  const union = types.length === 0 ? "never" : types.map((type) => `${pascal(type)}Description`).join(" | ");
  return `${header}\n${interfaces.join("\n")}${interfaces.length > 0 ? "\n" : ""}/** Any one graph description. */\nexport type GraphDescription = ${union};\n`;
}

let cache: { schema: JsonSchema; toolSchema: JsonSchema; vocabulary: Vocabulary } | undefined;

function built() {
  cache ??= deepFreeze({ schema: buildSchema(definitions), toolSchema: buildToolSchema(definitions), vocabulary: buildVocabulary(definitions) });
  return cache;
}

/**
 * The published JSON Schema of the description, as also shipped in `./schema.json`
 * (GSV-REQ-010). Frozen; copy it (`structuredClone`) to change it.
 */
// @spec GSV-REQ-010
export function getSchema(): DeepReadonly<JsonSchema> {
  return built().schema;
}

/** The strict tool-profile schema, for the model tool (AD-006). Frozen; copy it to change it. */
export function getToolSchema(): DeepReadonly<JsonSchema> {
  return built().toolSchema;
}

/**
 * The published vocabulary, as also shipped in `./vocabulary.json` (GSV-REQ-010, GSV-REQ-013).
 * Frozen; copy it to change it.
 */
// @spec GSV-REQ-010, GSV-REQ-013
export function getVocabulary(): DeepReadonly<Vocabulary> {
  return built().vocabulary;
}
