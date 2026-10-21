# TICKET-006: Accuracy and text-alternative checks

**Change:** graph-library
**Capability Area:** Data Graphs & Pictographs (data-graphs-and-pictographs)
**Specification:** specifications/data-graphs-and-pictographs.md

**Summary:** Add generated-description test suites that prove drawn positions are faithful to the data and that every data graph's text alternative names every category and value, across line graphs, bar graphs and pictographs.
**Priority:** Must
**Value:** Teachers and students can trust that every data graph is drawn to scale and fully described to assistive technology.

**Requirements Covered:**
- DGP-REQ-036: Bar lengths and line-graph point positions in exact proportion (verified across all data graphs)
- DGP-NFR-001: Every bar length and point position within 0.5 px of its exact position — verified by a geometry test over example and generated descriptions
- DGP-NFR-003: Every text alternative names every category and value — verified by a test over generated descriptions

**Prior Art:**
- Read: TICKET-002 output at `src/layout/line-graph.ts`, TICKET-003 output at `src/layout/bar-graph.ts`, TICKET-005 output at `src/layout/pictograph.ts` — Scene structure to measure
- Read: `examples/line-graph.json`, `examples/bar-graph.json`, `examples/pictograph.json` — fixtures from TICKET-002, TICKET-003, TICKET-005
- Read: `src/core/describe.ts` — produced by graph-library/graph-specification-and-vocabulary/TICKET-001
- Read: `.gener8v/technical-design/system-design.md` — AD-007 (400-unit space, `fmt()` to 0.01) and the Infrastructure Requirements line for geometry suites

**Acceptance Criteria:**
- [ ] A fast-check generator produces valid line-graph, bar-graph and pictograph descriptions (varying category counts, values including decimals, orientations, scales)
- [ ] DGP-NFR-001: for the examples and at least 500 generated descriptions per type, every bar length and line-graph point position is within 0.5 px of the exact value computed from the data at the default rendered size (400 units = 400 px), verified by `tests/layout/data-graph-accuracy.test.ts`
- [ ] DGP-NFR-003: for at least 500 generated descriptions per type, the text alternative contains every category name and every value, verified by `tests/core/data-graph-text-alternative.test.ts`
- [ ] Both suites run in CI and fail with the offending generated description printed

**Output:**
- `tests/layout/data-graph-accuracy.test.ts` — DGP-NFR-001 and DGP-REQ-036 across the three types
- `tests/core/data-graph-text-alternative.test.ts` — DGP-NFR-003
- `tests/generators/data-graphs.ts` — fast-check arbitraries for valid data-graph descriptions, reusable by graph-library/graph-specification-and-vocabulary/TICKET-006

**Constraints:**
- prd/CC-002: text alternatives required for WCAG 1.1.1
- prd/TC-002: positions compared after `fmt()` rounding

**Known Hazards:**
- Values in the text alternative must appear as supplied (no rounding), while drawn positions are rounded — compare text against the description's values, and coordinates against computed positions with the 0.5 px tolerance
- Pictograph positions are not covered by DGP-NFR-001 (bars and points only); pictograph width accuracy is DGP-NFR-002 in TICKET-005 — do not duplicate it here
- Carried from GSV TICKET-007: generated names and labels are plain text of at most `CALLER_TEXT_LIMIT` characters. Include names at the limit and `REAL_STACKED_TEXT` (`tests/fixtures/plain-text.ts`), and filter through `validate()`. Compare the text alternative with each name as `describe` states it (through `cleanText` and `quoteText`, `src/core/format.ts`), not with the raw string. (ready-tickets reconciliation, 2026-10-21)
- Put generators in `tests/fixtures/data-graphs.ts`, not `tests/generators/` (which does not exist), and reuse `boundsOf`, `ticksOf` and `positionOf` from `tests/fixtures/scene-geometry.ts`. Read `src/core/format.ts` with the Prior Art: text helpers live there. (ready-tickets reconciliation, 2026-10-21)

**Depends On:** TICKET-002, TICKET-003, TICKET-005
**Blocks:** None

**Size:** Small

**Notes:** The generators are shared with the all-types schema agreement test in graph-library/graph-specification-and-vocabulary/TICKET-006 (DEP-005).
