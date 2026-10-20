# TICKET-007: Cylinder graph type

**Change:** graph-library
**Capability Area:** Geometric Shapes & Solids (geometric-shapes-and-solids)
**Specification:** specifications/geometric-shapes-and-solids.md

**Summary:** Deliver the `cylinder` graph type: definition from radius or diameter plus height, isometric upright layout with the hidden half of the base dashed (or omitted), optional radius/diameter and height labels, text alternative, component, entry point and example.
**Priority:** Must
**Value:** A developer can show a labeled, to-scale cylinder for volume lessons without drawing it.

**Requirements Covered:**
- GSS-REQ-026: Draw a cylinder from radius and height so it reads as 3D
- GSS-REQ-027: Accept a diameter in place of a radius
- GSS-REQ-028: Hidden half of the base dashed by default, optionally omitted
- GSS-REQ-029: Optionally draw and label radius or diameter on the top face, and height along the side

**Prior Art:**
- Read: `src/layout/kit/isometric.ts` — produced by TICKET-001 (`isoEllipse`, `ISO_SCALE`)
- Read: `src/core/definitions/circle.ts`, `src/layout/kit/measure.ts` — produced by TICKET-002 (radius/diameter derivation pattern, measurement labels)
- Read: `.gener8v/specifications/geometric-shapes-and-solids.md` — Behaviors (cylinder: radius and diameter mutually determining, height independent and required), Edge Cases (very tall or very wide cylinder)

**Acceptance Criteria:**
- [ ] `{ "type": "cylinder", "radius": 2, "height": 5 }` renders an upright cylinder: top ellipse, two side lines, front half of the base solid, back half dashed
- [ ] A cylinder given `diameter` instead of `radius` validates and derives the radius; both supplied and disagreeing returns `contradiction`; missing height returns `missing_property`
- [ ] With the hidden base omitted, the back half of the base is not drawn
- [ ] Radius (or diameter) can be drawn and labeled on the top face, height along the side, using measurement labels
- [ ] Drawn radius-to-height ratio, measured along projected axes after removing `ISO_SCALE`, is within 1% of the measurement ratio, for a very tall and a very wide cylinder as well as the example
- [ ] The text alternative names the figure as a cylinder and states each shown measurement
- [ ] `CylinderGraph`, `./cylinder` entry, size-limit entry and example exist; Scene numbers pass through `fmt()`

**Output:**
- `src/core/definitions/cylinder.ts`, `src/layout/cylinder.ts` (registered), `src/react/graphs/CylinderGraph.tsx`, `src/entries/cylinder.ts`, `./cylinder` export, size-limit entry
- `examples/cylinder.json`, `examples/invalid/cylinder-missing-height.json`
- `tests/core/cylinder.test.ts` — derivation, contradiction, missing height
- `tests/layout/cylinder.test.ts` — base halves, labels, proportions, text alternative

**Constraints:** prd/TC-010 (fixed projection; elliptical faces drawn as SVG ellipses/arcs)

**Known Hazards:**
- The hidden half of the base is an arc of an ellipse: draw the two halves as separate `path` arcs (no clip paths or ids, AD-008).
- Compare the radius along the projected axis, not the ellipse's on-screen semi-axes; the ellipse's minor axis is foreshortened differently (AD-009).
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
- Carried from graph-library/geometric-shapes-and-solids-ticket-002-code-review/CR-002, CR-004 and CR-005 (the measurement-label rules every figure shares):
  - Build label text with `measurementLabel(value, source, unit?, custom?)` (`src/layout/kit/measure.ts`), not `displayValue` plus your own unit. It uses the same formatters as `formatMeasurement`, and derived values below 0.005 keep two significant figures.
  - Custom text replaces the whole label, unit included (DEL-007), and `""` is a blank label (DEL-003).
  - A label with no clear spot beside its line is stacked below the figure (DEL-006); say so in the label-text property descriptions, as the circle does.
- Carried from graph-library/geometric-shapes-and-solids-ticket-002-security-review/SEC-001, SEC-002 and SEC-003 (caller-sized text):
  - Never spread a caller-sized array into function arguments (`f(...nodes)`, `Math.max(...widths)`, `push(...lines)`). Above about 65,000 arguments in Safari, and about 120,000 in V8, the call throws. Use a loop, or pass one array (`SceneSvg` already does).
  - Wrap every label with `wrap(text, maxWidth, fontSize, maxLines)`, as the circle does with `LABEL_MAX_LINES` (4), and draw titles with `titleBlock`, which caps them at `TITLE_MAX_LINES` (3). The cut line ends in "…" (DEL-008), so the Scene stays small however long the description's text. Say so in the label-text descriptions, and keep the full text in the text alternative.
  - In `describe`, state measurements with `stateMeasurement(value, source, unit)` (`src/core/format.ts`), not `formatMeasurement`. It quotes a unit that is not unit-shaped, so the unit cannot read as the package's own sentence. Drawn labels keep `measurementLabel` / `formatMeasurement`.
  - Add a test that a valid description with half a megabyte of unit or label text renders in `<Graph>` and the type's component without throwing, with a bounded number of text nodes.
- Carried from graph-library/geometric-shapes-and-solids-ticket-001-code-review/CR-003 (a radius across the page is not foreshortened):
  - `isoEllipse` gives `rx = r`: a horizontal circle's left-to-right extent is parallel to the page and draws at full length, while the height draws `h × ISO_SCALE`. A radius drawn from the top centre straight across the page to the ellipse's end (the specification's default "horizontally to the right") therefore draws r : h × ISO_SCALE, 22.5% off GSS-REQ-030 for r 2, h 5.
  - Draw the radius (and a diameter) on the top face along a projected horizontal axis instead: from `isometric(x0, y0, h)` to `isometric(x0 + r, y0, h)` (or along y). That end lies on the `isoEllipse` ellipse, and the segment shares the height's scale, so their drawn ratio is the measurements' ratio. Document that direction as the cylinder's "otherwise documented" radius direction.
  - Never divide `rx` or `ry` by `ISO_SCALE` to recover a length; compare along projected axes. If the Product Owner prefers the radius across the page, the specification needs a stated exception to GSS-REQ-030 first.
- Carried from graph-library/geometric-shapes-and-solids-ticket-001-security-review/SEC-002 (overflow in the projection):
  - `isometric()` (`src/layout/kit/isometric.ts`) overflows for finite coordinates from about 9e307: `(x + y) / 2` and `y − x` become ±Infinity, and even a point on the line of sight, which projects exactly to (0, 0), comes out as (0, Infinity). `fmt()` then throws, so `createGraph` fails closed with `internal_error`, which is still a bug for a valid description.
  - Scale the radius and height into drawing units before projecting, and add a `createGraph` test at their limits that the result is not `internal_error`.

**Depends On:** TICKET-001, TICKET-002
**Blocks:** TICKET-008

**Size:** Medium
