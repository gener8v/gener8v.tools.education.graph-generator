# TICKET-007: Report a tick spacing that leaves fewer than two ticks in the axis range

**Change:** graph-library
**Capability Area:** Number Lines & Coordinate Graphs (number-lines-and-coordinate-graphs)
**Specification:** specifications/number-lines-and-coordinate-graphs.md

**Summary:** Today `{ min: 1, max: 9, tickSpacing: 10 }` validates and draws a line with no tick and no number, while the text alternative says "ticked every 10". Make validation reject a supplied tick spacing that leaves fewer than two ticks within the axis range, reported at `/axis/tickSpacing` under one new public issue code, `too_few_ticks`, whose message names a spacing that fits. Fixes defect-sweep finding DS-002 (`.gener8v/sweeps/layout-kit-text-and-axis-sweep.md`).
**Priority:** Must
**Value:** A curriculum developer who writes a spacing larger than the range is told so and given a spacing that works, instead of getting a figure with no scale and a text alternative that describes ticks it does not have.

**Requirements Covered:**
- NLC-REQ-004: Ticks at every whole multiple of the tick spacing within the axis range; a spacing that draws fewer than two of them gives the axis no scale to read
- NLC-REQ-008: Report a tick spacing that would produce more than 100 ticks (this ticket adds the lower bound beside the upper one; the specification states no lower bound, see Known Hazards)
- NLC-REQ-009: Report a tick spacing that is zero or negative (same: the new rule sits beside it)
- NLC-REQ-012: The text alternative states what the figure shows (prd/CC-002); after this ticket it can no longer say "ticked every 10" of a figure with no ticks
- GSV-REQ-030: Each issue carries a code from a fixed, documented set (the new code joins it)
- GSV-NFR-005: Every issue code is documented (the new code is in `issueDocs`)

**Prior Art:**
- Read: `.gener8v/sweeps/layout-kit-text-and-axis-sweep.md` — DS-002: mechanism, repro command, and the verdict. Product Owner decision (Thomas Eaves, 2026-10-26): validation rejects a supplied tick spacing that leaves fewer than two ticks within the axis range, reported at `/axis/tickSpacing`, with one new public issue code whose message names a spacing that fits
- Read: `src/core/definitions/axis.ts` — `axisSpacingIssues` (spacing of 0 or less, then count above `MAX_VALUE_TICKS`, silent on a range too narrow to draw), `axisDomainChecks` (the check's `inputs`), `tooManyTicks`. `axisSpacingIssues` is shared by every axis-based type, so x,y and x,y,z graphs (TICKET-003, TICKET-004) get the rule when they register `axisDomainChecks`
- Read: `src/core/value-scale.ts` — `tickCount` (counts the multiples arithmetically, so a tiny spacing is counted, never listed), `axisSpacing` (the default spacing, 1, 2 or 5 × 10ⁿ for 7 to 20 ticks, used here as the spacing that fits), `drawableTicks` (returns `{ ticks: [] }` for such an axis; deliberate, unchanged), `tooManyTicks` at line ~201 (how the existing count issue is built)
- Read: `src/core/issues.ts` — `ISSUE_CODES`, `issueDocs`, `IssueParamsByCode`, the message templates (`too_many_ticks`: "would draw N ticks, more than the limit of M; use a larger tick spacing, such as X", `tick_label_not_on_tick`: "use a tick: a multiple of 2 from -10 to 10"), and `describeNumber`. Codes are the package's public contract (CONTRIBUTING.md; GSV-REQ-034)
- Read: `src/core/definitions/number-line.ts` — `describe` builds "ticked every …" from the spacing alone; `tickLabelsOnTicks` reads the drawn ticks
- Read: `tests/core/axis.test.ts`, `tests/core/number-line.test.ts`, `tests/core/issues.test.ts` — where axis checks, number line checks, and the code list, params and message samples are tested (`issues.test.ts` lines ~86, ~156, ~178 list `not_on_mark`, the newest code, as the pattern)
- Read: `tests/layout/kit/axis.test.ts` (lines 175-179) and `tests/layout/kit/ticks.test.ts` (lines 111-121) — the NLC TICKET-001 SEC-001 tests that stay unchanged
- Read: `CONTRIBUTING.md` — "the issue codes … are the package's public contract"; each change needs a changeset (`pnpm changeset`, summary starting `Changed:`)

**Acceptance Criteria:**
- [ ] `validate({ type: "number-line", axis: { min: 1, max: 9, tickSpacing: 10 } })` is not ok and reports exactly one issue, code `too_few_ticks`, path `/axis/tickSpacing` (the sweep's failing assertion; it is ok today). `createGraph` on it returns `ok: false` with that issue
- [ ] The same holds for one tick in range: `{ min: 0.5, max: 1.5, tickSpacing: 1 }` (one multiple, 1) is reported. A spacing leaving exactly two ticks is valid: `{ min: 0, max: 10, tickSpacing: 10 }` (0 and 10) and `{ min: 0, max: 10, tickSpacing: 8 }` (0 and 8)
- [ ] The issue's message states the count and the minimum and names a spacing that fits, in the form of the existing tick messages, for example "axis.tickSpacing would draw 0 ticks, fewer than the minimum of 2; use a smaller tick spacing, such as 0.5." (0.5 is `axisSpacing(1, 9)`). The named spacing is the axis's default spacing, so it always gives 7 to 20 ticks, and a test applies it to the same description and asserts it validates. "1 tick" and "0 ticks" are written correctly in the singular and plural
- [ ] `ISSUE_CODES` holds `too_few_ticks` once, `issueDocs` documents it in one sentence, `IssueParamsByCode` types its inputs (`term`, `tickCount`, `minTicks`, `fittingSpacing`, mirroring `too_many_ticks`), and `tests/core/issues.test.ts` covers the code in its list, its params sample and its message sample. The documentation test of GSV-NFR-005 passes
- [ ] A spacing of 0 or less still reports only `tick_spacing_invalid`, a count above 100 still reports only `too_many_ticks`, and a range too narrow to draw still reports only `out_of_range`: no axis gets two spacing issues. The check never enumerates ticks and its work does not grow with the magnitude of any value (`tickCount` only), including spacings such as `2e9` and `1e-300`
- [ ] The kit is unchanged: `drawableTicks(1, 9, 10)` still returns no ticks and `drawAxis` still draws the line only, so `tests/layout/kit/axis.test.ts` "draw a range near zero that excludes zero with no tick off the axis" and `tests/layout/kit/ticks.test.ts` "adds no tick at zero to a range near zero that excludes it" pass unchanged
- [ ] An axis with no `tickSpacing` is never reported (the default always gives ticks), with `showTickLabels: false` or with custom `tickLabels`
- [ ] Every existing test that relied on a one-tick or no-tick spacing being valid is changed to a spacing that leaves at least two ticks, and each such change is listed in the delivery record. The examples (`examples/*.json`) and README snippets still validate (CPSE-REQ-046)
- [ ] A changeset (`.changeset/*.md`) starting `Changed:` records the new rejection and the new code
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass, and `pnpm generate` leaves `src/generated/*` unchanged (the code set is not in the generated files)

**Output:**
- `src/core/issues.ts` — `too_few_ticks` appended to `ISSUE_CODES` (after `not_on_mark`, so existing order is kept), `issueDocs`, `IssueParamsByCode`, the message template
- `src/core/definitions/axis.ts` — `axisSpacingIssues` reports it after the count check, at `pointer(term, "tickSpacing")`; a `tooFewTicks` issue builder beside `tooManyTicks`, or `tooManyTicks` in `src/core/value-scale.ts` extended in the same style; the check's description (name string in `axisDomainChecks`) and the doc comment of `axisChecks` list the new rule
- `tests/core/axis.test.ts` — the boundary cases (0, 1, 2 ticks), no double issues, no work growth (criteria 1, 2, 5, 7)
- `tests/core/number-line.test.ts` — the DS-002 assertion, the message and its fitting spacing, the effect with custom tick labels (criteria 1, 3, 7)
- `tests/core/issues.test.ts` — the code list, params and message samples (criterion 4)
- `.changeset/<name>.md` — the `Changed:` entry (criterion 9)
- `tests/layout/kit/axis.test.ts`, `tests/layout/kit/ticks.test.ts` — unchanged; they prove criterion 6

**Constraints:**
- prd/CC-002: the text alternative must describe what the figure shows; a rejected description draws no figure, so none is left saying "ticked every 10"
- GSV-REQ-034 / CPSE-REQ-042, CPSE-REQ-043: issue codes are public contract; a change that makes a previously valid description invalid belongs in a new major version. The package is at version 0.0.0 and unreleased, so the rule can land now; the changeset says `Changed:`, and the delivery record notes it for the first release's notes
- AD-004: no cascading issues; a range that failed structure or is too narrow reports nothing here

**Known Hazards:**
- Product Owner decision (Thomas Eaves, 2026-10-26): fewer than TWO ticks, not fewer than one, and ONE new code. Do not add a second code for the zero-tick and one-tick cases, and do not reuse `tick_spacing_invalid` (its meaning is "zero or negative", documented in `issueDocs`) or `too_many_ticks`. The name `too_few_ticks` is proposed to mirror `too_many_ticks`; if the delivery picks another, record it as a DEL-XXX before it ships, because a published code cannot be renamed (GSV-REQ-034).
- The specification has no requirement for this lower bound: NLC-REQ-008 and NLC-REQ-009 state only the 100-tick and zero-or-negative bounds. The Product Owner decision above is the authority. Do NOT edit `.gener8v/specifications/number-lines-and-coordinate-graphs.md` here; say in the delivery record that the specification needs a new requirement (Specification skill), so the new code and rule are traceable. Put `@spec NLC-REQ-004, NLC-REQ-008, NLC-REQ-009` on the code until then.
- The kit behaviour of NLC TICKET-001 SEC-001 stays: an axis with no multiple in range draws "only its line", never a wrong tick (`drawableTicks` returns `{ ticks: [] }`). The kit tests listed above pin it, and they must not be edited. The new rule belongs in the validator, not in `drawableTicks`, `niceTicks` or `drawAxis`, which still receive such an axis from a caller that does not validate.
- `axisSpacingIssues` is shared by every axis. Today only the number line registers `axisDomainChecks("axis")`; TICKET-003 and TICKET-004 will register it for `xAxis`, `yAxis` and `zAxis`, and so get the rule without further work. The tests in this ticket use the number line and the test-only definition in `tests/core/axis.test.ts` (which registers `xAxis` and `yAxis`); they do not wait for those tickets.
- The check's `inputs` must still list `${term}/min`, `${term}/max` and `${term}/tickSpacing` and nothing more: `tests/core/definitions.test.ts` checks that every path exists, and the check is skipped when an earlier failure touches one of them.
- A number line with an oversized spacing and a custom tick label now reports two issues: `too_few_ticks` at `/axis/tickSpacing` and `tick_label_not_on_tick` at the label (`tickLabelsOnTicks` reads `drawableTicks`, which returns no ticks). That is intended. Check `tests/core/number-line.test.ts` expectations that list the codes and update only those that used a one-tick spacing.
- The count must be `tickCount(min, max, spacing)`, the same arithmetic as the 100-tick check and `drawableTicks` (which anchors multiples at zero and tolerates decimal noise), so that "fewer than two" agrees with what the kit would draw. Do not recompute it with `floor((max − min) / spacing)`: `{ min: 0.5, max: 1.5, tickSpacing: 1 }` has one multiple, `{ min: 0, max: 1, tickSpacing: 1 }` has two.
- The system design's IssueCode list (`.gener8v/technical-design/system-design.md`, Data Model → IssueCode set, "Key Fields") will lack the new code. Do not edit it from Delivery; list it in the delivery record for the next Technical Design amendment.
- The data graphs' `tickInterval` rule (`tick_interval_not_dividing`, `src/core/value-scale.ts` value scale) is a different rule on a different property and is not touched.
- `tickCount` and the ticks `drawableTicks` lists can differ by one at the very edge of the 1e-12 tolerance (graph-library/number-lines-and-coordinate-graphs-ticket-006-security-review/SEC-001, resolution note, 2026-10-26). For `tickSpacing: 57.8` and `max: 57.8 × 17 × (1 − 9.9992e-13)` from 0, `tickCount` is 18 but 17 ticks are listed: `multiplesIn` matches an end within 1e-12 of a multiple relative to the multiple, while `drawableTicks` keeps a tick within 1e-12 of the larger end. This predates NLC TICKET-006. So a range whose end sits at that edge could pass a "two or more" count with one drawn tick; test a count of exactly 2 at such an edge, and if they disagree, either count from the same rule or record the edge as accepted, rather than leaving the two checks out of step silently.

**Depends On:** None
**Blocks:** None

**Size:** Small

**Notes:** Small because the rule is one comparison and one message beside two existing ones in one function. It would be Medium if the existing tests relied on one-tick spacings in many places; count them first. The text alternative's wording needs no change: a rejected description never reaches `describe`. The sweep asked what the text alternative says if such a line stayed valid; the decision rejects it, so that question closes.
