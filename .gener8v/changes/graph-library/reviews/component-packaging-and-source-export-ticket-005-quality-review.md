# TICKET-005: Export a description as a standalone React component source file — Quality Review

## Summary

Reviewed `exportSource`, the JSX printer, the React-free `componentName`, the generated version module and the export tests at commit e0c30ac. The code is small, closely follows `SceneSvg` and the shared Scene mapping (no second table), escapes every caller string through one rule, and is well tested for equality, escaping and licensing. One Concern (the printer's own defensive refusals and the printer-throw path of `exportSource` have no test) and three Suggestions; nothing blocks the ticket.

**Files Reviewed:**
- `src/export/print.ts`
- `src/export/exportSource.ts`
- `src/export/index.ts`
- `src/core/definitions/names.ts`
- `src/core/issues.ts` (`escapeChars` export)
- `src/react/createGraphComponent.tsx` (re-export), `src/react/SceneSvg.tsx` (comparison)
- `scripts/generated-files.ts`, `src/generated/version.ts`
- `tests/export/exportSource.test.ts`
- `tests/export/equality.test.ts`
- `tests/helpers/exported.ts`
- `tests/package/node-entry.test.ts`

**Findings:** 4
**Critical:** 0 | **Concerns:** 1 | **Suggestions:** 3

## Quality Assessment

### Code Organization

**Rating:** Strong
**Notes:** Clear split: `print.ts` (Scene to text, no validation), `exportSource.ts` (validation, naming, header, never-throw boundary). `componentName` moved to a React-free module and re-exported, keeping the `src/export` no-React lint boundary; dependency direction is inward (export imports core/layout/images, never react). The printer reuses `ELEMENT_FOR_KIND`, `REACT_PROP`, `rootAttrs` and `textAlternativeFor`, and `SceneSvg`'s doc comment names the exporter as the second user. `escapeChars` is exported rather than copied (one escaping rule).

### Readability

**Rating:** Adequate
**Notes:** Functions are short, doc comments state intent and cite the security findings they honour. `printNode` mirrors `SceneSvg.toElement`. The one tangled spot is the issue-collection/narrowing sequence in `exportSource` (QR-002). `value()` has a parameter type and a runtime guard that disagree (QR-004).

### Error Handling

**Rating:** Strong
**Notes:** `exportSource` never throws: options read own-key only, a catch-all returns a fixed `internal_error` without leaking the message (consistent with GSV TICKET-002 SEC-003), invalid name and invalid description issues are combined. The printer validates names, props and numbers before emitting them and throws, which the boundary converts. The conversion path itself is untested (QR-001).

### Test Coverage

**Rating:** Adequate
**Notes:** Executed: `pnpm lint` exit 0; `pnpm typecheck` exit 0; `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache --maxWorkers=4 tests/export tests/package/node-entry.test.ts` exit 0, 3 files, 42 tests passed. Strong: equality over all 15 examples with a React-warning check, strict type-check of every export, the plain-text fixtures through both the printer and `exportSource`, the polluted-prototype case, license notice identical to `LICENSE`, repeat-run determinism, a Node run with React blocked. Gaps: the printer's refusal branches and the printer-throw path to `internal_error` are not exercised (QR-001).

### Observability & Operability

**Rating:** Adequate
**Notes:** A pure library with no logging in neighbouring modules, so none is expected. Failures are visible to the caller as typed issues with paths; an internal failure deliberately carries no cause, which is consistent with the codebase's information-leak policy but leaves a package defect indistinguishable from any other `internal_error`.

## Findings

### QR-001: The printer's defensive refusals and the printer-throw path are untested

**Category:** Testing
**Severity:** Concern
**Location:** `src/export/print.ts:29`, `src/export/print.ts:36`, `src/export/print.ts:39`, `src/export/print.ts:45`, `src/export/print.ts:86`; `src/export/exportSource.ts:90`
**Description:** `printScene` throws for a non-name tag/attribute, a non-finite number, a value that is neither string nor number, an attribute outside `REACT_PROP`, and a non-PascalCase component name. These are the guards that keep a malformed Scene from putting arbitrary text in a name position, yet no test calls `printScene` with such input (a grep for the messages in `tests/` finds none), and `exportSource`'s catch-all is exercised only by a throwing options getter, not by a printer failure. The delivery record's mutation checks covered escaping and mapping, not these guards.
**Impact:** The guards are security-relevant (name positions are the one place text is not a literal). Deleting or weakening one would pass the whole suite.
**Recommendation:** Add a short `printScene` test table: a node with an unknown attribute, a tag-less kind, `NaN`/`Infinity`, a name such as `"x onload"`, and `componentName` `"bad name"`, each expected to throw; and one `exportSource` test that makes the printer fail (for instance by mocking `../../src/export/print`) and expects `internal_error` with no message leaked.
**Status:** Resolved
**Resolution:** Fixed: a `printScene` refusal table of 11 cases (unknown attribute, `"x onload"`, tag-less kind, `"constructor"`, `"rect onload"`, NaN, ±Infinity, a boolean, names `"bad name"` and `"sample"`), each throwing `printScene: …`; and `tests/export/exportSource-printer.test.ts` mocks the printer to throw → `internal_error`, never a throw. The table found a defect — a tag-less kind printed `<undefined />` — fixed by checking `typeof` in `name()` and accepting only the table's own entries in `element()`.

---

### QR-002: Issue collection and narrowing in `exportSource` read as dead code

**Category:** Readability
**Severity:** Suggestion
**Location:** `src/export/exportSource.ts:82-87`
**Description:** The function builds `issues`, destructures `[first, ...rest]`, rebuilds `[first, ...rest]`, then checks `if (!graph.ok) return internalError()`, which is unreachable at runtime (a failed graph always has issues) and exists only to narrow the type. A reader must work out that this line is a type guard.
**Impact:** Small, but it is the heart of the never-fails contract and invites a wrong edit.
**Recommendation:** Return early on `!graph.ok` after appending the name issue (`return { ok: false, issues: [...graph.issues, ...nameIssues] }`), then handle a name issue alone; or comment the guard as a type narrowing only.
**Status:** Resolved
**Resolution:** Fixed: `exportSource` returns early with the description's issues then the name's; the narrowing-only code is gone.

---

### QR-003: Embedded-image lookup is hardcoded to the pictograph type with no guard for future types

**Category:** Maintainability
**Severity:** Suggestion
**Location:** `src/export/exportSource.ts:36-40`
**Description:** `embeddedImages` special-cases `description.type === "pictograph"` and casts to `Pictograph`; the delivery notes say a future image-embedding type must extend it. Nothing fails if one does not: its export would ship an image's drawing with no license notice (prd/CC-001).
**Impact:** A silent licence omission is the failure mode, and the only safeguard is a note in a delivery record.
**Recommendation:** Add a test that scans the layout/definition registry (or the Scene output of every example) for image-derived nodes and asserts the header names them, or give definitions an optional `embeddedImages` hook so the exporter does not name types.
**Status:** Resolved
**Resolution:** Fixed: a test scans every example's Scene for image drawings at any depth and asserts the header names each image with its author and license, and that at least one example embeds one.

---

### QR-004: Minor tidy-ups in `print.ts` and the export test

**Category:** Readability
**Severity:** Suggestion
**Location:** `src/export/print.ts:34-39`; `tests/export/exportSource.test.ts:169`
**Description:** `value(attr: AttrValue | string)` widens the type to `string` and then guards `typeof attr !== "string"` for a case the type excludes, which makes the signature and the guard disagree about what is possible (the guard is the correct defence for untyped input, so the signature should say `unknown`). Separately, a stray blank line precedes the closing `});` of the "the exported file" describe block.
**Impact:** Cosmetic; the first slightly obscures that the guard is deliberate.
**Recommendation:** Type the parameter `unknown` (or comment the guard as runtime defence) and remove the blank line.
**Status:** Resolved
**Resolution:** Fixed: `value(attr: unknown)` explains its type; stray blank line removed.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fixed | refusal table; printer-throw test; tag-less kind defect fixed | `src/export/print.ts`, `tests/export/exportSource.test.ts`, `tests/export/exportSource-printer.test.ts` |
| QR-002 | Fixed | early return | `src/export/exportSource.ts` |
| QR-003 | Fixed | image-naming test over every example | `tests/export/exportSource.test.ts` |
| QR-004 | Fixed | tidy-ups | `src/export/print.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (all four fixed, 2026-11-04)
**Notes:** All findings fixed in resolution and re-verified.
