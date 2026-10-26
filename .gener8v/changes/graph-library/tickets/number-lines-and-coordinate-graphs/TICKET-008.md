# TICKET-008: Document the minimum shown width of a ruler for 3:1 mark contrast where `<Graph>` users read it

**Change:** graph-library
**Capability Area:** Number Lines & Coordinate Graphs (number-lines-and-coordinate-graphs)
**Specification:** specifications/number-lines-and-coordinate-graphs.md

**Summary:** A 30 cm ruler shown narrower than about 330 px draws its millimeter marks lighter than 3:1 against white (WCAG 1.4.11). The project accepted that and put the warning on `<RulerGraph>` only. Put the minimum shown width in the README's Styling section and in `<Graph>`'s doc comment, consider the ruler's published description, and correct the stale comment in `src/layout/kit/ruler.ts` so it points at the decision. Documentation only: no mark, size or layout changes. Fixes defect-sweep finding DS-003 (`.gener8v/sweeps/layout-kit-text-and-axis-sweep.md`).
**Priority:** Must
**Value:** A developer who shows a ruler through `<Graph>` or `createGraph` learns the size below which its fine marks fall under the accessibility contrast floor, instead of finding out from a user.

**Requirements Covered:**
- NLC-REQ-044: Centimeter ruler drawn with a mark at every millimeter (the marks whose contrast depends on the shown width)
- NLC-REQ-045: Half-centimeter and whole-centimeter marks longer than millimeter marks
- CPSE-REQ-044: Documentation for every graph type, listing its inputs and how to use it (the ruler's display caveat is part of using it)

**Prior Art:**
- Read: `.gener8v/sweeps/layout-kit-text-and-axis-sweep.md` — DS-003: the arithmetic, the circumstance (about 10.9 px per centimeter of length: 327 px for 30 cm, 164 px for 15 cm; 210 px for 12 in marked to sixteenths), and the verdict ("ticket (documentation), can wait")
- Read: `.gener8v/changes/rulers/delivery/number-lines-and-coordinate-graphs-ticket-003-delivery.md` — DEL-002: the decision that the marks are not changed and `<RulerGraph>`'s documentation states the 330 px minimum
- Read: `.gener8v/constraints/prd.md` — CC-002 (WCAG 2.1 AA, 1.4.11: 3:1 contrast for graphical objects)
- Read: `src/react/graphs/RulerGraph.tsx` — the one existing statement of the minimum (doc comment, lines 11-13): the wording and figures to repeat
- Read: `src/react/Graph.tsx` — the doc comment above `Graph` (lines ~10-20), which says nothing about it
- Read: `README.md` — the "Styling" section (lines ~25-31), which already holds display caveats of this kind
- Read: `src/layout/kit/ruler.ts` — the comment above `RULER_MIN_MARK_WIDTH` (lines 26-27), which says the contrast "depends on the size the ruler is shown at, which the ruler's layout decides"; and `drawRulerMarks` (`width = max(RULER_MIN_MARK_WIDTH, min(tick, spacing / 2))`, 0.587 units on a 30 cm ruler)
- Read: `src/layout/ruler.ts`, `src/layout/scene.ts` (`rootAttrs`: `width="100%"`, so the Scene scales to its container) — to confirm that the layout decides no shown size and names no minimum
- Read: `src/core/definitions/ruler.ts` — the published `description` of the ruler (line ~212), which a model reads through the vocabulary, schema and tool schema
- Read: `tests/package/checks.test.ts` — how a test already reads `README.md`; `tests/core/ruler-definition.test.ts` — where the ruler's terms and description are tested

**Acceptance Criteria:**
- [ ] The README's Styling section states the minimum shown width: a ruler keeps 3:1 mark contrast when shown at least about 11 px wide per centimeter of its length (330 px for a 30 cm ruler), and an inch ruler marked to sixteenths down to about 210 px for 12 in; narrower, its finest marks render lighter than 3:1 against white (WCAG 1.4.11). It says this applies to `<Graph>`, the per-type components and `createGraph` with your own printer, and says what to do (show the ruler at least that wide, or scale it up, for example on a phone or in a two-column worksheet). A test in `tests/package/checks.test.ts` reads the README and asserts the Styling section names the ruler and the 330 px figure
- [ ] The doc comment of `Graph` in `src/react/Graph.tsx` carries the same statement in one or two sentences, with the figure, or points to the README Styling section. `grep -rn "330" src README.md` returns the README, `Graph.tsx` and `RulerGraph.tsx` lines, and every figure agrees
- [ ] The ruler's published description (`src/core/definitions/ruler.ts`) either gains one short sentence giving the minimum shown width, or the delivery record states in a DEL-XXX why it does not (for example, a model cannot act on a pixel size). If it changes, `pnpm generate` is run, `src/generated/*` is committed with it, and `tests/core/ruler-definition.test.ts` asserts the sentence
- [ ] The comment above `RULER_MIN_MARK_WIDTH` in `src/layout/kit/ruler.ts` no longer says the ruler's layout decides the shown size. It says the shown size is the caller's, and points to rulers NLC TICKET-003 DEL-002 (`.gener8v/changes/rulers/delivery/number-lines-and-coordinate-graphs-ticket-003-delivery.md`) and the README Styling section. No code line in that file changes
- [ ] No behavior changes: the generated scene of every ruler example is byte-identical before and after (`tests/layout/ruler.test.ts` passes unchanged), and `pnpm lint && pnpm typecheck && pnpm test` pass

**Output:**
- `README.md` — the Styling section's new paragraph (criterion 1)
- `src/react/Graph.tsx` — the doc comment only (criterion 2)
- `src/layout/kit/ruler.ts` — the comment only (criterion 4)
- `src/core/definitions/ruler.ts` and `src/generated/*` — only if the description gains the sentence (criterion 3)
- `tests/package/checks.test.ts` — the README assertion (criterion 1); `tests/core/ruler-definition.test.ts` — the description assertion, if added (criterion 3)

**Constraints:**
- prd/CC-002: WCAG 2.1 AA 1.4.11. The package cannot make a consumer compliant, so it states the condition under which its own drawing meets the 3:1 target
- DEL-002 of rulers NLC TICKET-003: the marks stay as they are; this ticket only moves and widens the documentation of that decision

**Known Hazards:**
- The 330 px figure is arithmetic on DEL-002's own model, not a browser measurement. `#222222` blended into white at coverage a reaches 3:1 only when a ≥ 0.48, and a mark 0.587 × W / 400 px wide gives W ≥ 327 px for 30 cm. A sub-pixel line straddling two device pixels may render lighter still. So write it as "about" and "at least", never as a guarantee, and do not claim that wider is certainly compliant. Someone who can render the ruler in a browser may refine the figure; say that in the delivery record.
- Keep every figure the same in every place (`RulerGraph.tsx`, `Graph.tsx`, README, the description if changed): 330 px for 30 cm, about 10.9 px per centimeter (so 164 px for 15 cm), 210 px for 12 in to sixteenths. Do not round one place to 11 px per centimeter and another to 10.9; if the README uses a per-centimeter rule, state it as "about 11" and give the 330 px example beside it.
- The layout does not decide the shown size and must not start to: the Scene scales to its container (`width="100%"`). Do not add a minimum width or a size prop to the layout or the components in this ticket; that would be a behavior change needing its own decision. The marks stay unchanged.
- Editing the ruler's `description` changes the vocabulary, schema and tool schema in `src/generated/*`, and CI fails when the committed files differ from a fresh `pnpm generate`. It also changes what a model reads. Keep it to one short sentence, and run the schema tests (`tests/core/schema-shape.test.ts`, `tests/core/schema-meta.test.ts`, `tests/core/schema-agreement.test.ts`) after.
- This is a comment and documentation change in source files. Do not touch any code line in `src/layout/kit/ruler.ts` or `src/react/Graph.tsx`, and keep the `// @spec` annotations where they are.

**Depends On:** None
**Blocks:** None

**Size:** Small

**Notes:** The sweep says this "can wait": the project accepted the contrast risk in DEL-002 and nothing is broken today. The change brief's Priority Cut has only Must, with no Should or Could stated, so the ticket takes Must; schedule it last in the area.
