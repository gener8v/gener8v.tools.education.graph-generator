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

**Depends On:** TICKET-001
**Blocks:** TICKET-006

**Size:** Medium

**Notes:** Cross-area predecessors: graph-library/component-packaging-and-source-export/TICKET-003 and graph-library/graph-specification-and-vocabulary/TICKET-004. Grouped and stacked bars are out of scope (DGP OQ-005).
