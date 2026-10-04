# TICKET-002: Deliver the number line graph type

**Change:** graph-library
**Capability Area:** Number Lines & Coordinate Graphs (number-lines-and-coordinate-graphs)
**Specification:** specifications/number-lines-and-coordinate-graphs.md

**Summary:** Add the `number-line` graph type end to end: its definition (properties, checks, text alternative), its layout with arrowheads, marked points, custom tick labels and line label, its React component and entry point, and its example description.
**Priority:** Must
**Value:** A curriculum developer can produce a number line over any negative, positive or mixed range, with or without arrowheads and with labeled points, from one JSON description.

**Requirements Covered:**
- NLC-REQ-001: Number line parameters defined in the single definition using vocabulary terms (number-line part; xy and xyz in TICKET-003, TICKET-004)
- NLC-REQ-010: Report each point whose value lies outside the axis range (number-line part)
- NLC-REQ-011: Optional label and color per point, applied per GSV-REQ-040..045
- NLC-REQ-012: Text alternative generated from the normalized description, stating type, range and every marked point (number-line part)
- NLC-REQ-013: Optional caller-supplied text alternative replaces the generated one
- NLC-REQ-014: Render over a negative-only, positive-only or zero-spanning range
- NLC-REQ-015: Separate arrowhead setting for each end
- NLC-REQ-016: Arrowhead drawn at an end when, and only when, that end's setting is on
- NLC-REQ-017: Documented default arrowhead setting (both ends on)
- NLC-REQ-018: Mark each supplied point at its value
- NLC-REQ-019: Custom tick labels replace the numeric label at a given tick value
- NLC-REQ-020: Report a custom tick label whose value is not a tick position
- NLC-REQ-021: Optional label for the number line as a whole

**Prior Art:**
- Read: `.gener8v/specifications/number-lines-and-coordinate-graphs.md` — Number Lines requirements, Behaviors & Rules → Arrowheads and Points and Segments (coincident points both drawn, endpoint-inclusive ranges), Edge Cases rows for no points and custom labels off-tick, Data Requirements for the number line
- Read: `.gener8v/technical-design/system-design.md` — AD-002 (layout → Scene), AD-005 (type value `number-line`, camelCase properties), AD-007 (`fmt()`), AD-008 (arrowheads as polygons, accessible name via `aria-label` + `<title>`), AD-010 (label placement), AD-011 (presentation attributes, named colors)
- Read: TICKET-001 output at `src/core/definitions/axis.ts`, `src/layout/kit/ticks.ts`, `src/layout/kit/axis.ts` — axis properties and checks, `niceTicks`, `tickLabel`, `drawAxis`
- Read: `src/core/definitions/types.ts`, `src/core/definitions/shared.ts`, `src/core/definitions/index.ts`, `src/core/describe.ts`, `src/core/style.ts` — produced by `graph-library/graph-specification-and-vocabulary/TICKET-001`; definition format, shared presentation properties (`lineLabel`, point `label`/`color`), registry, describe dispatch, default style
- Read: `src/core/issues.ts` — produced by `graph-library/graph-specification-and-vocabulary/TICKET-002`; codes `outside_axis_range` and `tick_label_not_on_tick`
- Read: `src/layout/scene.ts`, `src/layout/kit/labels.ts` — produced by `graph-library/component-packaging-and-source-export/TICKET-002`
- Read: `src/layout/registry.ts`, `src/react/createGraphComponent.tsx` — produced by `graph-library/component-packaging-and-source-export/TICKET-003`; how a layout is registered and a per-type component is made

**Acceptance Criteria:**
- [ ] `examples/number-line.json` (range −10 to 10, arrowheads on both ends, points at −3 and 4 with labels) validates and renders through `<NumberLineGraph>` and through `<Graph>` with identical markup
- [ ] Ranges that are negative-only (−10 to −2), positive-only (3 to 15) and zero-spanning each render with ticks per TICKET-001's rules
- [ ] `leftArrow` and `rightArrow` (camelCase, boolean) default to `true`; each end shows a polygon arrowhead exactly when its setting is on, and a plain endpoint otherwise; no `<marker>` or `url(#…)` appears in the Scene
- [ ] Each point draws at `linearScale(value)` (within 0.5 units); two points with the same value are both drawn and their labels placed by `placeLabel` so neither hides the other
- [ ] A point outside the range is reported as `outside_axis_range` at `/points/<i>/value`, naming the range; a point exactly on an endpoint is accepted
- [ ] A point's `color` applies to that point only; its label uses the default label color
- [ ] Custom tick labels (for example `{ "value": 0, "text": "start" }`) replace the numeric label at that tick; a custom label whose value is not a tick position is reported as `tick_label_not_on_tick`
- [ ] The optional `lineLabel` is drawn once for the line as a whole
- [ ] The generated text alternative states "number line", the range and every marked point with its label; a supplied `textAlternative` replaces it in both `aria-label` and `<title>`
- [ ] A number line with no points renders the line, ticks and labels only
- [ ] `./number-line` entry exists in `package.json` exports and in `.size-limit.json`

**Output:**
- `src/core/definitions/number-line.ts` — GraphTypeDefinition for `number-line` (axis via `axisProperties`, `leftArrow`, `rightArrow`, `points[]` with `value`/`label`/`color`, `tickLabels[]`, `lineLabel`, `textAlternative`; checks for `outside_axis_range` and `tick_label_not_on_tick`; `describe`), registered in `src/core/definitions/index.ts`
- `src/layout/number-line.ts` — `layout(normalized) → Scene`, registered in `src/layout/registry.ts`
- `src/react/graphs/NumberLineGraph.tsx` — made with `createGraphComponent`
- `src/entries/number-line.ts`; `package.json` `exports["./number-line"]`; `.size-limit.json` entry
- `examples/number-line.json`; `examples/invalid/number-line-point-outside.json`; `examples/invalid/number-line-label-off-tick.json`
- `tests/core/number-line.test.ts` — proves the validation, defaults, outside-range, endpoint-inclusive and off-tick-label criteria
- `tests/layout/number-line.test.ts` — proves the range variants, arrowhead, point-position, coincident-label, color, custom-label, line-label, empty and text-alternative criteria (asserts on Scene data, no DOM)

**Constraints:**
- prd/TC-001, prd/TC-002: pure layout, `fmt()` on every number
- prd/TC-003: no ids — AD-008 removes them entirely
- prd/CC-002: text alternative for every graph (WCAG 1.1.1)

**Known Hazards:**
- AD-008 supersedes the natural SVG approach for NLC-REQ-016: draw arrowheads as small `polygon` nodes, NOT `<marker>` with `marker-end="url(#…)"`. Markers need ids, which collide across graphs on one page and differ between server and browser.
- AD-005 fixes the naming the spec leaves open: the type value is `number-line`, properties are camelCase (`leftArrow`, `rightArrow`, `tickSpacing`, `tickLabels`, `lineLabel`). Do not invent alternative spellings or accept synonyms (GSV assumes strict vocabulary).
- Spec OQ-002 (open/closed markers, shaded ranges for inequalities) and OQ-001 (fraction tick labels) are unresolved — do NOT add properties for them. Custom tick labels (NLC-REQ-019) are the supported way to show "½" on a tick.
- Spec OQ-005 says labels may overlap when many points are close; the system design (AD-010) still routes every label through `placeLabel`. Use `placeLabel` with its candidate positions; if no candidate is free, place at the first candidate rather than dropping the label — every point must be drawn.
- The text alternative is produced by the definition's `describe` (core, no React) so that the tool handler can reuse it as its summary; do not build it inside the React component.

**Depends On:** TICKET-001
**Blocks:** TICKET-005

**Size:** Medium

**Notes:** Cross-area predecessors: `graph-library/component-packaging-and-source-export/TICKET-003` (layout registry and component factory) and `graph-library/graph-specification-and-vocabulary/TICKET-004` (normalization) — DEP-002. Default arrowheads on both ends come from the spec's Behaviors & Rules ("By default both ends of a number line show arrowheads").
