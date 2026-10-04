# TICKET-001: Set up the package foundation and public repository — Delivery Record

## Ticket Reference

**Ticket:** graph-library/component-packaging-and-source-export/TICKET-001
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/component-packaging-and-source-export.md`
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

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Greenfield repository — no existing package, build or CI to conflict with | no `package.json`, no `src/` | only `.gener8v/` and `CLAUDE.md` | ✅ |
| Prior Art: `.gener8v/technical-design/system-design.md` (AD-001, AD-016) | present, Approved | present, Approved 2026-10-04 | ✅ |
| Prior Art: `.gener8v/constraints/prd.md` | present | present, Approved | ✅ |
| Prior Art: `.gener8v/dependencies/dependency-map.md` | present | present, Approved | ✅ |
| Prior Art: `.gener8v/context.md` Repositories table | present | present; verify commands `pnpm lint && pnpm typecheck && pnpm test && pnpm build` | ✅ |
| Node.js 22+ available locally (prd/TC-006) | ≥ 22 | v24.1.0 | ✅ |
| pnpm available (AD-016) | present | 10.28.2 | ✅ |
| npm name `@gener8v/graph-generator` available (TQ-001) | unpublished | registry 404 — not published | ✅ |
| npm organization `@gener8v` exists and is controlled (EXT-002) | exists, owner access | exists; `gener8v-thomas` is owner; holds `@gener8v/ui`, `@gener8v/tokens`, `@gener8v/tailwind-preset` | ✅ |
| Public GitHub repository for `repository`/`bugs` links (EXT-003) | exists | GitHub org `gener8v` exists; repository `gener8v/gener8v.tools.education.graph-generator` not found (404 — absent or private) | ⚠️ Non-blocking — links point at the intended URL; repository creation is outside this ticket |
| Directory is a git repository (for the delivery commit) | git repository | not a git repository | ⚠️ Non-blocking — `git init` proposed in the plan |
| `scripts/generate.ts` (GSV TICKET-005) | absent until GSV TICKET-005 | absent | ✅ Expected — CI step conditional (ticket hazard) |
| Predecessor tickets / reviews | none | Depends On: None | ✅ |

**Resolved from ground truth (not escalated):** TQ-001 — the name `@gener8v/graph-generator` is available and the `@gener8v` scope is owned by the maintainer, so the working name becomes the package name.

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas, 2026-10-04

Setup: `git init`, branch `ticket/cpse-001`, `.gitignore`. Commit at the end; no push.

### Planned Files

- `package.json`: `@gener8v/graph-generator`, version `0.0.0`, `type: module`, `sideEffects: false`, `engines.node >=22`, `peerDependencies.react ^18 || ^19`, no runtime `dependencies`, `license`, `repository`, `bugs`, `homepage`, `files: ["dist"]`, `publishConfig.access public`; `exports` `.`, `./core`, `./tool`, `./export`, `./schema.json`, `./vocabulary.json`; scripts build, typecheck, lint, test, size, publint, attw, check:deps, check:changesets; dev-only tools typescript, tsup, eslint, typescript-eslint, vitest, react, react-dom, @types/react, size-limit, publint, @arethetypeswrong/cli, @changesets/cli, tsx
- `tsconfig.json`: strict + `noUncheckedIndexedAccess`, bundler resolution, `react-jsx`
- `tsup.config.ts`: four entries, ESM + `.d.ts`, React external, target node22/es2022; copies static JSON to `dist/`
- `src/generated/schema.json`, `src/generated/vocabulary.json`: placeholders until GSV TICKET-005 — schema rejects everything (`"not": {}`) with a `$comment`; vocabulary empty lists
- `src/index.ts`, `src/core/index.ts`, `src/tool/index.ts`, `src/export/index.ts`: empty barrels
- `eslint.config.js`: typescript-eslint recommended; `src/{core,tool,export,layout}/**` may not import `react`/`react-dom` or use `window`/`document`; all `src/**` may not use `fetch`, `XMLHttpRequest`, `WebSocket`, `navigator.sendBeacon`
- `vitest.config.ts`: node environment; global setup builds the package once for package tests
- `.size-limit.json`: `.` ≤ 120 kB; other entries ≤ 25 kB (type tickets add entries)
- `scripts/check-dependencies.ts`: fails when a runtime dependency has no justification in `CONTRIBUTING.md` "Runtime dependency notes" (CPSE-NFR-007)
- `scripts/check-changesets.ts` + `.changeset/changelog.js`: every changeset summary must start with Added/Changed/Deprecated/Removed/Fixed; custom changelog formatter writes the label
- `.changeset/config.json`: Changesets config, base branch `main`, public access
- `.github/workflows/ci.yml`: pull-request matrix Node 22/24 × React 18/19, `contents: read`; install frozen lockfile, React 18 swap, lint, typecheck, conditional generate-freshness, test, build, publint, attw (esm-only profile), size, check:deps, check:changesets; no publish; pnpm via npm
- `LICENSE` (MIT), `README.md`, `CONTRIBUTING.md`
- `tests/package/boundaries.test.ts`: ESLint API on in-test fixtures (react import in `src/core`, `document`, `fetch`, clean file)
- `tests/package/node-entry.test.ts`: plain `node` with a resolve hook that throws on `react`/`react-dom`, imports built `/core`, `/tool`, `/export`, asserts no `window`/`document`
- `tests/package/checks.test.ts`: dependency and changeset checks fail on bad input, pass on good

### How Acceptance Criteria Will Be Met

- package.json fields: test asserting each field
- Name availability: recorded in Pre-Flight Reconciliation
- Build, publint, attw: commands with exit 0
- Boundary and no-network lint: `tests/package/boundaries.test.ts`
- Node-only import: `tests/package/node-entry.test.ts`
- CI matrix: workflow file; cannot execute until the GitHub repository exists — recorded Unverified
- Dependency check: `tests/package/checks.test.ts` + script run on real package.json
- License/README/CONTRIBUTING: test of presence and license match
- Changelog categories: `tests/package/checks.test.ts`

Decisions to record: placeholder schema files; repository URL for a repository that does not exist yet; changelog categories as labels within Changesets' bump-type sections (partial match to "grouped"); `bin` deferred to CPSE TICKET-006.

## Progress

- [x] git init, branch, `.gitignore`
- [x] `package.json`, `pnpm-lock.yaml`
- [x] `tsconfig.json`, `tsup.config.ts`
- [x] `src/generated/schema.json`, `src/generated/vocabulary.json`
- [x] `src/index.ts`, `src/core/index.ts`, `src/tool/index.ts`, `src/export/index.ts`
- [x] `eslint.config.js`
- [x] `vitest.config.ts`, `tests/setup/build.ts`
- [x] `.size-limit.json`
- [x] `scripts/check-dependencies.ts`
- [x] `scripts/check-changesets.ts`, `.changeset/changelog.js`, `.changeset/config.json`
- [x] `.github/workflows/ci.yml`
- [x] `LICENSE`, `README.md`, `CONTRIBUTING.md`
- [x] `tests/package/boundaries.test.ts`
- [x] `tests/package/node-entry.test.ts`
- [x] `tests/package/checks.test.ts`
- [x] `.changeset/changelog.d.cts` (added during implementation — DEL-005)

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `package.json`: `@gener8v/graph-generator` 0.0.0 — ES modules only, `sideEffects: false`, Node.js `>=22`, React `^18 || ^19` peer, no runtime dependencies, MIT, repository/bugs/homepage links, `exports` for `.`, `./core`, `./tool`, `./export`, `./schema.json`, `./vocabulary.json`, `./package.json`; scripts for every check; `pnpm.onlyBuiltDependencies: ["esbuild"]`
- `pnpm-lock.yaml`: lockfile for the development tools
- `tsconfig.json`: strict TypeScript with `noUncheckedIndexedAccess`, bundler resolution, `react-jsx`
- `tsup.config.ts`: four ES-module entries with declarations, React external, copies the static JSON files into `dist/`
- `src/index.ts`, `src/core/index.ts`, `src/tool/index.ts`, `src/export/index.ts`: empty entry barrels
- `src/generated/schema.json`, `src/generated/vocabulary.json`: placeholders until GSV TICKET-005 (DEL-001)
- `eslint.config.js`: typescript-eslint recommended plus the no-network rules for `src/**` and the React/browser boundary rules for `src/{core,tool,export,layout}/**`
- `vitest.config.ts`, `tests/setup/build.ts`: Node test environment; one build before the run
- `.size-limit.json`: budgets — `.` 120 kB, `./core`, `./tool`, `./export` 25 kB each
- `scripts/check-dependencies.ts`: CPSE-NFR-007 check against CONTRIBUTING.md's runtime dependency notes
- `scripts/check-changesets.ts`, `.changeset/changelog.cjs`, `.changeset/changelog.d.cts`, `.changeset/config.json`, `.changeset/README.md`: changelog categories (DEL-003)
- `.github/workflows/ci.yml`: Node.js 22/24 × React 18/19 matrix with every check; read-only permissions; no publish step
- `LICENSE`, `README.md`, `CONTRIBUTING.md`, `.gitignore`
- `tests/package/boundaries.test.ts`, `tests/package/node-entry.test.ts`, `tests/package/checks.test.ts`: 39 tests

## Verification Run

Run locally on Node.js v24.1.0, pnpm 10.28.2, React 19.3.0.

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm lint` | 0 | no findings |
| `pnpm typecheck` | 0 | no errors |
| `pnpm test` | 0 | 3 files, 39 tests passed (global setup ran `pnpm build`) |
| `pnpm build` | 0 | `dist/{index,core/index,tool/index,export/index}.{js,d.ts}`, `dist/schema.json`, `dist/vocabulary.json` |
| `pnpm publint` (`publint --strict`, packs with `pnpm pack`) | 0 | "All good!" |
| `pnpm attw` (`attw --pack . --profile esm-only`) | 0 | every entry 🟢 for node16 (ESM) and bundler; node10 and node16-from-CJS ignored by the ESM-only profile |
| `pnpm size` | 0 | all four entries 0 B against 120 kB / 25 kB budgets |
| `pnpm check:deps` | 0 | "Runtime dependencies: 0, all justified." |
| `pnpm check:changesets` | 0 | "Changesets checked: 0." |

First runs failed and were fixed before the passing run above: the declaration build stopped on TypeScript 6's `baseUrl` deprecation (DEL-004), and `pnpm typecheck` lacked types for `changelog.cjs` (DEL-005).

## Acceptance Criteria Verification

- [x] `package.json` names `@gener8v/graph-generator`, `"type": "module"`, `"sideEffects": false`, `engines.node >=22`, `peerDependencies.react ^18 || ^19`, no runtime `dependencies`, `license`, `repository`, `bugs`, `homepage`, and the `exports` map — `tests/package/checks.test.ts` "has the package format and metadata the ticket requires", "exports the planned entry points"
- [x] npm availability checked and recorded (TQ-001) — Pre-Flight Reconciliation: name unpublished (registry 404); `@gener8v` organization exists with `gener8v-thomas` as owner (`npm org ls gener8v`)
- [x] `pnpm build` emits ES modules and `.d.ts` for every entry point; publint and attw report no errors on the packed tarball — `pnpm build`, `pnpm publint`, `pnpm attw` (exit 0); `checks.test.ts` "ships type declarations for every code entry point after the build"
- [x] ESLint fails a file under `src/core`, `src/tool`, `src/export` or `src/layout` that imports `react`/`react-dom` or uses `window`/`document` — `tests/package/boundaries.test.ts` (12 cases over the four directories, plus the React renderer allowed and a clean module accepted)
- [x] ESLint fails on `fetch`, `XMLHttpRequest`, `WebSocket` or `navigator.sendBeacon` in `src/` — `boundaries.test.ts` "no network access anywhere in src" (5 cases, including `globalThis.fetch`)
- [x] A Node.js test imports `./core`, `./tool`, `./export` from the built package with no React loaded and no browser globals — `tests/package/node-entry.test.ts` (resolve hook throws on any `react`/`react-dom` import; a second test proves the hook fires)
- [ ] `.github/workflows/ci.yml` runs lint, typecheck, generate-freshness, test, build, publint, attw and size across React 18/19 × Node.js 22/24 — **Unverified**: the workflow is written, and each step's command passed locally on Node.js 24 with React 19, but the workflow has not run because the GitHub repository does not exist yet. Verified by the first pull request once `gener8v/gener8v.tools.education.graph-generator` is created and pushed; Node.js 22 and React 18 cells are first exercised there
- [x] A CI check fails when `package.json` gains an unjustified runtime dependency (CPSE-NFR-007) — `checks.test.ts` "runtime dependency check" (fails unjustified, passes justified, rejects empty justification); `pnpm check:deps` on the real package.json exit 0
- [x] `LICENSE` (MIT) matches `package.json`; README links repository, issue tracker and documentation; CONTRIBUTING explains issues, changes and the local checks — `checks.test.ts` "repository files"
- [x] Changesets produces `CHANGELOG.md` entries categorised as added / changed / deprecated / removed — `checks.test.ts` "changeset categories" (accepts each category, rejects missing/unknown, formatter writes the bold label). Partial against the word "grouped": see DEL-003
- [x] CPSE-NFR-007 — verified by `pnpm check:deps` (exit 0) and `checks.test.ts`

## Decisions Made

### DEL-001: Placeholder schema and vocabulary files until GSV TICKET-005

**Context:** The ticket requires `./schema.json` and `./vocabulary.json` in the `exports` map now; publint fails an export whose file is missing, and the real files come from GSV TICKET-005.
**Decision:** Commit `src/generated/schema.json` (a valid JSON Schema 2020-12 that accepts nothing — `"not": {}` — with a `$comment` naming the ticket that replaces it) and `src/generated/vocabulary.json` (empty lists); the build copies both into `dist/`.
**Rationale:** An honest placeholder that rejects every description cannot be mistaken for a working schema; the export map is final from the first commit.
**Ticket Impact:** GSV TICKET-005 overwrites both files from `scripts/generate.ts`; the CI freshness step then guards them.

### DEL-002: Repository and documentation URLs point at a repository that does not exist yet

**Context:** `repository`, `bugs` and `homepage` must be set; GitHub org `gener8v` exists but `gener8v/gener8v.tools.education.graph-generator` returns 404.
**Decision:** Use `https://github.com/gener8v/gener8v.tools.education.graph-generator` (matching the local directory name) and `https://gener8v.github.io/gener8v.tools.education.graph-generator/` for documentation.
**Rationale:** Matches the organisation's naming; changing the URLs later is a one-line edit verified by `checks.test.ts`.
**Ticket Impact:** The repository must be created (public) before CI can run and before release (CPSE TICKET-009, EXT-003).

### DEL-003: Changelog categories as labels inside Changesets' version sections

**Context:** Changesets always groups `CHANGELOG.md` lines under "Major / Minor / Patch Changes" headings; a custom formatter controls each line, not the headings.
**Decision:** Require every changeset summary to begin with `Added:`, `Changed:`, `Deprecated:`, `Removed:` or `Fixed:` (`scripts/check-changesets.ts`, in CI), and render the category in bold at the start of each line (`.changeset/changelog.cjs`).
**Rationale:** Every changelog entry states which kind of change it is, with no fork of Changesets. True per-category headings would require replacing Changesets' release writer.
**Ticket Impact:** Partial match to the acceptance criterion's "grouped as" wording — entries are categorised, not sectioned. If sectioned headings are required, a post-version script can regroup the new version's lines; that would be a follow-up ticket.

### DEL-004: TypeScript 6 pinned; declaration build ignores the `baseUrl` deprecation

**Context:** `pnpm add typescript` installed TypeScript 7 (the native compiler), which has no JavaScript compiler API; tsup's declaration build and typescript-eslint (peer `<6.1.0`) both need it. Under TypeScript 6, tsup's declaration build sets `baseUrl`, which TypeScript 6 reports as a deprecation error.
**Decision:** Pin `typescript@~6.0.3`; pass `ignoreDeprecations: "6.0"` to tsup's declaration build only.
**Rationale:** Keeps the toolchain on supported versions; the project's own `tsconfig.json` uses no deprecated option.
**Ticket Impact:** Moving to TypeScript 7 waits for tsup and typescript-eslint to support it.

### DEL-005: Type declarations for the changelog formatter

**Context:** The test imports `.changeset/changelog.cjs`, which must stay CommonJS for Changesets; `pnpm typecheck` failed with an implicit `any`.
**Decision:** Add `.changeset/changelog.d.cts` and include it in `tsconfig.json`.
**Rationale:** Keeps strict type-checking over the test without a suppression comment.
**Ticket Impact:** One file beyond the ticket's Output list.

### DEL-006: Boundary rules also forbid `navigator` and `EventSource`

**Context:** The ticket names `window`/`document` and four network APIs.
**Decision:** Also forbid `navigator` in non-rendering code and `EventSource` everywhere in `src/`.
**Rationale:** `navigator` is a browser global non-rendering code must not need; `EventSource` is a network API of the same kind as `WebSocket`.
**Ticket Impact:** Stricter than required; no effect on downstream tickets.

## Deviations from Plan

- `.changeset/changelog.d.cts` added (DEL-005) — not in the plan; no downstream impact.
- `exports` gained `./package.json` — lets tools read the package version; no downstream impact.
- `tsup.config.ts` passes `ignoreDeprecations` to the declaration build and TypeScript is pinned to 6.0 (DEL-004) — downstream tickets use the same toolchain.
- `pnpm.onlyBuiltDependencies: ["esbuild"]` added to `package.json` so pnpm 10 runs esbuild's install script.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| CPSE-REQ-003 | `tsup.config.ts`:default export | `@spec CPSE-REQ-003, CPSE-REQ-004` |
| CPSE-REQ-004 | `tsup.config.ts`:default export | `@spec CPSE-REQ-003, CPSE-REQ-004` |
| CPSE-REQ-005 | `eslint.config.js`:no-network rule block | `@spec CPSE-REQ-005` |
| CPSE-REQ-006 | `eslint.config.js`:boundary rule block; `src/core/index.ts`, `src/tool/index.ts`, `src/export/index.ts` | `@spec CPSE-REQ-006` |
| CPSE-REQ-041 | `scripts/check-changesets.ts`:checkChangesetSummary; `.changeset/changelog.cjs`:module | `@spec CPSE-REQ-041` |
| CPSE-NFR-007 | `scripts/check-dependencies.ts`:checkDependencies | `@spec CPSE-NFR-007` |

Not annotated, because they live in files without comments: CPSE-REQ-001, CPSE-REQ-002, CPSE-REQ-037, CPSE-REQ-038, CPSE-REQ-040 (`package.json` fields, `LICENSE`) and CPSE-REQ-039 (`CONTRIBUTING.md`). Each is proven by `tests/package/checks.test.ts`.

## Notes

- **Before CI can run:** create the public GitHub repository `gener8v/gener8v.tools.education.graph-generator`, push `main`, and open a pull request from this branch. That run verifies the open acceptance criterion and the React 18 / Node.js 22 cells.
- **For downstream tickets:** each graph-type ticket adds an entry to `tsup.config.ts`, an `exports` entry `./<type>`, and a `.size-limit.json` entry. Non-rendering code goes under `src/core`, `src/tool`, `src/export` or `src/layout`, where the linter enforces the React/browser boundary.
- **Tests and the build:** `pnpm test` builds first (global setup), so package tests always see the current `dist/`.
- **Package name:** nothing was published. Publishing is CPSE TICKET-009.

## Post-Review Amendments

None
