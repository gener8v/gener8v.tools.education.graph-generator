# TICKET-001: Open the vocabulary to rulers: type list, object options, value lists and conditional terms — Delivery Record

## Ticket Reference

**Ticket:** rulers/graph-specification-and-vocabulary/TICKET-001
**Change:** `.gener8v/changes/rulers/change.md` — Approved (Product Owner — Thomas Eaves, 2026-10-19) when delivery started
**Specification:** `.gener8v/specifications/graph-specification-and-vocabulary.md` (amended by `rulers`, approved 2026-10-20)
**Requirements Covered:**
- GSV-REQ-003: The supported graph types include the ruler (amended by `rulers`)
- GSV-REQ-040: A measured object's label and color accepted as presentation options (amended by `rulers`)
- GSV-REQ-049: A ruler's unit accepted only from a fixed, published list, any other value reported listing it
- GSV-REQ-050: An inch ruler's smallest division accepted only from a fixed, published list, any other value reported listing it
- GSV-REQ-051: A smallest division on a ruler whose unit is not inches reported as a property that does not apply

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| `GRAPH_TYPES`, filtered to registered types by `registeredTypes` | present | `src/core/definitions/types.ts:9-21`; `src/core/definitions/index.ts:36-41` (`GRAPH_TYPES.filter(… registry …)`) | ✅ A listed type with no definition is not offered |
| `EnumValue` with `values`, `valueDescriptions`, `unknownCode` | present | `src/core/definitions/types.ts:94-105` | ✅ |
| An enum value outside its list is reported listing the names | `wrong_kind` "one of: …" | `src/core/validate/structure.ts:144-158` (`wrongKind(\`one of: ${spec.values.join(", ")}\`)`) | ✅ Already meets GSV-REQ-049/050's report; this ticket pins it with a test |
| `valueDescriptions` published in the vocabulary | present | `src/core/schema.ts:242` (`termUse`) and `TermUse.valueDescriptions` | ✅ Already published; this ticket pins it |
| `inapplicable_property` and its message | present | `src/core/issues.ts:117`, `:308-311`; raised at `src/core/validate/structure.ts:246`, `:251` | ✅ No conditional form yet |
| A property that applies only when a sibling has a value | absent | no such field on `PropertySpec`; nothing in `checkMap` | ✅ Expected: this ticket adds it |
| Shared `label` / `color` scoped options | present | `src/core/definitions/shared.ts` (`label.elementsOf` number-line, xy, xyz; `color` also bar-graph) | ✅ |
| Applicability check runs per registered definition | per definition | `tests/core/definitions.test.ts:103-119` (`applicabilityProblems(definition)`) | ✅ Adding `ruler` to `elementsOf` before the ruler registers is safe |
| Tests pinning the type list and `elementsOf` | present | `tests/core/definitions.test.ts:204` (inline snapshot), `:486-488` | ✅ To update |
| Strict tool schema profile | object root, common subset | `src/core/schema.ts:171-182` (`buildToolSchema`) | ✅ No `if`/`then` there |
| Predecessor tickets | none (Depends On: None) | — | ✅ |
| Carried findings | none | No review defers to this ticket. `rulers` NLC TICKET-001's reviews name `marksPerUnit` and `smallestDivision` (QR-006), which suggests the term name `smallestDivision` | ✅ |

**Resolved from ground truth (not escalated):**
- **GSV-REQ-049/050's "report listing the accepted names":** the existing `enum` branch already does this (`wrong_kind`, "one of: centimeters, inches"). No new issue code is needed (GSV-REQ-034).
- **Publishing value descriptions:** `termUse` already copies `valueDescriptions` into the vocabulary.

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-10-20

### Planned Files

- `src/core/definitions/types.ts`:
  - `"ruler"` in `GRAPH_TYPES`, after `number-line`.
  - `appliesWhen?: { term, values }` on `PropertySpec`: the property applies only when the sibling `term` has one of `values`. Documented with the ruler's case (`smallestDivision` when `unit` is `inches`).
- `src/core/validate/structure.ts`: in `checkMap`, a property with `appliesWhen` is decided after its siblings, so one fault gives one issue (AD-004):
  - the sibling passed with one of the values: the property is checked as usual;
  - the sibling passed with another value, or is an optional sibling that is absent: `inapplicable_property` at the property's own path, with the condition, and the value is not checked;
  - the sibling failed, or is a required sibling that is missing (already reported): the property is left out without an issue and marked failed, so domain checks reading it skip.
- `src/core/issues.ts`: an optional, package-authored `condition` on `inapplicable_property` (for example `only when unit is "inches"`), giving "… applies to a ruler only when unit is "inches"; remove it." No new issue code (GSV-REQ-034).
- `src/core/definitions/shared.ts`: `label` and `color` list `ruler` in `elementsOf`, and their descriptions name a measured object.
- `src/core/schema.ts`: the vocabulary's `TermUse` publishes `appliesWhen`. The JSON schemas still allow the property, since validation may be stricter than the schema but never looser (GSV-NFR-003). The strict tool profile gets no conditional keywords (AD-006, IC-001).
- `tests/core/validate-structure.test.ts`: a test-only definition with a two-value enum `unit` and a conditional `smallestDivision`. It covers:
  - "cm" reported, with a message naming both units;
  - a division on centimetres reported as `inapplicable_property` with the condition;
  - a division on inches checked normally, so a bad division is still reported;
  - a bad unit plus a division, and a missing unit plus a division, each giving exactly one issue;
  - domain checks reading the left-out division skipped.
- `tests/core/definitions.test.ts`:
  - updates for the type-list snapshot and the `elementsOf` expectations;
  - a definition-wide check that every `appliesWhen` names a sibling `enum` term and only its values.
- `tests/core/schema-shape.test.ts`: the vocabulary publishes `appliesWhen` and `valueDescriptions` for the test definition, and the tool schema holds no `if` or `then`.
- `src/generated/*`: regenerated (the label and color definitions change).

Decisions to record:
- DEL-001: conditional applicability is a property field (`appliesWhen`), not a domain check. It belongs to the structure stage, where the property is reported as `inapplicable_property` before its value is checked, like the other applicability rules.
- DEL-002: a property whose condition cannot be decided (its sibling failed or is missing) is left out without an issue and marked failed, so each fault has one issue.
- DEL-003: the condition is described in the message only. The issue's published data fields are unchanged.

### How Acceptance Criteria Will Be Met

- `GRAPH_TYPES` lists `ruler`, which is not offered until it registers: `types.ts`; the snapshot in `tests/core/definitions.test.ts`, plus `tests/graph.test.ts`'s registered-types check
- `label`/`color` `elementsOf` include `ruler`, with descriptions naming a measured object: `shared.ts`; `tests/core/definitions.test.ts`
- An enum value outside its list is reported with every accepted name: the existing `enum` branch; the new "cm" test
- `valueDescriptions` published: the existing `termUse`; pinned in `tests/core/schema-shape.test.ts`
- Conditional applicability: `appliesWhen` + `checkMap`; `tests/core/validate-structure.test.ts`
- Schema agreement and the strict profile unaffected: `tests/core/schema-agreement.test.ts`, `schema-meta.test.ts`, and the no-`if` test
- `pnpm generate` explained: the regenerated label and color definitions, committed

## Progress

- [x] `src/core/definitions/types.ts` — `ruler` in `GRAPH_TYPES`; `PropertySpec.appliesWhen`
- [x] `src/core/validate/structure.ts` — `checkConditional`, called after a map's other properties; annotations
- [x] `src/core/issues.ts` — `inapplicable_property`'s optional `condition`
- [x] `src/core/definitions/shared.ts` — `label` and `color` on a ruler's measured object
- [x] `src/core/schema.ts` — `TermUse.appliesWhen`, published by `termUses`
- [x] `tests/core/validate-structure.test.ts` — 7 tests
- [x] `tests/core/definitions.test.ts` — 2 tests, 2 updated
- [x] `tests/core/schema-shape.test.ts` — 2 tests
- [x] `tests/fixtures/definitions/conditional-ruler.ts` — the test-only definition (not in the plan; see Deviations)
- [x] `src/generated/*` — regenerated (the color definition's text)
- [x] `.gener8v/specifications/graph-specification-and-vocabulary.md` — `## @spec Coverage` rows

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/core/definitions/types.ts`: `GRAPH_TYPES` with `ruler` after `number-line`; `PropertySpec.appliesWhen?: { term, values }`.
- `src/core/validate/structure.ts`: `checkConditional(spec, element, at, properties, place, normalized, walk)`. `checkMap` collects properties with `appliesWhen` and decides them last.
- `src/core/issues.ts`: `inapplicable_property` takes an optional package-authored `condition` and then reads "… applies for a ruler only when unit is "inches"; remove it."
- `src/core/definitions/shared.ts`: `label` and `color` list `ruler` in `elementsOf`; their descriptions name a measured object.
- `src/core/schema.ts`: `TermUse.appliesWhen`, published in the vocabulary by `termUses`.
- `src/generated/description.ts`, `schema.json`, `tool-schema.json`, `vocabulary.json`, and `tests/fixtures/generated/description.ts`: regenerated. The only change is the color definition's text.
- `tests/fixtures/definitions/conditional-ruler.ts`: a test-only ruler-like definition (a two-value `unit`, a conditional `smallestDivision`, and the same pair nested in an object) with its own registry.
- `tests/core/validate-structure.test.ts`, `tests/core/definitions.test.ts`, `tests/core/schema-shape.test.ts`.
- `.gener8v/specifications/graph-specification-and-vocabulary.md`: `## @spec Coverage` rows for GSV-REQ-049, 050 and 051.

## Verification Run

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm generate` | 0 | the generated files change only in the color definition's text; a second run changes nothing |
| `pnpm lint` | 0 | — |
| `pnpm typecheck` | 0 | adding `ruler` to `GraphType` broke no exhaustive table |
| `pnpm test` (three runs) | 0 | 1,287 tests passed on each run, 11 of them new |
| `pnpm bench` | 0 | 7 passed |
| `pnpm build` | 0 | — |
| `pnpm check:dist` | 0 | no network APIs |
| `pnpm check:deps` | 0 | 0 runtime dependencies |
| `pnpm check:images` | 0 | — |
| `pnpm size` | 0 | every entry within its limit |
| `pnpm publint` | 0 | — |
| `pnpm attw` | 0 | — |
| `pnpm audit` | 0 | No known vulnerabilities found |
| `python3 …/gener8v-state.py lint` | 0 | 0 errors, 0 warnings |

Nine deliberate breaks, each made against a passing baseline and restored from memory, fail the new or updated tests:
- the condition ignored;
- no silent skip when the sibling failed;
- a value that does not apply still checked;
- a left-out term not marked failed;
- a term that does not apply not marked failed;
- the condition text dropped;
- `appliesWhen` unpublished;
- `ruler` missing from `label`;
- `ruler` missing from `GRAPH_TYPES`.

"A left-out term not marked failed" first passed every test. At the top level a left-out term is absent, and the domain stage already skips a check whose input is absent. The nested case in the fixture was then added, and the break and its sibling ("does not apply" not failed) fail it.

## Acceptance Criteria Verification

- [x] `GRAPH_TYPES` lists `ruler`; until a ruler definition is registered it is not offered — the inline snapshot "are graph-library's eleven types and the rulers change's ruler" (`tests/core/definitions.test.ts`); `tests/graph.test.ts` checks `unknown_graph_type` against `registeredTypes(definitions)`, which has no ruler, and `pnpm generate` shows no `ruler` in the schemas or vocabulary
- [x] `label` and `color` list `ruler` in `elementsOf`, descriptions name a measured object, the applicability check passes for every registered type — "covers title, line color, … point labels where they apply" and "each lists real graph types…" (`tests/core/definitions.test.ts`)
- [x] An enum value outside its list is reported with every accepted name — "reports a value outside a fixed list with every accepted name" (`tests/core/validate-structure.test.ts`): "cm" gives `wrong_kind` `expected: "one of: centimeters, inches"`, and "1/8" names all four divisions
- [x] `valueDescriptions` published in the vocabulary — "publishes each fixed list with its value descriptions…" (`tests/core/schema-shape.test.ts`)
- [x] A property applying only when a sibling has given values: `inapplicable_property` at its path with the condition, not checked further; checked as usual when the condition holds — the six conditional tests in `tests/core/validate-structure.test.ts` (inches checked, "third" reported; centimetres not applying, with the message; a failed or missing unit gives one issue; domain checks skipped; nested case; key order)
- [x] The conditional term is published without breaking GSV-NFR-003 or the strict profile; validation is stricter, never looser — "keeps the conditional term out of the schemas' logic…" (no `if`, `then`, `else` or `dependent*` in either schema; the published schema accepts the description that validation refuses), plus `tests/core/schema-agreement.test.ts` and `schema-meta.test.ts` passing
- [x] `pnpm generate` leaves no unexplained difference, and the schema-meta, schema-agreement and definitions tests pass — the regenerated files are committed (the color text only); "are committed exactly as a fresh build writes them" passes

## Decisions Made

### DEL-001: Conditional applicability is a property field, `appliesWhen`, checked in the structure stage

**Context:** GSV-REQ-051 asks for a smallest division on a centimetre ruler to be reported as a property that does not apply. The validator reports applicability (`inapplicable_property`) in the structure stage, before a value's own checks; domain checks run later, on values that passed.
**Decision:** `PropertySpec.appliesWhen = { term, values }` names a sibling `enum` term and the values under which the property applies. `checkMap` decides such properties after all the others in the same object (`checkConditional`), so the order of keys never matters.
**Rationale:** A domain check could only report after the division had already been checked as a division, giving a second issue for a bad one ("third" on centimetres), and could not stop it entering the normalized description. A field also publishes in the vocabulary, so a model can read the rule.
**Ticket Impact:** As planned. The definitions test checks that every `appliesWhen` names a sibling enum and only its values.

### DEL-002: A term whose condition cannot be decided is left out without an issue, and marked failed

**Context:** When the sibling (`unit`) itself failed ("cm") or is required and missing, the problem is already reported, and whether the division applies cannot be known.
**Decision:** The property is left out of the normalized description with no issue, and its path is added to `walk.failed`, so domain checks reading it (even nested, where its parent is present) are skipped.
**Rationale:** One fault, one issue (AD-004). A model fixing "cm" to "centimeters" then learns about the division on the next pass, which is the same order a person would fix them in.
**Ticket Impact:** None. An optional sibling that is absent counts as "another value", and the term is reported as not applying.

### DEL-003: The condition is described in the message only

**Context:** `inapplicable_property` already carries an optional `elements`, used only in its message. Issue fields are part of the published result format (GSV-REQ-030..034).
**Decision:** A new optional `condition` (package-authored text, such as `only when unit is "inches"`) shapes the message only. `createIssue` copies no new field into the issue.
**Rationale:** The issue code and its data fields stay stable (GSV-REQ-034), and the message says what to change (GSV-REQ-031).
**Ticket Impact:** None.

## Deviations from Plan

- **A fixture file the plan did not list:** `tests/fixtures/definitions/conditional-ruler.ts`. The plan put the test-only definition inside `tests/core/validate-structure.test.ts`. It is in its own file so the structure, definitions and schema tests share it, and it stays out of `fixtureRegistry`, so no other fixture test changes.
- **A nested pair in the fixture** (`spare`), added after a deliberate break passed. It makes the "marked failed" half of DEL-002 testable.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| GSV-REQ-003 | `src/core/definitions/types.ts`:GRAPH_TYPES | `@spec GSV-REQ-003` (existing; list amended) |
| GSV-REQ-040 | `src/core/definitions/shared.ts`:sharedProperties | `@spec GSV-REQ-040, GSV-REQ-043, GSV-REQ-045, DGP-REQ-002` (existing; `elementsOf` amended) |
| GSV-REQ-049 | `src/core/validate/structure.ts`:checkValue; `src/core/schema.ts`:termUses | `@spec GSV-REQ-005, GSV-REQ-021, GSV-REQ-022, GSV-REQ-043, GSV-REQ-049, GSV-REQ-050, DGP-REQ-031`; `@spec GSV-REQ-049, GSV-REQ-050, GSV-REQ-051` |
| GSV-REQ-050 | as GSV-REQ-049 | as above |
| GSV-REQ-051 | `src/core/validate/structure.ts`:checkConditional; `src/core/schema.ts`:termUses | `@spec GSV-REQ-051`; as above |

The existing rows for GSV-REQ-003 and GSV-REQ-040 already name these locations. New rows are added for GSV-REQ-049..051, each noting the ruler's lists and term come with rulers NLC TICKET-002.

## Notes

- **For rulers NLC TICKET-002 (the ruler definition):**
  - Give `smallestDivision` `appliesWhen: { term: "unit", values: ["inches"] }`.
  - Give the measured object the shared `label` and `color` spec objects: `sharedProperties.label` and `.color`, nested, not copied. The applicability check fails otherwise, now that both list `ruler`.
  - A centimetre ruler's division never reaches domain checks, and a division left out because `unit` failed is marked failed, so a check declaring it in `inputs` is skipped. This answers the CR-001 Known Hazard on that ticket.
  - Unit names come from `RULER_UNITS` (`src/core/ruler.ts`), and division names from `INCH_DIVISIONS`.
- **For rulers GSV TICKET-002:** the vocabulary now publishes `appliesWhen`. The ruler's terms appear once its definition registers.
- **For graph-library GSV TICKET-006:** `GRAPH_TYPES` now has twelve entries. Its Known Hazard says so.

## Post-Review Amendments

### Code review — `rulers/graph-specification-and-vocabulary-ticket-001-code-review` (2026-10-20, Approved)

- **CR-001 (amends DEL-002):** when the sibling failed or is missing, the conditional term's own value is now checked, and only whether it applies goes unreported. Either way the term is left out and marked failed, with its provenance removed. So `{unit: "cm", smallestDivision: 16}` reports both values (GSV-REQ-017, AD-004), as `ordered` does, and `{unit: "cm", smallestDivision: "half"}` still reports one.
- **CR-002:** `DomainCheck.optionalInputs` lists paths a check reads that may be absent. The check runs without them, and is skipped only when one failed (`src/core/validate/domain.ts`), and the definitions test checks those paths too.
  - **Correction to the Notes:** listing `smallestDivision` in `inputs` would skip the check on every centimetre ruler and on every inch ruler using the default. List it in `optionalInputs`.
  - The fixture's check uses it. NLC TICKET-002's CR-001 hazard is re-worded to say so.
- **CR-003 (amends DEL-003):** the conditional `inapplicable_property` carries `conflicts: [<sibling's path>]`. Its message names the sibling in full ("spare.unit", "extras[1].unit") and reads "… applies to a ruler only when …". The top-level, nested and list cases are tested.
- **CR-004:** `PropertySpec`'s annotation now lists GSV-REQ-051, matching the coverage row.
- **CR-005:** deferred to rulers NLC TICKET-002. Its Known Hazard asks it to:
  - build the unit and division lists from `RULER_UNITS` and `INCH_DIVISIONS`;
  - give `smallestDivision` its `appliesWhen`;
  - nest the shared label and color;
  - annotate GSV-REQ-040 and 049..051, and update the coverage rows.
- **CR-006:** both schemas state each condition in the term's description, generated from `appliesWhen` ("Give it only when unit is "inches"."), and the root rules mention conditional terms. `src/generated/schema.json` and `tool-schema.json` are regenerated (the root rules text).
- **CR-007:** the definitions check refuses `appliesWhen` on a required property and on a sibling with a condition of its own, with tests. The doc comment states both rules.
- **CR-008:** a value outside a fixed list also carries `allowed` (every accepted value), an optional field on `wrong_kind`, with no new code.
- **CR-009:**
  - The `definitions` and `PresentationOption` doc comments are updated.
  - Graph-library GSV TICKET-006's hazard now also covers the `Record<GraphType, …>` tightening.
  - AD-005's type list is left to the Technical Design skill.
- **Re-verification:** `pnpm generate` (the root rules text), `lint`, `typecheck`, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size`, `publint`, `attw`, `audit` and `gener8v-state lint` exit 0. `pnpm test` (1,290 tests) exits 0 on three runs. Seven deliberate breaks of the fixes each fail a test:
  - the value unchecked when the sibling failed;
  - optional inputs ignored;
  - no `conflicts`;
  - a bare sibling name;
  - no schema sentence;
  - no `allowed`;
  - the old wording.

### Quality review — `rulers/graph-specification-and-vocabulary-ticket-001-quality-review` (2026-10-20, Approved)

- **QR-001:** `checkMap` carries each conditional term with its condition (`AppliesWhen`), so no assertion is needed. `checkConditional(spec, condition, element, parent, normalized, walk)` derives the term's place and decides "cannot be known" by `walk.failed` alone, since a required missing sibling is in it too. Its doc lists the three branches in the order they run.
- **QR-002:** new tests for:
  - left-out terms absent from the description and the provenance and present in `failed`, at the top level and nested, read from `checkStructure`;
  - an object-kind conditional term's provenance removed below it;
  - a positive control for the probe check (`spare: { unit: "inches" }` reports);
  - a two- and three-value condition in the message and in `describeCondition`;
  - the exact schema description of the conditional term, and none on `unit`;
  - the strict tool schema validating a conditional term.
- **QR-003:** `describeCondition(name, values)` (`src/core/definitions/types.ts`) is the one wording, `only when unit is "inches" or "feet"`. The validator passes the sibling's full place and the schemas pass its term. The schemas build the note in `describeProperty`.
- **QR-004:** `leaveOut(spec, path, walk)` deletes the one provenance entry of a leaf and scans only below an object or list term.
  - On a probe of 3,000 list elements, each with a kept value and a conditional division under a failed unit, validation took 26 ms against 127 ms with the full scan.
  - No timing test was added (timing tests are flaky under load, as earlier in this change). The behaviour tests above pin the removals.
- **QR-005:** the fixture defines `unit` and `smallestDivision` once and nests them three times. The hand-written condition is gone from the description.
  - The fixture's doc says why it is outside `allDefinitions()`: it does not nest the shared label and color, which list `ruler`.
  - `stageProblems` and `vocabularyProblems` now run on it.
- **QR-006:** `optionalInputs`' doc says it differs from `inputs` only at the top level. `stageProblems` refuses a path in both lists. `tests/core/validate-domain.test.ts` has stage-4 cases for:
  - an absent, a passed and a failed top-level optional input;
  - a nested one under an absent, a passed and a failed parent;
  - a `*` one with a failed element.
- **QR-007:** `inapplicable_property`'s published description covers the conditional case. Its params are typed so that a `condition` always comes with `conflicts` and never with `elements`. The two messages share `aGraph`.
- **Re-verification:**
  - `pnpm generate` (no change), `lint`, `typecheck`, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size`, `publint`, `attw` and `gener8v-state lint` exit 0.
  - `pnpm test` (1,299 tests) exits 0 on three runs.
  - Five deliberate breaks each fail a test:
    - leaf provenance kept;
    - subtree provenance kept;
    - several values joined with "or" only;
    - a left-out term not failed;
    - the schema note dropped.
- **`pnpm audit` exits 1: outside this ticket.** Six advisories (2 high, 4 moderate) were published since this morning's clean audits, with the lockfile unchanged since `main`:
  - `vite` 8.3.0–8.3.2, through `vitest`;
  - `launch-editor` ≤ 2.14.1, through `@changesets/cli`.
  - All are in development tooling and Windows-specific. `pnpm audit --prod` reports no known vulnerabilities, and the package has no runtime dependencies.
  - Updating them is a dependency change for its own commit, raised with the user.

### Security review — `rulers/graph-specification-and-vocabulary-ticket-001-security-review` (2026-10-20, Approved)

- **SEC-001, SEC-002 (dependencies):** commit `ad2452f`, a dependency commit of its own, updates development tooling for today's advisories (GHSA-r825-w8mm-5pxw and two related ones).
  - `vite` is now 8.3.4. It is declared as a direct dev dependency (`^8.3.4`), since it is a peer of `vitest` that an override alone did not move.
  - `launch-editor` is now 2.14.2, through a `pnpm.overrides` entry, since `@changesets/cli` 3.0.3 pins it.
  - `postcss` and `nanoid` move by a patch with `vite`.
  - `pnpm audit` and `pnpm audit --prod` report no known vulnerabilities, and `pnpm changeset status` still runs.
- **SEC-003 (supersedes QR-004's `leaveOut`):** a term left out because its sibling failed is checked by `checkLeftOut` against a scratch provenance record that is then dropped, so nothing it wrote needs finding and removing, whatever its kind or the description's size.
  - It shares the issues, the failed set and the value count with the walk, and the count is copied back.
  - A test shows two list elements, each holding just over half the description limit in a left-out term, still reported as `too_large`.
- **SEC-004:**
  - `runDomainChecks` reads a check's `optionalInputs` own-key and only as a list (`optionalInputsOf`).
  - `createIssue` and `issueMessage` read params own-key from a null-prototype copy (`ownParams`), so a polluted `Object.prototype` can neither add an optional input, rewrite a message nor add an issue field.
  - Pollution tests cover both.
- **Re-verification:**
  - `pnpm generate` (no change), `lint`, `typecheck`, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size`, `publint`, `attw`, `audit` and `gener8v-state lint` exit 0.
  - `pnpm test` (1,302 tests) exits 0 on three runs, on the new lockfile.
  - Four deliberate breaks each fail a test:
    - the scratch record replaced by the walk;
    - the count not copied back (failed only once the cross-element test was added);
    - `optionalInputs` read through the prototype;
    - params read through the prototype.

