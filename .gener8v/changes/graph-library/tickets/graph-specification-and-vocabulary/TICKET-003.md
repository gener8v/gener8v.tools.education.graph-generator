# TICKET-003: Validator — envelope and structure stages with term suggestions

**Change:** graph-library
**Capability Area:** Graph Specification & Vocabulary (graph-specification-and-vocabulary)
**Specification:** specifications/graph-specification-and-vocabulary.md

**Summary:** Build the single `validate(input)` entry and its first two stages (AD-004): the envelope stage (object, graph type, schema version) and the structure stage (unknown, inapplicable, wrong-kind, out-of-range and missing properties), reporting every issue in one pass with closest-term suggestions.
**Priority:** Must
**Value:** Any description of any graph type can be checked through one call, and every structural mistake comes back at once with a fix suggestion.

**Requirements Covered:**
- GSV-REQ-001: One JSON object describes a graph of any type
- GSV-REQ-002: Graph type identified from one required field
- GSV-REQ-004: One point of entry for every graph type
- GSV-REQ-005: Only plain JSON data accepted
- GSV-REQ-006: Optional schema-version field; absent means current
- GSV-REQ-016: Validate before render; never render an invalid description
- GSV-REQ-017: Every problem reported in one pass
- GSV-REQ-018: Report each missing required property
- GSV-REQ-019: Report each property that is not an applicable term
- GSV-REQ-020: Suggest the closest applicable term
- GSV-REQ-021: Report each wrong value kind
- GSV-REQ-022: Report each out-of-range value (non-positive lengths, min ≥ max)
- GSV-REQ-024: Report unknown or missing graph type and list the supported types
- GSV-REQ-025: Report an unsupported schema version
- GSV-REQ-026: Validate without rendering and without a browser
- GSV-REQ-041: Report a presentation option on a type it does not apply to
- GSV-NFR-001: Validating one description of any type takes ≤ 5 ms at p95 in Node.js on a CI runner — verified by a Vitest bench over every graph type's example description

**Prior Art:**
- Read: TICKET-001 output — `src/core/definitions/types.ts` (PropertySpec kinds and ranges), `src/core/definitions/shared.ts` (applicability), `src/core/definitions/index.ts` (registry)
- Read: TICKET-002 output — `src/core/issues.ts` (codes, message templates, `pointer`), `src/core/result.ts`
- Read: `.gener8v/specifications/graph-specification-and-vocabulary.md` — Validation subsection, Behaviors & Rules › Description Handling, Edge Cases table
- Read: `.gener8v/technical-design/system-design.md` — AD-004 (stages, stop rules, suggestion threshold), AD-005 (`type`, `version`, JSON Pointer), Interface Contracts › Validation API

**Acceptance Criteria:**
- [ ] `validate(input: unknown)` is exported from `src/core/index.ts` (`./core` entry) and never throws for any input; an unexpected exception becomes an `internal_error` issue
- [ ] Envelope stage: a non-object input (array, string, number, null) yields exactly one `not_an_object` issue; a JSON string input is not parsed and yields `not_an_object`
- [ ] Envelope stage: missing or unknown `type` yields `unknown_graph_type` with `allowed` listing all supported types, and no further checks run
- [ ] Envelope stage: a `version` other than a supported integer yields `unsupported_version` and no further checks run; absent `version` validates against the current version (`1`)
- [ ] Structure stage collects all of: `unknown_property` (not a term for this type), `inapplicable_property` (a presentation option that does not apply to this type), `missing_property`, `wrong_kind`, `out_of_range` — each with its JSON Pointer path, including nested array items such as `/points/2/x`
- [ ] NaN, Infinity and numeric strings such as `"5"` yield `wrong_kind`; numeric strings are never coerced
- [ ] A suggestion is given when Damerau–Levenshtein distance to the closest applicable term is ≤ 2 or ≤ one third of that term's length; otherwise the issue's `allowed` lists the applicable terms
- [ ] Colors not in the named-color list and not a valid hexadecimal code yield `unknown_color` with `allowed` listing the named colors
- [ ] An empty label string is accepted and treated as no label
- [ ] A description with many independent problems reports all of them (test with ≥ 5 seeded problems)
- [ ] `validate` runs in Node.js with no DOM and imports nothing from React (lint and a Node-environment test)
- [ ] p95 ≤ 5 ms per description for each type's example, measured by `tests/core/validate.bench.ts` in the CI verification run (GSV-NFR-001); until type tickets land, the bench runs over the fixture types in the test suite

**Output:**
- `src/core/validate/index.ts` — `validate(input: unknown): ValidationResult` (stages 3–4 added by TICKET-004)
- `src/core/validate/envelope.ts` — envelope stage
- `src/core/validate/structure.ts` — structure stage over `PropertySpec`
- `src/core/validate/suggest.ts` — `closestTerm(name, terms)` using Damerau–Levenshtein
- `tests/core/validate-envelope.test.ts` — envelope criteria
- `tests/core/validate-structure.test.ts` — structure, kind, range, suggestion, color, many-problems criteria (uses small fixture definitions under `tests/fixtures/definitions/`)
- `tests/core/validate.bench.ts` — GSV-NFR-001 benchmark

**Constraints:** prd/TC-005 (no React DOM or browser globals in validation); prd/OC-001 (all behavior covered by automated tests)

**Known Hazards:**
- AD-004 supersedes a literal reading of GSV-REQ-017: "every problem" means every *independent* problem. Do not run type checks after an envelope failure, and do not run later stages on a property that failed structure — this avoids cascades and is intended.
- Strictness assumption (GSV Assumptions): unknown and inapplicable properties are errors, not warnings. Do not add a warning level.
- The tool path treats `null` on optional properties as absent (AD-006); that stripping happens in the tool handler (graph-library/component-packaging-and-source-export/TICKET-007), NOT here — here, `null` where the kind does not allow it is `wrong_kind`.
- No type definitions exist yet; build and test against fixture definitions so this ticket is not blocked on the rendering areas. Real types register themselves later.
- Product Owner decision 2026-10-05 on graph-library/graph-specification-and-vocabulary-ticket-002-security-review/SEC-002: the validator does NOT cap the number of issues. GSV-REQ-029 stands as written, and every independent issue is returned. Display caps belong to the sinks (CPSE TICKET-003, 006 and 007).
- Carried from graph-library/graph-specification-and-vocabulary-ticket-002-security-review/SEC-003: never put exception text, `error.message` or `error.stack` into an issue or a message. `validate` turns any unexpected exception (including one thrown by `issueMessage` for an unknown code) into `createIssue("internal_error", "", {})`, whose message is fixed; for `invalid_json`, pass only the JSON parser's message as `detail`. Add a test that a thrown internal exception yields no `file:`, `/node_modules/` or `    at ` frame in the output.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-002 code and quality reviews: `createIssue` takes inputs typed per code (`IssueParamsByCode` in `src/core/issues.ts`). Pass a key from the description as `term` unchanged, because `describeTerm` quotes and escapes anything that is not term-shaped. For `contradiction`, pass the pointers in `conflicts` and the vocabulary terms in `conflictTerms`. Import the helpers from `src/core/issues.ts` by path: they are not exported from `./core`.

**Depends On:** TICKET-001, TICKET-002
**Blocks:** TICKET-004, TICKET-005

**Size:** Large

**Notes:** Cross-area: every type ticket in number-lines-and-coordinate-graphs, data-graphs-and-pictographs and geometric-shapes-and-solids depends on this (DEP-002, DEP-003, DEP-004), as do graph-library/component-packaging-and-source-export/TICKET-003 and TICKET-007 (DEP-006). Large because it carries the whole structural validator; splitting envelope from structure would leave neither demonstrable alone.
