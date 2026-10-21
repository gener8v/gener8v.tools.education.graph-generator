# TICKET-002: Define the ruler graph type: terms, checks and text alternative — Quality Review

## Summary

I reviewed the ruler definition as it stands at HEAD (`0b24c7f`, after the code review was resolved; delivery `61373bc`). The code is small and well organised, follows the definition contract the other types use, and reads clearly. Lint, typecheck and build pass, and the full suite passes on three runs. The findings concern what the tests do not pin and what the next ticket inherits:
- two guards on the object's order can be deleted without a failing test: the `ordered` pair, and `objectInOrder`'s `optionalInputs`. Without the second, the order check reads marks of a division the caller did not ask for (QR-001);
- the definition is not built by a side-effect-free factory, as the pictograph, line graph and bar graph are. Once TICKET-003 registers it, it stays in every other type's bundle: about 2.3 kB gzip in a simulated circle-only consumer (QR-002);
- for a start on the ruler's last mark, the order issue asks for an end past the ruler (QR-003);
- a placeholder field in `describe`'s unit table, and test details (QR-004, QR-005).

There are 5 findings: 0 Critical, 2 Concerns and 3 Suggestions.

**Reviewer:** `quality-reviewer` agent, fresh context (findings phase only, 2026-10-21)
**Delivery Record:** `.gener8v/changes/rulers/delivery/number-lines-and-coordinate-graphs-ticket-002-delivery.md` (DEL-001 to DEL-004, and the Post-Review Amendments from the code review)
**Code review read first:** `.gener8v/changes/rulers/reviews/number-lines-and-coordinate-graphs-ticket-002-code-review.md` (Approved). Its CR-001 to CR-008 are not raised again.
- QR-001's first mutation is the code review's spot-check (removing `ordered` fails no test), which it left to this review. It still holds at HEAD.
- QR-003 is about the range CR-005 introduced, in a case CR-005 did not cover (a start on the ruler's last mark).

**Files Reviewed:**
- `src/core/definitions/ruler.ts`
- `src/core/issues.ts` (the `not_on_mark` additions)
- `examples/ruler.json`
- `examples/invalid/ruler-object-between-marks.json`
- `examples/invalid/ruler-unknown-unit.json`
- `tests/core/ruler-definition.test.ts`
- `tests/core/definitions.test.ts` (the ruler block and the condition rule)
- `tests/core/issues.test.ts` (the code list, the sample and the message snapshot)
- Read for pattern consistency, unchanged here:
  - `src/core/definitions/circle.ts`, `pictograph.ts`, `line-graph.ts`, `bar-graph.ts`, `axis.ts`, `categories.ts`, `shared.ts`, `types.ts`, `index.ts`;
  - `src/core/ruler.ts`, `src/core/format.ts`, `src/core/schema.ts` (`ordered`);
  - `src/core/validate/domain.ts`, `state.ts`, `structure.ts` (`ordered`), `index.ts`;
  - `tests/core/line-graph.test.ts`, `bar-graph.test.ts`, `pictograph.test.ts`, `tests/package/per-type-bundle.test.ts`;
  - `tsup.config.ts`, `.size-limit.json`, `package.json`, `src/entries/circle.ts`, `dist/circle.js` (its chunk imports).
- Read for what the consumers need: `rulers/number-lines-and-coordinate-graphs/TICKET-003`, including the Known Hazards this delivery and its code review added.

**Findings:** 5
**Critical:** 0 | **Concerns:** 2 | **Suggestions:** 3

## Quality Assessment

### Code Organization

**Rating:** Adequate
**Notes:**
- One file holds the ruler's type, terms, checks and text alternative, in the order the other definitions use.
- Imports run one way: from the mark rule (`src/core/ruler.ts`), `format`, `issues`, `shared` and `types`. `format` imports nothing, so no cycle is possible.
- After CR-008 the checks each do one thing:
  - `lengthFitsUnit` checks the length;
  - `endOnMark(term)` checks one end, and is a factory, so both ends share one body;
  - `objectInOrder` checks the order of two marks.
- `scaleOf` is the one place the checks and `describe` build the ruler, so validation and the text alternative use the same marks.
- `not_on_mark` is added everywhere the code set needs it: the code list, `issueDocs`, the params and the template. `Templates` and `satisfies` make each of these a compile error if missed.
- The definition is not registered (DEL-002). The tests reach it through a registry holding only it.
- The gap is how the definition is built. Unlike every non-circle definition, it is not in a side-effect-free factory (QR-002).
- Performance: `scaleOf` builds at most 301 frozen marks, and runs at most four times for one description (three checks and `describe`). That is bounded by the length limit and small, so there is no finding.
- `Object.keys(INCH_DIVISIONS) as [InchDivision, ...InchDivision[]]` casts where `src/core/validate/structure.ts:77` uses `asTerms(…)`. That is harmless for a frozen four-key table, so it is not raised.

### Readability

**Rating:** Strong
**Notes:**
- Names read as English and match the vocabulary: `lengthFitsUnit`, `endOnMark`, `objectInOrder`, `markValue`, `scaleOf`. Each check's `name` is a sentence.
- Doc comments give the reason for each choice, with the decision or finding behind it: DEL-004 for the unbounded ends, CR-002 for the unbounded length, CR-008 for the split.
- The longest function is `describe`, at 23 lines, with one branch per unit and one for the object.
- The blank-title rule in `describe` is the fifth copy across the definitions (circle, pictograph, line graph, bar graph). That is consistent with the codebase, so it is not raised here.
- One table entry is a placeholder, and one normalization the next ticket relies on is undocumented (QR-004).

### Error Handling

**Rating:** Adequate
**Notes:**
- Checks return issues and never throw. Every issue is built with `createIssue`.
- `rulerScale` returns `undefined` for a ruler that failed, and every check and `describe` guards it.
- `validateWith` turns any exception into `internal_error`, and `assertIssue` refuses a malformed issue (`src/core/validate/domain.ts:10-15`).
- Messages name the term and the fix:
  - exact marks either side (CR-001);
  - the unit's own length range (CR-002);
  - the next mark for the same mark written two ways (CR-005).
- Off the ruler wins over between marks, so one fault gives one issue.
- An order fault gets one of two messages, both true:
  - a numerically equal or reversed pair gets the structure stage's shared `ordered` wording ("greater than 2");
  - the same mark written two ways gets the domain check's wording ("at least 0.4").
- The gap: for a start on the ruler's last mark, the domain message asks for an end that cannot exist (QR-003).

### Test Coverage

**Rating:** Adequate
**Notes:**
- **Commands run** (from `context.md`'s `## Repositories` row for `.`: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`):

  | Command | Exit | Result |
  |---------|------|--------|
  | `pnpm lint` | 0 | no problems |
  | `pnpm typecheck` | 0 | no errors |
  | `pnpm test`, run as `npx vitest run --no-cache`, three runs | 0, 0, 0 | 48 files and 1,340 tests passed on each run |
  | `pnpm build` | 0 | built |
  | `npx vitest run --no-cache tests/core/ruler-definition.test.ts tests/core/definitions.test.ts tests/core/issues.test.ts --reporter=verbose` | 0 | 3 files, 106 tests |

- Not run, by instruction: `pnpm generate` and `pnpm size`.
- **What the tests cover:**
  - `tests/core/ruler-definition.test.ts` holds 36 tests, counting each `it.each` row: terms, units, lengths on both units, the division's condition, the top-level label, ends on, off and between marks, computed noise, both ends in one pass, the text alternative and the examples.
  - `tests/core/definitions.test.ts` holds the ruler to the vocabulary, stage, applicability, consistency and condition rules explicitly.
  - `tests/core/issues.test.ts` pins `not_on_mark`'s place in the code list and its message, with a 5-digit mark.
- **Quality:** the tests go through the public `validateWith` and check behaviour (code, path, `range`, message), not internals. Messages are pinned exactly where the wording is the requirement (CR-001, CR-002, CR-005). The computed-noise cases cover the inputs DEL-004 chose to accept.
- **Mutations:** four were run on `src/core/definitions/ruler.ts`, each restored from memory in a Python try/finally. Only the three files above import the definition, so the 106 tests are every test that can see it.
  - Two are killed: `optionalInputs` removed from `endOnMark`, and a `max` added to the order range.
  - Two survive: `ordered` removed, and `optionalInputs` removed from `objectInOrder` (QR-001).
- Smaller gaps in the test file: an `as never` cast, overclaiming titles, and generated names (QR-005).

### Observability & Operability

**Rating:** Adequate
**Notes:**
- `src/core` is a pure library with no logger anywhere, by design, so no logging is expected here.
- The error surface is the issue list: a stable `code`, a JSON Pointer `path`, and a message that names the term and the fix.
- The new `not_on_mark` is documented in `issueDocs`, so a caller can branch on it.
- An exception in a check becomes one `internal_error` and is never swallowed.
- `below` and `above` reach the caller only in the message (DEL-003). The code review considered this (CR-001), so it is not raised again.
- Nothing to flag.

## Findings

### QR-001: Two guards on the object's order are unpinned: deleting the `ordered` pair, or `objectInOrder`'s `optionalInputs`, passes every test

**Category:** Testing
**Severity:** Concern
**Location:** `src/core/definitions/ruler.ts:112` (`ordered: [["start", "end"]]`), `src/core/definitions/ruler.ts:165` (`objectInOrder`'s `optionalInputs`); `tests/core/ruler-definition.test.ts:121-135`, `tests/core/ruler-definition.test.ts:171-176`
**Description:** Each of two mutations, restored from memory in a Python try/finally, passes all 106 tests in the three delivered test files. Only these files import the ruler definition.
- **`ordered` removed.**
  - 2→2 and 5→3 are then reported by `objectInOrder` instead of the structure stage. The code and path are the same, and the test checks only those (`found(…)`, `:122-123`). Only the message changes: "measuredObject.end must be a number greater than 2; got 2." becomes "… at least 2.1; got 2.".
  - An end between marks and before its start changes code. For 5→3.25, `out_of_range` at `/measuredObject/end` becomes `not_on_mark`. No test has that case.
  - The code review's spot-check found the same, and left it to this review.
- **`optionalInputs` removed from `objectInOrder`.** The order check then runs when the division was refused or does not apply, using the default sixteenths. Probed on modified copies of the definition, not the file:
  - `{ rulerUnit: "inches", smallestDivision: "eighths", measuredObject: { start: 2.0625, end: 2.0625 + 1e-12 } }` gains "measuredObject.end must be a number at least 2.125; got 2.062500000001." next to the division's `wrong_kind`;
  - a centimetre ruler with `smallestDivision: "eighth"` and ends 0.3 and 0.1 + 0.2 gains "at least 0.4" next to `inapplicable_property`.
  - The wrong-marks test (`:171-176`) exercises only `endOnMark`'s copy of the guard. CR-008's split made two checks that read the marks, and only one of them is pinned.
- For comparison, two other mutations each fail a test: removing `optionalInputs` from `endOnMark`, and adding a `max` to the order issue's range.

**Impact:**
- `ordered` carries NLC-REQ-051 (code review CR-004). The published schema states it as "end must be greater than start." (`src/core/schema.ts:66`), and the vocabulary as `ordered` (`src/core/schema.ts:268`). Until TICKET-003 registers the ruler and regenerates the schema, it can be deleted without a failing test.
- Without its `optionalInputs`, the order check brings back the fault NLC TICKET-001's CR-001 fixed: a check reading the marks of a division nobody asked for. It then reports an issue that follows from another issue (AD-004).

**Recommendation:**
- Pin the structure stage's order issue: 2→2 gives "measuredObject.end must be a number greater than 2; got 2." with `range: { min: 2, exclusiveMin: true }`.
- Add 5→3.25, which gives `out_of_range` at `/measuredObject/end` and no `not_on_mark`.
- Add the two same-mark cases above to the wrong-marks test. Each must give only its division issue.

**Status:** Fixed
**Resolution:** Approved: Pinned 2→2's structural issue in full, added 5→3.25 (order only), and added the refused- and inapplicable-division same-mark cases to the wrong-marks test.

---

### QR-002: The ruler definition is not built by a side-effect-free factory, so once registered it stays in every other type's bundle

**Category:** Patterns
**Severity:** Concern
**Location:** `src/core/definitions/ruler.ts:27`, `src/core/definitions/ruler.ts:32` (the `Object.freeze` word tables), `src/core/definitions/ruler.ts:54` (`rulerProperties = defineProperties(…)`), `src/core/definitions/ruler.ts:184-223` (`ruler`, with `endOnMark(…)` calls in `checks`). Compare `src/core/definitions/pictograph.ts:75-83`, `src/core/definitions/line-graph.ts:108-115`, `src/core/definitions/bar-graph.ts:70-77` and `src/core/definitions/axis.ts:28`.
**Description:**
- **The pattern.** Every definition except the circle's is built as `/* @__PURE__ */ defineX()`, by a function marked `/* @__NO_SIDE_EFFECTS__ */` that builds its properties map inside it. The reason is in `pictograph.ts:77-81`: "so a bundle that never reads the definition (the circle's, through the definitions module) drops it" (DGP TICKET-004 code review CR-004, DGP TICKET-005 DEL-002).
- **What the ruler has instead.** Module-level calls that a bundler must keep:
  - `defineProperties(…)`, whose argument also calls `Object.keys(…)`;
  - two `Object.freeze(…)` calls, for the word tables;
  - `endOnMark("start")` and `endOnMark("end")`, called inside the definition literal.
- **Why it matters once registered.** The built `./circle` entry imports the shared chunks that hold the definitions registry (`dist/circle.js` imports `chunk-6LBCLFQU.js` and `chunk-ZOTTTH66.js`, which hold the registry and the pictograph). Once TICKET-003 adds the ruler to the registry, these calls land in a chunk the circle reaches.
- **Simulation.** I bundled a registry of the circle, pictograph and ruler as one chunk with esbuild, then bundled a minified consumer that imports only `circle` from it. This ran in the scratchpad, with no source changed:
  - without the ruler: 7,335 B gzip;
  - with the delivered ruler: 9,603 B gzip. The bundle holds `rulerUnit`, `measuredObject`, the value descriptions ("Numbered every …") and `describe`'s tables. The pictograph is dropped, as its factory intends;
  - with a copy of `ruler.ts` built the pictograph's way: 7,807 B gzip, and no ruler definition. The remaining 472 B are `src/core/ruler.ts`'s `Object.freeze` tables without annotations (`INCH_DIVISIONS`, `RULER_MAX_LENGTH`; NLC TICKET-001's file).

**Impact:**
- This works against AD-001, CPSE-REQ-004 and prd/TC-007 ("importing one graph type must not bring in the others"). `tests/package/per-type-bundle.test.ts` guards that rule for each type.
- That test looks for "A pictograph", "A line graph" and "A bar graph" in the other types' bundles, but not "A ruler". So nothing would fail. Every per-type entry would grow by about 2.3 kB gzip, roughly 9% of its 25 kB budget in `.size-limit.json`.
- TICKET-003's Known Hazards do not mention it.

**Recommendation:**
- Build `ruler` as `/* @__PURE__ */ defineRuler()`, with `defineRuler` a `/* @__NO_SIDE_EFFECTS__ */` function that builds the properties map inside it, as `pictograph.ts` does.
- Mark `endOnMark` `/* @__NO_SIDE_EFFECTS__ */`, and mark the two word tables `/* @__PURE__ */` (or move them into `describe`'s scope).
- Either here, or in TICKET-003 through a Known Hazard on its ticket file:
  - add "A ruler" to the exclusions in `tests/package/per-type-bundle.test.ts`;
  - annotate `src/core/ruler.ts`'s `Object.freeze` tables.

**Status:** Fixed
**Resolution:** Approved: `ruler = /* @__PURE__ */ defineRuler()`. `defineRuler`, `defineRulerProperties` and `endOnMark` are `/* @__NO_SIDE_EFFECTS__ */`, and the word tables are `/* @__PURE__ */`. The shared-chunk simulation gives 7,791 B gzip with no ruler. A Known Hazard on TICKET-003 covers `src/core/ruler.ts`'s tables and "A ruler" in the per-type bundle test. The coverage rows name `defineRulerProperties`.

---

### QR-003: For a start on the ruler's last mark, the order issue asks for an end past the ruler ("at least 15.1" on a 15 cm ruler)

**Category:** Error Handling
**Severity:** Suggestion
**Location:** `src/core/definitions/ruler.ts:173-174` (`nextMark`, `range: { min: nextMark }`); `tests/core/ruler-definition.test.ts:121-135`
**Description:**
- `objectInOrder` reports the end with `range: { min: (start.index + 1) / marksPerUnit }`. When the start is the ruler's last mark, that next mark is past the ruler. Probes on a 15 cm ruler:
  - start 15, end 15.000000000000002: "measuredObject.end must be a number at least 15.1; got 15.000000000000002.";
  - start 14.999999999999998, end 15: "measuredObject.end must be a number at least 15.1; got 15.".
- An end of 15.1 is then `out_of_range`, "between 0 and 15".
- The range also never states the ruler's end, although `out_of_range`'s `range` is documented as "the allowed range of the value at the issue's path" (`src/core/issues.ts:134-135`). Even in the ordinary same-mark case, that range is 0.4 to 15, not "at least 0.4".

**Impact:**
- This is rare. Only computed ends reach this check, since exactly equal ends are the structure stage's. This case also needs a start at the ruler's end.
- But the one message the caller gets cannot be satisfied. A model correcting its description from the message (GSV-REQ-031) goes round twice.
- `narrowRange` in `src/core/definitions/axis.ts:83-97` already solves the same problem for axes: when the suggested `max` would pass the limit, it reports the `min` instead.

**Recommendation:**
- Give the range as `{ min: nextMark, max: ruler.length }`.
- When `nextMark` is past the length, report the start instead, with `{ min: 0, max: (end.index - 1) / marksPerUnit }`, as `narrowRange` does.
- Test both cases at a 15 cm ruler's end.

**Status:** Fixed
**Resolution:** Approved: The range is `{ min: next mark, max: length }`. At the ruler's last mark the start is reported instead, with `{ min: 0, max: the mark before the end }`. Tested at a 15 cm ruler's end.

---

### QR-004: `UNIT_WORDS.smallest` holds an empty string for inches, a placeholder `describe` must know not to read, and `MeasuredObject.color` does not say it is resolved

**Category:** Readability
**Severity:** Suggestion
**Location:** `src/core/definitions/ruler.ts:26-30` (`UNIT_WORDS`), `src/core/definitions/ruler.ts:205-208` (`marked`), `src/core/definitions/ruler.ts:12` (`MeasuredObject.color`)
**Description:**
- **`smallest`.** It means something only for centimetres ("millimeters"). For inches it is `""`, and `describe` branches on the unit to read `DIVISION_WORDS` instead.
  - The table's type cannot express this. Code that read `words.smallest` for both units would compile, and would print "marked to " for every inch ruler.
  - The branch also repeats `words.singular` as literal text: "numbered every centimeter", "numbered every inch".
- **`MeasuredObject.color`.** It has no note that a validated color is a resolved `#rrggbb` (probe: "orange" normalizes to `#b36b00`).
  - `LineSeries.lineColor` and `BarGraph`'s colors do have that note (`src/core/definitions/line-graph.ts:13`, `src/core/definitions/bar-graph.ts:21`, `src/core/definitions/bar-graph.ts:25`).
  - TICKET-003's layout will read this field.

**Impact:** Small. One field's meaning depends on its key, and one normalization the next ticket relies on is not documented.
**Recommendation:**
- Drop `smallest` from `UNIT_WORDS`, and build the phrase in one place: `numbered every ${words.singular} and marked to ${…}`, where the last part is "millimeters" for centimetres and `${DIVISION_WORDS[…]} of an inch` for inches.
- Add "A resolved `#rrggbb` color." above `MeasuredObject.color`.

**Status:** Fixed
**Resolution:** Approved: `smallest` is dropped and the "marked to" phrase is built in one place. `MeasuredObject.color` is documented as a resolved `#rrggbb`.

---

### QR-005: Test details: an `as never` cast, two titles that claim more than their tests check, and "a inches ruler" in generated names

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/core/ruler-definition.test.ts:24`, `tests/core/ruler-definition.test.ts:53`, `tests/core/ruler-definition.test.ts:76`, `tests/core/ruler-definition.test.ts:84`, `tests/core/ruler-definition.test.ts:100-104`
**Description:**
- **The cast.** `textOf` passes `result.description as never` to `ruler.describe` (`:24`). `never` is assignable to anything, so the call is not type-checked. The other type tests cast to the type instead: `result.description as LineGraph` (`tests/core/line-graph.test.ts:231`), `as BarGraph` and `as Pictograph`.
- **Two titles that claim more than their tests check.**
  - "reports a label or color given for the whole ruler…" (`:100`) gives only a `label`. A top-level `color` gives the same issue (probe), but nothing tests it.
  - "accepts both units, the examples, and every length up to each unit's maximum" (`:53`) checks four lengths: 15 and 30 cm, and 1 and 12 in.
- **Generated names.** The `%s` in `:76` produces "reports a centimeters ruler's length 0" and "reports a inches ruler's length 0".
- **Shadowing.** `for (const ruler of …)` (`:84`) shadows the imported definition `ruler` inside the loop.

**Impact:** Minor. A test title that claims more than its test checks reads as coverage that is not there. The `never` cast would hide a change to `describe`'s parameter type.
**Recommendation:**
- Cast to `Ruler`, importing the type.
- For `:100`, add `cm({ color: "red" })`, or retitle the test.
- Retitle `:53`, for example "accepts both units, the examples, and each unit's shortest and longest lengths".
- Write each unit's singular name in the `it.each` rows ("centimeter", "inch").
- Rename the loop variable.

**Status:** Fixed
**Resolution:** Approved: Cast to `Ruler`; a top-level `color` is tested; the lengths title is fixed; the names read "a centimeter ruler" and "an inch ruler"; the loop variable is renamed.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Approved | Pinned 2→2's structural issue in full, added 5→3.25 (order only), and added the refused- and inapplicable-division same-mark cases to the wrong-marks test. | `tests/core/ruler-definition.test.ts` |
| QR-002 | Approved | `ruler = /* @__PURE__ */ defineRuler()`. `defineRuler`, `defineRulerProperties` and `endOnMark` are `/* @__NO_SIDE_EFFECTS__ */`, and the word tables are `/* @__PURE__ */`. The shared-chunk simulation gives 7,791 B gzip with no ruler. A Known Hazard on TICKET-003 covers `src/core/ruler.ts`'s tables and "A ruler" in the per-type bundle test. The coverage rows name `defineRulerProperties`. | `src/core/definitions/ruler.ts`, `TICKET-003.md`, both specifications, delivery record |
| QR-003 | Approved | The range is `{ min: next mark, max: length }`. At the ruler's last mark the start is reported instead, with `{ min: 0, max: the mark before the end }`. Tested at a 15 cm ruler's end. | `src/core/definitions/ruler.ts`, `tests/core/ruler-definition.test.ts` |
| QR-004 | Approved | `smallest` is dropped and the "marked to" phrase is built in one place. `MeasuredObject.color` is documented as a resolved `#rrggbb`. | `src/core/definitions/ruler.ts` |
| QR-005 | Approved | Cast to `Ruler`; a top-level `color` is tested; the lengths title is fixed; the names read "a centimeter ruler" and "an inch ruler"; the loop variable is renamed. | `tests/core/ruler-definition.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (all 5 Fixed: 2 Concerns, 3 Suggestions)
**Notes:**
- Every finding was resolved in the main session with the Engineer's approval (2026-10-21). The changes are recorded in the delivery record's `## Post-Review Amendments`.
- Both order guards are now pinned, and the ruler drops from bundles that never read it.
- Two bundle items are left to TICKET-003 as a Known Hazard: `src/core/ruler.ts`'s tables, and "A ruler" in the per-type bundle test.
- Re-verification: every Verification Run command exits 0, and `pnpm test` passes 1,341 tests on three runs. Five deliberate breaks of the fixes each fail a test.
