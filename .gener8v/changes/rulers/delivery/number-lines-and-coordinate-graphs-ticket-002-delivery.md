# TICKET-002: Define the ruler graph type: terms, checks and text alternative — Delivery Record

## Ticket Reference

**Ticket:** rulers/number-lines-and-coordinate-graphs/TICKET-002
**Change:** `.gener8v/changes/rulers/change.md` — Approved (Product Owner — Thomas Eaves, 2026-10-19) when delivery started
**Specification:** `.gener8v/specifications/number-lines-and-coordinate-graphs.md` (amended by `rulers`, approved 2026-10-20); `.gener8v/specifications/graph-specification-and-vocabulary.md` for GSV-REQ-040, 049..051 (carried by GSV TICKET-001 CR-005)
**Requirements Covered:**
- NLC-REQ-001: Ruler parameters defined in the single definition using vocabulary terms (ruler part)
- NLC-REQ-041: Centimetres and inches accepted as the unit; any other unit reported
- NLC-REQ-042: A length that is not whole, is zero or negative, or exceeds the maximum for its unit is reported
- NLC-REQ-046: Optional smallest division for an inch ruler, a sixteenth by default
- NLC-REQ-049: Optional object given by a start mark and an end mark, either of which may be any mark
- NLC-REQ-051: An object whose start is not before its end is reported
- NLC-REQ-052: An object start or end outside the ruler is reported
- NLC-REQ-053: An object start or end that is not a drawn mark is reported
- NLC-REQ-054: Optional color and label for an object, applied per GSV-REQ-040..045
- NLC-REQ-056: Text alternative stating unit, length, smallest division and, with an object, its label and its start and end marks

## Pre-Flight Reconciliation

**Verdict:** Go (three decisions put to the Engineer, decided in the Implementation Plan)

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| TICKET-001 delivered (the mark rule) | done | `rulers` NLC TICKET-001 delivered and Approved by all three reviews; `src/core/ruler.ts` exposes `rulerScale`, `marksPerUnit`, `isRulerLength`, `RULER_UNITS`, `INCH_DIVISIONS`, `DEFAULT_INCH_DIVISION`, `RULER_MAX_LENGTH` | ✅ The ticket's Prior Art names `divisionsPerUnit` / `rulerMarks` / `isRulerMark`; QR-001's Known Hazard supersedes them |
| Cross-area predecessor GSV TICKET-001 delivered | done | Delivered and Approved by all three reviews: `ruler` in `GRAPH_TYPES`; `label`/`color` `elementsOf` include `ruler`; `PropertySpec.appliesWhen`; `DomainCheck.optionalInputs`; enum `wrong_kind` with `allowed` | ✅ |
| Term names free in the vocabulary | `length`, `smallestDivision`, `start`, `end`, a measured-object term, a unit term | `length`, `smallestDivision`, `start`, `end`, `measuredObject` unused (`src/generated/vocabulary.json`). **`unit` is taken**: the circle's string term "The unit of length shown after each measurement, such as cm" (`src/core/definitions/circle.ts`) | ⚠️ Decision: the ruler's unit needs another term (GSV-REQ-015, one definition per term) |
| An issue code for an object end between marks (NLC-REQ-053, "naming the nearest drawn marks") | GSV-owned | none fits: `out_of_range` names a range, `tick_label_not_on_tick` is the axis's. The ticket's hazard leaves "any new issue code" to the GSV tickets, which added none | ⚠️ Decision: add a code here (documented, tested) or reuse `out_of_range` |
| Registering the definition | `src/core/definitions/index.ts` | `tests/react/Graph.test.tsx:65` requires every registered type to have a layout and a per-type component, and `examples/<type>.json` to draw. The layout and component are TICKET-003's | ⚠️ Decision: register here (TICKET-003's artifacts or a gap) or in TICKET-003 |
| Rich `examples/ruler.json` using every optional term | ticket: a centimetre ruler | `smallestDivision` applies only to inch rulers (GSV-REQ-051), so a centimetre example cannot use it | ✅ Resolved: the main example is an inch ruler; a centimetre ruler is tested |
| Shared `label` has a `maxLength` (ticket hazard) | capped | the shared `label` spec has no `maxLength`, and must be nested as is (applicability check) | ✅ Resolved: the label is not capped. The shared `label` must be nested as is, the GSV Edge Case accepts a very long label, and the graph-library hazard keeps the full text in the text alternative. `describe` quotes it whole with `quoteText`, which cleans it but does not clip; the drawing wraps it (TICKET-003, `wrap`). See Deviations (corrected, code review CR-007) |
| `integer` kind reports a non-whole length | `wrong_kind` "a whole number" | `src/core/validate/structure.ts:116-119` | ✅ |
| `createIssue`, `quoteText`, `formatSupplied`, `formatList`, `cleanText`, `sourceOf` | present | `src/core/issues.ts`, `src/core/format.ts` | ✅ |
| Carried findings | GSV TICKET-001 CR-005; NLC TICKET-001 CR-001, CR-003, QR-001 | listed in the ticket's Known Hazards | 🔁 Carried — see Implementation Plan |

**Resolved from ground truth (not escalated):**
- **The default division:** not filled in normalization. `rulerScale` applies `DEFAULT_INCH_DIVISION` whenever the division is absent. `describe` locates the object's ends with it, and the layout builds its marks with it; the division `describe` names reads the same `DEFAULT_INCH_DIVISION` (graph-library NLC DEL-004 pattern; corrected, code review CR-007).
- **`elementsHint`:** `label` and `color` given at the top level are reported as belonging on the measured object.

**Blocking findings:** None. Three decisions are put to the Engineer before planning.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-10-20

Engineer decisions on the reconciliation's three questions:
- DEL-001: the unit term is `rulerUnit`. The other new terms are `length`, `smallestDivision`, `measuredObject`, `start` and `end`.
- DEL-002: the ruler is defined and exported here, but not registered. TICKET-003 registers it with its layout and component. Until then its tests run against a test registry.
- DEL-003: a new issue code, `not_on_mark`, for an end between marks.

### Planned Files

- `src/core/definitions/ruler.ts`: the `Ruler` type and the `ruler` definition.
  - Terms:
    - `rulerUnit`: enum from `RULER_UNITS`, with value descriptions.
    - `length`: integer, 1 to 30; the inch limit of 12 is a domain check.
    - `smallestDivision`: enum from `INCH_DIVISIONS`, optional, `appliesWhen` the unit is `inches`.
    - `measuredObject`: an optional object of `start` and `end` (numbers 0 to 30, `ordered`), with the shared `label` and `color` nested.
    - Every description states its limits; no condition is written by hand.
  - `elementsHint` is "the measuredObject".
  - Checks:
    1. The length fits its unit: an inch ruler over 12 is `out_of_range` at `/length`, giving 1 to 12.
    2. The object's ends. The check lists `smallestDivision` as an optional input, so it runs at the default division and is skipped when the division is refused. It builds `rulerScale` and locates each end:
       - an end off the ruler is `out_of_range` at that end, giving 0 to the length;
       - an end between marks is `not_on_mark` at that end, naming the two nearest marks;
       - when both ends are marks and the start's index is not below the end's (0.3 against 0.1 + 0.2), the end is `out_of_range` at `/measuredObject/end`, once.
       Off the ruler wins over between marks, and order is checked only when both ends are marks. A reversed object that `ordered` reported skips the check.
  - `describe(ruler, provenance)`: for example, "A ruler titled "…", 6 inches long, numbered every inch and marked to eighths of an inch. An object labeled "pencil" lies along it from the 1.5 in mark to the 4.25 in mark."
    - The label is quoted.
    - The default division is stated when none was given.
    - The object's length is never stated.
    - Spellings are US.
  - Annotations: NLC-REQ-001, 041, 042, 046, 049, 051..054 and 056; GSV-REQ-040 and 049..051 on the terms.
- `src/core/issues.ts`: `not_on_mark` in `ISSUE_CODES`, `issueDocs`, the params (`term`, `got`, `below`, `above`) and the template ("measuredObject.end must be on a mark of the ruler; got 3.25, between the marks at 3.2 and 3.3."); `tests/core/issues.test.ts`' snapshots and sample.
- Examples:
  - `examples/ruler.json`: an inch ruler at eighths, with a title and an object from a non-zero mark, using every optional term once;
  - `examples/invalid/ruler-object-between-marks.json`;
  - `examples/invalid/ruler-unknown-unit.json`.
- `tests/core/ruler-definition.test.ts`, against a test registry holding the real definition:
  - unit and length cases ("cm" names both units);
  - a division on centimetres, refused or valid;
  - reversed and same-mark objects;
  - ends at 0, at the length, and just off;
  - ends between marks, including computed noise;
  - a refused division skipping the off-mark check;
  - the text alternative, and a supplied `textAlternative` replacing it;
  - the examples as documented;
  - the definitions test's rules (vocabulary, applicability, consistency, stages, conditions) run on the ruler explicitly, since it is not yet in the registry.
- Records:
  - a Known Hazard on TICKET-003 (register the ruler, regenerate the schema);
  - a Known Hazard on GSV TICKET-002 (it runs after that);
  - `not_on_mark` in the GSV specification's code list;
  - coverage rows for the NLC and GSV requirements.

### How Acceptance Criteria Will Be Met

- `examples/ruler.json` valid, and the main example using every optional term: an inch example, because `smallestDivision` cannot appear on a centimetre ruler; a centimetre example in the tests
- The terms and their descriptions: `ruler.ts`; the definitions-rule tests run on it
- Unknown unit and bad length at their paths: the `rulerUnit` enum and `length` integer, plus check 1; tests
- A division on a centimetre ruler as `inapplicable_property`: `appliesWhen`; tests
- Reversed, off-ruler and boundary cases: `ordered`, plus check 2 via `rulerScale.locate`; tests
- An end between marks naming its neighbours, through TICKET-001's rule: `not_on_mark` with `locate`'s `below` and `above`; tests
- The text alternative: `describe`; tests, including that a supplied `textAlternative` replaces it
- The invalid examples: each gives exactly its documented issue; tests
- `pnpm generate` and the schema tests: deferred to TICKET-003 with the registration (DEL-002)

## Progress

- [x] `src/core/definitions/ruler.ts` — written, annotated
- [x] `src/core/issues.ts` and `tests/core/issues.test.ts` — `not_on_mark`
- [x] `examples/ruler.json`, `examples/invalid/ruler-object-between-marks.json`, `examples/invalid/ruler-unknown-unit.json`
- [x] `tests/core/ruler-definition.test.ts` — 24 tests; `tests/core/definitions.test.ts` — 2 tests, 1 updated
- [x] Known Hazards on TICKET-003 and GSV TICKET-002; `## @spec Coverage` rows (no code list in the GSV specification: see Deviations)

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/core/definitions/ruler.ts`: `MeasuredObject`, `Ruler` and `ruler` (`GraphTypeDefinition<Ruler>`), exported and not registered (DEL-002).
  - Terms: `rulerUnit`, `length`, `smallestDivision` (with `appliesWhen`), and `measuredObject`, which holds `start`, `end` and the shared `label` and `color`.
  - Checks: `lengthFitsUnit` and `objectOnMarks`.
  - `describe`, and `elementsHint` "the measuredObject".
- `src/core/issues.ts`: the issue code `not_on_mark` (`term`, `got`, `below`, `above`), documented, with its message.
- `examples/ruler.json` (an inch ruler at eighths, every optional term once), `examples/invalid/ruler-object-between-marks.json`, `examples/invalid/ruler-unknown-unit.json`.
- `tests/core/ruler-definition.test.ts`; `tests/core/definitions.test.ts` (the ruler held to every rule explicitly); `tests/core/issues.test.ts` (the code list, sample and message snapshots).
- `.gener8v/specifications/number-lines-and-coordinate-graphs.md` and `.gener8v/specifications/graph-specification-and-vocabulary.md`: `## @spec Coverage` rows.
- Known Hazards on `tickets/number-lines-and-coordinate-graphs/TICKET-003.md` and `tickets/graph-specification-and-vocabulary/TICKET-002.md`.

## Verification Run

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm generate` | 0 | no change to generated files: the ruler is not registered yet (DEL-002) |
| `pnpm lint` | 0 | — |
| `pnpm typecheck` | 0 | — |
| `pnpm test` (three runs) | 0 | 1,328 tests passed on each run, 26 of them new |
| `pnpm bench` | 0 | 7 passed |
| `pnpm build` | 0 | — |
| `pnpm check:dist` | 0 | no network APIs |
| `pnpm check:deps` | 0 | 0 runtime dependencies |
| `pnpm check:images` | 0 | — |
| `pnpm size` | 0 | every entry within its limit |
| `pnpm publint` | 0 | — |
| `pnpm attw` | 0 | — |
| `pnpm audit` | 0 | No known vulnerabilities found |
| `python3 …/gener8v-state.py lint` | 0 | 0 errors, 0 warnings |

Ten deliberate breaks, each made against a passing baseline and restored from memory, fail the new tests:
- no `not_on_mark`;
- no off-ruler report;
- no index order;
- the division as a required input;
- the division not read at all (wrong marks);
- no inch length check;
- no condition on the division;
- the wrong default division in the text alternative;
- the object's length stated;
- the shared label copied instead of nested.

## Acceptance Criteria Verification

- [x] `examples/ruler.json` and a centimetre ruler in the tests validate; the example uses every optional term once — "accepts both units, the examples…", "uses every optional term once in examples/ruler.json". The main example is an inch ruler (see Deviations)
- [x] The `ruler` type's terms, each described with its limits — "names its terms in camel case…", "nests the shared label and color themselves…", "takes the unit and division lists from the mark rule…", and the definitions test's vocabulary rules run on it
- [x] An unknown unit is reported at `/rulerUnit` listing the accepted names; a bad length at `/length` with the lengths allowed — "reports the unit %j, listing the accepted names" (four cases), "reports a length that is not whole, not positive, or past its unit's maximum…"
- [x] A smallest division on a centimetre ruler is `inapplicable_property` at its path — "reports a smallest division on a centimeter ruler as not applying (GSV-REQ-051)"
- [x] A reversed or same-mark object is reported once at its end; an end off the ruler at its path, naming the range; ends at exactly 0 and the length accepted — "reports an object whose start is not before its end, once, at its end", "reports an end off the ruler at its path…", "accepts an object from any mark to any later mark, the ruler's ends included…", "accepts ends a caller's code computed with decimal noise…"
- [x] An end between marks is reported naming the nearest marks, through TICKET-001's rule; 3.4, 0.7 and 2.0625 at sixteenths accepted — "reports an end between marks, naming the nearest marks on either side", "accepts an object from any mark…", "checks no end against the wrong marks…"
- [x] The generated text alternative states "ruler", the unit, the length, the division (the default when none given) and the object's quoted label and marks, never its length — the five tests under "the text alternative"
- [ ] A supplied `textAlternative` replaces it (NLC-REQ-013) — Unverified here. It is applied when the Scene is printed (`textAlternativeFor`, `src/layout/scene.ts`), so it needs the ruler's layout; TICKET-003 tests it (Known Hazard)
- [x] Invalid examples for an object end between marks and for an unknown unit, each with exactly its documented issue — "gives each invalid example exactly its documented issue"
- [ ] `pnpm generate` regenerates the schema with the ruler terms, and the definitions and schema-agreement tests pass with the new type — Deferred with the registration to TICKET-003 (DEL-002). Meanwhile the definitions test's rules run on the ruler explicitly ("the ruler, defined but not yet registered"), and `pnpm generate` exits 0 with no change

## Decisions Made

### DEL-001: The unit term is `rulerUnit`, and the object is `measuredObject` with `start` and `end`

**Context:** `unit` is already the circle's term, free text such as "cm" shown after each measurement, and a term has one definition across types (GSV-REQ-015).
**Decision:** The Engineer chose `rulerUnit` (an enum of `centimeters` and `inches`). The other new terms are `length`, `smallestDivision`, `measuredObject`, `start` and `end`. None existed before.
**Rationale:** The name is unambiguous to a model writing a description, and still a noun phrase (AD-005). The consistency test confirms that no term is defined twice.
**Ticket Impact:** GSV-REQ-046..048's terms are these. TICKET-003 and GSV TICKET-002 have Known Hazards naming them.

### DEL-002: The ruler is defined here and registered in TICKET-003

**Context:** `tests/react/Graph.test.tsx` requires every registered definition to have a layout, a per-type component and a drawable `examples/<type>.json`. Those are TICKET-003's work. Registered now, a ruler would validate but fail to draw.
**Decision:** The Engineer chose to define and export `ruler` without registering it. Its tests run against a registry holding only it, and the definitions test's rules run on it explicitly. TICKET-003 registers it with its layout, then regenerates the schema and vocabulary.
**Rationale:** This keeps the graph-library invariant that every offered type draws, without starting TICKET-003's layout here.
**Ticket Impact:** Two criteria move to TICKET-003: `pnpm generate` with the ruler, and NLC-REQ-013's supplied text alternative. Both are Known Hazards there. GSV TICKET-002 starts after TICKET-003.

### DEL-003: A new issue code, `not_on_mark`

**Context:** NLC-REQ-053 reports an end between marks, "naming the nearest drawn marks". No existing code fits: `out_of_range` names a range, and `tick_label_not_on_tick` is the axis's.
**Decision:** The Engineer chose a new, documented code: `not_on_mark` with `term`, `got`, `below` and `above`. Its message reads "measuredObject.end must be on a mark of the ruler; got 7.25, between the marks at 7.2 and 7.3."
**Rationale:** Adding a code is allowed between releases (GSV-REQ-034 forbids changing or removing one). The issue-docs test requires its documentation, and the message test pins it.
**Ticket Impact:** None beyond this ticket. `below` and `above` appear in the message only; the issue's published fields are unchanged.

### DEL-004: The object's ends have no structural bounds

**Context:** The plan gave `start` and `end` the bounds 0 to 30. The tests showed the structure stage then refusing 30.000000000000004 and −2.8e-17, both computed values of the ruler's ends, before the mark rule's noise allowance could accept them. A start of −1 was also reported structurally, which skipped the check for the other end.
**Decision:** `start` and `end` are plain numbers. Whether each is on the ruler is decided only by `rulerScale(…).locate` in `objectOnMarks`, which reports `out_of_range` with the ruler's own range (0 to its length). The descriptions state the range.
**Rationale:** There is one rule for an end, with one allowance, as NLC TICKET-001's CR-003 asked. The schema stays looser than validation, never stricter (GSV-NFR-003).
**Ticket Impact:** The published schema gives `start` and `end` no `minimum` or `maximum`.

## Deviations from Plan

- **The ends' structural bounds were dropped** (DEL-004), after the tests showed them defeating the noise allowance.
- **The main example is an inch ruler, not the centimetre ruler the ticket names.** The example must use every optional term, and `smallestDivision` cannot appear on a centimetre ruler. The tests cover a centimetre ruler.
- **The GSV specification has no list of issue codes to amend.** The documented set lives in `src/core/issues.ts` (`ISSUE_CODES`, `issueDocs`), which the issues test checks.
- **Two criteria are deferred to TICKET-003** (DEL-002): `pnpm generate` with the ruler, and the supplied text alternative.
- **The ticket's `maxLength` hazard is not applied to the object's label** (added, code review CR-007). The shared `label` has no `maxLength` and must be nested as is, and a very long label is accepted (GSV Edge Cases). `describe` states it whole, and TICKET-003 wraps it when drawing.
- **The supplied-text-alternative test was removed.** It was planned for `tests/core/ruler-definition.test.ts`, but the text alternative is applied at render, so the test goes to TICKET-003.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| NLC-REQ-001, 041, 046, 049, 054 | `src/core/definitions/ruler.ts`:ruler, rulerProperties | `@spec NLC-REQ-001, NLC-REQ-041, NLC-REQ-046, NLC-REQ-049, NLC-REQ-054` (and on `rulerProperties` with GSV-REQ-040, 049..051, NLC-REQ-042 and NLC-REQ-051) |
| NLC-REQ-042 | `src/core/definitions/ruler.ts`:lengthFitsUnit, rulerProperties | `@spec NLC-REQ-042` |
| NLC-REQ-051 | `src/core/definitions/ruler.ts`:rulerProperties (`ordered`), objectInOrder | `@spec NLC-REQ-051` |
| NLC-REQ-052, 053 | `src/core/definitions/ruler.ts`:endOnMark | `@spec NLC-REQ-052, NLC-REQ-053` |
| NLC-REQ-046, 056 | `src/core/definitions/ruler.ts`:ruler.describe | `@spec NLC-REQ-046, NLC-REQ-056` |
| GSV-REQ-040, 049, 050, 051 | `src/core/definitions/ruler.ts`:rulerProperties | `@spec … GSV-REQ-040, GSV-REQ-049, GSV-REQ-050, GSV-REQ-051` |

## Notes

- **For TICKET-003:**
  - Register `ruler` in `src/core/definitions/index.ts` with the layout and component, run `pnpm generate`, and remove the ruler from the definitions test's explicit lists.
  - Build the marks with `rulerScale(ruler.rulerUnit, ruler.length, ruler.smallestDivision)`, as `describe` does, and draw each end at its located mark's value (code review CR-003).
  - The object's label is the shared `label`, which has no length limit. Wrap it when drawing (`wrap`, as the graph-library labels do).
- **For GSV TICKET-002:** the vocabulary will publish `rulerUnit` and `smallestDivision`'s value descriptions and `appliesWhen`, and `not_on_mark` joins the documented code set.
- **Graph-library's number line (NLC TICKET-002):** it will also want "a label's value is not a tick" reported. It keeps its own `tick_label_not_on_tick`; `not_on_mark` is the ruler's.

## Post-Review Amendments

### Code review — `rulers/number-lines-and-coordinate-graphs-ticket-002-code-review` (2026-10-21, Approved)

- **CR-001:** `not_on_mark` states the marks either side exactly, with `formatSupplied`, never rounded to 4 digits. 2.1 in at sixteenths now names 2.0625 and 2.125, 10.2 in at eighths 10.125 and 10.25, and 11.95 in 11.9375 and 12. The issues sample uses a 5-digit mark.
- **CR-002:** `length` has no structural `min`/`max`, as DEL-004 did for the ends. `lengthFitsUnit` reports every whole length outside 1 to the unit's maximum with that unit's range: 0, −3 and 31 on an inch ruler are told "between 1 and 12". Tested on both units.
  - **Deviation:** a length that is not whole (4.5) is still `wrong_kind`, "length must be a whole number", with no range. "A whole number" is the fault, and the unit's range follows once it is whole.
  - **Consequence:** with a refused unit and a length of 0, only the unit is reported in that pass, since the length check needs the unit. The published schema keeps `type: integer` and states the limits in prose. That is looser than validation, which GSV-NFR-003 allows.
- **CR-003:** `describe` builds the ruler with `rulerScale` (`scaleOf`) and states each end as the mark it is located at, so 0.1 + 0.2 reads "the 0.3 cm mark" and 30.000000000000004 "the 30 cm mark". Tested with computed ends. A Known Hazard on TICKET-003 says to draw the bar at the located marks too.
- **CR-004:** `rulerProperties` carries `@spec NLC-REQ-051` (its `ordered` pair), and `describe` carries `@spec NLC-REQ-046, NLC-REQ-056`. The `## @spec Annotations` table and the NLC coverage rows name the new check names.
- **CR-005:** the same-mark order issue asks for the next mark after the start: "measuredObject.end must be a number at least 0.4; got 0.30000000000000004.", with `range: { min: 0.4 }`. Pinned in the test.
- **CR-006:** the GSV-REQ-040 and GSV-REQ-049..051 coverage rows say "(ruler part; published once registered with rulers NLC TICKET-003)". TICKET-003 or GSV TICKET-002 removes it.
- **CR-007:** the Pre-Flight row now gives the real reason the label is not capped, and a Deviation records that the `maxLength` hazard is not applied. "Resolved from ground truth" says what `describe` reads from `rulerScale` (the ends) and from `DEFAULT_INCH_DIVISION` (the division it names). That makes TICKET-003's "as `describe` does" true.
- **CR-008:** `objectOnMarks` is split into `endOnMark("start")`, `endOnMark("end")` and `objectInOrder`. Each end check reads only its own end, so `{ start: "2", end: 7.25 }` reports both faults in one pass (GSV-REQ-017). The order check compares only two marks. Tested both ways round.
- **Re-verification:** `pnpm generate` (no change), `lint`, `typecheck`, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size`, `publint`, `attw`, `audit` and `gener8v-state lint` exit 0. `pnpm test` (1,340 tests) exits 0 on three runs. Six deliberate breaks of the fixes each fail a test:
  - the marks rounded again;
  - the structural length bounds restored;
  - the raw ends stated;
  - the old order range;
  - one end check reading both ends;
  - no order check.
