// OpenAI function calling with `strict: true` (Structured Outputs), Chat Completions and Responses
// (a supported mode; AD-006, TQ-002). The rules as documented, checked 2026-11-04 from
// documentation only (no API call; no page showed a last-updated date):
// - https://developers.openai.com/api/docs/guides/structured-outputs ("Supported schemas")
// - https://developers.openai.com/api/docs/guides/function-calling (strict mode)
//
// Undocumented, so not encoded as a rule either way (TR-001):
// - `maxLength` is in neither the supported string keywords (`pattern`, `format`) nor a list of
//   keywords unsupported for base models; the guide lists it as unsupported only "for fine-tuned
//   models". The schema uses it on every text term; `validate` enforces it whatever the provider does.
// - `title` is not mentioned.
// - No regular-expression subset is stated for `pattern`.
// - No rule for a function's `name` was recorded in the check.
// `maxLength` and `title` are listed in `undocumentedKeywords`, so a test fails if the schema starts
// using any other keyword the guide does not name.

export const openaiStrict = {
  mode: "OpenAI function calling, strict: true (Chat Completions and Responses)",
  checked: "2026-11-04",
  sources: ["https://developers.openai.com/api/docs/guides/structured-outputs", "https://developers.openai.com/api/docs/guides/function-calling"],
  /** "the root level object of a schema must be an object, and not use `anyOf`." */
  rootIsObjectWithoutAnyOf: true,
  /** "all fields or function parameters must be specified as `required`"; optional as a union with "null". */
  everyPropertyRequired: true,
  /** "`additionalProperties` must be set to `false` for each object in the `parameters`." */
  everyObjectClosed: true,
  /** "up to 5000 object properties total". */
  maxObjectProperties: 5000,
  /** "with up to 10 levels of nesting": counted here as objects inside objects, the root being the first. */
  maxNestingLevels: 10,
  /** "total string length of all property names, definition names, enum values, and const values cannot exceed 120,000 characters". */
  maxNameAndEnumCharacters: 120_000,
  /** "up to 1000 enum values across all enum properties". */
  maxEnumValues: 1000,
  /** A single string enum of more than 250 values may total at most 15,000 characters. */
  largeEnum: { values: 250, maxCharacters: 15_000 },
  /** Unsupported composition keywords: "you will receive an error". */
  unsupportedKeywords: ["allOf", "not", "dependentRequired", "dependentSchemas", "if", "then", "else"],
  /**
   * The keywords the guide names: the types and their nullable union form, `properties`,
   * `required`, `additionalProperties`, `enum`, `const` (counted in the size limit), `anyOf`
   * (nested), string `pattern` and `format`, number `multipleOf`, `minimum`, `maximum`,
   * `exclusiveMinimum` and `exclusiveMaximum`, array `minItems` and `maxItems`; and `items` and
   * `description`, which its examples use and no rule restricts.
   */
  documentedKeywords: [
    "type",
    "properties",
    "required",
    "additionalProperties",
    "items",
    "enum",
    "const",
    "anyOf",
    "description",
    "pattern",
    "format",
    "multipleOf",
    "minimum",
    "maximum",
    "exclusiveMinimum",
    "exclusiveMaximum",
    "minItems",
    "maxItems",
  ],
  /** Used by the schema, named nowhere in the guide for base models (see the note above). */
  undocumentedKeywords: ["maxLength", "title"],
} as const;
