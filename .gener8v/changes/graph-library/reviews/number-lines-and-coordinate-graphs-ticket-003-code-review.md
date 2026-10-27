# TICKET-003: Deliver the x,y coordinate graph type — Code Review

## Summary

Reviewed the `xy-graph` delivery (commit a108175) against NLC TICKET-003, its Known Hazards, the specification and system design. The definition, layout, component, entry, examples and registration are complete and traceable, and every command in the Verification Run reproduces (except `pnpm size`, skipped by instruction). Two Issues were found, both in tick labelling on axes that are not the plain centered case, and one Observation. No Critical findings.

**Delivery Record:** `.gener8v/changes/graph-library/delivery/number-lines-and-coordinate-graphs-ticket-003-delivery.md`
**Files Reviewed:**
- `src/core/definitions/xy-graph.ts`
- `src/core/definitions/index.ts`
- `src/core/definitions/shared.ts`
- `src/core/definitions/number-line.ts`
- `src/layout/xy-graph.ts`
- `src/layout/registry.ts`
- `src/react/graphs/XyGraph.tsx`
- `src/entries/xy-graph.ts`
- `src/index.ts`
- `tsup.config.ts`
- `package.json`
- `.size-limit.json`
- `examples/xy-graph.json`
- `examples/invalid/xy-graph-outside-range.json`
- `examples/invalid/xy-graph-degenerate-segment.json`
- `tests/core/xy-graph.test.ts`
- `tests/layout/xy-graph.test.ts`
- `tests/react/Graph.test.tsx`
- `tests/package/per-type-bundle.test.ts`
- `tests/core/definitions.test.ts`

**Findings:** 3
**Critical:** 0 | **Issues:** 2 | **Observations:** 1

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| Example validates and renders identically through `<XyGraph>` and `<Graph>` | Yes | `tests/react/Graph.test.tsx:234-250`; `examples/xy-graph.json` |
| 1, 2, 4 quadrants for the three range pairs | Yes | `src/core/definitions/xy-graph.ts` `quadrantCount`; `tests/layout/xy-graph.test.ts:67` |
| Axis at y=0 / x=0 when included, else nearest edge; edge ticks true values | Partial | `src/layout/xy-graph.ts` `planeAxes`. Positions correct. A y-axis on the left edge (x range excludes 0, y range includes 0) has its `0` tick label blanked, so a true value is missing (CR-001) |
| Independent `tickSpacing`, TICKET-001 default when omitted | Yes | `xTicks`/`yTicks` in `xyGraphLayout`; `tests/layout/xy-graph.test.ts:124` |
| Grid at every tick of both axes and nowhere else; off by default, stated | Yes (as `showGrid`, DEL-001) | `xyGraphLayout` grid loop; `showGrid` description; `tests/layout/xy-graph.test.ts:157-180` |
| Points at `(xScale(x), yScale(y))`, segments join endpoints, within 0.5 | Yes | `xyGraphLayout`; `tests/layout/xy-graph.test.ts:185` |
| Optional `label` and `color` per point and segment, color per element | Yes | nested `sharedProperties.label/color`; `tests/layout/xy-graph.test.ts:209` |
| `outside_axis_range` at JSON Pointer path | Yes | `pointsInRange`, `segmentsInRange`; probe gave `/segments/1/to/y`, `/points/0/x` |
| `degenerate_segment` for equal endpoints | Yes | `segmentsHaveLength`; probe gave `/segments/0` (also for `-0`) |
| Equal units; x −10..10, y −2..2 wider than tall | Yes | `planeShape`, `planeAxes`; `tests/layout/xy-graph.test.ts:266`. Extreme ratios clamp per DEL-002 (see CR-002) |
| Text alternative states "coordinate graph", ranges, every point and segment with labels | Yes | `xyGraph.describe`; probes |
| No points or segments renders empty axes (and grid when on) | Yes | `tests/layout/xy-graph.test.ts:249`; probe |
| `./xy-graph` in `package.json` exports and `.size-limit.json` | Yes | `package.json`, `.size-limit.json`; build, `check:dist`, `publint`, `attw` pass |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| NLC-REQ-001 | xy parameters in the single definition | `src/core/definitions/xy-graph.ts`:defineXyGraphProperties, xyGraph | Yes |
| NLC-REQ-010 | Report points/endpoints out of range | `xy-graph.ts`:pointsInRange, segmentsInRange | Yes |
| NLC-REQ-012 | Text alternative: type, ranges, points | `xy-graph.ts`:xyGraph.describe | Yes |
| NLC-REQ-022 | Render from x and y ranges | `xy-graph.ts`:xyGraph; `src/layout/xy-graph.ts`:xyGraphLayout | Yes |
| NLC-REQ-023 | One, two or four quadrants | `xy-graph.ts`:quadrantCount; `layout/xy-graph.ts`:planeAxes | Yes |
| NLC-REQ-024 | Axis through origin when other range includes 0 | `layout/xy-graph.ts`:planeAxes | Yes |
| NLC-REQ-025 | Axis on nearest edge, true tick values | `layout/xy-graph.ts`:planeAxes, xyGraphLayout | Partial (CR-001) |
| NLC-REQ-026 | Grid at tick positions | `layout/xy-graph.ts`:xyGraphLayout | Yes |
| NLC-REQ-027 | Separate tick spacing per axis | `xy-graph.ts`:defineXyGraphProperties; layout | Yes |
| NLC-REQ-028 | Plot points | `layout/xy-graph.ts`:xyGraphLayout | Yes |
| NLC-REQ-029 | Draw segments | `layout/xy-graph.ts`:xyGraphLayout | Yes |
| NLC-REQ-030 | Segment label and color | nested shared `label`/`color`; layout | Yes |
| NLC-REQ-031 | Axis labels | `layout/xy-graph.ts` (`axisLabelLines`, `drawLeftAxisLabel`, `drawBottomAxisLabel`); describe | Yes |
| NLC-REQ-032 | Equal units by default | `xy-graph.ts`:planeShape; `layout/xy-graph.ts`:planeAxes | Yes (clamp is DEL-002; legibility at the clamp is CR-002) |
| NLC-REQ-033 | Report degenerate segment | `xy-graph.ts`:segmentsHaveLength | Yes |

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/TC-001 | Height from ranges, never the container | Yes | `planeAxes` uses only ranges and `maxWidth` from text estimates |
| prd/TC-002 | `fmt()` on every coordinate | Yes | all `line`, text and marker numbers pass `fmt`; `drawAxis` and `drawMarker` do too |
| prd/TC-011 | Axis labels wrap through the text kit | Yes | `axisLabelLines`, `drawLeftAxisLabel`, `drawBottomAxisLabel`; point/segment labels through `textBlock` |
| Hazard: no `equalUnits` property, OQ-004 recorded | Respected | Yes | DEL-002; no such term in `defineXyGraphProperties` |
| Hazard: segments only, no break symbol | Respected | Yes | |
| Hazard: no corner "0" on an edge axis | Respected | Partial | No corner 0 drawn, but see CR-001 for a true value removed |
| Hazard: `defineProperties`, no shared top-level options listed, nested label/color | Respected | Yes | `defineXyGraphProperties` |
| Hazard: `maxItems`, `maxLength` on strings | Respected | Yes | `XY_ELEMENT_LIMIT` on both arrays; limits in type description; shared label/color carry text limits |
| Hazard: domain checks (`inputs`, `createIssue`, no tick enumeration) | Respected | Yes | checks are O(n), use `createIssue`, declare inputs; axis checks via `axisDomainChecks` |
| Hazard: provenance, `titleBlock`, blank title absent, `stateMeasurement`, `sourceOf` | Respected | Yes | `describe`, layout; blank title and blank label probe |
| Hazard: no spread of caller-sized arrays; labels through `wrap`/`textBlock` | Respected | Yes | loops used throughout |
| Hazard: caller text limits tests (at-limit, one over-limit per text term) | Respected | Yes | `tests/react/Graph.test.tsx:546, 581-585` |
| Hazard: per-type bundle exclusions, `@__PURE__` factory | Respected | Yes | `defineXyGraph`; `tests/package/per-type-bundle.test.ts` |
| Hazard: DS-001 `tickSpacing: 0.1 * 3` test; no re-rounding in layout | Respected | Yes | `tests/layout/xy-graph.test.ts:144`; probe labels `0|0.3|0.6|0.9|1.2` |
| Hazard: DS-002 register `axisDomainChecks`, add no `too_few_ticks` | Respected | Yes | |
| Hazard: example rich, `pnpm generate` committed | Respected | Yes | `examples/xy-graph.json`; `src/generated/*` in commit |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-001 | Per-type entry, tree-shakeable | Yes | `src/entries/xy-graph.ts`, pure factories, bundle tests |
| AD-002 | Definition plus layout to Scene | Yes | `xyGraph`, `xyGraphLayout` registered |
| AD-005 | JSON Pointer issue paths | Yes | `pointer(...)` paths |
| AD-007 | 400-unit width, height from aspect ratio, `fmt()` | Yes | `SCENE_WIDTH`, `planeAxes`, `fmt` |
| AD-010, AD-011 | Layout and text kit use | Yes | kit functions used, no private `measure` |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| NLC-REQ-001 | `@spec NLC-REQ-001` | `xy-graph.ts`:defineXyGraphProperties, xyGraph | Yes |
| NLC-REQ-010 | `@spec NLC-REQ-010` | `xy-graph.ts`:pointsInRange, segmentsInRange | Yes |
| NLC-REQ-012 | `@spec NLC-REQ-012` | `xy-graph.ts`:describe | Yes |
| NLC-REQ-022 | `@spec NLC-REQ-022` | `xyGraph`, `xyGraphLayout`, `XyGraph.tsx`:XyGraph | Yes |
| NLC-REQ-023 | `@spec NLC-REQ-023` | `quadrantCount`, `planeAxes` | Yes |
| NLC-REQ-024, 025 | `@spec NLC-REQ-024, NLC-REQ-025` | `planeAxes`, `xyGraphLayout` | Yes |
| NLC-REQ-026..030 | `@spec …` | `defineXyGraphProperties`, `xyGraphLayout` | Yes |
| NLC-REQ-031 | `@spec NLC-REQ-031` | `describe`, `xyGraphLayout` | Yes |
| NLC-REQ-032 | `@spec NLC-REQ-032` | `planeShape`, `planeAxes`, `describe` | Yes |
| NLC-REQ-033 | `@spec NLC-REQ-033` | `segmentsHaveLength` | Yes |

**Coverage:** 15 of 15 requirements annotated
**Missing:** none
**Specification table:** Yes — `.gener8v/specifications/number-lines-and-coordinate-graphs.md` lines 244-258 list the same locations.

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm lint` | 0 | Yes |
| `pnpm typecheck` | 0 | Yes |
| `vitest run --no-cache` (`pnpm test`) | 0 (55 files, 1,553 tests) | Yes |
| `pnpm build` | 0 | Yes |
| `pnpm check:dist` | 0 | Yes |
| `pnpm check:deps` | 0 | Yes |
| `pnpm check:images` | 0 | Yes |
| `pnpm publint` | 0 | Yes |
| `pnpm attw` | 0 | Yes |
| `pnpm size`, `pnpm generate`, `pnpm bench`, `pnpm audit`, mutation checks | not re-run (skipped by instruction or not repeatable) | Not verified; the record's figures (`./core` 24.55 of 25 kB) are taken as stated |

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | `showGrid` matches every other flag and the fixture; approved with the plan |
| DEL-002 | Reasonable, with a gap | Shrink-then-clamp is documented and not silent, and OQ-004 is recorded. At the 120-unit narrowest width tick labels collide (CR-002) |
| DEL-003 | Reasonable | One `points` term keeps the vocabulary consistent. Touches the number line outside the Output, approved. The published term no longer states a limit; each type description and `maxItems` still do |
| DEL-004 | Reasonable | Optional third argument, two-argument call still works |
| DEL-005 | Questionable | Origin-once rule is sound for the centered case but is keyed on `xAxisAt === 0` alone, which blanks a true value on an edge y-axis (CR-001) |
| DEL-006 | Reasonable | Placement is bounded and uses the kit |
| DEL-007 | Reasonable | Limits pinned by a test; large text alternative raised for security review |
| DEL-008 | Reasonable | Extra statements help the reader |

## Findings

### CR-001: A true `0` tick label is blanked on a y-axis drawn on the left or right edge

**Severity:** Issue
**Location:** `src/layout/xy-graph.ts` (`yZeroBlank`, `yLabels`); `tests/layout/xy-graph.test.ts:93-115`
**Traces To:** Acceptance criterion 3 (ticks on an edge axis are labeled with their true values); NLC-REQ-025; Known Hazard "an edge axis must not imply the origin: label its ticks with true values"; DEL-005
**Description:** `yZeroBlank = shape.xAxisAt === 0` blanks the y-axis `0` whenever the x-axis crosses at y = 0, on the assumption that the y-axis is at x = 0 and the x-axis labels the origin. When the x range excludes 0 (for example x 5..10, y −5..5) the y-axis is on the left edge at x = 5 and y = 0 is a true tick on it, but the x-axis labels x = 5 there, not the origin. Probe output for that graph shows the y labels `-5|-4|-3|-2|-1||1|2|3|4|5`: the `0` is missing. The same blanking happens when the x-axis tick labels are hidden (`xAxis.showTickLabels: false`, x −5..5, y −5..5): the y `0` is blanked and nothing labels the origin. The tests cover the corner-0 case but not this one.
**Impact:** An edge y-axis, which is the case the criterion and hazard single out for true values, loses a label, so a learner sees a gap at y = 0. With hidden x labels the origin has no label at all.
**Recommendation:** Blank the y `0` only when the y-axis is at x = 0 (`shape.yAxisAt === 0`) and the x-axis shows its tick labels. Add layout tests for x 5..10 with y −5..5, and for hidden x labels.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-27). The origin's single "0" is now decided only where the axes cross at (0, 0) (`atOrigin`): an edge axis labels its 0 as a true value, on the y-axis (x 5..10, y −5..5 now shows `…−1, 0, 1…`) and, found while fixing, on the x-axis too (y −10..−2 puts the x-axis on the top edge, and its 0 was also blank). With the x tick labels hidden, the y-axis labels the origin, or the below-left "0" is written for it. Tests: "labels a 0 on an edge axis as the true value it is…" and "labels the origin once when only the y-axis shows its tick labels" in `tests/layout/xy-graph.test.ts`; "hides an axis's tick labels…" now expects the origin's "0". Reverting the blanking rule fails 2 tests; reverting the write condition fails 1.

---

### CR-002: Tall ranges narrow the plot to 120 units and tick labels collide; recorded as a Note but not ticketed

**Severity:** Issue
**Location:** `src/layout/xy-graph.ts` (`MIN_PLOT_WIDTH`, `planeAxes`); delivery record Notes "Crowded tick labels on narrow or flat plots"
**Traces To:** Known Hazard on extreme aspect ratios ("clamp so labels remain legible"); NLC-REQ-032; NLC-REQ-004 (default spacing)
**Description:** The clamp keeps height legible but the width limit does not. For x −2..2 and y −100..100 the plot is 120 units wide with 9 x ticks (spacing 0.5), about 15 units apart, narrower than the labels. The delivery's own Note gives a case that prints `-2-1.5-1-0.5`. The default spacing does not know the drawn length. The hazard's purpose, legible labels at extreme ratios, is not met on the narrowed side, and the fix was left without a deferral target.
**Impact:** Valid, ordinary tall graphs (a small x range against a large y range) draw unreadable x tick labels, which is a correctness problem in a teaching figure.
**Recommendation:** Make the default spacing aware of the drawn length as `fitHorizontalValueAxis` does for bar graphs, or thin the x tick labels that would overlap; or defer to a named ticket and append a Known Hazard to it.
**Status:** Deferred → TICKET-009
**Resolution:** Deferred to a new ticket (Engineer — Thomas Eaves, 2026-10-27): graph-library/number-lines-and-coordinate-graphs/TICKET-009, a default tick spacing the drawn axis has room for. A fix changes the default-spacing rule `describe` and the checks share, so it gets its own delivery and reviews. TICKET-004 now depends on TICKET-009 and carries a Known Hazard. Also covers quality review QR-004.

---

### CR-003: The origin `0` is drawn even where the axis has no tick at 0

**Severity:** Observation
**Location:** `src/layout/xy-graph.ts` (`xZeroBlank` block, "0" text node)
**Traces To:** DEL-005; NLC-REQ-024
**Description:** With `tickSpacing: 2` on both axes of a −5..5 graph, no tick falls at 0, yet the layout still writes a `0` below-left of the origin (probe labels `-4|-2||2|4|-4|-2||2|4|0`). The label marks the origin rather than a tick, so it is defensible, but it is a text node with no tick and is not covered by a test.
**Impact:** Minor: a label at a position the spacing otherwise does not mark.
**Recommendation:** Either keep it and add a test and a line in DEL-005, or draw it only when 0 is a tick of an axis.
**Status:** Dismissed
**Resolution:** Dismissed (Engineer — Thomas Eaves, 2026-10-27). Ticks are anchored at zero, so 0 is a tick whenever the range holds it: `niceTicks(-5, 5, 2).ticks` is `[-4, -2, 0, 2, 4]`. The probe's empty entry is the axis's blanked 0, and the written "0" labels that tick at the origin.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Fixed | Origin "0" decided only at (0, 0); edge axes label their true 0 on both axes; y-axis labels the origin when x labels are hidden; tests added | `src/layout/xy-graph.ts`, `tests/layout/xy-graph.test.ts` |
| CR-002 | Deferred → TICKET-009 | New ticket; TICKET-004 depends on it with a Known Hazard | `tickets/number-lines-and-coordinate-graphs/TICKET-009.md`, `TICKET-004.md`, `backlog.md` |
| CR-003 | Dismissed | 0 is always a tick when the range holds it | — |

## Verdict

**Result:** Approved with Notes
**Unresolved Findings:** 0 open (CR-001 fixed, CR-002 deferred to TICKET-009, CR-003 dismissed)
**Notes:** Provisional. Resolve CR-001 (a small, local fix with tests) and decide CR-002 (fix or defer to a named ticket); after that the delivery would read as Approved with Notes. The `./core` bundle is at 24.55 of 25 kB per the record, which needs a decision before TICKET-004; this is a planning matter, not a finding here. `pnpm size` was not re-run.
