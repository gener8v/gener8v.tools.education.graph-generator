# TICKET-003: Bar graph

**Change:** graph-library
**Capability Area:** Data Graphs & Pictographs (data-graphs-and-pictographs)
**Specification:** specifications/data-graphs-and-pictographs.md

**Summary:** Add the `bar-graph` type end to end: definition with one value per category, vertical or horizontal bars drawn in exact proportion, graph and per-category colors, optional value labels, text alternative, component, entry point and example.
**Priority:** Must
**Value:** A curriculum developer can show category totals as bars whose lengths are exactly faithful to the numbers.

**Requirements Covered:**
- DGP-REQ-004: Plain-text alternative naming type, title, labels, every category and value
- DGP-REQ-017: One bar per category, length set by value
- DGP-REQ-018: Vertical or horizontal orientation, default vertical
- DGP-REQ-019: Bar color for the whole graph and optional per-category color
- DGP-REQ-020: Option to show each bar's value as a label
- DGP-REQ-021: Report a negative bar value
- DGP-REQ-022: Zero value draws no bar but keeps position and label
- DGP-REQ-036: Bar lengths in exact proportion to values

**Prior Art:**
- Read: TICKET-001 output at `src/core/definitions/categories.ts` and `src/layout/kit/value-scale.ts` — shared categories, scale checks, value axis and category slots
- Read: `src/core/style.ts` — produced by graph-library/graph-specification-and-vocabulary/TICKET-001; default bar color and named colors
- Read: `src/layout/registry.ts`, `src/react/createGraphComponent.tsx` — produced by graph-library/component-packaging-and-source-export/TICKET-003
- Read: `.gener8v/specifications/data-graphs-and-pictographs.md` — DGP-REQ-017..022, DGP-REQ-036, Scale and Layout behaviours (value label shown as supplied), edge cases (non-integer values, scale minimum above zero)

**Acceptance Criteria:**
- [ ] `type: "bar-graph"` with `categories` and `values` (one number per category) validates and renders one bar per category in description order; a values/categories length difference is reported with `series_length_mismatch`
- [ ] `orientation` accepts `vertical` (default) and `horizontal`; horizontal bars grow from the value axis along x
- [ ] `barColor` colors every bar; a per-category color overrides it for that bar only
- [ ] `showValues: true` draws each bar's value as a label on or beside the bar, as supplied (no rounding)
- [ ] A negative value is reported with `out_of_range` at `/values/<i>`
- [ ] A `valueScale.minimum` above zero is reported (bars must start at zero)
- [ ] A zero value draws no bar; its category slot and name remain
- [ ] Non-integer values (for example 2.5) are accepted and drawn proportionally
- [ ] Each bar's drawn length equals value ÷ (scale maximum − scale minimum) × axis length, within the rounding of `fmt()` (DGP-REQ-036; tolerance target proved in TICKET-006)
- [ ] The text alternative names type, title, axis labels and every category with its value
- [ ] `src/entries/bar-graph.ts` exports `BarGraph`; package.json `exports` has `./bar-graph`; `.size-limit.json` has a bar-graph entry; `examples/bar-graph.json` and at least two `examples/invalid/bar-graph-*.json` exist

**Output:**
- `src/core/definitions/bar-graph.ts` — GraphTypeDefinition, registered in `src/core/definitions/index.ts`
- `src/layout/bar-graph.ts` — layout, registered in `src/layout/registry.ts`
- `src/react/graphs/BarGraphGraph.tsx` — component (exported as `BarGraph`)
- `src/entries/bar-graph.ts`, package.json `exports["./bar-graph"]`, `.size-limit.json` entry
- `examples/bar-graph.json`, `examples/invalid/bar-graph-negative.json`, `examples/invalid/bar-graph-scale-above-zero.json`
- `tests/core/bar-graph.test.ts` — negative value, scale minimum, length mismatch, colors precedence, text alternative
- `tests/layout/bar-graph.test.ts` — orientation, zero bar, value labels, proportional length

**Constraints:**
- prd/TC-002: rounded coordinates
- prd/CC-002: bar colors must meet 3:1 against the background by default (palette from GSV)

**Known Hazards:**
- Per-category color on a **pictograph** is inapplicable (edge case table), but on a bar graph it is valid — define the per-category color property in the bar-graph definition only, not in the shared categories spec of TICKET-001
- Negative bar values are rejected here while line graphs accept them (DGP OQ-007 open) — do not reuse the line graph's `allowNegative` scale path
- Category elements nest the shared `color` spec object (`elementsOf` lists `bar-graph`, DGP-REQ-019). The whole-graph bar color is a type-specific term.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-001-code-review/CR-002 and graph-library/graph-specification-and-vocabulary-ticket-001-quality-review/QR-001, QR-002 (the definition contract, RES-001):
  - Build every properties map with `defineProperties` (`src/core/definitions/types.ts`), which freezes it and removes prototypes.
  - Never list a shared top-level option (`title`, `lineColor`, axis labels…) in `properties`: `propertiesOf(type)` adds it from its `appliesTo`.
  - Nest the shared `label`/`color` (or `lineLabel`/`lineColor` for series) spec objects themselves in element specs, exactly when `elementsOf` lists the type.
  - Import text helpers from `src/core/format.ts`, never `src/core/describe.ts` (lint enforces it).
  - In `describe`, pass every caller string through `quoteText`, and state measurements with `formatMeasurement(value, provenance, unit)` so supplied values appear as written and derived values rounded.
  - Register the definition in `src/core/definitions/index.ts`, and run the applicability and consistency checks in `tests/core/definitions.test.ts` against it.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-003-security-review/SEC-001 (Product Owner decision 2026-10-06): every `array` spec must set `maxItems` (the compiler requires it) to a curriculum-sized number. For example, at most 1,000 points or categories, or what the type's specification implies. A longer list is reported once as `too_large`. The whole description is capped at `DESCRIPTION_VALUE_LIMIT` (10,000 values, `src/core/validate/structure.ts`); keep every example well under both, and record the chosen limits in the definition's description text.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-004-code-review/CR-003 and graph-library/graph-specification-and-vocabulary-ticket-004-security-review/SEC-004: domain checks (`DomainCheck`, `src/core/definitions/types.ts`):
  - `inputs` are the paths the check reads, as JSON Pointers without the leading slash, with `*` for any list position (`["xAxis/min", "xAxis/max", "points/*/x"]`). The check is skipped only when an earlier failure touches one of them; `tests/core/definitions.test.ts` checks that every path exists.
  - The description a check receives is frozen; never change it.
  - Build every issue with `createIssue`. A hand-built issue, or one with a message over 2,000 characters, is treated as a package defect.
  - A check's work must grow with the description's size, never with a value's magnitude. For example, count ticks arithmetically (`floor(range / spacing)`) and compare with the limit before enumerating anything.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-005-code-review/CR-001 and graph-library/graph-specification-and-vocabulary-ticket-005-quality-review/QR-001, QR-002: `examples/<type>.json` must be a valid description of the type (it is the base the GSV-NFR-003 agreement test mutates one fault at a time; `tests/core/schema-agreement.test.ts` fails with a message naming the missing file when the type registers without one). Keep it rich: every optional term used once and lists with at least one element, so every property is mutated. Also run `pnpm generate` and commit the regenerated `src/generated` files in this delivery.
- Carried from graph-library/geometric-shapes-and-solids-ticket-002-code-review/CR-003 (DEL-001 on that delivery): the definition and layout contract now passes the provenance. Write `describe(normalized, provenance)` and `layout(normalized, provenance)` (`Layout<D>` in `src/layout/registry.ts`), even where the technical design and this ticket's Output still show one argument. TypeScript accepts a one-argument function, so dropping the provenance compiles; it then shows supplied values rounded (GSS-REQ-034 and its equivalents). Read a value's source with `sourceOf(provenance, term)` (`src/core/format.ts`). Call your own definition's `describe` from the layout, never `describeNormalized`, so no registry is reached. Draw a title with `titleBlock` (`src/layout/kit/title.ts`), and treat a title that is blank after cleaning as absent in `describe` too (code review CR-001).
- Carried from graph-library/geometric-shapes-and-solids-ticket-002-security-review/SEC-001, SEC-002 and SEC-003 (caller-sized text):
  - Never spread a caller-sized array into function arguments (`f(...nodes)`, `Math.max(...widths)`, `push(...lines)`). Above about 65,000 arguments in Safari, and about 120,000 in V8, the call throws. Use a loop, or pass one array (`SceneSvg` already does).
  - Wrap every label with `wrap(text, maxWidth, fontSize, maxLines)`, as the circle does with `LABEL_MAX_LINES` (4), and draw titles with `titleBlock`, which caps them at `TITLE_MAX_LINES` (3). The cut line ends in "…" (DEL-008), so the Scene stays small however long the description's text. Say so in the label-text descriptions, and keep the full text in the text alternative.
  - In `describe`, state measurements with `stateMeasurement(value, source, unit)` (`src/core/format.ts`), not `formatMeasurement`. It quotes a unit that is not unit-shaped, so the unit cannot read as the package's own sentence. Drawn labels keep `measurementLabel` / `formatMeasurement`.
  - Add a test that a valid description with half a megabyte of unit or label text renders in `<Graph>` and the type's component without throwing, with a bounded number of text nodes.
- Carried from graph-library/data-graphs-and-pictographs-ticket-001-security-review/SEC-001, SEC-002 and SEC-003 (value scale and category names):
  - **Category names (SEC-002, deferred to the Product Owner):** names wrap with no line cap, because the specification says a name is never cut. A caller-sized name therefore grows the Scene: 100 names of 1,000 characters make 100,000 text nodes and 18 MB of SVG, and about 2 MB makes rendering throw after the fallback.
    - The SEC-001 rule above ("cut at a fixed number of lines") does not apply to category names. They are covered by the pending Product Owner decision on a caller-text length bound (GSS TICKET-002 SEC-002), which would reject, not cut, an over-long name.
    - Until that decision, include category names in the half-megabyte large-text test, record the node count and markup size it produces, and do not claim a bounded number of text nodes for them.
  - **Data values (SEC-003):** bound every data value spec to ±`VALUE_LIMIT` (`src/core/value-scale.ts`, 1,000,000,000), so a scale chosen from the values always prints as a plain number.
  - **Scale checks (SEC-001, SEC-004):** register `tickIntervalCheck` and a `DomainCheck` wrapping `checkValueScale` for the type's values (line and bar graphs).
    - `checkValueScale` rejects scales too fine to draw: a non-zero given end smaller than 1e-9, or a span narrower than a billionth of its ends. Without it, `valueTicks` throws on a scale the validator passed.
    - Draw only scales that passed, with `resolveValueScale` and `valueTicks` / `drawValueAxis`.
    - Add a test that a description with a given end near ±`VALUE_LIMIT` and a tiny span is reported, not drawn.
- Carried from graph-library/data-graphs-and-pictographs-ticket-005-quality-review/QR-002, QR-004 and QR-006 (category names and the length check, in the shared kit):
  - **Crowded columns (deferred here):** below a vertical plot, `categorySlots` rotates every name to read upward when a word would not fit its column, and never splits a word. Rotated names stay apart only while one line (14.4 units) fits a column, about 25 categories in the 368-unit plot. Past that they touch. Settle the crowded case for upright bars (and the line graph, which shares the kit): for example a wider drawing, fewer name lines, or labelling every other category. Then extend the pictograph's geometry property test (`tests/layout/pictograph.test.ts`, "the drawing's geometry") past 25 columns.
  - Use `valuesPerCategoryCheck()` from `src/core/definitions/categories.ts` for `series_length_mismatch` at `/values`; do not write the check inline.
  - Reserve room for names with the kit's exported `NAME_GAP`, and size rows from the tallest name with `categorySlots`' `slotSize`, as the pictograph does.
- Carried from graph-library/data-graphs-and-pictographs-ticket-005-security-review/SEC-001, SEC-002 (supersedes the "tallest name" wording above):
  - Category names are at most `CATEGORY_NAME_LIMIT` (200) characters, a provisional limit pending the Product Owner. The shared `categories` spec enforces it, so the bar graph inherits it; do not draw from an unvalidated name.
  - `categorySlots`' `slotSize` sizes each row from its own name's height, not the tallest. Use it for horizontal bars so one long name makes one tall row.
- Carried from graph-library/data-graphs-and-pictographs-ticket-002-delivery (DEL-003, DEL-004, DEL-005):
  - A value axis on the left narrows the plot, so rotated names crowd sooner than in the pictograph. In the line graph, one rotated line stops fitting its column from about 17 categories, with wide tick labels and a value-axis label. The crowded-columns fix must cover such plots. Extend the line graph's geometry property test (`tests/layout/line-graph.test.ts`) past 16 categories as well.
  - Use `VALUES_DESCRIPTION` (`categories.ts`) for the `values` term: a term has one description in the vocabulary.
  - Draw axis labels with the kit's `axisLabelLines`, `drawValueAxisLabel` and `drawCategoryAxisLabel`.
  - A top-level `color` on a bar graph is now reported as "give it on each category instead" (DEL-002 of TICKET-002).

**Depends On:** TICKET-001
**Blocks:** TICKET-006

**Size:** Medium

**Notes:** Cross-area predecessors: graph-library/component-packaging-and-source-export/TICKET-003 and graph-library/graph-specification-and-vocabulary/TICKET-004. Grouped and stacked bars are out of scope (DGP OQ-005).
