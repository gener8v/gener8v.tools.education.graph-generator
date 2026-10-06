# TICKET-004: Validator — derivation and domain stages, normalization and provenance — Code Review

## Summary

I reviewed the delivery of `graph-library/graph-specification-and-vocabulary/TICKET-004` (delivery commit `2e9d5b6`, branch `ticket/gsv-004`). I checked it against the ticket and its seven Known Hazards, the Graph Specification & Vocabulary specification, `constraints/prd.md`, `technical-design/system-design.md` and `dependencies/dependency-map.md` (RES-001, RD-001).

- **Criteria and requirements:** eight of the ten acceptance criteria are met in full. Two are met for the ticket's examples but not at every value: tiny measurements underflow (CR-001), and the exact 1% boundary depends on the decimal (CR-002). All seven requirements are present in code. GSV-REQ-037 and GSV-REQ-038 are Partial for the same two reasons.
- **Annotations:** all seven requirements carry `@spec` annotations. These match the five new rows (seven requirements) in the specification's `## @spec Coverage` table. The gener8v lint reports 0 errors and 0 warnings.
- **Verification:** all eleven Verification Run commands reproduce with exit 0. The test count matches: 434 tests, of which 19 are in `validate-derive`, 6 in `validate-domain` and 19 in `definitions`.
- **Known Hazards:** all seven are handled (see Delivery Decisions Review). The "no derived zero" premise in the third hazard is false in floating point (CR-001).
- **Issue-level findings (3):**
  - A tiny positive measurement gives `internal_error` (CR-001).
  - Values at exactly 1%, which DEL-003 says are accepted, are rejected for many values (CR-002).
  - DEL-005 skips a whole domain check because of failures the check never reads, such as a mistyped key. This hides independent problems (CR-003).
- **Observations (2):** a definition defect in `derive` is reported as the caller's `out_of_range` (CR-004). The design's record of the definition contract (RES-001) is stale, and TICKET-005 is not told what to publish (CR-005).

**Reviewer:** `code-reviewer` agent, fresh context (findings phase only, 2026-10-06)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/graph-specification-and-vocabulary-ticket-004-delivery.md`
**Files Reviewed:**
- `src/core/definitions/types.ts` (`Derivation`, `DomainCheck`)
- `src/core/validate/derive.ts`
- `src/core/validate/domain.ts`
- `src/core/validate/state.ts`
- `src/core/validate/index.ts`
- `src/core/index.ts`
- `tests/fixtures/definitions/circle.ts`, `tests/fixtures/definitions/xy-graph.ts`
- `tests/core/validate-derive.test.ts`
- `tests/core/validate-domain.test.ts`
- `tests/core/definitions.test.ts` (the delivery's changes)
- `tests/core/validate-structure.test.ts` (the delivery's changes)
- `.gener8v/specifications/graph-specification-and-vocabulary.md` (`## @spec Coverage` rows added by the delivery)
- Read for context, unchanged by this delivery: `src/core/validate/structure.ts`, `src/core/issues.ts`, `src/core/result.ts`, `src/core/describe.ts`, `src/core/definitions/index.ts`, `tests/fixtures/definitions/index.ts`, `tests/fixtures/definitions/axis.ts`, `tests/package/node-entry.test.ts`, `dist/core/index.js` and `dist/core/index.d.ts` (after `pnpm build`)

**Findings:** 5
**Critical:** 0 | **Issues:** 3 | **Observations:** 2

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| Stage 3 runs only on derivation-group members that passed stage 2; stage 4 runs a type's `checks` only on properties that passed stage 2 | Yes | `src/core/validate/derive.ts:43-44`: a member that `touchesFailed` is never supplied, so it never defines and is never checked. `:93` never derives into a failed slot. `src/core/validate/domain.ts:13-16` runs a check only when every input is present and untouched. Tests:<br>- `tests/core/validate-derive.test.ts:50-54`: `radius: -1` gives only `out_of_range`; `radius: "5"` with `diameter` gives only `wrong_kind`.<br>- `tests/core/validate-domain.test.ts:41-50` and `:56-71`: failed input and contradicted input.<br>The skip rule is stricter than the criterion and hides independent issues (CR-003) |
| When only a defining value is supplied, every dependent value in its group is derived | Partial | `src/core/validate/derive.ts:59-61`, `:93-97`. `tests/core/validate-derive.test.ts:24-37` derives from radius, diameter and circumference alone, with provenance. A positive value whose derived value underflows to 0 gives `internal_error` instead: `diameter: 5e-324` and `circumference: 1e-323` (probed). See CR-001 |
| When several members are supplied, the defining value is chosen by the group's documented order and every other supplied member is checked against the derived value | Yes | `src/core/validate/derive.ts:44` filters in `group.members` order, and `:59` takes the first. `:79-92` checks every other supplied member. Tests: `tests/core/validate-derive.test.ts:94-100` (order) and `:102-107` (radius, diameter and circumference all checked) |
| A supplied dependent value within 1% relative of the derived value is accepted (31.4 with radius 5; 44 with radius 7 using π ≈ 22/7) | Partial | `src/core/validate/derive.ts:14-16` (`withinTolerance`, inclusive per DEL-003). Tests: `tests/core/validate-derive.test.ts:73-76` (both examples) and `:63-71` (0.99%; exactly 1% at 10.1 and 9.9 against 10). The inclusive boundary fails for many other values: 7.07 and 6.93 against 7, 1.01 and 0.99 against 1, 2.02 against 2, and 70.7 against 70 are all rejected (probed). See CR-002 |
| A supplied dependent value just over 1% off yields `contradiction`, with `conflicts` naming every member involved and the message stating the value that would agree | Yes | `src/core/validate/derive.ts:81-91`. The issue's `path` is the checked member, and `conflicts`/`conflictTerms` name the defining member. Together they name both members of each disagreement, which matches `Issue.conflicts` ("the other properties involved", `src/core/result.ts:25`). `agreeingValue` goes into the message. Tests: `tests/core/validate-derive.test.ts:63-71` (1.01% rejected) and `:84-92` (full issue, "a value of 10 would agree") |
| When two dependent values are supplied without a defining value, one documented value is taken as defining and the other is checked against it | Yes | Under the single rule of DEL-002 (`src/core/validate/derive.ts:59`). `tests/core/validate-derive.test.ts:94-100`: diameter with circumference, so diameter defines; 31.4 is accepted and 40 is rejected, with "31.42 would agree" |
| Domain-check issues from a type's `checks` are merged into the single issue list | Yes | `src/core/validate/domain.ts:17` pushes into `state.issues`, which starts as stage 2's issues (`src/core/validate/index.ts:32`). Tests: `tests/core/validate-domain.test.ts:33-39` (structure and domain issues together) and `tests/core/validate-derive.test.ts:109-114` (structure and derivation issues together) |
| A valid result returns `description` (input plus derived values) and `provenance` (JSON Pointer → `"supplied"`/`"derived"`); `description` passes `validate` again unchanged | Yes | `src/core/validate/index.ts:37-38`. Derived values are added by term, with `"derived"` provenance (`src/core/validate/derive.ts:95-96`). Tests at `tests/core/validate-derive.test.ts`:<br>- `:24-37`: provenance for each member.<br>- `:118-122`: provenance beside the description, never inside it.<br>- `:124-134`: idempotence on two inputs.<br>- `:144-147`: plain JSON.<br>Also probed with `version: 1` and `circumference: 44`: the second pass gives the same description, every value `"supplied"` |
| `normalize(input)` returns the normalized description for a valid input and throws for an invalid one (documented as internal use after `validate`) | Yes | `src/core/validate/index.ts:56-70`. The JSDoc says to use it after `validate`, and the thrown message is fixed. Tests: `tests/core/validate-derive.test.ts:150-159` (`normalizeWith` on fixtures; the public `normalize` throws). `dist/core/index.js` exports `normalize` (checked after `pnpm build`) |
| Derivation groups are readable data on each definition so the schema generator (TICKET-005) and documentation can publish them (GSV-REQ-035) | Yes | `src/core/definitions/types.ts:173-185`: `members` in defining order, plain-English `description`, `required`. Tests: `tests/core/definitions.test.ts:303-343` require top-level number members, each listed once, at least two of them, and a description. TICKET-005 is not told to publish `description`, order or `required` (CR-005) |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| GSV-REQ-023 | Report values that contradict one another | `src/core/validate/derive.ts:79-92` (`checkDerivations`, derivation groups); `src/core/validate/domain.ts:11-19` (`runDomainChecks`, the mechanism through which GSS TICKET-004's triangle inequality will report) | Yes for derivation groups. The triangle example belongs to GSS TICKET-004 |
| GSV-REQ-028 | A valid result includes the normalized description with derived values | `src/core/validate/index.ts:27-38` (`validateWith`); `src/core/validate/derive.ts:93-97`; `src/core/validate/index.ts:68-70` (`normalize`) | Yes |
| GSV-REQ-035 | Publish which values determine which, per type | `src/core/definitions/types.ts:173-185` (`Derivation.members`, `description`) | Yes for this ticket's part, the readable data. Publishing it is TICKET-005's (CR-005) |
| GSV-REQ-036 | Accept any one of a set of mutually determining values | `src/core/validate/derive.ts:44`, `:59-61` | Yes |
| GSV-REQ-037 | Derive every dependent value from the defining value | `src/core/validate/derive.ts:61`, `:72-97` | Partial. Every in-range value derives, except a value whose derived value underflows to 0, which gives `internal_error` (CR-001) |
| GSV-REQ-038 | Check supplied dependent values within the documented tolerance | `src/core/validate/derive.ts:7` (`TOLERANCE`), `:14-16` (`withinTolerance`), `:79-92` | Partial. Within 1% is accepted and beyond 1% is rejected. The exact-1% boundary that DEL-003 documents as accepted is rejected for many values (CR-002) |
| GSV-REQ-039 | Mark each value as supplied or derived | `src/core/validate/derive.ts:96`; stage 2's `"supplied"` entries carried through `src/core/validate/index.ts:30`; contradicted values removed at `src/core/validate/derive.ts:23-28` | Yes. Provenance is a separate map, as the Data Model and the first Known Hazard require |

*No NFR is carried by this ticket. GSV-NFR-001's benchmark still runs in the Verification Run: p95 is 0.0132 ms for the circle, 0.0183 ms for the number line and 0.0345 ms for the x,y graph.*

### Constraint Compliance

The ticket lists "Constraints: None identified". These PRD constraints bear on the delivered code:

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/TC-005 | Validation must not load React DOM or browser globals, and is importable on its own | Yes | The new modules (`derive.ts`, `domain.ts`, `state.ts`) import only `src/core` modules. `pnpm lint` exits 0 with `src/core/**` under the non-rendering rules. `pnpm check:dist` finds no network APIs in the 4 built files |
| prd/TC-008 | The single definition comes from hand-written code or a JSON-Schema-emitting library, counted against the dependency rule and budget | Yes | `Derivation` and `DomainCheck` are hand-written data on the definition. `pnpm check:deps` reports 0 runtime dependencies. `pnpm size` reports `./core` at 7.3 kB of 25 kB |
| prd/CC-003 | The package must not collect, transmit or store data | Yes | `pnpm check:dist` exits 0 |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-001 | `./core` exports `validate`, `normalize`, `getSchema`, `getVocabulary` and `describe`, with no React | Yes for this ticket's part | `src/core/index.ts:12-13`. The built `dist/core/index.js` exports `describe`, `normalize` and `validate`, and `normalizeWith` and `validateWith` stay internal. `getSchema` and `getVocabulary` are TICKET-005's |
| AD-003 | One definition per type holds `derivations` and `checks`, which the validator reads at runtime | Yes | `checkDerivations` and `runDomainChecks` read `definition.derivations` and `definition.checks` (`src/core/validate/index.ts:27`, `:34-35`). DEL-001 extends the shape. The design's Data Model still shows the old shape (CR-005) |
| AD-004 | Stages 3 and 4: the documented defining order, 1% relative tolerance, contradictions naming every member, domain checks on members that passed, and no issue that is a consequence of another | Partial | Stage order, `too_large` stop and running on passed values only: `src/core/validate/index.ts:23-35`. Defining order: `src/core/validate/derive.ts:44`, `:59`, matching "radius, then diameter, then circumference". No cascades: `tests/core/validate-derive.test.ts:50-54`, `tests/core/validate-domain.test.ts:41-71`. The domain skip goes further than "members that passed". It also skips on failures the check never reads, such as an unknown key or a sibling label, which works against the decision's rationale, "every independent problem is reported" (CR-003) |
| Data Model › NormalizedDescription and Provenance | Derived values added; provenance kept beside, not inside, so the normalized description is itself a valid description | Yes | `src/core/validate/derive.ts:95-96`. Null prototypes: `tests/core/validate-derive.test.ts:136-142`. Idempotence: `tests/core/validate-derive.test.ts:124-134` |
| Interface Contracts › Validation API | Never throws; malformed input is an issue; an internal defect surfaces as `internal_error` | Partial | Never throws: the `try`/`catch` in `src/core/validate/index.ts:18-41` holds. The `internal_error` boundary is crossed both ways:<br>- a caller's valid tiny value is reported as a package defect (CR-001);<br>- a definition defect in `derive` is reported as the caller's `out_of_range` (CR-004) |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| GSV-REQ-023 | `@spec GSV-REQ-023` | `src/core/validate/derive.ts:35` (`checkDerivations`); `src/core/validate/domain.ts:10` (`runDomainChecks`) | Yes |
| GSV-REQ-028 | `@spec GSV-REQ-028` | `src/core/validate/derive.ts:35`; `src/core/validate/index.ts:50` (`validate`), `:67` (`normalize`) | Yes |
| GSV-REQ-035 | `@spec GSV-REQ-035` | `src/core/definitions/types.ts:172` (`Derivation`) | Yes |
| GSV-REQ-036 | `@spec GSV-REQ-036` | `src/core/validate/derive.ts:35` | Yes |
| GSV-REQ-037 | `@spec GSV-REQ-037` | `src/core/validate/derive.ts:35` | Yes |
| GSV-REQ-038 | `@spec GSV-REQ-038` | `src/core/validate/derive.ts:13` (`withinTolerance`), `:35` | Yes |
| GSV-REQ-039 | `@spec GSV-REQ-039` | `src/core/validate/derive.ts:35`; `src/core/validate/index.ts:50` | Yes |

**Coverage:** 7 of 7 requirements annotated. Each annotation sits on the line directly above its function or interface, below the JSDoc block. `python3 …/gener8v-state.py lint --root .` reports 0 errors and 0 warnings.
**Missing:** None
**Specification table:** Yes. `## @spec Coverage` in `.gener8v/specifications/graph-specification-and-vocabulary.md:201-207` lists exactly these locations.

### Verification Run

I re-ran the commands on Node.js v24.1.0 and pnpm 10.28.2, branch `ticket/gsv-004` at `2e9d5b6`, the same environment as the record. The working tree was unchanged afterwards, apart from the hook-managed `.gener8v/runs.jsonl`.

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm lint` | 0 | Yes: no findings |
| `pnpm typecheck` | 0 | Yes: no errors |
| `pnpm test` | 0 | Yes: 13 files, 434 tests passed (validate-derive 19, validate-domain 6, definitions 19) |
| `pnpm bench` | 0 | Yes: p95 circle 0.0132 ms, number-line 0.0183 ms, xy-graph 0.0345 ms (limit 5 ms) |
| `pnpm build` | 0 | Yes: all entries and declarations emitted (`dist/core/index.d.ts` 4.53 KB) |
| `pnpm check:dist` | 0 | Yes: 4 built files scanned, no network APIs or modules |
| `pnpm size` | 0 | Yes: `./core` 7.3 kB of 25 kB |
| `pnpm publint` | 0 | Yes: "All good!" |
| `pnpm attw` | 0 | Yes: only the ignored `node10` and CJS rows in the ESM-only profile |
| `pnpm check:deps` | 0 | Yes: 0 runtime dependencies |
| `pnpm check:changesets` | 0 | Yes: 0 changesets checked |

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | The change falls inside RES-001's one adjustment window. GSS TICKET-002's Known Hazard calls the circle slice "the one expected adjustment to `GraphTypeDefinition` (RD-001)", and no type has registered yet. The compiler requires `description`, `required`, `name` and `inputs`, so no type ticket can leave them out. The design's Data Model was not updated, and TICKET-005 is not told to publish the new fields (CR-005) |
| DEL-002 | Reasonable | One rule covers both specification cases. It matches AD-004's documented order, and a member that failed stage 2 never defines. Pinned by `tests/core/validate-derive.test.ts:94-107` |
| DEL-003 | Questionable | Accepting exactly 1% is a sound reading of "within". The rationale's claim that "floating-point error at the boundary only ever falls on the accepting side" is false. It holds for 10.1 and 9.9 against 10, the only values tested, and fails for 7.07 against 7, 1.01 against 1 and others (CR-002) |
| DEL-004 | Reasonable in intent, incomplete | Blaming the caller's value is right, and overflow is handled and tested. Underflow is not: a derived 0 from a positive input throws, which becomes `internal_error` (CR-001). The fallback `range.max` of `Number.MAX_SAFE_INTEGER` is not the real bound, because a radius of 1e20 is accepted. The same branch also catches a definition's missing or NaN derived value and blames the caller (CR-004) |
| DEL-005 | Questionable | It prevents cascades. Its reach is wider than the record says ("if one point fails"). Any failure at or below an input skips the whole check, even a failure the check cannot read: an unknown key such as `xAxis.sparkle`, a bad `tickSpacing`, or another point's `label`. Each of these hides an outside-the-axis point (probed). The Ticket Impact guidance on choosing `inputs` is not carried to the type tickets that write checks (CR-003) |
| DEL-006 | Reasonable | It applies the stage-2 rule to contradictions. The defining member stays, so checks that read it still run. Tested in `tests/core/validate-domain.test.ts:56-71` |

**Deviations from Plan:**
- **`src/core/validate/state.ts`:** acceptable. It is a small shared module (`StageState`, `touchesFailed`) that keeps `derive.ts` and `domain.ts` independent of each other. It changes no other ticket's interface.
- **`normalizeWith`:** acceptable. It mirrors `validateWith`, it is not exported from `./core` (checked in `dist/core/index.js`), and it lets tests normalize against fixture types while the real registry is empty.

**Known Hazards (ticket):**
1. **Provenance as a separate map, no `{ value, source }` wrapping:** done. See `src/core/validate/derive.ts:96` and `tests/core/validate-derive.test.ts:118-122`.
2. **No per-description tolerance property:** done. `TOLERANCE` is a module constant (`src/core/validate/derive.ts:7`), and GSV OQ-003 stays open.
3. **Assert that no derived value is zero; no special case:** done (`src/core/validate/derive.ts:77`), but the hazard's premise does not hold in floating point (CR-001).
4. **Export `describe` with `validate` and `normalize`:** done. See `src/core/index.ts:12-13` and the built export list.
5. **Null prototype, with a test using a `JSON.parse`d `__proto__` key:** done. Derived values are assigned by vocabulary term onto stage 2's null-prototype objects (`src/core/validate/derive.ts:95`). `tests/core/validate-derive.test.ts:136-142` checks the prototypes and that a parsed `__proto__` is only an `unknown_property`.
6. **Use `failed`, treat `null` elements as non-data, stop after `too_large`:** done.
   - `touchesFailed` is used in both stages (`src/core/validate/derive.ts:43`, `src/core/validate/domain.ts:14`).
   - A check never runs on a touched input, so no check sees a failed `null`.
   - `src/core/validate/index.ts:23` stops after `too_large`, tested in `tests/core/validate-domain.test.ts:73-77`.
7. **Derived values null-prototype, added by term only:** done (`src/core/validate/derive.ts:94-96`).

## Findings

### CR-001: A tiny positive measurement makes the validator report a package defect

**Severity:** Issue
**Location:** `src/core/validate/derive.ts:63-77` (`checkDerivations`: the overflow branch and the zero assertion)
**Traces To:**
- Interface Contracts › Validation API: "an internal defect surfaces as `internal_error`".
- `issueDocs.internal_error` (`src/core/issues.ts:78-79`): "It is not a problem with the description".
- DEL-004, whose rationale is "the caller's value is the cause, so the issue belongs to it, not to `internal_error`".
- The ticket's third Known Hazard (no derived zero).
- GSV-REQ-037.
- Acceptance criterion "when only a defining value is supplied, every dependent value in its group is derived".

**Description:** The third Known Hazard says no group in this change can derive zero, because every member is strictly positive by its stage-2 range. In floating point that is false. A positive value can derive a value that underflows to 0. Line 77 then throws, and `validateWith` turns the throw into `internal_error`. Probed on the circle fixture:
- `{ type: "circle", diameter: 5e-324 }` gives `internal_error`. The radius is 5e-324 / 2, which rounds to 0.
- `{ type: "circle", circumference: 1e-323 }` gives `internal_error`. The radius is 1e-323 / 2π, which is 0.
- `radius: 5e-324` and `circumference: 1e-320` are valid, with subnormal derived values.

DEL-004 handles the other end of the range: a non-finite derived value gives `out_of_range` on the defining value. That `range.max` falls back to `Number.MAX_SAFE_INTEGER`, which is not the real bound: `radius: 1e20` is accepted. So the issue's `range` field (GSV-REQ-032) states a limit the validator does not enforce. The record's note to GSS TICKET-002 ("give each measurement a positive range") does not prevent either problem: the fixture already has `exclusiveMin: 0`. The note is also not among GSS TICKET-002's Known Hazards.
**Impact:**
- A description that every documented rule accepts is answered with "a defect in the package; please report it". A model cannot correct it, and maintainers get false defect reports.
- Every derivation group the type tickets add, such as the square, cube and cylinder, inherits the same edge.
- The real circle (GSS TICKET-002) will copy the fixture's ranges.

**Recommendation:**
- **Mechanism (`src/core/validate/derive.ts`):** treat a derived value that is not finite and greater than 0 like overflow. Report `out_of_range` on the defining value, with a `range` that actually holds: the defining spec's own `min`/`max` when set, otherwise a documented package-wide measurement floor and ceiling that stage 2 also enforces. Keep a throw only for what a correct definition cannot produce (CR-004).
- **Definitions:** in resolution, defer to `graph-library/geometric-shapes-and-solids/TICKET-002`. Append a Known Hazard: give `radius`, `diameter` and `circumference` curriculum-sized `min` and `max`, so that deriving from any in-range value stays finite, positive and in range. Optionally, add a `tests/core/definitions.test.ts` rule that derives from each member's bounds and fails otherwise.
- **Tests:** add `diameter: 5e-324` and `circumference: 1e-323` to `tests/core/validate-derive.test.ts`, expecting a caller-facing issue.

**Status:** Resolved
**Resolution:** Every derived value is checked against its member's range; an underflow or overflow is reported as `out_of_range` on the supplied value, with a range that holds. Definitions must give members a positive `min` and a finite `max`.

---

### CR-002: Exactly 1% is accepted only for some values, against DEL-003

**Severity:** Issue
**Location:** `src/core/validate/derive.ts:14-16` (`withinTolerance`); `tests/core/validate-derive.test.ts:63-71`
**Traces To:** DEL-003 ("Exactly 1% … is accepted … Floating-point error at the boundary only ever falls on the accepting side"); GSV-REQ-038; acceptance criterion "within 1% relative … is accepted"; AD-004 Consequences (the defining rules are documented behavior that tests pin)
**Description:** `Math.abs(supplied - derived) <= 0.01 * Math.abs(derived)` compares binary approximations of decimal inputs. Whether a value at exactly 1% in decimal passes depends on how both sides round:

| Supplied, derived | Result |
|-------------------|--------|
| 10.1, 10 | accepted |
| 9.9, 10 | accepted |
| 3.03, 3 | accepted |
| 5.05, 5 | accepted |
| 7.07, 7 | rejected |
| 6.93, 7 | rejected |
| 2.02, 2 | rejected |
| 1.01, 1 | rejected |
| 0.99, 1 | rejected |
| 70.7, 70 | rejected |

End to end, `{ type: "circle", radius: 3.5, diameter: 7.07 }` returns `contradiction`: "diameter (7.07) disagrees with radius; a value of 7 would agree". The boundary test uses only 10.1 and 9.9 against 10, which happen to round in favor. DEL-003's rationale is therefore wrong, and the rule it documents does not hold.
**Impact:**
- The documented tolerance, which TICKET-005 and the documentation will publish as inclusive, is not what the validator does.
- A caller who checks their arithmetic to exactly 1% is told their value disagrees, with no way to see why.
- The tolerance is low risk in practice, but it is a stated, published rule.

**Recommendation:**
- Absorb representation error at the boundary with a small relative slack, for example `Math.abs(supplied - derived) <= TOLERANCE * Math.abs(derived) * (1 + 1e-9)`. This still rejects 1.01%.
- Extend the boundary test to several decimals (7.07/7, 6.93/7, 1.01/1, 0.99/1, 2.02/2, 70.7/70) and keep the 1.01% rejections.
- Alternatively, if the boundary is to stay best-effort, amend DEL-003 to say so and drop "exactly 1%" from the test names. The first option keeps the published rule true.

**Status:** Resolved
**Resolution:** A boundary slack of 1e-9 relative, so exactly 1% in decimal is accepted for every value; boundary pairs are tested.

---

### CR-003: DEL-005 skips a whole domain check for failures the check never reads, which hides independent problems

**Severity:** Issue
**Location:** `src/core/validate/state.ts:17-22` (`touchesFailed`); `src/core/validate/domain.ts:13-16`; `src/core/validate/structure.ts:219` (unknown and inapplicable keys join `failed`)
**Traces To:** GSV-REQ-017 ("report every problem … in one validation pass"); AD-004 Rationale ("Every independent problem is reported, but no issue is a consequence of another"); DEL-005; RES-001 and RD-001 (the contract is settled with the circle slice)
**Description:** A check runs only when nothing at, inside or around each of its `inputs` failed. `inputs` are top-level terms, so any failure anywhere below `xAxis` or `points` disables the check for every element. Probed on the x,y fixture with a point at x = 9 outside a −5..5 axis:
- `xAxis: { min: -5, max: 5, sparkle: 1 }` reports only `unknown_property /xAxis/sparkle`.
- `xAxis.tickSpacing: -1` reports only `out_of_range /xAxis/tickSpacing`.
- `points: [{ x: 9, y: 0 }, { x: 1, y: 1, label: 5 }]` reports only `wrong_kind /points/1/label`.

None of these failed values is read by "points inside the axes". An unknown or inapplicable key is never in the description at all, so skipping on it protects nothing.

The record's rationale covers only the case where a point the check reads fails. A mistyped key, which is the mistake GSV-REQ-020's suggestions exist for, is the commonest case. With this rule, a typo inside an axis costs the caller a second round trip before an independent outside-range point is reported. DEL-005's Ticket Impact ("choose `inputs` … split a check by input") appears only in this delivery record. The type tickets that write checks are not told:
- NLC TICKET-001 to TICKET-004;
- GSS TICKET-004;
- DGP TICKET-001, TICKET-002, TICKET-003 and TICKET-005.

**Impact:**
- Validation reports fewer independent issues than AD-004 promises. That costs a model or author extra round trips.
- Once GSS TICKET-002 lands, the shape of `inputs` is part of RES-001, and changing it reworks three areas (RD-001).

**Recommendation:** Decide this before the circle slice.
- **Minimum:** failures of unknown and inapplicable keys should not gate checks. These values are absent from the description. Either record them apart from value failures in `checkStructure`, or have `touchesFailed` skip them.
- **Better, still inside the RES-001 window:** let `inputs` name the paths a check reads (`xAxis/min`, `xAxis/max`, `points/*/x`, `points/*/y`), so it skips only on failures it would read.
- **Or accept the coarse rule:** amend DEL-005 to state its real reach.
- **In every case:** append a Known Hazard to the type tickets above saying how `inputs` gate a check.

**Status:** Resolved
**Resolution:** Unknown keys are no longer counted as failures, and `DomainCheck.inputs` became path patterns (`points/*/x`), so a check skips only for failures it reads. Known Hazards on the type tickets.

---

### CR-004: A definition defect in `derive` is reported as the caller's out-of-range value

**Severity:** Observation
**Location:** `src/core/validate/derive.ts:64-69`; `tests/core/definitions.test.ts:303-323` (`stageProblems` never calls `derive`)
**Traces To:** Interface Contracts › Validation API ("an internal defect surfaces as `internal_error`"); DEL-004; GSV-REQ-031 (the message says what would make the value acceptable)
**Description:** The overflow test is `!Number.isFinite(derived[term])`. It is also true when `derive` leaves a member out (`undefined`) or returns `NaN`, and both are package defects. Probed with a circle whose `derive` omits `circumference`, and again with one that returns `Math.sqrt(-value)`. Both give "radius must be a number at most 9007199254740991; got 5." The message is false guidance for a valid value. The definitions test checks a group's members and description, but never what `derive` returns.
**Impact:** A slip in a type ticket's formula would surface as a nonsensical caller issue rather than `internal_error`, so neither tests nor users would identify it as a package defect. Type tickets are package-authored, so this is unlikely to reach users. It is cheap to close now, while GSS and DGP write their first formulas.
**Recommendation:**
- In `checkDerivations`, report `out_of_range` only when a derived value is `±Infinity` (or underflows, per CR-001). Throw when a member is missing or `NaN`; `validateWith` turns the throw into `internal_error`.
- Add a rule to `stageProblems`: for each member, derive from a sample value, require every member to be present, finite and positive, and require that deriving again from each result agrees within `TOLERANCE`.

**Status:** Resolved
**Resolution:** A `derive` that omits a member or returns NaN throws, so the validator reports `internal_error`. The definitions test calls `derive` from each member's bounds and checks the round-trip.

---

### CR-005: The design's record of the definition contract is stale, and TICKET-005 is not told what to publish

**Severity:** Observation
**Location:** `.gener8v/technical-design/system-design.md:371-379` (Data Model › GraphTypeDefinition and PropertySpec); `src/core/definitions/types.ts:173-200`; `.gener8v/changes/graph-library/tickets/graph-specification-and-vocabulary/TICKET-005.md` (acceptance criterion "… and derivation groups")
**Traces To:** DEL-001; DEL-002 ("The documentation publishes that order"); AD-003; RES-001; GSV-REQ-035
**Description:**
- **Derivation:** the Data Model shows only `members (ordered by defining preference), derive(defining) → values`. DEL-001 adds `description` and `required`.
- **Checks:** the Data Model still shows checks as bare functions. DEL-001 gives them `name` and `inputs`.
- **Readers:** TICKET-005 (schema generator and vocabulary) and the type tickets read the design as Prior Art.
- **What TICKET-005 must publish:** its acceptance criterion asks only for "derivation groups". DEL-001 and DEL-002 expect a group's `description`, its members in defining order, and whether one is `required`. Under DEL-005, a check's `name` and `inputs` would be readable too.
- **Precedent:** TICKET-003's `ordered` (its DEL-004) is also missing from the Data Model.

**Impact:** The compiler stops a type ticket from leaving the new fields out, so nothing breaks silently. But GSV-REQ-035 is met only when TICKET-005 publishes the relationships and the defining order. Its ticket does not say so, and the design describes an older contract.
**Recommendation:**
- In resolution, defer to `graph-library/graph-specification-and-vocabulary/TICKET-005` with a Known Hazard: publish each group's `members` in defining order, its `description` and `required`. Decide whether to publish domain checks by `name`.
- Separately, amend the design's Data Model through the Technical Design skill, covering DEL-001's fields and TICKET-003's `ordered`.

**Status:** Resolved
**Resolution:** A Known Hazard on GSV TICKET-005 to publish the group details. The design Data Model amendment is an open follow-up for the Technical Design skill.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Approved | Every derived value is checked against its member's range; an underflow or overflow is reported as `out_of_range` on the supplied value, with a range that holds. Definitions must give members a positive `min` and a finite `max`. | see Post-Review Amendments |
| CR-002 | Approved | A boundary slack of 1e-9 relative, so exactly 1% in decimal is accepted for every value; boundary pairs are tested. | see Post-Review Amendments |
| CR-003 | Approved | Unknown keys are no longer counted as failures, and `DomainCheck.inputs` became path patterns (`points/*/x`), so a check skips only for failures it reads. Known Hazards on the type tickets. | see Post-Review Amendments |
| CR-004 | Approved | A `derive` that omits a member or returns NaN throws, so the validator reports `internal_error`. The definitions test calls `derive` from each member's bounds and checks the round-trip. | see Post-Review Amendments |
| CR-005 | Approved | A Known Hazard on GSV TICKET-005 to publish the group details. The design Data Model amendment is an open follow-up for the Technical Design skill. | see Post-Review Amendments |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0
**Notes:** Resolved with the Product Owner on 2026-10-06. All five findings were fixed or carried to the tickets that need them, and re-verified with lint, typecheck, 457 tests, the bench (p95 at most 0.035 ms), build, `check:dist`, size, publint, attw, `check:deps` and `check:changesets`, all exit 0 (see the delivery record's Post-Review Amendments). One open follow-up remains outside the code: amend the design's Data Model through the Technical Design skill.
