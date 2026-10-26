# TICKET-002: Publish the ruler's vocabulary terms and schema — Code Review

## Summary

I reviewed the delivery of `rulers/graph-specification-and-vocabulary/TICKET-002`: delivery commit `5e1ad02` on branch `ticket/rulers-gsv-002`. It is a verify-and-test delivery: one `@spec` comment change, six new tests and three specification rows. I checked it against the ticket's seven acceptance criteria, its Known Hazards, GSV-REQ-046..048, prd/IC-001 and prd/TC-008, and I read the committed `src/generated/*` directly rather than trusting the record. Every criterion is satisfied, the Verification Run reproduces, and the published vocabulary and both schemas describe the ruler completely. There are two Observations.

**Reviewer:** `code-reviewer` agent, fresh context (findings phase only, 2026-10-25)
**Delivery Record:** `.gener8v/changes/rulers/delivery/graph-specification-and-vocabulary-ticket-002-delivery.md`
**Files Reviewed:**
- `src/core/definitions/ruler.ts` (`:50-125`, comment-only change at `:59`)
- `tests/core/schema-shape.test.ts` (new block, `:407-466`)
- `.gener8v/specifications/graph-specification-and-vocabulary.md` (`## @spec Coverage`, rows `:255-257`)
- `src/generated/vocabulary.json`, `src/generated/schema.json`, `src/generated/tool-schema.json` (read, unchanged)
- `examples/ruler.json` (read)
- `tests/core/definitions.test.ts` (`:395-404`) and `tests/core/schema-agreement.test.ts` (read for context, unchanged)

**Findings:** 2
**Critical:** 0 | **Issues:** 0 | **Observations:** 2

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| The vocabulary lists the ruler's terms with plain-English definitions stating their limits (whole lengths to 30 cm / 12 in; a division only on inch rulers, sixteenth by default; marks as decimals in the ruler's unit on a mark). None empty | Yes | `src/generated/vocabulary.json` holds `rulerUnit`, `length` ("1 to 30 for centimeters, 1 to 12 for inches"), `smallestDivision` ("an inch ruler ...; sixteenth when left out"), `measuredObject`, `start` ("as a decimal: a whole millimeter ... a multiple of the smallest division ... Any mark from 0 to the ruler's length") and `end` ("after its start"). Pinned at `tests/core/schema-shape.test.ts:412-424`. The label's 200-character limit is in the `label` term and as `maxLength` (`:441-444`, GSV-REQ-052 hazard) |
| Each unit and each division is listed with a description | Yes | `valueDescriptions` on `rulerUnit` (2) and `smallestDivision` (4), `src/core/definitions/ruler.ts:~66-90`; keys equal `values` and each text is over 5 characters (`tests/core/schema-shape.test.ts:426-439`) |
| A shared term keeps one definition (GSV-REQ-015); the consistency check passes with the ruler registered | Yes | `tests/core/definitions.test.ts:395-400` runs `consistencyProblems` over the real `definitions` registry, which includes `ruler`; the test passes. `label` and `color` are the shared objects, not redefined |
| Both schemas include `ruler`, validate against their meta-schemas, and `examples/ruler.json` passes both | Yes | `tests/core/schema-shape.test.ts:446-453` (type in `anyOf`, `["ruler"]` in the strict tool schema, example accepted by both, the tool one through `toolForm`); meta-schema validity by `tests/core/schema-meta.test.ts`, which iterates `registeredTypes(definitions)` (unchanged, passes) |
| The schema-agreement property test runs over the ruler (at least 1,000 descriptions from `examples/ruler.json`) | Yes | `tests/core/schema-agreement.test.ts:182` iterates `registeredTypes(registry)`; passes in the full run. Unchanged by this ticket |
| `unknown_graph_type` lists `ruler`; the generated types include the ruler description | Yes | `tests/core/schema-shape.test.ts:455-459`; `RulerDescription` in `GraphDescription` in `src/generated/description.ts`; `tsc --noEmit` exits 0 |
| `pnpm generate` output committed; a second run changes nothing | Yes | `git show --stat 5e1ad02` touches nothing under `src/generated/`; the existing "committed exactly as a fresh build writes them" test passes. `pnpm generate` was not re-run (it writes files) |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| GSV-REQ-046 | Vocabulary terms with definitions for a ruler's unit and length | `src/core/definitions/ruler.ts`:defineRulerProperties (`rulerUnit`, `length`); published by `src/core/schema.ts`:buildVocabulary; test `tests/core/schema-shape.test.ts:412-424` | Yes |
| GSV-REQ-047 | A vocabulary term with a definition for an inch ruler's smallest division | `src/core/definitions/ruler.ts`:defineRulerProperties (`smallestDivision`, `appliesWhen` `rulerUnit` = `inches`); test `:426-439` | Yes |
| GSV-REQ-048 | Vocabulary terms with definitions for a measured object, its start mark and end mark | `src/core/definitions/ruler.ts`:defineRulerProperties (`measuredObject`, `start`, `end`); test `:412-424` | Yes |

*The ticket's NFR note (GSV-NFR-001, 003, 005) lists no NFR in Requirements Covered. GSV-NFR-003 is exercised for the ruler by the unchanged agreement test, which passes. The record's `pnpm bench` row reports GSV-NFR-001 within target; I did not re-run it.*

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/IC-001 | Strict tool schema subset with an object root | Yes | The ruler's tool-schema entry uses `type: ["string","null"]` with `null` in the `enum`, and no conditional keyword; the example passes the strict schema in tool form (`tests/core/schema-shape.test.ts:446-453`) |
| prd/TC-008 | One definition for types, validation and schema | Yes | Only a comment changes in the definition; the vocabulary, schemas and types all come from `ruler.ts`. `check:deps` exits 0 |

### Architecture Decision Adherence

Technical design not consulted for this ticket beyond AD-003 and AD-006, which it exercises.

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-003 | One definition is the source of types, validation, schemas and vocabulary | Yes | The ticket changes no schema logic (DEL-001); the tests read the published output of the single ruler definition |
| AD-006 | A published profile and a strict tool profile | Yes | Both schemas carry `ruler`; the strict one is tested with the example in tool form |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| GSV-REQ-046 | `@spec GSV-REQ-046` | `src/core/definitions/ruler.ts`:defineRulerProperties (`:59`) | Yes |
| GSV-REQ-047 | `@spec GSV-REQ-047` | `src/core/definitions/ruler.ts`:defineRulerProperties (`:59`) | Yes |
| GSV-REQ-048 | `@spec GSV-REQ-048` | `src/core/definitions/ruler.ts`:defineRulerProperties (`:59`) | Yes |

**Coverage:** 3 of 3 requirements annotated.
**Missing:** None. The annotation is on the line above `/* @__NO_SIDE_EFFECTS__ */` and the function, which is the placement the existing GSV-REQ-049..051 IDs on the same line already use.
**Specification table:** Yes: rows `:255-257` name `src/core/definitions/ruler.ts`:defineRulerProperties for each of the three. They sit after the GSV-REQ-052..054 rows rather than in requirement order (CR-002).

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm generate` ×2 | Not re-run (writes files) | Yes, by proxy: the "committed exactly as a fresh build writes them" test passes and the commit touches no generated file |
| `pnpm lint` | 0 (`npx eslint .`) | Yes |
| `pnpm typecheck` | 0 (`npx tsc --noEmit`) | Yes |
| `pnpm test` (re-run as `vitest run --no-cache`) | 0 | Yes: 1,473 tests in 53 files |
| `pnpm check:deps` | 0 (`npx tsx scripts/check-dependencies.ts`) | Yes |
| `pnpm bench`, `build`, `check:dist`, `check:images`, `publint`, `attw`, `audit` | Not re-run | Not checked; the other reviewers and the lint-adjacent checks cover the package surface, and this commit changes no source behaviour |
| `pnpm size` | Not re-run (excluded from this review's run) | Not checked |

*The record's one mutation check (removing `smallestDivision`'s `appliesWhen`) was not re-run.*

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | The ticket's Known Hazard says the output is already published and the ticket verifies it. I confirmed in `src/generated/*` that every term, value description, condition, limit and the `ruler` type is already present, so changing `src/core/schema.ts` would have been wrong |

*Deviations: none stated. The commit also touches `.gener8v/pipeline-state.yaml`, which is generated. The separate `2bd6bf1` lockfile bump is outside this ticket and noted in the record.*

## Findings

### CR-001: The new tests pin the ruler's vocabulary but not its schema text: the label's `maxLength` and the division's condition sentence are never checked in the published schemas

**Severity:** Observation
**Location:** `tests/core/schema-shape.test.ts:441-453`
**Traces To:** Acceptance criteria 1 and 4 (the label limit "published as `maxLength`"; the schemas "include the `ruler` type"); GSV-REQ-052; the delivery plan ("`measuredObject.label` `maxLength` 200 ... in the vocabulary and the schemas")
**Description:** The label test reads `getVocabulary()` only. The schema test checks that `ruler` is present and that the example validates, and the example is an inch ruler with a short label, so a missing `maxLength` on the label in `schema.json` or `tool-schema.json` would pass. I read both generated files and they are correct: `"maxLength": 200` on the label, and the division's description ends "Give it only when rulerUnit is "inches"." Nothing in this ticket fails if either regresses, apart from the generic freshness test.
**Impact:** Low. The vocabulary and the schemas come from the same definition, and the agreement test mutates the ruler example. A regression would still surface.
**Recommendation:** Add to the schema test an assertion that the ruler's `measuredObject.label` has `maxLength` 200 in both schemas, and that `smallestDivision`'s description in both mentions `rulerUnit`. Optional.
**Status:** Fixed
**Resolution:** Approved: a new test asserts `measuredObject.label` `maxLength` 200 and `smallestDivision`'s "Give it only when rulerUnit is \"inches\"." in both the published and the strict tool schema. Recorded in the delivery record's Post-Review Amendments (2026-10-25).

---

### CR-002: The three new `@spec Coverage` rows sit after GSV-REQ-052..054 rather than with the other ruler rows

**Severity:** Observation
**Location:** `.gener8v/specifications/graph-specification-and-vocabulary.md:255-257`
**Traces To:** Code Review step 8 (the coverage table); GSV-REQ-046..048
**Description:** The rows are accurate, but they are appended at the end of the table, after GSV-REQ-052..054, while GSV-REQ-049 (`:249`) sits in requirement order. A reader scanning for the ruler's requirements finds them in two places.
**Impact:** None for correctness or the `@spec` audit.
**Recommendation:** Move the three rows above the GSV-REQ-049 row, or leave them. Optional.
**Status:** Fixed
**Resolution:** Approved: the GSV-REQ-046..048 rows moved above GSV-REQ-049, in requirement order. Recorded in the delivery record's Post-Review Amendments (2026-10-25).

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Approve | Approved: a new test asserts `measuredObject.label` `maxLength` 200 and `smallestDivision`'s "Give it only when rulerUnit is \"inches\"." in both the published and the strict tool schema. | tests/core/schema-shape.test.ts |
| CR-002 | Approve | Approved: the GSV-REQ-046..048 rows moved above GSV-REQ-049, in requirement order. | .gener8v/specifications/graph-specification-and-vocabulary.md |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0
**Notes:**
- Both Observations were fixed in resolution with the Engineer (Thomas Eaves), 2026-10-25, and recorded in the delivery record's Post-Review Amendments.
- The full Verification Run passes after the fixes: `generate` (no change), `lint`, `typecheck`, `test` ×3 (1,474 passed), `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size`, `publint`, `attw`, `audit`.
