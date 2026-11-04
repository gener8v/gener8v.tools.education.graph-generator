# Curricular Graph Generator — Technical Design

## Overview

One open-source TypeScript package, built as a pipeline of pure stages: **description → validate and normalize → lay out into a Scene → render or print**. A single in-house definition per graph type is the source of the TypeScript types, the runtime validator, the published JSON Schema, the vocabulary and the model tool schema. Layout turns a normalized description into a framework-neutral Scene of SVG primitives with every number already rounded. React components and the source exporter both just print that Scene, so server output, browser output and exported files are identical by construction. The decisions with the widest effect are: the definition format and staged validator (AD-003, AD-004); the Scene boundary (AD-002); SVG drawn with no id references, no measuring and no stylesheets (AD-008, AD-010, AD-011); one isometric projection for every 3D figure (AD-009); and a strict-profile tool schema with an object root (AD-006).

## Source Context

**Specifications Analyzed:** `.gener8v/specifications/graph-specification-and-vocabulary.md`, `.gener8v/specifications/number-lines-and-coordinate-graphs.md`, `.gener8v/specifications/data-graphs-and-pictographs.md`, `.gener8v/specifications/geometric-shapes-and-solids.md`, `.gener8v/specifications/component-packaging-and-source-export.md` (all Approved)
**Constraints Analysis:** `.gener8v/constraints/prd.md` (Approved)
**Dependency Map:** `.gener8v/dependencies/dependency-map.md` (Approved)
**System Context:** `.gener8v/context.md`
**Status:** Approved
**Approved by:** Architect — Thomas Eaves, 2026-11-04

Starting point (Process step 1b): the repository holds only `.gener8v/` and `CLAUDE.md`. No code, build, CI or package exists, so this design assumes no existing infrastructure; everything it names is created by tickets. Single repository: every path below is relative to the repository root.

## Architecture Decisions

### AD-001: One package with separate entry points for rendering and non-rendering use

**Context:** CPSE-REQ-001 requires one package name. Validation, the tool handler and source export must run in Node.js without React DOM (GSV-REQ-026, CPSE-REQ-006, prd/TC-005), and a consumer importing one graph type must not pay for the others (CPSE-REQ-004, prd/TC-007).
**Decision:** Publish a single ES-module-only package (working name `@gener8v/graph-generator`, TQ-001) with `sideEffects: false` and these entry points in its `exports` map:
- `.` — the `Graph` entry component and every per-type component (React)
- `./<type>` — one per graph type, for example `./circle`, `./number-line` (React)
- `./core` — `validate`, `normalize`, `getSchema`, `getVocabulary`, `describe` (text alternative); no React import
- `./tool` — `graphTool` definition and `handleGraphToolCall`; no React import
- `./export` — `exportSource`; no React import
- `./schema.json`, `./vocabulary.json` — static files (GSV-REQ-010)
- `bin`: `graph-generator` command line (CPSE-REQ-026)
**Rationale:** One name, one version and one changelog suit a small team (prd/OC-001). Entry points give the Node-only and tree-shaking boundaries without the cost of a monorepo. Node.js 22+ loads ES modules from CommonJS, so ES-only still serves CommonJS consumers (prd/TC-006).
**Alternatives Considered:**
- Several packages (`core`, `react`, `tool`) in a monorepo — clean boundaries, but several versions to keep in step and against CPSE-REQ-001
- Dual ES module and CommonJS builds — doubles the build matrix and risks loading two copies of the package; unnecessary on Node.js 22+
**Consequences:** `src/core`, `src/tool` and `src/export` must never import `react-dom` or browser globals; a lint rule enforces this. The entry component imports every graph type by design (budget CPSE-NFR-002: ≤ 120 kB).
**Requirements Affected:** CPSE-REQ-001, CPSE-REQ-002, CPSE-REQ-003, CPSE-REQ-004, CPSE-REQ-006, CPSE-REQ-026, GSV-REQ-010, GSV-REQ-026

### AD-002: A framework-neutral Scene between layout and rendering

**Context:** Server output, browser output and exported source must produce identical markup (CPSE-REQ-011, CPSE-REQ-020, CPSE-NFR-001, CPSE-NFR-005). Exported source may depend only on React (CPSE-REQ-021, prd/TC-009). Export runs in Node.js without React DOM (prd/TC-005).
**Decision:** Each graph type has a pure `layout(normalized) → Scene` function. A Scene is plain data: a fixed coordinate space (`viewBox`), the text alternative, and a tree of SVG primitives (`line`, `polyline`, `polygon`, `path`, `circle`, `ellipse`, `rect`, `text`, `group`, `svg` for clipping) whose attributes are final strings and numbers, already rounded (AD-007). The React `SceneSvg` component maps nodes one-to-one to SVG elements. The exporter prints the same nodes as JSX text with the same attributes in the same order.
**Rationale:** Markup equality becomes a property of one small printer pair, not of eleven renderers. Layout is testable as data: geometry NFRs (NLC-NFR-001, DGP-NFR-001, GSS-NFR-001, GSS-NFR-003) assert against Scene coordinates without a DOM. Export needs no React rendering.
**Alternatives Considered:**
- Renderers written directly as React components, export by rendering to static markup and converting HTML to JSX — needs React DOM in export, and HTML-to-JSX conversion is fragile (attribute names, entities)
- Exported files that bundle a copy of the renderer — larger files, duplicated code, and equality still has to be tested per type
**Consequences:** Layout code never touches React. Anything that cannot be expressed as SVG primitives with final values (interactivity, measuring) is out of reach, which the PRD already excludes. The Scene node set is an internal contract (RES-001's rendering side) and changes to it touch the printer pair only.
**Requirements Affected:** CPSE-REQ-007, CPSE-REQ-010, CPSE-REQ-011, CPSE-REQ-019, CPSE-REQ-020, CPSE-REQ-021, CPSE-REQ-022, NLC-REQ-007, DGP-REQ-036, GSS-REQ-030

### AD-003: An in-house definition format as the single source of truth

**Context:** GSV-REQ-015 requires the vocabulary, schema and validation rules to come from one definition. The schema must be emitted in two profiles (AD-006). Issues need custom codes, paths, plain-English messages and suggestions (GSV-REQ-029..032). Runtime dependencies must be zero or justified (CPSE-NFR-007) within a 25 kB per-type budget (CPSE-NFR-002, prd/TC-008).
**Decision:** Each graph type is a `GraphTypeDefinition` object in `src/core/definitions/<type>.ts`: its `type` value and description; a `properties` map of `PropertySpec` (vocabulary term, value kind, range, required flag, description, applicable presentation option); its `derivations` (groups of mutually determining values with formulas, GSV-REQ-035); its `checks` (domain checks returning issues); and `describe` (text alternative). Shared presentation properties are defined once in `src/core/definitions/shared.ts`. A build script `scripts/generate.ts` reads the definitions and writes `src/generated/description.ts` (TypeScript types), `dist/schema.json`, the tool schema, `dist/vocabulary.json` and documentation tables. At runtime the validator reads the same definition objects. CI fails if generated files are out of date.
**Rationale:** Structural schema libraries cover only the shape; the derivations, contradiction checks, suggestions and messages are custom either way. Owning the definition format gives exact control of both schema profiles and of issue wording, and adds no runtime dependency.
**Alternatives Considered:**
- Zod 4 with its JSON Schema output — mature and type-inferring, but issue objects must be re-mapped to GSV's format, the strict tool profile still needs post-processing, and it is a runtime dependency counted against every graph type's budget
- TypeBox (schemas are JSON Schema) — natural fit for the published schema, but the same re-mapping and profile work, and its fast validator compiles code at runtime, which strict Content Security Policies in school deployments block
- Hand-written JSON Schema plus separate hand-written TypeScript types — three sources that drift, against GSV-REQ-015
**Consequences:** The team owns a small schema generator and structural validator (TR-006). Its correctness is checked by GSV-NFR-002 (meta-schema) and GSV-NFR-003 (agreement property test). Adding a graph type means adding one definition, one layout and one example.
**Requirements Affected:** GSV-REQ-007, GSV-REQ-008, GSV-REQ-009, GSV-REQ-011, GSV-REQ-012, GSV-REQ-013, GSV-REQ-014, GSV-REQ-015, GSV-REQ-035, NLC-REQ-001, CPSE-REQ-028

### AD-004: A staged validator that collects every issue without cascading

**Context:** All problems must be reported in one pass (GSV-REQ-017), but a missing graph type makes type-specific checks meaningless (GSV Behaviors & Rules), and a wrong-kind radius should not also produce a contradiction with its diameter.
**Decision:** `validate(input)` runs four stages:
1. **Envelope** — input is an object; `type` present and known; `version` supported. Failure stops here (`not_an_object`, `unknown_graph_type`, `unsupported_version`).
2. **Structure** — for every property: unknown or inapplicable (with suggestion, below), wrong kind, out of range; every missing required property. All collected.
3. **Derivation** — for each derivation group whose members passed stage 2: pick the defining value (the documented order: radius, then diameter, then circumference, and similar per group), derive the rest, check each supplied dependent value within 1% relative (GSV Behaviors & Rules). Contradictions name every member.
4. **Domain** — the type's `checks` on members that passed stage 2 (triangle inequality, ticks count, points outside range, series length, unknown image and so on).
The result is `{ valid: true, description, provenance }` or `{ valid: false, issues }`. Unknown-property suggestions use Damerau–Levenshtein distance against the type's applicable terms, suggesting the closest when the distance is ≤ 2 or ≤ a third of the term's length; otherwise the issue lists the applicable terms.
**Rationale:** Every independent problem is reported, but no issue is a consequence of another; a model fixing the reported issues does not chase phantom ones.
**Alternatives Considered:**
- Stop at first error — against GSV-REQ-017
- Run every check on every value — produces cascades (a non-numeric radius reported as also contradicting the diameter)
**Consequences:** The order of stages and the defining-value order are documented behavior; tests pin them.
**Requirements Affected:** GSV-REQ-016..025, GSV-REQ-027..029, GSV-REQ-036..038, NLC-REQ-008..010, NLC-REQ-020, NLC-REQ-033, DGP-REQ-007, DGP-REQ-008, DGP-REQ-016, DGP-REQ-021, DGP-REQ-029..031, GSS-REQ-015..019

### AD-005: Description naming — `type` values in kebab case, properties in camel case

**Context:** GSV OQ-001 left the property-name style open. Names are part of the public contract (CPSE-REQ-042) and of the model tool, and must read as plain-English nouns (GSV-REQ-012).
**Decision:** The graph-type field is `type`, with values `number-line`, `xy-graph`, `xyz-graph`, `line-graph`, `bar-graph`, `pictograph`, `circle`, `square`, `triangle`, `cube`, `cylinder`. Property names are camel-cased noun phrases: `radius`, `diameter`, `circumference`, `sideLength`, `edgeLength`, `height`, `lineColor`, `lineLabel`, `xAxis`, `points`, `tickSpacing`, `unitImage`, `unitValue`. The optional schema version is `version`, an integer, currently `1`. Issue paths are JSON Pointers (RFC 6901), for example `/points/2/x`.
**Rationale:** Camel case is what JavaScript and model tool-calling conventions expect, needs no quoting in code, and still reads as English. JSON Pointer is a standard path syntax a model can map back to its input.
**Alternatives Considered:**
- Names with spaces (`"line color"`) — closer to prose, but awkward in TypeScript, unusual in tool schemas, and easy to mistype
- Snake case — common in Python tooling, unidiomatic for a React package
**Consequences:** Resolves GSV OQ-001 subject to Product Owner confirmation (TQ-003). Each rendering area's terms follow this style.
**Requirements Affected:** GSV-REQ-002, GSV-REQ-003, GSV-REQ-006, GSV-REQ-012, GSV-REQ-029

### AD-006: Two schema profiles — published and strict tool profile with an object root

**Context:** The published schema selects parameters by graph type (GSV-REQ-008). Provider tool formats need an object root, closed objects, and (OpenAI strict mode) every property listed as required with optional values expressed as nullable (prd/IC-001, prd/RF-002). The tool schema must be derived, not maintained (CPSE-REQ-028).
**Decision:** `scripts/generate.ts` emits:
- **Published schema** (`schema.json`, JSON Schema 2020-12): root `anyOf` of one closed object per graph type, each with `type` as a `const`; optional properties are simply not required. Because the `type` constants are disjoint, `anyOf` behaves as `oneOf` and works in more validators.
- **Tool schema** (`graphTool.inputSchema`): root `{ type: "object", properties: { graph: <anyOf as above> }, required: ["graph"], additionalProperties: false }`, in the strict profile — every object closed, every property listed under `required`, optional properties typed as `[<kind>, "null"]`. No `oneOf`, `if`/`then`, `patternProperties` or format keywords.
The tool handler unwraps `graph` and removes `null`-valued optional properties before validation.
**Rationale:** One generated schema in the strict profile, with no per-provider adapters (CPSE-REQ-029). The published schema stays idiomatic for everyone else. *(amended 2026-11-04 by graph-library, CPSE TICKET-007 reconciliation, TQ-002)* The documentation re-check of 2026-11-04 found the schema accepted by Anthropic's default `input_schema`, by OpenAI function calling with `strict: true` (Chat Completions and Responses; `maxLength` and `title` are not in its documented keyword list) and, as far as documented, by Gemini's `parametersJsonSchema`. It does not fit Anthropic's `strict: true` subset (`maxLength`, `minimum`, `maximum` and `maxItems` unsupported; at most 16 `anyOf` or type-array parameters, where this schema has about 140), nor, probably, Gemini's OpenAPI-subset `parameters` and Vertex AI (type arrays rather than `nullable`; no `additionalProperties`). Those two modes are documented as unsupported rather than served by an adapter; whatever a provider enforces, the handler's `validate` is the gate.
**Alternatives Considered:**
- One schema for both purposes — either the published schema carries nullable noise, or the tool schema is rejected by strict providers
- Per-provider adapters — more code and more to keep current; CPSE-REQ-029 prefers provider-neutral
- Separate tools per graph type — avoids the union, but eleven tools with overlapping vocabulary, and against GSV-REQ-004's single entry
**Consequences:** In the tool path, `null` means "absent" for optional properties; the published path rejects `null` where the property kind does not allow it. Provider limits must be re-checked against current documentation, and CI validates the tool schema against fixtures of each supported mode's documented rules (TR-001, TQ-002). The package documents the supported modes — Anthropic `input_schema` without `strict`, OpenAI `strict: true`, Gemini `parametersJsonSchema` — and the two unsupported ones.
**Requirements Affected:** GSV-REQ-004, GSV-REQ-007, GSV-REQ-008, GSV-REQ-011, CPSE-REQ-027, CPSE-REQ-028, CPSE-REQ-029, CPSE-REQ-030

### AD-007: A fixed drawing space and one rounding function for every emitted number

**Context:** Engine-dependent floating-point results can print differently on the server and in the browser (prd/TC-002, prd/RF-003). Accuracy targets are 0.5 px (NLC-NFR-001, DGP-NFR-001) and 1% for ratios (GSS-NFR-001).
**Decision:** Every Scene uses a coordinate space 400 units wide, with height set by the graph's aspect ratio; the component scales it to its container with `viewBox` and `width="100%"` (CPSE-REQ-013). Every number written into a Scene passes through `fmt()` in `src/layout/kit/format.ts`, which rounds to 2 decimal places (`Math.round(x * 100) / 100`, with negative zero normalized to zero) and relies on JavaScript's number-to-text conversion, which the language defines exactly. Displayed measurement values use a separate `displayValue()` with the documented display precision (GSS-REQ-034).
**Rationale:** Rounding at 0.01 units of a 400-unit space is far inside the accuracy targets, and removes almost all engine-dependent digits. Scaling by `viewBox` needs no measuring (prd/TC-001).
**Alternatives Considered:**
- A deterministic in-house trigonometry library — removes the residual risk entirely, but is significant code for a very rare case
- Pixel coordinates from the container size — requires measuring, against prd/TC-001
**Consequences:** A value that lands exactly on a rounding boundary can still round differently in two engines; the chance is negligible, and a cross-engine test covers it (TR-002). Lint forbids writing numbers into a Scene without `fmt()`.
**Requirements Affected:** CPSE-REQ-011, CPSE-REQ-013, NLC-REQ-007, DGP-REQ-036, GSS-REQ-030, GSS-REQ-031, GSS-REQ-034

### AD-008: SVG with no id references

**Context:** Ids must be unique per instance and identical across server and browser (prd/TC-003); React's `useId` output format differs between React versions, and exported components would need the same scheme (RES-007).
**Decision:** Scenes use no element ids and no `url(#…)` references. Arrowheads are drawn as small polygons, not `<marker>`s. Partial pictograph images are clipped with a nested `<svg>` whose width is the remaining fraction (nested SVG viewports clip by default), not `<clipPath>`. The accessible name is given by `role="img"`, `aria-label` set to the text alternative, and a `<title>` child — no `aria-labelledby`.
**Rationale:** Removes the whole class of id-collision and id-format problems, for runtime and exported components alike, and keeps components free of hooks.
**Alternatives Considered:**
- `useId` with prefixed ids — works, but adds a hook to every component, depends on React's id format, and must be replicated in exported files
- Counter-based ids — differ between server and browser render order
**Consequences:** Gradients and patterns (which need ids) are not available; nothing in the specifications needs them. Dash patterns and markers for series (AD-011) are drawn directly.
**Requirements Affected:** NLC-REQ-016, DGP-REQ-028, CPSE-REQ-011, CPSE-REQ-012, CPSE-REQ-021, NLC-REQ-012, DGP-REQ-004, GSS-REQ-036

### AD-009: One isometric projection for every 3D figure

**Context:** x,y,z graphs (NLC-REQ-035) and the cube and cylinder (GSS-REQ-032) need a fixed viewpoint, shared by both solids; GSS-REQ-030 requires drawn length ratios to equal measurement ratios. SVG has no 3D (prd/TC-010).
**Decision:** Use true isometric projection (the three axes drawn 120° apart, equally foreshortened) for x,y,z graphs, cubes and cylinders, implemented once in `src/layout/kit/isometric.ts`. Cylinders stand upright; their circular faces project to ellipses with a minor-to-major ratio of about 0.577. Hidden edges are computed analytically per solid (GSS-REQ-024, GSS-REQ-028).
**Rationale:** Isometric is the only common parallel projection that foreshortens all three axes equally, so measurements along the axes keep their ratios (a cube's edges all draw the same length), which satisfies GSS-REQ-030 and GSS-NFR-001. One projection gives a curriculum one 3D convention (dependency-map RES-003).
**Alternatives Considered:**
- Oblique (cabinet) projection, common for cubes in textbooks — halves depth, so drawn ratios differ from measurement ratios, against GSS-REQ-030
- Dimetric or trimetric projections — unequal foreshortening, same problem
- A rotatable view — needs interaction or WebGL; excluded by the fixed-viewpoint requirements
**Consequences:** Proportion tests compare lengths along projected axes after removing the single isometric scale factor. If the Product Owner prefers the oblique textbook look, only `isometric.ts` and GSS-REQ-030's wording change (TR-005, TQ-004).
**Requirements Affected:** NLC-REQ-034..038, GSS-REQ-023..029, GSS-REQ-030, GSS-REQ-032

### AD-010: System font stack and estimated text metrics for label layout

**Context:** Text cannot be measured during render (prd/TC-001), SVG text does not wrap (prd/TC-011), and labels must not overlap (GSS-NFR-003, prd/RF-001). A bundled font would add size and license obligations (prd/CC-001).
**Decision:** The default style uses a system sans-serif stack (`system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`). `src/layout/kit/text.ts` estimates text width from a per-character width table taken from Helvetica/Arial metrics, multiplied by a safety factor of 1.1, and breaks long labels and titles into lines on word boundaries. `src/layout/kit/labels.ts` places each label at the first of an ordered list of candidate positions whose estimated box overlaps no placed label or figure line.
**Rationale:** No size or license cost; estimated metrics with a margin are conservative for common sans-serif fonts; one shared placer gives every area the same behavior (dependency-map RES-005).
**Alternatives Considered:**
- Bundling an open font (for example, an OFL-licensed sans-serif) — exact metrics, but tens of kilobytes, license notices in exported files, and overriding consumers' typography
- Measuring after mount and re-laying out — hydration mismatch and a visible jump
**Consequences:** GSS-NFR-003 is verified on estimated boxes with the default font. Consumers who apply a much wider font may see crowding (TR-003). Resolves constraints OQ-006 subject to confirmation.
**Requirements Affected:** GSV-REQ-043, GSV-REQ-044, NLC-REQ-006, NLC-REQ-019, DGP-REQ-001, DGP-REQ-020, GSS-REQ-006, GSS-REQ-020, GSS-REQ-033

### AD-011: Inline presentation attributes and an accessible default palette with non-color cues

**Context:** Output must look the same server-side, in print and in exported files, without stylesheets (CPSE-REQ-021). Default colors need 3:1 contrast (GSV-NFR-004), greyscale distinction (DGP-NFR-004), and color must not be the only cue between series (prd/CC-002).
**Decision:** All styling is written as SVG presentation attributes (`stroke`, `fill`, `stroke-width`, `font-size`, `stroke-dasharray`) from the default style in `src/core/style.ts`; no CSS files, CSS-in-JS or class names. The default series palette is drawn from the Okabe–Ito color-blind-safe palette, adjusted where needed to reach 3:1 against white. Each default series also gets a distinct point-marker shape (circle, square, triangle, diamond, cross, star) and dash pattern. The named-color list maps plain-English names to fixed hex values.
**Rationale:** Presentation attributes need no stylesheet, print reliably, and survive copying into exported files. Marker shapes and dash patterns satisfy WCAG 1.4.1 without relying on color.
**Alternatives Considered:**
- CSS classes with a shipped stylesheet — consumers must import CSS; exported files would need it too
- CSS custom properties for theming — useful later, but adds a styling surface the specifications do not require
**Consequences:** Theming beyond per-element colors is a future feature. The palette is a shared resource (RES-004); contrast and greyscale checks run on it in CI.
**Requirements Affected:** GSV-REQ-040, GSV-REQ-042, GSV-REQ-044, GSV-REQ-045, DGP-REQ-011, DGP-REQ-013, DGP-REQ-014, CPSE-REQ-021

### AD-012: Pictograph images as in-house inline SVG drawings bundled with the pictograph type

**Context:** Images are chosen by name from a published set (DGP-REQ-024, DGP-REQ-033), must be redistributable and unbranded (prd/CC-001, prd/CC-004), cannot be fetched at runtime (prd/CC-003), must be embeddable in exported source (prd/TC-009), and fit the budget (CPSE-NFR-002).
**Decision:** Each image is a small vector drawing stored as Scene nodes in its own normalized coordinate space, in `src/images/<name>.ts`, with its name, description and license recorded in `src/images/manifest.ts`. The pictograph layout places copies of the image's nodes; export inlines them. The initial set is drawn in-house and released under the package license. The set is kept small (at most 20 images) so that the pictograph type, which must include every image because names arrive at runtime, stays within 25 kB.
**Rationale:** Vector drawings are tiny, scale cleanly, print well, need no network and no id references, and are owned outright.
**Alternatives Considered:**
- Raster images (PNG) — large, blurry when scaled, and must be embedded as data in exported files
- Consumer-supplied image URLs — runtime fetching (against prd/CC-003) and unverifiable licenses; may be added later as an opt-in (DGP OQ-001)
- Emoji characters — rendering differs by platform and some emoji designs are licensed restrictively
**Consequences:** Someone must draw the images (dependency-map EXT-001, RD-002). The image list becomes part of the public contract once released.
**Requirements Affected:** DGP-REQ-023..028, DGP-REQ-031, DGP-REQ-033, DGP-REQ-034, DGP-REQ-035, DGP-REQ-037

### AD-013: Source export prints the Scene as one TypeScript component file

**Context:** Exported source must render the same graph with no inputs and no dependency except React, and record its origin (CPSE-REQ-019..025); export is also a command (CPSE-REQ-026).
**Decision:** `exportSource(description, { componentName? })` validates, lays out and prints a `.tsx` file: a header comment with the package version and the description as JSON (CPSE-REQ-023), then `export function <Name>() { return (<svg …>…</svg>); }` generated from the Scene by the printer that mirrors `SceneSvg`. The default component name is the graph type in PascalCase plus `Graph` (for example `CircleGraph`). An invalid description returns its issues and no source (CPSE-REQ-025). The command `graph-generator export <file.json> [--out <file.tsx>] [--name <Name>]` wraps it. Exported components have no hooks, so they also work as React Server Components.
**Rationale:** A static component is the simplest file to commit and review; TypeScript output is valid input for most React toolchains.
**Alternatives Considered:**
- Exporting the description plus a small embedded renderer — larger, and the embedded renderer drifts from the package
- JavaScript (`.jsx`) only — loses nothing at runtime, but TypeScript projects are the common case; a `.jsx` option can be added (TQ-005)
**Consequences:** CPSE-NFR-001 is verified by rendering the package component and the compiled exported component to static markup and comparing the strings.
**Requirements Affected:** CPSE-REQ-019..026, CPSE-NFR-001

### AD-014: Pure components; invalid descriptions handled through a fallback that receives the issues

**Context:** Components must render on the server and in the browser with identical output (CPSE-REQ-011), should work as React Server Components (prd/IC-002), never throw on an invalid description (CPSE-REQ-018), and must let the consumer choose the invalid-case output and receive the issues (CPSE-REQ-014..017).
**Decision:** Components are pure functions with no state, effects or hooks. `Graph` and each per-type component accept `description`, optional `textAlternative`, and `fallback`: `"placeholder"` (default; a visible box listing the issue messages), `"none"`, or a function `(issues) => ReactNode`. The function form is the consumer-supplied notification of CPSE-REQ-017: it receives the issues during render with no side effect. Consumers who need a side effect (logging) call `validate()` from `./core` themselves.
**Rationale:** A render-function fallback delivers the issues without a side effect in render and without a client boundary, so components stay usable as Server Components (prd/IC-002).
**Alternatives Considered:**
- An `onIssues` callback invoked during render — a side effect in render, called twice under React's strict mode
- An `onIssues` callback invoked from an effect — needs a client component, against prd/IC-002
- Throwing to an error boundary — against CPSE-REQ-018
**Consequences:** CPSE-REQ-017's "notification" is met by the fallback function; if the Product Owner reads it as requiring a callback, a client-only wrapper component can add one later without changing the core components (TR-007).
**Requirements Affected:** CPSE-REQ-008, CPSE-REQ-011, CPSE-REQ-012, CPSE-REQ-014..018

### AD-015: Model tool definition and handler

**Context:** CPSE-REQ-027..036: a provider-neutral tool definition, a handler that accepts an object or JSON text, returns success or structured issues with a text summary, never throws, and never calls a model.
**Decision:** `./tool` exports `graphTool = { name: "generate_graph", description, inputSchema }` (inputSchema per AD-006) and `handleGraphToolCall(input: unknown) → ToolResult`. The handler parses text input (`invalid_json` issue on failure), unwraps `graph`, removes nulls from optional properties, validates, and returns `{ ok: true, description, provenance, summary }` or `{ ok: false, issues, summary }`. `summary` is plain text for returning to the model: the text alternative on success, a numbered issue list on failure. The whole handler is wrapped so that an unexpected internal error becomes an `internal_error` issue, never an exception. Documentation shows how to pass `graphTool` to Anthropic, OpenAI and Google APIs in a few lines each, without depending on their software.
**Rationale:** Satisfies every handler requirement with no provider dependency; the summary gives the model the same feedback a person would read.
**Alternatives Considered:**
- Returning rendered markup in the tool result — useful to applications without React, but large in a model's context; kept as an open question (CPSE OQ-006)
**Consequences:** `internal_error` is added to the issue-code set and treated as a defect to report.
**Requirements Affected:** CPSE-REQ-027..036, CPSE-NFR-004, CPSE-NFR-006

### AD-016: Toolchain, checks and release process

**Context:** Small team, every NFR verified automatically (prd/OC-001), React 18/19 × Node.js 22/24 matrix (prd/OC-004), provenance publishing from CI only (prd/OC-002, prd/IC-003), changelog and semantic versioning (CPSE-REQ-041..043).
**Decision:** TypeScript (strict), pnpm, tsup (ES module output plus type declarations), Vitest with React Testing Library, fast-check for property tests, Playwright (Chromium and WebKit) for hydration and cross-engine equality, axe-core for accessibility rules, size-limit for bundle budgets, publint and Are-The-Types-Wrong for package correctness, Changesets for versions and changelog, ESLint with import-boundary rules. Documentation is a Storybook static site built from `examples/*.json` and published to GitHub Pages. GitHub Actions runs the matrix on pull requests and publishes to npm with provenance through trusted publishing from version tags. Releases start at `0.x` until the description contract is declared stable at `1.0.0`.
**Rationale:** Mainstream, well-maintained, development-only tools; none becomes a runtime dependency. Starting at `0.x` follows semantic versioning's rule for initial development and lets the contract settle.
**Alternatives Considered:**
- A custom documentation site — more work than Storybook for per-type examples
- Starting at `1.0.0` — every early correction to the contract would need a major release (CPSE-REQ-043)
**Consequences:** Under `0.x`, CPSE-REQ-043's "new major version" is read as semantic versioning's `0.x` rule (breaking changes in a minor release) until `1.0.0`; the Product Owner confirms this (constraints OQ-007, TQ-006).
**Requirements Affected:** CPSE-REQ-001, CPSE-REQ-037..046, CPSE-NFR-002, CPSE-NFR-003, CPSE-NFR-005, CPSE-NFR-007, CPSE-NFR-008

## Component Design

### Definitions (`src/core/definitions/`)

**Responsibility:** One `GraphTypeDefinition` per graph type plus the shared presentation properties; the single source for types, schemas, vocabulary and validation.
**Interfaces:**
- `definitions: Record<GraphType, GraphTypeDefinition>`
- `sharedProperties: Record<string, PropertySpec>`
**Dependencies:** none
**Requirements Served:** GSV-REQ-003, GSV-REQ-012, GSV-REQ-014, GSV-REQ-015, GSV-REQ-035, GSV-REQ-040, NLC-REQ-001..006, NLC-REQ-011, NLC-REQ-015, NLC-REQ-017, NLC-REQ-019, NLC-REQ-021, NLC-REQ-026, NLC-REQ-027, NLC-REQ-030, NLC-REQ-031, NLC-REQ-038, NLC-REQ-039, DGP-REQ-001, DGP-REQ-002, DGP-REQ-005, DGP-REQ-011, DGP-REQ-018..020, DGP-REQ-024, DGP-REQ-025, DGP-REQ-032, GSS-REQ-002, GSS-REQ-027

### Validator (`src/core/validate/`)

**Responsibility:** Run the four validation stages, derive values, and return the validation result.
**Interfaces:**
- `validate(input: unknown) → ValidationResult`
- `normalize(input: unknown) → NormalizedDescription` (throws only when called on an invalid description; for internal use after `validate`)
**Dependencies:** Definitions, Issue codes
**Requirements Served:** GSV-REQ-001, GSV-REQ-002, GSV-REQ-004..006, GSV-REQ-011, GSV-REQ-016..039, GSV-REQ-041, GSV-REQ-042, NLC-REQ-008..010, NLC-REQ-020, NLC-REQ-033, DGP-REQ-007, DGP-REQ-008, DGP-REQ-016, DGP-REQ-021, DGP-REQ-029..031, GSS-REQ-014..019, GSV-NFR-001, GSV-NFR-003

### Issue codes (`src/core/issues.ts`)

**Responsibility:** The fixed issue-code set with documentation and message templates (dependency-map RES-008).
**Interfaces:**
- `IssueCode` union; `issueDocs: Record<IssueCode, string>`
**Dependencies:** none
**Requirements Served:** GSV-REQ-030, GSV-REQ-031, GSV-REQ-034, GSV-NFR-005

### Text alternatives (`describe` in each definition, `src/core/describe.ts`)

**Responsibility:** Produce the plain-text alternative for a normalized description (dependency-map RES-006).
**Interfaces:**
- `describe(normalized: NormalizedDescription) → string`
**Dependencies:** Definitions
**Requirements Served:** NLC-REQ-012, DGP-REQ-004, GSS-REQ-036, CPSE-REQ-012, NLC-NFR-003, DGP-NFR-003, GSS-NFR-004

### Schema generator (`scripts/generate.ts`, `src/core/schema.ts`)

**Responsibility:** Emit TypeScript types, the published schema, the tool schema, the vocabulary and documentation tables from the definitions; expose the schema and vocabulary at runtime.
**Interfaces:**
- build: `pnpm generate` writes `src/generated/*` and `dist/schema.json`, `dist/vocabulary.json`
- runtime: `getSchema() → JSONSchema`, `getVocabulary() → Vocabulary`
**Dependencies:** Definitions, Issue codes, Image set manifest
**Requirements Served:** GSV-REQ-007..010, GSV-REQ-013, GSV-REQ-014, DGP-REQ-035, CPSE-REQ-028, GSV-NFR-002, CPSE-NFR-004

### Layout kit (`src/layout/kit/`)

**Responsibility:** Shared geometry: drawing space and scales, `fmt()` rounding, isometric projection, text-width estimation and wrapping, label placement, arrowhead and point-marker shapes, default-style lookup.
**Interfaces:**
- `fmt(n) → number`, `displayValue(n, supplied) → string`
- `linearScale(domain, range)`, `niceTicks(min, max, spacing?)`
- `isometric(x, y, z) → [x, y]`
- `textWidth(text, fontSize)`, `wrap(text, maxWidth, fontSize)`
- `placeLabel(label, candidates, obstacles) → position`
**Dependencies:** Default style
**Requirements Served:** NLC-REQ-004, NLC-REQ-005, NLC-REQ-007, NLC-REQ-016, NLC-REQ-035, DGP-REQ-006, DGP-REQ-009, DGP-REQ-036, GSS-REQ-030, GSS-REQ-031, GSS-REQ-032, GSS-REQ-034, GSS-NFR-003

### Layouts (`src/layout/<type>.ts`)

**Responsibility:** One pure function per graph type turning a normalized description into a Scene.
**Interfaces:**
- `layout(normalized: NormalizedDescription<T>) → Scene`
**Dependencies:** Layout kit, Text alternatives, Image set (pictograph only)
**Requirements Served:** NLC-REQ-014, NLC-REQ-016, NLC-REQ-018, NLC-REQ-022..025, NLC-REQ-028, NLC-REQ-029, NLC-REQ-032, NLC-REQ-034, NLC-REQ-036, NLC-REQ-037, DGP-REQ-003, DGP-REQ-010, DGP-REQ-012..015, DGP-REQ-017, DGP-REQ-022, DGP-REQ-023, DGP-REQ-026..028, GSS-REQ-001, GSS-REQ-003..013, GSS-REQ-020..026, GSS-REQ-028, GSS-REQ-029, GSS-REQ-033, GSS-REQ-035, NLC-NFR-001, NLC-NFR-004, DGP-NFR-001, DGP-NFR-002, DGP-NFR-004, GSS-NFR-001, GSS-NFR-002

### Image set (`src/images/`)

**Responsibility:** The named pictograph drawings and their manifest (name, description, license).
**Interfaces:**
- `images: Record<ImageName, ImageAsset>`; `imageManifest`
**Dependencies:** none
**Requirements Served:** DGP-REQ-033, DGP-REQ-034, DGP-REQ-037, DGP-NFR-005

### React renderer (`src/react/`)

**Responsibility:** `SceneSvg`, the per-type components and the `Graph` entry component; validation, fallback handling and accessible SVG output.
**Interfaces:**
- `<Graph description textAlternative? fallback? />`
- `<CircleGraph description … />` and one per type
- `<SceneSvg scene />` (internal)
**Dependencies:** Validator, Layouts, React (peer)
**Requirements Served:** CPSE-REQ-002, CPSE-REQ-007..018, CPSE-NFR-002, CPSE-NFR-003, CPSE-NFR-005, NLC-REQ-013, NLC-NFR-002

### Source exporter (`src/export/`, `src/cli.ts`)

**Responsibility:** Print a Scene as a standalone component file; the `graph-generator export` command.
**Interfaces:**
- `exportSource(description: unknown, options?: { componentName?: string }) → { ok: true, source: string } | { ok: false, issues: Issue[] }`
- command: `graph-generator export <file.json> [--out <file.tsx>] [--name <Name>]`
**Dependencies:** Validator, Layouts
**Requirements Served:** CPSE-REQ-019..026, CPSE-NFR-001

### Model tool (`src/tool/`)

**Responsibility:** The tool definition and the never-throwing handler.
**Interfaces:**
- `graphTool: { name, description, inputSchema }`
- `handleGraphToolCall(input: unknown) → ToolResult`
**Dependencies:** Validator, Schema generator output, Text alternatives
**Requirements Served:** CPSE-REQ-027..036, CPSE-NFR-004, CPSE-NFR-006

### Examples and documentation (`examples/`, `docs/`)

**Responsibility:** One example description per graph type (plus invalid examples), used by documentation, tests and the NFR checks.
**Interfaces:**
- `examples/<type>.json`, `examples/invalid/*.json`
**Dependencies:** all runtime components
**Requirements Served:** CPSE-REQ-044..046, GSV-NFR-005

### Build and release (`package.json`, `.github/workflows/`, repository files)

**Responsibility:** Package format, entry points, checks, CI matrix, publishing, license and community files.
**Interfaces:**
- `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm generate`, `pnpm size`
**Dependencies:** GitHub, npm
**Requirements Served:** CPSE-REQ-001, CPSE-REQ-003..006, CPSE-REQ-037..043, CPSE-NFR-007, CPSE-NFR-008

## Data Model

### GraphDescription

**Purpose:** The unified JSON description of one graph (public contract).
**Key Fields:**
- `type`: one of the eleven graph-type values (AD-005)
- `version?`: integer schema version, default current (`1`)
- type-specific properties: from the type's definition (for example `radius`, `xAxis`, `categories`, `unitImage`)
- shared presentation properties where applicable: `title`, `lineColor`, `lineLabel`, axis labels, point labels
- `textAlternative?`: caller-supplied text alternative (NLC-REQ-013)
**Relationships:** validated into a NormalizedDescription
**Source:** curriculum developer, stored data or a model's tool call

### NormalizedDescription and Provenance

**Purpose:** The valid description with every derived value filled in, plus a record of which values were supplied.
**Key Fields:**
- all GraphDescription fields, with derived values added
- `provenance`: map from JSON Pointer to `"supplied"` or `"derived"` (kept beside, not inside, the description, so a normalized description is itself a valid description)
**Relationships:** input to Layouts and to `describe`
**Source:** derived by the Validator

### ValidationResult and Issue

**Purpose:** The outcome of validation (GSV-REQ-027..033).
**Key Fields:**
- `valid: true`, `description`, `provenance` — or — `valid: false`, `issues`
- Issue: `code` (IssueCode), `path` (JSON Pointer), `message` (plain English), optional `expected` (value kind), `range` (`{ min?, max?, exclusiveMin? }`), `conflicts` (JSON Pointers), `suggestion` (term), `allowed` (list of terms, types, colors or image names)
**Relationships:** returned by `validate`, embedded in ToolResult and in exporter failures, passed to component fallbacks
**Source:** Validator

### IssueCode set (initial)

**Purpose:** Stable codes (GSV-REQ-030, GSV-REQ-034).
**Key Fields:** `not_an_object`, `unknown_graph_type`, `unsupported_version`, `missing_property`, `unknown_property`, `inapplicable_property`, `wrong_kind`, `out_of_range`, `contradiction`, `insufficient`, `ambiguous`, `not_a_triangle`, `too_many_ticks`, `tick_spacing_invalid`, `tick_label_not_on_tick`, `outside_axis_range`, `degenerate_segment`, `scale_excludes_value`, `tick_interval_not_dividing`, `series_length_mismatch`, `unknown_image`, `unknown_color`, `invalid_json` (tool only), `internal_error` (defect)
**Relationships:** documented in `issueDocs`
**Source:** Issue codes component

### GraphTypeDefinition and PropertySpec

**Purpose:** The single definition (AD-003).
**Key Fields:**
- GraphTypeDefinition: `type`, `title`, `description`, `properties`, `derivations`, `checks`, `describe`
- PropertySpec: `term`, `kind` (`number`, `integer`, `string`, `boolean`, `color`, `enum`, `object`, `array`), `items?`/`properties?` (nested), `min?`/`max?`/`exclusiveMin?`, `required`, `description`, `presentation?` (which shared option it is)
- Derivation: `members` (ordered by defining preference), `derive(defining) → values`
**Relationships:** read by the Validator, the Schema generator, `describe` and the docs
**Source:** source code

### Scene and SceneNode

**Purpose:** The framework-neutral drawing (AD-002).
**Key Fields:**
- Scene: `width` (400), `height`, `textAlternative`, `nodes`
- SceneNode: `kind` (`line`, `polyline`, `polygon`, `path`, `circle`, `ellipse`, `rect`, `text`, `group`, `svg`), `attrs` (ordered, already rounded and stringified), `children?`, `text?`
**Relationships:** produced by Layouts, consumed by `SceneSvg` and the exporter's printer
**Source:** derived

### ImageAsset

**Purpose:** One pictograph drawing (AD-012).
**Key Fields:** `name`, `description`, `license`, `author`, `viewBox`, `nodes`
**Relationships:** listed in the vocabulary and schema as allowed `unitImage` values
**Source:** drawn in-house

### ToolResult

**Purpose:** The handler's return value (AD-015).
**Key Fields:** `ok`, `description` + `provenance` (success) or `issues` (failure), `summary` (plain text)
**Relationships:** wraps ValidationResult
**Source:** Model tool

## Interface Contracts

### Validation API

**Between:** Callers (React renderer, Source exporter, Model tool, consumers) ↔ Validator
**Purpose:** The single point of entry for checking any description (GSV-REQ-004)
**Input:** `unknown` — any value; JSON text is not parsed here
**Output:** `{ valid: true, description: NormalizedDescription, provenance }` or `{ valid: false, issues: Issue[] }` (non-empty), plain JSON data
**Error Cases:** never throws for any input; malformed input is an issue (`not_an_object`); an internal defect surfaces as `internal_error`

### Layout contract

**Between:** React renderer and Source exporter ↔ Layouts
**Purpose:** Turn a valid description into drawable data
**Input:** a `NormalizedDescription` produced by `validate`
**Output:** a `Scene` whose every numeric attribute has passed `fmt()`
**Error Cases:** none expected; a layout called with an invalid description is a programming error caught by types and tests

### Component props

**Between:** Consumer ↔ React renderer
**Purpose:** Render a graph (CPSE-REQ-007..018)
**Input:** `description` (any value), `textAlternative?: string`, `fallback?: "placeholder" | "none" | (issues: Issue[]) => ReactNode`
**Output:** `<svg role="img" aria-label=… viewBox=… width="100%">` with a `<title>`; or the chosen fallback
**Error Cases:** invalid description → fallback; never throws

### exportSource

**Between:** Consumer or command line ↔ Source exporter
**Purpose:** Produce a standalone component file
**Input:** `description: unknown`, `{ componentName?: string }` (must be a valid PascalCase identifier)
**Output:** `{ ok: true, source }` — TypeScript source of one exported function component — or `{ ok: false, issues }`
**Error Cases:** invalid description → issues; invalid component name → `out_of_range`-style issue on `/componentName`; command line exits non-zero and prints the issue summary

### Model tool

**Between:** Consumer's model integration ↔ Model tool
**Purpose:** Let a model generate graphs (CPSE-REQ-027..036)
**Input:** `graphTool` passed to the provider; the model's tool input (object or JSON text) passed to `handleGraphToolCall`
**Output:** `{ ok: true, description, provenance, summary }` or `{ ok: false, issues, summary }`
**Error Cases:** unparsable text → `invalid_json`; missing `graph` wrapper → `missing_property` at `/graph`; internal defect → `internal_error`; never throws

## Infrastructure Requirements

- Public GitHub repository with issue tracker, `LICENSE` (MIT assumed), `CONTRIBUTING.md`, `CHANGELOG.md` via Changesets: AD-016; serves CPSE-REQ-037..041
- GitHub Actions CI on pull requests — lint, typecheck, `pnpm generate` freshness check, unit and property tests, build — across React 18/19 × Node.js 22/24: AD-016, prd/OC-004; serves CPSE-NFR-003, GSV-NFR-002, GSV-NFR-003, GSV-NFR-005, CPSE-NFR-004, CPSE-NFR-006, CPSE-NFR-007
- Geometry and layout test suites over Scenes (no DOM): AD-002, AD-007; serve NLC-NFR-001, DGP-NFR-001, DGP-NFR-002, GSS-NFR-001, GSS-NFR-002, GSS-NFR-003
- Accessibility tests (axe-core on rendered SVG, text-alternative content checks): AD-008; serve NLC-NFR-003, DGP-NFR-003, GSS-NFR-004
- Palette checks (contrast against background, greyscale luminance difference): AD-011; serve GSV-NFR-004, DGP-NFR-004
- Image license check over `src/images/manifest.ts`: AD-012; serves DGP-NFR-005
- Playwright with Chromium and WebKit: hydration of server-rendered examples and cross-engine markup comparison; AD-007, AD-014; serves CPSE-NFR-005 and TR-002
- Export equality test (render package component and compiled exported component to static markup, compare): AD-013; serves CPSE-NFR-001
- Benchmarks with Vitest bench on the CI runner: serve GSV-NFR-001, NLC-NFR-004
- size-limit budgets per graph type and for the entry component: AD-001; serves CPSE-NFR-002
- npm trusted publishing with provenance from tagged releases; npm organization for the scope: AD-016, prd/IC-003; serves CPSE-NFR-008
- GitHub Pages hosting for the Storybook documentation site: AD-016, prd/OC-005; serves CPSE-REQ-044, CPSE-REQ-045

## Technical Risks

- **TR-001**: Provider tool-schema limits change, or the strict profile's nullable optional properties lower the quality of model output
  - *Likelihood:* Medium
  - *Impact:* The tool schema is rejected or models produce more invalid descriptions; CPSE-NFR-004 still passes while real integrations fail
  - *Mitigation:* Re-check provider documentation before building the tool (TQ-002, done 2026-11-04 from documentation only: Anthropic strict mode and Gemini OpenAPI `parameters` do not fit, see AD-006); keep rule fixtures per supported mode in CI, citing the documentation and the date checked; document the supported and unsupported modes; measure invalid-call rate on a small evaluation set of prompts during delivery of the tool
  - *Related Constraints:* prd/IC-001, prd/RF-002
  - *Related NFRs:* CPSE-NFR-004, CPSE-NFR-006

- **TR-002**: A coordinate computed with trigonometry lands on a rounding boundary and rounds differently in two engines
  - *Likelihood:* Low
  - *Impact:* A hydration warning or unequal exported markup for one specific description; CPSE-NFR-005 or CPSE-NFR-001 fails intermittently
  - *Mitigation:* `fmt()` everywhere (AD-007); cross-engine comparison in Playwright over the examples and generated descriptions; if it ever occurs, snap trigonometric results for common angles (0°, 30°, 45°, 60°, 90°) to exact values
  - *Related Constraints:* prd/TC-002, prd/RF-003
  - *Related NFRs:* CPSE-NFR-001, CPSE-NFR-005

- **TR-003**: Estimated text widths are wrong for the consumer's font, so labels overlap
  - *Likelihood:* Medium
  - *Impact:* Crowded labels in consumer pages; GSS-NFR-003 passes in CI (default font) but users see overlap
  - *Mitigation:* Safety factor 1.1; conservative candidate spacing; document the default font assumption; add a per-graph font-size option later if needed
  - *Related Constraints:* prd/TC-001, prd/TC-011, prd/RF-001
  - *Related NFRs:* GSS-NFR-003

- **TR-004**: The shared core (definitions, validator, layout kit) plus a type's layout exceeds the 25 kB budget, especially for the pictograph with its images
  - *Likelihood:* Medium
  - *Impact:* CPSE-NFR-002 fails for some types
  - *Mitigation:* size-limit from the first ticket; definitions per type are imported only by that type and by the entry component; images kept simple and at most 20; if needed, move message templates to a lazily imported module
  - *Related Constraints:* prd/TC-007, prd/TC-008
  - *Related NFRs:* CPSE-NFR-002

- **TR-005**: Teachers expect the oblique textbook cube rather than isometric
  - *Likelihood:* Medium
  - *Impact:* Figures look unfamiliar; a change of projection after release changes rendered meaning (a breaking change under CPSE-REQ-043)
  - *Mitigation:* Confirm with the Product Owner before Phase 2 (TQ-004); the projection lives in one module
  - *Related Constraints:* prd/TC-010
  - *Related NFRs:* GSS-NFR-001

- **TR-006**: The in-house schema generator and structural validator disagree on an edge case
  - *Likelihood:* Medium
  - *Impact:* A description passes validation but the published schema rejects it (or the reverse); GSV-NFR-003 fails, or a model receives a schema the validator does not honor
  - *Mitigation:* GSV-NFR-003 property tests from the first type onward; validate generated descriptions with an independent JSON Schema validator (Ajv, development only) as the reference
  - *Related Constraints:* prd/TC-008
  - *Related NFRs:* GSV-NFR-002, GSV-NFR-003

- **TR-007**: The fallback render function is judged not to meet CPSE-REQ-017's "notification"
  - *Likelihood:* Low
  - *Impact:* An extra client-only wrapper is needed later
  - *Mitigation:* Confirm reading with the Product Owner (TQ-007); the wrapper can be added without changing core components
  - *Related Constraints:* prd/IC-002
  - *Related NFRs:* —

- **TR-008**: Triangle solving from angles and sides loses precision near degenerate triangles
  - *Likelihood:* Low
  - *Impact:* Round-trip error exceeds 10⁻⁹; GSS-NFR-002 fails, or near-degenerate triangles are misclassified
  - *Mitigation:* Compute no angle with `acos`. Three sides: Kahan's form of Heron's area, then each angle as `atan2(4·area, (q − p)(q + p) + r²)`, which never leaves its domain and keeps a needle-thin triangle's tiny angle; two sides and the included angle: the half-angle law of cosines and `atan2`; vertices: `atan2`, except that a triangle given by its three sides places its third vertex from the sides alone — x = (s² + b² − t²) ÷ 2b, y = 4·area ÷ 2b with Kahan's area — using only arithmetic and `sqrt`, which every engine computes exactly, so no vertex of a three-sides triangle depends on the last bit of an engine's `cos`, `sin` or `atan2` *(amended 2026-11-02: removes the residual accepted under AD-007 in graph-library/component-packaging-and-source-export-ticket-004-code-review/CR-002 — graph-library GSS TICKET-009)*. A relative margin of 10⁻¹² separates flat from thin. Property tests exclude only exactly degenerate inputs; GSS-NFR-002 is verified to 10⁻⁹ for every angle at least 0.02°, below which the rounding of the inputs themselves decides the last digits *(amended 2026-10-29: the first text prescribed `acos` clamped to [−1, 1], which gives 0° for a valid needle-thin triangle and misreads it as too flat — graph-library GSS TICKET-004 DEL-005, code review CR-004)*
  - *Related Constraints:* —
  - *Related NFRs:* GSS-NFR-002, CPSE-NFR-005

## Open Technical Questions

- [ ] **TQ-001**: Package name and npm organization — is `@gener8v/graph-generator` acceptable and available? (constraints OQ-003)
- [x] **TQ-002**: Which providers must the tool schema be verified against? Current assumption: Anthropic, OpenAI (strict mode) and Google. Provider documentation must be re-checked when the tool is built (constraints OQ-002) — *Resolved 2026-11-04 (Engineer decision, CPSE TICKET-007 reconciliation): documentation re-checked that day; supported modes are Anthropic `input_schema` without `strict`, OpenAI `strict: true` and Gemini `parametersJsonSchema`; Anthropic `strict: true` and Gemini OpenAPI `parameters` are documented as unsupported (AD-006). No live API call was made; `maxLength`/`title` for OpenAI strict and the Gemini JSON Schema keyword list are undocumented and stay under TR-001.*
- [x] **TQ-003**: Product Owner confirmation of AD-005 naming (camel-cased properties, kebab-case type values), which resolves GSV OQ-001
- [x] **TQ-004**: Product Owner confirmation of isometric projection for cubes, cylinders and x,y,z graphs (AD-009)
- [x] **TQ-005**: Should export also offer `.jsx` output? (CPSE OQ-003)
- [x] **TQ-006**: Product Owner confirmation that releases start at `0.x`, with breaking changes allowed in minor releases until `1.0.0` (constraints OQ-007)
- [x] **TQ-007**: Does the fallback render function satisfy CPSE-REQ-017, or is a callback also wanted? (AD-014)
- [x] **TQ-008**: Vertical slice graph type (dependency-map OQ-003): recommended the circle — it exercises derived values, contradictions, measurement labels, the entry function, the tool handler and export without needing axes or ticks

Resolved 2026-10-04 with the design's approval: TQ-003, TQ-004, TQ-006, TQ-007 and TQ-008 accepted as proposed; TQ-005 — `.tsx` only for now. TQ-001 (name availability) and TQ-002 (provider re-verification) remain open as actions for the foundation and tool tickets.

## Assumptions

- Assumption: MIT license (constraints OQ-001); a different permissive license changes only repository files and exported-file headers
- Assumption: Consumers render the components in React 18.x or 19.x with a bundler; no script-tag usage
- Assumption: A 400-unit drawing space and 2-decimal rounding satisfy every accuracy target at the sizes graphs are displayed in curricular materials
- Assumption: At most 20 pictograph images in the first release
- Assumption: Provider tool-schema rules stated in AD-006 hold as documented in 2026; TQ-002 re-verifies them
