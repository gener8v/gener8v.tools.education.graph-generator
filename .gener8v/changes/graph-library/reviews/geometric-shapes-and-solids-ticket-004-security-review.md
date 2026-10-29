# TICKET-004: Triangle definition and solver — Security Review

## Summary

This review covers the delivery of `graph-library/geometric-shapes-and-solids/TICKET-004` at HEAD of branch `ticket/graph-library-gss-004`, which is the delivery commit `5c3449d`. No review has resolved anything on this ticket yet, so the code reviewed is the code as delivered. The `security-reviewer` agent ran the findings phase in a fresh context on 2026-10-29, in parallel with the code and quality reviews.

The delivery does two things:
- It adds the `triangle` definition (`src/core/definitions/triangle.ts`) and its solver (`src/core/geometry/triangle-solver.ts`). The triangle is **not registered** (DEL-002), so `validate`, `normalize`, `describe`, `createGraph` and the published schemas cannot reach it yet. It becomes public with TICKET-005. I reviewed it as if it were registered, through `validateWith` and a test registry.
- It extends the GSV validator core with an optional stage-3 `solve` hook (`src/core/definitions/types.ts`, `src/core/validate/solve.ts`, `src/core/validate/index.ts`), shared by every type from now on. As the brief asked, this contract got most of the attention.

The caller controls six numbers (`sideA..C`, `angleA..C`), up to three `{x, y}` vertices, up to three vertex names, a `unit`, a `title` and a `lineColor`.

Probed in memory, it holds up against crashes, non-finite values, unbounded work and injection:
- **Non-finite and extreme numbers.** I probed `NaN`, `Infinity`, `-0`, `5e-324`, `1e-300`, `1e-160`, `1e300`, `Number.MAX_VALUE`, values one ulp either side of 0.001, 90, 180 and 1,000,000, angles of `1e-14` and `179.99999999999997`, and vertices `5e-324` or `1e-160` apart.
  - Stage 2 refuses every non-finite number as `wrong_kind` (`src/core/validate/structure.ts:117-118`). No `NaN`/`Infinity` reaches the solver.
  - Sides outside 0.001..1,000,000 and angles outside the open interval (0, 180) are `out_of_range`. So are vertex coordinates beyond ±1,000,000, at their own path, before any solving (`coordinateIssues`).
  - Subnormal angles make `sin` underflow to 0. The solver then gives sides of `Infinity` or `0`, and `drawable` turns these into `not_a_triangle`, never a throw.
  - Derived sides below 0.001 or above 1,000,000 are reported `out_of_range` at the scale value.
- **Fuzz (seed 20261029, xorshift32).** 200,000 mixed descriptions (183,085 distinct), 9,871 of them valid. There was no `internal_error`, no exception and no non-finite or out-of-range value in a valid description. No message contained `NaN`, `Infinity` or `undefined`. The slowest took 1.07 ms.
  - A second, unseeded pass generated 300,000 triangles from SSS, SAS, ASA and AAS sets, with angles from 10⁻⁵° up. I used it to measure how consistent the valid results are (SEC-001).
- **Bounded work.** The solver does a fixed amount of work whatever the values: no loops over magnitudes, and `vertices` and `vertexNames` are capped at 3 (`maxItems`). `runSolver` loops over 7 inputs times the failed set, and stage 2 bounds the failed set.
- **Pollution.** I added 32 keys to `Object.prototype`, enumerable and not. The keys covered every triangle term, `solve`, `derived`, `issues`, `scale`, `inputs`, `scaled`, `defining`, `set`, `x`, `y`, `min`/`max`/`exclusiveMin`/`exclusiveMax`, `length`, `type`, `kind`, `items`, `properties`, `unit`, `title`, `vertexNames` and the provenance pointers. I also polluted `Array.prototype[0..3]`. Then I validated 11 descriptions that cover every set and every failure. Bisected one key at a time:
  - **`exclusiveMax` changes the delivered code's output** (SEC-002).
  - **`set` (non-function)** turns every result into `internal_error`, for the square as well. It comes from JavaScript property descriptors, which read an inherited `set` (`tsx`'s own loader also fails under it). It predates this delivery, fails closed, and is not raised.
  - Every other key, and `Array.prototype`, left the output byte-identical.
- **The solve contract.**
  - The solver is read as an own property only (`solverOf`).
  - The solver gets a frozen, null-prototype copy of the present inputs, and the nested vertex objects are frozen too. A strict-mode solver that mutates them throws, which the validator reports as `internal_error`.
  - Results that break the contract are each `internal_error`: an own `__proto__` key in `derived`, a `null` or array `derived`, a missing `scale`, an object posing as an `issues` list. No exception text reaches the caller (`validateWith`'s fixed message).
  - The result is checked live, not as a snapshot (SEC-003).
- **Cascades.** A non-numeric or out-of-range input skips the solver, so it produces one issue (`touchesFailed`). An unrelated failure (`vertexNames[0]` at 201 characters) leaves the solver running. On issues, the solver's inputs are marked failed.
- **Text alternative.** `describe` states caller text through `quoteText` and `stateMeasurement`. Bidi and control characters in `vertexNames` are refused at stage 2. Numbers go through `formatSupplied`/`formatDerived`. One pre-existing behaviour also applies to the triangle and is not raised again: a unit with quotes or commas (`cm" onload="x`) counts as unit-shaped and is stated unquoted after every side. It is plain text in an escaped `aria-label`/`<title>`, and GSS TICKET-002 SEC-003 and SEC-004 settled it ("quotation marks in a text alternative are not a boundary").
- **Generated files.** `src/generated/*` changes only the wording of the shared `x`/`y` descriptions; no bound, pattern or type changed.
- **Tests.** `npx vitest run --no-cache` passed 258 tests over eight files: the four new files (`validate-solve`, `triangle-solver`, `triangle-solver.property`, `triangle`), plus `definitions`, `validate-structure`, `describe` and `schema-agreement`. There were no failures, so nothing needed a rerun.
- **Dependencies.** `pnpm audit` and `pnpm audit --prod` are clean (see Configuration Security). The delivery changes neither `package.json` nor `pnpm-lock.yaml`.

There are three findings, none exploitable for confidentiality or code execution:
- **SEC-001 (Low):** the SAS, ASA, AAS and SSA sets accept triangles flatter than the solver's own degeneracy margin, and thin triangles whose values do not agree with each other. Their normalized descriptions then fail `validate`.
- **SEC-002 (Low):** `scaleRange` in the new solve hook reads range flags through the prototype, which regresses the project's own-key pattern.
- **SEC-003 (Informational):** the solve hook checks the solver's live result rather than a snapshot, so a defective solver could still put `NaN` into a valid description.

**Reviewer:** `security-reviewer` agent, fresh context (findings phase only, 2026-10-29)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/geometric-shapes-and-solids-ticket-004-delivery.md`. I read the Pre-Flight Reconciliation, the Implementation Plan, DEL-001..DEL-006, the Deviations, the Notes and the Post-Review Amendments (none).

**Files Reviewed:**
- `src/core/validate/solve.ts` (new: `solverOf`, `numberSpec`, `checkedResult`, `scaleRange`, `outOfScale`, `runSolver`)
- `src/core/definitions/types.ts` (modified: `SolverResult`, `Solver<D>`, `GraphTypeDefinition.solve`)
- `src/core/validate/index.ts` (modified: `runSolver` between `checkDerivations` and `runDomainChecks`)
- `src/core/validate/domain.ts` (modified: `assertIssue` exported with a source label)
- `src/core/geometry/triangle-solver.ts` (new: `solveTriangle` and every set's solver, `checked`, `drawable`, `angleProblems`, `fourTimesArea`, `cosineAngle`)
- `src/core/definitions/triangle.ts` (new: terms, `coordinateIssues`, the `solve` wrapper, `describe`)
- `src/core/definitions/xy-graph.ts` (modified: the `x`/`y` wording)
- `src/generated/description.ts`, `src/generated/schema.json`, `src/generated/tool-schema.json`, `src/generated/vocabulary.json` (regenerated; diffed: description text only)
- `.changeset/triangle-solver.md` (new)
- `tests/core/validate-solve.test.ts`, `tests/core/triangle-solver.test.ts`, `tests/core/triangle-solver.property.test.ts`, `tests/core/triangle.test.ts` (new); `tests/core/definitions.test.ts` (modified)
- **Read unchanged, because the delivered code's values flow into them:**
  - `src/core/validate/state.ts` (`touchesFailed`, `deepFreeze`);
  - `src/core/validate/numbers.ts` (`rangeOf`, `rangeBroken`);
  - `src/core/validate/derive.ts` (`withinTolerance`);
  - `src/core/validate/structure.ts` (number kind checks);
  - `src/core/issues.ts` (`createIssue`, `ownRange`, `normalizeRange`, `describeBounds`);
  - `src/core/format.ts` (`stateMeasurement`, `isUnitShaped`);
  - `src/core/index.ts` and `src/index.ts` (public exports: neither exports the triangle, the solver or `validateWith`).

**Context read:**
- **The ticket** (`.gener8v/changes/graph-library/tickets/geometric-shapes-and-solids/TICKET-004.md`) and its Known Hazards: AD-004 stage ordering, TR-008, OQ-004, "equals, not exceeds", the definition contract, `maxItems`, domain checks (GSV TICKET-004 SEC-004), caller-text limits and `/* @__PURE__ */`. Its Constraints: "None identified beyond the GSV validation contract".
- **`.gener8v/constraints/prd.md`** (CC-001..CC-004). There is no `constraints/geometric-shapes-and-solids.md`.
- **`.gener8v/technical-design/system-design.md`**: AD-004, and TR-008, whose stated impact is "near-degenerate triangles are misclassified".
- **`.gener8v/CONVENTIONS.md`.**
- **The earlier security reviews in this change**, chiefly GSS TICKET-003's (the square) and TICKET-002's (the circle). Their settled risks are not raised again.

**Findings:** 3
**Critical:** 0 | **High:** 0 | **Medium:** 0 | **Low:** 2 | **Informational:** 1

## Security Assessment

### Input Validation

**Status:** Gaps Found
**Notes:**
- **Coverage.** Every triangle term has a spec the validator enforces:
  - sides: number, 0.001 to 1,000,000;
  - angles: number, exclusive 0 to exclusive 180;
  - `vertices`: array, `maxItems: 3`, items `{x, y}` with both required;
  - `vertexNames`: array, `maxItems: 3`, items strings of at most `CALLER_TEXT_LIMIT`, plain-text policy;
  - `unit`: the shared `unitProperty` (`UNIT_TEXT_LIMIT`);
  - `title` and `lineColor`, through `appliesTo`.
- **Vertex bounds.** The shared `x`/`y` terms have no structural bounds, so the ±1,000,000 vertex bound is enforced only by `coordinateIssues` in the solve wrapper (DEL-004). It relies on stage 2 having refused non-finite numbers already: `rangeBroken(NaN, …)` returns `undefined`, so `NaN` would pass that check. Stage 2 does refuse it, and the probe confirms that.
  - When TICKET-005 registers the triangle, `schema.json` and `tool-schema.json` will carry no `minimum`/`maximum` for a vertex coordinate. `validate` stays the gate, as for the number line's `value` (NLC TICKET-002 DEL-009).
- **Numeric robustness.** The solver never throws and never emits a non-finite value on caller input (fuzz above). The gap is consistency at the thin end, SEC-001. The SSS and vertex sets apply a 10⁻¹² degeneracy margin, and the other sets do not. Below about 0.01°, the doubles in a normalized description can no longer carry the triangle's smallest angle to within the 1% tolerance, and the package still reports such a triangle as valid.
- **Injection vectors.** There is no SQL, shell, file path, template or dynamic code, and no rendering yet (TICKET-005). Issue messages are built by `createIssue`, from fixed terms and numbers. Caller text appears only in `describe`, quoted.
- **Solve-hook contract.** It is sound against caller input. Against a defective package solver it is shallower than its documentation says (SEC-003).

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** The package is a rendering and validation library with no accounts, sessions, tokens or protected resources (`.gener8v/context.md`). This delivery adds none.

### Data Protection

**Status:** Adequate
**Notes:**
- **Data handling.** The delivery collects, stores and sends nothing (CC-003): no network, storage, environment or logging calls in any delivered file.
- **Errors.** Solver defects and exceptions become one `internal_error` with a fixed message (`src/core/validate/index.ts:40-42`). Exception text such as "The triangle solver named a scale that was not supplied" never reaches the caller.
- **Text alternative.** It states caller text in full, quoted, which is intended (CC-002).

### Configuration Security

**Status:** Gaps Found
**Notes:**
- **Secrets.** There are no secrets, credentials, keys or environment reads in the delivered files.
- **Definition.** It is built by `/* @__PURE__ */ defineTriangle()`. Its `properties` come from `defineProperties`, frozen with a null prototype, and `unit` is the shared frozen spec, by identity (`tests/core/triangle.test.ts`). The `solve` object and its `inputs`/`scaled` arrays are not frozen. Nothing outside package code can reach them, because the module is not exported.
- **Own-key reads.** The new `scaleRange` breaks the project's own-key rule for range objects (SEC-002).
- **Dependency audit:**
  - Run on 2026-10-29 at 17:20:34 UTC (13:20:34 EDT), from the repository root, with pnpm 10.28.2.
  - `pnpm audit`: exit 0, "No known vulnerabilities found".
  - `pnpm audit --prod`: exit 0, "No known vulnerabilities found".
  - `5c3449d` changes neither `pnpm-lock.yaml` nor `package.json`.
- **Rebuilt `dist/`.** Running `tests/core/schema-agreement.test.ts` rebuilt `dist/`, which is gitignored. No tracked file changed.

## Findings

### SEC-001: Every set but SSS accepts triangles flatter than the solver's own margin, and their normalized descriptions fail `validate`

**Severity:** Low
**Category:** Input Validation
**OWASP Reference:** A10:2025 Mishandling of Exceptional Conditions
**Location:**
- the margin, applied only by `fromThreeSides` and `fromVertices`: `src/core/geometry/triangle-solver.ts:192` and `:177` (`DEGENERATE`, `:59`);
- the check every set shares: `drawable`, `src/core/geometry/triangle-solver.ts:114-117`, called from `checked`, `:128-131`;
- the third angle, computed by cancellation: `src/core/geometry/triangle-solver.ts:239`.

**Description:** SSS rejects sides 1, 1, 2 as degenerate ("equals, not exceeds", with the 10⁻¹² relative margin). The vertex set applies the same margin to the cross product. The SAS, ASA, AAS and SSA sets reach `checked`, whose only shape test is `drawable`: every side positive and finite, every angle strictly between 0° and 180°. Nothing applies the margin to them. Two effects follow, both probed through `validateWith` with a test registry:

1. **Exactly degenerate triangles are accepted.** `{ sideB: 1, sideC: 1, angleA: 179.99999999999997 }` is valid, and its normalized description has `sideA: 2, sideB: 1, sideC: 1` with `angleB`/`angleC` 1.42 × 10⁻¹⁴°. Validating that normalized description again gives `contradiction` (3, 4, 7-style), because SSS is the first complete set. The same holds for `{ sideA: 0.001, sideB: 0.001, angleC: 179.99999999999997 }` → `sideC: 0.002`.
2. **Thin triangles come out internally inconsistent.**
   - `{ angleA: 1e-10, angleB: 1e-10, sideC: 1 }` is valid, with derived sides 0.5000621388… The exact value is 0.5, so they are 1.2 × 10⁻⁴ off. The cause is that `angles[r] = 180 - p - q` (`:239`) loses about one ulp of 180 (≈ 1.4 × 10⁻¹⁴) against a third angle near 180°, and the law of sines then divides by its sine.
   - The normalized description's sides imply angles of 0.90°, 0.90° and 178.2°, while it states 10⁻¹⁰°, 10⁻¹⁰° and 179.9999999998°.
   - Even with exact solving, below about 0.01° the stated sides, as doubles, cannot fix the angle to within the 1% tolerance. `{ sideB: 14.0288, angleA: 0.001, angleC: 0.001 }` normalizes to sides that imply 0.000984°, and revalidation reports both angles as `contradiction`.

From the 300,000-triangle pass, for valid results that fail revalidation, by set and smallest angle:

| Set | < 10⁻⁵° | 10⁻⁵..10⁻³° | 10⁻³..10⁻²° | ≥ 10⁻²° |
|-----|---------|-------------|-------------|---------|
| SAS | 23,871 of 31,713 | 1,838 of 18,884 | 0 of 7,965 | 0 of 16,102 |
| ASA (generated as angleA, angleB, sideC) | — | 4,320 of 18,226 | 15 of 9,074 | 0 of 21,912 |
| AAS | — | 8,771 of 24,185 | 23 of 10,324 | 0 of 20,618 |
| SSS | — | — | 0 of 1 | 0 of 897 |

Nothing at or above 0.01° failed. GSS-NFR-002's property test only generates angles of at least 0.1°, so none of this is covered by the delivery's tests. TR-008 names the impact: "near-degenerate triangles are misclassified".

**Attack Scenario:** Not required for Low. The plausible path: a caller, or a model using the tool schema once TICKET-005 publishes the triangle, sends a needle triangle by SAS or ASA. The caller can only affect their own figure. `validate` vouches for it (GSV-REQ-016: callers render only from valid results). Then one of three things happens:
- a consumer that stores `normalize`'s output and validates or renders it again gets `contradiction` for a description the package accepted;
- TICKET-005's layout draws a figure whose stated angles disagree with its drawn sides;
- the layout meets a triangle of zero height (sides 2, 1, 1). If it divides by a height or an inradius to fit the drawing, that can produce `Infinity`/`NaN` coordinates.

**Impact:** The integrity of the validator's "valid" verdict, at the thin end:
- the normalized description is not stable under `validate`;
- its sides and angles can disagree by far more than the 1% tolerance;
- a downstream layout gets degenerate geometry that the SSS and vertex sets would have refused.

There is no confidentiality, code-execution or cross-user impact, and the triangle is unreachable from the public API until TICKET-005.

**Recommendation:** Make one degeneracy rule hold for every set, after solving, in `checked`:
- apply the SSS margin to the derived sides: longest ≥ the other two together, less `DEGENERATE` × longest, means `not_a_triangle`;
- add a smallest-angle floor at which the stated doubles still fix the angles within tolerance. The probes put it at about 0.01°: for example, below 0.01° report `not_a_triangle`, "too thin to draw". Choosing the floor is a Product Owner decision, because it narrows the accepted range. It should be documented in the angle and type descriptions.

Compute the third angle without the cancellation, for example `(90 - p) + (90 - q)`, which is exact for p, q ≥ 45° (Sterbenz). Add a property test: for every valid triangle from every set, including angles near the floor, `validateWith(normalized)` is valid and returns the same description. Then add a TICKET-005 Known Hazard: the layout must not divide by a triangle's height or inradius without a guard.
**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-29; the floor a Product Owner decision, Thomas Eaves, 2026-10-29). One rule for every set in `drawable`: the 10⁻¹² flatness margin on the derived sides, and every angle at least `TRIANGLE_MIN_ANGLE` = 0.02°, the floor GSS-NFR-002 is verified at. A supplied angle below 0.02° is `out_of_range` (angle `min` 0.02); a derived one gives `not_a_triangle`, "too flat or too thin to draw". The third angle is `(90 − p) + (90 − q)`. The probe cases (1, 1, 179.99999999999997°; 0.001, 0.001, 179.99999999999997°; 1e-10°, 1e-10°, 1) are tests. A new property test, "a valid triangle's normalized description is valid again, unchanged", runs 1,000 triangles per set from just above the floor and side range; it passed 10 runs of 1,000 per set. TICKET-005 has a Known Hazard against dividing by a triangle's height. Mutation checks: removing the floor fails a test; removing the margin and restoring `180 − p − q` survive, both equivalent under the floor (a flat triangle always has an angle under 0.02°, and the third angle's lost digits matter only below about 0.01°).

---

### SEC-002: `scaleRange` reads range flags through the prototype, so a polluted `Object.prototype.exclusiveMax` changes the reported range

**Severity:** Low
**Category:** Input Validation
**OWASP Reference:** A08:2025 Software or Data Integrity Failures (prototype pollution; defense in depth)
**Location:**
- `src/core/validate/solve.ts:59-86` (`scaleRange`): `own.exclusiveMin` at `:71`, `own.exclusiveMax` at `:79`, `range.min`/`range.max` at `:69` and `:77`;
- the plain objects it reads: `rangeOf`, `src/core/validate/numbers.ts:12` (`const range: Range = {}`).

**Description:** `rangeOf` reads the spec's bounds own-key (rulers NLC TICKET-002 SEC-001), but it returns an ordinary object with `Object.prototype` as its prototype. `ownRange` exists so that later readers stay own-key. `scaleRange` instead reads `own.exclusiveMin === true` and `own.exclusiveMax === true` directly, so an inherited flag counts. It also reads `range.min === undefined` and `range.max === undefined` directly. Today those two are always own, because every scaled spec and the scale spec set both bounds, but they would inherit if a later type's scale spec left one out.

Probed: with `Object.prototype.exclusiveMax = true`, enumerable or not, the issue for `{ sideA: 1e6, sideB: 1e6, angleC: 170 }` changes:
- from `range: { min: 0.001, max: 501909.9… }`, "between 0.001 and 501909.91877167363";
- to `range: { …, exclusiveMax: true }`, "at least 0.001 and less than 501909.91877167363".

No other of the 32 polluted keys changed this delivery's output.
**Attack Scenario:** Not required for Low. The precondition is a separate prototype-pollution flaw in the host application. Given that, the attacker can change the bounds stated in the `out_of_range` issues the triangle (or any later solver type) reports. They cannot change validity: `rangeBroken` reads own-key, and this path only runs once a value has already failed.
**Impact:** Misstated bounds in an already-invalid result's issue, as seen by a caller or model. This is a regression of the own-key pattern the validator otherwise keeps (`rangeOf`, `rangeBroken`, `normalizeRange`, `solverOf`).
**Recommendation:** Read every range through `ownRange`, or build ranges on a null prototype:

```ts
const own = ownRange(rangeOf(spec));          // in the loop
const current = ownRange(range);              // before comparing range.min / range.max
```

Better still, make `rangeOf` return `Object.create(null)`-backed ranges, so every future reader is safe. Add a pollution test to `tests/core/validate-solve.test.ts` next to the existing `Object.prototype.solve` one, covering `exclusiveMin`, `exclusiveMax`, `min` and `max`.
**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-29). `scaleRange` reads the scale's and every scaled term's range through `ownRange` and builds its result with own keys only. A test pollutes `Object.prototype.exclusiveMin`/`exclusiveMax` and checks the reported range and message are unchanged; both `ownRange` reads are mutation-checked.

---

### SEC-003: The solve hook checks the solver's live result, not a snapshot, so a defective solver can still put `NaN` or an out-of-range value into a valid description

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** N/A (package-internal contract; no caller-reachable path)
**Location:**
- `src/core/validate/solve.ts:32-52` (`checkedResult`), with `solved.scale` at `:48`;
- the later re-reads at `:137-147` (`runSolver`);
- the shallow issue check, `src/core/validate/domain.ts:13-18` (`assertIssue`), now shared with solvers.

**Description:** `Solver`'s documentation (`src/core/definitions/types.ts:303-313`) says a result that breaks the contract is a package defect, reported as `internal_error`. The checks run on the live object, which `runSolver` then reads again:
- **Accessors.** A `derived` entry defined as an accessor can return a finite value to the check and something else afterwards. Probed: an accessor returning 36.87 and then `NaN` produced a **valid** description with `angleA: NaN`. One returning −5 on its third read produced a valid description with `angleA: -5`. `rangeBroken(NaN, …)` returns `undefined`, so `NaN` passes the range test too.
- **`scale`.** It is read without `Object.hasOwn`. With `Object.prototype.scale = "sideA"`, a result with no `scale` of its own was accepted. Without the pollution, it is `internal_error`, as intended.
- **Issues.** They are checked for `code`, `path` and message length only, then pushed by reference. A hand-built issue with `range: { min: NaN }`, `conflicts: [{}]`, a bidi character in `path` and an extra `extra: "<script>"` field passed through unchanged. That is the same as domain checks today.

Only package-authored definitions provide solvers. The triangle's solver returns fresh plain data, so this is not reachable from caller input.
**Attack Scenario:** N/A (Informational)
**Impact:** None today. The risk is that a future solver with a bug, or one built over a polluted prototype, defeats the defect check, and a non-finite value then reaches the layout as "valid".
**Recommendation:** In `checkedResult`:
- copy `derived` into a null-prototype record from **own data properties** only (`Object.getOwnPropertyDescriptor(…).value`; refuse accessors), check the copy, and have `runSolver` use only the copy;
- read `scale` with `Object.hasOwn`;
- optionally rebuild each issue from its known fields, as `createIssue` would, or check `range` and `conflicts` too, for solvers and domain checks alike.

Add the accessor and polluted-`scale` cases to the "treats %s as a package defect" table in `tests/core/validate-solve.test.ts`.
**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-29). `checkedResult` copies `derived` into a frozen null-prototype record from own data properties only (an accessor is a defect), reads `scale` own-key from its descriptor, and returns the frozen snapshot, which `runSolver` alone uses. Tests: an accessor finite when checked and NaN afterwards, an inherited `scale`, and a `scale` on a polluted `Object.prototype`, each `internal_error`. Rebuilding each issue from its known fields, for solvers and domain checks alike, is left out, as agreed: it reaches beyond the solver (Engineer, 2026-10-29).

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Fix | One flatness rule and a 0.02° angle floor for every set; stable third angle; re-validation property test; TICKET-005 hazard | No | `src/core/geometry/triangle-solver.ts`, `src/core/definitions/triangle.ts`, `tests/core/triangle-solver.test.ts`, `tests/core/triangle.test.ts`, `tests/core/triangle-solver.property.test.ts`, `TICKET-005.md` |
| SEC-002 | Fix | Own-key range reads in `scaleRange` | No | `src/core/validate/solve.ts`, `tests/core/validate-solve.test.ts` |
| SEC-003 | Fix (issue rebuild left out) | Own-data snapshot of the solver result; own-key `scale` | No | `src/core/validate/solve.ts`, `tests/core/validate-solve.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:** SEC-001..003 fixed during resolution and recorded in the delivery record's Post-Review Amendments. Left out by agreement: rebuilding every solver and domain-check issue from its known fields (SEC-003's optional part).
- **Verdict.** The triangle and the solve hook add no confidentiality, injection or code-execution path:
  - inputs are bounded and closed, and non-finite numbers never reach the solver;
  - work is fixed, and every caller input gives a result or issues, never an exception;
  - the hook is own-key, frozen and fail-closed against caller input;
  - the dependency audit is clean.
- **SEC-001** should be settled before TICKET-005 registers and draws the triangle. Its smallest-angle floor narrows what `validate` accepts, so it needs a Product Owner decision. Whatever is decided, TICKET-005 should carry a Known Hazard on degenerate geometry in the layout.
- **SEC-002 and SEC-003** are small fixes in `src/core/validate/solve.ts` that every later solver type would inherit.
