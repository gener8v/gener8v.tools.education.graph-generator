# TICKET-004: Triangle definition and solver

**Change:** graph-library
**Capability Area:** Geometric Shapes & Solids (geometric-shapes-and-solids)
**Specification:** specifications/geometric-shapes-and-solids.md

**Summary:** Define the `triangle` type's four determining sets (three sides; two sides and included angle; two angles and a side; three vertices) and implement the solver that derives the remaining sides and angles and reports contradictions, insufficiency, ambiguity and degenerate input.
**Priority:** Must
**Value:** A developer can specify a triangle the way a textbook problem does, and impossible or ambiguous triangles are rejected with a precise explanation instead of being drawn wrong.

**Requirements Covered:**
- GSS-REQ-010: Triangle from three side lengths
- GSS-REQ-011: Triangle from two sides and the included angle
- GSS-REQ-012: Triangle from two angles and one side
- GSS-REQ-013: Triangle from three vertex coordinates
- GSS-REQ-014: Derive remaining sides and angles from the supplied set
- GSS-REQ-015: Triangle inequality violations reported as contradiction
- GSS-REQ-016: Angle sum not 180° (within tolerance) reported as contradiction
- GSS-REQ-017: Three angles with no side reported as insufficient
- GSS-REQ-018: Two sides and a non-included angle with two solutions reported as ambiguous, stating both third sides
- GSS-REQ-019: Collinear or coincident vertices reported as not forming a triangle
- GSS-NFR-002: Derived sides and angles reproduce supplied ones within 10⁻⁹ relative error when recomputed

**Prior Art:**
- Read: `.gener8v/specifications/geometric-shapes-and-solids.md` — GSS-REQ-010..019, GSS-NFR-002, Behaviors (determining sets; extra values are statements to check), Edge Cases (3, 4, 7 degenerate; SSA with one / no solution; angle 0° or ≥ 180°), OQ-004, OQ-006 (degrees only)
- Read: `.gener8v/technical-design/system-design.md` — AD-004 (stages 3–4: derivation then domain checks on stage-2-valid members), TR-008 (law of cosines, clamp `acos` arguments to [−1, 1])
- Read: `src/core/validate/derive.ts`, `src/core/validate/domain.ts`, `src/core/issues.ts` — produced by graph-library/graph-specification-and-vocabulary/TICKET-004 and TICKET-002
- Read: `src/core/definitions/types.ts` — produced by graph-library/graph-specification-and-vocabulary/TICKET-001

**Acceptance Criteria:**
- [ ] Each determining set (SSS, SAS, ASA/AAS, vertices) validates and yields all three sides and all three angles in the normalized description, with provenance supplied/derived
- [ ] Values supplied beyond a determining set are checked within the GSV 1% tolerance and reported as `contradiction` when they disagree
- [ ] Sides 3, 4, 7 (equality) and 3, 4, 8 return `contradiction` (triangle inequality) naming the three sides
- [ ] Supplied angles not summing to 180° within tolerance return `contradiction`
- [ ] Three angles and no side return `insufficient`
- [ ] SSA with two solutions returns `ambiguous` whose message states both possible third-side lengths; SSA with exactly one solution (right or obtuse given angle) is accepted; SSA with no solution returns `contradiction`
- [ ] Collinear or coincident vertices return `not_a_triangle`
- [ ] Angles of 0° or ≥ 180° return `out_of_range`; angles are in degrees
- [ ] Derived sides and angles reproduce the supplied ones within 10⁻⁹ relative error when recomputed, verified by a fast-check property round-trip test over at least 1,000 generated non-degenerate triangles per determining set (GSS-NFR-002)

**Output:**
- `src/core/geometry/triangle-solver.ts` — `solveTriangle(input) → { sides, angles } | Issue[]` for each determining set; consumed by TICKET-005
- `src/core/definitions/triangle.ts` — triangle GraphTypeDefinition (properties `sides`, `angles`, `vertices`, `vertexNames`, label options, `unit`; derivations and checks delegating to the solver; `describe`), registered in `src/core/definitions/index.ts`
- `src/core/issues.ts` — confirm `not_a_triangle`, `ambiguous`, `insufficient` codes are documented
- `tests/core/triangle-solver.test.ts` — determining sets, inequality, angle sum, insufficient, SSA cases, collinear, range
- `tests/core/triangle-solver.property.test.ts` — GSS-NFR-002 round trip

**Constraints:** None identified beyond the GSV validation contract

**Known Hazards:**
- Stage ordering (AD-004): run the solver only on properties that passed structural checks; a non-numeric side must not also produce a triangle-inequality issue.
- `Math.acos` of a value a hair outside [−1, 1] returns NaN near degenerate triangles (TR-008): clamp before calling.
- GSS OQ-004 (let a description choose one SSA solution) is open; implement rejection as specified, do not add a chooser property.
- Degenerate means "equals, not exceeds": sides 3, 4, 7 must be rejected even though the sum is equal.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-001-code-review/CR-002 and graph-library/graph-specification-and-vocabulary-ticket-001-quality-review/QR-001, QR-002 (the definition contract, RES-001):
  - Build every properties map with `defineProperties` (`src/core/definitions/types.ts`), which freezes it and removes prototypes.
  - Never list a shared top-level option (`title`, `lineColor`, axis labels…) in `properties`: `propertiesOf(type)` adds it from its `appliesTo`.
  - Nest the shared `label`/`color` (or `lineLabel`/`lineColor` for series) spec objects themselves in element specs, exactly when `elementsOf` lists the type.
  - Import text helpers from `src/core/format.ts`, never `src/core/describe.ts` (lint enforces it).
  - In `describe`, pass every caller string through `quoteText`, and state measurements with `formatMeasurement(value, provenance, unit)` so supplied values appear as written and derived values rounded.
  - Register the definition in `src/core/definitions/index.ts`, and run the applicability and consistency checks in `tests/core/definitions.test.ts` against it.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-003-security-review/SEC-001 (Product Owner decision 2026-10-06): every `array` spec must set `maxItems` (the compiler requires it) to a curriculum-sized number. For example, at most 1,000 points or categories, or what the type's specification implies. A longer list is reported once as `too_large`. The whole description is capped at `DESCRIPTION_VALUE_LIMIT` (10,000 values, `src/core/validate/structure.ts`); keep every example well under both, and record the chosen limits in the definition's description text.

**Depends On:** None
**Blocks:** TICKET-005

**Size:** Large

**Notes:** Cross-area predecessors graph-library/graph-specification-and-vocabulary/TICKET-001, TICKET-002, TICKET-004 (DEP-004). Large because four determining sets and their failure modes are one coherent solver; splitting by set would duplicate the shared derivation and checking path.
