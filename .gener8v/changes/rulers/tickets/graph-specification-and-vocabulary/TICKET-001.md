# TICKET-001: Open the vocabulary to rulers: type list, object options, value lists and conditional terms

**Change:** rulers
**Capability Area:** Graph Specification & Vocabulary (graph-specification-and-vocabulary)
**Specification:** specifications/graph-specification-and-vocabulary.md

**Summary:** Prepare the shared mechanism for the ruler type before its definition lands:
- add `ruler` to the graph type list;
- let a measured object carry the shared `label` and `color`;
- make sure a value outside a fixed list (a unit, a division) is reported with the accepted names listed;
- add a way for a term to apply only when another term has a given value, so a smallest division on a centimetre ruler is reported as not applying.
**Priority:** Must
**Value:** The ruler's definition can be written with the shared machinery every other type uses, and a model that writes "cm" or puts a smallest division on a centimetre ruler gets an issue that says exactly what to change.

**Requirements Covered:**
- GSV-REQ-003: The supported graph types include the ruler (amended by `rulers`)
- GSV-REQ-040: A measured object's label and color accepted as presentation options (amended by `rulers`)
- GSV-REQ-049: A ruler's unit accepted only from a fixed, published list of unit names, any other value reported listing them
- GSV-REQ-050: An inch ruler's smallest division accepted only from a fixed, published list of divisions, any other value reported listing them
- GSV-REQ-051: A smallest division on a ruler whose unit is not inches reported as a property that does not apply

**Prior Art:**
- Read: `.gener8v/specifications/graph-specification-and-vocabulary.md` — Ruler Vocabulary (GSV-REQ-046..051), Behaviors & Rules → Rulers (US spellings `centimeters`/`inches`; variants and abbreviations reported; the unit given once; values plain numbers), the ruler rows of Edge Cases, and OQ-002 (strict vocabulary, no synonyms)
- Read: `.gener8v/specifications/number-lines-and-coordinate-graphs.md` — Rulers (NLC-REQ-040..056), for what the ruler definition (`rulers/number-lines-and-coordinate-graphs/TICKET-002`) will need from this ticket
- Read: `.gener8v/technical-design/system-design.md` — AD-003 (one definition), AD-004 (staged validator: structure, derivation, domain), AD-005 (naming), AD-006 (published and strict tool schema profiles)
- Read: `src/core/definitions/types.ts` — `GRAPH_TYPES` (filtered to registered types by `registeredTypes` in `src/core/definitions/index.ts`, so a listed type with no definition is not yet offered), `EnumValue` (`values`, `valueDescriptions`, `unknownCode`), `ObjectValue`
- Read: `src/core/definitions/shared.ts` — the scoped `label` and `color` options and their `appliesTo` / `elementsOf` lists
- Read: `src/core/validate/structure.ts` — the `enum` branch (a value outside the list is `wrong_kind` with "one of: …"; `unknown_image` lists and suggests), and the two `inapplicable_property` reports
- Read: `src/core/schema.ts` — how the published schema, the strict tool schema and the vocabulary are built from the definitions
- Read: `tests/core/definitions.test.ts` (the `GRAPH_TYPES` inline snapshot, the `elementsOf` expectations, `applicabilityProblems`), `tests/core/schema-agreement.test.ts`, `tests/graph.test.ts`

**Acceptance Criteria:**
- [ ] `GRAPH_TYPES` lists `ruler`. Until a ruler definition is registered, `ruler` is not offered as a supported type: it is not in `unknown_graph_type`'s list, the schema or the vocabulary, as for any unregistered type. The existing tests are updated to the new list
- [ ] The shared `label` and `color` list `ruler` in `elementsOf`, and their descriptions name a measured object ("this one point, segment, bar or measured object"). The applicability check still passes for every registered type
- [ ] An `enum` value outside its list is reported with every accepted name listed in the issue's message and data. A test shows it for a two-value list: "cm" is reported, and the message names "centimeters" and "inches"
- [ ] `valueDescriptions` on an `enum` term are published in the vocabulary, so the ruler can give each unit and division a plain-English description
- [ ] A property can be declared to apply only when a sibling term has one of given values (for example, a division applies only when `unit` is `inches`). When the condition fails, the value is reported as `inapplicable_property` at its own path, with a message saying what it applies to, and not checked further. When the condition holds, it is checked as usual. Tested with a test-only definition
- [ ] The conditional term is published in the schema without breaking GSV-NFR-003 (no description the schema rejects passes validation) or the strict tool profile (AD-006, prd/IC-001). Validation may be stricter than the schema, never looser
- [ ] `pnpm generate` leaves no unexplained difference in `src/generated`, and the schema-meta, schema-agreement and definitions tests pass

**Output:**
- `src/core/definitions/types.ts` — `GRAPH_TYPES` with `ruler`; the conditional-applicability field on a property spec
- `src/core/definitions/shared.ts` — `label` and `color` `elementsOf` include `ruler`
- `src/core/validate/structure.ts` — the conditional-applicability check, and the enum report listing names if it does not already
- `src/core/schema.ts` — conditional terms and enum value descriptions in the published schema and vocabulary
- `src/core/issues.ts` — the `inapplicable_property` message for a condition, if the existing one cannot say it
- `tests/core/validate-structure.test.ts`, `tests/core/definitions.test.ts`, `tests/core/schema-shape.test.ts` — prove each criterion (the conditional term with a test-only definition)

**Constraints:**
- prd/IC-001: the strict tool schema has an object root and only the common JSON Schema subset; do not rely on `if`/`then` there
- prd/TC-008: the one definition produces types, validation and schema; no schema library is added
- prd/TC-005: core code only

**Known Hazards:**
- The schema and the validator must still agree (GSV-NFR-003): no description the schema rejects may pass validation. A conditional term that the schema cannot express in the strict tool profile is allowed there and refused by validation, which is the permitted direction. Do NOT add `if`/`then`/`dependentSchemas` to the strict tool profile (AD-006, prd/IC-001). If the published profile uses them, the agreement test must cover them.
- Issue codes are stable across non-major releases (GSV-REQ-034). Reuse `inapplicable_property` and `wrong_kind` (or `unknown_image`'s pattern) rather than adding new codes. If a new code is unavoidable, document it and add it to the issue-code documentation test.
- Cross-change: `graph-library/graph-specification-and-vocabulary/TICKET-006` (not delivered) says the registry holds "exactly the eleven types". With `ruler` in `GRAPH_TYPES`, there are twelve. That ticket carries a Known Hazard saying so. Do not edit the delivered tests' meaning beyond the type list.
- Strict vocabulary (spec OQ-002): do not accept "centimetres", "cm" or "in" as synonyms. A suggestion of the closest name in the issue is allowed (the `unknown_image` pattern) but not required.
- Adding `ruler` to the `label` and `color` `elementsOf` lists is safe before the ruler is registered, because the applicability check runs per registered definition. Once the ruler definition registers, it must nest those exact spec objects in its object (the check fails otherwise).

**Depends On:** None
**Blocks:** TICKET-002

**Size:** Medium

**Notes:** Cross-area successor: `rulers/number-lines-and-coordinate-graphs/TICKET-002` (the ruler definition) uses all of this. Deliver this ticket before it (DEP-002: NLC needs GSV's mechanism).
