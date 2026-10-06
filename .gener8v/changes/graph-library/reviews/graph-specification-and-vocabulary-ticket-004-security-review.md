# TICKET-004: Validator — derivation and domain stages, normalization and provenance — Security Review

## Summary

This review covers the validator's derivation stage (stage 3), domain stage (stage 4), `normalize`, and the public exports added for `graph-library/graph-specification-and-vocabulary/TICKET-004` (branch `ticket/gsv-004`, commit `2e9d5b6`). The `security-reviewer` agent ran the findings phase in a fresh context. `validate` is the package's single entry point for untrusted descriptions from users, stored data and model tool calls. This ticket decides which values it adds to a valid result, and which checks run on what.

The new stages keep the validator's existing protections:
- derived values are added by vocabulary term to the null-prototype description;
- inputs are read only as own properties;
- every value that fails carries its own issue;
- contradiction messages carry numbers and package-authored terms only;
- any exception still fails closed as the fixed `internal_error`.

The gaps are at the boundary between caller numbers and package assumptions:
- floating-point underflow lets a caller trigger the "a derivation produced 0" assertion;
- derived values are never checked against their own member's spec;
- the domain stage runs checks on objects that are missing required nested values.

Two contract hazards for the type tickets follow: what a domain check may do with the description, and the now-public `describe`.

Five findings: 0 Critical, 0 High, 0 Medium, 3 Low, 2 Informational.

**Files Reviewed:**
- `src/core/validate/derive.ts`
- `src/core/validate/domain.ts`
- `src/core/validate/state.ts`
- `src/core/validate/index.ts`
- `src/core/definitions/types.ts` (`Derivation`, `DomainCheck`)
- `src/core/index.ts`
- `tests/fixtures/definitions/circle.ts`, `tests/fixtures/definitions/xy-graph.ts`
- `tests/core/validate-derive.test.ts`
- `tests/core/validate-domain.test.ts`
- `tests/core/definitions.test.ts` (the stage checks)
- `tests/core/validate-structure.test.ts` (the three updated expectations)

Context read:
- the ticket and its delivery record;
- `.gener8v/constraints/prd.md` (no per-area constraints file exists);
- `.gener8v/technical-design/system-design.md`: AD-001, AD-004, AD-014, AD-015, Validator, Data Model › NormalizedDescription and Provenance, Validation API, Model tool;
- `.gener8v/context.md`;
- the GSV specification (Derived Values; Behaviors › Derived Values and Tolerance);
- GSS TICKET-002 and TICKET-004, NLC TICKET-001, CPSE TICKET-003, TICKET-007 and TICKET-008 (their Known Hazards);
- the GSV TICKET-001 and TICKET-003 security reviews;
- the code the new stages build on: `src/core/validate/structure.ts`, `src/core/validate/envelope.ts`, `src/core/validate/json.ts`, `src/core/issues.ts`, `src/core/result.ts`, `src/core/describe.ts`, `src/core/definitions/index.ts`, `src/core/format.ts` (`cleanText`, `quoteText`, `formatMeasurement`).

**Findings:** 5
**Critical:** 0 | **High:** 0 | **Medium:** 0 | **Low:** 3 | **Informational:** 2

## Security Assessment

### Input Validation

**Status:** Gaps Found
**Notes:**
The entry points are `validate(input: unknown)` and the new `normalize(input: unknown)` (`src/core/validate/index.ts:51-70`), both exported from `./core`. Callers reach them from components (AD-014), the model tool handler (AD-015, CPSE TICKET-007), and consumers calling directly. This ticket adds what happens after stage 2: derivation over each group's members, and the type's domain checks. Both now run even when stage 2 found issues (`src/core/validate/index.ts:25-35`).

How I probed:
- Scripts in the session scratchpad imported `src/core/validate/index.ts` and the test fixture registry through the repository's own `tsx`, and called `validateWith` directly.
- Some probes used copies of the fixture definitions with one change each (a `max` on a member, an integer member, a check that reads a required nested value). Those copies existed only in the probe process.
- No repository file was written. `git status` was the same before and after (only the hook-written `.gener8v/runs.jsonl` differs).

**What is handled well:**
- **Null prototypes and own reads:**
  - Derived values are assigned by the group's own member terms onto the null-prototype description (`src/core/validate/derive.ts:93-97`).
  - Members count as supplied only when `Object.hasOwn` finds them (`:44`), and domain inputs are gated the same way (`src/core/validate/domain.ts:13-15`).
  - A parsed `__proto__` key is `unknown_property` and adds nothing (tested).
  - **Pollution sweep:** I set 15 keys on `Object.prototype` one at a time, then deleted them: `max`, `min`, `exclusiveMin`, `exclusiveMax`, `required`, `radius`, `diameter`, `circumference`, `inputs`, `members`, `ordered`, `kind`, `description`, `derive` and `check`. None changed the result through the new stages. The only effects came from pre-existing `Range` literals (see "Not raised as findings").
- **Every failure has an issue:** every place that adds to `failed` also pushes an issue:
  - `fail`, opaque keys, unknown keys and `ordered` in `src/core/validate/structure.ts`;
  - `dropFailed` after a contradiction or an overflow in `src/core/validate/derive.ts:23-28`.

  So when a failure makes a domain check skip (DEL-005), the result is still invalid. I confirmed this with an unknown key inside one point: the "points inside the axes" check was skipped, and the result was invalid with `unknown_property`. No valid result skips a check because of a failure.
- **Messages:**
  - `contradiction` carries the caller's number and the agreeing number. Its `conflictTerms` are package-authored.
  - `insufficient` carries package-authored member names.
  - No caller string enters any message the new stages create.
- **Tolerance:** it is fixed at 1% (`TOLERANCE`, `src/core/validate/derive.ts:7`). The ticket's Known Hazard is honoured: no description property can widen it.
- **Overflow:** a finite defining value whose derived value is not finite is reported, not passed on (DEL-004, `:63-70`). Non-finite values never reach a valid result.
- **`normalize`:**
  - It re-validates its input rather than trusting an earlier `validate` call, so there is no gap between check and use.
  - It throws one fixed message that echoes nothing from the input (`src/core/validate/index.ts:56-60`).
  - It throws by design (Validator interface, "for internal use after `validate`"). The delivery record tells CPSE TICKET-003 and TICKET-007 to use `validate` instead.
- **Cost:** stages 3 and 4 stay bounded by `DESCRIPTION_VALUE_LIMIT`.
  - `touchesFailed` is linear in the size of `failed`, but it is called a fixed number of times per definition.
  - The worst case I built was a circle with 9,990 unknown keys. Stages 3 and 4 added about 3.6 ms to 18.7 ms of structure checking.
  - 200 unknown keys of 25 kB each (5 MB) added no measurable time.
  - 1,000 points with 8,000 failures added about 0.35 ms.

**Gaps:**
- **SEC-001:** stage 2 accepts subnormal values such as `5e-324`. Halving one rounds to 0, so `{ "type": "circle", "diameter": 5e-324 }` reaches the assertion at `src/core/validate/derive.ts:77` and comes back as `internal_error`, with every other issue lost.
- **SEC-002:** derived values are checked for finiteness only. A member's own `max`, `min` and integer kind are not enforced on a derived value. A valid result can then hold a radius above its maximum, or a fractional integer, and the normalized description fails validation when sent again.
- **SEC-003:** `missing_property` is reported but not recorded in `failed`. So a domain check runs on `xAxis: { min: -5 }`, though `DomainCheck`'s documentation says it never sees a failed input. A check that relies on that guarantee throws, and the result collapses to `internal_error`.
- **SEC-004** and **SEC-005** are contract hazards for the type tickets: what a domain check may do with the description it gets, and a public `describe` that never validates.

**Not raised as findings:**
- **Pre-existing `Range` objects on `Object.prototype`.** The sweep showed that `Object.prototype.max`, `min` or `exclusiveMax` changes stage-2 results and issue ranges. The cause is pre-existing code:
  - `rangeOf` builds its range as `{}` (`src/core/validate/structure.ts:84-91`), and `outOfRange` destructures inherited bounds from it;
  - `normalizeRange` reads inherited bounds (`src/core/issues.ts:233-244`);
  - the new `{ max }` literal in `src/core/validate/derive.ts:67` flows into the same `normalizeRange`.

  Inherited bounds can only add or tighten bounds, never remove one: own values always win. So pollution here rejects valid descriptions and alters messages, but never lets an invalid value through. It is fail-closed, and a gadget that needs a separate pollution bug. Whoever next touches `Range` construction should build ranges on `Object.create(null)`.
- **Issue suppression by DEL-005:** see "Every failure has an issue" above.
- **Raw keys in `issue.path`:** unchanged by this ticket, and covered by graph-library/graph-specification-and-vocabulary-ticket-002-security-review/SEC-001.

**Not applicable:** SQL, NoSQL, command, template and path injection, and XSS. The delivered code has no query, shell, template engine, file path or markup output.

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** These are library functions behind the `./core` entry point. The package has no server, accounts, sessions or permissions. `.gener8v/context.md` states there are no user accounts, and the technical design makes no authentication or authorisation decisions.

### Data Protection

**Status:** Adequate
**Notes:**
- **Sensitive data:** the delivered code holds no PII or credentials. It neither logs nor transmits anything.
- **Exception text:** exceptions from a derivation or a domain check end in the fixed `internal_error` (`src/core/validate/index.ts:39-41`), so no exception text or stack reaches a caller or a model. `normalize`'s error is a fixed string.
- **Secret scan:** I scanned the added lines of commit `2e9d5b6` under `src/` and `tests/` for:
  - API keys, tokens, passwords, private keys, `_authToken`, and AWS, GitHub and npm token shapes;
  - URLs, `process.env`, `require`, `eval` and `new Function`;
  - `child_process`, network APIs and console output.

  There were no matches.

### Configuration Security

**Status:** Adequate
**Notes:**
- **Configuration changes:** commit `2e9d5b6` changes no configuration, workflow, `package.json` or `pnpm-lock.yaml`. Its non-code changes are pipeline artifacts. No dependency was added, and the delivery record reports `pnpm check:deps` with 0 runtime dependencies.
- **Cryptography:** not applicable; the code uses none.
- **Logging and monitoring:** the library logs nothing. Validation rejections go back to the caller as issues, and consumers who want them logged call `validate()` themselves (AD-014).
  - `issueDocs` describes `internal_error` as "a defect in the package … report it", so consumers may alert on it.
  - SEC-001 and SEC-003 show that untrusted input can raise it. That weakens it as a defect signal.

**Dependency audit:** `pnpm audit` (pnpm 10.28.2, Node.js v24.1.0), run 2026-10-06 16:26 UTC (12:26 EDT).
- `pnpm audit`: `No known vulnerabilities found`, exit 0.
- `pnpm audit --prod`: `No known vulnerabilities found`, exit 0.
- The package has no runtime dependencies, and `react` is a peer.

**Spot check of the builder's claims:**
- **Tests:** `GRAPH_GENERATOR_PREBUILT=1 pnpm exec vitest run` on `tests/core/validate-derive.test.ts`, `tests/core/validate-domain.test.ts`, `tests/core/definitions.test.ts` and `tests/core/validate-structure.test.ts` reported 4 files and 115 tests passed. That is 19 + 6 + 19 + 71, as the delivery record says.
- **Lint:** `pnpm exec eslint src/core/validate src/core/definitions src/core/index.ts` exited 0.
- **Repository state:** `git status` shows no source or test change.

**Compliance cross-reference:** checked against `.gener8v/constraints/prd.md`. No per-area constraints file exists for Graph Specification & Vocabulary, and the ticket lists "Constraints: None identified".

| Constraint | Result |
|---|---|
| prd/CC-001 (license) | Met: no dependency, asset or copied code added |
| prd/CC-002 (WCAG 2.1 AA) | Not applicable: no rendering in this ticket. Exporting `describe` does not change any text alternative (SEC-005 concerns how it may be called) |
| prd/CC-003 (no data collection) | Met: no network, storage or telemetry API in the added code; the delivery record reports `pnpm check:dist` exit 0 |
| prd/CC-004 (trademarks) | Not applicable: no images |
| prd/TC-005 (no React DOM or browser globals in validation) | Met: `src/core/index.ts` adds only `./describe` and `./validate/index`, neither imports React or browser globals, and the lint boundary passes |

No CC-XXX violation was found, so no finding is raised to Critical.

## Findings

### SEC-001: A value small enough to underflow makes the "derived 0 is impossible" assertion reachable, so any caller can turn a description into `internal_error`

**Severity:** Low
**Category:** Input Validation
**OWASP Reference:** A10:2025 Mishandling of Exceptional Conditions. Also CWE-617 (reachable assertion) and CWE-1339 (insufficient precision or accuracy of a real number).
**Location:**
- `src/core/validate/derive.ts:75-77`: `if (value === 0) throw new Error("A derivation produced 0");`, with the comment "Every member is strictly positive by its stage-2 range, so no derived value is 0".
- `tests/fixtures/definitions/circle.ts:42-43`: the radius is `value / 2` or `value / (2 * Math.PI)`. The real circle (GSS TICKET-002) will use the same formulas.
- `src/core/validate/index.ts:39-41`: the `catch` that turns the throw into the single `internal_error`.

**Description:**
The ticket's Known Hazard says that no derivation group in this change can derive zero, because every member is strictly positive by its stage-2 range, so the code should assert it. Real numbers behave that way; IEEE 754 doubles do not.

A member with `min: 0, exclusiveMin: true` accepts every positive finite number, including subnormals down to `Number.MIN_VALUE` (`5e-324`). Halving or dividing one by 2π rounds it to 0.

Probe results with the fixture circle:

| Input | Result |
|---|---|
| `{ "type": "circle", "diameter": 5e-324 }` | `internal_error` only |
| `{ "type": "circle", "circumference": 5e-324 }` | `internal_error` only |
| `{ "type": "circle", "circumference": 1e-323 }` | `internal_error` only |
| `{ "type": "circle", "diameter": 5e-324, "showCenter": "yes" }` | `internal_error` only: the `wrong_kind` on `showCenter` is lost |
| `{ "type": "circle", "radius": 5e-324 }` | valid (multiplying does not underflow) |

The issue reads: "The description could not be checked because of a defect in the package; please report it. The description itself may be valid."

**Attack Scenario:**
- **Attacker:** any author, or any model in a tool loop, whose description reaches `validate`: through a component, the tool handler or stored data.
- **Steps:**
  1. The attacker submits otherwise ordinary JSON with `"diameter": 5e-324` (or any circumference up to about `1e-323`).
  2. `validate` returns one `internal_error` and nothing else.
- **Result:**
  - Every other issue in the description is hidden.
  - A consumer that treats `internal_error` as a package defect can be flooded with false defect reports by anyone who can submit a description. `issueDocs` tells it to do exactly that: report, alert, count against an error budget.
  - A model gets an issue with no path and no fix, told that the description "may be valid", so it may resubmit unchanged.
- **Limit:**
  - It fails closed: the result is never `valid: true`, and no data is exposed.
  - The same reachable throw applies to every later group whose formulas divide: the cylinder's radius from its diameter, and anything in the triangle solver.

**Impact:** A false package-defect signal that untrusted input can raise at will, lost issues, and feedback no one can act on.
**Recommendation:**
1. **Check derived values against their members' specs (see SEC-002):**
   - A derived 0 then fails the member's `exclusiveMin` and becomes a caller-facing `out_of_range` on the defining value, as DEL-004 already does for overflow.
   - Keep the throw only for states that input cannot reach.
2. **Alternatively, or as well, give measurements a curriculum-sized minimum** (for example `1e-6`) in the type tickets. Add a rule to `tests/core/definitions.test.ts` that every group member has a positive `min` large enough that no `derive` output underflows.
3. **Add tests:** `diameter: 5e-324` and `circumference: 1e-323` give `out_of_range` at the defining member, not `internal_error`, and other issues in the same description are still reported.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** A derived 0 now breaks its member's minimum and is reported as `out_of_range` on the supplied value, with other issues kept. Definitions must give members a positive `min`.

---

### SEC-002: Derived values are never checked against their own member's spec, so a valid result can hold values its type declares out of range or of the wrong kind

**Severity:** Low
**Category:** Input Validation
**OWASP Reference:** A06:2025 Insecure Design. Also CWE-20 (improper input validation).
**Location:**
- `src/core/validate/derive.ts:93-97`: a derived value is added to the description and marked `derived` without any check.
- `src/core/validate/derive.ts:63-70`: the only check on derived values is `Number.isFinite`. `:66` reports `range.max` as `Number.MAX_SAFE_INTEGER` when the defining member has no `max`.
- `src/core/definitions/types.ts:173-185`: `Derivation` says nothing about derived values respecting the members' specs.

**Description:**
Stage 2 checks supplied values. Stage 3 adds derived values and checks only that they are finite. DEL-004's Ticket Impact invites type tickets to set "a curriculum-sized `max` on measurements". Once one does, the limit holds only for the member the caller happens to supply.

Probes used copies of the fixture circle with one change each:
- **`radius` given `max: 100`:**
  - `{ "type": "circle", "radius": 500 }` is rejected, as expected.
  - `{ "type": "circle", "circumference": 1e6 }` is valid, with a derived `radius` of `159154.94`.
  - Validating that normalized description again gives `out_of_range /radius`.
- **Maxes chosen to match** (`radius` 100, `diameter` 200, `circumference` 628.32):
  - `{ "type": "circle", "circumference": 628.32 }` is valid, with a derived `radius` of `100.00023` and `diameter` of `200.00047`.
  - Validating it again gives two `out_of_range` issues.
  - So even consistent limits fail at their boundary.
- **`radius` made `kind: "integer"`:**
  - `{ "type": "circle", "diameter": 3 }` is valid, with a derived `radius` of `1.5`.
  - Validating it again gives `wrong_kind` "a whole number".
- **The reported bound (DEL-004):** `{ "radius": 1e308 }` is told "radius must be a number at most 9007199254740991". Yet `{ "radius": 1e300 }` and `{ "radius": 9e15 }` are valid. The caller, or a model, is given a bound the validator does not enforce.

This breaks three guarantees:
- GSV-REQ-016: render only from validated values;
- the range that GSV TICKET-005 will publish in the schema;
- the ticket's own idempotence criterion, which the tests check only on in-range values.

**Attack Scenario:**
- **Attacker:** an author on a platform that stores or round-trips normalized descriptions. The tool handler returns `description` to the model, which may send it back. A platform may store `validate(...).description`.
- **Steps:**
  1. A type ticket sets a curriculum-sized `max` on a measurement, as DEL-004 suggests, for example to keep labels and the text alternative readable.
  2. The attacker supplies a different member of the same group, such as `circumference` instead of `radius`.
  3. `validate` returns `valid: true` with a radius above its documented maximum. Layouts, `describe` and exported source receive a value the published schema says cannot occur.
  4. When that normalized description is validated again, for example on the model's next turn or when a stored description is re-rendered, it is rejected, and a placeholder replaces the graph.
- **Limit:**
  - The current definitions set no `max` and no integer kind on any group member, so nothing is reachable today. It becomes reachable with GSS TICKET-002 (circle) and the cylinder.
  - The geometric layouts of this change scale to a fixed drawing space (AD-007), so a large value does not drive layout cost.

**Impact:** Once types set member ranges, the guarantee that only validated values are rendered fails for derived values. Normalized descriptions may not validate again, and callers are told a bound that is not enforced.
**Recommendation:**
1. **Check each derived value with its member's own spec,** using the same range and integer logic as stage 2 (`checkValue`'s number branch in `src/core/validate/structure.ts`).
   - On failure, report `out_of_range` at the defining member, because the caller's value is the cause, as in DEL-004. State the violated bound in the message, then drop the defining value and mark it failed.
   - This one check also covers SEC-001, because a derived 0 fails `exclusiveMin: 0`. It also covers the existing overflow case.
2. **Report the bound that is actually enforced** in the overflow case, instead of `Number.MAX_SAFE_INTEGER`.
3. **Add tests:** a derived value above its member's `max`, a derived non-integer for an integer member, and idempotence at each member's boundary values.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Derived values are checked against their members' ranges. The overflow bound is one the validator enforces, and idempotence holds at the limits.

---

### SEC-003: Domain checks run on objects that are missing required nested properties, because a missing property is never recorded as failed

**Severity:** Low
**Category:** Input Validation
**OWASP Reference:** A10:2025 Mishandling of Exceptional Conditions. Also CWE-754 (improper check for unusual or exceptional conditions).
**Location:**
- `src/core/validate/domain.ts:13-16`: a check runs when each input is present and `!touchesFailed(...)`.
- `src/core/validate/state.ts:17-22`: `touchesFailed` looks only at `failed`.
- `src/core/validate/structure.ts:243-249`: `missing_property` is pushed as an issue, but its pointer is not added to `walk.failed`. Every other stage-2 failure is added.
- `src/core/definitions/types.ts:187-191`: `DomainCheck` is documented to run "only when every input is present and nothing at or below an input failed an earlier stage".

**Description:**
AD-004 runs domain checks "on members that passed stage 2". An axis missing its required `max` did not pass stage 2, but nothing in `failed` says so. Since this ticket runs stage 4 even when stage 2 found issues, a check now sees such objects.

Probe results with the fixture `xy-graph`:
- **`xAxis: { min: -5 }`:** the check was called with `xAxis = { min: -5 }`.
- **A point `{ x: 9 }`:** the check was called with that point.
- **The fixture check survives both,** because comparisons with `undefined` are false. In the second case it also reported `outside_axis_range` for `x`, which is independent and correct.
- **A check written to the documented contract:**
  - It reads `description.xAxis.max.toFixed(0)` and inputs `["xAxis"]`. The description is `{ xAxis: { min: -5 }, …, showGrid: "yes" }`.
  - The result was `internal_error` only. Both the `missing_property` and the `wrong_kind` were lost.

**Attack Scenario:**
- **Attacker:** any author, or any model in a tool loop.
- **Steps:**
  1. A real check dereferences a required nested value. Examples: NLC TICKET-001's axis checks compute tick counts from `min`, `max` and `tickSpacing`; GSS TICKET-004's triangle solver reads sides, angles and vertices.
  2. The attacker leaves that nested value out.
- **Result:** one of two:
  - an exception, giving `internal_error` with the same effects as SEC-001: a false defect signal and every other issue hidden;
  - for a check that only does arithmetic, an issue computed from `undefined` or `NaN`, which is a cascade of the missing property, contrary to AD-004.
- **Limit:** it fails closed; the result is never valid.

**Impact:** A route from untrusted input to `internal_error` and to cascading issues, through a guarantee the `DomainCheck` documentation makes but the stage does not keep.
**Recommendation:**
1. **Record missing values as failed:** in `checkMap` (`src/core/validate/structure.ts:245-248`), add each missing required property's pointer to `walk.failed`, so that "failed" means "did not pass stage 2" in every case.
   - Derivation is unaffected for absent members, which are never supplied anyway.
   - `group.members.some(failed)` will then suppress `insufficient` when a required member is itself reported missing. That is the no-cascade rule.
2. **Add a test** to `tests/core/validate-domain.test.ts`: a check that reads `xAxis.max` is skipped when `xAxis.max` is missing, and the result lists `missing_property` only.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Missing required properties are recorded in `failed`, so checks that read them are skipped.

---

### SEC-004: The domain stage hands checks the live description and merges whatever they return, so the type tickets' checks can change a valid result or emit uncapped caller text

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** N/A
**Location:**
- `src/core/validate/domain.ts:17`: `check.check(state.description as DescriptionBase)` passes the description that becomes the valid result, and its issues are pushed unchanged.
- `src/core/definitions/types.ts:192-200`: the `DomainCheck` contract.

**Description:**
None of the following is in the delivered checks, which are fixtures. All three are hazards for the checks that the NLC, DGP and GSS type tickets will write.
- **Mutation:** a check that sorted `points` in place changed the order in the returned valid description. The author's order was lost, and `provenance` still called every point `supplied`.
- **Hand-built issues:** a check that returned `{ code, path, message: \`Point ${p.label} is too far right.\` }` produced a 5,024-character message from a 5,000-character label.
  - `createIssue` would quote that label and clip it to 64 characters.
  - Stage 2 already keeps control, bidi and invisible characters out of labels. But length and quoting are lost, and messages reach models (the tool's `summary`) and placeholders.
- **Magnitude:** checks receive any finite value, from `5e-324` to `1.7e308`, and run synchronously inside `validate`.
  - A check whose work grows with a value would hang the caller on a description such as `{ min: -1e308, max: 1e308, tickSpacing: 1e-300 }`.
  - An example is enumerating ticks to count them for `too_many_ticks`, or calling `niceTicks` before that guard.

**Attack Scenario:** N/A (Informational)
**Impact:** A valid result changed after it was checked, uncapped caller text in issue messages, or a synchronous hang. Each would come from a type ticket's check, not from this ticket's code.
**Recommendation:**
1. **Freeze the description** (deeply) before stage 4, or pass checks a frozen copy, so a mutating check throws in tests.
2. **Require `createIssue`:** state on `DomainCheck` that checks build issues only with `createIssue`. Optionally, check in `runDomainChecks` that each code is an `IssueCode` and each message is under a fixed length.
3. **Record Known Hazards** on NLC TICKET-001 (axis checks), the DGP tickets that add checks, and GSS TICKET-004 (triangle solver): a check's cost must grow with the description's size, never with a value's magnitude. Count ticks arithmetically and check the count before enumerating anything.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** The description is deep-frozen before stage 4, and check issues must have a real code and a bounded message. Known Hazards on cost (size, not magnitude) and on `createIssue`.

---

### SEC-005: `describe` is now public on `./core` and runs the type's text alternative on whatever it is given; nothing ties its input to a validated description

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** N/A
**Location:**
- `src/core/index.ts:12`: `export { describe } from "./describe";`
- `src/core/describe.ts:10-17`: only `type` is checked before dispatch.
- `src/core/definitions/types.ts:161-165`: `DescriptionBase` (`{ type: GraphType; [property: string]: unknown }`) accepts any object with a `type`.

**Description:**
graph-library/graph-specification-and-vocabulary-ticket-001-security-review/SEC-005 hardened the dispatch: `type` must be a string, and the error is capped. The type's own `describe` still receives the caller's object as it is. The type tickets write those functions for normalized input, where strings are plain text, numbers are finite and in range, and required values are present.

Suppose a consumer builds alt text for a listing page from stored descriptions with `describe(stored)` and skips `validate`, which nothing in the signature or the types prevents. Then:
- property reads follow the prototype chain and run getters;
- numbers, lists and nested values reach the text alternative unchecked. Caller strings are covered: they pass through `quoteText` and `cleanText`, per the type tickets' Known Hazard;
- the type's `describe` may throw, with JavaScript error text.

No real type is registered yet, so `describe` always throws today. It becomes reachable with GSS TICKET-002.

**Attack Scenario:** N/A (Informational)
**Impact:** Text alternatives built from unvalidated values, and exceptions from consumer misuse that the API invites.
**Recommendation:**
1. **Brand the normalized description:** have `validate` return a branded `NormalizedDescription` type (a type-only unique symbol), and make `describe` accept only that. `describe(raw)` then fails to compile.
2. **Or validate inside `describe`:** have the public `describe` validate its input, as `normalize` does, and throw one fixed error for an invalid input.
3. **At minimum, document it:** state on `describe` that it accepts only `validate(...).description`, and record a Known Hazard on CPSE TICKET-008 (documentation).

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** The public `describe` validates its input first; `describeNormalized` is for package code. Known Hazards on CPSE TICKET-003, 007 and 008.

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Approved | A derived 0 now breaks its member's minimum and is reported as `out_of_range` on the supplied value, with other issues kept. Definitions must give members a positive `min`. | — | see Post-Review Amendments |
| SEC-002 | Approved | Derived values are checked against their members' ranges. The overflow bound is one the validator enforces, and idempotence holds at the limits. | — | see Post-Review Amendments |
| SEC-003 | Approved | Missing required properties are recorded in `failed`, so checks that read them are skipped. | — | see Post-Review Amendments |
| SEC-004 | Approved | The description is deep-frozen before stage 4, and check issues must have a real code and a bounded message. Known Hazards on cost (size, not magnitude) and on `createIssue`. | — | see Post-Review Amendments |
| SEC-005 | Approved | The public `describe` validates its input first; `describeNormalized` is for package code. Known Hazards on CPSE TICKET-003, 007 and 008. | — | see Post-Review Amendments |

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:** Resolved with the Product Owner on 2026-10-06. All five findings were fixed in this ticket's code and re-verified (see the delivery record's Post-Review Amendments). The remaining obligations sit with the type tickets as Known Hazards: member limits, check paths, frozen input, `createIssue`, and cost that grows with size.
