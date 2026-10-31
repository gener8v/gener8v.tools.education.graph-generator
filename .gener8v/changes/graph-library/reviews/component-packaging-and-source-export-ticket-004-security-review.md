# TICKET-004: Add cross-environment rendering, install and bundle-size checks — Security Review

## Summary

This review covers the delivery of `graph-library/component-packaging-and-source-export/TICKET-004` at commit `165dd5b` on branch `ticket/graph-library-cpse-004`. The `security-reviewer` agent ran the findings phase in a fresh context on 2026-10-30.

What the delivery adds:
- **Two CI jobs:** `e2e` (Playwright, Chromium and WebKit, React 19 and 18) and `smoke` (pack, install into fresh React 18 and 19 projects, render, on Node 22 and 24).
- **One dev dependency:** `@playwright/test` 1.64.1, exact-pinned, with its lockfile entries.
- **A Playwright harness:** pages built with `page.setContent` and one injected esbuild bundle.
- **A smoke runner:** runs `npm install` of the packed tarball and React from the registry.
- **Two shipped-code changes with no security effect:** the circle definition becomes a pure factory, and the cube `normalsOf` side test gets a tolerance.

Overall posture:
- **Nothing shipped gains attack surface.** `files` is `["dist"]`; `pnpm check:dist` passes on the built output; `pnpm audit --prod` is clean.
- **The CI jobs keep the hardening from TICKET-001:** a workflow-wide `contents: read`, `pull_request` (not `pull_request_target`), actions pinned by SHA, `persist-credentials: false`, timeouts, and no `${{ github.event.* }}` in any `run:`.
- **The harness has no injection path.** Data crosses as `page.evaluate` arguments, and the only HTML put into a page is React-escaped server markup (probed below).

Three findings, all about supply-chain provenance in CI. None is exploitable today: the jobs hold a read-only token and no secrets. Each matters before the release workflow (TICKET-009, `id-token: write`) runs "the full check suite".
- **SEC-001 (Low):** the smoke install resolves React's transitive dependencies from the registry on every run, with no lockfile, and then executes them.
- **SEC-002 (Low):** the `minimatch` advisory GHSA-g3hv-75wg-m249 through `eslint`. Playwright also bundles an affected `minimatch` 10.2.5 that `pnpm audit` cannot see. The vulnerable code path is not reached.
- **SEC-003 (Informational):** browser builds and system packages are fetched by `playwright install --with-deps` with transport security only.

**Reviewer:** `security-reviewer` agent, fresh context (findings phase only, 2026-10-30)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/component-packaging-and-source-export-ticket-004-delivery.md` (DEL-001..004, no Post-Review Amendments yet)

**Files Reviewed:**
- `.github/workflows/ci.yml` (the `e2e` and `smoke` jobs; the `check` job read unchanged)
- `package.json`, `pnpm-lock.yaml` (the `@playwright/test`, `playwright` and `playwright-core` 1.64.1 entries)
- `playwright.config.ts`
- `tests/e2e/bundle.ts`
- `tests/e2e/page-entry.ts`
- `tests/e2e/page-api.ts`
- `tests/e2e/hydration.spec.ts`
- `tests/e2e/cross-engine.spec.ts`
- `tests/fixtures/descriptions.ts`
- `tests/smoke/run.ts`
- `tests/smoke/render.mjs`
- `tests/smoke/react18/package.json`
- `tests/smoke/react19/package.json`
- `src/layout/cube.ts` (`normalsOf`, `SIDE_TOLERANCE`), `tests/layout/cube.test.ts`
- `src/core/definitions/circle.ts` (`defineCircle`)
- `.size-limit.json`, `tests/package/entries.test.ts`, `tests/package/per-type-bundle.test.ts`, `.gitignore`, `.changeset/cube-labels-same-in-every-engine.md`

**Context read:**
- `.gener8v/changes/graph-library/tickets/component-packaging-and-source-export/TICKET-004.md`
- `.gener8v/changes/graph-library/tickets/component-packaging-and-source-export/TICKET-009.md` (the release workflow)
- `.gener8v/constraints/prd.md` (CC-001..CC-004)
- `.gener8v/technical-design/system-design.md` (AD-007, AD-016, TR-002)
- `.gener8v/context.md`
- `.github/dependabot.yml`
- `.gener8v/changes/graph-library/reviews/component-packaging-and-source-export-ticket-001-security-review.md` (SEC-003, SEC-004 and SEC-006 set the CI pattern these jobs copy)

**Verification run by the reviewer (2026-10-30; logs in the session scratchpad `sr4/`):**

| Command | Exit | Result |
|---------|------|--------|
| `pnpm audit` (pnpm 10.28.2, 2026-10-31 01:32 UTC) | 1 | 1 moderate: GHSA-g3hv-75wg-m249, `minimatch` 10.2.6 <11.0.1, path `.>eslint>minimatch` (SEC-002) |
| `pnpm audit --prod` | 0 | No known vulnerabilities found |
| `npm install --package-lock-only --ignore-scripts` + `npm audit` on scratch copies of `tests/smoke/react18/package.json` and `tests/smoke/react19/package.json` | 0 / 0 | 0 vulnerabilities each. React 18 resolves `react` 18.3.1, `react-dom` 18.3.1, `scheduler` 0.23.2, `loose-envify` 1.4.0, `js-tokens` 4.0.0; React 19 resolves `react` 19.3.0, `react-dom` 19.3.0, `scheduler` 0.28.0 |
| `pnpm test:e2e` | 0 | 36 passed (Chromium and WebKit) |
| `GRAPH_GENERATOR_PREBUILT=1 pnpm test:smoke` | 0 | React 18.3.1 and 19.3.0: 15 of 15 examples rendered; temporary directory removed; no `.tgz` left in the repository |
| `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache --maxWorkers=4 tests/layout/cube.test.ts tests/package/entries.test.ts` | 0 | 29 passed |
| `pnpm check:dist` | 0 | 30 built files, no network APIs or modules; `dist/` holds the `1e-6` tolerance, so it is built from this commit's `src/layout/cube.ts` |
| `tsx` probe: `renderToString(<Graph>)` of a circle whose `radiusLabelText` is `</title><script>alert(1)</script><img src=x onerror=alert(2)>"x` | 0 | `<svg` markup, no raw `<script` or `<img`, every `<` emitted as `&lt;` |

## Security Assessment

### Input Validation

**Status:** Adequate
**Notes:**
- **The e2e page harness has no injection path.**
  - Descriptions and Node's markup reach the page only as `page.evaluate` arguments (`tests/e2e/hydration.spec.ts:31`, `tests/e2e/cross-engine.spec.ts:38`): strings structured-cloned into the page and `JSON.parse`d there (`tests/e2e/page-entry.ts:40`, `:50-51`). No description is interpolated into script source.
  - The only HTML written into a live page is `page.setContent(...)` with the body `<div id="root">${serverMarkup}</div>` (`tests/e2e/bundle.ts:62`, `tests/e2e/hydration.spec.ts:28`). `serverMarkup` is React's `renderToString` output. React escapes text and attribute values, and the package's closed attribute set governs which attributes exist (graph-library CPSE TICKET-002 SEC-002, resolved). The probe above shows a `<script>` and an `<img onerror>` in caller text both leave as `&lt;…`.
  - Node's markup is re-parsed in the page through `template.innerHTML` (`tests/e2e/page-entry.ts:64`). Template contents are inert: no script runs and no resource loads.
  - `addScriptTag({ content })` injects only the esbuild bundle of repository source (`tests/e2e/bundle.ts:17-31`, `:63`). Nothing is fetched remotely and no web server or port is opened (DEL-001).
- **Data sources are repository-controlled.** These are `examples/*.json` (globbed by `readdirSync`, files only, `tests/e2e/bundle.ts:43-50`, `tests/smoke/render.mjs:57-60`) and the seeded generator (`tests/fixtures/descriptions.ts`), which runs every sample through `validate()`. The generator deliberately includes hostile text (`nameArb`), so the cross-engine check also exercises escaping in both browser engines.
- **The smoke runner builds no shell commands.** `execFileSync` takes argument arrays (`tests/smoke/run.ts:21`). The arguments are fixed strings plus paths under a `mkdtempSync` directory, and the directory is removed in `finally` (`:52-54`).
  - `render.mjs` builds its dynamic `import()` specifiers from the packed tarball's own `exports` map (`tests/smoke/render.mjs:27-31`, `:46`). That map is the package's own manifest.
- **The CI jobs take no attacker-controlled expression input.**
  - They interpolate only `matrix.*` values (`.github/workflows/ci.yml:105`, `:145`, `:164`); no `github.event.*`, `github.head_ref` or PR title or body reaches a `run:`.
  - Failure messages printed to the log include `JSON.stringify(description)` (`tests/e2e/cross-engine.spec.ts:46`), but the descriptions are repository data. A pull request that could plant workflow commands there could also run arbitrary code in the job anyway.
- **The cube fix (`src/layout/cube.ts:118`, `:121-127`) has no security effect.**
  - `SIDE_TOLERANCE` changes which of two unit normals a label tries first.
  - The cube is drawn at the fixed `DRAWN_EDGE` whatever its edge length (GSS-REQ-031), so an absolute 1e-6 tolerance works at one known scale.
  - A degenerate edge would give `NaN` exactly as before (`NaN < -1e-6` and `NaN < 0` are both false), and the twelve edges are fixed corners, never caller input.
- **The circle factory (`src/core/definitions/circle.ts`) changes construction only.** The definition, its checks and its text are unchanged, and `defineCircle` is a hoisted function declaration, so the module-level call is safe.

### Authentication & Authorization

**Status:** Not Applicable
**Notes:**
- The package has no authentication or authorization.
- **CI token scope:** `permissions: contents: read` at workflow level (`.github/workflows/ci.yml:8-9`) applies to both new jobs, and neither overrides it.
- **Untrusted PRs:** the trigger is `pull_request`, so fork PRs get a read-only token and no secrets.
- **No persisted token:** every checkout sets `persist-credentials: false` (`:114-115`, `:154-155`), so no token is written to `.git/config` for the PR-controlled steps that follow.

### Data Protection

**Status:** Adequate
**Notes:**
- **No secrets in the new files.** A scan of every file the commit touches found no credentials, tokens or keys; the only hits are `@csstools/css-tokenizer` package names in `pnpm-lock.yaml`.
- **No CI artifacts.** Neither job uploads one. `playwright.config.ts` sets no trace, video or screenshot, and `test-results/` and `playwright-report/` are git-ignored.
- **No credentials reach the smoke install.** `pnpm test:smoke` hands the inner `npm install` pnpm's `npm_config_*` environment. That is what the `npm warn Unknown env config` lines in the smoke output are. A key-names-only probe found `registry`, two scoped registry URLs, `frozen_lockfile`, `globalconfig`, `node_gyp`, `user_agent` and `verify_deps_before_run`: no auth token. The inner npm uses the same registry as pnpm, which is the intended behaviour.
- **CC-003 (no data collection or transmission):** the shipped code gains no network access (`pnpm check:dist`, exit 0). The browser pages load nothing remote.

### Configuration Security

**Status:** Gaps Found
**Notes:**
- **Actions:** both new jobs reuse the SHA-pinned `actions/checkout` (v7.0.1) and `actions/setup-node` (v7.0.0) from TICKET-001 SEC-004, and Dependabot covers `github-actions`.
- **pnpm:** installed at exact `pnpm@10.28.2` (TICKET-001 SEC-003).
- **Dependency install:** `pnpm install --frozen-lockfile` in both jobs, and pnpm 10 blocks lifecycle scripts except `onlyBuiltDependencies: ["esbuild"]`. Playwright has no install script; browsers are installed by an explicit step.
- **`@playwright/test`:**
  - Exact `1.64.1` and dev-only, with sha512 integrity entries for `@playwright/test`, `playwright` and `playwright-core` in `pnpm-lock.yaml`.
  - Licensed Apache-2.0 and not shipped (`files: ["dist"]`), so CC-001 is unaffected.
  - The exact pin also fixes the browser revisions (`playwright-core/browsers.json`).
- **The React 18 e2e cell:** it repeats the `check` job's exact-version `pnpm add` (`.github/workflows/ci.yml:129-131`), the pattern TICKET-001 SEC-003 resolved to exact versions. Nothing new.
- **`cache: pnpm`:** the cache holds pnpm's content-addressed store, keyed by the lockfile hash; packages taken from it are still checked against the lockfile's integrity on install. GitHub scopes a pull request's cache saves to its own ref, so a PR cannot write a cache that `main` restores.
- **Chromium sandbox:** Playwright launches Chromium on Linux with its sandbox off by default. The pages load only repository content, so this needs no action.
- **Gaps:**
  - **SEC-001:** the smoke projects' transitive dependencies are unpinned.
  - **SEC-002:** the dev-only `minimatch` advisory.
  - **SEC-003:** browser and system-package provenance rests on transport security alone.
- **Dependency audit:** `pnpm audit` with pnpm 10.28.2 on 2026-10-31 01:32 UTC (2026-10-30 21:32 local): 1 moderate (SEC-002), exit 1. `pnpm audit --prod`: none, exit 0. `npm audit` on each smoke project's resolved tree: 0. The `minimatch` advisory was published 2026-10-30 23:09 UTC, after the delivery's own clean audit earlier that day, as the delivery record says.
- **Compliance cross-reference (`.gener8v/constraints/prd.md`):**
  - **CC-001 (licences):** no runtime dependency, asset or exported code added.
  - **CC-002 (WCAG):** not touched; the cube change moves label sides only, and the cube suite's overlap checks pass.
  - **CC-003 (no data flow):** `pnpm check:dist` is clean.
  - **CC-004 (images):** not touched.
  - No CC violation.

## Findings

### SEC-001: The smoke install resolves React's transitive dependencies from the registry on every run, with no lockfile or integrity pin, and then executes them

**Severity:** Low
**Category:** Dependency
**OWASP Reference:** A03:2025 Software Supply Chain Failures
**Location:**
- `tests/smoke/run.ts:41`: `npm install --no-audit --no-fund --ignore-scripts --package-lock=false <tarball>`
- `tests/smoke/react18/package.json:6-9` and `tests/smoke/react19/package.json:6-9`: only `react` and `react-dom` are pinned
- `.github/workflows/ci.yml:144-175`: the `smoke` job
- `.github/dependabot.yml:6-8`: the npm ecosystem watches `/` only

**Description:**
- **Direct packages are pinned; their dependencies are not.** `react` and `react-dom` are exact (18.3.1, 19.3.0), but their dependencies are ranges that npm resolves afresh on every run:
  - `react-dom@18.3.1` → `scheduler ^0.23.2`, `loose-envify ^1.1.0` → `js-tokens ^3 || ^4`
  - `react-dom@19.3.0` → `scheduler ^0.28.0`
- **Integrity is the registry's word only.** With `--package-lock=false` there is no committed lockfile, so no hash in the repository says what those resolve to. npm checks each tarball against the integrity the registry itself advertises, nothing more.
- **The resolved code runs.** `render.mjs` imports `react-dom/server`, which loads `scheduler`. That happens in the CI job's Node process.
- **What already limits it:**
  - `--ignore-scripts` stops install-time execution, so the exposure is run time only.
  - The tarball itself declares no `dependencies`, so it pulls nothing further.
- **Why it matters later:** this is the pattern TICKET-001 SEC-003 resolved for the `check` job (exact versions), carried one level down where exact versions alone do not reach. TICKET-009's release workflow is to "build, run the full check suite and publish with `--provenance`" on a version tag; if that suite includes `pnpm test:smoke` in the job holding `id-token: write`, the unpinned resolution runs beside the OIDC token.
- **Pins go stale unwatched.** Dependabot watches `/` only, so the two smoke templates' exact pins never get update or security PRs.

**Attack Scenario:**
- **Attacker:** someone who compromises the publishing credentials of `scheduler` (or `loose-envify`/`js-tokens`), or who publishes into a registry mirror a CI runner is configured to use.
- **Steps:**
  1. Publish `scheduler@0.28.1` (or `0.23.3`) with a payload in its CommonJS entry.
  2. The next `smoke` run resolves `^0.28.0` to it.
  3. `render.mjs` loads `react-dom/server`, which `require`s `scheduler`, and the payload runs.
- **Achieved today:** code execution in an ephemeral runner holding a read-only `GITHUB_TOKEN` (not persisted to disk) and no secrets, so a forced-green or forced-red smoke check, or compute abuse.
- **Achieved if TICKET-009 runs the smoke check in its publish job:** the payload can request the OIDC token or alter `dist/` before `npm publish --provenance`. That yields a malicious release with valid provenance.

**Impact:** CI integrity now; the integrity of published, provenance-attested releases once the release workflow runs this check alongside `id-token: write`.

**Recommendation:**
1. **Commit a lockfile per template, and install React from it.** Add `tests/smoke/react18/package-lock.json` and `tests/smoke/react19/package-lock.json`, generated with `npm install --package-lock-only --ignore-scripts`. In `run.ts`:
   1. Run `npm ci --ignore-scripts` (integrity-checked against the committed lock).
   2. Then run `npm install --no-save --ignore-scripts --package-lock=false <tarball>`. The tarball has no dependencies, so it adds nothing unpinned.

   This still installs the way a consumer does.
2. **A weaker alternative:** pin the transitive versions with npm `overrides` in each template, for example `"overrides": { "scheduler": "0.28.0" }`. This pins versions but not integrity hashes.
3. **Keep the pins current:** add `/tests/smoke/react18` and `/tests/smoke/react19` as npm `directories` in `.github/dependabot.yml`.
4. **Protect the release job:** at resolution, append a Known Hazard to `.gener8v/changes/graph-library/tickets/component-packaging-and-source-export/TICKET-009.md`: run the smoke and e2e checks in a job without `id-token: write`, and let the publish job depend on them (`needs:`) without re-running them.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed (approved by Engineer — Thomas Eaves, 2026-10-31). `tests/smoke/react18/package-lock.json` and `react19/package-lock.json` pin React and its dependencies (scheduler 0.23.2, loose-envify 1.4.0, js-tokens 4.0.0; scheduler 0.28.0) with integrity hashes from registry.npmjs.org; `tests/smoke/run.ts` installs them with `npm ci --ignore-scripts`, then the dependency-free tarball with `npm install --no-save --package-lock=false --ignore-scripts`. `.github/dependabot.yml` watches both template directories. Known Hazard appended to graph-library/component-packaging-and-source-export/TICKET-009: smoke and e2e checks run outside any job with `id-token: write` or secrets, and the publish job depends on them.

---

### SEC-002: Dev-only `minimatch` advisory GHSA-g3hv-75wg-m249 through `eslint`, and an affected copy bundled inside Playwright that `pnpm audit` cannot see; the vulnerable path is not reached

**Severity:** Low
**Category:** Dependency
**OWASP Reference:** A03:2025 Software Supply Chain Failures
**Location:**
- `pnpm-lock.yaml`: `minimatch@10.2.6`, through `eslint@10.12.0`, `@eslint/config-array@0.23.5` and `@typescript-eslint/typescript-estree@8.71.0`
- Bundled in `@playwright/test` 1.64.1's tree, outside the lockfile's view:
  - `playwright-core/lib/utilsBundle.js` (`minimatch@10.2.5`, per `utilsBundle.js.LICENSE:54`)
  - `playwright/lib/transform/esmLoader.js` (its own copy of the same code)

**Description:**
- **The advisory:** GHSA-g3hv-75wg-m249 (moderate, CWE-405, published 2026-10-30 23:09 UTC) is a CPU and memory amplification in `minimatch` <11.0.1. Through an attacker-supplied pattern, `firstPhasePreProcess()` clones `globParts` entries inside a fixpoint loop, and `secondPhasePreProcess()` then compares them pairwise. There is no fix in the 10.x line: the latest is 11.0.3, and the latest `eslint` (10.14.0) and `typescript-eslint` (8.72.1) still require `minimatch ^10`.
- **The audit cannot see Playwright's copy.** This delivery adds `@playwright/test`, and Playwright bundles `minimatch` 10.2.5 into its own files rather than depending on it. `pnpm audit` therefore reports only the `eslint` path. The delivery's "Playwright not on the path" is true of the lockfile, not of the code Playwright runs.
- **The vulnerable path is not reached.** Both preprocess phases run only when `optimizationLevel >= 2` (`minimatch/dist/esm/index.js:332-337`). The default is 1, and no consumer in the tree sets it:
  - `@eslint/config-array` passes `{ dot: true }`.
  - A search of `eslint`, `@typescript-eslint/typescript-estree`, `playwright` and `playwright-core` finds `optimizationLevel` only inside the `minimatch` copies themselves.
- **The patterns are not attacker-supplied.** They come from repository-authored configuration: `eslint.config.js` globs, and Playwright's `testDir` and `testMatch`. Anyone who could change them could change the configuration's code just as easily.

**Attack Scenario:**
- **Attacker:** a contributor who opens a pull request.
- **Steps:** add a crafted `**/../`-heavy glob to `eslint.config.js` or `playwright.config.ts`.
- **Achieved:** nothing beyond what the PR already has. The default `optimizationLevel` never enters the amplifying code. Even if it did, the same PR can put an infinite loop in the config file, and the 15- and 20-minute job timeouts bound either.

**Impact:** None in current usage. The concern is only theoretical, for a future tool that passes caller-supplied globs with `optimizationLevel: 2`.

**Recommendation:**
1. **Do not force the fix.** Do not override `minimatch` to `^11` while `eslint` and `typescript-eslint` declare `^10`, because a major version under them risks a broken lint.
2. **Track the update.** Take the fixed version through Dependabot when `eslint`, `typescript-eslint` and Playwright move. Re-run `pnpm audit` then, and check Playwright's bundled licence file (`utilsBundle.js.LICENSE`) as well.
3. **Or accept it explicitly.** If the user prefers, record it as a dev-only accepted risk with the reachability evidence above.
4. **Fix the record.** Correct the delivery's note: Playwright bundles an affected copy, and it is equally unreachable.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Risk accepted (dev only). The vulnerable preprocessing runs only at `optimizationLevel >= 2`, which no consumer in the tree sets, and every pattern is repository-authored configuration; no 10.x fix exists, and forcing `minimatch` ^11 under `eslint` risks a broken lint. The fix is taken through Dependabot when `eslint`, `typescript-eslint` and Playwright move; `pnpm audit` reports it until then (`pnpm audit --prod` is clean). The delivery record's note is corrected: Playwright bundles an affected, equally unreachable copy.
**Risk accepted by:** Security — Thomas Eaves, 2026-10-31

---

### SEC-003: `playwright install --with-deps` fetches browser builds and system packages with transport security only, in the job that runs the e2e checks

**Severity:** Informational
**Category:** Dependency
**OWASP Reference:** A08:2025 Software or Data Integrity Failures
**Location:** `.github/workflows/ci.yml:133-134` (`pnpm exec playwright install --with-deps chromium webkit`)

**Description:**
- **Browser builds are verified by HTTPS only.** Chromium and WebKit are downloaded from `cdn.playwright.dev`. In `playwright-core` 1.64.1, the download path (`browserFetcher`: `downloadBrowserWithProgressBar` → `oopBrowserDownload`) compares no checksum. The only `sha256` uses in `lib/coreBundle.js` are WebAuthn and MCP helpers. The archive is trusted on TLS alone.
  - The exact `@playwright/test` pin fixes which browser revisions are requested.
- **System packages are unpinned.** `--with-deps` runs `sudo apt-get install` of the browsers' system libraries at whatever versions Ubuntu's signed repositories hold that day.
  - On an ephemeral GitHub-hosted runner, where PR code already has passwordless `sudo`, this adds no privilege.
- **Nothing is cached:** each run fetches the browsers afresh.

**Attack Scenario:** N/A (Informational)

**Impact:** A compromised Playwright CDN or download host could serve altered browser builds that falsify e2e results. Without secrets in the job, that is the whole of it. It would matter only if these steps ran in a job holding `id-token: write` or secrets.

**Recommendation:**
1. **Keep browsers out of the publish job.** Keep `playwright install` and the e2e checks out of any job with `id-token: write` or secrets; see the TICKET-009 hazard proposed under SEC-001.
2. **Optionally, use the official image.** Run the `e2e` job in the official Playwright container image pinned by digest, for example `container: mcr.microsoft.com/playwright:v1.64.1-noble@sha256:<digest>`. Browsers and system libraries then come from one immutable, digest-verified artifact, and the `apt-get` step goes away. Dependabot's `docker` ecosystem can watch the digest.
3. **Otherwise, record the choice:** if the current approach stays, note in the delivery record that browser provenance rests on TLS to `cdn.playwright.dev`.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Recorded (approved by Engineer — Thomas Eaves, 2026-10-31): browser builds are trusted on TLS to `cdn.playwright.dev` and the `--with-deps` system packages are Ubuntu's of the day; recorded in the delivery record. The TICKET-009 Known Hazard (SEC-001) keeps `playwright install` and the browser checks out of any publishing job.

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Fixed | smoke lockfiles + `npm ci`; Dependabot; TICKET-009 hazard | No | `tests/smoke/run.ts`, `tests/smoke/react18/package-lock.json`, `tests/smoke/react19/package-lock.json`, `.github/dependabot.yml`, `…/tickets/component-packaging-and-source-export/TICKET-009.md` |
| SEC-002 | Accepted | dev-only, unreachable; tracked via Dependabot | Yes | — |
| SEC-003 | Recorded | provenance noted; TICKET-009 hazard | No | delivery record |

## Verdict

**Result:** Approved with Notes
**Unresolved Critical/High:** 0
**Accepted Risks:** 1 (SEC-002, dev-only `minimatch` advisory, unreachable)
**Notes:** Resolved with the Engineer on 2026-10-31: SEC-001 fixed (pinned smoke installs, Dependabot, TICKET-009 hazard); SEC-002 accepted by the Security role; SEC-003 recorded and covered by the TICKET-009 hazard.
