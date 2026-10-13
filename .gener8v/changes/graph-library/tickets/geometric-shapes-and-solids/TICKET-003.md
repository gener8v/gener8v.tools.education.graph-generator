# TICKET-003: Square graph type

**Change:** graph-library
**Capability Area:** Geometric Shapes & Solids (geometric-shapes-and-solids)
**Specification:** specifications/geometric-shapes-and-solids.md

**Summary:** Deliver the `square` graph type: definition from a side length, layout with optional side labels (one or all four) and right-angle marks, text alternative, component, entry point and example.
**Priority:** Must
**Value:** A developer can drop a labeled, to-scale square into a lesson from its side length alone.

**Requirements Covered:**
- GSS-REQ-007: Draw a square from a side length
- GSS-REQ-008: Optionally label one side or all four sides
- GSS-REQ-009: Optionally mark the right angles

**Prior Art:**
- Read: `.gener8v/specifications/geometric-shapes-and-solids.md` — GSS-REQ-007..009, Edge Cases (labels on all four sides of a very small square)
- Read: `src/core/definitions/circle.ts`, `src/layout/circle.ts`, `src/layout/kit/measure.ts`, `src/react/graphs/CircleGraph.tsx`, `src/entries/circle.ts` — produced by TICKET-002; follow the same per-type pattern
- Read: `.gener8v/technical-design/system-design.md` — per-type conventions, AD-005, AD-010

**Acceptance Criteria:**
- [ ] `{ "type": "square", "sideLength": 4 }` renders a square whose four drawn sides are equal within 1%
- [ ] Zero or negative side length returns `out_of_range`
- [ ] Side labels can be requested for one side or all four; labels use `measurementLabel` (value, unit, custom text)
- [ ] Labels on all four sides of a very small square are placed outside the figure and do not overlap (estimated boxes)
- [ ] Right-angle marks appear at all four corners when requested
- [ ] The text alternative names the figure as a square and states the side length and unit when shown
- [ ] `SquareGraph`, `./square` entry, size-limit entry and example exist; Scene numbers pass through `fmt()`

**Output:**
- `src/core/definitions/square.ts`, `src/layout/square.ts` (registered), `src/react/graphs/SquareGraph.tsx`, `src/entries/square.ts`, `./square` export, size-limit entry
- `examples/square.json`, `examples/invalid/square-zero-side.json`
- `tests/core/square.test.ts` — range criterion
- `tests/layout/square.test.ts` — equal sides, label modes, small-square placement, right-angle marks, text alternative

**Constraints:** prd/TC-001, prd/TC-011 (label layout from estimated metrics), prd/CC-002

**Known Hazards:**
- Property name: the spec's Data Requirements says "side"; AD-005 lists `sideLength`. Use `sideLength`.
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
- Carried from graph-library/geometric-shapes-and-solids-ticket-002-quality-review/QR-004 (deferred here), with QR-005 and QR-006 as the patterns to follow:
  - **Extract, do not copy, the circle's figure-agnostic label code.** About 60 lines of `src/layout/circle.ts` are not about circles: `GAP`, `LABEL_MAX_WIDTH`, `measure` (label size), `besideHorizontal` / `besideVertical` (candidates beside a segment), `line` (a stroked segment node), the keep-inside-the-drawing filter, and the loop that places each label with `placeLabel`, adds it as an obstacle (AD-010) and stacks the ones it cannot place below the figure (DEL-006).
  - Move them into the layout kit when the square needs them, shaped by both figures: for example `labelSize`, the candidate generators next to `placeLabel` in `src/layout/kit/labels.ts`, a `segmentNode`, and a `placeLabels(requests, obstacles, bounds, stackTop)` returning the nodes and the new bottom. Give the new kit code its own tests in `tests/layout/kit/`, then switch the circle to it with its tests unchanged.
  - Register the definition and the layout with no cast: the tables use `satisfies`, which rejects an incomplete entry (QR-005).
  - In the layout tests, call the layout directly after `validate`, as the circle's `sceneOf` does, so an exception shows its stack; keep one test through `createGraph` (QR-006). In the overlap property, generate strings with `size: "max"` so labels wrap and stack, and shrink each rebuilt box by 0.01 (QR-001).
- Carried from graph-library/geometric-shapes-and-solids-ticket-002-security-review/SEC-001, SEC-002 and SEC-003 (caller-sized text):
  - Never spread a caller-sized array into function arguments (`f(...nodes)`, `Math.max(...widths)`, `push(...lines)`). Above about 65,000 arguments in Safari, and about 120,000 in V8, the call throws. Use a loop, or pass one array (`SceneSvg` already does).
  - Wrap every label with `wrap(text, maxWidth, fontSize, maxLines)`, as the circle does with `LABEL_MAX_LINES` (4), and draw titles with `titleBlock`, which caps them at `TITLE_MAX_LINES` (3). The cut line ends in "…" (DEL-008), so the Scene stays small however long the description's text. Say so in the label-text descriptions, and keep the full text in the text alternative.
  - In `describe`, state measurements with `stateMeasurement(value, source, unit)` (`src/core/format.ts`), not `formatMeasurement`. It quotes a unit that is not unit-shaped, so the unit cannot read as the package's own sentence. Drawn labels keep `measurementLabel` / `formatMeasurement`.
  - Add a test that a valid description with half a megabyte of unit or label text renders in `<Graph>` and the type's component without throwing, with a bounded number of text nodes.

**Depends On:** TICKET-002
**Blocks:** TICKET-008

**Size:** Small
