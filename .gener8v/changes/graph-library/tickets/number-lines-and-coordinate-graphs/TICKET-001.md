# TICKET-001: Build the axis and tick foundation shared by all three axis-based graph types

**Change:** graph-library
**Capability Area:** Number Lines & Coordinate Graphs (number-lines-and-coordinate-graphs)
**Specification:** specifications/number-lines-and-coordinate-graphs.md

**Summary:** Define the shared axis properties (range, tick spacing, tick-label visibility) and their validation checks, and build the layout helpers that compute tick positions and draw an axis with its ticks and labels. Number lines, x,y graphs and x,y,z graphs all build on this.
**Priority:** Must
**Value:** Every axis in every graph gets correctly spaced, correctly labeled ticks from a range alone, and a bad tick spacing is reported in plain English instead of producing a broken figure.

**Requirements Covered:**
- NLC-REQ-002: Every axis requires a range given as a minimum and a maximum
- NLC-REQ-003: Axis minimum and maximum accept negative, zero, positive and decimal values
- NLC-REQ-004: Optional tick spacing; ticks at every whole multiple of the spacing inside the range
- NLC-REQ-005: Documented default tick spacing when none is supplied
- NLC-REQ-006: Option to show or hide tick labels per axis, shown by default
- NLC-REQ-007: Ticks, points and segments drawn at positions proportional to their values (axis-scale part; points and segments completed by TICKET-002..004)
- NLC-REQ-008: Report a tick spacing that would produce more than 100 ticks on one axis
- NLC-REQ-009: Report a tick spacing that is zero or negative

**Prior Art:**
- Read: `.gener8v/specifications/number-lines-and-coordinate-graphs.md` — NLC-REQ-002..009 and Behaviors & Rules → Ticks (multiples anchored at zero, default 1/2/5×10ⁿ for 5–20 ticks, zero always ticked, label decimals from spacing); Edge Cases rows on narrow ranges, non-dividing spacing and >100 ticks
- Read: `.gener8v/technical-design/system-design.md` — AD-003 (PropertySpec / GraphTypeDefinition format), AD-004 (axis checks run in the domain stage, only on properties that passed structure), AD-005 (camelCase names, JSON Pointer paths), AD-007 (`fmt()` on every emitted number, 400-unit drawing space), AD-010 (labels through the text kit)
- Read: `.gener8v/dependencies/dependency-map.md` — DEP-002 (NLC hard-depends on GSV core), RES-002 (shared geometry and formatting), RES-005 (label layout), RES-008 (issue codes)
- Read: `src/core/definitions/types.ts`, `src/core/definitions/shared.ts` — produced by `graph-library/graph-specification-and-vocabulary/TICKET-001`; the PropertySpec shape the axis properties are written in
- Read: `src/core/issues.ts` — produced by `graph-library/graph-specification-and-vocabulary/TICKET-002`; use the existing codes `too_many_ticks`, `tick_spacing_invalid` and `out_of_range`
- Read: `src/core/validate/index.ts`, `src/core/validate/domain.ts` — produced by `graph-library/graph-specification-and-vocabulary/TICKET-003` and `TICKET-004`; how a definition's `checks` are invoked
- Read: `src/layout/scene.ts`, `src/layout/kit/format.ts`, `src/layout/kit/scale.ts`, `src/layout/kit/text.ts`, `src/layout/kit/labels.ts` — produced by `graph-library/component-packaging-and-source-export/TICKET-002`; Scene node shapes, `fmt()`, `linearScale`, `textWidth`/`wrap`, `placeLabel`

**Acceptance Criteria:**
- [ ] An axis property group (`min`, `max`, `tickSpacing?`, `showTickLabels?` default `true`) is defined once in `src/core/definitions/axis.ts` in the PropertySpec format and can be reused by any graph type definition
- [ ] A missing `min` or `max` is reported as `missing_property` at the axis's JSON Pointer path (for example `/xAxis/max`)
- [ ] Negative, zero, positive and decimal minimums and maximums are accepted (for example −10 to −2, 0 to 0.001, −3.5 to 7.25)
- [ ] `tickSpacing` ≤ 0 is reported as `tick_spacing_invalid` naming the axis
- [ ] A `tickSpacing` that would place more than 100 ticks in the range is reported as `too_many_ticks`; the issue states the 100-tick limit and suggests a spacing that fits
- [ ] `niceTicks(min, max, spacing)` returns exactly the whole multiples of `spacing` inside `[min, max]` (inclusive), anchored at zero, with zero included whenever it lies in the range; a range endpoint that is not a multiple gets no tick
- [ ] Tick values are computed as `k × spacing` for integer `k` (never by repeated addition), so 0.1-spaced ticks produce 0.3 rather than 0.30000000000000004
- [ ] `niceTicks(min, max)` without spacing chooses a spacing of 1, 2 or 5 × 10ⁿ giving between 5 and 20 ticks, for ranges from 0.001 wide to 10⁶ wide; the rule is documented in a doc comment and in the definition's description text
- [ ] Tick labels show no more decimal places than the spacing needs (spacing 0.25 → "0.75", spacing 2 → "4")
- [ ] `drawAxis` in `src/layout/kit/axis.ts` returns Scene nodes for the axis line, ticks and (when shown) tick labels, with every coordinate passed through `fmt()` and each tick within 0.5 units of `linearScale(value)`
- [ ] Hidden tick labels (`showTickLabels: false`) produce no text nodes; ticks still draw
- [ ] No module in this ticket imports `react` or `react-dom` (boundary lint passes)

**Output:**
- `src/core/definitions/axis.ts` — exports `axisProperties` (PropertySpec group for one axis) and `axisChecks(path, axis)` returning Issue[] for `tick_spacing_invalid` and `too_many_ticks`; consumed by TICKET-002, TICKET-003, TICKET-004
- `src/layout/kit/ticks.ts` — exports `niceTicks(min: number, max: number, spacing?: number) → { spacing: number; ticks: number[] }` and `tickLabel(value: number, spacing: number) → string`
- `src/layout/kit/axis.ts` — exports `drawAxis(options: { from: [number, number]; to: [number, number]; scale; ticks: number[]; labels?: Map<number, string>; showTickLabels: boolean; side: 'below' | 'left' | …}) → SceneNode[]`; consumed by every NLC layout
- `tests/core/axis.test.ts` — proves the missing-range, accepted-values, `tick_spacing_invalid` and `too_many_ticks` criteria
- `tests/layout/ticks.test.ts` — proves the multiples, zero-anchoring, float-accuracy, default-spacing (5–20 ticks across magnitudes) and label-decimals criteria
- `tests/layout/axis.test.ts` — proves the tick-position (≤ 0.5 units), `fmt()` and hidden-label criteria

**Constraints:**
- prd/TC-001: no measuring during layout — tick-label widths come from `textWidth` estimates
- prd/TC-002: every coordinate passes through `fmt()`
- prd/TC-005: these modules must not load React or browser globals (they are used by validation and export)

**Known Hazards:**
- The issue codes `too_many_ticks` and `tick_spacing_invalid` are already in the initial set in `src/core/issues.ts` (system design Data Model → IssueCode set). Use them; do NOT add new codes with different names, because codes are a stable public contract (GSV-REQ-034, RES-008).
- Floating-point accumulation: building ticks by repeated `+= spacing` drifts (0.1 + 0.2 ≠ 0.3) and can drop the last tick or mislabel ticks. Compute `k × spacing` from integer `k = ceil(min/spacing) .. floor(max/spacing)` with a small epsilon on the bounds, then format labels from the spacing's decimal count. Do not round tick *values* in the core — rounding to 2 decimals happens only for emitted coordinates via `fmt()`.
- `min ≥ max` is reported by the GSV structure stage (GSV-REQ-022, `out_of_range`), not here. Do not report it a second time from `axisChecks`; skip tick checks when the range itself is invalid (AD-004: no cascading issues).
- A 100-tick limit check must not compute the tick array first for absurd spacings (spacing 1e-12 on 0..1 would allocate 10¹² entries). Compute the count arithmetically before generating ticks.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-003-code-review/CR-002: the axis group must declare `ordered: [["min", "max"]]` on its object spec. The GSV structure stage compares only declared pairs and reports a reversed or equal pair as `out_of_range` at `/…/max`. `tests/core/definitions.test.ts` fails on an object with `min` and `max` and no matching `ordered`. See `tests/fixtures/definitions/axis.ts`.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-003-security-review/SEC-001 (Product Owner decision 2026-10-06): every `array` spec must set `maxItems` (the compiler requires it) to a curriculum-sized number. For example, at most 1,000 points or categories, or what the type's specification implies. A longer list is reported once as `too_large`. The whole description is capped at `DESCRIPTION_VALUE_LIMIT` (10,000 values, `src/core/validate/structure.ts`); keep every example well under both, and record the chosen limits in the definition's description text.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-004-code-review/CR-003 and graph-library/graph-specification-and-vocabulary-ticket-004-security-review/SEC-004: domain checks (`DomainCheck`, `src/core/definitions/types.ts`):
  - `inputs` are the paths the check reads, as JSON Pointers without the leading slash, with `*` for any list position (`["xAxis/min", "xAxis/max", "points/*/x"]`). The check is skipped only when an earlier failure touches one of them; `tests/core/definitions.test.ts` checks that every path exists.
  - The description a check receives is frozen; never change it.
  - Build every issue with `createIssue`. A hand-built issue, or one with a message over 2,000 characters, is treated as a package defect.
  - A check's work must grow with the description's size, never with a value's magnitude. For example, count ticks arithmetically (`floor(range / spacing)`) and compare with the limit before enumerating anything.
- Carried from graph-library/data-graphs-and-pictographs-ticket-001-quality-review/QR-005: the data graphs' value-scale arithmetic now lives in `src/core/value-scale.ts`, a core module. It holds `niceInterval` (1, 2 or 5 × 10ⁿ), `intervalsIn` (the noise-tolerant interval count both the checks and the tick list use), `cleanDecimal`, `valueTicks`, and `MAX_VALUE_TICKS` (100, the same limit as this ticket's).
  - Validation needs the tick rule too, and core cannot import the layout kit. So put the number line's tick arithmetic (the default spacing, the tick count, multiples anchored at zero) in core, and share or extend `src/core/value-scale.ts`, rather than building a second rule in `src/layout/kit/ticks.ts`.
  - Keep only drawing helpers in the kit, and reuse `tickLabel` from `src/layout/kit/value-scale.ts` (which prints with `formatSupplied`) unless NLC's label-decimals rule differs. If it does, record why.
  - NLC aims at 5–20 ticks; the data graphs aim at no more than 10 intervals. Give both rules one home, parameterised.

**Depends On:** None
**Blocks:** TICKET-002, TICKET-003, TICKET-004

**Size:** Medium

**Notes:** Cross-area predecessors (not expressible in Depends On): `graph-library/component-packaging-and-source-export/TICKET-002` (Scene model and layout kit), `graph-library/graph-specification-and-vocabulary/TICKET-001`, `TICKET-002` and `TICKET-003` (definition format, issue codes, validator) — DEP-002. The default-spacing rule and the "zero always ticked" rule are documented behavior; pin them with tests so a later change is visible.
