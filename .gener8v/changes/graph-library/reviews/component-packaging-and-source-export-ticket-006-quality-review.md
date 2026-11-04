# CPSE TICKET-006: Add the graph-generator export command — Quality Review

## Summary

Reviewed the `graph-generator export` command: `src/cli.ts`, the second tsup build, the `bin` field, the `invalid_json` rewording and the 18 spawned-process tests. The code is small, clear and consistent with the codebase's escaping and issue conventions, and the tests exercise the built artefact the way a build script would. Three Suggestions, no Critical findings or Concerns.

**Files Reviewed:**
- src/cli.ts
- tsup.config.ts
- package.json
- src/core/issues.ts
- tests/cli/export.test.ts
- tests/core/issues.test.ts
- README.md
- .changeset/export-command.md

**Findings:** 3
**Critical:** 0 | **Concerns:** 0 | **Suggestions:** 3

## Quality Assessment

### Code Organization

**Rating:** Strong
**Notes:** `cli.ts` is one short file with small single-purpose helpers (`failure`, `issueLines`, `fail`, `usageError`, `exportCommand`, `main`). It reuses `exportSource`, `formatIssue`, `createIssue` and `componentName` rather than duplicating them. The second tsup build is isolated from the library config, and the `clean` exclusion for `dist/cli.js` is explained in a comment. Dependency direction is correct (the command depends on core and export, never the reverse).

### Readability

**Rating:** Strong
**Notes:** Names state intent (`MAX_ISSUES_PRINTED`, `usageError`, `issueLines`). Functions are under 30 lines and there is little nesting. Comments explain why (cap origin, escaping, fixed message). The one cast, `(parsed as { type: GraphType }).type` at `src/cli.ts:87`, leans on a comment rather than the types (QR-003).

### Error Handling

**Rating:** Strong
**Notes:** Every fallible step (read, parse, validate, write) has its own handler. Messages are fixed sentences plus an `E…` code, never `error.message` or a stack. File names are escaped and clipped, the issue list is capped, and a catch-all returns the fixed `internal_error` message. Exit codes are distinct and documented in `--help`, the README and the changeset. Output is not written until the description validates.

### Test Coverage

**Rating:** Strong
**Notes:** Commands run (with `GRAPH_GENERATOR_PREBUILT=1`, `--no-cache --maxWorkers=4`):
- `npx vitest run tests/cli tests/core/issues.test.ts`: exit 0, 61 passed (18 CLI tests). An earlier first invocation showed 3 failures in the "copy of dist/" test. They did not reproduce on two re-runs. `dist/cli.js` had been rewritten at the same minute, so I attribute them to a concurrent rebuild of the shared `dist/` by the other agent. Treat that as an environment race, not a defect, but the fact that these tests depend on a shared mutable `dist/` is noted in QR-002.
- `npx eslint` on the changed source and test files: exit 0, no output.
- `npx tsc --noEmit`: exit 0, no output.

The tests cover success, `--out`, `--name`, overwrite, bad name, invalid description, hostile key and title, the issue cap, invalid JSON, missing file, a directory as `--out`, help, version, usage errors and a bare `dist/` copy. Assertions check exit status, both streams and the files left behind. Gaps: the `internal_error` catch-all and the top-level module side effect are untested (QR-001).

### Observability & Operability

**Rating:** Adequate
**Notes:** The command is a CLI. stdout carries the single "Wrote <path>" line and stderr carries every failure, each with an attributable file name and cause code, and the exit status separates a bad input from a bad call. No logging or metrics are warranted, matching the codebase. A catch-all failure prints a fixed message with no cause, which is deliberate (SEC hazard) and costs an operator some diagnosability.

## Findings

### QR-001: `main` cannot be imported without running, so the catch-all path is untestable

**Category:** Maintainability
**Severity:** Suggestion
**Location:** `src/cli.ts:125`
**Description:** `process.exitCode = main(process.argv.slice(2));` runs at module top level, although `main` is exported. Importing `main` in a test would execute it against the test runner's argv. The delivery record concedes the `internal_error` branch (`src/cli.ts:119-122`) has no test for this reason.
**Impact:** One of the security hazards the ticket carried (no exception text on an unexpected failure) has no executable proof. Mutating that branch to print `error.message` would pass the suite.
**Recommendation:** Move the entry line into a tiny `bin.ts` (a second `cli` tsup entry) or guard it with an "is this the entry module" check. Then add an in-process test that makes `exportSource` throw, with a mock, and asserts the fixed message.
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-11-04): the entry guard and the in-process catch-all test (see code review CR-002); a test also asserts that importing `main` leaves `process.exitCode` unset, and one runs the built command through a symlink.

---

### QR-002: The bare-copy test proves "no React" weakly and shares a mutable `dist/`

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/cli/export.test.ts:227-238`
**Description:** The test copies `dist/` (51 entries, including all library chunks) and asserts only that the command runs and that `dist/cli.js` has no `from "react` import. It does not show that the command loads nothing outside `cli.js`. Running with `--import` hooks or `NODE_OPTIONS=--no-addons` is not needed. Copying only `dist/cli.js` and `package.json` would prove self-containment directly. Separately, every test reads the shared `dist/cli.js`, so a concurrent `pnpm build` fails them (seen once in this review).
**Impact:** A future change that makes `cli.js` import a sibling chunk would still pass. The race affects only parallel local use.
**Recommendation:** Copy just `dist/cli.js` and `package.json` into the bare directory. Optionally also assert that `cli.js` has no bare-specifier imports other than `node:`/built-in modules.
**Status:** Resolved
**Resolution:** Fixed: the bare-copy test copies only `dist/cli.js` and `package.json`, and a test scans `dist/cli.js` for static, dynamic and `require` specifiers, each of which must be a Node built-in (tsup drops the `node:` prefix) and a literal.

---

### QR-003: Default-name cast and a trivial exported wrapper

**Category:** Naming
**Severity:** Suggestion
**Location:** `src/cli.ts:87`, `src/core/issues.ts:224-230`
**Description:** (a) The default file name is built from `(parsed as { type: GraphType }).type` on the strength of a comment that the description is valid. `exportSource` already knows the type and could return it. (b) `quoteEscaped(text, max)` only calls `quote(text, max)` from the same module. It was added because `format.ts` already exports a different `quoteText`, so the wrapper exists to avoid a name clash, not for its own sake.
**Impact:** The cast hides a coupling that a type change would break silently. The wrapper adds a second name for one function, and the doc says "internal" while the symbol is exported from the module.
**Recommendation:** Return the type, or the resolved component name, from `exportSource`'s result. Export `quote` under a clearer name (for example `quoteForMessage`) and drop the wrapper.
**Status:** Resolved
**Resolution:** Fixed: `exportSource`'s success result also carries `componentName` (additive; its changeset says so), which the command uses for the default file name — the cast is gone. `quote` is exported as `quoteForMessage` and the `quoteEscaped` wrapper deleted.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fixed | entry guard; in-process test | `src/cli.ts`, `tests/cli/main.test.ts` |
| QR-002 | Fixed | cli.js alone; built-in imports only | `tests/cli/export.test.ts` |
| QR-003 | Fixed | `componentName` on the result; `quoteForMessage` | `src/export/exportSource.ts`, `src/core/issues.ts`, `src/cli.ts`, `.changeset/export-source.md`, `tests/export/exportSource.test.ts`, `tests/export/exportSource-printer.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (all three fixed, 2026-11-04)
**Notes:** All suggestions fixed in resolution and re-verified.
