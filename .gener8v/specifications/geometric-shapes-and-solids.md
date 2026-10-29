# Geometric Shapes & Solids Specification

## Overview

Defines how the system draws the five geometric figures of this change — circles, squares, triangles, cubes and cylinders — from their numeric measurements, with optional drawn and labeled measurements. Every figure is drawn to scale, so that its proportions match the numbers in its description, and solids are drawn so they read as three-dimensional from one fixed viewpoint. The parameters defined here enter the single definition owned by Graph Specification & Vocabulary, which supplies validation, derivation and presentation.

## Source Context

**Parent PRD:** Curricular Graph Generator
**Requirement prefix:** GSS
**Status:** Approved
**Approved by:** Product Owner — Thomas, 2026-10-04
**Related Capabilities:** Graph Specification & Vocabulary (description, validation GSV-REQ-016..026, derived values GSV-REQ-035..039, presentation GSV-REQ-040..045); Component Packaging & Source Export (delivers these figures as components and exported source)

## Functional Requirements

### Circles

- **GSS-REQ-001** *(must · change: graph-library)*: The system should draw a circle from a radius
- **GSS-REQ-002** *(must · change: graph-library)*: The system should accept a diameter or a circumference in place of a radius as the circle's defining value
- **GSS-REQ-003** *(must · change: graph-library)*: The system should optionally draw the circle's radius as a segment from the center to the circumference
- **GSS-REQ-004** *(must · change: graph-library)*: The system should optionally draw the circle's diameter as a segment through the center
- **GSS-REQ-005** *(must · change: graph-library)*: The system should optionally mark the circle's center point
- **GSS-REQ-006** *(must · change: graph-library)*: The system should optionally label the radius, the diameter and the circumference, each independently, with its measurement

### Squares

- **GSS-REQ-007** *(must · change: graph-library)*: The system should draw a square from a side length
- **GSS-REQ-008** *(must · change: graph-library)*: The system should optionally label one side or all four sides with the side length
- **GSS-REQ-009** *(must · change: graph-library)*: The system should optionally mark the square's right angles

### Triangles

- **GSS-REQ-010** *(must · change: graph-library)*: The system should draw a triangle from three side lengths
- **GSS-REQ-011** *(must · change: graph-library)*: The system should draw a triangle from two side lengths and the angle between them
- **GSS-REQ-012** *(must · change: graph-library)*: The system should draw a triangle from two angles and one side length
- **GSS-REQ-013** *(must · change: graph-library)*: The system should draw a triangle from the coordinates of its three vertices
- **GSS-REQ-014** *(must · change: graph-library)*: The system should derive the remaining side lengths and angles of a triangle from whichever determining set was supplied
- **GSS-REQ-015** *(must · change: graph-library)*: The system should report side lengths that violate the triangle inequality as a contradiction
- **GSS-REQ-016** *(must · change: graph-library)*: The system should report supplied angles whose sum is not 180° (within the GSV tolerance) as a contradiction
- **GSS-REQ-017** *(must · change: graph-library)*: The system should report three angles with no side length as insufficient to determine the triangle's size
- **GSS-REQ-018** *(must · change: graph-library)*: The system should report two sides and a non-included angle as ambiguous when two triangles satisfy them, stating both possible third-side lengths
- **GSS-REQ-019** *(must · change: graph-library)*: The system should report collinear or coincident vertex coordinates as not forming a triangle
- **GSS-REQ-020** *(must · change: graph-library)*: The system should optionally label each side with its length, each angle with its measure in degrees, and each vertex with a name
- **GSS-REQ-021** *(must · change: graph-library)*: The system should mark an angle of 90° (within the GSV tolerance) with a right-angle mark instead of an arc when angles are shown
- **GSS-REQ-022** *(must · change: graph-library)*: The system should place a triangle given by sides and angles in one documented, deterministic orientation

### Cubes

- **GSS-REQ-023** *(must · change: graph-library)*: The system should draw a cube from an edge length so that it reads as a three-dimensional solid
- **GSS-REQ-024** *(must · change: graph-library)*: The system should draw a cube's hidden edges as dashed lines by default, and should allow hidden edges to be omitted
- **GSS-REQ-025** *(must · change: graph-library)*: The system should optionally label one edge or the three visible edges that meet at a corner with the edge length

### Cylinders

- **GSS-REQ-026** *(must · change: graph-library)*: The system should draw a cylinder from a radius and a height so that it reads as a three-dimensional solid
- **GSS-REQ-027** *(must · change: graph-library)*: The system should accept a diameter in place of a radius as the cylinder's defining base measurement
- **GSS-REQ-028** *(must · change: graph-library)*: The system should draw the hidden half of a cylinder's base as a dashed line by default, and should allow it to be omitted
- **GSS-REQ-029** *(must · change: graph-library)*: The system should optionally draw and label the cylinder's radius or diameter on its top face, and its height along its side

### Proportion, Projection and Labels

- **GSS-REQ-030** *(must · change: graph-library)*: The system should draw every figure so that the ratios between its drawn lengths equal the ratios between its numeric measurements
- **GSS-REQ-031** *(must · change: graph-library)*: The system should scale each figure to fit its drawing area while preserving its proportions
- **GSS-REQ-032** *(must · change: graph-library)*: The system should draw cubes and cylinders from one fixed, documented viewpoint shared by both solids
- **GSS-REQ-033** *(must · change: graph-library)*: The system should show a measurement label as the measurement value, followed by its unit when a unit is supplied
- **GSS-REQ-034** *(must · change: graph-library)*: The system should show a supplied value as it was supplied, and a derived value rounded to a documented display precision
- **GSS-REQ-035** *(must · change: graph-library)*: The system should accept a custom label text in place of the measurement value for any labelable measurement (for example, "r" or "?")
- **GSS-REQ-036** *(must · change: graph-library)*: The system should give every figure a text alternative that names the figure and each shown measurement

## Non-Functional Requirements

- **GSS-NFR-001** *(must · change: graph-library)*: For every figure, each ratio between two drawn lengths is within 1% of the ratio between the corresponding measurements — **verified by:** a geometry test that renders a fixture set of every figure type and measures the rendered coordinates
- **GSS-NFR-002** *(must · change: graph-library)*: Derived triangle sides and angles reproduce the supplied ones within 10⁻⁹ relative error when recomputed — **verified by:** a property-based round-trip test over at least 1,000 generated valid triangles per determining set
- **GSS-NFR-003** *(must · change: graph-library)*: No measurement label overlaps another label, and no label overlaps a figure line, for every documented example — **verified by:** a bounding-box overlap test over the rendered examples
- **GSS-NFR-004** *(must · change: graph-library)*: Every rendered figure carries a non-empty text alternative naming the figure and every shown measurement — **verified by:** a render test over the fixture set of every figure type

## Behaviors & Rules

### Defining and Dependent Values

- Circle: radius, diameter and circumference are mutually determining; any one defines the circle (GSV-REQ-036)
- Cylinder: radius and diameter are mutually determining; height is independent and required
- Square: side length is the only defining value; cube: edge length is the only defining value
- Triangle: the determining sets are three sides; two sides and the included angle; two angles and one side; three vertices. Supplying values beyond a determining set makes the extra values statements to check (GSV-REQ-038)
- When a triangle is given by vertices, side lengths and angles are derived from the coordinates

### Drawing

- When a radius is drawn, it should run from the center horizontally to the right unless otherwise documented
- When both radius and diameter are drawn, they should not lie on top of each other
- When a triangle is given by sides and angles, the first-named side should lie horizontal at the bottom, with the remaining vertex above it
- When a triangle is given by vertices, it should be drawn with the vertices' relative positions preserved
- When a measurement label is requested for a value that is not shown as a segment (for example, a circumference), the label should be placed next to the figure's outline

### Labels

- When no unit is supplied, the label shows the value alone
- When a custom label text is supplied, it replaces the value; the text alternative still states the value

## Edge Cases & Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| Radius, diameter or side length is zero or negative | Reported as out of range (GSV-REQ-022); nothing is drawn |
| Triangle sides 3, 4, 7 (degenerate: equals, not exceeds) | Reported as a triangle-inequality contradiction |
| Triangle with angles summing to 180° and no side | Reported as insufficient to determine size |
| Two sides and non-included angle with exactly one solution (right triangle or obtuse angle) | Drawn; not reported as ambiguous |
| Two sides and non-included angle with no solution | Reported as a contradiction |
| Triangle angle of 0° or ≥ 180° | Reported as out of range |
| Very thin triangle (for example, sides 1, 100, 100.5) | Drawn to scale; labels must still not overlap (GSS-NFR-003) |
| Cylinder far taller than it is wide (or the reverse) | Drawn to scale within the drawing area |
| Circle given radius 5 and circumference 31.4 | Accepted (within tolerance); circumference label shows 31.4 as supplied |
| Labels requested on all four sides of a very small square | Labels placed outside the figure without overlap |

## Data Requirements

The type-specific vocabulary terms this area adds to the GSV single definition (final names follow GSV OQ-001):

- **Circle:** radius, diameter, circumference (one required); showRadius, showDiameter, showCenter; per-measurement label options
- **Square:** side (required); side label option (one or all); showRightAngles
- **Triangle:** three sides, three angles (degrees), or three vertices (each an x, y pair); vertex names; side, angle and vertex label options
- **Cube:** edge (required); hidden-edge option (dashed or omitted); edge label option (one or three)
- **Cylinder:** radius or diameter (one required), height (required); hidden-base option; radius/diameter and height label options
- **All figures:** optional unit text for measurement labels; custom label text per measurement; shared presentation options from GSV-REQ-040

## User Interactions

- A curriculum developer should be able to draw a labeled figure from its measurements alone, without coordinates (except a triangle given by vertices)
- A developer should be able to hide a measurement's value behind a custom label (for example, "x") to set a question

## Open Questions

- [ ] **OQ-001**: Do solids need a rotatable or configurable viewpoint, or is one fixed viewpoint enough? Assumed fixed (Carried from PRD)
- [ ] **OQ-002**: Should area, perimeter and volume be derivable and labelable on these figures? (Carried from GSV OQ-004)
- [ ] **OQ-003**: Is a unit part of the measurement value or a label-only text? Assumed label-only text (Carried from GSV OQ-005)
- [ ] **OQ-004**: For an ambiguous two-sides-and-non-included-angle triangle, should a description be able to choose one of the two solutions instead of being rejected?
- [ ] **OQ-005**: What display precision applies to derived values (assumed: up to 2 decimal places, trailing zeros removed)?
- [ ] **OQ-006**: Should angles be accepted in radians as well as degrees? Assumed degrees only
- [ ] **OQ-007**: Should cubes support labeling every edge, and should squares and triangles support rotation?

## Assumptions

- Assumption: Hidden edges and hidden base halves are dashed by default, as in most K-12 materials
- Assumption: Solids use one oblique-style projection shared by cube and cylinder; the exact projection is chosen in Technical Design
- Assumption: Triangle angles are in degrees
- Assumption: Figures are static drawings; no interaction is provided

## @spec Coverage

| Requirement | Code Location(s) |
|-------------|-----------------|
| GSS-REQ-001 | `src/core/definitions/circle.ts`:circle; `src/layout/circle.ts`:circleLayout; `src/react/graphs/CircleGraph.tsx`:CircleGraph |
| GSS-REQ-002 | `src/core/definitions/circle.ts`:circle |
| GSS-REQ-003 | `src/core/definitions/circle.ts`:circleDisplay, circle; `src/layout/circle.ts`:circleLayout |
| GSS-REQ-004 | `src/core/definitions/circle.ts`:circleDisplay, circle; `src/layout/circle.ts`:circleLayout |
| GSS-REQ-005 | `src/core/definitions/circle.ts`:circle; `src/layout/circle.ts`:circleLayout |
| GSS-REQ-006 | `src/core/definitions/circle.ts`:circleDisplay, circle; `src/layout/circle.ts`:circleLayout |
| GSS-REQ-007 | `src/core/definitions/square.ts`:square; `src/layout/square.ts`:squareLayout; `src/react/graphs/SquareGraph.tsx`:SquareGraph |
| GSS-REQ-008 | `src/core/definitions/square.ts`:squareLabels, square; `src/layout/kit/figure-labels.ts`:labelBlock, placeLabels; `src/layout/square.ts`:squareLayout |
| GSS-REQ-009 | `src/core/definitions/square.ts`:square; `src/layout/square.ts`:squareLayout |
| GSS-REQ-010 | `src/core/geometry/triangle-solver.ts`:fromThreeSides; `src/core/definitions/triangle.ts`:triangle |
| GSS-REQ-011 | `src/core/geometry/triangle-solver.ts`:fromTwoSidesAndIncluded; `src/core/definitions/triangle.ts`:triangle |
| GSS-REQ-012 | `src/core/geometry/triangle-solver.ts`:fromTwoAnglesAndSide; `src/core/definitions/triangle.ts`:triangle |
| GSS-REQ-013 | `src/core/geometry/triangle-solver.ts`:fromVertices; `src/core/definitions/triangle.ts`:triangle, coordinateIssues |
| GSS-REQ-014 | `src/core/geometry/triangle-solver.ts`:solveTriangle, checked, fromVertices, fromThreeSides, fromTwoSidesAndIncluded, fromTwoAnglesAndSide, fromTwoSidesAndOther; `src/core/validate/solve.ts`:runSolver; `src/core/definitions/triangle.ts`:triangle, triangle.describe |
| GSS-REQ-015 | `src/core/geometry/triangle-solver.ts`:fromThreeSides |
| GSS-REQ-016 | `src/core/geometry/triangle-solver.ts`:angleProblems, solveTriangle |
| GSS-REQ-017 | `src/core/geometry/triangle-solver.ts`:solveTriangle |
| GSS-REQ-018 | `src/core/geometry/triangle-solver.ts`:fromTwoSidesAndOther |
| GSS-REQ-019 | `src/core/geometry/triangle-solver.ts`:fromVertices |
| GSS-REQ-032 | `src/layout/kit/isometric.ts`:isometric, faceVisible, isoEllipse (the viewpoint only; the cube and cylinder layouts, TICKET-006 and TICKET-007, draw from it) |
| GSS-REQ-033 | `src/core/definitions/circle.ts`:circle.describe; `src/layout/kit/measure.ts`:measurementLabel; `src/layout/circle.ts`:circleLayout; `src/core/definitions/square.ts`:square.describe; `src/layout/square.ts`:squareLayout; `src/core/definitions/triangle.ts`:triangle.describe |
| GSS-REQ-034 | `src/core/definitions/circle.ts`:circle.describe; `src/layout/kit/measure.ts`:measurementLabel; `src/layout/circle.ts`:circleLayout; `src/core/definitions/square.ts`:square.describe; `src/layout/square.ts`:squareLayout; `src/core/definitions/triangle.ts`:triangle.describe |
| GSS-REQ-035 | `src/core/definitions/circle.ts`:circleDisplay, circle; `src/layout/kit/measure.ts`:measurementLabel; `src/layout/circle.ts`:circleLayout; `src/core/definitions/square.ts`:square.describe; `src/layout/square.ts`:squareLayout |
| GSS-REQ-036 | `src/core/definitions/circle.ts`:circle.describe; `src/layout/circle.ts`:circleLayout; `src/core/definitions/square.ts`:square.describe; `src/layout/square.ts`:squareLayout |
| GSS-NFR-001 | `tests/layout/circle.test.ts`:"draws radius : diameter within 1% of 1 : 2" (circle only; TICKET-008 covers every figure) |
| GSS-NFR-002 | `tests/core/triangle-solver.property.test.ts`:"triangle round trip (GSS-NFR-002)" (1,000 runs per determining set, 10⁻⁹ relative, every angle ≥ 0.02°: below about 0.01° the rounding of the inputs themselves decides the last digits) |
