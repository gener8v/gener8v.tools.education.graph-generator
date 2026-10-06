# TICKET-005: Schema generator — published schema, strict tool schema, types and vocabulary

**Change:** graph-library
**Capability Area:** Graph Specification & Vocabulary (graph-specification-and-vocabulary)
**Specification:** specifications/graph-specification-and-vocabulary.md

**Summary:** Build `scripts/generate.ts`, which reads the definitions and writes the TypeScript description types, the published JSON Schema, the strict-profile tool schema and the vocabulary (AD-003, AD-006), plus runtime getters for the schema and vocabulary, with CI checks that the outputs are fresh, meta-schema valid and agree with the validator.
**Priority:** Must
**Value:** A person or a language model can learn every graph type, term and value kind from one published schema that the package is guaranteed to honor.

**Requirements Covered:**
- GSV-REQ-007: Publish a machine-readable JSON Schema covering every type
- GSV-REQ-008: Parameters of each type defined separately, selected by the graph-type field
- GSV-REQ-009: Plain-English description of every type and property
- GSV-REQ-010: Schema available programmatically and as a static file
- GSV-REQ-011: Reject every description the published schema rejects
- GSV-REQ-013: Publish the vocabulary with definitions
- GSV-REQ-014: Publish, per type, applicable, required and optional terms and their value kinds
- GSV-REQ-015: Vocabulary, schema and validation generated from one definition
- GSV-NFR-002: The published schema is valid against the meta-schema it declares — verified by a meta-schema validation test in CI
- GSV-NFR-003: No description the schema rejects passes validation — verified by a fast-check property test generating ≥ 1,000 descriptions per graph type in CI

**Prior Art:**
- Read: TICKET-001 output — `src/core/definitions/types.ts`, `src/core/definitions/shared.ts`, `src/core/definitions/index.ts`
- Read: TICKET-003 output — `src/core/validate/index.ts` (the validator the schema must agree with)
- Read: `.gener8v/technical-design/system-design.md` — AD-003 (generator and freshness check), AD-006 (two profiles), AD-001 (`./schema.json`, `./vocabulary.json` exports), Component Design › Schema generator
- Read: `.gener8v/constraints/prd.md` — prd/IC-001 (provider schema subsets), prd/TC-008
- Read: graph-library/component-packaging-and-source-export/TICKET-001 output — `package.json` (`exports`, `generate` script), `.github/workflows/ci.yml` (freshness step)

**Acceptance Criteria:**
- [ ] `pnpm generate` writes `src/generated/description.ts`, `src/generated/schema.json`, `src/generated/tool-schema.json` and `src/generated/vocabulary.json`; the build copies schema and vocabulary to `dist/schema.json` and `dist/vocabulary.json`, exported as `./schema.json` and `./vocabulary.json`
- [ ] CI fails when committed generated files differ from a fresh `pnpm generate`
- [ ] Published schema: JSON Schema 2020-12; root `anyOf` of one closed object (`additionalProperties: false`) per graph type, each with `type` as a `const`; optional properties not listed under `required`; every type and property carries a `description`
- [ ] Tool schema: root `{ "type": "object", "properties": { "graph": <anyOf per type> }, "required": ["graph"], "additionalProperties": false }`; every object closed; every property listed under `required`; optional properties typed as `[<kind>, "null"]`; no `oneOf`, `if`/`then`, `patternProperties` or `format`
- [ ] Vocabulary: every term with its plain-English definition, and per type the applicable terms, required/optional, value kind, range and derivation groups
- [ ] Generated TypeScript types match the definitions (a type-level test assigns each example to `GraphDescription`)
- [ ] `getSchema()`, `getToolSchema()` and `getVocabulary()` are exported from `./core`
- [ ] The published and tool schemas each validate against the JSON Schema 2020-12 meta-schema, verified by `tests/core/schema-meta.test.ts` with Ajv (dev dependency) in CI (GSV-NFR-002)
- [ ] Property test `tests/core/schema-agreement.test.ts` generates ≥ 1,000 descriptions per registered graph type (valid, mutated and random) and asserts that no description Ajv rejects against the published schema passes `validate` (GSV-NFR-003); it iterates over the registry so each type is included as it registers
- [ ] No runtime dependency is added; Ajv is a dev dependency only

**Output:**
- `scripts/generate.ts` — generator
- `src/core/schema.ts` — `getSchema()`, `getToolSchema()`, `getVocabulary()`
- `src/generated/description.ts` — `GraphDescription` union and per-type description types
- `src/generated/schema.json`, `src/generated/tool-schema.json`, `src/generated/vocabulary.json` — consumed by graph-library/component-packaging-and-source-export/TICKET-007 (tool schema) and TICKET-008 (documentation)
- `tests/core/schema-meta.test.ts` — GSV-NFR-002
- `tests/core/schema-agreement.test.ts` — GSV-NFR-003
- `tests/core/schema-shape.test.ts` — profile shape criteria (object root, closed objects, nullable optionals, forbidden keywords)

**Constraints:** prd/IC-001 (tool schema must stay within the common provider subset); prd/TC-008 (generator in-house, no runtime library)

**Known Hazards:**
- GSV-REQ-008 says parameters are "selected by the graph-type field", which reads naturally as `oneOf` with a discriminator. AD-006 supersedes that wording: use `anyOf` of closed objects with `type` as a `const` — the constants are disjoint, so `anyOf` behaves as `oneOf` and is accepted by more validators and providers. Do NOT emit `oneOf` or `discriminator`.
- The tool schema is not the published schema: it wraps the description in `graph` and uses the strict profile with nullable optionals (AD-006). Do not try to make one schema serve both; generate both from the definitions.
- Image names in the pictograph `unitImage` enum come from the image manifest (graph-library/data-graphs-and-pictographs/TICKET-004); read them from the manifest at generate time, never hard-code them.
- RES-001 (RD-001): the generator walks `GraphTypeDefinition`; if the circle vertical slice changes the contract, update the generator in that same delivery.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-001-code-review/CR-002, CR-004 and CR-006: generate each type's schema and vocabulary from `propertiesOf(type)`. Leave the `appliesTo` and `elementsOf` fields out of the published output. Publish one vocabulary entry per term, since the consistency check in `tests/core/definitions.test.ts` guarantees one definition per term.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-001-code-review/CR-006 and graph-library/graph-specification-and-vocabulary-ticket-001-security-review/SEC-004: `validate` accepts color names in any ASCII case (`"Blue"`), so the published `color` schema must too (for example, a case-insensitive pattern of the names plus the hex pattern). Otherwise schema and validator disagree (GSV-REQ-011, GSV-NFR-003).

**Depends On:** TICKET-001, TICKET-003
**Blocks:** TICKET-006

**Size:** Large

**Notes:** GSV-REQ-011 is guaranteed by construction (both from one definition) and proven by GSV-NFR-003's property test. Provider re-verification of the strict profile (TQ-002) happens in graph-library/component-packaging-and-source-export/TICKET-007; if it finds a rule this profile breaks, change the generator here and record the delivery decision.
