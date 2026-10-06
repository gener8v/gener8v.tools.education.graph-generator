# TICKET-002: Issue codes and validation result types — Code Review

## Summary

I reviewed the delivery of `graph-library/graph-specification-and-vocabulary/TICKET-002` (delivery commit `8e08f2a`, branch `ticket/gsv-002`) against the ticket, the Graph Specification & Vocabulary specification, `constraints/prd.md` and `technical-design/system-design.md`. All eight acceptance criteria are met, and every Verification Run command reproduces. All seven covered requirements carry `@spec` annotations that match the specification's `## @spec Coverage` table, and the gener8v lint reports 0 errors.

Two requirements are only partly met, for one shared reason: `IssueParams` feeds both the message text and the issue's structured fields.
- The `contradiction` message names the other properties by JSON Pointer, not by vocabulary term (GSV-REQ-031).
- Two templates read message-only numbers from `range` and `expected`, so those issue fields carry values that mean something else (GSV-REQ-032).

There are 4 findings: 0 Critical, 2 Issues, 2 Observations.

**Reviewer:** `code-reviewer` agent, fresh context (findings phase only, 2026-10-05)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/graph-specification-and-vocabulary-ticket-002-delivery.md`
**Files Reviewed:**
- `src/core/result.ts`
- `src/core/issues.ts`
- `src/core/index.ts`
- `tests/core/issues.test.ts`
- `eslint.config.js` (non-rendering boundary block, for prd/TC-005 only)
- `dist/core/index.d.ts` (emitted declarations, to confirm `IssueCode` is a literal union)

**Findings:** 4
**Critical:** 0 | **Issues:** 2 | **Observations:** 2

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| `IssueCode` is a string union containing the full initial set from the design (24 codes) | Yes | `src/core/issues.ts:9-36`: `ISSUE_CODES` is a frozen `as const` tuple and `IssueCode = (typeof ISSUE_CODES)[number]`. I compared it code by code with the ticket and the design's Data Model › IssueCode set: all 24 are present, in the same order, with no extras. `dist/core/index.d.ts` emits the literal tuple, so the union is not widened to `string`. `tests/core/issues.test.ts:15-46` pins the list with an inline snapshot |
| `issueDocs` documents every code; a test fails if any code lacks documentation | Yes | `src/core/issues.ts:40-67` is typed `Readonly<Record<IssueCode, string>>`, so a missing key is a compile error. `tests/core/issues.test.ts:54-59` asserts that the key set equals `ISSUE_CODES` and that every entry is longer than 20 characters. `:61-64` pins the ticket's Known Hazard wording: `invalid_json` is tool-only and `internal_error` is a package defect |
| `Issue` has `code`, `path` (JSON Pointer, RFC 6901), `message`, and optional `expected`, `range`, `conflicts`, `suggestion`, `allowed` | Yes | `src/core/result.ts:16-31`. `pnpm typecheck` exits 0. `Range` adds `exclusiveMax` and uses boolean flags (DEL-002). Two templates give `range` and `expected` a different meaning (CR-002) |
| `ValidationResult` is `{ valid: true, description, provenance }` or `{ valid: false, issues }` with `issues` non-empty | Yes | `src/core/result.ts:37` defines `Issues = [Issue, ...Issue[]]`. `:44-46` is the discriminated union. `invalidResult` (`:53-59`) throws on an empty list. Tests at `tests/core/issues.test.ts:174-197` cover the valid branch, every issue listed, and refusal of an empty list |
| Message templates name the property by its vocabulary term and state what would make the value acceptable | Yes | Every one of the 24 cases in `src/core/issues.ts:120-183` names `p.term` and states a fix. `tests/core/issues.test.ts:99-106` checks each code: the term is present, a fix word appears, and there is no `undefined` or `[object Object]`. `:108-112` asserts the ticket's exact example, "radius must be a number greater than 0; got -2.". Caveats: in `contradiction`, the other properties are named by pointer (CR-001). When a caller omits `expected` or `range`, the fallback text ("a different kind of value", "a valid value") states no fix, so callers must supply them |
| A result survives `JSON.parse(JSON.stringify(result))` unchanged | Yes | `createIssue` (`src/core/issues.ts:203-218`) leaves out empty optional fields and copies arrays. Tests: `tests/core/issues.test.ts:137-142` (no `undefined` values), `:152-157` (every code), `:159-164` (no shared arrays), `:166-171` (valid and invalid results). Non-finite range bounds are copied unchecked; no test supplies one (CR-003) |
| A snapshot test of the code list fails when a code is renamed or removed, with a breaking-change comment | Yes | `tests/core/issues.test.ts:15-46`. The comment at `:16-17` cites GSV-REQ-034 and CPSE-REQ-042. The inline snapshot fails under `vitest run` on any rename or removal (also on additions and reordering; the comment says an addition is not breaking) |
| JSON Pointer construction escapes `~` and `/` in keys per RFC 6901 | Yes | `src/core/issues.ts:188-196` replaces `~` with `~0` before replacing `/` with `~1`, the order RFC 6901 §3 requires. `tests/core/issues.test.ts:208-212` includes `"~/"` → `"/~0~1"`. `:204-206` checks that the whole-document pointer is `""` |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| GSV-REQ-027 | The result states whether the description is valid | `src/core/result.ts:44-46` (`ValidationResult`, `valid` discriminant), `:48-50` (`validResult`) | Yes |
| GSV-REQ-029 | An invalid result lists every issue with the path to the property | `src/core/result.ts:16-19` (`Issue.path`), `:37` (`Issues`), `:53-59` (`invalidResult`); `src/core/issues.ts:194-196` (`pointer`) | Yes. This ticket covers the type level; collecting every issue belongs to GSV TICKET-003/004 |
| GSV-REQ-030 | Each issue carries a code from a fixed, documented set | `src/core/issues.ts:9-36` (`ISSUE_CODES`, `IssueCode`), `:40-67` (`issueDocs`); `src/core/result.ts:17` (`Issue.code`) | Yes |
| GSV-REQ-031 | Each issue carries a plain-English message naming the property and the fix | `src/core/issues.ts:120-183` (`issueMessage`), `:204` (`createIssue`); `src/core/result.ts:20-21` | Partial. All 24 templates name the subject property by its vocabulary term. In `contradiction`, the other properties involved are named only by JSON Pointer, and the API gives the caller no way to supply their terms (CR-001) |
| GSV-REQ-032 | Each issue carries expected kind, allowed range, conflicting properties or suggested term where applicable | `src/core/result.ts:22-30`; `src/core/issues.ts:205-216` (`createIssue` copies the optional fields) | Partial. The fields exist and are copied. For `too_many_ticks`, `range` holds the tick limit instead of the property's allowed range. For `series_length_mismatch`, `expected` holds the category count instead of a value kind (CR-002) |
| GSV-REQ-033 | Results are plain JSON data | `src/core/issues.ts:203-218` (`createIssue`); `src/core/result.ts:48-59`; `tests/core/issues.test.ts:134-172` | Yes. Non-finite bounds are not guarded (CR-003) |
| GSV-REQ-034 | Issue codes are stable across non-major releases | `src/core/issues.ts:3-9` (frozen tuple and comment); `tests/core/issues.test.ts:15-46` (snapshot); the exhaustive `switch` at `src/core/issues.ts:123` and the `Record` keys of `issueDocs` also fail the build on a rename | Yes |

*The ticket carries no NFR. The `issueDocs` completeness test also serves the issue-code part of GSV-NFR-005, which GSV TICKET-006 owns; it is not assessed here.*

### Constraint Compliance

*The ticket lists "Constraints: None identified". The PRD-level constraints below apply to every file in `src/core`, so I checked them. There is no per-area constraints document (`constraints/graph-specification-and-vocabulary.md` does not exist).*

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/TC-005 | Validation code must not load React DOM or browser globals | Yes | `src/core/issues.ts` and `src/core/result.ts` import only each other (`import type`). `pnpm lint` exits 0 with the `src/core` boundary block in `eslint.config.js` active |
| prd/TC-007 | ES module output with side-effect-free modules | Yes | At module level, the files only freeze their own literals. The package keeps `sideEffects: false` and ESM output (`pnpm build`) |
| prd/TC-008 | Hand-written or library definition counts against zero dependencies and the budget | Yes | Hand-written, with 0 runtime dependencies (`pnpm check:deps`). `./core` is 2.61 kB minified and gzipped, against a 25 kB budget (`pnpm size`) |
| prd/CC-003 | The package collects, transmits and stores nothing | Yes | No network API is used. `pnpm check:dist` and the lint no-network rules pass |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-001 | Separate non-rendering `./core` entry; no React | Yes | Exported from `src/core/index.ts:4-16` and built to `dist/core/index.js`; no React import. The entry also exports internal helpers (CR-004) |
| AD-003 | In-house definition format; custom codes, paths, messages and suggestions with no runtime dependency | Yes | Codes, messages, pointer paths and the `suggestion` and `allowed` fields are all hand-written in `src/core/issues.ts`, with no schema library |
| AD-004 | Result is `{ valid: true, description, provenance }` or `{ valid: false, issues }`; the envelope-stage codes exist | Yes | `src/core/result.ts:44-46` matches the shape exactly. `not_an_object`, `unknown_graph_type` and `unsupported_version` are in the set |
| AD-005 | Issue paths are RFC 6901 JSON Pointers, e.g. `/points/2/x` | Yes | `src/core/issues.ts:188-196`. `tests/core/issues.test.ts:200-202` asserts `pointer("points", 2, "x")` → `"/points/2/x"` |
| AD-015 | `invalid_json` (tool handler only) and `internal_error` (defect) are in the set and documented as such | Yes | `src/core/issues.ts:63-66` (docs) and `:178-181` (messages). The `internal_error` message says "The description itself may be valid." |
| AD-016 | Toolchain: Vitest, size-limit, ESLint boundary rules | Yes | Vitest inline snapshot, size-limit budget and lint all run in the Verification Run |
| Data Model › ValidationResult and Issue | Issue fields and their meaning; `range` as `{ min?, max?, exclusiveMin? }`; `conflicts` as JSON Pointers | Partial | Every field is present. `Range` adds `exclusiveMax` with boolean flags (DEL-002, reasonable). `expected` and `range` change meaning for two codes (CR-002). `conflicts` pointers are also the only names the contradiction message can use (CR-001) |
| Data Model › IssueCode set | The 24 initial codes | Yes | They match exactly (see the first acceptance criterion) |
| Data Model › NormalizedDescription and Provenance | Provenance maps each JSON Pointer to `"supplied"` or `"derived"`, kept beside the description | Yes | `src/core/result.ts:34`; the valid branch carries `provenance` as a sibling of `description` |
| Interface Contracts › Validation API | Output has non-empty `issues` and is plain JSON; `validate` never throws | Yes | Non-emptiness is enforced by type and at runtime. `invalidResult([])` throws to guard against programmer error. GSV TICKET-003's first acceptance criterion already requires `validate` to turn any exception into `internal_error`, so this is not a finding |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| GSV-REQ-027 | `@spec GSV-REQ-027` | `src/core/result.ts:ValidationResult` (line 43) | Yes |
| GSV-REQ-029 | `@spec GSV-REQ-029` | `src/core/result.ts:Issue` (line 15), `src/core/result.ts:ValidationResult` (line 43), `src/core/issues.ts:pointer` (line 193), `src/core/issues.ts:createIssue` (line 202) | Yes |
| GSV-REQ-030 | `@spec GSV-REQ-030` | `src/core/result.ts:Issue` (line 15), `src/core/issues.ts:ISSUE_CODES` (line 8), `src/core/issues.ts:issueDocs` (line 39) | Yes |
| GSV-REQ-031 | `@spec GSV-REQ-031` | `src/core/result.ts:Issue` (line 15), `src/core/issues.ts:issueMessage` (line 119), `src/core/issues.ts:createIssue` (line 202) | Yes |
| GSV-REQ-032 | `@spec GSV-REQ-032` | `src/core/result.ts:Issue` (line 15), `src/core/issues.ts:createIssue` (line 202) | Yes |
| GSV-REQ-033 | `@spec GSV-REQ-033` | `src/core/result.ts:Issue` (line 15), `src/core/result.ts:ValidationResult` (line 43), `src/core/issues.ts:createIssue` (line 202) | Yes |
| GSV-REQ-034 | `@spec GSV-REQ-034` | `src/core/issues.ts:ISSUE_CODES` (line 8) | Yes |

**Coverage:** 7 of 7 requirements annotated. Each annotation sits on the line directly above its declaration.
**Missing:** None
**Specification table:** Yes. `## @spec Coverage` in `.gener8v/specifications/graph-specification-and-vocabulary.md` lists exactly these locations. `gener8v-state.py lint` reports 0 errors and 0 warnings.

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm lint` | 0 | Yes |
| `pnpm typecheck` | 0 | Yes |
| `pnpm test` | 0 | Yes. 5 files, 153 tests; `tests/core/issues.test.ts` holds 43 tests (confirmed with a verbose run) |
| `pnpm build` | 0 | Yes. `dist/core/index.js` and `dist/core/index.d.ts` are emitted |
| `pnpm check:dist` | 0 | Yes. 4 built files scanned, no network APIs |
| `pnpm size` | 0 | Yes. `./core` is 2.61 kB against 25 kB |
| `pnpm publint` | 0 | Yes. "All good!" |
| `pnpm attw` | 0 | Yes. ESM-only profile, no problems |
| `pnpm check:deps` | 0 | Yes. 0 runtime dependencies |
| `pnpm check:changesets` | 0 | Yes. 0 changesets |

*Run in the repository's working tree on `ticket/gsv-002` at `8e08f2a`, with Node.js v24.1.0 and pnpm 10.28.2. `src/` and `tests/` are identical to the commit. The runs left no tracked file changed. Only `.gener8v/runs.jsonl`, which the hooks maintain, was modified, and it was modified before the review started.*

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | Making `ValidationResult<D = unknown>` generic fixes the result shape now without inventing a `NormalizedDescription` that GSV TICKET-004 would have to replace. The design's `validate(input) → ValidationResult` is satisfied once the validator instantiates `D` |
| DEL-002 | Reasonable | The design gives `range` as `{ min?, max?, exclusiveMin? }` and `PropertySpec` as `min?/max?/exclusiveMin?`, which reads naturally as a flag. `exclusiveMax` is the symmetric addition. GSV TICKET-005 must translate the flags to JSON Schema 2020-12's numeric `exclusiveMinimum`/`exclusiveMaximum`; the decision records this as Ticket Impact |
| DEL-003 | Questionable | A single constructor is sound: every issue comes out JSON-clean and every message has the same voice. But `IssueParams` serves both the message and the issue fields. So message-only inputs leak into fields (CR-002), and display names cannot be kept apart from pointer data (CR-001). The third bullet of the record's Notes asks downstream tickets for something this API cannot do |

**Deviations:** The record states "None". The extra helper exports it mentions widen the public entry (CR-004). One pre-flight row says the predecessor CPSE TICKET-001 reviews had "no report written yet". However, the delivery commit's parent `07da041` already contains those reviews, resolved, and none of them defers a finding to this ticket. That has no impact on this delivery.

## Findings

### CR-001: Contradiction messages name the other properties by JSON Pointer, and `IssueParams` cannot carry their vocabulary terms

**Severity:** Issue
**Location:** `src/core/issues.ts:144-151` (`issueMessage`, `contradiction` case); `src/core/issues.ts:80-81` (`IssueParams.conflicts`); `src/core/issues.ts:214` (`createIssue`); `tests/core/issues.test.ts:114-118`
**Traces To:** GSV-REQ-031; GSV Behaviors & Rules › Derived Values and Tolerance ("When values disagree, the issue should name every property involved and state the value that would agree"); system design Data Model › ValidationResult and Issue (`conflicts` (JSON Pointers)); the third bullet of the delivery record's Notes
**Description:** A single input, `params.conflicts`, feeds both the message text (`list(p.conflicts)`) and the issue's `conflicts` field. The design requires that field to hold JSON Pointers, so the message names every property except the subject by pointer: "diameter (12) disagrees with /radius; a value of 10 would agree, or remove one of them." The test pins this wording. For nested values, two path notations end up in one sentence. A probe produced "xAxis.max (5) disagrees with /xAxis/min; change one of them so they agree, or remove all but one." The delivery record's Notes tell GSV TICKET-003/004 that "the validator may pass vocabulary terms in `conflicts` for display, but the `conflicts` field itself must hold pointers". The API cannot do both: whatever is passed in `params.conflicts` becomes the field.
**Impact:** GSV TICKET-004 (contradictions naming every member), GSS TICKET-004 (triangle inequality naming the three sides) and GSS TICKET-007 (cylinder radius and diameter) each have to choose. Either they break the Data Model by putting terms in `conflicts`, or they ship messages that name properties by pointer instead of vocabulary term. Different tickets may choose differently, so contradiction messages would read inconsistently across graph types.
**Recommendation:** Add a message-only input to `IssueParams`, such as `conflictTerms?: readonly string[]`. The message uses it and falls back to `conflicts`; `createIssue` never copies it. Keep `conflicts` as pointers for the field. Update the contradiction test to expect "diameter (12) disagrees with radius; …", and correct the delivery record's Notes bullet to name the new parameter.
**Status:** Resolved
**Resolution:** Approved. `contradiction` takes `conflicts` (pointers, copied to the issue) and `conflictTerms` (vocabulary terms, message only). The message now reads "diameter (12) disagrees with radius; …". The delivery record's Notes bullet is corrected in Post-Review Amendments.

---

### CR-002: `too_many_ticks` and `series_length_mismatch` put message-only numbers into the issue's `range` and `expected` fields

**Severity:** Issue
**Location:** `src/core/issues.ts:158-159` (`too_many_ticks`); `src/core/issues.ts:172-173` (`series_length_mismatch`); `src/core/issues.ts:205-213` (`createIssue` copies `expected` and `range`); `tests/core/issues.test.ts:81`, `tests/core/issues.test.ts:88` (samples)
**Traces To:** GSV-REQ-032 ("the expected value kind, the allowed range"); the field documentation at `src/core/result.ts:22-24`; system design Data Model › ValidationResult and Issue (`expected` (value kind), `range`); DEL-003; downstream `graph-library/number-lines-and-coordinate-graphs/TICKET-001`, which requires that "the issue states the 100-tick limit and suggests a spacing that fits"
**Description:** The `too_many_ticks` template reads the tick-count limit from `p.range.max`. The `series_length_mismatch` template reads the category count from `p.expected`. `createIssue` copies both values into the issue. With the test file's own samples this produces:
- `{ "path": "/xAxis/tickSpacing", "range": { "max": 100 } }`. Read as an allowed range, this says `tickSpacing` must be at most 100, which is the opposite of the message's fix, "use a larger tick spacing".
- `{ "path": "/series/1/values", "expected": "5" }`, where `expected` is documented as a value kind such as "a number".

The `too_many_ticks` template also has no input for the spacing that would fit, which NLC TICKET-001 requires.
**Impact:** A model or caller that reads the structured fields gets misleading data for these two codes, and structured fields are the point of GSV-REQ-032. NLC TICKET-001 and DGP TICKET-003 (`series_length_mismatch`) will either copy the sample parameters, so the misleading fields ship, or rework the templates without guidance.
**Recommendation:** Give message-only values their own `IssueParams` fields that `createIssue` does not copy, for example `limit?: number` and `count?: number`, or reuse `detail`. Add an input to `too_many_ticks` for the spacing that would fit, either by reusing `agreeingValue` or with a new field. Update `SAMPLES` and add assertions that these two issues carry no `range` or `expected`. Alternatively, defer to `graph-library/number-lines-and-coordinate-graphs/TICKET-001` and `graph-library/data-graphs-and-pictographs/TICKET-003`, with a Known Hazard on each.
**Status:** Resolved
**Resolution:** Approved, together with QR-001. Inputs are typed per code (`IssueParamsByCode`). `too_many_ticks` takes `tickCount`, `maxTicks` and `fittingSpacing`; `series_length_mismatch` takes `valueCount` and `categoryCount`. None of these is copied into the issue, and tests pin both full issues with no `range` or `expected`.

---

### CR-003: `createIssue` copies non-finite range bounds and empty ranges

**Severity:** Observation
**Location:** `src/core/issues.ts:206-213`
**Traces To:** TICKET-002 acceptance criterion "A result survives `JSON.parse(JSON.stringify(result))` unchanged (no functions, class instances, `undefined` values or non-finite numbers)"; GSV-REQ-033; DEL-003 ("keeps every issue JSON-clean")
**Description:** A bound is copied whenever it is not `undefined`; nothing checks that it is finite. A probe:
- `createIssue("out_of_range", "/x", { term: "x", got: 5, range: { min: 0, max: Infinity } })` returns an issue with `range.max === Infinity`.
- After a JSON round-trip, `range.max` is `null`.
- The message reads "x must be a number between 0 and Infinity; got 5."

Passing `range: {}` produces an empty `range` object. No current caller does either: the design's `PropertySpec` leaves an open side out rather than setting it to infinity. No test covers these cases.
**Impact:** The constructor's JSON-clean guarantee holds only as long as callers behave. A type ticket that writes `max: Infinity` to mean "no upper limit" would produce issues that change when serialized, for example in tool results (CPSE-REQ-033).
**Recommendation:** Copy a bound only when `Number.isFinite` holds for it. Omit `range` when no bound remains. Add a test with an infinite bound.
**Status:** Resolved
**Resolution:** Approved. `normalizeRange` keeps only finite bounds and the flags whose bound remains, and `range` is omitted when nothing remains. Tests use `max: Infinity`, `min: NaN` and a range with only a flag.

---

### CR-004: `./core` publishes the internal issue helpers

**Severity:** Observation
**Location:** `src/core/index.ts:4-16`
**Traces To:** AD-001 (`./core` — `validate`, `normalize`, `getSchema`, `getVocabulary`, `describe`); CPSE-REQ-042 (the public contract under semantic versioning); the delivery record's Deviations ("exported for the validator stages")
**Description:** Besides the codes, documentation and result types that consumers need, the package entry now exports these helpers: `createIssue`, `issueMessage`, `pointer`, `escapePointerToken`, `describeValue`, `describeRange`, `validResult`, `invalidResult`, and the `IssueParams` type. The record says the helpers are exported for the validator stages. Those stages live in `src/core/validate/` (GSV TICKET-003 Output) and can import `../issues` directly, as `src/core/definitions/*` (NLC TICKET-001) and `src/tool` will. None of them needs the package entry.
**Impact:** Outside consumers can now depend on message wording and helper signatures. CR-001 and CR-002 would both change `IssueParams`, and RES-008 adds codes and templates over time. From `1.0.0` onward, each such change becomes a possible break for outside callers.
**Recommendation:** Export only the contract from `src/core/index.ts`: `ISSUE_CODES`, `IssueCode`, `issueDocs`, `Issue`, `Issues`, `Range`, `Provenance`, `ValidationResult`. Internal modules import the helpers by path. If outside use is intended, record it as a DEL.
**Status:** Resolved
**Resolution:** Approved. `./core` exports only `ISSUE_CODES`, `isIssueCode`, `issueDocs` and the contract types. Helpers are imported by path.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Approved | `conflictTerms` input for messages; `conflicts` stays pointers | `src/core/issues.ts`, `tests/core/issues.test.ts` |
| CR-002 | Approved | Inputs typed per code; message-only numbers have their own names and are never copied | `src/core/issues.ts`, `tests/core/issues.test.ts` |
| CR-003 | Approved | `normalizeRange`: finite bounds only, flags only with their bound, `range` omitted when empty | `src/core/issues.ts`, `tests/core/issues.test.ts` |
| CR-004 | Approved | `./core` exports narrowed to the contract | `src/core/index.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0
**Notes:** Resolved with the Product Owner on 2026-10-05. All four findings were fixed and re-verified: lint, typecheck, 146 tests, build, `check:dist`, size, publint, attw, `check:deps` and `check:changesets` all exit 0 (see the delivery record's Post-Review Amendments). GSV-REQ-031 and GSV-REQ-032 are now fully covered, and the `@spec` Coverage table lists the new locations (`IssueParamsByCode`, `templates`, `isIssueCode`).
