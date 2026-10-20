# TICKET-001: Open the vocabulary to rulers: type list, object options, value lists and conditional terms — Code Review

## Summary

I reviewed the delivery of `rulers/graph-specification-and-vocabulary/TICKET-001`: delivery commit `5d9a2c0` on branch `ticket/rulers-gsv-001`, the only commit beyond `main` (`7a5febf`). I checked it against:
- the ticket's seven acceptance criteria, its Output and its five Known Hazards;
- GSV-REQ-003, GSV-REQ-017, GSV-REQ-030..034, GSV-REQ-040 and GSV-REQ-046..051;
- the specification's Behaviors & Rules → Rulers, the ruler Edge Cases, GSV-NFR-003 and `## @spec Coverage`;
- `constraints/prd.md` (IC-001, TC-005, TC-008) and AD-003..AD-006;
- what the consumers need from it:
  - `rulers/number-lines-and-coordinate-graphs/TICKET-002` and its Known Hazards;
  - `src/core/ruler.ts`;
  - `rulers/graph-specification-and-vocabulary/TICKET-002`;
  - graph-library GSV TICKET-006.

I checked the main claims with in-memory probes rather than taking the record's word for them.
- **Criterion 1 holds at every entry point.** A `{ "type": "ruler", … }` description sent to `validate`, `createGraph` or `<Graph>` gets one `unknown_graph_type` at `/type`, listing the four registered types. Neither schema, the vocabulary nor the committed generated files mention a ruler. The tool handler is not delivered yet.
- **The conditional mechanism works in every position probed.** It behaves as the tests pin it at the top level, inside a nested object and inside list elements.
- **GSV-NFR-003 is safe.** The mechanism can only make validation stricter than the schema.
- **The Verification Run reproduces.**

There are four Issues and five Observations.

**Issues:**
- **CR-001:** DEL-002 does not check a conditional value whose sibling failed or is missing. A division that is wrong under any unit ("third", 16) therefore goes unreported in that pass (GSV-REQ-017, AD-004). `ordered` does not behave this way: it still checks each value on its own.
- **CR-002:** the record's Notes tell NLC TICKET-002 that listing the division in a check's `inputs` answers its CR-001 hazard. It would instead switch that check off for every centimetre ruler and for every inch ruler that takes the default sixteenth.
- **CR-003:** the conditional `inapplicable_property` identifies the sibling it depends on only by bare term, and only in the message. It sets no `conflicts` (GSV-REQ-032; DEL-003's GSV-REQ-034 rationale does not hold), and when nested or in a list it names an ambiguous `unit` (GSV-REQ-031).
- **CR-004:** the GSV-REQ-051 coverage row names `PropertySpec.appliesWhen`, which carries no `@spec GSV-REQ-051`.

**Observations:**
- CR-005: who completes GSV-REQ-049..051 for the ruler itself.
- CR-006: the schemas carry the condition only through hand-written prose.
- CR-007: chained or required `appliesWhen`.
- CR-008: the enum report sets no `allowed`.
- CR-009: stale "eleven types" and element text.

**Reviewer:** `code-reviewer` agent, fresh context (findings phase only, 2026-10-20)
**Delivery Record:** `.gener8v/changes/rulers/delivery/graph-specification-and-vocabulary-ticket-001-delivery.md`
**Files Reviewed:**
- `src/core/definitions/types.ts`
- `src/core/validate/structure.ts`
- `src/core/issues.ts`
- `src/core/definitions/shared.ts`
- `src/core/schema.ts`
- `src/generated/description.ts`, `src/generated/schema.json`, `src/generated/tool-schema.json`, `src/generated/vocabulary.json`, `tests/fixtures/generated/description.ts` (regenerated)
- `tests/core/validate-structure.test.ts` (new block, `:581-632`)
- `tests/core/definitions.test.ts` (`:204-222`, `:225-258`, `:510-530`)
- `tests/core/schema-shape.test.ts` (`:332-358`)
- `tests/fixtures/definitions/conditional-ruler.ts` (new)
- `.gener8v/specifications/graph-specification-and-vocabulary.md` (`## @spec Coverage`, rows GSV-REQ-049..051, `:241-243`)
- Read for context, unchanged by `git diff main...5d9a2c0`:
  - validator: `src/core/validate/index.ts`, `src/core/validate/envelope.ts`, `src/core/validate/domain.ts`, `src/core/validate/state.ts`;
  - core: `src/core/definitions/index.ts` (`registeredTypes`, `propertiesOf`), `src/core/describe.ts`, `src/core/result.ts`, `src/core/index.ts`, `src/core/ruler.ts`;
  - entry points: `src/graph.ts`, `src/react/Graph.tsx`, `src/react/createGraphComponent.tsx`, `src/tool/index.ts`;
  - generation and tests: `scripts/generate.ts`, `tests/graph.test.ts`, `tests/core/schema-agreement.test.ts`.

**Findings:** 9
**Critical:** 0 | **Issues:** 4 | **Observations:** 5

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| `GRAPH_TYPES` lists `ruler`. Until a ruler definition is registered, `ruler` is not offered as a supported type: it is not in `unknown_graph_type`'s list, the schema or the vocabulary, as for any unregistered type. The existing tests are updated to the new list | Yes | `"ruler"` is at `src/core/definitions/types.ts:12`. Every place that offers a type goes through `registeredTypes` (`src/core/definitions/index.ts:39-41`): `unknown_graph_type` (`src/core/validate/envelope.ts:40-49`), the published and tool schemas (`src/core/schema.ts:156`, `:172`), the vocabulary (`:288`), the generated types (`:357`) and `createGraph`'s list of drawable types (`src/graph.ts:29`). Probe results:<br>- `validate`, `createGraph` and `<Graph>` (through its `fallback`) each return one `unknown_graph_type` at `/type`, with `allowed` `["line-graph","bar-graph","pictograph","circle"]`.<br>- `describe` throws its fixed error.<br>- `getSchema`, `getToolSchema`, `getVocabulary` and the four committed `src/generated/` files hold no ruler.<br>- The tool handler is not delivered (`src/tool/index.ts` is an empty module).<br>Tests: the snapshot at `tests/core/definitions.test.ts:204-222`; `tests/graph.test.ts:58-63`, which checks the generic rule with `"hexagon"`; and the fresh-build test (`tests/core/schema-shape.test.ts:303`). `GRAPH_TYPES` and `GraphType` are public (`src/core/index.ts:8-9`) and now include `ruler`, as they already include seven other types that are not yet registered |
| The shared `label` and `color` list `ruler` in `elementsOf`, and their descriptions name a measured object. The applicability check still passes for every registered type | Yes | `src/core/definitions/shared.ts:113-115` (`label`) and `:122-124` (`color`), pinned at `tests/core/definitions.test.ts:510-530`. The applicability check passes. No registered definition is a ruler yet, so the check meets the ruler only when NLC TICKET-002 registers it, as the ticket's hazard says |
| An `enum` value outside its list is reported with every accepted name listed in the issue's message and data. A test shows it for a two-value list: "cm" is reported, and the message names "centimeters" and "inches" | Yes | `wrongKind(\`one of: ${spec.values.join(", ")}\`)` (`src/core/validate/structure.ts:158`) puts the names in the message and in `expected`. Tested at `tests/core/validate-structure.test.ts:625-631`: "cm" gives `expected: "one of: centimeters, inches"`, and "1/8" names all four divisions. The names reach the issue's data only as `expected`'s text; `allowed` is not set (CR-008) |
| `valueDescriptions` on an `enum` term are published in the vocabulary | Yes | `termUse` copies them (`src/core/schema.ts:245-248`); pinned at `tests/core/schema-shape.test.ts:333-346` |
| A property can be declared to apply only when a sibling term has one of given values. When the condition fails, the value is reported as `inapplicable_property` at its own path, with a message saying what it applies to, and not checked further. When the condition holds, it is checked as usual. Tested with a test-only definition | Yes | How it works:<br>- `checkMap` sets aside every property with `appliesWhen` (`src/core/validate/structure.ts:271-274`) and decides them after all siblings and the missing-required pass (`:290`).<br>- `checkConditional` (`:304-330`) checks the value as usual when the sibling passed with a listed value (`:322-326`).<br>- Otherwise it reports `inapplicable_property` at the property's own path with the condition, and marks the path failed (`:327-329`).<br>Tests: `tests/core/validate-structure.test.ts:588-623`. Probes show the same behaviour at the top level, nested (`spare`) and in list elements. Two gaps: when the sibling failed or is missing, the value is not checked at all (CR-001), and the message names the sibling by its bare term (CR-003) |
| The conditional term is published in the schema without breaking GSV-NFR-003 or the strict tool profile (AD-006, prd/IC-001). Validation may be stricter than the schema, never looser | Yes | Neither schema builder reads `appliesWhen`; `TermUse.appliesWhen` is published in the vocabulary only (`src/core/schema.ts:200`, `:272`). Tested at `tests/core/schema-shape.test.ts:348-357`: neither schema holds `if`, `then`, `else` or `dependent*`, and the published schema accepts a centimetre ruler with a division. Each branch of `checkConditional` does one of three things: adds an issue, follows an issue already added, or runs the ordinary check. So the mechanism can only make validation stricter than the schema, which is the direction GSV-NFR-003 permits. `tests/core/schema-agreement.test.ts` passes; its `otherType` mutation now also draws `"ruler"`, which the schema and the validator both refuse. The schemas state the condition only through the definition's own description text (CR-006) |
| `pnpm generate` leaves no unexplained difference in `src/generated`, and the schema-meta, schema-agreement and definitions tests pass | Yes | In `src/generated/` only the `color` description changes. The `label` change reaches only `tests/fixtures/generated/description.ts`, because no registered type nests `label`. "are committed exactly as a fresh build writes them" (`tests/core/schema-shape.test.ts:303`) passes. The schema-meta, schema-agreement and definitions tests pass on three runs |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| GSV-REQ-003 | The supported graph types include the ruler | `src/core/definitions/types.ts`:GRAPH_TYPES (`:12`); offered through `src/core/definitions/index.ts`:registeredTypes once NLC TICKET-002 registers `ruler` | Partial, by the ticket's design: `ruler` is listed but not yet supported |
| GSV-REQ-040 | A measured object's label and color are accepted as presentation options | `src/core/definitions/shared.ts`:sharedProperties (`label` and `color` `elementsOf`, `:113-115`, `:122-124`) | Partial, by design: the measured object that nests them comes with NLC TICKET-002 |
| GSV-REQ-049 | A ruler's unit is accepted only from a fixed, published list of unit names; any other value is reported, listing them | `src/core/validate/structure.ts`:checkValue (`:144-159`); `src/core/schema.ts`:termUse, termUses (`:245-248`, `:266-275`) | Partial: this ticket delivers the means. No definition holds the unit list yet; `RULER_UNITS` (`src/core/ruler.ts:8`) is used by none (CR-005, CR-008) |
| GSV-REQ-050 | An inch ruler's smallest division is accepted only from a fixed, published list; any other value is reported, listing them | As GSV-REQ-049 | Partial: the means only, as for GSV-REQ-049. `INCH_DIVISIONS` (`src/core/ruler.ts:13`) is in no definition yet. Also, a division that is wrong under any unit is not reported when the unit fails (CR-001, CR-005) |
| GSV-REQ-051 | A smallest division on a ruler whose unit is not inches is reported as not applying | `src/core/definitions/types.ts`:PropertySpec.appliesWhen (`:152`); `src/core/validate/structure.ts`:checkMap (`:271-274`, `:290`), checkConditional (`:304-330`); `src/core/issues.ts`:templates (`:312-317`); `src/core/schema.ts`:termUses (`:272`) | Partial: the mechanism, proven with a test-only definition. The ruler's own `smallestDivision` comes with NLC TICKET-002 (CR-003, CR-005) |

*The ticket's Requirements Covered field carries no NFR. Criterion 6 relies on GSV-NFR-003, which `tests/core/schema-agreement.test.ts` verifies (it passes, with 1,000 descriptions per fixture type and per registered type). The test-only conditional definition is not one of its legs; the ruler joins them with GSV TICKET-002, whose criteria require it.*

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/IC-001 | The tool schema has an object root and uses only the common JSON Schema subset | Yes | `buildToolSchema` is unchanged (`src/core/schema.ts:171-182`), and no conditional keyword reaches either schema (probe; `tests/core/schema-shape.test.ts:348-357`). In the tool profile a conditional term is treated like any optional term: it is listed under `required` and its `enum` ends in `null` (probe) |
| prd/TC-008 | One definition produces types, validation and schema; no schema library | Yes | `appliesWhen` is a field of the one `PropertySpec` (`src/core/definitions/types.ts:152`), read by the validator and the vocabulary. `pnpm check:deps` exits 0, with no new dependency |
| prd/TC-005 | Core code only | Yes | Every change is under `src/core/`. `pnpm lint` (including the AD-001 / TC-005 boundary rules) and `pnpm check:dist` exit 0 |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-003 | One definition is the source of types, validation, schemas and vocabulary | Yes | `appliesWhen` lives in the definition. The validator (`checkConditional`) and the vocabulary (`termUses`) read it. The schemas carry it only through prose the definition's author writes (CR-006) |
| AD-004 | Staged validator that reports every independent issue, without cascades | Partial | Applicability is decided in stage 2, before the value's own checks (DEL-001). A term left out is marked failed, so stage 4 skips it. But when the sibling failed or is missing, the term's own value is not checked, so an independent fault is dropped (CR-001) |
| AD-005 | `type` values in kebab case, terms in camel case | Yes | `ruler` (`src/core/definitions/types.ts:12`). `appliesWhen` is a definition field, not a description term. AD-005's list of `type` values still names eleven (CR-009) |
| AD-006 | A published profile and a strict tool profile | Yes | Neither profile uses `if`, `then` or `dependent*`. The tool profile handles a conditional term as it handles every optional term (required and nullable), and AD-006's handler removes `null` values before validation |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| GSV-REQ-003 | `@spec GSV-REQ-003` | `src/core/definitions/types.ts`:GRAPH_TYPES (`:9`); `src/core/definitions/index.ts`:definitions (`:21`) | Yes |
| GSV-REQ-040 | `@spec GSV-REQ-040` | `src/core/definitions/shared.ts`:sharedProperties (`:29`); `src/core/definitions/types.ts`:PresentationOption (`:46`); `src/core/definitions/index.ts`:propertiesOf (`:65`) | Yes |
| GSV-REQ-049 | `@spec GSV-REQ-049` | `src/core/validate/structure.ts`:checkValue (`:100`); `src/core/schema.ts`:termUses (`:265`) | Yes |
| GSV-REQ-050 | `@spec GSV-REQ-050` | `src/core/validate/structure.ts`:checkValue (`:100`); `src/core/schema.ts`:termUses (`:265`) | Yes |
| GSV-REQ-051 | `@spec GSV-REQ-051` | `src/core/validate/structure.ts`:checkConditional (`:303`); `src/core/schema.ts`:termUses (`:265`) | Yes |
| GSV-REQ-051 | `@spec GSV-REQ-051` | `src/core/definitions/types.ts`:PropertySpec.appliesWhen (named in the coverage row; the annotation at `:138` is `GSV-REQ-012, GSV-REQ-043`) | No (CR-004) |

**Coverage:** 5 of 5 requirements annotated at one location or more.
**Missing:** None by requirement. One location named in the coverage table carries no annotation (CR-004).
**Specification table:** No: the GSV-REQ-051 row (`.gener8v/specifications/graph-specification-and-vocabulary.md:243`) names `src/core/definitions/types.ts`:PropertySpec.appliesWhen, which has no `@spec GSV-REQ-051`, and the delivery record's own table leaves it out (CR-004). The GSV-REQ-049 and GSV-REQ-050 rows match the code. The existing GSV-REQ-003 (`:199`) and GSV-REQ-040 (`:201`) rows still name annotated locations and remain accurate, although `PresentationOption`'s doc comment is now stale (CR-009).

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm generate` | Not re-run (it writes files) | Yes, by proxy: "are committed exactly as a fresh build writes them" (`tests/core/schema-shape.test.ts:303`) passes |
| `pnpm lint` | 0 | Yes |
| `pnpm typecheck` | 0 | Yes |
| `pnpm test` (three runs; re-run as `vitest run --no-cache`) | 0, 0, 0 | Yes: 1,287 tests in 47 files on each run |
| `pnpm bench` | 0 | Yes: 7 passed |
| `pnpm build` | 0 | Yes |
| `pnpm check:dist` | 0 | Yes |
| `pnpm check:deps` | 0 | Yes |
| `pnpm check:images` | 0 | Yes |
| `pnpm size` | Not re-run (excluded from this review's run) | Not checked |
| `pnpm publint` | 0 | Yes |
| `pnpm attw` | 0 | Yes |
| `pnpm audit` | 0 | Yes: "No known vulnerabilities found" |
| `python3 …/gener8v-state.py lint` | 0 | Yes: 0 errors, 0 warnings |

*The record's nine deliberate breaks were not re-run. The 11 new tests counted in the record are present: 7 in `tests/core/validate-structure.test.ts`, 2 in `tests/core/definitions.test.ts` and 2 in `tests/core/schema-shape.test.ts`.*

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | Making conditional applicability a property field, decided in stage 2 before the value's own checks, gives one issue for a bad division on a centimetre ruler. It keeps the value out of the normalized description, and the condition is published in the vocabulary. Deciding these terms after all their siblings makes key order irrelevant for one level of condition. A condition that depends on another conditional term is still decided in key order (CR-007) |
| DEL-002 | Questionable | Leaving the term out and marking it failed is right when its sibling cannot be decided. Not checking the term's own value is not: a value that is wrong under every unit is dropped from the pass, against GSV-REQ-017 and unlike `ordered` (CR-001). The Notes also draw a wrong conclusion from DEL-002 for NLC TICKET-002 (CR-002) |
| DEL-003 | Questionable | Reusing `inapplicable_property` with no new code meets GSV-REQ-034. The rationale, that the issue's data fields must also stay as they are, is not what GSV-REQ-034 says. GSV-REQ-032's "conflicting properties" applies to the sibling (CR-003) |

*Deviations: the separate fixture file (`tests/fixtures/definitions/conditional-ruler.ts`) and its nested `spare` pair are reasonable. They keep `fixtureRegistry` unchanged and make the "marked failed" half of DEL-002 testable. The fixture's own check, "a sixteenth needs at least 2 units", also shows the absent-input behaviour behind CR-002.*

## Findings

### CR-001: DEL-002 does not check a conditional term whose sibling failed or is missing, so a division that is wrong under any unit is not reported in the same pass

**Severity:** Issue
**Location:** `src/core/validate/structure.ts:318-321` (checkConditional)
**Traces To:** GSV-REQ-017; AD-004 ("Every independent problem is reported, but no issue is a consequence of another"); GSV Edge Cases (a unit written "cm" reported per GSV-REQ-049; a division given as 16 reported per GSV-REQ-050); TICKET-001/DEL-002
**Description:** When `unit` failed, or is required and missing, `checkConditional` adds the division's path to `walk.failed` and returns without calling `checkValue`, so the division's own value is never checked. Probes with the fixture: `{unit: "cm", smallestDivision: "third"}`, `{unit: "cm", smallestDivision: 16}` and `{smallestDivision: "third"}` (no unit) each return one issue, at `/unit`.

"third" and 16 are not one of the four divisions whatever the unit is. On an inch ruler they are `wrong_kind`; on a centimetre ruler they are `inapplicable_property`. Either way `/smallestDivision` has a fault of its own, and it does not follow from the unit's fault. The record accepts that a model "then learns about the division on the next pass". That second pass is what GSV-REQ-017 rules out.

The existing `ordered` rule treats a failed sibling differently. Each value is still checked on its own, and only the relation between them is skipped. Probe: with `axis.min` "zero", `axis.max` is still checked and kept, and with both bad, both are reported. The two Edge Cases, a unit as "cm" or "in" and a division as 16, are mistakes a model is likely to make together.
**Impact:** A model that writes `{ "unit": "in", "smallestDivision": 16 }` needs two round trips. The record's rule of one issue per fault holds, but two faults produce one issue.
**Recommendation:** When the sibling cannot be decided, still run the term's own check, then leave the term out whatever the outcome:
- call `checkValue`;
- add the path to `walk.failed`;
- keep the value out of `normalized`;
- delete any provenance that `checkValue` wrote.

Only the applicability report is withheld, which is what `ordered` does. `{unit: "cm", smallestDivision: "half"}` still gives one issue, so `tests/core/validate-structure.test.ts:602-605` keeps passing. Add cases for "third" and 16 with a failed unit and with a missing unit. Update DEL-002 and the `appliesWhen` doc comment (`src/core/definitions/types.ts:144-151`).
**Status:** Resolved
**Resolution:** Fixed — the term's own value is checked when the sibling failed or is missing; only whether it applies goes unreported, and it is left out and marked failed either way. "third" or 16 with a failed or missing unit now gives two issues. DEL-002 amended in the record. Approved by the user, 2026-10-20.

---

### CR-002: The record tells NLC TICKET-002 that listing the division in a check's `inputs` answers its CR-001 hazard, but that check would then never run on a centimetre ruler or on an inch ruler using the default sixteenth

**Severity:** Issue
**Location:** `.gener8v/changes/rulers/delivery/graph-specification-and-vocabulary-ticket-001-delivery.md` (Notes → For rulers NLC TICKET-002, third bullet); `src/core/validate/domain.ts:27-30`; `tests/fixtures/definitions/conditional-ruler.ts:60-67`
**Traces To:** `rulers/number-lines-and-coordinate-graphs/TICKET-002` Known Hazards (carried from `rulers/number-lines-and-coordinate-graphs-ticket-001-code-review/CR-001`); NLC-REQ-046, NLC-REQ-053; the `DomainCheck.inputs` contract (`src/core/definitions/types.ts:229-253`); TICKET-001/DEL-002
**Description:** The Notes say a division left out because `unit` failed is marked failed, "so a check declaring it in `inputs` is skipped. This answers the CR-001 Known Hazard on that ticket." That is not right, for two reasons.

First, `runDomainChecks` runs a check only when the top-level property of every input is present (`src/core/validate/domain.ts:27-29`). A check that lists `smallestDivision` is therefore also skipped whenever the division is absent:
- on every centimetre ruler, which may never have a division;
- on every inch ruler that takes the default sixteenth.

The fixture shows it. Its check "a sixteenth needs at least 2 units" has `inputs: ["smallestDivision", "length"]`. It reports `{unit: "inches", smallestDivision: "sixteenth", length: 1}` but accepts `{unit: "inches", length: 1}`, whose division is the default sixteenth (probe).

Second, DEL-002 does not touch the case CR-001 describes: an inch ruler whose division is refused on its own ("eighths", 8). `checkValue` already marked that path failed before this ticket. DEL-002 adds only the failed-unit case, where the unit's own failure already stops any check that lists `unit`.

The hazard's other option, "test whether a division was supplied but failed", is not available to a check. A check sees only the frozen normalized description, where a refused division and an absent one look the same. No `DomainCheck` input can say "skip if this failed, run if it is absent".
**Impact:** If NLC TICKET-002 follows the Notes, its off-mark check (NLC-REQ-053) never runs on centimetre rulers or on inch rulers using the default, so an end at 3.25 cm is accepted. If it does not follow them, CR-001's case remains: an end valid only at sixteenths is accepted on a ruler meant for eighths until the next pass.
**Recommendation:** Correct the Notes, then take one of two routes:
- give `DomainCheck` a kind of input that may be absent but must not have failed (for example an `optionalInputs` list, or a trailing `?`), which `runDomainChecks` tests with `touchesFailed` alone, and test it with the fixture's check;
- or defer to `rulers/number-lines-and-coordinate-graphs/TICKET-002` with a Known Hazard that states this behaviour and both options.

Either way, re-word that ticket's CR-001 hazard so it no longer recommends listing the division in `inputs`.
**Status:** Resolved
**Resolution:** Fixed — `DomainCheck.optionalInputs` (may be absent; skipped only when failed), checked by `runDomainChecks` and by the definitions test's path check; the fixture's check uses it. The record's Note is corrected and NLC TICKET-002's CR-001 hazard re-worded to use it. Approved by the user, 2026-10-20.

---

### CR-003: The conditional `inapplicable_property` identifies its sibling only by bare term, and only in the message: it sets no `conflicts`, and names an ambiguous `unit` when nested or in a list

**Severity:** Issue
**Location:** `src/core/validate/structure.ts:327-328`; `src/core/issues.ts:121`, `:313-314`; `src/core/result.ts:29-30`
**Traces To:** GSV-REQ-032 ("the conflicting properties … where one applies"); GSV-REQ-031; GSV-REQ-034; TICKET-001/DEL-003
**Description:**
- **DEL-003's rationale.** DEL-003 keeps the condition in the message so that "the issue code and its data fields stay stable (GSV-REQ-034)". GSV-REQ-034 is about issue codes, and the code is unchanged either way. `Issue.conflicts` already exists as an optional field, documented as the "JSON Pointers of the other properties involved" (`src/core/result.ts:29-30`). `duplicate_name` already uses it outside contradictions (DGP TICKET-001 DEL-003). Setting it would add no code and no field.
- **What GSV-REQ-032 asks.** A division on a centimetre ruler is refused because of `/unit`: the two values cannot stand together. That is the "conflicting properties" case GSV-REQ-032 asks an issue to carry. Today the issue holds only `code`, `path` and `message` (probe), so a program reading it has to parse the English to find `/unit`.
- **Ambiguous name when nested or in a list.** The condition uses the sibling's bare term (`term`, `:327`), not its readable path, which misleads when the pair is nested. In a probe where the top-level `unit` is "inches", the message reads `spare.smallestDivision applies for a ruler only when unit is "inches"; remove it.`, but the unit it means is `spare.unit`. In a list it reads `rulers[1].div applies for a ruler only when unit is "inches"`.
- **Wording.** The plan's message said "applies to a ruler only when …". The shipped message reuses `forGraph` and says "applies for a ruler only when …".
**Impact:** For the ruler's top-level `smallestDivision` the message is clear and meets GSV-REQ-031, but the issue's data is incomplete. A model loop, or a page that highlights related fields, gets no pointer to `/unit`. Any nested or list use of `appliesWhen` produces a misleading message.
**Recommendation:**
- Pass `conflicts: [siblingPath]`: add `conflicts?: Terms` to `IssueParamsByCode["inapplicable_property"]` (`createIssue` already copies it), and widen `Issue.conflicts`' doc comment.
- Build the condition from `child(place, term).term`, so it reads "spare.unit" or "rulers[1].unit".
- Optionally, say "applies to a ruler".
- Pin the top-level, nested and list cases in tests, and record the change against DEL-003.
**Status:** Resolved
**Resolution:** Fixed — `conflicts: [<sibling path>]` on the issue (an optional param `createIssue` already copies); the sibling named in full ("spare.unit", "extras[1].unit"); "applies to a ruler". Top-level, nested and list cases tested. DEL-003 amended in the record. Approved by the user, 2026-10-20.

---

### CR-004: The `@spec Coverage` row for GSV-REQ-051 names `PropertySpec.appliesWhen`, which has no `@spec GSV-REQ-051`, and the record's annotation table leaves it out

**Severity:** Issue
**Location:** `.gener8v/specifications/graph-specification-and-vocabulary.md:243`; `src/core/definitions/types.ts:138`
**Traces To:** Code Review step 8; `CLAUDE.md` Traceability (`grep -rn "@spec"` audits coverage); GSV-REQ-051
**Description:** The GSV-REQ-051 row lists `src/core/definitions/types.ts`:PropertySpec.appliesWhen first. The annotation above `PropertySpec` is `// @spec GSV-REQ-012, GSV-REQ-043` (`src/core/definitions/types.ts:138`). GSV-REQ-051 appears only in the field's doc comment, and `grep -rn "@spec"` finds GSV-REQ-051 only at `src/core/validate/structure.ts:303` and `src/core/schema.ts:265`. The delivery record's `@spec` table lists `checkConditional` and `termUses` for GSV-REQ-051, which matches the code but not the row.
**Impact:** The coverage table and the `@spec` audit disagree on one location, and the next sweep will report it as stale.
**Recommendation:** Add `GSV-REQ-051` to the annotation above `PropertySpec` (`src/core/definitions/types.ts:138`), which declares `appliesWhen`, or remove `types.ts` from the row. Make the delivery record's table match.
**Status:** Resolved
**Resolution:** Fixed — `@spec GSV-REQ-012, GSV-REQ-043, GSV-REQ-051` above `PropertySpec`; the record lists it. Approved by the user, 2026-10-20.

---

### CR-005: GSV-REQ-049, 050 and 051 are delivered as mechanism only, and no later ticket claims the ruler's own lists and term by requirement ID

**Severity:** Observation
**Location:** `.gener8v/specifications/graph-specification-and-vocabulary.md:241-243`; `src/core/ruler.ts:8`, `:13`
**Traces To:**
- GSV-REQ-049 ("a fixed, published list of unit names"), GSV-REQ-050, GSV-REQ-051, and the specification's Data Requirements ("the published list of ruler unit names and the published list of inch-ruler divisions");
- `rulers/number-lines-and-coordinate-graphs/TICKET-002`, whose Requirements Covered are NLC only;
- `rulers/graph-specification-and-vocabulary/TICKET-002`, whose Requirements Covered are GSV-REQ-046..048.
**Description:** This ticket delivers the means: an `enum` reported with its names, value descriptions published, and `appliesWhen`. It publishes no unit list and no division list. `RULER_UNITS` and `INCH_DIVISIONS` exist, but no definition uses them.

Each ticket points to another for the lists:
- The coverage rows say the lists come "with rulers NLC TICKET-002".
- NLC TICKET-002 covers NLC requirements only, and its hazard says the GSV tickets own "the published unit and division lists".
- GSV TICKET-002 checks that the lists are published (its criterion 2), but lists only GSV-REQ-046..048.

So no later ticket completes GSV-REQ-049..051 by requirement ID. The same is true of the ruler halves of GSV-REQ-003 and GSV-REQ-040, although GSV TICKET-002's criterion 6 and the applicability check cover them in substance.
**Impact:** Once this ticket is reviewed, GSV-REQ-049..051 read as covered by code that accepts no ruler at all. Whether the ruler's real `unit` and `smallestDivision` specs carry their GSV `@spec` IDs depends on NLC TICKET-002 thinking to add them.
**Recommendation:** Defer to `rulers/number-lines-and-coordinate-graphs/TICKET-002` with a Known Hazard asking it to:
- build `unit`'s and `smallestDivision`'s `values` from `RULER_UNITS` and `Object.keys(INCH_DIVISIONS)`;
- annotate those specs `@spec GSV-REQ-049`, `GSV-REQ-050` and `GSV-REQ-051`, and the measured object `GSV-REQ-040`;
- update coverage rows `:241-243` to name `src/core/definitions/ruler.ts`.

Alternatively, through Ticket Breakdown or Audit, list GSV-REQ-003, 040 and 049..051 as "(completion)" in GSV TICKET-002, as graph-library GSV TICKET-006 does for GSV-REQ-003.
**Status:** Deferred
**Resolution:** Deferred → rulers NLC TICKET-002 — a Known Hazard there: the lists from `RULER_UNITS` and `INCH_DIVISIONS`, `appliesWhen` on `smallestDivision`, the shared label and color nested, annotations for GSV-REQ-040 and 049..051, and the coverage rows to name `ruler.ts`. Approved by the user, 2026-10-20.

---

### CR-006: The JSON schemas state a term's condition only in prose the definition's author writes, and `appliesWhen` itself reaches only the vocabulary

**Severity:** Observation
**Location:** `src/core/schema.ts:62-68` (describeValue), `:29-35` (RULES), `:104-114` (objectSchema)
**Traces To:** GSV-REQ-015 (vocabulary, schema and validation come from one definition so that they cannot disagree); GSV-REQ-009; the ticket's Output for `src/core/schema.ts` ("conditional terms … in the published schema and vocabulary"); AD-006 (the tool schema is what a model reads)
**Description:** Probing `buildSchema` and `buildToolSchema` with the fixture shows that `smallestDivision`'s schema mentions the condition only through the fixture's own description ("…; applies only when unit is inches."). Nothing is generated from `appliesWhen`.

The nearest precedent, `ordered`, is generated into the schema description by `describeValue` ("max must be greater than min."). The root RULES text lists what only the validator checks: ranges in order, values that must agree, and type-specific rules. It does not mention terms that apply only when another term has a given value. The vocabulary does publish `appliesWhen` (`:272`).
**Impact:** A model writing from the tool schema learns the rule only if the ruler definition's author writes it, in words that can drift from `appliesWhen`. GSV TICKET-002's criterion 1 asks the description to state "a division only on inch rulers", so the ruler will probably say it, by hand.
**Recommendation:** Generate the sentence from `appliesWhen` in `objectSchema` (for example, `Give it only when unit is "inches".`), as `describeValue` does for `ordered`, and add conditional terms to RULES. Alternatively, defer to `rulers/graph-specification-and-vocabulary/TICKET-002` with a Known Hazard to check the ruler's schema text against `appliesWhen`.
**Status:** Resolved
**Resolution:** Fixed — `objectSchema` appends "Give it only when … is …" from `appliesWhen` in both profiles, and the root rules mention conditional terms; tested; generated schemas regenerated. Approved by the user, 2026-10-20.

---

### CR-007: `appliesWhen` accepts two shapes it cannot honour: a chain of conditions is decided in key order, and a required conditional term cannot be satisfied

**Severity:** Observation
**Location:** `src/core/validate/structure.ts:290`, `:316-321`; `tests/core/definitions.test.ts:236-245` (conditionProblems); `src/core/definitions/types.ts:144-152`
**Traces To:** TICKET-001/DEL-001 ("the order of keys never matters"); AD-004; criterion 5
**Description:** Two probes, each with a test-only definition, show shapes the mechanism cannot honour:
- **A chain.** `a` applies when `b` is "y", and `b` applies when `c` is "on". `{c: "on", b: "y", a: …}` is valid, but `{c: "on", a: …, b: "y"}` reports `inapplicable_property /a`. Deferred terms are decided in the order the description writes them, so `a` reads `b` before `b` has been decided.
- **A required conditional term** (`required: true` with `appliesWhen`). With a centimetre unit it is reported as `missing_property` when absent and as `inapplicable_property` when given, so no description satisfies it.

`conditionProblems` checks only that the sibling is an `enum` and that the values are in its list, so the definitions test refuses neither shape. The ruler needs neither.
**Impact:** None for the ruler. A later definition could ship either shape, and the definitions test would pass it.
**Recommendation:** Make `conditionProblems` refuse `appliesWhen` on a required property, and refuse a sibling that has its own `appliesWhen` (or decide deferred terms in dependency order). State both rules in the `appliesWhen` doc comment.
**Status:** Resolved
**Resolution:** Fixed — the definitions check refuses a required conditional term and a sibling with its own condition; tested; the doc comment states both rules. Approved by the user, 2026-10-20.

---

### CR-008: A unit or division outside its list carries the accepted names only in `expected`'s text, not in `allowed` as the package's other published lists do

**Severity:** Observation
**Location:** `src/core/validate/structure.ts:158`; `src/core/issues.ts:123`
**Traces To:** Criterion 3 ("listed in the issue's message and data"); `Issue.allowed`, documented as "The accepted values: terms, graph types, color names or image names" (`src/core/result.ts:33-34`); GSV Behaviors & Rules → Rulers; the ticket's Known Hazard (a suggestion is allowed, not required)
**Description:** "cm" gives `wrong_kind` with `expected: "one of: centimeters, inches"` and no `allowed`. The package's other fixed, published lists (`unknown_graph_type`, `unknown_color` and `unknown_image`) put their names in `allowed` as an array. Behaviors & Rules says unit and division names "follow the vocabulary's spelling, as for `color`".

The criterion is met, because the names are in the issue's data. A program, though, has to split a sentence to get them. "centimetres" also gets no `suggestion`, although `closestTerm` would return "centimeters".
**Impact:** The result shape for the ruler's two lists differs slightly from the other published lists. Correctness is not affected.
**Recommendation:** For an `enum` value outside its list, also copy `allowed: spec.values`, through an optional `allowed` on `wrong_kind`; this adds a field but no new code. Optionally add `closestTerm`'s suggestion, as `unknown_image` does. Or dismiss, since the criterion is met.
**Status:** Resolved
**Resolution:** Fixed — `wrong_kind` for a value outside a fixed list carries `allowed`; tested. Approved by the user, 2026-10-20.

---

### CR-009: Text that still counts eleven types or leaves out the measured object: two doc comments, AD-005's type list and graph-library GSV TICKET-006's `Record<GraphType, …>` hazard

**Severity:** Observation
**Location:** `src/core/definitions/index.ts:13-16`; `src/core/definitions/types.ts:41-45`; `.gener8v/technical-design/system-design.md` (AD-005, Decision); `.gener8v/changes/graph-library/tickets/graph-specification-and-vocabulary/TICKET-006.md:39-40`
**Traces To:** GSV-REQ-003 (amended); GSV-REQ-040 (amended); AD-005; TICKET-001's Known Hazard on graph-library GSV TICKET-006
**Description:**
- **`definitions`' doc comment** still says "TICKET-006 then requires all eleven graph types (GSV-REQ-003)".
- **`PresentationOption`'s doc comment** says "`elementLabel` and `elementColor` sit on one point, segment or category". They now also sit on a measured object.
- **AD-005** lists the eleven `type` values. `ruler` follows AD-005's naming rule but is missing from that list.
- **Graph-library GSV TICKET-006** carries the hazard this ticket asked for (line 40). Its line 39 asks it, once all eleven definitions are registered, to tighten `definitions` to `Readonly<Record<GraphType, GraphTypeDefinition>>`. That will not typecheck until the ruler is also registered, and line 40 does not say so.
**Impact:** Misleading comments, and one inconsistency between the design and a ticket. No behaviour is affected.
**Recommendation:** Update the two doc comments. Append to TICKET-006's hazard that the `Record<GraphType, …>` tightening has to wait for the ruler, or must name the graph-library types explicitly. Leave AD-005's list to the Technical Design skill.
**Status:** Resolved
**Resolution:** Fixed — the two doc comments updated; graph-library GSV TICKET-006's hazard now covers the `Record<GraphType, …>` tightening; AD-005's list left to the Technical Design skill. Approved by the user, 2026-10-20.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Fixed | Own value checked when the sibling failed; DEL-002 amended | `src/core/validate/structure.ts`, `tests/core/validate-structure.test.ts` |
| CR-002 | Fixed | `DomainCheck.optionalInputs`; Note corrected; NLC TICKET-002 hazard re-worded | `src/core/definitions/types.ts`, `src/core/validate/domain.ts`, tests, fixture, NLC TICKET-002 |
| CR-003 | Fixed | `conflicts`, full sibling names, "applies to"; DEL-003 amended | `src/core/issues.ts`, `src/core/validate/structure.ts`, `src/core/result.ts`, tests, fixture |
| CR-004 | Fixed | GSV-REQ-051 annotation on `PropertySpec` | `src/core/definitions/types.ts` |
| CR-005 | Deferred → rulers NLC TICKET-002 | Known Hazard | NLC TICKET-002 |
| CR-006 | Fixed | Condition sentence generated in both schemas; root rules | `src/core/schema.ts`, `src/generated/*`, `tests/core/schema-shape.test.ts` |
| CR-007 | Fixed | Required and chained conditions refused | `src/core/definitions/types.ts`, `tests/core/definitions.test.ts` |
| CR-008 | Fixed | `allowed` on `wrong_kind` for fixed lists | `src/core/issues.ts`, `src/core/validate/structure.ts`, tests |
| CR-009 | Fixed | Doc comments; TICKET-006 hazard | `src/core/definitions/index.ts`, `types.ts`, graph-library GSV TICKET-006 |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (8 Resolved, 1 Deferred → rulers NLC TICKET-002)
**Notes:**
- All four Issues are fixed and re-verified. CR-005 (the ruler's own lists and term) is carried to the ruler definition ticket, which gives GSV-REQ-049..051 their ruler.
- Re-verification: every Verification Run command exits 0; `pnpm test` (1,290 tests) on three runs. Seven deliberate breaks of the fixes each fail a test.
