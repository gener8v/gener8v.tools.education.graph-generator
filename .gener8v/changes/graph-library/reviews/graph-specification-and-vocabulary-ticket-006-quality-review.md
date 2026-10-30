# TICKET-006: All-types completeness checks — Quality Review

## Summary

Reviewed the new completeness test and the two registry type tightenings (delivery commit `dba9db7`). The code is small, clear and consistent with its neighbours; the checks have negative controls. Two Suggestions, no Critical findings or Concerns.

**Files Reviewed:**
- `tests/core/completeness.test.ts`
- `src/core/definitions/index.ts`
- `src/layout/registry.ts`
- `tests/core/schema-agreement.test.ts` (neighbour, unchanged)

**Findings:** 2
**Critical:** 0 | **Concerns:** 0 | **Suggestions:** 2

## Quality Assessment

### Code Organization

**Rating:** Strong
**Notes:** One test file with a small `undocumented` helper and three `describe` blocks keyed to requirement IDs, matching the surrounding `tests/core` style. The registries keep the partial `Registry` / `LayoutRegistry` types for fixtures and use full `Record<GraphType, …>` for the production tables, so a missing type is a compile error.

### Readability

**Rating:** Strong
**Notes:** Names state intent (`undocumented`, `blank`). The helper has a doc comment, and the gap messages (`term x`, `issue code y`, `graph type z`) are readable in a failure diff. The recursive `walk` is short.

### Error Handling

**Rating:** Strong
**Notes:** Not much applies to a test file. Failures name the kind and key of each gap, and the examples test reports the issue list before asserting validity. The registry edits add compile-time checking.

### Test Coverage

**Rating:** Strong
**Notes:** Commands run in this review:
- `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache` (full suite). First run: exit non-zero, 3 failed, 2222 passed. The failures are all wall-clock assertions in files this ticket did not touch: `tests/react/Graph.test.tsx` "lays out the x,y graph's costliest labels within a second and a half…" (expected 2022.69 to be less than 1500), `tests/react/Graph.test.tsx` "…x,y,z graph's costliest labels…" (expected 1788.61 to be less than 1500) and `tests/layout/kit/text.test.ts` "wrap with maxLines … stops early, so caller-sized text costs little" (expected 1941.76 to be less than 1000). The failing files re-run alone passed (93 of 93), and a second full run passed (73 files, 2,225 tests). I did not establish the cause of the first run's slowness. The failures are not in this ticket's code.
- `tests/core/completeness.test.ts` alone: 20 of 20 passed.
- `pnpm lint`: no output beyond the banner (no errors). `pnpm typecheck` (`tsc --noEmit`): no output beyond the banner (no errors). The exit codes were not captured because of the pipe; the empty output indicates success.
- Not run: `pnpm build` (forbidden here; `dist/` prebuilt).

The new tests cover the registries, the schema branches, the vocabulary entries, the per-type examples and the documentation gaps, including a broken copy and a missing-entry case. See QR-001 and QR-002.

### Observability & Operability

**Rating:** Adequate
**Notes:** There is no runtime logging in the delivery and the project uses none here. The failure surface is the test output, which is attributable by kind and key.

## Findings

### QR-001: The maxLength walk can pass with nothing to check

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/core/completeness.test.ts:105-116`
**Description:** The test collects string nodes lacking `maxLength` and expects an empty list. If the vocabulary's shape changed (for example `kind` renamed, or `graphTypes` emptied), no node would match and the test would pass vacuously. Only the shape of the vocabulary is assumed; there is no negative control, unlike the documentation checks.
**Impact:** A GSV-NFR-005 check could silently stop checking after a generator refactor.
**Recommendation:** Count the string nodes visited and assert the count is greater than zero, or add a broken-copy case for the walk, as the documentation checks have.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-30). `stringLimits` counts the string values it visits and the test requires that count to equal what the definitions declare (53 today, from `declared()`), with a broken-copy case removing one `maxLength`. Renaming `kind` in the vocabulary fails 2 tests. Committed with the code review resolution (`e6d0b44`).

---

### QR-002: Redundant length assertions in the registry tests

**Category:** Readability
**Severity:** Suggestion
**Location:** `tests/core/completeness.test.ts:44-62`
**Description:** `Object.keys(...)` cannot contain duplicates, so `toHaveLength` after the set comparison adds nothing for the two registries. It is meaningful only for the `anyOf` branches, where duplicates are possible. `expect(result.valid).toBe(true)` in the examples test also repeats what the empty-issues assertion proves.
**Impact:** Minor noise; a reader may look for a case these lines guard against.
**Recommendation:** Drop the length assertions on the two registries and keep the one on `named`. Keep the `valid` check only if the empty-issues expectation can pass for an invalid result.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-30). The length assertions on the two registries' keys and the repeated `valid` assertion in the examples test are removed; the length assertion on the schema's `anyOf` branches, where duplicates are possible, stays. Committed in `e6d0b44`.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fix | Visited count matched against the definitions; broken-copy case | `tests/core/completeness.test.ts` |
| QR-002 | Fix | Redundant assertions removed | `tests/core/completeness.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** None
