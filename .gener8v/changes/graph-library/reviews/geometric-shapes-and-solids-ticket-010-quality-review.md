# TICKET-010: Hold the triangle round trip to 10⁻⁹ just above the 0.02° floor for two sides and the included angle — Quality Review

## Summary

Reviewed the SAS solver fix (`fromTwoSidesAndIncluded` now writes the atan2 x distance as `(sj − si) + 2·si·sin²(A/2)`) and its tests: a pinned counterexample, a near-floor property and a B ≈ C property. The change is small, correct in form, consistent with the half-angle form already used for the third side, and well commented. Two Suggestions, no Critical findings or Concerns. Test, typecheck and lint of the changed files pass.

**Files Reviewed:**
- `src/core/geometry/triangle-solver.ts`
- `tests/core/triangle-solver.property.test.ts`

**Findings:** 2
**Critical:** 0 | **Concerns:** 0 | **Suggestions:** 2

## Quality Assessment

### Code Organization

**Rating:** Strong
**Notes:** The change stays inside the one function and reuses `half`, already computed for the third side. The test generator gains a `share` parameter instead of a copied body.

### Readability

**Rating:** Strong
**Notes:** The comment states the old and new forms and why (cancellation for nearly equal sides and a tiny angle), and cites the ticket. The `sinDeg(angle)` call is repeated on both lines, which is minor.

### Error Handling

**Rating:** Strong
**Notes:** Unchanged; the solver still returns `Issue[]` through `checked`. The change adds no new failure path. For equal sides the x distance becomes `2·si·half²`, positive for any angle above zero, so no new zero-denominator case arises.

### Test Coverage

**Rating:** Strong
**Notes:** Commands run, with `GRAPH_GENERATOR_PREBUILT=1`:
- `npx vitest run --no-cache --maxWorkers=4 tests/core/triangle-solver.property.test.ts tests/layout/triangle.test.ts`: exit 0, 2 files, 56 tests passed.
- `npx tsc --noEmit`: exit 0.
- `pnpm lint` (`eslint .`): exit 1, 512 parse errors. Cause: the repository root also sees `.claude/worktrees/agent-*` (another agent's worktree), so typescript-eslint reports multiple tsconfig roots. This is environmental, not from the delivery.
- `npx eslint src/core/geometry/triangle-solver.ts tests/core/triangle-solver.property.test.ts`: exit 0, no output.
The pinned test fails before the fix per the delivery record. The property tests are unseeded and `RELATIVE` is unchanged, so no tolerance was loosened. See QR-001 and QR-002.

### Observability & Operability

**Rating:** Adequate
**Notes:** A pure numeric function, so no logging is expected. The property failure message includes the term, the error and the input JSON, which makes a counterexample reproducible. fast-check also prints the seed.

## Findings

### QR-001: Two properties share one test case

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/core/triangle-solver.property.test.ts:130` (test "two nearly equal sides and an angle near the floor")
**Description:** One `it` runs two `fc.assert` calls (`nearFloor` and `equalish`). If the first fails, the second never runs, and the report does not say which generator failed.
**Impact:** Minor diagnostic cost when an unseeded run fails. The test name describes the first property only.
**Recommendation:** Split into two `it` blocks, for example "an angle near the floor" and "an angle near the floor with B close to C".
**Status:** Resolved
**Resolution:** Fixed: split into "two sides and an angle near the floor between them" and "two nearly equal sides and an angle near the floor between them".

---

### QR-002: The near-floor properties are unseeded, so a failure may not reproduce

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/core/triangle-solver.property.test.ts:127-135`
**Description:** The ticket requires the properties to stay unseeded, which is right. The near-floor generators draw from a narrow band, so a rare miss is possible. The pinned test covers the one known case, but a future miss is only reproducible from the seed fast-check prints.
**Impact:** Low. A flaky-looking failure could be mistaken for noise unless the seed is copied from the output.
**Recommendation:** Optional: pass `examples: [[...]]` for known counterexamples, or add a comment that a failure should be pinned as a regression like `found`.
**Status:** Resolved
**Resolution:** Fixed: a comment above the two properties says they are unseeded on purpose and that a failure's printed seed and values are pinned as a regression test like the one above.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fixed | one property per test | `tests/core/triangle-solver.property.test.ts` |
| QR-002 | Fixed | comment on pinning a failure | `tests/core/triangle-solver.property.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (both fixed, 2026-11-04)
**Notes:** Both suggestions fixed in resolution; the property file passed 3 of 3 runs after.
