# TICKET-004: Triangle definition and solver — Delivery Record

## Ticket Reference

**Ticket:** graph-library/geometric-shapes-and-solids/TICKET-004
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/geometric-shapes-and-solids.md`
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
- GSS-NFR-002: Derived sides and angles reproduce supplied ones within 10⁻⁹ relative error — verified by a fast-check round-trip test over at least 1,000 generated non-degenerate triangles per determining set

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| No in-area predecessors; cross-area GSV TICKET-001, 002, 004 delivered | delivery records | all delivered and reviewed; `main` at `924688d` | ✅ |
| Stage 3 can derive the triangle's values "delegating to the solver" | a derivation contract for determining *sets* | `Derivation` (`src/core/definitions/types.ts:229`) is one-member-defines-all (`derive(term, value)`); `checkDerivations` (`src/core/validate/derive.ts`) picks one defining value; stage-4 checks get a frozen description and cannot add values | ⚠️ Shapes the plan — an optional stage-3 `solve` hook (DEL-001, Engineer decision 2026-10-29) |
| Derivation-group members are top-level number terms (carried GSV TICKET-004 CR-001) | — | the triangle uses no derivation group; the solver's outputs are top-level number terms, held to the same range rules | ✅ |
| `triangle` in `GRAPH_TYPES`; shared `title`, `lineColor` apply | `types.ts`, `shared.ts` | present (`FIGURES`) | ✅ |
| Issue codes `insufficient`, `ambiguous`, `not_a_triangle`, `contradiction`, `out_of_range` documented | `src/core/issues.ts` | all present with descriptions and messages | ✅ |
| Register the triangle in `src/core/definitions/index.ts` | registered | `tests/react/Graph.test.tsx:71-80` requires every registered type to have a layout and a per-type component; `tests/core/schema-agreement.test.ts` requires `examples/<type>.json`; the published schema and tool schema would advertise a type `createGraph` cannot draw | ⚠️ Registration moves to TICKET-005 with the layout (DEL-002, Engineer decision 2026-10-29) |
| Term names `sides`, `angles`, `vertices` | as in Output | none exist yet; TICKET-005 refers to the "first-named side" | ⚠️ Named terms `sideA..C`, `angleA..C` (DEL-003, Engineer decision 2026-10-29) |
| `describe.test.ts` "not registered" assertion uses `{ type: "triangle", sideA: 1 }` | still unregistered | stays true (registration in TICKET-005) | ✅ |
| fast-check available | dev dependency | used by existing property tests | ✅ |
| Carried: GSV TICKET-001 CR-002 / QR-001, QR-002 (definition contract) | honoured | — | 🔁 Carried |
| Carried: GSV TICKET-003 SEC-001 (`maxItems`) | `vertices` and `vertexNames` take `maxItems: 3` | — | 🔁 Carried |
| Carried: GSV TICKET-004 CR-003 / SEC-004 (domain checks: inputs, frozen, `createIssue`, work bounded by size) | honoured by the solver hook too | — | 🔁 Carried |
| Carried: GSV TICKET-005 CR-001 (rich example; `pnpm generate`) | the example and generated files come with registration in TICKET-005 | — | 🔁 Carried to TICKET-005 |
| Carried: GSS TICKET-002 CR-003 (provenance in `describe`), SEC-003 (`stateMeasurement`) | honoured | — | 🔁 Carried |
| Carried: GSV TICKET-007 (caller-text limits; `too_large` at 201) | honoured for `vertexNames` and `unit` | — | 🔁 Carried |
| Carried: side-effect-free `/* @__PURE__ */ defineTriangle()` | honoured | — | 🔁 Carried |

**Resolved from ground truth (not escalated):**
- *GSS OQ-004 (choose one SSA solution).* Open; implement rejection as `ambiguous`, no chooser property (Known Hazard).
- *GSS OQ-006 (radians).* Degrees only.
- *Where the shared `unit` term comes from.* `unitProperty` (`src/core/definitions/figure.ts`, GSS TICKET-003 SEC-001), shared by identity.

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-10-29
**Implemented by:** opus · high — routed as deliver-large from Tower

Shaped by three Engineer decisions taken before the plan (2026-10-29): a stage-3 `solve` hook (DEL-001), registration in TICKET-005 with the layout (DEL-002), named terms (DEL-003).

### Planned Files

- `src/core/definitions/types.ts`, `src/core/validate/solve.ts` (new), `src/core/validate/index.ts`: an optional `solve: Solver<D>` on `GraphTypeDefinition` — `inputs` (every term it reads) and `solve(values)` receiving a frozen view of the inputs that passed stage 2, returning `{ derived: Record<term, number> }` or `{ issues }` built with `createIssue`. It runs after the derivation groups and before the domain checks, and is skipped when any input failed stage 2 (no cascades). The validator adds derived values only for terms not supplied, with provenance `derived`. Outputs must be top-level number terms of the type; a derived value outside its own range is reported as `out_of_range` at the supplied value that set the scale. Contract tests in `tests/core/validate-solve.test.ts` (new); well-formed-solver rules in `tests/core/definitions.test.ts`.
- `src/core/geometry/triangle-solver.ts` (new): `solveTriangle(input) → { sides, angles, set } | Issue[]`. Vertices define everything when given; otherwise the first complete set in the order SSS, SAS, ASA/AAS, SSA. Values beyond the defining set are checked within 1% (`contradiction`). Law of cosines with `acos` arguments clamped to [−1, 1]; law of sines for ASA/AAS. Inequality (equals or exceeds; 3, 4, 7) → `contradiction` naming the three sides; supplied angles not summing to 180° within 1% → `contradiction`; three angles and no side → `insufficient`; SSA with two solutions → `ambiguous` stating both third sides, one solution accepted, none → `contradiction`; collinear or coincident vertices → `not_a_triangle`; too few values → `insufficient`.
- `src/core/definitions/triangle.ts` (new): `/* @__PURE__ */ defineTriangle()` — `sideA`, `sideB`, `sideC` (0.001 to 1,000,000; side a opposite vertex A), `angleA`, `angleB`, `angleC` (degrees, exclusive 0 and 180), `vertices` (up to 3 `{x, y}` within ±1,000,000, `maxItems: 3`), `vertexNames` (up to 3 strings, `maxLength` 200, `maxItems: 3`), shared `unitProperty`; `title` and `lineColor` from `propertiesOf`. `solve` delegates to the solver. `describe(triangle, provenance)` names the triangle and states its sides and angles with `stateMeasurement`, caller text through `quoteText`. **Not registered** in `src/core/definitions/index.ts`; tested against a test registry.
- `tests/core/triangle-solver.test.ts` (new): every set and failure case of the acceptance criteria.
- `tests/core/triangle-solver.property.test.ts` (new): GSS-NFR-002 round trip, ≥ 1,000 triangles per set, 10⁻⁹ relative.
- `tests/core/triangle.test.ts` (new): through `validateWith` — normalized sides and angles with supplied/derived provenance, no cascade (a non-numeric side gives one issue), 0° and 180° `out_of_range`, 201-character text `too_large`, vocabulary and consistency checks, the text alternative.
- `.gener8v/changes/graph-library/tickets/geometric-shapes-and-solids/TICKET-005.md`: a Known Hazard — TICKET-005 registers the triangle (definitions index, schema, example, `pnpm generate`) and adds the side and angle label options.
- `.gener8v/specifications/geometric-shapes-and-solids.md`: `@spec Coverage` rows.
- `.changeset/triangle-solver.md` (patch).

### How Acceptance Criteria Will Be Met

- Each determining set yields all three sides and angles with provenance: solver + `solve` hook; `tests/core/triangle.test.ts` per set.
- Extra values checked within 1% (`contradiction`): solver; solver and validator tests.
- 3, 4, 7 and 3, 4, 8 → `contradiction` naming the three sides: solver tests.
- Angle sum not 180° → `contradiction`: solver tests.
- Three angles, no side → `insufficient`: solver tests.
- SSA ambiguous (both third sides in the message) / one solution accepted / none → `contradiction`: solver tests.
- Collinear or coincident vertices → `not_a_triangle`: solver tests.
- 0° or ≥ 180° → `out_of_range`, degrees: definition ranges; `tests/core/triangle.test.ts`.
- GSS-NFR-002: `tests/core/triangle-solver.property.test.ts`, ≥ 1,000 runs per set.

## Progress

- [x] `src/core/definitions/types.ts`, `src/core/validate/solve.ts`, `src/core/validate/index.ts` (solve hook)
- [x] `tests/core/validate-solve.test.ts`, solver rules in `tests/core/definitions.test.ts`
- [x] `src/core/geometry/triangle-solver.ts`
- [x] `src/core/definitions/triangle.ts`
- [x] `tests/core/triangle-solver.test.ts`
- [x] `tests/core/triangle-solver.property.test.ts`
- [x] `tests/core/triangle.test.ts`
- [x] TICKET-005 Known Hazard; `@spec Coverage` rows; `.changeset/triangle-solver.md`

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/core/definitions/types.ts`: `SolverResult`, `Solver<D>` and the optional `solve` on `GraphTypeDefinition` (DEL-001).
- `src/core/validate/solve.ts` (new): `runSolver` — stage 3, after the derivation groups; skipped when an input failed; result checked for package defects; derived values added with provenance `derived`; out-of-range derived values reported at the `scale` value.
- `src/core/validate/index.ts`: calls `runSolver` between `checkDerivations` and `runDomainChecks`.
- `src/core/validate/domain.ts`: `assertIssue` exported, with a source label, for the solver's issues.
- `src/core/geometry/triangle-solver.ts` (new): `solveTriangle` and its types (`TriangleInput`, `TriangleSolution`, `TriangleSet`, …), consumed by TICKET-005.
- `src/core/definitions/triangle.ts` (new): `/* @__PURE__ */ defineTriangle()` — terms, `solve` wrapper with the ±1,000,000 vertex bound (`coordinateIssues`), `describe`. Not registered (DEL-002).
- `src/core/definitions/xy-graph.ts`: the shared `x` and `y` descriptions cover a triangle's vertex (DEL-004).
- `src/generated/description.ts`, `schema.json`, `tool-schema.json`, `vocabulary.json`: regenerated for the `x`/`y` wording only.
- `.changeset/triangle-solver.md` (new, patch): the clarified `x`/`y` wording.
- `tests/core/validate-solve.test.ts` (12), `tests/core/triangle-solver.test.ts` (23), `tests/core/triangle-solver.property.test.ts` (6, 1,000 runs each), `tests/core/triangle.test.ts` (15): new. `tests/core/definitions.test.ts`: well-formed-solver rules, a test that catches bad solvers, the triangle block.
- `.gener8v/changes/graph-library/tickets/geometric-shapes-and-solids/TICKET-005.md`: Known Hazard carrying DEL-002..004.
- `.gener8v/specifications/geometric-shapes-and-solids.md`: `@spec Coverage` rows for GSS-REQ-010..019 and GSS-NFR-002; `triangle.describe` added to 033 and 034.

## Verification Run

Run in the main session on 2026-10-29, after the code was written and after the main session's solver changes (Deviations).

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm generate` | 0 | stable; only the `x`/`y` wording differs from `main` |
| `pnpm lint` | 0 | — |
| `pnpm typecheck` | 0 | — |
| `npx vitest run --no-cache` ×3 | 0, 0, 1 | 1,814 passed, 1,814 passed, 1 failed of 1,814. Four further full runs: 1,814 passed each. The failing test was not captured and did not recur; the known candidates are the `tests/layout/kit/text.test.ts` timing test and a `dist/` rebuild race. The new property test was run 25 times alone (25,000 triangles per set): 0 failures. |
| `pnpm bench` | 0 | 16 passed |
| `pnpm build` | 0 | — |
| `pnpm check:dist` / `check:deps` / `check:images` / `check:changesets` | 0 / 0 / 0 / 0 | — |
| `pnpm size` | 0 | `./core` 27.12 kB of 40; `./xy-graph` 22.45 kB; `./circle` 17.51 kB; `./square` 17.17 kB |
| `pnpm publint` / `pnpm attw` | 0 / 0 | — |
| `pnpm audit` / `pnpm audit --prod` | 0 / 0 | No known vulnerabilities found |
| Round-trip probes (`MIN_ANGLE` 1°, 0.1°, 0.01°, sides to 1,000,000) | — | 1° and 0.1°: pass; 0.01°: relative error 1.0–1.7 × 10⁻⁹ in the test's own law-of-cosines recomputation |
| Mutation checks | — | caught: inequality "equals" accepted, angle-sum check off, collinearity off, extra-value check off, SSA no-solution branch off, the stable SSS angle replaced by a plain or clamped law-of-cosines form |
| `gener8v-state.py state` / `lint` | 0 / 0 | 0 errors, 0 warnings |

## Acceptance Criteria Verification

- [x] Each determining set (SSS, SAS, ASA/AAS, vertices) validates and yields all three sides and angles with provenance — `tests/core/triangle.test.ts` (through `validateWith`), `tests/core/triangle-solver.test.ts` "each determining set…".
- [x] Values beyond a set are checked within 1% and reported as `contradiction` — `triangle-solver.test.ts` "values beyond the determining set…"; `validate-solve.test.ts` (never overwrites a supplied value).
- [x] Sides 3, 4, 7 and 3, 4, 8 → `contradiction` naming the three sides — "the triangle inequality, equal not exceeding".
- [x] Angles not summing to 180° within tolerance → `contradiction` — "the angle sum".
- [x] Three angles and no side → `insufficient` — "too little to fix a triangle".
- [x] SSA: two solutions → `ambiguous` with both third sides in the message; one solution accepted; none → `contradiction` — "two sides and an angle not between them".
- [x] Collinear or coincident vertices → `not_a_triangle` — "vertices that form no triangle".
- [x] 0° or ≥ 180° → `out_of_range`, degrees — `triangle.test.ts`.
- [x] GSS-NFR-002: within 10⁻⁹ over ≥ 1,000 triangles per set — `triangle-solver.property.test.ts` (six sets incl. vertices and single-solution SSA; angles ≥ 0.1°, longest side 0.01 to 1,000,000).

## Decisions Made

### DEL-001: A stage-3 `solve` hook for values determined by sets of terms

**Context:** Stage 3 supports only one-member-defines-all groups; domain checks cannot add values.
**Decision (Engineer, 2026-10-29):** An optional `solve: Solver<D>` on a definition: `inputs`, `scaled`, and `solve(values) → { derived, scale } | { issues }`. It runs after the derivation groups and before the domain checks, only when none of its inputs failed; on issues, its supplied inputs are marked failed so no domain check reads them. Derived values are added for unsupplied terms only, with provenance `derived`. A derived value outside its own range is reported as `out_of_range` at `scale` with the range that keeps every scaled term in its own (mirroring `definingRange`), or, when no such range exists or the scale is not a number (vertices), as the derived term against its own range at the scale's path. A malformed result is a package defect (`internal_error`).
**Rationale:** Keeps AD-004's no-cascade staging and the provenance contract for figures defined by sets.
**Ticket Impact:** Touches the GSV validator core (`types.ts`, `validate/`), outside the ticket's Output.

### DEL-002: The triangle is registered by TICKET-005, with its layout

**Context:** Tests require every registered type to have a layout, a component and an example; the schema and tool schema would advertise an undrawable type.
**Decision (Engineer, 2026-10-29):** Defined and tested against test registries here; TICKET-005 registers it (Known Hazard added there).
**Ticket Impact:** Deviates from the Output's "registered in `src/core/definitions/index.ts`".

### DEL-003: Named terms

**Decision (Engineer, 2026-10-29):** `sideA`, `sideB`, `sideC` (side a opposite vertex A), `angleA`, `angleB`, `angleC` (degrees, exclusive 0 and 180), `vertices` (A, B, C as `{x, y}`, `maxItems: 3`), `vertexNames` (`maxItems: 3`, 200 characters each), shared `unitProperty`. Set order: vertices, SSS, SAS, ASA/AAS, SSA; the first complete set defines, the rest are statements. Side and angle label options belong to TICKET-005 (GSS-REQ-020).
**Ticket Impact:** Deviates from the Output's `sides`, `angles`.

### DEL-004: One shared `x`/`y` definition, reworded for a triangle's vertex

**Context:** The vertices' `{x, y}` clashed with the one-definition rule (GSV-REQ-015); the shared terms had no bounds and spoke only of axes.
**Decision (main session, 2026-10-29):** Reuse `coordinates` from `xy-graph.ts` (as the x,y,z graph does), reword `x`/`y` to cover a triangle's vertex, and bound vertex coordinates to ±1,000,000 in the triangle's `solve` wrapper (`out_of_range` at `/vertices/<i>/x|y`) before any solving. Public vocabulary text changes, so a patch changeset.
**Ticket Impact:** Generated files and a changeset in a ticket that otherwise changes nothing public.

### DEL-005: Numerical method and degeneracy margin

**Decision:** A relative margin of 10⁻¹² (`DEGENERATE`) separates flat from thin. SSS angles come from Kahan's stable Heron area and `atan2(4·area, (q − p)(q + p) + r²)`; SAS uses the half-angle law of cosines and `atan2`; SSA uses c = b·cos α ± √((a − h)(a + h)); vertex angles use `atan2`. No `acos` remains.
**Rationale:** TR-008 asked for a clamped `acos`. That avoids NaN but gives 0° for a valid needle-thin triangle (sides 0.0108, 922,646.5594, 922,646.5591, angle A ≈ 6.7 × 10⁻⁷°), which then read as "too flat". `atan2` never leaves its domain and keeps the tiny angle.
**Ticket Impact:** Supersedes TR-008's mitigation text for this solver.

### DEL-006: Issue shapes

**Decision:** Inequality: `contradiction` at the longest side, the other two as conflicts. Three angles off 180° (1%): `contradiction` at `/angleC` with `agreeingValue` 180 − A − B. First two supplied angles ≥ 180°: `contradiction`, strict. SSA with no solution: `contradiction` at the side opposite the angle. Ambiguous, too few values, three angles no side: at the root, term "triangle". Fewer than 3 vertices: `insufficient` at `/vertices`; coincident or collinear: `not_a_triangle` at `/vertices`. Every extra value is checked individually against the solution after the angle-sum check. The text alternative also states vertex positions for a vertex-given triangle.

## Deviations from Plan

- `src/core/validate/domain.ts` changed (not listed): `assertIssue` exported for the solver.
- The triangle's vocabulary, stage, applicability, consistency and frozen checks are in `tests/core/definitions.test.ts`, whose helpers are local, not in `triangle.test.ts`.
- Generated files and a changeset (DEL-004).
- Main session, after reading the subagent's code: replaced the SSS angle computation (clamped `acos`) with the stable `atan2` form (DEL-005) and added the needle-thin regression test; widened the round-trip test from angles ≥ 5° and sides to 1,000 to angles ≥ 0.1° and sides to 1,000,000.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| GSS-REQ-010 | `src/core/geometry/triangle-solver.ts`:fromThreeSides; `src/core/definitions/triangle.ts`:triangle, defineTriangle | `@spec GSS-REQ-010, …` |
| GSS-REQ-011 | `src/core/geometry/triangle-solver.ts`:fromTwoSidesAndIncluded; `triangle.ts`:triangle | `@spec GSS-REQ-011, …` |
| GSS-REQ-012 | `src/core/geometry/triangle-solver.ts`:fromTwoAnglesAndSide; `triangle.ts`:triangle | `@spec GSS-REQ-012, …` |
| GSS-REQ-013 | `src/core/geometry/triangle-solver.ts`:fromVertices; `triangle.ts`:triangle, coordinateIssues | `@spec GSS-REQ-013, …` |
| GSS-REQ-014 | `triangle-solver.ts`:solveTriangle, checked and every set; `src/core/validate/solve.ts`:runSolver; `triangle.ts`:describe | `@spec GSS-REQ-014, …` |
| GSS-REQ-015 | `triangle-solver.ts`:fromThreeSides | `@spec GSS-REQ-015` |
| GSS-REQ-016 | `triangle-solver.ts`:angleProblems, solveTriangle | `@spec GSS-REQ-016` |
| GSS-REQ-017 | `triangle-solver.ts`:solveTriangle | `@spec GSS-REQ-017` |
| GSS-REQ-018 | `triangle-solver.ts`:fromTwoSidesAndOther | `@spec GSS-REQ-018` |
| GSS-REQ-019 | `triangle-solver.ts`:fromVertices | `@spec GSS-REQ-019` |
| GSS-NFR-002 | `tests/core/triangle-solver.property.test.ts` | (test, in the `@spec Coverage` table) |

## Notes

- GSS OQ-004 stays open: SSA with two solutions is rejected; no chooser property.
- TICKET-005 must register the triangle; its Known Hazard lists everything that registration touches.
- The published `x`/`y` text mentions a triangle's vertex one ticket before the triangle is public.

## Post-Review Amendments

None
