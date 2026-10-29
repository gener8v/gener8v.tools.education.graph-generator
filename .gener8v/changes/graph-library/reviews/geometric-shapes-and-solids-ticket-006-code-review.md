# TICKET-006: Cube graph type — Code Review

## Summary

Reviewed the cube delivery (definition, isometric layout, component, entry, examples, tests) against GSS TICKET-006, GSS-REQ-023..025 and the carried hazards. Every acceptance criterion and requirement is satisfied and the re-runnable verification commands reproduce. One Observation: the dash pattern is duplicated rather than shared.

**Delivery Record:** .gener8v/changes/graph-library/delivery/geometric-shapes-and-solids-ticket-006-delivery.md
**Files Reviewed:**
- src/core/definitions/cube.ts
- src/layout/cube.ts
- src/layout/kit/isometric.ts
- src/react/graphs/CubeGraph.tsx
- src/entries/cube.ts
- examples/cube.json
- examples/invalid/cube-negative-edge.json
- tests/core/cube.test.ts
- tests/layout/cube.test.ts
- .gener8v/specifications/geometric-shapes-and-solids.md (`@spec Coverage`)

**Findings:** 1
**Critical:** 0 | **Issues:** 0 | **Observations:** 1

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| `{ "type": "cube", "edgeLength": 3 }` renders 9 solid and 3 dashed edges by default | Yes | `src/layout/cube.ts`:CUBE_EDGES (visibility from `faceVisible`), cubeLayout (dashed hidden edges); `tests/layout/cube.test.ts` counts |
| Hidden edges omitted: only 9 visible | Yes | `cubeDisplay.hiddenDashed`; probe with `hiddenEdges: "omitted"` drew no dashed lines |
| All 12 projected edges equal within 1% | Yes | `DRAWN_EDGE`/`MODEL_EDGE` through `isometric()`; fast-check property in `tests/layout/cube.test.ts` |
| Edge labels for one edge or the three front-corner edges, as measurement labels | Yes | `src/layout/cube.ts`:cubeLayout (`measurementLabel`, `placeLabels`, `FRONT_CORNER_EDGES`, `BOTTOM_RIGHT`); probes placed 3 labels / 1 label |
| Zero or negative edge length gives `out_of_range` | Yes | `src/core/definitions/cube.ts` `min: CUBE_EDGE_MIN`; `tests/core/cube.test.ts`; `examples/invalid/cube-negative-edge.json` |
| Text alternative names a cube and states the edge length | Yes | `src/core/definitions/cube.ts`:describe; probe output "A cube with edge length 3 cm. …" |
| `CubeGraph`, `./cube`, size-limit entry, example; Scene numbers through `fmt()` | Yes | `src/react/graphs/CubeGraph.tsx`, `src/entries/cube.ts`, `package.json`, `.size-limit.json`; `checkScene` in layout tests; `at()` rounds with `fmt` |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| GSS-REQ-023 | Cube from an edge length, reads as 3D | `src/layout/cube.ts`:cubeLayout; `src/core/definitions/cube.ts`:cube | Yes |
| GSS-REQ-024 | Hidden edges dashed by default, optionally omitted | `src/layout/cube.ts`:cubeLayout, CUBE_EDGES; `src/core/definitions/cube.ts`:cubeDisplay | Yes |
| GSS-REQ-025 | Label one edge or three edges at a corner | `src/layout/cube.ts`:cubeLayout; `src/core/definitions/cube.ts`:cubeDisplay | Yes |

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/TC-010 | Fixed projection, analytic hidden lines | Yes | `faceVisible` per edge; no depth buffer |
| GSS TICKET-001 CR-004 (carried) | Hidden edges are label obstacles | Yes | hidden segments pushed to `obstacles` when drawn |
| GSS TICKET-001 SEC-002 (carried) | Scale before projecting; test at limit | Yes | `MODEL_EDGE`; `createGraph` at 1,000,000 probed: valid, not `internal_error` |
| Carried caller-text rules (CALLER_TEXT_LIMIT, `maxLength`, `wrap`/`stackedText`, `stateMeasurement`) | Text bounds | Yes | `edgeLabelText` `maxLength`; `unitProperty` shared; `stateMeasurement` in describe |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-005 | `edgeLength` naming | Yes | property name |
| AD-009 | One isometric projection, hidden edges analytic | Yes | `isometric`, `faceVisible` |
| AD-011 | `stroke-dasharray` presentation attribute | Yes | `HIDDEN_DASH` attr on lines |
| AD-007 | Rounded Scene numbers | Yes | `fmt` in `at()` and height |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| GSS-REQ-023 | `@spec GSS-REQ-023` | cube.ts:cube, defineCube; layout/cube.ts:cubeLayout, CUBE_EDGES; CubeGraph.tsx | Yes |
| GSS-REQ-024 | `@spec GSS-REQ-024` | cube.ts:cubeDisplay, cube, defineCube; layout/cube.ts:cubeLayout, CUBE_EDGES; isometric.ts:HIDDEN_DASH | Yes |
| GSS-REQ-025 | `@spec GSS-REQ-025` | cube.ts:cubeDisplay, cube, defineCube; layout/cube.ts:cubeLayout | Yes |

**Coverage:** 3 of 3 requirements annotated
**Missing:** none
**Specification table:** Yes — rows 175..184 of the specification list the same locations (the delivery record's own table omits `src/entries/cube.ts` and `HIDDEN_DASH`, which the specification has).

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm generate` | 0 (no diff) | Yes |
| `pnpm lint` / `pnpm typecheck` | 0 / 0 | Yes |
| `npx vitest run --no-cache` | 0 (1,951 passed) | Yes |
| `gener8v-state.py lint` | 0 (0 errors, 0 warnings) | Yes |
| `pnpm bench`, `pnpm build`, `check:*`, `pnpm size`, `publint`, `attw`, `audit`, mutation checks | not re-run (build would rewrite `dist/` shared with the other reviewers) | Not reproduced; vitest rebuilt `dist/` during its run and passed |

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | Absent `hiddenEdges` is dashed; always stated in the text alternative |
| DEL-002 | Reasonable | Probes show 3 labels placed clear of edges; long text stacks |
| DEL-003 | Reasonable | Fixed `DRAWN_EDGE` meets GSS-REQ-031; the extra `HIDDEN_DASH` constant is the subject of CR-001 |
| DEL-004 | Reasonable | Wording matches probes |

## Findings

### CR-001: `HIDDEN_DASH` duplicates `GUIDE_DASH`

**Severity:** Observation
**Location:** src/layout/kit/isometric.ts:74; src/layout/xyz-graph.ts:24
**Traces To:** AD-011 (presentation-attribute dashes); GSS-REQ-024
**Description:** The same pattern `"4 3"` is defined twice. The comment says they are "the same pattern", but nothing keeps them equal.
**Impact:** The cube's hidden edges and the x,y,z guide lines could drift apart. No correctness impact today.
**Recommendation:** Have `xyz-graph.ts` import `HIDDEN_DASH` from the isometric kit (or alias it), or note in a test that they match.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-29). `HIDDEN_DASH` in `src/layout/kit/isometric.ts` is the one dash of the shared viewpoint; the x,y,z graph's `GUIDE_DASH` is now `HIDDEN_DASH`, so the two cannot drift. A probe of 1,208 cube, triangle, x,y,z, square and circle Scenes hashes identically before and after (SHA-256 `ca076ab9…89fa61`). The same point was raised as quality review QR-002.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Fix | `GUIDE_DASH` = the kit's `HIDDEN_DASH` | `src/layout/xyz-graph.ts`, `src/layout/kit/isometric.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** None
**Notes:** Provisional (findings phase). Bench, build, size and audit commands were not re-run here to avoid rewriting `dist/` during parallel review.
