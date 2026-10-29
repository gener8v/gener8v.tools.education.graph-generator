# TICKET-006: Cube graph type — Quality Review

## Summary

Reviewed the cube definition, layout, isometric-kit addition, registration files and tests delivered in `d3e998e`. Quality is high: the definition and layout follow the triangle's structure, the caller's edge length never reaches `isometric()`, and the tests are behavioural and mutation-checked. Three findings, none blocking: 0 Critical, 0 Concerns, 3 Suggestions (duplication with the triangle layout, a duplicated dash constant, nested ternaries).

**Files Reviewed:**
- `src/core/definitions/cube.ts`
- `src/layout/cube.ts`
- `src/layout/kit/isometric.ts`
- `src/react/graphs/CubeGraph.tsx`, `src/entries/cube.ts`
- `tests/core/cube.test.ts`, `tests/layout/cube.test.ts`
- `tests/react/Graph.test.tsx`, `tests/package/per-type-bundle.test.ts`, `tests/core/definitions.test.ts` (cube additions)
- Neighbours: `src/layout/triangle.ts`, `src/layout/square.ts`, `src/layout/xyz-graph.ts`

**Findings:** 3
**Critical:** 0 | **Concerns:** 0 | **Suggestions:** 3

## Quality Assessment

### Code Organization

**Rating:** Strong
**Notes:** Definition (`src/core/definitions/cube.ts`) and layout (`src/layout/cube.ts`) are separated as in the square and triangle; `cubeDisplay` is the one rule shared by `describe` and the layout. `CUBE_EDGES` is derived from `faceVisible` rather than hand-listed. Dependency direction is correct (layout imports core, never the reverse). The only blemish is helper duplication (QR-001).

### Readability

**Rating:** Strong
**Notes:** Names and doc comments state intent and cite requirements. `layout/cube.ts` `cubeLayout` is long (about 70 lines) but reads linearly: hidden edges, visible edges, labels. A few nested ternaries (`cornerOf`, `faceNormal`, `cubeEdges`, `cubeDisplay`) cost a re-read (QR-003).

### Error Handling

**Rating:** Strong
**Notes:** Domain bounds are declared on the property (0.001 to 1,000,000) and produce `out_of_range`; scaling before projection removes the overflow path; unplaceable labels fall back to a stacked label rather than failing. `normalsOf` divides by the edge length, which cannot be zero for the fixed unit-cube edges.

### Test Coverage

**Rating:** Strong
**Notes:** Executed in this review: `pnpm lint` exit 0; `pnpm typecheck` exit 0; `npx vitest run --no-cache` exit 0, 67 files, 1,951 tests passed. Tests cover edge counts (9 solid, 3 dashed, 9 when omitted), equal projected edges (property test), the hexagon centre, both label modes, custom and blank text, stacking, the ellipsis cut, no label/edge overlap, `fmt()`/`checkScene`, determinism, the 1,000,000 limit through `createGraph`, and core out-of-range cases. They assert behaviour, not internals, and the delivery's mutation checks back that up.

### Observability & Operability

**Rating:** Adequate
**Notes:** Pure functions with no logging, as with every other layout in the library. Failures surface as typed validation errors (`out_of_range`) naming the property, and the text alternative states the drawing choices (hidden-edge style, which edges are labeled). Nothing further is warranted.

## Findings

### QR-001: Vector helpers and label-placement geometry copied verbatim from the triangle layout

**Category:** DRY
**Severity:** Suggestion
**Location:** `src/layout/cube.ts:92` (`add`, `sub`, `times`, `dot`, `reach`, `besidePoint`); originals at `src/layout/triangle.ts:38` and `src/layout/triangle.ts:89`
**Description:** Six helpers are identical in `triangle.ts` and `cube.ts`, including `besidePoint` and `reach`, whose doc comments are copied too. This is actual duplication, not coincidental similarity.
**Impact:** A fix to the label geometry (for example how `reach` handles a non-unit direction) has to be made in two places and can drift. The next figure with edge labels (cylinder, prism) would be a third copy.
**Recommendation:** Move the 2D vector helpers and `besidePoint`/`reach` into `src/layout/kit/figure-labels.ts` (which already owns `GAP`, `LabelSize`, `Point`) and import them in both layouts. Do it before the next figure copies them, or as part of that ticket.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-29). The plane-vector helpers (`Vec`, `add`, `sub`, `times`, `dot`, `cross`, `length`, `rotate`, `unit`) are in `src/layout/kit/vec.ts`, and `besidePoint` (with `reach`) in `src/layout/kit/figure-labels.ts`; the triangle and the cube both import them and keep no copies. A probe of 1,208 cube, triangle, x,y,z, square and circle Scenes hashes identically before and after.

---

### QR-002: `HIDDEN_DASH` repeats the value of `GUIDE_DASH`

**Category:** Maintainability
**Severity:** Suggestion
**Location:** `src/layout/kit/isometric.ts:73` (`HIDDEN_DASH`); `src/layout/xyz-graph.ts` (`GUIDE_DASH`)
**Description:** The doc comment says the pattern is "the same as the x,y,z graph's guide lines", but the value `"4 3"` is written twice, so nothing keeps them equal. The delivery chose this deliberately so the cube bundle imports nothing from the x,y,z layout (DEL-003).
**Impact:** If one is retuned the dashed lines in the solids' viewpoint stop reading alike. Low, because the dependency reason is sound.
**Recommendation:** Have `xyz-graph.ts` import `HIDDEN_DASH` from the kit (the kit is already shared) or rename it to a neutral `DASH` in the kit and use it in both, so one constant holds the value.
**Status:** Resolved
**Resolution:** Fixed with code review CR-001 (`6de56bd`): the x,y,z graph's `GUIDE_DASH` is the isometric kit's `HIDDEN_DASH`.

---

### QR-003: Nested ternaries in corner, normal and label-count selection

**Category:** Readability
**Severity:** Suggestion
**Location:** `src/layout/cube.ts:44` (`cornerOf`), `src/layout/cube.ts:47` (`faceNormal`), `src/layout/cube.ts:56` (`cubeEdges`); `src/core/definitions/cube.ts:41` (`cubeDisplay`)
**Description:** Three-way ternaries chain on `axis` or `labelEdges` and need several reads to parse. `cubeDisplay`'s `labeled` mixes `"three"`, `"one"` and the custom-text fallback in one expression.
**Impact:** Small; the code is correct and tested, but it is the densest part of the delivery for someone debugging the edge table or label count at 2am.
**Recommendation:** Use a small lookup (`const PERPENDICULAR = [[1, 2], [0, 2], [0, 1]]`) in `cubeEdges`, and an `if` ladder in `cubeDisplay` (`if (labelEdges === "three") return 3; if (labelEdges === "one" || customText !== undefined) return 1; return 0;`).
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-29). `cornerOf` and `faceNormal` set the axis by index, with an `OTHER_AXES` lookup also used by `cubeEdges`; the labeled edges come from a `LABELED_EDGES` lookup; `cubeDisplay` uses an `if` chain. Scenes unchanged (same probe).

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fix | Vector helpers to `src/layout/kit/vec.ts`, `besidePoint` to the figure kit | `src/layout/kit/vec.ts`, `src/layout/kit/figure-labels.ts`, `src/layout/triangle.ts`, `src/layout/cube.ts` |
| QR-002 | Fix (with CR-001) | One dash constant | `src/layout/xyz-graph.ts`, `src/layout/kit/isometric.ts` |
| QR-003 | Fix | Lookups and an `if` chain for the nested ternaries | `src/layout/cube.ts`, `src/core/definitions/cube.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** None
