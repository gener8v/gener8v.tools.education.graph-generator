# TICKET-009: Build a three-sides triangle's third vertex without trigonometry — Code Review

## Summary

Reviewed the change at commit f41f23f against TICKET-009, GSS-REQ-010, GSS-NFR-002, TR-008 and AD-007. The formula is correct for every base and orientation (counter-clockwise ends via `SIDE_ENDS`) and stays accurate for needle-thin and obtuse triangles. Limiting "given by three sides" to a triangle with all three sides supplied and no vertices is the right decision, including when an agreeing angle is also supplied. One Issue (a stale `@spec Coverage` row) and three Observations, none touching correctness.

**Delivery Record:** `.gener8v/changes/graph-library/delivery/geometric-shapes-and-solids-ticket-009-delivery.md`
**Files Reviewed:**
- `src/layout/triangle.ts`
- `src/core/geometry/triangle-solver.ts`
- `tests/layout/engine-math.test.ts`
- `tests/layout/triangle.test.ts`
- `.gener8v/technical-design/system-design.md` (TR-008, AD-007)
- `.gener8v/specifications/geometric-shapes-and-solids.md`
- `.gener8v/specifications/component-packaging-and-source-export.md` (`@spec Coverage` row for CPSE-NFR-005)

**Findings:** 4
**Critical:** 0 | **Issues:** 1 | **Observations:** 3

### Reviewer's judgment on the two questions asked

**Is the formula correct for every base and orientation?** Yes. `SIDE_ENDS[base] = [p, q]` puts the base's first end p at (0, 0), its second end q at (b, 0), and the third vertex is r = 3 − p − q. The side p–r is `TRIANGLE_SIDES[q]` (`reach`, the side opposite q). The side q–r is `TRIANGLE_SIDES[p]` (`t`, the side opposite p). So x = (s² + b² − t²) ÷ 2b is the law-of-cosines projection onto the base from its first end, and y = 4·area ÷ 2b = 2·area ÷ b is the height. I checked this by hand for sideA, sideB and sideC as base. An obtuse angle at p gives x < 0 and one at q gives x > b; the code applies no clamp, and the bounding box and `fitScale` handle both. y ≥ 0 always, so the vertex is above the base and the traversal stays counter-clockwise.

I measured accuracy with a BigInt exact reference. It covered a 0.02° apex triangle (349.07, 10⁶, 10⁶) in all three permutations, near-180° obtuse triangles, a 1 : 10¹² aspect and 20,000 random triangles, each with the base in two positions. The worst error in x and y was 5 × 10⁻¹² of the vertex's distance from the origin. That error comes from the inputs being rounded to doubles, not from the formula. Kahan's area keeps the needle height positive; the plain form would give 0. The cancellation in s² + b² − t² is bounded by the drawing scale, so it does not move a pixel.

In practice the base for a three-sides triangle is always `sideA`. `triangleDisplay` chooses the first supplied side, and all three are supplied. So the other two bases are correct but unreachable from the public description (see CR-003).

**Is "given by three sides" the right set?**
- *Three sides plus an agreeing angle:* `solveTriangle` takes the three-sides branch first (`givenSides.length === 3 → fromThreeSides`). The extra angle is only checked, within 1%, and never fixes the shape. Every side is `supplied`, so `bySides` is true and the vertex comes from the sides. This is right. I confirmed 3-4-5 with `angleC: 90` draws the same polygon as 3-4-5 alone, and that it holds with `Math` ±1 and ±3 ulp.
- *SSA (and SAS, ASA, AAS):* one side is derived, so the set is not `bySides` and keeps `cos`/`sin`. This is as the ticket's Known Hazard says. The vertex here depends on a supplied angle (a decimal such as 37°) and cannot be built from the sides alone. I rendered 10,000 random SAS, ASA and AAS descriptions with all approximated `Math` functions ±1 ulp. None changed. So the residual is not shown for them, but it is not ruled out either (CR-004).
- *Vertices given:* they are kept, and `bySides` requires `vertices === undefined`.

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| Third vertex x = (s² + b² − t²) ÷ 2b, y = 2·area ÷ b, with no `cos`, `sin`, `atan2` or `hypot` | Yes | `src/layout/triangle.ts`:modelVertices lines 63-70 (`fourTimesArea` is arithmetic and `sqrt`); the `else` branch alone keeps `cos`/`sin` |
| Pinned residual test replaced by one asserting 18, 19.98, 14.13 draws the same at ±1 and ±3 ulp; property test also runs seed 8 | Yes | `tests/layout/engine-math.test.ts` (`SEEDS = [8, 22, 33]`; the loop over −3, −1, 1, 3). The `else` branch is unreachable for this triangle because the test passes only with `bySides` true |
| GSS-NFR-002 round-trip and GSS-NFR-001 proportion tests pass unchanged | Yes | Neither file is in the commit's diff. I re-ran `tests/layout` and `tests/core`: 64 files and 1,887 tests passed |
| Number of changed Node-markup triangles measured and recorded | Yes (not re-measured) | Delivery record: 0 of 2,000; no changeset. I did not repeat the measurement. The sampled 3-4-5, 18/19.98/14.13 and 3-4-5 + angle triangles gave the pre-change polygons, which agrees with the record |
| TR-008 amended through Technical Design, Architect-approved | Yes | `.gener8v/technical-design/system-design.md` line 515, approval line 2026-11-02. The delivery record's Progress list still shows the item unchecked (CR-003) |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| GSS-REQ-010 | Draw a triangle from three side lengths | `src/layout/triangle.ts`:modelVertices, triangleLayout (`bySides`); `src/core/geometry/triangle-solver.ts`:fromThreeSides | Yes |
| GSS-NFR-002 | Derived sides and angles reproduce the supplied ones within 10⁻⁹ | `tests/core/triangle-solver.property.test.ts` "triangle round trip (GSS-NFR-002)"; solver untouched apart from the `export` | Yes |
| CPSE-NFR-005 (added to the `@spec` line) | Server and browser markup match | `tests/layout/engine-math.test.ts` (seeds 8, 22, 33; ±1 and ±3 ulp for the boundary case) | Yes, but see CR-001 for the specification table |

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/TC-002 | Rounded coordinates | Yes | `drawn` still passes through `rounded`/`fmt`; the change touches only the model-space vertex |
| prd/RF-003 | Engine float differences | Yes for three-sides triangles | Only `+ − × ÷` and `sqrt` are used, and ECMAScript requires these to be exact. Verified with `Math` off by 1 and 3 ulp |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-007 | A fixed drawing space; one rounding function (`fmt`) | Yes | Rounding is unchanged. The change removes the residual that AD-007's Consequences accepted for three-sides triangles |
| TR-008 | Triangle numerics: Kahan's area, no `acos`, a needle-thin triangle keeps its height | Yes | The vertex uses `fourTimesArea`. The amendment text matches the code. A 0.02° triangle keeps a positive height |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| GSS-REQ-010 | `@spec GSS-REQ-010` | `src/layout/triangle.ts`:modelVertices | No (see CR-001) |
| GSS-REQ-013, GSS-REQ-022 | existing | `src/layout/triangle.ts`:modelVertices | Yes |
| CPSE-NFR-005 | `@spec CPSE-NFR-005` | `src/layout/triangle.ts`:modelVertices | Yes |

**Coverage:** the annotation line on `modelVertices` carries `GSS-REQ-013, GSS-REQ-022, CPSE-NFR-005`. The delivery record's `@spec` table lists GSS-REQ-010 for this location, but the line does not carry it. `fromThreeSides` (which does) is the GSS-REQ-010 annotation. Whether the vertex placement needs it is minor; it is folded into CR-001.
**Missing:** none of consequence.
**Specification table:** GSS-REQ-010 row updated (yes). The CPSE-NFR-005 row (line 200 of `.gener8v/specifications/component-packaging-and-source-export.md`) does not list `src/layout/triangle.ts`:modelVertices, so No; see CR-001.

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache --maxWorkers=4 tests/layout tests/core` (a subset of the record's full-suite command) | 0 (64 files, 1,887 tests passed) | Yes |
| `npx tsc --noEmit -p .` (the record's `pnpm typecheck`, run directly) | 0 | Yes |
| Formula check against an exact BigInt reference | — | Yes (my own, larger and more extreme than the record's) |
| `pnpm generate`, lint, bench, build, `check:*`, `size`, `publint`, `attw`, audit, state script | Not re-run | Not re-verified. The change touches one layout function and its tests, so these were left to the main session's resolution run |

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001: only all-sides-supplied, no-vertices triangles use the new construction | Reasonable | Matches the ticket's Known Hazard. It is also right for three sides plus an agreeing angle, because that set is solved by the three sides and the extra angle is only checked. See CR-004 for the sets left on `cos`/`sin` |

## Findings

### CR-001: CPSE-NFR-005's `@spec Coverage` row does not list `modelVertices`

**Severity:** Issue
**Location:** `.gener8v/specifications/component-packaging-and-source-export.md`:200
**Traces To:** CONVENTIONS traceability; the `@spec` line on `src/layout/triangle.ts`:modelVertices
**Description:** The commit adds CPSE-NFR-005 to the `@spec` line on `modelVertices` and updated GSS-REQ-010's coverage row. It did not add `src/layout/triangle.ts`:modelVertices to CPSE-NFR-005's row, which lists only the e2e tests, the workflow and `src/layout/cube.ts`. The delivery record's `@spec` table says GSS-REQ-010 is annotated at `modelVertices`, but the line carries GSS-REQ-013, GSS-REQ-022 and CPSE-NFR-005, not GSS-REQ-010.
**Impact:** The two copies of the traceability mapping disagree, so a `grep @spec` audit and the specification table give different answers for this location.
**Recommendation:** Append `src/layout/triangle.ts`:modelVertices (graph-library GSS TICKET-009) to CPSE-NFR-005's row. Either add GSS-REQ-010 to the annotation line or correct the delivery record's table. The row can also name `arcPoints`, which already carries `@spec CPSE-NFR-005`.
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-11-02): the CPSE-NFR-005 coverage row lists `src/layout/triangle.ts`:thirdVertexFromSides, modelVertices; GSS-REQ-010 is now on `modelVertices`' `@spec` line and on the new helper's; the GSS-REQ-010 row names both.

---

### CR-002: The focused three-sides test would not distinguish the new vertex from the old to within 0.05

**Severity:** Observation
**Location:** `tests/layout/triangle.test.ts` (the "third vertex of a triangle given by three sides" describe block)
**Traces To:** TICKET-009 acceptance criteria 1 and 2 ("the focused test and the mutant")
**Description:** The test compares the drawn vertex with `toBeCloseTo(…, 1)`, which allows 0.05 drawing units. The old `cos`/`sin` vertex differs from the new one by about 10⁻¹⁴ relative, so the focused test cannot tell them apart. It also checks a single triangle with the base as sideA. The needle test checks only that the apex lies above the base and that nothing overlaps. What actually guards "no trigonometry" is the engine-math test, which proved itself against the `cos`/`sin` mutant in the record. The criterion's wording ("the focused test and the mutant") overstates what the focused test shows.
**Impact:** None today. If the engine-math case's coordinates were ever changed, the guard would go with it, and no test would then enforce the construction.
**Recommendation:** Optionally tighten the focused test to `toBeCloseTo(…, 9)` of the model value (compare the unscaled ratios), or assert exact equality against the formula, so it fails on a trig construction by itself.
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-11-02; also quality QR-001): the construction is the exported `thirdVertexFromSides(b, s, t)`, and a property test over 2,000 generated valid side triples (needle-thin included) asserts the vertex is s from the base's first end and t from its second, within 10⁻⁹ of the longest side, and above the base — the geometry, not the formula restated. Drawn coordinates cannot tell the two constructions apart (they agree to 10⁻¹⁴ below a 0.01 grid). Mutant: the height off by 1 in 10⁷ → the test fails.

---

### CR-003: Delivery record bookkeeping, and the other two bases are unreachable and untested

**Severity:** Observation
**Location:** `.gener8v/changes/graph-library/delivery/geometric-shapes-and-solids-ticket-009-delivery.md` (Progress); `src/layout/triangle.ts`:modelVertices
**Traces To:** CONVENTIONS delivery-record accuracy; the ticket's "every base" framing
**Description:** (a) The Progress list leaves "TR-008 amendment" unchecked, but the Delivery Summary and acceptance criteria record it done and `system-design.md` carries it. (b) For a three-sides triangle `triangleDisplay` always picks `sideA` as base, so the `sideB` and `sideC` bases of the formula can never run. They are correct (checked by hand and by the BigInt probe) but have no test. The record's "every base" formula check was an ad hoc script, not a kept test.
**Impact:** None to behaviour. The unchecked box misstates the state of the work. The unreachable bases would matter if the base choice ever changed.
**Recommendation:** Tick the box (the main session may do so when it writes amendments). Optionally keep a small parametrized test of the formula over all three bases so it survives a change to `triangleDisplay`.
**Status:** Resolved
**Resolution:** Noted (approved by Engineer — Thomas Eaves, 2026-11-02): the Progress line is ticked (TR-008 was amended and approved on 2026-11-02); a three-sides triangle stands on side a, so the other two bases of `thirdVertexFromSides` are unreachable today — the helper's property test covers every base length and side order.

---

### CR-004: Sets with a derived side keep `cos`/`sin`; "the one residual" claim is wider than what was demonstrated

**Severity:** Observation
**Location:** `src/layout/triangle.ts`:modelVertices (the `else` branch); `.gener8v/technical-design/system-design.md`:515 (TR-008 amendment)
**Traces To:** AD-007 Consequences, TR-002, CPSE-NFR-005; TICKET-009 Known Hazards
**Description:** SAS, ASA, AAS and SSA still place the third vertex with `reach · cos(angle)` and `reach · sin(angle)`. The ticket says to keep this "unless a test shows the same residual for them". I rendered 10,000 random SAS, ASA and AAS descriptions with every approximated `Math` function ±1 ulp, and none changed, so there is no evidence against the decision. A supplied angle in decimal degrees can still land a vertex exactly on a rounding boundary, so the possibility is not excluded. The TR-008 amendment and the record state the residual as removed for three-sides triangles only, which is accurate.
**Impact:** Possible future cross-engine hydration mismatch for a non-three-sides triangle, much rarer than the case closed here and without a known instance.
**Recommendation:** No change needed now. Optionally note in AD-007's Consequences that the boundary risk remains for sets built from an angle and is covered only by the property test and the cross-engine e2e run. If an instance is found, handle it as its own ticket.
**Status:** Resolved
**Resolution:** Accepted (approved by Engineer — Thomas Eaves, 2026-11-02): the residual is ruled out for three-sides triangles only; sets with a derived side keep `cos`/`sin`, and 10,000 sampled SAS, ASA and AAS descriptions showed no change at ±1 ulp.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Fixed | coverage rows; `@spec` GSS-REQ-010 | `src/layout/triangle.ts`, `.gener8v/specifications/component-packaging-and-source-export.md`, `.gener8v/specifications/geometric-shapes-and-solids.md` |
| CR-002 | Fixed | `thirdVertexFromSides` and a distance property test | `src/layout/triangle.ts`, `tests/layout/triangle.test.ts` |
| CR-003 | Noted | Progress ticked; unreachable bases recorded | delivery record |
| CR-004 | Accepted | — | — |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 — two fixed, one noted, one accepted (Engineer — Thomas Eaves, 2026-11-02)
