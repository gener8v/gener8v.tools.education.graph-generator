# Graph Specification & Vocabulary Specification

## Overview

Defines the one way every graph is described: a single unified JSON description that names a graph type, its numeric parameters and its presentation options, using property names drawn from a fixed vocabulary of plain-English mathematical nouns. It also defines how a description is checked (validation, derived values, contradiction detection) and how the result of that check is reported, so that a person or a language model can correct a description and retry. Every other capability area renders or packages descriptions defined here.

## Source Context

**Parent PRD:** Curricular Graph Generator
**Requirement prefix:** GSV
**Status:** Approved
**Approved by:** Product Owner — Thomas, 2026-10-04
**Related Capabilities:** Number Lines & Coordinate Graphs, Data Graphs & Pictographs, Geometric Shapes & Solids (each defines the type-specific parameters this area's description carries); Component Packaging & Source Export (exposes the single entry point, the schema and the model tool built on this area)

## Functional Requirements

### Unified Description

- **GSV-REQ-001** *(must · change: graph-library)*: The system should accept one JSON object as the complete description of a graph, for every supported graph type
- **GSV-REQ-002** *(must · change: graph-library)*: The system should identify the graph type of a description from a single required graph-type field in that description
- **GSV-REQ-003** *(must · change: graph-library)*: The system should support exactly these graph types in this change: number line, x,y coordinate graph, x,y,z coordinate graph, line graph, bar graph, pictograph, circle, square, triangle, cube, cylinder
- **GSV-REQ-004** *(must · change: graph-library)*: The system should accept a description of any supported graph type through a single point of entry, without the caller choosing a type-specific entry
- **GSV-REQ-005** *(must · change: graph-library)*: The system should accept only plain JSON data in a description (objects, arrays, strings, finite numbers, booleans, null), so that a description survives serialization and deserialization without change
- **GSV-REQ-006** *(must · change: graph-library)*: The system should accept an optional schema-version field in a description and treat a description without one as written for the current schema version

### Published Schema

- **GSV-REQ-007** *(must · change: graph-library)*: The system should publish a machine-readable JSON Schema of the unified description that covers every supported graph type
- **GSV-REQ-008** *(must · change: graph-library)*: The published schema should define the parameters of each graph type separately, selected by the graph-type field
- **GSV-REQ-009** *(must · change: graph-library)*: The published schema should carry a plain-English description of every graph type and every property
- **GSV-REQ-010** *(must · change: graph-library)*: The system should make the schema available both programmatically and as a static file in the package
- **GSV-REQ-011** *(must · change: graph-library)*: The system should reject every description that the published schema rejects

### Vocabulary

- **GSV-REQ-012** *(must · change: graph-library)*: The system should define a fixed vocabulary of plain-English mathematical nouns, and every property name in a description should be a term from that vocabulary
- **GSV-REQ-013** *(must · change: graph-library)*: The system should publish the vocabulary as a list of terms, each with a plain-English definition
- **GSV-REQ-014** *(must · change: graph-library)*: The system should publish, for each graph type, which vocabulary terms apply, which are required, which are optional, and the kind of value each accepts
- **GSV-REQ-015** *(must · change: graph-library)*: The system should generate the published vocabulary, the published schema and the validation rules from one definition, so that the three cannot disagree

### Validation

- **GSV-REQ-016** *(must · change: graph-library)*: The system should validate a description before rendering it, and should not render a description that fails validation
- **GSV-REQ-017** *(must · change: graph-library)*: The system should report every problem found in a description in one validation pass, not only the first
- **GSV-REQ-018** *(must · change: graph-library)*: The system should report each required property that is missing for the description's graph type
- **GSV-REQ-019** *(must · change: graph-library)*: The system should report each property that is not a vocabulary term applicable to the description's graph type
- **GSV-REQ-020** *(must · change: graph-library)*: The system should suggest the closest applicable vocabulary term when it reports an unknown property name
- **GSV-REQ-021** *(must · change: graph-library)*: The system should report each value whose kind does not match the kind the property accepts (for example, text where a number is required)
- **GSV-REQ-022** *(must · change: graph-library)*: The system should report each value outside its allowed range, including non-positive lengths, radii and heights, and a range whose minimum is not less than its maximum
- **GSV-REQ-023** *(must · change: graph-library)*: The system should report each set of values that contradict one another (for example, a radius and a diameter that disagree, or triangle side lengths that cannot form a triangle)
- **GSV-REQ-024** *(must · change: graph-library)*: The system should report an unknown or missing graph type and list the supported graph types in the report
- **GSV-REQ-025** *(must · change: graph-library)*: The system should report a schema version it does not support
- **GSV-REQ-026** *(must · change: graph-library)*: The system should allow a description to be validated without rendering it and without a browser environment

### Validation Results

- **GSV-REQ-027** *(must · change: graph-library)*: The system should return a validation result that states whether the description is valid
- **GSV-REQ-028** *(must · change: graph-library)*: A valid result should include the normalized description, with derived values filled in
- **GSV-REQ-029** *(must · change: graph-library)*: An invalid result should list every issue found, each naming the path to the offending property
- **GSV-REQ-030** *(must · change: graph-library)*: Each issue should carry an issue code from a fixed, documented set
- **GSV-REQ-031** *(must · change: graph-library)*: Each issue should carry a plain-English message that names the property in vocabulary terms and says what would make the value acceptable
- **GSV-REQ-032** *(must · change: graph-library)*: Each issue should carry, where one applies, the expected value kind, the allowed range, the conflicting properties, or the suggested term
- **GSV-REQ-033** *(must · change: graph-library)*: The system should return validation results as plain JSON data
- **GSV-REQ-034** *(must · change: graph-library)*: The system should keep issue codes stable across non-major releases

### Derived Values

- **GSV-REQ-035** *(must · change: graph-library)*: The system should publish, for each graph type, which values determine which other values (for example, a circle's radius determines its diameter and circumference)
- **GSV-REQ-036** *(must · change: graph-library)*: The system should accept any one of a set of mutually determining values as the defining value (for example, a circle defined by its circumference alone)
- **GSV-REQ-037** *(must · change: graph-library)*: The system should derive every dependent value from the defining value
- **GSV-REQ-038** *(must · change: graph-library)*: The system should treat a supplied dependent value as a statement to check, and accept it when it agrees with the derived value within the documented tolerance
- **GSV-REQ-039** *(must · change: graph-library)*: The normalized description should mark each value as supplied or derived

### Presentation Options

- **GSV-REQ-040** *(must · change: graph-library)*: The system should accept line color, line label, axis labels, title and point labels on every graph type to which each applies
- **GSV-REQ-041** *(must · change: graph-library)*: The system should report a presentation option given for a graph type to which it does not apply
- **GSV-REQ-042** *(must · change: graph-library)*: The system should accept a color as a named color from a published list of plain-English color names or as a hexadecimal color code
- **GSV-REQ-043** *(must · change: graph-library)*: The system should accept labels and titles as plain text, never as markup
- **GSV-REQ-044** *(must · change: graph-library)*: The system should apply one published default style (colors, line widths, text size, font) to every graph type when presentation options are omitted
- **GSV-REQ-045** *(must · change: graph-library)*: The system should apply a presentation option only to the element it names, leaving every other element at its default

## Non-Functional Requirements

- **GSV-NFR-001** *(must · change: graph-library)*: Validating a single description of any graph type takes ≤ 5 ms at p95 in Node.js on a CI runner — **verified by:** a benchmark over the example description of every graph type, run in the Delivery verification step
- **GSV-NFR-002** *(must · change: graph-library)*: The published schema is valid against the JSON Schema meta-schema it declares — **verified by:** a meta-schema validation test in CI
- **GSV-NFR-003** *(must · change: graph-library)*: Schema and validation agree on every generated description: no description the schema rejects passes validation — **verified by:** a property-based test generating at least 1,000 descriptions per graph type, run in CI
- **GSV-NFR-004** *(must · change: graph-library)*: Every color in the default style has a contrast ratio of at least 3:1 against the default background — **verified by:** an automated contrast check over the default palette in CI
- **GSV-NFR-005** *(must · change: graph-library)*: Every vocabulary term, issue code and graph type is documented — **verified by:** a documentation test that fails when the published vocabulary, issue-code set or graph-type list holds an entry with no documentation

## Behaviors & Rules

### Description Handling

- When a description has no schema-version field, the system should validate it against the current schema version
- When a description is valid, the system should render from the normalized description, never from the raw input
- If the graph-type field is missing or unknown, the system should report that issue and should not attempt type-specific checks
- When a property is both unknown and close to an applicable term, the issue should include the suggestion; when no term is close, the issue should list the applicable terms

### Derived Values and Tolerance

- When only a defining value is supplied, the system should derive every dependent value
- When a defining value and one or more dependent values are supplied, the system should check each dependent value against the value derived from the defining value
- When two dependent values are supplied without a defining value, the system should take one documented value as defining and check the other against it
- A supplied dependent value agrees when it is within 1% (relative) of the derived value, so that values computed with π ≈ 3.14 or π ≈ 22/7 are accepted
- When values disagree, the issue should name every property involved and state the value that would agree

### Presentation

- When a color name is not in the published list and is not a valid hexadecimal code, the system should report it and list the accepted color names
- When an option applies to some elements of a graph type (for example, a label on one point), the system should apply it to that element only

## Edge Cases & Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| Description is not a JSON object (an array, a string, null) | The system should report one issue stating that a description must be an object |
| Description is a JSON string rather than a parsed object | The system should report that the description must be an object; parsing text is the caller's responsibility |
| Numeric value is NaN, Infinity or a numeric string such as "5" | The system should report a wrong-kind issue; numeric strings are not coerced |
| Same property supplied twice with different values | JSON parsing keeps one value; the system validates what it receives |
| Description contains many problems | The system should report all of them, each with its own path |
| Very large numbers (for example, a radius of 10¹²) | The system should accept them if finite and positive; proportional drawing is the rendering area's concern |
| Label text is empty | The system should treat an empty label as no label |
| Label text is very long | The system should accept it; how it is laid out is the rendering area's concern |
| Supplied dependent value differs by just over 1% | The system should report a contradiction stating the derived value |
| Description written for a newer, unsupported schema version | The system should report an unsupported-version issue and not attempt further checks |

## States & Transitions

Description (raw) → validate → Valid (normalized, derived values filled) → render
Description (raw) → validate → Invalid (issues listed) → caller corrects → Description (raw)

## Data Requirements

- The system should hold, for each graph type: its applicable vocabulary terms, which are required, each term's value kind and allowed range, its defining and dependent values, and its applicable presentation options
- The system should hold the vocabulary terms with their plain-English definitions
- The system should hold the issue-code set with a documented meaning for each code
- The system should hold the named-color list and the default style
- The system should return, in a validation result: validity, the normalized description (valid) or the issue list (invalid)

## User Interactions

- A curriculum developer or a language model should be able to write a description using only the published schema and vocabulary
- A caller should be able to read the issue list and correct each offending property without reading the package's source
- A caller should be able to see which values in a normalized description were supplied and which were derived

## Open Questions

- [ ] **OQ-001**: Are property names single words and camel-cased noun phrases (`radius`, `lineColor`), or plain-English phrases with spaces (`line color`)? Assumed camel-cased; affects the schema and model tool usability
- [ ] **OQ-002**: Should synonyms and plurals be accepted (for example, `diam` or `radii`), or is the vocabulary strictly one term per concept? Assumed strict, with suggestions
- [ ] **OQ-003**: Is a 1% relative tolerance right for supplied dependent values, and should a description be able to set its own tolerance?
- [ ] **OQ-004**: Should area, perimeter and volume be derived and labelable values, or only the measurements the PRD names (radius, diameter, circumference, side, edge, height)?
- [ ] **OQ-005**: Should units (cm, in, students) be part of a value, or a separate label-only property? (Carried from PRD)
- [ ] **OQ-006**: Which named colors are in the published list?
- [ ] **OQ-007**: Some model providers support only a subset of JSON Schema in tool definitions; must the published schema stay within a stated subset? (Carried from PRD)
- [ ] **OQ-008**: What is the policy when the schema version changes: does the system keep accepting older versions, and for how long? (Carried from PRD)

## Assumptions

- Assumption: Property names are English only
- Assumption: Validation is strict — unknown and inapplicable properties are errors, not warnings, so a model's mistakes are always surfaced
- Assumption: The type-specific parameters (ranges, points, series, side lengths and so on) are defined by the three rendering areas and enter this area's single definition; this area owns the mechanism, the shared properties and the rules that apply across types
- Assumption: Parsing JSON text into an object is done by the caller or by the model-tool handler in Component Packaging & Source Export

## @spec Coverage

| Requirement | Code Location(s) |
|-------------|-----------------|
| GSV-REQ-027 | `src/core/result.ts`:ValidationResult |
| GSV-REQ-029 | `src/core/result.ts`:Issue, ValidationResult; `src/core/issues.ts`:pointer, createIssue |
| GSV-REQ-030 | `src/core/result.ts`:Issue; `src/core/issues.ts`:ISSUE_CODES, isIssueCode, issueDocs |
| GSV-REQ-031 | `src/core/result.ts`:Issue; `src/core/issues.ts`:IssueParamsByCode, templates, issueMessage, createIssue |
| GSV-REQ-032 | `src/core/result.ts`:Issue; `src/core/issues.ts`:IssueParamsByCode, createIssue |
| GSV-REQ-033 | `src/core/result.ts`:Issue, ValidationResult; `src/core/issues.ts`:createIssue |
| GSV-REQ-034 | `src/core/issues.ts`:ISSUE_CODES |
| GSV-REQ-003 | `src/core/definitions/types.ts`:GRAPH_TYPES; `src/core/definitions/index.ts`:definitions |
| GSV-REQ-012 | `src/core/definitions/types.ts`:PropertySpec; `src/core/definitions/index.ts`:definitions, propertiesOf |
| GSV-REQ-040 | `src/core/definitions/types.ts`:PresentationOption; `src/core/definitions/shared.ts`:sharedProperties; `src/core/definitions/index.ts`:propertiesOf |
| GSV-REQ-042 | `src/core/style.ts`:namedColors, resolveColor |
| GSV-REQ-043 | `src/core/definitions/types.ts`:PropertySpec; `src/core/definitions/shared.ts`:sharedProperties |
| GSV-REQ-044 | `src/core/style.ts`:defaultStyle, seriesStyles |
| GSV-REQ-045 | `src/core/definitions/types.ts`:PresentationOption; `src/core/definitions/shared.ts`:sharedProperties |
| GSV-NFR-004 | `src/core/style.ts`:namedColors, defaultStyle, seriesStyles |
