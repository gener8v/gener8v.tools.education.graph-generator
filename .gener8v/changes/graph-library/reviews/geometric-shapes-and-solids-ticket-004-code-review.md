# TICKET-004: Triangle definition and solver — Code Review

## Summary

Reviewed the triangle definition, solver and the stage-3 `solve` hook delivered in `5c3449d` against GSS TICKET-004, GSS-REQ-010..019, GSS-NFR-002, AD-004 and TR-008. Every acceptance criterion and requirement is satisfied; the Verification Run reproduces (one known timing flake in `tests/layout/kit/text.test.ts` on the first full run; the rerun passed 1,814 of 1,814). Probes of every determining set and failure case behaved as specified. Four findings, none blocking: one Issue (stale `@spec Coverage` rows) and three Observations.

**Delivery Record:** `.gener8v/changes/graph-library/delivery/geometric-shapes-and-solids-ticket-004-delivery.md`
**Files Reviewed:**
- `src/core/geometry/triangle-solver.ts`
- `src/core/definitions/triangle.ts`
- `src/core/definitions/types.ts`
- `src/core/validate/solve.ts`
- `src/core/validate/index.ts`
- `src/core/validate/domain.ts`
- `src/core/definitions/xy-graph.ts`
- `src/generated/description.ts`, `src/generated/schema.json`, `src/generated/tool-schema.json`, `src/generated/vocabulary.json`
- `.changeset/triangle-solver.md`
- `tests/core/triangle-solver.test.ts`, `tests/core/triangle-solver.property.test.ts`, `tests/core/triangle.test.ts`, `tests/core/validate-solve.test.ts`, `tests/core/definitions.test.ts`
- `.gener8v/specifications/geometric-shapes-and-solids.md` (`@spec Coverage`)

**Findings:** 4
**Critical:** 0 | **Issues:** 1 | **Observations:** 3

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| Each determining set (SSS, SAS, ASA/AAS, vertices) validates and yields all three sides and angles with provenance supplied/derived | Yes | `src/core/geometry/triangle-solver.ts`:solveTriangle and the `from…` functions; `src/core/validate/solve.ts`:runSolver adds derived terms with provenance `derived`. Probe through `validateWith` with the triangle in a test registry: 3,4,5 gave `angle*` derived, `side*` supplied. `tests/core/triangle.test.ts` "each determining set…" |
| Values beyond a determining set are checked within 1% and reported as `contradiction` | Yes | `triangle-solver.ts`:checked (uses `withinTolerance`); probes: vertices plus `angleC: 50` gave `contradiction /angleC`; 5.04 against 5 within tolerance, 5.5 reported |
| Sides 3, 4, 7 and 3, 4, 8 return `contradiction` naming the three sides | Yes | `triangle-solver.ts`:fromThreeSides; probe 3,4,7 gave `contradiction /sideC` conflicting with sideA, sideB |
| Supplied angles not summing to 180° within tolerance return `contradiction` | Yes | `triangle-solver.ts`:angleProblems; probe 30, 60, 80 gave `contradiction /angleC` |
| Three angles and no side return `insufficient` | Yes | `triangle-solver.ts`:solveTriangle final branch; probe 30, 60, 90 gave `insufficient` |
| SSA two solutions give `ambiguous` stating both third sides; one solution (right or obtuse) accepted; none gives `contradiction` | Yes | `triangle-solver.ts`:fromTwoSidesAndOther; probes: a=5, b=8, A=30 gave ambiguous "9.93 … 3.93"; a=4 (right) and a=9, A=100 (obtuse) accepted; a=3 and a=8, A=100 gave contradiction |
| Collinear or coincident vertices return `not_a_triangle` | Yes | `triangle-solver.ts`:fromVertices; probes: collinear and coincident gave `not_a_triangle /vertices` |
| Angles of 0° or ≥ 180° return `out_of_range`; degrees | Yes | `triangle.ts`:angle (exclusive 0 and 180); probe `angleA: 0` gave `out_of_range /angleA` |
| Round trip within 10⁻⁹ over ≥ 1,000 triangles per determining set (fast-check) | Yes, for angles ≥ 0.1° (see CR-003) | `tests/core/triangle-solver.property.test.ts` (six properties, `numRuns: 1_000`); passes in the full run |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| GSS-REQ-010 | Triangle from three sides | `triangle-solver.ts`:fromThreeSides | Yes |
| GSS-REQ-011 | Two sides and included angle | `triangle-solver.ts`:fromTwoSidesAndIncluded | Yes |
| GSS-REQ-012 | Two angles and one side | `triangle-solver.ts`:fromTwoAnglesAndSide | Yes |
| GSS-REQ-013 | Three vertex coordinates | `triangle-solver.ts`:fromVertices; `triangle.ts`:coordinateIssues, `vertices` term | Yes |
| GSS-REQ-014 | Derive remaining sides and angles | `triangle-solver.ts`:solveTriangle, checked; `solve.ts`:runSolver | Yes |
| GSS-REQ-015 | Triangle inequality as contradiction | `triangle-solver.ts`:fromThreeSides | Yes |
| GSS-REQ-016 | Angle sum as contradiction | `triangle-solver.ts`:angleProblems | Yes |
| GSS-REQ-017 | Three angles, no side: insufficient | `triangle-solver.ts`:solveTriangle | Yes |
| GSS-REQ-018 | SSA ambiguous, both third sides | `triangle-solver.ts`:fromTwoSidesAndOther | Yes |
| GSS-REQ-019 | Collinear or coincident vertices | `triangle-solver.ts`:fromVertices | Yes |
| GSS-NFR-002 | 10⁻⁹ relative round trip, ≥ 1,000 per set | `tests/core/triangle-solver.property.test.ts` (ran in the Verification Run, passes) | Yes (scoped to angles ≥ 0.1°, CR-003) |

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| TC-007 | Side-effect-free modules for per-type tree-shaking | Yes | `triangle.ts` built by `/* @__PURE__ */ defineTriangle()` with `@__NO_SIDE_EFFECTS__`; not yet in any entry; `pnpm size` passes |
| TC-005 | Validation must not load React or browser globals | Yes | `solve.ts`, `triangle-solver.ts` import only core modules |
| CC-002 | Text alternative for every graph | Yes (for this ticket's part) | `triangle.ts`:describe states sides, angles, vertex positions and names |
| GSV validation contract (ticket Constraints) | Staged, no cascades, `createIssue`, bounded work, `maxItems`, caller-text limits | Yes | `runSolver` skips on a failed input and routes issues through `assertIssue`; `vertices` and `vertexNames` `maxItems: 3`; names `CALLER_TEXT_LIMIT`, `unit` via `unitProperty`; probe 4 names gave `too_large` |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-004 | Staged validator, no cascades; derivation then domain checks on stage-2-valid members | Yes | `src/core/validate/index.ts` calls `runSolver` between `checkDerivations` and `runDomainChecks`; solver skipped when an input failed (probe: a non-numeric vertex coordinate gave one `wrong_kind`). Extends AD-004 with a solver hook (DEL-001, Engineer decision) |
| AD-003 | One definition per type is the single source | Yes | `defineTriangle()` with `defineProperties`, shared `coordinates` and `unitProperty`; generated files regenerated, `pnpm generate` stable |
| TR-008 | Clamp `acos` arguments to [−1, 1] | Partial (deviation, DEL-005) | No `acos`; `atan2` forms used, so no NaN and no false "too flat". Mitigation intent met by other means, see CR-004 |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| GSS-REQ-010 | `@spec GSS-REQ-010` | `triangle-solver.ts`:fromThreeSides; `triangle.ts`:triangle, defineTriangle | Yes |
| GSS-REQ-011 | `@spec GSS-REQ-011` | `triangle-solver.ts`:fromTwoSidesAndIncluded; `triangle.ts`:triangle | Yes |
| GSS-REQ-012 | `@spec GSS-REQ-012` | `triangle-solver.ts`:fromTwoAnglesAndSide; `triangle.ts`:triangle | Yes |
| GSS-REQ-013 | `@spec GSS-REQ-013` | `triangle-solver.ts`:fromVertices; `triangle.ts`:coordinateIssues, triangle | Yes |
| GSS-REQ-014 | `@spec GSS-REQ-014` | `triangle-solver.ts`:checked, solveTriangle and each `from…`; `solve.ts`:runSolver; `triangle.ts`:describe | Yes |
| GSS-REQ-015 | `@spec GSS-REQ-015` | `triangle-solver.ts`:fromThreeSides | Yes |
| GSS-REQ-016 | `@spec GSS-REQ-016` | `triangle-solver.ts`:angleProblems, solveTriangle | Yes |
| GSS-REQ-017 | `@spec GSS-REQ-017` | `triangle-solver.ts`:solveTriangle | Yes |
| GSS-REQ-018 | `@spec GSS-REQ-018` | `triangle-solver.ts`:fromTwoSidesAndOther | Yes |
| GSS-REQ-019 | `@spec GSS-REQ-019` | `triangle-solver.ts`:fromVertices | Yes |

**Coverage:** 10 of 10 requirements annotated
**Missing:** None. One placement note: the `@spec` above `defineTriangle` (`src/core/definitions/triangle.ts:97`) is separated from the function by the `/* @__NO_SIDE_EFFECTS__ */` line (CR-001)
**Specification table:** Partly. The GSS `## @spec Coverage` rows for GSS-REQ-010, 011 and 012 list `solveTriangle`, whose annotation does not carry them; the GSV rows for GSV-REQ-036 and GSV-REQ-038 do not list `src/core/validate/solve.ts`:runSolver, which is annotated with them (CR-001)

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm generate` | 0 (no file changed) | Yes |
| `pnpm lint` | 0 | Yes |
| `pnpm typecheck` | 0 | Yes |
| `npx vitest run --no-cache` | 1 on the first run: the known timing flake `tests/layout/kit/text.test.ts` "stops early, so caller-sized text costs little"; rerun 0, 1,814 passed | Yes (record also lists one non-recurring failure) |
| `pnpm bench` | 0 (16 passed) | Yes |
| `pnpm build` | 0 | Yes |
| `pnpm check:dist` / `check:deps` / `check:images` / `check:changesets` | 0 / 0 / 0 / 0 | Yes |
| `pnpm size` | 0 | Yes |
| `pnpm publint` / `pnpm attw` | 0 / 0 | Yes |
| `pnpm audit` / `pnpm audit --prod` | 0 / 0 | Yes |

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | A solver hook is the smallest way to give stage 3 sets of terms; it keeps AD-004 staging, `createIssue`, provenance and no-cascade. `checkedResult` guards the contract. Touches the GSV core, recorded in the ticket impact |
| DEL-002 | Reasonable | Registering earlier would advertise an undrawable type (tests require layout, component, example). Known Hazard added to TICKET-005 covering the registration checklist and the tests that assert "not registered" |
| DEL-003 | Reasonable | Named terms are what TICKET-005's "first-named side" needs. The label options are deferred to TICKET-005 (GSS-REQ-020), which owns them |
| DEL-004 | Reasonable, minor risk | Reuses `coordinates` (one definition, GSV-REQ-015) and bounds vertices in the wrapper. Published `x`/`y` text mentions a vertex before the triangle is public; mitigated by a patch changeset and a delivery note |
| DEL-005 | Reasonable | `atan2`/Kahan forms fix a real failure (needle-thin valid triangle read as flat). Contradicts the ticket Known Hazard's "clamp `acos`" literally but meets its intent (CR-004) |
| DEL-006 | Reasonable | Issue shapes are consistent and probes show the paths and messages name the right terms |

## Findings

### CR-001: Specification `@spec Coverage` rows are stale for three GSS rows and two GSV rows

**Severity:** Issue
**Location:** `.gener8v/specifications/geometric-shapes-and-solids.md` (rows GSS-REQ-010, 011, 012); `.gener8v/specifications/graph-specification-and-vocabulary.md` (rows GSV-REQ-036, GSV-REQ-038); `src/core/definitions/triangle.ts:97`
**Traces To:** Code Review step 8 (the `## @spec Coverage` table must match the annotated locations); CLAUDE.md traceability rule
**Description:** The GSS rows for GSS-REQ-010, 011 and 012 list `solveTriangle`, but its annotation reads `GSS-REQ-014, GSS-REQ-016, GSS-REQ-017, GSV-REQ-038`; only the `from…` functions carry 010..012. Either the rows or the annotation is wrong. `src/core/validate/solve.ts`:runSolver is annotated `GSV-REQ-036, 038` but the GSV specification's rows for those requirements list only `src/core/validate/derive.ts`. Separately, the `@spec` for `defineTriangle` sits above a `/* @__NO_SIDE_EFFECTS__ */` line rather than directly above the function.
**Impact:** `grep -rn "@spec"` and the coverage table disagree, so an audit of traceability reports false gaps or false coverage.
**Recommendation:** Drop `solveTriangle` from the GSS-REQ-010..012 rows (or add the IDs to its annotation); add `src/core/validate/solve.ts`:runSolver to the GSV-REQ-036 and 038 rows; keep the `@spec` and `@__NO_SIDE_EFFECTS__` comments adjacent in the order the other definitions use.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-29). `solveTriangle` dropped from the GSS-REQ-010..012 rows; `src/core/validate/solve.ts`:runSolver added to the GSV-REQ-036 and GSV-REQ-038 rows. The `@spec` comment stays above `/* @__NO_SIDE_EFFECTS__ */`, the order `ruler.ts` and `square.ts` use, so the annotation sits with the definitions' existing pattern.

---

### CR-002: A partly supplied `vertices` list blocks an otherwise complete set of sides

**Severity:** Observation
**Location:** `src/core/geometry/triangle-solver.ts:338` (`solveTriangle`), `fromVertices:159`
**Traces To:** GSS-REQ-014, GSS Behaviors ("the determining sets"; "when given by vertices, derived from the coordinates")
**Description:** `solveTriangle` takes the vertex path whenever `vertices` is present. `{ sideA: 3, sideB: 4, sideC: 5, vertices: [] }` returns `insufficient /vertices … got 0`, although the sides alone determine the triangle; a list of one or two vertices does the same. Probe via `validateWith` confirmed it. This follows the documented "vertices are used when given" order and DEL-003, and the message tells the caller what to fix, so it is defensible, but an empty list reads as "not given" to many callers.
**Impact:** A model that emits an empty `vertices` list gets a rejection it could be told to ignore. No incorrect drawing results.
**Recommendation:** Either treat an empty `vertices` list as absent, or keep the behavior and state in the `vertices` description that an incomplete list is an error even when sides are supplied. Decide before TICKET-005 fixes the example and docs.
**Status:** Resolved
**Resolution:** Kept, documented (Engineer — Thomas Eaves, 2026-10-29). The `vertices` description now says a list of fewer than three is an error even when the sides or angles alone would determine the triangle.

---

### CR-003: GSS-NFR-002 is verified only for angles of at least 0.1°, though the definition accepts any angle above 0°

**Severity:** Observation
**Location:** `tests/core/triangle-solver.property.test.ts:18` (`MIN_ANGLE`), `:31` (stale comment "at least 5°")
**Traces To:** GSS-NFR-002 ("valid triangles"), acceptance criterion 9, TR-008
**Description:** The property test generates triangles with every angle at least 0.1°. The delivery record found 1.0 to 1.7 × 10⁻⁹ at 0.01° and attributes it to the test's own law-of-cosines recomputation, not the solver. A probe here (ASA to SSS and SAS cross-solve at angles 0.1° to 10⁻⁵°, longest side 10⁶) showed relative disagreement far below 10⁻⁹ down to 0.001° and about 4 × 10⁻⁶ at 10⁻⁵°, which is the ill-conditioning of recovering an angle from rounded sides, not evidence of a solver defect. The vertex path accepts a triangle with angles near 10⁻⁷° (probe). The `triangles` JSDoc still says "at least 5°".
**Impact:** The NFR is evidenced for the range tests can recompute; thinner valid triangles are covered by the needle-thin regression test but not by the 10⁻⁹ round trip. No failing case found.
**Recommendation:** Fix the stale "5°" comment. State the 0.1° floor in the specification's NFR notes or the triangle description, or add a cross-method round trip for thinner angles that does not rely on the lossy recomputation.
**Status:** Resolved
**Resolution:** Fixed with QR-001 (Engineer — Thomas Eaves, 2026-10-29). The property test recomputes each value in a form well conditioned for its triangle: a side by the half-angle law of cosines; an angle from the three sides by Kahan's area and `atan2` when no angle is obtuse, else as 180° minus the other two. The floor moved from 0.1° to 0.02° (60,000 triangles per set at 0.02° without a miss; 0.01° missed about one run in twenty by 1.0014 × 10⁻⁹; from 0.001° down, the inputs' own rounding gives 1.2–2.5 × 10⁻⁹). The floor is stated in the test header, the angle descriptions and the GSS-NFR-002 coverage row; the stale "5°" comment is fixed.

---

### CR-004: TR-008's mitigation text and the ticket Known Hazard still say "clamp `acos`"; the solver uses `atan2`

**Severity:** Observation
**Location:** `.gener8v/technical-design/system-design.md` (TR-008); `src/core/geometry/triangle-solver.ts:79-90` (`cosineAngle`)
**Traces To:** TR-008, TICKET-004 Known Hazards ("clamp before calling `Math.acos`"), DEL-005
**Description:** DEL-005 replaced clamped `acos` with Kahan's area and `atan2` because a clamped `acos` reported a valid needle-thin triangle (sides 0.0108, 922,646.5594, 922,646.5591) as too flat. The intent of the hazard (no NaN near degenerate triangles) is met, no `Math.acos` remains, and tests pin the case. The design document still prescribes the clamp, so a later maintainer following TR-008 could reintroduce it.
**Impact:** Documentation drift only.
**Recommendation:** Amend TR-008's mitigation via the Technical Design skill to name the `atan2` form, or leave a note that DEL-005 supersedes it.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-29). TR-008's Mitigation amended through the Technical Design skill to name the `acos`-free method and the 0.02° floor, with an amendment note citing DEL-005 and this finding; the system design was re-approved (Architect — Thomas Eaves, 2026-10-29). The delivered ticket's Known Hazard is left as written (a delivered ticket file is not rewritten).

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Fix | Corrected the GSS-REQ-010..012 and GSV-REQ-036/038 coverage rows | `.gener8v/specifications/geometric-shapes-and-solids.md`, `.gener8v/specifications/graph-specification-and-vocabulary.md` |
| CR-002 | Keep, document | `vertices` description states an incomplete list is an error | `src/core/definitions/triangle.ts` |
| CR-003 | Fix (with QR-001) | Well-conditioned oracle; floor 0.02°, stated | `tests/core/triangle-solver.property.test.ts`, `src/core/definitions/triangle.ts`, `.gener8v/specifications/geometric-shapes-and-solids.md` |
| CR-004 | Fix | TR-008 Mitigation amended; design re-approved | `.gener8v/technical-design/system-design.md` |
| CR-001 | — | — | — |
| CR-002 | — | — | — |
| CR-003 | — | — | — |
| CR-004 | — | — | — |

## Verdict

**Result:** Approved
**Unresolved Findings:** None
**Notes:** Findings phase only. All acceptance criteria and requirements are met and the Verification Run reproduces. CR-001 (table and annotation drift) should be fixed before the ticket is marked complete; CR-002 is best decided before TICKET-005 writes the triangle example and docs.
