# TICKET-007: Report a tick spacing that leaves fewer than two ticks in the axis range — Security Review

## Summary

Reviewed the delivery at commit `eb820d4`. It adds a validator rule to `axisSpacingIssues` that reports a given tick spacing leaving fewer than two ticks as the new public code `too_few_ticks`, with a new message template and a `minor` changeset. The rule is a constant-cost comparison that holds up against hostile numbers: huge, tiny and subnormal spacings, ends at ±1e9, and NaN or Infinity. Its message echoes no caller-supplied text. No axis can get two spacing issues. Two Low findings, both about whether the rule keeps its own promises. First, at the 1e-12 tolerance edge the validator still accepts a spacing that draws one tick, which refutes DEL-002's premise (SEC-001). Second, on ranges between 1e-9 and 2e-9 wide the "spacing that fits" named in the message does not fit, so a caller that applies it gets the same issue back indefinitely (SEC-002).

**Files Reviewed:**
- `src/core/definitions/axis.ts` (`MIN_AXIS_TICKS`, `axisChecks` doc comment, `axisSpacingIssues`, `axisDomainChecks`)
- `src/core/issues.ts` (`ISSUE_CODES`, `issueDocs`, `IssueParamsByCode.too_few_ticks`, the `too_few_ticks` template, `describeTerm`, `describeNumber`, `count`, `ownParams`, `createIssue`)
- `tests/core/axis.test.ts`, `tests/core/number-line.test.ts`, `tests/core/issues.test.ts` (the diff in `eb820d4`)
- `.changeset/tick-spacing-with-fewer-than-two-ticks-rejected.md`
- Context read: `src/core/value-scale.ts` (`niceInterval`, `MIN_CHOSEN_INTERVAL`, `multiplesIn`, `isMultiple`, `AXIS_NOISE`, `axisTooNarrow`, `tickCount`, `axisSpacing`, `drawableTicks`, `axisTick`, `tooManyTicks`), `src/core/format.ts` (`formatSupplied`), `src/core/definitions/number-line.ts`, `src/core/definitions/xy-graph.ts:330`, `src/core/definitions/xyz-graph.ts:175`, `.changeset/README.md`, `.gener8v/constraints/prd.md`, `.gener8v/technical-design/system-design.md` (AD-004, IssueCode set)

**Findings:** 2
**Critical:** 0 | **High:** 0 | **Medium:** 0 | **Low:** 2 | **Informational:** 0

## Security Assessment

### Input Validation

**Status:** Gaps Found
**Notes:** The new check runs after the structure stage. That stage rejects a non-finite spacing (`NaN` and `Infinity` give `wrong_kind`) and one above 2e9 (`out_of_range`), and the check is skipped when an earlier failure touches `min`, `max` or `tickSpacing` (AD-004; the check's `inputs` are unchanged). Results of hostile probes against the validator (`TSX_DISABLE_CACHE=1 npx tsx`, `src/core` at `eb820d4`), one issue each:
- `-0` → `tick_spacing_invalid`.
- `2e9` on ±1e9 → `too_few_ticks` ("1 tick … such as 200000000").
- `1e-300` and `5e-324` on ranges up to ±1e9, including ranges where both `min / spacing` and `max / spacing` overflow to Infinity → `too_many_ticks` (the count's NaN becomes Infinity in `tickCount`, so an overflowing count never falls through to `too_few_ticks`).
- 1e9 − 1 to 1e9 at spacing 1e9 → `too_few_ticks` naming 0.1.
- A range too narrow to draw → only `out_of_range`.

**No double spacing issue.** The early returns in `axisSpacingIssues` (`src/core/definitions/axis.ts:131-144`) allow at most one spacing issue per axis. An x,y graph with one axis too coarse and the other at 0 reports one issue at each axis's own path. Note that the rule now covers `xAxis`, `yAxis` and `zAxis` as well as the number line, because `src/core/definitions/xy-graph.ts:330` and `src/core/definitions/xyz-graph.ts:175` already register `axisDomainChecks`. All 15 `examples/*.json` still validate.

**Cost.** Work is constant: `tickCount` plus `niceInterval` (a four-step loop), with no enumeration. Measured at 10.9 µs per `validate` for a benign axis and 12.0–13.2 µs for every hostile case above (50,000 runs each).

**Gaps.** The count used to decide "fewer than two" disagrees with the ticks drawn at the tolerance edge (SEC-001). The suggested spacing does not always fit (SEC-002). No injection surface: the package builds strings for a message and an SVG Scene and runs no queries, shell or templates on caller input.

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** A client-side/server-side rendering library with no authentication, sessions or authorization. The delivery adds none.

### Data Protection

**Status:** Adequate
**Notes:** The new message uses only four inputs:
- `term`, built in code from `${term}.tickSpacing`, where `term` is a definition constant (`axis`, `xAxis`, …) and is passed through `describeTerm`, which quotes and escapes anything not shaped like a term.
- `tickCount`, 0 or 1, computed.
- `minTicks`, the constant 2.
- `fittingSpacing`, derived by `niceInterval`: 1, 2 or 5 × 10ⁿ via `cleanDecimal`, rendered by `describeNumber`.

No caller-supplied value is echoed. Params go through `ownParams`, so a polluted `Object.prototype` cannot add or rewrite a field. The issue carries no optional fields, and `createIssue` copies only the documented ones. `describeNumber` writes a spacing below 1e-6 in exponent form (`1e-9`). That matches the existing `too_many_ticks` template and is a valid JSON number, so it is not a finding. No personal data, logging or transmission; prd/CC-003 is unaffected.

### Configuration Security

**Status:** Adequate
**Notes:** No configuration, build or manifest change. No secrets in `git show eb820d4`.

**Public contract.** `too_few_ticks` is appended at the end of the frozen `ISSUE_CODES`, so the order of existing codes is kept. It is documented in `issueDocs` (GSV-NFR-005) and typed in `IssueParamsByCode`. The code set is not in `src/generated/*`, so the published JSON Schema and the model tool schema are unchanged. The code ships in the built `dist/` types. A consumer holding an exhaustive `Record<IssueCode, …>` will fail to compile until it adds the code, and a previously valid description is now refused. Under `.changeset/README.md` both make this a `minor` bump while the package is `0.x`, and the changeset is `minor` with a `Changed:` summary. Its wording ("inside an axis range", "the axis's `tickSpacing`") also covers the x,y and x,y,z axes. The system design's IssueCode list lacks the code; the delivery record lists it for the next Technical Design amendment. No finding.

**Dependency check:** `pnpm audit` (pnpm, run 2026-11-02 at commit `eb820d4`): exit 1, one moderate advisory, `minimatch` <11.0.1 via `.>eslint>minimatch` (GHSA-g3hv-75wg-m249, "potential denial of service via globparts amplification"). It is a dev-only lint dependency, already an accepted risk (CPSE TICKET-004 SEC-002), and is not re-raised. `pnpm audit --prod`: exit 0, "No known vulnerabilities found". No dependency changed in this delivery.

**Cryptography / Logging:** Not applicable. No cryptography, random numbers or logging.

**Compliance cross-reference:**
- prd/CC-002: The rule exists so no text alternative says "ticked every 10" of a figure with no tick. It does that for zero ticks. At the tolerance edge (SEC-001), an axis drawn with one tick still validates, and its text alternative says "ticked every 6.1". That is literally true of the one tick drawn, so I read it as the DS-002 symptom recurring rather than a false text alternative. Not elevated, but resolution may reconsider.
- prd/CC-001, CC-003, CC-004: unaffected.

**Verification:** `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache --maxWorkers=4 tests/core/axis.test.ts tests/core/number-line.test.ts tests/core/issues.test.ts tests/layout/kit/axis.test.ts tests/layout/kit/ticks.test.ts`: 5 files, 163 tests passed.

## Findings

### SEC-001: At the 1e-12 tolerance edge, a spacing that draws one tick still validates (DEL-002's premise does not hold)

**Severity:** Low
**Category:** Input Validation
**OWASP Reference:** N/A (validation consistency; nearest is A06:2025 Insecure Design)
**Location:** `src/core/definitions/axis.ts:138-143` (`axisSpacingIssues` decides on `tickCount`); `src/core/value-scale.ts` (`multiplesIn`/`isMultiple` against the inclusion test in `drawableTicks`); `tests/core/axis.test.ts:146-165` (the pinned edge test)
**Description:** The rule counts with `tickCount`. That function treats an end within 1e-12 of `k × spacing`, relative to the multiple, as a tick. `drawableTicks` instead lists `axisTick(k, spacing)`, rounded at the spacing's precision, and keeps it only within 1e-12 of the larger end. The ticket's Known Hazard said the two can differ by one. DEL-002 accepted using the count on the claim that "at a count of two or fewer no disagreement was found in about 4 million probed ranges". The pinned test only probes multiples 0, 1 and 2 of the spacing near zero, where `k × spacing` carries no rounding, so it cannot find the disagreement. Placing either end at the edge of a multiple further from zero finds it at once. A targeted random search found 10 cases in 760,747 ranges where 2 ticks are counted but 1 is drawn, including:
- `{ min: 2635.2, max: 2641.2999999973586, tickSpacing: 6.1 }`: counted 2 (2635.2 and 2641.3), drawn 1 (2635.2)
- `{ min: 3543.5000000035425, max: 3580.799999996419, tickSpacing: 37.3 }`: counted 2, drawn 1
- `{ min: -12253.599999987746, max: -12195.800000012194, tickSpacing: 57.8 }`: counted 2, drawn 1

For the first case, `validate` returns valid and `createGraph` returns `ok: true`. The Scene has one tick label, "2635.2", and the text alternative says "A number line from 2635.2 to 2641.2999999973586, ticked every 6.1, …". That is the one-tick figure the rule was meant to refuse. The reverse direction, counted fewer than two but drawn two, did not occur in 2 million edge ranges, so the rule does not over-reject. The test comment "it cannot move a count across the minimum" is false.
**Attack Scenario:** Not required at Low. A caller who wants a scale-less axis past validation, such as a generator testing the guard or a model gaming a checker that only asks for `valid`, sets `max` to `k × spacing × (1 − ~1e-12)` for a multiple far from zero. Floating-point noise in a computed end can land there by accident, but rarely: the window is about 1e-12 relative wide.
**Impact:** A narrow class of descriptions that should get `too_few_ticks` validates and draws a number line with one tick and no readable scale, the DS-002 symptom. No data, code execution or availability impact. The output is still a well-formed, bounded Scene.
**Recommendation:** Decide "fewer than two" by the same rule the kit draws by. Two options:
- Once `count ≤ MAX_VALUE_TICKS` (≤ 100, so work stays bounded and constant in the values), check `drawableTicks(min, max, tickSpacing)?.ticks.length < MIN_AXIS_TICKS` in `axisSpacingIssues`, keeping `tickCount` for the upper bound and the message count.
- Make `multiplesIn` and `drawableTicks` share one end-inclusion test.

Either way:
- Replace the sampled test with one that nudges either end of multiples far from zero (k up to about 10⁴, spacings with one to four significant digits) and asserts `validate` reports `too_few_ticks` exactly when fewer than two ticks are drawn.
- Correct DEL-002 and the comment in `tests/core/axis.test.ts`.
**Compliance Impact:** prd/CC-002 (related, not a violation: the text alternative is literally true of the one tick drawn; see the compliance note above)
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-11-02): after the 100-tick check, "fewer than two" is decided by the ticks `drawableTicks` lists (at most 100), the rule the drawing uses; the message states the drawn count. `tests/core/axis.test.ts` pins the three edge cases of this report (counted 2, drawn 1, now `too_few_ticks`) and a property: for a count of at most 100, `too_few_ticks` iff fewer than two ticks are drawn. DEL-002 corrected in the delivery record. Mutant: deciding by the count → 3 tests fail.

---

### SEC-002: The "spacing that fits" named by `too_few_ticks` does not fit on ranges 1e-9 to 2e-9 wide, so applying it repeats the issue

**Severity:** Low
**Category:** Input Validation
**OWASP Reference:** N/A (nearest is A06:2025 Insecure Design)
**Location:** `src/core/definitions/axis.ts:140-142` (comment and `fittingSpacing: axisSpacing(min, max)`); `src/core/issues.ts:189` (the `IssueParamsByCode.too_few_ticks` contract); `src/core/value-scale.ts:28`, `src/core/value-scale.ts:101` (`MIN_CHOSEN_INTERVAL` floor in `niceInterval`)
**Description:** The fitting spacing is `axisSpacing(min, max)`, and both the code comment and the params doc promise it "always gives 7 to 20 ticks" and "would draw at least `minTicks` ticks". `niceInterval` never goes finer than `MIN_CHOSEN_INTERVAL` (1e-9). `axisTooNarrow` accepts any range at least 1e-9 wide near zero. So for a drawable range narrower than 2e-9 that holds one multiple of 1e-9, the named spacing gives one tick. Probed:
- `{ min: 5e-10, max: 1.6e-9, tickSpacing: 1 }` → `too_few_ticks`, "would draw 0 ticks … such as 1e-9". Applying `1e-9` → `too_few_ticks`, "would draw 1 tick … such as 1e-9", which is the same suggestion.
- `{ min: 1e-10, max: 1.15e-9 }` and `{ min: 1.0000000003, max: 1.0000000015 }` behave the same way.

No spacing the message can name fixes these ranges. The same ranges with no `tickSpacing` validate and draw one tick (`drawableTicks` → `[1e-9]`). The rule's rationale ("fewer than two ticks gives the axis no scale") is therefore enforced only when a spacing is given. That default-spacing behaviour predates this ticket and is documented ("fewer on a narrower one"), but it makes the new rule inconsistent at the floor.
**Attack Scenario:** Not required at Low. A model or script fixing descriptions from `issues[].message` (the documented repair channel for the model tool) applies the suggested spacing, gets the identical issue, and retries until its own budget runs out. The cost lands on the caller's loop, not on this package, whose work per call stays constant.
**Impact:** An automated repair loop cannot converge on a narrow, near-zero axis, wasting caller time and tokens. A human reader is told to use a spacing that is then refused. No data or integrity impact. Reaching it needs an axis whose whole range is a few billionths wide.
**Recommendation:** Keep the promise or narrow it. Options:
- (a) When `tickCount(min, max, axisSpacing(min, max)) < MIN_AXIS_TICKS`, report a range that fits instead, e.g. an `out_of_range` at `max` naming an end at least 2 × `MIN_CHOSEN_INTERVAL` above `min`, as `narrowRange` does.
- (b) Raise `axisTooNarrow`'s floor so every drawable range holds two multiples of the finest chosen interval (this also fixes the one-tick default).
- (c) Compute the suggestion without the 1e-9 floor, provided the named spacing still prints and draws.

In every case:
- Add a property test asserting that applying `fittingSpacing` to the same description validates, across ranges at the resolution floor.
- Correct the comment at `src/core/definitions/axis.ts:140` and the doc at `src/core/issues.ts:189` to match.
**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-11-02): the message names `axisSpacing(min, max)` only when it draws at least two ticks, and otherwise says to leave the tick spacing out (`fittingSpacing` optional). A 3,000-run property applies every suggestion and asserts the result validates, `{ min: 5e-10, max: 1.6e-9, tickSpacing: 1 }` included. Mutant: always naming a spacing → the property fails.

---

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Fixed | drawn ticks decide | No | `src/core/definitions/axis.ts`, `tests/core/axis.test.ts` |
| SEC-002 | Fixed | "leave it out" when no spacing fits | No | `src/core/definitions/axis.ts`, `src/core/issues.ts`, `tests/core/axis.test.ts`, `tests/core/issues.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:** Both findings fixed in resolution and re-verified. The `minimatch` advisory in `pnpm audit` remains the accepted risk of CPSE TICKET-004 SEC-002.
