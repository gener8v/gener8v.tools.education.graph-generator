# TICKET-007: Provide the model tool definition and the never-throwing tool handler — Quality Review

## Summary

Reviewed the model tool delivered at d0ab514 (`graphTool`, `handleGraphToolCall`, three provider-rule fixtures, 37 tests). The code is well organised, thoroughly documented, bounded against hostile input and covered by behaviour-level tests; the commands I ran all pass. Findings are minor: root-level issue messages that steer the model toward the bare description, test helpers that re-implement production logic, and some small readability points. 0 Critical, 1 Concern, 3 Suggestions.

**Files Reviewed:**
- `src/tool/graphTool.ts`
- `src/tool/handleGraphToolCall.ts`
- `src/tool/index.ts`
- `tests/tool/graphTool.test.ts`
- `tests/tool/handleGraphToolCall.test.ts`
- `tests/tool/provider-rules/anthropic.ts`
- `tests/tool/provider-rules/openai-strict.ts`
- `tests/tool/provider-rules/google.ts`
- `.size-limit.json`, `.changeset/model-tool.md`, `README.md` (Model tool section, skimmed)

**Findings:** 4
**Critical:** 0 | **Concerns:** 1 | **Suggestions:** 3

## Quality Assessment

### Code Organization

**Rating:** Strong
**Notes:** Two small source files with one purpose each. `graphTool` derives its schema from `getToolSchema()` and is never hand-written. The handler reuses the core modules (`validate`, `describeNormalized`, `createIssue`, `formatIssue`) rather than duplicating them. Dependency direction is inward (tool imports core; core never imports tool). `index.ts` re-exports only the public surface. Limits are named constants with their measurement rationale beside them.

### Readability

**Rating:** Adequate
**Notes:** Doc comments explain the why (budgets, null-prototype copy, getter-safety). `withoutNulls` is the densest function: a closure-based iterative copy with a `pending` stack, a shared `budget`, a try/catch and four early returns. It is correct but needs a slow read (QR-003). `handleInput` is about 40 lines and sequential, and the final condition `issues.length > 0 || checked === undefined || !checked.valid` repeats a narrowing the earlier branches already established.

### Error Handling

**Rating:** Strong
**Notes:** A single top-level `try/catch` converts any defect into the fixed `internal_error` issue, so no exception text or stack reaches the model. The only inner catches are deliberate and commented (parser message kept as `detail`; a throwing Proxy is passed on for `validate` to refuse). Size is checked before parsing. Issue text goes through `formatIssue`, never raw. One gap: the root-level messages do not fit the tool input (QR-001).

### Test Coverage

**Rating:** Strong
**Notes:** Commands run (GRAPH_GENERATOR_PREBUILT=1):
- `npx vitest run --no-cache --maxWorkers=4 tests/tool`: exit 0, 2 files, 37 of 37 passed, 4.1 s (including the 10,000-run property).
- `pnpm lint`: exit 0, no output.
- `pnpm typecheck`: exit 0, no output.

I did not rerun the full loop (build, size, publint, attw, audit); I relied on the delivery record for those. Coverage covers every acceptance criterion: input forms, invalid JSON, over-limit without parsing (JSON.parse spy), nulls at depth, getter safety, 20-issue cap, escaped hostile path, text-alternative cap, `internal_error` without a stack leak (via a mocked fault), the CPSE-NFR-006 property at 10,000 runs, the meta-schema check and provider rules. Implementer mutants are recorded. Weaknesses are in QR-002.

Probes with `tsx` (scratch in `/private/tmp/claude-501/-Users-thomas-Repositories-gener8v-gener8v-tools-education-graph-generator/90a37181-7c56-4f53-87c3-a87caf6952a9/scratchpad/review-cpse007/p.ts`) matched the documented behaviour for `{graph:null}`, a null property, a valid JSON string, an extra root key, a list, blank text and a BOM-prefixed text.

### Observability & Operability

**Rating:** Adequate
**Notes:** The package is a pure library with no logging or metrics, matching its neighbours, and I do not ask for any. Failures are visible to the caller as structured issues with paths and a summary the model can act on. `internal_error` is deliberately opaque, so a package defect hides its cause from an operator. That is a security trade-off, and the integrator can only learn the cause by catching nothing. The README could say how to report such a defect (QR-004).

## Findings

### QR-001: Root-level messages tell the model to send a bare description

**Category:** Error Handling
**Severity:** Concern
**Location:** `src/tool/handleGraphToolCall.ts:154` (`not_an_object`) and `src/tool/handleGraphToolCall.ts:215` (`invalid_json`)
**Description:** The tool input's own failures reuse the description-level issue codes, so their messages describe the wrong thing. For input `[1]`, the issue line reads "A graph description must be a JSON object with a "type" field; got a list." For blank text, the `invalid_json` message ends "a description is a JSON object…". The model sent a tool input, which must be `{"graph": <description>}`. The header sentence ("call generate_graph again with {"graph": …}") is the only correction, and it conflicts with the numbered line.
**Impact:** A model reading the numbered line may retry with a bare description, which then fails as `missing_property` at `/graph`. That wastes a retry, or loops, for a tool whose purpose is self-correction from the summary.
**Recommendation:** Give the tool-root cases their own wording, for example by passing `term`/`graphType: ROOT` where `createIssue` supports it, or by prefixing the summary line when the path is `/`, e.g. "The tool input must be an object with a `graph` property". Add a handler test that asserts the root-level summary mentions `graph`.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-11-04): `not_an_object` and `invalid_json` take an optional `requirement` (escaped and clipped; the default wording unchanged), and the handler passes the tool's: "The tool input must be a JSON object with a "graph" property holding the description; got a list." Tests for `[1]`, `"x"`, `""` and blank text assert each summary line names `graph`; `tests/core/issues.test.ts` covers the parameter. Mutant (no tool wording) → the tests fail.

---

### QR-002: Test helpers re-implement production logic; one test asserts through a module mock

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/tool/handleGraphToolCall.test.ts:55-57` (`asToolIssues`), `tests/tool/handleGraphToolCall.test.ts:19-30` (`vi.mock` of `describeNormalized`)
**Description:** `asToolIssues` copies the handler's `inGraph` logic (prefix `/graph` on `path` and on `conflicts`), so a mistake in the rule would be repeated in the test and still pass. The `internal_error` test depends on mocking an internal module (`../../src/core/describe`) and its export name, so it is tied to which function the handler calls.
**Impact:** The first weakens the test's power to catch a regression in the prefixing rule; the second makes the test fail on a harmless refactor (for example, calling `describe` instead).
**Recommendation:** Assert prefixing against literal expected paths for a few fixed invalid descriptions (the existing mutant "issue.path raw" shows literals already catch it) and keep the helper only for the bulk comparison. For the defect test, a throwing getter or Proxy placed where the handler reads after validation, or a comment recording that the mock is the deliberate seam, would reduce the coupling.
**Status:** Resolved
**Resolution:** Fixed: literal-path assertions (`/graph/radius`; a contradiction at `/graph/diameter` with `conflicts: ["/graph/radius"]`; `/graph` for `insufficient`); `asToolIssues` kept for the bulk comparison only; the `describeNormalized` mock is commented as the deliberate seam.

---

### QR-003: `withoutNulls` and the tail of `handleInput` are harder to read than they need to be

**Category:** Readability
**Severity:** Suggestion
**Location:** `src/tool/handleGraphToolCall.ts:110-148`, `src/tool/handleGraphToolCall.ts:184`
**Description:** `withoutNulls` mixes the budget accounting, array and object branches, descriptor handling and the deferral queue in one closure with four return points that each mean something different (budget exhausted, unreadable, not plain, Proxy threw). In `handleInput`, `checked` is declared `let` and then re-tested in the last guard, so the reader must prove that `issues.length === 0` implies `checked?.valid`.
**Impact:** This is the security-relevant part of the file and the part most likely to be edited. The cost is review time, not a defect; the 10,000-run property and the mutants give confidence today.
**Recommendation:** Split the per-value work into small named helpers (`copyList`, `copyObject`), or add a one-line comment before each early return naming why the original is passed through. In `handleInput`, return directly from the `validate` branch (`if (!checked.valid) …`), so the final guard and the `failure([])` throw path become unreachable by construction.
**Status:** Resolved
**Resolution:** Fixed: `withoutNulls` split into `copyList` and `copyObject`, each pass-through return commented; `handleInput` returns from each branch, so `failure` always receives an issue and the final guard is gone.

---

### QR-004: `internal_error` leaves an integrator no way to diagnose or report a defect

**Category:** Observability
**Severity:** Suggestion
**Location:** `src/tool/handleGraphToolCall.ts:218-220`; `README.md` "Model tool"
**Description:** The outer `catch` discards the exception entirely, by design, so nothing reaches the model. Nothing is available to the integrator either, and the README does not say what to do when `internal_error` appears.
**Impact:** A genuine package defect would present only as "internal error" with no cause or version, so users could neither work around it nor produce a useful bug report.
**Recommendation:** Add a README sentence: `internal_error` means a defect in the package, with the package version and a reproduction input to report. Optionally expose a non-enumerable or opt-in hook for the caught error, but only if it cannot reach `summary`; the README line alone is sufficient.
**Status:** Resolved
**Resolution:** Fixed: README says `internal_error` means a package defect, to be reported with the package version and the input.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fixed | tool wording for root failures | `src/core/issues.ts`, `src/tool/handleGraphToolCall.ts`, `tests/tool/handleGraphToolCall.test.ts`, `tests/core/issues.test.ts` |
| QR-002 | Fixed | literal paths; seam comment | `tests/tool/handleGraphToolCall.test.ts` |
| QR-003 | Fixed | helpers and early returns | `src/tool/handleGraphToolCall.ts` |
| QR-004 | Fixed | README on `internal_error` | `README.md` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (all four fixed, 2026-11-04)
**Notes:** All findings fixed in resolution and re-verified.
