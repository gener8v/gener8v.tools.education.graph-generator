# TICKET-003: Bar graph — Delivery Record

## Ticket Reference

**Ticket:** graph-library/data-graphs-and-pictographs/TICKET-003
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/data-graphs-and-pictographs.md`
**Requirements Covered:**
- DGP-REQ-004: Plain-text alternative naming type, title, labels, every category and value
- DGP-REQ-017: One bar per category, length set by value
- DGP-REQ-018: Vertical or horizontal orientation, default vertical
- DGP-REQ-019: Bar color for the whole graph and optional per-category color
- DGP-REQ-020: Option to show each bar's value as a label
- DGP-REQ-021: Report a negative bar value
- DGP-REQ-022: Zero value draws no bar but keeps position and label
- DGP-REQ-036: Bar lengths in exact proportion to values

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Predecessor DGP TICKET-001 | delivered | done; DGP TICKET-002 (line graph) and TICKET-005 (pictograph) also done, and both extended the shared kit | ✅ |
| Cross-area predecessors CPSE TICKET-003, GSV TICKET-004 | delivered | done | ✅ |
| `categories.ts`: categories with a per-category color, checks | present | `categoriesProperty({ color: sharedProperties.color })` (the shared `color` lists `bar-graph` in `elementsOf`), `categoriesCheck`, `valuesPerCategoryCheck()`, `VALUES_DESCRIPTION`, `CATEGORY_NAME_LIMIT`, `nameKey`; `valueScale` and both axis labels already scoped to `bar-graph` | ✅ |
| Scale checks without negatives | present | `checkValueScale(…, { allowNegative: false })`, `tickIntervalCheck`; no check that a given minimum is not above zero | ⚠️ Added here (a bar-graph domain check) |
| `value-scale.ts` (kit): value axis, category slots, axis labels | present | `drawValueAxis` (both orientations), `valueAxisExtent`, `valuePosition`, `categorySlots` (rotated names; per-row `slotSize`), `drawCategoryNames`, `NAME_GAP`, `axisLabelLines`, `drawValueAxisLabel`, `drawCategoryAxisLabel` | ✅ — the two axis-label helpers are placed by position (left, below), not by axis; see the plan |
| `style.ts`: default bar color | a bar color | no bar color; `defaultStyle.colors.accent` (#0072b2, ≥ 3:1 on white) and `seriesStyles` exist | ⚠️ Decision — see the plan |
| `orientation` term | — | the pictograph defines `orientation` (enum, horizontal default) with its own description; a term has one description in the vocabulary (the definitions test) | ⚠️ A shared description — see the plan |
| `registry.ts`, `createGraphComponent.tsx`, per-type entries | present | three types registered as the pattern | ✅ |
| Carried: GSV CR-002/QR-001/QR-002, TICKET-003 SEC-001 (`maxItems`), TICKET-004 CR-003/SEC-004 (domain checks), TICKET-005 CR-001/QR-001/QR-002 (rich example, `pnpm generate`) | addressed here | — | 🔁 Carried |
| Carried: GSS TICKET-002 CR-003 (provenance), SEC-001..003 (caller-sized text) | addressed here | — | 🔁 Carried |
| Carried: DGP TICKET-001 SEC-001..003; TICKET-005 QR-002 (crowded columns, deferred here), QR-004/QR-006, SEC-001/SEC-002; TICKET-002 DEL-003..005, CR-003 (`elementsHint`) | addressed here | — | 🔁 Carried — the crowded-columns decision is in the plan |

**Resolved from ground truth (not escalated):**
- **Crowded columns:** the specification's edge case answers part of the deferred question: "Very many categories (for example, 50) — the system should draw them all; legibility is the caller's choice." Every name must still be drawn; overlap past the point where a line fits a column is allowed. What remains is keeping crowded names inside the drawing (see the plan).
- **Negative values:** rejected (DGP OQ-007 is open; the specification rejects them), so `values` items take `min: 0` and a negative value is `out_of_range` at `/values/<i>` from structure.
- **A value written in full** can be up to 326 characters (`5e-324`), so value labels need a wrap width (see the plan).

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.` (branch `ticket/dgp-003`, on top of `main` at 4f633f7)
**Plan approved by:** Engineer — Thomas Eaves, 2026-10-16

Decisions taken with the plan:
- **Crowded columns** (deferred here from DGP TICKET-005 QR-002): every name is drawn, and names may touch once crowded (the specification: "legibility is the caller's choice"). The kit keeps a crowded name block inside the drawing by nudging it inward at the edges. Tests cover 50 and 100 categories for the bar graph, the line graph and the pictograph.
- **The default bar color** is `defaultStyle.colors.accent` (#0072b2).
- **Value labels** state the value exactly as supplied; a long number wraps rather than being rounded or cut, and the layout leaves room for it. A zero value draws no bar but keeps its "0" label at the baseline.

- **`src/core/definitions/bar-graph.ts`:** the `BarGraph` type, and `barGraph`, built by a `/* @__NO_SIDE_EFFECTS__ */` factory.
  - **Terms:**
    - `categories`, from `categoriesProperty({ color: sharedProperties.color })`;
    - `values`: at most `CATEGORY_LIMIT` numbers from 0 to `VALUE_LIMIT`, described by `VALUES_DESCRIPTION`;
    - `orientation`: `vertical` (default) or `horizontal`, with one description shared with the pictograph;
    - `barColor` (color) and `showValues` (boolean);
    - `valueScale`, both axis labels and `title` come through `propertiesOf`.
  - **Checks:**
    - `categoriesCheck` and `valuesPerCategoryCheck()`;
    - `tickIntervalCheck`, and the value-scale check over `values/*` with `allowNegative: false`;
    - a given `valueScale.minimum` above zero is `out_of_range` at `/valueScale/minimum`.
  - `elementsHint`: "each category, or use barColor for every bar".
  - `describe(normalized, provenance)`: the type, the title, both axis labels, and every category with its value as supplied.
- **`src/core/definitions/categories.ts`:** `ORIENTATION_DESCRIPTION`, shared by the pictograph and the bar graph (the pictograph's `orientation` description changes).
- **`src/layout/kit/value-scale.ts`:**
  - the axis-label helpers are renamed by position, to `drawLeftAxisLabel` and `drawBottomAxisLabel`, with the line graph and the tests following;
  - rotated name blocks wider than their slot are kept inside the plot's span.
- **`src/layout/bar-graph.ts`:** `barGraphLayout(normalized, provenance)`.
  - **Vertical:** the value axis is on the left; bars rise from the zero line in category slots; names and the category-axis label sit below.
  - **Horizontal:** the value axis runs along the bottom with its label below; names sit in a column on the left, each row sized to its own name (`slotSize`); bars grow right from zero; the category-axis label reads upward on the left.
  - **Bar length** is `fmt(value ÷ (max − min) × axis length)`, placed from the zero line's position.
  - **Bar color:** a category's color, else `barColor`, else the accent.
  - **`showValues`:** each value is written in full, above the bar (vertical) or to its right (horizontal), wrapped when long, with room reserved.
  - Every number goes through `fmt()`.
- **Component and wiring:** `src/react/graphs/BarGraphGraph.tsx` (`BarGraph`), `src/entries/bar-graph.ts`, `src/index.ts`, both registries, `package.json` `./bar-graph`, `tsup.config.ts`, `.size-limit.json` (25 kB), and `pnpm generate`.
- **Examples:**
  - `examples/bar-graph.json`: every optional term used, a non-integer value, a zero value, and a per-category color;
  - `examples/invalid/bar-graph-negative.json`;
  - `examples/invalid/bar-graph-scale-above-zero.json`.
- **Tests:**
  - `tests/core/bar-graph.test.ts`: terms, the negative value, the scale minimum, the length mismatch, color precedence, inapplicable options, the text alternative and the examples;
  - `tests/layout/bar-graph.test.ts`: both orientations, the zero bar, value labels (as supplied, wrapped, the zero label), proportional length, color precedence, and geometry property tests in both orientations;
  - `tests/react/Graph.test.tsx`: half a megabyte of text, plus the component name;
  - `tests/package/per-type-bundle.test.ts`: isolation;
  - crowded-columns tests (50 and 100 categories) in the kit and the three types' layout tests.

## Progress

- [x] `src/core/definitions/categories.ts`, `src/core/definitions/pictograph.ts` (shared orientation description)
- [x] `src/core/definitions/bar-graph.ts`, registered in `src/core/definitions/index.ts`
- [x] `src/layout/kit/value-scale.ts` (renamed axis-label helpers; crowded names kept inside), `src/layout/line-graph.ts`
- [x] `src/layout/bar-graph.ts`, registered in `src/layout/registry.ts`
- [x] `src/react/graphs/BarGraphGraph.tsx`, `src/entries/bar-graph.ts`, `src/index.ts`
- [x] `package.json`, `tsup.config.ts`, `.size-limit.json`
- [x] `examples/bar-graph.json`, `examples/invalid/bar-graph-negative.json`, `examples/invalid/bar-graph-scale-above-zero.json`
- [x] `src/generated/*`
- [x] `tests/core/bar-graph.test.ts`
- [x] `tests/layout/bar-graph.test.ts`
- [x] crowded-columns tests (kit, line graph, pictograph); `tests/react/Graph.test.tsx`; `tests/package/per-type-bundle.test.ts`
- [x] Added beyond the plan: `src/core/value-scale.ts` (`ScaleOptions.intervals`, DEL-004), `src/layout/line-graph.ts` (marker reach at the plot's right edge, DEL-001)

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/core/definitions/bar-graph.ts`: new.
  - Exports `BarGraph` and `barGraph` (a side-effect-free factory).
  - Terms: `categories` (with `color`), `values` (0 to 1e9), `orientation`, `barColor`, `showValues`.
  - Checks: category names, one value per category, the tick interval, the value scale (no negatives), and the scale minimum not above zero.
  - `elementsHint`, and `describe(normalized, provenance)`.
- `src/core/definitions/categories.ts`: `ORIENTATION_DESCRIPTION`. `src/core/definitions/pictograph.ts` uses it.
- `src/core/definitions/index.ts`: the bar graph registered.
- `src/core/value-scale.ts`: `ScaleOptions.intervals` (DEL-004).
- `src/layout/kit/value-scale.ts`:
  - `drawLeftAxisLabel` and `drawBottomAxisLabel`, renamed from `drawValueAxisLabel` and `drawCategoryAxisLabel` (DEL-002);
  - rotated name blocks kept inside the plot's span (DEL-001).
- `src/layout/bar-graph.ts`: new.
  - Exports `barGraphLayout`, `barColorOf`, `barLength`, `BAR_FILL` and `MAX_BAR_THICKNESS`.
  - Draws upright and horizontal bars, value labels, a zero line for a negative minimum, and both axis labels.
- `src/layout/line-graph.ts`: the plot ends `MARKER_REACH` short of the right margin (DEL-001).
- `src/layout/registry.ts`, `src/react/graphs/BarGraphGraph.tsx` (`BarGraph`), `src/entries/bar-graph.ts`, `src/index.ts`, `package.json` (`./bar-graph`), `tsup.config.ts`, `.size-limit.json` (25 kB).
- `examples/bar-graph.json`, `examples/invalid/bar-graph-negative.json`, `examples/invalid/bar-graph-scale-above-zero.json`.
- `src/generated/description.ts`, `schema.json`, `tool-schema.json`, `vocabulary.json`: regenerated.
- **Tests:**
  - new: `tests/core/bar-graph.test.ts` (16 tests) and `tests/layout/bar-graph.test.ts` (19, three of them property tests);
  - added to: `tests/layout/kit/value-scale.test.ts` (crowded block, intervals), `tests/layout/line-graph.test.ts` and `tests/layout/pictograph.test.ts` (crowded columns), `tests/react/Graph.test.tsx` (half a megabyte of text, the component name), `tests/package/per-type-bundle.test.ts` (isolation).

## Verification Run

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm generate` | 0 | the four generated files regenerated and committed |
| `pnpm lint` | 0 | — |
| `pnpm typecheck` | 0 | — |
| `pnpm test` | 0 | 41 files, 1,087 tests; three full runs, all exit 0 |
| `pnpm bench` | 0 | GSV-NFR-001 bar-graph p95 0.036 ms over 8,958 runs (limit 5 ms) |
| `pnpm build` | 0 | — |
| `pnpm check:dist` | 0 | — |
| `pnpm check:deps` | 0 | — |
| `pnpm check:images` | 0 | — |
| `pnpm size` | 0 | `./bar-graph` 18.66 kB (limit 25 kB); `./core` 17.95 kB; `./line-graph` 18.71 kB; `./pictograph` 17.88 kB; `./circle` 15.83 kB; `.` 25.1 kB (limit 120 kB) |
| `pnpm publint` | 0 | — |
| `pnpm attw` | 0 | — |
| `pnpm audit` | 0 | No known vulnerabilities found |
| `gener8v-state.py lint` | 0 | 0 errors, 0 warnings |
| Mutation checks (each against a passing baseline of 150 tests, restored from memory) | — | 16 of 16 caught; one (length ignoring a negative minimum) only after a scale-from-−5 case was added. Covered: category color, `barColor`, length proportion, the zero bar, label placement, labels as supplied, the minimum check, negatives, interval fitting, value labels and names kept inside, the line graph's marker reach, the vertical default, axis labels in the text alternative, rows sized to names, and horizontal bars from zero |
| Visual check | — | upright, horizontal and 50-category bar graphs rendered (gitignored `dist/preview`, via Quick Look) and inspected |

## Acceptance Criteria Verification

- [x] `type: "bar-graph"` with `categories` and `values` validates and renders one bar per category in order; a length difference is `series_length_mismatch` — `tests/core/bar-graph.test.ts` › "validates categories…", "reports a values list whose length differs…"; `tests/layout/bar-graph.test.ts` › "draws one bar per category, in description order…"
- [x] `orientation` `vertical` (default) and `horizontal`; horizontal bars grow from the value axis along x — `tests/core/bar-graph.test.ts` › "accepts vertical and horizontal…"; `tests/layout/bar-graph.test.ts` › "orientation" (2 tests), "makes each bar exactly…" (both orientations)
- [x] `barColor` colors every bar; a category's color overrides it — `tests/layout/bar-graph.test.ts` › "colors a bar with its category's color, else barColor, else the default"
- [x] `showValues: true` draws each value as supplied, beside the bar — `tests/layout/bar-graph.test.ts` › "value labels" (2 tests)
- [x] A negative value is `out_of_range` at `/values/<i>` — `tests/core/bar-graph.test.ts` › "reports a negative value…", the invalid example
- [x] A `valueScale.minimum` above zero is reported — `tests/core/bar-graph.test.ts` › "reports a given scale minimum above zero…", the invalid example
- [x] A zero value draws no bar; its slot and name remain — `tests/layout/bar-graph.test.ts` › "a zero value" (2 tests)
- [x] Non-integer values are accepted and drawn proportionally — `tests/core/bar-graph.test.ts` › "accepts non-integer values"; `tests/layout/bar-graph.test.ts` › "draws non-integer values proportionally"
- [x] Each bar's length equals value ÷ (max − min) × axis length, within `fmt()` — `tests/layout/bar-graph.test.ts` › "makes each bar exactly…", "starts bars at the zero line…", and the property test "puts each bar's end level with its value on the drawn axis" (the tolerance target is proved in TICKET-006)
- [x] The text alternative names type, title, axis labels and every category with its value — `tests/core/bar-graph.test.ts` › "the text alternative" (3 tests)
- [x] `src/entries/bar-graph.ts` exports `BarGraph`; `./bar-graph` export; size-limit entry; the example and two invalid examples — `pnpm build`, `size` (18.66 kB), `publint`, `attw`; `tests/package/per-type-bundle.test.ts`; `tests/core/bar-graph.test.ts` reads all three; the schema-agreement test mutates the example

## Decisions Made

### DEL-001: Crowded columns — every name drawn, kept inside the drawing

**Context:** Deferred here from DGP TICKET-005 QR-002 (and TICKET-002 DEL-004). Past about 17 to 25 upright categories, one rotated name line is wider than its column. The specification says: "draw them all; legibility is the caller's choice".
**Decision:** Approved with the plan.
- Every name is drawn, and names may touch.
- `drawCategoryNames` moves a rotated block that is wider than its slot inward at the ends, so it stays in the plot's span.
- The bar graph keeps value labels inside the same way.
- The line graph's plot ends `MARKER_REACH` short of the margin, since crowded columns are narrower than a marker.
- Tests at 50 and 100 categories for all three types check that every name is drawn and that everything stays inside the drawing.

**Ticket Impact:** The crowded-columns hazard on this ticket is settled. Property tests still cover only uncrowded layouts for overlap.

### DEL-002: Axis-label helpers named by position

**Context:** Horizontal bars put the value-axis label below and the category-axis label on the left, the reverse of a vertical plot.
**Decision:** `drawValueAxisLabel` and `drawCategoryAxisLabel` (from DGP TICKET-002) are renamed `drawLeftAxisLabel` and `drawBottomAxisLabel`. The line graph, its tests and the coverage row follow.
**Ticket Impact:** None beyond the rename.

### DEL-003: The default bar color is the accent

**Decision:** Approved with the plan. A bar without its own color or `barColor` is `defaultStyle.colors.accent` (#0072b2), which already meets 3:1 on white (prd/CC-002, GSV-NFR-004). The style is unchanged.

### DEL-004: A short value axis asks for fewer chosen intervals

**Context:** Horizontal bars' value axis runs along the narrowed plot, where ten chosen intervals crowded their labels: "1000" to "8000" overlapped, as the property test found. DGP-REQ-009 requires every tick to be labeled, so labels cannot be thinned.
**Decision:**
- `ScaleOptions.intervals` (`src/core/value-scale.ts`, default 10) caps how many intervals a chosen interval divides the span into.
- The horizontal layout lowers it until every pair of neighbouring tick labels fits.
- A given `tickInterval` is used as given, so crowding is then the caller's choice.

**Rationale:** Only drawing uses it. The validator's checks resolve the scale without it, and a chosen part never excludes a value, so no validation result changes.
**Ticket Impact:** None. The upright plot (240 units for at most ten intervals) and the line graph do not need it.

### DEL-005: Value labels written in full, wrapped; a zero bar is labeled

**Decision:** Approved with the plan.
- A label states the value exactly as supplied (`displayValue`), wrapped to the slot's width for upright bars (at least 24), or to 72 for horizontal bars. A 326-character `5e-324` therefore wraps; it is never rounded or cut.
- The layout reserves the room: headroom above upright bars, and a right margin and taller rows for horizontal ones.
- A zero bar still shows "0" at the zero line.

## Deviations from Plan

- **`src/core/value-scale.ts`** gained `ScaleOptions.intervals` (DEL-004), and **`src/layout/line-graph.ts`** its right-edge marker reach (DEL-001). Both were found by the tests during delivery.
- **Too-fine scales:** the planned "scale too fine near ±1e9" test became a test that such a scale cannot be given to a bar graph, since its minimum must be at most zero.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| DGP-REQ-004 | `src/core/definitions/bar-graph.ts`:barGraph, describe | `@spec DGP-REQ-004, …` / `@spec DGP-REQ-004` |
| DGP-REQ-017 | `src/core/definitions/bar-graph.ts`:barGraph; `src/layout/bar-graph.ts`:barLength, drawVertical, drawHorizontal, barGraphLayout; `src/react/graphs/BarGraphGraph.tsx`:BarGraph | `@spec DGP-REQ-017, …` |
| DGP-REQ-018 | `src/core/definitions/bar-graph.ts`:barGraph, orientation; `src/layout/bar-graph.ts`:drawVertical, drawHorizontal, barGraphLayout | `@spec …, DGP-REQ-018, …` |
| DGP-REQ-019 | `src/core/definitions/bar-graph.ts`:barGraph, barColor; `src/layout/bar-graph.ts`:barColorOf, barGraphLayout | `@spec DGP-REQ-019` / `@spec …, DGP-REQ-019, …` |
| DGP-REQ-020 | `src/core/definitions/bar-graph.ts`:barGraph, showValues; `src/layout/bar-graph.ts`:valueLabelLines, drawVertical, drawHorizontal, barGraphLayout | `@spec DGP-REQ-020` / `@spec …, DGP-REQ-020, …` |
| DGP-REQ-021 | `src/core/definitions/bar-graph.ts`:barGraph, valueScaleCheck | `@spec …, DGP-REQ-021` / `@spec DGP-REQ-021` |
| DGP-REQ-022 | `src/layout/bar-graph.ts`:drawVertical, drawHorizontal, barGraphLayout | `@spec …, DGP-REQ-022` |
| DGP-REQ-036 | `src/layout/bar-graph.ts`:barLength, barGraphLayout; `src/core/definitions/bar-graph.ts`:scaleStartsAtZeroCheck | `@spec DGP-REQ-017, DGP-REQ-036` / `@spec DGP-REQ-036` |
| CPSE-REQ-004, CPSE-REQ-007 | `src/entries/bar-graph.ts`; `src/react/graphs/BarGraphGraph.tsx`:BarGraph | `@spec CPSE-REQ-004` / `@spec DGP-REQ-017, CPSE-REQ-007` |

Coverage rows were added to `.gener8v/specifications/data-graphs-and-pictographs.md` (DGP-REQ-004 extended, and DGP-REQ-017 to 022 and 036) and to `.gener8v/specifications/component-packaging-and-source-export.md` (CPSE-REQ-004 and 007).

## Notes

- **Product Owner decisions pending:**
  - **Negative bar values (DGP OQ-007):** rejected, as the specification says.
  - **Grouped and stacked bars (OQ-005):** out of scope.
  - **Already open:** the provisional limits (6 series, 400 pictures, 200-character names), the caller-text length decision, and the image set.
- **Bounded text:** the title takes at most 3 lines, each axis label 2, and names are limited to 200 characters. A value label is at most 327 characters, wrapped.
- **For DGP TICKET-006:** `barLength` and `barColorOf` are exported for the accuracy suite.
- **Tooling:** the PreToolUse hook again warned "no delivery is In Progress" while this record was In Progress (the known first-4,000-characters limitation).

## Post-Review Amendments

### Code review — `graph-library/data-graphs-and-pictographs-ticket-003-code-review` (2026-10-19, Approved)

- **CR-001:** DEL-005 amended. Value labels still never cut a digit, but wrap wider:
  - a horizontal bar's label wraps to the free width right of its own bar (at least 72 units);
  - in crowded upright columns, narrower than a line of text, a label wraps to 72 units, and labels may touch as names do (DEL-001).
  - **Measured at the limits**, for the Security Review and the Product Owner's caller-text decision (100 categories, 200-character names, every value 5e-324, `showValues`):
    - upright: 3,802 text nodes and 861,141 characters of markup, down from 11,002 and 2,188,061;
    - across: 2,502 text nodes, 617,007 characters, and a drawing 22,048 units tall, down from 5,202 nodes and 53,728 units.
  - `tests/react/Graph.test.tsx` pins both. This corrects the Notes' "Bounded text": each label is bounded, but at 100 categories their total is as above.
- **CR-002:** `@spec DGP-REQ-021` moved to the `values` term. The coverage rows for DGP-REQ-020 and 021 are corrected.
- **CR-003:** a test states values with all their digits, so a dropped provenance fails it.
- **CR-004:** the crowded-columns tests of all three types also check the drawing's height, and the upright bar property test goes up to 30 categories.
- **CR-005:** `ORIENTATION_DESCRIPTION` names both defaults (horizontal for a pictograph, vertical for a bar graph). Regenerated.
- **Re-verification:** `pnpm generate`, `lint`, `typecheck`, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size` (`./bar-graph` 18.71 kB), `publint`, `attw`, `audit` and `gener8v-state lint` exit 0. `pnpm test` (1,089 tests) exits 0 on three runs. Four deliberate breaks of the fixes each fail a test.
