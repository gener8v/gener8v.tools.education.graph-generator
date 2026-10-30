# TICKET-008: Proportion, label-overlap and text-alternative checks across figures — Quality Review

## Summary

Reviewed the tests-only delivery (commit `84e0d35`): three new suites and the extended `tests/fixtures/scene-geometry.ts`. The tests are behaviour-level (everything goes through `createGraph` or `<Graph>`), well commented and green, and the delivery's mutation checks are credible. Weaknesses: REQ-031's "scaled to fit" is only checked as "inside the viewBox", the overlap oracle reuses the layout's own algorithm, one assertion is vacuous, and the fixture carries dead exports and a second text-box model. 5 findings: 0 Critical, 2 Concerns, 3 Suggestions.

**Files Reviewed:**
- tests/fixtures/scene-geometry.ts
- tests/layout/gss-proportions.test.ts
- tests/layout/gss-label-overlap.test.ts
- tests/react/gss-text-alternatives.test.tsx
- .gener8v/changes/graph-library/delivery/geometric-shapes-and-solids-ticket-008-delivery.md

**Findings:** 5
**Critical:** 0 | **Concerns:** 2 | **Suggestions:** 3

## Quality Assessment

### Code Organization

**Rating:** Adequate
**Notes:** One suite per requirement concern (proportions, overlap, text alternatives), each grouped by figure; matches the existing `tests/layout` / `tests/react` split. The geometry helpers extend the shared fixture as the Known Hazard asked, but they are appended below the older data-graph helpers under a second header, and three exports are unused (QR-004).

### Readability

**Rating:** Strong
**Notes:** Headers state the requirement and method; non-obvious numbers (0.0142, 1/30, 0.01 shrink) are explained. `cylinderLengths` and the triangle needle test are long and branchy, but commented. Local variable `lengthsOf` in `cylinderLengths` reads oddly as a name for a result object.

### Error Handling

**Rating:** Strong
**Notes:** Helpers throw descriptive errors on unexpected input (`not a text node`, `not an arc path`, unexpected transform); `drawn()` and `sceneOf()` print the issues and description on failure; `ratioMiss` names the failing pair and its percentage. Property tests that skip invalid descriptions (`if (!createGraph(...).ok) return`) skip about 2.6% of draws (probe: circle 26/1000, cylinder 22/998), so they stay meaningful.

### Test Coverage

**Rating:** Adequate
**Notes:** Commands run in this review, outputs saved under the scratchpad `quality-review-008/` directory:
- `pnpm lint` exit 0; `pnpm typecheck` exit 0.
- `npx vitest run --no-cache` (output in `vitest.txt`): 72 files, 2196 tests passed, matching the delivery record. Exit status was not captured by the pipe, but the summary shows no failures.
- `git status --short` afterwards: only `.gener8v/runs.jsonl` (modified) and `HANDOFF.md` (untracked), both present before the review; no source changed.

Coverage is broad (examples, extreme sizes, 250 generated descriptions per figure, every determining set for triangles, every label at `CALLER_TEXT_LIMIT` and as one-cluster texts, negative tests for the overlap finder). Gaps: fit is not tested as filling the area (QR-001), the overlap oracle is not independent (QR-002), and one assertion is vacuous (QR-003).

### Observability & Operability

**Rating:** Adequate
**Notes:** Not applicable to a test-only change; failure messages are actionable (figure, pair, percentage, description JSON), which is the equivalent here.

## Findings

### QR-001: "Scaled to fit" (GSS-REQ-031) is only tested as "inside the viewBox"

**Category:** Testing
**Severity:** Concern
**Location:** `tests/layout/gss-proportions.test.ts` (`expectFits`), `tests/fixtures/scene-geometry.ts` (`outsideViewBox`)
**Description:** REQ-031 asks that each figure be scaled to fit its drawing area while preserving proportions. Every test asserts only that no point or label box lies outside `0..width, 0..height`. A layout that drew every figure at a fraction of the area, or left large margins, passes all of them. The ratio tests would not catch it either, since ratios survive uniform shrinking. Only the upper bound of "fit" is verified.
**Impact:** A regression that shrinks figures (for example a wrong scale divisor) would be undetected by this cross-figure suite, which is the one that claims to verify REQ-031.
**Recommendation:** Add a lower bound per figure: the drawn extent touches the area on the limiting axis within a stated margin (for example, its larger relative extent is at least 0.8 of the available width or height). Take the margin from the layout's own padding constant rather than a guess.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-29). Each figure's `check()` in `tests/layout/gss-proportions.test.ts` now also checks that it fills its frame: circle outline radius = `DRAWN_RADIUS` and square sides = `DRAWN_SIDE` within 1%; the triangle's outline and the cylinder's ellipse-and-arcs extent (`extentOf`, new in the fixture) reach `FIGURE_WIDTH`/`FIGURE_HEIGHT` or `FIT_WIDTH`/`FIT_HEIGHT` within 1% and exceed neither by more than the 0.02 rounding allowance (`expectFills`); the cube's edges were already checked against `DRAWN_EDGE`. Mutation-checked: a triangle fit at half size fails 7 tests, a cylinder fit at 80% fails 6. Changing `DRAWN_RADIUS` or `DRAWN_SIDE` itself passes, since the test reads the same constant as the frame.

---

### QR-002: The overlap oracle is the layout's own algorithm

**Category:** Testing
**Severity:** Concern
**Location:** `tests/fixtures/scene-geometry.ts` (`labelOverlaps`, `labelBoxOf`)
**Description:** `labelOverlaps` rebuilds boxes with the production `textWidth`, `LINE_HEIGHT` and then asks the production `placeLabel` whether each box could stay where it is. A defect shared by the metrics or by `placeLabel`'s intersection test (the code that decided the placement) therefore cannot fail this test. The independent `overlap(a, b)` already in the same file, which does plain rectangle intersection, is not used. The two negative tests prove the finder reports gross overlaps, not that its notion of overlap matches geometry (for example a label touching a curve versus a line).
**Impact:** GSS-NFR-003 is verified by a self-consistency check rather than an independent one; it is weaker than the delivery record's wording ("estimated-bounding-box overlap test") suggests.
**Recommendation:** Compute label-versus-label and label-versus-line overlap in the fixture itself (rectangle intersection, segment-versus-rectangle clipping) and keep `placeLabel` out of it. If reuse is intended, state the limitation in the header comment and add a negative test with a label touching an ellipse and a polygon side.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-29). `labelOverlaps` no longer calls `placeLabel`: `boxesOverlap` (positive-area interior intersection) and `segmentCrosses` (Liang–Barsky clipping, a crossing only when the clipped piece has length and its midpoint is strictly inside) are test-owned; estimated widths are kept (AD-010, TR-003). A new negative test passes a line through a label with both ends outside. Mutation-checked: `placeLabel` accepting overlapping positions now fails 42 tests, where before it could fail none.

---

### QR-003: Vacuous assertion and unexplained import in the cube check

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/layout/gss-proportions.test.ts:219` (`expect(lengths[0]! / ISO_SCALE).toBeGreaterThan(0)`)
**Description:** The comment says each edge is foreshortened by the same `ISO_SCALE`, but the assertion only checks that a positive length divided by a positive constant is positive. It can never fail, and it is the only reason `ISO_SCALE` is imported. The equal-length and axis-direction checks above it are real; the foreshortening claim is not tested. In the cylinder section, the comment about `ISO_SCALE` is likewise not backed by an assertion.
**Impact:** Misleads the reader into believing the foreshortening is verified.
**Recommendation:** Either assert `lengths[0] / ISO_SCALE` against the expected unscaled edge (when the layout's pixel-per-unit scale is derivable) or delete the line and the import.
**Status:** Resolved
**Resolution:** Fixed with code review CR-003 (`0c015fb`).

---

### QR-004: Fixture carries dead exports and two text-box models

**Category:** DRY
**Severity:** Suggestion
**Location:** `tests/fixtures/scene-geometry.ts` (`labelBoxes`, `polyPoints`, `lengthOfLine`; `boundsOf` text case versus `labelBoxOf`)
**Description:** `labelBoxes`, `polyPoints` and `lengthOfLine` are not used by any test (grep across `tests/`). The fixture now holds two models of a text's box: `boundsOf` (glyph box, baseline 0.8 below the top, with rotation) and `labelBoxOf` (layout line box, shrunk by 0.01). The new section also sits under a second header comment with its own imports mid-file layout, below the older value-axis helpers.
**Impact:** Dead code to maintain; a reader must learn which text box to use where.
**Recommendation:** Remove the three unused exports; add one sentence to each text-box helper saying why both exist (glyph extent versus the layout's reserved line box); consider moving the figure helpers to their own fixture file (for example `tests/fixtures/figure-geometry.ts`) if more areas adopt them.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-29). `labelBoxes` and `polyPoints` removed (no importers); `lengthOfLine` unexported (used only inside the fixture); `labelBoxOf`'s comment says when to use it and when `boundsOf`.

---

### QR-005: Text-alternative test restates the production display rules

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/react/gss-text-alternatives.test.tsx` (`FIGURES.*.shown`, "states at least one measurement…")
**Description:** Expected statements are produced with the production `circleDisplay`, `triangleDisplay`, `stateMeasurement`, `sourceOf` and so on, then cast through `never`. If a display helper wrongly says a measurement is not shown, the test expects nothing and passes. The per-figure "states at least one measurement" test only guards the extreme case of nothing at all being expected. No fixture asserts a literal expected phrase (for example the 3-4-5 triangle's label contains "3 cm"). The text-alternative and per-figure text tests may also already cover wording; this suite adds the cross-figure sweep but the expected values are derived, not stated.
**Impact:** Moderate chance of tautology: bugs in the shared display rules would pass.
**Recommendation:** Add a small table of literal expectations for a handful of fixtures (figure name plus each measurement as a string), and keep the derived sweep for breadth.
**Status:** Resolved
**Resolution:** Fixed with code review CR-004 (`0c015fb`).

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fix | Fill checks per figure | `tests/layout/gss-proportions.test.ts`, `tests/fixtures/scene-geometry.ts` |
| QR-002 | Fix | Test-owned overlap predicates | `tests/fixtures/scene-geometry.ts`, `tests/layout/gss-label-overlap.test.ts` |
| QR-003 | Fix (with CR-003) | — | `tests/layout/gss-proportions.test.ts` |
| QR-004 | Fix | Unused exports removed; box models documented | `tests/fixtures/scene-geometry.ts` |
| QR-005 | Fix (with CR-004) | — | `tests/react/gss-text-alternatives.test.tsx` |

## Verdict

**Result:** Approved
**Unresolved Findings:** None
