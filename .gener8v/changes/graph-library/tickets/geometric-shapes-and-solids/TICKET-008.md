# TICKET-008: Proportion, label-overlap and text-alternative checks across figures

**Change:** graph-library
**Capability Area:** Geometric Shapes & Solids (geometric-shapes-and-solids)
**Specification:** specifications/geometric-shapes-and-solids.md

**Summary:** Add the cross-figure verification suite: drawn proportions faithful to measurements, figures scaled to fit, no label overlaps on any documented example, and a complete text alternative for every figure.
**Priority:** Must
**Value:** Every geometric figure in the library is guaranteed to-scale, readable and accessible, and regressions are caught in CI.

**Requirements Covered:**
- GSS-REQ-030: Ratios between drawn lengths equal ratios between measurements
- GSS-REQ-031: Each figure scaled to fit its drawing area, preserving proportions
- GSS-NFR-001: Each ratio between two drawn lengths within 1% of the measurement ratio
- GSS-NFR-003: No label overlaps another label or a figure line on every documented example
- GSS-NFR-004: Every rendered figure carries a non-empty text alternative naming the figure and every shown measurement

**Prior Art:**
- Read: `src/layout/circle.ts`, `src/layout/square.ts`, `src/layout/triangle.ts`, `src/layout/cube.ts`, `src/layout/cylinder.ts` — produced by TICKET-002, TICKET-003, TICKET-005, TICKET-006, TICKET-007
- Read: `src/layout/kit/isometric.ts` — produced by TICKET-001 (`ISO_SCALE` to remove foreshortening)
- Read: `src/layout/kit/text.ts` — produced by graph-library/component-packaging-and-source-export/TICKET-002 (estimated text boxes)
- Read: `examples/` — every figure's examples from the type tickets

**Acceptance Criteria:**
- [ ] For every figure, each ratio between two drawn lengths is within 1% of the ratio between the corresponding measurements, verified by a geometry test over each figure's examples plus at least 200 generated descriptions per figure; solids are measured along projected axes after dividing by `ISO_SCALE` (GSS-NFR-001)
- [ ] Every figure's Scene fits inside its viewBox with proportions preserved, for extreme aspect ratios (very thin triangle, very tall and very wide cylinder)
- [ ] No measurement label's estimated bounding box overlaps another label or a figure line, verified by a bounding-box overlap test over every documented example with the default font (GSS-NFR-003)
- [ ] Every rendered figure has a non-empty text alternative naming the figure and every shown measurement, verified by a render test over the fixture set of every figure (GSS-NFR-004)

**Output:**
- `tests/layout/gss-proportions.test.ts` — GSS-REQ-030, GSS-REQ-031, GSS-NFR-001
- `tests/layout/gss-label-overlap.test.ts` — GSS-NFR-003
- `tests/react/gss-text-alternatives.test.tsx` — GSS-NFR-004
- `tests/helpers/scene-geometry.ts` — helpers to extract segment lengths and label boxes from a Scene (reusable by other areas)

**Constraints:** prd/TC-001, prd/TC-011, prd/RF-001 (overlap guaranteed only for estimated metrics and the default font)

**Known Hazards:**
- GSS-NFR-003 is verified on estimated text boxes with the default font (AD-010, TR-003); do not attempt DOM measurement in tests to "prove" it — that would test something layout never sees.
- If a figure fails, fix its layout ticket's code here only if trivial; otherwise record the failure as a finding against that type rather than loosening the 1% tolerance.

**Depends On:** TICKET-003, TICKET-005, TICKET-006, TICKET-007
**Blocks:** None

**Size:** Small
