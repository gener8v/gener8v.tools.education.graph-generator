# TICKET-004: Verify ruler accuracy, server rendering, accessibility and performance — Delivery Record

## Ticket Reference

**Ticket:** rulers/number-lines-and-coordinate-graphs/TICKET-004
**Change:** `.gener8v/changes/rulers/change.md` — Approved (Product Owner — Thomas Eaves, 2026-10-19) when delivery started
**Specification:** `.gener8v/specifications/number-lines-and-coordinate-graphs.md`
**Requirements Covered:**
- NLC-NFR-005: Every ruler mark and object end within 0.5 px of its computed position, every unit the same length — verified by a geometry test over generated rulers in both units
- NLC-NFR-006: Every ruler renders in a server environment with no browser globals — verified by the server-rendering test of NLC-NFR-002, extended to the ruler examples
- NLC-NFR-007: Every rendered ruler exposes a non-empty text alternative — verified by the accessibility test of NLC-NFR-003 (axe SVG image rules plus the accessible name), extended to the ruler examples
- NLC-NFR-008: A maximum-length ruler in either unit, with an object, renders in ≤ 50 ms at p95 in a server render — verified by a rendering benchmark in the Verification Run

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| TICKET-003 delivered (layout, component, entry) | done | Delivered, all three reviews passed; `src/layout/ruler.ts` (`rulerLayout`, `RULER_EDGE` 352, `rulerFontSize`), `src/react/graphs/RulerGraph.tsx`, `src/entries/ruler.ts`, `examples/ruler.json` | ✅ |
| `locatedValue`, `rulerScale` | `src/core/ruler.ts` | present (`:155`, `:181`); the layout draws object ends at `locatedValue` on `linearScale([0, length], [0, 1])` (`src/layout/ruler.ts:125-127`) | ✅ |
| Existing ruler geometry tests | `tests/layout/ruler.test.ts` | an NFR-005 block over five fixed rulers (marks within 0.5, equal whole units) and generators `rulerBase`, `plainRuler`, `rulerWithObject`; no property test of mark and end positions | ✅ Extended here (Known Hazard) |
| `tests/fixtures/rulers.ts` | shared ruler fixtures | `EVERY_RULER`: all 78 unit × division × length rulers | ✅ |
| `tests/fixtures/scene-geometry.ts`, `tests/react/Graph.test.tsx`, `tests/core/validate.bench.ts` | present | present; Graph.test.tsx already checks the ruler example's `aria-label` equals its text alternative; the bench pattern computes p95 from retained samples (`vitest.config.ts` `benchmark.retainSamples`) | ✅ |
| Vitest runs in `node` | no jsdom globals | `vitest.config.ts` `environment: "node"`; `jsdom` is a devDependency used explicitly | ✅ |
| graph-library NLC TICKET-005 (NLC-NFR-002/003 tests) | delivered or not | not delivered (no record); its Output names `tests/react/nlc-server-render.test.ts` and `tests/react/nlc-accessibility.test.tsx` | ✅ Resolved: ruler tests written in a shape it can absorb |
| axe-core devDependency | present | absent; `scripts/check-dependencies.ts` checks runtime dependencies only | ⚠️ Added here as a devDependency (plan D3) |
| Benchmarks picked up | `tests/**/*.bench.ts` | `vitest.config.ts` `benchmark.include` | ✅ |
| Carried: rulers NLC TICKET-003 code review CR-003 (mark contrast, 330 px) | stated with the accessibility results | Known Hazard on this ticket | 🔁 Carried — see plan D5 |

**Resolved from ground truth (not escalated):**
- **Extend or add tests for NFR-006/007:** graph-library NLC TICKET-005 has not delivered its tests, so ruler tests are added in `tests/react/ruler.test.tsx` (the ticket's Output allows this name), with the axe setup in a shared helper TICKET-005 can reuse.
- **Where the NFR-005 property goes:** the Known Hazard says to extend `tests/layout/ruler.test.ts`'s NFR-005 block with its existing generators rather than write a second generator in `tests/layout/ruler-accuracy.test.ts`.

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-10-23

### Planned Files

- `tests/layout/ruler.test.ts` (modified): in the "drawn to scale with itself (AD-007, NLC-NFR-005)" block, a property test over `rulerWithObject` and `plainRuler` (both units, every inch division, lengths 1 to the maximum, objects from any mark to any later mark). Expected positions are computed independently of the layout: `expectedX(value, length)` from the fixed edge, and object ends from `locatedValue(rulerScale(...), value)`. It checks every mark within 0.5 units, both bar ends within 0.5 units, and every whole unit the same length within the drawing's two-decimal rounding (0.02). Run 300 times per CI run; 50 consecutive runs before calling it stable (Known Hazard).
- `tests/helpers/axe.ts` (new): `axeSvgImage(markup)` loads the markup into a fresh JSDOM window, evaluates `axe-core`'s source inside that window (no globals leak into the test's Node environment), and runs the SVG image rule (`svg-img-alt`) and the ARIA attribute rules (`aria-allowed-attr`, `aria-valid-attr`, `aria-valid-attr-value`, `aria-roles`). Returns violations and the rules that passed, so a test can assert `svg-img-alt` actually applied. Shared with graph-library NLC TICKET-005.
- `tests/react/ruler.test.tsx` (new):
  - NLC-NFR-006: asserts `window` and `document` are undefined, then renders the ruler example and every one of the 78 rulers (`EVERY_RULER`, each with an object from its first to its last mark) to static markup through `<RulerGraph>` and `<Graph>` without error, each an `<svg role="img">`.
  - NLC-NFR-007: for the example and the five maximum-length rulers (each unit and inch division), with an object and a title: `role="img"`, a non-empty `aria-label` and `<title>` equal to the generated text alternative, and no axe violations, with `svg-img-alt` among the passes. Rendered at the default size.
- `tests/layout/ruler.bench.ts` (new): NLC-NFR-008. A 30 cm ruler and a 12 in ruler at sixteenths, each with an object, with title and object label at `CALLER_TEXT_LIMIT` as words (`wordsOf`) and as one cluster (`oneClusterTexts(...).latinMarks`): four cases. Each is a full server render, `renderToStaticMarkup(createElement(RulerGraph, { description }))`, so validation, layout and markup are timed together. p95 from retained samples, printed and asserted ≤ 50 ms, in the shape of `tests/core/validate.bench.ts`.
- `package.json`, `pnpm-lock.yaml`: `axe-core` `^4.14.0` as a devDependency.
- `.gener8v/specifications/number-lines-and-coordinate-graphs.md`: `@spec Coverage` rows for NLC-NFR-005..008, naming the verifying tests.

### Decisions for approval

- **D1 — NFR-005 location:** extend `tests/layout/ruler.test.ts` (recommended, per the Known Hazard) instead of a new `tests/layout/ruler-accuracy.test.ts`. Recorded as a deviation from the ticket's Output file name.
- **D2 — NFR-006/007 location:** a new `tests/react/ruler.test.tsx` plus `tests/helpers/axe.ts` (recommended), so graph-library NLC TICKET-005 adds its types beside them or moves them into its two files.
- **D3 — axe-core:** add `axe-core@^4.14.0` as a devDependency (recommended), run inside a JSDOM window per test rather than installing jsdom globals.
- **D4 — which rulers:** server rendering over all 78 rulers (cheap, exhaustive); axe over the example and the five maximum-length rulers (the densest Scenes of each kind), since the SVG's accessible structure does not change with length.
- **D5 — contrast:** axe's colour-contrast rule does not evaluate SVG strokes, so the 330 px minimum (rulers NLC TICKET-003 CR-003) is stated with the accessibility results in this record's Notes, not tested.

### How Acceptance Criteria Will Be Met

- NLC-NFR-005: the property test in `tests/layout/ruler.test.ts`, `pnpm test`.
- NLC-NFR-006: the server-rendering block of `tests/react/ruler.test.tsx`, `pnpm test`.
- NLC-NFR-007: the accessibility block of `tests/react/ruler.test.tsx`, `pnpm test`.
- NLC-NFR-008: `tests/layout/ruler.bench.ts`, `pnpm bench`, its p95 lines recorded in the Verification Run.

## Progress

- [x] `tests/layout/ruler.test.ts` — NLC-NFR-005 property test added
- [x] `tests/helpers/axe.ts` — written
- [x] `tests/react/ruler.test.tsx` — written
- [x] `tests/layout/ruler.bench.ts` — written
- [x] `package.json`, `pnpm-lock.yaml` (axe-core 4.14.0)
- [x] specification `@spec Coverage` rows

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `tests/layout/ruler.test.ts`: a property test in the NLC-NFR-005 block over `rulerWithObject` and `plainRuler` (300 runs): every mark and both object ends within 0.5 units of positions computed from the values (`expectedX`, `locatedValue`), and every whole unit the same length within 0.02.
- `tests/helpers/axe.ts`: `axeSvgImage(markup)` and `SVG_IMAGE_RULES`; axe-core evaluated inside a fresh JSDOM window, so no browser global reaches the test environment. For graph-library NLC TICKET-005 to reuse.
- `tests/react/ruler.test.tsx`: NLC-NFR-006 (no `window` or `document`; the example and all 78 rulers with an object render to static markup through `<RulerGraph>` and `<Graph>`, the same markup each) and NLC-NFR-007 (the example and the five maximum-length rulers: `role="img"`, `aria-label` and first-child `<title>` equal to the non-empty text alternative, no axe violations, `svg-img-alt` among the passes; a nameless SVG shows the rule runs).
- `tests/layout/ruler.bench.ts`: NLC-NFR-008, four full server renders (30 cm and 12 in at sixteenths, object from 0 to the end, title and label at 200 characters as words and as one cluster), p95 asserted ≤ 50 ms and printed.
- `package.json`, `pnpm-lock.yaml`: `axe-core` `^4.14.0` (devDependency).
- `.gener8v/specifications/number-lines-and-coordinate-graphs.md`: `@spec Coverage` rows for NLC-NFR-005..008.

## Verification Run

| Command | Exit | Evidence |
|---------|------|----------|
| `npx vitest run --no-cache tests/layout/ruler.test.ts -t "rulers NLC TICKET-004"` ×50 | 0 | 50 runs, 0 failures (Known Hazard on property-test stability) |
| `pnpm generate` | 0 | no generated change |
| `pnpm lint` | 0 | — |
| `pnpm typecheck` | 0 | — |
| `pnpm test` ×3 | 0 | 1,468 passed each run |
| `pnpm bench` | 0 | NLC-NFR-008 p95: 30 cm words 1.99 ms (311 runs), 30 cm one cluster 3.69 ms (273), 12 in words 1.56 ms (454), 12 in one cluster 1.51 ms (459); GSV-NFR-001 unchanged |
| `pnpm build` | 0 | — |
| `pnpm check:dist` | 0 | — |
| `pnpm check:deps` | 0 | no runtime dependency added |
| `pnpm check:images` | 0 | — |
| `pnpm size` | 0 | no source change |
| `pnpm publint` | 0 | — |
| `pnpm attw` | 0 | — |
| `pnpm audit` | 0 | no known vulnerabilities, axe-core included |

Mutation checks (each restored afterwards): an object end moved 0.6 units, and marks past the middle moved 0.6 units, each fail the new property test; the `<title>` drawn as `<desc>`, and `aria-label` renamed, each fail the accessibility tests.

## Acceptance Criteria Verification

- [x] NLC-NFR-005 — the property test in `tests/layout/ruler.test.ts` ("puts every mark and both object ends within 0.5 units …"), both units, every inch division, lengths 1 to the maximum, objects from any mark to any later mark; `pnpm test` ×3 and 50 isolated runs, exit 0.
- [x] NLC-NFR-006 — `tests/react/ruler.test.tsx` "every ruler renders on a server, with no browser globals": Vitest's `node` environment, `window` and `document` asserted undefined before and after; `pnpm test`, exit 0. Added as a ruler test in the shape graph-library NLC TICKET-005 can absorb (that ticket is not delivered).
- [x] NLC-NFR-007 — `tests/react/ruler.test.tsx` "every ruler is named for assistive technology": `role="img"`, accessible name equal to the text alternative, axe `svg-img-alt` and ARIA attribute rules with no violations, at the default size; `pnpm test`, exit 0.
- [x] NLC-NFR-008 — `tests/layout/ruler.bench.ts`, `pnpm bench` exit 0, worst p95 3.69 ms against 50 ms (see Verification Run).

## Decisions Made

### DEL-001: The accuracy property test extends the existing ruler test

**Context:** The ticket's Output names `tests/layout/ruler-accuracy.test.ts`; its Known Hazard says to extend `tests/layout/ruler.test.ts`'s NLC-NFR-005 block rather than write a second generator.
**Decision:** The property test is in `tests/layout/ruler.test.ts`, using its `rulerWithObject` and `plainRuler` generators (plan D1, approved).
**Rationale:** One generator of rulers, already tuned to give every length per unit equal weight and objects at the first and last marks often (rulers NLC TICKET-003 QR-004).
**Ticket Impact:** No `tests/layout/ruler-accuracy.test.ts`; nothing downstream reads it.

### DEL-002: axe-core runs inside a JSDOM window

**Context:** axe-core needs a DOM; the test suite runs in Vitest's `node` environment, and NLC-NFR-006 asserts no browser globals.
**Decision:** `axe-core` 4.14.0 is a devDependency. `tests/helpers/axe.ts` loads the markup into a fresh JSDOM window, evaluates `axe.source` in it (`runScripts: "outside-only"`) and runs the SVG image and ARIA attribute rules there (plan D2, D3).
**Rationale:** No global is installed, so the server-rendering assertions in the same file stay true, and graph-library NLC TICKET-005 can share the helper.
**Ticket Impact:** None; the shared setup the ticket's Known Hazard asked for.

### DEL-003: Which rulers each check covers

**Context:** 78 rulers exist (`EVERY_RULER`).
**Decision:** Server rendering covers all 78, each with an object from its first to its last mark, and the example. axe covers the example and the five maximum-length rulers with a title and an object (plan D4).
**Rationale:** Rendering is cheap enough to be exhaustive; the SVG's accessible structure (role, name, title) does not change with length, so the densest Scene of each kind stands for the rest.
**Ticket Impact:** None.

## Deviations from Plan

None — implementation followed the approved plan. The bench file carries a note on Vitest's "accessed module export getters" warning: it comes from the package's own modules as Vitest transforms them, and only adds to the time measured.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|

No source code implements these NFRs: they are verified by tests. The specification's `@spec Coverage` table names the verifying tests for NLC-NFR-005..008, as GSV-NFR-001's row names its benchmark.

## Notes

- **Accessibility results and the 330 px minimum (carried from rulers NLC TICKET-003 code review CR-003):** every ruler checked has `role="img"`, a non-empty accessible name equal to its text alternative and a first-child `<title>`, and passes axe's SVG image and ARIA attribute rules at the default size. axe does not evaluate the contrast of SVG strokes. The marks keep 3:1 contrast (WCAG 1.4.11) only when the ruler is shown at least **330 px wide** for a 30 cm ruler's millimetre marks, and about 210 px for a 12 in ruler at sixteenths. `<RulerGraph>`'s documentation says so; graph-library CPSE TICKET-008 states it on the documentation page.
- **For graph-library NLC TICKET-005:** reuse `tests/helpers/axe.ts`; add the number line and coordinate graphs beside the ruler cases in `tests/react/ruler.test.tsx`, or move both ruler blocks into its `tests/react/nlc-server-render.test.ts` and `tests/react/nlc-accessibility.test.tsx`.
- The NLC-NFR-008 margin is wide: the worst p95 is 3.7 ms, against 50 ms.

## Post-Review Amendments

### 2026-10-23 — Code review (rulers/number-lines-and-coordinate-graphs-ticket-004-code-review)

- **CR-001 (corrects DEL-002's rationale):** importing `axe-core` ran its bundle in Node's realm and added `__core-js_shared__` to `globalThis`; DEL-002's "no global is installed" held for the helper, not for the import. Now `tests/helpers/axe.ts` reads `axe-core/axe.min.js` as text (`createRequire(...).resolve`) and keeps only a type import, so axe-core runs only inside the JSDOM window; a probe shows the helper adds no own key to `globalThis`. The NLC-NFR-006 block moved to `tests/react/ruler-server-render.test.tsx`, which imports neither jsdom nor the helper (graph-library NLC TICKET-005's shape); the ruler description helper moved to `tests/fixtures/rulers.ts` (`rulerSpanned`). The specification's NLC-NFR-006 coverage row names the new file.
- **CR-002:** the accessibility test asserts the `<title>` is the SVG's first element child, as AD-008 places it and Files Produced says. Correction to the Notes: graph-library CPSE TICKET-008 is not delivered; it carries a Known Hazard to state the 330 px minimum on the ruler's documentation page.
- **CR-003:** the CI step running `pnpm bench` is renamed "Benchmarks (GSV-NFR-001, NLC-NFR-008)" (`.github/workflows/ci.yml`). CI enforces NLC-NFR-008's 50 ms p95 on every matrix cell.
- Re-verification: `pnpm generate`, `lint`, `typecheck`, `test` ×3 (1,468 passed each run), `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size`, `publint`, `attw`, `audit`: all exit 0.

### 2026-10-23 — Quality review (rulers/number-lines-and-coordinate-graphs-ticket-004-quality-review)

- **QR-001:** `tests/layout/ruler.test.ts` checks every mark within 0.5 units and every whole unit the same length (0.02) over all 78 rulers (`EVERY_RULER`), deterministically; the fixed five-ruler mark test it subsumes is removed. Mutation: the 11 in-at-halves ruler's first whole mark moved 0.04 fails it.
- **QR-002:** `rulerWithObject` writes ends exactly or as `index × (1 / marksPerUnit)`; the fast-check property now checks object ends only, against `locatedValue`; `barEnds` moved to module scope; the NLC-REQ-055 text property no longer repeats the bar-end check.
- **QR-003:** `tests/react/ruler.test.tsx`: `window` and `document` asserted undefined in an `afterAll` after the axe cases; case names from a division table; the table's count check beside it. (The first-child `<title>` came with CR-002.)
- **QR-004:** `tests/helpers/axe.ts` returns `incomplete` and writes violations with targets and failure summaries; the test asserts `incomplete` empty and every `SVG_IMAGE_RULES` rule passed.
- **QR-005:** `tests/helpers/bench.ts` `expectP95(result, { requirement, name, limitMs, minSamples = 100, note })`, used by `tests/core/validate.bench.ts` and `tests/layout/ruler.bench.ts`. Known Hazard appended to graph-library NLC TICKET-005 to use it and `axeSvgImage`.
- **QR-006:** `vitest.config.ts`'s comment covers every bench; each NLC-NFR-008 line says Vitest's export-getter warning only adds to the time.
- Re-verification: `pnpm generate`, `lint`, `typecheck`, `test` ×3 (1,467 passed each run), `bench` (NLC-NFR-008 worst p95 3.19 ms), `build`, `check:dist`, `check:deps`, `check:images`, `size`, `publint`, `attw`, `audit`: all exit 0.

### 2026-10-23 — Security review (rulers/number-lines-and-coordinate-graphs-ticket-004-security-review)

- **SEC-001:** fixed with code review CR-001 (axe-core read as text). In addition, `tests/helpers/axe.ts`'s comment says the JSDOM window isolates globals, not code (a Node.js `vm` context, not a sandbox), and `tests/react/ruler-server-render.test.tsx` asserts the global object's own keys and values are unchanged across the 79 renders. Mutation: a render that sets a global fails it.
- Re-verification: `pnpm generate`, `lint`, `typecheck`, `test` ×3 (1,467 passed each run), `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size`, `publint`, `attw`, `audit`, `audit --prod`: all exit 0.
