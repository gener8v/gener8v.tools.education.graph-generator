# TICKET-002: Deliver the number line graph type — Quality Review

## Summary

I reviewed the delivery of `graph-library/number-lines-and-coordinate-graphs/TICKET-002` on branch `ticket/nlc-002`, delivery commit `4cd2f9c`. That covers:
- the number line's definition, checks and text alternative;
- its layout;
- the additive `lineColor` option on `drawAxis`;
- its component and entry point;
- their tests.

The code follows the ruler's shape closely. It keeps one rule for what is checked, drawn and stated (`numberLineTicks`, `customLabelsByTick`, `hasArrow`). Lint, typecheck and build exit 0, and the full suite passes on three runs (51 files, 1,450 tests). The geometry property held over 60,000 replicated cases. The findings are about what the drawing promises and what the tests pin:
- **QR-001 (Concern):** custom tick labels can overlap their neighbours, in two ways:
  - the cut is sized on a span the line does not have once a custom label is wide;
  - the 24-unit floor is wider than the room between ticks on lines of more than about 12 intervals.

  Going back to the plan's fixed 80 units, the thing DEL-003 changed, passes every test.
- **QR-002 (Concern):** the tests miss three layout breaks:
  - arrowheads that point inward, detached from the line, pass every test, including the one named "points each arrowhead outward";
  - without the width floor, a valid 0..99 line with one custom label throws;
  - without a custom label's room at the ends, the label is drawn outside the figure.
- **QR-003 (Suggestion):** nothing pins the text alternative's "supplied values as written" rule: stating points, range or spacing rounded passes. The hostile-text test is also looser than the other types' tests.
- **QR-004 (Concern):** `tick_label_not_on_tick` gives poor advice in two cases:
  - it tells the caller to "use a value that is a multiple of the tick spacing" when the label already is one but lies off the range;
  - it never states the spacing when the caller left it to the default.
- **QR-005 (Suggestion):** the layout's `measure` is the fifth copy of the wrap-then-measure steps in the layouts.

There are 5 findings: 0 Critical, 3 Concerns and 2 Suggestions.

**Reviewer:** `quality-reviewer` agent, fresh context (findings phase only, 2026-10-22)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/number-lines-and-coordinate-graphs-ticket-002-delivery.md` (DEL-001 to DEL-011; Post-Review Amendments: none)
**Other reviews:** the code and security reviews ran at the same time as this one. Neither report existed when this one was written, so overlaps are not cross-referenced. QR-004 touches GSV-REQ-031 and may overlap the code review.

**Files Reviewed:**
- `src/core/definitions/number-line.ts`
- `src/layout/number-line.ts`
- `src/layout/kit/axis.ts` (the `lineColor` option)
- `src/react/graphs/NumberLineGraph.tsx`, `src/entries/number-line.ts`
- `src/core/definitions/shared.ts` (the `lineLabel` description), `src/layout/scene.ts` (one annotation)
- Registration: `src/core/definitions/index.ts`, `src/layout/registry.ts`, `src/index.ts`, `package.json`, `tsup.config.ts`, `.size-limit.json`
- `examples/number-line.json`, `examples/invalid/number-line-point-outside.json`, `examples/invalid/number-line-label-off-tick.json`
- `tests/core/number-line.test.ts`, `tests/layout/number-line.test.ts`
- The number-line cases added to `tests/layout/kit/axis.test.ts`, `tests/react/Graph.test.tsx` and `tests/package/per-type-bundle.test.ts`
- Not reviewed line by line: `src/generated/*` and `tests/fixtures/generated/description.ts` (output of `pnpm generate`)
- Read for pattern consistency, unchanged here:
  - `src/layout/ruler.ts`, `src/core/definitions/ruler.ts`, `src/layout/line-graph.ts`, `src/layout/circle.ts`, `src/layout/bar-graph.ts`, `src/react/graphs/RulerGraph.tsx`, `src/entries/ruler.ts`;
  - the kit's `labels.ts`, `markers.ts`, `text.ts`, `title.ts`, `ticks.ts`, `value-scale.ts`;
  - `src/core/format.ts`, the axis section of `src/core/value-scale.ts`, `src/core/issues.ts`, `src/core/style.ts`, `src/core/validate/structure.ts` (provenance; output frozen, null-prototype);
  - `tests/core/bar-graph.test.ts`, `tests/core/line-graph.test.ts`, `tests/fixtures/plain-text.ts`, `tests/fixtures/scene-geometry.ts`.
- Read for context:
  - the ticket `.gener8v/changes/graph-library/tickets/number-lines-and-coordinate-graphs/TICKET-002.md` and its Known Hazards;
  - `.gener8v/context.md`;
  - the NLC TICKET-001 quality review;
  - `.gener8v/specifications/graph-specification-and-vocabulary.md` (GSV-REQ-031).

**Findings:** 5
**Critical:** 0 | **Concerns:** 3 | **Suggestions:** 2

## Quality Assessment

### Code Organization

**Rating:** Strong
**Notes:**
- **One rule, several users.**
  - `numberLineTicks` is `drawableTicks` with the tick spacing read own-key. The off-tick check, `describe` and the layout all use it.
  - `customLabelsByTick` is used by `describe` and by the layout, so the label a tick shows is the label the text alternative states (DEL-008).
  - `hasArrow` holds the "on unless `false`" default for both.
  - The drawing, the check and the text alternative therefore cannot disagree about ticks, custom labels or arrowheads.
- **The definition mirrors the ruler's.**
  - Its builders are marked `/* @__NO_SIDE_EFFECTS__ */`.
  - One `positionValue` spec object serves both lists, so the definitions test's consistency rule holds.
  - The shared `label` and `color` specs are nested as the same objects, and no shared option is listed.
- **The layout mirrors the ruler's.** It uses `titleBlock`, `placeLabel` with a first-candidate fallback, and a `RangeError` that fails closed. Its text alternative is the type's own `describe`.
- **The kit change is additive.**
  - `lineColor` is read own-key, and the default output is unchanged.
  - Tests cover both, and an inherited `lineColor` is ignored.
- **Dependency direction.**
  - Core imports only core.
  - The layout imports the core definition and the kit, as `src/layout/ruler.ts` imports `src/core/ruler.ts`.
  - The component and entry point have the ruler's shape. Diffed with the type name normalised, they differ only in where one comment line wraps.
- **Considered and not raised:**
  - **`numberLineLayout` is about 100 lines** (`src/layout/number-line.ts:108-209`) with five stages, and its comments mark each one. Two stages depend on each other: the custom-label cut assumes a span, and the inset depends on the cut. QR-001's recommendation puts them in one helper.
  - **`ARROW_ROOM` is computed at module level** from two literals. A minifier folds the sum, and the consumer-bundle test of every other built entry passes.

### Readability

**Rating:** Adequate
**Notes:**
- **The doc comments explain why.** They cite the decisions (DEL-001 to DEL-011) and reviews behind each rule, in the house style. Each `@spec` sits on its own line after the JSDoc.
- **`describe` reads as the sentence it builds.** Its doc comment gives an example of the output.
- **Minor points, not findings:**
  - **`GAP` (4) names four distances** in `src/layout/number-line.ts`:
    - a label's clearance above the markers;
    - the spacing between label rows;
    - the line label's gap;
    - at `:195`, a stand-in for `drawAxis`'s private `LABEL_GAP` (also 4) when working out where the tick labels end.

    The last coupling is tested: setting `LABEL_GAP` to 12 fails two tests. Setting it to 8 is absorbed by the line-height slack.
  - **`src/layout/number-line.ts:121` says the cut is "measured on the widest span the line can have".** That is the cause of QR-001.
  - **`tests/core/number-line.test.ts:47`** reads `const at = (value: number) => ({ value: 0, text: String(value) })`. The parameter named `value` becomes the text, and every label sits at 0. The test is right, but it reads like a bug.
  - **The `describe` callback is 35 lines inline** in the definition object (`src/core/definitions/number-line.ts:239-273`); the ruler's is 17. Helpers for the custom-label sentence and the points sentence would shorten it.
  - **"Caller text, or blank" is written three ways:** `cleaned()` in the definition, and inlined twice in the layout (`:147`, `:196`).

### Error Handling

**Rating:** Adequate
**Notes:**
- **Validation.** Every issue goes through `createIssue`, with its pointer and readable term.
  - `outside_axis_range` names the range and says what to do: "points[0].value (12) is outside the axis range, from -10 to 10; move it inside the range or widen the axis."
  - The two checks skip an axis the axis checks refuse rather than failing on it. Tests cover too many ticks, a bad spacing and a reversed range.
- **Layout.**
  - `numberLineLayout` throws a `RangeError` on an axis no validation gives (tested), as `rulerLayout` does.
  - `drawAxis`'s `checkedLabels` guards its options.
  - The `TICK_LABEL_MIN_WIDTH` floor is also what keeps `wrap` from throwing on dense lines, and that is untested (QR-002).
- **QR-004.** The off-tick message gives advice that is already satisfied for a label off the range, and no number when the spacing was left to the default.
- **Considered and not raised.** Points are compared exactly (D9), while custom labels match a tick within `isTickValue`'s tolerance. A computed 0.1 + 0.2 label is therefore accepted at the 0.3 tick, but a point at 0.1 + 0.2 on 0..0.3 is refused as outside. This was an approved decision, and its message gives the range.

### Test Coverage

**Rating:** Adequate
**Notes:**

**Commands run at `4cd2f9c`:**

| Command | Exit | Result |
|---|---|---|
| `pnpm lint` | 0 | `eslint .`, no output |
| `pnpm typecheck` | 0 | `tsc --noEmit`, no output |
| `pnpm test`, run as `npx vitest run --no-cache` (three times) | 0, 0, 0 | 51 files, 1,450 tests passed (5.1 s, 7.3 s, 4.6 s). An earlier run whose exit code the shell did not capture also reported 51 files and 1,450 passed. |
| `npx vitest run --no-cache` on the three number-line and axis test files, `--reporter=verbose` | 0 | 82 passed: 21 in `tests/core/number-line.test.ts`, 28 in `tests/layout/number-line.test.ts`, 33 in `tests/layout/kit/axis.test.ts` |
| `pnpm build` | 0 | ESM and DTS "Build success"; `dist/number-line.js`, `dist/number-line.d.ts` |

- **How the commands ran.**
  - `--no-cache` keeps Vitest from writing its results cache; otherwise the command is `pnpm test` (`vitest run`).
  - The suite's global setup and `pnpm build` rewrite the gitignored `dist/`.
  - The text kit's known-flaky "stops early" timing test did not fail.
- **Not run.**
  - I was asked to skip `pnpm generate` and `pnpm size`.
  - `bench`, the `check:*` scripts, `publint`, `attw` and `audit` are not among `.gener8v/context.md`'s verify commands.
- **How the probes ran.**
  - Probes ran with `tsx` from the repository root, importing `src`.
  - Each mutant is a copy of one source file in the session scratchpad. A scratch Vitest config, with its cache directory in the scratchpad, swaps the mutant in for the real module and runs the unmodified test files against it: `tests/layout/number-line.test.ts`, `tests/core/number-line.test.ts` and `tests/react/Graph.test.tsx`, plus `tests/core/describe.test.ts` for the definition's mutants.
  - A sanity mutant (no left arrowhead) fails three tests, so the swap takes effect.
  - No repository file was edited, and `git status` is unchanged.

**What the tests cover well:**
- **Validation:**
  - the example validates;
  - left-out arrow settings stay absent and are stated as on;
  - camelCase only (`arrowheads` and `left_arrow` are unknown keys, `leftArrow: "no"` is the wrong kind);
  - a top-level `label` names "each point";
  - a blank text is accepted, 200 characters are accepted and 201 are refused, and a missing `text` is reported;
  - 100 points are accepted and 101 points or 101 labels are refused;
  - each invalid example gives its one issue.
- **The range check:**
  - the exact issue, with its message and range;
  - both endpoints accepted, including 0.1 and 0.3 as written;
  - many outside points, each reported once and in order;
  - skipped on a refused axis.
- **The off-tick check:**
  - ⅔ on a spacing of thirds, and 0.1 + 0.2 at the 0.3 tick, are accepted;
  - reported: a value between ticks, one just past the tolerance, one off the range, and 0 off a range that leaves it out;
  - the default spacing is used when none is given;
  - an axis with too many ticks or a bad spacing gives the axis issue only.
- **The text alternative:**
  - the example's full sentence;
  - the arrowhead phrases;
  - a blank custom label, the first label at a tick, and hidden tick labels;
  - "No points are marked.";
  - a blank title and line label left out.
- **The layout:**
  - **Ranges and placement:**
    - four ranges, with ticks equal to `niceTicks` and placed within 0.5;
    - everything inside the drawing at ±1e9;
    - four arrowhead combinations, each with plain ends and no `url(`;
    - ticks unmoved between the combinations;
    - markers within 0.5;
    - coincident labels apart;
    - 40 coincident points in a bounded height.
  - **Colors and labels:**
    - a point's color on its marker only;
    - no points;
    - point labels cut to two lines;
    - custom labels, including a blank one, the first of two at a tick, a cut label and hidden labels;
    - the line label drawn once, below the tick labels;
    - the title drawn first;
    - `lineColor` on the line, the ticks and the heads only.
  - **The rest:**
    - `textAlternative` equals `describe`;
    - failing closed on an axis no validation gives;
    - one-cluster texts inside the drawing;
    - a fast-check property over 200 number lines.
- **Components and bundles:**
  - the accessible name through `<Graph>` and `<NumberLineGraph>`;
  - a supplied text alternative replacing it, and a blank one keeping it;
  - a bounded `<text>` count at the text limits;
  - three refusals one character over the limit;
  - `displayName`;
  - source and consumer bundle isolation in both directions.

**Gaps, measured with probes and mutants:**
- **QR-001.** Custom labels overlap their neighbours, and the cut rule DEL-003 introduced is not pinned.
- **QR-002.** Arrowhead direction and attachment, the width floor and the end room for custom labels all survive mutation.
- **QR-003.** "As written" in the text alternative is not pinned, and the hostile-text loop is looser than the other types'.

**Mutation results** (in memory, against the unmodified test files):

| Mutation | Result |
|---|---|
| Sanity: the left arrowhead never drawn | 3 tests fail (the harness works) |
| The left head drawn with `direction` 1 (points inward) | survives, 92/92: QR-002 |
| Both heads' bases on the wrong side (`tipX + direction × length`) | survives: QR-002 |
| The left extension segment removed | survives: QR-002 |
| `TICK_LABEL_MIN_WIDTH` floor removed | survives; a valid 0..99 line with a custom label then throws: QR-002 |
| Custom labels left out of the end room (`halfLabel` from numeric labels only) | survives; a custom label at `min` is drawn from x = −5.9: QR-002 |
| `TICK_LABEL_MAX_WIDTH` = 1000 | survives: QR-001 |
| The cut at a fixed 80 units (the plan, before DEL-003's deviation) | survives: QR-001 |
| Points stated as derived (rounded) | survives: QR-003 |
| The range stated as derived | survives: QR-003 |
| A supplied spacing stated as derived | survives: QR-003 |
| The last custom label at a tick wins | caught (2 tests) |
| Left and right arrowhead phrases swapped | caught (1 test) |
| `LABEL_ROWS` = 1 or 2 | caught (2 tests, 1 test) |
| `LABEL_ROWS` = 6 | survives. The height bound is `< 400`, and 6 rows are still bounded. Not raised. |
| No shifted candidates (rows only) | survives. Four labels, the property's limit, fit by rows alone. Not raised. |
| Placement obstacles reduced to the placed labels (no line, no markers) | survives. Every candidate sits above the markers' reach by construction, so these obstacles never bind. Not raised. |
| The spacing's source read from `sourceOf(provenance, …)` instead of own-key presence | survives. The two are the same, since no derivation writes `tickSpacing`. Not raised. |
| `drawAxis`'s `LABEL_GAP` 8, 12 | 8 survives (slack); 12 caught (2 tests) |

**Property stability.** I replicated `tests/layout/number-line.test.ts:222-260` assertion for assertion and ran it on 60 seeds × 1,000 runs, 60,000 cases in all. None failed.

**Other probes, not findings:**
- **Point labels beyond the property's four.** I drew 5, 6, 8 and 10 labelled points at random whole numbers on −10..10 by 1, 1,000 lines each, with one-letter labels, weekday names and first names. At most 0.1% of lines draw overlapping labels: the documented fallback (OQ-005), rarely reached.
- **Cost at the limits.** The line is 0..99 by 1, with:
  - 100 points carrying 200-character labels;
  - 100 custom labels of 200 characters;
  - a 200-character title and line label.

  Validation takes 7.7 ms. The layout takes 10.7 ms median and 17.2 ms at most over 20 runs, with 510 nodes and a height of 326.7.

### Observability & Operability

**Rating:** Adequate
**Notes:**
- **This is a library**, with no runtime network, no telemetry (`.gener8v/context.md`) and no logger in `src`. A definition and a layout should not log, and these do not.
- **Validation failures are issues** with a pointer, a readable term and a message:
  - `outside_axis_range` says what would make the value acceptable;
  - `tick_label_not_on_tick` does not always say so (QR-004).
- **A layout bug surfaces as a `RangeError`** naming the function ("numberLineLayout(): the axis cannot be drawn"). It reaches callers as the fixed `internal_error`, the GSV TICKET-002 SEC-003 design.
  - The message leaves out the axis values. `rulerLayout`'s does too, and `internal_error` does not pass the message to callers anyway. Not raised.

## Findings

### QR-001: Custom tick labels are cut on a span the line does not have, and their floor is wider than the room on dense lines, so they overlap their neighbours

**Category:** Maintainability
**Severity:** Concern
**Location:**
- `src/layout/number-line.ts:119-136`: `widestSpan` at `:121`, `tickGap` at `:122`, `labelWidth` at `:123`, `halfLabel` at `:130-133`, `inset` at `:134`;
- the constants at `src/layout/number-line.ts:23-31`;
- the `text` description at `src/core/definitions/number-line.ts:145`;
- the tests: `tests/layout/number-line.test.ts:164-171` (the cut) and `:222-260` (the property).

**Description:**
- **What DEL-003 promises.**
  - The deviation replaced the plan's fixed 80 units because that width "overlapped the neighbours' labels on an axis ticked every unit".
  - The doc comment says the cut keeps a label "clear of their labels".
  - The `text` term's description tells callers that a text "wider than its tick's room is cut short".
- **The cut misses the room in two ways.**
  - **The wrong span.**
    - The cut is measured on `widestSpan`, the span with room for the arrowheads only: 334 units.
    - The inset then grows to half the widest tick label. A custom label cut to up to 80 units wide narrows the line to as little as 288 units.
    - So a label is cut for ticks 83.5 apart, then drawn on ticks 72.6 apart.
    - Probe: on 0..4 by 1 with long custom labels at 1, 2 and 3, each label is cut to 77.8 units on ticks 72.6 apart. Two pairs overlap.
  - **The floor.**
    - `TICK_LABEL_MIN_WIDTH` (24) is wider than the room once a line has more than about 12 intervals (334 / 12 − 4 ≈ 24).
    - −10..10 by 1 with "zero" at 0 draws "ze…" into "-1".
    - 0..20 by 1 with "end" at 20 runs 1.6 units into "19".
- **How often.** I drew 6,000 lines ticked every 1, with 2 to 20 intervals and one to three consecutive custom labels. The labels came from 12 classroom words ("start", "half", "one quarter", "freezing point", "Monday" …). Only overlaps that involve a custom label are counted:

  | Intervals | Custom labels | Lines | With an overlap | Worst intrusion |
  |---|---|---|---|---|
  | 2–4 | adjacent | 659 | 10 (1.5%) | 7.0 units |
  | 2–4 | single | 315 | 0 | — |
  | 5–11 | either | 2,235 | 0 | — |
  | 12–20 | single | 908 | 125 (13.8%) | 2.4 units |
  | 12–20 | adjacent | 1,883 | 1,050 (55.8%) | 6.8 units |

- **The tests cannot see it.**
  - The one cut test (`:164-171`) uses 0..4 with a single custom label between numeric neighbours.
  - The property generates no custom labels and no given spacing.
  - In-memory mutation: the plan's fixed 80, which DEL-003 replaced, passes all 92 tests in the three files. So does `TICK_LABEL_MAX_WIDTH = 1000`.

**Impact:**
- **Overlapping labels on ordinary lines.** Custom labels are how a worksheet writes "start", "½" or a word at a tick (NLC-REQ-019; the ticket's Known Hazard on OQ-001). They run into neighbouring labels on ordinary classroom lines, −10..10 by 1 among them. Meanwhile the term's description tells the caller, often a model, that they are cut to fit.
- **No safety net.** The deviation's stated reason is not met, and nothing would flag a return to the plan's 80.

**Recommendation:**
- **Cut on the span that is drawn.**
  - Once the inset is known, cut again when `SCENE_WIDTH − 2 × inset` is narrower than `widestSpan`.
  - The second cut is never wider than the first, so the inset need not grow and no tick moves.
  - A probe copy that does this removes the 10 short-line overlaps (0 of 659). All 92 tests in the three files still pass.
  - Holding the cut and the inset in one helper keeps the two-way dependency in one place, for example `customTickLabels(drawn, normalized)` returning `{ labels, inset }`.
- **Decide the floor explicitly.** Either:
  - keep 24, and say in the `text` description, DEL-003 and the doc comment that on a line of more than about 12 intervals a custom label may touch its neighbours, as numeric labels may (NLC TICKET-001 Notes); or
  - let the width follow the room down to a few units. That leaves only "…" on dense lines, the plan's other D3 sub-choice.

  Either way the width must stay positive: the floor is also what stops `wrap` from throwing (QR-002).
- **Pin it.**
  - Add custom labels (consecutive ones included) and a given spacing of 2 to 20 intervals to the property, and assert that custom labels clear their neighbours wherever the chosen floor allows.
  - Add a short-line case with three adjacent long labels.

**Status:** Fixed
**Resolution:** Approved: fixed by code review CR-002 in `8a63429` (cut again on the span drawn; the 24-unit floor kept and documented in the `text` description and the layout's doc comment). Added a test with three adjacent long custom labels on 0..4 by 1, clear of one another. Recorded in the delivery record's Post-Review Amendments (2026-10-23).

---

### QR-002: Arrowhead direction and attachment, and two safeguards in the layout, survive mutation

**Category:** Testing
**Severity:** Concern
**Location:**
- `src/layout/number-line.ts:57-74` (`arrowhead`), `:182-187` (the extensions and heads), `:123` (the `TICK_LABEL_MIN_WIDTH` floor), `:130-134` (custom labels in the end room);
- `tests/layout/number-line.test.ts:60-65`, `:68-102`, `:214-219`.

**Description:**
- **Arrowheads.** The tests check three things:
  - how many polygons are drawn (`:76-87`);
  - that ticks do not move (`:89-93`);
  - that each head's bounding box lies beyond the line's end (`:95-101`).

  Nothing checks which way a head points, or that it meets the line. In-memory mutants against the unmodified tests:
  - **The left head drawn with `direction` 1**, pointing inward: all 92 tests pass.
  - **Both heads' bases on the wrong side** (`tipX + direction × length`): all pass.
    - Probe on −10..10: the left head becomes `16,20.5 7,16 7,25`.
    - That is a triangle pointing right, toward the line, with its base 9 units further out, and detached from the line's extension, which ends at 25.
  - **The left extension segment removed**, leaving the head 8 units from the line: all pass.
  - The test named "points each arrowhead outward, tip beyond the line's end" passes on both inward mutants.
- **The width floor is a crash guard.**
  - Without `TICK_LABEL_MIN_WIDTH`, `tickGap − 4` turns negative past about 83 intervals, and `wrap` throws.
  - Mutant with the floor removed: all tests pass.
  - The valid description `{ axis: { min: 0, max: 99, tickSpacing: 1 }, tickLabels: [{ value: 50, text: "half way" }] }` then throws "RangeError: wrap(): maxWidth must be a positive number, got -0.626…". That is `internal_error` for a figure the validator accepted.
  - No test draws a custom label on a line of more than 20 intervals.
- **Custom labels in the end room.**
  - `halfLabel` counts custom labels, so that one at an end stays inside the drawing.
  - Mutant counting numeric labels only: all tests pass. A long custom label at `min` on 0..4 is then drawn from x = −5.9.
  - "keeps everything inside the drawing, end labels included" (`:60-65`) and the one-cluster test (`:214-219`) use no custom label at an end.
- **Unused exports.** `TICK_LABEL_MIN_WIDTH` and `LABEL_ROWS` are exported, but nothing outside the module reads them.

**Impact:**
- **Wrong figures pass.** The arrowhead is what NLC-REQ-015 to NLC-REQ-017 are about: it shows the line continues. An inward or detached head is a wrong figure, and a test name claims coverage it does not give.
- **Safeguards can be dropped.** The floor and the end room keep valid descriptions from failing or from drawing outside the figure. A refactor that drops either passes CI.

**Recommendation:**
- **Arrowheads.** For each end that has a head, read the polygon's `points` and assert:
  - its tip is the corner farthest from the line's middle, beyond the range's end;
  - its base meets the extension segment's outer end;
  - the extension starts at the range's end.
- **Dense lines.** Draw a custom label on a 99-interval line, and assert it does not throw, stays on one line and passes `checkScene`.
- **End labels.** Add long custom labels at both `min` and `max` to the inside-the-drawing test.
- **Exports.** Use `TICK_LABEL_MIN_WIDTH` in those tests, or stop exporting it and `LABEL_ROWS`.

**Status:** Fixed
**Resolution:** Approved: tests now check each arrowhead's tip points outward on the line and its base meets an extension from the range's end; a custom label on a 0..99-by-1 line is cut to `TICK_LABEL_MIN_WIDTH` on one line; long custom labels at `min` and `max` stay inside the drawing. `LABEL_ROWS` is no longer exported. Mutants (inward head, base on the wrong side, no extension, no floor, numeric-only end room) each fail a test. Recorded in the delivery record's Post-Review Amendments (2026-10-23).

---

### QR-003: The text alternative's tests do not pin "supplied values as written", and the hostile-text test is looser than the sibling types'

**Category:** Testing
**Severity:** Suggestion
**Location:** `src/core/definitions/number-line.ts:244-245`, `:267` (`stateMeasurement` with provenance); `tests/core/number-line.test.ts:129-134`, `:148-157`
**Description:**
- **"As written" is not pinned.**
  - The test "states a default spacing rounded and a supplied one as written, and values as written" uses a spacing of 0.25 and a point at 0.1. The example uses whole numbers.
  - `formatDerived` (two decimals) gives the same text for every one of these values.
  - Mutants that state the points, the range or a supplied spacing as derived pass every test in the core, layout, `describe.test.ts` and `Graph.test.tsx` files.
  - Probe: 0..1 by 0.125, with a point at 0.375 labelled "three eighths".
    - Delivered: "…ticked every 0.125, … 1 point is marked: 0.375 labeled “three eighths”."
    - The mutants state "0.38", and "ticked every 0.13".
  - The bar and line graphs pin this rule with values the rounding would change, such as 1234.56789012 and 0.000001 (`tests/core/bar-graph.test.ts:155-163`, `tests/core/line-graph.test.ts:218-220`).
- **The hostile-text test is looser.**
  - `:148-157` silently skips any description the validator refuses (`continue`). That is 4 of the 10 `HOSTILE_TEXT` entries.
  - It asserts only that the sentence starts with "A number line" and that some quotation exists, and the title alone satisfies that.
  - The tests for the other types (`tests/core/bar-graph.test.ts:165-176`, `tests/core/line-graph.test.ts:222`, `tests/core/pictograph.test.ts:225`) do more:
    - they also run `BENIGN_TEXT` and `SMUGGLED_TEXT`;
    - they assert that a refusal is for an unsafe character (`findUnsafeTextChar`);
    - they assert that no unsafe character reaches the text.

**Impact:**
- **A wrong text alternative would pass.** The text alternative is the figure for a screen-reader user (prd/CC-002). A refactor that rounds a point at 0.375 to 0.38, or a 0.125 spacing to 0.13, would state a different figure from the one drawn and still pass CI.
- **Wrong refusals would go unnoticed.** The hostile-text test would not catch a refusal for the wrong reason.

**Recommendation:**
- **Pin "as written".** Use values the rounding changes and state them whole: a point at 0.375, and a range of −0.125..1.875 by 0.125. Keep the default-spacing case.
- **Follow the other types' loop:**
  - run `[...BENIGN_TEXT, ...HOSTILE_TEXT, SMUGGLED_TEXT]`;
  - require `findUnsafeTextChar(text) !== -1` for a refusal;
  - require `findUnsafeTextChar(stated) === -1`;
  - assert each of the four caller texts is quoted.

**Status:** Fixed
**Resolution:** Approved: the text alternative is pinned with -0.125..1.875 by 0.125 and a point at 0.375, stated whole; the caller-text test follows the sibling types (BENIGN, HOSTILE and SMUGGLED text, refusal only for an unsafe character, nothing unsafe in the text, all four caller texts quoted). Mutants stating points or a given spacing as derived fail. Recorded in the delivery record's Post-Review Amendments (2026-10-23).

---

### QR-004: The off-tick issue's advice is wrong for a label off the range, and gives no spacing when the caller left it to the default

**Category:** Error Handling
**Severity:** Concern
**Location:** `src/core/definitions/number-line.ts:181-195` (`tickLabelsOnTicks`; its params `{ term, got }` at `:190`); `src/core/issues.ts:150` (the params), `:371-372` (the message)
**Description:**
- The number line is the first type to report `tick_label_not_on_tick`. Its message is always "… is at V, which is not a tick position; use a value that is a multiple of the tick spacing."
- Probes:
  - **0..10 by 1, label at 20:** the message asks for a multiple of the spacing, and 20 already is one. The actual fault is that 20 lies off the range, which the message never mentions.
  - **1..10 by 3, label at 0:** the same. 0 is a multiple of 3, but it lies off the range.
  - **−10..10 with no spacing given, label at 3:** the caller never chose a spacing. The default is 2, and the message does not say so.
- A point off the range gets `outside_axis_range`, which names the range and says "move it inside the range or widen the axis".

**Impact:**
- **Unhelpful advice to a model.** GSV-REQ-031 asks each message to say what would make the value acceptable.
  - In the first two cases, a model calling the tool already meets the advice, so the obvious retry fails the same way.
  - In the third, it has no number to act on.
- **A likely first attempt.** Labelling every integer on a default −10..10 line is a plausible first try.

**Recommendation:**
- **Give the check what the caller needs.** Either:
  - add the axis's spacing and range to the issue's params, so the message can say, for example, "the ticks are every 2 from -10 to 10; use one of them, or set axis.tickSpacing"; or
  - report a label off the range as `outside_axis_range` with the range, as points are, and keep `tick_label_not_on_tick`, with the spacing, for labels inside the range. The code's description at `src/core/issues.ts:73` would then name custom labels too.
- **Mind the scope.** Both options touch the shared `src/core/issues.ts` and the published issue shape. Both are additive.
- **Test it.** Add a test of each message.

**Status:** Fixed
**Resolution:** Approved: fixed by code review CR-004 in `8a63429`; the message states the spacing drawn and the axis range, asserted in `tests/core/number-line.test.ts`. Recorded in the delivery record's Post-Review Amendments (2026-10-23).

---

### QR-005: `measure` is the fifth copy of wrap-then-measure in the layouts

**Category:** DRY
**Severity:** Suggestion
**Location:** `src/layout/number-line.ts:48-55`. The same steps appear at:
- `src/layout/circle.ts:33-39`, also named `measure`;
- `src/layout/ruler.ts:98-102`;
- `src/layout/line-graph.ts:82-85`;
- `src/layout/bar-graph.ts:81-85` (`widestOf`, the widest line only).

**Description:**
- Each copy wraps a caller's text, finds the widest line with a loop, and multiplies the line count by `fontSize × LINE_HEIGHT`.
- The loop is there for a security reason: "never spread a caller-sized array into arguments". Three of the copies repeat that reason as a comment.
- The number line's copy is the general form, taking the width, font size and line limit as parameters, but it is private.

**Impact:**
- **The rule depends on each author.** The loop exists for GSS TICKET-002 SEC-001, and every new layout re-derives it. A layout that forgets writes `Math.max(...lines.map(…))`.
- **More copies are coming.** The x,y and x,y,z graphs (TICKET-003, TICKET-004) will need the same block.

**Recommendation:**
- **Move `measure` into the kit**, beside `textLines` in `src/layout/kit/title.ts`, for example as `textBlock(text, maxWidth, fontSize, maxLines)`.
- **Use it here**, and in TICKET-003 and TICKET-004.
- **Leave the older copies** until a ticket touches them.

**Status:** Fixed
**Resolution:** Approved: `textBlock(text, maxWidth, fontSize, maxLines)` added to `src/layout/kit/title.ts` and used by the number line in place of its private `measure`; older copies left until a ticket touches them. Known Hazard appended to NLC TICKET-003 and TICKET-004. Recorded in the delivery record's Post-Review Amendments (2026-10-23).

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Approve | Approved: fixed by code review CR-002 in `8a63429` (cut again on the span drawn; the 24-unit floor kept and documented in the `text` description and the layout's doc comment). Added a test with three adjacent long custom labels on 0..4 by 1, clear of one another. | tests/layout/number-line.test.ts |
| QR-002 | Approve | Approved: tests now check each arrowhead's tip points outward on the line and its base meets an extension from the range's end; a custom label on a 0..99-by-1 line is cut to `TICK_LABEL_MIN_WIDTH` on one line; long custom labels at `min` and `max` stay inside the drawing. `LABEL_ROWS` is no longer exported. Mutants (inward head, base on the wrong side, no extension, no floor, numeric-only end room) each fail a test. | tests/layout/number-line.test.ts, src/layout/number-line.ts |
| QR-003 | Approve | Approved: the text alternative is pinned with -0.125..1.875 by 0.125 and a point at 0.375, stated whole; the caller-text test follows the sibling types (BENIGN, HOSTILE and SMUGGLED text, refusal only for an unsafe character, nothing unsafe in the text, all four caller texts quoted). Mutants stating points or a given spacing as derived fail. | tests/core/number-line.test.ts |
| QR-004 | Approve | Approved: fixed by code review CR-004 in `8a63429`; the message states the spacing drawn and the axis range, asserted in `tests/core/number-line.test.ts`. | — (8a63429) |
| QR-005 | Approve | Approved: `textBlock(text, maxWidth, fontSize, maxLines)` added to `src/layout/kit/title.ts` and used by the number line in place of its private `measure`; older copies left until a ticket touches them. Known Hazard appended to NLC TICKET-003 and TICKET-004. | src/layout/kit/title.ts, src/layout/number-line.ts, tickets TICKET-003.md, TICKET-004.md |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0
**Notes:**
- All five findings were fixed in resolution with the Engineer (Thomas Eaves), 2026-10-23. QR-001 and QR-004 were fixed by code review CR-002 and CR-004 (`8a63429`), with QR-001's extra test added here.
- Every command of the Verification Run exits 0 after the fixes (1,456 tests, three runs).
