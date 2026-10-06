# TICKET-006: Add the graph-generator export command

**Change:** graph-library
**Capability Area:** Component Packaging & Source Export (component-packaging-and-source-export)
**Specification:** specifications/component-packaging-and-source-export.md

**Summary:** Add the `graph-generator export <file.json> [--out <file.tsx>] [--name <Name>]` command that reads a description file and writes a component file through `exportSource`.
**Priority:** Must
**Value:** Authors can turn a saved description into a committed component file from the terminal or a build script.

**Requirements Covered:**
- CPSE-REQ-026: Source export as a function and as a command that reads a description file and writes a component file

**Prior Art:**
- Read: TICKET-005 output — `src/export/exportSource.ts`
- Read: TICKET-001 output — `package.json` (`bin` field)
- Read: `.gener8v/technical-design/system-design.md` — AD-001 (bin), AD-013, Interface Contracts "exportSource" (command exits non-zero and prints the issue summary)

**Acceptance Criteria:**
- [ ] `graph-generator export desc.json` writes `<Name>.tsx` next to the input, or to `--out`, using `--name` when given
- [ ] An invalid description prints each issue's path and message to stderr and exits with a non-zero status, writing no file
- [ ] An unreadable file or invalid JSON prints a clear message and exits non-zero
- [ ] `graph-generator --help` documents the command; the command runs on Node.js 22 and 24 with no React DOM installed
- [ ] The command uses no network access

**Output:**
- `src/cli.ts` — the command, wired to `package.json` `bin.graph-generator`
- `tests/cli/export.test.ts` — spawns the built command: success, `--out`, `--name`, invalid description, invalid JSON, help

**Constraints:** prd/TC-005, prd/TC-006, prd/CC-003

**Known Hazards:**
- Carried from graph-library/graph-specification-and-vocabulary-ticket-002-security-review/SEC-001: issue messages are neutralised at construction (`src/core/issues.ts` quotes non-term keys, escapes control, bidi and zero-width characters, and caps lengths), but `issue.path` is a faithful RFC 6901 pointer and may hold raw control characters from caller keys. Never print `path` raw to text output. Use one shared `formatIssue(issue)` that escapes `path` the same way and renders `<path>: <message>`; whichever of graph-library/component-packaging-and-source-export/TICKET-003, TICKET-006 and TICKET-007 lands first adds it to `src/core/` with tests, and the others reuse it.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-002-security-review/SEC-002: one description can produce tens of thousands of issues, and GSV-REQ-029 requires the validator to return them all (Product Owner decision 2026-10-05: no cap in the validator). The CLI prints at most the first 20 issues, then "…and N more", and add a test that 10,000 unknown keys produce output under a fixed size. Keep the structured `issues` array complete.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-002-security-review/SEC-003: never put exception text, `error.message` or `error.stack` into an issue or a message. An unexpected exception becomes `createIssue("internal_error", "", {})`, whose message is fixed; for `invalid_json`, pass only the JSON parser's message as `detail`. Add a test that a thrown internal exception yields no `file:`, `/node_modules/` or `    at ` frame in the output.

**Depends On:** TICKET-005
**Blocks:** None

**Size:** Small
