# TICKET-002: Deliver the number line graph type — Delivery Record

## Ticket Reference

**Ticket:** graph-library/number-lines-and-coordinate-graphs/TICKET-002
**Change:** `.gener8v/changes/graph-library/change.md` — Approved (Product Owner — Thomas, 2026-10-04)
**Specification:** `.gener8v/specifications/number-lines-and-coordinate-graphs.md` (Approved)
**Requirements Covered:**
- NLC-REQ-001: number line parameters in the single definition, as vocabulary terms (number-line part)
- NLC-REQ-010: each point whose value lies outside the axis range is reported (number-line part)
- NLC-REQ-011: optional label and color per point (GSV-REQ-040..045)
- NLC-REQ-012: text alternative from the normalized description: type, range, every marked point (number-line part)
- NLC-REQ-013: a caller-supplied text alternative replaces the generated one
- NLC-REQ-014: negative-only, positive-only and zero-spanning ranges render
- NLC-REQ-015: a separate arrowhead setting for each end
- NLC-REQ-016: an arrowhead at an end when, and only when, its setting is on
- NLC-REQ-017: documented default arrowhead setting (both on)
- NLC-REQ-018: each point marked at its value
- NLC-REQ-019: custom tick labels replace the numeric label at a tick
- NLC-REQ-020: a custom tick label off a tick position is reported
- NLC-REQ-021: optional label for the line as a whole
- (NLC-NFR-001..004 are TICKET-005's; the validation benchmark picks up the new example automatically.)

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Predecessor NLC TICKET-001 delivered | record + outputs | `delivery/number-lines-and-coordinate-graphs-ticket-001-delivery.md`: Delivered, passed, three reviews Approved; `src/core/definitions/axis.ts`, `src/core/value-scale.ts`, `src/layout/kit/axis.ts`, `src/layout/kit/ticks.ts` present | ✅ |
| Cross-area predecessors (DEP-002): CPSE TICKET-002/003, GSV TICKET-001..004 | delivered | all Delivered / passed | ✅ |
| `axisProperties` is how the axis is defined | `axisProperties` | `axisProperty(term, name)` wraps `axisProperties` with `ordered: [["min","max"]]`; checks via `axisDomainChecks(term)` (renamed from `axisCheck`, QR-006) | ⚠️ Resolved — use `axisProperty("axis", "number line's")` + `...axisDomainChecks("axis")` |
| Ticks: `niceTicks`, `tickLabel`, `drawAxis` | present | present; `drawableTicks`/`isTickValue` for checks (CR-006/CR-007); `drawAxis` throws on >100 labels, reads `labels` own-key, needs a `Map` | ✅ |
| Issue codes `outside_axis_range`, `tick_label_not_on_tick` | in `src/core/issues.ts` | present; params `{term, got, range}` and `{term, got}` | ✅ |
| Layout contract `layout(normalized) → Scene` | one argument | `Layout<D>` is `(normalized, provenance)`; `describe(normalized, provenance)` | ⚠️ Resolved by carried hazard (GSS T-002 CR-003) — two arguments |
| `textAlternative` is a property of the definition (Output) | description term | No type defines it. A caller's text alternative is the component prop, applied by `textAlternativeFor` (`src/layout/scene.ts`) for every type (CPSE-REQ-012); the ruler met NLC-REQ-013 the same way | ⚠️ Resolved — no description term; NLC-REQ-013 via the prop, tested in `Graph.test.tsx` |
| AD-008 arrowheads as polygons; kit has "arrowhead shapes" (TD layout kit) | arrowhead helper | none in `src/layout/kit/` (`markers.ts` has point markers only) | ⚠️ Arrowhead polygon built in this ticket (layout-local, see plan) |
| `lineColor` colors the number line (PO decision, GSV T-001 CR-003) | an axis color option | `drawAxis` hard-codes `defaultStyle.colors.line`; it has no production caller yet (the number line is the first) | ⚠️ Decision D1 — additive `lineColor` option on `drawAxis` |
| `title`, `lineColor`, `lineLabel` reach `number-line` via `appliesTo`; `label`, `color` via `elementsOf` | listed | `src/core/definitions/shared.ts`: yes for all five | ✅ |
| Caller text bounded (carried GSS T-002 SEC-001/2/3; NLC T-001 SEC-003 "e.g. 40 characters") | per-term limit | Superseded by GSV-REQ-052..054 (GSV TICKET-007): every string term must have `maxLength` = `CALLER_TEXT_LIMIT` (200), or `UNIT_TEXT_LIMIT` (20) for `unit`, and its description must contain "at most N characters"; `tests/core/validate-structure.test.ts:797` enforces it on every registered type | ⚠️ Resolved — custom label text at 200, cut to one line when drawn (Decision D3) |
| "Half a megabyte of label text renders without throwing" test (carried GSS T-002 SEC-003) | test | Since GSV TICKET-007 such text is refused as `too_large`; the pattern is now an at-the-limit render test + an over-limit refusal row (`tests/react/Graph.test.tsx:460-492`) | ⚠️ Resolved — follow the current pattern |
| `""` on custom tick labels (carried GSV T-003 CR-007) | decide | `StringValue.emptyIsAbsent` is rejected by the definitions test on required terms and list items (`types.ts` doc; QR-006). The label `text` is a required list-item term | ⚠️ Resolved from ground truth — `""` is a blank label, kept (a blank to fill in) |
| Every `array` has `maxItems` (GSV T-003 SEC-001) | compiler-required | `ArrayValue.maxItems: number` required | ✅ (limits: Decision D5) |
| Terms defined once, same kind + description (definitions test `consistencyProblems`) | — | `value` would be used by both `points[]` and `tickLabels[]` | ⚠️ One shared `value` spec object for both lists |
| `examples/<type>.json` required, rich (GSV T-005 CR-001) | — | `schema-agreement.test.ts`, `Graph.test.tsx` "fit together", `validate.bench.ts` all read `examples/${type}.json` for every registered type | ✅ plan includes it |
| Four entry-point lists | — | `package.json` exports, `tsup.config.ts`, `.size-limit.json` (agreement enforced by `tests/package/entries.test.ts`) and `src/index.ts` (enforced by `Graph.test.tsx` "exports one per-type component for every defined type") | ✅ plan includes all four |
| Per-type bundle isolation | — | `tests/package/per-type-bundle.test.ts`: source bundles and built-entry consumer bundles; each type adds a case | ✅ plan adds the case |
| Own-key reads of props and Scene nodes (rulers NLC T-003 SEC-002) | — | already in shared `renderGraph` and `checkNode`; nothing per type, but the layout's own optional reads (e.g. `labels`) stay own-key | ✅ |
| Text kit mark bound (GSV T-007 DEL-002) | — | `wrap()` bounds stacked marks (`MAX_STACKED_MARKS` 4) and cluster length (16); `drawAxis` draws its labels as given, so custom labels must go through `wrap(…, 1)` first | ✅ plan routes every caller text through `wrap` |
| Component name | `NumberLineGraph` | `componentName("number-line")` → `NumberLineGraph` (pinned in `Graph.test.tsx:111`) | ✅ |
| Test fixture `tests/fixtures/definitions/number-line.ts` | — | a test-only number line (`arrowheads` enum, `tickCount`) in the fixture registry; separate from `definitions` | ✅ leave it (QR-009: fixtures stay independent of real rules) |
| Shared code the ticket depends on is on `main` | present | GSV TICKET-007 (caller text limits, the text kit's mark bound) passed all three reviews and is on `main` at `204b174`; this branch, `ticket/nlc-002`, starts there with the ready-tickets hazards (`7a24a45`) | ✅ |
| Carried: graph-library NLC T-001 code review CR-006 (checks use `drawableTicks`) | addressed here | — | 🔁 Carried — tick-label check |
| Carried: NLC T-001 CR-007 (`isTickValue` in the off-tick check) | addressed here | — | 🔁 Carried — tick-label check |
| Carried: NLC T-001 security review SEC-003 (custom label length, one-line cut, `cleanText`, at/over-limit tests, keep `maxItems`) | addressed here | — | 🔁 Carried — D3, tests |
| Carried: GSV T-001 CR-002 / QR-001, QR-002 (`defineProperties`, no listed shared options, nested shared specs, `format.ts` imports, `quoteText`, register + definitions test) | addressed here | — | 🔁 Carried — definition |
| Carried: GSV T-004 CR-003 / SEC-004 (domain-check `inputs`, frozen input, `createIssue`, size-bounded work) | addressed here | — | 🔁 Carried — checks |
| Carried: GSV T-005 CR-001 / QR-001, QR-002 (rich example; `pnpm generate` committed) | addressed here | — | 🔁 Carried — example, generated files |
| Carried: GSS T-002 CR-003 (provenance; own `describe`; `titleBlock`; blank title absent) | addressed here | — | 🔁 Carried — layout/describe |
| Carried: GSS T-002 SEC-001/002/003 (no caller-sized spreads; wrap and cap labels; say so in descriptions) | addressed here | — | 🔁 Carried — layout; `lineLabel` description |
| Carried: PO decision 2026-10-06 (`title`, `lineColor` on the number line, with tests) | addressed here | — | 🔁 Carried — D1, layout, describe |
| Non-carry, for awareness: rulers QR-002 / CR-002 (top-level values of a definition or layout kept by bundlers) | — | ruler uses `/* @__NO_SIDE_EFFECTS__ */` factories and computes layout constants inside the function; built-entry consumer bundle test catches leaks | ℹ️ Follow the same pattern |

**Resolved from ground truth (not escalated):**
- **`textAlternative` term:** not a description term in this codebase. `textAlternativeFor` applies the component prop for every type; NLC-REQ-013 is met and tested through `<Graph>` and `<NumberLineGraph>`, as the ruler did.
- **Empty custom tick label (GSV T-003 CR-007):** the definitions test refuses `emptyIsAbsent` on required and list-item terms, so `""` is a blank label that is kept and drawn as nothing at that tick (the numeric label is replaced by a blank, for "fill in the missing number"). State it in the term's description and test it.
- **Custom label length (NLC T-001 SEC-003's "for example 40"):** GSV TICKET-007 made 200 the one limit for every non-unit text, and a test enforces exactly that. The term gets `maxLength: CALLER_TEXT_LIMIT`. The drawing still cuts each label to one line (`wrap(…, 1)`), which is the part of SEC-003 that bounds the Scene.
- **Half-megabyte text test:** replaced by the post-GSV-007 pattern: render at the limit (bounded `<text>` count) and refuse one character over with `too_large`.
- **Axis helper names:** `axisProperty` / `axisDomainChecks`, not `axisProperties` / `axisCheck`.
- **Two-argument contract:** `Layout<D>` and `describe` both take `provenance`.
- **Shared `value` term:** points and tick labels share one spec object, or the definitions test fails with "value: defined twice, differently".

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-10-21

The Engineer approved every decision as recommended: D1(a) with ticks taking `lineColor`, D2(a), D3(a) with a fixed 80-unit cut, D4 confirmed, D5(a), D6(a), D7(a), D8(a), D9(a), D10(a), D11(a). D12 is settled: `ticket/nlc-002` starts from `main` after GSV TICKET-007 merged.

### Planned Files

- `src/core/definitions/number-line.ts` (new):
  - `NumberLine extends DescriptionBase` holds `axis: Axis`, `leftArrow?`, `rightArrow?`, `points?: readonly NumberLinePoint[]`, `tickLabels?: readonly TickLabel[]`, `title?`, `lineColor?` and `lineLabel?`. Colors arrive resolved to `#rrggbb`.
  - A `/* @__NO_SIDE_EFFECTS__ */` `defineNumberLineProperties()` builds them with `defineProperties`:
    - `axis`: `axisProperty("axis", "number line's")`.
    - `leftArrow`, `rightArrow`: optional booleans. The description says "shown unless false" (NLC-REQ-015, NLC-REQ-017). The default is applied in the layout and `describe`, as `showTickLabels` is (NLC T-001 DEL-004).
    - `points`: an array with `maxItems` (D5). Each item is an object of the shared `value` spec, `sharedProperties.label` and `sharedProperties.color`, nested as the same objects.
    - `tickLabels`: an array with `maxItems: MAX_VALUE_TICKS` (100, `drawAxis`'s limit). Each item is the shared `value` spec plus `text`. `text` is a required string with `maxLength: CALLER_TEXT_LIMIT` and no `emptyIsAbsent`. Its description states "at most 200 characters", that the drawing cuts the label to one line ending in "…", that `""` leaves the tick blank, and which label wins when two share a tick (D8).
    - One module-level `value` spec: a number with no structural bounds, so every value off the axis gets `outside_axis_range` with the range (D9). Its description covers both uses.
    - Shared options are not listed; `propertiesOf` adds them. `elementsHint: "each point"`.
    - The array limits are stated in the descriptions.
  - Checks: `[...axisDomainChecks("axis"), pointsInRange, tickLabelsOnTicks]`.
    - `pointsInRange` (NLC-REQ-010): inputs `["axis/min", "axis/max", "points/*/value"]`. It reports `outside_axis_range` at `/points/i/value`, with term `points[i].value` and `range {min, max}`. Endpoints are inclusive. O(points).
    - `tickLabelsOnTicks` (NLC-REQ-020): inputs `["axis/min", "axis/max", "axis/tickSpacing", "tickLabels/*/value"]`. It reads the tick spacing own-key and gets the ticks from `drawableTicks(min, max, spacing)`; when the axis cannot be drawn, it skips. A label whose value matches no tick under `isTickValue(value, tick, spacing)` is reported as `tick_label_not_on_tick` at `/tickLabels/i/value`. Work is O(labels × ticks), at most 100 × 100.
  - `describe(normalized, provenance)`, through a `/* @__NO_SIDE_EFFECTS__ */` `defineNumberLine()`:
    - The text helpers come from `format.ts` only. Every caller string goes through `quoteText`, and a title or line label that is blank after `cleanText` counts as absent.
    - Supplied values are written with `formatSupplied`. A default tick spacing uses `formatDerived`, decided by `sourceOf(provenance, "axis/tickSpacing")`.
    - Content per D6.
  - `export const numberLine = /* @__PURE__ */ defineNumberLine()`.
  - `@spec NLC-REQ-001, NLC-REQ-010, NLC-REQ-011, NLC-REQ-012, NLC-REQ-015, NLC-REQ-017, NLC-REQ-019, NLC-REQ-020, NLC-REQ-021`, each on its own declaration.
- `src/core/definitions/index.ts`: one import, plus a `"number-line": numberLine` entry in the `satisfies` table.
- `src/core/definitions/shared.ts`: amend the `lineLabel` description so it covers the number line's drawn label as well as the legend (GSS T-002 SEC-003: "say so in the label-text descriptions"), for example "In the drawing, a label longer than two lines is cut short with “…”". Then regenerate.
- `src/layout/kit/axis.ts` (D1): an optional `lineColor?: string` on `AxisOptions`, read own-key, used as the stroke of the axis line and its ticks. It defaults to `defaultStyle.colors.line`, so existing output is byte-identical. Tick labels keep the text color.
- `src/layout/number-line.ts` (new): `numberLineLayout: Layout<NumberLine>`. Constants are computed inside the function or kept as plain literals (rulers CR-002).
  - From the top it draws:
    - `titleBlock(title)`;
    - the point-label band;
    - the line, with its ticks, tick labels and any arrowheads;
    - the `lineLabel` block, centered below the tick labels, wrapped to the drawing width with at most 2 lines.
  - Horizontal extent (D2): the range maps with `linearScale([min, max], [x0, x1])`. `x0` and `x1` are fixed by the margins, room for an arrowhead, and half the widest end label (numeric, or custom after the cut), whether or not the arrows are on, so turning an arrow on or off never moves a tick.
  - Axis: `drawAxis({ from, to, domain: [min, max], ...niceTicks(min, max, spacing), labels, showTickLabels: axis.showTickLabels !== false, side: "below", lineColor })`.
    - `labels` is a `Map` built in a loop. Each text is `cleanText`ed, then cut with `wrap(text, TICK_LABEL_MAX_WIDTH, tickLabelFont, 1)`, which also bounds marks. A blank text stays `""`.
    - Keys are the caller's values; `drawAxis` matches them to ticks with `isTickValue`. For two labels on one tick, the first is kept (D8).
  - Arrowheads (NLC-REQ-015..017, AD-008):
    - For each end whose setting is not `false`, draw a line extension past the range end plus a filled `polygon` triangle whose tip sits at the extension's end, both in `lineColor ?? defaultStyle.colors.line`.
    - An end that is off is a plain endpoint: the line stops at the range end, with no extension and no polygon.
    - No `<marker>`, ids or `url(#…)`.
  - Points (NLC-REQ-018, NLC-REQ-011): `drawMarker("circle", x, lineY, color ?? defaultStyle.colors.accent)` at `linearScale(value)`. The color fills the marker only.
  - Point labels (D7):
    - Each label is `cleanText`ed and wrapped to `LABEL_MAX_WIDTH` with at most `LABEL_MAX_LINES` (2) lines, measured in a loop (never `Math.max(...)`).
    - `placeLabel` places it over ordered candidates: centered above the point on row 0 to row 3, then the same rows shifted right and left. Obstacles are the line segment, the markers and every label already placed.
    - When no candidate is free, the label goes at the first candidate. Every label is drawn, in the default text color.
    - The band height comes from the lowest row used, so the Scene height stays bounded.
  - `textAlternative: numberLine.describe(normalized, provenance)`, the type's own `describe` and never `describeNormalized`. Every number goes through `fmt()`.
  - `@spec NLC-REQ-007, NLC-REQ-011, NLC-REQ-014, NLC-REQ-016, NLC-REQ-018, NLC-REQ-019, NLC-REQ-021`.
- `src/layout/registry.ts`: one import, plus a `"number-line": numberLineLayout` entry.
- `src/react/graphs/NumberLineGraph.tsx` (new): `export const NumberLineGraph = /* @__PURE__ */ createGraphComponent("number-line", { definition: numberLine, layout: numberLineLayout })`, with a usage doc comment. `@spec NLC-REQ-014, CPSE-REQ-007`.
- `src/entries/number-line.ts` (new): re-exports `NumberLineGraph` and the prop types. `@spec CPSE-REQ-004`.
- `src/index.ts`: `export { NumberLineGraph }`.
- `package.json`: `exports["./number-line"]` → `./dist/number-line.{d.ts,js}`. `tsup.config.ts`: `"number-line": "src/entries/number-line.ts"`. `.size-limit.json`: `./number-line`, `dist/number-line.js`, 25 kB gzip.
- `src/generated/*` and `tests/fixtures/generated/description.ts`: regenerated by `pnpm generate`. The number line brings `min`, `max`, `tickSpacing` and `showTickLabels` into the published vocabulary for the first time (NLC T-001 Notes), and the `lineLabel` description changes.
- `examples/number-line.json` (new): every optional term used once:

  ```json
  {
    "type": "number-line",
    "title": "Temperatures",
    "axis": { "min": -10, "max": 10, "tickSpacing": 1, "showTickLabels": true },
    "leftArrow": true,
    "rightArrow": true,
    "points": [
      { "value": -3, "label": "A", "color": "red" },
      { "value": 4, "label": "B" }
    ],
    "tickLabels": [{ "value": 0, "text": "start" }],
    "lineLabel": "Integers",
    "lineColor": "blue"
  }
  ```

- `examples/invalid/number-line-point-outside.json`: a point at 12 on −10..10. `examples/invalid/number-line-label-off-tick.json`: a label at 0.5 with spacing 1.
- `tests/core/number-line.test.ts` (new):
  - the example validates;
  - the arrow defaults are absent, and `describe` states them on;
  - camelCase only: `arrowheads` and `left_arrow` are unknown keys;
  - `outside_axis_range` path, term, range and message; endpoints accepted;
  - many outside points are reported each once;
  - `tick_label_not_on_tick` at `/tickLabels/i/value`;
  - ⅔ written in full on a spacing of 1/3 is accepted, while a value just past the `isTickValue` tolerance is reported;
  - a label at an off-range 0 on a far spacing is reported (NLC T-001 SEC-001 interplay);
  - the check is skipped when the axis has too many ticks or a bad spacing, so the result is never `internal_error` (CR-006);
  - `text` at 200 characters is accepted and at 201 is `too_large`; `""` is accepted;
  - `maxItems` + 1 points or labels give one `too_large`;
  - the invalid examples give their one issue each;
  - `describe`: title, line label, every point with its label, `quoteText` on hostile text, a blank title is absent, supplied values as written (`0.1`, `-0`);
  - the input description is frozen and not mutated.
- `tests/layout/number-line.test.ts` (new), on Scene data via `checkScene` and the `tests/fixtures/scene-geometry.ts` helpers:
  - the three range variants: ticks equal `niceTicks` and sit at `linearScale` within 0.5;
  - arrowhead on/off for each end (4 cases): the polygon count, a plain endpoint, ticks that do not move between cases, and no `marker` kind or `url(`;
  - point positions within 0.5;
  - two coincident points: both drawn, labels with no overlap;
  - many coincident points: every one drawn, with a bounded height;
  - point color on the marker only, the label in the default text color;
  - a custom label replaces a numeric one; `""` gives a blank;
  - a 200-character label is cut to one line ending in "…";
  - a one-cluster label (`tests/fixtures/plain-text.ts`) stays bounded;
  - `lineLabel` is drawn once, with at most 2 lines;
  - no points: only the line, ticks and labels;
  - the title is drawn; `lineColor` on the line, ticks and arrowheads;
  - `showTickLabels: false`;
  - `textAlternative` equals `describe`;
  - a fast-check property over generated number lines: every node inside the drawing, and no label overlapping the line, a tick label or another label except in the documented fallback.
- `tests/layout/kit/axis.test.ts`: `lineColor` is applied to the line and ticks, and leaving it out gives byte-identical output to the current call.
- `tests/react/Graph.test.tsx`:
  - the accessible name of `examples/number-line.json` (`aria-label` and `<title>`) through `<Graph>` and `<NumberLineGraph>`, and a supplied `textAlternative` replacing it in both (NLC-REQ-013);
  - `NumberLineGraph.displayName`;
  - at-limit rendering (a 200-character title, point labels, `lineLabel` and tick-label texts) with a bounded `<text>` count;
  - over-limit `too_large` rows for `/points/0/label`, `/tickLabels/0/text` and `/lineLabel`.
- `tests/package/per-type-bundle.test.ts`:
  - The number line's entry and component exclude "A circle", "A pictograph", "A line graph", "A bar graph", "A ruler", "A red apple", `OTHER` and `OTHER_DEFINITION`.
  - The other types' source bundles exclude "A number line".
  - Consumer bundles of every other built entry exclude the number line's markers, for example "A number line", the layout's `RangeError` text, and `drawAxis()`, which no other type uses.
- `.gener8v/specifications/number-lines-and-coordinate-graphs.md`: `@spec Coverage` rows for NLC-REQ-001 (number-line part), 010..021, and NLC-REQ-007's points location.
- `.gener8v/changes/graph-library/delivery/number-lines-and-coordinate-graphs-ticket-002-delivery.md`: the record.

### How Acceptance Criteria Will Be Met

- **The example validates and renders identically through `<NumberLineGraph>` and `<Graph>`:** the `Graph.test.tsx` "fit together" loop, which picks it up from the registry and `src/index.ts`; `tests/core/number-line.test.ts`; `schema-agreement.test.ts`.
- **Negative-only, positive-only and zero-spanning ranges:** layout test, ticks against `niceTicks` and positions against `linearScale`.
- **Arrows default to on, polygons only, plain endpoints:** core test (absent means on, in `describe`) and layout test (4 combinations; `checkScene` rejects `url(`, and no marker kind exists).
- **Points at `linearScale(value)` within 0.5, coincident labels apart:** layout test, plus the property.
- **Outside range reported at `/points/i/value` naming the range, endpoints accepted:** core test and the invalid example.
- **A point's color on that point only:** layout test.
- **Custom labels replace numbers; off-tick reported:** layout test, core test (`isTickValue` boundary) and the invalid example.
- **`lineLabel` drawn once:** layout test.
- **The text alternative states "number line", the range and every point with its label; a supplied one replaces it:** core `describe` test and the `Graph.test` `aria-label`/`<title>` assertions.
- **No points:** layout test.
- **`./number-line` in exports and size-limit:** `tests/package/entries.test.ts`, `pnpm build`, `pnpm size`, `check:dist`, `publint`, `attw`.
- **Carried hazards:** the at-limit and over-limit text tests, the bundle tests, the definitions test (`defineProperties`, nesting, consistency, inputs exist), and the every-term `maxLength` test.
- **Verification Run:** `pnpm generate`, `lint`, `typecheck`, `test` (3 runs; the text-kit and pictograph timing tests are known flakes), `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size`, `publint`, `attw`, `audit`, `gener8v-state lint`. Plus deliberate breaks: arrowhead ignoring its setting, label fallback dropped, label not cut, color on the label, the check using `niceTicks`.

### Decisions for the Engineer (recommended option first)

- **D1 — How `lineColor` reaches the line.**
  - (a) *Recommended:* add an optional `lineColor` to `drawAxis` for the line and its ticks. It is additive, the default output is unchanged, and the x,y and x,y,z axes can use it later.
  - (b) Recolor `drawAxis`'s returned nodes in the layout. This is fragile, because it depends on node order.
  - (c) Draw the number line's own line beside `drawAxis`. This duplicates the axis.
  - Sub-choice: ticks take `lineColor` (recommended, since they are one drawn line) or stay the default color.
- **D2 — Arrowhead geometry and extent.**
  - (a) *Recommended:* the plotted range has the same fixed inset whatever the arrow settings. An arrow end adds a short line extension past the range end, tipped by a filled triangle polygon. An off end stops at the range end.
  - (b) The arrowhead tip sits at the range end, with no extension. This reads as "ends here", which contradicts "continues beyond".
  - (c) The inset changes with the arrows, so ticks move between variants.
- **D3 — Custom tick label length.**
  - (a) *Recommended:* `maxLength: CALLER_TEXT_LIMIT` (200), the enforced policy. When drawn, the label is cut to one line at a fixed `TICK_LABEL_MAX_WIDTH` (about 80 units) with "…".
  - (b) A smaller `TICK_LABEL_LIMIT` (40, SEC-003's example). This needs the every-term test and GSV-REQ-052's reading amended, which is a GSV specification change, so it is out of this ticket's lane.
  - Sub-choice for the cut width: a fixed 80 units (recommended; neighbours may still touch on crowded axes, as numeric labels can, NLC T-001 Notes), or the gap between ticks (which leaves only "…" on a 100-tick axis).
- **D4 — `""` on a custom label.** Resolved from ground truth as a kept blank. Confirm only.
- **D5 — `points` `maxItems`.**
  - (a) *Recommended:* 100, the same as `CATEGORY_LIMIT` and `MAX_VALUE_TICKS`. It is 2× the NFR-004 benchmark of 50, and it bounds placement cost and the text alternative (about 25 kB at the limit).
  - (b) 1,000, as the fixture uses.
  - `tickLabels` is fixed at 100 by `drawAxis`.
- **D6 — What the text alternative states.**
  - (a) *Recommended:* "A number line [titled “T”], [labeled “L”,] from −10 to 10, ticked every 1, with arrowheads at both ends [at the left end / at the right end / with no arrowheads]. Ticks labeled: 0 as “start” [a blank label as “left blank”]. 2 points are marked: −3 labeled “A” and 4 labeled “B”." It states custom labels because they replace drawn numbers (CC-002 equivalence).
  - (b) The minimum the specification requires: type, range and points only.
- **D7 — Point-label placement.**
  - (a) *Recommended:* candidates on 4 rows above the point, centered, then shifted right and left (12 candidates). The fallback is the first candidate (Known Hazard, OQ-005), and the band height comes from the rows used.
  - (b) Unbounded stacking rows. This gives every label a free spot, but the height grows with the number of coincident points.
- **D8 — Two custom labels on one tick.**
  - (a) *Recommended:* accept them, and draw and state the first, which is `drawAxis`'s existing rule. Document it and test it.
  - (b) Report the second. There is no fitting issue code, and `duplicate_name` is for names.
- **D9 — Range comparison for points.**
  - (a) *Recommended:* exact, `value < min || value > max`, so an endpoint as written is inside, and no structural bounds apply to `value`.
  - (b) A decimal-noise allowance, like `AXIS_NOISE`, for computed values.
- **D10 — `showTickLabels: false` with custom labels.**
  - (a) *Recommended:* hide all labels, including custom ones. This is `drawAxis`'s current behavior; document it in the term's description.
  - (b) Keep custom labels visible. This needs a kit change.
- **D11 — Where `lineLabel` goes.**
  - (a) *Recommended:* centered below the tick labels, at most 2 lines.
  - (b) Beside the right end of the line. This competes with the arrowhead and the end label.
- **D12 — Branch.**
  - (a) *Recommended:* `ticket/nlc-002` from `main` after `ticket/gsv-007` merges.
  - (b) From `ticket/gsv-007` now, rebasing when it merges.

## Progress

- [x] `src/layout/kit/axis.ts` — optional `lineColor` (D1)
- [x] `src/core/definitions/number-line.ts` — definition, checks, `describe`
- [x] `src/core/definitions/shared.ts` — `lineLabel` description
- [x] `src/layout/number-line.ts` — layout
- [x] registration: `src/core/definitions/index.ts`, `src/layout/registry.ts`, `src/react/graphs/NumberLineGraph.tsx`, `src/entries/number-line.ts`, `src/index.ts`, `package.json`, `tsup.config.ts`, `.size-limit.json`
- [x] `examples/number-line.json`, two invalid examples
- [x] `src/generated/*` — `pnpm generate`
- [x] `tests/core/number-line.test.ts`
- [x] `tests/layout/number-line.test.ts`, `tests/layout/kit/axis.test.ts`
- [x] `tests/react/Graph.test.tsx`, `tests/package/per-type-bundle.test.ts`
- [x] `@spec` Coverage rows

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/core/definitions/number-line.ts`: `NumberLine`, `NumberLinePoint`, `NumberLineTickLabel`, `NUMBER_LINE_POINT_LIMIT` (100), `hasArrow`, `numberLineTicks`, `customLabelsByTick`, the checks `pointsInRange` and `tickLabelsOnTicks`, and `numberLine` (`/* @__PURE__ */ defineNumberLine()`) with its `describe` (new)
- `src/layout/number-line.ts`: `numberLineLayout`, `TICK_LABEL_MAX_WIDTH` (80), `TICK_LABEL_MIN_WIDTH` (24), `LABEL_MAX_LINES` (2), `LABEL_ROWS` (4) (new)
- `src/react/graphs/NumberLineGraph.tsx`, `src/entries/number-line.ts` (new)
- `src/layout/kit/axis.ts`: optional own-key `lineColor` for the line and ticks; default output unchanged
- `src/core/definitions/shared.ts`: the `lineLabel` description covers the number line's drawn label
- `src/layout/scene.ts`: `@spec NLC-REQ-013` on `textAlternativeFor`
- `src/core/definitions/index.ts`, `src/layout/registry.ts`, `src/index.ts`, `package.json`, `tsup.config.ts`, `.size-limit.json`: registration and the `./number-line` entry (25 kB)
- `src/generated/*`, `tests/fixtures/generated/description.ts`: regenerated
- `examples/number-line.json`, `examples/invalid/number-line-point-outside.json`, `examples/invalid/number-line-label-off-tick.json` (new)
- `tests/core/number-line.test.ts` (21 tests), `tests/layout/number-line.test.ts` (28 tests, one a fast-check property over 200 number lines) (new)
- `tests/layout/kit/axis.test.ts`: `lineColor`, default unchanged, inherited ignored
- `tests/react/Graph.test.tsx`: accessible name, a supplied text alternative, at-limit drawing, three over-limit refusals, display name
- `tests/package/per-type-bundle.test.ts`: source and built-entry consumer bundles
- `.gener8v/specifications/number-lines-and-coordinate-graphs.md`, `component-packaging-and-source-export.md`: `@spec` Coverage rows

## Verification Run

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm generate` | 0 | the number line's terms in the schema, tool schema, types and vocabulary |
| `pnpm lint` | 0 | — |
| `pnpm typecheck` | 0 | — |
| `pnpm test` (three runs) | 0, 0, 0 | 51 files, 1,450 tests each run |
| `pnpm bench` | 0 | GSV-NFR-001 number-line validation p95 0.0370 ms |
| `pnpm build` | 0 | `dist/number-line.js`, `dist/number-line.d.ts` |
| `pnpm check:dist` | 0 | — |
| `pnpm check:deps` | 0 | — |
| `pnpm check:images` | 0 | — |
| `pnpm size` | 0 | `./number-line` 19.47 kB of 25; `./core` 23.02 kB of 25 |
| `pnpm publint` | 0 | — |
| `pnpm attw` | 0 | — |
| `pnpm audit` | 0 | No known vulnerabilities found (2026-10-21) |
| `gener8v-state.py lint` | 0 | 0 errors, 0 warnings |
| Mutation: the left arrowhead drawn whatever its setting | — | 2 tests fail |
| Mutation: point labels not placed (always the first candidate) | — | 2 tests fail |
| Mutation: point labels not cut | — | 1 test fails |
| Mutation: point labels in a color | — | 1 test fails |
| Mutation: custom labels matched to ticks exactly | — | 1 test fails (0.1 + 0.2 at the 0.3 tick) |
| Mutation: an endpoint counted as outside | — | 3 tests fail |
| Mutation: `drawAxis` ignoring `lineColor` | — | 2 tests fail |
| Mutation: custom labels not cut | — | 2 tests fail |

## Acceptance Criteria Verification

- [x] `examples/number-line.json` (−10 to 10, arrowheads on both ends, points at −3 and 4 with labels) validates and renders through `<NumberLineGraph>` and `<Graph>` with identical markup — `tests/core/number-line.test.ts`; `Graph.test.tsx` "fit together" loop and "the number line's accessible name"
- [x] Negative-only, positive-only and zero-spanning ranges render with TICKET-001's ticks — `tests/layout/number-line.test.ts` "ranges" (ticks equal `niceTicks`, at their positions within 0.5)
- [x] `leftArrow` and `rightArrow` default to on; a polygon arrowhead exactly when on, a plain end otherwise; no `<marker>` or `url(#…)` — core test (defaults), layout "arrowheads" (four combinations, ticks unmoved), `checkScene`
- [x] Each point at `linearScale(value)` within 0.5; two at one value both drawn, labels apart — layout "points", and the property over 200 number lines
- [x] A point outside the range is `outside_axis_range` at `/points/<i>/value`, naming the range; an endpoint is accepted — core "points outside the range"; the invalid example
- [x] A point's color applies to that point only; its label is the default color — layout "points"
- [x] Custom labels replace the numeric label; a label off a tick is `tick_label_not_on_tick` — layout "tick labels"; core "custom labels off a tick"; the invalid example
- [x] `lineLabel` drawn once — layout "the line's label"
- [x] The text alternative states "number line", the range and every point with its label; a supplied `textAlternative` replaces it in `aria-label` and `<title>` — core "the text alternative"; `Graph.test.tsx`
- [x] No points: the line, ticks and labels only — layout "draws only the line, ticks and labels"
- [x] `./number-line` in `package.json` exports and `.size-limit.json` — `tests/package/entries.test.ts`, `pnpm size`, `publint`, `attw`

## Decisions Made

### DEL-001: `lineColor` on `drawAxis`

**Context:** The Product Owner decision (2026-10-06) puts `lineColor` on the number line, but `drawAxis` always drew in the default line color.
**Decision:** `AxisOptions.lineColor`, read own-key, colors the axis line and its ticks; tick labels keep the text color. Absent or undefined, the output is byte-identical to before (tested).
**Rationale:** Additive, and the x,y and x,y,z axes can use it.
**Ticket Impact:** As approved (D1).

### DEL-002: Arrowheads and the line's extent

**Context:** The specification says an arrowhead shows the line continues; an end without one is a plain endpoint.
**Decision:** The range maps onto a span inset by room for an arrowhead and half the widest tick label at each end, whatever the settings, so ticks never move. An arrow end extends the line 8 units and ends in a filled triangle 9 long and 9 wide; an end without one stops at the range end.
**Ticket Impact:** As approved (D2).

### DEL-003: Custom tick label length and its cut

**Context:** NLC TICKET-001 SEC-003 suggested 40 characters; GSV TICKET-007 made 200 the limit for every caller text.
**Decision:** `text` is at most 200 characters. When drawn, it is cut to one line no wider than the room between neighbouring ticks (less 4 units), within 24 to 80 units.
**Rationale:** A fixed 80 units overlapped the neighbours' labels on an axis ticked every unit (seen in the example). See Deviations.
**Ticket Impact:** Approved as a fixed 80; changed during build.

### DEL-004: A blank custom label

**Decision:** `""` is kept and leaves its tick unlabeled (a blank to fill in). The text alternative says "left blank". The definitions test forbids `emptyIsAbsent` on a required list-item term.

### DEL-005: At most 100 points

**Decision:** `NUMBER_LINE_POINT_LIMIT = 100`, twice the 50 the rendering benchmark draws; `tickLabels` at most 100, `drawAxis`'s limit.

### DEL-006: The text alternative

**Decision:** Title, line label, range, spacing (a supplied one as written, the default rounded), which ends have arrowheads, the custom labels drawn (each tick named by its numeric label, the first at a tick only, none when tick labels are hidden), and every point with its label, or "No points are marked."

### DEL-007: Point label placement

**Decision:** Candidates on 4 rows above the line, each centered on the point then shifted right and left (12), placed by `placeLabel` clear of the line, the markers and earlier labels. With none clear, the first candidate (NLC OQ-005). Up to 4 labels always find a clear place, which the property test checks; the drawing's height is bounded by the 4 rows.

### DEL-008: Two custom labels on one tick

**Decision:** The first is drawn and stated (`customLabelsByTick`, shared by the layout and `describe`); documented in the `tickLabels` description.

### DEL-009: The point range check

**Decision:** Exact: `value < min || value > max`, so an endpoint as written is inside. `value` has no structural bounds, so any value off the axis is reported with the axis's range.

### DEL-010: `showTickLabels: false` hides custom labels too

**Decision:** As `drawAxis` behaves; documented in the `tickLabels` description and stated by the text alternative ("Its ticks are not labeled.").

### DEL-011: The line label

**Decision:** Centered below the tick labels, wrapped to the drawing's width, at most 2 lines.

## Deviations from Plan

- **The custom label cut (DEL-003):** the plan's fixed 80-unit width overlapped neighbouring labels on an axis ticked every unit. The cut is now the room between ticks, from 24 to 80 units. A test checks a cut label clears its neighbours.
- **The example:** ticks every 2 with the custom label "zero" at 0, not every 1 with "start", so its labels stay apart. It still meets the criterion (−10 to 10, both arrowheads, points at −3 and 4 with labels).
- **NLC-REQ-013's annotation** is on `textAlternativeFor` (`src/layout/scene.ts`), the shared function that applies a caller's text alternative for every type. No requirement had an annotation for it before.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| NLC-REQ-001 | `src/core/definitions/number-line.ts`:defineNumberLineProperties, numberLine | `@spec NLC-REQ-001, …` |
| NLC-REQ-007 | `src/layout/number-line.ts`:numberLineLayout | `@spec NLC-REQ-007, …` |
| NLC-REQ-010 | `src/core/definitions/number-line.ts`:pointsInRange | `@spec NLC-REQ-010` |
| NLC-REQ-011 | `src/core/definitions/number-line.ts`:defineNumberLineProperties; `src/layout/number-line.ts`:numberLineLayout | `@spec …, NLC-REQ-011, …` |
| NLC-REQ-012 | `src/core/definitions/number-line.ts`:numberLine.describe | `@spec NLC-REQ-012, …` |
| NLC-REQ-013 | `src/layout/scene.ts`:textAlternativeFor | `@spec CPSE-REQ-012, NLC-REQ-013` |
| NLC-REQ-014 | `src/core/definitions/number-line.ts`:numberLine; `src/layout/number-line.ts`:numberLineLayout; `src/react/graphs/NumberLineGraph.tsx`:NumberLineGraph | `@spec …, NLC-REQ-014, …` |
| NLC-REQ-015 | `src/core/definitions/number-line.ts`:defineNumberLineProperties | `@spec …, NLC-REQ-015, …` |
| NLC-REQ-016 | `src/layout/number-line.ts`:numberLineLayout; `src/core/definitions/number-line.ts`:numberLine.describe | `@spec …, NLC-REQ-016, …` |
| NLC-REQ-017 | `src/core/definitions/number-line.ts`:defineNumberLineProperties, hasArrow | `@spec …, NLC-REQ-017, …` |
| NLC-REQ-018 | `src/layout/number-line.ts`:numberLineLayout | `@spec …, NLC-REQ-018, …` |
| NLC-REQ-019 | `src/core/definitions/number-line.ts`:defineNumberLineProperties, numberLine.describe; `src/layout/number-line.ts`:numberLineLayout; `src/layout/kit/axis.ts`:drawAxis | `@spec …, NLC-REQ-019, …` |
| NLC-REQ-020 | `src/core/definitions/number-line.ts`:tickLabelsOnTicks | `@spec NLC-REQ-020` |
| NLC-REQ-021 | `src/core/definitions/number-line.ts`:defineNumberLineProperties, numberLine.describe; `src/layout/number-line.ts`:numberLineLayout | `@spec …, NLC-REQ-021` |
| CPSE-REQ-004 | `src/entries/number-line.ts` | `@spec CPSE-REQ-004` |
| CPSE-REQ-007 | `src/react/graphs/NumberLineGraph.tsx`:NumberLineGraph | `@spec NLC-REQ-014, CPSE-REQ-007` |

## Notes

- **`./core` size:** 23.02 kB of its 25 kB budget, the core entry holding every definition. The x,y and x,y,z graphs will add more: check the budget in those tickets.
- **The circle leak** (the circle definition in every built entry's consumer bundle) is unchanged here; the number line's own bundle tests check source bundles for "A circle" and consumer bundles of the other built entries for the number line only.
- **Shared code touched:** `drawAxis` (an additive option), the `lineLabel` description and one annotation in `scene.ts`.
- **NLC-NFR-001..004** are TICKET-005's.

## Post-Review Amendments

### 2026-10-22 — Code review (graph-library/number-lines-and-coordinate-graphs-ticket-002-code-review)

- **CR-001:** `// @spec NLC-REQ-017` added above `hasArrow` (`src/core/definitions/number-line.ts`), and NLC-REQ-019 added to `drawAxis`' annotation (`src/layout/kit/axis.ts`). The `@spec Annotations` table above now lists both, matching the specification's coverage rows.
- **CR-002 (amends DEL-003):** custom tick labels are cut first on the widest span, which sizes the room at the ends, then cut again on the span actually drawn when that room narrowed it (`cutTo` in `numberLineLayout`). The 24-unit floor stays; the `text` description now says a label is never cut below a few letters, so on a densely ticked line neighbouring labels may touch. Tests: neighbouring "one quarter of it" / "one half of it" on 0..1 by 0.25 do not overlap; "four" / "five" on 0..20 by 1 are written whole. The existing cut test is renamed to what it checks.
- **CR-003 (amends DEL-007):** `SHIFT` is now 1: a shifted candidate sits a full label width plus the gap beside the centered one, so up to 12 short labels at one value are placed apart. The `points` description says labels are placed apart "where the drawing has room". Test: 5, 8 and 12 coincident labels, no pair overlapping.
- **CR-004:** the `tick_label_not_on_tick` issue now carries the drawn spacing and the axis range (`src/core/issues.ts`; additive, the code is unchanged, and the issue gains a `range` field). Its message reads "…; use a tick: a multiple of 2 from -10 to 10." Tests: the message for an off-range multiple and for the default spacing; the issues catalogue example updated.
- Mutation checks: reverting `SHIFT` to 0.5 fails the CR-003 test; skipping the second cut fails the CR-002 test.
- Re-verification: `pnpm generate` (description, schema, tool schema and vocabulary regenerated for the two descriptions), `lint`, `typecheck`, `test` ×3 (1,454 passed each run), `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size` (`./core` 23.11 kB of 25 kB), `publint`, `attw`, `audit`: all exit 0.
