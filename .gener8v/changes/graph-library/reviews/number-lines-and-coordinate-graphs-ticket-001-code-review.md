# TICKET-001: Build the axis and tick foundation shared by all three axis-based graph types — Code Review

## Summary

I reviewed the delivery of `graph-library/number-lines-and-coordinate-graphs/TICKET-001`: delivery commit `841bb5e` on branch `ticket/nlc-001`, on top of `main` at `fd7fedf`. I checked it against:
- the ticket's twelve acceptance criteria, its Output signatures and its Known Hazards (the carried GSV TICKET-003 CR-002 and SEC-001, GSV TICKET-004 CR-003 / SEC-004, DGP TICKET-001 QR-005 and GSS TICKET-001 SEC-002);
- NLC-REQ-002..009, Behaviors & Rules → Ticks, the Edge Cases rows on narrow ranges, non-dividing spacing and more than 100 ticks, and the new `## @spec Coverage` section;
- `constraints/prd.md` (TC-001, TC-002, TC-005) and `technical-design/system-design.md` (AD-003, AD-004, AD-005, AD-007, AD-010, and the Layout kit interface);
- what TICKET-002, TICKET-003 and TICKET-004 will need from the kit. I also noted what the `rulers` change will need, without reviewing against it.

What holds, checked with in-memory probes rather than taken from the record:
- **Default spacing.** Over 400,000 random ranges 0.001 to 10⁶ wide, the spacing is always 1, 2 or 5 × 10ⁿ and gives 7 to 20 ticks. That holds with starts within ±10⁶ and within ±10⁹; widths up to 2 × 10⁹ give 7 to 19 ticks.
- **`k × spacing`.** For 13 decimal spacings (0.1, 0.25, 0.0625, 0.0003 and others), 1,273,679 generated ticks each equal the decimal literal `k × spacing`. `0..1` by 0.1 ends `0.3, …, 1`, not `0.30000000000000004`.
- **Counts.** `tickCount` matches a brute-force count on 100,000 random ranges with ends within ±1,000.
- **Labels.** No label shows more decimals than its spacing, and none has an exponent or reads "-0". Each label joins back to its value. Spacing 0.25 gives "0.75" and spacing 2 gives "4".
- **`too_many_ticks`.** Every spacing that `too_many_ticks` suggests fits: in 49,887 random reports, the suggested spacing re-validates with no issue. Spacings of 1e-300 and 5e-324 are counted, never listed.
- **Positions.** Each tick is within 0.0045 drawing units of `linearScale(value)` on a diagonal axis, over 155,504 random valid axes. No valid axis made `niceTicks` or `drawAxis` throw.
- **Stage order.** A `tickSpacing` of 0, −1 or −3e9 passes structure and is reported in the domain stage as `tick_spacing_invalid`, naming `xAxis.tickSpacing`. A reversed range, an end beyond ±1e9, or a failed `min` is reported once, and no tick check runs on it.
- **Data graphs unchanged.** I loaded the pre-delivery `src/core/value-scale.ts` from `fd7fedf` next to the delivered one. Over 200,000 random inputs, including 45,957 `too_many_ticks` cases, the two give identical results from `checkValueScale`, `resolveValueScale` and `checkTickInterval`.
- **Verification Run.** All 13 commands that were re-run exit 0. `pnpm test` passes 1,156 tests on each of three runs; 43 of them are new.

There is one Issue:
- **CR-001.** Ticks can fall outside the range when an end is far from zero, measured in spacings. The noise allowance grows with the tick index. On valid axes, `niceTicks` then returns multiples beyond `min` or `max`, and `drawAxis` draws them past the axis's ends, in one probe outside the 400-unit drawing. The same count can refuse a spacing that fits. Acceptance criterion 6 and NLC-REQ-004 are only partly met.

There are six Observations:
- **CR-002.** The range check sits inside the tick-spacing check. A spacing of 0 or less, or one that failed structure, therefore hides a range too narrow to draw (AD-004).
- **CR-003.** The too-narrow-range issue suggests a maximum that is itself rejected in about half of the cases. Near +1e9 the suggestion is beyond the axis limit.
- **CR-004.** The default spacing gives fewer than 5 ticks on valid ranges narrower than about 4e-9. The published `tickSpacing` description promises 5 to 20 without saying so.
- **CR-005.** The `tickSpacing` bound of 2e9 is enforced but not stated in its description, which the carried SEC-002 hazard asks for and DEL-002 says was done.
- **CR-006.** `niceTicks` throws on axes the validator reports, and domain checks do not see one another's issues. A TICKET-002 check that lists ticks would turn a too-many-ticks description into a single `internal_error`. The record's Notes do not warn of it.
- **CR-007.** `drawAxis` matches custom labels to ticks by exact value, and tick values are rounded to 12 significant digits. With a spacing of ⅓, a custom label at ⅔ never matches and is replaced by "0.666666666667" with no issue.

**Reviewer:** `code-reviewer` agent, fresh context (findings phase only, 2026-10-20)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/number-lines-and-coordinate-graphs-ticket-001-delivery.md`
**Files Reviewed:**
- `src/core/value-scale.ts` (modified: `AXIS_DEFAULT_INTERVALS`, `tickCount`, `axisSpacing`, `niceTicks`, `axisTickLabel`, exported `tooManyTicks`)
- `src/core/definitions/axis.ts`
- `src/layout/kit/ticks.ts`
- `src/layout/kit/axis.ts`
- `tests/core/axis.test.ts`
- `tests/layout/kit/ticks.test.ts`
- `tests/layout/kit/axis.test.ts`
- `.gener8v/specifications/number-lines-and-coordinate-graphs.md` (`## @spec Coverage`, lines 145-156)
- Read for context, unchanged here: `src/core/definitions/types.ts`, `src/core/definitions/shared.ts`, `src/core/definitions/categories.ts` (the data graphs' `tickInterval` precedent), `src/core/issues.ts`, `src/core/format.ts` (`formatSupplied`), `src/core/validate/structure.ts`, `src/core/validate/domain.ts`, `src/core/validate/state.ts`, `src/core/validate/index.ts`, `src/layout/kit/scale.ts`, `src/layout/kit/format.ts`, `src/layout/kit/value-scale.ts`, `src/layout/kit/check.ts`, `tests/fixtures/definitions/axis.ts`, `eslint.config.js`

**Findings:** 7
**Critical:** 0 | **Issues:** 1 | **Observations:** 6

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| An axis property group (`min`, `max`, `tickSpacing?`, `showTickLabels?` default `true`) is defined once in `src/core/definitions/axis.ts` in the PropertySpec format and can be reused by any graph type definition | Yes | `axisProperties` (`src/core/definitions/axis.ts:28-58`) is built with `defineProperties`, so it is frozen and has no prototype. `axisProperty(term, name)` (`:66-75`) wraps it with `ordered: [["min", "max"]]`. `tests/core/axis.test.ts:24-31` checks both axes share the one map, and the test definition (`:8-16`) uses it for `xAxis` and `yAxis`. `PropertySpec` has no `default` field (`src/core/definitions/types.ts:137-142`), so "shown by default" lives in the description ("shown unless false", `:56`) and in the layouts (DEL-004) |
| A missing `min` or `max` is reported as `missing_property` at the axis's JSON Pointer path (for example `/xAxis/max`) | Yes | Structure's required-property rule (`src/core/validate/structure.ts:272-282`) on the nested map. Tested at `tests/core/axis.test.ts:33-42`, for the first and the second axis. Probe: a missing axis is `missing_property /xAxis` and no tick check runs |
| Negative, zero, positive and decimal minimums and maximums are accepted (for example −10 to −2, 0 to 0.001, −3.5 to 7.25) | Yes | `tests/core/axis.test.ts:44-51`, including −1e9 to 1e9. With no spacing, 0 to 0.001 gets spacing 0.0001 and 11 ticks (`tests/layout/kit/ticks.test.ts:89`) |
| `tickSpacing` ≤ 0 is reported as `tick_spacing_invalid` naming the axis | Yes | `src/core/definitions/axis.ts:91-93`. The spec has no structural `min` (`:45-51`), so 0 or less reaches the domain stage. Tested with 0, −1 and −0.5 (`tests/core/axis.test.ts:70-75`). Probe: −3e9 also gives `tick_spacing_invalid`; the message reads "xAxis.tickSpacing must be a number greater than 0; got 0." |
| A `tickSpacing` that would place more than 100 ticks in the range is reported as `too_many_ticks`; the issue states the 100-tick limit and suggests a spacing that fits | Yes | `src/core/definitions/axis.ts:99-102`, using `tickCount` and `tooManyTicks` (`src/core/value-scale.ts:201-209`). "would draw 201 ticks, more than the limit of 100; use a larger tick spacing, such as 0.2". Probe: all 49,887 suggestions re-validate clean; 1e-300 and 5e-324 are counted in constant time. The count never misses a tick, so no spacing over the limit goes unreported. Its outward error can refuse a spacing that fits (CR-001) |
| `niceTicks(min, max, spacing)` returns exactly the whole multiples of `spacing` inside `[min, max]` (inclusive), anchored at zero, with zero included whenever it lies in the range; a range endpoint that is not a multiple gets no tick | Partial | `niceTicks` (`src/core/value-scale.ts:389-400`) over `multiplesIn` (`:356-358`). Exact on the tested domain: unit cases and the property at `tests/layout/kit/ticks.test.ts:14-60`, and my brute-force probe with ends within ±1,000. Zero is always ticked and never `-0`. But the tolerance in `ceilWhole` / `floorWhole` grows with the tick index, so far from zero (in spacings) multiples outside the range are returned. Example: 999,999,998.4 to 999,999,999.6 by 1 gives [999999998, 999999999, 1000000000] for one multiple inside. That is 8,553 outside ticks over 155,504 valid probe axes (CR-001) |
| Tick values are computed as `k × spacing` for integer `k` (never by repeated addition), so 0.1-spaced ticks produce 0.3 rather than 0.30000000000000004 | Yes | `(first + j) * used` through `onGrid` (`src/core/value-scale.ts:398`); tested at `tests/layout/kit/ticks.test.ts:62-68`. Probe: 1,273,679 ticks over 13 decimal spacings equal their decimal literals. `onGrid` rounds every tick to 12 significant digits, so a spacing with more digits (⅓) gives 0.333333333333, not `1 × spacing`. That does not matter for drawing but does matter for custom labels (CR-007) |
| `niceTicks(min, max)` without spacing chooses a spacing of 1, 2 or 5 × 10ⁿ giving between 5 and 20 ticks, for ranges from 0.001 wide to 10⁶ wide; the rule is documented in a doc comment and in the definition's description text | Yes | `axisSpacing` → `niceInterval(span, 19)` (`src/core/value-scale.ts:374-376`). Doc comments at `:345-350` and `:378-387`; description text at `src/core/definitions/axis.ts:50`. Property test `tests/layout/kit/ticks.test.ts:72-83`, pinned cases at `:85-92`. Probe: 7 to 20 ticks over 400,000 ranges, starts within ±1e9. Below the criterion's range, under about 4e-9 wide, fewer than 5 (CR-004) |
| Tick labels show no more decimal places than the spacing needs (spacing 0.25 → "0.75", spacing 2 → "4") | Yes | `axisTickLabel` (`src/core/value-scale.ts:415-418`), with decimals from `decimalPlaces(spacing)` (`:403-407`); re-exported as `tickLabel`. Tested at `tests/layout/kit/ticks.test.ts:112-135`. Probe: no violation over 13 spacings × 500 ranges; no exponent form, no "-0". DEL-001 records why this differs from the value scale's `tickLabel`, as the QR-005 hazard asks |
| `drawAxis` in `src/layout/kit/axis.ts` returns Scene nodes for the axis line, ticks and (when shown) tick labels, with every coordinate passed through `fmt()` and each tick within 0.5 units of `linearScale(value)` | Yes | `drawAxis` (`src/layout/kit/axis.ts:56-101`): every attribute number goes through `fmt()` (`:36-41`, `:88-92`). Tested on horizontal, vertical and diagonal axes (`tests/layout/kit/axis.test.ts:38-59`), and with `fmt` and `checkScene` (`:72-76`). Probe: worst offset 0.0045 units over 155,504 valid axes. The signature takes `domain` and `spacing` in place of the ticket's `scale` (DEL-003) |
| Hidden tick labels (`showTickLabels: false`) produce no text nodes; ticks still draw | Yes | `src/layout/kit/axis.ts:76`; `tests/layout/kit/axis.test.ts:80-85` (the same lines, no text) |
| No module in this ticket imports `react` or `react-dom` (boundary lint passes) | Yes | `pnpm lint` exits 0, and `src/core/**` and `src/layout/**` are in the non-rendering block (`eslint.config.js:23`, `:119`). Probe: each of the four source files, piped to `eslint --stdin` with `import "react"` prepended, fails `no-restricted-imports` with the AD-001 / prd/TC-005 boundary message |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| NLC-REQ-002 | Every axis requires a range given as a minimum and a maximum | `src/core/definitions/axis.ts`:axisProperties (`min`, `max` required, `:29-44`), axisProperty (`ordered`, `:66-75`) | Yes |
| NLC-REQ-003 | Axis minimum and maximum accept negative, zero, positive and decimal values | `src/core/definitions/axis.ts`:axisProperties (kind `number`, bounded ±1e9 per DEL-002) | Yes |
| NLC-REQ-004 | Optional tick spacing; ticks at every whole multiple of the spacing inside the range | `src/core/definitions/axis.ts`:axisProperties (`tickSpacing`, optional); `src/core/value-scale.ts`:tickCount, niceTicks, axisTickLabel; `src/layout/kit/axis.ts`:drawAxis | Partial. Ticks outside the range far from zero, and a fitting spacing refused (CR-001) |
| NLC-REQ-005 | Documented default tick spacing when none is supplied | `src/core/value-scale.ts`:axisSpacing, niceTicks, `AXIS_DEFAULT_INTERVALS`; `src/core/definitions/axis.ts`:axisProperties (description) | Yes. The published description is unqualified below 4e-9 wide (CR-004) |
| NLC-REQ-006 | Option to show or hide tick labels per axis, shown by default | `src/core/definitions/axis.ts`:axisProperties (`showTickLabels`, "shown unless false"); `src/layout/kit/axis.ts`:drawAxis (`:76`) | Yes |
| NLC-REQ-007 (ticks part) | Ticks drawn at positions proportional to their values | `src/layout/kit/axis.ts`:drawAxis (`linearScale` over `domain`, `:64-74`) | Yes (points and segments: TICKET-002..004) |
| NLC-REQ-008 | Report a tick spacing that would produce more than 100 ticks on one axis | `src/core/value-scale.ts`:tickCount; `src/core/definitions/axis.ts`:axisChecks (`:99-102`) | Yes |
| NLC-REQ-009 | Report a tick spacing that is zero or negative | `src/core/definitions/axis.ts`:axisChecks (`:91-93`) | Yes |

*The ticket carries no NFR. NLC-NFR-001 (0.5 px accuracy) belongs to TICKET-005; criterion 10 is the kit-level precursor, and it holds.*

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/TC-001 | No measuring during layout; tick-label widths come from `textWidth` estimates | Yes | `drawAxis` reads only its options and the default style. Labels are anchored (`middle`, `end`, `start`) at offsets from the font size, so no width is needed. Unlike the data graphs' `valueAxisExtent` (`src/layout/kit/value-scale.ts:52-58`), the kit gives no label-extent helper, so layouts that need room for labels compute it from `tickLabel` and `textWidth` |
| prd/TC-002 | Every coordinate passes through `fmt()` | Yes | Every number attribute (`src/layout/kit/axis.ts:36-41`, `:88-92`); `tests/layout/kit/axis.test.ts:72-76`. Tick values in core are not rounded beyond decimal-noise removal, as the Known Hazard asks |
| prd/TC-005 | These modules must not load React or browser globals | Yes | No React imports; the boundary lint covers both directories (see criterion 12). `src/core/value-scale.ts` now imports `src/core/format.ts`, which is core |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-003 | PropertySpec / GraphTypeDefinition format as the single source | Yes | `axisProperties` is a `PropertyMap` from `defineProperties`. `axisProperty` is an `ObjectValue` with `ordered`, `axisCheck` a `DomainCheck` with `inputs` in the documented form. No new issue codes; `src/core/issues.ts` is unchanged |
| AD-004 | Staged validator, every independent issue, no cascades | Partial | No cascades: a reversed range, a failed `min`, or an end beyond ±1e9 stops the tick checks (probes B4, B10, B11; `tests/core/axis.test.ts:58-61`). But the too-narrow-range check returns behind the spacing check, and its `inputs` include `tickSpacing`, so an independent range issue is hidden (CR-002) |
| AD-005 | camelCase terms, JSON Pointer paths | Yes | `min`, `max`, `tickSpacing`, `showTickLabels`; paths `/xAxis/tickSpacing`, readable terms `xAxis.tickSpacing` |
| AD-007 | 400-unit drawing space, `fmt()` on every emitted number | Yes | As prd/TC-002; positions within 0.0045 units of `linearScale` |
| AD-010 | System font stack, estimated metrics, labels placed without overlap through the label kit | Yes, within this ticket's scope | `DEFAULT_FONT_STACK`, no measuring. Tick labels are placed at fixed offsets, not through `placeLabel`, as the data graphs' `drawValueAxis` does. The record's Notes leave overlap to each layout. TICKET-004's Known Hazard asks for `placeLabel` near the origin, which means drawing its labels itself (see below) |
| Layout kit interface | `niceTicks(min, max, spacing?)` in `src/layout/kit/` (`.gener8v/technical-design/system-design.md:265`) | Yes | Re-exported from `src/layout/kit/ticks.ts:4`; implemented in core (DEL-001) |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| NLC-REQ-002 | `@spec NLC-REQ-002` | `src/core/definitions/axis.ts:axisProperties` (line 27), `axisProperty` (line 65) | Yes |
| NLC-REQ-003 | `@spec NLC-REQ-003` | `src/core/definitions/axis.ts:axisProperties` (line 27) | Yes |
| NLC-REQ-004 | `@spec NLC-REQ-004` | `src/core/definitions/axis.ts:axisProperties` (27); `src/core/value-scale.ts:tickCount` (365), `niceTicks` (388), `axisTickLabel` (414); `src/layout/kit/axis.ts:drawAxis` (55) | Yes |
| NLC-REQ-005 | `@spec NLC-REQ-005` | `src/core/definitions/axis.ts:axisProperties` (27); `src/core/value-scale.ts:axisSpacing` (373), `niceTicks` (388) | Yes |
| NLC-REQ-006 | `@spec NLC-REQ-006` | `src/core/definitions/axis.ts:axisProperties` (27); `src/layout/kit/axis.ts:drawAxis` (55) | Yes |
| NLC-REQ-007 | `@spec NLC-REQ-007` | `src/layout/kit/axis.ts:drawAxis` (55) | Yes |
| NLC-REQ-008 | `@spec NLC-REQ-008` | `src/core/value-scale.ts:tickCount` (365); `src/core/definitions/axis.ts:axisChecks` (87) | Yes |
| NLC-REQ-009 | `@spec NLC-REQ-009` | `src/core/definitions/axis.ts:axisChecks` (87) | Yes |

**Coverage:** 8 of 8 requirements annotated. Each annotation sits on the line directly above its declaration, after the JSDoc. `axisCheck` (`src/core/definitions/axis.ts:107`) and `tooManyTicks` (`src/core/value-scale.ts:201`) carry none. They wrap annotated logic, as the data graphs' `tickIntervalCheck` does (`src/core/value-scale.ts:235`).
**Missing:** None
**Specification table:** Yes. `## @spec Coverage` in `.gener8v/specifications/number-lines-and-coordinate-graphs.md` (lines 145-156) lists exactly these locations. Its NLC-REQ-007 row says it covers ticks only.

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm generate` | not re-run (it writes `src/generated`) | Yes. No registered type uses the axis yet, and "are committed exactly as a fresh build writes them" (`tests/core/schema-shape.test.ts:302`) passes inside the test run |
| `pnpm lint` | 0 | Yes |
| `pnpm typecheck` | 0 | Yes |
| `pnpm test` (three runs) | 0, 0, 0 | Yes. Run as `vitest run --no-cache`, the script's command: 45 files and 1,156 tests on each run. The three new files hold 43 tests (20 + 10 + 13) and pass on their own |
| `pnpm bench` | 0 | Yes (7 passed; run as `vitest bench --run --reporter=verbose --no-cache`) |
| `pnpm build` | 0 | Yes |
| `pnpm check:dist` | 0 | Yes (14 built files scanned, no network APIs or modules) |
| `pnpm check:deps` | 0 | Yes (0 runtime dependencies) |
| `pnpm check:images` | 0 | Yes (8 images, licenses recorded) |
| `pnpm size` | not re-run (it writes to the system temp directory) | Not checked. No entry point imports the axis kit yet; the `./core` entry does now include `src/core/value-scale.ts`'s new axis functions and its import of `src/core/format.ts`. The record gives 18.02 kB, within the limit |
| `pnpm publint` | 0 | Yes (All good) |
| `pnpm attw` | 0 | Yes |
| `pnpm audit` | 0 | Yes (No known vulnerabilities found) |
| `python3 …/gener8v-state.py lint` | 0 | Yes (0 errors, 0 warnings) |

*The ten deliberate breaks in the record need source edits and were not re-run. By reading, each trips a named assertion:*
- *ticks by running sum: `tests/layout/kit/ticks.test.ts:63`;*
- *30 default intervals: `:86` and `:79`;*
- *a spacing of 0 accepted: `tests/core/axis.test.ts:70-75`;*
- *no narrow-range check: `:101-105`;*
- *the count off by one: `:88-91`;*
- *labels printed from the value alone: `tests/layout/kit/ticks.test.ts:117`;*
- *a misplaced tick: `tests/layout/kit/axis.test.ts:54`;*
- *hidden labels drawn: `:83`;*
- *one-sided ticks: `:69`;*
- *custom labels ignored: `:93`.*

*No review command changed a tracked file. `.gener8v/runs.jsonl` is written by the hooks.*

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | The carried QR-005 hazard asks for exactly this: one home in core, `niceInterval` shared and parameterised (19 intervals for an axis, 10 for a value scale). The kit re-export keeps the ticket's declared Output. The data graphs are unchanged by the `tooManyTicks` refactor: identical results over 200,000 random inputs, compared against the pre-delivery module. The label rule's difference from the value scale is recorded, as the hazard asks. Putting `niceTicks` in core for validation also exposes its throw to domain checks (CR-006) |
| DEL-002 | Reasonable, with gaps | The ±1e9 bound (probe B11) and the 2e9 spacing bound (B3) are enforced, and they serve the carried SEC-002 hazard and TICKET-004. The narrow-range rule follows the value scale's. Its rationale, "every valid axis then draws", holds for not throwing (no throw over 155,504 valid axes) but not for drawing correctly (CR-001). Its suggested fix is often itself rejected (CR-003). The spacing limit is not stated in the descriptions, though the decision says it is (CR-005). Placed after the spacing check, the range check is hidden by it (CR-002) |
| DEL-003 | Reasonable | `domain` with `linearScale` meets criterion 10, and the label rule needs `spacing`. Perpendicular, centred ticks serve horizontal, vertical and diagonal (isometric) axes alike; tested and probed. The change from the ticket's `scale` was in the approved plan, and the Notes tell TICKET-002..004 how to call it. Custom labels are keyed by exact tick value (CR-007) |
| DEL-004 | Reasonable | `PropertySpec` has no default field. The bar graph's `showValues` follows the same pattern, and the description states the default. Each layout must write `showTickLabels !== false`; the Notes say so |

*Deviations: the record lists the kit tests' location (`tests/layout/kit/` rather than the ticket's `tests/layout/`), which matches the other kit tests and affects no downstream ticket. `tests/fixtures/definitions/axis.ts` is left as it was (pre-flight). Its comment still says "as NLC TICKET-001 will define it for real", while the real group differs: no structural minimum on `tickSpacing`, and ±1e9 bounds.*

*What the downstream tickets need from the kit:*
- *TICKET-002 (number line). Served: `axisProperty("axis", …)`, `axisCheck`, `niceTicks`, `drawAxis` with `labels`. Two traps for its custom tick labels. A check that lists ticks with `niceTicks` throws, so validation returns `internal_error`, when the axis has too many ticks (CR-006). A custom label at a value with more than 12 significant digits (⅔) is silently not drawn (CR-007). Its `outside_axis_range` check needs only `min` and `max`.*
- *TICKET-003 (x,y graph). Served: grid lines from `niceTicks`, axes through the origin or along an edge via `from`, `to` and `side`. Both axes through the origin label their "0", so the layout must blank one (a `labels` entry of `""` draws an empty text node, and `checkScene` accepts it) or leave room for both. Label room comes from `tickLabel` and `textWidth`, since the kit has no extent helper.*
- *TICKET-004 (x,y,z graph). Served: `isometric()` is linear, so `drawAxis` on projected endpoints puts ticks exactly on the projection. The ±1e9 bound meets its SEC-002 hazard once values are scaled before projecting. Its hazard routes tick labels near the origin through `placeLabel`, which `drawAxis` does not do. It will draw with `showTickLabels: false` and place `tickLabel` text itself.*
- *Rulers change (noted, not reviewed against). `niceTicks` hard-codes the 100-tick limit (`MAX_VALUE_TICKS`) and throws above it. Probe: 0 to 30 by 0.1 (millimetres), 0 to 15 by 0.1 and 0 to 12 by 1/16 (sixteenths) all throw; 0 to 6 by 1/16 gives 97. `drawAxis` draws one tick length centred across the line, while a ruler needs graded marks from one edge. Rulers will need a limit parameter and graded marks: extension points, not defects here.*

## Findings

### CR-001: Ticks fall outside the range when an end is far from zero in spacings, because the noise allowance grows with the tick index

**Severity:** Issue
**Location:** `src/core/value-scale.ts:74-76` (`isWhole`, `ceilWhole`, `floorWhole`), `:356-358` (`multiplesIn`), and through it `tickCount` (`:366-370`) and `niceTicks` (`:389-400`); `tests/layout/kit/ticks.test.ts:11`, `:24-47`
**Traces To:** Acceptance criterion 6 ("exactly the whole multiples of `spacing` inside `[min, max]` … a range endpoint that is not a multiple gets no tick"); NLC-REQ-004; specification Behaviors & Rules → Ticks; the ticket's floating-point Known Hazard ("with a small epsilon on the bounds"); DEL-002 ("Every valid axis then draws")
**Description:** `multiplesIn` takes the first and last tick index as `ceilWhole(min / spacing)` and `floorWhole(max / spacing)`. Both round to the nearest whole number whenever the quotient is within `1e-9 × |quotient|` of it. That allowance is meant to absorb decimal noise (0.3 / 0.1 → 3), but it grows with the index. In value units it is `1e-9 × |end|`, capped at half a spacing: the same size as the narrowest range DEL-002 accepts. So when an end lies just past a multiple, that multiple is taken as inside. The rounding only ever goes outward, so no tick inside is lost. All of the following axes pass the validator with no issue:
- 999,999,998.4 to 999,999,999.6, spacing 1: `niceTicks` gives [999999998, 999999999, 1000000000], though only 999,999,999 is inside. On an axis from x = 20 to 380, `drawAxis` puts the outer ticks at x = −100 and x = 500, outside the 400-unit drawing, labelled "999999998" and "1000000000". `checkScene` reports nothing.
- 1,500,000.001 to 1,500,000.5, spacing 1: [1500000], though no multiple is inside. With spacing 0.1, the first tick (1,500,000) is 0.72 drawing units before the start of a 360-unit axis.
- 999,999,900.4 to 999,999,999.6, spacing 1: 99 multiples are inside, but `tickCount` counts 101. `axisChecks` reports `too_many_ticks` ("would draw 101 ticks") for a spacing that fits.
- Over 155,504 random valid axes (ends within ±1e9, given and default spacings), 8,553 ticks fall outside the range by more than a millionth of the span. The worst is 20% of the span: −3,373,087.2115 to −3,373,087.20657, spacing 0.0025.

The tests cannot see it. The property tests keep ends within ±10⁶ (`tests/layout/kit/ticks.test.ts:11`) and accept `1e-9 × max(1, |min|, |max|)` outside the range (`:32`): the same allowance as the code.
**Impact:** The drawn error exceeds 0.5 units only when an end is more than about a million spacings from zero. Classroom ranges rarely go there, but the published bounds (±1e9, spacing down to the 100-tick limit) accept such axes. For them, a number line or axis draws ticks past its ends with labels outside its range, and a spacing that fits can be refused. TICKET-002..004 inherit the tick list, and TICKET-005's geometry test compares against these ticks, so it would not catch this either.
**Recommendation:** Keep a noise allowance that does not grow with the index:
- after computing `first` and `last`, step `first` up while `onGrid(first × spacing) < min − ε`, and step `last` down while `onGrid(last × spacing) > max + ε`, with ε a small fraction of the spacing (for example `1e-9 × spacing`), so 0.3 by 0.1 still counts 3;
- or compare the quotient with an absolute tolerance capped well below a spacing.

Change the axis path only, or confirm the data graphs separately: `intervalsIn` and `valueTicks` share `isWhole`. Extend the property tests to ends up to ±`AXIS_LIMIT` and spans down to the narrow-range limit, and check ticks against `[min, max]` with a tolerance that does not scale with the ends. Add the three examples above as unit cases.
**Status:** Resolved
**Resolution:** Fixed — `multiplesIn` (`src/core/value-scale.ts`) counts an end as a multiple only when `k × spacing` is within 1e-12 of the larger of the end's size and the spacing, in value terms, so the allowance no longer grows with the tick index. 999,999,998.4 to 999,999,999.6 by 1 gives [999999999]; 999,999,900.4 to 999,999,999.6 by 1 counts 99. Tests pin both, the negative mirror, an end exactly on a multiple, and a property over ends up to ±1e9. The data graphs' rule is unchanged. Approved by the user, 2026-10-20.

---

### CR-002: The range check runs behind the tick-spacing check, so a failed spacing hides a range too narrow to draw

**Severity:** Observation
**Location:** `src/core/definitions/axis.ts:91-93` (early return on `tick_spacing_invalid`), `:94-98` (narrow-range check), `:107-113` (`axisCheck`, whose `inputs` include `tickSpacing`)
**Traces To:** AD-004 ("Every independent problem is reported, but no issue is a consequence of another"); GSV-REQ-017; the precedent of DGP TICKET-001 code review CR-006, which split `tickIntervalCheck` from the scale check "so a failure there never hides it"
**Description:** The too-narrow-range check reads only `min` and `max`. It sits in the same function and the same `DomainCheck` as the spacing checks:
- `{ min: 0, max: 1e-10, tickSpacing: 0 }` → only `tick_spacing_invalid`, because the function returns before the range check;
- `{ min: 0, max: 1e-10, tickSpacing: "x" }` → only `wrong_kind /xAxis/tickSpacing`, and with `tickSpacing: 3e9`, only its `out_of_range`. The failed `tickSpacing` is one of the check's inputs, so the whole check is skipped;
- `{ min: 0, max: 1e-10, showTickLabels: "x" }` → both issues. A sibling failure outside the inputs does not hide the range issue.

Whether the range issue is reported therefore depends on which other property failed, though it follows from none of them.
**Impact:** A description with both problems is fixed in two rounds: the second validation reports a range issue the first could have reported. The combination is rare.
**Recommendation:** Report the range independently. For example, `axisCheck(path)` could return two checks, a range check (inputs `min`, `max`) and a spacing check (inputs `min`, `max`, `tickSpacing`), or `axisRangeCheck` could be exported beside it. The spacing check would report `tick_spacing_invalid`, then skip its count on a too-narrow range so that nothing cascades. If registration changes, update the record's Notes for TICKET-002..004, and add a test for each combination above.
**Status:** Resolved
**Resolution:** Fixed — `axisCheck(path)` returns two domain checks: the range (inputs `min`, `max`) and the spacing (with `tickSpacing`). A failed or rejected spacing no longer hides a range too narrow to draw, and a narrow range is reported once, with no `too_many_ticks` on top. Tested. Approved by the user, 2026-10-20.

---

### CR-003: The too-narrow-range issue often suggests a maximum that is itself rejected, or one beyond the axis limit

**Severity:** Observation
**Location:** `src/core/definitions/axis.ts:95-97`
**Traces To:** GSV-REQ-031 (the message says what would make the value acceptable); AD-004's rationale ("a model fixing the reported issues does not chase phantom ones"); DEL-002
**Description:** The issue's `range.min`, which the message states as "must be a number at least …", is `cleanDecimal(min + resolution)`. Two things can make it fail. First, the resolution is computed from the current ends, and raising `max` raises the larger end, which raises the resolution. Second, `cleanDecimal` rounds to 12 significant digits, which can round down. Probes:
- 25,688 of 50,000 random too-narrow axes are rejected again when re-submitted with the suggested maximum. Example: `min` −1,827,452.6055626 gives "xAxis.max must be a number at least -1827452.60374; got -1827452.60374." for the suggested value itself.
- `{ min: 123456789.123, max: 123456789.246 }`, the suggestion for `max: 123456789.2`, gets the same message again.
- `{ min: 999999999.1, max: 1000000000 }` gives "at least 1000000000.1", above `AXIS_LIMIT`, so no maximum can satisfy it; the fix is a lower `min`.
- At zero the suggestion works (0 to 1e-10 → "at least 1e-9", which passes).

The data graphs' `checkValueScale` uses the same arithmetic (`src/core/value-scale.ts:306-313`), outside this ticket.
**Impact:** A model following the suggestion gets the same issue back. The case itself (a span under a billionth of the ends' size) is far from curricular use.
**Recommendation:** Compute a suggestion that passes. Round away from `min`, not to nearest, and solve for an end whose own resolution is covered, for example `s ≥ 1e-9 × max(1, |min|, |min + s|)`, with a margin. When the result exceeds `AXIS_LIMIT`, report at `min` with an upper bound instead. Add a test that re-validates the suggested value, as `tests/core/axis.test.ts:84-85` does for `too_many_ticks`.
**Status:** Resolved
**Resolution:** Fixed — `narrowRange` suggests the smallest valid `max`, rounded up at 10 significant digits, and when that would pass the axis limit reports at `min` with the largest valid `min` instead. A test applies each suggestion across six ranges, including both limits, and expects no issue. Approved by the user, 2026-10-20.

---

### CR-004: The default spacing gives fewer than 5 ticks on valid ranges narrower than about 4e-9, though the published description promises 5 to 20

**Severity:** Observation
**Location:** `src/core/value-scale.ts:28` (`MIN_CHOSEN_INTERVAL`), `:100-108` (`niceInterval`), `:374-376` (`axisSpacing`); `src/core/definitions/axis.ts:50` (`tickSpacing` description)
**Traces To:** NLC-REQ-005 (a documented default); specification Behaviors & Rules → Ticks ("a spacing … that gives between 5 and 20 ticks"); acceptance criterion 8 ("the rule is documented … in the definition's description text")
**Description:** `niceInterval` never chooses a spacing below 1e-9. The axis checks accept ranges as narrow as 1e-9 at zero (`tests/core/axis.test.ts:104`). Probe: 0 to 1e-9 gets 2 ticks, 0 to 2e-9 gets 3, 0 to 3e-9 gets 4, and 0 to 4e-9 gets 5. The criterion's range (0.001 to 10⁶ wide) holds, and the doc comments state that scope (`src/core/value-scale.ts:345-349`). The `tickSpacing` description, which is the published text, says "chosen to give between 5 and 20 ticks" without qualification.
**Impact:** A reader of the schema expects at least five ticks, and a number line from 0 to 2e-9 gets three. Such ranges are far outside curricular use.
**Recommendation:** Do one of the following:
- state the scope in the description, for example "for ranges at least 0.000000005 wide";
- raise the axis's narrow-range floor to match;
- let `axisSpacing` choose below 1e-9.

The description change is the smallest. It is published when TICKET-002 registers the first axis.
**Status:** Resolved
**Resolution:** Fixed — `tickSpacing`'s description says 5 to 20 ticks on a range at least 0.001 wide (fewer on a narrower one). No published file changes until a type registers an axis. Approved by the user, 2026-10-20.

---

### CR-005: The tick-spacing bound of 2e9 is enforced but not stated in its description

**Severity:** Observation
**Location:** `src/core/definitions/axis.ts:45-51`; delivery record DEL-002 (`.gener8v/changes/graph-library/delivery/number-lines-and-coordinate-graphs-ticket-001-delivery.md:151`)
**Traces To:** The Known Hazard carried from GSS TICKET-001 security review SEC-002 ("Bound every axis minimum, maximum and tick spacing to a published limit … and state it in the property descriptions"); DEL-002 ("The limits are stated in the descriptions")
**Description:** `tickSpacing: 3e9` is reported as "xAxis.tickSpacing must be a number at most 2000000000" (probe), but its description says only "greater than 0, giving at most 100 ticks". The `min` and `max` descriptions do state ±1e9. The data graphs' `tickInterval` has the same omission (`src/core/definitions/categories.ts:140-146`), so this follows house precedent, but the hazard asks for it here.
**Impact:** Low. The published schema's `maximum` carries the bound. The description and the record disagree.
**Recommendation:** Add "and at most 2000000000" to the `tickSpacing` description, or correct DEL-002's sentence.
**Status:** Resolved
**Resolution:** Fixed — `tickSpacing`'s description states its limit, 2,000,000,000. Approved by the user, 2026-10-20.

---

### CR-006: `niceTicks` throws on axes the validator reports, and a sibling domain check that calls it turns the whole result into `internal_error`

**Severity:** Observation
**Location:** `src/core/value-scale.ts:393-395` (the throw); `src/core/validate/domain.ts:26-32` (domain issues do not mark their inputs failed); delivery record `## Notes` (`.gener8v/changes/graph-library/delivery/number-lines-and-coordinate-graphs-ticket-001-delivery.md:191-195`)
**Traces To:** Ticket Output ("consumed by TICKET-002, TICKET-003, TICKET-004"); TICKET-002's NLC-REQ-020 (`tick_label_not_on_tick`); AD-004; the `DomainCheck` contract (`src/core/definitions/types.ts:218-225`); the QR-005 hazard (one home for the tick rule)
**Description:** DEL-001 puts `niceTicks` in core so validation can use it. It throws on any axis the validator would refuse, including more than 100 ticks and an empty range. But domain checks do not see one another's issues: the domain stage adds issues without failing their inputs. TICKET-002's `tick_label_not_on_tick` check will read `axis/min`, `axis/max` and `axis/tickSpacing`, so it runs after `axisCheck` has reported `too_many_ticks` or a too-narrow range. If it lists the ticks with `niceTicks`, the `RangeError` reaches `validateWith`, which replaces every issue with one `internal_error`.

Probe: a test check that lists ticks, registered after `axisCheck`, turns `{ min: 0, max: 10, tickSpacing: 0.01 }` into `["internal_error"]` instead of `too_many_ticks`.

The record's Notes for TICKET-002..004 do not mention it, and no core predicate that does not throw is exported: `multiplesIn` and `isWhole` are private. TICKET-002 must either guard every call or write a second "is this a tick?" rule, against QR-005's single home.
**Impact:** A description with two problems, too many ticks and a custom tick label, would be answered "a defect in the package" rather than with its two issues.
**Recommendation:** Export a core helper that does not throw and shares `multiplesIn`, for example `axisTicks(min, max, spacing?) → number[] | undefined`, or `tickAt(value, min, max, spacing)` returning the tick a value falls on. Otherwise, add a Known Hazard to TICKET-002, and a line to the record's Notes: its tick-label check must not call `niceTicks` unless `axisChecks` returns no issue for the axis.
**Status:** Resolved
**Resolution:** Fixed and Deferred → TICKET-002 — `drawableTicks(min, max, spacing?)` (`src/core/value-scale.ts`) returns the ticks or undefined, never throwing; tested on nine undrawable axes. Known Hazards on NLC TICKET-002, TICKET-003 and TICKET-004: checks use `drawableTicks`, never `niceTicks`, and register `...axisCheck(term)`. Approved by the user, 2026-10-20.

---

### CR-007: Custom tick labels are matched by exact value against ticks rounded to 12 significant digits, so a label at ⅔ is silently not drawn

**Severity:** Observation
**Location:** `src/layout/kit/axis.ts:24-25`, `:95` (`labels?.get(value) ?? tickLabel(value, spacing)`); `src/core/value-scale.ts:82` (`onGrid` → `cleanDecimal`, `toPrecision(12)`), `:398`; doc comment `:382-383` ("values are not rounded otherwise")
**Traces To:** Ticket Output for `drawAxis` (`labels?: Map<number, string>`, "consumed by every NLC layout"); NLC-REQ-019 (TICKET-002); specification OQ-001 and TICKET-002's Known Hazard (custom tick labels are the supported way to show fractions); acceptance criterion 7
**Description:** With `tickSpacing` 0.3333333333333333 (⅓ as JSON writes it), `niceTicks(0, 1)` gives [0, 0.333333333333, 0.666666666667, 1]. Each tick is `k × spacing` rounded to 12 significant digits, so the doc comment's "values are not rounded otherwise" does not hold for spacings with more digits. A custom label at 0.6666666666666666 (⅔) is not a key of the tick list. Probe: `drawAxis` with `labels: new Map([[2/3, "two thirds"]])` draws "0", "0.333333333333", "0.666666666667", "1", and nothing says the custom text was dropped. Sevenths behave the same (3/7 → 0.428571428571). For short decimals (0.1, 0.25, 0.0625 …) the rounded ticks equal the literals (1,273,679 ticks probed), so typical decimal labels match.
**Impact:** Thirds are among the fractions a number line most often labels, and TICKET-002 cites OQ-001 to say custom labels are how to show them. If TICKET-002's `tick_label_not_on_tick` rightly accepts ⅔ as on a tick, the drawing then ignores the label.
**Recommendation:** Do one of the following:
- have `drawAxis` look labels up by tick index, or through the same snapping the validator will use (see CR-006), not by exact value;
- state in the `labels` doc comment and the record's Notes that keys must be `niceTicks`' tick values, and have TICKET-002 snap each custom label's value to the tick list (a Known Hazard on TICKET-002).

Either way, correct the doc comment to say ticks are rounded to 12 significant digits.
**Status:** Resolved
**Resolution:** Fixed and Deferred → TICKET-002 — `drawAxis` matches a custom label to its tick with `isTickValue` (within a millionth of the spacing), so ⅔ labels the tick listed as 0.666666666667; tested. A Known Hazard on NLC TICKET-002 makes `tick_label_not_on_tick` use the same rule. Approved by the user, 2026-10-20.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Fixed | End-of-range allowance in value terms; tests | `src/core/value-scale.ts`, `tests/layout/kit/ticks.test.ts` |
| CR-002 | Fixed | Range and spacing as separate domain checks | `src/core/definitions/axis.ts`, `tests/core/axis.test.ts` |
| CR-003 | Fixed | Suggested end valid, at min near the limit | `src/core/definitions/axis.ts`, `tests/core/axis.test.ts` |
| CR-004 | Fixed | Description qualified | `src/core/definitions/axis.ts` |
| CR-005 | Fixed | Description states the 2e9 limit | `src/core/definitions/axis.ts` |
| CR-006 | Fixed; Deferred → TICKET-002 | `drawableTicks`; Known Hazards on NLC TICKET-002..004 | `src/core/value-scale.ts`, `tests/layout/kit/ticks.test.ts`, ticket files |
| CR-007 | Fixed; Deferred → TICKET-002 | `isTickValue` matching in `drawAxis`; Known Hazard on NLC TICKET-002 | `src/core/value-scale.ts`, `src/layout/kit/axis.ts`, `tests/layout/kit/axis.test.ts`, ticket file |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (all 7 Resolved)
**Notes:**
- Every acceptance criterion is met, including criterion 6 for axes far from zero (CR-001). CR-006 and CR-007 also leave Known Hazards on the number-line, x,y and x,y,z tickets.
- `pnpm generate` (no change), `lint`, `typecheck`, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size`, `publint`, `attw`, `audit` and `gener8v-state lint` exit 0. `pnpm test` (1,161 tests) exits 0 on three runs.
- Six deliberate breaks of the fixes, made against a passing baseline and restored from memory, each fail a test.
