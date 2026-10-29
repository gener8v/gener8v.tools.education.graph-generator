# geometric-shapes-and-solids/TICKET-004: Triangle definition and solver — Quality Review

## Summary

Reviewed the stage-3 `solve` hook (`src/core/validate/solve.ts` and its types), the pure triangle solver, the unregistered triangle definition and the four new test files, at delivery commit `5c3449d`. Quality is high: the solver is pure, numerically careful and documented, the hook's package-defect checks are thorough, and lint, typecheck and the full suite pass. One Concern (the GSS-NFR-002 round trip is generated only for angles of at least 0.1°) and four Suggestions; nothing blocks.

**Files Reviewed:**
- src/core/validate/solve.ts
- src/core/validate/domain.ts
- src/core/validate/index.ts
- src/core/definitions/types.ts
- src/core/geometry/triangle-solver.ts
- src/core/definitions/triangle.ts
- src/core/definitions/xy-graph.ts
- tests/core/triangle-solver.test.ts
- tests/core/triangle-solver.property.test.ts
- tests/core/triangle.test.ts
- tests/core/validate-solve.test.ts
- tests/core/definitions.test.ts

**Findings:** 5
**Critical:** 0 | **Concerns:** 1 | **Suggestions:** 4

## Quality Assessment

### Code Organization

**Rating:** Strong
**Notes:** Clear split: the hook (`validate/solve.ts`) is generic, the maths (`geometry/triangle-solver.ts`) is pure and has no definition knowledge, the definition wires them. The solver's per-set functions map one-to-one onto the requirements. The one wrinkle is dependency direction: `geometry/` imports `withinTolerance` from `validate/derive` (QR-004).

### Readability

**Rating:** Strong
**Notes:** Doc comments give the reason for each numeric choice (Kahan Heron, `atan2`, the 1e-12 margin) and cite requirements. `fromTwoSidesAndOther` is the densest function: a mutable `let reach` / `let two` set across a four-way `if` chain plus a `none` closure (QR-003). `solve.ts` casts around `Array.isArray` on a union (`result as readonly Issue[]`, `as Solved`).

### Error Handling

**Rating:** Strong
**Notes:** `checkedResult` rejects malformed solver output (both/neither of derived and issues, empty issues, derived term not a number input, non-finite value, unsupplied scale, hand-built issues) as a package defect; inputs that failed stage 2 skip the solver so there are no cascades; vertex bounds are checked before solving so the work is bounded. Solver issues carry precise codes and paths. Probes (scratch, `TSX_DISABLE_CACHE=1 npx tsx -e`): two vertices give `insufficient` at `/vertices`; sideA 3, sideB 4, angleA 30 gives `ambiguous` stating 5.7 and 1.23; 3-4-5 with angles 37/53.13/90 is accepted within 1%; sides 5, 3 with angleB 90 gives `contradiction`.

### Test Coverage

**Rating:** Strong
**Notes:** Executed in this review: `pnpm lint` exit 0; `pnpm typecheck` exit 0; `npx vitest run --no-cache` exit 0, 64 files and 1,814 tests passed. New tests: validate-solve (12), triangle-solver (23), property (6, 1,000 runs each), triangle (15), plus solver-rule blocks in `definitions.test.ts`. Every acceptance criterion maps to a named test; no-cascade, provenance, range and caller-text limits are covered through `validateWith`. Weakness: the NFR round trip narrows its domain (QR-001), and its oracle recomputes with the law of cosines, which is itself ill-conditioned for thin triangles.

### Observability & Operability

**Rating:** Adequate
**Notes:** The library has no logging or metrics, and the surrounding validator does not either; failure visibility is by structured issues. Solver defects surface as `internal_error` with a message naming the type and the broken rule. Calibrated to that pattern this is sufficient.

## Findings

### QR-001: GSS-NFR-002 round trip is generated only for angles of 0.1° or more

**Category:** Testing
**Severity:** Concern
**Location:** `tests/core/triangle-solver.property.test.ts` (generators and `MIN_ANGLE`); delivery record Verification Run, round-trip probes
**Description:** The definition accepts any angle in (0°, 180°) and sides from 0.001 to 1,000,000, and the solver accepts triangles as thin as the 1e-12 margin allows. The NFR property test generates only angles of at least 0.1° (widened from 5° after review). The delivery's own probe shows 0.01° already reaching 1.0 to 1.7 x 10^-9 relative error "in the test's own law-of-cosines recomputation", i.e. the oracle, not necessarily the solver, loses precision. So the claim "within 10^-9 for non-degenerate triangles" is verified only for part of the accepted domain, and the remainder is unverified rather than shown correct or documented as out of contract.
**Impact:** A future change to the numerics could degrade thin-triangle accuracy within the accepted domain without any test failing. The accuracy limit that callers can rely on is not written down.
**Recommendation:** Either add a well-conditioned oracle (for example compare sides and angles by recomputing through the other determining sets with `atan2`/Kahan forms, or compare against high-precision values for fixed thin cases) and extend the property domain, or state the tested minimum angle in the NFR coverage row and the definition's contract so the limit is explicit.
**Status:** Resolved
**Resolution:** Fixed with code review CR-003 (Engineer — Thomas Eaves, 2026-10-29): a well-conditioned oracle (half-angle law of cosines for a side; for an angle, Kahan's area and `atan2` when no angle is obtuse, else 180° minus the other two), the generated angles extended from 0.1° to 0.02°, and the floor stated in the test header, the angle descriptions and the GSS-NFR-002 coverage row. Below about 0.01° the inputs' own rounding decides the last digits (1.2–2.5 × 10⁻⁹ measured), so the requirement is not reachable there by any solver. Committed with the code review resolution (`001eef2`).

---

### QR-002: `runSolver` casts around a union that a discriminated type would remove

**Category:** Readability
**Severity:** Suggestion
**Location:** `src/core/validate/solve.ts` (`checkedResult`, `runSolver`)
**Description:** `checkedResult` returns `Solved | readonly Issue[]`; `runSolver` distinguishes them with `Array.isArray` and then casts (`result as readonly Issue[]`, `result as Solved`). Inside `checkedResult` the same `as` casts recur.
**Impact:** The casts hide what the compiler could check; a later edit to `SolverResult` would not be caught at these sites.
**Recommendation:** Return a tagged result (`{ issues } | { solved }`) from `checkedResult`, so `runSolver` narrows by property and the casts go.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-29). `checkedResult` returns `{ kind: "issues", issues } | { kind: "solved", solved }`; `runSolver` narrows on `kind`, with no casts. The casts left inside `checkedResult` read the untrusted result's shape after `Object.hasOwn`, which TypeScript does not narrow on.

---

### QR-003: `fromTwoSidesAndOther` mixes mutable flags and a four-way branch with the two-solution report

**Category:** Maintainability
**Severity:** Suggestion
**Location:** `src/core/geometry/triangle-solver.ts` (`fromTwoSidesAndOther`)
**Description:** The case analysis (none / one / right-angle / two) sets `reach` and `two` through a chain of `if` branches with repeated `Math.sqrt((a - h) * (a + h))`, then a second `if (two)` after the chain. It is correct and tested, but the reader must hold the branch table in mind to see that each path sets both variables.
**Impact:** The most error-prone function in the file (GSS OQ-004 may later add a chooser here) is the hardest to modify safely.
**Recommendation:** Extract a small `classifySsa(a, b, alpha): "none" | "one" | "two"` that returns the class, then compute `reach` once. Keeps the margin logic in one place and lets OQ-004 touch only the `"two"` arm.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-29). `ssaFit(alpha, a, b, h)` returns `"none" | "one" | "right" | "two"`; `fromTwoSidesAndOther` computes `reach` once. Mutation-checked: each changed branch fails a test.

---

### QR-004: `geometry/` depends on `validate/` for the 1% tolerance

**Category:** Patterns
**Severity:** Suggestion
**Location:** `src/core/geometry/triangle-solver.ts:4` (`import { withinTolerance } from "../validate/derive"`)
**Description:** The pure maths module imports a helper from the validator, while `validate/solve.ts` and the definition depend on the solver. The cycle is only at the directory level (no import cycle), but the layering reads backwards for a module the delivery describes as pure and reusable (consumed by TICKET-005).
**Impact:** Moving or reworking `derive.ts` will ripple into the geometry module; later geometry solvers (GSS area) will repeat the pattern.
**Recommendation:** Move `withinTolerance` and its constant to a neutral module (for example `core/tolerance.ts`) imported by both.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-29). `TOLERANCE` and `withinTolerance` moved to `src/core/tolerance.ts`, a module with no imports; `src/core/validate/derive.ts` imports and re-exports them, so existing callers are unchanged; the solver imports from `../tolerance`.

---

### QR-005: Side, angle and vertex term tables are declared twice

**Category:** DRY
**Severity:** Suggestion
**Location:** `src/core/definitions/triangle.ts` (`SIDE_TERMS`, `ANGLE_TERMS`, `VERTEX_NAMES`) and `src/core/geometry/triangle-solver.ts` (`SIDES`, `ANGLES`, `VERTEX_NAMES`)
**Description:** The same three term lists and vertex letters are defined in both files, and `solve.inputs`/`scaled` in the definition must stay in step with the solver's reads by hand.
**Impact:** Renaming or adding a term needs two edits with nothing but tests to catch a miss; TICKET-005 will add a third user.
**Recommendation:** Export the term tuples from `triangle-solver.ts` (or a small `triangle-terms.ts`) and import them in the definition.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-29). The solver exports `TRIANGLE_SIDES`, `TRIANGLE_ANGLES` and `TRIANGLE_VERTICES` (typed against its term types); the definition imports them, so `solve.inputs` and `scaled` read the same list.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fix (with CR-003) | Well-conditioned oracle; floor 0.02°, stated | `tests/core/triangle-solver.property.test.ts`, `src/core/definitions/triangle.ts`, `.gener8v/specifications/geometric-shapes-and-solids.md` |
| QR-002 | Fix | Tagged `checkedResult` result | `src/core/validate/solve.ts` |
| QR-003 | Fix | `ssaFit` extracted | `src/core/geometry/triangle-solver.ts` |
| QR-004 | Fix | `src/core/tolerance.ts` | `src/core/tolerance.ts`, `src/core/validate/derive.ts`, `src/core/geometry/triangle-solver.ts` |
| QR-005 | Fix | Term tuples exported once | `src/core/geometry/triangle-solver.ts`, `src/core/definitions/triangle.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** None
