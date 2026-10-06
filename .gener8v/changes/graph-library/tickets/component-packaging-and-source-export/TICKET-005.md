# TICKET-005: Export a description as a standalone React component source file

**Change:** graph-library
**Capability Area:** Component Packaging & Source Export (component-packaging-and-source-export)
**Specification:** specifications/component-packaging-and-source-export.md

**Summary:** Build the JSX printer that mirrors `SceneSvg` and `exportSource`, which validates a description, lays it out and prints one self-contained TypeScript component file that depends only on React and renders identical markup.
**Priority:** Must
**Value:** A team can commit a graph into a project that does not depend on this package, and it looks exactly like the package's own component.

**Requirements Covered:**
- CPSE-REQ-019: Export a valid description as the source of one standalone React component
- CPSE-REQ-020: The exported component renders the same graph as the package component
- CPSE-REQ-021: Exported source depends only on React
- CPSE-REQ-022: The exported component needs no inputs
- CPSE-REQ-023: Exported source records the package version and source description in a comment
- CPSE-REQ-024: Component name can be chosen, defaulting from the graph type
- CPSE-REQ-025: Refuse to export an invalid description and return its issues
- CPSE-NFR-001: For every graph type's example, the exported component renders markup identical to the package component — verified by a CI export-equality test

**Prior Art:**
- Read: TICKET-002 output — `src/layout/scene.ts`, `src/react/SceneSvg.tsx` (the element mapping the printer must mirror)
- Read: TICKET-003 output — `src/graph.ts` (`createGraph` gives the Scene), `src/layout/registry.ts`
- Read: `.gener8v/technical-design/system-design.md` — AD-002, AD-008, AD-012 (images are Scene nodes, inlined in exports), AD-013 (TSX file, header comment, `<Pascal>Graph` default name, no hooks), Interface Contracts "exportSource"
- Read: `.gener8v/specifications/component-packaging-and-source-export.md` — Behaviors "Source Export" (identical text for same input and version; invalid component name reported) and the pictograph edge case

**Acceptance Criteria:**
- [ ] `exportSource(description, { componentName? })` returns `{ ok: true, source }` for a valid description and `{ ok: false, issues }` for an invalid one, never throwing
- [ ] The source is one TypeScript file: a header comment with the package version and the description as JSON, then `export function <Name>() { return (<svg …>…</svg>); }`; it imports nothing except, if needed, from `react`, and uses no hooks
- [ ] The default name is the graph type in PascalCase plus `Graph` (`circle` → `CircleGraph`, `number-line` → `NumberLineGraph`); an invalid `componentName` (not a PascalCase identifier) returns an issue at `/componentName` and no source
- [ ] Exporting the same description twice with the same package version produces byte-identical source
- [ ] Pictograph exports inline the image drawing nodes; the header comment says images are embedded and names their license (prd/CC-001)
- [ ] `tests/export/equality.test.ts` compiles each exported example in memory, renders it and the package component with `renderToStaticMarkup`, and asserts identical strings for every `examples/*.json` (CPSE-NFR-001)
- [ ] `src/export` imports no `react-dom` and no browser global (boundary rule from TICKET-001 passes)

**Output:**
- `src/export/print.ts` — `printScene(scene, name, header) → string`, sharing the node-to-element mapping table with `SceneSvg`
- `src/export/exportSource.ts` — `exportSource`; exported from `src/export/index.ts` (`./export`)
- `tests/export/exportSource.test.ts` — result shapes, default and invalid names, determinism, header comment, no imports beyond React
- `tests/export/equality.test.ts` — CPSE-NFR-001 over all examples

**Constraints:** prd/TC-009 (exported source contains computed markup and embedded images), prd/CC-001 (embedded images carry their license notice), prd/TC-005

**Known Hazards:**
- Equality depends on the printer and `SceneSvg` sharing one mapping. Do NOT hand-write a second mapping in the printer; import the shared table from TICKET-002.
- TQ-005 resolved: `.tsx` output only for now. Do not add a `.jsx` mode.
- The specification's pictograph edge case allows "embed or reference"; AD-012 decides **embed**. Exports never reference the package or a URL.
- The equality test closes CPSE-NFR-001 for the change only once all eleven types have examples; report covered types in the delivery record.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-001-security-review/SEC-001: caller text (titles, labels, the text alternative) must never become code in the exported file.
  - Print every Scene string, both text content and attribute values, as a JavaScript string literal inside an expression container (`<title>{"…"}</title>`, `aria-label={"…"}`). Build the literal with `JSON.stringify`, then escape U+2028, U+2029 and the invisible characters as `\u` escapes. Never interpolate caller text into JSX text or a quoted JSX attribute.
  - In the header's description JSON, write `*/` as `*\/` and apply the same `\u` escaping, or hold the description in a string constant instead of a comment.
  - Test with every string in `tests/fixtures/plain-text.ts`: the exported module compiles, runs nothing at load or render, and renders each string literally.

**Depends On:** TICKET-002, TICKET-003
**Blocks:** TICKET-006

**Size:** Medium

**Notes:** The circle (`graph-library/geometric-shapes-and-solids/TICKET-002`) is the first fixture (TQ-008).
