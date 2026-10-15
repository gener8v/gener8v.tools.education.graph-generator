# TICKET-005: Pictograph — Quality Review

## Summary

I reviewed the pictograph at HEAD (`3683daa`): delivery commit `b877264` plus the code-review fixes for CR-001 to CR-008. The definition, validator change, component and entry are well built and their behaviour is well pinned: six of seven mutations to the core side fail a test. Lint, typecheck, the full suite (35 files, 945 tests), build, size, the dist and image checks, and the bench all pass.

The findings are about the drawing and one text path:
- the layout's geometry is unpinned: all 16 placement mutations pass the suite, including a key drawn outside the drawing;
- in columns, ordinary category names are split mid-word ("Wednesda" / "y" with five weekdays), and names overlap from about 20 categories;
- the text alternative repeats the unit label after every value, so a 0.5 MB description yields a 50.5 MB text alternative and takes 16.7 s in `createGraph`.

There are 7 findings: 0 Critical, 3 Concerns and 4 Suggestions.

**Reviewer:** `quality-reviewer` agent, fresh context (findings phase only, 2026-10-15)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/data-graphs-and-pictographs-ticket-005-delivery.md` (DEL-001..005, Post-Review Amendments CR-001..008)
**Code review read first:** `.gener8v/changes/graph-library/reviews/data-graphs-and-pictographs-ticket-005-code-review.md` (Approved, all eight resolved). None of its findings is raised again. Two findings here touch its resolutions:
- QR-004 is about the mechanism CR-002's fix introduced (an empty `inputs` list), not the behaviour CR-002 fixed.
- QR-005 is about a second copy of the counting rule that CR-001's cap relies on.

**Files Reviewed:**
- `src/core/definitions/pictograph.ts`
- `src/core/definitions/index.ts`
- `src/core/definitions/types.ts` (`EnumValue.unknownCode`, `DomainCheck.inputs`)
- `src/core/definitions/categories.ts` (`valueUnitLabel` description)
- `src/core/validate/structure.ts` (`checkValue`, `enum` branch)
- `src/core/issues.ts` (`unknown_image`, `too_large`)
- `src/layout/pictograph.ts`
- `src/layout/registry.ts`
- `src/react/graphs/PictographGraph.tsx`
- `src/entries/pictograph.ts`, `src/index.ts`
- `package.json`, `tsup.config.ts`, `.size-limit.json`
- `examples/pictograph.json`, `examples/invalid/pictograph-unknown-image.json`, `examples/invalid/pictograph-zero-unit.json`
- `src/generated/description.ts` (pictograph branch)
- `tests/core/pictograph.test.ts`, `tests/layout/pictograph.test.ts`
- `tests/react/Graph.test.tsx`, `tests/package/per-type-bundle.test.ts` (the pictograph cases)
- Read for pattern consistency, unchanged here:
  - `src/layout/circle.ts`, `src/layout/scene.ts`, `src/react/SceneSvg.tsx`, `src/react/graphs/CircleGraph.tsx`, `src/entries/circle.ts`;
  - `src/layout/kit/value-scale.ts`, `title.ts`, `text.ts`, `check.ts`;
  - `src/core/definitions/circle.ts`, `src/core/value-scale.ts` (`intervalsIn`), `src/core/format.ts` (`cleanText`, `quoteText`, `stateMeasurement`);
  - `src/core/validate/domain.ts`, `state.ts`, `suggest.ts`;
  - `tests/layout/circle.test.ts`, `tests/core/definitions.test.ts`, `tests/core/validate-domain.test.ts`;
  - `eslint.config.js`, `tsconfig.json`, `vitest.config.ts`;
  - `.gener8v/specifications/data-graphs-and-pictographs.md`, and DGP `TICKET-002.md` and `TICKET-003.md` (the next users of the category kit and the length check).

**Findings:** 7
**Critical:** 0 | **Concerns:** 3 | **Suggestions:** 4

## Quality Assessment

### Code Organization

**Rating:** Adequate
**Notes:**
- **The type follows the circle's shape:**
  - a definition (`src/core/definitions/pictograph.ts`), a layout (`src/layout/pictograph.ts`), a one-line component and an entry;
  - each registered beside the circle's.
  - The text alternative comes from the definition's own `describe`, and the key and the text alternative share `unitLabelOf()` (CR-003).
- **The bundling work is careful and pinned.**
  - The side-effect-free factory (`definePictograph`, DEL-002) keeps the drawings out of `./circle`.
  - Three bundle tests pin it, one of them a consumer's bundle of the built `dist/circle.js`.
  - `pnpm size`: `./pictograph` 17.2 kB of 25 kB.
- **The validator change is small and documented.** `EnumValue.unknownCode` is a single-literal option that keeps one enum feeding the validator, both schemas and the vocabulary (DEL-004).
- **Dependency direction:** the layout imports core, the image set and the kit. Core's import of `fmt()` through the images is DEL-002, accepted with the plan.
- **Weak spots:**
  - The rows layout leans on the kit's private geometry: it restates `LABEL_GAP` as a literal `4` and calls `categorySlots` twice (QR-006).
  - The rule "a remainder draws one more picture" is written twice, once in core and once in the layout (QR-005).
  - The one-value-per-category check is written inline, although the bar graph needs the same check (QR-004).

### Readability

**Rating:** Adequate
**Notes:**
- **Names say what things are:** `imageCount`, `partialPicture`, `categoryPictures`, `gridStep`, `unitLabelOf`, `MIN_PARTIAL`, `KEY_MAX_LINES`.
- **The doc comments explain why** and cite the decision behind each rule (AD-008, DEL-005, CR-001), in the codebase's style.
- **`partialPicture` (`src/layout/pictograph.ts:49-79`) is the clearest part.** It says which part each orientation keeps and why the `viewBox` share comes from the drawn width.
- **`pictographLayout` (`:126-208`) is 83 lines:** a rows branch, a columns branch and the key. That is comparable with `circleLayout` (115 lines). Within it:
  - `box0` is a weak name;
  - the probe call with a placeholder box height (`:145`) needs a re-read (QR-006);
  - `categoryPictures` takes a `step` it never uses (QR-005).
- **Not findings:**
  - The layout uses "image" for the asset and "picture" for a drawn copy. Core exports `imageCount` and `PICTOGRAPH_IMAGE_LIMIT` and uses the issue unit `"images"` for what the messages call pictures. The split is defensible, but it is not stated anywhere.
  - Because the component is called `Pictograph` (DEL-003, settled), it shares a name with the normalized-description interface `Pictograph` (`src/core/definitions/pictograph.ts:10`), and `tests/react/Graph.test.tsx` imports it as `PackagePictograph`.

### Error Handling

**Rating:** Adequate
**Notes:**
- **Description problems are reported, never thrown.** Each is a typed issue at a JSON Pointer:
  - a `unitValue` of 0 or less is `out_of_range` at `/unitValue`, and a negative value is reported at `/values/<i>`;
  - an unpublished `unitImage` is `unknown_image`, with `allowed` and a `closestTerm` suggestion, and a non-text value is still `wrong_kind`;
  - the picture cap is counted arithmetically before anything is drawn: `values: [1e9, 1e9], unitValue: 1e-300` is reported in well under a millisecond;
  - the length mismatch no longer hides behind an element failure (CR-002).
- **The layout assumes a validated description, as the circle's does.** Its numbers go through `fmt()`, which throws `RangeError` on a non-finite value, so a package defect becomes `internal_error` in `createGraph` instead of bad markup. A partial picture is never drawn 0 wide (CR-001).
- **Gaps:**
  - When the picture count overflows, the `too_large` message prints a sentinel count, and for huge counts it prints exponent form (QR-007).
  - The always-run contract of an empty `inputs` list rests on a cast inside one check, and the domain stage has no test for it (QR-004).

### Test Coverage

**Rating:** Adequate
**Notes:**

**Commands run at HEAD (`3683daa`):**

| Command | Exit | Result |
|---|---|---|
| `pnpm lint` | 0 | `eslint .`, no output |
| `pnpm typecheck` | 0 | `tsc --noEmit`, no output |
| `pnpm test` | 0 | 35 files, 945 tests passed (9.13 s). Run twice; both runs passed all 945. The first run's exit code was lost to a shell pipe, and the second, with output redirected to a file, recorded 0 |
| `pnpm build` | 0 | tsup: ESM and DTS "Build success" |
| `pnpm check:dist` | 0 | "Built files scanned: 10, no network APIs or network modules." |
| `pnpm check:images` | 0 | "Images: 8 (apple, ball, book, fish, flower, person, star, tree), every license recorded and allowed (MIT, CC0-1.0)." |
| `pnpm size` | 0 | `./pictograph` 17.2 kB (limit 25 kB); `./circle` 15.63 kB; `./core` 15.26 kB; `.` 19.2 kB |
| `pnpm bench` | 0 | GSV-NFR-001: pictograph p95 0.0307 ms over 11,245 runs, circle 0.0234 ms; limit 5 ms |

- `pnpm test`'s global setup and `pnpm build` rewrote the gitignored `dist/`, as expected.
- `git status --short` after every command, probe and mutation run showed only the pre-existing changes to `.gener8v/pipeline-state.yaml` and `.gener8v/runs.jsonl`.
- `pnpm generate` writes source, so it was not run. The code review re-ran it, together with `publint`, `attw` and `audit`, at the fixes.

**What the tests cover well:**
- Every acceptance criterion has a test whose name describes it and cites its requirement.
- **The validation side is pinned.** Six of seven core mutations (C1–C7 below) fail a test: the cap's boundary, a zero value's count, the suggestion for a capitalised near miss, the length check's guards, and zero values in the text alternative.
- **DGP-NFR-002 is a 600-run property test** in rows and columns. It is parameterized on `PICTOGRAPH_IMAGE_LIMIT`, so it would catch a raised cap that breaks the 2% bound. C3 fails it too.
- **The text alternative is tested against the hostile and smuggled text fixtures.**
- **The bundle tests prove AD-001 in both directions,** including a consumer's bundle of the built `./circle` entry.

**Gaps, measured with mutations and probes:**
- **Harness.**
  - Copies of `src/`, `examples/`, `tests/core/pictograph.test.ts`, `tests/layout/pictograph.test.ts`, `tests/react/Graph.test.tsx`, `tests/graph.test.ts` and `tests/fixtures/` sit in the session scratchpad.
  - They ran under the repository's own Vitest, called by absolute path. A scratch config aliases `fast-check`, `react`, `react-dom` and `jsdom` to the repository's installed copies and keeps the cache in the scratchpad.
  - The baseline is 4 files and 90 tests, all passing.
  - Each mutated file was restored from the repository after its run, and the copy was compared with `src/` at the end and found identical.
  - The probes are `tsx` scripts that import the scratch copy, which is identical to `src/` at HEAD.
- **Geometry fuzz probe.**
  - 3,000 random pictographs: 1–12 categories, 0–12 pictures each, `unitValue` 0.5–10, both orientations, random titles and labels.
  - Each was checked for:
    - every picture and text line inside the drawing;
    - no picture over text, no text over text, no picture over another picture;
    - the plot above the key.
  - **The delivered layout: 0 problems.**
  - **With 13–100 categories (600 runs):** text over text, all in columns (QR-002).
- **QR-001.** All 16 placement mutations (M1–M16) pass all 90 tests. The fuzz probe catches 8 of the 12 run against it.
- **QR-002.** No test draws a crowded or ordinary multi-category column chart.
- **QR-003.** The half-megabyte label tests use two categories, so the text alternative's size grows unseen with the category count.
- **A wall-clock bound (noted, not a finding).** `tests/core/pictograph.test.ts:154-156` asserts that one `validate` call takes under 100 ms.
  - The call takes well under a millisecond, so the margin is wide.
  - The same shape already stands in `tests/core/categories.test.ts:326-328`.
  - The circle's 2,000 ms bound was removed for flakiness (`b48d1a4`). An enumerating cap would time out at the 30 s test limit anyway, so the bound adds little.

**Mutation results:**

| Mutation (on the copy) | Result |
|---|---|
| M1: a row's partial picture placed one step past the last whole picture (`src/layout/pictograph.ts:153`) | survives: QR-001. Fuzz: 279 nodes outside the drawing |
| M2: a column's partial picture hung from the top of its cell, not resting on the picture below (`:64`) | survives: QR-001. Fuzz clean (a visible gap only) |
| M3: row height ignores the wrapped names (`:148`) | survives: QR-001. Fuzz: 1,358 text-over-text, 1 picture-over-text |
| M4: `mostPictures` ignores the remainder (`:112`) | survives: QR-001, QR-005. Fuzz: 842 outside the drawing (a column's partial at y −0.53), 283 picture-over-text |
| M5: columns no longer limited by the slot width (`:162`) | survives: QR-001. From 14 categories in columns, pictures overlap the next column; the 12-category fuzz does not reach it |
| M6: in columns, the key starts at the baseline, over the names (`:183`) | survives: QR-001. Fuzz: 10,645 outside, 2,198 picture-over-text, 9,296 text-over-text |
| M7: the Scene's height ends at the plot, so the key is outside the drawing (`:204`) | survives: QR-001. Fuzz: 6,000 outside (every run's key picture and key text) |
| M8: rows' pictures aligned to the slot's top, not centred on the name (`:152`) | survives: QR-001. Fuzz clean |
| M9: the key's picture pinned to the right margin, pushing its text off the drawing (`:195`) | survives: QR-001. Fuzz: 3,000 outside (every run) |
| M10: column pictures not lowered onto the baseline (`:175`) | survives (minor) |
| M11: the partial's `preserveAspectRatio` set to `none` (`:76`) | survives (harmless while the `viewBox` and viewport ratios agree) |
| M12: rows start at the left margin, under the names column (`:138`) | survives: QR-001. Fuzz: 13,614 outside (names pushed off the left edge) |
| M13: rows run to the drawing's edge, not its margin (`:139`) | survives (minor) |
| M14: `imageCount`'s `Math.min(fraction, 1)` removed (`src/core/definitions/pictograph.ts:47`) | survives (harmless: the count is floored, so the clamp is unreachable) |
| M15: the key drawn 20 units higher, over the plot (`src/layout/pictograph.ts:188`) | survives: QR-001. Fuzz: 9,641 picture-over-text, 4,095 text-over-text, 1,861 plot below the key's top |
| M16: column pictures at the slot's start, not centred over the name (`:168`) | survives: QR-001. Fuzz clean |
| C1: the length check without its list guards (`src/core/definitions/pictograph.ts:140`) | caught (1 test) |
| C2: `unitLabelOf` trims instead of `cleanText` (`:62`) | survives (low impact: validation refuses what `cleanText` removes, so only runs of inner spaces differ) |
| C3: the cap compared with `>=` (`:151`) | caught (2 tests, one of them the NFR-002 property) |
| C4: the cap check declares no inputs (`:146`) | caught (1 test) |
| C5: a zero value draws a 1% partial (`:43`) | caught (3 tests) |
| C6: no suggestion for a capitalised near miss (`src/core/validate/structure.ts:131`) | caught (2 tests) |
| C7: zero values left out of the text alternative (`src/core/definitions/pictograph.ts:174`) | caught (1 test) |

### Observability & Operability

**Rating:** Adequate
**Notes:**
- **This is a library, and the delivery adds no logging, which is right.** It has no runtime network and no telemetry by design (`.gener8v/context.md`), and nothing under `src/` logs.
- **Description problems surface as typed issues with JSON Pointers.**
  - `unknown_image` carries `allowed` and `suggestion` as fields, so a model can act on them without parsing the message.
  - The `too_large` message names its fix ("use a larger unitValue or smaller values").
- **Package defects in the drawing throw and become `internal_error`,** the established design (GSV TICKET-002 SEC-003). Nothing in the delivery swallows a failure.
- **Gaps:**
  - For an overflowing count, the `too_large` message states a number nobody counted (QR-007).
  - A long unit label makes `createGraph` run for seconds with no signal to whoever operates the tool handler (QR-003). The cost becomes visible only as latency until the Product Owner's caller-text length bound exists.

## Findings

### QR-001: The layout's geometry is unpinned: all 16 placement mutations pass the suite, including a key drawn outside the drawing

**Category:** Testing
**Severity:** Concern
**Location:**
- Tests: `tests/layout/pictograph.test.ts`. Its only placement assertions are `:107-112` (the longest row ends at or before x 400) and `:129-138` (a name is left of its row or below its column).
- Code: `src/layout/pictograph.ts:136-205` (rows, columns, the key and the Scene height).
- Pattern: `tests/layout/circle.test.ts:68-79` (`overlaps`) and `:267-305` (the circle's overlap and inside-the-drawing property test).

**Description:** What the layout tests assert, and what they leave out:
- They assert:
  - the picture counts per row;
  - the partial's `viewBox` and extent;
  - equal size and step;
  - the key's text;
  - `checkScene` on every Scene;
  - the DGP-NFR-002 property.
- They never assert:
  - where a picture sits relative to its name, the next picture or the drawing's edges;
  - where the key sits relative to the plot;
  - whether the Scene's height contains everything.

On the scratch copy, each of these passes all 90 tests in the four files that draw a pictograph (table under Test Coverage):
- **the key falls outside the drawing:** the Scene's height ends at the plot (M7), or the key's text starts past the right edge (M9);
- **the key overlaps the plot or the names** (M6, M15);
- **rows overlap:**
  - pictures start under the names column (M12);
  - rows overlap each other's wrapped names (M3);
- **the longest row or column overflows** because the layout's count ignores the remainder (M4). A column's partial then sits above the drawing, at y −0.53;
- **the partial picture drifts:** it sits one step away from its row (M1), or hangs at the top of its cell (M2);
- **columns overlap their neighbours** from 14 categories (M5).

Today the delivered layout is right: the 3,000-run fuzz probe found no picture or text outside the drawing and no overlap among 1–12 categories. Run on the mutated copies, the same probe flags M1, M3, M4, M6, M7, M9, M12 and M15.

The circle's tests carry exactly this kind of check: a bounding-box overlap helper and a property test that every label stays inside `scene.height`. DGP TICKET-001 QR-001 and DGP TICKET-004 QR-001 closed the same kind of gap for the category kit and the drawings.

**Impact:**
- The pictograph's correctness is visual. A regression that cuts off the key, pushes pictures over names or drops the partial picture away from its row would pass CI.
- The NFR-002 property and the equal-step test would stay green throughout.
- The bar graph (DGP TICKET-003) will lay out category names and columns through the same kit and will likely copy these tests.

**Recommendation:** In `tests/layout/pictograph.test.ts`:
- **Add a geometry property test** over generated descriptions:
  - 1–100 categories in rows, and as many in columns as QR-002's outcome allows;
  - values up to the cap;
  - both orientations;
  - optional title and label.

  It should assert:
  - every nested `svg` and every text line lies inside the drawing's margins and `scene.height`;
  - no picture overlaps text;
  - no text overlaps text;
  - no two pictures overlap;
  - every plot node is above the key's top.

  The fuzz probe used here is a starting point; text boxes can follow `textLines`' baseline rule.
- **Pin the alignment directly:**
  - **rows:** the partial's x is `left + whole × step`, and each row's pictures are centred on its name's slot;
  - **columns:**
    - the partial's bottom edge meets the top of the picture below it, less the gap;
    - each column is centred over its name;
    - columns never overlap at 14 or more categories.
- **Add a row whose longest value has a remainder** (for example `values: [20.5]`), so M4 fails.

**Status:** Resolved
**Resolution:** Resolved — `tests/layout/pictograph.test.ts` adds a geometry property test in rows (1–100 categories) and in columns (1–25). Every picture and text line, rotated ones included, must be inside the margins and the Scene's height, overlap nothing, and sit above the key. Direct tests pin the row partial's x, rows centred on their names, the column partial one gap above the picture below, 25 columns kept apart, and a longest row and column ending in a remainder. All 12 reproduced placement mutations (M1–M9, M12, M15, M16) now fail a test. Approved by the user, 2026-10-15.

---

### QR-002: In columns, ordinary category names are split mid-word, and names overlap from about 20 categories

**Category:** Maintainability
**Severity:** Concern
**Location:**
- `src/layout/pictograph.ts:158-184` (the columns branch: `categorySlots(…, "vertical")` at `:166`, `drawCategoryNames` at `:182`).
- `src/layout/kit/value-scale.ts:146-150`: names below a vertical plot wrap to `max(MIN_NAME_WIDTH, slot − LABEL_GAP)`.
- `src/layout/kit/text.ts:194-207`: `wrap` splits a word wider than its line between clusters.
- Published promise: `src/core/definitions/categories.ts:54` ("A long name wraps onto more lines; it is never cut short").

**Description:** Columns share the fixed 368-unit plot equally, so a slot is 368 ÷ n units wide. The kit wraps each name to the slot's width and splits any word that does not fit. Probed through `validate` and `pictographLayout`:
- **Five weekdays:** `Wednesday` becomes "Wednesda" / "y".
- **The seven-day week:** "Tuesda" / "y", "Wednes" / "day", "Thursda" / "y", "Saturda" / "y".
- **The twelve months:** 9 of 12 are split. For example "Jan" / "uary", "Mar" / "ch", "Jun" / "e" and "Sep" / "tem" / "ber".
- **Eight fruit names:** "Banan" / "as", "Cherri" / "es". With ten: "Appl" / "es".
- **The same names in rows** are drawn whole, because rows give names a 96-unit column.
- **Overlap:** from 20 categories (an 18.4-unit slot, names wrapped to 24 units), name lines overlap their neighbours. That is 34 overlapping pairs for 20 fruit names and 1,266 for 100. In the 13–100-category fuzz, every text overlap was in columns.

DGP TICKET-001's quality review recorded this kit limitation and assigned its handling: "Detecting the overlap is left to the type layouts, which can compare `labelWidth` with `end - start`" (QR-001 notes). The pictograph is the first type layout to draw names below a vertical plot, and it does not handle it. No test draws a column chart with more than two categories.

**Impact:**
- A teacher's weekday or month pictograph in columns, the most ordinary column chart, prints broken words under the pictures.
- With many categories the names become unreadable, against the specification's rule to "keep the whole name readable (wrapping or rotating it)" and the schema's published promise above.
- The bar graph (DGP TICKET-003) and the line graph (TICKET-002) draw names below vertical plots through the same `categorySlots` and `drawCategoryNames`, so they inherit it.

**Recommendation:** Settle the rule with the user, preferably in the kit so all three types share it. Then add tests that the seven day names in columns keep every word whole, and that no two name lines overlap up to the category limit. Options:
1. **Rotate the names** (−45° or −90°, anchored under the column) when the widest word of any name exceeds its slot's label width. The specification allows rotating, and `transform` is in the Scene's attribute set (`src/layout/scene.ts`).
2. **Wrap between words only**, to at least the widest word. Rotate or stagger when neighbours would then overlap.
3. **Defer to DGP TICKET-003** with a Known Hazard on that ticket's file, since the bar graph's columns are the main consumer.

**Status:** Resolved
**Resolution:** Resolved — in the kit (`src/layout/kit/value-scale.ts`), names below a vertical plot are rotated to read upward when any word would not fit its column. They are wrapped only between words, with as many lines as fit across the column, so the week and the months keep every word. Kit and layout tests pin it. More crowded columns (past about 25, where one rotated line no longer fits) are deferred to DGP TICKET-003, with a Known Hazard on its file. Approved by the user, 2026-10-15.

---

### QR-003: The text alternative repeats the unit label after every value: a 0.5 MB description gives a 50.5 MB text alternative and takes 16.7 s

**Category:** Performance
**Severity:** Concern
**Location:**
- `src/core/definitions/pictograph.ts:166-176`: `unit` is passed to `stateMeasurement` for the key sentence and for every category.
- `src/core/format.ts:208-217`: `stateMeasurement` cleans the unit on every call and, for a unit longer than 20 characters, quotes and cleans it again.
- `src/react/SceneSvg.tsx:43-48`: the text alternative is printed twice, as `aria-label` and as `<title>`.

**Description:**
- `describe` states every value with the unit: "“Cats”: 7 students and “Dogs”: 4 students".
- The label is caller text with no length bound. The key caps it at two lines, but the text alternative states it whole, by design (GSS TICKET-002 SEC-001).
- So the label appears once per category plus once in the key sentence, and is cleaned two or three times per appearance.

Measured through `createGraph` with a valid description, `unitValue: 1` and one value per category:

| Categories | Label | Text alternative | `createGraph` |
|---|---|---|---|
| 2 | 500,000 characters | 1,500,068 characters | 658 ms |
| 100 | 500,000 characters | 50,501,334 characters | 16,746 ms |
| 100 | 5,000 characters | 506,334 characters | 91 ms |

On a scratch copy whose `describe` repeats only a unit of up to 20 characters (`stateMeasurement`'s own "unit-shaped" length) and otherwise states it once, the 100-category, 500,000-character case gives 501,034 characters in 414 ms.

The circle states its unit after at most three measurements, so this amplification is new with the pictograph. The existing large-text tests use two categories (`tests/layout/pictograph.test.ts:209-213`, `tests/react/Graph.test.tsx`), so it never shows.

This overlaps the security review's remit and the pending caller-text length bound (GSS TICKET-002 SEC-002). It is raised here because the cost is a 100× multiplication of caller text in a synchronous call.

**Impact:**
- `createGraph` is the tool handler's path on a server.
- One valid 0.5 MB description blocks the event loop for about 17 s and produces about 100 MB of markup, since the text alternative is printed twice.
- A screen-reader user also hears the long label once per category.

**Recommendation:**
- **In `describe`, clean the label once** (`unitLabelOf` already does).
- **Repeat it after each value only when it is unit-shaped:** at most 20 characters, no sentence punctuation, the rule `stateMeasurement` already applies. Otherwise state it once in the key sentence ("Each apple stands for 2 “…”.") and give the values bare.
- **Add a test** that the text alternative of a 100-category pictograph with a half-megabyte label is under, say, 1.1 × the label's length, and keep the short-label wording ("“Cats”: 7 students") pinned.
- **Record the measured figures** for the Product Owner's length decision, beside CR-005's.

**Status:** Resolved
**Resolution:** Resolved — the label follows each value only when `isUnitShaped()`; otherwise it is stated once, quoted, in the key's sentence. For 100 categories and a 500,000-character label, the text alternative fell from 50,501,334 to 501,033 characters and `createGraph` from 16.7 s to 384 ms, recorded in the delivery record for the Product Owner. A test bounds the text at 1.1 × the label. Approved by the user, 2026-10-15.

---

### QR-004: The one-value-per-category check relies on a new, untested "empty inputs" contract and is written inline, although the bar graph needs the same check

**Category:** Maintainability
**Severity:** Suggestion
**Location:**
- `src/core/definitions/pictograph.ts:130-143` (`inputs: []`; the `unknown` casts at `:138-139`).
- `src/core/definitions/types.ts:213-224`: `DomainCheck.inputs` widened from the non-empty `Terms` to `readonly string[]`.
- `src/core/validate/domain.ts:27-30`: an empty list makes `every` true, so the check always runs.
- `tests/core/validate-domain.test.ts`: no empty-inputs case.
- `tests/core/definitions.test.ts:405-408`: the path check walks `inputs`, so an empty list checks nothing.
- Pattern: `src/core/definitions/categories.ts:169-175` (`categoriesCheck`).
- Next users:
  - `.gener8v/changes/graph-library/tickets/data-graphs-and-pictographs/TICKET-003.md:28` (bar graph: `series_length_mismatch` at `/values`);
  - `TICKET-002.md:32` (line graph: per series).

**Description:** CR-002's fix is correct, and its behaviour is pinned (`tests/core/pictograph.test.ts:112-118`). The mechanism it added changes a contract for every domain check, though:
- **Before:** `inputs` had to name at least one path, and `runDomainChecks` skipped a check whose inputs touched a failure. The `check(description: D)` signature could therefore promise a complete, valid description.
- **After:** an empty list means "always runs, guards itself". The parameter type is unchanged, so it still promises a complete `Pictograph`, and the check has to cast its lists to `unknown` to be safe.
  - Nothing in the type system or the definitions test tells the next author which mode a check is in.
  - The contract is tested only through this one check.
- **The check will be copied.** The bar graph's acceptance criterion is the same check on the same path, and the line graph needs it per series. Copying the inline version copies the cast-and-guard pattern with it.

**Impact:** A future check written with `inputs: []` that reads elements, not just lengths, would run on half-failed descriptions. It would meet `null` where its type promises a number, and throw `internal_error` or report a cascade. The current types give no warning.

**Recommendation:**
- **Move the check into `categories.ts` as a ready-made factory beside `categoriesCheck`**, for example `valuesPerCategoryCheck(listPath)`. Its guard and its `unknown` reads then live once and have their own unit tests. The pictograph and the bar graph use it as is, and the line graph per series.
- **Make the always-run mode explicit**, for example with an exported `ALWAYS_RUNS` constant or a `guardsItself: true` flag that the definitions test can see.
- **Add a `tests/core/validate-domain.test.ts` case:** a check with no inputs runs when another value failed, and receives the failed element as `null`.

**Status:** Resolved
**Resolution:** Resolved — `valuesPerCategoryCheck()` sits in `src/core/definitions/categories.ts` with its own tests, and the pictograph uses it. `ALWAYS_RUNS` names the mode. A `tests/core/validate-domain.test.ts` case pins that such a check runs after another failure and sees a failed element as `null`. Approved by the user, 2026-10-15.

---

### QR-005: The layout restates the "a remainder draws one more picture" rule, and `categoryPictures` takes a `step` it never reads

**Category:** DRY
**Severity:** Suggestion
**Location:**
- `src/layout/pictograph.ts:108-115` (`mostPictures`: `whole + (fraction > 0 ? 1 : 0)`).
- `src/core/definitions/pictograph.ts:51` (`imagesDrawn`, module-private, the same rule for the cap).
- `src/layout/pictograph.ts:82-90` (`categoryPictures`' `step` parameter, unused; the spacing comes from `place`).

**Description:**
- **The rule is written twice.** The cap check and the layout's sizing each count the pictures a value draws, with two hand-kept copies.
- **The two must agree.** CR-001's resolution rests on "at most 400 pictures in a row or column, so a picture is at least 0.5 units". That holds only while the layout sizes rows by the same count the cap limits.
- **Mutation M4 shows the risk.** It makes the layout's copy ignore the remainder, and it passes all 90 tests. The longest row's partial then runs past the margin, and a column's partial is drawn above the drawing, at y −0.53. The fuzz probe flags 842 nodes outside the drawing.
- **`categoryPictures` declares a `step` parameter that its body never reads.** Neither `tsc` (no `noUnusedParameters`) nor ESLint (`args: after-used`) reports it, because `place` and `upright` follow it. A reader changing the spacing would edit `step` there to no effect.

**Impact:** The changes still to come in this area are the Product Owner's cap decision (OQ-004) and DGP TICKET-006's accuracy suite. A change to one copy of the rule could silently break the bound CR-001 relies on. The dead parameter misdirects whoever debugs the spacing.

**Recommendation:**
- Export `imagesDrawn` beside `imageCount` in `src/core/definitions/pictograph.ts`, and write `mostPictures` with it.
- Drop `step` from `categoryPictures`' parameters and call sites.
- QR-001's row with a remainder pins the agreement.

**Status:** Resolved
**Resolution:** Resolved — `imagesDrawn` is exported and used by `mostPictures`; `categoryPictures` no longer takes `step`. The longest-row and longest-column remainder test catches M4. Approved by the user, 2026-10-15.

---

### QR-006: The rows layout depends on the kit's private `LABEL_GAP` through literal 4s, and wraps every category name twice

**Category:** Patterns
**Severity:** Suggestion
**Location:**
- In `src/layout/pictograph.ts`:
  - `:138` (`SCENE_MARGIN + CATEGORY_NAME_WIDTH + 4`);
  - `:148` (`nameHeight + 4`);
  - `:183` (`baseline + 4 + nameHeight`);
  - `:145-150` (`categorySlots` called first with a placeholder box, `height: p.categories.length`, then again with the real box).
- In `src/layout/kit/value-scale.ts`:
  - `:22` (`LABEL_GAP = 4`, not exported);
  - `:147` (labels wrapped to `nameWidth` beside a horizontal plot, whatever the box);
  - `:176-177` (names placed `LABEL_GAP` from the plot).

**Description:**
- **The 4s are the kit's gap.** `drawCategoryNames` places names `LABEL_GAP` left of a horizontal plot and `LABEL_GAP` below a vertical one. The layout reserves room for them with three literal 4s, which match only while the kit's private constant is 4.
- **Every name is wrapped twice.** To learn the tallest name, the rows branch calls `categorySlots` with a placeholder box whose height is one unit per category, then calls it again with the real box.
  - Beside a horizontal plot, the wrap width does not depend on the box, so the second call repeats the first call's wrapping exactly.
  - For a half-megabyte name, one `categorySlots` call takes about 90 ms of the rows layout's 269 ms (probe), so about a third of the work is repeated.
  - For ordinary names the cost is negligible, but the placeholder box takes a re-read to understand.

**Impact:**
- A change to the kit's gap would misplace the pictograph's names against its own reserved room, and no test would catch it (QR-001's M12 shows that the names column is unpinned).
- The bar graph's horizontal orientation will need the same "row height from the tallest name" step and will likely copy the probe.

**Recommendation:**
- **Export the gap from the kit** (for example `NAME_GAP`) and use it at `:138`, `:148` and `:183`.
- **Wrap the names once:** give the kit a way to size slots from their names, for example `categorySlots` with an optional `slotSize` that defaults to the box's share, or a `nameLines(categories, orientation)` helper. The bar graph can then reuse it.

**Status:** Resolved
**Resolution:** Resolved — the kit exports `NAME_GAP`, which replaces the three literal 4s. `categorySlots` takes an optional `slotSize` that sizes slots beside a horizontal plot from the tallest wrapped name, so each name is wrapped once; a kit test pins one call and the slot positions. Approved by the user, 2026-10-15.

---

### QR-007: The picture-limit message states a sentinel or exponent-form count when the real count overflows

**Category:** Error Handling
**Severity:** Suggestion
**Location:** `src/core/definitions/pictograph.ts:152-153` (`Number.isFinite(total) ? total : Number.MAX_SAFE_INTEGER`); `src/core/issues.ts:346-351` (the `too_large` template's `images` branch, which already handles an unknown `count`)
**Description:** Probed through `validate`, with `values: [1e9]`:
- `unitValue: 5e-324` or `1e-300` gives "values would draw 9007199254740991 pictures, more than the limit of 400; …". That is `Number.MAX_SAFE_INTEGER`, not a count.
- `unitValue: 1e-12` gives "values would draw 1e+21 pictures, …". That is exponent form, which the package otherwise keeps out of anything a reader sees (`formatSupplied`).

The template already says "would draw more than 400 pictures" when `count` is left out.

DGP TICKET-001's quality review noted the same sentinel in `too_many_ticks` as a message detail. It is raised here because the delivered template has the fix ready and the check replaces it with a made-up number.

**Impact:** Small. A model or author reading the message may reason from a number nobody counted. For example, it might divide 9007199254740991 by 400 to choose a `unitValue`.
**Recommendation:**
- Pass `count` only when `total` is a safe integer: `...(Number.isSafeInteger(total) ? { count: total } : {})`.
- Add the 5e-324 and 1e-12 cases to the picture-limit test, expecting "more than 400 pictures".

**Status:** Resolved
**Resolution:** Resolved — `count` is passed only when the total is a safe integer, so the message reads "would draw more than 400 pictures". Tested at `unitValue` 5e-324, 1e-300 and 1e-12. Approved by the user, 2026-10-15.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fix | Geometry property tests (rows, columns) and alignment tests | `tests/layout/pictograph.test.ts` |
| QR-002 | Fix in kit; crowded case deferred → TICKET-003 | Names rotate when a word would not fit, never split; Known Hazard on TICKET-003 | `src/layout/kit/value-scale.ts`, `src/layout/kit/format.ts`, `src/layout/kit/text.ts`, `src/layout/pictograph.ts`, `tests/layout/kit/value-scale.test.ts`, `tests/layout/pictograph.test.ts`, DGP `TICKET-003.md` |
| QR-003 | Fix | Long labels stated once; size test; figures recorded | `src/core/format.ts`, `src/core/definitions/pictograph.ts`, `tests/core/pictograph.test.ts` |
| QR-004 | Fix | `valuesPerCategoryCheck()`, `ALWAYS_RUNS`, domain-stage test | `src/core/definitions/categories.ts`, `src/core/definitions/types.ts`, `src/core/definitions/pictograph.ts`, `tests/core/categories.test.ts`, `tests/core/validate-domain.test.ts`, DGP spec coverage row |
| QR-005 | Fix | `imagesDrawn` exported and shared; unused `step` dropped | `src/core/definitions/pictograph.ts`, `src/layout/pictograph.ts` |
| QR-006 | Fix | `NAME_GAP` exported; `slotSize` wraps names once | `src/layout/kit/value-scale.ts`, `src/layout/pictograph.ts`, `tests/layout/kit/value-scale.test.ts` |
| QR-007 | Fix | Count left out when not exact; tests | `src/core/definitions/pictograph.ts`, `tests/core/pictograph.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (all 7 Resolved; the crowded-column part of QR-002 is carried to DGP TICKET-003 as a Known Hazard)
**Notes:** All seven findings fixed and re-verified. `pnpm generate` (no change), `lint`, `typecheck`, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size`, `publint`, `attw`, `audit` and `gener8v-state lint` exit 0, and `pnpm test` (972 tests) exits 0 on three consecutive runs. 21 mutations, each against a passing baseline, all fail a test: 12 of the reviewer's layout mutations, plus breaks to the rotation, the slot sizing and the QR-003, QR-004 and QR-007 fixes. The kit change alters DGP TICKET-001's name wrapping below vertical plots (no 24-unit minimum; rotation instead), recorded in the delivery record.
