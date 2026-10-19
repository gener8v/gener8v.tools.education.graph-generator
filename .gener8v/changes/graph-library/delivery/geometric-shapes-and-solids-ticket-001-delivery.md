# TICKET-001: Isometric projection kit — Delivery Record

## Ticket Reference

**Ticket:** graph-library/geometric-shapes-and-solids/TICKET-001
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/geometric-shapes-and-solids.md`
**Requirements Covered:**
- GSS-REQ-032: Draw cubes and cylinders from one fixed, documented viewpoint shared by both solids

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Depends On | none | none; the cross-area predecessor CPSE TICKET-002 (Scene model, `fmt`) is done | ✅ |
| `src/layout/kit/format.ts`, `src/layout/scene.ts` | present | `fmt`, `fmtPoints`, `pathData`, `translate`, `rotate`; the Scene model with `Rounded` attribute values | ✅ |
| `src/layout/kit/isometric.ts` | absent (created here) | absent | ✅ |
| AD-009 (true isometric, axes 120° apart, ellipse ratio ≈ 0.577) | present | `.gener8v/technical-design/system-design.md:125-135`; TQ-004 (Product Owner confirmation of isometric) is checked | ✅ |
| RES-003 / RD-004: one projection for NLC and GSS | present | `.gener8v/dependencies/dependency-map.md:125-128, 213-215` | ✅ |
| Import-boundary lint rule for `src/layout` | present | `eslint.config.js`: `layout` is a non-rendering directory; React, React DOM, network modules and browser globals are restricted there | ✅ |
| Known Hazard: spec Assumptions say "oblique-style" | isometric | AD-009 supersedes it; the spec line (`specifications/geometric-shapes-and-solids.md:145`) is unchanged | 🔁 Carried — isometric is implemented; the spec wording is left to a specification amendment |
| Known Hazard: no rounding inside `isometric()` | — | `linearScale` (`src/layout/kit/scale.ts`) follows the same rule: unrounded, callers use `fmt()` | 🔁 Carried |
| Carried: CPSE TICKET-002 QR (path data built outside `pathData`) | — | `pathData`, `fmtPoints` exist; this ticket writes no Scene | ✅ Not applicable — no Scene output here |
| Downstream consumers' needs | — | GSS TICKET-006 expects "9 visible edges solid and 3 hidden edges dashed" for a cube, so the view must look at a corner, with three faces visible | ✅ Fixes the view direction |

**Resolved from ground truth (not escalated):**
- **Axis directions:** the cube ticket's 9 visible / 3 hidden edges and NLC's x,y,z graphs fix a corner view from the positive octant: z up, x toward the viewer's lower left, y toward the lower right, the three positive faces visible. That is the common textbook x,y,z arrangement.
- **Ellipse:** for a horizontal circle under true isometric, the projected ellipse is axis-aligned on screen, its major axis horizontal and equal to the radius in drawing units (the foreshortening and the horizontal stretch cancel), its minor axis r/√3. So `isoEllipse` returns `{ cx, cy, rx, ry }`, which an SVG `<ellipse>` takes directly with no rotation.

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.` (branch `ticket/gss-001`, on top of `main` at f2b3f30)
**Plan approved by:** Engineer — Thomas Eaves, 2026-10-19

### Planned Files

- `src/layout/kit/isometric.ts`: pure maths, no React import, no rounding (AD-007; the callers round with `fmt()`).
  - **Viewpoint** (AD-009): true isometric, looking at a corner from above. z points up; x toward the lower left and y toward the lower right, each 30° below horizontal; the three axes are 120° apart. The three positive faces are visible: +x on the left, +y on the right, +z on top. A cube shows 9 visible and 3 hidden edges (GSS TICKET-006).
  - `isometric(x, y, z): [number, number]`: drawing coordinates, origin at (0, 0), screen y pointing down.
  - `ISO_SCALE = √(2/3)` (≈ 0.8165): the drawn length of one unit along any axis.
  - `ELLIPSE_RATIO = 1/√3` (≈ 0.57735 = sin 35.264°): the minor-to-major ratio of a horizontal circle.
  - `isoEllipse(center, r)` → `{ cx, cy, rx, ry }`: level on screen, `rx = r`, `ry = r/√3`, ready for an SVG `<ellipse>` with no rotation. The comment explains why `rx = r` (the foreshortening and the sideways stretch cancel).
  - `VISIBLE_FACES`, `VIEW_DIRECTION` and `faceVisible(normal)`: which faces are visible, for analytic hidden edges in the cube and cylinder layouts.
  - The doc comment documents the viewpoint (angles, axis directions, visible faces), annotated `@spec GSS-REQ-032`.
- `tests/layout/kit/isometric.test.ts`: axes 120° apart; equal lengths along each axis draw equal within 10⁻⁹ (with a property test); points on a horizontal circle land on the `isoEllipse` ellipse, whose ratio is within 10⁻⁶ of sin(35.264°); only the three positive faces are visible; the projection is linear.
- `.gener8v/specifications/geometric-shapes-and-solids.md`: a `## @spec Coverage` row for GSS-REQ-032.

### How Acceptance Criteria Will Be Met

- `isometric(x, y, z)`, axes 120° apart and equally foreshortened: tests of the projected unit vectors' angles and lengths.
- The scale factor and ellipse ratio are exported: `ISO_SCALE` and `ELLIPSE_RATIO`, used by the tests to remove the foreshortening.
- Equal lengths project to equal drawn lengths within 10⁻⁹: a unit test and a fast-check property over random lengths and origins.
- Horizontal circle to ellipse, ratio within 10⁻⁶ of sin(35.264°): `isoEllipse`, with a test that projected circle points satisfy the ellipse equation.
- The documented viewpoint: the module's doc comment, checked by the code review.
- No React import, boundary lint passes: `pnpm lint`, and the existing boundaries tests in `pnpm test`.

## Progress

- [x] `src/layout/kit/isometric.ts` — written, annotated
- [x] `tests/layout/kit/isometric.test.ts` — written, 10 tests
- [x] `.gener8v/specifications/geometric-shapes-and-solids.md` — coverage row for GSS-REQ-032

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/layout/kit/isometric.ts`: `Point3`, `isometric(x, y, z)`, `ISO_SCALE`, `ELLIPSE_RATIO`, `VIEW_DIRECTION`, `VISIBLE_FACES`, `faceVisible(normal)`, `IsoEllipse`, `isoEllipse(center, r)`. The module's doc comment on `isometric` documents the viewpoint. Nothing is rounded and nothing is imported.
- `tests/layout/kit/isometric.test.ts`: axis directions and the 120° spacing; the origin and page direction; equal foreshortening by `ISO_SCALE`; equal drawn lengths within 1e-9 (property); linearity (property); the view direction projects to a point; the visible and hidden faces, and 9 visible and 3 hidden cube edges; the ellipse ratio; projected circle points lie on the `isoEllipse` ellipse and reach its ends (property).
- `.gener8v/specifications/geometric-shapes-and-solids.md`: `## @spec Coverage` row for GSS-REQ-032.

## Verification Run

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm generate` | 0 | no change to generated files |
| `pnpm lint` | 0 | — |
| `pnpm typecheck` | 0 | — |
| `pnpm test` (three runs) | 0 | 1,111 tests passed on each run, 10 of them new |
| `pnpm bench` | 0 | 7 passed |
| `pnpm build` | 0 | — |
| `pnpm check:dist` | 0 | no network APIs |
| `pnpm check:deps` | 0 | 0 runtime dependencies |
| `pnpm check:images` | 0 | 8 images, licenses recorded |
| `pnpm size` | 0 | every entry within its limit; nothing imports the module yet |
| `pnpm publint` | 0 | — |
| `pnpm attw` | 0 | — |
| `pnpm audit` | 0 | No known vulnerabilities found |
| `python3 …/gener8v-state.py lint` | 0 | 0 errors, 0 warnings |
| `pnpm eslint src/layout/kit/isometric.ts` with `import "react"` added (a deliberate break, restored) | 1 | `no-restricted-imports`: "Non-rendering code must not load React or browser globals" |

Five more deliberate breaks of the module, each restored afterwards, fail the new tests: x and y swapped, z not foreshortened, the wrong scale, a foreshortened `rx`, and an edge-on face counted as visible.

## Acceptance Criteria Verification

- [x] `isometric(x, y, z)` returns 2D coordinates with the axes 120° apart and equally foreshortened — "draws z straight up, x toward the lower left and y toward the lower right, 120° apart" and "foreshortens every axis equally, by ISO_SCALE = √(2/3)" (`pnpm test`)
- [x] The module exports the isometric scale factor and the ellipse ratio — `ISO_SCALE` and `ELLIPSE_RATIO`, used by the tests to remove the foreshortening (`pnpm typecheck`, `pnpm test`)
- [x] Equal lengths along any axis project to equal drawn lengths within 1e-9 — the property test "draws equal lengths along any of the three axes equally long, within 1e-9, wherever they start"
- [x] A helper projects a horizontal circle to ellipse parameters, with ratio within 1e-6 of sin(35.264°) — `isoEllipse`; "put every point of the circle on the ellipse isoEllipse returns". The ratio is within 1e-6 of the sine of the exact tilt, atan(1/√2) = 35.26439°, and within 1e-4 of sin(35.264°) itself (DEL-001)
- [x] The projection is documented (angles, axis directions, visible faces) in the module's doc comment — the doc comment on `isometric`, with `VISIBLE_FACES` and `faceVisible` (read in review; the visible-face behavior is tested)
- [x] The module imports nothing from React and passes the import-boundary lint — `pnpm lint`; the deliberate `import "react"` fails it

## Decisions Made

### DEL-001: The exact ellipse ratio, 1/√3, rather than sin(35.264°)

**Context:** The ticket asks for a ratio within 1e-6 of sin(35.264°). The isometric tilt is exactly atan(1/√2) = 35.26439°, and sin(35.264°) = 0.577288 differs from the exact ratio, 1/√3 = 0.577350, by 6.3e-5. So no ratio can meet both "true isometric" and that tolerance.
**Decision:** `ELLIPSE_RATIO = 1/√3`. The test checks it within 1e-6 of the sine of the exact tilt, checks that the tilt rounds to 35.264°, and checks the ratio within 1e-4 of sin(35.264°).
**Rationale:** Only the exact ratio puts projected circle points on the ellipse (tested within 1e-9). A cylinder drawn with the rounded ratio would have its sides miss the ellipse ends. The ticket's 35.264° is AD-009's angle rounded for prose.
**Ticket Impact:** The criterion's tolerance holds against the exact angle, not the rounded one.

### DEL-002: Visible faces as outward normals, with a visibility test

**Context:** The ticket asks for "visible-face constants" without saying what form they take. The cube and cylinder layouts must find hidden edges analytically (AD-009, prd/TC-010).
**Decision:** `VISIBLE_FACES` gives the outward normals of the left (+x), right (+y) and top (+z) faces. `faceVisible(normal)` is true when a face points toward the viewer, `VIEW_DIRECTION` = (1, 1, 1)/√3. An edge is hidden when both faces it joins are hidden, and that rule is tested to give a cube 9 visible and 3 hidden edges.
**Rationale:** A cylinder's side is curved, so a fixed list of named faces cannot cover it. A normal test serves the cylinder (silhouette and hidden half-base) as well as the cube.
**Ticket Impact:** None beyond the shape of the constants.

## Deviations from Plan

None. The implementation followed the approved plan. The ellipse-ratio tolerance is recorded as DEL-001.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| GSS-REQ-032 | `src/layout/kit/isometric.ts`:isometric | `@spec GSS-REQ-032` |
| GSS-REQ-032 | `src/layout/kit/isometric.ts`:faceVisible | `@spec GSS-REQ-032` |
| GSS-REQ-032 | `src/layout/kit/isometric.ts`:isoEllipse | `@spec GSS-REQ-032` |

GSS-REQ-032 is met only in part here: this ticket supplies the one documented viewpoint, and TICKET-006 (cube) and TICKET-007 (cylinder) draw from it.

## Notes

- **For TICKET-006, TICKET-007 and NLC TICKET-004:**
  - `isometric` puts the origin at (0, 0). A layout scales its figure, then translates the projected bounds into the drawing.
  - Every coordinate goes through `fmt()` once, when it is written into the Scene.
  - A cube from (0, 0, 0) to (a, a, a) has its hidden corner at the origin.
  - A cylinder's top and base are `isoEllipse` at heights h and 0. Its sides are the vertical lines at `cx ± rx`, and the hidden half of the base is the half above `cy` (the back).
- **Specification wording:** the GSS specification's Assumptions still say "one oblique-style projection" (`specifications/geometric-shapes-and-solids.md:145`). AD-009 supersedes it. The wording belongs to a specification amendment, not this ticket.

## Post-Review Amendments

### Code review — `graph-library/geometric-shapes-and-solids-ticket-001-code-review` (2026-10-19, Approved)

- **CR-001:** DEL-001's figures were wrong, and this corrects them.
  - sin(35.264°) is 0.5773447, so the gap to 1/√3 = 0.5773503 is 5.55e-6, not 6.3e-5. That figure was the gap for sin(35.26°).
  - The gap still exceeds the criterion's 10⁻⁶, so the criterion is met against the exact tilt, atan(1/√2) = 35.26439°, and not against the rounded angle the ticket writes. That is a deviation from the approved plan, which repeated the 10⁻⁶ tolerance against 35.264°.
  - DEL-001's rationale that a cylinder's sides would "miss the ellipse ends" with the rounded ratio is withdrawn: the sides touch the ellipse at (cx ± rx, cy) whatever `ry` is, and the difference is below `fmt()`'s step. The reason for the exact ratio is AD-009 (true isometric) and the 1e-9 ellipse test.
  - `tests/layout/kit/isometric.test.ts`: the comment states the correct gap, and the check against sin(35.264°) tightens from 1e-4 to 1e-5.
  - For the next Audit: the criterion should have named 1/√3 = sin(atan(1/√2)). The ticket's file is not rewritten.
- **CR-002:** `ELLIPSE_RATIO`'s comment now names 35.264° as the angle between the line of sight and the horizontal plane (the page tilts 54.74° from the horizontal).
- **CR-003:** a radius drawn across the page is not foreshortened (`rx = r`), while lengths along the axes are. Deferred to TICKET-007, with Known Hazards on TICKET-007 and TICKET-008: draw a cylinder's radius or diameter along a projected horizontal axis, whose end lies on the same ellipse and shares the height's scale; never divide `rx` or `ry` by `ISO_SCALE`.
- **CR-004:** a cube's front top corner and its hidden back bottom corner project to the same point, so the cube is a hexagon whose centre joins three solid and three dashed edges. The `isometric` doc comment says so. Deferred to TICKET-006 with a Known Hazard: the hidden edges are label obstacles for the front-corner edge labels.
- **Re-verification:** `pnpm generate` (no change), `lint`, `typecheck`, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size`, `publint`, `attw`, `audit` and `gener8v-state lint` exit 0. `pnpm test` (1,111 tests) exits 0 on three runs.
