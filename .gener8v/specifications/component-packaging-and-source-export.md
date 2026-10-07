# Component Packaging & Source Export Specification

## Overview

Defines how the graph generator reaches its users: as an open-source package on the public npm registry. The package offers React components for every graph type, a single entry component and a single entry function for the unified description, a way to export a description as standalone component source, and a provider-neutral tool definition with a handler so a language model can generate graphs. It also covers what an open-source package needs to have: a license, public source, contribution guidelines, versioning and documentation.

## Source Context

**Parent PRD:** Curricular Graph Generator
**Requirement prefix:** CPSE
**Status:** Approved
**Approved by:** Product Owner — Thomas, 2026-10-04
**Related Capabilities:** Graph Specification & Vocabulary (supplies the unified description, the schema, validation and issue reporting this area exposes: GSV-REQ-004, GSV-REQ-007, GSV-REQ-027..034); Number Lines & Coordinate Graphs, Data Graphs & Pictographs, Geometric Shapes & Solids (supply the rendering this area packages)

## Functional Requirements

### Distribution

- **CPSE-REQ-001** *(must · change: graph-library)*: The system should be installable from the public npm registry under a single package name
- **CPSE-REQ-002** *(must · change: graph-library)*: The package should declare React as a peer dependency, not bundle its own copy
- **CPSE-REQ-003** *(must · change: graph-library)*: The package should ship type declarations for every public component, function, description type, validation result and tool definition
- **CPSE-REQ-004** *(must · change: graph-library)*: The package should let a consumer import a single graph type's component without including the code for the other graph types in their bundle
- **CPSE-REQ-005** *(must · change: graph-library)*: The package should make no network requests and collect no telemetry at runtime
- **CPSE-REQ-006** *(must · change: graph-library)*: The package should allow validation, source export and the tool handler to be used in Node.js without a browser environment

### Graph Components

- **CPSE-REQ-007** *(must · change: graph-library)*: The system should provide one React component for each supported graph type, accepting that type's description as its inputs
- **CPSE-REQ-008** *(must · change: graph-library)*: The system should provide a single entry component that accepts the unified description of any graph type and renders the matching graph (the single point of entry of GSV-REQ-004)
- **CPSE-REQ-009** *(must · change: graph-library)*: The system should provide a single entry function that accepts the unified description of any graph type and returns either a renderable graph with its normalized description, or the validation issues
- **CPSE-REQ-010** *(must · change: graph-library)*: The type-specific components and the entry component should render identical output for the same valid description
- **CPSE-REQ-011** *(must · change: graph-library)*: The components should render on the server and in the browser with identical output, using no browser-only facilities during render
- **CPSE-REQ-012** *(must · change: graph-library)*: The components should accept a text alternative and, when none is given, provide a default text alternative describing the graph from its description
- **CPSE-REQ-013** *(must · change: graph-library)*: The components should scale to the width of their container while keeping the graph's proportions

### Invalid Descriptions in Components

- **CPSE-REQ-014** *(must · change: graph-library)*: When a component receives an invalid description, it should not render the graph
- **CPSE-REQ-015** *(must · change: graph-library)*: By default, a component given an invalid description should render a visible placeholder that states the graph could not be drawn and lists the issue messages
- **CPSE-REQ-016** *(must · change: graph-library)*: A consumer should be able to choose, per component, to render nothing, to render the default placeholder, or to render placeholder content they supply, when the description is invalid
- **CPSE-REQ-017** *(must · change: graph-library)*: A component should report the validation issues of an invalid description to the consumer through a notification the consumer can supply
- **CPSE-REQ-018** *(must · change: graph-library)*: A component should never throw because its description is invalid

### Source Export

- **CPSE-REQ-019** *(must · change: graph-library)*: The system should export a valid description as the source text of one standalone React component
- **CPSE-REQ-020** *(must · change: graph-library)*: The exported component should render the same graph as the package's component for that description
- **CPSE-REQ-021** *(must · change: graph-library)*: The exported source should depend only on React, and not on this package or any other package
- **CPSE-REQ-022** *(must · change: graph-library)*: The exported component should need no inputs to render its graph
- **CPSE-REQ-023** *(must · change: graph-library)*: The exported source should record the package version and the description it was generated from, in a comment
- **CPSE-REQ-024** *(must · change: graph-library)*: The system should allow the exported component's name to be chosen, and should use a default name derived from the graph type when none is chosen
- **CPSE-REQ-025** *(must · change: graph-library)*: The system should refuse to export an invalid description and return its validation issues instead
- **CPSE-REQ-026** *(must · change: graph-library)*: The system should provide source export as a function and as a command-line command that reads a description file and writes a component file

### Model Tool

- **CPSE-REQ-027** *(must · change: graph-library)*: The system should provide a tool definition consisting of a tool name, a plain-English description of what the tool does, and an input schema
- **CPSE-REQ-028** *(must · change: graph-library)*: The tool definition's input schema should be derived from the published schema of the unified description (GSV-REQ-007), not maintained separately
- **CPSE-REQ-029** *(must · change: graph-library)*: The tool definition should not depend on any particular model provider, and the package should not depend on any model provider's software
- **CPSE-REQ-030** *(must · change: graph-library)*: The system should provide a tool handler that accepts the model's tool input either as a JSON object or as JSON text
- **CPSE-REQ-031** *(must · change: graph-library)*: When the tool input is JSON text that cannot be parsed, the handler should return an issue stating the input is not valid JSON
- **CPSE-REQ-032** *(must · change: graph-library)*: When the tool input is valid, the handler should return a success result with the normalized description, which the application can pass to the entry component or to source export
- **CPSE-REQ-033** *(must · change: graph-library)*: When the tool input is invalid, the handler should return a failure result containing the structured validation issues (GSV-REQ-029..032)
- **CPSE-REQ-034** *(must · change: graph-library)*: The handler should return a plain-text summary alongside each result, suitable for returning to a model as the tool result
- **CPSE-REQ-035** *(must · change: graph-library)*: The handler should never throw on any tool input
- **CPSE-REQ-036** *(must · change: graph-library)*: The package should never call, host or contact a language model

### Open-Source Distribution

- **CPSE-REQ-037** *(must · change: graph-library)*: The package and its repository should carry an open-source license file, and the package metadata should name the same license
- **CPSE-REQ-038** *(must · change: graph-library)*: The source should be in a public repository linked from the package metadata
- **CPSE-REQ-039** *(must · change: graph-library)*: The repository should provide contribution guidelines covering how to report issues, propose changes, and run the checks locally
- **CPSE-REQ-040** *(must · change: graph-library)*: The repository should have a public issue tracker linked from the package metadata
- **CPSE-REQ-041** *(must · change: graph-library)*: Each release should be recorded in a changelog that lists added, changed, deprecated and removed behavior
- **CPSE-REQ-042** *(must · change: graph-library)*: Releases should follow semantic versioning, treating the unified description, the vocabulary, the issue codes, the tool definition and the public component inputs as the public contract
- **CPSE-REQ-043** *(must · change: graph-library)*: A change that makes a previously valid description invalid, or renders it differently in meaning, should be released only in a new major version

### Documentation

- **CPSE-REQ-044** *(must · change: graph-library)*: The system should publish documentation for every graph type, listing its inputs, with a working example description and its rendered graph
- **CPSE-REQ-045** *(must · change: graph-library)*: The documentation should describe the vocabulary, the issue codes, source export and the model tool, each with a working example
- **CPSE-REQ-046** *(must · change: graph-library)*: Every example description in the documentation should be validated as part of the package's checks

## Non-Functional Requirements

- **CPSE-NFR-001** *(must · change: graph-library)*: For every graph type's documented example, the exported component renders markup identical to the package component — **verified by:** a CI test that exports each example, renders both to static markup and asserts equality
- **CPSE-NFR-002** *(must · change: graph-library)*: Importing a single graph type's component adds ≤ 25 kB minified and gzipped to a consumer bundle, and importing the entry component with all graph types adds ≤ 120 kB — **verified by:** a bundle-size check in CI that builds a fixture app per import and fails over budget
- **CPSE-NFR-003** *(must · change: graph-library)*: The packed package installs into a fresh React project and renders every documented example, on each supported React major version — **verified by:** a CI job that installs the packed tarball into fresh projects and renders all examples
- **CPSE-NFR-004** *(must · change: graph-library)*: The tool definition's input schema is valid against the JSON Schema meta-schema it declares — **verified by:** a meta-schema validation test in CI
- **CPSE-NFR-005** *(must · change: graph-library)*: Server-rendered and browser-rendered output match for every documented example, with no hydration warnings — **verified by:** a CI test that hydrates server-rendered markup and asserts no warnings
- **CPSE-NFR-006** *(must · change: graph-library)*: The tool handler returns a result, never an exception, for arbitrary input — **verified by:** a property-based test feeding at least 10,000 generated inputs (random JSON values, random text, mutated valid descriptions)
- **CPSE-NFR-007** *(must · change: graph-library)*: The package has zero runtime dependencies beyond its React peer dependency, or each is justified in the repository's dependency notes — **verified by:** a CI check over the package manifest
- **CPSE-NFR-008** *(must · change: graph-library)*: Published releases carry npm provenance linking them to the public repository build — **verified by:** the release workflow's provenance attestation, checked after publish

## Behaviors & Rules

### Invalid Descriptions

- When a component receives an invalid description and no choice is made, the system should render the default placeholder
- When the consumer has supplied an issue notification, the system should call it with the issue list each time a new invalid description is received
- When a previously invalid description becomes valid, the component should render the graph and stop showing the placeholder

### Source Export

- When the same description is exported twice by the same package version, the system should produce identical source text
- When the chosen component name is not a valid component name, the system should report it and not export

### Model Tool

- When the tool input is a JSON object, the handler should validate it directly; when it is JSON text, the handler should parse it first
- When the handler returns a failure, the plain-text summary should list each issue's path and message so a model can correct the input
- When the handler returns a success, the plain-text summary should state the graph type and that the graph was produced

## Edge Cases & Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| Entry component receives no description | The system should treat it as invalid and apply the invalid-description behavior |
| Type-specific component receives a description of a different graph type | The system should treat it as invalid and report the graph-type mismatch |
| Tool input is JSON text holding a non-object (an array, a number) | The handler should return a failure stating a description must be an object |
| Tool input is JSON text wrapped in surrounding prose | The handler should return a not-valid-JSON failure; extracting JSON from prose is not attempted |
| Tool input is extremely large | The handler should return a failure stating the input exceeds the documented size limit |
| Export requested for a description with a pictograph image | The exported source should embed the image or reference it as the description does, and say which in its comment |
| Consumer uses an unsupported React major version | The package manager should warn through the peer-dependency range; no runtime check is made |
| Placeholder rendered in print | The placeholder should remain readable in greyscale |

## Data Requirements

- The system should hold the tool name and tool description text, versioned with the package
- The system should hold, per graph type, the documented example description used by the documentation, the export test and the install test
- The system should hold the documented size limit for tool input
- The exported source should contain the generating package version and the source description

## User Interactions

- A developer should be able to render any graph by passing a description to the entry component
- A developer should be able to choose how invalid descriptions appear and receive their issues
- A developer should be able to export a graph's source from code or from the command line
- An application developer should be able to give a model the tool definition and pass the model's tool calls to the handler

## Open Questions

- [ ] **OQ-001**: Which open-source license applies? MIT is assumed. (Carried from PRD)
- [ ] **OQ-002**: Should the package also ship ready-made adapters that shape the tool definition for specific model providers, or only the provider-neutral form? (Carried from PRD)
- [ ] **OQ-003**: What form should exported source take: TypeScript or JavaScript, one file or several, styles inlined? TypeScript, one file, inline styles assumed. (Carried from PRD)
- [ ] **OQ-004**: Which React major versions are supported? 18 and 19 assumed. (Carried from PRD)
- [ ] **OQ-005**: What package name is used on npm (for example, a scoped name under the organisation)?
- [ ] **OQ-006**: Should the handler's success result also include exported source or rendered markup, so an application with no React runtime can use the tool directly?
- [ ] **OQ-007**: Are the bundle-size budgets in CPSE-NFR-002 acceptable?
- [ ] **OQ-008**: What size limit applies to tool input?

## Assumptions

- Assumption: The default visible placeholder is preferred over rendering nothing, because a silent gap in a worksheet is harder to notice than a stated error
- Assumption: Documentation is published as a static site from the public repository
- Assumption: The exported component reproduces the graph as static markup and does not re-run validation

## @spec Coverage

| Requirement | Code Location(s) |
|-------------|-----------------|
| CPSE-REQ-001 | `tests/package/checks.test.ts`:describe "package.json" (package.json field, proven by test) |
| CPSE-REQ-002 | `tests/package/checks.test.ts`:describe "package.json" (package.json field, proven by test) |
| CPSE-REQ-003 | `tsup.config.ts`:default export |
| CPSE-REQ-004 | `tsup.config.ts`:default export |
| CPSE-REQ-005 | `eslint.config.js`:no-network rule block; `eslint.config.js`:boundary rule block |
| CPSE-REQ-006 | `eslint.config.js`:boundary rule block; `src/core/index.ts`; `src/tool/index.ts`; `src/export/index.ts` |
| CPSE-REQ-011 | `src/layout/scene.ts`:SceneNode, Scene; `src/layout/kit/format.ts`:fmt, fmtPoints, pathData, translate; `src/layout/kit/check.ts`:checkScene; `src/layout/kit/text.ts`:textWidth, wrap; `src/layout/kit/labels.ts`:placeLabel; `src/react/SceneSvg.tsx`:SceneSvg; `eslint.config.js`:React renderer browser-globals block |
| CPSE-REQ-012 | `src/layout/scene.ts`:Scene, textAlternativeFor, rootAttrs; `src/react/SceneSvg.tsx`:SceneSvg |
| CPSE-REQ-013 | `src/layout/scene.ts`:Scene, rootAttrs; `src/layout/kit/scale.ts`:linearScale; `src/react/SceneSvg.tsx`:SceneSvg |
| CPSE-REQ-037 | `tests/package/checks.test.ts`:describe "repository files" (`LICENSE`, proven by test) |
| CPSE-REQ-038 | `tests/package/checks.test.ts`:describe "package.json" (package.json field, proven by test) |
| CPSE-REQ-039 | `tests/package/checks.test.ts`:describe "repository files" (`CONTRIBUTING.md`, proven by test) |
| CPSE-REQ-040 | `tests/package/checks.test.ts`:describe "package.json" (package.json field, proven by test) |
| CPSE-REQ-041 | `scripts/check-changesets.ts`:checkChangesetSummary; `.changeset/changelog.cjs` |
| CPSE-NFR-007 | `scripts/check-dependencies.ts`:checkDependencies |
