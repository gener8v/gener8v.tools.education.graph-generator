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

**Depends On:** TICKET-001, TICKET-004
**Blocks:** TICKET-006

**Size:** Medium

**Notes:** Cross-area predecessors: graph-library/component-packaging-and-source-export/TICKET-003 and graph-library/graph-specification-and-vocabulary/TICKET-004. The pictograph is the likeliest type to strain the bundle budget (TR-004); measure with size-limit as soon as the layout exists.
