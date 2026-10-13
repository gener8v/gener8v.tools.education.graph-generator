# TICKET-001: Categories and value scale foundation — Quality Review

## Summary

I reviewed the categories and value-scale foundation at HEAD (`ba267ad`), which includes the code-review fixes on top of delivery commit `ce93ce9`. The production code is well organized. Its dependency direction is right, its names are clear, and the verify commands pass: lint, typecheck, 827 tests in 30 files, and the bench.

The findings are about what the tests leave unpinned and about how a partly given scale is resolved:
- ten mutations to the drawing geometry pass the whole suite;
- about half of realistic partly given scales resolve to axes whose tick labels overlap;
- the validator and the drawing count ticks with two hand-kept copies of one rule.

There are 9 findings: 0 Critical, 3 Concerns and 6 Suggestions.

**Reviewer:** `quality-reviewer` agent, fresh context (findings phase only, 2026-10-13)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/data-graphs-and-pictographs-ticket-001-delivery.md` (DEL-001..005, Post-Review Amendments CR-001..007)
**Code review read first:** `.gener8v/changes/graph-library/reviews/data-graphs-and-pictographs-ticket-001-code-review.md`. All seven CR findings are resolved and are not raised again. QR-002 concerns a consequence of the CR-001 resolution and QR-004 a gap in its fallback; each says how it differs.

**Files Reviewed:**
- `src/core/definitions/categories.ts`
- `src/layout/kit/value-scale.ts`
- `src/core/definitions/index.ts`
- `src/core/definitions/types.ts`
- `src/core/definitions/shared.ts`
- `src/core/issues.ts`
- `src/core/validate/structure.ts`
- `tests/core/categories.test.ts`
- `tests/layout/kit/value-scale.test.ts`
- `tests/core/definitions.test.ts`
- `tests/core/issues.test.ts`
- Read for pattern consistency, unchanged here:
  - `src/core/definitions/circle.ts`;
  - `src/core/validate/domain.ts`, `index.ts`, `state.ts` and `numbers.ts`;
  - `src/core/format.ts`, `src/core/style.ts`;
  - `src/layout/kit/labels.ts`, `title.ts`, `text.ts`, `format.ts` and `scale.ts`;
  - `src/layout/circle.ts`, `src/layout/scene.ts`;
  - `eslint.config.js`, `tsconfig.json`;
  - `.gener8v/changes/graph-library/tickets/data-graphs-and-pictographs/TICKET-001.md`, and the NLC TICKET-001 Output for the planned `src/layout/kit/ticks.ts`.

**Findings:** 9
**Critical:** 0 | **Concerns:** 3 | **Suggestions:** 6

## Quality Assessment

### Code Organization

**Rating:** Adequate
**Notes:**
- **Dependencies point the right way.**
  - The scale arithmetic sits in core, so the validator and the drawing share one rule, and the kit re-exports it (DEL-004).
  - `src/layout/kit/value-scale.ts` imports core and kit modules only, and core imports nothing from layout.
- **DEL-004's scoped maps are a clean generalization.** `propertiesOf` and `appliesToType` now read one list (`scopedPropertyMaps`), instead of `structure.ts` knowing about `sharedProperties`, and the definitions tests iterate both maps.
- **The domain checks are small, named, and built with `createIssue`.**
  - `categoriesCheck` and `tickIntervalCheck` are ready `DomainCheck`s with narrow `inputs`.
  - The scale check is not ready-made: each type wraps `checkValueScale` itself, and the test file's `scaleCheck` is the template TICKET-002 and TICKET-003 will copy. Leaving the wrapper to the type is defensible, because the value paths differ (`values/*` against `series/*/values/*`).
- **Weak spots:**
  - `categories.ts` (372 lines) holds categories, the scoped data-graph terms, and about 120 lines of value-scale arithmetic. The consolidation target named in the Notes is a layout module that core cannot import (QR-005).
  - The unused `categories` constant reaches every bundle (QR-008).
  - `valueAxisExtent` reports the room below a horizontal axis only. The end labels also reach half their width past the box's sides, which the type layouts must allow for. This is noted, not a finding.

### Readability

**Rating:** Adequate
**Notes:**
- **Names say what things are:** `niceInterval`, `dividingInterval`, `stepBeside`, `checkTickInterval`, `valueTicks`, `valueAxisExtent`, `categorySlots`. Constants are named and documented (`CATEGORY_LIMIT`, `VALUE_LIMIT`, `MAX_VALUE_TICKS`, `MIN_DEFAULT_INTERVAL`, `LABEL_GAP`, `MIN_NAME_WIDTH`). Doc comments explain why and cite the decision behind each rule, in the codebase's style.
- **`resolveValueScale` (`src/core/definitions/categories.ts:204-232`) is the densest code in the delivery.**
  - It has about twelve decision points in 28 lines, with `given?.` repeated ten times.
  - `step` names a provisional interval that sizes the ends, which a different interval then replaces when an end is given.
  - Two of the code review's seven findings (CR-001, CR-004) were defects in this interplay, and QR-002 shows one more consequence.
- **Text that misleads the reader:**
  - `drawCategoryNames`' doc does not match its horizontal placement (part of QR-001).
  - A test input hides an invisible character (QR-009).
  - `SharedPropertySpec` is still documented as "a presentation option" although it now types `valueScale` (QR-007).
- **Not findings:** long description strings (`categories.ts:92` is 312 characters) follow the circle definition's style.

### Error Handling

**Rating:** Adequate
**Notes:**
- **Description problems are reported, not thrown.** Every issue is built with `createIssue` and placed at a JSON Pointer:
  - an empty list is `missing_property`;
  - a repeated name is `duplicate_name`, with `conflicts`;
  - a bad interval is `tick_spacing_invalid` or `tick_interval_not_dividing`;
  - too many ticks is `too_many_ticks`, counted arithmetically;
  - an excluded value is `scale_excludes_value`, at the value's own path.
- **The new `duplicate_name` code** follows the `contradiction` template and is in both catalogue snapshots.
- **Drawing defects throw, as elsewhere in the kit.** `valueTicks` throws `RangeError` with the offending numbers, like `fmt()` and `wrap()`, so a bad scale never reaches markup.
- **Gaps:**
  - The CR-001 fallback interval underflows to 0, so one valid description makes the drawing throw (QR-004).
  - The new `emptyIsAbsent` flag is accepted where it yields an inconsistent valid description (QR-006).
- **A message detail, not a finding.** For an interval so small that the count overflows (`{ maximum: 1e9, tickInterval: 1e-300 }`), `too_many_ticks` says "would draw 9007199254740991 ticks". That is the `Number.MAX_SAFE_INTEGER` sentinel from `categories.ts:307`, not a count, though the suggested spacing (20000000) is right.

### Test Coverage

**Rating:** Adequate
**Notes:**

**Commands run at HEAD (`ba267ad`):**

| Command | Exit | Result |
|---|---|---|
| `pnpm lint` | 0 | `eslint .`, no output |
| `pnpm typecheck` | 0 | `tsc --noEmit`, no output |
| `pnpm test` | 0 | 30 files, 827 tests passed (4.46 s) |
| `pnpm bench` | 0 | GSV-NFR-001: circle p95 0.0221 ms over 15,707 runs; fixture types p95 0.0096–0.0357 ms; limit 5 ms |

- `pnpm test`'s global setup ran `pnpm build`, with ESM and DTS "Build success". That rewrote the gitignored `dist/`.
- `git status --short` afterwards showed only `.gener8v/runs.jsonl`, which the hooks write.
- `pnpm generate` writes source, so it was not run. The code review re-ran it, together with `size`, `publint`, `attw` and `audit`, at the fixes.

**What the tests cover well:**
- Each new file holds 36 tests after the code-review fixes. `tests/core/definitions.test.ts` and `tests/core/issues.test.ts` are extended.
- Every acceptance criterion has a test whose name describes it.
- The validator-level tests run through `validateWith` on a test-only registry of stand-in line, bar and pictograph definitions, so they test behaviour, not internals.
- Three property tests:
  - a 500-run test that the default scale includes every value;
  - a 1,000-run test that a partly given scale ends on a tick;
  - a 200-run test that every coordinate passes through `fmt()`.
- The underflow (5e-324) and decimal-noise cases (0.3 / 0.1, 2.5, 0.2 from 0.1) are pinned.

**Gaps, measured with mutations and probes:**
- **Harness.**
  - Mutations ran on a copy of `src/` and `tests/` in the session scratchpad, with the repository's own Vitest invoked by absolute path, and each file was restored after its run.
  - The suite run was 12 files and 296 tests: categories, all kit tests, definitions, issues, validate-structure and validate-domain.
  - The probes import the repository's source read-only from the scratchpad. They include a 200,000-run fuzz of given-part combinations against `checkValueScale`, `resolveValueScale`, `valueTicks` and `drawValueAxis`.
- **QR-001.** Ten mutations to tick, label and name placement survive. One of them removes `MIN_NAME_WIDTH`, the guard that keeps 100 categories drawable.
- **QR-002.** The tests pin a crowded result (`{ maximum: 17 }` gives interval 1) as intended. The CR-001 property checks the ends of the axis, not how many ticks it has.
- **QR-003.** The validator's tick count can lose its noise tolerance and the suite still passes, although the drawing then throws on a scale the validator accepts.
- **Also unpinned (not findings):**
  - `scale_excludes_value`'s `range` when the chosen minimum is not 0 (M15);
  - the 1 → 0.5 step of `stepBeside`'s finer sequence (M18).
- **A wall-clock bound.** `tests/core/categories.test.ts:299-301` asserts that one `validateWith` call takes under 100 ms. That is a wide margin over the roughly 0.1 ms the call takes. Still, the delivery record notes a wall-clock bound in `tests/layout/circle.test.ts` exceeded once under full-suite load. Listing about 1e309 ticks would time the test out at 30 s anyway.
- **What the fuzz found clean:** no given part was ever changed, and every accepted scale with curriculum-sized numbers draws. The two exceptions are QR-004, and labels that print a value's float noise when an end has more than 12 significant digits. The second needs absurd inputs, and the delivery Notes already ask the type tickets to bound value precision.

**Mutation results:**

| Mutation (on the copy) | Result |
|---|---|
| M1: vertical tick labels anchored `start`, so the text runs over the plot (`src/layout/kit/value-scale.ts:126`) | survives: QR-001 |
| M2: vertical tick labels placed right of the axis, inside the plot | survives: QR-001 |
| M3: vertical tick marks drawn inside the plot (`:124`) | survives: QR-001 |
| M4: horizontal tick marks drawn upward, into the plot (`:128`) | survives: QR-001 |
| M5: horizontal tick labels drawn above the axis, inside the plot (`:129`) | survives: QR-001 |
| M6: `MIN_NAME_WIDTH` floor removed (`:168`) | survives: QR-001. Throws at 100 categories |
| M7: vertical category names drawn at the top of the plot (`:196`) | survives: QR-001 |
| M8: horizontal category names drawn inside the plot (`:197`) | survives: QR-001 |
| M9: horizontal category names not centered on their slot (`:197`) | survives: QR-001 |
| M10: tick-label baseline offset removed (`:126`) | survives: QR-001 |
| M11: `valueTicks` without decimal-noise cleaning (`:54`) | caught (2 tests) |
| M12: CR-001 fallback interval `span` instead of `span / 10` (`src/core/definitions/categories.ts:176`) | caught (1 test) |
| M13: `dividingInterval`'s finer search capped at 10 intervals (`:173`) | caught (2 tests) |
| M14: `checkValueScale` counts ticks with `Math.floor`, no noise tolerance (`:302`) | survives: QR-003 |
| M15: `scale_excludes_value` range built from the given ends only (`:320`) | survives (minor) |
| M16: `checkCategories` compares names uncleaned (`:347`) | caught, only by the test in QR-009 |
| M17: no early return after `out_of_range` (`:298`) | caught (1 test) |
| M18: `stepBeside` steps 1 → 0.2 instead of 0.5 (`:157`) | survives (minor) |

### Observability & Operability

**Rating:** Adequate
**Notes:**
- **This is a library.** It has no runtime network, no telemetry by design (`.gener8v/context.md`), and no logger anywhere in `src`. The delivery adds none, which is right.
- **Description problems** surface as typed issues with JSON Pointers and messages a model can act on. `duplicate_name` names both positions.
- **Package defects in the drawing** (`valueTicks`, `fmt`, `wrap`) throw `RangeError` with the numbers involved. `createGraph` turns them into a cause-free `internal_error` (GSV TICKET-002 SEC-003). That is the established design, not this delivery's choice, and GSS TICKET-002 QR-006 already gave the layout tests a direct path to the exception.
- **Nothing in this delivery hides a failure.** The only "skip" is the `null` guard in `checkCategories`, documented as reachable from direct calls only.

## Findings

### QR-001: Where ticks, tick labels and category names are drawn is unpinned: ten geometry mutations pass the whole suite

**Category:** Testing
**Severity:** Concern
**Location:**
- Tests: `tests/layout/kit/value-scale.test.ts:140-239` (the `drawValueAxis` and `categorySlots` blocks).
- Code: `src/layout/kit/value-scale.ts:124-129` (tick marks and labels), `:168` (the `MIN_NAME_WIDTH` floor), `:185-197` (`drawCategoryNames`' doc and placement).

**Description:** What the tests assert, and what they leave out:
- They assert each label's text, the node counts, the order of names, the axis line's endpoints, `valuePosition`, the rounding by `fmt()`, and `valueAxisExtent`.
- They never assert where a tick mark, a tick label or a category name sits relative to the plot box.

On a scratch copy, each of these mutations passes all 296 tests of the affected files (table under Test Coverage):
- tick labels anchored so they run over the plot (M1), or placed inside it (M2, M5);
- tick marks drawn into the plot (M3, M4);
- category names drawn at the top of the plot (M7), inside it (M8), or off their slot's center (M9);
- the label baseline offset removed (M10);
- the `MIN_NAME_WIDTH` floor removed (M6).

**M6 is load-bearing.**
- At the 100-category limit in a 300-unit plot, each slot is 3 units wide (probe). The floor wraps names to 24 units.
- Without it, `wrap` receives a width of −1 and throws `RangeError`, which `createGraph` turns into `internal_error` for a valid description.
- Even with the floor, names wider than their slot overlap their neighbours once more than about ten categories share a 300-unit axis. The spec allows "wrapping or rotating", and the kit offers wrapping only. Detecting the overlap is left to the type layouts, which can compare `labelWidth` with `end - start`.

**The horizontal placement is described one way and built another.**
- `drawCategoryNames`' doc (`:185-188`) says names beside a horizontal plot are "right of center".
- The code centers each name in a `labelWidth`-wide column that ends `LABEL_GAP` left of the plot, so a short name sits up to 48 units from the axis.
- No test says which placement is intended.

**Impact:**
- TICKET-002, 003 and 005 draw every value axis and category name through these functions (delivery Notes).
- A regression would show up, if at all, as an unexplained difference in some type's Scene, not as a failing kit test that names the function. GSS TICKET-002 QR-002 closed the same gap for the title kit.
- The guard that keeps the category limit drawable can be removed silently.

**Recommendation:** In `tests/layout/kit/value-scale.test.ts`, add:
- Vertical axis:
  - each tick line runs from `box.x - tickLength` to `box.x` at its tick's y;
  - each label is `text-anchor: end` at x `box.x - tickLength - 4`.
- Horizontal axis:
  - each tick line runs from `bottom` to `bottom + tickLength`;
  - each label is `middle`, with its baseline below `bottom + tickLength`.
- Names:
  - below a vertical plot, every baseline is below `box.y + box.height`;
  - beside a horizontal one, every name's x is left of `box.x` and its lines are centered on `slot.center`.
- A 100-category case in `BOX`: no throw, and `labelWidth === 24`.

Then decide whether names beside a horizontal plot are centered in their column or right-aligned to the axis, correct the doc, and pin the choice.

**Status:** Resolved
**Resolution:** Resolved — placement tests for vertical and horizontal ticks and labels and for category names in both orientations, plus a 100-category case pinning `MIN_NAME_WIDTH`; horizontal names are centered in a `labelWidth` column ending 4 left of the plot, and `drawCategoryNames`' doc now says so. File: `tests/layout/kit/value-scale.test.ts`, `src/layout/kit/value-scale.ts` (doc). Approved by the user, 2026-10-13.

---

### QR-002: A partly given scale often resolves to a crowded axis: `{ maximum: 97 }` draws 98 tick labels 2 units apart

**Category:** Maintainability
**Severity:** Concern
**Location:**
- `src/core/definitions/categories.ts:167-177` (`dividingInterval`; its finer search is bounded by `MAX_VALUE_TICKS` at `:173`).
- `src/core/definitions/categories.ts:204-232` (`resolveValueScale`: the provisional `step` at `:209`, the chosen minimum at `:211-218`, the final interval at `:229-231`).
- Tests: `tests/layout/kit/value-scale.test.ts:90-117`.

**Description:** Two mechanisms produce dense value axes from ordinary inputs.

**1. The work limit serves as the readability limit.**
- `dividingInterval` steps to finer 1, 2 or 5 × 10ⁿ intervals until `span / step < MAX_VALUE_TICKS`.
- That 100-tick limit exists to bound the validator's work (GSV TICKET-004 SEC-004; `categories.ts:16`). Here it becomes the cap on how many labelled intervals a chosen scale draws.
- Any span with no coarse 1, 2 or 5 divisor gets interval 1, or 0.5, or 0.1.

Measured with scratch probes over the delivered functions:
- **Bar graph, values `[3, 5, 2]`, given maximum 5 to 100:**
  - 23 maxima give at most 10 intervals;
  - 17 give 11–20;
  - 36 give 21–50;
  - 20 give more than 50.
- **Given integer minimum and maximum, 0 ≤ minimum < maximum ≤ 100 (5,050 pairs):**
  - 1,952 give at most 10 intervals;
  - 1,042 give 11–20;
  - 1,536 give 21–50;
  - 520 give more than 50.
- **With nothing given:** all 1,000 default scales, for maxima 1 to 1,000, have at most 10 intervals.
- **Two worked cases:**
  - `{ maximum: 97 }` is valid through `validateWith` on a stand-in bar graph. `drawValueAxis` then draws 98 tick labels whose baselines are 2.06 units apart, on a 200-unit axis at font size 12 (`defaultStyle.fontSizes.tickLabel`), so every label overlaps its neighbours.
  - `{ maximum: 16.5 }` gives 33 intervals of 0.5.

**2. The chosen minimum is aligned to a different interval from the one drawn.**
- On a line graph with a negative value and a given maximum, the chosen minimum is aligned to a provisional interval (`step = niceInterval(to - from)`, `:209`).
- The drawn interval is chosen afterwards, from the span that results.
- Example: `{ maximum: 15 }` over `[-3, 5]` puts the minimum at −4, on the grid of 2. The span of 19 then gets interval 1, so the axis has 19 intervals. Yet −5 to 15 in steps of 5 holds every value and ends on a tick, in 4 intervals.

**The tests pin the outcome rather than bound it.**
- `{ maximum: 17 }` → interval 1 (18 labels) is an expected row.
- The 1,000-run CR-001 property asserts that the ticks start and end on the scale's ends, not how many there are.

This is a consequence of resolving CR-001 (the axis must end on a tick), not a repeat of it. The trade-off between three wishes was never recorded: ending on a tick, using a 1, 2 or 5 × 10ⁿ interval, and keeping the labels readable.

**Impact:**
- DGP-REQ-009 labels every tick, so a dense scale means overlapping numbers on the value axis of every line and bar graph given a non-round end. A student cannot read that axis.
- TICKET-002 and TICKET-003 draw through `resolveValueScale` (delivery Notes) and would inherit this unknowingly.
- CR-001 and CR-004 were both defects in this same interplay of given and chosen parts, so the function's structure is the likeliest place for the next one.

**Recommendation:** Settle the trade-off with the user (Product Owner) and record it in the delivery record. Then:
- **Choose the interval first,** then align any chosen end to it, counting from the given end, as CR-004 already does when the interval is given. `{ maximum: 15 }` over `[-3, 5]` would then give −5 to 15 in steps of 5.
- **Cap the number of chosen intervals at a readable count** (NLC aims at 5–20 ticks). When no 1, 2 or 5 × 10ⁿ step divides the span within the cap, use the existing fallback `span / 10`, or another rule the user picks.
- **Bound the tests:** add the cap to the CR-001 property, for example `ticks.length <= 21`, and replace the `{ maximum: 17 }` row with the agreed result.
- **Optionally restructure** `resolveValueScale` into its three cases (nothing given, interval given, an end given), so that `step` never stands for two different intervals.

**Status:** Resolved
**Resolution:** Resolved — CR-001's dividing-interval search is replaced: a chosen interval (1, 2 or 5 × 10ⁿ, at most ten intervals) is chosen first and chosen ends are multiples of it; `ValueScale` gains `tickBase` (the minimum for a given interval, 0 for a chosen one), and `valueTicks` draws both ends plus every grid tick at least one interval from either end. `{ maximum: 97 }` → 0, 10, … 80, 97; `{ maximum: 15 }` over [-3, 5] → -4, -2, … 12, 15. A bounded 1,000-run property test: ticks start and end on the scale's ends, are at least one interval apart, and number at most 12 when the interval is chosen. Deviation from the approved wording: a grid tick is dropped when it is less than one interval (not half an interval) from an end, since half an interval can be 9 drawing units on a 200-unit axis, closer than a 14.4-unit label. Approved by the user, 2026-10-13.

---

### QR-003: The validator and the drawing count ticks with two hand-kept copies of one rule, and their agreement at the 100-tick limit is untested

**Category:** DRY
**Severity:** Concern
**Location:**
- `src/layout/kit/value-scale.ts:45-47` (a tick count with its own 1e-9 tolerance) and `:54` (its own 12-digit cleaning).
- `src/core/definitions/categories.ts:130-137` (`clean`, `isWhole`, `ceilWhole`, `floorWhole`, all module-private) and `:301-302` (`checkValueScale`'s tick count).

**Description:**
- `checkValueScale` decides whether a given interval draws at most 100 ticks, and `valueTicks` throws rather than list more than 100. The two must compute the same count, including the tolerance for decimal noise.
- `categories.ts` keeps `isWhole`, `floorWhole` and `clean` private, so `value-scale.ts` re-implements them inline.

They agree today:
- `{ minimum: 0, maximum: 0.7, tickInterval: 0.007 }` divides to 99.99999999999999 in floating point.
- Both count 101 ticks: the validator reports `too_many_ticks`, and `valueTicks` throws.

Nothing in the suite keeps them in agreement:
- Mutation M14 (on a scratch copy) changes `checkValueScale`'s count to `Math.floor(intervals) + 1`.
- The validator then accepts that scale as 100 ticks, while `valueTicks` throws on it.
- All 296 tests pass.
- Other decimals behave the same: 1.4 with interval 0.014, and 1.7 with 0.017.

**Impact:**
- A change to either copy (its tolerance, its cleaning precision, its limit) would let a description the validator accepts throw in `valueTicks`.
- `createGraph` reports that as `internal_error` for every line and bar graph using such a scale, and the suite would not notice.

**Recommendation:**
- Export one `tickCount(scale)`, and the decimal `clean`, from core, beside the scale rule. Use them in both `checkValueScale` and `valueTicks`.
- Add two boundary cases to the tests:
  - `{ maximum: 0.7, tickInterval: 0.007 }`: 101 ticks, rejected;
  - `{ maximum: 0.693, tickInterval: 0.007 }`: 100 ticks, accepted and drawn.

**Status:** Resolved
**Resolution:** Resolved — one `intervalsIn(span, interval)` in `src/core/value-scale.ts` gives both the checks and `valueTicks` their count; `cleanDecimal` is exported there. Boundary tests: `{ maximum: 0.7, tickInterval: 0.007 }` is `too_many_ticks` (100 intervals) and `{ maximum: 0.693, tickInterval: 0.007 }` validates and draws 100 ticks. Approved by the user, 2026-10-13.

---

### QR-004: The CR-001 fallback interval underflows to 0, so one valid description makes the drawing throw

**Category:** Error Handling
**Severity:** Suggestion
**Location:** `src/core/definitions/categories.ts:176` (`return clean(span / DEFAULT_INTERVALS)`); `src/core/definitions/categories.ts:278-324` (`checkValueScale` counts ticks for a given interval only)
**Description:**
- When no 1, 2 or 5 × 10ⁿ step divides the span within the search bounds (`step >= MIN_DEFAULT_INTERVAL`), `dividingInterval` returns `span / 10`. For a span below about 5e-323, that division underflows to 0.
- `{ maximum: 5e-324 }` on a stand-in bar graph with values `[0, 0]` passes `validateWith` and resolves to `{ minimum: 0, maximum: 5e-324, tickInterval: 0 }`. `drawValueAxis` then throws `RangeError: valueTicks(): 0 does not give a drawable number of ticks from 0 to 5e-324`.
- Spans of 1e-300 and 1e-12 resolve and draw.
- This is the same underflow that DEL-005 guarded against for default scales with `MIN_DEFAULT_INTERVAL`, pinned by "never lets the interval underflow to zero". CR-001's new path reopens it.

**Impact:**
- Low: denormal scale ends are not curriculum values, and the resulting `internal_error` ("a defect in the package") is accurate.
- Still, the module's invariant that a validated scale is drawable has a hole, in exactly the case an earlier property test was written to close.

**Recommendation:**
- Guard the fallback: when `span / 10` is not greater than 0, use `span` itself, as a single interval. Alternatively, have the type tickets bound value precision, as the delivery Notes already suggest.
- Add `{ maximum: 5e-324 }` beside the 5e-324 default-scale test.

**Status:** Resolved
**Resolution:** Resolved — the CR-001 fallback is gone (see QR-002); a chosen interval is never finer than 1e-9, and `{ maximum: 5e-324 }` validates and draws ticks 0 and 5e-324 (test added). Approved by the user, 2026-10-13.

---

### QR-005: The value-scale rule lives in `categories.ts`, and the consolidation target in the Notes is a module core cannot import

**Category:** Maintainability
**Severity:** Suggestion
**Location:**
- `src/core/definitions/categories.ts:110-232`: the scale types (`GivenValueScale`, `ValueScale`, `ScaleOptions`) and the arithmetic from `clean` to `resolveValueScale`.
- `src/layout/kit/value-scale.ts:1`, `:11`: imports and re-exports from `core/definitions/categories`.
- The delivery record's Notes, "Consolidation".
- `.gener8v/changes/graph-library/tickets/number-lines-and-coordinate-graphs/TICKET-001.md` Output: `src/layout/kit/ticks.ts`, with `niceTicks` and `tickLabel(value, spacing)`.

**Description:**
- **The file holds three things.** `categories.ts` (372 lines) holds:
  - the categories term and its check;
  - the scoped data-graph terms;
  - about 120 lines of value-scale arithmetic that the validator and the drawing share.
- **The arithmetic is in the right layer but hard to find.** DEL-004 rightly put it in core, to keep the dependency direction. But the file name does not say it is there, and the kit module named `value-scale.ts` re-exports it from a module named for categories.
- **The consolidation target cannot work.**
  - The Notes plan to merge `niceInterval` into NLC TICKET-001's `src/layout/kit/ticks.ts`. But core cannot import layout, which is why DEL-004 moved the rule into core.
  - NLC's own `too_many_ticks` must "suggest a spacing that fits" (an NLC TICKET-001 acceptance criterion), so NLC's core check will need the same rule.
- **Two `tickLabel`s are planned.** NLC's Output adds a second `tickLabel` to the kit, with a different signature and rule (decimals from the spacing) from `value-scale.ts:60` (exact digits).

**Impact:** When NLC TICKET-001 lands, following the Notes would do one of two things:
- break the dependency rule; or
- leave two copies of the 1, 2 or 5 × 10ⁿ rule, and two `tickLabel`s, in the kit, one per axis family.

Avoiding exactly that duplication was the point of the consolidation note.

**Recommendation:**
- Move the scale types and arithmetic, and QR-003's `tickCount`, into a core module named for them, such as `src/core/definitions/value-scale.ts` or `src/core/ticks.ts`. Keep `categories.ts` for the categories and the scoped terms.
- Append a Known Hazard to NLC TICKET-001 that names this module as the home of the 1, 2 or 5 × 10ⁿ rule, and correct the delivery Notes.
- This can be deferred to NLC TICKET-001.

**Status:** Resolved
**Resolution:** Resolved — the scale arithmetic and checks moved to `src/core/value-scale.ts`; `categories.ts` re-exports them where TICKET-002, 003 and 005 expect them, and the layout kit imports `valueTicks` from core. Known Hazard appended to `number-lines-and-coordinate-graphs/TICKET-001.md` to put NLC's tick arithmetic in core with this module. Approved by the user, 2026-10-13.

---

### QR-006: `emptyIsAbsent` is accepted anywhere, but on a required term or a list item it yields an inconsistent valid description

**Category:** Maintainability
**Severity:** Suggestion
**Location:**
- `src/core/definitions/types.ts:68-74` (`StringValue.emptyIsAbsent`).
- `src/core/validate/structure.ts:116` (the empty text is omitted), `:164-167` (an omitted list item becomes `null`), `:231` (an omitted property is dropped).
- `tests/core/definitions.test.ts:532-537`: the "optional only" rule covers `sharedProperties` only.

**Description:** The flag extends the definition format in general, but it behaves as documented only on an optional object property. A probe with stand-in definitions through `validateWith`:
- **A required term.** A required `unitName` with the flag, given `""`, is valid, and the description has no `unitName`. Presence is checked against the input (`structure.ts:235`), so no `missing_property` is reported.
- **A list item.** A list `tags` whose items set the flag, given `["a", "", "b"]`, is valid, and the description holds `["a", null, "b"]`. The `null` is not recorded in `failed`, so domain checks that read `tags/*` still run on it.

The presentation-option rule this flag mirrors is protected by the definitions test "are all optional presentation options". Nothing protects the new flag.

**Impact:**
- The problem is latent: today only `valueUnitLabel` sets the flag, and it is optional and top-level.
- TICKET-002 to TICKET-005 add string terms, such as series labels and image names. A type that set the flag on a required term or on a list item would publish valid descriptions that break their own shape: a required term missing, or a `null` in a list of strings. That would be found only downstream.

**Recommendation:**
- Add a definitions-test rule: every spec with `emptyIsAbsent` is an optional property, never `required` and never an array's `items`. State the same in the flag's doc comment.
- Alternatively, have `structure.ts` ignore the flag wherever it does not apply.

**Status:** Resolved
**Resolution:** Resolved — the definitions test rejects `emptyIsAbsent` on a required term or a list item (with a test of both), and `StringValue.emptyIsAbsent`'s doc says it is for optional properties only. Approved by the user, 2026-10-13.

---

### QR-007: Scoped terms are read through unnecessary casts and named as presentation options

**Category:** Patterns
**Severity:** Suggestion
**Location:**
- `src/core/definitions/index.ts:42` (the union-typed `scopedPropertyMaps`), `:48` (`spec as SharedPropertySpec`), `:63` (`Object.values(map) as SharedPropertySpec[]`).
- `src/core/definitions/shared.ts:4-14` (`SharedPropertySpec`, documented as "A presentation option defined once").
- `tests/core/definitions.test.ts:22` (a cast), `:98`, `:103`, `:438` (messages and a `describe` name that say "shared option").

**Description:**
- **Both casts in `index.ts` are unnecessary.**
  - I type-checked `src/core` on a scratch copy, with the repository's TypeScript in strict mode: exit 0, with no cast. That needs two changes:
    - type `scopedPropertyMaps` as `ReadonlyArray<Readonly<Record<string, SharedPropertySpec>>>`;
    - have `scopedProperty` read `Object.hasOwn(map, key) ? map[key] : undefined`.
  - The current union type must also be edited for every new scoped map.
  - GSS TICKET-002 QR-005 removed casts like these from the registries.
- **The type's name and doc are now too narrow.** `SharedPropertySpec` types `valueScale`, which is not a presentation option. `index.ts` calls these "scoped terms", but the definitions test's messages still say "lists shared option valueScale".

**Impact:** Low.
- The casts would hide a future map whose entries lack `appliesTo`.
- A reader of `shared.ts` is told the type means presentation options only.

**Recommendation:**
- Type `scopedPropertyMaps` as above, and drop the casts at `index.ts:48`, `:63` and `tests/core/definitions.test.ts:22`.
- Rename the type `ScopedPropertySpec`, keeping `SharedPropertySpec` as an alias if wanted, with a doc that covers both maps.
- Say "scoped term" in the test messages.

**Status:** Resolved
**Resolution:** Resolved — `ScopedPropertySpec` (with `SharedPropertySpec` kept as an alias), `scopedPropertyMaps` typed as maps of it, the casts in `index.ts` dropped (own-key lookup kept), and the definitions test's messages say "scoped term". Approved by the user, 2026-10-13.

---

### QR-008: The unused `categories` constant is kept and run in every bundle, `./circle` included

**Category:** Patterns
**Severity:** Suggestion
**Location:**
- `src/core/definitions/categories.ts:63`.
- The built `dist/chunk-S22EUF2R.js:406`. This is gitignored output from `pnpm test`'s global setup, and the chunk name is a content hash.

**Description:**
- `export const categories = defineProperties({ categories: categoriesProperty() }).categories;` is a top-level call. No source module reads `categories` yet, only the tests.
- The bundler therefore drops the binding but keeps the call, as the bare statement `defineProperties({ categories: categoriesProperty() }).categories;` at line 406 of the shared chunk that `dist/circle.js` imports.
- So every entry carries `categoriesProperty` and runs a deep freeze at import.
- The codebase marks such calls `/* @__PURE__ */`, so that a bundler can drop them where nothing reads them (`src/core/definitions/index.ts:15-20`, GSS TICKET-002 DEL-002).
- A mark on `defineProperties(…)` alone is not enough. With the repository's esbuild, in a scratch test, `/* @__PURE__ */ define(…).categories` is still kept because of the property access, while `/* @__PURE__ */ helper()` is dropped.

**Impact:**
- The cost is small: a few hundred bytes and one deep freeze per import.
- But it works against the aim of the per-type entries, and the three data-graph type tickets will copy the pattern.

**Recommendation:**
- Have `categoriesProperty()` return the frozen spec itself, by doing the `defineProperties({ categories: … }).categories` step inside it.
- Then write `export const categories: PropertySpec = /* @__PURE__ */ categoriesProperty();`.
- Check with `pnpm build` that the statement is gone from the circle chunk; `pnpm size` should drop slightly.

**Status:** Resolved
**Resolution:** Resolved — `categoriesProperty()` returns the defined (frozen) spec and `categories` is `/* @__PURE__ */ categoriesProperty()`; after `pnpm build` no bundle contains the categories spec. `./circle` 15.4 → 15.23 kB. Approved by the user, 2026-10-13.

---

### QR-009: A test input hides an invisible character

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/core/categories.test.ts:136`
**Description:**
- The second name is written `"Mo­n"`, with a literal U+00AD soft hyphen (bytes `\xc2\xad`) between "o" and "n". It shows as "Mon" in an editor, a diff and a review tool.
- The test's point is that names differing only by a character that cleaning removes count as duplicates, and that point rests on the invisible character. A reader sees `[{ name: "Mon" }, { name: "Mon" }]` and cannot tell what is tested.
- An editor or tool that strips the character would turn the test into a plain duplicate, which would still pass while no longer testing cleaning.
- The plain-text policy rejects U+00AD at validation, which is why this test calls `checkCategories` directly.

**Impact:**
- Small, but this test is the only evidence for DEL-003's rule that names are compared as drawn.
- M16 (names compared uncleaned) is caught by this test alone.

**Recommendation:** Write the name as `"Mo­n"`, and say in a comment or in the test name that the soft hyphen is what cleaning removes.

**Status:** Resolved
**Resolution:** Resolved — the input is written `"Mo\u00adn"` with a comment naming the soft hyphen. Approved by the user, 2026-10-13.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fix | Placement tests, 100-category case, names doc | `tests/layout/kit/value-scale.test.ts`, `src/layout/kit/value-scale.ts` |
| QR-002 | Fix (nice interval + end tick) | Interval chosen first; `tickBase`; end ticks replace near grid ticks; bounded property test | `src/core/value-scale.ts`, `tests/layout/kit/value-scale.test.ts`, `tests/core/categories.test.ts` |
| QR-003 | Fix | Shared `intervalsIn`; 0.7/0.007 and 0.693/0.007 boundary tests | `src/core/value-scale.ts`, `tests/layout/kit/value-scale.test.ts` |
| QR-004 | Fix | Fallback removed; tiny-maximum test | `src/core/value-scale.ts`, `tests/layout/kit/value-scale.test.ts` |
| QR-005 | Fix now | Scale code in its own core module; Known Hazard on NLC TICKET-001 | `src/core/value-scale.ts`, `src/core/definitions/categories.ts`, `src/layout/kit/value-scale.ts`, NLC `TICKET-001.md` |
| QR-006 | Fix | Definitions-test rule and doc | `tests/core/definitions.test.ts`, `src/core/definitions/types.ts` |
| QR-007 | Fix | `ScopedPropertySpec`, no casts, wording | `src/core/definitions/shared.ts`, `src/core/definitions/index.ts`, `src/core/definitions/categories.ts`, `tests/core/definitions.test.ts` |
| QR-008 | Fix | Pure, defined `categories` constant | `src/core/definitions/categories.ts` |
| QR-009 | Fix | Escaped soft hyphen | `tests/core/categories.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (all 9 Resolved)
**Notes:** All nine findings fixed in resolution and re-verified: `pnpm generate`, `lint`, `typecheck`, `test` (30 files, 836 tests), `bench`, `build`, `check:dist`, `check:deps`, `size`, `publint`, `attw`, `audit` and `gener8v-state lint` all exit 0. Deliberate breaks of each fix fail their tests; one that first survived (a chosen maximum counted from a given minimum) got its own test. QR-002 supersedes code review CR-001's dividing interval while keeping its aim: the axis always ends on a labeled tick.
