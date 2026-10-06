# TICKET-006: Cube graph type

**Change:** graph-library
**Capability Area:** Geometric Shapes & Solids (geometric-shapes-and-solids)
**Specification:** specifications/geometric-shapes-and-solids.md

**Summary:** Deliver the `cube` graph type: definition from an edge length, isometric layout with hidden edges dashed (or omitted), optional edge labels, text alternative, component, entry point and example.
**Priority:** Must
**Value:** A developer can show a labeled cube that reads as a 3D solid, drawn to scale, for volume and surface-area lessons.

**Requirements Covered:**
- GSS-REQ-023: Draw a cube from an edge length so it reads as 3D
- GSS-REQ-024: Hidden edges dashed by default, optionally omitted
- GSS-REQ-025: Optionally label one edge or the three visible edges meeting at a corner

**Prior Art:**
- Read: `src/layout/kit/isometric.ts` — produced by TICKET-001 (projection, visible faces)
- Read: `src/layout/circle.ts`, `src/layout/kit/measure.ts` — produced by TICKET-002
- Read: `.gener8v/technical-design/system-design.md` — AD-009 (isometric, hidden edges analytic), AD-011 (`stroke-dasharray` presentation attribute)

**Acceptance Criteria:**
- [ ] `{ "type": "cube", "edgeLength": 3 }` renders 9 visible edges solid and 3 hidden edges dashed by default
- [ ] With hidden edges omitted, only the 9 visible edges are drawn
- [ ] All 12 projected edges have equal drawn length within 1% (isometric equal foreshortening)
- [ ] Edge labels can be requested for one edge or the three visible edges meeting at the front corner, using measurement labels
- [ ] Zero or negative edge length returns `out_of_range`
- [ ] The text alternative names the figure as a cube and states the edge length when shown
- [ ] `CubeGraph`, `./cube` entry, size-limit entry and example exist; Scene numbers pass through `fmt()`

**Output:**
- `src/core/definitions/cube.ts`, `src/layout/cube.ts` (registered), `src/react/graphs/CubeGraph.tsx`, `src/entries/cube.ts`, `./cube` export, size-limit entry
- `examples/cube.json`, `examples/invalid/cube-negative-edge.json`
- `tests/layout/cube.test.ts` — visible/hidden edges, equal lengths, label modes, text alternative
- `tests/core/cube.test.ts` — range criterion

**Constraints:** prd/TC-010 (fixed projection, analytic hidden lines)

**Known Hazards:**
- Spec Assumptions mention an oblique projection; AD-009 (isometric) supersedes it — draw isometric so all edges keep equal drawn length (GSS-REQ-030).
- Property name: spec says "edge"; AD-005 lists `edgeLength`. Use `edgeLength`.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-001-code-review/CR-002 and graph-library/graph-specification-and-vocabulary-ticket-001-quality-review/QR-001, QR-002 (the definition contract, RES-001):
  - Build every properties map with `defineProperties` (`src/core/definitions/types.ts`), which freezes it and removes prototypes.
  - Never list a shared top-level option (`title`, `lineColor`, axis labels…) in `properties`: `propertiesOf(type)` adds it from its `appliesTo`.
  - Nest the shared `label`/`color` (or `lineLabel`/`lineColor` for series) spec objects themselves in element specs, exactly when `elementsOf` lists the type.
  - Import text helpers from `src/core/format.ts`, never `src/core/describe.ts` (lint enforces it).
  - In `describe`, pass every caller string through `quoteText`, and state measurements with `formatMeasurement(value, provenance, unit)` so supplied values appear as written and derived values rounded.
  - Register the definition in `src/core/definitions/index.ts`, and run the applicability and consistency checks in `tests/core/definitions.test.ts` against it.

**Depends On:** TICKET-001, TICKET-002
**Blocks:** TICKET-008

**Size:** Medium
