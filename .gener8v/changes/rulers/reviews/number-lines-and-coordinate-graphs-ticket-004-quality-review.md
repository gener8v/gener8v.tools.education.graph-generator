# TICKET-004: Verify ruler accuracy, server rendering, accessibility and performance — Quality Review

## Summary

I reviewed the test-only delivery for the ruler's four measurable checks at HEAD (`f2b5891`). It adds a property test to the NLC-NFR-005 block, a shared axe helper, a server-rendering and accessibility test, a rendering benchmark, and the axe-core devDependency. The tests follow their neighbours closely and pass: lint, typecheck, the full suite (1,468 tests), `bench` and `check:deps` all exit 0. Mutants show they catch the faults they claim to:
- the new property alone, in the layout test file, kills wrong mark positions at halves, quarters and eighths, at 13 to 29 cm, and two unequal units;
- a layout that reads `window` fails the server-rendering test;
- a `<title>` drawn as `<desc>` fails every accessibility case.

The findings are all about what is still left to chance or left implicit:
- whether every unit is the same length is checked on every ruler only by sampling, and a fault in one ruler survives about one run in ten (QR-001);
- the property's oracle uses `locatedValue`, but never on an end where it changes anything, and the bar-end check now exists twice (QR-002);
- the accessibility test checks less than the delivery record says: `<title>` moved to last child passes, and the "after" check covers `window` only (QR-003);
- the shared axe helper drops axe's `incomplete` results and the failing node (QR-004);
- the p95 code is now in two bench files, with a third planned (QR-005);
- the CI step that runs the new benchmark is named for validation only (QR-006).

There are 6 findings: 0 Critical, 0 Concerns and 6 Suggestions.

**Reviewer:** `quality-reviewer` agent, fresh context (findings phase only, 2026-10-23)
**Delivery Record:** `.gener8v/changes/rulers/delivery/number-lines-and-coordinate-graphs-ticket-004-delivery.md` (DEL-001 to DEL-003; Post-Review Amendments: none)
**Code and security reviews:** running at the same time as this one and not read, so a finding here may overlap one of theirs.

**Files Reviewed:**
- `tests/layout/ruler.test.ts` (the new property at `:178-204`, and the NLC-NFR-005 and measured-object blocks it joins)
- `tests/helpers/axe.ts`
- `tests/react/ruler.test.tsx`
- `tests/layout/ruler.bench.ts`
- `package.json`, `pnpm-lock.yaml` (`axe-core` `^4.14.0`, resolved 4.14.0, devDependency)
- `.gener8v/specifications/number-lines-and-coordinate-graphs.md` (the four `@spec Coverage` rows; read only)
- Read for pattern consistency, not changed here:
  - tests: `tests/core/validate.bench.ts`, `tests/react/Graph.test.tsx`, `tests/react/SceneSvg.test.tsx`, `tests/layout/kit/ruler.test.ts`, `tests/core/ruler.test.ts`, `tests/core/ruler-definition.test.ts`, `tests/package/node-entry.test.ts`;
  - test support: `tests/fixtures/rulers.ts`, `tests/fixtures/plain-text.ts`, `tests/helpers/ajv.ts`, `tests/setup/build.ts`;
  - source: `src/layout/ruler.ts`, `src/layout/kit/ruler.ts` (`drawRulerMarks`), `src/core/ruler.ts` (`rulerScale`, `locatedValue`), `src/layout/kit/format.ts` (`fmt`), `src/react/SceneSvg.tsx`, `src/react/graphs/RulerGraph.tsx`;
  - config: `vitest.config.ts`, `tsup.config.ts`, `.github/workflows/ci.yml`;
  - `.gener8v/changes/graph-library/tickets/number-lines-and-coordinate-graphs/TICKET-005.md` (the ticket the helper is shared with).

**Findings:** 6
**Critical:** 0 | **Concerns:** 0 | **Suggestions:** 6

## Quality Assessment

### Code Organization

**Rating:** Strong
**Notes:**
- **Placement follows the ticket and the tree.**
  - The property sits in the existing NLC-NFR-005 block and reuses `rulerWithObject` and `plainRuler`, as the Known Hazard asked (DEL-001), rather than adding a second generator.
  - The axe setup is a helper in `tests/helpers/`, beside `ajv.ts`, the other shared test tool.
  - The React tests are in `tests/react/`. The bench is at `tests/layout/ruler.bench.ts`, where the ticket's Output put it, and where graph-library NLC TICKET-005 is told to put its own (`tests/layout/nlc-render.bench.ts`).
- **Built for reuse.** `axeSvgImage` and `SVG_IMAGE_RULES` take only markup and return plain data, so TICKET-005 can call them unchanged (DEL-002).
- **The dependency stays dev-only.** `axe-core` is a devDependency. `pnpm check:deps` reports "Runtime dependencies: 0, all justified."
- **No source touched.** The delivery changes tests, the lockfile and the specification's coverage table only.

### Readability

**Rating:** Strong
**Notes:**
- **Comments say why.**
  - The bench explains its placeholder guard ("would time the wrong thing") and Vitest's export-getter warning.
  - The helper explains why mark contrast is not among its rules (D5) and why `passes` is returned ("tell a pass from a rule that never ran").
  - The property explains where its expected positions come from.
- **Test names describe behaviour,** in the style of the rest of the file, and the long one-line assertions match it too (for example `tests/layout/ruler.test.ts:167` and `:174`).
- **Small slips:**
  - one comment claims more than its inputs exercise (QR-002);
  - the case names read "12 inches to halfs", and give the sixteenths ruler as plain "12 inches" (QR-003).

### Error Handling

**Rating:** Adequate
**Notes:**
- **Failures carry their context.**
  - The server-rendering loop passes each description as the assertion message (`tests/react/ruler.test.tsx:47`).
  - `textAlternativeOf` throws with the validation issues.
  - The bench asserts with its p95 summary, and throws "No latency samples were kept; set benchmark.retainSamples" rather than reading `undefined`.
  - fast-check prints the counterexample and seed.
- **The helper cleans up.** It closes its JSDOM window in `finally`, so a failed axe run leaks no window.
- **Gaps:**
  - An axe violation is reported as rule id and help text only, without the failing element or axe's failure summary (QR-004).
  - `rulerScale(...)!` in the test helpers would fail with a bare `TypeError` on a ruler that does not exist. Every caller passes an `EVERY_RULER` entry, so this is acceptable in a test.

### Test Coverage

**Rating:** Strong
**Notes:**
- **Commands run** (from `context.md`'s `## Repositories` row for `.`: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`, plus the delivery record's checks that apply to a test-only change):

  | Command | Exit | Result |
  |---------|------|--------|
  | `pnpm lint` | 0 | no problems |
  | `pnpm typecheck` | 0 | no errors |
  | `npx vitest run --no-cache tests/layout/ruler.test.ts tests/react/ruler.test.tsx --reporter=verbose` | 0 | 2 files, 38 tests passed; the new property took 135 ms, the 79 server renders 153 ms |
  | `pnpm test`, run as `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache` | 0 | 52 files and 1,468 tests passed; the text kit's timing test did not flake |
  | `GRAPH_GENERATOR_PREBUILT=1 pnpm bench` | 0 | 13 bench tests passed. NLC-NFR-008 p95: 30 cm words 1.6968 ms (339 runs), 30 cm one cluster 3.2407 ms (317), 12 in words 1.2020 ms (524), 12 in one cluster 1.2737 ms (527). GSV-NFR-001 ruler p95 0.0227 ms (15,235). Four "Benchmark Warning" blocks on stderr, one per ruler case (QR-006) |
  | `pnpm check:deps` | 0 | "Runtime dependencies: 0, all justified." |
  | `npx vitest run --no-cache tests/layout/ruler.test.ts -t "rulers NLC TICKET-004"` ×10 | 0 each | 10 of 10 passed (the record ran it 50 times) |

- **Not run:**
  - `pnpm build`: `tsup.config.ts` sets `clean: true`, which empties `dist/` during the build, and the package tests of the two reviewers running alongside this one read `dist/`. No source changed: `dist/` was built at 12:44, after the last `src/` commit at 12:12, and the package tests passed against it. I set `GRAPH_GENERATOR_PREBUILT=1` so the test global setup did not rebuild it either.
  - `pnpm generate` and `pnpm size`, by instruction.
  - `pnpm audit`, which needs the network and belongs to the security review.
- **What the tests cover.** Every acceptance criterion has a test, and each runs in CI, the bench through `pnpm bench`:
  - **NLC-NFR-005.** The property checks, over 300 generated rulers, that every mark lies within 0.5 of its value's position and that every whole unit is within 0.02 of `RULER_EDGE / length`. Half the cases carry an object, and for those it checks both bar ends within 0.5. The 0.02 allows for `fmt`'s two-decimal rounding at each end (worst case 0.01), so there is no ulp hazard.
  - **NLC-NFR-006.** The 78 rulers and the example are rendered through both components, each matched against `/^<svg role="img" aria-label="A ruler[ ,]/` so the placeholder cannot pass.
  - **NLC-NFR-007.** For the example and the five maximum-length rulers, the test checks `role`, `aria-label` and `<title>` against `createGraph`'s text alternative, plus the axe results. A control (a nameless SVG must violate `svg-img-alt`) shows the rule really runs.
  - **NLC-NFR-008.** The bench fails before timing anything if the render falls back to the placeholder.
- **Mutations.** No source file was modified. A Vitest config in the scratchpad has a Vite `load` hook that serves a mutated copy in place of one module. The module id stays the same, so relative imports still resolve. `git status` stayed clean throughout. Each mutant loaded exactly once (logged).

  | Mutant | In | Result |
  |--------|----|--------|
  | Bar ends +0.6 (control) | `src/layout/ruler.ts` `xOf` | Killed: the new property and three older tests |
  | Bar ends from the raw value, not `locatedValue` | `src/layout/ruler.ts` `xOf` | Survives all 38: a difference of at most 1e-9 of a mark, which cannot show in the drawing (TICKET-003 QR-003) |
  | Layout reads `window.devicePixelRatio` | `src/layout/ruler.ts` | Killed: the NLC-NFR-006 render test and all six NLC-NFR-007 cases, via `internal_error` and the placeholder |
  | Half, quarter and eighth inch marks +0.6 | `src/layout/kit/ruler.ts` | Killed. In `tests/layout/ruler.test.ts` only the new property fails, and the kit's `EVERY_RULER` test also fails |
  | 13–29 cm, marks past the middle +0.6 | `src/layout/kit/ruler.ts` | Same as the row above |
  | First whole mark +0.04, at lengths outside the five fixed ones | `src/layout/kit/ruler.ts` | Killed by the new property and the kit's mark-gap test |
  | 11 in at halves, half marks +0.6 | `src/layout/kit/ruler.ts` | The kit's `EVERY_RULER` test kills it every time. The new property on its own killed it in 22 of 25 runs (QR-001) |
  | 11 in at halves, first whole mark +0.04 | `src/layout/kit/ruler.ts` | Killed only by the new property, which samples (QR-001) |
  | Every mark +0.4 | `src/layout/kit/ruler.ts` | Within the NFR's tolerance. Killed only by the fixed tests' exact edge ends (`tests/layout/ruler.test.ts:165-166`) |
  | `<title>` drawn as `<desc>` | `src/react/SceneSvg.tsx` | Killed: all six NLC-NFR-007 cases |
  | `<title>` appended last, not first | `src/react/SceneSvg.tsx` | Survives all 10 tests in `tests/react/ruler.test.tsx`. `SceneSvg.test.tsx` and `Graph.test.tsx` fail 26 tests (QR-003) |

- **Probes** (`npx tsx`):
  - **axe-core.** Importing it, and running it through the helper's steps, leaves `window`, `document` and `axe` undefined in Node. The 30 cm ruler's markup gives no violations, all five rules pass, and `incomplete` is empty. An unknown rule id is rejected ("unknown rule `svg-img-alt-typo` in options.runOnly"), so a typo in `SVG_IMAGE_RULES` cannot silently drop a rule. An invalid `aria-hidden` value is a violation. With `aria-label` removed, `svg-img-alt` still passes through `<title>`, and three of the ARIA rules become inapplicable rather than failing (QR-004).
  - **`locatedValue`.** Across all 7,068 marks of the 78 rulers, `locatedValue(scale, mark.value)` returns `mark.value` every time. Written as `index * (1 / marksPerUnit)`, 1,661 of them are not exact (for example 0.30000000000000004) (QR-002).
- **Gaps:**
  - equal units on every ruler are only sampled (QR-001);
  - the oracle and a duplicated check (QR-002);
  - the title's position and globals after axe are unchecked (QR-003);
  - the helper's dropped results (QR-004).

### Observability & Operability

**Rating:** Adequate
**Notes:**
- **The measurement is printed.** The bench prints one `NLC-NFR-008 <case>: p95 … ms over … runs` line per case on every run, in the shape of GSV-NFR-001's (QR-002 of GSS TICKET-002), so the CI log records the margin as well as the pass.
- **Failures are attributable.** Each case is its own named test. The bench names the case and its p95 in the failing assertion, and fast-check prints the failing ruler.
- **No logging is expected.** The package is a pure library with no logger. Test code here needs none beyond the bench's summary line.
- **Two gaps (QR-006):**
  - the CI step that runs `pnpm bench` is still named "Validation speed (GSV-NFR-001)", so a slow ruler render appears as a validation failure;
  - every bench run prints four "Benchmark Warning … can make results unreliable" blocks. The source comment explains them, but the log does not.
- **Performance, in context.** The worst p95 is 3.24 ms against a 50 ms budget. The new tests add about 0.3 s to `pnpm test`, mostly the 79 renders and six axe runs (each evaluates axe's ~500 KB source in a fresh window, 19 to 67 ms). That is proportionate. Nothing to flag.

## Findings

### QR-001: Equal units are checked on every ruler only by sampling: a fault in one ruler's units passes about one run in ten

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/layout/ruler.test.ts:178-204` (the property, `numRuns: 300`, over `fc.oneof(rulerWithObject, plainRuler)`), `tests/layout/ruler.test.ts:158-168` (equal units at five fixed rulers); compare `tests/layout/kit/ruler.test.ts:48-71` and `:108-120` (loops over `EVERY_RULER`) and `tests/fixtures/rulers.ts:3-7`
**Description:**
- **The domain is small and listed.** Mark positions and unit lengths depend only on the unit, the division and the length, so there are 78 rulers. `EVERY_RULER` lists them all, and its comment says they are "few enough to test every one rather than sample them (quality review QR-003)". The kit tests and the core tests loop over all 78.
- **The new property samples them.** Each run draws one ruler, so any one ruler has a 1-in-60 to 1-in-120 chance per run. An 11 in ruler at halves, for example, has odds of 1/2 × 1/12 × 1/5. Over 300 runs, the chance of never drawing it is (1 − 1/120)^300 ≈ 8%.
- **Positions are covered elsewhere; equal units are not.**
  - Moving one ruler's half marks 0.6 off (11 in at halves) is caught every time by the kit's `EVERY_RULER` position test. The new property on its own caught it in 22 of 25 runs.
  - Moving that ruler's first whole mark 0.04 keeps every mark within 0.5, but makes two units 0.04 unequal. Only the new property catches that, with the same sampling odds. The five fixed rulers do not include it, and the kit's gap test does not notice 0.04.
- **The property is otherwise effective.** Three kit faults that the older layout tests miss fail it (see Test Coverage). The gap is only that, for one requirement, the gate is probabilistic over a domain the suite already enumerates.

**Impact:** A regression in the unit lengths of one ruler outside the fixed five would fail some CI jobs and pass others: the four matrix cells draw their own seeds. That reads as a flaky test, not a fault. It would be caught in the end, but not on the run that introduced it.
**Recommendation:**
- Check marks and whole-unit lengths deterministically, over every ruler. `for (const [unit, division, length] of EVERY_RULER)`, through `sceneOf`, with the same 0.5 and 0.02 checks; laying out 78 rulers is cheap.
- Keep the fast-check property for what is open-ended: the object's two ends, and whether a bar is present.
- The fixed "puts every mark within 0.5 units of its value's position" test (`:170-176`) is then a subset and can go. Keep the `it.each`'s exact edge-end assertions (`:165-166`), the only test that catches every mark 0.4 off.

**Status:** Fixed
**Resolution:** Approved: marks and equal whole units are checked deterministically over all 78 rulers (`EVERY_RULER`); the fixed five-ruler mark test, now a subset, is removed and the exact edge-end `it.each` kept. A mutant moving the 11 in-at-halves ruler's first whole mark 0.04 fails every run. Recorded in the delivery record's Post-Review Amendments (2026-10-23).

---

### QR-002: The property's object ends are always exact mark values, so `locatedValue` in its oracle never changes an expected position, and the bar-end check is now written twice

**Category:** DRY
**Severity:** Suggestion
**Location:** `tests/layout/ruler.test.ts:179-180` (the comment), `:197-200` (bar ends against `expectedX(locatedValue(scale, …))`), `:107-115` (`rulerWithObject`, ends from `scale.marks[i]!.value`), `:318-320` (the same bar-end check in the NLC-REQ-055 property, without `locatedValue`), `:227-230` (`barEnds`, scoped to the measured-object block and re-written inline at `:198`)
**Description:**
- **The oracle's rule never applies.** The comment says each expected end is "the mark it is located at (`locatedValue`), the rule the layout shares", as the Known Hazard asked. But the generator writes every end as the mark's own exact value. A probe over all 7,068 marks of the 78 rulers found `locatedValue` returns its input every time. Written as a caller's code would compute them (`index * (1 / marksPerUnit)`), 1,661 of those values are not exact, for example 0.30000000000000004.
- **What that leaves.** The property never feeds a computed end through validation and layout. That path is tested once, on one 30 cm ruler (`:240-246`). It is also well covered in core, so this is a readability point, not a coverage gap:
  - the noise property in `tests/core/ruler.test.ts:213`;
  - the computed-end cases in `tests/core/ruler-definition.test.ts:119-120` and `:255-258`.
- **Two copies of one check.** Both fast-check properties in the file assert bar ends within 0.5 over the same `rulerWithObject` generator: the new one with `locatedValue`, the NLC-REQ-055 one without. For every generated input they are the same assertion.
- **A third copy of a helper.** The new property re-writes `barEnds` inline, because that helper is declared inside another `describe`.

**Impact:** A reader sees `locatedValue` in the oracle and concludes the property covers computed ends. It does not. If the rule or the tolerance for bar ends changes, it must be changed in two properties, and the copy in the text property is easy to miss.
**Recommendation:**
- Make the comment true. Give the generator an arm that writes each end as `scale.marks[i]!.index * (1 / scale.marksPerUnit)`, so about a quarter of the ends carry noise. Or say plainly that the oracle matches the layout's rule, and that computed ends are tested at `:240-246` and in core.
- Move `barEnds` to module scope and use it in both places.
- Drop the bar-end assertions from the NLC-REQ-055 property (`:318-320`). That property is about text, and NLC-NFR-005 now owns the ends.

**Status:** Fixed
**Resolution:** Approved: `rulerWithObject` writes each end either exactly or as `index × (1 / marksPerUnit)`, so computed ends reach validation and layout; the property now checks object ends only; `barEnds` is at module scope; the duplicate bar-end check is dropped from the NLC-REQ-055 text property. Recorded in the delivery record's Post-Review Amendments (2026-10-23).

---

### QR-003: The server-rendering and accessibility tests check less than the delivery record says: `<title>` moved to last child passes, and the "after" check covers `window` only, before axe has run

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/react/ruler.test.tsx:79` (`:scope > title`), `:50` (`typeof window` only), `:36-52` (the NLC-NFR-006 block, which runs before the axe cases), `:59` (case names), `:68-70`; `.gener8v/changes/rulers/delivery/number-lines-and-coordinate-graphs-ticket-004-delivery.md` Files Produced ("first-child `<title>`"), Acceptance Criteria Verification ("`window` and `document` asserted undefined before and after") and Notes ("a first-child `<title>`")
**Description:**
- **The title's position.** `svg.querySelector(":scope > title")` matches a `<title>` at any child position. A mutant of `SceneSvg` that appends `<title>` last passes all 10 tests in this file. `tests/react/SceneSvg.test.tsx` (`:61-66`, `:78-79`) and `Graph.test.tsx` fail 26 tests between them, so the suite catches it. But the record states "first-child `<title>`" as this ticket's accessibility result, and this test does not check it.
- **Globals after the run.** The record says `window` and `document` are asserted undefined before and after. The check at `:50` covers `window` only. It also runs in the first `describe`, before any axe case, so nothing asserts the helper's claim that "no browser global reaches the Node environment" (`tests/helpers/axe.ts:19-21`). A probe confirms the claim holds today.
- **Case names.** `${division}s` gives "12 inches to halfs". The default division has no name, so the sixteenths ruler, the densest inch ruler, shows as plain "12 inches".
- **A test of the table.** "covers the example and five maximum-length rulers" asserts the length of the test's own table, so it can only fail if the filter at `:58` changes.

**Impact:**
- A change that moved `<title>` would fail other files, not the one that states the ruler's accessibility result.
- A future helper change that installed globals would leave NLC-NFR-006's "no browser globals" true only by test order.
- The names make a failure report harder to read.

**Recommendation:**
- Assert the position: `expect(svg.firstElementChild?.tagName).toBe("title")` and `expect(svg.firstElementChild?.textContent).toBe(alternative)`.
- Assert both globals undefined after the render loop (`:50`), and again in a last test, or an `afterAll`, after the axe cases.
- Name the divisions from a table, `{ half: "halves", quarter: "quarters", eighth: "eighths", undefined: "sixteenths" }`, so every case reads "12 inches to …".
- Fold the count check into the `it.each` table, for example `expect(rulers).toHaveLength(6)` beside its definition, or drop it.

**Status:** Fixed
**Resolution:** Approved: the `<title>` is asserted first child (with CR-002); `window` and `document` are asserted undefined in an `afterAll` after the axe cases; case names come from a table (halves … sixteenths); the table's count check sits beside it. Recorded in the delivery record's Post-Review Amendments (2026-10-23).

---

### QR-004: The shared axe helper drops axe's `incomplete` results and the failing nodes, so a rule that cannot decide passes silently and a violation does not say where

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/helpers/axe.ts:11-16` (`AxeSvgResult`), `:29-33` (the run and its mapping); `tests/react/ruler.test.tsx:80-82`
**Description:**
- **What axe returns.** axe sorts each rule into `violations`, `passes`, `incomplete` ("needs review") or `inapplicable`.
- **What the helper keeps.**
  - It returns `violations`, as `id: help`, and the ids in `passes`.
  - A rule that comes back `incomplete` is in neither list, so `expect(violations).toEqual([])` passes.
  - Only `svg-img-alt` has an assertion that it ran. The four ARIA rules could all become inapplicable or incomplete without failing anything. That is exactly what happens to three of them when `aria-label` is removed (probe). Here the explicit `getAttribute` check catches that case.
- **No location.** A violation string has no target and no failure summary. For the ruler's one `<svg>` that is enough. graph-library NLC TICKET-005 will reuse the helper for number lines and coordinate graphs (its Known Hazards), where it may not be.
- **Today's results are clean.** The 30 cm ruler's `incomplete` is empty, and all five rules pass.

**Impact:** The helper is the shared definition of "passes the axe rules for SVG images" (NLC-NFR-003, NLC-NFR-007). A "needs review" result for a later graph type would be reported as a pass. A real violation would name the rule but not the element, so whoever fixes it must re-run axe by hand.
**Recommendation:**
- Return `incomplete: results.incomplete.map((rule) => rule.id)`, and assert it is `[]` in the tests.
- Write each violation as `${rule.id}: ${rule.help} (${rule.nodes.map((node) => `${node.target.join(" ")}: ${node.failureSummary}`).join("; ")})`.
- Where the markup is known to carry every attribute, assert the full set: `expect(passes.sort()).toEqual([...SVG_IMAGE_RULES].sort())`. That catches a rule that silently stops applying.

**Status:** Fixed
**Resolution:** Approved: `axeSvgImage` returns `incomplete` and writes each violation with its targets and failure summaries; the test asserts `incomplete` empty and every `SVG_IMAGE_RULES` rule passed. Recorded in the delivery record's Post-Review Amendments (2026-10-23).

---

### QR-005: The benchmark's p95 code is a second copy of `validate.bench.ts`'s, and graph-library NLC TICKET-005 is told to write a third

**Category:** DRY
**Severity:** Suggestion
**Location:** `tests/layout/ruler.bench.ts:41-48`; `tests/core/validate.bench.ts:29-36`; `.gener8v/changes/graph-library/tickets/number-lines-and-coordinate-graphs/TICKET-005.md` (Known Hazards: "following `tests/core/validate.bench.ts` (`retainSamples`, a p95 assertion)"; Acceptance Criteria: "the p95 over at least 100 iterations")
**Description:**
- **Two copies.** Both files read `result.latency.samples` and throw when no samples were kept. Both take `samples[Math.floor(samples.length * 0.95)]`, build the same summary, print it with the requirement id and assert it against the limit. Only the requirement prefix differs.
- **A third is planned.** TICKET-005's bench (NLC-NFR-004) is told to follow the same pattern.
- **A rule only one copy would get.** TICKET-005 adds a minimum of 100 iterations, which neither existing copy enforces, so that rule would land in one file only.

**Impact:** The p95 rule, the "no samples" error and the printed line are what CI and the delivery records read. With three copies, a change to any of them (a different percentile rule, a minimum sample count, a different log format) must be made three times, and a copy left behind measures differently from the others.
**Recommendation:** Add `tests/helpers/bench.ts` beside `axe.ts`, for example `expectP95(result, { requirement: "NLC-NFR-008", name, limitMs: 50, minSamples: 100 })`. It would hold the sample guard, the p95, the printed line and the assertion. Use it in both bench files, so TICKET-005 inherits it.

**Status:** Fixed
**Resolution:** Approved: `expectP95` in `tests/helpers/bench.ts` (sample guard, p95, printed line, `minSamples` 100) used by both bench files; Known Hazard appended to graph-library NLC TICKET-005. Recorded in the delivery record's Post-Review Amendments (2026-10-23).

---

### QR-006: The CI step that runs the ruler benchmark is named for validation only, and every run prints four unexplained "Benchmark Warning" blocks

**Category:** Observability
**Severity:** Suggestion
**Location:** `.github/workflows/ci.yml:75-76` ("Validation speed (GSV-NFR-001)", `pnpm bench`); `vitest.config.ts:9` ("Samples are kept so the GSV-NFR-001 bench can compute the p95 it asserts"); `tests/layout/ruler.bench.ts:36-37`
**Description:**
- **The step name.** `pnpm bench` now runs `tests/layout/ruler.bench.ts` as well as the validation bench. A ruler render over 50 ms would fail a check named "Validation speed (GSV-NFR-001)" on the pull request.
- **The config comment** still says only the GSV-NFR-001 bench needs `retainSamples`. The ruler bench depends on it too. It would throw its own clear error if the option were removed, but the comment invites removing it.
- **The warnings.** Each of the four ruler cases prints Vitest's "accessed module export getters too many times. This can make results unreliable" on stderr; the validation bench prints none. The reason, and why it only makes the measurement pessimistic, is in a source comment (`:36-37`), not in the log. Whoever reads the CI log sees four "unreliable" warnings next to the result.

**Impact:** Whoever triages a failed CI run starts from the wrong requirement. A warning block that appears on every run also teaches readers to skip warnings in that log.
**Recommendation:** These are config and comment fixes, outside this ticket's files:
- Rename the CI step to "Speed benchmarks (GSV-NFR-001, NLC-NFR-008)".
- Change the config comment to "so the benches can compute the p95 they assert".
- Add the warning's reason to the bench's printed line, for example `NLC-NFR-008 … p95 1.70 ms over 339 runs (Vitest's export-getter warning above only adds to this time)`, so the log explains itself.

**Status:** Fixed
**Resolution:** Approved: CI step renamed with CR-003; the `vitest.config.ts` comment now covers every bench; the printed NLC-NFR-008 line explains Vitest's export-getter warning. Recorded in the delivery record's Post-Review Amendments (2026-10-23).

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Approve | Approved: marks and equal whole units are checked deterministically over all 78 rulers (`EVERY_RULER`); the fixed five-ruler mark test, now a subset, is removed and the exact edge-end `it.each` kept. A mutant moving the 11 in-at-halves ruler's first whole mark 0.04 fails every run. | tests/layout/ruler.test.ts |
| QR-002 | Approve | Approved: `rulerWithObject` writes each end either exactly or as `index × (1 / marksPerUnit)`, so computed ends reach validation and layout; the property now checks object ends only; `barEnds` is at module scope; the duplicate bar-end check is dropped from the NLC-REQ-055 text property. | tests/layout/ruler.test.ts |
| QR-003 | Approve | Approved: the `<title>` is asserted first child (with CR-002); `window` and `document` are asserted undefined in an `afterAll` after the axe cases; case names come from a table (halves … sixteenths); the table's count check sits beside it. | tests/react/ruler.test.tsx |
| QR-004 | Approve | Approved: `axeSvgImage` returns `incomplete` and writes each violation with its targets and failure summaries; the test asserts `incomplete` empty and every `SVG_IMAGE_RULES` rule passed. | tests/helpers/axe.ts, tests/react/ruler.test.tsx |
| QR-005 | Approve | Approved: `expectP95` in `tests/helpers/bench.ts` (sample guard, p95, printed line, `minSamples` 100) used by both bench files; Known Hazard appended to graph-library NLC TICKET-005. | tests/helpers/bench.ts, tests/core/validate.bench.ts, tests/layout/ruler.bench.ts, graph-library NLC TICKET-005 |
| QR-006 | Approve | Approved: CI step renamed with CR-003; the `vitest.config.ts` comment now covers every bench; the printed NLC-NFR-008 line explains Vitest's export-getter warning. | vitest.config.ts, tests/layout/ruler.bench.ts |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0
**Notes:**
- All six Suggestions were fixed in resolution with the Engineer (Thomas Eaves), 2026-10-23, and recorded in the delivery record's Post-Review Amendments.
- Every command of the Verification Run exits 0 after the fixes (1,467 tests, three runs).
