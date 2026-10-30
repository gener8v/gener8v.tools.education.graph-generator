# TICKET-005: Verify accuracy, server rendering, accessibility and performance for all axis-based graphs — Delivery Record

## Ticket Reference

**Ticket:** graph-library/number-lines-and-coordinate-graphs/TICKET-005
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/number-lines-and-coordinate-graphs.md`
**Requirements Covered:**
- NLC-NFR-001: Every tick, point and segment endpoint within 0.5 px of its computed position at the default size — verified by a fast-check property test over ≥ 200 generated descriptions per type
- NLC-NFR-002: Every graph of these types renders in a server environment with no browser globals — verified by a `node`-environment render test in CI
- NLC-NFR-003: Every rendered graph exposes a non-empty text alternative to assistive technology — verified by axe-core's SVG image rules and an accessible-name check
- NLC-NFR-004: 100 ticks per axis and 50 points render in ≤ 50 ms at p95 in a server render — verified by a Vitest bench, p95 over ≥ 100 iterations

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Predecessors TICKET-002, 003, 004 delivered | delivery records | all Delivered and reviewed (Approved); `main` at `9a8927f` | ✅ |
| The three layouts and their examples | `src/layout/{number-line,xy-graph,xyz-graph}.ts`, `examples/*.json` | present | ✅ |
| `src/layout/kit/ticks.ts`, `src/layout/kit/isometric.ts` | expected positions | present | ✅ |
| Bench location | `bench/nlc-render.bench.ts` (Output) | `vitest.config.ts` runs benches only from `tests/**/*.bench.ts`; the Known Hazard moves it to `tests/layout/nlc-render.bench.ts` | ⚠️ Superseded by the Known Hazard |
| axe-core | not yet a devDependency (Known Hazard) | `axe-core ^4.14.0` already in `package.json` (rulers NLC TICKET-004) | ✅ — nothing to add |
| Shared helpers | `expectP95`, `axeSvgImage`, `SVG_IMAGE_RULES` | `tests/helpers/bench.ts`, `tests/helpers/axe.ts` | ✅ |
| CI runs tests and benches on every matrix cell | `.github/workflows/ci.yml` | a Node × React matrix; `pnpm bench` step | ✅ |
| Vitest's default environment | `node`; jsdom opt-in per file | as the Known Hazard says | ✅ |
| Carried: CPSE TICKET-004 covers hydration and cross-engine equality for all types | not duplicated here | — | 🔁 Carried |
| Carried: generators produce only valid descriptions (filtered through `validate()`), labels within `CALLER_TEXT_LIMIT` | honoured | — | 🔁 Carried |

**Resolved from ground truth (not escalated):**
- *Adding axe-core.* Already present.
- *Pixels or Scene units.* One Scene unit is one pixel at the 400-unit default width; assert in Scene units (Known Hazard).

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-10-30
**Implemented by:** sonnet · medium — routed as deliver-small from Tower

### Planned Files

- `tests/fixtures/nlc-generators.ts` (new): fast-check arbitraries for valid number-line, x,y and x,y,z descriptions (ranges, spacings, points or segments within range, labels within `CALLER_TEXT_LIMIT`), every sample filtered through `validate()`; reusable by other areas.
- `tests/layout/nlc-accuracy.property.test.ts` (new; NLC-NFR-001): over ≥ 200 generated descriptions per type, every tick, point and segment endpoint in the Scene within 0.5 units of the position computed from its value — the linear scale for the number line and the x,y graph, `isometric()` for the x,y,z graph — at the 400-unit default width.
- `tests/react/nlc-server-render.test.ts` (new; NLC-NFR-002): plain `node` environment, importing neither jsdom nor the axe helper; asserts `window` and `document` are undefined and renders each type's example to static markup.
- `tests/react/nlc-accessibility.test.tsx` (new; NLC-NFR-003): each example plus generated samples, through `axeSvgImage` — no violations, no incomplete, every `SVG_IMAGE_RULES` rule passed — and the `<svg>` has `role="img"` and an accessible name equal to the text alternative.
- `tests/layout/nlc-render.bench.ts` (new; NLC-NFR-004; the Known Hazard's path): an x,y graph with 100 ticks per axis and 50 points rendered to static markup; `expectP95` requires p95 ≤ 50 ms over ≥ 100 iterations; the limit stays exactly as specified.
- `.gener8v/specifications/number-lines-and-coordinate-graphs.md`: `@spec Coverage` rows for NLC-NFR-001..004.

### How Acceptance Criteria Will Be Met

- NLC-NFR-001 — `tests/layout/nlc-accuracy.property.test.ts`, ≥ 200 per type, in CI.
- NLC-NFR-002 — `tests/react/nlc-server-render.test.ts`, every matrix cell.
- NLC-NFR-003 — `tests/react/nlc-accessibility.test.tsx`.
- NLC-NFR-004 — `tests/layout/nlc-render.bench.ts`, p95 printed in the Verification Run.
- All four fail the build when missed — they run in `pnpm test` / `pnpm bench`, both CI steps.

## Progress

- [x] `tests/fixtures/nlc-generators.ts`
- [x] `tests/layout/nlc-accuracy.property.test.ts`
- [x] `tests/react/nlc-server-render.test.ts`
- [x] `tests/react/nlc-accessibility.test.tsx`
- [x] `tests/layout/nlc-render.bench.ts`
- [x] `@spec Coverage` rows

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `tests/fixtures/nlc-generators.ts` (new): `numberLineArb`, `xyGraphArb`, `xyzGraphArb` — values on a quarter-unit grid, at most 41 ticks per axis, tick spacing sometimes omitted, labels up to 40 characters; every sample filtered through `validate()`.
- `tests/layout/nlc-accuracy.property.test.ts` (new): 200 samples per type (the count asserted); every tick, point and segment end within 0.5 units — `linearScale` over the drawn axis ends for the number line and x,y graph, `isometric()` of the scaled value (translated from the drawn x-axis min end) for x,y,z; axis ends and tick and point counts checked too.
- `tests/react/nlc-server-render.test.ts` (new): `node` environment, no jsdom or axe helper; `window` and `document` undefined; each example rendered through `<Graph>` and its per-type component, identical `<svg` markup.
- `tests/react/nlc-accessibility.test.tsx` (new): each example plus 3 seeded samples per type through `axeSvgImage` — no violations, no incomplete, exactly `SVG_IMAGE_RULES` passed; `role="img"` and `aria-label` equal to the text alternative; a negative control shows `svg-img-alt` runs.
- `tests/layout/nlc-render.bench.ts` (new): an x,y graph, axes 0..99 at spacing 1 (100 ticks each), 50 points, grid on, rendered through `<Graph>` to static markup; asserts 50 `<circle>` and ≥ 202 `<line>` first, then `expectP95` at 50 ms, `minSamples` 100.
- `.gener8v/specifications/number-lines-and-coordinate-graphs.md`: `@spec Coverage` rows for NLC-NFR-001..004.
- No file under `src/` changed; axe-core was already a devDependency.

## Verification Run

Run in the main session on 2026-10-30, after the tests were written.

| Command | Exit | Evidence |
|---------|------|----------|
| `git diff --stat -- src` | 0 | empty |
| `pnpm generate` / `lint` / `typecheck` | 0 / 0 / 0 | — |
| `npx vitest run --no-cache` ×3 | 0, 0, 0 | 2,248 passed each (2,228 before) |
| `pnpm bench` | 0 | 20 passed |
| `npx vitest bench --run --reporter=verbose tests/layout/nlc-render.bench.ts` | 0 | `NLC-NFR-004 xy-graph 100 ticks, 50 points: p95 15.8296 ms over 295 runs` at load average 9.4 (the implementer measured 7.41 ms over 513 runs at about 5) |
| `pnpm build` / `check:dist` / `check:deps` / `check:images` / `check:changesets` / `size` / `publint` / `attw` | 0 each | — |
| `pnpm audit` / `pnpm audit --prod` | 0 / 0 | No known vulnerabilities found |
| Mutation checks (accuracy test) | — | caught: a point drawn 0.6 units right (3 of 3 fail); `linearScale` stretched 1% (1 fails). Not caught: `isometric()` stretched 1% — the test uses `isometric()` as its reference, as the ticket specifies (DEL-002) |
| `gener8v-state.py state` / `lint` | 0 / 0 | 0 errors, 0 warnings |

## Acceptance Criteria Verification

- [x] NLC-NFR-001: ≥ 200 generated descriptions per type, every tick, point and segment endpoint within 0.5 units of its computed position at the 400-unit width, in CI — `tests/layout/nlc-accuracy.property.test.ts`; the point mutant fails it.
- [x] NLC-NFR-002: a `node`-environment test asserts no `window` or `document` and renders each type's example to static markup, on every matrix cell — `tests/react/nlc-server-render.test.ts`.
- [x] NLC-NFR-003: axe-core's SVG image rules on each example and generated samples; `role="img"` and an accessible name equal to the text alternative — `tests/react/nlc-accessibility.test.tsx`.
- [x] NLC-NFR-004: x,y graph, 100 ticks per axis, 50 points, p95 ≤ 50 ms over ≥ 100 iterations, printed above — `tests/layout/nlc-render.bench.ts`.
- [x] All four fail the build when missed — they run under `pnpm test` and `pnpm bench`, both CI steps; the mutants above fail them.

## Decisions Made

### DEL-001: Generated domain

**Decision:** Values on a quarter-unit grid, at most 41 ticks per axis, labels up to 40 characters, every sample validated. The 100-ticks case is the benchmark's fixed input.
**Rationale:** Keeps samples valid and the property fast; the ticket's "spacing giving ≤ 100 ticks" is an upper bound.

### DEL-002: Expected positions

**Decision:** Number-line ticks from `niceTicks` with no room, and the x,y and x,y,z default spacings from `planeRooms` and `xyzRooms`, as their existing tests do; positions from `linearScale` over the drawn axis ends and from `isometric()` (the reference the ticket names). Lines of figure width are excluded from the axis and tick set, so a tiny segment is not read as a tick.
**Ticket Impact:** A defect inside `isometric()` itself is not visible to this test; `tests/layout/kit/isometric.test.ts` covers that function.

### DEL-003: `<Graph>` for the accessibility and bench renders

**Decision:** The server-render test asserts `<Graph>` and the per-type components produce identical markup, so the other two render through `<Graph>` only.

## Deviations from Plan

None — implementation followed the approved plan.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| NLC-NFR-001 | `tests/layout/nlc-accuracy.property.test.ts` | (test, in the `@spec Coverage` table) |
| NLC-NFR-002 | `tests/react/nlc-server-render.test.ts` | (test) |
| NLC-NFR-003 | `tests/react/nlc-accessibility.test.tsx` | (test) |
| NLC-NFR-004 | `tests/layout/nlc-render.bench.ts` | (bench) |

## Notes

- Vitest warns that the bench "accessed module export getters too many times"; it is a performance warning from module internals, not a failure.
- `expectP95`'s printed line shows only with the verbose reporter, which `pnpm bench` uses.

## Post-Review Amendments

### graph-library/number-lines-and-coordinate-graphs-ticket-005 code CR-001, CR-002; quality QR-001..QR-007; security SEC-001 — independent references and checks that cannot pass empty

**Change (tests, fixtures and helpers only):**
- CR-001 / QR-001: `tests/fixtures/nlc-reference.ts` computes expected axis ends and the x,y,z translation from the layouts' constants and the description; the accuracy test checks against it (x,y,z vertical absolute when the topmost mark is geometry, guaranteed by `xyzGeometryTopArb`; the number line's height relative). Supersedes DEL-002's drawn-axis reference.
- CR-002: 20 generated samples per type in the accessibility test.
- QR-002 / SEC-001: the bench counts exactly 100 ticks per axis (told apart from grid lines) and 50 points, and checks the markup against the Scene.
- QR-003: shared readers in `tests/fixtures/scene-readers.ts`; `num` exported from `tests/fixtures/scene-geometry.ts`; overlapping per-type tests named in the header.
- QR-004: points and segments in four of five samples (`usually()`; segment ends distinct), coverage counters replace the vacuous guard. Supersedes DEL-001's generated domain.
- QR-005: readability (typed `kinds`, `xyzReference`, `expectedMoveDown`).
- QR-006: `tests/helpers/browser-globals.ts` (`expectNoBrowserGlobalsTouched`, also checks the global object is unchanged), used by the ruler and NLC server-render tests; the NLC test renders 5 generated descriptions per type as well as the examples.
- QR-007: `svgAttributes` closes its JSDOM window; `loadExample` in `tests/fixtures/examples.ts`, used by the NLC and ruler tests.
**Files:** `tests/fixtures/{nlc-reference,scene-readers,examples}.ts` (new), `tests/helpers/browser-globals.ts` (new), `tests/fixtures/{nlc-generators,scene-geometry}.ts`, `tests/layout/nlc-accuracy.property.test.ts`, `tests/layout/nlc-render.bench.ts`, `tests/react/{nlc-accessibility.test.tsx,nlc-server-render.test.ts,ruler-server-render.test.tsx,ruler.test.tsx}`
**Re-verification:** full verification loop — all exit 0; vitest ×3, 2,301 passed each; bench p95 7.44 ms over 513 runs (load 12); the implementer ran each fix's mutation against old and new tests (old pass, new fail), and the main session reconfirmed `AXIS_LENGTH` 160 (accuracy fails) and a tickless render (bench guard fails); gener8v-state lint 0 errors. The implementing subagent was interrupted once by an expired login and resumed.
