# TICKET-001: Build the ruler mark rule and the graded-mark drawing kit — Quality Review

## Summary

I reviewed the ruler mark rule and the graded-mark drawing kit as they stand at HEAD (`ececce8`, after the code review was resolved; delivery `be97469`). The code is small and well documented, and it is organised like the axis tick rule it models on. Lint, typecheck and build pass, and the full suite passes on three runs. The two new test files passed 40 runs out of 40, and no property in them can fail on the delivered code: an exhaustive check of all 78 valid rulers passes, with a worst mark offset of 0.0062 units against a 0.5 tolerance. The findings concern what the next two tickets will build on:
- the core rule's six exported functions take three input styles, and sibling predicates put `length` and `divisions` in different argument positions, so a swapped call gives a wrong answer without any error (QR-001);
- the noise allowance can grow from 1e-9 to 0.39 of a mark and every test still passes. The property meant to cross-check the predicates restates `rulerMarkIndex`'s own body, over values that sit at 0 (QR-002);
- the properties sample a finite set of 78 rulers at random, number placement is tested on one side only, and tests pin numbers derived from the fixture's geometry (QR-003 to QR-005);
- naming, the rank cast, the guard, an explicit `fontSize: undefined`, and the extent TICKET-003 must recompute (QR-006 to QR-010).

There are 10 findings: 0 Critical, 2 Concerns and 8 Suggestions.

**Reviewer:** `quality-reviewer` agent, fresh context (findings phase only, 2026-10-20)
**Delivery Record:** `.gener8v/changes/rulers/delivery/number-lines-and-coordinate-graphs-ticket-001-delivery.md` (DEL-001 to DEL-003, and the Post-Review Amendments from the code review)
**Code review read first:** `.gener8v/changes/rulers/reviews/number-lines-and-coordinate-graphs-ticket-001-code-review.md` (Approved). Its CR-001 to CR-007 are not raised again.
- QR-001 builds on what CR-001 and CR-003 added: `null` refused, and `isOnRuler` and `rulerMarkIndex`. It is about how the resulting functions fit together, not about their results.
- QR-003 is not CR-006. CR-006 was about the two largest rulers, which now have a deterministic test.

**Files Reviewed:**
- `src/core/ruler.ts`
- `src/layout/kit/ruler.ts`
- `tests/core/ruler.test.ts`
- `tests/layout/kit/ruler.test.ts`
- Read for pattern consistency, unchanged here:
  - `src/core/value-scale.ts`, `src/core/style.ts`, `src/core/index.ts`, `src/core/validate/structure.ts` (`ordered`);
  - `src/layout/kit/axis.ts`, `scale.ts`, `format.ts`, `text.ts`, `value-scale.ts`, `check.ts`, `ticks.ts`, `labels.ts`, `isometric.ts`;
  - `tests/layout/kit/axis.test.ts`, `tests/fixtures/scene-geometry.ts`;
  - `vitest.config.ts`, `tests/setup/build.ts`, `tsconfig.json`, `package.json`.
- Read for what the consumers need:
  - `rulers/number-lines-and-coordinate-graphs/TICKET-001`, `TICKET-002` and `TICKET-003`, including the Known Hazards the code review added;
  - for calibration, the graph-library quality review of `number-lines-and-coordinate-graphs/TICKET-001`.

**Findings:** 10
**Critical:** 0 | **Concerns:** 2 | **Suggestions:** 8

## Quality Assessment

### Code Organization

**Rating:** Adequate
**Notes:**
- **One rule, one home (DEL-001).** The mark rule is in core and has no imports; the kit imports it. This mirrors `src/core/value-scale.ts` and `src/layout/kit/axis.ts`.
  - The kit imports core, `format`, `scale`, `text`, and `TICK_LABEL_DROP` from the data graphs' `src/layout/kit/value-scale.ts`.
  - The graph-library review noted that last cross-import for `drawAxis` and did not raise it. `tests/fixtures/scene-geometry.ts` does the same.
- **The split is right.** Mark lengths are in the kit and ranks are in core. Validation never needs a length.
- **The core module's surface grew during resolution.** Six exported functions now answer parts of one question, "is this end on a drawn mark?", and they take three input styles (QR-001). `rulerMarkRank` is exported, although only `rulerMarks` calls it (QR-007).
- **What TICKET-003 needs is not exported.** How far the marks and numbers reach is worked out inside `drawRulerMarks` from a private constant (QR-010). `src/layout/kit/value-scale.ts` exports the same facts for value axes.
- **Considered and not raised:**
  - **The local `line` builder.** This is the fourth copy, after `src/layout/kit/axis.ts:67`, `src/layout/kit/value-scale.ts:67` and `src/layout/circle.ts:88`. The codebase keeps one per module, and the calibration review left it.
  - **`drawRulerMarks`' size.** It is 46 lines with one loop.

### Readability

**Rating:** Adequate
**Notes:**
- **Doc comments.** They explain why, cite DEL and review IDs, and state the numbers: mark lengths, maximums and the width rule. `@spec` sits on the line after each JSDoc.
- **The arithmetic is direct.** Values are `index / divisions`, ranks come from `gcd`, and marks run along a unit normal toward the side.
- **Findings:**
  - `division` and `divisions` are one letter apart (QR-006);
  - the guard is one 235-character condition, the longest line of logic in `src` (QR-008);
  - the rank uses a nested ternary with the literals 10 and 5 beside the named constant, and a `Math.log2` cast (QR-007).
- **Minor points that are not findings:**
  - The `%s` in "lists nothing, and throws nothing, for a ruler no description gives: inches, 6, undefined" (`tests/core/ruler.test.ts:73`) prints the string `"6"` like the number 6, so the report lists a valid-looking ruler as invalid. `%j` would show the quotes.
  - `%ss` on "half" prints "ranks 0 to 1 in at halfs" (`tests/core/ruler.test.ts:97`).
  - `expect(0.1 + 0.2).not.toBe(0.3)` (`:134`) and `expect(0.3 - 0.1 - 0.2).toBeLessThan(0)` (`:169`) test JavaScript's arithmetic. Here they guard that each input really carries noise, which is a fair use.
  - `rulerMarks` casts `unit as RulerUnit` (`src/core/ruler.ts:94`). The cast is safe only because `divisionsPerUnit` has already refused unknown units earlier in the same `||`.

### Error Handling

**Rating:** Adequate
**Notes:**
- **The fail-closed pattern matches the axis.**
  - Core returns `undefined` and never throws (`divisionsPerUnit`, `rulerMarks`), as `drawableTicks` does.
  - The kit throws `RangeError` on options no validated ruler gives, as `drawAxis` does. `createGraphWith` turns the throw into the fixed `internal_error`.
- **`markLength` throws rather than drawing a mark with no length.** It can be reached only through QR-007's cast.
- **Optional options are read own-key.** `division` and `fontSize` are tested against a polluted prototype.
- **Gaps:**
  - the guard has one message, which names no option (QR-008);
  - a font size of 0.004 passes the guard and is drawn as `font-size` 0. CR-004 added a floor against the same rounding for mark widths (QR-008);
  - an explicit `fontSize: undefined` throws, while `division: undefined` means "absent" (QR-009);
  - `isRulerLength` reads `RULER_MAX_LENGTH[unit]` without the module's own `isOwnKey` (QR-001).

### Test Coverage

**Rating:** Adequate
**Notes:**

**Commands run at HEAD** (`.gener8v/context.md`'s verify commands, plus repeated runs of the new files):

| Command | Exit | Result |
|---|---|---|
| `pnpm lint` | 0 | `eslint .`, no output |
| `pnpm typecheck` | 0 | `tsc --noEmit`, no output |
| `pnpm build` | 0 | ESM and DTS build success |
| `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache` (three times) | 0, 0, 0 | 47 files and 1,260 tests passed (18.4 s, 18.1 s, 18.1 s) |
| `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache tests/core/ruler.test.ts tests/layout/kit/ruler.test.ts` (40 times) | 0 on all 40 | 75 passed on each run: 44 in `tests/core/ruler.test.ts` and 31 in `tests/layout/kit/ruler.test.ts`. No run failed, so there is no counterexample to report |

- **How the commands ran.**
  - `pnpm test` is `vitest run`. `--no-cache` keeps Vitest from writing its results cache.
  - `GRAPH_GENERATOR_PREBUILT=1` skips the global setup's second build after `pnpm build`.
  - `pnpm build` rewrites the gitignored `dist/`.
- **Not run.**
  - `pnpm generate` and `pnpm size`, as instructed.
  - `bench`, `check:*`, `publint`, `attw` and `audit` are not among `.gener8v/context.md`'s verify commands. The code review re-ran them when it was resolved.
- **How the probes ran.**
  - Probes ran in memory (`tsx -e`) from the repository root.
  - Each mutant is a copy of one source file in the session scratchpad. A scratch Vitest config swaps it in for the real module with `resolve.alias`, and the unmodified test files run against it.
  - Three control mutants show that the swap works: allowance 0.6 fails 6 tests, allowance 0.41 fails 3, and numbers on half marks fail 4.
  - No repository file was edited.

**What the tests cover well:**
- **The rule:**
  - mark counts, and values exactly `k / d`;
  - ranks pinned at every division;
  - the table of invalid rulers, `null` included;
  - computed noise (0.1 + 0.2);
  - the ends within noise (CR-003), and never −0.
- **The drawing:**
  - node order;
  - positions on three edges, by a property and for the two largest rulers;
  - marks perpendicular and on the side asked for, on a diagonal edge, on both sides;
  - graded lengths, and the numbers 0 to L only;
  - `fmt()` and `checkScene`;
  - the width rule and its floor;
  - the font size, read own-key;
  - twelve `RangeError` cases.
- **The test names** state behaviour and cite requirement and review IDs.

**Flakiness.** No property can fail on the delivered code:

| Property | Domain | Result |
|---|---|---|
| `tests/core/ruler.test.ts:101-115` (ranks) | 5 ruler kinds × lengths 1 to 30; `fc.pre` keeps the 78 valid rulers | All 78 pass in an exhaustive loop. Skip rate 0.415 over 2,000 replicated invocations (341,773 generated, 200,000 kept), far inside fast-check's 100 skips per run |
| `tests/layout/kit/ruler.test.ts:36-57` (positions, three edges) | the same 78 | All 78 × 3 pass; the worst foot offset is 0.0062 units against 0.5. Skip rate 0.405 |
| `tests/layout/kit/ruler.test.ts:138-147` (numbers) | the same 78 | All 78 pass |
| `tests/core/ruler.test.ts:191-196` (index agreement) | doubles from −2 to 32 | Cannot fail: it asserts the function's own body (QR-002) |

The risks are elsewhere:
- interesting cases are rarely drawn (QR-002);
- a finite domain is sampled at random (QR-003).

**Mutation results** (in memory, against the unmodified test files):

| Mutation | Result |
|---|---|
| `MARK_NOISE` = 0.39 | survives all 75 tests on three runs: QR-002 |
| `MARK_NOISE` = 0.01 | survives on three runs: QR-002 |
| `MARK_NOISE` = 0.41 | caught by 3 tests, all on 1.3 in at eighths |
| `rulerMarks` refuses 17 cm | red in 11 of 12 runs, each time by whichever properties drew 17 cm; never by the core property: QR-003 |
| `NUMBER_GAP` = 0 | survives on two runs; every number then overlaps its mark with side `left`: QR-004 |
| the number clearance's two extent terms swapped, or replaced by `fontSize / 2` | survives on two runs, but makes no visible difference with one- and two-digit numbers. Not raised |

### Observability & Operability

**Rating:** Adequate
**Notes:**
- **This is a library.** It has no runtime network, no telemetry and no logger in `src`. A pure rule and drawing kit should not log, and this one does not.
- **Failures surface as designed.** Core returns `undefined` to checks. The kit throws a `RangeError`, which becomes `internal_error`.
- **The kit's guard message is the same for all seven conditions (QR-008).** Someone debugging an `internal_error` cannot tell from it which option was wrong. `niceTicks` and `valueTicks` name the numbers they refuse, and `markLength`'s message names the rank.

## Findings

### QR-001: The core rule exports six functions with three input styles, and its sibling predicates put `length` and `divisions` in different positions, so a swapped call gives a wrong answer without any error

**Category:** Maintainability
**Severity:** Concern
**Location:**
- `src/core/ruler.ts`:
  - `:58` `divisionsPerUnit(unit: unknown, division?: unknown)`;
  - `:92` `rulerMarks(unit, length, division)`;
  - `:105-107` `isRulerLength(unit: RulerUnit, length: unknown)`;
  - `:117` `isRulerMark(value, divisions)`;
  - `:129` `isOnRuler(value, length, divisions)`;
  - `:142` `rulerMarkIndex(value, length, divisions)`;
  - `:154` `nearestRulerMarks(value, divisions)`.
- `.gener8v/changes/rulers/tickets/number-lines-and-coordinate-graphs/TICKET-002.md`: the Known Hazards carried from CR-001 and CR-003.
**Description:**
- **Three input styles in one module.**
  - `divisionsPerUnit` and `rulerMarks` take raw `unknown` values and return undefined for anything invalid.
  - `isRulerLength` takes a typed `RulerUnit` and reads `RULER_MAX_LENGTH[unit]` without the module's `isOwnKey` (`:49`). With `Object.prototype.feet = 100`, `isRulerLength("feet", 50)` is true (probe).
  - The four value predicates take bare numbers, and `divisions` must first come from `divisionsPerUnit`.
- **Argument positions differ between siblings.** The second argument is `divisions` in `isRulerMark` and `nearestRulerMarks`, and `length` in `isOnRuler` and `rulerMarkIndex`. Every argument is a `number`, so TypeScript cannot catch a swap. Probes:
  - `rulerMarkIndex(2.3, 30, 10)` is 23, but `rulerMarkIndex(2.3, 10, 30)` is 69;
  - `isOnRuler(25, 30, 10)` is true, but `isOnRuler(25, 10, 30)` is false.
- **Each predicate answers part of the question, and the order lives in a ticket.**
  - `isRulerMark(31, 10)` is true, because it ignores the length.
  - `nearestRulerMarks(30.05, 10)` is `[30, 30.1]`, a mark past a 30 cm ruler.
  - A division the validator refused reaches checks as absent and is read as a sixteenth (CR-001).
  - Which function to call first, and when to skip the check, is written in two of TICKET-002's Known Hazards, not in code.
- **The rule does not answer one question TICKET-002 needs: the order of two ends.**
  - TICKET-002 orders the object's ends with the structural `ordered` rule, which compares raw numbers (`src/core/validate/structure.ts:164-166`).
  - Ends at 0.3 and 0.1 + 0.2 pass it, because 0.3 < 0.30000000000000004.
  - `rulerMarkIndex` gives both ends mark 3, so an object of zero length is accepted.

**Impact:**
- DEL-001 promises one rule, so the check and the drawing cannot disagree. That promise now depends on TICKET-002 calling four functions in the right order, with the right argument positions.
- Nothing in `src/core/ruler.ts` is on a public entry (`src/core/index.ts`), and nothing calls it yet. Reshaping the API is cheap now. The cost grows with every call site TICKET-002 and TICKET-003 add.

**Recommendation:**
- Give each question one entry point, on a ruler value built once:
  ```ts
  const ruler = rulerScale(unit, length, division); // undefined for a ruler no description gives
  ruler.marks;        // as rulerMarks
  ruler.locate(end);  // { kind: "mark", index } | { kind: "between", below, above } | { kind: "off" }
  ```
  - `locate` runs `isOnRuler`, `isRulerMark` and `nearestRulerMarks` in the one right order, with one allowance.
  - Its `index` lets TICKET-002 compare ends by mark, so the noise allowance also covers the order of the ends.
- Make the lower-level predicates module-private once nothing else needs them. Read `RULER_MAX_LENGTH` with `isOwnKey`.
- A lighter option: keep the functions but give them one argument order, for example `(value, divisions, length)` everywhere, or one `{ length, divisions }` argument.
- If this is deferred, defer it to TICKET-002, with a Known Hazard that names the argument positions and the ordering case.

**Status:** Resolved
**Resolution:** Fixed — one `rulerScale(unit, length, smallestDivision)` value with `marks`, `marksPerUnit` and `locate(value)` (mark with index, between with neighbours, or off), one allowance throughout; ends are ordered by mark index. The lower-level predicates are private. Known Hazard on TICKET-002 maps the old names and gives the ordering rule. Approved by the user, 2026-10-20.
**Resolution:** —

---

### QR-002: The noise allowance is not pinned: `MARK_NOISE` can grow from 1e-9 to 0.39 of a mark and every test passes, and the property meant to cross-check the predicates restates `rulerMarkIndex` over values that sit at 0

**Category:** Testing
**Severity:** Concern
**Location:**
- `src/core/ruler.ts:32` (`MARK_NOISE`), used at `:119`, `:131` and `:143`;
- `tests/core/ruler.test.ts:141-150` (the off-mark cases), `:177-186`, and `:191-196` (the property).
**Description:**
- **The off-mark cases sit far from any mark.**
  - 3.25 cm, and 2.0625 in at eighths, are half a mark off. So is 0.05 cm.
  - 1.3 in at eighths is 0.4 of a mark off.
  - No test checks a value between the allowance (1e-9 of a mark) and 0.4 of a mark.
- **Mutation, in memory, against the unmodified tests:**
  - with `MARK_NOISE` = 0.39, all 75 tests pass on three runs;
  - with `MARK_NOISE` = 0.01, all 75 pass on three runs;
  - with `MARK_NOISE` = 0.41, three tests fail, all on 1.3 in at eighths.
  - Under 0.39, `isRulerMark(3.21, 10)` is true, so 3.21 cm counts as the 3.2 mark.
- **The property cannot fail, and rarely reaches the ruler.**
  - It asserts that `rulerMarkIndex(v)` is defined exactly when `isOnRuler(v) && isRulerMark(v)` (`:194`). That is the function's own body (`src/core/ruler.ts:143`), so the property holds whatever the allowance is.
  - fast-check picks doubles evenly by their position among all the doubles between the bounds. Most doubles lie near 0, so most draws do too.
  - I replicated the property with the same arbitrary: 100 runs per invocation, 2,000 invocations, 200,000 draws.
    - 88% of draws fell within 0.05 of 0, and 0.57% at −2 or 32.
    - 0.29% fell between 0.05 and 29.95, and none of those was on a mark.
    - None fell within 0.05 of 30, the end CR-003 fixed.

**Impact:**
- The allowance is the shared rule behind NLC-REQ-053, DEL-003 ("far below one mark") and TICKET-002's off-mark check.
  - A later edit could loosen it, say to absorb some noise. The validator would then accept ends near a mark.
  - TICKET-003 draws the bar's end where the author wrote it, so the end would sit off the mark.
  - No test would fail.
- The property reads as evidence that the three predicates agree across the ruler. In fact it checks the function's body against itself, near 0.
- TICKET-002's planned cases (3.25 cm, and 1.3 in at eighths) sit at the same offsets, so the gap would carry forward.
- **Why Concern.** The graph-library review rated an unpinned `isTickValue` tolerance a Suggestion (its QR-004). This finding is rated higher because, on top of that gap, the only property over the rule gives false assurance.

**Recommendation:**
- **Pin both sides of the allowance closely.**
  - Assert `isRulerMark(0.7 + 1e-12, 10)` is true and `isRulerMark(0.7 + 1e-7, 10)` is false. 1e-7 cm is 1e-6 of a mark.
  - Do the same for `isOnRuler` at 30 + 1e-7 and −1e-7, and for `rulerMarkIndex`.
  - Either pair of cases fails both surviving mutants.
- **Replace the property with one built from marks.**
  - Draw an index `k` from −10 to 310, and noise within ±1e-11. Assert that `rulerMarkIndex(k / 10 + noise, 30, 10)` is `k` for k from 0 to 300, and undefined otherwise.
  - Draw an offset from 1e-7 to 0.5 of a mark, and assert undefined.

**Status:** Resolved
**Resolution:** Fixed — the allowance is pinned on both sides (1e-12 on, 1e-7 off, at a mark and both ends); the cross-check property is replaced by two built from mark indexes (noise within ±1e-11 on the mark; a millionth of a mark or more between exactly its neighbours). An allowance of 0.39 or 1e-6 fails them. Approved by the user, 2026-10-20.
**Resolution:** —

---

### QR-003: The layout and rank properties sample 78 rulers at random, so a defect at one length fails some runs and not others, and the core property's `fc.pre` filters out the defect it should catch

**Category:** Testing
**Severity:** Suggestion
**Location:**
- `tests/core/ruler.test.ts:101-115`, with `fc.pre(marks !== undefined)` at `:105`;
- `tests/layout/kit/ruler.test.ts:26` (`rulers`), `:36-57` (`fc.pre` at `:43`, `numRuns: 60` at `:55`) and `:138-147`.
**Description:**
- **The domain is finite.** Five ruler kinds, each with whole lengths up to its maximum, give 78 rulers. Each property draws from them at random.
- **Coverage per run.** I replicated the properties with the same arbitraries and settings over 2,000 invocations.
  - Each 60-run layout property checks 38.8 of the 78 rulers on average.
  - Any one ruler, such as 17 cm, is drawn in 35.5% of invocations.
- **Mutation: `rulerMarks` refuses 17 cm.**
  - In 12 runs of the two files, 11 failed. Each failure came from one or two of the four properties: the horizontal, vertical or diagonal position property, or the numbers property. Which ones failed changed from run to run. One run passed.
  - The core property, "ranks every whole unit 0, and only whole units, on every ruler", never failed. `fc.pre(marks !== undefined)` filters on the output of the function under test, so a ruler that `rulerMarks` wrongly refuses is skipped.
- **It is not flaky on correct code.** All 78 rulers pass in an exhaustive loop, on all three edges. The skip rate is about 0.41, far from fast-check's limit, and the 40 runs agree.

**Impact:**
- A regression at one length shows up as an intermittent failure, and the failing test changes from run to run. That reads as flakiness and invites re-running, the habit graph-library QR-001 warned of.
- The core property's name promises every ruler, but it cannot fail for a ruler that `rulerMarks` refuses.

**Recommendation:**
- Loop over every valid ruler instead: the 5 kinds, each with lengths 1 to `RULER_MAX_LENGTH[unit]`. In a probe, drawing all 78 on three edges took 11.4 ms.
- In the core test, assert that `rulerMarks` lists each valid ruler, rather than filtering on it.
- Keep fast-check for continuous inputs, such as values on the ruler (QR-002).

**Status:** Resolved
**Resolution:** Fixed — `tests/fixtures/rulers.ts` lists all 78 rulers, and every layout and rank test loops over them; the core test asserts each is listed instead of filtering. Refusing 17 cm fails two tests every run. Approved by the user, 2026-10-20.
**Resolution:** —

---

### QR-004: Number placement is tested on one side only: with no gap between a mark and its number every test passes, and every number then overlaps its whole mark on a ruler whose marks run up the page

**Category:** Testing
**Severity:** Suggestion
**Location:**
- `src/layout/kit/ruler.ts:20` (`NUMBER_GAP`) and `:105-112` (the number's position);
- `tests/layout/kit/ruler.test.ts:149-158` and `:182-191`. Both draw side `right`, the default of `ruler()` at `:22`.
**Description:**
- **The doc claims more than the tests check.**
  - `drawRulerMarks` centres each number "far enough along the normal to clear it whatever the edge's direction" (`:106`).
  - The two clearance tests draw one horizontal edge and one vertical edge, both with side `right`.
- **The claim holds today.** A probe checked every mark against every number's box, computed as `tests/fixtures/scene-geometry.ts` computes it.
  - Edges: horizontal, vertical, diagonal and steep, with both sides.
  - Rulers: 10 cm, 6 in, and 30 cm at font size 9.5.
  - No number overlaps any mark.
- **Mutation: `NUMBER_GAP` = 0.**
  - All 75 tests pass, on two runs.
  - The same probe then finds every number over its whole mark on a horizontal edge with side `left`: 11 of 11, 7 of 7, and 31 of 31.
  - The baseline drop moves each number 0.35 of the font size down the page. So side `left` keeps less clearance than side `right`: 2.4 units against 3.6 at size 12.

**Impact:** TICKET-003 chooses which side the numbers go on. A change to the gap or the baseline that breaks side `left` would go unnoticed until someone looks at a figure.
**Recommendation:** Run the clearance test over each side and each edge (horizontal, vertical, diagonal). Assert that no mark crosses any number's box, with the box computed by `boundsOf`.

**Status:** Resolved
**Resolution:** Fixed — numbers are tested on both sides of three edges: centred on their mark's line, and no mark crosses any number's box. `NUMBER_GAP` = 0 fails it. Approved by the user, 2026-10-20.
**Resolution:** —

---

### QR-005: Layout tests pin numbers derived from the fixture's 360-unit edge and from the current mark lengths, and do not check the gap the width test's name promises

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/layout/kit/ruler.test.ts`:
- `:127-134`, with the widths 0.6 and 0.94 at `:129-130`;
- `:151` (`markLength(mark) > 19`) and `:184` (`> 21`);
- `:17-24` (`ruler()`, whose edge runs from x 20 to 380).
**Description:**
- **The widths are pinned as bare numbers.**
  - 0.6 is 360 / 300 / 2, and 0.94 is 360 / 192 / 2 rounded, both taken from the `ruler()` helper's 360-unit edge. The test does not say so.
  - The plan's 380-unit edge would give 0.63 and 0.99. Changing the helper's edge therefore fails the test, though the rule is unchanged.
- **The name promises behaviour the test does not measure.** The name says "so a 30 cm ruler's millimetres stay apart". The test only checks the formula's output; nothing compares a mark's width with the space between neighbouring marks.
- **Whole marks are found by length thresholds.**
  - `> 19` and `> 21` sit just under the whole-mark lengths in `RULER_MARK_LENGTHS` (20 and 22).
  - Those lengths are a style choice TICKET-003 may tune, and each mark's rank is already in `rulerMarks`.

**Impact:** The tests break on changes that keep the behaviour, such as the fixture's edge or the mark lengths. A reader has to rebuild DEL-002's arithmetic to understand 0.94.

**Recommendation:**
- Keep one pinned width for each DEL-002 case, with its arithmetic in a comment (`// 360 units / 300 gaps / 2`), or compute it from the drawn edge.
- Assert the behaviour: on every ruler, the gap between neighbouring marks is at least as wide as a mark, unless the floor `RULER_MIN_MARK_WIDTH` applies.
- Select whole marks by `rulerMarks(...)[i].rank === 0`.

**Status:** Resolved
**Resolution:** Fixed — the gap between neighbouring marks is asserted at least a mark's width on every ruler (unless floored); pinned widths carry their arithmetic; whole marks are selected by rank. Approved by the user, 2026-10-20.
**Resolution:** —

---

### QR-006: `division` (a name, "eighth") and `divisions` (a count, 8) differ by one letter and sit on adjacent lines

**Category:** Naming
**Severity:** Suggestion
**Location:**
- `src/layout/kit/ruler.ts:80-83` and `:95`;
- `src/core/ruler.ts:11` (`INCH_DIVISIONS`), `:16` (`DEFAULT_INCH_DIVISION`), `:58-63` (`divisionsPerUnit`), `:78`, `:92-98` and `:117-162`.
**Description:**
- **Two names one letter apart.** In `drawRulerMarks`, `division` (`:80`) is a string such as "eighth", and `divisions` (`:82`) is a number such as 8. `rulerMarks` takes `division` and uses `divisions` inside.
- **`divisions` also counts a ruler that has no division.**
  - `divisionsPerUnit("centimeters")` is 10.
  - Yet `divisionsPerUnit("centimeters", "half")` is undefined, because a centimetre ruler "has none" (the doc at `:52-56`).
- **The value predicates' docs already call it what it is:** "marks per unit".
- **Precedent.** Graph-library QR-006 found `axisCheck` and `axisChecks` one letter apart, and they were renamed.

**Impact:**
- Typed callers of `drawRulerMarks` are protected, since one is a string and the other a number.
- The core functions take `unknown` for the name. `rulerMarks("inches", 6, 8)`, a count passed as the name, returns undefined, which a check reads as "no ruler".
- A reader of `drawRulerMarks` has to track two names one letter apart.

**Recommendation:**
- Name the count for what it is: `marksPerUnit`, and the function `marksPerUnit(unit, division)`.
- Name the string `divisionName`, or use the vocabulary term TICKET-002 settles on (for example `smallestDivision`).
- Do it together with QR-001, before TICKET-002 and TICKET-003 call these functions.

**Status:** Resolved
**Resolution:** Fixed — the count is `marksPerUnit`, the name `smallestDivision`, in core and in the kit's options. Approved by the user, 2026-10-20.
**Resolution:** —

---

### QR-007: `rulerMarkRank` is exported for any index and count, and casts a floating-point `Math.log2` to the rank type, so it can return 5, 1.58 or NaN typed as `0 | 1 | 2 | 3 | 4`

**Category:** Maintainability
**Severity:** Suggestion
**Location:**
- `src/core/ruler.ts:78-81`: the cast at `:80`, the centimetre branch at `:79`;
- `src/layout/kit/ruler.ts:126-130` (`markLength`), the cast's only safety net.
**Description:**
- **The cast hides the function's domain.** Probes, all typed `RulerMarkRank`:
  - `rulerMarkRank(5, 32)` is 5;
  - `(1, 3)` is 1.584962500721156, and `(1, 12)` is 3.58…;
  - `(4, 20)` is 2.32…;
  - `(-4, 16)` is NaN;
  - `(1.5, 16)` is 5.
- **It is right for every use today.**
  - At 2, 4, 8 and 16 marks per inch, every index from 0 to 192 gives an integer from 0 to 4 (probe).
  - That relies on `Math.log2` being exact at powers of two, which ECMAScript leaves to each engine. The layout runs in browsers as well as Node.
- **The unit is inferred from the count.** The centimetre branch is chosen by `divisions === MILLIMETERS_PER_CENTIMETER`, then uses the literals 10 and 5 in a nested ternary.
- **It is exported, but only `rulerMarks` calls it.**

**Impact:** A later caller that passes a count of its own gets a value the compiler says is a rank. The error surfaces in the kit as "no mark length for rank 1.58…", far from its cause.

**Recommendation:**
- Unexport it: `rulerMarks` already gives every mark's rank.
- Compute the inch rank from a table of the reduced denominator: 1 → 0, 2 → 1, 4 → 2, 8 → 3 and 16 → 4. Return undefined, or throw, for anything else, so the type holds without a cast.
- Write the centimetre branch as two `if` statements using the named constant and half of it.

**Status:** Resolved
**Resolution:** Fixed — `markRank` is private; the inch rank comes from a table of the reduced denominator, with no cast; the centimetre branch is two `if` statements on the named constant. Approved by the user, 2026-10-20.
**Resolution:** —

---

### QR-008: `drawRulerMarks`' guard is one 235-character condition of seven checks, run after the marks are listed, with one message for all of them

**Category:** Readability
**Severity:** Suggestion
**Location:** `src/layout/kit/ruler.ts:79-89`, with the condition at `:87`
**Description:**
- **The condition is long and mixed.**
  - `:87` is 235 characters, the longest line of logic in `src`. Every longer line is a description string in `src/core/definitions/`.
  - It mixes the results of earlier calls (`divisions`, `marks`), checks on the options (finite points, an edge of non-zero length, the side), and a negated compound for the font size.
- **The pattern it models on reads differently.** `drawAxis` checks its options in a named helper, `checkedLabels`, one condition per line (`src/layout/kit/axis.ts:51-65`).
- **Order and repetition.**
  - `divisionsPerUnit` runs at `:82`, and again inside `rulerMarks` at `:83`.
  - `divisions === undefined` adds nothing to `marks === undefined`. It is there only to narrow `divisions`'s type for `:95`.
  - `rulerMarks` lists up to 301 marks before the points, the side and the font size are checked.
- **One message for seven conditions.** "the options do not describe a drawable ruler" does not say which option failed. `niceTicks` and `valueTicks` name the numbers they refuse.
- **A font size that rounds to 0 passes.** `fontSize: 0.004` is above 0 and finite, so it passes, and it is drawn as `font-size` 0 (probe). CR-004 added a floor against the same rounding for mark widths.

**Impact:** The condition is hard to read and to extend. When it fires in production it becomes `internal_error`, with no hint of the cause.

**Recommendation:**
- Move the checks into a helper, `checkedOptions(options)`, with one condition per line. Have it return `{ division, fontSize, marks, marksPerUnit }`.
- Check the options before listing marks, and take the count from one `divisionsPerUnit` call.
- Name the failing option in the message, for example `drawRulerMarks(): side must be "left" or "right", got "below"`.
- Require a font size that survives `fmt()` (`fmt(fontSize) > 0`), or state a minimum.

**Status:** Resolved
**Resolution:** Fixed — `checkedOptions` checks one option per line before any mark is listed, names the failing option in each `RangeError`, and requires a font size that survives `fmt()`. Approved by the user, 2026-10-20.
**Resolution:** —

---

### QR-009: An explicit `fontSize: undefined` throws, though an explicit `division: undefined`, and `drawAxis`'s `labels: undefined`, mean "absent"

**Category:** Error Handling
**Severity:** Suggestion
**Location:** `src/layout/kit/ruler.ts:80-81`, with the guard at `:87`; for comparison, `src/layout/kit/axis.ts:53` and `:62`
**Description:**
- **The two optional options treat `undefined` differently.**
  - `Object.hasOwn(options, "fontSize") ? options.fontSize : 12` keeps an own `undefined`, and the guard refuses it.
  - An own `division: undefined` goes on to `divisionsPerUnit`, which applies the default.
  - Probe: `drawRulerMarks({ …, division: undefined })` draws, and `drawRulerMarks({ …, fontSize: undefined })` throws `RangeError`.
- **The compiler allows it.** `tsconfig.json` does not set `exactOptionalPropertyTypes`, so `fontSize?: number` accepts an explicit `undefined` and a `number | undefined` variable.
- **No test passes either option as an explicit `undefined`.**

**Impact:** TICKET-003 is to choose the size from the length (its Known Hazard from CR-005). A helper that returns undefined to mean "keep the default" would compile, then fail at render as `internal_error`.

**Recommendation:**
- Read the option own-key, then apply the default:
  ```ts
  const given = Object.hasOwn(options, "fontSize") ? options.fontSize : undefined;
  const fontSize = given ?? defaultStyle.fontSizes.tickLabel;
  ```
- Add test cases for `fontSize: undefined` and `division: undefined`.

**Status:** Resolved
**Resolution:** Fixed — `fontSize: undefined` takes the default, like `smallestDivision: undefined`; both tested, both own-key. Approved by the user, 2026-10-20.
**Resolution:** —

---

### QR-010: The kit leaves TICKET-003 to recompute how far the marks and numbers reach, from a private gap and the placement formula, where the value-axis kit exports that extent

**Category:** Patterns
**Severity:** Suggestion
**Location:**
- `src/layout/kit/ruler.ts:20` (`NUMBER_GAP`, not exported) and `:105-112` (the number's position);
- for comparison, `src/layout/kit/value-scale.ts:52` (`valueAxisExtent`) and `:335` (`tickLabelOverhang`);
- the delivery record's `## Notes`, "For TICKET-003".
**Description:**
- **What TICKET-003 must work out:**
  - the ruler body's size, so it holds the marks and numbers;
  - room in the 400-unit width for the "0" and the last number, which overhang the edge's ends ("the ruler fills the fixed drawing width");
  - the numbers' boxes, as obstacles for `placeLabel`, so the object's label hides no number.
- **`drawRulerMarks` knows all three and exports none of them.**
  - Its depth past the edge is the longest mark, plus `NUMBER_GAP` (private), plus half the font size, plus the baseline offset. For an inch ruler at size 12, that is 37.6 units on side `right` and 36.4 on side `left` (worked from the code).
  - The record's Notes give "the longest mark (22 units) plus a number (about 15 units)".
- **The value-axis kit exports the same facts.** `src/layout/kit/value-scale.ts` has `valueAxisExtent` ("A layout leaves this much room when it places the box") and `tickLabelOverhang`.
- **`src` has no function that gives a text node's box.** `boundsOf` is in `tests/fixtures/`.

**Impact:** TICKET-003 would write the placement rule a second time. A later change to the gap, the baseline drop or the font size could leave the body or the overhang wrong, and no kit test would fail.

**Recommendation:**
- Export the facts beside the drawing, as `value-scale.ts` does. For example:
  - `rulerMarksDepth(unit, fontSize)`: how far the marks and numbers reach past the edge on `side`;
  - `rulerNumberOverhang(length, fontSize)`: half the widths of "0" and of the last number.
- Or return the numbers' boxes with the nodes.
- This can be deferred to TICKET-003, with a Known Hazard.

**Status:** Resolved
**Resolution:** Fixed — `rulerMarksDepth(unit, fontSize)` and `rulerNumberOverhang(length, fontSize)` are exported and tested against the drawn boxes on every ruler; Known Hazard on TICKET-003 to use them. Approved by the user, 2026-10-20.
**Resolution:** —

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fixed | `rulerScale` with `locate`; private predicates; Known Hazard | `src/core/ruler.ts`, `src/layout/kit/ruler.ts`, both test files, TICKET-002 |
| QR-002 | Fixed | Allowance pinned; properties rebuilt from indexes | `tests/core/ruler.test.ts` |
| QR-003 | Fixed | Every ruler tested | `tests/fixtures/rulers.ts`, both test files |
| QR-004 | Fixed | Both sides, three edges, no mark in a number | `tests/layout/kit/ruler.test.ts` |
| QR-005 | Fixed | Gap asserted; widths explained; rank selects whole marks | `tests/layout/kit/ruler.test.ts` |
| QR-006 | Fixed | `marksPerUnit`, `smallestDivision` | `src/core/ruler.ts`, `src/layout/kit/ruler.ts` |
| QR-007 | Fixed | Rank table, no cast | `src/core/ruler.ts` |
| QR-008 | Fixed | `checkedOptions`, named messages, font size survives `fmt()` | `src/layout/kit/ruler.ts`, `tests/layout/kit/ruler.test.ts` |
| QR-009 | Fixed | `fontSize: undefined` defaults | `src/layout/kit/ruler.ts`, `tests/layout/kit/ruler.test.ts` |
| QR-010 | Fixed | Depth and overhang exported; Known Hazard | `src/layout/kit/ruler.ts`, `tests/layout/kit/ruler.test.ts`, TICKET-003 |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (all 10 Resolved)
**Notes:**
- Both Concerns and all eight Suggestions are fixed and re-verified. TICKET-002 carries the new interface and the ordering rule (QR-001); TICKET-003 carries the depth and overhang functions (QR-010).
- Re-verification: every check exits 0. One full test run of the first three failed one test that was not captured; thirteen further runs passed, and a run of six suites at once failed only graph-library's time-bound tests under load, never a ruler test.
