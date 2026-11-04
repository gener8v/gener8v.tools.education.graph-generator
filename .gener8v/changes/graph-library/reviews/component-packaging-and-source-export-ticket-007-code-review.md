# TICKET-007: Provide the model tool definition and the never-throwing tool handler — Code Review

## Summary

Reviewed `graphTool` and `handleGraphToolCall` (delivered at d0ab514) against the ticket, CPSE-REQ-027..036, CPSE-NFR-004/006, AD-006 (amended 2026-11-04) and AD-015. Every acceptance criterion is satisfied; the code is traceable and the reviewer's re-run of the tool tests, typecheck, lint, dependency and changeset checks matched the record. Three Observation-level findings, all about artifacts that now differ from the ticket or design text rather than defects in the code.

**Delivery Record:** `.gener8v/changes/graph-library/delivery/component-packaging-and-source-export-ticket-007-delivery.md`
**Files Reviewed:**
- `src/tool/graphTool.ts`
- `src/tool/handleGraphToolCall.ts`
- `src/tool/index.ts`
- `tests/tool/graphTool.test.ts`
- `tests/tool/handleGraphToolCall.test.ts`
- `tests/tool/provider-rules/anthropic.ts`
- `tests/tool/provider-rules/openai-strict.ts`
- `tests/tool/provider-rules/google.ts`
- `README.md` ("Model tool")
- `.changeset/model-tool.md`
- `.size-limit.json`
- `.gener8v/specifications/component-packaging-and-source-export.md` (coverage rows, OQ-008)

**Findings:** 3
**Critical:** 0 | **Issues:** 0 | **Observations:** 3

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| `graphTool` is `{ name: "generate_graph", description, inputSchema }`, schema imported from the generated tool schema | Yes | `src/tool/graphTool.ts`:graphTool (`getToolSchema()`); `tests/tool/graphTool.test.ts` (identity with `getToolSchema()`, equality with `src/generated/tool-schema.json`) |
| Provider docs re-checked, rules as fixtures in `tests/tool/provider-rules/`, `inputSchema` passes, versions recorded | Yes (by decision) | Pre-Flight Reconciliation in the record; three fixture files with URLs and "checked 2026-11-04"; `graphTool.test.ts` provider-rule blocks. Anthropic `strict: true` and Gemini OpenAPI `parameters` are unsupported by the Engineer's decision recorded in AD-006 and TQ-002, and the test pins that they do not fit. See CR-002 |
| String input parsed; unparsable text (prose-wrapped included) → `invalid_json`; non-object → `not_an_object`; no `graph` → `missing_property` at `/graph` | Yes | `handleGraphToolCall.ts`:handleGraphToolCall, handleInput; tests "input forms" block. Probed: empty text, BOM-prefixed text → `invalid_json`; `[]` → `not_an_object` |
| Input over the documented limit fails stating it, without parsing | Yes | `handleGraphToolCall.ts` `TOOL_INPUT_LIMIT` check before `JSON.parse`; test with a `JSON.parse` spy |
| Nulls inside `graph` removed before validation; success `{ ok, description, provenance, summary }` with type, "was produced", text alternative | Yes | `withoutNulls`; handleInput success branch (adds `textAlternative` field per the ticket's own hazard); probed `{graph:{type:"circle",radius:5,unit:null}}` → "The circle was produced." |
| Invalid result `{ ok: false, issues, summary }`, summary numbered path and message | Yes | `failureSummary` (uses `formatIssue`, cap 20, "…and N more"); tests for numbering, escaping, cap |
| Unexpected error → `internal_error`; ≥ 10,000 generated inputs never throw | Yes | outer `try/catch` in `handleGraphToolCall`; test "returns a well-formed result for 10,000 generated inputs"; "internal_error" test checks no `file:`, `/node_modules/` or `    at ` |
| `inputSchema` validates against the meta-schema it declares | Yes | `graphTool.test.ts` 2020-12 meta-schema test. The schema declares no `$schema`, so the generator's dialect is used. See CR-002 |
| `src/tool` imports no React, no model SDK; no provider dependency | Yes | `src/tool/index.ts` header and imports (`../core/*` only); import test and zero-dependency test in `handleGraphToolCall.test.ts`; `pnpm check:deps` re-run: 0 runtime dependencies |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| CPSE-REQ-027 | Tool definition: name, description, input schema | `src/tool/graphTool.ts`:graphTool | Yes |
| CPSE-REQ-028 | Schema derived from the published definitions | `src/tool/graphTool.ts`:graphTool (`getToolSchema`); equality test | Yes |
| CPSE-REQ-029 | Provider-neutral; no provider dependency | `graphTool.ts`, `index.ts`; import and dependency tests | Yes |
| CPSE-REQ-030 | Object or JSON text input | `handleGraphToolCall.ts`:handleGraphToolCall, withoutNulls | Yes |
| CPSE-REQ-031 | Unparsable text → not-valid-JSON issue | `handleGraphToolCall.ts`:handleGraphToolCall (`invalid_json`, parser message as `detail` only) | Yes |
| CPSE-REQ-032 | Valid input → success with normalized description | `handleGraphToolCall.ts`:handleInput | Yes |
| CPSE-REQ-033 | Invalid input → structured issues | `handleGraphToolCall.ts`:handleInput, `inGraph` | Yes |
| CPSE-REQ-034 | Plain-text summary with each result | `failureSummary`; success summary in handleInput | Yes |
| CPSE-REQ-035 | Handler never throws | outer `try/catch`; `failure()` throw is inside it | Yes |
| CPSE-REQ-036 | Never calls or contacts a model | no network or SDK import; import test | Yes |
| CPSE-NFR-004 | Tool schema valid against its meta-schema, CI test | `tests/tool/graphTool.test.ts` meta-schema test (ran, 13 tests pass) | Yes |
| CPSE-NFR-006 | ≥ 10,000-input property test, never throws | `tests/tool/handleGraphToolCall.test.ts` "10,000 generated inputs" (ran, 24 tests pass) | Yes |

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/IC-001 | Provider schema subsets | Yes (documented partial) | Supported modes encoded as fixtures; two unsupported modes recorded and documented in README, per the amended AD-006 |
| prd/RF-002 | Strict-profile tool schema, nulls as absent | Yes | Nulls stripped only in the handler (`withoutNulls`), never in `validate` |
| prd/CC-003 | Never expose internals or exception text | Yes | `internal_error` has a fixed message; only the parser message reaches `invalid_json` as `detail` |
| prd/TC-005 | No React or browser globals in `./tool` | Yes | Imports checked; lint boundary rule passed on re-run |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-006 (amended 2026-11-04) | One generated strict-profile schema, no adapters; handler strips nulls; supported/unsupported modes documented | Yes | `graphTool` uses the generated schema; README "Supported modes" and "Not supported" |
| AD-015 | `generate_graph`, `ToolResult`, wrapped handler, summary | Yes, with the `textAlternative` field added | Success carries a separate capped `textAlternative`. The design text was not updated. See CR-001 |
| AD-001 | `./tool` has no React | Yes | Imports |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| CPSE-REQ-027, 028, 029, 036 | `@spec CPSE-REQ-027, CPSE-REQ-028, CPSE-REQ-029, CPSE-REQ-036` | `src/tool/graphTool.ts`:graphTool | Yes |
| CPSE-REQ-030 | `@spec CPSE-REQ-030` | `src/tool/handleGraphToolCall.ts`:withoutNulls | Yes |
| CPSE-REQ-032, 033, 034 | `@spec CPSE-REQ-032, CPSE-REQ-033, CPSE-REQ-034` | `src/tool/handleGraphToolCall.ts`:handleInput | Yes |
| CPSE-REQ-030..036 | `@spec CPSE-REQ-030, … CPSE-REQ-036` | `src/tool/handleGraphToolCall.ts`:handleGraphToolCall | Yes |
| CPSE-REQ-006, 029, 036 | `@spec CPSE-REQ-006, CPSE-REQ-029, CPSE-REQ-036` | `src/tool/index.ts` | Yes |

**Coverage:** 10 of 10 requirements annotated (CPSE-REQ-027..036); the NFRs are verified by tests
**Missing:** None
**Specification table:** Yes. The `## @spec Coverage` table has rows for CPSE-REQ-027..036 and CPSE-NFR-004/006 at the same locations. OQ-008 is closed.

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `npx vitest run --no-cache --maxWorkers=4 tests/tool` (GRAPH_GENERATOR_PREBUILT=1) | 0 (37 of 37) | Yes |
| `pnpm typecheck` | 0 | Yes |
| `pnpm lint` | 0 | Yes |
| `pnpm check:deps` | 0 (0 runtime dependencies) | Yes |
| `pnpm check:changesets` | 0 (15 checked) | Yes |
| Full loop (vitest ×3 on 2,497 tests, bench, build, check:dist, check:images, size, publint, attw, audit) | not re-run | Not reproduced by this review; the tool subset and the static checks above match |

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | 2,000,000 is about 2.3× the measured compact maximum (876,079); the `\u`-escape overflow is documented in the README and the code comment |
| DEL-002 | Reasonable | Capping the field too settles the ticket's open question; the cap splits no surrogate pair |
| DEL-003 | Reasonable | 41 kB is the measured 33.93 kB × 1.2, rounded up |
| DEL-004 | Reasonable | No `pattern` in the tool schema, since Gemini does not document it; `validate` is the gate |
| DEL-005 | Reasonable | `/graph`-prefixed paths match what the model wrote; `term: "input"` is a small, recorded deviation |
| DEL-006 | Reasonable | Descriptor reads, so no getter runs; a budget and a null-prototype target. Probed hostile and deep inputs returned results |

## Findings

### CR-001: AD-015 and the ToolResult data-model entry omit the `textAlternative` field

**Severity:** Observation
**Location:** `.gener8v/technical-design/system-design.md` (AD-015 Decision; "ToolResult" key fields); `src/tool/handleGraphToolCall.ts`:ToolResult
**Traces To:** AD-015; ticket Known Hazard on the separate text-alternative field
**Description:** The success result gains `textAlternative` (capped at 4,000 characters), as the ticket's hazards asked. AD-015 and the ToolResult entry still list `{ ok, description, provenance, summary }`. AD-006 was amended in this delivery, AD-015 was not.
**Impact:** The design understates the public result shape for the next reader or amender.
**Recommendation:** Amend AD-015 and the ToolResult entry, with a dated note, to include the capped `textAlternative`.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-11-04): AD-015 and the ToolResult entry name `textAlternative`, its 4,000-character cap and the 2,000,000-character input limit (Technical Design amendment, Architect-approved 2026-11-04).

---

### CR-002: Two acceptance criteria are met by decision, and the ticket text still reads the original way

**Severity:** Observation
**Location:** `.gener8v/changes/graph-library/tickets/component-packaging-and-source-export/TICKET-007.md` (criteria 2 and 8); `tests/tool/graphTool.test.ts`
**Traces To:** Acceptance criteria 2 and 8; AD-006 (amended); CPSE-NFR-004
**Description:** Criterion 2 says `inputSchema` passes all three providers, but Anthropic `strict: true` and Gemini OpenAPI `parameters` are unsupported by the Engineer's decision. Criterion 8 says "the meta-schema it declares", but the schema declares no `$schema`, so the test uses 2020-12. Both are recorded in the delivery record and the amended design, and both are sound. The ticket itself was not annotated.
**Impact:** A later reader of the ticket alone sees two criteria that the code does not literally meet.
**Recommendation:** Append a dated reconciliation note to the ticket, or accept the delivery record as the source of truth. A `$schema` could also be added if the generator should declare its dialect, but that is a GSV TICKET-005 matter.
**Status:** Resolved
**Resolution:** Fixed: a dated reconciliation note on TICKET-007 says criteria 2 and 8 are met as decided (supported modes per AD-006; 2020-12 as the dialect, the schema declaring none).

---

### CR-003: The tool description's list of graph types is not tied to the registered definitions

**Severity:** Observation
**Location:** `src/tool/graphTool.ts`:DESCRIPTION; `tests/tool/graphTool.test.ts`
**Traces To:** CPSE-REQ-027; CPSE-REQ-028 (spirit: nothing maintained separately)
**Description:** The description hand-lists the twelve types. This matches the twelve registered definitions today (number-line, xy, xyz, line, bar, pictograph, circle, ruler, square, triangle, cube, cylinder). The test checks only its shape (`/^[A-Z][^\n]{100,}\.$/`), so a thirteenth type could be added without the model being told.
**Impact:** Low; drift would be silent and the model would simply not know the type exists. The schema's `type` enum would still allow it.
**Recommendation:** Add a test that each registered definition's display name appears in the description, or derive the list from the registry.
**Status:** Resolved
**Resolution:** Fixed: a test in `tests/tool/graphTool.test.ts` holds a phrase table that must equal the registered types exactly, each phrase appearing in the description. Mutant (a type removed from the description) → the test fails.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Fixed | AD-015 and ToolResult amended | `.gener8v/technical-design/system-design.md` |
| CR-002 | Fixed | reconciliation note on the ticket | `.gener8v/changes/graph-library/tickets/component-packaging-and-source-export/TICKET-007.md` |
| CR-003 | Fixed | description tied to the registry by a test | `tests/tool/graphTool.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (all three fixed, 2026-11-04)
**Notes:** All observations fixed in resolution.
