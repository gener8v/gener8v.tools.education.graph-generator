# TICKET-001: Check the published package after every release — Code Review

## Summary

Reviewed the new `install-check` release job, `tests/smoke/published.mjs`, the `test:published` script, the updated release-config test and the `docs/versioning.md` step 7. Every acceptance criterion and CPSE-REQ-047..052 is met and the Verification Run reproduces (including the real run against 0.1.0). One Issue: the attestation check can pass on an attestation that belongs to React rather than to the package under test. Two Observations. 3 findings.

**Delivery Record:** `.gener8v/changes/release-install-check/delivery/component-packaging-and-source-export-ticket-001-delivery.md`
**Files Reviewed:**
- `tests/smoke/published.mjs`
- `package.json`
- `.github/workflows/release.yml`
- `tests/package/release-config.test.ts`
- `docs/versioning.md`
- `.gener8v/specifications/component-packaging-and-source-export.md` (`@spec Coverage` table)

**Findings:** 3
**Critical:** 0 | **Issues:** 1 | **Observations:** 2

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| New job `needs: verify-provenance`, runs only when publish ran, `permissions: contents: read` only | Yes | `.github/workflows/release.yml` job `install-check` (needs, permissions); skipped when `publish` is skipped because `verify-provenance` needs `publish`; asserted in `tests/package/release-config.test.ts` |
| Exact version plus React and React DOM into a fresh empty directory, public registry, scripts disabled | Yes | `tests/smoke/published.mjs`:installReact (lockfile `npm ci --ignore-scripts`), installFromRegistry (`--ignore-scripts`, `${PACKAGE}@${version}`, strict semver gate in main); fresh `mkdtempSync` directory |
| Retry while unavailable, at most 10 minutes, fail naming the version | Yes | `tests/smoke/published.mjs`:installFromRegistry (`INSTALL_DEADLINE_MS = 600_000`, 15 s retry); failure line from main names version and step |
| `npm audit signatures` runs; fails unless verified signatures and at least one verified attestation | Partial | `tests/smoke/published.mjs`:verifySignatures. Nonzero exit fails the step and the regex requires an attestation line, but the attestation count is not tied to the package under test (CR-001) |
| `npx @gener8v/graph-generator export` exits 0, non-empty `.tsx` exists | Yes | `tests/smoke/published.mjs`:runExport (`npx --no-install`, size and `export function` checks) |
| Every JS entry imported, JSON entries parsed, list from installed `package.json` | Yes | `tests/smoke/published.mjs`:importEntryPoints reads `exports` keys from `node_modules/@gener8v/graph-generator/package.json`, passes to `tests/smoke/render.mjs` |
| Each failing step prints the version and the check | Yes | `tests/smoke/published.mjs`:main catch (`<pkg>@<v>: <step> failed: …`) |
| `release-config.test.ts` asserts the new job and passes; actionlint passes | Yes | `tests/package/release-config.test.ts` (six jobs, needs, permissions, no cache, command and script-text test, exit-2 tests); re-run passes; actionlint exit 0 |
| `docs/versioning.md` describes the job | Yes | `docs/versioning.md` release step 7 |
| Exercised for real against 0.1.0 and recorded | Yes | Verification Run row `pnpm test:published 0.1.0`; re-run here, exit 0 |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| CPSE-REQ-047 | Install exact published version into an empty project | `tests/smoke/published.mjs`:installFromRegistry | Yes |
| CPSE-REQ-048 | Verify registry signatures and attestations of installed packages | `tests/smoke/published.mjs`:verifySignatures | Partial (CR-001) |
| CPSE-REQ-049 | Run installed export on a sample, confirm file written | `tests/smoke/published.mjs`:runExport | Yes |
| CPSE-REQ-050 | Import every public entry point | `tests/smoke/published.mjs`:importEntryPoints | Yes |
| CPSE-REQ-051 | Fail the run naming version and step | `tests/smoke/published.mjs`:main | Yes |
| CPSE-REQ-052 | Retry up to 10 minutes while not installable | `tests/smoke/published.mjs`:installFromRegistry | Yes (see CR-002) |

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/OC-002 | Releases only from CI on tags; the job never publishes or needs a token | Yes | `install-check` has `contents: read` only, no secrets or env, `persist-credentials: false`, no cache, no `id-token`; the script only installs and reads |
| prd/OC-003 | Broken published version is fixed forward or deprecated; the job only reports | Yes | The script has no unpublish or deprecate call; `docs/versioning.md` step 7 says fix forward or deprecate |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-016 | Toolchain, checks and release process | Yes | Job pinned by SHA actions like its siblings, `${GITHUB_REF_NAME#v}` derivation reused, no `${{ }}` in the run script, script runnable locally via `pnpm test:published` |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| CPSE-REQ-047 | `@spec CPSE-REQ-047` | `tests/smoke/published.mjs`:installFromRegistry | Yes |
| CPSE-REQ-048 | `@spec CPSE-REQ-048` | `tests/smoke/published.mjs`:verifySignatures | Yes |
| CPSE-REQ-049 | `@spec CPSE-REQ-049` | `tests/smoke/published.mjs`:runExport | Yes |
| CPSE-REQ-050 | `@spec CPSE-REQ-050` | `tests/smoke/published.mjs`:importEntryPoints | Yes |
| CPSE-REQ-051 | `@spec CPSE-REQ-051` | `tests/smoke/published.mjs`:main | Yes |
| CPSE-REQ-052 | `@spec CPSE-REQ-052` | `tests/smoke/published.mjs`:installFromRegistry | Yes |

**Coverage:** 6 of 6 requirements annotated
**Missing:** None
**Specification table:** Yes — `## @spec Coverage` lists the same locations for CPSE-REQ-047..052.

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm lint` | 0 | Yes |
| `pnpm typecheck` | 0 | Yes |
| `pnpm test` | 0 (94 files, 2602 passed) | Yes |
| `actionlint` (local binary instead of the docker image) | 0 | Yes |
| `pnpm test:published 0.1.0` | 0 | Yes |
| `pnpm test:published 0.0.1-nope` | not re-run (10-minute run, waived by the requester) | Not re-run |

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | Keeps `verify-provenance` intact as the ticket hazard requires; the repeat audit covers React too. |
| DEL-002 | Reasonable | Reuses `render.mjs` and the locked react19 template; no second import mechanism. |
| DEL-003 | Reasonable | Plain Node script avoids a repository install in a post-publish job; the config test was adjusted to allow setup-node in it. |

## Findings

### CR-001: Attestation check is not tied to the package under test

**Severity:** Issue
**Location:** `tests/smoke/published.mjs`:verifySignatures (the `VERIFIED_ATTESTATIONS` regex)
**Traces To:** CPSE-REQ-048; acceptance criterion 4
**Description:** The check passes when `npm audit signatures` prints any "N packages have verified attestations" line. The real run reports "3 packages have verified attestations" across the whole project, React included. If `@gener8v/graph-generator` were published without provenance but its dependencies carry attestations, the check could still pass. `verify-provenance` still guards the package itself (CPSE-NFR-008), so release safety is not lost, but this job's own verification of CPSE-REQ-048 is weaker than it reads.
**Impact:** The post-publish check can report success for a version with no attestation of its own, and a future change to `verify-provenance` would leave no second guard.
**Recommendation:** Also require the package's own attestation, for example by parsing `npm audit signatures --json` for the package, or by checking that `npm view @gener8v/graph-generator@<version> dist.attestations` is present. Add a test for the check's text.
**Status:** Resolved
**Resolution:** Approved (Engineer — Thomas Eaves, 2026-11-05). The package is installed with `--save-exact` instead of `--no-save --package-lock=false`, so npm audits it. `verifySignatures` now requires the audited count and the signed count to equal the packages in the lockfile, a verified attestation, and the registry's `dist.attestations.provenance.predicateType` for this version to be `https://slsa.dev/provenance/v1`. Real run against 0.1.0: 4 packages audited, signed and attested (3 before). Also resolves security SEC-001 and SEC-002.

---

### CR-002: Non-transient install failures are retried for the full 10 minutes

**Severity:** Observation
**Location:** `tests/smoke/published.mjs`:installFromRegistry
**Traces To:** CPSE-REQ-052
**Description:** CPSE-REQ-052 retries "while not yet installable"; the loop retries every failure (network, a broken tarball, an install error) until the deadline. The delivery record notes this. The 20-minute job timeout bounds it, and the `0.0.1-nope` run confirmed the full 10 minutes before failing.
**Impact:** A genuinely broken version takes 10 minutes to fail, and the last npm error is the only clue.
**Recommendation:** Accept as is, or retry only on `E404`/`notarget` and fail at once on other errors.
**Status:** Resolved
**Resolution:** Approved (Engineer — Thomas Eaves, 2026-11-05). `installFromRegistry` retries only while npm reports `E404`, `ETARGET` or `notarget`; any other install error fails at once.

---

### CR-003: Script-content test uses substring checks

**Severity:** Observation
**Location:** `tests/package/release-config.test.ts` (test "checks the published package in its own job…")
**Traces To:** Acceptance criterion 8 (exact-version install asserted)
**Description:** The exact-version, no-scripts and 10-minute cap assertions are `toContain` checks on the script text, such as `expect(script).toContain("npm")`. They would still pass if the strings moved into a comment or an unused branch. The behavior is separately proven only by the manual real run.
**Impact:** Weak regression protection for the install arguments.
**Recommendation:** Optionally tighten to match the `args` array line, or accept given the real-registry check.
**Status:** Resolved
**Resolution:** Approved (Engineer — Thomas Eaves, 2026-11-05). The test now reads code lines only (comment lines removed) and asserts both npm install argument lines exactly, the deadline and not-found constants, the not-found guard, the audit and count checks, the SLSA type and the `npx --no-install` call, and the absence of `--no-save` and `--package-lock=false`. A mutation (commenting out the not-found guard) fails it. Also resolves security SEC-004.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Approve | Saved exact install; audit count, signed count and SLSA attestation checks | `tests/smoke/published.mjs` |
| CR-002 | Approve | Retry only on not-found errors | `tests/smoke/published.mjs` |
| CR-003 | Approve | Code-line assertions on the script | `tests/package/release-config.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (all 3 resolved)
**Notes:** Resolved in the main session with the Engineer, 2026-11-05. Re-verification after the fixes: `pnpm lint` 0, `pnpm typecheck` 0, `pnpm test` 0 (2602 passed), actionlint 0, `pnpm test:published 0.1.0` 0 (4 packages audited, signed and attested).
