# TICKET-006: Cube graph type — Delivery Record

## Ticket Reference

**Ticket:** graph-library/geometric-shapes-and-solids/TICKET-006
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/geometric-shapes-and-solids.md`
**Requirements Covered:**
- GSS-REQ-023: Draw a cube from an edge length so it reads as 3D
- GSS-REQ-024: Hidden edges dashed by default, optionally omitted
- GSS-REQ-025: Optionally label one edge or the three visible edges meeting at a corner

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Predecessors TICKET-001 (isometric kit) and TICKET-002 (circle) delivered | delivery records | both Delivered and reviewed (Approved); `main` at `ab0e61f` | ✅ |
| `isometric`, `ISO_SCALE`, `VISIBLE_FACES`, `faceVisible` | `src/layout/kit/isometric.ts` | present; front top and back bottom corners project to one point (CR-004 hazard) | ✅ |
| Measurement labels and figure label kit | `measurementLabel`, `placeLabels`, `segmentNode`, `polylineNode` | `src/layout/kit/measure.ts`, `src/layout/kit/figure-labels.ts` | ✅ |
| Dashed lines in the Scene | `stroke-dasharray` | allowed; the x,y,z graph's `GUIDE_DASH` ("4 3") | ✅ |
| `cube` in `GRAPH_TYPES`; shared `title`, `lineColor` apply | `types.ts`, `shared.ts` | present (`FIGURES`) | ✅ |
| Shared figure terms | `unitProperty`, `labelSidesProperty`, `agrees` | `src/core/definitions/figure.ts` | ✅ — `unit` shared; edges need their own option (plan) |
| Tests that use the cube as an unregistered type | moved | `tests/core/describe.test.ts:40` (`{ type: "cube", edge: 1 }`) and `tests/core/validate-envelope.test.ts:68` (`unknown_graph_type` for a cube) | ⚠️ Both move to the cylinder |
| Registration checklist | square `2a5838e`, triangle `410f82b` | present | ✅ |
| Carried: GSS TICKET-001 CR-004 (hexagon; hidden edges inside it are obstacles too) | honoured | — | 🔁 Carried |
| Carried: GSS TICKET-001 SEC-002 (scale before projecting; test at the edge-length limit) | honoured | — | 🔁 Carried |
| Carried: definition contract, `maxItems`, domain checks, rich example + `pnpm generate`, provenance, measurement-label rules, caller text (`wrap`, at-limit and over-limit tests), per-type bundles, registration checklist | honoured | — | 🔁 Carried |

**Resolved from ground truth (not escalated):**
- *Oblique (spec Assumption) or isometric.* Isometric (AD-009, Known Hazard).
- *"edge" or `edgeLength`.* `edgeLength` (AD-005).

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-10-29
**Implemented by:** opus · high — routed as deliver-large from Tower

### Planned Files

- `src/core/definitions/cube.ts` (new): `/* @__PURE__ */ defineCube()` — `edgeLength` (required, 0.001 to 1,000,000), `hiddenEdges` (`"dashed"`, the default, or `"omitted"`), `labelEdges` (`"one"`: the hexagon's bottom-right outer edge; `"three"`: the three visible edges meeting at the front corner), `edgeLabelText` (custom text ≤ 200; alone it labels one edge, with `"three"` all three), shared `unitProperty`; `title` and `lineColor` from `propertiesOf`. `describe(cube, provenance)`: "A cube with edge length 3 cm. Its hidden edges are dashed. Three edges meeting at a corner are labeled."
- `src/layout/cube.ts` (new): `cubeLayout` — edge length scaled into drawing units before `isometric()` (no overflow at 1,000,000); 9 visible edges solid, chosen with `faceVisible`; 3 hidden edges dashed (`stroke-dasharray`, "4 3") or omitted; labels with `placeLabels`, visible and hidden edges both obstacles; an unplaced label stacked below, naming its edge.
- Registration: `src/core/definitions/index.ts`, `src/layout/registry.ts`, `src/index.ts`, `src/react/graphs/CubeGraph.tsx`, `src/entries/cube.ts`, `tsup.config.ts`, `package.json` (`./cube`), `.size-limit.json` (25 kB); `pnpm generate`; `.changeset/cube-graph.md`.
- Examples: `examples/cube.json` (every optional term once), `examples/invalid/cube-negative-edge.json`.
- `tests/core/cube.test.ts` (new): zero and negative `out_of_range`; the text alternative.
- `tests/layout/cube.test.ts` (new): 9 solid + 3 dashed by default, 9 when omitted; all 12 projected edges equal within 1%; label modes and custom text; no label over a solid or dashed edge; `checkScene`/`fmt()`; a `createGraph` test at 1,000,000 not `internal_error`.
- Extended: `tests/react/Graph.test.tsx` (at-limit, over-limit, size ceiling), `tests/package/per-type-bundle.test.ts`, `tests/core/definitions.test.ts`; `tests/core/describe.test.ts` and `tests/core/validate-envelope.test.ts` move their unregistered-type checks from the cube to the cylinder.
- `.gener8v/specifications/geometric-shapes-and-solids.md`: `@spec Coverage` rows.

### How Acceptance Criteria Will Be Met

- `{ "type": "cube", "edgeLength": 3 }` → 9 solid and 3 dashed edges by default — `faceVisible` per edge; layout test counts.
- Hidden edges omitted → only the 9 visible — `hiddenEdges: "omitted"`; layout test.
- All 12 projected edges equal within 1% — isometric equal foreshortening; layout test.
- Edge labels for one edge or the three front-corner edges, as measurement labels — `labelEdges`, `edgeLabelText`; layout tests.
- Zero or negative edge length → `out_of_range` — `min: 0.001`; core test and invalid example.
- Text alternative names a cube and states the edge length — `describe`; core and layout tests.
- `CubeGraph`, `./cube`, size-limit entry, example; Scene numbers through `fmt()` — registration, `checkScene`, per-type bundle test, `pnpm size`.

## Progress

- [x] `src/core/definitions/cube.ts`
- [x] `src/layout/cube.ts`
- [x] Registration files, `pnpm generate`, changeset
- [x] Examples
- [x] `tests/core/cube.test.ts`
- [x] `tests/layout/cube.test.ts`
- [x] Extended and moved tests (Graph, per-type bundle, definitions, describe, validate-envelope)
- [x] `@spec Coverage` rows

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/core/definitions/cube.ts` (new): `Cube`, `CUBE_EDGE_MIN`/`CUBE_EDGE_LIMIT`, `cubeDisplay`, `/* @__PURE__ */ defineCube()` — `edgeLength`, `hiddenEdges`, `labelEdges`, `edgeLabelText`, shared `unitProperty`; `describe`.
- `src/layout/cube.ts` (new): `cubeLayout`, `DRAWN_EDGE` (120), `CUBE_EDGES` (12 edges, visibility from `faceVisible`).
- `src/layout/kit/isometric.ts`: `HIDDEN_DASH` ("4 3").
- `src/react/graphs/CubeGraph.tsx`, `src/entries/cube.ts` (new); registration in `src/core/definitions/index.ts`, `src/layout/registry.ts`, `src/index.ts`, `tsup.config.ts`, `package.json` (`./cube`), `.size-limit.json`; `src/generated/*` regenerated; `.changeset/cube-graph.md`.
- `examples/cube.json`, `examples/invalid/cube-negative-edge.json` (new).
- `tests/core/cube.test.ts`, `tests/layout/cube.test.ts` (new); `tests/react/Graph.test.tsx` (at-limit, over-limit, size ceiling), `tests/package/per-type-bundle.test.ts`, `tests/core/definitions.test.ts` extended; `tests/core/describe.test.ts` and `tests/core/validate-envelope.test.ts` use the cylinder as the unregistered type.
- `.gener8v/specifications/geometric-shapes-and-solids.md`: `@spec Coverage` rows for GSS-REQ-023..025; the cube added to 030..036.

## Verification Run

Run in the main session on 2026-10-29, after the code was written.

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm generate` | 0 | stable |
| `pnpm lint` / `pnpm typecheck` | 0 / 0 | — |
| `npx vitest run --no-cache` ×3 | 0, 0, 0 | 1,951 passed each (1,893 before) |
| `pnpm bench` | 0 | 18 passed |
| `pnpm build` | 0 | — |
| `pnpm check:dist` / `check:deps` / `check:images` / `check:changesets` | 0 / 0 / 0 / 0 | — |
| `pnpm size` | 0 | `./cube` 18.07 kB of 25; `./core` 32.02 kB of 40 |
| `pnpm publint` / `pnpm attw` | 0 / 0 | — |
| `pnpm audit` / `pnpm audit --prod` | 0 / 0 | No known vulnerabilities found |
| Mutation checks (`tests/layout/cube.test.ts`, `tests/core/cube.test.ts`) | — | caught: an edge visible only when both faces are (4 fail), hidden edges solid (3), `"omitted"` ignored (3), the caller's scale reaching `isometric` unscaled (2), hidden edges not label obstacles (2). Survived: the outer edge's label allowed inside the hexagon — equivalent in practice, since its outward candidates come first and always fit |
| `gener8v-state.py state` / `lint` | 0 / 0 | 0 errors, 0 warnings |

## Acceptance Criteria Verification

- [x] `{ "type": "cube", "edgeLength": 3 }` renders 9 solid and 3 dashed edges by default — `tests/layout/cube.test.ts` edge counts; the visibility and dash mutants fail it.
- [x] Hidden edges omitted → only the 9 visible — layout test; the ignored-`omitted` mutant fails it.
- [x] All 12 projected edges equal within 1% — fast-check property (within 0.1% of `DRAWN_EDGE`).
- [x] One edge or the three front-corner edges labeled with measurement labels — layout label tests, custom and blank text.
- [x] Zero or negative edge length → `out_of_range` — `tests/core/cube.test.ts` (0, −1, −3, 0.0009, 1,000,001) and the invalid example.
- [x] Text alternative names a cube and states the edge length — core describe tests.
- [x] `CubeGraph`, `./cube`, size-limit entry, example; Scene numbers through `fmt()` — `checkScene` in the layout tests, the per-type bundle test, `pnpm size`, schema agreement over `examples/cube.json`; a `createGraph` test at 1,000,000 is not `internal_error` (GSS TICKET-001 SEC-002).

## Decisions Made

### DEL-001: `hiddenEdges` defaults to dashed, and is always stated

**Decision:** An absent `hiddenEdges` means dashed (`cubeDisplay`; definitions have no default mechanism). The text alternative always says how hidden edges are drawn: "Its hidden edges are dashed." or "… are not drawn."

### DEL-002: Which edges are labeled

**Decision:** `"one"` is the hexagon's bottom-right outer edge, (0,1,0)–(1,1,0), labeled outside the hexagon (outward candidates only). `"three"` are the edges from the front corner (1,1,1) along z, x and y, labeled between the spokes (both normals; t = 0.5, 0.4, 0.6, 0.3, 0.7). Hidden edges are label obstacles when drawn, not when omitted. A stacked label reads "edge = …"; with three, the stacked lines read alike, since the edges are equal. `labelEdges` has no "none", so nothing can contradict `edgeLabelText` and there is no domain check.

### DEL-003: Fixed size and the dash constant

**Decision:** `DRAWN_EDGE` = 120 (a hexagon about 208 × 240); the model edge is `DRAWN_EDGE / ISO_SCALE`, so the caller's value never reaches `isometric()`. The dash is `HIDDEN_DASH` in the isometric kit, not the x,y,z graph's `GUIDE_DASH`, so the cube's bundle imports nothing from that layout. The hexagon starts directly below the title: no cube label sits above the figure.

### DEL-004: Text alternative wording

**Decision:** "One edge is labeled." / "Three edges meeting at a corner are labeled." / "… labeled “s”." / "The edge label is left blank." / "The edge labels are left blank."; the edge length is always stated.

## Deviations from Plan

- `HIDDEN_DASH` added to `src/layout/kit/isometric.ts` (DEL-003), outside the ticket's Output.
- No label row above the hexagon (DEL-003).

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| GSS-REQ-023 | `src/core/definitions/cube.ts`:cube, defineCube; `src/layout/cube.ts`:cubeLayout, CUBE_EDGES; `src/react/graphs/CubeGraph.tsx`:CubeGraph | `@spec GSS-REQ-023, …` |
| GSS-REQ-024 | `src/core/definitions/cube.ts`:cubeDisplay, cube; `src/layout/cube.ts`:cubeLayout, CUBE_EDGES | `@spec GSS-REQ-024, …` |
| GSS-REQ-025 | `src/core/definitions/cube.ts`:cubeDisplay, cube; `src/layout/cube.ts`:cubeLayout | `@spec GSS-REQ-025, …` |
| GSS-REQ-030..036 | `src/layout/cube.ts`:cubeLayout; `src/core/definitions/cube.ts`:describe | (cube locations added to the coverage rows) |

## Notes

- Long front-corner labels (about 80 units of room between the spokes) stack below the figure: "3 cm" fits, "1000000 millimetres" stacks.
- Known problem, as for the triangle: "A circle" is not asserted absent from the built `./cube` bundle.
- Size ceiling measured 2026-10-29: a 552-character text alternative, 12,047 characters of markup and 15 `<text>` nodes, pinned in `tests/react/Graph.test.tsx`.

## Post-Review Amendments

None
