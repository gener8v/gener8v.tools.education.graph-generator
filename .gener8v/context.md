# System Context

> Written by Planning on 2026-10-04 from the Product Owner's stated intent. Items marked *(assumed)* are inferences, not decisions; Constraints and Technical Design should confirm or overturn them and record the result as constraints (TC/OC-XXX) or decisions (AD-XXX).

## What this is

An open-source npm package that turns a single unified JSON description of a mathematical figure into a React component. It serves curriculum authors (people writing lessons, worksheets and assessments) and authoring tools, including language-model assistants that call it as a tool. It is a library, not a service: it has no server, no database, no user accounts and no network calls at runtime.

## Organisation and team

- Owner: gener8v (repository naming `gener8v.tools.education.*` suggests a family of education tools) *(assumed)*
- Team: a small team or a single maintainer, with outside contributors expected once public *(assumed)*
- Distribution: public npm registry; source in a public Git repository with a public issue tracker *(assumed: GitHub)*
- License: open source — a permissive license (MIT) *(assumed; PRD open question)*

## Technology stack *(assumed unless stated)*

| Concern | Choice | Notes |
|---|---|---|
| Language | TypeScript (strict) | Typed props and a typed description are the main developer surface; types ship with the package |
| UI | React, as a peer dependency (18 and 19) | Stated by the Product Owner: output is React components |
| Rendering | SVG produced by the components themselves | Scales cleanly, prints well, works with server rendering, needs no canvas or WebGL. 3D graphs and solids use a fixed projection drawn in SVG unless OQ-003 asks for rotation |
| Description schema | One schema as the single source of truth, from which TypeScript types, runtime validation and the published JSON Schema are all generated | JSON Schema is the format model tool-calling expects |
| Model tool | A provider-neutral tool definition (name, description, JSON Schema input) plus a handler function | No model SDK as a dependency; the consuming application runs the model |
| Source export | A function that prints a standalone `.tsx` component from a description | Exported file must not import this package at runtime |
| Package format | ES modules first, with type declarations; tree-shakable per graph type | Small install footprint for consumers who use one graph type |
| Package manager | pnpm | |
| Build | tsup (or equivalent bundler for libraries) | |
| Tests | Vitest + React Testing Library; snapshot or visual tests of rendered SVG; property tests for derived values (e.g. circle radius ↔ diameter ↔ circumference) | Mathematical correctness is the main correctness risk |
| Docs / examples | A component catalogue (e.g. Storybook) with one working example per graph type, published as a static site | PRD requires a working example of every graph type |
| CI | GitHub Actions: lint, typecheck, test, build on every pull request; publish to npm with provenance from tagged releases | |
| Versioning | Semantic versioning, changelog generated from changes | The JSON description is a public contract; breaking it is a major version |

## Runtime environments

- Browsers that current React supports
- Server rendering (React server rendering, static site generation) — the components should not depend on browser-only APIs during render
- Print and PDF pipelines used for worksheets *(assumed; PRD open question on print and greyscale)*
- Node.js for the entry function, schema validation, tool handler and source export (no React DOM needed to validate or export)

## Constraints the team already knows

- No runtime network access and no telemetry — required for school and offline use and for an open-source library's trust *(assumed)*
- Pictograph images must be licensed for redistribution under terms compatible with the package license if the package ships them (OQ-001)
- Accessibility matters for education materials: each figure should carry a text alternative and readable contrast (PRD open question; likely an NFR)
- The unified JSON description, the vocabulary and the tool definition are public interfaces: changes need to stay backward compatible or carry a version

## Repositories

| Directory | Purpose | Language / build | Verify commands |
|---|---|---|---|
| `.` | The graph generator package: unified description schema, validation, React graph components, tool definition and handler, source export, docs | TypeScript, React, pnpm, tsup *(assumed)* | `pnpm lint && pnpm typecheck && pnpm test && pnpm build` *(to be created in the first delivery)* |
