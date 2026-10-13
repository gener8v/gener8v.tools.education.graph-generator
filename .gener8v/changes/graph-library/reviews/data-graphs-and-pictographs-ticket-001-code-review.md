# TICKET-001: Categories and value scale foundation — Code Review

## Summary

I reviewed the delivery of `graph-library/data-graphs-and-pictographs/TICKET-001` (delivery commit `ce93ce9`, branch `ticket/dgp-001`). I checked it against the ticket and its Known Hazards, the Data Graphs & Pictographs specification (including the `## @spec Coverage` section this delivery added), `constraints/prd.md` and `technical-design/system-design.md`.

What holds:
- All nine acceptance criteria are met and all eight requirements are covered. No NFR is carried by this ticket.
- Every carried hazard is addressed:
  - the axis labels are not redefined (GSV TICKET-001 CR-004);
  - `valueScale` declares `ordered: [["minimum", "maximum"]]` (GSV TICKET-003 CR-002);
  - `""` on `valueUnitLabel` means no label, through the explicit `emptyIsAbsent` flag, stated in the definition and tested (GSV TICKET-003 CR-007);
  - `categories` has `maxItems` 100, recorded in its description (GSV TICKET-003 SEC-001);
  - the checks are built with `createIssue`, never change the frozen description, and do work bounded by size rather than magnitude, with ticks counted arithmetically (GSV TICKET-004 CR-003 / SEC-004).
- `allowNegative` implements the DGP-REQ-015 hazard, and the existing scale issue codes are reused.
- Every Verification Run command reproduces with exit 0, and `pnpm generate` leaves the tracked files unchanged.

Extra checks beyond the record's commands:
- Scratch probes (outside the repository) of `validateWith` over the delivery's own test-only registry, and of `resolveValueScale`, `checkValueScale` and `valueTicks`, to confirm the behaviour behind the findings.

There are three Issues:
- **CR-001.** When one end of the scale is given and the interval is not, the chosen interval often does not divide the range. The axis then ends without a tick or label at its top: for `{ maximum: 15 }` the ticks are 0, 2, …, 14. 74 of the given maxima 1–100 on a bar graph do this. Each such scale, given in full, is one the validator itself rejects as `tick_interval_not_dividing`.
- **CR-002.** `categoriesCheck` declares `categories` as an input. A failure anywhere inside any category, such as an unknown bar color, therefore skips the duplicate-name check, so an independent problem is not reported in the same pass.
- **CR-003.** The specification's coverage row for DGP-REQ-002 lists `src/core/definitions/shared.ts:sharedProperties`, but no `@spec DGP-REQ-002` annotation is there, and the delivery record's annotation table leaves it out.

There are four Observations:
- **CR-004.** On a line graph with negative values, a given maximum and interval with no minimum can be rejected as not dividing a range the caller never wrote.
- **CR-005.** An empty `categories` list is reported as "categories is required …; add it." The spec's edge case, and the function's own doc comment, say "at least one category is required".
- **CR-006.** `tick_spacing_invalid` sits in the same function as checks that read every scale part and value. Under the single `DomainCheck` the Notes prescribe for TICKET-002/003, any failing part or value suppresses it.
- **CR-007.** The record cites `pnpm check:deps` as evidence that the module imports no React. That script checks runtime dependency justification; the React boundary is enforced by `pnpm lint`.

**Reviewer:** `code-reviewer` agent, fresh context (findings phase only, 2026-10-13)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/data-graphs-and-pictographs-ticket-001-delivery.md`
**Files Reviewed:**
- `src/core/definitions/categories.ts`
- `src/layout/kit/value-scale.ts`
- `src/core/definitions/index.ts`
- `src/core/validate/structure.ts`
- `src/core/definitions/types.ts`
- `src/core/issues.ts`
- `tests/core/categories.test.ts`
- `tests/layout/kit/value-scale.test.ts`
- `tests/core/definitions.test.ts`
- `tests/core/issues.test.ts`
- `.gener8v/specifications/data-graphs-and-pictographs.md` (`## @spec Coverage`)
- Read for context, unchanged here: `src/core/definitions/shared.ts`, `src/core/validate/domain.ts`, `src/core/validate/state.ts`, `src/core/validate/index.ts`, `src/core/format.ts`, `src/layout/kit/text.ts`, `src/layout/kit/title.ts`, `src/layout/kit/format.ts`, `src/layout/kit/scale.ts`, `scripts/check-dependencies.ts`, `eslint.config.js`

**Findings:** 7
**Critical:** 0 | **Issues:** 3 | **Observations:** 4

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| `categories` is a required, non-empty array of plain-text names; an empty list is reported (`missing_property` or `out_of_range` at `/categories`), and a duplicate name is reported naming both positions | Yes | `categoriesProperty` (`src/core/definitions/categories.ts:39-60`): `required: true`, `maxItems` 100, each entry an object with a required plain-text `name`. That is an array of `{ name }` objects rather than bare strings, recorded as DEL-001's Ticket Impact. `checkCategories` (`categories.ts:275-297`) reports `[]` as `missing_property` at `/categories`, and a repeat as `duplicate_name` at the later entry, with `conflicts` naming the first. Tests: `tests/core/categories.test.ts:92-98`, `:114-130`. See CR-002 (suppressed by other category failures) and CR-005 (wording) |
| `categoryAxisLabel` and `valueAxisLabel` are accepted on line and bar graphs; `valueUnitLabel` is accepted on pictographs; each is reported as inapplicable on the other types | Yes | The axis labels are shared options with `appliesTo` line/bar (`src/core/definitions/shared.ts:82-99`). `valueUnitLabel` applies to `pictograph` (`categories.ts:76-86`). `propertiesOf` merges every scoped map (`src/core/definitions/index.ts:60-70`). `appliesToType` makes a scoped term `inapplicable_property` (`src/core/validate/structure.ts:177-181`, `:209-212`). Tests: `tests/core/categories.test.ts:147-180`, five inapplicable cases, circle included |
| `valueScale` (`minimum`, `maximum`, `tickInterval`, all optional) is accepted on line and bar graphs and reported as inapplicable on pictographs | Yes | `dataGraphProperties.valueScale` (`categories.ts:87-107`): every part `required: false`, `appliesTo: ["line-graph", "bar-graph"]`. Tests: `tests/core/categories.test.ts:194-211` (pictograph and circle) |
| With no scale given, the computed scale starts at zero (or below zero only when a value is negative, for line graphs) and its maximum is at or above the largest value; all-zero data gives 0..1 | Yes | `resolveValueScale(undefined, …)` through `defaultValueScale` (`categories.ts:173-187`; `src/layout/kit/value-scale.ts:33-35`). Zero floor unless `allowNegative`; the maximum is stepped out until it reaches the highest value (`categories.ts:183-185`); all-zero gives 0..1. Tests: `tests/layout/kit/value-scale.test.ts:30-77`, with 8 examples, the all-zero and empty cases, the underflow case and a 500-run property test |
| A given scale is used exactly and never extended; a given scale that excludes any data value is reported with `scale_excludes_value`, naming the value's path | Yes | Given parts pass through unchanged (`given?.minimum ?? …`, `given?.maximum ?? …`, `categories.ts:176-184`). Each value beyond a given end is reported at its own path (`categories.ts:255-261`). Tests: `tests/core/categories.test.ts:278-288`, `:306-314`. See CR-001 for the parts chosen around a given end |
| A tick interval ≤ 0 is reported as `tick_spacing_invalid`; one that does not divide (maximum − minimum) into a whole number of intervals is reported as `tick_interval_not_dividing` | Yes | `checkValueScale` (`categories.ts:219-221`, `:251-252`), with a decimal-noise tolerance (`isWhole`, `categories.ts:133`). `tickInterval` has no lower bound in its spec, so ≤ 0 reaches the check. Tests: `tests/core/categories.test.ts:231-263`. See CR-004 and CR-006 |
| Every tick on the value axis is drawn with a text label showing its value | Yes | `drawValueAxis` (`src/layout/kit/value-scale.ts:99-133`) pushes a tick line and a text node for every value of `valueTicks(scale)`, each labelled by `tickLabel` → `formatSupplied` (`value-scale.ts:60`). Test: `tests/layout/kit/value-scale.test.ts:112-117`, both orientations |
| Category slots are laid out in description order; long category names are wrapped with the kit's `wrap`, never truncated | Yes | `categorySlots` (`value-scale.ts:158-183`) gives equal slots in index order. It calls `wrap(cleanText(name), labelWidth, fontSize)` with no `maxLines`, which defaults to `Infinity` (`src/layout/kit/text.ts:157`), so nothing is cut. `drawCategoryNames` (`value-scale.ts:190-202`) draws every line. Tests: `tests/layout/kit/value-scale.test.ts:163-207` |
| All coordinates written by `value-scale.ts` pass through `fmt()`; the module imports nothing from React | Yes | Every numeric attribute goes through `fmt()`: lines at `value-scale.ts:84-89`, labels at `:114-118`, and `textLines` (`src/layout/kit/title.ts:30-34`). Property test: `tests/layout/kit/value-scale.test.ts:136-145`. React is barred from `src/layout` by ESLint (`eslint.config.js:116-118`, `pnpm lint` exit 0) and by the test at `tests/layout/kit/value-scale.test.ts:210-214`. The record also cites `pnpm check:deps`, which does not check this (CR-007) |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| DGP-REQ-001 | Ordered list of categories, each with a plain-text name | `src/core/definitions/categories.ts:categoriesProperty`, `checkCategories`; `src/layout/kit/value-scale.ts:categorySlots`, `drawCategoryNames` | Yes |
| DGP-REQ-002 | Category-axis and value-axis labels on line and bar graphs; value-unit label on pictographs | `src/core/definitions/shared.ts:sharedProperties` (`categoryAxisLabel`, `valueAxisLabel`); `src/core/definitions/categories.ts:dataGraphProperties` (`valueUnitLabel`); `src/core/definitions/index.ts:propertiesOf` | Yes (annotation gap: CR-003) |
| DGP-REQ-003 | Categories drawn in the order given | `src/core/definitions/categories.ts:categoriesProperty` (stage 2 keeps list order); `src/layout/kit/value-scale.ts:categorySlots`, `drawCategoryNames` | Yes |
| DGP-REQ-005 | Optional value-scale minimum, maximum and tick interval on line and bar graphs | `src/core/definitions/categories.ts:dataGraphProperties` (`valueScale`), `resolveValueScale`; `src/core/definitions/index.ts:propertiesOf` | Yes (CR-001 concerns the parts chosen around a given end) |
| DGP-REQ-006 | Default scale starts at zero and includes every value | `src/core/definitions/categories.ts:resolveValueScale`; `src/layout/kit/value-scale.ts:defaultValueScale` | Yes |
| DGP-REQ-007 | Report a given scale that excludes a data value | `src/core/definitions/categories.ts:checkValueScale` (`scale_excludes_value` at each value's path) | Yes |
| DGP-REQ-008 | Report a tick interval that is not positive or does not divide the range | `src/core/definitions/categories.ts:checkValueScale` (`tick_spacing_invalid`, `tick_interval_not_dividing`, plus `too_many_ticks`) | Yes (see CR-004, CR-006) |
| DGP-REQ-009 | Label every value-axis tick with its value | `src/layout/kit/value-scale.ts:valueTicks`, `drawValueAxis`, `tickLabel` | Yes |

*No NFR is carried by this ticket.*

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/TC-001 | No measuring; output from the description alone | Yes | Name widths and tick-label widths are estimated by `textWidth` and `wrap` (`src/layout/kit/text.ts`). Nothing reads the DOM |
| prd/TC-011 | SVG text does not wrap; line breaking computed by the package | Yes | `categorySlots` breaks names with the kit's `wrap` and `drawCategoryNames` emits one text node per line through `textLines` |
| prd/TC-002 | Rounded coordinates only | Yes | Every numeric attribute in `value-scale.ts` goes through `fmt()`. Tick values are cleaned of decimal noise (`toPrecision(12)`, `value-scale.ts:54`) before positioning. Property-tested |
| prd/TC-005 | Non-rendering code loads no React DOM or browser global | Yes | `src/core/definitions/categories.ts` imports only core modules. `src/layout/kit/value-scale.ts` imports core and kit modules. ESLint's boundary block covers `src/core` and `src/layout` (`eslint.config.js:20`, `:116-118`) |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-001 | Separate non-rendering entry points; no React in core or layout | Yes | No React import (lint and test). Core does not import layout: the scale arithmetic sits in core and the kit re-exports it (DEL-004) |
| AD-002 | Framework-neutral Scene of plain SVG primitives | Yes | `drawValueAxis` and `drawCategoryNames` return `SceneNode[]` of `line` and `text`, with ordered, final attributes |
| AD-003 | One in-house definition per type; shared definitions defined once | Yes | `dataGraphProperties` carries `appliesTo` and `elementsOf` like the shared options. `propertiesOf` stays the single place types, schema and vocabulary read terms from (`grep` finds no other reader of the scoped maps). `StringValue.emptyIsAbsent` extends the definition format explicitly rather than overloading `presentation`. The definitions tests now cover the second scoped map (`tests/core/definitions.test.ts`) |
| AD-004 | Staged validator: every independent issue, no cascades | Partial | Inapplicable terms are found in stage 2; categories and scale are checked in stage 4 on values that passed. But `categoriesCheck`'s `categories` input skips the duplicate check on any failure inside any category (CR-002), and the interval-sign check shares one function with checks that read every part and value (CR-006) |
| AD-005 | Camel-case terms, JSON Pointer paths | Yes | `categories`, `name`, `valueUnitLabel`, `valueScale`, `minimum`, `maximum` and `tickInterval` are all camel case. Issues are at `/categories/2/name`, `/valueScale/tickInterval` and `/values/1` |
| AD-007 | One rounding function for every emitted number | Yes | `fmt()` throughout `value-scale.ts`. Tick labels use `formatSupplied` (plain digits, no exponent form) |
| AD-010 | Estimated text metrics and package-computed wrapping | Yes | `wrap` and `textWidth` with the 1.1 safety factor; `valueAxisExtent` sizes tick labels the same way |
| AD-011 | Inline presentation attributes from the default style | Yes | `stroke`, `fill`, `font-family`, `font-size` and `stroke-width` all come from `defaultStyle` |
| IssueCode set | Stable codes documented in `issueDocs` | Yes | `scale_excludes_value`, `tick_interval_not_dividing`, `tick_spacing_invalid` and `too_many_ticks` are reused, as the hazard requires. `duplicate_name` is added with documentation, parameters, a message and catalogue snapshots (DEL-003). The design's "IssueCode set (initial)" list is not amended, which matches the precedent of `too_large` |
| Component design: Layout kit `niceTicks` | The 1/2/5 × 10ⁿ rule as a layout-kit interface | Yes (placement recorded) | `niceInterval` lives in `src/core/definitions/categories.ts`, so the validator and the layout share one rule. DEL-004 records this, and the delivery Notes flag consolidation with NLC's future `src/layout/kit/ticks.ts` |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| DGP-REQ-001 | `@spec DGP-REQ-001` | `src/core/definitions/categories.ts:categoriesProperty` (line 38), `checkCategories` (line 274); `src/layout/kit/value-scale.ts:categorySlots` (line 157), `drawCategoryNames` (line 189) | Yes |
| DGP-REQ-002 | `@spec DGP-REQ-002` | `src/core/definitions/categories.ts:dataGraphProperties` (line 74); `src/core/definitions/index.ts:propertiesOf` (line 59). **Not** on `src/core/definitions/shared.ts:sharedProperties` (line 24), which implements the axis labels and is listed in the specification's row | Partial (CR-003) |
| DGP-REQ-003 | `@spec DGP-REQ-003` | `src/core/definitions/categories.ts:categoriesProperty` (line 38); `src/layout/kit/value-scale.ts:categorySlots` (line 157), `drawCategoryNames` (line 189) | Yes |
| DGP-REQ-005 | `@spec DGP-REQ-005` | `src/core/definitions/categories.ts:dataGraphProperties` (line 74), `resolveValueScale` (line 172); `src/core/definitions/index.ts:propertiesOf` (line 59) | Yes |
| DGP-REQ-006 | `@spec DGP-REQ-006` | `src/core/definitions/categories.ts:resolveValueScale` (line 172); `src/layout/kit/value-scale.ts:defaultValueScale` (line 32) | Yes |
| DGP-REQ-007 | `@spec DGP-REQ-007` | `src/core/definitions/categories.ts:checkValueScale` (line 213) | Yes |
| DGP-REQ-008 | `@spec DGP-REQ-008` | `src/core/definitions/categories.ts:checkValueScale` (line 213) | Yes |
| DGP-REQ-009 | `@spec DGP-REQ-009` | `src/layout/kit/value-scale.ts:valueTicks` (line 42), `drawValueAxis` (line 98) | Yes |

**Coverage:** 8 of 8 requirements annotated in the delivered code. Each annotation sits on the line directly above its declaration, after the JSDoc.
**Missing:** DGP-REQ-002 at `src/core/definitions/shared.ts:sharedProperties`, where the category- and value-axis labels are implemented (CR-003)
**Specification table:** No. `## @spec Coverage` in `.gener8v/specifications/data-graphs-and-pictographs.md` matches the delivered annotations row for row, except that its DGP-REQ-002 row also lists `src/core/definitions/shared.ts:sharedProperties`, which carries no DGP-REQ-002 annotation. The delivery record's `## @spec Annotations` table leaves that location out (CR-003)

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm install --frozen-lockfile` | not re-run: dependencies already installed, lockfile unchanged since the delivery | Yes. `pnpm-lock.yaml` was last changed in `6442d18`, before the delivery, and `git diff ce93ce9 -- pnpm-lock.yaml package.json` is empty |
| `pnpm generate` | 0 | Yes. It rewrote the 5 generated files with identical content; `git status` afterwards shows no change to any tracked source or generated file |
| `pnpm lint` | 0 | Yes (record: 1 → 0 after a fix; final state 0) |
| `pnpm typecheck` | 0 | Yes |
| `pnpm test` | 0 | Yes. 30 files, 817 tests passed. The new files hold 33 and 29 tests once `it.each` expands, as recorded |
| `pnpm bench` | 0 | Yes. GSV-NFR-001 circle p95 0.0212 ms (record 0.0236 ms) |
| `pnpm build` | 0 | Yes |
| `pnpm check:dist` | 0 | Yes. 7 built files scanned, no network APIs or modules |
| `pnpm check:deps` | 0 | Yes for the exit code. Its output is "Runtime dependencies: 0, all justified.", not the record's "no React in non-rendering code" (CR-007) |
| `pnpm size` | 0 | Yes. `.` 15.43 kB / 120 kB, `./core` 12.5 kB / 25 kB, `./circle` 15.37 kB / 25 kB, identical to the record |
| `pnpm publint` | 0 | Yes (All good) |
| `pnpm attw` | 0 | Yes |
| `pnpm audit` | 0 | Yes (No known vulnerabilities found) |
| `python3 …/gener8v-state.py lint` | 0 | Yes (0 errors, 0 warnings) |
| Mutation checks | not re-run (each edits source) | Not reproduced. I read the tests the record names for each mutation, and each asserts the behaviour the mutation would break |

*The working tree was unchanged after every command (`git status --short`: only `.gener8v/runs.jsonl`, which the hooks write).*

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | Objects with a `name` satisfy DGP-REQ-001 ("each with a plain-text name"). They let the existing `elementsOf` rule report a pictograph category's `color` as inapplicable with no new code, which is tested. The departure from AC 1's "array of plain-text names" is recorded as Ticket Impact, and the user chose it with the plan |
| DEL-002 | Reasonable | It answers carried CR-007 with the explicit flag the hazard asked for, and matches the spec's "units when none is given". A whitespace-only label is kept, by test. `structure.ts:116` reads the flag in one place |
| DEL-003 | Reasonable | No existing code fits, and adding one is non-breaking (`RELEASED_CODES`). The code is documented, its message names both positions, and both catalogue snapshots are updated. The design's initial code list is not amended, as with `too_large` before it |
| DEL-004 | Reasonable | It gives one applicability rule for every term that applies to some types, keeps `sharedProperties` to the presentation options only, and keeps core free of layout imports. The definitions tests now iterate both scoped maps, so a type that lists `valueScale` itself fails. `index.ts` and `structure.ts` lie outside the ticket's Output, and the decision says so |
| DEL-005 | Reasonable for the default scale | With nothing given, the scale starts at zero (or at a tick below the lowest value under `allowNegative`), always includes every value, and is bounded at 10 intervals; the property test found and pinned the 1e-9 underflow floor. The same function also fills in parts around a given end, and there the chosen interval need not divide the range (CR-001), nor the chosen minimum align with a given maximum (CR-004) |

*Deviations from the plan:*
- *`tests/core/issues.test.ts` updated:* required by the new code, with no downstream impact.
- *Extra helpers in `value-scale.ts` (`tickLabel`, `valuePosition`, `valueAxisExtent`, `drawCategoryNames`, `CATEGORY_NAME_WIDTH`, `nameWidth`):* additive, and give TICKET-002, TICKET-003 and TICKET-005 one place to draw from.
- *Extra exports in `categories.ts`:* additive.
- *The 1e-9 floor and the inclusion guards, added during verification:* tested.
- *Test file at `tests/layout/kit/value-scale.test.ts` rather than `tests/layout/`:* recorded in pre-flight.

*None of these affects traceability.*

## Findings

### CR-001: A partly given scale gets a chosen interval that does not divide it, so the axis ends without a tick or label

**Severity:** Issue
**Location:** `src/core/definitions/categories.ts:178` (`resolveValueScale`: `niceInterval(to - from)` when an end is given); `src/core/definitions/categories.ts:239` (`checkValueScale` tests division only for a given interval); `src/layout/kit/value-scale.ts:43-57` (`valueTicks` stops at the last tick inside the scale)
**Traces To:** DGP-REQ-008 (a scale divides into a whole number of intervals); DGP-REQ-005; acceptance criteria 5 and 7; the `valueScale` description ("a part left out is chosen to fit the data")
**Description:** When the minimum or maximum is given and `tickInterval` is not, `resolveValueScale` picks `niceInterval(to − from)` without checking that it divides the range.

Reproduced on a bar graph:
- `valueScale: { maximum: 15 }` with values `[3, 5, 2]` resolves to `{ minimum: 0, maximum: 15, tickInterval: 2 }`.
- `valueTicks` gives 0, 2, …, 14, so the axis runs on to 15 with no tick and no label at its top.
- `checkValueScale` reports nothing, because the interval was not given, so the description is valid.
- Written out in full, `{ minimum: 0, maximum: 15, tickInterval: 2 }` is rejected by the same function: "valueScale.tickInterval must divide the value scale into whole intervals; got 2."

Over given maxima 1–100 on a bar graph, 74 resolve to a scale whose top is not a tick (11, 13, 15, 17, 19, 21–24, 26–28, …). Given ends behave the same, for example `{ minimum: 0, maximum: 13 }` → interval 2 and `{ minimum: 0, maximum: 1.3 }` → interval 0.2.

The tests pin rather than catch this:
- `resolveValueScale` › "fills only the parts left out" uses a maximum (50) that its chosen interval happens to divide.
- `valueTicks` › "stops at the last tick inside a scale its interval does not divide" fixes the short axis as intended behaviour.
- The 500-run property test covers default scales only, whose chosen maximum always divides.
**Impact:** A teacher-chosen maximum is one of the most common scale inputs, and in most cases it draws a value axis whose highest value is unlabeled, so a student cannot read the top of the scale. The package draws a scale it would reject from a caller. TICKET-002 and TICKET-003 draw through `resolveValueScale`, so the behaviour reaches every line and bar graph.
**Recommendation:** When an end is given and the interval is chosen, choose an interval that divides (maximum − minimum). For example, take the coarsest 1, 2 or 5 × 10ⁿ value that divides the range in at most `DEFAULT_INTERVALS` intervals (15 → 5). Failing that, take the coarsest that divides it within `MAX_VALUE_TICKS` ticks (13 → 1, 13 intervals). If no such value divides the range at all, fall back to (maximum − minimum) / k for some k ≤ 10. Add a property test: for every given-part combination that `checkValueScale` accepts, the ticks of `resolveValueScale(…)` start at its minimum and end at its maximum. Update the `valueTicks` test's comment, which then describes only a defensive case.
**Status:** Resolved
**Resolution:** Resolved — `resolveValueScale` now chooses, whenever an end is given and the interval is not, an interval that divides the scale (`dividingInterval`): the finest 1, 2 or 5 × 10ⁿ with at most ten intervals that divides it (15 → 5), else the coarsest finer one within `MAX_VALUE_TICKS` ticks (17 → 1), else a tenth of the span. Examples and a 1,000-run property test (every partly given scale the checks accept starts and ends on a tick) in `tests/layout/kit/value-scale.test.ts`; the `valueTicks` non-dividing test is marked defensive. Approved by the user, 2026-10-13.

---

### CR-002: `categoriesCheck` declares the whole `categories` list as an input, so any failure inside any category hides a duplicate name

**Severity:** Issue
**Location:** `src/core/definitions/categories.ts:302` (`categoriesCheck.inputs: ["categories", "categories/*/name"]`); see `src/core/validate/state.ts:20-32` (`touchesFailed`) and `src/core/validate/domain.ts:27-28`
**Traces To:** AD-004 ("Every independent problem is reported"); GSV-REQ-017; acceptance criterion 1; DGP Edge Cases ("Two categories with the same name"); ticket Known Hazard (carried from graph-library/graph-specification-and-vocabulary-ticket-004-code-review/CR-003: "The check is skipped only when an earlier failure touches one of them")
**Description:** `touchesFailed("categories", failed)` is true for any failure at or below `/categories`. A failure at `/categories/0/color` (an unknown bar color) or `/categories/5/name` therefore skips the whole category check, although the check reads neither of those values.

Reproduced through `validateWith` with the delivery's own test-only registry: a bar graph with `categories: [{ name: "Mon", color: "notacolor" }, { name: "Tue" }, { name: "Tue" }]` reports only `unknown_color /categories/0/color`. The duplicate at `/categories/2/name` is not reported.

With `inputs: ["categories/*/name"]` instead:
- the same description reports both issues;
- an empty list is still `missing_property /categories` (presence is keyed on the first segment, `domain.ts:28`);
- an over-long list is still a single `too_large /categories`.

The `null` branch in `checkCategories` ("a category that failed stage 2 is `null`", `categories.ts:265`, `:280`) is never reached through the validator under either declaration: an element that failed touches `categories/*/name` too. Its test (`tests/core/categories.test.ts:138-140`) calls the function directly.
**Impact:** TICKET-003 registers `categoriesCheck` as the Notes instruct. A model that sends one bad bar color and a repeated category name is told only about the color, fixes it, and is then told about the duplicate. That second round is what GSV-REQ-017 and AD-004 exist to avoid.
**Recommendation:** Declare `inputs: ["categories/*/name"]`. Update the test "declare what the check reads" (`tests/core/categories.test.ts:142-144`). Add a validator-level test in which a bad bar color and a duplicate name are both reported. Reword the `null` comment to say the branch guards direct calls only, or drop it.
**Status:** Resolved
**Resolution:** Resolved — `categoriesCheck.inputs` is `["categories/*/name"]`; a validator test reports an unknown bar color and a duplicate name in one pass; the `null` comment now says it guards direct calls only. Approved by the user, 2026-10-13.

---

### CR-003: DGP-REQ-002's axis labels are listed in the `@spec Coverage` table at `shared.ts`, but carry no `@spec DGP-REQ-002`

**Severity:** Issue
**Location:** `src/core/definitions/shared.ts:24` (`// @spec GSV-REQ-040, GSV-REQ-043, GSV-REQ-045` above `sharedProperties`); `.gener8v/specifications/data-graphs-and-pictographs.md` (`## @spec Coverage`, DGP-REQ-002 row); delivery record `## @spec Annotations`
**Traces To:** DGP-REQ-002; CLAUDE.md "Traceability"; Code Review step 8; ticket Known Hazard (carried from graph-library/graph-specification-and-vocabulary-ticket-001-code-review/CR-004: the axis labels stay in `shared.ts`)
**Description:** DGP-REQ-002's category-axis and value-axis labels are implemented by `sharedProperties.categoryAxisLabel` and `.valueAxisLabel` (`src/core/definitions/shared.ts:82-99`), as the carried hazard requires. The specification's coverage row for DGP-REQ-002 lists `src/core/definitions/shared.ts:sharedProperties`. However, the annotation above `sharedProperties` names only GSV requirements, so `grep -rn "@spec.*DGP-REQ-002"` finds `categories.ts` and `index.ts` only. The delivery record's `@spec Annotations` table leaves `shared.ts` out, so the record and the specification disagree about where DGP-REQ-002 lives.
**Impact:** An audit by `grep` shows only the value-unit-label half of DGP-REQ-002 as implemented in a named location. The coverage table points at a declaration that the code does not tie to the requirement.
**Recommendation:** Add `DGP-REQ-002` to the `@spec` line above `sharedProperties` (`src/core/definitions/shared.ts:24`). This is an annotation-only change. Then add the `shared.ts` location to the delivery record's `@spec Annotations` table under Post-Review Amendments.
**Status:** Resolved
**Resolution:** Resolved — `@spec GSV-REQ-040, GSV-REQ-043, GSV-REQ-045, DGP-REQ-002` on `sharedProperties` (`src/core/definitions/shared.ts`); the delivery record's `@spec` table is corrected under Post-Review Amendments. Approved by the user, 2026-10-13.

---

### CR-004: On a line graph with negative values, a given maximum and interval can be rejected for not dividing a range the caller never wrote

**Severity:** Observation
**Location:** `src/core/definitions/categories.ts:179-181` (chosen minimum: `floorWhole(floor / tickInterval) × tickInterval`); `src/core/definitions/categories.ts:251-252` (`tick_interval_not_dividing`)
**Traces To:** DGP-REQ-008; DGP-REQ-015; DGP-REQ-005; the `valueScale` description ("a part left out is chosen to fit the data")
**Description:** With `allowNegative` and a negative value, a chosen minimum is the multiple of the interval, counted from zero, at or below the lowest value. When the maximum and interval are both given, that minimum ignores them.

Reproduced with `checkValueScale` and `allowNegative: true`: values `[-3, 5]` with `{ maximum: 10, tickInterval: 4 }` choose a minimum of −4 and report `tick_interval_not_dividing` at `/valueScale/tickInterval`: "must divide the value scale into whole intervals; got 4". Yet a minimum of −6 (10 − 4 × 4) keeps both given parts, includes every value and passes; `{ minimum: -6, maximum: 10, tickInterval: 4 }` returns no issue.

Bar graphs, and line graphs with no negative value, are unaffected: their minimum must be 0 (DGP-REQ-006), and there the report is right.
**Impact:** A valid-looking line-graph description is rejected with a message about a scale range the caller cannot see. A model can only fix it by guessing the chosen minimum.
**Recommendation:** When the maximum and interval are given, the minimum is chosen, and a value is negative, step down from the maximum: minimum = maximum − ⌈(maximum − lowest) / interval⌉ × interval. Otherwise, if ticks aligned to zero are preferred, put the chosen minimum in the issue (`range`, or the message) and record the rule in the `valueScale` description. This can be deferred to TICKET-002 (the line graph) as a Known Hazard.
**Status:** Resolved
**Resolution:** Resolved — with a given maximum and interval, no minimum and a negative value (line graph), the minimum is counted down from the maximum by the interval, so the interval divides the scale (`{ maximum: 10, tickInterval: 4 }` over −5 → minimum −6). Test in `tests/core/categories.test.ts`; the `valueScale` description updated. Approved by the user, 2026-10-13.

---

### CR-005: An empty `categories` list is reported as "required … add it", not as "at least one category is required"

**Severity:** Observation
**Location:** `src/core/definitions/categories.ts:276` (`checkCategories`); `src/core/definitions/categories.ts:269-272` (doc comment); `src/core/issues.ts:301` (`missing_property` template)
**Traces To:** DGP Edge Cases ("No categories: The system should report that at least one category is required"); acceptance criterion 1
**Description:** `categories: []` yields `missing_property` with the message "categories is required for a pictograph; add it." (reproduced, and pinned by `tests/core/categories.test.ts:97`). The doc comment above `checkCategories` says the empty list is reported as `missing_property` ("at least one category is required"). That reads as the message, but no message says it. AC 1 allows `missing_property`, so the code meets the criterion; only the wording differs from the edge case.
**Impact:** A caller or model that sent an empty list is told to add a property it already sent. That is workable, but less direct than the specified wording.
**Recommendation:** Either:
- give `missing_property` an optional detail for lists (for example `atLeast: 1`, rendering "categories needs at least 1 entry; add one."), and update the message snapshot; or
- keep the generic wording, and correct the doc comment so it does not quote a message the package never produces.
**Status:** Resolved
**Resolution:** Resolved — the shared `missing_property` message is kept (it is GSV's, used by every type); the `checkCategories` doc comment now quotes the message the package produces. Approved by the user, 2026-10-13.

---

### CR-006: `tick_spacing_invalid` is checked together with checks that read every scale part and value, so the prescribed single domain check can suppress it

**Severity:** Observation
**Location:** `src/core/definitions/categories.ts:214-221` (`checkValueScale`); delivery record `## Notes` ("Wrap `checkValueScale` in a `DomainCheck` whose `inputs` name the scale parts and the type's value paths"); `tests/core/categories.test.ts:35-46` (`scaleCheck`)
**Traces To:** AD-004; GSV-REQ-017; DGP-REQ-008
**Description:** Whether `tickInterval` is positive depends only on `valueScale/tickInterval`. `checkValueScale` reports it in the same call as the checks that read both ends and every value. The Notes tell TICKET-002 and TICKET-003 to wrap the whole function in one `DomainCheck` whose inputs list every scale part and `values/*`, so a failure in any of them skips the interval report too.

Reproduced with the delivery's test registry: `valueScale: { minimum: "x", tickInterval: 0 }` reports only `wrong_kind /valueScale/minimum`. The zero interval is reported only on the next attempt. A value of the wrong kind anywhere in `values` has the same effect.
**Impact:** Independent problems take two rounds to report, and the pattern is set here for both downstream data graphs.
**Recommendation:** Export the interval-sign check on its own, for example a ready `DomainCheck` with `inputs: ["valueScale/tickInterval"]`, and have `checkValueScale` leave it out (it already skips the dividing checks for an invalid interval). Otherwise, append a Known Hazard to TICKET-002 and TICKET-003 saying to register the two separately.
**Status:** Resolved
**Resolution:** Resolved — `checkTickInterval` and the ready `tickIntervalCheck` (inputs `["valueScale/tickInterval"]`) report `tick_spacing_invalid` on their own; `checkValueScale` no longer reports it. Tests: `{ minimum: "x", tickInterval: 0 }` and a failed value each report both issues. Approved by the user, 2026-10-13.

---

### CR-007: The record cites `pnpm check:deps` as proof of "no React in non-rendering code"; that script checks runtime dependencies

**Severity:** Observation
**Location:** delivery record `## Verification Run` (`pnpm check:deps` row) and `## Acceptance Criteria Verification` (AC 9); `scripts/check-dependencies.ts:74`; `eslint.config.js:116-118`
**Traces To:** Acceptance criterion 9; AD-001; Code Review step 8b
**Description:** `pnpm check:deps` checks that every runtime dependency is justified in `CONTRIBUTING.md`, and prints "Runtime dependencies: 0, all justified." The record's evidence for it reads "no React in non-rendering code", and AC 9 cites `pnpm check:deps` and `pnpm lint` for "imports nothing from React". The React boundary for `src/layout` is enforced by ESLint's boundary block, where `NON_RENDERING_DIRS` includes `layout` (`pnpm lint` exit 0), and by the test "imports nothing from React". The criterion holds; only the evidence is misattributed.
**Impact:** A later reader may trust `check:deps` to guard the React boundary and drop the lint rule or the test as redundant.
**Recommendation:** Under Post-Review Amendments, correct the `pnpm check:deps` evidence to "0 runtime dependencies, all justified". Cite `pnpm lint` (boundary rule) and the `value-scale.test.ts` test for AC 9.
**Status:** Resolved
**Resolution:** Resolved — the record's AC 9 evidence is corrected under Post-Review Amendments: `pnpm check:deps` checks runtime dependencies; the React boundary is `pnpm lint` and the value-scale test. Approved by the user, 2026-10-13.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Approve | Chosen interval divides a partly given scale; examples and property test | `src/core/definitions/categories.ts`, `tests/layout/kit/value-scale.test.ts` |
| CR-002 | Approve | Duplicate check reads names only; same-pass test | `src/core/definitions/categories.ts`, `tests/core/categories.test.ts` |
| CR-003 | Approve | `@spec DGP-REQ-002` on `sharedProperties`; record table corrected | `src/core/definitions/shared.ts`, delivery record |
| CR-004 | Approve | Minimum counted down from a given maximum by a given interval | `src/core/definitions/categories.ts`, `tests/core/categories.test.ts` |
| CR-005 | Approve (correct the doc) | Doc comment quotes the real message | `src/core/definitions/categories.ts` |
| CR-006 | Approve | `checkTickInterval` / `tickIntervalCheck` separate from `checkValueScale` | `src/core/definitions/categories.ts`, `tests/core/categories.test.ts` |
| CR-007 | Approve (correct the record) | AC 9 evidence corrected | delivery record |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (all 7 Resolved)
**Notes:** Every acceptance criterion is met and every requirement covered. All seven findings were fixed in resolution and re-verified: `pnpm generate`, `lint`, `typecheck`, `test` (30 files, 827 tests), `bench`, `build`, `check:dist`, `check:deps`, `size`, `publint`, `attw`, `audit` and `gener8v-state lint` all exit 0. Each fix was checked by breaking it on purpose: every break fails its new tests.
