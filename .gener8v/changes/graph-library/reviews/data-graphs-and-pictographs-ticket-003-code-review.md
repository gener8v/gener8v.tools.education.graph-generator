# TICKET-003: Bar graph — Code Review

## Summary

I reviewed the delivery of `graph-library/data-graphs-and-pictographs/TICKET-003`: delivery commit `1fd9f5e` on branch `ticket/dgp-003`, on top of `main` at `4f633f7`. I checked it against:
- the ticket's eleven acceptance criteria and every Known Hazard it carries (from the GSV, GSS, DGP TICKET-001, TICKET-002 and TICKET-005 reviews);
- the Data Graphs & Pictographs specification:
  - DGP-REQ-004, DGP-REQ-017..022 and DGP-REQ-036;
  - DGP-REQ-001..003 and DGP-REQ-005..009 as the bar graph applies them;
  - the Scale and Layout rules, the Edge Cases, and the `## @spec Coverage` rows this delivery added or changed;
- the CPSE coverage rows (CPSE-REQ-004, CPSE-REQ-007);
- `constraints/prd.md` and `technical-design/system-design.md` (AD-001..AD-008, AD-010, AD-011, AD-014);
- the DGP TICKET-001, TICKET-002 and TICKET-005 reviews, for patterns already settled.

What holds:
- The bar graph is complete end to end: definition, layout, component, `./bar-graph` entry, three examples and tests.
- All eleven acceptance criteria are met, and every requirement the ticket covers is implemented.
- Every Verification Run command reproduces with exit 0, except `pnpm size`. I skipped it because it writes to the system temp directory; an in-memory probe stands in for it. `pnpm generate` leaves no tracked change.
- The carried definition-contract, provenance, scale-check and caller-text rules are followed:
  - `defineProperties`, and the shared `color` nested in each category;
  - `describe(normalized, provenance)` with `quoteText`, `stateMeasurement` and `sourceOf`, and `titleBlock`;
  - `maxItems` 100, and values bounded to 0..`VALUE_LIMIT`;
  - `tickIntervalCheck` and a `checkValueScale` domain check with `allowNegative: false`;
  - `valuesPerCategoryCheck()`, `NAME_GAP`, `slotSize`, and `elementsHint` naming `barColor`.
- The crowded-columns question deferred here (DGP TICKET-005 QR-002, TICKET-002 DEL-004) is settled within the specification's Edge Case. Every name is drawn, and the drawing stays inside its bounds; I probed 26, 50 and 100 categories for all three types, in both axes.

There are two Issues:
- **CR-001.** Value labels are wrapped with no line cap, as the specification requires, but nothing measures or bounds them at the provisional limits. The worst bar graph draws 10,903 text nodes (2.1 MB of markup) upright and a drawing 53,212 units tall across. The Known Hazards ask for a bounded-node test and for the measurement to be recorded. The other two data graphs pin theirs.
- **CR-002.** `valueScaleCheck` carries `@spec DGP-REQ-021` but reports no negative value, and the DGP-REQ-021 coverage row repeats it. The DGP-REQ-020 row also leaves out `barGraphLayout`, which carries `@spec … DGP-REQ-020`.

There are three Observations:
- **CR-003.** The core test named "states values exactly as written" still passes when `describe` drops the provenance. Its values print the same whether supplied or derived.
- **CR-004.** The crowded-columns hazard asked for the pictograph's and the line graph's geometry property tests to be extended past 25 and 16 categories. Fixed 50/100 cases replaced that, and they check only the horizontal extent. The bar graph's own upright property test stops at 12 categories.
- **CR-005.** The shared `ORIENTATION_DESCRIPTION` removes the pictograph's default ("horizontal, the default") from the published and tool schemas. The per-type value descriptions that name each default reach only `vocabulary.json`.

**Reviewer:** `code-reviewer` agent, fresh context (findings phase only, 2026-10-19)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/data-graphs-and-pictographs-ticket-003-delivery.md`
**Files Reviewed:**
- `src/core/definitions/bar-graph.ts`
- `src/core/definitions/categories.ts` (`ORIENTATION_DESCRIPTION`), `src/core/definitions/pictograph.ts` (its `orientation` description), `src/core/definitions/index.ts`
- `src/core/value-scale.ts` (`ScaleOptions.intervals`, DEL-004)
- `src/layout/bar-graph.ts`
- `src/layout/kit/value-scale.ts` (`rotatedNameLines`, `drawLeftAxisLabel`, `drawBottomAxisLabel`; DEL-001, DEL-002)
- `src/layout/line-graph.ts` (the `MARKER_REACH` plot edge and the renamed helpers)
- `src/layout/registry.ts`, `src/react/graphs/BarGraphGraph.tsx`, `src/entries/bar-graph.ts`, `src/index.ts`
- `package.json`, `tsup.config.ts`, `.size-limit.json`
- `examples/bar-graph.json`, `examples/invalid/bar-graph-negative.json`, `examples/invalid/bar-graph-scale-above-zero.json`
- `src/generated/description.ts`, `src/generated/schema.json`, `src/generated/tool-schema.json`, `src/generated/vocabulary.json` (bar-graph branch and the `orientation` term)
- `tests/core/bar-graph.test.ts`, `tests/layout/bar-graph.test.ts`
- `tests/layout/kit/value-scale.test.ts`, `tests/layout/line-graph.test.ts`, `tests/layout/pictograph.test.ts` (the additions)
- `tests/react/Graph.test.tsx`, `tests/package/per-type-bundle.test.ts` (the bar-graph cases)
- `.gener8v/specifications/data-graphs-and-pictographs.md` and `.gener8v/specifications/component-packaging-and-source-export.md` (`## @spec Coverage`)
- Read for context, unchanged here:
  - `src/core/definitions/shared.ts`, `src/core/style.ts`, `src/core/format.ts`;
  - `src/layout/kit/format.ts`, `src/layout/kit/text.ts`, `src/layout/kit/title.ts`, `src/layout/kit/markers.ts`;
  - `tests/core/style.test.ts`, `tests/core/definitions.test.ts`, `tests/core/line-graph.test.ts`, `tests/core/describe.test.ts`;
  - `.gener8v/changes/graph-library/tickets/data-graphs-and-pictographs/TICKET-006.md`;
  - the DGP TICKET-001, TICKET-002 and TICKET-005 code reviews.

**Findings:** 5
**Critical:** 0 | **Issues:** 2 | **Observations:** 3

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| `type: "bar-graph"` with `categories` and `values` (one number per category) validates and renders one bar per category in description order; a values/categories length difference is reported with `series_length_mismatch` | Yes | **Code:** `defineBarGraph` (`src/core/definitions/bar-graph.ts:77-149`) is registered at `src/core/definitions/index.ts:25`. `barGraphLayout` (`src/layout/bar-graph.ts:265-277`) is registered at `src/layout/registry.ts:36`. Slots come from the kit's `categorySlots` in order (`:161`, `:206`). The length check is the shared `valuesPerCategoryCheck()` (`:121`). **Tests:** `tests/core/bar-graph.test.ts:26-37`, `:102-105` (including no knock-on issue when categories are empty); `tests/layout/bar-graph.test.ts:52-60`, `:271-276` |
| `orientation` accepts `vertical` (default) and `horizontal`; horizontal bars grow from the value axis along x | Yes | Enum at `src/core/definitions/bar-graph.ts:94-104`. The layout draws horizontal only when `orientation === "horizontal"` (`src/layout/bar-graph.ts:270`). Horizontal bars are `rect(zero, …, length, …)` (`:236`), with the value axis along the bottom (`:225`). **Tests:** `tests/core/bar-graph.test.ts:63-67`; `tests/layout/bar-graph.test.ts:142-152`, `:62-75` (both orientations) |
| `barColor` colors every bar; a per-category color overrides it for that bar only | Yes | `barColorOf` (`src/layout/bar-graph.ts:51-53`): the category's color, else `barColor`, else `defaultStyle.colors.accent`. **Tests:** `tests/layout/bar-graph.test.ts:165-171`. The core test checks normalization only (`tests/core/bar-graph.test.ts:26-37`); precedence is a layout behaviour |
| `showValues: true` draws each bar's value as a label on or beside the bar, as supplied (no rounding) | Yes | `valueLabelLines` (`src/layout/bar-graph.ts:66-68`) uses `displayValue(value, sourceOf(provenance, "values/i"))`. The label sits above an upright bar (`:168-175`) or right of a bar across (`:237-244`). **Tests:** `tests/layout/bar-graph.test.ts:175-195`, where `0.000123456789` would read `0.00012` if derived. **Probe:** `1.005` is drawn as "1.005". Size at the limits: CR-001 |
| A negative value is reported with `out_of_range` at `/values/<i>` | Yes | Items are `min: 0` (`src/core/definitions/bar-graph.ts:91`), so stage 2 reports a negative value. **Tests:** `tests/core/bar-graph.test.ts:94-96`, `:136-139` (`examples/invalid/bar-graph-negative.json`) |
| A `valueScale.minimum` above zero is reported (bars must start at zero) | Yes | `scaleStartsAtZeroCheck` (`src/core/definitions/bar-graph.ts:55-63`) gives `out_of_range` at `/valueScale/minimum` with `range: { max: 0 }`. **Tests:** `tests/core/bar-graph.test.ts:107-119`, which also checks that 0 and −5 are accepted; `:136-139` (`examples/invalid/bar-graph-scale-above-zero.json`) |
| A zero value draws no bar; its category slot and name remain | Yes | `if (length > 0)` guards the rect (`src/layout/bar-graph.ts:167`, `:236`). Slots and names are drawn for every category. **Tests:** `tests/layout/bar-graph.test.ts:126-138` |
| Non-integer values (for example 2.5) are accepted and drawn proportionally | Yes | `tests/core/bar-graph.test.ts:98-100`; `tests/layout/bar-graph.test.ts:110-113`; the example uses 7.5 |
| Each bar's drawn length equals value ÷ (scale maximum − scale minimum) × axis length, within the rounding of `fmt()` | Yes | `barLength` (`src/layout/bar-graph.ts:60-62`) is `fmt((value / (max − min)) × axisLength)`, drawn from `fmt(valuePosition(0))` (`:159`, `:228`). **Tests:** `tests/layout/bar-graph.test.ts:62-75` (within 0.005, both orientations), `:77-85` (a scale from −5), `:87-108` (property test). The 0.5 px target is TICKET-006's (DGP-NFR-001) |
| The text alternative names type, title, axis labels and every category with its value | Yes | `describe` (`src/core/definitions/bar-graph.ts:130-147`) quotes caller text, treats a blank title or axis label as absent, and states each value with `stateMeasurement(value, sourceOf(provenance, …))`. The layout calls the bar graph's own `describe` (`src/layout/bar-graph.ts:274`). **Tests:** `tests/core/bar-graph.test.ts:143-171`. The "as written" test does not pin the provenance (CR-003) |
| `src/entries/bar-graph.ts` exports `BarGraph`; package.json `exports` has `./bar-graph`; `.size-limit.json` has a bar-graph entry; `examples/bar-graph.json` and at least two `examples/invalid/bar-graph-*.json` exist | Yes | `src/entries/bar-graph.ts:4`, `package.json:63-66`, `tsup.config.ts:16`, `.size-limit.json:45-48` (25 kB), `src/index.ts:6`. `pnpm publint` and `pnpm attw` pass; attw passes `./bar-graph` for node16 ESM and bundler. `tests/package/per-type-bundle.test.ts:182-195` covers isolation in both directions, and `tests/react/Graph.test.tsx:118` the display name. The schema-agreement test and the bench read the example (bar-graph p95 0.0388 ms in the re-run) |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| DGP-REQ-004 | Plain-text alternative naming type, title, labels, every category and value | `src/core/definitions/bar-graph.ts:describe`; `src/layout/bar-graph.ts:barGraphLayout` (`textAlternative`) | Yes (test precision: CR-003) |
| DGP-REQ-017 | One bar per category, length set by value | `src/core/definitions/bar-graph.ts:barGraph`; `src/layout/bar-graph.ts:barLength`, `drawVertical`, `drawHorizontal`, `barGraphLayout`; `src/react/graphs/BarGraphGraph.tsx:BarGraph` | Yes |
| DGP-REQ-018 | Vertical or horizontal, default vertical | `src/core/definitions/bar-graph.ts:barGraph`, `orientation`; `src/layout/bar-graph.ts:barGraphLayout` (`:270`), `drawVertical`, `drawHorizontal` | Yes |
| DGP-REQ-019 | Whole-graph bar color and per-category color | `src/core/definitions/bar-graph.ts:barColor`, `categories` (shared `color` nested, `src/core/definitions/shared.ts:117-125`); `src/layout/bar-graph.ts:barColorOf` | Yes |
| DGP-REQ-020 | Option to show each bar's value as a label | `src/core/definitions/bar-graph.ts:showValues`; `src/layout/bar-graph.ts:valueLabelLines`, `drawVertical`, `drawHorizontal` | Yes (size at the limits: CR-001) |
| DGP-REQ-021 | Report a negative bar value | `src/core/definitions/bar-graph.ts:barGraph` (`values` items `min: 0`, reported by the structure stage) | Yes (annotation: CR-002) |
| DGP-REQ-022 | Zero value draws no bar, keeps position and label | `src/layout/bar-graph.ts:drawVertical` (`:167`), `drawHorizontal` (`:236`) | Yes |
| DGP-REQ-036 | Bar lengths in exact proportion to values (the bar half; the line-graph half and the tolerance are TICKET-006's) | `src/layout/bar-graph.ts:barLength`, `barGraphLayout`; `src/core/definitions/bar-graph.ts:scaleStartsAtZeroCheck` | Yes |
| DGP-REQ-001..003 (applied) | Categories, axis labels, order | the kit's `categorySlots`, `drawCategoryNames`, `axisLabelLines`, `drawLeftAxisLabel` and `drawBottomAxisLabel` (`src/layout/kit/value-scale.ts:173`, `:266`, `:306`, `:316`) | Yes |
| DGP-REQ-005..009 (applied) | Optional scale; zero-based default; scale includes values; interval rules; every tick labeled | `valueScaleCheck` and `tickIntervalCheck` (`src/core/definitions/bar-graph.ts:39-48`, `:121`); `resolveValueScale` with `allowNegative: false` (`src/layout/bar-graph.ts:127-139`); `drawValueAxis`. DEL-004 keeps every tick labeled on the shorter horizontal axis | Yes |
| CPSE-REQ-004, CPSE-REQ-007 | Per-type entry; one component per type | `src/entries/bar-graph.ts`; `src/react/graphs/BarGraphGraph.tsx:BarGraph` | Yes |

*Every requirement in the ticket's Requirements Covered field is listed. The ticket carries no NFR: DGP-NFR-001 and DGP-NFR-003 are TICKET-006's. The applied shared requirements and the two CPSE requirements are added because this delivery draws, annotates or adds coverage rows for them.*

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/TC-002 | Round every emitted number | Yes | Bars and axis lines go through `fmt()` (`src/layout/bar-graph.ts:76-97`). `barLength` and the zero position are rounded once (`:61`, `:159`, `:228`). Text goes through the kit's `textLines`, which rounds, and the Scene height is `fmt(end + SCENE_MARGIN)` (`:273`). `pnpm lint` enforces `fmt()` |
| prd/CC-002 | Text alternative; 3:1 contrast for graphical objects by default; color not the only cue | Yes | `describe` becomes `Scene.textAlternative`. The default bar is `defaultStyle.colors.accent` (#0072b2, about 5.2:1 on white), which `tests/core/style.test.ts:20-22` checks with every default color. Bars are told apart by position and name, not color. `barColor` and category colors are the caller's, from the shared named-color rule |
| prd/TC-001 | No DOM measurement | Yes | Row heights, headroom, label widths and tick-label fit all come from `textWidth`/`wrap` estimates (`src/layout/bar-graph.ts:70-74`, `:100-118`, `:147-151`, `:199-213`) |
| prd/TC-011 | The package breaks lines | Yes | Title through `titleBlock`; axis labels through `axisLabelLines` (two-line cap); names by the kit, never cut; value labels wrapped and never cut (DEL-005, per the specification). Size: CR-001 |
| prd/TC-003 (via AD-008) | No ids | Yes | Only `rect`, `line` and `text` nodes. `checkScene` runs on every Scene in `tests/layout/bar-graph.test.ts:15-21` |
| prd/TC-005 | Core imports no React | Yes | `src/core/definitions/bar-graph.ts` imports core modules only. `pnpm lint` passes |
| prd/TC-007 | Per-type, side-effect-free entry | Yes | `defineBarGraph` is `/* @__NO_SIDE_EFFECTS__ */` under `/* @__PURE__ */` (`:70`, `:76`), and so is the component. The bundle tests run in both directions |
| prd/CC-001 | Licensed dependencies and assets | Yes | No new dependency (`pnpm check:deps`: 0 runtime dependencies) |
| prd/CC-003 | No data collection or network use | Yes | `pnpm check:dist`: 14 built files, no network APIs |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-001 | One package, per-type entry points | Yes | `./bar-graph` in `exports`, `tsup` and `.size-limit.json`. `BarGraph` is also exported from `.` (`src/index.ts:6`). Stand-in size: 20.20 kB gzip |
| AD-002 | Pure layout → plain-data Scene | Yes | `barGraphLayout(normalized, provenance)` returns `rect`, `line` and `text` nodes, all kinds the design lists |
| AD-003 | In-house definition as the single source | Yes | One `GraphTypeDefinition`, and `elementsHint` lives in the definition (DGP TICKET-002 CR-003). The regenerated files are committed and fresh. `tests/core/definitions.test.ts:196-200` runs the consistency checks over every registered definition |
| AD-004 | Staged validator; no cascades | Yes | Negatives are a stage-2 `out_of_range`. `valueScaleCheck` names `values/*` as an input, so it is skipped when a value failed. `scaleStartsAtZeroCheck` reads `valueScale/minimum` only, so a negative value and a positive minimum are both reported (probed) |
| AD-005 | Kebab-case `type`, camel-case terms, JSON Pointer paths | Yes | `bar-graph`, `values`, `orientation`, `barColor`, `showValues`; `/values/1`, `/valueScale/minimum` |
| AD-006 | Published and strict tool schemas | Yes | Both carry the bar-graph branch, with nullable optional terms in the tool profile (`orientation` enum includes `null`). The shared `orientation` wording is CR-005 |
| AD-007 | 400-unit space; `fmt()` for every number; `displayValue` for displayed values | Yes | `SCENE_WIDTH` is 400. Value labels use `displayValue` with the provenance |
| AD-008 | No ids | Yes | See prd/TC-003 |
| AD-010 | Estimated text metrics for label layout | Yes | Labels sit in reserved bands (title, headroom, plot, names, axis labels), as in the line graph (DGP TICKET-002 DEL-005). The property test checks no text overlaps text or bars while uncrowded (`tests/layout/bar-graph.test.ts:239-253`); its range is CR-004 |
| AD-011 | Inline presentation attributes; accessible default palette | Yes | `fill`, `stroke` and `stroke-width` come from `defaultStyle`. There is no CSS |
| AD-014 | Pure components; fallback receives the issues | Yes | `createGraphComponent("bar-graph", …)`. Half a megabyte of title and axis-label text renders in both orientations without the fallback (`tests/react/Graph.test.tsx:372-393`) |

### Known Hazards

| Hazard (ticket) | Honoured | Evidence |
|-----------------|----------|----------|
| Per-category color on the bar graph only, not in the shared categories spec | Yes | `categoriesProperty({ color: sharedProperties.color })` in the bar-graph definition (`:84`). **Probe:** a pictograph category color is still `inapplicable_property /categories/0/color` |
| Negative bar values rejected; do not reuse the line graph's `allowNegative` path | Yes | `allowNegative: false` in the check (`src/core/definitions/bar-graph.ts:46`) and in the layout (`src/layout/bar-graph.ts:127`, `:130`, `:139`) |
| Category elements nest the shared `color`; the whole-graph color is a type term | Yes | `src/core/definitions/shared.ts:124` lists `bar-graph` in `elementsOf`. `barColor` is a bar-graph term |
| Definition contract (GSV CR-002, QR-001, QR-002) | Yes | `defineProperties`; no shared top-level option listed; text helpers from `src/core/format.ts`; registered; definitions test covers it |
| GSV TICKET-003 SEC-001: `maxItems`; limits in the description text | Yes | `values` `maxItems: CATEGORY_LIMIT`; categories from the shared spec. The type description says "At most 100 categories" |
| GSV TICKET-004 CR-003, SEC-004: domain-check inputs, frozen input, `createIssue`, size-bound work | Yes | Both new checks declare path inputs, build issues with `createIssue`, and do constant or per-value work |
| GSV TICKET-005 CR-001, QR-001, QR-002: a rich valid example; `pnpm generate` committed | Yes | Every optional term is used once, including a category color, a zero and a non-integer value (`tests/core/bar-graph.test.ts:39-57`). The re-run `pnpm generate` leaves no change |
| GSS TICKET-002 CR-003: the provenance contract | Yes (test precision: CR-003) | `describe(g, provenance)`, `layout(g, provenance)`, `sourceOf`, the definition's own `describe`, `titleBlock`, and a blank title treated as absent |
| GSS TICKET-002 SEC-001..003: no caller-sized spread; wrap and cap labels; `stateMeasurement`; half-megabyte test with a bounded node count | Partly | No spread. Title and axis labels are capped, and the half-megabyte test passes in both orientations. Value labels are wrapped without a cap by design (DEL-005, "as supplied, without rounding"), but no test bounds them and no measurement is recorded (CR-001) |
| DGP TICKET-001 SEC-002: category names in the large-text test; record node count and markup size | Consciously carried (names); not met (value labels) | `CATEGORY_NAME_LIMIT` (200) supersedes the half-megabyte of names, as the TICKET-002 review accepted. **Probe:** 100 names of 200 characters, without value labels, give 111 text nodes upright and 1,511 across. The new uncapped text is the value label (CR-001) |
| DGP TICKET-001 SEC-003: values bounded to `VALUE_LIMIT` | Yes | `min: 0, max: VALUE_LIMIT` (`:91`) |
| DGP TICKET-001 SEC-001, SEC-004: `tickIntervalCheck`, a `checkValueScale` check, draw only checked scales, a tiny-span test | Yes (test substituted, recorded) | Both checks are registered (`:121`), and the layout draws through `resolveValueScale`. The planned tiny-span test became "such a scale cannot be given to a bar graph" (Deviations). That holds: with the minimum at most 0, the span is at least either end's size. The guard's other branch, a tiny non-zero end such as `maximum: 1e-10`, is still reachable and reported (probed); it is tested in the shared kit |
| DGP TICKET-005 QR-002: crowded columns; then extend the pictograph's property test past 25 columns | Settled; test extension substituted | DEL-001. Fixed 50/100 cases were added, not the property-test extension (CR-004) |
| DGP TICKET-005 QR-004, QR-006: `valuesPerCategoryCheck()`, `NAME_GAP`, `slotSize` | Yes | `:121`; `src/layout/bar-graph.ts:181`, `:196`, `:206-208` |
| DGP TICKET-005 SEC-001, SEC-002: names limited by the shared spec; rows sized to their own name | Yes | Inherited limit. `slotSize` is per row (`tests/layout/bar-graph.test.ts:154-161`) |
| DGP TICKET-002 DEL-003..005: crowded line graph past 16 (extend its property test); `VALUES_DESCRIPTION`; kit axis-label helpers | Partly | `VALUES_DESCRIPTION` is used (`:90`), and so are the kit helpers, renamed (DEL-002). The line graph's crowded case is settled, but its property test still stops at 16 (CR-004) |
| DGP TICKET-002 CR-003: `elementsHint` names `barColor` | Yes | `:123`. The message is pinned at `tests/core/bar-graph.test.ts:77-91` |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| DGP-REQ-004 | `@spec DGP-REQ-004` | `src/core/definitions/bar-graph.ts:barGraph` (69), `describe` (129) | Yes |
| DGP-REQ-017 | `@spec DGP-REQ-017` | `src/core/definitions/bar-graph.ts:barGraph` (69); `src/layout/bar-graph.ts:barLength` (59), `drawVertical` (137), `drawHorizontal` (191), `barGraphLayout` (264); `src/react/graphs/BarGraphGraph.tsx:BarGraph` (12) | Yes |
| DGP-REQ-018 | `@spec DGP-REQ-018` | `src/core/definitions/bar-graph.ts:barGraph` (69), `orientation` (93); `src/layout/bar-graph.ts:drawVertical`, `drawHorizontal`, `barGraphLayout` | Yes |
| DGP-REQ-019 | `@spec DGP-REQ-019` | `src/core/definitions/bar-graph.ts:barGraph` (69), `barColor` (105); `src/layout/bar-graph.ts:barColorOf` (50), `barGraphLayout` (264) | Yes |
| DGP-REQ-020 | `@spec DGP-REQ-020` | `src/core/definitions/bar-graph.ts:barGraph` (69), `showValues` (112); `src/layout/bar-graph.ts:valueLabelLines` (65), `drawVertical`, `drawHorizontal`, `barGraphLayout` (264) | Yes (coverage row: CR-002) |
| DGP-REQ-021 | `@spec DGP-REQ-021` | `src/core/definitions/bar-graph.ts:barGraph` (69). Also on `valueScaleCheck` (38), which reports no negative value | Yes; one misplaced (CR-002) |
| DGP-REQ-022 | `@spec DGP-REQ-022` | `src/layout/bar-graph.ts:drawVertical` (137), `drawHorizontal` (191), `barGraphLayout` (264) | Yes |
| DGP-REQ-036 | `@spec DGP-REQ-036` | `src/layout/bar-graph.ts:barLength` (59), `barGraphLayout` (264); `src/core/definitions/bar-graph.ts:scaleStartsAtZeroCheck` (54) | Yes |
| CPSE-REQ-004 | `@spec CPSE-REQ-004` | `src/entries/bar-graph.ts` (3) | Yes |
| CPSE-REQ-007 | `@spec CPSE-REQ-007` | `src/react/graphs/BarGraphGraph.tsx:BarGraph` (12) | Yes |
| DGP-REQ-002 (renamed, DEL-002) | `@spec DGP-REQ-002` | `src/layout/kit/value-scale.ts:drawLeftAxisLabel` (305), `drawBottomAxisLabel` (315) | Yes |

**Coverage:** 8 of 8 requirements in Requirements Covered are annotated, plus CPSE-REQ-004, CPSE-REQ-007 and the renamed DGP-REQ-002 helpers. Each annotation sits on the line above its declaration or property, as the line graph's and the pictograph's do.
**Missing:** None. One annotation names a requirement its code does not implement: `@spec DGP-REQ-021` on `valueScaleCheck` (CR-002).
**Specification table:** Partly. The new rows (`.gener8v/specifications/data-graphs-and-pictographs.md:185-191`), the extended DGP-REQ-004 row (`:164`) and the renamed DGP-REQ-002 row (`:153`) match the code, with two exceptions (CR-002):
- the DGP-REQ-020 row (`:188`) leaves out `barGraphLayout`, which carries `@spec … DGP-REQ-020` and is in the record's table;
- the DGP-REQ-021 row (`:189`) lists `valueScaleCheck`.

The CPSE table has both new rows (`.gener8v/specifications/component-packaging-and-source-export.md:192-193`). No stale reference to `drawValueAxisLabel` or `drawCategoryAxisLabel` remains in `src`, `tests` or the living artifacts. Only this ticket's own Known Hazard text still names them.

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm generate` | 0 | Yes. Afterwards `git status --short src/generated` is empty. The rest of the tree shows only the pre-existing `.gener8v/pipeline-state.yaml` and `.gener8v/runs.jsonl` changes. `tests/fixtures/generated/description.ts` is rewritten unchanged |
| `pnpm lint` | 0 | Yes |
| `pnpm typecheck` | 0 | Yes |
| `pnpm test` | 0 | Yes (41 files, 1,087 tests, as recorded) |
| `pnpm bench` | 0 | Yes. GSV-NFR-001 bar-graph p95 is 0.0388 ms over 8,856 runs, against a 5 ms limit; the record has 0.036 ms |
| `pnpm build` | 0 | Yes (`dist/bar-graph.js`, `dist/bar-graph.d.ts`) |
| `pnpm check:dist` | 0 | Yes (14 built files, no network APIs or modules) |
| `pnpm check:deps` | 0 | Yes (0 runtime dependencies) |
| `pnpm check:images` | 0 | Yes (8 images, every license recorded and allowed) |
| `pnpm size` | not run | Skipped: size-limit writes its bundles to the system temp directory, which this review may not write to. **Stand-in probe:** an in-memory esbuild bundle of the built entries (minified ESM, React external, gzipped, nothing written) gives `./bar-graph` 20.20 kB, under its 25 kB limit, and `.` 25.96 kB, under 120 kB. The method differs from size-limit's, so these figures are not comparable with the record's 18.66 kB |
| `pnpm publint` | 0 | Yes (All good) |
| `pnpm attw` | 0 | Yes (`./bar-graph`: node16 ESM and bundler pass) |
| `pnpm audit` | 0 | Yes (no known vulnerabilities) |
| `gener8v-state.py lint` | 0 | Yes (0 errors, 0 warnings) |
| Mutation checks; visual check | not re-run | These are record evidence, not commands. The probes cited in the findings stand in for behaviour |

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | It follows the specification's Edge Case ("draw them all; legibility is the caller's choice"). Moving a rotated block inward keeps it under the plot and moves it by at most about half a slot. The line graph's `MARKER_REACH` edge (`src/layout/line-graph.ts:155`) narrows every line graph's plot by 4.5 units, not only crowded ones, but positions stay proportional within the plot. **Probe:** 26, 50 and 100 categories of all three types stay inside the drawing in x and y. The hazard's property-test extension was replaced (CR-004) |
| DEL-002 | Reasonable | Naming by position fits a layout where the two axes swap sides. The doc comments, the line graph, the kit tests and the DGP-REQ-002 row follow it. No later ticket names the old helpers |
| DEL-003 | Reasonable | The accent is already a checked default color (3:1, `tests/core/style.test.ts:20-22`), and no new style entry is needed |
| DEL-004 | Reasonable | The option is internal (`src/core/value-scale.ts:65`, `:138`). Fewer intervals give a coarser interval, so the tick count only falls, and `valueTicks` cannot throw on a scale the validator passed. A given interval is never changed, and DGP-REQ-006 and DGP-REQ-009 still hold. The upright and across drawings of the same data may choose different maxima (for example 8,000 and 10,000), which no requirement forbids |
| DEL-005 | Reasonable in rule; unbounded in size (CR-001) | The rule follows the specification: a value label shows the value "as supplied, without rounding", so it is wrapped, never cut. Its worst case at the provisional limits is not measured or pinned |

*Deviations from the plan:*
- *`ScaleOptions.intervals` (DEL-004) and the line graph's marker reach (DEL-001):* both were found by tests and are recorded. The line-graph change alters a reviewed component's geometry slightly, and its tests pass.
- *The tiny-span test became "cannot be given to a bar graph":* the claim holds (Known Hazards above). The test asserts `toContain` rather than the exact issue list, and it does not check that `createGraph` refuses; the line graph's twin was tightened in DGP TICKET-002 CR-004. This is recorded, not a finding: the shared guard is tested in the kit.

## Findings

### CR-001: Value labels are never cut, but nothing bounds or records their size at the limits: 10,903 text nodes upright, a drawing 53,212 units tall across

**Severity:** Issue
**Location:**
- `src/layout/bar-graph.ts:66-68` (`valueLabelLines`: `wrap(…)` with no `maxLines`);
- `:147-151` (upright: wrapped to `max(24, slot − 2)`, headroom grown to the tallest label);
- `:199-213` (across: wrapped to 72, each row grown to its label);
- `tests/react/Graph.test.tsx:372-393` (the large-text test: two short values);
- the delivery record's Notes ("Bounded text: … A value label is at most 327 characters, wrapped").

**Traces To:**
- ticket Known Hazards:
  - carried from graph-library/geometric-shapes-and-solids-ticket-002-security-review/SEC-001: "Wrap every label with `wrap(…, maxLines)` … so the Scene stays small however long the description's text"; "Add a test … with a bounded number of text nodes";
  - carried from graph-library/data-graphs-and-pictographs-ticket-001-security-review/SEC-002, for text that is wrapped uncapped: "record the node count and markup size it produces, and do not claim a bounded number of text nodes";
- DEL-005; DGP-REQ-020; DGP Scale and Layout ("show the value as supplied, without rounding");
- precedents: the at-limits tests of the line graph (`tests/react/Graph.test.tsx:395`, DGP TICKET-002 SEC-001) and the pictograph (`:425`, DGP TICKET-005 SEC-001).

**Description:** A supplied value is written in full. `5e-324`, inside the 0..1e9 range, is 326 characters, and DEL-005 wraps it rather than cutting it. The rule is right: the specification forbids rounding a shown value. But a value label is the one caller-sized text in this type with no line cap. Neither the tests nor the record say how large it can make the drawing.

**Probes** (100 categories at the provisional limits, `showValues: true`, the first value 1 and the rest `5e-324`, rendered through `<BarGraph>`):

| Names | Orientation | Text nodes | Markup | Drawing height |
|-------|-------------|------------|--------|----------------|
| short | upright | 10,903 | 2,109,088 characters | 1,866 units |
| short | across | 3,770 | 798,797 characters | 53,212 units |
| 200-character | upright | 10,903 | 2,168,218 characters | 3,164 units |
| 200-character | across | 5,170 | 1,111,899 characters | 53,412 units |

- **Where the size comes from.** Upright, each label wraps to a 24-unit column, about 108 lines. Across, each row grows to about 530 units. Five categories across already make a drawing 2,732 units tall.
- **Without value labels**, the same 200-character names give 111 and 1,511 text nodes, so the value labels are the whole difference.
- **Compared with the other types.** The pictograph pins its worst case at 5,000 text nodes and under 1 MB. The line graph pins 150 text nodes and under 800,000 characters.
- **What the bar graph's tests cover.** The large-text test uses two short values, and its bound (`3 + 4 + 2 + 4 + 12` text nodes) holds only because of that. The layout test "keeps the drawing bounded for caller text of any length" (`tests/layout/bar-graph.test.ts:278-285`) does not turn on `showValues`.

**Impact:**
- **Unmeasured.** The carried hazard is unmet for the one new uncapped text this ticket introduces. A description the validator accepts can produce a 2 MB Scene, or a drawing 133 times taller than it is wide, and no test would notice if it grew.
- **Claim without numbers.** The record says the labels are bounded but gives no figures, so the security review and the Product Owner's pending caller-text decision have nothing to weigh.

**Recommendation:**
1. **Pin and record the worst case.** Add an at-limits test beside the line graph's and the pictograph's:
   - 100 categories with 200-character names, every value at its longest written form, `showValues: true`, both orientations;
   - assert the text-node count and markup size against the measured figures, written in a comment as the line graph's test does;
   - record the figures in the delivery record's Post-Review Amendments and correct its "Bounded text" note.
2. **Then decide with the user** whether to keep the size or shrink it without cutting any digits. For example:
   - wrap a horizontal bar's label to the free width right of its bar, not a fixed 72;
   - or let an upright label use more than its slot's width when columns are crowded, as names already may.

   Either way, flag the figures to the Security Review and the Product Owner's caller-text decision.

**Status:** Resolved
**Resolution:** Resolved — pinned and shrunk, with no digit cut.
  - A horizontal bar's value label wraps to the free width right of its own bar (at least 72 units).
  - In crowded upright columns, narrower than a line of text, a label wraps to 72 units rather than its slot.
  - **Measured at the limits** (100 categories, 200-character names, every value 5e-324, `showValues`):
    - upright: 3,802 text nodes and 861,141 characters of markup, down from 11,002 and 2,188,061;
    - across: 2,502 text nodes, 617,007 characters, and a drawing 22,048 units tall, down from 5,202 nodes and 53,728 units.
  - `tests/react/Graph.test.tsx` pins both orientations, and wrapping either way back to the old width fails it.
  - The figures are recorded in the delivery record for the Security Review and the Product Owner's caller-text decision.

  Approved by the user, 2026-10-19.

---

### CR-002: `valueScaleCheck` carries `@spec DGP-REQ-021` but reports no negative value, and the DGP-REQ-020 coverage row omits `barGraphLayout`

**Severity:** Issue
**Location:**
- `src/core/definitions/bar-graph.ts:38` (`// @spec DGP-REQ-021` above `valueScaleCheck`) and `:33-37` (its doc comment);
- `.gener8v/specifications/data-graphs-and-pictographs.md:188` (the DGP-REQ-020 row) and `:189` (the DGP-REQ-021 row);
- the delivery record's `## @spec Annotations` (the DGP-REQ-021 row).

**Traces To:** DGP-REQ-021, DGP-REQ-020; DGP-REQ-007, DGP-REQ-008; CLAUDE.md Traceability ("`grep -rn "@spec"` audits coverage"); Code Review step 8 ("list the right requirement IDs … a missing or stale row is an Issue-level finding"); precedents graph-library/data-graphs-and-pictographs-ticket-001-code-review/CR-003 and graph-library/data-graphs-and-pictographs-ticket-002-code-review/CR-002

**Description:**
- **DGP-REQ-021.** The requirement is "report a negative bar value". The `values` items' `min: 0` meets it in stage 2 (`:91`), under `barGraph`'s own `@spec … DGP-REQ-021`.
  - `valueScaleCheck` runs `checkValueScale` with `allowNegative: false`. With that option a chosen minimum is zero, which is DGP-REQ-006. The check reports a given scale that excludes a value, or a scale too fine to draw: DGP-REQ-007 and DGP-REQ-008.
  - It never sees a negative value, because `values/*` is one of its inputs, so a failed value skips it. Even if it ran, it would not report one unless a minimum were given.
  - The annotation and the DGP-REQ-021 row therefore point at code that does not implement the requirement. For comparison, the line graph's `valueScaleCheck` is annotated DGP-REQ-015, which its `allowNegative: true` does implement.
- **DGP-REQ-020.** `barGraphLayout` (`src/layout/bar-graph.ts:264`) carries `@spec … DGP-REQ-020`, and the record's table lists it. The specification row stops at `valueLabelLines, drawVertical, drawHorizontal`.

**Impact:**
- An audit by `grep` attributes the negative-value report to the scale check.
- Someone changing `valueScaleCheck` would think they were touching DGP-REQ-021.
- The DGP-REQ-020 row and the code disagree by one location.

All of this is traceability only; behaviour is correct.

**Recommendation:** Annotation and table only:
- **The annotation.** Change `src/core/definitions/bar-graph.ts:38` to `// @spec DGP-REQ-007, DGP-REQ-008`, the bar graph's use of the shared checks. Reword the doc comment's "(DGP-REQ-021)" as the reason for `allowNegative: false`.
- **The DGP-REQ-021 row.** Leave only `src/core/definitions/bar-graph.ts`:barGraph (values from 0).
- **The DGP-REQ-007 and DGP-REQ-008 rows.** Optionally add the bar graph's `valueScaleCheck`.
- **The DGP-REQ-020 row.** Add `barGraphLayout`.
- **The record.** Correct its `@spec Annotations` row under Post-Review Amendments.

**Status:** Resolved
**Resolution:** Resolved — `@spec DGP-REQ-021` moved from `valueScaleCheck` to the `values` term, whose `min: 0` rejects a negative value. The DGP-REQ-021 coverage row now names `barGraph, values`, and the DGP-REQ-020 row adds `barGraphLayout`. Approved by the user, 2026-10-19.

---

### CR-003: The test "states values exactly as written" passes with the provenance dropped

**Severity:** Observation
**Location:** `tests/core/bar-graph.test.ts:150-154` (and `:143-148`); the code under test is `src/core/definitions/bar-graph.ts:143`
**Traces To:**
- ticket Known Hazard, carried from graph-library/geometric-shapes-and-solids-ticket-002-code-review/CR-003: "TypeScript accepts a one-argument function, so dropping the provenance compiles; it then shows supplied values rounded";
- DGP-REQ-004; DGP Assumptions ("Values are drawn as supplied");
- precedent graph-library/data-graphs-and-pictographs-ticket-002-code-review/CR-004 (a test that does not pin what it names).

**Description:** The code is right: `describe` states each value with `sourceOf(provenance, "values/i")`. But the tests that name this behaviour do not depend on it.
- **The probe.** For the shipped example and for the test's own input (`[0.1, 1234567.25, 0.000001]`), `barGraph.describe(g, {})`, with no provenance and so every value "derived", returns exactly the same string as with the provenance. Each of those numbers prints the same rounded to two decimals, or to two significant figures.
- **What the tests would miss.** A `describe` that dropped or mis-keyed the provenance would pass every bar-graph core test.
- **The layout test is sound.** It pins the drawn labels (`0.000123456789`).
- **The line graph's twin** (`tests/core/line-graph.test.ts:218-220`, values `0.1, 1234567.25, -0.000001`) has the same blind spot. It is outside this ticket.

**Impact:** Small. The code is correct today, and TICKET-006's generated-description suite is required to compare the text alternative against values as supplied. But the bar graph's own test, named for the hazard, would not catch a regression.
**Recommendation:**
- Use values whose derived form differs, for example `[1.005, 0.000123456789, 7]`, and assert "1.005" and "0.000123456789".
- Optionally fix the line graph's twin the same way, or note it for TICKET-006.

**Status:** Resolved
**Resolution:** Resolved — `tests/core/bar-graph.test.ts` states 1234.56789012 and 0.123456789 with every digit. Without the provenance they read "1234.57", and dropping it now fails the test. Approved by the user, 2026-10-19.

---

### CR-004: The crowded-columns hazard's property-test extensions were replaced by fixed cases that check only the horizontal extent, and the bar graph's upright property test stops at 12 categories

**Severity:** Observation
**Location:**
- `tests/layout/bar-graph.test.ts:222` (`max: orientation === "vertical" ? 12 : 30`) and `:256-268`;
- `tests/layout/pictograph.test.ts:277-284` (still 25) and `:365-377`;
- `tests/layout/line-graph.test.ts:280` (still 16) and `:366-378`;
- the delivery record's DEL-001 ("Tests at 50 and 100 categories … check … that everything stays inside the drawing").

**Traces To:**
- ticket Known Hazards:
  - carried from graph-library/data-graphs-and-pictographs-ticket-005-quality-review/QR-002: "Then extend the pictograph's geometry property test … past 25 columns";
  - carried from graph-library/data-graphs-and-pictographs-ticket-002-delivery DEL-004: "Extend the line graph's geometry property test … past 16 categories as well";
- DGP Edge Cases ("Very many categories … draw them all"); AD-010.

**Description:** DEL-001 settles the crowded case: names may touch, so the overlap assertions cannot hold past the threshold. In place of the property-test extensions the hazards asked for, the delivery added fixed 50/100-category cases for each type. Three gaps remain:
- **Only x is checked.** The fixed cases assert `x0`/`x1` against the margins. "Everything stays inside the drawing" is claimed for y too, but not asserted.
- **The upright property test stops early.** The bar graph's own upright test generates 1 to 12 categories. Its `fc.pre` already skips crowded inputs, so the uncrowded band from 13 to about 23 categories is never generated.
- **The other property tests are unchanged** at 25 (pictograph) and 16 (line graph). DEL-001's "Property tests still cover only uncrowded layouts" records the choice, but not that the hazards' explicit instruction was set aside.

**Probes:**
- 1,500 generated upright bar graphs of 13 to 30 categories, with the test's own generator and pre-condition: 341 were uncrowded, and none had a geometry problem.
- 26, 50 and 100 categories for all three types stay inside the drawing in both x and y.

So this is coverage, not a defect.
**Impact:** A future change that pushes a crowded name block or value label off the bottom, or breaks the 13–23 band, would pass the suite.
**Recommendation:**
- Raise the bar graph's upright `max` to 30, or to the category limit, keeping the existing `fc.pre`.
- Add the y bounds to the three fixed crowded cases.
- Either extend the pictograph's and the line graph's property tests past their thresholds with containment-only assertions (overlap checks gated as the bar graph gates them), or record in DEL-001 that the hazards' extension was replaced by the fixed cases.

**Status:** Resolved
**Resolution:** Resolved — the 50- and 100-category tests of the bar graph, the line graph and the pictograph now also check that everything stays within the drawing's height. The upright bar property test now generates up to 30 categories; crowded cases are excluded from its overlap check, as before. A short Scene height fails four tests. Approved by the user, 2026-10-19.

---

### CR-005: The shared `orientation` description removes the pictograph's default from the published and tool schemas

**Severity:** Observation
**Location:**
- `src/core/definitions/categories.ts:43-47` (`ORIENTATION_DESCRIPTION`);
- `src/core/definitions/pictograph.ts:128`;
- published in `src/generated/schema.json` and `src/generated/tool-schema.json` (both `orientation` properties);
- `src/core/definitions/pictograph.ts:87` (the pictograph's type description).

**Traces To:** DGP-REQ-032 ("defaulting to horizontal rows"); DGP-REQ-018; GSV-REQ-009 (a plain-English description of every property in the published schema); AD-006 and prd/IC-001 (the tool schema's descriptions are how a model learns the vocabulary); DGP TICKET-002 DEL-003 (one description per term)
**Description:** One description per term is required, and the shared text keeps it. But the published schema and the tool schema each carry only the description and the enum for `orientation`:
- **Before:** the pictograph's read "Whether the pictures run in rows (horizontal, the default) or columns (vertical)."
- **Now:** both types read "… The default depends on the graph type."

The per-type `valueDescriptions` that say which ("(the default)") are emitted only in `vocabulary.json`.
- **The bar graph** is covered by its type description ("upright (the default) or across").
- **The pictograph** is not. Its type description reads "one row of pictures per category (or one column, upright)", which implies rows but does not say they are the default.

**Impact:** A model reading the tool schema is told a default exists but not which, for the pictograph. Nothing is drawn wrongly.
**Recommendation:** Pick one:
- **Name both defaults in the shared description**, for example "Which way the categories' rows, columns or bars run: horizontal or vertical. A bar graph's bars are vertical by default; a pictograph's rows are horizontal by default." Or:
- **Add it to the pictograph's type description**, for example "(rows by default)".

Then run `pnpm generate` and commit the regenerated files.

**Status:** Resolved
**Resolution:** Resolved — `ORIENTATION_DESCRIPTION` ends "The default is horizontal for a pictograph and vertical for a bar graph.", so both schemas state each default again, still with one description per term. Regenerated. Approved by the user, 2026-10-19.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Fix (pin and shrink) | Labels wrap to free width (across) or 72 (crowded upright); worst case pinned and recorded | `src/layout/bar-graph.ts`, `tests/react/Graph.test.tsx`, delivery record |
| CR-002 | Fix | `@spec DGP-REQ-021` on `values`; coverage rows corrected | `src/core/definitions/bar-graph.ts`, DGP spec coverage |
| CR-003 | Fix | Provenance-sensitive value test | `tests/core/bar-graph.test.ts` |
| CR-004 | Fix | Height checks in crowded tests (three types); upright property to 30 categories | `tests/layout/bar-graph.test.ts`, `tests/layout/line-graph.test.ts`, `tests/layout/pictograph.test.ts` |
| CR-005 | Fix | Shared orientation description names both defaults; regenerated | `src/core/definitions/categories.ts`, `src/generated/*` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (all 5 Resolved)
**Notes:**
- All eleven acceptance criteria are met, every covered requirement is implemented, and all five findings are fixed and re-verified.
- `pnpm generate` (regenerated for CR-005), `lint`, `typecheck`, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size` (`./bar-graph` 18.71 kB), `publint`, `attw`, `audit` and `gener8v-state lint` exit 0. `pnpm test` (1,089 tests) exits 0 on three runs.
- Four deliberate breaks of the fixes each fail a test.
