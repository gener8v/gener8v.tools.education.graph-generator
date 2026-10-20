# TICKET-002: Deliver the number line graph type

**Change:** graph-library
**Capability Area:** Number Lines & Coordinate Graphs (number-lines-and-coordinate-graphs)
**Specification:** specifications/number-lines-and-coordinate-graphs.md

**Summary:** Add the `number-line` graph type end to end: its definition (properties, checks, text alternative), its layout with arrowheads, marked points, custom tick labels and line label, its React component and entry point, and its example description.
**Priority:** Must
**Value:** A curriculum developer can produce a number line over any negative, positive or mixed range, with or without arrowheads and with labeled points, from one JSON description.

**Requirements Covered:**
- NLC-REQ-001: Number line parameters defined in the single definition using vocabulary terms (number-line part; xy and xyz in TICKET-003, TICKET-004)
- NLC-REQ-010: Report each point whose value lies outside the axis range (number-line part)
- NLC-REQ-011: Optional label and color per point, applied per GSV-REQ-040..045
- NLC-REQ-012: Text alternative generated from the normalized description, stating type, range and every marked point (number-line part)
- NLC-REQ-013: Optional caller-supplied text alternative replaces the generated one
- NLC-REQ-014: Render over a negative-only, positive-only or zero-spanning range
- NLC-REQ-015: Separate arrowhead setting for each end
- NLC-REQ-016: Arrowhead drawn at an end when, and only when, that end's setting is on
- NLC-REQ-017: Documented default arrowhead setting (both ends on)
- NLC-REQ-018: Mark each supplied point at its value
- NLC-REQ-019: Custom tick labels replace the numeric label at a given tick value
- NLC-REQ-020: Report a custom tick label whose value is not a tick position
- NLC-REQ-021: Optional label for the number line as a whole

**Prior Art:**
- Read: `.gener8v/specifications/number-lines-and-coordinate-graphs.md` — Number Lines requirements, Behaviors & Rules → Arrowheads and Points and Segments (coincident points both drawn, endpoint-inclusive ranges), Edge Cases rows for no points and custom labels off-tick, Data Requirements for the number line
- Read: `.gener8v/technical-design/system-design.md` — AD-002 (layout → Scene), AD-005 (type value `number-line`, camelCase properties), AD-007 (`fmt()`), AD-008 (arrowheads as polygons, accessible name via `aria-label` + `<title>`), AD-010 (label placement), AD-011 (presentation attributes, named colors)
- Read: TICKET-001 output at `src/core/definitions/axis.ts`, `src/layout/kit/ticks.ts`, `src/layout/kit/axis.ts` — axis properties and checks, `niceTicks`, `tickLabel`, `drawAxis`
- Read: `src/core/definitions/types.ts`, `src/core/definitions/shared.ts`, `src/core/definitions/index.ts`, `src/core/describe.ts`, `src/core/style.ts` — produced by `graph-library/graph-specification-and-vocabulary/TICKET-001`; definition format, shared presentation properties (`lineLabel`, point `label`/`color`), registry, describe dispatch, default style
- Read: `src/core/issues.ts` — produced by `graph-library/graph-specification-and-vocabulary/TICKET-002`; codes `outside_axis_range` and `tick_label_not_on_tick`
- Read: `src/layout/scene.ts`, `src/layout/kit/labels.ts` — produced by `graph-library/component-packaging-and-source-export/TICKET-002`
- Read: `src/layout/registry.ts`, `src/react/createGraphComponent.tsx` — produced by `graph-library/component-packaging-and-source-export/TICKET-003`; how a layout is registered and a per-type component is made

**Acceptance Criteria:**
- [ ] `examples/number-line.json` (range −10 to 10, arrowheads on both ends, points at −3 and 4 with labels) validates and renders through `<NumberLineGraph>` and through `<Graph>` with identical markup
- [ ] Ranges that are negative-only (−10 to −2), positive-only (3 to 15) and zero-spanning each render with ticks per TICKET-001's rules
- [ ] `leftArrow` and `rightArrow` (camelCase, boolean) default to `true`; each end shows a polygon arrowhead exactly when its setting is on, and a plain endpoint otherwise; no `<marker>` or `url(#…)` appears in the Scene
- [ ] Each point draws at `linearScale(value)` (within 0.5 units); two points with the same value are both drawn and their labels placed by `placeLabel` so neither hides the other
- [ ] A point outside the range is reported as `outside_axis_range` at `/points/<i>/value`, naming the range; a point exactly on an endpoint is accepted
- [ ] A point's `color` applies to that point only; its label uses the default label color
- [ ] Custom tick labels (for example `{ "value": 0, "text": "start" }`) replace the numeric label at that tick; a custom label whose value is not a tick position is reported as `tick_label_not_on_tick`
- [ ] The optional `lineLabel` is drawn once for the line as a whole
- [ ] The generated text alternative states "number line", the range and every marked point with its label; a supplied `textAlternative` replaces it in both `aria-label` and `<title>`
- [ ] A number line with no points renders the line, ticks and labels only
- [ ] `./number-line` entry exists in `package.json` exports and in `.size-limit.json`

**Output:**
- `src/core/definitions/number-line.ts` — GraphTypeDefinition for `number-line` (axis via `axisProperties`, `leftArrow`, `rightArrow`, `points[]` with `value`/`label`/`color`, `tickLabels[]`, `lineLabel`, `textAlternative`; checks for `outside_axis_range` and `tick_label_not_on_tick`; `describe`), registered in `src/core/definitions/index.ts`
- `src/layout/number-line.ts` — `layout(normalized) → Scene`, registered in `src/layout/registry.ts`
- `src/react/graphs/NumberLineGraph.tsx` — made with `createGraphComponent`
- `src/entries/number-line.ts`; `package.json` `exports["./number-line"]`; `.size-limit.json` entry
- `examples/number-line.json`; `examples/invalid/number-line-point-outside.json`; `examples/invalid/number-line-label-off-tick.json`
- `tests/core/number-line.test.ts` — proves the validation, defaults, outside-range, endpoint-inclusive and off-tick-label criteria
- `tests/layout/number-line.test.ts` — proves the range variants, arrowhead, point-position, coincident-label, color, custom-label, line-label, empty and text-alternative criteria (asserts on Scene data, no DOM)

**Constraints:**
- prd/TC-001, prd/TC-002: pure layout, `fmt()` on every number
- prd/TC-003: no ids — AD-008 removes them entirely
- prd/CC-002: text alternative for every graph (WCAG 1.1.1)

**Known Hazards:**
- AD-008 supersedes the natural SVG approach for NLC-REQ-016: draw arrowheads as small `polygon` nodes, NOT `<marker>` with `marker-end="url(#…)"`. Markers need ids, which collide across graphs on one page and differ between server and browser.
- AD-005 fixes the naming the spec leaves open: the type value is `number-line`, properties are camelCase (`leftArrow`, `rightArrow`, `tickSpacing`, `tickLabels`, `lineLabel`). Do not invent alternative spellings or accept synonyms (GSV assumes strict vocabulary).
- Spec OQ-002 (open/closed markers, shaded ranges for inequalities) and OQ-001 (fraction tick labels) are unresolved — do NOT add properties for them. Custom tick labels (NLC-REQ-019) are the supported way to show "½" on a tick.
- Spec OQ-005 says labels may overlap when many points are close; the system design (AD-010) still routes every label through `placeLabel`. Use `placeLabel` with its candidate positions; if no candidate is free, place at the first candidate rather than dropping the label — every point must be drawn.
- The text alternative is produced by the definition's `describe` (core, no React) so that the tool handler can reuse it as its summary; do not build it inside the React component.
- Product Owner decision 2026-10-06 (graph-library/graph-specification-and-vocabulary-ticket-001-code-review/CR-003): a number line accepts `title` and `lineColor` (both list `number-line` in `appliesTo`). Draw the title, color the line, and state the title in the text alternative, with tests.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-001-code-review/CR-002 and graph-library/graph-specification-and-vocabulary-ticket-001-quality-review/QR-001, QR-002 (the definition contract, RES-001):
  - Build every properties map with `defineProperties` (`src/core/definitions/types.ts`), which freezes it and removes prototypes.
  - Never list a shared top-level option (`title`, `lineColor`, axis labels…) in `properties`: `propertiesOf(type)` adds it from its `appliesTo`.
  - Nest the shared `label`/`color` (or `lineLabel`/`lineColor` for series) spec objects themselves in element specs, exactly when `elementsOf` lists the type.
  - Import text helpers from `src/core/format.ts`, never `src/core/describe.ts` (lint enforces it).
  - In `describe`, pass every caller string through `quoteText`, and state measurements with `formatMeasurement(value, provenance, unit)` so supplied values appear as written and derived values rounded.
  - Register the definition in `src/core/definitions/index.ts`, and run the applicability and consistency checks in `tests/core/definitions.test.ts` against it.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-003-code-review/CR-007: the rule "an empty label is no label" covers only the shared presentation options (it is keyed on `presentation`). State, in the definition and its tests, whether `""` on custom tick labels (NLC-REQ-019) means no label (drop it) or a blank label (keep it, for example a blank to fill in). If it means no label, add an explicit flag to `StringValue` rather than setting `presentation`.
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
- Carried from graph-library/number-lines-and-coordinate-graphs-ticket-001-code-review/CR-006 (ticks in a domain check):
  - Domain checks do not see one another's issues, so a check that lists an axis's ticks can meet an axis another check is reporting (a spacing giving more than 100 ticks, a range too narrow to draw). `niceTicks` throws on such an axis, which `createGraph` turns into a single `internal_error`.
  - In a check, get ticks with `drawableTicks(min, max, tickSpacing)` (`src/core/value-scale.ts`), which returns undefined for an axis that cannot be drawn; skip the check then. Use `niceTicks` only in layouts, on validated descriptions.
  - Register an axis's checks with `checks: [...axisDomainChecks("xAxis"), …]`: it returns two checks, one for the range and one for the spacing (code review CR-002; renamed from `axisCheck` by quality review QR-006).
- Carried from graph-library/number-lines-and-coordinate-graphs-ticket-001-code-review/CR-007 (custom tick labels):
  - Tick values are listed at 12 significant digits, so a custom label's value written in full (⅔ as 0.6666666666666666) is not equal to its tick (0.666666666667). `drawAxis` matches a label to its tick with `isTickValue(value, tick, spacing)`.
  - The `tick_label_not_on_tick` check must use the same rule, `isTickValue`, against `drawableTicks`, so a label the check accepts is always drawn and one it reports never is.

**Depends On:** TICKET-001
**Blocks:** TICKET-005

**Size:** Medium

**Notes:** Cross-area predecessors: `graph-library/component-packaging-and-source-export/TICKET-003` (layout registry and component factory) and `graph-library/graph-specification-and-vocabulary/TICKET-004` (normalization) — DEP-002. Default arrowheads on both ends come from the spec's Behaviors & Rules ("By default both ends of a number line show arrowheads").
