# TICKET-006: Add the graph-generator export command — Security Review

## Summary

Reviewed the `graph-generator export` command line tool delivered at 80a33cd (`git diff e00a824 80a33cd`): the command itself, the second Node build with the shebang, the `bin` field, the reworded `invalid_json` issue with the new `quoteEscaped` helper, the tests, and the README "Command line" section. The terminal-output handling is solid. File names, issue paths, issue messages and the JSON parser's detail are all quoted, clipped and escaped (C0, DEL, C1, bidi and zero-width characters). File-system errors print only a fixed sentence and an `E…` code. Usage errors never echo argv. `--name` cannot traverse paths because only `^[A-Z][A-Za-z0-9]*$` passes. The bundle has no network code and the package lints clean. There are four findings: the README's `npx graph-generator` line resolves to the unscoped npm package of that name whenever this package is not installed locally (Medium); the input is read and parsed with no size bound, and a 200 MB file kills the process with a native V8 stack trace (Low); the output is written through a symlink at the target, and an `--out` equal to the input replaces the description (Low); and Windows reserved device names pass as `--name` (Informational).

**Files Reviewed:**
- `src/cli.ts`
- `src/core/issues.ts` (the `invalid_json` doc and message, `quoteEscaped`)
- `tsup.config.ts`
- `package.json`
- `tests/cli/export.test.ts`
- `tests/core/issues.test.ts`
- `README.md` ("Command line")
- `.changeset/export-command.md`
- Also read for context: `src/export/exportSource.ts`, `src/export/print.ts` (`COMPONENT_NAME`), `src/core/format.ts` (`isUnsafeCodePoint`), `src/core/validate/structure.ts` (`DESCRIPTION_VALUE_LIMIT`), `scripts/check-dist.ts`, and the built `dist/cli.js`

**Findings:** 4
**Critical:** 0 | **High:** 0 | **Medium:** 1 | **Low:** 2 | **Informational:** 1

## Security Assessment

### Input Validation

**Status:** Gaps Found
**Notes:** The entry points are argv (`node:util` `parseArgs`, with `strict: true` and `allowPositionals`) and the contents of the file named on the command line.

- **Argv:**
  - Unknown options, missing option values, extra positionals and a wrong command all return exit 2 with the fixed usage text. The `parseArgs` error, which would name the offending option, is swallowed, so a hostile option is never echoed. A test covers this.
  - With a repeated option the last one wins.
  - `--` is honoured.
  - `--out=` (empty) fails with `cannot write "" (ENOENT).`
- **`--name`:** it is checked by `exportSource` against `COMPONENT_NAME` (`src/export/print.ts:8`, ASCII PascalCase only) before anything is written.
  - Probe: `--name ../Evil` gave exit 1 with a `/componentName` issue, and no file was written.
  - So `--name` cannot carry a separator, `..`, a NUL byte or a non-ASCII character into the default output path `join(dirname(file), "<Name>.tsx")` (`src/cli.ts:87`).
  - Windows device names do pass (SEC-004).
- **`--out`:** it is a path the caller chose and is used as given. That is the documented contract, so writing outside the input's directory is not a finding. Two exceptions are SEC-003: a symlink at the target is followed, and the target is not compared with the input.
- **File contents:**
  - `JSON.parse` comes first. Only the parser's `SyntaxError.message` is passed on, as `invalid_json`'s `detail`, which `describeDetail` clips to 200 characters and escapes.
  - Probe: a file holding OSC 52, CSI, C1 CSI and RLO sequences printed `"x\u001b]52;c;ZW"...` with every control escaped.
  - The detail does echo the first few characters of the file. That is the caller's own file in the caller's own terminal, so it is not a finding.
  - Deep nesting is handled. Probes with 1,000,000-deep arrays under an unknown key and under `radius`, and 500,000-deep objects under `title`, each gave one issue and exit 1, at about 150–220 MB RSS: V8's JSON parser is iterative and the validator is schema-driven.
  - Size is not bounded before parsing (SEC-002).
- **Text output:**
  - Issues print through `formatIssue`, which handles a hostile `path`.
  - Output is capped at 20 issues plus "…and N more" (GSV TICKET-002 SEC-001 and SEC-002, carried).
  - File names go through `quoteEscaped` (`src/core/issues.ts:228`, with `MAX_NAME_CHARS` 1024).
  - Probe: `--out $'a\u009b31mX.tsx'` printed `Wrote "a\u009b31mX.tsx".`
  - An `ENAMETOOLONG` path is clipped with `...`.
- **Injection:** there is no shell, template, SQL or `eval`. The bundle has no `child_process`, `new Function` or `eval(`.

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** This is a local command-line tool that runs with the invoking user's permissions, with no accounts, sessions or privilege boundary. It reads only the file it is given and writes only the one output file.

### Data Protection

**Status:** Adequate
**Notes:**
- There are no secrets, credentials, PII or logging.
- File-system failures print a fixed sentence plus the error's `code` only, and only when that code matches `^E[A-Z]+$` (`src/cli.ts:46`). Neither `error.message` (which holds the absolute path and syscall) nor a stack is printed. The probes on a directory, a mode-000 file, a missing parent directory and an over-long name gave `EISDIR`, `EACCES`, `ENOENT` and `ENAMETOOLONG` respectively, with no stack.
- The catch-all prints `internal_error`'s fixed message (`src/cli.ts:119`).
- One path bypasses all of this: a V8 fatal error during `JSON.parse` of a very large array prints a native stack trace with absolute paths (SEC-002).
- prd/CC-003 (collect, transmit or store no data): `pnpm check:dist` scanned all 32 built files, including `dist/cli.js`, and found no network APIs or modules. Bare `fs`/`path`/`util` specifiers (tsup strips `node:`) are matched by `MODULE_PATTERN`'s optional prefix. The only file the command writes is the one the caller asks for.

### Configuration Security

**Status:** Gaps Found
**Notes:**
- **Package contents:**
  - `package.json` declares `"bin": { "graph-generator": "./dist/cli.js" }`.
  - `files` is `["dist"]`, and `npm pack --dry-run` lists 56 entries: `dist/**`, `LICENSE`, `README.md` and `package.json`.
  - `dist/cli.js` is packed with mode 0755 and begins `#!/usr/bin/env node`.
  - `"type": "module"` makes the `.js` bundle ESM.
  - `engines.node >=22` matches prd/TC-006.
  - `pnpm publint` (publint 0.3.25 `--strict`) reports "All good!".
- **Bundle:** it is self-contained. It imports only `fs`, `path` and `util`, which are Node built-ins and win over any `node_modules` package of the same name. It loads no React or React DOM (a test runs it from a bare copy of `dist/`, satisfying prd/TC-005).
- **Install scripts:** there are none (no `preinstall`, `install`, `postinstall`, `prepare` or `prepack`), so installing the package runs nothing.
- **The gap:** the README tells users to run the command through `npx graph-generator`, an unscoped name this package does not own (SEC-001).
- **Dependency audit:** run 2026-11-04T16:21Z with pnpm 10.28.2.
  - `pnpm audit`: 1 moderate, `minimatch <11.0.1` via `eslint` (GHSA-g3hv-75wg-m249), on a dev-only path. This is the accepted risk graph-library CPSE TICKET-004 SEC-002, so it is not raised again here.
  - `pnpm audit --prod`: "No known vulnerabilities found".
- **Other checks run:**
  - `npx eslint` on the five changed TypeScript files: exit 0, no output.
  - `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache --maxWorkers=4 tests/cli`: 18 passed. `dist/cli.js` was current with 80a33cd: built 11:17 against a commit at 11:16, with the new strings present.
- **Cryptography:** not applicable.
- **Logging and monitoring:** not applicable to a one-shot command; diagnostics go to stderr only.
- **Compliance:**
  - prd/CC-003: met, as described under Data Protection.
  - prd/CC-001: the bundle repeats the package's own code and image notices; no third-party code is added.
  - No CC-XXX violation was found.

## Findings

### SEC-001: The README runs the command as `npx graph-generator`, which fetches and runs the unscoped npm package `graph-generator` when this one is not installed locally

**Severity:** Medium
**Category:** Dependency
**OWASP Reference:** A03:2025 Software Supply Chain Failures
**Location:** `README.md:31`, `README.md:32`
**Description:** The "Command line" section shows `npx graph-generator export description.json` and `npx graph-generator export description.json --out src/Figure.tsx --name Figure`. The package is `@gener8v/graph-generator`, and the README gives no install step.

`npx <name>` (npm 11.3.0, `libnpmexec/lib/index.js:153-218`) runs a matching bin only when one is found in `./node_modules/.bin` (searching upward) or in the global bin. Otherwise it treats `graph-generator` as a package spec, installs the unscoped registry package of that name into the npm cache, and runs its bin. In a TTY, npm prompts first. "When standard input is not a TTY or a CI environment is detected, `--yes` is assumed" (npm `docs/content/commands/npm-exec.md:37-38`), so there is no prompt in CI.

The unscoped name `graph-generator` belongs to no one connected with this project: whoever owns it now, or registers it later, decides what that line runs. This review made no registry lookup, so whether it is taken today is unverified. The risk does not depend on that.
**Attack Scenario:**
1. The attacker publishes, or already controls, the npm package `graph-generator`, with a `bin` named `graph-generator` that runs a payload and then mimics a plausible error.
2. A curriculum author reads the README and adds `npx graph-generator export figures/circle.json --out src/figures/Circle.tsx` to a build script. Alternatively, they paste it into a terminal in a directory where `@gener8v/graph-generator` is not installed: a fresh clone before `pnpm install`, a monorepo root where the package is installed only in one workspace package, or a scratch directory.
3. In CI, or under any non-TTY runner, npx installs and runs the attacker's package with no prompt. In a terminal, the "Need to install the following packages: graph-generator@x.y.z" prompt shows the unscoped name, which looks right to someone following the README.

The attacker achieves arbitrary code execution with the user's or CI runner's permissions: repository tokens, npm publish tokens and cloud credentials in the environment are all exposed.
**Impact:** Code execution on developer machines and CI runners that follow the documented command. This is the package's own documentation steering users to code it does not control. Mitigating factors: the package is not yet published ("Nothing is published to npm yet"), and the line is safe whenever the scoped package is installed in the project being run.
**Recommendation:** Document the command so that it can only resolve to this package:
- `npx @gener8v/graph-generator export description.json …`, which works because the package has a single `bin` entry, and which npm resolves to the local install when present; or
- `npm exec --package=@gener8v/graph-generator -- graph-generator export …`; or
- `pnpm exec graph-generator export …` after `pnpm add -D @gener8v/graph-generator`, with that install step stated.

Also:
- Add a one-line install instruction.
- Apply the same wording anywhere else the command is documented (the docs site, if it repeats the README).
- Optionally, add a README check that every `npx` line names the scoped package (e.g. in `scripts/check-changesets.ts` or a docs lint).
**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-11-04): the README gives the install step (`npm install --save-dev @gener8v/graph-generator`) and writes every command as `npx @gener8v/graph-generator export …`; a test in `tests/package/checks.test.ts` requires every `npx` line in the README (and `docs/`, when it exists) to name the scoped package.

---

### SEC-002: The input file is read and parsed with no size bound; a large array exhausts memory or ends in a V8 fatal error with a native stack trace

**Severity:** Low
**Category:** Input Validation
**OWASP Reference:** A10:2025 Mishandling of Exceptional Conditions
**Location:** `src/cli.ts:71` (`readFileSync(file, "utf8")`), `src/cli.ts:77` (`JSON.parse(text)`)
**Description:** The command reads the whole file into one string and calls `JSON.parse` on it before any check. The validator's `DESCRIPTION_VALUE_LIMIT` of 10,000 values (`src/core/validate/structure.ts:16`) only applies after parsing has finished. Node bounds regular files at 2 GiB and strings at about 512 M characters, but neither bound limits the parsed object graph. Non-regular files (character devices, FIFOs) are read until end of file.

Probes against `dist/cli.js` on Node 24.1.0 (macOS):
- **60 MB file, 20 M empty objects under an unknown key:** exit 1 with the correct issue, but 2.58 GB maximum RSS and 2.5 s.
- **200 MB file, a 100 M-element array:** exit 133. stderr shows `# Fatal JavaScript invalid size error 104857601` and a 30-frame `----- Native stack trace -----`, each frame naming the absolute Node binary path (`/Users/thomas/.nvm/versions/node/v24.1.0/bin/node`). The `try/catch` around `JSON.parse` and the catch-all in `main` cannot intercept a V8 fatal error.
- **200 MB file, one 200 M-character `title`:** exit 1 with `too_large`, at 910 MB RSS.
- **`export /dev/zero`:** still reading at 1.35 GB RSS after 1.5 s when killed; it never reaches the parser.

The carried hazard (GSV TICKET-002 SEC-003) asks that the output carry no stack frames, and the test checks only the `EISDIR` path.
**Attack Scenario:** A pipeline exports description files it does not author: descriptions saved by a model-driven authoring tool, or contributed to a shared curriculum repository and exported by a CI job. An attacker who can place one file (a 200 MB `[0,0,…]` under any key, or a symlink named `description.json` pointing at `/dev/zero` or `/dev/urandom`) makes the export step use gigabytes of memory, or crash with a native stack trace that names absolute install paths and the runner's user name in the build log. The step fails either way, because the file is invalid. The attacker's gain is memory pressure on a shared runner and a few paths in a log.
**Impact:** Local denial of service of the export step and its runner, and disclosure of install paths and the user name through the native trace. No data is written; the exit status is non-zero in every case.
**Recommendation:** Bound the input before parsing:
1. Open the file and `fstatSync` the descriptor.
2. Refuse anything that is not a regular file, and anything larger than a fixed limit sized from the description limits. A few MiB covers 10,000 values at their maximum text lengths; for example, `MAX_INPUT_BYTES = 4 * 1024 * 1024`.
3. Refuse with a fixed sentence, e.g. `graph-generator: "<file>" is larger than 4 MiB; a description is smaller.`, exit 1.
4. Then read from the same descriptor (`readFileSync(fd, "utf8")`), so the check and the read see the same file.
5. Document the limit in `--help` and the README.
6. Add tests for an oversized file (exit 1, the fixed message, no file written, no `Native stack trace` or `#` fatal banner) and for a non-regular input such as a directory or FIFO.
**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed: the command opens the file (`O_RDONLY | O_NONBLOCK`, so a FIFO cannot block it), `fstat`s the descriptor, refuses a non-regular file and anything over `MAX_INPUT_BYTES` = 3 MiB with fixed sentences (exit 1, nothing written), then reads from the same descriptor. 3 MiB is 1.9× the largest valid description pretty-printed (the x,y ceiling with 200-character astral labels, 1,649,745 bytes). Documented in `--help` and the README. Tests: oversize, directory, FIFO — no native trace, fatal banner or stack frame — and the largest valid description accepted. Mutant (no size check) → the oversize test fails.

---

### SEC-003: The output is written through a symlink at the target, and `--out` may name the input file

**Severity:** Low
**Category:** Input Validation
**OWASP Reference:** A01:2025 Broken Access Control (CWE-59, link following)
**Location:** `src/cli.ts:87`, `src/cli.ts:89` (`writeFileSync(target, result.source, "utf8")`)
**Description:** `writeFileSync` opens the target with `O_CREAT|O_TRUNC` and follows a symlink in the final component. Overwriting an existing regular file is the approved behaviour (DEL-004). Following a link is not covered by that decision.

Probes:
- With `CircleGraph.tsx -> victim.txt` beside `d.json`, `graph-generator export d.json` printed `Wrote "CircleGraph.tsx".` and replaced `victim.txt` with the component source. The symlink was left in place.
- `graph-generator export d2.json --out d2.json` replaced the description with its component, exit 0. The description survives only as text in the header comment.

The write is also not atomic. A failure part-way through (ENOSPC, EIO) leaves a truncated target where the previous file was.
**Attack Scenario:** A contributor to a curriculum repository commits `figures/CircleGraph.tsx` as a symlink to a file the export job can write: a path outside the checkout such as the runner's `~/.npmrc`, a cached tool configuration, or another tracked file such as `package.json`. A maintainer or the CI job then runs `graph-generator export figures/circle.json`, and the command overwrites the link's target with the exported component text. The attacker controls only the description inside escaped literals and the header comment, so this gives clobbering, not chosen content.
**Impact:** Integrity and availability loss of any file the invoking user can write, reachable by whoever can plant a symlink in the description's directory. Separately, a slip in `--out` silently destroys the input description.
**Recommendation:**
- Write to a temporary file in the target's directory, opened exclusively (`flag: "wx"`, mode `0o666` minus the umask), then `renameSync` it over the target. `rename` replaces a symlink rather than following it, and the replacement becomes atomic. Remove the temporary file on any failure.
- Alternatively, `lstatSync` the target and refuse a symlink with a fixed sentence, or open it with `fs.constants.O_NOFOLLOW` (`O_WRONLY|O_CREAT|O_TRUNC|O_NOFOLLOW`; `ELOOP` maps to the existing `failure()` sentence).
- Refuse a target that is the input file: compare `st_dev` and `st_ino` from `statSync` when both exist, e.g. `graph-generator: --out names the description itself; nothing was written.`, exit 2.
- Add tests: a symlink at the default target is not followed, and `--out` equal to the input is refused.
**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed: the source is written to `<target>.<pid>.<random>.tmp` (`wx`) and renamed over the target, so a symlink at the target is replaced, not followed, and the write is atomic; the temp file is removed on failure. A target that is the input file (same dev and inode, or the same resolved path) is refused, exit 2. Tests: a symlink at the default target leaves its victim unchanged; `--out` as the input, a hard link, `./` and `sub/..` spellings are refused; no `.tmp` files remain. Mutants (direct write; no same-file check) → their tests fail. Not addressed: a replaced file takes the default mode, not the old file's.

---

### SEC-004: Windows reserved device names pass as `--name` and as the default file name

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** N/A
**Location:** `src/cli.ts:87`; `src/export/print.ts:8` (`COMPONENT_NAME`)
**Description:** `COMPONENT_NAME` (`^[A-Z][A-Za-z0-9]*$`) accepts `CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9` and `LPT1`–`LPT9`. Those are valid component names, but the CLI also uses the name as the default file name, `<Name>.tsx`. On Windows versions that treat a reserved name with an extension as the device, `--name NUL` or `--name CON` sends the source to the device. The command then prints `Wrote "…\NUL.tsx".` with exit 0, though no file exists. The delivery record already notes that Windows path handling was not checked.
**Attack Scenario:** N/A (Informational)
**Impact:** A misleading success message and a silently missing output file on Windows. No data exposure.
**Recommendation:** In the CLI only, when `--out` is absent and the name, compared case-insensitively, is a Windows reserved device name, refuse with a usage-style message asking for `--out`, or append a suffix. Leave `exportSource`'s name rule unchanged. Alternatively, state in `--help` and the README that the command is supported on POSIX systems only.
**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed: without `--out`, a component name that is a Windows reserved device name (any case) is refused with a request for `--out`, exit 2; `exportSource`'s rule is unchanged. A test.

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Fixed | scoped `npx` commands and install step; README check | No | `README.md`, `tests/package/checks.test.ts` |
| SEC-002 | Fixed | regular files of at most 3 MiB, read from one descriptor | No | `src/cli.ts`, `README.md`, `tests/cli/export.test.ts` |
| SEC-003 | Fixed | temp file and rename; same-file refusal | No | `src/cli.ts`, `tests/cli/export.test.ts` |
| SEC-004 | Fixed | reserved device names need `--out` | No | `src/cli.ts`, `tests/cli/export.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:** All four findings fixed in resolution and re-verified with mutants; the full verification loop passed. A replaced output file takes the default mode rather than the old file's (recorded, not a finding). The `minimatch` advisory in `pnpm audit` remains the accepted risk of CPSE TICKET-004 SEC-002.
