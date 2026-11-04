# TICKET-006: Add the graph-generator export command — Code Review

## Summary

Reviewed the `graph-generator export` command (`src/cli.ts`, the second tsup build, the `bin` field, the `invalid_json` rewording and the 18 spawned-command tests) at commit 80a33cd. Every acceptance criterion is met and the re-run verification passes. Two Observations; no Critical findings or Issues.

**Delivery Record:** .gener8v/changes/graph-library/delivery/component-packaging-and-source-export-ticket-006-delivery.md
**Files Reviewed:**
- src/cli.ts
- tsup.config.ts
- package.json
- src/core/issues.ts
- tests/core/issues.test.ts
- tests/cli/export.test.ts
- README.md
- .changeset/export-command.md
- .gener8v/specifications/component-packaging-and-source-export.md

**Findings:** 2
**Critical:** 0 | **Issues:** 0 | **Observations:** 2

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| Writes `<Name>.tsx` next to the input, or `--out`, using `--name` | Yes | `src/cli.ts`:exportCommand (target computation); tests "writes <Name>.tsx beside the input", "writes to --out", "names the component..." in `tests/cli/export.test.ts`. Probe: bad `--name ../Evil` refused, exit 1, nothing written |
| Invalid description prints each issue's path and message to stderr, non-zero, no file | Yes | `issueLines`/`formatIssue`, cap of 20 plus "…and N more"; tests at export.test.ts:107, 117, 129 |
| Unreadable file or invalid JSON: clear message, non-zero | Yes | `failure()` (fixed sentence plus `E…` code) and the `invalid_json` branch; tests at export.test.ts:142, 152, 165 |
| `--help` documents the command; Node 22 and 24; no React DOM | Yes (22/24 by CI only) | `USAGE`; help test at export.test.ts:194; no-`node_modules` copy test at :227. Only the local Node was run; the 22/24 matrix is the CI test jobs |
| No network access | Yes | `pnpm check:dist` re-run: 32 built files scanned (includes `dist/cli.js`), none found |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| CPSE-REQ-026 | Source export as a function and as a command reading a description file and writing a component file | `src/cli.ts`:main; `tsup.config.ts` (cli build); `package.json` `bin.graph-generator` | Yes |

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/TC-005 | Package/runtime constraint named by the ticket | Yes | Command bundled into one Node-only file; runs with no `node_modules`, loads no React (test at export.test.ts:227) |
| prd/TC-006 | Node.js 22 and 24 | Yes | `target: "node22"`; CI matrix runs the tests on both (not re-run here) |
| prd/CC-003 | No network access | Yes | `pnpm check:dist` passes over `dist/cli.js`; `src/cli.ts` imports only `node:fs`, `node:path`, `node:util` |
| Carried hazards (GSV-002 SEC-001/002/003, GSV-001 SEC-001) | Escaped paths, 20-issue cap, no exception text, hostile title end to end | Yes | `formatIssue` for every issue; `MAX_ISSUES_PRINTED`; `failure()` and the catch-all use fixed text; hostile-title test at export.test.ts:177 |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-001 | One package, separate entry points; `bin` | Yes | `bin.graph-generator` added; library entries unchanged; `cli` is a separate build, not a public import path |
| AD-013 | Source export prints the Scene as one component file | Yes | The command writes `exportSource`'s `source` unchanged (byte-equality test) |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| CPSE-REQ-026 | `@spec CPSE-REQ-026` | `src/cli.ts`:main (line 98) | Yes |
| CPSE-REQ-026 | `@spec CPSE-REQ-026` | `tsup.config.ts` (cli build, above `const cli`) | Yes |

**Coverage:** 1 of 1 requirements annotated
**Missing:** None
**Specification table:** Yes — the CPSE-REQ-026 row lists `src/cli.ts`:main, `tsup.config.ts`, `package.json` and `tests/cli/export.test.ts`.

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm build`; `head -1 dist/cli.js`; mode | 0 (`#!/usr/bin/env node`, 755) | Yes |
| `vitest run --no-cache tests/cli` (with `tests/core/issues.test.ts`) | 0 (61 passed) | Yes |
| eslint on changed files; `pnpm typecheck` | 0 / 0 | Yes |
| `pnpm check:dist`, `check:changesets`, `publint` | 0 / 0 / 0 | Yes |
| `pnpm generate` | 0, no tracked files changed | Yes |
| Full loop (vitest ×3, bench, size, attw, audit, check:deps/images) and `pnpm audit` exit 1 | Not re-run | Not re-run; the audit failure is the recorded accepted dev-only advisory |

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | Standard 0/1/2 split; documented in help and README |
| DEL-002 | Reasonable | Keeps library entries untouched; the library `clean` exclusion of `dist/cli.js` is a sound consequence |
| DEL-003 | Reasonable | One code for one condition; test file updated |
| DEL-004 | Reasonable | Overwrite is documented; see CR-001 for the one case where it destroys the input |
| DEL-005 | Reasonable | 9,900 keys exercise the cap; 10,000 would hit `too_large` |

## Findings

### CR-001: `--out` may name the input file, which is then overwritten

**Severity:** Observation
**Location:** src/cli.ts:87-89 (exportCommand)
**Traces To:** AC 1 (`--out`); DEL-004 (overwrite by design)
**Description:** Nothing compares the output path with the input. `graph-generator export d.json --out d.json` replaces the saved description with TSX source. This is not covered by the overwrite documentation, which speaks of "an existing output file".
**Impact:** A mistyped `--out` destroys the author's only copy of the description. Low likelihood; no requirement forbids it.
**Recommendation:** Refuse (exit 1, fixed message, nothing written) when the resolved output path equals the resolved input path, with a test; or note it in the README.
**Status:** Resolved
**Resolution:** Fixed with security review SEC-003 (Engineer — Thomas Eaves, 2026-11-04): a target that is the input file is refused (exit 2, nothing written), with tests for `--out` as the input, a hard link and other spellings.

---

### CR-002: The catch-all `internal_error` path in `main` has no test

**Severity:** Observation
**Location:** src/cli.ts:119-122; tests/cli/export.test.ts
**Traces To:** Carried hazard GSV-002 SEC-003 (a thrown internal exception yields no `file:`, `/node_modules/` or `    at ` text)
**Description:** The hazard's test is satisfied through the `--out`-is-a-directory case (`EISDIR`), which reaches the write-failure branch, not the catch-all. The delivery record discloses this. The catch-all code is correct on reading (fixed message through `formatIssue`) but is unproven.
**Impact:** A later edit could make the catch-all print exception text without a failing test.
**Recommendation:** Export a seam or inject a throwing dependency so one unit test drives `main` into the catch-all, or record the path as untestable in the ticket.
**Status:** Resolved
**Resolution:** Fixed with quality review QR-001: `main` runs only when `src/cli.ts` is the entry module (`import.meta.url` against the real path of `argv[1]`, so the npm bin symlink still runs it); `tests/cli/main.test.ts` mocks `exportSource` to throw and asserts the fixed `internal_error` message with no exception text, `file:`, `/node_modules/` or stack frame. Mutant (stack printed) → the test fails.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Fixed | same-file refusal (SEC-003) | `src/cli.ts`, `tests/cli/export.test.ts` |
| CR-002 | Fixed | entry guard; in-process catch-all test | `src/cli.ts`, `tests/cli/main.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (both fixed, 2026-11-04)
**Notes:** Both observations fixed in resolution, with the security and quality fixes they share lines with.
