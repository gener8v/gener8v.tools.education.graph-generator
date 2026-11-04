# TICKET-010: Hold the triangle round trip to 10⁻⁹ just above the 0.02° floor for two sides and the included angle — Security Review

## Summary

Reviewed the TICKET-010 delivery (commit 1fbc8ba, diff `03ac8e5..1fbc8ba`). The source change is one rewrite in the triangle solver: the atan2 x distance for the two derived SAS angles, `sj − si·cos A`, becomes `(sj − si) + 2·si·sin²(A/2)`. The test file adds a pinned regression test and two near-floor property tests. The change is pure arithmetic in a pure function, adds no new entry point, and doesn't touch I/O, text, markup or configuration. I probed it with hostile numbers (NaN, ±Infinity, negative, zero, subnormal, `Number.MAX_VALUE`, inputs at the validation bounds, near-degenerate triangles, right angles where the new denominator is about 0). Every result stays behind the same gates as before. Over 2,000,000 samples of the validated input space the new denominator never changes sign compared with the old one. No accept/reject outcome changed, either at the 0.02° derived-angle gate or through the public `validate`/`createGraph` path. There are no findings.

**Files Reviewed:**
- `src/core/geometry/triangle-solver.ts`
- `tests/core/triangle-solver.property.test.ts`
- Context read, not changed by the ticket: `src/core/definitions/triangle.ts` (property ranges and solver hook), `src/core/validate/solve.ts` (solver result checks), `src/core/validate/structure.ts` (number validation), `src/core/index.ts`, `src/index.ts`, `src/entries/triangle.ts` and the `package.json` `exports` map (public surface)

**Findings:** 0
**Critical:** 0 | **High:** 0 | **Medium:** 0 | **Low:** 0 | **Informational:** 0

## Security Assessment

### Input Validation

**Status:** Adequate
**Notes:**

**How input reaches the changed code.** `solveTriangle` isn't exported. None of `src/index.ts`, `src/core/index.ts`, `src/entries/triangle.ts` or any other `exports` subpath re-exports it. The only route from a caller is `validate`/`normalize`/`createGraph` → `runSolver` (`src/core/validate/solve.ts:134`) → the triangle definition's `solve` (`src/core/definitions/triangle.ts:285`). Before that point:
- Stage 1 rejects anything that isn't a finite number, with no coercion (`src/core/validate/structure.ts:118`), so NaN, ±Infinity and numeric strings never get there.
- Sides are limited to [0.001, 1,000,000] and angles to [0.02°, 180°) (`src/core/definitions/triangle.ts:60-77`).
- The solver gets a frozen, null-prototype copy of the supplied inputs (`src/core/validate/solve.ts:139-147`).

**The new expression on that domain.**
- **No overflow or underflow.** `|x| ≤ 3·10⁶` and `y = si·sinDeg(A) ≥ 0.001·sin(0.02°) ≈ 3.5·10⁻⁷`. So `y > 0` always, `Math.atan2(y, x)` stays strictly inside (0°, 180°), and the ±0 branch cut can't flip the result.
- **The denominator's sign.** Mathematically it is the same as before. Over 2,000,000 samples (log-uniform sides; nearly equal sides; A near 0.02°, at 90° ± 10⁻⁶, and in [179.9°, 180°)) there were 0 sign flips between the old and new forms. The largest change in a derived angle was 2.4·10⁻¹¹°, and it fell in the near-floor case the ticket fixes.
- **Cancellation.** The new form brings in one cancellation of its own, `(sj − si) + si` near A = 90°. Its absolute error, about ε·max(si, sj), feeds into the angle as about ε·max/sk, the same order as the old form's error. This is a precision matter for the Quality Review, not a security one. The ticket's own stress test (100,000 near-floor and 20,000 per set) bounds it.

**The gates still stand.**
- `drawable` (`src/core/geometry/triangle-solver.ts:138`) requires every side to be finite and positive, a margin from flatness, and every angle to be ≥ 0.02° and < 180°. NaN fails each `>=` test, so a NaN angle is rejected without its own check.
- `checked` (`:156`) runs `drawable` before comparing any supplied extra value.
- `checkedResult` (`src/core/validate/solve.ts:58`) then refuses any non-finite derived value as `internal_error`.

**Direct-call probe.** I called the (internal) solver directly with NaN, ±Infinity, a negative side, a zero side, a negative angle, angles of 0, −0 and 180, sides of 1e300, `Number.MAX_VALUE` and 5e-324. Every call returned `not_a_triangle` and none threw. One difference is unreachable: at `Number.MAX_VALUE` sides, the new term `2·si·half²` overflows to Infinity where the old `si·cos A` did not. The third side `sk` already overflows at those values, `drawable` rejects the result the same way, and validation caps sides at 10⁶. So no outcome differs.

**Public-path probe.** I ran 38,488 SAS descriptions through `validate`, with 30–40% weight on the bounds, nearly equal sides, A at 0.02° + [0, 10⁻³], A within 10⁻⁶ relative of 180°, and A = 90°:
- 0 `internal_error`, 0 thrown exceptions.
- Of the 16,622 valid descriptions, `validate(normalize(d))` was valid for every one. So the round-trip property behind GSS TICKET-004 SEC-001 holds on the new formula.
- 0 `createGraph` failures and no NaN or Infinity in any scene.
- 0 descriptions whose valid/invalid outcome differs between the old and new formulas.

**At the 0.02° gate.** Across 2,000,000 triangles built so that the smallest derived angle lies within 10⁻⁹ relative of 0.02°, the old and new formulas agree on every pass/fail (1,000,741 pass under both). The change does not move the floor that GSS TICKET-004 SEC-001 set.

**Other input classes.** Injection, XSS and path traversal don't apply. No string, markup, file path or command is built from the changed values.

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** This is a client-side rendering library with no authentication, sessions or authorization boundaries. The change adds none.

### Data Protection

**Status:** Not Applicable
**Notes:** The change handles no PII, credentials or secrets, and does no logging. CC-003 (the package must not collect, transmit or store data) is unaffected: the solver stays a pure function with no I/O.

### Configuration Security

**Status:** Adequate
**Notes:** The change touches no configuration, dependency or build setting. `package.json` and `pnpm-lock.yaml` are not in the diff.

**Dependency audit** (run during this review with pnpm 10.28.2, 2026-11-04 16:07 UTC):
- `pnpm audit --prod`: "No known vulnerabilities found", exit 0.
- `pnpm audit`: 1 moderate, exit 1. It is GHSA-g3hv-75wg-m249, `minimatch` <11.0.1 via `.>eslint>minimatch`, dev-only. It is already recorded and accepted as `graph-library/component-packaging-and-source-export-ticket-004-security-review/SEC-002`, and this ticket did not introduce it.

**Cryptography:** not applicable (none used).

**Logging and monitoring:** not applicable. No logging was added; issues are returned as values.

**Compliance:**
- CC-001 (licenses): no new dependency or copied code.
- CC-002 (WCAG): the drawn markup is unchanged. The delivery measured 0 of 3,016 SAS markups changed, and I didn't re-measure this.
- CC-003 (no data collection): no I/O was added.
- CC-004 (trademarked imagery): no images.

None is violated.

**Technical design:** TR-008 asks for no `acos` and an `atan2` formulation for two sides and the included angle. The change keeps both and removes one source of cancellation, in line with that mitigation.

**Tests:** the test-file changes are unseeded fast-check properties and one pinned fixture. They contain no secrets and use no network or filesystem.

**Re-run:** `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache --maxWorkers=4` on `tests/core/triangle-solver.property.test.ts`, `tests/core/triangle-solver.test.ts`, `tests/layout/triangle.test.ts` and `tests/layout/engine-math.test.ts`: 4 files, 98 tests, all passed.

## Findings

None.

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:** Confirmed in resolution (2026-11-04): no findings to resolve. The one audit advisory (dev-only `minimatch`) belongs to and is already accepted under `graph-library/component-packaging-and-source-export-ticket-004-security-review/SEC-002`. The probe scripts are kept outside the repository, under the session scratchpad's `review-gss010-sec/` directory (`direct.mts`, `public.mts`, `gate.mts`).
