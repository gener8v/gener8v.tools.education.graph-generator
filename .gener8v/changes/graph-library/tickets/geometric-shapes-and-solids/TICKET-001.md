# TICKET-001: Isometric projection kit

**Change:** graph-library
**Capability Area:** Geometric Shapes & Solids (geometric-shapes-and-solids)
**Specification:** specifications/geometric-shapes-and-solids.md

**Summary:** Implement the one fixed isometric projection shared by cubes, cylinders and x,y,z coordinate graphs, as a pure function in the layout kit.
**Priority:** Must
**Value:** Every 3D figure in a curriculum is drawn from the same viewpoint, so cubes, cylinders and 3D graphs look like one family.

**Requirements Covered:**
- GSS-REQ-032: Draw cubes and cylinders from one fixed, documented viewpoint shared by both solids

**Prior Art:**
- Read: `.gener8v/technical-design/system-design.md` — AD-009 (true isometric: axes 120° apart, equal foreshortening, ellipse minor/major ≈ 0.577), AD-007 (`fmt()` rounding), Layout kit component
- Read: `.gener8v/dependencies/dependency-map.md` — RES-003 (fixed 3D projection shared by NLC and GSS), RD-004
- Read: `src/layout/kit/format.ts` and `src/layout/scene.ts` — produced by graph-library/component-packaging-and-source-export/TICKET-002 (DEP-001 foundation; Scene model and `fmt`)

**Acceptance Criteria:**
- [ ] `isometric(x, y, z)` returns 2D drawing coordinates with the x, y and z axes projected 120° apart and equally foreshortened
- [ ] The module exports the isometric scale factor and the ellipse ratio used for horizontal circles, so callers and tests can remove the foreshortening
- [ ] Equal lengths along any of the three axes project to equal drawn lengths (unit test within 10⁻⁹)
- [ ] A helper projects a horizontal circle (center, radius) to ellipse parameters, with minor/major ratio within 10⁻⁶ of sin(35.264°)
- [ ] The projection is documented (angles, axis directions, which faces are visible) in the module's doc comment, as the documented viewpoint GSS-REQ-032 requires
- [ ] The module imports nothing from React and passes the import-boundary lint rule

**Output:**
- `src/layout/kit/isometric.ts` — `isometric(x, y, z): [number, number]`, `ISO_SCALE`, `isoEllipse(center, r)`, visible-face constants; consumed by TICKET-006, TICKET-007 and graph-library/number-lines-and-coordinate-graphs/TICKET-004
- `tests/layout/kit/isometric.test.ts` — proves equal foreshortening, 120° axes and the ellipse ratio

**Constraints:** prd/TC-010 (3D drawn in 2D SVG with a fixed projection), prd/TC-002 (callers round results with `fmt()`)

**Known Hazards:**
- The GSS specification's Assumptions say "one oblique-style projection"; AD-009 supersedes it with isometric. Implement isometric; do NOT implement oblique/cabinet.
- Do not round inside `isometric()`; rounding happens once when values are written into a Scene (AD-007), otherwise errors compound.

**Depends On:** None
**Blocks:** TICKET-006, TICKET-007

**Size:** Small

**Notes:** Cross-area predecessor graph-library/component-packaging-and-source-export/TICKET-002 (DEP-001). Also consumed by graph-library/number-lines-and-coordinate-graphs/TICKET-004 for x,y,z graphs (RES-003).
