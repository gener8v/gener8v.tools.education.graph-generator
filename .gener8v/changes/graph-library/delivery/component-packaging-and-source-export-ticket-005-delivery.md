# TICKET-005: Export a description as a standalone React component source file — Delivery Record

## Ticket Reference

**Ticket:** graph-library/component-packaging-and-source-export/TICKET-005
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/component-packaging-and-source-export.md`
**Requirements Covered:**
- CPSE-REQ-019: Export a valid description as the source of one standalone React component
- CPSE-REQ-020: The exported component renders the same graph as the package component
- CPSE-REQ-021: Exported source depends only on React
- CPSE-REQ-022: The exported component needs no inputs
- CPSE-REQ-023: Exported source records the package version and source description in a comment
- CPSE-REQ-024: Component name can be chosen, defaulting from the graph type
- CPSE-REQ-025: Refuse to export an invalid description and return its issues
- CPSE-NFR-001: For every graph type's example, the exported component renders markup identical to the package component — verified by a CI export-equality test

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Predecessors TICKET-002, TICKET-003 delivered | delivery records | both Delivered and reviewed; `main` at `69bec3f` | ✅ |
| One shared node-to-element mapping (hazard) | from TICKET-002 | `src/layout/scene.ts`: `ELEMENT_FOR_KIND`, `REACT_PROP`, `rootAttrs`, `textAlternativeFor`; `SceneSvg` uses them and names the exporter as their second user | ✅ |
| `createGraph` gives a checked Scene | `src/graph.ts` | present | ✅ |
| `componentName(type)` (hazard) | `src/react/createGraphComponent.tsx` | line 85; `line-graph` → `LineGraph` | ✅ — must not be imported into `src/export` from `src/react` if that pulls React in; see plan |
| `IMAGE_LICENSE_NOTICES` (hazard) | `src/images/types.ts` | present (MIT, joined literal) | ✅ |
| `src/export` boundary (no React, no browser globals) | lint rule | `eslint.config.js` `NON_RENDERING_DIRS` includes `export` | ✅ |
| `./export` entry and size budget | `src/export/index.ts`, `.size-limit.json` | an empty stub (`export {}`), 0 B, 25 kB budget | ✅ |
| Package version for the header | a constant | none: `package.json` `0.0.0`, nothing in `src/` reads it | ⚠️ To add — plan decision |
| `tests/export/` | to be created | absent | ✅ |
| Examples | every type | 15 files, all twelve types | ✅ |
| Carried: GSV TICKET-001 SEC-001, DGP TICKET-004 SEC-004 (hazards) | escaping; full MIT notice | — | 🔁 Carried — in the plan |

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-11-03
**Implemented by:** opus · high — routed as deliver-large from Tower

### Planned Files

- `src/export/print.ts`: `printScene(scene, name, header)` printing the `.tsx` source from the shared `ELEMENT_FOR_KIND`, `REACT_PROP`, `rootAttrs`, `textAlternativeFor` (no second mapping); every Scene string, text and attribute value, as a `JSON.stringify` literal in `{…}`, U+2028, U+2029 and invisible characters `\u`-escaped; no hooks; imports only from `react` if needed.
- `src/export/exportSource.ts`: `exportSource(description, options?)` → `{ ok: true, source }` or `{ ok: false, issues }`, never throwing; `componentName` read own-key only; an invalid name an issue at `/componentName`; default from `componentName(type)`; exported from `src/export/index.ts`.
- Header comment: package version; the description as JSON (`*/` as `*\/`, the same `\u` escapes); for a pictograph, each embedded image's name, author and full license notice from `IMAGE_LICENSE_NOTICES`.
- `componentName` moved to a React-free module (e.g. `src/core/definitions/names.ts`), re-exported from `src/react/createGraphComponent.tsx`, so `src/export` keeps its no-React boundary.
- `scripts/generate.ts` writes `src/generated/version.ts` from `package.json` (CI's freshness check catches it stale); a Known Hazard on CPSE TICKET-009: the release regenerates after the version bump.
- `tests/export/exportSource.test.ts`: shapes, default and invalid names, `line-graph` → `LineGraph`, determinism, header, only `react` imports, no hooks, a polluted `Object.prototype` cannot name the component, every `tests/fixtures/plain-text.ts` string rendered literally.
- `tests/export/equality.test.ts` (CPSE-NFR-001): every example's export compiled in memory with esbuild and rendered beside the package component with `renderToStaticMarkup`; identical strings.
- A pictograph test: the full MIT notice present and identical to `LICENSE`.
- `.size-limit.json`: `./export` within 25 kB.

### How Acceptance Criteria Will Be Met

- Result shapes, never throwing — `tests/export/exportSource.test.ts`.
- One TS file, header, React-only import, no hooks — the same, plus the equality compile.
- Default and invalid names — the same.
- Determinism — the same.
- Pictograph images and license — the pictograph test.
- CPSE-NFR-001 — `tests/export/equality.test.ts` over all 15 examples.
- `src/export` boundary — `pnpm lint`.

## Progress

- [x] `componentName` React-free module
- [x] `src/generated/version.ts` via `scripts/generate.ts`
- [x] `src/export/print.ts`
- [x] `src/export/exportSource.ts`, `src/export/index.ts`
- [x] `tests/export/exportSource.test.ts`
- [x] `tests/export/equality.test.ts`
- [x] Pictograph license test
- [x] CPSE TICKET-009 Known Hazard

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/export/print.ts`: `printScene(scene, componentName, header)` and `COMPONENT_NAME` — the `.tsx` source from the shared `ELEMENT_FOR_KIND`, `REACT_PROP`, `rootAttrs`, `textAlternativeFor`; numbers as numbers, every string as `{escapeChars(JSON.stringify(s))}`; header lines escaped and `*/` written `*\/`; refuses a non-PascalCase name, an unknown attribute, a non-name tag or prop, a non-finite number.
- `src/export/exportSource.ts`: `exportSource(description, options?)` → `{ ok: true, source }` / `{ ok: false, issues }`, never throwing (a printer throw becomes `internal_error`); options own-key only; an invalid name `wrong_kind` at `/componentName`; pictograph images named with author and license, each license's full notice printed once. Exported from `src/export/index.ts`.
- `src/core/definitions/names.ts`: `componentName`, React-free; re-exported from `src/react/createGraphComponent.tsx`.
- `scripts/generated-files.ts` `versionModule()` → `src/generated/version.ts` (`PACKAGE_VERSION`), covered by CI's freshness step.
- `src/core/issues.ts`: `escapeChars` exported (one escaping rule).
- `tests/export/exportSource.test.ts`, `tests/export/equality.test.ts`, `tests/helpers/exported.ts`; `tests/package/node-entry.test.ts` runs `exportSource` from `./export` in Node with React blocked.
- `.size-limit.json`: `./export` 65 kB (measured 52.05 kB); `.changeset/export-source.md` (`Added:`).

**Types covered:** all twelve, 15 examples — CPSE-NFR-001 closed for the change.

## Verification Run

Run in the main session on 2026-11-03, after the code was written; logs kept per command.

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm generate` / `pnpm lint` / `pnpm typecheck` | 0 / 0 / 0 | only the new `src/generated/version.ts`; a second run changes nothing |
| `npx vitest run --no-cache` ×3 | 0, 0, 0 | 2,398 passed each |
| `pnpm bench` | 0 | 25 passed |
| `pnpm build` / `check:dist` / `check:deps` / `check:images` / `check:changesets` / `size` / `publint` / `attw` | 0 each | `./export` 52.05 kB of 65; no React in its import chain; 13 changesets |
| `pnpm audit` / `pnpm audit --prod` | 1 / 0 | the accepted `minimatch` advisory |
| Equality (CPSE-NFR-001) | — | all 15 examples identical through `renderToStaticMarkup`, no React warnings; all 15 exports type-check as strict TypeScript |
| Mutation checks (restored) | — | a second `stroke-width` mapping → equality and the prop-table test fail; caller text unescaped → both plain-text tests fail; license notice dropped → the notice test fails; header unescaped → both plain-text tests fail |
| `gener8v-state.py state` / `lint` | 0 / 0 | 0 errors, 0 warnings |

## Acceptance Criteria Verification

- [x] `exportSource` returns the two shapes and never throws — `tests/export/exportSource.test.ts`.
- [x] One TypeScript file: header with version and description, then `export function <Name>()`; nothing imported (React's automatic JSX runtime), no hooks — the same and the type-check.
- [x] Default `<Pascal>Graph` from `componentName` (`line-graph` → `LineGraph`); an invalid name an issue at `/componentName` and no source — the same.
- [x] Byte-identical on repeat — the same.
- [x] Pictograph exports inline the drawings; the header names each image and carries the full license notice — the notice test (identical to `LICENSE`).
- [x] `tests/export/equality.test.ts` over every example — all 15 identical (CPSE-NFR-001).
- [x] `src/export` imports no `react-dom` or browser global — `pnpm lint`, the Node test with React blocked.

## Decisions Made

### DEL-001: `./export`'s size budget

**Context:** `exportSource` accepts every type, so `./export` carries every definition, layout and image; CPSE-NFR-002 budgets component imports only, and 25 kB was TICKET-001's placeholder.
**Decision:** 65 kB (measured 52.05 kB, about 1.2× rounded up), approved by the Engineer during delivery.

### DEL-002: An invalid component name is `wrong_kind`

**Decision:** No new issue code: `wrong_kind` at `/componentName` with `expected` naming a PascalCase identifier (`^[A-Z][A-Za-z0-9]*$`, ASCII). With an invalid description too, every issue comes back, the name's last.

### DEL-003: The header records the caller's input

**Decision:** `JSON.stringify(input, null, 2)`, not the normalized description — re-validating the normalized form would mark derived values as supplied and change the text alternative. The escaped JSON stays parseable (a test parses it).

### DEL-004: No import line; automatic JSX runtime

**Decision:** The file relies on React's automatic JSX runtime (React 17+), and its header says so.

### DEL-005: The version comes from a generated module

**Decision:** `src/generated/version.ts`, written by `pnpm generate` from `package.json`; CPSE TICKET-009 carries the hazard to regenerate after a version bump.

## Deviations from Plan

- `./export` budget 65 kB, not 25 kB (DEL-001).
- Extra: every export type-checked as strict TypeScript; the equality test also fails on any React `console.error` (a second mapping's hyphenated prop prints the same markup but warns); `escapeChars` exported from `src/core/issues.ts`.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| CPSE-REQ-019..023, CPSE-NFR-001 | `src/export/print.ts`:printScene | `@spec` |
| CPSE-REQ-019, CPSE-REQ-021..025 | `src/export/exportSource.ts`:exportSource | `@spec` |
| CPSE-REQ-024 | `src/core/definitions/names.ts`:componentName | `@spec` |
| CPSE-REQ-023 | `scripts/generated-files.ts`:versionModule | `@spec` |

## Notes

- Embedded images come from the pictograph's `unitImage`; a future type that embeds images must extend `embeddedImages`.

## Post-Review Amendments

### graph-library/component-packaging-and-source-export-ticket-005 security review SEC-001..SEC-003, quality review QR-001..QR-004, code review CR-001, CR-002 (one commit: the fixes share lines)

**Change:**
- SEC-001 (Critical) / SEC-003: `ascii()` in `src/export/print.ts` writes every UTF-16 unit outside printable ASCII, and every `@`, as `\uXXXX`, in the header and in every string literal. No caller text can form a JSX pragma (`@jsxImportSource`, `@jsxRuntime`, `@jsx`, `@jsxFrag`) or any other directive read from comments or raw text (`@ts-nocheck`, `/// <reference`, `sourceMappingURL`, `@jest-environment`, `@__PURE__`, `@license`, `@flow`), and every exported file is pure ASCII. The header's package name now prints as `\u0040gener8v/graph-generator`. `#` is not escaped (colors stay readable; `#!` only acts at the file's start, which is always `/*`). `escapeChars` is private to `src/core/issues.ts` again.
- SEC-002: `exportSource` validates the input as given, then serializes it once (a throw or `undefined` → `internal_error`) and checks, lays out and prints the parsed copy — header, validation and drawing come from one read. **DEL-003 is refined:** the header is the caller's input as serialized once, not a second read of it.
- QR-001: a `printScene` refusal table (11 cases) and a printer-throw test (`tests/export/exportSource-printer.test.ts`). The table found a defect: a kind with no element printed `<undefined />`; `name()` now checks `typeof` and `element()` accepts only the table's entries.
- QR-002: early return on an invalid description (issues, then the name's). QR-003: a test over every example's Scene asserts the header names each embedded image. QR-004: tidy-ups.
- CR-001 noted (`wrong_kind` stands, DEL-002). CR-002 noted and carried to CPSE TICKET-008 as a Known Hazard.
**Files:** `src/export/print.ts`, `src/export/exportSource.ts`, `src/core/issues.ts`, `tests/export/exportSource.test.ts`, `tests/export/exportSource-printer.test.ts` (new), `tests/export/equality.test.ts`, `tests/helpers/exported.ts`, `tests/fixtures/plain-text.ts`, `.gener8v/changes/graph-library/tickets/component-packaging-and-source-export/TICKET-008.md`
**Re-verification:** full verification loop with logs — all exit 0 except `pnpm audit` (accepted, CPSE TICKET-004 SEC-002); vitest ×3, 2,424 passed each; `pnpm bench` 25 passed; `./export` 52.2 kB of 65 kB. Each export compiled with esbuild and TypeScript and loaded allowing only `react/jsx-runtime`. Mutants: raw `@` → the export imports `data:text/javascript,…` and the pragma tests fail; a second read → both Proxy tests fail; non-ASCII left raw → four ASCII tests fail. gener8v-state lint 0 errors.
