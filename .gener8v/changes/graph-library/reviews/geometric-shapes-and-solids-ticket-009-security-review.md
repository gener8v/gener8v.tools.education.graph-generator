# TICKET-009: Build a three-sides triangle's third vertex without trigonometry — Security Review

## Summary

This review covers `graph-library/geometric-shapes-and-solids/TICKET-009`, delivery commit `f41f23f` on branch `ticket/graph-library-gss-009`. The `security-reviewer` agent ran the findings phase in a fresh context on 2026-11-02, in parallel with the code and quality reviews.

**What changed in shipped code.** There are two small changes. In `src/layout/triangle.ts`, `modelVertices` now places the third vertex of a triangle given by its three sides (`bySides`) at x = (s² + b² − t²) ÷ 2b and y = `fourTimesArea(sides)` ÷ 2b, using arithmetic and `sqrt` only. In `src/core/geometry/triangle-solver.ts`, `fourTimesArea` is now exported. It is an internal module export only: `src/core/index.ts` does not re-export it and no `dist/*.d.ts` names it. `triangleLayout` sets `bySides` from the provenance through `sourceOf`, which reads own keys only. The commit adds no dependency: `package.json` and `pnpm-lock.yaml` are unchanged.

**Hostile input.** The new code adds one division, by 2b. It also takes a square root of a product of four factors and squares up to 10⁶. The question is whether a caller can reach `NaN`, `Infinity`, overflow, a negative `sqrt` argument or a zero divisor. They cannot. The validator and solver hold every precondition before the layout runs. I probed this through `createGraph` and directly against the layout:
- **Bounds.** `TRIANGLE_SIDE_MIN` = 0.001 and `TRIANGLE_LENGTH_LIMIT` = 10⁶ (`src/core/definitions/triangle.ts:52-54`). From these:
  - the divisor 2b is at least 0.002;
  - s² + b² − t² is at most 2 × 10¹²;
  - Kahan's product is below (3 × 10⁶)·(2 × 10⁶)³ ≈ 2.4 × 10²⁵, far from overflow (1.8 × 10³⁰⁸);
  - its smallest accepted value (sides 0.001, 2.86, 2.86) is about 3 × 10⁻⁵, far from underflow.
- **Rejected before layout.** `NaN` and `±Infinity` give `wrong_kind` (`src/core/validate/structure.ts:118`). 0, negative values, values below 0.001, 10⁷ and 10³⁰⁸ give `out_of_range`. 3, 4, 7 and 10⁶, 1, 1 give `contradiction` (`fromThreeSides`). Anything thinner than 0.02° or flatter than 179.96° gives `not_a_triangle` (`drawable`).
- **No negative `sqrt` argument.** `fourTimesArea` returns 0 for a product that is not positive (`src/core/geometry/triangle-solver.ts:95`). For an accepted triangle the product is always positive: the solver derives each angle as `atan2(area4, …)`, and every angle must be at least 0.02° and below 180°, which an `area4` of 0 cannot satisfy. So the drawn height is never 0. `fitScale`'s guard against a zero height also remains in place.
- **Extremes all draw finite markup.** I drew these through `createGraph` with every label on:
  - equilateral at 10⁶ and at 0.001;
  - the 0.02° needle at full scale, standing on its short side and on a long side;
  - the 179.96° flat obtuse triangle at full scale, in all three orientations;
  - the 0.02° needle at the smallest scale.

  Each returned `ok` with a finite polygon. No Scene contains `NaN` or `Infinity`.
- **Fuzz.** I generated 20,000 three-sides triangles: random shapes biased toward 0.02° needles and flat obtuse triangles, at random log-uniform scales within [0.001, 10⁶]. Results: 19,990 drew, and 10 were `not_a_triangle` because rounding the generated sides crossed the 0.02° floor. There were 0 `internal_error`s, 0 non-finite values in any Scene, and 0 drawn polygons of zero height.
- **Fail-closed if the precondition ever broke.** I called `triangleLayout` directly, bypassing validation, with base 0, a `NaN` side and 10³⁰⁸ sides. Each threw `RangeError` from `fmt()` ("cannot print NaN as a drawing coordinate"). `createGraphWith` turns that into a bare `internal_error`, with no message or stack (`src/graph.ts:42-45`). The public paths, `createGraph`, `<Graph>`, the per-type components and the exporter, reach the layout only through `validateWith`. SEC-001 records that this precondition is not stated where the division is.

**Determinism (RF-003, TC-002).** The change removes an engine-dependent path. IEEE 754 arithmetic and ECMAScript `Math.sqrt` are correctly rounded, unlike `cos`, `sin` and `atan2`, so the vertex no longer depends on an engine's last bit. Every coordinate still passes through `fmt()`. The change is a robustness gain (no hydration mismatch), not a new exposure.

There is one finding: SEC-001 (Informational). Nothing in this change is exploitable.

**Reviewer:** `security-reviewer` agent, fresh context (findings phase only, 2026-11-02)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/geometric-shapes-and-solids-ticket-009-delivery.md`. I read the Pre-Flight Reconciliation, Implementation Plan, Verification Run, DEL-001, Deviations (none) and Post-Review Amendments (none).

**Files Reviewed:**
- `src/layout/triangle.ts` (`modelVertices`, `triangleLayout`; `fitScale`, `cornerGeometry` and `arcPoints` read for context)
- `src/core/geometry/triangle-solver.ts` (`fourTimesArea` export; `fromThreeSides`, `cosineAngle`, `drawable` and `solveTriangle` read for the preconditions)
- `tests/layout/engine-math.test.ts` (test only; not published, `"files": ["dist"]`)
- `tests/layout/triangle.test.ts` (test only; not published)
- Read for context: `src/core/definitions/triangle.ts` (side limits, `triangleDisplay`), `src/core/format.ts` (`sourceOf`), `src/core/validate/structure.ts`, `src/core/validate/numbers.ts`, `src/graph.ts`, `src/react/createGraphComponent.tsx`, `src/layout/kit/format.ts` (`fmt`)

**Findings:** 1
**Critical:** 0 | **High:** 0 | **Medium:** 0 | **Low:** 0 | **Informational:** 1

## Security Assessment

### Input Validation

**Status:** Adequate
**Notes:**
- **The new code reads only validated, normalized numbers.** `sideA`, `sideB` and `sideC` are each checked as finite numbers in [0.001, 1,000,000]. The solver then rejects a broken triangle inequality (with a 10⁻¹² relative margin) and any triangle with an angle under 0.02° or at 180°.
- **`bySides` comes from validator-made provenance**, read own-key through `sourceOf` (`src/core/format.ts:236-238`), so a polluted `Object.prototype` cannot turn it on. Even if it were turned on wrongly, it would only place a derived-but-consistent side by the same formula.
- **What the probes confirmed** (logs in the agent's scratch directory):
  - no reachable `NaN`, `Infinity`, overflow, underflow to zero height, negative `sqrt` argument or zero divisor;
  - the extreme and fuzz cases above all draw finite markup;
  - the unguarded formula's failure modes (b = 0 gives `[Infinity, NaN]`; 10³⁰⁸ gives `[NaN, NaN]`) are reachable only by calling the internal layout directly, and even then `fmt()` throws.
- **No injection surface.** The change has no string building, regular expression, file path, `eval` or HTML sink. The output is numbers formatted by `fmt()`.

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** A client-side rendering library with no users, sessions, endpoints or permissions. The change is pure arithmetic in a layout function.

### Data Protection

**Status:** Not Applicable
**Notes:** The change handles no PII, credentials or secrets, and does no logging. CC-003 (no data collected, transmitted or stored) is unaffected: the change does no I/O, makes no network calls and has no side effects.

### Configuration Security

**Status:** Adequate
**Notes:**
- No configuration, secrets, environment variables or build settings changed. `package.json` and `pnpm-lock.yaml` are untouched by `f41f23f`.
- **Dependency audit:** `pnpm audit` with pnpm 10.28.2, run 2026-11-02T19:57:07Z (2026-11-02 14:57 local): 1 moderate, exit 1. The advisory is GHSA-g3hv-75wg-m249: `minimatch` <11.0.1, path `.>eslint>minimatch`, dev-only. It is the risk already accepted as graph-library/component-packaging-and-source-export-ticket-004-security-review/SEC-002, unchanged and not re-raised here. `pnpm audit --prod` at the same time: "No known vulnerabilities found", exit 0.
- **Tests run as a sanity check:** `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache --maxWorkers=4 tests/layout/triangle.test.ts tests/layout/engine-math.test.ts tests/core`: 35 files, 1,153 tests passed.
- **Cryptography:** none used. `Math.random` is not used by the change.

**Compliance cross-reference** (`.gener8v/constraints/prd.md`):
- CC-001 (licenses): no new dependency, asset or copied code. Met.
- CC-002 (WCAG 2.1 AA): the text alternative still comes from `triangleDefinition.describe`, which is untouched. The 0.02° needle test asserts no label overlaps. Met.
- CC-003 (no data collection): pure computation. Met.
- CC-004 (image set): untouched. Met.
- TC-002 (rounded coordinates): every vertex still passes through `fmt()`. Met.
- RF-003 (engine float differences): reduced by this change.

## Findings

### SEC-001: The new division by the base relies on a validator precondition that `modelVertices` does not state

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** N/A (defense in depth; nearest is A10:2025 Mishandling of Exceptional Conditions)
**Location:** `src/layout/triangle.ts:70` (`modelVertices`, the `bySides` branch); `src/layout/triangle.ts:217-218` (`triangleLayout` doc comment)
**Description:** The `bySides` branch divides by `2 * b` and takes `fourTimesArea` of the three sides. The result is finite and correct only under four conditions:
- b > 0;
- every side is finite and below about 10⁷⁶, where Kahan's four-factor product overflows to `Infinity` (probed: 10⁷⁶ is finite, 10⁷⁷ gives `Infinity`; s² alone holds to about 10¹⁵⁴);
- the sides satisfy the triangle inequality strictly;
- Kahan's product is positive.

Today the validator and solver guarantee all four (`TRIANGLE_SIDE_MIN`, `TRIANGLE_LENGTH_LIMIT`, `fromThreeSides`, `drawable`), and I found no path that breaks them (probes and 20,000-case fuzz above).

The function does not state these conditions, however. The comment it replaced said "nothing is divided", and `triangleLayout`'s doc comment still says "Nothing is divided by a height, an inradius or a sine, so every coordinate is finite". That remains literally true, but it no longer lists every division. The neighbouring code states and guards its own "never zero" invariants: `cornerGeometry`'s `opposite > 0` (QR-001) and `fitScale`'s zero-height guard (GSS TICKET-004 SEC-001).

A future change could break a precondition without a reader noticing. Examples: lowering `TRIANGLE_SIDE_MIN` to 0, raising `TRIANGLE_LENGTH_LIMIT` past about 10⁷⁶, or routing another determining set or an unvalidated caller into `bySides`. If that happened, the failure is already closed:
- `fmt()` throws `RangeError` on `NaN` or `Infinity`;
- `createGraphWith` returns a bare `internal_error`;
- for a broken triangle inequality, which gives y = 0, the layout returns a flat but finite drawing.

So the effect would be a refused or flattened figure, not a leak or a crash.
**Attack Scenario:** Not required (Informational). No caller-reachable input breaks the precondition today.
**Impact:** None today. If a future change breaks the precondition, the cost is a confusing `internal_error` or a flat figure for valid-looking input, not a security exposure.
**Recommendation:** Do both of the following:
- State the precondition in `modelVertices`' doc comment, for example "`bySides` requires the validated three-sides set: every side in [`TRIANGLE_SIDE_MIN`, `TRIANGLE_LENGTH_LIMIT`] and the strict triangle inequality, so 2b > 0 and Kahan's product is positive and finite."
- Bring `triangleLayout`'s "Nothing is divided by …" sentence up to date to mention the division by the base.

A runtime guard is optional, because `fmt()` already fails closed. If one is wanted, it should mirror `fitScale`: fall back to the `cos`/`sin` construction when `!(b > 0)`.
**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-11-02): `thirdVertexFromSides`' comment states its precondition — validated sides from 0.001 to 1,000,000 meeting the triangle inequality, so the base is never 0 and the squares never overflow — and that unvalidated input is refused by `fmt()`.

---

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Fixed | precondition documented | No | `src/layout/triangle.ts` |

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:** SEC-001 resolved with a documented precondition. The `minimatch` advisory in `pnpm audit` remains the accepted risk of CPSE TICKET-004 SEC-002.
