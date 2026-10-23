# TICKET-004: Verify ruler accuracy, server rendering, accessibility and performance — Code Review

## Summary

This reviews the delivery of `rulers/number-lines-and-coordinate-graphs/TICKET-004` (commit f2b5891, branch `ticket/rulers-nlc-004`) against the ticket, the NLC specification, the `prd` constraints and the system design. The code-reviewer agent did the findings phase in a fresh context. The delivery adds tests, a shared axe helper and one devDependency; the commit changes nothing under `src/`, `examples/` or `scripts/`. Every acceptance criterion is met, each of the four NFRs has a verifying test or benchmark with a `## @spec Coverage` row, every carried Known Hazard is addressed, and every command in the Verification Run reproduces, including the 50 isolated runs of the property test. Three findings, all Observations:
- The server-rendering check shares its file with jsdom and axe-core. Importing axe-core runs its bundle in Node and leaves one (non-browser) global, so DEL-002's "No global is installed" is not quite accurate (CR-001).
- Two sentences in the record say more than the work shows: a "first-child" `<title>` (the test accepts any direct child), and CPSE TICKET-008 "states" the 330 px minimum (it is a Known Hazard on an undelivered ticket) (CR-002).
- CI now runs the NLC-NFR-008 benchmark under a step named "Validation speed (GSV-NFR-001)" (CR-003).

**Delivery Record:** `.gener8v/changes/rulers/delivery/number-lines-and-coordinate-graphs-ticket-004-delivery.md`
**Files Reviewed:**
- `tests/layout/ruler.test.ts` (the new property test at `:178-204`, and the generators and helpers it uses, `:23-115`)
- `tests/helpers/axe.ts`
- `tests/react/ruler.test.tsx`
- `tests/layout/ruler.bench.ts`
- `package.json`, `pnpm-lock.yaml` (`axe-core` `^4.14.0`, resolved 4.14.0, devDependency)
- `.gener8v/specifications/number-lines-and-coordinate-graphs.md` (`## @spec Coverage` rows, `:240-243`)
- Read for context, not changed by this ticket: `src/core/ruler.ts`, `src/layout/ruler.ts`, `src/layout/kit/ruler.ts`, `src/react/graphs/RulerGraph.tsx`, `examples/ruler.json`, `tests/fixtures/rulers.ts`, `tests/fixtures/plain-text.ts`, `tests/core/validate.bench.ts`, `tests/react/Graph.test.tsx`, `tests/helpers/ajv.ts`, `tests/setup/build.ts`, `vitest.config.ts`, `tsconfig.json`, `.github/workflows/ci.yml`, `.gener8v/changes/graph-library/tickets/number-lines-and-coordinate-graphs/TICKET-005.md`, `.gener8v/changes/graph-library/tickets/component-packaging-and-source-export/TICKET-008.md`

**Findings:** 3
**Critical:** 0 | **Issues:** 0 | **Observations:** 3

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| NLC-NFR-005: a property test generates rulers in both units, at every inch division, at lengths 1 to the maximum and with objects from any mark to any later mark. For each it checks every mark and both object ends within 0.5 units of their positions computed from the values, and every whole unit drawn at the same length, verified by the geometry test in CI | Yes | **Test:** `tests/layout/ruler.test.ts:178-204`, 300 runs over `fc.oneof(rulerWithObject, plainRuler)`.<br>**Generators:**<br>• `rulerBase` (`:88-96`): both units, every length from 1 to `RULER_MAX_LENGTH[unit]` equally likely per unit, and on an inch ruler `undefined` or any of half, quarter, eighth, sixteenth.<br>• `rulerWithObject` (`:107-115`): ends at mark indices `i < j`, each often the first or last mark.<br>**Checks:**<br>• the drawn mark count equals the scale's;<br>• every mark's `x1` is within 0.5 of `expectedX(value, length)` (`:43`). That is plain arithmetic from the fixed edge, not the layout's `linearScale`;<br>• there are `length + 1` whole marks, each unit `RULER_EDGE / length` long within 0.02 (two `fmt()` steps);<br>• both bar ends are within 0.5 of `expectedX(locatedValue(scale, end))`, as the Known Hazard asks;<br>• a ruler with no object has no bar.<br>**CI:** the `Test` step (`pnpm test`).<br>**Probes:**<br>• 50 isolated runs (1 passed, 27 skipped each), 0 failures.<br>• Mutations made in memory on a 30 cm and a 12 in Scene: marks past the middle moved 0.6 fail the 0.5 check; moved 0.4 (inside the tolerance) they still fail the 0.02 unit check; the bar's end moved 0.6 fails. The unmutated Scenes pass. |
| NLC-NFR-006: the ruler examples render in Node.js through `renderToStaticMarkup` with no browser global defined, verified by the server-rendering test in CI. Extend NLC-NFR-002's test if `graph-library/number-lines-and-coordinate-graphs/TICKET-005` has delivered it, else add a ruler test in the same shape | Yes | **Test:** `tests/react/ruler.test.tsx:36-52`.<br>• `typeof window` and `typeof document` are asserted `"undefined"` at `:38-39`, and again at `:50` after the renders. Vitest runs in `environment: "node"` (`vitest.config.ts`).<br>• 79 descriptions: the example, plus all 78 of `EVERY_RULER`, each with an object from its first mark to its last. Each renders through `<RulerGraph>` and matches `^<svg role="img" aria-label="A ruler[ ,]`; `<Graph>` gives the same markup.<br>• The regex rejects the fallback. Probe: an invalid ruler renders `<div role="note" …>`.<br>**Ordering:** graph-library NLC TICKET-005 has no delivery record (`.gener8v/changes/graph-library/delivery/` holds NLC TICKET-001 and 002 only). So the ruler test is added in that ticket's NLC-NFR-002 shape: a `node` environment, `window` and `document` asserted, examples rendered to static markup. The record says which (AC verification, Notes).<br>**CI:** the `Test` step.<br>The file's module graph is CR-001. |
| NLC-NFR-007: every ruler example's rendered SVG has `role="img"` and a non-empty accessible name equal to its text alternative, and passes the axe rules for SVG images, verified by the accessibility test (extended or added as for NLC-NFR-006) | Yes | **Test:** `tests/react/ruler.test.tsx:54-84`, run over the example and the five maximum-length rulers (30 cm; 12 in to halves, quarters, eighths and the default sixteenths), each with a title and an object. For each:<br>• `role="img"`;<br>• `aria-label` and the `<title>` child (`:79`) each equal `createGraph(...).scene.textAlternative`, which is non-empty after trimming;<br>• `axeSvgImage` reports no violations, and `svg-img-alt` is among the passes.<br>**Negative control:** a nameless `<svg role="img">` is reported by `svg-img-alt` (`:63-66`).<br>**Probes:**<br>• On all six rulers the five rules pass and none is incomplete.<br>• Every axe rule tagged WCAG 2.0/2.1 A or AA finds no violation either. Only `color-contrast` comes back incomplete, because jsdom has no canvas.<br>• An empty or blank `aria-label` is reported by `svg-img-alt`.<br>**Default size:** each ruler is rendered with no size, so it uses `viewBox="0 0 400 …"` and `width="100%"`, as the carried hazard asks.<br>**Beyond the criterion:** the NLC-NFR-006 test checks that every one of the 78 rulers carries an `aria-label` beginning "A ruler". |
| NLC-NFR-008: a 30 cm ruler and a 12 in ruler at sixteenths, each with an object, render in ≤ 50 ms at p95 in a server render, verified by a `pnpm bench` benchmark recorded in the delivery record's Verification Run | Yes | **Benchmark:** `tests/layout/ruler.bench.ts`.<br>• Four cases (`:18-29`): 30 cm, and 12 in at the default sixteenths (193 marks, probe). Each has an object from 0 to its end, and a title and label at `CALLER_TEXT_LIMIT`, as words (`wordsOf`) and as one cluster (`oneClusterTexts(...).latinMarks`). This is the Known Hazard's largest valid ruler.<br>• Each sample is a whole `renderToStaticMarkup(createElement(RulerGraph, …))`: validation, layout and markup.<br>• Before timing, the render is checked to be a titled ruler, not the fallback (`:35`).<br>• p95 is taken from retained samples (`:44`), as in `tests/core/validate.bench.ts`, then printed and asserted ≤ 50 ms (`:48`).<br>**Results:** the record shows a worst p95 of 3.69 ms. The re-run gave 1.80, 3.31, 1.20 and 1.31 ms, over 336, 308, 538 and 521 runs. |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| NLC-NFR-005 | Every ruler mark and object end within 0.5 px of its computed position at the default size, every unit the same length | `tests/layout/ruler.test.ts:178-204` (property test, 300 runs in `pnpm test`; 50 isolated runs in the Verification Run), with the five fixed rulers at `:158-176`. It asserts in Scene units: one unit is one px at the default 400-unit width (AD-007), the reading graph-library NLC TICKET-005's Known Hazard gives "0.5 px at the default size". | Yes |
| NLC-NFR-006 | Every ruler renders in a server environment with no browser globals | `tests/react/ruler.test.tsx:36-52` (79 renders, `window` and `document` undefined; `pnpm test`, CI `Test` step) | Yes. The module graph is CR-001. |
| NLC-NFR-007 | Every rendered ruler exposes a non-empty text alternative to assistive technology | `tests/react/ruler.test.tsx:54-84` with `tests/helpers/axe.ts:24-37` (`axeSvgImage`, `SVG_IMAGE_RULES`); the 78-ruler render at `:42-51` checks a non-empty `aria-label` on every ruler | Yes |
| NLC-NFR-008 | A maximum-length ruler in either unit, with an object, renders in ≤ 50 ms at p95 in a server render on a CI runner | `tests/layout/ruler.bench.ts` (`pnpm bench`). It is in the Verification Run, and CI runs it on every matrix cell (`.github/workflows/ci.yml:75-78`) | Yes. The CI step's name is CR-003. |

*The ticket carries no functional requirement. These four NFRs are verified by tests, and no source changes, so each Code Location is the verifying artifact (step 5). Every NFR in the ticket's Requirements Covered field is listed.*

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/CC-002 | WCAG 2.1 AA non-text content: text alternative (1.1.1), 3:1 for graphical objects (1.4.11), not color alone (1.4.1) | Yes | **1.1.1:** verified by the NLC-NFR-007 test: `role="img"`, a non-empty `aria-label` and a `<title>`, and axe's `svg-img-alt`.<br>**1.4.11:** axe has no rule for SVG stroke contrast. Plan D5 leaves it untested, and the record's Notes state the 330 px minimum (about 210 px for 12 in at sixteenths) with the accessibility results. That is what the carried CR-003 hazard asks. `<RulerGraph>`'s JSDoc (`src/react/graphs/RulerGraph.tsx:11-13`) already says so.<br>**1.4.1:** not affected; no drawing changes. |
| prd/TC-005 | Non-rendering entry points load no React DOM or browser global (glossed by the ticket as server rendering with no browser globals) | Yes | The ticket's gloss is met by the NLC-NFR-006 test (CR-001 on its module graph). TC-005's own text, that validation, source export, the tool handler and the CLI export stay free of React DOM, is covered by `tests/package/node-entry.test.ts` and `tests/package/boundaries.test.ts`, which this ticket does not change. They pass on re-run. |
| prd/OC-001 | Every target verified automatically (not cited by the ticket; relevant to the area) | Yes | The three tests run in `pnpm test` and the benchmark in `pnpm bench`. Both are CI steps, and each fails the build when its target is missed: `expect(p95).toBeLessThanOrEqual(50)` for the benchmark. |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-002 | Layout returns a Scene; geometry suites test Scene data (no DOM) | Yes | The NLC-NFR-005 property asserts on `rulerLayout`'s Scene through `sceneOf`, which also runs `checkScene` (`tests/layout/ruler.test.ts:23-29`). |
| AD-007 | A 400-unit drawing space, every number through `fmt()` | Yes | Expected positions are worked out in the 400-unit space. The 0.02 unit tolerance allows for each end's `fmt()` rounding (±0.005). This follows the Known Hazard's lesson on tolerances below their own rounding. |
| AD-008 | No ids; accessible name through `role="img"`, `aria-label` and a `<title>` child | Yes | `tests/react/ruler.test.tsx:77-79`. The record's "first-child" claim is CR-002. |
| AD-014 | Pure components; invalid input goes to the fallback | Yes | Every render in the three files is a pure `renderToStaticMarkup`. The NLC-NFR-006 regex and the bench's pre-check (`tests/layout/ruler.bench.ts:35`) rule out the fallback. |
| AD-016 | Vitest, fast-check, axe-core for accessibility rules, Vitest bench, development-only tools | Yes | axe-core, the tool AD-016 names, is a devDependency (`package.json`). `pnpm check:deps` reports 0 runtime dependencies. The helper sits beside the existing `tests/helpers/ajv.ts`, and `tsconfig.json` includes `tests`, so lint and typecheck cover it. The CI step's name is CR-003. |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| NLC-NFR-005 | None in source: verified by test | `tests/layout/ruler.test.ts` "drawn to scale with itself" property test (verification row) | Not applicable; coverage row present |
| NLC-NFR-006 | None in source: verified by test | `tests/react/ruler.test.tsx` "every ruler renders on a server" (verification row) | Not applicable; coverage row present |
| NLC-NFR-007 | None in source: verified by test | `tests/react/ruler.test.tsx` "every ruler is named for assistive technology", `tests/helpers/axe.ts` (verification row) | Not applicable; coverage row present |
| NLC-NFR-008 | None in source: verified by test | `tests/layout/ruler.bench.ts` (verification row) | Not applicable; coverage row present |

**Coverage:** No source annotation is expected, because the delivery changes no source. All 4 NFRs have a verification row, in the same form as GSV-NFR-001..003 (`.gener8v/specifications/graph-specification-and-vocabulary.md:231`, `:247-248`).
**Missing:** None.
**Specification table:** Yes. `.gener8v/specifications/number-lines-and-coordinate-graphs.md:240-243` names the four verifying files, and the describe names match the tests. `gener8v-state.py lint` reports 0 errors and 0 warnings.

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `npx vitest run --no-cache tests/layout/ruler.test.ts -t "rulers NLC TICKET-004"` ×50 | 0 ×50 | Yes (1 passed, 27 skipped on each run; 0 failures) |
| `pnpm generate` | not run (skipped by instruction, as it rewrites files) | Yes by probe: `generatedFiles()` from `scripts/generated-files.ts`, compared in memory, matches all 5 committed files. The commit changes nothing under `src/` or `scripts/`. |
| `pnpm lint` | 0 | Yes |
| `pnpm typecheck` | 0 | Yes |
| `pnpm test` ×3, re-run as `npx vitest run --no-cache` ×3 after `pnpm build`, with `GRAPH_GENERATOR_PREBUILT=1` as CI sets it | 0, 0, 0 | Yes (52 files, 1,468 tests passed on each run) |
| `pnpm bench` | 0 | Yes. NLC-NFR-008 p95: 30 cm words 1.80 ms (336 runs), 30 cm one cluster 3.31 ms (308), 12 in words 1.20 ms (538), 12 in one cluster 1.31 ms (521). The GSV-NFR-001 ruler p95 is 0.0230 ms. Vitest's "accessed module export getters" warning appears, as the record notes. |
| `pnpm build` | 0 | Yes |
| `pnpm check:dist` | 0 | Yes (18 built files, no network APIs) |
| `pnpm check:deps` | 0 | Yes (runtime dependencies: 0) |
| `pnpm check:images` | 0 | Yes |
| `pnpm size` | not run (skipped by instruction) | No file under `src/` changed, so the built entries are unchanged since TICKET-003's reviewed sizes |
| `pnpm publint` | 0 | Yes |
| `pnpm attw` | 0 | Yes |
| `pnpm audit` | 0 | Yes ("No known vulnerabilities found", axe-core 4.14.0 included) |
| Not in the record, run by CI: `pnpm check:changesets` | 0 | Not recorded. It checks 0 changesets; this delivery publishes nothing. |
| The record's four mutations | not re-run (each would modify a file) | Replaced by the in-memory mutation probe above for NLC-NFR-005, and by the axe probes (no name, empty name, blank name, unknown ARIA attribute) for NLC-NFR-007 |

*The record's Verification Run is complete, its Status is `Delivered`, and every command re-run exits as recorded.*

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | The ticket's Known Hazard asks for this: extend the NLC-NFR-005 block, or move the generators, rather than write a second generator in `tests/layout/ruler-accuracy.test.ts`. The record states the change from the ticket's Output name, and the specification's row names the file actually used. Nothing downstream reads the unused name. |
| DEL-002 | Reasonable, with CR-001 | Each call builds a fresh JSDOM window with `runScripts: "outside-only"`, evaluates `axe.source` in it and closes it in `finally`. Probe: `axeSvgImage` adds nothing to Node's global object. The module import of `axe-core` does add one global, `__core-js_shared__` (CR-001). The helper is ready for graph-library NLC TICKET-005, which has the same Known Hazard on axe-core. |
| DEL-003 | Reasonable | Server rendering covers all 78 rulers, cheaply. axe covers the densest Scene of each unit and division, plus the example. The accessible structure (role, `aria-label`, `<title>`) does not depend on length, and the 78-ruler render checks a non-empty name on every ruler. |
| Plan D5 (no DEL) | Reasonable | axe has no SVG stroke contrast rule, and in jsdom its `color-contrast` rule only comes back incomplete (probe). The carried hazard asks for the minimum to be stated, not tested, and the Notes state it. D5 is recorded as a plan decision and a Note, not as a DEL. `tests/helpers/axe.ts:7` cites it by that plan label ("rulers NLC TICKET-004 D5"). |
| Deviations: none; a note on Vitest's getter warning | Accepted | The approved plan already contained D1, so "None" is accurate. The warning reproduces, and it can only add to the measured time. |

## Findings

### CR-001: The server-rendering check shares its file with jsdom and axe-core, and importing axe-core leaves a global in Node's realm

**Severity:** Observation
**Location:**
- `tests/react/ruler.test.tsx:2` and `:9` (the `jsdom` and `../helpers/axe` imports), `:36-52` (the NLC-NFR-006 block)
- `tests/helpers/axe.ts:1` (`import axe from "axe-core"`)
- the delivery record's DEL-002 Rationale: "No global is installed, so the server-rendering assertions in the same file stay true"

**Traces To:**
- NLC-NFR-006 ("no browser globals").
- The ticket's NLC-NFR-006 criterion: "else add a ruler test in the same shape". The shape is graph-library NLC TICKET-005's NLC-NFR-002 criterion: "a test runs in a Vitest `node` environment (no jsdom)", in its own file `tests/react/nlc-server-render.test.ts`, apart from `tests/react/nlc-accessibility.test.tsx`.
- DEL-002.

**Description:**
- **What the helper does.** `axeSvgImage` evaluates `axe.source` inside a fresh JSDOM window. The probe confirms it adds nothing to Node's global object, and `window` and `document` stay undefined after it runs.
- **What the import does.** To expose `axe.source`, `import axe from "axe-core"` first loads axe-core's whole bundle as a Node module, when the test file loads. The probe compared `globalThis`'s own property names before and after each import in plain Node:
  - `axe-core` 4.14.0 adds `__core-js_shared__`, the store of its bundled core-js;
  - `jsdom` and `react-dom/server` add none;
  - none of the checked built-in prototypes (`Array`, `String`, `Object`, `Promise`, `Map`, `Set`, `Function`, `RegExp` and others) change.
- **What this means for NLC-NFR-006.** `__core-js_shared__` is not a browser global, and NLC-NFR-006 holds. But the 79 server renders run in a realm where a test-only browser library has already run, and the check looks only at `window` and `document`.
- **What the assertions observe.** The "after" assertion (`:50`) runs before any axe call in file order. So it shows the renders leave no global, not that the helper leaves none. DEL-002's sentence holds for the helper, not for the import.
- **Shape.** TICKET-005 keeps the server render in a file of its own. The record's Notes invite TICKET-005 to add its types beside these cases.

**Impact:** No effect on today's result. A later axe-core or jsdom release could set a browser-like global at import, such as `self` or `HTMLElement`. A render that came to depend on that global would pass here unnoticed. The pattern then spreads to number lines and coordinate graphs, if TICKET-005 extends this file.
**Recommendation:** Do one of the following, and in either case correct DEL-002's Rationale to say what the probe found:
- Move the NLC-NFR-006 block into a file that imports neither `jsdom` nor `../helpers/axe`, for example `tests/react/ruler-server-render.test.tsx`, in TICKET-005's shape. Then update the NLC-NFR-006 row in `## @spec Coverage`.
- Or have the helper read axe-core's source as text, so axe-core never runs in Node's realm. For example: `readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8")`, keeping only `import type` from `axe-core` for the window's type.

**Status:** Fixed
**Resolution:** Approved (separate file + text source): axe-core read as text and evaluated only in the window; NLC-NFR-006 block moved to `tests/react/ruler-server-render.test.tsx`; DEL-002's rationale corrected in Post-Review Amendments; coverage row updated. (2026-10-23)

---

### CR-002: Two sentences in the delivery record claim more than the work shows

**Severity:** Observation
**Location:**
- `tests/react/ruler.test.tsx:79` (`svg.querySelector(":scope > title")`)
- the delivery record's Files Produced line for `tests/react/ruler.test.tsx` ("first-child `<title>`")
- the delivery record's Notes, on the accessibility results: "a first-child `<title>`", and "graph-library CPSE TICKET-008 states it on the documentation page"

**Traces To:**
- AD-008 (the accessible name through `role="img"`, `aria-label` and a `<title>` child) and NLC-NFR-007.
- The ticket's Known Hazard carried from rulers NLC TICKET-003 code review CR-003: "state the 330 px minimum wherever this ticket documents the ruler's accessibility results".

**Description:**
- **The `<title>` position.** `:scope > title` matches a direct child in any position, so the test would pass with the `<title>` drawn last. The markup today puts it first (probe of the example's markup). The record says the test shows a first-child `<title>`.
- **CPSE TICKET-008.** That ticket is not delivered. It carries a Known Hazard to state the minimum on the ruler's documentation page (`.gener8v/changes/graph-library/tickets/component-packaging-and-source-export/TICKET-008.md:48`). The record's present tense reads as if the page already says it.

**Impact:** Small. The accessible name comes from `aria-label` either way. A reader of the record could take the `<title>`'s position as tested, or the documentation page as written.
**Recommendation:**
- Either assert the position the record claims, for example `expect(svg.firstElementChild?.tagName).toBe("title")`, or change both record sentences to "a `<title>` child".
- Reword the Note's last sentence to: "graph-library CPSE TICKET-008 carries a Known Hazard to state it on the documentation page."

**Status:** Fixed
**Resolution:** Approved: the test asserts the `<title>` is the first element child; the CPSE TICKET-008 note corrected in Post-Review Amendments. (2026-10-23)

---

### CR-003: The CI step that now runs the NLC-NFR-008 benchmark is named for validation speed only

**Severity:** Observation
**Location:** `.github/workflows/ci.yml:75-78` (`- name: Validation speed (GSV-NFR-001)`, `run: pnpm bench`)
**Traces To:**
- NLC-NFR-008 ("≤ 50 ms at p95 in a server render on a CI runner").
- AD-016, and the system design's Infrastructure Requirements: "Benchmarks with Vitest bench on the CI runner".

**Description:**
- **What CI runs.** `pnpm bench` runs every `tests/**/*.bench.ts` (`vitest.config.ts`). So CI now runs `tests/layout/ruler.bench.ts` on all four matrix cells, and fails the build when a p95 passes 50 ms. That is the "on a CI runner" half of the target.
- **The step's name.** The step is still called "Validation speed (GSV-NFR-001)".
- **The record.** It does not mention CI enforcement. Its Verification Run measured on the delivery machine.

**Impact:** To find NLC-NFR-008's CI measurement, a reader has to know to look under the validation step. The step's name also suggests that changing it touches only GSV-NFR-001.
**Recommendation:**
- Rename the step, for example to "Benchmarks (GSV-NFR-001, NLC-NFR-008)". This is a trivial config fix.
- Add a line to the record's Notes saying CI enforces NLC-NFR-008 on every matrix cell.

**Status:** Fixed
**Resolution:** Approved: CI step renamed "Benchmarks (GSV-NFR-001, NLC-NFR-008)"; the record notes CI enforces NLC-NFR-008. (2026-10-23)

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Approve | Approved (separate file + text source): axe-core read as text and evaluated only in the window; NLC-NFR-006 block moved to `tests/react/ruler-server-render.test.tsx`; DEL-002's rationale corrected in Post-Review Amendments; coverage row updated. | tests/helpers/axe.ts, tests/react/ruler-server-render.test.tsx, tests/react/ruler.test.tsx, tests/fixtures/rulers.ts, specification |
| CR-002 | Approve | Approved: the test asserts the `<title>` is the first element child; the CPSE TICKET-008 note corrected in Post-Review Amendments. | tests/react/ruler.test.tsx, delivery record |
| CR-003 | Approve | Approved: CI step renamed "Benchmarks (GSV-NFR-001, NLC-NFR-008)"; the record notes CI enforces NLC-NFR-008. | .github/workflows/ci.yml, delivery record |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0
**Notes:**
- All three Observations were fixed in resolution with the Engineer (Thomas Eaves), 2026-10-23, and recorded in the delivery record's Post-Review Amendments.
- Every acceptance criterion is met; the Verification Run passes after the fixes (1,468 tests, three runs).
