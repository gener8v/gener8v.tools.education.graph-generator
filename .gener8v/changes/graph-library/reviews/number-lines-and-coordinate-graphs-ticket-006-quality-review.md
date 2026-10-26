# TICKET-006: Keep floating-point noise out of axis tick labels when the tick spacing is computed — Quality Review

## Summary

Reviewed delivery commit db8f558: a one-line change to `decimalPlaces` in `src/core/value-scale.ts` (the spacing now passes through the existing `cleanDecimal`) plus tests in three files. The change is small, reuses the package's single noise rule, and is well tested. Lint, typecheck and the full test run pass. Two Suggestions, no Critical findings or Concerns.

**Files Reviewed:**
- `src/core/value-scale.ts`
- `tests/layout/kit/ticks.test.ts`
- `tests/layout/number-line.test.ts`
- `tests/layout/bar-graph.test.ts`

**Findings:** 2
**Critical:** 0 | **Concerns:** 0 | **Suggestions:** 2

## Quality Assessment

### Code Organization

**Rating:** Strong
**Notes:** The fix sits in the one private helper both `axisTick` and `axisTickLabel` share (`src/core/value-scale.ts:477`), so every caller inherits it with no duplicated rule. `cleanDecimal` is reused rather than a second rounding rule added. The `// @spec` placement and JSDoc follow the neighbouring functions.

### Readability

**Rating:** Strong
**Notes:** The comment names the defect (DS-001) and the reason the ticks are not cleaned the same way (QR-002), with a worked example (0.1 × 3 counts 1 decimal, not 17). One imprecision: see QR-002.

### Error Handling

**Rating:** Strong
**Notes:** No new failure path. Non-finite values are still refused in `axisTickLabel`. Probe with `TSX_DISABLE_CACHE=1 npx tsx -e` on `niceTicks`/`axisTickLabel`: `0.1*3` over 0 to 1.2 gives `0, 0.3, 0.6, 0.9, 1.2`; the same spacing from 1000000 gives `1000000.2, 1000000.5, ...` (far-from-zero digits kept); `1/3` gives 12 decimals, as DEL-002 records; a spacing of 3e-12 is refused by `niceTicks` as an undrawable axis, as before.

### Test Coverage

**Rating:** Strong
**Notes:** Commands run: `pnpm lint` exit 0; `pnpm typecheck` exit 0; `npx vitest run --no-cache` exit 0, 53 files, 1481 tests passed. `pnpm size` and `pnpm generate` were not run by instruction. The tests are table driven over four computed spacings (`0.1 * 3`, `0.1 + 0.2`, `0.7 / 7`, `0.2 * 3`), pin the `1 / 3` boundary, compare the number line's scene against the typed `0.3` spacing, and assert the text alternative is unchanged. The delivery record's mutation check shows the number-line and ticks tests fail without the fix. The bar-graph test does not (QR-001).

### Observability & Operability

**Rating:** Adequate
**Notes:** A pure formatting helper in a library with no logging or metrics; nothing is expected. Out-of-range input still throws a `RangeError` with the offending value.

## Findings

### QR-001: Bar-graph test passes with and without the fix

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/layout/bar-graph.test.ts:278-283`
**Description:** The new `value axis labels (defect sweep DS-001)` test asserts tick values for `tickInterval: 0.1 * 3`, not label text. The delivery record says it passes with and without the fix because the data graphs use `onGrid`. Its title says it "labels a tick interval ... with the value meant", which it does not prove.
**Impact:** A reader takes it as a regression guard for the label fix when it guards only the tick values. If the data graphs later stop going through `onGrid`, it will not catch label noise.
**Recommendation:** Rename it to what it pins (for example "keeps tick values on the intended multiples for a computed tick interval"), or assert on the tick label nodes' text if the bar graph draws them.
**Status:** Resolved
**Resolution:** Fixed under code review CR-001 (Engineer — Thomas Eaves, 2026-10-26): the test also asserts the printed label text through `tickLabelNodes`, is renamed "keeps clean tick labels for a tick interval worked out in floating point", and its comment says it guards the bar graph rather than proving the fix.

---

### QR-002: Comment and test name say "twelve decimal places" for a 12-significant-digit rule

**Category:** Readability
**Severity:** Suggestion
**Location:** `tests/layout/kit/ticks.test.ts:263`, `src/core/value-scale.ts:471-474`
**Description:** `cleanDecimal` keeps 12 significant digits, not 12 decimals. `1 / 3` labels at 12 decimals only because it is below 1. A spacing such as `12345.6789012345` would label at 7 decimals, and the probe of `1e13 + 1e-3` labels as whole numbers. The test title "not a short decimal at twelve decimal places" and DEL-002's wording read as a decimal-place limit.
**Impact:** Minor. A future reader may expect a fixed 12-decimal cap and mis-predict labels for larger spacings.
**Recommendation:** Say "twelve significant digits" in the test title and add that to the `decimalPlaces` JSDoc.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-26). The test is renamed "labels a spacing longer than twelve significant digits at twelve significant digits" and adds `12345.6789012345` (labels `12345.6789012`, `24691.3578025`); `decimalPlaces`' comment names `cleanDecimal`'s 12 significant digits and gives both examples. DEL-002's wording is corrected in the delivery record's Post-Review Amendments.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fixed (via CR-001) | Bar-graph test asserts label text and says what it guards | `tests/layout/bar-graph.test.ts` |
| QR-002 | Fixed | Test renamed with a 5-digit-integer case; `decimalPlaces` comment says significant digits | `tests/layout/kit/ticks.test.ts`, `src/core/value-scale.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (QR-001 and QR-002 fixed)
