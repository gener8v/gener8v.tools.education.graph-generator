# TICKET-005: Triangle layout and labels — Quality Review

## Summary

Reviewed the triangle's label terms and display helper, its layout, registration, examples and tests (delivery commit `410f82b`). Quality is high and consistent with the circle and square: one shared display rule for `describe` and the layout, guarded arithmetic, thorough tests including mutation checks and a property test. Three findings: 0 Critical, 1 Concern, 2 Suggestions.

**Files Reviewed:**
- src/layout/triangle.ts
- src/core/definitions/triangle.ts
- src/core/definitions/figure.ts
- src/core/definitions/square.ts
- src/core/definitions/circle.ts
- src/layout/square.ts (neighbour)
- src/layout/circle.ts (neighbour)
- src/react/graphs/TriangleGraph.tsx
- src/entries/triangle.ts
- tests/layout/triangle.test.ts
- tests/core/triangle.test.ts
- tests/react/Graph.test.tsx
- tests/package/per-type-bundle.test.ts

**Findings:** 3
**Critical:** 0 | **Concerns:** 1 | **Suggestions:** 2

## Quality Assessment

### Code Organization

**Rating:** Strong
**Notes:** Definition (`src/core/definitions/triangle.ts`) and layout (`src/layout/triangle.ts`) are separated, and `triangleDisplay` is the single rule both read, so the text alternative and the drawing cannot disagree. Shared `labelSidesProperty` and `agrees<D>()` moved to `figure.ts`, which removes duplication across circle, square and triangle. Dependency direction (layout imports core, never the reverse) is kept. The one weak spot is the size of `triangleLayout` (QR-001).

### Readability

**Rating:** Adequate
**Notes:** Names are clear (`SIDE_ENDS`, `fitScale`, `besidePoint`, `markReach`) and doc comments state the why (no divisions, guarded fallbacks). `triangleLayout` is roughly 190 lines with three nested candidate closures, a corner-geometry table and arc maths inline; it reads top to bottom but is hard to hold in the head. A few comments cite delivery decision IDs that do not match (QR-003).

### Error Handling

**Rating:** Strong
**Notes:** Degenerate geometry is guarded rather than thrown on: `unit()` falls back on zero length, `fitScale` ignores zero dimensions, the height is guarded against a zero opposite side, and mark radii are capped by the vertex height. Coordinate range is validated before the solver runs. Contradictions (angle text with `labelAngles: false`) are reported as validation issues at the implied term, matching the circle.

### Test Coverage

**Rating:** Strong
**Notes:** Commands run in this review: `npx vitest run --no-cache` exit 0 (65 files, 1,889 tests passed); `pnpm lint` exit 0; `pnpm typecheck` exit 0. `tests/layout/triangle.test.ts` covers orientation per determining set and determinism, vertex-given positions and no mirroring, scale, labels with custom text and limits, right-angle versus arc including the 1% boundary, thin triangles (1, 100, 100.5 and a 0.02 degree needle) with overlap and bounds checks, a 300-run property test over caller text, `fmt()`/`checkScene` for every example, and one test through `createGraph`. Tests assert behaviour (positions, marks, text) rather than implementation. Minor: the overlap and bounds assertions are duplicated between the thin-triangle table and the property test (not worth a finding on its own).

### Observability & Operability

**Rating:** Adequate
**Notes:** This is a pure, synchronous layout library with no logging, in line with the neighbouring layouts. Failures surface as typed validation issues with pointers and terms. A label with no place is stacked below the figure rather than dropped, but a stacked angle label shows its value without naming its angle on a needle triangle; the delivery records this as the existing stacking rule.

## Findings

### QR-001: `triangleLayout` is one long function with nested closures

**Category:** Maintainability
**Severity:** Concern
**Location:** `src/layout/triangle.ts:triangleLayout`
**Description:** `triangleLayout` (about lines 120 to 289) holds scaling, per-corner geometry, arc and right-angle mark construction, three candidate generators, label-request building and placement. The corner table and the arc maths (sweep normalization, piece count) are the densest parts and cannot be tested or read on their own.
**Impact:** The next change to angle marks or label candidates must reason about the whole function and its shared locals (`v`, `corner`, `markReach`, `obstacles`). The circle and square layouts stay shorter, so this is the file most likely to be hard to change.
**Recommendation:** Extract the pure pieces as module-level functions with explicit inputs, for example `cornerGeometry(v)`, `arcPoints(vertex, u1, u2, radius)` and `angleMark(...)` returning points and reach. Keep `triangleLayout` as the orchestration. No behaviour change; the existing layout tests cover it.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-29). `cornerGeometry`, `arcPoints`, `angleMark` and the three candidate generators (`nameCandidates`, `sideCandidates`, `angleCandidates`) are module-level functions with explicit inputs; `triangleLayout` orchestrates and is 92 lines (was about 190). Behaviour unchanged: a probe of 4,809 triangle and square Scenes (every set, label combination and size) hashes identically before and after (SHA-256 `d5938228…bee08`).

---

### QR-002: `polylineNode` has an unused option, and polyline building repeats the square's

**Category:** DRY
**Severity:** Suggestion
**Location:** `src/layout/triangle.ts:polylineNode`, `src/layout/square.ts:81`
**Description:** `polylineNode(points, color, join)` takes `"round" | "miter"` but its only caller passes `"miter"`. The square layout builds the same stroked, unfilled polyline node inline for its corner marks.
**Impact:** A dead parameter suggests a variation that does not exist; a third figure with marks would copy the node a third time.
**Recommendation:** Drop the `join` parameter (or move a `polylineNode(points, color)` helper into `src/layout/kit/` and use it from both layouts).
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-29). `polylineNode(points, color)`, with mitred joins and no `join` option, is in `src/layout/kit/figure-labels.ts` beside `segmentNode`; the triangle's marks and the square's right-angle marks both use it. The square's Scenes are unchanged (same probe).

---

### QR-003: Comments cite decision IDs that do not match

**Category:** Naming
**Severity:** Suggestion
**Location:** `src/layout/triangle.ts` (blank side label comment, "(DEL-003)"), `tests/layout/triangle.test.ts:231` and `:247` ("DEL-007", "DEL-008")
**Description:** The layout comment attributes the blank-label behaviour to DEL-003, but this delivery records blank angle labels in DEL-004 and the text wording in DEL-006. The test names cite DEL-007 and DEL-008, which this delivery does not have (they appear to refer to earlier tickets without saying which).
**Impact:** A reader following the reference lands on an unrelated decision. Unqualified IDs are ambiguous across tickets.
**Recommendation:** Qualify each reference with its ticket (for example `GSS TICKET-002 DEL-007`) or replace it with the requirement ID.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-29). The references are qualified as GSS TICKET-002's (DEL-003 blank label, DEL-006 stacking, DEL-007 custom text replaces the unit, DEL-008 cut with "…", and its security review SEC-001), in `src/layout/triangle.ts` and `tests/layout/triangle.test.ts`.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fix | Pure geometry and candidate functions extracted; `triangleLayout` 92 lines | `src/layout/triangle.ts` |
| QR-002 | Fix | `polylineNode(points, color)` in the kit, used by triangle and square | `src/layout/kit/figure-labels.ts`, `src/layout/triangle.ts`, `src/layout/square.ts` |
| QR-003 | Fix | Decision references qualified | `src/layout/triangle.ts`, `tests/layout/triangle.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** None
