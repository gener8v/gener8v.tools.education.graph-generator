# TICKET-006: Keep floating-point noise out of axis tick labels when the tick spacing is computed — Delivery Record

## Ticket Reference

**Ticket:** graph-library/number-lines-and-coordinate-graphs/TICKET-006
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/number-lines-and-coordinate-graphs.md`
**Requirements Covered:**
- NLC-REQ-004: Ticks at every whole multiple of the tick spacing; each label shows the tick's value with no more decimal places than the spacing needs. The defect (DS-001, `.gener8v/sweeps/layout-kit-text-and-axis-sweep.md`) breaks the label rule for a spacing that carries arithmetic noise.

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| `decimalPlaces` in `src/core/value-scale.ts` counts the spacing's shortest printed form | present, private | `src/core/value-scale.ts:472-476`, via `formatSupplied` | ✅ |
| `axisTickLabel` rounds to `decimalPlaces(spacing)`; `axisTick` to `decimalPlaces(spacing) + 3` | present | `src/core/value-scale.ts:485-488` and `:422-425` | ✅ |
| `cleanDecimal` (12 significant digits) exists and is exported | present | `src/core/value-scale.ts:71` | ✅ |
| QR-002 test "keeps ticks far from zero on their multiples" | present | `tests/layout/kit/ticks.test.ts:61` | ✅ |
| `1 / 3` and `2 / 3` cases the hazard names | present | `tests/layout/kit/ticks.test.ts:229-230`, `tests/core/number-line.test.ts:93,100` | ✅ |
| Number line layout tests and their text-node reading | present | `tests/layout/number-line.test.ts` (tick labels block at `:173`) | ✅ |
| Predecessors NLC TICKET-001 and TICKET-002 delivered and reviewed | delivered | both delivery records present; reviews Approved | ✅ |
| Carried findings deferred to this ticket | none | none; NLC TICKET-001 QR-002 and SEC-003 constrain the fix and are named in the ticket's hazards | ✅ |

**Resolved from ground truth (not escalated):** The ticket suggests `cleanDecimal` "for example"; it already exists, is exported, and is the noise rule the data graphs use, so the fix reuses it rather than adding a second rounding rule.

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-10-26
**Implemented by:** sonnet · medium — routed as deliver-small from Tower

Count the tick spacing's decimal places on the spacing with its arithmetic noise removed, reusing the package's existing noise rule (`cleanDecimal`, 12 significant digits). The ticks themselves are not rounded any differently, so far-from-zero ticks keep every digit (QR-002), and the text alternative is not touched.

### Planned Files

- `src/core/value-scale.ts`: `decimalPlaces` counts the decimals of `cleanDecimal(spacing)` instead of the raw spacing, and its comment says why (DS-001). `axisTickLabel` and `axisTick` follow without change; `axisTick`'s `+ 3` rule, the tick values and `describe` are untouched.
- `tests/layout/kit/ticks.test.ts`: a table over `0.1 * 3`, `0.1 + 0.2`, `0.7 / 7` and `0.2 * 3`, asserting `tickLabel` and `niceTicks` give the intended value's decimals (`0.3`, `0.3`, `0.1`, `0.6`); the QR-002 test kept unchanged; `1 / 3` pinned at 12 decimals (`0.333333333333`).
- `tests/layout/number-line.test.ts`: `tickSpacing: 0.1 * 3` from 0 to 1.2 draws the labels `["0", "0.3", "0.6", "0.9", "1.2"]` and the same scene nodes as `0.3`; its text alternative is unchanged (still states the spacing as written).
- `tests/layout/bar-graph.test.ts`: `tickInterval: 0.1 * 3` still labels `0, 0.3, 0.6, 0.9, 1.2`.

### How Acceptance Criteria Will Be Met

- `0.1 * 3` labels `["0", "0.3", "0.6", "0.9", "1.2"]`: the number-line test (criterion 1).
- Same scene nodes for `0.3` and `0.1 * 3`: the number-line test compares the two scenes' nodes (criterion 2).
- Other computed spacings clean: the ticks table (criterion 3).
- QR-002 test unchanged and passing: `tests/layout/kit/ticks.test.ts:61` (criterion 4).
- Exactly typed spacings keep their labels: the existing `decimalPlaces` and label tests (criterion 5).
- Bar graph unchanged: the bar-graph test (criterion 6).
- Text alternative unchanged: the number-line test (criterion 7).
- `pnpm lint && pnpm typecheck && pnpm test` pass: the Verification Run (criterion 8).

## Progress

- [x] `src/core/value-scale.ts` — written
- [x] `tests/layout/kit/ticks.test.ts` — written
- [x] `tests/layout/number-line.test.ts` — written
- [x] `tests/layout/bar-graph.test.ts` — written

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/core/value-scale.ts`: `decimalPlaces` counts the decimals of `cleanDecimal(Math.abs(spacing))`, with `@spec NLC-REQ-004` and a comment naming DS-001 and QR-002. Nothing else in `src/` changed.
- `tests/layout/kit/ticks.test.ts`: a table over `0.1 * 3`, `0.1 + 0.2`, `0.7 / 7` and `0.2 * 3`, and a `1 / 3` pin at twelve decimals.
- `tests/layout/number-line.test.ts`: `0.1 * 3` labels, equal scene nodes with `0.3`, and the unchanged text alternative.
- `tests/layout/bar-graph.test.ts`: the bar graph's ticks for `tickInterval: 0.1 * 3` stay `[0, 0.3, 0.6, 0.9, 1.2]`.

## Verification Run

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm generate` | 0 | no generated file changed |
| `pnpm lint` | 0 | — |
| `pnpm typecheck` | 0 | — |
| `pnpm test` (×3) | 0 | 53 files, 1,481 tests passed each run |
| `pnpm bench` | 0 | 13 passed |
| `pnpm build` | 0 | — |
| `pnpm check:dist` | 0 | — |
| `pnpm check:deps` | 0 | — |
| `pnpm check:images` | 0 | — |
| `pnpm size` | 0 | `./core` 23.11 kB of 25 kB (unchanged) |
| `pnpm publint` | 0 | — |
| `pnpm attw` | 0 | — |
| `pnpm audit` | 0 | No known vulnerabilities found |
| Mutation check: `cleanDecimal` call removed from `decimalPlaces` | — | 6 tests fail (the number-line test, the four table rows, the `1 / 3` pin); restored |

## Acceptance Criteria Verification

- [x] `0.1 * 3` from 0 to 1.2 draws `["0", "0.3", "0.6", "0.9", "1.2"]` — `tests/layout/number-line.test.ts` "labels a spacing worked out in floating point…"; fails with the fix removed
- [x] `0.3` and `0.1 * 3` draw identical scene nodes — same test, `computed.nodes` equals the typed spacing's nodes
- [x] `0.1 + 0.2`, `0.7 / 7` and `0.2 * 3` give clean labels — `tests/layout/kit/ticks.test.ts` table, asserting `niceTicks` and `tickLabel`
- [x] QR-002 test passes unchanged — `tests/layout/kit/ticks.test.ts:61`, not edited, passing
- [x] Exactly typed spacings keep their labels — the existing label and tick tests in `tests/layout/kit/ticks.test.ts` pass
- [x] Bar graph's ticks for `0.1 * 3` unchanged — `tests/layout/bar-graph.test.ts` "value axis labels (defect sweep DS-001)". It pins the tick values the labels are printed from, and passes with and without the fix, since the data graphs use `onGrid`
- [x] Text alternative unchanged — the number-line test asserts it still contains `0.30000000000000004`
- [x] `pnpm lint && pnpm typecheck && pnpm test` pass — Verification Run

## Decisions Made

### DEL-001: Reuse `cleanDecimal` for the spacing's noise

**Context:** The ticket asked for the spacing's decimal count to ignore arithmetic noise, "for example through `cleanDecimal`".
**Decision:** `decimalPlaces` formats `cleanDecimal(Math.abs(spacing))`, the 12-significant-digit rule the data graphs already use.
**Rationale:** One noise rule in the package, not two. Only the spacing is cleaned, so `axisTick` still rounds each tick at the spacing's precision plus three decimals and far-from-zero ticks keep every digit (QR-002).
**Ticket Impact:** None; as planned.

### DEL-002: A spacing with more than 12 significant digits labels at 12 decimals

**Context:** The ticket's hazard: `1 / 3` is not noise, but `cleanDecimal` cuts it to 12 significant digits.
**Decision:** Accept it. A `1 / 3` spacing now labels `0.333333333333` and `0.666666666667` (12 decimals), not 16. A test pins it.
**Rationale:** 12 digits is the package's noise limit. A label of 12 decimals is no less exact for a reader than 16, and is shorter. The `1 / 3` and `2 / 3` custom-label tests in `tests/core/number-line.test.ts` and `tests/layout/kit/ticks.test.ts` still pass, since `isTickValue` matches with a tolerance.
**Ticket Impact:** Recorded as the ticket asked.

## Deviations from Plan

None — implementation followed the approved plan.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| NLC-REQ-004 | `src/core/value-scale.ts`:decimalPlaces | `@spec NLC-REQ-004` |

The spec's `## @spec Coverage` row for NLC-REQ-004 now lists `decimalPlaces`.

## Notes

- NLC TICKET-003 and TICKET-004 inherit the fix through `kit/axis.ts`; they need not fix it again.
- The text alternative still states a supplied spacing as written ("ticked every 0.30000000000000004"), as the ticket required. Whether it should state the spacing meant is open and not part of this ticket.

## Post-Review Amendments

- **graph-library/number-lines-and-coordinate-graphs-ticket-006-code-review/CR-001** (2026-10-26): the bar-graph DS-001 test also asserts the printed tick label text through `tickLabelNodes`, is renamed "keeps clean tick labels for a tick interval worked out in floating point", and says in a comment that it guards the bar graph against a change to either tick rule, since it passed before the fix. Files: `tests/layout/bar-graph.test.ts`. Re-verified: `pnpm lint` 0, `pnpm typecheck` 0, `pnpm test` 0 (1,481 passed).
- **graph-library/number-lines-and-coordinate-graphs-ticket-006-code-review/CR-002** (2026-10-26): DEL-002 applies to any spacing with more than 12 significant digits, not only `1 / 3`: its labels print at 12 significant digits (`0.123456789012345` labels `0.123456789012`). Accepted; no code change.
- **graph-library/number-lines-and-coordinate-graphs-ticket-006-quality-review/QR-001** (2026-10-26): resolved by the CR-001 amendment above.
- **graph-library/number-lines-and-coordinate-graphs-ticket-006-quality-review/QR-002** (2026-10-26): the rule DEL-002 accepts is 12 significant digits, not 12 decimal places: `1 / 3` labels at 12 decimals because it is below 1, and `12345.6789012345` labels at 7 (`12345.6789012`). The test is renamed "labels a spacing longer than twelve significant digits at twelve significant digits" and pins both; `decimalPlaces`' comment says so. Files: `tests/layout/kit/ticks.test.ts`, `src/core/value-scale.ts`. Re-verified: `pnpm lint` 0, `pnpm typecheck` 0, `pnpm test` 0 (1,481 passed).
