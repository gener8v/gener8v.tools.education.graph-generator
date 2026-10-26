# TICKET-006: Keep floating-point noise out of axis tick labels when the tick spacing is computed — Security Review

## Summary

This review covers the delivery of `graph-library/number-lines-and-coordinate-graphs/TICKET-006`, delivery commit `db8f558` on branch `ticket/graph-library-nlc-006`. The source change is one line: `decimalPlaces` now counts the decimals of `cleanDecimal(Math.abs(spacing))` (12 significant digits) instead of the raw spacing. Three test files gain tests. The `security-reviewer` agent ran the findings phase in a fresh context on 2026-10-26.

The change adds no input, markup, dependency, network call or secret. Probed in memory, it holds on the points that matter for hostile input:
- **No new failure on hostile values.** `NaN`, ±`Infinity`, `0`, `-0`, subnormals, `1e-300` and `2e9` behave as before in `axisTickLabel` and `drawableTicks`. Nothing new throws, and `toFixed`'s precision is still capped at 100.
- **Labels never get longer.** A 12-significant-digit spacing never prints more decimals than the raw one. Across 200,000 random direct-call axes the longest label was 22 characters, against 23 before.
- **No tick is listed outside its range.** The range filter in `drawableTicks` still runs after rounding, so the NLC TICKET-001 SEC-001 guarantee holds.
- **Cost.** One million labels took 237 ms, against 259 ms before. The change adds no measurable cost.
- **Dependencies.** `pnpm audit` and `pnpm audit --prod` are clean. The manifest and lockfile are unchanged.

The one finding is an integrity regression the ticket's own hazard asked the delivery to rule out. Cleaning the spacing also coarsens the precision at which `axisTick` rounds each tick (`decimalPlaces + 3`). For a spacing with 13 or more significant digits, the end tick can then round past the range's noise tolerance and be dropped. The axis loses its end tick and label, and a description with a custom label at that end is no longer valid. The ticket said no description's validity would change.

One finding: 0 Critical, 0 High, 0 Medium, 1 Low, 0 Informational.

**Reviewer:** `security-reviewer` agent, fresh context (findings phase only, 2026-10-26)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/number-lines-and-coordinate-graphs-ticket-006-delivery.md` (DEL-001, DEL-002, Notes)

**Files Reviewed:**
- `src/core/value-scale.ts` (modified: `decimalPlaces`; read whole, because `axisTick`, `drawableTicks`, `niceTicks` and `axisTickLabel` take its result)
- `tests/layout/kit/ticks.test.ts`
- `tests/layout/number-line.test.ts`
- `tests/layout/bar-graph.test.ts`
- Read unchanged, because the changed value flows into them:
  - `src/core/format.ts` (`formatSupplied`, `plainDigits`)
  - `src/layout/kit/ticks.ts`
  - `src/core/definitions/axis.ts` (`axisProperties`, `axisChecks`)
  - `src/core/definitions/number-line.ts` (`numberLineTicks`, `customLabelsByTick`, `tickLabelsOnTicks`)
  - `src/layout/number-line.ts` (`numberLineLayout`: tick labels and end room)

Context read:
- the ticket and its Known Hazards;
- the delivery record;
- `.gener8v/constraints/prd.md` (CC-001..CC-004). There is no `constraints/number-lines-and-coordinate-graphs.md`;
- `.gener8v/technical-design/system-design.md` (AD-004, AD-007, AD-014);
- `.gener8v/context.md`. This is a library with no server, accounts or network calls, used by curriculum authors and by language-model tools;
- `.gener8v/CONVENTIONS.md`;
- NLC-REQ-004 and CPSE-REQ-043 in the specifications;
- the NLC TICKET-001 security review, for the threat model and earlier findings on this code. Its SEC-001 (no tick outside the range) and SEC-004 (helpers trust callers) are not raised again.

**Review environment note:**
- **How I probed:**
  - Every probe was an inline `TSX_DISABLE_CACHE=1 npx tsx -e '…'` run from the repository root. Probes imported `src/` directly and did not modify it.
  - To compare with the code before the change, I wrote the pre-change file (`git show db8f558~1:src/core/value-scale.ts`) to the scratch directory with its imports made absolute, and imported it alongside the current one.
  - The scratch directory held four probe scripts, their logs and that copy.
- **Runtime:** Node.js v24.1.0, pnpm 10.28.2, macOS (Darwin 25.6.0).
- **Commands run in the repository:**

| Command | Date (UTC) | Exit | Evidence |
|---|---|---|---|
| `pnpm audit` | 2026-10-26 17:58 | 0 | No known vulnerabilities found |
| `pnpm audit --prod` | 2026-10-26 17:58 | 0 | No known vulnerabilities found |
| `git diff db8f558~1 db8f558 -- package.json pnpm-lock.yaml eslint.config.js tsup.config.ts .github` | 2026-10-26 | 0 | empty: no manifest, lockfile, lint, build or CI change |
| `pnpm lint` | 2026-10-26 | 0 | — |
| `pnpm typecheck` | 2026-10-26 | 0 | — |
| `pnpm test --no-cache` | 2026-10-26 | 0 | 53 files, 1,481 tests passed. Its global setup runs `pnpm build`, which rewrites the git-ignored `dist/` |
| `pnpm check:dist` | 2026-10-26 | 0 | 18 built files scanned, no network APIs or modules |
| `pnpm check:deps` | 2026-10-26 | 0 | 0 runtime dependencies |

- **Not run:** `pnpm size`, `pnpm generate` and `pnpm bench`, as instructed.
- **Tree check:** `git status --short` before and after every command and probe showed only ` M .gener8v/pipeline-state.yaml`, ` M .gener8v/runs.jsonl`, the untracked sibling code and quality reviews for this ticket and `HANDOFF.md`, then this report once written.

**Findings:** 1
**Critical:** 0 | **High:** 0 | **Medium:** 0 | **Low:** 1 | **Informational:** 0

## Security Assessment

### Input Validation

**Status:** Gaps Found
**Notes:**
**Entry points:** `validate`, `normalize`, `describe` and `createGraph`, for a `number-line` description. Its `axis.tickSpacing`, `axis.min`, `axis.max` and `tickLabels[*].value` reach the changed function through `numberLineTicks` → `drawableTicks` → `axisTick` / `axisTickLabel`. Validation is unchanged:
- the ends are finite numbers within ±1e9 and must be ordered;
- the spacing is finite, at most 2e9, above 0, and gives at most 100 ticks (`src/core/definitions/axis.ts`).

The coordinate graphs (NLC TICKET-003, 004) will inherit the same path through `src/layout/kit/ticks.ts`.

**What the change does to hostile values** (probe 1, direct calls):
- `cleanDecimal` maps `NaN` to `NaN` and ±`Infinity` to `Infinity`, as `Math.abs` did before. `formatSupplied` prints them as before, and `axisTickLabel` still refuses a non-finite value with `RangeError`.
- On subnormal spacings (`5e-324`, `1e-310`), `cleanDecimal` returns the same subnormal, so the decimal count is unchanged and still capped at 100 by `Math.min(100, …)`.
- `drawableTicks` returned `undefined` for `(0, 1, 5e-324)`, `(0, 1, NaN)`, `(0, 1, Infinity)`, `(999999999, 1e9, 1e-9)` and `(0, 1e9, 1e7)`. It returned one tick for `(-1e9, 1e9, 2e9)`. Nothing threw. All of this matches the behaviour before the change.

**What holds** (probe 3):
- A spacing rounded to 12 significant digits never prints more decimals than the raw one. Over 200,000 random direct-call axes the longest label fell from 23 to 22 characters. The change can only shorten labels, which narrows the label-length exposure recorded in NLC TICKET-001 SEC-003 and SEC-004.
- Ticks never collide. Adjacent ticks stay at least 0.999× the spacing apart after rounding at `decimalPlaces + 3`.
- Everything `drawableTicks` lists is within `[min − noise, max + noise]`, because the filter (`src/core/value-scale.ts:450-454`) runs on the rounded tick.
- A number line whose only multiple is dropped draws with no ticks and no error. Probe 2 case D drew 5 nodes. So the drop below costs no availability.

**Gap: SEC-001.** Cleaning the spacing for its labels also coarsens the rounding of the tick values. An end tick can then fall outside the noise tolerance, so it is dropped, and with it any custom label at that end.

**Not applicable:** SQL, NoSQL, command and template injection, path traversal, and XSS. The change produces numbers and digit strings only. Text reaches the SVG through the unchanged escaping printer.

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** This is library code, with no server, accounts, sessions or permissions (`.gener8v/context.md`).

### Data Protection

**Status:** Adequate
**Notes:**
- **Sensitive data:** none. The changed code logs, stores and sends nothing.
- **Issues and errors:** the only new behaviour that reaches a caller is SEC-001's `tick_label_not_on_tick`. Like every issue, it quotes only a package-authored term and a number.
- **Secret scan:** I scanned the 36 lines that `git diff db8f558~1 db8f558 -- src tests` adds. The patterns:
  - keys, tokens, secrets and passwords;
  - URLs and `fetch`;
  - `eval` and `Function(`, `innerHTML`, `document.` and `window.`;
  - `console.`, `process.env`, `require(` and `import(`;
  - `__proto__` and `prototype`;
  - `Math.random` and `crypto`.

  Nothing matched.

### Configuration Security

**Status:** Adequate
**Notes:**
- **Manifest and tooling:** no change to `package.json`, `pnpm-lock.yaml`, `eslint.config.js`, `tsup.config.ts` or `.github/`.
- **Built package:** `pnpm check:dist` finds no network APIs or modules in the built files, and `pnpm check:deps` reports 0 runtime dependencies.
- **Dependencies:** `pnpm audit` and `pnpm audit --prod` (2026-10-26 17:58 UTC) report no known vulnerabilities.
- **Cryptography:** none in the change.
- **Logging:** none in the change.
- **Compliance cross-reference:**
  - **CC-001 (licences):** no dependency, asset or copied code added.
  - **CC-002 (WCAG 2.1 AA):** met. The text alternative is unchanged and still states the axis range and spacing as written. In SEC-001's case the drawing loses an end tick that the text alternative implies. That is a fidelity defect in the image, not a missing or non-equivalent text alternative, so it is not raised as a CC-002 violation.
  - **CC-003 (no data collection or transmission):** met. `pnpm check:dist` is clean and the change does no I/O.
  - **CC-004 (trademarks in images):** not applicable.

## Findings

### SEC-001: Cleaning the spacing coarsens tick rounding, so an end tick can be dropped and a valid description becomes invalid

**Severity:** Low
**Category:** Input Validation
**OWASP Reference:** A10:2025 Mishandling of Exceptional Conditions. Also CWE-1339 (insufficient precision or accuracy of a real number).
**Location:** `src/core/value-scale.ts:477-481` (`decimalPlaces`), read by `src/core/value-scale.ts:422-425` (`axisTick`) and filtered at `src/core/value-scale.ts:450-454` (`drawableTicks`); the validity effect is at `src/core/definitions/number-line.ts:182-196` (`tickLabelsOnTicks`)
**Description:**
`decimalPlaces` serves two callers:
- `axisTickLabel`, for how many decimals a label shows. This is the intended target of DS-001.
- `axisTick`, for the precision at which each tick value is rounded (`decimalPlaces(spacing) + 3`).

Cleaning the spacing to 12 significant digits fixes the labels, but it also lowers the tick rounding precision. For a spacing such as `0.29999999999958`, ticks were rounded at 17 decimals and are now rounded at 4.

`multiplesIn` admits an end as a multiple when `k × spacing` is within `1e-12` of it, relative. The filter in `drawableTicks` then keeps a rounded tick only if it lies within `1e-12 × max(|min|, |max|)` of the range. Rounding at `decimalPlaces + 3` moves the tick to the 12-digit grid value, which can be about `4e-13` relative beyond the raw multiple. That is enough to cross the filter, so the end tick is counted but not listed.

The ticket's Known Hazards asked the delivery to "confirm no tick is dropped from the end of a range". The property tests passed, but they do not generate spacings with more than 12 significant digits.

Reproduced (probe 2, case A and B) with `min: 0, max: 2.9999999999958, tickSpacing: 2.9999999999958 / 10`:
- `tickCount` is 11. The pre-change code listed 11 ticks, ending at `2.9999999999958`.
- The current code lists 10 ticks, ending at `2.7`. The drawn labels are `0 … 2.7` with no label at the end.
- The text alternative still reads "from 0 to 2.9999999999958, ticked every 0.29999999999958".
- The same axis with `tickLabels: [{ value: 2.9999999999958, text: "end" }]` was valid before the change, since the old ticks matched the label through `isTickValue`. It is now refused with `tick_label_not_on_tick` at `/tickLabels/0/value`.
- The mirrored axis (`min: -2.9999999999958, max: 0`) drops the tick at `min`.

How often (probes 2 and 3, 100,000 cases each):

| Inputs | Pre-change: fewer ticks listed than counted | Post-change |
|---|---|---|
| Spacing from short-decimal arithmetic (`a * b`, `a + b`, `a / b`), ends exactly `k × spacing` | 0 | 0 |
| `max` with 12 significant digits, spacing `max / n` | 0 | 0 |
| `max` with 13 significant digits, spacing `max / n` | 0 | 9 |
| `max` with 14 significant digits, spacing `max / n` | 0 | 10 |
| `max` with 15 significant digits, spacing `max / n` | 0 | 9 |
| Crafted: spacing within `5e-13` of a short decimal, end within `1e-12` of a multiple | 0 | 6,607 (5,920 of them would also invalidate a custom label at that end) |

The noise DS-001 targets (`0.1 * 3`, `0.7 / 7`) never triggers the drop. An ordinary "divide the range into n" computation on an end with 13 to 15 significant digits triggers it about once in 10,000. Crafted input triggers it at will.

**Attack Scenario:** No privilege is gained. The attacker is anyone who controls a description: an author, a content pipeline, or a prompt-injected language-model tool call (`.gener8v/context.md`).
1. They give a number line a spacing of 13 or more significant digits that sits within `5e-13` of a short decimal, and an end that is a multiple of it within the validator's tolerance, as in the reproduction.
2. The description validates.
3. The graph silently omits the end tick and its label, so a student reads a scale that stops one tick short of the range the text alternative states.
4. Alternatively, a stored description with a custom end label that rendered before this change now fails validation. A consumer that renders through `createGraph` gets the fallback (AD-014) instead of the graph.

This happens without any change to the description, and only because the package was upgraded.

The same outcome is reachable by accident on computed data (about 1 in 10,000 cases above), which is the more likely way it shows up.

**Impact:**
- **Integrity:** a drawn axis is missing its end tick and label. This contradicts NLC-REQ-004 ("ticks at every whole multiple of that spacing that lies within the axis range") and the text alternative.
- **Availability:** a previously valid description is now refused. This contradicts the ticket's statement that "the same descriptions are valid before and after, so CPSE-REQ-043 is not engaged".
- **Not affected:** confidentiality, and the guarantee that no tick is drawn outside its range.

**Recommendation:** Keep the noise removal in the labels only. Restore the tick rounding precision to the raw spacing's. For example:
- give `axisTick` the old count (`formatSupplied(Math.abs(spacing))`) through a second private helper or a parameter;
- keep `axisTickLabel` on the cleaned count.

Probe 4 checked this split: the old tick values with the new labels give:
- `["0", …, "2.7", "3"]` for the reproduction, with the end tick restored;
- `["0", "0.3", "0.6", "0.9", "1.2"]` for `0.1 * 3` and `0.1 + 0.2`;
- `["0", "0.1", "0.2", "0.3", "0.4"]` for `0.7 / 7`;
- unchanged `100000000.0025`-style labels for the QR-002 case.

Criterion 2 (identical scene nodes for `0.3` and `0.1 * 3`) would need re-running, since the tick values then differ by about `4e-17`. AD-007's `fmt()` rounding should make the emitted nodes equal.

An alternative is to keep the change and, in `drawableTicks`, decide membership on the raw multiple `k × used` that `multiplesIn` already accepted, listing the rounded value clamped to `[min, max]`. That keeps the NLC TICKET-001 SEC-001 guarantee.

Either way, add regression tests:
- `niceTicks(0, 2.9999999999958, 2.9999999999958 / 10).ticks` has 11 entries ending at the end, and its mirror;
- the number line with a custom label at `2.9999999999958` is valid;
- a property over spacings with 13 to 15 significant digits checks `drawableTicks(...).ticks.length === tickCount(...)` whenever both ends are multiples.

**Compliance Impact:** None. CC-002 was checked and is not violated; see Configuration Security. CPSE-REQ-043 (a specification requirement, not a CC constraint) is engaged if this ships in a release.
**Status:** Resolved
**Resolution:** Fixed as recommended (Security — Thomas Eaves, 2026-10-26). The count is split: `decimalPlaces` is back to the spacing as written, the precision `axisTick` rounds at, and a new `labelDecimals` cleans the spacing for `axisTickLabel` only. The reproduction now lists 11 ticks ending at `2.9999999999958` (and its mirror starts at `-2.9999999999958`); a custom label there validates; `0.1 * 3` still labels `0, 0.3, 0.6, 0.9, 1.2`. Regression tests: `tests/layout/kit/ticks.test.ts` "lists every tick it counts for a spacing longer than twelve significant digits, end ticks included", with the fixed cases and a 2,000-run property (a spacing within 5e-13 of a short decimal, an end within 5e-13 of a multiple), and `tests/core/number-line.test.ts` "accepts a label at the end tick of a spacing longer than twelve significant digits". With `axisTick` put back on the cleaned count, both fail; the property alone fails in 7 of 8 runs, and passed 15 of 15 runs on the fix.
**Resolution note:** The property first used ends anywhere within 1e-12 of a multiple. It then found a mismatch that predates this ticket: with a clean spacing of `57.8` and an end at `57.8 × 17 × (1 − 9.9992e-13)`, `tickCount` gives 18 and `drawableTicks` lists 17, because `multiplesIn` and the listing filter apply the 1e-12 tolerance to different magnitudes. The property was narrowed to 5e-13, which tests this finding. The edge is recorded as a Known Hazard on graph-library/number-lines-and-coordinate-graphs/TICKET-007, which adds a count-based check.

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Fixed | Tick rounding keeps the written spacing's precision; only labels use the cleaned count; regression tests added | No | `src/core/value-scale.ts`, `tests/layout/kit/ticks.test.ts`, `tests/core/number-line.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:** SEC-001 (Low) fixed and re-verified on 2026-10-26: tick rounding is unchanged from before NLC TICKET-006, and only label decimals use the cleaned spacing. A pre-existing tolerance mismatch between `tickCount` and `drawableTicks` at the 1e-12 edge was found while testing the fix and is carried to TICKET-007 as a Known Hazard. Dependency audit (`pnpm audit`, `pnpm audit --prod`) clean as of 2026-10-26.
