# TICKET-003: Deliver the ruler: layout, component and entry point — Quality Review

## Summary

I reviewed the ruler's layout, component and entry point as they stand at HEAD (`dcce9d6`, after the code review was resolved; delivery `5e28148`). The layout is one well-organised file in the shape of the circle, bar graph and pictograph layouts. It draws through the ruler kit rather than re-deriving the marks, names every number it uses, and gives the reason for each choice. Lint, typecheck, build, `check:dist`, `publint`, `attw` and `bench` pass, and the full suite passes (1,371 tests). A probe of all 540 combinations of unit, length, division, title and label found no overlap and nothing outside the drawing. The findings are about what the tests leave unguarded:
- every neighbouring layout pins its geometry with a property, but the ruler checks bounds and overlaps only at fixed examples. Removing the label's right-hand clamp passes all 24 ruler tests and draws the label out to x = 481.83 on a 400-unit drawing (QR-001);
- the test file re-implements helpers that `tests/fixtures/scene-geometry.ts` already provides for layout tests (QR-002);
- the rule that each end is drawn at its located mark is written twice, once in the layout and once in `describe` (QR-003);
- test details: a skewed property generator, two names that claim more than they check, and the layout's own `RangeError` untested (QR-004);
- the per-type bundle test now has three copies of its consumer-build options (QR-005).

There are 5 findings: 0 Critical, 1 Concern and 4 Suggestions.

**Reviewer:** `quality-reviewer` agent, fresh context (findings phase only, 2026-10-21)
**Delivery Record:** `.gener8v/changes/rulers/delivery/number-lines-and-coordinate-graphs-ticket-003-delivery.md` (DEL-001 to DEL-003, and the Post-Review Amendments from the code review)
**Code review read first:** `.gener8v/changes/rulers/reviews/number-lines-and-coordinate-graphs-ticket-003-code-review.md` (Approved). Its CR-001 to CR-003 are not raised again, and neither is the out-of-scope circle-definition leak it noted. It accepted the record's note that the computed-ends test cannot fail. QR-003 is about the duplicated rule behind that test, not the test itself.

**Files Reviewed:**
- `src/layout/ruler.ts`
- `src/react/graphs/RulerGraph.tsx`
- `src/entries/ruler.ts`
- `src/layout/kit/ruler.ts` (the `/* @__PURE__ */` table and the `maxCoordinate()` and `maxFontSize()` functions from CR-002)
- `src/core/ruler.ts` (the `/* @__PURE__ */` tables)
- `src/core/definitions/shared.ts` (the `label` description, from CR-001)
- `src/layout/registry.ts`, `src/core/definitions/index.ts`, `src/index.ts`, `package.json`, `tsup.config.ts`, `.size-limit.json`
- `tests/layout/ruler.test.ts`
- `tests/react/Graph.test.tsx` (the ruler's accessible name, display name and 500 KB text test)
- `tests/package/per-type-bundle.test.ts` (the two ruler tests)
- `tests/core/definitions.test.ts` (the explicit ruler lists removed)
- `tests/fixtures/generated/description.ts`
- Read for pattern consistency, not changed here:
  - `src/layout/circle.ts`, `src/layout/bar-graph.ts`, `src/layout/pictograph.ts`;
  - `src/layout/kit/title.ts`, `labels.ts`, `text.ts`, `src/core/definitions/ruler.ts` (`describe`), `src/graph.ts` (`createGraphWith`);
  - `src/react/graphs/CircleGraph.tsx`, `src/entries/circle.ts`, `src/entries/bar-graph.ts`;
  - `tests/layout/circle.test.ts`, `bar-graph.test.ts`, `pictograph.test.ts`, `line-graph.test.ts`, `tests/layout/kit/ruler.test.ts`, `tests/fixtures/scene-geometry.ts`.

**Findings:** 5
**Critical:** 0 | **Concerns:** 1 | **Suggestions:** 4

## Quality Assessment

### Code Organization

**Rating:** Strong
**Notes:**
- **The layout.** `src/layout/ruler.ts` holds one layout, one exported sizing function (`rulerFontSize`), a local `rect` helper and named constants, in the order the circle and pictograph layouts use: constants, helpers, then the layout.
- **The kit does the drawing.** Marks and numbers come from `drawRulerMarks`, and the body is sized from `rulerMarksDepth` and `rulerNumberOverhang`. The layout never recomputes the kit's spacing (NLC TICKET-001 QR-010).
- **Imports run one way:** the layout imports from `src/core` and `src/layout/kit`, and only the component imports the layout.
- **Component and entry.** `RulerGraph.tsx` and `src/entries/ruler.ts` match `CircleGraph.tsx` and `src/entries/circle.ts` line for line.
- **Registration** is one line in each table. `tests/core/definitions.test.ts` drops the explicit ruler lists now that `allDefinitions()` covers the ruler, which is good housekeeping.
- **Exports for tests.** The layout exports `RULER_EDGE`, `BAR_HEIGHT` and `LABEL_MAX_LINES` so its tests can use them, as `circle.ts` exports `DRAWN_RADIUS` and `LABEL_MAX_LINES`.
- **The one gap** is a rule written in two modules (QR-003).

### Readability

**Rating:** Strong
**Notes:**
- **Constants.** Every number has a name and a one-line reason: `BODY_END_CLEARANCE`, `BODY_END_INSET`, `BODY_BOTTOM_PAD`, `NUMBER_SPACE`, `BAR_GAP`, `LABEL_GAP`, `LABEL_MAX_WIDTH`.
- **Length and shape.** `rulerLayout` is 73 lines. It reads top to bottom in drawing order: title, label measure, bar and edge rows, body, marks, bar, label. The circle's layout is 115 lines, and the pictograph's about 80.
- **Doc comments** state the layout's order, the CR-003 rule for computed ends, the colour rule (DEL-003) and NLC-REQ-055.
- **Comments say why.** The `Math.max(...)` loop comment explains the spread rule. The CR-002 comment says why the edge's ends are computed inside the function.
- **Unreachable fallback, documented.** The label's three candidates and its fallback can never be chosen beyond the first: the band above the bar holds nothing else. The comment at `src/layout/ruler.ts:142-143` says so. That keeps AD-010's "placed by `placeLabel`" true at the cost of a few lines, so it is not raised.

### Error Handling

**Rating:** Adequate
**Notes:**
- **Fails closed.** The layout throws `RangeError("rulerLayout(): the description is not a validated ruler")` when `rulerScale` refuses the ruler (`src/layout/ruler.ts:86`). `createGraphWith` turns that into the fixed `internal_error` (`src/graph.ts:42-46`). This follows the kit's style (NLC TICKET-001 QR-008). It is the only layout that throws on its own, and the throw is untested (QR-004).
- **Non-mark ends.** `xOf` draws the raw value for an end that is not on a mark (`src/layout/ruler.ts:126-129`). Validation rejects such ends (`endOnMark`), and `describe` makes the same fallback, so the figure and the text alternative agree for any input. The two copies are QR-003.
- **Kit limits.** `maxCoordinate()` and `maxFontSize()` (CR-002) keep their refusal messages unchanged, and `tests/layout/kit/ruler.test.ts` still pins them.

### Test Coverage

**Rating:** Adequate
**Notes:**
- **Commands run** (from `context.md`'s `## Repositories` row for `.`: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`, plus the delivery record's package checks):

  | Command | Exit | Result |
  |---------|------|--------|
  | `pnpm lint` | 0 | no problems |
  | `pnpm typecheck` | 0 | no errors |
  | `pnpm test`, run as `npx vitest run --no-cache` | 0 | 49 files and 1,371 tests passed; the known timing tests did not flake |
  | `pnpm build` | 0 | `dist/ruler.js`, `dist/ruler.d.ts` |
  | `pnpm check:dist` | 0 | 16 built files, no network APIs |
  | `pnpm publint` | 0 | "All good!" |
  | `pnpm attw` | 0 | `@gener8v/graph-generator/ruler` resolves |
  | `pnpm bench` | 0 | GSV-NFR-001 ruler validation p95 0.0192 ms over 16,536 runs |

- **Not run, by instruction:** `pnpm generate` and `pnpm size`.
- **What the tests cover:**
  - `tests/layout/ruler.test.ts` holds 24 tests, counting each `it.each` row. They pin:
    - mark counts and lengths at 15 cm, at 6 in in sixteenths and in quarters, and the grading order;
    - equal units and the edge's ends at 1, 7 and 30 cm and at 1 and 12 in;
    - number spacing at both maximum lengths, and `rulerFontSize` at 12, 15 and 30;
    - the bar's ends, including computed ends, the bar's place above the edge, its colour, the label's cut and placement, and a blank label;
    - a fast-check property over 200 rulers (text content and bar ends);
    - the parts with no object, the title, and the text alternative.
  - `tests/react/Graph.test.tsx` adds the accessible name through both components, the caller's text alternative, the display name and a 500 KB label and title.
  - `tests/package/per-type-bundle.test.ts` adds the ruler's source bundles and consumer bundles of the four other built entries.
- **Quality:** the tests assert on Scene data and markup, not on internals, and their names mostly describe behaviour. The property's text check is a good way to pin NLC-REQ-055.
- **Mutations.** Each was run on a copy of `src/layout/ruler.ts` in the scratchpad, never on the file. A vitest config in the scratchpad aliased the test's import of the layout to the copy, so the source tree was never modified.
  - Control: the label's line limit raised to 3. It is killed, failing 1 of 24 tests, which shows the alias works.
  - The label's right-hand clamp removed. It survives all 24 tests (QR-001).
- **Gaps:** geometry is checked at fixed examples only (QR-001). The file duplicates the shared geometry fixture (QR-002), and has smaller details (QR-004). The bundle test duplicates its build options (QR-005).

### Observability & Operability

**Rating:** Adequate
**Notes:**
- **No logger, by design.** The package is a pure rendering library with no logger anywhere in `src/` (`grep -rn "console\." src/` finds nothing), so none is expected here.
- **Error surface.** A layout fault is one `internal_error` from `createGraph`. Its message and stack never reach the caller (GSV TICKET-002 SEC-003). Called directly, the layout's own `RangeError` names the function ("rulerLayout(): …"), as the kit's do.
- **Documented limits.** `RulerGraph`'s JSDoc states the 330 px shown-width limit (DEL-002), and its reach was handled in CR-003.
- **Performance, in context:**
  - A 30 cm ruler with a title and a labelled object lays out at a p50 of 0.054 ms (p95 0.135 ms, 336 nodes). A 12 in ruler takes 0.038 ms.
  - With 500 KB of label or title the layout takes about 230 to 275 ms. Most of that is `describe` (about 155 ms) and `cleanText` (about 76 ms), because the text alternative states the text whole.
  - The circle and the bar graph take about 250 ms with a 500 KB title, so this is shared by every type.
  - GSV-REQ-052 (amended 2026-10-21, OQ-009) bounds caller text at 200 characters. Not raised.
- Nothing to flag.

## Findings

### QR-001: The ruler's geometry is checked only at fixed examples: removing the label's right-hand clamp passes all 24 tests and draws the label past the drawing's edge

**Category:** Testing
**Severity:** Concern
**Location:** `src/layout/ruler.ts:135` (`inside`, the clamp); `tests/layout/ruler.test.ts:183-196` (the one label-placement test), `tests/layout/ruler.test.ts:208-256` (the property, which checks text and bar ends only), `tests/layout/ruler.test.ts:276-284` (the bounds test, which checks the body only). Compare `tests/layout/bar-graph.test.ts:305-323` and `:345-358`, `tests/layout/pictograph.test.ts:227-244` and `:268-283`, `tests/layout/line-graph.test.ts:227-243` and `:282-292`, and `tests/layout/circle.test.ts:267-311`.
**Description:**
- **The pattern.** Every other layout test pins its geometry with a fast-check property. Each checks, over generated descriptions, that every node is inside the drawing and that no text overlaps other text or the figure. The bar graph, line graph and pictograph use `geometryProblems`, and the circle uses `overlaps` plus bounds (GSS-NFR-003; DGP TICKET-005 QR-001).
- **What the ruler has instead.** Pairwise checks at fixed examples:
  - numbers against their neighbours at 30 cm and 12 in;
  - numbers against the bar on one 10 cm ruler;
  - one long label against the bar, the numbers and the title, on a 30 cm ruler whose object is at 0–0.5;
  - the body's outline inside the drawing, in three rulers.
  - The property builds 200 random scenes, with objects anywhere and labels up to two lines, but asserts only text content and bar ends.
- **The surviving mutation.** In a copy of the layout, `inside` became `(x) => Math.max(x, SCENE_MARGIN)`, which drops the right-hand bound.
  - All 24 tests in `tests/layout/ruler.test.ts` pass. A control mutation on the same copy (label line limit 3) fails one, so the copy was the code under test.
  - With the mutant, a 30 cm ruler whose object runs 29–30, labelled "a long piece of string to measure", draws its label from x 258.43 to 481.83. The delivered layout draws it from 160.60 to 384.00.
  - The property generates this kind of case (the long label over the right quarter of the ruler) in about 2.5% of runs, so about 5 of its 200. It never checks where the label landed.
- **The code is right today.** A probe of all 540 combinations of unit, length, division, a 6-line title and three labels found no overlap and nothing outside the drawing. The gap is in what the suite would catch next time.

**Impact:**
- The ruler's layout code that a caller's input moves around is the label's horizontal placement. It is the least-guarded part of the layout.
- A regression that lets a label run off the right edge would ship. So would one that crowds the label into the title at some title and label combination, or that lets two numbers touch at a length other than 30 or 12.
- The other four layouts would catch the same class of fault.

**Recommendation:**
- Add a `geometryProblems(scene)` check to the existing property (`tests/layout/ruler.test.ts:235-255`), built on `tests/fixtures/scene-geometry.ts` (`boundsOf`, `overlap`, `nameOf`; see QR-002). It should check:
  - every node inside the drawing, and every text inside the margins;
  - no text overlapping other text, the bar or a mark;
  - no mark under the bar.
- Widen the property's inputs: titles of up to three lines, and a label long enough to be cut.
- Add one example that pins the right-hand clamp: a 30 cm ruler, object 29–30, a label wider than half the drawing, with the label's right edge at most `SCENE_WIDTH - SCENE_MARGIN`.

**Status:** Fixed
**Resolution:** Fixed (approved by Thomas, 2026-10-21). A fast-check property over 300 generated rulers, with and without objects, labels and titles, checks that every node lies inside the drawing (`outside`) and that no title or label line overlaps the bar, the body, a number or another line, and no number overlaps another (`collisions`). Removing the right-hand clamp, the left-hand clamp or both now fails it.

---

### QR-002: The ruler's layout test re-implements the geometry helpers that `tests/fixtures/scene-geometry.ts` provides, and uses `placeLabel` as its overlap check

**Category:** DRY
**Severity:** Suggestion
**Location:** `tests/layout/ruler.test.ts:30-31` (`attr`, `num`), `tests/layout/ruler.test.ts:45-55` (`boxOf`, `rectBox`, `overlap`); compare `tests/fixtures/scene-geometry.ts:18` (`attr`), `:41` (`boundsOf`), `:87-88` (`overlap`), `:91-92` (`nameOf`), imported by `tests/layout/bar-graph.test.ts:13`, `tests/layout/line-graph.test.ts:13` and `tests/layout/pictograph.test.ts:12`.
**Description:**
- **The fixture.** `tests/fixtures/scene-geometry.ts` exists "for the layout tests' bounds and overlap checks" (DGP TICKET-005 QR-001; DGP TICKET-002 moved the helpers there). It gives one bounding box for every node kind, with stroke widths and rotated text, and an overlap test with the 0.02 rounding tolerance. The three most recent layout tests use it.
- **The ruler test's copies.** It defines its own `attr` and `num`, a `boxOf` that rebuilds the text box from the baseline rule in `textLines`, a `rectBox`, and `overlap = (a, b) => placeLabel(a, [a], [b]) === undefined`. These follow the older circle test (`tests/layout/circle.test.ts:30-76`).
- **Two text-box rules.** The baseline rule ("0.8 of the font size below the line's top") is now written in the fixture, in the circle test and in the ruler test.
- **A production oracle.** The overlap check runs through `placeLabel`, the function the layout uses to place the label. A fault in `placeLabel`'s box test would make the layout and its test agree.

**Impact:** A change to how `textLines` places a baseline must be made in three test files, and the ruler's would be the easiest to miss. It is also harder to add the geometry check QR-001 asks for without the fixture's `boundsOf` for lines and rects.
**Recommendation:**
- Import `attr`, `boundsOf`, `overlap` and `nameOf` from `tests/fixtures/scene-geometry.ts`, and drop the local `attr`, `boxOf`, `rectBox` and `overlap`.
- The local `boxOf` checks the line box the layout reserves (1.2 × the size), not the glyph box. If that stricter check is wanted, add it to the fixture as a second function rather than keeping a copy here.

**Status:** Fixed
**Resolution:** Fixed (approved by Thomas, 2026-10-21). `tests/layout/ruler.test.ts` uses `attr`, `boundsOf`, `overlap` and `nameOf` from `tests/fixtures/scene-geometry.ts`; its own `attr`, `boxOf`, `rectBox` and `placeLabel`-based `overlap` are gone.

---

### QR-003: "Draw each end at its located mark" is written twice, in the layout and in `describe`, so the figure and the text alternative agree only by parallel code

**Category:** DRY
**Severity:** Suggestion
**Location:** `src/layout/ruler.ts:126-129` (`xOf`: `location.kind === "mark" ? location.value : value`), `src/core/definitions/ruler.ts:236-239` (`describe`'s `mark`: `location?.kind === "mark" ? location.value : value`); `tests/layout/ruler.test.ts:156-162`
**Description:**
- **Two copies.** Both modules locate an end with `rulerScale(…).locate` and use the located mark's value, or else the raw value. That is how a computed 0.1 + 0.2 is drawn at, and called, the 3 mm mark (NLC TICKET-002 code review CR-003, carried as a Known Hazard to this ticket).
- **Held by convention only.** The layout's doc comment says the bar's ends are drawn "as the text alternative states it". Nothing ties the two copies together.
- **Not testable in the drawing.** The snap moves an end by at most 1e-9 of a mark, far below `fmt()`'s 0.01 step. The record's mutation, which drew from the raw ends, fails no test, and the code review accepted that this cannot be seen in the drawing. A rule that cannot be tested where it is used should be tested where it is defined.

**Impact:** A change to one copy, for example rounding the raw fallback or treating an end between marks differently, would drift from the other without a failing test. The drawing cannot show the difference, and `describe`'s tests pin only the text.
**Recommendation:**
- Give the rule one home in `src/core/ruler.ts`, beside `locate`. For example, add `markValueOf(scale, value)`, or a `RulerScale.markValue(value)`, that returns the located mark's value or the value itself.
- Use it in `describe` and in `xOf`.
- Unit-test it at full precision in `tests/core/ruler.test.ts`, where the noise is visible: 0.1 + 0.2 gives exactly 0.3, and 0.1 × 3 × 100 gives exactly 30.

**Status:** Fixed
**Resolution:** Fixed (approved by Thomas, 2026-10-21). `locatedValue(scale, value)` in `src/core/ruler.ts` is the one rule; `rulerLayout` and `describe` both call it. `tests/core/ruler.test.ts` tests it at full precision (0.1 + 0.2 is exactly 0.3, 30.000000000000004 is 30, −2.8e-17 is 0), and returning the raw value fails it.

---

### QR-004: Test details: the property's generator skews inch rulers to 12 in and almost never ends an object at the ruler's end, two names claim more than they check, and the layout's own `RangeError` is untested

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/layout/ruler.test.ts:213` and `:220` (length), `:223-225` (end index), `:142-146` (`barEnds`' doc comment), `:276-284` ("keeps everything inside the drawing, which is as tall as the ruler needs"); `src/layout/ruler.ts:86`
**Description:**
- **Length skew.** The property draws `length` from 1 to 30 for both units, then cuts inch rulers to `Math.min(length, 12)`. In a 4,000-sample draw of the same generator (seed 42), 57% of inch rulers were 12 in long, which leaves inch lengths 1 to 11 about a third of the inch cases.
- **End skew.** Both indices are taken modulo `count - 1`. The end is the last mark only when both land on the second-last mark, which happened in 0.3% of samples, so about 0.6 of the property's 200 runs. An object ending on the ruler's end is pinned only by the 0–10 and 0–30 examples.
- **Stale doc comment.** `barEnds` says "for a ruler `description` whose object runs from `start` to `end`", but it takes only a scene.
- **Overclaiming name.** "keeps everything inside the drawing, which is as tall as the ruler needs" checks only the body's outline: its left and right ends, and its bottom above the drawing's bottom. It checks neither the label nor the title, nor that the drawing is no taller than needed. QR-001's property would cover "everything".
- **Untested throw.** The layout's `RangeError` for a ruler `rulerScale` refuses has no test. Its comment promises "a layout bug fails closed as `internal_error`". The kit's refusals are pinned by 16 `toThrow` assertions in `tests/layout/kit/ruler.test.ts:219-291`.

**Impact:** Each detail is small. Together they mean the property tests fewer inch lengths, and fewer objects ending on the ruler's end, than it seems to. Two test names promise more than the tests check, and the one documented error path in the layout has no test.
**Recommendation:**
- Draw the length per unit, for example `fc.constantFrom("centimeters", "inches").chain((unit) => fc.record({ unit: fc.constant(unit), length: fc.integer({ min: 1, max: RULER_MAX_LENGTH[unit] }), … }))`.
- Draw the end index from `i + 1` to `count - 1`, so the ruler's end is as likely as any other mark.
- Fix `barEnds`' doc comment ("The bar's two ends, as drawn").
- Rename the bounds test to "keeps the body inside the drawing", or fold it into QR-001's property.
- Add `expect(() => rulerLayout({ type: "ruler", rulerUnit: "centimeters", length: 31 } as Ruler, provenance)).toThrow(/^rulerLayout\(\): /)`.

**Status:** Fixed
**Resolution:** Fixed (approved by Thomas, 2026-10-21). The generators draw each unit's lengths evenly (1 to 30 cm, 1 to 12 in) and pick each end as the first mark, the last mark or any mark; labels include a 2-line cut and a 400-character word, titles a 3-line one. `barEnds`' comment is corrected. The inside test checks every node, not only the body. A test checks the layout's `RangeError` on a 31 cm ruler.

---

### QR-005: The per-type bundle test now has three copies of its consumer-build options

**Category:** DRY
**Severity:** Suggestion
**Location:** `tests/package/per-type-bundle.test.ts:113-123`, `:167-177`, `:218-228` (the third, added here); compare `bundle()` at `:59-74`
**Description:**
- **Three copies.** Each test that bundles a built entry as a consumer would repeats the same 10-line `build({ stdin: { … "./dist/…" … }, bundle, write, format, platform, treeShaking, minify, external, logLevel })` call. This ticket's QR-002 test adds the third copy.
- **The source side has a helper.** `bundle(entry)` already serves the source bundles.
- **The options matter.** These options are what the tests claim matches `pnpm size` ("as `pnpm size` measures it", `:111-112`). CR-002's probe used the same options.

**Impact:** A change to the consumer model, such as `platform: "browser"` or a new external, must be made in three places. A copy left behind would test a different bundle from the one the comment describes.
**Recommendation:** Add `async function consumerBundle(built: string): Promise<string>` beside `bundle()` and use it in all three tests. The ruler test's loop then becomes `const code = await consumerBundle(built);`.

**Status:** Fixed
**Resolution:** Fixed (approved by Thomas, 2026-10-21). `consumerBundle(entry)` beside `bundle()` holds the options once, and the three built-entry checks use it.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fixed | Bounds and overlap property over 300 generated rulers | `tests/layout/ruler.test.ts` |
| QR-002 | Fixed | Shared scene-geometry helpers | `tests/layout/ruler.test.ts` |
| QR-003 | Fixed | `locatedValue` shared by layout and `describe`, tested at full precision | `src/core/ruler.ts`, `src/layout/ruler.ts`, `src/core/definitions/ruler.ts`, `tests/core/ruler.test.ts` |
| QR-004 | Fixed | Even lengths, ends at 0 and the last mark, comment, every-node inside test, `RangeError` test | `tests/layout/ruler.test.ts` |
| QR-005 | Fixed | `consumerBundle` helper | `tests/package/per-type-bundle.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (QR-001..005 fixed)
**Notes:**
- **Final verdict** written in the main session on 2026-10-21, after resolution with the Engineer. Re-verification: `pnpm generate` (no change), `lint`, `typecheck`, `build`, `check:dist`, `check:deps`, `check:images`, `size` (`./ruler` 17.87 kB, `./circle` 16.39 kB), `publint`, `attw`, `bench` and `audit` exit 0; `pnpm test` passes 1,375 tests on three runs. Mutations: each label clamp removed fails the new property; `locatedValue` returning the raw value fails the mark rule's test.
- **No Critical finding.** Every acceptance criterion has a test, and every command re-run exits 0.
- **QR-001** was the one to settle before merge (findings phase); it is fixed here rather than deferred to TICKET-004.
- **Scratch files** (the mutated copies, the vitest config and the command logs) are under `/private/tmp/claude-501/-Users-thomas-Repositories-gener8v-gener8v-tools-education-graph-generator/90a37181-7c56-4f53-87c3-a87caf6952a9/scratchpad/quality-review-003/`.
