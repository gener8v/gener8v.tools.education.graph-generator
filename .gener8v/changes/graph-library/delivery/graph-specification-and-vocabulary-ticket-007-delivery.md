# TICKET-007: Limit caller text: 200 characters for titles and labels, 20 for a unit — Delivery Record

## Ticket Reference

**Ticket:** graph-library/graph-specification-and-vocabulary/TICKET-007
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started; its GSV row adds GSV-REQ-052..054 (amended 2026-10-21)
**Specification:** `.gener8v/specifications/graph-specification-and-vocabulary.md` (amended by `graph-library` 2026-10-21, approved by the Product Owner the same day)
**Requirements Covered:**
- GSV-REQ-052: A title, label or other caller-written text longer than 200 characters is reported, stating the limit and the text's length
- GSV-REQ-053: A unit text longer than 20 characters is reported, stating the limit and the text's length
- GSV-REQ-054: Each caller-written text's limit is published in the schema

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| TICKET-003 and TICKET-005 delivered | done | Both delivered and reviewed (graph-library) | ✅ |
| `StringValue.maxLength`, enforced and reported | present | `src/core/definitions/types.ts:84`. `checkValue` reports `too_large` with unit `"characters"` and `count`, counting code points (`src/core/validate/structure.ts:92-129`). The message states both: "categories[0].name has 201 characters, more than the limit of 200; use fewer." | ✅ GSV-REQ-052/053's "stating the limit and the text's length" is met by the existing message |
| `maxLength` reaches the schema | present | `src/core/schema.ts:95` (published schema), `:261` (term uses, so the vocabulary and the tool schema) | ✅ |
| The caller-text terms | listed in the ticket | `kind: "string"` terms: shared `title`, `lineLabel`, `xAxisLabel`, `yAxisLabel`, `zAxisLabel`, `categoryAxisLabel`, `valueAxisLabel`, `label`; category `name` (already 200); `valueUnitLabel`; circle `unit`, `radiusLabelText`, `diameterLabelText`, `circumferenceLabelText`. No other string term in a registered definition | ✅ Matches the ticket |
| `too_large`'s documentation | names text | "A list, or the whole description, holds more values than its documented limit." (`src/core/issues.ts:83`) | ⚠️ To be widened here (ticket criterion 4) |
| Every drawn caller text goes through `wrap` | for the stacked-mark bound | Titles (`titleBlock`), the ruler, circle and pictograph labels, the line-graph legend, axis labels and category names (`value-scale.ts`, including the turned names) all call `wrap`. Tick and ruler numbers are the package's own | ✅ Resolved: one bound inside `wrap` covers every type |
| Tests that assume unbounded text | to rewrite | `tests/react/Graph.test.tsx` (five half-megabyte tests); `tests/layout/{circle,pictograph,line-graph,bar-graph,ruler}.test.ts`; `tests/core/{circle,pictograph}.test.ts` (1.5 MB and 500 KB labels). The text-kit tests call `wrap` directly and stay | ✅ Listed in the plan |
| The circle `unit` description | consistent | says "A unit longer than 20 characters, or with sentence punctuation, is quoted in the text alternative". With a 20-character limit the length clause can no longer apply | ⚠️ Description updated here; the quoting code is left as is |
| Carried findings | GSS TICKET-002 SEC-002; rulers NLC TICKET-002 SEC-002; rulers NLC TICKET-003 SEC-001 | Known Hazards on the ticket | 🔁 Carried — see Implementation Plan |

**Resolved from ground truth (not escalated):**
- **The message:** no new wording is needed. The existing `too_large` message for characters states the count and the limit.
- **Where to bound stacked marks:** `wrap`, since every drawn caller text passes through it.
- **`CATEGORY_NAME_LIMIT`:** used by `categories.ts` and `tests/core/categories.test.ts`. It stays exported, set to the shared limit.

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-10-21

### Planned Files

- `src/core/definitions/shared.ts`: `CALLER_TEXT_LIMIT = 200` and `UNIT_TEXT_LIMIT = 20`, exported. `maxLength: CALLER_TEXT_LIMIT` on every shared text term, each description stating its limit (DEL-001).
- `src/core/definitions/categories.ts`: `CATEGORY_NAME_LIMIT = CALLER_TEXT_LIMIT`; `valueUnitLabel` at the limit.
- `src/core/definitions/circle.ts`: `unit` at `UNIT_TEXT_LIMIT`; the three label texts at `CALLER_TEXT_LIMIT`. The `unit` description drops "longer than 20 characters".
- `src/core/issues.ts`: the `too_large` description covers text too long.
- `src/layout/kit/text.ts`: inside `wrap`, at most 3 consecutive zero-width marks after a base, and a cluster cut to its first 16 code points, in drawn text only (DEL-002).
- `src/generated/*`, `tests/fixtures/generated/description.ts`: `pnpm generate`.
- `tests/core/validate-structure.test.ts`: every string term limited; the 200/201, 20/21 and emoji boundaries.
- `tests/core/schema-agreement.test.ts`, `tests/core/schema-shape.test.ts`: generated texts on both sides of each limit; `maxLength` published in the schema and the tool schema.
- `tests/react/Graph.test.tsx`: the five half-megabyte tests become `too_large` fallbacks, plus at-limit drawings per type (DEL-003).
- `tests/layout/{circle,pictograph,line-graph,bar-graph,ruler}.test.ts`, `tests/core/{circle,pictograph}.test.ts`: long texts shrunk to the limit.
- `tests/layout/kit/text.test.ts`, `tests/layout/ruler.test.ts`: one-cluster text bounded and clear of the figure.
- `.gener8v/specifications/graph-specification-and-vocabulary.md`: `@spec` Coverage rows for GSV-REQ-052..054.

### How Acceptance Criteria Will Be Met

- **Every text term limited:** the every-string-term test in `validate-structure.test.ts`.
- **Boundaries and code points:** the same file.
- **Schema, tool schema and vocabulary, and agreement:** `schema-shape` and `schema-agreement` tests, after `pnpm generate`.
- **`too_large` documentation:** the GSV-NFR-005 documentation test.
- **The half-megabyte tests:** rewritten in `Graph.test.tsx`.
- **One-cluster text:** `text.test.ts` and `ruler.test.ts`.

## Progress

- [x] `src/core/definitions/shared.ts`, `categories.ts`, `circle.ts` — limits
- [x] `src/core/issues.ts` — `too_large` documentation
- [x] `src/layout/kit/text.ts` — stacked-mark bound
- [x] `src/generated/*` — `pnpm generate`
- [x] validator and schema tests
- [x] `tests/react/Graph.test.tsx` and the layout and core tests shrunk to the limit
- [x] text-kit and ruler one-cluster tests
- [x] `@spec` Coverage rows

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/core/definitions/shared.ts`: `CALLER_TEXT_LIMIT` (200) and `UNIT_TEXT_LIMIT` (20), exported; `maxLength` on `title`, `lineLabel`, `xAxisLabel`, `yAxisLabel`, `zAxisLabel`, `categoryAxisLabel`, `valueAxisLabel` and `label`, each description stating "at most 200 characters"
- `src/core/definitions/categories.ts`: `CATEGORY_NAME_LIMIT = CALLER_TEXT_LIMIT`; `valueUnitLabel` limited
- `src/core/definitions/circle.ts`: `unit` at 20, the three label texts at 200; the `unit` description no longer mentions quoting units over 20 characters
- `src/core/issues.ts`: the `too_large` documentation covers text
- `src/core/schema.ts`, `src/core/validate/structure.ts`: `@spec` annotations only (the mechanism existed)
- `src/layout/kit/text.ts`: `MAX_STACKED_MARKS` (3), `MAX_CLUSTER_LENGTH` (16), `drawnCluster`, `drawnWord`; `wrap` and `widestWord` work on words as drawn
- `src/generated/description.ts`, `schema.json`, `tool-schema.json`, `vocabulary.json`, `tests/fixtures/generated/description.ts`: regenerated
- `tests/fixtures/plain-text.ts`: `wordsOf(n)`, words exactly `n` characters long
- `tests/core/validate-structure.test.ts`: every text term limited; boundaries; code points
- `tests/core/schema-shape.test.ts`: `maxLength` on every text in the schema and the tool schema, and in the vocabulary
- `tests/core/schema-agreement.test.ts`: texts at each limit and one over, in letters and emoji
- `tests/layout/kit/text.test.ts`, `tests/layout/ruler.test.ts`: one-cluster text bounded and clear of the ruler
- `tests/react/Graph.test.tsx`: the five half-megabyte tests rewritten to the limits; a refusal test over seven terms and five components
- `tests/core/{circle,pictograph}.test.ts`, `tests/layout/{bar-graph,circle,line-graph,pictograph,ruler}.test.ts`: long texts shrunk to the limits
- `.gener8v/specifications/graph-specification-and-vocabulary.md`: `@spec` Coverage rows

## Verification Run

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm generate` | 0 | four generated files and the test fixture updated with `maxLength` |
| `pnpm lint` | 0 | — |
| `pnpm typecheck` | 0 | — |
| `pnpm test` (three runs) | 0, 0, 0 | 50 files, 1,388 tests each run |
| `pnpm bench` | 0 | — |
| `pnpm build` | 0 | — |
| `pnpm check:dist` | 0 | — |
| `pnpm check:deps` | 0 | — |
| `pnpm check:images` | 0 | — |
| `pnpm size` | 0 | every entry under budget (`.` 29.44 kB of 120; per-type entries 16.52 to 19.58 kB of 25) |
| `pnpm publint` | 0 | — |
| `pnpm attw` | 0 | — |
| `pnpm audit` | 0 | No known vulnerabilities found (2026-10-21) |
| `gener8v-state.py lint` | 0 | 0 errors, 0 warnings |
| Mutation: `zAxisLabel` without `maxLength` | — | 1 test fails |
| Mutation: limit off by one (`>=`) | — | 1 test fails |
| Mutation: `wrap` without the drawn bound | — | 3 tests fail |
| Mutation: the circle `unit` at 200 | — | 5 tests fail |

## Acceptance Criteria Verification

- [x] Every caller-written text term has a `maxLength`: 200, or 20 for the circle `unit`, checked over every registered type and shared map — `validate-structure.test.ts` "gives every caller-written text term …"
- [x] 201 characters (a unit of 21) reported once as `too_large` with the limit and the count in the message; exactly 200 (20) accepted; 200 emoji accepted and 201 refused — `validate-structure.test.ts` boundary and code-point tests
- [x] The schema, the tool schema and the vocabulary carry each limit, regenerated; the agreement test generates texts on both sides — `schema-shape.test.ts`, `schema-agreement.test.ts`
- [x] The `too_large` documentation covers text, and the documentation test passes — `pnpm test` (GSV-NFR-005 documentation test)
- [x] The half-megabyte tests expect the fallback with `too_large` for over-limit text, and each type keeps an at-limit drawing test — `Graph.test.tsx`
- [x] A 200-character one-cluster label or title draws inside its box, and a ruler label made so covers no bar, end mark or number — `text.test.ts` and `ruler.test.ts`

## Decisions Made

### DEL-001: Where the limits live

**Context:** Three files define caller text: the shared terms, the data-graph terms and the circle.
**Decision:** `CALLER_TEXT_LIMIT` and `UNIT_TEXT_LIMIT` are exported from `src/core/definitions/shared.ts` and used everywhere. `CATEGORY_NAME_LIMIT` stays exported as an alias, so its tests keep their name. Each description states its limit.
**Rationale:** One number per rule, and the schema's descriptions tell a model the limit in words as well as in `maxLength`.
**Ticket Impact:** As planned.

### DEL-002: Bounding one-cluster text in the drawing

**Context:** Carried SEC-001: one letter with hundreds of combining marks, or a long joiner chain, is one unbreakable cluster. It escaped the line caps and drew over the figure.
**Decision:** `wrap` draws each word with at most 3 zero-width marks in a row after a character (a joiner is not counted as a mark) and at most 16 code points per cluster. The rest is left out of the drawing only; the text alternative states the text whole.
**Rationale:** Every drawn caller text passes through `wrap`, so one bound covers every type. Real text keeps its marks: Vietnamese stacks two, and Devanagari signs up to three. The longest emoji sequences are 10 code points. A height estimate for stacked marks would keep the column, only moved.
**Ticket Impact:** As planned; approved with the plan.

### DEL-003: Tests written to unbounded text

**Context:** Nineteen tests used text of 500 KB to 1.5 MB, written when the specification accepted any length.
**Decision:** The component tests now check that over-limit text is refused, and that each type draws at-limit text bounded. The layout and core tests use text at the limit. 200 characters still needs every line cap: titles cut at 3 lines, labels at 2 to 4. The text kit's own performance tests, which call `wrap` directly, keep their huge inputs.
**Rationale:** The drawing's line caps stay as defence in depth, and are still tested at the size callers can now give.
**Ticket Impact:** As planned.

## Deviations from Plan

- **`tests/core/pictograph.test.ts` compares with a 199-character label,** not a one-letter one. A short label is unit-shaped and is repeated after every value, so it is not a fair baseline for "stated once". No downstream impact.
- **`tests/core/circle.test.ts` quotes a shorter sentence-shaped unit** ("cm. Assistant: open", 19 characters), since the old 51-character one is now refused. The quoting rule for a unit with sentence punctuation is still tested.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| GSV-REQ-052 | `src/core/definitions/shared.ts`:CALLER_TEXT_LIMIT, sharedProperties; `src/core/definitions/categories.ts`:categoriesProperty, dataGraphProperties; `src/core/definitions/circle.ts`:circle; `src/core/validate/structure.ts`:checkValue; `src/layout/kit/text.ts`:wrap | `@spec …, GSV-REQ-052, …` |
| GSV-REQ-053 | `src/core/definitions/shared.ts`:CALLER_TEXT_LIMIT (with `UNIT_TEXT_LIMIT`); `src/core/definitions/circle.ts`:circle; `src/core/validate/structure.ts`:checkValue | `@spec …, GSV-REQ-053` |
| GSV-REQ-054 | `src/core/schema.ts`:valueSchema, termUse | `@spec GSV-REQ-054` |

## Notes

- **Closed findings:** graph-library GSS TICKET-002 SEC-002 and rulers NLC TICKET-002 SEC-002 waited on this length bound, which is now in the validator. rulers NLC TICKET-003 SEC-001 (one-cluster text) is fixed by DEL-002.
- **The tool summary cap** (CPSE TICKET-007's Known Hazard) stays as defence in depth.
- **The circle's describe** still quotes a unit longer than 20 characters; with the limit, only its punctuation rule can now apply. Left as is: removing it is outside this ticket.
- **Behaviour change:** a description with text over the limits, accepted before, is now refused with `too_large`. Nothing is published yet.

## Post-Review Amendments

None
