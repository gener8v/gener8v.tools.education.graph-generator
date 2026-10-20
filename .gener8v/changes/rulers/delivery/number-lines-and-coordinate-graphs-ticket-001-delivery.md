# TICKET-001: Build the ruler mark rule and the graded-mark drawing kit — Delivery Record

## Ticket Reference

**Ticket:** rulers/number-lines-and-coordinate-graphs/TICKET-001
**Change:** `.gener8v/changes/rulers/change.md` — Approved (Product Owner — Thomas Eaves, 2026-10-19) when delivery started
**Specification:** `.gener8v/specifications/number-lines-and-coordinate-graphs.md` (amended by `rulers`, approved 2026-10-20)
**Requirements Covered:**
- NLC-REQ-043: Number every whole unit from 0 at the start to the length at the end (kit part)
- NLC-REQ-044: A centimetre ruler has a mark at every millimetre (kit part)
- NLC-REQ-045: Half-centimetre marks longer than millimetre marks, whole-centimetre marks longer still (kit part)
- NLC-REQ-047: An inch ruler has a mark at every multiple of its smallest division (kit part)
- NLC-REQ-048: Inch marks graded by fraction (kit part)

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Graph-library NLC TICKET-001 delivered and reviewed (axis foundation) | done | `0b67415` on `main`; delivery record and three Approved reviews under `.gener8v/changes/graph-library/` | ✅ |
| Tick rule to follow: `k × spacing`, never a running sum; `isTickValue`; `drawableTicks` / `niceTicks` | present | `src/core/value-scale.ts` (`axisTick`, `isTickValue`, `drawableTicks`, `niceTicks`) | ✅ |
| `drawAxis` with a `RangeError` guard (`checkedLabels`) as the drawing model | present | `src/layout/kit/axis.ts` | ✅ |
| `drawAxis` refuses more than 100 ticks, so rulers cannot use it | `MAX_VALUE_TICKS` guard | `src/layout/kit/axis.ts` `checkedLabels` (graph-library NLC TICKET-001 SEC-004) | ✅ Confirms the ticket's hazard: a separate ruler bound |
| `linearScale`, `fmt`, `textWidth`, `DEFAULT_FONT_STACK` | present | `src/layout/kit/scale.ts`, `format.ts`, `text.ts` | ✅ |
| `defaultStyle.tickLength`, `lineWidths.tick`, `fontSizes.tickLabel`, `colors.line`/`text` | present | `src/core/style.ts` (tick length 6, tick width 1.5, tick label 12) | ✅ |
| `checkScene` for kit output | present | `src/layout/kit/check.ts` (`width` must be `SCENE_WIDTH`) | ✅ |
| Output files do not exist yet | absent | `src/core/ruler.ts`, `src/layout/kit/ruler.ts` absent; no `ruler` anywhere in `src/` | ✅ |
| Carried findings deferred to this ticket | none | No review in `rulers` yet. Graph-library NLC TICKET-001's reviews defer nothing to `rulers`; their lessons (decimal noise, tolerances above an ulp, guards on direct calls) are applied in the plan | ✅ |

**Resolved from ground truth (not escalated):**
- **Where the mark rule lives:** in core (`src/core/ruler.ts`), beside the tick rule, because the ruler definition's off-mark check (TICKET-002) must use it. This is graph-library NLC DEL-001's reasoning.
- **Mark width:** the default tick width (1.5 units) is wider than a millimetre on a 30 cm ruler drawn across the 400-unit space (about 1.2 units per millimetre). The mark width therefore has to follow the mark spacing (planned as a DEL).

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-10-20

### Planned Files

- `src/core/ruler.ts` (core, no React): the one mark rule.
  - Constants: `RULER_UNITS` (`centimeters`, `inches`); `INCH_DIVISIONS` (`half`, `quarter`, `eighth`, `sixteenth` → 2, 4, 8, 16 per inch); `DEFAULT_INCH_DIVISION` (`sixteenth`); `RULER_MAX_LENGTH` (30 cm, 12 in, provisional per OQ-009).
  - `divisionsPerUnit(unit, division?)`: 10 for centimetres, else the division's denominator; `undefined` for an unknown unit or division, or a division on a centimetre ruler.
  - `rulerMarks(unit, length, division?)`: each mark is `{ value: k / d, index: k, rank }`, counted before listing (d·L + 1). `undefined`, never throwing, for a ruler no validated description gives, like `drawableTicks`. The rank comes from the integer index: centimetres 0 whole, 1 half, 2 millimetre; inches 0 whole, 1 half, 2 quarter, 3 eighth, 4 sixteenth.
  - `isRulerMark(value, d)`: `value × d` within 1e-9 of an integer, so 0.7 and 2.3 cm are marks and 3.25 cm and 1.3 in at eighths are not.
  - `nearestRulerMarks(value, d)`: the drawn marks on either side, for TICKET-002's message (3.25 cm → 3.2 and 3.3).
- `src/layout/kit/ruler.ts`: the graded-mark drawing.
  - `RULER_MARK_LENGTHS` per unit per rank, strictly decreasing: centimetres 20, 14, 8; inches 22, 17, 13, 9.5, 6.5 units.
  - `drawRulerMarks({ from, to, unit, length, division?, side })`:
    - each mark perpendicular to the edge from `from` (0) to `to` (the length), on `side`, at `linearScale(value)`;
    - whole units numbered 0 to L, centered just past the whole marks, and no other text;
    - every number through `fmt()`, marks before numbers;
    - `RangeError` on options no validated ruler gives (points not finite; a length not a whole number from 1 to the maximum; an unknown unit or division);
    - never `drawAxis`.
- `tests/core/ruler.test.ts`: mark counts and values; ranks pinned for 0 to 1 cm and 0 to 1 in at each division; the is-a-mark cases (0.7, 2.3, 3.4 and 2.0625 at sixteenths pass; 3.25, 1.3 at eighths and 2.0625 at eighths fail); nearest marks; limits; `undefined` for invalid rulers; a property over every unit, division and length.
- `tests/layout/kit/ruler.test.ts`: marks within 0.5 units of `linearScale(value)` on horizontal and diagonal edges; marks perpendicular and strictly graded by rank; numbers only at whole units, 0 to L; `fmt()` on every number; the `RangeError` cases; the two largest rulers (301 and 193 marks) with clean `checkScene`.

Decisions to record:
- DEL-001: the rule lives in core, shared by validation and drawing.
- DEL-002: the mark width is the smaller of the default tick width and half the on-page mark spacing (the default 1.5 would merge millimetres on a 30 cm ruler at about 1.2 units per millimetre; there it is 0.63, and 0.99 on a 12 in ruler at sixteenths).
- DEL-003: mark membership is decided in index units (`value × d` rounded, with a 1e-9 allowance), and a mark's value is `k / d`, not `k × 0.1`, so 7/10 is exactly the double 0.7.

### How Acceptance Criteria Will Be Met

- Marks listed from unit, length and division, d·L + 1 of them, each `k / d`: `rulerMarks`; counts and values in `tests/core/ruler.test.ts`
- Ranks from the integer index: `rulerMarks`; pinned for 0 to 1 cm and 0 to 1 in at each division
- The is-a-mark predicate with an allowance and nearest marks, shared with TICKET-002: `isRulerMark`, `nearestRulerMarks`; the decimal-noise and off-mark cases
- Maximum lengths and mark lengths as named constants: `RULER_MAX_LENGTH`, `RULER_MARK_LENGTHS`; pinned by tests
- The drawing: perpendicular, proportional, strictly graded, whole units numbered, `fmt()` everywhere: `drawRulerMarks`; `tests/layout/kit/ruler.test.ts`
- The `RangeError` guard: `drawRulerMarks`; one test per case
- Marks counted before listing, and the largest rulers drawing cleanly: `rulerMarks` count check; 301- and 193-mark tests with `checkScene`

## Progress

- [x] `src/core/ruler.ts` — written, annotated
- [x] `src/layout/kit/ruler.ts` — written, annotated
- [x] `tests/core/ruler.test.ts` — 39 tests
- [x] `tests/layout/kit/ruler.test.ts` — 23 tests
- [x] `.gener8v/specifications/number-lines-and-coordinate-graphs.md` — `## @spec Coverage` rows

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/core/ruler.ts`: `RULER_UNITS`, `INCH_DIVISIONS`, `DEFAULT_INCH_DIVISION`, `RULER_MAX_LENGTH`, `RulerMark`, `RulerMarkRank`; `divisionsPerUnit(unit, division?)`, `rulerMarkRank(index, divisions)`, `rulerMarks(unit, length, division?)` (undefined, never thrown, for a ruler no description gives), `isRulerLength(unit, length)`, `isRulerMark(value, divisions)`, `nearestRulerMarks(value, divisions)`.
- `src/layout/kit/ruler.ts`: `RULER_MARK_LENGTHS` (centimetres 20, 14, 8; inches 22, 17, 13, 9.5, 6.5), `RulerMarksOptions`, `drawRulerMarks(options)`.
- `tests/core/ruler.test.ts`, `tests/layout/kit/ruler.test.ts`.
- `.gener8v/specifications/number-lines-and-coordinate-graphs.md`: `## @spec Coverage` rows for NLC-REQ-043..048 and NLC-REQ-053.

## Verification Run

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm generate` | 0 | no change to generated files (the ruler is not a registered type yet) |
| `pnpm lint` | 0 | — |
| `pnpm typecheck` | 0 | — |
| `pnpm test` (three runs) | 0 | 1,247 tests passed on each run, 62 of them new |
| `pnpm bench` | 0 | 7 passed |
| `pnpm build` | 0 | — |
| `pnpm check:dist` | 0 | no network APIs |
| `pnpm check:deps` | 0 | 0 runtime dependencies |
| `pnpm check:images` | 0 | — |
| `pnpm size` | 0 | every entry within its limit (the new modules are not in any entry yet) |
| `pnpm publint` | 0 | — |
| `pnpm attw` | 0 | — |
| `pnpm audit` | 0 | No known vulnerabilities found |
| `python3 …/gener8v-state.py lint` | 0 | 0 errors, 0 warnings |

Ten deliberate breaks, each made against a passing baseline and restored from memory, fail the new tests:
- values as `k × (1/d)`;
- exact membership (`Number.isInteger`);
- the half-centimetre rank on every second millimetre;
- the inch ranks shifted;
- a 31 cm maximum;
- the side ignored;
- numbers on half marks;
- a fixed mark width;
- no side guard;
- two equal mark lengths.

The exact-membership break first passed. Written decimals are exact once multiplied (see DEL-003), so a test with computed values (`0.1 + 0.2`) was added, and the break then failed it.

## Acceptance Criteria Verification

- [x] A core function lists a ruler's marks from unit, whole length and division: 10L + 1 or dL + 1, each `k / d` — "has a mark at every millimetre…", "has a mark at every multiple of an inch ruler's smallest division", and the property "ranks every whole unit 0…" (value `i / d` at index `i`) in `tests/core/ruler.test.ts`
- [x] Each mark has a rank from its index; ranks pinned for 0–1 cm and 0–1 in at each division — "ranks 0 to 1 cm…", "ranks 0 to 1 in at sixteenths…", "ranks 0 to 1 in at %ss…"
- [x] A core predicate with a noise allowance, and nearest marks, which TICKET-002 will use — "counts %d as a mark…", "counts a mark a caller's code computed…", "does not count %d as a mark…", "names the marks on either side…"; `isRulerMark` and `nearestRulerMarks` are exported from `src/core/ruler.ts`
- [x] Maximum lengths and mark lengths as named constants, documented — `RULER_MAX_LENGTH` ("states the provisional maximum lengths"), `RULER_MARK_LENGTHS` ("keeps each unit's lengths strictly decreasing by rank")
- [x] The drawing: marks perpendicular, on one side, at `linearScale(value)` within 0.5 units, lengths strictly decreasing by rank, whole units numbered 0 to L and nothing else, `fmt()` on every number — "puts each mark's foot within 0.5 units…" (horizontal, vertical, diagonal), "runs every mark perpendicular…", "draws each mark at its rank's length…", "numbers every whole unit from 0 to the length, and nothing else", "centres each number on its whole mark…", "passes every number through fmt()"
- [x] `RangeError` on options no validated ruler gives — "throw on %s rather than drawing it" (nine cases)
- [x] Marks counted before listing; 301- and 193-mark rulers draw with clean `checkScene` — "draw the two largest rulers cleanly" and "lists the two largest rulers"

## Decisions Made

### DEL-001: The mark rule lives in core, in `src/core/ruler.ts`

**Context:** The ruler definition (TICKET-002) must report an object end that is not a drawn mark, and the layout draws the marks. If the two used different rules, the check could accept an end the drawing does not mark.
**Decision:** Units, divisions, maximum lengths, the mark listing and the is-a-mark predicate live in core; the layout kit imports them.
**Rationale:** This repeats graph-library NLC DEL-001 (the tick rule in `src/core/value-scale.ts`). Core may not import layout, and the validator is core.
**Ticket Impact:** As the ticket's Output declared.

### DEL-002: A mark's width follows the space between marks

**Context:** The default tick width is 1.5 units. A 30 cm ruler drawn across 360 units has 1.2 units per millimetre, so 1.5-unit marks would merge into a solid band.
**Decision:** Every mark is drawn at the smaller of the default tick width and half the on-page space between neighbouring marks. That gives 0.6 units for 30 cm over 360 units, 0.94 for 12 in at sixteenths, and the default 1.5 for shorter rulers.
**Rationale:** At half the pitch, marks and gaps are equal, so millimetres stay countable at any rendered size. The marks stay in the line color, so contrast (CC-002 1.4.11) is unchanged.
**Ticket Impact:** None on the interface. TICKET-003 decides the edge length and so the final width.

### DEL-003: Mark membership is decided in index units, and a mark's value is `k / d`

**Context:** The ticket's hazard said 0.7 × 10 is 7.000000000000001. In fact every decimal written to one place from 0.0 to 30.0, times 10, is exactly a whole number. Noise comes from values the caller's code computes, such as 0.1 + 0.2 = 0.30000000000000004.
**Decision:** `isRulerMark(value, d)` rounds `value × d` and accepts it within 1e-9 (in marks). Mark values are `index / d`, so the seventh millimetre is exactly the double written 0.7.
**Rationale:** The allowance is far below one mark (a tenth of a millimetre would be 0.1 in index units) and absorbs computed noise. Dividing an integer by d gives the closest double to the decimal, which `k × 0.1` does not (7 × 0.1 is 0.7000000000000001).
**Ticket Impact:** None; the ticket's example of noise is corrected here (see Notes).

## Deviations from Plan

- **Mark widths:** the plan estimated widths of 0.63 and 0.99 over a 380-unit edge. The tests draw over 360 units and pin 0.6 and 0.94. The rule is unchanged, and the final width depends on the edge TICKET-003 chooses.
- **A test the plan did not list:** "counts a mark a caller's code computed with decimal noise" (DEL-003), added after the exact-membership break passed the planned cases.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| NLC-REQ-043 | `src/layout/kit/ruler.ts`:drawRulerMarks | `@spec NLC-REQ-043, NLC-REQ-044, NLC-REQ-045, NLC-REQ-047, NLC-REQ-048` |
| NLC-REQ-044 | `src/core/ruler.ts`:divisionsPerUnit, rulerMarks; `src/layout/kit/ruler.ts`:drawRulerMarks | `@spec NLC-REQ-044, NLC-REQ-046, NLC-REQ-047`; `@spec NLC-REQ-044, NLC-REQ-045, NLC-REQ-047, NLC-REQ-048` |
| NLC-REQ-045 | `src/core/ruler.ts`:rulerMarkRank, rulerMarks; `src/layout/kit/ruler.ts`:drawRulerMarks | `@spec NLC-REQ-045, NLC-REQ-048` |
| NLC-REQ-047 | `src/core/ruler.ts`:divisionsPerUnit, rulerMarks; `src/layout/kit/ruler.ts`:drawRulerMarks | as above |
| NLC-REQ-048 | `src/core/ruler.ts`:rulerMarkRank, rulerMarks; `src/layout/kit/ruler.ts`:drawRulerMarks | as above |

Two annotations name requirements that TICKET-002 covers, because the rule they rely on is here:
- NLC-REQ-046 on `divisionsPerUnit` (the divisions and their default);
- NLC-REQ-053 on `isRulerMark` (the one rule for an object end on a mark).

TICKET-002 annotates the definition that uses them.

## Notes

- **Correction for TICKET-002 and TICKET-003:** the ticket's hazard example "0.7 × 10 is 7.000000000000001" is wrong. Written one-place decimals are exact once multiplied. The allowance matters for computed values (0.1 + 0.2). Still, never test membership with `Number.isInteger(value × 10)` or `value * 10 % 1`: use `isRulerMark`.
- **For TICKET-002:**
  - `divisionsPerUnit("centimeters", division)` returns undefined when a division is given, so the definition must report the division (GSV-REQ-051) before reading marks.
  - `rulerMarks` returns undefined for any ruler the validator refuses, so a domain check can call it safely, as checks call `drawableTicks`.
- **For TICKET-003:**
  - `drawRulerMarks` draws marks and numbers only, not the ruler's body or edge line.
  - Numbers sit centred past the whole marks on `side`, so the body must be deep enough to hold the longest mark (22 units) plus a number (about 15 units).
  - The "0" and the last number overhang the edge's ends by half their width.

## Post-Review Amendments

### Code review — `rulers/number-lines-and-coordinate-graphs-ticket-001-code-review` (2026-10-20, Approved)

- **CR-001:** only an absent division takes the default. `divisionsPerUnit("inches", null)` is now undefined, so `rulerMarks` and `drawRulerMarks` refuse `null` on both units, with tests.
  - **Correction to the Notes:** a division the validator refuses reaches domain checks as absent, so `divisionsPerUnit` and `rulerMarks` read it as a sixteenth. They do not return undefined for every refused ruler.
  - A Known Hazard on TICKET-002 says to skip the off-mark check while the division is reported.
- **CR-002:** annotations follow one rule: annotate where the rule a later ticket relies on lives.
  - `isRulerLength` carries `@spec NLC-REQ-042`.
  - `nearestRulerMarks` carries `@spec NLC-REQ-053`.
  - The new `isOnRuler` and `rulerMarkIndex` carry NLC-REQ-052 and NLC-REQ-053.
  - Every partial coverage row now says "(kit; drawn with rulers NLC TICKET-003)" or "(rule; checked with rulers NLC TICKET-002)".
- **CR-003:** a computed end within noise of 0 or of the length is now on the ruler and on its end mark:
  - `isOnRuler(value, length, divisions)` and `rulerMarkIndex(value, length, divisions)` in `src/core/ruler.ts` share `MARK_NOISE` with `isRulerMark`;
  - `nearestRulerMarks` says it does not clamp, and never returns −0.
  - A Known Hazard on TICKET-002 says to check both with them. It also corrects that ticket's "0.7 × 10" example.
- **CR-004:** marks are never narrower than `RULER_MIN_MARK_WIDTH` (0.25), so no width rounds to 0. Tested on a 30 cm ruler over a 2-unit edge.
  - **Correction to DEL-002:** contrast holds for the line color (15.9:1). A sub-pixel mark's rendered contrast depends on the size the ruler is shown at, and is TICKET-003's to decide.
  - A Known Hazard on TICKET-003 gives the reviewer's estimates (about 320 px for 30 cm, about 205 px for 12 in at sixteenths).
- **CR-005:** `RulerMarksOptions.fontSize` (optional, read own-key, a finite number above 0) sets the numbers' size, defaulting to 12.
  - Tested: at 12 a 30 cm ruler's numbers overlap across 360 units, and at 9.5 none do.
  - A Known Hazard on TICKET-003 says to size them from the length and test no overlap.
- **CR-006:** a deterministic test draws the 30 cm and 12 in (sixteenths) rulers on the horizontal, vertical and diagonal edges and checks every mark within 0.5 units.
- **CR-007:** `RULER_MARK_LENGTHS`' doc comment states the lengths.
- **Re-verification:** `pnpm generate` (no change), `lint`, `typecheck`, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size`, `publint`, `attw`, `audit` and `gener8v-state lint` exit 0. `pnpm test` (1,260 tests) exits 0 on three runs. Nine deliberate breaks of the fixes each fail a test:
  - `null` taking the default;
  - no noise at the ends;
  - the index skipping the range;
  - −0 kept;
  - no width floor;
  - the font size ignored, read through the prototype, or unchecked;
  - a position shift on the largest rulers.
