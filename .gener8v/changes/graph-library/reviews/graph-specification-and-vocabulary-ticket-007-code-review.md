# TICKET-007: Limit caller text: 200 characters for titles and labels, 20 for a unit — Code Review

## Summary

I reviewed the delivery of `graph-library/graph-specification-and-vocabulary/TICKET-007` (delivery commit `1b17b88`, branch `ticket/gsv-007`). I checked it against the ticket and its seven Known Hazards, GSV-REQ-052..054, the amended Edge Cases and OQ-009 in the Graph Specification & Vocabulary specification, `constraints/prd.md` and `technical-design/system-design.md`.

- **Criteria and requirements:**
  - Five of the six acceptance criteria are met in full.
  - Criterion 6 (one-cluster text stays inside its box) is Partial. The stacked-mark bound applies only to marks listed in the text kit's width table, and a joiner restarts the count. In Chromium, a 200-character ruler label or title of one letter plus 199 Thai combining marks still draws columns of marks through the bar, the end marks and the number "5", while `createGraph` reports `ok` (CR-001). Marks broken up by joiners stack 12 high on one letter and reach the bar (CR-002).
  - GSV-REQ-052, GSV-REQ-053 and GSV-REQ-054 are covered: the validator reports `too_large` with the count and the limit, and the schema, the tool schema and the vocabulary carry `maxLength` on all 19 text term uses.
- **Annotations:** all three requirements carry `@spec` annotations. The specification's `## @spec Coverage` table does not list the `GSV-REQ-054` annotation on `sharedProperties`. Its `UNIT_TEXT_LIMIT` location has no annotation directly above it (CR-003). The gener8v lint reports 0 errors and 0 warnings.
- **Verification:** every Verification Run command I was allowed to run reproduces with exit 0. That covers lint, typecheck, three test runs, bench, build, the dist, dependency and image checks, publint, attw, audit and the state lint. I compared `pnpm generate`'s output in memory: all five generated files are fresh. The test count matches (1,388), but the record states 50 test files where there are 49 (CR-005).
- **Known Hazards:**
  - Supersession, which limit applies, the line caps, shared spec objects, the two SEC-002 closures and the tool-summary cap are handled.
  - The carried SEC-001 (one-cluster text) is closed for the marks the kit knows, and not for the others (CR-001, CR-002).
- **Findings:** 3 Issues (CR-001..CR-003) and 2 Observations (CR-004, CR-005).

**Reviewer:** `code-reviewer` agent, fresh context (findings phase only, 2026-10-21)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/graph-specification-and-vocabulary-ticket-007-delivery.md`
**Files Reviewed:**
- `src/core/definitions/shared.ts`
- `src/core/definitions/categories.ts`
- `src/core/definitions/circle.ts`
- `src/core/issues.ts`
- `src/core/schema.ts`
- `src/core/validate/structure.ts`
- `src/layout/kit/text.ts`
- `src/generated/description.ts`, `src/generated/schema.json`, `src/generated/tool-schema.json`, `src/generated/vocabulary.json`, `tests/fixtures/generated/description.ts`
- `tests/fixtures/plain-text.ts`
- `tests/core/validate-structure.test.ts`, `tests/core/schema-shape.test.ts`, `tests/core/schema-agreement.test.ts`
- `tests/core/circle.test.ts`, `tests/core/pictograph.test.ts`
- `tests/layout/kit/text.test.ts`, `tests/layout/ruler.test.ts`, `tests/layout/circle.test.ts`, `tests/layout/pictograph.test.ts`, `tests/layout/line-graph.test.ts`, `tests/layout/bar-graph.test.ts`
- `tests/react/Graph.test.tsx`
- `.gener8v/specifications/graph-specification-and-vocabulary.md` (the delivery's `@spec Coverage` rows)
- Read unchanged, because drawn caller text flows through them: `src/core/definitions/types.ts`, `src/core/definitions/index.ts`, `src/core/definitions/ruler.ts`, `src/core/definitions/line-graph.ts`, `src/core/definitions/bar-graph.ts`, `src/layout/ruler.ts`, `src/layout/circle.ts`, `src/layout/kit/title.ts`, `src/layout/kit/value-scale.ts`, `src/core/result.ts`

**Probes** (scratch files in `/private/tmp/claude-501/-Users-thomas-Repositories-gener8v-gener8v-tools-education-graph-generator/90a37181-7c56-4f53-87c3-a87caf6952a9/scratchpad/code-review-gsv007/`):
- Inline `TSX_DISABLE_CACHE=1 npx tsx -e '…'` runs against `src/`.
- Renders of `<RulerGraph>` markup (`react-dom/server`) in the Chromium headless shell from the Playwright cache (`chromium_headless_shell-1243`). The pages and screenshots are `ruler-probe.html`, `ruler-probe.png`, `ruler-probe-zoom.png`, `ruler-probe-b.png`, `title-probe.png` and `flag-probe.png`.

**Findings:** 5
**Critical:** 0 | **Issues:** 3 | **Observations:** 2

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| Every caller-written text term has a `maxLength`: 200 for `title`, `lineLabel`, the five axis labels, the element `label`, category `name`, `valueUnitLabel` and the circle's three label texts; 20 for the circle's `unit`. A test lists every `kind: "string"` term in every registered definition and the shared and scoped maps, and fails on one with no `maxLength` | Yes | `src/core/definitions/shared.ts:46,67,78,89,100,111,122,133` (on the shared specs themselves, so the ruler's and line graph's nested `label` and `lineLabel` share them by identity); `src/core/definitions/categories.ts:33` (`CATEGORY_NAME_LIMIT = CALLER_TEXT_LIMIT`), `:92`, `:122`; `src/core/definitions/circle.ts:73` (`labelText`), `:136` (`unit`). `tests/core/validate-structure.test.ts:797` walks `scopedPropertyMaps` and every registered definition, including nested objects and lists, and also checks that each description states "at most N characters". I found no other `kind: "string"` term in `src/core/definitions/` |
| Text of 201 characters (a unit of 21) is reported once as `too_large` at its path, with `limit` and `count`, and the message states both. Text of exactly 200 (a unit of exactly 20) is accepted. Characters are counted as code points, so 200 emoji are accepted and 201 are not | Yes | `src/core/validate/structure.ts:91-97` (`charactersOver`, code points) and `:126-130` (`createIssue("too_large", path, { term, limit, unit: "characters", count })`). Message template `src/core/issues.ts:398-400`: "title has 201 characters, more than the limit of 200; use fewer." Tests: `tests/core/validate-structure.test.ts:812` (200/201 title, 20/21 unit, ruler label at `/measuredObject/label`, exactly one issue each) and `:827` (200/201 emoji) |
| The published schema, the tool schema and the vocabulary carry each limit as `maxLength`, regenerated with `pnpm generate`. The agreement test (GSV-NFR-003) generates texts on both sides of each limit, and schema and validation agree on them | Yes | `src/core/schema.ts:96` (`valueSchema`, both profiles), `:263` (`termUse`). An in-memory comparison with `scripts/generated-files.ts` shows all five generated files fresh. Walking `src/generated/vocabulary.json` finds all 19 string term uses with `maxLength` (18 at 200, `circle/unit` at 20). Tests: `tests/core/schema-shape.test.ts:389` (every text schema in both schemas) and `:400` (the vocabulary, sampled on two terms); `tests/core/schema-agreement.test.ts:44-49` adds `maxLength` and `maxLength + 1` texts in letters and emoji |
| The `too_large` code's documentation covers text that is too long, and the documentation test (GSV-NFR-005) passes | Yes | `src/core/issues.ts:83`; `tests/core/issues.test.ts:98-100` passes in all three re-runs |
| The "half a megabyte" tests in `tests/react/Graph.test.tsx` expect the fallback with `too_large` for over-limit text. Each type keeps a test at the limit: 200-character titles and labels draw a bounded number of text nodes without throwing | Yes | Over-limit text: `tests/react/Graph.test.tsx:477` covers seven terms across five components and `<Graph>`, with exactly one `too_large` at the path and the message stating the limit. At the limit: `:387` (circle, unit at 20), `:398` (pictograph), `:417` (line graph), `:437` (bar graph, both orientations), `:460` (ruler). For the circle, the 200-character title is bounded in `tests/layout/circle.test.ts:255`, and a 198-character label text is cut to four lines at `:244` |
| A 200-character label or title made of one letter followed by 199 combining marks, or a chain joined by zero-width joiners, draws inside its estimated line box: the text kit bounds the marks stacked on one letter, or counts them in the box's height. A ruler label made this way no longer covers the bar, the end marks or a number (rulers NLC TICKET-003 SEC-001) | Partial | Met for marks in the kit's `ZERO_WIDTH` table and for a plain ZWJ chain: `src/layout/kit/text.ts:172-192` (`drawnCluster`, `drawnWord`), `:221-224`; tests `tests/layout/kit/text.test.ts:156-183` and `tests/layout/ruler.test.ts:253`. Not met for combining marks outside the table (CR-001): Thai U+0E38 × 199 after "x" draws through the bar, the end marks, the "5" and the body in Chromium, and as a title through the label and the bar. Not met for marks broken up by joiners (CR-002): 12 marks on one letter reach the bar |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| GSV-REQ-052 | A title, label or other caller-written text longer than 200 characters is reported, stating the limit and the text's length | `src/core/definitions/shared.ts`:CALLER_TEXT_LIMIT, sharedProperties; `src/core/definitions/categories.ts`:categoriesProperty, dataGraphProperties; `src/core/definitions/circle.ts`:circle; `src/core/validate/structure.ts`:checkValue | Yes |
| GSV-REQ-053 | A unit text longer than 20 characters is reported, stating the limit and the text's length | `src/core/definitions/shared.ts`:UNIT_TEXT_LIMIT; `src/core/definitions/circle.ts`:circle (`unit`); `src/core/validate/structure.ts`:checkValue | Yes |
| GSV-REQ-054 | Each caller-written text's limit is published in the schema | `src/core/schema.ts`:valueSchema (`maxLength` in the published and tool schemas), termUse (the vocabulary) | Yes |

*The ticket carries no NFR. The two NFRs its criteria name are verified by the suite: GSV-NFR-003 (`tests/core/schema-agreement.test.ts`) and GSV-NFR-005 (`tests/core/issues.test.ts`). Both pass in all three re-runs. The drawn-cluster bound in `wrap` is annotated GSV-REQ-052 and serves criterion 6. It is assessed there, since GSV-REQ-052 itself asks only for the report.*

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/CC-002 | Every graph has a meaningful text alternative (WCAG 1.1.1) | Yes | The text alternative states caller text whole, now at most 200 characters (20 for a unit). `tests/layout/ruler.test.ts:253` checks that a one-cluster label is stated whole. `tests/core/pictograph.test.ts` checks that the key label is stated once whatever the category count |
| prd/TC-001 | Output computed from the description alone, with no DOM measuring | Yes | `drawnCluster` and `drawnWord` (`src/layout/kit/text.ts:172-192`) are pure string functions over code points. Nothing is measured |
| prd/TC-011 | Line breaking is computed by the package | Yes | `wrap` (`src/layout/kit/text.ts:214-277`) still breaks and caps lines. The line caps stay as defence in depth (Known Hazard "The line caps stay") |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-003 | One definition is the source of the vocabulary, the schema and validation | Yes | `maxLength` lives on the `PropertySpec`s. The validator (`structure.ts:127`), the schema (`schema.ts:96`) and the vocabulary (`schema.ts:263`) all read it, and the generated files are fresh |
| AD-004 | Staged validator, one issue per fault, no cascades | Yes | `too_large` is raised in the structure stage, after the plain-text check. A failed text is added to `walk.failed`, so nothing downstream reports on it, and the tests assert exactly one issue |
| AD-006 | Published and strict tool schema profiles | Yes | `maxLength` is emitted in both profiles, and in the tool profile alongside `["string", "null"]`. `maxLength` was already in the tool schema for category names, and the strict-profile keyword test (`tests/core/schema-shape.test.ts:166`) still passes |
| AD-010 | Estimated text metrics; labels placed by estimated boxes | Yes | The drawn bound lives in the shared kit, which every caller text passes through (`title.ts:57`, `ruler.ts:98`, `circle.ts:34`, `pictograph.ts:186`, `line-graph.ts:82`, `value-scale.ts:152-203,300`). `widestWord` measures words as drawn. The criterion 6 gaps (CR-001, CR-002) fall within this design: they are cases the estimate does not model, not a departure from it |
| AD-014 | Pure components; invalid descriptions reach the fallback with their issues | Yes | `tests/react/Graph.test.tsx:477`: over-limit text renders `""` and the fallback receives one `too_large` |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| GSV-REQ-052 | `@spec GSV-REQ-052` | `src/core/definitions/shared.ts:31` (CALLER_TEXT_LIMIT), `:41` (sharedProperties); `src/core/definitions/categories.ts:73` (categoriesProperty), `:114` (dataGraphProperties); `src/core/definitions/circle.ts:103` (circle); `src/core/validate/structure.ts:100` (checkValue); `src/layout/kit/text.ts:213` (wrap) | Yes |
| GSV-REQ-053 | `@spec GSV-REQ-053` | `src/core/definitions/shared.ts:31` (above CALLER_TEXT_LIMIT; UNIT_TEXT_LIMIT at `:33` has none of its own); `src/core/definitions/circle.ts:103`; `src/core/validate/structure.ts:100` | Yes (UNIT_TEXT_LIMIT: Misplaced, CR-003) |
| GSV-REQ-054 | `@spec GSV-REQ-054` | `src/core/schema.ts:82` (valueSchema), `:247` (termUse); also `src/core/definitions/shared.ts:41` (sharedProperties) | Yes |

**Coverage:** 3 of 3 requirements annotated
**Missing:** None. The `UNIT_TEXT_LIMIT` location named for GSV-REQ-053 relies on the annotation above `CALLER_TEXT_LIMIT` (CR-003)
**Specification table:** No. The GSV-REQ-054 row (`.gener8v/specifications/graph-specification-and-vocabulary.md:254`) omits the `GSV-REQ-054` annotation at `src/core/definitions/shared.ts`:sharedProperties (CR-003). The 052 and 053 rows match the code

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm generate` | Not run (it rewrites files). The in-memory comparison with `scripts/generated-files.ts` found all five files fresh | Yes, by the equivalent check |
| `pnpm lint` | 0 | Yes |
| `pnpm typecheck` | 0 | Yes |
| `pnpm test` (three runs), re-run as `pnpm exec vitest run --no-cache` | 0, 0, 0 (49 files, 1,388 tests each run, no flake) | Exits and test count yes. File count no: the record says 50 (CR-005) |
| `pnpm bench` | 0 | Yes |
| `pnpm build` | 0 | Yes |
| `pnpm check:dist` | 0 (16 built files scanned, no network APIs) | Yes |
| `pnpm check:deps` | 0 | Yes |
| `pnpm check:images` | 0 | Yes |
| `pnpm size` | Not run (it rewrites files) | Not re-run |
| `pnpm publint` | 0 | Yes |
| `pnpm attw` | 0 | Yes |
| `pnpm audit` | 0 (no known vulnerabilities, 2026-10-21) | Yes |
| `gener8v-state.py lint` | 0 (0 errors, 0 warnings) | Yes |
| Mutations (four rows) | Not re-run: each needs a source edit, which this phase may not make | Not re-run |

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | One constant per rule, exported from `shared.ts` and used by every definition. `CATEGORY_NAME_LIMIT` is kept as an alias, as the ticket allowed. The descriptions state each limit, and the every-term test enforces the wording |
| DEL-002 | Questionable | `wrap` is the right place: every drawn caller text passes through it. But the bound decides what a "mark" is from `ZERO_WIDTH`, a width table that lists only some combining marks, and a joiner restarts the run. Both leave criterion 6 Partial (CR-001, CR-002). The rationale's claim that real text keeps its marks holds for the scripts tested. Subdivision-flag tag sequences would be cut, but the plain-text policy already refuses tag characters, so they never reach the drawing (probe `flag-probe.png`). For Quality Review: `wrap` now runs `drawnWord` over every word before it stops at `maxLines`. A 2 MB input of words takes 18 ms before and 70 ms after; 2 MB of "@" takes 105 ms before and 195 ms after (median of 7). That is linear and well under the kit's 1 s test |
| DEL-003 | Reasonable | The tests written for unbounded text now test refusal over the limit and bounded drawing at it. The text kit's own performance tests keep their huge inputs, as the line caps stay as defence in depth |

**Deviations:** Both are sound and have no downstream impact.
- The pictograph "stated once" test compares 200 with 199 characters, not with a one-letter label.
- The circle quoting test uses a 19-character sentence-shaped unit.

## Findings

### CR-001: The stacked-mark bound applies only to marks in the kit's width table, so a 200-character label or title of other combining marks still draws a column through the ruler

**Severity:** Issue
**Location:**
- `src/layout/kit/text.ts:178` (`drawnCluster` decides what a mark is with `within(ZERO_WIDTH, code)`)
- `src/layout/kit/text.ts:28-46` (`ZERO_WIDTH`)
- `src/layout/kit/text.ts:134-151` (`clusters`)
**Traces To:** TICKET-007 acceptance criterion 6; the Known Hazard carried from rulers/number-lines-and-coordinate-graphs-ticket-003-security-review/SEC-001; DEL-002
**Description:**
`drawnCluster` counts only the code points listed in `ZERO_WIDTH` as marks. That table was built to estimate widths. It lists some combining-mark blocks (U+0300–036F, U+0591–05BD, U+064B–065F, some Devanagari signs, U+1AB0–1AFF, U+1DC0–1DFF, U+20D0–20FF, U+FE20–FE2F) and not others: Thai (U+0E31, U+0E34–0E3A, U+0E47–0E4E), Arabic U+0610–061A and U+06D6–06ED, Hebrew U+05BF–05C7, Cyrillic U+2DE0–2DFF, and more.

`clusters` does not attach an unlisted mark to its letter. Each such mark becomes its own cluster with the 667-unit fallback advance. So `wrap` sees a long word, splits it between marks and fills the line cap. The browser gives these marks no advance and stacks each line's marks on one point.

Probed through `createGraph` (`ok: true` in every case) and `<RulerGraph>` in Chromium:
- **Label "x" + 199 × U+0E38 (Thai sara u, Mn), 200 characters, on a 10 cm ruler with an object from 4.9 to 5.1:** `wrap` returns 2 lines of 23 code points. Chromium draws two columns of marks from the label down through the bar, both end marks, the number "5" and the ruler body (`ruler-probe.png`, `ruler-probe-zoom.png`).
- **The same text as a ruler title:** three columns run through the object's label "pencil", the bar and the ruler (`title-probe.png`).
- **Label "x" + 199 marks from U+0610–U+061A (Arabic):** two columns rise well above and below the label's one-line box (`ruler-probe-zoom.png`).

The delivered tests pass because they check estimated boxes. `tests/layout/ruler.test.ts:253` and `tests/layout/kit/text.test.ts:156-183` use only U+0316–U+0339 and a ZWJ chain of women.

The delivery record's Notes say SEC-001 "is fixed by DEL-002". That holds only for the marks the table lists.
**Impact:**
- The criterion's promise fails for combining marks outside the table: a ruler label within the limit "no longer covers the bar, the end marks or a number".
- The package still reports such a figure as clean. This is the carried SEC-001 effect, so the finding is open in substance while the record calls it closed.
**Recommendation:**
- **Classify marks by Unicode category, not by the width table.** In `drawnWord`, count a run of nonspacing and enclosing marks (`/\p{Mn}|\p{Me}/u`) across the whole word, not only inside the kit's clusters, and keep at most `MAX_STACKED_MARKS` in a row. Alternatively, make `clusters` attach every `\p{M}` code point to its letter, so the existing per-cluster bound sees them, and give nonspacing marks zero advance.
- **Test it.** Add Thai (U+0E38) and Arabic (U+0610–061A) runs to `tests/layout/kit/text.test.ts`, and the Thai label to `tests/layout/ruler.test.ts:253`. Assert the drawn mark run, not just the code-point count.
- **Correct the record.** Update the delivery record's Notes on SEC-001 when this is resolved. If the residual is deferred instead, say so there.
**Status:** Resolved
**Resolution:** Fixed (approved by Thomas, 2026-10-21). `drawnWord` (`src/layout/kit/text.ts`) counts marks along the whole word, not per cluster, and a mark is any nonspacing or enclosing mark (`/[\p{Mn}\p{Me}]/u`) or a `ZERO_WIDTH` modifier. "x" plus 199 Thai or Arabic marks now draws as "x" plus 3. Tests in `tests/layout/kit/text.test.ts` and `tests/layout/ruler.test.ts` (the Thai label on the ruler, clear of the bar and the numbers), and real Thai and Arabic text stays whole. Counting from the width table again fails 2 tests.

---

### CR-002: A joiner restarts the stacked-mark count, so marks broken up by ZWJs stack 12 high on one letter and reach the object's bar

**Severity:** Issue
**Location:** `src/layout/kit/text.ts:178-180` (`const mark = code !== ZWJ && within(ZERO_WIDTH, code); marks = mark ? marks + 1 : 0;`)
**Traces To:** TICKET-007 acceptance criterion 6 ("the text kit bounds the marks stacked on one letter"); DEL-002 ("at most 3 zero-width marks in a row after a character (a joiner is not counted as a mark)")
**Description:**
DEL-002 says a joiner is not counted as a mark. The code goes further: a ZWJ resets `marks` to 0, as a letter does. `clusters` also attaches whatever follows a ZWJ to the same cluster. So "x" followed by repeats of (three below marks + ZWJ) keeps every group of three. Only `MAX_CLUSTER_LENGTH` stops it: 16 code points are x, 3 marks, ZWJ, 3 marks, ZWJ, 3 marks, ZWJ, 3 marks. That is 12 marks on one letter, four times the stated bound.

As a 200-character ruler label (`createGraph` `ok: true`), `wrap` returns one line of 16 code points. That passes `tests/layout/ruler.test.ts:253`'s `<= MAX_CLUSTER_LENGTH` check. Chromium draws the 12 marks as a column from the "x" down into the top of the object's bar (`ruler-probe-b.png`). The estimated box is one line high.
**Impact:**
- The criterion's bound on marks stacked on one letter is 3 only when no joiner intervenes.
- A label at the limit covers part of the bar the ruler is read at, while the figure is reported clean.
**Recommendation:**
- **Keep the count across joiners.** Let a ZWJ keep the run's count (skip it in the mark logic) rather than reset it. Reset only on a code point that is neither a mark nor a joiner. The real-text cases in `tests/layout/kit/text.test.ts:175` are unaffected: in families, kisses and skin tones, a base character follows each joiner.
- **Test it.** Add the interleaved case to `tests/layout/kit/text.test.ts` and to `tests/layout/ruler.test.ts:253`, asserting at most `MAX_STACKED_MARKS` marks between base characters.
**Status:** Resolved
**Resolution:** Fixed (approved by Thomas, 2026-10-21). A joiner neither counts as a mark nor ends a run, so marks split by joiners are bounded at 3. Tested in both files; letting the joiner reset the run fails 2 tests.

---

### CR-003: The `@spec Coverage` table omits the GSV-REQ-054 annotation on `sharedProperties`, and `UNIT_TEXT_LIMIT` has no annotation of its own

**Severity:** Issue
**Location:**
- `src/core/definitions/shared.ts:41` (`// @spec GSV-REQ-040, GSV-REQ-043, GSV-REQ-045, GSV-REQ-052, GSV-REQ-054, DGP-REQ-002`)
- `src/core/definitions/shared.ts:31-33` (`// @spec GSV-REQ-052, GSV-REQ-053`, then `CALLER_TEXT_LIMIT`, then `UNIT_TEXT_LIMIT`)
- `.gener8v/specifications/graph-specification-and-vocabulary.md:253-254`
**Traces To:** Code Review step 8; `CLAUDE.md` Traceability ("on the line above it"); the delivery record's `## @spec Annotations`
**Description:**
- **The 054 row is short a location.** The code annotates `sharedProperties` with GSV-REQ-054. Neither the specification's GSV-REQ-054 row nor the delivery record's `@spec Annotations` table lists `shared.ts`:sharedProperties; both list only `src/core/schema.ts`:valueSchema, termUse. The `categories.ts` and `circle.ts` definitions set `maxLength` the same way and carry no 054 annotation, so the one in `shared.ts` is either a stale extra or the start of a set the table should list.
- **The 053 row names an unannotated line.** It names `shared.ts`:UNIT_TEXT_LIMIT, but the `@spec` line sits above `CALLER_TEXT_LIMIT`. A `grep -n "@spec"` audit lands on `CALLER_TEXT_LIMIT`, not on the unit limit.
**Impact:**
- The specification table and the code disagree for GSV-REQ-054, so a coverage audit from either side gives a different answer.
- The unit limit's trace depends on a reader knowing that one comment block covers two constants.
**Recommendation:**
- **GSV-REQ-054:** either add `src/core/definitions/shared.ts`:sharedProperties to the GSV-REQ-054 row and the delivery record's table, or drop `GSV-REQ-054` from the annotation at `shared.ts:41` and leave 054 to the schema generator.
- **UNIT_TEXT_LIMIT:** put `// @spec GSV-REQ-053` directly above it, and keep `// @spec GSV-REQ-052` above `CALLER_TEXT_LIMIT`.
**Status:** Resolved
**Resolution:** Fixed (approved by Thomas, 2026-10-21). `// @spec GSV-REQ-053` is now directly above `UNIT_TEXT_LIMIT`, and `// @spec GSV-REQ-052` above `CALLER_TEXT_LIMIT`. The GSV-REQ-054 row names `src/core/definitions/shared.ts`:sharedProperties.

---

### CR-004: The drawing now leaves out extra stacked marks from category names, which the published `name` description says are never cut

**Severity:** Observation
**Location:**
- `src/core/definitions/categories.ts:93` ("A long name wraps onto more lines; it is never cut short.")
- `src/layout/kit/value-scale.ts:152-203` (names drawn through `wrap`)
- `src/layout/kit/text.ts:221-224`
**Traces To:** DEL-002; GSV-REQ-009 (a plain-English description of every property); DGP Behaviors & Rules ("keep the whole name readable … rather than truncate it")
**Description:**
`wrap` now draws every word through `drawnWord`, including category names, which are wrapped without a line cap. A bar-graph category named "x" + 9 × U+0301 is drawn as "x" + 3 marks, and `createGraph` is `ok`; the text alternative still states the name whole.

The published `name` description still says the name "is never cut short". None of the other text descriptions mention that the drawing leaves out marks beyond three in a row or code points beyond 16 in a cluster. They mention only the line caps and their "…".
**Impact:** Small. It affects only text no reader can make out anyway, but a schema-only caller is told something the drawing no longer does.
**Recommendation:** Qualify the `name` description, for example "it is never cut short, except that a letter is drawn with at most three marks stacked on it". Or state the drawn-cluster rule once in the `wrap` contract and accept the description as written. Either way, record the choice.
**Status:** Resolved
**Resolution:** Fixed (approved by Thomas, 2026-10-21). The category `name` description reads "A long name wraps onto more lines.", without the never-cut claim; regenerated. The internal comment in `src/layout/kit/value-scale.ts:130` says so too.

---

### CR-005: The Verification Run's test evidence names 50 test files; the suite has 49

**Severity:** Observation
**Location:** `.gener8v/changes/graph-library/delivery/graph-specification-and-vocabulary-ticket-007-delivery.md:105`
**Traces To:** Code Review step 8b (Verification Run evidence)
**Description:** The record says "50 files, 1,388 tests each run". At the delivered commit `1b17b88`, and before it at `1d476c1`, `tests/` holds 49 `*.test.ts(x)` files. Three re-runs report "Test Files 49 passed (49)" and "Tests 1388 passed (1388)". The exit codes and the test count match the record; only the file count does not.
**Impact:** None on correctness. Evidence that does not match a re-run weakens the record as proof.
**Recommendation:** Correct the evidence to "49 files, 1,388 tests each run" when the record is next amended.
**Status:** Resolved
**Resolution:** Corrected (approved by Thomas, 2026-10-21) in the delivery record's Post-Review Amendments: 49 test files, as the sections above them are not rewritten.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Fixed | Marks counted by Unicode category along the whole word | `src/layout/kit/text.ts`, `tests/layout/kit/text.test.ts`, `tests/layout/ruler.test.ts` |
| CR-002 | Fixed | A joiner neither counts nor ends a run | same |
| CR-003 | Fixed | `@spec` above `UNIT_TEXT_LIMIT`; GSV-REQ-054 row | `src/core/definitions/shared.ts`, `.gener8v/specifications/graph-specification-and-vocabulary.md` |
| CR-004 | Fixed | Name description without "never cut short"; regenerated | `src/core/definitions/categories.ts`, `src/layout/kit/value-scale.ts`, `src/generated/*` |
| CR-005 | Fixed | Corrected in Post-Review Amendments | delivery record |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (CR-001..005 resolved)
**Notes:**
- **Final verdict** written in the main session on 2026-10-21, after resolution with the Engineer. Criterion 6 and the carried rulers NLC TICKET-003 SEC-001 are now met. Re-verification: `pnpm generate`, `lint`, `typecheck`, `build`, `check:dist`, `check:deps`, `check:images`, `size`, `publint`, `attw`, `bench` and `audit` exit 0; `pnpm test` passes 49 files and 1,389 tests on three runs.
- Findings-phase notes, kept for the record:
- This verdict is provisional: it is the findings phase only, and resolution happens in the main session with the user.
- The validator, schema and vocabulary work (GSV-REQ-052..054, criteria 1 to 5) is complete and verified.
- Criterion 6 and the carried rulers NLC TICKET-003 SEC-001 are only partly met: combining marks outside the kit's width table (CR-001) and marks broken up by joiners (CR-002) still draw over the ruler within the 200-character limit.
- The two SEC-002 closures (graph-library GSS TICKET-002, rulers NLC TICKET-002) are sound: the length bound is in the validator and is recorded in the delivery record's Notes.
- Resolving CR-001 and CR-002, or deferring them with a Known Hazard on a named ticket, plus CR-003's table fix, would support Approved with Notes.
