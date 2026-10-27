# TICKET-009: Choose a default tick spacing the drawn axis has room for — Delivery Record

## Ticket Reference

**Ticket:** graph-library/number-lines-and-coordinate-graphs/TICKET-009
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/number-lines-and-coordinate-graphs.md`
**Requirements Covered:**
- NLC-REQ-005: A documented default tick spacing when none is supplied (the rule gains the drawn length)
- NLC-REQ-006: Tick labels shown by default (shown, and no longer run together on a short axis)
- NLC-REQ-012: Text alternative generated from the normalized description (it states the spacing the figure draws)
- NLC-REQ-027: Separate tick spacing for the x-axis and the y-axis (each axis's default chosen for its own length)
- NLC-REQ-032: One x unit and one y unit drawn at equal lengths by default (the narrowing and clamp that make axes short)

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Predecessor TICKET-003 delivered and reviewed | delivery record, three reviews | `number-lines-and-coordinate-graphs-ticket-003-delivery.md` Delivered; code, quality and security reviews resolved; on `main` at `7359171` | ✅ |
| `src/core/value-scale.ts` exposes `axisSpacing`, `AXIS_DEFAULT_INTERVALS` (19), `niceInterval`, `drawableTicks`, `niceTicks`, `tickCount`, `axisTickLabel` (and private `labelDecimals`) | present | all present; `axisSpacing(min, max, spacing?)`, `drawableTicks(min, max, spacing?)`, `niceTicks(min, max, spacing?)` | ✅ |
| Published `tickSpacing` description says "between 5 and 20 ticks … fewer on a narrower one" | `src/core/definitions/axis.ts` | present in `axisProperties.tickSpacing` | ✅ |
| `describe` of the x,y graph states `axisSpacing(min, max, given)` as "ticked every N" | `src/core/definitions/xy-graph.ts` | present (`axis()` in `describe`) | ✅ |
| `planeAxes`, `MAX_PLOT_HEIGHT` (360), `MIN_PLOT_WIDTH` (120), `xyGraphLayout` with `niceTicks` at the top | `src/layout/xy-graph.ts` | present; room beside the plot from the widest tick labels (`plotRoom`) | ✅ |
| `textWidth`, `TEXT_WIDTH_SAFETY` (1.1) | `src/layout/kit/text.ts` | present; digits 556, minus 333, point 278 thousandths of an em | ✅ |
| Bar graph precedent `tickLabelsFit`, `TICK_LABEL_GAP` (6) | `src/layout/kit/value-scale.ts` | present (private constant, 6 units) | ✅ |
| `boundsOf`, `overlap` | `tests/fixtures/scene-geometry.ts` | present; a text box is the font size tall (0.8 above the baseline, 0.2 below) | ✅ |
| Assertions naming a default on a crowded plot | `tests/core/xy-graph.test.ts:39`, `tests/layout/xy-graph.test.ts:143` | both present as described | ✅ |
| Layout constants the room bound needs | drawing 400 wide, margin 16, marker reach 4.5, tick 6 long, tick label 4 from its tick, axis label 14 px × 1.2 lines, at most 2 lines | `SCENE_WIDTH` 400, `SCENE_MARGIN` 16, `MARKER_REACH` 4.5, `tickLength` 6, `TICK_LABEL_GAP` 4, `AXIS_LABEL_MAX_LINES` 2 | ✅ |
| TICKET-007 delivered (`too_few_ticks`) | not required | not delivered; the code does not exist yet, so criterion 8's `too_few_ticks` clause is checked once 007 lands | ✅ (as the ticket expects) |
| `./core` budget | 40 kB (Known Hazard supersedes 25 kB) | `./core` 24.57 kB of 40; `./xy-graph` 21.36 kB of 25; `./number-line` 19.74 kB (`pnpm size`, 2026-10-27) | ✅ |
| Carried: `graph-library/number-lines-and-coordinate-graphs-ticket-003-code-review/CR-002` | addressed here | deferred to this ticket | 🔁 Carried — see Implementation Plan |
| Carried: `graph-library/number-lines-and-coordinate-graphs-ticket-003-quality-review/QR-004` | addressed here | deferred to this ticket | 🔁 Carried — see Implementation Plan |
| Carried: `…-ticket-003-quality-review/QR-005` (`./core` 40 kB) | respected | recorded as a Known Hazard on this ticket | 🔁 Carried |

**Resolved from ground truth (not escalated):**
- *The room bound (second Known Hazard).* A bound worked out from numbers alone works. The plot's width is at least `368 − (37.6 when a y-axis label is present) − max(4.5, half the widest x label, the y tick room) on each side`, with label widths from character counts at the length-unaware default spacing, capped at `360 / ratio`. A coarser spacing never prints a wider label, so the drawn plot is at least this wide. For a description with no y-axis label and an unchanged spacing, the bound equals the drawn width exactly. A probe over the 370 distinct x,y descriptions the existing tests draw (recorded by instrumenting `xyGraphLayout` for one test run, then restored) found no change caused by the bound being below the drawn width.
- *The width estimate.* Tick labels hold only digits, the minus sign and the point, so core can match `textWidth` exactly with three numbers (556, 333 and 278 thousandths of an em, times 1.1) instead of bounding every character at 0.556 em. With the coarser 0.556 bound, x −2..2 with y −5..5 changes although its labels clear. Three numbers are not the font table, which stays in the layout.
- *The flat-plot y figure.* The ticket's scan used 14.4-unit label boxes with no gap (12 × `LINE_HEIGHT`), which is a 2.4-unit gap beyond the 12-unit text box `boundsOf` draws.

**Blocking findings:** None. The choice of gap between neighbouring labels is a decision for the plan's approval: no positive gap keeps every currently clearing drawing unchanged (criterion 5 against prd/RF-001). See Implementation Plan.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-10-27 (gap between neighbouring labels: 2.4 units on both axes, the recommended option)
**Implemented by:** opus · high — routed as deliver-large from Tower (Medium with Known Hazards)

**The gap between neighbouring labels.** A probe over the 370 distinct x,y descriptions the existing tests draw compared each drawing today with the new rule's choice. Any positive gap changes some graphs whose labels clear today by a hair, so criterion 5 and prd/RF-001's gap cannot both hold literally. With 2.4 units (a fifth of the tick font size on both axes, so stacked y labels sit a `LINE_HEIGHT` apart, the 14.4-unit figure of the ticket's own flat-plot scan), the rule fixes 291 overlapping drawings and changes 24 that clear today, each by less than 2.4 units (x −2..2 with y −5..5 clears by 0.76). With the bar graph's 6 units it changes 92, among them y 0..10 ticked every 1 on a 164-unit plot, which clears by 4.8. Approved: 2.4. Criterion 5 is met for labels that clear by at least the gap.

### Planned Files

- `src/core/value-scale.ts`:
  - `tickLabelWidth(label, fontSize)`: digits 556, the minus sign 333 and the point 278 thousandths of an em, times 1.1, in the same arithmetic order as `textWidth`. It equals `textWidth` for every tick label without the font table in core.
  - `fittedAxisSpacing(min, max, length, extent, textSize = 0)`, the exported decision. It walks from today's default (`axisSpacing(min, max)`) to coarser 1, 2 or 5 × 10ⁿ spacings (`niceInterval(spacing × 1.5, 1)`) and stops once a spacing leaves fewer than two ticks. It returns the first spacing whose neighbouring labels are at least `extent + (tickLabelWidth(a, textSize) + tickLabelWidth(b, textSize)) / 2` apart at `length`. If none is, it returns the coarsest spacing that leaves two ticks, or today's default when even that leaves fewer than two. The loop is bounded and the function never throws.
  - An `AxisRoom` interface (`length`, `extent`, `textSize`) as a new optional last argument of `axisSpacing`, `drawableTicks` and `niceTicks`. Without it, every result is unchanged. A supplied spacing ignores it.
  - Doc comments of `AXIS_DEFAULT_INTERVALS`, `axisSpacing` and `drawableTicks` state the new rule.
- `src/core/definitions/xy-graph.ts`:
  - `MAX_PLOT_HEIGHT` moves here, and `src/layout/xy-graph.ts` re-exports it.
  - `planeLengths(graph)` gives a lower bound on the plot's width and height from numbers alone. Room `368 − (2 × 14 × 1.2 + 4 when the cleaned y-axis label is not empty) − max(4.5, half the widest x label, y tick room) on each side`. The y tick room is `3 + 4 + the widest y label` on the y labels' side (the left unless x max < 0). Label widths come from `tickLabelWidth` at the supplied spacing or the length-unaware default, and are 0 for hidden labels. The width is `min(room, MAX_PLOT_HEIGHT / ratio)` and the height is `width × ratio`.
  - `planeRooms(graph)`: the x room is `{ length: width, extent: 2.4, textSize: 12 }` and the y room is `{ length: height, extent: 14.4, textSize: 0 }`, both from the tick font size. An axis with `showTickLabels: false` gets no room.
  - `describe` states `axisSpacing(min, max, given, room)`.
- `src/layout/xy-graph.ts`: `niceTicks(…, rooms.x)` and `niceTicks(…, rooms.y)` from `planeRooms(graph)`. Re-export `MAX_PLOT_HEIGHT`. `planeAxes`, `MIN_PLOT_WIDTH` and the signatures stay.
- `src/core/definitions/axis.ts`: the `tickSpacing` description says a short drawn axis gets a coarser spacing and fewer ticks, down to two.
- `src/generated/*`: regenerated with `pnpm generate`.
- `tests/layout/kit/ticks.test.ts`:
  - `fittedAxisSpacing` called directly: familiar ranges, the fallback, and the default when there is room;
  - `tickLabelWidth` equals `textWidth` over generated labels;
  - nothing moves without a room.
- `tests/layout/xy-graph.test.ts`:
  - criterion 1 and the flat case;
  - the property with its own `textWidth` search, counting the descriptions it excludes;
  - `planeLengths` never exceeds the drawn plot;
  - an axis changes only where its old labels cleared by less than the gap (no y-axis label);
  - `describe` equals the drawn spacing;
  - a supplied spacing and hidden labels are unchanged;
  - the line-143 expectation reads the shared decision.
- `tests/core/xy-graph.test.ts`: line 39 becomes "x from -10 to 10 ticked every 5" (its old drawing overlaps); criteria 1, 7 and 8 on `describe` and validation.
- `.changeset/<name>.md`: a `Changed:` entry.

### How Acceptance Criteria Will Be Met

- 1, the reported case: x −2..2 with y −100..100 is ticked every 1 and every 20, and its text alternative says so. Tested in both test files.
- 2, the flat case: x −10..10 with y −2..2 has no overlapping y labels, and the x-axis stays every 2. Tested in the layout tests.
- 3 and 4, the property and the fallback: generated descriptions over the narrowest, flattest and past-clamp plots, square plots, and axes through the origin or along each edge. The test's own `textWidth` search either finds a spacing that clears, and then the drawing must not overlap, or proves there is none, and the description is counted. The count and an example go in this record.
- 5, nothing changes where there is room: the example and the fixed test cases draw byte-identical Scenes. A property checks that an axis changes only where its old labels cleared by less than the gap. The changed assertions are listed here.
- 6, a supplied spacing or hidden labels: the same Scene as before and "ticked every 0.5".
- 7, the text alternative: a property compares `describe` with the drawn tick distance and with the Scene's `textAlternative`. The `0.1 * 3` case stays.
- 8, validation: the checks are untouched, a default is never reported, and a drawable axis keeps at least two ticks (property). `tickLabelsOnTicks` stays.
- 9, the number line: its tests and `ticks.test.ts` pass unedited.
- 10, reuse: `fittedAxisSpacing` takes numbers only and is tested directly.
- 11, the published description: updated, regenerated, and the schema tests pass.
- 12, size: `pnpm size` before (24.57 kB) and after, against 40 kB, with `./xy-graph` against 25 kB.
- 13, the changeset.
- 14, lint, typecheck and test pass, with `@spec` annotations.

## Progress

- [x] `src/core/value-scale.ts` — written
- [x] `src/core/definitions/xy-graph.ts` — written
- [x] `src/layout/xy-graph.ts` — written
- [x] `src/core/definitions/axis.ts` — written
- [x] `src/generated/*` — written
- [x] `tests/layout/kit/ticks.test.ts` — written
- [x] `tests/layout/xy-graph.test.ts` — written
- [x] `tests/core/xy-graph.test.ts` — written
- [x] `.changeset/xy-graph-default-tick-spacing-fits-axis.md` — written

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/core/value-scale.ts`:
  - `AxisRoom`, the room an axis's labels have: `length`, `extent`, `textSize`.
  - `tickLabelWidth(label, fontSize)`: digits 556, minus 333 and point 278 thousandths of an em, times 1.1, in the same arithmetic order as `textWidth`.
  - `fittedAxisSpacing(min, max, length, extent, textSize = 0)`, the shared decision. Bounded at 100 turns; it never throws.
  - An optional `room` on `axisSpacing`, `drawableTicks` and `niceTicks`. Without it, the results are unchanged.
  - Doc comments of `AXIS_DEFAULT_INTERVALS`, `axisSpacing` and `drawableTicks` updated.
- `src/core/definitions/xy-graph.ts`:
  - `MAX_PLOT_HEIGHT` moved here.
  - `planeLengths(graph)`, a lower bound on the drawn plot from numbers alone.
  - `planeRooms(graph)`: an x gap of 2.4 plus label widths, and a y extent of 14.4. An axis with hidden labels gets no room.
  - `describe` states the fitted spacing.
- `src/layout/xy-graph.ts`: re-exports `MAX_PLOT_HEIGHT`, and both axes' `niceTicks` take `planeRooms(graph)`. `planeAxes` and `MIN_PLOT_WIDTH` are unchanged.
- `src/core/definitions/axis.ts`: the `tickSpacing` description adds "or coarser, down to two ticks, where the axis is drawn too short for its tick labels to stand apart".
- `src/generated/description.ts`, `schema.json`, `tool-schema.json`, `vocabulary.json`: regenerated.
- `tests/layout/kit/ticks.test.ts`: a new block calling `fittedAxisSpacing` directly; the existing tests are unedited.
- `tests/layout/xy-graph.test.ts`: the new block "a default tick spacing the drawn axis has room for", the line-143 expectation, and the unlabeled-origin test (see Deviations).
- `tests/core/xy-graph.test.ts`: the line-39 expectation, criterion 1 on `describe`, and validation unchanged.
- `.changeset/xy-graph-default-tick-spacing-fits-axis.md`: `patch`, `Changed:`.
- `.gener8v/specifications/number-lines-and-coordinate-graphs.md`: rows appended to `## @spec Coverage` only.

## Verification Run

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm generate` | 0 | `src/generated/*` regenerated; no change after a second run |
| `pnpm lint` | 0 | — |
| `pnpm typecheck` | 0 | — |
| `pnpm test` (run 1) | 0 | 55 files, 1578 passed |
| `pnpm test` (run 2) | 0 | 55 files, 1578 passed |
| `pnpm test` (run 3) | 0 | 55 files, 1578 passed |
| `pnpm bench` | 0 | 2 files, 14 passed |
| `pnpm build` | 0 | — |
| `pnpm check:dist` | 0 | — |
| `pnpm check:deps` | 0 | — |
| `pnpm check:images` | 0 | — |
| `pnpm check:changesets` | 0 | — |
| `pnpm size` | 0 | `./core` 25.09 kB of 40 (24.57 before); `./xy-graph` 21.63 kB of 25 (21.36 before); `./number-line` 20 kB of 25 (19.74 before) |
| `pnpm publint` | 0 | — |
| `pnpm attw` | 0 | node10 resolution ignored, as before |
| `pnpm audit` | 0 | No known vulnerabilities found |
| `pnpm audit --prod` | 0 | No known vulnerabilities found |
| Mutation checks on `tests/layout/xy-graph.test.ts`, `tests/core/xy-graph.test.ts` and `tests/layout/kit/ticks.test.ts` (each file restored, `cmp`-checked) | — | The layout ignoring the rooms: 6 failed. `describe` ignoring the rooms: 5 failed. `planeLengths` 30 units too long: 3 failed. A gap of 0: 1 failed. A width estimate of 0.5 em per character: 4 failed |

## Acceptance Criteria Verification

- [x] 1, the reported case (x −2..2 with y −100..100): ticked every 1 and every 20, and the text alternative says so. Proved by `tests/layout/xy-graph.test.ts` and `tests/core/xy-graph.test.ts` (`pnpm test`).
- [x] 2, the flat case (x −10..10 with y −2..2): no overlapping y labels, x still every 2. `tests/layout/xy-graph.test.ts`.
- [x] 3, no overlapping labels where a clear spacing exists: the property over 300 generated descriptions (narrowest, flattest, past both clamps, square, axes through the origin and along each edge, with and without a y-axis label). It searches with `textWidth`, not with the rule. `tests/layout/xy-graph.test.ts`.
- [x] 4, the fallback: `fittedAxisSpacing` is tested directly in `tests/layout/kit/ticks.test.ts`. The property counts its exclusions: 6 to 11 of 300 per seed (2–4%), and 81 of 3,000 in a stress run, with every property holding. Example: x −24000..−18000 with y −78000000..−71500000. The plot is held at 120 wide; every 5000 leaves one tick, and every 2000 puts ticks 40 apart for "-24000", which is 41.09 wide.
- [x] 5, nothing changes where there is room:
  - `examples/xy-graph.json` and x −10..10 with y −10..10 keep their spacing (tested).
  - A property checks that an axis's spacing changes only where its labels at `planeLengths` clear by less than the gap.
  - A further check: for graphs with no y-axis label and no change, `planeLengths` equals the drawn plot within 0.01.
  - The changed expectations, with their old Scenes checked with `boundsOf` and `overlap` (old and new code side by side at `7359171`):
    - x −10..10 with y 0..100: x every 2 → 5; old x labels overlap (`tests/core/xy-graph.test.ts:39`).
    - x 0..100 with y −3..3: y every 0.5 → 2; old y labels overlap (line-143 test).
    - x 0..1 with y 0..100: x every 0.1 → 0.2; old x labels overlap.
    - x 0..1000 with y 0..1: y every 0.1 → 0.5; old y labels overlap.
    - x −10..10 with y −2..2: y every 0.5 → 1; old y labels overlap.
    - x −2..2 with y −5..5: x every 0.5 → 1. Its old labels did not overlap but cleared by only 0.76, under the approved 2.4 gap. This is the gap's known cost, approved with the plan.
- [x] 6, a supplied spacing or hidden labels: x −2..2 with `tickSpacing: 0.5` draws as before and states "ticked every 0.5", and an axis with hidden labels keeps the range's own spacing. `tests/layout/xy-graph.test.ts`.
- [x] 7, the text alternative states the drawn spacing: a property compares "ticked every N" with the drawn grid distance, and `describe(input)` from `./core` with the Scene's text alternative. `tests/layout/xy-graph.test.ts`. The comparison goes through `formatDerived` because of an older defect (Notes).
- [x] 8, validation: the checks are untouched, and `tests/core/xy-graph.test.ts` shows supplied-spacing issues unchanged and no issue for a default. `fittedAxisSpacing` never returns a spacing leaving fewer than two ticks where the range's own leaves two (property in `tests/layout/kit/ticks.test.ts`). `too_few_ticks` does not exist until TICKET-007 lands.
- [x] 9, the number line is unchanged: `tests/layout/number-line.test.ts`, `tests/core/number-line.test.ts`, `tests/layout/kit/ticks.test.ts` (existing tests) and `tests/layout/kit/axis.test.ts` pass unedited. The number line passes no room.
- [x] 10, reuse: `fittedAxisSpacing(min, max, length, extent, textSize)` takes numbers only and is tested directly in `tests/layout/kit/ticks.test.ts`.
- [x] 11, the published description: updated and regenerated. `schema-shape`, `schema-meta` and `schema-agreement` pass; the doc comments state the new rule.
- [x] 12, size: `./core` 25.09 kB against the 40 kB limit that supersedes 25 kB (QR-005), `./xy-graph` 21.63 kB of 25. Before: 24.57 and 21.36.
- [x] 13, the changeset: `.changeset/xy-graph-default-tick-spacing-fits-axis.md` starts `Changed:`, and `pnpm check:changesets` passes.
- [x] 14, lint, typecheck and test pass, and `@spec NLC-REQ-005` is kept, with NLC-REQ-006 and NLC-REQ-027 where the layout applies the rule.

## Decisions Made

### DEL-001: A gap of a fifth of the tick font size between neighbouring labels

**Context:** prd/RF-001 asks for a gap beyond touching, and criterion 5 asks that drawings whose labels already clear stay as they are. A probe over the 370 x,y descriptions the existing tests draw showed that every positive gap changes some drawings that clear today.
**Decision:** 2.4 units (12 / 5) on both axes. An x label pair needs `2.4 + (wa + wb) / 2`, and a y label needs 14.4, the tick font × `LINE_HEIGHT`. Engineer — Thomas Eaves, 2026-10-27, at plan approval.
**Rationale:** It fixes all 291 overlapping test drawings and changes 24 that clear by under 2.4 units. The bar graph's 6 units would change 92, among them y 0..10 ticked every 1 on a 164-unit plot. The 10% width margin of `textWidth` is already in the estimate.
**Ticket Impact:** Criterion 5 holds for labels that clear by at least the gap.

### DEL-002: Width estimate equal to `textWidth`, from three numbers

**Context:** The ticket's hazard asked for a bound by character count at 0.556 em. That overestimates the minus sign and the point, which changed x −2..2 with y −5..5 and similar plots in a probe.
**Decision:** `tickLabelWidth` uses each character's own width (556, 333, 278), times 1.1, in `textWidth`'s order of arithmetic. It is equal to `textWidth` for every tick label (property test). The font table stays in `src/layout`.
**Rationale:** The estimate is never below `textWidth` (RF-001), and it is no looser than it must be.
**Ticket Impact:** None on the outputs; it is tighter than the hazard's bound.

### DEL-003: The decision walks coarser from the range's own spacing; `AxisRoom` carries the room

**Context:** The ticket asks for an exported function of numbers, plus an optional length and extent on `axisSpacing`, `drawableTicks` and `niceTicks`.
**Decision:** `fittedAxisSpacing(min, max, length, extent, textSize)` takes plain numbers. The three existing functions take an optional `AxisRoom` object of the same numbers. The candidates come from `niceInterval(spacing × 1.5, 1)`. Fewer than two ticks stops the walk, which is monotone: a coarser 1/2/5 candidate is at least twice the finer one.
**Rationale:** One decision for `describe`, the layout and TICKET-004, with the existing signatures unchanged when no room is given.
**Ticket Impact:** None.

### DEL-004: A `patch` changeset

**Context:** `.changeset/README.md` reserves `minor` (while `0.x`) for a change that breaks a previously valid description.
**Decision:** `patch`. Every description stays valid; drawings and text alternatives change. The body starts `Changed:`, and the first release's notes should say that default spacings may be coarser on narrow or flat plots (CPSE-REQ-042, CPSE-REQ-043).
**Ticket Impact:** None.

## Deviations from Plan

- **Criterion 5's property, test (e):** the "easier form" in the plan (compare the default's clearance at the drawn length) is false.
  - Coarsening one axis can widen the plot. In x −15..60 with y −0.01..0.09, the y labels shrink from "-0.01" to "0.05", so the drawn plot is about 6 units wider than the old drawing.
  - The test therefore checks the rule both ways at `planeLengths`, which is the old drawn length when nothing changes, and checks that equality separately.
  - No downstream impact.
- **Tolerances:** the plot read from the Scene is rounded to 0.01, so `planeLengths` ≤ drawn plot is checked within 0.01.
- **The unlabeled-origin test:** "leaves the origin unlabeled rather than crowd its neighbours on densely ticked axes" used x −2..2 with y −5..5. That plot is now ticked every 1 and its origin gets its "0", so the test no longer reached the path its name describes. It now supplies `tickSpacing: 0.5` (the same Scene as before this ticket) and asserts that no "0" is drawn.
- **Changeset:** `patch`, not `minor` (DEL-004).

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| NLC-REQ-005 | `src/core/value-scale.ts`:fittedAxisSpacing, axisSpacing, drawableTicks, niceTicks | `@spec NLC-REQ-005, NLC-REQ-006` / `@spec NLC-REQ-005` / `@spec NLC-REQ-004, NLC-REQ-005` |
| NLC-REQ-005, NLC-REQ-032 | `src/core/definitions/xy-graph.ts`:planeLengths | `@spec NLC-REQ-005, NLC-REQ-032` |
| NLC-REQ-005, NLC-REQ-006, NLC-REQ-027 | `src/core/definitions/xy-graph.ts`:planeRooms | `@spec NLC-REQ-005, NLC-REQ-006, NLC-REQ-027` |
| NLC-REQ-006, NLC-REQ-027 | `src/layout/xy-graph.ts`:xyGraphLayout | `@spec NLC-REQ-006, …, NLC-REQ-027, …` |
| NLC-REQ-012 | `src/core/definitions/xy-graph.ts`:xyGraph.describe | `@spec NLC-REQ-012, …` (unchanged) |

The rows are appended to the specification's `## @spec Coverage` table.

## Notes

- **Specification amendment needed (Product Owner):** Behaviors & Rules → Ticks still says a default gives "between 5 and 20 ticks". On a short x,y axis it now gives fewer, down to two. Amend it through the Specification skill, as TICKET-007's rule needs too. `@spec NLC-REQ-005` stays on the code. This file was not edited, apart from the coverage rows.
- **An older defect, for a ticket of its own:** `formatDerived(0.005)` gives "0.01", so a derived spacing of 0.005 is stated as "ticked every 0.01". For example, x −0.004..0.036 with hidden labels draws every 0.005. The number line has the same issue; it predates this ticket.
- **The number line** still has crowded labels for long values (Notes on the ticket). `fittedAxisSpacing` takes a length, so a follow-up ticket can adopt it. Raise this to the Product Owner.
- **`./number-line` grew 0.26 kB:** `axisSpacing` now references `fittedAxisSpacing`, so the number line's bundle carries the rule although it never passes a room. It is 20 kB of 25.
- **For TICKET-004:** call `fittedAxisSpacing` with each slanted axis's drawn length and the extent its labels need along it. `AxisRoom` and `planeRooms` show the pattern.
- **For TICKET-007:** its `too_few_ticks` message names `axisSpacing(min, max)`, the rule with no length, which is unchanged.

## Post-Review Amendments

### graph-library/number-lines-and-coordinate-graphs-ticket-009-code-review/CR-003 (with quality review QR-001, QR-002)

- **What changed:**
  - `src/core/definitions/xy-graph.ts`: the numbers `planeLengths` mirrors from the layout are named, exported constants, each with its layout counterpart in its comment: `PLANE_ROOM`, `PLANE_GAP`, `PLANE_AXIS_LABEL_LINES`, `PLANE_LINE_HEIGHT` and `PLANE_MARKER_REACH`.
  - `planeLengths`: `widest` returns early for an axis it cannot draw (no `drawn!`), and the two sides are `leftReach` and `rightReach`.
  - `tests/layout/xy-graph.test.ts`: a new test, "mirrors the layout's own numbers…", pins each constant to `SCENE_WIDTH`/`SCENE_MARGIN`, `AXIS_LABEL_MAX_LINES`, `LINE_HEIGHT` and `MARKER_REACH`. It pins the layout's private 4-unit gaps by requiring `planeLengths` to equal the drawn plot within 0.01 for four graphs with a two-line y-axis label.
- **Behaviour:** none; the Scenes are unchanged.
- **Re-verification:**
  - `pnpm lint` exit 0; `pnpm typecheck` exit 0.
  - `pnpm test`: exit 0 three times, 1,579 passed. One earlier run exited 1 with 1,574 of 1,579 reported and no failing test; three runs since were clean. This looks like the known Vitest worker crash.
  - `pnpm size`: `./core` 25.13 kB of 40, `./xy-graph` 21.66 kB of 25.
  - Mutation checks: `PLANE_GAP` 3 and `PLANE_ROOM` 370 each fail the new test.

### graph-library/number-lines-and-coordinate-graphs-ticket-009-quality-review/QR-003, QR-004

- **QR-003:** `tests/layout/xy-graph.test.ts` now asserts that the property excludes at most 15% of the descriptions it generates (2 to 4% at delivery), in place of the `console.info`. Mutation-checked: a 0.1% bound fails with "11 of 300 excluded". The file is not split.
- **QR-004:** `src/core/value-scale.ts` gains `labelsStandApart`, which uses `every`, and `fittedAxisSpacing` calls it. Behaviour is unchanged. Mutation-checked: making the helper always pass fails 6 tests.
- **Re-verification:** `pnpm lint` exit 0, `pnpm typecheck` exit 0, `pnpm test` exit 0 three times (1,579 passed). `pnpm size`: `./core` 25.13 kB of 40, `./xy-graph` 21.66 kB of 25.
