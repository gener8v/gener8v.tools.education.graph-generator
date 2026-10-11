# TICKET-002: Circle graph type (vertical slice)

**Change:** graph-library
**Capability Area:** Geometric Shapes & Solids (geometric-shapes-and-solids)
**Specification:** specifications/geometric-shapes-and-solids.md

**Summary:** Deliver the `circle` graph type end to end — definition with radius/diameter/circumference derivation, layout with optional radius, diameter, center and measurement labels, text alternative, component, entry point and example — as the first type through the whole pipeline.
**Priority:** Must
**Value:** A curriculum developer can describe a circle by radius, diameter or circumference and get a correctly labeled, to-scale figure, and the whole pipeline is proven on one real type.

**Requirements Covered:**
- GSS-REQ-001: Draw a circle from a radius
- GSS-REQ-002: Accept a diameter or a circumference in place of a radius
- GSS-REQ-003: Optionally draw the radius
- GSS-REQ-004: Optionally draw the diameter
- GSS-REQ-005: Optionally mark the center
- GSS-REQ-006: Optionally label radius, diameter and circumference independently
- GSS-REQ-033: Measurement label shows value followed by unit when supplied
- GSS-REQ-034: Supplied values shown as supplied, derived values at the documented display precision
- GSS-REQ-035: Custom label text in place of the measurement value
- GSS-REQ-036: Text alternative naming the figure and each shown measurement

**Prior Art:**
- Read: `.gener8v/specifications/geometric-shapes-and-solids.md` — GSS-REQ-001..006, 033..036, Behaviors & Rules (Defining and Dependent Values; Drawing: radius horizontal to the right, radius and diameter not overlapping; Labels), Edge Cases (radius 5 with circumference 31.4)
- Read: `.gener8v/technical-design/system-design.md` — AD-004 (defining order radius → diameter → circumference, 1% tolerance), AD-005 (type `circle`, camelCase), AD-007, AD-008, AD-010, AD-011; per-type conventions
- Read: `src/core/definitions/types.ts`, `src/core/definitions/index.ts`, `src/core/definitions/shared.ts`, `src/core/describe.ts` — produced by graph-library/graph-specification-and-vocabulary/TICKET-001
- Read: `src/core/validate/index.ts`, `src/core/validate/derive.ts` — produced by graph-library/graph-specification-and-vocabulary/TICKET-003 and TICKET-004 (derivation mechanism this type plugs into)
- Read: `src/layout/scene.ts`, `src/layout/kit/format.ts`, `src/layout/kit/text.ts`, `src/layout/kit/labels.ts`, `src/react/SceneSvg.tsx` — produced by graph-library/component-packaging-and-source-export/TICKET-002
- Read: `src/layout/registry.ts`, `src/react/createGraphComponent.tsx` — produced by graph-library/component-packaging-and-source-export/TICKET-003

**Acceptance Criteria:**
- [ ] `{ "type": "circle", "radius": 5 }` validates; the normalized description contains diameter 10 and circumference ≈ 31.4159, with provenance radius = supplied, diameter and circumference = derived
- [ ] A circle defined by `diameter` alone or `circumference` alone validates and derives the other two
- [ ] `radius: 5, circumference: 31.4` is accepted (within 1%); `radius: 5, diameter: 12` returns one `contradiction` issue naming `/radius` and `/diameter` and stating the agreeing value
- [ ] Zero or negative radius, diameter or circumference returns `out_of_range` and no graph is drawn
- [ ] With `showRadius`, a segment runs from the center horizontally to the right to the circumference; with `showDiameter`, a segment through the center that does not lie on the radius segment; with `showCenter`, a center point is marked
- [ ] Each of radius, diameter and circumference can be labeled independently; a label shows the value, then the unit when a unit is supplied; a custom label text (e.g. "r", "?") replaces the value while the text alternative still states the value
- [ ] A supplied value is displayed exactly as supplied (31.4 stays "31.4"); a derived value is shown with at most 2 decimal places, trailing zeros removed, via `displayValue()` (this precision rule is placed in `src/layout/kit/measure.ts` for reuse)
- [ ] The circumference label, which has no segment, is placed next to the outline using `placeLabel`
- [ ] The text alternative names the figure as a circle and states every shown measurement with its unit
- [ ] Every Scene number passes through `fmt()`; the Scene contains no ids or `url(#…)` references
- [ ] `CircleGraph` renders the example; `Graph` with the same description renders identical markup; `./circle` entry and a size-limit entry exist
- [ ] Circle drawn length ratios (radius : diameter segment) are within 1% of 1 : 2 at the default size (part of GSS-NFR-001 for this figure; TICKET-008 extends it to all figures)

**Output:**
- `src/core/definitions/circle.ts` — circle GraphTypeDefinition (properties `radius`, `diameter`, `circumference`, `showRadius`, `showDiameter`, `showCenter`, label options, `unit`; derivation group in order radius → diameter → circumference; `describe`), registered in `src/core/definitions/index.ts`
- `src/layout/kit/measure.ts` — shared measurement-label helpers (`measurementLabel(value, provenance, unit?, custom?)`), consumed by TICKET-003, TICKET-005, TICKET-006, TICKET-007
- `src/layout/circle.ts` — `layout(normalized) → Scene`, registered in `src/layout/registry.ts`
- `src/react/graphs/CircleGraph.tsx`, `src/entries/circle.ts`, `./circle` in `package.json` exports, entry in `.size-limit.json`
- `examples/circle.json`, `examples/invalid/circle-contradiction.json`, `examples/invalid/circle-negative-radius.json`
- `tests/core/circle.test.ts` — derivation, tolerance, contradiction and range criteria
- `tests/layout/circle.test.ts` — segment placement, labels, display precision, text alternative, no-ids, proportion criteria

**Constraints:** prd/TC-001 (no measuring; labels via estimated metrics), prd/TC-002 (round with `fmt()`), prd/TC-003 / AD-008 (no ids), prd/CC-002 (text alternative)

**Known Hazards:**
- This is the vertical slice (TQ-008): it is the first consumer of the definition contract (RES-001) and the layout registry. If the contract does not fit, raise it in the delivery record's Decisions — do NOT work around it locally, because every other type will copy this ticket.
- Display precision for derived values is GSS OQ-005 (assumed ≤ 2 decimals, trailing zeros removed); implement the assumption in one place (`measure.ts`) so a different answer is a one-line change.
- The tolerance check belongs to the shared derivation stage (graph-library/graph-specification-and-vocabulary/TICKET-004); the circle definition supplies only the derivation formulas, not its own tolerance logic.
- This is the circle slice, the one expected adjustment to `GraphTypeDefinition` (RD-001). Any change to the contract after it is a breaking change, to be recorded as a DEL.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-001-code-review/CR-002 and graph-library/graph-specification-and-vocabulary-ticket-001-quality-review/QR-001, QR-002 (the definition contract, RES-001):
  - Build every properties map with `defineProperties` (`src/core/definitions/types.ts`), which freezes it and removes prototypes.
  - Never list a shared top-level option (`title`, `lineColor`, axis labels…) in `properties`: `propertiesOf(type)` adds it from its `appliesTo`.
  - Nest the shared `label`/`color` (or `lineLabel`/`lineColor` for series) spec objects themselves in element specs, exactly when `elementsOf` lists the type.
  - Import text helpers from `src/core/format.ts`, never `src/core/describe.ts` (lint enforces it).
  - In `describe`, pass every caller string through `quoteText`, and state measurements with `formatMeasurement(value, provenance, unit)` so supplied values appear as written and derived values rounded.
  - Register the definition in `src/core/definitions/index.ts`, and run the applicability and consistency checks in `tests/core/definitions.test.ts` against it.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-003-code-review/CR-007: the rule "an empty label is no label" covers only the shared presentation options (it is keyed on `presentation`). State, in the definition and its tests, whether `""` on custom measurement label text (GSS-REQ-035) means no label (drop it) or a blank label (keep it, for example a blank to fill in). If it means no label, add an explicit flag to `StringValue` rather than setting `presentation`.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-003-code-review/CR-004 and graph-library/graph-specification-and-vocabulary-ticket-003-quality-review/QR-006: while no type is registered, `unknown_graph_type` lists every declared type, which is a temporary fallback in `src/core/validate/envelope.ts`. When this ticket registers the circle, the test "lists every declared type while no definition is registered yet" in `tests/core/validate-envelope.test.ts` fails by design. Replace it with one asserting `allowed` equals the registered types, and keep the fallback branch only if it is still reachable.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-003-security-review/SEC-001 (Product Owner decision 2026-10-06): every `array` spec must set `maxItems` (the compiler requires it) to a curriculum-sized number. For example, at most 1,000 points or categories, or what the type's specification implies. A longer list is reported once as `too_large`. The whole description is capped at `DESCRIPTION_VALUE_LIMIT` (10,000 values, `src/core/validate/structure.ts`); keep every example well under both, and record the chosen limits in the definition's description text.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-004-code-review/CR-001 and graph-library/graph-specification-and-vocabulary-ticket-004-quality-review/QR-001, QR-004: every derivation-group member must be a top-level `number` term with a curriculum-sized positive `min` and a finite `max`; `tests/core/definitions.test.ts` enforces this. That test also requires `derive` to return every member as a finite positive number and to round-trip, and no member may be in two groups. Stage 3 checks each derived value against its own member's range and reports the supplied value as `out_of_range`, with the range that keeps every member in its own. Choose the members' limits to agree with each other; for example, circumference max ≈ 2π × radius max.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-004-code-review/CR-003 and graph-library/graph-specification-and-vocabulary-ticket-004-security-review/SEC-004: domain checks (`DomainCheck`, `src/core/definitions/types.ts`):
  - `inputs` are the paths the check reads, as JSON Pointers without the leading slash, with `*` for any list position (`["xAxis/min", "xAxis/max", "points/*/x"]`). The check is skipped only when an earlier failure touches one of them; `tests/core/definitions.test.ts` checks that every path exists.
  - The description a check receives is frozen; never change it.
  - Build every issue with `createIssue`. A hand-built issue, or one with a message over 2,000 characters, is treated as a package defect.
  - A check's work must grow with the description's size, never with a value's magnitude. For example, count ticks arithmetically (`floor(range / spacing)`) and compare with the limit before enumerating anything.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-005-code-review/CR-001 and graph-library/graph-specification-and-vocabulary-ticket-005-quality-review/QR-001, QR-002: `examples/<type>.json` must be a valid description of the type (it is the base the GSV-NFR-003 agreement test mutates one fault at a time; `tests/core/schema-agreement.test.ts` fails with a message naming the missing file when the type registers without one). Keep it rich: every optional term used once and lists with at least one element, so every property is mutated. Also run `pnpm generate` and commit the regenerated `src/generated` files in this delivery.
- Carried from graph-library/component-packaging-and-source-export-ticket-002-code-review/CR-005: displayed measurement values come from `displayValue(n, provenance)` (`src/layout/kit/format.ts`), which uses `formatSupplied` / `formatDerived` from `src/core/format.ts`. That precision is "2 decimal places, half away from zero, trailing zeros dropped, and a non-zero value that would round to 0 keeps two significant figures" (`0.0012`). Do not add a second rounding rule in `src/layout/kit/measure.ts` or anywhere else, so labels and the text alternative state the same numbers. Every layout test runs `checkScene` (`src/layout/kit/check.ts`) on its Scenes and expects no problems, and builds `d` and `transform` strings with `pathData` / `translate`.
- Carried from graph-library/component-packaging-and-source-export-ticket-003-code-review/CR-002 and CR-003: a per-type component draws with its own definition and layout only, so importing it brings in no other type (AD-001, CPSE-REQ-004).
  - Write `export const CircleGraph = createGraphComponent("circle", { definition: circle, layout: circleLayout })` in `src/react/graphs/CircleGraph.tsx`, importing the definition and layout modules directly, never `definitions` or `layouts`. Register the layout in `src/layout/registry.ts`'s `layouts` table as well, so `Graph` draws it.
  - Export `CircleGraph` from `src/index.ts`: the package test in `tests/react/Graph.test.tsx` then requires a layout for every defined type, and checks that `Graph` and `CircleGraph` draw `examples/circle.json` identically.
  - The GSV half is still open: `definitions` in `src/core/definitions/index.ts` is built by unmarked calls, and `propertiesOf(type, registry = definitions)` and `describeNormalized(normalized, registry = definitions)` default to it, so the `./circle` bundle keeps every type's definition. Before the second type lands, mark the table's construction `/* @__PURE__ */` and pass the registry explicitly at every call site (GSV code: record it as a DEL here or raise a ticket). Extend `tests/package/per-type-bundle.test.ts` with a second type's definition marker to prove it.

**Depends On:** None
**Blocks:** TICKET-003, TICKET-005, TICKET-006, TICKET-007

**Size:** Medium

**Notes:** Cross-area predecessors: graph-library/component-packaging-and-source-export/TICKET-002 and TICKET-003, graph-library/graph-specification-and-vocabulary/TICKET-001, TICKET-003, TICKET-004 (DEP-004). Once graph-library/component-packaging-and-source-export/TICKET-005 (export) and graph-library/component-packaging-and-source-export/TICKET-007 (tool) exist, `examples/circle.json` is their first fixture.
