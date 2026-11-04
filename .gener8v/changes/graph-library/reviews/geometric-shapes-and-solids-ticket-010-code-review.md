# TICKET-010: Hold the triangle round trip to 10⁻⁹ just above the 0.02° floor for two sides and the included angle — Code Review

## Summary

Reviewed the solver fix in `fromTwoSidesAndIncluded` and the new regression and near-floor tests at commit 1fbc8ba. The rewrite of the atan2 x distance is algebraically exact (sj − si·cos A = (sj − si) + 2·si·sin²(A/2)), removes the cancellation, and the re-run tests pass. One Observation: the TR-008 mitigation text is not extended for this form.

**Delivery Record:** `.gener8v/changes/graph-library/delivery/geometric-shapes-and-solids-ticket-010-delivery.md`
**Files Reviewed:**
- `src/core/geometry/triangle-solver.ts`
- `tests/core/triangle-solver.property.test.ts`

**Findings:** 1
**Critical:** 0 | **Issues:** 0 | **Observations:** 1

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| Counterexample pinned as a regression test; record states measured error and the value that misses | Yes | `tests/core/triangle-solver.property.test.ts` "two nearly equal sides and a small angle between them (GSS TICKET-010)" uses the ticket's angles and sides; the delivery record gives 1.31 × 10⁻⁹ on `angleA` |
| Root cause named with a reproducing probe | Yes | Delivery record Pre-Flight Reconciliation (cancellation in `sⱼ − sᵢ·cos A`, B+C misses 180° − A by 2.6 × 10⁻¹¹) and the probe row in the Verification Run |
| Solver fixed so the round trip holds to 10⁻⁹ for every set at ≥ 0.02° | Yes | `src/core/geometry/triangle-solver.ts` `fromTwoSidesAndIncluded` (atan2 arguments); property file re-run 3 times by the reviewer, all passing; the ×20 and the 100,000 stress are recorded |
| Not seeded; no tolerance loosened | Yes | The diff adds no `seed`; `RELATIVE` and `MIN_ANGLE` untouched |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| GSS-REQ-011 | Draw a triangle from two sides and the included angle | `src/core/geometry/triangle-solver.ts`: `fromTwoSidesAndIncluded` | Yes |
| GSS-REQ-014 | Derive remaining sides and angles | `src/core/geometry/triangle-solver.ts`: `fromTwoSidesAndIncluded` | Yes |
| GSS-NFR-002 | 10⁻⁹ round trip, at least 1,000 triangles per set | `tests/core/triangle-solver.property.test.ts` "triangle round trip (GSS-NFR-002)"; ran in the Verification Run and met the target | Yes |

### Constraint Compliance

Ticket names no constraints beyond TR-008; no constraint file applies. Constraints analysis not available — constraint compliance not verified. The 0.02° floor was not moved (Known Hazard honoured).

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| TR-008 | Stable numerics; half-angle law of cosines and `atan2` for SAS; no `acos` | Yes | The fix keeps `atan2` and reuses the `half` sin(A/2) term; see CR-001 for the text of the mitigation |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| GSS-REQ-011 | `@spec GSS-REQ-011` | `src/core/geometry/triangle-solver.ts`: `fromTwoSidesAndIncluded` | Yes |
| GSS-REQ-014 | `@spec GSS-REQ-014` | `src/core/geometry/triangle-solver.ts`: `fromTwoSidesAndIncluded` | Yes |

**Coverage:** 2 of 2 requirements annotated (GSS-NFR-002 is verified by test, not annotated)
**Missing:** None
**Specification table:** Yes — `.gener8v/specifications/geometric-shapes-and-solids.md` `## @spec Coverage` lists `fromTwoSidesAndIncluded` for GSS-REQ-011 and GSS-REQ-014, and the property test for GSS-NFR-002.

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `vitest run --no-cache --maxWorkers=4` on the property file, `tests/layout/triangle.test.ts`, `tests/layout/engine-math.test.ts` (×3, GRAPH_GENERATOR_PREBUILT=1) | 0 (60 passed each) | Yes |
| Probe, stress, markup comparison, full loop, `pnpm audit` | Not re-run (scratch scripts and the full loop are outside this review's scope; the targeted tests above cover the changed code) | Not re-run |

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| None recorded | Reasonable | Fixing the solver made the tolerance amendment unnecessary; the `share` parameter deviation reuses the generator rather than copying it and is sound |

## Findings

### CR-001: TR-008 mitigation text does not describe the cancellation-free SAS angle form

**Severity:** Observation
**Location:** `.gener8v/technical-design/system-design.md` (TR-008 Mitigation); `src/core/geometry/triangle-solver.ts` `fromTwoSidesAndIncluded`
**Traces To:** TR-008
**Description:** TR-008 says SAS uses "the half-angle law of cosines and `atan2`". The code now also writes the atan2 x distance in half-angle form so the subtraction does not cancel. The mitigation is still true but the new form, and the fact that it was needed to hold 10⁻⁹ near the floor, is recorded only in the code comment and the delivery record.
**Impact:** None to correctness; a later reader of the design may reintroduce `sj − si·cos A`.
**Recommendation:** Optionally amend TR-008 through the Technical Design skill. The code comment already carries the reason.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-11-04): TR-008's Mitigation now states the cancellation-free x distance, amended through the Technical Design skill; system design Approved by the Architect — Thomas Eaves, 2026-11-04.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Fixed | TR-008 amended | `.gener8v/technical-design/system-design.md` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (CR-001 fixed, 2026-11-04)
**Notes:** The one observation was fixed in resolution by a TR-008 amendment the Architect approved.
