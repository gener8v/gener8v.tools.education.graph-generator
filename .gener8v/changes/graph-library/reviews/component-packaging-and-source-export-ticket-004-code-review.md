# TICKET-004: Add cross-environment rendering, install and bundle-size checks — Code Review

## Summary

Reviewed the Playwright hydration and cross-engine specs, the pack-and-install smoke check, the size-limit budgets, the circle factory and the DEL-004 cube fix at commit 165dd5b. All five acceptance criteria are met locally and re-ran green (e2e 36 of 36, smoke on React 18.3.1 and 19.3.0, 17 budgets, full suite 2,316 of 2,316). None of the checks passes vacuously: the hydration, cross-engine and smoke checks fail on the defects they target, and the cube fix is sound for the sampled cubes. The findings are about coverage depth and unverified CI cells: three Issues and four Observations.

**Delivery Record:** `.gener8v/changes/graph-library/delivery/component-packaging-and-source-export-ticket-004-delivery.md`
**Files Reviewed:**
- `playwright.config.ts`
- `tests/e2e/bundle.ts`, `tests/e2e/page-entry.ts`, `tests/e2e/page-api.ts`
- `tests/e2e/hydration.spec.ts`, `tests/e2e/cross-engine.spec.ts`
- `tests/fixtures/descriptions.ts`
- `tests/smoke/run.ts`, `tests/smoke/render.mjs`, `tests/smoke/react18/package.json`, `tests/smoke/react19/package.json`
- `.size-limit.json`
- `src/core/definitions/circle.ts`, `tests/package/per-type-bundle.test.ts`, `tests/package/entries.test.ts`
- `src/layout/cube.ts`, `tests/layout/cube.test.ts`, `.changeset/cube-labels-same-in-every-engine.md`
- `.github/workflows/ci.yml`, `package.json`
- `.gener8v/specifications/component-packaging-and-source-export.md` (`@spec Coverage`)

**Findings:** 7
**Critical:** 0 | **Issues:** 3 | **Observations:** 4

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| `hydration.spec.ts` server-renders every example through `<Graph>`, hydrates in Chromium and WebKit, fails on any hydration warning or console error | Yes (locally) | `tests/e2e/hydration.spec.ts` renders with `renderToString`, asserts the markup is a drawing, hydrates via `hydrateRoot` with `onRecoverableError`, `onCaughtError` and `onUncaughtError` recorded (`tests/e2e/page-entry.ts`), and fails on any console error or warning, page error, or change to the markup. A dev build of React is used so mismatches are reported. Not vacuous: the delivery's `Math.random()` mutant fails it. The CI job on React 18 and on GitHub is unverified (CR-001). |
| `cross-engine.spec.ts` compares markup from Chromium, WebKit and Node for every example and at least 200 generated valid descriptions; any difference fails | Yes (locally) | `tests/e2e/cross-engine.spec.ts`: byte-for-byte equality of `renderToStaticMarkup`, plus client render against Node's markup as the engine parses it; 240 descriptions from seed 20261030, every type reached, text at the limit and `oneClusterTexts` asserted present; the comparison is not loosened. It found the cube difference. Depth of coverage is limited (CR-002). |
| `tests/smoke/` packs, installs into fresh React 18 and 19 projects and renders every example; runs in the CI matrix | Yes (locally) | `tests/smoke/run.ts`: `pnpm pack`, fresh temp copy of each template, `npm install` of the tarball only, `render.mjs` imports the root and every exports subpath and renders every globbed example through `<Graph>` and the type's own component. Re-run: both majors pass. The `smoke` job in `.github/workflows/ci.yml` is not yet run on GitHub (CR-001). |
| `.size-limit.json` holds one entry per type at 25 kB and the entry at 120 kB; CI fails over budget | Yes | `.size-limit.json`: `.` at 120 kB, 12 type entries at 25 kB, all `gzip: true`; `pnpm size` runs in the existing `check` job (`.github/workflows/ci.yml`, "Bundle size"). Re-run: `.` 50.8 kB, largest type `./xy-graph` 22.86 kB. `tests/package/entries.test.ts` ties budgets to exports. |
| Checks iterate over `examples/*.json` automatically | Yes | `loadExamples()` in `tests/e2e/bundle.ts` and the `readdirSync` in `tests/smoke/render.mjs` glob the directory (15 files, `invalid/` excluded); `hydration.spec.ts` also fails when a `GRAPH_TYPES` entry has no example; `render.mjs` fails when an example's type has no entry point. |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| CPSE-NFR-002 | ≤ 25 kB per type, ≤ 120 kB for the entry, size-limit in CI | `.size-limit.json`; `tests/package/per-type-bundle.test.ts` ("leaves the circle out of a consumer's bundle of every other built entry"); `src/core/definitions/circle.ts`:circle. `pnpm size` passes, re-run | Yes |
| CPSE-NFR-003 | Packed package installs into fresh React 18 and 19 and renders every example | `tests/smoke/run.ts`, `tests/smoke/render.mjs`; passes locally, re-run | Partial (CI `smoke` job not run on GitHub: CR-001) |
| CPSE-NFR-005 | Server and browser output match, no hydration warnings | `tests/e2e/hydration.spec.ts`, `tests/e2e/cross-engine.spec.ts`; passes locally, re-run | Partial (CI `e2e` job and its React 18 cell not run: CR-001) |

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/TC-002, prd/RF-003 | Engine float differences must not change output | Yes, for the sampled space | The comparison is exact; the cube difference was fixed in code, not by loosening. Remaining sensitivity in CR-002. |
| prd/OC-004 | CI matrix cost | Yes | `e2e` on Node 22 only, React 19 and 18; `smoke` on Node 22 and 24; no React major dropped. |
| prd/TC-007 | Open-source, dev-only tooling | Yes | `@playwright/test` is an exact-pinned devDependency; the published package is unchanged. |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-001 | Separate entry points; a per-type import carries only its type | Yes | Circle factory marked `/* @__PURE__ */`; the new bundle test asserts "A circle" is absent from all eleven other built entries; per-type budgets pass. |
| AD-007 | One rounding function; cross-engine test covers boundary cases | Partial | Comparison runs and the tie-dependent cube case was fixed; other tie-sensitive spots remain untested (CR-002). |
| AD-016 | Playwright on Chromium and WebKit; size-limit budgets | Yes | `playwright.config.ts` has both projects; budgets in place. CI uses Linux WebKit, not Safari (CR-002). |
| TR-002 | Trigonometric/rounding boundary differs across engines | Partial | Mitigation applied for the cube (a stable side test, not a snap); see CR-002. |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| CPSE-NFR-002 | `@spec CPSE-NFR-002` | `tests/package/per-type-bundle.test.ts` (new test) | Yes |
| CPSE-NFR-002 | `@spec CPSE-NFR-002` | `src/core/definitions/circle.ts`:circle, defineCircle (claimed in the delivery record and the specification table) | No (only GSS IDs) |
| CPSE-NFR-003 | `@spec CPSE-NFR-003` | `tests/smoke/run.ts`, `tests/smoke/render.mjs` | Yes |
| CPSE-NFR-005 | `@spec CPSE-NFR-005` | `tests/e2e/hydration.spec.ts`, `tests/e2e/cross-engine.spec.ts`, `playwright.config.ts` | Yes |
| CPSE-NFR-005 | `@spec CPSE-NFR-005` | `src/layout/cube.ts`:normalsOf, SIDE_TOLERANCE (claimed in the delivery record and the specification table) | No |

**Coverage:** 3 of 5 listed locations annotated (tests and config complete; both source locations unannotated)
**Missing:** `src/layout/cube.ts`:normalsOf and `src/core/definitions/circle.ts`:circle (CR-003)
**Specification table:** Rows for CPSE-NFR-002, 003 and 005 are present, but two of the listed source locations carry no matching annotation (CR-003).

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm typecheck` / `pnpm lint` / `pnpm check:changesets` | 0 / 0 / 0 | Yes |
| `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache --maxWorkers=4` | 0 (78 files, 2,316 of 2,316) | Yes |
| `pnpm size` | 0 (17 budgets; `.` 50.8 kB, `./xy-graph` 22.86 kB) | Yes |
| `pnpm test:e2e` | 0 (36 passed, Chromium and WebKit) | Yes |
| `GRAPH_GENERATOR_PREBUILT=1 pnpm test:smoke` | 0 (React 18.3.1 and 19.3.0, 15 of 15 examples, 15 other entries imported) | Yes |

The remaining commands in the record (`generate`, `bench`, `build`, `check:*`, `publint`, `attw`, `audit`, state script) were not re-run; `dist/` is prebuilt and the record's results were taken as stated. Logs: `.../scratchpad/cr4/*.log`.

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001: browser bundle built in the test, no web server | Reasonable | Runs the same `src/` the Node side renders. Consequence: the shipped `dist/` is not what the browsers exercise (CR-005). |
| DEL-002: two comparisons per description and per hydration | Reasonable | Static markup against Node's exactly; client render against Node's markup as the engine parses it. Avoids false failures from DOM serialization without loosening. |
| DEL-003: smoke installs with npm into temp dirs | Reasonable | A consumer's install; `--ignore-scripts` is acceptable since the package has no scripts. The entry list comes from the package's own `exports` (CR-004). |
| DEL-004: cube side test with `SIDE_TOLERANCE` (1e-6) | Reasonable | See CR-007. Fix lives in code as TR-002 mitigation requires. It changes Node's own output for existing cubes (395 of 2,000 sampled); the patch changeset says so. |

## Findings

### CR-001: Both new CI jobs, and the e2e React 18 cell, have never run

**Severity:** Issue
**Location:** `.github/workflows/ci.yml` (jobs `e2e`, `smoke`)
**Traces To:** CPSE-NFR-003 and CPSE-NFR-005 (verified by CI jobs); acceptance criterion 3 ("the job runs in the CI matrix")
**Description:** The delivery records the `e2e` job, its React 18 cell (which depends on a `pnpm add --save-dev` step and on esbuild resolving React 18's `react-dom/server` and `react-dom/client` for a browser bundle) and the `smoke` job as Unverified until pushed. React 18 is exercised locally only by the smoke check, which does not hydrate. NFR-005 has therefore never run under React 18, and Linux WebKit never at all.
**Impact:** A React 18 hydration problem, or a CI-only failure (browser install, `--with-deps`, the lockfile after `pnpm add`), would be found only after merge.
**Recommendation:** Push the branch and confirm the `e2e` (both cells) and `smoke` (both Node versions) jobs pass before closing NFR-003 and NFR-005; record the run in the delivery record. If the React 18 cell fails, fix the bundle's React 18 resolution rather than dropping the cell.
**Status:** Resolved
**Resolution:** Accepted for now, verified after the push (approved by Engineer — Thomas Eaves, 2026-10-31): CI runs only on pull requests and pushes to `main`, so the `e2e` (React 19 and 18) and `smoke` (Node 22 and 24) jobs are checked with `gh` after the branch and `main` are pushed, and the run is recorded in the delivery record's Post-Review Amendments; a failure is fixed in a follow-up commit at once.

---

### CR-002: Cross-engine check samples a thin slice; ±1-ulp `Math.hypot` still changes ruler and triangle output

**Severity:** Issue
**Location:** `tests/e2e/cross-engine.spec.ts`; `src/layout/kit/ruler.ts:149` (`stroke-width` through `fmt`), triangle layout (label placement)
**Traces To:** TR-002, AD-007, prd/TC-002; acceptance criterion 2
**Description:** The cube fix was found by luck of the sample (240 descriptions, 15 to 25 per type). A probe run in Node (`probe.mts` and `probe2.mts` in the scratchpad) re-rendered 1,500 generated descriptions with `Math.hypot` moved one unit in the last place, a stand-in for another engine's last-bit difference, and found 5 outputs that changed: 2 rulers (a `stroke-width` of 1.38 became 1.37, a value on a rounding tie) and 3 triangles (the `viewBox` height changed, for example 164.49 to 187.29, because a label landed on the other side of an edge). Cubes were clean under the same perturbation, so DEL-004's fix holds. The simulation is not proof that real engines differ in those cases (the e2e comparison passes), but it shows the same class of hazard as DEL-004 remains and that sampling is the only guard. The `cube.test.ts` regression test perturbs `hypot` for the cube alone. Also, CI runs WebKit on Linux, where its `Math` functions may come from a different libm than Safari on macOS or iOS.
**Impact:** A real cross-engine difference in a ruler or a triangle would show up as a hydration mismatch in a consumer's Safari, which is what CPSE-NFR-005 exists to prevent. Not blocking: the criterion as written (any observed difference fails) is met.
**Recommendation:** Add a unit-level property test over every type that renders `sampleDescriptions` with `Math.hypot` (and the trig functions) perturbed by ±1 ulp and expects identical markup. Then snap or stabilize the ruler stroke-width and the triangle side test as the TR-002 mitigation says. Consider raising the generated count or varying the seed per CI run (printing the seed), and note that Linux WebKit stands in for Safari.
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-10-31). Root causes, probed one `Math` call at a time: `Math.hypot` of an axis-aligned vector feeding exact ties (a ruler mark width of 1.375, axis ticks at 62.915, a cube's vertical edge, a triangle's horizontal side giving a unit normal of 1.0000000000000002); `placeLabels`' bounds test, a tie by design; a triangle arc's piece count on whole multiples of 15°. Fixes: `length()` in `src/layout/kit/vec.ts` measures a horizontal or vertical vector exactly (used by the ruler's edge, `drawAxis` and the cube's `normalsOf`; no Node output change); `BOUNDS_TOLERANCE` 1e-6 in `placeLabels`; `PIECE_TOLERANCE` 1e-9 in `arcPoints`. Over 87,000 sampled descriptions with every approximated `Math` function ±1 and ±3 ulp, one flip remains; Node output changed for 30 of 87,000, all triangles (patch changeset). New property test `tests/layout/engine-math.test.ts` (3,000 descriptions, every type, 22 functions ±1 ulp) and focused regression tests; each fix's mutant fails both. Residual accepted under AD-007 (Engineer decision, same date): a three-sides triangle whose third vertex lands exactly on a rounding boundary (sides 18, 19.98, 14.13: x drawn at 126.095), about 1 in 25,000 samples; pinned by a test that fails once it is gone; algebraic vertex construction (a TR-008 amendment) goes to a follow-up ticket.

---

### CR-003: `@spec` annotations the record and specification table list are missing from source

**Severity:** Issue
**Location:** `src/layout/cube.ts`:normalsOf; `src/core/definitions/circle.ts`:circle, defineCircle; `.gener8v/specifications/component-packaging-and-source-export.md` (`@spec Coverage`)
**Traces To:** CPSE-NFR-005, CPSE-NFR-002; Code Review step 8
**Description:** The delivery record's "@spec Annotations" table and the specification's coverage rows name `src/layout/cube.ts`:normalsOf, SIDE_TOLERANCE (CPSE-NFR-005) and `src/core/definitions/circle.ts`:circle, defineCircle (CPSE-NFR-002). `grep -rn "@spec CPSE-NFR" src` returns nothing; those functions carry only their GSS IDs.
**Impact:** The coverage table points at locations an audit by `grep` does not find; traceability is asserted but not in the code.
**Recommendation:** Add the IDs to the existing `@spec` lines on those definitions, or drop the source locations from the table and the record and keep the test and config ones.
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-10-31): `CPSE-NFR-002` on the `@spec` lines of `circle` and `defineCircle`; `CPSE-NFR-005` on `normalsOf`, `length`, `arcPoints`, the ruler's `checkedOptions`, `placeLabels` and `drawAxis`.

---

### CR-004: Smoke check takes its entry list from the package's own `exports`

**Severity:** Observation
**Location:** `tests/smoke/render.mjs` (`subpaths` from `manifest.exports`)
**Traces To:** CPSE-NFR-003; acceptance criterion 3
**Description:** A missing `files` entry or a missing per-type `exports` entry is caught (the file will not import; an example whose type has no entry point fails). But deleting the `./core`, `./tool` or `./export` entry from `exports` would pass, since the list is derived from the manifest under test, and the JSON exports and the `types` conditions are not exercised. `entries.test.ts` (exports against tsup and size-limit) covers part of this.
**Impact:** Low; other checks (`publint`, `attw`, `entries.test.ts`) cover these cases.
**Recommendation:** Compare the entry list in `render.mjs` with a fixed list or with the repository's own `package.json` passed in by `run.ts`, so a removed entry fails the smoke check too.
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-10-31): `tests/smoke/run.ts` passes a fixed list of the published exports; `render.mjs` requires the installed `exports` keys to match it exactly, imports every JS entry and each JSON export. Mutant: `./core` removed → smoke exits 1 on React 18 and 19.

---

### CR-005: Browser and cross-engine checks run `src/`, not the packed `dist/`

**Severity:** Observation
**Location:** `tests/e2e/page-entry.ts` (imports `../../src/index`); `tests/e2e/bundle.ts`
**Traces To:** CPSE-NFR-005, TR-002
**Description:** Both sides of the comparison use `src/`. The smoke check renders the installed `dist/` in Node only. A difference introduced by the tsup build or minification in a browser would not be seen.
**Impact:** Low; the build is a transform of the same code.
**Recommendation:** Optionally run the hydration spec against `dist/index.js`, or add the browser render of the installed tarball to the smoke job.
**Status:** Resolved
**Resolution:** Accepted (approved by Engineer — Thomas Eaves, 2026-10-31): the browser checks render `src/`; the built `dist/` is exercised by the smoke check (installed tarball, both React majors) and by the per-type bundle test.

---

### CR-006: The single named-import budget covers only `CircleGraph`

**Severity:** Observation
**Location:** `.size-limit.json` (". importing only { CircleGraph }")
**Traces To:** CPSE-NFR-002 ("importing a single graph type's component"); ticket Known Hazard (carried CPSE TICKET-003 quality review)
**Description:** The budgets measure what the NFR means: size-limit builds each entry with its dependencies, minified and gzipped, with React as a peer left out (`.` 50.8 kB, `./xy-graph` 22.86 kB). The one budget for a type imported from `.` uses the circle, which is not the largest (the circle: 18.17 kB; `./xy-graph`: 22.86 kB). A tree-shaking regression for another type through `.` would not fail.
**Impact:** Low; the per-type bundle tests check source and built entries for leaks.
**Recommendation:** Import the largest type (`XyGraph`) from `.` for the named-import budget, or add one for it.
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-10-31): the named-import budget imports `{ XyGraph }`, the largest type, from `.` (22.87 kB of 25 kB).

---

### CR-007: Cube fix sound; one orphaned comment and a narrow regression test

**Severity:** Observation
**Location:** `src/layout/cube.ts` (the doc comment "Candidates for an edge's label…" now sits above `SIDE_TOLERANCE`, detached from `besideSegment`); `tests/layout/cube.test.ts`
**Traces To:** TR-002; DEL-004
**Description:** `normalsOf` flips only below `-1e-6`. The outer bottom-right edge (labeled `"one"`) has its midpoint about one apothem from the centre, far from the tolerance; the three front-corner edges run from the hexagon centre, so their test is zero within rounding and now keeps the first normal in every engine. Both normals are candidates for those edges, so only candidate order is fixed, and a deterministic dot product slightly off zero (from `fmt` of the corner points) stays deterministic. Reasoned for all four labeled edges and confirmed by the ±1/±3 ulp probe over every sampled cube (no changes). The regression test covers only one cube (edge length 4, no title, ±1 ulp). The doc comment was split when the constant was inserted.
**Impact:** None on behaviour. The Node output for existing cubes with three labeled edges changes; the patch changeset states this.
**Recommendation:** Move the doc comment back above its function; extend the regression test to a title and a few edge lengths.
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-10-31): the detached comment documented a function since moved into `besideSegment`; its cube-specific part now sits at the call in `cubeLayout`. The cube regression test covers five edge lengths, with and without a title, one and three labeled edges, five label texts, ±1 and ±3 ulp.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Accepted | verified on GitHub after the push | — |
| CR-002 | Fixed | exact axis-aligned lengths, bounds and piece tolerances, property test; residual pinned | `src/layout/kit/vec.ts`, `src/layout/kit/ruler.ts`, `src/layout/kit/axis.ts`, `src/layout/kit/figure-labels.ts`, `src/layout/triangle.ts`, `src/layout/cube.ts`, `tests/layout/engine-math.test.ts`, `tests/fixtures/engine-math.ts`, focused tests, changeset |
| CR-003 | Fixed | annotations added | `src/core/definitions/circle.ts`, layout files above |
| CR-004 | Fixed | fixed export list, exact match | `tests/smoke/run.ts`, `tests/smoke/render.mjs` |
| CR-005 | Accepted | dist covered by smoke | — |
| CR-006 | Fixed | XyGraph budget | `.size-limit.json`, `tests/package/entries.test.ts` |
| CR-007 | Fixed | comment moved, test widened | `src/layout/cube.ts`, `tests/layout/cube.test.ts` |

## Verdict

**Result:** Approved with Notes
**Unresolved Findings:** 0 — five fixed, two accepted (Engineer — Thomas Eaves, 2026-10-31)
**Notes:** CR-001's CI run is checked after the push and recorded in the delivery record. CR-002's residual (a three-sides triangle vertex on a rounding boundary) is accepted under AD-007 and pinned by a test; its fix is a follow-up ticket.
