# TICKET-006: Accuracy and text-alternative checks — Delivery Record

## Ticket Reference

**Ticket:** graph-library/data-graphs-and-pictographs/TICKET-006
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/data-graphs-and-pictographs.md`
**Requirements Covered:**
- DGP-REQ-036: Bar lengths and line-graph point positions in exact proportion (across all data graphs)
- DGP-NFR-001: Every bar length and point position within 0.5 px of its exact position — verified by a geometry test over example and generated descriptions
- DGP-NFR-003: Every text alternative names every category and value — verified by a test over generated descriptions

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Predecessors TICKET-002, 003, 005 delivered | delivery records | all Delivered and reviewed (Approved); `main` at `f7bbc50` | ✅ |
| The three layouts and their examples | `src/layout/{line-graph,bar-graph,pictograph}.ts`, `examples/*.json` | present | ✅ |
| `src/core/describe.ts`, `src/core/format.ts` (`cleanText`, `quoteText`) | present | present | ✅ |
| Generators location | `tests/generators/data-graphs.ts` (Output) | `tests/generators/` does not exist; the Known Hazard puts them at `tests/fixtures/data-graphs.ts` | ⚠️ Superseded by the Known Hazard |
| `REAL_STACKED_TEXT`, `CALLER_TEXT_LIMIT` | for generated names | `tests/fixtures/plain-text.ts`, `src/core/definitions/shared.ts` | ✅ |
| Shared Scene readers | `boundsOf`, `ticksOf`, `positionOf` | `tests/fixtures/scene-geometry.ts`, plus `tests/fixtures/scene-readers.ts` (NLC TICKET-005) | ✅ |
| Carried: pictograph widths are DGP-NFR-002 (TICKET-005), not repeated here | honoured | — | 🔁 Carried |
| Carried: text compared as `describe` states it (`cleanText`, `quoteText`); values as supplied | honoured | — | 🔁 Carried |
| Lesson from NLC TICKET-005 code review CR-001 | expected positions computed independently of the drawn axes | — | 🔁 Applied in the plan |

**Resolved from ground truth (not escalated):**
- *Where the generators go.* `tests/fixtures/data-graphs.ts` (Known Hazard).

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-10-30
**Implemented by:** sonnet · medium — routed as deliver-small from Tower

### Planned Files

- `tests/fixtures/data-graphs.ts` (new; the Known Hazard's path): fast-check arbitraries for valid line-graph, bar-graph and pictograph descriptions — varying category counts, decimal values, orientations and scales, names up to `CALLER_TEXT_LIMIT` including `REAL_STACKED_TEXT` — every sample filtered through `validate()`.
- `tests/layout/data-graph-accuracy.test.ts` (new; DGP-REQ-036, DGP-NFR-001): for the examples and ≥ 500 generated descriptions per type, every bar length and line-graph point position within 0.5 units of its exact position; the expected positions are computed from the layouts' documented constants and the data, never read from the drawn axes (the lesson of NLC TICKET-005 code review CR-001). Pictograph widths stay with TICKET-005's DGP-NFR-002 check.
- `tests/core/data-graph-text-alternative.test.ts` (new; DGP-NFR-003): for ≥ 500 generated descriptions per type, the text alternative contains every category name as `describe` states it (`cleanText`, `quoteText`) and every value as supplied.
- Coverage counters in both suites prove the generators vary what they claim; failures print the offending description (fast-check's counterexample).
- `.gener8v/specifications/data-graphs-and-pictographs.md`: `@spec Coverage` rows.

### How Acceptance Criteria Will Be Met

- A generator of valid descriptions of the three types, varied — `tests/fixtures/data-graphs.ts`, with coverage counters.
- DGP-NFR-001 — `tests/layout/data-graph-accuracy.test.ts`, examples + ≥ 500 per type.
- DGP-NFR-003 — `tests/core/data-graph-text-alternative.test.ts`, ≥ 500 per type.
- In CI, failing with the offending description printed — both under `pnpm test`; fast-check prints the counterexample.

## Progress

- [x] `tests/fixtures/data-graphs.ts` (and `tests/fixtures/data-graph-reference.ts`)
- [x] `tests/layout/data-graph-accuracy.test.ts`
- [x] `tests/core/data-graph-text-alternative.test.ts`
- [x] `@spec Coverage` rows

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `tests/fixtures/data-graphs.ts` (new): fast-check arbitraries `lineGraphArb`, `barGraphArb`, `pictographArb` and `nameArb` — one to more than ten categories, decimal and (line) negative values, both bar orientations, given and chosen scales, written values, axis labels, titles, unit labels, names up to `CALLER_TEXT_LIMIT` including `REAL_STACKED_TEXT`; every sample passes `validate()`.
- `tests/fixtures/data-graph-reference.ts` (new): the expected positions, computed from the layouts' documented constants (drawing width 400, margin 16, plot height 240, names' column 96 + 4) with `resolveValueScale` and the kit's text helpers — never read from the drawn axes; `horizontalBarsReferenced` says when bars across can be placed this way.
- `tests/layout/data-graph-accuracy.test.ts` (new, 4 tests; DGP-REQ-036, DGP-NFR-001): the line-graph and bar-graph examples, and 500 generated descriptions of each — every point, line vertex, marker and bar within 0.5 of its computed position; coverage counters for what the generators vary.
- `tests/core/data-graph-text-alternative.test.ts` (new, 6 tests; DGP-NFR-003): each type's example and 500 generated descriptions of each — the text alternative holds every entry whole, `“Name” is 3.5` for line and bar graphs and `“Name”: 3.5` for pictographs, names as `describe` states them (`cleanText`, `quoteText`) and values as supplied; coverage counters.
- `.gener8v/specifications/data-graphs-and-pictographs.md`: `@spec Coverage` — the tests on DGP-REQ-036; DGP-NFR-001 and DGP-NFR-003 rows.
- No `src/` change; no changeset (test-only).

## Verification Run

Run in the main session on 2026-10-30, after the code was written.

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm generate` + `git status --porcelain src/generated` | 0 | no change |
| `pnpm lint` / `pnpm typecheck` | 0 / 0 | — |
| `npx vitest run --no-cache` ×3 | 0, 0, 0 | 2,311 passed each; the two new files 10 passed (the implementer also ran them 60 times in a row, all passing) |
| `pnpm bench` | 0 | 20 passed |
| `pnpm build` / `check:dist` / `check:deps` / `check:images` / `check:changesets` / `size` / `publint` / `attw` | 0 each | — |
| `pnpm audit` / `pnpm audit --prod` | 0 / 0 | No known vulnerabilities found |
| Mutation checks (each restored) | — | bar `PLOT_HEIGHT` 240 → 250; line `PLOT_HEIGHT` 240 → 250; bar length ×0.99; bar and line `describe` dropping the last entry; pictograph `describe` without its unit — each fails 2 tests of the new files |
| `gener8v-state.py state` / `lint` | 0 / 0 | 0 errors, 0 warnings |

## Acceptance Criteria Verification

- [x] A generator of valid descriptions of the three types, varied in category count, values, orientation, scale and names — `tests/fixtures/data-graphs.ts`; the coverage counters in both suites assert each variation is reached.
- [x] DGP-NFR-001: every bar length and line-graph point position within 0.5 of its exact position, over the examples and ≥ 500 generated descriptions per type — `tests/layout/data-graph-accuracy.test.ts`; the plot-height and bar-length mutants fail it.
- [x] DGP-NFR-003: every text alternative names every category and value, over ≥ 500 generated descriptions per type — `tests/core/data-graph-text-alternative.test.ts`; the dropped-entry and missing-unit mutants fail it.
- [x] Runs in CI and fails with the offending description printed — both files run under `pnpm test`; fast-check prints the counterexample, and the bar check names the input in its message.

## Decisions Made

### DEL-001: The domain is generated, not enumerated

**Decision:** Descriptions are fast-check arbitraries filtered through `validate()`, with coverage counters that fail when a variation the ticket names is not reached, so a narrowed generator cannot pass unnoticed.

### DEL-002: A separate reference fixture

**Context:** NLC TICKET-005 code review CR-001 — expected positions read from the drawn axes make the check circular.
**Decision:** `tests/fixtures/data-graph-reference.ts` restates the layouts' geometry from their documented constants and the data, sharing only `resolveValueScale` and the text-measuring helpers with `src/`.

### DEL-003: Bars across are generated without a category-axis label or written values

**Context:** Across, those two terms move the plot's edges by amounts that depend on the drawn rows, which an independent restatement cannot give without reimplementing the layout.
**Decision:** The accuracy test removes those two terms from samples drawn across (and asserts `horizontalBarsReferenced`, so every sample is checked); upright bars keep them, and the text-alternative test keeps them for every orientation. Pictograph positions stay with TICKET-005's DGP-NFR-002 check, as the ticket says.

## Deviations from Plan

- `tests/fixtures/data-graph-reference.ts` is an extra file beside the planned generators, holding the independent reference (DEL-002).
- Bars across are checked without a category-axis label or written values (DEL-003).

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| DGP-REQ-036 | `tests/layout/data-graph-accuracy.test.ts`, `tests/fixtures/data-graph-reference.ts`, `tests/fixtures/data-graphs.ts` | (test) — coverage row; existing `@spec` on `src/layout/bar-graph.ts` |
| DGP-NFR-001 | `tests/layout/data-graph-accuracy.test.ts` | (test) |
| DGP-NFR-003 | `tests/core/data-graph-text-alternative.test.ts` | (test) |

## Notes

- `prettier --check` reports the new files; the repository has no prettier configuration and its lint is eslint, which passes.
- The three wall-clock timing tests noted on earlier tickets passed in all three runs here.

## Post-Review Amendments

### graph-library/data-graphs-and-pictographs-ticket-006-code-review/CR-001 (with quality QR-001), CR-002, CR-003, CR-004, CR-005

**Change:**
- CR-001 / QR-001: supersedes DEL-003 — samples drawn across keep a category-axis label and written values; those are checked by proportion (every bar within 0.5 of value × length per unit) and by bounds on the implied axis length (`barGraphBounds`), the rest exactly as before. Residual: with those terms the plot's exact edges are bounded, not restated.
- CR-002: entries are matched inside their own series sentence, in order; bar and pictograph lists likewise.
- CR-003: `@spec DGP-REQ-036` on `lineGraphLayout`; coverage row updated.
- CR-004: the reference's header names the `src/` helpers it shares (amends DEL-002, which named only the scale and text helpers).
- CR-005: bars checked for category order, start at the zero baseline and one shared start edge.
**Files:** `tests/layout/data-graph-accuracy.test.ts`, `tests/core/data-graph-text-alternative.test.ts`, `tests/fixtures/data-graph-reference.ts`, `src/layout/line-graph.ts` (comment), `.gener8v/specifications/data-graphs-and-pictographs.md`
**Re-verification:** full verification loop — all exit 0 except one of three vitest runs, which failed only `tests/layout/nlc-accuracy.property.test.ts` (NLC TICKET-005): its unseeded x,y,z coverage counter got 49 samples with guides against a threshold of more than 50 of 200; two reruns after passed 2,311 each. That threshold sits near the generator's own rate and needs a fix ticket. The two new files: 10 runs in a row, 10 passed each. Mutants (each restored): the last series' sentence dropped; the last entry dropped from later series; room not subtracted and label depth not added in `planHorizontal`; across length ×0.97 with written values; bar `x` and `y` +1 — each fails the new tests. gener8v-state lint 0 errors.

### graph-library/data-graphs-and-pictographs-ticket-006-quality-review/QR-002, QR-004 (QR-001 closed by code review CR-001; QR-003 dismissed)

**Change:** QR-002: the text-alternative test's header says it restates `describe`'s sentence format on purpose (per-series scoping depends on it). QR-004: the drawn-bar rule is the named `isDrawn`, tied to the 0.01 grid. QR-003 dismissed: the next property suite should extract a shared run-and-count helper.
**Files:** `tests/core/data-graph-text-alternative.test.ts`, `tests/layout/data-graph-accuracy.test.ts`
**Re-verification:** full verification loop — all exit 0; vitest ×3, 2,311 passed each; gener8v-state lint 0 errors.
