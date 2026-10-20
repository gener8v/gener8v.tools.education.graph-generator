# TICKET-001: Build the axis and tick foundation shared by all three axis-based graph types — Delivery Record

## Ticket Reference

**Ticket:** graph-library/number-lines-and-coordinate-graphs/TICKET-001
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/number-lines-and-coordinate-graphs.md`
**Requirements Covered:**
- NLC-REQ-002: Every axis requires a range given as a minimum and a maximum
- NLC-REQ-003: Axis minimum and maximum accept negative, zero, positive and decimal values
- NLC-REQ-004: Optional tick spacing; ticks at every whole multiple of the spacing inside the range
- NLC-REQ-005: Documented default tick spacing when none is supplied
- NLC-REQ-006: Option to show or hide tick labels per axis, shown by default
- NLC-REQ-007: Ticks drawn at positions proportional to their values (axis-scale part)
- NLC-REQ-008: Report a tick spacing that would produce more than 100 ticks on one axis
- NLC-REQ-009: Report a tick spacing that is zero or negative

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Depends On | none | none; cross-area predecessors GSV TICKET-001..004 and CPSE TICKET-002 are done | ✅ |
| `src/core/definitions/types.ts`, `shared.ts` (PropertySpec, `ordered`, DomainCheck) | present | `ObjectValue.ordered`, `NumberValue` with `min`/`max`/`exclusiveMin`, `DomainCheck { name, inputs, check }`, `defineProperties` | ✅ |
| Issue codes `too_many_ticks`, `tick_spacing_invalid`, `out_of_range`, `missing_property` | present | `src/core/issues.ts:14-24`; `too_many_ticks` takes `{ term, tickCount, maxTicks, fittingSpacing }`, `tick_spacing_invalid` `{ term, got }` | ✅ — no new codes |
| A `tickSpacing` of 0 or less reaches the domain stage | — | structure reports a number below a spec's `min` as `out_of_range`, so the spec must carry no `min` for `tickSpacing` (the data graphs' `tickInterval` does the same) | ⚠️ Shapes the plan |
| `src/core/validate/domain.ts`: checks skipped when an input failed | present | `domain.ts:28`; a reversed range (`ordered`) fails `/…/max` in structure, so the tick checks, reading `max`, are skipped | ✅ (no cascade, AD-004) |
| `src/core/value-scale.ts` (the data graphs' scale arithmetic) | present | `niceInterval(span, intervals)` (1, 2, 5 × 10ⁿ), `cleanDecimal`, `intervalsIn`, `MAX_VALUE_TICKS` = 100, `VALUE_LIMIT` = 1e9, `SCALE_RESOLUTION` = 1e-9; its header says NLC's tick rule belongs here | ✅ — extended here (carried QR-005) |
| Kit: `scene.ts`, `format.ts`, `scale.ts`, `text.ts`, `labels.ts`, `value-scale.ts` | present | `fmt`, `linearScale`, `textWidth`, `placeLabel`, `TICK_LABEL_DROP`, and a `tickLabel(value)` that prints with `formatSupplied` | ✅ — NLC's label rule differs (decimals from the spacing), see the plan |
| `tests/fixtures/definitions/axis.ts` (a fixture axis for the validator's tests) | present | used by the fixture number line and x,y graph; its `tickSpacing` has `exclusiveMin` 0 | ✅ — left as is; the real group is in `src/core/definitions/axis.ts` |
| Carried: GSV TICKET-003 CR-002 (`ordered`), SEC-001 (`maxItems`, none here); TICKET-004 CR-003 / SEC-004 (domain checks: `inputs`, `createIssue`, work by size) | addressed here | — | 🔁 Carried |
| Carried: DGP TICKET-001 QR-005 (one home for tick arithmetic, in core, parameterised) | addressed here | — | 🔁 Carried — see the plan |
| Carried: GSS TICKET-001 SEC-002 (bound axis values) | addressed here | — | 🔁 Carried — ±1e9 bound |

**Resolved from ground truth (not escalated):**
- **Where the tick rule lives:** validation needs the tick count and the default spacing, and core cannot import the layout kit, so the arithmetic goes in `src/core/value-scale.ts` beside the data graphs' rule, sharing `niceInterval`. `src/layout/kit/ticks.ts` re-exports it under the ticket's names.
- **Default spacing 5–20 ticks:** `niceInterval(span, 19)` picks the smallest 1, 2 or 5 × 10ⁿ giving at most 19 intervals; neighbouring candidates differ by at most 2.5×, so every range from 0.001 to 10⁶ wide gets between 7 and 20 ticks.

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.` (branch `ticket/nlc-001`, on top of `main` at fd7fedf)
**Plan approved by:** Engineer — Thomas Eaves, 2026-10-20

### Planned Files

- `src/core/value-scale.ts` (extended): the number line's tick rule, beside the data graphs' and sharing `niceInterval` (carried DGP TICKET-001 QR-005; core because validation needs it).
  - `niceTicks(min, max, spacing?) → { spacing, ticks }`: the whole multiples of the spacing inside the range, each `k × spacing` with decimal noise removed (0.1-spaced ticks give 0.3), zero included whenever it is in the range.
  - Without a spacing: 1, 2 or 5 × 10ⁿ giving 7 to 20 ticks (`niceInterval(span, 19)`).
  - `tickCount(min, max, spacing)`: the count, computed arithmetically, never by listing.
  - `axisTickLabel(value, spacing)`: no more decimals than the spacing needs (0.25 → "0.75", 2 → "4").
- `src/core/definitions/axis.ts`:
  - `axisProperties` (`min`, `max`, `tickSpacing`, `showTickLabels`, shown by default) and `axisProperty(term, name)`, an object spec with `ordered: [["min", "max"]]`, so a reversed range is reported once by structure.
  - `min` and `max` from −1e9 to 1e9 (carried GSS TICKET-001 SEC-002); `tickSpacing` with no structural minimum, so 0 or less reaches the domain check.
  - `axisChecks(path, axis)` and `axisCheck(term)` (a `DomainCheck`): `tick_spacing_invalid`; `too_many_ticks` with the 100 limit and a spacing that fits; a range narrower than a billionth of its ends' size as `out_of_range` at `max`.
  - The default-spacing rule stated in the descriptions.
- `src/layout/kit/ticks.ts`: re-exports `niceTicks`, and `axisTickLabel` as `tickLabel`.
- `src/layout/kit/axis.ts`: `drawAxis({ from, to, domain, ticks, labels?, showTickLabels, side })` → the axis line, ticks across it (perpendicular, so diagonal axes work), and tick labels on `side` (custom labels first), every number through `fmt()`; hidden labels draw ticks only.
- `tests/core/axis.test.ts`, `tests/layout/kit/ticks.test.ts`, `tests/layout/kit/axis.test.ts`.
- `.gener8v/specifications/number-lines-and-coordinate-graphs.md`: `## @spec Coverage` rows.

### How Acceptance Criteria Will Be Met

- The axis group defined once and reusable: `axisProperty` in `axis.ts`; a fixture definition in `tests/core/axis.test.ts` uses it for two axes.
- A missing `min` or `max` is `missing_property` at the axis path: validated through the fixture definition.
- Negative, zero, positive and decimal ranges are accepted: the ticket's three ranges, through the fixture definition.
- `tickSpacing` ≤ 0 is `tick_spacing_invalid`: domain check, tested.
- More than 100 ticks is `too_many_ticks` with the limit and a fitting spacing: tested, including a spacing of 1e-300 (counted, never listed).
- `niceTicks` returns exactly the multiples, anchored at zero, endpoints off the grid untick'd: a property test against a brute-force count.
- `k × spacing`, not repeated addition: 0.1-spaced ticks are exactly 0.1, 0.2, 0.3 ….
- Default spacing 1, 2 or 5 × 10ⁿ with 5–20 ticks from 0.001 to 10⁶ wide: a property test; the rule in doc comments and descriptions.
- Label decimals from the spacing: tested.
- `drawAxis` nodes through `fmt()`, each tick within 0.5 units of `linearScale(value)`: tested on horizontal, vertical and diagonal axes, with `checkScene`.
- Hidden labels: no text nodes, ticks still drawn: tested.
- No React import: `pnpm lint` and the boundaries tests.

## Progress

- [x] `src/core/value-scale.ts` — axis tick arithmetic added, annotated; `tooManyTicks` takes its path and term
- [x] `src/core/definitions/axis.ts` — written, annotated
- [x] `src/layout/kit/ticks.ts` — written (re-exports)
- [x] `src/layout/kit/axis.ts` — written, annotated
- [x] `tests/core/axis.test.ts` — 20 tests
- [x] `tests/layout/kit/ticks.test.ts` — 10 tests
- [x] `tests/layout/kit/axis.test.ts` — 13 tests
- [x] `.gener8v/specifications/number-lines-and-coordinate-graphs.md` — `## @spec Coverage` section added

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/core/value-scale.ts` (modified): `AXIS_DEFAULT_INTERVALS` (19), `tickCount`, `axisSpacing`, `niceTicks`, `axisTickLabel`; `tooManyTicks` is exported and takes the issue's path and term, so the value scale and the axes share it. The header names both rules.
- `src/core/definitions/axis.ts`: `AXIS_LIMIT` (1e9), `Axis`, `axisProperties`, `axisProperty(term, name)`, `axisChecks(path, axis)`, `axisCheck(path)`.
- `src/layout/kit/ticks.ts`: re-exports `niceTicks`, `tickCount`, `AXIS_DEFAULT_INTERVALS`, and `axisTickLabel` as `tickLabel`.
- `src/layout/kit/axis.ts`: `AxisSide`, `AxisOptions`, `drawAxis(options)`.
- `tests/core/axis.test.ts`, `tests/layout/kit/ticks.test.ts`, `tests/layout/kit/axis.test.ts`.
- `.gener8v/specifications/number-lines-and-coordinate-graphs.md`: `## @spec Coverage`.

## Verification Run

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm generate` | 0 | no change to generated files (no registered type uses the axis yet) |
| `pnpm lint` | 0 | — |
| `pnpm typecheck` | 0 | — |
| `pnpm test` (three runs) | 0 | 1,156 tests passed on each run, 43 of them new |
| `pnpm bench` | 0 | 7 passed |
| `pnpm build` | 0 | — |
| `pnpm check:dist` | 0 | no network APIs |
| `pnpm check:deps` | 0 | 0 runtime dependencies |
| `pnpm check:images` | 0 | 8 images, licenses recorded |
| `pnpm size` | 0 | `./core` 18.02 kB; every entry within its limit |
| `pnpm publint` | 0 | — |
| `pnpm attw` | 0 | — |
| `pnpm audit` | 0 | No known vulnerabilities found |
| `python3 …/gener8v-state.py lint` | 0 | 0 errors, 0 warnings |

Ten deliberate breaks, each made against a passing baseline and restored from memory, fail the new tests: ticks by running sum, 30 default intervals, a spacing of 0 accepted, no narrow-range check, the tick count off by one, labels printed from the value alone, a misplaced tick, hidden labels drawn, one-sided ticks, and custom labels ignored.

## Acceptance Criteria Verification

- [x] An axis group (`min`, `max`, `tickSpacing?`, `showTickLabels?` default shown) defined once in `src/core/definitions/axis.ts` and reusable — "is defined once and reused: every axis holds the same terms" (`tests/core/axis.test.ts`), with a fixture definition using it for two axes. The default is applied by layouts as `showTickLabels !== false` (DEL-004)
- [x] A missing `min` or `max` is `missing_property` at the axis path — "reports a missing end at the axis's own path" and "names the axis in a missing end on the second axis"
- [x] Negative, zero, positive and decimal ranges are accepted (−10 to −2, 0 to 0.001, −3.5 to 7.25) — "accepts negative, zero, positive and decimal ranges"
- [x] `tickSpacing` ≤ 0 is `tick_spacing_invalid` naming the axis — "reports a tick spacing of … as tick_spacing_invalid, naming the axis" (0, −1, −0.5)
- [x] More than 100 ticks is `too_many_ticks`, stating the limit and a fitting spacing — "reports more than 100 ticks as too_many_ticks, stating the limit and a spacing that fits", "allows exactly 100 ticks", and the 1e-300 case counted in constant time
- [x] `niceTicks(min, max, spacing)` returns exactly the multiples inside the range, anchored at zero, zero included, endpoints off the grid untick'd — the unit cases and the property "returns only multiples inside the range, one spacing apart, missing none at either end", and "always ticks zero when the range includes it" (`tests/layout/kit/ticks.test.ts`)
- [x] Ticks are `k × spacing`, never repeated addition (0.3, not 0.30000000000000004) — "computes each tick as k × spacing"; the running-sum break fails it
- [x] Default spacing 1, 2 or 5 × 10ⁿ with 5–20 ticks for ranges 0.001 to 10⁶ wide, documented — the property test over widths 10⁻³ to 10⁶ and starts ±10⁶, and "pins the rule on familiar ranges"; the rule is in the doc comments of `AXIS_DEFAULT_INTERVALS` and `niceTicks` and in `tickSpacing`'s description
- [x] Tick labels show no more decimals than the spacing needs (0.25 → "0.75", 2 → "4") — "show no more decimal places than the spacing needs" and the property that labels join back to their values
- [x] `drawAxis` returns the axis line, ticks and labels, every coordinate through `fmt()`, each tick within 0.5 units of `linearScale(value)` — "puts each tick within 0.5 units of linearScale(value)" on horizontal, vertical and diagonal axes (property), "passes every number through fmt()", and `checkScene` (`tests/layout/kit/axis.test.ts`)
- [x] Hidden tick labels give no text nodes and ticks still draw — "draw no text when hidden, and still draw every tick"
- [x] No module imports `react` or `react-dom` — `pnpm lint` (the boundary rule covers `src/core` and `src/layout`) and the boundaries tests in `pnpm test`

## Decisions Made

### DEL-001: The tick rule lives in core, in `src/core/value-scale.ts`

**Context:** The ticket's Output puts `niceTicks` and `tickLabel` in `src/layout/kit/ticks.ts`, but validation must count ticks with the same rule, and core cannot import the kit. A carried hazard (DGP TICKET-001 QR-005) asks for one home, parameterised.
**Decision:** `tickCount`, `axisSpacing`, `niceTicks` and `axisTickLabel` sit in `src/core/value-scale.ts` beside the data graphs' rule and share `niceInterval` (19 intervals for an axis, 10 for a value scale). `src/layout/kit/ticks.ts` re-exports them under the ticket's names, so the declared output exists.
**Rationale:** One rule for the validator and the layouts. `axisTickLabel` differs from the value scale's `tickLabel`: NLC prints the decimals the spacing needs, the data graphs print the value as supplied.
**Ticket Impact:** None for consumers: they import from `src/layout/kit/ticks.ts` as declared.

### DEL-002: Axis ends bounded to ±1e9, and a too-narrow range reported

**Context:** The ticket accepts any decimal range. Unbounded ends overflow the isometric projection (GSS TICKET-001 SEC-002, carried), and a range far narrower than its ends' size has ticks a double cannot tell apart, and tick indices past 2⁵³.
**Decision:** `min` and `max` are bounded to ±`AXIS_LIMIT` (1e9, the data graphs' `VALUE_LIMIT`) by structure; `tickSpacing` to at most 2e9. A range narrower than a billionth of its larger end (and than 1e-9) is `out_of_range` at `max`, the rule the value scale uses (`SCALE_RESOLUTION`). The limits are stated in the descriptions.
**Rationale:** Every valid axis then draws: with at most 100 ticks over such a range, every tick index is a safe integer and every label is a plain number. The ticket's ranges (0 to 0.001 included) are far inside the bounds.
**Ticket Impact:** Adds an `out_of_range` case the ticket does not list; the ticket's three accepted ranges are unaffected.

### DEL-003: `drawAxis` takes `domain` and `spacing`, and draws ticks across the line

**Context:** The ticket's signature has a `scale` and no spacing, and does not say how ticks sit.
**Decision:** `domain: [min, max]` gives the values at `from` and `to` (the ticket's `scale`, as values rather than a function); `spacing` sets the labels' decimals. Ticks are perpendicular to the line and centered on it, as on a textbook number line, which also serves an x,y graph's axes through the origin and the diagonal axes of an x,y,z graph. Labels sit on `side` (`below`, `above`, `left`, `right`), clear of the ticks.
**Rationale:** Positions come from `linearScale` over the domain, as the criterion states, and the label rule needs the spacing.
**Ticket Impact:** TICKET-002..004 pass `domain` and `spacing` from `niceTicks`.

### DEL-004: `showTickLabels` defaults in the layout, not in the description

**Context:** The ticket says `showTickLabels?` defaults to `true`. Normalization leaves absent options absent (as the bar graph's `showValues`).
**Decision:** The description holds the option only when given; layouts treat anything but `false` as shown, and `Axis.showTickLabels` documents it. `drawAxis` takes it as a required boolean.
**Rationale:** The package's existing pattern; the provenance of a default is not recorded as supplied.
**Ticket Impact:** TICKET-002..004 pass `axis.showTickLabels !== false`.

## Deviations from Plan

- The kit tests are in `tests/layout/kit/ticks.test.ts` and `tests/layout/kit/axis.test.ts`, as approved, rather than the ticket's `tests/layout/ticks.test.ts` and `tests/layout/axis.test.ts`, matching the other kit tests. No downstream ticket reads them.
- Otherwise none: the implementation followed the approved plan.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| NLC-REQ-002 | `src/core/definitions/axis.ts`:axisProperties, axisProperty | `@spec NLC-REQ-002, …` |
| NLC-REQ-003 | `src/core/definitions/axis.ts`:axisProperties | `@spec …, NLC-REQ-003, …` |
| NLC-REQ-004 | `src/core/definitions/axis.ts`:axisProperties; `src/core/value-scale.ts`:tickCount, niceTicks, axisTickLabel; `src/layout/kit/axis.ts`:drawAxis | `@spec NLC-REQ-004, …` |
| NLC-REQ-005 | `src/core/definitions/axis.ts`:axisProperties; `src/core/value-scale.ts`:axisSpacing, niceTicks | `@spec …, NLC-REQ-005` |
| NLC-REQ-006 | `src/core/definitions/axis.ts`:axisProperties; `src/layout/kit/axis.ts`:drawAxis | `@spec …, NLC-REQ-006, …` |
| NLC-REQ-007 | `src/layout/kit/axis.ts`:drawAxis | `@spec …, NLC-REQ-007` |
| NLC-REQ-008 | `src/core/value-scale.ts`:tickCount; `src/core/definitions/axis.ts`:axisChecks | `@spec …, NLC-REQ-008, …` |
| NLC-REQ-009 | `src/core/definitions/axis.ts`:axisChecks | `@spec NLC-REQ-008, NLC-REQ-009` |

NLC-REQ-007 is covered here for ticks only; points and segments come with TICKET-002..004.

## Notes

- **For TICKET-002..004:**
  - Build an axis property with `axisProperty("xAxis", "x")` (or `axis` for the number line), register `axisCheck("xAxis")`, and draw with `drawAxis({ from, to, domain: [min, max], ...niceTicks(min, max, tickSpacing), showTickLabels: axis.showTickLabels !== false, side })`.
  - `drawAxis` does not avoid label overlap. The default spacing gives at most 20 ticks, but labels of large values (for example "−1000000") can still touch on a short axis, and a given spacing may crowd up to 100. Each layout decides what to do (leave room, or report).
  - Custom tick labels (`labels`) are drawn as given: clean them with `cleanText` first.
  - A point's value outside the axis is `outside_axis_range`, the type's own check (NLC-REQ-010).
- **Vocabulary:** `min`, `max`, `tickSpacing` and `showTickLabels` enter the published vocabulary when the first type registers an axis (TICKET-002); `pnpm generate` will then add them.

## Post-Review Amendments

### Code review — `graph-library/number-lines-and-coordinate-graphs-ticket-001-code-review` (2026-10-20, Approved)

- **CR-001:** ticks no longer fall outside the range far from zero. `multiplesIn` counts an end as a multiple only when `k × spacing` is within 1e-12 of the larger of the end's size and the spacing (in value terms, not in the tick index). 999,999,998.4 to 999,999,999.6 by 1 now gives one tick, not three; 999,999,900.4 to 999,999,999.6 by 1 counts 99, not 101. The data graphs' rule is unchanged.
- **CR-002:** `axisCheck(path)` now returns two domain checks, the range and the spacing, so a failed spacing never hides a range too narrow to draw. Definitions register them as `...axisCheck("xAxis")`.
- **CR-003:** the too-narrow-range issue suggests an end that is itself valid: the smallest valid `max`, or, when that would pass the limit, the largest valid `min`, reported at `/…/min`.
- **CR-004, CR-005:** `tickSpacing`'s description says 5 to 20 ticks on a range at least 0.001 wide, and states its 2,000,000,000 limit.
- **CR-006:** `drawableTicks(min, max, spacing?)` in `src/core/value-scale.ts` returns the ticks or undefined, never throwing, for domain checks. Known Hazards on NLC TICKET-002, 003 and 004.
- **CR-007:** `drawAxis` matches a custom label to its tick with `isTickValue` (within a millionth of the spacing), also re-exported from `src/layout/kit/ticks.ts`. A Known Hazard on NLC TICKET-002 makes its off-tick label check use the same rule.
- **Re-verification:** `pnpm generate` (no change), `lint`, `typecheck`, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size`, `publint`, `attw`, `audit` and `gener8v-state lint` exit 0. `pnpm test` (1,161 tests) exits 0 on three runs. Six deliberate breaks of the fixes each fail a test.

