# TICKET-007: Report a tick spacing that leaves fewer than two ticks in the axis range — Delivery Record

## Ticket Reference

**Ticket:** graph-library/number-lines-and-coordinate-graphs/TICKET-007
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/number-lines-and-coordinate-graphs.md`
**Requirements Covered:**
- NLC-REQ-004: Ticks at every whole multiple of the tick spacing within the axis range
- NLC-REQ-008: Report a tick spacing that would produce more than 100 ticks (the lower bound joins it)
- NLC-REQ-009: Report a tick spacing that is zero or negative (the new rule sits beside it)
- NLC-REQ-012: The text alternative states what the figure shows
- GSV-REQ-030: Each issue carries a code from a fixed, documented set
- GSV-NFR-005: Every issue code is documented

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Depends on nothing | — | `main` at `a14a4ed` | ✅ |
| `axisSpacingIssues` in `src/core/definitions/axis.ts` | zero-or-negative, then the 100-tick count | line 126: `tick_spacing_invalid`, then `axisTooNarrow` (returns nothing), then `tickCount > MAX_VALUE_TICKS` → `tooManyTicks` | ✅ |
| `tickCount`, `axisSpacing`, `tooManyTicks`, `drawableTicks` | `src/core/value-scale.ts` | lines 406, 430, 201, 512 | ✅ |
| The DS-002 repro | valid today | `validate({ type: "number-line", axis: { min: 1, max: 9, tickSpacing: 10 } }).valid` is `true` | ✅ — the failing case |
| The boundary counts | 0, 1, 2, 2 | `tickCount(1, 9, 10)` 0; `(0.5, 1.5, 1)` 1; `(0, 10, 10)` 2; `(0, 10, 8)` 2 | ✅ |
| Examples relying on fewer than two ticks | none | no `examples/*.json` axis with a supplied spacing below two ticks | ✅ |
| Issue codes, docs, params, messages | `src/core/issues.ts`; `tests/core/issues.test.ts` | present, `not_on_mark` newest | ✅ |
| Kit tests that must stay unchanged | `tests/layout/kit/axis.test.ts`, `tests/layout/kit/ticks.test.ts` | present | ✅ |
| Specification requirement for the lower bound | none (Known Hazard) | none; the Product Owner decision of 2026-10-26 (DS-002) is the authority | 🔁 Recorded — a new requirement is needed (Specification skill) |
| System design IssueCode list | will lack the code | `.gener8v/technical-design/system-design.md` Data Model | 🔁 Recorded for the next Technical Design amendment |

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-11-02
**Implemented by:** sonnet · medium — routed as deliver-small from Tower

### Planned Files

- `src/core/issues.ts`: `too_few_ticks` appended after `not_on_mark`; one-sentence `issueDocs` entry; `IssueParamsByCode` (`term`, `tickCount`, `minTicks`, `fittingSpacing`, mirroring `too_many_ticks`); the message "axis.tickSpacing would draw 0 ticks, fewer than the minimum of 2; use a smaller tick spacing, such as 0.5.", singular and plural right.
- `src/core/definitions/axis.ts`: `axisSpacingIssues` reports it at `/axis/tickSpacing` after the 100-tick count when `tickCount(min, max, spacing) < 2`; the fitting spacing is `axisSpacing(min, max)` (7 to 20 ticks); never two spacing issues; no enumeration; check inputs unchanged; `@spec NLC-REQ-004, NLC-REQ-008, NLC-REQ-009`; the check's name and `axisChecks`' doc comment list the rule.
- `tests/core/axis.test.ts`: 0/1/2-tick boundaries, no double issues, no work growth (`2e9`, `1e-300`), the tolerance edge at exactly two ticks.
- `tests/core/number-line.test.ts`: the DS-002 assertion and `createGraph`, the message and its fitting spacing applied, custom tick labels.
- `tests/core/issues.test.ts`: the code list, params and message samples.
- Existing tests relying on fewer than two ticks moved to a valid spacing, each listed here.
- `.changeset/*.md`: a `Changed:` entry.
- This record notes the specification needs a new requirement for the lower bound, and the system design's IssueCode list the new code.

### How Acceptance Criteria Will Be Met

- Criteria 1–3 — `tests/core/number-line.test.ts`, `tests/core/axis.test.ts`.
- Criterion 4 — `tests/core/issues.test.ts` and the GSV-NFR-005 documentation test.
- Criterion 5 — `tests/core/axis.test.ts` (no double issues, flat cost).
- Criterion 6 — the kit tests, unedited.
- Criteria 7–8 — default-spacing and custom-label tests; changed tests listed; examples and README snippets validate.
- Criteria 9–10 — the changeset; the full loop and `pnpm generate` unchanged.

## Progress

- [x] `src/core/issues.ts`
- [x] `src/core/definitions/axis.ts`
- [x] `tests/core/axis.test.ts`
- [x] `tests/core/number-line.test.ts`
- [x] `tests/core/issues.test.ts`
- [x] Existing tests moved, listed — none: the full suite after the rule broke only the three issue-code-set tests in `tests/core/issues.test.ts`, which list the new code; no existing test relied on a one- or zero-tick spacing
- [x] Changeset — `.changeset/tick-spacing-with-fewer-than-two-ticks-rejected.md`, `minor` (a previously valid description is now invalid while the package is 0.x; note for the first release's notes)

### Notes

- Specification: needs a new requirement for the lower bound (Specification skill); the code carries `@spec NLC-REQ-004, NLC-REQ-008, NLC-REQ-009` until then.
- System design: the IssueCode list needs `too_few_ticks` at the next Technical Design amendment.
- The check's name string (`the <axis> tick spacing is greater than 0 and gives at most 100 ticks`) is unchanged: it is copied into `src/generated/vocabulary.json`, and the ticket requires `pnpm generate` to leave `src/generated/*` unchanged. The rule is listed in the doc comment of `axisChecks` instead. Tension between the ticket's Output and criterion 10 for the Product Owner.
- Tolerance edge: `tickCount` and `drawableTicks` still differ by one at 1e-12 (17th multiple of 57.8: counted 18, drawn 17; 3rd multiple of 0.3: counted 4, drawn 3). No difference was found at a count of two or fewer in about 4 million probed ranges, so the count is used as is and the edge is accepted and pinned in `tests/core/axis.test.ts`.

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/core/issues.ts`: `too_few_ticks` after `not_on_mark` — `issueDocs`, `IssueParamsByCode` (`term`, `tickCount`, `minTicks`, `fittingSpacing`), message ("would draw 0 ticks / 1 tick, fewer than the minimum of 2; use a smaller tick spacing, such as …").
- `src/core/definitions/axis.ts`: `axisSpacingIssues` reports it at `/axis/tickSpacing` after the 100-tick count, on a drawable range, when `tickCount(min, max, spacing) < MIN_AXIS_TICKS` (2); the fitting spacing is `axisSpacing(min, max)`; inputs unchanged; `@spec NLC-REQ-004, NLC-REQ-008, NLC-REQ-009`; `axisChecks`' doc comment lists the rule.
- `tests/core/axis.test.ts`, `tests/core/number-line.test.ts`, `tests/core/issues.test.ts`: the DS-002 case and `createGraph`, the 0/1/2-tick boundaries, no double issues, no change without a spacing, `2e9` and `1e-300`, the tolerance edge, the custom-label case, the code list, params and messages.
- `.changeset/tick-spacing-with-fewer-than-two-ticks-rejected.md`: `minor`, `Changed:` (a previously valid description is now refused; `.changeset/README.md` makes that a minor bump under 0.x).
- Kit, kit tests, specification and system design untouched.

## Verification Run

Run in the main session on 2026-11-02, after the code was written; logs kept per command.

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm generate` / `pnpm lint` / `pnpm typecheck` | 0 / 0 / 0 | `src/generated` unchanged |
| `npx vitest run --no-cache` ×3 | 0, 0, 1 | 2,357 passed in two runs; in the third, 1 failure outside this ticket: `tests/core/triangle-solver.property.test.ts` "two sides and the angle between them" (GSS-NFR-002), seed 875653159, counterexample angles 0.0201°, 60.90°, 119.08° — a two-sides-and-included-angle round trip just above the 0.02° floor missing 10⁻⁹. Neither the solver nor that test changed here (`git diff main` empty for both); raised separately |
| `pnpm bench` | 0 | 25 passed |
| `pnpm build` / `check:dist` / `check:deps` / `check:images` / `check:changesets` / `size` / `publint` / `attw` | 0 each | 12 changesets checked |
| `pnpm audit` / `pnpm audit --prod` | 1 / 0 | the accepted `minimatch` advisory |
| Examples | — | every `examples/*.json` validates; the README has no `tickSpacing` snippet |
| Mutation checks (restored) | — | check dropped → 7 tests fail; `< 1` → 5 fail; `floor((max − min) / spacing)` → 3 fail |
| `gener8v-state.py state` / `lint` | 0 / 0 | 0 errors, 0 warnings |

## Acceptance Criteria Verification

- [x] DS-002: not ok, exactly one `too_few_ticks` at `/axis/tickSpacing`; `createGraph` `ok: false` — `number-line.test.ts`, `axis.test.ts`.
- [x] One tick reported; exactly two valid (0–10 by 10 and by 8) — `axis.test.ts`.
- [x] The message states count and minimum and names `axisSpacing`'s spacing, which validates when applied; singular and plural — `number-line.test.ts`, `issues.test.ts`.
- [x] `ISSUE_CODES`, `issueDocs`, `IssueParamsByCode`, the issues test; GSV-NFR-005's documentation test passes — full suite.
- [x] No axis gets two spacing issues; no enumeration; flat cost for `2e9` and `1e-300` — `axis.test.ts`.
- [x] The kit is unchanged and its tests pass unedited — `git diff`, full suite.
- [x] No spacing, `showTickLabels: false` or custom labels: never reported without a spacing — `axis.test.ts`, `number-line.test.ts`.
- [x] No existing test relied on a one- or zero-tick spacing (the only failures were the three tests enumerating every code, updated); examples validate.
- [x] A `Changed:` changeset.
- [x] The full loop passes (the unrelated property failure above); `pnpm generate` leaves `src/generated` unchanged.

## Decisions Made

### DEL-001: The check's name is not changed

**Context:** The Output asks the check's name string in `axisDomainChecks` to list the new rule, but that string is copied into the tracked `src/generated/vocabulary.json`, and criterion 10 requires `pnpm generate` to leave `src/generated` unchanged.
**Decision:** Criterion 10 wins; the rule is listed in `axisChecks`' doc comment instead.

### DEL-002: The tolerance edge is accepted

**Context:** `tickCount` and `drawableTicks` disagree by one at the 1e-12 edge (17 × 57.8: 18 counted, 17 drawn; 3 × 0.3: 4 against 3).
**Decision:** At a count of two or fewer no disagreement was found in about 4 million probed ranges, so validation follows `tickCount`; both facts are pinned by a test in `tests/core/axis.test.ts`.

## Deviations from Plan

None — implementation followed the approved plan, with DEL-001.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| NLC-REQ-004, NLC-REQ-008, NLC-REQ-009 | `src/core/definitions/axis.ts`:axisSpacingIssues | `@spec` line |

## Notes

- The specification needs a new requirement for the lower bound (Specification skill); until then the Product Owner decision of 2026-10-26 (DS-002) is the authority.
- The system design's IssueCode list needs `too_few_ticks` at the next Technical Design amendment.
- The first release's notes should list the new rejection (a `minor` changeset under 0.x).

## Post-Review Amendments

None
