# TICKET-004: Add cross-environment rendering, install and bundle-size checks

**Change:** graph-library
**Capability Area:** Component Packaging & Source Export (component-packaging-and-source-export)
**Specification:** specifications/component-packaging-and-source-export.md

**Summary:** Add the end-to-end checks that prove the packaged components hydrate without warnings and render the same markup in Chromium and WebKit, install and render in fresh React 18 and 19 projects, and stay within the bundle budgets.
**Priority:** Must
**Value:** Consumers can trust that a released version works on both React majors, in Safari and Chrome, with server rendering, at a predictable size.

**Requirements Covered:**
- CPSE-NFR-002: ≤ 25 kB min+gzip per single graph type, ≤ 120 kB for the entry component with all types — verified by size-limit in CI
- CPSE-NFR-003: The packed package installs into a fresh React project and renders every documented example on each supported React major — verified by a CI smoke job
- CPSE-NFR-005: Server-rendered and browser-rendered output match for every documented example with no hydration warnings — verified by a CI hydration test

**Prior Art:**
- Read: TICKET-003 output — `src/react/Graph.tsx`, `src/graph.ts`, `src/layout/registry.ts`
- Read: TICKET-001 output — `.github/workflows/ci.yml` (matrix), `.size-limit.json`
- Read: `.gener8v/technical-design/system-design.md` — AD-007 (rounding), AD-016 (Playwright Chromium + WebKit, size-limit), TR-002, TR-004; Infrastructure Requirements
- Read: `.gener8v/constraints/prd.md` — prd/RF-003, prd/OC-004
- Read: `examples/*.json` — produced by each graph-type ticket in the NLC, DGP and GSS areas

**Acceptance Criteria:**
- [ ] `tests/e2e/hydration.spec.ts` server-renders every `examples/*.json` through `<Graph>`, hydrates in Chromium and WebKit, and fails on any hydration warning or console error (CPSE-NFR-005)
- [ ] `tests/e2e/cross-engine.spec.ts` compares the serialized SVG markup produced in Chromium, WebKit and Node.js for every example and for at least 200 generated valid descriptions; any difference fails (TR-002)
- [ ] `tests/smoke/` packs the package with `pnpm pack`, installs the tarball into fresh React 18 and React 19 projects, and renders every example without error (CPSE-NFR-003); the job runs in the CI matrix
- [ ] `.size-limit.json` holds one entry per graph type at 25 kB and one for the entry component at 120 kB; CI fails when a budget is exceeded (CPSE-NFR-002)
- [ ] The checks iterate over `examples/*.json` automatically, so a new graph type is covered by adding its example

**Output:**
- `tests/e2e/hydration.spec.ts`, `tests/e2e/cross-engine.spec.ts`, `playwright.config.ts` — CPSE-NFR-005 and the cross-engine check
- `tests/smoke/react18/`, `tests/smoke/react19/`, `tests/smoke/run.ts` — CPSE-NFR-003
- `.size-limit.json` (budgets), `.github/workflows/ci.yml` (e2e and smoke jobs added) — CPSE-NFR-002

**Constraints:** prd/TC-002 and prd/RF-003 (engine float differences), prd/OC-004 (matrix cost), prd/TC-007

**Known Hazards:**
- These checks are only as complete as `examples/`. They can be merged with whatever examples exist; the final run that closes CPSE-NFR-002, CPSE-NFR-003 and CPSE-NFR-005 for the change must happen after all eleven graph types have landed (Phase 3 in the dependency map). Say which types were covered in the delivery record.
- If a cross-engine difference appears, do NOT loosen the comparison; fix the number formatting in `src/layout/kit/format.ts` or snap the offending trigonometric value (TR-002 mitigation).
- Keep the full matrix on pull requests to main only if CI time becomes a problem (prd/OC-004); never drop a React major from the release workflow.
- Carried from graph-library/component-packaging-and-source-export-ticket-003-code-review/CR-002: per-type components draw with their own definition and layout (`createGraphComponent(type, { definition, layout })`), and `tests/package/per-type-bundle.test.ts` proves a per-type bundle leaves out another type's layout. The GSV `definitions` table still leaks into every per-type bundle through the `registry = definitions` defaults of `propertiesOf` and `describeNormalized` and its unmarked construction (see the matching hazard on graph-library/geometric-shapes-and-solids/TICKET-002). The per-type 25 kB budgets (CPSE-NFR-002) only mean something once that is fixed: check that each `./<type>` size-limit entry excludes the other types' definitions and layouts, for example by extending the bundle test with definition markers.
- Supersedes the carried CPSE TICKET-003 CR-002 hazard above: the shared tables are marked pure and need their registry passed, and `tests/package/per-type-bundle.test.ts` checks source and built-entry (`consumerBundle`) bundles per type. One leak remains: the circle definition (`src/core/definitions/circle.ts`, a plain object) is in the consumer bundle of every built per-type entry, so each `./<type>` size-limit figure includes the circle. Make it a `/* @__PURE__ */ defineCircle()` factory, as a trivial fix or a ticket, before treating the per-type budgets (CPSE-NFR-002) as met, and extend the bundle test to assert "A circle" absent from every other built entry. (ready-tickets reconciliation, 2026-10-21)
- There are twelve graph types, not eleven: graph-library's eleven and the rulers change's ruler, which already has `./ruler` in `.size-limit.json`. (ready-tickets reconciliation, 2026-10-21)
- The cross-engine check's generators keep every text within `CALLER_TEXT_LIMIT` and `UNIT_TEXT_LIMIT` and filter through `validate()`. Include text at the limit and `oneClusterTexts(CALLER_TEXT_LIMIT)` (`tests/fixtures/plain-text.ts`), which is where engines most likely differ. (ready-tickets reconciliation, 2026-10-21)

**Depends On:** TICKET-003
**Blocks:** None

**Size:** Medium

**Notes:** Accessibility and geometry checks per area are owned by the NLC, DGP and GSS verification tickets; this ticket owns cross-environment parity, installability and size only.
