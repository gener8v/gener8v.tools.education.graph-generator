# TICKET-008: Proportion, label-overlap and text-alternative checks across figures — Code Review

## Summary

Reviewed the cross-figure verification suite (tests only; `git diff --stat -- src` is empty): drawn proportions, viewBox fit, label overlap and text alternatives for the five geometric figures. All four acceptance criteria are met and the verification reproduces (2,196 tests pass, lint and typecheck exit 0). Four findings: two Issues (the DEL-001 exception to GSS-NFR-001 is not recorded in the specification; the cylinder's outline ellipse is never compared with its radius or height) and two Observations.

**Delivery Record:** `.gener8v/changes/graph-library/delivery/geometric-shapes-and-solids-ticket-008-delivery.md`
**Files Reviewed:**
- `tests/fixtures/scene-geometry.ts`
- `tests/layout/gss-proportions.test.ts`
- `tests/layout/gss-label-overlap.test.ts`
- `tests/react/gss-text-alternatives.test.tsx`
- `.gener8v/specifications/geometric-shapes-and-solids.md` (`@spec Coverage`)

**Findings:** 4
**Critical:** 0 | **Issues:** 2 | **Observations:** 2

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| Every figure's drawn ratios within 1% over examples plus >= 200 generated descriptions, solids along projected axes (GSS-NFR-001) | Partial | `tests/layout/gss-proportions.test.ts`: `ratioMiss` per figure, `RUNS = 250`, examples for all eight example files. Triangle's 0.02 degree needle short side is held to 1% plus 0.0142 units (DEL-001), generated triangles/cylinders are limited to 1/30 and 30:1 (DEL-002); the cylinder's outline ellipse is not compared (CR-002). |
| Every Scene fits its viewBox with proportions preserved at extreme aspect ratios | Yes | `expectFits` -> `outsideViewBox` in every `check`; thin triangle (1, 100, 100.5), needle, 80:1 and 1:25 cylinders (with proportions), 0.001/1,000,000 extremes (fit only). |
| No label's estimated box overlaps another label or a figure line, over every documented example, default font (GSS-NFR-003) | Yes | `tests/layout/gss-label-overlap.test.ts`: all 8 `examples/*.json` as written and with every label shown; also the stressed set at `CALLER_TEXT_LIMIT` as words and as each `oneClusterTexts` kind. Probed: the stressed descriptions do emit the long custom texts as labels. Negative tests prove the finder reports overlaps. |
| Every rendered figure has a non-empty text alternative naming the figure and every shown measurement (GSS-NFR-004) | Yes | `tests/react/gss-text-alternatives.test.tsx`: renders through `<Graph>`, checks `aria-label`, `<title>`, figure name and each shown measurement, over examples and 38 label-mode fixtures. See CR-004 on independence. |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| GSS-REQ-030 | Drawn ratios equal measurement ratios | `tests/layout/gss-proportions.test.ts` (five `describe` blocks) | Partial — cylinder outline ellipse unchecked (CR-002) |
| GSS-REQ-031 | Figure scaled to fit, proportions preserved | `tests/layout/gss-proportions.test.ts`: `expectFits`; `tests/fixtures/scene-geometry.ts`: `outsideViewBox`, `drawnPoints` | Yes |
| GSS-NFR-001 | Ratios within 1%; geometry test over examples plus >= 200 generated per figure | `tests/layout/gss-proportions.test.ts`; ran in the Verification Run (2,196 passed) | Partial — stated exception DEL-001 not in the specification (CR-001); generated domain narrowed (DEL-002) |
| GSS-NFR-003 | No label overlap on every documented example; estimated-box overlap test | `tests/layout/gss-label-overlap.test.ts`; `tests/fixtures/scene-geometry.ts`: `labelOverlaps` | Yes |
| GSS-NFR-004 | Non-empty text alternative naming figure and every shown measurement; render test | `tests/react/gss-text-alternatives.test.tsx` | Yes |

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/TC-001 | No DOM measurement; output computed from the description | Yes | Overlap test rebuilds boxes from text nodes with `textWidth`; no DOM measurement. jsdom is used only to read `aria-label`/`<title>` from markup. |
| prd/TC-011 | Package computes line breaking | Yes | Long-text stress cases run through the layout's own wrapping. |
| prd/RF-001 | Overlap guaranteed only for estimated metrics and the default font | Yes | Header comment of `gss-label-overlap.test.ts` and `labelBoxOf` state this; no claim beyond it. |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-010 | Estimated text metrics for label layout; NFR-003 verified on estimated boxes | Yes | `labelBoxOf` uses `textWidth` and `LINE_HEIGHT`; `labelOverlaps` reuses the layout's `placeLabel` obstacle test (same geometry as the layout, checked by negative tests). |
| AD-002 | Scene boundary | Yes | Proportion and overlap tests read the Scene; text alternatives are read from rendered markup. |
| AD-009 | One isometric projection | Yes | Cube edges checked against the 90/30/150 degree axes; cylinder radius read along its projected axis, never `rx` (carried CR-003 honoured). |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| GSS-REQ-030, -031, GSS-NFR-001, -003, -004 | none — no source added; verified by tests via the specification table | `tests/layout/gss-proportions.test.ts`, `tests/layout/gss-label-overlap.test.ts`, `tests/react/gss-text-alternatives.test.tsx` | Yes (N/A in code) |

**Coverage:** 5 of 5 requirements named in the specification's `@spec Coverage` table; no source `@spec` comments are expected for a tests-only ticket.
**Missing:** None.
**Specification table:** Yes — rows for GSS-REQ-030, GSS-REQ-031, GSS-NFR-001, GSS-NFR-003, GSS-NFR-004 name the new tests (by `describe` title). The NFR-001 row does not mention the DEL-001 exception (CR-001).

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `git diff --stat -- src` | 0 (empty) | Yes |
| `npx vitest run --no-cache` | 0 — 72 files, 2,196 passed (output in scratchpad `code-review-008/full.txt`) | Yes |
| `pnpm lint` / `pnpm typecheck` | 0 / 0 | Yes |
| `pnpm generate`, `pnpm bench`, build/check/audit commands | Not re-run (`pnpm build` excluded by instruction; the rest do not touch the changed files) | Not re-run |

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Questionable | The cause is real (sub-grid length against the 0.01 coordinate precision) and the bound is derived and tight, but it is an exception to a "must" NFR that the specification does not record (CR-001). |
| DEL-002 | Reasonable | Keeps the generated runs meaningful; thinner and extreme cases are explicit tests. The region between 1/30 and the needle is covered only by the (1, 100, 100.5) case (CR-001 asks to state where 1% stops holding). |
| DEL-003 | Reasonable | Ratios chosen per figure match the figures' measurements and the carried CR-003 hazard. Cylinder and cube omit the outline ellipse (CR-002). |

## Findings

### CR-001: DEL-001 exception to GSS-NFR-001 is not recorded in the specification

**Severity:** Issue
**Location:** `tests/layout/gss-proportions.test.ts:152-170` (needle test); `.gener8v/specifications/geometric-shapes-and-solids.md:73,189`
**Traces To:** GSS-NFR-001 (1% for every ratio between two drawn lengths); DEL-001, DEL-002
**Description:** The test relaxes the needle's short side to `1% + 0.0142` drawing units, and DEL-002 limits generated triangles to a shortest:longest ratio of 1/30. The requirement says "each ratio ... within 1%", the specification's NFR-001 and its `@spec Coverage` row mention neither, and the point at which the 1% bound stops holding (a drawn side below about 1.4 units) is only implied.
**Impact:** The NFR reads as unconditionally met while the evidence only covers a narrowed domain; a later reader cannot tell the exception was a decision.
**Recommendation:** Amend GSS-NFR-001 (or its verification note) to state that lengths drawn shorter than a few 0.01 grid steps are held to 1% plus the grid step, naming the 0.02 degree needle, or record it in the Coverage row. This is a specification amendment, not a code change.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-29). The Specification skill amended GSS-NFR-001 (a drawn length shorter than a few 0.01-unit grid steps is held to 1% plus 0.0142 units; the generated domains are stated in its verification) and the triangle angle Edge Case (the 0.02° floor, Product Owner decision 2026-10-29), both tagged `*(amended 2026-10-29 by graph-library)*`, with a Change Log line in the brief. The specification was re-approved (Product Owner — Thomas Eaves, 2026-10-29).

---

### CR-002: The cylinder's outline ellipse and base arcs are never compared with its radius or height

**Severity:** Issue
**Location:** `tests/layout/gss-proportions.test.ts:249-272` (`cylinderLengths`), `tests/layout/gss-proportions.test.ts:274-310`
**Traces To:** GSS-REQ-030, GSS-NFR-001 (every ratio between two drawn lengths); ticket criterion 1
**Description:** The cylinder check reads only the two vertical side lines and the slanted radius/diameter lines. The `ellipse` (`rx`, `ry`) and the base `path` arcs are used only for the viewBox fit. The circle test, by contrast, checks the outline against the diameter line. On the sample cylinder (radius 2, height 5) the ellipse spans 162.7 units across while the diameter line is 132.9, a relation (1/`ISO_SCALE`) the test does not assert. The vertical side lines sit at `cx +- rx`, so a wrong `rx` would move them and still leave their lengths unchanged.
**Impact:** A regression that mis-scales the cylinder's width (outline) against its height or radius line passes the suite, though it breaks GSS-REQ-030 for the figure's most visible lengths. The delivery's mutation checks did not cover this case.
**Recommendation:** Add an assertion that the ellipse width (`2 * rx`) equals the drawn diameter divided by `ISO_SCALE` (or the same relation for the radius line) and that the side lines' x-distance equals `2 * rx`, within 1%; check the mutant (outline `rx` 5% long) fails.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-29). `expectFacesAgree` in `tests/layout/gss-proportions.test.ts` checks, for every cylinder the proportions test draws, that the top ellipse's `rx × ISO_SCALE` stands to the side line in the measurements' radius : height ratio within 1%, that every base arc has the top's radii, and that the base lies one side-line length below the top. Mutation-checked: a top ellipse drawn 5% wide fails 5 tests (a 5% base ellipse is an equivalent mutant: the layout takes the base's radii from the top).

---

### CR-003: The cube's `ISO_SCALE` assertion is vacuous

**Severity:** Observation
**Location:** `tests/layout/gss-proportions.test.ts:211-212`
**Traces To:** Ticket criterion 1 ("solids are measured along projected axes after dividing by `ISO_SCALE`")
**Description:** `expect(lengths[0]! / ISO_SCALE).toBeGreaterThan(0)` is true for any positive length and checks nothing. With a single measurement the cube's ratios are trivially 1, so edge equality plus the axis-angle check is the whole evidence; the absolute scale of the cube is never tied to `edgeLength`.
**Impact:** The line reads like a check of the projection scale but gives no protection; a cube drawn at the wrong foreshortening would pass.
**Recommendation:** Remove the line and the unused `ISO_SCALE` import, or replace it with a real relation (for example the vertical edge against the drawn horizontal extent of the projected cube).
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-29). The vacuous `lengths[0] / ISO_SCALE > 0` is replaced by every edge within 1% of `DRAWN_EDGE`; an edge drawn 5% long (all equal) fails 5 tests.

---

### CR-004: Text-alternative expectations are derived from the code under test

**Severity:** Observation
**Location:** `tests/react/gss-text-alternatives.test.tsx:34-72`
**Traces To:** GSS-NFR-004
**Description:** The statements each alternative must contain are built with `stateMeasurement`, `formatMeasurement`, `sourceOf` and the `*Display` functions from `src/`, which are the same functions the text alternative uses. A wrong statement format or a wrong "shown" rule in those shared functions would pass; only an omission is caught (the square mutant).
**Impact:** The test proves the alternative is complete relative to the library's own notion of "shown", not that the wording or the shown set is right. Limited, since those functions have their own unit tests.
**Recommendation:** Add a few literal expectations (for example, the 3-4-5 triangle alternative contains "3 cm" and "90°"), or note in the test header that completeness, not wording, is verified.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-29). `tests/react/gss-text-alternatives.test.tsx` adds one hand-written text alternative per figure, matched word for word in the `aria-label` and `<title>`. Rewording one cube sentence passes every rule-built check and fails only the literal one.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Fix | GSS-NFR-001 and the angle Edge Case amended; specification re-approved | `.gener8v/specifications/geometric-shapes-and-solids.md`, `.gener8v/changes/graph-library/change.md` |
| CR-002 | Fix | Cylinder ellipse and base-arc checks | `tests/layout/gss-proportions.test.ts` |
| CR-003 | Fix | Edges against `DRAWN_EDGE` | `tests/layout/gss-proportions.test.ts` |
| CR-004 | Fix | Literal text alternatives per figure | `tests/react/gss-text-alternatives.test.tsx` |
| CR-001 | — | — | — |
| CR-002 | — | — | — |
| CR-003 | — | — | — |
| CR-004 | — | — | — |

## Verdict

**Result:** Approved
**Unresolved Findings:** None
**Notes:** Acceptance criteria are met and the verification reproduces. CR-001 needs a specification amendment; CR-002 adds a cylinder outline check.
