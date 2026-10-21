# TICKET-003: Deliver the ruler: layout, component and entry point — Code Review

## Summary

This reviews the delivery of `rulers/number-lines-and-coordinate-graphs/TICKET-003` (commit 5e28148, branch `ticket/rulers-nlc-003`) against the ticket, the NLC, GSV and CPSE specifications, the `prd` constraints and the system design. The code-reviewer agent did the findings phase in a fresh context. Every acceptance criterion is met, the eight requirements are covered and annotated, the coverage rows are updated in all three specifications, and every command in the Verification Run reproduces. Every carried Known Hazard is addressed in code or recorded in a DEL: CR-004, CR-005, QR-010 and SEC-002 from TICKET-001, and DEL-001, DEL-002, CR-003, QR-002 and SEC-002 from TICKET-002. Three findings, none Critical:
- One Issue. This delivery publishes the shared `label` term for the first time. Its published definition does not say that the drawing cuts a measured object's label after two lines. A carried hazard asks for that sentence (CR-001).
- Two Observations:
  - A few ruler kit and layout statements stay in the consumer bundles of every other built entry (about 91 B gzip), and the new bundle test's name claims the kit is left out (CR-002).
  - The 330 px minimum width from DEL-002 is stated only on `<RulerGraph>`, and no downstream ticket carries it (CR-003).

**Delivery Record:** `.gener8v/changes/rulers/delivery/number-lines-and-coordinate-graphs-ticket-003-delivery.md`
**Files Reviewed:**
- `src/layout/ruler.ts`
- `src/react/graphs/RulerGraph.tsx`
- `src/entries/ruler.ts`
- `src/layout/registry.ts` and `src/core/definitions/index.ts` (the ruler registered)
- `src/index.ts`, `package.json`, `tsup.config.ts`, `.size-limit.json` (the `./ruler` entry and `RulerGraph` export)
- `src/core/ruler.ts` (the `/* @__PURE__ */` annotations)
- `src/generated/description.ts`, `src/generated/schema.json`, `src/generated/tool-schema.json`, `src/generated/vocabulary.json`
- `tests/layout/ruler.test.ts`
- `tests/react/Graph.test.tsx` (the ruler's accessible name, display name and 500 KB text test)
- `tests/package/per-type-bundle.test.ts` (the two ruler tests)
- `tests/core/definitions.test.ts` (the explicit ruler lists removed)
- `.gener8v/specifications/number-lines-and-coordinate-graphs.md`, `.gener8v/specifications/graph-specification-and-vocabulary.md`, `.gener8v/specifications/component-packaging-and-source-export.md` (`## @spec Coverage` rows)
- Read for context, not changed by this ticket: `src/layout/kit/ruler.ts`, `src/core/definitions/ruler.ts`, `src/core/definitions/shared.ts`, `src/core/definitions/circle.ts`, `src/layout/kit/title.ts`, `src/layout/kit/labels.ts`, `src/layout/kit/text.ts`, `src/layout/kit/check.ts`, `src/react/Graph.tsx`, `examples/ruler.json`, `tests/package/entries.test.ts`, `scripts/generated-files.ts`, and the built `dist/`

**Findings:** 3
**Critical:** 0 | **Issues:** 1 | **Observations:** 2

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| `examples/ruler.json` renders through `<RulerGraph>` and through `<Graph>` with identical markup, and through the `./ruler` entry point | Yes | **Tests:**<br>• The "fit together" loop (`tests/react/Graph.test.tsx:74-84`) now includes `RulerGraph`, because the ruler is registered and exported from `src/index.ts:9`.<br>• `tests/react/Graph.test.tsx:148-153` compares the two markups for the example.<br>• `tests/package/per-type-bundle.test.ts:197-211` bundles `src/entries/ruler.ts` and finds "A ruler" in it.<br>• attw resolves `./ruler` for node16 ESM and bundler.<br>**Probe:** no test renders the example through the entry itself. `src/entries/ruler.ts:4` re-exports the same component. I rendered `examples/ruler.json` through the built `dist/ruler.js` `RulerGraph`, `dist/index.js` `Graph` and `dist/index.js` `RulerGraph`, and got identical markup, 6,826 characters each. |
| A centimetre ruler of length 15 draws 151 marks, three lengths of mark, and the numbers 0 to 15. An inch ruler of length 6 draws 97 marks at sixteenths, five lengths of mark, and the numbers 0 to 6. With a smallest division of a quarter it draws 25 marks and three lengths | Yes | The marks and numbers come from `drawRulerMarks` (`src/layout/ruler.ts:112-121`), built with the normalized `smallestDivision`.<br>**Tests:**<br>• `tests/layout/ruler.test.ts:60-65` (15 cm), `:67-72` (6 in) and `:74-78` (quarters);<br>• the grading order at `:80-88`. |
| Every unit is drawn at the same length, and the ruler fills the fixed drawing width whatever its length (AD-007). It is drawn to scale with itself only | Yes | `RULER_EDGE` is a fixed 352 units, centred from 24 to 376 (`src/layout/ruler.ts:20-24`), whatever the length. There is no unit conversion.<br>**Tests:**<br>• `tests/layout/ruler.test.ts:100-110` checks whole marks at 24 and 376 and equal spacing within 0.02 at 1, 7 and 30 cm and at 1 and 12 in;<br>• `:112-118` checks every mark within 0.5 of its value's position. |
| The object is a filled bar beside the marked edge whose two ends lie within 0.5 units of its start and end marks' positions. An object starting at a mark other than 0 is drawn from that mark. Its color applies to the bar only, and its label (wrapped, cut to its line limit) is placed by `placeLabel` without hiding a number | Yes | **Code:**<br>• The bar (`src/layout/ruler.ts:123-131`) runs from `scale.locate(end).value` on the kit's `linearScale` mapping. It has no stroke and lies 4 units above the edge.<br>• The label is wrapped to 240 units and 2 lines (`:97-98`) and placed by `placeLabel` (`:133-146`), with the bar and the body as obstacles.<br>**Tests:** `tests/layout/ruler.test.ts:147-201` and the property at `:203-251`.<br>**Probes:**<br>• Bar ends: 7,518 objects over every unit, division and length. The bar's start always equals its start mark's `x1` exactly. Its end, `fmt(x1) + fmt(x2 − x1)`, is off its mark by at most 0.01 (one `fmt()` step), in 725 of them.<br>• Label placement: 2,016 labeled objects, with no title, a short title or a 3-line title, and with labels up to a 400-character word. No label line overlaps the bar, the body, the title or a number. Every line is inside the drawing, and there are never more than 2. |
| No text in the Scene states the object's length: the only numbers drawn are the whole-unit numbers | Yes | The layout writes text only through `titleBlock` (`:91`), the kit's numbers (`:112-121`) and the label lines (`:145`). The fast-check property (`tests/layout/ruler.test.ts:203-251`, 200 rulers) checks that every text is a whole-unit number, a title line or label words, and that the length appears nowhere. |
| A ruler with no object draws only the body, marks and numbers. The title, when given, is drawn with `titleBlock` | Yes | `tests/layout/ruler.test.ts:255-261` checks 1 + 41 + 5 nodes on a 4 cm ruler. `:263-269` checks that the scene starts with `titleBlock(title).nodes` and the body lies below it. |
| The text alternative from TICKET-002's `describe` is the accessible name (`aria-label` and `<title>`) | Yes | `textAlternative: rulerDefinition.describe(normalized, provenance)` (`src/layout/ruler.ts:152`).<br>**Tests:**<br>• `tests/layout/ruler.test.ts:281-286`;<br>• `tests/react/Graph.test.tsx:148-153` checks `aria-label` and `<title>`;<br>• `:155-163` checks that a caller's text alternative replaces it and a blank one does not (NLC-REQ-013, the carried TICKET-002 DEL-002 hazard). |
| `./ruler` exists in `package.json` exports and in `.size-limit.json`, within its budget, and `pnpm check:dist`, `publint` and `attw` pass | Yes | `package.json:67-70`, `.size-limit.json:50-55` (25 kB), `tsup.config.ts:17`. `tests/package/entries.test.ts` checks that the three lists agree. `check:dist`, `publint` and `attw` exit 0 on re-run. I did not re-run `pnpm size` (see the Verification Run). The record states 17.86 kB, and my esbuild estimate of a minified consumer bundle of `dist/ruler.js` is 19.67 kB gzip. Both are under budget. |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| NLC-REQ-040 | Render a ruler from a unit and a whole-number length | `src/layout/ruler.ts`:rulerLayout, registered at `src/layout/registry.ts:40`, with the definition at `src/core/definitions/index.ts:29`; `src/react/graphs/RulerGraph.tsx`:RulerGraph; `src/entries/ruler.ts` | Yes |
| NLC-REQ-043 | Every whole unit numbered from 0 to the length (drawn) | `src/layout/ruler.ts`:rulerLayout (`drawRulerMarks` at `:112-121`, at `rulerFontSize(length)`, `:53-56`); `src/layout/kit/ruler.ts`:drawRulerMarks | Yes |
| NLC-REQ-044 | A mark at every millimetre on a centimetre ruler (drawn) | `src/layout/ruler.ts`:rulerLayout (`rulerScale` with no division on a centimetre ruler; `drawRulerMarks`) | Yes |
| NLC-REQ-045 | Half-centimetre and whole-centimetre marks progressively longer (drawn) | `src/layout/ruler.ts`:rulerLayout; `src/layout/kit/ruler.ts`:RULER_MARK_LENGTHS (20, 14, 8) | Yes |
| NLC-REQ-047 | A mark at every multiple of an inch ruler's smallest division (drawn) | `src/layout/ruler.ts:117` (passes `smallestDivision` when the description gives one; the default sixteenth otherwise) | Yes |
| NLC-REQ-048 | Inch marks graded by fraction (drawn) | `src/layout/ruler.ts`:rulerLayout; `src/layout/kit/ruler.ts`:RULER_MARK_LENGTHS (22, 17, 13, 9.5, 6.5) | Yes |
| NLC-REQ-050 | The object drawn as a plain bar lying along the ruler, its ends aligned with its marks | `src/layout/ruler.ts:123-131` (the bar from the located start mark to the located end mark; filled, no outline) | Yes |
| NLC-REQ-055 | The object's length is never written on the figure | `src/layout/ruler.ts`:rulerLayout (the only text is the title, the whole-unit numbers and the label) | Yes |
| NLC-REQ-013, NLC-REQ-056 (carried, TICKET-002 DEL-002) | A caller's text alternative replaces the generated one, and the generated one is the accessible name | `src/layout/ruler.ts:152`; existing `textAlternativeFor` at print; `tests/react/Graph.test.tsx:143-164` | Yes |
| CPSE-REQ-004 (annotated here) | A single type's component without the other types' code | `src/entries/ruler.ts`; `package.json:67-70`; `tsup.config.ts:17` | Yes. About 91 B of ruler kit and layout statements reach the others' built bundles (CR-002). |
| CPSE-REQ-007 (annotated here) | One React component per graph type | `src/react/graphs/RulerGraph.tsx:16` (`/* @__PURE__ */ createGraphComponent("ruler", …)`, display name `RulerGraph`) | Yes |
| GSV-REQ-040, GSV-REQ-049..051 (published with registration) | The measured object's label and color; the unit and division lists; the division's condition | `src/generated/vocabulary.json`, `schema.json`, `tool-schema.json`, `description.ts`, regenerated. All five generated files match a fresh `generatedFiles()` run (probe). | Yes. The published `label` wording is CR-001. |

*The ticket carries no NFR. NLC-NFR-005..008 belong to TICKET-004. The re-run bench shows the GSV-NFR-001 validation benchmark already includes the ruler (p95 0.0205 ms). Every requirement in the ticket's Requirements Covered field is listed. The CPSE and GSV rows are added because this delivery annotates them or updates their coverage rows.*

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/TC-001 | Output computed during render from the description alone, with no measuring | Yes | The layout uses the estimated `textWidth` and `wrap` only. It has no React import and no DOM access, and the component is pure. |
| prd/TC-002 | Coordinates rounded before they reach markup | Yes | Every `rect` attribute goes through `fmt()` (`src/layout/ruler.ts:58-68`), and so does the height (`:151`). The kit and `textLines` use `fmt()` too. `checkScene` runs on every scene in `tests/layout/ruler.test.ts` (`:25`) and rejects more than 2 decimals. |
| prd/TC-003 | Ids unique and stable, where used | Yes | Under AD-008 there are none: no `id` and no `url(`. `checkScene` rejects references. |
| prd/TC-004 | React 18 and 19 APIs only | Yes | The component is built with `createGraphComponent` only. No new React API is used. |
| prd/TC-007 | A side-effect-free per-type entry | Yes, with CR-002 | `src/entries/ruler.ts` is a re-export, and the package sets `sideEffects: false`. The core tables are now `/* @__PURE__ */` (`src/core/ruler.ts:8`, `:13`, `:24`, `:99`). The ruler's source bundle leaves the other types out, and the others leave "A ruler" out. The built entries' consumer bundles keep the kit's unannotated table and a few constants (CR-002). |
| prd/CC-002 | Text alternative (1.1.1), 3:1 contrast for the marks and the object (1.4.11), not color alone (1.4.1) | Yes, with CR-003 | **1.1.1:** `describe` is the accessible name, through `aria-label` and `<title>`.<br>**1.4.11:**<br>• The marks and the body use `#222222`, at 15.9:1.<br>• The default bar color, `accent` `#0072b2`, is about 5.2:1, and the named colors have at least 3:1 (GSV-NFR-004).<br>• Sub-pixel marks are documented as keeping 3:1 at 330 px or wider (DEL-002). My arithmetic agrees: 0.587-unit marks need about 0.48 px of coverage, so about 327 px. That note's reach is CR-003.<br>**1.4.1:** there is one object, told apart by its shape, its place and its label. |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-001 | One package, a per-type entry point per graph type, `sideEffects: false` | Yes | `./ruler` is in `exports`, `tsup.config.ts` and `.size-limit.json`, and `RulerGraph` is in the `.` entry (`src/index.ts:9`). `dist/ruler.d.ts` carries the component's JSDoc. CR-002 covers the leftover bytes. |
| AD-002 | A pure `layout(normalized, provenance) → Scene` | Yes | `rulerLayout: Layout<Ruler>` (`src/layout/ruler.ts:87`) returns plain data from the kit's primitives. It fails closed with `RangeError` on a ruler no validation gives (`:88-90`). The tests assert on Scene data. |
| AD-007 | A 400-unit drawing space and one rounding function | Yes | `width: SCENE_WIDTH` and a fixed, centred 352-unit edge. The height follows the content (70.55 to 153.8 in the probes), through `fmt()`. |
| AD-008 | No ids; accessible name through `role="img"`, `aria-label` and `<title>` | Yes | `tests/react/Graph.test.tsx:148-153`; the reviewer's render of the built entry shows `role="img"`, `aria-label` and `<title>`. |
| AD-010 | Estimated metrics; labels placed by `placeLabel` | Yes | `wrap(labelText, 240, 14, 2)` and the widest line found by a loop, not a spread (`:98-101`). `placeLabel` gets three candidates (centred, flush left, flush right, each kept inside the drawing) and the bar and body as obstacles (`:137-144`). The fallback is the first candidate, as the graph-library hazard asks. |
| AD-011 | Presentation attributes, named colors, non-color cues | Yes | `fill`, `stroke`, `stroke-width` and `font-size` attributes only. The object's color arrives resolved to `#rrggbb` by validation, and is applied to the bar only (`tests/layout/ruler.test.ts:172-180`). |
| AD-014 | Pure components; invalid input goes to the fallback | Yes | `RulerGraph = /* @__PURE__ */ createGraphComponent(…)`. The 500 KB label and title test (`tests/react/Graph.test.tsx:420-435`) draws through both components without calling the fallback, and gets 3 + 2 + 31 text nodes. |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| NLC-REQ-040 | `@spec NLC-REQ-040` | `src/layout/ruler.ts:86` (rulerLayout); `src/react/graphs/RulerGraph.tsx:15` (RulerGraph) | Yes |
| NLC-REQ-043 | `@spec NLC-REQ-043` | `src/layout/ruler.ts:86`; `src/layout/kit/ruler.ts:163` (drawRulerMarks, TICKET-001) | Yes |
| NLC-REQ-044 | `@spec NLC-REQ-044` | `src/layout/ruler.ts:86` | Yes |
| NLC-REQ-045 | `@spec NLC-REQ-045` | `src/layout/ruler.ts:86` | Yes |
| NLC-REQ-047 | `@spec NLC-REQ-047` | `src/layout/ruler.ts:86` | Yes |
| NLC-REQ-048 | `@spec NLC-REQ-048` | `src/layout/ruler.ts:86` | Yes |
| NLC-REQ-050 | `@spec NLC-REQ-050` | `src/layout/ruler.ts:86` | Yes |
| NLC-REQ-055 | `@spec NLC-REQ-055` | `src/layout/ruler.ts:86` | Yes |
| CPSE-REQ-004 | `@spec CPSE-REQ-004` | `src/entries/ruler.ts:3` | Yes |
| CPSE-REQ-007 | `@spec CPSE-REQ-007` | `src/react/graphs/RulerGraph.tsx:15` | Yes |

**Coverage:** 8 of 8 ticket requirements annotated, plus the 2 CPSE requirements this delivery annotates. Each annotation is on the line directly above its declaration, as in the other layouts and entries.
**Missing:** None.
**Specification table:** Yes.
- `.gener8v/specifications/number-lines-and-coordinate-graphs.md:209-214` now names `src/layout/ruler.ts`:rulerLayout for NLC-REQ-043..048, and drops the "drawn with rulers NLC TICKET-003" qualifiers. `:224-226` add NLC-REQ-040, 050 and 055.
- `:218` (NLC-REQ-001) now says where the ruler is registered. That parenthetical names the registry as context, not as an annotated location.
- `.gener8v/specifications/component-packaging-and-source-export.md:194-195` add the CPSE-REQ-004 and CPSE-REQ-007 rows.
- `.gener8v/specifications/graph-specification-and-vocabulary.md:202` and `:242-244` change "published once registered" to "published since … registered it".
- No stale "once registered" or "TICKET-003" qualifier remains.
- `gener8v-state.py lint` reports 0 errors and 0 warnings.

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm generate` | not run (skipped by instruction, as it rewrites files) | Yes by probe: `generatedFiles()` from `scripts/generated-files.ts`, compared in memory, matches all five committed files (`src/generated/*` and `tests/fixtures/generated/description.ts`) |
| `pnpm lint` | 0 | Yes |
| `pnpm typecheck` | 0 | Yes |
| `pnpm test` (record: four runs, one timing flake), re-run three times as `npx vitest run --no-cache` | 0, 0, 0 | Yes. 49 files and 1,370 tests passed on each run. The `text.test.ts` timing flake did not recur. |
| `pnpm bench` | 0 | Yes. The GSV-NFR-001 ruler p95 is 0.0205 ms. |
| `pnpm build` | 0 | Yes (`dist/ruler.js`, `dist/ruler.d.ts`) |
| `pnpm check:dist` | 0 | Yes (16 built files, no network APIs) |
| `pnpm check:deps` | 0 | Yes |
| `pnpm check:images` | 0 | Yes |
| `pnpm size` | not run (skipped by instruction) | — The record states 17.86 kB of 25 kB. The reviewer's esbuild estimate is 19.67 kB gzip, also under budget. |
| `pnpm publint` | 0 | Yes |
| `pnpm attw` | 0 | Yes (`./ruler` passes for node16 ESM and bundler) |
| `pnpm audit` | 0 | Yes (no known vulnerabilities) |
| The record's six mutations | not re-run (each would modify source) | — |

*The record's Verification Run is complete, its Status is `Delivered`, and every command re-run exits as recorded.*

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | The bar lies above the edge and the marks run down from it, so the bar covers no mark or number and its ends sit next to the marks they align with. This follows the specification's "beside the ruler's marked edge, so that the marks at its ends can be read". The fixed 352-unit edge satisfies AD-007 and "every unit the same length". The number size meets the CR-005 hazard: 7.96 at 30 cm, and no overlap at either maximum length (tested). The body is sized with `rulerMarksDepth` and `rulerNumberOverhang`, as QR-010 asks. Minor: on two-digit rulers drawn at size 12 (10–24 cm, 10–12 in), the body's right end reaches 385.34, 1.34 units into `SCENE_MARGIN`. It is still inside the drawing. DEL-001 describes this ("or further when a number needs it"). |
| DEL-002 | Reasonable | The ticket offered this option: state the smallest shown width in the component's documentation, or widen the marks. The figure is consistent with the CR-004 estimate, and the JSDoc reaches `dist/ruler.d.ts`. Its reach beyond `<RulerGraph>` is CR-003. |
| DEL-003 | Reasonable | The color is on the bar only, with no outline, as the Known Hazard asks ("not padded by a stroke width"). The default is `accent` and the label uses the text color. All three are tested (`tests/layout/ruler.test.ts:172-180`). |
| Deviation: number size 7.96, not 8.8 | Reasonable | The tests pin the computed value (`tests/layout/ruler.test.ts:136`), and the overlap test covers it. No downstream impact. |
| Deviation: the bundle test also checks consumer bundles of the built entries | Reasonable | This is the right place to see the QR-002 leak. The record's mutation shows it fails without the core annotations. Its name, and the record's Files Produced line, say the kit is excluded, but parts of the kit remain (CR-002). |
| Record note: bar drawn from the raw ends, no test fails | Accepted | The noise allowance is 1e-9 of a mark, so the located mark and the raw end differ far below `fmt()`'s step. The figure and the text alternative agree whichever value is drawn. The test with computed ends (`tests/layout/ruler.test.ts:155-161`) cannot fail, and the record says so plainly. |

## Findings

### CR-001: The published `label` term does not say that the drawing cuts a measured object's label after two lines

**Severity:** Issue
**Location:** `src/core/definitions/shared.ts:113` (`sharedProperties.label.description`). It is published in `src/generated/vocabulary.json` (the new `label` entry), `src/generated/schema.json`, `src/generated/tool-schema.json` and `src/generated/description.ts` (the `measuredObject.label` doc comment). The cut itself is `src/layout/ruler.ts:46` (`LABEL_MAX_LINES = 2`) and `:98`.
**Traces To:**
- The ticket's carried graph-library hazards on every type (`.gener8v/changes/rulers/tickets/number-lines-and-coordinate-graphs/TICKET-003.md:55`). These point to `.gener8v/changes/graph-library/tickets/number-lines-and-coordinate-graphs/TICKET-002.md:87`: "Wrap every label … The cut line ends in "…" … Say so in the label-text descriptions, and keep the full text in the text alternative".
- GSV-REQ-013 (each published term has a plain-English definition).
- Precedent: graph-library DGP TICKET-002 code review CR-001 and DGP TICKET-005 CR-004.

**Description:**
- **First publication.** Registering the ruler publishes the shared `label` term for the first time. The vocabulary diff adds `"label": { "definition": "A label for this one point, segment or measured object, as plain text." }`. No other registered type uses it: its `elementsOf` lists number-line, ruler, xy-graph and xyz-graph, and only the ruler is registered.
- **The cut.** The layout wraps a measured object's label to 240 units at size 14, and cuts it after 2 lines, ending in "…". That is roughly 60 to 70 characters.
- **The other cut texts.** Each says so in its published description:
  - `title`: "In the drawing, a title longer than three lines is cut short with “…”; the text alternative states it whole";
  - `lineLabel`, `categoryAxisLabel` and `valueAxisLabel` say the same for two lines.
- **The gap.** `label` does not.

**Impact:** A curriculum developer or a model working from the published vocabulary, the schema or the tool schema cannot tell that a longer label will be cut in the figure. The text alternative keeps the label whole, so the accessible name is unaffected. The printed worksheet is affected.
**Recommendation:** Do one of the following:
- Add the cut to `sharedProperties.label.description`, worded for the only type that draws it so far. For example: "… as plain text. On a ruler, a label longer than two lines is cut short with “…” in the drawing; the text alternative states it whole." Then run `pnpm generate` and commit the regenerated files. The number line and coordinate graphs (graph-library NLC TICKET-002..004) will widen the wording when they draw the term.
- Or defer to `rulers/graph-specification-and-vocabulary/TICKET-002`, which publishes the ruler's terms, with a Known Hazard there that names this sentence.
- Context for resolution: while this review ran, an uncommitted GSV amendment appeared in the working tree (GSV-REQ-052..054, OQ-009 answered 2026-10-21). It bounds caller text at 200 characters and publishes the bound as `maxLength`. That bound is still longer than two drawn lines, so the sentence is still needed. It can go into the same regeneration as the bound.

**Status:** Fixed
**Resolution:** Fixed (approved by Thomas, 2026-10-21). The shared `label` description (`src/core/definitions/shared.ts`) now ends "In the drawing, a long label is cut short with “…”; the text alternative states it whole." It names no line count, so it stays true for the number line and the coordinate graphs. Regenerated with `pnpm generate`; `tests/layout/ruler.test.ts` checks the sentence.

---

### CR-002: The ruler kit's mark-length table and a few kit and layout constants stay in consumer bundles of every other built entry, and the new test's name says the kit is left out

**Severity:** Observation
**Location:**
- `src/layout/kit/ruler.ts:16-19` (`RULER_MARK_LENGTHS = Object.freeze({…})`, not marked `/* @__PURE__ */`), `:36` (`MAX_COORDINATE = 10 * SCENE_WIDTH`), `:39` (`MAX_FONT_SIZE = 2 * defaultStyle.fontSizes.title`)
- `src/layout/ruler.ts:23-24` (`EDGE_START`, `EDGE_END`)
- `tests/package/per-type-bundle.test.ts:213-231`
- the delivery record's Files Produced line for that test

**Traces To:**
- CPSE-REQ-004, AD-001, prd/TC-007.
- The ticket's Known Hazard from TICKET-002 quality review QR-002 (`TICKET-003.md:77-79`: "so the circle's bundle does not keep them … Build the layout (`src/layout/ruler.ts`) the same way").

**Description:**
- **How the code got there.** Before this delivery nothing imported the ruler kit, so it was not in `dist/`. Registering the layout put both the kit and the layout into the shared chunk `dist/chunk-X4EM4DXU.js`, and every per-type entry imports that chunk.
- **What stays.** The probe bundled `export * from "./dist/circle.js"` minified, with the new test's esbuild options. The bundle keeps:
  - `Object.freeze({centimeters:Object.freeze([20,14,8]),inches:Object.freeze([22,17,13,9.5,6.5])})`;
  - `10*E` and `2*_.fontSizes.title`;
  - `352` and `(E-352)/2`.
- **Size.** That is 169 characters, about 91 B gzip: 17,108 B with these statements and 17,017 B with them cut out. The pictograph, line-graph and bar-graph consumer bundles keep the same statements.
- **Why the test passes.** It looks only for "A ruler", "sixteenth", "drawRulerMarks()" and "rulerLayout()", which all live in code that is dropped. Its name ("its mark rule's tables and its kit") and the record ("exclude the ruler, its mark rule's tables and its kit") claim more.
- **Context.** The other layouts leave similar module constants in other types' bundles: the circle's `CENTER_X` and `OUTLINE_DIRECTIONS`, and the line graph's `TOP_TICK_ROOM`. So this follows an existing pattern, at a size far from the 25 kB budget.

**Impact:** Each other type's bundle carries about 91 B gzip of ruler code, which does not put CPSE-NFR-002 at risk. The test and the record claim more than they prove. A later kit table or constant left in the same way would pass unnoticed.
**Recommendation:** Do one of the following:
- **Fix the leak:**
  - mark `RULER_MARK_LENGTHS` and its two inner `Object.freeze` calls `/* @__PURE__ */`;
  - write `EDGE_START`, `EDGE_END` and the kit's two limits so that a bundler can drop them, for example from literals or inside the functions that use them;
  - add a marker the table leaves behind (for example `9.5,6.5`) to the test's list.
- **Or narrow the claim:** rename the test and correct the record's line to say what it checks.

**Status:** Fixed
**Resolution:** Fixed (approved by Thomas, 2026-10-21). `RULER_MARK_LENGTHS` and its two arrays are `/* @__PURE__ */`. The kit's two limits are now functions (`maxCoordinate()`, `maxFontSize()`), and the layout works out the edge's ends inside `rulerLayout`, because a bundler keeps arithmetic on an imported value. A probe of consumer bundles of the built `./circle`, `./pictograph`, `./line-graph` and `./bar-graph` finds none of the seven statements; `./circle` went from 16.45 to 16.39 kB. The built-entry test also looks for the mark lengths ("9.5,6.5"), and fails with the table unmarked.

---

### CR-003: The 330 px minimum width from DEL-002 is stated only on `<RulerGraph>`, and no downstream ticket carries it

**Severity:** Observation
**Location:**
- `src/react/graphs/RulerGraph.tsx:11-13`
- delivery record DEL-002
- `src/react/Graph.tsx:9-20` and `src/core/definitions/ruler.ts:212` (the published type description): neither mentions the limit
- `.gener8v/changes/graph-library/tickets/component-packaging-and-source-export/TICKET-008.md` and `.gener8v/changes/rulers/tickets/number-lines-and-coordinate-graphs/TICKET-004.md`: no Known Hazard for it

**Traces To:**
- prd/CC-002 (WCAG 1.4.11).
- The ticket's Known Hazard from NLC TICKET-001 code review CR-004 (`TICKET-003.md:60-63`: state the smallest shown width at which the marks keep 3:1 in the component's documentation, and record the choice in a DEL).
- CPSE-REQ-044 (documentation for every graph type).

**Description:**
- **What DEL-002 does.** It meets the hazard as written. The JSDoc reaches `dist/ruler.d.ts`, the figure is sound, and the choice is recorded.
- **Where the limit is missing.** A ruler can also be drawn through `<Graph>` and `createGraph`, and later through the tool and source export. None of these mention the limit, and neither does the published `ruler` type description.
- **Downstream tickets.** The record's Notes hand TICKET-004 only the NFRs. Neither TICKET-004 nor CPSE TICKET-008 has a Known Hazard carrying the limit:
  - TICKET-004 runs the accessibility check for NLC-NFR-007;
  - CPSE TICKET-008 is the documentation site, which will document every type.

**Impact:** The limit lives in one JSDoc comment and in the delivery record. The documentation site may describe rulers without it. A `<Graph>` user may show a 30 cm ruler at 300 px, where the millimetre marks render under 3:1.
**Recommendation:**
- Add a Known Hazard to `graph-library/component-packaging-and-source-export/TICKET-008`: state the 330 px minimum on the ruler's documentation page.
- Add one to `rulers/number-lines-and-coordinate-graphs/TICKET-004`: its accessibility check should state, or test against, the shown-width assumption.
- Optionally, add one sentence to the ruler type's description, so the published vocabulary and the tool schema carry it too.

**Status:** Deferred → rulers/number-lines-and-coordinate-graphs/TICKET-004, graph-library/component-packaging-and-source-export/TICKET-008
**Resolution:** Deferred with Known Hazards (approved by Thomas, 2026-10-21): TICKET-004 states the 330 px minimum with the ruler's accessibility results, and CPSE TICKET-008 states it on the ruler's documentation page and beside its example, for `<RulerGraph>` and `<Graph>`.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Fixed | The shared `label` description says a long label is cut in the drawing; regenerated; tested | `src/core/definitions/shared.ts`, `src/generated/*`, `tests/fixtures/generated/description.ts`, `tests/layout/ruler.test.ts` |
| CR-002 | Fixed | Kit table marked pure; kit limits and the layout's edge ends no longer module-level arithmetic; built-entry test checks the mark lengths | `src/layout/kit/ruler.ts`, `src/layout/ruler.ts`, `tests/package/per-type-bundle.test.ts` |
| CR-003 | Deferred | Known Hazards appended | `.gener8v/changes/rulers/tickets/number-lines-and-coordinate-graphs/TICKET-004.md`, `.gener8v/changes/graph-library/tickets/component-packaging-and-source-export/TICKET-008.md` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (CR-001 and CR-002 fixed; CR-003 deferred with Known Hazards on rulers NLC TICKET-004 and graph-library CPSE TICKET-008)
**Notes:**
- **Final verdict** written in the main session on 2026-10-21, after resolution with the Engineer. Re-verification: `pnpm generate`, `lint`, `typecheck`, `build`, `check:dist`, `check:deps`, `check:images`, `size` (`./ruler` 17.86 kB, `./circle` 16.39 kB), `publint`, `attw`, `bench` and `audit` exit 0; `pnpm test` passes 1,371 tests on three runs.
- **No Critical finding:** every acceptance criterion is satisfied, every requirement is covered and annotated, and the Verification Run reproduces. CR-001 should be fixed here or deferred, with a Known Hazard, to `rulers/graph-specification-and-vocabulary/TICKET-002`. CR-002 and CR-003 do not block.
- **Out of scope, noticed while probing CR-002:** a minified consumer bundle of every built entry (`./ruler`, `./circle`, `./pictograph`, `./line-graph`, `./bar-graph`) contains the circle's definition ("A circle drawn to scale …").
  - Cause: `src/core/definitions/circle.ts:102` is a plain object literal with `defineProperties(…)` calls, not a `/* @__PURE__ */` factory like the other definitions. TICKET-002 quality review QR-002 noted this pattern.
  - Why no test fails: the source-bundle tests do not see it, and the new built-entry test checks only ruler strings.
  - The claim at risk: `RulerGraph`'s JSDoc says "importing it brings in no other graph type", which is true of the source bundle but not of the built package.
  - This predates the ruler and belongs in its own graph-library ticket.
- **Not re-run:**
  - `pnpm generate` and `pnpm size`, by instruction (the generated files were checked in memory instead);
  - the record's six mutations, which would modify source.
