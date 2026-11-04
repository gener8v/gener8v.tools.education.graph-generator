# TICKET-007: Provide the model tool definition and the never-throwing tool handler — Delivery Record

## Ticket Reference

**Ticket:** graph-library/component-packaging-and-source-export/TICKET-007
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/component-packaging-and-source-export.md`
**Requirements Covered:**
- CPSE-REQ-027..036: tool definition, derived schema, provider-neutral, handler input forms, invalid JSON, success, issues, summary, never throws, never contacts a model
- CPSE-NFR-004: the tool input schema is valid against its declared meta-schema — verified by a CI meta-schema test
- CPSE-NFR-006: the handler never throws for arbitrary input — verified by a property test of at least 10,000 inputs

## Pre-Flight Reconciliation

**Verdict:** Go — the provider-rules conflict below was recorded (ticket hazard: "if a provider's current rules reject the strict profile, stop and record the conflict") and decided by the Engineer on 2026-11-04: one schema, no adapter; supported modes documented. AD-006, TR-001 and TQ-002 amended accordingly (system design Approved by Architect — Thomas Eaves, 2026-11-04).

**Provider re-check (TQ-002), from documentation only, 2026-11-04** — full report with URLs and quotes: scratchpad `cpse007/provider-rules-research.md` (to be copied into `tests/tool/provider-rules/` sources on approval). No page showed a last-updated date; Gemini examples show API revision 2026-05-20.

Measured `src/generated/tool-schema.json`: 97,031 bytes; 34 closed objects, 205 properties, all required; object depth 4; 72 enum values (256 characters) in 34 enums; 139 nullable type arrays and one `anyOf` at `/graph`; `maxLength` 53, `pattern` 14, `minimum` 33, `maximum` 39, `exclusiveMinimum` 1, `exclusiveMaximum` 3, `maxItems` 14, `title` 12.

| Provider / mode | Documented verdict | At issue |
|---|---|---|
| Anthropic, `input_schema` (default) | passes | only "a JSON Schema object" is required |
| Anthropic, `strict: true` | **fails** (400 documented) | `maxLength`, `minimum`, `maximum`, `maxItems` unsupported; at most 16 `anyOf`/type-array parameters across strict schemas (this has ~140); `exclusive*` not named; `(?:…)` in `pattern` unclear |
| OpenAI, `strict: true` (Chat Completions, Responses) | passes every documented rule | `maxLength` not in the supported list (named unsupported only for fine-tuned models) — unclear; `title` undocumented |
| Gemini API, `parametersJsonSchema` | unclear | keyword list not documented; `maxLength` ignored; `pattern`, `anyOf`, `exclusive*` not listed |
| Gemini `parameters` / Vertex (OpenAPI subset) | **likely fails** (inferred) | type arrays instead of `nullable`; `additionalProperties` not supported |

**Blocking findings:** None after the decision. (Recorded: the strict profile is rejected by Anthropic's strict mode and probably by Gemini's OpenAPI-subset `parameters`; AD-006 had assumed one schema accepted by all three.)

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-11-04
**Implemented by:** opus · high — routed as deliver-large from Tower

Starts once CPSE TICKET-005 and GSS TICKET-010 are on `main`.

### Planned Files

- `src/tool/graphTool.ts`: `graphTool = { name: "generate_graph", description, inputSchema: getToolSchema() }` (a test asserts it equals `src/generated/tool-schema.json` — derived, never hand-written).
- `src/tool/handleGraphToolCall.ts` → `ToolResult`. Text: over `TOOL_INPUT_LIMIT` → `too_large` ("tool input", characters), no parse; `JSON.parse` fails → `invalid_json` (parser message as `detail` only). Non-object → `not_an_object`; no own `graph` → `missing_property` at `/graph`; other root keys → `unknown_property`. Copy `graph` own keys once, dropping null-valued properties, iterative and budgeted (validate still reports `too_large`); validate the copy. Issue paths prefixed `/graph` (what the model sent). Success `{ ok, description, provenance, textAlternative, summary }`; failure `{ ok: false, issues (complete), summary }`. Summary: success = type + "was produced" + text alternative; failure = numbered `formatIssue` lines, first 20, then "…and N more". Any throw → `internal_error`, fixed text.
- `src/tool/index.ts`: exports.
- `tests/tool/provider-rules/{anthropic,openai-strict,google}.ts`: documented rules of the supported modes, each with URL and "checked 2026-11-04".
- `tests/tool/graphTool.test.ts`: 2020-12 meta-schema (CPSE-NFR-004), provider rules.
- `tests/tool/handleGraphToolCall.test.ts`: every path; 10,000 unknown keys bounded; ceiling x,y + line graph + over-limit; thrown internals leak no stack; ≥ 10,000-input never-throws property (CPSE-NFR-006); no React or SDK import.
- `README.md` "Model tool": Anthropic / OpenAI / Gemini snippets, supported and unsupported modes, limits; `.changeset/` (patch); specification coverage rows; close OQ-008.

Decisions to record:
- `TOOL_INPUT_LIMIT`: measure the largest valid description (x,y ceiling, 1,000 labeled points + 740 segments, every label 200 × `"`) as tool JSON with nulls; limit = a round number ≥ 1.5 × that (expect about 1–2 M characters), documented (OQ-008 resolved).
- The text alternative is capped at 4,000 characters + "…" in `summary` and in the `textAlternative` field (full text: `describe()`).
- No `PLAIN_TEXT_PATTERN` added (Gemini support undocumented; `validate` gates).
- `./tool` size budget: measured × 1.2, rounded up.

### How Acceptance Criteria Will Be Met

- `graphTool` shape and derived schema: `graphTool.test.ts` equality with the generated file.
- Provider docs re-checked, rules as fixtures, versions recorded: Pre-Flight Reconciliation; `provider-rules/*.ts`; `graphTool.test.ts`.
- String parsing, `invalid_json`, `not_an_object`, `missing_property` at `/graph`: handler tests.
- Over-limit input refused without parsing: handler test with an over-limit invalid text.
- Nulls stripped; success shape and summary: handler tests.
- Failure summary numbered path and message: handler tests (and the 20-issue cap).
- `internal_error`; ≥ 10,000-input property (CPSE-NFR-006): handler tests.
- Meta-schema (CPSE-NFR-004): `graphTool.test.ts`.
- No React, no SDK, no provider dependency: lint boundary rule, `pnpm check:deps`, an import test.

## Progress

- [x] `src/tool/graphTool.ts`
- [x] `src/tool/handleGraphToolCall.ts`
- [x] `src/tool/index.ts`
- [x] `tests/tool/provider-rules/*.ts`
- [x] `tests/tool/graphTool.test.ts`
- [x] `tests/tool/handleGraphToolCall.test.ts`
- [x] `README.md`, `.changeset/`, specification coverage, OQ-008

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/tool/graphTool.ts`: `TOOL_NAME`, `GraphTool`, `graphTool` — frozen `{ name: "generate_graph", description, inputSchema: getToolSchema() }`.
- `src/tool/handleGraphToolCall.ts`: `handleGraphToolCall(input) → ToolResult`, `TOOL_INPUT_LIMIT` (2,000,000), `TEXT_ALTERNATIVE_LIMIT` (4,000); `withoutNulls` (iterative, budgeted, getter-safe null removal), `/graph`-prefixed issue paths, the capped, numbered summary.
- `src/tool/index.ts`: the `./tool` exports.
- `tests/tool/provider-rules/{anthropic,openai-strict,google}.ts`: the documented rules of the supported modes, with URLs and "checked 2026-11-04"; Anthropic's strict mode recorded as unsupported.
- `tests/tool/graphTool.test.ts` (13 tests), `tests/tool/handleGraphToolCall.test.ts` (24 tests).
- `README.md` "Model tool" (supported and unsupported provider modes, snippets, limits); `.changeset/model-tool.md` (patch); `.size-limit.json` (`./tool` 41 kB); the specification's coverage rows and OQ-008.

## Verification Run

| Command | Exit | Evidence |
|---------|------|----------|
| full verification loop (`pnpm generate`, `lint`, `typecheck`, vitest ×3, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `check:changesets`, `size`, `publint`, `attw`, `audit --prod`, state, lint), on `ticket/graph-library-cpse-007` over CPSE TICKET-006 | 0 | vitest 2,497 passed ×3; bench 25 passed; `pnpm generate` changed nothing |
| `pnpm audit` | 1 | the accepted dev-only `minimatch` advisory (CPSE TICKET-004 SEC-002) |
| `npx vitest run --no-cache tests/tool` ×3 (implementer, on `main` e00a824) | 0 | 37 of 37 each; the 10,000-input property in about 5 s |
| measurement (`scratchpad/cpse007/measure-input.log`) | 0 | largest valid tool input (x,y ceiling, nulls for every optional): 876,079 UTF-16 units compact, 1,019,031 indented; text alternative 559,223 characters (x,y), 322,947 (line graph) |
| `pnpm size` | 0 | `./tool` 33.93 kB of 41 kB |
| mutants (implementer, each restored): nulls stripped in `validate`; nulls not stripped; `issue.path` raw; no 20-issue cap; exception text let through; over-limit text parsed; no text-alternative cap | — | 2, 6, 1, 1, 1, 1 and 1 tests fail respectively |

## Acceptance Criteria Verification

- [x] `graphTool` is `{ name: "generate_graph", description, inputSchema }`, `inputSchema` from the generated schema — `graphTool.test.ts` (equal to `src/generated/tool-schema.json`).
- [x] Provider documentation re-checked; rules encoded as fixtures; `inputSchema` passes them; versions recorded — Pre-Flight Reconciliation (2026-11-04, documentation only); `tests/tool/provider-rules/*.ts`; `graphTool.test.ts` checks the schema against each supported mode's rules and uses only keywords they name. Anthropic strict mode and Gemini OpenAPI `parameters` are unsupported by decision (AD-006).
- [x] String input parsed; unparsable text (and JSON in prose) → `invalid_json`; non-object → `not_an_object`; no `graph` → `missing_property` at `/graph` — handler tests.
- [x] Input over the documented limit fails, stating it, without parsing — handler test with a `JSON.parse` spy.
- [x] Nulls inside `graph` removed before validation; success is `{ ok, description, provenance, summary }` (plus `textAlternative`) with the type, "was produced" and the text alternative — handler tests.
- [x] Failure is `{ ok: false, issues, summary }`, the summary numbered path and message — handler tests, including the 20-issue cap and a hostile path printed escaped.
- [x] Unexpected errors → `internal_error`; ≥ 10,000 generated inputs never throw (CPSE-NFR-006) — handler tests (no `file:`, `/node_modules/` or stack frame).
- [x] `inputSchema` is valid against JSON Schema 2020-12 (CPSE-NFR-004) — `graphTool.test.ts` (the schema declares no `$schema`; 2020-12 is its generator's dialect).
- [x] No React, no model SDK, no provider dependency — the lint boundary rule, `pnpm check:deps`, an import test.

## Decisions Made

### DEL-001: `TOOL_INPUT_LIMIT` is 2,000,000 characters

**Context:** CPSE OQ-008 left the limit open; the ticket proposed 256 kB, but the largest valid description is about 876,000 characters as tool JSON.
**Decision:** 2,000,000 UTF-16 code units of JSON text, refused as `too_large` unparsed — about 2.3× the compact maximum and 1.96× the indented one. Objects are not measured; the validator's limits bound them. A model writing every non-ASCII character as `\u` can exceed it with a valid description (documented).
**Rationale:** Approved with the plan: never refuse a valid description over its text form, while bounding the parse.
**Ticket Impact:** OQ-008 resolved in the specification.

### DEL-002: The text alternative is capped at 4,000 characters in both `summary` and `textAlternative`

**Context:** An x,y graph at its limits states about 560,000 characters.
**Decision:** Both carry at most 4,000 code points, then "…", never splitting a surrogate pair; `describe()` gives the whole text.
**Rationale:** Approved with the plan; the separate field is still a boundary from the summary prose.
**Ticket Impact:** The hazard's "decide whether the field is capped too" is settled: capped.

### DEL-003: `./tool` size budget 41 kB

**Context:** TICKET-001's 25 kB placeholder; the tool bundles the schema builder and the validator.
**Decision:** 41 kB (measured 33.93 kB × 1.2, rounded up).
**Rationale:** Approved with the plan.
**Ticket Impact:** None.

### DEL-004: No `PLAIN_TEXT_PATTERN` in the tool schema

**Context:** The hazard asked whether every provider accepts `pattern` on strings.
**Decision:** Not added: Gemini's `parametersJsonSchema` keyword list does not document `pattern`; `validate` is the gate.
**Rationale:** Approved with the plan.
**Ticket Impact:** None.

### DEL-005: Issue paths point into the tool input; root issues name the tool

**Context:** The model sent `{ "graph": … }`, so a path relative to the description would not match what it wrote.
**Decision:** Every validation issue's path, and its `conflicts`, is prefixed with `/graph`. Root issues use term `input` and graph type `tool` ("graph is required for a tool"); other root keys are `unknown_property` with `allowed: ["graph"]`; more than 10,000 root keys is one `too_large`.
**Rationale:** A model can fix exactly the place it wrote; `term: "tool input"` would be quoted as caller text by the message builder.
**Ticket Impact:** None.

### DEL-006: Null removal is bounded and never runs getters

**Context:** The handler copies `graph` to drop nulls before `validate`.
**Decision:** Iterative, at most 4 × `DESCRIPTION_VALUE_LIMIT` keys and elements (above the schema's largest input, 14,018); own properties read through descriptors, so getters are copied, not run, for `validate` to report; null list elements stay; the rest passes to `validate` unchanged past the budget.
**Rationale:** Deep or wide input costs no more than the budget, and accessor input is reported as `validate` reports it.
**Ticket Impact:** None.

## Deviations from Plan

- The tool was built on `main` (e00a824), before CPSE TICKET-006 landed, then applied over it; the README sections and coverage rows were merged by hand (rows moved to the table's end, in delivery order).
- `term: "input"` rather than "tool input" for the size issue (DEL-005).

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| CPSE-REQ-027, CPSE-REQ-028, CPSE-REQ-029, CPSE-REQ-036 | `src/tool/graphTool.ts`:graphTool | `@spec CPSE-REQ-027, CPSE-REQ-028, CPSE-REQ-029, CPSE-REQ-036` |
| CPSE-REQ-030 | `src/tool/handleGraphToolCall.ts`:withoutNulls | `@spec CPSE-REQ-030` |
| CPSE-REQ-032, CPSE-REQ-033, CPSE-REQ-034 | `src/tool/handleGraphToolCall.ts`:handleInput | `@spec CPSE-REQ-032, CPSE-REQ-033, CPSE-REQ-034` |
| CPSE-REQ-030..036 | `src/tool/handleGraphToolCall.ts`:handleGraphToolCall | `@spec CPSE-REQ-030, …, CPSE-REQ-036` |
| CPSE-REQ-006, CPSE-REQ-029, CPSE-REQ-036 | `src/tool/index.ts` | `@spec CPSE-REQ-006, CPSE-REQ-029, CPSE-REQ-036` |

## Notes

- Implemented by opus · high in an isolated worktree from `main` (e00a824); applied to `ticket/graph-library-cpse-007` from `main` (acdcdc8) as a patch.
- The README's provider snippets are written from documentation, with placeholder model names; no live API call was made (TR-001 keeps the evaluation-set measurement open).

## Post-Review Amendments

None
