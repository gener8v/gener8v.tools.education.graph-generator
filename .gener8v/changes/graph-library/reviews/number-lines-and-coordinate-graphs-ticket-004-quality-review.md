# TICKET-004: Deliver the x,y,z coordinate graph type — Quality Review

## Summary

Reviewed the x,y,z graph definition, layout, registration and its tests (delivery commit bbd4ac1). The code is well organised, thoroughly documented and tested, and follows the x,y graph's patterns closely; lint, typecheck and the full test run are green. Findings are about a known, unmitigated cross-axis tick-label overlap that is silently accepted, an untested cross-axis overlap path, a long multi-purpose function, and a small amount of copy-paste shared with the x,y graph layout. 0 Critical, 2 Concerns, 3 Suggestions.

**Files Reviewed:**
- `src/core/definitions/xyz-graph.ts`
- `src/core/definitions/xy-graph.ts` (exported `coordinates`, reworded axis terms)
- `src/layout/xyz-graph.ts`
- `src/layout/xy-graph.ts` (neighbour, for patterns)
- `src/core/definitions/index.ts`, `src/layout/registry.ts`, `src/react/graphs/XyzGraph.tsx`, `src/entries/xyz-graph.ts`
- `tests/core/xyz-graph.test.ts`, `tests/layout/xyz-graph.test.ts`

**Findings:** 5
**Critical:** 0 | **Concerns:** 2 | **Suggestions:** 3

## Quality Assessment

### Code Organization

**Rating:** Strong
**Notes:** Definition (`describe`, `xyzRooms`, checks) and layout (`frameOf`, `axesOf`, `tickLabels`, `guideSegments`, `axisLabels`, `pointLabels`) are cleanly split, and the shared axis length and rooms live in core so `describe` and the layout cannot drift. Dependency direction is right (layout imports core, not the reverse; `AXIS_PAGE_LENGTH` is pinned to `ISO_SCALE` by a test). Small helpers (`clamp`, `GAP`, `LABEL_ROWS`, point-label candidate loop) are repeated from `src/layout/xy-graph.ts` (QR-004).

### Readability

**Rating:** Adequate
**Notes:** Names are clear and doc comments explain the geometry. `tickLabels` (`src/layout/xyz-graph.ts:170`) runs about 55 lines with a nested loop, a branch on axis orientation, candidate lists and meeting-point deduplication; it is the hardest function to reason about (QR-003). `xyzGraphLayout` reads as a clear sequence of phases.

### Error Handling

**Rating:** Adequate
**Notes:** Validation is complete: `axisDomainChecks` x3 and `pointsInRange` with a JSON Pointer path per coordinate; a zero-width axis is rejected by validation (probed: `xAxis` min 3 max 3 gives `out_of_range`), so the layout's division by axis length is safe. ±1e9 is tested. The layout's fallback when `placeLabel` finds no clear place is "take the first candidate", which silently produces overlapping labels (QR-001).

### Test Coverage

**Rating:** Strong
**Notes:** Executed in this review: `pnpm lint` exit 0; `pnpm typecheck` exit 0; `npx vitest run --no-cache` 57 files, 1,635 tests passed (matches the delivery record). `tests/core/xyz-graph.test.ts` (21) and `tests/layout/xyz-graph.test.ts` (23) cover projection through `isometric()`, ticks, defaults, guide lines, labels, bounds, limits and a timing bound; the delivery also records a five-mutation check. Gap: no test asserts anything about cross-axis tick-label collisions, so the 1,863 of 8,000 range combinations the delivery notes report are neither bounded nor guarded against regression (QR-002).

### Observability & Operability

**Rating:** Adequate
**Notes:** Pure functions in a library with no logging in neighbouring layouts, so none is expected. Failures surface as typed issues with paths. The one silent degradation (label placed on top of another) is invisible to a caller and to the text alternative (QR-001).

## Findings

### QR-001: Tick labels with no clear place silently overlap other axes' labels

**Category:** Maintainability
**Severity:** Concern
**Location:** `src/layout/xyz-graph.ts:218` (`tickLabels`)
**Description:** When `placeLabel` returns nothing the label takes its first candidate and is still pushed as an obstacle. The delivery record's Notes report that, in a sweep of 8,000 range combinations, 1,863 had at least one cross-axis overlap (mostly negative ranges on two or more axes). Spec OQ-005 permits overlap in crowded cases, but this level of occurrence on ordinary ranges (for example negative values on several axes) is a visible defect in a teaching figure, and the delivery explicitly asks the reviews to decide.
**Impact:** Unreadable tick labels on plausible curriculum inputs (graphs with negative axes); the library offers no signal and the caller has no remedy short of `showTickLabels: false`.
**Recommendation:** Decide explicitly: either open a ticket for a mitigation (drop a tick label that has no clear place, or add candidates farther out / a wider wedge, and state it in `describe`), or accept it and record the acceptance with the measured rate against OQ-005.
**Status:** Resolved
**Resolution:** Fixed by the resolution of graph-library/number-lines-and-coordinate-graphs-ticket-004-code-review/CR-001 (Engineer — Thomas Eaves, 2026-10-28):
- A tick label tries one step farther out on each side, and one with no clear place is left out rather than drawn over another.
- The axis names are placed first.

A sweep of 8,000 range combinations went from 2,242 graphs with overlapping text to 0, with about 1.7% of tick labels left out.

---

### QR-002: No test bounds or guards the cross-axis tick-label overlap rate

**Category:** Testing
**Severity:** Concern
**Location:** `tests/layout/xyz-graph.test.ts:279`
**Description:** The "no two neighbouring default tick labels overlapping" test checks neighbours on one axis only. The cross-axis collisions reported in the delivery (QR-001) rely on a one-off sweep that is not in the suite, and the extra candidates added in DEL-003 (gap candidates at the meeting point, above-first when z runs below) are protected only by that unrecorded sweep.
**Impact:** A change to candidate order or `wedge` could raise the overlap rate with no test failing.
**Recommendation:** Add a small deterministic regression: a fixed set of representative ranges (all-positive, one negative axis, all-negative) asserting zero cross-axis overlaps where they currently hold, and a documented known-overlap list for those that do not.
**Status:** Resolved
**Resolution:** Fixed by the same CR-001 resolution: `tests/layout/xyz-graph.test.ts` adds "draws no text over another, across axes too …". It checks 512 graphs (all-positive, mixed, negative-only, narrow and wide ranges on every axis, with a labeled point) for no overlapping text at all, every axis named, and more than 95% of ticks labeled. Restoring the fallback, or placing the names after the tick labels, fails it.

---

### QR-003: `tickLabels` mixes several placement rules in one function

**Category:** Readability
**Severity:** Suggestion
**Location:** `src/layout/xyz-graph.ts:170`
**Description:** One function computes the z-side preference, the wedge distance, meeting-point dedupe, and per-orientation candidate lists, then places. The doc comment needed to explain it is longer than some other functions in the file.
**Impact:** Adjusting one rule (for example the z-label side) requires reading all of them; raises the cost of QR-001's fix.
**Recommendation:** Extract `candidatesFor(axis, text, width, context)` (across vs upright candidate lists) from the loop, leaving `tickLabels` to own deduplication and placement.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-28). `src/layout/xyz-graph.ts` now splits the work three ways:
- `tickRules` (above-first, right-first, the meeting-point gap), worked out once;
- `tickCandidates`, the ordered candidates for one label;
- `tickLabels`, which keeps only the meeting-point deduplication and placement.

Behaviour is unchanged: the 8,000-graph sweep gives the same counts (0 overlapping; 1,980 of 116,159 labels left out), and the suite passes.

---

### QR-004: Helpers and the point-label candidate loop duplicate `xy-graph.ts`

**Category:** DRY
**Severity:** Suggestion
**Location:** `src/layout/xyz-graph.ts:34`, `src/layout/xyz-graph.ts:303-322`; `src/layout/xy-graph.ts:57`, `src/layout/xy-graph.ts:320-336`
**Description:** `clamp`, `GAP = 4`, `LABEL_ROWS = 2` and the "off each corner, then centered above and below, on rows outward" candidate generation are copied almost verbatim between the two coordinate graph layouts.
**Impact:** A tweak to one graph's point-label placement will not reach the other; the two will drift.
**Recommendation:** Move the candidate generator (taking a marker position, reach and rows) and `clamp` into `src/layout/kit/`, used by both. Low priority: the similarity is real but small.
**Status:** Deferred → a kit refactor when a third type places point labels
**Resolution:** Deferred (Engineer — Thomas Eaves, 2026-10-28). Moving `clamp` and the point-label candidate generator into `src/layout/kit/` changes the x,y graph's layout, which is outside this ticket (Stay in Your Lane). The copies are small and recorded here, so the refactor can be done once a third consumer needs them.

---

### QR-005: `AXIS_LENGTH` is re-exported from the layout with no consumer need

**Category:** Maintainability
**Severity:** Suggestion
**Location:** `src/layout/xyz-graph.ts:19-20`
**Description:** The layout imports `AXIS_LENGTH` from core and then re-exports it, with a comment, giving two import paths for one constant (core's definition module and the layout module). Likewise `AXIS_LABEL_WIDTH` and `GUIDE_DASH` are exported; check that tests are the only consumers.
**Impact:** Minor: two sources for one fact invite a future divergent copy and widen the layout module's public surface.
**Recommendation:** Import `AXIS_LENGTH` from core in the tests and drop the re-export; keep `AXIS_LABEL_WIDTH` and `GUIDE_DASH` exported only if tests need them.
**Status:** Dismissed
**Resolution:** Dismissed (Engineer — Thomas Eaves, 2026-10-28). The re-export follows the x,y graph's own pattern: `src/layout/xy-graph.ts` re-exports `MAX_PLOT_HEIGHT` from core (NLC TICKET-009). The layout's numbers are imported from the layout module in both types' tests. `AXIS_LABEL_WIDTH` and `GUIDE_DASH` are used by `tests/layout/xyz-graph.test.ts`.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fixed (via CR-001) | Unplaceable tick labels left out; axis names first; 0 overlaps in 8,000 graphs | `src/layout/xyz-graph.ts` |
| QR-002 | Fixed (via CR-001) | 512-graph test: no overlapping text, names kept, >95% labeled | `tests/layout/xyz-graph.test.ts` |
| QR-003 | Fixed | `tickRules` and `tickCandidates` extracted from `tickLabels` | `src/layout/xyz-graph.ts` |
| QR-004 | Deferred | Kit refactor when a third type needs it | — |
| QR-005 | Dismissed | Matches the x,y graph's re-export pattern | — |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (0 Critical, 0 Concerns, 0 Suggestions); QR-004 deferred, QR-005 dismissed
**Notes:** Resolved in the main session, 2026-10-28. Re-verified after QR-003, all exit 0:
- `pnpm generate`, lint, typecheck, bench, build, `check:dist`, `check:deps`, `check:images`, `check:changesets`, size, publint, attw and both audits;
- `pnpm test` ×3, 1,636 tests each run.

Sizes: `./xyz-graph` 21.29 kB of 25; `./core` 25.9 kB of 40.
