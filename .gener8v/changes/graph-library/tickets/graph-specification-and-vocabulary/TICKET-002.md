# TICKET-002: Issue codes and validation result types

**Change:** graph-library
**Capability Area:** Graph Specification & Vocabulary (graph-specification-and-vocabulary)
**Specification:** specifications/graph-specification-and-vocabulary.md

**Summary:** Define the fixed, documented issue-code set with plain-English message templates, and the plain-JSON validation result and issue types every validator stage, the tool handler and the components return.
**Priority:** Must
**Value:** A person or a model reading a validation failure gets a stable code, the exact field and a message saying how to fix it.

**Requirements Covered:**
- GSV-REQ-027: The result states whether the description is valid
- GSV-REQ-029: An invalid result lists every issue with the path to the property
- GSV-REQ-030: Each issue carries a code from a fixed, documented set
- GSV-REQ-031: Each issue carries a plain-English message naming the property and the fix
- GSV-REQ-032: Each issue carries expected kind, allowed range, conflicting properties or suggested term where applicable
- GSV-REQ-033: Results are plain JSON data
- GSV-REQ-034: Issue codes are stable across non-major releases

**Prior Art:**
- Read: `.gener8v/specifications/graph-specification-and-vocabulary.md` — Validation Results subsection, Edge Cases table
- Read: `.gener8v/technical-design/system-design.md` — Data Model › ValidationResult and Issue, IssueCode set (initial), AD-005 (JSON Pointer paths), AD-015 (`invalid_json`, `internal_error`)
- Read: `.gener8v/dependencies/dependency-map.md` — RES-008 (issue-code set shared with the rendering areas and the tool)
- Read: graph-library/component-packaging-and-source-export/TICKET-001 output — `src/core/index.ts`

**Acceptance Criteria:**
- [ ] `IssueCode` is a string union containing the full initial set from the design: `not_an_object`, `unknown_graph_type`, `unsupported_version`, `missing_property`, `unknown_property`, `inapplicable_property`, `wrong_kind`, `out_of_range`, `contradiction`, `insufficient`, `ambiguous`, `not_a_triangle`, `too_many_ticks`, `tick_spacing_invalid`, `tick_label_not_on_tick`, `outside_axis_range`, `degenerate_segment`, `scale_excludes_value`, `tick_interval_not_dividing`, `series_length_mismatch`, `unknown_image`, `unknown_color`, `invalid_json`, `internal_error`
- [ ] `issueDocs` documents every code; a test fails if any code lacks documentation
- [ ] `Issue` has `code`, `path` (JSON Pointer, RFC 6901), `message`, and optional `expected`, `range`, `conflicts`, `suggestion`, `allowed`
- [ ] `ValidationResult` is `{ valid: true, description, provenance }` or `{ valid: false, issues }` with `issues` non-empty
- [ ] Message templates name the property by its vocabulary term and state what would make the value acceptable (for example, "radius must be a number greater than 0; got -2")
- [ ] A result survives `JSON.parse(JSON.stringify(result))` unchanged (no functions, class instances, `undefined` values or non-finite numbers)
- [ ] A snapshot test of the code list fails when a code is renamed or removed, with a comment stating that this is a breaking change (GSV-REQ-034, CPSE-REQ-042)
- [ ] JSON Pointer construction escapes `~` and `/` in keys per RFC 6901

**Output:**
- `src/core/issues.ts` — `IssueCode`, `issueDocs`, `issueMessage(code, params)` templates, `pointer(...segments)`
- `src/core/result.ts` — `Issue`, `ValidationResult`, `Provenance` types
- `tests/core/issues.test.ts` — documentation completeness, JSON round-trip, pointer escaping, code-list snapshot

**Constraints:** None identified

**Known Hazards:**
- RES-008: rendering areas add domain codes as they build types. Codes listed above are already reserved; a type ticket that needs a new code adds it here with documentation and updates the snapshot — never invents a code inline.
- `invalid_json` is emitted only by the tool handler (AD-015) and `internal_error` signals a defect; document both as such so callers do not treat `internal_error` as a description problem.

**Depends On:** None
**Blocks:** TICKET-003

**Size:** Small

**Notes:** Cross-area predecessor: graph-library/component-packaging-and-source-export/TICKET-001 (DEP-001).
