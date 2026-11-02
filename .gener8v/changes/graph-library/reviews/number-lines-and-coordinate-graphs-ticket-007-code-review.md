# TICKET-007: Report a tick spacing that leaves fewer than two ticks in the axis range — Code Review

## Summary

Reviewed commit eb820d4 (the new `too_few_ticks` rule in `axisSpacingIssues`, its issue-code plumbing, tests and changeset) against the ticket, DS-002 and the specification. All ten acceptance criteria are satisfied and the targeted lint, typecheck and test re-runs pass. Findings are about traceability bookkeeping only: the specification's `@spec Coverage` row for NLC-REQ-004 does not list the annotated function, the delivery record names a different function than the annotation sits on, and one test uses a wall-clock bound. 3 findings (0 Critical, 1 Issue, 2 Observations).

**Delivery Record:** `.gener8v/changes/graph-library/delivery/number-lines-and-coordinate-graphs-ticket-007-delivery.md`
**Files Reviewed:**
- `src/core/definitions/axis.ts`
- `src/core/issues.ts`
- `tests/core/axis.test.ts`
- `tests/core/number-line.test.ts`
- `tests/core/issues.test.ts`
- `.changeset/tick-spacing-with-fewer-than-two-ticks-rejected.md`
- `.gener8v/specifications/number-lines-and-coordinate-graphs.md` (`@spec Coverage`)
- `.gener8v/sweeps/layout-kit-text-and-axis-sweep.md` (DS-002)

**Findings:** 3
**Critical:** 0 | **Issues:** 1 | **Observations:** 2

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| 1. DS-002 description is not ok, exactly one `too_few_ticks` at `/axis/tickSpacing`; `createGraph` `ok: false` | Yes | `src/core/definitions/axis.ts` `axisSpacingIssues`; `tests/core/number-line.test.ts` "rejects a tick spacing leaving fewer than two ticks" |
| 2. One tick reported; exactly two valid (0-10 by 10 and by 8) | Yes | `tests/core/axis.test.ts` "allows exactly two ticks…"; `tests/core/number-line.test.ts` "applies the spacing the message names…" |
| 3. Message states count and minimum, names the `axisSpacing` spacing, which validates; singular and plural | Yes | `src/core/issues.ts` `too_few_ticks` template (uses `count(...)`); `axisSpacing(min, max)` passed as `fittingSpacing`; applied-spacing assertions in `tests/core/axis.test.ts` and `tests/core/number-line.test.ts`; plural/singular in `tests/core/issues.test.ts` |
| 4. `ISSUE_CODES` once, `issueDocs` one sentence, `IssueParamsByCode`, issues test list/params/message; GSV-NFR-005 doc test | Yes | `src/core/issues.ts` (after `not_on_mark`); `tests/core/issues.test.ts` code list, `SAMPLES`, message map, plain-JSON sample |
| 5. No double spacing issues; no enumeration; flat cost for `2e9`, `1e-300` | Yes | Early returns in `axisSpacingIssues` (invalid, narrow, too many, then too few); `tickCount` only; `tests/core/axis.test.ts` "gives one spacing issue at most" and "counts a huge or tiny spacing arithmetically" (see CR-003 on the timing bound) |
| 6. Kit unchanged, kit tests pass unedited | Yes | `git show eb820d4 --stat` touches no `src/layout` file and no kit test; kit tests pass in the re-run |
| 7. No spacing, hidden labels or custom labels never reported without a spacing | Yes | `tests/core/axis.test.ts` "never reports a missing tick spacing"; `tests/core/number-line.test.ts` "never reports an axis with no tick spacing…" |
| 8. Existing tests relying on fewer than two ticks moved; examples and README validate | Yes | Delivery record lists none needed (only the three code-list tests changed); the diff changes no other existing assertion; record states examples validate |
| 9. `Changed:` changeset | Yes | `.changeset/tick-spacing-with-fewer-than-two-ticks-rejected.md` (`minor`, starts `Changed:`) |
| 10. Full loop passes; `pnpm generate` leaves `src/generated` unchanged | Yes | Commit touches no `src/generated`; lint and typecheck re-run exit 0; the record's one full-suite failure (`triangle-solver.property.test.ts`) is outside this ticket and its files are unchanged |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| NLC-REQ-004 | Ticks at whole multiples within the range; fewer than two gives no scale | `src/core/definitions/axis.ts`:axisSpacingIssues (via axisChecks) | Yes |
| NLC-REQ-008 | Report more than 100 ticks (lower bound joins it) | `src/core/definitions/axis.ts`:axisSpacingIssues | Yes |
| NLC-REQ-009 | Report zero or negative spacing (new rule sits beside it) | `src/core/definitions/axis.ts`:axisSpacingIssues | Yes |
| NLC-REQ-012 | Text alternative states what the figure shows | A rejected description never reaches `describe`; `tests/core/number-line.test.ts` DS-002 test | Yes |
| GSV-REQ-030 | Each issue carries a code from a fixed, documented set | `src/core/issues.ts`:ISSUE_CODES | Yes |
| GSV-NFR-005 | Every issue code is documented | `src/core/issues.ts`:issueDocs; documentation test in the full suite | Yes |

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/CC-002 | Text alternative describes the figure | Yes | No figure is drawn for the rejected description |
| GSV-REQ-034 / CPSE-REQ-042, 043 | Codes are public contract; breaking change | Yes | One new code appended at the end; `minor` changeset under 0.x; record notes it for release notes |
| AD-004 | No cascading issues | Yes | `axisTooNarrow` and invalid spacing return before the count; check `inputs` unchanged |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-004 | Domain checks run after structure, no cascades | Yes | `axisDomainChecks` inputs unchanged; `src/core/definitions/axis.ts` |

Other technical-design decisions were not separately enumerated by the ticket. The system design's IssueCode list lacks the new code, which the ticket and record both state is for a later Technical Design amendment.

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| NLC-REQ-004 | `@spec NLC-REQ-004` | `src/core/definitions/axis.ts`:axisChecks | Yes |
| NLC-REQ-008 | `@spec NLC-REQ-008` | `src/core/definitions/axis.ts`:axisChecks | Yes |
| NLC-REQ-009 | `@spec NLC-REQ-009` | `src/core/definitions/axis.ts`:axisChecks | Yes |

**Coverage:** 3 of 3 requirements annotated (NLC-REQ-012, GSV-REQ-030 and GSV-NFR-005 are satisfied by existing annotated code paths and the code set, not by new functions).
**Missing:** None.
**Specification table:** No. The row for NLC-REQ-004 lists `axisProperties`, `tickCount`, `niceTicks`, `axisTickLabel`, `labelDecimals` and `drawAxis` but not `src/core/definitions/axis.ts`:axisChecks, which now carries `@spec NLC-REQ-004` (CR-001). Rows for NLC-REQ-008 and -009 already list `axisChecks`. The ticket forbade editing the specification from Delivery.

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm lint` | 0 | Yes |
| `pnpm typecheck` | 0 | Yes |
| `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache` on `tests/core/axis.test.ts`, `number-line.test.ts`, `issues.test.ts`, `definitions.test.ts`, `tests/layout/kit/axis.test.ts`, `ticks.test.ts` (217 tests) | 0 | Yes (subset of the record's full-suite run) |
| `pnpm generate`, full suite, bench, build and the check/publint/attw commands, audit | Not re-run | Not re-run by the reviewer, by instruction (no bench, no installs); the record's results are taken as stated. The record's third full-suite run failed in an unrelated property test and is disclosed there. |

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | Criterion 10 (generated files unchanged) overrides the Output line asking the check's name to list the rule. The name now reads "greater than 0 and gives at most 100 ticks" while also enforcing a minimum (CR-003). The conflict is flagged for the Product Owner in the record. |
| DEL-002 | Reasonable | The 1e-12 edge is pinned by a test, as the Known Hazard asked. The claim that no disagreement appears at a count of two or fewer rests on probing and is asserted over a finite grid in the test; the "1.5 million ranges" figure in the test comment was not reproduced. |

## Findings

### CR-001: Specification `@spec Coverage` row for NLC-REQ-004 does not list the annotated function

**Severity:** Issue
**Location:** `.gener8v/specifications/number-lines-and-coordinate-graphs.md` (`## @spec Coverage`, row NLC-REQ-004); `src/core/definitions/axis.ts`:axisChecks
**Traces To:** NLC-REQ-004; Code Review step 8 (the table must list the same locations); TICKET-007 Known Hazards (specification needs a new requirement)
**Description:** `axisChecks` now carries `@spec NLC-REQ-004, NLC-REQ-008, NLC-REQ-009`. The coverage table lists `axisChecks` only for NLC-REQ-008 and NLC-REQ-009. The ticket and record also state the specification has no requirement for the lower bound itself.
**Impact:** `grep @spec` and the table disagree; the new rule has no requirement of its own, so it traces only to the Product Owner decision of 2026-10-26.
**Recommendation:** Through the Specification skill, add a requirement for the lower bound (at least two ticks for a supplied spacing, code `too_few_ticks`) and update the coverage table, adding `axisChecks` to the NLC-REQ-004 row or moving the annotation to the new requirement. Not a code change.
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-11-02): the NLC-REQ-004 coverage row lists `src/core/definitions/axis.ts`:axisChecks, axisSpacingIssues; the lower bound's own requirement is added through the Specification skill (Product Owner approval).

---

### CR-002: Delivery record names `axisSpacingIssues` for the annotation, which sits on `axisChecks`

**Severity:** Observation
**Location:** `.gener8v/changes/graph-library/delivery/number-lines-and-coordinate-graphs-ticket-007-delivery.md` (`## @spec Annotations`); `src/core/definitions/axis.ts` lines near `axisChecks`
**Traces To:** NLC-REQ-004, NLC-REQ-008, NLC-REQ-009
**Description:** The record's annotation table gives `axisSpacingIssues` as the location. The `@spec` line is on `axisChecks`, the public wrapper; `axisSpacingIssues`, where the rule is implemented, has none. The Files Produced entry says the same of `axisSpacingIssues`.
**Impact:** Minor. The annotation is one call away from the logic, and the record is slightly inaccurate.
**Recommendation:** Correct the record's table to `axisChecks`, or also annotate `axisSpacingIssues`. Fix any amendment in the delivery record's Post-Review Amendments.
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-11-02): the delivery record's amendment corrects where the `@spec` line sits (`axisChecks`).

---

### CR-003: Check name no longer describes the rule, and one test asserts a 50 ms wall-clock bound

**Severity:** Observation
**Location:** `src/core/definitions/axis.ts`:axisDomainChecks (name string); `tests/core/axis.test.ts` "counts a huge or tiny spacing arithmetically, in constant time"
**Traces To:** TICKET-007 Output (check description lists the rule); criterion 5; DEL-001
**Description:** The check name "the <axis> tick spacing is greater than 0 and gives at most 100 ticks" omits the minimum; this follows DEL-001 and is accepted there. Separately, the constant-time test asserts `performance.now() - started < 50`, which can fail on a loaded machine without the code being slower, while the other assertions already prove the result for `2e9` and `1e-300`.
**Impact:** The name is a documentation gap only. The timing bound is a latent flake source in CI.
**Recommendation:** When `src/generated/vocabulary.json` is next regenerated for another reason, update the name to include the minimum. Consider replacing the wall-clock bound with a call-count or loosening it considerably, as other tests in the suite do for work-growth checks.
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-11-02; also quality QR-001, QR-003): the check name and the `tickSpacing` description state "at least 2 and at most 100 ticks", and `src/generated/*` is regenerated (superseding DEL-001); the 50 ms wall-clock assertions are work counts (`drawableTicks` calls through a pass-through mock).

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Fixed | coverage row; requirement via Specification | `.gener8v/specifications/number-lines-and-coordinate-graphs.md` |
| CR-002 | Fixed | record corrected | delivery record |
| CR-003 | Fixed | minimum described; work counts | `src/core/definitions/axis.ts`, `src/generated/*`, `tests/core/axis.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 — three fixed (Engineer — Thomas Eaves, 2026-11-02)
