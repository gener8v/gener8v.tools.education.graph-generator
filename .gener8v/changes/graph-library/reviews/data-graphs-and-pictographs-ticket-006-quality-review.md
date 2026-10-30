# TICKET-006: Accuracy and text-alternative checks — Quality Review

## Summary

Reviewed the four test-only files of data-graphs-and-pictographs TICKET-006: two fast-check fixtures and two property suites (500 runs per type, plus the shipped examples). The work is well organized and well explained, follows the neighbouring NLC accuracy suite closely, and keeps its expected positions independent of the drawn axes. One Concern (the bars-across accuracy check leaves two terms out of every sample) and three Suggestions (a text-alternative oracle that restates `describe`, helper duplication, a restated rounding rule). Findings: 4, none Critical.

**Files Reviewed:**
- tests/fixtures/data-graphs.ts
- tests/fixtures/data-graph-reference.ts
- tests/layout/data-graph-accuracy.test.ts
- tests/core/data-graph-text-alternative.test.ts
- (neighbours) tests/layout/nlc-accuracy.property.test.ts, tests/fixtures/nlc-generators.ts, tests/fixtures/nlc-reference.ts, tests/fixtures/scene-readers.ts

**Findings:** 4
**Critical:** 0 | **Concerns:** 1 | **Suggestions:** 3

## Quality Assessment

### Code Organization

**Rating:** Strong
**Notes:** Generators, independent reference and the two suites are split the way the NLC work splits them (`nlc-generators` / `nlc-reference` / property test). Shared Scene readers come from `tests/fixtures/scene-readers.ts` rather than being rewritten. The extra reference file is justified in the delivery record (DEL-002). Dependency direction is tests to src only.

### Readability

**Rating:** Strong
**Notes:** Header comments state the requirement, the method and the CR-001 lesson. Names are descriptive (`horizontalBarsReferenced`, `holds`, `entriesOf`); failure messages carry the full description. `lineGraphArb` is a long nested chain/record but is documented and readable. The `tally` and string-keyed coverage counters are typed loosely (`[feature: string]: number`), so a misspelt key reads as `undefined` in the `expect` and fails only with an unhelpful message.

### Error Handling

**Rating:** Strong
**Notes:** Invalid generated descriptions throw with the validator's issues; every assertion names the offending description; fast-check supplies the counterexample. No swallowed errors.

### Test Coverage

**Rating:** Adequate
**Notes:** Executed in this review: `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache tests/layout/data-graph-accuracy.test.ts tests/core/data-graph-text-alternative.test.ts` exit 0, 2 files / 10 tests passed (log in scratchpad quality-review/v.log); `npx eslint` on the four files exit 0, no output; `npx tsc --noEmit -p .` no output (pass). Coverage counters prove the generators vary what they claim. The delivery record's mutation checks (restored) show the properties can fail. Gaps are in QR-001 and QR-002: the accuracy check never covers bars across with a category-axis label or written values, and the text-alternative oracle restates the production sentence format. The full suite was not re-run here (timing tests are load-sensitive).

### Observability & Operability

**Rating:** Adequate
**Notes:** Not applicable to production behaviour (test-only). Failure output is the relevant surface and is good: description plus the offending entry and the full text alternative.

## Findings

### QR-001: Accuracy check for bars across excludes the category-axis label and written values from every sample

**Category:** Testing
**Severity:** Concern
**Location:** `tests/layout/data-graph-accuracy.test.ts` (generated bar-graph test, the `across` filter); `tests/fixtures/data-graph-reference.ts:horizontalBarsReferenced`
**Description:** For `orientation: "horizontal"`, the sample is stripped of `categoryAxisLabel` and `showValues` before the layout runs, because the reference cannot restate how those terms move the plot edges (DEL-003). DGP-NFR-001 says every bar length within 0.5 px; bars across with a category-axis label or written values, which are ordinary configurations, are therefore never checked, and a bug in how those terms shift or shrink the axis would pass. The coverage counters for "written values" and "a category-axis label" are satisfied by upright samples only, which hides this.
**Impact:** A real part of the NFR's domain is unverified while the report presents it as covered.
**Recommendation:** Add a bounded check for the excluded cases that does not need the exact plot edges, for example a relative check (bar lengths proportional to values, ratio to the longest bar equal within tolerance, and the longest bar's length consistent with the drawn value axis length from the Scene's axis line), and state in the header comment that absolute length is checked only without those terms. Or record the narrowing explicitly in the spec Coverage row for DGP-NFR-001.
**Status:** Resolved
**Resolution:** Fixed by graph-library/data-graphs-and-pictographs-ticket-006-code-review/CR-001 (approved by Engineer — Thomas Eaves, 2026-10-30): bars across keep both terms and are checked by proportion and bounds; the residual (exact edges bounded, not restated) is in the delivery record.

---

### QR-002: The text-alternative oracle restates `describe`'s sentence format

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/core/data-graph-text-alternative.test.ts:entriesOf`
**Description:** `entriesOf` builds the expected entry as `“Name” is 3.5` / `“Name”: 3.5 units`, including the series-label fallback and the unit-shaped rule, i.e. the same wording and branching as `src/core/describe.ts`. DGP-NFR-003 only requires that every category name and value appear. A wording change that still names everything fails the test, and a shared mistake in both stays hidden. The delivery record calls this deliberate, and `holds` guards against "3" in "3.5".
**Impact:** Brittleness against harmless wording changes; modest, as wording changes are rare and the failure message is clear.
**Recommendation:** Keep the strict entry check for the examples, and have the property assert the weaker NFR directly: each `quoteText(name)` and the value text appear in order, with a boundary check, without the connecting phrase. Or note in the header that the test pins the sentence format on purpose.
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-10-30): the format is kept, because per-series scoping (code review CR-002) depends on it; the test's header now says it restates `describe`'s sentence format on purpose and changes with it.

---

### QR-003: `Coverage`, `check`, `tally` and `normalized` are re-implemented per suite

**Category:** DRY
**Severity:** Suggestion
**Location:** `tests/layout/data-graph-accuracy.test.ts` and `tests/core/data-graph-text-alternative.test.ts` (both define `Coverage` and `check`); also `tests/layout/nlc-accuracy.property.test.ts`
**Description:** The same "run N samples, count features, return counters" helper now exists three times with slightly different shapes (two here, one typed more narrowly in the NLC suite). `normalized` is likewise duplicated across property suites.
**Impact:** Small; a future change to run counts or counter semantics must be made in several places.
**Recommendation:** Move a generic `checkWithCoverage` and `normalized` to `tests/fixtures/` (for example beside `scene-readers.ts`) when the next property suite is added; not worth blocking this ticket.
**Status:** Resolved
**Resolution:** Dismissed (approved by Engineer — Thomas Eaves, 2026-10-30): a Suggestion; extracting now would change the NLC suite, outside this ticket. The next property suite should move a shared `checkWithCoverage` and `normalized` into `tests/fixtures/`.

---

### QR-004: The bar check restates the layout's rounding rule to decide which bars are drawn

**Category:** Maintainability
**Severity:** Suggestion
**Location:** `tests/layout/data-graph-accuracy.test.ts:checkBars` (`Math.round(expected.lengthOf(value) * 100) > 0`)
**Description:** Whether a bar exists is predicted by the layout's 0.01 rounding. If a bar is dropped wrongly near that threshold the reference predicts the same, and a change to the rounding in `src/` fails with an unrelated count mismatch. Values on the generator grid make real cases rare.
**Impact:** Low; mostly a clarity cost.
**Recommendation:** Name the threshold as a constant with a comment tying it to the layout, or drop only exact-zero values and assert near-zero bars separately.
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-10-30): the rule is the named `isDrawn`, with a comment tying it to the 0.01 drawing grid (AD-007); behaviour unchanged.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fixed | by code review CR-001 | `tests/layout/data-graph-accuracy.test.ts`, `tests/fixtures/data-graph-reference.ts` |
| QR-002 | Fixed | header states the pinned format | `tests/core/data-graph-text-alternative.test.ts` |
| QR-003 | Dismissed | noted for the next property suite | — |
| QR-004 | Fixed | named `isDrawn` | `tests/layout/data-graph-accuracy.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 — three fixed, one dismissed (Engineer — Thomas Eaves, 2026-10-30)
