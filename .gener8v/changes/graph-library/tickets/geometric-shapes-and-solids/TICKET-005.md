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
- Carried from graph-library/geometric-shapes-and-solids-ticket-002-code-review/CR-003 (DEL-001 on that delivery): the definition and layout contract now passes the provenance. Write `describe(normalized, provenance)` and `layout(normalized, provenance)` (`Layout<D>` in `src/layout/registry.ts`), even where the technical design and this ticket's Output still show one argument. TypeScript accepts a one-argument function, so dropping the provenance compiles; it then shows supplied values rounded (GSS-REQ-034 and its equivalents). Read a value's source with `sourceOf(provenance, term)` (`src/core/format.ts`). Call your own definition's `describe` from the layout, never `describeNormalized`, so no registry is reached. Draw a title with `titleBlock` (`src/layout/kit/title.ts`), and treat a title that is blank after cleaning as absent in `describe` too (code review CR-001).
- Carried from graph-library/geometric-shapes-and-solids-ticket-002-code-review/CR-002, CR-004 and CR-005 (the measurement-label rules every figure shares):
  - Build label text with `measurementLabel(value, source, unit?, custom?)` (`src/layout/kit/measure.ts`), not `displayValue` plus your own unit. It uses the same formatters as `formatMeasurement`, and derived values below 0.005 keep two significant figures.
  - Custom text replaces the whole label, unit included (DEL-007), and `""` is a blank label (DEL-003).
  - A label with no clear spot beside its line is stacked below the figure (DEL-006); say so in the label-text property descriptions, as the circle does.
- Carried from graph-library/geometric-shapes-and-solids-ticket-002-security-review/SEC-001, SEC-002 and SEC-003 (caller-sized text):
  - Never spread a caller-sized array into function arguments (`f(...nodes)`, `Math.max(...widths)`, `push(...lines)`). Above about 65,000 arguments in Safari, and about 120,000 in V8, the call throws. Use a loop, or pass one array (`SceneSvg` already does).
  - Wrap every label with `wrap(text, maxWidth, fontSize, maxLines)`, as the circle does with `LABEL_MAX_LINES` (4), and draw titles with `titleBlock`, which caps them at `TITLE_MAX_LINES` (3). The cut line ends in "…" (DEL-008), so the Scene stays small however long the description's text. Say so in the label-text descriptions, and keep the full text in the text alternative.
  - In `describe`, state measurements with `stateMeasurement(value, source, unit)` (`src/core/format.ts`), not `formatMeasurement`. It quotes a unit that is not unit-shaped, so the unit cannot read as the package's own sentence. Drawn labels keep `measurementLabel` / `formatMeasurement`.
  - Add a test that a valid description with half a megabyte of unit or label text renders in `<Graph>` and the type's component without throwing, with a bounded number of text nodes.

**Depends On:** TICKET-004, TICKET-002
**Blocks:** TICKET-008

**Size:** Medium
