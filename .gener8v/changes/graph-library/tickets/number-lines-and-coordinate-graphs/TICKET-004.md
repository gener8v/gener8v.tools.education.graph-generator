# TICKET-004: Deliver the x,y,z coordinate graph type

**Change:** graph-library
**Capability Area:** Number Lines & Coordinate Graphs (number-lines-and-coordinate-graphs)
**Specification:** specifications/number-lines-and-coordinate-graphs.md

**Summary:** Add the `xyz-graph` type end to end: definition with three axes and points, layout in the shared isometric projection with labeled axes, ticks and optional guide lines from each point to the x,y plane, React component, entry point and example.
**Priority:** Must
**Value:** A curriculum developer can show points in three dimensions in the same 3D convention the package uses for cubes and cylinders.

**Requirements Covered:**
- NLC-REQ-001: x,y,z graph parameters defined in the single definition (xyz part)
- NLC-REQ-010: Report each point outside its axis range (xyz part)
- NLC-REQ-012: Text alternative stating type, axis ranges and every marked point (xyz part)
- NLC-REQ-034: Render from an x-axis, a y-axis and a z-axis range
- NLC-REQ-035: Draw the three axes in one documented, fixed viewing projection
- NLC-REQ-036: Label each of the three axes, with the supplied label or the axis name by default
- NLC-REQ-037: Plot each supplied point at its (x, y, z) coordinates within the projection
- NLC-REQ-038: Option to draw guide lines from a point to its position on the x,y plane
- NLC-REQ-039: Tick spacing for each of the three axes

**Prior Art:**
- Read: `.gener8v/specifications/number-lines-and-coordinate-graphs.md` — x,y,z requirements, Behaviors & Rules → Projection, Data Requirements for an x,y,z graph, OQ-003, OQ-007
- Read: `.gener8v/technical-design/system-design.md` — AD-009 (true isometric projection, shared with cubes and cylinders), AD-007, AD-010
- Read: `.gener8v/dependencies/dependency-map.md` — RES-003 (fixed 3D projection shared with GSS), RD-004
- Read: TICKET-001 output at `src/core/definitions/axis.ts`, `src/layout/kit/ticks.ts`, `src/layout/kit/axis.ts`
- Read: TICKET-002 output at `src/core/definitions/number-line.ts` — point property and `outside_axis_range` check pattern to reuse
- Read: `src/layout/kit/isometric.ts` — produced by `graph-library/geometric-shapes-and-solids/TICKET-001`; `isometric(x, y, z) → [x, y]` and its documented axis directions
- Read: `src/layout/registry.ts`, `src/react/createGraphComponent.tsx` — produced by `graph-library/component-packaging-and-source-export/TICKET-003`

**Acceptance Criteria:**
- [ ] `examples/xyz-graph.json` (x, y, z each 0..5, three labeled points, guide lines on) validates and renders identically through `<XyzGraph>` and `<Graph>`
- [ ] All axis and point positions are computed through `isometric()` from `src/layout/kit/isometric.ts`; the layout contains no projection math of its own
- [ ] The three axes are drawn with ticks per each axis's `tickSpacing` (or TICKET-001's default); ticks lie on their axis within 0.5 units of `isometric(value along that axis)` after scaling
- [ ] Each axis is labeled with `xAxisLabel`/`yAxisLabel`/`zAxisLabel` when supplied, otherwise "x", "y", "z"
- [ ] Each point plots at the projection of `(x, y, z)` within 0.5 units, with optional `label` and `color`
- [ ] With `guideLines: true`, each point gets a dashed line to `(x, y, 0)` and from there to the axes, so its depth can be read; with `guideLines: false` (default stated in the definition) none are drawn
- [ ] A point outside any of the three ranges is reported as `outside_axis_range` at its JSON Pointer path
- [ ] The generated text alternative states "three-dimensional coordinate graph", the three ranges and every point with labels
- [ ] The projection is described in the definition's description text (which feeds the published schema and docs) as "isometric"
- [ ] `./xyz-graph` entry exists in `package.json` exports and `.size-limit.json`

**Output:**
- `src/core/definitions/xyz-graph.ts` — GraphTypeDefinition for `xyz-graph` (`xAxis`, `yAxis`, `zAxis`, axis labels, `points[]` `{x, y, z, label?, color?}`, `guideLines`, `title`, `textAlternative`; checks; `describe`), registered in `src/core/definitions/index.ts`
- `src/layout/xyz-graph.ts` — `layout(normalized) → Scene`, registered in `src/layout/registry.ts`
- `src/react/graphs/XyzGraph.tsx`; `src/entries/xyz-graph.ts`; `package.json` `exports["./xyz-graph"]`; `.size-limit.json` entry
- `examples/xyz-graph.json`; `examples/invalid/xyz-graph-outside-range.json`
- `tests/core/xyz-graph.test.ts` — proves validation, default axis labels and `outside_axis_range` criteria
- `tests/layout/xyz-graph.test.ts` — proves projection-only-via-kit, tick and point positions, guide-line and text-alternative criteria on Scene data

**Constraints:**
- prd/TC-010: 3D drawn in 2D SVG with a fixed projection
- prd/TC-002: `fmt()` on every projected coordinate (trigonometry is involved, so this is where engine differences would surface)

**Known Hazards:**
- AD-009 resolves spec OQ-003: the projection is true isometric, the same one cubes and cylinders use. Do NOT implement oblique/cabinet or a rotatable view, and do NOT write a second projection function here — import `isometric()` from the GSS kit (RES-003). If `src/layout/kit/isometric.ts` does not exist yet, this ticket is blocked; surface that rather than writing a local copy.
- Accuracy in NLC-NFR-001 is "within 0.5 px of its computed position" — for 3D, the computed position is the isometric projection, not the 3D value. Tests compare against `isometric()` output, not against linear scales.
- Spec OQ-007 (segments on x,y,z graphs) is unresolved — points only.
- Isometric axes can make tick labels on the y-axis and x-axis collide near the origin; route every label through `placeLabel` (AD-010).
- Carried from graph-library/graph-specification-and-vocabulary-ticket-001-code-review/CR-002 and graph-library/graph-specification-and-vocabulary-ticket-001-quality-review/QR-001, QR-002 (the definition contract, RES-001):
  - Build every properties map with `defineProperties` (`src/core/definitions/types.ts`), which freezes it and removes prototypes.
  - Never list a shared top-level option (`title`, `lineColor`, axis labels…) in `properties`: `propertiesOf(type)` adds it from its `appliesTo`.
  - Nest the shared `label`/`color` (or `lineLabel`/`lineColor` for series) spec objects themselves in element specs, exactly when `elementsOf` lists the type.
  - Import text helpers from `src/core/format.ts`, never `src/core/describe.ts` (lint enforces it).
  - In `describe`, pass every caller string through `quoteText`, and state measurements with `formatMeasurement(value, provenance, unit)` so supplied values appear as written and derived values rounded.
  - Register the definition in `src/core/definitions/index.ts`, and run the applicability and consistency checks in `tests/core/definitions.test.ts` against it.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-003-security-review/SEC-001 (Product Owner decision 2026-10-06): every `array` spec must set `maxItems` (the compiler requires it) to a curriculum-sized number. For example, at most 1,000 points or categories, or what the type's specification implies. A longer list is reported once as `too_large`. The whole description is capped at `DESCRIPTION_VALUE_LIMIT` (10,000 values, `src/core/validate/structure.ts`); keep every example well under both, and record the chosen limits in the definition's description text.

**Depends On:** TICKET-001
**Blocks:** TICKET-005

**Size:** Medium

**Notes:** Cross-area predecessors: `graph-library/geometric-shapes-and-solids/TICKET-001` (isometric kit, RES-003/RD-004), `graph-library/component-packaging-and-source-export/TICKET-003`, `graph-library/graph-specification-and-vocabulary/TICKET-004` (DEP-002).
