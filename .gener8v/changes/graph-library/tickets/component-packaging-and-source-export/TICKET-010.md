# TICKET-010: Make the time-dependent checks deterministic on CI

**Change:** graph-library
**Capability Area:** Component Packaging & Source Export (component-packaging-and-source-export)
**Specification:** specifications/component-packaging-and-source-export.md

**Summary:** Make the benchmarks, wall-clock assertions and coverage counters that fail on a slow or loaded machine pass or fail for a reason in the code. Today CI on `main` fails 8 of the last 10 pushes and never on a wrong result.
**Priority:** Must
**Value:** A red CI run on `main` means a real regression again, so the checks that verify the Must NFRs can be trusted and the release workflow (TICKET-009) can depend on them.

**Requirements Covered:**
- NLC-NFR-008: Rendering a maximum-length ruler with an object takes ≤ 50 ms at p95 in a server render on a CI runner — verified by a rendering benchmark (its check must not fail on run count alone)
- NLC-NFR-004: A graph with 100 ticks per axis and 50 points renders in ≤ 50 ms at p95 on a CI runner — verified by a rendering benchmark (same benchmark helper)
- GSV-NFR-001: Validating a single description takes ≤ 5 ms at p95 in Node.js on a CI runner — verified by a benchmark (same benchmark helper)
- CPSE-REQ-018: A component should never throw because its description is invalid (its layout-cost tests in `tests/react/Graph.test.tsx`)

**Prior Art:**
- Read: `tests/helpers/bench.ts` — `expectP95`: asserts `samples.length >= minSamples` (default 100) as well as the p95, so a slow runner that completes fewer runs in the time window fails though the p95 is far within its limit.
- Read: `tests/layout/ruler.bench.ts` — `.run({ time: 500, warmupTime: 100 })`: the 30 cm cases ("texts as words", "texts as one cluster") complete 97 to 99 runs on GitHub runners (CI run 41210682222: p95 8.76 ms against 50 ms). Compare `tests/layout/nlc-render.bench.ts` (`iterations: 200, warmupIterations: 20`) and `tests/core/validate.bench.ts` (`time: 300`).
- Read: `tests/layout/kit/text.test.ts:143` "stops early, so caller-sized text costs little" — `performance.now()` around `wrap` of 2,000,000 characters, `< 1_000` ms; failed at 1,008 to 1,358 ms under load.
- Read: `tests/react/Graph.test.tsx:1002` and `:1016` — the x,y and x,y,z "costliest labels within a second and a half" tests, `< 1_500` ms; failed at 2,024 to 4,002 ms under load.
- Read: `tests/layout/nlc-accuracy.property.test.ts:243` — `expect(covered.withGuides).toBeGreaterThan(RUNS / 4)` with `RUNS = 200` and no seed: the generator's own rate sits near the threshold (49 of 200 seen).
- Read: `.github/workflows/ci.yml` — the `check` job (Node 22/24 × React 18/19) runs `pnpm test` and `pnpm bench`; `.gener8v/changes/graph-library/delivery/component-packaging-and-source-export-ticket-004-delivery.md` Post-Review Amendments (CR-001) — the failure history.

**Acceptance Criteria:**
- [ ] No benchmark fails on its run count alone: each benchmark collects at least its minimum sample count by iterations (as `nlc-render.bench.ts` does), or the minimum is enforced by running until it is reached, so `expectP95` fails only on the p95. NLC-NFR-008, NLC-NFR-004 and GSV-NFR-001 keep their limits (50 ms, 50 ms, 5 ms at p95) — verified by `pnpm bench`.
- [ ] The "stops early" check proves the early stop without wall-clock time: it counts the work `wrap` does (for example, characters or words examined, through a test hook or by comparing with a text a fixed factor longer), so it fails if `wrap` reads the whole caller text and passes on any machine — verified by a mutant that removes the early stop.
- [ ] The two layout-cost tests in `tests/react/Graph.test.tsx` likewise bound the work, not the wall-clock time (for example, label-placement attempts against a fixed budget), or move to a benchmark with a p95 limit; a mutant that removes the cost cap fails them.
- [ ] The x,y,z coverage counter in `tests/layout/nlc-accuracy.property.test.ts` is deterministic: a fixed seed, or a threshold well below the generator's measured rate (state the rate in a comment).
- [ ] A search of `tests/` for `performance.now()` and `Date.now()` in assertions, and for unseeded coverage thresholds, finds no other check of this kind left unaddressed, or the delivery record lists each one it leaves and why.
- [ ] The full suite and `pnpm bench` pass 5 times in a row under load locally (record the load average), and CI on `main` is green after the push (record the run).

**Output:**
- `tests/helpers/bench.ts` and the three `*.bench.ts` files — sample counts by iterations
- `tests/layout/kit/text.test.ts`, `tests/react/Graph.test.tsx` — work-bounded checks (with any test-only hook they need in `src/layout/kit/text.ts` or the label placer, documented)
- `tests/layout/nlc-accuracy.property.test.ts` — the deterministic counter
- Test evidence: the mutants named in the criteria, and the CI run

**Constraints:** prd/OC-004 (the CI matrix must stay React 18/19 × Node 22/24; do not drop a cell to make it green)

**Known Hazards:**
- Do NOT raise the time limits or lower the NFR targets to make CI pass; the NFRs are Must and their limits are the Product Owner's. Fix how the checks measure, not what they require.
- Do NOT mark the checks `retry` or `skip` on CI; a retried flake still hides a real slowdown.
- `GRAPH_GENERATOR_PREBUILT=1` and `tests/setup/build.ts`: the suite builds `dist/` unless it is set; benches run with it set in CI.
- A test-only hook in `src/` must not reach the published bundle: check `pnpm check:dist`, `pnpm size` and `tests/package/per-type-bundle.test.ts` after adding one.

**Depends On:** TICKET-004
**Blocks:** None

**Size:** Medium

**Notes:** Found while recording CPSE TICKET-004's CI run (code review CR-001). Every failure in runs since GSS TICKET-003 is one of these checks.
