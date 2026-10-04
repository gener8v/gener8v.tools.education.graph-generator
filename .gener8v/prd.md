# Curricular Graph Generator

**Status:** Approved
**Approved by:** Product Owner — Thomas, 2026-10-04

## Problem Context

Authors of curricular materials (lessons, worksheets, assessments) need many small mathematical graphs and figures: number lines, coordinate graphs, bar and line graphs, and labeled geometric shapes and solids. Today these are drawn by hand or built one-off in general-purpose charting tools, which is slow, gives inconsistent results across a curriculum, and is hard to change when the numbers change. A distributable package that turns a short description of a graph (its type, numeric values and a small controlled vocabulary of mathematical nouns) into a ready-to-use React component would make these figures fast to produce, consistent, and easy to edit.

## Goals

- The system should let a curriculum developer produce a correct, consistently styled mathematical graph from a short structured description, without drawing it
- The system should cover the graph and figure types most common in K-12 mathematics materials with one consistent way of describing them
- The system should deliver every graph as a React component that can be rendered at runtime or exported as standalone source
- The system should reject descriptions that are incomplete or mathematically inconsistent, with messages a non-specialist can act on
- The system should accept every graph through one unified JSON description and one point of entry, so that the same description can be written by a person, stored as data, or produced by a language model through a tool call
- The system should be open source, so that curriculum teams and other developers can use, inspect and contribute to it freely

## Functional Capabilities

### Graph Specification & Vocabulary

- The system should accept every graph type through one unified JSON description, with the graph type as a field of that description, through a single point of entry
- The system should publish a machine-readable schema of the unified JSON description that covers every graph type
- The system should accept a graph description made of a graph type, numeric parameters and named properties drawn from a fixed vocabulary of plain-English mathematical nouns (for example: circle, radius, diameter, circumference, axis, point, line, label, color)
- The system should publish the available vocabulary, and which nouns and parameters apply to each graph type
- The system should validate a description against its graph type and report every missing, unknown, out-of-range or contradictory value (for example, a radius and diameter that disagree)
- The system should report validation results in a structured, machine-readable form that names each offending field, so that a person or a language model can correct the description and retry
- The system should derive dependent values where one determines another (for example, diameter and circumference from a radius) and treat any supplied dependent value as a statement to be checked
- The system should accept shared presentation options on every graph type where they apply: line color, line label, axis labels, title and point labels
- The system should apply consistent default styling when presentation options are omitted

### Number Lines & Coordinate Graphs

- The system should render number lines over a given range, including negative-only, positive-only and mixed ranges
- The system should render number lines with or without arrowheads at either end
- The system should allow tick spacing, tick labels and marked points to be specified on a number line
- The system should render two-dimensional (x, y) coordinate graphs covering one, two or all four quadrants, with configurable axis ranges, grid and tick spacing
- The system should plot specified points and line segments on an x, y graph, each with optional label and color
- The system should render three-dimensional (x, y, z) coordinate graphs with labeled axes and plotted points

### Data Graphs & Pictographs

- The system should render line graphs from a series of values along a labeled axis, supporting one or more labeled, colored series
- The system should render bar graphs from category–value pairs with labeled axes and configurable value scale
- The system should render unit-based picture bar graphs (pictographs) in which each bar is built from repeated images drawn from a provided set, each image representing a stated number of units
- The system should show a key stating what one image represents in a pictograph
- The system should represent values that are not whole multiples of the unit in a pictograph in a defined, consistent way

### Geometric Shapes & Solids

- The system should render circles from a radius, diameter or circumference, optionally showing and labeling the radius, diameter and circumference
- The system should render squares from a side length, optionally labeling sides
- The system should render triangles from side lengths, angles or vertex coordinates, optionally labeling sides, angles and vertices
- The system should render cubes from an edge length, drawn so the figure reads as three-dimensional, optionally labeling edges
- The system should render cylinders from a radius (or diameter) and height, drawn so the figure reads as three-dimensional, optionally labeling radius and height
- The system should keep the drawn proportions of a shape faithful to its numeric parameters

### Component Packaging & Source Export

- The system should be installable as a package from the public npm registry
- The system should provide a React component for every supported graph type that accepts the graph description as its inputs
- The system should provide a single entry component and a single entry function that each accept the unified JSON description of any graph type
- The system should provide a ready-made tool definition, derived from the unified schema, that lets a language model be given graph generation as a tool, along with a handler that takes the model's tool input and returns either the rendered graph or the structured validation errors
- The system should be published under an open-source license, with public source, contribution guidelines and a public issue tracker
- The system should export a given graph description as standalone React component source that renders the same graph without further configuration
- The system should document every graph type, its inputs and the vocabulary with a working example of each

## User Scenarios

**Scenario: Worksheet number line**
A curriculum developer writing a grade-6 integers worksheet needs a number line from −10 to 10 with arrowheads at both ends and points marked at −3 and 4. They describe it with the number-line type, the range, the arrow setting and the two points, and drop the resulting component into the worksheet page. When the editor later changes a point to −2, they edit one value and the figure updates.

**Scenario: Labeled circle for a geometry lesson**
A developer needs a circle with radius 5 cm, with the radius and diameter drawn and labeled and the line in blue. They supply the circle type, the radius, the labels and the color. The system derives the diameter and circumference. When a reviewer accidentally adds "diameter 12" as well, the system reports that it contradicts the radius instead of drawing a wrong figure.

**Scenario: Pictograph of class survey results**
A lesson on data shows how many students chose each fruit. The developer supplies categories and counts, picks an apple image from the provided image set, and states that one apple equals two students. The system builds each bar from apples, shows a half-apple-style partial unit for the odd count, and adds a key reading "each apple = 2 students".

**Scenario: A model drafts a figure through a tool call**
A team builds an authoring assistant that writes practice problems. They give a language model the package's graph tool definition. When the model writes a problem about a triangle with sides 3, 4 and 5, it calls the tool with a JSON description. The handler validates it and returns the rendered figure; when the model once supplies a side length of −4, it gets back a structured error naming the field, corrects it, and calls again.

**Scenario: Exporting a figure into a static course site**
A team publishes an assessment in a separate project that should not depend on the package at runtime. They export the cylinder graph they configured as standalone component source and commit that file to the assessment project, where it renders the same figure.

## Out of Scope

- This work does not include parsing free-form English sentences into graph descriptions; input is structured, and nouns come from the fixed vocabulary
- This work does not include student interaction (dragging points, answering on the graph, auto-grading)
- This work does not include components for frameworks other than React
- This work does not include a visual editor or hosted service for building graphs
- This work does not include plotting arbitrary function equations (for example, y = x² curves)
- This work does not include calling or hosting a language model; the package supplies the tool definition and handler, and the consuming application runs the model
- Future consideration: an English-phrase front end that produces the same structured description
- Future consideration: additional solids and shapes (cones, spheres, prisms, pyramids, polygons)

## Open Questions

- [ ] Is the pictograph image set supplied by the package, by the consuming developer, or both? If the package supplies one, which images are included?
- [ ] How should a pictograph show values that are not whole multiples of the unit (partial image, rounding, disallow)?
- [ ] For x, y graphs, are plotted lines limited to segments between given points, or should full lines (through two points or from slope and intercept) be supported?
- [ ] For x, y, z graphs and solids, is a single fixed viewing angle enough, or must the viewer be able to rotate the figure?
- [ ] Should number lines support fraction and decimal tick labels, and open/closed point markers or shaded ranges (for inequalities)?
- [ ] What accessibility is required: text alternatives describing each graph, sufficient color contrast, readable in print and greyscale?
- [ ] Must figures support measurement units (cm, in, students) in labels, and is unit conversion ever expected?
- [ ] Which React versions and rendering environments (browser only, server rendering, print/PDF pipelines) must be supported?
- [ ] Is the noun vocabulary English-only, and is the published vocabulary a closed list or extensible by consumers?
- [ ] What form should exported component source take (single file, language variant, styling inlined)?
- [ ] Which open-source license applies (a permissive license such as MIT is assumed in system context), and is a contributor agreement required?
- [ ] Which model tool-calling formats must the tool definition be ready for (a plain JSON Schema only, or adapters for specific model providers)?
- [ ] Should the unified description carry a version so stored descriptions keep rendering after the schema evolves?

## Change Log

- 2026-10-04 — opened; capability areas Graph Specification & Vocabulary, Number Lines & Coordinate Graphs, Data Graphs & Pictographs, Geometric Shapes & Solids, Component Packaging & Source Export (Planning, change: graph-library)
- 2026-10-04 — approved by Product Owner; Graph Specification & Vocabulary and Component Packaging & Source Export amended: unified JSON description with a single entry point and published schema, structured validation results, model tool definition and handler, open-source distribution (Planning, change: graph-library)
