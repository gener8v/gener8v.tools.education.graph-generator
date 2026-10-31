# TICKET-009: Build a three-sides triangle's third vertex without trigonometry

**Change:** graph-library
**Capability Area:** Geometric Shapes & Solids (geometric-shapes-and-solids)
**Specification:** specifications/geometric-shapes-and-solids.md

**Summary:** Place the third vertex of a triangle given by its three sides from the sides alone (Kahan's area and a square root), so its drawn coordinates never depend on the last bit of an engine's `cos`, `sin` or `atan2`.
**Priority:** Must
**Value:** Every triangle given by three sides hydrates in every browser, removing the one cross-engine residual accepted under AD-007.

**Requirements Covered:**
- GSS-REQ-010: The system should draw a triangle from three side lengths
- GSS-NFR-002: Derived triangle sides and angles reproduce the supplied ones within 10⁻⁹ relative error — verified by the existing property-based round-trip test (must still pass)

**Prior Art:**
- Read: `src/layout/triangle.ts` — `modelVertices` (around line 51): the third vertex is `[reach · cos(angle), reach · sin(angle)]` from the base's first angle, which for a three-sides triangle was itself derived with `atan2` (`src/core/geometry/triangle-solver.ts`).
- Read: `src/core/geometry/triangle-solver.ts` — Kahan's form of Heron's area, already computed for three sides.
- Read: `.gener8v/technical-design/system-design.md` TR-008 (amended 2026-10-29) — the solver's numerics; AD-007 — `fmt()` and the accepted rounding-boundary residual.
- Read: `tests/layout/engine-math.test.ts` — the property test that renders every type with the approximated `Math` functions ±1 ulp, and the pinned residual test "still draws the sides 18, 19.98, 14.13 triangle differently…".
- Read: `.gener8v/changes/graph-library/reviews/component-packaging-and-source-export-ticket-004-code-review.md` CR-002 — how the residual was found (x = 124.4565 ÷ 36 = 3.457125 model units, drawn at 126.095).

**Acceptance Criteria:**
- [ ] For a triangle given by three sides standing on `base`, the third vertex is x = (s² + b² − t²) ÷ (2b), y = 2·area ÷ b (s the side from the base's first end, t the other, b the base, area by Kahan), computed with no `cos`, `sin`, `atan2` or `hypot`.
- [ ] The pinned residual test in `tests/layout/engine-math.test.ts` fails and is replaced by one asserting the sides 18, 19.98, 14.13 triangle draws the same with `Math` ±1 and ±3 ulp; the property test also runs seed 8 (which reached the residual).
- [ ] GSS-NFR-002's round-trip property test and GSS-NFR-001's proportion test pass unchanged.
- [ ] The number of sampled three-sides triangles whose Node markup changes is measured and recorded; a patch changeset states it if any do.
- [ ] TR-008's Mitigation is amended through the Technical Design skill to say vertices of a three-sides triangle are placed from the sides, not with `atan2` (Architect approval).

**Output:**
- `src/layout/triangle.ts` — `modelVertices` for three-sides triangles
- `tests/layout/engine-math.test.ts` — the residual test replaced, seed 8 added
- `tests/layout/triangle.test.ts` — a focused test of the three-sides vertex
- `.gener8v/technical-design/system-design.md` — TR-008 amendment (via the Technical Design skill)

**Constraints:** prd/TC-002 (rounded coordinates), prd/RF-003 (engine float differences)

**Known Hazards:**
- Only triangles given by three sides change; two sides and an angle, two angles and a side, and vertices keep their construction. Do not route them through the new formula unless a test shows the same residual for them.
- A needle-thin triangle (an angle near the 0.02° floor) must keep its tiny height: use the solver's Kahan area, not a naive Heron, and keep `fitScale`'s guard against dividing by a zero height.
- The angle labels still come from the solver's derived angles; only the vertex position changes.

**Depends On:** TICKET-004, TICKET-005
**Blocks:** None

**Size:** Small

**Notes:** Carried from graph-library/component-packaging-and-source-export-ticket-004-code-review/CR-002 (residual accepted under AD-007 by the Engineer, 2026-10-31).
