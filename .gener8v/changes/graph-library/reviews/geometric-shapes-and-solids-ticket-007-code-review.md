# TICKET-007: Cylinder graph type — Code Review

## Summary

Reviewed the delivery of the `cylinder` type (definition, layout, component, entry, examples, tests, shared radius terms moved to `figure.ts`) against TICKET-007, GSS-REQ-026..029 (and 030..036 as they apply), TC-010 and AD-008/AD-009. Every acceptance criterion and requirement is satisfied and the Verification Run reproduces; one Observation about degenerate drawings at the extreme limits.

**Delivery Record:** `.gener8v/changes/graph-library/delivery/geometric-shapes-and-solids-ticket-007-delivery.md`
**Files Reviewed:**
- `src/core/definitions/cylinder.ts`
- `src/core/definitions/figure.ts`
- `src/core/definitions/circle.ts`
- `src/layout/cylinder.ts`
- `src/react/graphs/CylinderGraph.tsx`
- `src/entries/cylinder.ts`
- `examples/cylinder.json`
- `examples/invalid/cylinder-missing-height.json`
- `tests/core/cylinder.test.ts`
- `tests/layout/cylinder.test.ts`
- `tests/react/Graph.test.tsx`
- `tests/package/per-type-bundle.test.ts`
- `.size-limit.json`, `package.json`, `tsup.config.ts`, `.changeset/cylinder-graph.md`
- `.gener8v/specifications/geometric-shapes-and-solids.md`

**Findings:** 1
**Critical:** 0 | **Issues:** 0 | **Observations:** 1

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| `{ radius: 2, height: 5 }` renders top ellipse, two side lines, front base half solid, back half dashed | Yes | `src/layout/cylinder.ts` `cylinderLayout`; probe output: dashed `path`, solid `path`, two `line`, one `ellipse`; `tests/layout/cylinder.test.ts` |
| `diameter` derives the radius; disagreeing gives `contradiction`; missing height gives `missing_property` | Yes | `src/core/definitions/cylinder.ts` derivation group and `height.required`; `tests/core/cylinder.test.ts`; `examples/invalid/cylinder-missing-height.json` |
| With hidden base omitted the back half is not drawn | Yes | `cylinderLayout` `if (shown.hiddenDashed)`; probe with `hiddenBase: "omitted"` draws one path |
| Radius or diameter drawn and labeled on the top face, height along the side, with measurement labels | Yes | `cylinderLayout` (segments `at(0,0,h)` to `at(0,r,h)`; `measurementLabel`; `placeLabels`) |
| Drawn radius : height within 1% along projected axes (example, tall, wide) | Yes | Probe: radius segment 66.4 vs side 166.06 = 0.400 for r 2, h 5; end point on the ellipse; layout proportion tests. Limits where the radius rounds to 0 are covered by fit tests (see CR-001) |
| Text alternative names a cylinder and states each shown measurement | Yes | `describe`; probe: "A cylinder with radius 2 cm, diameter 4 cm and height 5 cm. …" |
| `CylinderGraph`, `./cylinder`, size-limit, example; Scene numbers through `fmt()` | Yes | `CylinderGraph.tsx`, `src/entries/cylinder.ts`, `package.json`, `.size-limit.json`, `tsup.config.ts`; `fmt()` on every coordinate |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| GSS-REQ-026 | Cylinder from radius and height reads as 3D | `src/layout/cylinder.ts`:cylinderLayout; `src/core/definitions/cylinder.ts`:cylinder | Yes |
| GSS-REQ-027 | Diameter in place of radius | `src/core/definitions/cylinder.ts`:defineCylinder (derivation group) | Yes |
| GSS-REQ-028 | Hidden base dashed or omitted | `src/core/definitions/cylinder.ts`:cylinderDisplay, `hiddenBase`; `src/layout/cylinder.ts`:cylinderLayout | Yes |
| GSS-REQ-029 | Radius or diameter on the top face, height along the side | `src/layout/cylinder.ts`:cylinderLayout | Yes |

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| TC-010 | Fixed projection; analytically determined hidden lines | Yes | Shared `isometric`/`isoEllipse`; back half is the upper arc of the base, drawn as a separate dashed `path` |
| GSV-REQ-052/053 (caller text limits) | Text caps and bounded markup | Yes | Limits on all string terms; at-limit, over-limit and size-ceiling tests in `tests/react/Graph.test.tsx` |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-008 | No clip paths or ids | Yes | Two `path` arcs, no `clipPath`/`id` |
| AD-009 | Compare along projected axes, never divide `rx`/`ry` by `ISO_SCALE` | Yes | Radius drawn from `at(0,0,h)` to `at(0,r,h)`; scale computed from measurements (`cylinderScale`) |
| AD-002 / AD-007 / AD-010 | Layout contract, rounded once, label placement | Yes | `Layout<Cylinder>` with provenance; `at()` rounds once; `placeLabels` with obstacles |
| AD-001 | Per-type entry, `/* @__PURE__ */` factory | Yes | `defineCylinder()` marked pure; bundle tests |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| GSS-REQ-026 | `@spec GSS-REQ-026` | `cylinder.ts`:cylinder, defineCylinder, describe; `layout/cylinder.ts`:cylinderLayout; `CylinderGraph.tsx`; `entries/cylinder.ts` | Yes |
| GSS-REQ-027 | `@spec GSS-REQ-027` | `cylinder.ts`:defineCylinder; `figure.ts` (radius terms) | Yes |
| GSS-REQ-028 | `@spec GSS-REQ-028` | `cylinder.ts`:cylinderDisplay, defineCylinder; `layout/cylinder.ts`:cylinderLayout | Yes |
| GSS-REQ-029 | `@spec GSS-REQ-029` | `cylinder.ts`:cylinderDisplay, defineCylinder; `layout/cylinder.ts`:cylinderLayout | Yes |

**Coverage:** 4 of 4 requirements annotated
**Missing:** None
**Specification table:** Yes — rows for GSS-REQ-026..029 and the cylinder in 030..036 match the code locations.

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm generate` | 0 (no tracked file changed) | Yes |
| `pnpm lint` / `pnpm typecheck` | 0 / 0 | Yes |
| `npx vitest run --no-cache` | 2,038 passed on 3 of 4 full runs; the first run had 1 failure in a fast-check property that did not reproduce in 3 further full runs or 8 runs of the two cylinder test files | Yes (flake, see Notes) |

Build, size, publint, attw, audit and bench commands were not re-run (the build is shared with the other reviewers).

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | Shared radius terms by identity satisfy GSV-REQ-015; circle Scenes verified identical by the record's probe; wording change published as a patch changeset |
| DEL-002 | Reasonable | Scale from ratios before projecting honours SEC-002; degeneration at extremes is noted (CR-001) |
| DEL-003 | Reasonable | Height label outside the right side, stacked fallback |
| DEL-004 | Reasonable | `hiddenBase` own term; `OTHER_TYPE` moved outside `GRAPH_TYPES` as the ticket instructed |

Deviations: the unchanged `tests/core/validate-envelope.test.ts` is sound (fixture registry); the other deviations are neutral.

## Findings

### CR-001: At the extreme limits the cylinder degenerates to lines or points

**Severity:** Observation
**Location:** `src/layout/cylinder.ts`:cylinderScale, cylinderLayout
**Traces To:** GSS Edge Cases ("Cylinder far taller than it is wide (or the reverse): drawn to scale within the drawing area"); GSS-REQ-031
**Description:** With radius 0.001 and height 1,000,000 the probe yields an ellipse with `rx=0 ry=0`, arcs `A 0 0 …` and a zero-length radius; with radius 1,000,000 and height 0.001 both side lines have zero length. Every coordinate is finite and `checkScene` passes, and the delivery record documents it (DEL-002), but the figure at the limits no longer reads as a cylinder. Proportion tests stop at ratios 0.02 to 50 (and 1 × 100, 50 × 1).
**Impact:** None for curriculum-sized input; a valid but extreme description draws a line or a flat ellipse, which is the honest to-scale result.
**Recommendation:** None required. Optionally state in the `height`/`radius` descriptions or the specification that extreme ratios draw degenerately.
**Status:** Dismissed
**Resolution:** Dismissed (Engineer — Thomas Eaves, 2026-10-29). Drawn to scale, a 0.001 × 1,000,000 cylinder is a line: a minimum drawn size would break GSS-REQ-030 (drawn lengths in the measurements' ratio). The Scene stays valid, every coordinate finite, and the delivery record documents it (DEL-002).

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Dismiss | Drawn to scale is correct (GSS-REQ-030); documented | — |

## Verdict

**Result:** Approved
**Unresolved Findings:** None
**Notes:** One fast-check property failed in the reviewer's first full vitest run; its output was not kept, so the test, seed and counterexample are unknown. The "known timing flake" attribution was withdrawn by the reviewer as unsupported. It did not recur in 9 further full runs, 38 runs of the cylinder tests and 15 runs of all 22 fast-check test files (main session, 2026-10-29): unexplained and unreproduced. No source file was changed by this review.
