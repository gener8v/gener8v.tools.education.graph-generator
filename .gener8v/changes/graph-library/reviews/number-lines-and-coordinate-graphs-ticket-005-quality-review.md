# TICKET-005: Verify accuracy, server rendering, accessibility and performance for all axis-based graphs — Quality Review

## Summary

Reviewed the five test-side files delivered at `2ca3f5a` (generators, accuracy property test, server-render test, accessibility test, bench) as first-class code, with `tests/helpers/*`, `tests/fixtures/scene-geometry.ts` and the existing per-type tests as neighbours. The tests are well-organised, run green and reuse the shared helpers (`expectP95`, `axeSvgImage`, `SVG_IMAGE_RULES`, `attr`); the main weaknesses are an oracle that is partly derived from the drawn Scene (so NLC-NFR-001 proves self-consistency more than absolute accuracy), a bench assertion that does not prove the 100-ticks claim it comments, and overlap with assertions the per-type tests already make. 7 findings: 0 Critical, 2 Concerns, 5 Suggestions.

**Files Reviewed:**
- `tests/fixtures/nlc-generators.ts`
- `tests/layout/nlc-accuracy.property.test.ts`
- `tests/react/nlc-server-render.test.ts`
- `tests/react/nlc-accessibility.test.tsx`
- `tests/layout/nlc-render.bench.ts`
- Neighbours: `tests/helpers/bench.ts`, `tests/helpers/axe.ts`, `tests/fixtures/scene-geometry.ts`, `tests/layout/{number-line,xy-graph,xyz-graph,ruler}.test.ts`, `tests/layout/ruler.bench.ts`, `tests/react/ruler-server-render.test.tsx`, `vitest.config.ts`

**Findings:** 7
**Critical:** 0 | **Concerns:** 2 | **Suggestions:** 5

## Quality Assessment

### Code Organization

**Rating:** Strong
**Notes:** One file per requirement, generators in `tests/fixtures/` for reuse, the bench in the path the config actually runs (`tests/**/*.bench.ts`), and the shared helpers reused rather than re-implemented (`expectP95`, `axeSvgImage`, `SVG_IMAGE_RULES`, `attr`). Dependency direction is tests to `src` only. Small local re-implementations of Scene readers are noted in QR-003.

### Readability

**Rating:** Adequate
**Notes:** Comments state the requirement and the reason for each design choice. The xyz test body is about 50 lines of index arithmetic (`starts`, `nodes.slice(starts[k]...)`), and `normalized`'s return type is a nested conditional type that is hard to read (QR-005). The `cases` table in the accessibility test relies on `as` casts.

### Error Handling

**Rating:** Strong
**Notes:** Failures carry context: `near` names the value and both numbers, structural expectations carry `JSON.stringify(input)`, `normalized` throws with the validator's issues if a generator yields an invalid description, `expectP95` reports the sample count. No swallowed errors.

### Test Coverage

**Rating:** Adequate
**Notes:** Every NFR (001-004) has a check that runs under `pnpm test` or `pnpm bench`, and the negative control in the accessibility test and the structural counts show the checks are not vacuous in most places. Gaps: the oracle partly derives from the drawn Scene (QR-001), the bench tick assertion is loose (QR-002), and the property test repeats existing per-type assertions (QR-003). Executed in this review (full output saved under `/private/tmp/claude-501/-Users-thomas-Repositories-gener8v-gener8v-tools-education-graph-generator/90a37181-7c56-4f53-87c3-a87caf6952a9/scratchpad/quality-review-nlc005/`):
- `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache`: exit 0, 76 files, 2,248 tests passed.
- `GRAPH_GENERATOR_PREBUILT=1 npx vitest bench --run --reporter=verbose tests/layout/nlc-render.bench.ts`: passed; `NLC-NFR-004 xy-graph 100 ticks, 50 points: p95 7.2879 ms over 513 runs` (limit 50 ms).
- `pnpm lint` (eslint .): exit 0, no output. `pnpm typecheck` (tsc --noEmit): exit 0, no output.
- Probe (`TSX_DISABLE_CACHE=1 npx tsx -e`): the bench input renders 402 `<line>` (200 grid at stroke-width 1, 202 axes and ticks at 1.5) and 50 `<circle>`; 200 samples of each generator contained points in 171/173/167 (number line/xy/xyz) and segments in 31 (xy only).

### Observability & Operability

**Rating:** Adequate
**Notes:** Not applicable to behaviour (tests only). The test output is operable: the bench prints a requirement-tagged p95 line on every run and assertion messages name the offending value. The failure on a property run relies on fast-check's seed and counterexample output, which `fc.assert` provides by default; the seed for the accessibility samples is fixed and documented in code.

## Findings

### QR-001: The accuracy oracle takes its reference frame from the drawn Scene

**Category:** Testing
**Severity:** Concern
**Location:** `tests/layout/nlc-accuracy.property.test.ts:62-63` (number line), `:83-87` (x,y), `:132-141` (x,y,z)
**Description:** NLC-NFR-001 requires each tick, point and segment end within 0.5 px of its *computed* position. For the number line and the x,y graph the scale `xOf`/`yOf` is built from the drawn axis line's own endpoints (`linearScale([min,max],[x1,x2])`), and the tick set is `niceTicks` from `src`. For the x,y,z graph the translation `dx, dy` is read from the drawn x-axis min end, and the projection is `isometric()` and `AXIS_LENGTH` from `src`. So the test proves that ticks, points and segments are consistent with the axis that was drawn, not that the axis is where the value mapping says it should be, nor that the plot has the specified extent. A layout defect that moves or shortens an axis together with everything on it (a wrong plot offset or length) passes. The delivery record acknowledges the `isometric()` part (DEL-002, mutant not caught) but not the axis-end part, and its mutation evidence covers a point offset and a `linearScale` stretch only.
**Impact:** The test name and the delivery record claim accuracy "within 0.5 px of its computed position"; the guarantee actually given is relative consistency. This is the same shape as the ruler's "drawn to scale with itself" test, which is named as such.
**Recommendation:** Either (a) state the narrower claim in the describe/it names and the `@spec Coverage` row ("drawn to scale with its own axis"), or (b) add an absolute check from the description alone: expected axis ends and plot extent from the layout's published numbers (`planeRooms`/`planeLengths`, the default width) so a shifted or shortened axis fails. Record any residual self-reference in the report as the delivery did for `isometric()`.
**Status:** Resolved
**Resolution:** Fixed with code review CR-001: an absolute reference from the layouts' constants (`tests/fixtures/nlc-reference.ts`). Committed with the code review resolution (`e049ca1`).

---

### QR-002: The bench's tick assertion is satisfied by the grid alone

**Category:** Testing
**Severity:** Concern
**Location:** `tests/layout/nlc-render.bench.ts:30-33`
**Description:** The comment says "50 markers and 200 ticks and axes", but the assertion is `<line` count >= `2 * TICKS + 2` = 202 with `showGrid: true`. The grid alone draws 200 lines and the axes 2 more, so 202 is reached with no ticks drawn. The probe shows the input really renders 200 ticks (402 lines), so the bench is correct today, but the guard that is supposed to stop it timing the wrong input (for example a layout that thins ticks, or an axis spacing the layout widens) cannot do that for ticks. NLC-NFR-004 is specifically "100 ticks per axis".
**Impact:** If the layout ever drew fewer ticks for this input, the bench would keep passing against a lighter workload and the NFR would be reported verified when it was not.
**Recommendation:** Count the tick lines separately, for example `markup.match(/<line [^>]*stroke-width="1.5"/g)` (axes and ticks) at least `2 * TICKS + 2`, or build the tick count from the Scene (`createGraph(description)`) and assert 100 per axis; or drop `showGrid` from the benched input if the grid is not needed for the requirement (it is a legitimate heavier workload, so prefer the first option).
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-30). The bench counts exactly 100 ticks per axis, told apart from grid lines, and 50 points, and checks the markup against the Scene; a render with no ticks fails it. Committed with the code review resolution (`e049ca1`).

---

### QR-003: The property test repeats assertions the per-type tests already make, with local copies of Scene readers

**Category:** DRY
**Severity:** Suggestion
**Location:** `tests/layout/nlc-accuracy.property.test.ts:27-35`; compare `tests/layout/xy-graph.test.ts:530-552` and `:726-748`, `tests/layout/number-line.test.ts:46-58` and `:120-125`, `tests/layout/xyz-graph.test.ts:137`
**Description:** `xy-graph.test.ts` already has an `it` that asserts every marker and segment end within half a unit and a 200-run generated variant doing the same for markers; `number-line.test.ts` and `xyz-graph.test.ts` assert ticks, points and (xyz) axis ends within 0.5 of the linear scale or `isometric()` for fixed examples. The new test adds generated breadth (quarter-unit grids, given and default spacings, ranges excluding zero, decorated elements) and the xyz case across random ranges, which is real value, but the comparison logic is a third copy. `num`, `lines`, `circles` and `near` are redefined locally (`scene-geometry.ts` keeps `num` unexported; the per-type tests each define their own too, so this is the existing pattern rather than a new inconsistency).
**Impact:** A change to how positions are read (a new attribute rounding, a different tick class) now needs updating in four to five places.
**Recommendation:** Export `num` from `tests/fixtures/scene-geometry.ts` (or add a small `tests/fixtures/scene-readers.ts` with `lines`, `circles`, `near`) and use it here; note in the new file's header which per-type tests it supersedes so a later pass can delete the 200-run xy test instead of keeping both.
**Status:** Resolved
**Resolution:** Fixed. `num` exported from `tests/fixtures/scene-geometry.ts`; `lines`, `circles`, `lengthOf`, `isTick`, `near` in `tests/fixtures/scene-readers.ts`; the overlapping per-type tests named in the property test's header. Committed with the code review resolution (`e049ca1`).

---

### QR-004: Generator coverage is thin for segments and not checked

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/fixtures/nlc-generators.ts:85`, `tests/layout/nlc-accuracy.property.test.ts:44-54`
**Description:** In a 200-sample draw of `xyGraphArb` only 31 had any segments (maxLength 4 with an empty array allowed and weighted like any size), so roughly 15% of the 200 runs exercise the segment-endpoint half of NLC-NFR-001. `seen >= RUNS` in `check()` is close to a tautology: `fc.assert` with `numRuns: 200` always invokes the property 200 times unless it throws, so it guards nothing about the distribution; the delivery records the "count asserted" as evidence. Number line and xyz points are present in about 85% of runs, which is fine.
**Impact:** A regression visible only on segments, or on a particular combination (decorated, one-sided range), has a lower chance of being hit on a given run; the guard gives false assurance about coverage.
**Recommendation:** Use `fc.array(..., { minLength: 1, maxLength: 4 })` for segments inside an `fc.oneof` with an empty-array case so non-empty cases dominate, and replace the count with fast-check's `fc.pre`/`fc.statistics` style or a counter of runs that actually had a point or segment (`expect(withSegments).toBeGreaterThan(RUNS / 4)`).
**Status:** Resolved
**Resolution:** Fixed. Points and segments in four of five samples (`usually()`; distinct segment ends, since a zero-length one made the validator reject the description); counters require exactly 200 runs, more than 100 with points, more than 100 with segments (x,y) and more than 50 with guide lines (x,y,z). Capping segments at three passes the old test and fails the new. Committed with the code review resolution (`e049ca1`).

---

### QR-005: Some constructs are harder to read than needed

**Category:** Readability
**Severity:** Suggestion
**Location:** `tests/layout/nlc-accuracy.property.test.ts:37`; `tests/react/nlc-accessibility.test.tsx:18-25` and `:31`; `tests/layout/nlc-accuracy.property.test.ts:120-171`
**Description:** (a) `normalized`'s return type is `ReturnType<typeof validate> extends infer R ? (R extends {...} ? P : never) : never`; `Extract<ReturnType<typeof validate>, { valid: true }>["provenance"]` says the same. (b) The `cases` table is built with `flatMap` over an untyped tuple array and four `as` casts (`type as string`, `arbitrary as fc.Arbitrary<unknown>`) to get back the types the literal lost. (c) `expect(cases).toHaveLength(...)` sits in the `describe` body, so a failure is a collection error rather than a test failure with a name. (d) The x,y,z test is one 50-line closure with closures inside (`unit`, `raw`, `at`, `starts`).
**Impact:** Moderate; the code is correct but a maintainer debugging a failing sample has to decode types and index arithmetic first.
**Recommendation:** Simplify the type, declare `const kinds: Array<[string, fc.Arbitrary<unknown>]>` to remove the casts, move the length check into an `it`, and lift the xyz expected-position function (`meet`, `unit`, `raw`, `at`) into a named helper above the test.
**Status:** Resolved
**Resolution:** Fixed. Typed `kinds` without casts, the length check in an `it`, the x,y,z expected-position code as `xyzReference` and `expectedMoveDown`. Committed with the code review resolution (`e049ca1`).

---

### QR-006: The server-render test is weaker than its ruler sibling and checks only the examples

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/react/nlc-server-render.test.ts:22-37`; compare `tests/react/ruler-server-render.test.tsx:21-45`
**Description:** The ruler version asserts the global object's keys and values are unchanged by the renders (security review SEC-001 of that ticket) and that the markup starts with the expected `<svg role="img" aria-label="A ruler`. The new test asserts `window`/`document` are undefined (re-asserted inside each case, though the file's environment is `node` and nothing in it can change that), `contains("<svg")` and that `<Graph>` and the per-type component agree. A render with an unexpected global read that does not touch `window`/`document` (a `navigator` or `localStorage` use) would not be caught, and the three renders are each one example, not the generated descriptions the accessibility test uses. The invalid-description placeholder is a `<div role="note">` (probed), so `<svg` is a meaningful check; this is not vacuous.
**Impact:** NLC-NFR-002 is "no browser globals"; the check covers the two named globals only.
**Recommendation:** Reuse the ruler's global-snapshot comparison (extract it to `tests/helpers/` and share it, as the ruler file's own comment anticipates the NLC-NFR-002 test absorbing it) and render a few generated descriptions per type as well as the examples; drop the repeated in-test `typeof` assertions.
**Status:** Resolved
**Resolution:** Fixed. `expectNoBrowserGlobalsTouched` in `tests/helpers/browser-globals.ts` (window and document undefined, the global object unchanged), used by the ruler and NLC server-render tests; 5 generated descriptions per type rendered as well; the NLC file imports neither jsdom nor the axe helper. A write to `globalThis` during render passes the old test and fails the new. Committed with the code review resolution (`e049ca1`).

---

### QR-007: `svgOf` leaks a JSDOM window per case; the example loader is copied again

**Category:** Maintainability
**Severity:** Suggestion
**Location:** `tests/react/nlc-accessibility.test.tsx:28`, `:14`; `tests/react/nlc-server-render.test.ts:14`
**Description:** `svgOf` creates a `new JSDOM(markup)` for each of 12 cases and never calls `window.close()`, whereas `axeSvgImage` closes its window in a `finally`. The `JSON.parse(readFileSync(new URL("../../examples/<type>.json", import.meta.url)))` loader is now written in both new files, in `ruler-server-render.test.tsx`, and (with `process`-relative paths) in `tests/layout/xyz-graph.test.ts`.
**Impact:** Minor: windows are short-lived and the process ends, but the pattern differs from the helper it sits beside; the loader copies mean the example directory convention is repeated.
**Recommendation:** Close the window in `svgOf` (or read the attributes with a regex-free parse inside `axeSvgImage`'s result) and put a `loadExample(type)` in `tests/fixtures/` shared by the new and ruler files.
**Status:** Resolved
**Resolution:** Fixed. `svgAttributes` closes its JSDOM window in a `finally`; `loadExample` in `tests/fixtures/examples.ts`, used by the NLC and ruler tests. Committed with the code review resolution (`e049ca1`).

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fix (with CR-001) | Absolute reference | `tests/fixtures/nlc-reference.ts` |
| QR-002 | Fix | Bench counts ticks and points | `tests/layout/nlc-render.bench.ts` |
| QR-003 | Fix | Shared readers | `tests/fixtures/scene-readers.ts`, `tests/fixtures/scene-geometry.ts` |
| QR-004 | Fix | Coverage counters | `tests/fixtures/nlc-generators.ts`, `tests/layout/nlc-accuracy.property.test.ts` |
| QR-005 | Fix | Readability | `tests/layout/nlc-accuracy.property.test.ts` |
| QR-006 | Fix | Shared globals helper; generated samples | `tests/helpers/browser-globals.ts`, `tests/react/nlc-server-render.test.ts`, `tests/react/ruler-server-render.test.tsx` |
| QR-007 | Fix | Closed windows; one loader | `tests/react/nlc-accessibility.test.tsx`, `tests/fixtures/examples.ts`, `tests/react/ruler.test.tsx` |

## Verdict

**Result:** Approved
**Unresolved Findings:** None
