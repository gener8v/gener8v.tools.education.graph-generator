# TICKET-005: Verify accuracy, server rendering, accessibility and performance for all axis-based graphs

**Change:** graph-library
**Capability Area:** Number Lines & Coordinate Graphs (number-lines-and-coordinate-graphs)
**Specification:** specifications/number-lines-and-coordinate-graphs.md

**Summary:** Add the four measurable checks the specification sets for number lines, x,y graphs and x,y,z graphs: geometric accuracy over generated descriptions, server rendering without browser globals, an accessible name on every graph, and a rendering benchmark.
**Priority:** Must
**Value:** Teachers can trust that every tick and point is where its value says, that every graph works for screen-reader users, and that large graphs render fast enough for build-time and server use.

**Requirements Covered:**
- NLC-NFR-001: Every tick, point and segment endpoint within 0.5 px of its computed position at the default size
- NLC-NFR-002: Every graph of these types renders in a server environment with no browser globals
- NLC-NFR-003: Every rendered graph exposes a non-empty text alternative to assistive technology
- NLC-NFR-004: 100 ticks per axis and 50 points render in ≤ 50 ms at p95 in a server render on a CI runner

**Prior Art:**
- Read: `.gener8v/specifications/number-lines-and-coordinate-graphs.md` — Non-Functional Requirements (targets and verification methods)
- Read: `.gener8v/technical-design/system-design.md` — Infrastructure Requirements (geometry suites on Scene data, axe-core tests, Vitest bench), AD-007 (400-unit space), AD-008 (accessible name via `aria-label` and `<title>`)
- Read: TICKET-002 output at `src/layout/number-line.ts`, `examples/number-line.json`
- Read: TICKET-003 output at `src/layout/xy-graph.ts`, `examples/xy-graph.json`
- Read: TICKET-004 output at `src/layout/xyz-graph.ts`, `examples/xyz-graph.json`
- Read: TICKET-001 output at `src/layout/kit/ticks.ts` — expected tick positions
- Read: `src/layout/kit/isometric.ts` — produced by `graph-library/geometric-shapes-and-solids/TICKET-001`; expected positions for x,y,z
- Read: `vitest.config.ts`, `.github/workflows/ci.yml` — produced by `graph-library/component-packaging-and-source-export/TICKET-001`; where tests and benchmarks run

**Acceptance Criteria:**
- [ ] NLC-NFR-001: a fast-check property test generates at least 200 descriptions per type (ranges, spacings, points, segments within range) and asserts every tick, point and segment endpoint in the Scene is within 0.5 units of the position computed from its value (linear scale for number lines and x,y graphs, `isometric()` for x,y,z), at the default 400-unit width; runs in CI
- [ ] NLC-NFR-002: a test runs in a Vitest `node` environment (no jsdom), asserts `window` and `document` are undefined, and renders each type's example to static markup without error; runs in CI on every matrix cell
- [ ] NLC-NFR-003: an accessibility test renders each example and each invalid-free generated sample, runs axe-core's SVG image rules, and asserts the `<svg>` has `role="img"` and a non-empty accessible name equal to the text alternative
- [ ] NLC-NFR-004: a Vitest bench renders an x,y graph with 100 ticks on each axis and 50 points to static markup in Node.js, and the p95 over at least 100 iterations is ≤ 50 ms on the CI runner; the result is printed in the Delivery verification step
- [ ] All four checks fail the build when their target is missed

**Output:**
- `tests/layout/nlc-accuracy.property.test.ts` — NLC-NFR-001
- `tests/react/nlc-server-render.test.ts` — NLC-NFR-002 (node environment)
- `tests/react/nlc-accessibility.test.tsx` — NLC-NFR-003
- `bench/nlc-render.bench.ts` — NLC-NFR-004
- `tests/fixtures/nlc-generators.ts` — fast-check arbitraries for valid number-line, xy-graph and xyz-graph descriptions, reusable by `graph-library/graph-specification-and-vocabulary/TICKET-006`

**Constraints:**
- prd/TC-005, prd/TC-001: server rendering must not depend on browser globals or measurement
- prd/CC-002: WCAG 1.1.1 text alternatives
- prd/OC-001: every target is enforced automatically

**Known Hazards:**
- The spec says "0.5 px at the default size"; the design draws in a 400-unit coordinate space scaled by `viewBox`. Treat one Scene unit as one pixel at the default size (400 px wide) and assert in Scene units — do not render in a browser to measure pixels (prd/TC-001).
- Generators must produce only valid descriptions (points inside ranges, spacing giving ≤ 100 ticks), otherwise the accuracy test exercises the validator rather than layout. Filter through `validate()` and discard invalid samples.
- A benchmark on shared CI runners is noisy: use p95 over ≥ 100 iterations after warm-up, not a single run, and keep the target exactly as stated (≤ 50 ms) — do not loosen it in the test.

**Depends On:** TICKET-002, TICKET-003, TICKET-004
**Blocks:** None

**Size:** Small

**Notes:** CPSE's cross-environment suite (`graph-library/component-packaging-and-source-export/TICKET-004`) covers hydration and cross-engine equality for all types; this ticket covers only the NLC-specific targets and must not duplicate that suite.
