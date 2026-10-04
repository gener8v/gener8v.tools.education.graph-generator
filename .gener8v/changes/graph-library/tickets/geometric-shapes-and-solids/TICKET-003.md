# TICKET-003: Square graph type

**Change:** graph-library
**Capability Area:** Geometric Shapes & Solids (geometric-shapes-and-solids)
**Specification:** specifications/geometric-shapes-and-solids.md

**Summary:** Deliver the `square` graph type: definition from a side length, layout with optional side labels (one or all four) and right-angle marks, text alternative, component, entry point and example.
**Priority:** Must
**Value:** A developer can drop a labeled, to-scale square into a lesson from its side length alone.

**Requirements Covered:**
- GSS-REQ-007: Draw a square from a side length
- GSS-REQ-008: Optionally label one side or all four sides
- GSS-REQ-009: Optionally mark the right angles

**Prior Art:**
- Read: `.gener8v/specifications/geometric-shapes-and-solids.md` — GSS-REQ-007..009, Edge Cases (labels on all four sides of a very small square)
- Read: `src/core/definitions/circle.ts`, `src/layout/circle.ts`, `src/layout/kit/measure.ts`, `src/react/graphs/CircleGraph.tsx`, `src/entries/circle.ts` — produced by TICKET-002; follow the same per-type pattern
- Read: `.gener8v/technical-design/system-design.md` — per-type conventions, AD-005, AD-010

**Acceptance Criteria:**
- [ ] `{ "type": "square", "sideLength": 4 }` renders a square whose four drawn sides are equal within 1%
- [ ] Zero or negative side length returns `out_of_range`
- [ ] Side labels can be requested for one side or all four; labels use `measurementLabel` (value, unit, custom text)
- [ ] Labels on all four sides of a very small square are placed outside the figure and do not overlap (estimated boxes)
- [ ] Right-angle marks appear at all four corners when requested
- [ ] The text alternative names the figure as a square and states the side length and unit when shown
- [ ] `SquareGraph`, `./square` entry, size-limit entry and example exist; Scene numbers pass through `fmt()`

**Output:**
- `src/core/definitions/square.ts`, `src/layout/square.ts` (registered), `src/react/graphs/SquareGraph.tsx`, `src/entries/square.ts`, `./square` export, size-limit entry
- `examples/square.json`, `examples/invalid/square-zero-side.json`
- `tests/core/square.test.ts` — range criterion
- `tests/layout/square.test.ts` — equal sides, label modes, small-square placement, right-angle marks, text alternative

**Constraints:** prd/TC-001, prd/TC-011 (label layout from estimated metrics), prd/CC-002

**Known Hazards:**
- Property name: the spec's Data Requirements says "side"; AD-005 lists `sideLength`. Use `sideLength`.

**Depends On:** TICKET-002
**Blocks:** TICKET-008

**Size:** Small
