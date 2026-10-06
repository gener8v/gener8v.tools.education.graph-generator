# TICKET-003: Provide the entry component, entry function, per-type component factory and invalid-description fallback

**Change:** graph-library
**Capability Area:** Component Packaging & Source Export (component-packaging-and-source-export)
**Specification:** specifications/component-packaging-and-source-export.md

**Summary:** Add the layout registry, the `createGraph` entry function, the `createGraphComponent` factory used by every per-type component, the `Graph` entry component that accepts any description, and the default placeholder — so a valid description renders and an invalid one never throws.
**Priority:** Must
**Value:** A developer renders any graph by passing one description to one component, and sees a readable explanation instead of a crash when the description is wrong.

**Requirements Covered:**
- CPSE-REQ-007: One React component per graph type
- CPSE-REQ-008: A single entry component for any graph type
- CPSE-REQ-009: A single entry function returning a renderable graph with normalized description, or issues
- CPSE-REQ-010: Type-specific and entry components render identical output
- CPSE-REQ-014: An invalid description is not rendered as a graph
- CPSE-REQ-015: Default visible placeholder listing the issue messages
- CPSE-REQ-016: Consumer chooses nothing, default placeholder or own content
- CPSE-REQ-017: Issues reported to the consumer through a notification they supply
- CPSE-REQ-018: Never throws on an invalid description

**Prior Art:**
- Read: TICKET-002 output — `src/layout/scene.ts`, `src/react/SceneSvg.tsx`
- Read: `graph-library/graph-specification-and-vocabulary/TICKET-003` and `TICKET-004` outputs — `src/core/validate/index.ts` (`validate`, `ValidationResult` with `description` and `provenance`), `src/core/result.ts` (`Issue`) (DEP-006)
- Read: `.gener8v/technical-design/system-design.md` — AD-002, AD-014 (pure components, `fallback`: `"placeholder" | "none" | (issues) => ReactNode`), Interface Contracts "Component props", Component "React renderer"
- Read: `.gener8v/specifications/component-packaging-and-source-export.md` — Behaviors "Invalid Descriptions" and Edge Cases (no description; wrong type to a type-specific component; placeholder readable in greyscale)

**Acceptance Criteria:**
- [ ] `src/layout/registry.ts` maps each graph type to its layout; type tickets register into it; an unregistered type is reported as an issue, not thrown
- [ ] `createGraph(description)` returns `{ ok: true, description, provenance, scene }` for a valid description and `{ ok: false, issues }` otherwise; it never throws (property test over arbitrary JSON values)
- [ ] `createGraphComponent(type)` returns a pure component accepting `description`, `textAlternative?`, `fallback?`; given a description of a different type it applies the invalid behavior with a graph-type mismatch issue
- [ ] `<Graph>` dispatches any valid description to the matching layout; for every registered type's example, `<Graph>` and the per-type component produce identical static markup (CPSE-REQ-010)
- [ ] With no `fallback`, an invalid description (including `undefined`) renders `Placeholder`: a visible box stating the graph could not be drawn and listing each issue message, drawn in black on white so it reads in greyscale
- [ ] `fallback="none"` renders nothing; `fallback={(issues) => …}` renders the function's result and the function receives the full issue list
- [ ] When the description changes from invalid to valid, the graph renders and the placeholder is gone (re-render test)
- [ ] Components contain no hooks, state or effects and render without a client boundary (a React Server Components render test, or a static check that no hook is imported)
- [ ] No component throws for any description: a property test renders `<Graph>` with arbitrary JSON values and asserts no exception

**Output:**
- `src/layout/registry.ts` — `registerLayout(type, layout)`, `getLayout(type)` (type tickets call `registerLayout`)
- `src/graph.ts` — `createGraph` (exported from `.` and documented as the single entry function)
- `src/react/createGraphComponent.tsx` — the factory every `src/react/graphs/<Pascal>Graph.tsx` uses
- `src/react/Graph.tsx` — the entry component; `src/react/Placeholder.tsx` — the default placeholder
- `src/index.ts` — exports `Graph`, `createGraph`, the per-type components as they are added
- `tests/react/Graph.test.tsx` — dispatch, equality with per-type components, fallbacks, invalid→valid, never throws
- `tests/graph.test.ts` — `createGraph` results and the never-throws property test

**Constraints:** prd/IC-002 (Server Components: no state, effects or function props across the boundary), prd/TC-001, prd/CC-002

**Known Hazards:**
- AD-014 supersedes the specification's Behaviors line "call [the notification] with the issue list each time a new invalid description is received": the notification is the `fallback` render function, which receives the issues during render with no side effect. Do NOT add an `onIssues` callback invoked during render or from an effect (TQ-007 resolved this way). Record this in the delivery record's Decisions.
- Validation lives in GSV (`src/core/validate`). Do not re-implement any check in the components; call `validate` and render from the normalized description only (GSV Behaviors: render from the normalized description, never the raw input).
- Until graph-type tickets land, the registry is empty; test with a minimal fixture layout registered only in tests, and do not ship a fake graph type.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-002-security-review/SEC-001: issue messages are neutralised at construction (`src/core/issues.ts` quotes non-term keys, escapes control, bidi and zero-width characters, and caps lengths), but `issue.path` is a faithful RFC 6901 pointer and may hold raw control characters from caller keys. Never print `path` raw to text output. Use one shared `formatIssue(issue)` that escapes `path` the same way and renders `<path>: <message>`; whichever of graph-library/component-packaging-and-source-export/TICKET-003, TICKET-006 and TICKET-007 lands first adds it to `src/core/` with tests, and the others reuse it.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-002-security-review/SEC-002: one description can produce tens of thousands of issues, and GSV-REQ-029 requires the validator to return them all (Product Owner decision 2026-10-05: no cap in the validator). The placeholder displays at most the first 20 issues, then "…and N more", and add a test that 10,000 unknown keys produce output under a fixed size. Keep the structured `issues` array complete.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-002-security-review/SEC-001: the placeholder renders issue text only as React text children. Never use `dangerouslySetInnerHTML`, Markdown or HTML rendering for messages or paths.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-002-security-review/SEC-003: never put exception text, `error.message` or `error.stack` into an issue or a message. An unexpected exception becomes `createIssue("internal_error", "", {})`, whose message is fixed; for `invalid_json`, pass only the JSON parser's message as `detail`. Add a test that a thrown internal exception yields no `file:`, `/node_modules/` or `    at ` frame in the output.

**Depends On:** TICKET-002
**Blocks:** TICKET-004, TICKET-005, TICKET-008

**Size:** Medium

**Notes:** The circle (`graph-library/geometric-shapes-and-solids/TICKET-002`) is the first real type to register (TQ-008 vertical slice); when it lands, its example becomes the first fixture for the equality test here.
