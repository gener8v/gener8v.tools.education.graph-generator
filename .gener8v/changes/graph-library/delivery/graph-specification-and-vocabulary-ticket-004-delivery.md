# TICKET-004: Validator — derivation and domain stages, normalization and provenance — Delivery Record

## Ticket Reference

**Ticket:** graph-library/graph-specification-and-vocabulary/TICKET-004
**Change:** `.gener8v/changes/graph-library/change.md`, Approved when delivery started
**Specification:** `.gener8v/specifications/graph-specification-and-vocabulary.md`
**Requirements Covered:**
- GSV-REQ-023: Report values that contradict one another
- GSV-REQ-028: A valid result includes the normalized description with derived values
- GSV-REQ-035: Publish which values determine which, per type
- GSV-REQ-036: Accept any one of a set of mutually determining values
- GSV-REQ-037: Derive every dependent value from the defining value
- GSV-REQ-038: Check supplied dependent values within the documented tolerance
- GSV-REQ-039: Mark each value as supplied or derived

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Depends On: TICKET-003 delivered | delivery record, Delivered | Delivered, verification passed, all three reviews resolved and Approved (commits 450c9f7, 6085609) | ✅ |
| `src/core/validate/index.ts` stage pipeline | present | `validateWith(input, registry)`: envelope, then structure, then a valid or invalid result | ✅ |
| `src/core/validate/structure.ts` reports what passed | present | `checkStructure(contents, type, version, registry)` returns `issues`, a null-prototype `description` and `provenance`, and `failed` | ✅ |
| `Derivation`, `DomainCheck` (`src/core/definitions/types.ts`) | present | `Derivation { members; derive(term, value) }`; `DomainCheck` is a bare function | ⚠️ Resolved in plan. As they stand, a group cannot say it is required (a circle needs one of its three measurements), it carries no readable description for GSV-REQ-035, and a domain check cannot say which properties it reads, so "runs only on properties that passed stage 2" cannot be enforced. The plan extends both, inside RES-001's adjustment window before the circle slice (RD-001) |
| `contradiction`, `insufficient`, `ambiguous` codes and `Provenance` | present | present; `contradiction` takes `conflicts`, `conflictTerms` and `agreeingValue` | ✅ |
| Prior Art: specification Derived Values; Behaviors › Derived Values and Tolerance | present | present, Approved | ✅ |
| Prior Art: design AD-004 stages 3–4; Data Model › NormalizedDescription and Provenance | present | present, Approved | ✅ |
| Output paths free (`derive.ts`, `domain.ts`, two test files) | absent | absent | ✅ |
| Carried findings deferred to this ticket | read the Known Hazards | provenance as a separate map; no tolerance property; no zero special-case; export `describe`; null-prototype results; use `failed`; stop on `too_large` | 🔁 Carried. Each is addressed in the plan |

**Resolved from ground truth (not escalated):**
- "Two dependent values supplied without a defining value" and "several members supplied" are one rule: the defining value is the first supplied member, in the group's documented order, that passed stage 2. Every other supplied member is checked against it.

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.` (branch `ticket/gsv-004`, cut from `ticket/gsv-003`)
**Plan approved by:** Engineer — Thomas, 2026-10-06

### Planned Files

- `src/core/definitions/types.ts` (contract additions, inside RES-001's adjustment window before the circle slice):
  - `Derivation` gains `description`, readable text of the relationships (GSV-REQ-035), and `required`: whether one member must be given. If none is given, the issue is `insufficient`. `members` and `derive(term, value)` are unchanged.
  - `DomainCheck` becomes `{ name, inputs, check(description) }`. A check runs only when every input is present and nothing at or below it failed stage 2 or 3.
- `src/core/validate/derive.ts` (stage 3), for each group:
  - Members that failed stage 2 are ignored.
  - The defining value is the first supplied member in the group's order.
  - Every member is derived; absent ones are added as `derived`, by term, on the null-prototype description.
  - Every other supplied member is checked within 1% relative, with exactly 1% accepted. Outside that, `contradiction` at the member, naming the defining member in `conflicts` and `conflictTerms`, with the agreeing value; the member joins `failed`.
  - A non-finite derived value gives `out_of_range` on the defining value (its spec's `max`, or the largest safe integer).
  - A derived 0 is asserted impossible: a package defect, so `internal_error`.
- `src/core/validate/domain.ts` (stage 4): runs each check whose inputs all passed, and merges its issues.
- `src/core/validate/index.ts`:
  - Envelope, then structure, then derivation, then domain; `too_large` stops after structure.
  - Stages 3 and 4 run even when stage 2 found issues, on values that passed only.
  - The result is valid only with no issues.
  - New `normalize(input)` returns the normalized description, or throws.
- `src/core/index.ts`: exports `validate`, `normalize` and `describe` (AD-001).
- Fixtures:
  - The circle gains `diameter` and `circumference` (radius no longer required), with a required group: radius, diameter, circumference.
  - The xy-graph gains a points-inside-axes check (`outside_axis_range`).
  - Existing tests that expected "radius is required" now expect `insufficient`.
- `tests/core/definitions.test.ts`: group members are top-level number properties, listed once; check `inputs` are real terms.
- `tests/core/validate-derive.test.ts`:
  - derivation from each member alone;
  - tolerance (0.99% and exactly 1% accepted, 1.01% rejected) and the ticket's examples (31.4 with radius 5; 44 with radius 7);
  - the order rule, two dependents without a defining value, three disagreeing members;
  - `insufficient`, a failed member skipped, an infinite derived value;
  - provenance, null prototypes with a parsed `__proto__`, idempotence, and `normalize`.
- `tests/core/validate-domain.test.ts`: issues merged; a check skipped when an input failed or after a contradiction; no stage after `too_large`.

### How Acceptance Criteria Will Be Met

- Stage 3 only on members that passed; stage 4 only on inputs that passed: `validate-derive.test.ts` (failed member skipped) and `validate-domain.test.ts` (check skipped).
- Derivation, order, tolerance, contradiction and two dependents: `validate-derive.test.ts`.
- Domain issues merged: `validate-domain.test.ts`.
- Normalized description, provenance and idempotence: `validate-derive.test.ts`.
- `normalize`: `validate-derive.test.ts`.
- Groups readable as data: `Derivation.description` and `members`, checked in `definitions.test.ts`.
- Decisions to record:
  - DEL-001: the two contract additions.
  - DEL-002: one defining-value rule.
  - DEL-003: exactly 1% accepted.
  - DEL-004: a non-finite derived value gives `out_of_range`.
  - DEL-005: a check skips when any value under its inputs failed.
  - DEL-006: a contradicting member joins `failed`.

## Progress

- [x] `src/core/definitions/types.ts`: done
- [x] `src/core/validate/derive.ts`: done
- [x] `src/core/validate/domain.ts`: done
- [x] `src/core/validate/index.ts`: done
- [x] `src/core/index.ts`: done
- [x] `tests/fixtures/definitions/` (circle group, xy-graph check): done
- [x] `tests/core/definitions.test.ts`: done
- [x] `tests/core/validate-derive.test.ts`: done
- [x] `tests/core/validate-domain.test.ts`: done
- [x] existing validator tests updated for the circle group: done

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/core/definitions/types.ts`:
  - `Derivation` gains `description` and `required`.
  - `DomainCheck` is now `{ name, inputs, check }`.
- `src/core/validate/derive.ts`: `checkDerivations` (stage 3), `withinTolerance` and `TOLERANCE` (0.01).
- `src/core/validate/domain.ts`: `runDomainChecks` (stage 4).
- `src/core/validate/state.ts`: `StageState`, and `touchesFailed`, which decides whether a value or anything inside or around it failed.
- `src/core/validate/index.ts`:
  - The pipeline runs envelope, structure, derivation and domain. A `too_large` result stops after structure.
  - `normalize` and `normalizeWith` are new.
- `src/core/index.ts`: exports `validate`, `normalize` and `describe`.
- `tests/fixtures/definitions/circle.ts`: radius, diameter and circumference, with a required derivation group.
- `tests/fixtures/definitions/xy-graph.ts`: a "points inside the axes" domain check.
- `tests/core/validate-derive.test.ts`: 19 tests.
- `tests/core/validate-domain.test.ts`: 6 tests.
- `tests/core/definitions.test.ts`: checks that group members are top-level number properties listed once, that each group has a description and at least two members, and that each check reads real terms (19 tests).
- `tests/core/validate-structure.test.ts`: three expectations updated for the circle's derivation group.

## Verification Run

Node.js v24.1.0, pnpm 10.28.2, branch `ticket/gsv-004`.

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm lint` | 0 | no findings |
| `pnpm typecheck` | 0 | no errors |
| `pnpm test` | 0 | 13 files, 434 tests passed (validate-derive 19, validate-domain 6, definitions 19, validate-structure 71, validate-envelope 32) |
| `pnpm bench` | 0 | p95: circle 0.0136 ms, number-line 0.0194 ms, xy-graph 0.0396 ms (limit 5 ms) |
| `pnpm build` | 0 | all entries and declarations emitted |
| `pnpm check:dist` | 0 | no network APIs in built output |
| `pnpm size` | 0 | `./core` 7.3 kB of 25 kB |
| `pnpm publint` | 0 | "All good!" |
| `pnpm attw` | 0 | no problems in the ESM-only profile |
| `pnpm check:deps` | 0 | 0 runtime dependencies |
| `pnpm check:changesets` | 0 | 0 changesets |

## Acceptance Criteria Verification

- [x] Stage 3 runs only on members that passed stage 2, and stage 4 only on properties that passed:
  - `validate-derive.test.ts` "derives nothing from a member that failed" (`radius: -1` gives only `out_of_range`; `radius: "5"` with `diameter` gives only `wrong_kind`);
  - `validate-domain.test.ts` "skips a check whose input failed an earlier stage" and "skips a check whose input contradicted another value".
- [x] Only a defining value supplied gives every dependent value: `validate-derive.test.ts` "derives every other member from the %s alone" (radius, diameter and circumference each alone).
- [x] Several members supplied: the defining value follows the documented order and every other member is checked against it. `validate-derive.test.ts` "takes the first supplied member in the documented order as defining" and "checks every other supplied member against the defining one".
- [x] Within 1% is accepted (31.4 with radius 5; 44 with radius 7): `validate-derive.test.ts` "accepts values computed with π ≈ 3.14 or 22/7" and the boundary test (0.99% and exactly 1% accepted).
- [x] Just over 1% gives `contradiction`, with `conflicts` naming every member involved and the message stating the agreeing value: `validate-derive.test.ts` boundary test (1.01% rejected) and "reports a contradiction naming every member involved…".
- [x] Two dependents without a defining value: one documented value defines and the other is checked. `validate-derive.test.ts` "takes the first supplied member…" (diameter with circumference: diameter defines; 31.4 accepted, 40 rejected).
- [x] Domain-check issues are merged into the single list: `validate-domain.test.ts` "merges domain issues with structure issues into one list"; `validate-derive.test.ts` "reports derivation issues alongside structure issues".
- [x] A valid result returns the description with derived values and a provenance map, and the description validates again unchanged:
  - `validate-derive.test.ts` "derives every other member…" (provenance per member);
  - "keeps provenance beside the description";
  - "validates again to the same description (idempotence)".
- [x] `normalize(input)` returns the normalized description for a valid input and throws for an invalid one: `validate-derive.test.ts` "normalize" group (`normalizeWith` on the fixtures; the public `normalize`, exported from `./core`).
- [x] Derivation groups are readable data on each definition (GSV-REQ-035): `Derivation.members` and `description`; `definitions.test.ts` "derivation groups and domain checks are well formed".

## Decisions Made

### DEL-001: Two additions to the definition contract

**Context:** As delivered by TICKET-001:
- a derivation group could not say that one of its members is required (a circle needs one of three measurements);
- it had no readable description to publish (GSV-REQ-035);
- a domain check could not say what it reads, so "runs only on properties that passed stage 2" could not be enforced.

**Decision:**
- `Derivation` gains `description` (plain-English relationships) and `required`. When `required` is set and no member is given (and none failed stage 2), the issue is `insufficient` at `""`, for example "circle cannot be determined: one of radius, diameter or circumference is needed; add the missing value."
- `DomainCheck` becomes `{ name, inputs, check(description) }` (method syntax, so it stays bivariant).

**Rationale:** Both are readable data the schema generator and documentation can publish. Both changes fall within RES-001's single adjustment window before the circle slice (RD-001).
**Ticket Impact:** Every type ticket writes groups and checks in this shape. GSS TICKET-002 (the circle) is the first real user. After it lands, further contract changes are breaking and need a DEL.

### DEL-002: One rule chooses the defining value

**Context:** The specification describes "several members supplied" and "two dependents without a defining value" separately.
**Decision:** The defining value is the first supplied member, in the group's documented order, that passed stage 2. Every other supplied member is checked against it.
**Rationale:** One rule, which tests pin. It covers both cases, and a member that failed stage 2 never defines.
**Ticket Impact:** Type tickets list members in the order they want them to define. The documentation publishes that order.

### DEL-003: Exactly 1% is accepted

**Context:** "Within 1%" leaves the boundary open.
**Decision:** `|supplied − derived| ≤ 0.01 × |derived|`. Exactly 1% (10.1 or 9.9 against 10) is accepted; 1.01% is rejected.
**Rationale:** It reads naturally ("within") and is pinned by tests. Floating-point error at the boundary only ever falls on the accepting side.
**Ticket Impact:** None.

### DEL-004: A derived value that overflows is reported as out of range

**Context:** A finite defining value can derive a value that is not finite (a radius of 1e308 gives an infinite circumference). An infinite value cannot be drawn, and it is not JSON data.
**Decision:** The defining value gets `out_of_range`, with `range.max` set to its spec's `max` or `Number.MAX_SAFE_INTEGER`, and leaves the result.
**Rationale:** The caller's value is the cause, so the issue belongs to it, not to `internal_error`.
**Ticket Impact:** Type tickets may set a curriculum-sized `max` on measurements, which then appears in this message.

### DEL-005: A check skips when anything under its inputs failed

**Context:** AD-004 says domain checks run only on members that passed stage 2.
**Decision:** A check runs only when each of its `inputs` is present and nothing at, inside or around that input failed stage 2 or stage 3 (`touchesFailed`). For example, if one point fails, the "points inside the axes" check skips, and only that point's own issue is reported.
**Rationale:** No issue follows from another. The cost is that the other points' range issues appear only after the bad point is fixed, which is acceptable because the caller is told about the bad point now.
**Ticket Impact:** Type tickets choose `inputs` as the terms a check cannot run without. They may split a check by input when partial checking matters.

### DEL-006: A contradicting member leaves the result and joins `failed`

**Context:** Stage 4 must not read a value that contradicts another.
**Decision:** On `contradiction`, the supplied member is removed from the description and its provenance, and its pointer joins `failed`. The defining member stays.
**Rationale:** It is the same rule as stage-2 failures, so domain checks treat both alike.
**Ticket Impact:** None.

## Deviations from Plan

- **`src/core/validate/state.ts`** (a new file, not in the plan) holds the shared `StageState` and `touchesFailed` used by both new stages. It keeps `derive.ts` and `domain.ts` free of each other.
- **`normalizeWith(input, registry)`** was added beside `normalize`, in the same way as `validateWith`, so tests can normalize against fixture types. It is internal and not exported from `./core`.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| GSV-REQ-023 | `src/core/validate/derive.ts`:checkDerivations; `src/core/validate/domain.ts`:runDomainChecks | `@spec GSV-REQ-023` |
| GSV-REQ-028 | `src/core/validate/derive.ts`:checkDerivations; `src/core/validate/index.ts`:validate, normalize | `@spec GSV-REQ-028` |
| GSV-REQ-035 | `src/core/definitions/types.ts`:Derivation | `@spec GSV-REQ-035` |
| GSV-REQ-036 | `src/core/validate/derive.ts`:checkDerivations | `@spec GSV-REQ-036` |
| GSV-REQ-037 | `src/core/validate/derive.ts`:checkDerivations | `@spec GSV-REQ-037` |
| GSV-REQ-038 | `src/core/validate/derive.ts`:withinTolerance, checkDerivations | `@spec GSV-REQ-038` |
| GSV-REQ-039 | `src/core/validate/derive.ts`:checkDerivations; `src/core/validate/index.ts`:validate | `@spec GSV-REQ-039` |

## Notes

- **For GSS TICKET-002 (the circle):**
  - The fixture `tests/fixtures/definitions/circle.ts` shows the group shape the real circle needs.
  - Give each measurement a positive range. The tolerance check relies on it, and a derived 0 is treated as a package defect.
- **For GSS TICKET-004 (the triangle):** the triangle solver is more than a single-value derivation group: sides and angles, with `insufficient` and `ambiguous`. Implement it as a domain check, or extend `Derivation` with a DEL. `insufficient` and `ambiguous` exist for it.
- **For CPSE TICKET-003 and TICKET-007:** use `validate` and then the result's `description`, not `normalize` (which throws). `describe(description)` now comes from `./core`.
- **Size:** `./core` grew to 7.3 kB of 25 kB.

## Post-Review Amendments

None
