# TICKET-004: Validator — derivation and domain stages, normalization and provenance — Quality Review

## Summary

This review covers the files delivered for graph-library/graph-specification-and-vocabulary/TICKET-004 (branch `ticket/gsv-004`, delivery commit `2e9d5b6`). The `quality-reviewer` agent ran the findings phase in a fresh context.

Stages 3 and 4 are small, well placed and readable:
- one file per stage, with a shared `state.ts` so neither stage imports the other;
- one rule for choosing the defining value;
- null-prototype results throughout;
- 25 new behavioural tests that assert exact codes, paths and messages.

All eleven commands of the delivery's Verification Run pass when re-run.

The two Concerns are about values reaching the wrong place. Neither is visible with today's fixtures. Both can be reached with the definitions the type tickets are told to write:
- **QR-001:** derived values are never checked against their own member's spec. A circle whose members have curriculum-sized maxima can return a valid description that fails `validate` again (the idempotence criterion). A subnormal diameter becomes `internal_error`, which drops every other issue.
- **QR-002:** a missing required property is not recorded in `failed`. A domain check can therefore receive an element without it, and a check that reads that property throws. The caller then gets a lone `internal_error` instead of "add `from`".

The four Suggestions cover:
- the overflow issue's bound;
- a definitions check that never calls `derive`;
- untested or weakly asserted branches;
- a duplicate import and redundant parameters.

6 findings: 0 Critical, 2 Concerns, 4 Suggestions. The verdict below is provisional until resolution with the user.

**Files Reviewed:**
- `src/core/definitions/types.ts` (`Derivation`, `DomainCheck`)
- `src/core/validate/derive.ts`
- `src/core/validate/domain.ts`
- `src/core/validate/state.ts`
- `src/core/validate/index.ts`
- `src/core/index.ts`
- `tests/fixtures/definitions/circle.ts`
- `tests/fixtures/definitions/xy-graph.ts`
- `tests/core/validate-derive.test.ts`
- `tests/core/validate-domain.test.ts`
- `tests/core/definitions.test.ts` (`stageProblems` and its tests)
- `tests/core/validate-structure.test.ts` (the three updated expectations)

**Neighbours read for patterns and context:**
- source: `src/core/validate/structure.ts`, `src/core/definitions/index.ts`, `src/core/result.ts`, `src/core/describe.ts`, `src/core/issues.ts` (codes, parameters, messages)
- tests and fixtures: `tests/fixtures/definitions/index.ts`, the helpers in `tests/core/validate-envelope.test.ts` and `tests/core/validate-structure.test.ts`
- config: `eslint.config.js`, `package.json`
- ticket: `.gener8v/changes/graph-library/tickets/graph-specification-and-vocabulary/TICKET-004.md` (Known Hazards)
- design: AD-004 and the `normalize` contract in `.gener8v/technical-design/system-design.md`
- calibration: the GSV TICKET-003 quality review in this change

**Findings:** 6
**Critical:** 0 | **Concerns:** 2 | **Suggestions:** 4

## Quality Assessment

### Code Organization

**Rating:** Strong
**Notes:** The files follow AD-004's stages:
- `src/core/validate/derive.ts` is stage 3;
- `src/core/validate/domain.ts` is stage 4;
- `src/core/validate/state.ts` holds `StageState` and `touchesFailed`, the one rule both stages use to skip failed values;
- `src/core/validate/index.ts` stays the pipeline and the never-throw boundary.

Dependencies point one way: the stages import from `definitions`, `issues` and `result`, and nothing imports back. The contract changes in `src/core/definitions/types.ts` are readable data (`description`, `required`, `name`, `inputs`). They are what the schema generator and documentation will publish.

The pipeline does more work than it needs to. `checkDerivations` takes a `graphType` and a merged `properties` map that are both derivable from the `definition` it already receives, so `validateWith` builds `propertiesOf` a second time per call (QR-006).

### Readability

**Rating:** Strong
**Notes:** Names say what things do: `checkDerivations`, `runDomainChecks`, `touchesFailed`, `dropFailed`, `withinTolerance`, `alternatives`.

`checkDerivations` (`src/core/validate/derive.ts:36-100`) is one loop over groups. Each exceptional case (none supplied, overflow) ends in an early `continue`, so the main path reads top to bottom.

Comments give the reason rather than the mechanics:
- "A member that failed stage 2 was reported already; asking for one again would cascade."
- "Added by vocabulary term on the null-prototype description, never by an input key."

There is one dense spot: line 66 is a 170-character compound ternary that picks the overflow bound (QR-003). The tests read as specifications, grouped by requirement, with names that state the behaviour.

Nits, not raised as findings:
- The delivery copies `check`, `issuesOf` and `codesAndPaths` into two more test files. That follows the existing per-file pattern in `tests/core/validate-envelope.test.ts` and `tests/core/validate-structure.test.ts`.
- `stageProblems`' "at least two members" rule is not exercised by its own negative test (`tests/core/definitions.test.ts:330-342`).

### Error Handling

**Rating:** Needs Improvement
**Notes:** The never-throw boundary in `validateWith` still holds. These parts are right:
- `too_large` stops after stage 2;
- a member that failed stage 2 neither defines nor is asked for again;
- a contradicting member leaves the result and joins `failed`;
- `normalize` throws with a message that points to `validate`, as the design specifies.

The gaps share one pattern: a problem is attributed to the wrong party.

| Case | Who caused it | What the caller is told |
|------|---------------|-------------------------|
| a subnormal diameter or circumference (QR-001) | the caller | `internal_error`: "a defect in the package; please report it", with every other issue dropped |
| a missing required nested property that a domain check reads (QR-002) | the caller | the same lone `internal_error` |
| a `derive` that omits a member (QR-004) | the package | `out_of_range` on the caller's valid value: "radius must be … at most 9007199254740991; got 5" |
| a derived value outside its member's own range (QR-001) | the definition | nothing: the result is valid but does not validate again |

The overflow guard (DEL-004) is the right idea, but the bound it reports can contradict the value (QR-003).

### Test Coverage

**Rating:** Adequate
**Notes:** I ran the context.md verify commands (`## Repositories`, row `.`) and the rest of the delivery record's Verification Run. Environment: Node.js v24.1.0, pnpm 10.28.2, branch `ticket/gsv-004` at `2e9d5b6`.

| Command | Exit | Result |
|---------|------|--------|
| `pnpm lint` | 0 | no findings |
| `pnpm typecheck` | 0 | no errors |
| `pnpm test` | 0 | 13 files, 434 tests passed (global setup ran `tsup`) |
| `pnpm build` | 0 | four entries and declarations emitted; `dist/core/index.js` 34.51 KB unminified |
| `pnpm bench` | 0 | p95: circle 0.0130 ms, number-line 0.0192 ms, xy-graph 0.0388 ms (limit 5 ms) |
| `pnpm check:dist` | 0 | "Built files scanned: 4, no network APIs or network modules." |
| `pnpm size` | 0 | `./core` 7.3 kB minified and gzipped (limit 25 kB) |
| `pnpm publint` | 0 | "All good!" |
| `pnpm attw` | 0 | all green in the ESM-only profile |
| `pnpm check:deps` | 0 | "Runtime dependencies: 0, all justified." |
| `pnpm check:changesets` | 0 | "Changesets checked: 0." |

`pnpm vitest run tests/core/validate-derive.test.ts tests/core/validate-domain.test.ts --reporter=verbose` listed 19 and 6 passing tests, matching the delivery record. After all the runs, `git status` showed only the hook-managed `.gener8v/runs.jsonl`. The probe results quoted in the findings come from scratchpad scripts that import the source read-only. They run the real validator on derived definitions built by spreading the fixtures.

Every acceptance criterion has a behavioural test. Coverage includes:
- derivation from each member alone, with provenance;
- the 0.99%, exactly 1% and 1.01% boundaries, both through `withinTolerance` and end to end;
- the π ≈ 3.14 and 22/7 examples;
- the order rule, three disagreeing members, `insufficient`, a failed member skipped and overflow;
- idempotence, null prototypes with a parsed `__proto__`, plain JSON, and `normalize` and its throw;
- domain issues merged, checks skipped after a failure, a contradiction or `too_large`.

The weaknesses:
- The idempotence test uses members with no upper bound, which is why QR-001 passes it.
- `stageProblems` never calls `derive` (QR-004).
- An optional group, and the overflow result beyond its first issue, are not asserted (QR-005).

### Observability & Operability

**Rating:** Adequate
**Notes:** This is pure library code, and the package forbids telemetry (CPSE-REQ-005), so having no logging or metrics is correct. The operator-facing surface is the issue list. The new issues keep its standard:
- `insufficient` names the alternatives ("one of radius, diameter or circumference is needed");
- `contradiction` gives the value that would agree;
- the overflow case names the value at fault.

The attribution problems in Error Handling are also operability problems. Each one lands on a different reader:
- A caller-caused `internal_error` (QR-001, QR-002) reaches maintainers as a bug report about valid package behaviour.
- A package defect shown as `out_of_range` (QR-004) is never reported at all.

`internal_error` deliberately carries no detail (GSV TICKET-002 SEC-003). The reported description reproduces the problem deterministically, so these cases can be diagnosed, but only after someone files the report.

## Findings

### QR-001: Derived values are never checked against their own member's spec, so a valid result can fail validation again and an underflow becomes `internal_error`

**Category:** Error Handling
**Severity:** Concern
**Location:** `src/core/validate/derive.ts:72-98` (derived values added at `:93-97` with no range check; the zero assertion at `:75-77`); `tests/core/validate-derive.test.ts:124-134` (idempotence tested only on members with no upper bound)
**Description:** Stage 3 adds each derived value to the description as soon as it is computed. It never checks the value against the stage-2 spec of the member it fills. The comment at `:75-76` states the invariant the code relies on: "Every member is strictly positive by its stage-2 range, so no derived value is 0." It also relies, without saying so, on every member's range being consistent with its siblings'. Neither holds in practice:

| Definition | Input | Result |
|------------|-------|--------|
| fixture circle | `{ type: "circle", diameter: 5e-324 }` (passes `exclusiveMin: 0`) | `internal_error`: the derived radius underflows to 0 and the assertion throws |
| fixture circle | `{ type: "circle", diameter: 5e-324, showCenter: "yes" }` | the same lone `internal_error`; `wrong_kind /showCenter` is lost |
| fixture circle with `radius.max: 100`, `diameter.max: 150` | `{ type: "circle", radius: 100 }` | valid, with `diameter: 200` marked derived |
| same | that valid description, validated again | invalid: `out_of_range /diameter`, "diameter must be a number greater than 0 and at most 150; got 200." |

`circumference: 5e-324` behaves the same way.

**Impact:**
- **Idempotence fails under the configuration this delivery recommends.** The acceptance criterion that the description "passes `validate` again unchanged" holds only while member ranges happen to agree. DEL-004's Ticket Impact invites type tickets to "set a curriculum-sized `max` on measurements", which is exactly the configuration that breaks it.
- **Layout can receive values outside their published range.** The out-of-range value arrives in a result marked valid.
- **The underflow path blames the package for caller input.** It reports a caller's own (accepted) input as a package defect, asks for a bug report, and discards every independent issue.
- **The Known Hazard's premise is untrue in floating point.** "No derived value is 0" holds in real numbers but not for floats, and the delivery's Notes pass the same premise on to GSS TICKET-002 ("Give each measurement a positive range… a derived 0 is treated as a package defect").

**Recommendation:** Make one rule in stage 3, extending DEL-004: every derived value must be finite and satisfy its member's stage-2 range.
- Move `rangeOf` and `outOfRange` out of `src/core/validate/structure.ts` into a shared module and reuse them here.
- When a derived value breaks its member's range, report `out_of_range` on the defining value, as DEL-004 does. Use a bound derived back from the violated member's bound (a diameter maximum of 150 gives "radius must be at most 75"), so the message can be acted on.
- For the underflow, the practical fix is a non-zero, curriculum-sized `min` on positive measurements, modelled in `tests/fixtures/definitions/circle.ts` and recommended to GSS TICKET-002. That makes a derived 0 unreachable, keeps the assertion's premise true, and needs no zero special case in the tolerance check (the Known Hazard).
- Add tests for a subnormal diameter, a ranged circle where a derived value exceeds its member's `max`, and idempotence on a ranged fixture.
- Record the rule as a DEL. QR-004 suggests a matching definitions-test rule.

**Status:** Resolved
**Resolution:** One rule in stage 3: every derived value must satisfy its member's range, with failures reported on the defining value using a range derived back from every member. Tests cover a ranged circle, idempotence at the limits, underflow and overflow.

---

### QR-002: A domain check can receive an element that is missing a required property, because `missing_property` is not recorded in `failed`

**Category:** Error Handling
**Severity:** Concern
**Location:** `src/core/validate/structure.ts:244-248` (`missing_property` pushed with no `walk.failed.add`); `src/core/validate/domain.ts:13-16` (the gate that relies on `failed`); `src/core/definitions/types.ts:187-191` (the `DomainCheck` contract)
**Description:** The new `DomainCheck` contract says a check "runs only when every input is present and nothing at or below an input failed an earlier stage, so its issues never follow from another issue". DEL-005 says the same. `runDomainChecks` enforces this with `touchesFailed` over `failed`. However, stage 2 records a missing required property only as an issue, not in `failed`. A container that is missing a required member therefore counts as passed, and the check receives it:

| Check | Input | Result |
|-------|-------|--------|
| a segment check reading `segment.from.x` (the shape the real xy-graph will need) | `segments: [{ to: { x: 1, y: 1 } }]`, `showGrid: "yes"` | one `internal_error`; `missing_property /segments/0/from` and `wrong_kind /showGrid` are lost |
| the fixture's "points inside the axes" | `points: [{ x: 9 }]` | `missing_property /points/0/y` and `outside_axis_range /points/0/x`. The check ran on the incomplete point and survived only because `undefined < min` is `false` |

**Impact:** Every type ticket writes its checks against this contract. An author who trusts it will dereference required nested values, which is the natural thing to do. Then one of the most common authoring mistakes (a missing nested value) crashes the validator. The caller, often a model through the tool handler, gets "a defect in the package; please report it" instead of the actionable "add `from`" and every other independent issue. The alternative is defensive `undefined` guards in every check, which defeats the point of the gate.
**Recommendation:**
- Record the missing property's pointer in `walk.failed` beside the `missing_property` issue (`src/core/validate/structure.ts:247`, one line). `touchesFailed` then skips any check whose input contains it, which is what DEL-005 describes.
- Say in the `DomainCheck` and `StageState.failed` comments that "failed" includes a required value that is missing.
- Add a `tests/core/validate-domain.test.ts` case with a check that dereferences a nested required object. Assert that `missing_property` and the other issues survive.

`structure.ts` is TICKET-003 output, but the change is the contract this ticket's gate depends on.
**Status:** Resolved
**Resolution:** A missing required property is recorded in `failed`, with a test of a check that dereferences a nested required value.

---

### QR-003: The overflow issue's `range.max` can be a bound the value already satisfies

**Category:** Error Handling
**Severity:** Suggestion
**Location:** `src/core/validate/derive.ts:63-70` (the bound chosen at `:66`)
**Description:** When a derived value is not finite, the defining value gets `out_of_range` with `range: { max }`, where `max` is the spec's `max` or `Number.MAX_SAFE_INTEGER`:
- **A spec `max` that the value satisfies.** With `radius.max: 1e308`, the input `radius: 1e308` gives "radius must be a number at most 1e+308; got 1e+308."
- **No spec `max`.** The message says "at most 9007199254740991", but `radius: 1e300` is accepted (valid, circumference 6.28e300), so the published bound is not the accepted one.
- **`exclusiveMax` is dropped** from the reported range.

**Impact:** The spec-`max` branch can only be reached when that `max` is itself large enough to overflow, which is exactly when the message contradicts itself. With the curriculum-sized `max` DEL-004 anticipates, the branch is unreachable, so DEL-004's "which then appears in this message" never happens. This is unlikely to occur, but the message is the caller's only guide to a fix.
**Recommendation:** Report a bound that would actually be accepted. Two ways:
- Derive it back from the member that overflowed: `group.derive(overflowingTerm, Number.MAX_VALUE)[defining]`, capped at `Number.MAX_SAFE_INTEGER`.
- Drop the spec-`max` branch and always use `Number.MAX_SAFE_INTEGER`.

In either case:
- Put the choice in a named helper so `:66` reads at a glance.
- Fold it into QR-001's single derived-value rule if that is adopted.
- Update DEL-004's Ticket Impact.

**Status:** Resolved
**Resolution:** The bound is derived back from the members (the largest representable value when a member is unbounded), never `MAX_SAFE_INTEGER`; it is in the named helper `definingRange`.

---

### QR-004: The definitions well-formedness check never calls `derive`, so a defective group is reported to callers as their own error

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/core/definitions.test.ts:303-322` (`stageProblems`); `src/core/validate/derive.ts:64` (a missing member is treated as an overflow)
**Description:** `stageProblems` checks a group's members, description and length, and a check's inputs. It never calls `derive`. Two definition defects pass it and surface to callers as misleading issues:

| Defect | Input | Result |
|--------|-------|--------|
| `derive` omits `circumference` | `{ type: "circle", radius: 5 }` | `out_of_range /radius`: "radius must be a number at most 9007199254740991; got 5." |
| a member in two groups (`[radius, diameter]`, `[diameter, circumference]`) | `{ type: "circle", radius: 5, circumference: 40 }` | "circumference (40) disagrees with diameter; …". The diameter was derived in the first group; the caller never supplied it |

"Listed once" (the plan) is checked within a group, not across groups.
**Impact:** context.md names mathematical correctness as the main correctness risk, and calls for property tests for derived values ("circle radius ↔ diameter ↔ circumference"). `stageProblems` runs over every registered definition (`allDefinitions()`), so one rule there protects every type ticket automatically. Without it, a `derive` defect looks like a caller mistake and is never reported as a bug. This is the reverse of QR-001's misattribution.
**Recommendation:** Extend `stageProblems` so that, for each member `m` and a few sample values inside `m`'s range:
- `derive(m, v)` returns every member as a finite number, with `m` itself equal to `v`;
- it round-trips: for every other member `n`, `derive(n, derived[n])` is within `TOLERANCE` of `derived`;
- each member appears in at most one of the type's groups;
- the derived values fall inside each member's range (QR-001).

Optionally, in `src/core/validate/derive.ts`, throw (which gives `internal_error`, a package defect) when `derive` omits a member, and keep `out_of_range` for values that are present but not finite.

**Status:** Resolved
**Resolution:** `stageProblems` calls `derive` from each member's bounds, checks the results are finite and positive and round-trip, and checks that no member is in two groups.

---

### QR-005: Some stage-3 branches are unexercised or weakly asserted

**Category:** Testing
**Severity:** Suggestion
**Location:** `src/core/validate/derive.ts:48` (the `required: false` side); `tests/core/validate-derive.test.ts:56-59` (overflow test); `src/core/validate/state.ts:19` (`touchesFailed` branches)
**Description:**
- **Optional groups.** No fixture has a group with `required: false`, so "an optional group with nothing supplied gives no issue" is not pinned. A probe confirms it works today (valid, `provenance: { "/showCenter": "supplied" }`).
- **The overflow test.** It destructures `[issue]` and uses `toMatchObject`. A second, cascading issue, a changed message, or derived members left in the result would all still pass. The other tests in the file assert the whole list (`codesAndPaths`) or the whole issue (`toEqual`).
- **`touchesFailed`.** Its "a containing value failed" and `""` branches cannot be reached by today's callers. Group members and check inputs are top-level terms, and a `too_large` result returns before stage 3. No test exercises them directly.

**Impact:** These are the branches a type ticket's refactor or the triangle's extension (delivery Notes) is most likely to disturb, and the suite would not notice.
**Recommendation:**
- Add an optional group to a fixture (or to an inline definition, as `tests/core/validate-domain.test.ts:56-71` does) and assert that a description with none of its members is valid.
- Assert the overflow result's full issue list and message.
- Either unit-test `touchesFailed`'s four cases directly, or narrow it to the cases its callers reach and say why in its comment.

**Status:** Resolved
**Resolution:** Tests added for an optional group, the full overflow result, and `touchesFailed`'s cases.

---

### QR-006: A duplicate import and redundant parameters in the stage-3 call

**Category:** Readability
**Severity:** Suggestion
**Location:** `src/core/validate/index.ts:1`, `src/core/validate/index.ts:5`, `src/core/validate/index.ts:34`; `src/core/validate/derive.ts:36-41`
**Description:** The file and the stage-3 signature carry more than they need:
- **Duplicate import.** `src/core/validate/index.ts` imports from `../definitions/index` twice: line 1, and line 5 after `../result`, out of order.
- **`graphType` repeats the definition.** It is always `definition.type`.
- **`properties` is the wrong map.** It is read only to find a group member's spec. `stageProblems` requires every member to be one of the definition's own `properties`, and `propertySpec(definition.properties, defining)` gives the same spec.
- **`propertiesOf` runs twice.** `validateWith` builds the merged, deep-frozen map a second time per validation (`checkStructure` already built one).

**Impact:** The reader has to work out that three arguments say the same thing, and the import list hides that one module is used twice. The performance cost is negligible (bench p95 0.013–0.039 ms); the point is readability.
**Recommendation:**
- Merge the two imports.
- Reduce the signature to `checkDerivations(definition, state)`, using `definition.type` and `propertySpec(definition.properties, defining)`.

If QR-003 removes the spec-`max` lookup, the `properties` parameter goes away anyway.
**Status:** Resolved
**Resolution:** The imports are merged, and the signature is now `checkDerivations(definition, state)`.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Approved | One rule in stage 3: every derived value must satisfy its member's range, with failures reported on the defining value using a range derived back from every member. Tests cover a ranged circle, idempotence at the limits, underflow and overflow. | see Post-Review Amendments |
| QR-002 | Approved | A missing required property is recorded in `failed`, with a test of a check that dereferences a nested required value. | see Post-Review Amendments |
| QR-003 | Approved | The bound is derived back from the members (the largest representable value when a member is unbounded), never `MAX_SAFE_INTEGER`; it is in the named helper `definingRange`. | see Post-Review Amendments |
| QR-004 | Approved | `stageProblems` calls `derive` from each member's bounds, checks the results are finite and positive and round-trip, and checks that no member is in two groups. | see Post-Review Amendments |
| QR-005 | Approved | Tests added for an optional group, the full overflow result, and `touchesFailed`'s cases. | see Post-Review Amendments |
| QR-006 | Approved | The imports are merged, and the signature is now `checkDerivations(definition, state)`. | see Post-Review Amendments |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0
**Notes:** Resolved with the Product Owner on 2026-10-06. All six findings were fixed and re-verified with the full verification set (see the delivery record's Post-Review Amendments).
