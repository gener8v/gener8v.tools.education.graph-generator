# TICKET-003: Square graph type — Code Review

## Summary

Reviewed the delivery of the `square` graph type (GSS-REQ-007..009) at commit `2a5838e`: definition, layout, shared `unit` term, the label code extracted into the layout kit, registration, examples and tests. Every acceptance criterion and requirement is satisfied, `@spec` annotations and the specification's coverage table are in place, and the Verification Run reproduces. One Observation (a description wording mismatch).

**Delivery Record:** `.gener8v/changes/graph-library/delivery/geometric-shapes-and-solids-ticket-003-delivery.md`
**Files Reviewed:**
- `src/core/definitions/square.ts`
- `src/core/definitions/figure.ts`
- `src/core/definitions/circle.ts`
- `src/layout/square.ts`
- `src/layout/kit/figure-labels.ts`
- `src/layout/circle.ts`
- `src/react/graphs/SquareGraph.tsx`
- `src/entries/square.ts`
- `src/core/definitions/index.ts`
- `src/layout/registry.ts`
- `examples/square.json`
- `examples/invalid/square-zero-side.json`
- `tests/core/square.test.ts`
- `tests/layout/square.test.ts`
- `tests/layout/kit/figure-labels.test.ts`

**Findings:** 1
**Critical:** 0 | **Issues:** 0 | **Observations:** 1

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| `{ "type": "square", "sideLength": 4 }` renders four drawn sides equal within 1% | Yes | `src/layout/square.ts` `squareLayout`: one polygon of `DRAWN_SIDE` (200) per side; `tests/layout/square.test.ts` "draws four sides equal within 1%…" |
| Zero or negative side length returns `out_of_range` | Yes | `src/core/definitions/square.ts` `sideLength` `min: 0.001`; probe with `sideLength: 0` returns `out_of_range` at `/sideLength`; `tests/core/square.test.ts`; `examples/invalid/square-zero-side.json` |
| Side labels for one side or all four; labels use `measurementLabel` | Yes | `squareLabels` (`src/core/definitions/square.ts`); `measurementLabel(...)` call in `src/layout/square.ts` with value, unit and custom text; layout tests per mode and text kind |
| Labels on all four sides of a very small square placed outside, no overlap | Yes | Fixed drawn side (`DRAWN_SIDE`), candidates outside each side, `placeLabels` (`src/layout/kit/figure-labels.ts`) adds each placed label as an obstacle; 0.001 test and overlap property; probe at 0.001 with all labels and marks rendered |
| Right-angle marks at all four corners when requested | Yes | `showRightAngles` branch in `squareLayout` (four polylines, `RIGHT_ANGLE_MARK`); layout tests |
| Text alternative names a square, states side length and unit | Yes | `describe` in `src/core/definitions/square.ts` via `stateMeasurement`; called from the layout; core and layout tests |
| `SquareGraph`, `./square` entry, size-limit entry, example exist; Scene numbers via `fmt()` | Yes | `src/react/graphs/SquareGraph.tsx`, `src/entries/square.ts`, `.size-limit.json`, `examples/square.json`; every layout number goes through `fmt`/`fmtPoints`; `pnpm size` `./square` 16.5 kB of 25 |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| GSS-REQ-007 | Draw a square from a side length | `src/core/definitions/square.ts`:square; `src/layout/square.ts`:squareLayout; `src/react/graphs/SquareGraph.tsx`:SquareGraph | Yes |
| GSS-REQ-008 | Label one side or all four with the side length | `src/core/definitions/square.ts`:squareLabels; `src/layout/kit/figure-labels.ts`:labelSize, placeLabels; `src/layout/square.ts`:squareLayout | Yes |
| GSS-REQ-009 | Mark the right angles | `src/layout/square.ts`:squareLayout (right-angle polylines); `src/core/definitions/square.ts`:showRightAngles | Yes |

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/TC-001 | Per ticket (technical constraint) | Yes | Pure layout from the normalized description; `pnpm check:deps` exit 0, no new dependencies |
| prd/TC-011 | Label layout from estimated metrics | Yes | `labelSize` uses `textBlock` estimated metrics; `placeLabel` against obstacles, no DOM measurement |
| prd/CC-002 | Per ticket (compatibility constraint) | Yes | Per-type `./square` entry, built and checked by `pnpm build`, `check:dist`, `publint`, `attw` |

I read the constraint IDs from the ticket and judged them from the ticket's own wording; I did not open `.gener8v/constraints/prd.md` to quote them.

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-001 | Per-type entry/component without other types | Yes | `SquareGraph` built from `square` and `squareLayout` only; `/* @__PURE__ */` factory; per-type bundle test extended |
| AD-005 | Property naming (`sideLength`) | Yes | `sideLength` used |
| AD-010 | Labels avoid obstacles; placed labels become obstacles | Yes | `placeLabels` pushes each placed box onto `obstacles`; sides and marks are obstacles |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| GSS-REQ-007 | `@spec GSS-REQ-007` | `src/core/definitions/square.ts`:square, defineSquare; `src/layout/square.ts`:squareLayout; `src/react/graphs/SquareGraph.tsx`:SquareGraph; `src/entries/square.ts` | Yes |
| GSS-REQ-008 | `@spec GSS-REQ-008` | `src/core/definitions/square.ts`:squareLabels, square; `src/layout/kit/figure-labels.ts`:labelSize, placeLabels; `src/layout/square.ts`:squareLayout | Yes |
| GSS-REQ-009 | `@spec GSS-REQ-009` | `src/core/definitions/square.ts`:square; `src/layout/square.ts`:squareLayout | Yes |

**Coverage:** 3 of 3 requirements annotated
**Missing:** None
**Specification table:** Yes — `## @spec Coverage` rows for GSS-REQ-007..009 and the square locations on 033..036 match the code.

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm generate` (git status clean afterwards) | 0 | Yes |
| `pnpm lint` | 0 | Yes |
| `pnpm typecheck` | 0 | Yes |
| `npx vitest run --no-cache` | 0 (60 files, 1,706 tests) | Yes |
| `pnpm bench` | 0 | Yes |
| `pnpm build` | 0 | Yes |
| `pnpm check:dist` | 0 | Yes |
| `pnpm check:deps` | 0 | Yes |
| `pnpm check:images` | 0 | Yes |
| `pnpm check:changesets` | 0 | Yes |
| `pnpm size` | 0 (`./square` 16.5 kB of 25) | Yes |
| `pnpm publint` | 0 | Yes |
| `pnpm attw` | 0 | Yes |

Not re-run: `pnpm audit` (network), the circle Scene identity probe against a `main` worktree, and the mutation checks. One earlier vitest run failed a single `dist/` existence check in the package test while `dist/` was in flux; after the build it passed in full, and the repeat run was clean. I attribute it to `dist/` state, not the code.

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | One `labelSides` enum; with an enum, custom text cannot contradict the choice, so no domain check is needed. |
| DEL-002 | Reasonable | Shared `unitProperty` as a plain object satisfies GSV-REQ-015 without pulling the circle into the square's bundle. The edit to `circle.ts` is outside the ticket Output but small and disclosed. |
| DEL-003 | Reasonable | `Bounds` instead of `Box` keeps the circle's Scene unchanged (identity probe recorded). |
| DEL-004 | Reasonable | Fixed 200-unit side makes the very-small-square edge case an ordinary case. |

Deviations (single polygon outline, `labelSize` wrapping `textBlock`, extra `@spec` on kit functions, tightened tests) are disclosed and do not affect traceability or later tickets. The carried QR-004 extraction into `src/layout/kit/figure-labels.ts` is done as the ticket asked.

## Findings

### CR-001: `showRightAngles` description says "small square" but the mark is an L-shaped polyline

**Severity:** Observation
**Location:** `src/core/definitions/square.ts` (`showRightAngles.description`); `src/layout/square.ts` (right-angle `polyline` marks)
**Traces To:** GSS-REQ-009; GSV-REQ-015 (vocabulary descriptions)
**Description:** The term description reads "marked with a small square in each corner", but the layout draws a two-segment polyline (an open corner mark), not a closed small square. The wording flows into the generated vocabulary and schema.
**Impact:** None on behavior. A consumer reading the vocabulary could expect a closed square mark.
**Recommendation:** Reword to "a small right-angle mark in each corner", then run `pnpm generate` and commit the regenerated `src/generated` files.
**Status:** Resolved
**Resolution:** Fixed, as recommended (Engineer — Thomas Eaves, 2026-10-29). The description now reads "Whether the four right angles are marked, with a small right-angle mark in each corner."; `pnpm generate` updated the four generated files. Re-verified with the full verification loop (1,706 tests ×3, every check exit 0).

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Fix | Reworded `showRightAngles` to "a small right-angle mark in each corner"; regenerated | `src/core/definitions/square.ts`, `src/generated/description.ts`, `schema.json`, `tool-schema.json`, `vocabulary.json` |

## Verdict

**Result:** Approved
**Unresolved Findings:** None
**Notes:** CR-001 fixed during resolution; recorded in the delivery record's Post-Review Amendments.
