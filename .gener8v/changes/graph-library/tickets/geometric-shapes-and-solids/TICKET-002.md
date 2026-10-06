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

**Depends On:** None
**Blocks:** TICKET-003, TICKET-005, TICKET-006, TICKET-007

**Size:** Medium

**Notes:** Cross-area predecessors: graph-library/component-packaging-and-source-export/TICKET-002 and TICKET-003, graph-library/graph-specification-and-vocabulary/TICKET-001, TICKET-003, TICKET-004 (DEP-004). Once graph-library/component-packaging-and-source-export/TICKET-005 (export) and graph-library/component-packaging-and-source-export/TICKET-007 (tool) exist, `examples/circle.json` is their first fixture.
