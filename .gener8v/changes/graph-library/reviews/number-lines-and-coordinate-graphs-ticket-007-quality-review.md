# TICKET-007: Report a tick spacing that leaves fewer than two ticks in the axis range — Quality Review

## Summary

Reviewed the `too_few_ticks` rule added to the shared axis checks, its issue-code registration, and the three test files, at commit eb820d4. The code is small, consistent with its neighbours and well tested at the boundaries. One Concern: the caller-facing `tickSpacing` description still states only the upper bound, so a caller reading the vocabulary cannot learn the new rule. Two Suggestions on test organisation and a timing assertion. 3 findings: 0 Critical, 1 Concern, 2 Suggestions.

**Files Reviewed:**
- src/core/issues.ts
- src/core/definitions/axis.ts
- tests/core/axis.test.ts
- tests/core/number-line.test.ts
- tests/core/issues.test.ts
- .changeset/tick-spacing-with-fewer-than-two-ticks-rejected.md

**Findings:** 3
**Critical:** 0 | **Concerns:** 1 | **Suggestions:** 2

## Quality Assessment

### Code Organization

**Rating:** Strong
**Notes:** The rule lives in `axisSpacingIssues`, the one place that owns tick-spacing checks, shared by every axis type. The new constant `MIN_AXIS_TICKS` is named and documented. Issue-code registration touches the three places the codebase requires (`ISSUE_CODES`, `issueDocs`, `IssueParamsByCode`, template). The 100-tick case builds its issue through a helper (`tooManyTicks` in `src/core/value-scale.ts`), while the new case builds it inline; the asymmetry is minor and not raised as a finding.

### Readability

**Rating:** Strong
**Notes:** The early-return ordering (invalid, narrow, too many, too few) reads top to bottom and the comment explains why the default spacing is a safe suggestion. The ternary with a long inline `createIssue` call at `src/core/definitions/axis.ts:141-143` is a 170-character line, but matches the file's existing line lengths.

### Error Handling

**Rating:** Strong
**Notes:** Never two spacing issues for one axis; a narrow range and a non-positive spacing win over the new rule; the count is arithmetic, so work is constant for `2e9` and `1e-300`. The message states the count, the minimum and a spacing that validates, with singular/plural handled via `count()`.

### Test Coverage

**Rating:** Strong
**Notes:** Executed in this review: `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache --maxWorkers=4 tests/core/axis.test.ts tests/core/number-line.test.ts tests/core/issues.test.ts` exit 0, 3 files, 99 tests passed. `npx eslint` on the five changed source and test files: exit 0, no output. `npx tsc --noEmit`: no output. (The full suite and `pnpm bench` were not re-run here; the delivery record reports one unrelated flaky property test in `tests/core/triangle-solver.property.test.ts`.) Boundaries 0/1/2 ticks, no double issue, no issue without a spacing, extreme values, the tolerance edge, `createGraph` and the message's own suggestion applied are all pinned. Mutation checks in the delivery record support test strength.

### Observability & Operability

**Rating:** Adequate
**Notes:** The library is pure validation; it has no logging. The failure is visible to the caller as a coded issue with a path, count and actionable message, which matches the surrounding codes. The one gap is that the rule is not discoverable from the vocabulary (QR-001).

## Findings

### QR-001: The `tickSpacing` description in the vocabulary does not state the new lower bound

**Category:** Maintainability
**Severity:** Concern
**Location:** `src/core/definitions/axis.ts:27-28` and `src/core/definitions/axis.ts:53`
**Description:** The `tickSpacing` property description (copied into the generated vocabulary that callers and prompts read) says "greater than 0 and at most 4000000000, giving at most 100 ticks" and nothing about giving at least two. The doc comment above `axisProperties` likewise names only the `<= 0` rule. The check's name string (`axis.ts:159`) also still says "at most 100 ticks". The delivery (DEL-001) kept these unchanged to keep `src/generated/*` stable, so a description a caller consults before validating is now incomplete: a caller following it can write exactly the DS-002 input and only learn the rule from the rejection.
**Impact:** The vocabulary is the documented contract of the description language (GSV-NFR-005's spirit); an incomplete contract costs a round trip per caller and invites the same silent-spec drift that produced DS-002. Regenerating `src/generated` is a deliberate step, not a hazard.
**Recommendation:** Add "and at least 2 ticks" to the `tickSpacing` description and the check name, regenerate `src/generated/vocabulary.json` in the same change, and update the doc comment at line 27. If the Product Owner prefers to hold the generated files, record a deferral to the Specification/Technical Design amendment that adds the lower-bound requirement.
**Status:** Resolved
**Resolution:** Fixed under code review CR-003 (approved by Engineer — Thomas Eaves, 2026-11-02): the `tickSpacing` description and the check name state the two-tick minimum; the vocabulary, schema and tool schema carry it.

---

### QR-002: New number-line tests sit under an unrelated `describe`, and one title is unclear

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/core/number-line.test.ts:130-164`
**Description:** The four new tests are inside `describe("custom labels off a tick (NLC-REQ-020)")` though only the last concerns custom labels. The second is titled "applies the spacing the message names, and allows a line with one tick fewer than the default only at two", which does not describe its assertions.
**Impact:** Findability: someone looking for tick-spacing validation on number lines will not look under custom labels.
**Recommendation:** Move the first three into their own `describe("a tick spacing with fewer than two ticks (DS-002)")` and retitle the second "accepts the spacing the message names; one tick is rejected, two accepted".
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-11-02): the NLC-007 tests have their own `describe` in `tests/core/number-line.test.ts`; the unclear title now reads "accepts the spacing the message names; one tick is rejected, two accepted".

---

### QR-003: A wall-clock assertion in the constant-time test can flake under load

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/core/axis.test.ts` (test "counts a huge or tiny spacing arithmetically, in constant time")
**Description:** `expect(performance.now() - started).toBeLessThan(50)` bounds five validations by 50 ms of wall clock. The suite is run with parallel workers and the delivery record itself reports a flaky run.
**Impact:** A loaded CI machine could fail an unrelated change; the behavioural assertions in the same test already prove correct results for the extreme inputs.
**Recommendation:** Keep it only if the neighbouring tests do the same (check `tests/core/axis.test.ts` for the existing 100-tick work-bound pattern and follow it); otherwise raise the bound generously or drop it in favour of the result assertions, which would hang rather than pass if the work were enumerative.
**Status:** Resolved
**Resolution:** Fixed under code review CR-003 (approved by Engineer — Thomas Eaves, 2026-11-02): the wall-clock assertions are work counts.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fixed | via CR-003 | `src/core/definitions/axis.ts`, `src/generated/*` |
| QR-002 | Fixed | own describe; title | `tests/core/number-line.test.ts` |
| QR-003 | Fixed | via CR-003 | `tests/core/axis.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 — three fixed (Engineer — Thomas Eaves, 2026-11-02)
