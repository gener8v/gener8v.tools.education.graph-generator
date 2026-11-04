# TICKET-006: Add the graph-generator export command — Delivery Record

## Ticket Reference

**Ticket:** graph-library/component-packaging-and-source-export/TICKET-006
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/component-packaging-and-source-export.md`
**Requirements Covered:**
- CPSE-REQ-026: Source export as a function and as a command that reads a description file and writes a component file

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Predecessor TICKET-005 delivered | delivery record | Delivered (e0c30ac); its review fixes are being resolved on `ticket/graph-library-cpse-005` — this ticket starts after they land on `main` | ✅ |
| `exportSource(description, { componentName? })` | `src/export/exportSource.ts` | present; never throws; returns `{ ok, source }` or `{ ok: false, issues }` | ✅ |
| `package.json` `bin` field (Prior Art: "TICKET-001 output") | `bin.graph-generator` | **absent**; system design lists it (`system-design.md:30`) but no ticket added it | ⚠️ To add — in this ticket's Output (`src/cli.ts` "wired to `bin.graph-generator`") |
| A built command | a tsup entry | **absent**: `tsup.config.ts` builds the library entries only, with `platform: "neutral"` | ⚠️ To add — plan decision (a second, Node-platform build with a shebang) |
| `formatIssue` (hazard) | `src/core/issues.ts`, `./core` | present (line 489), exported from `./core` | ✅ |
| `invalid_json` issue (hazard) | issue code with `detail` | present; its doc says "Emitted only by the tool handler" and its message says "The tool input is not valid JSON… send a JSON object" | ⚠️ Wording names the tool only — plan decision |
| `internal_error` issue (hazard) | fixed message | present | ✅ |
| Hostile title fixture (hazard) | `tests/fixtures/plain-text.ts` | `HOSTILE_TEXT`, `SMUGGLED_TEXT` present | ✅ |
| Tests can spawn the built package | build before tests | `tests/setup/build.ts` builds once (skipped with `GRAPH_GENERATOR_PREBUILT=1`) | ✅ |
| No network (prd/CC-003) | scan of built files | `scripts/check-dist.ts` scans every file under `dist/`, so it covers `dist/cli.js` | ✅ |
| Node.js 22 and 24 (prd/TC-006) | CI matrix | the test jobs run on Node 22 and 24 | ✅ |
| `tests/cli/` | to be created | absent | ✅ |
| Carried: GSV TICKET-002 SEC-001, SEC-002, SEC-003; GSV TICKET-001 SEC-001 (hazards) | escaped paths, 20-issue cap, no exception text, hostile title end to end | — | 🔁 Carried — in the plan |

**Resolved from ground truth (not escalated):** The "whichever of TICKET-003, 006, 007 lands first adds `formatIssue`" hazard is settled: TICKET-003 added it. The `bin` field the Prior Art attributes to TICKET-001 was never added; the ticket's own Output wires it, so it is added here rather than treated as a blocker.

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-11-04
**Implemented by:** sonnet · medium — routed as deliver-small from Tower

Starts on `ticket/graph-library-cpse-006` once CPSE TICKET-005's review fixes are on `main`.

### Planned Files

- `src/cli.ts`: `graph-generator export <file.json> [--out <file.tsx>] [--name <Name>]`, `--help`/`-h`, `--version`. `node:util` `parseArgs` (strict), `node:fs` only. Calls `exportSource`; writes the source unchanged (UTF-8). Default output: `<Name>.tsx` beside the input (Name = `--name`, else the type's default such as `CircleGraph`). Exit 0 ok · 1 invalid description / unreadable / bad JSON / write fails · 2 usage error (prints usage). Issues: `formatIssue` each, first 20, then "…and N more"; no file written. Unreadable file / write error: fixed text + `error.code` only (ENOENT), never `error.message` or stack. Bad JSON: `invalid_json` issue, parser message as `detail`. Anything unexpected: `internal_error`'s fixed message. File names in messages escaped like terms (`escapeChars` + quote).
- `tsup.config.ts`: second build, platform node, entry `cli`, shebang banner, no dts, clean off (shares `dist/` with the library build).
- `package.json`: `"bin": { "graph-generator": "./dist/cli.js" }`.
- `src/core/issues.ts`: `invalid_json` doc and message name the command too ("…not valid JSON…"); regenerate docs.
- `tests/cli/export.test.ts`: spawns `node dist/cli.js` — success, `--out`, `--name`, bad name, invalid description (no file, exit 1), 10,000 unknown keys → output under a fixed size, invalid JSON, missing file, `--out` is a directory (no stack, `file:` or `/node_modules/`), help, usage error, hostile title byte-equal to `exportSource`; and runs from a copy of `dist/` with no `node_modules` (no React, no React DOM). Runs on Node 22 and 24 in CI.
- `README.md`: Command line section; `.changeset/` (patch); specification `@spec Coverage` row.

Decisions to record: exit codes; a second Node build; `invalid_json` reused; an existing output file is overwritten (build scripts re-run).

### How Acceptance Criteria Will Be Met

- Writes `<Name>.tsx` beside the input, or `--out`, using `--name`: success, `--out` and `--name` tests.
- Invalid description prints each issue's path and message to stderr, exits non-zero, writes no file: invalid-description and 10,000-keys tests.
- Unreadable file or invalid JSON: missing-file and invalid-JSON tests.
- `--help` documents the command; runs on Node 22 and 24 with no React DOM: help test; the no-`node_modules` copy test on the CI Node 22 and 24 jobs.
- No network access: `pnpm check:dist` scans `dist/cli.js`.

## Progress

- [x] `src/cli.ts`
- [x] `tsup.config.ts`
- [x] `package.json`
- [x] `src/core/issues.ts` (+ regenerated docs)
- [x] `tests/cli/export.test.ts`
- [x] `README.md`, `.changeset/`, specification coverage row

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/cli.ts`: `main(argv)` — `graph-generator export <file.json> [--out] [--name]`, `--help`, `--version`; exit 0 / 1 / 2; issues through `formatIssue`, first 20 then "…and N more"; fs errors as a fixed sentence plus an `E…` code; file names quoted and escaped; a catch-all prints `internal_error`'s fixed message.
- `tsup.config.ts`: a second build — `cli` entry, `platform: "node"`, `target: "node22"`, the shebang banner, no declarations; the library build cleans `dist/**` except `dist/cli.js`.
- `package.json`: `"bin": { "graph-generator": "./dist/cli.js" }`.
- `src/core/issues.ts`: `invalid_json`'s doc names the export command too and its message no longer says "tool input" ("The input is not valid JSON (…); a description is a JSON object."); `quoteEscaped(text, max)`, an internal helper, quotes other printed text with the messages' escaping.
- `tests/core/issues.test.ts`: the two `invalid_json` message assertions follow the new wording.
- `tests/cli/export.test.ts`: 18 tests spawning `node dist/cli.js`.
- `README.md` "Command line"; `.changeset/export-command.md` (patch); the specification's CPSE-REQ-026 coverage row.

## Verification Run

| Command | Exit | Evidence |
|---------|------|----------|
| full verification loop (`pnpm generate`, `lint`, `typecheck`, vitest ×3, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `check:changesets`, `size`, `publint`, `attw`, `audit --prod`, state, lint) | 0 | vitest 2,445 passed ×3; bench 25 passed; `pnpm generate` changed nothing; `check:dist` scanned `dist/cli.js` with the rest |
| `pnpm audit` | 1 | the accepted dev-only `minimatch` advisory (CPSE TICKET-004 SEC-002) |
| `npx vitest run --no-cache tests/cli` (implementer) | 0 | 18 passed |
| `pnpm build`; `head -1 dist/cli.js`; mode (implementer) | 0 | `#!/usr/bin/env node`, mode 755 |
| mutants (implementer, each restored): `issue.path` printed raw; the 20-issue cap dropped; `error.message` printed for fs errors | — | "escapes a hostile key in an issue's path" fails; the 9,900-keys test fails; the missing-file and directory tests fail |

## Acceptance Criteria Verification

- [x] `graph-generator export desc.json` writes `<Name>.tsx` beside the input, or `--out`, using `--name` — the success, `--out` and `--name` tests in `tests/cli/export.test.ts`.
- [x] An invalid description prints each issue's path and message to stderr, exits non-zero, writes no file — the invalid-description test and the 9,900-keys test (exactly 20 lines, "…and 9880 more", stderr under 8,000 characters).
- [x] An unreadable file or invalid JSON prints a clear message and exits non-zero — the missing-file and invalid-JSON tests.
- [x] `--help` documents the command; runs on Node.js 22 and 24 with no React DOM installed — the help test; the test that runs a copy of `dist/` and `package.json` with no `node_modules` (no React, no React DOM). Node 22 and 24: the CI test jobs run these tests on both.
- [x] The command uses no network access — `pnpm check:dist` scans `dist/cli.js` for network APIs and modules.

## Decisions Made

### DEL-001: Exit codes 0, 1 and 2

**Context:** The ticket asks for "non-zero" on failure.
**Decision:** 0 the file is written; 1 the description or a file is not usable (invalid description, unreadable file, invalid JSON, write failure, internal error); 2 the command line is not valid (prints the usage).
**Rationale:** A build script can tell a bad description from a bad call, the common Unix convention.
**Ticket Impact:** None.

### DEL-002: A second, Node-platform build for the command

**Context:** The library builds with `platform: "neutral"` and splitting; the command needs `node:fs` and must run from a bare copy of `dist/`.
**Decision:** A second tsup config bundles `src/cli.ts` alone into `dist/cli.js` with the shebang. tsup runs both at once, so the library's `clean` excludes `dist/cli.js`.
**Rationale:** Keeps the library entries unchanged and the command self-contained.
**Ticket Impact:** `dist/cli.js` repeats the export code (not a published import path, so no size budget).

### DEL-003: `invalid_json` reused, with neutral wording

**Context:** A file that is not JSON needs an issue; `invalid_json` existed for the tool handler, with a message saying "tool input".
**Decision:** Reuse it; its message now reads "The input is not valid JSON (…); a description is a JSON object.", which fits both, and its doc names both emitters. Only the parser's message is passed, as `detail`.
**Rationale:** One code for one condition; the message is still escaped and capped.
**Ticket Impact:** The tool handler (CPSE TICKET-007) prints the same wording.

### DEL-004: An existing output file is overwritten

**Context:** Build scripts re-run the export.
**Decision:** Overwrite, and say so in `--help` and the README.
**Rationale:** Approved with the plan.
**Ticket Impact:** None.

### DEL-005: The 10,000-unknown-keys case uses 9,900 keys

**Context:** The hazard asks for 10,000 unknown keys to produce bounded output. 10,000 keys exceed the 10,000-value limit and produce one `too_large` issue, which would not exercise the cap.
**Decision:** 9,900 unknown keys: 9,900 issues, 20 printed, then "…and 9880 more".
**Rationale:** Tests what the hazard is about, the cap.
**Ticket Impact:** None.

## Deviations from Plan

- `invalid_json`'s message was reworded (DEL-003) and `tests/core/issues.test.ts` updated — the plan named the doc and "…not valid JSON…" but not the test file (main session, after the implementer left the message unchanged).
- The helper the CLI uses to quote file names is `quoteEscaped`, not `quoteText`: `src/core/format.ts` already exports a different `quoteText` (main session).
- The "thrown internal exception" hazard test uses `--out` at a directory, which reaches the write failure (fixed sentence plus `EISDIR`), not the catch-all; the catch-all's `internal_error` path has no test, as nothing outside can make `main` throw.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| CPSE-REQ-026 | `src/cli.ts`:main | `@spec CPSE-REQ-026` |
| CPSE-REQ-026 | `tsup.config.ts` (the `cli` build) | `@spec CPSE-REQ-026` |

## Notes

- Implemented by sonnet · medium in an isolated worktree from `main` (03ac8e5); applied to `ticket/graph-library-cpse-006` from `main` (e00a824) as a patch.
- Not checked: a Windows-style `\` in `--out`.
- Some `HOSTILE_TEXT` titles are refused by the validator (line breaks, direction controls); the end-to-end test expects exit 1 and no file for those, and a file byte-identical to `exportSource` for the rest.

## Post-Review Amendments

### graph-library/component-packaging-and-source-export-ticket-006 security review SEC-001..SEC-004, code review CR-001, CR-002, quality review QR-001..QR-003 (one commit: the fixes share lines)

**Change:**
- SEC-001: README install step and `npx @gener8v/graph-generator export …`; a package test requires every `npx` line in the README (and `docs/`) to name the scoped package.
- SEC-002: the input is opened `O_RDONLY | O_NONBLOCK`, `fstat`ed and refused unless a regular file of at most `MAX_INPUT_BYTES` = 3 MiB (1.9× the largest valid description pretty-printed, 1,649,745 bytes), then read from the same descriptor; in `--help` and the README.
- SEC-003 / CR-001: write to a `wx` temp file beside the target, then rename (no symlink following, atomic); a target that is the input is refused, exit 2. A replaced file takes the default mode, not the old file's.
- SEC-004: without `--out`, a Windows reserved device name as the component name is refused, exit 2.
- CR-002 / QR-001: `main` runs only as the entry module (real path of `argv[1]`); `tests/cli/main.test.ts` drives the catch-all. QR-002: the bare copy is `dist/cli.js` alone, whose imports must all be Node built-ins. QR-003: `exportSource`'s success result carries `componentName` (additive); `quoteForMessage` replaces `quote` and the `quoteEscaped` wrapper.
**Files:** `src/cli.ts`, `src/export/exportSource.ts`, `src/core/issues.ts`, `README.md`, `.changeset/export-source.md`, `tests/cli/export.test.ts`, `tests/cli/main.test.ts` (new), `tests/export/exportSource.test.ts`, `tests/export/exportSource-printer.test.ts`, `tests/package/checks.test.ts`
**Re-verification:** full verification loop — all exit 0 except `pnpm audit` (accepted, CPSE TICKET-004 SEC-002); vitest ×3, 2,460 passed each; bench 25 passed. Mutants: no size check → the oversize test fails; direct write → the symlink test fails; no same-file check → three tests fail; stack printed in the catch-all → the in-process test fails; `main` run on import → the exit-status test fails. gener8v-state lint 0 errors.
