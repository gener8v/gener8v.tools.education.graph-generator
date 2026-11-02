# geometric-shapes-and-solids TICKET-009: Build a three-sides triangle's third vertex without trigonometry — Quality Review

## Summary

Reviewed the three-sides vertex construction in `modelVertices`, the `fourTimesArea` export, and the two test files at commit f41f23f. The change is small, correct on inspection (the x and y formulas match the base and reach conventions in `SIDE_ENDS`) and well commented. No Critical or Concern findings; three Suggestions on test strength and the boolean flag. Provisional verdict; resolution follows in the main session.

**Files Reviewed:**
- `src/layout/triangle.ts`
- `src/core/geometry/triangle-solver.ts`
- `tests/layout/engine-math.test.ts`
- `tests/layout/triangle.test.ts`

**Findings:** 3
**Critical:** 0 | **Concerns:** 0 | **Suggestions:** 3

## Quality Assessment

### Code Organization

**Rating:** Adequate
**Notes:** The vertex construction stays in the layout where the existing one lived, and the solver exports the area helper it already owned rather than duplicating Kahan's form. `modelVertices` now takes a `bySides` flag decided in `triangleLayout` from provenance, which splits the "which construction" decision from the function that uses it (QR-002).

### Readability

**Rating:** Strong
**Notes:** The doc comment and the inline comment state the formula, why trigonometry is avoided, and cite CR-002, AD-007, TR-002 and TR-008. Names `reach`, `t` and `b` are terse but defined by the surrounding comments. The one long line building `points[r]` is dense but readable.

### Error Handling

**Rating:** Adequate
**Notes:** The division by `2 * b` relies on a valid triangle never having a zero side, as the neighbouring `Corner` code also does; validation upstream guarantees it. `fourTimesArea` clamps a product rounded below zero to 0. No new failure paths are introduced.

### Test Coverage

**Rating:** Adequate
**Notes:** Executed: `pnpm lint` (no output, clean), `pnpm typecheck` (no output, clean), `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache --maxWorkers=4 tests/layout` gave 31 files and 784 tests passed. The shell's captured exit codes printed blank because of how the pipe was wrapped, so the pass is read from the tool output, not from exit codes; logs are in the scratchpad `qr-gss9/` directory. I did not re-run the full suite or the mutation check the delivery record cites. The engine-math test now asserts stability at -3, -1, +1 and +3 ulp and adds seed 8. The new focused tests are weaker than their descriptions suggest (QR-001, QR-003).

### Observability & Operability

**Rating:** Adequate
**Notes:** A pure layout function in a rendering library with no logging or metrics in the surrounding code; nothing is expected or missing.

## Findings

### QR-001: The focused vertex test restates the implementation and compares at one decimal

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/layout/triangle.test.ts` (the "is at x = (s² + b² − t²) ÷ 2b" test)
**Description:** The test recomputes the same formula the code uses (with Heron's plain product for y) and compares with `toBeCloseTo(…, 1)`, a tolerance of 0.05 on scaled values up to about 240. The old `cos`/`sin` construction differs from this by about 1e-14 relative, so the test would pass with it too; it does not distinguish the new construction.
**Impact:** The test shows the vertex is geometrically right, but it is not evidence for "no trigonometry". That claim rests on the engine-math test and the mutant run, which is not kept in the suite.
**Recommendation:** Keep this test for geometry, but retitle it accordingly, or add an independent check that is true of the construction, such as the vertex being exactly the same with `Math.cos`, `Math.sin` and `Math.atan2` mocked to throw.
**Status:** Resolved
**Resolution:** Fixed under code review CR-002 (approved by Engineer — Thomas Eaves, 2026-11-02): the helper is tested by its geometry (distances within 10⁻⁹), not by restating the formula at one decimal.

---

### QR-002: A boolean flag parameter selects between two constructions

**Category:** Maintainability
**Severity:** Suggestion
**Location:** `src/layout/triangle.ts:modelVertices` and `triangleLayout`
**Description:** `modelVertices(triangle, base, bySides)` branches on a flag computed by the caller from provenance. The `bySides` condition (no vertices and all three sides supplied) lives in the layout while the vertices early return lives in `modelVertices`, so the two "no vertices" checks are in different places. A call site reading `modelVertices(x, base, true)` says nothing.
**Impact:** Low today (one caller). A future set-specific construction would add another flag or widen the boolean.
**Recommendation:** Optional: split into small functions (`verticesFromSides`, `verticesFromAngle`) and let `triangleLayout` choose, or pass a named string such as `"sides" | "angles"`.
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-11-02): the construction is the named, exported `thirdVertexFromSides(b, s, t)`; `modelVertices` calls it for a three-sides triangle.

---

### QR-003: The needle-thin test does not show the Kahan form is needed, and the provenance rule is untested at its edges

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/layout/triangle.test.ts` (the "keeps a needle-thin triangle's height" test)
**Description:** The test asserts the apex is above the base, the base ends level, and no label overlaps. It does not check that a triangle with its sides supplied together with an angle or with vertices still takes the old path, or that a three-sides triangle whose sides were derived (not supplied) does. The mutant evidence for the bySides rule is only in the delivery record.
**Impact:** A later change to the `supplied` check in `triangleLayout` could move which triangles change output without a test failing.
**Recommendation:** Add a case for a derived-sides triangle (for example two sides and the included angle) and one with vertices, asserting the vertex still equals the `cos`/`sin` position; assert the needle-thin height equals the expected value (about 349.07 scaled) rather than only positive.
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-11-02): the needle-thin test checks the helper's height against the isosceles height √(s² − (b/2)²), computed apart from Kahan's area; a new test asserts three sides with an agreeing angle draw the same polygon as the sides alone and the same Scene with `Math` ±1 and ±3 ulp. Mutant: sending that triangle down the `cos`/`sin` path → the new test fails.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fixed | via code review CR-002 | `tests/layout/triangle.test.ts` |
| QR-002 | Fixed | `thirdVertexFromSides` | `src/layout/triangle.ts` |
| QR-003 | Fixed | needle height; agreeing-angle rule test | `tests/layout/triangle.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 — three fixed (Engineer — Thomas Eaves, 2026-11-02)
