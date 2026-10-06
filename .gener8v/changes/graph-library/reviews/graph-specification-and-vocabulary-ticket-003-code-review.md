# TICKET-003: Validator — envelope and structure stages with term suggestions — Code Review

## Summary

I reviewed the delivery of `graph-library/graph-specification-and-vocabulary/TICKET-003` (delivery commit `450c9f7`, branch `ticket/gsv-003`). I checked it against the ticket and its ten Known Hazards, the Graph Specification & Vocabulary specification, `constraints/prd.md` and `technical-design/system-design.md`.

- **Criteria and requirements:** all twelve acceptance criteria are met. All sixteen functional requirements and GSV-NFR-001 are covered.
- **Annotations:** every requirement carries an `@spec` annotation that matches the specification's `## @spec Coverage` table, and the gener8v lint reports 0 errors.
- **Verification:** all eleven Verification Run commands reproduce with exit 0.
- **Issue-level findings (2):**
  - A JavaScript list that has both a hole and a named key passes the plain-list check (CR-001).
  - DEL-004's new `ordered` rule protects GSV-REQ-022 only for definitions that declare it, and the two tickets that define real minimum–maximum pairs are not told to (CR-002).
- **Observations (5):** the internal contract handed to TICKET-004, the empty-registry fallback, the benchmark percentile, edge-input classification, and the reach of the empty-label rule.

**Reviewer:** `code-reviewer` agent, fresh context (findings phase only, 2026-10-06)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/graph-specification-and-vocabulary-ticket-003-delivery.md`
**Files Reviewed:**
- `src/core/validate/index.ts`
- `src/core/validate/envelope.ts`
- `src/core/validate/structure.ts`
- `src/core/validate/suggest.ts`
- `src/core/format.ts` (`findUnsafeTextChar`)
- `src/core/definitions/types.ts` (`ObjectValue.ordered`)
- `src/core/index.ts`
- `tests/fixtures/definitions/axis.ts`, `tests/fixtures/definitions/circle.ts`, `tests/fixtures/definitions/number-line.ts`, `tests/fixtures/definitions/xy-graph.ts`, `tests/fixtures/definitions/index.ts`
- `tests/core/validate-envelope.test.ts`
- `tests/core/validate-structure.test.ts`
- `tests/core/validate.bench.ts`
- `tests/core/definitions.test.ts` (the delivery's changes)
- `tests/package/node-entry.test.ts`
- `package.json`, `vitest.config.ts`, `.github/workflows/ci.yml`
- Read for context, unchanged by this delivery: `src/core/issues.ts`, `src/core/result.ts`, `src/core/style.ts`, `src/core/definitions/shared.ts`, `src/core/definitions/index.ts`, `eslint.config.js`

**Findings:** 7
**Critical:** 0 | **Issues:** 2 | **Observations:** 5

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| `validate(input: unknown)` is exported from `src/core/index.ts` (`./core` entry) and never throws for any input; an unexpected exception becomes an `internal_error` issue | Yes | `src/core/index.ts:12` exports `validate`. `src/core/validate/index.ts:13-24`: `validateWith` wraps every stage in `try`/`catch` and returns `createIssue("internal_error", pointer(), {})`, which has a fixed message and no exception text. Tests:<br>- `tests/core/validate-structure.test.ts:279-307`: a throwing definition gives exactly one fixed `internal_error`, with no `file:`, `node_modules`, `    at ` or exception text (the SEC-003 Known Hazard).<br>- `:309-317`: hostile inputs.<br>- `tests/package/node-entry.test.ts:56-63`: the built `./core`.<br>Some edge inputs are classified differently from the Validation API (CR-006) |
| Envelope stage: a non-object input (array, string, number, null) yields exactly one `not_an_object` issue; a JSON string input is not parsed and yields `not_an_object` | Yes | `src/core/validate/envelope.ts:35-38` returns a single `not_an_object` when `isPlainObject` (`:13-17`) fails; nothing parses text. `tests/core/validate-envelope.test.ts:21-37` covers 10 inputs, including JSON text, `Date`, a class instance and a function, each with exactly one issue |
| Envelope stage: missing or unknown `type` yields `unknown_graph_type` with `allowed` listing all supported types, and no further checks run | Yes | `src/core/validate/envelope.ts:41-50`; on failure, `:58` returns before structure. Tests at `tests/core/validate-envelope.test.ts`:<br>- `:46-56`: missing type, with `radius: -1` and `colour` not reported.<br>- `:58-65`: 8 unknown values, including `"toString"` and `"__proto__"`.<br>- `:67-69`: a declared type with no registered definition is unknown.<br>"Supported" means registered (DEL-001). While the registry is empty, a fallback lists all of `GRAPH_TYPES` (CR-004) |
| Envelope stage: a `version` other than a supported integer yields `unsupported_version` and no further checks run; absent `version` validates against the current version (`1`) | Yes | `src/core/validate/envelope.ts:52-56` checks against `SUPPORTED_VERSIONS = [1]`, using `includes`, so `"1"`, `1.5`, `null` and `true` fail. Tests at `tests/core/validate-envelope.test.ts`:<br>- `:88-92`: 7 bad values, each the only issue.<br>- `:78-81`: absent and explicit `undefined` are accepted.<br>- `:83-86`: `1` is kept in the normalized description.<br>- `:94-99`: type and version issues are reported together, and nothing else |
| Structure stage collects all of: `unknown_property`, `inapplicable_property`, `missing_property`, `wrong_kind`, `out_of_range` — each with its JSON Pointer path, including nested array items such as `/points/2/x` | Yes | `src/core/validate/structure.ts`: `checkMap` (`:150-189`) and `checkValue` (`:72-143`) build paths with `pointer(...place.segments)`. Tests at `tests/core/validate-structure.test.ts`:<br>- `:61-66`: `/axis/ticks`, `/points/1/size`.<br>- `:68-73`: inapplicable at the top level and inside `/axis`.<br>- `:87-97`: `/xAxis/max`, `/segments/0/from/y`, `/segments/0/to`.<br>- `:116-136`: every kind.<br>- `:159-189`: ranges and ordering.<br>A list with a hole and a named key slips past the list check (CR-001) |
| NaN, Infinity and numeric strings such as `"5"` yield `wrong_kind`; numeric strings are never coerced | Yes | `src/core/validate/structure.ts:87` requires `typeof value === "number" && Number.isFinite(value)`. `tests/core/validate-structure.test.ts:101-114` covers 9 values (`NaN`, `±Infinity`, `"5"`, `null`, a list, an object, a boolean, a BigInt), each giving `wrong_kind`, `expected: "a number"` |
| A suggestion is given when Damerau–Levenshtein distance to the closest applicable term is ≤ 2 or ≤ one third of that term's length; otherwise the issue's `allowed` lists the applicable terms | Yes | `src/core/validate/suggest.ts:5-22` is optimal-string-alignment Damerau–Levenshtein. In `closestTerm` (`:30-41`), the threshold is `max(2, floor(len/3))`, which equals "≤ 2 or ≤ len/3" for integer distances. Case is ignored (DEL-007). `src/core/validate/structure.ts:165-174` always sets `allowed`, and adds `suggestion` when one is found. Tests at `tests/core/validate-structure.test.ts`:<br>- `:48-59`: suggestion, and `allowed` when nothing is close.<br>- `:320-351`: transpositions, the 17-letter, 3-edit case, ties, and long-name skip |
| Colors not in the named-color list and not a valid hexadecimal code yield `unknown_color` with `allowed` listing the named colors | Yes | `src/core/validate/structure.ts:105-113` goes through `resolveColor`, with `allowed: Object.keys(namedColors)` (`:46`), as the SEC-004 Known Hazard requires. A non-string gives `wrong_kind`. Tests: `tests/core/validate-structure.test.ts:193-209` |
| An empty label string is accepted and treated as no label | Yes | `src/core/validate/structure.ts:100` returns `OMITTED` for `""` on a presentation option, so the value is neither kept nor marked in provenance. `tests/core/validate-structure.test.ts:232-238` drops `title`, `lineLabel` and a point `label`. The rule reaches only shared options (CR-007) |
| A description with many independent problems reports all of them (test with ≥ 5 seeded problems) | Yes | `tests/core/validate-structure.test.ts:242-269` seeds 10 problems across 5 codes, each reported once at its own path, with no cascade from failed values. `:271-275` checks 500 issues with no cap (Product Owner decision on SEC-002) |
| `validate` runs in Node.js with no DOM and imports nothing from React (lint and a Node-environment test) | Yes | `eslint.config.js:14` puts `core` among `NON_RENDERING_DIRS`, so `src/core/validate/**` is under the React and browser-global rules; `pnpm lint` exits 0. `tests/package/node-entry.test.ts:56-63` runs `validate` from the built `@gener8v/graph-generator/core`, with a resolve hook that fails on any `react` import |
| p95 ≤ 5 ms per description for each type's example, measured by `tests/core/validate.bench.ts` in the CI verification run (GSV-NFR-001); until type tickets land, the bench runs over the fixture types in the test suite | Yes | `tests/core/validate.bench.ts:11-23` benchmarks each of the three `fixtureExamples` and asserts the result is ≤ 5 ms. `pnpm bench` exits 0 (re-run). `.github/workflows/ci.yml:75-78` adds the CI step. The asserted figure is p99, which is stricter than p95. The CI step has not run yet, because the repository has no remote (CR-005) |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| GSV-REQ-001 | One JSON object describes a graph of any type | `src/core/validate/envelope.ts:34-60` (`checkEnvelope`), `:13-17` (`isPlainObject`) | Yes. Cross-realm objects are rejected (CR-006) |
| GSV-REQ-002 | Graph type identified from one required field | `src/core/validate/envelope.ts:44-50` | Yes |
| GSV-REQ-004 | One point of entry for every graph type | `src/core/validate/index.ts:33-35` (`validate`), exported at `src/core/index.ts:12` | Yes |
| GSV-REQ-005 | Only plain JSON data accepted | `src/core/validate/envelope.ts:13-17`; `src/core/validate/structure.ts:72-143` (`checkValue`: finite numbers, plain objects, gap-free lists, no `undefined` values) | Yes, with an edge gap: a list with a hole and a named key passes (CR-001) |
| GSV-REQ-006 | Optional schema-version field; absent means current | `src/core/validate/envelope.ts:6-8`, `:52-56`; `src/core/validate/structure.ts:200-203` keeps a supplied `version` | Yes |
| GSV-REQ-016 | Validate before render; never render an invalid description | `src/core/validate/index.ts:13-24`. An invalid result carries no description | Yes, the validation half. The render gate belongs to CPSE-REQ-014 and CPSE-REQ-025 (Component Packaging tickets) |
| GSV-REQ-017 | Every problem reported in one pass | `src/core/validate/structure.ts:150-189` (`checkMap` collects into `walk.issues`), `:197-206`; envelope collects type and version together | Yes |
| GSV-REQ-018 | Report each missing required property | `src/core/validate/structure.ts:182-187` (an explicit `undefined` counts as missing, DEL-002) | Yes |
| GSV-REQ-019 | Report each property that is not an applicable term | `src/core/validate/structure.ts:159-176`, own-key lookup through `propertySpec` | Yes |
| GSV-REQ-020 | Suggest the closest applicable term | `src/core/validate/suggest.ts:30-41` (`closestTerm`); `src/core/validate/structure.ts:165-172` | Yes |
| GSV-REQ-021 | Report each wrong value kind | `src/core/validate/structure.ts:74-77`, `:83-142` | Yes |
| GSV-REQ-022 | Report each out-of-range value (non-positive lengths, min ≥ max) | `src/core/validate/structure.ts:54-68`, `:89-93` (bounds); `:121-129` (`ordered` pairs) | Yes for this ticket's fixtures. The real types must declare `ordered`, and nothing tells them to (CR-002) |
| GSV-REQ-024 | Report unknown or missing graph type and list the supported types | `src/core/validate/envelope.ts:20-22`, `:41-50` | Yes (DEL-001; CR-004) |
| GSV-REQ-025 | Report an unsupported schema version | `src/core/validate/envelope.ts:52-56` | Yes |
| GSV-REQ-026 | Validate without rendering and without a browser | `src/core/validate/index.ts:33-35`; `tests/package/node-entry.test.ts:56-63`; `eslint.config.js` boundary block | Yes |
| GSV-REQ-041 | Report a presentation option on a type it does not apply to | `src/core/validate/structure.ts:161-163`. A shared term absent from this level's map is `inapplicable_property`, at the top level and in elements | Yes |
| GSV-NFR-001 | Validating one description ≤ 5 ms at p95 in Node.js on a CI runner | `tests/core/validate.bench.ts` via `pnpm bench` (re-run, exit 0); CI step `.github/workflows/ci.yml:75-78` | Yes. Met locally with about 100× margin. The assertion is on p99, and no CI-runner run exists yet (CR-005) |

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/TC-005 | Validation must not load React DOM or browser globals, and is importable on its own | Yes | `src/core/validate/*` imports only `src/core` modules. The `eslint.config.js` non-rendering rules cover `src/core/**`, and `pnpm lint` exits 0. `tests/package/node-entry.test.ts:56-63` validates from the built `./core` in plain Node.js with React imports blocked |
| prd/OC-001 | Regressions are caught by automated checks | Yes | Every criterion has a test (83 new tests across the two validator files, plus the bench). The bench runs as its own CI step. One combined edge case is untested (CR-001) |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-001 | `./core` exports `validate`, with no React | Yes | `src/core/index.ts:12`. Construction helpers stay internal, and `validateWith` is not exported from `./core` |
| AD-003 | The validator reads the same definition objects as the schema and vocabulary | Yes | `checkStructure` reads terms only through `propertiesOf(type, registry)` (`src/core/validate/structure.ts:199`) and keys only through `propertySpec` (`:159`, `:161`), as the carried CR-002/SEC-003 Known Hazard requires. `ObjectValue.ordered` (DEL-004) is declarative, so TICKET-005 can publish it |
| AD-004 | Staged validator: the envelope stops; structure collects everything with no cascades; suggestion threshold | Yes | The envelope returns before structure (`src/core/validate/index.ts:15-16`). A failed value returns `FAILED` and is not walked further (`src/core/validate/structure.ts:11-12`). `ordered` compares only values that passed (`:121-123`). Values of unknown and inapplicable keys are not walked. The threshold matches AD-004 (`src/core/validate/suggest.ts:34-38`). Stages 3 and 4 are left to TICKET-004 (`src/core/validate/index.ts:18-19`). The structure result's description carries failed items into TICKET-004's input (CR-003) |
| AD-005 | `type`, integer `version` (currently `1`), JSON Pointer paths | Yes | `src/core/validate/envelope.ts:7-8`, `:44`, `:52`. `pointer()` escapes `~` and `/` per RFC 6901 |
| AD-006 | The published path rejects `null` where the kind does not allow it; the tool handler strips it | Yes | `null` reaches `checkValue` and gives `wrong_kind` (`tests/core/validate-structure.test.ts:106`). The record's Notes hand the stripping to CPSE TICKET-007 |
| Interface Contracts › Validation API | Input `unknown`, JSON text not parsed; output a non-empty issue list or a description and provenance as plain JSON; never throws; malformed input is `not_an_object`, a defect is `internal_error` | Yes, with edge cases | Plain JSON output: `tests/core/validate-structure.test.ts:34-39`. A revoked-Proxy input and a throwing getter surface as `internal_error`, not as malformed input, and a cross-realm JSON object is `not_an_object` (CR-006) |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| GSV-REQ-001 | `@spec GSV-REQ-001` | `src/core/validate/envelope.ts:33` (`checkEnvelope`) | Yes |
| GSV-REQ-002 | `@spec GSV-REQ-002` | `src/core/validate/envelope.ts:33` (`checkEnvelope`) | Yes |
| GSV-REQ-004 | `@spec GSV-REQ-004` | `src/core/validate/index.ts:32` (`validate`) | Yes |
| GSV-REQ-005 | `@spec GSV-REQ-005` | `src/core/validate/envelope.ts:33` (`checkEnvelope`); `src/core/validate/structure.ts:71` (`checkValue`) | Yes |
| GSV-REQ-006 | `@spec GSV-REQ-006` | `src/core/validate/envelope.ts:33` (`checkEnvelope`) | Yes |
| GSV-REQ-016 | `@spec GSV-REQ-016` | `src/core/validate/index.ts:32` (`validate`) | Yes |
| GSV-REQ-017 | `@spec GSV-REQ-017` | `src/core/validate/index.ts:32`; `src/core/validate/structure.ts:149` (`checkMap`), `:196` (`checkStructure`) | Yes |
| GSV-REQ-018 | `@spec GSV-REQ-018` | `src/core/validate/structure.ts:149`, `:196` | Yes |
| GSV-REQ-019 | `@spec GSV-REQ-019` | `src/core/validate/structure.ts:149`, `:196` | Yes |
| GSV-REQ-020 | `@spec GSV-REQ-020` | `src/core/validate/suggest.ts:29` (`closestTerm`); `src/core/validate/structure.ts:149` | Yes |
| GSV-REQ-021 | `@spec GSV-REQ-021` | `src/core/validate/structure.ts:71`, `:196` | Yes |
| GSV-REQ-022 | `@spec GSV-REQ-022` | `src/core/validate/structure.ts:71`, `:196` | Yes |
| GSV-REQ-024 | `@spec GSV-REQ-024` | `src/core/validate/envelope.ts:33` | Yes |
| GSV-REQ-025 | `@spec GSV-REQ-025` | `src/core/validate/envelope.ts:33` | Yes |
| GSV-REQ-026 | `@spec GSV-REQ-026` | `src/core/validate/index.ts:32` | Yes |
| GSV-REQ-041 | `@spec GSV-REQ-041` | `src/core/validate/structure.ts:149`, `:196` | Yes |
| GSV-REQ-043 (not in the ticket's Requirements Covered; added by the plain-text Known Hazard) | `@spec GSV-REQ-043` | `src/core/format.ts:115` (`findUnsafeTextChar`); `src/core/validate/structure.ts:71` | Yes |
| GSV-NFR-001 | none: an NFR is verified, not implemented at one place | `tests/core/validate.bench.ts` (verification) | N/A |

**Coverage:** 16 of 16 functional requirements annotated. Each annotation sits on the line directly above its function, below the JSDoc block. `python3 …/gener8v-state.py lint --root .` reports 0 errors and 0 warnings.
**Missing:** None
**Specification table:** Yes. `## @spec Coverage` in `.gener8v/specifications/graph-specification-and-vocabulary.md:184-200` lists exactly these locations, including the GSV-NFR-001 verification row. The GSV-REQ-043 row (`:180`) was extended with `findUnsafeTextChar` and `checkValue`

### Verification Run

Re-run on Node.js v24.1.0 and pnpm 10.28.2, branch `ticket/gsv-003` at `450c9f7`, the same environment as the record. The working tree was unchanged afterwards; only the hook-managed `.gener8v/runs.jsonl` differs.

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm lint` | 0 | Yes: no findings |
| `pnpm typecheck` | 0 | Yes: no errors |
| `pnpm test` | 0 | Yes: 11 files, 338 tests passed |
| `pnpm bench` | 0 | Yes: 1 file, 3 benchmarks passed. The asserted figure is p99 (CR-005) |
| `pnpm build` | 0 | Yes: all four entries and declarations emitted (`dist/core/index.js` 26.11 KB unminified) |
| `pnpm check:dist` | 0 | Yes: 4 built files scanned, no network APIs or modules |
| `pnpm size` | 0 | Yes: `./core` 5.86 kB of 25 kB |
| `pnpm publint` | 0 | Yes: "All good!" |
| `pnpm attw` | 0 | Yes: only the ignored `node10` and CJS-resolves-to-ESM rows in the ESM-only profile |
| `pnpm check:deps` | 0 | Yes: 0 runtime dependencies |
| `pnpm check:changesets` | 0 | Yes: 0 changesets checked |

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | Treating "supported" as "registered" is the truthful reading: an unregistered type cannot be validated. The empty-registry fallback contradicts the decision's own definition and produces a self-contradicting message until the first type lands. The test pinning it will break on the first registration (CR-004) |
| DEL-002 | Reasonable | `undefined` disappears in JSON, so treating it as absent keeps a description equal to its serialized form (GSV-REQ-005). It applies to keys only. An `undefined` list item is still `wrong_kind`, which is consistent, because JSON writes it as `null` |
| DEL-003 | Reasonable | Unsafe text and invalid enum values are wrong kinds of value, and a new code would widen GSV-REQ-034's contract. The enum's values appear only in the `expected` text, not in `allowed`. That meets GSV-REQ-032 ("the expected value kind"), but a model reading structured fields gets no list. Worth keeping in mind for TICKET-005's schema wording; not a finding |
| DEL-004 | Reasonable, with downstream risk | `ordered` is declarative, checked only on values that passed, and validated by `tests/core/definitions.test.ts`. It is a good fit for AD-003 and AD-004. Because it is opt-in, GSV-REQ-022's "minimum not less than maximum" now depends on NLC TICKET-001 and DGP TICKET-001 declaring it, and neither ticket says so (CR-002) |
| DEL-005 | Reasonable | The minimal normalized copy uses vocabulary terms only, so no description key is ever assigned (the SEC-003 copy rule). Colors are resolved, empty presentation text is dropped, and provenance covers leaves only. A valid result re-validates. The intermediate `StructureResult.description` is looser than its doc comment says (CR-003) |
| DEL-006 | Reasonable | Vitest 5 does give benchmarks a test-context `bench` fixture, and the CI step is wired. With Vitest's default `retainSamples: false`, the p95-from-samples branch never runs: the test asserts p99, which is stricter. The record describes the dead branch (CR-005) |
| DEL-007 | Reasonable | Ignoring case catches the likeliest slip. Ties go to definition order, and the length skip keeps a 100,000-character key under 50 ms (tested). Short terms matching short names (`xyz` → `x`) follow AD-004's rule as written |

**Deviations from Plan:**
- **Benchmark (DEL-006):** acceptable. It still meets the criterion's "measured by `tests/core/validate.bench.ts` in the CI verification run". The removed unit-test timing would have duplicated it.
- **`tests/core/definitions.test.ts`:** acceptable and good for traceability. It holds the validator's fixtures to the same definition rules as the real registry, and adds the `ordered` term check.
- **Downstream:** neither deviation changes another ticket's interface.

## Findings

### CR-001: A list with a hole and a named key passes as a plain list, and its provenance points at the wrong items

**Severity:** Issue
**Location:** `src/core/validate/structure.ts:132-141` (`checkValue`, `array` case)
**Traces To:** GSV-REQ-005; TICKET-003 acceptance criterion "Structure stage collects … each with its JSON Pointer path"; DEL-005 (provenance by JSON Pointer)
**Description:** The list check (line 135) is `Object.keys(value).length !== value.length`. A list with one hole and one named key has as many keys as its length, so it passes. For example, `[{ value: 1 }, <hole>, { value: 3 }]` with `.extra = { value: 99 }` has the keys `0`, `2` and `extra`, three of them, and length 3. `forEach` (line 137) then skips the hole and never sees `extra`.

I probed this on the number-line fixture. It returned `valid: true` with:
- `points: [{ value: 1 }, { value: 3 }]`: two items;
- provenance entries `/points/0/value` and `/points/2/value`. The second names an item the normalized list does not have.

The input does not survive serialization: `JSON.stringify` writes the hole as `null`, which this validator reports as `wrong_kind`. The delivery's test (`tests/core/validate-structure.test.ts:138-149`) checks a sparse list and a list with an extra key separately, never one list with both.
**Impact:** A JavaScript caller gets a valid result for a description that is not plain JSON data. The result's provenance does not match its description, and TICKET-004's derivation and the renderers will rely on it. Reaching this takes a hand-built array, so it is unlikely. When it happens, the result is wrong, not just unhelpful.
**Recommendation:**
- Keep the key count as the cheap first test.
- Then walk the indices with a `for` loop instead of `forEach`. Report `wrong_kind` ("a list") at the first index that is not an own property (`!Object.hasOwn(value, index)`). The cost stays linear in the keys already counted.
- Add the combined case to the "accepts only plain objects and plain lists" test.
**Status:** Resolved
**Resolution:** Approved. Lists are read position by position through own data descriptors (`readList`), so a hole plus an extra key fails as `wrong_kind`; a combined test was added.

---

### CR-002: `ordered` is opt-in, but the tickets that define real minimum–maximum pairs are not told to declare it

**Severity:** Issue
**Location:** `src/core/definitions/types.ts:84-92` (`ObjectValue.ordered`); `src/core/validate/structure.ts:121-129`; `.gener8v/changes/graph-library/tickets/number-lines-and-coordinate-graphs/TICKET-001.md` (Known Hazards); `.gener8v/changes/graph-library/tickets/data-graphs-and-pictographs/TICKET-001.md` (`valueScale`)
**Traces To:** GSV-REQ-022 ("a range whose minimum is not less than its maximum"); DEL-004; AD-004 (no cascades)
**Description:** DEL-004 meets GSV-REQ-022's ordering rule only for object specs that declare `ordered`. A pair that is not declared is never compared. Downstream, the hand-off is incomplete:
- **NLC TICKET-001** defines the real axis group, which the number line, x,y graph and x,y,z graph share. Its Known Hazard says "`min ≥ max` is reported by the GSV structure stage … not here". Read on its own, that means "do nothing", and it does not say the axis spec must declare `ordered: [["min", "max"]]`. DEL-004's Ticket Impact says so, but only inside this delivery record.
- **DGP TICKET-001** defines `valueScale` with `minimum` and `maximum`, also a range under GSV-REQ-022. Neither that ticket nor DEL-004 mentions it.
- **The fixture** `tests/fixtures/definitions/axis.ts:23` shows the right declaration, but it is test-only.
**Impact:** If either type ticket follows its own text, a reversed axis or value scale passes structure. NLC's tick checks and DGP's `tick_interval_not_dividing` then run on an inverted range, breaking AD-004's no-cascade rule in the domain stage. GSV-REQ-022's ordering rule would be proven on fixtures and missing in the shipped types.
**Recommendation:**
- In resolution, defer to `graph-library/number-lines-and-coordinate-graphs/TICKET-001` and `graph-library/data-graphs-and-pictographs/TICKET-001`. Append this Known Hazard to each: "Declare `ordered` on the object spec (`[["min", "max"]]` on the axis group; `[["minimum", "maximum"]]` on `valueScale`). The GSV structure stage checks only declared pairs, and reports a reversed pair as `out_of_range` at the upper term."
- Optionally, add a rule to `tests/core/definitions.test.ts` that fails when an object spec has number terms `min`/`max` or `minimum`/`maximum` without the matching `ordered` pair, so the requirement holds by construction.
**Status:** Resolved
**Resolution:** Approved. Known Hazards on NLC TICKET-001 and DGP TICKET-001, and a definitions-test rule that fails on `min`/`max` or `minimum`/`maximum` without the matching `ordered`.

---

### CR-003: `checkStructure`'s description holds more than "the known properties that passed"

**Severity:** Observation
**Location:** `src/core/validate/structure.ts:17-23` (`StructureResult`), `:118-141`
**Traces To:** AD-004 (stages 3 and 4 run on values that passed stage 2); DEL-005; `graph-library/graph-specification-and-vocabulary/TICKET-004` (blocked by this ticket)
**Description:** `StructureResult.description` is documented as "The known properties that passed". It also contains:
- the `FAILED` symbol wherever a list item failed, because line 138 pushes whatever `checkValue` returns;
- partial objects, for items whose other members failed;
- both members of an `ordered` pair that failed, each marked `supplied` in `provenance`.

I probed `{ xAxis: { min: 5, max: 1 }, points: [{ x: 1, y: 2 }, { x: NaN, y: 1 }, 7] }`. It produced:
- `points: [{ x: 1, y: 2 }, { y: 1 }, Symbol(failed)]`;
- `xAxis: { min: 5, max: 1 }`;
- `/xAxis/max: "supplied"`.

Nothing escapes today, because `validateWith` returns as soon as structure reports an issue (`src/core/validate/index.ts:19`). But TICKET-004 will run derivation and domain checks on the values that passed stage 2. The record's Notes tell it to use the issues to decide what passed. They do not say that the description holds a non-JSON symbol and an inverted range.
**Impact:** A TICKET-004 implementer who trusts the doc comment could feed `Symbol(failed)` or a reversed axis into domain checks. That would produce exactly the cascades AD-004 forbids.
**Recommendation:** Either:
- correct the doc comment, and add a Known Hazard to GSV TICKET-004 naming the three cases; or
- have `checkStructure` also return the pointers that failed (for example `failed: ReadonlySet<string>`), so TICKET-004 can test "passed" directly.

Do not simply drop failed list items: that would shift indices, the problem in CR-001.
**Status:** Resolved
**Resolution:** Approved, together with QR-001. `checkStructure` returns `failed`; failed values (the `ordered` upper end included) leave `description` and `provenance`, and failed list elements are `null`. A Known Hazard on GSV TICKET-004 explains this.

---

### CR-004: While no type is registered, `unknown_graph_type` lists types it then rejects, and the test that pins this breaks on the first registration

**Severity:** Observation
**Location:** `src/core/validate/envelope.ts:41-43`; `tests/core/validate-envelope.test.ts:71-74`
**Traces To:** GSV-REQ-024; DEL-001
**Description:** DEL-001 defines a supported type as one with a registered definition. Yet while the registry is empty, `allowed` falls back to all of `GRAPH_TYPES`. The public `validate({ type: "circle", radius: 1 })` therefore returns: "type must be one of: number-line, xy-graph, …, circle, …; got "circle"." The message lists the value it rejects as allowed.

The envelope test asserts that `allowed` equals `[...GRAPH_TYPES]` for the real registry. It will fail as soon as the first type ticket registers a definition, when `allowed` becomes that one type. The record's "For the type tickets" note does not warn of this.
**Impact:** The contradictory message is temporary and appears only in pre-release builds. The first type ticket inherits a failing test with no explanation.
**Recommendation:** Either keep the fallback and add one line to the record's Notes ("the first type ticket replaces the 'lists every declared type while no definition is registered yet' test with one over the registered types"), or drop the fallback and let the message say that no graph types are available yet. Either is fine; the current choice is not wrong, only unannounced.
**Status:** Resolved
**Resolution:** Approved. The fallback is kept and commented, and a Known Hazard on GSS TICKET-002 says to replace the test when the circle registers.

---

### CR-005: The GSV-NFR-001 bench asserts p99, not p95, and the record says otherwise

**Severity:** Observation
**Location:** `tests/core/validate.bench.ts:17-20`; `vitest.config.ts:9`
**Traces To:** GSV-NFR-001; TICKET-003 acceptance criterion "p95 ≤ 5 ms per description"; DEL-006
**Description:** The bench computes p95 from `result.latency.samples` and falls back to `latency.p99` when there are no samples. The p95 branch never runs:
- Vitest 5.0.3 defaults `benchmark.retainSamples` to `false` (`vitest/dist/chunks/defaults.*.js`), and `vitest.config.ts` does not override it.
- tinybench 6.2.0 types `samples` as `SortedSamples | undefined`, so the samples are absent.

Every run therefore asserts p99 ≤ 5 ms. The record's own evidence lists p99 values. Its Acceptance Criteria line ("asserts p95 from the sorted latency samples") and DEL-006 describe the branch that does not run.

Separately, GSV-NFR-001 names a CI runner. The repository has no remote yet, so the CI step (`.github/workflows/ci.yml:75-78`) has never run. The record says so openly and points to CPSE TICKET-009.
**Impact:** None on correctness: p99 ≤ 5 ms implies p95 ≤ 5 ms, so the check is stricter than the NFR, with about 100× margin. The record overstates what is measured, and the p95 branch is dead code.
**Recommendation:**
- Either set `benchmark: { include: [...], retainSamples: true }` (or the per-task option), so the assertion is the p95 the NFR names, or keep p99 and say so in the test comment and the record.
- Confirm the first CI-runner result once CPSE TICKET-009 creates the remote.
**Status:** Resolved
**Resolution:** Approved. `benchmark.retainSamples: true`; the bench asserts and prints a true p95. The delivery record is corrected in Post-Review Amendments.

---

### CR-006: Some edge inputs are classified differently from the Validation API's error cases

**Severity:** Observation
**Location:** `src/core/validate/envelope.ts:13-17` (`isPlainObject`); `src/core/validate/index.ts:21-23`
**Traces To:** Interface Contracts › Validation API ("malformed input is an issue (`not_an_object`); an internal defect surfaces as `internal_error`"); GSV-REQ-001; `issueDocs.internal_error` in `src/core/issues.ts`
**Description:** Probes found three edge inputs that land somewhere other than where the contract puts them:
- **A JSON object from another realm** (`vm.runInNewContext('JSON.parse(…)')`, or an object handed over from an iframe) has a different `Object.prototype`. It is reported as `not_an_object`, "got an object": a JSON object is described as not one.
- **A revoked `Proxy` as the whole input** becomes `internal_error`, because `Array.isArray` throws inside `isPlainObject`.
- **A plain object with a throwing getter** also becomes `internal_error`.

The `internal_error` message says the check failed because of "a defect in the package; please report it. The description itself may be valid." That is untrue of a hostile value from the caller. The ticket's criterion ("never throws; an unexpected exception becomes `internal_error`") is met. The test at `tests/core/validate-structure.test.ts:309-317` asserts only `valid: false`.
**Impact:** Low. Cross-realm callers get a confusing rejection, and hostile inputs invite bug reports against the package. No exception escapes, and no exception text leaks.
**Recommendation:** Decide the behaviour and pin it with a test. One option:
- Catch inside `isPlainObject` and return `false`, so a revoked Proxy is `not_an_object`.
- Accept a cross-realm object when `Object.prototype.toString.call(value) === "[object Object]"` and its prototype's prototype is `null`.
- Keep the throwing accessor as `internal_error` if preferred, but record that as a decision (an extension of DEL-002, or a new one).
**Status:** Resolved
**Resolution:** Approved. `isPlainObject` accepts cross-realm JSON objects and never throws. A revoked or throwing Proxy is `not_an_object` or `wrong_kind`. A getter or hidden property is `wrong_kind` ("plain JSON data") and the getter is never run. Each case has an exact-code test.

---

### CR-007: The empty-label rule is tied to `presentation`, which type-specific label terms will not carry

**Severity:** Observation
**Location:** `src/core/validate/structure.ts:100`; `src/core/definitions/types.ts:45` (`PresentationOption`)
**Traces To:** GSV Edge Cases ("Label text is empty: treat an empty label as no label"); TICKET-003 acceptance criterion "An empty label string is accepted and treated as no label"; DEL-005
**Description:** An empty string is dropped only when its spec has `presentation`, which marks one of the six shared options. Today every label term in the vocabulary is a shared option, so the criterion is fully met.

The type tickets will add label text of their own:
- custom tick labels (NLC-REQ-019);
- custom measurement label text (GSS-REQ-035);
- the value-unit label (DGP-REQ-002).

None of these can honestly set `presentation`, so `""` will be kept as a supplied empty string. For a custom tick label that may even be the intended behaviour, for example a blank tick in a "fill in the missing number" exercise.
**Impact:** Each type ticket will decide, perhaps without noticing, whether the Edge Case applies to its labels. Two types could decide differently.
**Recommendation:**
- State in the delivery record's Notes, or as Known Hazards on the tickets that define those terms, that the empty-label rule covers shared presentation options only.
- Each type ticket should then say whether `""` on its own label terms means "no label" or "a blank label".
- If any of them means "no label", add an explicit flag on `StringValue` for it instead of overloading `presentation`.
**Status:** Resolved
**Resolution:** Approved. Known Hazards on NLC TICKET-002, GSS TICKET-002 and DGP TICKET-001 to state what `""` means for their own label terms.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Approved | `readList` checks every position | `src/core/validate/json.ts`, `tests/core/validate-structure.test.ts` |
| CR-002 | Approved | Known Hazards; `ordered` rule in definitions test | NLC/DGP `TICKET-001.md`, `tests/core/definitions.test.ts` |
| CR-003 | Approved | `failed` set; failed values leave the output | `src/core/validate/structure.ts`, `tests/core/validate-structure.test.ts`, GSV `TICKET-004.md` |
| CR-004 | Approved | Fallback commented; Known Hazard on GSS TICKET-002 | `src/core/validate/envelope.ts`, GSS `TICKET-002.md` |
| CR-005 | Approved | True p95, printed every run | `vitest.config.ts`, `tests/core/validate.bench.ts`, `package.json` |
| CR-006 | Approved | Cross-realm objects accepted; hostile inputs classified as caller input | `src/core/validate/json.ts`, `src/core/validate/envelope.ts`, tests |
| CR-007 | Approved | Known Hazards on three label-defining tickets | NLC `TICKET-002.md`, GSS `TICKET-002.md`, DGP `TICKET-001.md` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0
**Notes:** Resolved with the Product Owner on 2026-10-06. All seven findings were fixed or carried to the tickets that need them, and re-verified: lint, typecheck, 407 tests, bench (a true p95, at most 0.031 ms), build, `check:dist`, size, publint, attw, `check:deps` and `check:changesets` all exit 0 (see the delivery record's Post-Review Amendments). GSV-REQ-022's ordering rule now holds by construction for the range groups the type tickets will define.
