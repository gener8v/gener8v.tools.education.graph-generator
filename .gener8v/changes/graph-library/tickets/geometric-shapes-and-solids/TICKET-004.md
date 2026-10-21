# TICKET-004: Triangle definition and solver

**Change:** graph-library
**Capability Area:** Geometric Shapes & Solids (geometric-shapes-and-solids)
**Specification:** specifications/geometric-shapes-and-solids.md

**Summary:** Define the `triangle` type's four determining sets (three sides; two sides and included angle; two angles and a side; three vertices) and implement the solver that derives the remaining sides and angles and reports contradictions, insufficiency, ambiguity and degenerate input.
**Priority:** Must
**Value:** A developer can specify a triangle the way a textbook problem does, and impossible or ambiguous triangles are rejected with a precise explanation instead of being drawn wrong.

**Requirements Covered:**
- GSS-REQ-010: Triangle from three side lengths
- GSS-REQ-011: Triangle from two sides and the included angle
- GSS-REQ-012: Triangle from two angles and one side
- GSS-REQ-013: Triangle from three vertex coordinates
- GSS-REQ-014: Derive remaining sides and angles from the supplied set
- GSS-REQ-015: Triangle inequality violations reported as contradiction
- GSS-REQ-016: Angle sum not 180° (within tolerance) reported as contradiction
- GSS-REQ-017: Three angles with no side reported as insufficient
- GSS-REQ-018: Two sides and a non-included angle with two solutions reported as ambiguous, stating both third sides
- GSS-REQ-019: Collinear or coincident vertices reported as not forming a triangle
- GSS-NFR-002: Derived sides and angles reproduce supplied ones within 10⁻⁹ relative error when recomputed

**Prior Art:**
- Read: `.gener8v/specifications/geometric-shapes-and-solids.md` — GSS-REQ-010..019, GSS-NFR-002, Behaviors (determining sets; extra values are statements to check), Edge Cases (3, 4, 7 degenerate; SSA with one / no solution; angle 0° or ≥ 180°), OQ-004, OQ-006 (degrees only)
- Read: `.gener8v/technical-design/system-design.md` — AD-004 (stages 3–4: derivation then domain checks on stage-2-valid members), TR-008 (law of cosines, clamp `acos` arguments to [−1, 1])
- Read: `src/core/validate/derive.ts`, `src/core/validate/domain.ts`, `src/core/issues.ts` — produced by graph-library/graph-specification-and-vocabulary/TICKET-004 and TICKET-002
- Read: `src/core/definitions/types.ts` — produced by graph-library/graph-specification-and-vocabulary/TICKET-001

**Acceptance Criteria:**
- [ ] Each determining set (SSS, SAS, ASA/AAS, vertices) validates and yields all three sides and all three angles in the normalized description, with provenance supplied/derived
- [ ] Values supplied beyond a determining set are checked within the GSV 1% tolerance and reported as `contradiction` when they disagree
- [ ] Sides 3, 4, 7 (equality) and 3, 4, 8 return `contradiction` (triangle inequality) naming the three sides
- [ ] Supplied angles not summing to 180° within tolerance return `contradiction`
- [ ] Three angles and no side return `insufficient`
- [ ] SSA with two solutions returns `ambiguous` whose message states both possible third-side lengths; SSA with exactly one solution (right or obtuse given angle) is accepted; SSA with no solution returns `contradiction`
- [ ] Collinear or coincident vertices return `not_a_triangle`
- [ ] Angles of 0° or ≥ 180° return `out_of_range`; angles are in degrees
- [ ] Derived sides and angles reproduce the supplied ones within 10⁻⁹ relative error when recomputed, verified by a fast-check property round-trip test over at least 1,000 generated non-degenerate triangles per determining set (GSS-NFR-002)

**Output:**
- `src/core/geometry/triangle-solver.ts` — `solveTriangle(input) → { sides, angles } | Issue[]` for each determining set; consumed by TICKET-005
- `src/core/definitions/triangle.ts` — triangle GraphTypeDefinition (properties `sides`, `angles`, `vertices`, `vertexNames`, label options, `unit`; derivations and checks delegating to the solver; `describe`), registered in `src/core/definitions/index.ts`
- `src/core/issues.ts` — confirm `not_a_triangle`, `ambiguous`, `insufficient` codes are documented
- `tests/core/triangle-solver.test.ts` — determining sets, inequality, angle sum, insufficient, SSA cases, collinear, range
- `tests/core/triangle-solver.property.test.ts` — GSS-NFR-002 round trip

**Constraints:** None identified beyond the GSV validation contract

**Known Hazards:**
- Stage ordering (AD-004): run the solver only on properties that passed structural checks; a non-numeric side must not also produce a triangle-inequality issue.
- `Math.acos` of a value a hair outside [−1, 1] returns NaN near degenerate triangles (TR-008): clamp before calling.
- GSS OQ-004 (let a description choose one SSA solution) is open; implement rejection as specified, do not add a chooser property.
- Degenerate means "equals, not exceeds": sides 3, 4, 7 must be rejected even though the sum is equal.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-001-code-review/CR-002 and graph-library/graph-specification-and-vocabulary-ticket-001-quality-review/QR-001, QR-002 (the definition contract, RES-001):
  - Build every properties map with `defineProperties` (`src/core/definitions/types.ts`), which freezes it and removes prototypes.
  - Never list a shared top-level option (`title`, `lineColor`, axis labels…) in `properties`: `propertiesOf(type)` adds it from its `appliesTo`.
  - Nest the shared `label`/`color` (or `lineLabel`/`lineColor` for series) spec objects themselves in element specs, exactly when `elementsOf` lists the type.
  - Import text helpers from `src/core/format.ts`, never `src/core/describe.ts` (lint enforces it).
  - In `describe`, pass every caller string through `quoteText`, and state measurements with `formatMeasurement(value, provenance, unit)` so supplied values appear as written and derived values rounded.
  - Register the definition in `src/core/definitions/index.ts`, and run the applicability and consistency checks in `tests/core/definitions.test.ts` against it.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-003-security-review/SEC-001 (Product Owner decision 2026-10-06): every `array` spec must set `maxItems` (the compiler requires it) to a curriculum-sized number. For example, at most 1,000 points or categories, or what the type's specification implies. A longer list is reported once as `too_large`. The whole description is capped at `DESCRIPTION_VALUE_LIMIT` (10,000 values, `src/core/validate/structure.ts`); keep every example well under both, and record the chosen limits in the definition's description text.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-004-code-review/CR-001 and graph-library/graph-specification-and-vocabulary-ticket-004-quality-review/QR-001, QR-004: every derivation-group member must be a top-level `number` term with a curriculum-sized positive `min` and a finite `max`; `tests/core/definitions.test.ts` enforces this. That test also requires `derive` to return every member as a finite positive number and to round-trip, and no member may be in two groups. Stage 3 checks each derived value against its own member's range and reports the supplied value as `out_of_range`, with the range that keeps every member in its own. Choose the members' limits to agree with each other; for example, circumference max ≈ 2π × radius max.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-004-code-review/CR-003 and graph-library/graph-specification-and-vocabulary-ticket-004-security-review/SEC-004: domain checks (`DomainCheck`, `src/core/definitions/types.ts`):
  - `inputs` are the paths the check reads, as JSON Pointers without the leading slash, with `*` for any list position (`["xAxis/min", "xAxis/max", "points/*/x"]`). The check is skipped only when an earlier failure touches one of them; `tests/core/definitions.test.ts` checks that every path exists.
  - The description a check receives is frozen; never change it.
  - Build every issue with `createIssue`. A hand-built issue, or one with a message over 2,000 characters, is treated as a package defect.
  - A check's work must grow with the description's size, never with a value's magnitude. For example, count ticks arithmetically (`floor(range / spacing)`) and compare with the limit before enumerating anything.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-005-code-review/CR-001 and graph-library/graph-specification-and-vocabulary-ticket-005-quality-review/QR-001, QR-002: `examples/<type>.json` must be a valid description of the type (it is the base the GSV-NFR-003 agreement test mutates one fault at a time; `tests/core/schema-agreement.test.ts` fails with a message naming the missing file when the type registers without one). Keep it rich: every optional term used once and lists with at least one element, so every property is mutated. Also run `pnpm generate` and commit the regenerated `src/generated` files in this delivery.
- Carried from graph-library/geometric-shapes-and-solids-ticket-002-code-review/CR-003 (DEL-001 on that delivery): the definition and layout contract now passes the provenance. Write `describe(normalized, provenance)` and `layout(normalized, provenance)` (`Layout<D>` in `src/layout/registry.ts`), even where the technical design and this ticket's Output still show one argument. TypeScript accepts a one-argument function, so dropping the provenance compiles; it then shows supplied values rounded (GSS-REQ-034 and its equivalents). Read a value's source with `sourceOf(provenance, term)` (`src/core/format.ts`). Call your own definition's `describe` from the layout, never `describeNormalized`, so no registry is reached. Draw a title with `titleBlock` (`src/layout/kit/title.ts`), and treat a title that is blank after cleaning as absent in `describe` too (code review CR-001).
- Carried from graph-library/geometric-shapes-and-solids-ticket-002-security-review/SEC-001, SEC-002 and SEC-003 (caller-sized text):
  - Never spread a caller-sized array into function arguments (`f(...nodes)`, `Math.max(...widths)`, `push(...lines)`). Above about 65,000 arguments in Safari, and about 120,000 in V8, the call throws. Use a loop, or pass one array (`SceneSvg` already does).
  - Wrap every label with `wrap(text, maxWidth, fontSize, maxLines)`, as the circle does with `LABEL_MAX_LINES` (4), and draw titles with `titleBlock`, which caps them at `TITLE_MAX_LINES` (3). The cut line ends in "…" (DEL-008), so the Scene stays small however long the description's text. Say so in the label-text descriptions, and keep the full text in the text alternative.
  - In `describe`, state measurements with `stateMeasurement(value, source, unit)` (`src/core/format.ts`), not `formatMeasurement`. It quotes a unit that is not unit-shaped, so the unit cannot read as the package's own sentence. Drawn labels keep `measurementLabel` / `formatMeasurement`.
  - Add a test that a valid description with half a megabyte of unit or label text renders in `<Graph>` and the type's component without throwing, with a bounded number of text nodes.
- Carried from graph-library/graph-specification-and-vocabulary/TICKET-007 (GSV-REQ-052..054, GSV OQ-009, Product Owner 2026-10-21) (ready-tickets reconciliation, 2026-10-21): caller text is capped. Every title, label, name and label text is at most 200 characters (`CALLER_TEXT_LIMIT`) and `unit` at most 20 (`UNIT_TEXT_LIMIT`), both from `src/core/definitions/shared.ts`. Longer text is reported as `too_large` and never drawn. **This supersedes any bullet above asking for a test that half a megabyte of unit or label text renders**, and the Edge Case "Label text is very long: accept it".
  - Add this type to the at-the-limit tests in `tests/react/Graph.test.tsx`: a valid description with every text at its limit renders in `<Graph>` and the type's component without throwing, with a bounded number of text nodes. Use `wordsOf(CALLER_TEXT_LIMIT)`, `"@".repeat(UNIT_TEXT_LIMIT)` and `oneClusterTexts(CALLER_TEXT_LIMIT)` from `tests/fixtures/plain-text.ts`.
  - Add one over-limit case per text term to "refuses every caller text one character over its limit".
  - The line caps stay. `wrap` and `titleBlock` still cut, and `wrap` now also bounds stacked marks (`MAX_STACKED_MARKS`) and cluster length (`MAX_CLUSTER_LENGTH`) in `src/layout/kit/text.ts`. Draw every caller text through `wrap`, never as a raw `text` node, and measure boxes from `wrap`'s lines.
  - For this ticket: the at-the-limit render test belongs to TICKET-005, which draws the triangle; this ticket keeps the validation half (`too_large` at 201 characters).
- Carried from graph-library/graph-specification-and-vocabulary/TICKET-007 (ready-tickets reconciliation, 2026-10-21): every `kind: "string"` term this definition adds sets `maxLength`, including label texts, names and the string items of a list.
  - The term named exactly `unit` takes `UNIT_TEXT_LIMIT`; every other string term takes `CALLER_TEXT_LIMIT`. Its description states "at most N characters".
  - `tests/core/validate-structure.test.ts` ("caller text limits") checks every registered type and decides the 20-character limit by the term name `unit` alone, so a unit-like term with another name gets 200.
  - Follow `src/core/definitions/circle.ts` (`labelText`, `unit`). Nest the shared `label` spec object itself, which already carries its limit; never copy it.
  - `vertexNames` items take `CALLER_TEXT_LIMIT`, and the list takes `maxItems: 3`.
- Build the triangle definition with `/* @__PURE__ */ defineTriangle()`, never a plain object, so it stays out of every other type's bundle (the circle's plain object reaches them all). (ready-tickets reconciliation, 2026-10-21)

**Depends On:** None
**Blocks:** TICKET-005

**Size:** Large

**Notes:** Cross-area predecessors graph-library/graph-specification-and-vocabulary/TICKET-001, TICKET-002, TICKET-004 (DEP-004). Large because four determining sets and their failure modes are one coherent solver; splitting by set would duplicate the shared derivation and checking path.
