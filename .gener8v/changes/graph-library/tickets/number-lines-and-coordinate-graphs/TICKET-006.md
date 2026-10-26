# TICKET-006: Keep floating-point noise out of axis tick labels when the tick spacing is computed

**Change:** graph-library
**Capability Area:** Number Lines & Coordinate Graphs (number-lines-and-coordinate-graphs)
**Specification:** specifications/number-lines-and-coordinate-graphs.md

**Summary:** A tick spacing that carries arithmetic noise, such as `0.1 * 3` (0.30000000000000004), makes every axis tick label print 17 digits, and the long labels overlap and widen the end room. Count the spacing's decimal places on the spacing with that noise removed, so the labels read `0`, `0.3`, `0.6`, `0.9`, `1.2`. Fixes defect-sweep finding DS-001 (`.gener8v/sweeps/layout-kit-text-and-axis-sweep.md`).
**Priority:** Must
**Value:** A curriculum developer who computes a tick spacing in code gets the same clean tick labels as one who types it, and a student never sees a wrong-looking `1.2000000000000002` at the end of a scale.

**Requirements Covered:**
- NLC-REQ-004: Ticks at every whole multiple of the tick spacing; each label shows the tick's value with no more decimal places than the spacing needs (Behaviors & Rules → Ticks, "label decimals from spacing"). The bug violates the label rule for a spacing that carries noise.

**Prior Art:**
- Read: `.gener8v/sweeps/layout-kit-text-and-axis-sweep.md` — DS-001: mechanism, the repro command, and the verdict ("fix before NLC TICKET-003 and TICKET-004 build on the same tick rule; the fix belongs in the spacing's decimal count")
- Read: `.gener8v/specifications/number-lines-and-coordinate-graphs.md` — NLC-REQ-004 and Behaviors & Rules → Ticks (label decimals come from the spacing)
- Read: `src/core/value-scale.ts` — `decimalPlaces` (counts the digits of the spacing's shortest printed form), `axisTickLabel` (rounds a tick to `decimalPlaces(spacing)`), `axisTick` (removes noise at `decimalPlaces(spacing) + 3`), `drawableTicks`, and `cleanDecimal` (12 significant digits, the noise rule the data graphs' `onGrid` already uses; its comment names this hazard, security review SEC-003)
- Read: `src/layout/number-line.ts` — `halfLabel` and `inset`: the widest tick label sizes the end room, so a 17-digit label shrinks the line
- Read: `src/core/definitions/number-line.ts` — `describe` states a supplied spacing "as written" (`stateMeasurement(…, "supplied")`)
- Read: `tests/layout/kit/ticks.test.ts` — the tests that must keep passing, above all "keeps ticks far from zero on their multiples" (`100000000.0025` keeps every digit, NLC TICKET-001 quality review QR-002)
- Read: `tests/layout/number-line.test.ts` — how the number line's drawn text is asserted today

**Acceptance Criteria:**
- [ ] `createGraph({ type: "number-line", axis: { min: 0, max: 1.2, tickSpacing: 0.1 * 3 } })` draws the tick labels `["0", "0.3", "0.6", "0.9", "1.2"]` (the sweep's failing assertion; it fails today with `0.30000000000000004` …). The text nodes are read as in the sweep's repro command
- [ ] The same axis with `tickSpacing: 0.3` and with `0.1 * 3` draw identical scene nodes: the line is as long, the ticks are in the same places, and the end room is not widened by long labels. Only the text alternative may differ (it states a supplied spacing as written)
- [ ] Other computed spacings are clean too: `0.1 + 0.2`, `0.7 / 7` (0.09999999999999999) and `0.2 * 3` give labels with no more than the decimals of the intended value (`0.3`, `0.1`, `0.6`). A table-driven test over these in `tests/layout/kit/ticks.test.ts` asserts `tickLabel` and `niceTicks` for each
- [ ] `tests/layout/kit/ticks.test.ts` "keeps ticks far from zero on their multiples" passes unchanged: `niceTicks(1e8, 1e8 + 0.2, 0.0025)` still has `100000000.0025` as its second tick, labeled `"100000000.0025"`, and `100000000.2` as its last
- [ ] Spacings typed exactly keep their labels: `0.25` → `"0.75"`, `2` → `"4"`, `0.0025` → four decimals, `1e-7` → seven decimals, as the existing `decimalPlaces` and label tests already assert
- [ ] The bar graph's tick labels for `tickInterval: 0.1 * 3` are unchanged (`0`, `0.3`, `0.6`, `0.9`, `1.2`): the data graphs' rule is not touched
- [ ] The number line's text alternative for `tickSpacing: 0.1 * 3` is unchanged by this ticket (it keeps stating the supplied spacing as written)
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass

**Output:**
- `src/core/value-scale.ts` — `decimalPlaces` counts the decimals of the spacing with its arithmetic noise removed (for example through `cleanDecimal`), so `axisTickLabel` and `axisTick` follow. No change to `axisTick`'s `+ 3` rule or to how a tick's value is computed
- `tests/layout/kit/ticks.test.ts` — the table of computed spacings and the QR-002 test, kept (criteria 3, 4, 5)
- `tests/layout/number-line.test.ts` — the `0.1 * 3` labels and the equal-scene assertion (criteria 1, 2, 7)
- `tests/layout/bar-graph.test.ts` or the existing value-scale test — only if needed to pin criterion 6

**Constraints:** None identified. The fix changes no description's validity: the same descriptions are valid before and after, so CPSE-REQ-043 is not engaged.

**Known Hazards:**
- Fix the spacing's decimal count (`decimalPlaces`), NOT the tick. Rounding each tick to 12 significant digits (as `onGrid` does for the data graphs) would turn `100000000.0025` into `100000000.003` and fail `tests/layout/kit/ticks.test.ts` "keeps ticks far from zero on their multiples" (NLC TICKET-001 QR-002). So clean only the spacing, then leave `axisTick` and the tick values as they are.
- A spacing whose true value has more than 12 significant digits, such as `1 / 3` (0.3333333333333333), is not noise. After the fix its labels print 12 decimals (`0.333333333333`) instead of 16. That is acceptable, since 12 digits is the package's noise limit (`cleanDecimal`), but check `tests/layout/kit/ticks.test.ts` (the `1 / 3` cases at the `isTickValue` tests) and `tests/core/number-line.test.ts` (custom tick labels at `2 / 3`) still pass, and record the change in the delivery record's Decisions rather than silently accepting it.
- The text alternative states a supplied spacing "as written" (`stateMeasurement(…, "supplied")` in `src/core/definitions/number-line.ts`, DEL-006 of NLC TICKET-002). The sweep leaves that question open, so do NOT change `describe`; a text alternative that says "ticked every 0.30000000000000004" stays as it is. If it should change, raise it as a separate finding.
- `decimalPlaces` is private to `src/core/value-scale.ts` and is also read by `axisTick`; changing it changes the digits at which each tick is rounded (`decimalPlaces + 3`). The rounded tick is the same for a clean spacing and equal to the intended value for a noisy one, but run the property tests in `tests/layout/kit/ticks.test.ts` (300 and 500 runs) to confirm no tick is dropped from the end of a range.
- NLC TICKET-003 and TICKET-004 (x,y and x,y,z graphs) read the same tick rule through `kit/axis.ts`; this fix lands first so they inherit it. Do not fix it a second time in `src/layout/kit/axis.ts`.

**Depends On:** None
**Blocks:** TICKET-003, TICKET-004

**Size:** Small

**Notes:** NLC TICKET-001 and TICKET-002, which built the code this ticket changes, are delivered and reviewed, so this ticket has no open predecessor. The project already treats a computed spacing as real input: the ruler absorbs `0.1 + 0.2` for the same reason (NLC TICKET-002 code review CR-003).
