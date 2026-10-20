# TICKET-001: Open the vocabulary to rulers: type list, object options, value lists and conditional terms — Quality Review

## Summary

I reviewed `rulers/graph-specification-and-vocabulary/TICKET-001` at HEAD (`14545e6`, after the code review was resolved; delivery `5d9a2c0`). The conditional-term mechanism is small and in the right places: one field on the definition, read by the validator, the vocabulary and both schemas. Each branch is documented, and the tests describe behaviour. Lint, typecheck and build pass. The full suite passes on three runs, and the changed test files passed 25 runs out of 25. The findings are about what later definitions will build on:
- `checkConditional`'s first branch tests three things where one decides. Two of its seven parameters exist only for that dead clause, or can be derived (QR-001).
- Mutants that survive every test show three gaps (QR-002):
  - `leaveOut`'s provenance removal is untested;
  - the " or " joining of several values is untested;
  - the nested "marked failed" test relies on a fixture check that nothing proves runs.
- The condition sentence is built twice, by the same expression, in the validator and the schema, and neither uses the schema module's own `alternatives` helper (QR-003).
- `leaveOut` scans all provenance, which is quadratic for conditional terms in lists. This is latent: the planned ruler gives the term at the top level (QR-004).
- The test fixture repeats its unit/division pair three times and states the condition twice. It is also held only to the condition rules (QR-005).
- `optionalInputs` differs from `inputs` only at the first path segment, and a path in both lists silently behaves as `inputs` (QR-006).
- `inapplicable_property`'s published doc and its params type do not cover the new conditional form cleanly (QR-007).

There are 7 findings: 0 Critical, 0 Concerns and 7 Suggestions.

**Reviewer:** `quality-reviewer` agent, fresh context (findings phase only, 2026-10-20)
**Delivery Record:** `.gener8v/changes/rulers/delivery/graph-specification-and-vocabulary-ticket-001-delivery.md` (DEL-001 to DEL-003, and the Post-Review Amendments from the code review)
**Code review read first:** `.gener8v/changes/rulers/reviews/graph-specification-and-vocabulary-ticket-001-code-review.md` (Approved). Its CR-001 to CR-009 are not raised again:
- QR-003 builds on CR-006's generated sentence, and is about its being built twice;
- QR-006 builds on CR-002's `optionalInputs`, and is about how it relates to `inputs`;
- CR-008's optional `suggestion` for a fixed list was not taken, and is not re-raised.

**Calibration:** `.gener8v/changes/rulers/reviews/number-lines-and-coordinate-graphs-ticket-001-quality-review.md`.

**Files Reviewed:**
- `src/core/definitions/types.ts` (`GRAPH_TYPES`, `PropertySpec.appliesWhen`, `DomainCheck.optionalInputs`)
- `src/core/validate/structure.ts` (`checkMap`, `checkConditional`, `leaveOut`, the `enum` branch of `checkValue`)
- `src/core/validate/domain.ts`
- `src/core/issues.ts` (`inapplicable_property`, `wrong_kind`)
- `src/core/result.ts`
- `src/core/definitions/shared.ts`, `src/core/definitions/index.ts`
- `src/core/schema.ts` (`objectSchema`, `termUses`, `RULES`)
- Regenerated: `src/generated/description.ts`, `src/generated/schema.json`, `src/generated/tool-schema.json`, `src/generated/vocabulary.json`, `tests/fixtures/generated/description.ts`
- Tests:
  - `tests/core/validate-structure.test.ts` (`:581-659`);
  - `tests/core/definitions.test.ts` (`:198-276`, `:461`, `:473-497`, `:538-546`);
  - `tests/core/schema-shape.test.ts` (`:332-366`);
  - `tests/fixtures/definitions/conditional-ruler.ts`.
- Read for pattern consistency, unchanged here:
  - the validator: `src/core/validate/state.ts` (`touchesFailed`), `numbers.ts`, `json.ts`, `index.ts`, `derive.ts` (`dropFailed`), and the `ordered` handling in `structure.ts`;
  - the delivered definitions: `src/core/definitions/axis.ts`, `categories.ts`, `bar-graph.ts`, `line-graph.ts`, `pictograph.ts`, `circle.ts`;
  - the other fixtures: `tests/fixtures/definitions/index.ts`, `number-line.ts`, `axis.ts`;
  - `tests/core/validate-domain.test.ts`, `vitest.config.ts`, `tests/setup/build.ts`, `package.json`.
- Read for what consumers need: `rulers/number-lines-and-coordinate-graphs/TICKET-002` (its Known Hazards on `optionalInputs`, `appliesWhen` and the term's description).

**Findings:** 7
**Critical:** 0 | **Concerns:** 0 | **Suggestions:** 7

## Quality Assessment

### Code Organization

**Rating:** Adequate
**Notes:**
- **One source, as AD-003 asks.** `appliesWhen` is a field of `PropertySpec`. Its readers are:
  - the validator (`checkConditional`);
  - the vocabulary (`termUses`);
  - both schemas (`objectSchema`).

  `optionalInputs` sits beside `inputs` on `DomainCheck`, and `runDomainChecks` reads both. Nothing new is imported against the existing dependency direction.
- **The structure stage keeps its shape.** `checkMap` sets conditional terms aside and decides them after the missing-required pass, in their own function. This mirrors how `ordered` is decided after `checkMap` returns.
- **Placement issues:**
  - the condition sentence is assembled in two modules (QR-003);
  - `optionalInputs`, a stage-4 rule, is tested in the stage-2 test file through the conditional fixture, and not in `tests/core/validate-domain.test.ts`, where stage 4 is tested (QR-006).
- **Considered and not raised:**
  - **`mapsOf` in the definitions test (`tests/core/definitions.test.ts:227-234`).** It walks nested maps, as `nestedSpecs` (`:84-97`) walks nested specs. The two return different things, so this is coincidental similarity.
  - **Three "drop a failed value" helpers.** `leaveOut`, the `ordered` block (`src/core/validate/structure.ts:171-174`) and `dropFailed` (`src/core/validate/derive.ts:31-37`) each do it. QR-004 suggests letting the first two share one.

### Readability

**Rating:** Adequate
**Notes:**
- **Doc comments explain why.**
  - `appliesWhen`'s comment states the three rules the definitions test enforces.
  - `checkConditional` lists its three branches.
  - `leaveOut` says what it removes.
- **`checkConditional`** (QR-001):
  - Its first branch's condition has two clauses that never change the outcome.
  - It takes seven positional parameters, two of them `Place`s.
  - `value` names the sibling's value, beside `values` (the accepted values) and `element` (the term's own value).
  - Its doc lists the branches in a different order from the code.
- **`inapplicable_property`'s template** is now a three-way nested ternary, and its conditional branch repeats `forGraph`'s body (QR-007).
- **Minor points that are not findings:**
  - `runDomainChecks`' doc comment (`src/core/validate/domain.ts:17-23`) grew a long inserted clause. Its `ready` expression is a 133-character line.
  - The new long lines (`src/core/validate/structure.ts:159`, `:334`; `src/core/issues.ts:318`) match the module's existing style, and lint passes.
  - The definitions test's `conditionProblems` doc comment (`tests/core/definitions.test.ts:235`) and its first test name (`:251`) describe the original two rules only, not the required and chained rules CR-007 added.

### Error Handling

**Rating:** Strong
**Notes:**
- **Every report goes through `createIssue`, with no new code (GSV-REQ-034).**
  - A term that does not apply is `inapplicable_property` at its own path, with `conflicts` naming the sibling.
  - A value outside a fixed list is `wrong_kind` with `allowed`.
- **One fault, one issue, as the delivery intends.** A term whose condition cannot be decided is still checked on its own, then left out and marked failed (`:322-326`). Domain checks skip a failed optional input.
- **Probes:**
  - Over 189 inputs, the mechanism behaves the same at the top level, nested and in a list. The inputs covered: unit absent, explicit `undefined`, valid, unlisted, a number, `null`, a getter or hidden; with seven division variants.
  - No exception escapes.
- **`wrong_kind` with `allowed` is consistent in data** with `unknown_color` and `unknown_image`: an array of every accepted value, which `createIssue` copies. It differs in the message source:
  - those two codes render their message from `allowed` through `list()`;
  - `wrong_kind` renders from `expected`, a string built by `spec.values.join(", ")` on the same line. The list is therefore in the issue twice.
  - The `enum` branch also builds the issue inline instead of through the local `wrongKind` helper.

  Not raised: both copies come from `spec.values` in one expression, so they cannot drift.
- **Gaps (QR-007):**
  - `spec.appliesWhen!` relies on the caller (QR-001);
  - `inapplicable_property`'s params accept `condition` with `elements`, or `conflicts` without `condition`, and the template then silently prefers one.

### Test Coverage

**Rating:** Adequate
**Notes:**

**Commands run at HEAD** (`.gener8v/context.md`'s verify commands, plus repeated runs of the changed files):

| Command | Exit | Result |
|---|---|---|
| `pnpm lint` | 0 | `eslint .`, no output |
| `pnpm typecheck` | 0 | `tsc --noEmit`, no output |
| `pnpm build` | 0 | ESM and DTS build success |
| `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache` (three times) | 0, 0, 0 | 47 files and 1,290 tests passed (15.9 s, 16.1 s, 16.0 s) |
| `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache tests/core/validate-structure.test.ts tests/core/definitions.test.ts tests/core/schema-shape.test.ts tests/core/validate-domain.test.ts` (25 times) | 0 on all 25 | 163 passed on each run |

- **How the commands ran.**
  - `pnpm test` is `vitest run`. `--no-cache` keeps Vitest from writing its results cache.
  - `GRAPH_GENERATOR_PREBUILT=1` skips the global setup's second build after `pnpm build`, which rewrites the gitignored `dist/`.
- **Not run.**
  - `pnpm generate` and `pnpm size`, as instructed.
  - `bench`, `check:*`, `publint`, `attw` and `audit` are not among `context.md`'s verify commands. The code review re-ran them when it was resolved.
- **Flakiness.** The 14 new tests (8 structure, 3 definitions, 3 schema) use no randomness and no timing, and passed on every run. The structure file's two older time bounds (50 ms, 250 ms) also passed on every run.
- **How the mutants and probes ran.**
  - Probes ran in memory (`tsx -e`) from the repository root.
  - Each mutant is a copy of one module in the session scratchpad. A scratch Vitest config, rooted at the repository with its cache in the scratchpad, has a `resolveId` plugin that swaps the resolved module for the copy. The unmodified tests then run against it: the four files above, plus `schema-agreement` and `issues`, 215 tests.
  - No repository file was edited.

**What the tests cover well:**
- **The three branches:**
  - the term is checked as usual when the condition holds;
  - it does not apply on another value, with the whole issue pinned, `conflicts` included;
  - its own value is still checked when the sibling failed or is missing, with "third" and 16 each giving a second issue.
- **Positions and order:** the sibling is named in full when nested or listed, and key order makes no difference.
- **Optional inputs:** run when absent, skipped when failed or not applying.
- **The fixed list:** `expected` and `allowed` both checked.
- **The definitions rules:** each rule has a test showing a broken definition is caught.
- **The schemas:** no conditional keyword in either schema, and the condition sentence present in both.
- **The test names** state behaviour and cite the review IDs.

**Mutation results:**

| Mutation | Result |
|---|---|
| Control: the validator's "only when" becomes "only if" | caught by 2 tests |
| The first branch drops `\|\| propertySpec(properties, term)?.required === true` | survives; stage-2 output identical over 189 inputs (QR-001) |
| The first branch tests `walk.failed.has(siblingPath)` alone | survives; stage-2 output identical over 189 inputs (QR-001) |
| `leaveOut` removes no provenance | survives (QR-002) |
| `leaveOut` removes only the exact key, not the subtree | survives (QR-002) |
| The not-applying branch marks nothing failed | caught by 1 test (the nested case) |
| Neither `leaveOut` nor the not-applying branch marks anything failed | caught by 1 test (the nested case) |
| The fixture's nested check also lists `extras` in `inputs` | survives (QR-002) |
| That fixture change plus nothing marked failed | survives: the nested test then proves nothing (QR-002) |
| The validator joins several values with ", " | survives (QR-002, QR-003) |
| The schema joins several values with ", " | survives (QR-002, QR-003) |
| The schema sentence is added in the published profile only | caught by 1 test |
| `optionalInputs` ignored | caught by 1 test |
| `optionalInputs` required to be present, like `inputs` | caught by 1 test |

**Weak assertions (QR-002):**
- "keeps the conditional term out of the schemas' logic: both accept it…" (`tests/core/schema-shape.test.ts:348`) validates the description against the published schema only.
- "states each condition…" (`:359`) searches the whole schema text, which contains the sentence three times. It would pass if the top-level term lost its sentence.

### Observability & Operability

**Rating:** Adequate
**Notes:**
- **This is a library.** It has no logger, metrics or telemetry in `src`, and a validator should not log. Its error surface is the issue list.
- **The conditional issue is actionable and attributable.**
  - Its message names the term, the type and the condition, with the sibling's full path ("spare.unit", "extras[1].unit").
  - `conflicts` gives the sibling's JSON Pointer.
- **The undecidable case is silent by design (DEL-002, as amended).** The sibling's own issue is reported, and the term's value is still checked. Only its applicability waits for the next pass. This is documented on `appliesWhen` and `checkConditional`.
- **The published documentation of the issue code does not cover the conditional form (QR-007).** `issueDocs.inapplicable_property` is exported for callers deciding how to react.

## Findings

### QR-001: `checkConditional`'s first branch tests three things where one decides, and two of its seven positional parameters exist only for that dead clause or can be derived

**Category:** Readability
**Severity:** Suggestion
**Location:**
- `src/core/validate/structure.ts`:
  - `:308-336` (`checkConditional`), with the first branch's condition at `:322`;
  - the call at `:291`, and the collection at `:226` and `:272-275`.
**Description:**
- **The condition is** `value === undefined && (walk.failed.has(siblingPath) || propertySpec(properties, term)?.required === true)`. Only the first test inside the brackets ever decides:
  - a required sibling that is missing is already in `walk.failed` (`:288`);
  - a failed sibling never reaches `normalized` (`:278` stores passed values only);
  - the sibling is an `enum`, so it is never omitted.
- **Mutation and probe.**
  - Dropping the `required` clause survives every test, as does reducing the whole condition to `walk.failed.has(siblingPath)`.
  - Over 189 inputs, the reduced condition gives identical stage-2 output, comparing issues, description, provenance and `failed`. The inputs cover the top level, `spare` and an `extras` element. The unit is absent, explicit `undefined`, "inches", "centimeters", "cm", 16, `null`, a getter or hidden, each with seven division variants.
- **Parameters.**
  - `properties` is read only by the dead clause.
  - `at` is always `child(place, spec.term)`, since a key equals its term.
  - `at` and `place` are both `Place`, in positions 3 and 5, so swapping them compiles.
- **Names.** `value` is the sibling's value. It sits beside `values` (the accepted values) and `element` (the term's own value), so `values.includes(value)` reads as a check of the term's own value.
- **Order and assertion.**
  - The doc comment lists the branches as holds / another value / undecidable. The code runs undecidable / holds / another value.
  - `spec.appliesWhen!` relies on the caller having filtered.
**Impact:**
- This function is the whole of GSV-REQ-051's validator logic. To learn that one predicate decides, a reader has to prove that the other two cannot matter.
- A later edit to the `required` clause (for an optional sibling, say) would look like a change in behaviour and would not be one.
**Recommendation:**
- Carry the condition with the term in `checkMap`, so no assertion is needed: `conditional.push({ spec, condition: spec.appliesWhen, element })`.
- Then:
  ```ts
  function checkConditional(spec: PropertySpec, condition: AppliesWhen, element: unknown, parent: Place, normalized: Record<string, unknown>, walk: Walk): void {
    const at = child(parent, spec.term);
    const sibling = child(parent, condition.term);
    const siblingPath = pointer(...sibling.segments);
    // The sibling failed or is missing, which is already reported: whether the term applies cannot be known.
    if (walk.failed.has(siblingPath)) { checkValue(…); leaveOut(…); return; }
    const siblingValue = normalized[condition.term];
    …
  }
  ```
- List the branches in the doc comment in the order the code runs them.

**Status:** Resolved
**Resolution:** Fixed — the condition is carried with the term from `checkMap`; `checkConditional` derives the term's place, decides by `walk.failed` alone, and its doc lists the branches in the order they run. Approved by the user, 2026-10-20.

---

### QR-002: Three parts of the mechanism can change with every test passing: `leaveOut`'s provenance removal, the joining of several values, and the nested check that proves "marked failed"

**Category:** Testing
**Severity:** Suggestion
**Location:**
- `src/core/validate/structure.ts:339-342` (`leaveOut`), `:333`; `src/core/schema.ts:114`;
- `tests/core/validate-structure.test.ts:638-643` (the nested case), with the stage-level pattern at `:431-455`;
- `tests/fixtures/definitions/conditional-ruler.ts:100-107` (the nested check);
- `tests/core/schema-shape.test.ts:348-366`.
**Description:**
- **Provenance.**
  - Two mutants survive: `leaveOut` removing no provenance, and `leaveOut` removing only the exact key.
  - The first branch always ends in an invalid result, so provenance is visible only at the stage level. That is where the file already tests it: "the structure stage's output when issues exist" (`:431-455`) asserts `description`, `failed` and `provenance` from `checkStructure`. No conditional case is there.
  - Every conditional term in the fixture is an `enum`, so the subtree half (`startsWith(\`${path}/\`)`) never runs.
- **Several values.**
  - Every condition in the tests has one value, so `.join(" or ")` is never exercised in either output.
  - Replacing it with ", " survives in the validator and in the schema.
- **The nested "marked failed" proof has no positive control.**
  - "marks a nested term it leaves out as failed…" passes only if the fixture's check "the spare markings name a division" stays silent. That check acts as a sentinel: it reports `missing_property` if it runs on a left-out division.
  - No test shows the sentinel firing, for example with `spare: { unit: "inches" }`. The fixture does not say the check is a sentinel, and its name reads like a domain rule.
  - Adding `extras` to the sentinel's `inputs` stops it running in that test, and every test passes. With that change, removing every "mark failed" also passes.
- **Two weak assertions in the schema tests.**
  - The test named "…both accept it…" validates against the published schema only.
  - "states each condition…" searches text that holds the sentence three times, so it does not pin the top-level term.
**Impact:**
- The nested case was added because a deliberate break first passed every test. It holds DEL-002's "marked failed" half.
- That guarantee now depends on a fixture check whose silence proves something only while nothing changes it.
- The other gaps are small today, but each can regress unseen: a stage invariant, and a text a model reads.
**Recommendation:**
- **A stage-level case beside `:431`.** Use `{ unit: "cm", smallestDivision: "half", spare: { unit: "cm", smallestDivision: "half" } }`. Assert that neither division is in `description` or `provenance`, and that both are in `failed`. Add an object-kind conditional term in a test-only map to reach the subtree removal.
- **A positive control for the sentinel.** `spare: { unit: "inches" }` should give `missing_property /spare/smallestDivision`. Add a fixture comment saying the check is a probe.
- **A two- or three-value condition**, pinned in both the message and the schema description (see QR-003).
- **Tighter schema assertions.**
  - Validate the tool schema too, wrapped as `{ graph: … }` with nulls for optional terms.
  - Assert the exact description of the top-level `smallestDivision`, and that `unit`'s has no sentence.

**Status:** Resolved
**Resolution:** Fixed — stage-level tests that left-out terms leave the description and provenance and enter `failed` (top level, nested, and an object-kind term's subtree); a positive control for the probe; two- and three-value conditions; exact schema descriptions; the tool schema validated. Each part now fails a test when broken. Approved by the user, 2026-10-20.

---

### QR-003: The condition sentence is built twice, by the same expression, in the validator and in the schema, and neither uses the schema module's own `alternatives` helper

**Category:** DRY
**Severity:** Suggestion
**Location:**
- `src/core/validate/structure.ts:333`;
- `src/core/schema.ts:111-115`;
- for comparison:
  - `src/core/schema.ts:39-40` (`alternatives`), used at `:128`;
  - `src/core/schema.ts:63-69` (`describeValue`, where `ordered`'s sentence is assembled);
  - `src/core/validate/derive.ts:28-29` (a second copy of `alternatives`).
**Description:**
- **Two copies of one formatter.**
  - The validator builds `` `only when ${sibling.term} is ${values.map((accepted) => JSON.stringify(accepted)).join(" or ")}` ``.
  - The schema builds `` ` Give it only when ${term} is ${values.map((value) => JSON.stringify(value)).join(" or ")}.` ``.
  - Only the name differs, legitimately: the full path in a message, the bare sibling term in an object schema.
- **Probe with three values.** With a test-only `unit` of four values and a condition naming three, the two texts read:
  - schema: `Give it only when unit is "inches" or "feet" or "yards".`
  - validator: `… applies to a ruler only when unit is "inches" or "feet" or "yards"; remove it.`

  The same schema's derivation text uses `alternatives`: "Give one of radius, diameter or circumference".
- **The schema patches its text after the fact.** It appends to `schemas[spec.term]!["description"]`, an `unknown`-typed index, after `valueSchema` has built it. `ordered`'s sentence is instead collected in `describeValue`'s notes list.
**Impact:**
- A change to one copy (quoting, the joiner, "is one of") would let the schema tell a model something the validator's message does not say.
- No test would notice, because neither joiner is exercised (QR-002).
- This is the drift GSV-REQ-015 and CR-006 set out to remove.
**Recommendation:**
- Write one helper beside `appliesWhen`, such as `describeCondition(name: string, values: Terms): string`, returning `only when unit is "inches" or "feet"` through `alternatives` over the quoted values.
  - The validator passes `sibling.term`, and the schema passes `term`.
  - Consolidating the two `alternatives` copies can come with it.
- Build the schema description in a `describeProperty(spec: PropertySpec)` that adds the condition as a note, as `describeValue` adds `ordered`'s.
- Pin a multi-value condition in both outputs.

**Status:** Resolved
**Resolution:** Fixed — `describeCondition(name, values)` in `src/core/definitions/types.ts`, used by the validator (the sibling's full place) and the schemas (`describeProperty`); several values are joined "a", "b" or "c". Approved by the user, 2026-10-20.

---

### QR-004: `leaveOut` scans every provenance key each time it leaves a conditional term out, so conditional terms in a list cost time quadratic in the description's size

**Category:** Performance
**Severity:** Suggestion
**Location:**
- `src/core/validate/structure.ts:339-342` (`leaveOut`), called at `:324`;
- for comparison: `:171-174` (`ordered`'s removal) and `src/core/validate/derive.ts:31-37` (`dropFailed`).
**Description:**
- **The cost.** `leaveOut` walks `Object.keys(walk.provenance)` to remove the path and everything under it. Each left-out term therefore costs time proportional to every value kept so far.
- **The probe.**
  - The input is an 88 KB description within the 10,000-value limit: a test-only definition with a list of 5,000 numbers and 1,600 list elements `{ unit: "cm", smallestDivision: "half" }`.
  - Stage 2 takes a median of 337 ms. With an exact-key delete instead of the scan it takes 14 ms.
  - Full validation of the same shape takes 11 ms with unit "inches" and 18 ms with "centimeters", where nothing is left out.
  - The suite holds a 1 MB hostile description to 250 ms (`tests/core/validate-structure.test.ts:418-427`).
- **Context, and why this is a Suggestion.**
  - No registered definition has `appliesWhen`.
  - The planned ruler (NLC TICKET-002) gives `smallestDivision` at the top level, so `leaveOut` runs at most once per description.
  - The fixture's list allows 3 elements.
  - The cost arises only for a later definition that puts a conditional term in list elements.
**Impact:** That definition would let a modest description take over a third of a second to validate. Validation is synchronous and may run in a browser or in a model's tool handler.
**Recommendation:**
- Remove the exact key for leaf kinds, and scan only when the term's spec is an `object` or an `array`.
- Or record provenance for the check in a scratch record and discard it, keeping `walk.count` shared.
- The same helper can then serve `ordered`'s removal at `:171-174`.

**Status:** Resolved
**Resolution:** Fixed — `leaveOut` deletes a leaf's own entry and scans only below an object or list. Probe: 3,000 conditional list elements, 26 ms against 127 ms with the full scan; no timing test (flaky under load), behaviour pinned by QR-002's tests. Approved by the user, 2026-10-20.

---

### QR-005: The test fixture repeats its unit/division pair three times, states the condition twice, and is held only to the condition rules

**Category:** DRY
**Severity:** Suggestion
**Location:**
- `tests/fixtures/definitions/conditional-ruler.ts`:
  - the three copies of the pair at `:15-30`, `:39-54` and `:68-83`;
  - the descriptions at `:28`, `:52` and `:81`.
- `tests/core/schema-shape.test.ts:338`;
- `tests/core/definitions.test.ts:198-201` (`allDefinitions`);
- for the pattern: `tests/fixtures/definitions/axis.ts` (`axis(term, name)`), `tests/fixtures/definitions/number-line.ts` (shared specs nested by reference), `src/core/definitions/categories.ts` (`categoriesProperty`, `scaleEnd`);
- `.gener8v/changes/rulers/tickets/number-lines-and-coordinate-graphs/TICKET-002.md:82`.
**Description:**
- **Three copies of about 16 lines each.**
  - The pair is meant to be one pair in three positions (top level, object, list element).
  - The `valueDescriptions` text appears three times, and a fourth time in the schema test.
  - Only the top-level copy's values are asserted, so an edit to one nested copy would quietly test a different pair.
  - Elsewhere, repeated specs are factored: `axis()` in the fixtures, `categoriesProperty()` in the definitions, and shared specs nested by reference.
- **The condition is stated twice.**
  - Each `smallestDivision` description ends "applies only when unit is inches.", and the schema now appends "Give it only when unit is "inches"." Probe: `An inch ruler's smallest division; applies only when unit is inches. Give it only when unit is "inches".`
  - NLC TICKET-002's Known Hazard says not to repeat the condition in the term's description. The fixture, the nearest model for that ticket, repeats it.
- **The fixture is held only to `conditionProblems`.**
  - It is outside `allDefinitions()`, so the vocabulary, input-path and applicability checks never see it. The input-path check now covers `optionalInputs`, and this fixture is the only definition that uses `optionalInputs`.
  - Put into a registry the definitions test reads, it passes the vocabulary and input-path checks. It fails applicability: "ruler: elementsOf lists the type, but no element carries label" (and "color").
  - So it is a `ruler` that breaks the rule every ruler must now meet, and nothing says why it is excluded.
**Impact:**
- The duplication makes the fixture harder to change consistently.
- The doubled sentence models what the next ticket is told not to do.
- The exclusion is a trap for whoever next adds the fixture to a definition-wide loop.
**Recommendation:**
- Define `unit` and `smallestDivision` once, as constants or a `markings()` helper, and nest them in all three places.
- Drop the hand-written condition from the description.
- Say in the fixture or at `allDefinitions` why it is excluded. Then either run `stageProblems` and `vocabularyProblems` on it, or nest `sharedProperties.label` and `.color` so it can join `allDefinitions()`.

**Status:** Resolved
**Resolution:** Fixed — the pair is defined once and nested three times; the hand-written condition is gone; the doc says why the fixture is outside `allDefinitions()`; `stageProblems` and `vocabularyProblems` run on it. Approved by the user, 2026-10-20.

---

### QR-006: `optionalInputs` differs from `inputs` only at the first path segment, which neither doc says, a path in both lists silently behaves as `inputs`, and stage 4's new rule is tested only through the structure tests' fixture

**Category:** Maintainability
**Severity:** Suggestion
**Location:**
- `src/core/definitions/types.ts:244-261`;
- `src/core/validate/domain.ts:28-30`;
- `src/core/definitions/axis.ts:151` (optional `tickSpacing` listed in `inputs`);
- `tests/core/definitions.test.ts:461` (`stageProblems`);
- `tests/core/validate-structure.test.ts:626-636`;
- `tests/core/validate-domain.test.ts` (unchanged);
- `.gener8v/changes/rulers/tickets/number-lines-and-coordinate-graphs/TICKET-002.md:62`.
**Description:**
- **Nested `inputs` paths are already optional below the first segment.**
  - `runDomainChecks` requires only the top-level property of each `inputs` path to be present.
  - The axis's spacing check lists the optional `tickSpacing` in `inputs` and handles its absence (`src/core/definitions/axis.ts:128-129`, `:151`).
- **Probe, with test-only checks:**
  - `inputs: ["spare/smallestDivision"]` runs when `spare` has no division.
  - `optionalInputs: ["spare/smallestDivision"]` also runs when `spare` is absent.
  - A check listing `smallestDivision` in both lists never runs on a ruler without a division: the `inputs` rule wins, with no warning.
  - `stageProblems` checks that each path exists, not that the lists overlap.
- **The docs suggest a bigger difference.**
  - `optionalInputs` is "Paths the check reads that may be absent", which implies that `inputs` paths may not be. That holds only for the first segment.
  - NLC TICKET-002's hazard repeats "a check is skipped whenever an input is absent".
- **Where the tests are.**
  - The four optional-input cases are in the structure test file, through the conditional fixture.
  - `tests/core/validate-domain.test.ts` tests stage 4's rules with inline definitions (`:95`, `:156`, `:185`), but has no optional-input case.
  - No nested or `*` optional input is tested.
**Impact:**
- `optionalInputs` is the tool NLC TICKET-002 is told to use.
- An author who believes `inputs` paths must be present may pick the wrong list for a nested path, or list a path in both. The second choice silently switches the check off whenever the term is absent, which is what CR-002 set out to avoid.
**Recommendation:**
- Say it in `optionalInputs`' doc: "Unlike `inputs`, the top-level property need not be present; below it, both lists behave the same."
- Have `stageProblems` refuse a path that is in both lists.
- Add stage-4 cases to `tests/core/validate-domain.test.ts`:
  - an absent top-level optional input runs;
  - a nested optional input under a failed parent is skipped;
  - a `*` optional input with one failed element is skipped.

**Status:** Resolved
**Resolution:** Fixed — the doc states the top-level difference; `stageProblems` refuses a path in both lists; stage-4 tests in `tests/core/validate-domain.test.ts` for absent, nested and `*` optional inputs. Approved by the user, 2026-10-20.

---

### QR-007: `inapplicable_property`'s published doc still covers only "does not apply to this graph type", and its params let `condition`, `elements` and `conflicts` combine freely, with the template choosing by precedence

**Category:** Maintainability
**Severity:** Suggestion
**Location:**
- `src/core/issues.ts`:
  - `:61` (`issueDocs.inapplicable_property`, exported at `src/core/index.ts:10`);
  - `:116-122` (the params);
  - `:290-293` (`forGraph`);
  - `:316-321` (the template).
**Description:**
- **The published doc is out of date.** `issueDocs` is documented "for callers deciding how to react". Its entry still reads "A vocabulary term, such as a presentation option, does not apply to this graph type."
  - The code now has a second meaning: the term applies to this graph type, but only while another term has a given value. The fix is to the term or to its sibling, named in `conflicts`.
  - `Issue.conflicts` and `Issue.allowed` had their docs updated; `issueDocs` was not.
- **The params type does not encode the pairing.**
  - `{ …; elements?: string; condition?: string; conflicts?: Terms }` accepts `condition` with `elements`, and the template then silently drops `elements`.
  - It also accepts `conflicts` without `condition`, though the doc says `conflicts` "then" names the sibling.
  - `contradiction` and `duplicate_name` make the compiler require `conflicts` together with `conflictTerms`.
- **The template repeats `forGraph`.** Its conditional branch writes `article(describeTerm(p.graphType))` and then `describeTerm(p.graphType)` again, which is `forGraph`'s body with "to" in place of "for". It sits inside a three-way nested ternary.
**Impact:**
- A caller, or the documentation built from `issueDocs`, describes the code by one of its two uses.
- A later call site can pass a combination the template ignores, and the compiler will not object.
**Recommendation:**
- Reword the `issueDocs` entry, for example: "A vocabulary term does not apply to this graph type, or applies only while another term has a given value (that term is in `conflicts`)."
- Type the params as `{ term: Term; graphType: string } & ({ elements?: string } | { condition: string; conflicts: Terms })`.
- Share an `aGraph(type)` helper between `forGraph` and the conditional message.

**Status:** Resolved
**Resolution:** Fixed — the published issue description covers the conditional case; params typed so `condition` comes with `conflicts` and never with `elements`; `aGraph` shared. Approved by the user, 2026-10-20.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fixed | Condition carried; one decision; branches in order | `src/core/validate/structure.ts` |
| QR-002 | Fixed | Stage-level, probe, multi-value and schema tests | `tests/core/validate-structure.test.ts`, `tests/core/schema-shape.test.ts` |
| QR-003 | Fixed | `describeCondition`, `describeProperty` | `src/core/definitions/types.ts`, `src/core/validate/structure.ts`, `src/core/schema.ts` |
| QR-004 | Fixed | Leaf entries deleted directly; scan only below objects and lists | `src/core/validate/structure.ts` |
| QR-005 | Fixed | Fixture pair defined once; held to the definition rules | `tests/fixtures/definitions/conditional-ruler.ts`, `tests/core/definitions.test.ts` |
| QR-006 | Fixed | Doc; both-lists refused; stage-4 tests | `src/core/definitions/types.ts`, `tests/core/definitions.test.ts`, `tests/core/validate-domain.test.ts` |
| QR-007 | Fixed | Published doc; typed params; `aGraph` | `src/core/issues.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (all 7 Resolved)
**Notes:**
- All seven Suggestions are fixed and re-verified; the parts QR-002 found unpinned now fail a test when broken.
- Re-verification: every check exits 0 except `pnpm audit`, which reports six development-only advisories (vite through vitest, launch-editor through @changesets/cli) published since this morning, with the lockfile unchanged; `pnpm audit --prod` is clean. That is outside this ticket. `pnpm test` (1,299 tests) passes on three runs.
