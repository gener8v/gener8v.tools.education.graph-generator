# TICKET-001: Build the ruler mark rule and the graded-mark drawing kit — Code Review

## Summary

I reviewed the delivery of `rulers/number-lines-and-coordinate-graphs/TICKET-001`: delivery commit `be97469` on branch `ticket/rulers-nlc-001`. I checked it against:
- the ticket's seven acceptance criteria, its Output and its five Known Hazards;
- NLC-REQ-040..056, Behaviors & Rules → Rulers, the ruler Edge Cases and the new `## @spec Coverage` rows;
- the GSV Ruler Vocabulary (GSV-REQ-046..051), `constraints/prd.md`, and AD-002, AD-004, AD-007, AD-010 and AD-011;
- what TICKET-002 and TICKET-003 will need from the kit.

The mark rule is correct, and I checked it with in-memory probes rather than taking the record's word for it:
- Counts, values and ranks are right for every unit and division.
- Mark feet are within 0.005 units of `linearScale(value)` at both maximum lengths on horizontal, vertical and diagonal edges.
- Across 1,000,000 random off-mark values inside the ruler, `nearestRulerMarks` always names two marks one division apart, both on the ruler.
- DEL-003's correction of the ticket's hazard is true.
- The Verification Run reproduces.

There is one Issue and six Observations. **CR-001 (Issue):** a `null` division is read as the default sixteenth. The `RangeError` guard therefore misses it, and the record's promise to TICKET-002 ("`rulerMarks` returns undefined for any ruler the validator refuses") does not hold for the division. The Observations cover:
- annotations made ahead of TICKET-002, applied unevenly (CR-002);
- the noise allowance stopping at the ruler's two ends (CR-003);
- DEL-002's contrast claim at sub-pixel mark widths (CR-004);
- 30 cm numbers that collide at a font size the kit fixes (CR-005);
- the 0.5-unit property rarely reaching the maximum rulers (CR-006);
- the mark lengths missing from their doc comment (CR-007).

**Reviewer:** `code-reviewer` agent, fresh context (findings phase only, 2026-10-20)
**Delivery Record:** `.gener8v/changes/rulers/delivery/number-lines-and-coordinate-graphs-ticket-001-delivery.md`
**Files Reviewed:**
- `src/core/ruler.ts` (new)
- `src/layout/kit/ruler.ts` (new)
- `tests/core/ruler.test.ts` (new, 39 tests)
- `tests/layout/kit/ruler.test.ts` (new, 23 tests)
- `.gener8v/specifications/number-lines-and-coordinate-graphs.md` (`## @spec Coverage`, rows NLC-REQ-043..048 and NLC-REQ-053, lines 209-215)
- Read for context, unchanged here (`git diff main...be97469` touches none of them):
  - core and kit: `src/core/value-scale.ts`, `src/core/style.ts`, `src/layout/kit/axis.ts`, `src/layout/kit/scale.ts`, `src/layout/kit/format.ts`, `src/layout/kit/text.ts`, `src/layout/kit/value-scale.ts`, `src/layout/kit/check.ts`;
  - validator: `src/core/validate/domain.ts`, `src/core/validate/state.ts`, `src/core/validate/structure.ts`, `src/core/definitions/types.ts` (`DomainCheck`);
  - error handling and test fixtures: `src/graph.ts` (`internal_error`), `tests/fixtures/scene-geometry.ts`.

**Findings:** 7
**Critical:** 0 | **Issues:** 1 | **Observations:** 6

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| A core function lists a ruler's marks from its unit, its whole-number length and (for inches) its smallest division: a centimetre ruler of length L has 10L + 1 marks; an inch ruler of length L marked to 1/d has dL + 1 marks. Each mark's value is `k / d` for an integer `k`, never a running sum | Yes | `rulerMarks` (`src/core/ruler.ts:91-100`) pushes `index / divisions` for `index` 0 to `length × divisions`. Tests: counts at `tests/core/ruler.test.ts:39-59`; exact values `0.7` and `2.3` at `:44-45`; the property over every unit, division and length at `:94-108`. Probe: all 301 centimetre values equal their one-place literals (`Number("2.3") === 23 / 10`), while `k × 0.1` differs from `k / 10` for 109 of the 301 |
| Each mark has a rank: on a centimetre ruler, whole centimetre, half centimetre or millimetre; on an inch ruler, whole inch, half, quarter, eighth or sixteenth, from the largest fraction its index divides by. Tests pin the ranks for 0 to 1 cm and for 0 to 1 in at each smallest division | Yes | `rulerMarkRank` (`src/core/ruler.ts:77-80`) works from the index alone: `index % 10` and `% 5` for centimetres, and `log2(d / gcd(index, d))` for inches, so a fraction has the same rank at every division. Pinned at `tests/core/ruler.test.ts:78-92` (centimetres, then inches at sixteenths, eighths, quarters and halves) |
| A core predicate says whether a value is one of a ruler's marks, within a stated allowance for decimal noise, so 0.7 cm and 2.3 cm (which are not exact in binary) count as marks and 3.25 cm and 1.3 in (marked to eighths) do not. It also gives the nearest marks on either side, for the issue message. TICKET-002's check and this ticket's drawing both use it | Yes | `isRulerMark` (`src/core/ruler.ts:114-117`, `MARK_NOISE` 1e-9 in marks, `:32`) and `nearestRulerMarks` (`:124-131`). Tests at `tests/core/ruler.test.ts:112-154`, including computed noise (`0.1 + 0.2`, `:125-132`). The drawing does not call the predicate, because it has no value to test. It shares the rule through `divisionsPerUnit` and `rulerMarks`, and `:145-148` proves that every listed mark passes the predicate. Probe: 1,000,000 random off-mark values inside five rulers, each given two neighbours one division apart, both marks and both on the ruler. The allowance does not reach the two ends (CR-003) |
| The maximum lengths (30 cm and 12 in, provisional per OQ-009) and the mark lengths per rank are named constants in one place, and the doc comments state them | Partial | `RULER_MAX_LENGTH` (`src/core/ruler.ts:18-22`): frozen, and its doc states 30 cm, 12 in and OQ-009, pinned at `tests/core/ruler.test.ts:23-25`. `RULER_MARK_LENGTHS` (`src/layout/kit/ruler.ts:9-17`): frozen and strictly decreasing (`tests/layout/kit/ruler.test.ts:81-87`). Its doc comment names the ranks but not the lengths (CR-007) |
| A layout kit function draws the marks along a line from `from` to `to`: each mark perpendicular to the line on one side, at its proportional position (`linearScale`), with a length that strictly decreases with rank. It numbers every whole unit from 0 to the length, and draws no number on any other mark. Every emitted number passes through `fmt()` | Yes | `drawRulerMarks` (`src/layout/kit/ruler.ts:64-109`): the unit normal toward `side` (`:76-77`), `linearScale([0, length], [0, 1])` (`:78`), the rank's length from `markLength` (`:88`), and numbers only for rank 0 (`:90-105`), after every mark (`:107`). Each attribute number goes through `fmt()` (`:43-48`, `:97-101`). Tests at `tests/layout/kit/ruler.test.ts:29-149`. Probe: at the maximum lengths on all three edges the worst foot offset is 0.005 units. The property's coverage of those rulers is thin (CR-006). At 30 cm the two-digit numbers overlap one another (CR-005); the criterion does not ask about overlap |
| The drawing function throws `RangeError` on options no validated ruler gives (non-finite points, a length not a whole number from 1 to the maximum, an unknown unit or division), like `drawAxis` | Partial | The guard at `src/layout/kit/ruler.ts:72-74` covers each listed case and also a zero-length edge and an unknown `side`. `division` is read own-key (`:66`), so an inherited `division` is ignored (probe). Nine cases are tested at `tests/layout/kit/ruler.test.ts:152-164`. But `division: null` on an inch ruler draws 97 sixteenth marks instead of throwing, while the same `null` on a centimetre ruler throws (CR-001). A non-iterable `from` throws `TypeError`, as `drawAxis` does; `createGraphWith` turns any throw into `internal_error` (`src/graph.ts:42-46`) |
| Marks are counted before they are listed. A 30 cm ruler (301 marks) and a 12 in ruler at sixteenths (193 marks) draw with clean `checkScene` results | Yes | `rulerMarks` validates the unit, division and length before its loop (`src/core/ruler.ts:92-93`), so the loop runs at most 301 times (`:95-98`), the length maximum standing in for a tick limit as Behaviors & Rules → Rulers says. Tests: `tests/core/ruler.test.ts:56-59` and `tests/layout/kit/ruler.test.ts:166-176` (counts and `checkScene`, horizontal edge) |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| NLC-REQ-043 (kit part) | Number every whole unit from 0 at the start to the length at the end | `src/layout/kit/ruler.ts`:drawRulerMarks (`:90-105`) | Yes (wired into the ruler type by TICKET-003). At 30 cm the numbers overlap (CR-005) |
| NLC-REQ-044 (kit part) | A centimetre ruler has a mark at every millimetre | `src/core/ruler.ts`:divisionsPerUnit (10), rulerMarks; `src/layout/kit/ruler.ts`:drawRulerMarks | Yes |
| NLC-REQ-045 (kit part) | Half-centimetre marks longer than millimetre marks, whole-centimetre marks longer still | `src/core/ruler.ts`:rulerMarkRank, rulerMarks; `src/layout/kit/ruler.ts`:RULER_MARK_LENGTHS (20, 14, 8), drawRulerMarks | Yes |
| NLC-REQ-047 (kit part) | An inch ruler has a mark at every multiple of its smallest division | `src/core/ruler.ts`:divisionsPerUnit, rulerMarks; `src/layout/kit/ruler.ts`:drawRulerMarks | Yes |
| NLC-REQ-048 (kit part) | Inch marks graded by fraction: whole, half, quarter, eighth, sixteenth | `src/core/ruler.ts`:rulerMarkRank, rulerMarks; `src/layout/kit/ruler.ts`:RULER_MARK_LENGTHS (22, 17, 13, 9.5, 6.5), drawRulerMarks | Yes |

*The ticket carries no NFR. NLC-NFR-005 (0.5 px accuracy, equal units) belongs to TICKET-004; this ticket's 0.5-unit position test is its kit-level precursor (see CR-006). The code also serves parts of TICKET-002's requirements: NLC-REQ-042 (`RULER_MAX_LENGTH`, `isRulerLength`), NLC-REQ-046 (`INCH_DIVISIONS`, `DEFAULT_INCH_DIVISION`, `divisionsPerUnit`) and NLC-REQ-053 (`isRulerMark`, `nearestRulerMarks`). They are reviewed here only as the contract TICKET-002 builds on.*

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/TC-001 | Pure layout, no DOM measurement | Yes | `drawRulerMarks` reads only its options and `defaultStyle`. The clearance for each number uses the `textWidth` estimate (`src/layout/kit/ruler.ts:93`) |
| prd/TC-002 | Computed coordinates rounded before they reach markup | Yes | Every coordinate, the stroke width and the font size go through `fmt()` (`src/layout/kit/ruler.ts:43-48`, `:97-101`). Tested at `tests/layout/kit/ruler.test.ts:74-77`, and `checkScene` at `:33` and `:174` |
| prd/TC-005 | `src/core/ruler.ts` imports no React and no browser global | Yes | The module has no imports. Probe: piped to `eslint --stdin` with `import "react"` or a `window` read prepended, both files fail the AD-001 / prd/TC-005 boundary rules (`no-restricted-imports`, `no-restricted-globals`) |
| prd/CC-002 | 3:1 contrast for graphical objects (1.4.11) | Yes, for the specified color | Marks use `defaultStyle.colors.line` (#222222, 15.9:1 on white). DEL-002 narrows them to 0.6 units on a 30 cm ruler, so the rendered contrast of a sub-pixel stroke depends on the size the drawing is shown at (CR-004). TICKET-003 carries this constraint for the drawn ruler |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-002 | Layout produces plain Scene data | Yes | `drawRulerMarks` returns `SceneNode[]` of `line` and `text` only. Core holds no Scene types |
| AD-004 | Staged validator; checks see only values that passed | Yes (kit side) | Like `drawableTicks` (graph-library NLC TICKET-001 CR-006), the core functions return `undefined` and never throw. How a refused division looks to a domain check is a contract matter for TICKET-002 (CR-001) |
| AD-007 | 400-unit drawing space; `fmt()` on every emitted number | Yes | As prd/TC-002. The numbers' text is `String(Math.round(value))` for whole units 0 to 30, so it has no decimals and no exponent (`src/layout/kit/ruler.ts:91`). The drawing is scaled to its container, which matters for DEL-002's sub-pixel widths (CR-004) |
| AD-010 | System font stack and estimated text metrics | Yes | `DEFAULT_FONT_STACK` and `textWidth`. Numbers sit at fixed offsets, as in `drawAxis`, not through `placeLabel` |
| AD-011 | Presentation attributes from the default style | Yes | `stroke` and `fill` come from `defaultStyle.colors`, and the font from `defaultStyle.fontSizes.tickLabel`. The stroke width is the default tick width, capped at half the mark spacing (DEL-002). The mark lengths live in the kit, where the ticket's Output puts them |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| NLC-REQ-043 | `@spec NLC-REQ-043` | `src/layout/kit/ruler.ts:drawRulerMarks` (line 63) | Yes |
| NLC-REQ-044 | `@spec NLC-REQ-044` | `src/core/ruler.ts:divisionsPerUnit` (56), `rulerMarks` (90); `src/layout/kit/ruler.ts:drawRulerMarks` (63) | Yes |
| NLC-REQ-045 | `@spec NLC-REQ-045` | `src/core/ruler.ts:rulerMarkRank` (76), `rulerMarks` (90); `src/layout/kit/ruler.ts:drawRulerMarks` (63) | Yes |
| NLC-REQ-047 | `@spec NLC-REQ-047` | `src/core/ruler.ts:divisionsPerUnit` (56), `rulerMarks` (90); `src/layout/kit/ruler.ts:drawRulerMarks` (63) | Yes |
| NLC-REQ-048 | `@spec NLC-REQ-048` | `src/core/ruler.ts:rulerMarkRank` (76), `rulerMarks` (90); `src/layout/kit/ruler.ts:drawRulerMarks` (63) | Yes |

**Coverage:** 5 of 5 requirements annotated. Each annotation sits on the line directly above its function, after the JSDoc. Two annotations name TICKET-002's requirements: NLC-REQ-046 on `divisionsPerUnit` (56) and NLC-REQ-053 on `isRulerMark` (113). `isRulerLength` (NLC-REQ-042 in its doc) and `nearestRulerMarks` (NLC-REQ-053's "naming the nearest drawn marks") carry none (CR-002).
**Missing:** None for the ticket's requirements.
**Specification table:** Yes. `## @spec Coverage` (`.gener8v/specifications/number-lines-and-coordinate-graphs.md:209-215`) lists exactly these locations, and rows NLC-REQ-046 and NLC-REQ-053 say that TICKET-002 completes them. The NLC-REQ-043 row says it is the kit part, but rows 044, 045, 047 and 048, which TICKET-003 also covers ("drawn"), do not (CR-002).

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm generate` | not re-run (it writes `src/generated`) | Yes, by evidence. No source outside the two new files mentions a ruler, so nothing generated changes. The test "are committed exactly as a fresh build writes them" (`tests/core/schema-shape.test.ts:302`) passes inside `pnpm test` |
| `pnpm lint` | 0 | Yes |
| `pnpm typecheck` | 0 | Yes |
| `pnpm test` (three runs) | 0, 0, 0 | Yes. Run as `vitest run --no-cache`: 47 files and 1,247 tests on each run. The two new files hold 62 tests (39 + 23) and pass on their own |
| `pnpm bench` | 0 | Yes (7 passed; `vitest bench --run --reporter=verbose --no-cache`) |
| `pnpm build` | 0 | Yes |
| `pnpm check:dist` | 0 | Yes (14 built files scanned, no network APIs or modules) |
| `pnpm check:deps` | 0 | Yes (0 runtime dependencies) |
| `pnpm check:images` | 0 | Yes (8 images, licenses recorded) |
| `pnpm size` | not re-run (by instruction) | Not checked. No entry point imports `src/core/ruler.ts` or `src/layout/kit/ruler.ts`, so no bundle changes |
| `pnpm publint` | 0 | Yes (All good) |
| `pnpm attw` | 0 | Yes |
| `pnpm audit` | 0 | Yes (No known vulnerabilities found) |
| `python3 …/gener8v-state.py lint` | 0 | Yes (0 errors, 0 warnings) |

*The ten deliberate breaks in the record need source edits and were not re-run. Reading the tests, each break trips a named assertion:*
- *values as `k × (1/d)`: `tests/core/ruler.test.ts:44` (7 × 0.1 is 0.7000000000000001);*
- *exact membership: `:128-130`;*
- *the half-centimetre rank on every second millimetre: `:79`;*
- *the inch ranks shifted: `:83` and `:87-91`;*
- *a 31 cm maximum: `:24` and `:65`;*
- *the side ignored: `tests/layout/kit/ruler.test.ts:69`;*
- *numbers on half marks: `:122`;*
- *a fixed mark width: `:110-111`;*
- *no side guard: the "unknown side" case at `:161`;*
- *two equal mark lengths: `:83` and `:98`.*

*No review command changed a tracked file. `.gener8v/runs.jsonl` is written by the hooks.*

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | It repeats graph-library NLC DEL-001, and the ticket's Output asks for it. The validator is core, so the rule must be core. `drawAxis`, `src/core/value-scale.ts` and `src/core/style.ts` are untouched, and the Known Hazard's separate bound is `RULER_MAX_LENGTH`. The "one rule" holds for membership. It does not yet cover the ends of the ruler (CR-003) or the division (CR-001) |
| DEL-002 | Reasonable in rule; rationale overstated | Narrowing is needed: 1.5-unit marks at 1.2 units per millimetre would merge. The numbers match: 360 / 300 / 2 = 0.6 and 360 / 192 / 2 = 0.9375 → 0.94, and the width is pinned at `tests/layout/kit/ruler.test.ts:108-113`. "Contrast (CC-002 1.4.11) is unchanged" is true of the color only. At 0.6 units the stroke is under a pixel wherever the drawing is shown narrower than about 667 px, and its anti-aliased contrast falls with the shown size. There is no floor: on a 30 cm ruler drawn along an edge under 3 units, `fmt()` rounds the width to 0 (CR-004) |
| DEL-003 | Reasonable; the correction is true | The probe confirms the claim, and it reaches further than the record says: `Number(String(k / 10)) × 10 === k` holds for every `k` up to 10,000,000, not only up to 30.0. Inch marks written to four places are exact × 16. `k / 10` equals the parsed literal for all 301 centimetre marks. The tests pin the predicate's behaviour (computed noise at `tests/core/ruler.test.ts:125-132`), but nothing pins the exactness claim itself: the `Number.isInteger` break passing the planned cases is the only evidence. That does not matter for correctness, since the allowance makes exactness irrelevant. TICKET-002's own Known Hazards still say "0.7 × 10 is not exactly 7"; the record's Notes carry the correction. The allowance stops at 0 and at the length (CR-003) |

*Deviations: the mark widths (0.6 and 0.94 over the tests' 360-unit edge, against the plan's 0.63 and 0.99 over 380 units) follow from the edge length. The rule is unchanged, and TICKET-003 picks the edge. The extra test for computed noise strengthens the evidence for DEL-003. Neither deviation affects traceability or a downstream ticket.*

*What the downstream tickets need from the kit:*
- *TICKET-002 (definition and checks) gets:*
  - *the unit and division names in the vocabulary's spelling;*
  - *`DEFAULT_INCH_DIVISION` for the text alternative;*
  - *`RULER_MAX_LENGTH` and `isRulerLength` for the length message;*
  - *`isRulerMark`, which accepts 3.4, 0.7, 2.0625 at sixteenths, 0 and the length, and rejects 3.25 and 1.3 at eighths;*
  - *`nearestRulerMarks`: 3.25 gives [3.2, 3.3] and 1.3 at eighths gives [1.25, 1.375], both printing cleanly through `formatSupplied`.*
  
  *Two traps. A refused or `null` division looks like the default sixteenth (CR-001). There is no shared rule for an end within noise of 0 or of the length (CR-003). A centimetre ruler given a division reaches the domain stage without it once GSV's conditional applicability refuses it in structure. `divisionsPerUnit("centimeters")` is then 10, so the record's first Note is safe.*
- *TICKET-003 (layout) gets `drawRulerMarks` along any edge, on either side, and `RULER_MARK_LENGTHS` (longest 22 units) for the body's depth. Its object's ends must use the same `linearScale([0, length], …)`. The record's Notes cover the overhanging "0" and the last number. They do not cover:*
  - *the colliding 30 cm numbers at the kit's fixed font size (CR-005);*
  - *the sub-pixel mark width at small rendered sizes (CR-004).*

## Findings

### CR-001: A `null` division is read as the default sixteenth, so the guard misses it and `rulerMarks` does not return undefined for every refused ruler

**Severity:** Issue
**Location:** `src/core/ruler.ts:57-62` (`divisionsPerUnit`, `division ?? DEFAULT_INCH_DIVISION` at `:60`), and through it `rulerMarks` (`:91-93`) and `drawRulerMarks` (`src/layout/kit/ruler.ts:66-74`); delivery record `## Notes` (`.gener8v/changes/rulers/delivery/number-lines-and-coordinate-graphs-ticket-001-delivery.md:187`)
**Traces To:**
- acceptance criterion 6 ("throws `RangeError` on options no validated ruler gives (… an unknown unit or division), like `drawAxis`");
- the doc comments of `divisionsPerUnit` ("Undefined for an unknown unit or division") and `rulerMarks` ("Undefined, never thrown, for a ruler no validated description gives: an unknown unit or division");
- DEL-001 (one rule for the check and the drawing);
- graph-library `number-lines-and-coordinate-graphs-ticket-001-security-review/SEC-004` (fail closed on options no validated description gives).
**Description:** `divisionsPerUnit` treats `null` as an absent division on an inch ruler, and as a given one on a centimetre ruler. Probes:
- `divisionsPerUnit("inches", null)` is 16 and `rulerMarks("inches", 6, null)` lists 97 marks;
- `drawRulerMarks({ …, unit: "inches", length: 6, division: null })` draws 97 sixteenth marks without throwing;
- the same `division: null` on a centimetre ruler throws `RangeError`;
- `16`, `""`, `"toString"` and `"third"` are all refused, so `null` is the one non-name that passes.

No test covers `null`: the invalid-ruler tables are at `tests/core/ruler.test.ts:61-74` and `tests/layout/kit/ruler.test.ts:152-164`.

A related point concerns the record's Note to TICKET-002, "`rulerMarks` returns undefined for any ruler the validator refuses, so a domain check can call it safely". The validator leaves a failed value out of the description (`src/core/validate/structure.ts:31-33`). A domain check runs only when each of its inputs is present and untouched by a failure (`src/core/validate/domain.ts:27-30`). So when the validator refuses an inch ruler's division ("eighths", 8, "1/8"), the domain stage sees a ruler with no division, and `divisionsPerUnit` and `rulerMarks` answer for sixteenths. A check that declares the division in its `inputs` is skipped whenever the division is absent. One that does not declare it cannot tell absent from refused.
**Impact:** Typed callers cannot pass `null` to `drawRulerMarks`, and the validator refuses `null` before any layout, so no description draws a wrong ruler today. But the core functions take `unknown` precisely so that checks can pass raw values, and the Note tells TICKET-002 they are safe for every refused ruler. TICKET-002's off-mark check could then accept 1.0625 on an inch ruler whose misspelled division meant eighths. That end is reported only on the next pass, after the author fixes the division.
**Recommendation:**
- Default only on `undefined`: `const name = division === undefined ? DEFAULT_INCH_DIVISION : division;`.
- Add `null` (on both units) to the core and layout invalid-ruler tables.
- Correct the Note. A division the validator refuses reaches domain checks as absent and is then read as a sixteenth. Add a Known Hazard to TICKET-002 so its off-mark check decides how to treat that case (for example, skip the off-mark check while the division is reported).

**Status:** Resolved
**Resolution:** Fixed — only an absent division takes the default, so `null` is refused on both units (core and kit tests). The record's Note is corrected in its Post-Review Amendments, and a Known Hazard on TICKET-002 says to skip the off-mark check while the division is reported. Approved by the user, 2026-10-20.

---

### CR-002: The annotations made ahead of TICKET-002 are applied unevenly, and four of the five kit-part rows do not say they are kit parts

**Severity:** Observation
**Location:** `src/core/ruler.ts:56` (`@spec … NLC-REQ-046 …`), `:113` (`@spec NLC-REQ-053`), `:102-105` (`isRulerLength`, unannotated), `:119-131` (`nearestRulerMarks`, unannotated); `.gener8v/specifications/number-lines-and-coordinate-graphs.md:209-215`; delivery record `## @spec Annotations` (`.gener8v/changes/rulers/delivery/number-lines-and-coordinate-graphs-ticket-001-delivery.md:166-180`)
**Traces To:** CLAUDE.md Traceability ("Every function … that implements a requirement carries `@spec`"; "`grep -rn "@spec"` audits coverage"); the ticket's Requirements Covered (all five "(kit part)"); TICKET-002 (NLC-REQ-042, NLC-REQ-046, NLC-REQ-053) and TICKET-003 (NLC-REQ-043..048 "drawn"); the precedent of the NLC-REQ-007 row ("ticks; points and segments with NLC TICKET-002..004")
**Description:** The two annotations on TICKET-002's requirements can be traced, and their rows in the coverage table say TICKET-002 completes them. But the rule behind them is applied unevenly, and two other things mislead:
- **The rule.** It is "annotate where the rule TICKET-002 relies on lives". Under it, `isRulerLength` (whose doc names NLC-REQ-042, owned by TICKET-002) and `nearestRulerMarks` (the "naming the nearest drawn marks" half of NLC-REQ-053's Edge Case) would carry annotations too, and they carry none.
- **The coverage rows.** The NLC-REQ-043 row says "(kit; the ruler type with rulers NLC TICKET-003)", but the rows for 044, 045, 047 and 048 have no such qualifier, though TICKET-003 covers them as "(drawn)". A reader of the table sees four ruler drawing requirements as complete and one as partial.
- **The grep audit.** `grep -rn "@spec"`, the audit CLAUDE.md names, reports NLC-REQ-053 as implemented by `isRulerMark` while nothing yet reports an off-mark end.

The record's own table also lists only the core annotations in its Annotation column for NLC-REQ-044 and NLC-REQ-045.
**Impact:** An audit or TICKET-002's delivery may read NLC-REQ-053 or NLC-REQ-044 as done, or miss that `isRulerLength` and `nearestRulerMarks` serve NLC-REQ-042 and NLC-REQ-053.
**Recommendation:**
- Choose one rule. Either annotate `isRulerLength` (`@spec NLC-REQ-042`) and `nearestRulerMarks` (`@spec NLC-REQ-053`) and add them to the qualified rows, or drop the NLC-REQ-046 and NLC-REQ-053 annotations and let TICKET-002 annotate its definition.
- Qualify the NLC-REQ-044, 045, 047 and 048 rows as the 043 row is: "(kit; drawn with rulers NLC TICKET-003)".

**Status:** Resolved
**Resolution:** Fixed — one rule: annotate where the rule a later ticket relies on lives. `isRulerLength` carries NLC-REQ-042, `nearestRulerMarks` NLC-REQ-053, and the new `isOnRuler` and `rulerMarkIndex` NLC-REQ-052 and 053. Every partial coverage row is qualified "(kit; drawn with rulers NLC TICKET-003)" or "(rule; checked with rulers NLC TICKET-002)". Approved by the user, 2026-10-20.

---

### CR-003: The noise allowance stops at the ruler's ends: a computed end within noise of 0 or of the length is a mark, but outside the ruler

**Severity:** Observation
**Location:** `src/core/ruler.ts:107-117` (`isRulerMark`: "It says nothing about the ruler's length"), `:119-131` (`nearestRulerMarks`, unclamped)
**Traces To:**
- DEL-003's rationale ("Noise comes from values the caller's code computes"; the allowance "absorbs computed noise");
- DEL-001 ("If the two used different rules, the check could accept an end the drawing does not mark");
- the Edge Cases row "Object whose end is the ruler's length: … accept it";
- TICKET-002's criteria ("A mark at exactly 0 or exactly the length is accepted"; "an end off the ruler should not also be reported as between marks").
**Description:** Probes:
- `0.3 - 0.1 - 0.2` is −2.78e-17. `isRulerMark` accepts it as mark 0, and `nearestRulerMarks` returns `[-0, -0]`;
- `0.1 * 3 * 100` is 30.000000000000004. `isRulerMark` accepts it as the 30 cm end, yet it is above 30.

The kit has no rule for "on the ruler", so TICKET-002 will write its own. The obvious one (`value < 0 || value > length`) refuses both values as outside the ruler, while the shared predicate calls them marks. Inside the ruler, the same kind of noise is absorbed: 0.1 + 0.2 is the 3 mm mark. `nearestRulerMarks` also names marks beyond the ruler for a value outside it (−0.05 gives [−0.1, −0]; 12.01 at sixteenths gives [12, 12.0625]). That is harmless only if the range check runs first, and its doc does not say so.
**Impact:** An author's tool that computes an object's end as 30.000000000000004, or as −2.8e-17 for 0, gets "outside the ruler" for an end the drawing marks and the edge case says to accept. Inside the ruler, the same noise is accepted. The allowance and the one-rule promise hold for membership only.
**Recommendation:** Do one of the following:
- Export one core rule for both questions, sharing `MARK_NOISE`: for example, `rulerMarkIndex(value, length, divisions)`, which returns the mark's index in `0..length × divisions` or undefined, or an `isOnRuler(value, length, divisions)` with the same allowance. Then TICKET-002 checks the range and membership with it.
- Add a Known Hazard to TICKET-002 so that its range check decides the ends knowingly. The same hazard can correct its "0.7 × 10 is not exactly 7" example.

Either way, say in `nearestRulerMarks`' doc that it does not clamp to the ruler.
**Status:** Resolved
**Resolution:** Fixed — `isOnRuler` and `rulerMarkIndex` in `src/core/ruler.ts` share the noise allowance, so 30.000000000000004 is the 30 cm end and −2.8e-17 is 0. `nearestRulerMarks` documents that it does not clamp, and never returns −0. A Known Hazard on TICKET-002 says to check both with them, and corrects its decimal example. Approved by the user, 2026-10-20.

---

### CR-004: DEL-002 narrows marks below a pixel at ordinary sizes, so "contrast is unchanged" holds for the color but not for the rendered mark

**Severity:** Observation
**Location:** `src/layout/kit/ruler.ts:80` (`Math.min(defaultStyle.lineWidths.tick, edge / (length * divisions) / 2)`); delivery record DEL-002 (`.gener8v/changes/rulers/delivery/number-lines-and-coordinate-graphs-ticket-001-delivery.md:147-152`)
**Traces To:** prd/CC-002 (3:1 contrast for graphical objects needed to understand the graph, WCAG 1.4.11); AD-007 (the 400-unit drawing is scaled to its container with `viewBox` and `width="100%"`); TICKET-003's constraints ("3:1 contrast for the marks and the object (1.4.11)")
**Description:** At the maximum lengths over a 360-unit edge, marks are 0.6 units (30 cm) and 0.94 units (12 in at sixteenths) wide. Shown at 400 px wide, they are 0.6 px and 0.94 px strokes, and narrower still in a smaller container. Browsers anti-alias a sub-pixel stroke into a lighter grey.

I estimated the rendered contrast by blending #222222 with white in proportion to pixel coverage. These are estimates, not measurements:

| Ruler | Shown 400 px wide | Shown 300 px wide | Shown 200 px wide |
|-------|-------------------|-------------------|-------------------|
| 30 cm | about 4.3:1 | about 2.8:1 | about 1.9:1 |
| 12 in at sixteenths | about 13.3:1 | about 6.0:1 | about 2.9:1 |

By the same estimate, a 30 cm ruler's marks drop under 3:1 when the drawing is shown narrower than about 320 px, and a 12 in ruler's under about 205 px.

The width has no floor: on a 30 cm ruler along an edge under 3 units, `fmt()` rounds it to `0` (probe: a 2-unit edge gives `stroke-width` 0). DEL-002's rationale says "The marks stay in the line color, so contrast (CC-002 1.4.11) is unchanged". The record's Notes to TICKET-003 do not mention the width's effect.
**Impact:** None inside this ticket: the color has 15.9:1 contrast, and TICKET-003 picks the edge and the drawing's proportions. But the record's statement could lead TICKET-003 to treat 1.4.11 as settled for the millimetre marks, when it depends on the size the ruler is shown at.
**Recommendation:**
- Correct DEL-002's rationale to say that contrast holds for the color, and that the mark's rendered contrast at small sizes is TICKET-003's to decide.
- Add a Known Hazard to TICKET-003: state the smallest shown width at which the marks keep 3:1, or set a minimum mark width, and document it.
- Consider a floor in the kit, so that no mark is drawn at width 0.

**Status:** Resolved
**Resolution:** Fixed — `RULER_MIN_MARK_WIDTH` (0.25) floors the width, with a test. DEL-002's contrast claim is corrected in the record's Post-Review Amendments. A Known Hazard on TICKET-003 says to state the smallest shown width that keeps 3:1, or to widen the marks. Approved by the user, 2026-10-20.

---

### CR-005: On a 30 cm ruler the two-digit numbers overlap at any horizontal edge that fits the drawing, and the kit fixes their size, which TICKET-003 is meant to choose

**Severity:** Observation
**Location:** `src/layout/kit/ruler.ts:81` (`const fontSize = defaultStyle.fontSizes.tickLabel`), `:23-38` (`RulerMarksOptions`, no size option); delivery record `## Notes`, "For TICKET-003" (`.gener8v/changes/rulers/delivery/number-lines-and-coordinate-graphs-ticket-001-delivery.md:188-191`)
**Traces To:** NLC-REQ-043 (number every whole unit); TICKET-003's Notes ("Placement choices that the specification leaves open, such as … the body's height and the number size, are delivery decisions") and its criterion that "the ruler fills the fixed drawing width whatever its length" (AD-007); AD-010 (estimated metrics for label layout); NLC OQ-005 (label overlap, open)
**Description:** A two-digit number at the kit's 12-unit font is estimated at 14.68 units wide (`textWidth("30", 12)`). Probes with the test fixture's `boundsOf` and `overlap`:

| 30 cm ruler's edge | Centimetre spacing | Number pairs that overlap | Widest overlap |
|--------------------|--------------------|---------------------------|----------------|
| Horizontal, 360 units | 12 units | 20 (10 to 30) | 2.68 units |
| Horizontal, 380 units | 12.67 units | 20 | 2.02 units |
| Diagonal, 400 units | 13.33 units | 20 or 21, by side | 4.02 units |

Even a full 400-unit horizontal edge gives 13.33 units per centimetre, under 14.68. Separating the numbers would need a font of about 9.8 at 360 units, or 10.4 at 380. No number overlaps a mark, inch rulers have no overlap, and a vertical edge has none. The 30 cm test (`tests/layout/kit/ruler.test.ts:166-176`) runs `checkScene` only, which cannot see overlap.
**Impact:** The specification's longest centimetre ruler, drawn across the page as TICKET-003 must draw it, prints "10" to "30" run together. TICKET-003 cannot choose the number size its Notes give it without changing the kit.
**Recommendation:** Do one of the following:
- Add an optional number size to `RulerMarksOptions`, read own-key and validated as `division` is, so that TICKET-003 can size the numbers for the length.
- Add the overlap and the size that clears it to the record's Notes for TICKET-003, and add a Known Hazard to TICKET-003.

**Status:** Resolved
**Resolution:** Fixed — `RulerMarksOptions.fontSize` (optional, own-key, validated) sizes the numbers. A test shows overlap at 12 and none at 9.5 on a 30 cm ruler over 360 units. A Known Hazard on TICKET-003 says to choose it from the length and test no overlap. Approved by the user, 2026-10-20.

---

### CR-006: The 0.5-unit position property reaches the maximum rulers on a given edge in about one run in five, and the maximum-ruler test checks only counts and `checkScene`

**Severity:** Observation
**Location:** `tests/layout/kit/ruler.test.ts:36-57` (`fc.integer({ min: 1, max: 30 })`, `fc.pre`, `numRuns: 60`), `:166-176`
**Traces To:** acceptance criterion 5 ("at its proportional position (`linearScale`)"); acceptance criterion 7 (the 301- and 193-mark rulers); the ticket's Output for `tests/layout/kit/ruler.test.ts` ("mark positions within 0.5 units of `linearScale(value)` … the maximum rulers"); the record's evidence ("puts each mark's foot within 0.5 units…" (horizontal, vertical, diagonal))
**Description:** I ran the property 400 times with its own arbitraries and settings. In each 60-run property:
- the 30 cm ruler was drawn in 57% of runs;
- the 12 in ruler at sixteenths in 36%;
- both in 22%.

So the chance that all three edge properties draw both maximum rulers in one test run is about 1%. The deterministic test at `:166-176` draws the two maximum rulers on the horizontal edge only, and checks their counts and `checkScene`, not their positions. The code is right: my probe found a worst foot offset of 0.005 units at both maximum lengths, on all three edges and at every division.
**Impact:** The densest rulers, where marks are 1.2 units apart and the width is narrowed, are the ones a position defect would hurt most. A regression that affects only them would pass most runs. TICKET-004's NLC-NFR-005 test comes later.
**Recommendation:** Check the two maximum rulers on all three edges every time. Either add them as an `it.each` over the three edges, or pass them to the property through fast-check's `examples` option.
**Status:** Resolved
**Resolution:** Fixed — a deterministic test draws both largest rulers on all three edges and checks every mark within 0.5 units; shifting their positions fails it. Approved by the user, 2026-10-20.

---

### CR-007: `RULER_MARK_LENGTHS`' doc comment names the ranks but not the lengths, which criterion 4 asks the doc comments to state

**Severity:** Observation
**Location:** `src/layout/kit/ruler.ts:9-17`
**Traces To:** acceptance criterion 4 ("the maximum lengths … and the mark lengths per rank are named constants in one place, and the doc comments state them"); specification Data Requirements ("the mark lengths of each division")
**Description:** `RULER_MAX_LENGTH`'s doc states its values (30 cm and 12 in, OQ-009). `RULER_MARK_LENGTHS`' doc says "Each rank's mark length, in drawing units, longest first … Strictly decreasing", and the values (centimetres 20, 14, 8; inches 22, 17, 13, 9.5, 6.5) appear only in the initializer and the delivery record. `drawRulerMarks`' doc does not state them either.
**Impact:** Small. The values are in the source just below the comment, but an editor tooltip or generated documentation shows only the type.
**Recommendation:** State the lengths in the doc comment, for example "centimetres 20, 14, 8; inches 22, 17, 13, 9.5, 6.5 units".
**Status:** Resolved
**Resolution:** Fixed — the doc comment states centimetres 20, 14, 8 and inches 22, 17, 13, 9.5, 6.5 units. Approved by the user, 2026-10-20.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Fixed | Default only on undefined; null tests; Note corrected; Known Hazard on TICKET-002 | `src/core/ruler.ts`, `tests/core/ruler.test.ts`, `tests/layout/kit/ruler.test.ts`, TICKET-002 |
| CR-002 | Fixed | Annotations on isRulerLength, nearestRulerMarks, isOnRuler, rulerMarkIndex; rows qualified | `src/core/ruler.ts`, specification `## @spec Coverage` |
| CR-003 | Fixed | `isOnRuler`, `rulerMarkIndex` with the shared allowance; nearest-marks doc; Known Hazard on TICKET-002 | `src/core/ruler.ts`, `tests/core/ruler.test.ts`, TICKET-002 |
| CR-004 | Fixed | Width floor; DEL-002 corrected; Known Hazard on TICKET-003 | `src/layout/kit/ruler.ts`, `tests/layout/kit/ruler.test.ts`, TICKET-003 |
| CR-005 | Fixed | `fontSize` option; overlap test; Known Hazard on TICKET-003 | `src/layout/kit/ruler.ts`, `tests/layout/kit/ruler.test.ts`, TICKET-003 |
| CR-006 | Fixed | Largest rulers pinned on three edges | `tests/layout/kit/ruler.test.ts` |
| CR-007 | Fixed | Mark lengths in the doc comment | `src/layout/kit/ruler.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (all 7 Resolved)
**Notes:**
- All seven findings are fixed and re-verified. CR-001's carried consequence (a refused division read as the default) and CR-003's shared end rule are Known Hazards on TICKET-002; CR-004's contrast-at-size and CR-005's number size are Known Hazards on TICKET-003.
- Re-verification: `pnpm generate` (no change), `lint`, `typecheck`, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size`, `publint`, `attw`, `audit` and `gener8v-state lint` exit 0. `pnpm test` (1,260 tests) exits 0 on three runs. Nine deliberate breaks of the fixes each fail a test.
