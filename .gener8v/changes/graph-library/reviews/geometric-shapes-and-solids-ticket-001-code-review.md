# TICKET-001: Isometric projection kit — Code Review

## Summary

I reviewed the delivery of `graph-library/geometric-shapes-and-solids/TICKET-001`: delivery commit `88b80fe` on branch `ticket/gss-001`, on top of `main` at `f2b3f30`. I checked it against:
- the ticket's six acceptance criteria and its two Known Hazards (no oblique projection; no rounding inside `isometric()`);
- GSS-REQ-032 and the GSS `## @spec Coverage` table, GSS-REQ-030 as the doc comment cites it, and NLC-REQ-035;
- `constraints/prd.md` (TC-002 and TC-010, plus TC-001, TC-005 and TC-007 as they apply to a layout kit module);
- `technical-design/system-design.md` (AD-009, AD-007, AD-001, AD-002, and the Layout kit interface), and dependency-map RES-003 / RD-004;
- what the three consumers will need: GSS TICKET-006 (cube), GSS TICKET-007 (cylinder) and NLC TICKET-004 (x,y,z graph), with TICKET-008's proportion test.

What holds, checked by in-memory probes rather than taken from the record:
- **True isometric.** `isometric` equals the orthographic projection along (1, 1, 1) to within 6e-14 over 10,000 random points. The axes are drawn at −150°, −30° and 90°, 120° apart, each √(2/3) long. Screen right × screen up equals `VIEW_DIRECTION`, so the drawing is right-handed, not mirrored.
- **Equal lengths.** Equal lengths along any axis draw equal to within 8e-13, absolute, over 200,000 cases (starts within ±1,000, lengths up to 1,000). That is far inside 10⁻⁹.
- **`isoEllipse` is exact.** A horizontal circle projects to a level ellipse with `rx = r` and `ry = r/√3`. Sampled points satisfy its equation within 1.5e-10; the widest points are at 135° and 315°, the tallest at 45° and 225°.
- **Visible faces.** +x, +y and +z are visible. A ray test against the solid cube independently finds exactly 3 hidden edges (those meeting at the origin) and 9 visible. All 12 edges draw the same length.
- **The record's notes for the cylinder.** The base's back half is exactly the half above `cy` (718 of 718 sampled points). The side lines at `cx ± rx` are the silhouette tangents.
- **Verification Run.** Every command reproduces with exit 0, and `pnpm test` passes 1,111 tests on each of three runs. Two commands were not re-run: `pnpm size` (it writes to the system temp directory; no entry imports the module) and `pnpm generate` (it writes source files; the freshness test passes). The deliberate `import "react"` break reproduces through `eslint --stdin` without editing the file.

There is one Issue:
- **CR-001.** Acceptance criterion 4 is not met as written, and DEL-001, which records why, has the wrong figures. The gap between 1/√3 and sin(35.264°) is 5.55e-6, not 6.3e-5: the record evaluated sin(35.26°). The test comment repeats the wrong gap, the test's bound is 18 times the real one, and one rationale in DEL-001 does not hold.

There are three Observations:
- **CR-002.** `ELLIPSE_RATIO`'s doc comment calls 35.264° "the angle the page tilts from the horizontal plane". The page tilts 54.74° from the horizontal; 35.264° is the line of sight's angle to the horizontal.
- **CR-003.** A cylinder radius drawn across the page, to the top ellipse's end, is not foreshortened (`rx = r`), while the height is. For the ticket's example the drawn radius-to-height ratio is 22.5% off GSS-REQ-030. Neither the record's Notes nor TICKET-007 says so, and the specification's default radius direction is "horizontally to the right".
- **CR-004.** A cube's front corner and its hidden back corner project to the same point, so three solid and three dashed edges meet at the hexagon's centre. Neither the doc comment nor the Notes for TICKET-006 says so.

**Reviewer:** `code-reviewer` agent, fresh context (findings phase only, 2026-10-19)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/geometric-shapes-and-solids-ticket-001-delivery.md`
**Files Reviewed:**
- `src/layout/kit/isometric.ts`
- `tests/layout/kit/isometric.test.ts`
- `.gener8v/specifications/geometric-shapes-and-solids.md` (the `## @spec Coverage` row added for GSS-REQ-032)
- Read for context, unchanged here: `src/layout/kit/scale.ts` (the no-rounding precedent), `src/layout/kit/format.ts`, `src/layout/kit/measure.ts`, `src/layout/kit/markers.ts`, `src/layout/kit/value-scale.ts` (kit doc-comment and `@spec` placement), `src/layout/scene.ts`, `src/layout/registry.ts`, `eslint.config.js` (non-rendering boundary), `package.json` (`sideEffects`), `tsup.config.ts`, `tests/core/schema-shape.test.ts` (generated-file freshness)

**Findings:** 4
**Critical:** 0 | **Issues:** 1 | **Observations:** 3

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| `isometric(x, y, z)` returns 2D drawing coordinates with the x, y and z axes projected 120° apart and equally foreshortened | Yes | `src/layout/kit/isometric.ts:33-35`. `tests/layout/kit/isometric.test.ts:21` checks −150°, −30° and 90° to 9 places; `:32` checks that each unit axis draws `ISO_SCALE` long, within 1e-12. Probe: equal to the orthographic projection along (1, 1, 1) within 6e-14, right-handed |
| The module exports the isometric scale factor and the ellipse ratio used for horizontal circles, so callers and tests can remove the foreshortening | Yes | `ISO_SCALE` (`src/layout/kit/isometric.ts:5`, √(2/3)) and `ELLIPSE_RATIO` (`:11`, 1/√3), both exported. The tests divide by `ISO_SCALE` (`tests/layout/kit/isometric.test.ts:41`) |
| Equal lengths along any of the three axes project to equal drawn lengths (unit test within 10⁻⁹) | Yes | `tests/layout/kit/isometric.test.ts:32` (unit lengths, within 1e-12) and the property at `:37` (within 1e-9 × max(1, length)). Probe: absolute pairwise difference at most 8e-13 over 200,000 cases |
| A helper projects a horizontal circle (center, radius) to ellipse parameters, with minor/major ratio within 10⁻⁶ of sin(35.264°) | Partial | `isoEllipse` (`src/layout/kit/isometric.ts:72-75`) is exact: level, `rx = r`, `ry = r/√3`. The property at `tests/layout/kit/isometric.test.ts:103` puts 72 sampled points of each circle on it within 1e-9. But its ratio, 1/√3 = 0.5773503, is 5.55e-6 from sin(35.264°) = 0.5773447, outside 10⁻⁶. The exact ratio AD-009 implies cannot meet the tolerance as written. DEL-001 records this, with wrong figures (CR-001) |
| The projection is documented (angles, axis directions, which faces are visible) in the module's doc comment, as the documented viewpoint GSS-REQ-032 requires | Yes | The doc comment on `isometric` (`src/layout/kit/isometric.ts:15-31`) states: z up; x lower left and y lower right, 30° below horizontal, 120° apart; equal foreshortening by `ISO_SCALE`; +x, +y and +z faces visible; the 9 visible and 3 hidden cube edges. Each statement holds under probe. As in the other kit modules, the doc sits on the main function rather than a file header. `ELLIPSE_RATIO`'s comment misnames the angle (CR-002) |
| The module imports nothing from React and passes the import-boundary lint rule | Yes | The file has no import statement. `src/layout/**` is in the non-rendering block (`eslint.config.js:115-128`). `pnpm lint` exits 0. Piped through `eslint --stdin --stdin-filename src/layout/kit/isometric.ts` with `import "react"` prepended, it fails `no-restricted-imports` with the boundary message; with a `window` read, it fails `no-restricted-globals` |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| GSS-REQ-032 (the viewpoint part) | Draw cubes and cylinders from one fixed, documented viewpoint shared by both solids | `src/layout/kit/isometric.ts:isometric` (the projection and its doc comment), `faceVisible` with `VIEW_DIRECTION` and `VISIBLE_FACES` (which faces the viewpoint shows), `isoEllipse` (circular faces); tested by `tests/layout/kit/isometric.test.ts` | Yes |

*The ticket carries GSS-REQ-032 only, and no NFR. The record states it is met here only in part: this ticket supplies the viewpoint, and TICKET-006 and TICKET-007 draw the solids from it. The doc comment also names NLC-REQ-035 and GSS-REQ-030 in prose. They belong to NLC TICKET-004 and to the solid tickets with TICKET-008, so no annotation is expected here.*

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/TC-010 | 3D drawn in 2D SVG with a fixed projection and analytically determined hidden lines | Yes | `isometric` takes coordinates only; no view parameter exists. `faceVisible` gives the analytic front-facing test the solids will use (DEL-002); there is no depth buffer |
| prd/TC-002 | Computed coordinates rounded before they are written to markup | Yes | Nothing is rounded here, as the Known Hazard requires; callers apply `fmt()` when writing the Scene (doc comment `:28-30`). The module uses only `Math.sqrt` and arithmetic, none of the trigonometric functions TC-002 names |
| prd/TC-001 | No measuring; output from the description alone | Yes | Pure functions of their arguments |
| prd/TC-005 | Non-rendering code loads no React DOM or browser global | Yes | No imports; covered by the `src/layout` boundary lint (see criterion 6) |
| prd/TC-007 | Side-effect-free modules, tree-shakable per type | Yes | `package.json` sets `"sideEffects": false`, so an unused module is dropped. Probe: an esbuild bundle that imports only `isometric` keeps the top-level `Object.freeze` calls for `VIEW_DIRECTION` and `VISIBLE_FACES`, about 100 bytes. That is a size matter for Quality Review, not a compliance gap |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-009 | One true isometric projection for x,y,z graphs, cubes and cylinders, in `src/layout/kit/isometric.ts`; ellipse ratio ≈ 0.577; hidden edges analytic per solid | Yes | The file path matches. The projection is orthographic along (1, 1, 1), with axes 120° apart and foreshortened equally by √(2/3). `ELLIPSE_RATIO` = 1/√3 ≈ 0.57735. `faceVisible` supports per-solid analytic hidden edges. The Consequences ("compare lengths along projected axes after removing the single isometric scale factor") are served by the exported `ISO_SCALE` |
| AD-007 | One rounding function, applied when numbers are written into a Scene | Yes | Unrounded results, the same rule as `linearScale` (`src/layout/kit/scale.ts`); this ticket writes no Scene |
| AD-002 | Pure layout stage | Yes | Pure, import-free kit functions |
| AD-001 | Non-rendering code is separate from React | Yes | As prd/TC-005 |
| Layout kit interface | `isometric(x, y, z) → [x, y]` (`.gener8v/technical-design/system-design.md:266`) | Yes | Same signature; returns `[number, number]` |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| GSS-REQ-032 | `@spec GSS-REQ-032` | `src/layout/kit/isometric.ts:isometric` (line 32), `faceVisible` (line 51), `isoEllipse` (line 71) | Yes |

**Coverage:** 1 of 1 requirements annotated. Each annotation sits on the line directly above its function, after the JSDoc, as in the other kit modules (`src/layout/kit/scale.ts`). The exported constants carry none, which matches the house rule for functions, classes and handlers.
**Missing:** None
**Specification table:** Yes. `## @spec Coverage` in `.gener8v/specifications/geometric-shapes-and-solids.md` (line 159) lists `src/layout/kit/isometric.ts`:isometric, faceVisible, isoEllipse, and says it is the viewpoint only. The row is in order between GSS-REQ-006 and GSS-REQ-033.

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm generate` | not re-run (it writes `src/generated`) | Yes. The delivery changes no definition, and "are committed exactly as a fresh build writes them" (`tests/core/schema-shape.test.ts:302`) passes inside `pnpm test` |
| `pnpm lint` | 0 | Yes |
| `pnpm typecheck` | 0 | Yes |
| `pnpm test` (three runs) | 0, 0, 0 | Yes (42 files, 1,111 tests on each run; `tests/layout/kit/isometric.test.ts` has the 10 new tests) |
| `pnpm bench` | 0 | Yes (7 passed) |
| `pnpm build` | 0 | Yes |
| `pnpm check:dist` | 0 | Yes (14 built files scanned, no network APIs or modules) |
| `pnpm check:deps` | 0 | Yes (0 runtime dependencies) |
| `pnpm check:images` | 0 | Yes (8 images, licenses recorded) |
| `pnpm size` | not re-run (it writes to the system temp directory) | Yes by inspection. Only `tests/layout/kit/isometric.test.ts` imports the module, so no size-limit entry can change |
| `pnpm publint` | 0 | Yes (All good) |
| `pnpm attw` | 0 | Yes |
| `pnpm audit` | 0 | Yes (No known vulnerabilities found) |
| `python3 …/gener8v-state.py lint` | 0 | Yes (0 errors, 0 warnings) |
| `pnpm eslint src/layout/kit/isometric.ts` with `import "react"` added | 1 | Yes. Reproduced without editing the file: the module piped to `eslint --stdin --stdin-filename src/layout/kit/isometric.ts` with the import prepended reports `no-restricted-imports`: "Non-rendering code must not load React or browser globals (AD-001, prd/TC-005)" |

*The five further deliberate breaks in the record were not re-run, because they need source edits. By reading, each trips a named assertion:*
- *x and y swapped: the angle test (`tests/layout/kit/isometric.test.ts:21`);*
- *z not foreshortened, or the wrong scale: `:32-34`;*
- *a foreshortened `rx`: the ellipse equation at `:112`;*
- *an edge-on face counted as visible: `:71`.*

*No review command changed a tracked file; `.gener8v/runs.jsonl` is written by the hooks. During the review, a concurrent session modified `.gener8v/prd.md` and `.gener8v/pipeline-state.yaml` and added `.gener8v/changes/rulers/change.md` (a new `rulers` change brief, `Draft`). These are not this review's writes.*

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable decision, wrong figures | The exact ratio 1/√3 is the only one AD-009's true isometric gives, and the ellipse test at 1e-9 depends on it. The Context's numbers are those of sin(35.26°), not sin(35.264°): the gap is 5.55e-6, not 6.3e-5. The rationale that a rounded ratio would make the cylinder's sides "miss the ellipse ends" does not hold, since the sides touch at (cx ± rx, cy) whatever `ry` is (CR-001) |
| DEL-002 | Reasonable | Outward normals with a sign test serve the cube's faces and the cylinder's curved side alike. The edge rule ("hidden when both faces are hidden") lives in the test, not the module; that fits AD-009, which computes hidden edges per solid. An exactly edge-on face is not visible (strict `> 0`, tested). At the cylinder's silhouette normals (135° and 315°), floating-point rounding makes one side true and the other false. This is harmless because the Notes tell TICKET-007 to split the base at `cy` instead |

*Deviations from the plan: the record lists none, and carries the relaxed ellipse-ratio tolerance as DEL-001. The approved plan repeated the 10⁻⁶ tolerance against sin(35.264°), so that is a deviation from the plan as well as from criterion 4 (CR-001).*

*What the downstream tickets need from the module:*
- *NLC TICKET-004 (x,y,z graph): served. `isometric` gives every axis, tick and point position, and `ISO_SCALE` relates tick spacing to drawn length. The projection is linear (tested), so negative ranges and translation into the drawing need no projection maths in the layout.*
- *TICKET-006 (cube): served. `faceVisible` with the edge rule gives 9 solid and 3 dashed edges, and all 12 draw equal. One unstated consequence: CR-004.*
- *TICKET-007 (cylinder): served. `isoEllipse` gives the top and base, the sides at `cx ± rx`, and the back half above `cy`. One unstated consequence, which bears on GSS-REQ-030 and TICKET-008's proportion test: CR-003.*

## Findings

### CR-001: Acceptance criterion 4 is not met as written, and DEL-001's figures for the gap are wrong by a factor of 11

**Severity:** Issue
**Location:** `.gener8v/changes/graph-library/delivery/geometric-shapes-and-solids-ticket-001-delivery.md` (DEL-001, lines 110-115; the criterion 4 line, 104; Deviations, 126); `tests/layout/kit/isometric.test.ts:93-98`; `src/layout/kit/isometric.ts:11` (`ELLIPSE_RATIO`)
**Traces To:** Acceptance criterion 4; AD-009; DEL-001; the approved Implementation Plan ("whose ratio is within 10⁻⁶ of sin(35.264°)")
**Description:** The code is right. AD-009 asks for true isometric, whose exact ratio is 1/√3 = sin(atan(1/√2)). The criterion asks for a ratio within 10⁻⁶ of sin(35.264°), and 1/√3 misses it:
- sin(35.264°) = 0.5773447 and 1/√3 = 0.5773503, a gap of 5.55e-6.
- So the ratio meets the criterion's tolerance against the exact angle, 35.26439°, but not against the angle the ticket writes. To land within 10⁻⁶, the angle would have to be within 7e-5° of the exact one.

DEL-001 records this, but its numbers are those of sin(35.26°), not sin(35.264°):
- It gives sin(35.264°) = 0.577288 and a gap of 6.3e-5. Probe: sin(35.26°) = 0.5772877, a gap of 6.26e-5.
- The test comment (`tests/layout/kit/isometric.test.ts:93-94`) repeats 6.3e-5. The test's check against sin(35.264°) (`:98`) uses a bound of 1e-4, 18 times the real gap.

DEL-001's rationale also says a cylinder drawn with the rounded ratio "would have its sides miss the ellipse ends". It would not. The sides touch the ellipse at (cx ± rx, cy) whatever `ry` is. The rounded ratio would shorten `ry` by 5.55e-6 × r, about 0.001 units for r = 200, which is below `fmt()`'s 0.01 step. What the exact ratio gives is agreement with AD-009 and an ellipse test that holds at 1e-9.

The record ticks criterion 4 and lists no deviation, although the plan repeated the 10⁻⁶ tolerance.
**Impact:** None on the drawing. DEL-001 is the only record of why a criterion was relaxed. Its readers inherit a gap 11 times too large and a reason that does not hold: the Audit, TICKET-007, and anyone revisiting the projection under TR-005. The ticket's wording also stays unreconciled with AD-009.
**Recommendation:**
- Correct DEL-001's Context: sin(35.264°) = 0.5773447, a gap of 5.55e-6, still more than 10⁻⁶. Replace the "sides miss the ellipse ends" rationale with the real one: exactness under AD-009, and the 1e-9 ellipse test.
- In `tests/layout/kit/isometric.test.ts`, correct the comment and tighten the sin(35.264°) bound to 1e-5.
- In the record, mark criterion 4 as met against the exact angle, and list the relaxed tolerance under Deviations from Plan.
- Note for the next Audit that the criterion should have named 1/√3 = sin(atan(1/√2)). The delivered ticket's file is not rewritten.
**Status:** Resolved
**Resolution:** Fixed — the test comment states the real gap (5.55e-6) and the check against sin(35.264°) tightens to 1e-5. The delivery record's Post-Review Amendments correct DEL-001's figures and rationale, and record the tolerance, met against the exact tilt, as a deviation from the plan. Approved by the user, 2026-10-19.

---

### CR-002: `ELLIPSE_RATIO`'s doc comment names the wrong angle as the page's tilt

**Severity:** Observation
**Location:** `src/layout/kit/isometric.ts:7-10`
**Traces To:** Acceptance criterion 5; GSS-REQ-032 and NLC-REQ-035 (a "documented" viewpoint); AD-009
**Description:** The comment says 1/√3 is "the sine of the angle the page tilts from the horizontal plane, atan(1/√2) ≈ 35.264°". The page, the picture plane whose normal is `VIEW_DIRECTION`, makes acos(1/√3) = 54.74° with the horizontal plane (probe). 35.264° is the angle the line of sight makes with the horizontal plane, which is also the page's tilt from the vertical. The ratio is the sine of that angle, or the cosine of the page's 54.74° tilt from the horizontal. The test title, "the sine of the isometric tilt", is right in the usual sense of the camera's tilt below the horizontal.
**Impact:** Small; the number is right. A reader checking the documented viewpoint against the geometry finds a wrong statement in it. NLC TICKET-004 will point to this module as the documented projection.
**Recommendation:** Reword to "the sine of the angle between the line of sight and the horizontal plane, atan(1/√2) ≈ 35.264° (equivalently, the cosine of the page's 54.74° tilt from the horizontal)".
**Status:** Resolved
**Resolution:** Fixed — `ELLIPSE_RATIO`'s comment names the angle between the line of sight and the horizontal plane, with the page's 54.74° tilt as the equivalent. Approved by the user, 2026-10-19.

---

### CR-003: A cylinder radius drawn across the page is not foreshortened, and nothing tells TICKET-007

**Severity:** Observation
**Location:** `src/layout/kit/isometric.ts:64-75` (`isoEllipse`); delivery record Notes (line 144)
**Traces To:** GSS-REQ-029; GSS-REQ-030; GSS-NFR-001; GSS Behaviors & Rules, Drawing ("When a radius is drawn, it should run from the center horizontally to the right unless otherwise documented"); graph-library/geometric-shapes-and-solids/TICKET-007 acceptance criterion 5 and its Known Hazard; graph-library/geometric-shapes-and-solids/TICKET-008 (solids "measured along projected axes after dividing by `ISO_SCALE`"); AD-009 Consequences
**Description:** `isoEllipse` gives `rx = r`. A horizontal circle's left-to-right extent lies parallel to the page and draws at full length; this is correct, and documented at `:67-69`. Lengths along the axes draw `ISO_SCALE` long. For the ticket's example (radius 2, height 5):
- A radius drawn from the top centre horizontally to the right, to (cx + rx, cy), draws 2. That is the specification's default radius direction, and the end of the ellipse.
- The height draws 5 × `ISO_SCALE` = 4.08.
- The drawn ratio is then 0.49 against a measurement ratio of 0.4: 22.5% off, against GSS-NFR-001's 1%.
- A radius along a horizontal axis instead ends at the projection of (x₀ + r, y₀, h). It lies on the same ellipse and draws r × `ISO_SCALE` = 1.63, giving the ratio 0.4 (probe).

The Notes for TICKET-007 say where the sides and the hidden half are, but not where a radius may be drawn. TICKET-007's Known Hazard says to compare the radius "along the projected axis" because "the ellipse's minor axis is foreshortened differently". That implies the major axis is foreshortened like the axes, but it is not foreshortened at all: dividing `rx` by `ISO_SCALE` gives 1.22 r. TICKET-008 measures solids along projected axes, and cannot measure a radius drawn across the page.
**Impact:** TICKET-007 can follow the specification's default direction, draw the radius to the ellipse's end, and fail GSS-REQ-030. Or it can satisfy its criterion 5 only by measuring a segment other than the one drawn.
**Recommendation:** Add this to the record's Notes, and append a Known Hazard to TICKET-007 and TICKET-008:
- Draw the radius (and a diameter) on the top face along a projected horizontal axis, ending at the projection of (x₀ ± r, y₀, h) or (x₀, y₀ ± r, h). That point lies on the `isoEllipse` ellipse, and the segment shares the height's scale.
- Document that direction as the cylinder's "otherwise documented" radius direction.
- Never divide `rx` or `ry` by `ISO_SCALE`.

If the Product Owner prefers the radius drawn across the page, the specification needs a stated exception to GSS-REQ-030 for it.
**Status:** Deferred
**Resolution:** Deferred → TICKET-007 — Known Hazards appended to `tickets/geometric-shapes-and-solids/TICKET-007.md` (draw the radius along a projected horizontal axis; never divide `rx` or `ry` by `ISO_SCALE`) and `TICKET-008.md` (measure it along that axis); noted in the delivery record. Approved by the user, 2026-10-19.

---

### CR-004: A cube's front corner and its hidden back corner project to the same point, and the Notes for TICKET-006 do not say so

**Severity:** Observation
**Location:** `src/layout/kit/isometric.ts:24-26` (doc comment, visible faces); delivery record Notes (line 143)
**Traces To:** graph-library/geometric-shapes-and-solids/TICKET-006 acceptance criteria 1 and 4; GSS-REQ-023; GSS-REQ-024; GSS-REQ-025; GSS-NFR-003; AD-009; TR-005
**Description:** In true isometric, the line of sight runs along the cube's main diagonal, so (a, a, a) and (0, 0, 0) both project to (0, 0) (probe). The cube draws as a regular hexagon whose centre carries six edges:
- the three visible edges meeting at the front corner, toward the upper left, the upper right and straight down;
- the three dashed hidden edges, toward the lower left, the lower right and straight up.

They alternate at 60°, so none overlaps another, and the 9 / 3 count holds (ray test). The doc comment says the hidden edges "meet at its back bottom corner", and the Notes say the hidden corner is at the origin. Neither says that this corner is drawn on top of the front corner.
**Impact:** Nothing in this module is wrong, but TICKET-006 inherits two unstated consequences:
- The labels for "the three visible edges meeting at the front corner" (criterion 4) sit inside the hexagon, between the dashed edges. Those edges must be label obstacles for GSS-NFR-003.
- With hidden edges dashed, the figure is a hexagon with a solid "Y" and a dashed "Y" meeting at one point. This is the standard isometric cube with hidden lines, and it is the figure TR-005 (teachers expect the oblique cube) will be judged on.
**Recommendation:** Add the coincidence to the record's Notes and to the `isometric` doc comment. Append a Known Hazard to TICKET-006: the hidden edges run from the hexagon's centre to alternate corners; include them as obstacles when placing edge labels.
**Status:** Resolved
**Resolution:** Fixed and Deferred → TICKET-006 — the `isometric` doc comment states that the front and back corners coincide, and a Known Hazard on `tickets/geometric-shapes-and-solids/TICKET-006.md` makes the hidden edges label obstacles. Approved by the user, 2026-10-19.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Fixed | Test comment and bound corrected; DEL-001 corrected in Post-Review Amendments; deviation recorded | `tests/layout/kit/isometric.test.ts`, delivery record |
| CR-002 | Fixed | `ELLIPSE_RATIO` comment reworded | `src/layout/kit/isometric.ts` |
| CR-003 | Deferred → TICKET-007 | Known Hazards on TICKET-007 and TICKET-008; record note | `tickets/geometric-shapes-and-solids/TICKET-007.md`, `TICKET-008.md`, delivery record |
| CR-004 | Fixed; Deferred → TICKET-006 | Doc comment; Known Hazard on TICKET-006 | `src/layout/kit/isometric.ts`, `tickets/geometric-shapes-and-solids/TICKET-006.md` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (3 Resolved, 1 Deferred → TICKET-007)
**Notes:**
- The projection, ellipse and visible-face behaviour are correct and were verified numerically. Criterion 4 is met against the exact isometric tilt, atan(1/√2), within 1e-6, and against the ticket's rounded 35.264° within 1e-5; the delivery record now states the real gap and records the relaxed tolerance as a deviation (CR-001).
- CR-003 and CR-004 are downstream guidance, carried as Known Hazards on TICKET-006, TICKET-007 and TICKET-008.
- `pnpm generate` (no change), `lint`, `typecheck`, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size`, `publint`, `attw`, `audit` and `gener8v-state lint` exit 0. `pnpm test` (1,111 tests) exits 0 on three runs.
- Outside this review's remit: the GSS specification's Assumption still says "one oblique-style projection" (`.gener8v/specifications/geometric-shapes-and-solids.md:145`); AD-009 supersedes it, for a Specification amendment.
