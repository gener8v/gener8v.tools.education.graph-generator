# TICKET-005: Verify accuracy, server rendering, accessibility and performance for all axis-based graphs — Code Review

## Summary

Reviewed the five test files and the specification's `@spec Coverage` rows delivered for the four NLC non-functional requirements. All four checks exist, run in CI through `pnpm test` and `pnpm bench`, and pass on re-run (2,248 tests passed; the bench measured p95 13.85 ms over 326 runs at load average about 8). Two Observation-level findings: the accuracy test derives its scale from the drawn axis ends, and the accessibility test samples only three generated descriptions per type.

**Delivery Record:** `.gener8v/changes/graph-library/delivery/number-lines-and-coordinate-graphs-ticket-005-delivery.md`
**Files Reviewed:**
- `tests/fixtures/nlc-generators.ts`
- `tests/layout/nlc-accuracy.property.test.ts`
- `tests/react/nlc-server-render.test.ts`
- `tests/react/nlc-accessibility.test.tsx`
- `tests/layout/nlc-render.bench.ts`
- `.gener8v/specifications/number-lines-and-coordinate-graphs.md` (`@spec Coverage` rows, lines 240-243)

**Findings:** 2
**Critical:** 0 | **Issues:** 0 | **Observations:** 2

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| NLC-NFR-001: property test, >= 200 descriptions per type, ticks/points/segment endpoints within 0.5 units, linear scale and `isometric()`, in CI | Yes | `tests/layout/nlc-accuracy.property.test.ts` (`RUNS = 200`, `TOLERANCE = 0.5`; one `describe` per type; `seen >= RUNS` asserted). Generators in `tests/fixtures/nlc-generators.ts` filtered by `validate()`. See CR-001 on how the reference positions are anchored. |
| NLC-NFR-002: `node`-environment test, `window`/`document` undefined, each example rendered to static markup, every matrix cell | Yes | `tests/react/nlc-server-render.test.ts` (no jsdom or axe import; `typeof window/document` asserted; three examples rendered). CI runs `pnpm test` on the matrix. |
| NLC-NFR-003: axe SVG image rules on each example and each generated sample; `role="img"` and accessible name equal to the text alternative | Partial | `tests/react/nlc-accessibility.test.tsx`: examples plus 3 seeded samples per type; asserts role, `aria-label`, no violations, no incomplete, exact `SVG_IMAGE_RULES` passed. The ticket wording "each ... generated sample" is satisfied only for a fixed set of 9 (CR-002). |
| NLC-NFR-004: bench of x,y graph, 100 ticks per axis, 50 points, p95 <= 50 ms over >= 100 iterations, printed | Yes | `tests/layout/nlc-render.bench.ts` (`expectP95`, `limitMs 50`, `minSamples 100`); re-run printed `p95 13.8545 ms over 326 runs`. Placed under `tests/` per the ticket's Known Hazard. |
| All four checks fail the build when missed | Yes | Tests run in `pnpm test`, bench in `pnpm bench` (`.github/workflows/ci.yml` lines 71, 76); delivery record's mutation checks show the accuracy test fails on a displaced point and a stretched scale. |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| NLC-NFR-001 | Ticks, points, segment endpoints within 0.5 px | `tests/layout/nlc-accuracy.property.test.ts`; Verification Run passed | Yes |
| NLC-NFR-002 | Server render, no browser globals | `tests/react/nlc-server-render.test.ts`; Verification Run passed | Yes |
| NLC-NFR-003 | Non-empty text alternative to AT | `tests/react/nlc-accessibility.test.tsx`; Verification Run passed | Yes |
| NLC-NFR-004 | 100 ticks/axis, 50 points <= 50 ms p95 | `tests/layout/nlc-render.bench.ts`; 13.85 ms on re-run | Yes |

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/TC-005, prd/TC-001 | No browser globals or measurement in server rendering | Yes | Accuracy asserts on Scene data; server-render test imports no browser library; accessibility test parses markup in a private JSDOM and checks globals remain undefined in `afterAll`. |
| prd/CC-002 | WCAG 1.1.1 text alternatives | Yes | `aria-label` equals `scene.textAlternative`, non-empty, `role="img"`; `svg-img-alt` negative control. |
| prd/OC-001 | Targets enforced automatically | Yes | All in CI steps; p95 limit kept at 50 ms. |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-007 | 400-unit coordinate space | Yes | Assertions in Scene units at the default width. |
| AD-008 | Accessible name via `aria-label` and `<title>` | Partial | The test asserts `aria-label` only; the `<title>` half is not asserted (the ticket's criterion names only role and accessible name, so not a finding). |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| NLC-NFR-001..004 | NFRs verified by tests; recorded in the specification table, as for earlier NFR tickets | the four test and bench files | Yes (table) |

**Coverage:** 4 of 4 NFRs listed in the specification table
**Missing:** None
**Specification table:** Yes — rows NLC-NFR-001..004 at lines 240-243 list exactly the delivered files (plus `tests/fixtures/nlc-generators.ts` and `tests/helpers/axe.ts`).

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `git diff --stat -- src` | 0 (empty) | Yes |
| `pnpm lint` / `pnpm typecheck` | 0 / 0 | Yes |
| `npx vitest run --no-cache` (with `GRAPH_GENERATOR_PREBUILT=1`) | 0 — 76 files, 2,248 tests passed | Yes |
| `npx vitest bench --run --reporter=verbose tests/layout/nlc-render.bench.ts` | 0 — p95 13.8545 ms over 326 runs (load average about 8) | Yes (record: 15.83 ms) |

Not re-run, by instruction or cost: `pnpm build` and the build-dependent checks, `pnpm audit`, `gener8v-state.py`. Output saved in the scratchpad (`code-review-nlc005/full.txt`, `bench.txt`).

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | Quarter-unit grid, <= 41 ticks keeps samples exact and fast; the 100-tick case is the bench's fixed input. The ticket's "<= 100 ticks" is an upper bound. The grid and spacing set (`SPACINGS`) never produce non-nice or fractional-pixel layouts, so rounding behaviour is explored less (noted in CR-001). |
| DEL-002 | Reasonable, with a residual gap | Using `isometric()` as the reference is what the ticket names; the delivery states the blind spot honestly and points to `tests/layout/kit/isometric.test.ts`. The scale and translation are taken from the drawn axis ends (CR-001). |
| DEL-003 | Reasonable | Asserts `<Graph>` and per-type components give identical markup, so rendering via `<Graph>` alone elsewhere is sound. |

## Findings

### CR-001: Accuracy test anchors its reference scale and offset to the drawn axes

**Severity:** Observation
**Location:** `tests/layout/nlc-accuracy.property.test.ts` (number line `xOf`, x,y `xOf`/`yOf`, x,y,z `dx`/`dy`)
**Traces To:** NLC-NFR-001
**Description:** The expected position is computed with `linearScale` over the pixel ends read from the drawn axis lines (and, for x,y,z, a translation read from the drawn x-axis min end). Ticks, points and segment endpoints are therefore proven consistent with the drawn axis, but the axis's own absolute position or length in the 400-unit space is not checked against the description, except for x,y,z axis ends relative to each other. A layout that drew an axis in the wrong place or too short would pass if everything else were drawn consistently. The 1% `linearScale` mutant was caught only because the layout and test scale differed.
**Impact:** Low: absolute placement is covered by the per-type layout tests, and the ticket specifies a "linear scale" without fixing the pixel range. Residual risk is a self-consistent but misplaced graph.
**Recommendation:** Optionally assert the drawn axis ends lie within the Scene's width and height (or equal the layout's published plot range), so the reference is not wholly derived from the output.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-30). `tests/fixtures/nlc-reference.ts` restates the layouts' constants and rules (400-unit width, 16-unit margin, 17-unit arrowhead room, 360-unit maximum plot height, the 1/6–3 plot ratio, the 170-unit axis length) and computes the expected axis ends and the x,y,z translation from the description, never from a Scene; ticks, points, segment ends and the axis ends are checked against it, `isometric()` kept as the projection the ticket names. Limit: the x,y,z vertical offset depends on label placement, so it is absolute only when the topmost mark is geometry, which a dedicated generator (`xyzGeometryTopArb`) guarantees for 200 samples; the number line's height likewise depends on label placement, so only its horizontal positions are absolute. Mutation-checked (each passes the old tests and fails the new): number-line right end 10 short, x,y plot not centered, x,y plot 5 lower, x,y,z offset 6 right or 4 down, `AXIS_LENGTH` 160.

---

### CR-002: Accessibility test samples three generated descriptions per type

**Severity:** Observation
**Location:** `tests/react/nlc-accessibility.test.tsx` (`SAMPLES = 3`, fixed `seed`)
**Traces To:** NLC-NFR-003; ticket criterion "each example and each invalid-free generated sample"
**Description:** Only nine cases run (three examples, three seeded samples per type). The specification's verification method requires only the examples, so NLC-NFR-003 is met; the ticket's wording about generated samples is met loosely. The seed is fixed, so the same three samples run every time.
**Impact:** Low: wider variation (long labels, no title, no labels) is exercised by only three descriptions per type.
**Recommendation:** Raise `SAMPLES` modestly (each axe run costs time; measure) or note in the delivery record that three is the deliberate budget.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-30). 20 seeded generated samples per type (seed 20260101). An `aria-label` cut to 600 or 700 characters passes the old test and fails the new one.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Fix | Absolute reference from the layouts' constants (`tests/fixtures/nlc-reference.ts`) | `tests/fixtures/nlc-reference.ts`, `tests/layout/nlc-accuracy.property.test.ts`, `tests/fixtures/nlc-generators.ts` |
| CR-002 | Fix | 20 generated samples per type | `tests/react/nlc-accessibility.test.tsx` |

## Verdict

**Result:** Approved
**Unresolved Findings:** None
**Notes:** No Critical or Issue findings. All four NFR verifications exist, run in CI and pass on re-run. Bench timing was taken at load average about 8 and passed with wide margin.
