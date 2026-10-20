# TICKET-001: Build the axis and tick foundation shared by all three axis-based graph types — Quality Review

## Summary

I reviewed the axis and tick foundation as it stands at HEAD (`33e1c92`, after the code review was resolved; delivery `841bb5e`). That is the axis tick rule added to `src/core/value-scale.ts`, the axis property group and its checks, the kit's re-export module and `drawAxis`, and their three test files. The code is well organized around the one home for the tick rule that the carried QR-005 asked for, and it is documented in the house style. The verify commands pass: lint, typecheck, 1,161 tests in 45 files on three runs, and build. The findings:
- the multiples property fails on correct code in about 1 run in 100;
- tick values are rounded to 12 significant digits of their own size, which is coarser than the narrowest axis the validator accepts. On valid axes far from zero with a given spacing, ticks therefore move off their multiples, labels print the wrong number, and custom labels are not drawn. No test reaches that domain;
- three documented rules survive mutation: the 19-interval default spacing, the rejecting side of `isTickValue`, and label placement off horizontal and vertical axes;
- whether an axis can be drawn is decided in two places, and the two answers differ;
- `path` names a term in the axis definitions.

There are 7 findings: 0 Critical, 2 Concerns and 5 Suggestions.

**Reviewer:** `quality-reviewer` agent, fresh context (findings phase only, 2026-10-20)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/number-lines-and-coordinate-graphs-ticket-001-delivery.md` (DEL-001 to DEL-004, Post-Review Amendments from the code review)
**Code review read first:** `.gener8v/changes/graph-library/reviews/number-lines-and-coordinate-graphs-ticket-001-code-review.md`. Its CR-001 to CR-007 are not raised again. QR-002 shares a cause with CR-007: ticks listed at 12 significant digits. Its effects are different. CR-007 was about a custom label at ⅔ near zero, and it judged the rounding harmless for drawing. QR-002 shows drawn ticks and their printed values going wrong far from zero, and the CR-007 fix itself failing once an axis's ends are about 3 × 10⁵ spacings from zero.

**Files Reviewed:**
- `src/core/value-scale.ts` (the axis section, `:345-465`, and the `tooManyTicks` refactor, `:197-209`)
- `src/core/definitions/axis.ts`
- `src/layout/kit/ticks.ts`
- `src/layout/kit/axis.ts`
- `tests/core/axis.test.ts`
- `tests/layout/kit/ticks.test.ts`
- `tests/layout/kit/axis.test.ts`
- Read for pattern consistency, unchanged here:
  - the rest of `src/core/value-scale.ts`, and its diff against `fd7fedf`;
  - `src/core/definitions/categories.ts`, `line-graph.ts`, `bar-graph.ts`, `types.ts` (`DomainCheck`, `ALWAYS_RUNS`), `shared.ts`;
  - `src/core/issues.ts` (`pointer`, the `too_many_ticks`, `tick_spacing_invalid` and `out_of_range` messages), `src/core/result.ts`, `src/core/format.ts` (`formatSupplied`), `src/core/validate/domain.ts`;
  - `src/layout/kit/value-scale.ts`, `format.ts`, `scale.ts`, `title.ts`, `markers.ts`, `text.ts`, `labels.ts`, and `src/layout/circle.ts`;
  - `tests/layout/kit/value-scale.test.ts`, `tests/fixtures/scene-geometry.ts`, `tests/fixtures/definitions/axis.ts` and `number-line.ts`;
  - `package.json`, `vitest.config.ts`, `tests/setup/build.ts`, `eslint.config.js`.
- Read for what the consumers need:
  - `graph-library/number-lines-and-coordinate-graphs/TICKET-002`, `TICKET-003` and `TICKET-004`, including the Known Hazards the code review added;
  - the `rulers` change brief (`.gener8v/changes/rulers/change.md`).

**Findings:** 7
**Critical:** 0 | **Concerns:** 2 | **Suggestions:** 5

## Quality Assessment

### Code Organization

**Rating:** Strong
**Notes:**
- **One rule, one home (DEL-001).** The axis tick arithmetic sits in core, beside the value scale's, and shares `niceInterval`. The two rules differ only in how many intervals they aim at: 19 for an axis, 10 for a value scale. The file header names both rules.
  - `src/layout/kit/ticks.ts` is a pure re-export under the ticket's names, as `src/layout/kit/value-scale.ts:11-12` re-exports the value-scale arithmetic.
  - The validator and the layouts cannot drift apart, which is what the carried QR-005 hazard asked for.
- **The definition module is cohesive.** `src/core/definitions/axis.ts` holds the terms, the object spec with `ordered`, and the domain checks. After CR-002 the checks are split into a range part and a spacing part. Every issue goes through `createIssue`, and the work is constant.
- **`drawAxis` is one function of about 50 lines.** It has its own local `line` builder, as `src/layout/kit/value-scale.ts:67-77` and `src/layout/circle.ts:89` have theirs.
- **Dependency direction.** Core imports only core. The kit's `axis.ts` imports `format`, `scale`, `text` and `ticks` from the kit.
  - It also imports `TICK_LABEL_DROP` from the data graphs' value-axis module (`src/layout/kit/axis.ts:7`), so the generic axis depends on a data-graph module for one text-metric constant. `text.ts` or `title.ts` would be its natural home.
  - Not raised: tree-shaking drops the rest of that module (`"sideEffects": false`), and `tests/fixtures/scene-geometry.ts` imports the constant from the same place.
- **Considered and not raised:**
  - **`drawValueAxis` is not rebuilt on `drawAxis`.** Value axes draw one-sided ticks on a plot's edge and print supplied values. Sharing the code would tie two specifications' rules together.
  - **Rulers (an approved change).** `niceTicks` hard-codes the 100-tick limit, and `drawAxis` draws one tick length centred on the line. The code review recorded both as extension points. The rulers specification, still pending, will decide their shape (its OQ-001 and OQ-005), so adding parameters now would be a guess.
  - **Tree-shaking.** `axisProperties` is marked `/* @__PURE__ */`. `axisProperty` and `axisCheck` will be called inside definition builders marked `/* @__NO_SIDE_EFFECTS__ */`, as `src/core/definitions/line-graph.ts:114` does.
  - **`src/core/value-scale.ts` is now 466 lines holding two rules.** The header and the section doc comments keep them apart.

### Readability

**Rating:** Adequate
**Notes:**
- **The doc comments explain why.** They cite the reviews behind each rule (CR-001 to CR-007, QR-005, SEC-002) in the house style, and `@spec` sits on the line after each JSDoc.
- **The tick arithmetic is compact.** `multiplesIn` snaps an end to a multiple in value terms, and `AXIS_NOISE`'s comment says why.
- **One finding:** `path` holds a term, and `axisCheck` and `axisChecks` differ by one letter (QR-006).
- **Minor points that are not findings:**
  - `niceTicks`' doc comment still says "values are not rounded otherwise" (`src/core/value-scale.ts:416`). CR-007 asked for it to be corrected. Every tick is rounded to 12 significant digits by `onGrid` (QR-002).
  - `narrowRange` computes `width(min + width(min))` with a 1e-6 margin. That is a two-step fixed-point estimate, explained only as "widen a little past the first estimate". It is right (see Error Handling).
  - The `labels` option is a `ReadonlyMap<number, string>`, but since CR-007 it is scanned with a tolerance, not looked up by key. Two keys within a millionth of a spacing both match one tick, and the first one wins.
  - Test names: the `side` cases print "sit left the axis" and "sit right the axis" (`tests/layout/kit/axis.test.ts:107`). `expect(0.1 + 0.1 + 0.1).not.toBe(0.3)` (`tests/layout/kit/ticks.test.ts:89`) tests JavaScript's arithmetic, not the module.

### Error Handling

**Rating:** Adequate
**Notes:**
- **Validation.** Every issue carries its pointer and its readable term, and is built with `createIssue`.
  - `too_many_ticks` gets an arithmetic, finite count and a spacing that fits.
  - A too-narrow range is `out_of_range` with an end the caller can use (CR-003). I fuzzed it in memory: on 100,000 random too-narrow axes, and on 89,354 within 3 of ±1e9 (16,750 of them reported at `min`), every suggested end re-validates with no issue.
- **Layout.**
  - `niceTicks` throws a `RangeError` naming the spacing and the range. `drawableTicks` returns `undefined` for checks (CR-006).
  - `niceTicks`' guard misses a range too narrow to draw: it then returns eleven copies of the same tick (QR-005).
  - `drawAxis` relies on `fmt()`'s `RangeError` for a non-finite coordinate, the kit's single gate.
- **Checks read `description[path] as Axis`.** This is safe: the domain stage runs a check only when its top-level property is present and no failure touches its inputs (`src/core/validate/domain.ts:28`).

### Test Coverage

**Rating:** Adequate
**Notes:**

**Commands run at HEAD:**

| Command | Exit | Result |
|---|---|---|
| `pnpm lint` | 0 | `eslint .`, no output |
| `pnpm typecheck` | 0 | `tsc --noEmit`, no output |
| `pnpm test`, run as `npx vitest run --no-cache` (three times) | 0, 0, 0 | 45 files, 1,161 tests passed (17.8 s, 17.9 s, 17.8 s) |
| `npx vitest run --no-cache` on the three new test files, `--reporter=verbose` | 0 | 48 passed: 22 in `tests/core/axis.test.ts`, 12 in `tests/layout/kit/ticks.test.ts`, 14 in `tests/layout/kit/axis.test.ts` |
| `pnpm build` | 0 | ESM and DTS "Build success" |
| The unmodified `tests/layout/kit/ticks.test.ts` under a scratch Vitest config pinning fast-check's seed: 688540770 | 1 | 1 failed, 11 passed: QR-001 |
| The same, seed 1637249691 | 1 | 1 failed, 11 passed: QR-001 |
| The same, seed 42 | 0 | 12 passed |

- **How the commands ran.**
  - `--no-cache` keeps Vitest from writing its results cache; otherwise the command is `pnpm test` (`vitest run`).
  - The test run's global setup (`tests/setup/build.ts`) and `pnpm build` rewrite the gitignored `dist/`.
- **Not run.**
  - `pnpm generate` writes source, and `pnpm size` writes to the system temp directory; I was asked to skip both.
  - The delivery record's other commands (`bench`, `check:*`, `publint`, `attw`, `audit`) are not among `.gener8v/context.md`'s verify commands. The code review re-ran them when it was resolved.
- **How the probes ran.** Probes ran in memory from the repository root (`tsx -e`). Mutants are copies of one source file in the session scratchpad. A scratch Vitest config's `resolveId` plugin swaps each mutant in for the real module and runs the unmodified test files against it. No repository file was edited.

**What the tests cover well:**
- **Overall.** 48 tests, eight of them fast-check properties. Their names state behaviour and cite requirement and review IDs.
- **Validation**, through `validateWith` with a test-only definition of two axes built from the real group:
  - a missing end on either axis, at that axis's path;
  - the accepted ranges, including ±1e9, and the structural bounds;
  - a reversed range reported once;
  - CR-002's independence, in three combinations;
  - CR-003's suggestions re-validated on six ranges, including both limits;
  - `too_many_ticks`, with its message, and its suggested spacing re-validated;
  - exactly 100 ticks accepted, and a spacing of 1e-300 counted.
- **Ticks:**
  - multiples anchored at zero, and the empty list;
  - CR-001's far-from-zero cases;
  - zero always ticked, and never written as −0;
  - each tick as `k × spacing`;
  - the default spacing on familiar ranges;
  - the decimals of tick labels;
  - `drawableTicks` on nine axes that cannot be drawn.
- **`drawAxis`:**
  - node order, and tick positions on three orientations (a property);
  - ticks perpendicular to the line and centred on it;
  - `fmt()` on every number, and `checkScene`;
  - hidden labels;
  - custom labels, including ⅔.

**Gaps, measured with probes and mutants:**
- **QR-001.** The multiples property fails on correct code in about 1 run in 100.
- **QR-002.** No test uses a given spacing on an axis far from zero, where the 12-digit rounding moves ticks.
- **QR-003.** Interval counts from 11 to 18 pass every test.
- **QR-004.** `isTickValue` is never shown refusing a value.
- **QR-007.** Label placement survives mutation, and nothing checks labels against the axis line.

**Property stability.** Each property is replicated assertion for assertion and run with fresh seeds, as the suite runs it:

| Property | Runs per invocation | Invocations | Failed |
|---|---|---|---|
| `tests/layout/kit/ticks.test.ts:25` multiples | 300 | 3,200 | 30 (0.94%): QR-001 |
| `tests/layout/kit/ticks.test.ts:56` far from zero | 500 | 3,200 | 0 |
| `tests/layout/kit/ticks.test.ts:73` zero ticked | 200 | 1,200 | 0 |
| `tests/layout/kit/ticks.test.ts:96` default spacing | 500 | 1,200 | 0 |
| `tests/layout/kit/ticks.test.ts:167` labels join back | 200 | 1,200 | 0 |
| `tests/layout/kit/axis.test.ts:42` positions: horizontal, vertical, diagonal | 100 each | 1,200 each | 0 |

**Mutation results** (in memory, against the unmodified test files):

| Mutation | Result |
|---|---|
| `AXIS_DEFAULT_INTERVALS` = 11, 12 … 18 | survives all 48 tests on five seeds each: QR-003 |
| `AXIS_DEFAULT_INTERVALS` = 10 | caught by the pinned −3.5..7.25 case only |
| `AXIS_DEFAULT_INTERVALS` = 20, 21, 22 | caught by the 20-tick bound |
| `isTickValue` tolerance 0.1 or 0.49 of the spacing | survives, three seeds each: QR-004 |
| `isTickValue` as exact equality | caught (`tests/layout/kit/axis.test.ts:96-100`) |
| `reach = 0`, or `reach`'s two components swapped | survives, two seeds each: QR-007 |
| tick normal fixed at (0, 1) | caught (`tests/layout/kit/axis.test.ts:61-70`) |
| ticks as a running sum, uncleaned; ticks without `onGrid` | caught by two to four tests |
| ticks as a running sum, cleaned by `onGrid` | survives. Within 100 ticks the cleaning absorbs the drift, so the output is the same. Not raised |

**Considered and not raised.** `tests/core/axis.test.ts:93-99` asserts a 50 ms wall-clock bound. The circle's 2,000 ms bound was removed for flakiness (`b48d1a4`), but this call measures 1 ms cold and 0.02 ms warm, so the margin is 50 times. `tests/core/categories.test.ts:348` and `tests/core/validate-structure.test.ts:574` use the same pattern.

### Observability & Operability

**Rating:** Adequate
**Notes:**
- **This is a library** with no runtime network, no telemetry (`.gener8v/context.md`) and no logger in `src`. A pure tick and axis module should not log, and this one does not.
- **Validation failures are issues** with a pointer, a readable term, and a message that says what would make the value acceptable. Examples: "would draw 201 ticks, more than the limit of 100; use a larger tick spacing, such as 0.2", and a too-narrow range answered with an end that re-validates.
- **A layout bug surfaces as a `RangeError` naming its numbers,** from `niceTicks` or `fmt()`. It reaches callers as `internal_error`, the established GSV TICKET-002 SEC-003 design. `drawableTicks` is silent by design: it is for checks, which skip such an axis.
- **A property failure prints its seed and counterexample,** so a red CI run can be reproduced. QR-001 used that.

Nothing to flag.

## Findings

### QR-001: The multiples property fails on correct code in about 1 run in 100

**Category:** Testing
**Severity:** Concern
**Location:** `tests/layout/kit/ticks.test.ts:25-48`: `steps` drawn from 1 at `:27`, the spacing at `:30`, the "none missing" assertions at `:43-44`
**Description:**
- With `steps` = 1, the spacing is the span rounded to three significant digits, and that can round up past the span: 970.5 becomes 971.
- A range narrower than its spacing may then hold no multiple at all, and `niceTicks` correctly returns `[]`.
- The assertions at `:43-44` read `ticks[0] ?? Infinity` and `ticks.at(-1) ?? -Infinity`. An empty list therefore fails "missing none at either end", though no multiple is missing.

**Evidence:**
- **Under Vitest, unmodified.** I ran the test file under a scratch config whose setup file pins fast-check's global seed.
  - Seed 688540770 fails: `expected Infinity to be less than 0.00101000100000101`, counterexample `[0.00100500000000101,1.0100000000000002e-15,1]`. That is 0.000000000000001 to 0.001005 by 0.00101, with no multiple inside.
  - Seed 1637249691 fails: counterexample `[-9.710000000000003e-10,-970.500000000971,1]`. That is −970.5 to −0.000000001 by 971.
  - Seed 42 passes.
- **Frequency.** I replicated the property assertion for assertion and ran it 3,200 times with fresh seeds, 300 runs each, as the suite runs it.
  - 30 invocations failed (0.94%). Every one failed at "none missing at min", with `steps` = 1.
  - `pnpm test` runs it once, so about one suite run in 100 goes red with no code change.
  - The delivery's three green runs, the code review's three and my three fit that rate.
- **The other seven properties** in the three files did not fail in 1,200 to 3,200 invocations each.

**Impact:**
- CI goes red at random on correct code, in the property that is the evidence for acceptance criterion 6.
- The message, "expected Infinity to be less than …", reads like a dropped tick, a real bug in `niceTicks`. It invites a re-run habit or a blind loosening of the assertion, the hazard GSS TICKET-001 QR-001 named.

**Recommendation:**
- Make the "none missing" check hold for an empty list. When `ticks` is empty, assert that no multiple lies in the range: `Math.ceil(min / spacing) * spacing > max - tolerance`. Otherwise keep the two bounds. Probe: 0 of 3,000 invocations fail.
- Or draw `steps` from 2, so the spacing stays below the span and a multiple always lies inside. Probe: 0 of 3,000 invocations fail.
- The first option keeps empty ranges in the property's domain. Today only `niceTicks(0.2, 0.8, 1)` (`:22`) covers them, once.

**Status:** Resolved
**Resolution:** Fixed — when no tick falls in the range, the property asserts that no multiple fits it, using the rule's own decimal-noise allowance; otherwise it checks the ends as before. 20,000 runs on each of seeds 688540770, 1637249691, 42, 7 and 99 pass. Approved by the user, 2026-10-20.

---

### QR-002: Ticks are rounded to 12 significant digits of their own size, coarser than the narrowest axis the validator accepts, so far from zero they move off their multiples

**Category:** Maintainability
**Severity:** Concern
**Location:**
- `src/core/value-scale.ts:71` (`cleanDecimal`, 12 significant digits), `:82` (`onGrid`), `:431` (every axis tick goes through `onGrid`);
- `src/core/value-scale.ts:368` (`isTickValue`, a millionth of the spacing), `:357` (`AXIS_NOISE`), `:389-391` (`axisTooNarrow`, with `SCALE_RESOLUTION` at `:35`);
- the tests: `tests/layout/kit/ticks.test.ts:12` and `:56-69`, `tests/layout/kit/axis.test.ts:42-59`.

**Description:**
- **Four tolerances, none derived from another.** The axis rule uses:
  - `SCALE_RESOLUTION`: a valid range may be as narrow as 1e-9 of its larger end;
  - `AXIS_NOISE`: an end counts as on a multiple within 1e-12 of its size;
  - `cleanDecimal`, through `onGrid`: every tick is rounded to 12 significant digits of its own size;
  - `isTickValue`: a custom label matches a tick within 1e-6 of the spacing.
- **They do not fit together.** Up to 100 ticks on the narrowest valid range means a spacing of about 1e-11 of the ends. Twelve significant digits cannot hold that, so on such an axis rounding can move a tick by a large share of a spacing.
- **Probes on axes that validate with no issue:**
  - **`{ min: 100000000, max: 100000000.2, tickSpacing: 0.0025 }`.**
    - `niceTicks` lists 100000000, 100000000.002, 100000000.005, 100000000.008, 100000000.01, 100000000.013, …, and the gaps alternate between 0.002 and 0.003.
    - The tick at 100,000,000.0025 is listed, and labelled, "100000000.002". That is 20% of a spacing off, and it is drawn 0.9 units from its place on a 360-unit axis.
  - **`{ min: 1000000, max: 1000002, tickSpacing: 1/3 }` with a custom label at 1,000,000⅔.**
    - The tick is listed as 1000000.66667, 3.3e-6 away from the label's value, and `isTickValue` allows 3.3e-7.
    - So `drawAxis` prints "1000000.66667" in place of the label. TICKET-002's check is tied to the same rule by its Known Hazard, so it would report the label as `tick_label_not_on_tick`, though 1,000,000⅔ is a tick.
    - The same axis starting at 100,000 is exactly at the limit; starting at 0 or 10,000, the label is drawn.
    - The CR-007 fix therefore holds only while an axis's ends are within about 3 × 10⁵ spacings of zero.
  - **198,097 random valid axes near the narrow-range floor** (widths 10⁻⁹ to 10⁻⁵ of the larger end, ends up to ±1e9):
    - with a given spacing of 1 to 3 significant digits (102,058 axes), 2,110 (2.1%) have a tick more than 0.5 units from its multiple on a 360-unit axis. The worst is 1.40 units: −1,035,716.8143938701 to −1,035,716.8131633442 by 0.0000216;
    - on the same axes, 11,067 (10.8%) print a label that misstates its tick by more than a thousandth of the spacing;
    - with the default spacing (96,039 axes), none. A spacing of 1, 2 or 5 × 10ⁿ never needs more than 11 significant digits on a valid axis.
- **The tests cannot see it:**
  - the multiples property keeps its ends within ±10⁶ (`tests/layout/kit/ticks.test.ts:12`), where spacings of three significant digits fit in 12 digits;
  - the far-from-zero property (`:56-69`) checks only that ticks lie inside the range;
  - the position property (`tests/layout/kit/axis.test.ts:42-59`) uses the default spacing and compares each tick with its own listed value.

**Impact:**
- **Wrong figures from valid descriptions.** The validator accepts descriptions that draw a number line whose labels state wrong numbers, with uneven gaps between ticks.
- **Custom labels wrongly refused.** A custom label exactly on a tick is not drawn, and TICKET-002's check, bound to the same rule, would report it as off-tick. CR-007 was fixed to remove exactly that mismatch between a label's value and its tick.
- **How likely.** The axes involved are far from classroom use: an end 10⁵ to 10⁹ spacings from zero. That is the same territory as CR-001, which was fixed.
- **Downstream.** TICKET-002 to TICKET-004 inherit the tick list. TICKET-005's geometry tests compare against it, so they would not catch this either.
- **Maintenance.** The next change to any one tolerance means rediscovering how the four interact, because nothing states it.

**Recommendation:**
- **Round each axis tick relative to its spacing, not to its own size.** For example, round to a billionth of the spacing, within what a double holds: `Number(x.toFixed(9 - Math.floor(Math.log10(spacing))))`. In a probe over the same 198,097 axes, that rule:
  - gives no tick 0.5 units off and no wrong label;
  - still gives 0.3 for 3 × 0.1, and 0.9 for 3 × (0.1 + 0.2);
  - matches the 1,000,000⅔ label.
- **Change the axis path only.** The data graphs' `valueTicks` shares `onGrid` (`:190`). The CR-007 test's expected labels (`"0.333333333333"`, `tests/layout/kit/axis.test.ts:99`) will change with the new rule.
- **State how the tolerances relate** in one comment beside `AXIS_NOISE`.
- **Test the domain.** Add a property with given spacings of 2 to 4 significant digits, ends up to ±`AXIS_LIMIT`, and widths near the narrow-range floor. Assert that each tick is within a thousandth of a spacing of `k × spacing` (allowing a few ulps at its size) and that each label joins back to it. Add the two examples above as unit cases.

**Status:** Resolved
**Resolution:** Fixed — `axisTick` (`src/core/value-scale.ts`) cleans each tick at the spacing's own decimals plus three, not at 12 significant digits, so 1e8 to 1e8+0.2 by 0.0025 ticks 100000000.0025 and labels it so. A property test over ranges up to ±1e9 checks every tick's label states its true value. The data graphs keep `onGrid`. Approved by the user, 2026-10-20.

---

### QR-003: The default-spacing rule is not pinned: any interval count from 11 to 18 passes every test

**Category:** Testing
**Severity:** Suggestion
**Location:** `src/core/value-scale.ts:350` (`AXIS_DEFAULT_INTERVALS`); `tests/layout/kit/ticks.test.ts:95-106` (the property), `:108-115` (the pinned ranges)
**Description:**
- **The constant is the rule.** `AXIS_DEFAULT_INTERVALS` (19) picks the smallest 1, 2 or 5 × 10ⁿ giving at most 19 intervals. Its doc comment and `niceTicks`' promise 7 to 20 ticks.
- **The tests are looser.** The property asserts the ticket's 5 to 20 ticks, and the six pinned ranges get the same spacing for every count from 11 to 19.
- **In-memory mutation.** I ran the unmodified test files against a copy of `src/core/value-scale.ts` with the constant changed, swapped in by a scratch Vitest config, on five seeds each:
  - 11, 12, 13, 14, 15, 16, 17 and 18 pass all 48 tests;
  - 10 fails only the pinned −3.5..7.25 case;
  - 20, 21 and 22 fail the 20-tick bound.
- **The change would be visible.** With 12 intervals, a 0..30 line gets a spacing of 5 (7 ticks) instead of 2 (16 ticks), and 0..15 gets 2 instead of 1.

**Impact:** The ticket's Notes ask for this documented rule to be pinned "so a later change is visible". A change that tuned the count would change most default number lines and still pass.
**Recommendation:**
- **Pin the boundary, where every other count differs:** `niceTicks(0, 19).spacing` is 1, and `niceTicks(0, 19.5).spacing` is 2. A probe shows that every count from 10 to 18 and from 20 to 25 changes one of the two.
- **Assert the documented 7-tick floor in the property** (`toBeGreaterThanOrEqual(7)`). The code review found 7 to 20 ticks over 400,000 ranges.

**Status:** Resolved
**Resolution:** Fixed — tests pin `niceTicks(0, 19)` to spacing 1, `niceTicks(0, 19.5)` to 2, and `AXIS_DEFAULT_INTERVALS` to 19; setting it to 15 now fails two tests. Approved by the user, 2026-10-20.

---

### QR-004: `isTickValue` is tested only for what it accepts, though TICKET-002 will report what it rejects

**Category:** Testing
**Severity:** Suggestion
**Location:** `src/core/value-scale.ts:368` (`isTickValue`); `tests/layout/kit/axis.test.ts:91-100`
**Description:**
- **It is a shared rule.** `isTickValue` is "the one rule for custom tick labels, drawn and checked". `drawAxis` uses it to match labels to ticks. TICKET-002's Known Hazard makes the `tick_label_not_on_tick` check (NLC-REQ-020) use it to decide what to report.
- **The tests show only acceptance:** 0.5 on a grid of quarters, and ⅔ against 0.666666666667. No test shows a value off a tick being refused.
- **In-memory mutation.**
  - With the tolerance widened from a millionth of the spacing to a tenth of it, or to 0.49 of it, all 48 tests pass on three seeds each.
  - Under the 0.49 mutant, `isTickValue(0.6, 0.5, 0.25)` is true, while the delivered rule gives false. A label at 0.6 on a grid of quarters would be drawn at the 0.5 tick, and the check would accept it.
  - Exact equality is caught, by the CR-007 test.

**Impact:**
- The tolerance decides between drawing a custom label at a tick and reporting it as off-tick. A widened tolerance would silently move labels to the nearest tick: a wrong figure from a description that looks valid.
- TICKET-002's tests inherit the gap unless they add the case.

**Recommendation:**
- Add the rejecting side here, where the rule lives. On a 0.25 spacing, a value two millionths of a spacing from a tick is refused, and one half a millionth away is accepted.
- Add a `drawAxis` case where a label at 0.6, on 0..1 by 0.25, is not drawn.

**Status:** Resolved
**Resolution:** Fixed — tests check that `isTickValue` rejects values a hundredth of a spacing away, and that `drawAxis` then draws the numeric label; a 0.49-spacing tolerance now fails two tests. Approved by the user, 2026-10-20.

---

### QR-005: Whether an axis can be drawn is decided twice, and the two answers differ

**Category:** DRY
**Severity:** Suggestion
**Location:** `src/core/value-scale.ts:422-433` (`niceTicks`, its guard at `:426`), `:440-447` (`drawableTicks`)
**Description:**
- **The check is repeated.** `drawableTicks` checks the conditions under which `niceTicks` would throw, then calls `niceTicks`, which checks them again. `multiplesIn` runs twice per `niceTicks` call (once directly and once in `tickCount`), and four times per `drawableTicks` call.
- **The two checks differ.** `drawableTicks` also refuses non-finite ends and a range too narrow to draw (`axisTooNarrow`); `niceTicks` refuses neither.
- **Probe.** `niceTicks(1000000, 1000000.000001)` returns spacing 1e-7 and eleven ticks, every one of them 1000000. `drawAxis` then stacks eleven "1000000" labels at one point. `drawableTicks` returns `undefined` for the same axis.
- **The doc comment says otherwise.** `niceTicks`' doc says an axis the validator would refuse "is a layout bug and throws", and the validator refuses this one.

**Impact:**
- The two guards must change together, and they already disagree.
- A layout that meets an axis it should not, for example in a type that forgets `...axisCheck`, gets a collapsed drawing instead of the `RangeError` that becomes `internal_error`.

**Recommendation:**
- Write one private function, for example `axisTicks(min, max, spacing?)`, holding `drawableTicks`' guard and the tick loop. It returns the ticks, or `undefined`.
- `drawableTicks` is that function, and `niceTicks` throws when it returns `undefined`.
- The throw then covers every axis the validator refuses, and `multiplesIn` runs once.

**Status:** Resolved
**Resolution:** Fixed — `drawableTicks` is the one decision and lists the ticks; `niceTicks` returns its result or throws. 1e6 to 1e6+1e-6 now throws in `niceTicks`; tested. Approved by the user, 2026-10-20.

---

### QR-006: `path` holds a term in the axis definitions, beside a `tooManyTicks(path, term)` whose `path` is a JSON Pointer

**Category:** Naming
**Severity:** Suggestion
**Location:** `src/core/definitions/axis.ts:88-97` (`narrowRange`), `:112-129` (`axisChecks`, `axisRangeIssues`, `axisSpacingIssues`), `:136-149` (`axisCheck`); `src/core/value-scale.ts:201` (`tooManyTicks`)
**Description:**
- **In `src/core/definitions/axis.ts`, `path` is a top-level term** such as "xAxis". The code turns it into:
  - a pointer, `pointer(path, "max")` → "/xAxis/max";
  - a readable term, `${path}.max`;
  - an `inputs` entry, `${path}/min`;
  - a key, `description[path]`.
- **In `tooManyTicks`, `path` means the pointer itself** ("/xAxis/tickSpacing"), and the term is a separate argument. It is in the same delivery.
- **Two exports differ by one letter.** `axisCheck` (singular) returns two `DomainCheck`s; `axisChecks` (plural) returns `Issue`s.
- **The codebase's word for this argument is `term`:** `axisProperty(term, name)` in the same file, and `valuesPerCategoryCheck(term = "values")` (`src/core/definitions/categories.ts:226`).

**Impact:**
- A reader of `narrowRange` sees a path concatenated into a term.
- A caller who takes `path` at its word and passes "/xAxis" gets `inputs` with a leading slash, which the definitions test catches, and pointers such as "/~1xAxis/max".
- Three tickets will call these functions.

**Recommendation:**
- Rename the parameter to `term` throughout `src/core/definitions/axis.ts`.
- If the exported names change too, for example to `axisDomainChecks(term)` and `axisIssues(term, axis)`, update the Known Hazards in TICKET-002 to TICKET-004 and the record's Notes, which cite `...axisCheck("xAxis")`.
- `axisChecks(path, axis)` is the ticket's own Output name, so renaming the parameter is the cheaper change.

**Status:** Resolved
**Resolution:** Fixed — the axis definitions' parameter is `term`, and `axisCheck` is renamed `axisDomainChecks`; `axisChecks(term, axis)` keeps the ticket's name. The Known Hazards on NLC TICKET-002..004 name the new function. Approved by the user, 2026-10-20.

---

### QR-007: Label placement off horizontal and vertical axes is claimed but not tested, and labels can cross the axis line

**Category:** Testing
**Severity:** Suggestion
**Location:** `src/layout/kit/axis.ts:49-58` (the doc: "the same call draws … a diagonal axis of an x,y,z graph"), `:70-71` (`reach`), `:87-94` (label positions by `side`), `:9-10` (`AxisSide`); `tests/layout/kit/axis.test.ts:102-118`
**Description:**
- **How labels are placed.** `side` is a page direction, and each label is offset straight down, up, left or right of its tick. `reach` adds how far the tick extends in that direction, "so the label clears it on a diagonal axis too".
- **The label test is too weak to see `reach`.**
  - It uses horizontal and vertical axes only, and asserts only that each label is clear of its tick.
  - `LABEL_GAP` (4) is larger than half a tick (3), so labels clear their ticks without `reach`.
  - In-memory mutation: `reach = 0`, and `reach` with its two components swapped, pass all 48 tests on two seeds each.
- **Nothing checks labels against the axis line.** Probes, with each label's box computed as `tests/fixtures/scene-geometry.ts` computes it:
  - on the test's own diagonal axis, (200, 200) to (40, 292.4):
    - over −1000..1000 with side `below`, "-1000", "-800", "-600", "-400" and "-200" cross the line;
    - over −10..10 with side `left`, 10 of 11 labels cross it;
  - on an isometric x axis (30° below horizontal, 150 units long):
    - with side `left`, 10 of 11 labels cross it on every range tried;
    - with side `below`, only "-100" crosses it, on −100..100;
  - on a vertical axis with side `below`, every label except the one at the bottom end sits on the line.

**Impact:**
- **The promised case has no consumer and no test.** The doc comment offers diagonal axes, and TICKET-004's x,y,z graph is the ticket that has them. But its Known Hazard routes tick labels through `placeLabel`, so the code review expected it to draw with `showTickLabels: false`.
- **No safety net.** A future change to `reach` or to the offsets can only be judged by eye.

**Recommendation:**
- **Say which sides suit which axes:** below or above a horizontal axis, left or right of a vertical one. For a diagonal axis, either place labels with `placeLabel` (TICKET-004's hazard) or offset them along the normal by their own extent.
- **Test what stays promised:** each label keeps `LABEL_GAP` from its tick's end, which pins `reach`, and clears the axis line.

**Status:** Resolved
**Resolution:** Fixed — `drawAxis` moves each label out by half its estimated width (or height) times the axis's slope, so it clears a sloping line. A test checks every label lies wholly on its side of the line, on two sloping axes for each of below, above, left and right; removing the term fails four tests. Approved by the user, 2026-10-20.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fixed | Empty-range case asserted, with the rule's allowance | `tests/layout/kit/ticks.test.ts` |
| QR-002 | Fixed | Ticks cleaned at the spacing's precision; property test near ±1e9 | `src/core/value-scale.ts`, `tests/layout/kit/ticks.test.ts` |
| QR-003 | Fixed | Default-spacing target pinned | `tests/layout/kit/ticks.test.ts` |
| QR-004 | Fixed | Rejections of `isTickValue` tested | `tests/layout/kit/ticks.test.ts`, `tests/layout/kit/axis.test.ts` |
| QR-005 | Fixed | `niceTicks` built on `drawableTicks` | `src/core/value-scale.ts`, `tests/layout/kit/ticks.test.ts` |
| QR-006 | Fixed | `term` parameter; `axisDomainChecks`; hazards updated | `src/core/definitions/axis.ts`, `tests/core/axis.test.ts`, NLC TICKET-002..004 |
| QR-007 | Fixed | Slope clearance for labels; sloping-axis test | `src/layout/kit/axis.ts`, `tests/layout/kit/axis.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (all 7 Resolved)
**Notes:**
- All seven findings fixed and re-verified. `pnpm generate` (no change), `lint`, `typecheck`, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size`, `publint`, `attw`, `audit` and `gener8v-state lint` exit 0. `pnpm test` (1,169 tests) exits 0 on three runs.
- Five deliberate breaks of the fixes, made against a passing baseline and restored from memory, each fail a test. The repaired property passes 20,000 runs on each of five seeds, including both that failed.
