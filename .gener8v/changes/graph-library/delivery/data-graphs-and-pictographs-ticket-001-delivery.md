# TICKET-001: Categories and value scale foundation — Delivery Record

## Ticket Reference

**Ticket:** graph-library/data-graphs-and-pictographs/TICKET-001
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/data-graphs-and-pictographs.md`
**Requirements Covered:**
- DGP-REQ-001: Ordered list of categories, each with a plain-text name
- DGP-REQ-002: Category-axis and value-axis labels; value-unit label on pictographs
- DGP-REQ-003: Categories drawn in the order given
- DGP-REQ-005: Optional value-scale minimum, maximum and tick interval
- DGP-REQ-006: Default scale starts at zero and includes every value
- DGP-REQ-007: Report a given scale that excludes a data value
- DGP-REQ-008: Report a tick interval that is not positive or does not divide the range
- DGP-REQ-009: Label every value-axis tick with its value

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Specification DGP-REQ-001..009, Scale and Layout rules, Edge Cases | present | `.gener8v/specifications/data-graphs-and-pictographs.md` | ✅ |
| Technical design AD-003, AD-004, AD-007, AD-010 | present | `.gener8v/technical-design/system-design.md` | ✅ |
| Cross-area predecessors (DEP-003): CPSE TICKET-001..003, GSV TICKET-001..004 | delivered | delivery records present; all done in `pipeline-state.yaml` | ✅ |
| `src/core/definitions/types.ts`, `shared.ts` (PropertySpec shape) | present | present; `ArrayValue.maxItems` required; `ObjectValue.ordered`; `StringValue` has no empty-text flag | ✅ |
| `categoryAxisLabel`, `valueAxisLabel` already shared (GSV CR-004) | in `shared.ts`, `appliesTo` line/bar | present, `presentation: "axisLabel"`; merged by `propertiesOf` | ✅ Not redefined here |
| Issue codes `scale_excludes_value`, `tick_interval_not_dividing`, `tick_spacing_invalid`, `too_many_ticks` | in `src/core/issues.ts` | all present with docs and messages | ✅ Reused; no new code for these |
| An issue code for a duplicate category name | present | none fits: `contradiction` says "change one so they agree", `ambiguous` says "fixes one figure" | ⚠️ Decision — see Implementation Plan |
| `inapplicable_property` for `valueUnitLabel` / `valueScale` on other types (AC 2, 3) | validator reports it | `structure.ts` reports `inapplicable_property` only for keys of `sharedProperties`; any other key is `unknown_property` | ⚠️ Needs a small validator change — see Implementation Plan |
| Domain checks receive only structurally valid values (`structure.ts`, `domain.ts`) | present | present; `failed` set and `inputs` skipping | ✅ |
| `src/layout/scene.ts`, `kit/format.ts`, `kit/scale.ts`, `kit/text.ts` | present | present; `fmt`, `linearScale`, `wrap(text, maxWidth, fontSize, maxLines)`, `textLines` in `kit/title.ts` | ✅ |
| `src/layout/kit/ticks.ts` (NLC TICKET-001) for the 1/2/5×10ⁿ rule | may exist | absent (NLC TICKET-001 not delivered) | ⚠️ Rule kept local, noted for consolidation (ticket Notes) |
| Test location `tests/layout/value-scale.test.ts` | as declared | kit tests live in `tests/layout/kit/` | ⚠️ Placed at `tests/layout/kit/value-scale.test.ts` |
| Carried: GSV TICKET-001 CR-004 (axis labels not redefined) | addressed here | — | 🔁 Carried |
| Carried: GSV TICKET-003 CR-002 (`ordered` on minimum/maximum) | addressed here | — | 🔁 Carried |
| Carried: GSV TICKET-003 CR-007 (meaning of `""` on the value-unit label) | addressed here | — | 🔁 Carried — decision in plan |
| Carried: GSV TICKET-003 SEC-001 (`maxItems` on every array) | addressed here | — | 🔁 Carried |
| Carried: GSV TICKET-004 CR-003 / SEC-004 (domain check rules) | addressed here | — | 🔁 Carried |

**Resolved from ground truth (not escalated):**
- Tick limit for the value scale: NLC uses a 100-tick limit with `too_many_ticks` (NLC TICKET-001). The value scale uses the same limit and code, so a check's work never grows with a value's magnitude (GSV TICKET-004 SEC-004).
- Schema agreement (GSV-NFR-003) needs only "schema rejects ⇒ validator rejects", so domain-stage checks that reject more (an empty category list, a duplicate name) keep agreement.

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-10-13

Decisions taken with the plan: categories are objects with a `name` (DEL-001); `""` on `valueUnitLabel` means no label, through an explicit flag on the text type (DEL-002, carried CR-007); a repeated category name gets a new issue code `duplicate_name` (DEL-003).

### Planned Files

- `src/core/definitions/categories.ts` (new):
  - `categoriesProperty(elementProperties?)` builds the `categories` list (at most 100; each entry an object with a required plain-text `name`); the bar graph passes `{ color: sharedProperties.color }`, so per-category color exists on bars only. `categories` is the default instance.
  - `dataGraphProperties`: `valueUnitLabel` (applies to pictographs) and `valueScale` (applies to line and bar graphs) with `minimum`, `maximum`, `tickInterval` (each within ±1,000,000,000) and `ordered: [["minimum","maximum"]]`; `tickInterval` has no lower bound so ≤ 0 reaches the check. Carried with `appliesTo` like the shared options: type definitions never list them, `propertiesOf` merges them in.
  - `checkCategories(categories)` → issues: empty list `missing_property` at `/categories`; a repeated name at the later entry, naming the first.
  - `checkValueScale(values, scale, { allowNegative })` → issues, `values` being `{ path, value }` pairs: interval ≤ 0 `tick_spacing_invalid`; not dividing the range (with a small tolerance) `tick_interval_not_dividing`; more than 100 ticks `too_many_ticks`, counted arithmetically; a maximum not above the computed minimum `out_of_range`; each value outside a given scale `scale_excludes_value` at that value's path. No check grows with a value's magnitude.
- `src/core/definitions/index.ts`, `src/core/validate/structure.ts`: `propertiesOf` and the inapplicability check read one list, `sharedProperties` plus `dataGraphProperties`, so `valueUnitLabel` on a bar graph or `valueScale` on a pictograph is `inapplicable_property` (AC 2, 3). `tests/core/definitions.test.ts`' registry consistency checks extended to the new list.
- `src/core/definitions/types.ts`: an explicit flag on `StringValue` for "an empty text is no text" (carried CR-007), read by `structure.ts`.
- `src/core/issues.ts`: scale codes reused as they are; adds `duplicate_name` with its documentation and message.
- `src/layout/kit/value-scale.ts` (new; no React import, every coordinate through `fmt()`): `defaultValueScale(values, { allowNegative })` (zero floor, or a 1/2/5×10ⁿ multiple below the lowest value when `allowNegative` and a value is negative; maximum at or above the largest value; all-zero → 0..1; at most 10 intervals); `resolveValueScale(given, values, opts)` (given parts exact, only missing parts filled); `valueTicks(scale)` (float noise rounded off); `drawValueAxis(scale, orientation, box)` (axis line, ticks, a text label on every tick, formatted with `formatSupplied`); `categorySlots(categories, box, orientation)` (even slots in description order, names wrapped with `wrap`, never cut). The 1/2/5 rule stays local, noted for consolidation with NLC's `ticks.ts`.
- `tests/core/categories.test.ts`: with a test-only registry of stand-in line, bar and pictograph definitions — empty and duplicate categories, inapplicable terms, each scale check.
- `tests/layout/kit/value-scale.test.ts` (kit tests' folder; the ticket names `tests/layout/`): default-scale rules, given scale exact, all-zero, labels on every tick, category order and wrapping, every coordinate rounded.

### How Acceptance Criteria Will Be Met

- `categories` required, non-empty, duplicates named: `categoriesProperty` (required, `maxItems` 100) + `checkCategories` — `tests/core/categories.test.ts`
- Axis labels on line/bar, `valueUnitLabel` on pictographs, inapplicable elsewhere: shared axis labels as they are + `dataGraphProperties` `appliesTo` read by `propertiesOf` and `structure.ts` — `tests/core/categories.test.ts`
- `valueScale` on line/bar, inapplicable on pictographs: same — `tests/core/categories.test.ts`
- Default scale from zero (below zero only with `allowNegative`), covering the largest value; all-zero 0..1: `defaultValueScale` — `tests/layout/kit/value-scale.test.ts` (examples and a property test)
- A given scale used exactly; excluded values reported with `scale_excludes_value` at their paths: `resolveValueScale`, `checkValueScale` — both test files
- Interval ≤ 0 `tick_spacing_invalid`; non-dividing `tick_interval_not_dividing`: `checkValueScale` — `tests/core/categories.test.ts`
- Every value-axis tick labeled: `drawValueAxis` — `tests/layout/kit/value-scale.test.ts`
- Category slots in order, long names wrapped not truncated: `categorySlots` — `tests/layout/kit/value-scale.test.ts`
- Coordinates through `fmt()`, no React import: `fmt` everywhere; a test that every coordinate has at most two decimals; `pnpm check:deps` and lint

## Progress

- [x] `src/core/issues.ts` — `duplicate_name`
- [x] `src/core/definitions/types.ts` — empty-text flag (`emptyIsAbsent`)
- [x] `src/core/definitions/categories.ts` — written, annotated
- [x] `src/core/definitions/index.ts` — scoped terms in `propertiesOf`
- [x] `src/core/validate/structure.ts` — inapplicability over scoped terms; empty-text flag
- [x] `src/layout/kit/value-scale.ts` — written, annotated
- [x] `tests/core/categories.test.ts`
- [x] `tests/layout/kit/value-scale.test.ts`
- [x] `tests/core/definitions.test.ts` — consistency checks over the new list
- [x] `tests/core/issues.test.ts` — the new code in the catalogue snapshots (not in the plan; required by the new code)

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/core/definitions/categories.ts`: new — `categoriesProperty` / `categories`, `dataGraphProperties` (`valueUnitLabel`, `valueScale`), `resolveValueScale`, `niceInterval`, `checkValueScale`, `checkCategories`, `categoriesCheck`, and the limits `CATEGORY_LIMIT` (100), `VALUE_LIMIT` (1,000,000,000), `MAX_VALUE_TICKS` (100)
- `src/layout/kit/value-scale.ts`: new — `defaultValueScale`, `valueTicks`, `tickLabel`, `valuePosition`, `valueAxisExtent`, `drawValueAxis`, `categorySlots`, `drawCategoryNames`; re-exports `resolveValueScale`
- `src/core/definitions/index.ts`: `scopedPropertyMaps`, `scopedProperty`; `propertiesOf` merges every scoped map
- `src/core/validate/structure.ts`: `inapplicable_property` for any scoped term a type has nowhere; `emptyIsAbsent` honoured
- `src/core/definitions/types.ts`: `StringValue.emptyIsAbsent`
- `src/core/issues.ts`: `duplicate_name` code, documentation, parameters and message
- `tests/core/categories.test.ts`: new, 33 tests over a test-only registry of stand-in line, bar and pictograph definitions
- `tests/layout/kit/value-scale.test.ts`: new, 29 tests, two of them property tests
- `tests/core/definitions.test.ts`: consistency, applicability and lock-down checks extended to `dataGraphProperties`; `propertiesOf` expectations for bar graph and pictograph
- `tests/core/issues.test.ts`: `duplicate_name` sample and catalogue snapshots
- `.gener8v/specifications/data-graphs-and-pictographs.md`: `## @spec Coverage` section added

## Verification Run

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm install --frozen-lockfile` | 0 | — |
| `pnpm generate` | 0 | generated files unchanged (no data-graph type is registered yet) |
| `pnpm lint` | 1 → 0 | first run: unused variable in `tests/core/categories.test.ts:93`; fixed and re-run: 0 |
| `pnpm typecheck` | 0 | — |
| `pnpm test` | 0 | 30 files, 817 tests (was 754) |
| `pnpm bench` | 0 | GSV-NFR-001 circle p95 0.0236 ms |
| `pnpm build` | 0 | — |
| `pnpm check:dist` | 0 | — |
| `pnpm check:deps` | 0 | no React in non-rendering code |
| `pnpm size` | 0 | `.` 15.43 kB, `./core` 12.5 kB, `./circle` 15.37 kB (limits 120 / 25 / 25 kB) |
| `pnpm publint` | 0 | — |
| `pnpm attw` | 0 | — |
| `pnpm audit` | 0 | No known vulnerabilities found |
| `gener8v-state.py lint` | 0 | 0 errors, 0 warnings |
| Mutation checks (scratchpad backups, restored) | — | each caught: inapplicability limited to presentation options (6 fail), `emptyIsAbsent` ignored (1), exact whole-number test (1), given minimum never excluding (1), names compared uncleaned (1), no inclusion guard at the top (1) or bottom (2), category names cut at 2 lines (3), all-zero fallback removed (1) |

During the first full run, `tests/layout/circle.test.ts` › "keeps the Scene small and the run short for caller-sized text" took 2,071 ms against its 2,000 ms bound under full-suite load; it passed alone and in both later full runs.

## Acceptance Criteria Verification

- [x] `categories` is a required, non-empty array of plain-text names; an empty list is reported (`missing_property` at `/categories`), and a duplicate name is reported naming both positions — `tests/core/categories.test.ts` › "are required, and an empty list is reported as missing", "report a repeated name at the later category, naming the first" (`conflicts` holds the first position)
- [x] `categoryAxisLabel` and `valueAxisLabel` accepted on line and bar graphs; `valueUnitLabel` on pictographs; each reported as inapplicable on the other types — `tests/core/categories.test.ts` › "axis and unit labels" (5 inapplicable cases, circle included)
- [x] `valueScale` (`minimum`, `maximum`, `tickInterval`, all optional) accepted on line and bar graphs and reported as inapplicable on pictographs — `tests/core/categories.test.ts` › "value scale terms"
- [x] With no scale given, the computed scale starts at zero (below zero only for negative values with `allowNegative`), its maximum is at or above the largest value; all-zero data gives 0..1 — `tests/layout/kit/value-scale.test.ts` › "defaultValueScale" (8 examples, all-zero, and a 500-run property test)
- [x] A given scale is used exactly and never extended; a given scale excluding a value is reported with `scale_excludes_value` at the value's path — `tests/core/categories.test.ts` › "uses a given scale exactly and never extends it", "reports each value outside a given scale at the value's own path"
- [x] A tick interval ≤ 0 is `tick_spacing_invalid`; one not dividing (maximum − minimum) is `tick_interval_not_dividing` — `tests/core/categories.test.ts` › "reports a tick interval of 0 / -2…", "reports a tick interval that does not divide the scale", "accepts decimal intervals that divide the scale"
- [x] Every tick on the value axis is drawn with a text label showing its value — `tests/layout/kit/value-scale.test.ts` › "labels every tick with its value" (both orientations)
- [x] Category slots in description order; long names wrapped with the kit's `wrap`, never truncated — `tests/layout/kit/value-scale.test.ts` › "lays the categories out in description order…", "wraps a long name…keeping every word", "splits a single word wider than its slot without dropping any of it"
- [x] All coordinates written by `value-scale.ts` pass through `fmt()`; the module imports nothing from React — `tests/layout/kit/value-scale.test.ts` › "writes every number through fmt()" (property test), "draws every line of every name…through fmt()", "imports nothing from React"; `pnpm check:deps` and `pnpm lint` (exit 0)

## Decisions Made

### DEL-001: A category is an object with a `name`

**Context:** DGP-REQ-001 says "each with a plain-text name"; TICKET-003 nests the shared per-category `color` in each bar-graph category, and the Edge Cases table reports a category color on a pictograph as not applying.
**Decision:** `categories` is a list of objects with a required `name`. `categoriesProperty(elementProperties)` builds it; the bar graph passes `{ color: sharedProperties.color }`, the line graph and pictograph use `categories`. Each type lists it in its own properties (its element shape differs by type, so it is not a scoped term).
**Rationale:** With objects, a pictograph category's `color` is reported as `inapplicable_property` by the existing `elementsOf` rule, with no extra code, and TICKET-003's nesting note can be followed. Plain strings would need a parallel color list. Chosen by the user with the plan.
**Ticket Impact:** AC 1's "array of plain-text names" is an array of `{ name }` objects.

### DEL-002: An empty value-unit label means no label

**Context:** Carried GSV TICKET-003 CR-007: say whether `""` on `valueUnitLabel` is no label or a blank label, and use an explicit flag rather than `presentation`.
**Decision:** No label: `""` is dropped and the pictograph key says "units". `StringValue.emptyIsAbsent` is the flag; `structure.ts` drops an empty text when the spec is a presentation option or sets the flag. A whitespace-only label is kept. Chosen by the user with the plan.
**Rationale:** Matches the shared presentation options, and the spec's "units when none is given".
**Ticket Impact:** None beyond the flag.

### DEL-003: A new issue code, `duplicate_name`

**Context:** No existing code fits a repeated category name: `contradiction` says "change one so they agree", `ambiguous` says "fixes one figure".
**Decision:** `duplicate_name` with `{ term, got, conflicts, conflictTerms }`, reported at the later category with `conflicts` naming the first: `categories[2].name ("Mon") repeats categories[0].name; give each one a different name.` Names are compared as drawn (after `cleanText`), so letter case makes a different name. Chosen by the user with the plan.
**Rationale:** Adding a code is not a breaking change (`tests/core/issues.test.ts` RELEASED_CODES); a correct message matters for the model fixing the description. TICKET-002 can reuse it for series labels.
**Ticket Impact:** `src/core/issues.ts` gains a code; the design's "IssueCode set (initial)" is extended, as `too_large` extended it before.

### DEL-004: Data-graph terms are scoped like the shared options; the scale arithmetic lives in core

**Context:** AC 2 and 3 need `inapplicable_property` for `valueUnitLabel` and `valueScale`, but `structure.ts` reported it only for `sharedProperties`. Separately, `checkValueScale` needs the default scale's rules, and core must not depend on layout code.
**Decision:** `dataGraphProperties` carries `appliesTo` / `elementsOf` like the shared options. `index.ts` exposes `scopedPropertyMaps` (`sharedProperties`, `dataGraphProperties`) and `scopedProperty(key)`; `propertiesOf` merges every scoped map and `structure.ts` reports any scoped term a type has nowhere. `sharedProperties` stays the presentation options only (GSV-REQ-040). The arithmetic (`resolveValueScale`, `niceInterval`) is in `categories.ts`; `value-scale.ts`'s `defaultValueScale` delegates to it and re-exports it.
**Rationale:** One rule for "a term that applies to some types": no per-type lists, the existing definitions tests cover it, and validation and drawing share one scale rule.
**Ticket Impact:** `src/core/definitions/index.ts` and `src/core/validate/structure.ts` changed (not in the ticket's Output). Type definitions never list `valueUnitLabel` or `valueScale`; the definitions test fails if they do.

### DEL-005: Default scale and limits

**Context:** DGP-REQ-006 fixes only "starts at zero and includes every value"; GSV TICKET-004 SEC-004 requires checks bounded by size, not magnitude.
**Decision:**
- Interval: the smallest 1, 2 or 5 × 10ⁿ giving at most 10 intervals over the data's span, never finer than 1e-9 (a property test found a 5e-324 value made the interval underflow to 0).
- Ends: a chosen minimum is 0, or with `allowNegative` the first tick at or below the lowest value; a chosen maximum is the first tick at or above the highest value. A guard steps an end out by one interval if the decimal-noise tolerance left a value outside.
- All-zero data: 0 to 1, or one given interval.
- Limits: at most 100 categories, scale ends within ±1,000,000,000, at most 100 ticks (`too_many_ticks`, counted arithmetically, same limit as NLC).
**Rationale:** Readable tick labels, every value included, bounded work.
**Ticket Impact:** None; the limits are in the property descriptions.

## Deviations from Plan

- `tests/core/issues.test.ts` updated (not listed): the catalogue snapshots must show the new code. No downstream impact.
- `value-scale.ts` has helpers beyond the plan: `tickLabel`, `valuePosition`, `valueAxisExtent`, `drawCategoryNames`, `CATEGORY_NAME_WIDTH`, and an optional `nameWidth` on `categorySlots` for names beside a horizontal plot. They give TICKET-002, 003 and 005 one place for value positions, axis room and name drawing.
- `categories.ts` also exports `categoriesCheck` (the category checks as a ready `DomainCheck`), `ScaledValue`, `niceInterval` and the limit constants.
- The 1e-9 floor and the inclusion guard in `resolveValueScale` (DEL-005) were added during verification, after property tests found the underflow.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| DGP-REQ-001 | `src/core/definitions/categories.ts`:categoriesProperty, checkCategories | `@spec DGP-REQ-001, DGP-REQ-003` / `@spec DGP-REQ-001` |
| DGP-REQ-001 | `src/layout/kit/value-scale.ts`:categorySlots, drawCategoryNames | `@spec DGP-REQ-001, DGP-REQ-003` |
| DGP-REQ-002 | `src/core/definitions/categories.ts`:dataGraphProperties | `@spec DGP-REQ-002, DGP-REQ-005` |
| DGP-REQ-002 | `src/core/definitions/index.ts`:propertiesOf | `@spec GSV-REQ-012, GSV-REQ-040, DGP-REQ-002, DGP-REQ-005` |
| DGP-REQ-003 | `src/core/definitions/categories.ts`:categoriesProperty; `src/layout/kit/value-scale.ts`:categorySlots, drawCategoryNames | `@spec DGP-REQ-001, DGP-REQ-003` |
| DGP-REQ-005 | `src/core/definitions/categories.ts`:dataGraphProperties, resolveValueScale; `src/core/definitions/index.ts`:propertiesOf | `@spec DGP-REQ-002, DGP-REQ-005` / `@spec DGP-REQ-005, DGP-REQ-006` |
| DGP-REQ-006 | `src/core/definitions/categories.ts`:resolveValueScale; `src/layout/kit/value-scale.ts`:defaultValueScale | `@spec DGP-REQ-005, DGP-REQ-006` / `@spec DGP-REQ-006` |
| DGP-REQ-007 | `src/core/definitions/categories.ts`:checkValueScale | `@spec DGP-REQ-007, DGP-REQ-008` |
| DGP-REQ-008 | `src/core/definitions/categories.ts`:checkValueScale | `@spec DGP-REQ-007, DGP-REQ-008` |
| DGP-REQ-009 | `src/layout/kit/value-scale.ts`:valueTicks, drawValueAxis | `@spec DGP-REQ-009` |

## Notes

- **For TICKET-002, 003 and 005:**
  - List `categories` (bar graph: `categoriesProperty({ color: sharedProperties.color })`) in the definition's properties and add `categoriesCheck` to `checks`; never list `valueScale` or `valueUnitLabel`.
  - Wrap `checkValueScale` in a `DomainCheck` whose `inputs` name the scale parts and the type's value paths (`values/*` or `series/*/values/*`); pass `allowNegative: true` for the line graph only.
  - Bound data values to ±`VALUE_LIMIT` in the value specs.
  - The bar graph's "minimum above zero" and negative-value checks, and `series_length_mismatch`, are the type's own.
  - Draw with `resolveValueScale(description.valueScale, values, …)`, then `valueAxisExtent`, `drawValueAxis`, `categorySlots` and `drawCategoryNames`.
- **Text size (security):** category names wrap with no line cap, because the spec says a name is never truncated. A caller-sized name therefore grows the Scene, unlike labels and titles (GSS TICKET-002 SEC-001, DEL-008). This waits on the pending Product Owner decision on a caller-text length bound (GSS TICKET-002 security review SEC-002). The type tickets' Known Hazards already carry the SEC-001 rules.
- **Tick-label width:** a valid but extremely fine given scale (for example `tickInterval` 1e-300 over a range of 1e-298) passes the checks, but its tick labels print hundreds of digits. The type tickets should bound value precision, or `valueAxisExtent` will ask for more room than the drawing has.
- **Consolidation:** the 1/2/5 × 10ⁿ rule (`niceInterval`) is local until NLC TICKET-001's `src/layout/kit/ticks.ts` exists. NLC aims at 5–20 ticks; this aims at no more than 10 intervals.
- **Messages:** they name the type by its `type` value ("does not apply for a bar-graph"), which is existing `forGraph` behaviour from GSV.
- **Bundle size:** `propertiesOf` now reads `dataGraphProperties`, so the circle entry grew from 14.68 to 15.37 kB, core from 11.83 to 12.5 kB and `.` from 14.73 to 15.43 kB, all within budget.
- **Tooling:** the plugin's PreToolUse hook warned "no delivery is In Progress" on every source write while this record said `**Status:** In Progress`. This is the known false warning: the hook reads only the first 4,000 characters, and the status line sits after the plan (see the CPSE TICKET-002 record's Notes).

## Post-Review Amendments

### Code review — `graph-library/data-graphs-and-pictographs-ticket-001-code-review` (2026-10-13, Approved)

- **CR-001** — `resolveValueScale`: when an end is given and the interval is chosen, the interval divides the scale (`dividingInterval`, with `stepBeside` over the 1-2-5 sequence), so the axis ends on a tick (`{ maximum: 15 }` → interval 5). Files: `src/core/definitions/categories.ts`, `tests/layout/kit/value-scale.test.ts` (examples; 1,000-run property test).
- **CR-002** — `categoriesCheck.inputs` → `["categories/*/name"]`, so a failure elsewhere in a category no longer hides a duplicate name. Files: `src/core/definitions/categories.ts`, `tests/core/categories.test.ts`.
- **CR-003** — `@spec DGP-REQ-002` added to `sharedProperties`. File: `src/core/definitions/shared.ts`. `@spec` table correction: DGP-REQ-002 | `src/core/definitions/shared.ts`:sharedProperties (category- and value-axis labels) | `@spec GSV-REQ-040, GSV-REQ-043, GSV-REQ-045, DGP-REQ-002`.
- **CR-004** — with a given maximum and interval and a negative value, the chosen minimum is counted down from the maximum by the interval (−6 for `{ maximum: 10, tickInterval: 4 }` over −5); `valueScale` description updated. Files: `src/core/definitions/categories.ts`, `tests/core/categories.test.ts`.
- **CR-005** — `checkCategories` doc comment corrected to the message the package produces; the GSV `missing_property` message is unchanged. File: `src/core/definitions/categories.ts`.
- **CR-006** — new `checkTickInterval` and `tickIntervalCheck` (inputs `["valueScale/tickInterval"]`) report `tick_spacing_invalid`; `checkValueScale` no longer does. **For TICKET-002 and TICKET-003:** register `tickIntervalCheck` beside the scale check. `@spec` table addition: DGP-REQ-008 | `src/core/definitions/categories.ts`:checkTickInterval | `@spec DGP-REQ-008`. Files: `src/core/definitions/categories.ts`, `tests/core/categories.test.ts`; spec `@spec Coverage` row updated.
- **CR-007** — AC 9 evidence correction: `pnpm check:deps` checks that runtime dependencies are justified; "no React in non-rendering code" is proven by `pnpm lint` (boundary rule) and `tests/layout/kit/value-scale.test.ts` › "imports nothing from React".
- **Re-verification:** `pnpm generate`, `lint`, `typecheck`, `test` (30 files, 827 tests), `bench` (circle p95 0.0222 ms), `build`, `check:dist`, `check:deps`, `size` (`.` 15.46 kB, `./core` 12.53 kB, `./circle` 15.4 kB), `publint`, `attw`, `audit` (no vulnerabilities) and `gener8v-state lint` — all exit 0. Deliberate breaks of CR-001, 002, 004 and 006 each fail their new tests.

### Quality review — `graph-library/data-graphs-and-pictographs-ticket-001-quality-review` (2026-10-13, Approved)

- **QR-005 (structure)** — the value-scale arithmetic and checks moved from `src/core/definitions/categories.ts` to a new core module, `src/core/value-scale.ts`: `VALUE_LIMIT`, `MAX_VALUE_TICKS`, `GivenValueScale`, `ValueScale`, `ScaleOptions`, `cleanDecimal`, `intervalsIn`, `niceInterval`, `resolveValueScale`, `valueTicks`, `ScaledValue`, `checkTickInterval`, `tickIntervalCheck`, `checkValueScale`. `categories.ts` re-exports all of them (the ticket's declared Output still resolves); the layout kit imports `valueTicks` from core and re-exports it. Known Hazard appended to `number-lines-and-coordinate-graphs/TICKET-001.md`.
- **QR-002** — supersedes code review CR-001's dividing interval. A chosen interval is chosen first (1, 2 or 5 × 10ⁿ, at most ten intervals) and chosen ends are multiples of it. `ValueScale` gains `tickBase` (the minimum for a given interval, 0 for a chosen one). `valueTicks` draws both ends and every grid tick at least one interval from either end, so an off-grid given end replaces its neighbour: `{ maximum: 97 }` → 0, 10, … 80, 97. A grid tick is dropped when it is less than one interval from an end (the approved option said half an interval; half can be 9 drawing units, under a 14.4-unit label).
- **QR-003** — one `intervalsIn` count shared by `checkValueScale` and `valueTicks`; boundary tests at 0.7/0.007 (too many ticks) and 0.693/0.007 (100 ticks drawn).
- **QR-004** — the underflowing fallback is gone with QR-002; a tiny given maximum draws.
- **QR-001** — placement tests for ticks, tick labels and category names in both orientations; a 100-category case; `drawCategoryNames` doc corrected (names beside a horizontal plot are centered in their column).
- **QR-006** — definitions-test rule: `emptyIsAbsent` only on optional properties, never on list items; documented on `StringValue`.
- **QR-007** — `ScopedPropertySpec` (alias `SharedPropertySpec` kept), no casts in `index.ts`, "scoped term" wording in the definitions test.
- **QR-008** — `categoriesProperty()` returns the defined spec; `categories` is pure-marked and dropped from every bundle.
- **QR-009** — the soft hyphen in a test input is written as `\u00ad`.
- **`@spec` table update:** DGP-REQ-005, 006 → `src/core/value-scale.ts`:resolveValueScale; DGP-REQ-007, 008 → `src/core/value-scale.ts`:checkValueScale, checkTickInterval; DGP-REQ-009 → `src/core/value-scale.ts`:valueTicks (with `src/layout/kit/value-scale.ts`:drawValueAxis). The spec's `@spec Coverage` rows are updated to match.
- **For TICKET-002, 003 and 005:** draw with `resolveValueScale(...)` and `valueTicks(scale)` (or `drawValueAxis`), never by stepping from the minimum yourself: ticks are no longer `minimum + k × tickInterval` when the interval is chosen.
- **Re-verification:** `pnpm generate`, `lint`, `typecheck`, `test` (30 files, 836 tests), `bench` (circle p95 0.0196 ms), `build`, `check:dist`, `check:deps`, `size` (`.` 15.3 kB, `./core` 12.36 kB, `./circle` 15.23 kB), `publint`, `attw`, `audit` (no vulnerabilities) and `gener8v-state lint` — all exit 0. Deliberate breaks of QR-001, 002, 003 each fail their tests.

