# TICKET-006: All-types completeness checks — Code Review

## Summary

Reviewed the completeness test, the two registry-typing changes and the `@spec Coverage` rows for GSV TICKET-006, applying the ticket's Known Hazard (exactly the types in `GRAPH_TYPES`, twelve, the ruler included). Every acceptance criterion is met and the Verification Run reproduces. One Observation.

**Delivery Record:** .gener8v/changes/graph-library/delivery/graph-specification-and-vocabulary-ticket-006-delivery.md
**Files Reviewed:**
- tests/core/completeness.test.ts
- src/core/definitions/index.ts
- src/layout/registry.ts
- tests/core/schema-agreement.test.ts
- tests/package/per-type-bundle.test.ts
- .gener8v/specifications/graph-specification-and-vocabulary.md

**Findings:** 1
**Critical:** 0 | **Issues:** 0 | **Observations:** 1

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| Registry holds exactly the types in `GRAPH_TYPES` (Known Hazard: twelve) and the schema `anyOf` has one branch per type | Yes | tests/core/completeness.test.ts: "registers a definition for every graph type, and no other", "registers a layout …", "has one schema branch per graph type"; `definitions` and `layouts` are full `Record<GraphType, …>` so a missing type fails `tsc` |
| Test fails when any term, issue code or graph type lacks a non-empty description | Yes | `undocumented()` and its two broken-copy tests in tests/core/completeness.test.ts; delivery record's blank-doc mutant |
| Agreement property runs over all registered types at ≥ 1,000 each and passes | Yes | tests/core/schema-agreement.test.ts (`RUNS = 1_000`); verbose re-run: all twelve registered types, 17 passed |
| Every type has `examples/<type>.json` that passes `validate` | Yes | per-type test in tests/core/completeness.test.ts; all twelve files present in `examples/` |
| Generated files fresh | Yes | `scripts/generate.ts` re-run left `git status` unchanged for `src/generated` and `tests/fixtures/generated` |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| GSV-REQ-003 | Exactly the supported graph types | src/core/definitions/index.ts:definitions; src/layout/registry.ts:layouts; tests/core/completeness.test.ts | Yes |
| GSV-NFR-003 | Schema and validation agree; ≥ 1,000 descriptions per type | tests/core/schema-agreement.test.ts, ran in Verification Run, 12 types at 1,000 | Yes |
| GSV-NFR-005 | Every term, issue code and type documented; fails on any gap | tests/core/completeness.test.ts "GSV-NFR-005" blocks | Yes |

### Constraint Compliance

The ticket names no constraints ("None identified"). The carried bundle-test hazard is honoured: `OTHER_TYPE = "not-a-graph-type"` (tests/package/per-type-bundle.test.ts:20), and the `Object.create(null) as Partial<Record<…>>` text is unchanged, so the injection regexes still match (bundle test passes in the full run).

### Architecture Decision Adherence

Technical design not assessed beyond the pure-marked registry tables: the `/* @__PURE__ */` wrapping is preserved in both changed declarations.

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| GSV-REQ-003 | `@spec GSV-REQ-003` | src/core/definitions/index.ts:definitions (line above declaration) | Yes |
| GSV-NFR-003 / GSV-NFR-005 | test-verified, no `@spec` needed | tests/core/schema-agreement.test.ts; tests/core/completeness.test.ts | Yes (coverage rows) |

**Coverage:** 1 of 1 code requirement annotated; NFRs are carried by test rows.
**Missing:** None. (`layouts` carries `@spec CPSE-REQ-007, CPSE-REQ-008`; the specification table lists it under GSV-REQ-003 as a coverage row only.)
**Specification table:** Yes — rows for GSV-REQ-003 (definitions, layouts, completeness test), GSV-NFR-003 and GSV-NFR-005 are present.

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm generate` + `git status --porcelain src/generated` (ran `tsx scripts/generate.ts`) | 0, no change | Yes |
| `pnpm typecheck` (ran `tsc --noEmit`) | 0 | Yes |
| `pnpm lint` (eslint on the three changed files only) | 0 | Yes (partial scope) |
| `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache` | 0 — 73 files, 2,225 passed | Yes |
| verbose `tests/core/schema-agreement.test.ts` | 0 — 17 passed | Yes |
| `pnpm build`, bench, check:*, size, publint, attw, audit | not re-run (build forbidden under parallel review) | Not re-verified |

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | `maxLength` lives under `graphTypes`, so the walk targets it; matches the ticket's optional `maxLength` assertion. |
| DEL-002 | Reasonable | Full records for the real tables, partial types kept for fixtures; no call site changed. |

## Findings

### CR-001: Term documentation check cannot detect a term missing from the vocabulary

**Severity:** Observation
**Location:** tests/core/completeness.test.ts:32
**Traces To:** GSV-NFR-005
**Description:** `undocumented` iterates `Object.entries(published.terms)`, so a term that is absent from the published vocabulary is not reported, whereas graph types are checked against `GRAPH_TYPES` and issue codes against `ISSUE_CODES` (both also report absence). Only blank terms are caught. The terms are generated from source, so absence is unlikely today.
**Impact:** A term dropped from the generator's source list would pass silently; low likelihood.
**Recommendation:** If the term list has a source of truth importable from `src/` or the generator, iterate that and report a missing entry; otherwise accept.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-30). `declared()` in `tests/core/completeness.test.ts` collects every term the registered definitions declare (`propertiesOf`, nested terms included) with the envelope's `type` and `version`; `undocumented` now checks each declared term, so a term missing from the vocabulary is reported, and a test requires the vocabulary to hold exactly the declared terms. Mutation-checked: deleting `unit` from the vocabulary fails 4 tests.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Fix | Expected terms derived from the definitions | `tests/core/completeness.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** None
**Notes:** CR-001 fixed during resolution and recorded in the delivery record's Post-Review Amendments.
