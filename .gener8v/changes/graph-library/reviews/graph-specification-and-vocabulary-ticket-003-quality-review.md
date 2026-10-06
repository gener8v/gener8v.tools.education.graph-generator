# TICKET-003: Validator — envelope and structure stages with term suggestions — Quality Review

## Summary

This review covers the files delivered for graph-library/graph-specification-and-vocabulary/TICKET-003 (branch `ticket/gsv-003`, delivery commit `450c9f7`). The `quality-reviewer` agent ran the findings phase in a fresh context.

The validator is small, well split by stage and carefully defended:
- it never throws;
- it uses `Object.hasOwn` lookups;
- recursion follows the definition, not the input;
- the hostile-input cases are tested.

Every verify and CI command passes when re-run, and validating one description takes about 0.02 ms, against a 5 ms budget.

The two Concerns are about what comes next, not about what `validate` returns today:
- **QR-001:** the structure stage's output does not reliably say which values passed. TICKET-004 is told to build stages 3 and 4 on exactly that.
- **QR-002:** the GSV-NFR-001 benchmark never prints the p95 it measures, so the promised measurement on a CI runner will not appear in any log.

The seven Suggestions cover:
- one inconsistent prototype-chain read;
- weak or missing test assertions;
- a transitional test that the first type ticket will break;
- duplicated code-point tables;
- where shared helpers live;
- one misleading issue message.

9 findings: 0 Critical, 2 Concerns, 7 Suggestions. The verdict below is provisional until resolution with the user.

**Files Reviewed:**
- `src/core/validate/index.ts`
- `src/core/validate/envelope.ts`
- `src/core/validate/structure.ts`
- `src/core/validate/suggest.ts`
- `src/core/format.ts` (`findUnsafeTextChar`)
- `src/core/definitions/types.ts` (`ObjectValue.ordered`)
- `src/core/index.ts`
- `tests/fixtures/definitions/axis.ts`
- `tests/fixtures/definitions/circle.ts`
- `tests/fixtures/definitions/number-line.ts`
- `tests/fixtures/definitions/xy-graph.ts`
- `tests/fixtures/definitions/index.ts`
- `tests/core/validate-envelope.test.ts`
- `tests/core/validate-structure.test.ts`
- `tests/core/validate.bench.ts`
- `tests/core/definitions.test.ts`
- `tests/package/node-entry.test.ts`
- `package.json`, `vitest.config.ts`, `.github/workflows/ci.yml`

**Neighbours read for patterns and context:**
- source: `src/core/issues.ts`, `src/core/result.ts`, `src/core/style.ts`, `src/core/definitions/index.ts`, `src/core/definitions/shared.ts`
- tests and setup: `tests/fixtures/plain-text.ts`, `tests/setup/build.ts`
- config: `eslint.config.js`, `tsconfig.json`
- tickets: TICKET-003 and TICKET-004 under `.gener8v/changes/graph-library/tickets/graph-specification-and-vocabulary/`
- design: AD-004 in `.gener8v/technical-design/system-design.md`
- calibration: the GSV TICKET-002 quality review in this change

**Findings:** 9
**Critical:** 0 | **Concerns:** 2 | **Suggestions:** 7

## Quality Assessment

### Code Organization

**Rating:** Adequate
**Notes:** The files follow AD-004's stages:
- `src/core/validate/envelope.ts` is stage 1;
- `src/core/validate/structure.ts` is stage 2;
- `src/core/validate/suggest.ts` is the distance and suggestion logic;
- `src/core/validate/index.ts` is the pipeline and the never-throw boundary.

TICKET-004's `derive.ts` and `domain.ts` slot in beside them without restructuring. Dependency direction is clean: `src/core/validate/*` imports from `src/core/definitions`, `src/core/issues.ts`, `src/core/result.ts`, `src/core/style.ts` and `src/core/format.ts`, and nothing imports back. `pnpm lint` confirms the `src/core` React and browser boundary. The test fixtures are split one type per file, with a shared `axis` helper, and `tests/core/definitions.test.ts` now holds them to the definition rules, which is a good touch.

There are two weak points:
- **The hand-off from stage 2 to stages 3 and 4.** `StructureResult` documents `description` as "the known properties that passed", but it holds failure markers and values that failed (QR-001).
- **Cross-stage helpers live in a stage module.** `Registry` and `isPlainObject` are in `src/core/validate/envelope.ts`, and `asTerms` is private to `src/core/validate/structure.ts` while three bare casts sit beside it (QR-008).

### Readability

**Rating:** Strong
**Notes:** Names say what things are (`checkEnvelope`, `checkMap`, `closestTerm`, `registeredTypes`, `Place`, `Walk`), and the comments explain why rather than what:
- "Comparing the key count avoids walking the holes of a huge sparse array"
- "An explicit undefined disappears in JSON, so it counts as absent"
- "The distance is at least the difference in length"

`checkValue` (`src/core/validate/structure.ts:72-143`) is the longest function at about 70 lines, but it is an eight-way `switch` whose cases are each a few lines long, so it reads top to bottom. The `child`/`item` helpers keep JSON Pointer and readable-term construction in one place.

Nits, not raised as findings:
- `type Checked = unknown` (`src/core/validate/structure.ts:15`) adds no type information; it matters in QR-001.
- `checkValue` takes a positional boolean `presentation`.
- `tests/fixtures/definitions/index.ts:15` still says the examples are used by "the timing test", which DEL-006 removed.
- The edited header comment in `src/core/index.ts:1-5` now wraps unevenly.

The one readability problem in the output (the messages callers read) is QR-009.

### Error Handling

**Rating:** Adequate
**Notes:** The never-throw contract holds:
- `validateWith` wraps both stages and turns any exception into the fixed `internal_error` issue, with no exception text (tested, including a stack containing `file:` and `node_modules`).
- `invalidResult` still guards the empty-issue case.
- `asTerms` fails loudly on a property map with no terms, which is a definition defect and correctly becomes `internal_error`.
- Description keys are read only through `Object.hasOwn` or `propertySpec`, and inherited names such as `__proto__`, `constructor` and `toString` are reported as unknown properties (tested with a `JSON.parse`d `__proto__`).

The gaps:
- Failed values leak into the structure result (QR-001).
- `checkStructure` reads `version` through the prototype chain, unlike the envelope (QR-003).
- A revoked Proxy as the whole input is reported as a package defect (`internal_error`), and the test that covers it cannot tell this apart from a graceful issue (QR-004).

The catch-all also hides validator bugs from tests that assert only `valid: false`, which is why QR-004 asks for exact codes.

### Test Coverage

**Rating:** Strong
**Notes:** I ran the context.md verify commands (`## Repositories`, row `.`) plus the rest of the delivery record's Verification Run. Environment: Node.js v24.1.0, pnpm 10.28.2, branch `ticket/gsv-003` at `450c9f7`.

| Command | Exit | Result |
|---------|------|--------|
| `pnpm lint` | 0 | no findings |
| `pnpm typecheck` | 0 | no errors |
| `pnpm test` | 0 | 11 files, 338 tests passed; global setup ran `tsup` |
| `pnpm bench` | 0 | "Test Files 1 passed (1) / Tests 3 passed (3)"; no timings printed (QR-002); global setup ran `tsup` twice |
| `pnpm build` | 0 | all four entries and declarations emitted; `dist/core/index.js` 26.11 KB unminified |
| `pnpm check:dist` | 0 | "Built files scanned: 4, no network APIs or network modules." |
| `pnpm size` | 0 | `./core` 5.86 kB minified and gzipped (limit 25 kB) |
| `pnpm publint` | 0 | "All good!" |
| `pnpm attw` | 0 | all green |
| `pnpm check:deps` | 0 | "Runtime dependencies: 0, all justified." |
| `pnpm check:changesets` | 0 | "Changesets checked: 0." |

`GRAPH_GENERATOR_PREBUILT=1 vitest bench --run --reporter=verbose` printed the timing table. p99 was 0.0067 ms for circle, 0.0154 ms for number-line and 0.0505 ms for xy-graph (12,539 to 61,478 samples). After all the runs, `git status` showed only the hook-managed `.gener8v/runs.jsonl`, which was already modified before the runs. No coverage provider is installed, so coverage was assessed by reading the tests against the code. Behaviours quoted below come from scratchpad probe scripts that import the source read-only.

Every acceptance criterion has a behavioural test that asserts exact codes, paths and often full messages:
- NaN, ±Infinity, numeric strings, `null`, big integers;
- class instances, sparse arrays and arrays with extra properties;
- a 1e9-length sparse array;
- `__proto__`/`constructor`/`toString` keys;
- hostile keys in messages;
- empty labels dropped;
- 10 seeded independent problems across 5 codes, and 500 issues with no cap;
- the fixed `internal_error`;
- `editDistance`/`closestTerm` unit cases, including ties and the length skip.

Test names describe behaviour, and tests are grouped by requirement.

The two wall-clock assertions in `pnpm test` (`tests/core/validate-structure.test.ts:151-155` and `:346-350`) have roughly 100× headroom: the probe measured a median of 0.03 ms against 100 ms, and 0.02 ms against 50 ms. Their flake risk is low and they are not raised.

Weaknesses:
- The structure stage's output is never asserted when issues exist, which is how QR-001 went unnoticed.
- The hostile-input test asserts only `valid: false` (QR-004).
- Several branches and boundaries are unexercised (QR-005).
- One test pins transitional behaviour that the first type ticket will break (QR-006).

### Observability & Operability

**Rating:** Adequate
**Notes:** This is pure library code, and the package forbids telemetry (CPSE-REQ-005), so having no logging or metrics is correct. The operator-facing surface is the issue list, and it is good:
- every issue has a stable code, a JSON Pointer and a message with a fix;
- `internal_error` is fixed text that says the defect is the package's and asks for a report. Because validation is pure and deterministic, the reported description is enough to reproduce it.

The operability gap is in the delivery's own verification signal. The GSV-NFR-001 bench, which is a CI step, prints nothing on success: no p95, no headroom and no trend. The CI-runner measurement that the delivery record expects from the first pull-request run will not exist in that run's log (QR-002).

## Findings

### QR-001: The structure result's `description` holds failure markers and failed values, but is documented as "the known properties that passed"

**Category:** Maintainability
**Severity:** Concern
**Location:** `src/core/validate/structure.ts:15` (`type Checked = unknown`), `src/core/validate/structure.ts:19-22` (`StructureResult` documentation), `src/core/validate/structure.ts:118-131` (`ordered` failure keeps the value), `src/core/validate/structure.ts:136-140` (array case pushes every element's result), `src/core/validate/index.ts:17-19`
**Description:** `checkValue` returns either a normalized value or one of two sentinel symbols, `FAILED` and `OMITTED`, and the return type is `unknown`. `checkMap` filters the sentinels before assigning, but the array case pushes every element's result unfiltered. The `ordered` check reports `out_of_range` on the upper value and then leaves that value in the normalized object and in `provenance`. A probe calling `checkStructure` directly showed both:

| Input | `checkStructure(...).description` | `provenance` |
|-------|-----------------------------------|--------------|
| number-line, `points: [5, { value: 1 }, "x"]` | `points: [Symbol(failed), { value: 1 }, Symbol(failed)]` | — |
| xy-graph, `xAxis: { min: 5, max: 5 }` | `xAxis: { min: 5, max: 5 }` (issue `out_of_range /xAxis/max`) | `/xAxis/max: "supplied"` |

A container whose member failed is kept as a partial object: `xAxis: { min: "5", max: 5 }` becomes `xAxis: { max: 5 }`, with the required `min` missing. Today this is invisible, because `validateWith` discards the description whenever there are issues, and no test asserts `checkStructure`'s output when issues exist.
**Impact:** TICKET-004 builds directly on this output:
- Its first acceptance criterion runs stages 3 and 4 "only on … members that passed stage 2". Under AD-004 those stages run alongside stage-2 issues, not only on clean descriptions.
- Its Prior Art names `src/core/validate/structure.ts` as the source of "which properties passed structure".
- This delivery's Notes say to work that out from `checkStructure`'s issues, which means prefix-matching JSON Pointers back onto the description.

A domain check that reads `description.points` will meet `Symbol(failed)` elements: reading `.x` gives `undefined`, so comparisons become NaN or the check throws, and `internal_error` then hides every real issue. An axis with `max ≤ min` left in the description will feed range checks such as `outside_axis_range` and produce exactly the cascades AD-004 forbids. Because the sentinel travels as `unknown`, the compiler cannot catch either path, now or when TICKET-004 adds new consumers.
**Recommendation:** Settle the stage-2 output contract before TICKET-004 builds on it:
- Give `checkValue` a discriminated return, such as `{ ok: true; value: unknown } | { ok: false } | { ok: true; omitted: true }`, so the compiler forces every caller, including the array case, to handle failure.
- Record every value that fails its own check on the `Walk` (for example `failed: Set<string>` of JSON Pointers), with `ordered` failures included, and expose it on `StructureResult`. TICKET-004 can then ask `failed.has(pointer)` and skip anything at or below a failed pointer.
- Keep `FAILED` out of the exported `description`. A failed array element must keep its index for later issue paths, so leave a hole or `undefined` there, and document that.
- On an `ordered` failure, remove the upper value from `description` and `provenance`, as for any other failure.
- Add a test of `checkStructure`'s `description`, `provenance` and failed set for an input that has issues.
**Status:** Resolved
**Resolution:** Approved. A discriminated `Outcome`, a `failed` set on `StructureResult`, failed values out of `description` and `provenance` (failed list elements `null`), the `ordered` upper end removed, and a test of the output with issues.

---

### QR-002: The GSV-NFR-001 benchmark never prints the p95 it measures, so CI produces no record of the measurement

**Category:** Observability
**Severity:** Concern
**Location:** `tests/core/validate.bench.ts:14-20`, `package.json:67` (`"bench": "vitest bench --run"`), `.github/workflows/ci.yml:75-78`
**Description:** The bench computes p95 from the sorted samples and puts it only in the assertion message (`` `${example.type}: p95 ${p95.toFixed(4)} ms …` ``), which is shown only when the assertion fails.

`pnpm bench` uses the default reporter, which printed only "Test Files 1 passed (1) / Tests 3 passed (3)" in this review's run. With `--reporter=verbose`, Vitest prints its own table (hz, min, max, mean, p75, p99, p995, p999), but still not the p95 the assertion uses.

The delivery record's acceptance criteria verification says: "The CI-runner measurement comes from the first pull-request run once the repository exists (CPSE TICKET-009)". With the current script that run's log will hold a pass, not a measurement. The p99 figures quoted in the delivery's Verification Run did not come from `pnpm bench` as configured.
**Impact:** GSV-NFR-001 is defined as a measurement "on a CI runner", and this is its only verification. Without a printed figure:
- nobody can see the headroom, which is about 100× today;
- nobody can see a trend as type tickets add heavier definitions and the triangle's domain checks;
- nobody can confirm that the CI runner's numbers resemble the local ones.

A regression from 0.05 ms to 4.9 ms passes silently, and the first sign of trouble is a red build.
**Recommendation:**
- Print the computed p95 per type on every run, for example `console.log(`${example.type}: p95 ${p95.toFixed(4)} ms over ${result.latency.samplesCount} runs`)` before the `expect`, or the test context's annotation API if the installed Vitest offers one.
- Add `--reporter=verbose` to the `bench` script so Vitest's own table appears in the CI log.
- Optionally, write `--outputJson` to a file and upload it as a workflow artifact, so runs can be compared.
**Status:** Resolved
**Resolution:** Approved. The p95 is printed on every bench run, and `pnpm bench` uses the verbose reporter, so the CI log holds the measurement and Vitest's table.

---

### QR-003: `checkStructure` re-reads `version` through the prototype chain, unlike the envelope stage that validated it

**Category:** Patterns
**Severity:** Suggestion
**Location:** `src/core/validate/structure.ts:200-203`, `src/core/validate/envelope.ts:52-59`
**Description:** The envelope reads `version` with `Object.hasOwn(input, "version") ? input["version"] : undefined` and validates it. `checkStructure` then reads it again as `description["version"]`, a plain property read that follows the prototype chain, and copies it into the normalized description. Everywhere else, this delivery and the Known Hazard it carries read description keys only as own properties.

In the probe, with `Object.prototype.version = 2` set by some other code, `validateWith({ type: "circle", radius: 1 }, fixtureRegistry)` returned `{"valid":true,"description":{"type":"circle","version":2,"radius":1}, …}`. The result is valid and carries a version the envelope would have rejected, and validating that result again reports `unsupported_version`. That breaks DEL-005's claim that "validating that result again passes".
**Impact:** The effect is small, since it needs a polluted prototype in the caller's process, but it is a second source of truth for a value the envelope already checked. The Security Review may weigh the prototype-pollution angle separately.
**Recommendation:** Return the checked `version` from the envelope, as in `{ ok: true; description; type; version?: number }`, and have `validateWith` or `checkStructure` use that value instead of reading the description again. A test that sets and then deletes `Object.prototype.version` would pin it.
**Status:** Resolved
**Resolution:** Approved. The envelope returns the checked `version`, and `checkStructure` takes it as an argument. Pinned by the prototype-pollution test.

---

### QR-004: The hostile-input test asserts only `valid: false`, and a revoked Proxy input is reported as a package defect

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/core/validate-structure.test.ts:309-317`, `src/core/validate/envelope.ts:13-17` (`isPlainObject`)
**Description:** "returns a result for hostile inputs" checks that `check(input)` does not throw and that `.valid` is `false`. Because `validateWith` turns every exception into `internal_error`, which is also `valid: false`, the test passes whether the validator handled an input gracefully or crashed on it. The probe showed which happened for each input:

| Input | Result |
|-------|--------|
| revoked Proxy as the whole input | `internal_error` ("…because of a defect in the package; please report it.") |
| Proxy whose `ownKeys` throws | `unknown_graph_type /type` |
| `{ type: "circle", radius: <revoked Proxy> }` | `wrong_kind /radius` |

The first is caller input reported as a package defect. `Array.isArray` throws on a revoked Proxy inside `isPlainObject`, whereas `describeValue` (`src/core/issues.ts:206-211`) already guards that same call.
**Impact:** A future change that makes the validator crash on, say, a Proxy radius keeps this test green. The `internal_error` text tells a caller to file a bug for what is really unusual input.
**Recommendation:**
- Assert the exact code for each hostile input.
- Decide whether a revoked Proxy should be `not_an_object`, by catching inside `isPlainObject` as `describeValue` does, or deliberately `internal_error`, and pin whichever is chosen.
- Call `check(input)` once per input rather than twice.
**Status:** Resolved
**Resolution:** Approved. Exact codes are asserted per hostile input, and a revoked Proxy is `not_an_object`. See code review CR-006.

---

### QR-005: Several branches and boundaries of the new code are not exercised

**Category:** Testing
**Severity:** Suggestion
**Location:** `src/core/validate/structure.ts:59` and `:66` (`exclusiveMax`), `src/core/format.ts:106-121` (`UNSAFE_TEXT`, `findUnsafeTextChar`), `src/core/validate/structure.ts:165-174` (nested `allowed`), `src/core/validate/structure.ts:121-123` (`ordered` with an absent member), `src/core/validate/structure.ts:114-117` (enum with a non-string value)
**Description:** Reading the tests against the code turned up these gaps:
- **`exclusiveMax`:** no fixture property uses it, so the `exclusiveMax` lines in `rangeOf` and `outOfRange` never run.
- **`findUnsafeTextChar` boundaries:** it has no unit test. The validator tests reach it only through `UNSAFE_CHARS`, which covers U+000A, U+001B, U+009B, U+2028, U+2029, U+202E and U+2067. No test checks the first and last code point of each range, or the neighbours just outside: U+0000, U+001F/U+0020, U+007F, U+009F/U+00A0, U+202A, U+202F, U+2065/U+2066, U+2069/U+206A. Nothing records that TAB (U+0009) is rejected, which the Product Owner's decision implies but a reader might not expect.
- **Nested `allowed`:** the `allowed` list of an unknown property is asserted only at the top level. The nested case (`/axis/ticks`) checks the code and path only.
- **`ordered` with one member absent:** not covered, because both `min` and `max` are required in the fixture.
- **Enum with a non-string value:** an enum given a number is not tested; only `"up"` is.

The probe showed the current behaviour is correct at every one of these boundaries. For example, U+001F, U+007F and U+2066 are rejected, and U+0020, U+00A0 and U+206A are accepted.
**Impact:** The plain-text ranges are a Product Owner decision with a security origin (TICKET-001 SEC-002). An off-by-one when someone edits the table later would go unnoticed. The other branches are small, but each is behaviour a later type will rely on.
**Recommendation:**
- Add a table-driven `findUnsafeTextChar` test in `tests/core/format.test.ts` over each range's first and last code point and the neighbours outside it.
- Add an `exclusiveMax` property to one fixture, with a test.
- Assert `allowed` for a nested unknown property.
- Add an optional `ordered` member case and an enum given a number.
**Status:** Resolved
**Resolution:** Approved. Tests added for `exclusiveMax`, the boundaries of every unsafe range, nested `allowed`, an `ordered` pair with an absent member, and an enum given a number.

---

### QR-006: The transitional "no type registered" behaviour gives a self-contradictory message, and its test will break with the first type ticket

**Category:** Maintainability
**Severity:** Suggestion
**Location:** `src/core/validate/envelope.ts:41-43`, `tests/core/validate-envelope.test.ts:71-74`, `.gener8v/changes/graph-library/delivery/graph-specification-and-vocabulary-ticket-003-delivery.md:288` (Notes "For the type tickets")
**Description:** While the real registry is empty, DEL-001 makes `allowed` list every declared type. The public `validate({ type: "circle", radius: 1 })` therefore returns: "type must be one of: number-line, xy-graph, xyz-graph, line-graph, bar-graph, pictograph, circle, square, triangle, cube, cylinder; got "circle"." That tells the caller to use the value they already used.

The test "lists every declared type while no definition is registered yet" asserts `allowed` equals `GRAPH_TYPES` through the public `validate`. As soon as any type ticket registers a definition (the circle slice, graph-library/geometric-shapes-and-solids/TICKET-002, per TQ-008), `allowed` becomes that one type and the test fails. The delivery Notes for the type tickets mention the bench and the registry but not this test or the fallback branch, and the code comment names no ticket that removes the fallback.
**Impact:** This is a small, predictable break in another area's ticket, and a misleading message from the only public entry point for as long as the registry is empty. Neither is hard to fix, but the implementer of the circle slice has to work out why the test exists.
**Recommendation:**
- Reference the removal point in the code comment, for example "until the first type registers; TICKET-006 makes the sets equal".
- Add a Known Hazard to the circle-slice ticket saying that this test and the fallback branch go when the circle registers.
- Alternatively, drop the fallback now and pin the empty-registry message in the test with the fixture registry only.
**Status:** Resolved
**Resolution:** Approved. The fallback is commented, with a Known Hazard on GSS TICKET-002. See code review CR-004.

---

### QR-007: `UNSAFE_TEXT` repeats code-point ranges that `BREAKING` and `INVISIBLE` already list in the same file

**Category:** DRY
**Severity:** Suggestion
**Location:** `src/core/format.ts:68-86` (`BREAKING`, `INVISIBLE`), `src/core/format.ts:106-112` (`UNSAFE_TEXT`)
**Description:** `UNSAFE_TEXT` is `BREAKING`'s three ranges copied verbatim (`[0x00, 0x1f]`, `[0x7f, 0x9f]`, `[0x2028, 0x2029]`) plus two ranges already inside `INVISIBLE` (`[0x202a, 0x202e]`, `[0x2066, 0x2069]`). The two tables express one policy from two sides:
- `findUnsafeTextChar` rejects a character on input;
- `cleanText` neutralises it on output.

The probe confirmed the policy holds today: of all 65,536 BMP code points, none that `findUnsafeTextChar` rejects is left unchanged by `cleanText`. Nothing keeps it that way.
**Impact:** If the Product Owner widens the forbidden set and only `UNSAFE_TEXT` is edited, text written before the change, or reaching `cleanText` another way, is no longer neutralised the same way. The two tables can drift silently.
**Recommendation:**
- Name the shared ranges once (for example `CONTROL_AND_LINE_BREAKS` and `DIRECTION_CONTROLS`) and build `BREAKING`, `INVISIBLE` and `UNSAFE_TEXT` from them.
- Alternatively, keep the tables and add a test asserting that every code point `findUnsafeTextChar` rejects is changed by `cleanText`.
**Status:** Resolved
**Resolution:** Approved. The ranges are defined once and shared by validation, `cleanText` and message escaping. A sweep test proves `cleanText` neutralises everything validation rejects.

---

### QR-008: Cross-stage helpers live in the envelope stage, and `Terms` is cast in four places, only one of them guarded

**Category:** Patterns
**Severity:** Suggestion
**Location:** `src/core/validate/envelope.ts:10` (`Registry`), `src/core/validate/envelope.ts:13-17` (`isPlainObject`), `src/core/validate/envelope.ts:43` and `:54` (`as unknown as Terms`), `src/core/validate/structure.ts:8` (imports both from the envelope), `src/core/validate/structure.ts:46` and `:49-52` (`COLOR_NAMES`, `asTerms`), `src/core/definitions/index.ts:10` and `:20`
**Description:** `Registry` is the type of the definitions registry. It is declared in the stage-1 module, while `src/core/definitions/index.ts` writes the same type out by hand for `definitions` and lets `propertiesOf`'s `registry` parameter infer it from its default. `isPlainObject` is a general JSON-shape test used by both stages, but it lives in the envelope stage too, so `structure.ts` imports stage-1 internals.

`structure.ts` defines `asTerms`, which checks that a list is non-empty before casting it to `Terms`. Three other sites cast with `as unknown as Terms` and no check: `allowed` and `allowedVersions` in the envelope, and `COLOR_NAMES` in the structure stage.
**Impact:** TICKET-004 adds `derive.ts` and `domain.ts`, which will need `Registry` and probably `Terms`. Following the current pattern, they would import from `envelope.ts` and add more bare casts, so the import graph between stages tangles and the non-empty guarantee that `Terms` encodes is asserted in one place but assumed in the rest.
**Recommendation:**
- Declare `export type Registry` beside `definitions` in `src/core/definitions/index.ts`, and type both `definitions` and `propertiesOf`'s parameter with it.
- Move `isPlainObject` to a neutral module, for example `src/core/validate/json.ts`.
- Move `asTerms` next to `Terms` in `src/core/issues.ts` and use it at all four sites.
**Status:** Resolved
**Resolution:** Approved. `Registry` moved beside `definitions`, `isPlainObject` moved to `src/core/validate/json.ts`, and `asTerms` moved to `src/core/issues.ts` and is used at every site.

---

### QR-009: A shared term inside a nested non-element object is reported as not applying to the whole graph type

**Category:** Readability
**Severity:** Suggestion
**Location:** `src/core/validate/structure.ts:160-164`, `tests/core/validate-structure.test.ts:72`
**Description:** `checkMap` reports any shared term missing from the current map as `inapplicable_property`, in every nested map. The message template names the graph type, so the reason it gives is false whenever the term does apply to that type somewhere else. Probe output:
- `segments[0].from.label`: "segments[0].from.label does not apply for an xy-graph; remove it." But `label` does apply to xy-graph points and segments; it just is not a property of `from`.
- `axis.title` (pinned by the test above): "axis.title does not apply for a number-line; remove it." But `title` applies to number-line at the top level.

The ticket's Known Hazard says `inapplicable_property` is for a shared option "on a type outside its `appliesTo`, or on an element outside its `elementsOf`". `label` on an xy-graph is inside `elementsOf`, so `unknown_property` (with `allowed`: `x`, `y`) arguably fits better here. The Code Review may weigh in on that reading.
**Impact:** The fix ("remove it") is right, but the reason misleads a model or author into thinking the option is unsupported for the graph type. It also hides the terms that are valid at that position, which `unknown_property`'s `allowed` list would provide.
**Recommendation:** Report `inapplicable_property` only at the top level (outside `appliesTo`) and on maps whose graph type is outside the term's `elementsOf`. Report `unknown_property` with the map's own `allowed` terms and a suggestion anywhere else, and update the `axis.title` expectation to match. If the current classification is kept, consider wording for nested paths that names the containing property rather than the graph type, which is a change to the TICKET-002 template.
**Status:** Resolved
**Resolution:** Approved. `inapplicable_property` only when the option applies nowhere in the type; otherwise `unknown_property`, with the terms valid at that position.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Approved | A discriminated `Outcome`, a `failed` set on `StructureResult`, failed values out of `description` and `provenance` (failed list elements `null`), the `ordered` upper end removed, and a test of the output with issues. | see Post-Review Amendments |
| QR-002 | Approved | The p95 is printed on every bench run, and `pnpm bench` uses the verbose reporter, so the CI log holds the measurement and Vitest's table. | see Post-Review Amendments |
| QR-003 | Approved | The envelope returns the checked `version`, and `checkStructure` takes it as an argument. Pinned by the prototype-pollution test. | see Post-Review Amendments |
| QR-004 | Approved | Exact codes are asserted per hostile input, and a revoked Proxy is `not_an_object`. See code review CR-006. | see Post-Review Amendments |
| QR-005 | Approved | Tests added for `exclusiveMax`, the boundaries of every unsafe range, nested `allowed`, an `ordered` pair with an absent member, and an enum given a number. | see Post-Review Amendments |
| QR-006 | Approved | The fallback is commented, with a Known Hazard on GSS TICKET-002. See code review CR-004. | see Post-Review Amendments |
| QR-007 | Approved | The ranges are defined once and shared by validation, `cleanText` and message escaping. A sweep test proves `cleanText` neutralises everything validation rejects. | see Post-Review Amendments |
| QR-008 | Approved | `Registry` moved beside `definitions`, `isPlainObject` moved to `src/core/validate/json.ts`, and `asTerms` moved to `src/core/issues.ts` and is used at every site. | see Post-Review Amendments |
| QR-009 | Approved | `inapplicable_property` only when the option applies nowhere in the type; otherwise `unknown_property`, with the terms valid at that position. | see Post-Review Amendments |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0
**Notes:** Resolved with the Product Owner on 2026-10-06. All nine findings were fixed and re-verified with the full verification set (see the delivery record's Post-Review Amendments).
