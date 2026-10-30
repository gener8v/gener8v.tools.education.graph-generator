# TICKET-007: Cylinder graph type — Delivery Record

## Ticket Reference

**Ticket:** graph-library/geometric-shapes-and-solids/TICKET-007
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/geometric-shapes-and-solids.md`
**Requirements Covered:**
- GSS-REQ-026: Draw a cylinder from radius and height so it reads as 3D
- GSS-REQ-027: Accept a diameter in place of a radius
- GSS-REQ-028: Hidden half of the base dashed by default, optionally omitted
- GSS-REQ-029: Optionally draw and label radius or diameter on the top face, and height along the side

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Predecessors TICKET-001 (isometric kit) and TICKET-002 (circle) delivered | delivery records | both Delivered and reviewed (Approved); `main` at `8189d40` | ✅ |
| `isoEllipse`, `ISO_SCALE`, `isometric`, `HIDDEN_DASH` | `src/layout/kit/isometric.ts` | present | ✅ |
| Radius/diameter derivation pattern | `src/core/definitions/circle.ts` | a three-member group (radius, diameter, circumference) with agreeing limits | ✅ — the cylinder's group is radius and diameter |
| The terms `radius`, `diameter`, `showRadius`, `showDiameter`, `labelRadius`, `labelDiameter`, `radiusLabelText`, `diameterLabelText` | free for the cylinder | defined by the circle, with circle-only descriptions; GSV-REQ-015 allows one definition per term (`consistencyProblems`) | ⚠️ Shapes the plan — shared terms (Engineer decision) |
| `path` arcs in the Scene | `d` with `fmt()` numbers | allowed (`src/layout/scene.ts`, `check.ts`) | ✅ |
| Measurement labels and figure kit | `measurementLabel`, `placeLabels` (`stackedText`), `segmentNode`, vec kit | present | ✅ |
| Tests that use the cylinder as an unregistered type | moved | `tests/core/describe.test.ts:40`, `tests/core/validate-envelope.test.ts:68`, `tests/package/per-type-bundle.test.ts` `OTHER_TYPE = "cylinder"`; the cylinder is the last unregistered graph type | ⚠️ They move to a key outside `GRAPH_TYPES` (Known Hazard) |
| Carried: GSS TICKET-001 CR-003 (radius along a projected axis, never across the page; never divide `rx`/`ry` by `ISO_SCALE`) | honoured | — | 🔁 Carried |
| Carried: GSS TICKET-001 SEC-002 (scale before projecting; test at the limits) | honoured | — | 🔁 Carried |
| Carried: definition contract, derivation-group rules, domain checks, rich example + `pnpm generate`, provenance, measurement labels, caller text, per-type bundles, registration checklist | honoured | — | 🔁 Carried |

**Resolved from ground truth (not escalated):**
- *The radius's direction.* Along a projected horizontal axis on the top face (Known Hazard), documented as the cylinder's "otherwise documented" direction.

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-10-29
**Implemented by:** opus · high — routed as deliver-large from Tower

### Planned Files

- `src/core/definitions/figure.ts`: the shared radius terms — `radius`, `diameter`, `showRadius`, `showDiameter`, `labelRadius`, `labelDiameter`, `radiusLabelText`, `diameterLabelText` — moved from the circle with figure-neutral wording ("the radius of a circle, or of a cylinder's base"), shared by identity by the circle and the cylinder (Engineer decision, 2026-10-29). Ranges unchanged (radius 0.001 to 1,000,000; diameter 0.002 to 2,000,000). `src/core/definitions/circle.ts` uses them; its published wording changes, its behaviour does not (patch changeset).
- `src/core/definitions/cylinder.ts` (new): `/* @__PURE__ */ defineCylinder()` — a radius/diameter derivation group (one required, 1%); `height` (required, 0.001 to 1,000,000); `hiddenBase` (`"dashed"`, the default, or `"omitted"`); `labelHeight`, `heightLabelText`; shared `unitProperty`; `title` and `lineColor` from `propertiesOf`. The circle's `agrees` consistency checks (label text implies labeled; a labeled radius is drawn). `describe(cylinder, provenance)` names a cylinder and states radius and height, and the diameter when shown.
- `src/layout/cylinder.ts` (new): `cylinderLayout` — upright, shared isometric view; top `ellipse`, two side lines, base as two `path` arcs (front solid, back dashed or omitted); scaled to fit by bounding box (very tall or wide keep proportions), values scaled to drawing units before projecting; radius on the top face along a projected axis (from the center toward the lower right), the diameter along the other axis when both are drawn; both share the height's scale. Height labeled along the right side line. Labels with `placeLabels`; stacked labels read "r = …", "d = …", "h = …".
- Registration as for the cube: `src/core/definitions/index.ts`, `src/layout/registry.ts`, `src/index.ts`, `src/react/graphs/CylinderGraph.tsx`, `src/entries/cylinder.ts`, `tsup.config.ts`, `package.json` (`./cylinder`), `.size-limit.json` (25 kB); `pnpm generate`; `.changeset/cylinder-graph.md`.
- Examples: `examples/cylinder.json`, `examples/invalid/cylinder-missing-height.json`.
- `tests/core/cylinder.test.ts` (new): a diameter derives the radius; disagreeing radius and diameter → `contradiction`; missing height → `missing_property`; zero and negative → `out_of_range`.
- `tests/layout/cylinder.test.ts` (new): front base half solid and back dashed, or absent when omitted; labels; drawn radius : height within 1% along projected axes for the example, a very tall and a very wide cylinder; text alternative; `checkScene`; the 1,000,000 limit; no label overlaps.
- Extended: `tests/react/Graph.test.tsx` (at-limit, over-limit, size ceiling with emoji inputs), `tests/package/per-type-bundle.test.ts` (exclusions; `OTHER_TYPE` moved to a key outside `GRAPH_TYPES`), `tests/core/definitions.test.ts`; `tests/core/describe.test.ts` and `tests/core/validate-envelope.test.ts` use a type that does not exist (`"hexagon"`).
- `.gener8v/specifications/geometric-shapes-and-solids.md`: `@spec Coverage` rows.

### How Acceptance Criteria Will Be Met

- `{ "type": "cylinder", "radius": 2, "height": 5 }` → top ellipse, two side lines, front base half solid, back half dashed — layout tests on node kinds and dash attributes.
- A diameter validates and derives the radius; both disagreeing → `contradiction`; missing height → `missing_property` — derivation group and `required`; core tests.
- Hidden base omitted → back half not drawn — `hiddenBase`; layout test.
- Radius (or diameter) drawn and labeled on the top face, height along the side, as measurement labels — layout label tests.
- Drawn radius : height within 1% along projected axes, for the example, very tall and very wide — layout proportion tests.
- Text alternative names a cylinder and states each shown measurement — core and layout tests.
- `CylinderGraph`, `./cylinder`, size-limit entry, example; Scene numbers through `fmt()` — registration, `checkScene`, per-type bundle test, `pnpm size`.

## Progress

- [x] Shared radius terms in `src/core/definitions/figure.ts`, circle switched
- [x] `src/core/definitions/cylinder.ts`
- [x] `src/layout/cylinder.ts`
- [x] Registration files, `pnpm generate`, changeset
- [x] Examples
- [x] `tests/core/cylinder.test.ts`
- [x] `tests/layout/cylinder.test.ts`
- [x] Extended and moved tests (Graph, per-type bundle, definitions, describe, validate-envelope)
- [x] `@spec Coverage` rows

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/core/definitions/figure.ts`: `radiusProperties` — the eight shared radius/diameter specs, frozen and shared by identity — and `measurementLabelText(term, measured)` (the label-text description style).
- `src/core/definitions/circle.ts`: uses the shared specs, listed in its original property order; behaviour and Scenes unchanged.
- `src/core/definitions/cylinder.ts` (new): `Cylinder`, `cylinderDisplay`, `/* @__PURE__ */ defineCylinder()` — radius/diameter group, `height`, `hiddenBase`, `labelHeight`, `heightLabelText`, shared `unit`; `agrees` checks; `describe`.
- `src/layout/cylinder.ts` (new): `cylinderLayout`, `cylinderScale`, `FIT_WIDTH` (220) × `FIT_HEIGHT` (260).
- `src/react/graphs/CylinderGraph.tsx`, `src/entries/cylinder.ts` (new); registration in `src/core/definitions/index.ts`, `src/layout/registry.ts`, `src/index.ts`, `tsup.config.ts`, `package.json` (`./cylinder`), `.size-limit.json`; `src/generated/*` regenerated; `.changeset/cylinder-graph.md`.
- `examples/cylinder.json`, `examples/invalid/cylinder-missing-height.json` (new).
- `tests/core/cylinder.test.ts` (41), `tests/layout/cylinder.test.ts` (34) (new); `tests/react/Graph.test.tsx` (at-limit, over-limit, size ceiling), `tests/package/per-type-bundle.test.ts` (`OTHER_TYPE` → `"not-a-graph-type"`; cylinder exclusions), `tests/core/definitions.test.ts`, `tests/core/describe.test.ts` (unregistered check → `"hexagon"`).
- `.gener8v/specifications/geometric-shapes-and-solids.md`: `@spec Coverage` rows for GSS-REQ-026..029; the cylinder added to 030..036.

## Verification Run

Run in the main session on 2026-10-29, after the code was written.

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm generate` | 0 | stable |
| `pnpm lint` / `pnpm typecheck` | 0 / 0 | — |
| `npx vitest run --no-cache` ×3 | 0, 0, 0 | 2,038 passed each (1,952 before) |
| `pnpm bench` | 0 | 19 passed |
| `pnpm build` | 0 | — |
| `pnpm check:dist` / `check:deps` / `check:images` / `check:changesets` | 0 / 0 / 0 / 0 | — |
| `pnpm size` | 0 | `./cylinder` 18.98 kB of 25 |
| `pnpm publint` / `pnpm attw` | 0 / 0 | — |
| `pnpm audit` / `pnpm audit --prod` | 0 / 0 | No known vulnerabilities found |
| Circle identity probe (150 circle descriptions, this branch against a `main` worktree) | 0 | identical SHA-256 `f360acd2…930f6` |
| Mutation checks (`tests/layout/cylinder.test.ts`, `tests/core/cylinder.test.ts`) | — | caught: back half not dashed (1 fails), `"omitted"` ignored (3), radius drawn 5% long (6), fit computed without `ISO_SCALE` (3) |
| `gener8v-state.py state` / `lint` | 0 / 0 | 0 errors, 0 warnings |

## Acceptance Criteria Verification

- [x] `{ "type": "cylinder", "radius": 2, "height": 5 }` → top ellipse, two side lines, front base half solid, back half dashed — layout node-kind and dash tests; the no-dash mutant fails them.
- [x] A diameter validates and derives the radius; disagreeing → `contradiction`; missing height → `missing_property` — `tests/core/cylinder.test.ts`; the invalid example.
- [x] Hidden base omitted → back half not drawn — layout test; the ignored-`omitted` mutant fails it.
- [x] Radius (or diameter) drawn and labeled on the top face, height along the side, as measurement labels — layout label tests.
- [x] Drawn radius : height within 1% along projected axes, for the example, a very tall (1 × 100) and a very wide (50 × 1) cylinder, plus a property over ratios 0.02 to 50 — layout proportion tests; the radius-length mutant fails them. At 0.001 × 1,000,000 the radius draws at about 3 × 10⁻⁷ units and rounds to 0, so no ratio is measurable there; those limits are covered by fit and not-`internal_error` tests.
- [x] Text alternative names a cylinder and states each shown measurement — core describe tests.
- [x] `CylinderGraph`, `./cylinder`, size-limit entry, example; Scene numbers through `fmt()` — `checkScene`, the per-type bundle test, `pnpm size`, schema agreement over `examples/cylinder.json`.

## Decisions Made

### DEL-001: Shared radius terms (Engineer decision, 2026-10-29)

**Decision:** `radius`, `diameter`, `showRadius`, `showDiameter`, `labelRadius`, `labelDiameter`, `radiusLabelText`, `diameterLabelText` are `radiusProperties` in `figure.ts`, shared by identity by the circle and the cylinder, with figure-neutral wording; for example showRadius: "on a circle, from the center horizontally to the right; on a cylinder, on its top face, from the center toward the lower right." Ranges unchanged. The circle's published wording changed (patch changeset); its Scenes did not.

### DEL-002: Fit and geometry

**Decision:** Scaled from the measurements before projecting: `cylinderScale(r, h) = min(220 / 2r, 260 / (h·ISO_SCALE + 2r·ELLIPSE_RATIO))`, centered, one line of label room above the top ellipse. The hidden half of the base is the half above its center on the page, drawn first as a dashed `path` arc; the front half solid. Radius from `at(0,0,h)` to `at(0,r,h)` (toward the lower right); the diameter along x when the radius is drawn too, else along y. At extreme proportions the drawing degenerates (an `rx` of 0, or side lines of length 0) but every coordinate is finite and every Scene passes `checkScene`.

### DEL-003: Labels

**Decision:** The height label sits right of the right side line, outside the cylinder (t = 0.5, 0.4, 0.6, 0.3, 0.7), else stacked as "h = …"; radius and diameter labels on either side of their segment at two distances; stacked "r = …", "d = …". Obstacles: both ellipses (72 pieces each), side lines, radius and diameter segments.

### DEL-004: Terms and wording

**Decision:** `hiddenBase` is the cylinder's own term (not the cube's `hiddenEdges`). The text alternative says "Its hidden base is dashed." or "The hidden half of its base is not drawn.", then custom-text sentences in the order radius, diameter, height. `cylinderDisplay` reuses the circle's `MeasurementDisplay` type (type-only import). The bundle test's `OTHER_TYPE` is `"not-a-graph-type"`, cast `as never`.

## Deviations from Plan

- `tests/core/validate-envelope.test.ts` not changed: its test runs against a fixture registry without the cylinder, so `"cylinder"` there is still "declared but undefined", which is the test's point; `"hexagon"` would duplicate the existing `"pie"` case.
- The circle's shared specs are listed by name in its original order, not spread, so the schema and issue order are unchanged.
- Ratio tests use 1 × 100 and 50 × 1 for "very tall" and "very wide" (see Acceptance Criteria).
- The size ceiling varies the measurements as well as the texts.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| GSS-REQ-026 | `src/core/definitions/cylinder.ts`:cylinder, defineCylinder; `src/layout/cylinder.ts`:cylinderLayout; `src/react/graphs/CylinderGraph.tsx`:CylinderGraph | `@spec GSS-REQ-026, …` |
| GSS-REQ-027 | `src/core/definitions/cylinder.ts`:defineCylinder (derivation group); `src/core/definitions/figure.ts`:radiusProperties | `@spec GSS-REQ-027, …` |
| GSS-REQ-028 | `src/core/definitions/cylinder.ts`:cylinderDisplay; `src/layout/cylinder.ts`:cylinderLayout | `@spec GSS-REQ-028, …` |
| GSS-REQ-029 | `src/core/definitions/cylinder.ts`:cylinderDisplay, describe; `src/layout/cylinder.ts`:cylinderLayout | `@spec GSS-REQ-029, …` |
| GSS-REQ-030..036 | `src/layout/cylinder.ts`:cylinderScale, cylinderLayout; `src/core/definitions/cylinder.ts`:describe | (cylinder locations added to the coverage rows) |

## Notes

- Measured size ceiling (2026-10-29): at most a 1,985-character text alternative, 18,731 characters of markup, 15 `<text>` nodes and a height of 582.73; pinned at 2,200, 22,000, 15 and 650.
- Known problem, as for the other figures: "A circle" is not asserted absent from the built `./cylinder` bundle.
- The implementing subagent tried `git checkout` on `tests/core/validate-envelope.test.ts` to undo an edit; the permission system denied it, and it reverted the line by hand. The file is identical to `main`.
- Every graph type in `GRAPH_TYPES` is now registered.

## Post-Review Amendments

### graph-library/geometric-shapes-and-solids-ticket-007-code-review — CR-001 dismissed; an unexplained property failure

**Change:** None to code. CR-001 (degenerate drawing at extreme proportions) was dismissed: drawn to scale is correct under GSS-REQ-030 (Engineer — Thomas Eaves, 2026-10-29).
**Note:** The code reviewer's first full vitest run had one fast-check property failure whose output was not kept (test, seed and counterexample unknown). It did not recur in 9 further full runs, 38 runs of the cylinder tests or 15 runs of all 22 fast-check test files. It is recorded as unexplained and unreproduced, not as the known timing flake.
**Re-verification:** not needed for a dismissal; the fast-check hunt above all passed.
