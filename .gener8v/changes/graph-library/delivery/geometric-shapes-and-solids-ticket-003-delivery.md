# TICKET-003: Square graph type — Delivery Record

## Ticket Reference

**Ticket:** graph-library/geometric-shapes-and-solids/TICKET-003
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/geometric-shapes-and-solids.md`
**Requirements Covered:**
- GSS-REQ-007: Draw a square from a side length
- GSS-REQ-008: Optionally label one side or all four sides with the side length
- GSS-REQ-009: Optionally mark the square's right angles

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Predecessor TICKET-002 (circle) delivered | delivery record | Delivered, verification passed; all three reviews Approved; `main` at `424e191` | ✅ |
| `square` in `GRAPH_TYPES`; shared `title` and `lineColor` apply to it | `src/core/definitions/types.ts`, `shared.ts` | both present (`FIGURES` lists `square`); nothing registered under `square` yet | ✅ |
| Circle per-type pattern: definition, layout, component, entry | `src/core/definitions/circle.ts`, `src/layout/circle.ts`, `src/react/graphs/CircleGraph.tsx`, `src/entries/circle.ts` | present | ✅ |
| `measurementLabel(value, source, unit?, custom?)` | `src/layout/kit/measure.ts` | present | ✅ |
| `placeLabel`, `Box`, `Segment`, `Obstacle` | `src/layout/kit/labels.ts` | present | ✅ |
| `wrap`, `textWidth`, `titleBlock`, `textLines`, `LINE_HEIGHT`, `SCENE_MARGIN` | `src/layout/kit/text.ts`, `title.ts` | present | ✅ |
| `stateMeasurement`, `sourceOf`, `quoteText`, `cleanText`, `formatList` | `src/core/format.ts` | present | ✅ |
| `CALLER_TEXT_LIMIT` (200), `UNIT_TEXT_LIMIT` (20) | `src/core/definitions/shared.ts` | present | ✅ |
| Scene node kinds for a right-angle mark | `polyline` | `src/layout/scene.ts` has `polyline` | ✅ |
| Side-effect-free definition factory pattern | `define<Type>()` with `/* @__PURE__ */` | `ruler.ts`, `pictograph.ts`, `line-graph.ts`, `bar-graph.ts` use it | ✅ |
| Registration checklist | ruler commit `5e28148` | touched exactly the listed files | ✅ |
| `unit` term already defined by the circle | one definition per term (GSV-REQ-015) | `circle.ts` defines `unit` inline; `tests/core/definitions.test.ts` "defines each term once" requires the square's to have the same kind and description | ⚠️ Shapes the plan — one shared `unit` spec (DEL-002) |
| Tests that assume the square is unregistered | none, or updated | `tests/core/describe.test.ts:38-40` expects `describeGraph({ type: "square", sideLength: 1 })` to throw ("The square is not registered yet") | ⚠️ That assertion moves to an unregistered type (`triangle`) |
| Size budget | per-type ≤ 25 kB | `./circle` well under 25 kB | ✅ |
| Carried: GSV TICKET-001 CR-002 / QR-001, QR-002 (definition contract, RES-001) | honoured | — | 🔁 Carried — see plan |
| Carried: GSV TICKET-003 SEC-001 (`maxItems`) | honoured | the square has no list terms | ✅ Not applicable |
| Carried: GSV TICKET-004 CR-001 / QR-001, QR-004 (derivation groups) | honoured | the square has one defining value, no derivation group | ✅ Not applicable |
| Carried: GSV TICKET-004 CR-003 / SEC-004 (domain checks) | honoured | the square needs no domain check (custom text labels one side by itself, so nothing can contradict it) | ✅ Not applicable |
| Carried: GSV TICKET-005 CR-001 / QR-001, QR-002 (rich example; `pnpm generate`) | honoured | — | 🔁 Carried |
| Carried: GSS TICKET-002 CR-003 (provenance; `titleBlock`; blank title) | honoured | — | 🔁 Carried |
| Carried: GSS TICKET-002 CR-002, CR-004, CR-005 (measurement-label rules) | honoured | — | 🔁 Carried |
| Carried: GSS TICKET-002 QR-004 (deferred here: extract the circle's figure-agnostic label code into the kit), QR-005, QR-006 | addressed here | — | 🔁 Carried — see plan |
| Carried: GSS TICKET-002 SEC-001..003 (no spreads, wrapped text, `stateMeasurement`) | honoured | — | 🔁 Carried |
| Carried: GSV TICKET-007 (caller-text limits; at-limit and over-limit tests) | honoured | — | 🔁 Carried |
| Carried: per-type bundles (exclusions; circle leak) | honoured; "A circle" not asserted absent from the square's built entry | — | 🔁 Carried |

**Resolved from ground truth (not escalated):**
- *Labels on all four sides of a very small square (spec Edge Case).* Every square is drawn at one fixed size (GSS-REQ-031), so a 0.001 square has the same room for labels as a 1,000,000 square. The edge case is covered by the same placement and overlap test as any square, run at the smallest side length.
- *"side" or `sideLength`.* `sideLength` (Known Hazard, AD-005).
- *How "one or all" is written.* The definition kit has an `enum` kind, so one term `labelSides: "one" | "all"` carries the option.

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-10-29
**Implemented by:** sonnet · medium — routed as deliver-small from Tower

### Planned Files

**Terms:** `sideLength` (required, 0.001 to 1,000,000), `labelSides` (`"one"` — the bottom side — or `"all"`), `sideLabelText` (custom text, ≤ 200; alone it labels one side; with `"all"`, all four), `showRightAngles`, `unit` (≤ 20); plus the shared `title` and `lineColor`.

- `src/core/definitions/figure.ts` (new): the one definition of the `unit` term, a plain object literal, used by the circle and the square, so the term is defined once (GSV-REQ-015) and the square's bundle pulls in no circle code. The circle switches to it.
- `src/core/definitions/square.ts`: `Square` type; a side-effect-free factory `export const square = /* @__PURE__ */ defineSquare()`; `describe(normalized, provenance)` — "A square titled “Tile” with side length 4 cm. Its right angles are marked. All four sides are labeled." Custom text quoted with the value still stated; a blank label "left blank"; a title blank after cleaning is absent. Measurements stated with `stateMeasurement`; caller text through `quoteText`.
- `src/layout/kit/figure-labels.ts` (new; carried QR-004): the circle's figure-agnostic label code moved out of `src/layout/circle.ts` — the gap, the label wrap width and line cap (4), `labelSize`, the beside-horizontal and beside-vertical candidate generators, a stroked `segmentNode`, and `placeLabels(requests, obstacles, bounds, stackTop)` which places each label with `placeLabel`, adds it as an obstacle (AD-010), and stacks the ones with no clear place below the figure (DEL-006), returning the nodes and the new bottom. The circle then uses it, with its tests unchanged (it keeps exporting `DRAWN_RADIUS`, `LABEL_MAX_LINES`, `besideOutline`).
- `src/layout/square.ts`: the square at one fixed drawn side, centered below the title; labels outside each side (bottom for `"one"`, all four for `"all"`); right-angle marks as small polylines inside each corner, added as obstacles; every number through `fmt()`; text alternative from the square's own `describe`.
- Registration: `src/core/definitions/index.ts`, `src/layout/registry.ts` (no casts, `satisfies`), `src/index.ts`, `src/react/graphs/SquareGraph.tsx`, `src/entries/square.ts`, `tsup.config.ts`, `package.json` (`./square`), `.size-limit.json` (25 kB); then `pnpm generate` and commit `src/generated/*`.
- `examples/square.json` (every term used once), `examples/invalid/square-zero-side.json`.
- `tests/core/square.test.ts`: zero and negative side → `out_of_range`; the text alternative.
- `tests/layout/square.test.ts`: four drawn sides equal within 1%; both label modes; value, unit and custom text; 0.001 square with all four labels placed outside without overlap; overlap property with `size: "max"` strings and boxes shrunk by 0.01; right-angle marks; `fmt()`/`checkScene`; one test through `createGraph`, the rest calling the layout after `validate`.
- `tests/layout/kit/figure-labels.test.ts` (new): the extracted kit code.
- Extended: `tests/core/definitions.test.ts` (registered square block), `tests/react/Graph.test.tsx` (at-limit and over-limit caller text), `tests/package/per-type-bundle.test.ts` (exclusions, no "A circle" assertion on the square's built entry).
- Updated: `tests/core/describe.test.ts` — the "not registered yet" assertion moves from the square to the triangle.
- `.gener8v/specifications/geometric-shapes-and-solids.md`: `@spec Coverage` rows.
- `.changeset/square-graph.md` (patch, `Added:`).

### How Acceptance Criteria Will Be Met

- `{ "type": "square", "sideLength": 4 }` renders four equal sides within 1%: fixed drawn side; `tests/layout/square.test.ts` measures the outline.
- Zero or negative side length → `out_of_range`: `min: 0.001` on `sideLength`; `tests/core/square.test.ts` and the invalid example.
- Side labels for one side or all four, through `measurementLabel`: `labelSides` / `sideLabelText`; layout tests per mode and per text kind.
- Labels on all four sides of a very small square placed outside, no overlap: candidates outside each side, `placeLabels`; layout test at 0.001 plus the overlap property.
- Right-angle marks at all four corners when requested: `showRightAngles`; layout test.
- Text alternative names the square and states the side length and unit: `describe`; core and layout tests.
- `SquareGraph`, `./square` entry, size-limit entry and example exist; Scene numbers through `fmt()`: registration files; `checkScene`, per-type bundle test, `size-limit`.

## Progress

- [x] `src/core/definitions/figure.ts` (and circle switched to it)
- [x] `src/core/definitions/square.ts`
- [x] `src/layout/kit/figure-labels.ts` (and circle layout switched to it)
- [x] `src/layout/square.ts`
- [x] Registration: definitions index, layout registry, `src/index.ts`, `SquareGraph.tsx`, `entries/square.ts`, `tsup.config.ts`, `package.json`, `.size-limit.json`
- [x] `examples/square.json`, `examples/invalid/square-zero-side.json`
- [x] `tests/core/square.test.ts`
- [x] `tests/layout/square.test.ts`
- [x] `tests/layout/kit/figure-labels.test.ts`
- [x] Extended tests: definitions, Graph, per-type bundle; describe test updated
- [x] `pnpm generate`; `.changeset/square-graph.md`

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/core/definitions/figure.ts`: new — the one `unit` term spec (`unitProperty`), a plain object literal shared by the circle and the square.
- `src/core/definitions/circle.ts`: uses `unitProperty` instead of its inline `unit` spec (same text).
- `src/core/definitions/square.ts`: new — `Square`, `SideLabels`, `squareLabels`, and `square = /* @__PURE__ */ defineSquare()` with `describe(square, provenance)`.
- `src/layout/kit/figure-labels.ts`: new — `GAP`, `LABEL_MAX_WIDTH`, `LABEL_MAX_LINES`, `labelSize`, `besideHorizontal`, `besideVertical`, `segmentNode`, `Bounds`, `LabelRequest`, `placeLabels` (moved out of the circle; carried QR-004).
- `src/layout/circle.ts`: uses the kit; still exports `DRAWN_RADIUS`, `LABEL_MAX_LINES` (re-exported), `besideOutline`, `circleLayout`. Scene byte-identical to `main` (see Verification Run).
- `src/layout/square.ts`: new — `squareLayout`, `DRAWN_SIDE` (200), `RIGHT_ANGLE_MARK` (14).
- `src/react/graphs/SquareGraph.tsx`, `src/entries/square.ts`: new — component and `./square` entry.
- `src/core/definitions/index.ts`, `src/layout/registry.ts`, `src/index.ts`, `tsup.config.ts`, `package.json` (`./square`), `.size-limit.json` (25 kB): registration.
- `src/generated/description.ts`, `schema.json`, `tool-schema.json`, `vocabulary.json`: regenerated by `pnpm generate`.
- `examples/square.json`, `examples/invalid/square-zero-side.json`: new.
- `.changeset/square-graph.md`: new (patch, `Added:`).
- `tests/core/square.test.ts` (13 tests), `tests/layout/square.test.ts` (27), `tests/layout/kit/figure-labels.test.ts` (13): new.
- `tests/core/definitions.test.ts` (registered-square block), `tests/react/Graph.test.tsx` (at-limit text, over-limit `title`/`sideLabelText`/`unit`, component name), `tests/package/per-type-bundle.test.ts` (square exclusions), `tests/core/describe.test.ts` ("not registered" check moved to the triangle): extended.
- `.gener8v/specifications/geometric-shapes-and-solids.md`: `@spec Coverage` rows for GSS-REQ-007..009, square locations added to 033..036.

## Verification Run

Run in the main session on 2026-10-29, after the code was written.

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm generate` | 0 | generated files unchanged after the subagent's run |
| `pnpm lint` | 0 | — |
| `pnpm typecheck` | 0 | — |
| `npx vitest run --no-cache` (×3, then once more after tightening the label tests) | 0 | 60 files, 1,706 tests passed each run (1,637 before) |
| `pnpm bench` | 0 | 16 passed |
| `pnpm build` | 0 | — |
| `pnpm check:dist` | 0 | — |
| `pnpm check:deps` | 0 | — |
| `pnpm check:images` | 0 | — |
| `pnpm check:changesets` | 0 | — |
| `pnpm size` | 0 | `./square` 16.5 kB of 25; `./circle` 16.84 kB; `./core` 26.44 kB of 40; `.` 41.15 kB of 120 |
| `pnpm publint` | 0 | — |
| `pnpm attw` | 0 | only the configured ignores |
| `pnpm audit` / `pnpm audit --prod` | 0 / 0 | No known vulnerabilities found |
| Circle Scene identity probe (`TSX_DISABLE_CACHE=1 npx tsx`, 150 circle descriptions over radius, every switch and custom text, on this branch and on a `main` worktree) | 0 | identical SHA-256 `f360acd2…930f6` on both |
| Mutation checks on the new tests | — | caught: unequal sides, marks off, bottom/top/left label moved into the square, placed label not an obstacle, no stack gap, right-angle sentence dropped, custom text alone not labeling. Survived: removing the sides from the obstacles (equivalent — every candidate already lies outside the square) |
| `gener8v-state.py state` / `lint` | 0 / 0 | 0 errors, 0 warnings |

## Acceptance Criteria Verification

- [x] `{ "type": "square", "sideLength": 4 }` renders four equal sides within 1% — `tests/layout/square.test.ts` "draws four sides equal within 1%…" (fast-check over 0.001..1,000,000; every side exactly `DRAWN_SIDE`).
- [x] Zero or negative side length returns `out_of_range` — `tests/core/square.test.ts`; `examples/invalid/square-zero-side.json` through the example tests.
- [x] Side labels for one side or all four, through `measurementLabel` (value, unit, custom text) — layout tests "labels one side, the bottom…", "labels all four sides…", "shows the value alone…", "shows a supplied value as written…", "replaces the whole label with custom text…", blank-label cases.
- [x] Labels on all four sides of a very small square placed outside without overlap — "places all four labels of the smallest square outside it…" (0.001) and the overlap property with `size: "max"` text.
- [x] Right-angle marks at all four corners when requested — "draws no marks unless requested", "marks all four corners, each mark inside its corner", "keeps labels clear of the marks".
- [x] Text alternative names the square and states side length and unit — `tests/core/square.test.ts` describe cases; layout "carries the definition's text alternative".
- [x] `SquareGraph`, `./square` entry, size-limit entry and example exist; Scene numbers through `fmt()` — `checkScene` in every layout test, "passes every number through fmt()…", `tests/package/per-type-bundle.test.ts`, `pnpm size`, `tests/core/schema-agreement.test.ts` over `examples/square.json`.

## Decisions Made

### DEL-001: One `labelSides` enum for "one or all"

**Context:** The spec asks for a side label option "one or all".
**Decision:** `labelSides: "one" | "all"`; `"one"` is the bottom side. `sideLabelText` alone labels one side; with `"all"` it labels all four.
**Rationale:** One term for one choice; with an enum nothing can contradict custom text, so the square needs no domain check (unlike the circle's `agrees` checks).
**Ticket Impact:** None beyond naming.

### DEL-002: One shared `unit` term spec

**Context:** The circle defined `unit` inline; the vocabulary needs one definition per term (GSV-REQ-015), and importing the circle's definition would put the circle in the square's bundle.
**Decision:** `src/core/definitions/figure.ts` exports `unitProperty`, a plain object literal; the circle and the square both use it. The cube and cylinder should too.
**Rationale:** One text, no drift, no cross-type bundle cost.
**Ticket Impact:** A small change to `circle.ts`, outside the ticket's Output.

### DEL-003: The kit's label region is `Bounds`, not a `Box`

**Context:** `placeLabels` needs the region a label must stay in.
**Decision:** `{ left, top, right, bottom }`.
**Rationale:** A `Box` would compute the circle's bottom edge as `top + (bottom − top)`, which can differ in the last bit and change the circle's Scene; the edges are passed as computed.
**Ticket Impact:** None; the circle's Scene is unchanged.

### DEL-004: Fixed drawn side of 200, labels a gap outside each side

**Context:** GSS-REQ-031 (scale to fit) and the very-small-square edge case.
**Decision:** Every square is drawn with a 200-unit side, centered below the title, with one label line of room above and below. Each label tries the middle of its side, then a quarter either way; a label with no room (for example a long one beside the left or right side) is stacked below the figure (GSS TICKET-002 DEL-006). Right-angle marks are 14-unit polylines inside each corner, added as obstacles.
**Rationale:** A fixed size makes the smallest square's labels as roomy as any other's, so the edge case needs no special rule.
**Ticket Impact:** None.

## Deviations from Plan

- The outline is one `polygon` node, with each side still a separate obstacle. The plan said only "a figure line".
- `labelSize` wraps `textBlock` (`src/layout/kit/title.ts`), which already measures with a loop. The circle's Scene is unchanged (identity probe).
- The `@spec` annotations on the kit's `labelSize` and `placeLabels` name GSS-REQ-006 (the circle's labels) as well as GSS-REQ-008.
- After the mutation checks, the main session tightened two layout tests so each label must sit a gap beside its own side, not merely outside the square.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| GSS-REQ-007 | `src/core/definitions/square.ts`:square, defineSquare; `src/layout/square.ts`:squareLayout; `src/react/graphs/SquareGraph.tsx`:SquareGraph | `@spec GSS-REQ-007, …` |
| GSS-REQ-008 | `src/core/definitions/square.ts`:squareLabels, square; `src/layout/kit/figure-labels.ts`:labelSize, placeLabels; `src/layout/square.ts`:squareLayout | `@spec GSS-REQ-008, …` |
| GSS-REQ-009 | `src/core/definitions/square.ts`:square; `src/layout/square.ts`:squareLayout | `@spec GSS-REQ-009, …` |
| GSS-REQ-033..036 | `src/core/definitions/square.ts`:describe; `src/layout/square.ts`:squareLayout; `src/core/definitions/figure.ts`:unitProperty (033) | `@spec GSS-REQ-033, GSS-REQ-034, GSS-REQ-036` / `GSS-REQ-035` |

## Notes

- The circle-bundle leak still holds: the square's built `./dist/square.js` consumer bundle is not asserted free of "A circle". The source-entry bundle of the square is, and that assertion passes.
- `examples/square.json` uses `labelSides: "all"` with `sideLabelText: "s"`, so it draws "s" four times and the unit appears only in the text alternative.
- The cube (TICKET-006) and cylinder (TICKET-007) should use `unitProperty` and `placeLabels` from the kit.

## Post-Review Amendments

### graph-library/geometric-shapes-and-solids-ticket-003-code-review/CR-001 — `showRightAngles` said "small square"

**Change:** The term's description now says "a small right-angle mark in each corner", matching the L-shaped polyline the layout draws; `pnpm generate` carried it into the generated types, schema, tool schema and vocabulary.
**Files:** `src/core/definitions/square.ts`, `src/generated/description.ts`, `src/generated/schema.json`, `src/generated/tool-schema.json`, `src/generated/vocabulary.json`
**Re-verification:** full verification loop — generate, lint, typecheck, vitest ×3 (1,706 passed each), bench, build, check:dist, check:deps, check:images, check:changesets, size, publint, attw, audit, audit --prod — all exit 0; gener8v-state lint 0 errors.

### graph-library/geometric-shapes-and-solids-ticket-003-quality-review/QR-001, QR-002, QR-003 — kit naming and an unexplained bound

**Change:**
- QR-001: `src/layout/circle.ts` no longer re-exports `LABEL_MAX_LINES`; the circle test imports it from the kit (its only change).
- QR-002: the kit exports `LabelBlock` (a `LabelSize` with its lines); `labelSize` is renamed `labelBlock` and returns it; `placeLabels` holds unplaced labels as `LabelBlock[]`.
- QR-003: the square's at-limit Scene bound names its parts (`TITLE_MAX_LINES + LABELS * LABEL_MAX_LINES + OUTLINE + MARKS`).
**Files:** `src/layout/circle.ts`, `src/layout/kit/figure-labels.ts`, `tests/layout/circle.test.ts`, `tests/layout/kit/figure-labels.test.ts`, `tests/layout/square.test.ts`, `.gener8v/specifications/geometric-shapes-and-solids.md`
**Re-verification:** full verification loop — all exit 0; vitest ×3, 1,706 passed each; gener8v-state lint 0 errors.

### graph-library/geometric-shapes-and-solids-ticket-003-security-review/SEC-001 — the shared `unit` spec was copied per figure

**Change:** `src/core/definitions/figure.ts` builds the `unit` term with `/* @__PURE__ */ defineProperties(…)` and exports `unitProperty = figureTerms.unit`: frozen, null prototype, and the same object in the circle's and the square's properties (not a bare `Object.freeze`, which would keep `Object.prototype`). `tests/core/definitions.test.ts` asserts identity, frozenness and the null prototype (a spread copy fails it). This supersedes DEL-002's "plain object literal".
**Files:** `src/core/definitions/figure.ts`, `tests/core/definitions.test.ts`
**Re-verification:** full verification loop — all exit 0; vitest ×3, 1,706 passed each; sizes unchanged (`./square` 16.51 kB, `./circle` 16.85 kB, `./core` 26.44 kB); `pnpm audit` and `--prod` clean; gener8v-state lint 0 errors.
