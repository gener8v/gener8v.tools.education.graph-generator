# TICKET-002: Define the ruler graph type: terms, checks and text alternative

**Change:** rulers
**Capability Area:** Number Lines & Coordinate Graphs (number-lines-and-coordinate-graphs)
**Specification:** specifications/number-lines-and-coordinate-graphs.md

**Summary:** Add the `ruler` graph type's definition: its unit, length, inch smallest division and measured object (start mark, end mark, label, color). Add its checks for the unit, the length, the object's order, its place on the ruler and ends that fall between marks. Add the generated text alternative, a valid example and invalid examples.
**Priority:** Must
**Value:** A curriculum developer or a model can write a ruler description and get it validated with actionable messages, such as an unknown unit, a length past the maximum, or an object end between marks, before anything is drawn.

**Requirements Covered:**
- NLC-REQ-001: Ruler parameters defined in the single definition using vocabulary terms (ruler part)
- NLC-REQ-041: Centimetres and inches accepted as the unit; any other unit reported
- NLC-REQ-042: A length that is not whole, is zero or negative, or exceeds the maximum for its unit is reported
- NLC-REQ-046: Optional smallest division for an inch ruler (half, quarter, eighth, sixteenth), a sixteenth by default
- NLC-REQ-049: Optional object given by a start mark and an end mark, either of which may be any mark
- NLC-REQ-051: An object whose start is not before its end is reported
- NLC-REQ-052: An object start or end outside the ruler is reported
- NLC-REQ-053: An object start or end that is not a drawn mark is reported
- NLC-REQ-054: Optional color and label for an object, applied per GSV-REQ-040..045
- NLC-REQ-056: Text alternative stating unit, length, smallest division and, with an object, its label and start and end marks

**Prior Art:**
- Read: `.gener8v/specifications/number-lines-and-coordinate-graphs.md` — Rulers requirements, Behaviors & Rules → Rulers (object ends as decimals in the ruler's unit, such as 3.4 cm and 2.0625 in), the ruler rows of Edge Cases, and Data Requirements for a ruler
- Read: `.gener8v/specifications/graph-specification-and-vocabulary.md` — Ruler Vocabulary (GSV-REQ-046..051), Behaviors & Rules → Rulers (US spellings `centimeters` and `inches`, variants reported, the unit given once, values as plain numbers), and the ruler rows of Edge Cases
- Read: `.gener8v/technical-design/system-design.md` — AD-003 (one definition), AD-004 (staged validator; no check on a value that failed earlier), AD-005 (`type` in kebab case, properties in camel case)
- Read: TICKET-001 output at `src/core/ruler.ts` — units, divisions and their default, maximum lengths, the is-a-mark predicate with nearest marks
- Read: `src/core/definitions/types.ts` (`defineProperties`, the `integer`, `enum` and `object` kinds, `ordered`, `DomainCheck`), `src/core/definitions/shared.ts` (`appliesTo`, `elementsOf`), `src/core/definitions/index.ts` (registry), `src/core/issues.ts` (`out_of_range`, `inapplicable_property`, `createIssue`), `src/core/format.ts` (`quoteText`, `stateMeasurement`, `sourceOf`)
- Read: `src/core/definitions/circle.ts` and `src/core/definitions/bar-graph.ts` — delivered definitions to match in shape (enum terms, element label and color, `describe` with provenance)
- Read: `.gener8v/changes/graph-library/tickets/number-lines-and-coordinate-graphs/TICKET-002.md` → Known Hazards — the definition contract every type follows (`defineProperties`, shared options never listed in `properties`, `quoteText`, `maxItems`/`maxLength`, `DomainCheck` `inputs`, rich `examples/<type>.json`, `pnpm generate`, `describe(normalized, provenance)`)

**Acceptance Criteria:**
- [ ] `examples/ruler.json` (a centimetre ruler with an object from a mark other than 0, with label and color) and an inch example in the tests validate. The example uses every optional term once
- [ ] The `ruler` type has `unit` (`centimeters` or `inches`, an enum), `length` (a whole number at least 1), an optional smallest division (an enum of half, quarter, eighth and sixteenth, applying to inch rulers only) and an optional object (start mark, end mark, and the shared `label` and `color`). Each term has a plain-English description stating its limits
- [ ] An unknown unit ("cm", "centimetres", "feet") is reported at `/unit`, listing the accepted names. A length of 0, −3 or 4.5, or one past 30 cm or 12 in, is reported at `/length`, stating the whole lengths allowed for the unit
- [ ] A smallest division given on a centimetre ruler is reported as `inapplicable_property` at its path, as not applying to a centimetre ruler (GSV-REQ-051)
- [ ] An object from 2 to 2, or from 5 to 3, is reported once at its end mark. An end mark below 0 or past the length is reported at its path, naming the ruler's range. A mark at exactly 0 or exactly the length is accepted
- [ ] An object end at 3.25 cm, or at 1.3 in on a ruler marked to eighths, is reported at its path, naming the nearest drawn marks on either side. 3.4 cm, 0.7 cm and 2.0625 in at sixteenths are accepted. The check uses TICKET-001's predicate, so the validator and the drawing agree
- [ ] The generated text alternative states "ruler", the unit, the length, the smallest division (the default when none was given) and, with an object, its label (quoted) and its start and end marks. It never states the object's length (NLC-REQ-055). A supplied `textAlternative` replaces it (NLC-REQ-013)
- [ ] Invalid examples exist for an object end between marks and for an unknown unit, each producing exactly the documented issue
- [ ] `pnpm generate` regenerates the schema, the types and the vocabulary with the ruler terms, and `tests/core/definitions.test.ts` and `tests/core/schema-agreement.test.ts` pass with the new type

**Output:**
- `src/core/definitions/ruler.ts` — GraphTypeDefinition for `ruler` (properties, `ordered` start/end, domain checks for the length maximum, the object on the ruler, the object on a mark and the division on an inch ruler only; `describe`), registered in `src/core/definitions/index.ts`
- `src/generated/*` — regenerated
- `examples/ruler.json`; `examples/invalid/ruler-object-between-marks.json`; `examples/invalid/ruler-unknown-unit.json`
- `tests/core/ruler-definition.test.ts` — proves the validation, issue-path, inapplicable-division, ordering, on-ruler, on-mark and text-alternative criteria

**Constraints:**
- prd/CC-002: a text alternative for every graph (WCAG 1.1.1)
- prd/TC-005: the definition is core code, with no React and no browser global

**Known Hazards:**
- Cross-area predecessor: the `rulers` Graph Specification & Vocabulary tickets (`changes/rulers/tickets/graph-specification-and-vocabulary/`) own the type list (GSV-REQ-003), the shared object label and color (GSV-REQ-040, `elementsOf`), the published unit and division lists, the conditional applicability of the smallest division (GSV-REQ-051), and any new issue code. Read their backlog first. If they are not delivered, deliver them first, or record in DEL-XXX which part this ticket does and why.
- Naming (AD-005, GSV spec): the type value is `ruler`, and the unit values are the US spellings `centimeters` and `inches`. Choose the camelCase term names (for example `length`, `smallestDivision`, `object`, `start`, `end`), check them against the existing vocabulary for clashes (`length` may already be a term, for example a square's side), and record the choice as a DEL-XXX. A term shared with another type must keep one definition (GSV-REQ-015), so if `length` already means something else, choose another name.
- The smallest division's default (a sixteenth) is stated in the text alternative and the description text. Decide whether it is filled in normalization or applied in the layout (graph-library NLC DEL-004 applies `showTickLabels`' default in layouts) and record it. Either way the text alternative and the drawing must use the same division.
- An off-mark end must be reported with TICKET-001's predicate, never by a fresh `value * 10 % 1` test: 0.7 × 10 is not exactly 7.
- Order the checks so one fault gives one issue (AD-004). A reversed object should not also be reported as off the ruler, and an end off the ruler should not also be reported as between marks. Declare every path the check reads in `inputs`.
- Every caller string (the object's label) goes through `quoteText` in `describe` and is capped with `maxLength`, as the graph-library hazards require (GSS TICKET-002 SEC-001).
- Carried from rulers/number-lines-and-coordinate-graphs-ticket-001-code-review/CR-001 (a refused division reaches domain checks as absent):
  - The validator leaves a refused value out of the description, so when an inch ruler's division is refused ("eighths", 8), the domain stage sees no division, and `divisionsPerUnit` / `rulerMarks` answer for sixteenths.
  - Skip the off-mark check while the division is being reported: declare the division in the check's `inputs`, or test whether a division was supplied but failed, and say which in a DEL-XXX. Otherwise an end valid only at sixteenths is accepted on a ruler meant for eighths.
  - Only an absent (undefined) division takes the default. `null` is refused (`divisionsPerUnit` returns undefined).
- Carried from rulers/number-lines-and-coordinate-graphs-ticket-001-code-review/CR-003 (the ruler's ends):
  - Decide "on the ruler" and "on a mark" with the core rule, not a fresh comparison.
    - `isOnRuler(value, length, divisions)` and `rulerMarkIndex(value, length, divisions)` (`src/core/ruler.ts`) share `isRulerMark`'s noise allowance.
    - So 30.000000000000004 is the 30 cm end and −2.8e-17 is 0. A plain `value > length` would report them as off the ruler while the drawing marks them.
  - `nearestRulerMarks` does not clamp to the ruler: call it only for an end that `isOnRuler` accepts.
  - Correction to the hazard above: 0.7 × 10 is exactly 7, as is every decimal written to one place from 0.0 to 30.0. Noise comes from values a caller's code computes (0.1 + 0.2). The rule is unchanged: use the core predicates.

**Depends On:** TICKET-001
**Blocks:** TICKET-003

**Size:** Medium

**Notes:** NLC-REQ-013 (the caller-supplied text alternative) and NLC-REQ-012 are graph-library requirements; the ruler meets them through the shared `textAlternative` term, and this ticket's tests cover the ruler's case. Open question OQ-009 (whether 30 cm and 12 in are the right maximums) is unresolved: keep the maximums as the named constants from TICKET-001 so a change is one edit.
