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

- [ ] `src/tool/graphTool.ts`
- [ ] `src/tool/handleGraphToolCall.ts`
- [ ] `src/tool/index.ts`
- [ ] `tests/tool/provider-rules/*.ts`
- [ ] `tests/tool/graphTool.test.ts`
- [ ] `tests/tool/handleGraphToolCall.test.ts`
- [ ] `README.md`, `.changeset/`, specification coverage, OQ-008

## Delivery Summary

**Status:** In Progress
**Verification:** not run
**Reviews Deferred:** none
