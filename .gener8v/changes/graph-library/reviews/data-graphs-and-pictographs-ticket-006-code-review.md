# TICKET-006: Accuracy and text-alternative checks — Code Review

## Summary

Reviewed the test-only delivery of DGP TICKET-006: the generators, the independent position reference, the accuracy suite (DGP-NFR-001 / DGP-REQ-036) and the text-alternative suite (DGP-NFR-003). The reference is genuinely independent of the drawn Scene and of the layouts' constants (they are restated as literals), though it shares a handful of kit helpers with `src/`. The 0.5 checks are not vacuous (counts, lengths and coordinates are asserted, and the delivery's mutants plausibly bite). Two real weaknesses remain: bars across with a category-axis label or `showValues` are never position-checked (DEL-003), and the text match is not scoped to a series. Findings: 5 (0 Critical, 3 Issues, 2 Observations).

**Delivery Record:** `.gener8v/changes/graph-library/delivery/data-graphs-and-pictographs-ticket-006-delivery.md`
**Files Reviewed:**
- `tests/fixtures/data-graphs.ts`
- `tests/fixtures/data-graph-reference.ts`
- `tests/layout/data-graph-accuracy.test.ts`
- `tests/core/data-graph-text-alternative.test.ts`
- `.gener8v/specifications/data-graphs-and-pictographs.md` (`@spec Coverage`)
- Read for context: `src/layout/bar-graph.ts`, `src/layout/line-graph.ts`, `src/core/describe.ts`, `src/core/definitions/line-graph.ts`

**Findings:** 5
**Critical:** 0 | **Issues:** 3 | **Observations:** 2

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| A fast-check generator produces valid line-graph, bar-graph and pictograph descriptions (category counts, decimals, orientations, scales) | Yes | `tests/fixtures/data-graphs.ts` `lineGraphArb`, `barGraphArb`, `pictographArb`, each wrapped in `valid()` (`validate()`); coverage counters in both suites. Located at `tests/fixtures/`, not the ticket Output's `tests/generators/`, as the Known Hazard directs |
| DGP-NFR-001: examples and >= 500 generated descriptions per type, every bar length and line point within 0.5 of the exact value | Partial | `tests/layout/data-graph-accuracy.test.ts` (examples + `RUNS = 500` for line and bar). Bars across with a category-axis label or `showValues` are excluded from the generated sample (CR-001); pictographs are out of scope per the Known Hazard |
| DGP-NFR-003: >= 500 generated descriptions per type, the text alternative contains every category name and value | Yes (with CR-002) | `tests/core/data-graph-text-alternative.test.ts`, all three types, 500 runs each, names via `cleanText`/`quoteText`, values via `String(value)`. Entries are not tied to their series (CR-002) |
| Both suites run in CI and fail with the offending description printed | Yes | Files under `tests/`, run by `pnpm test`; messages embed `JSON.stringify(input)`; fast-check prints the counterexample |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| DGP-REQ-036 | Bar lengths and line points in exact proportion | `tests/layout/data-graph-accuracy.test.ts` `checkBars`, `checkLinePoints`; `tests/fixtures/data-graph-reference.ts` | Partial (bars across with the two excluded terms; line-graph code carries no `@spec DGP-REQ-036`, CR-003) |
| DGP-NFR-001 | Every bar length and point within 0.5 px, geometry test over examples and generated descriptions | `tests/layout/data-graph-accuracy.test.ts` | Partial (CR-001) |
| DGP-NFR-003 | Text alternative names every category and value, test over generated descriptions | `tests/core/data-graph-text-alternative.test.ts` | Yes (CR-002 weakens the multi-series case) |

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| CC-002 (prd) | Text alternatives required for WCAG 1.1.1 | Yes | The text-alternative suite reads the Scene's `textAlternative` for all three types |
| TC-002 (prd) | Positions compared after `fmt()` rounding | Yes | The checks read the drawn (rounded) Scene values and compare against unrounded reference values within 0.5 |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-007 | 400-unit space, `fmt()` to 0.01 | Yes | Reference uses `DRAWING_WIDTH = 400`; drawn values are compared as emitted |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| DGP-REQ-036 (bars) | `@spec DGP-REQ-036` | `src/layout/bar-graph.ts` `barLength`, `barGraphLayout` | Yes (existing) |
| DGP-REQ-036 (line points) | `@spec DGP-REQ-036` | `src/layout/line-graph.ts` `lineGraphLayout` (carries `DGP-REQ-010, 012, 014, 015` only) | No |
| DGP-NFR-001 / DGP-NFR-003 | none (tests; coverage rows) | the two test files | Yes (rows) |

**Coverage:** 1 of 2 implementing locations of DGP-REQ-036 annotated
**Missing:** `@spec DGP-REQ-036` on `lineGraphLayout` (CR-003)
**Specification table:** Partly. The DGP-REQ-036 row lists the bar layout and the new tests but not `src/layout/line-graph.ts`, though the requirement names line-graph points. The DGP-NFR-001 and DGP-NFR-003 rows are present and correct.

### Verification Run

Reviewer re-ran the subset below; the full-suite, bench, build and audit commands were not repeated.

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache` on the two new files (10 tests) | 0 (10 passed) | Yes |
| `pnpm lint` / `pnpm typecheck` | 0 / 0 | Yes |
| Full `vitest` x3, `pnpm bench`, build and `check:*`, `pnpm audit`, mutation checks | not re-run | Not verified by this review |

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | Generated domain with counters that fail when a variation is dropped; thresholds such as "a single category > 0" are weak but they guard the narrowing |
| DEL-002 | Reasonable | Constants restated as literals, so a changed layout constant fails. It still imports `titleBlock`, `axisLabelLines`, `axisLabelDepth`, `valueAxisExtent`, `tickLabelOverhang`, `tickLabelsFit`, `MARKER_REACH`, `resolveValueScale` and `drawMarker` from `src/` (CR-004) |
| DEL-003 | Questionable | Removes the two terms that shift the plot across; a real production path is left without an absolute-position check (CR-001). It is recorded as a deviation, but nothing compensates for the gap |

## Findings

### CR-001: Bars across with a category-axis label or showValues are never position-checked

**Severity:** Issue
**Location:** `tests/layout/data-graph-accuracy.test.ts:159`; `tests/fixtures/data-graph-reference.ts:79`
**Traces To:** DGP-NFR-001; DGP-REQ-036; acceptance criterion 2 ("every bar length ... for the examples and at least 500 generated descriptions per type")
**Description:** For horizontal samples the test strips `categoryAxisLabel` and `showValues` before layout, so the shipped code paths where those terms narrow the plot are never measured. In `src/layout/bar-graph.ts`, `planHorizontal` computes `left` from the label depth, takes the right edge from `Math.max(tickLabelOverhang(candidate), labelRoom)`, and re-plans up to twice on the label's wrapped depth. Bar length across then depends on that `width`. A defect there (a stale width after a re-plan, or the label room not subtracted) would draw bars of a wrong length with no failure. The text-alternative suite does keep these terms, but it checks no geometry. Upright bars are fully covered, so the gap is specifically bars across, which a teacher can pick with `showValues`, a common option.
**Impact:** DGP-NFR-001 is verified only for a subset of bar graphs across; "exact proportion" could regress for labelled or value-annotated bars across without a failing test.
**Recommendation:** Keep the generated samples with the two terms and check what needs no restatement of the layout's edges: (a) bar length / value is the same constant across all non-zero bars within 0.5 / max value, and (b) the implied axis length (length of a bar / (value / (max - min))) lies between a reference lower and upper bound (the full width minus the maximum left and right room), or equals the drawn value-axis span. Alternatively, extend the reference with the label-depth and label-room terms. Record the residual honestly if only (a) is done.
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-10-30; also closes quality QR-001). Samples drawn across keep `categoryAxisLabel` and `showValues`. Without them the exact check stands; with them `checkProportionalBars` holds every bar within 0.5 of value × (longest length ÷ highest value), and the implied axis length within `barGraphBounds` (`tests/fixtures/data-graph-reference.ts`): at most the plot with the label's shallowest depth and the widest written value, at least the plot with its deepest depth, for some scale the interval loop could choose. Residual: the exact edges with those terms are bounded, not restated. Counters for across with a label (~145/500) and with written values (~60/500). Mutants: room not subtracted in `planHorizontal`, label depth not added to `left`, length ×0.97 with written values — each fails.

---

### CR-002: The text-alternative match is not scoped to a series, so a dropped entry can hide behind another series

**Severity:** Issue
**Location:** `tests/core/data-graph-text-alternative.test.ts:30`, `:42-48`, `:67`
**Traces To:** DGP-NFR-003; acceptance criterion 3
**Description:** `holds(text, entry)` searches the whole text alternative. For a line graph the entry `“Mon” is 3` is identical in every series that has 3 on Mon, so deleting one series' entry (or a whole series' sentence) still passes when another series shares the value. Probe (`describe` on two series with values `[3,4]`, second series' sentence removed): `holds` returned true for both `“Mon” is 3` and `“Tue” is 4`. Values are drawn from small grids (whole numbers over 5 to 1000, 1 to 6 series), so collisions are common. The `what` string names the series and label, but the check does not use them. The mutants the delivery lists (drop the last entry, drop the unit) fail because they drop distinct entries; a mutant that drops a repeated entry would not.
**Impact:** "Every text alternative names every category and value" is not enforced per series for multi-series line graphs; a layout/describe regression that omits one series' values passes whenever values repeat.
**Recommendation:** Locate each series' sentence (`<label>: ...` ending at the sentence's end) and look for that series' entries inside it, or build the expected full sentence for a series and require it as a substring. Add a coverage counter for "two series share a value at a category" and a mutant check for it.
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-10-30). The text alternative must end with the series sentences in order, each built from its head and its own entries joined as `describe` joins them; bar graphs and pictographs use the same check with their one list. Counter "two series share a value at a category" (~100/500). Mutants: the last series' sentence dropped, the last entry dropped from series after the first, and from only the second — each fails.

---

### CR-003: DGP-REQ-036 is not annotated or listed for the line-graph layout

**Severity:** Issue
**Location:** `src/layout/line-graph.ts:` `lineGraphLayout` (`@spec DGP-REQ-010, DGP-REQ-012, DGP-REQ-014, DGP-REQ-015`); `.gener8v/specifications/data-graphs-and-pictographs.md` `@spec Coverage`, DGP-REQ-036 row
**Traces To:** DGP-REQ-036; CLAUDE.md traceability rule; the ticket's "across all data graphs"
**Description:** DGP-REQ-036 names line-graph point positions, but the only implementing `@spec DGP-REQ-036` is in `src/layout/bar-graph.ts`. The line-graph code that places points (`at = valuePosition(...)`, `slot.center` in `lineGraphLayout`) has no such annotation, and the coverage row, extended by this delivery, lists the bar layout and the tests only. The delivery's own `@spec` table repeats this ("existing `@spec` on `src/layout/bar-graph.ts`").
**Impact:** `grep -rn "@spec DGP-REQ-036"` and the coverage table under-report the requirement; an audit sees line-graph points as untraced.
**Recommendation:** Add `DGP-REQ-036` to the `@spec` line above `lineGraphLayout` and `src/layout/line-graph.ts:lineGraphLayout` to the DGP-REQ-036 row (a one-line trivial fix, applied in resolution and recorded in the delivery record).
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-10-30). `@spec DGP-REQ-036` added above `lineGraphLayout` (`src/layout/line-graph.ts`, comment only); the DGP-REQ-036 coverage row lists `src/layout/line-graph.ts`:lineGraphLayout.

---

### CR-004: The reference shares kit helpers with the layouts, so offsets and marker shapes are not independently checked

**Severity:** Observation
**Location:** `tests/fixtures/data-graph-reference.ts:1-7`, `:42-45`, `:66-76`; `tests/layout/data-graph-accuracy.test.ts:68`
**Traces To:** DGP-NFR-001; Prior lesson NLC TICKET-005 CR-001
**Description:** Judged on the specific question: the reference is not circular. It reads no Scene, restates `PLOT_HEIGHT`, margin, name column and gaps as literals, and the y/length mapping is its own `linear` / ratio arithmetic, so shifting or rescaling an axis together with its contents fails. It does, however, import from `src/`: `resolveValueScale` (the scale itself), `titleBlock` (top offset), `valueAxisExtent` / `axisLabelDepth` / `axisLabelLines` (left edge), `MARKER_REACH`, `tickLabelOverhang` / `tickLabelsFit` (across width), and `drawMarker` (expected marker corners are computed with the layout's own marker function). The across interval choice is a copy of the layout's loop. Consequently a bug in one of those helpers moves the reference with the layout, and proportion errors in them are invisible. The file's header says this openly for the text helpers but not for the scale and marker functions.
**Impact:** Low: the proportion of values to length is checked; absolute offsets and marker geometry rely on separately tested helpers.
**Recommendation:** State the shared set in the file header; optionally compute the expected marker corners from `MARKER_REACH` literals, and confirm `resolveValueScale` and the tick helpers have their own tests.
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-10-30). The reference's header names every helper it shares with `src/` (`resolveValueScale`, `titleBlock`, `valueAxisExtent`, `axisLabelDepth`, `axisLabelLines`, `tickLabelOverhang`, `tickLabelsFit`, `textWidth`, `MARKER_REACH`, `drawMarker`) and says the offsets they produce and marker shapes are not checked independently.

---

### CR-005: The bar check measures length only and assumes one rect per drawn bar

**Severity:** Observation
**Location:** `tests/layout/data-graph-accuracy.test.ts:76-88`
**Traces To:** DGP-NFR-001; ticket Known Hazard (reuse `boundsOf`, `ticksOf`, `positionOf` from `tests/fixtures/scene-geometry.ts`)
**Description:** `checkBars` takes every `rect` node in order and compares only `width`/`height`. It does not check where a bar starts (the baseline at zero), that the i-th rect belongs to the i-th category, or that no non-bar rect exists. The count assertion would catch a stray rect today, but the check relies on the layouts drawing no other rects. The delivery did not use the scene-geometry readers the hazard named and does not record the choice. The expected-length filter (`Math.round(length * 100) > 0`) is computed from the reference, which is sound.
**Impact:** Low: the requirement is bar length; a mispositioned or reordered bar would pass.
**Recommendation:** Optionally also assert each bar's start edge against the reference baseline and note in the delivery record why the named readers were not reused.
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-10-30). `checkBars` also checks category order, each bar's start at the zero baseline (upright: the zero line; across: the plot's left plus the zero offset; upright with written values: no higher than the reference) and one shared start edge. The scene-geometry readers were not used because they read axes and ticks, not bars. Mutants: bar `x` +1 across and `y` +1 upright — each fails.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Fixed | see the finding | `tests/layout/data-graph-accuracy.test.ts`, `tests/fixtures/data-graph-reference.ts` |
| CR-002 | Fixed | see the finding | `tests/core/data-graph-text-alternative.test.ts` |
| CR-003 | Fixed | see the finding | `src/layout/line-graph.ts`, `.gener8v/specifications/data-graphs-and-pictographs.md` |
| CR-004 | Fixed | see the finding | `tests/fixtures/data-graph-reference.ts` |
| CR-005 | Fixed | see the finding | `tests/layout/data-graph-accuracy.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0
**Notes:** All five findings fixed in resolution (Engineer — Thomas Eaves, 2026-10-30) and re-verified; the residual of CR-001 (exact edges across with a category-axis label or written values are bounded, not restated) is recorded in the delivery record.
