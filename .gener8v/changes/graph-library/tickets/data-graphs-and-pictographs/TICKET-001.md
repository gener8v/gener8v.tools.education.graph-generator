# TICKET-001: Categories and value scale foundation

**Change:** graph-library
**Capability Area:** Data Graphs & Pictographs (data-graphs-and-pictographs)
**Specification:** specifications/data-graphs-and-pictographs.md

**Summary:** Define the category and value-scale properties shared by line graphs, bar graphs and pictographs, their checks, and the layout helper that turns a scale into a value axis with labeled ticks.
**Priority:** Must
**Value:** Every data graph gets the same ordered categories, axis labels and value scale — chosen automatically or given exactly — so the three graph types read consistently.

**Requirements Covered:**
- DGP-REQ-001: Ordered list of categories, each with a plain-text name
- DGP-REQ-002: Category-axis and value-axis labels; value-unit label on pictographs
- DGP-REQ-003: Categories drawn in the order given
- DGP-REQ-005: Optional value-scale minimum, maximum and tick interval
- DGP-REQ-006: Default scale starts at zero and includes every value
- DGP-REQ-007: Report a given scale that excludes a data value
- DGP-REQ-008: Report a tick interval that is not positive or does not divide the range
- DGP-REQ-009: Label every value-axis tick with its value

**Prior Art:**
- Read: `.gener8v/specifications/data-graphs-and-pictographs.md` — DGP-REQ-001..009, the Scale and Layout behaviours (exact given scale, all-zero → 0..1, long names wrap rather than truncate) and the edge cases (no categories, duplicate names, bar scale minimum above zero)
- Read: `.gener8v/technical-design/system-design.md` — AD-003 (PropertySpec and shared definitions), AD-004 (structure vs domain stage), AD-007 (`fmt()` and the 400-unit space), AD-010 (text wrapping)
- Read: `src/core/definitions/types.ts` and `src/core/definitions/shared.ts` — produced by graph-library/graph-specification-and-vocabulary/TICKET-001; the PropertySpec shape these shared properties use
- Read: `src/core/issues.ts` — produced by graph-library/graph-specification-and-vocabulary/TICKET-002; add new codes here
- Read: `src/core/validate/structure.ts` — produced by graph-library/graph-specification-and-vocabulary/TICKET-003; how domain checks receive only structurally valid values
- Read: `src/layout/scene.ts`, `src/layout/kit/format.ts`, `src/layout/kit/scale.ts`, `src/layout/kit/text.ts` — produced by graph-library/component-packaging-and-source-export/TICKET-002

**Acceptance Criteria:**
- [ ] `categories` is a required, non-empty array of plain-text names; an empty list is reported (`missing_property` or `out_of_range` at `/categories`), and a duplicate name is reported naming both positions
- [ ] `categoryAxisLabel` and `valueAxisLabel` are accepted on line and bar graphs; `valueUnitLabel` is accepted on pictographs; each is reported as inapplicable on the other types
- [ ] `valueScale` (`minimum`, `maximum`, `tickInterval`, all optional) is accepted on line and bar graphs and reported as inapplicable on pictographs
- [ ] With no scale given, the computed scale starts at zero (or below zero only when a value is negative, for line graphs) and its maximum is at or above the largest value; all-zero data gives 0..1
- [ ] A given scale is used exactly and never extended; a given scale that excludes any data value is reported with `scale_excludes_value`, naming the value's path
- [ ] A tick interval ≤ 0 is reported as `tick_spacing_invalid`; one that does not divide (maximum − minimum) into a whole number of intervals is reported as `tick_interval_not_dividing`
- [ ] Every tick on the value axis is drawn with a text label showing its value
- [ ] Category slots are laid out in description order; long category names are wrapped with the kit's `wrap`, never truncated
- [ ] All coordinates written by `value-scale.ts` pass through `fmt()`; the module imports nothing from React

**Output:**
- `src/core/definitions/categories.ts` — shared PropertySpecs for `categories`, `categoryAxisLabel`, `valueAxisLabel`, `valueUnitLabel`, `valueScale`, plus shared checks (`checkCategories`, `checkValueScale(values, scale)`) used by TICKET-002, TICKET-003 and TICKET-005
- `src/layout/kit/value-scale.ts` — `defaultValueScale(values, { allowNegative })`, `valueTicks(scale)`, `drawValueAxis(scale, orientation, box) → SceneNode[]`, `categorySlots(categories, box, orientation)`
- `src/core/issues.ts` — adds `scale_excludes_value`, `tick_interval_not_dividing` docs if not already present (shared with graph-library/number-lines-and-coordinate-graphs/TICKET-001 for `tick_spacing_invalid`)
- `tests/core/categories.test.ts` — empty/duplicate categories, inapplicable labels, scale checks (excluded value, bad interval)
- `tests/layout/value-scale.test.ts` — default scale rules, exact given scale, all-zero case, tick labels present, category order and wrapping

**Constraints:**
- prd/TC-001, prd/TC-011: no measuring; wrap long names with estimated widths
- prd/TC-002: rounded coordinates only

**Known Hazards:**
- DGP-REQ-006 says the default scale "starts at zero", but DGP-REQ-015 extends it below zero for negative line-graph values — implement `allowNegative` (true only for line graphs) and do not apply the zero floor there
- A value-scale minimum above zero is an error on bar graphs (edge case table, bars must start at zero) but allowed on line graphs — the check belongs to the bar-graph definition (TICKET-003); this ticket provides the scale check only for "excludes a value" and interval
- `tick_spacing_invalid` may already be added by graph-library/number-lines-and-coordinate-graphs/TICKET-001 — reuse the code, do not create a second code for the same condition (RES-008)
- Carried from graph-library/graph-specification-and-vocabulary-ticket-001-code-review/CR-004: `categoryAxisLabel` and `valueAxisLabel` are already defined in `src/core/definitions/shared.ts` with `appliesTo: ["line-graph", "bar-graph"]`, and `propertiesOf` adds them to those types. Do NOT redefine them in `categories.ts`; `valueUnitLabel`, `categories` and `valueScale` stay there. The consistency check in `tests/core/definitions.test.ts` fails on a second definition.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-003-code-review/CR-002: `valueScale` must declare `ordered` on its minimum and maximum terms (for example `[["minimum", "maximum"]]`). Only declared pairs are compared, and `tests/core/definitions.test.ts` fails on `minimum`/`maximum` (or `min`/`max`) without it.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-003-code-review/CR-007: the rule "an empty label is no label" covers only the shared presentation options (it is keyed on `presentation`). State, in the definition and its tests, whether `""` on the value-unit label (DGP-REQ-002) means no label (drop it) or a blank label (keep it, for example a blank to fill in). If it means no label, add an explicit flag to `StringValue` rather than setting `presentation`.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-003-security-review/SEC-001 (Product Owner decision 2026-10-06): every `array` spec must set `maxItems` (the compiler requires it) to a curriculum-sized number. For example, at most 1,000 points or categories, or what the type's specification implies. A longer list is reported once as `too_large`. The whole description is capped at `DESCRIPTION_VALUE_LIMIT` (10,000 values, `src/core/validate/structure.ts`); keep every example well under both, and record the chosen limits in the definition's description text.

**Depends On:** None
**Blocks:** TICKET-002, TICKET-003, TICKET-005

**Size:** Medium

**Notes:** Cross-area predecessors (DEP-003): graph-library/component-packaging-and-source-export/TICKET-002 and graph-library/graph-specification-and-vocabulary/TICKET-001..003 must be delivered first. Default tick choice can reuse the 1/2/5×10ⁿ rule from `src/layout/kit/ticks.ts` (graph-library/number-lines-and-coordinate-graphs/TICKET-001) if it already exists; otherwise keep the rule local and note it for consolidation.
