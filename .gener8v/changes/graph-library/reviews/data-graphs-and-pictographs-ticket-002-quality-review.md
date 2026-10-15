# TICKET-002: Line graph — Quality Review

## Summary

I reviewed the line graph at HEAD (`4c93e8f`): delivery commit `2391e8e` plus the code-review fixes for CR-001 to CR-004. The type follows the pictograph's shape: a definition, a layout, a one-line component and an entry, with markers and axis labels added to the kit. Lint, typecheck, the full suite (39 files, 1,026 tests), build, the dist check and the bench all pass. The validation side is careful: the length check always runs, every list is capped, and caller text in the drawing is bounded.

The findings are mostly about what the tests leave unpinned:
- **Where a point sits is not checked against what it is read by.** The suite passes if every point is drawn half a slot left of its category name. It also passes if points use a scale 10% shorter than the axis beside them, so the point for 5 reads as 6.
- **Two core cases pass the suite when broken:** a series longer than the categories, and a scale issue whose path swaps the series and value indexes. The tests use only shorter series and equal indexes.
- **The kit's new axis-label helpers have no kit tests.** The layout also steers the kit with synthetic boxes, so the category-axis label is centred on the drawing rather than under its axis.
- **An empty `categories` list adds one length mismatch per series.** An absent list adds none.

There are 6 findings: 0 Critical, 2 Concerns and 4 Suggestions.

**Reviewer:** `quality-reviewer` agent, fresh context (findings phase only, 2026-10-15)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/data-graphs-and-pictographs-ticket-002-delivery.md` (DEL-001..005, Post-Review Amendments CR-001..004)
**Code review read first:** `.gener8v/changes/graph-library/reviews/data-graphs-and-pictographs-ticket-002-code-review.md` (Approved, all four resolved). None of its findings is raised again. The surviving mutations below are outside the delivery record's 16 and the code review's probes.

The earlier quality reviews in this change set the patterns used here:
- QR-001 applies DGP TICKET-005 QR-001 (pin alignment directly, not only overlaps).
- QR-002 applies DGP TICKET-005 QR-004 (an always-run check gets its own tests).
- QR-004 applies DGP TICKET-005 QR-006 (no placeholder boxes passed to the kit).
- The crowded-columns case (DEL-004, DGP TICKET-005 QR-002) belongs to DGP TICKET-003 and is not raised.

**Files Reviewed:**
- `src/core/definitions/line-graph.ts`
- `src/core/definitions/categories.ts` (`seriesValuesPerCategoryCheck`, `VALUES_DESCRIPTION`)
- `src/core/definitions/types.ts` (`elementsHint`)
- `src/core/definitions/pictograph.ts` (the `values` description), `src/core/definitions/shared.ts` (label descriptions), `src/core/definitions/index.ts`
- `src/core/validate/structure.ts` (`appliesToType`, `checkMap`, `checkStructure`), `src/core/issues.ts` (`inapplicable_property`)
- `src/core/style.ts` (`seriesStyles`)
- `src/layout/line-graph.ts`
- `src/layout/kit/markers.ts`
- `src/layout/kit/value-scale.ts` (axis-label helpers)
- `src/layout/registry.ts`
- `src/react/graphs/LineGraphGraph.tsx`
- `src/entries/line-graph.ts`, `src/index.ts`
- `package.json`, `tsup.config.ts`, `.size-limit.json`
- `examples/line-graph.json`, `examples/invalid/line-graph-length-mismatch.json`, `examples/invalid/line-graph-no-series.json`
- `tests/core/line-graph.test.ts`, `tests/core/series-palette.test.ts`
- `tests/layout/line-graph.test.ts`, `tests/layout/kit/markers.test.ts`, `tests/fixtures/scene-geometry.ts`
- `tests/react/Graph.test.tsx`, `tests/package/per-type-bundle.test.ts`, `tests/core/validate-structure.test.ts` (the additions)
- Read for pattern consistency, unchanged here:
  - `src/layout/pictograph.ts`, `src/layout/circle.ts`, `src/layout/scene.ts`;
  - `src/layout/kit/title.ts`, `text.ts`, `format.ts`, `labels.ts`, `check.ts`;
  - `src/core/validate/domain.ts`, `src/core/result.ts`, `src/core/value-scale.ts`;
  - `tests/layout/pictograph.test.ts`, `tests/layout/kit/value-scale.test.ts`, `tests/core/categories.test.ts`, `tests/core/style.test.ts`;
  - `vitest.config.ts`, `.gener8v/technical-design/system-design.md` (AD-004, AD-005).

**Findings:** 6
**Critical:** 0 | **Concerns:** 2 | **Suggestions:** 4

## Quality Assessment

### Code Organization

**Rating:** Adequate
**Notes:**
- **The type follows the established shape.**
  - The definition is built by a `/* @__NO_SIDE_EFFECTS__ */` factory under `/* @__PURE__ */`, as the pictograph's is.
  - The layout calls its own definition's `describe`. The component is one `createGraphComponent` line, and the entry exports it with its prop types.
  - Each is registered beside the circle's and the pictograph's.
  - The bundle tests prove AD-001 both ways, including a consumer's bundle of the built `./circle` and `./pictograph`.
- **What went where is sound.**
  - `drawMarker` and `MARKER_REACH` form a small kit module of their own (`src/layout/kit/markers.ts`).
  - The per-series length check sits beside `valuesPerCategoryCheck` and uses `ALWAYS_RUNS`.
  - After CR-003 the top-level hint lives in the type's definition (`elementsHint`), not in a table in the shared validator. The validator change is about 20 lines.
- **Dependency direction is right.** The layout imports core and the kit; core imports nothing from layout.
- **`SERIES_LIMIT` (6) and `seriesStyles.length` are coupled only through tests.** `seriesStyleOf`'s `index % seriesStyles.length` would silently reuse a style if the limit were raised alone. `tests/layout/line-graph.test.ts:107-120` and `tests/core/series-palette.test.ts` both fail in that case, so this is noted, not a finding.
- **Weak spots:**
  - The layout passes the kit two boxes that are not the plot: one to centre the category-axis label, one to move the names down (QR-004).
  - The rotated-line arithmetic is written twice in `value-scale.ts` (QR-003).
  - `value-scale.ts` now holds the value axis, the category slots and names, and both axis labels (317 lines). The name no longer covers the contents, but DEL-005 chose the location and it is not a finding.

### Readability

**Rating:** Adequate
**Notes:**
- **Names say what things are:** `seriesStyleOf`, `seriesLabelOf`, `seriesName`, `seriesLine`, `drawLegend`, `axisLabelLines`, `axisLabelDepth`, `MARKER_REACH`, `TOP_TICK_ROOM`, `LEGEND_MAX_LINES`.
- **The doc comments explain why** and cite the decision behind each rule (AD-008, DEL-001, DEL-002, QR-002), in the codebase's style.
- **`lineGraphLayout` (`src/layout/line-graph.ts:140-210`, 70 lines) reads top to bottom** in the order the drawing is built: title, value axis, plot, series, names, axis label, legend. That compares well with `pictographLayout` (83 lines).
- **`drawLegend` (`:76-129`)** measures, flows into rows, then draws.
  - `textWidthOf` (`:122`) reads like a function. It recomputes the text width the entry already knew when it was built, and storing it on `LegendEntry` would be clearer. This is noted, not a finding.
- **`appliesToType`** now returns `true`, `false`, `"elements"` or `undefined`. That is four outcomes, but each is documented and each branch in `checkMap` has a comment.
- **Text that misleads the reader:**
  - `drawCategoryAxisLabel` is documented as "centered under the plot", but its only call centres the label on the drawing (QR-004).
  - Some test names and comments do not match their assertions (QR-006).

### Error Handling

**Rating:** Adequate
**Notes:**
- **Description problems are reported, never thrown.** Each is a typed issue at a JSON Pointer:
  - no series is `missing_property /series`, and a seventh series is `too_large /series`;
  - a series whose length differs is `series_length_mismatch /series/<i>/values`, even beside a failed value or a failed series;
  - a top-level `lineLabel` or `lineColor` is `inapplicable_property`, with "give it on each series instead";
  - a scale too fine to draw is reported, and `createGraph` refuses it (CR-004).
- **The layout assumes a validated description, as the other layouts do.** Every number goes through `fmt()`, which throws on a non-finite value, so a package defect becomes `internal_error` rather than bad markup. The text-alternative branch for a missing value ("no value") cannot be reached after validation and is harmless.
- **Gaps:**
  - An empty `categories` list produces one `series_length_mismatch` per series, a cascade AD-004 rules out. An absent list produces none (QR-005).
  - The scale issue's path is right today, but no test can tell it from one with the indexes swapped (QR-002).

### Test Coverage

**Rating:** Adequate
**Notes:**

**Commands run at HEAD (`4c93e8f`), from the repository root:**

| Command | Exit | Result |
|---|---|---|
| `pnpm lint` | 0 | `eslint .`, no output |
| `pnpm typecheck` | 0 | `tsc --noEmit`, no output |
| `pnpm test` | 0 | 39 files, 1,026 tests passed (13.39 s). Run twice; both exit 0 |
| `pnpm bench` | 0 | GSV-NFR-001: line-graph p95 0.0662 ms over 5,894 runs, pictograph 0.0284 ms, circle 0.0205 ms; limit 5 ms |
| `pnpm build` | 0 | tsup ESM and DTS, including `dist/line-graph.js` and `dist/line-graph.d.ts` |
| `pnpm check:dist` | 0 | "Built files scanned: 12, no network APIs or network modules." |

- `pnpm test`'s global setup and `pnpm build` rewrote the gitignored `dist/`, as expected.
- Some commands were not run:
  - `pnpm size` writes to the system temp directory;
  - `pnpm generate` writes source;
  - `publint`, `attw` and `audit` were re-run by the code review at the fixes.
- `git status --short` after every command and probe showed only the pre-existing change to `.gener8v/runs.jsonl`.

**What the tests cover well:**
- **Every acceptance criterion has a test whose name describes it and cites its requirement.**
  - The validation tests pin exact codes, paths and messages: no series, the series cap, the top-level hint, negatives, the tiny span, and the hostile and smuggled text fixtures.
- **The text alternative is pinned word for word on the example**, including "Series N", blank labels and values as supplied.
- **The geometry property test (200 runs) is the pictograph's pattern applied to lines, markers and rotated text.** It caught four of the placement mutations below.
  - The shared fixture `tests/fixtures/scene-geometry.ts` is a good extraction: one `boundsOf` for both types, with stroke widths and rotation handled.
- **DGP-NFR-004 is checked on the colors a six-series line graph actually draws**, not only on the palette.
- **Caller text is bounded in the drawing:** half a megabyte renders in `<Graph>` and `<LineGraph>` with at most 33 text nodes. A worst-case probe (100 categories of 200-character names, 6 series) runs `createGraph` in 32 ms with a 135,738-character text alternative.

**Gaps, measured by mutation:**
- **Harness.**
  - An inline `node --input-type=module -e` script ran Vitest through its Node API (`startVitest` from `vitest/node`).
  - A Vite `transform` plugin replaced one string in one source module, in memory only, and threw if the string was absent.
  - It ran with `config: false`, `cache: false` and no global setup, so nothing was written: `node_modules/.vite/vitest/…/results.json` kept its timestamp from the `pnpm test` run, and `git status` was unchanged.
  - The first batch ran nine files: `tests/layout/line-graph.test.ts`, `tests/core/line-graph.test.ts`, `tests/core/series-palette.test.ts`, `tests/layout/kit/markers.test.ts`, `tests/layout/kit/value-scale.test.ts`, `tests/core/categories.test.ts`, `tests/core/validate-structure.test.ts`, `tests/core/definitions.test.ts` and `tests/react/Graph.test.tsx`. Its baseline was 279 tests, all passing.
  - The second batch added `tests/graph.test.ts`, for 291 tests.
- **QR-001.** Points shifted along either axis pass every test (L1, L7).
- **QR-002.** A series longer than the categories, and swapped indexes in a scale issue's path, pass every test (C1, C5).
- **QR-003.** A two-line value-axis label printed in reverse order passes (K1).

**Mutation results:**

| Mutation (in memory) | Result |
|---|---|
| L1: each point at its slot's start, not its centre (`src/layout/line-graph.ts:180`) | survives (QR-001). In the example each point sits 31.85 units, half a slot, left of its name |
| L7: points on a value scale 10% shorter than the axis (`:173`) | survives (QR-001). In the example the point for 5 is drawn where the axis reads 6 |
| L6: points 6 units below their ticks (`:173`) | caught, but only by the property tests' tolerances (QR-001) |
| L3: the Scene's height without its bottom margin (`:206`) | survives (QR-001) |
| L4: legend rows left-aligned, not centred (`:115`) | survives (minor) |
| L5: category-axis label without its gap above it (`:197`) | survives (minor: still 1.4 units clear of the names) |
| L10: no room above the top tick (`:30`) | survives (minor) |
| L8: legend rows one line tall (`:126`) | caught (geometry property) |
| L11: legend text centred on its left edge (`:123`) | caught (geometry property) |
| L12: a legend label taken from the next series (`:81`) | caught |
| L13: plot lines drawn among the markers (`:182`) | caught |
| K1: a two-line value-axis label's lines in reverse order (`src/layout/kit/value-scale.ts:296`) | survives (QR-003) |
| K2: the value-axis label centred a third of the way down the plot (`:294`) | caught (geometry property) |
| C1: a series longer than the categories not reported (`src/core/definitions/categories.ts:240`) | survives (QR-002) |
| C5: the scale issue's path with series and value indexes swapped (`src/core/definitions/line-graph.ts:55`) | survives (QR-002) |
| C7: the mismatch message counts the series' values as the categories (`src/core/definitions/categories.ts:243-245`) | caught |
| C8: an empty `series` reported only when there are categories (`:233`) | survives (minor: `categories: []` with `series: []` is untested; the code review probed it) |
| C3: `seriesLabelOf` trims instead of calling `cleanText` (`src/core/definitions/line-graph.ts:40`) | survives (low impact: validation refuses what `cleanText` removes) |
| MK1: the triangle drawn point-down (`src/layout/kit/markers.ts:47-51`) | survives (cosmetic) |

### Observability & Operability

**Rating:** Adequate
**Notes:**
- **This is a library, and the delivery adds no logging, which is right.** By design there is no runtime network and no telemetry (`.gener8v/context.md`), and nothing under `src/` logs.
- **Description problems surface as typed issues with JSON Pointers and messages that name the fix.**
  - A length mismatch says "give one value per category".
  - A top-level series option says "give it on each series instead".
  - A scale issue says "widen the scale or leave the scale out".
- **The `elements` hint appears only in the message, not as a field.** That matches `graphType` and `term`: only `expected`, `range`, `conflicts`, `suggestion` and `allowed` are public issue fields (`src/core/issues.ts:396-406`).
- **Package defects in the drawing throw and become `internal_error`,** the established design. Nothing in the delivery swallows a failure.
- **The path is the caller's handle on a fault.** Correct paths for values in any series are unpinned (QR-002), and an empty category list adds issues a caller does not need to act on (QR-005).

## Findings

### QR-001: Where a point sits is unpinned against its category name and its value's tick: points half a slot to the left, or on a scale 10% shorter than the axis, pass the suite

**Category:** Testing
**Severity:** Concern
**Location:**
- Tests in `tests/layout/line-graph.test.ts`:
  - `:52-76` asserts evenly spaced x positions, and a linear value-to-height map fitted to the drawn points themselves;
  - `:273-293` asserts each marker's box centre is within 3 units of the plot;
  - `:207-224` (`geometryProblems`) bounds the bottom by `scene.height`, not its margin.
- Code: `src/layout/line-graph.ts:172-183` (slots, `valuePosition`, the points) and `:206` (the Scene's height).
- Pattern:
  - `tests/layout/pictograph.test.ts:286` ("…every picture centered on the name"; DGP TICKET-005 QR-001's alignment tests);
  - `tests/layout/kit/value-scale.test.ts:304` (ticks at the box's ends, exactly in proportion between).

**Description:** The layout tests assert this about a point:
- the x positions are evenly spaced;
- the y positions follow one linear map. The map's anchor (`y0`) and slope (`perUnit`) are taken from two drawn points, so the test proves only that the points agree with each other;
- each marker covers its point;
- each marker's box centre is within 3 units of the plot's top and bottom.

They never compare a point with the category name below it, or with the tick for its value. Each of these mutations passes all 279 tests in the nine files that validate or draw a line graph (harness under Test Coverage):
- **L1: every point at its slot's start.** In the shipped example each point sits 31.85 units, half a slot, left of its name, and Monday's point is drawn on the value axis.
- **L7: points on a scale 10% shorter than the axis.** In the example the point for 5 is drawn 12 units above the "5" tick, where the axis reads 6. A value at the scale's minimum floats 24 units above the axis line.
- **L3: the Scene's height without its bottom margin.** The legend's last line then touches the drawing's edge.

L6, which draws every point 6 units below its tick, is caught. That depends on generated data often having a value near the scale's minimum, beyond the 3-unit tolerance. A shift of 2 units would pass.

Today the layout is right:
- in the example every point's x equals its name's x, and every point's y equals the tick height for its value (both differences 0, probed);
- a 300-run probe of random line graphs found exactly `SCENE_MARGIN` (16) between the lowest node and the Scene's bottom every time.

**Impact:**
- A line graph is read through two alignments: which category a point belongs to, and what value it has. A regression in either would misstate every value in every drawing, and CI would stay green.
- `.gener8v/context.md` names mathematical correctness as the main correctness risk.
- The bar graph (DGP TICKET-003) places bars by the same slots and `valuePosition`, and will likely copy these tests.

**Recommendation:** In `tests/layout/line-graph.test.ts`:
- **Pin x to the names.** In the example, each series' i-th point has the x of the i-th category name's text node (unrotated names are anchored at the slot's centre). Add a rotated case, checked against the centre of the name's lines.
- **Pin y to the axis.** Read the tick lines drawn left of the axis and their labels. Assert that each point's y is the tick's y for its value:
  - exactly, for the example's 5, 0 and 10;
  - by linear interpolation between the neighbouring ticks for the other values.

  Add the same check to the geometry property, for default scales.
- **Tighten `:286-287`.** Recover the point from the polyline's vertex, or from the marker's known shape, and compare it with the plot's exact top and bottom instead of allowing ±3.
- **Bound the bottom by the margin** in `geometryProblems`: `b.y1 > scene.height - SCENE_MARGIN + 0.02`. The delivered layout passes this, and L3 fails it.

**Status:** Resolved
**Resolution:** Resolved — `tests/layout/line-graph.test.ts` now checks where each point is drawn.
  - A point sits under its category's name and level with its value on the axis, read off the drawn ticks (`ticks`, `heightOf`); the point for 5 is level with the tick labeled 5.
  - A property test checks every point at its slot's centre and its value's height, and the bottom margin below the lowest drawn thing.
  - Points half a slot left, a scale 10% short, and a lost bottom margin now each fail a test.

  Approved by the user, 2026-10-15.
**Resolution:** —

---

### QR-002: A series longer than the categories, and a scale issue whose path swaps the series and value indexes, pass the suite; `seriesValuesPerCategoryCheck` has no tests of its own

**Category:** Testing
**Severity:** Concern
**Location:**
- Code:
  - `src/core/definitions/categories.ts:225-252` (`seriesValuesPerCategoryCheck`; the length test at `:240`);
  - `src/core/definitions/line-graph.ts:54-56` (`valueScaleCheck`'s per-value `path` and `term`).
- Tests in `tests/core/line-graph.test.ts`:
  - `:90-111` and `:119-124`: every mismatch tested is a shorter list;
  - `:136-138` and `:145-149`: scale issues only at `/series/0/values/0` and `/series/1/values/1`.
- Pattern: `tests/core/categories.test.ts:393-424` (`valuesPerCategoryCheck`'s own tests, from DGP TICKET-005 QR-004).

**Description:**
- **A longer series is untested.**
  - The per-series check is tested only through `validate`, and only with series shorter than the categories: `[4, 1]`, `[]`, `[3, "x"]` and the invalid example.
  - C1 stops reporting a series longer than the categories, and it passes all 279 tests. With C1 in place, 2 categories and `series: [{ values: [1, 2, 3] }]` validate.
  - The layout draws one point per slot, and `describe` states one value per category. The third value would vanish from both the drawing and the text alternative, and no issue would say so.
- **The check has no tests of its own, unlike its sibling.**
  - `valuesPerCategoryCheck` has a describe block of its own: it pins `ALWAYS_RUNS`, a longer and a shorter list, a failed element still counting, and missing lists staying silent.
  - The series check adds an empty-list rule and a per-entry guard (`entry !== null && typeof entry === "object"`), and it has no such block.
  - DGP TICKET-005 QR-004's resolution gave the "always runs, guards itself" contract direct tests for exactly this reason.
- **The scale issue's path is pinned only by equal indexes.**
  - The path is built per value as `pointer("series", s, "values", i)`, and both tests use equal indexes.
  - C5 swaps `s` and `i` and passes all 291 tests in ten files. Under it, series 0's third value is reported at `/series/2/values/0`, while the message still names `series[0].values[2]`.

**Impact:**
- DGP-REQ-016 is about a series whose length differs from the categories. Half of that is unpinned, and a regression would drop data without an issue.
- A JSON Pointer is how a caller or a model finds the value to fix (AD-005; `src/core/result.ts:18-23`). A swapped path points at a different value, or at nothing.

**Recommendation:**
- **In `tests/core/categories.test.ts`,** add a describe block for `seriesValuesPerCategoryCheck` beside `valuesPerCategoryCheck`'s. It should cover:
  - `inputs` is `ALWAYS_RUNS`;
  - a longer and a shorter series;
  - an empty `values`;
  - an empty `series` list reported as `missing_property`;
  - a failed series (`null`) and a non-object entry skipped;
  - missing or failed lists staying silent.
- **In `tests/core/line-graph.test.ts`:**
  - add a longer series to "reports each series whose length differs…";
  - give a scale test unequal indexes, for example series 1's third value, expecting `/series/1/values/2` and `series[1].values[2]` in the message.

**Status:** Resolved
**Resolution:** Resolved — new tests in `tests/core/line-graph.test.ts` and `tests/core/categories.test.ts`.
  - A series longer than the categories is reported.
  - A scale issue at `/series/0/values/2` pins the path's order.
  - `seriesValuesPerCategoryCheck` has its own tests: always runs; too short, empty and too long; an empty list; failed or missing lists.
  - Not reporting long series, or swapping the path, now fails a test.

  Approved by the user, 2026-10-15.
**Resolution:** —

---

### QR-003: The kit's new axis-label helpers have no kit tests, and their rotated-line arithmetic is a second copy of the category names'

**Category:** Testing
**Severity:** Suggestion
**Location:**
- `src/layout/kit/value-scale.ts:270-317`: `AXIS_LABEL_MAX_LINES`, `axisLabelLines`, `axisLabelDepth`, `drawValueAxisLabel` and `drawCategoryAxisLabel`.
- `src/layout/kit/value-scale.ts:228` (`rotatedNameLines`) and `:296` (`drawValueAxisLabel`) share the expression `left + i * lineHeight + (lineHeight - fontSize) / 2 + fontSize * 0.8`. It is the rotated form of `textLines`' baseline (`src/layout/kit/title.ts:31`).
- `tests/layout/kit/value-scale.test.ts` tests every other export of the module (DGP TICKET-001 QR-001).
- The helpers' only tests are `tests/layout/line-graph.test.ts:189-205`.

**Description:**
- **The helpers are tested only through the line graph.**
  - Every other export of `value-scale.ts` (`defaultValueScale`, `resolveValueScale`, `valueTicks`, `drawValueAxis`, `categorySlots`, `drawCategoryNames`) is tested in the kit's own file.
  - The five axis-label exports, which DEL-005 put in the kit for the bar graph, are tested only through the line graph. Those tests check that a rotated value-axis label exists, that the category label's x is 200, and that two long labels make at most four lines between them.
- **K1 passes all 279 tests.** It draws a two-line value-axis label with its lines in reverse order, so the label reads second line first.
- **The rotated-line arithmetic is written twice.** `drawValueAxisLabel` and `rotatedNameLines` each work out where a rotated line goes, with the same expression. A fix to one, such as K1's line order or the baseline offset, does not reach the other.

**Impact:**
- The bar graph (DGP TICKET-003) reuses these helpers as they are, so it will rely on behaviour that no kit test states.
- A reversed label prints caller text out of order, and no test fails.

**Recommendation:**
- **Add kit tests in `tests/layout/kit/value-scale.test.ts`:**
  - `axisLabelLines` gives `[]` for absent or blank text, and for long text at most `AXIS_LABEL_MAX_LINES` lines, ending in "…";
  - `axisLabelDepth` is the line count × the label font size × `LINE_HEIGHT`;
  - `drawValueAxisLabel` turns each line with `rotate(-90 …)`, centres it on the box's height, and places line 0 leftmost, within `axisLabelDepth` of `left`;
  - `drawCategoryAxisLabel` centres its lines where its doc says (see QR-004).
- **Extract one helper for rotated lines side by side,** for example `rotatedLines(lines, left, anchorY, fontSize, anchor)`, and use it in both places.

**Status:** Resolved
**Resolution:** Resolved — the kit tests in `tests/layout/kit/value-scale.test.ts` now cover `axisLabelLines`, `axisLabelDepth`, `drawValueAxisLabel` (line order, reading upward, centring) and `drawCategoryAxisLabel`. The rotated-line arithmetic is one helper, `upwardLines`, used by rotated names and the value-axis label. Reversed label lines now fail a test. Approved by the user, 2026-10-15.
**Resolution:** —

---

### QR-004: The layout steers the kit with synthetic boxes, and the category-axis label is centred on the drawing, not under the axis it labels

**Category:** Patterns
**Severity:** Suggestion
**Location:**
- `src/layout/line-graph.ts:193-197`: `full`, a box as wide as the drawing whose `y` and `height` are never read, passed to `drawCategoryAxisLabel`.
- `src/layout/kit/value-scale.ts:313-317`: `drawCategoryAxisLabel`, documented as "its lines centered under the plot".
- `src/layout/line-graph.ts:191`: `{ ...box, height: box.height + MARKER_REACH }`, a taller plot passed to `drawCategoryNames` to move the names down.
- `tests/layout/line-graph.test.ts:197`: pins the label's `x` at `SCENE_WIDTH / 2`.
- Precedent: DGP TICKET-005 QR-006 (a placeholder box passed to `categorySlots`).

**Description:**
- **The label is not where the plan or the doc puts it.**
  - The plan says the category-axis label "sits centred below the category names", and the kit's doc says "centered under the plot".
  - The call centres the label on the drawing instead, by passing a box that is not the plot.
- **How far off it is, probed with `createGraph`:**
  - In the shipped example, "Day" is at x 200. The plot's centre, and the middle name "Wed", are at 224.74.
  - With tick labels near ±1e9, the plot starts at 128.59, and the label sits 56.3 units left of the plot's centre.
- **The stated reason does not require it.** The layout comment says it is "so a two-line label is never wider than the space it has". That holds just as well for a label wrapped to the plot's width and centred on it. The narrowest plot probed, with ±1e9 tick labels and a two-line value-axis label, is still 238.6 units wide.
- **The names are moved with a fake plot.** They are pushed below a marker's reach by declaring the plot `MARKER_REACH` taller than it is. The comment explains this, but the kit's `box` parameter now means "the plot" in one call and "where the names start" in another.

**Impact:**
- In every line graph, the category-axis title sits off the middle of its axis, and further off as the tick labels widen.
- The bar graph will reuse both helpers. It will have to work out what `box` means in each call, as it had to with the pictograph's probe box before QR-006.

**Recommendation:** Settle the centring with the user. Then:
- **To centre under the axis:** wrap the label to `box.width`, pass the plot box, and update the test to expect the plot's centre.
- **To keep the drawing's centre:** give `drawCategoryAxisLabel` only the parameters it uses (`centerX`, `top`), and correct its doc.
- **Either way, give `drawCategoryNames` an optional gap** (default `NAME_GAP`). The line graph then passes `NAME_GAP + MARKER_REACH`, the plot box stays the plot, and `y` at `:192` is computed from the same gap.

**Status:** Resolved
**Resolution:** Resolved — the category-axis label is wrapped to the plot's width and centred under the axis (x 224.74 in the example), as the plan and the kit say. A test pins it, and centring on the drawing fails it. Approved by the user, 2026-10-15.
**Resolution:** —

---

### QR-005: An empty `categories` list adds one length mismatch per series, while an absent one adds none

**Category:** Error Handling
**Severity:** Suggestion
**Location:**
- `src/core/definitions/categories.ts:236-248` (`seriesValuesPerCategoryCheck`) and `:209` (`valuesPerCategoryCheck`, which behaves the same);
- `:161` (`checkCategories` reports the empty list as `missing_property`);
- AD-004 in `.gener8v/technical-design/system-design.md`.

**Description:** Probed through `validate`:
- With `categories: []` and two series of two values each, the result is `missing_property /categories` plus `series_length_mismatch` at `/series/0/values` and `/series/1/values`. Each mismatch says "has 2 values but there are 0 categories".
- With `categories` left out and the same series, the result is `missing_property /categories` alone.

Both report the categories with the same issue, so a caller cannot tell why one list of issues is longer. The pictograph's check adds one such issue, and the line graph adds up to six.

AD-004's rationale is that "no issue is a consequence of another; a model fixing the reported issues does not chase phantom ones". No test pins either behaviour.

**Impact:** Small. A model that adds the missing categories may first try to fix up to six series that need no change.

**Recommendation:**
- In both checks, report nothing when `names.length === 0`, since the empty list is already reported.
- Add the case to each check's tests: QR-002's new block, and `tests/core/categories.test.ts:414-419`.

**Status:** Resolved
**Resolution:** Resolved — `valuesPerCategoryCheck` and `seriesValuesPerCategoryCheck` stay silent when there are no categories, because `categoriesCheck` already reports that (AD-004). Tests cover the line graph, the pictograph and both checks, and putting the knock-on issues back fails them. Approved by the user, 2026-10-15.
**Resolution:** —

---

### QR-006: Some test code states one thing and checks another, and DGP-NFR-004's luminance rule is written twice

**Category:** Testing
**Severity:** Suggestion
**Location:**
- `tests/layout/line-graph.test.ts:94-101` ("draws every marker after every line…").
- `tests/layout/line-graph.test.ts:142-148` (the legend sample's marker).
- `tests/layout/line-graph.test.ts:89` (`28`) and `:266` (`12 * 1.2`).
- `tests/core/series-palette.test.ts:12-24` repeats `tests/core/style.test.ts:4-12` and `:89-95`.

**Description:**
- **A test asserts the reverse of its name.** "Draws every marker after every line" finds the last polyline with a quadratic scan, whose `|| false` does nothing. It then asserts that this line comes after the first marker. What actually pins the rule is that exactly three polylines precede the first marker (L13 fails on that assertion).
- **A redundant assertion.** The legend test reads the next node through `slice(i + 1, i + 2)[0]!`, then asserts `toBeDefined()` after it has already used the node.
- **Literals restate constants.** `28` and `12 * 1.2` restate `SAMPLE_LENGTH` and the tick labels' line height. If either constant changed, the sample test and the property's precondition would still measure the old value.
- **The luminance rule is written twice.** The palette test copies `luminance` and the relative-difference rule from `tests/core/style.test.ts`. Both check DGP-NFR-004, whose reading was itself a review decision (GSV TICKET-001 CR-005), so a change to it must be made in two places. The delivery moved the geometry helpers into `tests/fixtures/scene-geometry.ts` for the same reason.

**Impact:** Small. The tests pass for the right reasons today, but their names and comments mislead whoever debugs a failure, and the copied constants can drift.

**Recommendation:**
- Rewrite `:94-101` as two assertions: every plot polyline comes before the first plot marker, and every legend sample comes after the last plot marker.
- Use `scene.nodes[i + 1]`, and drop the `toBeDefined`.
- Export `SAMPLE_LENGTH` beside `LEGEND_MAX_LINES`, or measure the sample from the Scene. Use `defaultStyle.fontSizes.tickLabel * LINE_HEIGHT` for the line height.
- Move `luminance` and the relative-difference rule into a fixture, for example `tests/fixtures/luminance.ts`, and use it in both tests.

**Status:** Resolved
**Resolution:** Resolved — the test tidying:
  - the marker-order test asserts what its name says, and the dead code is gone;
  - the redundant `toBeDefined` is removed;
  - `SAMPLE_LENGTH` is exported, and the font size times `LINE_HEIGHT` replaces the 28 and 12 × 1.2 literals;
  - the luminance, contrast and relative-difference helpers moved into `tests/fixtures/luminance.ts`, which `style.test.ts` and `series-palette.test.ts` both use.

  Approved by the user, 2026-10-15.
**Resolution:** —

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fix | Point placement against names and ticks; bottom margin; property test | `tests/layout/line-graph.test.ts` |
| QR-002 | Fix | Long series, path order, unit tests of the per-series check | `tests/core/line-graph.test.ts`, `tests/core/categories.test.ts` |
| QR-003 | Fix | Axis-label kit tests; one `upwardLines` helper | `src/layout/kit/value-scale.ts`, `tests/layout/kit/value-scale.test.ts` |
| QR-004 | Fix | Category-axis label under its axis | `src/layout/line-graph.ts`, `tests/layout/line-graph.test.ts` |
| QR-005 | Fix | No knock-on length issues without categories (both checks) | `src/core/definitions/categories.ts`, `tests/core/categories.test.ts`, `tests/core/line-graph.test.ts`, `tests/core/pictograph.test.ts` |
| QR-006 | Fix | Test tidying; shared luminance fixture | `tests/layout/line-graph.test.ts`, `src/layout/line-graph.ts` (`SAMPLE_LENGTH` export), `tests/fixtures/luminance.ts`, `tests/core/style.test.ts`, `tests/core/series-palette.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (all 6 Resolved)
**Notes:** All six findings fixed and re-verified. `pnpm generate` (no change), `lint`, `typecheck`, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size` (`./line-graph` 18.45 kB), `publint`, `attw`, `audit` and `gener8v-state lint` exit 0, and `pnpm test` (1,040 tests) exits 0 on three runs. Nine deliberate breaks, against a passing baseline and restored from memory, each fail a test: points shifted, a short scale, a lost margin, an unreported long series, a swapped path, reversed label lines, a mis-centred label, and the two knock-on issues.
