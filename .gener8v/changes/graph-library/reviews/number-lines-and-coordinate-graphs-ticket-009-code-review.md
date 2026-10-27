# TICKET-009: Choose a default tick spacing the drawn axis has room for — Code Review

## Summary

Reviewed the delivery of NLC TICKET-009 (commit `058d841` against `7359171`): a length-aware default tick spacing shared by `describe` and the x,y layout through `fittedAxisSpacing`. All fourteen acceptance criteria are satisfied, except that criterion 5 holds only for labels that clear by at least the 2.4-unit gap, which the Engineer approved at plan approval (DEL-001). Lint, typecheck and the full suite (55 files, 1578 tests) reproduce. An independent probe of 2,271 valid random descriptions found `planeLengths` never above the drawn plot width and `describe` equal to the Scene's text alternative every time. There are three Observations and no Critical findings or Issues.

**Delivery Record:** `.gener8v/changes/graph-library/delivery/number-lines-and-coordinate-graphs-ticket-009-delivery.md`
**Files Reviewed:**
- `src/core/value-scale.ts`
- `src/core/definitions/xy-graph.ts`
- `src/core/definitions/axis.ts`
- `src/layout/xy-graph.ts`
- `src/generated/description.ts`
- `src/generated/schema.json`
- `src/generated/tool-schema.json`
- `src/generated/vocabulary.json`
- `tests/layout/kit/ticks.test.ts`
- `tests/layout/xy-graph.test.ts`
- `tests/core/xy-graph.test.ts`
- `.changeset/xy-graph-default-tick-spacing-fits-axis.md`
- `.gener8v/specifications/number-lines-and-coordinate-graphs.md` (`## @spec Coverage` rows only)

**Findings:** 3
**Critical:** 0 | **Issues:** 0 | **Observations:** 3

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| 1. Reported case: x −2..2 with y −100..100 ticked every 1 and every 20; text alternative states it | Yes | `tests/layout/xy-graph.test.ts` ("ticks x -2..2 with y -100..100 every 1 …", asserts the grid and the text alternative); `tests/core/xy-graph.test.ts` on `describe` |
| 2. Flat case: x −10..10 with y −2..2 has no overlapping y labels, x still every 2 | Yes | `tests/layout/xy-graph.test.ts` (flat-case test, `boundsOf`/`overlap`) |
| 3. Property over generated descriptions: no neighbouring labels overlap wherever a clearing spacing exists, found by the test's own `textWidth` search | Yes | `tests/layout/xy-graph.test.ts` `someSpacingClears`, `planes` generator; covers narrowest, flattest, past-clamp, square, edge and origin axes |
| 4. Fallback to the coarsest spacing leaving two ticks; exclusions counted | Yes | `fittedAxisSpacing` in `src/core/value-scale.ts`; direct tests in `tests/layout/kit/ticks.test.ts`; the record gives counts (6–11 of 300; 81 of 3,000) and an example |
| 5. Where there is room nothing changes; changed assertions are ones whose old drawing overlapped, listed in the record | Partial | The example and x −10..10 with y −10..10 are unchanged and the changed assertions are listed. x −2..2 with y −5..5 changes although its old labels cleared (by 0.76). This is the approved 2.4 gap (DEL-001); see CR-001 |
| 6. A supplied `tickSpacing` is used as given; hidden-label axis keeps today's default | Yes | `axisSpacing` returns `spacing` first; `planeRooms` returns `undefined` for `showTickLabels: false`; layout tests |
| 7. Text alternative states the drawn spacing; `describe` equals the Scene's `textAlternative` | Yes | `describe` calls `axisSpacing(…, planeRooms(graph)[name])`, the same room the layout passes; layout property test; my probe of 2,271 valid descriptions found 0 mismatches |
| 8. Validation unchanged; a default is never reported and keeps at least two ticks on a drawable axis | Yes | No change to the checks; `fittedAxisSpacing` breaks to its fallback before a spacing leaves fewer than two; property in `tests/layout/kit/ticks.test.ts`. The `too_few_ticks` clause is not checkable until TICKET-007 is delivered |
| 9. Number line and the rule without a length unchanged; listed tests pass unedited | Yes | The `room` argument is optional and the number line passes none; diff of `tests/layout/kit/ticks.test.ts` is additive (the record says the existing tests are unedited) |
| 10. Reuse: an exported function of plain numbers, tested directly | Yes | `fittedAxisSpacing(min, max, length, extent, textSize)` in `src/core/value-scale.ts`; direct tests in `tests/layout/kit/ticks.test.ts` |
| 11. Published `tickSpacing` description updated, `src/generated/*` regenerated, doc comments updated | Yes | `src/core/definitions/axis.ts:50` and `src/generated/*`; doc comments of `AXIS_DEFAULT_INTERVALS`, `axisSpacing`, `drawableTicks` updated; schema tests pass in the full run |
| 12. `pnpm size`, before and after, `./core` against the limit | Yes | Record: `./core` 24.57 to 25.09 kB against 40 kB (the Known Hazard supersedes 25 kB, QR-005); `./xy-graph` 21.63 kB of 25. Not re-run, per the instructions |
| 13. Changeset starting `Changed:` | Yes | `.changeset/xy-graph-default-tick-spacing-fits-axis.md`; `pnpm check:changesets` exit 0 on re-run |
| 14. lint, typecheck and test pass; `@spec` kept and extended | Yes | Re-run, all exit 0; annotations present (see below) |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| NLC-REQ-005 | Documented default tick spacing | `src/core/value-scale.ts`: `fittedAxisSpacing`, `axisSpacing`, `drawableTicks`, `niceTicks`; `src/core/definitions/axis.ts`: `tickSpacing` description | Yes |
| NLC-REQ-006 | Tick labels shown by default and kept apart | `src/core/definitions/xy-graph.ts`: `planeRooms`; `src/layout/xy-graph.ts`: `xyGraphLayout` | Yes |
| NLC-REQ-012 | Text alternative states the drawn spacing | `src/core/definitions/xy-graph.ts`: `xyGraph.describe` | Yes |
| NLC-REQ-027 | Separate tick spacing per axis | `src/core/definitions/xy-graph.ts`: `planeRooms` (each axis its own length and extent) | Yes |
| NLC-REQ-032 | Equal x and y unit lengths, with the narrowing and clamp that shorten axes | `src/core/definitions/xy-graph.ts`: `planeLengths`, `MAX_PLOT_HEIGHT` | Yes |

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/TC-001 | Output computed from the description alone; text never measured in the DOM | Yes | `tickLabelWidth` and `planeLengths` are arithmetic on numbers; no DOM, no layout import in `./core` |
| prd/RF-001 | Overlap handled by estimated widths with a margin, never below `textWidth` | Yes | `tickLabelWidth` is `textWidth`'s own arithmetic (556/333/278 × 1.1), tested as equal to it; a 2.4-unit gap beyond touching |
| prd/CC-002 | The text alternative describes what the figure shows | Yes | `describe` and the layout share `planeRooms`; 0 mismatches in my probe |
| CPSE-REQ-042, CPSE-REQ-043 | Descriptions stay valid; a coarser default is noted in the changeset | Yes | Validation untouched; `patch` changeset with `Changed:` (DEL-004) |

### Architecture Decision Adherence

Technical design not available for this check — the ticket cites no AD-XXX for this change, so architecture adherence is not verified beyond the constraints above. The layout builds its Scene from the description alone through the core module, as the other types do.

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| NLC-REQ-005 | `@spec NLC-REQ-005` | `src/core/value-scale.ts`: `fittedAxisSpacing`, `axisSpacing`, `drawableTicks`, `niceTicks` | Yes |
| NLC-REQ-006 | `@spec NLC-REQ-006` | `src/core/value-scale.ts`: `fittedAxisSpacing`; `src/core/definitions/xy-graph.ts`: `planeRooms`; `src/layout/xy-graph.ts`: `xyGraphLayout` | Yes |
| NLC-REQ-012 | `@spec NLC-REQ-012` | `src/core/definitions/xy-graph.ts`: `xyGraph.describe` | Yes |
| NLC-REQ-027 | `@spec NLC-REQ-027` | `src/core/definitions/xy-graph.ts`: `planeRooms`; `src/layout/xy-graph.ts`: `xyGraphLayout` | Yes |
| NLC-REQ-032 | `@spec NLC-REQ-032` | `src/core/definitions/xy-graph.ts`: `planeLengths` | Yes |

**Coverage:** 5 of 5 requirements annotated
**Missing:** None
**Specification table:** Yes. `## @spec Coverage` gains rows for NLC-REQ-005, 006, 027 and 032 naming `fittedAxisSpacing`, `planeLengths` and `planeRooms`. NLC-REQ-012 was already listed for `describe`. The new rows sit beside the older rows for the same IDs instead of merging into them, which is acceptable.

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm lint` | 0 | Yes |
| `pnpm typecheck` | 0 | Yes |
| `pnpm test` (`npx vitest run --no-cache`) | 0 (55 files, 1578 passed) | Yes |
| `pnpm check:changesets` | 0 | Yes |
| `pnpm check:deps` | 0 | Yes |
| `pnpm check:images` | 0 | Yes |
| `pnpm generate`, `pnpm size` | not re-run | Taken from the record, per instructions |
| `pnpm bench`, `pnpm build`, `pnpm check:dist`, `pnpm publint`, `pnpm attw`, `pnpm audit` and the mutation checks | not re-run | Not required for this review; the record's results are not contradicted |

An independent probe (scratch script, not committed) generated 2,271 valid random x,y descriptions across ranges 0.01 to 10⁷, with supplied spacings on either axis, hidden labels and a long y-axis label. `planeLengths` never exceeded the drawn plot width, and `describe` always equalled the Scene's text alternative.

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | The gap was approved by the Engineer with the cost stated: 24 clearing drawings change, each by less than 2.4 units. It leaves criterion 5 literally unmet for those (CR-001) |
| DEL-002 | Reasonable | `tickLabelWidth` equals `textWidth` for tick labels, so the estimate is never below it (RF-001) and no looser than needed. It carries three numbers from the font table into core, with a test pinning equality |
| DEL-003 | Reasonable | One plain-number decision plus an optional `AxisRoom` leaves existing results unchanged without a room. The bounded loop (`MAX_FITS`) and the "never throws" claim hold on inspection |
| DEL-004 | Reasonable | `patch` matches `.changeset/README.md`: every description stays valid |

Deviations: the reworked criterion-5 property, the 0.01 tolerance and the unlabeled-origin test now supplying `tickSpacing: 0.5` are reasonable. The last keeps the test on the path its name describes, with the same Scene as before.

## Findings

### CR-001: Criterion 5 holds only for labels that clear by at least the gap

**Severity:** Observation
**Location:** `src/core/definitions/xy-graph.ts`: `planeRooms`; `tests/layout/xy-graph.test.ts`
**Traces To:** TICKET-009 acceptance criterion 5; prd/RF-001; DEL-001
**Description:** The ticket asks that every x,y description whose default labels already clear draw the same Scene. The shipped rule changes 24 such drawings, among them x −2..2 with y −5..5 (x every 0.5 to every 1), whose old labels cleared by 0.76. The Engineer approved the 2.4-unit gap at plan approval, and the record lists the cost, so this is a recorded divergence from the ticket text, not an unnoticed one.
**Impact:** None on correctness. The ticket text now overstates what was delivered, so a later reader checking criterion 5 literally would mark it failed.
**Recommendation:** Dismiss at resolution with the Engineer's approval cited, or amend the criterion's wording through Ticket Breakdown so it reads "clear by at least the gap".
**Status:** Dismissed
**Resolution:** Engineer — Thomas Eaves, 2026-10-27. The 2.4-unit gap was approved with the plan (DEL-001), and the delivery record lists the drawings that change, each clearing by less than the gap today. Criterion 5 is met for labels that clear by at least the gap.

---

### CR-002: The specification's Ticks rule still promises 5 to 20 ticks

**Severity:** Observation
**Location:** `.gener8v/specifications/number-lines-and-coordinate-graphs.md:105`
**Traces To:** NLC-REQ-005; TICKET-009 Known Hazards ("The spec's 'ticks' wording becomes false for short axes")
**Description:** Behaviors & Rules → Ticks says a default gives "between 5 and 20 ticks". A short x,y axis now gets fewer, down to two. The ticket told the delivery not to edit the specification and to note the amendment; the record does (Notes), and the code comments and the published description are updated.
**Impact:** The specification contradicts the behavior until amended. The `@spec NLC-REQ-005` annotations stay valid meanwhile.
**Recommendation:** Defer to the Product Owner for an amendment through the Specification skill, together with TICKET-007's rule.
**Status:** Deferred → Product Owner amendment of Behaviors & Rules → Ticks through the Specification skill
**Resolution:** Engineer — Thomas Eaves, 2026-10-27. To be amended with TICKET-007's two-tick rule. `@spec NLC-REQ-005` stays on the code meanwhile, and the delivery record's Notes carry it.

---

### CR-003: Core repeats the layout's room constants with no link between them

**Severity:** Observation
**Location:** `src/core/definitions/xy-graph.ts`: `planeLengths` (`PLANE_ROOM` 368, 1.2 line height, the 4-unit gap, the 1.5 marker reach, two label lines)
**Traces To:** prd/TC-001; TICKET-009 Known Hazards (room bound from numbers alone)
**Description:** `./core` cannot import `SCENE_WIDTH`, `SCENE_MARGIN`, `LINE_HEIGHT`, `TICK_LABEL_GAP`, `MARKER_REACH` or `AXIS_LABEL_MAX_LINES` from `src/layout`, so `planeLengths` restates them as literals. If a layout constant changes, the bound can drift above the drawn plot, and the spacing is then decided for a longer axis than is drawn. Tests do guard it: the property that `planeLengths` stays within 0.01 of the drawn plot, and the record's mutation check with the plot 30 units too long. My own probe of 2,271 descriptions also found no case above the drawn width.
**Impact:** Low. A drift fails a test rather than shipping silently, but the failure would not point at the changed constant.
**Recommendation:** Keep as is. Optionally add a one-line comment on each literal naming its layout counterpart, and treat a layout constant change as a prompt to re-run the property.
**Status:** Fixed
**Resolution:** Engineer — Thomas Eaves, 2026-10-27. Each mirrored number is now a named, exported core constant with its layout counterpart in its comment: `PLANE_ROOM`, `PLANE_GAP`, `PLANE_AXIS_LABEL_LINES`, `PLANE_LINE_HEIGHT` and `PLANE_MARKER_REACH`. A new test, "mirrors the layout's own numbers…" in `tests/layout/xy-graph.test.ts`, pins each one to `SCENE_WIDTH`/`SCENE_MARGIN`, `AXIS_LABEL_MAX_LINES`, `LINE_HEIGHT` and `MARKER_REACH`. It pins the private 4-unit gaps by requiring `planeLengths` to equal the drawn plot for four graphs with a two-line y-axis label. Mutation-checked: `PLANE_GAP` 3 and `PLANE_ROOM` 370 each fail it. This also addresses quality review QR-001 and QR-002.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Dismissed | The gap was approved at plan approval (DEL-001); nothing changed | — |
| CR-002 | Deferred → Product Owner specification amendment | Recorded in the delivery record's Notes | — |
| CR-003 | Fixed | Named and exported the mirrored constants; a test pins them to the layout and checks the bound equals the drawn plot with a y-axis label | `src/core/definitions/xy-graph.ts`, `tests/layout/xy-graph.test.ts` |

## Verdict

**Result:** Approved with Notes
**Unresolved Findings:** 0. CR-001 is Dismissed, CR-002 Deferred to a Product Owner specification amendment, and CR-003 Fixed.
**Notes:** Criterion 5 holds for labels that clear by at least the approved gap (CR-001). The specification's Ticks wording waits for its amendment (CR-002). TICKET-007's `too_few_ticks` clause is checked once that ticket lands. Re-verified after CR-003: lint, typecheck and tests pass (1,579 tests, three clean runs).
