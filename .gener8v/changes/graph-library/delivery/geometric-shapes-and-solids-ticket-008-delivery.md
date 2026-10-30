# TICKET-008: Proportion, label-overlap and text-alternative checks across figures — Delivery Record

## Ticket Reference

**Ticket:** graph-library/geometric-shapes-and-solids/TICKET-008
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/geometric-shapes-and-solids.md`
**Requirements Covered:**
- GSS-REQ-030: Ratios between drawn lengths equal ratios between measurements
- GSS-REQ-031: Each figure scaled to fit its drawing area, preserving proportions
- GSS-NFR-001: Each ratio between two drawn lengths within 1% of the measurement ratio — verified by a geometry test over each figure's examples plus ≥ 200 generated descriptions per figure
- GSS-NFR-003: No label overlaps another label or a figure line on every documented example — verified by an estimated-bounding-box overlap test with the default font
- GSS-NFR-004: Every rendered figure carries a non-empty text alternative naming the figure and every shown measurement — verified by a render test over every figure's fixtures

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Predecessors TICKET-003, 005, 006, 007 delivered | delivery records | all Delivered and reviewed (Approved); `main` at `7a590d0` | ✅ |
| The five figure layouts | `src/layout/{circle,square,triangle,cube,cylinder}.ts` | present and registered | ✅ |
| `ISO_SCALE`, estimated text metrics | `src/layout/kit/isometric.ts`, `src/layout/kit/text.ts` | present | ✅ |
| Every figure's examples | `examples/` | `circle.json`, `square.json`, `triangle.json`, `triangle-sas.json`, `triangle-asa.json`, `triangle-vertices.json`, `cube.json`, `cylinder.json` | ✅ |
| Geometry helpers location | `tests/helpers/scene-geometry.ts` (Output) | `tests/fixtures/scene-geometry.ts` exists (`Bounds`, `boundsOf`, `overlap`, `nameOf`); the Known Hazard says extend it | ⚠️ Helpers go into the existing fixture |
| Carried: GSS TICKET-001 CR-003 (cylinder radius measured along its projected axis, never `rx / ISO_SCALE`) | honoured | — | 🔁 Carried |
| Carried: overlap also at `CALLER_TEXT_LIMIT` and `oneClusterTexts(CALLER_TEXT_LIMIT)` | honoured | — | 🔁 Carried |
| Carried: a failing figure is recorded as a finding against its type, not fixed by loosening 1% | honoured | — | 🔁 Carried |

**Resolved from ground truth (not escalated):**
- *Where the helpers live.* `tests/fixtures/scene-geometry.ts` (Known Hazard).

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-10-29
**Implemented by:** sonnet · medium — routed as deliver-small from Tower

### Planned Files

- `tests/fixtures/scene-geometry.ts`: helpers added to the existing fixture — drawn segment lengths, points of polygons/polylines/paths, label text boxes rebuilt from text nodes (shrunk by 0.01 for rounding, as the per-figure tests do), and a Scene's figure lines as obstacles.
- `tests/layout/gss-proportions.test.ts` (new; GSS-REQ-030, GSS-REQ-031, GSS-NFR-001): per figure, drawn ratios within 1% of the measurements over its examples plus ≥ 200 generated descriptions — circle radius : diameter; square's four sides; triangle's three sides from every determining set; cube's 12 edges along projected axes; cylinder radius : height along projected axes (never `rx`). Every Scene fits its viewBox, including a very thin triangle and very tall and very wide cylinders.
- `tests/layout/gss-label-overlap.test.ts` (new; GSS-NFR-003): no estimated label box overlaps another label or a figure line on every figure example, default font; also each figure with every label at `CALLER_TEXT_LIMIT` and at `oneClusterTexts(CALLER_TEXT_LIMIT)`.
- `tests/react/gss-text-alternatives.test.tsx` (new; GSS-NFR-004): every figure's fixtures render with a non-empty text alternative naming the figure and stating every shown measurement.
- `.gener8v/specifications/geometric-shapes-and-solids.md`: `@spec Coverage` rows for the tests. A changeset only if `pnpm check:changesets` requires one for test-only changes.
- A failing figure is recorded as a finding against that figure, never hidden by loosening 1%.

### How Acceptance Criteria Will Be Met

- Drawn ratios within 1%, examples + ≥ 200 generated per figure, solids along projected axes — `tests/layout/gss-proportions.test.ts`.
- Every Scene fits its viewBox with proportions kept, for extreme aspect ratios — same file.
- No estimated label box overlaps a label or a line on every documented example — `tests/layout/gss-label-overlap.test.ts`.
- Every rendered figure has a non-empty text alternative naming it and every shown measurement — `tests/react/gss-text-alternatives.test.tsx`.

## Progress

- [x] `tests/fixtures/scene-geometry.ts` helpers
- [x] `tests/layout/gss-proportions.test.ts`
- [x] `tests/layout/gss-label-overlap.test.ts`
- [x] `tests/react/gss-text-alternatives.test.tsx`
- [x] `@spec Coverage` rows

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `tests/fixtures/scene-geometry.ts`: helpers — drawn segment and polygon side lengths, points of each node kind, label boxes rebuilt from text nodes (estimated, shrunk by 0.01), a Scene's figure lines as obstacles, `labelOverlaps`, `outsideViewBox`.
- `tests/layout/gss-proportions.test.ts` (new, 31 tests; 250 generated descriptions per figure plus the examples).
- `tests/layout/gss-label-overlap.test.ts` (new, 74 tests).
- `tests/react/gss-text-alternatives.test.tsx` (new, 50 tests).
- `.gener8v/specifications/geometric-shapes-and-solids.md`: the tests added to the `@spec Coverage` rows of GSS-REQ-030, GSS-REQ-031 and GSS-NFR-001; new rows for GSS-NFR-003 and GSS-NFR-004.
- No file under `src/` changed; no changeset (`pnpm check:changesets` checks existing changesets only).

## Verification Run

Run in the main session on 2026-10-29, after the tests were written.

| Command | Exit | Evidence |
|---------|------|----------|
| `git diff --stat -- src` | 0 | empty: no source changed |
| `pnpm generate` | 0 | stable |
| `pnpm lint` / `pnpm typecheck` | 0 / 0 | — |
| `npx vitest run --no-cache` ×3 | 0, 0, 0 | 2,196 passed each (2,041 before) |
| `pnpm bench` | 0 | 19 passed |
| `pnpm build` / `check:dist` / `check:deps` / `check:images` / `check:changesets` / `size` / `publint` / `attw` | 0 each | — |
| `pnpm audit` / `pnpm audit --prod` | 0 / 0 | No known vulnerabilities found |
| Mutation checks against `src/` (the three new files) | — | caught: triangle base drawn 5% long (7 fail, proportions), cylinder radius 5% long (5, proportions), labels not added as obstacles (8, overlap), the square's text alternative without its side length (6, text alternatives) |
| `gener8v-state.py state` / `lint` | 0 / 0 | 0 errors, 0 warnings |

## Acceptance Criteria Verification

- [x] Every figure's drawn ratios within 1% of the measurement ratios, over its examples plus ≥ 200 generated descriptions (250 per figure), solids along projected axes (GSS-NFR-001) — `tests/layout/gss-proportions.test.ts`; the triangle and cylinder mutants fail it. One exception, DEL-001.
- [x] Every Scene fits its viewBox with proportions kept, for extreme aspect ratios (triangle 1, 100, 100.5; a 0.02° needle; cylinders 80:1, 1:25 and 0.001 / 1,000,000) — same file.
- [x] No estimated label box overlaps another label or a figure line on every documented example, default font (GSS-NFR-003), plus every label at `wordsOf(200)` and the six `oneClusterTexts(200)` kinds — `tests/layout/gss-label-overlap.test.ts`; two negative tests prove the finder reports an overlap; the no-obstacle mutant fails it.
- [x] Every rendered figure has a non-empty text alternative naming the figure and every shown measurement (GSS-NFR-004) — `tests/react/gss-text-alternatives.test.tsx` through `<Graph>`; the square mutant fails it.

## Decisions Made

### DEL-001: The 0.02° needle's short side

**Context:** On a 0.02° needle the shortest side draws about 0.03 units, below the 0.01 grid coordinates are written on (`fmt()`), so rounding alone can move its ratio by 4.5%.
**Decision:** The needle's two long sides are held to 1%; its short side to 1% plus 0.0142 drawing units absolute, the largest error the grid can cause. The general 1% tolerance is unchanged.
**Rationale:** The layout is exact before rounding; the Scene's precision, not the figure, limits a sub-grid length.
**Ticket Impact:** A stated exception to GSS-NFR-001's 1% for lengths shorter than a few grid steps.

### DEL-002: Generated domains

**Decision:** Generated triangles keep the shortest side at least 1/30 of the longest (about 7 drawing units), and generated cylinders a height-to-base ratio of at most 30:1, so grid rounding stays well under 1%; thinner and more extreme cases are explicit tests.

### DEL-003: What each figure's ratio is

**Decision:** Circle: radius line : diameter line (both forced on), and the outline's radius against the diameter. Square: four equal sides (one measurement). Triangle: the three drawn sides against the normalized `sideA`..`sideC`, from vertices, SSS, SAS (three variants), ASA and AAS. Cube: 12 edges equal (9 when hidden edges are omitted). Cylinder: the drawn radius along its projected axis against the side line, never `rx`. All through `createGraph`.

## Deviations from Plan

None — implementation followed the approved plan.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| GSS-REQ-030, GSS-REQ-031, GSS-NFR-001 | `tests/layout/gss-proportions.test.ts` | (tests, in the `@spec Coverage` table) |
| GSS-NFR-003 | `tests/layout/gss-label-overlap.test.ts` | (test, in the `@spec Coverage` table) |
| GSS-NFR-004 | `tests/react/gss-text-alternatives.test.tsx` | (test, in the `@spec Coverage` table) |

No source code was added, so no `@spec` comments; the coverage table names the verifying tests.

## Notes

- Every geometric figure is now covered by one cross-figure suite; the helpers in `tests/fixtures/scene-geometry.ts` serve other areas too.

## Post-Review Amendments

### graph-library/geometric-shapes-and-solids-ticket-008-code-review/CR-001..CR-004 (CR-003 = quality QR-003, CR-004 = quality QR-005)

**Change:**
- CR-001: specification amended — GSS-NFR-001 (sub-grid lengths; generated domains) and the triangle angle Edge Case (0.02° floor); re-approved by the Product Owner, 2026-10-29.
- CR-002: the cylinder's top ellipse and base arcs are checked against its radius and height (`expectFacesAgree`).
- CR-003: the cube's vacuous assertion replaced by every edge within 1% of `DRAWN_EDGE`.
- CR-004: one literal text alternative per figure.
**Files:** `.gener8v/specifications/geometric-shapes-and-solids.md`, `.gener8v/changes/graph-library/change.md`, `tests/layout/gss-proportions.test.ts`, `tests/react/gss-text-alternatives.test.tsx`
**Re-verification:** full verification loop — all exit 0; vitest ×3, 2,201 passed each; each new assertion mutation-checked (ellipse 5% wide, edges 5% long, a reworded sentence); gener8v-state lint 0 errors.

### graph-library/geometric-shapes-and-solids-ticket-008-quality-review/QR-001, QR-002, QR-004 — fills its frame; an independent overlap check

**Change:**
- QR-001: fill checks per figure (`expectFills`, `extentOf`) — a figure must reach its frame, not only stay inside it.
- QR-002: `labelOverlaps` uses test-owned `boxesOverlap` and `segmentCrosses` instead of the layout's `placeLabel`.
- QR-004: unused fixture exports removed; the two box models documented.
(QR-003 and QR-005 were resolved with code review CR-003 and CR-004.)
**Files:** `tests/fixtures/scene-geometry.ts`, `tests/layout/gss-proportions.test.ts`, `tests/layout/gss-label-overlap.test.ts`
**Re-verification:** lint, typecheck, generate, bench, build, check:dist, check:deps, check:images, check:changesets, size, publint, attw, audit, audit --prod and gener8v-state all exit 0. Full vitest: 2,202 passed in 2 of 3 runs; the third and four further runs (logs kept) each failed one test, always `tests/layout/kit/text.test.ts` "stops early, so caller-sized text costs little" (1,002 to 1,188 ms against its 1,000 ms wall-clock bound) while the machine's load average was 35 to 46; every TICKET-008 test passed in every run. That timing test is outside this ticket and needs its own fix. Mutations: half-size triangle fit (7 fail), 80% cylinder fit (6 fail), `placeLabel` accepting overlaps (42 fail).
