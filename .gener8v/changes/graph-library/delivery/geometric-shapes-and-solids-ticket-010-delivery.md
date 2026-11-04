# TICKET-010: Hold the triangle round trip to 10⁻⁹ just above the 0.02° floor for two sides and the included angle — Delivery Record

## Ticket Reference

**Ticket:** graph-library/geometric-shapes-and-solids/TICKET-010
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/geometric-shapes-and-solids.md`
**Requirements Covered:**
- GSS-NFR-002: Derived triangle sides and angles reproduce the supplied ones within 10⁻⁹ relative error — verified by the property-based round-trip test (at least 1,000 triangles per determining set)
- GSS-REQ-011: Draw a triangle from two side lengths and the angle between them
- GSS-REQ-014: Derive the remaining side lengths and angles from whichever determining set was supplied

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Predecessor TICKET-004 delivered | delivery record | Delivered and reviewed | ✅ |
| `fromTwoSidesAndIncluded` | `src/core/geometry/triangle-solver.ts:242` | present at line 242 | ✅ |
| Property test "two sides and the angle between them" | `tests/core/triangle-solver.property.test.ts`, unseeded | line 112, supplies `sideB`, `sideC`, `angleA`, unseeded | ✅ |
| Counterexample reproduces | a miss over 10⁻⁹ | probe: `angleA` recomputed as 180° − B − C = 0.020100000026289422, relative error **1.31 × 10⁻⁹**; `sideB`, `sideC` round-trip exactly | ✅ reproduced |
| TR-008, GSS-NFR-002 text | 10⁻⁹ for every angle ≥ 0.02° | as stated | ✅ |

**Root cause (probe, 2026-11-04):** the derived angles B and C come from `atan2(sᵢ·sin A, sⱼ − sᵢ·cos A)`. With the two given sides nearly equal (16,590.79 and 16,594.03) and A tiny (0.0201°), `sⱼ − sᵢ·cos A` (about 3.24) cancels: the rounding of the product `sᵢ·cos A` (about 3.6 × 10⁻¹² absolute) survives the subtraction. B and C come back with relative errors 1.63 × 10⁻¹³ and 1.37 × 10⁻¹³, so the sum B + C misses 180° − A by 2.6 × 10⁻¹¹. The test recomputes A (the triangle is obtuse) as 180° − B − C, so that absolute error over A = 0.0201° gives 1.31 × 10⁻⁹. The supplied inputs are not the limit: written as `(sⱼ − sᵢ) + 2·sᵢ·sin²(A/2)`, the denominator has no cancellation (`sⱼ − sᵢ` is exact for close sides by Sterbenz's lemma; the second term is positive), so the solver can hold 10⁻⁹ and no tolerance amendment is needed.

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-11-04
**Implemented by:** sonnet · medium — routed as deliver-small from Tower

Starts on `ticket/graph-library-gss-010` once CPSE TICKET-005's review fixes are on `main`.

### Planned Files

- `src/core/geometry/triangle-solver.ts`, `fromTwoSidesAndIncluded`: `angleI = atan2(si·sin A, (sj − si) + 2·si·sin²(A/2))`, `angleJ = atan2(sj·sin A, (si − sj) + 2·sj·sin²(A/2))`, reusing `half` = sin(A/2) already computed for the third side; a comment saying why, citing this ticket.
- `tests/core/triangle-solver.property.test.ts`: a pinned regression — the seed-875653159 triangle round-trips to 10⁻⁹ (fails before the fix: 1.31 × 10⁻⁹); a near-floor SAS generator — `angleA` in [0.0201°, 0.05°] with nearly equal sides, 1,000 runs, unseeded. The property test stays unseeded; `RELATIVE` stays 10⁻⁹.

Verify: the property file ×20 runs plus a near-floor stress (scratch, 100,000); `tests/layout/triangle.test.ts`, `tests/layout/engine-math.test.ts`; count SAS markup changes across the examples and fixtures, and add a patch changeset if any changed. Record the error before and after and the cause.

### How Acceptance Criteria Will Be Met

- Counterexample pinned, error and missing value stated: the pinned regression test; Pre-Flight Reconciliation (1.31 × 10⁻⁹, `angleA`).
- Root cause named with a probe: Pre-Flight Reconciliation; the probe is kept in the Verification Run.
- Solver fixed for every set to 10⁻⁹ at ≥ 0.02°: the property file run 20 times, the near-floor generator, and the 100,000-triangle stress.
- Not seeded, no tolerance loosened: the diff of the property test.

## Progress

- [x] `src/core/geometry/triangle-solver.ts` — written
- [x] `tests/core/triangle-solver.property.test.ts` — written

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/core/geometry/triangle-solver.ts`: `fromTwoSidesAndIncluded` writes the atan2 x distance `sj − si·cos A` as `(sj − si) + 2·si·sin²(A/2)` (and the same for the other angle), reusing `half`; a comment says why.
- `tests/core/triangle-solver.property.test.ts`: the pinned counterexample; a near-floor SAS property (A in [0.0201°, 0.05°]) and a second with B ≈ C (`share` in [0.49, 0.51]), 1,000 runs each, unseeded; `triangles` gains a `share` parameter.

## Verification Run

| Command | Exit | Evidence |
|---------|------|----------|
| probe (Pre-Flight): `solveTriangle({ sideB: 16590.79378447575, sideC: 16594.032272024426, angleA: 0.0201 })`, A recomputed as 180° − B − C | — | before: relative error 1.3079 × 10⁻⁹ on `angleA` (B 1.63 × 10⁻¹³, C 1.37 × 10⁻¹³) |
| `npx vitest run --no-cache tests/core/triangle-solver.property.test.ts` before the fix | 1 | the pinned test fails (1.3079e-9 on angleA); the near-floor property fails (1.0004e-9 on angleA, sides 0.30328/0.30328, seed -2016579945) |
| the same, after the fix, 20 runs (implementer) + 3 runs (after the `share` refactor) | 0 | 20/20 and 3/3 passed, 8 tests each |
| scratch stress, 100,000 SAS triangles, A in [0.0201°, 0.1°], old vs new formula (`scratchpad/gss010/stress.mts`) | 0 | max error on `angleA` 1.907 × 10⁻⁹ → 2.08 × 10⁻¹²; over 10⁻⁹: 180 → 0; `sideB`, `sideC` ≤ 3.9 × 10⁻¹⁶ both |
| scratch stress, 20,000 per determining set, full generator, after | 0 | worst SSS 5.4e-16, SAS 1.8e-13, ASA 8.2e-13, AAS 7.8e-13, SSA 1.1e-13; none over 10⁻⁹ |
| markup comparison, old vs new source (`scratchpad/gss010/markup.mts`): `examples/triangle-sas.json`, 15 SAS fixtures, 3,000 random SAS descriptions | 0 | 0 of 3,016 markups changed (scene numbers differ in the last digits for 675, hidden by rounding); no changeset |
| full verification loop (`pnpm generate`, `lint`, `typecheck`, vitest ×3, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `check:changesets`, `size`, `publint`, `attw`, `audit --prod`, state, lint) | 0 | vitest 2,426 passed ×3; bench 25 passed |
| `pnpm audit` | 1 | the accepted dev-only `minimatch` advisory (CPSE TICKET-004 SEC-002) |

## Acceptance Criteria Verification

- [x] The counterexample is pinned as a regression test; the record states its error (1.31 × 10⁻⁹) and the value that misses (`angleA`, recomputed from the derived B and C) — the pinned test, failing before and passing after.
- [x] The root cause is named with a reproducing probe — Pre-Flight Reconciliation; the probe row above.
- [x] The solver is fixed so the round trip holds to 10⁻⁹ for every set at ≥ 0.02° — the property file (all five sets, 1,000 each, plus the two near-floor properties) passed 23 of 23 runs; the 100,000-triangle near-floor stress and 20,000 per set found none over 10⁻⁹. No tolerance amendment was needed.
- [x] Not seeded; no tolerance loosened — `RELATIVE` stays 10⁻⁹ and `MIN_ANGLE` 0.0201; no `seed` in the file (diff).

## Decisions Made

None beyond the approved plan: fixing the solver made the tolerance amendment the ticket allowed unnecessary.

## Deviations from Plan

- The B ≈ C generator reuses `triangles` through a new `share` parameter instead of a copy of its body (main session, after the implementer's copy).

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| GSS-REQ-011, GSS-REQ-014 | `src/core/geometry/triangle-solver.ts`:fromTwoSidesAndIncluded | `@spec GSS-REQ-011, GSS-REQ-014` (existing, unchanged) |

GSS-NFR-002 is verified by the property test, not annotated in code.

## Notes

- Implemented by sonnet · medium in an isolated worktree; applied to `ticket/graph-library-gss-010` from `main` (03ac8e5) as a patch.
- The drawn SAS triangles are unchanged at the emitted precision (0 of 3,016), so no consumer sees a difference.

## Post-Review Amendments

### graph-library/geometric-shapes-and-solids-ticket-010 code review CR-001, quality review QR-001, QR-002

**Change:**
- CR-001: TR-008's Mitigation states the cancellation-free x distance (Technical Design amendment, Architect-approved 2026-11-04).
- QR-001: the near-floor properties are two tests, one property each. QR-002: a comment says they stay unseeded and a failure is pinned as a regression test.
**Files:** `.gener8v/technical-design/system-design.md`, `tests/core/triangle-solver.property.test.ts`
**Re-verification:** `npx vitest run --no-cache tests/core/triangle-solver.property.test.ts` ×3 — 9 passed each; `eslint` on the file and `pnpm typecheck` exit 0; gener8v-state lint 0 errors. Security review: no findings.
