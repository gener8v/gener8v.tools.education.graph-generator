# Release install check

**Status:** Approved
**Approved by:** Product Owner — Thomas Eaves, 2026-11-05
**Opened:** 2026-11-05
**Slug:** release-install-check

## Why
During the 0.1.0 publish, npm printed `"bin[graph-generator]" script name dist/cli.js was invalid and removed`. The message was a misleading rewrite of `./dist/cli.js`, and the command did ship, but only a manual install from the registry proved it. The release workflow checks the package before it is published and checks the provenance after, but nothing checks that the published package installs and works.

## Outcome
- After every publish, the release run installs the published version from the registry into an empty project and fails if it does not work
- The check verifies the registry signatures and attestations of the installed packages
- The check runs the `graph-generator export` command from the installed package and confirms it writes a component file
- The check imports every public entry point of the installed package

## Affected Capability Areas

| Area | Kind | Requirements |
|------|------|--------------|
| Component Packaging & Source Export | modifies | Adds CPSE-REQ-047..052; Modifies —; Withdraws — |

## Priority Cut
- **Must:** the post-publish install check: registry signatures, the export command, every entry point; the release run fails when any of them fails
- **Should:** none stated by the Product Owner
- **Could / later:** none stated by the Product Owner

## Out of Scope
- Failing a pull request on npm's pre-publish `auto-corrected` warnings
- Changing the `bin` path to `dist/cli.js`
- Testing the first-version token path (`NPM_BOOTSTRAP_TOKEN`)
- Unpublishing or deprecating a version the check finds broken; the check reports, a maintainer decides

## Open Questions
- [x] **OQ-001**: How long may the check wait for a just-published version to become installable from the registry before it fails? — Answered 2026-11-05: at most 10 minutes of retries (CPSE-REQ-052)

## Change Log
- 2026-11-05 — opened (Planning)
- 2026-11-05 — CPSE specification amended: adds CPSE-REQ-047..052, modifies —, withdraws — (Specification)
