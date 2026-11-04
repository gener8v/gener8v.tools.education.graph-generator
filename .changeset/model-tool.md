---
"@gener8v/graph-generator": patch
---

Added: the model tool in `./tool`. `graphTool` is a provider-neutral tool definition (`generate_graph`, a description and the generated strict tool schema). `handleGraphToolCall(input)` takes a tool call's input as an object or JSON text, treats `null` as "not given", validates the description, and never throws. It returns `{ ok: true, description, provenance, textAlternative, summary }` or `{ ok: false, issues, summary }`, where `summary` is plain text to return to the model: the graph type and its text alternative, or the first 20 issues, numbered. JSON text longer than `TOOL_INPUT_LIMIT` (2,000,000 characters) is refused without being parsed, and the text alternative in a result stops after `TEXT_ALTERNATIVE_LIMIT` (4,000) characters. Supported: Anthropic `input_schema` without `strict`, OpenAI `strict: true` and Gemini `parametersJsonSchema`; not supported: Anthropic `strict: true` and Gemini `parameters`.
