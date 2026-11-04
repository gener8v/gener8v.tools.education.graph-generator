# TICKET-009: Set up the release pipeline with provenance and the versioning policy — Security Review

## Summary

I reviewed the release pipeline for graph-library/component-packaging-and-source-export/TICKET-009 at delivery commit `8b839d6` (`git diff ae080b0 8b839d6`). It covers the GitHub Actions release workflow, the Changesets version step, the changelog tooling and the versioning and release documentation.

The workflow gets several things right:
- read-only permissions at the top level;
- `id-token: write` on the publish job only;
- no npm token anywhere;
- every action pinned to a commit SHA, and each SHA matches its tag comment;
- no `${{ }}` interpolation in any `run:` block, so there is no script injection;
- the smoke and browser checks moved out of the job that holds `id-token`.

Two Medium gaps decide whether a release can be trusted:
- Anyone who can push to the repository, or a stolen token that can, can publish a release with valid provenance. The publish identity is not tied to a protected environment, a protected tag or `main` (SEC-001).
- The publish job and the version job restore a pnpm store cache. Jobs that run the smoke and browser code can write that cache, so the separation required by CPSE TICKET-004 SEC-001 and SEC-003 can be bypassed through it (SEC-002).

The other findings:
- Four Low findings: a manual run on a tag publishes for real; the build that is published is never scanned for network APIs; the post-publish check runs inside the `id-token` job and checks only that an attestation exists; and the first publish and token publishing are not covered.
- Three Informational findings: the version job (SEC-007), the version job's input names (SEC-008), and tool installation and the repository's action policy (SEC-009).
- SEC-008 is not a vulnerability. The version job cannot work as written: `changesets/action` v2.1.2 refuses the v1 input names `version`, `commit` and `title`. It is recorded here because neither the code review nor the quality review raised it.

Findings: 9 in total — 0 Critical, 0 High, 2 Medium, 4 Low, 3 Informational.

**Files Reviewed:**
- `.github/workflows/release.yml`
- `package.json` (the `version` script; `publishConfig`; no runtime `dependencies`)
- `scripts/changelog-categories.json`
- `scripts/changelog-categories.ts`
- `scripts/check-changesets.ts`
- `scripts/group-changelog.ts`
- `.changeset/changelog.cjs`
- `.changeset/README.md`
- `docs/versioning.md`
- `CONTRIBUTING.md` ("Releasing")
- `tests/package/release-config.test.ts`
- `tests/package/group-changelog.test.ts`
- Context read, not changed by this ticket: `.github/workflows/ci.yml`, `.github/workflows/docs.yml`, `.github/dependabot.yml`, `.changeset/config.json`, `scripts/check-dist.ts`, `scripts/check-dependencies.ts`, `scripts/check-image-licenses.ts`, `tests/package/checks.test.ts`

**Findings:** 9
**Critical:** 0 | **High:** 0 | **Medium:** 2 | **Low:** 4 | **Informational:** 3

## Security Assessment

### Input Validation

**Status:** Adequate
**Notes:**
- **Workflow expressions.** The only `${{ }}` expressions in `.github/workflows/release.yml` are:
  - `github.ref` in the concurrency group (line 25);
  - `secrets.GITHUB_TOKEN` (line 65).

  Neither reaches a shell. The tag check reads `$GITHUB_REF_NAME` as an environment variable inside a quoted `[ ... ]` test (lines 171–175), not as an interpolated expression. `inputs.dry_run` is used only in an `if:` condition (line 216). No pull-request title, branch name or other event text reaches a `run:` block. `pull_request_target` and `workflow_run` are absent.
- **Changeset files are handled as data.**
  - `@changesets/parse` 1.0.0 parses the front matter with `yaml.parse` (yaml 2.x, core schema, no custom tags).
  - `.changeset/changelog.cjs` only slices and indents the summary.
  - `scripts/group-changelog.ts` uses only regular expressions.

  I probed them with `TSX_DISABLE_CACHE=1 npx tsx -e`, using `<img onerror>`, `javascript:` links, `$(…)`, backticks, `${…}`, CRLF line endings, and a forged `## 9.9.9` heading in a continuation line. In every case the text came through as inert markdown. The forged heading stays indented, so it is not a release boundary. The only reachable effect is that a summary without a category stops the version step (SEC-007).
- **Rendering.** `CHANGELOG.md` is not rendered by the documentation site: Storybook's `stories` globs are `docs/**/*.mdx` and `docs/stories/*.stories.tsx`. A changeset therefore cannot inject into the site's MDX.

### Authentication & Authorization

**Status:** Gaps Found
**Notes:**
- **Workflow permissions** are scoped well:
  - the top level is `contents: read`;
  - `version-pr` has `contents: write` and `pull-requests: write`;
  - `checks` inherits read-only access;
  - `publish` has `contents: read` and `id-token: write`;
  - `dry-run` inherits read-only access.

  Repository setting (read 2026-11-04): `default_workflow_permissions: read`.
- **Who can publish is not bounded.** The npm credential is the OIDC token of any run of `release.yml`.
  - The publish job declares no `environment:`, so an environment cannot be required by the npm trusted publisher.
  - The repository has no rulesets, so anyone with push access can create or move `v*` tags.
  - `main` is not protected.
  - The tag check compares the tag with `package.json`, not with `main`'s history.

  Collaborators on 2026-11-04: two admins (`gener8v-thomas`, `gener8v-grayson`) and two with read access. See SEC-001.
- **A manual run on a tag publishes** (SEC-003).
- **Token publishing is still possible.** Nothing in the workflow or the documented steps switches the npm package to "disallow tokens", so a maintainer's npm token can still publish by hand (SEC-006).

### Data Protection

**Status:** Adequate
**Notes:**
- **No secret in any file.** No secret is stored or printed. `secrets.GITHUB_TOKEN` is the only secret referenced. Every checkout sets `persist-credentials: false`.
- **The version job's token.** `changesets/action` v2.1.2 pushes with command-scoped `GIT_CONFIG_*` headers, not `~/.netrc`. It also hands `GITHUB_TOKEN`, which has write access, to the version script's environment by design (`src/run.ts`: `env = { ...process.env, GITHUB_TOKEN: github.getToken() }`). See SEC-007.
- **The attestation step** prints only the public `dist.attestations` object.

### Configuration Security

**Status:** Gaps Found
**Notes:**
- **Pinning and timeouts.**
  - Actions pinned by SHA; I resolved each through the GitHub API on 2026-11-04:
    - `actions/checkout` `3d3c42e5…` = v7.0.1
    - `actions/setup-node` `82076278…` = v7.0.0
    - `changesets/action` `ae32849d…` = the commit of annotated tag v2.1.2
  - `timeout-minutes` set on every job.
  - `cancel-in-progress: false`, so release runs are never cut off part-way.
- **The cache that the jobs share** (SEC-002).
- **The checks the release skips.** The build that is published is not scanned by `pnpm check:dist` (SEC-004).
- **Tool installation and action policy.** pnpm and npm are installed by version with no integrity pin. The repository allows all actions and does not require SHA pinning (SEC-009, Informational).
- **Publishing gate.** `vars.NPM_PUBLISH_ENABLED` protects against an accidental publish only. A workflow changed on a branch does not have to read it (SEC-001).

### Dependency Check

- **Tool:** `pnpm audit` and `pnpm audit --prod` (pnpm 10.28.2), run 2026-11-04 18:28 UTC in `/Users/thomas/Repositories/gener8v/gg-cpse-009`.
- **`pnpm audit`:** 2 moderate, the same two already on record:
  - GHSA-3g3m-2fjr-6pw4 (`glob` >=9.0.0 <=14.0.1);
  - GHSA-g3hv-75wg-m249 (`minimatch` >=7.0.0 <11.0.1).

  Both are on the path `.>@storybook/react-vite>@joshwooding/vite-plugin-react-docgen-typescript>glob`. They are dev-only and were accepted in CPSE TICKET-004 SEC-002 and TICKET-008 SEC-003. This ticket does not change `pnpm-lock.yaml`.
- **`pnpm audit --prod`:** "No known vulnerabilities found".
- **Tools the workflow installs:**
  - `npm@11.21.1` exists on the registry (dist-tag `next-11`; `latest` is 12.2.1). Integrity: `sha512-YTzL6QBEJXyHcTu0JiUc7RKMp+mzlJtl7rGLmERaXUQeFHIMc9atdr6G9M9C8vDWbv40epoTQAzNL2/PtZVDhQ==`.
  - `pnpm@10.28.2` exists and declares no dependencies.
- **Linter:** `actionlint .github/workflows/release.yml` exit 0. actionlint does not check the inputs of `changesets/action`, so it missed SEC-008.
- **Tests:** `npx vitest run --no-cache --maxWorkers=4 tests/package/release-config.test.ts tests/package/group-changelog.test.ts` passed: 2 files, 18 tests.

### Cryptography

Not applicable. npm provenance (Sigstore) is the only cryptography involved, and npm and the registry do it. SEC-005 covers how its result is checked.

### Logging & Monitoring

- Failures are reported by job status; no sensitive data is logged.
- No separate notice is sent when a release is published (for example a GitHub release, or a notification to maintainers when the `publish` job runs). That would help detect the SEC-001 scenario. It is noted under SEC-001's recommendation.

### Compliance Cross-Reference

| Constraint | Status | Notes |
|------------|--------|-------|
| prd/CC-001 (licenses) | Met for this ticket | The release `checks` job runs `pnpm test`. That includes `tests/images/license-check.test.ts` ("passes on the published set") and the runtime-dependency check on the real `package.json` (`tests/package/checks.test.ts`). |
| prd/CC-003 (no data collected or sent) | Enforcement gap, not a violation | `pnpm lint` (the network-API lint rules) runs on the source. `pnpm check:dist`, the scan of built output, runs in neither `checks` nor `publish`. The build that is published is never scanned (SEC-004). I found no network access; the code itself does not violate CC-003, so this is not raised to Critical. |
| prd/CC-002, prd/CC-004 | Not affected | This ticket changes no rendering and no image. |
| prd/IC-003 | Met in design | Trusted publishing by OIDC, `--provenance`, npm ≥ 11.5.1. Live setup is pending: package, trusted publisher, public repository. |
| prd/OC-002 (published only by CI from tagged commits) | Partly enforced | The workflow publishes only on a tag, or on a manual run on a tag (SEC-003). Nothing ties the tag to `main` (SEC-001). The planned hand publish of the first version and the still-enabled token publishing go against OC-002 (SEC-006). |
| prd/OC-003 (deprecate, never unpublish) | Met | `docs/versioning.md:77-84`. |

## Findings

### SEC-001: The publish identity is any run of `release.yml` on any `v*` tag: no protected environment, no tag rules, and no requirement that the commit is on `main`

**Severity:** Medium
**Category:** Authorization
**OWASP Reference:** A01:2025 Broken Access Control (also A03:2025 Software Supply Chain Failures)
**Location:**
- `.github/workflows/release.yml:10-12` (trigger `tags: ["v*"]`)
- `.github/workflows/release.yml:137-145` (the `publish` job: no `environment:`)
- `.github/workflows/release.yml:169-175` (the tag check)
- `docs/versioning.md:57-58`

**Description:**
- **How npm decides.** Under npm trusted publishing, the registry accepts the OIDC token of any run whose repository, owner and workflow file name match the trusted-publisher entry. If an environment is set there, it must match too. The workflow file used is the one at the pushed ref.
- **The publish job declares no `environment:`.** So:
  - the npm trusted publisher cannot be restricted to an environment;
  - no GitHub deployment protection applies: no required reviewer, no deployment tag rule.
- **The repository has no rules.** On 2026-11-04 there were no rulesets (`GET /repos/…/rulesets` returned `[]`) and `main` was not protected. Anyone with push access can create, move or delete a `v*` tag on any commit, including a commit on an unreviewed branch.
- **The tag check is too narrow.** It proves only that the tag text equals `package.json`'s version at that commit (lines 171-175). It does not check that the commit is on `main`, or that CI passed on it.
- **The gate does not stop an attacker.** `vars.NPM_PUBLISH_ENABLED` is read by the workflow at the tag. A changed workflow on another branch does not have to read it.
- **Effect.** A single credential with push access is enough to publish. The resulting release carries valid provenance: "built by CI from this repository" is true, but it is not reviewed code.
- **Order of steps.** Line 167 (`pnpm install --frozen-lockfile`) runs before the tag check, so dependency code runs before the cheapest gate.

**Attack Scenario:**
- **Attacker:** someone who has a GitHub credential with push access to the repository. For example, a token stolen from a maintainer's machine by a malicious npm package, as the 2025 "Shai-Hulud" worm did with GitHub tokens. Or any future collaborator with write access.
- **Steps:**
  1. Push a branch whose `release.yml` keeps the file name but drops `needs: checks` and the variable gate. Its `publish` job builds a modified `src/`.
  2. Push the tag `v0.4.1` on that commit. With no tag rules, this needs only push access.
  3. GitHub runs the branch's `release.yml`. The job requests an OIDC token. npm matches repository and workflow file name, issues a short-lived publish credential, and accepts `npm publish --provenance`.
- **Achieved:** `@gener8v/graph-generator@0.4.1` carries a payload, is installed by K-12 education software, and has a valid provenance attestation pointing at this repository. The provenance makes it look more trustworthy, not less. No second maintainer is involved at any point.
- **Assumed controls, not seen in the workspace:**
  - 2FA on the maintainers' GitHub accounts;
  - npm trusted-publisher fields beyond repository and workflow.

  Neither stops a stolen token that can push.

**Impact:** A malicious release with valid provenance, published from one credential with push access. prd/OC-002's "from tagged commits" is met only in the letter.

**Recommendation:**
1. **Use a protected environment.** Add an environment to the `publish` job, for example:
   ```yaml
   environment:
     name: npm
     url: https://www.npmjs.com/package/@gener8v/graph-generator
   ```
   Create the environment with:
   - a required reviewer (the other admin), with "prevent self-review" set;
   - a deployment tag rule that allows `v*` only.

   Then set **Environment name: `npm`** in the npm trusted-publisher entry. From then on, an OIDC token from any other job or branch cannot publish.
2. **Protect the tags.** Add a tag ruleset on `refs/tags/v*` that limits creation to maintainers and blocks update and deletion, so a tag cannot be moved after it is checked.
3. **Require the tag to be on `main`.** In `publish` (and in `checks`), before installing dependencies, fail unless the tagged commit is on `main`. Use `fetch-depth: 0`, or fetch `main`, then:
   ```sh
   git merge-base --is-ancestor "$GITHUB_SHA" origin/main
   ```
4. **Reorder the checks.** Move the tag-and-version check before `pnpm install`.
5. **Protect `main`** as already planned (CPSE TICKET-001 SEC-006): required CI checks, no force pushes.
6. **Make releases visible.** Optionally, make every publish leave a visible record, for example a GitHub release or a notice to the maintainers.
7. **Update the documentation.** `docs/versioning.md` step 3 should say the tag goes on the merged version commit on `main`.

Overlaps code review CR-006 and quality review QR-001; this finding adds the attack path and the npm environment binding.

**Compliance Impact:** None for CC-XXX. It weakens prd/OC-002.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-11-04): `publish` runs in the `npm` environment; `checks` and `publish` fail unless the tagged commit is on `main` (`git merge-base --is-ancestor`), before anything is installed; no `run:` interpolates `${{ }}`. The Engineer steps (`docs/versioning.md`, CONTRIBUTING "Releasing") create the environment with a required reviewer and a `v*` tag rule, name it in npm's trusted publisher, add a tag ruleset on `refs/tags/v*`, and protect `main`. Tests.

---

### SEC-002: `publish` (`id-token: write`) and `version-pr` (`contents: write`) restore a pnpm store cache that the jobs running smoke, e2e and browser-install code can write

**Severity:** Medium
**Category:** Dependency
**OWASP Reference:** A08:2025 Software or Data Integrity Failures (also A03:2025 Software Supply Chain Failures)
**Location:**
- `.github/workflows/release.yml:154-157` (`publish`: `cache: pnpm`)
- `.github/workflows/release.yml:49-52` (`version-pr`: `cache: pnpm`)
- `.github/workflows/release.yml:83-86`, `:115-124` (`checks`: `cache: pnpm`, then the smoke check, `playwright install` and the e2e checks)
- `.github/workflows/ci.yml:111-134`, `:144-175` (the `e2e` and `smoke` jobs on push to `main`, also `cache: pnpm`)

**Description:**
- **What the hazard required.** CPSE TICKET-004 SEC-001 and SEC-003, carried as a Known Hazard on this ticket, required that the smoke check (registry code), `playwright install` (browser builds trusted on TLS only) and the e2e checks never run where `id-token: write` is held. The workflow does this as far as jobs go.
- **Jobs still share the Actions cache.** Every job calls `actions/setup-node` with `cache: pnpm`. That restores and saves the pnpm store under the key `node-cache-Linux-x64-pnpm-<hash of pnpm-lock.yaml>`, which is predictable because the lockfile is public.
- **Where a run looks for a cache.** It searches its own ref first, then the default branch.
  - On a tag, `checks` and `publish` run on the same ref, `refs/tags/v…`.
  - Code running in `checks` can write an entry under that exact key in the tag scope. It can then be restored by `publish`, which runs next. Known techniques read the runner's cache token from the runner process; GitHub-hosted runners grant passwordless `sudo`.
  - On `main`, the smoke and e2e jobs in `ci.yml` also save to the default-branch scope on a cache miss, which happens on the first push after any lockfile change. `publish` and `version-pr` fall back to that scope.
- **pnpm's integrity check does not help.** pnpm's store check compares each file with the store's own index, and whoever writes the cache can write the index too. `pnpm install --frozen-lockfile` therefore links poisoned files into `node_modules`.
- **Where the poisoned files run.**
  - In `publish`, `pnpm build` (tsup, esbuild) runs in the job that holds `id-token: write`.
  - In `version-pr`, `pnpm run version` runs with a write-scoped `GITHUB_TOKEN` (SEC-007), and `main` is not protected.
- **Existing tests cannot see this.** The release-config tests check that the publish job's text does not contain `smoke|e2e|playwright`. They cannot see a cache.

**Attack Scenario:**
- **Attacker:** someone who gets code to run in `checks` or in a `ci.yml` job on `main`. This is the threat the carried hazard names. Examples:
  - a malicious `scheduler` or `react-dom` that reaches the smoke lockfiles through a routine Dependabot update;
  - a tampered browser build from `cdn.playwright.dev`;
  - a malicious dev tool that runs only in the test steps.
- **Steps:**
  1. The payload runs during `pnpm test:smoke` or `pnpm test:e2e` in `checks` on tag `v0.4.0`.
  2. It reads the cache service token, computes the key from `pnpm-lock.yaml`, and saves a store under that key in the tag's scope in which `tsup`'s files carry a payload.
  3. `publish` starts, restores the poisoned store and runs `pnpm build`. The payload either alters `dist/` before `npm publish --provenance`, or requests the job's OIDC token and publishes a second version.
- **Achieved:** a malicious release with valid provenance. That is exactly the outcome the job separation was meant to prevent.
- **Same route on `main`:** a write-scoped token in `version-pr` can push to the unprotected `main`.

**Impact:** The isolation the ticket's Known Hazard requires can be bypassed. The publish job's build tools come from a store that lower-trust jobs can write.

**Recommendation:**
1. **Publish from an uncached store.** In `publish`, remove `cache: pnpm`. pnpm is the package manager here, so setup-node's automatic caching (npm only) stays off; add `package-manager-cache: false` to make that explicit. The publish job then downloads every package against `pnpm-lock.yaml`'s integrity hashes, at the cost of about a minute.
2. **Do the same in `version-pr`.** It holds a write token.
3. **Add a test.** Extend `tests/package/release-config.test.ts` to assert that neither job contains `cache:`.
4. **If caching is kept elsewhere.** Keep it only in jobs whose output nothing trusted consumes. Do not pass build artifacts from `checks` to `publish`: `checks` is the lower-trust job.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed: `publish` and `version-pr` use no cache (`cache: false` through the shared setup action; `package-manager-cache: false`); a test asserts no credential-holding job uses one. Mutant (`cache: pnpm` in publish) → the test fails.

---

### SEC-003: A manual run of the workflow on a tag publishes for real, though the workflow and the documentation say a manual run never publishes

**Severity:** Low
**Category:** Misconfiguration
**OWASP Reference:** A06:2025 Insecure Design
**Location:**
- `.github/workflows/release.yml:13-18` (the `workflow_dispatch` trigger)
- `.github/workflows/release.yml:140` (the `publish` job's `if:`)
- `.github/workflows/release.yml:7`, `:16` (the claim)
- `docs/versioning.md:66-67` (the claim)

**Description:**
- **The `if:` does not check the event.** The publish job runs when `startsWith(github.ref, 'refs/tags/v') && vars.NPM_PUBLISH_ENABLED == 'true'`. A `workflow_dispatch` run can be started on a tag (the "Use workflow from" selector, or `gh workflow run release.yml --ref v0.3.0`). Then `github.ref` is `refs/tags/v0.3.0`: `checks` runs, then `publish` runs and publishes. This happens whatever `dry_run` is set to; the default `true` also starts `dry-run` alongside.
- **The claim is false.** The workflow comment (line 7), the input's description (line 16) and `docs/versioning.md` all say a manual run never publishes. The test "runs a dry run on manual dispatch that does not publish" checks only the `dry-run` job.

**Attack Scenario:** A maintainer's tag-push run for `v0.3.0` fails on a flaky check. They want to "dry-run" it first and start the workflow on the `v0.3.0` tag with `dry_run: true`, trusting the input's description. The run publishes `0.3.0` for real. This is an unintended release, not an attack: an attacker would need the same push access as in SEC-001.

**Impact:** An unplanned publish, which cannot be undone because of prd/OC-003. The documented safety claim is wrong.

**Recommendation:**
1. Change the publish condition to `if: github.event_name == 'push' && startsWith(github.ref, 'refs/tags/v') && vars.NPM_PUBLISH_ENABLED == 'true'`.
2. Add a test assertion for it.
3. A deliberate re-publish of a failed tag can use a separate, explicitly named path behind the SEC-001 environment.

**Compliance Impact:** None (touches prd/OC-002 and prd/OC-003)
**Status:** Resolved
**Resolution:** Fixed: `publish` runs only on a pushed `v*` tag (`github.event_name == 'push'`) with `NPM_PUBLISH_ENABLED`; a manual run never publishes. Mutant → the test fails.

---

### SEC-004: The build that is published is never scanned for network access (`pnpm check:dist`, prd/CC-003), and the release checks run on a different build

**Severity:** Low
**Category:** Misconfiguration
**OWASP Reference:** A08:2025 Software or Data Integrity Failures
**Location:**
- `.github/workflows/release.yml:107-133` (`checks`: no `pnpm check:dist`)
- `.github/workflows/release.yml:177-181` (`publish`: build, then publish with no check)
- compare `.github/workflows/ci.yml:79-80`

**Description:**
- **What `check:dist` does.** `scripts/check-dist.ts` scans `dist/` for network APIs and Node.js network modules. That is the built-output half of the prd/CC-003 guard; the lint rules cover the source.
- **Neither release job runs it.**
  - `ci.yml` runs it on pull requests and `main`.
  - Neither release job does, and no vitest test scans the real `dist/`: `tests/package/checks.test.ts:154-170` tests `scanSource` on fixed strings.
  - `checks` also skips `pnpm check:changesets` and `pnpm bench` (code review CR-004).
- **The published files are built and published unchecked.** `publish` rebuilds `dist/` and publishes it at once. The publint, attw and size checks ran on the separate build in `checks`. Since the tag need not be on `main` and `main` has no required checks (SEC-001), the files that reach the registry may never have passed the CC-003 scan.

**Attack Scenario:** N/A (Low; the code itself does not violate CC-003)

**Impact:** A release that references a network API slips through if lint misses it, for example in code tsup bundles from a dev dependency. The release workflow is the last gate before an artifact that cannot be undone (prd/OC-003).

**Recommendation:**
1. Add `pnpm check:dist` to `checks`.
2. Also add it to `publish`, right after `pnpm build`, so the files that are published are the files that were scanned. It runs only repository code (`tsx scripts/check-dist.ts`), so it keeps `publish` free of smoke and browser code. Optionally add `pnpm publint` there too.

**Compliance Impact:** prd/CC-003 (an enforcement gap, not a violation)
**Status:** Resolved
**Resolution:** Fixed: `publish` runs `pnpm check:dist` and `pnpm publint` on the build it publishes; `checks` runs everything `ci.yml` runs (a test compares them).

---

### SEC-005: The provenance check runs a registry install inside the `id-token` job, and checks only that an attestation exists, not whose it is

**Severity:** Low
**Category:** Dependency
**OWASP Reference:** A08:2025 Software or Data Integrity Failures
**Location:** `.github/workflows/release.yml:184-210`

**Description:**
- **The install runs where the OIDC token is available.** After publishing, the same job runs `npm install --omit=peer "$name@$version"` in a temporary project. That install has lifecycle scripts enabled and no lockfile, and the job's OIDC request variables stay available until it ends.
  - Today only the package itself is installed: it has no runtime `dependencies`, and its `package.json` has no install scripts. So nothing third-party runs.
  - If a runtime dependency is ever added (CPSE-NFR-007 allows one if it is justified), that dependency's latest in-range version and its install scripts would run beside `id-token: write`. That would be enough to publish another version.
- **The check accepts any attestation.** `dist.attestations` being non-null shows that some attestation exists. It does not show that the attestation names this repository, `release.yml`, this tag or `$GITHUB_SHA`.
- **The `npm audit signatures` check depends on having no dependencies.**
  - `grep -q "verified attestation"` passes if any installed package has one.
  - `npm audit signatures` does not fail when an attestation is missing.

  So this check is sound only while the package is the only thing installed.

**Attack Scenario:** N/A (Low)

**Impact:** No exposure today. The step's soundness rests on an assumption it does not check (no dependencies), and the check is weaker than "provenance links the release to this repository's build" (CPSE-NFR-008).

**Recommendation:**
1. **Move the check out of `publish`.** Put it in its own job `verify-provenance` (`needs: publish`; `permissions: contents: read`; no `id-token`).
2. **Install without scripts.** Use `npm install --ignore-scripts --omit=peer`.
3. **Check whose attestation it is.** Fetch `dist.attestations.url` and check the SLSA provenance predicate:
   - `buildDefinition.externalParameters.workflow.repository` is `https://github.com/${GITHUB_REPOSITORY}`;
   - `…workflow.path` is `.github/workflows/release.yml`;
   - `…workflow.ref` is `refs/tags/v<version>`;
   - the `resolvedDependencies` git commit is `$GITHUB_SHA`.
4. **Count verified attestations.** Alternatively, parse `npm audit signatures --json` and require that exactly one package is verified.

Overlaps code review CR-005 (install scripts); this finding adds the identity and grep-soundness points.

**Compliance Impact:** None (CPSE-NFR-008 verification strength)
**Status:** Resolved
**Resolution:** Fixed: a separate `verify-provenance` job (`needs: publish`, `contents: read` only) installs with `--ignore-scripts`, runs `npm audit signatures`, and checks the SLSA statement: subject and sha512 against `dist.integrity`, workflow repository, path and ref, and the resolved commit. Rehearsed against nanoid 6.0.2: its own identity passes; this repository's identity fails naming each mismatch.

---

### SEC-006: The plan's hand publish of the first version, and token publishing left enabled, go against "published only by CI"

**Severity:** Low
**Category:** Authorization
**OWASP Reference:** A03:2025 Software Supply Chain Failures
**Location:**
- `.gener8v/changes/graph-library/delivery/component-packaging-and-source-export-ticket-009-delivery.md` (Implementation Plan, user steps: "publish the package's first version and add the trusted publisher on npm"; Notes)
- `docs/versioning.md:52`
- `CONTRIBUTING.md` ("Releasing")

**Description:**
- **The plan contradicts the policy.** npm trusted publishing is configured per package, so the delivery plans a first version published before the trusted publisher exists, which in practice means by hand from a maintainer's machine. That conflicts with:
  - prd/OC-002 ("never by hand");
  - `docs/versioning.md:52` ("Nobody publishes by hand");
  - the ticket hazard "never publish a placeholder".

  That version would carry no provenance, contrary to CPSE-NFR-008.
- **Token publishing stays on.** Neither the workflow nor the documented steps switch the package's npm publishing access to "Require two-factor authentication and disallow tokens", or revoke tokens made for the first publish. Until then, "Publishing can happen only from that workflow" is policy, not enforcement: any maintainer's npm token can still publish without provenance.

**Attack Scenario:** N/A (Low)

**Impact:** One release without provenance, and a standing route to publish without provenance through any leaked npm token.

**Recommendation:**
1. **Decide and record how the first version is published,** as a delivery decision or a ticket for the Engineer. The options:
   - the same workflow with a one-off granular token, scoped to this package, short-lived and stored as an `npm` environment secret (SEC-001), revoked right after;
   - a bootstrap path npm supports at that time that does not need an existing package, re-checked against https://docs.npmjs.com/trusted-publishers.
2. **Then lock token publishing.** Set the package's publishing access to "disallow tokens" and list it in the Engineer steps and in `docs/versioning.md`.

**Compliance Impact:** None for CC-XXX (prd/OC-002)
**Status:** Resolved
**Resolution:** Fixed: the first version goes through this workflow with a one-off granular token stored as the `npm` environment secret `NPM_BOOTSTRAP_TOKEN`, used only in the publish step and only when set, then revoked; the package is then set to "Require two-factor authentication and disallow tokens". The docs say to re-check npm's trusted-publisher page first. The config test allows that secret only there.

---

### SEC-007: The version step runs with a write-scoped token over an unprotected `main`; changeset text cannot run code but can stop the step

**Severity:** Informational
**Category:** Authorization
**OWASP Reference:** A01:2025 Broken Access Control
**Location:**
- `.github/workflows/release.yml:31-65`
- `package.json` (the `version` script)
- `scripts/group-changelog.ts:37-38`

**Description:**
- **The version script gets the write token.** `changesets/action` v2.1.2 runs the version script with `GITHUB_TOKEN` (`contents: write`, `pull-requests: write`) in its environment (`src/run.ts`). So:
  - `changeset version`;
  - `.changeset/changelog.cjs`;
  - `tsx scripts/group-changelog.ts`;
  - `pnpm generate`;
  - and every dev dependency they load

  can push to any branch, including `main` while it is unprotected. Pushes made with `GITHUB_TOKEN` do not start workflows, so the token cannot set off a release by pushing a tag itself.
- **Redundant setting.** `env: GITHUB_TOKEN` (line 64-65) is not needed in v2: the `github-token` input defaults to `github.token`.
- **Changeset files are data** (see Input Validation): no file under `.changeset/` can run code here.
- **Changeset text can break the step.** A summary without a category makes `groupNewestSection` throw ("cannot regroup"), which fails the version step. `pnpm check:changesets` catches this in CI, but CI is not a required check.
- **Pull-request body.** Summary text goes into the version pull request's body as markdown. GitHub sanitizes it, but `@mentions` in a summary will notify people.

**Attack Scenario:** N/A (Informational)

**Impact:** Code running in the version step can push to `main` (see also SEC-002). A malformed changeset delays a release; it does not compromise one.

**Recommendation:**
- Protect `main` (planned).
- Remove the redundant `env: GITHUB_TOKEN`.
- Make `pnpm check:changesets` a required check.
- Consider letting `group-changelog.ts` file an uncategorized entry under "Changed" with a warning instead of stopping the release. That is a product choice; failing closed is also defensible.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Noted: covered by the Engineer step that protects `main`.

---

### SEC-008: Not a vulnerability. The version job fails on every push to `main`: `changesets/action` v2.1.2 refuses the input names `version`, `commit` and `title`

**Severity:** Informational
**Category:** Misconfiguration
**OWASP Reference:** N/A
**Location:** `.github/workflows/release.yml:59-63`

**Description:**
- **v2 renamed the inputs.** At the pinned commit `ae32849d…` (v2.1.2), `action.yml` declares `version-script`, `commit-message` and `pr-title`.
- **The action throws on the old names.** Before doing anything, `src/index.ts` calls `throwOnRenamedInputs({ publish: "publish-script", version: "version-script", commit: "commit-message", title: "pr-title", … })`. `src/utils.ts:166-182` then throws "The following inputs have been renamed: … Please update your workflow file." when any old name is set.
- **The workflow uses the old names.** It sets `version:`, `commit:` and `title:`, so the `version-pr` job fails on every push to `main`.
  - No version pull request is opened.
  - `pnpm run version` (the changelog regrouping, the `src/generated/version.ts` refresh) never runs in CI.
- **Nothing caught it.** actionlint does not check this action's inputs. The delivery's version-step check ran `pnpm run version` directly, not through the action. The release-config test matches the old name (`/version: pnpm run version$/m`).

**Attack Scenario:** N/A (not a vulnerability)

**Impact:**
- **Functional.** The first acceptance criterion ("opens a Changesets version pull request on main") cannot be met as written.
- **For security.** No finding above depends on this. Once the inputs are fixed, SEC-002 and SEC-007 apply as described.

**Recommendation:**
1. Use `version-script: pnpm run version`, `commit-message: "Version the package"` and `pr-title: "Version the package"`.
2. Update the test's pattern.
3. Confirm with one run on `main`.

The code review owns this; neither the code review nor the quality review records it.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed: the inputs are `version-script`, `commit-message`, `pr-title` (checked against `changesets/action` v2.1.2's `action.yml`); the script is `release:version`. A test checks every input against v2.1.2's list.

---

### SEC-009: Tool installation and repository action policy rely on registry and TLS trust only

**Severity:** Informational
**Category:** Dependency
**OWASP Reference:** A03:2025 Software Supply Chain Failures
**Location:**
- `.github/workflows/release.yml:47`, `:81`, `:152`, `:225` (`npm install --global pnpm@10.28.2`)
- `.github/workflows/release.yml:164` (`npm install --global npm@11.21.1`)
- the repository's Actions settings

**Description:**
- **Installs by version only.** pnpm and npm are installed by exact version from the registry. The versions are immutable on npm, but no integrity is pinned in the repository, so they are trusted on the registry and TLS only.
  - The pnpm install runs on the runner's preinstalled Node.js before `setup-node`.
  - The npm upgrade runs in the job that holds `id-token`. That is needed: trusted publishing requires npm ≥ 11.5.1.
- **Repository action policy.** The repository allows all actions (`allowed_actions: all`) and does not require SHA pinning (`sha_pinning_required: false`). Today's workflows pin every action, but nothing enforces it.

**Attack Scenario:** N/A (Informational)

**Impact:** Defense in depth only; no known weakness.

**Recommendation:**
- **Pin pnpm's hash.** Add its hash to `packageManager` (`pnpm@10.28.2+sha512.<hash>`) and install it through Corepack (`corepack enable`), which checks the hash.
- **Check npm's tarball.** Fetch the tarball and compare its `sha512` with a value committed in the workflow before installing it. Alternatively, accept registry trust for npm itself.
- **Tighten the repository settings.**
  - Turn on "Require actions to be pinned to a full-length commit SHA".
  - Restrict allowed actions to GitHub-owned actions plus `changesets/action`.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Noted: tool installs rely on registry and TLS trust; actionlint in CI runs from its Docker image pinned by digest.

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Fixed | `npm` environment; tag on `main`; Engineer steps | No | `.github/workflows/release.yml`, `docs/versioning.md`, `CONTRIBUTING.md`, `tests/package/release-config.test.ts` |
| SEC-002 | Fixed | no cache with a credential | No | `.github/workflows/release.yml`, `.github/actions/setup/action.yml`, `tests/package/release-config.test.ts` |
| SEC-003 | Fixed | publish only on a pushed tag | No | `.github/workflows/release.yml`, `tests/package/release-config.test.ts` |
| SEC-004 | Fixed | check:dist and publint on the published build | No | `.github/workflows/release.yml`, `tests/package/release-config.test.ts` |
| SEC-005 | Fixed | `verify-provenance` job checks the identity | No | `.github/workflows/release.yml`, `tests/package/release-config.test.ts` |
| SEC-006 | Fixed | CI token bootstrap, then disallow tokens | No | `.github/workflows/release.yml`, `docs/versioning.md`, `tests/package/release-config.test.ts` |
| SEC-007 | Noted | covered by protecting `main` | No | — |
| SEC-008 | Fixed | correct changesets inputs | No | `.github/workflows/release.yml`, `package.json`, `tests/package/release-config.test.ts` |
| SEC-009 | Noted | registry and TLS trust | No | — |

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:** Seven findings fixed in resolution and re-verified (mutants; the provenance steps rehearsed against a real attested package); SEC-007 and SEC-009 noted. The publishing identity's last parts (the `npm` environment, tag ruleset, branch protection, npm settings) are Engineer steps before the first release.
