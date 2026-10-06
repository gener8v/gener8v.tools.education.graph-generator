# TICKET-002: Line graph

**Change:** graph-library
**Capability Area:** Data Graphs & Pictographs (data-graphs-and-pictographs)
**Specification:** specifications/data-graphs-and-pictographs.md

**Summary:** Add the `line-graph` type end to end: definition with series, layout of points and segments with a legend, distinct default colors plus non-color cues per series, text alternative, component, entry point and example.
**Priority:** Must
**Value:** A curriculum developer can show one or several data series over categories, readable in color, in greyscale and by students who cannot tell colors apart.

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

**Prior Art:**
- Read: TICKET-001 output at `src/core/definitions/categories.ts` and `src/layout/kit/value-scale.ts` — shared categories, scale checks and value axis
- Read: `src/core/style.ts` — produced by graph-library/graph-specification-and-vocabulary/TICKET-001; default palette, series point-marker shapes and dash patterns (AD-011)
- Read: `src/layout/registry.ts`, `src/react/createGraphComponent.tsx` — produced by graph-library/component-packaging-and-source-export/TICKET-003; how a type registers its layout and gets its component
- Read: `src/layout/kit/labels.ts` — produced by graph-library/component-packaging-and-source-export/TICKET-002; legend and label placement
- Read: `.gener8v/specifications/data-graphs-and-pictographs.md` — DGP-REQ-010..016, edge cases (no series, empty series, single category)
- Read: `.gener8v/constraints/prd.md` — CC-002 (WCAG 1.4.1: color must not be the only cue between series)

**Acceptance Criteria:**
- [ ] `type: "line-graph"` with `categories` and `series` (each `{ values, lineLabel?, lineColor? }`) validates and renders; no series is reported as `missing_property`/`out_of_range` at `/series`
- [ ] A series whose `values` length differs from the number of categories (including an empty list) is reported with `series_length_mismatch` at `/series/<i>/values`
- [ ] Each value is drawn as a point at its category slot and value position; consecutive points of a series are joined by straight segments; a single-category series draws one point with no segment
- [ ] With more than one series, a legend lists every series label (or "Series N" when unlabeled) with its color, marker and dash sample; with one series no legend is drawn
- [ ] Series without `lineColor` get distinct default colors in order, and each series also gets a distinct point-marker shape and dash pattern, so series differ without color (prd/CC-002)
- [ ] Negative values are accepted and the default scale extends below zero to include them
- [ ] The text alternative names the graph type, title, axis labels, and every series with every category and its value
- [ ] DGP-NFR-004: the first six default series colors differ pairwise by at least 15% relative luminance, verified by `tests/core/series-palette.test.ts` in CI
- [ ] `src/entries/line-graph.ts` exports `LineGraph`; package.json `exports` has `./line-graph`; `.size-limit.json` has a line-graph entry; `examples/line-graph.json` and at least two `examples/invalid/line-graph-*.json` exist and are used by tests

**Output:**
- `src/core/definitions/line-graph.ts` — GraphTypeDefinition (properties, checks, describe), registered in `src/core/definitions/index.ts`
- `src/layout/line-graph.ts` — `layout(normalized) → Scene`, registered in `src/layout/registry.ts`
- `src/react/graphs/LineGraphGraph.tsx` — component made with `createGraphComponent` (exported as `LineGraph`)
- `src/entries/line-graph.ts`, package.json `exports["./line-graph"]`, `.size-limit.json` entry
- `examples/line-graph.json`, `examples/invalid/line-graph-length-mismatch.json`, `examples/invalid/line-graph-no-series.json`
- `tests/core/line-graph.test.ts` — validation criteria (length mismatch, no series, negative values accepted, text alternative content)
- `tests/layout/line-graph.test.ts` — points/segments, legend rules, default colors/markers/dashes, single-category case
- `tests/core/series-palette.test.ts` — DGP-NFR-004 luminance check

**Constraints:**
- prd/CC-002: non-color cue between series required (markers and dashes)
- prd/TC-002: rounded coordinates; prd/TC-001: legend layout from estimated text widths

**Known Hazards:**
- GSV-REQ-040 defines line color and line label as graph-level shared options, but on a line graph they apply **per series** (spec Shared Mechanics) — put `lineColor`/`lineLabel` on each series object, and report them at the graph level as inapplicable
- DGP-NFR-004 checks greyscale distinction only; prd/CC-002 goes further — markers and dash patterns are required even if the luminance check passes (AD-011)
- No `<marker>` elements or ids for point markers — draw each marker as its own shape (AD-008)
- Carried from graph-library/graph-specification-and-vocabulary-ticket-001-code-review/CR-005: the default series palette was retuned in GSV TICKET-001 to meet both 3:1 contrast and DGP-NFR-004, read as a 15% *relative* luminance difference (|La − Lb| / max(La, Lb)). That reading is the only one compatible with GSV-NFR-004, because an absolute 0.15 cannot hold for six colors that are each 3:1 on white. `tests/core/style.test.ts` already checks it. Point `tests/core/series-palette.test.ts` at that check, or extend it, but do not change the palette without re-running both checks.
- Series elements nest the shared `lineColor` and `lineLabel` spec objects (`elementsOf: ["line-graph"]`).
- Carried from graph-library/graph-specification-and-vocabulary-ticket-001-code-review/CR-002 and graph-library/graph-specification-and-vocabulary-ticket-001-quality-review/QR-001, QR-002 (the definition contract, RES-001):
  - Build every properties map with `defineProperties` (`src/core/definitions/types.ts`), which freezes it and removes prototypes.
  - Never list a shared top-level option (`title`, `lineColor`, axis labels…) in `properties`: `propertiesOf(type)` adds it from its `appliesTo`.
  - Nest the shared `label`/`color` (or `lineLabel`/`lineColor` for series) spec objects themselves in element specs, exactly when `elementsOf` lists the type.
  - Import text helpers from `src/core/format.ts`, never `src/core/describe.ts` (lint enforces it).
  - In `describe`, pass every caller string through `quoteText`, and state measurements with `formatMeasurement(value, provenance, unit)` so supplied values appear as written and derived values rounded.
  - Register the definition in `src/core/definitions/index.ts`, and run the applicability and consistency checks in `tests/core/definitions.test.ts` against it.

**Depends On:** TICKET-001
**Blocks:** TICKET-006

**Size:** Medium

**Notes:** Cross-area predecessors: graph-library/component-packaging-and-source-export/TICKET-003 (registry and component factory) and graph-library/graph-specification-and-vocabulary/TICKET-004 (normalization). Component file name follows the shared `<Pascal>Graph.tsx` convention; export the component as `LineGraph` to avoid `LineGraphGraph` in the public API.
