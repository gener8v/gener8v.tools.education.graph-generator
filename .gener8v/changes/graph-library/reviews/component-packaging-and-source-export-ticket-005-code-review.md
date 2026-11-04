# TICKET-005: Export a description as a standalone React component source file — Code Review

## Summary

Reviewed `exportSource` and the JSX printer against TICKET-005, CPSE-REQ-019..025, CPSE-NFR-001, AD-002/008/012/013 and the `exportSource` contract. The printer has no mapping of its own: it imports `ELEMENT_FOR_KIND`, `REACT_PROP`, `rootAttrs` and `textAlternativeFor` from `src/layout/scene.ts`, the same four `SceneSvg` uses, and a repo-wide search finds no second table. The equality test walks every `examples/*.json` (15 files), first asserting all twelve graph types are present, and also fails on any React warning. All criteria and requirements are met; two Observations record small divergences from the design's wording.

**Delivery Record:** .gener8v/changes/graph-library/delivery/component-packaging-and-source-export-ticket-005-delivery.md
**Files Reviewed:**
- src/export/print.ts
- src/export/exportSource.ts
- src/export/index.ts
- src/core/definitions/names.ts
- src/core/issues.ts (escapeChars export)
- src/react/createGraphComponent.tsx (re-export)
- src/react/SceneSvg.tsx, src/layout/scene.ts (the shared mapping)
- src/generated/version.ts, scripts/generated-files.ts
- tests/export/exportSource.test.ts, tests/export/equality.test.ts, tests/helpers/exported.ts, tests/package/node-entry.test.ts
- .size-limit.json, .gener8v/specifications/component-packaging-and-source-export.md (@spec Coverage), CPSE TICKET-009 (Known Hazard)

**Findings:** 2
**Critical:** 0 | **Issues:** 0 | **Observations:** 2

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| `exportSource` returns `{ ok: true, source }` / `{ ok: false, issues }`, never throws | Yes | src/export/exportSource.ts:exportSource (try/catch to `internal_error`); tests "returns { ok: true…", "never throws" (fast-check), throwing-getter test |
| One TS file: header with version and description JSON, then `export function <Name>()`; imports nothing but React; no hooks | Yes | src/export/print.ts:printScene; headerFor in exportSource.ts; test "is one exported function component…" (regex, `required` is only `react/jsx-runtime`); strict type-check of all 15 exports |
| Default `<Pascal>Graph` (`line-graph` → `LineGraph`); invalid name an issue at `/componentName`, no source | Yes | src/core/definitions/names.ts:componentName; exportSource.ts:chosenName (own-key read); tests "default to…", "report a name that is not…", polluted-prototype test |
| Same description twice gives byte-identical source | Yes | test "is the same text every time…"; no clock, id or random in the printer |
| Pictograph inlines drawings; header says embedded and names license (CC-001) | Yes | exportSource.ts:embeddedImages/headerFor; pictograph describe block incl. full-notice test equal to `LICENSE` |
| `tests/export/equality.test.ts` over every `examples/*.json` | Yes | readdirSync of `examples/`, coverage-of-all-types test, `renderToStaticMarkup` string equality per example (15) plus zero `console.error` |
| `src/export` imports no `react-dom`/browser global | Yes | `pnpm lint` clean (re-run); Node test with React blocked in tests/package/node-entry.test.ts |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| CPSE-REQ-019 | Export a valid description as one component's source | src/export/exportSource.ts:exportSource; src/export/print.ts:printScene | Yes |
| CPSE-REQ-020 | Same graph as the package component | printScene via shared tables; tests/export/equality.test.ts | Yes |
| CPSE-REQ-021 | Depends only on React | printScene emits no import (automatic runtime); `loadExport` allows only `react/jsx-runtime` | Yes |
| CPSE-REQ-022 | No inputs | printScene: `export function Name()` with no parameters; text alternative from `textAlternativeFor(scene, undefined)` | Yes |
| CPSE-REQ-023 | Version and description in a comment | exportSource.ts:headerFor; src/generated/version.ts via scripts/generated-files.ts:versionModule | Yes |
| CPSE-REQ-024 | Chosen name, default from type | names.ts:componentName; exportSource.ts:chosenName | Yes |
| CPSE-REQ-025 | Refuse invalid description, return issues | exportSource.ts:exportSource (createGraph issues, name issue last) | Yes |
| CPSE-NFR-001 | Identical markup for every example, CI test | tests/export/equality.test.ts; ran in Verification (15 pass) | Yes |

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/TC-009 | Exported source holds computed markup and embedded images | Yes | printScene prints the laid-out Scene; no reference or URL (test) |
| prd/CC-001 | Embedded images carry license notice | Yes | headerFor prints `IMAGE_LICENSE_NOTICES[license]` once per license plus name, author; test equals `LICENSE` |
| prd/TC-005 | No React DOM or browser global in export | Yes | lint boundary; `componentName` moved to React-free names.ts |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-002 | Scene boundary; printers share the mapping | Yes | print.ts imports the four shared exports; no other table in `src/` |
| AD-008 | No id references | Yes | no `id`/`url(` in output; test asserts none |
| AD-012 | Pictograph images embedded in exports | Yes | image drawings are Scene nodes; header says embedded |
| AD-013 | `.tsx`, header, `<Pascal>Graph`, no hooks | Yes | see criteria; invalid-name issue code differs in wording only (CR-001) |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| CPSE-REQ-019..023, NFR-001 | `@spec` | src/export/print.ts:printScene | Yes |
| CPSE-REQ-019, 021..025 | `@spec` | src/export/exportSource.ts:exportSource | Yes |
| CPSE-REQ-024 | `@spec` | src/core/definitions/names.ts:componentName | Yes |
| CPSE-REQ-023 | `@spec` | scripts/generated-files.ts:versionModule | Yes |

**Coverage:** 8 of 8 (REQ-020 and NFR-001 are on `printScene`; the specification's table also points to the equality test)
**Missing:** none
**Specification table:** Yes — rows for CPSE-REQ-019..025 and CPSE-NFR-001 were added and match the code locations.

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache tests/export tests/package/node-entry.test.ts` (subset of the record's vitest run) | 0 (3 files, 42 tests passed) | Yes |
| `pnpm lint` | clean, no diagnostics | Yes |
| `pnpm typecheck` | clean, no diagnostics | Yes |
| `pnpm generate`, full vitest ×3, `pnpm bench`, build/size/publint/attw, audit | Not re-run (generate writes files; full suite and bench excluded by instruction) | Not re-checked |

Extra probes (scratch, removed): an unknown key, a getter-backed property and a `toJSON` property are each refused by `createGraph` before any header is built, so the header JSON is only ever plain validated data.

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | 65 kB vs the 25 kB placeholder; `./export` carries every type, and CPSE-NFR-002 budgets component imports only. Engineer approval recorded. |
| DEL-002 | Reasonable | `wrong_kind` at `/componentName` with an `expected` string; the design says "`out_of_range`-style", so see CR-001. |
| DEL-003 | Reasonable | Header holds the caller's input, not the normalized form; a test parses it back. Rationale (derived values would read as supplied) is sound. |
| DEL-004 | Reasonable | Automatic JSX runtime stated in the header; limitation noted in CR-002. |
| DEL-005 | Reasonable | Generated module with the CI freshness check; the TICKET-009 Known Hazard is present. |

## Findings

### CR-001: Invalid component name uses `wrong_kind`, the design names `out_of_range`

**Severity:** Observation
**Location:** src/export/exportSource.ts:chosenName
**Traces To:** system-design.md "exportSource" contract (Error Cases); CPSE-REQ-024; DEL-002
**Description:** The contract says an invalid name gives an "`out_of_range`-style issue on `/componentName`". The code returns `wrong_kind` at the right path, with `expected` describing the PascalCase rule. The ticket only requires an issue at `/componentName`, so the criterion is met.
**Impact:** None to behavior. A later command-line export (CPSE-REQ-026) and the design will quote a different code unless one is updated.
**Recommendation:** Add a line to the technical design (or TICKET-006's notes) stating that the code is `wrong_kind`, so the two agree.
**Status:** Resolved
**Resolution:** Noted (Engineer — Thomas Eaves, 2026-11-04): `wrong_kind` at `/componentName` stands, as recorded in the delivery's DEL-002; the command (CPSE TICKET-006) prints whatever issue `exportSource` returns, so nothing quotes a different code.

---

### CR-002: Exported file assumes the automatic JSX runtime and says so only in a comment

**Severity:** Observation
**Location:** src/export/print.ts:printScene; src/export/exportSource.ts:headerFor
**Traces To:** CPSE-REQ-021; AD-013; DEL-004
**Description:** The file has no import, so a project compiling with the classic JSX transform (`jsx: "react"`) fails with `React is not defined`. The header states the requirement, and the ticket allows the choice ("imports nothing except, if needed, from `react`"). The equality test and type-check use the automatic runtime only.
**Impact:** Low: React 17+ toolchains default to the automatic runtime. Older setups see a runtime error after copying the file.
**Recommendation:** Say it in the exported-source documentation (TICKET-007/008), or add a classic-runtime compile case to the helper if a mode is wanted later.
**Status:** Resolved
**Resolution:** Noted: the header states the automatic-runtime requirement (DEL-004); carried to CPSE TICKET-008 as a Known Hazard so the export documentation page says it.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Noted | `wrong_kind` stands (DEL-002) | — |
| CR-002 | Noted | carried to CPSE TICKET-008 documentation | `.gener8v/changes/graph-library/tickets/component-packaging-and-source-export/TICKET-008.md` |

## Verdict

**Result:** Approved with Notes
**Unresolved Findings:** 0 (CR-001 and CR-002 noted, 2026-11-04)
**Notes:** Both observations noted in resolution; CR-002 is carried to CPSE TICKET-008's documentation.
