# TICKET-007: Limit caller text: 200 characters for titles and labels, 20 for a unit — Quality Review

## Summary

I reviewed the delivery of `graph-library/graph-specification-and-vocabulary/TICKET-007` on branch `ticket/gsv-007`: delivery commit `1b17b88` and the code-review resolution `ecffd20`, with `src/layout/kit/text.ts` as the code review left it. The review ran in the `quality-reviewer` agent, in a fresh context (findings phase only, 2026-10-21). The validator, schema and definition work is strong. It uses one constant per rule, follows the existing `maxLength` mechanism, gives one actionable `too_large` issue, and its tests walk every term and both schemas. The drawn-text bound in the text kit is where the concerns are. Its tests are written against its own constants, so changing the bound's value passes the suite. The module also now holds two definitions of a combining mark, and they disagree. Six findings: 0 Critical, 2 Concerns, 4 Suggestions.

- **QR-001 (Concern):** every test of the drawn bound compares against `MAX_STACKED_MARKS` or `MAX_CLUSTER_LENGTH` themselves. Setting them to 9 and 48, or the mark bound to 2, still passes all 462 layout and component tests.
- **QR-002 (Concern):** `drawnWord` treats a mark by Unicode category, while `clusters` and `advance` use only the width table. A Thai title that wraps can start its second line with a mark split off its letter.
- **QR-003 (Suggestion):** `wrap` now runs `drawnWord` on every word before it stops at `maxLines`. The known-flaky "stops early" timing test went from 145 ms to about 490 ms, against a 1,000 ms bound.
- **QR-004 (Suggestion):** `drawnWord` drops a ZWNJ after three marks and the fourth mark of pointed Hebrew, but its comment says ordinary text is unchanged. It also checks for the joiner twice.
- **QR-005 (Suggestion):** the one-cluster test texts are rebuilt inline in two files, and two of them use invisible literal characters. The ticket also added two duplicate imports.
- **QR-006 (Suggestion):** `UNIT_TEXT_LIMIT` has no documentation of its own.

**Files Reviewed:**
- `src/core/definitions/shared.ts`
- `src/core/definitions/categories.ts`
- `src/core/definitions/circle.ts`
- `src/core/issues.ts`
- `src/core/schema.ts`, `src/core/validate/structure.ts` (`@spec` annotations only)
- `src/layout/kit/text.ts`
- `src/layout/kit/value-scale.ts`
- `src/generated/description.ts`, `src/generated/schema.json`, `src/generated/tool-schema.json`, `src/generated/vocabulary.json`, `tests/fixtures/generated/description.ts`
- `tests/fixtures/plain-text.ts`
- `tests/core/validate-structure.test.ts`, `tests/core/schema-shape.test.ts`, `tests/core/schema-agreement.test.ts`
- `tests/core/circle.test.ts`, `tests/core/pictograph.test.ts`
- `tests/layout/kit/text.test.ts`, `tests/layout/ruler.test.ts`, `tests/layout/circle.test.ts`, `tests/layout/pictograph.test.ts`, `tests/layout/line-graph.test.ts`, `tests/layout/bar-graph.test.ts`
- `tests/react/Graph.test.tsx`
- Read for patterns, unchanged: `src/core/format.ts`, `src/core/definitions/types.ts`, `src/layout/ruler.ts`, `src/layout/kit/title.ts`, `src/layout/circle.ts`, `src/layout/pictograph.ts`, `src/layout/line-graph.ts`, `src/layout/bar-graph.ts`, `tests/fixtures/scene-geometry.ts`

**Findings:** 6
**Critical:** 0 | **Concerns:** 2 | **Suggestions:** 4

## Quality Assessment

### Code Organization

**Rating:** Adequate
**Notes:**
- **The definitions are well placed.** The limits live in one place: `CALLER_TEXT_LIMIT` and `UNIT_TEXT_LIMIT` (`src/core/definitions/shared.ts:32,34`) are imported by `categories.ts` and `circle.ts`. They sit on the shared `PropertySpec`s themselves, so the nested uses share them by identity, and the validator, schema and vocabulary all read the one `maxLength`. The ticket added no new mechanism: `checkValue` and `termUse` already handled `maxLength`.
- **The drawn bound is in the right place.** It sits in `wrap`, the one function every drawn caller text passes through, so no layout had to change.
- **The weakness is inside `src/layout/kit/text.ts`.** It now has two predicates for "this code point is a mark on the previous character" (`isStackingMark` at `:174`, and `ZERO_WIDTH` as used by `clusters` and `advance`), and they disagree (QR-002).
- **Considered and not raised:** `rotatedLines` (`src/layout/kit/value-scale.ts:151`) still starts from the raw `textWidth(name)`, while `widestWord` now measures drawn text. A rotated one-cluster name ("x" plus 199 × U+0E38) gets `labelWidth` 1,758.7 but `labelHeight` 33 and one line of 4 code points. A rotated slot's `labelWidth` is never read when drawing (`:283` reads it only for horizontal plots), so nothing visible changes.

### Readability

**Rating:** Adequate
**Notes:**
- **Strong in most places:**
  - Names say what they hold (`CALLER_TEXT_LIMIT`, `MAX_STACKED_MARKS`, `drawnWord`, `wordsOf`).
  - Every description states its limit in words, interpolated from the constant as the neighbouring limits are (`categories.ts:83`, `pictograph.ts:117`).
  - The doc comments on the new constants explain why each value was chosen.
  - The test names describe behaviour.
- **Where it falls short:**
  - `drawnWord`'s comment promises more than the code does: a ZWNJ and a fourth Hebrew mark are dropped, the joiner check is written twice, and line 191 compares UTF-16 units with a code-point limit without saying why (QR-004).
  - The text-kit tests use invisible literal characters (QR-005).
  - `UNIT_TEXT_LIMIT` has no doc comment of its own (QR-006).

### Error Handling

**Rating:** Strong
**Notes:**
- **One issue, with an actionable message.** Over-limit text produces exactly one `too_large` at its JSON Pointer path. The message states both numbers: "title has 201 characters, more than the limit of 200; use fewer." (`src/core/validate/structure.ts:127-130`; the message template is in `src/core/issues.ts:392`).
- **No cascades and no throws.** The failed path is added to `walk.failed`, so nothing downstream reports on it again. Characters are counted as code points, with a code-unit fast path (`charactersOver`, `src/core/validate/structure.ts:92-97`).
- **Updated documentation.** The `too_large` documentation now covers text (`src/core/issues.ts:83`).
- **Silent by design.** `drawnWord` has no failure paths. Its truncation is silent like the line caps' "…", and the text alternative still states the text whole.

### Test Coverage

**Rating:** Adequate
**Notes:**
- **Commands run, from the repository root:**

  | Command | Exit | Result |
  |---------|------|--------|
  | `pnpm lint` | 0 | — |
  | `pnpm typecheck` | 0 | — |
  | `pnpm exec vitest run --no-cache` (the `pnpm test` script with `--no-cache`), two runs | 0, 0 | 49 files and 1,389 tests passed on each run; no flake |
  | `pnpm build` | 0 | — |
  | `pnpm check:dist` | 0 | 16 built files scanned, no network APIs |
  | `pnpm publint` | 0 | — |
  | `pnpm attw` | 0 | — |
  | `pnpm bench` | 0 | 8 benchmarks; xy-graph p95 0.0365 ms |
  | `pnpm exec vitest run --no-cache tests/layout/kit/text.test.ts`, three runs | 0, 0, 0 | 29 passed; "stops early" 495, 494 and 486 ms |

  `pnpm generate` and `pnpm size` were not run, as instructed. `check:deps`, `check:images` and `audit` were not re-run; the code review re-ran them with exit 0.
- **Strong for the validator and the schema:**
  - `tests/core/validate-structure.test.ts:797` walks every `kind: "string"` term in every registered type and scoped map, nested objects and lists included. It checks each `maxLength` and that each description states it.
  - `:812` and `:827` cover 200/201, 20/21, a nested ruler label and 200/201 emoji, and check the exact message.
  - `tests/core/schema-shape.test.ts:389` walks every text schema in both schema profiles.
  - `tests/core/schema-agreement.test.ts` generates texts at each limit and one over, in letters and emoji.
  - `tests/react/Graph.test.tsx:477` checks refusal across seven terms and five components.
  - The validator limits are pinned by value: on a scratch copy, setting `UNIT_TEXT_LIMIT` to 40 fails 2 tests (generated-file freshness and the refusal test).
- **Good test design:** the rewritten pictograph test (`tests/core/pictograph.test.ts`) compares 200 with 199 characters. That shows the label is stated once without needing a size threshold.
- **Weaker for the drawn bound:**
  - Its tests compare against the bound's own constants.
  - The scene checks measure text one line high.
  - The real-text samples never put three marks on one letter. The Vietnamese and "naïve café" samples are precomposed.
  - So the value of the SEC-001 bound is untested in both directions (QR-001).
- **Considered and not raised:**
  - The vocabulary test (`tests/core/schema-shape.test.ts:400`) samples two terms. `termUse` is one generic function and the definition walk covers every term, so a gap limited to the vocabulary is unlikely.
  - The refusal test's message regex (`tests/react/Graph.test.tsx:493`, `(200|20)`) does not tie each case to its own limit. `validate-structure.test.ts:812` pins the exact messages.
- **Probes and mutations.** All ran on copies under `/private/tmp/claude-501/-Users-thomas-Repositories-gener8v-gener8v-tools-education-graph-generator/90a37181-7c56-4f53-87c3-a87caf6952a9/scratchpad/quality-review-gsv007/`: `mutant/` is a copy of the repository without `.git`, `.gener8v`, `dist` or `node_modules`, with `node_modules` symlinked. The working tree was not modified.

### Observability & Operability

**Rating:** Adequate
**Notes:**
- **The issue is the signal.** This is a library with no logging or metrics, by design (no telemetry, `.gener8v/context.md`), and the ticket keeps to that. Over-limit text reaches callers as a structured issue with code, path and message, so a model or an author can act on it, and the published `maxLength` lets them avoid it in the first place.
- **No signal for omitted marks.** When the drawing leaves out stacked marks, nothing reports it, which matches the line caps. The text alternative keeps the whole text. This is acceptable for text no reader could make out.
- Nothing to flag.

## Findings

### QR-001: The drawn-text bounds are tested only against their own constants, so loosening or tightening them passes the suite

**Category:** Testing
**Severity:** Concern
**Location:**
- `tests/layout/kit/text.test.ts:156-198` (the one-cluster `describe`)
- `tests/layout/ruler.test.ts:253-269`
- The bounds: `src/layout/kit/text.ts:158` (`MAX_STACKED_MARKS`) and `:165` (`MAX_CLUSTER_LENGTH`)

**Description:**
- **The assertions follow the constants.** Every check on the drawn bound is written in terms of the constants:
  - `toEqual([`x${belowMarks(MAX_STACKED_MARKS)}`])` at `:162`
  - `toHaveLength(1 + MAX_STACKED_MARKS)` at `:182`
  - `toBeLessThanOrEqual(MAX_STACKED_MARKS)` and `toBeLessThanOrEqual(MAX_CLUSTER_LENGTH)` in the ruler test
- **The scene checks cannot see a column of marks.** The ruler test's `outside` and `collisions` (`tests/layout/ruler.test.ts:49-53`, `:60`) measure each text line with `textWidth`, one line high (`tests/fixtures/scene-geometry.ts:66-68`).
- **The real-text samples do not reach the bound.** The "leaves real text whole" samples (`text.test.ts:189-193`) never put three marks on one letter. "Tiếng Việt ệ" and "naïve café" are precomposed (U+1EBF, U+1EC7), and the Thai, Arabic and Devanagari samples carry at most two marks per letter.
- **Mutations on the scratch copy.** I ran all of `tests/layout` and `tests/react` (19 files, 462 tests):
  - `MAX_STACKED_MARKS = 9` and `MAX_CLUSTER_LENGTH = 48`: all 462 pass.
  - `MAX_STACKED_MARKS = 2`: all 462 pass. Yet the constant's own doc says Devanagari signs stack up to three, and the Hindi word "बढ़ें" (ढ + nukta + vowel sign e + anusvara, three Mn marks) is drawn whole today only because the bound is 3.
  - `12` and `48`: one test fails, only because its input has 9 marks (`:164`).
- **The validator limits are pinned, by contrast.** Setting `UNIT_TEXT_LIMIT` to 40 fails 2 tests.

**Impact:**
- **Raising the bound would pass unnoticed.** The value 3 is the substance of the carried SEC-001 fix (DEL-002). CR-002's Chromium probe showed that 12 marks on one letter reach the ruler's bar. An edit that raises the bound, for example to keep cantillated Hebrew whole (QR-004), would bring the column back with a green suite.
- **Lowering it would too.** That would cut real Hindi text in the drawing.
- **The delivery's mutation did not test the value.** "`wrap` without the drawn bound, 3 tests fail" checked that the bound exists, not what it is.

**Recommendation:**
- **Pin the decision in literal terms in `tests/layout/kit/text.test.ts`.** Assert that "x" plus 199 marks draws as "x" plus exactly 3 marks, and that the 66-woman chain draws as exactly 16 code points. Cite DEL-002 and rulers NLC TICKET-003 SEC-001 beside the literals. Alternatively, use `expect(MAX_STACKED_MARKS).toBe(3)` and `expect(MAX_CLUSTER_LENGTH).toBe(16)` with that comment.
- **Hold the lower side.** Add a real three-mark word to the real-text test: "बढ़ें", and decomposed Vietnamese such as `"Vie\u0323\u0302t"`. Both are drawn whole today (probe).
- **Add a literal ceiling to the ruler test.** Keep the constant-relative assertion, and also assert `<= 3` marks.

**Status:** Fixed
**Resolution:** Fixed (approved by Thomas, 2026-10-21). The bounds are pinned from both sides. `REAL_STACKED_TEXT` (`tests/fixtures/plain-text.ts`) holds real words with the most marks and the longest clusters scripts use (Vietnamese, Hindi "बढ़ें", pointed Hebrew with a cantillation mark, Thai, Arabic, a kiss, the flag of England, a family) and each must draw whole; a run of 199 marks draws exactly 4, and a joined chain exactly 16 code points. `MAX_STACKED_MARKS` at 9 or 3, or `MAX_CLUSTER_LENGTH` at 48, now fails 2 or 3 tests.

---

### QR-002: Two definitions of a combining mark now live in `src/layout/kit/text.ts`, and they disagree, so `wrap` still splits Thai marks from their letter

**Category:** Maintainability
**Severity:** Concern
**Location:**
- `src/layout/kit/text.ts:173-174` (`STACKING_MARK`, `isStackingMark`)
- `src/layout/kit/text.ts:28-46` (`ZERO_WIDTH`), `:85-93` (`advance`), `:134-151` (`clusters`)
- `wrap`'s contract at `src/layout/kit/text.ts:202-203`

**Description:**
- **Two predicates for one concept.** Since CR-001 was resolved, `drawnWord` decides what is a mark by Unicode category (`\p{Mn}`, `\p{Me}`) or `ZERO_WIDTH`. `clusters` and `advance` still use `ZERO_WIDTH` alone.
- **They give opposite answers for the same code points.** In `drawnWord`, the module knows that a Thai mark, a Hebrew mark in U+05BF–05C7 or an Arabic mark in U+0610–061A belongs to the letter before it. In `clusters` and `advance`, it treats the same code point as a stand-alone character 667 units wide.
- **The comment records the gap rather than closing it.** `drawnWord`'s comment says "marks the width table does not know (each its own cluster)".
- **Probe, a Thai title.** The title is written as Thai is written, without spaces between words: "จำนวนนักเรียนที่เดินไปโรงเรียนในแต่ละวันของสัปดาห์นี้ตามที่ครูบันทึกไว้", 72 code points. `wrap(title, 560, 20, 3)` returns two lines. The second starts with U+0E31 (THAI CHARACTER MAI HAN-AKAT, Mn), torn from the "ว" that ends the first line.
- **The same happens through `createGraph`.** A bar graph with that title draws 1 of its 11 text nodes starting with a combining mark.
- **Thai widths are overestimated.** `textWidth("ผู้", 14)` is 30.82, against 10.27 for "ผ", so a Thai letter with two marks is estimated three times as wide as the letter alone.
- **Scope.** The line split itself predates the ticket: the output is identical at `1d476c1`. What the ticket added is the second definition beside the first.

**Impact:**
- **`wrap` breaks its own contract for Thai.** Its documentation says it never splits "inside a character with its marks". Thai has no spaces between words, so any Thai title or label that wraps can begin a line with an orphaned mark. A browser draws that on a dotted circle or out of place.
- **The two predicates will drift further.** Every later fix to one must be remembered in the other. QR-004's ZWNJ is a first example.

**Recommendation:**
- **Use one predicate.** Have one `isMark(code, char)` used by `clusters` (to attach the mark), `advance` (zero advance for `Mn` and `Me`) and `drawnWord`. `drawnWord` then loses its caveat, and `wrap`'s contract holds in every script.
- **Test it.** Add a narrow-width Thai case to "splits an over-long word only between clusters" (`tests/layout/kit/text.test.ts:86-95`).
- **Or defer it.** Zero advance narrows the width estimates for those scripts and so changes how their text is laid out. If that is outside this ticket, defer it to a named ticket with a Known Hazard citing the Thai probe.

**Status:** Fixed
**Resolution:** Fixed (approved by Thomas, 2026-10-21). One test, `isMark` in `src/layout/kit/text.ts` (any `\p{Mn}` or `\p{Me}`, and the skin-tone modifiers), is used by `advance` (a mark has no width), `clusters` (a mark stays with its letter) and `drawnWord` (the bound). A wrapped Thai title never starts a line with a mark, and Thai and Arabic marks have no width (tests in `tests/layout/kit/text.test.ts`). Removing the `clusters` use alone fails no test: with marks at zero width, a split never lands on one; it is kept so the kit has one definition.

---

### QR-003: `wrap` now does the drawn-word work for every word before it stops at `maxLines`

**Category:** Performance
**Severity:** Suggestion
**Location:**
- `src/layout/kit/text.ts:221-225` (`.map(drawnWord)`)
- `src/layout/kit/text.ts:259` (`clusters(word)` again, for a word too wide for a line)

**Description:**
- **The early stop no longer saves the new work.** The `map` runs `drawnWord` on every word before the line loop starts. That is a code-point pass, a `clusters` pass and two string builds per word, so the work after the lines are full is no longer skipped. A word too wide for a line is then clustered a second time at `:259`.
- **Probe timings.** Medians of 9 runs under `tsx`, against copies of the text kit at `1d476c1` and at `HEAD`:

  | Input | At `1d476c1` | At `HEAD` |
  |-------|--------------|-----------|
  | 2 MB of words, `maxLines` 4 | 15.8 ms | 117.6 ms |
  | 2 MB of "@", `maxLines` 4 | 101.5 ms | 232.5 ms |
  | A 200-character title | 2.8 µs | 11.1 µs |

- **The timing test has lost most of its margin.** "stops early, so caller-sized text costs little" (`tests/layout/kit/text.test.ts:143-149`) asserts under 1,000 ms per input:
  - At `1d476c1`, run alone in the scratch copy: 145 ms.
  - At `HEAD`, run alone: 486–495 ms.
  - At `HEAD`, under the full suite: 735 ms.

  The text kit's timing tests are already known to flake under load: the rulers NLC TICKET-003 delivery recorded one failing once under the full suite.

**Impact:**
- **No cost for descriptions.** Validated caller text is now at most 200 characters, and 11 µs per call is negligible.
- **The cost lands on the kit's own timing tests.** Their margin has fallen from about 7× (alone, at `1d476c1`) to about 2× alone and under 1.5× under the full suite, so the known flake becomes more likely in CI.
- **The doc comment now overstates the saving.** The comment at `:206-208` ("Wrapping stops once the lines are full") still holds for the lines returned, but not for the work done.

**Recommendation:**
- **Draw each word inside the loop**, after the `if (cut) break;` check, instead of mapping every word up front. In a scratch copy:
  - The 2 MB of words takes 10.3 ms.
  - The output is identical on sampled inputs (words, one-cluster texts and real text, at `maxLines` 1, 2, 4 and unbounded).
  - All 462 layout and component tests pass.
  - "stops early" falls to about 390 ms. Most of what remains is the single 2 MB word.
- **To recover that too**, let `drawnWord` return its clusters, so the split loop reuses them instead of clustering the word twice.

**Status:** Fixed
**Resolution:** Fixed (approved by Thomas, 2026-10-21). `wrap` bounds each word as it reaches it, inside its loop, so it stops early again; the "stops early" test passes alone and in three full runs.

---

### QR-004: `drawnWord` changes some ordinary text its comment says it leaves alone

**Category:** Readability
**Severity:** Suggestion
**Location:** `src/layout/kit/text.ts:167-174` (`STACKING_MARK`, `isStackingMark` and their comment), `:183-192` (`drawnWord`)

**Description:**
- **A ZWNJ counts as a mark.**
  - `isStackingMark` excludes only the joiner (U+200D). `ZERO_WIDTH` (`:40`) also covers U+200C, the zero-width non-joiner, which the plain-text policy allows (`src/core/format.ts:91-92`).
  - Probe: meem + fatha + shadda + fathatan + ZWNJ + heh (valid input) is drawn without the ZWNJ. The two letters then join in the drawing where the writer kept them apart.
  - A run of ZWNJs is cut at three.
- **Cantillated Hebrew loses a mark.** Pointed Hebrew with cantillation (shin + shin dot + dagesh + qamats + an accent, four marks, valid input) loses its accent in the drawing.
- **The joiner check is written twice.** `isStackingMark` tests `code !== ZWJ`, and its only caller (`:187`) already skips the joiner.
- **Line 191 reads like a unit mix-up.** It compares `cluster.length` (UTF-16 units) with `MAX_CLUSTER_LENGTH` (code points). This is correct as a fast path, because a string never has fewer units than code points, but nothing says so.

**Impact:**
- **Small in practice.** The text alternative states the text whole, and these sequences are rare in curriculum text.
- **The comments overstate the guarantee.** "Unchanged for ordinary text" and the `STACKING_MARK` comment ("a joiner … is not a mark") promise more than the code does.
- **Nothing shows where the bound starts to cut.** Whoever next adjusts the bound has no test for it (QR-001).

**Recommendation:**
- **Handle both joiners in one place.** In `drawnWord`, treat U+200C and U+200D alike: neither counts as a mark nor ends a run, as CR-002 settled for the joiner. Drop the inner check in `isStackingMark`.
- **Record the known loss.** State in `MAX_STACKED_MARKS`'s doc that four or more marks on one letter, as in cantillated Hebrew, are cut in the drawing. Raising the bound instead is a Product Owner decision, since it trades against SEC-001.
- **Test the ZWNJ case**, for example in the real-text test.
- **Make line 191 explain itself.** Comment the fast path, or split it into a named check.

**Status:** Fixed
**Resolution:** Fixed (approved by Thomas, 2026-10-21). `MAX_STACKED_MARKS` is 4, so pointed Hebrew with a cantillation mark is drawn whole. A joiner, U+200C or U+200D, is one check (`joiner`), and neither counts as a mark nor restarts a run; tested, and letting U+200C restart the run fails a test. The UTF-16 length shortcut is explained, and the comment now says real text is drawn as written.

---

### QR-005: The one-cluster test texts are rebuilt inline, two with invisible literal characters, and the ticket added duplicate imports

**Category:** DRY
**Severity:** Suggestion
**Location:**
- `tests/layout/kit/text.test.ts:158`, `:168`, `:172`, `:176`, `:184`, `:196`
- `tests/layout/ruler.test.ts:254-257`
- Imports at `tests/layout/ruler.test.ts:6-7` and `tests/core/pictograph.test.ts:4`, `:9`

**Description:**
- **The same texts are built in several places.** Four one-cluster texts are built inline across two files. The marked letter, the Thai run and the joiner-split run are each built twice, and the 66-woman joiner chain three times. Meanwhile the ticket put its at-limit words generator, `wordsOf`, in `tests/fixtures/plain-text.ts` so it could be shared.
- **Two lines use invisible characters.** `text.test.ts:168` and `:196` join with a literal U+200D: the call shows on screen as `.join("")`. `:172` repeats a literal U+FE0F. The same file writes these as escapes elsewhere (`:87`, `:90`, `:184`), as does `ruler.test.ts:255`. These are the only literal U+200D or U+FE0F characters in `src/` and `tests/` outside a real-text sample.
- **The ticket added two duplicate imports.** Each is a second import line from a module the file already imports:
  - `tests/layout/ruler.test.ts:6-7`, from `src/core/definitions/shared`
  - `tests/core/pictograph.test.ts:4` and `:9`, from `tests/fixtures/plain-text`

**Impact:**
- **Later tests have to copy the builders.** The ticket's Known Hazard asks every type's label tests to be checked against one-cluster text. Without a shared set, a later type's test has to copy these builders, and may copy the wrong one. The ruler test calls its texts "at the limit", but the chain is 131 code points, not 200.
- **The invisible joiners mislead.** In a test, an invisible joiner looks like a join on the empty string. Characters like it are exactly what the package's plain-text policy is about.

**Recommendation:**
- **Share the texts.** Export `oneClusterTexts(characters)` from `tests/fixtures/plain-text.ts`, next to `wordsOf`. It should return the four texts at the given length, written with `\u` escapes. Use it in both files.
- **Merge the duplicate imports.**

**Status:** Fixed
**Resolution:** Fixed (approved by Thomas, 2026-10-21). `oneClusterTexts(n)` in `tests/fixtures/plain-text.ts`, built from code points, gives the Latin, Thai, Arabic, joiner-split and joined-women texts; `tests/layout/kit/text.test.ts` and `tests/layout/ruler.test.ts` use it, with no invisible literals. The duplicate imports in `tests/layout/ruler.test.ts` and `tests/core/pictograph.test.ts` are merged.

---

### QR-006: `UNIT_TEXT_LIMIT` has no documentation of its own

**Category:** Readability
**Severity:** Suggestion
**Location:** `src/core/definitions/shared.ts:23-34`

**Description:**
- **The one doc block reaches only `CALLER_TEXT_LIMIT`.** One JSDoc block describes both limits, but TypeScript attaches it to the next declaration, `CALLER_TEXT_LIMIT`. Since CR-003 put a `// @spec` line above each constant, `UNIT_TEXT_LIMIT` (`:34`) has no doc, and hovering it shows nothing.
- **The rationale is about the 200 limit.** The block's reasoning (a drawn title shows 3 lines and a label 2 to 4, about 200 characters) explains 200, not 20.
- **The neighbouring limits each have their own doc**: `CATEGORY_LIMIT` (`src/core/definitions/categories.ts:25`) and `CATEGORY_NAME_LIMIT` (`:28-33`).
- **A related constant shares the value.** `UNIT_MAX_PLAIN_LENGTH` (`src/core/format.ts:198`) is also 20. It is the length past which the text alternative quotes a unit, and it still applies to the pictograph's 200-character `valueUnitLabel`. Nothing at either constant says how the two relate.

**Impact:** Minor. A reader of the constant finds no statement of what it bounds (the circle's `unit`, GSV-REQ-053) or why the value is 20.

**Recommendation:** Give each constant its own JSDoc. The unit one should say what it bounds and why 20, and note that `UNIT_MAX_PLAIN_LENGTH` is a separate rule that happens to share the value.

**Status:** Fixed
**Resolution:** Fixed (approved by Thomas, 2026-10-21). `UNIT_TEXT_LIMIT` has its own doc comment (why a unit is held to 20), and `CALLER_TEXT_LIMIT`'s is about the 200 limit only.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fixed | Bounds pinned by real text and exact cuts | `tests/fixtures/plain-text.ts`, `tests/layout/kit/text.test.ts` |
| QR-002 | Fixed | One `isMark` for widths, clusters and the bound | `src/layout/kit/text.ts`, `tests/layout/kit/text.test.ts` |
| QR-003 | Fixed | Words bounded inside `wrap`'s loop | `src/layout/kit/text.ts` |
| QR-004 | Fixed | 4 marks; one joiner check for U+200C and U+200D; comments | `src/layout/kit/text.ts`, `tests/layout/kit/text.test.ts` |
| QR-005 | Fixed | `oneClusterTexts`, `REAL_STACKED_TEXT`; imports merged | `tests/fixtures/plain-text.ts`, `tests/layout/kit/text.test.ts`, `tests/layout/ruler.test.ts`, `tests/core/pictograph.test.ts` |
| QR-006 | Fixed | `UNIT_TEXT_LIMIT` documented | `src/core/definitions/shared.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (QR-001..006 fixed)
**Notes:**
- **Final verdict** written in the main session on 2026-10-21, after resolution with the Engineer. Re-verification: `pnpm generate`, `lint`, `typecheck`, `build`, `check:dist`, `check:deps`, `check:images`, `size`, `publint`, `attw`, `bench` and `audit` exit 0; `pnpm test` passes 49 files and 1,391 tests on three runs.
- **No Critical findings.** Tests exist for every acceptance criterion, and every verify command exits 0.
- **QR-001 and QR-002** were the two to settle (findings phase); both are fixed.
