# TICKET-003: Bar graph — Quality Review

## Summary

I reviewed the bar graph at HEAD (`01a35a5`): delivery commit `1fd9f5e` plus the code-review fixes for CR-001 to CR-005. The type follows the shape the line graph and the pictograph set: a side-effect-free definition, a layout that calls its own `describe`, a one-line component and an entry, each registered beside the others. Lint, typecheck, the full suite (41 files, 1,089 tests), build, the dist check and the bench all pass. The validation side is tight, and the size of value labels at the limits is now measured, pinned and recorded.

The findings are mostly about what the tests leave unpinned, and about where the horizontal layout meets the kit:
- **"Never cut" is unpinned.** A value label cut to its first line, or to two lines ending in "…", passes every test. In crowded columns 5e-324 would then be drawn as "0.00000000".
- **A given negative minimum is tested only for upright bars without value labels.** Horizontal bars drawn from the axis instead of the zero line pass the suite. On a scale from −5 to 10, the bar for 10 would then end where the axis reads 5.
- **The domain checks' inputs are unpinned**, so a knock-on issue or a hidden one would pass.
- **Smaller points:**
  - test slack and literals;
  - the horizontal layout re-placing the kit's slots and keeping axis geometry to itself;
  - three small copies of line-graph code;
  - two unexplained steps in `drawHorizontal`.

There are 7 findings: 0 Critical, 2 Concerns and 5 Suggestions. The verdict below is provisional, written at the end of the findings phase.

**Reviewer:** `quality-reviewer` agent, fresh context (findings phase only, 2026-10-19)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/data-graphs-and-pictographs-ticket-003-delivery.md` (DEL-001..005, Post-Review Amendments CR-001..005)
**Code review read first:** `.gener8v/changes/graph-library/reviews/data-graphs-and-pictographs-ticket-003-code-review.md` (Approved, all five resolved). None of its findings is raised again:
- QR-001 is the other side of CR-001. CR-001 pinned how large value labels may get; nothing pins that they stay whole.
- QR-002 is not CR-004's crowding. It is about given scales, which no property test generates.
- The surviving mutations below are outside the delivery record's 16 and the code review's probes.

The earlier quality reviews in this change set the patterns used here:
- QR-001 and QR-002 apply DGP TICKET-002 QR-001 and TICKET-005 QR-001: pin placement against what it is read by.
- QR-003 applies DGP TICKET-002 QR-005: no knock-on issues, AD-004.
- QR-004 applies DGP TICKET-002 QR-006: no literals restating constants; the bottom bounded by the margin.
- QR-005 applies DGP TICKET-005 QR-006 and TICKET-002 QR-003/QR-004: slots placed once, by the kit; no placeholder boxes; kit geometry tested in the kit.
- QR-006 applies DGP TICKET-002 QR-006's shared test fixture.

Accepted decisions are not raised again:
- crowded names and labels may touch (DEL-001);
- the line graph's `MARKER_REACH` edge (DEL-001, accepted by the code review);
- the `toContain` in the tiny-span test (recorded by the code review).

**Files Reviewed:**
- `src/core/definitions/bar-graph.ts`
- `src/core/definitions/categories.ts` (`ORIENTATION_DESCRIPTION`), `src/core/definitions/pictograph.ts` (its `orientation` description), `src/core/definitions/index.ts`
- `src/core/value-scale.ts` (`ScaleOptions.intervals`, DEL-004)
- `src/layout/bar-graph.ts`
- `src/layout/kit/value-scale.ts` (`rotatedNameLines`, `drawLeftAxisLabel`, `drawBottomAxisLabel`; DEL-001, DEL-002)
- `src/layout/line-graph.ts` (the `MARKER_REACH` plot edge and the renamed helpers)
- `src/layout/registry.ts`, `src/react/graphs/BarGraphGraph.tsx`, `src/entries/bar-graph.ts`, `src/index.ts`
- `package.json`, `tsup.config.ts`, `.size-limit.json`
- `examples/bar-graph.json`, `examples/invalid/bar-graph-negative.json`, `examples/invalid/bar-graph-scale-above-zero.json`
- `tests/core/bar-graph.test.ts`, `tests/layout/bar-graph.test.ts`
- `tests/layout/kit/value-scale.test.ts`, `tests/layout/line-graph.test.ts`, `tests/layout/pictograph.test.ts` (the additions)
- `tests/react/Graph.test.tsx`, `tests/package/per-type-bundle.test.ts` (the bar-graph cases)
- Read for pattern consistency, unchanged here:
  - `src/layout/pictograph.ts`, `src/layout/circle.ts`;
  - `src/layout/kit/title.ts`, `text.ts`, `labels.ts`;
  - `src/core/definitions/line-graph.ts`, `src/core/style.ts`, `src/core/validate/index.ts`;
  - `tests/fixtures/scene-geometry.ts`, `tests/core/categories.test.ts`, `vitest.config.ts`.

**Findings:** 7
**Critical:** 0 | **Concerns:** 2 | **Suggestions:** 5

## Quality Assessment

### Code Organization

**Rating:** Adequate
**Notes:**
- **The type follows the established shape.**
  - The definition is built by a `/* @__NO_SIDE_EFFECTS__ */` factory under `/* @__PURE__ */`, as the line graph's and the pictograph's are.
  - The layout calls the bar graph's own `describe`. The component is one `createGraphComponent` line, and the entry exports it with its prop types.
  - Both frozen registries list it.
  - The bundle tests prove AD-001 in both directions: the bar graph's entry and component carry no other type, and no other type's entry carries the bar graph.
- **What went where is sound.**
  - `ORIENTATION_DESCRIPTION` sits beside `VALUES_DESCRIPTION` in `categories.ts`, where the shared data-graph pieces live.
  - `ScaleOptions.intervals` sits in core beside the rule it changes, documented as layout-only.
  - The DEL-002 rename names the axis-label helpers by where they are drawn, which is how both orientations use them.
  - The kit's crowded-name clamp (`rotatedNameLines`) is three lines with a comment that cites DEL-001.
- **Dependency direction is right.** The layout imports core and the kit. Core imports nothing from layout. `fmt()` wraps every emitted number, and lint enforces it.
- **Performance.** Nothing to flag.
  - The bench gives a bar-graph p95 of 0.0396 ms, against a limit of 5 ms.
  - At the limits (100 categories, 200-character names, every value 5e-324, `showValues`), `createGraph` takes a median 11.8 ms upright and 12.9 ms across over 20 runs, probed.
  - Value labels are wrapped twice across, and `horizontalScale` resolves the scale at most ten times. Both costs are linear in the values and immaterial.
- **Weak spots:**
  - The horizontal layout re-places the kit's slots, reads a position off a placeholder box, and keeps the horizontal axis's tick-label geometry to itself (QR-005).
  - Three pieces the line graph already has are copied, not shared: the category-axis line, the axis-label sentences, and the tests' axis readers (QR-006).
  - Not this delivery's lines, but now stale: `tests/core/categories.test.ts:26-28` still says the real line graph, bar graph and pictograph "arrive in DGP TICKET-002, TICKET-003 and TICKET-005". This delivery is the last of the three.

### Readability

**Rating:** Adequate
**Notes:**
- **Names say what things are:** `barColorOf`, `barLength`, `valueLabelLines`, `horizontalScale`, `tickLabelsFit`, `tickLabelOverhang`, `MIN_ROWS_HEIGHT`, `VALUE_LABEL_GAP`, `MAX_BAR_THICKNESS`.
- **The doc comments explain why** and cite the decision behind each rule (DEL-001, DEL-004, CR-001, DGP-REQ-022), in the codebase's style.
- **`barGraphLayout` is 13 lines**, and `drawVertical` (52 lines) reads top to bottom in drawing order:
  - scale and left margin;
  - value labels and headroom;
  - axes;
  - bars and labels;
  - names;
  - category-axis label.
- **`drawHorizontal` is 70 lines** and has to measure in an order its code does not explain (QR-007):
  - the category-axis label is wrapped at one width to reserve room and at another to draw it;
  - value labels are wrapped twice;
  - the scale loop's condition carries a test that never changes.
- **Unexplained literals:**
  - `Math.max(MIN_VALUE_LABEL_WIDTH, slotWidth - 2)` (`src/layout/bar-graph.ts:153`) does not say what the 2 is;
  - the test's precondition copies it as `26` (QR-004).
- **Both draw functions append to the caller's `nodes` and return a y their docs do not mention.** The kit's `titleBlock` and the line graph's `drawLegend` return `{ nodes, height }` (QR-007).

### Error Handling

**Rating:** Adequate
**Notes:**
- **Description problems are reported, never thrown.** Each is a typed issue at a JSON Pointer:
  - a negative value is a stage-2 `out_of_range /values/<i>`;
  - a given minimum above zero is `out_of_range /valueScale/minimum` with `range: { max: 0 }`;
  - a top-level `color` is `inapplicable_property`, with "give it on each category, or use barColor for every bar instead";
  - a length mismatch is `series_length_mismatch`, and there is no knock-on issue when the categories are empty (DGP TICKET-002 QR-005).
- **The layout assumes a validated description, as the other layouts do.**
  - `fmt()` throws on a non-finite number, so a package defect becomes `internal_error` rather than bad markup.
  - `horizontalScale` only ever asks for fewer intervals than the validator's default. It cannot produce a scale with more ticks than the one the validator passed, so `valueTicks` cannot throw on it.
- **The minimum issue states the bound but not the reason** ("valueScale.minimum must be a number at most 0; got 5."). `out_of_range` messages are generic across the codebase, so this is consistent and is not a finding.
- **Gap:** the two domain checks' inputs are what keep AD-004's no-cascade rule, and neither is pinned by a test (QR-003).

### Test Coverage

**Rating:** Adequate
**Notes:**

**Commands run at HEAD (`01a35a5`), from the repository root:**

| Command | Exit | Result |
|---|---|---|
| `pnpm lint` | 0 | `eslint .`, no output |
| `pnpm typecheck` | 0 | `tsc --noEmit`, no output |
| `pnpm test` | 0 | 41 files, 1,089 tests passed (19.46 s) |
| `pnpm build` | 0 | tsup ESM and DTS, including `dist/bar-graph.js` and `dist/bar-graph.d.ts` |
| `pnpm check:dist` | 0 | "Built files scanned: 14, no network APIs or network modules." |
| `pnpm bench` | 0 | GSV-NFR-001: bar-graph p95 0.0396 ms over 8,737 runs, line-graph 0.0715 ms over 5,430; limit 5 ms |

- `pnpm test`'s global setup and `pnpm build` rewrote the gitignored `dist/`, as expected.
- `pnpm test` and `pnpm bench` also updated Vitest's own results cache under `node_modules/.vite/vitest/`, as they always do. The mutation runs below did not: the file's timestamp did not change across them.
- Some commands were not run:
  - `pnpm size` writes to the system temp directory;
  - `pnpm generate` writes source;
  - `publint`, `attw`, `check:deps` and `audit` were re-run by the code review at the fixes.
- `git status --short` after every command and probe showed only the pre-existing change to `.gener8v/runs.jsonl`.

**What the tests cover well:**
- **Every acceptance criterion has a test whose name describes it and cites its requirement.**
  - The validation tests pin exact codes, paths and messages: the minimum issue whole, the `elementsHint` message, the inapplicable options, and the hostile and smuggled text fixtures.
- **Placement is checked against what it is read by:**
  - a property test (150 runs, both orientations) puts each bar's end level with its value on the drawn ticks;
  - upright bars are centred on their names;
  - the first horizontal row's name is level with its bar;
  - a zero value keeps the other slots where they were.
- **The text alternative is pinned word for word on the example.** After CR-003 it is also checked with values whose derived form differs.
- **Caller text is bounded and the limits are measured.** The half-megabyte test passes in both orientations. The at-limits test pins nodes, markup and height for both, with the figures in a comment and in the delivery record.
- **Crowded columns:** 50 and 100 categories for all three types, inside the drawing on both axes. The kit has its own test that moves the end name blocks inward.

**Gaps, measured by mutation:**
- **Harness.**
  - An inline `node --input-type=module -e` script, run with `CI=1`, drove Vitest through its Node API (`startVitest` from `vitest/node`).
  - A Vite `transform` plugin replaced strings in source or test modules, in memory only, and threw if a string was absent.
  - It ran with `config: false`, `cache: false`, no global setup, and Vite's cache directory pointed into the session scratchpad. Nothing was written: the scratchpad stayed empty of caches, Vitest's results cache kept its timestamp, and `git status` was unchanged.
  - **Files.** One batch ran nine files: `tests/layout/bar-graph.test.ts`, `tests/core/bar-graph.test.ts`, `tests/react/Graph.test.tsx`, `tests/layout/kit/value-scale.test.ts`, `tests/core/definitions.test.ts`, `tests/core/categories.test.ts`, `tests/graph.test.ts`, `tests/core/describe.test.ts` and `tests/core/schema-agreement.test.ts`.
  - **Baseline.** 239 tests, all passing.
- **QR-001.** A value label cut to one line, or to two lines with "…", passes every test (B1, B2).
- **QR-002.** With a given negative minimum, four mutations pass every test (B3, B4, B21, B22):
  - horizontal bars drawn from the axis;
  - no zero line across;
  - value labels placed from the axis, in either orientation.

  Horizontal labels at the top of their row pass as well (B23).
- **QR-003.** Changing either domain check's inputs passes every test (C2, C3).
- **QR-004.** Upright bars at half their slot (B8), and a Scene 1.9 units short of its bottom margin (B17), pass every test.
- **Candidate tests, checked.** Each candidate test was inserted in memory only. Each passes on the delivered code and fails under the mutations its finding names:
  - P1 catches B1 and B2;
  - P2 catches B3, B4, B21, B22 and B23;
  - P3 catches B8;
  - the core test catches C2 and C3;
  - a 0.02 bottom tolerance catches B17.

**Mutation results:**

| Mutation (in memory) | Result |
|---|---|
| B1: a value label keeps only its first line (`src/layout/bar-graph.ts:72`) | survives (QR-001) |
| B2: a value label is capped at two lines, ending in "…" (`:72`) | survives (QR-001) |
| B3: horizontal bars start at the axis, not the zero line (`:249`) | survives (QR-002). On −5..10 the bar for 10 ends where the axis reads 5 |
| B4: no zero line across horizontal bars (`:242`) | survives (QR-002) |
| B21: upright value labels placed from the axis, not the zero line (`:176`) | survives (QR-002). On −5..10 the label "10" sits 80 units low, inside its bar |
| B22: horizontal value labels placed from the axis (`:253`) | survives (QR-002) |
| B23: horizontal value labels at the top of their row, not level with the bar (`:254`) | survives (QR-002) |
| B8: upright bars at 0.5 of the slot, not `BAR_FILL` (`:168`) | survives (QR-004) |
| B17: the Scene 1.9 units short of its bottom margin (`:286`) | survives (QR-004); caught once the geometry check's slack is 0.02 |
| B9: value-label headroom without its gap (`:157`) | survives (minor: the tallest label reaches 4 units into the gap under the title) |
| B24: few horizontal rows not stretched to `MIN_ROWS_HEIGHT` (`:220`) | survives (minor: no test pins the rows' minimum) |
| B25, B26: the bottom axis label without its gap, in either orientation (`:190`, `:264`) | survive (minor, like DGP TICKET-002's L5) |
| C2: the minimum check also waits on `values/*` (`src/core/definitions/bar-graph.ts:56`) | survives (QR-003) |
| C3: the scale check no longer waits on `values/*` (`:40`) | survives (QR-003) |
| B5: horizontal labels a whole label-height above the row's centre (`:254`) | caught (geometry property, across) |
| B6: rows not grown for tall value labels (`:225`) | caught (geometry property) |
| B7: bar thickness from the first row, not the thinnest (`:244`) | caught (geometry property) |
| B10: upright labels centred on the slot's start (`:179`) | caught (geometry property) |
| B12: no fewer intervals for the short axis (`:134`) | caught (bar-end and geometry properties) |
| B13: no room for the last tick label's overhang (`:108`) | caught (geometry property) |
| B14: the free width ignores the bar (`:214`) | caught (geometry property) |

### Observability & Operability

**Rating:** Adequate
**Notes:**
- **This is a library, and the delivery adds no logging, which is right.** By design there is no runtime network and no telemetry (`.gener8v/context.md`), and nothing under `src/` logs.
- **Description problems are the operator's surface.** They come back as typed issues with JSON Pointers and messages a caller or a model can act on, and the top-level hint names `barColor`.
- **Package defects in the drawing throw and become `internal_error`,** the established design. Nothing in the delivery swallows a failure.
- **The worst-case figures are recorded where the next decisions need them.** Value labels at the limits (3,802 and 2,502 text nodes) are recorded in the delivery record and pinned in a test, for the pending Security Review and the Product Owner's caller-text decision. That is good operability for a library. That the labels stay whole is not pinned (QR-001).

## Findings

### QR-001: "Never cut" is unpinned: a value label cut to its first line, or to two lines ending in "…", passes the suite

**Category:** Testing
**Severity:** Concern
**Location:**
- Tests:
  - `tests/layout/bar-graph.test.ts:175-190` ("writes each value exactly as supplied…"). `tail` keeps only numeric lines longer than four characters, and `:184` asserts `toContain("0.000123456789".slice(0, 8))`;
  - `tests/react/Graph.test.tsx:395` (the at-limits test): upper bounds on nodes, markup and height only.
- Code: `src/layout/bar-graph.ts:69-73` (`valueLabelLines`).
- Rule: DEL-005 and the CR-001 amendment in the delivery record ("never rounded or cut"; "no digit cut"); the DGP Scale and Layout rule ("show the value as supplied, without rounding").

**Description:**
- **The rule.** A value label states the supplied value with every digit. A long one wraps, and DEL-005 says it is never cut: 5e-324 is 326 characters, 37 lines at 72 units. The CR-001 resolution made labels wrap wider, and kept that rule.
- **What the tests pin.**
  - The test named for the rule checks only the first eight characters of the joined lines.
  - The at-limits test bounds the drawing from above, so a smaller drawing always passes it.
- **Two cuts pass all 239 tests** in the nine files that validate, draw or render a bar graph:
  - B1: each label keeps only its first line;
  - B2: each label is capped at two lines, ending in "…".
- **What they would draw.**
  - In crowded upright columns, where labels wrap to 72 units, 5e-324 would read "0.00000000", which is zero.
  - 1234567.0000001 would read "1234567.00".

**Impact:**
- **The likely next change is a cap.** The pending Security Review and the Product Owner's caller-text decision will weigh exactly these labels' size, which CR-001 recorded for them. The suite would accept a cap that misstates the values it draws.
- **Correctness is the main risk.** `.gener8v/context.md` names mathematical correctness as the main correctness risk. A drawn value that differs from the supplied one is that risk.

**Recommendation:**
- **Add a test that a long value is drawn whole.** In `tests/layout/bar-graph.test.ts`, in both orientations, use a value whose written form takes several lines. 5e-324 is the longest. Assert that the drawn text, joined, contains the whole written value. For example:
  `expect(texts(scene).join("")).toContain(displayValue(5e-324, "supplied"))`

  Held in memory, this passes on the delivered layout and fails under B1 and B2.
- **Tighten `:184`.** Assert the whole value, and drop the `length > 4` filter or say why it is there.
- **Optionally widen the at-limits test.** Give it a lower bound, or assert that each label's lines join to its value. It then pins "never cut" as well as "bounded".

**Status:** Resolved
**Resolution:** Resolved — a test in `tests/layout/bar-graph.test.ts` writes 5e-324 in full (326 characters), with 3 and with 100 categories, in both orientations. It checks that the drawn label lines join back to the whole value and that none ends in "…". Cutting a label to one line, or capping it at two, now fails the test. Approved by the user, 2026-10-19.
**Resolution:** —

---

### QR-002: A given negative minimum is tested only for upright bars without value labels: horizontal bars drawn from the axis instead of the zero line, a missing zero line, and value labels placed from the axis all pass

**Category:** Testing
**Severity:** Concern
**Location:**
- Tests:
  - `tests/layout/bar-graph.test.ts:77-85`, the only layout test with a minimum below zero: upright, without `showValues`;
  - `:87-108` and `:221-237`: neither property test generates a `valueScale`;
  - `:175-190`: horizontal value labels are checked only for lying right of the bar;
  - `tests/core/bar-graph.test.ts:107-119`, which accepts a minimum of −5.
- Code in `src/layout/bar-graph.ts`:
  - upright: the zero line at `:165-166`, the label top at `:176`;
  - across: the zero line at `:241-242`, the bar start at `:249`, the label's left and top at `:253-254`.
- Pattern: DGP TICKET-002 QR-001, which pinned points against the ticks and names that read them.

**Description:**
- **The case.** A minimum at or below zero is valid, and the definition's own test accepts −5. Bars then start at the zero line inside the plot (`zero`), not at the axis, and a zero line is drawn across the plot.
- **What reaches it.** One layout test, upright, without value labels. Both property tests use default scales, which always start at 0, so `zero` is the axis's end in every generated case.
- **These mutations pass all 239 tests:**
  - **B3:** horizontal bars start at the axis. Probed on a scale from −5 to 10: the axis runs from x 116 to 365.32, with zero at 199.11. The bar for 10 would end at x 282.21, where the axis reads 5, and every bar would read 5 less than its value.
  - **B4:** the horizontal zero line is not drawn.
  - **B21:** upright value labels are placed from the axis, not the zero line. On −5..10 the label "10" would sit 80 units low, inside its bar.
  - **B22:** horizontal value labels are placed from the axis, and overlap their bars.
  - **B23:** horizontal value labels sit at the top of their row, not level with their bar, on any scale. Horizontal labels are pinned on one axis only.
- **The delivered layout is right.** In the probe, every bar starts at the 0 tick in both orientations, and each label sits beside its bar's end.

**Impact:**
- A bar graph is read by where each bar ends against the axis. A regression in the across drawing with a negative minimum would misstate every value in it, and CI would stay green.
- The upright twin was caught during delivery only after a scale-from-−5 case was added (the record's mutation checks). The across drawing has no such case.

**Recommendation:**
- **Add the −5..10 case in both orientations, with `showValues`.** In `tests/layout/bar-graph.test.ts`, assert:
  - each bar starts at the tick labeled 0;
  - a zero line crosses the plot;
  - the label "10" sits just above its bar's end (upright) or just right of it (across);
  - across, the label is level with the bar.

  Held in memory, these assertions pass on the delivered layout and fail under each of B3, B4, B21, B22 and B23.
- **Let both property tests draw given scales too.** Add an optional `valueScale`, with a minimum from −1e9 to 0 and a maximum at or above the largest value. The existing bar-end check, read off the drawn ticks, then covers the zero line in both orientations.

**Status:** Resolved
**Resolution:** Resolved — a −5..10 scale with value labels, in both orientations. The test checks that each bar starts at the zero line and ends at its value on the drawn axis, that the zero line spans the plot, that each label lies beyond its bar's end (level with a horizontal bar), and that the zero bar's "0" sits at the zero line. All five breaks the reviewer named now fail it. Approved by the user, 2026-10-19.
**Resolution:** —

---

### QR-003: The domain checks' inputs are unpinned: without `values/*` the scale check adds a "(null)" issue, and with it the minimum check hides a real one

**Category:** Error Handling
**Severity:** Suggestion
**Location:**
- `src/core/definitions/bar-graph.ts:40`: the inputs of `valueScaleCheck`;
- `src/core/definitions/bar-graph.ts:56`: the inputs of `scaleStartsAtZeroCheck`;
- `tests/core/bar-graph.test.ts:93-140`: the issue tests;
- AD-004 in `.gener8v/technical-design/system-design.md`.
- Pattern: DGP TICKET-002 QR-005.

**Description:**
- **How the staged validator avoids cascades.** It skips a check when one of the inputs the check names has failed. So no issue follows from another, and independent problems are each reported (AD-004).
- **The code is right.** Probed with `validateWith`: values 12, −3, 9 with a scale from 5 to 15 give `out_of_range /values/1` and `out_of_range /valueScale/minimum`, and nothing else.
- **What no test does.** No test gives a negative value and a given scale together, so both checks' inputs can change unnoticed:
  - **C3:** with `values/*` dropped from the scale check's inputs, the same description also gets `scale_excludes_value /values/1`: "values[1] (null) is outside the value scale, from 5 to 15; widen the scale or leave the scale out." It passes all 239 tests.
  - **C2:** with `values/*` added to the minimum check's inputs, the minimum above zero is not reported until the value is fixed. It passes too.

**Impact:** Small. A model fixing the reported issues would chase a phantom "(null)" value, or would learn of the minimum only on a second attempt.

**Recommendation:** Add one test to `tests/core/bar-graph.test.ts`:
- `values: [12, -3, 9]` with `valueScale: { minimum: 5, maximum: 15 }`;
- it should report exactly `["out_of_range /values/1", "out_of_range /valueScale/minimum"]`.

Held in memory, this passes on the delivered definition and fails under both C2 and C3.

**Status:** Resolved
**Resolution:** Resolved — a core test pins both checks' inputs. A bad value gives no phantom scale issue, and a negative value never hides the minimum-above-zero issue. Changing either check's inputs fails it. Approved by the user, 2026-10-19.
**Resolution:** —

---

### QR-004: Test code restates private constants, keeps slack it does not need, and names more than it checks

**Category:** Testing
**Severity:** Suggestion
**Location:** In `tests/layout/bar-graph.test.ts`:
- `:203`: `b.y1 > scene.height - SCENE_MARGIN + 2`, in `geometryProblems`;
- `:247`: the precondition `slot >= 26`;
- `:115-122`: "keeps every bar the same thickness, `BAR_FILL` of its slot up to `MAX_BAR_THICKNESS`";
- `:159-160`: the comment and the assertion of the row-size test.
- Pattern: DGP TICKET-002 QR-006 (literals restating constants) and QR-001 (bottom bounded by the margin).

**Description:**
- **Two units of slack.**
  - The geometry check lets anything reach 2 units into the bottom margin, but the delivered layout passes with the line graph's 0.02.
  - With `+ 2`, a Scene 1.9 units short of its margin (B17) passes all 239 tests. With 0.02 it fails both property tests.
- **`26` is `MIN_VALUE_LABEL_WIDTH + 2`.** That is `src/layout/bar-graph.ts:49` and the `- 2` at `:153`, and both are private. If either changes, the precondition filters the wrong band of slot widths. A wider minimum gives spurious overlap failures; a narrower one silently loses coverage.
- **The thickness test checks less than its name says.** It asserts only that thicknesses are equal and at most 48.
  - Upright, three categories hit the 48 cap, so `BAR_FILL` is never reached.
  - Across, it is reached but not checked.
  - B8, upright bars at 0.5 of their slot, passes all 239 tests.
- **A comment that does not match its assertion.** At `:159` it says "Walk's and Car's centers are less than three long rows apart". The assertion compares the two names' tops against the long name's block plus 120.

**Impact:** Small. The tests pass for the right reasons today. But they leave room for regressions they appear to cover, and they copy values that can drift.

**Recommendation:**
- Use `+ 0.02` at `:203`.
- Export `MIN_VALUE_LABEL_WIDTH` beside `BAR_FILL` and `MAX_BAR_THICKNESS`, or read the label width the layout used from the Scene. Derive the precondition from it, and name the 2 in the layout.
- Assert thickness = `min(MAX_BAR_THICKNESS, BAR_FILL × slot)`, with enough categories for `BAR_FILL` to apply in both orientations. Held in memory, an eight-category upright case fails under B8.
- Make `:159`'s comment and assertion say the same thing.

**Status:** Resolved
**Resolution:** Resolved — test tidying:
  - the geometry check allows only rounding (0.02) into the bottom margin;
  - `MIN_VALUE_LABEL_WIDTH` is exported and used;
  - the thickness test checks `BAR_FILL` against the spacing between bars, in both orientations;
  - the row-size comment says what its assertions check, with a second assertion added.

  A margin 1.9 units short, and bars at half their slot, now fail. Approved by the user, 2026-10-19.
**Resolution:** —

---

### QR-005: The horizontal layout works around the kit: it re-places the kit's slots, reads the zero position off a placeholder box, and keeps the horizontal axis's tick-label geometry to itself

**Category:** Patterns
**Severity:** Suggestion
**Location:**
- `src/layout/bar-graph.ts:219-233`:
  - `categorySlots` sizes each row by its name;
  - `rows` grows them for value labels;
  - `placed` recomputes `start`, `end` and `center` by spreading over the kit's slots.
- `src/layout/kit/value-scale.ts:178` and `:210-217`: `slotSize` receives the name's height only.
- `src/layout/bar-graph.ts:212`: `valuePosition(scale, "horizontal", { x: left, y: 0, width, height: 1 })`, computed again from the real box at `:241`.
- Tick-label geometry:
  - `src/layout/bar-graph.ts:104-123`: `tickLabelOverhang`, `TICK_LABEL_GAP` and `tickLabelsFit`;
  - compare `src/layout/kit/value-scale.ts:49-55` (`valueAxisExtent`) and `:110-112`, where `drawValueAxis` centres the horizontal tick labels.
- `src/layout/bar-graph.ts:134`: `intervals = 9`, one fewer than core's private `DEFAULT_INTERVALS` (`src/core/value-scale.ts:20`).
- Precedents:
  - DGP TICKET-005 QR-006: slots placed once, by the kit, which gained `slotSize` for this;
  - DGP TICKET-002 QR-004: no placeholder boxes;
  - DGP TICKET-002 QR-003: kit geometry tested in the kit.

**Description:**
- **The rows are placed twice.**
  - The kit places the slots one after another from the box's top. The bar graph then grows some of them for tall value labels and places them all again with the same accumulation.
  - The rule "each slot follows the last" now lives in two places. The slots drawn are not the ones the kit returned.
  - It happens because `slotSize` cannot see which category it is sizing.
- **A placeholder box.** Before the box exists, the zero position is read off a box whose `y` and `height` are made up. The same value is then computed again from the real box.
- **The tick-label geometry lives in the layout.**
  - The overhang past the axis's end and the fit between neighbouring labels both assume something the kit decides in `drawValueAxis`: that horizontal tick labels are centred on their ticks, at the tick-label size.
  - The kit keeps the analogous measure, `valueAxisExtent`, beside the drawing.
  - The two bar-graph functions are private, and only the property test exercises them.
- **The 9.** The loop starts one below core's default number of intervals. That default is private, so the coupling is invisible.

**Impact:** Each of these changes would reach the horizontal bar graph silently, with only the property test to notice:
- a change to the kit's slot placement;
- a change to how its horizontal tick labels are anchored;
- a change to core's default interval count.

**Recommendation:**
- **Size each row once, in the kit.** Let `slotSize` take the index: `(nameHeight: number, index: number) => number`. The horizontal layout then sizes each row in one place, with `Math.max(MIN_ROW, nameHeight + NAME_GAP, MIN_ROWS_HEIGHT / count, labels[index].length * lineHeight + NAME_GAP)`, and `rows` and `placed` go.
- **Drop the placeholder box.** Compute the zero position from the axis's start and length, for example `linearScale([scale.minimum, scale.maximum], [left, left + width])(0)`. Or give the kit a position helper that takes an axis's start and length rather than a `Box`.
- **Move the tick-label geometry into the kit.** Put `tickLabelOverhang` and `tickLabelsFit` in `src/layout/kit/value-scale.ts` beside `valueAxisExtent`, with tests in `tests/layout/kit/value-scale.test.ts`.
- **Name the 9.** Export the default interval count from `src/core/value-scale.ts` and start the loop one below it.

**Status:** Resolved
**Resolution:** Resolved — the horizontal layout now uses the kit rather than working around it:
  - `categorySlots`' `slotSize` receives the slot's index, so value labels size their rows in one pass;
  - the kit gains `offsetAlong` (no placeholder box), `tickLabelOverhang`, `tickLabelsFit` and `fitHorizontalValueAxis`;
  - core exports `DEFAULT_VALUE_INTERVALS`, used in place of the literal 9.

  Approved by the user, 2026-10-19.
**Resolution:** —

---

### QR-006: Three pieces the line graph already has are copied, not shared: the category-axis line, the axis-label sentences, and the tests' axis readers

**Category:** DRY
**Severity:** Suggestion
**Location:**
- The axis line:
  - `src/layout/bar-graph.ts:92-102` (`axisLine`);
  - `src/layout/line-graph.ts:161-171` (the category axis, written inline);
  - `src/layout/kit/value-scale.ts:64-74` (the kit's private `line`).
- The axis-label sentences: `src/core/definitions/bar-graph.ts:131-139` and `src/core/definitions/line-graph.ts:159-167`.
- The tests' axis readers:
  - `tests/layout/bar-graph.test.ts:29-47` (`valueAxis`, `ticks`) and `:94` (the property's `at`);
  - `tests/layout/line-graph.test.ts:258-276` (`tickLabelNodes`, `ticks`, `heightOf`).

  Both restate the kit's private baseline offset `fontSize * 0.35` (`src/layout/kit/value-scale.ts:109`).
- Pattern: DGP TICKET-002 QR-006 (the luminance helpers moved to `tests/fixtures/luminance.ts`).

**Description:**
- **The axis line.** There are three copies of the same axis-styled `line` node: `colors.line` at `lineWidths.axis`, every coordinate through `fmt()`. Two of them draw the same element, the category axis along the plot's edge.
- **The DGP-REQ-004 sentences.** "The category axis is labeled …" and "The value axis is labeled …" are produced by the same nine lines, word for word, in both definitions. Both types take the two labels from the same shared properties.
- **The tests' axis readers.**
  - The bar graph's `ticks` is an orientation-aware version of the line graph's, and its property's `at` is the line graph's `heightOf`.
  - Both encode where the kit puts a tick label's baseline.
  - The shared `tests/fixtures/scene-geometry.ts` exists so that such helpers are written once.

**Impact:** Small. Each of these changes must be made in two or three places, and a missed copy fails nowhere, or fails confusingly in one test file:
- a change to the axis style, such as adding a line cap;
- a change to the sentences' wording;
- a change to the tick-label baseline.

**Recommendation:**
- **The axis line.** Export one axis-line helper from the kit, or a `drawCategoryAxis(box, orientation)`, and use it in both layouts.
- **The sentences.** Move them into a helper beside `dataGraphProperties` in `src/core/definitions/categories.ts`, for example `axisLabelSentences(g)`, and use it in both definitions.
- **The tests.** Move an orientation-aware `ticks` and a `positionOf(scene, value)` into `tests/fixtures/scene-geometry.ts`, or a new value-axis fixture, and use them in both layout tests.

**Status:** Resolved
**Resolution:** Resolved — the copies are shared:
  - `drawAxisLine` (kit) draws the category axis and zero lines in the bar graph and the line graph;
  - `axisLabelSentences` (`categories.ts`) writes both types' axis-label sentences;
  - `valueAxisOf`, `tickLabelNodes`, `ticksOf` and `positionOf` (`tests/fixtures/scene-geometry.ts`) serve both types' tests, using the kit's exported `TICK_LABEL_DROP` in place of 0.35.

  Approved by the user, 2026-10-19.
**Resolution:** —

---

### QR-007: `drawHorizontal` does not explain the order it measures in: the category-axis label is wrapped at one width for room and drawn at another

**Category:** Readability
**Severity:** Suggestion
**Location:** In `src/layout/bar-graph.ts`:
- `:198-268`: `drawHorizontal`, 70 lines;
- `:200-202` and `:237`: `categoryLabelSample`, wrapped at `MIN_ROWS_HEIGHT`, and the drawn label, wrapped at `box.height`;
- `:205-216`: value labels wrapped at 72, then at the free width;
- `:131-139`: `horizontalScale`'s loop condition;
- `:143` and `:198`: the two draw functions' signatures and docs.

**Description:**
- **The category-axis label is wrapped twice.**
  - The layout needs the label's depth before it knows how tall the rows are. So it wraps the label at `MIN_ROWS_HEIGHT` to reserve room (`categoryLabelSample`), then wraps it again at the box's height to draw it. Nothing says why.
  - When the two differ, room is kept for a line that is never drawn. Probed with 30 categories and the label "The way each pupil travels to school on a normal school day": the label is drawn on one line while two lines' depth (33.6 units) is kept, so a 16.8-unit band beside the names stays empty.
- **The value labels are wrapped twice too:** once at 72 to reserve the right margin, and once at the free width. The second is explained (`:210-211`); the first is not, and `reserved` does not say what it reserves.
- **A loop condition with three jobs.** `horizontalScale`'s condition carries a test that never changes (`g.valueScale?.tickInterval === undefined`), beside the fit test and the counter.
- **Undocumented return values.**
  - Both draw functions append to the caller's `nodes` and return the y where the drawing ends. Neither doc says so.
  - The kit's `titleBlock` and the line graph's `drawLegend` return `{ nodes, height }` instead.

**Impact:** Small. `drawHorizontal` does eight things in order. Whoever changes one of them has to work out why the label is wrapped twice, and what the return value means.

**Recommendation:**
- **The label.** Wrap it once, at `MIN_ROWS_HEIGHT`, and draw those lines; they fit, since the box is at least that tall. Or keep both wraps and say why in a comment.
- **The reservation.** Name it for what it measures (for example `rightMarginLabels`), or say so in a comment.
- **The scale loop.** Return early from `horizontalScale` when a tick interval is given.
- **The draw functions.** Say in each doc that it appends to `nodes` and returns the y where the drawing ends. Or return `{ nodes, bottom }`, as the other helpers do.

**Status:** Resolved
**Resolution:** Resolved — horizontal bars are measured by `planHorizontal` (its doc comment gives the order: left edge, room and scale, labels, rows, then the category label) and drawn by `drawHorizontal`.
  - The plot is measured again until the category label's reserved depth matches its drawn lines, which removes the empty band. A test pins it at 30 categories, and skipping the re-measure fails it.
  - Value labels are wrapped once.
  - The tick-interval check is made once, outside the loop.
  - Both draw functions' docs say what they append and return.

  Approved by the user, 2026-10-19.
**Resolution:** —

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fix | Never-cut label test, both orientations, crowded and not | `tests/layout/bar-graph.test.ts` |
| QR-002 | Fix | −5..10 test with labels, both orientations | `tests/layout/bar-graph.test.ts` |
| QR-003 | Fix | Check-inputs test | `tests/core/bar-graph.test.ts` |
| QR-004 | Fix | Margin, label-width constant, `BAR_FILL`, comment | `tests/layout/bar-graph.test.ts`, `src/layout/bar-graph.ts` (`MIN_VALUE_LABEL_WIDTH` export) |
| QR-005 | Fix | Indexed `slotSize`; kit axis-fit helpers; `DEFAULT_VALUE_INTERVALS` | `src/layout/kit/value-scale.ts`, `src/core/value-scale.ts`, `src/layout/bar-graph.ts` |
| QR-006 | Fix | Shared axis line, axis sentences and test tick readers | `src/layout/kit/value-scale.ts`, `src/core/definitions/categories.ts`, `src/core/definitions/line-graph.ts`, `src/core/definitions/bar-graph.ts`, `src/layout/line-graph.ts`, `tests/fixtures/scene-geometry.ts`, both layout tests |
| QR-007 | Fix | Measure/draw split; no empty band; labels wrapped once | `src/layout/bar-graph.ts`, `tests/layout/bar-graph.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (all 7 Resolved)
**Notes:**
- All seven findings fixed and re-verified. `pnpm generate` (no change), `lint`, `typecheck`, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size` (`./bar-graph` 18.8 kB, `./line-graph` 18.74 kB), `publint`, `attw`, `audit` and `gener8v-state lint` exit 0. `pnpm test` (1,095 tests) exits 0 on three runs.
- Fifteen deliberate breaks, made against a passing baseline and restored from memory, now fail a test. Two of them (the horizontal zero line and the re-measure) did so only after their tests were tightened during resolution.
