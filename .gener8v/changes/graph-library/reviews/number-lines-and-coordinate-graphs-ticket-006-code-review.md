# TICKET-006: Keep floating-point noise out of axis tick labels when the tick spacing is computed — Code Review

## Summary

Reviewed delivery commit db8f558: a one-line change to `decimalPlaces` in `src/core/value-scale.ts` (the spacing is passed through `cleanDecimal` before its decimals are counted) plus tests in three files. All eight acceptance criteria and NLC-REQ-004 are satisfied, the `@spec` annotation and specification coverage row are in place, and the re-run verification reproduces. Two Observations, no Critical findings or Issues.

**Delivery Record:** `.gener8v/changes/graph-library/delivery/number-lines-and-coordinate-graphs-ticket-006-delivery.md`
**Files Reviewed:**
- `src/core/value-scale.ts`
- `tests/layout/kit/ticks.test.ts`
- `tests/layout/number-line.test.ts`
- `tests/layout/bar-graph.test.ts`

**Findings:** 2
**Critical:** 0 | **Issues:** 0 | **Observations:** 2

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| `0.1 * 3` number line draws labels `["0","0.3","0.6","0.9","1.2"]` | Yes | `tests/layout/number-line.test.ts` "labels a spacing worked out in floating point…"; probe of `niceTicks(0, 1.2, 0.1*3)` gives those labels |
| `0.3` and `0.1 * 3` draw identical scene nodes | Yes | Same test: `computed.nodes` `toEqual` the typed spacing's nodes |
| `0.1 + 0.2`, `0.7 / 7`, `0.2 * 3` clean, table over `tickLabel` and `niceTicks` | Yes | `tests/layout/kit/ticks.test.ts` `it.each` table (4 rows); probes for `0.1+0.2` and `0.7/7` agree |
| QR-002 test passes unchanged | Yes | `tests/layout/kit/ticks.test.ts:61` not in the diff; full suite passes |
| Exactly typed spacings keep their labels | Yes | Existing label and `decimalPlaces` tests unchanged and passing; `cleanDecimal` is the identity on short decimals |
| Bar graph's ticks for `tickInterval: 0.1 * 3` unchanged | Yes | `tests/layout/bar-graph.test.ts` "value axis labels (defect sweep DS-001)" (see CR-001) |
| Text alternative unchanged | Yes | `describe` untouched (`src/` diff is `value-scale.ts` only); number-line test asserts `0.30000000000000004` is still stated |
| `pnpm lint && pnpm typecheck && pnpm test` pass | Yes | Re-run below, all exit 0 |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| NLC-REQ-004 | Ticks at every whole multiple of the spacing; labels carry no more decimals than the spacing needs, for a spacing carrying noise too | `src/core/value-scale.ts`:decimalPlaces (read by axisTickLabel and axisTick) | Yes |

### Constraint Compliance

Ticket names no constraints ("None identified"). `.gener8v/constraints/prd.md` holds only project-wide constraints; none engaged. The ticket's QR-002 and SEC-003 hazards are honored: ticks are rounded at `decimalPlaces + 3` as before and only the spacing is cleaned (`niceTicks(1e8, 1e8 + 0.2, 0.0025)` keeps `100000000.0025`).

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| CPSE-REQ-043 (cited by ticket as not engaged) | Descriptions' validity | N/A | The fix changes no validation; validator untouched |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-002 | Pure layout over a Scene | Yes | The change is in pure core arithmetic, no I/O |
| AD-007 | One rounding function for emitted numbers | Yes | Scene numbers still go through the layout's rounding; the change touches label text only |
| AD-016 | Toolchain checks | Yes | lint, typecheck, test, build, `check:deps` re-run at exit 0 |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| NLC-REQ-004 | `@spec NLC-REQ-004` | `src/core/value-scale.ts`:decimalPlaces (line 476) | Yes |

**Coverage:** 1 of 1 requirements annotated. The annotation sits between the JSDoc and the function, like the other `// @spec` lines in this file.
**Missing:** None.
**Specification table:** Yes. The `## @spec Coverage` row for NLC-REQ-004 lists `src/core/value-scale.ts`:decimalPlaces.

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm lint` | 0 | Yes |
| `pnpm typecheck` | 0 | Yes |
| `pnpm test` (run as `npx vitest run --no-cache`) | 0 (53 files, 1,481 tests) | Yes |
| `pnpm build` | 0 | Yes |
| `pnpm check:deps` | 0 | Yes |
| `pnpm generate`, `pnpm size`, `pnpm bench`, `check:dist`, `check:images`, `publint`, `attw`, `audit`, mutation check | not re-run (generate and size excluded by instruction; the rest are not affected by a one-line core change) | Not re-verified |

The delivery record's mutation check was not repeated, to leave source untouched.

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | Reuses `cleanDecimal`, the package's one noise rule; cleans the spacing only, as the ticket's first hazard requires |
| DEL-002 | Reasonable | The 12-decimal result for `1 / 3` is the cost the ticket accepted; pinned by a test. See CR-002 for a wider form of the same effect |

## Findings

### CR-001: The bar-graph test does not exercise the change

**Severity:** Observation
**Location:** `tests/layout/bar-graph.test.ts` ("value axis labels (defect sweep DS-001)")
**Traces To:** Acceptance criterion 6
**Description:** The test passes with and without the fix, because the data graphs use `onGrid`. The delivery record says so. It pins the tick values that the labels print, not the labels, and it does not call the axis path.
**Impact:** None to correctness. It guards only against a future change moving the bar graph onto the axis rule. That is what criterion 6 asks for.
**Recommendation:** None needed. Optionally assert the printed label text beside the tick values.
**Status:** Resolved
**Resolution:** Approved (Engineer — Thomas Eaves, 2026-10-26). The test now also asserts the printed tick label text (`"0"`, `"0.3"`, … `"1.2"`) through `tickLabelNodes`, is renamed "keeps clean tick labels for a tick interval worked out in floating point", and its comment says it guards the bar graph against a change to either tick rule rather than proving the fix. Also resolves quality review QR-001.

---

### CR-002: Any spacing with more than 12 significant digits now labels at 12 digits

**Severity:** Observation
**Location:** `src/core/value-scale.ts:477`
**Traces To:** NLC-REQ-004 (labels show the tick's value); DEL-002
**Description:** DEL-002 and the test cover `1 / 3` only. The same cut applies to a typed spacing with more than 12 significant digits. `niceTicks(0, 1, 0.123456789012345)` now labels `0.123456789012`, `0.246913578025`, and so on. Before the change the labels printed in full. For a spacing whose cleaned form is a whole number (`1234567890123.5`) the labels read `1234567890124`, so the label no longer matches the tick's value. The ticks themselves are unchanged. Only the label cut-off moved, and only for spacings of 13 or more significant digits, which are unrealistic for teaching content.
**Impact:** Negligible for real input; a 13-or-more-digit spacing shows a label rounded at the package's noise limit.
**Recommendation:** Accept, and widen DEL-002's note to say "any spacing over 12 significant digits".
**Status:** Dismissed
**Resolution:** Accepted as designed (Engineer — Thomas Eaves, 2026-10-26). Labels are cut at the package's 12-significant-digit noise limit (`cleanDecimal`) for any spacing with more than 12 significant digits, not only `1 / 3`; such spacings are not realistic teaching content, and values are bounded at ±1e9. DEL-002's scope is widened in the delivery record's Post-Review Amendments; the wording of the test and comment is corrected under quality review QR-002.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Approved | Bar-graph test asserts label text, renamed, comment states what it guards | `tests/layout/bar-graph.test.ts` |
| CR-002 | Dismissed | DEL-002 widened in Post-Review Amendments | delivery record |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (CR-001 resolved, CR-002 dismissed)
**Notes:** Provisional, pending interactive resolution. Probes: `0.1*3`, `0.1+0.2`, `0.7/7` and `1/3` label as the ticket requires; QR-002 holds; `3e-9`-scale and `1e-7` spacings behave. Lint, typecheck, the full test suite, build and `check:deps` re-ran at exit 0.
