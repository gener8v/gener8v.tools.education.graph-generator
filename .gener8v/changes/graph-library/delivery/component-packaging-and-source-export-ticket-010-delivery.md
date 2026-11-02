# TICKET-010: Make the time-dependent checks deterministic on CI — Delivery Record

## Ticket Reference

**Ticket:** graph-library/component-packaging-and-source-export/TICKET-010
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/component-packaging-and-source-export.md`
**Requirements Covered:**
- NLC-NFR-008: Maximum-length ruler with an object renders in ≤ 50 ms at p95 on a CI runner — verified by a rendering benchmark
- NLC-NFR-004: 100 ticks per axis and 50 points render in ≤ 50 ms at p95 on a CI runner — verified by a rendering benchmark
- GSV-NFR-001: One description validates in ≤ 5 ms at p95 in Node.js on a CI runner — verified by a benchmark
- CPSE-REQ-018: A component never throws because its description is invalid (its layout-cost tests)

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Predecessor TICKET-004 delivered | delivery record | Delivered, reviewed; `main` at `47a889d` | ✅ |
| `tests/helpers/bench.ts` `expectP95` with a minimum of 100 samples | present | present (`minSamples = 100`) | ✅ |
| Benchmarks and their run options | three files | `tests/core/validate.bench.ts` (`time: 300`), `tests/layout/ruler.bench.ts` (`time: 500, warmupTime: 100`), `tests/layout/nlc-render.bench.ts` (`time: 2000, iterations: 200`) | ✅ |
| How tinybench 6.2.0 stops a run | — | `time` and `iterations` are both caps: a run ends at whichever comes first (`dist/index.js:1147`), so a slow runner ends a 500 ms window short of 100 samples; with `time: 0` a run is exactly `iterations` long | ✅ — resolves the bench fix |
| Wall-clock assertions | the three named | ten in seven files: `tests/layout/kit/text.test.ts:112` (2,000 ms) and `:147` (1,000 ms, failed in CI); `tests/react/Graph.test.tsx:1013`, `:1026` (1,500 ms, failed in CI); `tests/core/axis.test.ts:96` (50 ms); `tests/core/pictograph.test.ts:161` (100 ms); `tests/core/categories.test.ts:352` (100 ms); `tests/core/validate-structure.test.ts:228` (100 ms), `:429` (250 ms), `:581` (50 ms) | ⚠️ Wider than the ticket's evidence — criterion 5 covers them |
| Coverage thresholds | the x,y,z counter | about 40 `toBeGreaterThan(RUNS / k)` thresholds in `tests/layout/nlc-accuracy.property.test.ts`, `tests/layout/data-graph-accuracy.test.ts`, `tests/core/data-graph-text-alternative.test.ts`, `tests/core/schema-agreement.test.ts`, all unseeded; `withGuides > RUNS/4` of 200 sits at the generator's own rate | ⚠️ Same class — criterion 5 |
| `.github/workflows/ci.yml` matrix | React 18/19 × Node 22/24 | present; `check` job runs `pnpm test` and `pnpm bench` | ✅ |
| `src/layout/kit/text.ts` `wrap` stops early | for the work-bounded rewrite | `wrap` splits the whole text, then stops placing words once `maxLines` lines exist | ✅ |
| Carried: TICKET-004 code review CR-001 (CI red on time-dependent checks) | this ticket | — | 🔁 Carried |

**Resolved from ground truth (not escalated):**
- *How to make a benchmark collect 100 samples.* Run by iterations alone (`time: 0`).

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-10-31
**Implemented by:** opus · high — routed as deliver-large from Tower

### Planned Files

- `tests/core/validate.bench.ts`, `tests/layout/ruler.bench.ts`, `tests/layout/nlc-render.bench.ts` (NLC-NFR-004, NLC-NFR-008, GSV-NFR-001): run by iterations alone (`time: 0`, `iterations: 200`, warm-up kept), so each takes exactly 200 samples; limits unchanged (50, 50, 5 ms). `tests/helpers/bench.ts` keeps its minimum-samples check, which now fails only on a misconfiguration.
- `tests/layout/kit/text.test.ts` "stops early": counts the words `wrap` measures — with `maxLines` it measures no more than a few lines' worth whatever the text length (2,000,000 characters against 20,000).
- `tests/react/Graph.test.tsx` x,y and x,y,z layout-cost tests (CPSE-REQ-018): count label-placement attempts against a fixed budget derived from the accepted cost (12 or 8 candidates against the obstacles placed so far), through a documented test-only counting hook or a pure attempt-count helper in the label placer; `pnpm check:dist`, `pnpm size` and `tests/package/per-type-bundle.test.ts` confirm nothing reaches the bundle.
- The other seven wall-clock assertions (`tests/core/axis.test.ts`, `pictograph.test.ts`, `categories.test.ts`, `validate-structure.test.ts` ×3, `tests/layout/kit/text.test.ts` linear-time): each measured under load; any with less than 5× margin converted the same way; the rest listed in this record with their measured margin.
- Coverage thresholds (`tests/layout/nlc-accuracy.property.test.ts`, `tests/layout/data-graph-accuracy.test.ts`, `tests/core/data-graph-text-alternative.test.ts`, `tests/core/schema-agreement.test.ts`): each at most its measured rate minus five standard deviations (failure chance about 1 in 3.5 million), the rate stated in a comment; where that leaves too little to prove coverage (`withGuides`), the suite runs from a fixed seed.
- `.gener8v/specifications/*`: `@spec Coverage` rows where the verification location changes.

### How Acceptance Criteria Will Be Met

- No benchmark fails on run count — `pnpm bench` by iterations.
- Work-bounded "stops early" and layout-cost checks — mutants removing the early stop and the placement cost cap fail them.
- Deterministic x,y,z counter and the other thresholds — 5σ margins or fixed seeds.
- No time-dependent check left unaddressed — the search's results converted or listed with margins.
- Five full-suite and bench runs in a row under load (load average recorded); CI on `main` green after the push (run recorded).

## Progress

- [x] Benchmarks by iterations
- [x] "stops early" by words measured
- [x] Layout-cost tests by placement attempts (hook or helper)
- [x] The other seven wall-clock assertions measured; converted or listed
- [x] Coverage thresholds at 5σ margins or seeded
- [x] `@spec Coverage` rows

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `tests/core/validate.bench.ts`, `tests/layout/ruler.bench.ts`, `tests/layout/nlc-render.bench.ts`: run by iterations alone (`time: 0`, `iterations: 200`), warm-up and limits unchanged; every benchmark takes exactly 200 samples. `tests/helpers/bench.ts`: the minimum-samples check is documented as failing only on a misconfigured run.
- `tests/layout/kit/text.test.ts`: "stops early" counts `wrap`'s measuring passes (2,000,000 characters take the same number as 20,000: 54 for words, 59 for one long word); the linear-time check bounds the code units read (at most 5× the text, measured 3.14×; twice the text at most twice the reads).
- `tests/react/Graph.test.tsx` (CPSE-REQ-018): the x,y and x,y,z layout-cost tests bound each label to at most 8 (segments) or 12 (points) candidates, the obstacle count growing by one per label, and each sampled call's overlap tests within candidates × obstacles so far.
- `tests/core/validate-structure.test.ts`: the 1 MB hostile check bounds work (exactly one issue created; each key read at most once; the over-limit list never read).
- `tests/layout/data-graph-accuracy.test.ts`, `tests/core/data-graph-text-alternative.test.ts`, `tests/core/schema-agreement.test.ts`, `tests/layout/nlc-accuracy.property.test.ts`: every coverage threshold at most its measured rate minus five standard deviations, the rate in a comment; three lowered; the x,y,z `withGuides` property and two rare schema-agreement checks run from fixed seeds.
- No `src/` change: the counting is done in the tests through pass-through `vi.mock` wrappers (`forEachCodePoint`, `placeLabel`/`placeElementLabel`, `createIssue`) and counting Proxies. All 50 `dist/` files byte-identical before and after.

## Verification Run

Run in the main session on 2026-10-31, after the code was written; logs kept per command.

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm generate` / `pnpm lint` / `pnpm typecheck` | 0 / 0 / 0 | — |
| `npx vitest run --no-cache` ×3 | 0, 0, 0 | 2,341 passed each (load average 8.7 rising to 16.7) |
| `pnpm bench` | 0 | 20 passed; 200 samples each |
| `pnpm build` / `check:dist` / `check:deps` / `check:images` / `check:changesets` / `size` / `publint` / `attw` | 0 each | sizes identical to before (`.` 50.88 kB) |
| `pnpm audit` / `pnpm audit --prod` | 1 / 0 | the `minimatch` advisory accepted under CPSE TICKET-004 security review SEC-002; production tree clean |
| Implementer's 5-run loops | 0 ×5 / 0 ×5 | full suite 2,341 passed ×5, `pnpm bench` ×5, load averages 4.7 to 23 |
| Mutation checks (each restored) | — | `wrap`'s early stop removed → 3 tests fail (main session); measuring every word, every cluster → "stops early" fails; `placeLabel` checking every candidate twice → both cost tests fail; 24 candidates per point → x,y,z fails; rereading lines → linear-time fails; value count after the key loop, list read before the maxItems check → hostile check fails |
| `gener8v-state.py state` / `lint` | 0 / 0 | 0 errors, 0 warnings |

## Acceptance Criteria Verification

- [x] No benchmark fails on run count alone; the NFR limits are unchanged — `pnpm bench` ×6, 200 samples each.
- [x] "Stops early" proves the early stop without wall-clock time — counting measuring passes; its mutants fail.
- [x] The two layout-cost tests bound the work — candidate and overlap counts; the cost-cap mutants fail.
- [x] The x,y,z coverage counter is deterministic — fixed seed (64 of 200 every run).
- [x] No other time-dependent check is left unaddressed — the seven other wall-clock assertions measured (margins below); two converted; every coverage threshold at a 5σ margin or seeded.
- [x] Five full-suite and bench runs in a row under load — load averages 4.7 to 23.
- Unverified until pushed: CI on `main` green (recorded in Post-Review Amendments after the push).

## Decisions Made

### DEL-001: Count work in the tests, not in `src/`

**Decision:** Pass-through `vi.mock` wrappers around the functions the code already calls, and counting Proxies on the inputs, count the work; nothing is added to `src/`, so nothing can reach the bundle (`dist/` byte-identical).

### DEL-002: Five-sigma thresholds, seeds where they prove too little

**Decision:** Each coverage threshold is at most RUNS·p − 5·√(RUNS·p·(1−p)) of its measured rate p (over ≥ 10× RUNS samples); where that floor is below what the check must prove, the property runs from a fixed seed. Two schema-agreement checks found flaky on measurement (about once in 2,500 and 9,000 runs) are seeded too.

### DEL-003: The seven other wall-clock assertions

| Assertion | Limit | Worst measured (loaded) | Margin | Action |
|---|---|---|---|---|
| `tests/core/axis.test.ts:96` | 50 ms | 0.27 ms | 185× | kept |
| `tests/core/categories.test.ts:352` | 100 ms | 0.45 ms | 222× | kept |
| `tests/core/pictograph.test.ts:161` | 100 ms | 0.51 ms | 196× | kept |
| `tests/core/validate-structure.test.ts:228` | 100 ms | 1.21 ms | 83× | kept |
| `tests/core/validate-structure.test.ts:581` | 50 ms | 0.20 ms | 250× | kept |
| `tests/core/validate-structure.test.ts:429` | 250 ms | 107 ms | 2.3× | converted to work counts |
| `tests/layout/kit/text.test.ts:112` | 2,000 ms | 536 ms | 3.7× | converted to work counts |

## Deviations from Plan

- Reconciliation said tinybench's `time` and `iterations` are both caps; in its sequential mode they are both minimums (`while (elapsed < time || samples < iterations)`), and the ruler benchmark stopped at 97 because its iteration minimum defaulted to 64. The fix (`time: 0`, `iterations: 200`) is the one planned.
- Layout-cost tests sample every tenth placement call's overlap count (counting every call took 2.1 to 2.5 s against the 30 s timeout under load).
- No hook or helper in `src/`: the counting is entirely in the tests (DEL-001).
- No `@spec Coverage` row changed: no verification location moved.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| NLC-NFR-004, NLC-NFR-008, GSV-NFR-001 | the three bench files | existing `@spec` lines unchanged |
| CPSE-REQ-018 | `tests/react/Graph.test.tsx` | (test) |

## Notes

- Closes the time-dependent failures behind CPSE TICKET-004 code review CR-001.

## Post-Review Amendments

### graph-library/component-packaging-and-source-export-ticket-010-code-review/CR-001 (with security SEC-001), CR-003, CR-005 (CR-002 and CR-004 accepted)

**Change:**
- CR-001 / SEC-001: the work counts see only the functions they wrap, so a slower operation passed them. `tests/layout/hostile-cost.bench.ts` times the hostile inputs in the isolated bench step, by iterations (21 samples): the costly x,y and x,y,z descriptions at 1,500 ms p95 (NLC TICKET-003 SEC-003), `wrap` cut to 4 lines at 1,000 ms (GSS TICKET-002 SEC-001), `wrap` of the long text at 2,000 ms (prd/TC-011). `tests/fixtures/costly-inputs.ts` builds the inputs for the tests and the bench alike. Residual: `wrap` splitting its text 40× stays within the old limits.
- CR-003: the x,y,z accuracy property is unseeded again; its guides coverage is a separate seeded sample.
- CR-005: a retained title renamed.
**Files:** `tests/layout/hostile-cost.bench.ts`, `tests/fixtures/costly-inputs.ts`, `tests/react/Graph.test.tsx`, `tests/layout/kit/text.test.ts`, `tests/helpers/bench.ts`, `tests/layout/nlc-accuracy.property.test.ts`, `tests/core/validate-structure.test.ts`
**Re-verification:** full verification loop with logs — all exit 0 except `pnpm audit` (the accepted `minimatch` advisory); vitest ×3, 2,342 passed each; `pnpm bench` 25 passed (load average 10 to 14). Mutants (each restored): every overlap test 30× slower → both layout benches fail; `wrap` split 40× → passes (the residual). gener8v-state lint 0 errors.

### graph-library/component-packaging-and-source-export-ticket-010-quality-review/QR-001..QR-004, QR-006 (QR-005 dismissed)

**Change:** `isIndex` and a defined "read" in the layout-cost counting (QR-001); `tests/helpers/sampling.ts` with `fiveSigmaFloor` and `expectCovered`, through which every coverage threshold is checked against its stated rate (QR-002); first-mismatch reporting and a named constant (QR-003); `fixedRuns(n)` shared by the bench files (QR-004); seed comments and messages (QR-006).
**Files:** `tests/helpers/sampling.ts`, `tests/helpers/bench.ts`, `tests/react/Graph.test.tsx`, the four coverage suites, the four bench files
**Re-verification:** full verification loop with logs — all exit 0 except `pnpm audit` (accepted); vitest ×3, 2,342 passed each; `pnpm bench` 25 passed (load average 6.6 to 12.8). Mutants: a stated rate lowered → `expectCovered` fails; the expected obstacle count broken → one first-mismatch failure; `isIndex` matching nothing → both cost tests fail. gener8v-state lint 0 errors.

### graph-library/component-packaging-and-source-export-ticket-010-security-review/SEC-002 (SEC-001 fixed under code review CR-001)

**Change:** `countingReads` counts `get` and `in` reads as well as descriptors (any string key but `length`), so the 1 MB hostile check sees any read of the over-limit list.
**Files:** `tests/core/validate-structure.test.ts`
**Re-verification:** full verification loop with logs — all exit 0 except `pnpm audit` (accepted); vitest ×3, 2,342 passed each; `pnpm bench` 25 passed. Mutant: a loop over the list before the `maxItems` check → the hostile check fails (500,000 reads against 0). gener8v-state lint 0 errors.
