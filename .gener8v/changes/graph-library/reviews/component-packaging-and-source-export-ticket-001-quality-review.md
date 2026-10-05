# TICKET-001: Set up the package foundation and public repository — Quality Review

## Summary

Reviewed the package foundation delivered for graph-library/component-packaging-and-source-export/TICKET-001 (branch `ticket/cpse-001`, delivery commit `e4cc7e9`). The `quality-reviewer` agent ran the findings phase in a fresh context. The foundation is small, well organised and well commented. All 39 tests and every verify and CI command pass when re-run. The weak points are in the guards that every later ticket depends on. The React/browser boundary lint rule only matches `.ts` files. The no-network ban in the non-rendering directories depends on a duplicated list that no test covers. The declared TypeScript range contradicts the pin the delivery record describes. The dependency check reads only `dependencies`. The size budgets are measured with a different compression than the one their numbers come from. 12 findings in total: 0 Critical, 5 Concerns, 7 Suggestions. The verdict below is provisional until resolution with the user.

**Files Reviewed:**
- `package.json`
- `pnpm-lock.yaml` (inspected for resolved versions of `typescript`, `typescript-eslint`, `@types/node` only)
- `tsconfig.json`
- `tsup.config.ts`
- `eslint.config.js`
- `vitest.config.ts`
- `tests/setup/build.ts`
- `.size-limit.json`
- `scripts/check-dependencies.ts`
- `scripts/check-changesets.ts`
- `.changeset/changelog.cjs`
- `.changeset/changelog.d.cts`
- `.changeset/config.json`
- `.changeset/README.md`
- `.github/workflows/ci.yml`
- `src/index.ts`
- `src/core/index.ts`
- `src/tool/index.ts`
- `src/export/index.ts`
- `src/generated/schema.json`
- `src/generated/vocabulary.json`
- `tests/package/boundaries.test.ts`
- `tests/package/node-entry.test.ts`
- `tests/package/checks.test.ts`
- `LICENSE`
- `README.md`
- `CONTRIBUTING.md`
- `.gitignore`

**Findings:** 12
**Critical:** 0 | **Concerns:** 5 | **Suggestions:** 7

## Quality Assessment

### Code Organization

**Rating:** Strong
**Notes:** Responsibilities are clearly separated. Configuration lives in one small file per tool. Both check scripts export pure functions (`justifiedDependencies`, `checkDependencies`, `changesetSummary`, `checkChangesetSummary`) behind a guarded CLI entry (`process.argv[1] === fileURLToPath(import.meta.url)`), so the tests exercise the logic without spawning a process. Package-level tests sit together under `tests/package/`, and the build-once global setup is isolated in `tests/setup/build.ts`. The entry barrels are empty but state their future contents and the boundary they must respect. The one structural weakness is that the entry-point list is kept by hand in four places (QR-006).

### Readability

**Rating:** Strong
**Notes:** Names are descriptive, functions are short, and the comments explain *why*. Examples: the `tsup.config.ts:15` note on the TypeScript 6 `baseUrl` deprecation, the cell-layout comment in `scripts/check-dependencies.ts:16`, and the ESLint messages that cite the requirement each rule enforces. Test names describe behaviour (for example "fails a runtime dependency with no justification"). One documentation drift: `CONTRIBUTING.md:44-49` lists the enforced rules but not the stricter `EventSource`/`navigator` bans from DEL-006. A contributor who hits those rules will not find them documented. This is too small to raise as a finding.

### Error Handling

**Rating:** Adequate
**Notes:** These are CI scripts and configuration, so the bar is clear failure, not recovery. Both scripts write one actionable message per failure to stderr (with the offending file or dependency name and the governing requirement) and exit 1. Missing or malformed `package.json`/`CONTRIBUTING.md` surface as uncaught exceptions with a stack trace, which is acceptable for a CI script. `justifiedDependencies` returns an empty map when the "Runtime dependency notes" heading is missing. With zero dependencies, a renamed heading goes unnoticed until the first dependency is added. The resulting message names the expected heading, so it is still diagnosable. The real gaps are in the scope of what the checks cover (QR-001, QR-002, QR-004), not in how they report.

### Test Coverage

**Rating:** Adequate
**Notes:** I re-ran the verify commands from `.gener8v/context.md`'s `## Repositories` table and the extra CI checks, on Node.js v24.1.0 and pnpm 10.28.2:
- `pnpm lint`: exit 0, no findings.
- `pnpm typecheck`: exit 0.
- `pnpm test`: exit 0, 3 files and 39 tests passed. Global setup ran `tsup`, which printed four expected "Generated an empty chunk" warnings for the empty barrels.
- `pnpm build`: exit 0. Emitted `dist/{index,core/index,tool/index,export/index}.{js,d.ts}`, `dist/schema.json` and `dist/vocabulary.json`.
- `pnpm publint`: exit 0, "All good!".
- `pnpm attw`: exit 0, every entry 🟢 for node16-ESM and bundler.
- `pnpm size`: exit 0, all four entries 0 B, labelled "minified and brotlied".
- `pnpm check:deps`: exit 0, "Runtime dependencies: 0, all justified."
- `pnpm check:changesets`: exit 0, "Changesets checked: 0."

After the runs, `git status` showed no change to any tracked source file.

Every testable acceptance criterion has a test, except the CI matrix, which cannot run until the GitHub repository exists (recorded as Unverified in the delivery record). The tests assert behaviour, not implementation details:
- `boundaries.test.ts` drives the real ESLint config through the API.
- `node-entry.test.ts` runs plain `node` with a resolve hook, and includes a second test proving the hook fires.
- `checks.test.ts` covers both pass and fail paths of each check script.

Gaps found by probing the real ESLint config with in-memory fixtures (no files written):
- A React import in `src/core/x.tsx` or `src/core/x.mts`, and `document` in `src/export/x.tsx`, produce no lint error, because the fixtures only use `.ts` (QR-001).
- `fetch` in `src/core` is caught only because of a duplicated list that no test exercises (QR-002).
- `node:https`/`node:net` imports in the Node-targeted entries are not caught (noted under QR-002).

`node-entry.test.ts` also leaks two temporary directories per run: 8 `graph-generator-node-*` directories were in the OS temp dir after four runs (QR-007).

### Observability & Operability

**Rating:** Adequate
**Notes:** The library has no runtime code yet, and CPSE-REQ-005 forbids telemetry, so operability here means visible CI failures. Visibility is good:
- Every CI step has a descriptive name.
- The check scripts print what failed and why.
- The build in `tests/setup/build.ts` inherits stdio, so a broken build is visible in the test log.
- `execFileSync` failures in `node-entry.test.ts` carry the child's stderr (for example "React was loaded: react").
- The generate-freshness step echoes why it is a no-op.

Two small weaknesses. The four `tsup` "empty chunk" warnings are expected noise that will go away as the barrels are filled. The freshness step's diff misses untracked generated files (QR-008).

## Findings

### QR-001: Boundary lint rules only match `.ts` files, so `.tsx`, `.mts` and `.js` files in non-rendering code escape them

**Category:** Patterns
**Severity:** Concern
**Location:** `eslint.config.js:38` (boundary block `files`), `eslint.config.js:19` (network block `files`), `tests/package/boundaries.test.ts:14`, `tests/package/boundaries.test.ts:19`, `tests/package/boundaries.test.ts:24` (fixtures are `.ts` only)
**Description:** The React/browser boundary block matches `src/{core,tool,export,layout}/**/*.ts` only. Probing the real config through the ESLint API shows that `import { useState } from "react"` in `src/core/x.tsx` and `src/core/x.mts`, and `document.title` in `src/export/x.tsx`, all lint clean. The network block matches `src/**/*.{ts,tsx}`, so `fetch(...)` in `src/core/x.js`, `src/core/x.mts` or `src/react/x.mjs` also lints clean. The two blocks also use different glob shapes. All boundary fixtures in `boundaries.test.ts` use `.ts`, so the suite cannot reveal the gap.
**Impact:** This rule is the only automated enforcement of AD-001 and prd/TC-005 for every downstream ticket (the delivery record's Notes direct non-rendering code to these directories "where the linter enforces the React/browser boundary"). A contributor who adds a `.tsx` helper under `src/export` or `src/layout`, or a `.mts` module under `src/core`, can import React or reference `document` with no lint error. The failure would surface only at runtime in a consumer's Node.js process, or not at all if the path is untested.
**Recommendation:** Match every source extension in both blocks, for example `files: ["src/{core,tool,export,layout}/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"]` and `files: ["src/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"]`, and use one shared glob constant for the extension list. In `boundaries.test.ts`, add at least one `.tsx` fixture per non-rendering directory (for example parametrise the existing loop over `["ts", "tsx"]`), so a narrowed glob fails the suite.
**Status:** Open
**Resolution:** —

---

### QR-002: The network-globals list is duplicated in the boundary block, the duplicate is load-bearing, and no test covers it

**Category:** DRY
**Severity:** Concern
**Location:** `eslint.config.js:21-27` and `eslint.config.js:50-59`, `tests/package/boundaries.test.ts:40-54`
**Description:** In flat config, a later block that configures the same rule for a file replaces the earlier block's options rather than merging them. The boundary block therefore repeats `fetch`, `XMLHttpRequest`, `WebSocket` and `EventSource` alongside `window`/`document`/`navigator`. That repetition is the only reason `fetch` is banned in `src/core`, `src/tool`, `src/export` and `src/layout`. I demonstrated this by loading `eslint.config.js` with the boundary block reduced to `window`/`document`/`navigator`: `fetch("https://e.com")` in `src/core/x.ts` then produced no errors. Nothing in the file explains why the list appears twice. The "no network access anywhere in src" tests lint only `src/react/fixture.tsx` (`boundaries.test.ts:50`), so none of them would fail. Separately, the Node-targeted entries can still open connections through `node:https`, `node:http` or `node:net` imports, and `new globalThis.WebSocket(...)` or `new window.XMLHttpRequest()` lint clean. The guard is narrower than its describe block claims.
**Impact:** The duplicate looks like redundant copy-paste, so a well-meaning cleanup, or adding a new network API to only the first list, silently removes or narrows the no-network guarantee (CPSE-REQ-005, prd/CC-003) for exactly the entry points that run in Node.js. CI would stay green.
**Recommendation:** Extract `const NETWORK_GLOBALS = [{ name: "fetch", message: NETWORK_MESSAGE }, ...]`, spread it into both blocks, and add a one-line comment that flat config replaces rule options, so the boundary block must restate them. Parametrise the network test cases over `src/react/fixture.tsx` and each non-rendering directory. Optionally, add `node:http`, `node:https`, `node:net`, `node:dgram`, `node:tls`, `node:http2` and their bare forms to the boundary block's `no-restricted-imports`, and `globalThis.WebSocket`/`globalThis.XMLHttpRequest`/`window.XMLHttpRequest` to `no-restricted-properties`.
**Status:** Open
**Resolution:** —

---

### QR-003: Declared TypeScript range `^6.0.3` contradicts the DEL-004 pin and typescript-eslint's peer range

**Category:** Maintainability
**Severity:** Concern
**Location:** `package.json:89`
**Description:** TICKET-001/DEL-004 records the decision "Pin `typescript@~6.0.3`" because typescript-eslint requires a TypeScript below 6.1. The installed `typescript-eslint` 8.71.0 declares the peer `typescript: >=4.8.4 <6.1.0`. `package.json` declares `"typescript": "^6.0.3"`, which admits every 6.x release. Only the lockfile (resolved to 6.0.3) currently holds the version in place.
**Impact:** Any lockfile refresh, `pnpm update`, or dependency-bot bump can move TypeScript to 6.1+. That puts it outside typescript-eslint's supported range (a peer warning, not an install failure, under pnpm's defaults), and the `ignoreDeprecations: "6.0"` workaround in `tsup.config.ts:16` was only validated against 6.0. The breakage would show up as lint or declaration-build failures in an unrelated ticket. The delivery record tells readers the version is pinned, so nobody would look here first.
**Recommendation:** Change to `"typescript": "~6.0.3"` to match DEL-004. Optionally, add a comment next to `ignoreDeprecations` in `tsup.config.ts` naming the typescript-eslint peer constraint as the reason for the pin.
**Status:** Open
**Resolution:** —

---

### QR-004: The runtime dependency check reads only `dependencies`

**Category:** Maintainability
**Severity:** Concern
**Location:** `scripts/check-dependencies.ts:31-42`
**Description:** `checkDependencies` takes `{ dependencies?: Record<string, string> }` and inspects only that field. A package added under `optionalDependencies` (installed at runtime by default), `bundleDependencies`/`bundledDependencies` (shipped inside the tarball), or a second `peerDependencies` entry (a runtime requirement pushed onto every consumer) passes `pnpm check:deps` with "Runtime dependencies: 0, all justified." `tests/package/checks.test.ts:61-82` tests only the `dependencies` field.
**Impact:** CPSE-NFR-007 exists to stop unjustified runtime weight from reaching consumers, and this script is its only verification method. The check can be bypassed, accidentally, by any of three common `package.json` fields, and no test would notice.
**Recommendation:** Collect names from `dependencies`, `optionalDependencies`, `bundleDependencies`/`bundledDependencies`, and `peerDependencies` minus `react`, then require a justification row for each. Make the success message count all of them, and add one failing-input test per field to the "runtime dependency check" describe block.
**Status:** Open
**Resolution:** —

---

### QR-005: Size budgets are measured with brotli while their numbers come from a gzip budget

**Category:** Maintainability
**Severity:** Concern
**Location:** `.size-limit.json:2-5`
**Description:** The 120 kB and 25 kB limits are CPSE-NFR-002's budgets, which that requirement states as "minified and gzipped". `.size-limit.json` sets no compression option, so size-limit 14 uses its default, brotli. `pnpm size` confirms this, labelling each result "with all dependencies, minified and brotlied". size-limit supports `"gzip": true` per entry. (Whether this breaches the requirement is for Code Review to decide. The quality issue is that the gate measures a different quantity than the number it carries, and nothing in the file says so.)
**Impact:** Brotli output is typically 15–20% smaller than gzip for JavaScript, so the gate is looser than its numbers suggest. A graph-type entry at about 28 kB gzipped can pass a 25 kB brotli check. The gap appears only when the graph-type tickets fill the entries, and nobody will look for it because CI is green.
**Recommendation:** Add `"gzip": true` to each entry in `.size-limit.json`. If brotli is the intended measure, record that decision and rename the budgets accordingly.
**Status:** Open
**Resolution:** —

---

### QR-006: The entry-point list is maintained by hand in four places with no consistency check

**Category:** DRY
**Severity:** Suggestion
**Location:** `package.json:33-53`, `tsup.config.ts:8-13`, `.size-limit.json:2-5`, `tests/package/checks.test.ts:24`, `tests/package/checks.test.ts:27`, `tests/package/checks.test.ts:33`, `tests/package/node-entry.test.ts:23`
**Description:** The same set of entry points is listed in the `exports` map, the tsup `entry` object, the size-limit config, and three separate literal arrays in the tests. The delivery record's Notes tell each graph-type ticket to add its entry to `tsup.config.ts`, `exports` and `.size-limit.json` by hand. publint catches a missing tsup entry, because the export target is then missing. Nothing catches an export with no size-limit entry, or a test list that was not extended.
**Impact:** With about a dozen graph-type tickets each editing three lists, an omitted size-limit entry is likely, and it silently removes that type's budget (CPSE-NFR-002), because size-limit only measures what it is told to.
**Recommendation:** Add one test to `checks.test.ts` that derives code entries from `pkg.exports` (keys whose value has `types`). It should assert that each has a matching `dist/...js` path in `.size-limit.json` and a matching key in the tsup config (importing `tsup.config.ts`, or exporting the entry map from it). Reuse the derived list in the declaration-existence test instead of the literal arrays.
**Status:** Open
**Resolution:** —

---

### QR-007: `node-entry.test.ts` duplicates its setup, leaks temp directories and builds file URLs by string concatenation

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/package/node-entry.test.ts:31-35`, `tests/package/node-entry.test.ts:47-51`
**Description:** Both tests repeat the same five lines (create a temp dir, write `hooks.mjs`, write `register.mjs`). Neither removes the directory: 8 `graph-generator-node-*` directories were in the OS temp dir after four test runs. The hook URL is built with `new URL(\`file://${hooks}\`)`, which does not percent-encode the path and is wrong on Windows (`file://C:\...`) and for paths containing `#`, `%` or spaces.
**Impact:** Minor, but the temp directories accumulate on every developer machine and CI runner, and the duplication means a change to the hook setup must be made twice. The URL construction only works because macOS and Linux temp paths happen to need no encoding.
**Recommendation:** Move the setup into a `beforeAll` (or a small `writeHooks()` helper) that returns the register path, remove the directory in `afterAll` with `rmSync(dir, { recursive: true, force: true })`, and use `pathToFileURL(hooks).href` from `node:url`.
**Status:** Open
**Resolution:** —

---

### QR-008: The generate-freshness step ignores untracked generated files

**Category:** Maintainability
**Severity:** Suggestion
**Location:** `.github/workflows/ci.yml:47-54`
**Description:** The step runs `pnpm generate` and then `git diff --exit-code -- src/generated`. `git diff` compares tracked files only, so a generated file that `scripts/generate.ts` creates but that was never committed (for example a new `src/generated/types.ts`) does not fail the step.
**Impact:** The step is dormant until graph-library/graph-specification-and-vocabulary/TICKET-005. Once that ticket lands, a generator that gains an output file can pass CI while the committed tree lacks that file. This is the kind of drift the step exists to catch.
**Recommendation:** Replace the diff with a check that also sees untracked files, for example `test -z "$(git status --porcelain -- src/generated)" || { git status --porcelain -- src/generated; exit 1; }`.
**Status:** Open
**Resolution:** —

---

### QR-009: `@types/node` 26 type-checks code that must run on Node.js 22

**Category:** Maintainability
**Severity:** Suggestion
**Location:** `package.json:78` (with `package.json:27-29` and `tsconfig.json:17`)
**Description:** `engines.node` is `>=22` and the CI matrix includes Node.js 22, but `@types/node` is `^26.6.4` (26.6.4 installed). `pnpm typecheck` therefore accepts Node.js APIs added in 23–26 in `src/core`, `src/tool` and `src/export`, which must work on Node.js 22 (prd/TC-006). `tsconfig.json` also applies `types: ["node"]` to all of `src/`, including the future browser renderer.
**Impact:** Use of a newer API is caught only at runtime on the Node.js 22 CI cell, and only if a test exercises that path. Consumers on Node.js 22 hit it in production otherwise.
**Recommendation:** Set `@types/node` to `^22` (the lowest supported major) so the type checker reflects the support floor. Consider a separate tsconfig (or `types` override) for the React renderer when it lands.
**Status:** Open
**Resolution:** —

---

### QR-010: The changelog category list is defined in three places

**Category:** DRY
**Severity:** Suggestion
**Location:** `scripts/check-changesets.ts:5`, `.changeset/changelog.cjs:5`, `tests/package/checks.test.ts:87`
**Description:** `CATEGORIES` in the check script, the `CATEGORY` regex in the formatter, and the literal array in the test each list `Added`, `Changed`, `Deprecated`, `Removed` and `Fixed` independently. The two regexes also differ: the checker requires whitespace after the colon (`:\s+\S`), while the formatter accepts none (`:\s*`).
**Impact:** Adding a category (for example `Security:`) to the checker but not the formatter produces changelog lines without the bold label, with no test failure. The reverse lets the formatter format a category the checker rejects.
**Recommendation:** Make `.changeset/changelog.cjs` the single source: export `CATEGORIES` from it, build its regex from that list, and import it in `scripts/check-changesets.ts` and the test. The test already imports the `.cjs` with types from `.changeset/changelog.d.cts`, so this pattern is established.
**Status:** Open
**Resolution:** —

---

### QR-011: CI installs a floating pnpm with no store cache, and builds twice per cell

**Category:** Performance
**Severity:** Suggestion
**Location:** `.github/workflows/ci.yml:27-35`, `.github/workflows/ci.yml:56-60`, `package.json` (no `packageManager` field)
**Description:** pnpm is installed with `npm install --global pnpm@10`, and `package.json` has no `packageManager` field. Contributors and the four matrix cells may therefore run different pnpm 10.x minors. `actions/setup-node` is not given `cache: pnpm`, so every cell does a cold install of the full toolchain (eslint, typescript, tsup, vitest, size-limit, attw, changesets). `pnpm test` builds in its global setup and the next step runs `pnpm build` again.
**Impact:** Each pull request pays for slower runs (four cold installs) and pnpm version drift. The double build costs little today and more as the library grows.
**Recommendation:** Add `"packageManager": "pnpm@10.28.2"` to `package.json`. Install pnpm with `pnpm/action-setup` before `actions/setup-node`, and pass `cache: pnpm` to setup-node. Optionally, drop the separate Build step, or make the test global setup skip the build when an environment flag says `dist/` is fresh.
**Status:** Open
**Resolution:** —

---

### QR-012: `eslint.config.js` uses the deprecated `tseslint.config()` helper

**Category:** Patterns
**Severity:** Suggestion
**Location:** `eslint.config.js:10`
**Description:** In the installed typescript-eslint 8.71.0, `tseslint.config()` is marked `@deprecated` (`node_modules/typescript-eslint/dist/config-helper.d.ts:67`) in favour of ESLint core's `defineConfig()` from `eslint/config`.
**Impact:** Low today. It still works. But this is the file every downstream ticket extends, and a deprecated helper is likely to be removed in a future typescript-eslint major, turning a routine upgrade into a config rewrite.
**Recommendation:** Replace it with `import { defineConfig } from "eslint/config"` and `export default defineConfig(...)`. The configuration objects carry over unchanged.
**Status:** Open
**Resolution:** —

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|

## Verdict

**Result:** Approved with Notes
**Unresolved Findings:** 12 — 5 Concerns, 7 Suggestions
