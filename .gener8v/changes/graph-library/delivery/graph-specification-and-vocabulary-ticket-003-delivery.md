# TICKET-003: Validator — envelope and structure stages with term suggestions — Delivery Record

## Ticket Reference

**Ticket:** graph-library/graph-specification-and-vocabulary/TICKET-003
**Change:** `.gener8v/changes/graph-library/change.md`, Approved when delivery started
**Specification:** `.gener8v/specifications/graph-specification-and-vocabulary.md`
**Requirements Covered:**
- GSV-REQ-001: One JSON object describes a graph of any type
- GSV-REQ-002: The graph type is identified from one required field
- GSV-REQ-004: One point of entry for every graph type
- GSV-REQ-005: Only plain JSON data is accepted
- GSV-REQ-006: Optional schema-version field; absent means current
- GSV-REQ-016: Validate before rendering; never render an invalid description
- GSV-REQ-017: Every problem is reported in one pass
- GSV-REQ-018: Report each missing required property
- GSV-REQ-019: Report each property that is not an applicable term
- GSV-REQ-020: Suggest the closest applicable term
- GSV-REQ-021: Report each wrong value kind
- GSV-REQ-022: Report each out-of-range value (non-positive lengths, min ≥ max)
- GSV-REQ-024: Report an unknown or missing graph type and list the supported types
- GSV-REQ-025: Report an unsupported schema version
- GSV-REQ-026: Validate without rendering and without a browser
- GSV-REQ-041: Report a presentation option on a type it does not apply to
- GSV-NFR-001: Validating one description of any type takes at most 5 ms at p95 in Node.js on a CI runner, verified by a Vitest bench over every graph type's example description

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Depends On: TICKET-001 delivered | delivery record, Delivered | Delivered, verification passed, reviews resolved (commits 3276f1e, 86feceb) | ✅ |
| Depends On: TICKET-002 delivered | delivery record, Delivered | Delivered, verification passed, reviews resolved (commits 8e08f2a, 9d957f7) | ✅ |
| `src/core/definitions/types.ts` (PropertySpec kinds and ranges) | present | present: `ValueSpec` per kind, `defineProperties`, `propertySpec` | ✅ |
| `src/core/definitions/shared.ts` (applicability) | present | present: `sharedProperties` with `appliesTo` and `elementsOf` (the review resolution replaced `itemProperties`) | ✅ |
| `src/core/definitions/index.ts` (registry) | present | present: `definitions` (empty) and `propertiesOf(type, registry?)` | ✅ |
| `src/core/issues.ts`, `src/core/result.ts` | present | present: `createIssue` typed per code, `pointer`, `validResult`/`invalidResult` | ✅ |
| `resolveColor`, `namedColors` (`src/core/style.ts`) | present | present, ASCII-only name matching | ✅ |
| Output paths free (`src/core/validate/*`, three test files, `tests/fixtures/definitions/`) | absent | absent | ✅ |
| Prior Art: specification Validation subsection, Description Handling, Edge Cases | present | present, Approved | ✅ |
| Prior Art: design AD-004, AD-005, Validation API | present | present, Approved | ✅ |
| A Vitest bench runs in CI | `vitest bench` wired into a script and the CI workflow | no `bench` script; `.github/workflows/ci.yml` has no bench step; `vitest.config.ts` has no `benchmark` include | ⚠️ Non-blocking. The plan adds the script, config and CI step |
| `min ≥ max` (GSV-REQ-022) reported by the structure stage | a way for a definition to declare that one property must be less than another | `ObjectValue` has no such field. NLC TICKET-001's Known Hazard says the GSV structure stage reports it | ⚠️ Resolved in plan: an optional `ordered` pair list on `ObjectValue` (a small addition to the RES-001 contract, before the circle slice) |
| `NormalizedDescription` and provenance | GSV TICKET-004 | absent | ⚠️ Non-blocking. This ticket returns a minimal normalized copy (known properties only, empty presentation text dropped, colors resolved) with every present value marked `supplied`. TICKET-004 adds derivation and the full rules |
| Carried findings deferred to this ticket | read the Known Hazards | eight Known Hazards (AD-004 stop rules; strictness; `null` handling; fixture definitions; no issue cap; no exception text; `IssueParamsByCode`; `propertiesOf`/`propertySpec`; unsafe characters in plain text; `resolveColor`) | 🔁 Carried. Each is addressed in the plan |

**Resolved from ground truth (not escalated):**
- "Supported types" for `unknown_graph_type` means the types that have a registered definition, in `GRAPH_TYPES` order. With the registry empty, the public `validate` currently accepts no type, which is accurate until the type tickets land. TICKET-006 makes the registered set equal `GRAPH_TYPES`.

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.` (branch `ticket/gsv-003`, cut from `ticket/gsv-001`)
**Plan approved by:** Engineer — Thomas, 2026-10-06

### Planned Files

- `src/core/validate/index.ts`:
  - `validate(input: unknown): ValidationResult<DescriptionBase>` checks against the registry. An internal `validateWith(input, registry)` does the work, so tests can pass fixture types.
  - Everything runs inside a try/catch. Any exception becomes the single fixed-text `internal_error` issue.
  - On success it returns a minimal normalized copy, which TICKET-004 extends: known properties only, empty presentation text dropped, colors resolved to lowercase `#rrggbb`, and every present value marked `supplied`.
- `src/core/validate/envelope.ts`:
  - A plain object is required: an array, string, number, `null`, `Date` or class instance gives one `not_an_object` issue, and JSON text is never parsed.
  - `type` must name a registered type; otherwise `unknown_graph_type`, listing the registered types.
  - `version`, if present, must be the integer `1`; `"1"` and `null` are unsupported.
  - Any envelope failure stops the check.
- `src/core/validate/structure.ts`: walks the description against `propertiesOf(type)`, recursing into objects and array items, with JSON Pointer paths and readable terms (`points[2].x`).
  - **Unknown or inapplicable:** a shared option outside its `appliesTo` (top level) or `elementsOf` (elements) gives `inapplicable_property`. Any other unknown key gives `unknown_property`, with a suggestion or the allowed terms. Keys are looked up only with `propertySpec`.
  - **Missing:** a required property that is absent gives `missing_property`. An explicit `undefined` counts as absent; `null` is a wrong kind.
  - **Kinds:**
    - `number`: finite only.
    - `integer`.
    - `string`: rejects control characters, line and paragraph separators, and text-direction overrides and isolates with `wrong_kind`.
    - `boolean`.
    - `color`: via `resolveColor`. A non-string gives `wrong_kind`; an unrecognised string gives `unknown_color` with the named colors.
    - `enum`: a value not in the list gives `wrong_kind`, "one of: …".
    - `object`: plain objects only.
    - `array`: a list with no gaps, checked cheaply.
  - **Ranges:** `min`, `max` and the exclusive flags give `out_of_range`.
  - **`ObjectValue.ordered`:** pairs such as `[["min", "max"]]` are checked once both values pass. Failure gives `out_of_range` at the upper property with "greater than <lower>".
  - **No cascades:** a value that fails is not checked further. There is no cap on the number of issues.
- `src/core/validate/suggest.ts`: `closestTerm(name, terms)` uses Damerau–Levenshtein distance (the optimal-string-alignment form), ignoring case.
  - It suggests a term when the distance is at most 2 or at most a third of the term's length. Ties go to the first term in definition order.
  - It skips terms whose length difference already exceeds the threshold.
- `src/core/format.ts`: adds `findUnsafeTextChar(text)`.
- `src/core/definitions/types.ts`: adds `ObjectValue.ordered`.
- `src/core/index.ts`: exports `validate`.
- `tests/fixtures/definitions/`: small circle, number-line and xy-graph definitions and a fixture registry. They follow the definition rules, and `definitions.test.ts` checks them.
- `tests/core/validate-envelope.test.ts`: the envelope criteria.
- `tests/core/validate-structure.test.ts`:
  - structure, kinds, ranges, ordering, suggestions, colors, unsafe text, empty labels, `__proto__`;
  - at least 5 seeded independent problems, and no cascades;
  - `internal_error` with no exception text;
  - the p95 assertion (1,000 runs per type after a warm-up, p95 at most 5 ms).
- `tests/core/validate.bench.ts`: a Vitest bench over the fixture types' examples. Also `package.json` gains a `bench` script, `vitest.config.ts` gains `benchmark.include`, and `.github/workflows/ci.yml` gains a bench step.
- `tests/package/node-entry.test.ts`: `validate` from the built `./core` runs in plain Node.js with React blocked.

### How Acceptance Criteria Will Be Met

- `validate` exported and never throws: `validate-structure.test.ts` (forced exception becomes `internal_error`); `node-entry.test.ts`.
- Envelope criteria: `validate-envelope.test.ts`.
- Structure collects all five codes with JSON Pointer paths, nested ones included: `validate-structure.test.ts`.
- NaN, Infinity and numeric strings give `wrong_kind`: `validate-structure.test.ts`.
- Suggestion threshold: `validate-structure.test.ts`, plus `suggest` unit cases in the same file.
- `unknown_color` with the named colors: `validate-structure.test.ts`.
- Empty label accepted and dropped: `validate-structure.test.ts`.
- At least 5 seeded problems: `validate-structure.test.ts`.
- Node.js with no DOM and no React: lint, plus `node-entry.test.ts`.
- GSV-NFR-001 p95: the p95 assertion in `pnpm test`, and `pnpm bench` in the Verification Run and CI.
- Decisions to record:
  - DEL-001: the supported types are the registered ones.
  - DEL-002: `undefined` counts as absent; `null` is a wrong kind.
  - DEL-003: unsafe text and invalid enum values are reported as `wrong_kind`.
  - DEL-004: `ObjectValue.ordered`.
  - DEL-005: the minimal normalized result.
  - DEL-006: the p95 assertion alongside the bench.
  - DEL-007: suggestions ignore case.

## Progress

- [x] `src/core/format.ts` (`findUnsafeTextChar`): done
- [x] `src/core/definitions/types.ts` (`ObjectValue.ordered`): done
- [x] `src/core/validate/suggest.ts`: done
- [x] `src/core/validate/envelope.ts`: done
- [x] `src/core/validate/structure.ts`: done
- [x] `src/core/validate/index.ts`: done
- [x] `src/core/index.ts`: done
- [x] `tests/fixtures/definitions/`: done
- [x] `tests/core/validate-envelope.test.ts`: done
- [x] `tests/core/validate-structure.test.ts`: done
- [x] `tests/core/validate.bench.ts`, `package.json`, `vitest.config.ts`, `.github/workflows/ci.yml`: done
- [x] `tests/package/node-entry.test.ts`: done

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/core/validate/index.ts`: `validate(input)` (exported from `./core`) and `validateWith(input, registry)`. Exceptions become one fixed `internal_error`.
- `src/core/validate/envelope.ts`: `checkEnvelope`, `isPlainObject`, `registeredTypes`, `SUPPORTED_VERSIONS`, `CURRENT_VERSION`, `Registry`.
- `src/core/validate/structure.ts`: `checkStructure`. It walks objects and array items, checking unknown and inapplicable keys, missing properties, kinds, ranges and `ordered` pairs. It returns the minimal normalized description and its provenance.
- `src/core/validate/suggest.ts`: `editDistance` (Damerau–Levenshtein, optimal string alignment) and `closestTerm`.
- `src/core/format.ts`: adds `findUnsafeTextChar`.
- `src/core/definitions/types.ts`: adds `ObjectValue.ordered`.
- `src/core/index.ts`: exports `validate`.
- `tests/fixtures/definitions/{axis,circle,number-line,xy-graph,index}.ts`: test-only definitions, `fixtureRegistry` and `fixtureExamples`.
- `tests/core/validate-envelope.test.ts`: 32 tests.
- `tests/core/validate-structure.test.ts`: 51 tests.
- `tests/core/validate.bench.ts`: the GSV-NFR-001 benchmark, which asserts p95 per type.
- `tests/core/definitions.test.ts`: now also checks the validator's fixtures and that `ordered` terms are number properties.
- `tests/package/node-entry.test.ts`: `validate` from the built `./core` runs in plain Node.js with React blocked.
- `package.json` (`bench` script), `vitest.config.ts` (`benchmark.include`), `.github/workflows/ci.yml` (step "Validation speed (GSV-NFR-001)").

## Verification Run

Node.js v24.1.0, pnpm 10.28.2, branch `ticket/gsv-003`.

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm lint` | 0 | no findings (after fixing one `no-regex-spaces` error in a new test) |
| `pnpm typecheck` | 0 | no errors |
| `pnpm test` | 0 | 11 files, 338 tests passed (validate-envelope 32, validate-structure 51, node-entry 3) |
| `pnpm bench` | 0 | 3 benchmarks passed; p99 latency: circle 0.0063 ms, number-line 0.0326 ms, xy-graph 0.0417 ms (limit 5 ms at p95) |
| `pnpm build` | 0 | all entries and declarations emitted |
| `pnpm check:dist` | 0 | no network APIs in built output |
| `pnpm size` | 0 | `./core` 5.86 kB of 25 kB (was 1.24 kB; it now carries the validator, the shared properties and the style) |
| `pnpm publint` | 0 | "All good!" |
| `pnpm attw` | 0 | no problems in the ESM-only profile |
| `pnpm check:deps` | 0 | 0 runtime dependencies |
| `pnpm check:changesets` | 0 | 0 changesets |

## Acceptance Criteria Verification

- [x] `validate` exported from `./core` and never throws; an exception becomes `internal_error`:
  - `node-entry.test.ts` "validates a description from ./core in plain Node.js";
  - `validate-structure.test.ts` "turns an exception inside the validator into one internal_error with a fixed message" (no `file:`, `node_modules`, stack frame or exception text);
  - "returns a result for hostile inputs" (a revoked Proxy, a Proxy that throws from `ownKeys`).
- [x] Non-object input gives exactly one `not_an_object`, and JSON text is not parsed: `validate-envelope.test.ts` "rejects %s with exactly one not_an_object issue" (10 inputs, including JSON text, `Date`, a class instance and a function).
- [x] Missing or unknown `type` gives `unknown_graph_type` listing the supported types, and nothing else runs: `validate-envelope.test.ts` "reports a missing type…" and "reports the unknown type %j…" (8 values, including `"toString"` and `"__proto__"`).
- [x] An unsupported `version` gives `unsupported_version` and nothing else runs; an absent `version` means current: `validate-envelope.test.ts` version tests (7 bad values; absent and explicit `undefined` accepted; `1` kept).
- [x] The structure stage collects `unknown_property`, `inapplicable_property`, `missing_property`, `wrong_kind` and `out_of_range`, with JSON Pointer paths including nested items: `validate-structure.test.ts`, the unknown, inapplicable, missing, kinds and ranges groups (for example `/points/1/size`, `/segments/0/from/y`, `/xAxis/max`).
- [x] NaN, Infinity and numeric strings give `wrong_kind` and are never coerced: `validate-structure.test.ts` "reports %s where a number is required" (9 values).
- [x] The suggestion threshold (at most 2, or a third of the term's length), with `allowed` listing the terms otherwise: `validate-structure.test.ts` "suggests the closest applicable term", "lists the applicable terms when nothing is close", and the suggestions group.
- [x] Unknown colors give `unknown_color` with the named colors: `validate-structure.test.ts` "reports an unknown color with the named colors".
- [x] An empty label is accepted and treated as no label: `validate-structure.test.ts` "treats an empty label as no label" (title, line label and point label dropped from the normalized description).
- [x] Many independent problems are all reported: `validate-structure.test.ts` "reports every independent problem, each with its own path" (10 seeded problems across 5 codes) and "does not cap the number of issues" (500).
- [x] `validate` runs in Node.js with no DOM and imports nothing from React: `pnpm lint` (the `src/core` boundary rules) and `node-entry.test.ts`.
- [x] GSV-NFR-001, p95 at most 5 ms per description: `pnpm bench` (`tests/core/validate.bench.ts`), which asserts p95 from the sorted latency samples for each fixture type. It runs as its own CI step. Measured on this machine: p99 at most 0.042 ms. The CI-runner measurement comes from the first pull-request run once the repository exists (CPSE TICKET-009).

## Decisions Made

### DEL-001: "Supported types" are the registered types

**Context:** `unknown_graph_type` must list the supported types, but no real type is registered yet.
**Decision:** A type is supported when it has a registered definition, and `allowed` lists the registered types in `GRAPH_TYPES` order. While the registry is empty (before any type ticket lands), `allowed` falls back to all of `GRAPH_TYPES`, so the message never says "use one of: none".
**Rationale:** A declared type with no definition cannot be validated, so reporting it as unknown is the truth. TICKET-006 makes the two sets equal.
**Ticket Impact:** None to the Output. Today, the public `validate` accepts no description.

### DEL-002: `undefined` counts as absent; `null` is a wrong kind

**Context:** The ticket says `null` is a wrong kind (the tool handler strips it). JavaScript callers often pass optional props as `undefined`.
**Decision:** A property whose value is `undefined` is treated as absent: it is never reported as unknown, and a required one is reported as missing. The same applies to `type` and `version`. `null` is checked like any other value.
**Rationale:** `undefined` disappears in JSON, so treating it as absent keeps a description and its serialized form equivalent (GSV-REQ-005).
**Ticket Impact:** None.

### DEL-003: Unsafe text and invalid enum values are reported as `wrong_kind`

**Context:** The Product Owner decided that plain text excludes control, separator and direction characters, and enums need a "not one of the values" report. No issue code covers either.
**Decision:** Both are reported as `wrong_kind`:
- unsafe text: `expected` = "plain text without control, line-break or text-direction characters";
- invalid enum value: `expected` = "one of: a, b, c".

The message shows the supplied value through `describeValue`, which escapes the offending characters.
**Rationale:** The value's kind is wrong (not plain text, not one of the values). Adding issue codes widens the public contract (GSV-REQ-034) for no gain to callers.
**Ticket Impact:** None. A dedicated code can still be added later; adding one is not a breaking change.

### DEL-004: `ObjectValue.ordered` for "minimum less than maximum"

**Context:** GSV-REQ-022 and NLC TICKET-001's Known Hazard put `min` ≥ `max` in the structure stage. A PropertySpec could not express a relation between two properties.
**Decision:** `ObjectValue` gains optional `ordered: [lower, upper][]`, checked only when both values passed their own checks. A failure gives `out_of_range` at the upper property, with `range: { min: <lower>, exclusiveMin: true }` and the message "xAxis.max must be a number greater than 5; got 5.". `definitions.test.ts` checks that the named terms are number properties. Top-level ordering is not supported: no type needs it, because axes are objects.
**Rationale:** It is declarative, so TICKET-005 can document it, and it stays within the one RES-001 adjustment window before the circle slice.
**Ticket Impact:** NLC TICKET-001's axis group declares `ordered: [["min", "max"]]`, as the fixture `tests/fixtures/definitions/axis.ts` shows.

### DEL-005: A minimal normalized result until TICKET-004

**Context:** A valid result needs a description and provenance; normalization and derivation belong to TICKET-004.
**Decision:** The valid result's description holds:
- `type`, and `version` if supplied;
- every known property that passed;
- empty presentation text (titles and labels) dropped;
- colors resolved to lowercase `#rrggbb`.

Provenance marks every kept leaf value (not containers) as `supplied`, by JSON Pointer. The copy is built only from vocabulary terms, so no description key is ever used to assign a property.
**Rationale:** Callers get a usable, JSON-clean result now, and validating that result again passes.
**Ticket Impact:** TICKET-004 adds derived values (marked `derived`) and the stage-3 and stage-4 stop rules. It should keep these normalization rules.

### DEL-006: The benchmark asserts p95 itself

**Context:** The plan had a Vitest bench that reports timings plus a separate p95 assertion in the unit tests, because older Vitest benches could not assert. Vitest 5 replaced the top-level `bench` export with a `bench` test-context fixture. Its results include sorted latency samples, and benchmarks must run in their own project, not in `vitest run`.
**Decision:**
- `tests/core/validate.bench.ts` uses `test(…, async ({ bench }) => …)`, computes p95 from the samples (or uses p99 when samples are absent) and asserts at most 5 ms.
- `pnpm bench` (`vitest bench --run`, `benchmark.include: tests/**/*.bench.ts`) runs it as its own CI step.
- The separate timing test was removed.
**Rationale:** One measurement, one assertion, in the place the ticket names.
**Ticket Impact:** Each type ticket adds its example to the bench. Recorded under Deviations.

### DEL-007: Suggestions ignore case

**Context:** AD-004 sets the distance threshold but not case.
**Decision:** Names and terms are compared lowercased, so `LineColor` suggests `lineColor` at distance 0. Ties go to the first term in definition order. A term is skipped when the length difference alone exceeds its threshold.
**Rationale:** A case slip is the most likely mistake from a person or a model. The length skip keeps hostile 100,000-character keys cheap (tested under 50 ms).
**Ticket Impact:** None. Short terms (`x`, `y`) match any name within 2 edits, as AD-004's rule says; for example, `xyz` suggests `x`.

## Deviations from Plan

- **Benchmark:** it asserts p95 itself and runs through `vitest bench` in its own CI step, instead of a reporting bench plus a separate p95 test (DEL-006). Vitest 5's benchmark API made the planned shape unworkable: the top-level `bench` export no longer exists.
- **`tests/core/definitions.test.ts`** was also changed, to hold the validator's fixtures to the definition rules and to check `ordered`. The plan's fixtures entry implied it, but the plan did not list the file.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| GSV-REQ-001 | `src/core/validate/envelope.ts`:checkEnvelope | `@spec GSV-REQ-001` |
| GSV-REQ-002 | `src/core/validate/envelope.ts`:checkEnvelope | `@spec GSV-REQ-002` |
| GSV-REQ-004 | `src/core/validate/index.ts`:validate | `@spec GSV-REQ-004` |
| GSV-REQ-005 | `src/core/validate/envelope.ts`:checkEnvelope; `src/core/validate/structure.ts`:checkValue | `@spec GSV-REQ-005` |
| GSV-REQ-006 | `src/core/validate/envelope.ts`:checkEnvelope | `@spec GSV-REQ-006` |
| GSV-REQ-016 | `src/core/validate/index.ts`:validate | `@spec GSV-REQ-016` |
| GSV-REQ-017 | `src/core/validate/index.ts`:validate; `src/core/validate/structure.ts`:checkMap, checkStructure | `@spec GSV-REQ-017` |
| GSV-REQ-018 | `src/core/validate/structure.ts`:checkMap, checkStructure | `@spec GSV-REQ-018` |
| GSV-REQ-019 | `src/core/validate/structure.ts`:checkMap, checkStructure | `@spec GSV-REQ-019` |
| GSV-REQ-020 | `src/core/validate/suggest.ts`:closestTerm; `src/core/validate/structure.ts`:checkMap | `@spec GSV-REQ-020` |
| GSV-REQ-021 | `src/core/validate/structure.ts`:checkValue, checkStructure | `@spec GSV-REQ-021` |
| GSV-REQ-022 | `src/core/validate/structure.ts`:checkValue, checkStructure | `@spec GSV-REQ-022` |
| GSV-REQ-024 | `src/core/validate/envelope.ts`:checkEnvelope | `@spec GSV-REQ-024` |
| GSV-REQ-025 | `src/core/validate/envelope.ts`:checkEnvelope | `@spec GSV-REQ-025` |
| GSV-REQ-026 | `src/core/validate/index.ts`:validate | `@spec GSV-REQ-026` |
| GSV-REQ-041 | `src/core/validate/structure.ts`:checkMap, checkStructure | `@spec GSV-REQ-041` |
| GSV-REQ-043 | `src/core/format.ts`:findUnsafeTextChar; `src/core/validate/structure.ts`:checkValue | `@spec GSV-REQ-043` (TICKET-001's requirement, extended by the Product Owner's plain-text decision) |
| GSV-NFR-001 | `tests/core/validate.bench.ts` (verification) | none in source; an NFR is verified, not implemented at one location |

## Notes

- **For TICKET-004:** use `checkStructure`'s issues to decide which values passed (AD-004: no derivation or domain checks on a property that failed). Keep DEL-005's normalization rules, and build derived values without assigning description keys (SEC-003 hazard).
- **For the type tickets:** add the type's example to `tests/core/validate.bench.ts` and to the real registry; `pnpm bench` then covers it. The fixtures in `tests/fixtures/definitions/` stay as test-only stand-ins.
- **For CPSE TICKET-007:** `validate` reports `null` as a wrong kind. Stripping `null` on optional properties belongs to the tool handler (AD-006), before calling `validate`.
- **Size:** `./core` grew from 1.24 kB to 5.86 kB. The budget is 25 kB, and the per-type entries also import `./core`'s validator.

## Post-Review Amendments

Resolution of `graph-library/graph-specification-and-vocabulary-ticket-003-code-review`, `-quality-review` and `-security-review`, 2026-10-06, decisions by the Product Owner. The reports overlapped, so the fixes are recorded once, by group.

- **graph-specification-and-vocabulary-ticket-003-code-review/CR-003; graph-specification-and-vocabulary-ticket-003-quality-review/QR-001 (the stage-2 output contract):**
  - `checkValue` returns an explicit `Outcome` (`passed`, `omitted` or `failed`), so the compiler makes every caller handle failure.
  - `StructureResult` gains `failed`, the JSON Pointers of every value that failed, the upper end of a reversed `ordered` pair included.
  - Failed values leave `description` and `provenance`. A failed list element stays as `null`, so later indices hold.
  - A new test pins `checkStructure`'s output for an input with issues.
  - **Correction to DEL-005 and the Notes:** TICKET-004 reads `failed`, not the issue paths. A Known Hazard on GSV TICKET-004 says so.
  - File: `src/core/validate/structure.ts`.
- **graph-specification-and-vocabulary-ticket-003-code-review/CR-001, CR-006; graph-specification-and-vocabulary-ticket-003-security-review/SEC-004; graph-specification-and-vocabulary-ticket-003-quality-review/QR-004 (values JSON cannot produce):**
  - The new `src/core/validate/json.ts` reads caller data only through own data-property descriptors, so no getter runs and each value is read once.
  - A getter, setter or hidden (non-enumerable) property is reported as `wrong_kind` ("plain JSON data"). At `type` or `version`, it stops the envelope stage.
  - Lists are read position by position (a hole plus an extra key now fails), after a cheap key-count check.
  - "Missing" is decided from the properties actually read.
  - `isPlainObject` accepts JSON objects from another realm and never throws. A revoked or throwing Proxy is `not_an_object` (whole input) or `wrong_kind` (a value), never `internal_error`.
  - Each hostile input has an exact-code test, plus a test with a cross-realm object made by `node:vm`.
  - **Correction to DEL-002:** an accessor or hidden property is "not plain JSON data", not "absent".
- **graph-specification-and-vocabulary-ticket-003-security-review/SEC-003; graph-specification-and-vocabulary-ticket-003-quality-review/QR-003:** the envelope returns the `version` it checked, and `checkStructure` takes it as an argument instead of reading the description again. The description, every nested normalized object and `provenance` are built on null prototypes. A test pollutes `Object.prototype.version` and `.lineColor`, then cleans up.
- **graph-specification-and-vocabulary-ticket-003-security-review/SEC-001 (Product Owner decision: limit the input, not the issues):**
  - `ArrayValue.maxItems` is required. A list over it gives one `too_large` issue, and its elements are not checked.
  - `DESCRIPTION_VALUE_LIMIT` (10,000 values, counting every property and list element, known or not) gives one `too_large` issue for the whole description.
  - New issue code `too_large`, with documentation and a message template. Adding a code is not a breaking change (GSV-REQ-034).
  - A test checks that 1 MB hostile descriptions are answered with one issue within 250 ms.
  - GSV-REQ-029 still holds: within the limits, every issue is returned.
  - Known Hazards on every type ticket (set curriculum-sized `maxItems`), GSV TICKET-005 (publish `maxItems`), and CPSE TICKET-003 and TICKET-008 (document the limits).
  - Files: `src/core/issues.ts`, `src/core/definitions/types.ts`, `src/core/validate/structure.ts`, the fixtures.
- **graph-specification-and-vocabulary-ticket-003-security-review/SEC-002 (Product Owner decision: plain text also excludes invisible characters):**
  - The policy now also rejects soft hyphen, the Arabic letter mark, the Mongolian vowel separator, zero-width space, direction marks, word joiners and invisible operators (U+2060–U+2065, U+206A–U+206F), the byte-order mark, the interlinear annotation marks, tag characters (U+E0000–U+E007F; the England, Scotland and Wales flags are therefore rejected), supplementary variation selectors and lone surrogates.
  - Zero-width joiner and non-joiner and the emoji variation selectors stay allowed.
  - `findUnsafeTextChar` and `cleanText` walk code points.
  - Messages (`src/core/issues.ts`) escape the same set, plus the joiners.
- **graph-specification-and-vocabulary-ticket-003-quality-review/QR-007:** the character ranges are defined once (`LINE_BREAKING`, `DIRECTION_CONTROLS`, `INVISIBLE_FORMAT`, `LONE_SURROGATE`) and shared by validation, `cleanText` and message escaping. A sweep test checks that `cleanText` neutralises every code point validation rejects.
- **graph-specification-and-vocabulary-ticket-003-code-review/CR-002:** Known Hazards on NLC TICKET-001 (`ordered` on the axis group) and DGP TICKET-001 (`ordered` on `valueScale`). `tests/core/definitions.test.ts` fails on an object with `min`/`max` or `minimum`/`maximum` and no matching `ordered`.
- **graph-specification-and-vocabulary-ticket-003-code-review/CR-005; graph-specification-and-vocabulary-ticket-003-quality-review/QR-002:**
  - `benchmark.retainSamples: true`, so the bench asserts a true p95.
  - It prints `GSV-NFR-001 <type>: p95 … ms over N runs` on every run, and `pnpm bench` uses the verbose reporter, so the CI log records the measurement.
  - **Correction to the Verification Run and the GSV-NFR-001 criterion:** the original delivery asserted p99, because samples were not kept. It now asserts p95: circle 0.0082 ms, number-line 0.0166 ms, xy-graph 0.0312 ms.
- **graph-specification-and-vocabulary-ticket-003-code-review/CR-004; graph-specification-and-vocabulary-ticket-003-quality-review/QR-006:** the empty-registry fallback is kept and commented. A Known Hazard on GSS TICKET-002 says to replace the "lists every declared type" test when the circle registers.
- **graph-specification-and-vocabulary-ticket-003-code-review/CR-007:** Known Hazards on NLC TICKET-002 (custom tick labels), GSS TICKET-002 (custom measurement label text) and DGP TICKET-001 (the value-unit label). Each states what `""` means for its own label terms.
- **graph-specification-and-vocabulary-ticket-003-quality-review/QR-009:** `inapplicable_property` now means the option applies nowhere in the graph type. A shared term that applies elsewhere in the type, such as `title` inside an axis or `label` on a segment's end, is `unknown_property` with the terms valid at that position.
- **graph-specification-and-vocabulary-ticket-003-quality-review/QR-005:** new tests for `exclusiveMax` (a `shadedFraction` fixture term), the boundaries of every unsafe-character range (TAB included), nested `allowed`, an `ordered` pair with one member absent, and an enum given a number.
- **graph-specification-and-vocabulary-ticket-003-quality-review/QR-008:**
  - `Registry` is declared beside `definitions` (`src/core/definitions/index.ts`).
  - `isPlainObject` moved to `src/core/validate/json.ts`.
  - `asTerms` moved to `src/core/issues.ts` and is used at every site; the bare casts are gone.

Re-verification after the amendments (Node.js v24.1.0, pnpm 10.28.2):

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm lint` | 0 | no findings |
| `pnpm typecheck` | 0 | no errors |
| `pnpm test` | 0 | 11 files, 407 tests passed (validate-structure 71, validate-envelope 32, format 79, issues 37, definitions 17) |
| `pnpm bench` | 0 | p95: circle 0.0082 ms, number-line 0.0166 ms, xy-graph 0.0312 ms (limit 5 ms) |
| `pnpm build` | 0 | all entries and declarations emitted |
| `pnpm check:dist` | 0 | no network APIs in built output |
| `pnpm size` | 0 | `./core` 6.61 kB of 25 kB |
| `pnpm publint` | 0 | "All good!" |
| `pnpm attw` | 0 | no problems in the ESM-only profile |
| `pnpm check:deps` | 0 | 0 runtime dependencies |
| `pnpm check:changesets` | 0 | 0 changesets |
