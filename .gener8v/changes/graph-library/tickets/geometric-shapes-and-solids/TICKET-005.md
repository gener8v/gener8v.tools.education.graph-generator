# TICKET-005: Triangle layout and labels

**Change:** graph-library
**Capability Area:** Geometric Shapes & Solids (geometric-shapes-and-solids)
**Specification:** specifications/geometric-shapes-and-solids.md

**Summary:** Lay out a solved triangle in its documented orientation, with optional side, angle and vertex labels and right-angle marks, and deliver its component, entry point and example.
**Priority:** Must
**Value:** Triangles appear in a predictable, textbook orientation with readable labels, ready to use in geometry lessons.

**Requirements Covered:**
- GSS-REQ-020: Optionally label sides, angles (degrees) and vertices
- GSS-REQ-021: Mark a 90° angle with a right-angle mark instead of an arc
- GSS-REQ-022: Triangle given by sides and angles placed in one documented, deterministic orientation

**Prior Art:**
- Read: `src/core/geometry/triangle-solver.ts`, `src/core/definitions/triangle.ts` — produced by TICKET-004
- Read: `src/layout/circle.ts`, `src/layout/kit/measure.ts` — produced by TICKET-002 (per-type pattern, measurement labels)
- Read: `src/layout/kit/labels.ts`, `src/layout/kit/text.ts` — produced by graph-library/component-packaging-and-source-export/TICKET-002
- Read: `.gener8v/specifications/geometric-shapes-and-solids.md` — Behaviors (first-named side horizontal at the bottom, remaining vertex above; vertex-given triangles keep relative positions), Edge Cases (very thin triangle 1, 100, 100.5)

**Acceptance Criteria:**
- [ ] A triangle given by sides/angles is drawn with the first-named side horizontal at the bottom and the remaining vertex above it, identically on every render
- [ ] A triangle given by vertices preserves the vertices' relative positions (no reflection), scaled to fit
- [ ] Sides can be labeled with their lengths (measurement labels with unit or custom text), angles with degrees, vertices with names
- [ ] An angle within tolerance of 90° gets a right-angle mark instead of an arc when angles are shown
- [ ] A very thin triangle (1, 100, 100.5) is drawn to scale and its labels do not overlap one another or the figure lines (estimated boxes)
- [ ] The text alternative names the figure as a triangle and states each shown side, angle and vertex name
- [ ] `TriangleGraph`, `./triangle` entry, size-limit entry and examples (one per determining set) exist; Scene numbers pass through `fmt()`

**Output:**
- `src/layout/triangle.ts` (registered in `src/layout/registry.ts`), `src/react/graphs/TriangleGraph.tsx`, `src/entries/triangle.ts`, `./triangle` export, size-limit entry
- `examples/triangle.json`, `examples/triangle-sas.json`, `examples/triangle-asa.json`, `examples/triangle-vertices.json`, `examples/invalid/triangle-ambiguous.json`, `examples/invalid/triangle-inequality.json`
- `tests/layout/triangle.test.ts` — orientation, vertex preservation, labels, right-angle mark, thin-triangle overlap, text alternative

**Constraints:** prd/TC-001, prd/TC-011 (estimated metrics), prd/CC-002

**Known Hazards:**
- Vertex coordinates use mathematical y-up; SVG is y-down. Flip y in layout, otherwise vertex-given triangles render mirrored and "relative positions preserved" fails.

**Depends On:** TICKET-004, TICKET-002
**Blocks:** TICKET-008

**Size:** Medium
