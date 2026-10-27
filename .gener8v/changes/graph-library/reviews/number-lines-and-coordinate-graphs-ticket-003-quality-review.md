# TICKET-003: Deliver the x,y coordinate graph type — Quality Review

## Summary

Reviewed the x,y coordinate graph (definition, layout, component, entry, examples and tests) against the number line and ruler patterns. The code is well organised, thoroughly documented and heavily tested, and every command run passed. The findings are maintainability concerns: one oversized layout function, label-placement logic duplicated from the number line, and a few small readability points. Provisional verdict: Approved with Notes. 6 findings: 0 Critical, 4 Concerns, 2 Suggestions.

**Files Reviewed:**
- `src/core/definitions/xy-graph.ts`
- `src/core/definitions/index.ts`
- `src/core/definitions/shared.ts` (`POINTS_DESCRIPTION`)
- `src/core/definitions/number-line.ts` (`points` term)
- `src/layout/xy-graph.ts`
- `src/layout/registry.ts`
- `src/react/graphs/XyGraph.tsx`
- `src/entries/xy-graph.ts`
- `src/index.ts`, `tsup.config.ts`, `package.json`, `.size-limit.json`
- `examples/xy-graph.json`, `examples/invalid/xy-graph-outside-range.json`, `examples/invalid/xy-graph-degenerate-segment.json`
- `tests/core/xy-graph.test.ts`, `tests/layout/xy-graph.test.ts`, `tests/react/Graph.test.tsx`, `tests/package/per-type-bundle.test.ts`, `tests/core/definitions.test.ts`
- Compared with: `src/layout/number-line.ts`, `src/core/definitions/number-line.ts`, the ruler layout and definition

**Findings:** 6
**Critical:** 0 | **Concerns:** 4 | **Suggestions:** 2

## Quality Assessment

### Code Organization

**Rating:** Adequate
**Notes:** Separation is good: the pure rules (`planeShape`, `quadrantCount`, `PLANE_*_RATIO`) live in core, shared by `describe` and the layout, so the text alternative and the drawing cannot disagree. The definition is a side-effect-free factory like its neighbours, checks are small and named, and registration follows the ruler pattern. The weak point is `src/layout/xy-graph.ts`: `xyGraphLayout` is one function of about 165 lines (QR-001), and it repeats the number line's label code (QR-002).

### Readability

**Rating:** Adequate
**Notes:** Names are clear and every constant and exported function carries a doc comment that states the why and the requirement. Weaknesses are limited: an inaccurate `clamp` comment, `shape`/`plane` as two names for two `planeAxes` calls, and unexplained numeric factors in the origin-label clearance test (QR-003, QR-006).

### Error Handling

**Rating:** Strong
**Notes:** Invalid input is reported as issues, not thrown: `outside_axis_range` at the exact JSON Pointer, `degenerate_segment`, and a check that does not run against a range the axis checks refuse. Probes (range 0..1e-7, ±1e9 against ±5, negative-only ranges, 200:1 aspect) produced finite output with no NaN or Infinity in the Scene. The layout has no throw path of its own, which suits a pure function whose input is already validated; the number line's fail-closed `RangeError` has no counterpart here because nothing can be undrawable after validation.

### Test Coverage

**Rating:** Strong
**Notes:** Executed here: `pnpm lint` exit 0; `pnpm typecheck` exit 0; `npx vitest run --no-cache` exit 0, 55 files and 1,553 tests passed (matches the delivery record). `pnpm size` and `pnpm generate` were not run, by instruction. Tests cover quadrants, edge axes and true-valued edge ticks, origin labeling, per-axis spacing, the grid on and off, positions within 0.5 units, per-element color, equal units and both clamps, empty graph, text-alternative content, bounds over generated graphs, and per-term over-limit cases. Layout tests assert on Scene data, not markup, and have behavioural names. The delivery record also lists 11 mutation checks. Gap: the crowded tick labels on narrow plots are known and untested (QR-004).

### Observability & Operability

**Rating:** Adequate
**Notes:** A pure rendering library with no logging or metrics anywhere in the surrounding code, so none is expected. Failures surface as typed issues carrying a path and the range, which are attributable and actionable. The one operational signal is that a clamped aspect ratio is stated in the text alternative ("To fit, one y unit is drawn …") instead of changing units silently. Nothing to add.

## Findings

### QR-001: `xyGraphLayout` is a single 165-line function with several jobs

**Category:** Maintainability
**Severity:** Concern
**Location:** `src/layout/xy-graph.ts:148` (`xyGraphLayout`, lines 148-314)
**Description:** One function sizes the plot (two `planeAxes` calls), computes the room beside and above it, draws the grid, draws both axes, decides and draws the origin "0", builds the obstacle list, builds two kinds of label candidates, places them, and draws both axis labels. About 20 local values are shared across those phases. The number line's equivalent is about 110 lines and the ruler's is smaller.
**Impact:** A change to one phase, such as label candidates, means reading all the others to see what it captures. The x,y,z graph (TICKET-004) will want the same phases and cannot reuse any of them.
**Recommendation:** Extract by phase, passing a small plot-geometry object (`plotLeft`, `plotRight`, `plotTop`, `plotBottom`, `xOf`, `yOf`): `plotRoom(...)` for the margins, `originLabel(...)` for the origin "0" and its clearance test, and `placeLabels(...)` for the segment and point candidates. Behaviour and tests need not change.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-27). `xyGraphLayout` (171 lines) now orchestrates phases (54 lines): `plotRoom` (margins, plane size, scales; returns a `Plot` with `left`, `right`, `top`, `bottom`, `originX`, `originY`, `xOf`, `yOf`), `zeroBlanks`, `originLabelFits` and `originLabel`, `gridLines`, `figures` (segments, markers and obstacles) and `elementLabels`. Behaviour unchanged: 272 rendered Scenes (every example, 239 x,y graphs, 23 number lines, 2 bar graphs, a ruler) are byte-identical before and after.

---

### QR-002: Label wrapping, candidate placement and constants duplicated from the number line

**Category:** DRY
**Severity:** Concern
**Location:** `src/layout/xy-graph.ts:33-43,251-256,291-296`; `src/layout/number-line.ts:33-48,147-161,191-193`
**Description:** `LABEL_MAX_WIDTH` (120), `LABEL_MAX_LINES` (2, exported from both files with the same comment), `LABEL_ROWS` and `GAP` are redefined; the "clean, `textBlock`, `placeLabel` with first-candidate fallback, push box to obstacles, `textLines`" sequence is written twice; and the local `line` helper repeats the number line's `segment` with a different stroke width. This is the same text rule (GSS TICKET-002 SEC-001) held in two places that must stay equal.
**Impact:** Changing the label cut or width in one layout leaves the other behind with no test that links them. The ruler and the x,y,z graph will copy it a third time. This is duplicated logic, not coincidental similarity: the rule is the same one.
**Recommendation:** Move the shared constants and a `placeElementLabel(text, candidates, obstacles)` helper (clean, size, place, fall back to the first candidate, return box and lines) into `src/layout/kit/labels.ts`, and have both layouts call it. Candidate generation stays in each layout, since it differs by geometry.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-27). `src/layout/kit/labels.ts` has `ELEMENT_LABEL_MAX_WIDTH` (120), `ELEMENT_LABEL_MAX_LINES` (2) and `placeElementLabel(text, candidates, obstacles)` (clean, `textBlock`, `placeLabel` with first-candidate fallback, push the box), used by both the number line and the x,y graph; each keeps its own candidates. `LABEL_ROWS` (4 and 2) and `GAP` (each layout's general spacing) differ and stay local. The x,y graph's `line` and the number line's `segment` became the kit's `drawLine` (exported from `kit/axis.ts`). Both layouts re-export the cut as `LABEL_MAX_LINES`. Four tests for `placeElementLabel` in `tests/layout/kit/labels.test.ts`.

---

### QR-003: Inaccurate comment and unclear names in `planeAxes` and the layout

**Category:** Readability
**Severity:** Suggestion
**Location:** `src/layout/xy-graph.ts:65-66,81-85,157,174`
**Description:** (a) The `clamp` doc reads "0 for a range that includes it, else its nearest end", but `clamp` is a general helper; that describes only its call at lines 89-90 and misleads a reader of line 249. (b) `planeAxes` builds `Axis[]` objects only to pass them to `planeShape`, destructures them as `[xAxis, yAxis]` and then needs `xAxis!`/`yAxis!` non-null assertions three times. (c) The layout calls `planeAxes` twice and names the results `shape` and `plane`, which reads as two different things.
**Impact:** Small, but the comment is wrong and the assertions are noise in the one function that carries the axis-position rules.
**Recommendation:** Reword the `clamp` comment to "`value` held to `[min, max]`"; build the two axes as separate `const`s, which removes the `!`s; name the first result `axes` (positions only) and the second `plane` (sized), or compute positions once and size once.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-27). `clamp` reads "`value` held to `[min, max]`"; `planeAxes` builds `xAxis` and `yAxis` as separate consts with no `!`; the positions-only result is `axes`, the sized one `plane` (from `plotRoom`).

---

### QR-004: Tick labels run together on narrow or flat plots; a known defect with no ticket or test

**Category:** Maintainability
**Severity:** Concern
**Location:** `src/layout/xy-graph.ts:150-151` and `src/core/value-scale.ts` (`axisSpacing`); delivery record Notes
**Description:** The delivery record states that the default spacing (7 to 20 ticks) ignores the drawn length, so x −2..2 on a 120-unit plot draws "-2-1.5-1-0.5" with the labels touching. I did not reproduce the exact string; the layout confirms it by construction: `xTicks` is computed from the range alone and the plot can narrow to `MIN_PLOT_WIDTH` (120). The origin-"0" logic already measures label clearance (`clearOfX`), so the layout has the means to detect it. No test pins the behaviour, and the record leaves the fix unscheduled.
**Impact:** A tall plot, a common one for function-style graphs, can come out with unreadable tick labels. This is the output a teacher sees.
**Recommendation:** Give it a named ticket (use the bar graph's `fitHorizontalValueAxis` approach) or hide alternate labels when neighbours would touch; add a layout test that fails when adjacent tick-label boxes overlap on the narrowest plot.
**Status:** Deferred → TICKET-009
**Resolution:** Deferred (Engineer — Thomas Eaves, 2026-10-27) with code review CR-002 to graph-library/number-lines-and-coordinate-graphs/TICKET-009 (a default tick spacing the drawn axis has room for), which cites QR-004 in its Prior Art and requires a property that no two neighbouring default-spaced tick labels overlap.

---

### QR-005: `./core` bundle at 24.55 kB of 25 kB leaves no room for the next type

**Category:** Maintainability
**Severity:** Concern
**Location:** `.size-limit.json` (`./core`); `src/core/definitions/xy-graph.ts`
**Description:** Per the delivery record, `./core` rose from 23.13 to 24.55 kB of its 25 kB budget. The x,y,z graph (NLC TICKET-004) and the remaining shape types cannot land without exceeding it. I did not run `pnpm size`, by instruction; the figure is the record's. The cause is structural: `describe` text, property specs and checks all live in core by design (AD-001).
**Impact:** The next delivery will have to raise the budget under time pressure, or move code, with no decision recorded.
**Recommendation:** Decide now: raise the `./core` limit with a recorded rationale, or split definitions out of core. Defer to a named ticket, with a Known Hazard on NLC TICKET-004.
**Status:** Resolved
**Resolution:** Resolved (Engineer — Thomas Eaves, 2026-10-27): the `./core` limit in `.size-limit.json` is raised from 25 kB to 40 kB. `./core` holds every type's definition by design (AD-001); CPSE-NFR-002's 25 kB per-type limit is enforced on the per-type entries, which stay at 25 kB. Core grows about 1.5 kB per type. TICKET-004 and TICKET-009 carry a Known Hazard superseding their 25 kB wording.

---

### QR-006: Unexplained numeric factors in the origin-label clearance test

**Category:** Readability
**Severity:** Suggestion
**Location:** `src/layout/xy-graph.ts:209-226`
**Description:** `clearOfY` uses `tickFont * (TICK_LABEL_DROP - 0.8)` and the text node uses `zeroTop + tickFont * 0.8`. The 0.8 is the baseline offset of a text line and the kit's `drawAxis` encodes the same value elsewhere, but here it is a bare literal, and the two uses depend on each other. The rule itself (origin "0" is dropped if it would touch a neighbour) is well tested; the arithmetic is just hard to check.
**Impact:** A change to the kit's tick-label placement could silently break the clearance test. Only the tests would notice.
**Recommendation:** Name the baseline factor (`BASELINE = 0.8`, ideally exported from `kit/value-scale.ts` with `TICK_LABEL_DROP`) and extract the clearance test as `originLabelFits(...)` (see QR-001).
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-27). `BASELINE` (0.8) is named in `src/layout/kit/title.ts` beside `LINE_HEIGHT` (not `kit/value-scale.ts`, which imports `title.ts`, so the constant there would make a cycle) and used by `textLines`, `drawAxis`, `kit/value-scale.ts` and the origin label's clearance test (`originLabelFits`) and its "0" node.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fixed | Layout split into phases; Scenes byte-identical | `src/layout/xy-graph.ts` |
| QR-002 | Fixed | Shared `placeElementLabel`, label cut and `drawLine` in the kit | `src/layout/kit/labels.ts`, `src/layout/kit/axis.ts`, `src/layout/number-line.ts`, `src/layout/xy-graph.ts`, `tests/layout/kit/labels.test.ts` |
| QR-003 | Fixed | Comment, consts, names | `src/layout/xy-graph.ts` |
| QR-004 | Deferred → TICKET-009 | With CR-002 | `tickets/number-lines-and-coordinate-graphs/TICKET-009.md` |
| QR-005 | Fixed | `./core` limit 40 kB; hazards on TICKET-004 and TICKET-009 | `.size-limit.json`, `TICKET-004.md`, `TICKET-009.md` |
| QR-006 | Fixed | `BASELINE` named and shared | `src/layout/kit/title.ts`, `src/layout/kit/axis.ts`, `src/layout/kit/value-scale.ts`, `src/layout/xy-graph.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (five fixed, QR-004 deferred to TICKET-009)
