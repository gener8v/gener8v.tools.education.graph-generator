# TICKET-002: Line graph — Code Review

## Summary

I reviewed the delivery of `graph-library/data-graphs-and-pictographs/TICKET-002` (delivery commit `2391e8e`, branch `ticket/dgp-002`, stacked on `ticket/dgp-005`). I checked it against:
- the ticket, its nine acceptance criteria and its Known Hazards (carried from the GSV, GSS, DGP TICKET-001 and DGP TICKET-005 reviews);
- the Data Graphs & Pictographs specification (DGP-REQ-002, DGP-REQ-004, DGP-REQ-010..016, DGP-NFR-004, the Edge Cases, Shared Mechanics and the `## @spec Coverage` rows this delivery added);
- the CPSE coverage rows (CPSE-REQ-004, CPSE-REQ-007) and GSV-REQ-041 / GSV-REQ-045, which DEL-002 touches;
- `constraints/prd.md` and `technical-design/system-design.md` (AD-001..AD-008, AD-010, AD-011, AD-014);
- the pictograph (DGP TICKET-005) and its resolved review findings as the pattern, and GSV TICKET-003 QR-009, which DEL-002 partly supersedes.

What holds:
- The line graph is complete end to end: definition, layout, component, `./line-graph` entry, examples and tests.
- All nine acceptance criteria are met. Every requirement the ticket covers is implemented.
- The carried definition-contract rules are followed:
  - `defineProperties`, and the shared `lineLabel` / `lineColor` spec objects nested per series;
  - `describe(normalized, provenance)` with `quoteText`, `stateMeasurement` and `sourceOf`, and the layout calls its own definition's `describe`;
  - `titleBlock`, and `maxItems` on every list (categories 100, series 6, values 100);
  - values bounded to ±`VALUE_LIMIT`, and `tickIntervalCheck` plus a `checkValueScale` domain check;
  - no caller-sized spread, and every caller label wrapped and capped.
- Markers are plain polygons and circles with no ids (AD-008). Every series has its own color, marker and dash (AD-011, prd/CC-002).
- Every Verification Run command reproduces with exit 0 except `pnpm size`, which I skipped because it writes to the system temp directory; an in-memory probe stands in for it. `pnpm generate` leaves no tracked change.

There are two Issues:
- **CR-001.** The published descriptions of `categoryAxisLabel`, `valueAxisLabel` and `lineLabel` do not say the drawing cuts them after two lines. The carried Known Hazard requires it, and DGP TICKET-005 CR-004 fixed the same gap for `valueUnitLabel`.
- **CR-002.** DGP-NFR-004's coverage row names `src/core/style.ts`:seriesStyles. That declaration carries no `@spec DGP-NFR-004`, yet the delivery record says it is "already annotated".

There are two Observations:
- **CR-003.** DEL-002's "give it on each … instead" hint lives in a per-type table in the shared validator. For the number line and the bar graph, which have a whole-graph term (`lineLabel`/`lineColor`, `barColor`), it points away from that term. No structure test pins the new rule, and one test name still states the rule it replaced.
- **CR-004.** The line graph's tiny-span test still passes with the tiny-span guard removed. Its values lie outside the given scale, so `scale_excludes_value` alone makes the result invalid.

**Reviewer:** `code-reviewer` agent, fresh context (findings phase only, 2026-10-15)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/data-graphs-and-pictographs-ticket-002-delivery.md`
**Files Reviewed:**
- `src/core/definitions/line-graph.ts`
- `src/core/definitions/categories.ts` (`seriesValuesPerCategoryCheck`, `VALUES_DESCRIPTION`)
- `src/core/definitions/index.ts`
- `src/core/definitions/pictograph.ts` (the `values` description, DEL-003)
- `src/core/validate/structure.ts` (`appliesToType`, `ELEMENTS_OF`, `checkMap`; DEL-002)
- `src/core/issues.ts` (`inapplicable_property`; DEL-002)
- `src/layout/kit/markers.ts`
- `src/layout/kit/value-scale.ts` (axis labels)
- `src/layout/line-graph.ts`
- `src/layout/registry.ts`
- `src/react/graphs/LineGraphGraph.tsx`
- `src/entries/line-graph.ts`, `src/index.ts`
- `package.json`, `tsup.config.ts`, `.size-limit.json`
- `examples/line-graph.json`, `examples/invalid/line-graph-length-mismatch.json`, `examples/invalid/line-graph-no-series.json`
- `src/generated/description.ts`, `src/generated/schema.json`, `src/generated/tool-schema.json`, `src/generated/vocabulary.json` (line-graph branch)
- `tests/core/line-graph.test.ts`, `tests/core/series-palette.test.ts`
- `tests/layout/line-graph.test.ts`, `tests/layout/kit/markers.test.ts`, `tests/fixtures/scene-geometry.ts`, `tests/layout/pictograph.test.ts` (fixture move)
- `tests/react/Graph.test.tsx`, `tests/package/per-type-bundle.test.ts` (the line-graph cases)
- `.gener8v/specifications/data-graphs-and-pictographs.md` and `.gener8v/specifications/component-packaging-and-source-export.md` (`## @spec Coverage`)
- `.gener8v/changes/graph-library/tickets/data-graphs-and-pictographs/TICKET-003.md` (the Known Hazard this delivery appended)
- Read for context, unchanged here:
  - `src/core/definitions/shared.ts`, `src/core/style.ts`, `src/core/value-scale.ts`, `src/layout/kit/title.ts`
  - `tests/core/validate-structure.test.ts`, `tests/core/style.test.ts`, `tests/layout/kit/value-scale.test.ts`
  - the DGP TICKET-001 and TICKET-005 code reviews, the TICKET-005 quality and security reviews, and GSV TICKET-003 QR-009

**Findings:** 4
**Critical:** 0 | **Issues:** 2 | **Observations:** 2

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| `type: "line-graph"` with `categories` and `series` (each `{ values, lineLabel?, lineColor? }`) validates and renders; no series is reported as `missing_property`/`out_of_range` at `/series` | Yes | **Code:** `defineLineGraph` (`src/core/definitions/line-graph.ts:73-137`), registered at `src/core/definitions/index.ts:23`. `lineGraphLayout` (`src/layout/line-graph.ts:140-210`), registered at `src/layout/registry.ts:34`. An empty list gives `missing_property` at `/series` in `seriesValuesPerCategoryCheck` (`src/core/definitions/categories.ts:233-235`). An absent list is reported by stage 2. **Tests:** `tests/core/line-graph.test.ts:30-51`, `:83-87`. `tests/layout/line-graph.test.ts:297-302` runs `createGraph`. `tests/react/Graph.test.tsx:72-82` draws the example identically through `Graph` and `LineGraph`. **Probe:** `categories: []` with `series: []` reports both lists as `missing_property` |
| A series whose `values` length differs from the number of categories (including an empty list) is reported with `series_length_mismatch` at `/series/<i>/values` | Yes | `seriesValuesPerCategoryCheck` (`src/core/definitions/categories.ts:225-252`). It reads lengths only and always runs, so a failed value or series never hides a mismatch (the DGP TICKET-005 CR-002 pattern). **Tests:** `tests/core/line-graph.test.ts:89-110` (an empty list; beside a bad value and a bad series) and `:118-123` (both invalid examples). **Probe:** `[null, { values: [1, 2] }]` reports `wrong_kind /series/0` and `series_length_mismatch /series/1/values` |
| Each value is drawn as a point at its category slot and value position; consecutive points of a series are joined by straight segments; a single-category series draws one point with no segment | Yes | `src/layout/line-graph.ts:172-185`: each point sits at its slot's `center` and at `valuePosition`, every line is drawn before every marker, and `seriesLine` (`:49-60`) returns nothing for fewer than two points. **Tests:** `tests/layout/line-graph.test.ts:52-76` (one linear value map and evenly spaced x positions; each marker covers its point), `:78-92` (single category) and `:94-101` (markers after lines) |
| With more than one series, a legend lists every series label (or "Series N" when unlabeled) with its color, marker and dash sample; with one series no legend is drawn | Yes | `drawLegend` (`src/layout/line-graph.ts:76-129`): nothing for fewer than two series (`:77`). The label is `seriesLabelOf(series) ?? seriesName(i)` (`:81`), with a sample line in the series' dash (`:119`) and its marker (`:120`). **Tests:** `tests/layout/line-graph.test.ts:133-167` |
| Series without `lineColor` get distinct default colors in order, and each series also gets a distinct point-marker shape and dash pattern, so series differ without color (prd/CC-002) | Yes | `seriesStyleOf` (`src/layout/line-graph.ts:42-45`) takes the series' own color or the palette color at its position. The marker and dash always come from the default style. `seriesStyles` (`src/core/style.ts:89-99`) has six distinct markers and dashes, and `SERIES_LIMIT` = 6 (DEL-001) means no style repeats. **Tests:** `tests/layout/line-graph.test.ts:107-129` and `tests/layout/kit/markers.test.ts:12-35`. See CR-001 for the `series` description's "next default color" wording |
| Negative values are accepted and the default scale extends below zero to include them | Yes | Values are `min: -VALUE_LIMIT` (`src/core/definitions/line-graph.ts:97`). `valueScaleCheck` passes `allowNegative: true` (`:57`), and so does the layout's `resolveValueScale` (`src/layout/line-graph.ts:147`). **Tests:** `tests/core/line-graph.test.ts:127-138` (including a given negative maximum) and `tests/layout/line-graph.test.ts:173-178` |
| The text alternative names the graph type, title, axis labels, and every series with every category and its value | Yes | `describe` (`src/core/definitions/line-graph.ts:114-135`) uses `quoteText` for caller text and `stateMeasurement(value, sourceOf(provenance, …))` for values. A blank title, axis label or series label is treated as absent, and an unlabeled series is "Series N". **Tests:** `tests/core/line-graph.test.ts:165-197`. `tests/layout/line-graph.test.ts:160-167` shows that a label cut in the legend is whole in the text alternative |
| DGP-NFR-004: the first six default series colors differ pairwise by at least 15% relative luminance, verified by `tests/core/series-palette.test.ts` in CI | Yes | `tests/core/series-palette.test.ts:33-52` checks the strokes a six-series line graph actually draws, using the relative reading of GSV TICKET-001 CR-005. `tests/core/style.test.ts:89` checks the palette itself. Both passed in the re-run `pnpm test`. The palette is unchanged |
| `src/entries/line-graph.ts` exports `LineGraph`; package.json `exports` has `./line-graph`; `.size-limit.json` has a line-graph entry; `examples/line-graph.json` and at least two `examples/invalid/line-graph-*.json` exist and are used by tests | Yes | `src/entries/line-graph.ts`, `package.json:59`, `tsup.config.ts:15`, `.size-limit.json:39-40` (25 kB). `pnpm publint` and `pnpm attw` pass; attw passes `./line-graph` for node16 ESM and bundler. `tests/package/per-type-bundle.test.ts:150-180` confirms the line graph's bundle carries no other type and the others carry no line graph. The examples are read at `tests/core/line-graph.test.ts:27`, `:118-123` and by the schema-agreement test and the bench. Size: see the Verification Run |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| DGP-REQ-004 | Plain-text alternative naming type, title, labels, every category and value | `src/core/definitions/line-graph.ts:describe`; `src/layout/line-graph.ts:lineGraphLayout` (`textAlternative`) | Yes |
| DGP-REQ-010 | Line graph from one or more series, one value per category | `src/core/definitions/line-graph.ts:lineGraph`, `series`; `src/core/definitions/categories.ts:seriesValuesPerCategoryCheck`; `src/layout/line-graph.ts:lineGraphLayout`; `src/react/graphs/LineGraphGraph.tsx:LineGraph` | Yes (at most 6 series, DEL-001) |
| DGP-REQ-011 | Label and line color on each series | `src/core/definitions/line-graph.ts:series` (the nested shared `lineLabel` and `lineColor` specs); `src/layout/line-graph.ts:seriesStyleOf`, `drawLegend` | Yes |
| DGP-REQ-012 | Points joined by straight segments within a series | `src/layout/line-graph.ts:seriesLine`, `lineGraphLayout`; `src/layout/kit/markers.ts:drawMarker` | Yes |
| DGP-REQ-013 | Legend naming every series when there is more than one | `src/layout/line-graph.ts:drawLegend` | Yes |
| DGP-REQ-014 | Distinct default color per series | `src/layout/line-graph.ts:seriesStyleOf`; `src/core/style.ts:seriesStyles` | Yes |
| DGP-REQ-015 | Negative values accepted, default scale extended below zero | `src/core/definitions/line-graph.ts:series` (item `min`), `valueScaleCheck`; `src/layout/line-graph.ts:lineGraphLayout` | Yes |
| DGP-REQ-016 | Report a series whose length differs from the categories | `src/core/definitions/categories.ts:seriesValuesPerCategoryCheck` | Yes |
| DGP-NFR-004 | First six default series colors pairwise ≥ 15% relative luminance difference | `tests/core/series-palette.test.ts` and `tests/core/style.test.ts:89`, both passed in the re-run `pnpm test` | Yes (annotation: CR-002) |
| DGP-REQ-002 (drawn here) | Category- and value-axis labels on line graphs | `src/layout/kit/value-scale.ts:axisLabelLines`, `drawValueAxisLabel`, `drawCategoryAxisLabel`; `src/layout/line-graph.ts:lineGraphLayout` | Yes (published wording: CR-001) |
| CPSE-REQ-004, CPSE-REQ-007 | Per-type entry; one component per type | `src/entries/line-graph.ts`; `src/react/graphs/LineGraphGraph.tsx:LineGraph` | Yes |

*Every requirement in the ticket's Requirements Covered field is listed. DGP-REQ-002 and the two CPSE requirements are added because this delivery annotates them and adds their coverage rows.*

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/CC-002 | Text alternative (1.1.1); 3:1 contrast for graphical objects (1.4.11); color not the only cue (1.4.1) | Yes | `describe` becomes `Scene.textAlternative`. The default series colors pass GSV-NFR-004 (`tests/core/style.test.ts`). Each series has its own marker and dash, and so does its legend sample. A caller-given `lineColor` is any hex the shared color rule (GSV-REQ-042) accepts, which is outside this ticket |
| prd/TC-001 | No DOM measurement | Yes | The legend's rows, the axis-label depths and the plot's left edge come from `textWidth` estimates (`src/layout/line-graph.ts:83`, `:150-152`) |
| prd/TC-002 | Round every emitted number | Yes | Points go through `fmtPoints`. Coordinates, widths and the Scene height go through `fmt()` (`src/layout/line-graph.ts:52-55`, `:162-167`, `:206`), and so do the markers (`src/layout/kit/markers.ts:24`, `:33-35`) |
| prd/TC-003 (via AD-008) | No ids | Yes | No `<marker>`, `id` or `url(#…)`. `checkScene` runs on every Scene `sceneOf` builds (`tests/layout/line-graph.test.ts:15-21`) and on every marker (`tests/layout/kit/markers.test.ts:18`) |
| prd/TC-005 | Core imports no React | Yes | `src/core/definitions/line-graph.ts` and `categories.ts` import only core modules. `pnpm lint` enforces the boundary |
| prd/TC-007 | Per-type, side-effect-free entry | Yes | `./line-graph` entry; `defineLineGraph` is `@__NO_SIDE_EFFECTS__` and called under `@__PURE__`. Bundle tests in both directions |
| prd/TC-011 | The package breaks lines | Yes | The legend labels, axis labels and title are wrapped with `wrap(…, maxLines)` and `titleBlock`. Category names are wrapped by the kit and never cut |
| prd/CC-001 | Licensed dependencies and assets | Yes | No new dependency (`pnpm check:deps`: 0 runtime dependencies) |
| prd/CC-003 | No data collection or network use | Yes | `pnpm check:dist`: 12 built files, no network APIs |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-001 | One package, per-type entry points | Yes | `./line-graph` appears in `exports`, `tsup` and `.size-limit.json`. `LineGraph` is also exported from `.` (`src/index.ts:6`) |
| AD-002 | Pure layout → plain-data Scene | Yes | `lineGraphLayout(normalized, provenance)` returns `polyline`, `polygon`, `circle`, `line` and `text` nodes, all kinds the design lists |
| AD-003 | In-house definition as the single source | Yes | One `GraphTypeDefinition`. The regenerated files are committed and fresh. DEL-002 puts per-type wording in the shared validator (`ELEMENTS_OF`), not in the type's definition (CR-003) |
| AD-004 | Staged validator; every independent problem reported, no cascades | Yes | The length check reads lengths and always runs. The scale check is skipped when a value failed, which is the TICKET-001 pattern pinned at `tests/core/line-graph.test.ts:159-161`. DEL-002 changes how stage 2 classifies a top-level element option (CR-003) |
| AD-005 | Kebab-case `type`, camel-case terms, JSON Pointer paths | Yes | `line-graph`, `series`, `values`, `lineLabel`, `lineColor`. The paths are `/series/1/values` |
| AD-006 | Published and strict tool schemas | Yes | Both have the line-graph branch, regenerated with `maxItems` 6 and 100 and nullable optional terms in the tool profile |
| AD-007 | 400-unit space; `fmt()` for every number | Yes | See prd/TC-002 |
| AD-008 | No ids; arrowheads and markers as plain shapes | Yes | `drawMarker` returns one `circle` or `polygon` per point (`src/layout/kit/markers.ts:19-87`). Dash patterns are `stroke-dasharray` attributes |
| AD-010 | Estimated text metrics for label layout | Yes | Labels are placed in reserved bands (title, plot, names, axis label, legend), with no candidate search through `labels.ts` (DEL-005). The geometry property test (`tests/layout/line-graph.test.ts:259-271`) checks that no text overlaps text, lines or markers, up to the crowded-columns limit (DEL-004) |
| AD-011 | Inline presentation attributes; accessible palette with non-color cues | Yes | `stroke`, `fill`, `stroke-width` and `stroke-dasharray` come from `defaultStyle` and `seriesStyles`. There is no CSS |
| AD-014 | Pure components; fallback receives the issues | Yes | `createGraphComponent("line-graph", …)`. Half a megabyte of title, axis-label and series-label text renders without the fallback, in at most 33 text nodes (`tests/react/Graph.test.tsx:350-367`) |

### Known Hazards

| Hazard (ticket) | Honoured | Evidence |
|-----------------|----------|----------|
| `lineColor`/`lineLabel` per series; reported at the top level as inapplicable | Yes | Nested per series (`src/core/definitions/line-graph.ts:100-101`). Reported as `inapplicable_property` at the top level by DEL-002 (`tests/core/line-graph.test.ts:58-71`) |
| DGP-NFR-004 is greyscale only; markers and dashes are still required (prd/CC-002, AD-011) | Yes | See criterion 5 |
| No `<marker>` elements or ids (AD-008) | Yes | See AD-008 |
| GSV TICKET-001 CR-005: use the relative luminance reading; do not change the palette | Yes | The palette is unchanged, and both checks pass |
| Definition contract (GSV CR-002, QR-001, QR-002) | Yes | `defineProperties`; no shared top-level option listed in `properties`; nested shared specs; text helpers from `src/core/format.ts`; registered and covered by `tests/core/definitions.test.ts` |
| GSV TICKET-003 SEC-001: `maxItems` on every list; limits in the description text | Yes | `categories` 100, `series` 6, `values` 100. The type and `series` descriptions state the limits |
| GSV TICKET-004 CR-003, SEC-004: domain-check inputs, frozen description, `createIssue`, size-bound work | Yes | `valueScaleCheck` inputs are path patterns (`:52`). The length check is `ALWAYS_RUNS`. Every issue is built with `createIssue`, and no work grows with a value's magnitude |
| GSV TICKET-005 CR-001, QR-001, QR-002: a rich example; `pnpm generate` committed | Yes | Every optional term is used once. The re-run `pnpm generate` leaves no change |
| GSS TICKET-002 CR-003: the provenance contract | Yes | `describe(g, provenance)`, `layout(g, provenance)`, `sourceOf`, the definition's own `describe`, `titleBlock`, and a blank title treated as absent |
| GSS TICKET-002 SEC-001..003: no caller-sized spread; wrap and cap labels; **say so in the label-text descriptions**; `stateMeasurement`; half-megabyte test | Partly | Everything except the descriptions is done. The published `lineLabel`, `categoryAxisLabel` and `valueAxisLabel` descriptions do not say the drawing cuts them (CR-001) |
| DGP TICKET-001 SEC-002: category names in the large-text test | Consciously carried | The pre-flight records that `CATEGORY_NAME_LIMIT` (200, DGP TICKET-005 SEC-001) supersedes this. **Probe:** under the limit, the worst line graph I found (18 categories of narrow-word names) draws 919 text nodes. The 100-category case is 371 KB of markup. The bound holds |
| DGP TICKET-001 SEC-003: values bounded to ±`VALUE_LIMIT` | Yes | `:97`; `tests/core/line-graph.test.ts:140-142` |
| DGP TICKET-001 SEC-001, SEC-004: `tickIntervalCheck`, a `checkValueScale` check, draw only checked scales, a tiny-span test | Yes | Both checks are registered (`:107`), and the layout draws through `resolveValueScale`. The tiny-span test exists, but it does not pin the guard (CR-004) |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| DGP-REQ-002 | `@spec DGP-REQ-002` | `src/layout/kit/value-scale.ts:drawValueAxisLabel` (line 290), `drawCategoryAxisLabel` (314) | Yes |
| DGP-REQ-004 | `@spec DGP-REQ-004` | `src/core/definitions/line-graph.ts:lineGraph` (65), `describe` (113) | Yes |
| DGP-REQ-010 | `@spec DGP-REQ-010` | `src/core/definitions/line-graph.ts:lineGraph` (65), `series` (80); `src/core/definitions/categories.ts:seriesValuesPerCategoryCheck` (223); `src/layout/line-graph.ts:lineGraphLayout` (139); `src/react/graphs/LineGraphGraph.tsx:LineGraph` (12) | Yes |
| DGP-REQ-011 | `@spec DGP-REQ-011` | `src/core/definitions/line-graph.ts:lineGraph` (65), `series` (80); `src/layout/line-graph.ts:seriesStyleOf` (41), `drawLegend` (75) | Yes |
| DGP-REQ-012 | `@spec DGP-REQ-012` | `src/layout/line-graph.ts:seriesLine` (48), `lineGraphLayout` (139); `src/layout/kit/markers.ts:drawMarker` (18) | Yes |
| DGP-REQ-013 | `@spec DGP-REQ-013` | `src/layout/line-graph.ts:drawLegend` (75) | Yes |
| DGP-REQ-014 | `@spec DGP-REQ-014` | `src/layout/line-graph.ts:seriesStyleOf` (41), `drawLegend` (75), `lineGraphLayout` (139); `src/layout/kit/markers.ts:drawMarker` (18) | Yes |
| DGP-REQ-015 | `@spec DGP-REQ-015` | `src/core/definitions/line-graph.ts:valueScaleCheck` (49), `lineGraph` (65), `series` (80); `src/layout/line-graph.ts:lineGraphLayout` (139) | Yes |
| DGP-REQ-016 | `@spec DGP-REQ-016` | `src/core/definitions/line-graph.ts:lineGraph` (65); `src/core/definitions/categories.ts:seriesValuesPerCategoryCheck` (223) | Yes |
| DGP-NFR-004 | `@spec DGP-NFR-004` | `src/core/style.ts:seriesStyles` (88 reads `@spec GSV-REQ-044, GSV-NFR-004`) | No (CR-002) |
| CPSE-REQ-004 | `@spec CPSE-REQ-004` | `src/entries/line-graph.ts` (3) | Yes |
| CPSE-REQ-007 | `@spec CPSE-REQ-007` | `src/react/graphs/LineGraphGraph.tsx:LineGraph` (12) | Yes |

**Coverage:** 8 of 8 functional requirements in Requirements Covered are annotated, plus DGP-REQ-002, CPSE-REQ-004 and CPSE-REQ-007. DGP-NFR-004 is not annotated. Each annotation sits on the line above its declaration or property, as the pictograph's do.
**Missing:** DGP-NFR-004 at `src/core/style.ts:seriesStyles` (CR-002)
**Specification table:** Partly. `## @spec Coverage` in `.gener8v/specifications/data-graphs-and-pictographs.md` lists every DGP location above, and the DGP-REQ-002 and DGP-REQ-004 rows were extended correctly. But the DGP-NFR-004 row (`:184`) names `src/core/style.ts`:seriesStyles, which carries no `@spec DGP-NFR-004` (CR-002). The CPSE table has both new rows (`:190-191`).

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm generate` | 0 | Yes. Afterwards `git status --short src/generated` is empty, and so is the rest of the tree apart from the pre-existing `.gener8v/pipeline-state.yaml` and `.gener8v/runs.jsonl` changes. `tests/fixtures/generated/description.ts` is rewritten unchanged |
| `pnpm lint` | 0 | Yes |
| `pnpm typecheck` | 0 | Yes |
| `pnpm test` | 0 | Yes (39 files, 1,024 tests, as recorded) |
| `pnpm bench` | 0 | Yes (GSV-NFR-001 line-graph p95 0.0511 ms over 6,352 runs against a 5 ms limit; the record has 0.054 ms) |
| `pnpm build` | 0 | Yes (`dist/line-graph.js`, `dist/line-graph.d.ts`) |
| `pnpm check:dist` | 0 | Yes (12 built files, no network APIs or modules) |
| `pnpm check:deps` | 0 | Yes (0 runtime dependencies) |
| `pnpm check:images` | 0 | Yes (8 images, every license recorded and allowed) |
| `pnpm size` | not run | Skipped: size-limit's esbuild plugin writes its bundles to the system temp directory, which this review may not write to. **Stand-in probe:** an in-memory esbuild bundle of the built entries (minified ESM, React external, gzipped, nothing written) gives `./line-graph` 19.98 kB, under its 25 kB limit, and `.` 23.90 kB, under 120 kB. The method differs from size-limit's, so these figures are not comparable with the record's 18.47 kB |
| `pnpm publint` | 0 | Yes (All good) |
| `pnpm attw` | 0 | Yes (`./line-graph`: node16 ESM and bundler pass) |
| `pnpm audit` | 0 | Yes (no known vulnerabilities) |
| `gener8v-state.py lint` | 0 | Yes (0 errors, 0 warnings) |
| Mutation checks; visual check | not re-run | These are record evidence, not commands. The probes cited in the findings stand in for behaviour |

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable (flagged for the Product Owner) | The GSV TICKET-003 SEC-001 decision requires a curriculum-sized `maxItems` on every list. Six is the largest count at which DGP-REQ-014 and prd/CC-002 still hold with the six default styles. The limit appears in the type and `series` descriptions. DGP-REQ-010 says "one or more series", and the specification has no Open Question, Assumption or Edge Case for the cap. The Product Owner's decision therefore lives only in this record's Notes. Record it in the specification at the next Specification amendment, as DGP OQ-004 carries the pictograph's cap |
| DEL-002 | Reasonable for the line graph; questionable as a shared rule (CR-003) | It meets the ticket's Known Hazard ("report them at the graph level as inapplicable"), and QR-009's own recommendation had proposed `inapplicable_property` at the top level. The user chose it mid-delivery, and the record says it partly supersedes QR-009. However: the per-type phrase table sits in the shared validator; for the number line and the bar graph the hint omits the whole-graph term the caller probably meant; and only a line-graph test pins the new rule |
| DEL-003 | Reasonable | It keeps one vocabulary definition per term (GSV-REQ-012). The pictograph's published `values` description changes, and its meaning moves to the item description. `pnpm generate` is committed. The package is unreleased, so no changeset is needed for the description change |
| DEL-004 | Reasonable | `MARKER_REACH` is the star's reach, and a kit test checks every shape against it. The crowded-columns case stays with DGP TICKET-003, and the lower threshold (about 17 categories with a value axis) was appended to TICKET-003's Known Hazards in this commit. The specification's Edge Case ("very many categories … legibility is the caller's choice") is still met: `createGraph` draws 50 and 100 categories (probed) |
| DEL-005 | Reasonable | Markers and axis labels in the kit serve the bar graph (axis labels) and the xy graphs (markers). The ticket's Prior Art said `labels.ts` had legend helpers; it does not, and the pre-flight caught that |

*Deviations from the plan:*
- *The shared validator (DEL-002):* decided with the user and recorded. Its downstream wording is CR-003.
- *The pictograph's `values` description (DEL-003):* regenerated and consistent.
- *The geometry helpers moved to `tests/fixtures/scene-geometry.ts`:* the pictograph tests still pass on the shared fixture, and rotated text and line strokes are now bounded too.
- *The property test stops at 16 categories (DEL-004):* carried to TICKET-003, with an instruction to extend this test.

## Findings

### CR-001: The published `lineLabel`, `categoryAxisLabel` and `valueAxisLabel` descriptions do not say the drawing cuts them after two lines

**Severity:** Issue
**Location:**
- the descriptions: `src/core/definitions/shared.ts:56` (`lineLabel`), `:92` (`categoryAxisLabel`) and `:101` (`valueAxisLabel`), published in `src/generated/schema.json`, `src/generated/tool-schema.json`, `src/generated/vocabulary.json` and `src/generated/description.ts`;
- the cuts: `src/layout/kit/value-scale.ts:271-281` (`AXIS_LABEL_MAX_LINES`, `axisLabelLines`) and `src/layout/line-graph.ts:33-35`, `:81` (`LEGEND_MAX_LINES`);
- the wording point: `src/core/definitions/line-graph.ts:86` (the `series` description).

**Traces To:** ticket Known Hazard, carried from graph-library/geometric-shapes-and-solids-ticket-002-security-review/SEC-001 ("Wrap every label … Say so in the label-text descriptions, and keep the full text in the text alternative"); precedent graph-library/data-graphs-and-pictographs-ticket-005-code-review/CR-004 (`valueUnitLabel`); DGP-REQ-002; DGP-REQ-011
**Description:** This delivery is the first to draw these three options:
- an axis label is wrapped and cut at 2 lines with "…";
- a series label is cut at 2 lines in the legend;
- the text alternative states each whole.

The published descriptions say only "A label for the axis that lists the categories, as plain text", "A label for the axis that shows the values, as plain text" and "A label for a line: … or one series of a line graph, as plain text". The title's description (`shared.ts:37`), the circle's label texts (`src/core/definitions/circle.ts:72`) and the pictograph's `valueUnitLabel` (`categories.ts:100`, after TICKET-005 CR-004) all state their cut.

A smaller wording point in the same published text: the `series` description says "Without a lineColor, each takes the next default color". In fact a series' default color is chosen by its position. A probe with series 0 colored red gives series 1 the palette's second color (`#bd5300`), not its first, so "next" reads as a queue the code does not keep.
**Impact:** A caller or model reading the schema or vocabulary is not told that a long axis or series label shows only in part. The carried hazard is unmet for the three options this ticket is the first to draw.
**Recommendation:**
- Add the cut to each of the three descriptions, in the title's form. For example: "In the drawing, an axis label longer than two lines is cut short with “…”; the text alternative states it whole." For `lineLabel`: "In a line graph's legend, a label longer than two lines is cut short with “…”; the text alternative states it whole."
- Optionally, reword the `series` sentence to "each takes the default color for its position".
- Run `pnpm generate` and commit the regenerated files.

The bar graph (DGP TICKET-003) will draw the same axis labels, so the shared wording serves both.
**Status:** Resolved
**Resolution:** Resolved — the `lineLabel`, `categoryAxisLabel` and `valueAxisLabel` descriptions (`src/core/definitions/shared.ts`) now say that in the drawing (a line graph's legend, for `lineLabel`) a label longer than two lines is cut short with “…”, while the text alternative states it whole. The `series` description says a series takes the default color for its position. Regenerated. Approved by the user, 2026-10-15.

---

### CR-002: DGP-NFR-004's coverage row names `seriesStyles`, which carries no `@spec DGP-NFR-004`, and the record says it is "already annotated"

**Severity:** Issue
**Location:**
- `src/core/style.ts:88`: `// @spec GSV-REQ-044, GSV-NFR-004` above `seriesStyles`. The doc comment at `:85` mentions DGP-NFR-004, but the `@spec` line does not.
- `.gener8v/specifications/data-graphs-and-pictographs.md:184`: the DGP-NFR-004 row.
- the delivery record's `## @spec Annotations` (DGP-NFR-004: "`src/core/style.ts`:seriesStyles (already annotated)").

**Traces To:** DGP-NFR-004; CLAUDE.md Traceability ("`grep -rn "@spec"` audits coverage"); Code Review step 8; precedent graph-library/data-graphs-and-pictographs-ticket-001-code-review/CR-003 (DGP-REQ-002 listed at `shared.ts` with no annotation there)
**Description:** `grep -rn "@spec.*DGP-NFR-004"` finds nothing in the repository. This project's other NFRs are annotated where they are implemented:
- `@spec DGP-REQ-028, DGP-NFR-002` on `partialPicture`;
- `@spec DGP-REQ-034, DGP-NFR-005` on the image manifest;
- `@spec … GSV-NFR-004` on `seriesStyles` itself.

The coverage row this delivery added therefore names a location the code does not tie to the requirement. The record states the opposite.
**Impact:** An audit by `grep` shows DGP-NFR-004 as unimplemented. The specification table, the record and the code disagree, the same gap DGP TICKET-001 CR-003 closed.
**Recommendation:**
- Add `DGP-NFR-004` to the `@spec` line at `src/core/style.ts:88` (`// @spec GSV-REQ-044, GSV-NFR-004, DGP-NFR-004`). This is annotation only.
- Correct the record's `@spec Annotations` row under Post-Review Amendments.

**Status:** Resolved
**Resolution:** Resolved — `src/core/style.ts`:seriesStyles now carries `@spec GSV-REQ-044, GSV-NFR-004, DGP-NFR-004`, matching the coverage row. The delivery record's "already annotated" is corrected in its Post-Review Amendments. Approved by the user, 2026-10-15.

---

### CR-003: DEL-002's "give it on each … instead" hint is a per-type table in the shared validator, points away from a whole-graph term on the number line and the bar graph, and is not pinned by a structure test

**Severity:** Observation
**Location:**
- `src/core/validate/structure.ts:206-226` (`appliesToType` and `ELEMENTS_OF`) and `:258-262` (the `"elements"` branch of `checkMap`);
- `src/core/issues.ts:308-311` (the template);
- `tests/core/validate-structure.test.ts:83` (the test name states the superseded rule);
- the delivery record DEL-002.

**Traces To:** DEL-002; AD-003 ("Adding a graph type means adding one definition, one layout and one example"); AD-004 (stage 2: "unknown or inapplicable (with suggestion…)"; otherwise "the issue lists the applicable terms"); GSV-REQ-031 (the message "says what would make the value acceptable"); GSV-REQ-041; graph-library/graph-specification-and-vocabulary-ticket-003-quality-review/QR-009
**Description:** For the line graph DEL-002 is right: `lineLabel` and `lineColor` have no top-level meaning there, and "give it on each series instead" is the fix. But the rule and its wording also cover four types that are not registered yet, through a table in the shared validator:
- **Number line.** Probed with the fixture registry: a top-level `label: "Temperature"` reads "label does not apply for a number-line as a whole; give it on each point or segment instead." The number line's own label is `lineLabel`, and its own color is `lineColor` (`src/core/definitions/shared.ts:48`, `:57`). Under QR-009's rule the caller got `unknown_property` with `allowed`, which lists `lineLabel`, `lineColor` and `title`. That pointer is gone.
- **Bar graph.** A top-level `color` will read "give it on each category instead". Coloring every bar is `barColor` (DGP TICKET-003 acceptance criteria), which the message no longer shows. TICKET-003's appended hazard records the new wording, but not that it omits `barColor`.
- **Where the wording lives.** The phrase for each type ("each point or segment", "each category") is written in `structure.ts`, not in the type's definition. A new type with element options gets no hint unless the shared validator is edited, against AD-003's one-definition rule.
- **Tests.** Only `tests/core/line-graph.test.ts:58-71` pins the new rule. No structure test covers it on the fixture number line or xy graph, though both are affected today. The test at `tests/core/validate-structure.test.ts:83` is still named "reports an option that applies elsewhere in the type as unknown at that position". Its cases are all nested, so it passes, but at the top level its name is no longer true.

**Impact:** No registered type is affected wrongly today. When the number-line and bar-graph tickets land, a caller who means the whole-graph option is sent to per-element options. The validator's behaviour for those types will have been set by this ticket, without a test of its own.
**Recommendation:** Choose with the user:
1. **Move the hint into the definition.** Add an optional per-type phrase to `GraphTypeDefinition` (for example `elementsHint: "each series"`) and drop `ELEMENTS_OF`. Each type ticket then writes its own hint and can name its whole-graph alternative, for example "give it on each category, or use barColor for every bar". Or:
2. **Keep the table, and keep the pointer.** Add `allowed` (the top-level terms) to the `"elements"` issue, so a whole-graph alternative stays visible. Or:
3. **Defer to the tickets.** Append a Known Hazard to graph-library/number-lines-and-coordinate-graphs/TICKET-002 and extend DGP TICKET-003's: the hint must name `lineLabel`/`lineColor` or `barColor` where the caller probably meant the whole graph.

Whichever is chosen:
- add a structure test on the fixture number line (top-level `label` and `color`);
- rename the test at `tests/core/validate-structure.test.ts:83` to "…inside an element or nested object…".

**Status:** Resolved
**Resolution:** Resolved — the hint moved into the definition, and the validator's `ELEMENTS_OF` table is gone.
  - `GraphTypeDefinition.elementsHint` is optional; the line graph sets "each series".
  - Only a type that names a hint reports a top-level element option as `inapplicable_property` with "give it on … instead".
  - Any other type keeps QR-009's behaviour: `unknown_property` with the top-level terms, which name its whole-graph options (a number line's `lineLabel` and `lineColor`, a bar graph's `barColor`). The number-line and bar-graph tickets write their own hints, if any.
  - `tests/core/validate-structure.test.ts` covers both behaviours on the fixture number line, and the out-of-date test name now says "inside an element or nested object".
  - Breaking either behaviour fails a test.

  Approved by the user, 2026-10-15.

---

### CR-004: The line graph's tiny-span test passes with the tiny-span guard removed

**Severity:** Observation
**Location:** `tests/core/line-graph.test.ts:154-157`; the guard is at `src/core/value-scale.ts:290-312`
**Traces To:** ticket Known Hazard, carried from graph-library/data-graphs-and-pictographs-ticket-001-security-review/SEC-001 ("Add a test that a description with a given end near ±`VALUE_LIMIT` and a tiny span is reported, not drawn"); delivery record plan (Tests: "the scale checks (including an end near ±`VALUE_LIMIT` with a tiny span, reported rather than drawn)")
**Description:** The test gives `valueScale: { minimum: 999_999_999, maximum: 999_999_999.000001 }` with every value at `999_999_999.5`, and asserts only `valid === false`.
- **What it reports now:** a probe gives the guard's `out_of_range /valueScale/maximum` ("must be a number at least 1000000000").
- **Without the guard:** `checkValueScale` reaches its exclusion loop (`:322-328`). The values lie above the given maximum, so it reports `scale_excludes_value` instead, and the test still passes.

So the test proves that the check is registered for the line graph, not that the tiny span is caught. The guard itself is tested at the kit level (`tests/layout/kit/value-scale.test.ts:155-170`). The test also has no layout or `createGraph` assertion for "not drawn".
**Impact:** Small. The guard is covered elsewhere, and the line graph uses the shared check. But the test named for the hazard would not catch a line-graph-specific regression, such as a wrapper that bypassed the guard, and the record's mutation list does not include one.
**Recommendation:**
- Use values inside the given scale, for example `999_999_999`, so the guard is the only fault.
- Assert the exact issue: `out_of_range /valueScale/maximum`.
- Add `expect(createGraph(tiny).ok).toBe(false)` for "not drawn".

**Status:** Resolved
**Resolution:** Resolved — the test now keeps every value inside the given scale, so the tiny span is the only fault. It asserts exactly `out_of_range /valueScale/maximum` and that `createGraph` refuses to draw it. Removing the guard now fails it. Approved by the user, 2026-10-15.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Fix | Label descriptions state the two-line cut; series color wording; regenerated | `src/core/definitions/shared.ts`, `src/core/definitions/line-graph.ts`, `src/generated/*` |
| CR-002 | Fix | `@spec DGP-NFR-004` on `seriesStyles`; record corrected | `src/core/style.ts`, delivery record |
| CR-003 | Fix (hint in the definition) | `elementsHint` on the definition; table removed; types without a hint keep QR-009; structure tests | `src/core/definitions/types.ts`, `src/core/definitions/line-graph.ts`, `src/core/validate/structure.ts`, `tests/core/validate-structure.test.ts`, DGP `TICKET-003.md` |
| CR-004 | Fix | Tiny-span test pins the exact issue and `createGraph` refusing | `tests/core/line-graph.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (all 4 Resolved)
**Notes:**
- All nine acceptance criteria are met, every covered requirement is implemented, and all four findings are fixed and re-verified.
- `pnpm generate` (regenerated for CR-001), `lint`, `typecheck`, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size` (`./line-graph` 18.49 kB), `publint`, `attw`, `audit` and `gener8v-state lint` exit 0. `pnpm test` (1,026 tests) exits 0 on three runs.
- Deliberately breaking the CR-003 rule (either way) and removing the tiny-span guard each fail a test.
- The six-series limit (DEL-001) is still pending with the Product Owner.
