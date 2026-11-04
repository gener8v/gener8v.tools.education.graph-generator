// Anthropic Messages API, a custom tool's `input_schema` WITHOUT `strict` (the supported mode;
// AD-006, TQ-002). The rules as documented, checked 2026-11-04 from documentation only (no API
// call; no page showed a last-updated date):
// - https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools
// - https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-reference
// - https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use
// - https://platform.claude.com/docs/en/build-with-claude/structured-outputs ("JSON Schema limitations", "Limits")
//
// Without `strict`, the documentation asks only for "A JSON Schema object defining the expected
// parameters for the tool" and a name matching `^[a-zA-Z0-9_-]{1,128}$`. It states no keyword
// list, size limit or depth limit for this mode: none is invented here, and the meta-schema test
// (CPSE-NFR-004) stands for "a JSON Schema object".
//
// Not supported, and documented as such (README "Model tool"): `strict: true`. Its subset rejects
// `maxLength`, `minimum`, `maximum` and array limits beyond `minItems` 0 or 1 ("If you use an
// unsupported feature, you'll receive a 400 error with details"), and allows at most 16 "Parameters
// with union types" across a request's strict schemas; this schema has about 140. Those rules are
// recorded below so a test can show the schema breaks them, as the README says.

export const anthropic = {
  mode: "Anthropic Messages API, input_schema without strict",
  checked: "2026-11-04",
  sources: [
    "https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools",
    "https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-reference",
    "https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use",
    "https://platform.claude.com/docs/en/build-with-claude/structured-outputs",
  ],
  /** define-tools: a tool's `name`. */
  namePattern: /^[a-zA-Z0-9_-]{1,128}$/,
  /** define-tools: `input_schema` is "A JSON Schema object". */
  inputSchemaIsJsonSchemaObject: true,
  /** The unsupported `strict: true` mode, for the test that shows the schema is outside it. */
  strictMode: {
    /** structured-outputs, "Not supported": numerical, string-length and array-size constraints (`minItems` 0 or 1 aside). */
    unsupportedKeywords: ["minimum", "maximum", "multipleOf", "minLength", "maxLength", "maxItems"],
    /** structured-outputs, "Limits": "Total parameters that use `anyOf` or type arrays", across all strict schemas in a request. */
    maxUnionTypedParameters: 16,
  },
} as const;
