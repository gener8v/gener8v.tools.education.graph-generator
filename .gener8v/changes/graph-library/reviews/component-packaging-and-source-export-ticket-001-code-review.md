# TICKET-001: Set up the package foundation and public repository — Code Review

## Summary

I reviewed the delivery of `graph-library/component-packaging-and-source-export/TICKET-001` (delivery commit `e4cc7e9`, branch `ticket/cpse-001`) against the ticket, the Component Packaging & Source Export specification, `constraints/prd.md` and `technical-design/system-design.md`. The foundation is sound. Package metadata, the ES-module build, type declarations, publint, Are-The-Types-Wrong, size budgets and the Node-only import test are all in place, and every Verification Run command reproduces. I also ran every check on all four matrix cells locally (Node.js 22/24 × React 18/19), and all exit 0. Four of the ten acceptance criteria are only partly met:
- the ESLint boundary and no-network rules can be bypassed (other file extensions, `globalThis.`/`self.` access, dynamic `import()`, Node network modules);
- the dependency check reads only `dependencies`;
- `CHANGELOG.md` entries carry a category label but are not grouped by category;
- the CI workflow has never run, because the public repository does not exist.

Six covered requirements also have no `@spec` annotation. There are 9 findings: 0 Critical, 6 Issues, 3 Observations.

**Reviewer:** `code-reviewer` agent, fresh context (findings phase only, 2026-10-05)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/component-packaging-and-source-export-ticket-001-delivery.md`
**Files Reviewed:**
- `package.json`
- `pnpm-lock.yaml` (TypeScript and typescript-eslint entries only)
- `tsconfig.json`
- `tsup.config.ts`
- `eslint.config.js`
- `vitest.config.ts`
- `tests/setup/build.ts`
- `.size-limit.json`
- `src/index.ts`
- `src/core/index.ts`
- `src/tool/index.ts`
- `src/export/index.ts`
- `src/generated/schema.json`
- `src/generated/vocabulary.json`
- `scripts/check-dependencies.ts`
- `scripts/check-changesets.ts`
- `.changeset/changelog.cjs`
- `.changeset/changelog.d.cts`
- `.changeset/config.json`
- `.changeset/README.md`
- `.github/workflows/ci.yml`
- `LICENSE`
- `README.md`
- `CONTRIBUTING.md`
- `.gitignore`
- `tests/package/boundaries.test.ts`
- `tests/package/node-entry.test.ts`
- `tests/package/checks.test.ts`

**Findings:** 9
**Critical:** 0 | **Issues:** 6 | **Observations:** 3

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| `package.json` names `@gener8v/graph-generator`, `"type": "module"`, `"sideEffects": false`, `engines.node >=22`, `peerDependencies.react ^18 \|\| ^19`, no runtime `dependencies`, `license`, `repository`, `bugs`, `homepage`, and an `exports` map with `.`, `./core`, `./tool`, `./export`, `./schema.json`, `./vocabulary.json` | Yes | `package.json:2,15-29,33-56`. Asserted by `tests/package/checks.test.ts:10-30`. `./package.json` is an extra export (recorded deviation) |
| npm availability of the package name and the `@gener8v` organization checked and recorded (TQ-001) | Yes | Delivery record Pre-Flight Reconciliation (rows TQ-001, EXT-002). Rechecked 2026-10-05: `registry.npmjs.org/@gener8v%2fgraph-generator` returns 404 (unpublished). The organization ownership claim (`npm org ls`) needs authentication and was not re-checked |
| `pnpm build` emits ES modules and `.d.ts` for every entry point via tsup; publint and Are-The-Types-Wrong report no errors on the packed tarball | Yes | `tsup.config.ts:7-30` (`format: ["esm"]`, `dts`). Re-run: `pnpm build`, `pnpm publint` ("All good!", packs with `pnpm pack`) and `pnpm attw` (`--pack .`, every entry 🟢 for node16-ESM and bundler) all exit 0. `tests/package/checks.test.ts:32-39` |
| ESLint fails a file under `src/core`, `src/tool`, `src/export` or `src/layout` that imports `react`/`react-dom` or references `window`/`document` (test fixture) | Partial | Works for `.ts` files: `eslint.config.js:36-61`, `tests/package/boundaries.test.ts:11-38`. The rule's `files` glob is `src/<dir>/**/*.ts` only. A `.tsx`, `.mts` or `.js` file importing `react`, a `.tsx` file using `window`, a dynamic `import("react")`, and `globalThis.document` / `globalThis.window` / `self` all pass lint (reviewer probe). See CR-001 |
| ESLint (or a CI script) fails on any use of `fetch`, `XMLHttpRequest`, `WebSocket` or `navigator.sendBeacon` in `src/` | Partial | Works for bare globals, `globalThis.fetch`, `window.fetch` and `navigator.sendBeacon`: `eslint.config.js:17-35`, `tests/package/boundaries.test.ts:40-54`. These pass lint (reviewer probe): `new globalThis.XMLHttpRequest()`, `new globalThis.WebSocket(…)`, `new window.XMLHttpRequest()`, `self.fetch(…)`, `window.navigator.sendBeacon(…)`, and `fetch(…)` in any `.mts`/`.js` file under `src/`. See CR-002 |
| A Node.js test imports `./core`, `./tool` and `./export` from the built package with no React DOM installed and no browser globals | Yes | `tests/package/node-entry.test.ts:29-44`: a plain `node` child process with a resolve hook that throws on any `react`/`react-dom` specifier. That is equivalent to React not being installed. The test asserts that `typeof window` and `typeof document` are `"undefined"`. `:46-58` proves the hook fires. Passes on Node.js 22.16.0 and 24.1.0 (reviewer re-run) |
| `.github/workflows/ci.yml` runs lint, typecheck, generate-freshness (no-op until GSV TICKET-005), test, build, publint, attw and size on pull requests across React 18/19 × Node.js 22/24 | Partial | The workflow is complete as written: `.github/workflows/ci.yml:3-75`, matrix `node: [22, 24]` × `react: [18, 19]`, every named step present, freshness step conditional on `scripts/generate.ts` (ticket hazard), no publish step. `actionlint` exits 0. I ran every step's command locally on all four cells (Node.js 22.16.0/24.1.0 × React 18.3.1/19.3.0) and all exit 0. The workflow itself has never run on GitHub Actions because `gener8v/gener8v.tools.education.graph-generator` returns 404. The delivery record correctly leaves this criterion unchecked. See CR-005 |
| A CI check fails when `package.json` gains a runtime dependency not justified in `CONTRIBUTING.md`'s dependency notes (CPSE-NFR-007) | Partial | `scripts/check-dependencies.ts:31-42`, CI step `.github/workflows/ci.yml:71-72`, `tests/package/checks.test.ts:61-82`. Only `dependencies` is checked. `optionalDependencies`, `bundleDependencies` and peers other than React pass unflagged (reviewer probe). See CR-004 |
| `LICENSE` (MIT) present and matches `package.json` `license`; `README.md` links repository, issue tracker and documentation; `CONTRIBUTING.md` explains reporting issues, proposing changes and running `pnpm lint && pnpm typecheck && pnpm test && pnpm build` | Yes | `LICENSE:1`, `package.json:15`, `README.md:14-16`, `CONTRIBUTING.md:6-32`. Asserted by `tests/package/checks.test.ts:42-59`. `LICENSE` is in the packed tarball (`npm pack --dry-run`) |
| Changesets configured so each release produces `CHANGELOG.md` entries grouped as added / changed / deprecated / removed | Partial | `.changeset/config.json:3`, `.changeset/changelog.cjs:7-13`, `scripts/check-changesets.ts:19-24`. Every entry gets a bold category label, but Changesets groups entries by bump type. A simulated `pnpm changeset version` with four changesets put Added, Deprecated and Removed under `### Minor Changes` and Changed under `### Patch Changes`. The delivery record ticks this criterion while calling it partial (DEL-003). See CR-003 |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| CPSE-REQ-001 | Installable from the public npm registry under a single package name | `package.json:2` (name), `package.json:57-60` (`publishConfig.access public`); the tarball passes publint/attw | Yes. Publishing itself is TICKET-009, per the ticket's Notes |
| CPSE-REQ-002 | React declared as a peer dependency, not bundled | `package.json:54-56` (peer), `package.json:84-85` (React dev-only), `tsup.config.ts:23` (`external`) | Yes |
| CPSE-REQ-003 | Type declarations for every public export | `tsup.config.ts:16` (`dts`), `package.json:34-49` (`types` conditions), attw green, `tests/package/checks.test.ts:32-39` | Yes |
| CPSE-REQ-004 | A single graph type importable without the others | `tsup.config.ts:8-18` (one entry per entry point, `splitting`, `treeshake`), `package.json:26` (`sideEffects: false`); per-type entries are added by type tickets | Yes |
| CPSE-REQ-005 | No network requests and no telemetry at runtime | `eslint.config.js:17-35`, `tests/package/boundaries.test.ts:40-54`; the shipped code is empty barrels | Partial. The guard has bypasses (CR-002) |
| CPSE-REQ-006 | Validation, export and tool handler usable in Node.js without a browser | `tests/package/node-entry.test.ts:29-58` (runtime proof against the built package), `eslint.config.js:36-61` | Yes. The runtime test holds; the lint gaps are recorded under AC4 (CR-001) |
| CPSE-REQ-037 | Open-source license file, named in package metadata | `LICENSE`, `package.json:15`; `LICENSE` ships in the tarball | Yes |
| CPSE-REQ-038 | Public repository linked from package metadata | `package.json:18-21`, `README.md:14` | Partial. The link target does not exist (CR-005) |
| CPSE-REQ-039 | Contribution guidelines | `CONTRIBUTING.md:6-58` | Yes |
| CPSE-REQ-040 | Public issue tracker linked from package metadata | `package.json:22-24`, `README.md:15`, `CONTRIBUTING.md:8` | Partial. The link target does not exist (CR-005) |
| CPSE-REQ-041 | Changelog of added, changed, deprecated and removed behavior | `.changeset/config.json:3`, `.changeset/changelog.cjs:7-13`, `scripts/check-changesets.ts:19-24`, CI step `.github/workflows/ci.yml:74-75` | Yes. Every entry states its category; the "grouped" wording belongs to AC10 (CR-003) |
| CPSE-NFR-007 | Zero runtime dependencies beyond the React peer, or each justified — CI check over the manifest | `scripts/check-dependencies.ts:31-42`; `pnpm check:deps` exits 0 in the re-run; `tests/package/checks.test.ts:61-82`; CI step `.github/workflows/ci.yml:71-72` | Partial. The check ignores optional, bundled and extra peer dependencies (CR-004) |

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/TC-004 | React 18 and 19 APIs only | Yes | No React API used yet. Peer range `^18 \|\| ^19` (`package.json:55`). The React 18 cell swaps React in CI (`.github/workflows/ci.yml:37-39`), and the reviewer ran it locally (exit 0) |
| prd/TC-005 | Non-rendering entry points load no React DOM or browser globals | Yes | `tests/package/node-entry.test.ts` proves it on the built `./core`, `./tool` and `./export`. The lint enforcement has gaps (CR-001) |
| prd/TC-006 | Node.js 22 and 24 | Yes | `package.json:27-29` (`>=22`), matrix `.github/workflows/ci.yml:22`, `tsup.config.ts:21` (`node22`). Reviewer ran all checks on Node.js 22.16.0 and 24.1.0 |
| prd/TC-007 | ES modules, side-effect free, per-entry output | Yes | `tsup.config.ts:14` (`esm` only), `package.json:25-26`; no CommonJS build (ticket hazard respected) |
| prd/CC-001 | License compatibility of dependencies and assets | Yes | MIT; zero runtime dependencies; `files: ["dist"]` (`package.json:30-32`) keeps dev tools out of the tarball; `CONTRIBUTING.md:53-55` requires an MIT-compatible license for any added dependency (not machine-checked) |
| prd/CC-003 | No data collection or transmission | Yes | The shipped code is empty. The lint guard against network APIs can be bypassed (CR-002) |
| prd/OC-004 | CI matrix React 18/19 × Node.js 22/24 | Yes | `.github/workflows/ci.yml:19-23`. Written but never executed on Actions (CR-005) |
| prd/IC-003 | Provenance publishing needs a controlled scope organization | Yes | Scope ownership verified at pre-flight. `publishConfig.provenance: true` (`package.json:59`) |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-001 | One ES-module-only package with separate rendering and non-rendering entry points; lint enforces the non-rendering boundary | Partial | Followed: ESM-only, `sideEffects: false`, `exports` `.`, `./core`, `./tool`, `./export`, `./schema.json`, `./vocabulary.json` (`package.json:33-53`), and a boundary lint rule (`eslint.config.js:36-61`, extended to `src/layout`). The lint rule has gaps (CR-001). The `bin` entry is absent with no DEL recording its deferral (CR-009). Per-type `./<type>` entries are deferred to type tickets by the ticket |
| AD-003 | Generated schema and vocabulary; CI freshness check | Yes | Placeholder `src/generated/schema.json` and `src/generated/vocabulary.json` (DEL-001) are copied to `dist/` by `tsup.config.ts:24-29`. Freshness step `.github/workflows/ci.yml:47-54` is conditional on `scripts/generate.ts`, as the ticket hazard asks |
| AD-016 | Toolchain, checks and release process | Yes | Strict TypeScript, pnpm, tsup, Vitest, size-limit, publint, attw, Changesets, ESLint boundary rules, Actions matrix on pull requests, version `0.0.0`. React Testing Library, fast-check, Playwright, axe-core, Storybook and tag publishing belong to later tickets (TICKET-002..009) |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| CPSE-REQ-001 | `@spec CPSE-REQ-001` | — (`package.json`) | No |
| CPSE-REQ-002 | `@spec CPSE-REQ-002` | — (`package.json`, `tsup.config.ts:23`) | No |
| CPSE-REQ-003 | `@spec CPSE-REQ-003` | `tsup.config.ts:6` (default export) | Yes |
| CPSE-REQ-004 | `@spec CPSE-REQ-004` | `tsup.config.ts:6` (default export) | Yes |
| CPSE-REQ-005 | `@spec CPSE-REQ-005` | `eslint.config.js:18` (first line of the no-network config block) | Yes |
| CPSE-REQ-006 | `@spec CPSE-REQ-006` | `eslint.config.js:37`; `src/core/index.ts:3`; `src/tool/index.ts:3`; `src/export/index.ts:3` | Yes |
| CPSE-REQ-037 | `@spec CPSE-REQ-037` | — (`LICENSE`, `package.json`) | No |
| CPSE-REQ-038 | `@spec CPSE-REQ-038` | — (`package.json`) | No |
| CPSE-REQ-039 | `@spec CPSE-REQ-039` | — (`CONTRIBUTING.md`) | No |
| CPSE-REQ-040 | `@spec CPSE-REQ-040` | — (`package.json`) | No |
| CPSE-REQ-041 | `@spec CPSE-REQ-041` | `scripts/check-changesets.ts:18` (`checkChangesetSummary`); `.changeset/changelog.cjs:4` | Yes |
| CPSE-NFR-007 | `@spec CPSE-NFR-007` | `scripts/check-dependencies.ts:30` (`checkDependencies`) | Yes |

**Coverage:** 6 of 12 covered IDs annotated (5 of 11 requirements, plus CPSE-NFR-007)
**Missing:** CPSE-REQ-001, CPSE-REQ-002, CPSE-REQ-037, CPSE-REQ-038, CPSE-REQ-039, CPSE-REQ-040 (CR-006). `gener8v-state.py lint` already warns on this delivery record (it reports CPSE-REQ-001).
**Specification table:** Yes. The six annotated locations match `## @spec Coverage` in `.gener8v/specifications/component-packaging-and-source-export.md`. The six unannotated requirements have no row there.

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm lint` | 0 | Yes |
| `pnpm typecheck` | 0 | Yes |
| `pnpm test` | 0 | Yes (3 files, 39 tests) |
| `pnpm build` | 0 | Yes |
| `pnpm publint` | 0 | Yes ("All good!") |
| `pnpm attw` | 0 | Yes |
| `pnpm size` | 0 | Yes (0 B against the budgets; size-limit reports "minified and brotlied", see CR-008) |
| `pnpm check:deps` | 0 | Yes ("Runtime dependencies: 0, all justified.") |
| `pnpm check:changesets` | 0 | Yes ("Changesets checked: 0.") |

*Where I ran it: an isolated export of commit `e4cc7e9` (`git archive`) in the session scratchpad, with `pnpm install --frozen-lockfile --offline`, on Node.js v24.1.0 and pnpm 10.28.2. The shared working directory changed during the review (state files were modified and an untracked GSV TICKET-002 delivery record appeared), so I left it alone. Delivered source in the working tree is identical to `e4cc7e9`. Beyond the record, I ran the same nine commands on Node.js 24.1.0 × React 18.3.1, Node.js 22.16.0 × React 18.3.1 and Node.js 22.16.0 × React 19.3.0, using the workflow's own React 18 swap. All 27 exited 0.*

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | A schema that accepts nothing, with a `$comment` naming its replacement, cannot pass for a working schema, and it keeps the `exports` map final. GSV TICKET-005 overwrites both files. |
| DEL-002 | Reasonable | The URLs match the organization's naming and are cheap to change. But the repository's absence leaves CPSE-REQ-038/040 partial and AC7 unverified (CR-005). |
| DEL-003 | Questionable | It swaps the criterion's "grouped" for "labelled", yet the record still ticks AC10. A post-version regrouping step is feasible without forking Changesets (CR-003). |
| DEL-004 | Reasonable | Staying on TypeScript 6 keeps tsup's declaration build and typescript-eslint supported. But the manifest says `^6.0.3`, not the `~6.0.3` the record states, and typescript-eslint 8.71.0 supports only `<6.1.0` (CR-007). |
| DEL-005 | Reasonable | Keeps strict type-checking over the formatter test without suppressions. |
| DEL-006 | Reasonable | Stricter than required. `navigator` is also a Node.js global, and non-rendering code has no need for it. |
| *(unrecorded)* | Questionable | The approved plan listed "`bin` deferred to CPSE TICKET-006" among the decisions to record. No DEL records it (CR-009). |

## Findings

### CR-001: The React/browser boundary rule only covers `.ts` files and static imports

**Severity:** Issue
**Location:** `eslint.config.js:36-61` (boundary block; `files` at line 38)
**Traces To:** TICKET-001 acceptance criterion 4; CPSE-REQ-006; prd/TC-005; AD-001 (Consequences: "a lint rule enforces this")
**Description:** The boundary block applies only to `src/core/**/*.ts`, `src/tool/**/*.ts`, `src/export/**/*.ts` and `src/layout/**/*.ts`. In a reviewer probe against the delivered config, all of these produced no lint finding:
- `import { useState } from "react"` in `src/core/a.tsx`, `src/core/a.mts` and `src/core/a.js`
- `window.innerWidth` in `src/layout/a.tsx`
- `await import("react")` in `src/core/dyn.ts`
- `globalThis.document` and `globalThis.window` in `src/core/*.ts`
- `self.location` in `src/core/*.ts`

The criterion says ESLint fails "a file under" these directories that imports React or references `window`/`document`. That only holds for `.ts` files with static imports. `tsconfig.json:20` includes all of `src`, so `.tsx`/`.mts` files there are type-checked and bundled.
**Impact:** Non-rendering code can pull in React or depend on browser globals without lint noticing. The runtime test in `tests/package/node-entry.test.ts` catches React loaded at module evaluation. It does not catch a browser global referenced inside a function, or a dynamic import on a code path that only runs at call time. Every Phase 1 ticket (GSV core, layout kit) writes into these directories and relies on this rule (TICKET-002 Prior Art cites it).
**Recommendation:**
- Widen `files` to `src/{core,tool,export,layout}/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}`.
- Add a `no-restricted-syntax` selector for `ImportExpression` whose source matches `^react(-dom)?($|/)`.
- Add `no-restricted-properties` entries for `globalThis`/`self` × `window`/`document`/`navigator`, and add `self` to the restricted globals.
- Add fixtures to `tests/package/boundaries.test.ts` for a `.tsx` file and a dynamic import.
**Status:** Resolved
**Resolution:** Boundary block now covers `src/{core,tool,export,layout}/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}`; `no-restricted-syntax` rejects dynamic `import()` and `require()` of react/react-dom and `globalThis`/`self` × `window`/`document`/`navigator`; `self` added to restricted globals. Fixtures added for `.tsx`, `.mts`, `.js`, dynamic import, `require`, and global access through `globalThis`/`self`.

---

### CR-002: The no-network rule can be bypassed through other global objects, other file extensions and Node network modules

**Severity:** Issue
**Location:** `eslint.config.js:17-35` (no-network block; `files` at line 19; `no-restricted-properties` at lines 28-33)
**Traces To:** TICKET-001 acceptance criterion 5 ("fails on any use of `fetch`, `XMLHttpRequest`, `WebSocket` or `navigator.sendBeacon` in `src/`"); CPSE-REQ-005; prd/CC-003
**Description:** `no-restricted-properties` covers `globalThis.fetch`, `window.fetch` and `navigator.sendBeacon` only. In a reviewer probe, all of these produced no lint finding:
- in `src/react/*.tsx`: `new globalThis.XMLHttpRequest()`, `new globalThis.WebSocket("wss://x")`, `new window.XMLHttpRequest()`, `self.fetch("https://x")`, `window.navigator.sendBeacon("https://x", "d")`
- `fetch("https://x")` in `src/core/fetch.mts` and in `src/react/fetch.js`, because the block's glob is `src/**/*.{ts,tsx}`
- `import https from "node:https"` and `import net from "node:net"` in `src/core/*.ts`

The non-rendering entry points run in Node.js, where `node:http`, `node:https`, `node:net` and similar modules are the native way to reach the network.
**Impact:** Code that contacts the network can merge with CI green. This breaks the package's privacy promise to school consumers (prd/CC-003: FERPA/COPPA exposure) and the README's "makes no network requests".
**Recommendation:**
- Extend the block's `files` to every script extension under `src/`.
- Replace the per-object property list with a `no-restricted-syntax` selector on `MemberExpression` whose `property.name` is `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` or `sendBeacon`, so access through any object is caught.
- Add `no-restricted-imports` for `node:http`, `node:https`, `node:http2`, `node:net`, `node:tls`, `node:dgram` and their bare names across `src/**`. In flat config, the boundary block's `no-restricted-imports` replaces this one for `src/{core,tool,export,layout}`, so repeat the network modules in the boundary block, as it already does for the network globals.
- Add the fixtures above to `tests/package/boundaries.test.ts`.
**Status:** Resolved
**Resolution:** Network block covers every script extension under `src/`; `no-restricted-syntax` rejects `fetch`/`XMLHttpRequest`/`WebSocket`/`EventSource`/`sendBeacon` reached through any object (dot or computed); `no-restricted-imports`, dynamic `import()` and `require()` reject `http`, `https`, `http2`, `net`, `tls`, `dgram` with and without `node:`; the boundary block repeats the network restrictions. 15 cases × 4 file types added.

---

### CR-003: `CHANGELOG.md` entries are labelled by category but not grouped by category

**Severity:** Issue
**Location:** `.changeset/changelog.cjs:7-13`; `scripts/check-changesets.ts:19-24`
**Traces To:** TICKET-001 acceptance criterion 10 ("entries grouped as added / changed / deprecated / removed"); CPSE-REQ-041; TICKET-001/DEL-003
**Description:** I created four changesets and ran `pnpm changeset version` in the isolated copy. The result:
- `## 0.1.0 / ### Minor Changes` held `**Added:**`, `**Deprecated:**` and `**Removed:**`
- `### Patch Changes` held `**Changed:**`

Entries are grouped by semver bump, and one category can be split across two sections. DEL-003 acknowledges this is a partial match, but the delivery record's Acceptance Criteria Verification ticks the criterion as met.
**Impact:** Readers cannot scan a release for "Removed" or "Deprecated" entries, which is the reason for grouping. The record overstates completion, and Orchestrate and Audit read that tick.
**Recommendation:** Either:
- (a) add a version step, for example a `version` script running `changeset version && tsx scripts/group-changelog.ts`, that regroups the newest release's lines under `### Added`, `### Changed`, `### Deprecated`, `### Removed`, `### Fixed`, with a test over a fixture changelog; or
- (b) have the user accept labels as meeting the criterion, and correct the record's AC10 line to say so explicitly.

TICKET-009 owns the release workflow and Changesets version pull requests, so (a) is a natural deferral there.
**Status:** Deferred → TICKET-009
**Resolution:** Per-category grouping of `CHANGELOG.md` belongs to the release ticket that owns the version step; Known Hazard appended to TICKET-009. The delivery record's AC10 tick is corrected in its Post-Review Amendments.

---

### CR-004: The runtime-dependency check reads only `dependencies`

**Severity:** Issue
**Location:** `scripts/check-dependencies.ts:31-42` (`checkDependencies`)
**Traces To:** TICKET-001 acceptance criterion 8; CPSE-NFR-007 ("zero runtime dependencies beyond its React peer dependency, or each is justified"); prd/CC-001
**Description:** `checkDependencies` iterates `pkg.dependencies` only. In a reviewer probe it returned no errors for:
- `{ optionalDependencies: { "left-pad": "^1" } }`
- `{ peerDependencies: { react: "^18 || ^19", d3: "^7" } }`
- `{ bundleDependencies: ["left-pad"] }`

Optional dependencies are installed by default and loaded at runtime. A non-React peer is a runtime dependency that NFR-007 does not exempt. Bundled dependencies ship inside the tarball.
**Impact:** A runtime dependency can be added without the justification NFR-007 requires, and without the license review that CONTRIBUTING.md attaches to that justification (prd/CC-001).
**Recommendation:** Check `dependencies`, `optionalDependencies`, `bundleDependencies`/`bundledDependencies`, and every `peerDependencies` key except `react` against the notes table. Add one test case per field to `tests/package/checks.test.ts`.
**Status:** Resolved
**Resolution:** `runtimeDependencies()` now collects `dependencies`, `optionalDependencies`, `bundleDependencies`/`bundledDependencies` and every peer except `react`; `checkDependencies` checks them all. One test per field added.

---

### CR-005: The public repository does not exist, so the CI matrix has never run and the metadata links point nowhere

**Severity:** Issue
**Location:** `.github/workflows/ci.yml`; `package.json:17-24`; `README.md:14-16`
**Traces To:** TICKET-001 acceptance criterion 7; CPSE-REQ-038; CPSE-REQ-040; prd/OC-004; dependency-map EXT-003; TICKET-001/DEL-002
**Description:** On 2026-10-05, `api.github.com/repos/gener8v/gener8v.tools.education.graph-generator` returns 404 while the `gener8v` organization returns 200. The ticket title promises a "public repository". The `repository`, `bugs` and `homepage` links therefore resolve to nothing, and the workflow has never executed. I narrowed the open risk to the Actions run itself:
- `actionlint` exits 0 on the workflow
- every step's command exits 0 locally on all four cells: Node.js 22.16.0/24.1.0 × React 18.3.1/19.3.0, with React 18 installed by the workflow's own `pnpm add --save-dev` swap

The delivery record honestly leaves AC7 unchecked.
**Impact:** CPSE-REQ-038 and CPSE-REQ-040 are partial. AC7 stays unverified. Until the repository exists, no downstream pull request gets CI feedback. TICKET-009 (release, trusted publishing) cannot start without the repository either.
**Recommendation:** Create the public repository, push `main` and `ticket/cpse-001`, and open a pull request. Record the run URL and per-cell results in the delivery record's `## Post-Review Amendments`, and tick AC7. If repository creation must wait, defer this finding to TICKET-009 (`Deferred → TICKET-009`) with a Known Hazard on that ticket.
**Status:** Deferred → TICKET-009
**Resolution:** The public repository is not created yet; the Product Owner did not ask for it to be created now. Known Hazard appended to TICKET-009: CI and AC7 are verified by the first pull request on the public repository, before any release.

---

### CR-006: Six covered requirements carry no `@spec` annotation

**Severity:** Issue
**Location:** `tests/package/checks.test.ts:9` and `tests/package/checks.test.ts:42` (proposed annotation sites); `.gener8v/specifications/component-packaging-and-source-export.md` (`## @spec Coverage`)
**Traces To:** CPSE-REQ-001, CPSE-REQ-002, CPSE-REQ-037, CPSE-REQ-038, CPSE-REQ-039, CPSE-REQ-040; CLAUDE.md "Traceability"; CONVENTIONS §2 (`@spec Coverage`)
**Description:** The delivery record leaves these six requirements unannotated because they live in files without comments (`package.json`, `LICENSE`, `CONTRIBUTING.md`). That is true of the files that implement them. But each requirement is proven by a `.ts` test that can carry an annotation. `gener8v-state.py lint` already warns on this delivery (`no @spec annotation found in source for CPSE-REQ-001`). The lint skips `.md` and `.json` files, so annotating `CONTRIBUTING.md` would not satisfy it.
**Impact:** `grep -rn "@spec"` and the state script's coverage lint cannot find half of this ticket's requirements in the code. A later edit to the tests or metadata loses its trace to the specification.
**Recommendation:**
- Add `// @spec CPSE-REQ-001, CPSE-REQ-002, CPSE-REQ-038, CPSE-REQ-040` above the `describe("package.json …")` block in `tests/package/checks.test.ts`.
- Add `// @spec CPSE-REQ-037, CPSE-REQ-039` above `describe("repository files …")`.
- Add matching rows to the specification's `## @spec Coverage` table.

If the user decides tests should not carry annotations, dismiss this finding with that rationale recorded.
**Status:** Resolved
**Resolution:** `@spec CPSE-REQ-001, CPSE-REQ-002, CPSE-REQ-038, CPSE-REQ-040` and `@spec CPSE-REQ-037, CPSE-REQ-039` added above the proving `describe` blocks; matching rows added to the specification's `## @spec Coverage`.

---

### CR-007: TypeScript is not pinned the way DEL-004 says

**Severity:** Observation
**Location:** `package.json:89`
**Traces To:** TICKET-001/DEL-004
**Description:** DEL-004 says "Pin `typescript@~6.0.3`", but the manifest declares `"typescript": "^6.0.3"`. The installed typescript-eslint 8.71.0 declares the peer range `typescript >=4.8.4 <6.1.0`. The lockfile currently resolves 6.0.3, so frozen-lockfile installs (CI) are unaffected.
**Impact:** A lockfile refresh (`pnpm update`, a dependency bot) can move TypeScript to 6.1+, outside typescript-eslint's supported range, and break `pnpm lint`. The record also misstates the manifest.
**Recommendation:** Change the specifier to `~6.0.3` and refresh the lockfile specifier, or correct DEL-004's wording.
**Status:** Resolved
**Resolution:** `typescript` specifier changed to `~6.0.3`; lockfile specifier refreshed.

---

### CR-008: Size budgets are measured with brotli, while CPSE-NFR-002 specifies minified and gzipped

**Severity:** Observation
**Location:** `.size-limit.json:1-6`
**Traces To:** CPSE-NFR-002 (carried by `graph-library/component-packaging-and-source-export/TICKET-004`, which reads this file as Prior Art); TICKET-001 Output (`.size-limit.json`)
**Description:** `@size-limit/preset-small-lib` defaults to brotli, and `pnpm size` reports "minified and brotlied". CPSE-NFR-002 and TICKET-004 state the budgets as "min+gzip". Brotli output is smaller than gzip, so the configured budgets are looser than the specification.
**Impact:** None today (every entry is 0 B). Once graph types land, a type could pass the brotli budget while exceeding 25 kB gzipped. The delivery record's Notes tell each type ticket to copy the current entry shape.
**Recommendation:** Add `"gzip": true` to each entry now, or defer to TICKET-004 with a Known Hazard.
**Status:** Resolved
**Resolution:** `"gzip": true` added to every `.size-limit.json` entry; `pnpm size` now reports minified and gzipped.

---

### CR-009: Downstream tickets expect TICKET-001 outputs that were not delivered, and the planned `bin` decision was not recorded

**Severity:** Observation
**Location:** `package.json:61-72` (`scripts`, no `generate`); `package.json` (no `bin`)
**Traces To:** AD-001 (`bin: graph-generator`); the delivery record's approved plan ("Decisions to record: … `bin` deferred to CPSE TICKET-006"); `graph-library/component-packaging-and-source-export/TICKET-006` Prior Art ("TICKET-001 output — `package.json` (`bin` field)"); `graph-library/graph-specification-and-vocabulary/TICKET-005` Prior Art ("TICKET-001 output — `package.json` (`exports`, `generate` script)")
**Description:** The ticket's acceptance criteria require neither `bin` nor a `generate` script, so the delivery is within contract. But two downstream tickets name them as TICKET-001 output, and the plan's own decision to defer `bin` never became a DEL. The CI freshness step (`.github/workflows/ci.yml:47-54`) calls `pnpm generate` as soon as `scripts/generate.ts` exists. It will fail if GSV TICKET-005 adds the file without the matching `package.json` script.
**Impact:** The pre-flight reconciliation for CPSE TICKET-006 and GSV TICKET-005 will find the expected fields missing, and nothing in the record explains why.
**Recommendation:** Record a DEL in the delivery record stating that `bin` (CPSE TICKET-006) and the `generate` script (GSV TICKET-005) are added by the tickets that implement them. Alternatively, append a Known Hazard to each of those two tickets.
**Status:** Resolved
**Resolution:** DEL-007 recorded in the delivery record's Post-Review Amendments: `bin` arrives with CPSE TICKET-006 and the `generate` script with GSV TICKET-005.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Approved | Boundary block now covers `src/{core,tool,export,layout}/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}` | `eslint.config.js`, `tests/package/boundaries.test.ts` |
| CR-002 | Approved | Network block covers every script extension under `src/` | `eslint.config.js`, `tests/package/boundaries.test.ts` |
| CR-003 | Deferred | Deferred → TICKET-009 | `.gener8v/changes/graph-library/tickets/component-packaging-and-source-export/TICKET-009.md` |
| CR-004 | Approved | `runtimeDependencies()` now collects `dependencies`, `optionalDependencies`, `bundleDependencies`/`bundledDependencies` and every peer except `react` | `scripts/check-dependencies.ts`, `tests/package/checks.test.ts` |
| CR-005 | Deferred | Deferred → TICKET-009 | `.gener8v/changes/graph-library/tickets/component-packaging-and-source-export/TICKET-009.md` |
| CR-006 | Approved | `@spec CPSE-REQ-001, CPSE-REQ-002, CPSE-REQ-038, CPSE-REQ-040` and `@spec CPSE-REQ-037, CPSE-REQ-039` added above the proving `describe` blocks | `tests/package/checks.test.ts`, `.gener8v/specifications/component-packaging-and-source-export.md` |
| CR-007 | Approved | `typescript` specifier changed to `~6.0.3` | `package.json`, `pnpm-lock.yaml` |
| CR-008 | Approved | `"gzip": true` added to every `.size-limit.json` entry | `.size-limit.json` |
| CR-009 | Approved | DEL-007 recorded in the delivery record's Post-Review Amendments: `bin` arrives with CPSE TICKET-006 and the `generate` script with GSV TICKET-005. | `.gener8v/changes/graph-library/delivery/component-packaging-and-source-export-ticket-001-delivery.md` |

## Verdict

**Result:** Approved with Notes
**Unresolved Findings:** 0 open. 7 resolved (CR-001, CR-002, CR-004, CR-006, CR-007, CR-008, CR-009); 2 deferred to TICKET-009 (CR-003 changelog grouping, CR-005 public repository and first CI run)
**Notes:** Resolved with the Product Owner on 2026-10-05. Fixes re-verified: lint, typecheck, 103 tests, build, publint, attw, size (gzip), check:deps and check:changesets all exit 0 (see the delivery record's Post-Review Amendments). Acceptance criterion 7 (CI matrix) stays Unverified and criterion 10 (changelog grouping) Partial until TICKET-009; both carry Known Hazards there.
