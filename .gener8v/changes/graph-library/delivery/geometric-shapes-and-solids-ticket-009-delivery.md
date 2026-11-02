# TICKET-009: Build a three-sides triangle's third vertex without trigonometry — Delivery Record

## Ticket Reference

**Ticket:** graph-library/geometric-shapes-and-solids/TICKET-009
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/geometric-shapes-and-solids.md`
**Requirements Covered:**
- GSS-REQ-010: The system should draw a triangle from three side lengths
- GSS-NFR-002: Derived triangle sides and angles reproduce the supplied ones within 10⁻⁹ relative error — verified by the existing property-based round-trip test

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Predecessors TICKET-004, TICKET-005 delivered | delivery records | both Delivered and reviewed; `main` at `9c055c3` | ✅ |
| `modelVertices` places the third vertex with `cos`/`sin` | `src/layout/triangle.ts` | line 51: `[reach · cos(angle), reach · sin(angle)]`, the angle in degrees × `RADIANS` | ✅ |
| Kahan's area in the solver | `src/core/geometry/triangle-solver.ts` | `fourTimesArea(sides)` (line 92), not exported | ✅ — to export |
| Knowing a triangle was given by three sides | in the layout | the layout receives `provenance`; `sourceOf(provenance, "sideA")` etc. say which sides were supplied | ✅ |
| Pinned residual test and the property test | `tests/layout/engine-math.test.ts` | present (seeds 22 and 33; the residual "still draws the sides 18, 19.98, 14.13 triangle differently…") | ✅ |
| TR-008 amendment through Technical Design | Architect approval | TR-008 (amended 2026-10-29) says "vertices: `atan2`" | 🔁 To amend after delivery |

**Resolved from ground truth (not escalated):**
- *How the layout knows the set.* All three sides supplied (provenance), and no vertices.

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-11-02
**Implemented by:** sonnet · medium — routed as deliver-small from Tower

### Planned Files

- `src/core/geometry/triangle-solver.ts`: export `fourTimesArea`.
- `src/layout/triangle.ts` `modelVertices`: when all three sides were supplied and no vertices, the third vertex is x = (s² + b² − t²) ÷ 2b, y = `fourTimesArea` ÷ 2b — arithmetic and `sqrt` only, identical in every engine; other sets keep their construction; `@spec` gains CPSE-NFR-005.
- `tests/layout/engine-math.test.ts`: the pinned residual test replaced by one asserting the 18, 19.98, 14.13 triangle draws the same with `Math` ±1 and ±3 ulp; the property test also runs seed 8.
- `tests/layout/triangle.test.ts`: a focused test of the three-sides vertex, a needle-thin case near the 0.02° floor included.
- Measure how many sampled three-sides triangles' Node markup changes; a patch changeset if any.
- TR-008 amended afterwards through the Technical Design skill (Architect approval).

### How Acceptance Criteria Will Be Met

- Vertex from the sides, no trigonometry — the focused test and a mutant restoring `cos`/`atan2`.
- Residual gone — the replaced engine-math test and seed 8.
- GSS-NFR-002 and GSS-NFR-001 unchanged — their suites in the full loop.
- Changed output counted and stated — the measurement and changeset.
- TR-008 amended — the Technical Design run.

## Progress

- [x] `fourTimesArea` exported
- [x] `modelVertices` three-sides construction
- [x] `tests/layout/engine-math.test.ts`
- [x] `tests/layout/triangle.test.ts`
- [x] Changed-output count and changeset
- [x] TR-008 amendment

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/core/geometry/triangle-solver.ts`: `fourTimesArea` exported.
- `src/layout/triangle.ts`: `modelVertices(triangle, base, bySides)` places a three-sides triangle's third vertex at x = (s² + b² − t²) ÷ 2b, y = `fourTimesArea` ÷ 2b — arithmetic and `sqrt` only; `triangleLayout` passes `bySides` (no vertices, all three sides supplied); other sets keep `cos`/`sin`; `@spec` gains CPSE-NFR-005.
- `tests/layout/engine-math.test.ts`: the pinned residual test replaced by one asserting the 18, 19.98, 14.13 triangle draws the same with `Math` −3, −1, +1 and +3 ulp; seeds 8, 22 and 33.
- `tests/layout/triangle.test.ts`: the three-sides vertex equals the formula; a needle-thin three-sides triangle (about 0.02°) keeps a positive height and passes `checkScene` and the overlap check.
- `.gener8v/technical-design/system-design.md`: TR-008 amended (Architect — Thomas Eaves, 2026-11-02).
- `.gener8v/specifications/geometric-shapes-and-solids.md`: GSS-REQ-010 coverage row gains `modelVertices`.
- No changeset: no Node output changed (0 of 2,000 sampled three-sides triangles).

## Verification Run

Run in the main session on 2026-11-02, after the code was written; logs kept per command.

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm generate` / `pnpm lint` / `pnpm typecheck` | 0 / 0 / 0 | — |
| `npx vitest run --no-cache` ×3 | 0, 0, 0 | 2,344 passed each |
| `pnpm bench` | 0 | 25 passed |
| `pnpm build` / `check:dist` / `check:deps` / `check:images` / `check:changesets` / `size` / `publint` / `attw` | 0 each | — |
| `pnpm audit` / `pnpm audit --prod` | 1 / 0 | the accepted `minimatch` advisory (CPSE TICKET-004 SEC-002) |
| Formula check | — | 20,000 random three-sides triangles, every base: the new vertex differs from the `cos`/`sin` one by at most 1.9 × 10⁻¹⁴ (x) and 1.2 × 10⁻¹⁴ (y) relative |
| Changed output | — | 0 of 2,000 sampled three-sides triangles' Node markup (and 0 of an earlier 848) |
| Mutation check (restored) | — | `cos`/`sin` forced back → the 18, 19.98, 14.13 test and the seed-8 property test fail |
| `gener8v-state.py state` / `lint` | 0 / 0 | 0 errors, 0 warnings |

## Acceptance Criteria Verification

- [x] The three-sides third vertex is computed from the sides with no `cos`, `sin`, `atan2` or `hypot` — the focused test and the mutant.
- [x] The pinned residual test is replaced by one asserting the triangle draws the same at ±1 and ±3 ulp; the property test runs seed 8 — `tests/layout/engine-math.test.ts`.
- [x] GSS-NFR-002's round-trip and GSS-NFR-001's proportion tests pass unchanged — full suite ×3.
- [x] Changed Node markup measured and recorded — 0 of 2,000; no changeset needed.
- [x] TR-008 amended through the Technical Design skill, approved by the Architect.

## Decisions Made

### DEL-001: Which triangles change

**Decision:** Only a triangle whose three sides were all supplied (and no vertices) uses the new construction, as the ticket's hazard says; `triangleLayout` decides from the provenance.

## Deviations from Plan

None — implementation followed the approved plan.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| GSS-REQ-010, CPSE-NFR-005 | `src/layout/triangle.ts`:modelVertices | `@spec` line extended |

## Notes

- Closes the residual accepted under AD-007 in graph-library/component-packaging-and-source-export-ticket-004-code-review/CR-002.

## Post-Review Amendments

### graph-library/geometric-shapes-and-solids-ticket-009-code-review/CR-001, CR-002 (CR-003 noted, CR-004 accepted)

**Change:** The construction moved into the exported `thirdVertexFromSides(b, s, t)` (`src/layout/triangle.ts`), tested by its geometry: over 2,000 generated side triples the vertex lies s and t from the base's ends within 10⁻⁹ of the longest side, above the base. `@spec` GSS-REQ-010 added to `modelVertices` and the helper (correcting this record's `@spec` table, which listed it before it was there); coverage rows updated in both specifications. The Progress line for TR-008 ticked. Three-sides triangles stand on side a, so the other bases are unreachable today; sets with a derived side keep `cos`/`sin` (no change at ±1 ulp over 10,000 samples).
**Files:** `src/layout/triangle.ts`, `tests/layout/triangle.test.ts`, `.gener8v/specifications/component-packaging-and-source-export.md`, `.gener8v/specifications/geometric-shapes-and-solids.md`
**Re-verification:** full verification loop with logs — all exit 0 except `pnpm audit` (accepted); vitest ×3, 2,345 passed each; `pnpm bench` 25 passed. Mutant: the height off by 1 in 10⁷ → the distance test fails. gener8v-state lint 0 errors.

### graph-library/geometric-shapes-and-solids-ticket-009-quality-review/QR-001..QR-003

**Change:** QR-001 and QR-002 by the code-review change (`thirdVertexFromSides`, geometric test). QR-003: the needle-thin test checks the helper's height against the isosceles height; a new test asserts three sides plus an agreeing angle are placed from the sides (same polygon, same Scene at ±1 and ±3 ulp).
**Files:** `tests/layout/triangle.test.ts`
**Re-verification:** full verification loop with logs — all exit 0 except `pnpm audit` (accepted); vitest ×3, 2,346 passed each. Mutant: the agreeing-angle triangle sent down the `cos`/`sin` path → the new test fails. gener8v-state lint 0 errors.
