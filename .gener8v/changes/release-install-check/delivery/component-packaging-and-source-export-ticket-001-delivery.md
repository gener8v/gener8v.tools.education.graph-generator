# TICKET-001: Check the published package after every release — Delivery Record

## Ticket Reference

**Ticket:** release-install-check/component-packaging-and-source-export/TICKET-001
**Change:** `.gener8v/changes/release-install-check/change.md` — Approved (Product Owner — Thomas Eaves, 2026-11-05) when delivery started
**Specification:** `.gener8v/specifications/component-packaging-and-source-export.md`
**Requirements Covered:**
- CPSE-REQ-047: install the exact published version from the registry into an empty project
- CPSE-REQ-048: verify registry signatures and provenance attestations of the installed packages
- CPSE-REQ-049: run the installed export command on a sample and confirm the component file is written
- CPSE-REQ-050: import every public entry point of the installed package
- CPSE-REQ-051: fail the release run, naming the version and the failed step
- CPSE-REQ-052: retry while the version is not yet installable, for at most 10 minutes

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| `release.yml` has `publish` and `verify-provenance` jobs | present | present; `verify-provenance` `needs: publish`, `permissions: contents: read`, no checkout, direct `actions/setup-node` | ✅ |
| Tag-to-version derivation and retry pattern to reuse | present | `version="${GITHUB_REF_NAME#v}"`; 10 × 15 s `npm view` loop in `verify-provenance` | ✅ |
| `tests/package/release-config.test.ts` asserts the job set | five jobs | asserts the sorted set and `toHaveLength(5)`; also that only `verify-provenance` calls `actions/setup-node` directly, and the no-cache rule for credential jobs | ✅ — three assertions to update |
| `tests/smoke/run.ts`, `tests/smoke/render.mjs` (CPSE-NFR-003) | present | present. `render.mjs` takes an examples dir and the expected exports keys, imports every JS and JSON entry and server-renders every example; it needs only Node and React. `run.ts` is TypeScript (needs tsx) and packs the local build | ✅ — `render.mjs` and the `react19` template (exact React 19, lockfile with integrity hashes) are reusable as is |
| `package.json` `exports`, `bin`; `examples/circle.json` | present | 19 export keys; `bin.graph-generator` `./dist/cli.js`; examples present | ✅ |
| Published 0.1.0 exists to test against | on npm | `@gener8v/graph-generator@0.1.0` on the registry with SLSA provenance | ✅ |
| AD-016, prd/OC-002, prd/OC-003; `docs/versioning.md` release steps | present | present; versioning.md "How a release is made" has six steps | ✅ |
| Predecessor reviews on `release.yml` (graph-library CPSE TICKET-009) | read | SEC-001/002/005/006, QR-002/003/005 and CR-004..007 are encoded as assertions in `release-config.test.ts`; none deferred to this change | ✅ — the new job must keep them: no secrets, no cache, actions pinned by SHA, no `${{ }}` in run scripts |
| Lint covers `.mjs` under `tests/` | yes | `eslint.config` script extensions include `mjs` | ✅ |

**Resolved from ground truth (not escalated):** The ticket's Known Hazard on duplicating `npm audit signatures`: `verify-provenance` installs with `--omit=peer` (no React) and must keep its checks for CPSE-NFR-008; the new job installs React too, so running `npm audit signatures` there covers every installed package (CPSE-REQ-048) without moving anything out of `verify-provenance`. The ticket's "suggested script location" is settled by the existing smoke directory: `tests/smoke/`.

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-11-05
**Implemented by:** sonnet · medium — routed as deliver-small from Tower

### Planned Files

- `tests/smoke/published.mjs` (new): `node tests/smoke/published.mjs <version>`. Plain Node, no repository dependencies. Refuses a version that is not strict semver (exit 2). In a fresh temporary directory: copies the `react19` smoke template (exact React 19 from its lockfile) and `render.mjs`; `npm ci --ignore-scripts`; installs `@gener8v/graph-generator@<exact version>` with `--ignore-scripts`, retrying every 15 s for at most 10 minutes; runs `npm audit signatures` and requires a verified attestation; runs `npx --no-install @gener8v/graph-generator export examples/circle.json --out <tmp>/CircleGraph.tsx` and checks the file is non-empty and exports a component; runs `render.mjs` with the export keys read from the installed `package.json` (imports every entry, parses the JSON ones, server-renders every example). Each failure prints `@gener8v/graph-generator@<v>: <step> failed: …` and exits 1.
- `package.json`: script `test:published`, so `pnpm test:published 0.1.0` runs it locally.
- `.github/workflows/release.yml`: new job `install-check` — `needs: verify-provenance`, `permissions: contents: read` only, checkout at the tag with no credentials, `actions/setup-node` Node 22 with no cache, runs `node tests/smoke/published.mjs "${GITHUB_REF_NAME#v}"`. `verify-provenance` unchanged.
- `tests/package/release-config.test.ts`: six jobs; the new job's needs, permissions, no cache and no secrets; `actions/setup-node` allowed there; asserts the script installs the exact version with `--ignore-scripts` and caps retries at 10 minutes. Plus a small test that runs the script with no or an invalid version and expects exit 2.
- `docs/versioning.md`: release step 7 describing the check.

### How Acceptance Criteria Will Be Met

- New job after `verify-provenance`, contents: read only: `release.yml` job; asserted in `release-config.test.ts`.
- Exact version plus React into a fresh directory, scripts disabled: `published.mjs`; asserted by the script-content test and the real run against 0.1.0.
- Retry ≤ 10 minutes, then fail naming the version: `published.mjs` retry loop; asserted by the script-content test.
- `npm audit signatures` with a verified attestation: `published.mjs`; proven by the real run against 0.1.0.
- Export command writes a non-empty `.tsx`: `published.mjs`; proven by the real run.
- Every entry point imported, list from the installed `package.json`: `published.mjs` → `render.mjs`; proven by the real run.
- Failures name version and step: `published.mjs` message format; asserted by the invalid-version test and by reading the failure path.
- `release-config.test.ts` updated, actionlint passes: `pnpm test`, actionlint run.
- `docs/versioning.md` describes the job: docs tests (`tests/docs`).
- Exercised for real against 0.1.0: `pnpm test:published 0.1.0`, result recorded in the Verification Run.

## Progress

- [x] `tests/smoke/published.mjs`
- [x] `package.json`
- [x] `.github/workflows/release.yml`
- [x] `tests/package/release-config.test.ts`
- [x] `docs/versioning.md`

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `tests/smoke/published.mjs`: new. `node tests/smoke/published.mjs <version>` checks a published version as a user gets it from npm: React 19 from the smoke template's lockfile, the exact version with no scripts (retrying every 15 s for at most 10 minutes), `npm audit signatures` with a verified attestation, the installed `export` command on `examples/circle.json`, and `render.mjs` over every entry point named in the installed `package.json`. Exits 1 naming the version and the failed step; 2 on a bad argument.
- `package.json`: script `test:published`.
- `.github/workflows/release.yml`: job `install-check` after `verify-provenance` (contents: read, checkout of the tag with no credentials, setup-node 22 with no cache); header comment updated.
- `tests/package/release-config.test.ts`: six jobs; the new job's needs, permissions, no cache, setup-node; a test of the job's command and the script's text; a test that runs the script with no, an injected and a `latest` argument and expects exit 2.
- `docs/versioning.md`: release step 7 and `pnpm test:published <version>`; step 6 now "Another job".

## Verification Run

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm lint` | 0 | — |
| `pnpm typecheck` | 0 | — |
| `pnpm test` (first run) | 1 | 1 failed of 2602: `tests/docs/page-samples.test.ts` flagged "up to 10" in `docs/versioning.md` as a hand-typed limit; reworded |
| `pnpm vitest run tests/docs tests/package` | 0 | 274 passed |
| `pnpm test` | 0 | 94 files, 2602 passed |
| `pnpm lint` (after the reword) | 0 | — |
| `docker run rhysd/actionlint:latest -color` | 0 | no findings |
| `pnpm test:published 0.1.0` | 0 | against the real registry: "@gener8v/graph-generator@0.1.0 passed every check: it installs from the registry, its signatures verify, the export command works and every entry point imports and renders." |
| `pnpm test:published 0.0.1-nope` | 1 | a version that does not exist: retried for the full 10 minutes (the run outlasted a 600 s tool timeout), then failed on `install from the registry` with npm's `notarget` |

## Acceptance Criteria Verification

- [x] New job `needs: verify-provenance`, runs only after a publish, `permissions: contents: read` only — `release-config.test.ts` (permissions and needs assertions); it runs only after a publish because `verify-provenance` needs `publish`
- [x] Installs the exact version plus React and React DOM into a fresh directory from the public registry, scripts disabled — script-text test in `release-config.test.ts`; `pnpm test:published 0.1.0`
- [x] Retries while not available, at most 10 minutes, then fails naming the version — script-text test (600_000 deadline); `pnpm test:published 0.0.1-nope` exit 1 after the deadline
- [x] `npm audit signatures` must report a verified attestation — `pnpm test:published 0.1.0`
- [x] `npx @gener8v/graph-generator export` exits 0 and writes a non-empty `.tsx` that exports a component — `pnpm test:published 0.1.0`
- [x] Every JS entry imported and JSON entry parsed, the list read from the installed `package.json` — `pnpm test:published 0.1.0` (render.mjs over the installed exports keys)
- [x] Each failing step prints the version and the check — `pnpm test:published 0.0.1-nope` (exit 1, `install from the registry`); the exit-2 tests cover the argument path
- [x] `release-config.test.ts` asserts the new job and passes; actionlint passes — `pnpm test`, actionlint
- [x] `docs/versioning.md` describes the job — `docs/versioning.md` step 7; docs tests pass
- [x] Exercised for real against 0.1.0 — `pnpm test:published 0.1.0`, exit 0

## Decisions Made

### DEL-001: Keep `verify-provenance` as it is and check signatures again in the new job

**Context:** The ticket's Known Hazard: `verify-provenance` already installs the version (with `--omit=peer`) and runs `npm audit signatures`.
**Decision:** Leave `verify-provenance` unchanged and run `npm audit signatures` again in `install-check`, where React is installed too.
**Rationale:** CPSE-NFR-008's checks stay where the tests expect them, and CPSE-REQ-048 covers every installed package, React included. The repeat costs seconds.
**Ticket Impact:** None beyond the ticket.

### DEL-002: Reuse the react19 smoke template and `render.mjs`

**Context:** The pre-publish smoke check already imports every entry and renders every example in a fresh React project.
**Decision:** The new script copies `tests/smoke/react19/` and `tests/smoke/render.mjs` and passes `render.mjs` the exports keys read from the installed `package.json`.
**Rationale:** One way to import and render; React comes from a lockfile with integrity hashes. The post-publish check also renders every example, more than CPSE-REQ-050 asks.
**Ticket Impact:** The job checks out the tag, so the script, template and examples are the release's own.

### DEL-003: A plain Node script, not TypeScript

**Context:** `run.ts` needs tsx and the repository's dependencies.
**Decision:** `published.mjs` uses node: built-ins only, so the job needs `actions/setup-node` and no `pnpm install`.
**Rationale:** Fewer moving parts in a job that runs after the publish; the release-config test now allows setup-node in this job and `verify-provenance` only.
**Ticket Impact:** None.

## Deviations from Plan

- `docs/versioning.md`: the planned wording "waits up to 10 minutes" failed the docs limits test, which reads "up to <number>" as a hand-typed limit. Reworded to "it keeps trying for 10 minutes". Step 6 changed from "A final job" to "Another job", since step 7 now follows it.
- `release-config.test.ts`: the first test's title now names `install-check`; one comment adjusted. No impact.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| CPSE-REQ-047 | `tests/smoke/published.mjs`:installFromRegistry | `@spec CPSE-REQ-047, CPSE-REQ-052` |
| CPSE-REQ-048 | `tests/smoke/published.mjs`:verifySignatures | `@spec CPSE-REQ-048` |
| CPSE-REQ-049 | `tests/smoke/published.mjs`:runExport | `@spec CPSE-REQ-049` |
| CPSE-REQ-050 | `tests/smoke/published.mjs`:importEntryPoints | `@spec CPSE-REQ-050` |
| CPSE-REQ-051 | `tests/smoke/published.mjs`:main; `tests/package/release-config.test.ts` (argument tests) | `@spec CPSE-REQ-051` |
| CPSE-REQ-052 | `tests/smoke/published.mjs`:installFromRegistry | `@spec CPSE-REQ-047, CPSE-REQ-052` |

The job in `.github/workflows/release.yml` cites CPSE-REQ-047..052 in its comment.

## Notes

- The job runs only on a real tag publish, so CI on a pull request never runs it. `pnpm test:published <version>` is the way to run it before then.
- A non-transient install failure (not only "not published yet") is also retried for 10 minutes before the job fails. The job's 20-minute timeout bounds it.

## Post-Review Amendments

- `release-install-check/component-packaging-and-source-export-ticket-001-code-review/CR-001` (also security SEC-001, SEC-002): `installFromRegistry` installs with `--save-exact` instead of `--no-save --package-lock=false`, so npm audits the package and React stays on the template's lockfile. `verifySignatures(work, version)` requires the audited and signed counts to equal the packages in `package-lock.json`, a verified attestation, and the registry's SLSA v1 provenance type for this version. Files: `tests/smoke/published.mjs`. Re-verification: `pnpm test:published 0.1.0` exit 0, 4 packages audited, signed and attested.
- `…/CR-002`: `installFromRegistry` retries only while npm reports `E404`, `ETARGET` or `notarget`; other install errors fail at once. Files: `tests/smoke/published.mjs`.
- `…/CR-003` (also security SEC-004): the script test in `tests/package/release-config.test.ts` asserts code lines only, with exact install argument lines; a commented-out guard fails it. Re-verification: `pnpm lint` 0, `pnpm typecheck` 0, `pnpm test` 0 (2602 passed), actionlint 0.
- `release-install-check/component-packaging-and-source-export-ticket-001-quality-review/QR-001`: `importEntryPoints(work, version)` passes `render.mjs` the export keys of the checked-out repository's `package.json`, not the installed package's own, and fails if that `package.json` is another version. Files: `tests/smoke/published.mjs`, `tests/package/release-config.test.ts`, `docs/versioning.md` (check out the tag before a local run). Re-verification: `pnpm test:published 0.1.0` exit 0; with `./not-published` added to the repository's exports it exits 1 naming the missing entry.
- `…/QR-004`: `docs/versioning.md` step 7 re-wrapped. Re-verification: `pnpm lint` 0, `pnpm typecheck` 0, `pnpm test` 0 (2602 passed).
- `release-install-check/component-packaging-and-source-export-ticket-001-security-review/SEC-003`: `isolateNpm(work)` (annotated `@spec CPSE-REQ-047`) runs every npm and npx call with empty user and global npmrc files, none of the caller's `npm_config_*` variables, and the public registry; script header and `docs/versioning.md` step 7 warn that a local run executes the published code as the caller. SEC-001, SEC-002 and SEC-004 were resolved by CR-001 and CR-003 above. Files: `tests/smoke/published.mjs`, `tests/package/release-config.test.ts`, `docs/versioning.md`. Re-verification: `pnpm lint` 0, `pnpm typecheck` 0, `pnpm test` 0 (2602 passed), actionlint 0, `pnpm test:published 0.1.0` 0, and 0 with `npm_config_@gener8v:registry` and `npm_config_registry` pointed at `http://127.0.0.1:9/`.
