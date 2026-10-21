# TICKET-003: Deliver the ruler: layout, component and entry point — Delivery Record

## Ticket Reference

**Ticket:** rulers/number-lines-and-coordinate-graphs/TICKET-003
**Change:** `.gener8v/changes/rulers/change.md` — Approved (Product Owner — Thomas Eaves, 2026-10-19) when delivery started
**Specification:** `.gener8v/specifications/number-lines-and-coordinate-graphs.md` (amended by `rulers`, approved 2026-10-20)
**Requirements Covered:**
- NLC-REQ-040: Render a ruler from a unit and a whole-number length
- NLC-REQ-043: Every whole unit numbered from 0 to the length (drawn)
- NLC-REQ-044: A mark at every millimetre on a centimetre ruler (drawn)
- NLC-REQ-045: Half-centimetre and whole-centimetre marks progressively longer (drawn)
- NLC-REQ-047: A mark at every multiple of the smallest division on an inch ruler (drawn)
- NLC-REQ-048: Inch marks graded by fraction (drawn)
- NLC-REQ-050: The object drawn as a plain bar lying along the ruler, its ends aligned with its marks
- NLC-REQ-055: The object's length is never written on the figure

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| TICKET-001 delivered (mark rule and kit) | done | Delivered, Approved by all three reviews. `src/core/ruler.ts` exposes `rulerScale`, `marksPerUnit`, `isRulerLength`; `src/layout/kit/ruler.ts` exposes `drawRulerMarks` (options `from`, `to`, `unit`, `length`, `smallestDivision`, `side`, `fontSize`), `rulerMarksDepth`, `rulerNumberOverhang`, `RULER_MARK_LENGTHS`, `RULER_MIN_MARK_WIDTH` | ✅ |
| TICKET-002 delivered (definition) | done | Delivered, Approved by all three reviews. `src/core/definitions/ruler.ts` exports `ruler` (`/* @__PURE__ */ defineRuler()`), `Ruler`, `MeasuredObject`; `describe(ruler)` states each end as its located mark | ✅ Not registered (DEL-002 there): registered here |
| `Layout<D>` is `(normalized, provenance) → Scene`; registry table | present | `src/layout/registry.ts` (`layouts`, `satisfies`) | ✅ |
| `createGraphComponent`, `componentName("ruler")` | `RulerGraph` | `src/react/createGraphComponent.tsx`; "ruler" → "RulerGraph" | ✅ |
| `titleBlock`, `placeLabel`, `wrap`, `textLines`, `textWidth` | present | `src/layout/kit/title.ts`, `labels.ts`, `text.ts` | ✅ |
| Entry point lists | `package.json` `exports`, `.size-limit.json` | also `tsup.config.ts` `entry` and `src/index.ts`; `tests/package/entries.test.ts` checks the three lists agree | ✅ All four updated |
| `examples/ruler.json` | drawable | present (TICKET-002): a 6 in ruler at eighths with a pencil from 1.5 to 4.25, orange | ✅ |
| `pnpm generate` regenerates schema, tool schema, types, vocabulary | `scripts/generate.ts` | present; writes `src/generated/{schema.json,tool-schema.json,description.ts,vocabulary.json}` | ✅ |
| Tests that enumerate registered types | `tests/react/Graph.test.tsx`, `tests/core/schema-agreement.test.ts`, `tests/core/definitions.test.ts` | they read `registeredTypes(definitions)`; `definitions.test.ts` lists the ruler explicitly at lines 253-254 and 671-685 | ✅ Lists updated here |
| Documentation site (graph-library CPSE TICKET-008) | delivered or not | not delivered (no delivery record) | ✅ Resolved: the site picks the ruler up from the registry and `examples/ruler.json` when it is built |
| Carried findings | NLC TICKET-001 CR-004, CR-005, QR-010, SEC-002; TICKET-002 DEL-001, DEL-002, CR-003, QR-002, SEC-002 | listed in the ticket's Known Hazards | 🔁 Carried — see Implementation Plan |

**Resolved from ground truth (not escalated):**
- **The documentation site:** CPSE TICKET-008 is not delivered, so the ruler is not added to it here. The site takes the ruler from the registry and `examples/ruler.json`.
- **The entry lists:** a new entry point is four edits (`package.json`, `tsup.config.ts`, `.size-limit.json`, `src/index.ts`), as `tests/package/entries.test.ts` requires.
- **The object's color when none is given:** the default style's `accent` (`#0072b2`), which highlights "marked points and other highlighted elements" (`src/core/style.ts`).

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-10-21

Engineer decisions:
- DEL-001: the layout. From the top: the title, the object's label, the object's bar, then the ruler's body. Marks run down from the body's top edge, and the numbers sit below them. The bar lies just above that edge, so it never covers a mark or a number. The marked edge is a fixed 352 units, whatever the length, so every unit of a ruler is the same length and every ruler fills the drawing. The number size is the tick-label size (12), made smaller only when two neighbouring numbers would touch.
- DEL-002: mark contrast (NLC TICKET-001 CR-004). The marks are not changed. `<RulerGraph>`'s documentation states that a ruler keeps 3:1 mark contrast when shown at least 330 px wide.
- DEL-003: the object's color fills the bar only, with no outline, as the bar graph draws a bar. The default is the style's `accent`. The label is drawn in the text color.

### Planned Files

- `src/layout/ruler.ts`: `rulerLayout: Layout<Ruler>`, with top-level values free of side effects.
  - It draws `titleBlock(title)`, then the body as a `rect` with its top edge as the marked edge.
  - The marks and numbers come from `drawRulerMarks({ from, to, unit, length, smallestDivision, side: "right", fontSize })`.
  - The number size is `rulerFontSize(length)`: the largest size, up to 12, at which the widest number plus a gap fits one unit.
  - The body's ends are sized with `rulerNumberOverhang`, and its depth with `rulerMarksDepth`.
  - The object is a `rect` from `locate(start).value` to `locate(end).value`, placed with the same `linearScale` mapping the kit uses.
  - The label is wrapped to at most 2 lines and placed by `placeLabel` above the bar. The bar, the body and the numbers are the obstacles.
  - `textAlternative` is `ruler.describe(normalized)`.
- `src/layout/registry.ts`, `src/core/definitions/index.ts`: register the ruler.
- `src/react/graphs/RulerGraph.tsx`: `/* @__PURE__ */ createGraphComponent("ruler", …)`, with the 330 px note.
- `src/entries/ruler.ts`; `src/index.ts`; `package.json` `exports["./ruler"]`; `tsup.config.ts`; `.size-limit.json` (25 kB).
- `src/core/ruler.ts`: `/* @__PURE__ */` on the `Object.freeze` tables (QR-002 hazard).
- `src/generated/*`: regenerated by `pnpm generate`.
- `tests/layout/ruler.test.ts`, checking each criterion from the drawing data:
  - mark counts and lengths at 15 cm, at 6 in in sixteenths, and in quarters;
  - numbers 0 to the length, and equal units;
  - bar ends on the marks, including computed ends and an object that starts at a mark other than 0;
  - no text that states a length, and a ruler with no object;
  - the title, and no overlaps at both maximum lengths.
- `tests/react/Graph.test.tsx`: `<RulerGraph>` and `<Graph>` markup identical; a caller's text alternative replaces the generated one (NLC-REQ-013); a 500 KB label stays bounded.
- `tests/package/per-type-bundle.test.ts`: the ruler's bundle leaves the other types out, and the other types' bundles leave "A ruler" out.
- `tests/core/definitions.test.ts`: remove the explicit ruler lists, since `allDefinitions()` now covers it.
- `.gener8v/specifications/number-lines-and-coordinate-graphs.md` (and `graph-specification-and-vocabulary.md` where rows say "registered with TICKET-003"): `@spec` Coverage rows.

### How Acceptance Criteria Will Be Met

- **Example renders three ways:** the Graph.test "fit together" loop and the per-type bundle test.
- **Mark counts, lengths and numbers:** `tests/layout/ruler.test.ts`.
- **Equal units, filling the width:** the layout test measures every whole-mark spacing and the edge's ends at lengths 1 and the maximum.
- **The object bar:** the layout test checks its ends against the computed mark positions, its color, and that its label does not hide a number.
- **No length text:** the layout test checks that every text is either a whole-unit number or a title or label line.
- **No object, and the title:** the layout test.
- **Accessible name:** the layout test (`textAlternative`) and the Graph tests (`aria-label`, `<title>`).
- **The entry point:** `entries.test.ts`, `pnpm size`, `check:dist`, `publint`, `attw`.

## Progress

- [x] `src/core/ruler.ts` — pure tables
- [x] `src/layout/ruler.ts` — written, annotated
- [x] `src/layout/registry.ts`, `src/core/definitions/index.ts` — registration
- [x] `src/react/graphs/RulerGraph.tsx`, `src/entries/ruler.ts`, `src/index.ts`, `package.json`, `tsup.config.ts`, `.size-limit.json`
- [x] `src/generated/*` — `pnpm generate`
- [x] `tests/layout/ruler.test.ts`
- [x] `tests/react/Graph.test.tsx`, `tests/package/per-type-bundle.test.ts`, `tests/core/definitions.test.ts`
- [x] `@spec` Coverage rows

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/layout/ruler.ts`: `rulerLayout`, `rulerFontSize`, `RULER_EDGE`, `BAR_HEIGHT`, `LABEL_MAX_LINES` (new)
- `src/react/graphs/RulerGraph.tsx`: `RulerGraph`, with the 330 px note (new)
- `src/entries/ruler.ts`: the `./ruler` entry point (new)
- `src/layout/registry.ts`, `src/core/definitions/index.ts`: the ruler registered
- `src/index.ts`, `package.json`, `tsup.config.ts`, `.size-limit.json`: `RulerGraph` exported; `./ruler` added (25 kB budget)
- `src/core/ruler.ts`: `/* @__PURE__ */` on `RULER_UNITS`, `INCH_DIVISIONS`, `RULER_MAX_LENGTH`, `INCH_RANKS`
- `src/generated/description.ts`, `schema.json`, `tool-schema.json`, `vocabulary.json`: regenerated with the ruler
- `tests/layout/ruler.test.ts`: 23 tests, one a fast-check property over 200 rulers (new)
- `tests/react/Graph.test.tsx`: the ruler's accessible name and caller's text alternative, the display name, a 500 KB label and title
- `tests/package/per-type-bundle.test.ts`: the ruler's bundle excludes the other types; theirs, and consumer bundles of their built entries, exclude the ruler, its mark rule's tables and its kit
- `tests/core/definitions.test.ts`: the explicit ruler lists removed; `allDefinitions()` covers it
- `.gener8v/specifications/number-lines-and-coordinate-graphs.md`, `graph-specification-and-vocabulary.md`, `component-packaging-and-source-export.md`: `@spec` Coverage rows

## Verification Run

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm generate` | 0 | wrote `src/generated/{description.ts,schema.json,tool-schema.json,vocabulary.json}` |
| `pnpm lint` | 0 | — |
| `pnpm typecheck` | 0 | after one fix in the new test (a `valid` narrowing) |
| `pnpm test` (run 1) | 0 | 49 files, 1,370 tests |
| `pnpm test` (run 2) | 0 | 1,370 tests |
| `pnpm test` (run 3) | 1 | 1 failed: `tests/layout/kit/text.test.ts` "stops early, so caller-sized text costs little", a timing test this ticket does not touch; passed alone 3 times |
| `pnpm test` (run 4) | 0 | 1,370 tests |
| `pnpm bench` | 0 | validation GSV-NFR-001 now includes the ruler: p95 0.0229 ms |
| `pnpm build` | 0 | `dist/ruler.js`, `dist/ruler.d.ts` |
| `pnpm check:dist` | 0 | — |
| `pnpm check:deps` | 0 | — |
| `pnpm check:images` | 0 | — |
| `pnpm size` | 0 | `./ruler` 17.86 kB of 25 kB; `./circle` 16.45 kB |
| `pnpm publint` | 0 | — |
| `pnpm attw` | 0 | — |
| `pnpm audit` | 0 | No known vulnerabilities found (2026-10-21) |
| Mutation: bar drawn at the edge | — | 1 test fails |
| Mutation: numbers fixed at 12 | — | 1 test fails (overlap at 30 cm) |
| Mutation: object color on the label | — | 1 test fails |
| Mutation: no label line limit | — | 2 tests fail |
| Mutation: mark tables in `src/core/ruler.ts` not marked pure | — | 1 test fails (built-entry consumer bundles) |
| Mutation: bar from the raw ends, not the located marks | — | no test fails: the two differ by under 1e-9 of a mark, below `fmt()`'s step, so the drawing is the same |

## Acceptance Criteria Verification

- [x] `examples/ruler.json` renders through `<RulerGraph>` and `<Graph>` with identical markup, and through `./ruler` — Graph.test "fit together" loop and "the ruler's accessible name"; per-type-bundle ruler test; `entries.test.ts`; `pnpm build`
- [x] 15 cm: 151 marks, 3 lengths, numbers 0–15; 6 in: 97 marks, 5 lengths, numbers 0–6; quarters: 25 marks, 3 lengths — `tests/layout/ruler.test.ts` "marks and numbers"
- [x] Every unit the same length, the ruler filling the fixed width whatever its length, to scale with itself only — "drawn to scale with itself": whole marks at 24 and 376 and equal spacing at 1, 7 and 30 cm and 1 and 12 in; every mark within 0.5 of its position
- [x] The object a filled bar beside the marked edge, ends within 0.5 of its marks, from a start other than 0; color on the bar only; label wrapped, cut and placed by `placeLabel` without hiding a number — "the measured object" tests and the fast-check property
- [x] No text states the object's length — the fast-check property: every text is a whole-unit number, a title line or label words, and the object's length appears nowhere
- [x] No object: only body, marks and numbers; the title drawn with `titleBlock` — "the ruler's parts"
- [x] The text alternative from `describe` is the accessible name — "states the definition's text alternative"; Graph.test `aria-label` and `<title>`; a caller's text alternative replaces it (NLC-REQ-013)
- [x] `./ruler` in `exports` and `.size-limit.json`, within budget; `check:dist`, `publint`, `attw` pass — Verification Run

## Decisions Made

### DEL-001: The ruler's layout

**Context:** The specification leaves the object's side, the body and the number size to delivery (ticket Notes).
**Decision:** From the top: title, label, bar, then the body, whose top edge is the marked edge, with marks running down and numbers below them. The bar lies 4 units above the edge. The edge is a fixed 352 units. The number size is 12, or the largest size at which the widest number plus 2 units fits one unit (`rulerFontSize`): about 7.96 at 30 cm. The body reaches 8 units past each end of the edge, or further when a number needs it (`rulerNumberOverhang`), and is as deep as `rulerMarksDepth` plus 6.
**Rationale:** The bar above the edge covers no mark or number, and its ends sit next to the marks they align with. A fixed edge gives every ruler the same width, and every unit of one ruler the same length (AD-007).
**Ticket Impact:** Approved by the Engineer with the plan.

### DEL-002: Mark contrast at small sizes (NLC TICKET-001 CR-004)

**Context:** A 30 cm ruler's millimetre marks are 0.59 units wide. Below about 330 px shown width they render lighter than 3:1 (WCAG 1.4.11): blended in sRGB, a mark needs about 0.48 px of coverage. A 12 in ruler in sixteenths (0.92 units) keeps 3:1 down to about 210 px.
**Decision:** The marks are unchanged. `<RulerGraph>`'s documentation asks for at least 330 px shown width.
**Rationale:** Wider marks would run neighbouring millimetres together on a 30 cm ruler. Worksheets show rulers wider than 330 px.
**Ticket Impact:** Approved by the Engineer with the plan.

### DEL-003: The object's color

**Context:** CC-002 asks for 3:1 contrast and no reliance on color alone.
**Decision:** The color fills the bar only, with no outline, as the bar graph draws its bars. The default is the style's `accent`. The label is in the text color.
**Rationale:** The bar is the only object on the figure, and is told apart by its shape, its place and its label, not by its color. Named colors and the default have 3:1 (GSV-NFR-004). A caller's hex code is the caller's choice, as on every type. An outline would reach half its width past the end marks.
**Ticket Impact:** Approved by the Engineer with the plan.

## Deviations from Plan

- **The number size at 30 cm is about 7.96, not the 8.8 stated when the plan was presented.** The estimate left out the 2-unit space between numbers. The tests pin the computed value. No downstream impact.
- **The bundle test checks consumer bundles of the built entries too.** A source bundle drops the mark rule's tables whether or not they are marked pure, so only the built entries show the QR-002 leak.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| NLC-REQ-040 | `src/layout/ruler.ts`:rulerLayout; `src/react/graphs/RulerGraph.tsx`:RulerGraph | `@spec NLC-REQ-040, …` |
| NLC-REQ-043 | `src/layout/ruler.ts`:rulerLayout (with `src/layout/kit/ruler.ts`:drawRulerMarks) | `@spec …, NLC-REQ-043, …` |
| NLC-REQ-044 | `src/layout/ruler.ts`:rulerLayout | `@spec …, NLC-REQ-044, …` |
| NLC-REQ-045 | `src/layout/ruler.ts`:rulerLayout | `@spec …, NLC-REQ-045, …` |
| NLC-REQ-047 | `src/layout/ruler.ts`:rulerLayout | `@spec …, NLC-REQ-047, …` |
| NLC-REQ-048 | `src/layout/ruler.ts`:rulerLayout | `@spec …, NLC-REQ-048, …` |
| NLC-REQ-050 | `src/layout/ruler.ts`:rulerLayout | `@spec …, NLC-REQ-050, …` |
| NLC-REQ-055 | `src/layout/ruler.ts`:rulerLayout | `@spec …, NLC-REQ-055` |
| CPSE-REQ-004 | `src/entries/ruler.ts` | `@spec CPSE-REQ-004` |
| CPSE-REQ-007 | `src/react/graphs/RulerGraph.tsx`:RulerGraph | `@spec NLC-REQ-040, CPSE-REQ-007` |

## Notes

- **Documentation site:** CPSE TICKET-008 is not delivered, so the site picks the ruler up from the registry and `examples/ruler.json` when it is built (ticket hazard).
- **TICKET-004:** NLC-NFR-005..008 (geometry, server rendering, accessibility, render benchmark) are TICKET-004's. The validation benchmark already includes the ruler.
- **README:** its "Planned graph types" list does not name rulers. Out of this ticket's scope.
- **Timing flake:** a text-kit timing test failed once under full-suite load, as the pictograph timing test does.

## Post-Review Amendments

None
