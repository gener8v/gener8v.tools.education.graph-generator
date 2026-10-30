# TICKET-007: Cylinder graph type — Quality Review

## Summary

Reviewed the cylinder definition, layout, shared radius terms and their tests. The code is clear, follows the circle and cube patterns closely, and is well tested; lint, typecheck and the full test suite pass. Two Suggestions, no Critical findings or Concerns.

**Files Reviewed:**
- `src/core/definitions/cylinder.ts`
- `src/core/definitions/figure.ts`
- `src/core/definitions/circle.ts`
- `src/layout/cylinder.ts`
- `src/layout/cube.ts` (neighbour)
- `src/react/graphs/CylinderGraph.tsx`, `src/entries/cylinder.ts`
- `tests/core/cylinder.test.ts`
- `tests/layout/cylinder.test.ts`

**Findings:** 2
**Critical:** 0 | **Concerns:** 0 | **Suggestions:** 2

## Quality Assessment

### Code Organization

**Rating:** Strong
**Notes:** The definition (what is shown, text alternative) and layout (geometry, labels) are separated, and `cylinderDisplay` is the single rule shared by `describe` and the layout. Moving the radius terms into `radiusProperties` in `figure.ts` shares them by identity and keeps the circle's property order. Dependency direction is sound (the layout imports the definition; the definition imports only the circle's `MeasurementDisplay` type).

### Readability

**Rating:** Strong
**Notes:** Doc comments state the geometric reasoning (projected axes, scale before projection, drawing order). `cylinderLayout` is about 120 lines of sequential steps; it is long but linear, and the helpers are named for intent. Minor: `STACKED` is declared inside the function body mid-flow.

### Error Handling

**Rating:** Strong
**Notes:** Invalid input is rejected by the definition (required height, ranges, derivation group, `agrees` checks). The layout works only on validated input. The extreme limits (0.001 and 1,000,000) are computed from ratios, so every coordinate stays finite, and the tests assert `checkScene` passes at the limits.

### Test Coverage

**Rating:** Strong
**Notes:** Executed in this review: `pnpm lint` exit 0; `pnpm typecheck` exit 0; `npx vitest run --no-cache` exit 0, 69 files and 2,038 tests passed (matches the delivery record). 41 core and 34 layout tests cover the acceptance criteria: dash and omit, derivation and contradiction, proportions within 1% (including a property over ratios), labels, no overlaps, limits, and the text alternative. The delivery's mutation checks show the tests catch real regressions. Gap: at the extreme ratios no proportion is asserted, which the delivery states and explains.

### Observability & Operability

**Rating:** Adequate
**Notes:** Pure functions with no logging, as with the neighbouring layouts. Failures surface as typed validation issues or `internal_error` through `createGraph`. Nothing further is warranted for this library.

## Findings

### QR-001: Segment label candidates duplicate the cube's edge candidates

**Category:** DRY
**Severity:** Suggestion
**Location:** `src/layout/cylinder.ts:67` (`segmentCandidates`), `src/layout/cube.ts:111` (`edgeCandidates`)
**Description:** `segmentCandidates` is the same idea as the cube's `edgeCandidates`: label positions beside a segment's middle, along each normal, at several offsets. The comment says "as the cube's edges". The two differ in details (the cylinder adds two gap distances and the t offsets), so this is near-duplication rather than a copy.
**Impact:** A fix to one place-finding rule has to be repeated in the other. The risk is small with two users.
**Recommendation:** If a third figure needs it, extract a shared kit helper in `src/layout/kit/figure-labels.ts` with the normals, gaps and t values as parameters. Leaving it as is for now is reasonable.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-29). `besideSegment(p, q, normals, lineHeight)` in `src/layout/kit/figure-labels.ts` is the one candidate generator beside a segment; the cube's edges and the cylinder's radius and diameter use it. A probe of 2,250 cube and cylinder Scenes hashes identically before and after.

---

### QR-002: Obstacle polylines are rebuilt from magic constants and `ellipseSegments` is local to the cylinder

**Category:** Maintainability
**Severity:** Suggestion
**Location:** `src/layout/cylinder.ts:37` (`ellipseSegments`), `src/layout/cylinder.ts:136-148`
**Description:** `ellipseSegments` (angles in radians, y down, half-ellipses via `ELLIPSE_PIECES / 2`) lives in the cylinder layout, although other figures with ellipses (the circle and the isometric kit) may need the same obstacle approximation. The angle ranges for the back (π to 2π) and front (0 to π) halves are coupled to the arc sweep flags in the `path` data by comment only. No test ties the obstacle halves to the drawn arcs.
**Impact:** Changing an arc's direction without updating the obstacle angles would leave labels free to overlap a line, and nothing would fail.
**Recommendation:** Move `ellipseSegments` to the kit when a second figure needs it. Optionally add a layout test that checks no label box intersects the drawn arcs, for both `hiddenBase` values.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-29). `halfEllipse(cx, cy, rx, ry, "back" | "front")` builds each base half's `path` data and its obstacle pieces from the same angles, so they cannot disagree. Tests check every obstacle piece lies on the ellipse on its half's side of the page and that the arc's ends match the pieces'; swapping the halves' angles fails them (mutation-checked).

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fix | `besideSegment` in the figure kit, used by cube and cylinder | `src/layout/kit/figure-labels.ts`, `src/layout/cube.ts`, `src/layout/cylinder.ts` |
| QR-002 | Fix | `halfEllipse` builds each half's path and obstacles together; tests | `src/layout/cylinder.ts`, `tests/layout/cylinder.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** None
