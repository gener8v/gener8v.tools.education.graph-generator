# TICKET-001: Build the ruler mark rule and the graded-mark drawing kit

**Change:** rulers
**Capability Area:** Number Lines & Coordinate Graphs (number-lines-and-coordinate-graphs)
**Specification:** specifications/number-lines-and-coordinate-graphs.md

**Summary:** Add the one rule that says where a ruler's marks fall and how long each one is: every millimetre on a centimetre ruler, with longer half-centimetre and whole-centimetre marks, and every multiple of the smallest division on an inch ruler, with lengths graded by fraction. Also add the layout kit function that draws those marks and numbers the whole units along a line. Validation and layout both use this rule.
**Priority:** Must
**Value:** Rulers in either unit have marks that are exact and graded the same way everywhere they are drawn or checked, and the ruler type can be built on them.

**Requirements Covered:**
- NLC-REQ-043: Number every whole unit from 0 at the start to the length at the end (kit part; the type wires it in TICKET-003)
- NLC-REQ-044: A centimetre ruler has a mark at every millimetre (kit part)
- NLC-REQ-045: Half-centimetre marks longer than millimetre marks, whole-centimetre marks longer still (kit part)
- NLC-REQ-047: An inch ruler has a mark at every multiple of its smallest division (kit part)
- NLC-REQ-048: Inch marks graded by fraction: whole, half, quarter, eighth, sixteenth (kit part)

**Prior Art:**
- Read: `.gener8v/specifications/number-lines-and-coordinate-graphs.md` — Functional Requirements → Rulers (NLC-REQ-040..056), Behaviors & Rules → Rulers (no tick spacing, so the 100-tick limit does not apply; only whole units are numbered; provisional maximum lengths 30 cm and 12 in, OQ-009)
- Read: `.gener8v/technical-design/system-design.md` — AD-002 (layout → Scene), AD-007 (fixed drawing space, `fmt()` on every number), AD-010 (estimated text metrics)
- Read: `src/core/value-scale.ts` — produced by `graph-library/number-lines-and-coordinate-graphs/TICKET-001`. The axis tick rule is the pattern to follow: each tick is `k × spacing` for an integer `k` and never a running sum (`axisTick`); `isTickValue` is the one matching rule shared by checks and layout; `drawableTicks` never throws, while `niceTicks` does.
- Read: `src/layout/kit/axis.ts`, `src/layout/kit/ticks.ts` — `drawAxis` (perpendicular ticks, labels clear of the line, `checkedLabels` guard) is the model for the drawing function
- Read: `src/layout/kit/scale.ts` (`linearScale`), `src/layout/kit/format.ts` (`fmt`), `src/layout/kit/text.ts` (`textWidth`, `DEFAULT_FONT_STACK`), `src/core/style.ts` (`defaultStyle.tickLength`, line widths, font sizes)
- Read: `.gener8v/changes/graph-library/delivery/number-lines-and-coordinate-graphs-ticket-001-delivery.md` and its three reviews under `.gener8v/changes/graph-library/reviews/number-lines-and-coordinate-graphs-ticket-001-*.md` — the arithmetic traps already found there (decimal noise, ticks off the range, flaky tolerances)

**Acceptance Criteria:**
- [ ] A core function lists a ruler's marks from its unit, its whole-number length and (for inches) its smallest division: a centimetre ruler of length L has 10L + 1 marks; an inch ruler of length L marked to 1/d has dL + 1 marks. Each mark's value is `k / d` for an integer `k`, never a running sum
- [ ] Each mark has a rank: on a centimetre ruler, whole centimetre, half centimetre or millimetre; on an inch ruler, whole inch, half, quarter, eighth or sixteenth, from the largest fraction its index divides by. Tests pin the ranks for 0 to 1 cm and for 0 to 1 in at each smallest division
- [ ] A core predicate says whether a value is one of a ruler's marks, within a stated allowance for decimal noise, so 0.7 cm and 2.3 cm (which are not exact in binary) count as marks and 3.25 cm and 1.3 in (marked to eighths) do not. It also gives the nearest marks on either side, for the issue message. TICKET-002's check and this ticket's drawing both use it
- [ ] The maximum lengths (30 cm and 12 in, provisional per OQ-009) and the mark lengths per rank are named constants in one place, and the doc comments state them
- [ ] A layout kit function draws the marks along a line from `from` to `to`: each mark perpendicular to the line on one side, at its proportional position (`linearScale`), with a length that strictly decreases with rank. It numbers every whole unit from 0 to the length, and draws no number on any other mark. Every emitted number passes through `fmt()`
- [ ] The drawing function throws `RangeError` on options no validated ruler gives (non-finite points, a length not a whole number from 1 to the maximum, an unknown unit or division), like `drawAxis`
- [ ] Marks are counted before they are listed. A 30 cm ruler (301 marks) and a 12 in ruler at sixteenths (193 marks) draw with clean `checkScene` results

**Output:**
- `src/core/ruler.ts` — the mark rule: `RULER_UNITS`, the inch divisions and their default, the maximum length per unit, the mark listing with ranks, the is-a-mark predicate with nearest marks. It stays in core because the validator uses it, as the tick rule does (graph-library NLC DEL-001)
- `src/layout/kit/ruler.ts` — the graded-mark drawing function and the mark lengths per rank
- `tests/core/ruler.test.ts` — mark counts, values, ranks, the is-a-mark predicate (decimal-noise cases, off-mark cases, nearest marks), limits
- `tests/layout/kit/ruler.test.ts` — mark positions within 0.5 units of `linearScale(value)`, perpendicular marks, strictly graded lengths, numbers on whole units only, `fmt()` on every number, the `RangeError` guard, the maximum rulers

**Constraints:**
- prd/TC-001, prd/TC-002: pure layout with no DOM measurement, and `fmt()` on every number
- prd/TC-005: `src/core/ruler.ts` imports no React and no browser global

**Known Hazards:**
- Do NOT draw ruler marks with `drawAxis`. Since `graph-library/number-lines-and-coordinate-graphs-ticket-001-security-review/SEC-004`, `drawAxis` throws on more than 100 ticks (`MAX_VALUE_TICKS`), and a 30 cm ruler has 301 marks. A ruler has no tick spacing, so the axis's 100-tick limit does not apply to it (spec, Behaviors & Rules → Rulers). Its length maximum bounds the mark count instead. Keep a separate bound for the ruler, and keep `drawAxis` unchanged.
- Decimal noise: 0.7 × 10 is 7.000000000000001 in binary. Decide "is this a mark?" by rounding `value × d` to the nearest integer and comparing within an allowance, as `isTickValue` does. Never use `Number.isInteger(value × d)`. Inch fractions (multiples of 1/16) are exact in binary; millimetres are not.
- The rank comes from the mark's integer index, never from its decimal value. On an inch ruler marked to 1/d, index `k` is a whole inch when `d` divides `k`, a half when `d/2` divides it, and so on. On a centimetre ruler, `k` is a whole centimetre when 10 divides it, and a half when 5 divides it.
- A ruler's numbers are drawn only at whole units, and the length itself is the last number. The object's length is never written (NLC-REQ-055); that is TICKET-003's concern, but this kit must not add any other text.
- Graph-library NLC TICKET-001's three reviews found flaky property tests whose tolerance was below the rounding of their own expected values (QR-001, and the QR-002 fix in the security review). Give every geometric tolerance room for the expected value's own rounding.

**Depends On:** None
**Blocks:** TICKET-002, TICKET-003

**Size:** Medium

**Notes:** Builds on `graph-library/number-lines-and-coordinate-graphs/TICKET-001` (delivered and reviewed). The specification states a ruler's marks "build on the shared axis and tick behavior": whole multiples, and positions proportional to value. Reuse `linearScale`, `fmt` and the text estimates, not `niceTicks` or `drawAxis`.
