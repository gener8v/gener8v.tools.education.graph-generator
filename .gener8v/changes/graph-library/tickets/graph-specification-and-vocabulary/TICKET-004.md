# TICKET-004: Validator — derivation and domain stages, normalization and provenance

**Change:** graph-library
**Capability Area:** Graph Specification & Vocabulary (graph-specification-and-vocabulary)
**Specification:** specifications/graph-specification-and-vocabulary.md

**Summary:** Add validation stages 3 and 4 (AD-004): derive dependent values from whichever defining value was supplied, check supplied dependent values within 1%, run each type's domain checks, and return the normalized description with a provenance map recording which values were supplied and which derived.
**Priority:** Must
**Value:** An author can give a circle by its circumference alone and get the radius and diameter filled in, and a contradiction such as radius 5 with diameter 12 is caught instead of drawn.

**Requirements Covered:**
- GSV-REQ-023: Report values that contradict one another
- GSV-REQ-028: A valid result includes the normalized description with derived values
- GSV-REQ-035: Publish which values determine which, per type
- GSV-REQ-036: Accept any one of a set of mutually determining values
- GSV-REQ-037: Derive every dependent value from the defining value
- GSV-REQ-038: Check supplied dependent values within the documented tolerance
- GSV-REQ-039: Mark each value as supplied or derived

**Prior Art:**
- Read: TICKET-003 output — `src/core/validate/index.ts` (stage pipeline), `src/core/validate/structure.ts` (which properties passed structure)
- Read: TICKET-001 output — `src/core/definitions/types.ts` (`Derivation`, `DomainCheck`)
- Read: TICKET-002 output — `src/core/issues.ts` (`contradiction`, `insufficient`, `ambiguous`), `src/core/result.ts` (`Provenance`)
- Read: `.gener8v/specifications/graph-specification-and-vocabulary.md` — Derived Values subsection, Behaviors & Rules › Derived Values and Tolerance
- Read: `.gener8v/technical-design/system-design.md` — AD-004 stages 3–4 and defining-value order, Data Model › NormalizedDescription and Provenance

**Acceptance Criteria:**
- [ ] Stage 3 runs only on derivation-group members that passed stage 2; stage 4 runs a type's `checks` only on properties that passed stage 2
- [ ] When only a defining value is supplied, every dependent value in its group is derived
- [ ] When several members are supplied, the defining value is chosen by the group's documented order and every other supplied member is checked against the derived value
- [ ] A supplied dependent value within 1% relative of the derived value is accepted (for example, circumference 31.4 with radius 5; circumference 44 with radius 7 using π ≈ 22/7)
- [ ] A supplied dependent value just over 1% off yields `contradiction`, with `conflicts` naming every member involved and the message stating the value that would agree
- [ ] When two dependent values are supplied without a defining value, one documented value is taken as defining and the other is checked against it
- [ ] Domain-check issues from a type's `checks` are merged into the single issue list
- [ ] A valid result returns `description` — the input with derived values added — and `provenance`, a map from JSON Pointer to `"supplied"` or `"derived"`; `description` itself passes `validate` again unchanged (idempotence test)
- [ ] `normalize(input)` returns the normalized description for a valid input and throws for an invalid one (documented as internal use after `validate`)
- [ ] Derivation groups are readable data on each definition so the schema generator (TICKET-005) and documentation can publish them (GSV-REQ-035)

**Output:**
- `src/core/validate/derive.ts` — stage 3: defining-value selection, derivation, tolerance check
- `src/core/validate/domain.ts` — stage 4: run `checks`
- `src/core/validate/index.ts` — extended pipeline; `normalize(input)`
- `tests/core/validate-derive.test.ts` — derivation, tolerance boundary (0.99% accepted, 1.01% rejected), order, two-dependents, provenance, idempotence (fixture definition with a radius/diameter/circumference group)
- `tests/core/validate-domain.test.ts` — domain-check merging

**Constraints:** None identified

**Known Hazards:**
- GSV-REQ-039 says the normalized description "should mark each value"; the design (Data Model › NormalizedDescription and Provenance) keeps provenance as a separate map *beside* the description so the normalized description stays a valid description. Implement the separate map; do NOT wrap values in `{ value, source }` objects.
- Tolerance is 1% relative (GSV Behaviors & Rules); GSV OQ-003 asks whether it should be configurable — do not add a per-description tolerance property now.
- Relative tolerance against a derived value of zero is undefined; no derivation group in this change can derive zero (all members are strictly positive by stage 2 ranges), so assert that and do not special-case it.

**Depends On:** TICKET-003
**Blocks:** TICKET-006

**Size:** Medium

**Notes:** The circle (graph-library/geometric-shapes-and-solids/TICKET-002) is the first real derivation group and the vertical slice that proves this stage (TQ-008); triangles add the heaviest domain checks.
