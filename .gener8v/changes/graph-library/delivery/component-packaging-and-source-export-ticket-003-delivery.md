# TICKET-003: Provide the entry component, entry function, per-type component factory and invalid-description fallback — Delivery Record

## Ticket Reference

**Ticket:** graph-library/component-packaging-and-source-export/TICKET-003
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/component-packaging-and-source-export.md`
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

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| TICKET-002 delivered: `src/layout/scene.ts`, `src/react/SceneSvg.tsx` | present | present; record Delivered, three reviews resolved (`618b413`) | ✅ |
| GSV TICKET-003/004 delivered: `validate`, `ValidationResult` with `description` and `provenance` | present | `src/core/validate/index.ts` `validate` / `validateWith(input, registry)`, never throws; `src/core/result.ts` `ValidationResult`, `Issue`, `Issues` | ✅ |
| `createIssue("internal_error", "", {})` has a fixed message | fixed | `src/core/issues.ts` template takes no inputs | ✅ |
| A graph-type mismatch issue code | an issue code | no dedicated code; `unknown_graph_type` with `{ got, allowed: [type] }` at `/type` says "type must be one of: "circle"; got "square"." | ⚠️ Resolved from ground truth — reuse `unknown_graph_type` (see below) |
| `describeNormalized` for code that already holds a normalized description (carried SEC-005) | present | `src/core/describe.ts` | ✅ |
| GSV `definitions` registry holds graph types | empty until type tickets | empty frozen null-prototype record; `validate` rejects every `type` today | ⚠️ Non-blocking — tests use `validateWith` with `tests/fixtures/definitions` `fixtureRegistry` and a test-only layout |
| `src/layout/registry.ts`, `src/graph.ts`, `src/react/{createGraphComponent,Graph,Placeholder}.tsx` | absent until this ticket | absent | ✅ Expected |
| `src/index.ts` is the `.` entry, currently empty | `export {}` | `export {};`; tsup entry `index`; size-limit `dist/index.js` 120 kB | ✅ |
| `package.json` `sideEffects` | — | `false` | ⚠️ Shapes the registry (see Resolved) |
| `fast-check` for the property tests | dev dependency | `fast-check ^4.10.2` | ✅ |
| jsdom + `act()` for the re-render test | available | `jsdom` dev dependency; pattern in `tests/react/SceneSvg.test.tsx` | ✅ |
| `src/react/**` lint block | browser globals and network rejected | present (`eslint.config.js`); React imports allowed; nothing yet rejects hooks | ⚠️ Non-blocking — the static no-hooks check is added here |
| `formatIssue` in `src/core/` | absent unless TICKET-006/007 landed first | absent | 🔁 Carried — added here |
| Prior Art: system-design AD-002, AD-014, Interface Contracts "Component props", "Layout contract", Component "React renderer" | present, Approved | present | ✅ |
| Prior Art: specification Behaviors "Invalid Descriptions", Edge Cases | present | present | ✅ |
| Constraints prd/IC-002, TC-001, CC-002 | present | present | ✅ |
| Carried: `graph-library/graph-specification-and-vocabulary-ticket-002-security-review/SEC-001` — shared `formatIssue` escaping `path`; issue text only as React text children | addressed here | — | 🔁 Carried — see Implementation Plan |
| Carried: `…-ticket-002-security-review/SEC-002` — placeholder shows at most 20 issues, then "…and N more"; size test | addressed here | — | 🔁 Carried — see Implementation Plan |
| Carried: `…-ticket-002-security-review/SEC-003` — no exception text in issues; `internal_error`; no stack frames in output | addressed here | — | 🔁 Carried — see Implementation Plan |
| Carried: `…-ticket-003-security-review/SEC-001` — document the consumer's request-body limit | addressed here | — | 🔁 Carried — TSDoc on `Graph` and `createGraph` |
| Carried: `…-ticket-004-security-review/SEC-005` — use `describeNormalized`, not `describe` | addressed here | — | 🔁 Carried — no package code here calls `describe` |
| Carried: `graph-library/component-packaging-and-source-export-ticket-002-code-review/CR-006`, `…-security-review/SEC-003` — layout inside `try`, thrown error → `internal_error`; test with a throwing layout; `textAlternative` passed unchanged | addressed here | — | 🔁 Carried — see Implementation Plan |
| Known Hazard (AD-014 / TQ-007): no `onIssues` callback; the fallback function is the notification | recorded as a decision | — | 🔁 Carried — DEL entry |

**Resolved from ground truth (not escalated):**
- *Graph-type mismatch issue.* The fixed issue-code set (GSV-REQ-030) has no mismatch code, and adding one is a breaking-change-governed GSV matter (RES-008). `unknown_graph_type` with `allowed: [the component's type]` at path `/type` already produces the right message and structured data, so the per-type component reuses it.
- *How a type "registers" its layout.* Every downstream type ticket says its layout is "registered in `src/layout/registry.ts`", and the package declares `"sideEffects": false`, so a registration call made at import time from a type's own module could be dropped by a bundler. The registry therefore follows the GSV `definitions` rule: a frozen null-prototype record in `registry.ts` that each type ticket adds one import and one entry to.

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas, 2026-10-07

Branch `ticket/cpse-003` (from `ticket/cpse-002`). Commit at the end; no push.

### Planned Files

- `src/layout/registry.ts`: `Layout = (normalized: DescriptionBase) => Scene`; `layouts`: a frozen null-prototype record, empty now — each type ticket adds one import and one entry; `getLayout(type, registry = layouts)` → the layout or `undefined` (own-property lookup, never throws). Deviation from the ticket's Output: no mutable `registerLayout` — "registering" is the entry in this file (Resolved from ground truth).
- `src/graph.ts`: `createGraph(description)` → `{ ok: true, description, provenance, scene }` or `{ ok: false, issues }`. Validates, looks up the layout (unregistered → `unknown_graph_type` issue), calls it in a `try`; any throw → `createIssue("internal_error", "", {})`. Internal `createGraphWith(input, definitions, layouts)` for tests (mirrors `validateWith`). TSDoc: server consumers keep their own request-body limit (carried GSV TICKET-003 SEC-001).
- `src/core/issues.ts`: add the shared `formatIssue(issue)` → `"<path>: <message>"`, with `path` escaped like messages (carried SEC-001). TICKET-006/007 reuse it.
- `src/react/Placeholder.tsx`: visible box, black on white with a black border (greyscale); "This graph could not be drawn." then up to 20 issues via `formatIssue` as text children, then "…and N more" (carried SEC-002).
- `src/react/createGraphComponent.tsx`: `createGraphComponent(type)` → pure component with `description`, `textAlternative?`, `fallback?`. An object description whose `type` differs or is missing → `unknown_graph_type` at `/type` with `allowed: [type]`; otherwise `createGraph`. Valid → `<SceneSvg scene textAlternative>` (passed unchanged); invalid → fallback (`"none"` → `null`; function → called with the full issue list; anything else → `Placeholder`). Exports `GraphProps`, `Fallback`.
- `src/react/Graph.tsx`: the entry component; same render routine without the type pre-check, so markup equality holds by construction.
- `src/index.ts`: export `Graph`, `createGraph`, and types `GraphProps`, `Fallback`, `Issue`, `CreateGraphResult`.
- `eslint.config.js`: `src/react/**` block also rejects importing React hooks and the `"use client"` directive (static no-hooks check).
- `tests/graph.test.ts`: valid / invalid / unregistered type / throwing layout (no `file:`, `/node_modules/`, `    at ` in output) / never-throws property test over arbitrary JSON.
- `tests/react/Graph.test.tsx`: dispatch, `<Graph>` ≡ per-type component markup, every fallback mode incl. `undefined`, wrong-type, invalid→valid re-render (jsdom + `act()`), 5,000 unknown keys → bounded placeholder size, throwing layout → fallback, never-throws property test over `<Graph>`.
- `tests/core/issues.test.ts`: `formatIssue` cases.
- `tests/package/boundaries.test.ts`: the no-hooks lint rule fires.
- `tests/fixtures/layouts.ts`: a minimal test-only circle layout used with the existing fixture circle definition; no fake graph type ships.

### How Acceptance Criteria Will Be Met

- Registry; unregistered type is an issue → `tests/graph.test.ts`.
- `createGraph` results and never throws (property test) → `tests/graph.test.ts`.
- Factory and mismatch → `tests/react/Graph.test.tsx`.
- Dispatch and equal markup → `tests/react/Graph.test.tsx` with the fixture circle (the GSS TICKET-002 circle becomes the first real fixture).
- Default placeholder, greyscale, `undefined` → markup assertions on text and colors.
- `"none"` / function fallback (receives the full list) → `tests/react/Graph.test.tsx`.
- Invalid → valid → jsdom re-render test.
- No hooks / client boundary → ESLint rule + boundaries test that it fires.
- No component throws → `<Graph>` property test.

### Decisions to record

- Fallback function is the CPSE-REQ-017 notification (AD-014, TQ-007); no `onIssues`.
- Mismatch reuses `unknown_graph_type`.
- Registry as a static table.
- A throwing consumer fallback function is not caught (CPSE-REQ-018 is about descriptions).
- Validation runs on every render; no memoization, keeping components pure.

## Progress

- [x] `src/layout/registry.ts` — written, annotated
- [x] `src/graph.ts` — written, annotated
- [x] `src/core/issues.ts` — `formatIssue` added, annotated
- [x] `src/react/Placeholder.tsx` — written, annotated
- [x] `src/react/createGraphComponent.tsx` — written, annotated
- [x] `src/react/Graph.tsx` — written, annotated
- [x] `src/index.ts` — exports added
- [x] `eslint.config.js` — no-hooks / no "use client" rules in the `src/react/**` block
- [x] `tests/fixtures/layouts.ts` — written
- [x] `tests/graph.test.ts` — written
- [x] `tests/react/Graph.test.tsx` — written
- [x] `tests/core/issues.test.ts` — `formatIssue` cases added
- [x] `tests/package/boundaries.test.ts` — pure-component lint cases added

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/layout/registry.ts`: `Layout`, `LayoutRegistry`, the empty frozen null-prototype `layouts` table that type tickets add one import and one entry to, and `getLayout(type, registry = layouts)` (own entries only; `undefined` for anything unregistered or not a string).
- `src/graph.ts`: `createGraph(description)` → `{ ok: true, description, provenance, scene }` or `{ ok: false, issues }`; internal `createGraphWith(input, definitions, layouts)`. A validated type with no layout gives `unknown_graph_type` at `/type` listing the drawable types (or `internal_error` when none can be drawn); a thrown layout or any other exception gives the fixed `internal_error`. TSDoc carries the request-body-limit note.
- `src/core/issues.ts`: `formatIssue(issue)` → `<path>: <message>` (message alone for `""`), path clipped to 200 characters and both escaped with the message escaper.
- `src/react/Placeholder.tsx`: `Placeholder` (`role="note"` box, black on white, 2px black border, system font stack; "This graph could not be drawn."; up to `PLACEHOLDER_ISSUE_LIMIT = 20` issues via `formatIssue` as text children; "…and N more.").
- `src/react/createGraphComponent.tsx`: `Fallback`, `GraphProps`, internal `Registries`, `renderGraph(props, registries)`, `createGraphComponentWith(type, registries)`, `createGraphComponent(type)`; the mismatch pre-check for per-type components.
- `src/react/Graph.tsx`: `Graph` — `<>{renderGraph(props)}</>`.
- `src/index.ts`: exports `Graph`, `createGraph`, and types `Fallback`, `GraphProps`, `CreateGraphResult`, `Issue`, `Issues`, `Provenance`.
- `eslint.config.js`: `PURE_MESSAGE`; `src/react/**` rejects importing any `use…` name from `react`/`react-dom`, calling `x.useX(...)`, and the `"use client"` directive.
- `tests/fixtures/layouts.ts`: test-only circle layout (`fixtureLayouts`) and a layout that throws like `fmt(Infinity)` (`throwingLayouts`).
- `tests/graph.test.ts`, `tests/react/Graph.test.tsx`: new suites (11 and 17 tests).
- `tests/core/issues.test.ts`, `tests/package/boundaries.test.ts`: added cases; the boundaries test "allows react in the React renderer" now imports `createElement` instead of `useState`, which is now rejected.

## Verification Run

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm lint` | 0 | — |
| `pnpm typecheck` | 0 | includes the typed fixtures and props |
| `pnpm test` | 0 | 24 files, 630 tests passed (was 22 / 590) |
| `pnpm build` | 0 | — |
| `pnpm check:dist` | 0 | — |
| `pnpm check:deps` | 0 | — |
| `pnpm size` | 0 | `.` 9.11 kB of 120 kB; `./core` 9.63 kB of 25 kB |
| `pnpm publint` | 0 | All good |
| `pnpm attw` | 0 | only the ignored CJS-resolves-to-ESM note (esm-only profile) |
| Mutation checks (scratch, reverted): remove the `catch` in `createGraphWith`; drop the 20-issue limit; print `path` raw; skip the mismatch check; wrap `Graph` in a `<div>`; pass one issue to the fallback function; ignore `"none"` | — | each makes `tests/graph.test.ts` / `tests/react/Graph.test.tsx` fail (13, 1, 2, 1, 1, 1, 1 failures) |

## Acceptance Criteria Verification

- [x] `src/layout/registry.ts` maps each graph type to its layout; type tickets register into it; an unregistered type is reported as an issue, not thrown — `tests/graph.test.ts` "layout registry", "reports a defined type with no layout as an issue", "reports internal_error when no type can be drawn at all" (registration is an entry in the table: DEL-003)
- [x] `createGraph(description)` returns `{ ok: true, description, provenance, scene }` / `{ ok: false, issues }`; never throws (property test over arbitrary JSON values) — `tests/graph.test.ts` "createGraph" and "createGraph never throws" (`fc.jsonValue()`, circle-shaped records, hostile getters/proxies/cycles)
- [x] `createGraphComponent(type)` returns a pure component accepting `description`, `textAlternative?`, `fallback?`; a description of another type gets the invalid behavior with a graph-type mismatch issue — `tests/react/Graph.test.tsx` "reports a description of another type to a per-type component as a graph-type mismatch" (DEL-002)
- [x] `<Graph>` dispatches any valid description to the matching layout; `<Graph>` and the per-type component produce identical static markup for every registered type's example — "draws a valid description with its type's layout", "gives the entry component and the per-type component identical markup…" (fixture circle; the GSS TICKET-002 circle replaces it when it lands), and the property test asserting `Graph` ≡ `renderGraph` with the package registries
- [x] No `fallback` + invalid description (including `undefined`) renders `Placeholder`, listing each issue message, black on white — "renders the placeholder by default, including for no description at all", "draws the placeholder in black on white with a border"
- [x] `fallback="none"` renders nothing; a function fallback's result is rendered and it receives the full issue list — "renders nothing with fallback="none"…", "renders the fallback function's result, giving it the full issue list"
- [x] Invalid → valid renders the graph and the placeholder is gone — "invalid to valid" jsdom re-render test, for both the entry and the per-type component
- [x] Components contain no hooks, state or effects and render without a client boundary — static check: `pnpm lint` with the new `src/react/**` rules; `tests/package/boundaries.test.ts` "components are pure…" proves each rule fires and that every shipped file in `src/react` passes
- [x] No component throws for any description — "renders <Graph> and a per-type component for any JSON value", "renders <Graph> for circle-shaped values of any content", and the throwing-layout test

Carried findings:
- [x] GSV TICKET-002 SEC-001 — `formatIssue` in `src/core/issues.ts` (`tests/core/issues.test.ts` "formatIssue"); placeholder renders text children only ("prints issue paths escaped and as text, never as markup")
- [x] GSV TICKET-002 SEC-002 — 20-issue limit; 5,000 unknown 500-character keys → 20 `<li>`, "…and 4980 more.", markup under 20,000 characters
- [x] GSV TICKET-002 SEC-003, CPSE TICKET-002 CR-006 / SEC-003 — throwing layout → `internal_error`; no `file:`, `/node_modules/`, `    at `, `RangeError` or `Infinity` in result or markup
- [x] GSV TICKET-003 SEC-001 — request-body-limit note in the TSDoc of `Graph` and `createGraph` (documentation; checked by reading, not by a test)
- [x] GSV TICKET-004 SEC-005 — no package code here calls `describe`; the test layout uses `describeNormalized`

## Decisions Made

### DEL-001: The fallback function is the consumer's issue notification; no `onIssues`

**Context:** The specification's Behaviors line asks for a notification "each time a new invalid description is received"; AD-014 and TQ-007 settled that the notification is the `fallback` render function. The ticket's Known Hazards forbid an `onIssues` callback.
**Decision:** CPSE-REQ-017 is met by `fallback={(issues) => …}`, called during render with a fresh copy of the full issue list and no side effect. There is no `onIssues` prop, no effect and no memoization; validation runs on every render.
**Rationale:** A callback in render runs twice under strict mode and is a side effect; one in an effect needs a client component (prd/IC-002). Re-validating per render keeps the component a pure function of its props.
**Ticket Impact:** As specified by AD-014. If the Product Owner later wants a callback, a client-only wrapper can add it (TR-007).

### DEL-002: A graph-type mismatch reuses `unknown_graph_type`

**Context:** A per-type component given another type's description must report a graph-type mismatch; the fixed issue-code set (GSV-REQ-030) has no such code, and adding one is governed by GSV-REQ-034 / RES-008.
**Decision:** When the description is an object whose `type` is not the component's, the component reports `unknown_graph_type` at `/type` with `allowed: [type]` (and `got` when a type was given) and skips validation. A non-object goes to the validator (`not_an_object`); a `type` getter that throws is left to the validator (`internal_error`).
**Rationale:** The existing code gives the right message ("type must be one of: circle; got "number-line".") and structured data, with no change to the public code list.
**Ticket Impact:** None on the public API.

### DEL-003: The layout registry is a static table, not a registration call

**Context:** The ticket's Output names `registerLayout(type, layout)`; downstream tickets say each layout is "registered in `src/layout/registry.ts`"; the package declares `"sideEffects": false`.
**Decision:** `layouts` is a frozen null-prototype record in `registry.ts`; a type ticket adds one import and one entry, as for `definitions`. `getLayout(type, registry = layouts)` reads it. No mutable `registerLayout` exists.
**Rationale:** A registration call run when a type's module loads is a side effect a bundler may drop under `sideEffects: false`, and a mutable global makes output depend on import order. A static table is pure and tree-shakes predictably.
**Ticket Impact:** Deviation from the declared Output (see below); downstream wording ("registered in `src/layout/registry.ts`") still holds.

### DEL-004: A fallback function that throws is not caught

**Context:** CPSE-REQ-018 requires that a component never throws because its description is invalid.
**Decision:** An exception from the consumer's own `fallback` function propagates; only validation and layout are guarded.
**Rationale:** Swallowing the consumer's error would hide their bug; the guarantee concerns descriptions, which the package controls.
**Ticket Impact:** Documented on `Fallback`.

### DEL-005: An unknown `fallback` value renders the placeholder; components are wrapped in a fragment

**Context:** `fallback` arrives from JavaScript callers too, and a component must return an element whatever the fallback returns.
**Decision:** Any value other than `"none"` or a function renders the default placeholder. `Graph` and per-type components return `<>{…}</>`, which adds no markup.
**Rationale:** The visible default is the safe outcome for a typo; the fragment keeps both components' types `ReactElement` and their markup identical.
**Ticket Impact:** None.

### DEL-006: A validated type with no layout lists the drawable types, or is an internal error

**Context:** Definitions and layouts are filled by separate edits; a type could be defined before its layout exists.
**Decision:** `unknown_graph_type` at `/type` with `allowed` = the types that have both a definition and a layout; when there are none, the fixed `internal_error`.
**Rationale:** Tells a caller what can be drawn now; an empty `allowed` list is not a valid issue (`asTerms`).
**Ticket Impact:** None; once every type has both, this path is unreachable.

## Deviations from Plan

- `registerLayout` is absent from `src/layout/registry.ts` (DEL-003), as the approved plan stated. Downstream type tickets register by adding their entry to `layouts`; nothing they read changes otherwise.
- The existing boundaries test "allows react in the React renderer" was changed to import `createElement`, because importing `useState` in `src/react` is now rejected by design.
- A property-test assertion that `Graph` equals `renderGraph` with the package registries was added to `tests/react/Graph.test.tsx`, so a change to `Graph`'s wrapper is caught (found by the mutation check).

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| CPSE-REQ-007 | `src/layout/registry.ts`:layouts; `src/react/createGraphComponent.tsx`:createGraphComponent, TypedGraph | `@spec CPSE-REQ-007, …` |
| CPSE-REQ-008 | `src/layout/registry.ts`:layouts, getLayout; `src/react/createGraphComponent.tsx`:renderGraph; `src/react/Graph.tsx`:Graph | `@spec CPSE-REQ-008, …` |
| CPSE-REQ-009 | `src/graph.ts`:createGraph | `@spec CPSE-REQ-009, CPSE-REQ-014, CPSE-REQ-018` |
| CPSE-REQ-010 | `src/react/createGraphComponent.tsx`:createGraphComponent, TypedGraph; `src/react/Graph.tsx`:Graph | `@spec CPSE-REQ-010, …` |
| CPSE-REQ-014 | `src/graph.ts`:createGraph; `src/react/createGraphComponent.tsx`:renderFallback, renderGraph, TypedGraph; `src/react/Graph.tsx`:Graph | `@spec CPSE-REQ-014, …` |
| CPSE-REQ-015 | `src/react/Placeholder.tsx`:Placeholder; `src/core/issues.ts`:formatIssue; `src/react/createGraphComponent.tsx`:renderFallback; `src/react/Graph.tsx`:Graph | `@spec CPSE-REQ-015, …` |
| CPSE-REQ-016 | `src/react/createGraphComponent.tsx`:renderFallback, TypedGraph; `src/react/Graph.tsx`:Graph | `@spec CPSE-REQ-016, …` |
| CPSE-REQ-017 | `src/react/createGraphComponent.tsx`:renderFallback, TypedGraph; `src/react/Graph.tsx`:Graph | `@spec CPSE-REQ-017, …` |
| CPSE-REQ-018 | `src/graph.ts`:createGraph; `src/react/createGraphComponent.tsx`:renderGraph, TypedGraph; `src/react/Graph.tsx`:Graph | `@spec CPSE-REQ-018, …` |

The `src/react/**` pure-component lint block sits under the existing `@spec CPSE-REQ-011` annotation in `eslint.config.js`.

## Notes

- GSV `definitions` and `layouts` are both empty, so the shipped `Graph` renders the placeholder for every description until the first type ticket lands. Tests use `fixtureRegistry` + `fixtureLayouts`. When GSS TICKET-002 lands, add its example to the equality test in `tests/react/Graph.test.tsx`.
- Type tickets: add `import { layout as circleLayout } from "./circle"` and a `circle: circleLayout` entry to `layouts`, then `export const CircleGraph = createGraphComponent("circle")` in `src/react/graphs/CircleGraph.tsx` and export it from `src/index.ts`.
- TICKET-006 and TICKET-007 reuse `formatIssue` from `src/core/issues.ts` for text output.
- React 18 was not re-run on a scratch copy for this ticket; the components use only `createElement`/JSX fragments, which React 18 supports. TICKET-004 runs the cross-version checks.

## Post-Review Amendments

- **graph-library/component-packaging-and-source-export-ticket-003-code-review/CR-002**: per-type components draw with their own definition and layout.
  - `createGraphComponent(type, { definition, layout })` builds one-entry tables, refuses a definition of another type, and returns a `GraphComponent<T>` tagged with `graphType`. `createGraphComponentWith` and the `Registries` default are removed.
  - `renderGraph(props, registries)` and `getLayout(type, registry)` take their tables explicitly. `Graph` holds the package tables.
  - The construction of `layouts` is marked `/* @__PURE__ */`.
  - New `tests/package/per-type-bundle.test.ts` (esbuild; new dev dependency `esbuild ^0.28.2`) proves a per-type bundle leaves out another type's layout.
  - **Corrects DEL-003's rationale:** a static table tree-shakes only where nothing reads it by a runtime key. Per-type components therefore must not draw through it.
  - **Corrects the record's Notes for type tickets:** write `createGraphComponent("circle", { definition: circle, layout: circleLayout })`, and also add the layout to `layouts` so `Graph` draws it.
  - The GSV `definitions` half is carried as Known Hazards on graph-library/geometric-shapes-and-solids/TICKET-002 and graph-library/component-packaging-and-source-export/TICKET-004.
  - Files: `src/react/createGraphComponent.tsx`, `src/react/Graph.tsx`, `src/layout/registry.ts`, `src/index.ts`, `tests/react/Graph.test.tsx`, `tests/package/per-type-bundle.test.ts`, `package.json`, `pnpm-lock.yaml`.
- **…-code-review/CR-001**: the per-type mismatch pre-check `mismatch()` is removed.
  - The validator, checking against the component's one-type table, reports a wrong or missing `type` as `unknown_graph_type` at `/type` with only that type allowed. It reads the input through `isPlainObject`/`readObject`, so no component reads the raw input and a revoked Proxy no longer throws.
  - **Corrects DEL-002:** a `type` getter is reported as `wrong_kind` ("type must be plain JSON data"), not `internal_error`; an inherited `type` gives `not_an_object`.
  - Tests: revoked Proxy, throwing getter, inherited `type` and a Proxy whose `get` disagrees with its own property, for both `Graph` and a per-type component.
  - File: `tests/react/Graph.test.tsx`.
- **…-code-review/CR-003**: a package-level describe block in `tests/react/Graph.test.tsx` asserts three things, and passes trivially until the first type lands:
  - the keys of `layouts` equal `registeredTypes(definitions)`;
  - `src/index.ts` exports one `graphType`-tagged component per defined type;
  - `Graph` and each component draw `examples/<type>.json` as identical SVG.

  `GraphComponent` is exported as a type from `.`. Files: `src/react/createGraphComponent.tsx`, `src/index.ts`, `tests/react/Graph.test.tsx`.
- **…-code-review/CR-004**: the `src/react/**` lint block also rejects:
  - importing `Component`, `PureComponent` or `createContext` from React;
  - `React.createContext(...)`;
  - classes extending `(Pure)Component`;
  - `on*` JSX attributes;
  - `on*` keys in `createElement` props.

  `PURE_MESSAGE` was updated. Files: `eslint.config.js`, `tests/package/boundaries.test.ts` (7 cases).
- **Re-verification (all four):**
  - Exit 0: `pnpm lint`, `pnpm typecheck`, `pnpm test` (25 files, 644 tests), `pnpm build`, `pnpm check:dist`, `pnpm check:deps`, `pnpm size` (`.` 9.1 kB of 120 kB; `./core` 9.63 kB), `pnpm publint`, `pnpm attw`.
  - Mutation checks, each failing as expected: raw input read in `TypedGraph`; definition-type check removed; pure marks removed; a default parameter reaching `layouts`.
