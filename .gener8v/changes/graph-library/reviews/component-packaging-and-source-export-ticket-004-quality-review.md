# component-packaging-and-source-export TICKET-004: Cross-environment rendering, install and bundle-size checks — Quality Review

## Summary

Reviewed the Playwright hydration and cross-engine specs with their page bundle, the description generators, the pack-and-install smoke runner, the new CI jobs, the size-limit entry, the circle factory and the cube `normalsOf` fix with its tests. The work is well organised, clearly commented and consistent with neighbouring fixtures and package tests; every check I ran passed. Two Concerns (contributor docs, no direct test of the new generators) and four Suggestions; nothing blocks the ticket. Provisional verdict: Approved with Notes.

**Files Reviewed:**
- `playwright.config.ts`
- `tests/e2e/bundle.ts`, `tests/e2e/page-entry.ts`, `tests/e2e/page-api.ts`
- `tests/e2e/hydration.spec.ts`, `tests/e2e/cross-engine.spec.ts`
- `tests/fixtures/descriptions.ts` (against `tests/fixtures/data-graphs.ts`, `tests/fixtures/nlc-generators.ts`)
- `tests/smoke/run.ts`, `tests/smoke/render.mjs`, `tests/smoke/react18/package.json`, `tests/smoke/react19/package.json`
- `.github/workflows/ci.yml` (against the existing `check` job)
- `.size-limit.json`, `package.json`, `.gitignore`
- `src/core/definitions/circle.ts`, `tests/package/per-type-bundle.test.ts`, `tests/package/entries.test.ts`
- `src/layout/cube.ts`, `tests/layout/cube.test.ts`, `.changeset/cube-labels-same-in-every-engine.md`

**Findings:** 6
**Critical:** 0 | **Concerns:** 2 | **Suggestions:** 4

## Quality Assessment

### Code Organization

**Rating:** Strong
**Notes:** Clear split: `bundle.ts` (build, examples, page recording), `page-entry.ts`/`page-api.ts` (browser side and its typed contract), one spec per concern. Generators reuse the existing `data-graphs.ts` and `nlc-generators.ts` arbitraries and add only the missing six types. The smoke runner (orchestration) and `render.mjs` (consumer-side check) are separate, with the React templates holding only a `package.json`. The circle factory change mirrors how the other definitions are built.

### Readability

**Rating:** Strong
**Notes:** Names state intent (`mismatches`, `preparePage`, `firstDifference`, `parsedNodeMarkup`), header comments explain why each comparison exists and that it is never to be loosened. Failure messages include the first differing offset with context. Minor: an inline `import("@playwright/test").Page` type in `cross-engine.spec.ts` (QR-004).

### Error Handling

**Rating:** Adequate
**Notes:** Hydration reports React's recoverable, caught and uncaught errors, console errors and warnings, page errors and a hydration that never commits. The smoke check collects every failure and exits non-zero naming each. No timeout or retry on `npm install` against the live registry (QR-003).

### Test Coverage

**Rating:** Adequate
**Notes:** Commands run in this review (logs under the scratchpad `qr4/` directory): `pnpm lint` exit 0; `pnpm typecheck` exit 0; `pnpm test:e2e` exit 0, 36 passed in 6.3 s (Chromium and WebKit); `GRAPH_GENERATOR_PREBUILT=1 pnpm test:smoke` exit 0, React 18.3.1 and 19.3.0, 15 of 15 examples each; `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache --maxWorkers=4 tests/layout/cube.test.ts tests/package` exit 0, 197 passed. I did not repeat the full suite (known load-dependent timing flakes recorded in the delivery record). The e2e and smoke checks glob `examples/*.json` and the hydration spec fails on a type with no example. The cube regression test and the circle bundle assertions are targeted. Gaps: the generator module has no test of its own (QR-002); the cube regression covers one edge length and a +-1 ulp perturbation only (QR-005). The e2e React 18 cell and both new CI jobs are Unverified until pushed (acknowledged in the delivery record).

### Observability & Operability

**Rating:** Adequate
**Notes:** A cross-engine mismatch prints the case name, the description JSON and the first divergence, so it is reproducible. CI uses the `github` reporter. Nothing is logged by the package code (consistent with the library). The new CI jobs carry no uploaded artifacts (Playwright report/trace) for a failure seen only on GitHub (QR-006), and the smoke runner has no time limit on the network step (QR-003).

## Findings

### QR-001: New check commands and browser setup are not documented for contributors

**Category:** Maintainability
**Severity:** Concern
**Location:** `CONTRIBUTING.md:27-43`
**Description:** CONTRIBUTING lists every check command (`pnpm size`, `publint`, `attw`, `check:*`) but not `pnpm test:e2e`, `pnpm test:smoke`, or the one-off `pnpm exec playwright install chromium webkit` that `test:e2e` needs (WebKit was not installed on the delivering machine; a fresh contributor will hit Playwright's "browser not found" error). `GRAPH_GENERATOR_PREBUILT=1` for the smoke runner is also undocumented.
**Impact:** The two checks that gate CPSE-NFR-003/005 and TR-002 cannot be reproduced locally without reading the CI file; a cross-engine failure reported by CI is harder to debug.
**Recommendation:** Add `pnpm test:e2e` (with the browser install line) and `pnpm test:smoke` to the list of checks in `CONTRIBUTING.md`, beside the existing ones.
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-10-31): `CONTRIBUTING.md` lists `pnpm test:e2e` with the one-off `pnpm exec playwright install chromium webkit`, `pnpm test:smoke`, and `GRAPH_GENERATOR_PREBUILT=1`.

---

### QR-002: The description generators are exercised only through browser specs

**Category:** Testing
**Severity:** Concern
**Location:** `tests/fixtures/descriptions.ts` (whole module; consumed only by `tests/e2e/cross-engine.spec.ts`)
**Description:** 256 lines of generators for six new types, each wrapped in `valid()` (a `.filter` over `validate()`), have no vitest test. Only `pnpm test:e2e` ever samples them, and it needs the Playwright browsers. The neighbouring fixtures (`data-graphs.ts`, `nlc-generators.ts`) are consumed by the ordinary suite. Nothing in `pnpm test` fails if a definition change makes a generator reject most samples (slow or stalled `fc.sample`) or stop reaching a type; the exported per-type arbitraries (`circleArb` etc.) and `descriptionArb` are also unused outside this module.
**Impact:** A schema change to circle, square, triangle, cube, cylinder or ruler can degrade the cross-engine coverage, or break the e2e job, with no signal from the fast suite; the "(~240 descriptions of every type)" claim rests on one seed.
**Recommendation:** Add a small `tests/fixtures/descriptions.test.ts` (runs under vitest): each `DESCRIPTION_ARBS` entry yields N samples that `validate()` accepts without exhausting the filter, `sampleDescriptions(240, 20261030)` reaches every type, and the caller-text-at-the-limit samples appear. Or drop the unused exports.
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-10-31): `tests/fixtures/descriptions.test.ts` (vitest, 13 tests) checks each type's generator gives valid descriptions of its type, and that the cross-engine sample — its size and seed now shared as `CROSS_ENGINE_SAMPLE` — reaches every type and caller text at the limit, one-cluster text included.

---

### QR-003: Smoke runner has no time limit or retry on the registry install

**Category:** Error Handling
**Severity:** Suggestion
**Location:** `tests/smoke/run.ts:39-45`
**Description:** `npm install` from the live registry runs through `execFileSync` with no `timeout`, and a transient registry failure fails the whole `smoke` job the same way as a real packaging fault; the catch records only "npm install failed" (npm's own output is above it via `stdio: "inherit"`). `pnpm build` and `pnpm pack` failures throw an unhandled exception stack rather than the summary line.
**Impact:** A hung registry call holds a CI runner until the 15-minute job timeout; a flake and a defect look alike in the summary.
**Recommendation:** Pass a `timeout` (for example 120 s) to the `npm install` call, optionally retry it once, and include `error.message` in the failure line.
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-10-31): the smoke runner's registry install has a 120 s timeout and one retry; build, pack, install and render failures name their cause in the summary.

---

### QR-004: Inline import type in cross-engine spec

**Category:** Readability
**Severity:** Suggestion
**Location:** `tests/e2e/cross-engine.spec.ts:30`
**Description:** `mismatches(page: import("@playwright/test").Page, ...)` uses an inline import type although the file already imports from `@playwright/test`; `bundle.ts` uses `import type { Page }`.
**Impact:** Inconsistent with the neighbouring file and the repository's import style; trivial.
**Recommendation:** `import { type Page, expect, test } from "@playwright/test";` and use `Page`.
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-10-31): `import { type Page, … } from "@playwright/test"`.

---

### QR-005: Cube side-test tolerance is absolute and its regression test narrow

**Category:** Testing
**Severity:** Suggestion
**Location:** `src/layout/cube.ts:112-126` (`SIDE_TOLERANCE`, `normalsOf`); `tests/layout/cube.test.ts:296-319`
**Description:** `SIDE_TOLERANCE = 1e-6` is compared with a dot product of a unit normal and a vector in scene coordinates, so it is only "noise-sized" while the scene's scale stays as it is today; nothing ties the constant to that scale. The regression test perturbs `Math.hypot` by +-1 ulp for a single description (`edgeLength: 4`, labels `one` and `three`); the e2e cross-engine check carries the broader evidence.
**Impact:** A future change of the scene's coordinate scale or of the front-corner geometry could reintroduce an engine-dependent choice that this unit test would not catch; the e2e job would.
**Recommendation:** Note in the constant's comment that it assumes the current scene scale, and run the unit test over a few edge lengths (or a `fc.property` over `edgeLength`) so it does not rely on one value.
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-10-31): the cube regression test was widened under code review CR-007; `SIDE_TOLERANCE`'s comment says it assumes the cube's fixed drawn size.

---

### QR-006: CI e2e/smoke jobs repeat the setup block and keep no failure artifacts

**Category:** Patterns
**Severity:** Suggestion
**Location:** `.github/workflows/ci.yml` (`e2e` and `smoke` jobs)
**Description:** The checkout/pnpm/node/install/React-18 steps are copied a third time (the file already repeats them in `check`, consistent with the file's existing style, so this is not a deviation). Unlike a local run, a Playwright failure on GitHub leaves only the `list` and annotation output; the config keeps no trace, and no `playwright-report` or `test-results` upload exists. The e2e React 18 cell relies on a `pnpm add` step that only runs on GitHub (Unverified per the delivery record).
**Impact:** Debugging a WebKit-only failure on CI means re-running locally on another OS; copy-paste drift between the three jobs is possible over time.
**Recommendation:** Optionally upload `test-results/` with `if: failure()` (the cross-engine failures already print their own diff, so this is low value), and consider a composite action for the shared setup if a fourth job is added. No action required now.
**Status:** Resolved
**Resolution:** Dismissed (approved by Engineer — Thomas Eaves, 2026-10-31): the cross-engine and hydration failures print their own differences, and the repeated setup follows the workflow's existing style; revisit with a composite action if a fourth job is added.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fixed | checks documented | `CONTRIBUTING.md` |
| QR-002 | Fixed | generator test in the fast suite | `tests/fixtures/descriptions.test.ts`, `tests/fixtures/descriptions.ts`, `tests/e2e/cross-engine.spec.ts` |
| QR-003 | Fixed | timeout, retry, causes | `tests/smoke/run.ts` |
| QR-004 | Fixed | `type Page` import | `tests/e2e/cross-engine.spec.ts` |
| QR-005 | Fixed | comment; test widened under CR-007 | `src/layout/cube.ts` |
| QR-006 | Dismissed | — | — |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 — five fixed, one dismissed (Engineer — Thomas Eaves, 2026-10-31)
