# TICKET-009: Set up the release pipeline with provenance and the versioning policy

**Change:** graph-library
**Capability Area:** Component Packaging & Source Export (component-packaging-and-source-export)
**Specification:** specifications/component-packaging-and-source-export.md

**Summary:** Add the release workflow — Changesets version pull requests and npm trusted publishing with provenance from version tags — and document the 0.x versioning policy and the public contract it protects.
**Priority:** Must
**Value:** Every published version is built by CI from public source, carries provenance, and follows a written compatibility promise.

**Requirements Covered:**
- CPSE-REQ-042: Semantic versioning treating the description, vocabulary, issue codes, tool definition and component inputs as the public contract
- CPSE-REQ-043: A change that invalidates or changes the meaning of a valid description ships only in a new major version
- CPSE-NFR-008: Published releases carry npm provenance linking them to the public repository build — verified by the release workflow's provenance attestation, checked after publishing

**Prior Art:**
- Read: TICKET-001 output — `package.json`, `.changeset/config.json`, `.github/workflows/ci.yml`
- Read: `.gener8v/technical-design/system-design.md` — AD-016 (trusted publishing, 0.x until 1.0.0), TQ-001, TQ-006
- Read: `.gener8v/constraints/prd.md` — prd/IC-003, prd/OC-002 (CI-only publishing), prd/OC-003 (never unpublish)
- Read: `.gener8v/dependencies/dependency-map.md` — EXT-002, EXT-003, EXT-005, RD-005

**Acceptance Criteria:**
- [ ] `.github/workflows/release.yml` opens a Changesets version pull request on main and, on a version tag, builds, runs the full check suite and publishes with `--provenance` using npm trusted publishing (OIDC), with no long-lived npm token in repository secrets
- [ ] Publishing can happen only from that workflow; `docs/versioning.md` states manual publishing is not allowed and published versions are deprecated, never unpublished (prd/OC-002, prd/OC-003)
- [ ] After a publish, the workflow (or a documented post-publish check) confirms the provenance attestation is present on the registry (CPSE-NFR-008)
- [ ] `docs/versioning.md` lists the public contract (unified description, vocabulary, issue codes, tool definition, component inputs) and states the policy: releases start at `0.x`, where a breaking change to the contract ships in a new minor version, and from `1.0.0` only in a new major version
- [ ] A dry-run of the workflow on a branch succeeds without publishing

**Output:**
- `.github/workflows/release.yml`
- `docs/versioning.md`
- `tests/package/release-config.test.ts` — asserts the workflow uses `--provenance`, OIDC permissions (`id-token: write`) and no npm token secret

**Constraints:** prd/IC-003, prd/OC-002, prd/OC-003

**Known Hazards:**
- AD-016 and TQ-006 supersede a literal reading of CPSE-REQ-043 during `0.x`: breaking changes go in a minor release until `1.0.0`, per semantic versioning's initial-development rule. Document it in `docs/versioning.md` and the delivery record; do NOT bump to `1.0.0` to satisfy the requirement literally.
- Trusted publishing requires the npm package (and scope organization) to exist and be configured for this repository (EXT-002, TQ-001). If the name or organization is not ready, deliver the workflow with publishing gated off and say so — never publish a placeholder.
- Carried from graph-library/component-packaging-and-source-export-ticket-001-code-review/CR-005: the public GitHub repository `gener8v/gener8v.tools.education.graph-generator` does not exist yet, so the CI matrix has never run and TICKET-001's acceptance criterion 7 is Unverified. Create the repository and get a green pull-request run across Node.js 22/24 × React 18/19 BEFORE wiring the release workflow; record the run URL in this delivery. Do not publish from a repository whose CI has never passed.
- Carried from graph-library/component-packaging-and-source-export-ticket-001-code-review/CR-003: `CHANGELOG.md` entries are labelled by category (`**Added:**` …) but Changesets groups them by semver bump, so TICKET-001's criterion "grouped as added / changed / deprecated / removed" is only Partial. Add a version step (e.g. `changeset version && tsx scripts/group-changelog.ts`) that regroups the newest release under `### Added`, `### Changed`, `### Deprecated`, `### Removed`, `### Fixed`, with a test over a fixture changelog.

**Depends On:** TICKET-001
**Blocks:** None

**Size:** Small
