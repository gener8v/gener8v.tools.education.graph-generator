# TICKET-001: Set up the package foundation and public repository

**Change:** graph-library
**Capability Area:** Component Packaging & Source Export (component-packaging-and-source-export)
**Specification:** specifications/component-packaging-and-source-export.md

**Summary:** Create the package skeleton every other ticket builds on: the ES-module-only package with its entry points, strict TypeScript build, lint with import-boundary rules, test runner, size budgets, the CI matrix, and the open-source repository files.
**Priority:** Must
**Value:** Contributors can clone the repository, run every check locally and in CI, and every later ticket has a place to put its code.

**Requirements Covered:**
- CPSE-REQ-001: Installable from the public npm registry under a single package name
- CPSE-REQ-002: React declared as a peer dependency, not bundled
- CPSE-REQ-003: Type declarations shipped for every public export
- CPSE-REQ-004: A single graph type importable without the others
- CPSE-REQ-005: No network requests and no telemetry at runtime
- CPSE-REQ-006: Validation, export and tool handler usable in Node.js without a browser
- CPSE-REQ-037: Open-source license file, named in package metadata
- CPSE-REQ-038: Public repository linked from package metadata
- CPSE-REQ-039: Contribution guidelines
- CPSE-REQ-040: Public issue tracker linked from package metadata
- CPSE-REQ-041: Changelog of added, changed, deprecated and removed behavior
- CPSE-NFR-007: Zero runtime dependencies beyond the React peer, or each justified — verified by a CI check over package.json dependencies

**Prior Art:**
- Read: `.gener8v/technical-design/system-design.md` — AD-001 (entry points: `.`, `./<type>`, `./core`, `./tool`, `./export`, `./schema.json`, `./vocabulary.json`, bin), AD-016 (toolchain, CI matrix, Changesets, 0.x), Infrastructure Requirements
- Read: `.gener8v/constraints/prd.md` — prd/TC-004, prd/TC-005, prd/TC-006, prd/TC-007, prd/CC-001, prd/CC-003, prd/IC-003, prd/OC-004
- Read: `.gener8v/dependencies/dependency-map.md` — DEP-001 (every area waits on this foundation), EXT-002, EXT-003, EXT-005
- Read: `.gener8v/context.md` — stack and Repositories table (verify commands)

**Acceptance Criteria:**
- [ ] `package.json` names the package `@gener8v/graph-generator` (or the confirmed name), is `"type": "module"`, has `"sideEffects": false`, `engines.node` `>=22`, `peerDependencies.react` `^18 || ^19`, no runtime `dependencies`, `license`, `repository`, `bugs` and `homepage` fields, and an `exports` map with `.`, `./core`, `./tool`, `./export`, `./schema.json`, `./vocabulary.json` (per-type `./<type>` entries are added by each type ticket)
- [ ] npm availability of the package name and the `@gener8v` organization is checked and the result recorded in the delivery record (TQ-001)
- [ ] `pnpm build` emits ES modules and `.d.ts` files for every entry point via tsup; publint and Are-The-Types-Wrong report no errors on the packed tarball
- [ ] ESLint fails a file under `src/core`, `src/tool`, `src/export` or `src/layout` that imports `react`, `react-dom` or references `window`/`document` (demonstrated by a test fixture)
- [ ] ESLint (or a CI script) fails on any use of `fetch`, `XMLHttpRequest`, `WebSocket` or `navigator.sendBeacon` in `src/` (CPSE-REQ-005, prd/CC-003)
- [ ] A Node.js test imports `./core`, `./tool` and `./export` from the built package with no React DOM installed and no browser globals
- [ ] `.github/workflows/ci.yml` runs lint, typecheck, generate-freshness (no-op until GSV TICKET-005), test, build, publint, attw and size on pull requests across React 18/19 × Node.js 22/24
- [ ] A CI check fails when `package.json` gains a runtime dependency not listed with a justification in `CONTRIBUTING.md`'s dependency notes (CPSE-NFR-007)
- [ ] `LICENSE` (MIT) is present and matches `package.json` `license`; `README.md` links the repository, issue tracker and documentation; `CONTRIBUTING.md` explains reporting issues, proposing changes and running `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
- [ ] Changesets is configured so each release produces `CHANGELOG.md` entries grouped as added / changed / deprecated / removed

**Output:**
- `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `tsup.config.ts`, `eslint.config.js`, `vitest.config.ts`, `.size-limit.json` — package format and checks; downstream type tickets append their `./<type>` export and size-limit entry
- `src/index.ts`, `src/core/index.ts`, `src/tool/index.ts`, `src/export/index.ts` — empty barrels that later tickets fill
- `.github/workflows/ci.yml` — the CI matrix
- `LICENSE`, `README.md`, `CONTRIBUTING.md`, `.changeset/config.json`
- `tests/package/node-entry.test.ts` — proves Node-only import of `./core`, `./tool`, `./export`
- `tests/package/boundaries.test.ts` — proves the import-boundary and no-network lint rules fire on fixtures
- `scripts/check-dependencies.ts` — the CPSE-NFR-007 check

**Constraints:** prd/TC-004 (React 18 and 19 APIs only), prd/TC-005 (non-rendering entry points load no React DOM), prd/TC-006 (Node.js 22 and 24), prd/TC-007 (ES modules, side-effect free), prd/CC-001 (license compatibility), prd/CC-003 (no data collection), prd/OC-004 (CI matrix)

**Known Hazards:**
- The package name is unconfirmed (TQ-001, EXT-002). Use `@gener8v/graph-generator` everywhere through one constant in `package.json`; if the name or scope is unavailable, record it in the delivery record and stop before anything publishes — do NOT publish a placeholder.
- AD-001 makes the package ES-module only. Do not add a CommonJS build "for compatibility"; Node.js 22+ loads ESM from CommonJS (prd/TC-006).
- The generate-freshness CI step has nothing to check until GSV TICKET-005 (`scripts/generate.ts`) exists. Wire the step to run `pnpm generate` only when the script exists, so CI is green now and enforced later.

**Depends On:** None
**Blocks:** TICKET-002, TICKET-007, TICKET-009

**Size:** Medium

**Notes:** This is dependency-map DEP-001 — every ticket in every area of this change builds on it. Release publishing itself is TICKET-009; this ticket must not contain a publish step.
