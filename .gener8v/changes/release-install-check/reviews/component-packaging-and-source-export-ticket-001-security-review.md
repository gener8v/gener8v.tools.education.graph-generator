# TICKET-001: Check the published package after every release — Security Review

## Summary

I reviewed release-install-check/component-packaging-and-source-export/TICKET-001 at delivery commit `88f93e9` (`git diff main...88f93e9`). The change adds the release job `install-check` and the script it runs, `tests/smoke/published.mjs`. The script installs the version just published from the npm registry into a temporary project with React, runs `npm audit signatures`, runs the installed CLI through `npx`, and imports and renders every entry point.

The job keeps the release workflow's earlier security decisions:
- `contents: read` only, with no id-token, no secret and no `env`;
- a checkout of the tag with `persist-credentials: false`;
- `actions/setup-node` with no cache;
- actions pinned to the same commit SHAs as the other jobs;
- no `${{ }}` in its `run:` line;
- a version argument validated as strict semver before use, and every command run with an argument array, never a shell;
- `--ignore-scripts` on both installs;
- `npx --no-install`, so the CLI comes only from the local install.

One Medium finding: the signature check does not check the package it is meant to check. The script installs `@gener8v/graph-generator` with `--no-save`, which leaves it extraneous. `npm audit signatures` then verifies only React, React DOM and scheduler, and the "verified attestation" test passes on React's attestations (SEC-001; reproduced against the real registry).

The other findings:
- Two Low: a local run trusts the user's npm configuration and runs the published code with the user's own credentials (SEC-003); the config test checks the script's text by substring, so it would not catch either gap (SEC-004).
- One Informational: `--package-lock=false` makes the second install drop the React lockfile (SEC-002).

**Files Reviewed:**
- `tests/smoke/published.mjs`
- `.github/workflows/release.yml` (job `install-check`, `.github/workflows/release.yml:347-370`, read with the whole workflow)
- `tests/package/release-config.test.ts`
- `package.json` (script `test:published`)
- `docs/versioning.md` (release step 7)
- Read for context, not changed: `tests/smoke/render.mjs`, `tests/smoke/react19/package.json`, `tests/smoke/react19/package-lock.json`

**Findings:** 4
**Critical:** 0 | **High:** 0 | **Medium:** 1 | **Low:** 2 | **Informational:** 1

## Security Assessment

### Input Validation

**Status:** Adequate
**Notes:** The script takes one input, the version.
- **From the workflow.** It comes from `"${GITHUB_REF_NAME#v}"`, quoted, through the environment rather than `${{ }}` (`.github/workflows/release.yml:370`). The tag has already passed `checks` and `publish`: the tag is on `main` and matches `package.json`.
- **Validation.** `tests/smoke/published.mjs:19` checks it against `^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$`. JavaScript's `$` without the `m` flag does not match before a trailing newline. The value cannot start with `-`, so it cannot become an npm option, and it cannot be a range or a dist-tag.
- **Commands.** Every command goes through `execFileSync` with an argument array (`tests/smoke/published.mjs:45`). The test at `tests/package/release-config.test.ts` (the `published-package check script` block) feeds it `1.0; rm -rf /` and `latest`, and both exit 2 before any network use.
- **What `render.mjs` receives.** Its arguments are the examples directory from the checkout and the exports keys of the installed package's own `package.json`. Both are passed as arguments, with no shell.

I found no injection vector.

### Authentication & Authorization

**Status:** Adequate
**Notes:**
- **Permissions and credentials.** `install-check` has `permissions: contents: read` (asserted). It has no `environment`, no `id-token` and no secret: the test that lists every `secrets.` reference still finds only `GITHUB_TOKEN` and `NPM_BOOTSTRAP_TOKEN`, used elsewhere. The checkout stores no credential.
- **When it runs.** Only after `verify-provenance`, which needs `publish`. A manual run or a run with publishing switched off skips `publish`, so this job is skipped too. The job never publishes and holds nothing that could (prd/OC-002).
- **Registry code with a read-only token.** The job runs code from the registry: the published CLI, every entry point, and React from the lockfile. Code with `sudo` on a GitHub-hosted runner can read the job's read-only token and the Actions cache token from the runner process. In a public repository the read-only token gives nothing that is not already public.
- **The Actions cache.** A cache entry saved from this job is scoped to the tag's ref. On that ref, only a re-run of `checks` (`cache: true`, no credential) or a manual `dry-run` on the tag (no credential) could restore it. `publish` and `version-pr` use no cache (graph-library CPSE TICKET-009 SEC-002, still asserted with `install-check` added to the list). To poison the cache from here, an attacker would already have to control the published package. I found no cache-poisoning path to a credential.

### Data Protection

**Status:** Adequate
**Notes:**
- **Data.** No personal data, no secret and no credential is read, written or logged. The script prints npm's stdout and stderr when a step fails. In CI that output holds no credential, because there is no `.npmrc` and no token.
- **Temporary directory.** It is made with `mkdtempSync` (mode 0700) and removed in `finally`.
- **Published files.** `package.json` `files` is `["dist"]`, so the script is not published.

### Configuration Security

**Status:** Gaps Found
**Notes:**
- **The signature check (SEC-001).** This is the check CPSE-REQ-048 asks for, and it does not cover `@gener8v/graph-generator`. In CI the earlier `verify-provenance` job covers it today: its `npm init -y` and saved install make the package a root dependency, so the package is audited there. The run does not fail open. But this job reports a check it does not make, and the ticket's own Known Hazard suggested moving the signature check into this job.
- **The React lockfile (SEC-002).** `--package-lock=false` means the second install ignores the React lockfile.
- **Local runs (SEC-003).** A local run trusts the user's npm configuration and runs the published code with the user's credentials.
- **The config test (SEC-004).** It cannot catch a regression in either control.
- **Settings checked and fine.** Action pins, `persist-credentials: false`, no cache, a timeout (`timeout-minutes: 20`, with a 180 s cap per npm call), and no `|| true` or `shell: true` in the script.

### Dependencies

**Tool:** `pnpm audit` (pnpm 10.28.2) on the repository lockfile; `npm audit` (npm 11.3.0) on the project the script builds (the react19 template plus `@gener8v/graph-generator@0.1.0`). **Date:** 2026-11-05T18:07Z.
**Output:**
- `pnpm audit`: 2 vulnerabilities, both moderate and both development-only, through `@storybook/react-vite > @joshwooding/vite-plugin-react-docgen-typescript`:
  - `glob` (GHSA-3g3m-2fjr-6pw4, patched in >=14.0.2);
  - `minimatch` (GHSA-g3hv-75wg-m249, patched in >=11.0.1).

  Both were there before this change and are already tracked in earlier graph-library security reviews (for example `.gener8v/changes/graph-library/reviews/component-packaging-and-source-export-ticket-010-security-review.md`). This ticket adds no dependency, so they are not raised again here.
- `npm audit` on the project the script builds: `found 0 vulnerabilities`. The package has no runtime dependencies; React is its only peer dependency.

### Cryptography

The only cryptography here is npm's registry signatures and Sigstore provenance, which `npm audit signatures` verifies. What that command actually covers is SEC-001.

### Logging & Monitoring

A failure prints the version and the step (`@gener8v/graph-generator@<v>: <step> failed: …`), followed by npm's output. This is enough to diagnose a failed release, and in CI it exposes nothing sensitive. A retry prints only the first line of each npm error.

### Compliance

| Constraint | Result | Notes |
|---|---|---|
| prd/OC-002 (published only by CI from tags) | Met | The job has no publishing credential and runs only after `publish` |
| prd/OC-003 (fix forward, never remove) | Met | The job only reports; `docs/versioning.md` step 7 says to fix forward or deprecate |
| prd/CC-003 (no data collected or sent) | Not affected | CI-only script, not in `files` |
| prd/CC-001 (licenses) | Not affected | No new dependency |

No CC-XXX constraint is violated.

## Findings

### SEC-001: `npm audit signatures` in `install-check` never checks `@gener8v/graph-generator`, and the attestation test passes on React's attestations

**Severity:** Medium
**Category:** Misconfiguration
**OWASP Reference:** A08:2025 Software or Data Integrity Failures
**Location:**
- `tests/smoke/published.mjs:68`: `installFromRegistry`, `"--no-save"` and `"--package-lock=false"`
- `tests/smoke/published.mjs:26` and `:86-91`: `VERIFIED_ATTESTATIONS` and `verifySignatures`

**Description:**
- **The install leaves the package extraneous.** `installFromRegistry` installs the package with `--no-save`, so no edge from the project root or from any installed package points to it.
- **`npm audit signatures` follows edges.** It builds its list from the edges out of every node (`getEdgesOut` in npm's `lib/utils/verify-signatures.js`), so an extraneous package is never audited.
- **Reproduced against the real registry (2026-11-05, npm 11.3.0)** in a copy of the react19 template:
  - after `npm ci --ignore-scripts`: `audited 3 packages … 3 packages have verified attestations`;
  - after the script's own `npm install --no-save --no-audit --no-fund --ignore-scripts --package-lock=false @gener8v/graph-generator@0.1.0`: still `audited 3 packages … 3 packages have verified attestations`, and `npm ls` shows `@gener8v/graph-generator@0.1.0 extraneous`;
  - the same install with `--save-exact` instead: `audited 4 packages … 4 packages have verified attestations`.
- **The attestation test cannot fail on our package.** React, React DOM and scheduler all carry attestations, so `VERIFIED_ATTESTATIONS` matches whatever is true of our package, even when it has no attestation at all.
- **The evidence in the delivery record is React's.** The record says the real run against 0.1.0 proved CPSE-REQ-048 ("`npm audit signatures` with a verified attestation"). The output that proved it is React's.
- **The CLI runs unchecked.** Step 4 then runs the package's CLI and step 5 imports every entry point, after a signature step that never looked at the package.
- **npm 10.** I did not run this under npm 10, the version bundled with Node 22 in CI. Its `verify-signatures.js` collects packages the same way, from edges out.

**Attack Scenario:**
1. **In CI today there is a compensating control.** Earlier in the same run, `verify-provenance` installs the package as a saved root dependency (`npm init -y`, then `npm install … "$PACKAGE@$version"`) and audits it. It also checks the provenance identity. A tampered or unattested package would fail that job, and `install-check` would not run.
2. **That control is one refactor away from gone.** The ticket's Known Hazard proposed "move the signature check into the new job". Had DEL-001 gone that way, or if `verify-provenance`'s install step is trimmed later, a release whose tarball lacks valid signatures or provenance would pass `install-check`. Its log would say "its signatures verify".
3. **On a maintainer's machine there is no compensating control.** `docs/versioning.md` presents `pnpm test:published <version>` as "the same check on your own machine". Suppose the maintainer's npm configuration routes `@gener8v` or the whole registry through a mirror or proxy, and the mirror (or whoever controls it) serves a tampered tarball with a matching packument. `npm audit signatures` audits only React and passes. `npx` then runs the tampered CLI with the maintainer's privileges: an npm token in `~/.npmrc`, SSH keys, `gh` credentials. Maintainers are most likely to run this check exactly when a release looks wrong.

**Impact:**
- The post-publish check reports that the package's signatures and attestations verified when they were never checked, so CPSE-REQ-048 is not met for the package under test.
- In CI it does not fail open today only because of a separate job.
- On a developer machine, registry code runs after a signature check that did not cover it.

**Recommendation:**
1. **Make the package a root dependency of the temporary project.** Replace `"--no-save", … "--package-lock=false"` with `"--save-exact"`. The project is temporary, so saving costs nothing, and the lockfile stays in force (see SEC-002).
2. **Make the check prove coverage.** Fail unless all of these hold:
   - `npm ls @gener8v/graph-generator --json` shows the exact version, not extraneous;
   - `npm audit signatures` reports `audited N packages`, N registry signatures verified and N verified attestations, with the same N;
   - N matches the number of packages actually installed.

   Requiring N verified attestations works today, because every package in this tree is attested. If a React dependency ever loses its attestation, check our package's attestation specifically, for example by keeping `verify-provenance`'s identity check as the authority and asserting here that `@gener8v/graph-generator` is among those audited.
3. **Lock it with a test (SEC-004).** Assert that the install arguments do not contain `--no-save`, and correct the delivery record's claim that CPSE-REQ-048 was proven.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Resolved by code review CR-001 (Engineer — Thomas Eaves, 2026-11-05): the package is installed with `--save-exact`, so npm audits it; `verifySignatures` requires the audited and signed counts to equal the packages in the lockfile, a verified attestation, and the registry's SLSA v1 provenance type for the version. Real run against 0.1.0: 4 packages audited, signed and attested (3 before).

---

### SEC-002: `--package-lock=false` makes the registry install ignore the React lockfile and re-resolve React's tree from version ranges

**Severity:** Informational
**Category:** Dependency
**OWASP Reference:** A03:2025 Software Supply Chain Failures
**Location:** `tests/smoke/published.mjs:68` (`installFromRegistry`)
**Description:**
- **The second install drops the lockfile.** `installReact` installs React from `tests/smoke/react19/package-lock.json` with `npm ci`, which uses the lockfile's integrity hashes. DEL-002 relies on this: "React comes from a lockfile with integrity hashes". The second install then passes `--package-lock=false`.
- **What npm does with that flag.** Its arborist then resets the shrinkwrap instead of loading the lockfile (`build-ideal-tree.js`, `!this[_usePackageLock]` → `Shrinkwrap.reset`). The whole tree is rebuilt from `package.json` and registry ranges.
- **Nothing has drifted yet.** `react` and `react-dom` are pinned exactly. `scheduler` is `^0.28.0`, and today 0.28.0 is the only stable 0.28 release, so the tree is the same. A future scheduler 0.28.x would replace the locked one silently.
- **Signatures still apply.** The re-resolved packages still come from the registry with registry signatures, and `npm audit signatures` audits them, because they are reachable from the project root.

**Attack Scenario:** N/A (Informational)
**Impact:**
- The lockfile pin that DEL-002 cites does not hold for the run that executes the package.
- A newly published in-range release of a React dependency would be pulled in without review. It would still pass signature verification.

**Recommendation:** Drop `--package-lock=false` and install with `--save-exact`, which also fixes SEC-001. npm then adds `@gener8v/graph-generator` to the existing lockfile and keeps React's locked entries.
**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Resolved by code review CR-001 (Engineer — Thomas Eaves, 2026-11-05): `--package-lock=false` is gone; npm adds the package to the template's lockfile and keeps React's locked entries. The script test fails if `--package-lock=false` or `--no-save` returns.

---

### SEC-003: A local run trusts the user's npm configuration and runs the published code with the user's own credentials

**Severity:** Low
**Category:** Misconfiguration
**OWASP Reference:** A03:2025 Software Supply Chain Failures
**Location:**
- `tests/smoke/published.mjs:43-50` (`run`, which inherits the full environment), `:61`, `:68`, `:88`, `:98`
- `docs/versioning.md:74` ("Run `pnpm test:published <version>` to make the same check on your own machine")
- `package.json` (`test:published`)

**Description:**
- **The registry is not pinned.** CPSE-REQ-047 says "from the public registry", but the script never sets the registry. Every npm and npx call inherits the caller's environment and npm configuration: user and global `.npmrc`, `npm_config_*` variables, `registry`, `@gener8v:registry`, proxy settings. In CI none of these is set, so npm uses `https://registry.npmjs.org/`. On a maintainer's machine, a scoped registry or a mirror decides what is installed.
- **The published code runs with the user's privileges.** The script runs the CLI and imports every entry point with the user's full privileges and environment. That is inherent to checking a published package, but the documentation presents it as an ordinary command with no warning.

**Attack Scenario:**
- A maintainer has `@gener8v:registry` pointed at a company proxy, left over from other work, and runs `pnpm test:published 0.2.0`.
- The proxy serves whatever it holds for that version. Combined with SEC-001, nothing in the script checks that package.
- `npx` then runs it with the maintainer's npm and Git credentials.

Even after SEC-001 is fixed, the check verifies signatures against the keys of whichever registry is configured, not npmjs's.

**Impact:**
- A local run can test a different artifact from the one users get from npmjs, and still report success.
- Any code it runs has the maintainer's credentials.

**Recommendation:**
1. **Pin the registry.** In `run`, pass `--registry=https://registry.npmjs.org/` to npm and npx.
2. **Isolate the configuration.** Point `npm_config_userconfig` (and `npm_config_globalconfig`) at an empty file in the temporary directory, and drop inherited `npm_config_*` variables from the child environment. A scoped registry from user configuration would otherwise still win over `--registry`.
3. **Warn in the docs.** Add one sentence to `docs/versioning.md` step 7: the local command runs the published package's code. Run it in a container or a throwaway environment when checking a release you suspect.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Approved (Engineer — Thomas Eaves, 2026-11-05). `isolateNpm(work)` runs every command with empty user and global npmrc files in the temporary directory, none of the caller's `npm_config_*` variables, and `npm_config_registry=https://registry.npmjs.org/`. The script header and `docs/versioning.md` step 7 say the local command runs the published code as the caller, and to use a throwaway environment for a suspect release. Proof: with `npm_config_@gener8v:registry` and `npm_config_registry` set to `http://127.0.0.1:9/`, `node tests/smoke/published.mjs 0.1.0` still installs from npmjs and passes.

---

### SEC-004: The config test checks the script by substring, so it cannot catch a dropped `--ignore-scripts` on one install or a signature check that misses the package

**Severity:** Low
**Category:** Misconfiguration
**OWASP Reference:** A08:2025 Software or Data Integrity Failures
**Location:** `tests/package/release-config.test.ts:225-240` (the test "checks the published package in its own job …")
**Description:**
- **The test checks text only.** It asserts that `tests/smoke/published.mjs` contains `--ignore-scripts`, `"audit", "signatures"`, `--no-install` and the deadline constant.
- **`--ignore-scripts` is not checked per install.** The flag appears twice (`:61` for `npm ci`, `:68` for `npm install`). Removing it from either install still passes, and the flag is what keeps registry lifecycle scripts from running.
- **Text does not prove what the command checks.** The `"audit", "signatures"` assertion passes today even though the command never checks the package (SEC-001).
- **The earlier pattern was stricter.** The equivalent assertion for `verify-provenance` (`:204`) matches the whole install command with a regular expression.

**Attack Scenario:** A later edit drops `--ignore-scripts` from the registry install, for example while debugging a retry. The test still passes. The next release runs the published package's lifecycle scripts, and those of any future dependency, in CI, where the earlier review's controls assumed none would run.
**Impact:** The security controls this ticket adds have no test that fails when one of them regresses.
**Recommendation:**
- Assert each install's argument list: both contain `--ignore-scripts`, and the registry install does not contain `--no-save`. For example, match `/\["ci",[^\]]*"--ignore-scripts"/` and `/\["install",[^\]]*"--ignore-scripts"[^\]]*\]/`, or export the argument arrays and assert them directly.
- Add a test that fails when the audited set excludes the package. A fixture run of `verifySignatures`' coverage check, from SEC-001 recommendation 2, against stubbed npm output is enough.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Resolved by code review CR-003 (Engineer — Thomas Eaves, 2026-11-05): both install argument lines are asserted exactly (each with `--ignore-scripts`, neither with `--no-save`), as are the audited-count check and the isolation lines; a commented-out guard fails the test. No stubbed-npm fixture was added.

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Resolved by CR-001 | Saved exact install; count and SLSA checks | `tests/smoke/published.mjs` | No |
| SEC-002 | Resolved by CR-001 | Lockfile kept | `tests/smoke/published.mjs` | No |
| SEC-003 | Fix | Public registry, isolated npm configuration, docs warning | `tests/smoke/published.mjs`, `tests/package/release-config.test.ts`, `docs/versioning.md` | No |
| SEC-004 | Resolved by CR-003 | Exact code-line assertions | `tests/package/release-config.test.ts` | No |

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Unresolved Findings:** 0 (all 4 resolved)
**Notes:** Resolved in the main session with the Engineer, 2026-11-05. Re-verification: `pnpm lint` 0, `pnpm typecheck` 0, `pnpm test` 0 (2602 passed), actionlint 0, `pnpm test:published 0.1.0` 0, and the same with a bogus caller registry 0.
