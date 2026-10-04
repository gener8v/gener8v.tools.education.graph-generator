# Curricular Graph Generator — Constraints Analysis

## Overview

PRD-level analysis of the Curricular Graph Generator across all five capability areas, grounded in `.gener8v/context.md` and the five approved specifications. The constraints that most shape the work are: rendering must be pure and deterministic so that server, browser and exported output are identical, which rules out measuring text at render time and requires rounding of computed geometry; model tool-calling formats accept only a subset of JSON Schema, which conflicts with publishing the unified description as a bare discriminated union; and the open-source license, the accessibility obligations of schools, and the bundle budget together bound what the pictograph image set can be.

## Source Context

**Analyzed Document:** Curricular Graph Generator — PRD (with the five approved specifications as supporting detail)
**Capability Areas Covered:** Graph Specification & Vocabulary, Number Lines & Coordinate Graphs, Data Graphs & Pictographs, Geometric Shapes & Solids, Component Packaging & Source Export
**Status:** Approved
**Approved by:** Architect — Thomas, 2026-10-04

System context provided (`.gener8v/context.md`); most of its stack entries are marked *assumed*, so constraints that depend on them say so. No source code exists yet, so nothing could be verified against the repository (Process step 5b).

## Technical Constraints

- **TC-001**: Components must compute their entire output during render from the description alone; they cannot measure the DOM (text widths, bounding boxes, container size) before producing markup
  - *Rationale:* Server rendering has no layout engine, and server and browser output must match with no hydration warnings; exported source must produce identical markup without the package. Any value obtained by measuring in the browser would differ from the server's
  - *Impact:* CPSE-REQ-011, CPSE-NFR-005, CPSE-REQ-020, CPSE-NFR-001; label placement in GSS-NFR-003 and long-label handling in all areas must rely on estimated text metrics; container fitting (CPSE-REQ-013) must come from SVG scaling (a fixed coordinate system scaled to its container), not measured pixels

- **TC-002**: Computed coordinates must be rounded to a fixed precision before they are written to markup
  - *Rationale:* JavaScript's trigonometric and power functions (`Math.sin`, `Math.cos`, `Math.atan2`, `Math.pow`) are implementation-approximated, and their last bits can differ between engines (V8 on the server, JavaScriptCore in Safari). Unrounded output can print differently on the server and in the browser, causing hydration mismatches and breaking markup equality between exported and runtime components
  - *Impact:* CPSE-NFR-001, CPSE-NFR-005; every figure using angles or projection: GSS-REQ-011..014, GSS-REQ-023..029, NLC-REQ-035..037, DGP-REQ-028. The rounding must stay well inside the 0.5 px accuracy targets of NLC-NFR-001 and DGP-NFR-001

- **TC-003**: SVG elements referenced by id (arrowhead markers, clip paths for partial pictograph images, patterns) must use ids that are unique per component instance and identical between server and browser renders
  - *Rationale:* Several graphs on one page would otherwise share ids, so one graph's clip path or marker is applied to another. React's `useId` is the only id source that is stable across server rendering and hydration, and it exists in both React 18 and 19; the format of the ids it produces changed between React versions, so ids must not be parsed or assumed to have a shape
  - *Impact:* NLC-REQ-016 (arrowheads), DGP-REQ-028 (cropped partial images), CPSE-REQ-011; exported components (CPSE-REQ-019..022) need the same uniqueness without the package

- **TC-004**: Public components must use only React APIs available in both React 18 and React 19
  - *Rationale:* `.gener8v/context.md` sets React 18 and 19 as the supported peer range. React 19-only features (the `use` hook, `ref` as a plain prop, document metadata hoisting) would break on React 18
  - *Impact:* CPSE-REQ-002, CPSE-REQ-007..018, CPSE-NFR-003; exported source (CPSE-REQ-021) must also run on both

- **TC-005**: Validation, source export, the tool handler and the command-line export must not load React DOM or any browser global, and must be importable on their own
  - *Rationale:* They run in Node.js without a browser (GSV-REQ-026, CPSE-REQ-006), including inside model-serving back ends where React DOM is not installed
  - *Impact:* GSV-REQ-026, CPSE-REQ-006, CPSE-REQ-026, CPSE-REQ-030..035; the package needs separate entry points for the non-rendering parts

- **TC-006**: Supported Node.js versions are the active LTS lines at release: Node.js 22 and 24. Node.js 20 reached end of life in April 2026 and Node.js 18 earlier
  - *Rationale:* Node.js release schedule; unsupported runtimes receive no security fixes. Node.js 22 and later load ES modules from CommonJS (`require` of ESM), so an ES-module-only package still serves CommonJS consumers
  - *Impact:* CPSE-REQ-006, CPSE-REQ-026, CPSE-NFR-003; package format in `.gener8v/context.md` (ES modules first)

- **TC-007**: Tree-shaking per graph type requires ES module output with side-effect-free modules and per-type entry points; a single bundled file defeats it
  - *Rationale:* Bundlers remove unused code only from ES modules marked free of side effects
  - *Impact:* CPSE-REQ-004, CPSE-NFR-002

- **TC-008**: The one definition that produces types, validation and the published schema (GSV-REQ-015) must come from a schema library that emits JSON Schema itself, or from hand-written code; any library chosen counts against the runtime-dependency rule and the bundle budget
  - *Rationale:* CPSE-NFR-007 allows zero runtime dependencies unless justified; CPSE-NFR-002 caps a single graph type at 25 kB minified and gzipped, and validation code is shared by every graph type
  - *Impact:* GSV-REQ-007, GSV-REQ-011, GSV-REQ-015, GSV-NFR-003, CPSE-REQ-028, CPSE-NFR-002, CPSE-NFR-007

- **TC-009**: Exported source cannot import the package's renderer, so it must contain either fully computed markup or the minimal drawing code for its one graph type, and must embed any pictograph image it uses
  - *Rationale:* CPSE-REQ-021 forbids any dependency except React, and CPSE-REQ-022 requires no inputs
  - *Impact:* CPSE-REQ-019..024, CPSE-NFR-001, DGP-REQ-024 (images referenced by name must become embedded image data in the exported file)

- **TC-010**: Three-dimensional figures must be drawn in two-dimensional SVG with a fixed projection and analytically determined hidden lines; there is no depth buffer
  - *Rationale:* SVG has no 3D rendering; `.gener8v/context.md` rules out WebGL and canvas, and NLC-REQ-035 and GSS-REQ-032 fix the viewpoint
  - *Impact:* NLC-REQ-034..038, GSS-REQ-023..029, GSS-REQ-032. Feasible for cubes, cylinders and axis lines; a rotatable view (PRD open question) would need a different approach

- **TC-011**: SVG text does not wrap; line breaking of long labels and titles must be computed by the package
  - *Rationale:* SVG 1.1 `<text>` has no automatic wrapping, and TC-001 forbids measuring
  - *Impact:* GSV-REQ-040, GSV-REQ-043, GSS-NFR-003, DGP-REQ-001 (category names)

## Compliance & Regulatory Constraints

- **CC-001**: Every runtime dependency, bundled asset (pictograph images, any font) and code copied into exported source must carry a license compatible with the package's open-source license (MIT assumed) and allow redistribution
  - *Rationale:* Open-source distribution (PRD goal; CPSE-REQ-037). A copyleft or non-redistributable component makes the package unpublishable under a permissive license, and exported files place the embedded material in consumers' repositories
  - *Impact:* CPSE-REQ-037, DGP-REQ-034, DGP-NFR-005, CPSE-REQ-021 (embedded images travel with exported files and need their notice), GSV-REQ-044 (a default font must be bundlable or the default must be a system font stack)

- **CC-002**: Rendered graphs must meet WCAG 2.1 Level AA for non-text content: a text alternative for every graph (1.1.1), at least 3:1 contrast for graphical objects needed to understand the graph (1.4.11), and color must not be the only means of telling elements apart (1.4.1)
  - *Rationale:* The intended consumers include public K-12 schools. In the United States, the Department of Justice's 2024 rule under ADA Title II requires state and local government web content, including public school materials, to conform to WCAG 2.1 AA (from April 2026 for entities serving 50,000 people or more, April 2027 for smaller ones); Section 508 applies the same standard to federal material. The package cannot make a consumer compliant, but a graph that fails these criteria makes compliance impossible
  - *Impact:* NLC-REQ-012, NLC-NFR-003, DGP-REQ-004, DGP-NFR-003, DGP-NFR-004, GSS-REQ-036, GSS-NFR-004, CPSE-REQ-012, GSV-NFR-004. Criterion 1.4.1 means line graphs with several series (DGP-REQ-013, DGP-REQ-014) need a non-color distinction such as different point markers or dash patterns, beyond the greyscale target of DGP-NFR-004

- **CC-003**: The package must not collect, transmit or store any data
  - *Rationale:* Consumers include school software that handles student data under FERPA, COPPA and state student-privacy laws. A library that sends nothing anywhere stays out of those obligations and out of districts' vendor data agreements; any data flow would pull every consumer into them
  - *Impact:* CPSE-REQ-005, CPSE-REQ-036; rules out remote image loading, remote fonts and usage telemetry

- **CC-004**: The published image set must not contain trademarked characters, logos or brand imagery
  - *Rationale:* A redistribution license for an image does not grant trademark rights; branded imagery in an educational package invites takedown requests
  - *Impact:* DGP-REQ-033, DGP-REQ-034

## Integration Constraints

- **IC-001**: Model tool-calling formats accept only a subset of JSON Schema, and the common subset requires the root of a tool's input schema to be a single object type
  - *Rationale:* As documented by the major providers in 2026: Anthropic's tool `input_schema` must be an object schema; OpenAI's function calling in strict mode requires an object root (no `anyOf` at the root), `additionalProperties: false` on every object, and every property listed as required (optional values expressed as a union with null); Google's function declarations use an OpenAPI-derived subset. A unified description published as a root-level `oneOf` over graph types, as GSV-REQ-008 implies, is rejected or downgraded by some of them. Provider documentation must be re-checked during Technical Design, because these limits change
  - *Impact:* CPSE-REQ-027, CPSE-REQ-028, CPSE-REQ-029, CPSE-NFR-004, GSV-REQ-007, GSV-REQ-008, GSV-REQ-009 (descriptions are preserved by all providers and are how a model learns the vocabulary)

- **IC-002**: Using the components as React Server Components rules out client-only features in the components themselves: no state, effects or event handlers, and no function-valued props passed across the server–client boundary
  - *Rationale:* React Server Components (used by Next.js App Router, the most common React deployment) render only on the server; callbacks cannot be serialized to the client
  - *Impact:* CPSE-REQ-011; CPSE-REQ-017 (an issue notification callback works within server or client code but cannot cross the boundary); conditional on whether server-component support is required (see OQ-004)

- **IC-003**: npm publishing with provenance requires publishing from a supported CI provider (GitHub Actions or GitLab CI) with OIDC trusted publishing configured for the package; a scoped package name (`@gener8v/...`) requires the scope's npm organization to exist and be controlled by the maintainers
  - *Rationale:* npm provenance and trusted-publishing documentation
  - *Impact:* CPSE-REQ-001, CPSE-NFR-008, CPSE-REQ-038

- **IC-004**: The HTML-to-PDF print pipelines curriculum teams use render SVG through a browser engine (headless Chrome and similar); renderers that do not use the DOM, such as `@react-pdf/renderer`, cannot render ordinary React SVG components at all
  - *Rationale:* `@react-pdf/renderer` has its own primitive components and does not accept DOM elements
  - *Impact:* PRD open question on print; CPSE-REQ-007; any print support claim must name browser-based pipelines only

## Operational Constraints

- **OC-001**: The project is maintained by a small team or a single maintainer, with best-effort support for outside users
  - *Rationale:* `.gener8v/context.md` (assumed). Regressions must be caught by automated checks, since there is no dedicated QA capacity and outside contributions will be reviewed by few people
  - *Impact:* every NFR verified "in CI": GSV-NFR-002, GSV-NFR-003, NLC-NFR-001, DGP-NFR-001, GSS-NFR-001, GSS-NFR-003, CPSE-NFR-001, CPSE-NFR-003, CPSE-NFR-005; the scope of the change (every graph type at Must)

- **OC-002**: Releases are published only by CI from tagged commits, never by hand
  - *Rationale:* Provenance (CPSE-NFR-008) attests only CI builds; a manually published version breaks the provenance chain and the contract that every release passed the checks
  - *Impact:* CPSE-NFR-008, CPSE-REQ-041, CPSE-REQ-042

- **OC-003**: Every published version stays installable; a release with a defect is fixed forward or deprecated, not removed
  - *Rationale:* npm allows unpublishing only within 72 hours and under conditions; published descriptions and exported files in consumers' projects depend on versions remaining available
  - *Impact:* CPSE-REQ-041..043

- **OC-004**: The CI test matrix must cover each supported React major version on each supported Node.js line (React 18 and 19 × Node.js 22 and 24)
  - *Rationale:* CPSE-NFR-003 requires every supported React major; TC-006 fixes the Node.js lines. The matrix multiplies CI time, which matters for a small team's feedback loop
  - *Impact:* CPSE-NFR-003, CPSE-NFR-005, NLC-NFR-002

- **OC-005**: The documentation site must be static and free to host, with every example rendered from the same build as the package
  - *Rationale:* No runtime service exists or is wanted (`.gener8v/context.md`); examples are validated in CI (CPSE-REQ-046)
  - *Impact:* CPSE-REQ-044..046

## Constraint Interactions

| Constraint | Interacts With | Nature of Interaction |
|------------|---------------|----------------------|
| TC-001 | TC-011 | Reinforcing — both force label layout from estimated text metrics |
| TC-001, TC-011 | GSS-NFR-003 | Conflicting — a no-overlap guarantee on every documented example is achievable only with conservative text-width estimates and generous spacing (RF-001) |
| TC-002 | TC-001 | Reinforcing — together they make output a pure, deterministic function of the description |
| TC-002 | NLC-NFR-001, DGP-NFR-001 | Conditional — the rounding precision must stay well below the 0.5 px accuracy targets |
| TC-003 | TC-009 | Conditional — exported components need unique ids without the package; React's `useId` is available to them as well |
| TC-008 | TC-007 | Conflicting — a schema library shared by every graph type adds its full size to the 25 kB single-type budget |
| IC-001 | TC-008 | Conflicting — the single definition must emit a provider-compatible schema (object root, closed objects) as well as the general published schema (RF-002) |
| IC-001 | GSV-REQ-008, CPSE-REQ-028 | Conflicting — a root-level union by graph type is not accepted by every provider; the tool schema needs an object root that contains the union |
| TC-009 | CC-001 | Conditional — embedded images copied into consumer source must carry their license notice |
| TC-009 | TC-007 | Reinforcing — both favour a geometry layer separate from React components |
| CC-002 | DGP-NFR-004 | Reinforcing — WCAG 1.4.1 goes further than greyscale distinctness and requires a non-color cue between series |
| CC-001, CC-004 | DGP-REQ-033 | Reinforcing — together they bound what the published image set may contain |
| IC-002 | CPSE-REQ-017 | Conditional — a callback prop works only when the component and its caller are on the same side of the server–client boundary |
| OC-001 | Change scope | Conflicting — every graph type, source export, the model tool and documentation are all Must for a small team (RF-005) |
| OC-004 | OC-001 | Conflicting — a four-cell CI matrix lengthens feedback for a small team; mitigated by running the full matrix only on release branches and pull requests to main |

## Risk Flags

- **RF-001**: Label overlap cannot be guaranteed by measurement, only by layout rules with estimated text widths, so GSS-NFR-003 may fail on fonts wider than estimated or on long custom labels
  - *Related Constraints:* TC-001, TC-011
  - *Severity:* Medium
  - *Recommendation:* In Technical Design, decide on a fixed default font stack with known average character widths, a conservative width estimate, and documented label placement rules; scope GSS-NFR-003 to the default font and documented examples

- **RF-002**: The model tool's input schema, derived from the unified description, may be rejected or silently weakened by some providers if it uses a root-level union, open objects or optional properties
  - *Related Constraints:* IC-001, TC-008
  - *Severity:* High
  - *Recommendation:* In Technical Design, decide the tool schema shape (for example, an object root with the graph description as one property whose value is a union by graph type), and add a CI check that validates the tool schema against each target provider's documented subset; answer PRD open question on target tool formats first

- **RF-003**: Floating-point differences between JavaScript engines can produce hydration mismatches and unequal exported markup, which appear only in some browsers and are hard to reproduce
  - *Related Constraints:* TC-002, TC-001
  - *Severity:* Medium
  - *Recommendation:* Round every emitted coordinate and derived display value to a fixed precision in one shared formatting function; test output equality across engines (Node.js and a WebKit-based browser) in CI

- **RF-004**: The pictograph image set may not fit the bundle budget or the license rules: sourcing a set of clean, redistributable, non-branded images is a content task outside engineering
  - *Related Constraints:* CC-001, CC-004, TC-007, TC-009
  - *Severity:* Medium
  - *Recommendation:* Use small inline SVG images, each in its own module so only the images used are bundled; commission or draw the set under the package license, or take it from a public-domain (CC0) source with recorded provenance; resolve PRD open question on who supplies images

- **RF-005**: Every graph type, the model tool, source export, server rendering and documentation are all at Must for a team of one or few
  - *Related Constraints:* OC-001, OC-004
  - *Severity:* High
  - *Recommendation:* Keep the Must cut, but have Dependencies sequence the work so that a shared geometry, formatting and validation core ships first, and each graph type is then a thin, independently releasable addition; reconsider change-brief OQ-005 (whether anything can move to a later tier) after Technical Design sizes the work

## Open Questions

- [ ] **OQ-001**: Which open-source license applies? MIT is assumed throughout; Apache-2.0 would add a patent grant and a NOTICE requirement that exported files would also carry (Carried from PRD)
- [ ] **OQ-002**: Which tool-calling formats must the tool schema be verified against (for example Anthropic, OpenAI strict mode, Google), and is a single schema that satisfies all of them acceptable, or are per-provider variants wanted? (Carried from PRD)
- [ ] **OQ-003**: What is the npm package name, and does the gener8v npm organization exist for a scoped name?
- [ ] **OQ-004**: Must the components work as React Server Components without a client boundary? This decides whether the issue callback (CPSE-REQ-017) needs a server-friendly alternative
- [ ] **OQ-005**: Which print pipelines must be supported (browser print, headless-Chrome PDF, commercial HTML-to-PDF renderers)? (Carried from PRD)
- [ ] **OQ-006**: Is a bundled default font wanted (for consistent metrics, which helps RF-001), or a system font stack (no license or size cost, less predictable widths)?
- [ ] **OQ-007**: Should releases start at 0.x, where breaking changes to the description are allowed in minor versions, until the description is considered stable? This relaxes CPSE-REQ-043 during early development

## Assumptions

- Assumption: The *assumed* entries in `.gener8v/context.md` hold: TypeScript, React 18 and 19 as peers, SVG rendering, GitHub Actions, pnpm
- Assumption: The intended consumers include public schools in the United States, so ADA Title II and WCAG 2.1 AA are the relevant accessibility baseline; consumers elsewhere have comparable obligations (for example EN 301 549 in the EU)
- Assumption: Provider tool-schema limits stated in IC-001 reflect provider documentation as of 2026 and will be re-verified in Technical Design
- Assumption: No consumer needs the package to run in a browser without a bundler (for example, from a script tag)
