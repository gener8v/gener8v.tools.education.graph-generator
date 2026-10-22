# TICKET-002: Deliver the number line graph type — Code Review

## Summary

I reviewed the delivery of `graph-library/number-lines-and-coordinate-graphs/TICKET-002`: delivery commit `4cd2f9c` on branch `ticket/nlc-002`, on top of `7a24a45` (`main` at `204b174` plus the ready-tickets hazards). I checked it against:
- the ticket's eleven acceptance criteria, its Output, and its Known Hazards: AD-008, AD-005, OQ-001/002/005, the Product Owner decision of 2026-10-06, and the carried GSV T-001 CR-002 / QR-001/002, GSV T-003 CR-007 / SEC-001, GSV T-004 CR-003 / SEC-004, GSV T-005 CR-001 / QR-001/002, GSS T-002 CR-003 / SEC-001..003, and NLC T-001 CR-006, CR-007 and SEC-003;
- NLC-REQ-001 and NLC-REQ-010..021, Behaviors & Rules → Arrowheads and → Points and Segments, the Edge Cases rows on points outside the range, no points, off-tick labels and crowded labels, and the new `## @spec Coverage` rows;
- GSV-REQ-012, 015, 031, 032, 040..045 and 052..054;
- `constraints/prd.md` (TC-001, TC-002, TC-003, TC-005, TC-007, CC-002) and `technical-design/system-design.md` (AD-001..005, AD-007, AD-008, AD-010, AD-011, AD-014, and the Layout kit component).

What holds, checked with in-memory probes rather than taken from the record:
- **Layout over random valid number lines.** 6,000 descriptions: ranges from 10⁻³ to ±10⁹, given and default spacings, ⅓ spacings, 0 to 100 points with labels, custom labels at random ticks, every arrow and `showTickLabels` combination, titles and line labels. None throws. Every Scene passes `checkScene`, every node lies inside the drawing, every tick is within 0.5 units of `linearScale`, and so is every marker.
- **Point labels.** Two coincident labeled points never overlap (406 random cases). With at most 5 labeled points, no label overlapped another in 6,000 cases. No point label touches an arrowhead or a tick.
- **Checks.** The following hold:
  - An endpoint as written is inside the range, and `1.0000000000000002` on 0..1 is outside, as DEL-009 says.
  - ⅔ written in full on a ⅓ spacing is on a tick.
  - A failed spacing or an axis with more than 100 ticks skips the off-tick check and gives no `internal_error`.
  - A reversed range is reported once.
  - A failed point `color` does not hide a sibling's `outside_axis_range`.
- **Provenance.** `axis/min`, `axis/max`, `axis/tickSpacing` and `points/i/value` are all recorded as supplied, so the text alternative states 1.23456789 and 0.3333333 as written. A default spacing of 0.0001 or 0.0000001 is stated correctly, not rounded to 0.
- **At the limit.** A line with 100 ticks, 100 custom labels of 200 characters and 100 labeled points of 200 characters lays out in 18.5 ms. It has 305 text nodes and a 326.7-unit height.
- **Rendering.** The example, rendered to an image, shows the title, both labels above the line, blue arrowheads and ticks, "zero" at 0, and the line label below.
- **Schema (GSV-REQ-054).** The published schema carries `maxItems: 100` on `points` and `tickLabels`, and `maxLength: 200` on `text`, `label` and `lineLabel`.
- **Verification Run.** Every command re-run exits 0. `pnpm test` passes 1,450 tests in 51 files, three times.

There is one Issue:
- **CR-001.** Two `@spec Coverage` rows name locations that carry no annotation: `hasArrow` for NLC-REQ-017, and `drawAxis` for NLC-REQ-019. The delivery record's own `@spec Annotations` table lists neither, so the record and the specification disagree.

There are three Observations:
- **CR-002.** Custom tick labels still overlap their neighbours (DEL-003, the recorded deviation), for two reasons. The room is measured on the widest span the line can have, not the span drawn. And the 24-unit floor is wider than the room on axes of 17 or more ticks. On 0 to 20 by 1, "four" at 4 and "five" at 5 overlap by 5 units.
- **CR-003.** At one value, only 4 point labels can be placed apart, not 12. The shifted candidates always overlap the centered label in their own row, so a fifth label is drawn exactly over the first. Yet the published `points` description says, without qualification, that labels at one value "are placed apart".
- **CR-004.** The `tick_label_not_on_tick` message gives the wrong advice in some cases, and the number line is the first type to produce it. It says to "use a value that is a multiple of the tick spacing" even when the value is already a multiple but off the range. It never states the spacing, which the caller may not know when it is the default (GSV-REQ-031).

**Reviewer:** `code-reviewer` agent, fresh context (findings phase only, 2026-10-22)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/number-lines-and-coordinate-graphs-ticket-002-delivery.md`
**Files Reviewed:**
- `src/core/definitions/number-line.ts` (new)
- `src/layout/number-line.ts` (new)
- `src/react/graphs/NumberLineGraph.tsx` (new)
- `src/entries/number-line.ts` (new)
- `src/layout/kit/axis.ts` (modified: `lineColor`)
- `src/core/definitions/shared.ts` (modified: `lineLabel` description)
- `src/layout/scene.ts` (modified: `@spec NLC-REQ-013` on `textAlternativeFor`)
- `src/core/definitions/index.ts`, `src/layout/registry.ts`, `src/index.ts`, `package.json`, `tsup.config.ts`, `.size-limit.json` (registration)
- `src/generated/description.ts`, `src/generated/schema.json`, `src/generated/tool-schema.json`, `src/generated/vocabulary.json`, `tests/fixtures/generated/description.ts` (regenerated)
- `examples/number-line.json`, `examples/invalid/number-line-point-outside.json`, `examples/invalid/number-line-label-off-tick.json` (new)
- `tests/core/number-line.test.ts`, `tests/layout/number-line.test.ts` (new)
- `tests/layout/kit/axis.test.ts`, `tests/react/Graph.test.tsx`, `tests/package/per-type-bundle.test.ts` (modified)
- `.gener8v/specifications/number-lines-and-coordinate-graphs.md` (`## @spec Coverage`, lines 206, 219-231), `.gener8v/specifications/component-packaging-and-source-export.md` (lines 196-197)
- Read for context, unchanged here: `src/core/value-scale.ts` (`drawableTicks`, `isTickValue`, `axisSpacing`, `axisTickLabel`), `src/core/definitions/axis.ts`, `src/core/definitions/types.ts`, `src/core/format.ts`, `src/core/issues.ts`, `src/core/validate/domain.ts`, `src/layout/kit/labels.ts`, `src/layout/kit/markers.ts`, `src/layout/kit/title.ts`, `src/layout/kit/text.ts`, `tests/fixtures/scene-geometry.ts`

**Findings:** 4
**Critical:** 0 | **Issues:** 1 | **Observations:** 3

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| `examples/number-line.json` (range −10 to 10, arrowheads on both ends, points at −3 and 4 with labels) validates and renders through `<NumberLineGraph>` and through `<Graph>` with identical markup | Yes | The example (`examples/number-line.json`) has −10 to 10, both arrows `true`, and "Monday" at −3 and "Tuesday" at 4, with spacing 2 and "zero" at 0 (a recorded deviation). It validates (`tests/core/number-line.test.ts:16-18`). Markup is identical through both components: in the "fit together" loop (`tests/react/Graph.test.tsx:76-86`, over every registered type) and in `:213-218` |
| Ranges that are negative-only (−10 to −2), positive-only (3 to 15) and zero-spanning each render with ticks per TICKET-001's rules | Yes | `tests/layout/number-line.test.ts:47-58` covers the three ranges and a decimal one: the tick count equals `niceTicks`, and each tick is within 0.5 of `linearScale`. The layout draws `drawableTicks`' list through `drawAxis` (`src/layout/number-line.ts:110`, `:169-181`). Probe: 0 of 6,000 random valid lines put a tick more than 0.5 away |
| `leftArrow` and `rightArrow` (camelCase, boolean) default to `true`; each end shows a polygon arrowhead exactly when its setting is on, and a plain endpoint otherwise; no `<marker>` or `url(#…)` appears in the Scene | Yes | Optional booleans, "shown unless false" (`src/core/definitions/number-line.ts:100-111`). `hasArrow` (`:46`) is used by the layout (`src/layout/number-line.ts:182-187`) and by `describe` (`:201-207`). A filled `polygon` (`:58-74`) sits on an 8-unit extension; an end that is off stops at the range end. Tested in four combinations, with ticks unmoved (`tests/layout/number-line.test.ts:76-101`), plus the camelCase-only test (`tests/core/number-line.test.ts:29-33`). `checkScene` runs on every layout test Scene. Absent stays absent in the normalized description, as `showTickLabels` does (NLC T-001 DEL-004) |
| Each point draws at `linearScale(value)` (within 0.5 units); two points with the same value are both drawn and their labels placed by `placeLabel` so neither hides the other | Yes | Markers at `xOf(point.value)` (`src/layout/number-line.ts:189`), tested at `tests/layout/number-line.test.ts:105-111`. Labels go through `placeLabel` with the line, the markers and earlier labels as obstacles (`:144-160`), tested for two coincident points (`:113-118`) and by the property (`:246-259`). Probe: no coincident pair ever overlaps. From the fifth label at one value, labels overprint (CR-003); the ticket's Known Hazard and OQ-005 allow that |
| A point outside the range is reported as `outside_axis_range` at `/points/<i>/value`, naming the range; a point exactly on an endpoint is accepted | Yes | `pointsInRange` (`src/core/definitions/number-line.ts:159-172`). Tested: the full issue, with "points[0].value (12) is outside the axis range, from -10 to 10" (`tests/core/number-line.test.ts:61-70`); endpoints, including 0.1 and 0.3 as written (`:72-75`); every outside point once (`:77-83`); the invalid example (`:53-57`) |
| A point's `color` applies to that point only; its label uses the default label color | Yes | Fill of the marker only (`src/layout/number-line.ts:189`); labels in `defaultStyle.colors.text` (`:191`). `tests/layout/number-line.test.ts:127-132` checks that exactly one node carries the red |
| Custom tick labels (for example `{ "value": 0, "text": "start" }`) replace the numeric label at that tick; a custom label whose value is not a tick position is reported as `tick_label_not_on_tick` | Yes | `customLabelsByTick` (`src/core/definitions/number-line.ts:62-73`) feeds `drawAxis`'s `labels` (`src/layout/number-line.ts:124-128`). `tickLabelsOnTicks` (`src/core/definitions/number-line.ts:181-195`) uses `drawableTicks` and `isTickValue`, as the drawing does. Tested: layout `tests/layout/number-line.test.ts:149-175`; core `tests/core/number-line.test.ts:91-113`; the invalid example. The cut can still overlap neighbours (CR-002), and the off-tick message can mislead (CR-004) |
| The optional `lineLabel` is drawn once for the line as a whole | Yes | `src/layout/number-line.ts:194-201`: wrapped to the drawing width, at most 2 lines, below the tick labels. Tested once, below the labels, and cut to 2 lines (`tests/layout/number-line.test.ts:179-186`) |
| The generated text alternative states "number line", the range and every marked point with its label; a supplied `textAlternative` replaces it in both `aria-label` and `<title>` | Yes | `describe` (`src/core/definitions/number-line.ts:239-273`); exact sentence in `tests/core/number-line.test.ts:117-121`. The layout uses the type's own `describe` (`src/layout/number-line.ts:206`; `tests/layout/number-line.test.ts:201-206`). The supplied prop goes through `textAlternativeFor` (`src/layout/scene.ts:147-148`). It replaces the generated text in `aria-label` and `<title>`, through `<Graph>` and `<NumberLineGraph>`, and a blank one is ignored (`tests/react/Graph.test.tsx:220-228`). The ticket's Output names a `textAlternative` term in the definition. The pre-flight resolved this to the component prop, the same for every type, as the ruler did |
| A number line with no points renders the line, ticks and labels only | Yes | `tests/layout/number-line.test.ts:134-139` (no circles, no label text, only `line`, `polygon`, `text`) |
| `./number-line` entry exists in `package.json` exports and in `.size-limit.json` | Yes | `package.json` `exports["./number-line"]`; `.size-limit.json` `./number-line`, 25 kB; `tsup.config.ts` entry. `tests/package/entries.test.ts` (in the run) checks the agreement; `pnpm build` writes `dist/number-line.{js,d.ts}`; `publint` and `attw` pass |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| NLC-REQ-001 | Number line parameters in the single definition, as vocabulary terms (number-line part) | `src/core/definitions/number-line.ts`:defineNumberLineProperties, numberLine; registered in `src/core/definitions/index.ts`:definitions. Every term is in `src/generated/vocabulary.json` with a definition (`axis`, `leftArrow`, `rightArrow`, `points`, `value`, `tickLabels`, `text`, and the shared `title`, `lineColor`, `lineLabel`, `label`, `color`) | Yes |
| NLC-REQ-010 | Report each point whose value lies outside the axis range (number-line part) | `src/core/definitions/number-line.ts`:pointsInRange | Yes. As with the line graph's `series/*/values/*`, a structurally failed point value skips the whole check, so a sibling's outside-range issue waits for the next pass. That is the documented `DomainCheck` contract (`src/core/definitions/types.ts:251-271`), not this ticket's choice |
| NLC-REQ-011 | Optional label and color per point, per GSV-REQ-040..045 | `src/core/definitions/number-line.ts`:defineNumberLineProperties (shared `label` and `color` nested, `:124-125`; `elementsHint`, `:230`); `src/layout/number-line.ts`:numberLineLayout | Yes |
| NLC-REQ-012 | Text alternative from the normalized description: type, range, every marked point (number-line part) | `src/core/definitions/number-line.ts`:numberLine.describe | Yes |
| NLC-REQ-013 | Caller-supplied text alternative replaces the generated one | `src/layout/scene.ts`:textAlternativeFor (component prop, every type) | Yes |
| NLC-REQ-014 | Render over negative-only, positive-only or zero-spanning ranges | `src/layout/number-line.ts`:numberLineLayout; `src/react/graphs/NumberLineGraph.tsx`:NumberLineGraph | Yes |
| NLC-REQ-015 | Separate arrowhead setting per end | `src/core/definitions/number-line.ts`:defineNumberLineProperties (`leftArrow`, `rightArrow`) | Yes |
| NLC-REQ-016 | Arrowhead at an end when, and only when, its setting is on | `src/layout/number-line.ts`:numberLineLayout (`:182-187`), arrowhead | Yes |
| NLC-REQ-017 | Documented default arrowhead setting | `src/core/definitions/number-line.ts`:defineNumberLineProperties ("shown unless false"), hasArrow | Yes |
| NLC-REQ-018 | Mark each supplied point at its value | `src/layout/number-line.ts`:numberLineLayout (`:189`) | Yes |
| NLC-REQ-019 | Custom tick labels replace the numeric label at a tick | `src/core/definitions/number-line.ts`:defineNumberLineProperties (`tickLabels`), customLabelsByTick; `src/layout/number-line.ts`:numberLineLayout; `src/layout/kit/axis.ts`:drawAxis (`labels`) | Yes |
| NLC-REQ-020 | Report a custom tick label whose value is not a tick | `src/core/definitions/number-line.ts`:tickLabelsOnTicks | Yes. The message's advice can be wrong (CR-004) |
| NLC-REQ-021 | Optional label for the line as a whole | Shared `lineLabel` (`src/core/definitions/shared.ts`, `appliesTo: ["number-line"]`); `src/layout/number-line.ts`:numberLineLayout (`:194-201`); `describe` | Yes |

*The ticket carries no NFR. NLC-NFR-001..004 belong to TICKET-005; the GSV-NFR-001 validation benchmark picks up the new example (p95 0.0339 ms on re-run).*

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/TC-001 | Output computed from the description alone, no measuring | Yes | Widths come from `textWidth` estimates (`src/layout/number-line.ts:49-55`, `:132`); no DOM access. `pnpm lint`'s boundary rules pass |
| prd/TC-002 | Coordinates rounded before markup | Yes | Every attribute goes through `fmt` / `fmtPoints` (`src/layout/number-line.ts:65-84`, `:205`); `drawAxis`, `drawMarker`, `textLines` and `titleBlock` round their own output. `checkScene` passes on every test Scene and on 6,000 probe Scenes |
| prd/TC-003 | Id-referenced SVG elements unique per instance | Yes (by removal) | No ids at all: arrowheads are `polygon` nodes (AD-008). The layout test asserts no `url(` (`tests/layout/number-line.test.ts:86`) |
| prd/TC-005 | Validation importable without React or browser globals | Yes | `src/core/definitions/number-line.ts` imports only core modules. The layout imports only core and the layout kit. Lint passes |
| prd/TC-007 | Per-type entry points, side-effect-free modules | Yes | `src/entries/number-line.ts`; `/* @__PURE__ */` / `/* @__NO_SIDE_EFFECTS__ */` factories. The source bundles of the other types exclude "A number line", and the number line's bundle excludes them. Consumer bundles of every other built entry exclude "A number line", "numberLineLayout()" and "drawAxis()" (`tests/package/per-type-bundle.test.ts`, re-run after a fresh build) |
| prd/CC-002 | Text alternative for every graph (WCAG 1.1.1) | Yes | Generated from the normalized description. It also states custom labels drawn in place of numbers, and which ends have arrowheads (DEL-006), so it says what the figure shows. Caller colors are the caller's choice, and a point's label, not its color, tells points apart |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-001 | Separate entry points per type | Yes | `./number-line` in `package.json`, `tsup.config.ts`, `.size-limit.json`; `NumberLineGraph` in `src/index.ts` |
| AD-002 | Pure `layout → Scene` | Yes | `numberLineLayout(normalized, provenance)`, two arguments per the carried GSS T-002 CR-003 hazard; plain data out |
| AD-003 | One in-house definition format | Yes | `defineProperties`; shared options not listed; shared `label`/`color` nested as the same objects. One `positionValue` spec serves both lists, so the consistency check passes. `tests/core/definitions.test.ts` runs over the registry |
| AD-004 | Staged validator, no cascades | Yes | `axisDomainChecks("axis")` plus two checks with declared `inputs` (`src/core/definitions/number-line.ts:161`, `:183`). The off-tick check skips an undrawable axis (`:186`) instead of throwing; probe and `tests/core/number-line.test.ts:110-113` |
| AD-005 | `number-line`, camelCase, JSON Pointer paths | Yes | `leftArrow`, `rightArrow`, `tickLabels`, `lineLabel`; paths `/points/0/value`, `/tickLabels/0/value`; `arrowheads` and `left_arrow` refused |
| AD-007 | 400-unit space, `fmt()` everywhere | Yes | `SCENE_WIDTH`; see prd/TC-002 |
| AD-008 | No ids; arrowheads as polygons; `aria-label` + `<title>` | Yes | `arrowhead()` polygon; accessible name tested in both places |
| AD-010 | Estimated metrics; labels placed through the label kit without overlap | Partial | Point labels go through `placeLabel`. Tick labels, custom ones included, sit at `drawAxis`' fixed offsets, the NLC T-001 precedent. The cut meant to keep custom labels apart does not always do so (CR-002), and at one value only four point labels find a free place (CR-003) |
| AD-011 | Presentation attributes, resolved named colors | Yes | `stroke` / `fill` attributes; colors arrive as `#rrggbb` (`namedColors.red`, `namedColors.green` in the tests) |
| AD-014 | Pure components with a fallback | Yes | `createGraphComponent`. At-limit text renders without calling the fallback, and over-limit text gives one `too_large` through `<Graph>` and `<NumberLineGraph>` (`tests/react/Graph.test.tsx:502-543`) |
| Layout kit (`.gener8v/technical-design/system-design.md:262`) | The kit holds "arrowhead and point-marker shapes" | Partial, approved | `arrowhead()` is local to `src/layout/number-line.ts:58-74`, because the kit had none. The pre-flight and the approved plan say so. No other ticket in this change draws arrowheads, so nothing downstream depends on it |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| NLC-REQ-001 | `@spec NLC-REQ-001` | `src/core/definitions/number-line.ts:defineNumberLineProperties` (line 95), `numberLine` (213) | Yes |
| NLC-REQ-007 | `@spec NLC-REQ-007` | `src/layout/number-line.ts:numberLineLayout` (107) | Yes |
| NLC-REQ-010 | `@spec NLC-REQ-010` | `src/core/definitions/number-line.ts:pointsInRange` (158) | Yes |
| NLC-REQ-011 | `@spec NLC-REQ-011` | `src/core/definitions/number-line.ts:defineNumberLineProperties` (95); `src/layout/number-line.ts:numberLineLayout` (107) | Yes |
| NLC-REQ-012 | `@spec NLC-REQ-012` | `src/core/definitions/number-line.ts:numberLine.describe` (238) | Yes |
| NLC-REQ-013 | `@spec NLC-REQ-013` | `src/layout/scene.ts:textAlternativeFor` (147) | Yes |
| NLC-REQ-014 | `@spec NLC-REQ-014` | `src/core/definitions/number-line.ts:numberLine` (213); `src/layout/number-line.ts:numberLineLayout` (107); `src/react/graphs/NumberLineGraph.tsx:NumberLineGraph` (11) | Yes |
| NLC-REQ-015 | `@spec NLC-REQ-015` | `src/core/definitions/number-line.ts:defineNumberLineProperties` (95) | Yes |
| NLC-REQ-016 | `@spec NLC-REQ-016` | `src/layout/number-line.ts:numberLineLayout` (107); `src/core/definitions/number-line.ts:numberLine.describe` (238) | Yes |
| NLC-REQ-017 | `@spec NLC-REQ-017` | `src/core/definitions/number-line.ts:defineNumberLineProperties` (95). `hasArrow` (45-46), listed in the coverage table, has none | Yes (table names an unannotated location, CR-001) |
| NLC-REQ-018 | `@spec NLC-REQ-018` | `src/layout/number-line.ts:numberLineLayout` (107) | Yes |
| NLC-REQ-019 | `@spec NLC-REQ-019` | `src/core/definitions/number-line.ts:defineNumberLineProperties` (95), `numberLine.describe` (238); `src/layout/number-line.ts:numberLineLayout` (107). `src/layout/kit/axis.ts:drawAxis` (96: `NLC-REQ-004, NLC-REQ-006, NLC-REQ-007`), listed in the coverage table, has none | Yes (table names an unannotated location, CR-001) |
| NLC-REQ-020 | `@spec NLC-REQ-020` | `src/core/definitions/number-line.ts:tickLabelsOnTicks` (180) | Yes |
| NLC-REQ-021 | `@spec NLC-REQ-021` | `src/core/definitions/number-line.ts:defineNumberLineProperties` (95), `numberLine.describe` (238); `src/layout/number-line.ts:numberLineLayout` (107) | Yes |
| CPSE-REQ-004 | `@spec CPSE-REQ-004` | `src/entries/number-line.ts` (3) | Yes |
| CPSE-REQ-007 | `@spec CPSE-REQ-007` | `src/react/graphs/NumberLineGraph.tsx:NumberLineGraph` (11) | Yes |

**Coverage:** 13 of 13 requirements annotated, plus NLC-REQ-007's points part and the two CPSE requirements. Each annotation sits directly above its declaration, or above a `/* @__NO_SIDE_EFFECTS__ */` pragma placed just above it, as in `src/core/definitions/ruler.ts:59-61`. `hasArrow`, `numberLineTicks` and `customLabelsByTick` carry no annotation.
**Missing:** None by requirement.
**Specification table:** No. The rows at `.gener8v/specifications/number-lines-and-coordinate-graphs.md:206` and `:219-231` match the code and the record, with two exceptions:
- the NLC-REQ-017 row (`:227`) names `hasArrow`, which has no `@spec`;
- the NLC-REQ-019 row (`:229`) names `src/layout/kit/axis.ts`:drawAxis, whose annotation does not include NLC-REQ-019.

The record's `@spec Annotations` table lists neither (CR-001). The CPSE rows (`.gener8v/specifications/component-packaging-and-source-export.md:196-197`) match.

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm generate` | not re-run (it writes `src/generated`) | Yes. "are committed exactly as a fresh build writes them" (`tests/core/schema-shape.test.ts:304`) passes in each test run, so the committed generated files are current |
| `pnpm lint` | 0 | Yes |
| `pnpm typecheck` | 0 | Yes |
| `pnpm test` (three runs) | 0, 0, 0 | Yes. Run as `vitest run --no-cache`: 51 files and 1,450 tests on each run. The new core and layout files hold 21 and 28 tests, as recorded |
| `pnpm bench` | 0 | Yes. GSV-NFR-001 number-line p95 0.0339 ms (record: 0.0370 ms) |
| `pnpm build` | 0 | Yes. `dist/number-line.js`, `dist/number-line.d.ts`. `tests/package` and the number-line tests were re-run after this build: 8 files, 240 tests, exit 0 |
| `pnpm check:dist` | 0 | Yes (18 built files, no network APIs) |
| `pnpm check:deps` | 0 | Yes (0 runtime dependencies) |
| `pnpm check:images` | 0 | Yes (8 images) |
| `pnpm size` | not re-run (excluded from this review's run) | Not checked. Record: `./number-line` 19.47 kB, `./core` 23.02 kB, both within 25 kB |
| `pnpm publint` | 0 | Yes (All good) |
| `pnpm attw` | 0 | Yes |
| `pnpm audit` | 0 | Yes (No known vulnerabilities found) |
| `gener8v-state.py lint` | 0 | Yes (0 errors, 0 warnings) |

*The eight deliberate breaks need source edits and were not re-run. By reading, each trips a named assertion:*
- *the left arrowhead always drawn: `tests/layout/number-line.test.ts:76-87`, the two cases with `leftArrow: false`;*
- *labels always at the first candidate: `:113-118` and the property `:246-259`;*
- *point labels not cut: `:141-145`;*
- *point labels in a color: `:127-132`;*
- *exact matching: `tests/core/number-line.test.ts:91-95`;*
- *an endpoint counted outside: `:72-75` and the two example tests;*
- *`lineColor` ignored: `tests/layout/kit/axis.test.ts:183-188` and `tests/layout/number-line.test.ts:194-199`;*
- *custom labels not cut: `:164-171` and the at-limit `<text>` bound in `tests/react/Graph.test.tsx:502-519`.*

*The plan's "check using `niceTicks`" break is not in the record. By reading, it would fail `tests/core/number-line.test.ts:110-113` with `internal_error`. No review command changed a tracked file.*

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | The option is additive and read own-key, so an inherited `lineColor` is ignored (tested). Output without it is byte-identical (tested). Tick labels keep the text color. The x,y and x,y,z graphs can use it |
| DEL-002 | Reasonable | Ticks do not move when an arrow is turned on or off (tested; probe over random lines). The extension and filled triangle read as "continues", as the spec's Arrowheads rule says. The inset uses the widest of all tick labels, not only the end ones as the plan said. That is conservative for the ends, but it narrows the span after the custom-label room has been measured (CR-002) |
| DEL-003 | Reasonable direction, overstated | This is a deviation from the Engineer's approved fixed 80. Cutting to the room between ticks improves on it: the fixed 80 overlapped more. But the room is measured on `widestSpan`, not the span drawn, and the 24-unit floor exceeds the room on axes of 17 or more ticks. So "stays clear of their labels" holds only in the tested single-label case (CR-002). The 200-character limit follows GSV-REQ-052, which the every-term test enforces. The ticket's "for example 40" is superseded there, as the pre-flight records |
| DEL-004 | Reasonable | The definitions test forbids `emptyIsAbsent` on a required list-item term. A blank is kept, drawn as an empty text node, and stated as "left blank". The `text` description says so, which answers the carried GSV T-003 CR-007 |
| DEL-005 | Reasonable | 100 points and 100 labels, stated in the descriptions and published as `maxItems`. Probe: the worst case lays out in 18.5 ms |
| DEL-006 | Reasonable | It states what is drawn: title, line label, range, spacing, arrowheads, the custom labels that replace numbers, and points. Custom labels are named by the numeric label they replace, and are left out when tick labels are hidden. Every caller string goes through `quoteText`. Supplied values are stated as written, a default spacing rounded |
| DEL-007 | Reasonable, with a gap | It follows the ticket's Known Hazard: `placeLabel`, with the first candidate as the fallback. At one value the record's 12 candidates give only 4 places, because a shifted candidate overlaps the centered label in its row. The published `points` description promises more (CR-003) |
| DEL-008 | Reasonable | One rule, `customLabelsByTick`, shared by the drawing and `describe`, and the same as `drawAxis`' first-match rule. Documented and tested |
| DEL-009 | Reasonable | Exact comparison. The tick-label check has a tolerance and the point check does not; each is documented and tested. A computed value like `1.0000000000000002` on 0..1 is reported, as the Engineer chose |
| DEL-010 | Reasonable | As `drawAxis` behaves. Stated in the `tickLabels` description and in the text alternative ("Its ticks are not labeled.") |
| DEL-011 | Reasonable | Below the tick labels, at most 2 lines, wrapped to the drawing width |

*Deviations:*
- *DEL-003's cut (see above and CR-002).*
- *The example uses spacing 2 and "zero". It still meets criterion 1, and its labels stay apart; the render confirms it.*
- *NLC-REQ-013 is annotated on the shared `textAlternativeFor`. That is where the behavior lives for every type, and the CPSE-REQ-012 annotation stays.*

*None of the three changes a declared Output path or an interface TICKET-005 reads.*

## Findings

### CR-001: Two `@spec Coverage` rows name locations that carry no annotation: `hasArrow` (NLC-REQ-017) and `drawAxis` (NLC-REQ-019)

**Severity:** Issue
**Location:** `.gener8v/specifications/number-lines-and-coordinate-graphs.md:227` (NLC-REQ-017 row), `:229` (NLC-REQ-019 row); `src/core/definitions/number-line.ts:45-46` (`hasArrow`, doc comment only); `src/layout/kit/axis.ts:96` (`// @spec NLC-REQ-004, NLC-REQ-006, NLC-REQ-007`); delivery record `## @spec Annotations` (NLC-REQ-017 and NLC-REQ-019 rows)
**Traces To:** NLC-REQ-017, NLC-REQ-019; Code Review step 8 (the specification's `## @spec Coverage` must list the annotated locations); the precedent of DGP TICKET-001 code review CR-003 and DGP TICKET-002 CR-002 (a coverage row naming an unannotated location, Issue)
**Description:** The specification's coverage table lists the following:
- NLC-REQ-017 at "`defineNumberLineProperties, hasArrow` (on unless `false`)". But `hasArrow` carries no `@spec`.
- NLC-REQ-019 at four locations ending in "`src/layout/kit/axis.ts`:drawAxis". But `drawAxis`'s annotation is `NLC-REQ-004, NLC-REQ-006, NLC-REQ-007`. It does replace the numeric label with the caller's text (`labelAt`, `src/layout/kit/axis.ts:118-122`), so the location itself is right.

The delivery record's `@spec Annotations` table lists only `defineNumberLineProperties` for NLC-REQ-017, and does not list `drawAxis` for NLC-REQ-019. So the record and the specification disagree, and `grep -rn "@spec NLC-REQ-01[79]"` misses two locations the specification names.
**Impact:** An audit from code to specification, or from specification to code, finds two mismatches. Someone changing `hasArrow`, the one rule the layout and `describe` share for the default, or `drawAxis`' label lookup, gets no `@spec` hint that NLC-REQ-017 or NLC-REQ-019 depends on it.
**Recommendation:** Do one of the following:
- add the annotations: `// @spec NLC-REQ-017` above `hasArrow`, and `NLC-REQ-019` in `drawAxis`' annotation. Then add both locations to the record's `@spec Annotations` table;
- remove `hasArrow` and `drawAxis` from the two coverage rows.

The first keeps the table as delivered, and it is what the rows already claim.
**Status:** Fixed
**Resolution:** Approved: `@spec NLC-REQ-017` added above `hasArrow`; NLC-REQ-019 added to `drawAxis`' annotation; both listed in the delivery record's `@spec Annotations` table. Recorded in the delivery record's Post-Review Amendments (2026-10-22).

---

### CR-002: Custom tick labels can still overlap their neighbours: the room is measured on the widest possible span, and the 24-unit floor exceeds it on axes of 17 or more ticks

**Severity:** Observation
**Location:** `src/layout/number-line.ts:23-31` (`TICK_LABEL_MAX_WIDTH`, `TICK_LABEL_MIN_WIDTH`, `TICK_LABEL_SPACE`), `:119-128` (`widestSpan`, `tickGap`, `labelWidth`, the cut), `:129-136` (`halfLabel` over every tick, `inset`); `tests/layout/number-line.test.ts:164-171`; `src/core/definitions/number-line.ts:145` (`text` description)
**Traces To:** DEL-003 and the recorded deviation ("The cut is now the room between ticks … A test checks a cut label clears its neighbours"); the layout's doc comment ("so it stays clear of their labels", `:24-25`); AD-010 (labels laid out without overlap from estimated metrics); NLC-REQ-019
**Description:** The cut width is computed before the span is known: `tickGap = widestSpan × spacing / (max − min)` with `widestSpan = 400 − 2 × (16 + 17) = 334` (`:121-123`). The inset is then widened to half the widest tick label, over all ticks and not only the end ones (`:132-134`). So whenever any label is wider than 34 units, the span drawn is narrower than the one the room was measured on. Separately, the 24-unit floor exceeds the room once a gap is under 28 units, that is on 17 or more ticks. Probes, all valid descriptions, with box edges as `tests/fixtures/scene-geometry.ts` measures them:
- 0 to 1 by 0.25, "one quarter of it" at 0.25 and "one half of it" at 0.5. The room was measured as 79.5, but the drawn gap is 72.9. "one quarter…" spans [88.9, 165.2] and "one half of it" spans [164.0, 236.0]: they overlap by 1.2.
- 0 to 20 by 1, "four" at 4 and "five" at 5 (number words on a 0-20 line). The room is 12.7, but neither label is cut because both are under the 24 floor. "four" spans [88.4, 111.2] and "five" spans [106.2, 126.8]: they overlap by 5.0.
- −8 to 8 by 1, "half way" at 4 and 5. Both are cut to "ha…" (23.5 wide) on a 20.9 gap. The rendered image shows "ha…ha…" touching.
- Over 8,000 random axes of 2 to 20 gaps whose numeric labels do not overlap, 1 to 3 adjacent custom labels introduced an overlap in 371. They fall at 4 to 5 gaps (the span) and at 16 to 20 gaps (the floor).

The delivered test has one custom label on 0..4 and asserts width ≤ 80 and no overlap. Its name says "no wider than the room between ticks", which it does not check. Numeric labels can also crowd on a dense given spacing: −10 to 10 by 0.5 overlaps on all 40 adjacent pairs. The approved plan (D3) and NLC T-001's Notes accept that; it is context here, not part of this finding.
**Impact:** On a classroom line ticked every unit with word labels, or with two long neighbouring labels on a short line, the drawn labels run together. The text alternative still states each label whole. No requirement or acceptance criterion is missed, but DEL-003's stated purpose is only partly met.
**Recommendation:** Measure the room on the span actually drawn. A cut only narrows labels, which can only widen the span, so one re-cut converges:
- cut, compute the inset, then re-cut every custom label to `gap − TICK_LABEL_SPACE` on that span;
- or size the room from the narrowest span the labels allow (inset `16 + max(17, TICK_LABEL_MAX_WIDTH / 2)`).

For the floor, do one of two things. Either cut below 24 when the room is smaller, to "…" or blank, or state in the `text` description that custom labels on axes of more than 16 ticks may touch. Add tests with two adjacent custom labels: 0..1 by 0.25, and "four"/"five" on 0..20 by 1. Then rename the existing test or make it check the room.
**Status:** Fixed
**Resolution:** Approved (re-cut on the drawn span): labels are cut again on the span actually drawn; the 24-unit floor stays and the `text` description says neighbouring labels on a densely ticked line may touch. Tests for 0..1 by 0.25 and four/five on 0..20 by 1; existing test renamed. Recorded in the delivery record's Post-Review Amendments (2026-10-22).

---

### CR-003: At one value only four point labels are placed apart, not twelve, yet the published `points` description says shared-value labels are "placed apart" without limit

**Severity:** Observation
**Location:** `src/layout/number-line.ts:43-44` (`SHIFT = 0.5`), `:151-157` (candidates and the first-candidate fallback); `src/core/definitions/number-line.ts:117` (`points` description: "Points may share a value: each is drawn, and their labels are placed apart."); `tests/layout/number-line.test.ts:120-125`
**Traces To:** Specification Behaviors & Rules → Points and Segments ("both labels are placed so that neither hides the other"); OQ-005 and the Edge Case "Very many labeled points close together"; the ticket's Known Hazard (first candidate when none is free); DEL-007 ("Candidates on 4 rows … each centered on the point then shifted right and left (12)"); GSV-REQ-012 (published plain-English definitions)
**Description:** A shifted candidate moves the label by `0.5 × (width + 4)`. A label of width w therefore spans [x + 2, x + 2 + w], which overlaps the centered label [x − w/2, x + w/2] on the same row whenever w > 4. So for points at one value, the shifted candidates are never free once the centered one on that row is taken. The fifth label finds no candidate and falls back to the first, which is the first label's exact box, so the two print over each other. Probe, coincident points at 0 on −10..10:

| Labels at one value | Overlapping pairs ("A0"…, "Monday0"…, "a much longer label here0"…) |
|---|---|
| 2, 3 or 4 | 0, 0, 0 |
| 5 | 1, 1, 2 |
| 6 | 3, 3, 6 |

With a one-letter label, the drawing has room either side, yet "A4" lands on "A0". The rendered image of six labels at 2 shows "P0" and "P4" printed as one smudge. The 40-point test checks that every label is drawn and the height is bounded, not that the labels are apart. DEL-007's "Up to 4 labels always find a clear place" is accurate. The 12 candidates help only near-but-not-coincident points.
**Impact:** The ticket's two-point criterion and the spec's two-point rule are met, and OQ-005 allows overlap for "very many" points. But five labels at one value is a small number. The published term definition, which a model reads to write descriptions, promises separation that the drawing gives only up to four.
**Recommendation:** Do one of the following:
- shift the side candidates by a full label width plus `GAP` (offset ±1), so they sit beside the centered label. Up to 12 labels at one value then find room where the drawing's width allows. Add a test with 5 to 12 short coincident labels and no overlap;
- qualify the `points` description, for example "up to four labels at one value are placed apart; more may overlap", and keep the current candidates.

Either way, add a test that pins the chosen behavior at five coincident labels.
**Status:** Fixed
**Resolution:** Approved (shift by a full width): `SHIFT` = 1, so up to 12 short labels at one value are placed apart; `points` description qualified "where the drawing has room". Test for 5, 8 and 12 coincident labels. Recorded in the delivery record's Post-Review Amendments (2026-10-22).

---

### CR-004: The `tick_label_not_on_tick` message gives wrong advice for an off-range multiple and never states the spacing

**Severity:** Observation
**Location:** `src/core/issues.ts:150` (params `{ term; got }`), `:371-372` (message); `src/core/definitions/number-line.ts:190` (the check passes only `term` and `got`); `tests/core/number-line.test.ts:100`, `:102` (these cases are checked for code and path only)
**Traces To:** GSV-REQ-031 ("a plain-English message that … says what would make the value acceptable"); GSV-REQ-032 ("the allowed range, where one applies"); NLC-REQ-020; specification Edge Case "Custom tick label on a value that is not a tick"
**Description:** The message is always "… is at X, which is not a tick position; use a value that is a multiple of the tick spacing." Probes:
- 20 on 0..10 by 1: 20 is a multiple of 1 but outside the range.
- 0 on 1..10 by 3: 0 is a multiple of 3 but not in the range (tested at `:102`).
- 3 on −10..10 with no spacing: the spacing is the default 2, but the message does not say so, and the caller never gave one.

The first two are the cases the delivery added tests for. In both, the advice is already satisfied, and following it cannot help. The template and its params are GSV TICKET-002's. This ticket is the first to produce the issue.
**Impact:** A model or author fixing the description from the message gets advice that does not apply, or must work out the default spacing. The issue's code and path are right, so NLC-REQ-020 is met.
**Recommendation:** Add the axis range and the spacing used to the issue's params. This is additive, and the code stays stable (GSV-REQ-034). State both, for example "use a tick: a multiple of 2 from -10 to 10". Pass them from `tickLabelsOnTicks` (`drawn.spacing`, `line.axis.min` / `max`), and assert the message in `tests/core/number-line.test.ts`. If changing a GSV message is out of this ticket's lane, defer it to a GSV ticket with a Known Hazard there.
**Status:** Fixed
**Resolution:** Approved (fix here): the issue carries the spacing drawn and the axis range; message "use a tick: a multiple of 2 from -10 to 10"; asserted in tests. Recorded in the delivery record's Post-Review Amendments (2026-10-22).

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Approve | Approved: `@spec NLC-REQ-017` added above `hasArrow`; NLC-REQ-019 added to `drawAxis`' annotation; both listed in the delivery record's `@spec Annotations` table. | src/core/definitions/number-line.ts, src/layout/kit/axis.ts, delivery record |
| CR-002 | Approve | Approved (re-cut on the drawn span): labels are cut again on the span actually drawn; the 24-unit floor stays and the `text` description says neighbouring labels on a densely ticked line may touch. Tests for 0..1 by 0.25 and four/five on 0..20 by 1; existing test renamed. | src/layout/number-line.ts, src/core/definitions/number-line.ts, tests/layout/number-line.test.ts |
| CR-003 | Approve | Approved (shift by a full width): `SHIFT` = 1, so up to 12 short labels at one value are placed apart; `points` description qualified "where the drawing has room". Test for 5, 8 and 12 coincident labels. | src/layout/number-line.ts, src/core/definitions/number-line.ts, tests/layout/number-line.test.ts |
| CR-004 | Approve | Approved (fix here): the issue carries the spacing drawn and the axis range; message "use a tick: a multiple of 2 from -10 to 10"; asserted in tests. | src/core/issues.ts, src/core/definitions/number-line.ts, tests/core/issues.test.ts, tests/core/number-line.test.ts |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0
**Notes:**
- All four findings were fixed in resolution with the Engineer (Thomas Eaves), 2026-10-22, and recorded in the delivery record's Post-Review Amendments.
- Every acceptance criterion is met and every covered requirement is implemented and annotated; the Verification Run passes after the fixes (1,454 tests, three runs).
