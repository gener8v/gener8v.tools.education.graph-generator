import { type Registry, definitions, propertiesOf } from "./definitions/index";
import { GRAPH_TYPES, type GraphType, type PropertyKind, type PropertyMap, type PropertySpec, type ValueSpec } from "./definitions/types";
import type { Range } from "./result";
import { namedColors } from "./style";
import { DESCRIPTION_VALUE_LIMIT } from "./validate/structure";
import { deepFreeze } from "./validate/state";

// The published schema, the strict tool schema, the vocabulary and the description types are all
// built here from the one set of definitions (AD-003, GSV-REQ-015). `scripts/generate.ts` writes
// them to files; the getters build them at run time from the same code, so files, getters and the
// validator cannot disagree.

/** A JSON Schema object, as plain JSON data. */
export type JsonSchema = { [keyword: string]: unknown };

const SCHEMA_DIALECT = "https://json-schema.org/draft/2020-12/schema";

// Rules the validator enforces that JSON Schema does not express, or that would cost providers.
// They make the validator stricter than the schema, which GSV-REQ-011 and GSV-NFR-003 allow.
const PLAIN_TEXT_NOTE = "Plain text: control, line-break, text-direction and invisible characters are not accepted.";
const VALIDATOR_NOTE =
  `The package's validator also checks what this schema cannot: values that determine one another must agree within 1%, ` +
  `ranges must have their minimum below their maximum, type-specific rules (such as points inside the axes), and a description ` +
  `may hold at most ${DESCRIPTION_VALUE_LIMIT} values.`;

/** "radius, diameter or circumference". */
const alternatives = (terms: readonly string[]) =>
  terms.length === 1 ? terms[0]! : `${terms.slice(0, -1).join(", ")} or ${terms[terms.length - 1]}`;

/**
 * A pattern accepting what `resolveColor` accepts: a named color in any ASCII case, or a `#rgb`
 * or `#rrggbb` code (code review CR-006 and security review SEC-004 on TICKET-001).
 */
export const COLOR_PATTERN = `^(?:#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})|${Object.keys(namedColors)
  .map((name) => [...name].map((letter) => `[${letter.toUpperCase()}${letter}]`).join(""))
  .join("|")})$`;

const COLOR_NOTE = `A color name (${Object.keys(namedColors).join(", ")}), in any case, or a hex code such as #0072b2.`;

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
  if (spec.kind === "string") notes.push(PLAIN_TEXT_NOTE);
  if (spec.kind === "color") notes.push(COLOR_NOTE);
  if (spec.kind === "object") {
    for (const [lower, upper] of spec.ordered ?? []) notes.push(`${upper} must be greater than ${lower}.`);
  }
  return notes.join(" ");
}

/** The schema of one value. In the tool profile, an optional value also accepts `null`. */
function valueSchema(spec: ValueSpec, profile: Profile, nullable: boolean): JsonSchema {
  const jsonType = JSON_TYPE[spec.kind];
  const schema: JsonSchema = { type: nullable ? [jsonType, "null"] : jsonType, description: describeValue(spec) };
  switch (spec.kind) {
    case "number":
    case "integer":
      if (spec.min !== undefined) schema[spec.exclusiveMin ? "exclusiveMinimum" : "minimum"] = spec.min;
      if (spec.max !== undefined) schema[spec.exclusiveMax ? "exclusiveMaximum" : "maximum"] = spec.max;
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
    // The strict profile lists every property as required; optional ones accept null instead.
    if (spec.required || profile === "tool") required.push(spec.term);
  }
  return { properties: schemas, required, additionalProperties: false };
}

/** The registered graph types, in `GRAPH_TYPES` order. */
function registered(registry: Registry): GraphType[] {
  return GRAPH_TYPES.filter((type) => Object.hasOwn(registry, type) && registry[type] !== undefined);
}

/** One graph type's closed object, in either profile (AD-006). */
function typeSchema(type: GraphType, registry: Registry, profile: Profile): JsonSchema {
  const definition = registry[type]!;
  const groups = definition.derivations.filter((group) => group.required);
  const description = [
    definition.description,
    ...groups.map((group) => `Give one of ${alternatives(group.members)}; the others are worked out from it.`),
  ].join(" ");
  const envelope: Record<string, JsonSchema> =
    profile === "published"
      ? {
          type: { const: type, description: "The graph type." },
          version: { const: 1, description: "The schema version. Leave it out for the current version, 1." },
        }
      : {
          type: { type: "string", enum: [type], description: "The graph type." },
          version: { type: ["integer", "null"], enum: [1, null], description: "The schema version: 1, or null for the current version." },
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
  const types = registered(registry);
  const root: JsonSchema = { $schema: SCHEMA_DIALECT, title: "Graph description" };
  if (types.length === 0) return { ...root, description: NO_TYPES, not: {} };
  return {
    ...root,
    description: `One graph, described by its type and the values that type accepts. ${VALIDATOR_NOTE}`,
    anyOf: types.map((type) => typeSchema(type, registry, "published")),
  };
}

/**
 * The strict tool-profile schema: an object root holding the description under `graph`, every
 * object closed, every property required, optional values nullable (AD-006, prd/IC-001).
 */
// @spec GSV-REQ-015
export function buildToolSchema(registry: Registry): JsonSchema {
  const types = registered(registry);
  const graph: JsonSchema =
    types.length === 0
      ? { description: NO_TYPES, not: {} }
      : {
          description: `One graph, described by its type and the values that type accepts; null means "not given". ${VALIDATOR_NOTE}`,
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
  maxItems?: number;
  ordered?: Array<[string, string]>;
  items?: TermUse;
  properties?: Record<string, TermUse>;
}

export interface Vocabulary {
  version: 1;
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

function termUse(spec: ValueSpec, required: boolean | undefined, terms: Vocabulary["terms"]): TermUse {
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
  if (spec.kind === "enum") use.values = [...spec.values];
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

function termUses(properties: PropertyMap, terms: Vocabulary["terms"]): Record<string, TermUse> {
  const uses: Record<string, TermUse> = {};
  for (const spec of Object.values(properties) as PropertySpec[]) {
    // One entry per term: the definitions test guarantees each term has one definition.
    terms[spec.term] ??= { definition: spec.description, kind: spec.kind };
    uses[spec.term] = termUse(spec, spec.required, terms);
  }
  return uses;
}

/**
 * The published vocabulary: every term with its definition, and per graph type the terms it
 * accepts (required or optional, kind, range), its derivation groups and its checks
 * (GSV-REQ-013, GSV-REQ-014, GSV-REQ-035). The shared options' `appliesTo` and `elementsOf` are
 * not published; their effect is in each type's terms.
 */
// @spec GSV-REQ-013, GSV-REQ-014, GSV-REQ-015, GSV-REQ-035
export function buildVocabulary(registry: Registry): Vocabulary {
  const terms: Vocabulary["terms"] = {};
  const graphTypes: Vocabulary["graphTypes"] = {};
  for (const type of registered(registry)) {
    const definition = registry[type]!;
    graphTypes[type] = {
      title: definition.title,
      description: definition.description,
      properties: termUses(propertiesOf(type, registry), terms),
      derivations: definition.derivations.map((group) => ({
        members: [...group.members],
        description: group.description,
        required: group.required,
      })),
      checks: definition.checks.map((check) => check.name),
    };
  }
  const sortedTerms: Vocabulary["terms"] = {};
  for (const term of Object.keys(terms).sort()) sortedTerms[term] = terms[term]!;
  return { version: 1, terms: sortedTerms, graphTypes, colors: { ...namedColors }, limits: { descriptionValues: DESCRIPTION_VALUE_LIMIT } };
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
  const types = registered(registry);
  const header = "// Generated by scripts/generate.ts from the graph-type definitions. Do not edit.\n";
  const interfaces = types.map((type) => {
    const definition = registry[type]!;
    return (
      `${comment(definition.description, "")}export interface ${pascal(type)}Description {\n` +
      `  type: ${JSON.stringify(type)};\n` +
      `  version?: 1;\n` +
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

/** The published JSON Schema of the description, as also shipped in `./schema.json` (GSV-REQ-010). */
// @spec GSV-REQ-010
export function getSchema(): JsonSchema {
  return built().schema;
}

/** The strict tool-profile schema, for the model tool (AD-006). */
export function getToolSchema(): JsonSchema {
  return built().toolSchema;
}

/** The published vocabulary, as also shipped in `./vocabulary.json` (GSV-REQ-010, GSV-REQ-013). */
// @spec GSV-REQ-010, GSV-REQ-013
export function getVocabulary(): Vocabulary {
  return built().vocabulary;
}
