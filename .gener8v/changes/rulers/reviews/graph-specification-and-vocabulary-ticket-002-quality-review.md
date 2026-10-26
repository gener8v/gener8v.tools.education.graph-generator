# TICKET-002: Publish the ruler's vocabulary terms and schema — Quality Review

## Summary

I reviewed `rulers/graph-specification-and-vocabulary/TICKET-002` at HEAD (delivery `5e1ad02`). The delivery changes no behaviour: a comment-only `@spec` extension in `src/core/definitions/ruler.ts` and one test block (six tests) in `tests/core/schema-shape.test.ts`, run against the real registered `definitions`. The block is small, readable and follows the file's patterns (`getVocabulary()`, `propertiesIn`, `toolForm`, `ajv`). Lint, typecheck and the full suite pass. Mutating the real ruler definition in a scratch copy shows the structural claims are pinned (unit and division lists, `appliesWhen`, `required`, the unit and length wording). The text claims are pinned less firmly. There are 3 findings: 0 Critical, 0 Concerns and 3 Suggestions:
- The value descriptions are held only to "longer than five characters", and several limit claims in the test title are not asserted (QR-001).
- The unit/division shape is now asserted in three places (QR-002).
- The "centimetre" test reads committed files only and is narrower than its name (QR-003).

**Reviewer:** `quality-reviewer` agent, fresh context (findings phase only, 2026-10-25)
**Delivery Record:** `.gener8v/changes/rulers/delivery/graph-specification-and-vocabulary-ticket-002-delivery.md`
**Calibration:** `.gener8v/changes/rulers/reviews/graph-specification-and-vocabulary-ticket-001-quality-review.md`

**Files Reviewed:**
- `tests/core/schema-shape.test.ts` (`:407-466`, the new block; `:1-60` helpers; `:303-310` and `:332-366` for neighbouring patterns)
- `src/core/definitions/ruler.ts` (`:56-125`, the `@spec` line at `:59` and the six term definitions)
- `.gener8v/specifications/graph-specification-and-vocabulary.md` (`@spec Coverage` rows `:255-257`)
- Read for pattern consistency: `tests/core/ruler-definition.test.ts` (`:30-70`), `tests/core/definitions.test.ts`, `examples/ruler.json`

**Findings:** 3
**Critical:** 0 | **Concerns:** 0 | **Suggestions:** 3

## Quality Assessment

### Code Organization

**Rating:** Adequate
**Notes:**
- **Placement.** The block sits in the file that already tests the published schemas and vocabulary, beside the "caller text limits" block, and it describes itself with requirement and ticket IDs as its neighbours do.
- **Source.** The terms and limits are read from the real `getVocabulary()` output, so the test checks what is published. The block does not build its own registry.
- **Overlap.** The unit/division shape is asserted again in `tests/core/ruler-definition.test.ts` and, for the fixture, in `tests/core/schema-shape.test.ts:332` (QR-002).

### Readability

**Rating:** Strong
**Notes:**
- **Names state behaviour**, and the shared helpers (`propertiesIn`, `graphTypes`, `toolForm`) are reused, not rewritten.
- **The regular-expression pins are legible** (`/1 to 30 for centimeters, 1 to 12 for inches/`) and fail with the term name via the `expect(x, term)` messages.
- **The `@spec` line** on `defineRulerProperties` is now 170 characters. It matches the line's earlier style, and lint passes.

### Error Handling

**Rating:** Strong
**Notes:**
- There is no production logic in this delivery.
- The tests print the ajv errors on failure (`JSON.stringify(ajv.errors)`), and the guard `if (!result.valid)` in the `unknown_graph_type` test makes a wrong result fail, not skip.

### Test Coverage

**Rating:** Adequate
**Notes:**

**Commands run at HEAD:**

| Command | Exit | Result |
|---|---|---|
| `pnpm lint` | 0 | `eslint .`, no output |
| `pnpm typecheck` | 0 | `tsc --noEmit`, no output |
| `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache` (twice) | 0, 0 | 53 files and 1,473 tests passed, both runs |
| `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache tests/core/schema-shape.test.ts` | 0 | 44 passed |

`pnpm generate`, `pnpm size` and `pnpm install` were not run, as instructed. The six new tests use no randomness or timing.

**Mutation results.** Mutants were made in a scratch copy of `src`, `tests`, `scripts` and `examples` in the session scratchpad, and each ran against the new block only. No repository file was edited.

| Mutation of `src/core/definitions/ruler.ts` | Result |
|---|---|
| `rulerUnit` description loses "centimeters or inches" | caught by the terms test |
| `rulerUnit` becomes `required: false` | caught by the shape test |
| `smallestDivision.appliesWhen` also lists "centimeters" | caught by the shape test |
| `half` value description says "quarter" | survives (QR-001) |
| `quarter` value description becomes `xxxxxxxxxxx` | survives (QR-001) |
| `start` description loses "Any mark from 0 to the ruler's length" | survives (QR-001) |
| `end` description loses "given as the start is" | survives (QR-001) |
| `start` becomes `required: false` | survives the block (QR-001) |
| `measuredObject` description loses its "to be measured" sentence | survives (QR-001) |
| `length` description gains "(centimetres)" | survives the block (QR-003) |

In the scratch copy, the surviving description changes would still fail `are committed exactly as a fresh build writes them` (`tests/core/schema-shape.test.ts:304`), because the committed generated files would no longer match. Every survivor therefore costs a regeneration and not a silent change. The block is not what pins the text.

### Observability & Operability

**Rating:** Adequate
**Notes:** This is a library with no logger. The delivery adds tests and a comment, so there is no operational surface.

## Findings

### QR-001: The terms test's title promises that every definition states its limit, but value descriptions are held only to "longer than five characters" and several limit and shape claims are unpinned

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/core/schema-shape.test.ts:411-422` (the terms test) and `:424-440` (the value-description test, line `:437`)
**Description:**
- **Value descriptions.** The loop asserts `text.length > 5` for each unit and division, and that the keys equal `values`. Swapping the `half` text for the `quarter` text, or replacing `quarter`'s with `xxxxxxxxxxx`, passes the block.
- **The title's claim.** "each with a definition that states its limit" is pinned for `rulerUnit`, `length`, `smallestDivision`, `start` and `end`. For `end` only "after its start" is pinned, not "given as the start is". `start`'s "Any mark from 0 to the ruler's length" is not pinned. `measuredObject` gets only `length > 10`.
- **`required`.** `start`'s and `end`'s `required: true` is not asserted anywhere in the block.
- **`> 10` and `> 5`.** These thresholds are arbitrary, and a non-empty check would say the same thing.
**Impact:**
- GSV-REQ-046..048 are about plain-English definitions. A wrong or placeholder definition passes the block and is caught only by the committed-files comparison, which any regeneration satisfies.
- The only protection is a reviewer reading the regenerated diff.
**Recommendation:**
- Assert each value description against the exact text, as the ticket-001 tests do for the condition sentence (`tests/core/schema-shape.test.ts:359-366`), or at least that each one mentions its own value ("half", "quarter", "eighth", "sixteenth", "centimeter", "inch").
- Assert a limit phrase for `end` and `start` ("from 0 to the ruler's length") and add `required: true` to the `start`/`end` `toMatchObject`.
- Either narrow the title to what is pinned or pin `measuredObject`'s role ("lying along the ruler").

**Status:** Fixed
**Resolution:** Approved: each unit and division description must name its own value; `measuredObject` ("lying along the ruler"), `start` ("from 0 to the ruler's length") and `end` ("given as the start is") limits pinned; `start`/`end` `required: true` asserted; the arbitrary length thresholds dropped. Mutants (swapped division texts, `start` optional, the range sentence removed) each fail. Recorded in the delivery record's Post-Review Amendments (2026-10-26).

---

### QR-002: The unit/division shape and `appliesWhen` are now asserted in three places

**Category:** DRY
**Severity:** Suggestion
**Location:**
- `tests/core/schema-shape.test.ts:424-440`;
- `tests/core/ruler-definition.test.ts:44-50` (also asserts the unit and division lists, `required` and `appliesWhen`, and the shared `label` and `color` on `measuredObject`);
- `tests/core/schema-shape.test.ts:332-347` (the same shape for the test-only fixture)
**Description:**
- **The same assertion.** `toMatchObject({ kind: "enum", required: false, values: ["half", "quarter", "eighth", "sixteenth"], appliesWhen: { term: "rulerUnit", values: ["inches"] } })` appears in the new block and in `ruler-definition.test.ts` against the same real definition.
- **What is new.** Only the `valueDescriptions` keys check and the vocabulary wording are new in the block.
- **The label limit.** The label test also repeats `CALLER_TEXT_LIMIT` pins that the "caller text limits" block above it already makes for every type with a label, and then asserts `CALLER_TEXT_LIMIT` is 200.
**Impact:**
- A change to the division list, or to the way a condition is published, edits three tests for one fact.
- Two of the three do not say which one is the home for the shape.
**Recommendation:**
- Keep the shape in `ruler-definition.test.ts`, which tests the definition, and let the new block assert only what is published: the vocabulary text and `valueDescriptions`.
- Or note in the block that it re-states the shape from the published side on purpose.

**Status:** Fixed
**Resolution:** Approved: the block keeps only what publishing adds (vocabulary text, values and value descriptions, the published `appliesWhen`, the label's `maxLength`); `kind`/`required` shape assertions and `CALLER_TEXT_LIMIT === 200` dropped, with a comment pointing to `tests/core/ruler-definition.test.ts`. Recorded in the delivery record's Post-Review Amendments (2026-10-26).

---

### QR-003: The "centimetre" test reads only the committed files, is narrower than its name, and is only as fresh as the "committed exactly" test

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/core/schema-shape.test.ts:461-465`, `:303-309`
**Description:**
- **Committed files only.** The test reads each committed generated file from disk. It never looks at the definitions. A British spelling added to a definition fails it only after `pnpm generate` is run. Before that, the failure is in "are committed exactly as a fresh build writes them".
- **Narrow pattern.** Its name says "the British spelling", but it checks one stem, `/centimetre/i`. "Metre", "colour" or "grey" would pass. The vocabulary's spelling rule (GSV-REQ-015's US spelling) is wider than the one word.
- **The mutant.** Adding "(centimetres)" to the `length` description passes the whole block in the scratch copy.
**Impact:** The test is a regression guard for one string, in files the next generation overwrites. It would help more as a check of `getVocabulary()` and `getSchema()` output, which cover the definitions without a regeneration.
**Recommendation:**
- Check `JSON.stringify(getVocabulary())`, `getSchema()` and `getToolSchema()`, so the failure is in the definition's own test. Keep the file loop if the generated types matter.
- Rename the test to "offers the word 'centimetre' nowhere", or widen the pattern to the spellings the project actually forbids.

**Status:** Fixed
**Resolution:** Approved: the spelling test checks `getVocabulary()`, `getSchema()` and `getToolSchema()` as well as the committed files, for `/(centi|milli)?metre/i`, renamed to what it checks. A British unit in the definition fails it without a regeneration. "dark grey" in the pictograph person image's description (outside this ticket) is noted in the delivery record for a separate fix. Recorded in the delivery record's Post-Review Amendments (2026-10-26).

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Approve | Approved: each unit and division description must name its own value; `measuredObject` ("lying along the ruler"), `start` ("from 0 to the ruler's length") and `end` ("given as the start is") limits pinned; `start`/`end` `required: true` asserted; the arbitrary length thresholds dropped. Mutants (swapped division texts, `start` optional, the range sentence removed) each fail. | tests/core/schema-shape.test.ts |
| QR-002 | Approve | Approved: the block keeps only what publishing adds (vocabulary text, values and value descriptions, the published `appliesWhen`, the label's `maxLength`); `kind`/`required` shape assertions and `CALLER_TEXT_LIMIT === 200` dropped, with a comment pointing to `tests/core/ruler-definition.test.ts`. | tests/core/schema-shape.test.ts |
| QR-003 | Approve | Approved: the spelling test checks `getVocabulary()`, `getSchema()` and `getToolSchema()` as well as the committed files, for `/(centi|milli)?metre/i`, renamed to what it checks. A British unit in the definition fails it without a regeneration. "dark grey" in the pictograph person image's description (outside this ticket) is noted in the delivery record for a separate fix. | tests/core/schema-shape.test.ts |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0
**Notes:**
- All three Suggestions were fixed in resolution with the Engineer (Thomas Eaves), 2026-10-26, and recorded in the delivery record's Post-Review Amendments.
- The Verification Run passes after the fixes. One of eleven full `pnpm test` runs crashed a Vitest worker (SIGSEGV) in `tests/react/ruler.test.tsx`, a file this ticket does not touch; 30 isolated runs of that file and the other ten full runs passed. See the delivery record.
