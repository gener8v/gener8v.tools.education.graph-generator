# TICKET-002: Publish the ruler's vocabulary terms and schema — Delivery Record

## Ticket Reference

**Ticket:** rulers/graph-specification-and-vocabulary/TICKET-002
**Change:** `.gener8v/changes/rulers/change.md` — Approved (Product Owner — Thomas Eaves, 2026-10-19) when delivery started
**Specification:** `.gener8v/specifications/graph-specification-and-vocabulary.md`
**Requirements Covered:**
- GSV-REQ-046: Vocabulary terms, each with a plain-English definition, for a ruler's unit and length
- GSV-REQ-047: A vocabulary term, with a plain-English definition, for an inch ruler's smallest division
- GSV-REQ-048: Vocabulary terms, each with a plain-English definition, for a measured object and its start mark and end mark

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| TICKET-001 delivered (conditional terms, value descriptions) | done | Delivered, all three reviews passed; `appliesWhen`, `valueDescriptions` published by `src/core/schema.ts` (`@spec GSV-REQ-049..051` at `:279`) | ✅ |
| The ruler is registered | `ruler` in `definitions` | registered by rulers NLC TICKET-003; `registeredTypes(definitions)` includes it | ✅ (start-condition hazards satisfied) |
| Ruler terms published with their limits | `rulerUnit`, `length`, `smallestDivision`, `measuredObject`, `start`, `end` | all six in `src/generated/vocabulary.json` `terms`, each with a definition stating its limits (1 to 30 cm / 1 to 12 in; sixteenth when left out; decimals on a mark in the ruler's unit) | ✅ |
| Unit and division value descriptions | each listed | `rulerUnit.valueDescriptions` (2), `smallestDivision.valueDescriptions` (4); `smallestDivision.appliesWhen` `rulerUnit` = `inches` | ✅ |
| `measuredObject/label` limited | `maxLength` 200 | `maxLength: 200` in the vocabulary and the schemas (GSV TICKET-007) | ✅ |
| Schemas include `ruler` | both schemas | `schema.json` `anyOf` and `tool-schema.json` list `ruler`; `description.ts` exports `RulerDescription`, in `GraphDescription` | ✅ |
| Meta-schema and agreement tests run over registered types | ruler included | `tests/core/schema-meta.test.ts` and `tests/core/schema-agreement.test.ts` iterate `registeredTypes(definitions)`; agreement mutates `examples/ruler.json` 1,000 times | ✅ No edit needed |
| `pnpm generate` is idempotent | no change | `pnpm generate` on `main` (`84f4402`): `git status` shows no change in `src/generated/` | ✅ |
| "centimetres" offered nowhere | absent | 0 occurrences in `src/generated/*` | ✅ |
| Term clashes (`length`, `start`, `end`) | one meaning each | each defined once in the vocabulary, used only by the ruler today; the definitions test's consistency check passes | ✅ Carried as a note for later types |
| Tests against the real ruler definition | in `tests/core/schema-shape.test.ts` | the existing ruler schema tests use the test-only `conditionalRuler` fixture | ⚠️ Added here |
| `@spec` for GSV-REQ-046..048 | on the code that defines the terms | none anywhere in `src/` | ⚠️ Added here, on `defineRulerProperties` |

**Resolved from ground truth (not escalated):**
- **Whether `src/core/schema.ts` changes:** no; it already publishes every ruler term, value description, condition and limit.
- **Whether the ruler definition changes:** only its `@spec` comment, which gains GSV-REQ-046..048.

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-10-25
**Implemented by:** sonnet · medium — routed as deliver-small from Tower

### Planned Files

- `src/core/definitions/ruler.ts` (comment only): add GSV-REQ-046, GSV-REQ-047, GSV-REQ-048 to the `@spec` annotation above `defineRulerProperties`, which defines the six terms and their descriptions.
- `tests/core/schema-shape.test.ts` (modified): a new block, "the ruler's published vocabulary and schemas (GSV-REQ-046..048; rulers GSV TICKET-002)", against the real registered `definitions`:
  - the six terms in `getVocabulary().terms`, each with a non-empty definition stating its limit (`length`: 30 and 12; `smallestDivision`: inch rulers only, sixteenth when left out; `start`/`end`: a decimal in the ruler's unit, on a mark);
  - each unit and division in `valueDescriptions`, non-empty; `smallestDivision.appliesWhen` is `rulerUnit` = `inches`; `measuredObject.label` `maxLength` 200;
  - `ruler` in both schemas; `examples/ruler.json` accepted by the published schema and, in tool form (`toolForm`), by the strict tool schema;
  - `unknown_graph_type` for `{ type: "pie" }` lists `ruler`;
  - no generated file (`src/generated/*`) contains "centimetre", in any form.
- `.gener8v/specifications/graph-specification-and-vocabulary.md`: `@spec Coverage` rows for GSV-REQ-046..048.
- `src/generated/*`: unchanged; `pnpm generate` run twice to show it.

### How Acceptance Criteria Will Be Met

- Terms with definitions and limits, no empty definition: the vocabulary test, `pnpm test`.
- Each unit and division described: the value-description test, `pnpm test`.
- One definition per shared term (GSV-REQ-015): the existing definitions consistency check, `pnpm test`.
- Both schemas include `ruler`, meta-schema valid, the example passes both: `tests/core/schema-meta.test.ts` (unchanged) and the new example test, `pnpm test`.
- Agreement over the ruler, 1,000 descriptions: `tests/core/schema-agreement.test.ts` (unchanged), `pnpm test`.
- `unknown_graph_type` lists `ruler`; generated types include it: the new test and `pnpm typecheck` over `src/generated/description.ts`.
- `pnpm generate` committed and stable: run twice, `git status --short src/generated` empty.

## Progress

- [x] `src/core/definitions/ruler.ts` — @spec GSV-REQ-046..048 added
- [x] `tests/core/schema-shape.test.ts` — six ruler tests added
- [x] specification `@spec Coverage` rows — GSV-REQ-046..048 appended

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/core/definitions/ruler.ts`: comment only; `@spec` above `defineRulerProperties` gains GSV-REQ-046, GSV-REQ-047, GSV-REQ-048.
- `tests/core/schema-shape.test.ts`: "the ruler's published vocabulary and schemas (GSV-REQ-046..048; rulers GSV TICKET-002)", six tests against the registered `definitions`: the six terms and their limits; unit and division value descriptions and `smallestDivision`'s `appliesWhen`; `measuredObject.label` `maxLength` 200; `ruler` in both schemas with `examples/ruler.json` accepted by the published schema and, in tool form, the strict tool schema; `unknown_graph_type` listing `ruler`; no "centimetre" in any generated file.
- `.gener8v/specifications/graph-specification-and-vocabulary.md`: `@spec Coverage` rows for GSV-REQ-046..048.
- `src/generated/*`: unchanged (`pnpm generate` twice, no diff).

## Verification Run

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm generate` ×2, then `git status --short src/generated tests/fixtures/generated` | 0 | no change |
| `pnpm lint` | 0 | — |
| `pnpm typecheck` | 0 | — |
| `pnpm test` ×3 | 0 | 1,473 passed each run (schema-meta and schema-agreement include the ruler: 1,000 descriptions mutated from `examples/ruler.json`) |
| `pnpm bench` | 0 | GSV-NFR-001 ruler p95 well under 5 ms |
| `pnpm build` | 0 | — |
| `pnpm check:dist` | 0 | — |
| `pnpm check:deps` | 0 | — |
| `pnpm check:images` | 0 | — |
| `pnpm size` | 0 | — |
| `pnpm publint` | 0 | — |
| `pnpm attw` | 0 | — |
| `pnpm audit` (first run) | 1 | four new advisories in fast-uri 3.1.8, reached only through ajv (devDependency); `pnpm audit --prod` exit 0. Fixed outside this ticket in `2bd6bf1` (see Notes) |
| `pnpm audit`, `pnpm audit --prod` (after `2bd6bf1`) | 0 | no known vulnerabilities |

Mutation checks (each restored): removing `smallestDivision`'s `appliesWhen` fails the new value-description test.

## Acceptance Criteria Verification

- [x] The vocabulary lists the six ruler terms with definitions stating their limits; none empty — "defines the six terms, each with a definition that states its limit", `pnpm test`.
- [x] Each unit and division listed with a description — "describes each unit and each division …", `pnpm test`.
- [x] A shared term keeps one definition (GSV-REQ-015) — the definitions test's consistency check, `tests/core/definitions.test.ts`, `pnpm test`.
- [x] Both schemas include `ruler`, validate against their meta-schemas, and `examples/ruler.json` passes both — `tests/core/schema-meta.test.ts` and "is in both schemas, and its example is accepted …", `pnpm test`.
- [x] Schema agreement over the ruler, 1,000 descriptions from `examples/ruler.json` — `tests/core/schema-agreement.test.ts` ("registered types ruler"), `pnpm test`.
- [x] `unknown_graph_type` lists `ruler`; the generated types include the ruler — "is listed among the allowed types when a type is unknown", `pnpm test`; `RulerDescription` in `GraphDescription` (`src/generated/description.ts`), `pnpm typecheck`.
- [x] `pnpm generate` output committed and a second run changes nothing — `pnpm generate` ×2, no diff.
- [x] The object's label is at most 200 characters, published as `maxLength` (GSV-REQ-052 hazard) — "limits the object's label to the caller text limit", `pnpm test`.

## Decisions Made

### DEL-001: Verify, don't rebuild

**Context:** rulers NLC TICKET-003 and graph-library GSV TICKET-007 had already published every ruler term, value description, condition and limit.
**Decision:** No change to `src/core/schema.ts` or the definition's logic; the ticket adds tests against the real registered ruler and the missing `@spec` annotation.
**Rationale:** The ticket's Known Hazard ("this ticket verifies the published output") and ground truth agree.
**Ticket Impact:** `src/core/schema.ts` and `src/generated/*` unchanged.

## Deviations from Plan

None — implementation followed the approved plan. Written by a Sonnet subagent per Tower's `deliver-small` route; annotated, verified and committed in the main session.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| GSV-REQ-046 | `src/core/definitions/ruler.ts`:defineRulerProperties | `@spec …, GSV-REQ-046, …` |
| GSV-REQ-047 | `src/core/definitions/ruler.ts`:defineRulerProperties | `@spec …, GSV-REQ-047, …` |
| GSV-REQ-048 | `src/core/definitions/ruler.ts`:defineRulerProperties | `@spec …, GSV-REQ-048, …` |

## Notes

- **Dependency fix outside the ticket:** `2bd6bf1` bumps fast-uri 3.1.8 → 3.1.9 in `pnpm-lock.yaml` only (GHSA-w74x-v6f9-j3xg and GHSA-wjr9-j795-jxcr moderate; GHSA-xhq7-xmqj-769h and GHSA-333x-w4r6-6crp low). It is reached only through ajv, a devDependency the schema tests use; nothing reaches the published package. Approved by the Engineer (Thomas Eaves), 2026-10-25, as a trivial fix in its own commit.
- **For later types:** `length`, `start` and `end` are ruler-only terms today. A type that gives any of them another meaning (a rectangle's length, a segment's start) must rename it, or the definitions consistency check fails (GSV-REQ-015).
- This closes the rulers change once its reviews pass.

## Post-Review Amendments

### 2026-10-25 — Code review (rulers/graph-specification-and-vocabulary-ticket-002-code-review)

- **CR-001:** `tests/core/schema-shape.test.ts` "publishes the label's limit and the division's condition in both schemas": `measuredObject.label` `maxLength` 200, and `smallestDivision`'s description ending "Give it only when rulerUnit is "inches".", in the published schema and the strict tool schema.
- **CR-002:** the specification's `@spec Coverage` rows for GSV-REQ-046..048 moved above GSV-REQ-049, in requirement order.
- Re-verification: `pnpm generate` (no change), `lint`, `typecheck`, `test` ×3 (1,474 passed each run), `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size`, `publint`, `attw`, `audit`: all exit 0.
