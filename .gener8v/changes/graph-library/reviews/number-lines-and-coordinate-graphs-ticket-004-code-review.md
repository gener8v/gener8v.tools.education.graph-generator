# TICKET-004: Deliver the x,y,z coordinate graph type — Code Review

## Summary

Reviewed the `xyz-graph` definition, layout, React component, entry and registration against the ticket, NLC-REQ-001/010/012/034..039, prd/TC-010, prd/TC-002 and AD-009/AD-010. Every acceptance criterion is satisfied and the Verification Run reproduces (lint, typecheck and all 1,635 tests pass). Two findings: the layout still overlaps tick labels of different axes on ordinary ranges (an Issue, which the record itself discloses), and one Observation on the x,y graph wording change. Findings: 2.

**Delivery Record:** `.gener8v/changes/graph-library/delivery/number-lines-and-coordinate-graphs-ticket-004-delivery.md`
**Files Reviewed:**
- `src/core/definitions/xyz-graph.ts`
- `src/core/definitions/xy-graph.ts`
- `src/layout/xyz-graph.ts`
- `src/react/graphs/XyzGraph.tsx`
- `src/entries/xyz-graph.ts`
- `examples/xyz-graph.json`
- `.gener8v/specifications/number-lines-and-coordinate-graphs.md` (`@spec Coverage`)

**Findings:** 2
**Critical:** 0 | **Issues:** 1 | **Observations:** 1

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| Example validates and renders identically through `<XyzGraph>` and `<Graph>` | Yes | `examples/xyz-graph.json`; `tests/react/Graph.test.tsx` (markup equal); passes in re-run |
| All positions via `isometric()`, no projection math in the layout | Yes | `src/layout/xyz-graph.ts`:frameOf is the only projection call (`isometric(...scaled(...))`); the layout does only scaling and translation |
| Ticks per `tickSpacing` or the default, on their axis within 0.5 | Yes | `src/layout/xyz-graph.ts`:axesOf (`niceTicks` with `xyzRooms`); layout tests on tick positions |
| Axis labels supplied, else "x", "y", "z" | Yes | `src/layout/xyz-graph.ts`:axisLabels (`text === "" ? name : text`) |
| Points within 0.5 of the projection, optional label and color | Yes | `src/layout/xyz-graph.ts`:xyzGraphLayout markers via `frame.pageOf`; `pointLabels` |
| `guideLines: true` draws dashed lines to the plane and on to the axes; none by default, default stated | Yes | `src/layout/xyz-graph.ts`:guideSegments, `GUIDE_DASH`; `guideLines` description "off unless true". The plane is z = z0 (the meeting value), per DEL-002, equal to (x, y, 0) whenever the z range includes 0 |
| A point outside any range reported as `outside_axis_range` at its JSON Pointer path | Yes | `src/core/definitions/xyz-graph.ts`:pointsInRange (`/points/i/x|y|z`) |
| Text alternative states "three-dimensional coordinate graph", the ranges and every point with labels | Yes | `src/core/definitions/xyz-graph.ts`:xyzGraph.describe |
| Projection described as "isometric" in the definition description | Yes | `src/core/definitions/xyz-graph.ts`:defineXyzGraph `description` |
| `./xyz-graph` in `package.json` exports and `.size-limit.json` | Yes | Registration files in the delivery commit; `src/entries/xyz-graph.ts` present; size result taken from the record |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| NLC-REQ-001 | x,y,z parameters in the single definition | `src/core/definitions/xyz-graph.ts`:defineXyzGraphProperties, xyzGraph | Yes |
| NLC-REQ-010 | Report points outside axis range | `src/core/definitions/xyz-graph.ts`:pointsInRange | Yes |
| NLC-REQ-012 | Text alternative: type, ranges, points | `src/core/definitions/xyz-graph.ts`:xyzGraph.describe | Yes |
| NLC-REQ-034 | Render from three axis ranges | `src/layout/xyz-graph.ts`:frameOf, axesOf | Yes |
| NLC-REQ-035 | One documented fixed projection | `src/layout/xyz-graph.ts`:frameOf; definition description | Yes |
| NLC-REQ-036 | Label each axis | `src/layout/xyz-graph.ts`:axisLabels | Yes |
| NLC-REQ-037 | Plot points at (x, y, z) | `src/layout/xyz-graph.ts`:frameOf, pointLabels | Yes |
| NLC-REQ-038 | Guide lines option | `src/layout/xyz-graph.ts`:guideSegments | Yes |
| NLC-REQ-039 | Tick spacing per axis | `src/layout/xyz-graph.ts`:axesOf; `src/core/definitions/xyz-graph.ts`:xyzRooms | Yes |
| NLC-NFR-001..004 | Accuracy, SSR, accessible name, speed | Measured by TICKET-005 per the record; not in this ticket's Requirements Covered | N/A |

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/TC-010 | 3D in 2D SVG, fixed projection | Yes | Only `isometric()` is used; no second projection |
| prd/TC-002 | `fmt()` on projected coordinates | Yes | Scene nodes are built via `drawAxis`, `drawLine`, `textLines`, `drawMarker` and `fmt(height)`; ±1e9 test passes (probe: no `internal_error` at the axis limits with guide lines) |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-009 | True isometric, shared with cubes and cylinders | Yes | `isometric` imported from the GSS kit; values scaled to ≤170 first |
| AD-010 | Route labels through `placeLabel` | Partial | Tick, axis and point labels all use `placeLabel`/`placeElementLabel`, but a label with no clear candidate falls back to its first candidate and overlaps (CR-001) |
| AD-007 | `fmt()` on numbers | Yes | As above |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| NLC-REQ-001 | `@spec NLC-REQ-001` | `src/core/definitions/xyz-graph.ts`:defineXyzGraphProperties, xyzGraph | Yes |
| NLC-REQ-010 | `@spec NLC-REQ-010` | `src/core/definitions/xyz-graph.ts`:pointsInRange | Yes |
| NLC-REQ-012 | `@spec NLC-REQ-012` | `src/core/definitions/xyz-graph.ts`:describe | Yes |
| NLC-REQ-034 | `@spec NLC-REQ-034` | definition, `src/layout/xyz-graph.ts`:frameOf, axesOf, xyzGraphLayout; `src/react/graphs/XyzGraph.tsx` | Yes |
| NLC-REQ-035 | `@spec NLC-REQ-035` | `src/layout/xyz-graph.ts`:frameOf, tickLabels | Yes |
| NLC-REQ-036 | `@spec NLC-REQ-036` | `src/layout/xyz-graph.ts`:axisLabels | Yes |
| NLC-REQ-037 | `@spec NLC-REQ-037` | `src/layout/xyz-graph.ts`:frameOf, pointLabels | Yes |
| NLC-REQ-038 | `@spec NLC-REQ-038` | `src/layout/xyz-graph.ts`:guideSegments | Yes |
| NLC-REQ-039 | `@spec NLC-REQ-039` | `src/layout/xyz-graph.ts`:axesOf; definition xyzRooms | Yes |

**Coverage:** 9 of 9 requirements annotated
**Missing:** None
**Specification table:** Yes — rows at lines 263..272 of the specification list the same locations (including NLC-REQ-005 for `xyzRooms`)

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm lint` | 0 | Yes |
| `pnpm typecheck` | 0 | Yes |
| `pnpm test` (`npx vitest run --no-cache`, one run) | 0 — 57 files, 1,635 tests | Yes |
| `pnpm generate`, `pnpm size`, `pnpm build` and the other commands | Not re-run (skipped by instruction; the record holds their results) | Not re-verified |

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | Equal drawn length keeps every value within ±170, so the overflow hazard cannot occur; the text alternative says units differ. The plan was approved by the Engineer |
| DEL-002 | Reasonable | Mirrors the x,y graph; the criterion's "(x, y, 0)" reads z0 for a z range without zero, which is stated |
| DEL-003 | Questionable | Placing labels in the layout is justified, but the fallback to the first candidate leaves cross-axis overlaps (CR-001) |
| DEL-004 | Reasonable | One rule shared by `describe` and layout (`xyzRooms`), as TICKET-009 asks |
| DEL-005 | Reasonable | Labels are wrapped through `textBlock`, caps respected |
| DEL-006 | Reasonable | Satisfies GSV-REQ-015, but see CR-002 |

## Findings

### CR-001: Tick labels of different axes still overlap on ordinary ranges

**Severity:** Issue
**Location:** `src/layout/xyz-graph.ts`:tickLabels (fallback `?? { x: held[0]!.x, ... }`)
**Traces To:** AD-010; ticket Known Hazard "Isometric axes can make tick labels ... collide near the origin"; NLC-REQ-004
**Description:** When `placeLabel` finds no clear candidate the label takes its first candidate, so it overlaps another label or an axis. The record's own sweep found a cross-axis overlap in 1,863 of 8,000 range combinations. A reviewer probe with all three axes sharing one range found overlapping text at [-5, 0] and [-3, 8] (one pair each) and none at 0..5, 0..10, -5..5, -10..10 or 1..10. OQ-005 tolerates overlap only for "very many labeled points" (Edge Cases), not for the tick labels of a small figure. The ticket named this collision as the hazard.
**Impact:** A curriculum author using a range that includes negative values on one or more axes can get an illegible tick label with no warning, in an educational figure whose text alternative claims ticks are labeled.
**Recommendation:** Where no candidate is clear, leave that tick label out and have `describe` say which ticks are unlabeled, or add further candidates (for example, farther along the tick's normal). Alternatively, record the acceptance as a Product Owner decision on OQ-005 and open a ticket. Add a test over a sweep of ordinary ranges.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-28, the recommended option). `src/layout/xyz-graph.ts` changes three things:
- **More candidates.** `tickLabels` tries each side one step farther out: a row for an x or y label, a gap for a z label.
- **No fallback.** A tick label with no clear place is left out; its tick is still drawn.
- **Names first.** The axis names are placed before the tick labels, so they are always drawn and tick labels give way to them. `axisLabels` also tries each candidate a row higher and a row lower, for two axes whose ends meet.

A sweep of 8,000 range combinations went from 2,242 graphs with overlapping text to 0. About 1.7% of tick labels are left out, chiefly at the meeting point; among 512 graphs on common curriculum ranges, 6 lose one label each. The new test in `tests/layout/xyz-graph.test.ts` ("draws no text over another, across axes too …") checks 512 graphs for no overlapping text and that every axis keeps its name. It also checks that more than 95% of ticks are labeled (97.4% measured). Restoring the fallback fails 2 tests, and placing the names after the tick labels fails 1.

---

### CR-002: The x,y graph's published wording changed outside the ticket's Output

**Severity:** Observation
**Location:** `src/core/definitions/xy-graph.ts` (`xAxis`, `yAxis` descriptions; `coordinates` export)
**Traces To:** GSV-REQ-015 (one definition per term); ticket Output (does not list `xy-graph.ts`)
**Description:** To keep one description per shared term, the delivery reworded the x,y graph's `xAxis` and `yAxis` descriptions to "coordinate graph's x/y". The record discloses this (DEL-006). The shared `x` description still mentions "a segment end", which does not apply to the x,y,z graph (OQ-007 keeps segments off it), so the published x,y,z schema text mentions a feature it lacks.
**Impact:** Minor: the generated vocabulary for `xyz-graph` `points[].x` refers to segments. No validation effect.
**Recommendation:** Reword the shared `x` description so it does not name a segment end, or note the limitation in the x,y,z `points` description.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-28). The shared `x` and `y` descriptions in `src/core/definitions/xy-graph.ts` now read "the x coordinate of a plotted point (or, on an x,y graph, of a segment's end)". `pnpm generate` refreshed the schema, tool schema, types and vocabulary.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Fixed | Further candidates; an unplaceable tick label left out; axis names placed first; sweep test | `src/layout/xyz-graph.ts`, `tests/layout/xyz-graph.test.ts` |
| CR-002 | Fixed | Shared `x`/`y` text no longer names a segment end for every type; regenerated | `src/core/definitions/xy-graph.ts`, `src/generated/*` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (0 Critical, 0 Issue, 0 Observation)
**Notes:** Resolved in the main session, 2026-10-28. Re-verified after the fixes:
- Exit 0: `pnpm generate`, lint, typecheck, bench, build, `check:dist`, `check:deps`, `check:images`, `check:changesets`, size, publint, attw and both audits.
- `pnpm test`: the first of four runs failed one existing timing test, `tests/layout/kit/text.test.ts` "stops early, so caller-sized text costs little" (1,009 ms against a 1,000 ms bound). That test is unrelated to this change. The next three runs passed all 1,636 tests.
- Sizes: `./xyz-graph` 21.27 kB of 25; `./core` 25.9 kB of 40.
