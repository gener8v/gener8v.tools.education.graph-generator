# TICKET-004: Add cross-environment rendering, install and bundle-size checks — Delivery Record

## Ticket Reference

**Ticket:** graph-library/component-packaging-and-source-export/TICKET-004
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/component-packaging-and-source-export.md`
**Requirements Covered:**
- CPSE-NFR-002: ≤ 25 kB min+gzip per single graph type, ≤ 120 kB for the entry component with all types — verified by size-limit in CI
- CPSE-NFR-003: The packed package installs into a fresh React project and renders every documented example on each supported React major — verified by a CI smoke job
- CPSE-NFR-005: Server-rendered and browser-rendered output match for every documented example with no hydration warnings — verified by a CI hydration test

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Predecessor TICKET-003 delivered | delivery record | Delivered and reviewed; `main` at `c7fbd5a` | ✅ |
| `src/react/Graph.tsx`, `src/graph.ts`, `src/layout/registry.ts` | present | present; per-type components in `src/react/graphs/`, entries in `src/entries/` | ✅ |
| `.github/workflows/ci.yml` matrix | present | React 18/19 × Node 22/24 `check` job; no e2e or smoke job | ✅ — jobs to add |
| `.size-limit.json` budgets | per type 25 kB, entry 120 kB | present: `.` 120 kB, every one of the twelve types 25 kB, `./core` 40 kB, `./tool` and `./export` 25 kB, all `gzip: true` (CPSE TICKET-001 code review gzip finding already applied); all pass today — `.` 50.8 kB, largest type `./xy-graph` 23.1 kB | ✅ |
| Playwright (Chromium and WebKit), AD-016 | dev dependency | `@playwright/test` not in `package.json`; no `playwright.config.ts`; Chromium is cached locally, WebKit is not | ⚠️ To add — plan decision (dev dependency only) |
| `examples/*.json` for every type (Phase 3 hazard) | all types landed | all twelve types (`GRAPH_TYPES`, the ruler included) plus three extra triangle sets: 15 files; `examples/invalid/` excluded | ✅ — this run can close the NFRs |
| Generators for ≥ 200 valid descriptions | for the cross-engine check | `tests/fixtures/data-graphs.ts` (line, bar, pictograph), `tests/fixtures/nlc-generators.ts` (number line, x,y, x,y,z); none for circle, square, triangle, cube, cylinder, ruler | ⚠️ To add — plan |
| `oneClusterTexts`, `CALLER_TEXT_LIMIT`, `UNIT_TEXT_LIMIT` (hazard) | present | `tests/fixtures/plain-text.ts`, `src/core/definitions/shared.ts` | ✅ |
| Registry access for the smoke projects | fresh installs | npm registry reachable (`react@18.3.1`, `@playwright/test` 1.64.1) | ✅ |
| `tests/e2e/`, `tests/smoke/` | to be created | absent; vitest includes only `tests/**/*.test.{ts,tsx}`, so `*.spec.ts` stays out of `pnpm test` | ✅ |
| Carried: circle definition leak (ready-tickets reconciliation hazard) | fix before treating per-type budgets as met | `src/core/definitions/circle.ts` exports `circle` as a plain object; the bundle test leaves "A circle" unasserted for other built entries | 🔁 Carried — fixed in this plan |
| Carried: CPSE TICKET-003 quality review (a `.` consumer importing one component) | size checks measure `.` with a single named import | no such entry | 🔁 Carried — added in this plan |
| Carried: TR-002 mitigation — never loosen the comparison | honoured | — | 🔁 Carried |

**Resolved from ground truth (not escalated):**
- *Twelve or eleven types.* Twelve, with the ruler (hazard); every one has an example.
- *Budgets in gzip or brotli.* Already gzip.

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-10-30
**Implemented by:** opus · high — routed as deliver-large from Tower

### Planned Files

- `package.json`, `pnpm-lock.yaml`: `@playwright/test` as an exact-pinned dev dependency (AD-016; development-only, so `check:deps` is unaffected); scripts `test:e2e` (`playwright test`) and `test:smoke` (`tsx tests/smoke/run.ts`). Browsers via `pnpm exec playwright install chromium webkit`.
- `playwright.config.ts` (new): `testDir: tests/e2e`, projects Chromium and WebKit, no web server; pages built with `page.setContent` and one browser bundle of `src/` + React made with the existing `esbuild` dev dependency.
- `tests/e2e/hydration.spec.ts` (new; CPSE-NFR-005): every `examples/*.json` (globbed) server-rendered through `<Graph>` in Node with `renderToString`, loaded and hydrated with `hydrateRoot` in each engine; fails on any console error or warning, page error or `onRecoverableError`; asserts the hydrated markup equals the server markup.
- `tests/e2e/cross-engine.spec.ts` (new; TR-002): for every example and ≥ 200 generated valid descriptions (seeded, the same in every engine), Node's `renderToStaticMarkup` equals the markup rendered in Chromium and in WebKit, byte for byte. The comparison is never loosened (hazard).
- `tests/fixtures/descriptions.ts` (new): a generator of valid descriptions over every type in `GRAPH_TYPES` — reusing the six existing generators and adding circle, square, triangle, cube, cylinder and ruler — with text up to `CALLER_TEXT_LIMIT` including `oneClusterTexts` (hazard), every sample through `validate()`, and a coverage check that every type is reached.
- `tests/smoke/run.ts`, `tests/smoke/react18/`, `tests/smoke/react19/` (new; CPSE-NFR-003): `pnpm pack`; each template copied to a fresh temporary directory; `npm install` of the tarball with `react`/`react-dom` 18.3.1 or 19.x; a Node script imports `@gener8v/graph-generator` and the per-type entries and server-renders every example (globbed), failing on an error, a fallback, or markup without `<svg`.
- `.size-limit.json` (CPSE-NFR-002): budgets kept; adds `.` with a single named import `{ CircleGraph }` at 25 kB (carried CPSE TICKET-003 quality review).
- `src/core/definitions/circle.ts` (carried hazard): `circle` becomes `/* @__PURE__ */ defineCircle()`, as the cube and ruler are; `tests/package/per-type-bundle.test.ts` asserts "A circle" absent from every other built entry's consumer bundle; a patch changeset if `check:changesets` requires one.
- `.github/workflows/ci.yml`: an `e2e` job (Node 22; React 19 and 18 as a matrix; browsers installed `--with-deps`; build; `pnpm test:e2e`) and a `smoke` job (Node 22 and 24; both React projects); actions pinned to the existing SHAs.
- `.gener8v/specifications/component-packaging-and-source-export.md`: `@spec Coverage` rows for CPSE-NFR-002, 003, 005.

### How Acceptance Criteria Will Be Met

- Hydration — `pnpm test:e2e`, both engines, locally.
- Cross-engine — the same run, examples + ≥ 200 generated descriptions.
- Smoke — `pnpm test:smoke`, locally against the registry, React 18 and 19.
- Budgets — `pnpm size`.
- Automatic coverage of new examples — all three glob `examples/*.json`; verified by counting the files each covers.
- Mutation checks: a `Math.random()` attribute (hydration), an unrounded coordinate (cross-engine, if it shows a difference), the circle back as a plain object (bundle).
- The CI jobs running on GitHub cannot be verified locally; recorded Unverified until pushed.

## Progress

- [x] `@playwright/test` dev dependency, scripts, browsers
- [x] `playwright.config.ts`
- [x] `tests/fixtures/descriptions.ts`
- [x] `tests/e2e/hydration.spec.ts`
- [x] `tests/e2e/cross-engine.spec.ts`
- [x] `tests/smoke/run.ts`, `tests/smoke/react18/`, `tests/smoke/react19/`
- [x] `.size-limit.json`
- [x] Circle factory and bundle test
- [x] `.github/workflows/ci.yml`
- [x] `@spec Coverage` rows

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `playwright.config.ts` (new): Chromium and WebKit projects over `tests/e2e/`, no web server.
- `tests/e2e/bundle.ts`, `tests/e2e/page-entry.ts`, `tests/e2e/page-api.ts` (new): one esbuild IIFE per worker of `src/index.ts`, React's development build, `react-dom/client` and the browser `react-dom/server`, injected after `page.setContent`; examples globbed from `examples/*.json`.
- `tests/e2e/hydration.spec.ts` (new; CPSE-NFR-005): every example server-rendered through `<Graph>` in Node, hydrated in each engine; fails on React hydration or recoverable errors, console errors or warnings, page errors, or any change to the server markup; asserts every graph type has an example.
- `tests/e2e/cross-engine.spec.ts` (new; TR-002): every example and 240 generated descriptions (seed 20261030, 15–25 per type, every type reached, caller text at 200 characters and `oneClusterTexts(200)` included) — Node's `renderToStaticMarkup` equals each engine's static markup byte for byte, and each engine's client render equals Node's markup as that engine parses it.
- `tests/fixtures/descriptions.ts` (new): valid-description generators for every type in `GRAPH_TYPES` (the six existing ones reused; circle, square, triangle, cube, cylinder and ruler added), every sample through `validate()`.
- `tests/smoke/run.ts`, `tests/smoke/render.mjs`, `tests/smoke/react18/package.json`, `tests/smoke/react19/package.json` (new; CPSE-NFR-003): `pnpm pack`, fresh temporary projects, `npm install` of the tarball with React 18.3.1 and 19.3.0, every entry point imported and every example server-rendered through `<Graph>` and its type's own component; non-zero exit naming each failure.
- `.size-limit.json` (CPSE-NFR-002): adds `.` importing only `{ CircleGraph }` at 25 kB (carried CPSE TICKET-003 quality review).
- `src/core/definitions/circle.ts`: `circle` is `/* @__PURE__ */ defineCircle()` (carried hazard); `tests/package/per-type-bundle.test.ts` asserts "A circle" absent from every other built entry's consumer bundle.
- `src/layout/cube.ts`: `normalsOf` flips a normal only when the side test is below `-SIDE_TOLERANCE` (1e-6), fixing a WebKit difference the cross-engine check found (DEL-004); `tests/layout/cube.test.ts` adds a regression test; patch changeset `.changeset/cube-labels-same-in-every-engine.md`.
- `tests/package/entries.test.ts`: allows the named-import budget (one whole-entry budget per export, any `import` budget on an exported file).
- `.github/workflows/ci.yml`: `e2e` job (Node 22; React 19 and 18) and `smoke` job (Node 22 and 24), actions pinned to the existing SHAs.
- `package.json`, `pnpm-lock.yaml`: `@playwright/test` 1.64.1 (exact, dev only); scripts `test:e2e`, `test:smoke`. `.gitignore`: `test-results/`, `playwright-report/`.
- `.gener8v/specifications/component-packaging-and-source-export.md`: `@spec Coverage` rows for CPSE-NFR-002, 003, 005.

**Types covered:** all twelve in `GRAPH_TYPES` (15 examples, the three extra triangle sets included) — the final run the Known Hazard asks for.

## Verification Run

Run in the main session on 2026-10-30, after the code was written.

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm generate` / `pnpm lint` / `pnpm typecheck` | 0 / 0 / 0 | — |
| `npx vitest run --no-cache` ×6 / `--maxWorkers=4` ×1 | 1 each / 0 | default workers: 2,315 of 2,316 passed each time; the one failure is always `tests/layout/kit/text.test.ts` "stops early, so caller-sized text costs little" (1,208–1,358 ms against 1,000 ms) while other repositories' vitest and Python jobs held the load average at 11–20; with the per-type bundle test excluded it still failed, so not this ticket's heavier bundle test; run alone, 32 of 32 three times; with four workers the full suite passed 2,316 of 2,316. Neither the test nor `src/layout/kit/text.ts` changed here — the known wall-clock test that needs a fix ticket |
| `pnpm bench` | 0 | 20 passed |
| `pnpm build` / `check:dist` / `check:deps` / `check:images` / `check:changesets` / `publint` / `attw` | 0 each | — |
| `pnpm size` | 0 | 17 budgets pass: `.` 50.8 kB of 120; `.` importing only `{ CircleGraph }` 18.17 kB of 25; largest type `./xy-graph` 22.9 kB of 25 |
| `pnpm test:e2e` | 0 | 36 passed: Chromium and WebKit × (15 examples hydrated + coverage + cross-engine examples and 240 generated) |
| `GRAPH_GENERATOR_PREBUILT=1 pnpm test:smoke` | 0 | React 18.3.1 and 19.3.0: root + 15 entry points imported, 15 of 15 examples rendered through `<Graph>` and each type's component |
| `pnpm audit` / `pnpm audit --prod` | 1 / 0 | one moderate advisory, GHSA-g3hv-75wg-m249, `minimatch` <11.0.1 through `eslint` (dev only); not introduced here (Playwright not on the path) and clean earlier the same day; production tree clean |
| Mutation checks (each restored) | — | `Math.random()` attribute on the root `<svg>` → 30 hydration + 4 cross-engine tests fail; circle back as a plain object → 7 bundle tests fail; `normalsOf` back to `< 0` → the new cube test fails; an invalid example → smoke exits 1 naming it |
| `gener8v-state.py state` / `lint` | 0 / 0 | 0 errors, 0 warnings |

## Acceptance Criteria Verification

- [x] `tests/e2e/hydration.spec.ts` server-renders every example through `<Graph>`, hydrates in Chromium and WebKit and fails on any hydration warning or console error (CPSE-NFR-005) — `pnpm test:e2e`; the random-attribute mutant fails it.
- [x] `tests/e2e/cross-engine.spec.ts` compares the markup of Chromium, WebKit and Node.js for every example and 240 generated descriptions; any difference fails (TR-002) — `pnpm test:e2e`; it found the cube difference (DEL-004), now fixed.
- [x] `tests/smoke/` packs, installs into fresh React 18 and 19 projects and renders every example (CPSE-NFR-003) — `pnpm test:smoke`. *The job's run on GitHub Actions is Unverified until pushed.*
- [x] `.size-limit.json` holds one entry per graph type at 25 kB and the entry component at 120 kB, and CI fails over budget (CPSE-NFR-002) — `pnpm size`; the existing `check` job runs it; the circle no longer inflates other types' figures.
- [x] The checks iterate over `examples/*.json` automatically — all three glob it (15 files each); the hydration spec also fails when a graph type has no example.
- Unverified: the e2e job's React 18 cell (needs the CI `pnpm add` step; React 18 is covered locally by the smoke check), and both new jobs on GitHub Actions.

## Decisions Made

### DEL-001: Browser bundle built in the test, no web server

**Decision:** Each Playwright worker bundles `src/index.ts` with React (development build), `react-dom/client` and the browser `react-dom/server` into one IIFE with esbuild and injects it after `page.setContent`; descriptions and markup cross as JSON text.
**Rationale:** No server or port to manage; the page runs the same source the Node side renders.

### DEL-002: Two comparisons per description and per hydration

**Decision:** Cross-engine compares each engine's static markup with Node's byte for byte, and its client render with Node's markup as that engine parses it. Hydration compares the hydrated markup with the parsed server markup and with the server string. The last ties the test to escaping: a future example with `'` or `"` in text would differ by escaping, not hydration.

### DEL-003: Smoke projects install with npm into temporary directories

**Decision:** `npm install --ignore-scripts --package-lock=false` of the packed tarball into a copy of each template, so the install is a consumer's, not the workspace's; one shared `render.mjs` finds each type's component by its `graphType`.

### DEL-004: Cube label side decided without rounding noise (TR-002)

**Context:** The cross-engine check found cubes with `labelEdges: "three"` labelled on opposite sides in WebKit: `normalsOf` chose the outward normal by the sign of a dot product that is zero up to rounding for the three edges from the hexagon's centre, and WebKit's `Math.hypot` differs from V8's in the last bit. Not a formatting difference, so the hazard's formatting fixes did not apply.
**Decision:** (Engineer — Thomas Eaves, 2026-10-30, to fix in this ticket.) Flip only when the side test is below `-SIDE_TOLERANCE` (1e-6): those edges keep their first normal in every engine. Node's own layout changes for those cubes (395 of 2,000 sampled), since its rounding had gone both ways; no flipping rule could keep it exactly. Labels stay clear of every edge (the cube suite's overlap checks pass). Patch changeset.

## Deviations from Plan

- `src/layout/cube.ts`, `tests/layout/cube.test.ts` and a patch changeset — the WebKit fix (DEL-004), approved during delivery.
- `tests/package/entries.test.ts` changed: it assumed one budget per file.
- `.gitignore` gains Playwright's output folders.
- Smoke: one shared `tests/smoke/render.mjs`; the React folders hold only a `package.json`.
- The bundle test had six "left unasserted" notes, not two; all replaced by assertions, plus one test over all eleven other built entries.
- No changeset for the circle factory: `check:changesets` does not require one and nothing a consumer sees changes.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| CPSE-NFR-005 | `tests/e2e/hydration.spec.ts`, `tests/e2e/cross-engine.spec.ts`, `playwright.config.ts`; `src/layout/cube.ts`:normalsOf | `@spec CPSE-NFR-005` (tests, config); coverage row |
| CPSE-NFR-003 | `tests/smoke/run.ts`, `tests/smoke/render.mjs` | `@spec CPSE-NFR-003` |
| CPSE-NFR-002 | `.size-limit.json`; `tests/package/per-type-bundle.test.ts`; `src/core/definitions/circle.ts`:defineCircle | `@spec CPSE-NFR-002` on the new bundle test; coverage row |

## Notes

- `./tool` and `./export` measure 0 B in `pnpm size` (unchanged; CPSE TICKET-005 and 007 fill them).
- The `minimatch` advisory through `eslint` needs a dependency update outside this ticket.
- The wall-clock and NLC coverage-counter flakes (recorded on earlier tickets) still need their fix ticket.

## Post-Review Amendments

None
