# component-packaging-and-source-export/TICKET-010: Make the time-dependent checks deterministic on CI — Quality Review

## Summary

Reviewed the test-only delivery (no `src/` change) that replaces wall-clock assertions with work counts (pass-through `vi.mock` wrappers and counting Proxies), runs the three benchmarks by iterations, and sets coverage thresholds at 5-sigma margins or from fixed seeds. The code is sound, the counting is well documented at the point of use and the mutants recorded in the delivery record show the tests bite. The remaining findings are maintainability points: one fragile Proxy heuristic, the 5-sigma derivation living only in the delivery record, and small duplication. 1 Concern, 5 Suggestions, no Critical.

**Files Reviewed:**
- tests/helpers/bench.ts
- tests/core/validate.bench.ts
- tests/layout/ruler.bench.ts
- tests/layout/nlc-render.bench.ts
- tests/layout/kit/text.test.ts
- tests/react/Graph.test.tsx
- tests/core/validate-structure.test.ts
- tests/layout/nlc-accuracy.property.test.ts
- tests/layout/data-graph-accuracy.test.ts
- tests/core/data-graph-text-alternative.test.ts
- tests/core/schema-agreement.test.ts

**Findings:** 6
**Critical:** 0 | **Concerns:** 1 | **Suggestions:** 5

## Quality Assessment

### Code Organization

**Rating:** Adequate
**Notes:** Each counting hook sits at the top of the one file that uses it, next to a comment saying what it counts and why. Three different counter idioms now exist (`reading`/`work()` in text.test.ts, `made` in validate-structure.test.ts, `placement`/`placementCalls()` in Graph.test.tsx) with similar shape but no shared helper (QR-005). Bench options are repeated literally in three files (QR-004).

### Readability

**Rating:** Adequate
**Notes:** The comments explain the why well ("Counted, not timed", the accepted quadratic cost, the CPSE TICKET-010 pointer). The weak spots are the Proxy in `record()` that recognises an element read by testing the first character of the key (QR-001), and the dense rate prose in the coverage comments (QR-002). The x,y cost test compares two 1,700-element arrays, which would be unreadable on failure (QR-003).

### Error Handling

**Rating:** Strong
**Notes:** The counters fail loudly on drift: `passes > 0`, `counted.some(reads > 0)`, `counted.length >= floor(calls/10)` and `once.codeUnits > text.length` stop a refactor that bypasses the mocked function from turning the checks into vacuous passes. The `try/finally` in `placementCalls` and `record` restores state on a throw.

### Test Coverage

**Rating:** Strong
**Notes:** Executed in this review (load average about 6 to 9):
- `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache --maxWorkers=4` on the seven changed test files: exit 0, 7 files, 217 tests passed, 3.8 s. The converted tests take 254 ms (linear time), 294 ms (stops early), 660 ms and 747 ms (the two layout-cost tests) with the verbose reporter, far inside the 30 s timeout the delivery record worried about.
- `npx eslint tests`: no output (clean). `npx tsc --noEmit`: no output (clean).
- Benchmarks were not re-run; the delivery record's `pnpm bench` evidence (20 passed, 200 samples each) is the implementer's, not reproduced here.
The assertions test behaviour (bounded work) rather than elapsed time; the mutation table in the delivery record shows each converted test fails when its guarantee is removed.

### Observability & Operability

**Rating:** Adequate
**Notes:** Benchmarks still print `requirement name: p95 X ms over N runs` on every run, so the CI log records measurements. The counted tests report offenders by call index (`call 12: 40 reads of 31 obstacles`), which is actionable. The sampled tests do not print their observed counts on success, so a drifting margin is invisible until it fails (included in QR-002).

## Findings

### QR-001: Element reads are counted by testing the first character of a Proxy key

**Category:** Maintainability
**Severity:** Concern
**Location:** `tests/react/Graph.test.tsx:70-76` (`record`)
**Description:** The sampled calls count "obstacles read" through a Proxy whose `get` trap increments when `key.charCodeAt(0)` is between 48 and 57. This works as a proxy for array-index access but is unexplained in the code (the doc comment says only "reads its obstacles through a view that counts each one read"), uses unnamed magic numbers, and conflates every digit-leading key with an element read. Calls such as `.filter`, `.some`, `.slice` or spread read indices through the same trap, so the count also depends on how `placeLabel` iterates (`for` versus an array method versus `length` caching). The budget "reads <= candidates x obstacles" is therefore tied to the placer's loop shape, not just its cost.
**Impact:** A harmless refactor of `placeLabel` (for example `candidates.some(...)` that reads each obstacle twice per candidate) fails these tests with a message that does not say why; an author will not know whether the budget or the heuristic is wrong. The budget's slack (reads allowed up to candidates x obstacles, exactly the accepted cost) is also unstated in the code.
**Recommendation:** Extract `isIndex(key)` with a one-line comment ("array indices are the only digit-leading keys the placer reads"), name 48/57 or use `/^\d+$/`, and state in the `overBudget` comment what one "read" corresponds to in `placeLabel` (one overlap test per obstacle per candidate) and that `length` and method lookups are deliberately not counted.
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-11-02): `isIndex(key)` (`/^\d+$/`) in `tests/react/Graph.test.tsx`; the `overBudget` comment says one read is one overlap test of one obstacle for one candidate.

---

### QR-002: The 5-sigma method and the measured rates live in the delivery record and in dense comments, not in one place the next person can reuse

**Category:** Maintainability
**Severity:** Suggestion
**Location:** `tests/core/data-graph-text-alternative.test.ts:156-161`, `tests/layout/data-graph-accuracy.test.ts:220-225,266-272`, `tests/layout/nlc-accuracy.property.test.ts:32-39`, `tests/core/schema-agreement.test.ts:24-30,195-197`
**Description:** The rule (threshold <= RUNS*p - 5*sqrt(RUNS*p*(1-p)), p measured over >= 10x RUNS samples) is written down only in DEL-002 of the delivery record. The test files give the measured rates and a few worked examples ("65 expected, 27 five deviations below"; "none in 500 about 1 in 10^16") but never the formula, and the same preamble ("Each threshold is at least five standard deviations below...") is repeated in four files in slightly different words. The thresholds themselves are bare divisors (`RUNS / 12`, `RUNS / 25`) with no per-line link to the rate they come from, and the "(none in 500 about 1 in 10^28)" remarks are cryptic. The measurements are dated but there is no script or command to re-measure when a generator changes. Tests that pass do not print their observed counts, so margin erosion is invisible.
**Impact:** When someone changes an arbitrary (adds a field, widens a range) the stated rates become wrong silently, and the next flaky threshold will be fixed by lowering the divisor again without the method. The reasoning is recoverable only from `.gener8v/`, which is not shipped with the code.
**Recommendation:** Put the formula once in `tests/helpers/` (a short comment, or a small `fiveSigmaFloor(runs, rate)` helper whose result the tests compare against, with the rate as the argument so the number is derived from a stated rate) and point the four files at it. Keep the dated measurement notes, but say how to re-measure (for example "run the suite's `covered` tally over 15,000 samples"). Optionally log the observed counts, as `expectP95` does.
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-11-02): `tests/helpers/sampling.ts` holds `fiveSigmaFloor(runs, rate)` and `expectCovered(count, threshold, runs, rate)`, which asserts the threshold is at or below the floor of its stated rate before checking the count; every threshold in the four suites goes through it, unchanged.

---

### QR-003: The x,y cost test compares two arrays of about 1,700 objects, and the x,y,z test leans on an unexplained constant

**Category:** Readability
**Severity:** Suggestion
**Location:** `tests/react/Graph.test.tsx:1087-1091` and `1107-1111`
**Description:** `expect(calls.map(...)).toEqual(calls.map((_, i) => ...))` states the exact expected sequence. When it fails, Vitest prints a diff of up to 1,700 `{candidates, obstacles}` objects; the first differing call is hard to find. In the x,y,z test, `expect(first).toBeGreaterThan(4 * points.length)` uses `4` for "three guide lines and a marker per point" with no tie to the comment two lines above, and `calls.slice(-points.length)` assumes the point labels are the last 1,000 calls.
**Impact:** A failure of the cost bound is the case these tests exist for, and its message should name the first call that broke the rule. As written the reader must diff by eye.
**Recommendation:** Report the first mismatch only, as `overBudget` already does (for example find the first index where the pair differs and put it in an `expect(..., message)`), and name the constant (`const GUIDES_AND_MARKERS_PER_POINT = 4` or compute `3 + points.length`).
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-11-02): `firstMismatch` reports only the first differing call; `GUIDES_AND_MARKER_PER_POINT` names the x,y,z constant.

---

### QR-004: The fixed-iteration bench options and their comment are copied into three files

**Category:** DRY
**Severity:** Suggestion
**Location:** `tests/core/validate.bench.ts`, `tests/layout/ruler.bench.ts`, `tests/layout/nlc-render.bench.ts`, `tests/helpers/bench.ts`
**Description:** The same two-line comment ("Run by iterations alone (`time: 0`): exactly 200 timed runs...") and the same `time: 0, iterations: 200` literals appear in all three benches, while the reason (`tinybench` runs while `elapsed < time || samples < iterations`) and the `minSamples = 100` rule are in `bench.ts`. `bench.ts` documents `minSamples` as failing "only on a misconfigured run" but nothing links the 200 in the benches to the 100 there.
**Impact:** A fourth benchmark will copy one of them or forget `time: 0` (the trap this ticket fixed); changing the sample count means editing three files.
**Recommendation:** Export `FIXED_RUNS = { time: 0, iterations: 200 } as const` (with the tinybench explanation) from `tests/helpers/bench.ts` and spread it into each `.run({ ...FIXED_RUNS, warmupTime: ... })`; keep one comment there.
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-11-02): `fixedRuns(n)` in `tests/helpers/bench.ts` with the tinybench explanation once; all four bench files use it (200, or 21 for the hostile-input bench).

---

### QR-005: Three hand-rolled counters with different reset and scope conventions

**Category:** Patterns
**Severity:** Suggestion
**Location:** `tests/layout/kit/text.test.ts:8-25`, `tests/core/validate-structure.test.ts:19-30`, `tests/react/Graph.test.tsx:45-118`
**Description:** Each file hoists a mutable object, mocks an internal module with a pass-through, and resets differently: `work()` zeroes and snapshots, `made.issues = 0` is reset by hand inside the loop, `placementCalls()` toggles a `counting` flag and replaces the array. The text.test.ts mock counts always (every test in the file runs through it), validate-structure's counts every issue in the file, Graph.test.tsx's is gated by a flag. `vi.mock` is file-wide, so all three also slow or alter every other test in their file.
**Impact:** Modest: the idiom is consistent in spirit and each is local and documented. But a fourth counter will pick a fourth convention, and the file-wide effect of `vi.mock` is stated nowhere. The counted tests are also coupled to internal function names (`forEachCodePoint`, `createIssue`, `placeLabel`); the `> 0` guards make a rename fail loudly, which is good.
**Recommendation:** Either add a short note to each hook that the mock applies to the whole file and is inert outside the counted section, or extract a small `tests/helpers/counting.ts` (counter with `reset`, `measure(run)`) used by all three. Not worth doing for three sites unless a fourth appears.
**Status:** Resolved
**Resolution:** Dismissed (approved by Engineer — Thomas Eaves, 2026-11-02): three counters, below the extraction threshold the finding names.

---

### QR-006: Seeds are bare constants whose effect cannot be seen from the test

**Category:** Maintainability
**Severity:** Suggestion
**Location:** `tests/layout/nlc-accuracy.property.test.ts:38` (`XYZ_SEED`), `tests/core/schema-agreement.test.ts:30` (`RARE_SEED`)
**Description:** Both seeds are the same literal (`20_261_031`, the date), defined twice. The x,y,z comment says the seed gives "64 of 200" guide-line samples, but the test only asserts `> RUNS / 4` (50), so the claim is not checked; a change to the arbitrary, to fast-check, or to the property body (the seed then reaches different samples) can move the count anywhere, silently re-introducing the flake the seed removes, with the threshold again at the generator's own rate. The schema-agreement seed likewise guarantees rare samples only for the current generator.
**Impact:** Seeding trades a rare random failure for a deterministic one-off that appears after an unrelated change, with a failure message that does not say the seed is the cause.
**Recommendation:** Add to each seed's comment "re-pick the seed (any value giving >= N) if the arbitrary changes", and have the x,y,z test's assertion message mention the seed (`expect(covered.withGuides, "from XYZ_SEED; see there").toBeGreaterThan(...)`). Optionally use one shared date-seed constant.
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-11-02): each seed's comment says how to re-pick it, and the assertion messages name the seed.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fixed | `isIndex`; read defined | `tests/react/Graph.test.tsx` |
| QR-002 | Fixed | `fiveSigmaFloor`, `expectCovered` | `tests/helpers/sampling.ts`, the four suites |
| QR-003 | Fixed | first mismatch; named constant | `tests/react/Graph.test.tsx` |
| QR-004 | Fixed | `fixedRuns(n)` | `tests/helpers/bench.ts`, four bench files |
| QR-005 | Dismissed | — | — |
| QR-006 | Fixed | seed comments and messages | `tests/layout/nlc-accuracy.property.test.ts`, `tests/core/schema-agreement.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 — five fixed, one dismissed (Engineer — Thomas Eaves, 2026-11-02)
