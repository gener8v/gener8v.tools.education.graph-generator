# TICKET-002: Publish the ruler's vocabulary terms and schema

**Change:** rulers
**Capability Area:** Graph Specification & Vocabulary (graph-specification-and-vocabulary)
**Specification:** specifications/graph-specification-and-vocabulary.md

**Summary:** Once the ruler definition is registered, make sure the published vocabulary, schema, strict tool schema and generated types describe it completely. Every ruler term (unit, length, smallest division, measured object, start mark, end mark) has a plain-English definition, every unit and division is listed with a description, and the ruler is offered as a supported type everywhere.
**Priority:** Must
**Value:** A curriculum developer or a model can write a correct ruler description from the published schema and vocabulary alone, without reading the package's source.

**Requirements Covered:**
- GSV-REQ-046: Vocabulary terms, each with a plain-English definition, for a ruler's unit and length
- GSV-REQ-047: A vocabulary term, with a plain-English definition, for an inch ruler's smallest division
- GSV-REQ-048: Vocabulary terms, each with a plain-English definition, for a measured object and its start mark and end mark

**Prior Art:**
- Read: `.gener8v/specifications/graph-specification-and-vocabulary.md` — Ruler Vocabulary, Behaviors & Rules → Rulers, and GSV-REQ-012..015 (vocabulary and schema from one definition)
- Read: TICKET-001 output at `src/core/definitions/types.ts`, `src/core/definitions/shared.ts`, `src/core/validate/structure.ts`, `src/core/schema.ts`
- Read: `rulers/number-lines-and-coordinate-graphs/TICKET-002` output at `src/core/definitions/ruler.ts` (the ruler definition, its term names and descriptions) and `examples/ruler.json`
- Read: `src/core/schema.ts` (`buildSchema`, `buildVocabulary`, `getVocabulary`), `src/generated/`, `tests/core/schema-shape.test.ts`, `tests/core/schema-meta.test.ts`, `tests/core/schema-agreement.test.ts`

**Acceptance Criteria:**
- [ ] The published vocabulary lists the ruler's terms (unit, length, smallest division, measured object, start mark, end mark) with plain-English definitions that state their limits: whole lengths up to 30 cm or 12 in, a division only on inch rulers with a sixteenth by default, and marks as decimals in the ruler's unit on a drawn mark. No definition is empty
- [ ] The vocabulary lists each unit name and each division with a description
- [ ] A term shared with another type keeps one definition (GSV-REQ-015). The definitions test's consistency check passes with the ruler registered
- [ ] The published schema and the strict tool schema include the `ruler` type, validate against their meta-schemas (`tests/core/schema-meta.test.ts`), and `examples/ruler.json` passes both
- [ ] The schema-agreement property test runs over the ruler (at least 1,000 generated descriptions mutated from `examples/ruler.json`) and passes
- [ ] `unknown_graph_type` lists `ruler`, and the generated TypeScript types include the ruler description
- [ ] `pnpm generate` output is committed, and a second run changes nothing

**Output:**
- `src/generated/*` — regenerated schema, tool schema, types and vocabulary
- `src/core/schema.ts` — only if the ruler's terms need something the builder does not yet publish
- `tests/core/schema-shape.test.ts` — ruler terms, unit and division descriptions, and the conditional term in the published vocabulary and schema
- `tests/core/schema-agreement.test.ts`, `tests/core/schema-meta.test.ts` — run with the ruler registered

**Constraints:**
- prd/IC-001: strict tool schema subset with an object root
- prd/TC-008: one definition for types, validation and schema

**Known Hazards:**
- Cross-area predecessor: this ticket checks the published output of `rulers/number-lines-and-coordinate-graphs/TICKET-002` (the ruler definition), which is not on `Depends On` (cross-area). Orchestrate will show it ready once TICKET-001 is delivered. Do not start until `src/core/definitions/ruler.ts` is registered.
- If a ruler term name clashes with an existing term of a different meaning (for example `length`), the consistency check fails. The fix belongs in the ruler definition (rename the term there, recorded as a DEL-XXX), never in a second definition of the same term.
- The vocabulary's spelling is US (`color`, `centimeters`). Keep descriptions consistent, and never offer "centimetres" as an accepted value in a description.
- Carried from rulers/number-lines-and-coordinate-graphs-ticket-002 DEL-002: the ruler definition exists (`src/core/definitions/ruler.ts`) but is registered by rulers NLC TICKET-003, together with its layout. Start this ticket after NLC TICKET-003, once `ruler` is in `definitions`. The terms are `rulerUnit`, `length`, `smallestDivision`, `measuredObject`, `start` and `end` (DEL-001), and the issue code `not_on_mark` (DEL-003) joins the documented set.
- Most of this ticket is already in the code. rulers NLC TICKET-003 registered the ruler and committed the regenerated `src/generated/*`, and GSV TICKET-007 added `maxLength`. The vocabulary has `rulerUnit`, `length`, `smallestDivision`, `measuredObject`, `start` and `end`, each defined with its limits; each unit and division has `valueDescriptions`; `smallestDivision` has `appliesWhen`; `unknown_graph_type` lists `ruler`; and `schema-agreement` covers `examples/ruler.json`. The start-condition hazards (wait for registration, DEL-002) are satisfied. **So this ticket verifies the published output** and adds tests against the real `ruler` definition in `tests/core/schema-shape.test.ts` (the existing ruler schema tests use the test-only `conditionalRuler` fixture): terms, value descriptions, `appliesWhen`, `measuredObject/label` `maxLength` 200, and that no description offers "centimetres". It changes `src/core/schema.ts` or the definition only where a check fails. (ready-tickets reconciliation, 2026-10-21)
- Criterion 1 also covers the object's label: at most 200 characters (GSV-REQ-052), published as `maxLength`. (ready-tickets reconciliation, 2026-10-21)

**Depends On:** TICKET-001
**Blocks:** None

**Size:** Small

**Notes:** GSV-NFR-001 (validation ≤ 5 ms), GSV-NFR-003 (agreement) and GSV-NFR-005 (everything documented) are graph-library NFRs worded for every graph type. They cover the ruler without being in this change's scope, and this ticket's criteria exercise them for the ruler.
