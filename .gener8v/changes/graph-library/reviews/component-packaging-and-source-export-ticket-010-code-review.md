# TICKET-010: Make the time-dependent checks deterministic on CI — Code Review

## Summary

Reviewed the test-only delivery (three benches, the text-kit and layout-cost checks, `validate-structure`, and the coverage thresholds in four property suites; no `src/` change) at commit 1a1d538. The benches keep their limits and take exactly 200 samples. Every 5σ threshold I recomputed holds. The work counts are weaker than the wall-clock checks they replace: they count only what passes through the mocked seams, and I built mutants that regress real cost without failing them. CI on `main` is not yet recorded green. 5 findings: 0 Critical, 2 Issues, 3 Observations.

**Delivery Record:** `.gener8v/changes/graph-library/delivery/component-packaging-and-source-export-ticket-010-delivery.md`
**Files Reviewed:**
- `tests/core/validate.bench.ts`
- `tests/layout/ruler.bench.ts`
- `tests/layout/nlc-render.bench.ts`
- `tests/helpers/bench.ts`
- `tests/layout/kit/text.test.ts`
- `tests/react/Graph.test.tsx`
- `tests/core/validate-structure.test.ts`
- `tests/layout/nlc-accuracy.property.test.ts`
- `tests/layout/data-graph-accuracy.test.ts`
- `tests/core/data-graph-text-alternative.test.ts`
- `tests/core/schema-agreement.test.ts`
- `src/layout/kit/text.ts` and `src/layout/kit/labels.ts` (read for what the counts can see; unchanged)

**Findings:** 5
**Critical:** 0 | **Issues:** 2 | **Observations:** 3

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| No benchmark fails on run count alone; NFR limits unchanged (50, 50, 5 ms) | Yes | The three benches now use `time: 0, iterations: 200` (`tests/core/validate.bench.ts:31`, `tests/layout/ruler.bench.ts:41`, `tests/layout/nlc-render.bench.ts:49`). `expectP95` is unchanged in its p95 assertion and `limitMs` values (`tests/helpers/bench.ts`). My `vitest bench` run: all benches passed, "over 200 runs" each (p95 0.02 to 7.3 ms). |
| "Stops early" proves the early stop without wall-clock time; a mutant removing the early stop fails it | Partial | `tests/layout/kit/text.test.ts:170-181` counts `forEachCodePoint` passes (equal for 20,000 and 2,000,000 characters). This catches a missing early stop in the many-words case. It is blind to cost outside `forEachCodePoint`, and for the single-word case it bounds no reads (CR-001). |
| The two layout-cost tests bound work, not time; a cost-cap mutant fails them | Partial | `tests/react/Graph.test.tsx:1077-1112`: exact candidate and obstacle counts per call, plus a sampled read bound. A cap mutant fails them. A cost mutant that scans a copy of the obstacles passes the x,y,z test (CR-001). |
| The x,y,z coverage counter is deterministic | Yes | `tests/layout/nlc-accuracy.property.test.ts:39` (`XYZ_SEED`) and `:250`. The seed also fixes the property's samples (CR-003). |
| No other time-dependent check left unaddressed (search of `tests/`) | Yes | My grep finds `performance.now()` only in the five assertions the record lists at 83× to 250× margins (`tests/core/axis.test.ts:96`, `categories.test.ts:352`, `pictograph.test.ts:161`, `validate-structure.test.ts:253`, `:615`). `Date.now()` has no hits. All four coverage-threshold files carry stated rates, and no other counter has the same form. |
| Full suite and `pnpm bench` pass 5 times in a row under load, and CI on `main` is green after the push (run recorded) | Partial | One full run passes: 81 files, 2,341 tests, with typecheck and ESLint clean on the changed files; benches pass. The record states the 5-run loops and load averages, and I did not repeat them. The CI run is, by the record's own admission, unverified (CR-002). |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| NLC-NFR-008 | Max-length ruler with an object, ≤ 50 ms at p95 | `tests/layout/ruler.bench.ts` (p95 1.2 to 5.9 ms over 200 runs in my run) | Yes |
| NLC-NFR-004 | 100 ticks per axis and 50 points, ≤ 50 ms at p95 | `tests/layout/nlc-render.bench.ts` (p95 7.3 ms over 200 runs) | Yes |
| GSV-NFR-001 | One description validates in ≤ 5 ms at p95 | `tests/core/validate.bench.ts` (p95 0.02 to 0.08 ms over 200 runs) | Yes |
| CPSE-REQ-018 | A component never throws because its description is invalid (layout-cost tests) | `tests/react/Graph.test.tsx:1077`, `:1100` | Partial: the layout-cost guard is weaker than the wall-clock one it replaces (CR-001) |

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/OC-004 | CI matrix stays React 18/19 × Node 22/24 | Yes | No `.github/` change in `git diff 47a889d 1a1d538`. |
| Ticket hazard: do not raise limits or lower targets | Limits 50/50/5 ms | Yes | Unchanged in the three benches. The five retained wall-clock assertions keep their original limits. |
| Ticket hazard: no `retry`/`skip` | — | Yes | None added; I found no `retry` or `skip` in the diff. |
| Ticket hazard: no test hook reaching the bundle | — | Yes | No `src/` change in the diff, so nothing can reach the bundle. |

### Architecture Decision Adherence

Technical design was not consulted for this test-only ticket; no AD-XXX is named by it. Architecture adherence is not verified beyond noting that `src/` is untouched.

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| NLC-NFR-004, NLC-NFR-008, GSV-NFR-001 | existing `@spec` lines in the bench files | the three bench files | Yes (unchanged) |
| CPSE-REQ-018 | none required (test) | `tests/react/Graph.test.tsx` | N/A |

**Coverage:** 3 of 3 annotated requirements unchanged; the test-only requirement needs none.
**Missing:** None.
**Specification table:** Yes. The verification locations did not move, and the `@spec Coverage` rows for NLC-NFR-004, NLC-NFR-008 and GSV-NFR-001 still name the bench files (`.gener8v/specifications/number-lines-and-coordinate-graphs.md:243,247`; `.gener8v/specifications/graph-specification-and-vocabulary.md:231`).

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `npx vitest run --no-cache` (as `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache --maxWorkers=4`) | 0 (2,341 passed) | Yes |
| `pnpm bench` (as `vitest bench --run --reporter=verbose`) | 0 (all benches, 200 samples each) | Yes |
| `pnpm typecheck` | 0 | Yes |
| `pnpm lint` (as `eslint` on the changed test files) | 0 | Yes (full lint not re-run) |
| `pnpm build`, `check:*`, `size`, `publint`, `attw`, `audit` | not re-run (instructed not to rebuild `dist/`) | Not checked; the record shows `dist/` byte-identical and no `src/` change in the diff |
| The 5-run loops and mutation checks | not repeated; I ran my own mutants in a scratch copy | See CR-001 |

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Questionable | Keeping `src/` untouched honors the bundle hazard. The price is that only calls crossing a mocked module boundary are counted. Internal calls and other primitives (`split`, regexes, `slice`, `join`) are invisible (CR-001). |
| DEL-002 | Reasonable | I recomputed every thresholded rate from the stated rates, RUNS (200 or 500) and the 5σ rule (binomial standard deviation √(n·p·(1−p))); all stated expected values and floors check out (for example 0.11 × 500 = 57 expected and 21 five deviations below, against a threshold of 20). The `>0` thresholds are valid at the stated miss odds (0.963^500 ≈ 1 in 165 million). Seeds are applied only where 5σ leaves too little. See CR-003 and CR-004 for side effects. |
| DEL-003 | Reasonable | The margins are credible. The five kept assertions are 83× to 250× from their limits. The two converted ones were at 2.3× and 3.7×. |

## Findings

### CR-001: The work counts can pass while real cost regresses

**Severity:** Issue
**Location:** `tests/layout/kit/text.test.ts:130-141`, `:170-181`; `tests/react/Graph.test.tsx:45-118`, `:1077-1112`; `tests/core/validate-structure.test.ts:447-466`
**Traces To:** Acceptance criteria 2 and 3 (bound the work so a mutant fails); CPSE-REQ-018; Known Hazard "fix how the checks measure, not what they require"
**Description:** Each count sees only the calls that cross one mocked seam, and I confirmed the gaps in a scratch copy (`/private/tmp/claude-501/-Users-thomas-Repositories-gener8v-gener8v-tools-education-graph-generator/90a37181-7c56-4f53-87c3-a87caf6952a9/scratchpad/cr10/`; the real `src/` and `tests/` were never touched).
1. `wrap`: repeating `text.split(BREAKING_SPACE).filter(...)` 40 times passes all 32 tests in `text.test.ts`. A 40× whole-text cost never shows in the `forEachCodePoint` pass count. The old 1,000 ms wall-clock check would have flagged it.
2. `wrap`, one unbroken word: the "@" case only asserts equal pass counts. Calling `drawnWord(written)` 21 times on the 2,000,000-character word passes "stops early"; only the separate linear-time test caught that mutant. "Stops early" bounds no code units for a single long word, which the test comment itself says is read whole.
3. Label placement: a `placeLabel` that scans a `slice()` copy of the obstacles 5 extra times (about 6× the cost) fails the x,y test, but only incidentally, because `slice()` itself reads every obstacle through the counting Proxy. The x,y,z test passes it. That test has headroom: sampled reads reach only 0.59 of the candidates × obstacles bound, and 52% in aggregate (2.83M against 5.44M reads), so about 1.7× per call is invisible. The x,y test is tighter (maximum 0.93).
4. The read count is made through a Proxy over the obstacles array. The cost of `overlaps` itself, and any layout work between `placeLabel` calls that does not pass through `placeLabel` or `placeElementLabel`, is unmeasured. The `toEqual` on candidates and obstacles per call does pin the call count and candidate cap.
Conversely, mutants the record reports (double candidate checks, 24 candidates, rereading lines) are caught, and I did not find a hole in them.
**Impact:** The checks still protect against the failure they were written for (no cap or early stop at all). They no longer protect against a constant-factor or off-seam cost regression, which is what the wall-clock checks caught. CPSE-REQ-018's cost guard is weaker than the ticket's Value claims.
**Recommendation:** Tighten what is cheap to tighten, and record the remaining limit in the delivery record:
- Bound `reads` at the measured worst case with a small margin (for example, the x,y,z `overBudget` bound close to 0.7 × candidates × obstacles).
- Assert a code-unit bound for the single-word "stops early" case.
- Add one sentence to DEL-001 stating that counts cover only the primitives the mocks see.
If a stronger guard on the wall-time class is wanted, add a p95 benchmark for the 1,000-label layout alongside the other benches; the ticket allows "move to a benchmark with a p95 limit".
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-10-31; also closes security review SEC-001). New `tests/layout/hostile-cost.bench.ts` in `pnpm bench`, by iterations (21 samples, so one stray run cannot set the p95): `createGraph` of the costly x,y and x,y,z descriptions (1,500 ms, the bound NLC TICKET-003 SEC-003 was resolved on), `wrap` of 2,000,000 characters cut to 4 lines, words and one word (1,000 ms, GSS TICKET-002 SEC-001), and `wrap` of the long text (2,000 ms, prd/TC-011). Inputs shared with the tests through `tests/fixtures/costly-inputs.ts`. Measured p95s under load: x,y 454–503 ms, x,y,z 574–864 ms, one word 235–575 ms (the thinnest margin, about 1.7×). Mutant: every overlap test 30× slower → both layout benches fail. Residual: `wrap` splitting its text 40× stays within the old limits (604 ms against 1,000) and is caught by neither the counts nor the bench; recorded, not tightened.

---

### CR-002: CI on `main` green is not yet recorded

**Severity:** Issue
**Location:** `.gener8v/changes/graph-library/delivery/component-packaging-and-source-export-ticket-010-delivery.md` (Acceptance Criteria Verification, last line)
**Traces To:** Acceptance criterion 6 ("CI on `main` is green after the push (record the run)"); ticket Value
**Description:** The criterion has two halves. The local five-run loops are recorded (not independently repeated here). The CI half is marked "Unverified until pushed", and the record's own checklist ticks the criterion above it as a whole. The ticket's Value is "a red CI run on `main` means a real regression again", and only a green run across the Node 22/24 × React 18/19 matrix shows that.
**Impact:** The ticket could be closed with CI still red for the reason it was cut.
**Recommendation:** After the push, record the CI run (id, matrix result) in `## Post-Review Amendments` before the ticket is treated as complete.
**Status:** Resolved
**Resolution:** Accepted, verified after the push (approved by Engineer — Thomas Eaves, 2026-10-31): the CI run on `main` is watched and recorded in the delivery record's Post-Review Amendments.

---

### CR-003: The seed fixes the whole x,y,z accuracy property, not only its coverage count

**Severity:** Observation
**Location:** `tests/layout/nlc-accuracy.property.test.ts:39`, `:250`
**Traces To:** Acceptance criterion 4; NLC-NFR-001
**Description:** `check(xyzGraphArb, expectXyzDrawnToScale, XYZ_SEED)` seeds the property that verifies x,y,z drawing to scale. That property now runs the same 200 descriptions on every run, so it no longer explores new ones. The deterministic `withGuides` count (64) is also tied to the generator and fast-check version, so changing either can trip it with no code defect.
**Impact:** Lower defect-finding power for NLC-NFR-001's x,y,z property; a possible spurious failure after a generator change. The ticket accepts "a fixed seed", so this is not a defect.
**Recommendation:** Optionally keep the property unseeded and assert the guide-line coverage in a separate seeded sampling check (`fc.sample` with a seed), or note the trade-off in the comment at `:32`.
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-10-31): the x,y,z accuracy property runs unseeded again; guides coverage is a separate test over `fc.sample(xyzGraphArb, { seed: XYZ_SEED, numRuns: 200 })` (more than 50; 64 at a measured rate of 0.337). The two schema-agreement `RARE_SEED` checks stay seeded: finding the rare sample is their whole assertion.

---

### CR-004: Benchmarks now take their p95 over a very short window

**Severity:** Observation
**Location:** `tests/core/validate.bench.ts:31`
**Traces To:** GSV-NFR-001; NLC-NFR-004; NLC-NFR-008
**Description:** With `time: 0, iterations: 200`, the validator benches take their 200 samples in about 10 ms of timed work (each case finished in about 60 ms, including warm-up). The old `time: 300` collected far more samples. The limits are unchanged and measured p95 is 0.02 to 0.08 ms against 5 ms, so the benches still catch an order-of-magnitude regression but are statistically thin as a p95 estimate. Separately, about 35 unseeded coverage thresholds at roughly one chance in 3.5 million each add up to about 10^-5 per full run; each `>0` threshold is rarer than that.
**Impact:** Negligible today, because of the large margins; it would matter only if a limit were ever tightened.
**Recommendation:** None required. If the limits tighten, raise `iterations` for `validate.bench.ts`.
**Status:** Resolved
**Resolution:** Accepted (approved by Engineer — Thomas Eaves, 2026-10-31): 200-sample p95 windows hold at current margins, and about 35 unseeded 5σ thresholds together fail by chance roughly once in 100,000 runs.

---

### CR-005: A retained test title still says "quickly" after the timing was removed

**Severity:** Observation
**Location:** `tests/core/validate-structure.test.ts:447`
**Traces To:** Acceptance criterion 5 (traceable, honest check names)
**Description:** The test `answers a 1 MB hostile description quickly, with a bounded issue list` now asserts counted work (one issue made, one read per key, an over-limit list never read) and no longer times anything. Its title still claims speed. The same pattern is milder in the other renamed tests, which were retitled correctly.
**Impact:** A misleading name; none on behavior.
**Recommendation:** Rename to "answers a 1 MB hostile description with bounded work and a bounded issue list".
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-10-31): the title is now "answers a 1 MB hostile description with bounded work and a bounded issue list".

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Fixed | hostile-input bench; shared costly inputs | `tests/layout/hostile-cost.bench.ts`, `tests/fixtures/costly-inputs.ts`, `tests/react/Graph.test.tsx`, `tests/layout/kit/text.test.ts`, `tests/helpers/bench.ts` |
| CR-002 | Accepted | CI checked after push | — |
| CR-003 | Fixed | property unseeded; seeded guides sample | `tests/layout/nlc-accuracy.property.test.ts` |
| CR-004 | Accepted | — | — |
| CR-005 | Fixed | title renamed | `tests/core/validate-structure.test.ts` |

## Verdict

**Result:** Approved with Notes
**Unresolved Findings:** 0 — three fixed, two accepted (Engineer — Thomas Eaves, 2026-10-31)
**Notes:** CR-002's CI run is recorded after the push. CR-001 leaves one residual: a `wrap` that splits its text many times over stays within the old time limits.
