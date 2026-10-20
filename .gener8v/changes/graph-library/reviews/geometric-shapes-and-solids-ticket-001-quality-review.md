# TICKET-001: Isometric projection kit — Quality Review

## Summary

I reviewed the isometric projection kit as it stands at HEAD (`2c98c08`, after the code review was resolved): one import-free module of pure maths and its test file. The module is small, well organized and clearly documented, and the verify commands pass (lint, typecheck, 1,111 tests in 42 files, build). The findings are about the tests:
- the ellipse property fails on correct code in about 2.5% of runs, because its 1e-9 bound sits at the rounding floor of the inputs it generates;
- the names in `VISIBLE_FACES` are not pinned, and the cube-edge test can fail only when the face test already has;
- in the module, `VIEW_DIRECTION` is spelled with `ELLIPSE_RATIO`, which runs the geometry backwards.

There are 3 findings: 0 Critical, 1 Concern and 2 Suggestions.

**Reviewer:** `quality-reviewer` agent, fresh context (findings phase only, 2026-10-19)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/geometric-shapes-and-solids-ticket-001-delivery.md` (DEL-001, DEL-002, Post-Review Amendments from the code review)
**Code review read first:** `.gener8v/changes/graph-library/reviews/geometric-shapes-and-solids-ticket-001-code-review.md`. Its CR-001 to CR-004 are not raised again here. QR-003 touches `ELLIPSE_RATIO`, as CR-001 and CR-002 did. Those two were about the ratio's value and its comment; QR-003 is about `VIEW_DIRECTION` being built from it.

**Files Reviewed:**
- `src/layout/kit/isometric.ts`
- `tests/layout/kit/isometric.test.ts`
- Read for pattern consistency, unchanged here:
  - `src/layout/kit/format.ts`, `scale.ts`, `markers.ts`, `value-scale.ts`, `text.ts`, `labels.ts`, `measure.ts`, `check.ts`, `title.ts`;
  - `tests/layout/kit/scale.test.ts`, `format.test.ts`, `markers.test.ts`, `check.test.ts`, and `tests/fixtures/scene-geometry.ts`;
  - `package.json`, `tsup.config.ts`, `.size-limit.json`, `vitest.config.ts`, `tests/setup/build.ts`.
- Read for what the consumers need:
  - `graph-library/geometric-shapes-and-solids/TICKET-006`, `TICKET-007` and `TICKET-008`;
  - `graph-library/number-lines-and-coordinate-graphs/TICKET-004`;
  - AD-009, TR-005 and the Layout kit interface in `.gener8v/technical-design/system-design.md`.

**Findings:** 3
**Critical:** 0 | **Concerns:** 1 | **Suggestions:** 2

## Quality Assessment

### Code Organization

**Rating:** Strong
**Notes:**
- **One cohesive module with no imports.** It holds the projection, its two constants (`ISO_SCALE`, `ELLIPSE_RATIO`), the face test (`VIEW_DIRECTION`, `VISIBLE_FACES`, `faceVisible`) and the horizontal-circle helper (`isoEllipse`). Every function is pure arithmetic, and nothing is rounded (AD-007), the same rule as `linearScale` in `src/layout/kit/scale.ts`.
- **It follows the kit's conventions:**
  - the doc comment sits on the main function rather than in a file header;
  - `@spec` goes on the line after each JSDoc;
  - constants use SCREAMING_CASE (compare `MARKER_REACH`, `SCENE_MARGIN`);
  - frozen tuples use `Object.freeze([...] as const)`, as `src/core/issues.ts` does.
- **What the consumers need is there:**
  - **NLC TICKET-004** needs `isometric` and `ISO_SCALE`, and the projection is tested to be linear.
  - **GSS TICKET-006** needs `faceVisible` and `VISIBLE_FACES`. Their names are unpinned (QR-002).
  - **TICKET-007** needs `isoEllipse`. CR-003 is carried there.
  - **TICKET-008** needs `ISO_SCALE`.
- **Considered and not raised:**
  - **Tree-shaking.** The code review left this to Quality Review. The top-level `Object.freeze` calls carry no `/* @__PURE__ */`, so a bundle that imports only `isometric` keeps `VIEW_DIRECTION` and `VISIBLE_FACES`. Measured with esbuild's API in memory: 275 B minified as delivered, 143 B with the marks, so 132 B are kept. The package build uses `splitting: true`, so once the cube reads `VISIBLE_FACES`, the shared chunk holds it whatever the marks say. The codebase's marks (`src/layout/registry.ts`, `src/core/definitions/index.ts`) guard whole per-type tables, a far larger cost. Not worth a finding.
  - **Mixed argument shapes.** `isometric(x, y, z)` takes three numbers, as the Layout kit interface fixes it (`.gener8v/technical-design/system-design.md`), while `faceVisible` and `isoEllipse` take a `Point3`. Spreading bridges the two (`isometric(...corner)`); the test's own `project` adapter is the only place this shows.
  - **Fitting projected figures to the drawing.** The record's Notes leave this to each of three consumers. Nothing is duplicated yet. If the cube and the cylinder write the same projected-bounds fit, extract it then, as GSS TICKET-002 QR-004 did for label placement.
  - **TR-005's mitigation, "the projection lives in one module".** It holds for `isometric`. It does not hold for the cylinder geometry the Notes hand on: sides at `cx ± rx`, the base split at `cy`, and an `IsoEllipse` with no rotation are true only under isometric. TQ-004 confirmed isometric, so this is noted only.

### Readability

**Rating:** Strong
**Notes:**
- **Names say what things are,** and each function is one or two lines of arithmetic.
- **The doc comments explain the geometry,** including why `rx = r` (the √(3/2) stretch undoes `ISO_SCALE`). They cite AD-009, AD-007 and the code review in the house style. The `isometric` comment documents the viewpoint completely: axis directions, angles, visible faces, and the coincident front and back corners.
- **Minor points that are not findings:**
  - The formula names cos 30° (`COS_30`) but writes sin 30° as `/ 2`. A reader can follow it from the doc's axis directions.
  - In the tests, `isometric(0, 0, 0).map((n) => n + 0)` (`tests/layout/kit/isometric.test.ts:28`) normalizes −0 without saying so.
  - The test file uses both its `project(p)` adapter and `isometric(...p)`.
- **One finding:** `VIEW_DIRECTION` is spelled with `ELLIPSE_RATIO` (QR-003).

### Error Handling

**Rating:** Adequate
**Notes:**
- **No error paths, by design.** Non-finite input propagates as `NaN` or ±`Infinity`, and `fmt()` rejects it with a `RangeError` when a layout writes it into a Scene (`src/layout/kit/format.ts:15-17`). That is the kit's single gate; `linearScale` relies on it the same way.
- **`faceVisible` depends only on the sign of the dot product,** so any length of normal works, and a zero normal is not visible.
- **`isoEllipse` accepts r ≤ 0 and returns negative radii,** which SVG treats as an error. No caller can reach this:
  - every derivation-group member (radius, diameter) has a positive minimum, which `tests/core/definitions.test.ts` enforces (Known Hazards on TICKET-007);
  - layouts scale by positive factors.
  The doc comment could state `r > 0`. Not raised.

### Test Coverage

**Rating:** Adequate
**Notes:**

**Commands run at HEAD:**

| Command | Exit | Result |
|---|---|---|
| `pnpm lint` | 0 | `eslint .`, no output |
| `pnpm typecheck` | 0 | `tsc --noEmit`, no output |
| `pnpm test`, run as `npx vitest run --no-cache` (twice) | 0, 0 | 42 files, 1,111 tests passed (19.0 s, 18.6 s) |
| `npx vitest run --no-cache tests/layout/kit/isometric.test.ts --reporter=verbose` | 0 | 10 passed |
| `pnpm build` | 0 | ESM and DTS "Build success"; nothing in `dist/` contains the module yet |
| The unmodified `tests/layout/kit/isometric.test.ts` under a scratch Vitest config pinning fast-check's seed: 1779408034 | 1 | 1 failed, 9 passed: QR-001 |
| The same, seed 42 | 0 | 10 passed |

- `--no-cache` keeps Vitest from rewriting its results cache under `node_modules/.vite`; otherwise the command is `pnpm test` (`vitest run`). The global setup (`tests/setup/build.ts`) ran `pnpm build`, which rewrites the gitignored `dist/`.
- Not run, as instructed:
  - `pnpm generate`, which writes source;
  - `pnpm size`, which writes to the system temp directory.
  The code review re-ran both, and nothing imports the module, so no size-limit entry can move.
- Probes ran in memory from the repository root (`tsx -e`, and esbuild with `write: false`). The seeded runs used a Vitest config and setup file in the session scratchpad that include the unmodified test file. No repository file was edited.

**What the tests cover well:**
- There are 10 tests with descriptive names that state behaviour, and four fast-check properties.
- They pin:
  - each axis's drawn angle (−150°, −30°, 90°) and length (`ISO_SCALE`, within 1e-12);
  - equal lengths and linearity over random starts;
  - the view direction projecting to a point and being a unit vector;
  - the six axis-normal faces and the edge-on case;
  - the exact ratio against the true tilt (1e-6) and against the ticket's rounded angle (1e-5, after CR-001);
  - every sampled circle point lying on the `isoEllipse` ellipse.
- **Margins.** Three of the four properties are far from their bounds: over 2,000 invocations of 100 runs each, the worst error is 4.5e-4 of the bound for equal lengths, 6.8e-4 for linearity and 4.1e-4 for the ellipse ends. The ellipse equation is not (QR-001).

**Gaps, measured with probes and seeded runs:**
- **QR-001.** The ellipse property fails on correct code in about 1 run in 40.
- **QR-002.** The names in `VISIBLE_FACES` are unpinned, and the cube-edge test can fail only when the face test does.

**Mutation results (in memory, against the test's own assertions):**

| Mutation | Result |
|---|---|
| `VISIBLE_FACES` with `left` and `right` swapped | survives (`tests/layout/kit/isometric.test.ts:68-71`): QR-002 |
| `VISIBLE_FACES` with `left` and `top` swapped | survives: QR-002 |
| `ELLIPSE_RATIO = sin(35.264°)` (which also changes `VIEW_DIRECTION`) | caught: ratio test (`:97`, gap 5.55e-6) and view-direction length (`:62`, 0.99999): QR-003 |
| `ry = r × sin(35.264°)` in the ellipse property | caught: residual 1.9e-5 |
| `rx = r × ISO_SCALE` | caught: residual 0.5 |

The record's other deliberate breaks were checked by reading in the code review and are not repeated: x and y swapped, z not foreshortened, the wrong scale, an edge-on face counted as visible.

### Observability & Operability

**Rating:** Adequate
**Notes:**
- **This is a library** with no runtime network, no telemetry (`.gener8v/context.md`) and no logger anywhere in `src`. A pure projection module should not log, and this one does not.
- **A bad number surfaces as `fmt()`'s `RangeError`, naming the value.** It reaches callers as `internal_error`, the established GSV TICKET-002 SEC-003 design.
- **A property failure prints its seed and counterexample,** so a red CI run can be reproduced (QR-001 used that).

Nothing to flag.

## Findings

### QR-001: The ellipse property fails on correct code in about 2.5% of runs

**Category:** Testing
**Severity:** Concern
**Location:** `tests/layout/kit/isometric.test.ts:103-121`: the radius arbitrary at `:105`, the residual bound at `:112`, the centre arbitraries at `:17-18`
**Description:** The property projects 72 points of each generated circle and requires `|((x − cx)/rx)² + ((y − cy)/ry)² − 1| < 1e-9`.

**Why it fails:**
- The residual is normalized by `ry` = r/√3, so its rounding floor grows with |centre| / r.
- The arbitraries allow centre coordinates up to ±1,000 and radii down to 0.001, a ratio above 10⁶.
- At that ratio, the rounding error of correct arithmetic reaches the bound:
  - each projected coordinate carries about 1e-13 of absolute error at magnitude 1,000;
  - dividing by an `ry` of 5.8e-4 and squaring turns that into about 1e-9.

**Evidence:**
- **Under Vitest, unmodified.** The test file was run under a scratch config whose setup file pins fast-check's global seed.
  - Seed 1779408034 fails: `AssertionError: expected 1.1985474834830256e-9 to be less than 1e-9`, counterexample `[[0,935.4404296874628,-999.9999999999952],0.001]`, path `73:0:13:40:1:63:11`.
  - Seed 42 passes.
- **Frequency.** I ran the property 2,000 times as the suite runs it: 100 runs, a fresh seed each time. 51 runs failed (2.55%). `pnpm test` runs it once, so about one suite run in 40 goes red with no code change. The six recorded green runs (three at delivery, three in the code review) and my three fit that rate.
- **Worst residual from correct code:**
  - 1.2e-9 over 20,000 cases drawn from the test's own arbitraries;
  - 1.66e-9 over 200,000 random centres within ±1,000 with r ≈ 0.001.
**Impact:**
- CI goes red at random on correct code, in the property that is the evidence for acceptance criterion 4 (the ellipse).
- The failure message, a residual 20% over a 1e-9 bound, reads like a real precision bug in the projection. It invites either a re-run habit or a blind loosening of the bound.
- NLC TICKET-004 and the solid tickets will run this suite on every change.
**Recommendation:**
- Draw the radius from [0.1, 1e3]: `fc.double({ min: 0.1, max: 1e3, noNaN: true })`. Keep the 1e-9 bound. A radius below 0.1 is never drawn: figures are tens of drawing units across, and `fmt()`'s step is 0.01.
- Probe results for that change:
  - 0 of 2,000 invocations fail;
  - the worst residual is 1.25e-11 (1.67e-11 over 200,000 adversarial centres), about 60 times inside the bound;
  - it still catches `ry = r × sin(35.264°)` (residual 1.9e-5) and `rx = r × ISO_SCALE` (residual 0.5).
- Add a one-line comment saying why the radius has a floor, so nobody lowers it again.
**Status:** Resolved
**Resolution:** Fixed — the ellipse property draws the radius from 0.1, keeping the 1e-9 bound. With the failing seed 1779408034, the old range fails within 74 runs and the new one passes 20,000. Approved by the user, 2026-10-20.

---

### QR-002: The names in `VISIBLE_FACES` are not pinned, and the cube-edge test can fail only when the face test does

**Category:** Testing
**Severity:** Suggestion
**Location:**
- `tests/layout/kit/isometric.test.ts:67-72`: the face test. `VISIBLE_FACES` is read only at `:68`, through `Object.values`.
- `tests/layout/kit/isometric.test.ts:74-88`: the cube-edge test.
- `src/layout/kit/isometric.ts:45-50`: `VISIBLE_FACES`.
**Description:**
- **The names are not checked.** `VISIBLE_FACES` names the three visible faces: `left` (+x), `right` (+y) and `top` (+z). The face test checks only that its values are visible.
  - In-memory probe: with `left` and `right` swapped, or `left` and `top`, every assertion at `:68-71` still passes.
  - The delivered mapping is right. The centre of the unit cube's +x face draws at x = −0.354, the +y face at x = +0.354, and the +z face at y = −0.408, above both.
- **The edge test adds no detection.** The cube-edge test applies a rule the test defines itself ("an edge is hidden when both faces it joins are hidden") to `faceVisible` on the six axis normals. Those are exactly the six the face test pins, so the edge test cannot fail unless the face test has already failed.
- **The edge test asserts less than its title says.** It asserts the counts `[9, 3]`, not which edges are hidden, although its title says "the 3 cube edges that meet at the back bottom corner".
**Impact:**
- TICKET-006 reads this module for "projection, visible faces" (its Prior Art) and may use the names. A swapped name would pass here and surface later, if at all, as a cube with a label on the wrong face.
- The edge test reads as coverage of DEL-002's rule. But the rule exists only inside the test, and the test confirms nothing about the module beyond what the face test already confirms.
**Recommendation:**
- Pin the names: `expect(VISIBLE_FACES).toEqual({ left: [1, 0, 0], right: [0, 1, 0], top: [0, 0, 1] })`.
- Tie the names to the drawing: the left face's centre projects left of the right face's centre, and the top face's centre projects above both.
- Make the edge test assert what its title says: the three hidden edges are exactly the three that contain the corner (0, 0, 0). The record's Notes give TICKET-006 that fact ("a cube from (0, 0, 0) to (a, a, a) has its hidden corner at the origin"). Pinning it here makes the Notes checked rather than stated. AD-009 keeps hidden-edge computation per solid, so the rule itself can stay in the cube's layout.
**Status:** Resolved
**Resolution:** Fixed — a new test pins `VISIBLE_FACES`' normals and checks that each named face's centre is drawn where its name says (left lower left, right lower right, top straight up). The cube-edge test now enumerates the 12 edges of a unit cube and asserts the hidden ones are exactly the three from the origin. Swapping left with right, or left with top, now fails. Approved by the user, 2026-10-20.

---

### QR-003: `VIEW_DIRECTION` is spelled with `ELLIPSE_RATIO`, so the viewpoint depends on the ratio rather than the reverse

**Category:** Readability
**Severity:** Suggestion
**Location:** `src/layout/kit/isometric.ts:12` (`ELLIPSE_RATIO`) and `:42-43` (`VIEW_DIRECTION`)
**Description:**
- **The code and its doc disagree in form.** `VIEW_DIRECTION` is written `Object.freeze([ELLIPSE_RATIO, ELLIPSE_RATIO, ELLIPSE_RATIO] as const)`. Its doc comment says "the unit vector (1, 1, 1) / √3". Both are 1/√3, but the code reads as if the line of sight were built from the ellipse's shape.
- **The geometry runs the other way.** A circle with unit normal n projects to an ellipse whose minor-to-major ratio is |n · `VIEW_DIRECTION`|. For a horizontal circle, n = (0, 0, 1), which gives 1/√3. The ratio is derived from the viewpoint, not the reverse.
- **As written, changing the ratio moves the viewpoint,** and the ticket's literal criterion invites that change (CR-001: sin(35.264°) is 5.55e-6 away from 1/√3).
  - With `ELLIPSE_RATIO = sin(35.264°)`, `VIEW_DIRECTION`'s length becomes 0.99999 (probe).
  - The change then fails the view-direction test (`tests/layout/kit/isometric.test.ts:62`) as well as the ratio test (`:97`), so it reads as a broken viewpoint rather than the ratio decision it is.
**Impact:** Small: the values are right, and the tests would catch the change. But a reader checking the documented viewpoint must already know that `ELLIPSE_RATIO` equals 1/√3 to see that `VIEW_DIRECTION` is (1, 1, 1)/√3. The code also hides the one relationship that explains the ratio.
**Recommendation:**
- Declare `VIEW_DIRECTION` from its own value (for example a private `const INV_SQRT3 = 1 / Math.sqrt(3)`), before `ELLIPSE_RATIO`.
- Derive the ratio from it, with the reason: `export const ELLIPSE_RATIO = VIEW_DIRECTION[2]; // |n · VIEW_DIRECTION| for a horizontal circle, n = (0, 0, 1)`.
- The viewpoint then has one source of truth, and the comment CR-002 corrected still applies unchanged.
**Status:** Resolved
**Resolution:** Fixed — `VIEW_DIRECTION` is declared from 1/√3, and `ELLIPSE_RATIO` is its upward component, with a comment saying why. Setting the ratio to the literal sin(35.264°) now fails two tests and leaves the viewpoint unchanged. Approved by the user, 2026-10-20.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fixed | Radius from 0.1 in the ellipse property | `tests/layout/kit/isometric.test.ts` |
| QR-002 | Fixed | Face names and drawn positions pinned; hidden edges enumerated | `tests/layout/kit/isometric.test.ts` |
| QR-003 | Fixed | Ratio derived from the view direction | `src/layout/kit/isometric.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (all 3 Resolved)
**Notes:**
- All three findings fixed and re-verified. `pnpm generate` (no change), `lint`, `typecheck`, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size`, `publint`, `attw`, `audit` and `gener8v-state lint` exit 0. `pnpm test` (1,112 tests) exits 0 on three runs.
- Four deliberate breaks, made against a passing baseline and restored from memory, each fail a test: left and right faces swapped, left and top swapped, the literal sin(35.264°) ratio, and a stricter visibility threshold.
