# TICKET-003: Deliver the x,y coordinate graph type

**Change:** graph-library
**Capability Area:** Number Lines & Coordinate Graphs (number-lines-and-coordinate-graphs)
**Specification:** specifications/number-lines-and-coordinate-graphs.md

**Summary:** Add the `xy-graph` type end to end: definition with two axes, points, line segments and grid; layout that shows one, two or four quadrants, places axes through the origin or along the nearest edge, keeps equal units, and draws points and segments; React component, entry point and example.
**Priority:** Must
**Value:** A curriculum developer can produce a correct coordinate plane in any combination of quadrants, with labeled points and segments, from one JSON description.

**Requirements Covered:**
- NLC-REQ-001: x,y graph parameters defined in the single definition (xy part)
- NLC-REQ-010: Report each point or segment endpoint outside its axis range (xy part)
- NLC-REQ-012: Text alternative stating type, axis ranges and every marked point (xy part)
- NLC-REQ-022: Render from an x-axis range and a y-axis range
- NLC-REQ-023: Show one, two or four quadrants as determined by the ranges
- NLC-REQ-024: Draw each axis through the origin when the other axis's range includes zero
- NLC-REQ-025: Draw an axis along the nearest edge when the other axis's range excludes zero
- NLC-REQ-026: Option to show or hide grid lines at the tick positions
- NLC-REQ-027: Separate tick spacing for the x-axis and the y-axis
- NLC-REQ-028: Plot each supplied point at its (x, y) coordinates
- NLC-REQ-029: Draw each supplied line segment between its two endpoints
- NLC-REQ-030: Optional label and color for each line segment
- NLC-REQ-031: Axis labels for the x-axis and the y-axis per GSV-REQ-040
- NLC-REQ-032: One x unit and one y unit drawn at equal lengths by default
- NLC-REQ-033: Report a segment whose two endpoints are the same point

**Prior Art:**
- Read: `.gener8v/specifications/number-lines-and-coordinate-graphs.md` — x,y Coordinate Graphs requirements; Behaviors & Rules → Points and Segments; Edge Cases rows on empty graphs, both ranges excluding zero, unequal units; Data Requirements for an x,y graph; OQ-004, OQ-006, OQ-008
- Read: `.gener8v/technical-design/system-design.md` — AD-002, AD-005, AD-007 (400-unit width, height from aspect ratio), AD-010, AD-011
- Read: TICKET-001 output at `src/core/definitions/axis.ts`, `src/layout/kit/ticks.ts`, `src/layout/kit/axis.ts`
- Read: TICKET-002 output at `src/core/definitions/number-line.ts`, `src/layout/number-line.ts` — the established pattern for point properties, `outside_axis_range` checks and point labels; reuse rather than re-implement
- Read: `src/core/definitions/shared.ts`, `src/core/style.ts` — produced by `graph-library/graph-specification-and-vocabulary/TICKET-001`; axis labels, title, default grid and line styles
- Read: `src/core/issues.ts` — produced by `graph-library/graph-specification-and-vocabulary/TICKET-002`; codes `outside_axis_range`, `degenerate_segment`
- Read: `src/layout/kit/scale.ts`, `src/layout/kit/labels.ts` — produced by `graph-library/component-packaging-and-source-export/TICKET-002`
- Read: `src/layout/registry.ts`, `src/react/createGraphComponent.tsx` — produced by `graph-library/component-packaging-and-source-export/TICKET-003`

**Acceptance Criteria:**
- [ ] `examples/xy-graph.json` (x −5..5, y −5..5, grid on, two labeled points, one colored segment, axis labels) validates and renders identically through `<XyGraph>` and `<Graph>`
- [ ] Ranges x 0..10 / y 0..10 show one quadrant; x −10..10 / y 0..10 show two; x −10..10 / y −10..10 show four
- [ ] When the y range includes zero the x-axis is drawn at y = 0; when it excludes zero the x-axis is drawn along the nearest edge (bottom for positive-only, top for negative-only); likewise for the y-axis; ticks on an edge axis are labeled with their true values
- [ ] `xAxis.tickSpacing` and `yAxis.tickSpacing` are independent; each axis gets TICKET-001's default when omitted
- [ ] `grid: true` draws grid lines at every tick position of both axes and none elsewhere; `grid: false` (default stated in the definition) draws none
- [ ] Points plot at `(xScale(x), yScale(y))` and segments join their endpoints, each within 0.5 units of the computed position
- [ ] Each point and segment accepts an optional `label` and `color`; color applies to that element only
- [ ] A point or segment endpoint outside either range is reported as `outside_axis_range` at its JSON Pointer path (for example `/segments/0/to/y`)
- [ ] A segment whose endpoints are equal is reported as `degenerate_segment`
- [ ] By default one x unit and one y unit have equal drawn length: for x −10..10 and y −2..2 the drawing is wider than tall, with height derived from the ranges (no non-uniform scaling)
- [ ] The generated text alternative states "coordinate graph", both ranges and every point and segment with labels
- [ ] An x,y graph with no points or segments renders empty axes (and grid when on)
- [ ] `./xy-graph` entry exists in `package.json` exports and `.size-limit.json`

**Output:**
- `src/core/definitions/xy-graph.ts` — GraphTypeDefinition for `xy-graph` (`xAxis`, `yAxis` via `axisProperties`, `grid`, `points[]` `{x, y, label?, color?}`, `segments[]` `{from: {x, y}, to: {x, y}, label?, color?}`, `xAxisLabel`, `yAxisLabel`, `title`, `textAlternative`; checks; `describe`), registered in `src/core/definitions/index.ts`
- `src/layout/xy-graph.ts` — `layout(normalized) → Scene`, registered in `src/layout/registry.ts`; exports `planeAxes(xRange, yRange)` (quadrant, axis-position and equal-unit logic) for reuse
- `src/react/graphs/XyGraph.tsx`; `src/entries/xy-graph.ts`; `package.json` `exports["./xy-graph"]`; `.size-limit.json` entry
- `examples/xy-graph.json`; `examples/invalid/xy-graph-outside-range.json`; `examples/invalid/xy-graph-degenerate-segment.json`
- `tests/core/xy-graph.test.ts` — proves validation, independent spacing, `outside_axis_range` and `degenerate_segment` criteria
- `tests/layout/xy-graph.test.ts` — proves quadrant, axis-position, grid, point/segment position, color, equal-unit, empty and text-alternative criteria on Scene data

**Constraints:**
- prd/TC-001: equal units come from computing the drawing height from the ranges, never from measuring the container
- prd/TC-002: `fmt()` on every coordinate
- prd/TC-011: axis labels wrap through the text kit

**Known Hazards:**
- Spec cross-document conflict: the Edge Cases table and Data Requirements mention an "equal-unit setting" a description could turn off, but no requirement defines it and OQ-004 is unresolved. Implement NLC-REQ-032's default (equal units) only; do NOT add an `equalUnits` property. Record the gap in the delivery record's Decisions so the Product Owner can resolve OQ-004.
- Equal units can produce extreme aspect ratios (x 0..1000, y 0..1 gives a 1000:1 drawing). Cap is not specified: keep equal units, set width 400 and compute height, but clamp the height to a documented minimum so labels remain legible, and record the clamp as a Decision. Do NOT silently switch to unequal units.
- OQ-006 (full lines through two points or slope–intercept) and OQ-008 (axis-break symbol) are unresolved — segments only, no break symbol.
- An edge axis (range excluding zero) must not imply the origin: label its ticks with true values and do not draw a "0" at the corner.
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

**Depends On:** TICKET-001
**Blocks:** TICKET-005

**Size:** Large

**Notes:** Large because quadrant logic, axis positioning, equal units, grid, points and segments all land together; splitting would leave an x,y graph that cannot be demonstrated. TICKET-002 should be delivered first if possible so its point patterns are reused, but this ticket does not depend on it. Cross-area predecessors: `graph-library/component-packaging-and-source-export/TICKET-003`, `graph-library/graph-specification-and-vocabulary/TICKET-004` (DEP-002).
