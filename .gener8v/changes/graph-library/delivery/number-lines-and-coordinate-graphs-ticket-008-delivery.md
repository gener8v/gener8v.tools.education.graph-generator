# TICKET-008: Document the minimum shown width of a ruler for 3:1 mark contrast where `<Graph>` users read it — Delivery Record

## Ticket Reference

**Ticket:** graph-library/number-lines-and-coordinate-graphs/TICKET-008
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/number-lines-and-coordinate-graphs.md`
**Requirements Covered:**
- NLC-REQ-044: Centimeter ruler drawn with a mark at every millimeter
- NLC-REQ-045: Half-centimeter and whole-centimeter marks longer than millimeter marks
- CPSE-REQ-044: Documentation for every graph type, listing its inputs and how to use it

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Depends on nothing | — | `main` at `e187082` | ✅ |
| DS-003 in `.gener8v/sweeps/layout-kit-text-and-axis-sweep.md`; rulers NLC TICKET-003 DEL-002 | present | present | ✅ |
| `RulerGraph.tsx` states the minimum | lines 11–13 | "Show a ruler at least 330 px wide … A 12 in ruler marked to sixteenths keeps 3:1 down to about 210 px." | ✅ |
| `Graph.tsx` doc comment silent on it | lines ~10–20 | lines 9–20, no mention | ✅ |
| README Styling section | lines ~25–31 | lines 25–31, the pictograph `overflow` caveat | ✅ |
| `RULER_MIN_MARK_WIDTH` comment says the layout decides the shown size | `src/layout/kit/ruler.ts` 26–27 | lines 26–28, as described | ✅ |
| `grep -rn 330 src README.md` | only `RulerGraph.tsx` | only `src/react/graphs/RulerGraph.tsx:11` | ✅ |
| README test and ruler-definition test | `tests/package/checks.test.ts`, `tests/core/ruler-definition.test.ts` | present | ✅ |

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-11-02
**Implemented by:** sonnet · medium — routed as deliver-small from Tower

### Planned Files

- `README.md` Styling section: a paragraph — a ruler keeps 3:1 mark contrast when shown at least about 11 px wide per centimetre of its length (about 330 px for 30 cm, 164 px for 15 cm), and a 12 in ruler marked to sixteenths down to about 210 px; it applies to `<Graph>`, the per-type components and `createGraph`; show it at least that wide or scale it up. "About" and "at least", never a guarantee.
- `src/react/Graph.tsx`: one or two sentences in the doc comment, with the 330 px figure and a pointer to the README Styling section. No code line changes.
- `src/layout/kit/ruler.ts`: the comment above `RULER_MIN_MARK_WIDTH` says the shown size is the caller's and points to rulers NLC TICKET-003 DEL-002 and the README Styling section. No code line changes.
- The ruler's published description unchanged — a DEL: a model writing a description cannot act on a pixel width, and the sentence would change the generated schema and tool schema.
- `tests/package/checks.test.ts`: the README Styling section names the ruler and 330 px.

### How Acceptance Criteria Will Be Met

- README paragraph and its test — `tests/package/checks.test.ts`.
- `Graph` doc comment; figures agree — `grep -rn "330" src README.md`.
- Description decision — DEL-001.
- `RULER_MIN_MARK_WIDTH` comment; no code change — `git diff` of the file.
- No behavior change — every ruler example's Scene byte-identical before and after; the full loop.

## Progress

- [x] `README.md`
- [x] `src/react/Graph.tsx` doc comment
- [x] `src/layout/kit/ruler.ts` comment
- [x] `tests/package/checks.test.ts`

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `README.md`: the Styling section states a ruler's minimum shown width — at least about 11 px per centimetre of its length (about 330 px for 30 cm, 164 px for 15 cm), a 12 in ruler to sixteenths down to about 210 px — that it applies to `<Graph>`, the per-type components and `createGraph`, that the figures are arithmetic, not a measurement, and what to do.
- `src/react/Graph.tsx`: the doc comment says the same in three lines and points to the README and `RulerGraph` (comment only).
- `src/layout/kit/ruler.ts`: the comment above `RULER_MIN_MARK_WIDTH` says the shown size is the caller's and points to rulers NLC TICKET-003 DEL-002 and the README (comment only).
- `tests/package/checks.test.ts`: the README's Styling section names the ruler and 330 px.

## Verification Run

Run in the main session on 2026-11-02, after the code was written; logs kept per command.

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm generate` / `pnpm lint` / `pnpm typecheck` | 0 / 0 / 0 | `src/generated` unchanged |
| `npx vitest run --no-cache` ×3 | 0, 0, 0 | 2,347 passed each |
| `pnpm bench` | 0 | 25 passed |
| `pnpm build` / `check:dist` / `check:deps` / `check:images` / `check:changesets` / `size` / `publint` / `attw` | 0 each | — |
| `pnpm audit` / `pnpm audit --prod` | 1 / 0 | the accepted `minimatch` advisory |
| Scene identity | — | 157 ruler descriptions (`examples/ruler.json` and every ruler fixture, spanned and plain) byte-identical before and after |
| `grep -rn "330" src README.md` | — | `README.md:34`, `src/react/Graph.tsx:17`, `src/react/graphs/RulerGraph.tsx:11` — figures agree |
| `git diff -- src/layout/kit/ruler.ts src/react/Graph.tsx` | — | comment lines only |
| Mutation check (restored) | — | "330 px" changed in the README → the new test fails |
| `gener8v-state.py state` / `lint` | 0 / 0 | 0 errors, 0 warnings |

## Acceptance Criteria Verification

- [x] The README's Styling section states the minimum shown width, to whom it applies and what to do; a test asserts it names the ruler and 330 px — `tests/package/checks.test.ts` and its mutant.
- [x] `Graph`'s doc comment carries the statement with the figure and points to the README; every `330` agrees — the grep.
- [x] The ruler's published description is unchanged, with the reason in DEL-001.
- [x] The `RULER_MIN_MARK_WIDTH` comment says the shown size is the caller's and points to DEL-002 and the README; no code line changed — the diff.
- [x] No behavior change — Scene identity and the full loop.

## Decisions Made

### DEL-001: The ruler's published description is not changed

**Context:** Criterion 3 lets the description gain a sentence giving the minimum shown width, or this record say why not.
**Decision:** Not changed. A model writing a description cannot act on a pixel width — the shown size is the page's, not the description's — and the sentence would change the vocabulary, the schema and the tool schema every model reads, for no action it could take.

## Deviations from Plan

None — implementation followed the approved plan.

## @spec Annotations

None — documentation and comments only; existing `@spec` lines unchanged.

## Notes

- The 330 px figure is arithmetic on DEL-002's model (`#222222` blended into white reaches 3:1 at coverage ≥ 0.48; a 0.587-unit mark on a 400-unit Scene), not a browser measurement. Someone who can render the ruler in a browser may refine it; the README says it is a floor to stay above, not a guarantee.
- Fixes defect-sweep finding DS-003.

## Post-Review Amendments

### graph-library/number-lines-and-coordinate-graphs-ticket-008-code-review/CR-001, CR-002

**Change:** `RulerGraph.tsx` states the figure as "at least about 330 px" with 164 px for 15 cm and points to the README; `Graph.tsx` says "about 210 px". The README test checks the README Styling section, `Graph.tsx` and `RulerGraph.tsx` alike for "about 330 px", "164 px" and "about 210 px", whitespace-normalized.
**Files:** `src/react/graphs/RulerGraph.tsx`, `src/react/Graph.tsx` (comments only), `tests/package/checks.test.ts`
**Re-verification:** `pnpm lint` 0; `tests/package/checks.test.ts` 26 passed. Mutant: the README's 15 cm figure changed → the test fails.

### graph-library/number-lines-and-coordinate-graphs-ticket-008-security-review/SEC-001

**Change:** The per-centimetre rule alone allowed too narrow a width for rulers of 11 cm or less, whose marks are all drawn at full tick width (about 128 px each under DEL-002's model). All three places now state a floor of about 130 px whatever the length, and about 11 px per centimetre for a centimetre ruler longer than about 12 cm; the test requires "about 130 px" everywhere.
**Files:** `README.md`, `src/react/Graph.tsx`, `src/react/graphs/RulerGraph.tsx` (comments), `tests/package/checks.test.ts`
**Re-verification:** `pnpm lint` 0; `tests/package/checks.test.ts` 26 passed.

### graph-library/number-lines-and-coordinate-graphs-ticket-008-quality-review/QR-002 (QR-001, QR-003, QR-004 fixed by the code- and security-review changes)

**Change:** The README names the remedy: give the ruler the full width of the screen or page rather than a column, or use a shorter ruler.
**Files:** `README.md`
**Re-verification:** full verification loop with logs — all exit 0 except `pnpm audit` (accepted); vitest ×3, 2,347 passed each; `pnpm bench` 25 passed; gener8v-state lint 0 errors.
