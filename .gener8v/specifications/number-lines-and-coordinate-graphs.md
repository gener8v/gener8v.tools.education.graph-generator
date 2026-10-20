# Number Lines & Coordinate Graphs Specification

## Overview

Defines the axis-based graph types: number lines, two-dimensional (x, y) coordinate graphs, three-dimensional (x, y, z) coordinate graphs and, from the `rulers` change, rulers marked in centimetres or inches with an optional object lying along them to be measured. For each it defines the type-specific parameters a unified description carries, the domain rules those parameters must satisfy, and what the rendered graph must show. Positions on every graph are drawn in proportion to their values, so a figure can be trusted in a mathematics lesson.

## Source Context

**Parent PRD:** Curricular Graph Generator
**Requirement prefix:** NLC
**Status:** Approved
**Approved by:** Product Owner — Thomas Eaves, 2026-10-20 (`rulers` amendment; previously Product Owner — Thomas, 2026-10-04)
**Related Capabilities:** Graph Specification & Vocabulary (the unified description, validation, results, presentation options and default style these graph types rely on); Component Packaging & Source Export (the components and source export that render these graph types)

## Functional Requirements

### Shared Axis Behavior

- **NLC-REQ-001** *(must · change: graph-library)*: The system should define the parameters of the number line, x,y coordinate graph, x,y,z coordinate graph and ruler types in the single definition of GSV-REQ-015, using vocabulary terms *(amended 2026-10-20 by rulers)*
- **NLC-REQ-002** *(must · change: graph-library)*: The system should require, for every axis, a range given as a minimum and a maximum
- **NLC-REQ-003** *(must · change: graph-library)*: The system should accept negative, zero and positive values for an axis minimum and maximum, including decimal values
- **NLC-REQ-004** *(must · change: graph-library)*: The system should accept an optional tick spacing for each axis and place ticks at every whole multiple of that spacing that lies within the axis range
- **NLC-REQ-005** *(must · change: graph-library)*: The system should choose a documented default tick spacing for an axis when none is supplied
- **NLC-REQ-006** *(must · change: graph-library)*: The system should accept an option to show or hide tick labels on each axis, and show them by default
- **NLC-REQ-007** *(must · change: graph-library)*: The system should draw each tick, point and segment at a position proportional to its value along each axis
- **NLC-REQ-008** *(must · change: graph-library)*: The system should report a tick spacing that would produce more than 100 ticks on one axis
- **NLC-REQ-009** *(must · change: graph-library)*: The system should report a tick spacing that is zero or negative
- **NLC-REQ-010** *(must · change: graph-library)*: The system should report each point or segment endpoint whose value lies outside the corresponding axis range
- **NLC-REQ-011** *(must · change: graph-library)*: The system should accept, for each point, an optional label and an optional color, applied per GSV-REQ-040..045
- **NLC-REQ-012** *(must · change: graph-library)*: The system should give every rendered graph of these types a text alternative generated from its normalized description, stating the graph type, axis ranges and every marked point
- **NLC-REQ-013** *(must · change: graph-library)*: The system should accept an optional caller-supplied text alternative that replaces the generated one

### Number Lines

- **NLC-REQ-014** *(must · change: graph-library)*: The system should render a number line over a range that is negative-only, positive-only or spans zero
- **NLC-REQ-015** *(must · change: graph-library)*: The system should accept a separate arrowhead setting for each end of a number line
- **NLC-REQ-016** *(must · change: graph-library)*: The system should draw an arrowhead at an end of a number line when, and only when, that end's arrowhead setting is on
- **NLC-REQ-017** *(must · change: graph-library)*: The system should use a documented default arrowhead setting for an end when none is supplied
- **NLC-REQ-018** *(must · change: graph-library)*: The system should mark each supplied point on a number line at its value
- **NLC-REQ-019** *(must · change: graph-library)*: The system should accept custom tick labels that replace the numeric label at a given tick value
- **NLC-REQ-020** *(must · change: graph-library)*: The system should report a custom tick label whose value is not a tick position
- **NLC-REQ-021** *(must · change: graph-library)*: The system should accept an optional label for the number line as a whole

### x,y Coordinate Graphs

- **NLC-REQ-022** *(must · change: graph-library)*: The system should render an x,y coordinate graph from an x-axis range and a y-axis range
- **NLC-REQ-023** *(must · change: graph-library)*: The system should show one, two or four quadrants as determined by whether each axis range includes negative values, positive values or both
- **NLC-REQ-024** *(must · change: graph-library)*: The system should draw each axis through the origin when the other axis's range includes zero
- **NLC-REQ-025** *(must · change: graph-library)*: The system should draw an axis along the nearest edge of the plotting area when the other axis's range excludes zero
- **NLC-REQ-026** *(must · change: graph-library)*: The system should accept an option to show or hide grid lines, with grid lines at the tick positions
- **NLC-REQ-027** *(must · change: graph-library)*: The system should accept separate tick spacing for the x-axis and the y-axis
- **NLC-REQ-028** *(must · change: graph-library)*: The system should plot each supplied point at its (x, y) coordinates
- **NLC-REQ-029** *(must · change: graph-library)*: The system should draw each supplied line segment between its two endpoint coordinates
- **NLC-REQ-030** *(must · change: graph-library)*: The system should accept an optional label and an optional color for each line segment
- **NLC-REQ-031** *(must · change: graph-library)*: The system should accept axis labels for the x-axis and the y-axis per GSV-REQ-040
- **NLC-REQ-032** *(must · change: graph-library)*: The system should draw one unit on the x-axis and one unit on the y-axis at equal lengths by default
- **NLC-REQ-033** *(must · change: graph-library)*: The system should report a line segment whose two endpoints are the same point

### x,y,z Coordinate Graphs

- **NLC-REQ-034** *(must · change: graph-library)*: The system should render an x,y,z coordinate graph from an x-axis, a y-axis and a z-axis range
- **NLC-REQ-035** *(must · change: graph-library)*: The system should draw the three axes in one documented, fixed viewing projection
- **NLC-REQ-036** *(must · change: graph-library)*: The system should label each of the three axes, using the supplied axis label or the axis name by default
- **NLC-REQ-037** *(must · change: graph-library)*: The system should plot each supplied point at its (x, y, z) coordinates within the projection
- **NLC-REQ-038** *(must · change: graph-library)*: The system should accept an option to draw guide lines from a point to its position on the x,y plane, so that its depth can be read
- **NLC-REQ-039** *(must · change: graph-library)*: The system should accept tick spacing for each of the three axes

### Rulers

- **NLC-REQ-040** *(must · change: rulers)*: The system should render a ruler from a unit and a length, the length being a whole number of that unit
- **NLC-REQ-041** *(must · change: rulers)*: The system should accept centimetres and inches as a ruler's unit, and report any other unit
- **NLC-REQ-042** *(must · change: rulers)*: The system should report a ruler length that is not a whole number, is zero or negative, or exceeds the documented maximum for its unit
- **NLC-REQ-043** *(must · change: rulers)*: The system should number every whole unit on a ruler, from 0 at the ruler's start to its length at its end
- **NLC-REQ-044** *(must · change: rulers)*: The system should draw a centimetre ruler with a mark at every millimetre
- **NLC-REQ-045** *(must · change: rulers)*: The system should draw a centimetre ruler's half-centimetre marks longer than its millimetre marks, and its whole-centimetre marks longer than its half-centimetre marks
- **NLC-REQ-046** *(must · change: rulers)*: The system should accept an optional smallest division for an inch ruler, one of a half, a quarter, an eighth or a sixteenth of an inch, and use a sixteenth when none is supplied
- **NLC-REQ-047** *(must · change: rulers)*: The system should draw an inch ruler with a mark at every multiple of its smallest division
- **NLC-REQ-048** *(must · change: rulers)*: The system should draw an inch ruler's marks at lengths that grade down with the fraction: whole inches longest, then halves, quarters, eighths and sixteenths
- **NLC-REQ-049** *(must · change: rulers)*: The system should accept an optional object on a ruler, given by a start mark and an end mark in the ruler's unit, either of which may be any mark of the ruler
- **NLC-REQ-050** *(must · change: rulers)*: The system should draw an object as a plain bar lying along the ruler, its ends aligned with its start and end marks
- **NLC-REQ-051** *(must · change: rulers)*: The system should report an object whose start mark is not before its end mark
- **NLC-REQ-052** *(must · change: rulers)*: The system should report an object start or end mark that lies outside the ruler, from 0 to its length
- **NLC-REQ-053** *(must · change: rulers)*: The system should report an object start or end mark that is not one of the ruler's drawn marks: a whole millimetre on a centimetre ruler, or a multiple of the smallest division on an inch ruler
- **NLC-REQ-054** *(must · change: rulers)*: The system should accept an optional color and an optional label for an object, applied per GSV-REQ-040..045
- **NLC-REQ-055** *(must · change: rulers)*: The system should not write an object's length on the figure, so that it is read from the ruler
- **NLC-REQ-056** *(must · change: rulers)*: The system should give every rendered ruler a text alternative generated from its normalized description, stating the unit, the length, the smallest division and, when an object is present, its label and its start and end marks

## Non-Functional Requirements

- **NLC-NFR-001** *(must · change: graph-library)*: Every tick, point and segment endpoint is drawn within 0.5 px of its computed position at the default size — **verified by:** a geometry test that renders generated descriptions of each type and compares element coordinates with positions computed from the values
- **NLC-NFR-002** *(must · change: graph-library)*: Every graph of these types renders in a server environment with no browser globals — **verified by:** a server-rendering test of the example description of each type in Node.js, run in CI
- **NLC-NFR-003** *(must · change: graph-library)*: Every rendered graph of these types exposes a non-empty text alternative to assistive technology — **verified by:** an accessibility test (axe rules for SVG images plus an assertion on the accessible name) over the example descriptions
- **NLC-NFR-004** *(must · change: graph-library)*: Rendering a graph with 100 ticks per axis and 50 points takes ≤ 50 ms at p95 in a server render on a CI runner — **verified by:** a rendering benchmark run in the Delivery verification step

- **NLC-NFR-005** *(must · change: rulers)*: Every ruler mark and object end is drawn within 0.5 px of its computed position at the default size, and every unit is drawn at the same length — **verified by:** a geometry test that renders generated ruler descriptions in both units and compares mark and object coordinates with positions computed from the values
- **NLC-NFR-006** *(must · change: rulers)*: Every ruler renders in a server environment with no browser globals — **verified by:** the server-rendering test of NLC-NFR-002, extended to the ruler examples, run in CI
- **NLC-NFR-007** *(must · change: rulers)*: Every rendered ruler exposes a non-empty text alternative to assistive technology — **verified by:** the accessibility test of NLC-NFR-003, extended to the ruler examples
- **NLC-NFR-008** *(must · change: rulers)*: Rendering a ruler of the maximum length in either unit, with an object, takes ≤ 50 ms at p95 in a server render on a CI runner — **verified by:** a rendering benchmark run in the Delivery verification step

## Behaviors & Rules

### Ticks

- When tick spacing is supplied, ticks fall at whole multiples of the spacing (…, −2s, −s, 0, s, 2s, …) inside the range; a range endpoint that is not a multiple is drawn without a tick
- When tick spacing is not supplied, the system should choose a spacing from 1, 2 or 5 times a power of ten that gives between 5 and 20 ticks
- When zero lies within a range, zero always receives a tick
- Tick labels show the tick value with no more decimal places than the tick spacing needs

### Arrowheads

- An arrowhead indicates the line continues beyond the drawn range; when an end's arrowhead is off, that end is drawn as a plain endpoint
- By default both ends of a number line show arrowheads

### Points and Segments

- When two points share coordinates, both are drawn, and both labels are placed so that neither hides the other
- When a point lies exactly on a range endpoint, it is inside the range
- A point's or segment's color applies to that element only; its label uses the default label color unless a label color is given

### Rulers

- A ruler is drawn to scale with itself, not at true physical size: one centimetre on screen or paper is not guaranteed to measure one centimetre
- A ruler always starts at 0; a "broken ruler" question is drawn by starting the object at a mark other than 0
- A ruler's marks build on the shared axis and tick behavior (ticks at whole multiples, positions proportional to value), but a ruler has no tick spacing: its marks come from its unit and smallest division, so the 100-tick limit of NLC-REQ-008 does not apply to it; its length maximum bounds the number of marks instead
- Only whole units are numbered; half-centimetre and fractional-inch marks are unlabeled
- An object is drawn beside the ruler's marked edge, so that the marks at its ends can be read; it carries no number
- An object's start and end are given as decimals in the ruler's unit: 3.4 for 3 cm 4 mm, 2.0625 for 2 1⁄16 in
- The documented maximum length is provisionally 30 cm for a centimetre ruler (301 millimetre marks) and 12 in for an inch ruler (193 sixteenth marks) (see OQ-009)

### Projection

- The x,y,z projection is the same for every graph, so that figures across a curriculum read consistently; the projection is documented with the graph type

## Edge Cases & Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| Range minimum equals or exceeds maximum | Reported per GSV-REQ-022 |
| Range is very narrow (for example, 0 to 0.001) | The system should accept it and choose a tick spacing per the default rule |
| Tick spacing does not divide the range evenly | The system should accept it and place ticks at multiples only |
| Tick spacing gives more than 100 ticks | The system should report it, stating the largest permitted tick count and a spacing that would fit |
| Point outside the axis range | The system should report it, naming the point and the range it violates |
| Number line with no marked points | The system should render the line, ticks and labels only |
| x,y graph with no points or segments | The system should render empty axes and grid |
| x,y graph whose ranges both exclude zero | The system should draw both axes along the nearest edges and label ticks with their true values |
| Unequal unit lengths needed to fit a wide range | The system should keep equal units unless the description turns equal units off (see OQ-004) |
| Custom tick label on a value that is not a tick | The system should report it per NLC-REQ-020 |
| Very many labeled points close together | The system should draw every point; labels may overlap (see OQ-005) |
| Ruler with no object | The system should render the ruler's marks and numbers only |
| Unit other than centimetres or inches | The system should report it per NLC-REQ-041, listing the accepted units |
| Ruler length of 0, −3, 4.5, or past the maximum | The system should report it per NLC-REQ-042, stating the range of whole lengths allowed for the unit |
| Smallest division given on a centimetre ruler | The system should report it as not applicable to a centimetre ruler |
| Object from 2 cm to 2 cm, or from 5 cm to 3 cm | The system should report it per NLC-REQ-051 |
| Object end at 3.25 cm, or at 1.3 in on a ruler marked to eighths | The system should report it per NLC-REQ-053, naming the nearest drawn marks |
| Object whose end is the ruler's length | The system should accept it: the ruler's end is a mark |
| Object starting at a mark other than 0 | The system should accept it and draw it from that mark |

## Data Requirements

- For a number line: range, tick spacing, tick-label visibility, custom tick labels, left and right arrowhead settings, marked points (value, label, color), line label, text alternative
- For an x,y graph: x and y ranges, x and y tick spacing, tick-label visibility, grid visibility, equal-unit setting, points (x, y, label, color), line segments (two endpoints, label, color), axis labels, title, text alternative
- For an x,y,z graph: x, y and z ranges and tick spacing, axis labels, points (x, y, z, label, color), guide-line setting, title, text alternative
- For a ruler: unit, length, smallest division (inch rulers only), object (start mark, end mark, label, color), title, text alternative
- The system should hold the documented default tick-spacing rule, default arrowhead setting and the fixed x,y,z projection
- The system should hold the documented maximum ruler length for each unit, the mark lengths of each division, and the default smallest division of an inch ruler

## User Interactions

- A curriculum developer should be able to produce any of these graphs from ranges and values alone, with ticks, axes and arrowheads chosen by default
- The rendered graph is static; there is no dragging, zooming or rotation in this change

## Open Questions

- [ ] **OQ-001**: Should tick labels support fractions (½, ¾) and mixed numbers as well as decimals? (Carried from PRD)
- [ ] **OQ-002**: Should number lines support open and closed point markers and shaded ranges, for inequalities and intervals? (Carried from PRD)
- [ ] **OQ-003**: Do x,y,z graphs need a rotatable view, or is one fixed projection enough? Which projection (isometric, oblique, cabinet)? (Carried from PRD)
- [ ] **OQ-004**: Should a description be able to turn off equal unit lengths on an x,y graph, for ranges of very different size?
- [ ] **OQ-005**: Must the system avoid label overlap automatically, or is placing labels the author's responsibility?
- [ ] **OQ-006**: Should x,y graphs support full lines (through two points, or from slope and intercept) beyond segments? (Carried from PRD)
- [ ] **OQ-007**: Should x,y,z graphs support segments as well as points?
- [ ] **OQ-008**: Should an axis that excludes zero show an axis-break symbol?
- [ ] **OQ-009**: Are 30 cm and 12 in the right maximum ruler lengths? (Provisional, set by the `rulers` specification)
- [x] **OQ-010**: Is an inch ruler always marked to sixteenths? — Answered 2026-10-20 by the Product Owner (`rulers` OQ-001): a description may choose halves, quarters, eighths or sixteenths, sixteenths by default (NLC-REQ-046)
- [x] **OQ-011**: Can a measured object's ends fall between marks? — Answered 2026-10-20 by the Product Owner (`rulers` OQ-002): no, each end must be a drawn mark (NLC-REQ-053)
- [x] **OQ-012**: What does a measured object look like? — Answered 2026-10-20 by the Product Owner (`rulers` OQ-003): a plain bar with an optional color and label; pictures are not in this change (NLC-REQ-050, NLC-REQ-054)
- [x] **OQ-013**: Is the object's length ever written on the figure? — Answered 2026-10-20 by the Product Owner (`rulers` OQ-004): never; the text alternative states its start and end marks (NLC-REQ-055, NLC-REQ-056)

## Assumptions

- Assumption: Validation, issue reporting, presentation options and default styling follow Graph Specification & Vocabulary (GSV-REQ-016..045); this specification adds only the type-specific parameters and domain rules
- Assumption: Graphs are static figures; interaction is out of scope per the PRD
- Assumption: The x,y,z projection is fixed until OQ-003 is answered
- Assumption: A text alternative is required for every figure, as education material must be usable with assistive technology
- Assumption: A ruler's unit, length, smallest division and object use vocabulary terms that the Graph Specification & Vocabulary amendment for `rulers` adds, and the ruler type joins the list of supported types there (GSV-REQ-003)
- Assumption: The ruler's caller-supplied text alternative, title and presentation options follow NLC-REQ-013 and GSV, as for the other types of this area

## @spec Coverage

| Requirement | Code Location(s) |
|-------------|-----------------|
| NLC-REQ-002 | `src/core/definitions/axis.ts`:axisProperties, axisProperty |
| NLC-REQ-003 | `src/core/definitions/axis.ts`:axisProperties |
| NLC-REQ-004 | `src/core/definitions/axis.ts`:axisProperties; `src/core/value-scale.ts`:tickCount, niceTicks, axisTickLabel; `src/layout/kit/axis.ts`:drawAxis |
| NLC-REQ-005 | `src/core/definitions/axis.ts`:axisProperties; `src/core/value-scale.ts`:axisSpacing, niceTicks |
| NLC-REQ-006 | `src/core/definitions/axis.ts`:axisProperties; `src/layout/kit/axis.ts`:drawAxis |
| NLC-REQ-007 | `src/layout/kit/axis.ts`:drawAxis (ticks; points and segments with NLC TICKET-002..004) |
| NLC-REQ-008 | `src/core/value-scale.ts`:tickCount; `src/core/definitions/axis.ts`:axisChecks |
| NLC-REQ-009 | `src/core/definitions/axis.ts`:axisChecks |
| NLC-REQ-043 | `src/layout/kit/ruler.ts`:drawRulerMarks (kit; drawn with rulers NLC TICKET-003) |
| NLC-REQ-044 | `src/core/ruler.ts`:marksPerUnit, rulerScale; `src/layout/kit/ruler.ts`:drawRulerMarks (kit; drawn with rulers NLC TICKET-003) |
| NLC-REQ-045 | `src/core/ruler.ts`:markRank, rulerScale; `src/layout/kit/ruler.ts`:drawRulerMarks (kit; drawn with rulers NLC TICKET-003) |
| NLC-REQ-046 | `src/core/ruler.ts`:marksPerUnit, rulerScale (rule: the divisions and their default; the term with rulers NLC TICKET-002) |
| NLC-REQ-047 | `src/core/ruler.ts`:marksPerUnit, rulerScale; `src/layout/kit/ruler.ts`:drawRulerMarks (kit; drawn with rulers NLC TICKET-003) |
| NLC-REQ-048 | `src/core/ruler.ts`:markRank, rulerScale; `src/layout/kit/ruler.ts`:drawRulerMarks (kit; drawn with rulers NLC TICKET-003) |
| NLC-REQ-053 | `src/core/ruler.ts`:locateOnRuler (`rulerScale(…).locate`) (rule; checked with rulers NLC TICKET-002) |
| NLC-REQ-042 | `src/core/ruler.ts`:isRulerLength (rule; checked with rulers NLC TICKET-002) |
| NLC-REQ-052 | `src/core/ruler.ts`:locateOnRuler (`rulerScale(…).locate`) (rule; checked with rulers NLC TICKET-002) |
