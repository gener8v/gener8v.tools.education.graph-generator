# TICKET-004: Verify ruler accuracy, server rendering, accessibility and performance

**Change:** rulers
**Capability Area:** Number Lines & Coordinate Graphs (number-lines-and-coordinate-graphs)
**Specification:** specifications/number-lines-and-coordinate-graphs.md

**Summary:** Add the four measurable checks the specification sets for rulers: mark and object positions within 0.5 px over generated rulers, server rendering without browser globals, a non-empty accessible name, and a rendering benchmark at the maximum length.
**Priority:** Must
**Value:** Teachers can trust that a length read off a drawn ruler is the length described, and that every ruler works in print pipelines and with assistive technology.

**Requirements Covered:**
- NLC-NFR-005: Every ruler mark and object end within 0.5 px of its computed position, and every unit the same length
- NLC-NFR-006: Every ruler renders in a server environment with no browser globals
- NLC-NFR-007: Every rendered ruler exposes a non-empty text alternative to assistive technology
- NLC-NFR-008: A ruler of the maximum length in either unit, with an object, renders in ≤ 50 ms at p95 in a server render on a CI runner

**Prior Art:**
- Read: `.gener8v/specifications/number-lines-and-coordinate-graphs.md` — Non-Functional Requirements NLC-NFR-005..008 and their verification methods
- Read: TICKET-003 output at `src/layout/ruler.ts`, `src/react/graphs/RulerGraph.tsx`, `src/entries/ruler.ts`, and `examples/ruler.json`
- Read: `tests/fixtures/scene-geometry.ts` (Scene geometry helpers), `tests/react/Graph.test.tsx` (server rendering with `renderToStaticMarkup` and the accessible-name assertions), `tests/core/validate.bench.ts` (the benchmark pattern)
- Read: `.gener8v/changes/graph-library/tickets/number-lines-and-coordinate-graphs/TICKET-005.md` — the same four checks for the other axis-based types, which the ruler NFRs extend

**Acceptance Criteria:**
- [ ] NLC-NFR-005: a property test generates rulers in both units, at every inch division, at lengths 1 to the maximum and with objects from any mark to any later mark. For each it checks every mark and both object ends within 0.5 units of their positions computed from the values, and every whole unit drawn at the same length, verified by the geometry test in CI
- [ ] NLC-NFR-006: the ruler examples render in Node.js through `renderToStaticMarkup` with no browser global defined, verified by the server-rendering test in CI. Extend NLC-NFR-002's test if `graph-library/number-lines-and-coordinate-graphs/TICKET-005` has delivered it, else add a ruler test in the same shape
- [ ] NLC-NFR-007: every ruler example's rendered SVG has `role="img"` and a non-empty accessible name equal to its text alternative, and passes the axe rules for SVG images, verified by the accessibility test (extended or added as for NLC-NFR-006)
- [ ] NLC-NFR-008: a 30 cm ruler and a 12 in ruler at sixteenths, each with an object, render in ≤ 50 ms at p95 in a server render, verified by a `pnpm bench` benchmark recorded in the delivery record's Verification Run

**Output:**
- `tests/layout/ruler-accuracy.test.ts` — NLC-NFR-005
- Ruler cases added to the server-rendering and accessibility tests (or `tests/react/ruler.test.tsx`) — NLC-NFR-006, NLC-NFR-007
- `tests/layout/ruler.bench.ts` (or the existing bench file) — NLC-NFR-008

**Constraints:**
- prd/CC-002: WCAG 2.1 AA non-text content
- prd/TC-005: server rendering with no browser globals

**Known Hazards:**
- Tolerances: graph-library NLC TICKET-001's reviews found property tests that failed on correct code because their tolerance was below one ulp of their own expected value. Compute expected positions independently of the layout, with the same `linearScale` domain, and allow for their rounding. Then run each property test many times (for example 50) before calling it stable.
- Cross-change ordering: `graph-library/number-lines-and-coordinate-graphs/TICKET-005` (the same checks for number lines and coordinate graphs) may or may not be delivered first. Do not edit that change's ticket. Extend its tests if they exist, otherwise write ruler tests that it can later absorb, and record which in the delivery record.

**Depends On:** TICKET-003
**Blocks:** None

**Size:** Small

**Notes:** The 50 ms target matches NLC-NFR-004's for the other axis-based types; a 301-mark ruler is the largest Scene this change can produce.
