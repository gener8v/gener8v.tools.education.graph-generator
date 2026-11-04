# TICKET-009: Set up the release pipeline with provenance and the versioning policy — Code Review

## Summary

Reviewed the release workflow, the version step, the consolidated changelog-category list, the changelog regrouping script, `docs/versioning.md` and the two test files against TICKET-009 and CPSE-REQ-042/043 and CPSE-NFR-008. The structure matches the plan and the Known Hazards (gated publish, `id-token` only on `publish`, smoke and e2e kept out of it, OIDC without token). Five Issues and two Observations: two acceptance criteria are honestly Unverified (they need the live repository), the specification's `@spec Coverage` table was not updated, the `checks` job is narrower than the CI suite, and the post-publish step runs registry install scripts in the job holding `id-token`.

**Delivery Record:** `.gener8v/changes/graph-library/delivery/component-packaging-and-source-export-ticket-009-delivery.md`
**Files Reviewed:**
- `.github/workflows/release.yml`
- `package.json`
- `scripts/changelog-categories.json`
- `scripts/changelog-categories.ts`
- `scripts/check-changesets.ts`
- `scripts/group-changelog.ts`
- `.changeset/changelog.cjs`
- `.changeset/README.md`
- `docs/versioning.md`
- `CONTRIBUTING.md`
- `tests/package/release-config.test.ts`
- `tests/package/group-changelog.test.ts`

**Findings:** 7
**Critical:** 0 | **Issues:** 5 | **Observations:** 2

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| `release.yml` opens a Changesets version PR on main and, on a version tag, builds, runs the full check suite and publishes with `--provenance` by OIDC, no long-lived token | Partial | `.github/workflows/release.yml` jobs `version-pr` (l.31-65), `checks` (l.70-133), `publish` (l.137-210; `npm publish --provenance --access public` l.181; no token, `release-config.test.ts` "holds no long-lived npm token"). "Full check suite" is narrower than CI: no `check:dist`, `check:deps`, `check:images`, `check:changesets`, `bench` (CR-004) |
| Publishing only from that workflow; `docs/versioning.md` states manual publishing is not allowed and versions are deprecated, never unpublished | Yes | `docs/versioning.md` l.52 "Nobody publishes by hand", l.77-84 "Never unpublish ... deprecate"; `CONTRIBUTING.md` "Releasing". Registry-side enforcement is not described (CR-007) |
| After a publish, the workflow confirms the provenance attestation is on the registry (CPSE-NFR-008) | Partial | Step exists: `release.yml` l.184-210 (`dist.attestations` poll, `npm audit signatures`, grep "verified attestation"). Never run against a real publish; delivery marks it Unverified (CR-001). The step also installs registry code with `id-token` available (CR-005) |
| `docs/versioning.md` lists the public contract and the `0.x` policy (minor before 1.0.0, major after) | Yes | `docs/versioning.md` l.6-33 and table l.24-28; worked example l.35-42 uses the GSV-REQ-052/053 text limits as the hazard asks; no `1.0.0` bump |
| A dry-run of the workflow on a branch succeeds without publishing | Partial | `dry-run` job l.213-239 (`npm publish --dry-run --provenance=false`, no `id-token`); not executed (CR-002) |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| CPSE-REQ-042 | Semantic versioning with the five-part public contract | `docs/versioning.md` l.6-33 | Yes |
| CPSE-REQ-043 | Breaking change only in a new major version | `docs/versioning.md` l.30-33 (0.x minor under AD-016/TQ-006, major from 1.0.0); `.changeset/README.md` | Yes (0.x reading per the ticket hazard, documented) |
| CPSE-NFR-008 | Provenance on published releases, verified by the post-publish attestation check | `.github/workflows/release.yml` l.180-210; `tests/package/release-config.test.ts` (structure only) | Partial: the check never ran against a real publish; Unverified in the record (CR-001) |
| CPSE-REQ-041 (carried CR-003/QR-010) | Changelog grouped by category; one category list | `scripts/group-changelog.ts:groupNewestSection`; `scripts/changelog-categories.json` | Yes |

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/IC-003 | Releases carry provenance from CI | Yes (in design) | `--provenance`, OIDC, `id-token: write` on `publish` only; test asserts all three |
| prd/OC-002 | Publish only by CI | Yes | Workflow-only publish, docs forbid manual publishing, no token in secrets; npm-side token restriction not documented (CR-007) |
| prd/OC-003 | Never unpublish | Yes | `docs/versioning.md` l.77-84 |
| CPSE TICKET-004 SEC-001/SEC-003 | No smoke, e2e or `playwright install` in the job with `id-token` | Partial | Kept out of `publish` (test asserts it), but `npm install` of the published package in `publish` runs registry lifecycle scripts (CR-005) |
| CPSE TICKET-001 SEC-006 | `id-token` only on publish; read-only default token | Yes | Top-level `contents: read`; default repo permission read. `main` protection is a user step, recorded, not done |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-016 | npm trusted publishing, `0.x` until 1.0.0 | Yes | OIDC publish, npm pinned 11.21.1 (>= 11.5.1), docs state the 0.x rule and refuse an early 1.0.0 |
| TQ-006 | 0.x breaking changes in a minor | Yes | `docs/versioning.md` table |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| CPSE-REQ-042 | `@spec CPSE-REQ-042` | `docs/versioning.md` | No (documentation; delivery notes it is covered by tests, but neither test file carries 042/043) |
| CPSE-REQ-043 | `@spec CPSE-REQ-043` | `docs/versioning.md` | No (same) |
| CPSE-NFR-008 | `@spec CPSE-NFR-008` | `tests/package/release-config.test.ts` describe block | Yes |
| CPSE-REQ-041 | `@spec CPSE-REQ-041` | `scripts/group-changelog.ts:groupNewestSection`, `.changeset/changelog.cjs`, both tests | Yes |

**Coverage:** 2 of 4 annotated (a markdown page cannot carry a code annotation; the delivery's mapping table records 042/043 instead)
**Missing:** CPSE-REQ-042/043 have no `@spec` in any file; no test asserts the contract list or the 0.x policy text in `docs/versioning.md`.
**Specification table:** No. `.gener8v/specifications/component-packaging-and-source-export.md` `## @spec Coverage` has no rows for CPSE-REQ-042, CPSE-REQ-043 or CPSE-NFR-008, and the CPSE-REQ-041 row (l.184) does not list `scripts/group-changelog.ts` or the category list (CR-003).

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `npx vitest run --no-cache --maxWorkers=4` (full suite in the worktree) | 0 (94 files, 2,591 tests passed) | Yes |
| `pnpm audit` | 1 | Yes (accepted dev-only advisories) |
| `actionlint .github/workflows/*.yml` | 0 | Yes |
| `tsc --noEmit` (extra) | 0 | n/a |
| version step dry run in a scratch copy; `npm audit signatures` wording; mutants | not re-run (outward-dependent or already covered by the tests); the grouping behavior is covered by `group-changelog.test.ts`, which passed | Not reproduced |

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | Matches the ticket hazard; the gate is tested. |
| DEL-002 | Reasonable | JSON list read by both module systems; test checks every reader agrees. |
| DEL-003 | Reasonable | npm >= 11.5.1 per the cited documentation; explicit `--provenance` fails loudly. Pinned version is not validated against the runner's Node version in the repo. |

Deviations: the version PR opened with `GITHUB_TOKEN` does not start CI; documented in the workflow and record. The record's "text limits" rewording is sound.

## Findings

### CR-001: Provenance attestation check has never run against a real publish

**Severity:** Issue
**Location:** `.github/workflows/release.yml:184-210`
**Traces To:** CPSE-NFR-008, acceptance criterion 3
**Description:** The NFR's verification method is the post-publish attestation check. It exists and its output wording was probed in a scratch project, but no publish has happened (package absent from the registry, repository private, gate off). The record marks it Unverified.
**Impact:** The NFR stays unproven until the first gated publish; a wrong `dist.attestations` expectation would surface only then, after a version is already public and cannot be unpublished.
**Recommendation:** Keep Unverified, and carry it as a Known Hazard to the ticket or step that performs the first publish (verify the job's attestation step on the first release and record the run URL). Consider running the same `npm view` / `npm audit signatures` commands once against a package that already has provenance as a rehearsal.
**Status:** Resolved
**Resolution:** Deferred (Engineer — Thomas Eaves, 2026-11-04) to the first release: the `verify-provenance` job runs at the first gated publish; until then CPSE-NFR-008 is Unverified (Engineer first-release checklist in `docs/versioning.md`).

---

### CR-002: Dry run is unexecuted, and a branch dispatch may not be possible before merge

**Severity:** Issue
**Location:** `.github/workflows/release.yml:13-18, 212-239`
**Traces To:** Acceptance criterion 5
**Description:** The `dry-run` job has not run. GitHub only offers `workflow_dispatch` for a workflow file that exists on the default branch, so the dry run "on a branch" may only be triggerable after this ticket is merged. The dry run also runs `npm publish --dry-run --provenance=false`, so it does not exercise the provenance path.
**Impact:** The criterion is Unverified and its trigger path is unclear; the record's plan to run it "on the ticket branch" may not work.
**Recommendation:** Say in the record that the dry run is triggered after merge (or on a branch once the file is on `main`), run it, and record the run URL; Keep as Unverified until then.
**Status:** Resolved
**Resolution:** Deferred: the `dry-run` job runs once the workflow is on `main` and the Engineer starts it; Unverified until then.

---

### CR-003: Specification `@spec Coverage` table not updated

**Severity:** Issue
**Location:** `.gener8v/specifications/component-packaging-and-source-export.md:184` (`## @spec Coverage`)
**Traces To:** CPSE-REQ-041, CPSE-REQ-042, CPSE-REQ-043, CPSE-NFR-008; Code Review step 8
**Description:** The table has no rows for CPSE-REQ-042/043 (`docs/versioning.md`) or CPSE-NFR-008 (`.github/workflows/release.yml`, `tests/package/release-config.test.ts`), and the CPSE-REQ-041 row omits `scripts/group-changelog.ts` and `scripts/changelog-categories.ts`. Nothing in the code or tests carries `@spec` for 042/043.
**Impact:** Traceability for the contract and the provenance requirement exists only in the delivery record.
**Recommendation:** Add the rows (docs and workflow as locations) and extend the CPSE-REQ-041 row; optionally add a small test over `docs/versioning.md` (five contract items, the 0.x rule) annotated `@spec CPSE-REQ-042, CPSE-REQ-043`.
**Status:** Resolved
**Resolution:** Fixed: coverage rows for CPSE-REQ-042, CPSE-REQ-043 and CPSE-NFR-008 appended; the CPSE-REQ-041 row lists the current changelog files and tests.

---

### CR-004: `checks` job is narrower than the CI suite

**Severity:** Issue
**Location:** `.github/workflows/release.yml:70-133` against `.github/workflows/ci.yml` (`pnpm check:dist`, `check:deps`, `check:images`, `check:changesets`, `bench`)
**Traces To:** Acceptance criterion 1 ("runs the full check suite")
**Description:** The release `checks` job runs lint, typecheck, generated-file freshness, build, test, smoke, e2e, size, publint and attw, but not `check:dist`, `check:deps`, `check:images`, `check:changesets` or `bench`, which CI runs. It also tests Node 22 and React as installed, not the Node 22/24 by React 18/19 matrix.
**Impact:** A tag can publish a build that skipped the dist-integrity, dependency and image-license gates, if a tag is pushed from a commit whose CI was not green.
**Recommendation:** Add the missing commands to `checks` (at minimum `check:dist`, `check:deps`, `check:images`), or require green CI on the tagged commit and say so in the workflow and docs; extend `release-config.test.ts` to pin the chosen list.
**Status:** Resolved
**Resolution:** Fixed with security review SEC-004: `checks` runs what `ci.yml` runs.

---

### CR-005: Post-publish step runs registry install scripts in the job holding `id-token`

**Severity:** Issue
**Location:** `.github/workflows/release.yml:204-210` (`npm install --omit=peer "$name@$version"`)
**Traces To:** CPSE TICKET-004 SEC-001 (no registry code in the job that holds `id-token`), CPSE-NFR-008, prd/OC-002
**Description:** After publishing, the same job installs the published package and its dependencies with `npm install`, which runs dependency lifecycle scripts by default. The job's OIDC request token is available to every step, so a compromised dependency could request a token for the trusted publisher. The same hazard applies, more narrowly, to `pnpm install --frozen-lockfile` before the publish.
**Impact:** A supply-chain compromise of any dependency could publish under the package's identity, defeating the reason the smoke and e2e steps were moved out.
**Recommendation:** Use `npm install --ignore-scripts --omit=peer` (audit signatures needs no scripts), or move the attestation verification to a separate job without `id-token` that `needs: publish`; add a test line for it.
**Status:** Resolved
**Resolution:** Fixed with security review SEC-005: the registry install is in a job with no `id-token`, with `--ignore-scripts`.

---

### CR-006: Tag-triggered publish is not tied to `main` or a protected environment

**Severity:** Observation
**Location:** `.github/workflows/release.yml:10-12, 140`
**Traces To:** prd/OC-002, SEC-006
**Description:** Any `v*` tag whose name equals `v` + the package version publishes, whatever branch the commit is on; there is no GitHub environment with required reviewers. Protection depends on tag rules and on `main` being protected, which is a pending user step.
**Impact:** A write-access user could publish an unmerged commit.
**Recommendation:** Add a step requiring the tagged commit to be reachable from `origin/main`, or put `publish` in a protected environment; list tag protection among the user steps.
**Status:** Resolved
**Resolution:** Fixed with security review SEC-001.

---

### CR-007: Small accuracy gaps in tests, docs and the record

**Severity:** Observation
**Location:** `tests/package/release-config.test.ts` ("has the five jobs"); `docs/versioning.md:52`; `package.json` script `version`; delivery record Pre-Flight
**Traces To:** prd/OC-002; Quality
**Description:** The test is named "five jobs" and asserts four. The docs say nobody publishes by hand but do not name the npm-side setting that makes it true (disallow token publishing for the package). A script named `version` is also an npm lifecycle name, so `npm version` runs it. The record gives a CI run id, not a URL, for the green-`main` evidence.
**Impact:** None on correctness; small clarity and evidence gaps.
**Recommendation:** Rename the test, add the npm setting to the user steps and docs, consider a script name such as `release:version`, and record the run URL.
**Status:** Resolved
**Resolution:** Fixed: the test name lists the five jobs; the docs name npm's "disallow tokens" setting; the script is `release:version`; the record cites a run URL.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Deferred | to the first gated publish | — |
| CR-002 | Deferred | to the first `dry-run` on `main` | — |
| CR-003 | Fixed | coverage rows | `.gener8v/specifications/component-packaging-and-source-export.md` |
| CR-004 | Fixed | with SEC-004 | `.github/workflows/release.yml` |
| CR-005 | Fixed | with SEC-005 | `.github/workflows/release.yml` |
| CR-006 | Fixed | with SEC-001 | `.github/workflows/release.yml` |
| CR-007 | Fixed | names, docs, script | `tests/package/release-config.test.ts`, `docs/versioning.md`, `package.json` |

## Verdict

**Result:** Approved with Notes
**Unresolved Findings:** 0 (CR-001 and CR-002 deferred to the first release; the rest fixed, 2026-11-04)
**Notes:** The two live checks wait for the repository to be public and the workflow on `main`.
