# TICKET-002: Define the ruler graph type: terms, checks and text alternative — Code Review

## Summary

This reviews the delivery of `rulers/number-lines-and-coordinate-graphs/TICKET-002` (commit 61373bc, branch `ticket/rulers-nlc-002`) against the ticket, the NLC and GSV specifications, `prd` constraints and the system design. The code-reviewer agent did the findings phase in a fresh context. The definition follows the delivered types' contract, carries the hazards from both predecessor tickets' reviews, and every command in the Verification Run reproduces. Two criteria were moved to TICKET-003 (DEL-002), and that move is recorded properly. Eight findings, none Critical:
- Four Issues. Three are messages or text that state wrong values:
  - `not_on_mark` names marks rounded to 4 significant digits (2.063, 10.13), which are not marks;
  - an inch ruler's bad length is told the centimetre range;
  - the text alternative states computed ends raw (0.30000000000000004 cm) where validation located a mark.
- The fourth Issue is about `@spec` annotations: two coverage rows name locations that do not carry the ID.
- Four Observations.

**Delivery Record:** `.gener8v/changes/rulers/delivery/number-lines-and-coordinate-graphs-ticket-002-delivery.md`
**Files Reviewed:**
- `src/core/definitions/ruler.ts`
- `src/core/issues.ts` (the `not_on_mark` additions)
- `examples/ruler.json`
- `examples/invalid/ruler-object-between-marks.json`
- `examples/invalid/ruler-unknown-unit.json`
- `tests/core/ruler-definition.test.ts`
- `tests/core/definitions.test.ts` (the ruler block and the condition rule)
- `tests/core/issues.test.ts` (the code list, sample and message snapshot)
- `.gener8v/specifications/number-lines-and-coordinate-graphs.md` and `.gener8v/specifications/graph-specification-and-vocabulary.md` (`## @spec Coverage` rows)
- `.gener8v/changes/rulers/tickets/number-lines-and-coordinate-graphs/TICKET-003.md` and `.gener8v/changes/rulers/tickets/graph-specification-and-vocabulary/TICKET-002.md` (the Known Hazards added)
- Read for context, not changed by this ticket: `src/core/ruler.ts`, `src/core/definitions/types.ts`, `src/core/definitions/shared.ts`, `src/core/definitions/index.ts`, `src/core/validate/domain.ts`, `src/core/validate/state.ts`, `src/core/format.ts`, `src/layout/scene.ts`, `tests/react/Graph.test.tsx`

**Findings:** 8
**Critical:** 0 | **Issues:** 4 | **Observations:** 4

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| `examples/ruler.json` (a centimetre ruler with an object from a mark other than 0, with label and color) and an inch example in the tests validate. The example uses every optional term once | Yes | `examples/ruler.json` is an inch ruler at eighths that uses `smallestDivision`, `title`, `measuredObject` (1.5 to 4.25), `label` and `color` once each. "uses every optional term once…" checks the keys (`tests/core/ruler-definition.test.ts:187-191`). A centimetre ruler with an object from 3.4 to 7.1, labeled and colored, validates (`:96`). The swap of the two units is a recorded deviation. The ticket's two clauses conflict: a centimetre ruler cannot carry `smallestDivision` (GSV-REQ-051). |
| The `ruler` type has `unit` (an enum), `length` (a whole number at least 1), an optional smallest division (an enum, inch rulers only) and an optional object (start, end, the shared `label` and `color`). Each term has a plain-English description stating its limits | Yes | `src/core/definitions/ruler.ts:53-115`. The unit term is `rulerUnit`, by DEL-001: `unit` is the circle's term. `length` is an `integer` from 1 to 30, with each unit's maximum in its description. `smallestDivision` has `appliesWhen` on `rulerUnit` `inches` and states its default. `measuredObject` nests `sharedProperties.label` and `.color` themselves (`:110-111`, tested at `tests/core/ruler-definition.test.ts:35-39`). The definitions test's vocabulary, stage, applicability, consistency and condition rules run on the ruler (`tests/core/definitions.test.ts:254`, `:671-685`). |
| An unknown unit ("cm", "centimetres", "feet") is reported at `/unit`, listing the accepted names. A length of 0, −3 or 4.5, or past 30 cm or 12 in, is reported at `/length`, stating the whole lengths allowed for the unit | Partial | The unit part is met at `/rulerUnit` (DEL-001): `wrong_kind` with `allowed: ["centimeters","inches"]` (`tests/core/ruler-definition.test.ts:61-66`). Every bad length is reported at `/length`, but on an inch ruler 0, −3 and 31 are told "between 1 and 30", the centimetre range, and 4.5 states no range on either unit (probe). See CR-002. |
| A smallest division on a centimetre ruler is `inapplicable_property` at its path, as not applying to a centimetre ruler (GSV-REQ-051) | Yes | `appliesWhen` (`src/core/definitions/ruler.ts:85`). `tests/core/ruler-definition.test.ts:78-84` checks `conflicts: ["/rulerUnit"]` and the message. |
| An object from 2 to 2, or from 5 to 3, is reported once at its end mark. An end below 0 or past the length is reported at its path, naming the ruler's range. A mark at exactly 0 or exactly the length is accepted | Yes | `ordered` (`src/core/definitions/ruler.ts:113`) and the index-order check (`:160-168`) cover order; `tests/core/ruler-definition.test.ts:107-115`. `objectOnMarks` reports `out_of_range` with `{ min: 0, max: length }` (`:152-153`); `tests/core/ruler-definition.test.ts:117-124`. Both ends are accepted at the ruler's ends, including computed noise (`:95`, `:102-105`). |
| An end at 3.25 cm, or at 1.3 in at eighths, is reported at its path, naming the nearest drawn marks on either side. 3.4 cm, 0.7 cm and 2.0625 in at sixteenths are accepted. The check uses TICKET-001's predicate | Partial | `rulerScale(…).locate` (`src/core/definitions/ruler.ts:144-158`) and `not_on_mark`. 3.25 cm gives "3.2 and 3.3", and 1.3 in at eighths gives "1.25 and 1.375" (probe; `tests/core/ruler-definition.test.ts:126-139`). The accepted cases are at `:96-98`. But the message rounds the marks to 4 significant digits, so at sixteenths, and on inch rulers of 10 in or more, it names values that are not marks: 2.1 in gives "between the marks at 2.063 and 2.125". See CR-001. |
| The generated text alternative states "ruler", the unit, the length, the smallest division (the default when none given) and, with an object, its label (quoted) and its start and end marks. It never states the object's length. A supplied `textAlternative` replaces it (NLC-REQ-013) | Partial | `ruler.describe` (`src/core/definitions/ruler.ts:194-211`) states the unit, length, division (the default when none is given), quoted label and marks, and never the object's length (`tests/core/ruler-definition.test.ts:153-179`). Two gaps:<br>• Ends that validation accepts as marks through the noise allowance are stated raw: "from the -0.000000000000000027755575615628914 cm mark" (CR-003).<br>• The supplied `textAlternative` case is deferred to TICKET-003, because it is applied at render (`textAlternativeFor`, `src/layout/scene.ts:148`). That deferral is recorded properly: DEL-002, Deviations, and a Known Hazard on TICKET-003 (`TICKET-003.md:74`). |
| Invalid examples exist for an object end between marks and for an unknown unit, each producing exactly the documented issue | Yes | `examples/invalid/ruler-object-between-marks.json` gives `not_on_mark` at `/measuredObject/end`, and `examples/invalid/ruler-unknown-unit.json` gives `wrong_kind` at `/rulerUnit` (`tests/core/ruler-definition.test.ts:182-185`). |
| `pnpm generate` regenerates the schema, types and vocabulary with the ruler terms, and `tests/core/definitions.test.ts` and `tests/core/schema-agreement.test.ts` pass with the new type | No (deferred → TICKET-003, DEL-002) | The ruler is not registered (`src/core/definitions/index.ts:22-29`). The public `validate` answers `unknown_graph_type` for it (probe), as DEL-002 intends. The deferral is recorded properly:<br>• the Engineer approved DEL-002;<br>• it is listed under Deviations and left unchecked in the record's criteria;<br>• TICKET-003 has a Known Hazard: register, run `pnpm generate`, move the ruler out of the explicit test lists, and the agreement test mutates `examples/ruler.json` (`TICKET-003.md:70-73`);<br>• GSV TICKET-002 has a Known Hazard to start after NLC TICKET-003;<br>• the NLC-REQ-001 coverage row is qualified.<br>Meanwhile the definitions rules run on the ruler explicitly. The GSV coverage rows are not qualified (CR-006). |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| NLC-REQ-001 | Ruler parameters in the single definition, using vocabulary terms (ruler part) | `src/core/definitions/ruler.ts`:ruler, rulerProperties (registration with TICKET-003, DEL-002) | Yes |
| NLC-REQ-041 | Centimetres and inches accepted as the unit; any other unit reported | `src/core/definitions/ruler.ts`:rulerProperties (`rulerUnit`, `values: RULER_UNITS`) | Yes |
| NLC-REQ-042 | A length that is not whole, not positive, or past its unit's maximum is reported | `src/core/definitions/ruler.ts`:rulerProperties (`length`, integer 1..30), lengthFitsUnit (an inch ruler up to 12) | Partial. Every case is reported. The Edge Case "stating the range of whole lengths allowed for the unit" fails on inch rulers for 0, −3 and 31, and for 4.5 on either unit (CR-002). |
| NLC-REQ-046 | Optional smallest division for an inch ruler, a sixteenth by default | `src/core/definitions/ruler.ts`:rulerProperties (`smallestDivision`, `appliesWhen`); the default through `rulerScale` (`src/core/ruler.ts:88`) and `describe` (`src/core/definitions/ruler.ts:202`) | Yes |
| NLC-REQ-049 | Optional object from a start mark to an end mark, either any mark | `src/core/definitions/ruler.ts`:rulerProperties (`measuredObject`, `start`, `end`) | Yes |
| NLC-REQ-051 | An object whose start is not before its end is reported | `src/core/definitions/ruler.ts`:rulerProperties (`ordered`), objectOnMarks (`start.index < end.index`) | Yes |
| NLC-REQ-052 | An end outside the ruler, from 0 to its length, is reported | `src/core/definitions/ruler.ts`:objectOnMarks (`location.kind === "off"`, `out_of_range` with `{ min: 0, max: length }`) | Yes |
| NLC-REQ-053 | An end that is not a drawn mark is reported | `src/core/definitions/ruler.ts`:objectOnMarks (`not_on_mark`); `src/core/issues.ts`:templates.not_on_mark | Partial. Every off-mark end is reported. The Edge Case "naming the nearest drawn marks" names rounded values that are not marks, for most sixteenth marks and for eighths past 10 in (CR-001). |
| NLC-REQ-054 | Optional color and label for an object, per GSV-REQ-040..045 | `src/core/definitions/ruler.ts`:rulerProperties (the shared `label` and `color` nested, `:110-111`) | Yes |
| NLC-REQ-056 | Text alternative stating unit, length, smallest division and the object's label and marks | `src/core/definitions/ruler.ts`:ruler.describe | Partial. Written values are stated correctly. Computed ends that validation locates at a mark are stated raw (CR-003). |
| GSV-REQ-040 (carried, GSV TICKET-001 CR-005) | A measured object's label and color | `src/core/definitions/ruler.ts`:rulerProperties (`sharedProperties.label`/`.color` nested; `elementsOf` lists `ruler`) | Yes (definition part; published once registered, DEL-002) |
| GSV-REQ-049 (carried) | The unit only from a fixed, published list; others reported, listing names | `src/core/definitions/ruler.ts`:rulerProperties (`values: RULER_UNITS`, `valueDescriptions`) | Yes (definition part; published once registered, DEL-002) |
| GSV-REQ-050 (carried) | The division only from a fixed, published list | `src/core/definitions/ruler.ts`:rulerProperties (`values: Object.keys(INCH_DIVISIONS)`) | Yes (definition part; published once registered, DEL-002) |
| GSV-REQ-051 (carried) | A division on a non-inch ruler reported as not applying | `src/core/definitions/ruler.ts`:rulerProperties (`appliesWhen: { term: "rulerUnit", values: ["inches"] }`, optional) | Yes |

*This ticket carries no NFR: NLC-NFR-005..008 belong to TICKET-004. GSV-REQ-046..048 (the ruler's vocabulary terms) belong to GSV TICKET-002, which publishes the terms this ticket defines.*

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/CC-002 | A text alternative for every graph (WCAG 1.1.1) | Yes | `ruler.describe` returns a non-empty sentence for every valid ruler, object or not. The accessible-name wiring is TICKET-003's. The wording gap for computed ends is CR-003. |
| prd/TC-005 | Core code with no React and no browser global | Yes | `src/core/definitions/ruler.ts` imports only `../format`, `../issues`, `../result` (type), `../ruler`, `./shared` and `./types`. `pnpm lint` and `pnpm check:dist` exit 0. |
| prd/TC-008 | One definition for types, validation and schema | Yes | The unit and division lists come from `RULER_UNITS` and `INCH_DIVISIONS`, and the condition from `appliesWhen`, never from prose. The length maxima come from `RULER_MAX_LENGTH`, so OQ-009 is one edit. |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-003 | One `GraphTypeDefinition` per type in `src/core/definitions/<type>.ts` | Yes | `type`, `title`, `description`, `properties` (via `defineProperties`), `derivations: []`, `checks`, `elementsHint` and `describe(normalized, provenance)`. No shared top-level option is listed. Registration is deferred (DEL-002). |
| AD-004 | Staged validator; no check on a value that failed earlier; one fault, one issue | Yes | Each check declares its `inputs`. `smallestDivision` is in `optionalInputs`, so a refused or inapplicable division skips the check, and an absent one takes the default (`tests/core/ruler-definition.test.ts:141-146`). Off the ruler wins over between marks, and order is checked only for two marks. A start that failed on its own hides an independent fault at the end until the next pass (CR-008). |
| AD-005 | `type` in kebab case; terms are camel-cased noun phrases; JSON Pointer paths | Yes | `ruler`; `rulerUnit`, `length`, `smallestDivision`, `measuredObject`, `start`, `end`; paths such as `/measuredObject/end`. |
| AD-006 | Published and strict tool schemas generated from the definition | N/A | Generated when TICKET-003 registers the ruler (DEL-002). DEL-004 leaves `start`/`end` without bounds, so the schema stays looser than validation (GSV-NFR-003). |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| NLC-REQ-001 | `@spec NLC-REQ-001` | `src/core/definitions/ruler.ts:52` (rulerProperties), `:178` (ruler) | Yes |
| NLC-REQ-041 | `@spec NLC-REQ-041` | `src/core/definitions/ruler.ts:52`, `:178` | Yes |
| NLC-REQ-042 | `@spec NLC-REQ-042` | `src/core/definitions/ruler.ts:52` (rulerProperties), `:118` (lengthFitsUnit); `src/core/ruler.ts:93` (isRulerLength) | Yes |
| NLC-REQ-046 | `@spec NLC-REQ-046` | `src/core/definitions/ruler.ts:52`, `:178` | Yes. The coverage row also names `ruler.describe`, whose annotation is `NLC-REQ-056` only (CR-004). |
| NLC-REQ-049 | `@spec NLC-REQ-049` | `src/core/definitions/ruler.ts:52`, `:178` | Yes |
| NLC-REQ-051 | `@spec NLC-REQ-051` | `src/core/definitions/ruler.ts:137` (objectOnMarks) | Yes. Not on `rulerProperties` (`:52`), whose `ordered` pair the coverage row names and which reports every ordinary reversal (CR-004). |
| NLC-REQ-052 | `@spec NLC-REQ-052` | `src/core/definitions/ruler.ts:137`; `src/core/ruler.ts:135` | Yes |
| NLC-REQ-053 | `@spec NLC-REQ-053` | `src/core/definitions/ruler.ts:137`; `src/core/ruler.ts:135` | Yes |
| NLC-REQ-054 | `@spec NLC-REQ-054` | `src/core/definitions/ruler.ts:52`, `:178` | Yes |
| NLC-REQ-056 | `@spec NLC-REQ-056` | `src/core/definitions/ruler.ts:193` (ruler.describe) | Yes |
| GSV-REQ-040, 049, 050, 051 | `@spec GSV-REQ-040` … `GSV-REQ-051` | `src/core/definitions/ruler.ts:52` (rulerProperties) | Yes |

**Coverage:** 10 of 10 NLC requirements annotated, plus the 4 carried GSV requirements
**Missing:** None by requirement. Two coverage-row locations lack the ID (CR-004).
**Specification table:** Partial.
- Every requirement has a row naming `src/core/definitions/ruler.ts`.
- The NLC-REQ-051 row (`.gener8v/specifications/number-lines-and-coordinate-graphs.md:221`) names `rulerProperties`, which has no `@spec NLC-REQ-051`. The NLC-REQ-046 row (`:212`) names `ruler.describe`, which has no `@spec NLC-REQ-046` (CR-004).
- The GSV-REQ-040 and 049..051 rows are not qualified as unpublished until registration (CR-006).

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm generate` | not run (skipped by instruction) | — (record: 0, no change) |
| `pnpm lint` | 0 | Yes |
| `pnpm typecheck` | 0 | Yes |
| `pnpm test` (three runs; re-run as `npx vitest run --no-cache`) | 0, 0, 0 | Yes. 48 files and 1,328 tests passed on each run. |
| `pnpm bench` | 0 | Yes (7 passed) |
| `pnpm build` | 0 | Yes |
| `pnpm check:dist` | 0 | Yes (14 built files, no network APIs) |
| `pnpm check:deps` | 0 | Yes (0 runtime dependencies) |
| `pnpm check:images` | 0 | Yes |
| `pnpm size` | not run (skipped by instruction) | — (record: 0) |
| `pnpm publint` | 0 | Yes |
| `pnpm attw` | 0 | Yes |
| `pnpm audit` | 0 | Yes (no known vulnerabilities) |
| `python3 …/gener8v-state.py lint` | 0 | Yes (0 errors, 0 warnings) |

*Three spot-check mutations of `src/core/definitions/ruler.ts`, each restored from memory in a Python try/finally (the working tree is unchanged):*
- *Removing `optionalInputs` fails "checks no end against the wrong marks…".*
- *Replacing the index-order test with `false` fails "reports an object whose start is not before its end…".*
- *Removing `ordered: [["start", "end"]]` fails no test. The index check then reports 2→2 and 5→3 at the same path and code. This is test strength, so it is left to Quality Review; it bears on CR-004 only as context.*

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | `unit` is the circle's free-text term (`src/core/definitions/circle.ts:130-136`). GSV-REQ-015 allows one definition per term, so `rulerUnit` is needed. The consistency check passes with the ruler beside the registered maps (`tests/core/definitions.test.ts:681-684`). TICKET-003 and GSV TICKET-002 both carry the names. |
| DEL-002 | Reasonable | The reason is verified: `tests/react/Graph.test.tsx:65-82` requires every registered type to have a layout, a per-type component and a drawable `examples/<type>.json`. The two criteria it moves are carried as Known Hazards on TICKET-003, with the exact steps (`TICKET-003.md:70-75`). GSV TICKET-002 is told to wait for NLC TICKET-003. Until then the ruler is reachable only through `validateWith` and a test registry. |
| DEL-003 | Reasonable, with a defect in its message | The ticket's hazard leaves a new code to the GSV tickets or a DEL, and this DEL records it. Adding a code is compatible with GSV-REQ-034, and the code is documented (GSV-NFR-005) and snapshot-tested. But `below` and `above` reach the caller only in the message ("Ticket Impact"), and the message rounds them to 4 significant digits (CR-001). So the one place a model can read the nearest marks from is wrong for most inch marks. |
| DEL-004 | Reasonable | One rule decides where an end is, with one allowance, as NLC TICKET-001's CR-003 asked. The schema stays looser than validation. The consequence is that computed ends are accepted as marks, but two outputs still state them raw: the text alternative (CR-003) and the same-mark order message (CR-005). |

## Findings

### CR-001: `not_on_mark` rounds the nearest marks to 4 significant digits, so on inch rulers it names values that are not marks, and can name the rejected value itself

**Severity:** Issue
**Location:** `src/core/issues.ts:382-383` (`templates.not_on_mark`, `describeNumber(p.below)` and `describeNumber(p.above)`); `src/core/issues.ts:250-252` (`describeNumber`, `toPrecision(4)`); `src/core/definitions/ruler.ts:155`
**Traces To:**
- NLC-REQ-053 and its Edge Case: "Object end at 3.25 cm, or at 1.3 in on a ruler marked to eighths | … naming the nearest drawn marks";
- the ticket's sixth acceptance criterion ("naming the nearest drawn marks on either side");
- GSV-REQ-031 (a message "says what would make the value acceptable");
- DEL-003.

**Description:** `describeNumber` is meant for computed numbers ("9.549296585513721 → 9.549"). The `not_on_mark` template uses it for the marks either side, but a ruler's marks are exact `index / perUnit` values and need up to 6 significant digits. Probes through `validateWith` with the ruler alone:
- 6 in ruler, default sixteenths, end 2.1: "between the marks at **2.063** and 2.125". The mark is 2.0625.
- 12 in ruler at eighths, end 10.2: "between the marks at **10.13** and 10.25". The mark is 10.125.
- 12 in ruler at sixteenths, end 11.95: "between the marks at **11.94** and 12". The mark is 11.9375.
- A caller who writes the suggested 2.063 is told "got 2.063, between the marks at 2.063 and 2.125". The message names the value it rejects as a mark.

Centimetre marks (at most 4 significant digits, such as 29.9) and the two cases in the criterion ("3.2 and 3.3", "1.25 and 1.375") come out right. That is why the tests pass: none of them checks a sixteenth or an inch mark of 10 or more. DEL-003 puts `below` and `above` in the message only, so no issue field holds the exact marks either.

**Impact:** The default inch ruler is marked to sixteenths. On it, half the marks have 5 or more significant digits, so the message misnames at least one neighbour for most ends that fall between marks. A model that corrects its description from the message (the GSV-REQ-031 loop) writes the misnamed value and is rejected again.
**Recommendation:**
- State the marks exactly in the template, with `String(p.below)` / `String(p.above)` or `formatSupplied` from `./format`. Every mark is `index / perUnit`, whose shortest form is the mark as written: 7.2, 2.0625, 11.9375.
- Add tests at the default sixteenths (2.1 in names 2.0625 and 2.125) and past 10 in at eighths (10.2 in names 10.125 and 10.25). Consider a sample in `tests/core/issues.test.ts` with a 5-digit mark.
- Optional, for the GSV owner: whether the marks should also be published in a field (GSV-REQ-032). DEL-003 chose not to.

**Status:** Fixed
**Resolution:** Approved: `not_on_mark` states the marks with `formatSupplied` (2.0625, 10.125, 11.9375). Tests at sixteenths, at eighths past 10 in and at 11.95 in, and the issues sample uses a 5-digit mark.

---

### CR-002: An inch ruler's length of 0, −3 or 31 is told the centimetre range, "between 1 and 30", and a length of 4.5 is told no range at all

**Severity:** Issue
**Location:** `src/core/definitions/ruler.ts:65-72` (`length`: `min: 1`, `max: LONGEST`), `:117-126` (`lengthFitsUnit`, skipped once `length` fails structurally); `tests/core/ruler-definition.test.ts:68-76`
**Traces To:**
- the ticket's third acceptance criterion: "A length of 0, −3 or 4.5, or one past 30 cm or 12 in, is reported at `/length`, stating the whole lengths allowed for the unit";
- NLC-REQ-042 and its Edge Case ("stating the range of whole lengths allowed for the unit");
- GSV-REQ-031, GSV-REQ-032 (the issue's `range`).

**Description:** The structure stage bounds `length` from 1 to 30, the longest ruler of either unit. Only when that passes does `lengthFitsUnit` apply the inch maximum. Probes:
- Inch ruler, length 0 or −3: `out_of_range`, "length must be a number between 1 and 30; got 0.", with `range: {min: 1, max: 30}`.
- Inch ruler, length 31: the same, "between 1 and 30". Writing 20, as the message permits, then gives "between 1 and 12".
- Either unit, length 4.5: `wrong_kind`, "length must be a whole number; got 4.5.", with no range.

Only the centimetre cases and the inch ruler of 13 to 30 state the unit's range. The test checks code and path for 0, −3, 4.5 and 31 on a centimetre ruler only, and the full message only for an inch ruler of 13.
**Impact:** A caller, or a model, told the wrong range for an inch ruler takes two passes to correct one value. The issue's machine-readable `range` is wrong for inches as well.
**Recommendation:** Decide with the user, then test the message for both units at 0, −3, 4.5 and past the maximum. Either:
- remove `min`/`max` from `length`, as DEL-004 did for the ends, and let `lengthFitsUnit` report every whole length outside 1 to the unit's maximum with the unit's range. The published schema then has no bound on `length`, which is looser than validation and so allowed (GSV-NFR-003); or
- keep the structural bounds and record, as a deviation, that inch lengths below 1 or above 30 are told "1 to 30".

For 4.5, either record that the `integer` kind's "a whole number" meets "stating the whole lengths allowed", or add the unit's range to it.
**Status:** Fixed
**Resolution:** Approved: `length` has no structural bounds. `lengthFitsUnit` reports 0, −3 and past the maximum with the unit's own range, tested on both units. 4.5 stays "a whole number", recorded as a deviation with the refused-unit consequence.

---

### CR-003: The text alternative states a computed end as its raw value ("the 0.30000000000000004 cm mark", "the -0.000000000000000027755575615628914 cm mark") where validation located a mark

**Severity:** Issue
**Location:** `src/core/definitions/ruler.ts:44` (`markValue = formatSupplied`), `:208`; `tests/core/ruler-definition.test.ts:102-105` (computed ends accepted, but their text never checked)
**Traces To:**
- NLC-REQ-056 ("stating … its start and end marks");
- the ticket's seventh acceptance criterion;
- prd/CC-002 (WCAG 1.1.1);
- DEL-004 and the carried hazards from NLC TICKET-001's CR-003 and QR-001 ("30.000000000000004 is the 30 cm end and −2.8e-17 is 0").

**Description:** DEL-004 lets an end that a caller's code computed be accepted as the mark it is within noise of. `rulerScale(…).locate` returns that mark's own value (`{ kind: "mark", index, value }`, `src/core/ruler.ts:57`), so it is available. But `describe` states `object.start` and `object.end` as supplied, through `formatSupplied`, which writes every digit. Probes:
- start `0.1 + 0.2`, end `1.1 + 2.2` on a 15 cm ruler: "from the 0.30000000000000004 cm mark to the 3.3000000000000003 cm mark";
- start `0.3 - 0.1 - 0.2`, end `0.1 * 3 * 100` on a 30 cm ruler: "from the -0.000000000000000027755575615628914 cm mark to the 30.000000000000004 cm mark".

Neither value is a mark of the ruler. The tests accept these descriptions but never read their text.
**Impact:**
- A screen reader reads a 35-digit negative number as the object's start.
- The model tool returns the same sentence as its summary (AD-015).
- The drawing (TICKET-003) marks 0 and 30, so the figure and its text alternative disagree, for inputs the delivery chose to accept.

**Recommendation:**
- In `describe`, build `rulerScale(ruler.rulerUnit, ruler.length, ruler.smallestDivision)` and state each end as `scale.locate(end).value`. For a validated ruler the location is always a mark, so 0.1 + 0.2 reads "the 0.3 cm mark".
- Add text tests with computed ends.
- This also makes the record's statement that `describe` builds its ruler with `rulerScale` true (CR-007).
- Consider a Known Hazard on TICKET-003 to draw each end at the located mark's value too.

**Status:** Fixed
**Resolution:** Approved: `describe` states each end as `scaleOf(ruler).locate(end).value`, tested with computed ends. A Known Hazard on TICKET-003 says to draw the bar at the located marks.

---

### CR-004: Two `@spec Coverage` rows name locations without the ID: NLC-REQ-051 at `rulerProperties` (the `ordered` pair), and NLC-REQ-046 at `ruler.describe`

**Severity:** Issue
**Location:** `src/core/definitions/ruler.ts:52` (annotation above `rulerProperties`, no NLC-REQ-051), `:113` (`ordered`), `:193` (annotation above `describe`, `NLC-REQ-056` only); `.gener8v/specifications/number-lines-and-coordinate-graphs.md:212`, `:221`; delivery record `## @spec Annotations` (`.gener8v/changes/rulers/delivery/number-lines-and-coordinate-graphs-ticket-002-delivery.md:217-223`)
**Traces To:**
- Code Review step 8;
- `CLAUDE.md` Traceability ("Every function, class or handler that implements a requirement carries `@spec`"; "`grep -rn "@spec"` audits coverage");
- NLC-REQ-051, NLC-REQ-046;
- precedent: `rulers/graph-specification-and-vocabulary-ticket-001-code-review/CR-004` (Issue, the same mismatch).

**Description:**
- **NLC-REQ-051.** The row is "`rulerProperties` (`ordered` start and end), objectOnMarks (ends ordered by mark index)". `ordered` on `measuredObject` is what reports every ordinary reversal: 2→2 and 5→3 never reach the domain stage. Yet the annotation above `rulerProperties` lists NLC-REQ-001, 041, 042, 046, 049 and 054 and the GSV IDs, but not 051. `grep -rn "@spec"` finds NLC-REQ-051 only at `objectOnMarks`, and the record's table lists only `objectOnMarks`. Removing `ordered` fails no test (spot-check), so nothing else ties the `ordered` pair to the requirement.
- **NLC-REQ-046.** The row names "ruler.describe (the default stated)". The annotation directly above `describe` is `// @spec NLC-REQ-056` only. NLC-REQ-046 sits on `ruler` (`:178`), which the row does not name.

**Impact:** The coverage table and the `@spec` audit disagree on two locations, and the next sweep will report them as stale. Someone changing `ordered` cannot tell from the code that it serves NLC-REQ-051.
**Recommendation:**
- Add `NLC-REQ-051` to the annotation at `src/core/definitions/ruler.ts:52`.
- Either add `NLC-REQ-046` to the annotation at `:193`, or change the 046 row to name `ruler`.
- Make the record's `## @spec Annotations` table match.

**Status:** Fixed
**Resolution:** Approved: NLC-REQ-051 is on `rulerProperties`, and NLC-REQ-046 on `describe`. The record's `@spec` table and the NLC coverage rows match the new check names.

---

### CR-005: For the same mark written two ways, the order issue says the end "must be a number greater than 0.3; got 0.30000000000000004", which the value already is

**Severity:** Observation
**Location:** `src/core/definitions/ruler.ts:160-168` (`range: { min: start.value, exclusiveMin: true }`, `got: object.end`)
**Traces To:** GSV-REQ-031 ("says what would make the value acceptable"); NLC-REQ-051; the carried hazard from NLC TICKET-001's QR-001 (order by mark index, report it once)
**Description:** The index-order check runs only when the structural `ordered` check passed, that is when the end is numerically greater than the start but lies on the same mark (0.3 and 0.1 + 0.2). For that case the issue reads "measuredObject.end must be a number greater than 0.3; got 0.30000000000000004." (probe). Read literally, the message says the value is acceptable. Its `range` says the same.
**Impact:** This affects only computed values, and it is reported once at the right path, as the hazard asks. But the correction it suggests is one the value already meets.
**Recommendation:** State the next mark instead. A range of `{ min: (start.index + 1) / scale.marksPerUnit }` gives "must be a number at least 0.4; got 0.30000000000000004", which is true and actionable. Pin the message in the test at `tests/core/ruler-definition.test.ts:112-114`.
**Status:** Fixed
**Resolution:** Approved: the order issue's range is `{ min: next mark }`: "must be a number at least 0.4; got 0.30000000000000004." Pinned in the test.

---

### CR-006: The GSV-REQ-040 and 049..051 coverage rows name `ruler.ts` without saying the ruler is not yet registered or published, unlike the NLC-REQ-001 row

**Severity:** Observation
**Location:** `.gener8v/specifications/graph-specification-and-vocabulary.md:201` (GSV-REQ-040), `:241-243` (GSV-REQ-049..051); compare `.gener8v/specifications/number-lines-and-coordinate-graphs.md:218` (NLC-REQ-001, "registered with rulers NLC TICKET-003")
**Traces To:**
- GSV-REQ-049 and GSV-REQ-050 ("a fixed, **published** list");
- DEL-002;
- `rulers/graph-specification-and-vocabulary-ticket-001-code-review/CR-005`, whose Impact was that these requirements would "read as covered by code that accepts no ruler at all";
- the brief to assess whether the deferral is recorded properly.

**Description:** The rows now name `src/core/definitions/ruler.ts`:rulerProperties next to `src/core/schema.ts`:termUses ("the published list and its descriptions"). Until TICKET-003 registers the ruler, the ruler is in neither the published schema nor the vocabulary, and `validate` answers `unknown_graph_type` (probe). The NLC-REQ-001 row says so, but these four rows read as complete.
**Impact:** An audit before TICKET-003 reads the published unit and division lists as delivered. This is the gap GSV CR-005 was deferred to close.
**Recommendation:** Qualify the `ruler.ts` entry in the four rows as the NLC-REQ-001 row does, for example "(ruler part; published once registered with rulers NLC TICKET-003)". TICKET-003, or GSV TICKET-002, then removes the qualifier.
**Status:** Fixed
**Resolution:** Approved: the four GSV rows say "(ruler part; published once registered with rulers NLC TICKET-003)".

---

### CR-007: The record says `quoteText` clips the label and that `describe` builds its ruler with `rulerScale`; it does neither, and the departure from the ticket's `maxLength` hazard is recorded as resolved, not as a deviation

**Severity:** Observation
**Location:**
- delivery record Pre-Flight row "Shared `label` has a `maxLength`" (`.gener8v/changes/rulers/delivery/number-lines-and-coordinate-graphs-ticket-002-delivery.md:32`);
- the same record's "Resolved from ground truth: The default division" (`:38`) and Notes, For TICKET-003 (`:229`);
- `.gener8v/changes/rulers/tickets/number-lines-and-coordinate-graphs/TICKET-003.md:75` ("as `describe` does");
- `src/core/format.ts:186-188` (`quoteText`);
- `src/core/definitions/ruler.ts:202`.

**Traces To:**
- the ticket's Known Hazard: "Every caller string (the object's label) goes through `quoteText` in `describe` and is capped with `maxLength`";
- the ticket's Known Hazard on the default division ("Either way the text alternative and the drawing must use the same division");
- GSV Edge Cases ("Label text is very long | … accept it");
- `CONVENTIONS.md` §9.

**Description:**
- **`quoteText`.** The reconciliation marks the `maxLength` hazard "✅ Resolved: … `describe` quotes it with `quoteText`, which clips". `quoteText` cleans the text and adds quotation marks; it does not clip. The label is stated whole. Not capping it is consistent with the GSV Edge Case and with the graph-library hazard "keep the full text in the text alternative". The shared `label` must also be nested as is. So the outcome is defensible, but the reason given is untrue, and the ticket's instruction is departed from without a Deviation entry.
- **`rulerScale`.** The record says "`describe` and the layout both build their ruler with it, so they cannot differ". TICKET-003's new hazard tells its implementer to build the marks "as `describe` does". But `describe` reads `ruler.smallestDivision ?? DEFAULT_INCH_DIVISION` and never calls `rulerScale`. The two agree today only because both use the same constant.

**Impact:** TICKET-003's implementer, and later readers, are told two things about the code that are not so. The departure from the `maxLength` hazard is not visible as a deviation.
**Recommendation:**
- Correct the Pre-Flight row: the label is stated whole by design, with the GSV Edge Case and the graph-library hazard as the reason.
- Add a Deviation: the `maxLength` cap is not applied because the shared `label` must be nested as is, and long labels are accepted.
- Either make `describe` build `rulerScale`, which CR-003's fix does, or reword `:38`, `:229` and `TICKET-003.md:75`.

**Status:** Fixed
**Resolution:** Approved: the Pre-Flight row gives the real reason the label is not capped. A Deviation records the `maxLength` hazard not applied. "Resolved from ground truth" now matches the code, since CR-003 makes `describe` use `rulerScale`.

---

### CR-008: One check covers both ends, so a start that fails on its own hides an independent fault at the end until the next pass

**Severity:** Observation
**Location:** `src/core/definitions/ruler.ts:138-171` (`objectOnMarks`, `inputs` including both `measuredObject/start` and `measuredObject/end`); `src/core/validate/domain.ts:37-40`; `src/core/validate/state.ts:20-32`
**Traces To:** GSV-REQ-017 ("report every problem found in a description in one validation pass"); AD-004 Rationale ("Every independent problem is reported, but no issue is a consequence of another")
**Description:** `runDomainChecks` skips a whole check when any of its inputs failed. With `{ start: "2", end: 7.25 }` on a 15 cm ruler, only `wrong_kind /measuredObject/start` is reported. The end lying between 7.2 and 7.3 is an independent fault, and it appears only on the next pass (probe). The same holds for an end off the ruler. A failed `label`, `color` or `title` does not hide it, since the check does not read them.
**Impact:** Two passes for two independent faults. This is minor, and it is the same whole-check skip the other types' checks have (for example `points/*/x`).
**Recommendation:** Either split `objectOnMarks` into one check per end (`inputs: ["rulerUnit", "length", "measuredObject/<end>"]`, the same `optionalInputs`) plus an order check that reads both, or dismiss this as consistent with the codebase's skip rule.
**Status:** Fixed
**Resolution:** Approved: split into `endOnMark("start")`, `endOnMark("end")` and `objectInOrder`. Independent faults at the two ends are reported in one pass, tested both ways round.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Approved | `not_on_mark` states the marks with `formatSupplied` (2.0625, 10.125, 11.9375). Tests at sixteenths, at eighths past 10 in and at 11.95 in, and the issues sample uses a 5-digit mark. | `src/core/issues.ts`, `tests/core/ruler-definition.test.ts`, `tests/core/issues.test.ts` |
| CR-002 | Approved | `length` has no structural bounds. `lengthFitsUnit` reports 0, −3 and past the maximum with the unit's own range, tested on both units. 4.5 stays "a whole number", recorded as a deviation with the refused-unit consequence. | `src/core/definitions/ruler.ts`, `tests/core/ruler-definition.test.ts`, delivery record |
| CR-003 | Approved | `describe` states each end as `scaleOf(ruler).locate(end).value`, tested with computed ends. A Known Hazard on TICKET-003 says to draw the bar at the located marks. | `src/core/definitions/ruler.ts`, `tests/core/ruler-definition.test.ts`, `TICKET-003.md` |
| CR-004 | Approved | NLC-REQ-051 is on `rulerProperties`, and NLC-REQ-046 on `describe`. The record's `@spec` table and the NLC coverage rows match the new check names. | `src/core/definitions/ruler.ts`, `.gener8v/specifications/number-lines-and-coordinate-graphs.md`, delivery record |
| CR-005 | Approved | the order issue's range is `{ min: next mark }`: "must be a number at least 0.4; got 0.30000000000000004." Pinned in the test. | `src/core/definitions/ruler.ts`, `tests/core/ruler-definition.test.ts` |
| CR-006 | Approved | the four GSV rows say "(ruler part; published once registered with rulers NLC TICKET-003)". | `.gener8v/specifications/graph-specification-and-vocabulary.md` |
| CR-007 | Approved | the Pre-Flight row gives the real reason the label is not capped. A Deviation records the `maxLength` hazard not applied. "Resolved from ground truth" now matches the code, since CR-003 makes `describe` use `rulerScale`. | delivery record |
| CR-008 | Approved | split into `endOnMark("start")`, `endOnMark("end")` and `objectInOrder`. Independent faults at the two ends are reported in one pass, tested both ways round. | `src/core/definitions/ruler.ts`, `tests/core/ruler-definition.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (all 8 Fixed: 4 Issues, 4 Observations)
**Notes:**
- Every finding was resolved in the main session with the Engineer's approval (2026-10-21). The changes are recorded in the delivery record's `## Post-Review Amendments`.
- The third, sixth and seventh acceptance criteria are now met:
  - an inch ruler's bad length is told the inch range;
  - `not_on_mark` names exact marks;
  - the text alternative states located marks.
- Re-verification: every Verification Run command exits 0, and `pnpm test` passes 1,340 tests on three runs. Six deliberate breaks of the fixes each fail a test.
- The two criteria DEL-002 moved to TICKET-003 (`pnpm generate` with the ruler, and NLC-REQ-013's supplied text alternative) remain Known Hazards there, with a new one from CR-003.
