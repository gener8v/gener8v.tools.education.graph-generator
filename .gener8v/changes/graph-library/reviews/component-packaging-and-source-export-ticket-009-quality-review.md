# component-packaging-and-source-export/TICKET-009: Set up the release pipeline with provenance and the versioning policy — Quality Review

## Summary

Reviewed the release workflow, the single changelog-category list and its readers, the changelog regrouping script, the versioning document and the two new test files. The work is well organised and consistent with its neighbours; the main gaps are that the tests read the workflow with regular expressions and miss a few properties that matter for a publish path (the tag's origin, the `publish` job's own checks), plus some duplicated job set-up. 0 Critical, 3 Concerns, 4 Suggestions.

**Files Reviewed:**
- `.github/workflows/release.yml`
- `scripts/changelog-categories.json`
- `scripts/changelog-categories.ts`
- `scripts/group-changelog.ts`
- `scripts/check-changesets.ts`
- `.changeset/changelog.cjs`
- `.changeset/README.md`
- `package.json` (script `version`)
- `docs/versioning.md`
- `CONTRIBUTING.md`
- `tests/package/release-config.test.ts`
- `tests/package/group-changelog.test.ts`

**Findings:** 7
**Critical:** 0 | **Concerns:** 3 | **Suggestions:** 4

## Quality Assessment

### Code Organization

**Rating:** Strong
**Notes:** One category list in JSON, re-exported by a thin TypeScript module and read by `changelog.cjs`, is the right answer to a CommonJS/TypeScript split and closes CPSE TICKET-001 QR-010. `groupNewestSection` is a pure function with the CLI behind an `import.meta.url` guard, matching the neighbouring scripts. Jobs in `release.yml` have clear single purposes (version PR, checks, publish, dry run) and the privilege split (`id-token` only on `publish`) is deliberate. The set-up steps are repeated in four jobs (QR-005).

### Readability

**Rating:** Adequate
**Notes:** Comments in the workflow state the why (SEC references, GitHub token rule). `groupNewestSection` is about 35 lines, but line 28 is a single 170-character condition that takes several reads to parse (QR-004). The test title "has the five jobs" asserts four (QR-006).

### Error Handling

**Rating:** Adequate
**Notes:** `groupNewestSection` fails loudly on an uncategorised entry or a stray line rather than misfiling it, and says which line. The workflow checks tag against `package.json` version and polls for the attestation with a bounded wait. Gaps: `npm view ... 2>/dev/null || true` hides the reason a lookup failed (QR-007), and nothing checks that a tag points at a commit on `main` (QR-001).

### Test Coverage

**Rating:** Adequate
**Notes:** Executed in `/Users/thomas/Repositories/gener8v/gg-cpse-009`: `pnpm lint` exit 0; `pnpm typecheck` exit 0; `npx vitest run --no-cache --maxWorkers=4 tests/package/release-config.test.ts tests/package/group-changelog.test.ts` 2 files, 18 tests passed (the run also triggered the package build); `actionlint .github/workflows/*.yml` exit 0. The full suite was not re-run here (the delivery record reports 2,591 passed). The grouping fixture test is good (order, multi-paragraph entries, older releases byte-identical, idempotence, refusal). The workflow tests are text matches over a comment-stripped file; they cover the main security properties but have blind spots (QR-002, QR-003) and a misleading title (QR-006).

### Observability & Operability

**Rating:** Adequate
**Notes:** The attestation poll logs each attempt and prints the attestation; the version-matching step names both values on failure; `group-changelog` prints a one-line result. The workflow cannot be proven end to end until the first gated publish, which the delivery record states plainly. A failed `npm view` is silent (QR-007).

## Findings

### QR-001: A version tag is not required to point at a commit on `main`

**Category:** Maintainability
**Severity:** Concern
**Location:** `.github/workflows/release.yml:140` (job `publish` condition) and `.github/workflows/release.yml:12`
**Description:** `publish` runs for any pushed `v*` tag whose name matches `package.json` at the tagged commit. Nothing checks that the tagged commit is reachable from `main`, so a tag pushed from an unreviewed branch (by anyone with push access) would build, pass the checks and publish from that branch's source. The provenance attestation would honestly describe that run, but the version policy in `docs/versioning.md` (merge the version pull request, then tag) is not enforced.
**Impact:** The release path's integrity rests on convention; the hazard grows once `NPM_PUBLISH_ENABLED` is on and the trusted publisher accepts this workflow. The ticket's own guard list (SEC-006) assumes only reviewed code is published.
**Recommendation:** In `publish` (or `checks`) add a step after checkout with `fetch-depth: 0` that fails unless `git merge-base --is-ancestor "$GITHUB_SHA" origin/main`, and add a test line for it. Alternatively document a tag-protection rule as a required Engineer step and test the step's presence.
**Status:** Resolved
**Resolution:** Fixed with security review SEC-001: the tag must be on `main`.

---

### QR-002: Tests do not prove `publish` runs the same checked commit, nor that the dry run cannot publish or get `id-token`

**Category:** Testing
**Severity:** Concern
**Location:** `tests/package/release-config.test.ts:88-91`, `tests/package/release-config.test.ts:40-47`
**Description:** The dry-run test asserts only the presence of `npm publish --dry-run --provenance=false`; it does not assert that no job other than `publish` runs `npm publish` without `--dry-run` (the `--provenance` check at line 37 would not catch a bare `npm publish` in `dry-run` or `checks`). The `version-pr` check excludes `npm publish` but `checks` and `dry-run` do not get that exclusion. Also, `checks` is `if:`-gated on a tag or `workflow_dispatch`, and nothing asserts that `dry-run` cannot run on a tag.
**Impact:** A future edit that adds a plain `npm publish` to `checks` or `dry-run` (no provenance, ungated by `NPM_PUBLISH_ENABLED`) would pass this suite, yet it is exactly the class of mistake the suite exists to catch.
**Recommendation:** Assert across all of `code` that every `npm publish` line either sits in `publish` or contains `--dry-run`: `[...code.matchAll(/npm publish[^\n]*/g)]` each must match `--dry-run` unless inside `job("publish")`. Assert `job("dry-run")` has no `refs/tags` and `id-token`-free (already) permissions.
**Status:** Resolved
**Resolution:** Fixed: a test collects every `npm publish` in every job and allows exactly the publish job's and the dry run's `--dry-run` one. Mutant → fails.

---

### QR-003: Workflow tests are text matches on a hand-parsed YAML layout, with no failing-case self-check

**Category:** Testing
**Severity:** Concern
**Location:** `tests/package/release-config.test.ts:9-26`
**Description:** The file splits jobs with `/^ {2}([\w-]+):$/gm` inside the text after `\njobs:\n`, and strips only whole-line comments. A job key with a trailing comment, quoted keys, a changed indent, or a multi-line `run: |` block containing a line shaped `  foo:` would silently change what `job(name)` returns, and assertions like `not.toMatch(/id-token/)` would then pass on the wrong text. The comment says `yaml` is not a dependency, and `actionlint` is not run in CI or any package script (it was run by hand for the delivery). The test "has the five jobs" is the only guard on the parse.
**Impact:** The suite protects security properties (no token, `id-token` scope); a parser that fails open turns a refactor into a silent loss of that protection.
**Recommendation:** Either parse with a YAML library (add `yaml` as a dev dependency, a small change) or add a guard that the parse is sane: each job text contains its `runs-on:` and `steps:`, and the sum of job text lengths accounts for the whole `jobs:` block. Consider running `actionlint` in `ci.yml`, since it is not run there today.
**Status:** Resolved
**Resolution:** Fixed: `release-config.test.ts` parses the workflows and the setup action with `yaml` (a new dev dependency, approved); `ci.yml` gains an `actionlint` job running `rhysd/actionlint` 1.7.12 pinned by image digest (chosen over a wrapper action that downloads an unchecked binary).

---

### QR-004: One 170-character loop condition in `groupNewestSection`

**Category:** Readability
**Severity:** Suggestion
**Location:** `scripts/group-changelog.ts:28`
**Description:** The `while` condition combines "next line is indented" with "next line is blank and the one after is indented" in one expression plus the bounds checks, on a single line. It is correct (the fixture covers a blank line inside an entry) but it must be re-read to verify.
**Impact:** The entry-continuation rule is the part of this script most likely to need a change when Changesets output varies; it is the least approachable line.
**Recommendation:** Extract `const continues = (i: number): boolean => ...` with a short comment, so the loop reads `while (continues(i + 1)) entry.push(at(++i));`.
**Status:** Resolved
**Resolution:** Fixed: `scripts/group-changelog.ts` reads its loop through `indented` and `continues` helpers; behaviour unchanged (its test passes).

---

### QR-005: Job set-up repeated four times in `release.yml`

**Category:** DRY
**Severity:** Suggestion
**Location:** `.github/workflows/release.yml:41-55`, `76-89`, `147-167`, `220-233`
**Description:** Checkout, pnpm install, setup-node and `pnpm install --frozen-lockfile` (with the same three SHA pins and the pnpm version `10.28.2`) are copied into every job. A bump of one pin or the pnpm version must be made four times, and `ci.yml` holds a fifth copy.
**Impact:** Dependabot opens one change per file, but a manual edit that misses one job leaves the publish job on a different pnpm or Node setup than the one `checks` validated.
**Recommendation:** A local composite action (`.github/actions/setup/action.yml`) used by all jobs and `ci.yml`, or accept the copies and keep the existing pin test, adding a test that all jobs use the same pnpm version string.
**Status:** Resolved
**Resolution:** Fixed: `.github/actions/setup/action.yml` (pnpm, setup-node, install, a required `cache` input) is used by every job in `release.yml`, `ci.yml` and `docs.yml` except `verify-provenance`; Dependabot watches it.

---

### QR-006: Test title says "five jobs" and asserts four

**Category:** Naming
**Severity:** Suggestion
**Location:** `tests/package/release-config.test.ts:30`
**Description:** `it("has the five jobs", ...)` expects `["checks", "dry-run", "publish", "version-pr"]`. The name is stale.
**Impact:** A misleading test name sends the reader looking for a fifth job when the test fails.
**Recommendation:** Rename to "has exactly the four jobs" (or "has the version-pr, checks, publish and dry-run jobs").
**Status:** Resolved
**Resolution:** Fixed with code review CR-007.

---

### QR-007: The attestation poll hides why a registry lookup failed

**Category:** Observability
**Severity:** Suggestion
**Location:** `.github/workflows/release.yml:190`
**Description:** `npm view ... 2>/dev/null || true` discards both stderr and the exit status, so an authentication error, a network failure, or a wrong package name all read as "No attestation on the registry yet" for the full 150 seconds and then "The registry has no provenance attestation".
**Impact:** The first real publish is the only time this step runs; if it fails, the operator has to rerun with edits to learn why.
**Recommendation:** Keep stderr (redirect it to a file and print it with the last failed attempt) and print the exit status when the final attempt fails.
**Status:** Resolved
**Resolution:** Fixed with security review SEC-005: the lookup shows npm's error and exit status; no `|| true`.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fixed | with SEC-001 | `.github/workflows/release.yml` |
| QR-002 | Fixed | `npm publish` only where intended | `tests/package/release-config.test.ts` |
| QR-003 | Fixed | YAML-parsed tests; actionlint in CI | `tests/package/release-config.test.ts`, `.github/workflows/ci.yml`, `package.json` |
| QR-004 | Fixed | loop helpers | `scripts/group-changelog.ts` |
| QR-005 | Fixed | shared setup action | `.github/actions/setup/action.yml`, workflows, `.github/dependabot.yml` |
| QR-006 | Fixed | with CR-007 | `tests/package/release-config.test.ts` |
| QR-007 | Fixed | with SEC-005 | `.github/workflows/release.yml` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (all seven fixed, 2026-11-04)
**Notes:** All findings fixed in resolution and re-verified.
