# TICKET-009: Choose a default tick spacing the drawn axis has room for — Security Review

## Summary

This review covers the delivery of `graph-library/number-lines-and-coordinate-graphs/TICKET-009` on branch `ticket/graph-library-nlc-009`, delivery commit `058d841`, diffed against `7359171`. No review has resolved anything on this ticket yet, so the code reviewed is the code as delivered. The `security-reviewer` agent ran the findings phase in a fresh context on 2026-10-27, in parallel with the code and quality reviews.

The delivery adds no new entry point, no new term and no new caller text. It changes how an existing input, an x,y graph with no `tickSpacing`, is turned into ticks and into its text alternative. `describe` and `xyGraphLayout` now both call `planeRooms(graph)`, which works out each axis's drawn length from numbers (`planeLengths`) and passes it to `fittedAxisSpacing`. The threat model is an adversarial description, written by a caller or by a model's tool call. Against that model the new code holds:
- **Work.** It is bounded.
  - The walk takes at most 5 turns on any range the validator accepts, each over at most 20 ticks. `MAX_FITS` (100) is a backstop.
  - `planeRooms` costs about 0.01 ms per call, and 0.09 ms in the worst case: 100 supplied ticks per axis with 21-character labels.
  - `createGraph` costs 0.10 ms on average (0.09 ms before), and the slowest of 60,000 fuzzed descriptions took 4.2 ms (2.7 ms before).
- **Thrown errors.** None.
  - 61,440 direct calls of `fittedAxisSpacing` with NaN, ±Infinity, negative, zero and huge arguments threw nothing.
  - Of 60,000 fuzzed descriptions, none gave `internal_error`.
  - No range the validator accepts and the default draws becomes undrawable with any room, so `niceTicks` gains no new way to throw.
- **Non-finite numbers.** `planeLengths` was finite and positive for every valid description, and no Scene held a non-finite value. `fittedAxisSpacing` returns `Infinity` only where `max − min` is itself not finite. `axisSpacing(min, max)` did the same before, and the validator bounds the ends to ±1e9.
- **Size of the text alternative.** The largest change was +2 characters against the pre-delivery text, so the size ceiling of TICKET-003 SEC-001 does not move.
- **Agreement.** `describe(input)` from `./core` equalled the Scene's `textAlternative` for all 22,686 valid fuzzed descriptions.
- **Prototype pollution.** Polluting `Object.prototype` with 22 keys, including `length`, `extent`, `textSize`, `tickSpacing`, `showTickLabels` and `yAxisLabel`, changed nothing.
- **Dependencies.** `pnpm audit` and `pnpm audit --prod` are clean, and the lockfile is unchanged.

One finding:
- **SEC-001 (Low):** the text alternative states a derived tick spacing of 0.005 as "ticked every 0.01" (`formatDerived`). The delivery record calls this "an older defect", and it does predate this delivery. However, the length-aware default now reaches 0.005 on ordinary descriptions that were stated correctly before, such as x 0..0.03 with y 0..0.03. The criterion-7 property test compares through `formatDerived`, so it accepts the misstatement. No ticket records the defect. On balance the delivery lowers how often the misstatement occurs: in the fuzz, 124 axes became wrong and 371 became right.

**Reviewer:** `security-reviewer` agent, fresh context (findings phase only, 2026-10-27)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/number-lines-and-coordinate-graphs-ticket-009-delivery.md`. I read the Pre-Flight Reconciliation, the Implementation Plan, the Verification Run, the Acceptance Criteria Verification, DEL-001..DEL-004, the Deviations, the Notes and the Post-Review Amendments (none).

**Files Reviewed:**
- `src/core/value-scale.ts`. New: `AxisRoom`, `tickLabelWidth`, `MAX_FITS`, `fittedAxisSpacing`. Modified: `axisSpacing`, `drawableTicks` and `niceTicks` gain an optional `room`.
- `src/core/definitions/xy-graph.ts`. New: `MAX_PLOT_HEIGHT` (moved here), `PLANE_ROOM`, `planeLengths`, `planeRooms`. Modified: `describe` states `axisSpacing(min, max, given, rooms[name])`.
- `src/layout/xy-graph.ts`. Re-exports `MAX_PLOT_HEIGHT`. `xyGraphLayout` passes `planeRooms(graph)` to both `niceTicks` calls.
- `src/core/definitions/axis.ts` (the published `tickSpacing` description).
- `src/generated/description.ts`, `src/generated/schema.json`, `src/generated/tool-schema.json`, `src/generated/vocabulary.json`. Regenerated; only the `tickSpacing` description sentence changed.
- `tests/layout/xy-graph.test.ts`, `tests/core/xy-graph.test.ts`, `tests/layout/kit/ticks.test.ts`
- `.changeset/xy-graph-default-tick-spacing-fits-axis.md`
- **Read unchanged, because the delivered code's values flow into them:**
  - `src/core/format.ts` (`formatSupplied`, `formatDerived`, `stateMeasurement`, `cleanText`);
  - `src/core/describe.ts` (`describe`, `describeWith`, `describeNormalized`);
  - `src/graph.ts` (`createGraphWith`, whose catch maps a throw to a bare `internal_error`);
  - `src/layout/xy-graph.ts` (`planeAxes`, `plotRoom`);
  - `src/core/index.ts`, `src/index.ts` and `package.json` `exports`. `fittedAxisSpacing`, `planeLengths` and `planeRooms` are internal and not exported from any public entry point.

**Context read:**
- **The ticket and its Constraints and Known Hazards:** prd/TC-001, prd/RF-001 and prd/CC-002; the one-decision hazard; the room bound; the fallback; and the `./core` budget at 40 kB.
- **`.gener8v/constraints/prd.md`** (CC-001..CC-004). No `constraints/number-lines-and-coordinate-graphs.md` exists.
- **`.gener8v/technical-design/system-design.md`.** The package is a library with no server, accounts, storage or network calls, and it may be server-rendered.
- **`.gener8v/CONVENTIONS.md`.**
- **The earlier security reviews in this change**, especially NLC TICKET-003 (SEC-001 on text-alternative size, SEC-002 on the CPSE TICKET-007 summary cap, SEC-003 on placement cost). Their resolutions and accepted risks are not raised again. This delivery does not move any of their figures.

**Findings:** 1
**Critical:** 0 | **High:** 0 | **Medium:** 0 | **Low:** 1 | **Informational:** 0

## Security Assessment

### Input Validation

**Status:** Adequate
**Notes:**

**Entry points.** These are unchanged: `createGraph`, `validate`, `normalize` and `describe` from `./core`, and the `description` prop of `<Graph>` and `<XyGraph>`.
- Validation is untouched by the diff. No domain check reads a room.
- The new code runs only on a description that has passed validation: in `describe` (`src/core/describe.ts`, `describeWith` validates first) and in `xyGraphLayout` (`src/graph.ts`, after `validateWith`).
- `planeLengths` and `planeRooms` read only the axes' `min`, `max`, own `tickSpacing` (`Object.hasOwn`) and `showTickLabels`, and the cleaned `yAxisLabel`. All of these are validated and bounded: ends to ±1e9, strings to 200 characters.

**Work bounds** (`src/core/value-scale.ts:449-476`):
- **The walk.** Each turn of `fittedAxisSpacing` coarsens the spacing at least 1.5 times through `niceInterval(spacing × 1.5, 1)`. The walk stops at the first spacing that clears, or when fewer than two ticks are left.
  - Over every pair of 18 validated extreme ends (±1e9, ±999999999.5, ±123456789.123, ±1e6, ±1000, ±1, ±1e-9, 0, …), with a length of 0 so that no spacing ever clears, the walk took at most 5 turns. The worst range was −1e9..−123456789.123.
  - Each turn lists at most 20 ticks, because the starting spacing is the range's default.
  - `MAX_FITS = 100` is a hard cap on top of that.
- **`planeLengths`.** It lists each axis's ticks once, at most `MAX_VALUE_TICKS` (100) per axis with a supplied spacing, and builds labels in a loop with no spread.
- **Measured** (`NODE_ENV=production`, Node 24.1 via `tsx`):

  | Operation | Time |
  |---|---|
  | `planeRooms`, default spacings | 0.0099 ms per call |
  | `planeRooms`, worst case (both axes at −999999999.5..−999999998.5, `tickSpacing: 0.0123456789`, 21-character labels, a 200-character y-axis label) | 0.092 ms per call |
  | `createGraph`, mean over 60,000 fuzzed descriptions | 0.10 ms after, 0.09 ms before |
  | `createGraph`, slowest of those | 4.15 ms after, 2.66 ms before |

- **Repeated work.** `planeRooms` runs twice per render, once in `describe` and once in the layout. It also runs when both spacings are supplied, where its result is ignored. The cost is negligible and not raised.

**Thrown errors.**
- `fittedAxisSpacing` was called 61,440 times directly. Every combination of `min` and `max` in {NaN, ±Infinity, 0, −0, ±1, 1e-300, 5e-324, ±1e9, ±1e308, 2e9, 120, 368} was tried, with `length` in {NaN, ±Infinity, −100, 0, 1, 120, 1e300}, `extent` in {NaN, −1, 0, 2.4, 14.4, Infinity} and `textSize` in {NaN, 0, 12, −12, Infinity}. None threw, and the slowest call took 0.58 ms.
- A range for which the validator admits ends and the default spacing draws never became undrawable with any room (0 cases). So `niceTicks` (`src/core/value-scale.ts:529-533`), whose throw becomes `internal_error`, gains no new way to fail.
- `axisTickLabel`'s throw on a non-finite value cannot be reached from the walk, because `drawableTicks` lists only finite ticks.
- `niceTicks(0, 1, undefined, { length: NaN, extent: NaN, textSize: NaN })` returns the coarsest spacing that still gives two ticks (1), without throwing.

**Non-finite numbers.**
- `fittedAxisSpacing` returns `Infinity` only where `max − min` is not finite: an infinite end, or ±1e308. The length-unaware `axisSpacing(min, max)` returned the same before this delivery, and `drawableTicks` refuses such a spacing.
- The validator's ±1e9 bound keeps such ends out. TICKET-004, which is to reuse the function, inherits that precondition.
- `planeLengths` was finite and positive for every valid fuzzed description. The smallest value, in the widest-label case above, was 135.16.
- A NaN or negative length does not throw. It makes nothing clear, so the walk falls back to the coarsest spacing that still gives two ticks.

**Fuzz** (two passes: 20,000 descriptions with seed 424242 and 40,000 with seed 7).
- The fuzz ran the new tree and the pre-delivery tree (`git archive 7359171 src`) side by side.
- Axis ends were drawn from extreme, near-degenerate and ticket-specific values: ±1e9, ±999999999.5, 5e-324, 1e-9 spans, 0.004..0.036, 177.8..1956, −24000..−18000, −78000000..−71500000, and others.
- Spacings were absent in about a third of axes, and otherwise 1, 0.1, `0.1 * 3`, 1e-9, 2e9, 2.5 or 0.005. About 15% of axes had hidden tick labels.
- Titles and axis labels were absent, empty, blank, 200 × `W`, 100 emoji or 50 words.

Of 60,000 descriptions, 22,686 were valid:

| Check | Result |
|---|---|
| `internal_error` | 0 |
| Non-finite Scene value, or `NaN`/`Infinity`/`undefined` in the text alternative | 0 |
| `describe(input)` from `./core` differs from the Scene's `textAlternative` | 0 |
| Description valid before this delivery and invalid now, or the reverse | 0 |
| Largest change in text-alternative length against the pre-delivery text | +2 characters |
| Axes with a default spacing that leaves fewer than two ticks | 1 before and 1 after (a pre-existing range for TICKET-007, not introduced here) |
| Axes whose stated default spacing differs from the drawn one | 187 per 40,000 after, 434 before; all at spacing 0.005 (SEC-001) |

**Prototype pollution.** `Object.prototype` was polluted with 22 keys, set non-enumerable before and after the modules load:
- the 16 keys of the NLC TICKET-003 probe;
- `length`, `extent`, `textSize`, `ratio`, `spacing` and `ticks`, which the new code reads from `AxisRoom` objects and returns.

Five descriptions were rendered through `createGraph` and `renderToStaticMarkup(<XyGraph>)`: the reported narrow case, the flat case, an x-axis-labelled flat case, and two general ones. Scene and markup were byte-identical to the clean run. `planeRooms` builds its rooms as own-property literals, and `tickSpacing` is read own-key (`src/core/definitions/xy-graph.ts:105`, `:331`; `src/layout/xy-graph.ts:371-372`).

**Markup and injection.** No new text reaches the Scene. Tick labels are still produced by `axisTickLabel` (digits, `-` and `.` only). `tickLabelWidth` counts any other character as a digit. It is used only for spacing decisions and never emits text. Caller text read by `planeLengths` goes only through `cleanText`, to test whether it is empty.

**Gaps:** the text alternative's accuracy at spacing 0.005 (SEC-001).

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** The package is a library with no accounts, sessions, tokens, server or network calls (`.gener8v/technical-design/system-design.md`). A description's author, whether a curriculum author or a model's tool call, is trusted only as far as the validator's bounds. Access control belongs to the consuming application.

### Data Protection

**Status:** Adequate
**Notes:**
- The delivered code collects, stores, transmits and logs nothing.
- The diff contains no `console`, `fetch`, storage API, `eval`, `new Function` or `dangerouslySetInnerHTML`.
- A throw in the layout still reaches the caller only as a bare `internal_error`, with no message or stack (`src/graph.ts`, `createGraphWith`). This delivery added no new way to throw.
- No PII is in scope.

### Configuration Security

**Status:** Adequate
**Notes:**
- No secrets, credentials, keys or environment reads.
- No dependency was added or changed: `package.json` and `pnpm-lock.yaml` are untouched by `058d841`.
- No public export was added. `fittedAxisSpacing`, `tickLabelWidth`, `AxisRoom`, `planeLengths` and `planeRooms` are internal, imported by path within the package.
- The published `tickSpacing` description, which a model reads through `tool-schema.json`, changed by one clause that describes the new rule. It adds no instruction-like text.
- Security headers and CORS do not apply to a component library.

**Dependency audit:** run 2026-10-27T21:06Z with pnpm 10.28.2:
- `pnpm audit`: "No known vulnerabilities found", exit 0.
- `pnpm audit --prod`: "No known vulnerabilities found", exit 0.

The delivery record's Verification Run reports the same result.

**Cryptography:** Not applicable. The delivered code uses no cryptographic or random functions.

**Logging and monitoring:** Not applicable. This is a library with no logging, and nothing is logged by the new code.

**Compliance cross-reference:** checked against `.gener8v/constraints/prd.md`. No per-area constraints file exists.

| Constraint | Result |
|---|---|
| prd/CC-001 (licenses of dependencies and assets) | Met: no dependency or asset added. The width figures (556, 333, 278 thousandths of an em) are three numbers from the layout's existing metrics, not a copied font table. |
| prd/CC-002 (WCAG 2.1 AA, non-text content) | **1.1.1: met but weakened (SEC-001).** Every Scene still carries the generated text alternative. `describe` and the layout call the same `planeRooms`, so they cannot disagree on which spacing is drawn, and `describe(input)` equalled the Scene's alternative in every fuzzed case. The weakness is in how the alternative words the spacing: a drawn spacing of 0.005 is stated as 0.01, which this delivery now reaches on more ordinary descriptions. **1.4.11 and 1.4.1:** unaffected, since no colors or markers changed. |
| prd/CC-003 (no data collected or transmitted) | Met: no network, storage or telemetry in the new code |
| prd/CC-004 (no trademarked imagery) | Not applicable: no images |

No CC-XXX violation was found, so no finding is raised to Critical. SEC-001's misstatement is limited to one spacing value, and the alternative is present and otherwise complete. So, as with earlier CC-002 findings in this change, it is recorded as weakening the control rather than violating it. The Security role should confirm that reading at resolution.

## Findings

### SEC-001: The text alternative states a drawn spacing of 0.005 as "ticked every 0.01", and the length-aware default now reaches 0.005 on ordinary descriptions that were stated correctly before

**Severity:** Low
**Category:** Input Validation
**OWASP Reference:** N/A. This is about the integrity of the accessibility output (prd/CC-002), not an OWASP Top 10:2025 category.
**Location:**
- `src/core/definitions/xy-graph.ts:332` (`describe`): `stateMeasurement(axisSpacing(min, max, given, rooms[name]), given === undefined ? "derived" : "supplied")`. A default spacing is stated as derived.
- `src/core/format.ts:53-60` (`formatDerived`): rounds to two decimals, so 0.005 becomes "0.01". Among the 1, 2 or 5 × 10ⁿ spacings an axis can draw, 0.005 is the only one this misstates. 0.002 and 0.0005 keep two significant figures, and 0.05 has two decimals.
- `src/core/value-scale.ts:460-476` (`fittedAxisSpacing`): can now walk from 0.001 or 0.002 to 0.005.
- `tests/layout/xy-graph.test.ts:430-433`: the criterion-7 property compares the stated value with `Number(formatDerived(spacing))`, not with the drawn spacing. It therefore passes for exactly the misstatement that criterion 7 forbids.
- `.gener8v/changes/graph-library/delivery/number-lines-and-coordinate-graphs-ticket-009-delivery.md:240`: the Notes call this "an older defect, for a ticket of its own". No ticket in `.gener8v/changes/graph-library/tickets/` records it.

**Description:**
Criterion 7 of the ticket says that, for every generated x,y description, "the number after 'ticked every' … equals the distance between that axis's neighboring tick values in the Scene". prd/CC-002 asks that the text alternative describe what the figure shows.

`formatDerived` predates this delivery, as does its effect on a range whose own default is 0.005. The delivery record is right about that. What is new is that the length-aware default moves some ordinary descriptions onto 0.005 from a spacing that was stated correctly.

Probe: `createGraph`, before (`7359171`) and after (`058d841`):

| Description | Before: drawn / stated | After: drawn / stated |
|---|---|---|
| x 0..0.03, y 0..0.03 | x every 0.002 / "ticked every 0.002" | x labels "0, 0.005, 0.01, 0.015, …" / **"x from 0 to 0.03 ticked every 0.01"** |
| y 0.5..0.53 beside a wider x range | y every 0.002 / "0.002" | y every 0.005 / **"0.01"** |
| x −0.01..2e-9 on a 120-wide plot | x every 0.001 / "0.001" | x every 0.005 / **"0.01"** |

On balance, the delivery reduces the defect. Over 40,000 fuzzed descriptions (seed 7), 434 default axes were misstated before and 187 after: 124 axes became newly wrong and 371 became newly right. Every mismatch, before and after, is a drawn 0.005 stated as 0.01. So the finding is not that the delivery made the alternative worse overall. It is that:
- the delivery's own acceptance test was written to accept the mismatch rather than detect it;
- it changes which descriptions carry the mismatch; and
- the only record of the defect is a note in the delivery record.

**Attack Scenario:** Not required for Low. The case is accidental rather than adversarial. A curriculum author graphs a small-value relationship on x 0..0.03 by y 0..0.03. A screen-reader user hears that the x-axis is "ticked every 0.01", so they count three ticks where a sighted student sees six labelled ones at 0.005. Exercises that ask students to read a point "two ticks right of zero" then have different answers for the two students. An adversary gains nothing beyond what an honest author already causes.

**Impact:** For one spacing value, the text alternative misstates the figure's tick spacing by a factor of 2. This degrades the equivalence that WCAG 1.1.1 asks of the alternative. Nothing is disclosed and nothing fails. The test suite as delivered would not catch a regression that widened the mismatch, for example a `formatDerived` change that also rounded 0.05.

**Recommendation:**
1. **State a default tick spacing exactly.** Every spacing the default can choose is 1, 2 or 5 × 10ⁿ with n ≥ −9, so its plain form is at most 11 characters ("0.000000001"). It can be stated through `formatSupplied`, or through `stateMeasurement` with a provenance that does not round, while keeping the word "derived" if provenance matters to the wording. The number line's `describe` has the same pattern and should change with it. Both are pure functions in `./core`, and the text alternative grows by at most a few characters.
2. **Compare exactly in the criterion-7 property.** Change `tests/layout/xy-graph.test.ts:432-433` to compare the stated value with the drawn spacing itself. Add a fixed case, x 0..0.03 with y 0..0.03, stated as "ticked every 0.005".
3. **If the fix is not made here, defer it to a named ticket.** Open the ticket the delivery record's Note asks for, or attach it to an open NLC ticket, and add a Known Hazard naming x 0..0.03 by y 0..0.03 as the reproducing case. Record the decision on the finding, so that the "older defect" note does not remain the only record.

**Compliance Impact:** prd/CC-002 (1.1.1) is weakened, not violated. The alternative is present for every graph and states every other value as drawn. The misstatement is confined to a drawn spacing of 0.005. The Security role may judge that a misstated value is a 1.1.1 failure; in that case this finding is elevated per the compliance rule.
**Status:** Fixed
**Resolution:** Engineer and Security — Thomas Eaves, 2026-10-27, as recommended, for both graph types.
- **Code:** `describe` of the x,y graph and of the number line now state a default tick spacing exactly (`stateMeasurement(…, "supplied")`), since a default is 1, 2 or 5 × 10ⁿ and at most 11 characters written out.
- **Tests:** the criterion-7 property in `tests/layout/xy-graph.test.ts` compares the stated spacing with the drawn one exactly, and the `formatDerived` import is gone. New fixed cases: x 0..0.03 by y 0..0.03 is drawn every 0.005 and says "ticked every 0.005" (`tests/layout/xy-graph.test.ts`), and a number line 0..0.05 says "ticked every 0.005" (`tests/core/number-line.test.ts`, whose test name no longer says "rounded").
- **Mutation checks:** restoring the rounding fails 2 tests for the x,y graph and 1 for the number line.
- **Effects:** no Scene's drawing changes. The text alternative changes only for a default of 0.005. A `Fixed:` changeset records it.

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Fixed | A default spacing is stated exactly in both `describe`s; criterion 7 compares exactly; 0.005 cases added | No | `src/core/definitions/xy-graph.ts`, `src/core/definitions/number-line.ts`, `tests/layout/xy-graph.test.ts`, `tests/core/number-line.test.ts`, `.changeset/default-tick-spacing-stated-exactly.md` |

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:** Resolved in the main session with the Security role, 2026-10-27. Re-verified after SEC-001: `pnpm generate`, lint, typecheck, `pnpm test` ×3 (1,580 passed), bench, build, `check:dist`, `check:deps`, `check:images`, `check:changesets`, publint, attw and both audits all exit 0. `./core` 25.12 kB of 40, `./xy-graph` 21.65 kB of 25, `./number-line` 19.98 kB of 25.
- **SEC-001 (Low)** is fixed: default spacings are stated exactly, and the criterion-7 property compares exactly.
- **Bounds hold.** Against adversarial descriptions, the new code adds bounded, sub-millisecond work. It adds no new throw, no non-finite output, no change in what validates, and at most +2 characters of text alternative.
- **Note for TICKET-004.** It is to call `fittedAxisSpacing` for slanted axes. A NaN or negative length does not throw: it silently gives the coarsest spacing that still leaves two ticks. Non-finite ends give `Infinity`, which `drawableTicks` refuses, so `niceTicks` would throw (`internal_error`). TICKET-004 should pass validated ends and a finite length.
- **Dependency audit:** `pnpm audit` and `pnpm audit --prod` (pnpm 10.28.2), 2026-10-27T21:06Z, both "No known vulnerabilities found", exit 0. The lockfile is unchanged by this delivery.
- **Tests:** `npx vitest run --no-cache` on `tests/layout/xy-graph.test.ts`, `tests/core/xy-graph.test.ts` and `tests/layout/kit/ticks.test.ts` gave 3 files and 103 tests passed. The project's global setup rebuilt the gitignored `dist/`.
- **Probe scripts** are kept outside the repository, in the session scratchpad (`sr009/`): `fuzz.ts` (new tree against the pre-delivery tree extracted by `git archive` into `sr009/old/`), `direct.ts` and `pollute.ts`.
