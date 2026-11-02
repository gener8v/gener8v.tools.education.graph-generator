# TICKET-010: Make the time-dependent checks deterministic on CI — Security Review

## Summary

This review covers the delivery of `graph-library/component-packaging-and-source-export/TICKET-010` at commit `1a1d538` on branch `ticket/graph-library-cpse-010`. The `security-reviewer` agent ran the findings phase in a fresh context on 2026-10-31.

The delivery changes tests only. Nothing under `src/` changed (`git show --stat 1a1d538`), and the lockfile and `package.json` are unchanged. What it does:
- **Benchmarks:** the three benchmarks now run by iterations alone.
- **Timing assertions:** three wall-clock assertions that guarded earlier denial-of-service fixes, plus one linear-time check, become work counts. They use pass-through `vi.mock` wrappers and counting Proxies.
- **Coverage thresholds:** these are re-derived, and three property runs get fixed seeds.
- **`.gitignore`:** now ignores `.claude/settings.local.json`.

The review focused on one question: does each converted check still fail when the guard it protects is removed? It was answered with mutants run against a scratch copy of the repository. The repository itself was not modified.

**Results:**
- **The guards themselves are still caught.** This covers the `wrap` early stop (GSS TICKET-002 SEC-001), the placement candidate set and obstacle growth (CPSE TICKET-002 SEC-004, NLC TICKET-003 SEC-003), and the value-count and list-limit order in the validator (GSV TICKET-003 SEC-001). Several of these mutants fail the converted checks; the rest fail the line-count assertions those checks keep.
- **The counts only see the functions they instrument.** A regression elsewhere passes:
  - **Label placement:** a 30× more costly overlap test passes both layout-cost tests. With it, `createGraph` on the 67 KB adversarial x,y description takes 10–12 s instead of 0.4–0.6 s (SEC-001).
  - **1 MB hostile check:** element reads of an over-limit list by ordinary access pass it (SEC-002).
- **No seed hides a hostile input.** The seeds touch an accuracy property and two coverage checks; the schema-validator agreement properties stay unseeded.
- **The `.gitignore` change is sound.**
- **The dependency audit shows only the `minimatch` advisory** already accepted under CPSE TICKET-004 SEC-002.

**Reviewer:** `security-reviewer` agent, fresh context (findings phase only, 2026-10-31)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/component-packaging-and-source-export-ticket-010-delivery.md` (DEL-001..003, no Post-Review Amendments yet)

**Files Reviewed:**
- `tests/react/Graph.test.tsx` (the `vi.mock` of `src/layout/kit/labels`, `placementCalls`, `overBudget`, and the two layout-cost tests at `:1077` and `:1096`)
- `tests/core/validate-structure.test.ts` (the `createIssue` mock, `countingReads`, and the 1 MB hostile check at `:447`)
- `tests/layout/kit/text.test.ts` (the `forEachCodePoint` mock, `work`, the linear-time check at `:129` and "stops early" at `:170`)
- `tests/core/schema-agreement.test.ts` (`RARE_SEED`, `agreement`)
- `tests/layout/nlc-accuracy.property.test.ts` (`XYZ_SEED`, `check`)
- `tests/layout/data-graph-accuracy.test.ts`, `tests/core/data-graph-text-alternative.test.ts` (thresholds and comments)
- `tests/core/validate.bench.ts`, `tests/layout/ruler.bench.ts`, `tests/layout/nlc-render.bench.ts`, `tests/helpers/bench.ts`
- `.gitignore`

**Code read for the guards the checks protect (unchanged by this delivery):**
- `src/layout/kit/text.ts` (`wrap`, `drawnWord`, `clusters`, `rawWidth`)
- `src/core/format.ts` (`forEachCodePoint`)
- `src/layout/kit/labels.ts` (`overlaps`, `placeLabel`, `placeElementLabel`)
- `src/layout/xy-graph.ts` (`elementLabels`)
- `src/core/validate/json.ts` (`readObject`, `readList`)
- `src/core/validate/envelope.ts`
- `src/core/validate/structure.ts` (`count`, `checkMap`, the `array` case)
- `src/core/validate/index.ts`
- `node_modules/.pnpm/tinybench@6.2.0/node_modules/tinybench/dist/index.js:1147` (the run loop, to confirm what `time: 0` does)

**Context read:**
- `.gener8v/changes/graph-library/tickets/component-packaging-and-source-export/TICKET-010.md`
- `.gener8v/constraints/prd.md` (CC-001..CC-004, OC-004)
- `.gener8v/technical-design/system-design.md` (AD-010)
- `.gener8v/context.md`
- The findings these checks guard:
  - `geometric-shapes-and-solids-ticket-002-security-review.md` SEC-001
  - `component-packaging-and-source-export-ticket-002-security-review.md` SEC-004 (Accepted Risk)
  - `number-lines-and-coordinate-graphs-ticket-003-security-review.md` SEC-003 (resolved with "adversarial timing test at 1.5 s")
  - `component-packaging-and-source-export-ticket-004-security-review.md` SEC-002

**Verification run by the reviewer (2026-10-31; logs in the session scratchpad `sr10/`):**

Mutants ran on a scratch copy of the repository at `1a1d538`, which had its own `node_modules` directory of links. Every mutated file was restored from the repository and confirmed byte-identical with `cmp`. Load averages were 4.0 to 7.1.

| Command / mutant | Exit | Result |
|---------|------|--------|
| `pnpm audit` (pnpm 10.28.2, 2026-10-31 15:49 UTC) | 1 | 1 moderate: GHSA-g3hv-75wg-m249, `minimatch` <11.0.1, path `.>eslint>minimatch`. This is the accepted CPSE TICKET-004 SEC-002 |
| `pnpm audit --prod` | 0 | No known vulnerabilities found |
| `vitest run` on the seven changed test files (scratch copy identical to `src/`, `tests/`) | 0 | 217 passed |
| Baseline: the two layout-cost tests | 0 | 720 ms and 815 ms |
| **P1:** `overlaps` repeats its test 30 times (`src/layout/kit/labels.ts:68`) | 0 | **Both layout-cost tests pass**, in 10,040 ms and 17,403 ms |
| P1 probe: `createGraph` with `NODE_ENV=production`, 3 runs | — | x,y 66,921 B: 604 / 426 / 415 ms → 10,198 / 12,162 / 10,055 ms; x,y,z 32,127 B: 567 / 560 / 550 ms → 16,424 / 15,865 / 15,589 ms |
| **P3:** `LABEL_ROWS = 4` in `src/layout/xy-graph.ts:32` (24 candidates per point label) | 1 | The x,y test fails on the candidate sequence. Caught |
| **P4:** `placeLabel` scans the obstacles twice for every candidate | 1 | Both tests fail: 124 and 70 sampled calls over budget. Caught |
| **W1 / W2:** the early stop removed from `wrap`'s word loop or cluster loop | 1 / 1 | "Stops early" fails, on its 4-line assertion. Caught |
| **W3:** one extra whole-text `rawWidth(text)` pass at the top of `wrap` | 1 | "Stops early" passes (pass counts unchanged); the linear-time check fails by 1 code unit. A linear extra pass, not a guard regression |
| **V1:** `readList(value)` before the `maxItems` check (`src/core/validate/structure.ts:189`) | 1 | Fails: 500,000 reads, limit 0. Caught |
| **V2:** `for (const element of value)` before the `maxItems` check | 0 | **Passes**: the Proxy counts only descriptor reads (SEC-002) |
| **V3:** `count(walk, …)` moved after the key loop in `checkMap` | 1 | Fails: 60,000 issues. Caught |

## Security Assessment

### Input Validation

**Status:** Gaps Found
**Notes:** No entry point changed: the package's validator, layouts and components are as they were. This section therefore assesses whether the tests that pin the earlier input-cost guards still pin them.

- **`wrap` early stop (GSS TICKET-002 SEC-001):** "Stops early" (`tests/layout/kit/text.test.ts:170`) compares `forEachCodePoint` calls on 20,000 and 2,000,000 characters and keeps `toHaveLength(4)`.
  - Removing either early stop fails it (W1, W2), and so does measuring every word (delivery record).
  - The guard SEC-001 needed was bounded lines, and that is asserted directly.
  - One extra linear pass over the whole text passes (W3). This is acceptable: `wrap` is internal, and caller text reaches it at no more than `CALLER_TEXT_LIMIT` (200) characters (`src/core/definitions/shared.ts:31`).
  - The linear-time check (`:129`) bounds the code units `forEachCodePoint` reads, at most 5× the text and doubling with the text. A quadratic regression in measuring is caught. Quadratic string work that does not go through `forEachCodePoint` would not be; the 2,000 ms bound it replaced would have caught it. The same instrumented-primitive limit applies in SEC-001, where it does matter.
- **Placement cost (CPSE TICKET-002 SEC-004, NLC TICKET-003 SEC-003):** the two layout-cost tests (`tests/react/Graph.test.tsx:1077`, `:1096`) assert three things:
  - each label's exact candidate count (8 or 12);
  - obstacles growing by exactly one per label;
  - on every tenth call, obstacle reads at most candidates × obstacles.

  A costlier candidate set (P3) or a repeated obstacle scan (P4) fails them. That is what NLC SEC-003's recommendation asked the bound to show. The per-call budget is tight: 124 of the roughly 170 sampled calls went over it when scans doubled. What they no longer bound is the cost of each overlap test, or any work outside `placeLabel` (SEC-001).
- **1 MB hostile description (GSV TICKET-003 SEC-001):** the check (`tests/core/validate-structure.test.ts:447`) asserts:
  - exactly one `createIssue` call;
  - descriptor reads at most the key count for the 60,000-key object;
  - zero descriptor reads of the 500,000-element list.

  This matches how the validator reads: every read goes through `Object.getOwnPropertyDescriptor` (`src/core/validate/json.ts:37`, `:61`). Value-count order (V3) and list-limit order via `readList` (V1) are caught. A read of the list by ordinary access is not (SEC-002).
- **Mock side effects on hostile-input tests:** none. Each `vi.mock` wrapper calls the real function with the same arguments. The `labels` wrapper calls the real function directly unless `placement.counting` is set. `record` rethrows through `try`/`finally`, and the counting Proxy defines only a `get` trap, so writes, `push` included, reach the real array. The other hostile-input tests in the three mocked files run against the real code: 217 passed in the changed files.
- **Seeding:** no seed narrows a hostile-input case.
  - `XYZ_SEED` (`tests/layout/nlc-accuracy.property.test.ts:39`) seeds the x,y,z drawn-to-scale accuracy property, which is not a hostile-input check.
  - `RARE_SEED` (`tests/core/schema-agreement.test.ts:84`) seeds only the negative control and the check that the generator reaches list lengths 1,000 and 1,001. A fixed seed guarantees that boundary is exercised on every run.
  - The per-type schema-validator agreement property is still unseeded. It is the security-relevant check: the validator may be stricter than the schema, never looser.
  - The lowered thresholds (`ten or more categories` RUNS/10 → RUNS/12, `across with written values` RUNS/20 → RUNS/25) measure accuracy coverage only.
- **Benchmarks:** at tinybench 6.2.0's run loop (`dist/index.js:1147`), `time: 0` disables the time cap, so a run is exactly `iterations` (200) long. The p95 limits are unchanged, and `expectP95` still requires 100 samples. A slower renderer still fails on its p95. None of the three benchmarks times an adversarial description: `nlc-render.bench.ts` uses 100 ticks and 50 points.

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** A client-side rendering library with no accounts, sessions or network calls (`.gener8v/context.md`). The delivery adds no runtime code.

### Data Protection

**Status:** Adequate
**Notes:** No data is collected, transmitted or stored (CC-003). The tests hold no credentials or personal data, only synthetic descriptions and seeds. The `.gitignore` addition keeps `.claude/settings.local.json`, a developer's personal tool permissions, out of commits. `git log --all -- .claude/settings.local.json` is empty, so it was never committed, and `git check-ignore` confirms the new rule matches.

### Configuration Security

**Status:** Adequate
**Notes:** No CI workflow, package manifest, lockfile or build configuration changed. Neither does the published-file set: `dist/` is byte-identical per the delivery record, and `src/` is unchanged per `git show --stat`. The CI matrix (prd/OC-004) is untouched. No secret is hardcoded in any changed file.

**Dependencies:**
- `pnpm audit` at 2026-10-31 15:49 UTC reports the single moderate `minimatch` advisory, GHSA-g3hv-75wg-m249, through `eslint`. That advisory is the accepted risk CPSE TICKET-004 SEC-002 (dev-only, vulnerable path not reached). The lockfile is unchanged by this delivery, so it is not re-raised here.
- `pnpm audit --prod`: no known vulnerabilities.

**Cryptography:** not applicable. The `20_261_031` seeds are fast-check test seeds and have no security purpose.
**Logging:** not applicable. The tests log nothing sensitive: `expectP95` prints timings only.
**Compliance (CC-001..CC-004):** no constraint is affected. There is no runtime dependency, asset or copied code (CC-001); nothing rendered changes (CC-002); no data handling (CC-003); no images (CC-004).

## Findings

### SEC-001: The layout-cost tests no longer bound the adversarial description's cost; a 20-fold slowdown passes them

**Severity:** Low
**Category:** Input Validation
**OWASP Reference:** N/A. Related to CWE-407 (inefficient algorithmic complexity), as a regression-detection gap rather than a present vulnerability.
**Location:**
- `tests/react/Graph.test.tsx:1077` and `:1096`: the two layout-cost tests, now counting placement calls, candidates, obstacles and sampled obstacle reads.
- `tests/react/Graph.test.tsx:59-110`: the counting wrapper sees only `placeLabel` and `placeElementLabel`, and only reads of the obstacle array.
- `src/layout/kit/labels.ts:68-70` (`overlaps`) and `:35-66` (`segmentCrossesBox`): the per-test cost, which nothing now bounds.
- `tests/layout/nlc-render.bench.ts`: the only render benchmark, at 100 ticks and 50 points, not the adversarial case.

**Description:**
The accepted risk CPSE TICKET-002 SEC-004 (quadratic `placeLabel`, Security — Thomas, 2026-10-07) was accepted on its measured cost: about 94 ms at a realistic 2,500 labels. NLC TICKET-003 SEC-003 then measured the adversarial x,y description at 0.4–0.5 s. It was resolved by "an adversarial timing test … bounded at 1.5 s". That test was the control keeping the realised cost near the figures the risk was accepted on.

This delivery replaces the time bound with work counts. The counts pin the shape of the work: candidates per label, one more obstacle per label, and at most candidates × obstacles reads per sampled call. Regressions in that shape are caught (mutants P3, P4).

The counts do not see how much each overlap test costs, or any work the layout does outside the placer. Mutant P1 makes `overlaps` repeat its test 30 times, and both tests still pass, in 10.0 s and 17.4 s against the 30 s timeout. A production-mode probe of the same mutant puts `createGraph` at 10.1–12.2 s on the 66,921-byte x,y description, where it was 0.42–0.60 s, and at 15.6–16.4 s on the 32,127-byte x,y,z one, where it was 0.55–0.57 s. Plausible regressions of this kind would also pass:
- an allocating or iterative overlap test, such as curved obstacles or finer clipping;
- a per-label scan over the Scene in `elementLabels`;
- a heavier `textBlock` per label.

No test or benchmark now times an adversarial description. CI would stay green while the accepted risk's basis grew by an order of magnitude.

**Attack Scenario:**
- **Precondition:** a later change makes each overlap test, or the layout around the placer, about 20× slower. The converted tests stay green (as P1 shows), and the change ships.
- **Attacker:** anyone who can submit a graph description to a consumer that server-renders user-supplied x,y or x,y,z graphs. Examples are an authoring tool's shared-lesson page, or a model-tool endpoint (`.gener8v/context.md`).
- **Steps:** the attacker posts the 67 KB stacked-points description, which the validator accepts.
- **Result:** each view blocks the server's event loop for 10–16 s instead of about 0.5 s. A handful of requests per minute keeps a Node.js render worker saturated.

**Impact:** No present vulnerability: the shipped placer still runs at 0.4–0.6 s on this input. The impact is that a future regression in the largest per-render cost in the package would no longer be detected. The CPSE TICKET-002 SEC-004 acceptance would then rest on figures nothing checks.
**Recommendation:**
1. Add the two adversarial descriptions from the layout-cost tests as a benchmark in `pnpm bench`, run by iterations as the others now are. The ticket offered this route: "or move to a benchmark with a p95 limit". For example, use `time: 0, iterations: 20`. Set `minSamples` to 20 and a limit of about 1.5 s, the bound NLC SEC-003 was resolved on. This keeps one wall-clock bound on the adversarial case, measured over many runs rather than one sample.
2. Keep the work counts: they pin the cost cap's shape deterministically, and the benchmark covers the constant factor.
3. If a benchmark is not wanted, a single-shot ceiling far above load noise still catches an order-of-magnitude regression without flaking. The largest loaded run seen was 4 s, so a 10 s ceiling would do. Record the choice against NLC TICKET-003 SEC-003.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed under graph-library/component-packaging-and-source-export-ticket-010-code-review/CR-001 (approved by Engineer — Thomas Eaves, 2026-10-31): `tests/layout/hostile-cost.bench.ts` times the two adversarial descriptions at the 1,500 ms bound NLC TICKET-003 SEC-003 was resolved on, and `wrap`'s caller-sized text at its old bounds, in the isolated bench step by iterations; the 30×-slower overlap mutant fails both layout benches. Residual recorded there: `wrap` splitting its text 40× stays within the old limits.

---

### SEC-002: The 1 MB hostile check counts only descriptor reads, so an over-limit list read by ordinary access passes

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** N/A. Related to CWE-770 (allocation of resources without limits) as a test-precision gap.
**Location:**
- `tests/core/validate-structure.test.ts:33-43` (`countingReads`): the Proxy traps only `getOwnPropertyDescriptor`.
- `tests/core/validate-structure.test.ts:448-449`: the comment says "a list over its limit is never read".
- `src/core/validate/structure.ts:181-192`: the `array` case. `length` is read, then the list is checked against `maxItems`, before `readList`.

**Description:**
The check's claim is that "a list over its limit is never read". The Proxy only proves the list is never read through descriptors. That matches the validator today, since every read goes through `src/core/validate/json.ts`, and it catches a `readList` before the limit (mutant V1).

Mutant V2 adds `for (const element of value) …` before the `maxItems` check. That reads all 500,000 elements through the `get` trap, which is not counted, and the check passes. Element reads that produce issues would still be caught by the `createIssue` count, and a getter-running read is caught separately (`:256`, "without running getters"). So the uncaught case is a linear scan with no side effect.

**Attack Scenario:** N/A (Informational)
**Impact:** Small. An uncaught regression costs one linear pass over a list the caller already built, a few milliseconds for 500,000 numbers. The test comment overstates what is proven, and a later reader may rely on it.
**Recommendation:** Count ordinary element reads too, as the label-placer Proxy in `tests/react/Graph.test.tsx` does. Add a `get` trap that counts integer-index keys, and a `has` trap: `Array.prototype` methods call `HasProperty` before `Get`. Assert the list count stays 0. Or narrow the comment to "never read through its descriptors".
**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-11-02): `countingReads` in `tests/core/validate-structure.test.ts` also counts `get` and `in` reads of any string key but `length`. Mutant: a loop over the list before the `maxItems` check → 500,000 reads against a budget of 0, failing the hostile check (and the sparse-list test).

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Fixed | hostile-input bench (code review CR-001) | No | `tests/layout/hostile-cost.bench.ts`, `tests/fixtures/costly-inputs.ts` |
| SEC-002 | Fixed | `get` and `has` counted | No | `tests/core/validate-structure.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:** Both findings fixed in resolution and re-verified. The `minimatch` advisory in `pnpm audit` remains the accepted risk of CPSE TICKET-004 SEC-002.
