# Graph library

**Status:** Approved
**Approved by:** Product Owner — Thomas, 2026-10-04
**Opened:** 2026-10-04
**Slug:** graph-library

## Why
Curricular materials need many small mathematical figures, and producing them by hand or with general charting tools is slow and inconsistent. No package exists in this project yet. This first change delivers the whole initial graph library so that curriculum developers can describe any of the listed figure types and get a React component back.

## Outcome
- A developer can install the package from npm and render any supported graph type from a structured description of its type, numbers and vocabulary nouns
- Number lines, x,y and x,y,z coordinate graphs, line graphs, bar graphs, picture bar graphs, circles, squares, triangles, cubes and cylinders all render faithfully to their numeric inputs
- Incomplete or contradictory descriptions are rejected with actionable messages, and dependent values are derived
- Any configured graph can be exported as standalone React component source
- Every graph is described by one unified JSON body through a single entry point, with a published schema and structured validation errors
- A language model can be given graph generation as a tool, using the package's tool definition and handler
- The package is open source, with public source, a license and contribution guidelines
- Every graph type and the vocabulary are documented with a working example

## Affected Capability Areas

| Area | Kind | Requirements |
|------|------|--------------|
| Graph Specification & Vocabulary | adds area | Adds GSV-REQ-001..045, GSV-REQ-052..054, GSV-NFR-001..005; Modifies —; Withdraws — |
| Number Lines & Coordinate Graphs | adds area | Adds NLC-REQ-001..039, NLC-NFR-001..004; Modifies —; Withdraws — |
| Data Graphs & Pictographs | adds area | Adds DGP-REQ-001..037, DGP-NFR-001..005; Modifies —; Withdraws — |
| Geometric Shapes & Solids | adds area | Adds GSS-REQ-001..036, GSS-NFR-001..004; Modifies —; Withdraws — |
| Component Packaging & Source Export | adds area | Adds CPSE-REQ-001..046, CPSE-NFR-001..008; Modifies —; Withdraws — |

## Priority Cut
- **Must:** every listed graph type: number lines (positive, negative and mixed ranges; with and without arrowheads), x,y coordinate graphs (positive and negative quadrants), x,y,z coordinate graphs, line graphs, bar graphs, unit-based picture bar graphs, circles, squares, triangles, cubes, cylinders; the structured description with the fixed noun vocabulary, validation and derived values; shared presentation options (line color, line label); one unified JSON description through a single entry point, with a published schema and structured validation errors; a model tool definition and handler; runtime React components published to npm under an open-source license; export as standalone component source
- **Should:** none stated by the Product Owner
- **Could / later:** none stated by the Product Owner

## Out of Scope
- Free-form English sentence parsing (input is structured props)
- Student interaction, answering on the graph, or grading
- Non-React frameworks, a visual editor, or a hosted service
- Plotting arbitrary function equations
- Calling or hosting a language model (the consuming application runs the model)

## Open Questions
- [ ] **OQ-001**: Who supplies the pictograph image set (package, consumer, or both), and which images are included? (Carried from PRD)
- [ ] **OQ-002**: How are non-whole unit values shown in a pictograph? (Carried from PRD)
- [ ] **OQ-003**: Do 3D graphs and solids need a rotatable view, or is one fixed angle enough? (Carried from PRD)
- [ ] **OQ-004**: Accessibility, print/greyscale and supported React version targets (Carried from PRD; becomes NFRs in Specification)
- [ ] **OQ-005**: With everything at Must, is there any item that could slip to a later change if the change runs long? (A Should/Could tier lets Ticket Breakdown order work.)
- [ ] **OQ-006**: Which open-source license, and which model tool-calling formats must the tool definition support? (Carried from PRD)

## Change Log
- 2026-10-04 — opened (Planning)
- 2026-10-04 — approved by Product Owner; scope amended at approval: unified JSON entry point, model tool definition, open-source distribution (Planning)
- 2026-10-04 — renamed from graph-library-v1 at Product Owner request, before any downstream artifact existed (Planning)
- 2026-10-04 — GSV specification amended: adds GSV-REQ-001..045, GSV-NFR-001..005, modifies —, withdraws — (Specification)
- 2026-10-04 — NLC specification amended: adds NLC-REQ-001..039, NLC-NFR-001..004, modifies —, withdraws — (Specification)
- 2026-10-04 — DGP specification amended: adds DGP-REQ-001..037, DGP-NFR-001..005, modifies —, withdraws — (Specification)
- 2026-10-04 — GSS specification amended: adds GSS-REQ-001..036, GSS-NFR-001..004, modifies —, withdraws — (Specification)
- 2026-10-04 — CPSE specification amended: adds CPSE-REQ-001..046, CPSE-NFR-001..008, modifies —, withdraws — (Specification)
- 2026-10-21 — GSV specification amended: adds GSV-REQ-052..054 (caller text length limits, GSV OQ-009), modifies —, withdraws — (Specification)
- 2026-10-29 — GSS specification amended: adds —, modifies GSS-NFR-001 (sub-grid lengths; generated domains) and the triangle angle Edge Case (a 0.02° floor, Product Owner 2026-10-29), withdraws — (Specification)
