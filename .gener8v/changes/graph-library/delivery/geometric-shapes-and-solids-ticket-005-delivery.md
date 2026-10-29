# TICKET-005: Triangle layout and labels — Delivery Record

## Ticket Reference

**Ticket:** graph-library/geometric-shapes-and-solids/TICKET-005
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/geometric-shapes-and-solids.md`
**Requirements Covered:**
- GSS-REQ-020: Optionally label sides, angles (degrees) and vertices
- GSS-REQ-021: Mark a 90° angle with a right-angle mark instead of an arc
- GSS-REQ-022: Triangle given by sides and angles placed in one documented, deterministic orientation

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Predecessors TICKET-004 (solver) and TICKET-002 (circle) delivered | delivery records | both Delivered and reviewed (Approved); `main` at `32bd5a1` | ✅ |
| `src/core/geometry/triangle-solver.ts`, `src/core/definitions/triangle.ts` | present | present; triangle **not registered** (TICKET-004 DEL-002) | ✅ — this ticket registers it (Known Hazard) |
| Measurement labels and figure label kit | `measurementLabel`, kit | `src/layout/kit/measure.ts` (`measurementLabel`); `src/layout/kit/figure-labels.ts` (`placeLabels`, `labelBlock`, `segmentNode`, `besideHorizontal`/`besideVertical`; GSS TICKET-003) | ✅ |
| `src/layout/kit/labels.ts`, `src/layout/kit/text.ts` | present | present | ✅ |
| Side, angle and vertex label options in the definition | terms to read | none yet: TICKET-004 left them to this ticket (DEL-003; Known Hazard) | ⚠️ Shapes the plan — terms added here |
| "First-named side" known to the layout | the defining set's first side | the solver returns `scale`, but the normalized description does not carry it; the provenance does say which sides were supplied | ⚠️ Shapes the plan — derived from the provenance (see plan) |
| Angle arcs in the kit | an arc helper | none; Scene allows `polyline` and `path` (`d`) with `fmt()` numbers (`src/layout/kit/check.ts`) | ✅ — arcs drawn as short polylines |
| Every valid triangle has every angle ≥ 0.02° and is not flat (TICKET-004 SEC-001) | guaranteed by validation | `TRIANGLE_MIN_ANGLE`, `drawable` | ✅ — layout still guards divisions (Known Hazard) |
| `describe.test.ts` "not registered" assertion uses the triangle | moves to the cube | `tests/core/describe.test.ts` | 🔁 Carried (Known Hazard) |
| `tests/core/triangle.test.ts`, `definitions.test.ts` assert "not registered" | switch to registered | present | 🔁 Carried |
| Registration checklist | ruler `5e28148`, square `2a5838e` | present | ✅ |
| Carried: GSS TICKET-002 CR-002..005 (measurement labels; custom text replaces whole label; stack below) | honoured | — | 🔁 Carried |
| Carried: GSS TICKET-002 SEC-001..003, GSV TICKET-007 (caller text: `wrap`, caps, at-limit and over-limit tests; vertex names through `wrap`) | honoured | — | 🔁 Carried |
| Carried: per-type bundles (exclusions; circle leak; x,y graph code left out) | honoured | — | 🔁 Carried |
| Carried: TICKET-004 DEL-004 (shared `x`/`y`) | reused | — | 🔁 Carried |

**Resolved from ground truth (not escalated):**
- *Which side is "first-named" for three sides.* `sideA` (the solver's `scale` for SSS).
- *Mirror risk for vertex-given triangles.* Flip y in the layout (Known Hazard).

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-10-29
**Implemented by:** opus · high — routed as deliver-large from Tower

### Planned Files

- `src/core/definitions/triangle.ts`: label terms (GSS-REQ-020) — `labelSides` (all three sides with their lengths), `labelAngles` (all three angles, degrees); `sideALabelText`, `sideBLabelText`, `sideCLabelText` and `angleALabelText`, `angleBLabelText`, `angleCLabelText` (custom text, each labelling its own side or angle on its own, ≤ 200 characters); vertex names from `vertexNames`. Rules as the circle and square: custom text replaces the whole label, `""` is a blank label, a label with no clear place is stacked below the figure, labels over four lines are cut with "…". A display helper shared by `describe` and the layout. `describe` states the shown labels (custom text quoted, the value still stated).
- `src/layout/triangle.ts` (new): `triangleLayout`. Orientation (GSS-REQ-022): sides/angles — the first supplied side in the order a, b, c (read from the provenance) horizontal at the bottom, its ends counter-clockwise (a: B→C, b: C→A, c: A→B), the remaining vertex above; vertices — positions kept, y flipped (y-up to SVG y-down), never mirrored. Scaled to fit by bounding box and centered; no division by a height, inradius or angle sine. Side labels outside each side at its midpoint along the outward normal; angle labels inside each angle; vertex names outside each vertex; all placed with `placeLabels`, clear of the lines and each other. A shown angle gets an arc (a short `fmt()`'d polyline), or a right-angle mark when within 1% of 90° (GSS-REQ-021). Text alternative from the triangle's own `describe`.
- Registration: `src/core/definitions/index.ts`, `src/layout/registry.ts`, `src/index.ts`, `src/react/graphs/TriangleGraph.tsx`, `src/entries/triangle.ts`, `tsup.config.ts`, `package.json` (`./triangle`), `.size-limit.json` (25 kB); `pnpm generate`; `.changeset/triangle-graph.md` (`Added:`).
- Examples: `examples/triangle.json` (three sides, every optional term once), `examples/triangle-sas.json`, `examples/triangle-asa.json`, `examples/triangle-vertices.json`, `examples/invalid/triangle-ambiguous.json`, `examples/invalid/triangle-inequality.json`.
- `tests/layout/triangle.test.ts` (new): orientation per set and identical across renders; vertex-given positions kept, not mirrored; side, angle and vertex labels with custom text; right-angle mark at 90°, arcs otherwise; thin triangle 1, 100, 100.5 and a 0.02° needle drawn to scale, no label overlaps (estimated boxes), finite coordinates; text alternative; `fmt()`/`checkScene`; one test through `createGraph`.
- Extended: `tests/react/Graph.test.tsx` (at-limit text incl. `oneClusterTexts` vertex names; over-limit per text term); `tests/package/per-type-bundle.test.ts` (exclusions; no "A circle" assertion on the built entry; x,y graph code left out); `tests/core/definitions.test.ts` and `tests/core/triangle.test.ts` switched to the registered triangle; `tests/core/describe.test.ts` "not registered" moves to the cube.
- `.gener8v/specifications/geometric-shapes-and-solids.md`: `@spec Coverage` rows.

### How Acceptance Criteria Will Be Met

- Sides/angles: first-named side horizontal at the bottom, remaining vertex above, identical every render — orientation rule; layout tests per set and a determinism test.
- Vertices: relative positions kept, no reflection, scaled to fit — y flip; layout test on a known clockwise and counter-clockwise triangle.
- Sides (measurement labels with unit or custom text), angles (degrees), vertex names — label terms and layout; layout tests.
- An angle within tolerance of 90° gets a right-angle mark instead of an arc — layout test.
- Very thin triangle (1, 100, 100.5) to scale, labels not overlapping each other or the lines — layout overlap test.
- Text alternative names the triangle and states each shown side, angle and vertex name — `describe`; core and layout tests.
- `TriangleGraph`, `./triangle` entry, size-limit entry, examples (one per determining set); Scene numbers through `fmt()` — registration, `checkScene`, per-type bundle test, `pnpm size`.

## Progress

- [x] Label terms, display helper and `describe` in `src/core/definitions/triangle.ts`
- [x] `src/layout/triangle.ts`
- [x] Registration files, `pnpm generate`, changeset
- [x] Examples (four valid, two invalid)
- [x] `tests/layout/triangle.test.ts`
- [x] Extended and switched tests (Graph, per-type bundle, definitions, triangle, describe)
- [x] `@spec Coverage` rows

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/core/definitions/triangle.ts`: label terms (`labelSides` shared, `labelAngles`, six custom texts), `triangleDisplay`, `isRightAngle`, `describe` stating shown labels and right angles; `vertexNames` descriptions completed.
- `src/core/definitions/figure.ts`: `labelSidesProperty` (shared with the square, DEL-001) and a generic `agrees<D>()` (moved from the circle, DEL-002).
- `src/core/definitions/square.ts`, `src/core/definitions/circle.ts`: use the shared `labelSides` and `agrees`; behaviour unchanged.
- `src/layout/triangle.ts` (new): `triangleLayout`, `modelVertices`, `fitScale`, `SIDE_ENDS`, `FIGURE_WIDTH`/`FIGURE_HEIGHT`, `ARC_RADIUS`, `RIGHT_ANGLE_MARK`.
- `src/react/graphs/TriangleGraph.tsx`, `src/entries/triangle.ts` (new).
- Registration: `src/core/definitions/index.ts`, `src/layout/registry.ts`, `src/index.ts`, `tsup.config.ts`, `package.json` (`./triangle`), `.size-limit.json`; `src/generated/*` regenerated; `.changeset/triangle-graph.md`.
- Examples: `examples/triangle.json`, `triangle-sas.json`, `triangle-asa.json`, `triangle-vertices.json`; `examples/invalid/triangle-ambiguous.json`, `triangle-inequality.json`.
- Tests: `tests/layout/triangle.test.ts` (new, 26 cases); `tests/core/triangle.test.ts` and `tests/core/definitions.test.ts` switched to the registered triangle; `tests/core/describe.test.ts` "not registered" moved to the cube; `tests/react/Graph.test.tsx` and `tests/package/per-type-bundle.test.ts` extended.
- `.gener8v/specifications/geometric-shapes-and-solids.md`: `@spec Coverage` rows for GSS-REQ-020..022 and the triangle's locations on 030..036.

## Verification Run

Run in the main session on 2026-10-29, after the code was written.

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm generate` | 0 | stable |
| `pnpm lint` / `pnpm typecheck` | 0 / 0 | — |
| `npx vitest run --no-cache` ×3 | 0, 0, 0 | 1,889 passed each (1,827 before) |
| `pnpm bench` | 0 | 17 passed |
| `pnpm build` | 0 | — |
| `pnpm check:dist` / `check:deps` / `check:images` / `check:changesets` | 0 / 0 / 0 / 0 | — |
| `pnpm size` | 0 | `./triangle` 22.3 kB of 25; `./square` 17.43 kB; `./circle` 17.87 kB; `./core` 31.36 kB of 40 |
| `pnpm publint` / `pnpm attw` | 0 / 0 | — |
| `pnpm audit` / `pnpm audit --prod` | 0 / 0 | No known vulnerabilities found |
| Mutation checks (`tests/layout/triangle.test.ts`, `tests/core/triangle.test.ts`) | — | caught: base side always a (6 fail), right angle only at exactly 90° (2), y not flipped (10), third vertex below the base (7), base side drawn 5% long (6) |
| `gener8v-state.py state` / `lint` | 0 / 0 | 0 errors, 0 warnings |

## Acceptance Criteria Verification

- [x] Sides/angles: first-named side horizontal at the bottom, remaining vertex above, identical every render — `tests/layout/triangle.test.ts` orientation and determinism cases; base-side and below-base mutants fail them.
- [x] Vertices: relative positions kept, not mirrored, scaled to fit — layout tests on clockwise and counter-clockwise vertex orders; the no-flip mutant fails 10 tests.
- [x] Side (value and unit or custom text), angle (degrees) and vertex-name labels — layout and core label tests.
- [x] An angle within tolerance of 90° gets a right-angle mark instead of an arc — layout tests; the exact-90° mutant fails them.
- [x] The thin triangle 1, 100, 100.5 drawn to scale with no label overlaps (estimated boxes) — layout overlap test, plus a 0.02° needle with finite coordinates and the fast-check overlap property.
- [x] Text alternative names the triangle and states each shown side, angle and vertex name — core `describe` tests and the layout's text-alternative case.
- [x] `TriangleGraph`, `./triangle` entry, size-limit entry and examples (one per determining set); Scene numbers through `fmt()` — `checkScene` in every layout test, `tests/package/per-type-bundle.test.ts`, `pnpm size`, `tests/core/schema-agreement.test.ts` over `examples/triangle.json`, example validation tests.

## Decisions Made

### DEL-001: `labelSides` is the square's term, shared

**Context:** The plan made `labelSides` a boolean, but the square defines `labelSides: "one" | "all"`, and GSV-REQ-015 allows one definition per term.
**Decision:** `labelSidesProperty` in `src/core/definitions/figure.ts`, shared by identity. For a triangle, `"one"` labels the side it stands on (side a for a vertex-given triangle), `"all"` all three. The shared description covers both figures, so the square's published text changed (patch changeset). `labelAngles` stays a boolean.
**Ticket Impact:** Deviates from the plan's boolean; the square's generated vocabulary and schema text changed.

### DEL-002: `agrees` shared from `figure.ts`

**Decision:** The circle's `agrees` check moved to `figure.ts` as a generic `agrees<D>()`; the circle and the triangle use it. Angle custom text with an explicit `labelAngles: false` is a `contradiction` at the text term (the circle's rule). Side custom text alone labels its side and nothing contradicts it (the square's rule, since `labelSides` has no `false`).

### DEL-003: The base side and the display helper

**Decision:** `triangleDisplay(triangle, provenance)` is shared by `describe` and the layout. The base side is the first side in the order a, b, c whose provenance is `supplied` (a checked extra side counts), else side a; a vertex-given triangle uses side a for `"one"`. Its ends run counter-clockwise (a: B→C, b: C→A, c: A→B), so the third vertex is above.

### DEL-004: Right angles and blank angle labels

**Decision:** `isRightAngle(d) = withinTolerance(d, 90)` (89.1° to 90.9°), only for a shown angle; a blank custom text counts as shown and still draws its arc, as a place to fill in.

### DEL-005: Geometry and placement

**Decision:** Scaled to fit 240 × 200 by bounding box (`fitScale` ignores a zero dimension); vertex-given (x, y) → (centerX + (x − midX)·s, top + (maxY − y)·s); the base case uses only cos and sin. Arc radius min(20, 0.4 × the shorter adjacent side, 0.8 × the vertex's guarded distance to the opposite side), polylines in pieces of at most 15°; right-angle mark min(12, 0.4 × shorter side, 0.6 × that distance). Labels are placed vertex names first, then sides (along the outward normal at 0.5, 0.35, 0.65, 0.2, 0.8), then angles (along the interior bisector, centers inside the triangle); unplaced labels stacked below (GSS TICKET-002 DEL-006).

### DEL-006: Text alternative wording

**Decision:** "All three sides are labeled with their lengths." / "Sides a and b are labeled with their lengths." / "Side c is labeled “x”." / "The angle A label is left blank." / "Angle C is marked as a right angle."; every value is still stated.

## Deviations from Plan

- `labelSides` shared with the square as an enum, not a boolean (DEL-001); the square's published `labelSides` text changed.
- `agrees` moved from `circle.ts` to `figure.ts` (DEL-002); `circle.ts` and `square.ts` changed, outside the Output.
- `vertexNames` item descriptions completed ("at most 200 characters", stacking, cut, blank), which `tests/core/validate-structure.test.ts` requires once the triangle is registered.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| GSS-REQ-020 | `src/core/definitions/triangle.ts`:triangleDisplay, triangle, defineTriangle, describe; `src/core/definitions/figure.ts`:labelSides, agrees; `src/layout/triangle.ts`:triangleLayout | `@spec GSS-REQ-020, …` |
| GSS-REQ-021 | `src/core/definitions/triangle.ts`:isRightAngle, triangleDisplay; `src/layout/triangle.ts`:triangleLayout | `@spec GSS-REQ-021, …` |
| GSS-REQ-022 | `src/core/definitions/triangle.ts`:triangleDisplay; `src/layout/triangle.ts`:triangleLayout, modelVertices, SIDE_ENDS | `@spec GSS-REQ-022, …` |
| GSS-REQ-030, GSS-REQ-031 | `src/layout/triangle.ts`:fitScale | `@spec GSS-REQ-030, GSS-REQ-031` |

## Notes

- On a needle triangle, angle labels and the labels of nearly coincident sides often have no room and are stacked below; a stacked label shows its value alone (for example "0.02°") without naming its angle. That is the existing stacking rule (GSS TICKET-002 DEL-006).
- The per-type bundle test does not assert "A circle" absent from the built `./triangle` (the known circle leak); it does assert the x,y graph's own text and every other type absent.

## Post-Review Amendments

None
