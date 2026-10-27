# TICKET-007: Provide the model tool definition and the never-throwing tool handler

**Change:** graph-library
**Capability Area:** Component Packaging & Source Export (component-packaging-and-source-export)
**Specification:** specifications/component-packaging-and-source-export.md

**Summary:** Add `graphTool` (name, description, input schema generated from the definitions in the strict profile with a `graph` wrapper) and `handleGraphToolCall`, which accepts an object or JSON text, validates it, and returns success with the normalized description or the structured issues, with a plain-text summary — never throwing and never contacting a model.
**Priority:** Must
**Value:** An application developer can give any major model graph generation as a tool and feed its calls straight back, with errors the model can fix and retry.

**Requirements Covered:**
- CPSE-REQ-027: Tool definition with name, description and input schema
- CPSE-REQ-028: Input schema derived from the published schema, not maintained separately
- CPSE-REQ-029: Provider-neutral definition; no model-provider software dependency
- CPSE-REQ-030: Handler accepts an object or JSON text
- CPSE-REQ-031: Unparsable JSON text returns a not-valid-JSON issue
- CPSE-REQ-032: Valid input returns success with the normalized description
- CPSE-REQ-033: Invalid input returns the structured validation issues
- CPSE-REQ-034: A plain-text summary accompanies each result
- CPSE-REQ-035: The handler never throws
- CPSE-REQ-036: The package never calls, hosts or contacts a model
- CPSE-NFR-004: The tool input schema is valid against its declared JSON Schema meta-schema — verified by a CI meta-schema test
- CPSE-NFR-006: The handler returns a result, never an exception, for arbitrary input — verified by a property test of at least 10,000 generated inputs

**Prior Art:**
- Read: TICKET-001 output — `src/tool/index.ts`, boundary lint rule
- Read: `graph-library/graph-specification-and-vocabulary/TICKET-005` output — `src/core/schema.ts` (`getToolSchema`), `src/generated/tool-schema.json` (DEP-006)
- Read: `graph-library/graph-specification-and-vocabulary/TICKET-003` and `TICKET-004` outputs — `src/core/validate/index.ts`, `src/core/result.ts`, `src/core/issues.ts` (`invalid_json`, `internal_error`), `src/core/describe.ts`
- Read: `.gener8v/technical-design/system-design.md` — AD-006 (strict profile: object root, `graph` wrapper, closed objects, all properties required, optional as nullable; handler strips nulls), AD-015 (`generate_graph`, result shapes, summary), Interface Contracts "Model tool", TR-001
- Read: `.gener8v/constraints/prd.md` — prd/IC-001, prd/RF-002
- Read: `.gener8v/specifications/component-packaging-and-source-export.md` — Behaviors "Model Tool", Edge Cases (non-object JSON, prose-wrapped JSON, oversized input), OQ-008

**Acceptance Criteria:**
- [ ] `graphTool` is `{ name: "generate_graph", description, inputSchema }`; `inputSchema` is imported from the generated tool schema, never hand-written
- [ ] Before building, current Anthropic, OpenAI (strict mode) and Google tool-schema documentation is re-checked and the rules found are encoded as fixtures in `tests/tool/provider-rules/`; `inputSchema` passes all three (TQ-002); the doc versions checked are recorded in the delivery record
- [ ] `handleGraphToolCall` parses string input; unparsable text (including JSON wrapped in prose) returns `{ ok: false, issues: [invalid_json] }`; non-object JSON returns `not_an_object`; a missing `graph` property returns `missing_property` at `/graph`
- [ ] Input larger than the documented size limit returns a failure stating the limit, without parsing
- [ ] Null-valued optional properties inside `graph` are removed before validation; a valid result is `{ ok: true, description, provenance, summary }` where `summary` states the graph type and that the graph was produced, with its text alternative
- [ ] An invalid result is `{ ok: false, issues, summary }` where `summary` lists each issue's path and message, numbered
- [ ] Any unexpected internal error becomes an `internal_error` issue; a property test with ≥ 10,000 generated inputs (random JSON, random text, deeply nested, huge strings) never throws (CPSE-NFR-006)
- [ ] `inputSchema` validates against the JSON Schema meta-schema it declares (CPSE-NFR-004)
- [ ] `src/tool` imports no React and no model SDK; `package.json` gains no provider dependency (CPSE-REQ-029, CPSE-REQ-036)

**Output:**
- `src/tool/graphTool.ts` — `graphTool`
- `src/tool/handleGraphToolCall.ts` — `handleGraphToolCall(input: unknown) → ToolResult`, `ToolResult` type; both exported from `src/tool/index.ts` (`./tool`)
- `tests/tool/provider-rules/anthropic.ts`, `tests/tool/provider-rules/openai-strict.ts`, `tests/tool/provider-rules/google.ts` — rule fixtures
- `tests/tool/graphTool.test.ts` — meta-schema (CPSE-NFR-004) and provider-rule checks
- `tests/tool/handleGraphToolCall.test.ts` — every result path and the 10,000-input property test (CPSE-NFR-006)

**Constraints:** prd/IC-001 (provider schema subsets), prd/RF-002, prd/CC-003, prd/TC-005

**Known Hazards:**
- Provider rules in AD-006 and prd/IC-001 were written from documentation as of 2026 and are explicitly unverified (TQ-002 still open). Re-check before writing the fixtures; if a provider's current rules reject the strict profile, stop and record the conflict in the delivery record rather than inventing a per-provider adapter (CPSE-REQ-029, AD-006).
- In the tool path `null` means "absent" for optional properties; in the published path it does not. Strip nulls only inside the handler, never in `validate`.
- The specification leaves the input size limit open (CPSE OQ-008). Choose a documented constant (proposed 256 kB of text), record it as a Decision in the delivery record and in the tool's documentation; do not leave it unlimited.
- CPSE OQ-006 (returning markup or source in a success result) is unresolved; do not add it.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-002-security-review/SEC-001: issue messages are neutralised at construction (`src/core/issues.ts` quotes non-term keys, escapes control, bidi and zero-width characters, and caps lengths), but `issue.path` is a faithful RFC 6901 pointer and may hold raw control characters from caller keys. Never print `path` raw to text output. Use one shared `formatIssue(issue)` that escapes `path` the same way and renders `<path>: <message>`; whichever of graph-library/component-packaging-and-source-export/TICKET-003, TICKET-006 and TICKET-007 lands first adds it to `src/core/` with tests, and the others reuse it.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-002-security-review/SEC-002: one description can produce tens of thousands of issues, and GSV-REQ-029 requires the validator to return them all (Product Owner decision 2026-10-05: no cap in the validator). The tool `summary` lists at most the first 20 issues, then "…and N more", and add a test that 10,000 unknown keys produce output under a fixed size. Keep the structured `issues` array complete.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-002-security-review/SEC-003: never put exception text, `error.message` or `error.stack` into an issue or a message. An unexpected exception becomes `createIssue("internal_error", "", {})`, whose message is fixed; for `invalid_json`, pass only the JSON parser's message as `detail`. Add a test that a thrown internal exception yields no `file:`, `/node_modules/` or `    at ` frame in the output.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-004-security-review/SEC-005: for the success `summary`, call `describeNormalized(result.description)` (`src/core/describe.ts`, internal) on the validated description; the public `describe` validates again.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-005-security-review/SEC-001 and graph-library/graph-specification-and-vocabulary-ticket-005-code-review/CR-005, CR-006: `getToolSchema()` (GSV TICKET-005) is the tool's `inputSchema`. It names the type with `enum` rather than `const` (DEL-007), leaves the plain-text pattern out (the published schema has it), and, with no type registered, holds a closed empty `graph` object. When re-verifying provider rules (TQ-002), decide whether every target provider accepts `pattern` on strings; if so, consider adding `PLAIN_TEXT_PATTERN` in the generator. The handler always runs `validate`, which is the gate either way.
- Carried from graph-library/geometric-shapes-and-solids-ticket-002-security-review/SEC-002 and SEC-004 (the text alternative in the success `summary`):
  - The text alternative states caller text in full: the drawing cuts long labels and titles, but the text alternative does not, and a long unit appears once per stated measurement. Cap the text alternative inside `summary` at a fixed length, ending in "…", as the issue list is capped, and test it with half a megabyte of unit text.
  - Quotation marks in a text alternative help a reader tell caller text from the package's sentence, but they are not a boundary: `quoteText` neutralises double-quote lookalikes, and caller text can still say anything inside them. Return the text alternative in its own field of the tool result, not only inside the summary prose.
- Carried from graph-library/data-graphs-and-pictographs-ticket-002-security-review/SEC-001 (the line graph's text alternative): a line graph states every category name once per series and every value written in full, so its text alternative is the largest of the types so far. At the provisional limits, a 26 KB description gives a 321,158-character text alternative. Apply the `summary` cap to it as well, and include a line graph in the cap's test.
- Supersedes the summary-cap test input above: half a megabyte of unit text is now `too_large` (GSV-REQ-052/053) and never reaches a success summary. Test the cap with the largest valid description instead: a line graph at `SERIES_LIMIT` series and its category limit, every name and label at `CALLER_TEXT_LIMIT` (`wordsOf`), values written in full, plus a circle with `unit` at `UNIT_TEXT_LIMIT`. Add one over-limit case and assert the failure summary lists the `too_large` issue. The cap itself is still needed. (ready-tickets reconciliation, 2026-10-21)
- Supersedes `describeNormalized(result.description)` above: the function takes `(normalized, provenance, registry)` with the registry required (`src/core/describe.ts`). Call `describeNormalized(result.description, result.provenance, definitions)`. (ready-tickets reconciliation, 2026-10-21)
- The tool schema now carries `maxLength` on every text term (GSV-REQ-054) as well as the color `pattern`. When re-checking provider rules, record whether each target provider accepts `maxLength` and `pattern` on strings. If one rejects a keyword, record the conflict (AD-006) rather than stripping it silently: `validate` remains the gate and reports `too_large`. (ready-tickets reconciliation, 2026-10-21)
- `formatIssue` has landed (`src/core/issues.ts`), settling the "whichever lands first" hazard. Read `graph` own-key only (`Object.hasOwn(input, "graph")`), and strip nulls over own keys, as `renderGraph` and `checkScene` read theirs. (ready-tickets reconciliation, 2026-10-21)
- The largest valid description is now the x,y graph, not the line graph (graph-library/number-lines-and-coordinate-graphs-ticket-003-security-review/SEC-002, Engineer — Thomas Eaves, 2026-10-27). After its SEC-001 fix (coordinates stated at most 12 significant digits, noise as 0), its text alternative reaches about 560,000 characters with every text 200 × `"` (1,000 labeled points and 740 labeled segments), about 908,000 UTF-16 units with text outside the BMP, and about 224,000 characters unlabeled; its markup about 5.8 MB (`tests/react/Graph.test.tsx`, "keeps the x,y graph's text alternative and markup bounded at its limits"). So add an x,y graph at that ceiling to the summary cap's test beside the line graph, and decide whether the tool result's separate text-alternative field is capped too, or document that a model consumer must bound it; the summary cap alone does not cover that field.

**Depends On:** TICKET-001
**Blocks:** None

**Size:** Medium

**Notes:** Cross-area predecessors: `graph-library/graph-specification-and-vocabulary/TICKET-005` (tool schema) and its TICKET-003/TICKET-004 (validator), per DEP-006 and EXT-004. The handler needs no renderer, so it can be built before any graph type beyond the circle exists.
