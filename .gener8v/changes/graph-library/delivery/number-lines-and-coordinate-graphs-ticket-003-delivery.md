# TICKET-003: Deliver the x,y coordinate graph type — Delivery Record

## Ticket Reference

**Ticket:** graph-library/number-lines-and-coordinate-graphs/TICKET-003
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/number-lines-and-coordinate-graphs.md`
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

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Predecessors TICKET-001 and TICKET-006 delivered | delivered, reviewed | both records present; all reviews Approved | ✅ |
| NLC TICKET-002 (number line) delivered, so its point pattern can be reused | optional | delivered: `src/core/definitions/number-line.ts`, `src/layout/number-line.ts` | ✅ the number-line pattern is used, not the ruler fallback |
| `xy-graph` in `GRAPH_TYPES`; shared `xAxisLabel`/`yAxisLabel` apply to it; shared `label`/`color` list it in `elementsOf` | present | `src/core/definitions/types.ts:13`; `src/core/definitions/shared.ts:90,101,146,155` | ✅ |
| Issue codes `outside_axis_range`, `degenerate_segment` | present | `src/core/issues.ts:26-27`, params and messages at `:153-154`, `:374-376` | ✅ |
| `axisDomainChecks`, `drawableTicks`, `defineProperties`, `sourceOf`, `stateMeasurement` | present | `src/core/definitions/axis.ts:142`, `src/core/value-scale.ts:442`, `src/core/definitions/types.ts:208`, `src/core/format.ts:208,229` | ✅ |
| Layout kit: `drawAxis`, `textBlock`, `titleBlock`, `wrap`, `axisLabelLines`, `linearScale`, `placeLabel` | present | `src/layout/kit/axis.ts:97`, `kit/title.ts:52,65`, `kit/text.ts:235`, `kit/value-scale.ts:298`, `kit/scale.ts`, `kit/labels.ts` | ✅ |
| Registry, component factory, registration files | present | `src/layout/registry.ts`, `src/react/createGraphComponent.tsx`, `src/index.ts`, `tsup.config.ts`, `package.json`, `.size-limit.json`, `tests/package/per-type-bundle.test.ts`; pattern commit `5e28148` | ✅ |
| TICKET-006's tick-label fix in place | present | `labelDecimals` in `src/core/value-scale.ts` | ✅ |
| `./core` bundle has room for one more definition | under 25 kB | 23.13 kB today; the number-line definition is about 2.3 kB gzipped alone | ⚠️ Tight: expected to land about 24–24.6 kB. Fits this ticket; leaves no room for the x,y,z graph or the remaining shape types (see Notes) |
| A test-only `xy-graph` fixture exists | not in ticket | `tests/fixtures/definitions/xy-graph.ts`, used by `fixtureRegistry` in validator, schema-agreement and renderer tests | ✅ Kept: fixtures stand in for real types so those tests do not move with a real type's rules (GSS TICKET-002 QR-009), as the number-line fixture already does beside the real number line |
| Carried findings deferred to this ticket | listed in the ticket's Known Hazards | definition contract (GSV-001 CR-002, QR-001/002), `maxItems` (GSV-003 SEC-001), domain checks (GSV-004 CR-003, SEC-004), example richness (GSV-005), provenance (GSS-002 CR-003), caller-sized text (GSS-002 SEC-001..003), ticks in checks (NLC-001 CR-006), `textBlock` (NLC-002 QR-005), DS-001, DS-002 | 🔁 Carried — see Implementation Plan |

**Resolved from ground truth (not escalated):**
- `textAlternative` is not a description term (the ticket's reconciliation note supersedes the Output's property list).
- The ruler-pattern fallback is moot: NLC TICKET-002 is delivered, so the number line's point, marker and `outside_axis_range` patterns are reused.
- The grid flag's name: the ticket says `grid`, but every other boolean in the vocabulary is `show…` (`showTickLabels`, `showCenter`, `showValues`) and the fixture already uses `showGrid`. Raised in the plan.

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-10-27
**Implemented by:** opus · high — routed as deliver-large from Tower

Add the `xy-graph` type end to end, following the number line (NLC TICKET-002) for points, markers, labels and `outside_axis_range`, and rulers NLC TICKET-003 (`5e28148`) for registration. Two choices approved with the plan:

- **Grid option name: `showGrid`**, not the ticket's `grid`, to match every other on/off term (`showTickLabels`, `showCenter`, `showValues`) and the test fixture. Recorded as a DEL.
- **Extreme aspect ratios: shrink, then clamp.** The plot keeps equal units (NLC-REQ-032): plot height = plot width × y span / x span. A plot that would be too tall narrows its width, centered, to keep equal units, down to a minimum plot width. Only when that is not enough, or when the plot is too flat, the plot height is clamped to a legible minimum or maximum; the units are then unequal and the text alternative says so. The constants are named and documented in the layout, and the clamp is recorded as a DEL. No `equalUnits` property is added (OQ-004 stays open).

### Planned Files

- `src/core/definitions/xy-graph.ts`: a side-effect-free factory (`export const xyGraph = /* @__PURE__ */ defineXyGraph()`), with properties built by `defineProperties`:
  - `xAxis` and `yAxis` through `axisProperties`, with `axisDomainChecks("xAxis")` and `axisDomainChecks("yAxis")`;
  - `showGrid` (boolean; default off, stated in its description);
  - `points[]` `{ x, y, label, color }`, at most 1,000;
  - `segments[]` `{ from: { x, y }, to: { x, y }, label, color }`, at most 1,000. The shared `label` and `color` spec objects are nested; every string term sets `maxLength`; the limits are stated in the descriptions.
  - Domain checks: `outside_axis_range` at each point's and endpoint's JSON Pointer (`/segments/0/to/y`), and `degenerate_segment`. They are built with `createIssue`, their `inputs` are declared, and they never enumerate ticks.
  - `describe(normalized, provenance)`: "A coordinate graph" with both ranges and spacings, the grid, every point and every segment with its label (`quoteText`, `stateMeasurement`, `sourceOf`), and a blank title treated as absent.
  - Registered in `src/core/definitions/index.ts`.
- `src/layout/xy-graph.ts`: `layout(normalized, provenance) → Scene`, registered in `src/layout/registry.ts`, with `planeAxes(xRange, yRange)` exported.
  - `planeAxes` handles: the quadrants shown; each axis's position (through the origin when the other range includes 0, else along the nearest edge: bottom/left for positive-only, top/right for negative-only); and the equal-unit plot size with the shrink-then-clamp rule.
  - Ticks and labels are drawn with `drawAxis` (`niceTicks`). Edge-axis ticks are labeled with their true values, with no corner "0".
  - Grid lines are drawn at every tick of both axes when `showGrid` is on, and none when it is off.
  - Point markers and labels follow the number line; segments are drawn in their color, with the label at the midpoint, placed by `placeLabel`.
  - Axis labels are drawn through `axisLabelLines`, the title through `titleBlock`, and boxes sized through `textBlock`. Every coordinate passes through `fmt()`. No caller-sized array is spread.
  - The text alternative comes from this type's own `describe`.
- `src/react/graphs/XyGraph.tsx`; `src/entries/xy-graph.ts`; `src/index.ts` (component export); `tsup.config.ts` (`entry`); `package.json` (`exports["./xy-graph"]`); `.size-limit.json` (`./xy-graph`, 25 kB); `pnpm generate`, with the regenerated `src/generated/*` files committed.
- `examples/xy-graph.json`: x −5..5 and y −5..5, the grid on, two labeled points, one colored and labeled segment, axis labels and a title. Every optional term is used once. Also `examples/invalid/xy-graph-outside-range.json` and `examples/invalid/xy-graph-degenerate-segment.json`.
- `tests/core/xy-graph.test.ts`: validation of the example, independent and default spacings, `outside_axis_range` paths, `degenerate_segment`, and the text alternative's content.
- `tests/layout/xy-graph.test.ts`, on Scene data:
  - the 1-, 2- and 4-quadrant cases and axis positions at the origin and on each edge, with true-valued edge ticks and no corner "0";
  - the grid on and off;
  - point and segment positions within 0.5 units, and colors that apply to their element only;
  - equal units (x −10..10, y −2..2 drawn wider than tall), and the shrink and clamp cases;
  - empty axes, the text alternative, and a `tickSpacing: 0.1 * 3` axis labeled `0, 0.3, 0.6, 0.9, 1.2` (DS-001).
- `tests/react/Graph.test.tsx`: `<XyGraph>` and `<Graph>` render the example identically; every text at its limit renders with a bounded node count; one over-limit case per text term.
- `tests/package/per-type-bundle.test.ts`: this type's exclusions, and this type left out of every other entry. "A circle" is not asserted absent from this entry, because of the known circle leak.
- `tests/core/definitions.test.ts`: the applicability and consistency checks cover the real definition.

### How Acceptance Criteria Will Be Met

- The example validates and renders identically through `<XyGraph>` and `<Graph>`: `tests/react/Graph.test.tsx`.
- 1, 2 and 4 quadrants; axes at the origin or an edge with true-valued ticks: `tests/layout/xy-graph.test.ts` via `planeAxes` and the Scene.
- Independent and default spacings: `tests/core/xy-graph.test.ts` and the layout's tick positions.
- The grid on (at every tick, nowhere else) and off by default: the layout test, and the definition's description.
- Points and segments within 0.5 units; per-element label and color: the layout test.
- `outside_axis_range` at JSON Pointer paths, and `degenerate_segment`: `tests/core/xy-graph.test.ts` and the invalid examples.
- Equal units, with height derived from the ranges: the layout test (x −10..10, y −2..2 is wider than tall; ratio of unit lengths 1).
- The text alternative states "coordinate graph", both ranges, and every point and segment with labels: the core and layout tests.
- An empty graph draws its axes (and the grid when on): the layout test.
- `./xy-graph` is in `package.json` exports and `.size-limit.json`: `pnpm check:dist`, `pnpm size`, `publint`, `attw`, and the per-type bundle test.

## Progress

- [x] `src/core/definitions/xy-graph.ts` — written
- [x] `src/core/definitions/index.ts` — written
- [x] `src/layout/xy-graph.ts` — written
- [x] `src/layout/registry.ts` — written
- [x] `src/react/graphs/XyGraph.tsx` — written
- [x] `src/entries/xy-graph.ts` — written
- [x] `src/index.ts` — written
- [x] `tsup.config.ts` — written
- [x] `package.json` — written
- [x] `.size-limit.json` — written
- [x] `src/generated/* (pnpm generate)` — written
- [x] `examples/xy-graph.json` — written
- [x] `examples/invalid/xy-graph-outside-range.json` — written
- [x] `examples/invalid/xy-graph-degenerate-segment.json` — written
- [x] `tests/core/xy-graph.test.ts` — written
- [x] `tests/layout/xy-graph.test.ts` — written
- [x] `tests/react/Graph.test.tsx` — written
- [x] `tests/package/per-type-bundle.test.ts` — written
- [x] `tests/core/definitions.test.ts` — written

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/core/definitions/xy-graph.ts`: the `xy-graph` definition (pure factory `defineXyGraph`), `planeShape` and `quadrantCount`, the `PLANE_MIN_RATIO`/`PLANE_MAX_RATIO` bounds, checks `pointsInRange`, `segmentsInRange` and `segmentsHaveLength`, and `describe`.
- `src/core/definitions/index.ts`: registers `xyGraph`.
- `src/core/definitions/shared.ts`: `POINTS_DESCRIPTION`, the one type-neutral `points` description (DEL-003).
- `src/core/definitions/number-line.ts`: its `points` term uses `POINTS_DESCRIPTION` (DEL-003); validity unchanged.
- `src/layout/xy-graph.ts`: `planeAxes`, `xyGraphLayout`, and `MAX_PLOT_HEIGHT`/`MIN_PLOT_WIDTH`; registered in `src/layout/registry.ts`.
- `src/react/graphs/XyGraph.tsx`, `src/entries/xy-graph.ts`, `src/index.ts` (export), `tsup.config.ts`, `package.json` (`exports["./xy-graph"]`), `.size-limit.json` (`./xy-graph`, 25 kB).
- `src/generated/description.ts`, `schema.json`, `tool-schema.json`, `vocabulary.json`: regenerated.
- `examples/xy-graph.json`, `examples/invalid/xy-graph-outside-range.json` (`outside_axis_range /segments/0/to/y`), `examples/invalid/xy-graph-degenerate-segment.json` (`degenerate_segment /segments/0`).
- `tests/core/xy-graph.test.ts` (29 tests), `tests/layout/xy-graph.test.ts` (30, two properties), `tests/react/Graph.test.tsx` (+5), `tests/package/per-type-bundle.test.ts` (+2), `tests/core/definitions.test.ts` (+4).

## Verification Run

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm generate` | 0 | regenerated files committed |
| `pnpm lint` | 0 | — |
| `pnpm typecheck` | 0 | — |
| `pnpm test` (×3) | 0 | 55 files, 1,553 tests passed each run |
| `pnpm bench` | 0 | 14 passed |
| `pnpm build` | 0 | — |
| `pnpm check:dist` | 0 | — |
| `pnpm check:deps` | 0 | — |
| `pnpm check:images` | 0 | — |
| `pnpm size` | 0 | `./core` 24.55 kB of 25 kB (was 23.13); `./xy-graph` 20.73 kB of 25 kB; `.` 36.42 kB of 120 kB |
| `pnpm publint` | 0 | — |
| `pnpm attw` | 0 | — |
| `pnpm audit` / `pnpm audit --prod` | 0 / 0 | No known vulnerabilities found |
| Mutation checks (11; each restored and diffed) | — | plot height ×0.9 → 6 fail; no narrowing → 4; x-axis always bottom → 5; y-axis always left → 5; degenerate check off → 3; `||` for `&&` → 5; grid skips first x tick → 3; grid at plot edges → 3; range check excludes ends → 4; y checked against x range → 6; y-axis 0 not blanked → 3 |

## Acceptance Criteria Verification

- [x] `examples/xy-graph.json` (x −5..5, y −5..5, grid on, two labeled points, one colored segment, axis labels) validates and renders identically through `<XyGraph>` and `<Graph>` — `tests/react/Graph.test.tsx` and `tests/core/xy-graph.test.ts`
- [x] One, two and four quadrants for the three range pairs — `tests/layout/xy-graph.test.ts` (`planeAxes`, `quadrantCount`, and the Scene)
- [x] Axes through the origin when the other range holds 0, else along the nearest edge (bottom/left for positive-only, top/right for negative-only), edge ticks labeled with true values and no corner "0" — `tests/layout/xy-graph.test.ts`; mutations "x-axis always bottom" and "y-axis always left" fail it
- [x] Independent `xAxis.tickSpacing` and `yAxis.tickSpacing`, each defaulting by TICKET-001's rule — `tests/core/xy-graph.test.ts` and the layout's tick positions
- [x] `showGrid: true` draws grid lines at every tick of both axes and nowhere else; off by default, stated in the definition — `tests/layout/xy-graph.test.ts`; grid mutations fail it. The term is `showGrid`, not `grid` (DEL-001)
- [x] Points at `(xScale(x), yScale(y))` and segments joining their endpoints within 0.5 units — `tests/layout/xy-graph.test.ts`, including a property
- [x] Optional `label` and `color` on each point and segment, color applied to that element only — `tests/layout/xy-graph.test.ts`
- [x] `outside_axis_range` at its JSON Pointer path (`/segments/0/to/y`) — `tests/core/xy-graph.test.ts` and `examples/invalid/xy-graph-outside-range.json`
- [x] `degenerate_segment` for equal endpoints — `tests/core/xy-graph.test.ts` and `examples/invalid/xy-graph-degenerate-segment.json`
- [x] Equal units by default; x −10..10, y −2..2 is wider than tall with height from the ranges — `tests/layout/xy-graph.test.ts`; "plot height ×0.9" fails it. Extreme ratios follow DEL-002
- [x] The text alternative states "coordinate graph", both ranges and every point and segment with labels — `tests/core/xy-graph.test.ts` and `tests/layout/xy-graph.test.ts`
- [x] An x,y graph with no points or segments renders empty axes, and the grid when on — `tests/layout/xy-graph.test.ts`
- [x] `./xy-graph` in `package.json` exports and `.size-limit.json` — `pnpm check:dist`, `pnpm size`, `publint`, `attw`, `tests/package/per-type-bundle.test.ts`

## Decisions Made

### DEL-001: The grid option is `showGrid`

**Context:** The ticket names it `grid`; every other on/off term is `show…` (`showTickLabels`, `showCenter`, `showValues`), and the test fixture already uses `showGrid`.
**Decision:** `showGrid`, off by default. Approved with the plan (Engineer — Thomas Eaves, 2026-10-27).
**Rationale:** One naming pattern for every flag in the vocabulary (GSV-REQ-012).
**Ticket Impact:** Criterion 5's `grid: true` reads `showGrid: true`.

### DEL-002: Equal units, then shrink, then clamp

**Context:** NLC-REQ-032 asks for equal units by default; the ticket's hazard asks for a documented clamp on extreme aspect ratios, without silently switching units. NLC OQ-004 (a setting to turn equal units off) is still open, so no `equalUnits` property was added.
**Decision:** Approved with the plan. The plot's height over its width is the y span over the x span, bounded to [`PLANE_MIN_RATIO` = 1/6, `PLANE_MAX_RATIO` = 3] by `planeShape` in core. A plot taller than `MAX_PLOT_HEIGHT` (360) is narrowed and centered, down to `MIN_PLOT_WIDTH` (120 = 360 / 3), keeping equal units. A ratio outside the bounds is held at the nearer bound, the units are then unequal, and the text alternative says "To fit, one y unit is drawn longer/shorter than one x unit."
**Rationale:** The bounds are ratios, so `describe` (in `./core`) and the layout make the same decision without measuring text, and no layout code enters `./core`. A height of 360 keeps a square plane within a page column.
**Ticket Impact:** On the flat side, the minimum plot height is a sixth of the available width (about 50–60 units), not a fixed size. The Product Owner can still resolve OQ-004.

### DEL-003: One shared `points` description

**Context:** The vocabulary publishes each term once with one description (GSV-REQ-015; `tests/core/definitions.test.ts` "consistencyProblems"). The number line's `points` description named the number line and its limit of 100, so the x,y graph could not share the term.
**Decision:** Approved during implementation (Engineer — Thomas Eaves, 2026-10-27). `POINTS_DESCRIPTION` in `src/core/definitions/shared.ts` is used by both types; each type's `maxItems` (100 / 1,000) and its own description state its limit.
- Old: "The points marked on the number line, at most 100, each at its value and optionally with a label and a color. Points may share a value: each is drawn, and their labels are placed apart where the drawing has room."
- New: "The points marked on the graph, each at its position (its value on a number line, its x and y on a coordinate graph) and optionally with a label and a color. Points may share a position: each is drawn, and their labels are placed apart where the drawing has room."
**Rationale:** Keeps one term with one meaning, as AD-005's `/points/2/x` example and the fixture assume, rather than a second term name.
**Ticket Impact:** Touches `src/core/definitions/number-line.ts` and `shared.ts`, outside the Output. The number line's published schema and vocabulary text change; which descriptions are valid does not.

### DEL-004: `planeAxes` takes the room it may use

**Context:** The plot's width depends on the room left beside the tick labels and the y-axis label.
**Decision:** `planeAxes(xRange, yRange, maxWidth = 368)`, a third, optional argument.
**Rationale:** Callers that know the room pass it; the default is the whole width inside the margins.
**Ticket Impact:** The Output's `planeAxes(xRange, yRange)` still works as written; TICKET-004 may pass the room.

### DEL-005: The origin is labeled once

**Context:** Both axes would print "0" at the origin.
**Decision:** The y-axis leaves its 0 unlabeled where the x-axis crosses it. Where the y-axis runs down through the x-axis's 0, that "0" moves below-left of the origin. On densely ticked axes, where it would collide with its neighbouring labels, the origin is left unlabeled. Edge axes show only true values, so no "0" appears at a corner.
**Rationale:** One "0" at the origin, as in printed coordinate planes; the ticket's edge-axis hazard.
**Ticket Impact:** None.

### DEL-006: Placement of tick labels, axis labels and element labels

**Context:** The ticket leaves placement to the layout.
**Decision:**
- An x-axis on the top edge puts its tick labels above it; a y-axis on the right edge puts them to its right.
- The y-axis label reads upward on the left, wrapped to 160 units; the drawing makes room when it reaches past a short plot. The x-axis label sits below the plot.
- Points and segments without a color take the accent color.
- Labels are cut to at most 2 lines and 120 units wide, through `textBlock`. A point's label has 12 candidate places in two rows; a segment's has 8 around its middle, chosen by `placeLabel`.
**Rationale:** Labels stay outside the plot where an axis sits on an edge, and caller text stays bounded (GSS TICKET-002 SEC-002).
**Ticket Impact:** None.

### DEL-007: Limits and the largest description

**Context:** The ticket asks for curriculum-sized `maxItems` (GSV TICKET-003 SEC-001).
**Decision:** At most 1,000 points and 1,000 segments. In practice the 10,000-value description limit caps them first: about 1,000 labeled points plus 700 labeled segments. At that size, layout takes about 0.2 s, the text alternative is about 713,000 characters, and the markup is about 2.24 MB, because the text alternative appears twice (`aria-label` and `<title>`). A test pins these bounds.
**Rationale:** Matches the other types' limits; the bound is pinned so a change is visible.
**Ticket Impact:** The text alternative is much larger than the number line's 75,721-character bound (NLC TICKET-002 security review), because the x,y graph allows ten times the points and adds segments. Raised for the security review.

### DEL-008: The text alternative states more than the criterion lists

**Context:** Criterion 11 asks for the type, both ranges and every point and segment.
**Decision:** `describe` also states the quadrant count, the grid, the axis labels, hidden tick labels, and unequal units when DEL-002 clamps.
**Rationale:** A reader of the text alternative gets what the drawing shows (NLC-REQ-012).
**Ticket Impact:** None.

## Deviations from Plan

- `src/core/definitions/shared.ts` and `src/core/definitions/number-line.ts` were changed, outside the planned files, for DEL-003; approved by the Engineer during implementation. Downstream: TICKET-004 (x,y,z graph) should reuse `POINTS_DESCRIPTION` for its `points`.
- `planeAxes` gained an optional third argument (DEL-004); the two-argument call in the Output still works.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| NLC-REQ-001 | `src/core/definitions/xy-graph.ts`:defineXyGraph, xyGraph | `@spec NLC-REQ-001, …` |
| NLC-REQ-010 | `src/core/definitions/xy-graph.ts`:pointsInRange, segmentsInRange | `@spec NLC-REQ-010` |
| NLC-REQ-012 | `src/core/definitions/xy-graph.ts`:xyGraph.describe | `@spec NLC-REQ-012, …` |
| NLC-REQ-022 | `src/core/definitions/xy-graph.ts`:xyGraph; `src/layout/xy-graph.ts`:xyGraphLayout; `src/react/graphs/XyGraph.tsx`:XyGraph | `@spec NLC-REQ-022, …` |
| NLC-REQ-023 | `src/core/definitions/xy-graph.ts`:quadrantCount, describe; `src/layout/xy-graph.ts`:planeAxes | `@spec NLC-REQ-023, …` |
| NLC-REQ-024, NLC-REQ-025 | `src/layout/xy-graph.ts`:planeAxes, xyGraphLayout | `@spec NLC-REQ-023, NLC-REQ-024, NLC-REQ-025, NLC-REQ-032` |
| NLC-REQ-026..030 | `src/core/definitions/xy-graph.ts`:defineXyGraph; `src/layout/xy-graph.ts`:xyGraphLayout | `@spec NLC-REQ-001, NLC-REQ-026, …, NLC-REQ-030` |
| NLC-REQ-031 | `src/core/definitions/xy-graph.ts`:describe; `src/layout/xy-graph.ts`:xyGraphLayout | `@spec …, NLC-REQ-031, …` |
| NLC-REQ-032 | `src/core/definitions/xy-graph.ts`:planeShape, describe; `src/layout/xy-graph.ts`:planeAxes | `@spec NLC-REQ-032` |
| NLC-REQ-033 | `src/core/definitions/xy-graph.ts`:segmentsHaveLength | `@spec NLC-REQ-033` |

The specification's `## @spec Coverage` table has one new row per requirement for the xy part.

## Notes

- **`./core` is at 24.55 kB of 25 kB.** The x,y,z graph (TICKET-004) and the remaining shape types (GSS TICKET-003 onward) will not fit. A decision is needed before the next type: raise the budget, or move definitions out of `./core`.
- **Crowded tick labels on narrow or flat plots.** The shared default spacing rule (`axisSpacing`, 7 to 20 ticks) does not know the drawn length, so tick labels touch on narrow or flat plots (x −2..2 on a 120-unit plot draws "-2-1.5-1-0.5" with no space). Fixing it means making the default spacing aware of the drawn length, as the bar graph's `fitHorizontalValueAxis` does; that changes a rule `describe` and the checks share, so it was left out of this ticket.
- **Circle leak confirmed again.** "A circle drawn to scale…" is in a consumer bundle of `dist/xy-graph.js`; the per-type bundle test leaves it unasserted with a comment, as the ticket says.
- **OQ-004, OQ-006, OQ-008 stay open**: no `equalUnits` setting, segments only, no axis-break symbol.
- The test-only fixture `tests/fixtures/definitions/xy-graph.ts` is kept, as the number-line fixture is beside the real number line.

## Post-Review Amendments

- **graph-library/number-lines-and-coordinate-graphs-ticket-003-code-review/CR-001** (2026-10-27): DEL-005 blanked an axis's 0 whenever the other axis crossed it, so a true 0 on an edge axis went unlabeled (x 5..10, y −5..5 showed `…−1, , 1…`; likewise the x-axis's 0 on the top edge for y −10..−2), and with the x tick labels hidden the origin had no "0". Now the origin rule applies only where the axes cross at (0, 0) (`atOrigin`). At the origin, the x-axis blanks its 0 where the y-axis runs down through it, and the y-axis blanks its 0 where the x-axis labels the origin or runs left through the label; the below-left "0" is written for whichever axis blanked its 0 and shows its labels. This supersedes DEL-005's wording. Files: `src/layout/xy-graph.ts`, `tests/layout/xy-graph.test.ts` (two tests added; "hides an axis's tick labels…" now expects the origin's "0"). Mutation: the old blanking rule fails 2 tests, the old write condition 1. Re-verified: `pnpm lint` 0, `pnpm typecheck` 0, `pnpm test` 0 (1,555 passed).
- **graph-library/number-lines-and-coordinate-graphs-ticket-003-code-review/CR-002** (2026-10-27): deferred to graph-library/number-lines-and-coordinate-graphs/TICKET-009 (a default tick spacing the drawn axis has room for); TICKET-004 depends on it. No code change here.
- **graph-library/number-lines-and-coordinate-graphs-ticket-003-code-review/CR-003** (2026-10-27): dismissed; 0 is always a tick when the range holds it. No change.
- **graph-library/number-lines-and-coordinate-graphs-ticket-003-quality-review/QR-001, QR-002, QR-003, QR-006** (2026-10-27): a refactor with no behaviour change. `xyGraphLayout` is split into phases (`plotRoom`, `zeroBlanks`, `originLabelFits`, `originLabel`, `gridLines`, `figures`, `elementLabels`); the label cut and placement shared with the number line move to `src/layout/kit/labels.ts` (`ELEMENT_LABEL_MAX_WIDTH`, `ELEMENT_LABEL_MAX_LINES`, `placeElementLabel`); both layouts' line helpers become the kit's `drawLine` (`src/layout/kit/axis.ts`); `BASELINE` (0.8) is named in `src/layout/kit/title.ts` and used across the kit; `planeAxes` loses its `!` assertions and the `clamp` comment is corrected. Files: `src/layout/xy-graph.ts`, `src/layout/number-line.ts`, `src/layout/kit/labels.ts`, `src/layout/kit/axis.ts`, `src/layout/kit/title.ts`, `src/layout/kit/value-scale.ts`, `tests/layout/kit/labels.test.ts` (4 tests). 272 rendered Scenes (examples, x,y graphs, number lines, bar graphs, a ruler) are byte-identical before and after (rechecked in the main session). Re-verified: `pnpm generate` 0 (no generated change), `lint` 0, `typecheck` 0, `test` ×3 0 (1,559 passed), `bench` 0, `build` 0, `check:dist` 0, `check:deps` 0, `check:images` 0, `size` 0 (`./core` 24.55 kB, `./xy-graph` 21.05 kB, `./number-line` 19.74 kB), `publint` 0, `attw` 0, `audit` 0.
- **graph-library/number-lines-and-coordinate-graphs-ticket-003-quality-review/QR-004** (2026-10-27): deferred to TICKET-009 with code review CR-002.
- **graph-library/number-lines-and-coordinate-graphs-ticket-003-quality-review/QR-005** (2026-10-27): the `./core` limit in `.size-limit.json` is 40 kB (was 25 kB). `./core` holds every type's definition (AD-001); the per-type entries keep the 25 kB that CPSE-NFR-002 sets. Known Hazards added to TICKET-004 and TICKET-009.
- **graph-library/number-lines-and-coordinate-graphs-ticket-003-security-review/SEC-001** (2026-10-27): DEL-007's "largest description" understated the ceiling: coordinates were stated with every digit, so subnormals (326 characters each) made a 126 KB unlabeled description into a 1.79-million-character text alternative, and the ceiling reached about 2.0 million characters and 8.7 MB of markup. Product Owner decision: the text alternative states a point's or segment end's coordinate through `coordinate(value, axis)`, as 0 when closer to 0 than a trillionth of its axis's span and otherwise at most 12 significant digits (`cleanDecimal`); typed values read as written, computed noise as the value meant, validity unchanged. **Corrected DEL-007:** at the limits the text alternative now reaches about 224,000 characters unlabeled and 559,000 with every text 200 × `"` (about 908,000 UTF-16 units with text outside the BMP); markup about 5.8 MB, holding the text alternative twice and escaping each `"`. Raising `XY_ELEMENT_LIMIT`, `DESCRIPTION_VALUE_LIMIT` or `CALLER_TEXT_LIMIT` raises them in proportion. Files: `src/core/definitions/xy-graph.ts` (`coordinate`, `@spec NLC-REQ-012`), `tests/core/xy-graph.test.ts`, `tests/react/Graph.test.tsx` (the worst cases and the subnormal case pinned in place of DEL-007's case); the specification's NLC-REQ-012 coverage row names `coordinate`. Mutation: `coordinate` returning the raw value fails both tests.
- **graph-library/number-lines-and-coordinate-graphs-ticket-003-security-review/SEC-002** (2026-10-27): deferred to graph-library/component-packaging-and-source-export/TICKET-007 with a Known Hazard (the x,y graph is the largest description; cap its text in the tool result).
- **graph-library/number-lines-and-coordinate-graphs-ticket-003-security-review/SEC-003** (2026-10-27): an adversarial timing test (1,000 labeled points stacked at one spot and 700 labeled segments, 69 KB) replaces the 5 s check, bounded at 1.5 s; measured 0.37–0.53 s, which realises CPSE TICKET-002 SEC-004's accepted half-second forecast. Point labels keep 12 candidate places. Re-verified for SEC-001..003: `pnpm generate` 0, `lint` 0, `typecheck` 0, `test` ×3 0 (1,561 passed), `bench` 0, `build` 0, `check:dist` 0, `check:deps` 0, `check:images` 0, `size` 0 (`./core` 24.57 kB of 40, `./xy-graph` 21.07 kB of 25), `publint` 0, `attw` 0, `audit` 0, `audit --prod` 0.
