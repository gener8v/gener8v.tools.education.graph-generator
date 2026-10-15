# TICKET-002: Line graph — Delivery Record

## Ticket Reference

**Ticket:** graph-library/data-graphs-and-pictographs/TICKET-002
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/data-graphs-and-pictographs.md`
**Requirements Covered:**
- DGP-REQ-004: Plain-text alternative naming type, title, labels, every category and value
- DGP-REQ-010: Line graph from one or more series, one value per category
- DGP-REQ-011: Label and line color on each series
- DGP-REQ-012: Points joined by straight segments within a series
- DGP-REQ-013: Legend naming every series when there is more than one
- DGP-REQ-014: Distinct default color per series
- DGP-REQ-015: Negative values accepted, default scale extended below zero
- DGP-REQ-016: Report a series whose length differs from the categories
- DGP-NFR-004: First six default series colors pairwise ≥ 15% luminance difference — verified by an automated luminance check in CI

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Predecessor DGP TICKET-001 | delivered | delivered and done (all three reviews); DGP TICKET-005 (pictograph) also done, and reshaped the shared kit since | ✅ |
| Cross-area predecessors CPSE TICKET-003, GSV TICKET-004 | delivered | delivered and done | ✅ |
| `categories.ts`: categories, scale checks | present | `categories`, `categoriesCheck`, `CATEGORY_LIMIT` (100), `CATEGORY_NAME_LIMIT` (200, provisional), `VALUE_LIMIT`, `tickIntervalCheck`, `checkValueScale(values, given, { allowNegative })`, `valuesPerCategoryCheck(term)` (top-level lists only); `valueScale`, `categoryAxisLabel`, `valueAxisLabel` already scoped to `line-graph` | ✅ |
| `value-scale.ts` (kit): value axis | present | `resolveValueScale`, `valueTicks`, `valuePosition`, `valueAxisExtent`, `drawValueAxis`, `categorySlots` (names below a vertical plot rotate when a word does not fit; DGP TICKET-005 QR-002), `drawCategoryNames`, `NAME_GAP` | ✅ |
| `style.ts`: palette, markers, dashes (AD-011) | present | `seriesStyles`: six entries, each with its own color, marker (`circle`, `square`, `triangle`, `diamond`, `cross`, `star`) and dash; `markerSize` 6, `lineWidths.series` 2.5 | ✅ — six styles only; see the plan's series limit |
| DGP-NFR-004 luminance check | present | `tests/core/style.test.ts` checks the relative difference (≥ 15%) pairwise over `seriesStyles` | ✅ — the new `series-palette.test.ts` points at the same rule |
| `labels.ts`: legend and label placement | legend helpers | `placeLabel` and the `Box`/`Segment` obstacle types only; no legend, and no axis-label drawing anywhere in the kit (no registered type has drawn axis labels) | ⚠️ Built here — see the plan |
| `lineColor` / `lineLabel` per series (GSV-REQ-040, Known Hazard) | shared specs with `elementsOf: ["line-graph"]` | present; neither lists `line-graph` in `appliesTo`, so at the top level they are already reported as not applying | ✅ Nothing to add |
| `series_length_mismatch` per series at `/series/<i>/values` | a check | `valuesPerCategoryCheck(term)` reads one top-level list | ⚠️ A per-series variant beside it — see the plan |
| "No series" reported at `/series` | an issue | an empty required list passes structure; the categories report theirs as `missing_property` in `checkCategories` | ⚠️ The series check does the same |
| `registry.ts`, `createGraphComponent.tsx`, per-type entries | present | circle and pictograph registered in both tables, with components, entries, `tsup`, `.size-limit.json` and examples as the pattern | ✅ |
| Carried: GSV CR-002/QR-001/QR-002 (definition contract) | addressed here | — | 🔁 Carried |
| Carried: GSV TICKET-003 SEC-001 (`maxItems` on every list) | addressed here | — | 🔁 Carried |
| Carried: GSV TICKET-004 CR-003/SEC-004 (domain checks) | addressed here | — | 🔁 Carried |
| Carried: GSV TICKET-005 CR-001/QR-001/QR-002 (rich example, `pnpm generate`) | addressed here | — | 🔁 Carried |
| Carried: GSS TICKET-002 CR-003 (provenance contract), SEC-001..003 (caller-sized text) | addressed here | — | 🔁 Carried |
| Carried: DGP TICKET-001 SEC-001..003 (scale checks; category names; value bounds) | addressed here | category names are now bounded at 200 characters (DGP TICKET-005 SEC-001), which supersedes the "do not claim a bounded node count" instruction | 🔁 Carried |
| Carried: DGP TICKET-005 QR-002 (crowded columns, on TICKET-003's hazards; the line graph shares the kit) | noted | rotated names touch beyond about 25 categories | 🔁 Carried — out of scope here, owned by TICKET-003 |

**Resolved from ground truth (not escalated):**
- `lineColor` and `lineLabel` at the top level of a line graph are already reported as not applying: the shared specs scope them to series elements only.
- The value scale accepts negative values for line graphs through `checkValueScale(…, { allowNegative: true })` and `resolveValueScale`, both in place since DGP TICKET-001.
- Category names are drawn whole and are now bounded (200 characters), so the large-text test can claim a bounded node count for names too.

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.` (branch `ticket/dgp-002`, stacked on `ticket/dgp-005`)
**Plan approved by:** Engineer — Thomas Eaves, 2026-10-15

Decisions taken with the plan:
- **At most 6 series**, provisional and flagged for the Product Owner. That guarantees each series its own default color, marker and dash (DGP-REQ-014, prd/CC-002); a 7th series is `too_large` at `/series`.
- **The legend goes below the plot.**

- **`src/core/definitions/line-graph.ts`:** the `LineGraph` type, `SERIES_LIMIT` (6), and `lineGraph`, built by a `/* @__NO_SIDE_EFFECTS__ */` factory as the pictograph's is.
  - **Terms:**
    - `categories` (shared);
    - `series`: at most `SERIES_LIMIT` items, each an object of `values`, `lineLabel` and `lineColor`. `values` holds at most `CATEGORY_LIMIT` numbers, each from −`VALUE_LIMIT` to `VALUE_LIMIT`. `lineLabel` and `lineColor` are the shared spec objects, nested per series.
    - `valueScale`, `categoryAxisLabel`, `valueAxisLabel` and `title` come through `propertiesOf`.
  - **Checks:**
    - `categoriesCheck`;
    - the per-series length check;
    - `tickIntervalCheck`;
    - the value-scale check, over every series' values with `allowNegative: true` and inputs `valueScale/*` and `series/*/values/*`.
  - **`describe(normalized, provenance)`:** the type, the title, both axis labels, then every series ("Series N" when unlabeled) with every category and its value. Caller text goes through `quoteText`, values through `stateMeasurement` with their source.
- **`src/core/definitions/categories.ts`:** `seriesValuesPerCategoryCheck()`, beside `valuesPerCategoryCheck`, with `ALWAYS_RUNS`.
  - An empty or absent `series` list gives `missing_property` at `/series`.
  - A series whose `values` length differs from the categories, including an empty list, gives `series_length_mismatch` at `/series/<i>/values`.
- **`src/layout/kit/markers.ts`:** `drawMarker(shape, x, y, color)` draws the six shapes (circle, square, triangle, diamond, cross, star) as plain Scene shapes, with no `<marker>` and no ids (AD-008).
- **`src/layout/kit/value-scale.ts`:** axis-label drawing for the data graphs.
  - The value-axis label is turned upright left of the tick labels; the category-axis label sits centred below the category names.
  - Each is wrapped and capped at 2 lines, ending in "…"; the text alternative keeps it whole.
- **`src/layout/line-graph.ts`:** `lineGraphLayout(normalized, provenance)`. From the top:
  - the title (`titleBlock`);
  - the plot, with the value axis on the left (`resolveValueScale` and `drawValueAxis`) and the category names below (`categorySlots` and `drawCategoryNames`);
  - the category-axis label;
  - with more than one series, the legend. Entries flow in rows across the width; each shows a line sample with the series' dash, its marker and its label, capped at 2 lines.

  Each series is a polyline in its color (`lineColor`, or its default style), with its dash pattern. A marker sits at every point, at its category slot's centre and its value's position; a single category draws one point and no segment. Every number goes through `fmt()`.
- **Component and wiring:**
  - `src/react/graphs/LineGraphGraph.tsx` exports `LineGraph`, through `createGraphComponent`;
  - `src/entries/line-graph.ts`, and the `src/index.ts` export;
  - registered in `src/core/definitions/index.ts` and `src/layout/registry.ts`;
  - `package.json` `exports["./line-graph"]`, a `tsup` entry, and a `.size-limit.json` entry of 25 kB;
  - `pnpm generate` regenerates the schemas, the vocabulary and the description types.
- **Examples:**
  - `examples/line-graph.json`: three series, a negative value, and every optional term used;
  - `examples/invalid/line-graph-length-mismatch.json`;
  - `examples/invalid/line-graph-no-series.json`.
- **Tests:**
  - `tests/core/line-graph.test.ts`: validation, the length checks, no series, negatives accepted, the series cap, the scale checks (including an end near ±`VALUE_LIMIT` with a tiny span, reported rather than drawn), and the text alternative;
  - `tests/layout/line-graph.test.ts`: points and segments, the single-category case, the legend rules, default colors, markers and dashes, a scale extended below zero, `checkScene`, and a geometry property test of bounds and overlaps like the pictograph's;
  - `tests/core/series-palette.test.ts`: DGP-NFR-004, the same relative-luminance rule as `tests/core/style.test.ts`;
  - `tests/react/Graph.test.tsx`: half a megabyte of title, axis-label and series-label text renders in `<Graph>` and `<LineGraph>` with a bounded number of text nodes;
  - `tests/package/per-type-bundle.test.ts`: the line graph's bundle leaves out the circle, the pictograph and the images, and the others leave out the line graph;
  - existing type lists updated (definitions, component names).

**How the acceptance criteria are met:**
- Validation and rendering: the definition and the core tests.
- Length mismatch and empty series: the per-series check and its tests.
- Points and segments: the layout tests.
- The legend rule: the layout tests.
- Default colors, markers and dashes: the layout tests against `seriesStyles`.
- Negative values: the core and layout scale tests.
- The text alternative: the core tests.
- DGP-NFR-004: `series-palette.test.ts`.
- Entry, export, size and examples: `pnpm build`, `size`, `publint`, `attw`, the bundle tests and the example tests.

## Progress

- [x] `src/core/definitions/categories.ts` (per-series length check)
- [x] `src/core/definitions/line-graph.ts`, registered in `src/core/definitions/index.ts`
- [x] `src/layout/kit/markers.ts`
- [x] `src/layout/kit/value-scale.ts` (axis labels)
- [x] `src/layout/line-graph.ts`, registered in `src/layout/registry.ts`
- [x] `src/react/graphs/LineGraphGraph.tsx`, `src/entries/line-graph.ts`, `src/index.ts`
- [x] `package.json`, `tsup.config.ts`, `.size-limit.json`
- [x] `examples/line-graph.json`, `examples/invalid/line-graph-length-mismatch.json`, `examples/invalid/line-graph-no-series.json`
- [x] `src/generated/*` (`pnpm generate`)
- [x] `tests/core/line-graph.test.ts`, `tests/core/series-palette.test.ts`
- [x] `tests/layout/line-graph.test.ts`
- [x] `tests/react/Graph.test.tsx`, `tests/package/per-type-bundle.test.ts`; `tests/core/definitions.test.ts` needed no change (it already runs every check over the registered definitions)
- [x] Added beyond the plan: `src/core/validate/structure.ts` and `src/core/issues.ts` (DEL-002), `src/core/definitions/pictograph.ts` (DEL-003), `tests/fixtures/scene-geometry.ts` and `tests/layout/kit/markers.test.ts` (see Deviations)

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/core/definitions/line-graph.ts`: new.
  - Exports `LineGraph`, `LineSeries`, `lineGraph` (built by a side-effect-free factory), `SERIES_LIMIT` (6), `seriesName` and `seriesLabelOf`.
  - Terms: `categories`, and `series`, each with `values` (±1e9, at most 100), `lineLabel` and `lineColor` (the shared specs).
  - Checks: category names, one value per category in every series (and no empty `series`), the tick interval, and the value scale over every series' values (negatives allowed).
  - `describe(normalized, provenance)`.
- `src/core/definitions/categories.ts`: `seriesValuesPerCategoryCheck()` and `VALUES_DESCRIPTION` (DEL-003).
- `src/core/definitions/index.ts`: line graph registered.
- `src/core/definitions/pictograph.ts`: its `values` term shares `VALUES_DESCRIPTION` (DEL-003).
- `src/core/validate/structure.ts`, `src/core/issues.ts`: an element-only option given at the top level is `inapplicable_property` with where it goes (DEL-002).
- `src/layout/kit/markers.ts`: new. `drawMarker` (six shapes as plain polygons and circles) and `MARKER_REACH`.
- `src/layout/kit/value-scale.ts`: `AXIS_LABEL_MAX_LINES` (2), `axisLabelLines`, `axisLabelDepth`, `drawValueAxisLabel` (read upward), `drawCategoryAxisLabel`.
- `src/layout/line-graph.ts`: new. Exports `lineGraphLayout`, `seriesStyleOf` and `LEGEND_MAX_LINES` (2).
  - Draws the title, the value axis and its label, the category axis, the series' lines (with their dash patterns) and markers, the category names, the category-axis label, and the legend for more than one series.
- `src/layout/registry.ts`: line-graph layout registered.
- `src/react/graphs/LineGraphGraph.tsx` (`LineGraph`), `src/entries/line-graph.ts`, `src/index.ts`, `package.json` (`./line-graph`), `tsup.config.ts`, `.size-limit.json` (25 kB).
- `examples/line-graph.json`, `examples/invalid/line-graph-length-mismatch.json`, `examples/invalid/line-graph-no-series.json`.
- `src/generated/description.ts`, `schema.json`, `tool-schema.json`, `vocabulary.json`: regenerated.
- **Tests:**
  - new: `tests/core/line-graph.test.ts` (22 tests), `tests/layout/line-graph.test.ts` (17, two of them property tests), `tests/core/series-palette.test.ts` (2), `tests/layout/kit/markers.test.ts` (3), and the fixture `tests/fixtures/scene-geometry.ts`;
  - added to: `tests/react/Graph.test.tsx` (1 test, plus the component-name list), `tests/package/per-type-bundle.test.ts` (2);
  - `tests/layout/pictograph.test.ts` now uses the shared geometry fixture.

## Verification Run

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm generate` | 0 | the four generated files regenerated and committed |
| `pnpm lint` | 0 | — |
| `pnpm typecheck` | 0 | — |
| `pnpm test` | 0 | 39 files, 1,024 tests; three full runs after the last change, all exit 0 |
| `pnpm bench` | 0 | GSV-NFR-001 line-graph p95 0.054 ms over 6,043 runs (limit 5 ms) |
| `pnpm build` | 0 | — |
| `pnpm check:dist` | 0 | — |
| `pnpm check:deps` | 0 | — |
| `pnpm check:images` | 0 | — |
| `pnpm size` | 0 | `./line-graph` 18.47 kB (limit 25 kB); `./core` 15.44 → 17.29 kB; `./circle` 15.69 → 15.85 kB; `./pictograph` 17.68 → 17.82 kB; `.` 23.21 kB (limit 120 kB) |
| `pnpm publint` | 0 | — |
| `pnpm attw` | 0 | — |
| `pnpm audit` | 0 | No known vulnerabilities found |
| `gener8v-state.py lint` | 0 | 0 errors, 0 warnings |
| Mutation checks (each made against a passing baseline and restored from memory) | — | 16 of 16 caught; one (negatives in the scale check) only after its test was strengthened, and the single-point break was re-checked after a test helper changed. They covered: the names' room below the plot, the legend's one-series rule, a series' own color, a single point drawn with a segment, markers under lines, a scale not extended below zero, the legend's row wrap, the dash pattern, the empty-series check, the series cap, negatives in the scale check (caught once a given negative maximum was tested), the axis labels in the text alternative, the per-series length check, the top-level hint (DEL-002), the axis-label line cap, and `MARKER_REACH`. A 17th break, removing the side-effect-free mark from `defineLineGraph`, left every bundle test passing: the `/* @__PURE__ */` call alone keeps the definition out of other types' bundles here (Notes). |
| Visual check | — | the example and a six-series weekday graph rendered (under the gitignored `dist/`, via Quick Look) and inspected: distinct colors, markers and dashes; a scale below zero; weekday names rotated; the legend wrapped into rows with a long label cut after two lines |

## Acceptance Criteria Verification

- [x] `type: "line-graph"` with `categories` and `series` (each `{ values, lineLabel?, lineColor? }`) validates and renders; no series is `missing_property` at `/series` — `tests/core/line-graph.test.ts` › "validates categories and series…", "requires categories and series", "reports no series as missing"; `tests/layout/line-graph.test.ts` › "is the Scene createGraph returns for the example…"
- [x] A series whose `values` length differs from the categories, an empty list included, is `series_length_mismatch` at `/series/<i>/values` — `tests/core/line-graph.test.ts` › "reports each series whose length differs…", "reports a length mismatch even beside a bad value…", "reports the shipped invalid examples"
- [x] Each value is a point at its slot and value position; consecutive points are joined by straight segments; a single category draws one point and no segment — `tests/layout/line-graph.test.ts` › "marks every value at its category's slot…", "draws a single-category series as one point with no segment", "draws every marker after every line…"
- [x] More than one series: a legend lists every label, or "Series N", with its color, marker and dash sample; one series: no legend — `tests/layout/line-graph.test.ts` › "the legend" (3 tests)
- [x] Series without `lineColor` take distinct default colors in order, and every series has its own marker shape and dash pattern (prd/CC-002) — `tests/layout/line-graph.test.ts` › "gives series without a line color the default colors in order…", "uses a series' own line color, keeping its default marker and dash"; `tests/layout/kit/markers.test.ts`
- [x] Negative values are accepted and the default scale extends below zero — `tests/core/line-graph.test.ts` › "accepts negative values", "chooses a minimum below zero…"; `tests/layout/line-graph.test.ts` › "extends a default scale below zero…"
- [x] The text alternative names the type, title, axis labels, and every series with every category and its value — `tests/core/line-graph.test.ts` › "the text alternative" (4 tests)
- [x] DGP-NFR-004: the first six default series colors differ pairwise by at least 15% relative luminance — `tests/core/series-palette.test.ts` (on the colors a six-series line graph draws), with `tests/core/style.test.ts` on the palette
- [x] `src/entries/line-graph.ts` exports `LineGraph`; `package.json` has `./line-graph`; `.size-limit.json` has a line-graph entry; `examples/line-graph.json` and two `examples/invalid/line-graph-*.json` exist and are used by tests — `pnpm build`, `pnpm size` (18.47 kB), `pnpm publint`, `pnpm attw`; `tests/package/per-type-bundle.test.ts`; `tests/core/line-graph.test.ts` reads all three examples; the schema-agreement test mutates `examples/line-graph.json` and the bench times it

## Decisions Made

### DEL-001: At most 6 series, provisional

**Context:** The default style has six series styles. DGP-REQ-014 asks for a distinct default color per series, and prd/CC-002 for a non-color cue. The specification sets no series limit, but the GSV TICKET-003 rule requires one on every list.
**Decision:** `SERIES_LIMIT` is 6 (approved with the plan). A 7th series is `too_large` at `/series`.
**Rationale:** Up to six, every series is guaranteed its own color, marker and dash. Curriculum line graphs rarely have more than four series.
**Ticket Impact:** For the Product Owner, beside the other provisional limits. Raising it needs more series styles in `src/core/style.ts`, re-checked against GSV-NFR-004 and DGP-NFR-004.

### DEL-002: An element option at the top level is `inapplicable_property`, with where it goes

**Context:** The Known Hazard asks for a top-level `lineLabel` or `lineColor` to be reported as inapplicable. The shared validator reported any option that the type's elements carry as `unknown_property` at the top level, by an earlier decision (a GSV quality review, QR-009: an option valid elsewhere in the type stays unknown at the wrong position, with the terms that are valid there).
**Decision:** Chosen by the user during implementation. At the top level only, an option that applies only to the type's elements is `inapplicable_property`, with an `elements` parameter: "lineLabel does not apply for a line-graph as a whole; give it on each series instead."
  - It applies to every type with element options: points or segments for number lines and xy/xyz graphs, categories for bar graphs.
  - Inside elements, QR-009's rule is unchanged.
**Rationale:** The code says what is wrong, and the message says where the option goes. That is more useful to a model than a list of allowed top-level terms.
**Ticket Impact:**
- Partly supersedes QR-009 at the top level.
- No existing test pinned the old behaviour.
- A top-level `color` on a future xy graph will read "give it on each point or segment instead".

### DEL-003: One shared description for the `values` term

**Context:** A term has one definition in the vocabulary (GSV-REQ-012), and the definitions test enforces it. The pictograph's `values` read "how many units the category has", which does not fit a series.
**Decision:** `VALUES_DESCRIPTION` in `categories.ts` ("One value per category, in the same order as the categories.") is used by the pictograph and each series, and the bar graph is to use it too. What a value means for a type goes in its item's description: the pictograph's says "how many units it has".
**Ticket Impact:** The pictograph's published `values` description changed (regenerated).

### DEL-004: The plot leaves room for markers; crowded columns come sooner

**Context:**
- A marker on the plot's bottom edge reached about 4 units below the axis, into the category names. The property test found it with zero values.
- The value axis's labels narrow the plot. With wide tick labels (values near ±1e9) and a value-axis label, a rotated name's single line no longer fits its column from about 17 categories, not the pictograph's 25.

**Decision:**
- `MARKER_REACH` (1.5 × half the marker size, the star's reach) is left between the plot and the names. A kit test checks every shape stays within it.
- The crowded-columns case stays with DGP TICKET-003 (DGP TICKET-005 QR-002). The geometry property test covers layouts where a name's line fits its column (up to 16 categories), and the lower threshold is added to TICKET-003's Known Hazard.

**Ticket Impact:** DGP TICKET-003's crowded-columns fix must cover the line graph's narrower plot.

### DEL-005: Markers and axis labels live in the kit

**Context:** The ticket's Output names only line-graph files, but the bar graph draws axis labels too, and xy graphs may draw markers.
**Decision:** `drawMarker` and `MARKER_REACH` go in `src/layout/kit/markers.ts`, and the axis-label drawing in `src/layout/kit/value-scale.ts`. The legend stays in `src/layout/line-graph.ts`, its only user.
**Ticket Impact:** DGP TICKET-003 reuses the axis labels.

## Deviations from Plan

- **The shared validator** (`structure.ts`, `issues.ts`) changed for DEL-002; this was not planned and was decided with the user mid-delivery.
- **The pictograph's `values` description** changed for DEL-003.
- **The tests:**
  - The geometry helpers moved from `tests/layout/pictograph.test.ts` into `tests/fixtures/scene-geometry.ts`, extended to lines, markers and rotated text, and are now shared by both types.
  - `tests/layout/kit/markers.test.ts` was added for the markers kit.
  - `tests/core/definitions.test.ts` needed no change: it already runs every check over the registered definitions.
- **The geometry property test** covers up to 16 categories, not the planned 25 (DEL-004).

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| DGP-REQ-002 | `src/layout/kit/value-scale.ts`:drawValueAxisLabel, drawCategoryAxisLabel | `@spec DGP-REQ-002` |
| DGP-REQ-004 | `src/core/definitions/line-graph.ts`:lineGraph, describe | `@spec DGP-REQ-004, …` / `@spec DGP-REQ-004` |
| DGP-REQ-010 | `src/core/definitions/line-graph.ts`:lineGraph, series; `src/core/definitions/categories.ts`:seriesValuesPerCategoryCheck; `src/layout/line-graph.ts`:lineGraphLayout; `src/react/graphs/LineGraphGraph.tsx`:LineGraph | `@spec DGP-REQ-010, …` |
| DGP-REQ-011 | `src/core/definitions/line-graph.ts`:lineGraph, series; `src/layout/line-graph.ts`:seriesStyleOf, drawLegend | `@spec …, DGP-REQ-011, …` |
| DGP-REQ-012 | `src/layout/line-graph.ts`:seriesLine, lineGraphLayout; `src/layout/kit/markers.ts`:drawMarker | `@spec DGP-REQ-012, …` |
| DGP-REQ-013 | `src/layout/line-graph.ts`:drawLegend | `@spec DGP-REQ-011, DGP-REQ-013, DGP-REQ-014` |
| DGP-REQ-014 | `src/layout/line-graph.ts`:seriesStyleOf, drawLegend, lineGraphLayout; `src/layout/kit/markers.ts`:drawMarker | `@spec …, DGP-REQ-014, …` |
| DGP-REQ-015 | `src/core/definitions/line-graph.ts`:lineGraph, series, valueScaleCheck; `src/layout/line-graph.ts`:lineGraphLayout | `@spec …, DGP-REQ-015` |
| DGP-REQ-016 | `src/core/definitions/line-graph.ts`:lineGraph; `src/core/definitions/categories.ts`:seriesValuesPerCategoryCheck | `@spec …, DGP-REQ-016` |
| DGP-NFR-004 | `src/core/style.ts`:seriesStyles (already annotated); verified by `tests/core/series-palette.test.ts` | — |
| CPSE-REQ-004, CPSE-REQ-007 | `src/entries/line-graph.ts`; `src/react/graphs/LineGraphGraph.tsx`:LineGraph | `@spec CPSE-REQ-004` / `@spec DGP-REQ-010, CPSE-REQ-007` |

Coverage rows were added to `.gener8v/specifications/data-graphs-and-pictographs.md` (DGP-REQ-002, 004 and 010–016, and DGP-NFR-004) and to `.gener8v/specifications/component-packaging-and-source-export.md` (CPSE-REQ-004 and 007).

## Notes

- **Product Owner decisions pending:**
  - **The series limit:** 6 is provisional (DEL-001).
  - **Already open:** the 400-picture cap (DGP OQ-004), the image set (EXT-001), and the 200-character category-name limit under the caller-text decision.
- **Bounded text:** caller text in the drawing stays bounded. The title takes at most 3 lines, each axis label 2, and each legend label 2. Half a megabyte of each renders in `<Graph>` and `<LineGraph>` with at most 33 text nodes. Category names are bounded by their 200-character limit.
- **The side-effect-free mark** on `defineLineGraph` is kept for consistency with the pictograph (DGP TICKET-005 DEL-002), although the `/* @__PURE__ */` call alone already keeps the line graph out of the other bundles.
- **For DGP TICKET-003 (bar graph):** reuse `VALUES_DESCRIPTION`, `valuesPerCategoryCheck()`, the axis-label kit and `NAME_GAP`. The crowded-columns threshold for a plot narrowed by a value axis is on its Known Hazards.
- **For DGP TICKET-006:** `seriesStyleOf`, `seriesName` and `seriesLabelOf` are exported for the accuracy suite.
- **Tooling:** the PreToolUse hook again warned "no delivery is In Progress" while this record was In Progress (the known first-4,000-characters limitation).

## Post-Review Amendments

### Code review — `graph-library/data-graphs-and-pictographs-ticket-002-code-review` (2026-10-15, Approved)

- **CR-001:** the published descriptions of `lineLabel`, `categoryAxisLabel` and `valueAxisLabel` now say a label longer than two lines is cut short with "…" in the drawing (in a line graph's legend, for `lineLabel`), while the text alternative states it whole. The `series` description says each series takes the default color for its position. Regenerated.
- **CR-002:** correction to `@spec` Annotations. DGP-NFR-004 was not "already annotated": `src/core/style.ts`:seriesStyles now carries `@spec GSV-REQ-044, GSV-NFR-004, DGP-NFR-004`.
- **CR-003:** DEL-002 amended. The hint lives in the type's definition, not in a table in the shared validator (`ELEMENTS_OF` removed).
  - `GraphTypeDefinition.elementsHint` is optional; the line graph's is "each series".
  - A type without a hint keeps GSV TICKET-003 QR-009's behaviour at the top level: `unknown_property`, with the top-level terms listed, so a number line's `lineLabel`/`lineColor` or a bar graph's `barColor` stays visible.
  - `tests/core/validate-structure.test.ts` covers both behaviours.
- **CR-004:** the line graph's tiny-span test keeps every value inside the given scale, asserts exactly `out_of_range /valueScale/maximum`, and asserts `createGraph` does not draw it.
- **Re-verification:** `pnpm generate`, `lint`, `typecheck`, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size` (`./line-graph` 18.49 kB), `publint`, `attw`, `audit` and `gener8v-state lint` exit 0. `pnpm test` (1,026 tests) exits 0 on three runs. Deliberate breaks of the CR-003 rule (both ways) and of the tiny-span guard each fail a test.
