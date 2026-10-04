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

**Known Hazards:** None identified

**Depends On:** TICKET-005
**Blocks:** None

**Size:** Small
