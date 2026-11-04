// Gemini API function declarations with `parametersJsonSchema` (the supported Google mode;
// AD-006, TQ-002). The rules as documented, checked 2026-11-04 from documentation only (no API
// call; no page showed a last-updated date; the examples carry API revision 2026-05-20):
// - https://aistudio.google.com/docs/function-calling (was ai.google.dev/gemini-api/docs/function-calling)
// - https://aistudio.google.com/api-reference/caching (FunctionDeclaration and Schema reference)
// - https://aistudio.google.com/docs/structured-output ("JSON schema support")
//
// `parametersJsonSchema` "Describes the parameters to the function in JSON Schema format. The
// schema must describe an object where the properties are the parameters to the function." It is
// "mutually exclusive with `parameters`". No page lists the JSON Schema keywords this field accepts;
// the structured-output page lists what its JSON Schema engine supports and says unsupported ones
// are stripped and ignored "rather than returning an error", with `minLength` and `maxLength`
// named as "not enforced". That list is used below as the documented keywords. Undocumented for this
// field, so not encoded as a rule either way (TR-001): `anyOf`, `pattern`, `exclusiveMinimum` and
// `exclusiveMaximum`; and the size of schema the function-calling page warns "may be rejected"
// (it publishes no numbers). No function-name rule was recorded for the Gemini API in the check.
//
// Not supported, and documented as such (README "Model tool"): `parameters`, the OpenAPI 3.0 subset
// (and Vertex AI's), whose Schema has `nullable` rather than type arrays and no
// `additionalProperties`. That rejection is inferred from its field list, not documented.

export const google = {
  mode: "Gemini API function declaration, parametersJsonSchema",
  checked: "2026-11-04",
  sources: [
    "https://aistudio.google.com/docs/function-calling",
    "https://aistudio.google.com/api-reference/caching",
    "https://aistudio.google.com/docs/structured-output",
  ],
  /** "The schema must describe an object where the properties are the parameters to the function." */
  rootIsObjectWithProperties: true,
  /** structured-output: null is written as a type array, `["string", "null"]`. */
  nullAsTypeArray: true,
  /**
   * structured-output, "JSON schema support": `type` (with `null`), object `properties`,
   * `required`, `additionalProperties`; string `enum`, `format`; number and integer `enum`,
   * `minimum`, `maximum`; array `items`, `prefixItems`, `minItems`, `maxItems`; `title`,
   * `description`; `$defs`, `$ref`.
   */
  documentedKeywords: [
    "type",
    "properties",
    "required",
    "additionalProperties",
    "enum",
    "format",
    "minimum",
    "maximum",
    "items",
    "prefixItems",
    "minItems",
    "maxItems",
    "title",
    "description",
    "$defs",
    "$ref",
  ],
  /** Documented as accepted and ignored ("not enforced"); `validate` enforces it. */
  ignoredKeywords: ["minLength", "maxLength"],
  /** Used by the schema, listed nowhere for this field (see the note above). */
  undocumentedKeywords: ["anyOf", "pattern", "exclusiveMinimum", "exclusiveMaximum"],
} as const;
