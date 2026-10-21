# TICKET-007: Limit caller text: 200 characters for titles and labels, 20 for a unit

**Change:** graph-library
**Capability Area:** Graph Specification & Vocabulary (graph-specification-and-vocabulary)
**Specification:** specifications/graph-specification-and-vocabulary.md

**Summary:** Give every caller-written text term a published length limit: 200 characters for titles, labels and names, 20 for a unit. The validator reports longer text as `too_large` with its length, and the schema and tool schema carry the limit as `maxLength`. Bound what one character with many stacked combining marks can draw, so text inside the limit stays inside its label box.
**Priority:** Must
**Value:** A curriculum author, or a language model working only from the schema, learns at once that a title, label or unit is too long, instead of getting a figure that cuts the text, a screen-reader name of half a megabyte, and slow server renders.

**Requirements Covered:**
- GSV-REQ-052: A title, label or other caller-written text longer than 200 characters is reported, stating the limit and the text's length
- GSV-REQ-053: A unit text longer than 20 characters is reported, stating the limit and the text's length
- GSV-REQ-054: Each caller-written text's limit is published in the schema

**Prior Art:**
- Read: `.gener8v/specifications/graph-specification-and-vocabulary.md` — GSV-REQ-052..054 (Caller Text Length), the amended Edge Case "Label text is very long", the new "exactly 200 characters" Edge Case, and OQ-009 (the Product Owner decision and its rationale)
- Read: `src/core/definitions/types.ts` — `StringValue.maxLength` (code points, as JSON Schema counts them; reported, never cut)
- Read: `src/core/validate/structure.ts` — `checkValue` and `charactersOver`: the existing `too_large` with unit `"characters"` and `count`
- Read: `src/core/schema.ts` — where `maxLength` reaches the published schema (`:95`) and the term uses (`:261`)
- Read: `src/core/definitions/categories.ts` — `CATEGORY_NAME_LIMIT = 200` on category `name`, the existing use of the mechanism, and `valueUnitLabel`
- Read: `src/core/definitions/shared.ts` — `title`, `lineLabel`, `xAxisLabel`, `yAxisLabel`, `zAxisLabel`, `categoryAxisLabel`, `valueAxisLabel`, `label`
- Read: `src/core/definitions/circle.ts` — `unit` (the circle's free-text unit) and `labelText` (`radiusLabelText`, `diameterLabelText`, `circumferenceLabelText`)
- Read: `src/core/issues.ts` — the `too_large` code's documentation (`:83`)
- Read: `src/layout/kit/text.ts` — `textWidth`, `wrap` and the zero-width ranges for combining marks (`ZERO_WIDTH`)
- Read: `tests/react/Graph.test.tsx` — the "half a megabyte" tests for every type (GSS TICKET-002 SEC-001), which assume very long text is accepted
- Read: `tests/core/schema-agreement.test.ts` — the string generators (GSV-NFR-003)
- Read: `.gener8v/changes/graph-library/reviews/geometric-shapes-and-solids-ticket-002-security-review.md` SEC-002, `.gener8v/changes/rulers/reviews/number-lines-and-coordinate-graphs-ticket-002-security-review.md` SEC-002 and `.gener8v/changes/rulers/reviews/number-lines-and-coordinate-graphs-ticket-003-security-review.md` SEC-001 — the findings this ticket closes

**Acceptance Criteria:**
- [ ] Every caller-written text term has a `maxLength`: 200 for `title`, `lineLabel`, the five axis labels, the element `label`, category `name`, `valueUnitLabel` and the circle's three label texts; 20 for the circle's `unit`. A test lists every `kind: "string"` term in every registered definition and the shared and scoped maps, and fails on one with no `maxLength`
- [ ] Text of 201 characters (a unit of 21) is reported once as `too_large` at its path, with `limit` and `count`, and the message states both. Text of exactly 200 (a unit of exactly 20) is accepted. Characters are counted as code points, so 200 emoji are accepted and 201 are not
- [ ] The published schema, the tool schema and the vocabulary carry each limit as `maxLength`, regenerated with `pnpm generate`. The schema agreement test (GSV-NFR-003) generates texts on both sides of each limit, and schema and validation agree on them
- [ ] The `too_large` code's documentation covers text that is too long, and the documentation test (GSV-NFR-005) passes
- [ ] The "half a megabyte" tests in `tests/react/Graph.test.tsx` expect the fallback with `too_large` for over-limit text. Each type keeps a test at the limit: 200-character titles and labels draw a bounded number of text nodes without throwing
- [ ] A 200-character label or title made of one letter followed by 199 combining marks, or a chain joined by zero-width joiners, draws inside its estimated line box: the text kit bounds the marks stacked on one letter, or counts them in the box's height. A ruler label made this way no longer covers the bar, the end marks or a number (rulers NLC TICKET-003 SEC-001)

**Output:**
- `src/core/definitions/shared.ts` — `CALLER_TEXT_LIMIT = 200` and `UNIT_TEXT_LIMIT = 20`, exported, and `maxLength` on every shared text term; each description states its limit
- `src/core/definitions/categories.ts` — `name` and `valueUnitLabel` use `CALLER_TEXT_LIMIT` (`CATEGORY_NAME_LIMIT` kept as an alias, or replaced at its uses)
- `src/core/definitions/circle.ts` — `unit` at `UNIT_TEXT_LIMIT`, the three label texts at `CALLER_TEXT_LIMIT`
- `src/core/issues.ts` — the `too_large` documentation
- `src/layout/kit/text.ts` — the stacked-mark bound, if it is the kit's fix
- `src/generated/*`, `tests/fixtures/generated/description.ts` — regenerated
- `tests/core/validate-structure.test.ts` — limits, boundaries, code points and the every-text-term check (criteria 1, 2)
- `tests/core/schema-agreement.test.ts`, `tests/core/schema-shape.test.ts` — `maxLength` published and agreed (criterion 3)
- `tests/react/Graph.test.tsx` — over-limit fallbacks and at-limit drawings for every type (criterion 5)
- `tests/layout/kit/text.test.ts` and `tests/layout/ruler.test.ts` — one-cluster text stays in its box (criterion 6)

**Constraints:** prd/CC-002 (the text alternative stays meaningful: a bounded caller text keeps it readable); prd/TC-001 (estimated metrics only, no measuring)

**Known Hazards:**
- **Supersession:** GSV OQ-009 (Product Owner, 2026-10-21) and GSV-REQ-052..054 replace the Edge Case "Label text is very long: accept it". Every test and comment written to that rule is now stale. In particular, the "half a megabyte" tests in `tests/react/Graph.test.tsx` and the comments citing GSS TICKET-002 DEL-008 assume very long text is accepted. Rewrite them to the limit; do not loosen the limit to keep them passing.
- **Which limit applies:** only the circle's `unit` (the unit written after each measurement) gets 20. `valueUnitLabel` is drawn as a label in the key and gets 200. A ruler's `rulerUnit` is an enum and gets no `maxLength`. The `textAlternative` prop is the consumer's, not part of the description, and is out of scope.
- **The line caps stay:** the drawing still cuts titles at 3 lines and labels at 2 to 4. A 200-character text can still need cutting at some widths. The text alternative states the text whole, which is now bounded at 200.
- **Shared spec objects:** the shared terms are nested by object identity (the applicability check in `tests/core/definitions.test.ts`). Add `maxLength` to the shared spec itself, never to a copy in one definition.
- **Carried from rulers/number-lines-and-coordinate-graphs-ticket-003-security-review/SEC-001 (one-cluster text):** the text kit gives combining marks zero width, so one letter with thousands of marks wraps as one character. It escapes the line cap and draws a tall column over the figure. At 200 characters, inside the new limit, Chromium draws it over a ruler's bar and a number while `createGraph` reports `ok`.
  - Bound the marks stacked on one letter in the shared kit (for example, keep at most a few marks per letter in drawn text), or count them in the estimated box's height so `placeLabel` keeps the label clear.
  - Test the limit with one-cluster text (combining marks, a ZWJ chain) as well as words.
  - The fix is in shared code, so check every type's label tests.
- **Carried from graph-library/geometric-shapes-and-solids-ticket-002-security-review/SEC-002 and rulers/number-lines-and-coordinate-graphs-ticket-002-security-review/SEC-002:** this ticket is the specification amendment those deferrals waited for. Close both: record in the delivery record that the length bound is now in the validator.
- **The tool summary:** graph-library CPSE TICKET-007 already carries a hazard to cap the text alternative inside the tool `summary`. With caller text bounded, that cap stays as defence in depth; do not remove it.

**Depends On:** TICKET-003, TICKET-005
**Blocks:** None

**Size:** Medium

**Notes:** The mechanism exists: category names have had `maxLength: CATEGORY_NAME_LIMIT` since DGP TICKET-005, with `too_large` and unit `"characters"`. Most of the work is applying it to every text term, regenerating, and rewriting the tests that assumed unbounded text.
