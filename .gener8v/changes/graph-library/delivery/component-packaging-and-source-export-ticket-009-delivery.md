# TICKET-009: Set up the release pipeline with provenance and the versioning policy — Delivery Record

## Ticket Reference

**Ticket:** graph-library/component-packaging-and-source-export/TICKET-009
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/component-packaging-and-source-export.md`
**Requirements Covered:**
- CPSE-REQ-042: Semantic versioning treating the description, vocabulary, issue codes, tool definition and component inputs as the public contract
- CPSE-REQ-043: A change that invalidates or changes the meaning of a valid description ships only in a new major version
- CPSE-NFR-008: Published releases carry npm provenance linking them to the public repository build — verified by the release workflow's provenance attestation, checked after publishing

## Pre-Flight Reconciliation

**Verdict:** Go, with publishing gated off (ticket hazard: "If the name or organization is not ready, deliver the workflow with publishing gated off and say so — never publish a placeholder")

| Assumption (from ticket) | Expected | Found in repo / registry (2026-11-04) | Status |
|--------------------------|----------|---------------------------------------|--------|
| Predecessor TICKET-001 delivered | `package.json`, `.changeset/config.json`, `ci.yml` | present; `version` `0.0.0`; Changesets `access: public`, base `main` | ✅ |
| CI green on `main` | a run URL | green runs on `main` (e.g. 41872767115 at `acdcdc8`; the latest push's run is in progress) | ✅ — URL recorded at delivery |
| npm scope organization `gener8v` | exists, configured | `npm org ls gener8v` lists `gener8v-thomas - owner` | ✅ the organization exists |
| Package `@gener8v/graph-generator` | exists for trusted publishing | **not on the registry** (404) | ⚠️ npm trusted publishing is configured per package; the first version cannot be published by OIDC until the package exists — a user decision |
| Public repository (provenance) | public | **private** | ⚠️ provenance needs a public repository — a user action |
| `main` protected (SEC-006) | required checks, no force push | **not protected** (API 404) | ⚠️ a user action (repository settings) |
| Default `GITHUB_TOKEN` permission read-only (SEC-006) | read | `default_workflow_permissions: read` | ✅ |
| Changelog categories in one place (QR-010) | one module | `scripts/check-changesets.ts` `CATEGORIES`, `.changeset/changelog.cjs` regex, `.changeset/README.md` | 🔁 Carried — in the plan |
| Version step regenerates `src/generated/version.ts` (CPSE TICKET-005 hazard) | after `changeset version` | not wired | 🔁 Carried — in the plan |
| Smoke and e2e kept out of the publish job (CPSE TICKET-004 SEC-001, SEC-003) | separate job | — | 🔁 Carried — in the plan |
| Docs site first deploy (CPSE TICKET-008 CR-001) | after the repository is public | — | 🔁 Carried — user action, then verify |

**Resolved from ground truth (not escalated):** the npm organization exists and the token permission is already read-only.

**Blocking findings:** None for building the workflow, the policy and the tests with publishing gated off. A live publish needs the repository public, `main` protected, and the package's first publish and trusted-publisher setup.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-11-04
**Implemented by:** sonnet · medium — routed as deliver-small from Tower

Starts after CPSE TICKET-008 is on `main` (both add files under `docs/`).

### Planned Files

- `.github/workflows/release.yml`: on push to `main`, `changesets/action` opens or updates the version pull request, whose version step is `changeset version && tsx scripts/group-changelog.ts && pnpm generate` (regroups the changelog, refreshes `src/generated/version.ts`). On a `v*` tag: job `checks` (no `id-token`, no secrets) runs the full suite with smoke, e2e and `playwright install`; job `publish` (`needs: checks`; `id-token: write`, `contents: read`) builds and runs `npm publish --provenance --access public` by OIDC trusted publishing, with no `NPM_TOKEN`, then confirms the attestation with `npm view @gener8v/graph-generator@<version> --json` and `npm audit signatures` (CPSE-NFR-008). `publish` runs only when `vars.NPM_PUBLISH_ENABLED == 'true'`. A `workflow_dispatch` dry run does everything up to `npm publish --dry-run`.
- `scripts/changelog-categories.ts`: the one category list (CPSE TICKET-001 QR-010); `scripts/check-changesets.ts`, `.changeset/changelog.cjs` and `.changeset/README.md` read or cite it.
- `scripts/group-changelog.ts`: regroups the newest release under `### Added`, `### Changed`, `### Deprecated`, `### Removed`, `### Fixed` (CPSE TICKET-001 CR-003), with a fixture test.
- `docs/versioning.md`: the public contract; the `0.x` policy (a breaking change ships in a minor release until `1.0.0`; the GSV-REQ-052/053 text limits as the worked example); CI-only publishing; deprecate, never unpublish.
- `tests/package/release-config.test.ts`: `--provenance`; `id-token: write` only on `publish`; no `NPM_TOKEN` secret; smoke and e2e not in the publish job; the gate present; the changelog-grouping fixture test.

User steps (when ready; the main session guides and verifies): make the repository public; protect `main` (required CI checks, no force push); enable Pages and set `PAGES_ENABLED`; publish the package's first version and add the trusted publisher on npm; set `NPM_PUBLISH_ENABLED`.

### How Acceptance Criteria Will Be Met

- `release.yml` opens the version pull request and publishes with `--provenance` by OIDC from tags, with no long-lived token: the workflow; `release-config.test.ts`.
- Publishing only from that workflow; `docs/versioning.md` forbids manual publishing and unpublishing: the document; the test.
- Provenance confirmed after publishing (CPSE-NFR-008): the post-publish step — Unverified until the first gated publish runs.
- `docs/versioning.md` lists the contract and the `0.x` policy: the document.
- A dry run on a branch succeeds without publishing: a `workflow_dispatch` run on the ticket branch.

## Progress

- [x] `.github/workflows/release.yml`
- [x] `scripts/changelog-categories.ts` (and its readers)
- [x] `scripts/group-changelog.ts`
- [x] `docs/versioning.md`
- [x] `tests/package/release-config.test.ts`

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `.github/workflows/release.yml`: jobs `version-pr` (push to `main`; `contents: write`, `pull-requests: write`; `changesets/action` v2.1.2 pinned to `ae32849d5ba541f9ae29e40e22a623bc13562f51`, version only), `checks` (tags; no `id-token`, no secrets; the full suite with smoke, e2e and `playwright install`), `publish` (`needs: checks`; `id-token: write`, `contents: read`; gated on `vars.NPM_PUBLISH_ENABLED`; tag must equal `v` + the version; npm 11.21.1; `npm publish --provenance --access public` by OIDC; then `dist.attestations` polled and `npm audit signatures` must report a verified attestation) and `dry-run` (`workflow_dispatch`; `npm publish --dry-run`, no `id-token`). Top-level permissions `contents: read`; no npm token anywhere.
- `package.json`: script `version` = `changeset version && tsx scripts/group-changelog.ts && pnpm generate`.
- `scripts/changelog-categories.json` (the one list) and `scripts/changelog-categories.ts`; `scripts/check-changesets.ts` and `.changeset/changelog.cjs` read it; `.changeset/README.md` names it.
- `scripts/group-changelog.ts`: regroups the newest release under `### Added` … `### Fixed`, older releases untouched, idempotent.
- `docs/versioning.md`; `CONTRIBUTING.md` "Releasing".
- `tests/package/release-config.test.ts`, `tests/package/group-changelog.test.ts`.

## Verification Run

| Command | Exit | Evidence |
|---------|------|----------|
| full verification loop in the worktree, rebased onto `main` ae080b0 | 0 | vitest 2,591 passed (after the fix below; first run 1 failed ×3: `docs/versioning.md` typed the text limits, caught by CPSE TICKET-008's limits test, reworded); bench 25 passed |
| `pnpm audit` | 1 | the accepted dev-only `minimatch` and `glob` advisories (CPSE TICKET-004 SEC-002, TICKET-008 SEC-003) |
| `actionlint .github/workflows/*.yml` | 0 | — |
| version step dry run in a scratch git copy (`pnpm run version`) | 0 | 0.0.0 → 0.1.0; `src/generated/version.ts` "0.1.0"; `## 0.1.0` with `### Added` (8), `### Changed` (3), `### Fixed` (4); all changesets consumed |
| `npm audit signatures` wording (scratch project with `@changesets/cli`) | 0 | "N packages have verified attestations" — the publish job's match holds |
| mutants (implementer, each restored): `id-token: write` in `checks`; `--provenance` removed; reversed group order | — | the matching test fails each time |

## Acceptance Criteria Verification

- [x] `release.yml` opens a Changesets version pull request on `main` and, on a version tag, builds, runs the full suite and publishes with `--provenance` by OIDC, with no long-lived token — the workflow; `release-config.test.ts`; `actionlint`.
- [x] Publishing only from that workflow; `docs/versioning.md` forbids manual publishing and unpublishing — the document; `release-config.test.ts` (no token, gate, `id-token` only on `publish`).
- [ ] CPSE-NFR-008: the attestation confirmed after a publish — **Unverified**: the post-publish step exists and its match was checked against real `npm audit signatures` output; it runs at the first gated publish.
- [x] `docs/versioning.md` lists the public contract and the `0.x` policy, with the text limits as the worked example — the document.
- [ ] A dry run on a branch succeeds without publishing — **Unverified**: the `dry-run` job runs on `workflow_dispatch` once the workflow is on GitHub; triggering a workflow is an outward action left to the Engineer (or the main session with approval).

## Decisions Made

### DEL-001: Publishing gated on `vars.NPM_PUBLISH_ENABLED`

**Context:** The package is not on the registry and the repository is private; trusted publishing and provenance need both.
**Decision:** The `publish` job runs only when the variable is `true`; until then a tag builds and checks but publishes nothing.
**Rationale:** The ticket's hazard — deliver gated off, never publish a placeholder. Approved with the plan.
**Ticket Impact:** CPSE-NFR-008 waits for the first publish.

### DEL-002: One JSON list for the changelog categories

**Context:** `.changeset/changelog.cjs` is CommonJS and cannot import TypeScript.
**Decision:** `scripts/changelog-categories.json` is the list; the TypeScript module re-exports it and `changelog.cjs` requires it; a test checks every reader agrees.
**Rationale:** One source of truth (CPSE TICKET-001 QR-010) that both module systems can read.
**Ticket Impact:** None.

### DEL-003: npm 11.21.1 in the publish job; `--provenance` kept

**Context:** npm's trusted-publishing documentation (https://docs.npmjs.com/trusted-publishers) requires npm 11.5.1 or later and says provenance is automatic under trusted publishing.
**Decision:** Install npm 11.21.1 (the latest 11.x) and keep `--provenance` explicit.
**Rationale:** The flag documents intent and fails loudly if the setup ever stops being trusted publishing.
**Ticket Impact:** None.

## Deviations from Plan

- `docs/versioning.md` names no limit values; it points to the vocabulary page (CPSE TICKET-008's rule against hand-typed limits).
- The version pull request is opened with `GITHUB_TOKEN`, so CI does not start on it by itself (a GitHub rule); the workflow comment says so, and the release checks run again on the tag.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| CPSE-REQ-042, CPSE-REQ-043 | `docs/versioning.md`; `scripts/group-changelog.ts` | documentation and release tooling; verified by `tests/package/release-config.test.ts` and `group-changelog.test.ts` |

CPSE-NFR-008 is verified by the workflow's post-publish step, not annotated in code.

## Notes

- Implemented by sonnet · medium in a worktree (`../gg-cpse-009`) from `main` (98562d2), rebased onto ae080b0.
- Engineer steps before the first release: make the repository public; protect `main` (required CI checks, no force push); enable Pages and set `PAGES_ENABLED` (CPSE TICKET-008 CR-001); publish the first version and add the trusted publisher on npm; set `NPM_PUBLISH_ENABLED`; run the `dry-run` job once.

## Post-Review Amendments

None
