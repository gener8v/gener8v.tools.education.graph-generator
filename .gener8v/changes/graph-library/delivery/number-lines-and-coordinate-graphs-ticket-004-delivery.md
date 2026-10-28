# TICKET-004: Deliver the x,y,z coordinate graph type — Delivery Record

## Ticket Reference

**Ticket:** graph-library/number-lines-and-coordinate-graphs/TICKET-004
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/number-lines-and-coordinate-graphs.md`
**Requirements Covered:**
- NLC-REQ-001: x,y,z graph parameters defined in the single definition (xyz part)
- NLC-REQ-010: Report each point outside its axis range (xyz part)
- NLC-REQ-012: Text alternative stating type, axis ranges and every marked point (xyz part)
- NLC-REQ-034: Render from an x-axis, a y-axis and a z-axis range
- NLC-REQ-035: Draw the three axes in one documented, fixed viewing projection
- NLC-REQ-036: Label each of the three axes, with the supplied label or the axis name by default
- NLC-REQ-037: Plot each supplied point at its (x, y, z) coordinates within the projection
- NLC-REQ-038: Option to draw guide lines from a point to its position on the x,y plane
- NLC-REQ-039: Tick spacing for each of the three axes

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Predecessors TICKET-001, TICKET-006, TICKET-009 delivered | delivery records | all three Delivered and reviewed; `main` at `fe6c478` | ✅ |
| `isometric(x, y, z) → [x, y]` with documented axis directions (GSS TICKET-001, RES-003) | `src/layout/kit/isometric.ts` | present: z up the page, x toward the lower left, y toward the lower right, `ISO_SCALE` √(2/3), unrounded | ✅ |
| `xyz-graph` in `GRAPH_TYPES`; shared `xAxisLabel`, `yAxisLabel`, `zAxisLabel` apply to it; shared `label`/`color` list it in `elementsOf` | `src/core/definitions/types.ts`, `shared.ts` | all present already; nothing registered under `xyz-graph` yet | ✅ |
| Axis kit: `axisProperty`, `axisDomainChecks`, `Axis`, `AXIS_LIMIT` (±1e9) | `src/core/definitions/axis.ts` | present | ✅ |
| TICKET-009's length-aware default: `AxisRoom {length, extent, textSize}`, `fittedAxisSpacing`, optional `room` on `axisSpacing`, `drawableTicks`, `niceTicks`; `tickLabelWidth` | `src/core/value-scale.ts` | present, as in that record's Files Produced | ✅ |
| `drawAxis` (ticks perpendicular, `showTickLabels`, `labels` map), `drawLine` | `src/layout/kit/axis.ts` | present; slanted-axis labels clear their own line (NLC TICKET-001 QR-007) but are not routed through `placeLabel` | ✅ — this ticket places tick labels itself (see plan) |
| `placeLabel`, `placeElementLabel`, `textBlock`, `titleBlock`, `textLines`, `axisLabelLines`, `drawMarker`, `MARKER_REACH` | `src/layout/kit/*` | present | ✅ |
| `Layout<D>` takes `(normalized, provenance)`; `createGraphComponent` | `src/layout/registry.ts`, `src/react/createGraphComponent.tsx` | present | ✅ |
| Scene allows dashed lines | `stroke-dasharray` in `REACT_PROP` | present (the line graph uses it) | ✅ |
| Scene width fixed | `Scene.width: typeof SCENE_WIDTH` (400) | fixed; the figure must fit 368 across | ✅ — shapes the plan |
| Registration checklist (definitions index, layout registry, `src/index.ts`, entry, `tsup.config.ts`, `package.json`, `.size-limit.json`, per-type bundle test, `pnpm generate`) | x,y graph pattern | commit `a108175` touched exactly these | ✅ |
| Size budgets | `./core` ≤ 40 kB, per-type ≤ 25 kB | `./core` 25.12 kB, `./xy-graph` 21.65 kB | ✅ |
| TICKET-007 (`too_few_ticks`) | not required | not delivered; no `too_few_ticks` in this ticket's tests (Known Hazard) | ✅ |
| Carried: GSV TICKET-001 CR-002 / QR-001, QR-002 (definition contract) | honoured | — | 🔁 Carried — see plan |
| Carried: GSV TICKET-003 SEC-001 (`maxItems`) | honoured | — | 🔁 Carried |
| Carried: GSV TICKET-004 CR-003 / SEC-004 (domain checks) | honoured | — | 🔁 Carried |
| Carried: GSV TICKET-005 CR-001 / QR-001, QR-002 (rich example; `pnpm generate`) | honoured | — | 🔁 Carried |
| Carried: GSS TICKET-002 CR-003 (provenance), SEC-001..003 (no spreads, wrapped text) | honoured | — | 🔁 Carried |
| Carried: GSS TICKET-001 SEC-002 (scale before projecting; test at ±1e9) | honoured | — | 🔁 Carried |
| Carried: NLC TICKET-001 CR-006 (`drawableTicks` in checks) | honoured — the definition registers `axisDomainChecks` only | — | 🔁 Carried |
| Carried: GSV TICKET-007 (caller-text limits and tests) | honoured | — | 🔁 Carried |
| Carried: DS-001 / TICKET-006 (`0.1 * 3` labels) | test added, no re-rounding | — | 🔁 Carried |
| Carried: NLC TICKET-003 CR-002 / TICKET-009 (one default-spacing rule, drawn length, describe states it) | honoured | — | 🔁 Carried |
| Carried: NLC TICKET-009 security review note (finite length, validated ends to `fittedAxisSpacing`) | honoured — the length is a constant | — | 🔁 Carried |

**Resolved from ground truth (not escalated):**
- *Where the isometric kit comes from.* `src/layout/kit/isometric.ts` exists, so the Known Hazard's "blocked" branch does not apply.
- *Which pattern to follow.* The number line and the x,y graph (TICKET-002, TICKET-003) are both delivered. The x,y graph is the nearer pattern (two axes, points, shared axis labels, a `describe` that states fitted spacings).
- *`textAlternative` as a term.* Superseded by the Known Hazard: it is the component prop, not a description term.
- *The drawn length the default spacing needs (TICKET-009 hazard).* The drawing is 400 wide in every Scene. So the plan gives each axis one fixed drawn length, a constant both `describe` and the layout read, and the shared rule gets a finite length and validated ends by construction.

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-10-27
**Implemented by:** opus · high — routed as deliver-large from Tower

### Planned Files

- `src/core/definitions/xyz-graph.ts`: `XyzGraph`, `XyzPoint`; `XYZ_POINT_LIMIT` 1000; `AXIS_LENGTH` 170 (every axis drawn 170 drawing units long whatever its range, ≈139 on the page after `ISO_SCALE`); `defineXyzGraphProperties()` (`xAxis`, `yAxis`, `zAxis` via `axisProperty`; `guideLines` boolean, "off unless true"; `points` `{x, y, z, label, color}` with the shared label/color nested, `maxItems` 1000); checks: `axisDomainChecks` ×3 and `pointsInRange` (`outside_axis_range` at `/points/i/z` etc.); `xyzRooms(graph)` — TICKET-009's length-aware default shared by describe and layout: x and y `{length: ISO_SCALE·170, extent: gap/cos30°, textSize: 12/cos30°}` (labels straight below a 30° axis, so neighbours are `apart·cos30°` apart across), z `{extent: 14.4 + gap, textSize: 0}`, gap 12/5 as the x,y graph; `describe(graph, provenance)`: "A three-dimensional coordinate graph titled “…”, x from 0 to 5 ticked every 1, y …, z …, in isometric projection, with guide lines from each point to the x,y plane. The x-axis is labeled “…”. 3 points are plotted: (1, 2, 3) labeled “A”, …" (plus a sentence that each axis is drawn the same length when spans differ; "No points are plotted."), `quoteText`/`stateMeasurement`/coordinate cleaning; `/* @__PURE__ */` factory; description text says "isometric", documents the projection and limits.
- `src/layout/xyz-graph.ts`: axes meet at (clamp(0,x), clamp(0,y), clamp(0,z)) — the origin when every range includes 0 — each running its full range through it; every value scaled into drawing units relative to that point first (≤170, the ±1e9 hazard), projected only by `isometric()`, then `fmt()`. Axes via `drawAxis` with `showTickLabels: false`; tick labels placed by the layout through `placeLabel` against the other axes and earlier labels: x and y below their tick, shifted down just enough to clear the slanted line (second candidate above), z on the left (right when the z-axis has more room there), the origin's "0" once. Axis labels (default "x", "y", "z") beyond each axis's positive end (z above its top), wrapped to 120 wide, 2 lines, held inside the margins. Points: markers in color or the accent, labels by `placeElementLabel`. `guideLines`: dashed lines (x,y,z)→(x,y,z₀)→ to the x-axis and to the y-axis, zero-length pieces skipped. The figure's 240 × 278 hexagon centered across; height from the content below `titleBlock`.
- Registration: `src/core/definitions/index.ts`, `src/layout/registry.ts`, `src/react/graphs/XyzGraph.tsx` + `src/index.ts`, `src/entries/xyz-graph.ts` + `tsup.config.ts`, `package.json` `exports["./xyz-graph"]`, `.size-limit.json` (25 kB), `pnpm generate` → `src/generated/*`, `.changeset/xyz-graph.md` (patch, `Added:`).
- `examples/xyz-graph.json` (0..5 ×3, three labeled points, guide lines on, every term used once) and `examples/invalid/xyz-graph-outside-range.json`.
- `tests/core/xyz-graph.test.ts`: validation, default axis labels, `outside_axis_range` at each path, description text, spacings stated as drawn.
- `tests/layout/xyz-graph.test.ts`: on Scene data — projection only through `isometric()` (positions equal `isometric()` of scaled values within 0.5), ticks on their axis, supplied `tickSpacing` used as given, no two default tick labels overlap (including short/wide ranges), the `0.1 * 3` labels, guide lines on/off, a ±1e9 `createGraph` not `internal_error`, the text alternative.
- Shared tests: `tests/core/definitions.test.ts`, `tests/react/Graph.test.tsx` (identical through both components, accessible name, at-limit text, over-limit cases), `tests/package/per-type-bundle.test.ts` ("A circle" unasserted in the built entry — known leak).
- Specification `@spec Coverage` rows.

### How Acceptance Criteria Will Be Met

- Example renders identically through `<XyzGraph>` and `<Graph>`: `tests/react/Graph.test.tsx`.
- All positions through `isometric()`, no projection math: layout imports `isometric` only; layout test compares every axis end, tick and point with `isometric()` of the scaled values within 0.5.
- Ticks per `tickSpacing` or the fitted default, on their axis within 0.5: layout test.
- Axis labels supplied or "x", "y", "z": layout and core tests.
- Points at the projection within 0.5, optional label and color: layout test.
- Guide lines dashed to (x, y, z₀) then to the axes with `guideLines: true`, none by default: layout test; default stated in the definition's term description.
- `outside_axis_range` at the JSON Pointer path: core test and the invalid example.
- Text alternative "three-dimensional coordinate graph", ranges, every point with labels: core and React tests.
- "isometric" in the definition description: core test on the definition and generated schema.
- `./xyz-graph` in exports and `.size-limit.json`: `pnpm size`, `check:dist`, publint, attw.

## Progress

- [x] `src/core/definitions/xyz-graph.ts`
- [x] `src/core/definitions/index.ts`
- [x] `src/layout/xyz-graph.ts`
- [x] `src/layout/registry.ts`
- [x] `src/react/graphs/XyzGraph.tsx`, `src/index.ts`
- [x] `src/entries/xyz-graph.ts`, `tsup.config.ts`, `package.json`, `.size-limit.json`
- [x] `examples/xyz-graph.json`, `examples/invalid/xyz-graph-outside-range.json`
- [x] `tests/core/xyz-graph.test.ts`
- [x] `tests/layout/xyz-graph.test.ts`
- [x] `tests/core/definitions.test.ts`, `tests/react/Graph.test.tsx`, `tests/package/per-type-bundle.test.ts`
- [x] `src/generated/*` (`pnpm generate`), `.changeset/xyz-graph.md`

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/core/definitions/xyz-graph.ts`: the `xyz-graph` definition — `XyzGraph`, `XyzPoint`, `XYZ_POINT_LIMIT` (1000), `AXIS_LENGTH` (170), `AXIS_PAGE_LENGTH` (√(2/3) × 170), `xyzRooms(graph)` (the TICKET-009 default-spacing rooms shared by `describe` and the layout), terms `xAxis`, `yAxis`, `zAxis`, `guideLines`, `points`; checks `axisDomainChecks` ×3 and `pointsInRange`; `describe(graph, provenance)`; a `/* @__PURE__ */` factory
- `src/core/definitions/xy-graph.ts`: `coordinates` exported for the x,y,z graph's points; `xAxis`/`yAxis` descriptions reworded to "coordinate graph's x" / "y" so both coordinate graphs share one definition per term (DEL-006)
- `src/core/definitions/index.ts`, `src/layout/registry.ts`, `src/index.ts`: registration and the `XyzGraph` export
- `src/layout/xyz-graph.ts`: `xyzGraphLayout` (`frameOf`, `axesOf`, `axisObstacles`, `tickLabels`, `guideSegments`, `axisLabels`, `pointLabels`); `AXIS_LABEL_WIDTH` 120, `GUIDE_DASH` "4 3"
- `src/react/graphs/XyzGraph.tsx`, `src/entries/xyz-graph.ts`, `tsup.config.ts`, `package.json` (`exports["./xyz-graph"]`), `.size-limit.json` (`./xyz-graph`, 25 kB)
- `examples/xyz-graph.json`, `examples/invalid/xyz-graph-outside-range.json`
- `src/generated/description.ts`, `schema.json`, `tool-schema.json`, `vocabulary.json`: regenerated
- `tests/core/xyz-graph.test.ts` (21 tests), `tests/layout/xyz-graph.test.ts` (23 tests); `tests/core/definitions.test.ts`, `tests/react/Graph.test.tsx`, `tests/package/per-type-bundle.test.ts` extended
- `.changeset/xyz-graph.md`: patch, `Added:`
- `.gener8v/specifications/number-lines-and-coordinate-graphs.md`: `@spec Coverage` rows

## Verification Run

Run 2026-10-27 on branch `ticket/graph-library-nlc-004`, Node v24.1.0, pnpm 10.28.2.

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm generate` | 0 | `src/generated/*` regenerated, committed with this delivery |
| `pnpm lint` | 0 | — |
| `pnpm typecheck` | 0 | — |
| `pnpm test` (×3) | 0 | 57 files, 1,635 tests passed each run |
| `pnpm bench` | 0 | — |
| `pnpm build` | 0 | `dist/xyz-graph.js` built |
| `pnpm check:dist` | 0 | — |
| `pnpm check:deps` | 0 | — |
| `pnpm check:images` | 0 | — |
| `pnpm check:changesets` | 0 | — |
| `pnpm size` | 0 | `./xyz-graph` 21.15 kB of 25; `./core` 25.87 kB of 40; `./xy-graph` 21.71 kB; `./number-line` 20.05 kB |
| `pnpm publint` | 0 | — |
| `pnpm attw` | 0 | — |
| `pnpm audit`, `pnpm audit --prod` | 0 | No known vulnerabilities found |
| `gener8v-state.py state`, `lint` | 0 | 0 errors, 0 warnings |
| Mutation check: `npx vitest run --no-cache tests/core/xyz-graph.test.ts tests/layout/xyz-graph.test.ts` against five mutations (range check one-sided; rooms without cos 30°; no vertical guide line; meeting-point label not deduplicated; no default axis name) | — | each fails 2–5 tests; files restored |

## Acceptance Criteria Verification

- [x] `examples/xyz-graph.json` validates and renders identically through `<XyzGraph>` and `<Graph>` — `tests/react/Graph.test.tsx` "the x,y,z graph's accessible name …" (markup equal through both); `tests/core/xyz-graph.test.ts` "is registered, and validates the documented example"
- [x] All positions through `isometric()`, no projection math in the layout — `tests/layout/xyz-graph.test.ts` "projects only through isometric() …", "draws every axis end and tick within half a unit of isometric() of its scaled value …", "plots each point at isometric() …"
- [x] Ticks per each axis's `tickSpacing` or the default, on their axis within 0.5 — "draws every axis end and tick …", "uses a supplied tick spacing as given on each axis, independently", "ticks each axis at the default describe states …"
- [x] Axis labels supplied, else "x", "y", "z" — "labels each axis with its name by default …", "labels each axis with its supplied label instead, and a blank one with its name"
- [x] Points at the projection within 0.5, optional label and color — "plots each point at isometric() of its scaled (x, y, z) within half a unit, in its own color or the accent", "labels each point beside its marker …"
- [x] Guide lines dashed to (x, y, z₀) and on to the axes with `guideLines: true`; none by default, the default stated — "draws, with guideLines true, dashed lines …", "goes to the plane where the z-axis meets the others …", "draws none by default or when guideLines is false"; core "leaves the guide lines off unless guideLines is true, and says so in its definition"
- [x] A point outside any range reported as `outside_axis_range` at its JSON Pointer path — `tests/core/xyz-graph.test.ts` "points outside the ranges" (three tests) and "matches the invalid example to its one issue"
- [x] Text alternative states "three-dimensional coordinate graph", the three ranges and every point with labels — core "the text alternative" tests; React accessible-name test
- [x] Projection described as "isometric" in the definition's description and the published schema — core "describes its projection as isometric, in the definition and the published schema"
- [x] `./xyz-graph` in `package.json` exports and `.size-limit.json` — `pnpm size`, `check:dist`, publint, attw (all exit 0); per-type bundle tests

Carried hazards: caller-text limits (at-limit and over-limit cases in `tests/react/Graph.test.tsx`); per-type bundle exclusions (`tests/package/per-type-bundle.test.ts`); ±1e9 at the axis limits ("lays out an example at the axis limits …"); `0.1 * 3` labels ("labels a spacing worked out in floating point …"); no overlapping neighbouring default tick labels ("draws no two neighbouring default tick labels overlapping …"); core's page length pinned to `ISO_SCALE * AXIS_LENGTH`.

## Decisions Made

### DEL-001: Every axis drawn the same length

**Context:** The Scene is always 400 wide, the ranges of a 3D graph often differ (0..5 beside 0..100), and the specification asks for no equal units in 3D.
**Decision:** Each axis's whole range is drawn `AXIS_LENGTH` (170) drawing units long before projection, ≈138.8 on the page; the figure's box is a 240 × 278 hexagon. The text alternative says so when the spans differ.
**Rationale:** It always fits, keeps one fixed drawn length that `describe` and the layout share for the default spacing (TICKET-009), and keeps every scaled value within ±170, below any overflow in `isometric()` (GSS TICKET-001 SEC-002).
**Ticket Impact:** None on the Output; the plan approved it (Engineer — Thomas Eaves, 2026-10-27).

### DEL-002: Where the axes meet

**Context:** Three ranges may each include or exclude zero.
**Decision:** The axes meet at (clamp(0, x), clamp(0, y), clamp(0, z)) — the origin when every range includes 0 — and each runs its whole range through that point. Guide lines go down to the plane z = z₀, which is z = 0 whenever the z range includes it.
**Rationale:** The x,y graph's rule (an axis along the nearest end when zero is outside), extended by one axis.
**Ticket Impact:** Criterion 6's "(x, y, 0)" reads (x, y, z₀) for a z range without zero.

### DEL-003: The layout places the tick labels

**Context:** The Known Hazard asks every label to go through `placeLabel`; `drawAxis` does not.
**Decision:** Axes are drawn with `showTickLabels: false`, and each tick label is placed by `placeLabel` clear of every axis line and tick and the labels before it:
- x and y labels go straight below their tick, moved down to clear the slanted line, then above. They go above first where the z-axis runs below the meeting point.
- z labels go on the left, then the right. They go right first when the figure has more than 1 unit more room there.
- A label at the meeting point may also go in the open gap left or right of it.
- Each value is labeled once at the meeting point, so the origin's "0" is written once.
- A label with no clear candidate takes its first.
**Rationale:** Cross-axis collisions near the meeting point are the hazard. Labels straight below their tick keep neighbours `apart·cos 30°` apart across the page, which the default-spacing rooms then guarantee.
**Ticket Impact:** None.

### DEL-004: Default-spacing rooms for slanted and upright axes

**Context:** TICKET-009's rule needs a length and a per-label extent.
**Decision:** `xyzRooms`:
- x and y: `{length: AXIS_PAGE_LENGTH, extent: gap / cos 30°, textSize: 12 / cos 30°}`.
- z: `{length: AXIS_PAGE_LENGTH, extent: 12 × 1.2 + gap, textSize: 0}`.
- gap = 12 / 5 for all three.
- An axis with hidden tick labels gets no room.
**Rationale:** The rooms match how each axis's labels are placed. Probed defaults: 0..5 → 1, 0..10 → 2, −10..10 → 5, 0..100 → 20, 0..1 → 0.2, the same on all three axes.
**Ticket Impact:** None.

### DEL-005: Axis labels and guide-line style

**Decision:**
- Axis labels are wrapped to 120 wide, 2 lines, and kept 2 units clear of everything, held inside the side margins.
- x and y labels go beside the max end, raised a little, then further along the axis, then below or above the end.
- The z label goes above its top end, then higher to clear a tick label there, then right, then left.
- Guide lines are dashed "4 3" in the grid color and width, drawn under the axes; zero-length pieces are left out.
**Rationale:** The axis names sit where a reader looks for them, and the guide lines stay secondary to the figure.
**Ticket Impact:** None.

### DEL-006: One definition per shared term with the x,y graph

**Context:** `consistencyProblems` (`tests/core/definitions.test.ts`) requires a term of one name to have one description across types. The x,y graph described `xAxis` as the "horizontal x" and `yAxis` as the "vertical y" axis.
**Decision:** Both graphs describe them as "the coordinate graph's x" / "y" axis. `coordinates` (`x`, `y`) is exported from `xy-graph.ts` and reused; `z` is new.
**Rationale:** GSV-REQ-015 (one definition per term).
**Ticket Impact:** The x,y graph's published vocabulary and schema text changes slightly (no validation change). The shared `x` description still mentions "a segment end", which applies only to the x,y graph.

## Deviations from Plan

- **The x,y graph's `xAxis`/`yAxis` wording changed** (DEL-006). The plan did not list `src/core/definitions/xy-graph.ts`. It is a text change only.
- **The example's third point is (2, 5, 1), not the drafted (3, 4, 5).** The isometric view puts (3, 4, 5) exactly over (1, 2, 3), since it differs by equal steps on all three axes.
- **The tick-label placement got more candidates than planned** (DEL-003): x and y labels go above first when the z-axis runs below the meeting point, there are gap candidates at the meeting point, and labels clear the tick marks as well as the lines. A sweep showed the planned two candidates alone left more overlaps.
- **There is an extra timing test:** 1,000 labeled points at one spot with guide lines, about 0.6 s against a 1.5 s bound.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| NLC-REQ-001 | `src/core/definitions/xyz-graph.ts`:defineXyzGraphProperties, xyzGraph | `@spec NLC-REQ-001, …` |
| NLC-REQ-005 | `src/core/definitions/xyz-graph.ts`:xyzRooms | `@spec NLC-REQ-005, NLC-REQ-039` |
| NLC-REQ-010 | `src/core/definitions/xyz-graph.ts`:pointsInRange | `@spec NLC-REQ-010` |
| NLC-REQ-011 | `src/layout/xyz-graph.ts`:pointLabels | `@spec NLC-REQ-011, NLC-REQ-037` |
| NLC-REQ-012 | `src/core/definitions/xyz-graph.ts`:xyzGraph.describe | `@spec NLC-REQ-012, NLC-REQ-035, NLC-REQ-038, NLC-REQ-039` |
| NLC-REQ-034 | `src/core/definitions/xyz-graph.ts`:defineXyzGraphProperties, xyzGraph; `src/layout/xyz-graph.ts`:frameOf, axesOf, xyzGraphLayout; `src/react/graphs/XyzGraph.tsx`:XyzGraph | `@spec NLC-REQ-034, …` |
| NLC-REQ-035 | `src/core/definitions/xyz-graph.ts`:xyzGraph, describe; `src/layout/xyz-graph.ts`:frameOf, tickLabels, xyzGraphLayout | `@spec NLC-REQ-035, …` |
| NLC-REQ-036 | `src/layout/xyz-graph.ts`:axisLabels, xyzGraphLayout | `@spec NLC-REQ-036` |
| NLC-REQ-037 | `src/core/definitions/xyz-graph.ts`:defineXyzGraphProperties; `src/layout/xyz-graph.ts`:frameOf, pointLabels, xyzGraphLayout | `@spec NLC-REQ-037, …` |
| NLC-REQ-038 | `src/core/definitions/xyz-graph.ts`:defineXyzGraphProperties, describe; `src/layout/xyz-graph.ts`:guideSegments, xyzGraphLayout | `@spec NLC-REQ-038` |
| NLC-REQ-039 | `src/core/definitions/xyz-graph.ts`:defineXyzGraphProperties, xyzRooms, describe; `src/layout/xyz-graph.ts`:axesOf, tickLabels, xyzGraphLayout | `@spec NLC-REQ-039, …` |

The specification's `## @spec Coverage` table has the matching rows.

## Notes

- **Labels of different axes can still overlap.** Neighbouring tick labels on one axis never overlap (tested). Labels of two different axes can, where `placeLabel` finds no clear candidate and falls back to the first. That happens chiefly where the z-axis runs below the meeting point, or with very wide labels (±1e9). In a sweep of 8,000 range combinations, 1,863 had at least one cross-axis overlap; most are ranges with negative values on two or more axes. Spec OQ-005 allows overlapping labels in crowded cases. The reviews should decide whether to accept it or open a ticket (for example, leaving out a tick label that has no clear place).
- **The circle definition still leaks into every built per-type entry**, so "A circle" is not asserted absent from the built `./xyz-graph` (the known problem from the ticket's hazards).
- **TICKET-007 (`too_few_ticks`) is not delivered.** This ticket's tests do not mention that code; the three axes pick it up through `axisDomainChecks` when it lands.
- **NLC-NFR-001..004 for this type are measured by TICKET-005.**
- **Spec OQ-007 (segments on x,y,z graphs) stays open:** points only.

## Post-Review Amendments

None
