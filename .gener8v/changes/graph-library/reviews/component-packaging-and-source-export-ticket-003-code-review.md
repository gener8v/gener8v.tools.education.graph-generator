# TICKET-003: Provide the entry component, entry function, per-type component factory and invalid-description fallback — Code Review

## Summary

I reviewed the delivery of `graph-library/component-packaging-and-source-export/TICKET-003` (delivery commit `9f6fdfa`, branch `ticket/cpse-003`). I checked it against the ticket and its Known Hazards, the Component Packaging & Source Export specification, `constraints/prd.md` and `technical-design/system-design.md`. `createGraph`, `Graph`, the placeholder, the fallback modes and the carried security hazards all match the ticket. The nine requirements are annotated and listed in the specification, and every Verification Run command reproduces with exit 0. I also ran three checks the record did not run:
- lint, typecheck and tests on React 18.3.1: all exit 0
- the seven mutation checks: each is caught
- `gener8v-state.py lint`: 0 errors, 0 warnings

There are two Issues:
- **CR-001.** A per-type component throws on a revoked-Proxy description, where `<Graph>` shows the placeholder. So CPSE-REQ-018 and acceptance criterion 9 are only partly met. The cause is the mismatch pre-check, which reads the raw input by its own rules rather than GSV's.
- **CR-002.** The factory draws through the package-wide definitions and layouts. So any per-type component built from it carries every graph type, against AD-001, prd/TC-007 and CPSE-REQ-004. This is latent while the tables are empty, but the record tells every type ticket to use the factory.

There are two Observations:
- **CR-003.** No package-level test ties definitions, layouts and examples together.
- **CR-004.** The purity lint covers hooks and `"use client"`, but not state, context or event handlers.

There are 4 findings: 0 Critical, 2 Issues, 2 Observations.

**Reviewer:** `code-reviewer` agent, fresh context (findings phase only, 2026-10-10)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/component-packaging-and-source-export-ticket-003-delivery.md`
**Files Reviewed:**
- `src/layout/registry.ts`
- `src/graph.ts`
- `src/core/issues.ts` (`formatIssue`, added here)
- `src/react/Placeholder.tsx`
- `src/react/createGraphComponent.tsx`
- `src/react/Graph.tsx`
- `src/index.ts`
- `eslint.config.js` (`PURE_MESSAGE`, `HOOK_PATTERN`, `pureImportOptions`, `pureSyntax`, the `src/react/**` block)
- `tests/fixtures/layouts.ts`
- `tests/graph.test.ts`
- `tests/react/Graph.test.tsx`
- `tests/core/issues.test.ts` (the `formatIssue` cases)
- `tests/package/boundaries.test.ts` (the purity cases and the changed "allows react in the React renderer" case)
- `.gener8v/specifications/component-packaging-and-source-export.md` (`## @spec Coverage` rows)
- Read as dependencies of the delivered code, not delivered here: `src/core/validate/index.ts`, `src/core/validate/envelope.ts`, `src/core/validate/json.ts`, `src/core/definitions/index.ts`, `src/core/describe.ts`, `src/core/index.ts`, `tests/fixtures/definitions/index.ts`, `tsup.config.ts`, `package.json`, `.size-limit.json`, `.github/workflows/ci.yml`

**Findings:** 4
**Critical:** 0 | **Issues:** 2 | **Observations:** 2

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| `src/layout/registry.ts` maps each graph type to its layout; type tickets register into it; an unregistered type is reported as an issue, not thrown | Yes | `layouts` is a frozen null-prototype table (`src/layout/registry.ts:21-23`), empty until the type tickets add their entries (DEL-003; no `registerLayout`, see Delivery Decisions Review). `getLayout` (`:30-32`) reads own entries only and returns `undefined` for anything else, including non-strings. A validated type with no layout becomes an issue in `src/graph.ts:25-34`: `unknown_graph_type` listing the drawable types, or `internal_error` when none can be drawn (DEL-006). Tests: `tests/graph.test.ts:12-24`, `:44-52` |
| `createGraph(description)` returns `{ ok: true, description, provenance, scene }` for a valid description and `{ ok: false, issues }` otherwise; it never throws (property test over arbitrary JSON values) | Yes | `CreateGraphResult` is at `src/graph.ts:13-15`. `createGraphWith` (`:20-41`) validates, looks up the layout and calls it inside one `try`. `createGraph` (`:54-56`) binds the package tables, and `src/index.ts:6-7` exports it. Tests: valid result with normalized description, provenance and a Scene that passes `checkScene` (`tests/graph.test.ts:27-35`); every issue returned (`:37-42`). Never throws: `fc.jsonValue()` over 300 runs on both package and fixture tables (`:71-81`); circle-shaped records (`:83-95`); throwing getter, revoked Proxy, cycle, symbol, bigint and function (`:97-113`) |
| `createGraphComponent(type)` returns a pure component accepting `description`, `textAlternative?`, `fallback?`; given a description of a different type it applies the invalid behavior with a graph-type mismatch issue | Yes | `createGraphComponent` is at `src/react/createGraphComponent.tsx:100-102`. `TypedGraph` (`:83-89`) takes `GraphProps` (`:22-28`) and uses no hooks or state. `mismatch` (`:67-78`) reports `unknown_graph_type` at `/type` with `allowed: [type]` (DEL-002). Test: `tests/react/Graph.test.tsx:111-124` covers another type, a missing `type`, placeholder text, and a non-object passed to the validator. How the pre-check reads the input, and the throw it can raise, are in CR-001 |
| `<Graph>` dispatches any valid description to the matching layout; for every registered type's example, `<Graph>` and the per-type component produce identical static markup (CPSE-REQ-010) | Yes | `Graph` (`src/react/Graph.tsx:17-20`) calls `renderGraph` → `createGraphWith` → `getLayout(description.type)` → `SceneSvg` (`src/react/createGraphComponent.tsx:47-60`). The package registers no type yet, so the tests use the fixture circle, as the Known Hazard directs. Dispatch: `tests/react/Graph.test.tsx:38-43`. Equality across fixture examples and 20-plus text alternatives, `HOSTILE_TEXT` included: `:45-56`. `Graph` ≡ `renderGraph` with the package tables: `:198`. Nothing extends this check to real types: CR-003 |
| With no `fallback`, an invalid description (including `undefined`) renders `Placeholder`: a visible box stating the graph could not be drawn and listing each issue message, drawn in black on white so it reads in greyscale | Yes | The default branch is at `src/react/createGraphComponent.tsx:43`. `Placeholder` (`src/react/Placeholder.tsx:28-42`) has `role="note"`, a 2px black border, `#000000` text on `#ffffff`, the heading "This graph could not be drawn.", and one `<li>` per issue via `formatIssue`, up to 20 (the carried SEC-002 cap). Tests: `{ description: invalid }`, `{ description: undefined }` and `{}` (`tests/react/Graph.test.tsx:67-75`); colors limited to black and white (`:77-84`) |
| `fallback="none"` renders nothing; `fallback={(issues) => …}` renders the function's result and the function receives the full issue list | Yes | `src/react/createGraphComponent.tsx:40` (`"none"` → `null`) and `:42` (the function gets a fresh copy of every issue). Tests: `tests/react/Graph.test.tsx:86-91` (`"none"`, `"placeholder"`, unknown value), `:93-103` (three issues received, equal to `createGraphWith`'s list), `:105-109` (not called for a valid description) |
| When the description changes from invalid to valid, the graph renders and the placeholder is gone (re-render test) | Yes | `tests/react/Graph.test.tsx:146-174`. It uses jsdom with `createRoot` and `act()`, for both the entry-equivalent and a per-type component, going invalid → valid → `undefined`. Once the description is valid, the text content is exactly the SVG's (`"A circle with radius 5.r = 5"`) and no placeholder remains. The test also passed on React 18.3.1 |
| Components contain no hooks, state or effects and render without a client boundary (a React Server Components render test, or a static check that no hook is imported) | Yes | A static check, as the criterion allows. `eslint.config.js:66-76` and `:118-130` reject importing any `use…` name from `react`/`react-dom`, calling `x.useX(...)`, and the `"use client"` directive. `tests/package/boundaries.test.ts:79-104` proves each rule fires and every shipped `src/react` file passes. `pnpm lint` exits 0. What the rule does not cover is in CR-004 |
| No component throws for any description: a property test renders `<Graph>` with arbitrary JSON values and asserts no exception | Partial | The named property test exists and passes: `<Graph>`, the entry-equivalent and a per-type component over `fc.jsonValue()` (`tests/react/Graph.test.tsx:191-202`). So do the circle-shaped test (`:204-216`) and the throwing-layout test (`:177-189`). But a per-type component throws `TypeError` on a revoked-Proxy description, which `<Graph>` handles (reviewer probe). That input is in the record's own hostile set (`tests/graph.test.ts:104-105`), yet no component test uses it. See CR-001 |
| *(Known Hazard)* AD-014 / TQ-007: no `onIssues`; the fallback function is the notification; record it as a decision | Yes | No `onIssues` prop or effect anywhere in `src/react`. `Fallback` documents the function as the notification (`src/react/createGraphComponent.tsx:11-19`). DEL-001 records it |
| *(Known Hazard)* Validation lives in GSV; render from the normalized description only, never the raw input | Partial | `createGraphWith` calls `validateWith` and lays out `result.description` only (`src/graph.ts:22-35`). The per-type pre-check reads the raw input itself, by rules that differ from GSV's (CR-001) |
| *(Known Hazard)* Registry empty until type tickets land; test with a fixture layout registered only in tests; ship no fake type | Yes | `layouts` is empty (`tests/graph.test.ts:13-16`). `tests/fixtures/layouts.ts` holds the test-only circle and throwing layouts |
| *(Carried)* GSV TICKET-002 SEC-001: one shared `formatIssue(issue)` in `src/core/` escaping `path` like messages, `<path>: <message>` | Yes | `src/core/issues.ts:386-400` clips the path to 200 characters and escapes path and message with the message escaper. Tests: `tests/core/issues.test.ts:491-515`. The placeholder uses it (`src/react/Placeholder.tsx:36`) |
| *(Carried)* GSV TICKET-002 SEC-002: placeholder shows at most 20 issues, then "…and N more"; size test; structured `issues` stays complete | Yes | `PLACEHOLDER_ISSUE_LIMIT = 20` (`src/react/Placeholder.tsx:7`), with "…and N more." at `:39`. The test (`tests/react/Graph.test.tsx:126-136`) uses 5,000 unknown 500-character keys and expects 5,000 issues, 20 `<li>`, under 20,000 characters and no U+202E. The hazard asked for 10,000 keys, but 10,000 keys plus `type` and `radius` exceed `DESCRIPTION_VALUE_LIMIT` (`src/core/validate/structure.ts:17`) and yield a single `too_large` issue. So 5,000 is the test that exercises the cap; the record does not say why it differs. The fallback function still receives every issue (`:93-103`) |
| *(Carried)* GSV TICKET-002 SEC-001: issue text only as React text children | Yes | No `dangerouslySetInnerHTML` anywhere in `src/`. Test: `tests/react/Graph.test.tsx:138-143` (`<img …>` key printed as escaped text) |
| *(Carried)* GSV TICKET-002 SEC-003: no exception text in issues; `internal_error`; test for no stack frames | Yes | `src/graph.ts:36-40` returns the fixed `internal_error`. Tests: `tests/graph.test.ts:63-69` and `tests/react/Graph.test.tsx:177-189` find no `file:`, `/node_modules/`, `    at `, `RangeError` or `Infinity` |
| *(Carried)* GSV TICKET-003 SEC-001: say in the component documentation that a server must keep its own request-body limit | Yes | TSDoc on `createGraph` (`src/graph.ts:49-51`) and on `Graph` (`src/react/Graph.tsx:12-14`) |
| *(Carried)* GSV TICKET-004 SEC-005: use `describeNormalized`, not `describe` | Yes | No package code in this delivery calls `describe`. The fixture layout uses `describeNormalized` (`tests/fixtures/layouts.ts:15`) |
| *(Carried)* CPSE TICKET-002 CR-006 / SEC-003: call the layout inside a `try`; a thrown error → `internal_error`; test with a registered layout that throws; pass `textAlternative` unchanged | Yes | The layout call (`src/graph.ts:35`) sits inside the `try` (`:21-40`). `throwingLayouts` throws like `fmt(Infinity)` (`tests/fixtures/layouts.ts:32-36`) and is tested through `createGraphWith` and both components. `textAlternative` is passed through as is (`src/react/createGraphComponent.tsx:49`). Test: `tests/react/Graph.test.tsx:58-61` |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| CPSE-REQ-007 | One React component per graph type | `src/react/createGraphComponent.tsx:100-102` (`createGraphComponent`), `:81-91` (`createGraphComponentWith`, `TypedGraph`); `src/layout/registry.ts:21-23` (`layouts`) | Yes. The factory is in place and each type ticket adds its component. Whether those components can be imported alone is CR-002 (CPSE-REQ-004) |
| CPSE-REQ-008 | A single entry component for any graph type | `src/react/Graph.tsx:17-20`; `src/react/createGraphComponent.tsx:57-60` (`renderGraph`); `src/layout/registry.ts:30-32` (`getLayout`); `src/index.ts:4` | Yes |
| CPSE-REQ-009 | A single entry function returning a renderable graph with normalized description, or issues | `src/graph.ts:54-56` (`createGraph`), `:20-41` (`createGraphWith`); `src/index.ts:6-7` | Yes |
| CPSE-REQ-010 | Type-specific and entry components render identical output | `src/react/createGraphComponent.tsx:86`: when the type matches, `TypedGraph` calls the same `renderGraph` with the same tables, and both components wrap the result in a fragment. Tests: `tests/react/Graph.test.tsx:45-56`, `:198` | Yes, for the fixture type. Real types: CR-003 |
| CPSE-REQ-014 | An invalid description is not rendered as a graph | `src/react/createGraphComponent.tsx:47-50` (`renderResult`: `SceneSvg` only on `ok: true`), `:86` (mismatch → fallback); `src/graph.ts:23` | Yes |
| CPSE-REQ-015 | Default visible placeholder listing the issue messages | `src/react/Placeholder.tsx:28-42`; `src/core/issues.ts:396-400` (`formatIssue`); `src/react/createGraphComponent.tsx:43` | Yes |
| CPSE-REQ-016 | Consumer chooses nothing, default placeholder or own content | `src/react/createGraphComponent.tsx:39-44` (`renderFallback`), `:19` (`Fallback`) | Yes |
| CPSE-REQ-017 | Issues reported to the consumer through a notification they supply | `src/react/createGraphComponent.tsx:42`: the `fallback` function receives every issue during render. This is the reading AD-014 and the ticket's Known Hazard adopt, superseding the specification's Behaviors line | Yes |
| CPSE-REQ-018 | Never throws on an invalid description | `src/graph.ts:21-40` (`try`/`catch`); `src/react/createGraphComponent.tsx:57-60`, `:83-89`; tests `tests/graph.test.ts:62-114`, `tests/react/Graph.test.tsx:176-216` | Partial. `createGraph` and `Graph` never throw, but a per-type component throws on a revoked Proxy (CR-001) |

*This ticket carries no NFR. CPSE-NFR-002 (bundle budgets) belongs to TICKET-004. Today `pnpm size` reports `.` at 9.11 kB of 120 kB.*

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/IC-002 | Server Components: no state, effects or event handlers; no function props across the boundary | Yes | The shipped components have no hooks, state, effects or handlers. `fallback` as a function stays on whichever side renders `Graph`, as AD-014 intends. The static check enforces the hook and `"use client"` half; state, context and handlers are not checked (CR-004) |
| prd/TC-001 | Output computed during render from the description alone; no DOM measuring | Yes | Components are pure functions of their props, with output from `createGraphWith` → layout → `SceneSvg`. The `src/react/**` lint block still rejects browser globals (`eslint.config.js:126-128`) |
| prd/CC-002 | WCAG 2.1 AA: text alternative, 3:1 contrast, color not the only cue | Yes | The placeholder is black on white (21:1) with a solid border and text, so no meaning depends on color (`src/react/Placeholder.tsx:10-19`; test `tests/react/Graph.test.tsx:77-84`). `textAlternative` reaches `SceneSvg` unchanged, so its accessible-name rule applies (`src/react/createGraphComponent.tsx:49`) |
| prd/TC-007 | Tree-shaking per graph type: side-effect-free ES modules, per-type entry points | No (latent) | Not named by the ticket, but it binds the factory this ticket delivers. Through `packageRegistries` and the default parameters of `renderGraph` and `getLayout`, every per-type component reaches every type's layout (reviewer bundling probe). See CR-002 |
| prd/TC-004 | React 18 and 19 APIs only | Yes | Only `createElement`/JSX and fragments; the tests use `act` and `createRoot`. Reviewer run on React 18.3.1 (the CI matrix swap in `.github/workflows/ci.yml:44-45`): `pnpm lint`, `pnpm typecheck` and `pnpm test` exit 0, 630 tests. The record did not run React 18 |
| prd/CC-003 | No network, no data collection | Yes | The `src/react/**` block keeps the network import paths (`pureImportOptions.paths`, `eslint.config.js:69-72`) and the network syntax rules. `pnpm check:dist` exits 0 |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-002 | Pure `layout(normalized) → Scene`; components only print the Scene | Yes | `Layout = (normalized: DescriptionBase) => Scene` (`src/layout/registry.ts:8`). `DescriptionBase` is what `validateWith` returns for a normalized description. Layouts are called only with `validateWith`'s `description` (`src/graph.ts:24-35`), and the only printer is `SceneSvg` |
| AD-014 | Pure components; `fallback`: `"placeholder"` (default) \| `"none"` \| `(issues) => ReactNode`; the function is the CPSE-REQ-017 notification; no `onIssues` | Yes | `Fallback` matches the decision exactly (`src/react/createGraphComponent.tsx:19`). No hooks, state or effects; the function is called during render with no side effect. The never-throw part of the decision's context fails for per-type components on a revoked Proxy (CR-001) |
| AD-001 | `.` exports `Graph` and every per-type component; `./<type>` entries; "a consumer importing one graph type must not pay for the others" | Partial | `src/index.ts` exports `Graph`, `createGraph` and the prop types. But the factory binds the package-wide tables, so a `./<type>` entry built on it will carry every type (CR-002) |
| Interface Contract "Component props" | `description` (any), `textAlternative?: string`, `fallback?: "placeholder" \| "none" \| (issues: Issue[]) => ReactNode`; SVG or the fallback; invalid → fallback, never throws | Partial | The props are exact (`src/react/createGraphComponent.tsx:19-28`) and so is the output. "Never throws" fails for per-type components on a revoked Proxy (CR-001) |
| Interface Contract "Layout contract" | Input: a normalized description from `validate`; output: a Scene with every number through `fmt()`; no errors expected | Yes | `src/graph.ts:22-35`. The `try` around the call is the defensive guard the carried CR-006 hazard asked for |
| Component "React renderer" | `<Graph description textAlternative? fallback? />`, one component per type, `<SceneSvg scene />` internal; depends on Validator, Layouts, React | Yes | `src/react/Graph.tsx`, `src/react/createGraphComponent.tsx`. `SceneSvg`, `renderGraph`, `createGraphComponentWith` and `Registries` are not exported from `src/index.ts` |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| CPSE-REQ-007 | `@spec CPSE-REQ-007` | `src/layout/registry.ts:20` (`layouts`); `src/react/createGraphComponent.tsx:82` (`TypedGraph`), `:99` (`createGraphComponent`) | Yes |
| CPSE-REQ-008 | `@spec CPSE-REQ-008` | `src/layout/registry.ts:20` (`layouts`), `:29` (`getLayout`); `src/react/createGraphComponent.tsx:56` (`renderGraph`); `src/react/Graph.tsx:16` (`Graph`) | Yes |
| CPSE-REQ-009 | `@spec CPSE-REQ-009` | `src/graph.ts:53` (`createGraph`) | Yes |
| CPSE-REQ-010 | `@spec CPSE-REQ-010` | `src/react/createGraphComponent.tsx:82` (`TypedGraph`), `:99` (`createGraphComponent`); `src/react/Graph.tsx:16` (`Graph`) | Yes |
| CPSE-REQ-014 | `@spec CPSE-REQ-014` | `src/graph.ts:53`; `src/react/createGraphComponent.tsx:38` (`renderFallback`), `:56`, `:82`; `src/react/Graph.tsx:16` | Yes |
| CPSE-REQ-015 | `@spec CPSE-REQ-015` | `src/react/Placeholder.tsx:27` (`Placeholder`); `src/core/issues.ts:395` (`formatIssue`); `src/react/createGraphComponent.tsx:38`; `src/react/Graph.tsx:16` | Yes |
| CPSE-REQ-016 | `@spec CPSE-REQ-016` | `src/react/createGraphComponent.tsx:38`, `:82`; `src/react/Graph.tsx:16` | Yes |
| CPSE-REQ-017 | `@spec CPSE-REQ-017` | `src/react/createGraphComponent.tsx:38`, `:82`; `src/react/Graph.tsx:16` | Yes |
| CPSE-REQ-018 | `@spec CPSE-REQ-018` | `src/graph.ts:53`; `src/react/createGraphComponent.tsx:56`, `:82`; `src/react/Graph.tsx:16` | Yes |

**Coverage:** 9 of 9 requirements annotated. Every annotation sits on the line directly above its declaration, after the TSDoc block. `TypedGraph`'s sits inside `createGraphComponentWith`, directly above the inner function.
**Missing:** None. `gener8v-state.py lint` reports 0 errors and 0 warnings. `createGraphWith` holds the `try`/`catch` but carries no annotation, which follows the GSV precedent of an annotated `validate` delegating to an unannotated `validateWith`. The private helpers `mismatch` and `renderResult` serve annotated callers. The pure-component lint block sits under the existing `@spec CPSE-REQ-011` in `eslint.config.js:123`, as the record says.
**Specification table:** Yes. The rows for CPSE-REQ-007..010 and CPSE-REQ-014..018 in `## @spec Coverage` of `.gener8v/specifications/component-packaging-and-source-export.md` list exactly these locations. The delivery commit added only those nine rows to the specification.

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm lint` | 0 | Yes |
| `pnpm typecheck` | 0 | Yes |
| `pnpm test` | 0 | Yes (24 files, 630 tests; 11 in `tests/graph.test.ts`, 17 in `tests/react/Graph.test.tsx`, 4 new `formatIssue` and 8 new purity cases) |
| `pnpm build` | 0 | Yes |
| `pnpm check:dist` | 0 | Yes |
| `pnpm check:deps` | 0 | Yes |
| `pnpm size` | 0 | Yes (`.` 9.11 kB of 120 kB; `./core` 9.63 kB of 25 kB) |
| `pnpm publint` | 0 | Yes ("All good!") |
| `pnpm attw` | 0 | Yes (only the ignored node10 / CJS notes under the esm-only profile) |
| Mutation checks (7) → `tests/graph.test.ts`, `tests/react/Graph.test.tsx` | 1 each (expected) | Yes. Every mutation fails the suites. Counts were 2, 1, 2, 1, 1, 1, 1; the record has 13 for the first. My catch removal rethrows the error, which fails the two throwing-layout tests. Replacing the `catch` with a `finally` that returns `internal_error` gives 13, so the record's mutation was a different removal. Either way it is caught. The raw-path mutation also fails 3 cases in `tests/core/issues.test.ts` |

*Where I ran it: I ran the nine commands on the shared tree, whose source is identical to `9f6fdfa` (HEAD; the only modified file is `.gener8v/runs.jsonl`), on Node.js v24.1.0 and pnpm 10.28.2. I applied the mutations and probes only to scratch copies of `9f6fdfa` (`git archive`) in the session scratchpad, and confirmed each copy was restored afterwards. The React 18.3.1 run used a separate scratch copy installed with `pnpm install --frozen-lockfile --offline`, then the CI workflow's `pnpm add --save-dev --save-exact react@18.3.1 react-dom@18.3.1 @types/react@18.3.31 @types/react-dom@18.3.7`. `pnpm lint`, `pnpm typecheck` and `pnpm test` all exit 0 there, with 630 tests.*

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | It follows AD-014 and the Known Hazard exactly: no `onIssues`, no effect, no memoization, and a fresh copy of the issues per call (`src/react/createGraphComponent.tsx:42`). The `Fallback` TSDoc says how a consumer who needs a side effect gets one. |
| DEL-002 | Reasonable | Reusing `unknown_graph_type` gives the right message and data without touching the public code list (GSV-REQ-030/034). Two problems lie in how the decision is carried out, not in the choice of code. The pre-check reads the raw input by rules of its own, and it can throw. The record's statement that a throwing `type` getter yields `internal_error` is wrong: the result is `wrong_kind` (CR-001). |
| DEL-003 | Reasonable | A static table beats a registration call made at import time. That call would be a side effect under `"sideEffects": false`, and the output would depend on import order. It also matches the GSV `definitions` rule. The rationale "a static table is pure and tree-shakes predictably" does not hold as implemented. The table is built by calls a bundler keeps, and the factory and two default parameters keep it reachable from every component (CR-002). |
| DEL-004 | Reasonable | CPSE-REQ-018 is about descriptions. Swallowing a consumer's own error would hide it. Documented on `Fallback` (`src/react/createGraphComponent.tsx:16-17`). |
| DEL-005 | Reasonable | The visible default is the safe outcome for a typo (`tests/react/Graph.test.tsx:89-90`). The fragment adds no markup, and `:198` pins `Graph` to `renderGraph`. |
| DEL-006 | Reasonable | `asTerms` rejects an empty list, so `internal_error` is the only valid issue when nothing can be drawn (`tests/graph.test.ts:44-52`). The path is "unreachable once every type has both" only if definitions and layouts stay in step, and nothing checks that (CR-003). |
| *(deviation)* No `registerLayout`; layouts are a static table | Reasonable | The Engineer approved this in the plan. Downstream impact is nil: no ticket in `.gener8v/changes/graph-library/tickets/` calls `registerLayout`. Every type ticket says its layout is "registered in `src/layout/registry.ts`", which adding an entry satisfies. The ticket's Output line still names `registerLayout`; an Audit can align the wording. |
| *(deviation)* Boundaries test "allows react in the React renderer" imports `createElement` | Reasonable | Importing `useState` there is now rejected by design. The new assertion (`toEqual([])`) is stronger than the old one. |
| *(deviation)* Property assertion `Graph` ≡ `renderGraph` | Reasonable | It closes the gap the wrapper mutation exposed. |

## Findings

### CR-001: A per-type component throws on a revoked-Proxy description, because its mismatch pre-check reads the raw input outside GSV's guarded readers

**Severity:** Issue
**Location:** `src/react/createGraphComponent.tsx:67-78` (`mismatch`), `src/react/createGraphComponent.tsx:83-89` (`TypedGraph`); `tests/react/Graph.test.tsx:176-216`
**Traces To:** CPSE-REQ-018; TICKET-003 acceptance criterion 9 ("No component throws for any description") and criterion 3; system design Interface Contracts "Component props" ("never throws"); AD-014; TICKET-003 Known Hazard 2 ("Validation lives in GSV … render from the normalized description only … never the raw input"); TICKET-003/DEL-002
**Description:**
- **The throw.** `mismatch()` calls `Array.isArray(description)` on line 68, outside its `try` (lines 70-75). `Array.isArray` throws on a revoked Proxy, which is why GSV's `isPlainObject` wraps the same call (`src/core/validate/json.ts:11-21`). Reviewer probe, rendering with `renderToStaticMarkup`:
  - `<Graph description={revoked} />` renders the placeholder.
  - Components from `createGraphComponent("circle")` and from `createGraphComponentWith("circle", fixtures)` both throw `TypeError: Cannot perform 'IsArray' on a proxy that has been revoked`.

  The revoked Proxy is part of the record's own hostile set (`tests/graph.test.ts:104-105`), but only `createGraphWith` is tested with it. The component never-throw tests use `fc.jsonValue()` and a throwing layout.
- **Reading by different rules.** The pre-check reads `description.type` with an ordinary property read. That runs getters and Proxy `get` traps and follows the prototype chain. GSV reads own data properties only, once, and never calls a getter (`readObject`, `src/core/validate/json.ts:32-46`). Reviewer probes:
  - A counting `type` getter runs once per per-type render and never for `Graph`.
  - An object that inherits `type: "number-line"` is reported as a mismatch ("got "number-line""), where the validator reports `not_an_object`.
  - A Proxy can answer `"circle"` from its `get` trap and `"number-line"` from its own-property descriptor. It then passes the pre-check and is validated as a number-line. With a number-line layout registered, the circle component would draw it.
- **The record.** DEL-002 and the comment on line 73 say a throwing `type` getter "is left to the validator (`internal_error`)". The validator treats an accessor as opaque and reports `wrong_kind` at `/type` ("type must be plain JSON data; got nothing.") (`src/core/validate/envelope.ts:33-37`; reviewer probe).

**Impact:**
- A per-type component can crash a page or a server render where `<Graph>` shows the placeholder. That goes against CPSE-REQ-018 and the "Component props" contract.
- A revoked Proxy is not exotic in React applications. Immer revokes its drafts when `produce` returns, so passing a stale draft reaches this path.
- Because the input is read by two different rules, a per-type component can accept, and draw, a description whose normalized `type` is not its own.
- The record misstates the edge case.

**Recommendation:**
- In `mismatch()`, read `type` with GSV's own readers: `isPlainObject(description) ? readObject(description)?.values.get("type") : undefined` (`src/core/validate/json.ts`). Neither throws, and both see exactly what the validator sees. A non-plain or unreadable value gives `undefined`, and the validator then reports it.
- After validation succeeds, check that the normalized `type` equals the component's type, and report the mismatch otherwise. Then a per-type component only ever draws a normalized description of its own type, as Known Hazard 2 asks. One way: `TypedGraph` calls `createGraphWith` and `renderResult` itself instead of `renderGraph`.
- Add the hostile values (revoked Proxy, throwing getter, inherited `type`) to the component never-throw tests, for both `Graph` and a per-type component.
- Correct DEL-002 and the comment on line 73 in the record's Post-Review Amendments.

**Status:** Resolved
**Resolution:** Approved (Thomas, 2026-10-11). Fixed as part of the CR-002 change, which made the hand-written check unnecessary: `mismatch()` is removed. Each per-type component validates against a one-entry definitions table, so the validator itself reads `type` through `isPlainObject`/`readObject` and reports a wrong or missing type as `unknown_graph_type` at `/type` with only this type allowed. A component never reads the raw input. `tests/react/Graph.test.tsx` adds revoked-Proxy, throwing-getter, inherited-`type` and lying-Proxy cases for both components. Mutation check: reading the raw input in `TypedGraph` fails 2 tests.

---

### CR-002: Every per-type component made by the factory carries every graph type's layout, so per-type imports cannot leave the other types out

**Severity:** Issue
**Location:** `src/react/createGraphComponent.tsx:36` (`packageRegistries`), `src/react/createGraphComponent.tsx:57` (`renderGraph`'s default `registries = packageRegistries`), `src/react/createGraphComponent.tsx:100-102` (`createGraphComponent`); `src/layout/registry.ts:21-23` (`layouts`), `src/layout/registry.ts:30` (`getLayout`'s default `registry = layouts`); delivery record Notes ("Type tickets: … `export const CircleGraph = createGraphComponent("circle")`")
**Traces To:** AD-001 (Context: "a consumer importing one graph type must not pay for the others"; Decision: `./<type>` entries); prd/TC-007; CPSE-REQ-004; CPSE-NFR-002; TICKET-003 Output ("the factory every `src/react/graphs/<Pascal>Graph.tsx` uses"); TICKET-003/DEL-003 (Rationale: "A static table is pure and tree-shakes predictably")
**Description:**
- **The cause.** `createGraphComponent(type)` takes a type name and draws through `packageRegistries = { definitions, layouts }`. Those are the tables that will hold all eleven types. Lookups are by a runtime string, so no bundler can drop the entries a given component never uses.
- **The internal factory does not escape it.** `createGraphComponentWith(type, ownRegistries)` hits the same wall. `renderGraph`'s default parameter references `packageRegistries`, and `getLayout`'s references `layouts`, so both tables stay reachable from any component. `layouts` is also built by calls (`Object.freeze(Object.assign(Object.create(null), …))`), and bundlers keep calls.
- **Reviewer probe.** On a scratch copy of `9f6fdfa`, I entered two marker layouts (`circle`, `number-line`) in `layouts` and bundled an entry `export const CircleGraph = createGraphComponent("circle")` with esbuild (`--bundle --minify --tree-shaking=true`, React external).
  - The bundle contains the number-line layout.
  - So does the same entry written as `createGraphComponentWith("circle", { definitions: {}, layouts: { circle } })`.
  - The number-line layout dropped out only when three things held: both default parameters removed, the table's construction marked `/* @__PURE__ */`, and the entry passing its own tables.
- **The GSV side.** The `definitions` table follows the same route, through the defaults of `propertiesOf(type, registry = definitions)` (`src/core/definitions/index.ts:35`) and `describeNormalized(normalized, registry = definitions)` (`src/core/describe.ts:11`). A marker definition stayed in the per-type bundle even after the layout side was fixed. That half is existing GSV code, not this delivery.

**Impact:**
- No effect today, since both tables are empty.
- But the record's Notes tell every type ticket to write `createGraphComponent("<type>")`. The first is `graph-library/geometric-shapes-and-solids/TICKET-002`, whose Known Hazards say every other type will copy it. Each `./<type>` entry would then bundle all eleven layouts and definitions.
- That fails CPSE-REQ-004 outright, and puts CPSE-NFR-002's 25 kB per-type budget (CPSE TICKET-004's size-limit entries) at risk.
- Changing the factory's signature after the types adopt it means touching every per-type file.

**Recommendation:**
- **Give each per-type component its own tables.** There are two ways:
  - `createGraphComponent(definition, layout)`. The ticket's criterion names `createGraphComponent(type)`, so this needs a ticket amendment, which is an Audit matter.
  - Keep `createGraphComponent(type)`, and have each `src/react/graphs/<Pascal>Graph.tsx` call `createGraphComponentWith(type, { definitions: { [type]: definition }, layouts: { [type]: layout } })`.
- **Remove the defaults.** Drop the default parameters of `renderGraph` and `getLayout`; `Graph` and `createGraph` pass the package tables explicitly.
- **Make the table droppable.** Mark each call in the `layouts` construction `/* @__PURE__ */` so a bundler may drop the table when nothing reads it.
- **Add a bundle test.** For example, esbuild or size-limit on a fixture entry with two test layouts, failing when a per-type entry contains another type's layout.
- **Fix the record.** Correct the record's Notes and DEL-003's rationale in Post-Review Amendments.
- **Raise the GSV half separately.** Raise the `definitions` defaults as their own ticket, or as a Known Hazard on `graph-library/component-packaging-and-source-export/TICKET-004` and `graph-library/geometric-shapes-and-solids/TICKET-002`, before the first per-type entry lands.

**Status:** Resolved
**Resolution:** Approved (Thomas, 2026-10-11).
- `createGraphComponent(type, { definition, layout })` draws with one-entry tables, refuses a definition of another type, and is generic over the type. `createGraphComponentWith` is removed.
- `renderGraph` and `getLayout` take their tables explicitly, with no defaults. `Graph` alone holds the package tables.
- The construction of `layouts` is marked `/* @__PURE__ */`.
- `tests/package/per-type-bundle.test.ts` bundles with esbuild (new dev dependency `esbuild ^0.28.2`) after putting a marker layout for a second type into the table. It asserts that the per-type bundle leaves it out and the `Graph` bundle keeps it. Mutation checks: removing the pure marks, or adding a default parameter that reaches `layouts`, each fail the test.
- The GSV `definitions` half is a Known Hazard on graph-library/geometric-shapes-and-solids/TICKET-002 and graph-library/component-packaging-and-source-export/TICKET-004.

---

### CR-003: Nothing ties the package's definitions, layouts and examples together, so the equality check and DEL-006's "unreachable" path depend on later tickets remembering

**Severity:** Observation
**Location:** `tests/react/Graph.test.tsx:45-56`; `src/graph.ts:26-34`; delivery record Notes ("When GSS TICKET-002 lands, add its example to the equality test in `tests/react/Graph.test.tsx`")
**Traces To:** TICKET-003 acceptance criterion 4 ("for every registered type's example, `<Graph>` and the per-type component produce identical static markup"); CPSE-REQ-010; CPSE-REQ-008; TICKET-003/DEL-006 ("once every type has both, this path is unreachable")
**Description:**
- **The equality test never sees real types.** It iterates `fixtureExamples` filtered by `fixtureLayouts`, and never reads the package's `definitions`, `layouts` or `examples/`. So it will not cover a real type when one registers. Equality holds by construction today: `TypedGraph` calls the same `renderGraph` when the type matches, and `:198` pins `Graph` to `renderGraph`.
- **The extension lives only in the record.** The instruction to extend the test is in the record's Notes. Some type tickets carry their own equality criterion: `graph-library/geometric-shapes-and-solids/TICKET-002` and `graph-library/number-lines-and-coordinate-graphs/TICKET-002`..`004`. Others do not: `graph-library/data-graphs-and-pictographs/TICKET-002`, `-003` and `-005`, and `graph-library/geometric-shapes-and-solids/TICKET-003`..`007`.
- **A missing layout goes unnoticed.** No test fails if a type ticket registers a definition without its layout. `createGraph` would then report a description that passes `validate` and the schema as `unknown_graph_type` (DEL-006).

**Impact:**
- A later change to the mismatch pre-check (CR-001) or the factory (CR-002) could make a per-type component differ from `Graph`. For types whose tickets lack the criterion, nothing would catch it.
- A type shipped without its layout validates but never draws.

**Recommendation:** Add a package-level test to `tests/graph.test.ts` or `tests/react/Graph.test.tsx` that:
- asserts `registeredTypes(definitions)` equals the keys of `layouts`;
- for each registered type, renders `examples/<type>.json` through `Graph` and through that type's component, and asserts identical markup.

It passes vacuously today and extends itself as types land. The alternative is a Known Hazard on each type ticket that lacks the equality criterion.

**Status:** Resolved
**Resolution:** Approved (Thomas, 2026-10-11). Per-type components carry a read-only `graphType`; `GraphComponent<T>` is exported as a type. A new describe block in `tests/react/Graph.test.tsx` asserts three things:
- the keys of `layouts` equal `registeredTypes(definitions)`;
- `src/index.ts` exports one tagged component per defined type;
- `Graph` and each component draw `examples/<type>.json` as identical SVG.

It passes trivially today and extends itself as types land.

---

### CR-004: The purity lint rejects hooks and "use client" only; class state, `createContext` and event handlers pass

**Severity:** Observation
**Location:** `eslint.config.js:16-17` (`PURE_MESSAGE`), `eslint.config.js:66-76` (`HOOK_PATTERN`, `pureImportOptions`, `pureSyntax`), `eslint.config.js:118-130`; `tests/package/boundaries.test.ts:79-104`
**Traces To:** prd/IC-002 ("no state, effects or event handlers"); TICKET-003 acceptance criterion 8; AD-014 ("pure functions with no state, effects or hooks")
**Description:** The rule meets the criterion's stated alternative, "a static check that no hook is imported", and every shipped file passes it. But its message promises "no hooks, state, effects or client boundary", and prd/IC-002 also rules out state and event handlers. I fed probe files to `eslint --stdin --stdin-filename src/react/Probe.tsx`. It reported nothing for:
- a class component with `state` and `setState`;
- `createContext(0)`, which React Server Components do not support;
- `<svg onClick={…} />`.

Hooks imported by name, renamed, or reached through a namespace import are all rejected.
**Impact:** None today. A later change to a per-type component or the placeholder could add class state, context or a handler and still pass `pnpm lint`. The component would then fail as a Server Component, which is the case prd/IC-002 and AD-014 protect.
**Recommendation:**
- In the `src/react/**` block, add `Component`, `PureComponent` and `createContext` to the restricted `react` import names.
- Add a `no-restricted-syntax` selector for handler attributes (`JSXAttribute[name.name=/^on[A-Z]/]`).
- Add one boundaries case for each.

Alternatively, narrow `PURE_MESSAGE` to what the rule actually checks.

**Status:** Resolved
**Resolution:** Approved (Thomas, 2026-10-11). The `src/react/**` block now also rejects:
- importing `Component`, `PureComponent` or `createContext`;
- `React.createContext(...)`;
- classes extending `(Pure)Component`;
- `on*` JSX attributes;
- `on*` keys in a `createElement` props object.

`PURE_MESSAGE` now names context and event handlers. `tests/package/boundaries.test.ts` adds 7 cases, and every shipped file still passes.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Approved | Removed `mismatch()`. Per-type components validate against their own one-type table, so the validator reports a mismatch from its safe readers. Hostile-value tests added for both components. | `src/react/createGraphComponent.tsx`, `tests/react/Graph.test.tsx` |
| CR-002 | Approved | Added `createGraphComponent(type, { definition, layout })`. Removed the registry defaults and marked `layouts` pure. Added an esbuild bundle test and the `esbuild` dev dependency. GSV half recorded as Known Hazards on GSS TICKET-002 and CPSE TICKET-004. | `src/react/createGraphComponent.tsx`, `src/react/Graph.tsx`, `src/layout/registry.ts`, `src/index.ts`, `tests/package/per-type-bundle.test.ts`, `package.json`, `pnpm-lock.yaml`, two ticket files |
| CR-003 | Approved | Added a `graphType` tag and the `GraphComponent` type. A package-level test now ties definitions, layouts, exported components and examples together. | `src/react/createGraphComponent.tsx`, `src/index.ts`, `tests/react/Graph.test.tsx` |
| CR-004 | Approved | The purity lint now also rejects class components, `createContext` and `on*` handlers, with 7 boundary cases. | `eslint.config.js`, `tests/package/boundaries.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 open (4 resolved: 2 Issues, 2 Observations)
**Notes:** Resolved with the user (Thomas) on 2026-10-11. All four findings were fixed and re-verified. The full Verification Run exits 0 (25 test files, 644 tests). Mutation checks confirm each new test fails without its fix. One part of CR-002 lies outside this delivery's code: the GSV `definitions` table still reaches per-type bundles through `propertiesOf` and `describeNormalized` defaults. It is carried as a Known Hazard on graph-library/geometric-shapes-and-solids/TICKET-002 (the first per-type component) and graph-library/component-packaging-and-source-export/TICKET-004 (the per-type size budgets).
