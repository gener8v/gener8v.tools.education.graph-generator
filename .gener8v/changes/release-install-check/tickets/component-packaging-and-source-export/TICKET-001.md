# TICKET-001: Check the published package after every release

**Change:** release-install-check
**Capability Area:** Component Packaging & Source Export (component-packaging-and-source-export)
**Specification:** specifications/component-packaging-and-source-export.md

**Summary:** Add a release job, after `verify-provenance`, that installs the just-published version from the npm registry into an empty project with React, verifies its signatures and attestations, runs the installed `graph-generator export` command on a sample description, imports every public entry point, and fails the release run when any step fails.
**Priority:** Must
**Value:** A maintainer learns from the release run itself whether the version users will install actually works, instead of checking by hand.

**Requirements Covered:**
- CPSE-REQ-047: install the exact published version from the registry into an empty project
- CPSE-REQ-048: verify registry signatures and provenance attestations of the installed packages
- CPSE-REQ-049: run the installed export command on a sample and confirm the component file is written
- CPSE-REQ-050: import every public entry point of the installed package
- CPSE-REQ-051: fail the release run, naming the version and the failed step
- CPSE-REQ-052: retry while the version is not yet installable, for at most 10 minutes

**Prior Art:**
- Read: `.github/workflows/release.yml` — the `publish` and `verify-provenance` jobs: the tag-to-version derivation (`${GITHUB_REF_NAME#v}`), the retry loop pattern, pinned action SHAs, minimal `permissions`
- Read: `tests/package/release-config.test.ts` — asserts the exact set of release jobs (five today) and each job's permissions; it must learn the new job
- Read: `tests/smoke/run.ts`, `tests/smoke/render.mjs` — the pre-publish pack-and-install smoke (CPSE-NFR-003); reuse its approach to importing entry points rather than inventing a second one
- Read: `package.json` `exports` and `bin` — the public entry points and the CLI; `examples/circle.json` — a sample description
- Read: `.gener8v/technical-design/system-design.md` AD-016 (toolchain, checks and release process); `.gener8v/constraints/prd.md` OC-002, OC-003
- Read: `docs/versioning.md` — the release section that describes the jobs

**Acceptance Criteria:**
- [ ] `release.yml` has a new job that `needs: verify-provenance`, runs only when the publish ran, and has `permissions: contents: read` only
- [ ] It installs `@gener8v/graph-generator@<tag version>` (exact version, not a range) plus React and React DOM into a fresh empty directory, from the public registry, with lifecycle scripts disabled
- [ ] Install retries while the version is not yet available, for at most 10 minutes in total, then fails with a message naming the version (CPSE-REQ-052)
- [ ] `npm audit signatures` runs in that project and the job fails unless it reports verified signatures and at least one verified attestation
- [ ] `npx @gener8v/graph-generator export <sample>.json` runs from that project, exits 0, and the expected `.tsx` file exists and is non-empty
- [ ] Every key of the installed package's `exports` that is a JS entry is imported (in Node, ESM) without error; JSON entries are read and parsed; the list is taken from the installed `package.json`, not hard-coded
- [ ] Each failing step prints the version and which check failed (CPSE-REQ-051)
- [ ] `tests/package/release-config.test.ts` asserts the new job (name, `needs`, permissions, no secrets, exact-version install) and passes; actionlint passes
- [ ] `docs/versioning.md` describes the new job in its release steps
- [ ] The check is exercised for real against the published 0.1.0 (for example by running the job's script locally, or a `workflow_dispatch` path) and the result is recorded in the delivery record

**Output:**
- `.github/workflows/release.yml` — new job (suggested id `install-check`), after `verify-provenance`
- `scripts/` or `tests/smoke/` — if the job's logic is more than a few lines, a script it calls (for example `tests/smoke/published.mjs`), so it can be run locally against any published version
- `tests/package/release-config.test.ts` — updated job set and new assertions
- `docs/versioning.md` — release steps updated

**Constraints:** prd/OC-002 (releases only from CI on tags — the job must never publish or need a token); prd/OC-003 (a broken published version is fixed forward or deprecated — the job only reports)

**Known Hazards:**
- `verify-provenance` already installs the version with `--omit=peer` and runs `npm audit signatures`. Do not duplicate it blindly: either keep that step and add the new job, or move the signature check into the new job and say so in the delivery record — but CPSE-NFR-008's verification (the attestation names repo, workflow, tag, commit) must stay in `verify-provenance`.
- npm normalizes `bin` from `./dist/cli.js` to `dist/cli.js` and prints "was invalid and removed" at publish; the bin is kept. Do not "fix" the bin path here (out of scope per the brief); the new check is what proves the CLI works.
- `release-config.test.ts` hard-codes five jobs in two places (`toEqual([...])` and `toHaveLength(5)`); update both.
- `npx` with the bare name `graph-generator` can resolve a different registry package; always call it as `npx @gener8v/graph-generator` (or `npx --no-install`).

**Depends On:** None
**Blocks:** None

**Size:** Small

**Notes:** The job runs only on a real tag publish, so it cannot run in a PR. Make its logic a script that takes the version as an argument, so it can be run locally against 0.1.0 during delivery.
