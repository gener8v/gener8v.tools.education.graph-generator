# TICKET-006: All-types completeness checks

**Change:** graph-library
**Capability Area:** Graph Specification & Vocabulary (graph-specification-and-vocabulary)
**Specification:** specifications/graph-specification-and-vocabulary.md

**Summary:** Close the area once every graph type is registered: assert the registry holds exactly the eleven types, every term, issue code and type is documented, and the schema–validation agreement property test passes across all eleven types.
**Priority:** Must
**Value:** The published schema, vocabulary and documentation are provably complete and consistent before the first release.

**Requirements Covered:**
- GSV-REQ-003: Exactly the eleven supported graph types (completion — registry and schema)
- GSV-NFR-003: Schema and validation agree across all eleven types — verified by the property test generating ≥ 1,000 descriptions per type in CI
- GSV-NFR-005: Every vocabulary term, issue code and graph type is documented — verified by a documentation test that fails on any undocumented entry

**Prior Art:**
- Read: TICKET-005 output — `scripts/generate.ts`, `src/generated/vocabulary.json`, `tests/core/schema-agreement.test.ts`
- Read: TICKET-002 output — `src/core/issues.ts` (`issueDocs`)
- Read: TICKET-004 output — `src/core/validate/index.ts`
- Read: `.gener8v/dependencies/dependency-map.md` — DEP-005 (the soft cycle this ticket closes), Phase 3
- Read: every type's `src/core/definitions/<type>.ts` produced by the type tickets in number-lines-and-coordinate-graphs, data-graphs-and-pictographs and geometric-shapes-and-solids

**Acceptance Criteria:**
- [ ] `tests/core/completeness.test.ts` asserts the definitions registry contains exactly `number-line`, `xy-graph`, `xyz-graph`, `line-graph`, `bar-graph`, `pictograph`, `circle`, `square`, `triangle`, `cube`, `cylinder` — no more, no fewer — and that the published schema's `anyOf` has one branch per type
- [ ] The same test fails when any vocabulary term, issue code or graph type lacks a non-empty description (GSV-NFR-005)
- [ ] The schema–validation agreement property test runs over all eleven types with ≥ 1,000 generated descriptions each and passes in CI (GSV-NFR-003)
- [ ] Every type has an example in `examples/<type>.json` that passes `validate`
- [ ] Generated files are fresh (CI freshness step passes with all types registered)

**Output:**
- `tests/core/completeness.test.ts` — registry, documentation and example completeness
- `tests/core/schema-agreement.test.ts` — confirmed running over all eleven types (configuration only, if needed)

**Constraints:** None identified

**Known Hazards:**
- This ticket cannot be completed until every type ticket in the three rendering areas is delivered (DEP-005). Orchestrate will show it ready once TICKET-005 is delivered, because cross-area tickets are not on `Depends On`; check that all eleven types are registered before starting.
- If a type ticket added an issue code without documentation, fix it in `src/core/issues.ts` here rather than weakening the test.
- Carried from GSV TICKET-001 DEL-005 (graph-library/graph-specification-and-vocabulary-ticket-001-code-review/CR-006): once all eleven definitions are registered, tighten `definitions` to `Readonly<Record<GraphType, GraphTypeDefinition>>` and run the applicability and consistency checks over the full registry.
- Carried from the `rulers` change (`rulers/graph-specification-and-vocabulary/TICKET-001`): `GRAPH_TYPES` gains `ruler`, a twelfth type, delivered by that change. Assert the registry against `GRAPH_TYPES` rather than a hard-coded eleven. If the ruler definition is not yet registered when this ticket is delivered, check the eleven graph-library types by name and leave the ruler to the `rulers` change, saying so in the delivery record. The same applies to the `Readonly<Record<GraphType, GraphTypeDefinition>>` tightening above: it does not typecheck until the ruler is registered, so either wait for it or type the registry by the graph-library types named explicitly (rulers GSV TICKET-001 code review CR-009).
- The ruler is registered (rulers NLC TICKET-003), so `GRAPH_TYPES` and the registry hold twelve types. **Supersedes "exactly the eleven" in the Summary and criteria above:** criterion 1 reads "contains exactly the types in `GRAPH_TYPES` (graph-library's eleven and the ruler)", and criterion 3 "all registered types". The "if the ruler definition is not yet registered" branch no longer applies. (ready-tickets reconciliation, 2026-10-21)
- The bundle test's placeholder type (ready-tickets reconciliation, 2026-10-21): `tests/package/per-type-bundle.test.ts` sets `OTHER_TYPE = "cylinder"` and injects a marker layout and definition under that key into both tables. Once a real type takes that key, the real entry overwrites the injected one, and "keeps every type's layout and definition in the entry component's bundle" fails.
  - When registering the cylinder, move `OTHER_TYPE` to a type that is still unregistered.
  - When no unregistered type is left (GSV TICKET-006), inject under a key outside `GRAPH_TYPES`, cast as the test already does with `as never`.
  - Keep the injection regexes in step with the tables' `Object.create(null) as Partial<Record<…>>` text.
  - For this ticket: tightening `definitions` to `Readonly<Record<GraphType, …>>` changes the text the bundle test's injection regex matches, and with every type registered no unregistered type is left for `OTHER_TYPE`. Fix both in this ticket.
- The caller-text limit check (`tests/core/validate-structure.test.ts`, "caller text limits") already covers every registered type; do not duplicate it. The completeness test may assert that every vocabulary string term shows `maxLength`. (ready-tickets reconciliation, 2026-10-21)

**Depends On:** TICKET-004, TICKET-005
**Blocks:** None

**Size:** Small

**Notes:** Cross-area predecessors: graph-library/number-lines-and-coordinate-graphs/TICKET-002, TICKET-003, TICKET-004; graph-library/data-graphs-and-pictographs/TICKET-002, TICKET-003, TICKET-005; graph-library/geometric-shapes-and-solids/TICKET-002, TICKET-003, TICKET-005, TICKET-006, TICKET-007. TICKET-004 is listed under Depends On in addition to the plan's TICKET-005 because the agreement test exercises derivation and domain stages.
