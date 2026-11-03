# TICKET-010: Hold the triangle round trip to 10⁻⁹ just above the 0.02° floor for two sides and the included angle

**Change:** graph-library
**Capability Area:** Geometric Shapes & Solids (geometric-shapes-and-solids)
**Specification:** specifications/geometric-shapes-and-solids.md

**Summary:** The GSS-NFR-002 round-trip property test occasionally finds a triangle given by two sides and a tiny included angle (0.0201°, just above the 0.02° floor) whose derived values miss the 10⁻⁹ round trip. Find the cause, then fix the solver or, if the inputs' own rounding makes 10⁻⁹ unattainable there, propose a measured tolerance as an amendment.
**Priority:** Must
**Value:** CI stops failing at random on this test, and GSS-NFR-002 states what the solver actually guarantees near the floor.

**Requirements Covered:**
- GSS-NFR-002: Derived triangle sides and angles reproduce the supplied ones within 10⁻⁹ relative error — verified by the property-based round-trip test (at least 1,000 triangles per determining set)
- GSS-REQ-011: The system should draw a triangle from two side lengths and the angle between them
- GSS-REQ-014: The system should derive the remaining side lengths and angles of a triangle from whichever determining set was supplied

**Prior Art:**
- Read: `tests/core/triangle-solver.property.test.ts` — `roundTrips` (line 88) and "two sides and the angle between them" (line 113: supplies `sideB`, `sideC`, `angleA`; unseeded)
- Read: `src/core/geometry/triangle-solver.ts` — `fromTwoSidesAndIncluded` (line 242), `fourTimesArea`, `cosineAngle`, `TRIANGLE_MIN_ANGLE`
- Read: `.gener8v/technical-design/system-design.md` — TR-008 (the solver's numerics; "verified to 10⁻⁹ for every angle at least 0.02°")
- Read: `.gener8v/specifications/geometric-shapes-and-solids.md` — GSS-NFR-002 and the triangle angle Edge Case (the 0.02° floor)
- Read: `.gener8v/changes/graph-library/delivery/number-lines-and-coordinate-graphs-ticket-007-delivery.md` — Verification Run: the failure as seen (seed 875653159)
- Read: `.gener8v/changes/graph-library/delivery/geometric-shapes-and-solids-ticket-004-delivery.md` — DEL-005 (the solver's formulas) and how the floor was measured

**Acceptance Criteria:**
- [ ] The counterexample (angles 0.0201°, 60.8999492592404°, 119.07995074075959°; sides 6.661047965292615, 16590.79378447575, 16594.032272024426; supplied `sideB`, `sideC`, `angleA`) is pinned as a regression test, and the delivery record states its measured relative error and which derived value misses
- [ ] The root cause is named in the delivery record (which formula, which cancellation or rounding), with a probe that reproduces it
- [ ] Either the solver is fixed so that, for every determining set, the round trip holds to 10⁻⁹ for every angle of at least 0.02° — verified by the property test at its existing size (≥ 1,000 per set) run many times (or with a targeted generator concentrated near the floor) — or the delivery proposes a measured tolerance near the floor, approved by the Product Owner as a GSS-NFR-002 amendment (Specification skill) and noted in TR-008 (Technical Design), and the property test asserts exactly that tolerance
- [ ] The property test is not seeded to avoid the case, and no tolerance is loosened beyond what is measured and approved

**Output:**
- `src/core/geometry/triangle-solver.ts` — the fix, if any
- `tests/core/triangle-solver.property.test.ts` — the pinned counterexample; a near-floor generator if useful
- `.gener8v/specifications/geometric-shapes-and-solids.md`, `.gener8v/technical-design/system-design.md` — only through their skills, only if a tolerance is proposed

**Constraints:** None identified beyond TR-008

**Known Hazards:**
- Do not seed the property test to hide the case; the point is that it can occur.
- A change to the solver can move drawn triangles (GSS TICKET-009 places three-sides vertices from the sides; other sets use the solver's angles). Run `tests/layout/triangle.test.ts` and `tests/layout/engine-math.test.ts`; if Node markup changes for sampled triangles, count it and add a patch changeset.
- The 0.02° floor is a Product Owner decision (GSS TICKET-004 SEC-001); do not move the floor in this ticket.

**Depends On:** TICKET-004
**Blocks:** None

**Size:** Small

**Notes:** Seen once in about three full-suite runs on 2026-11-02; probably the fast-check failure GSS TICKET-007's review recorded as unexplained.
