# TICKET-005: Pictograph

**Change:** graph-library
**Capability Area:** Data Graphs & Pictographs (data-graphs-and-pictographs)
**Specification:** specifications/data-graphs-and-pictographs.md

**Summary:** Add the `pictograph` type end to end: definition with unit image, unit value and orientation, layout of repeated equal-size images with a cropped partial image and a key, text alternative, component, entry point and example.
**Priority:** Must
**Value:** A curriculum developer can show counts as rows of pictures with a key such as "each apple = 2 students", including values that are not whole multiples.

**Requirements Covered:**
- DGP-REQ-004: Plain-text alternative naming type, title, unit label, every category and value
- DGP-REQ-023: One row or column per category built from repeated unit images
- DGP-REQ-024: Unit image by name from the published set
- DGP-REQ-025: Unit value — units per image
- DGP-REQ-026: Images per category = value ÷ unit value
- DGP-REQ-027: Key "each [image name] = [unit value] [value-unit label]"
- DGP-REQ-028: Non-whole multiple drawn as whole images plus one cropped partial image
- DGP-REQ-029: Report a unit value that is not positive
- DGP-REQ-030: Report a negative pictograph value
- DGP-REQ-031: Report an unknown image name and list available names
- DGP-REQ-032: Horizontal rows (default) or vertical columns
- DGP-REQ-037: Every image at the same size and spacing
- DGP-NFR-002: Partial image visible width within 2% of the exact remaining fraction — verified by a geometry test over generated non-whole-multiple values

**Prior Art:**
- Read: TICKET-001 output at `src/core/definitions/categories.ts` and `src/layout/kit/value-scale.ts` — categories, `valueUnitLabel`, category slots
- Read: TICKET-004 output at `src/images/index.ts` and `src/images/manifest.ts` — `images`, `getImageNames()`, `ImageAsset`
- Read: `src/core/validate/suggest.ts` — produced by graph-library/graph-specification-and-vocabulary/TICKET-003; suggestion for a near-miss image name
- Read: `src/layout/registry.ts`, `src/react/createGraphComponent.tsx` — produced by graph-library/component-packaging-and-source-export/TICKET-003
- Read: `.gener8v/technical-design/system-design.md` — AD-008 (partial image via nested `<svg>` viewport, no `<clipPath>`), AD-012
- Read: `.gener8v/specifications/data-graphs-and-pictographs.md` — DGP-REQ-023..032, DGP-REQ-037, Pictograph Units behaviours (zero value, tiny fraction still drawn, "units" default), edge cases (case-mismatched image name, category color inapplicable)

**Acceptance Criteria:**
- [ ] `type: "pictograph"` with `categories`, `values`, `unitImage`, `unitValue`, optional `valueUnitLabel` and `orientation` validates and renders
- [ ] Each category draws ⌊value ÷ unitValue⌋ whole images; a remainder draws one more image cropped to the remaining fraction with a nested `<svg>` whose width is that fraction; a remainder below 1% is still drawn; a zero value draws no images and keeps the row and name
- [ ] All images have the same size and spacing, so equal values produce equal-length rows (DGP-REQ-037)
- [ ] `orientation` accepts `horizontal` (default, rows) and `vertical` (columns)
- [ ] The key reads "each <image name> = <unitValue> <valueUnitLabel>", using "units" when no label is given
- [ ] `unitValue` ≤ 0 is reported (`out_of_range` at `/unitValue`); a negative value is reported at `/values/<i>`; an unknown `unitImage` is reported with `unknown_image`, listing every published name in `allowed`, and suggesting the published name for a case or spelling near-miss
- [ ] A per-category color or a `valueScale` on a pictograph is reported as inapplicable
- [ ] The text alternative names the type, title, unit image, unit value and label, and every category with its value
- [ ] DGP-NFR-002: for generated non-whole-multiple values, the partial image's visible width is within 2% of the exact remaining fraction of one image width, verified by `tests/layout/pictograph.test.ts`
- [ ] No element ids or `url(#…)` references in the Scene
- [ ] `src/entries/pictograph.ts` exports `Pictograph`; package.json `exports` has `./pictograph`; `.size-limit.json` has a pictograph entry within 25 kB; `examples/pictograph.json` (with a non-whole value) and at least two `examples/invalid/pictograph-*.json` exist

**Output:**
- `src/core/definitions/pictograph.ts` — GraphTypeDefinition, registered in `src/core/definitions/index.ts`
- `src/layout/pictograph.ts` — layout, registered in `src/layout/registry.ts`
- `src/react/graphs/PictographGraph.tsx` — component (exported as `Pictograph`)
- `src/entries/pictograph.ts`, package.json `exports["./pictograph"]`, `.size-limit.json` entry
- `examples/pictograph.json`, `examples/invalid/pictograph-unknown-image.json`, `examples/invalid/pictograph-zero-unit.json`
- `tests/core/pictograph.test.ts` — validation criteria, inapplicable options, text alternative
- `tests/layout/pictograph.test.ts` — whole/partial counts, tiny remainder, zero value, equal sizing, orientation, key text, DGP-NFR-002, no ids

**Constraints:**
- prd/TC-003 resolved by AD-008: crop without ids
- prd/TC-009: exported files must embed the image nodes (the Scene already carries them)
- prd/TC-007, CPSE-NFR-002: pictograph bundle within 25 kB including images

**Known Hazards:**
- AD-008 supersedes the usual `<clipPath>` approach — crop the partial image with a nested `<svg>` (viewports clip by default); a clip path needs an id and breaks with several graphs on a page
- The key uses the image **name** ("each apple = …"), not its description — the spec wording is explicit (DGP-REQ-027)
- Very large counts are drawn in full; capping is an Open Question (DGP OQ-004) — do not invent a cap
- Rounding-to-halves is an Open Question (DGP OQ-003) — implement exact cropping only
- Carried from graph-library/graph-specification-and-vocabulary-ticket-001-code-review/CR-002 and graph-library/graph-specification-and-vocabulary-ticket-001-quality-review/QR-001, QR-002 (the definition contract, RES-001):
  - Build every properties map with `defineProperties` (`src/core/definitions/types.ts`), which freezes it and removes prototypes.
  - Never list a shared top-level option (`title`, `lineColor`, axis labels…) in `properties`: `propertiesOf(type)` adds it from its `appliesTo`.
  - Nest the shared `label`/`color` (or `lineLabel`/`lineColor` for series) spec objects themselves in element specs, exactly when `elementsOf` lists the type.
  - Import text helpers from `src/core/format.ts`, never `src/core/describe.ts` (lint enforces it).
  - In `describe`, pass every caller string through `quoteText`, and state measurements with `formatMeasurement(value, provenance, unit)` so supplied values appear as written and derived values rounded.
  - Register the definition in `src/core/definitions/index.ts`, and run the applicability and consistency checks in `tests/core/definitions.test.ts` against it.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-003-security-review/SEC-001 (Product Owner decision 2026-10-06): every `array` spec must set `maxItems` (the compiler requires it) to a curriculum-sized number. For example, at most 1,000 points or categories, or what the type's specification implies. A longer list is reported once as `too_large`. The whole description is capped at `DESCRIPTION_VALUE_LIMIT` (10,000 values, `src/core/validate/structure.ts`); keep every example well under both, and record the chosen limits in the definition's description text.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-004-code-review/CR-003 and graph-library/graph-specification-and-vocabulary-ticket-004-security-review/SEC-004: domain checks (`DomainCheck`, `src/core/definitions/types.ts`):
  - `inputs` are the paths the check reads, as JSON Pointers without the leading slash, with `*` for any list position (`["xAxis/min", "xAxis/max", "points/*/x"]`). The check is skipped only when an earlier failure touches one of them; `tests/core/definitions.test.ts` checks that every path exists.
  - The description a check receives is frozen; never change it.
  - Build every issue with `createIssue`. A hand-built issue, or one with a message over 2,000 characters, is treated as a package defect.
  - A check's work must grow with the description's size, never with a value's magnitude. For example, count ticks arithmetically (`floor(range / spacing)`) and compare with the limit before enumerating anything.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-005-code-review/CR-001 and graph-library/graph-specification-and-vocabulary-ticket-005-quality-review/QR-001, QR-002: `examples/<type>.json` must be a valid description of the type (it is the base the GSV-NFR-003 agreement test mutates one fault at a time; `tests/core/schema-agreement.test.ts` fails with a message naming the missing file when the type registers without one). Keep it rich: every optional term used once and lists with at least one element, so every property is mutated. Also run `pnpm generate` and commit the regenerated `src/generated` files in this delivery.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-005-code-review/CR-003 (GSV TICKET-005 DEL-008): the schema generator reads only definitions. Build the `unitImage` enum's `values` from `getImageNames()` and its `valueDescriptions` from the manifest's descriptions, in the pictograph definition; never hard-code them. That one enum then feeds the validator, the published and tool schemas and the vocabulary (DGP-REQ-035).
- Carried from graph-library/geometric-shapes-and-solids-ticket-002-code-review/CR-003 (DEL-001 on that delivery): the definition and layout contract now passes the provenance. Write `describe(normalized, provenance)` and `layout(normalized, provenance)` (`Layout<D>` in `src/layout/registry.ts`), even where the technical design and this ticket's Output still show one argument. TypeScript accepts a one-argument function, so dropping the provenance compiles; it then shows supplied values rounded (GSS-REQ-034 and its equivalents). Read a value's source with `sourceOf(provenance, term)` (`src/core/format.ts`). Call your own definition's `describe` from the layout, never `describeNormalized`, so no registry is reached. Draw a title with `titleBlock` (`src/layout/kit/title.ts`), and treat a title that is blank after cleaning as absent in `describe` too (code review CR-001).
- Carried from graph-library/geometric-shapes-and-solids-ticket-002-security-review/SEC-001, SEC-002 and SEC-003 (caller-sized text):
  - Never spread a caller-sized array into function arguments (`f(...nodes)`, `Math.max(...widths)`, `push(...lines)`). Above about 65,000 arguments in Safari, and about 120,000 in V8, the call throws. Use a loop, or pass one array (`SceneSvg` already does).
  - Wrap every label with `wrap(text, maxWidth, fontSize, maxLines)`, as the circle does with `LABEL_MAX_LINES` (4), and draw titles with `titleBlock`, which caps them at `TITLE_MAX_LINES` (3). The cut line ends in "…" (DEL-008), so the Scene stays small however long the description's text. Say so in the label-text descriptions, and keep the full text in the text alternative.
  - In `describe`, state measurements with `stateMeasurement(value, source, unit)` (`src/core/format.ts`), not `formatMeasurement`. It quotes a unit that is not unit-shaped, so the unit cannot read as the package's own sentence. Drawn labels keep `measurementLabel` / `formatMeasurement`.
  - Add a test that a valid description with half a megabyte of unit or label text renders in `<Graph>` and the type's component without throwing, with a bounded number of text nodes.
- Carried from graph-library/data-graphs-and-pictographs-ticket-001-security-review/SEC-001, SEC-002 and SEC-003 (value scale and category names):
  - **Category names (SEC-002, deferred to the Product Owner):** names wrap with no line cap, because the specification says a name is never cut. A caller-sized name therefore grows the Scene: 100 names of 1,000 characters make 100,000 text nodes and 18 MB of SVG, and about 2 MB makes rendering throw after the fallback.
    - The SEC-001 rule above ("cut at a fixed number of lines") does not apply to category names. They are covered by the pending Product Owner decision on a caller-text length bound (GSS TICKET-002 SEC-002), which would reject, not cut, an over-long name.
    - Until that decision, include category names in the half-megabyte large-text test, record the node count and markup size it produces, and do not claim a bounded number of text nodes for them.
  - **Data values (SEC-003):** bound every data value spec to ±`VALUE_LIMIT` (`src/core/value-scale.ts`, 1,000,000,000), so a scale chosen from the values always prints as a plain number.
  - **Scale checks (SEC-001, SEC-004):** a pictograph has no value scale (`valueScale` is reported as not applying), so the scale checks do not apply here.
- Carried from graph-library/data-graphs-and-pictographs-ticket-004-code-review/CR-002 and CR-004 (the image set):
  - **DGP-REQ-035 is published here.** DGP TICKET-004 exposes `getImageNames()` and `imageDescriptions()` (`src/images/index.ts`), but no generated file lists an image yet.
    - Build `unitImage` as `{ kind: "enum", values: getImageNames(), valueDescriptions: imageDescriptions() }`.
    - Put `@spec DGP-REQ-035` on it, and add a `## @spec Coverage` row for `src/core/definitions/pictograph.ts`.
    - Test that `src/generated/schema.json`, `src/generated/tool-schema.json` and `src/generated/vocabulary.json` list every image name, and the vocabulary every description.
  - **Bundle and layering (CR-004).** Importing anything from `src/images/index.ts` brings in all eight drawings (about 1.7 kB gzip). Once the pictograph is registered, that reaches `./core`, `./tool` and `.`. It also makes the first import from core into the layout kit: the images use `fmt` from `src/layout/kit/format.ts`.
    - Measure `./core`, `./tool`, `.` and the pictograph entry with `pnpm size` before and after.
    - Decide, and record as a DEL, whether core may import the layout kit's `fmt`. If not, move `fmt` (and `Rounded`) to core and have the kit re-export them.
- Correction from graph-library/data-graphs-and-pictographs-ticket-004-quality-review/QR-006: the image tables are now marked pure, so importing only a type or a constant from `src/images/index.ts` does not bundle the drawings. Using `images`, `imageManifest`, `getImageNames()` or `imageDescriptions()` still brings in all eight. `getImageNames()` returns a non-empty tuple, so `values: getImageNames()` compiles as an enum's `Terms` without a cast (QR-004).

**Depends On:** TICKET-001, TICKET-004
**Blocks:** TICKET-006

**Size:** Medium

**Notes:** Cross-area predecessors: graph-library/component-packaging-and-source-export/TICKET-003 and graph-library/graph-specification-and-vocabulary/TICKET-004. The pictograph is the likeliest type to strain the bundle budget (TR-004); measure with size-limit as soon as the layout exists.
