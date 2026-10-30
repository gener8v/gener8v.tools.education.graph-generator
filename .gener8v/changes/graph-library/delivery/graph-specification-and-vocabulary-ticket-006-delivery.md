# TICKET-006: All-types completeness checks — Delivery Record

## Ticket Reference

**Ticket:** graph-library/graph-specification-and-vocabulary/TICKET-006
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/graph-specification-and-vocabulary.md`
**Requirements Covered:**
- GSV-REQ-003: Exactly the supported graph types (completion — registry and schema)
- GSV-NFR-003: Schema and validation agree across all types — verified by the property test generating ≥ 1,000 descriptions per type in CI
- GSV-NFR-005: Every vocabulary term, issue code and graph type is documented — verified by a documentation test that fails on any undocumented entry

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Predecessors TICKET-004, TICKET-005 and every cross-area type ticket delivered (DEP-005) | all types registered | `src/core/definitions/index.ts` and `src/layout/registry.ts` hold all twelve `GRAPH_TYPES` (graph-library's eleven and the ruler); `main` at `73906d6` | ✅ |
| "Exactly the eleven" | per the Known Hazard | superseded: exactly the types in `GRAPH_TYPES` (twelve, the ruler included) | ✅ — hazard applied |
| `issueDocs`, `scripts/generate.ts`, `src/generated/vocabulary.json`, `tests/core/schema-agreement.test.ts` | present | present; the agreement test loops over `registeredTypes(registry)` with `RUNS = 1_000` | ✅ |
| `tests/core/completeness.test.ts` | to be created | absent | ✅ |
| An example per type | `examples/<type>.json` | one for each of the twelve types (plus three extra triangle sets) | ✅ |
| CI freshness step | present | `.github/workflows/ci.yml` runs `pnpm generate` and fails on a changed `src/generated` | ✅ |
| Carried: GSV TICKET-001 CR-006 (tighten `definitions` to a full `Record<GraphType, …>` once every type is registered) | this ticket | `definitions: Registry` (partial); `layouts: LayoutRegistry` (partial) | 🔁 Carried — see plan |
| Carried: the bundle test's placeholder (`OTHER_TYPE` outside `GRAPH_TYPES`; injection regexes in step with the tables' text) | this ticket | `OTHER_TYPE = "not-a-graph-type"` already (GSS TICKET-007); regexes match `Object.create(null) as Partial<Record<…>>` | 🔁 Carried — keep the cast text, check the regexes still match |
| Carried: caller-text limits already checked for every type (`tests/core/validate-structure.test.ts`) | not duplicated | present | ✅ |

**Resolved from ground truth (not escalated):**
- *Eleven or twelve types.* Twelve, by the Known Hazard: the ruler is registered.

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-10-30
**Implemented by:** sonnet · medium — routed as deliver-small from Tower

### Planned Files

- `tests/core/completeness.test.ts` (new): the definitions registry and the layout registry each hold exactly the types in `GRAPH_TYPES` (twelve: graph-library's eleven and the ruler); the published schema's `anyOf` has one branch per type; every vocabulary term, issue code (`issueDocs`) and graph type has a non-empty description, and a deliberately broken copy proves the check reports a gap (GSV-NFR-005); every vocabulary string term shows `maxLength`; every type's `examples/<type>.json` passes `validate`.
- `src/core/definitions/index.ts`, `src/layout/registry.ts` (carried GSV TICKET-001 CR-006): `definitions` and `layouts` typed as full `Readonly<Record<GraphType, …>>`, so a missing type is a compile error; the test-fixture registries keep the partial `Registry` / `LayoutRegistry` types; the `Object.create(null) as Partial<…>` cast text is kept so the bundle test's injection regexes still match.
- `tests/core/schema-agreement.test.ts`: confirm it runs over all twelve types at 1,000 runs each; changed only if needed.
- Generated files: the CI freshness step (`pnpm generate` leaves `src/generated` unchanged) runs in the verification.
- `.gener8v/specifications/graph-specification-and-vocabulary.md`: `@spec Coverage` rows. An undocumented issue code, if found, is fixed in `src/core/issues.ts` rather than by weakening the test.

### How Acceptance Criteria Will Be Met

- Registry holds exactly the `GRAPH_TYPES`; the schema's `anyOf` has one branch per type — `tests/core/completeness.test.ts`.
- The test fails on any undocumented term, issue code or type — the same file, with a broken-copy negative test.
- The agreement property runs over every registered type at ≥ 1,000 each and passes — `tests/core/schema-agreement.test.ts` in the Verification Run.
- Every type's example passes `validate` — `tests/core/completeness.test.ts`.
- Generated files fresh — `pnpm generate` then `git status --porcelain src/generated` empty.

## Progress

- [x] `tests/core/completeness.test.ts`
- [x] Full-record `definitions` and `layouts` types
- [x] `tests/core/schema-agreement.test.ts` confirmed
- [x] `@spec Coverage` rows

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `tests/core/completeness.test.ts` (new, 20 tests): the registries hold exactly `GRAPH_TYPES`; the schema's `anyOf` has one branch per type (`properties.type.const`); the vocabulary's `graphTypes` are `GRAPH_TYPES`; every type's example passes `validate`; `undocumented(vocabulary, issueDocs)` finds no undocumented term, issue code or type, and finds the planted ones in a broken copy; every string property under `vocabulary.graphTypes` has a numeric `maxLength`.
- `src/core/definitions/index.ts`: `definitions` is `Readonly<Record<GraphType, GraphTypeDefinition>>`, its literal `satisfies Record<GraphType, GraphTypeDefinition>` (carried GSV TICKET-001 CR-006).
- `src/layout/registry.ts`: `layouts` is `Readonly<Record<GraphType, Layout>>`, likewise.
- `.gener8v/specifications/graph-specification-and-vocabulary.md`: `@spec Coverage` — `src/layout/registry.ts`:layouts and the completeness test on GSV-REQ-003; a GSV-NFR-005 row.
- `tests/core/schema-agreement.test.ts`: unchanged; it already covers every registered type. No changeset: neither registry is exported from the package.

## Verification Run

Run in the main session on 2026-10-30, after the code was written.

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm generate` + `git status --porcelain src/generated` | 0 | no change: generated files fresh with every type registered |
| `pnpm lint` / `pnpm typecheck` | 0 / 0 | — |
| `npx vitest run --no-cache` ×3 | 0, 0, 0 | 2,225 passed each (2,205 before) |
| `npx vitest run --no-cache --reporter=verbose tests/core/schema-agreement.test.ts` | 0 | all twelve registered types at 1,000 descriptions each, plus the negative control (17 passed) |
| `pnpm bench` | 0 | 19 passed |
| `pnpm build` / `check:dist` / `check:deps` / `check:images` / `check:changesets` / `size` / `publint` / `attw` | 0 each | — |
| `pnpm audit` / `pnpm audit --prod` | 0 / 0 | No known vulnerabilities found |
| Mutation checks | — | `cylinder` removed from `definitions` → `tsc` fails (2 errors); a blank `insufficient` issue doc → 2 completeness tests fail |
| `gener8v-state.py state` / `lint` | 0 / 0 | 0 errors, 0 warnings |

## Acceptance Criteria Verification

- [x] The registry holds exactly the types in `GRAPH_TYPES` (graph-library's eleven and the ruler, per the Known Hazard), and the published schema's `anyOf` has one branch per type — `tests/core/completeness.test.ts`; a missing type also fails to compile.
- [x] The test fails when any vocabulary term, issue code or graph type lacks a non-empty description (GSV-NFR-005) — the broken-copy tests and the blank-doc mutant.
- [x] The schema–validation agreement property runs over all registered types at ≥ 1,000 each and passes (GSV-NFR-003) — verbose run above.
- [x] Every type has `examples/<type>.json` that passes `validate` — `tests/core/completeness.test.ts`.
- [x] Generated files are fresh — `pnpm generate` leaves `src/generated` unchanged.

## Decisions Made

### DEL-001: Where `maxLength` is checked

**Context:** The vocabulary's top-level `terms` carry only `definition` and `kind`; `maxLength` is on each type's properties under `graphTypes`.
**Decision:** The string-limit check walks `vocabulary.graphTypes` recursively.

### DEL-002: Full-record registry types, partial types kept for fixtures

**Decision:** `definitions` and `layouts` are full records; the `Registry` / `LayoutRegistry` types and the `…With(registry)` functions stay partial for test fixtures. The `Object.create(null) as Partial<Record<…>>` cast text is unchanged, so the bundle test's injection regexes still match. No call site changed.

## Deviations from Plan

None — implementation followed the approved plan.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| GSV-REQ-003 | `src/core/definitions/index.ts`:definitions; `src/layout/registry.ts`:layouts; `tests/core/completeness.test.ts` | existing `@spec` on `definitions`; coverage rows |
| GSV-NFR-003 | `tests/core/schema-agreement.test.ts` | (test) |
| GSV-NFR-005 | `tests/core/completeness.test.ts` | (test) |

## Notes

- Closes DEP-005: every type is registered, documented and checked against the schema.

## Post-Review Amendments

None
