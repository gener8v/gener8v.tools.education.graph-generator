# TICKET-002: Issue codes and validation result types — Delivery Record

## Ticket Reference

**Ticket:** graph-library/graph-specification-and-vocabulary/TICKET-002
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/graph-specification-and-vocabulary.md`
**Requirements Covered:**
- GSV-REQ-027: The result states whether the description is valid
- GSV-REQ-029: An invalid result lists every issue with the path to the property
- GSV-REQ-030: Each issue carries a code from a fixed, documented set
- GSV-REQ-031: Each issue carries a plain-English message naming the property and the fix
- GSV-REQ-032: Each issue carries expected kind, allowed range, conflicting properties or suggested term where applicable
- GSV-REQ-033: Results are plain JSON data
- GSV-REQ-034: Issue codes are stable across non-major releases

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Cross-area predecessor CPSE TICKET-001 delivered | delivery record, Delivered | `component-packaging-and-source-export-ticket-001-delivery.md`, Delivered, verification passed (commit e4cc7e9) | ✅ |
| `src/core/index.ts` exists (Prior Art) | present | present, empty barrel with `@spec CPSE-REQ-006` | ✅ |
| `src/core/issues.ts`, `src/core/result.ts` absent (no conflict) | absent | absent | ✅ |
| Prior Art: specification Validation Results + Edge Cases | present | present, Approved | ✅ |
| Prior Art: design Data Model (ValidationResult, Issue, IssueCode set), AD-005, AD-015 | present | present, Approved | ✅ |
| Prior Art: dependency map RES-008 | present | present, Approved | ✅ |
| Lint boundary: `src/core` may not import React | rule in `eslint.config.js` | present | ✅ — this ticket imports nothing |
| NormalizedDescription type (for `ValidationResult.description`) | defined by GSV TICKET-001/004 | absent | ⚠️ Non-blocking — `ValidationResult` takes the description type as a parameter (see plan) |
| Predecessor reviews of CPSE TICKET-001 | read for carried findings | reviews running, no report written yet | ⚠️ Non-blocking — no carried findings exist yet; this ticket touches no CPSE TICKET-001 file except the `src/core/index.ts` barrel |

**Resolved from ground truth (not escalated):** None.

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas, 2026-10-05

Setup: branch `ticket/gsv-002` from `ticket/cpse-001` (`main` has no commits of its own yet).

### Planned Files

- `src/core/issues.ts`: `ISSUE_CODES` (frozen tuple of the 24 design codes) and `IssueCode` derived from it; `issueDocs: Record<IssueCode, string>` (`invalid_json` marked tool-handler-only, `internal_error` marked as a package defect, not a description problem); `issueMessage(code, params)` composing plain-English messages from the property's vocabulary term (e.g. "radius must be a number greater than 0; got -2"); `pointer(...segments)` building RFC 6901 JSON Pointers with `~` → `~0` and `/` → `~1`; `createIssue(code, path, params)` that sets the message and omits unused optional fields
- `src/core/result.ts`: `Issue` (`code`, `path`, `message`, optional `expected`, `range`, `conflicts`, `suggestion`, `allowed`); `Range` (`min`/`max`, `exclusiveMin`/`exclusiveMax` flags); `Provenance` (JSON Pointer → `"supplied" | "derived"`); `ValidationResult<D>` = `{ valid: true, description: D, provenance }` | `{ valid: false, issues: [Issue, ...Issue[]] }`; helpers `validResult()` and `invalidResult()`
- `src/core/index.ts`: re-exports
- `tests/core/issues.test.ts`: every code documented; frozen code-list snapshot with a breaking-change comment; every code's message names its property and the fix; JSON round-trip with omitted optional fields; pointer escaping; `invalidResult([])` rejected

### How Acceptance Criteria Will Be Met

- `IssueCode` union with the full initial set: `ISSUE_CODES` tuple; snapshot test
- `issueDocs` documents every code: completeness test
- `Issue` shape: `src/core/result.ts`; type-checked usage in tests
- `ValidationResult` shape with non-empty `issues`: tuple type; `invalidResult([])` throws in test
- Messages name the vocabulary term and the fix: test over every code
- JSON round-trip: test with `toEqual` after `JSON.parse(JSON.stringify(...))`
- Code-list snapshot fails on rename/removal: inline snapshot with comment
- Pointer escaping: test of `~`, `/`, numeric segments, empty path

Decisions to record: `ValidationResult` generic over the description type (normalized description arrives with GSV TICKET-001/004); `Range` uses exclusive flags.

## Progress

- [x] branch `ticket/gsv-002`
- [x] `src/core/result.ts`
- [x] `src/core/issues.ts`
- [x] `src/core/index.ts`
- [x] `tests/core/issues.test.ts`

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/core/result.ts`: `Issue`, `Range`, `Provenance`, `Issues` (non-empty tuple), `ValidationResult<D>`, `validResult()`, `invalidResult()` (throws on no issues)
- `src/core/issues.ts`: `ISSUE_CODES` (frozen, 24 codes), `IssueCode`, `issueDocs` (frozen), `IssueParams`, `issueMessage()`, `describeValue()`, `describeRange()`, `escapePointerToken()`, `pointer()`, `createIssue()`
- `src/core/index.ts`: re-exports the above from `./core`
- `tests/core/issues.test.ts`: 43 tests — code-list snapshot, documentation completeness, a message test per code, JSON round-trips, result shapes, pointer escaping

## Verification Run

Node.js v24.1.0, pnpm 10.28.2, React 19.3.0.

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm lint` | 0 | no findings (non-rendering boundary rules apply to `src/core`) |
| `pnpm typecheck` | 0 | no errors |
| `pnpm test` | 0 | 5 files, 153 tests passed (43 new in `tests/core/issues.test.ts`) |
| `pnpm build` | 0 | `dist/core/index.js` and `.d.ts` emitted |
| `pnpm check:dist` | 0 | no network APIs or modules in built files |
| `pnpm size` | 0 | `./core` 2.61 kB minified and gzipped (budget 25 kB) |
| `pnpm publint` | 0 | "All good!" |
| `pnpm attw` | 0 | no problems in the ESM-only profile |
| `pnpm check:deps` | 0 | 0 runtime dependencies |
| `pnpm check:changesets` | 0 | 0 changesets |

## Acceptance Criteria Verification

- [x] `IssueCode` is a string union containing the full initial set — `ISSUE_CODES` tuple; `tests/core/issues.test.ts` "is the fixed initial set from the design" (inline snapshot of all 24 codes)
- [x] `issueDocs` documents every code; a test fails if any code lacks documentation — "documents every code, and documents nothing else"
- [x] `Issue` has `code`, `path` (JSON Pointer), `message`, and optional `expected`, `range`, `conflicts`, `suggestion`, `allowed` — `src/core/result.ts`; `pnpm typecheck`; "carries expected kind, range, conflicts, suggestion and allowed values where they apply"
- [x] `ValidationResult` is `{ valid: true, description, provenance }` or `{ valid: false, issues }` with `issues` non-empty — `Issues` tuple type (`pnpm typecheck`); "states validity…", "lists every issue when invalid", "refuses an invalid result with no issues"
- [x] Message templates name the property by its vocabulary term and state what would make the value acceptable — 24 per-code tests ("names the property and says how to fix it"); "matches the ticket's example wording" asserts `radius must be a number greater than 0; got -2.`
- [x] A result survives `JSON.parse(JSON.stringify(result))` unchanged — "survives JSON round-trips for every code", "round-trips valid and invalid results", "omits optional fields that have no value"
- [x] A snapshot test of the code list fails when a code is renamed or removed, with a breaking-change comment — inline snapshot with the comment in "is the fixed initial set from the design"
- [x] JSON Pointer construction escapes `~` and `/` per RFC 6901 — "escapes ~ before /"

## Decisions Made

### DEL-001: `ValidationResult` is generic over the description type

**Context:** The valid branch carries the normalized description, whose type is defined by GSV TICKET-001 (definitions) and TICKET-004 (normalization), not yet delivered.
**Decision:** `ValidationResult<D = unknown>`; the validator instantiates `D` with its normalized description type.
**Rationale:** Lets this ticket fix the result shape now without inventing a description type the later tickets would have to replace.
**Ticket Impact:** GSV TICKET-003/004 return `ValidationResult<NormalizedDescription>`.

### DEL-002: `Range` expresses exclusivity with flags

**Context:** The design lists `range` as `{ min?, max?, exclusiveMin? }` without saying whether `exclusiveMin` is a number (JSON Schema 2020-12 style) or a flag.
**Decision:** `{ min?, max?, exclusiveMin?: boolean, exclusiveMax?: boolean }`; flags are omitted when false.
**Rationale:** One bound per side keeps messages simple ("greater than 0") and lets a caller read `min` without checking two fields. The schema generator (GSV TICKET-005) maps flags to `exclusiveMinimum`/`exclusiveMaximum`.
**Ticket Impact:** GSV TICKET-003 builds `Range` from `PropertySpec` bounds; GSV TICKET-005 translates it.

### DEL-003: `createIssue` builds every issue; `issueMessage` takes the vocabulary term from the caller

**Context:** The ticket asks for message templates and plain-JSON issues; stages 2–4 and the tool handler all create issues.
**Decision:** One `createIssue(code, path, params)` composes the message from `IssueParams` (with `term` required) and copies only the optional fields that have values. Messages never print `undefined`.
**Rationale:** A single constructor keeps every issue JSON-clean and every message in the same voice; callers supply the vocabulary term so messages use the description's own words.
**Ticket Impact:** Validator stages and type tickets call `createIssue` rather than building issue objects by hand.

## Deviations from Plan

None — implementation followed the approved plan. `describeValue`, `describeRange` and `escapePointerToken` are small helpers inside the planned `src/core/issues.ts`, exported for the validator stages.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| GSV-REQ-027 | `src/core/result.ts`:ValidationResult | `@spec GSV-REQ-027, GSV-REQ-029, GSV-REQ-033` |
| GSV-REQ-029 | `src/core/result.ts`:Issue, ValidationResult; `src/core/issues.ts`:pointer, createIssue | `@spec … GSV-REQ-029 …` |
| GSV-REQ-030 | `src/core/result.ts`:Issue; `src/core/issues.ts`:ISSUE_CODES, issueDocs | `@spec … GSV-REQ-030 …` |
| GSV-REQ-031 | `src/core/result.ts`:Issue; `src/core/issues.ts`:issueMessage, createIssue | `@spec … GSV-REQ-031 …` |
| GSV-REQ-032 | `src/core/result.ts`:Issue; `src/core/issues.ts`:createIssue | `@spec … GSV-REQ-032 …` |
| GSV-REQ-033 | `src/core/result.ts`:Issue, ValidationResult; `src/core/issues.ts`:createIssue | `@spec … GSV-REQ-033 …` |
| GSV-REQ-034 | `src/core/issues.ts`:ISSUE_CODES | `@spec GSV-REQ-030, GSV-REQ-034` |

## Notes

- **For GSV TICKET-003/004:** create issues only with `createIssue(code, pointer(...), { term, ... })`; pass the property's vocabulary term as `term` (for nested values, a readable path such as `points[2].x`), and `graphType` where the message reads better with it.
- **For type tickets (RES-008):** a new domain code goes into `ISSUE_CODES`, `issueDocs`, a `case` in `issueMessage` (TypeScript's exhaustive switch fails the build otherwise), a sample in `tests/core/issues.test.ts`, and the snapshot.
- **Messages for `contradiction`** name the other properties by their JSON Pointer (`/radius`); the validator may pass vocabulary terms in `conflicts` for display, but the `conflicts` field itself must hold pointers.

## Post-Review Amendments

None
