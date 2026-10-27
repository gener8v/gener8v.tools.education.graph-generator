# TICKET-009: Choose a default tick spacing the drawn axis has room for — Quality Review

## Summary

Reviewed the delivery at `058d841` against `7359171`: the new `fittedAxisSpacing` decision, `AxisRoom`, `tickLabelWidth` and the optional room on `axisSpacing`/`drawableTicks`/`niceTicks` in core, `planeLengths`/`planeRooms` and the `describe` change in the x,y definition, the layout wiring, and the three test files. The code is well organised, documented with the reasons for each choice, never throws, and heavily tested (property tests with an independent `textWidth` search, plus mutation checks recorded in the delivery). The one real concern is that core now re-states layout constants by hand, kept honest by a one-way test. Lint, typecheck and the full test run pass. 4 findings: 0 Critical, 1 Concern, 3 Suggestions.

**Files Reviewed:**
- `src/core/value-scale.ts`
- `src/core/definitions/xy-graph.ts`
- `src/core/definitions/axis.ts`
- `src/layout/xy-graph.ts`
- `src/generated/description.ts`, `src/generated/schema.json`, `src/generated/tool-schema.json`, `src/generated/vocabulary.json` (generated, skimmed)
- `tests/layout/kit/ticks.test.ts`
- `tests/layout/xy-graph.test.ts`
- `tests/core/xy-graph.test.ts`
- `.changeset/xy-graph-default-tick-spacing-fits-axis.md`

**Findings:** 4
**Critical:** 0 | **Concerns:** 1 | **Suggestions:** 3

## Quality Assessment

### Code Organization

**Rating:** Adequate
**Notes:** The decision is a pure numbers-only function in core that `describe`, the layout and a later ticket can all call, and `MAX_PLOT_HEIGHT` moved to core with a layout re-export so dependency direction stays layout -> core. The cost is that `planeLengths` in `src/core/definitions/xy-graph.ts` mirrors the layout's `plotRoom` (drawing width, margin, label lines, marker reach) with copied numbers, and `tickLabelWidth` copies three font-table widths. Both are documented and tested against the layout, but they are two sources of truth (QR-001).

### Readability

**Rating:** Adequate
**Notes:** Doc comments say why (the bound, the gap decision, the fallback) and name the Engineer's decision. `fittedAxisSpacing` is short and bounded. `planeLengths` mixes unnamed literals (`1.2`, `4`, `1.5`, `2 *`) and a `drawn!` non-null assertion inside a loop over `drawn?.ticks ?? []`, which a reader has to cross-check against the layout to follow (QR-002).

### Error Handling

**Rating:** Strong
**Notes:** `fittedAxisSpacing` is bounded (`MAX_FITS`), stops when fewer than two ticks remain, falls back to the coarsest two-tick spacing or the range's own, and never throws. `niceTicks` keeps its throw for an undrawable axis, and a supplied spacing and hidden labels bypass the room entirely. Validation is untouched.

### Test Coverage

**Rating:** Strong
**Notes:** Executed: `pnpm lint` exit 0; `pnpm typecheck` exit 0; `npx vitest run --no-cache` exit 0, 55 files, 1578 tests passed. The new tests cover the reported case, the flat case, a 300-run property using the test's own `textWidth` search (so it does not restate the rule), `planeLengths` never exceeding the drawn plot, a change-only-where-labels-cleared-by-less-than-the-gap property, `describe` equal to the drawn spacing, the supplied/hidden bypass, and `fittedAxisSpacing` called directly. The delivery records mutation checks that fail the right tests. Weaknesses are minor (QR-003, QR-004).

### Observability & Operability

**Rating:** Adequate
**Notes:** This is a pure computation library with no logging or metrics, matching its neighbours. The fallback case (labels may touch because no spacing clears) is silent by design and is exercised by a property that counts it. Not a gap for this code.

## Findings

### QR-001: Layout geometry is re-stated in core as hand-copied constants

**Category:** Maintainability
**Severity:** Concern
**Location:** `src/core/definitions/xy-graph.ts:planeLengths` (and `PLANE_ROOM`); `src/core/value-scale.ts:tickLabelWidth`
**Description:** `planeLengths` copies the layout's `SCENE_WIDTH - 2 * SCENE_MARGIN` (368), two label lines at `LINE_HEIGHT` 1.2 plus a 4-unit gap, `MARKER_REACH` (`markerSize / 2 * 1.5`), the 4-unit tick-label gap and `tickLength / 2`, because core must not import the layout. `tickLabelWidth` copies three glyph widths and the 1.1 safety factor from `textWidth`. The test `planeLengths never exceeds the plot drawn` guards only one direction: if the layout later gets more room, nothing fails and `describe` keeps stating a coarser spacing than needed; if the layout loses room, the test fails, which is correct.
**Impact:** A change to margin, label lines, tick gap or the font table makes the text alternative, the spacing and the bound drift apart silently in the "more room" direction. The text alternative stays equal to the layout (both use core), so the harm is a needlessly coarse default, not a wrong description.
**Recommendation:** Move the shared numbers to one place core can read (for example constants beside `defaultStyle`, which both layers already import) and have the layout use them, or add a test that asserts equality, not only `<=`, for a description with no y-axis label (the delivery already checks this within 0.01 where nothing changes; extend it to cover a y-axis label and a wide-label case).
**Status:** Fixed
**Resolution:** By code review CR-003's resolution (Engineer — Thomas Eaves, 2026-10-27), commit `1f46580`. The mirrored numbers are named, exported core constants, each pinned to its layout counterpart by a test. The test also requires `planeLengths` to equal the drawn plot within 0.01 for graphs with a two-line y-axis label, so the layout gaining room now fails it, as losing room already did. `tickLabelWidth` was already pinned equal to `textWidth` over generated labels.

---

### QR-002: `planeLengths` uses unnamed literals and a non-null assertion

**Category:** Readability
**Severity:** Suggestion
**Location:** `src/core/definitions/xy-graph.ts:planeLengths`
**Description:** `2 * labelFont * 1.2 + 4`, `(markerSize / 2) * 1.5`, `4 + widest(...)` and `drawn!.spacing` carry their meaning only in the doc comment. The `widest` helper iterates `drawn?.ticks ?? []` and then asserts `drawn!`, which is safe but reads as if it might not be. `reach(onLeft)` and `reach(!onLeft)` give the two sides but the boolean parameter name `yLabels` hides that.
**Impact:** The function is the densest in the ticket and the one most likely to be edited when the layout changes (QR-001). Small naming and structure changes make the mirrored layout rules checkable by eye.
**Recommendation:** Name the literals (`LABEL_LINE_HEIGHT`, `LABEL_GAP`, `MARKER_REACH_FACTOR`), early-return `0` from `widest` when `drawn === undefined`, and name the two sides `leftReach` and `rightReach`.
**Status:** Fixed
**Resolution:** By code review CR-003's resolution, commit `1f46580`. The literals are named (`PLANE_GAP`, `PLANE_AXIS_LABEL_LINES`, `PLANE_LINE_HEIGHT`, `PLANE_MARKER_REACH`), `widest` returns early instead of asserting `drawn!`, and the sides are `leftReach` and `rightReach`.

---

### QR-003: A property test prints to the console and the layout test file is now 717 lines

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/layout/xy-graph.test.ts` (the "draws no neighbouring tick labels overlapping" test, `console.info`); the whole new describe block
**Description:** The exclusion count is reported with `console.info` so it can be copied into the delivery record. That adds noise to every run and the count is not asserted. The new block adds about 290 lines of helpers (`someSpacingClears`, `drawnSpacing`, `planes`, `coarser`) to a file that already holds the layout's other suites.
**Impact:** Unasserted output cannot catch a regression where most generated cases silently fall into the excluded fallback (the test would still pass). The file is harder to navigate.
**Recommendation:** Assert an upper bound on the excluded fraction (the delivery measured 2-4% per seed; for example fail above 15%) instead of printing, and move the block with its helpers to `tests/layout/xy-graph-tick-spacing.test.ts`.
**Status:** Fixed (in part)
**Resolution:** Engineer — Thomas Eaves, 2026-10-27. The `console.info` is replaced by an assertion that at most 15% of generated descriptions are excluded (2 to 4% at delivery). Mutation-checked: a 0.1% bound fails with "11 of 300 excluded". The file is not split: the new block shares `sceneOf`, `plotOf`, `graph` and the other helpers, and a split would duplicate them.

---

### QR-004: `fittedAxisSpacing` packs the label-clearance check into a for-loop condition

**Category:** Readability
**Severity:** Suggestion
**Location:** `src/core/value-scale.ts:fittedAxisSpacing`
**Description:** `for (let i = 1; clear && i < ticks.length; i++) clear = apart >= extent + (...)` uses the loop condition as the early exit and reassigns `clear` in the body. It is correct, but the `fallback = spacing` assignment before it, the `width` closure and the `turn` counter each need a second read.
**Impact:** The function is the shared decision for later tickets (TICKET-004 and the number line), so more people will read it.
**Recommendation:** Extract `labelsStandApart(ticks, spacing, apart, extent, textSize): boolean` using `every`, leaving the walk as a short loop. Behaviour and the direct tests stay the same.
**Status:** Fixed
**Resolution:** Engineer — Thomas Eaves, 2026-10-27. `labelsStandApart(ticks, spacing, apart, extent, textSize)` uses `every`, and `fittedAxisSpacing` is a short walk. Behaviour is unchanged. Mutation-checked: making the helper always pass fails 6 tests.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fixed | By code review CR-003: named constants pinned to the layout, and the bound checked equal to the drawn plot with a y-axis label | `src/core/definitions/xy-graph.ts`, `tests/layout/xy-graph.test.ts` |
| QR-002 | Fixed | By code review CR-003: names, early return, `leftReach`/`rightReach` | `src/core/definitions/xy-graph.ts` |
| QR-003 | Fixed (in part) | Exclusions asserted at most 15%; file not split | `tests/layout/xy-graph.test.ts` |
| QR-004 | Fixed | `labelsStandApart` extracted | `src/core/value-scale.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0
**Notes:** All four findings are fixed: QR-001 and QR-002 by code review CR-003, and QR-003 (the assertion; the file stays whole) and QR-004 here. Re-verified: lint, typecheck, and three test runs of 1,579 passed; `./core` 25.13 kB of 40, `./xy-graph` 21.66 kB of 25.

