# TICKET-005: Triangle layout and labels — Code Review

## Summary

Reviewed the delivery of GSS TICKET-005 (commit `410f82b`): the triangle layout, label terms, right-angle marks, registration, examples and tests. All seven acceptance criteria and GSS-REQ-020..022 are satisfied, the Verification Run reproduces, and `@spec` annotations and the specification's coverage table agree. Two Observation-level findings, none blocking.

**Delivery Record:** `.gener8v/changes/graph-library/delivery/geometric-shapes-and-solids-ticket-005-delivery.md`
**Files Reviewed:**
- `src/layout/triangle.ts`
- `src/core/definitions/triangle.ts`
- `src/core/definitions/figure.ts`
- `src/core/definitions/square.ts`
- `src/core/definitions/circle.ts`
- `src/react/graphs/TriangleGraph.tsx`
- `src/entries/triangle.ts`
- `src/core/definitions/index.ts`, `src/layout/registry.ts`, `src/index.ts`, `tsup.config.ts`, `package.json`, `.size-limit.json`
- `examples/triangle.json`, `examples/triangle-sas.json`, `examples/triangle-asa.json`, `examples/triangle-vertices.json`, `examples/invalid/triangle-ambiguous.json`, `examples/invalid/triangle-inequality.json`
- `tests/layout/triangle.test.ts`, `tests/core/triangle.test.ts`, `tests/core/definitions.test.ts`, `tests/core/describe.test.ts`, `tests/react/Graph.test.tsx`, `tests/package/per-type-bundle.test.ts`
- `.gener8v/specifications/geometric-shapes-and-solids.md` (`@spec Coverage`)

**Findings:** 2
**Critical:** 0 | **Issues:** 0 | **Observations:** 2

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| Sides/angles triangle: first-named side horizontal at the bottom, remaining vertex above, identical every render | Yes | `src/layout/triangle.ts`:modelVertices, SIDE_ENDS; `src/core/definitions/triangle.ts`:triangleDisplay (base = first supplied side, else a). Probe: sides b, c + angle A 90 stands on b, B above; pure function, no randomness. Orientation and determinism cases in `tests/layout/triangle.test.ts` |
| Vertices: relative positions preserved (no reflection), scaled to fit | Yes | `src/layout/triangle.ts`:triangleLayout (`top + (maxY - y) * scale`, y flipped, x kept). Probe: (0,0),(4,0),(0,3) draws as (80,218.8),(320,218.8),(80,38.8); swapped order is its mirror image only because the input order is |
| Sides labeled with lengths (unit or custom text), angles with degrees, vertices with names | Yes | `src/layout/triangle.ts`:triangleLayout (`measurementLabel`, `°`, `shown.names`); `src/core/definitions/triangle.ts`:triangleDisplay, labelText |
| Angle within tolerance of 90° gets a right-angle mark instead of an arc | Yes | `src/core/definitions/triangle.ts`:isRightAngle (`withinTolerance`); `src/layout/triangle.ts` right-angle branch. Probe: 89.1 and 90.9 each draw a right-angle mark |
| Very thin triangle (1, 100, 100.5) to scale, labels not overlapping each other or the lines | Yes | `src/layout/triangle.ts`:fitScale, `placeLabels` with stacking. Probe of 1, 100, 100.5 with every label: no overlap, finite coordinates; 0.02° needle at 1,000,000 has no NaN. Overlap tests in `tests/layout/triangle.test.ts` (see CR-001 for the stacked-label readability caveat) |
| Text alternative names a triangle and states each shown side, angle and vertex name | Yes | `src/core/definitions/triangle.ts`:describe via `triangleDefinition.describe` in the layout |
| `TriangleGraph`, `./triangle` entry, size-limit entry, examples (one per determining set); Scene numbers through `fmt()` | Yes | `src/react/graphs/TriangleGraph.tsx`, `src/entries/triangle.ts`, `package.json` (`./triangle`), `.size-limit.json`, `examples/triangle*.json` (four valid, two invalid); `fmt`/`fmtPoints`/`rounded` in the layout; `checkScene` in every layout test |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| GSS-REQ-020 | Optionally label sides, angles (degrees), vertices | `src/core/definitions/triangle.ts`:triangleDisplay, labelText, labelSentences; `src/core/definitions/figure.ts`:labelSidesProperty, agrees; `src/layout/triangle.ts`:triangleLayout | Yes |
| GSS-REQ-021 | 90° angle gets a right-angle mark instead of an arc | `src/core/definitions/triangle.ts`:isRightAngle; `src/layout/triangle.ts`:triangleLayout | Yes |
| GSS-REQ-022 | One documented, deterministic orientation | `src/layout/triangle.ts`:modelVertices, SIDE_ENDS; `src/core/definitions/triangle.ts`:triangleDisplay and the definition description | Yes |

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/TC-001 | Output computed from the description alone, no DOM measuring | Yes | `src/layout/triangle.ts` is a pure function of `(normalized, provenance)` |
| prd/TC-011 | Package computes line breaking from estimated metrics | Yes | All labels through `placeLabels`/`wrap`/`labelBlock`; titles through `titleBlock`; vertex names through the same path; at-limit and over-limit tests in `tests/react/Graph.test.tsx` |
| prd/CC-002 | Text alternative; contrast; non-color cue | Yes | `textAlternative` from `describe`; figure line uses the default line color; angle and side identity does not rely on color |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-002 | Layout is a pure function to a framework-neutral Scene | Yes | `triangleLayout: Layout<Triangle>` returns `Scene` of `polygon`, `polyline`, `text` |
| AD-007 | One rounding function for every emitted number | Yes | `fmt`, `fmtPoints`; `checkScene` in tests |
| AD-010 | Estimated text metrics, labels laid out clear of lines and each other | Yes | `placeLabels` with obstacles including arcs and right-angle marks |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| GSS-REQ-020 | `@spec GSS-REQ-020` | `src/core/definitions/triangle.ts`:triangleDisplay, labelSentences, triangle, defineTriangle, describe; `src/core/definitions/figure.ts` (figureTerms, agrees); `src/layout/triangle.ts`:triangleLayout | Yes |
| GSS-REQ-021 | `@spec GSS-REQ-021` | `src/core/definitions/triangle.ts`:isRightAngle, triangleDisplay, triangle, describe; `src/layout/triangle.ts`:triangleLayout | Yes |
| GSS-REQ-022 | `@spec GSS-REQ-022` | `src/core/definitions/triangle.ts`:triangleDisplay; `src/layout/triangle.ts`:SIDE_ENDS, modelVertices, triangleLayout | Yes |

**Coverage:** 3 of 3 requirements annotated
**Missing:** none
**Specification table:** Yes — rows for GSS-REQ-020..022 and the triangle's locations on 030..036 are present in `.gener8v/specifications/geometric-shapes-and-solids.md`. The delivery record's own `@spec Annotations` table names `figure.ts`:`labelSides`, where the code and the specification table say `figureTerms` (see CR-002).

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm generate` | 0 (no change to `src/generated`) | Yes |
| `pnpm lint` / `pnpm typecheck` | 0 / 0 | Yes |
| `npx vitest run --no-cache` | 0 (65 files, 1,889 passed) | Yes |
| `pnpm bench` | 0 | Yes |
| `pnpm check:deps` / `check:changesets` | 0 / 0 | Yes |
| `pnpm size` | 0 (`./triangle` listed, within limit) | Yes |
| `pnpm publint` | 0 | Yes |
| `pnpm build`, `check:dist`, `check:images`, `attw`, `audit` | Not re-run: the build rewrites `dist/`, which the parallel reviewers use; the vitest run rebuilt `dist/` and passed | Not independently re-run |

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | One `labelSides` term is required by GSV-REQ-015. The square's published description changed and is covered by the changeset. |
| DEL-002 | Reasonable | `agrees<D>()` generic move; the circle and square behavior is unchanged (tests pass). |
| DEL-003 | Reasonable | First supplied side in a, b, c order is a documented, deterministic reading of "first-named". It depends on provenance, so the rule is stated in the definition description. |
| DEL-004 | Reasonable | A blank angle label still draws its arc. Tolerance matches the GSV tolerance. |
| DEL-005 | Reasonable | Bounding-box fit with no division by a height or sine; mark radii bounded by the vertex's distance to the opposite side. |
| DEL-006 | Reasonable | Wording is consistent with the circle and square. |

## Findings

### CR-001: A stacked angle label no longer says which angle it belongs to

**Severity:** Observation
**Location:** `src/layout/triangle.ts`:triangleLayout (angle label text); delivery record Notes
**Traces To:** GSS-REQ-020; GSS Edge Case "very thin triangle (1, 100, 100.5)" (GSS-NFR-003)
**Description:** When an angle label has no clear place inside its angle, it is stacked below the figure showing only its value. For sides 1, 100, 100.5 with all angles labeled, the drawing shows "0.49°", "59.75°" and "119.75°" in a column below the figure, with nothing connecting each to a vertex. The delivery record acknowledges this as the inherited stacking rule.
**Impact:** A reader of the picture cannot tell which stacked angle is which. The text alternative still states every angle with its vertex, and no overlap rule is broken.
**Recommendation:** Accept as a known limit of the shared stacking rule, or prefix a stacked angle label with its vertex (for example "A: 0.49°") in a later ticket that revisits stacking for all figures.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-29). The kit's `LabelRequest` takes an optional `stackedText`, drawn instead of `text` when the label is stacked below the figure. The triangle passes "∠A = 0.02°", "a = 3 cm" and "vertex A: P" (custom text: "∠A = x"); labels placed beside their element are unchanged, and the circle and square pass none, so their Scenes are unchanged. Tests: the kit draws the stacked text only when stacked; a 0.02° needle's stacked labels each name their element and its placed labels do not. Mutation-checked (ignoring `stackedText` fails both).

---

### CR-002: The delivery record's `@spec` table names `labelSides` in `figure.ts`, which is not a code symbol there

**Severity:** Observation
**Location:** `.gener8v/changes/graph-library/delivery/geometric-shapes-and-solids-ticket-005-delivery.md` (`## @spec Annotations`, GSS-REQ-020 row); `src/core/definitions/figure.ts`:figureTerms
**Traces To:** CONVENTIONS traceability; the specification's `@spec Coverage` table
**Description:** The record lists `figure.ts`:labelSides, but the annotated symbol is `figureTerms` (the export is `labelSidesProperty`). The specification's table uses `figureTerms (labelSides)`, so the two artifacts differ in wording only; the code annotation is present and correct.
**Impact:** None on behavior. A reader grepping the record's symbol finds no match.
**Recommendation:** Leave as is, or correct the symbol in the next amendment to the record.
**Status:** Resolved
**Resolution:** Corrected in the delivery record's Post-Review Amendments: the `@spec` annotation for `labelSides` in `src/core/definitions/figure.ts` sits on `figureTerms`; the specification's coverage table already names it so.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Fix | Stacked labels name their element (`stackedText`) | `src/layout/kit/figure-labels.ts`, `src/layout/triangle.ts`, `tests/layout/kit/figure-labels.test.ts`, `tests/layout/triangle.test.ts` |
| CR-002 | Fix | Record corrected by amendment | `.gener8v/changes/graph-library/delivery/geometric-shapes-and-solids-ticket-005-delivery.md` |

## Verdict

**Result:** Approved
**Unresolved Findings:** None
**Notes:** Provisional, from the findings phase. No Critical or Issue findings. The Observations do not block approval.
