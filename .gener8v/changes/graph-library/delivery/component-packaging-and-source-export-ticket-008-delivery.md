# TICKET-008: Publish the documentation site with a working example of every graph type — Delivery Record

## Ticket Reference

**Ticket:** graph-library/component-packaging-and-source-export/TICKET-008
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/component-packaging-and-source-export.md`
**Requirements Covered:**
- CPSE-REQ-044: Documentation for every graph type with its inputs, a working example description and its rendered graph
- CPSE-REQ-045: Documentation of the vocabulary, issue codes, source export and model tool, each with a working example
- CPSE-REQ-046: Every documented example is validated as part of the checks

## Pre-Flight Reconciliation

**Verdict:** Go — the Engineer approved the Storybook dev dependencies and a deploy gated on `vars.PAGES_ENABLED` (2026-11-04)

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Predecessor TICKET-003 delivered | delivery record | Delivered and reviewed; `<Graph>` in `src/react/Graph.tsx` | ✅ |
| `examples/<type>.json` for every type | twelve types | 15 files covering all twelve (triangle ×4), plus `examples/invalid/` (10+) | ✅ — complete; DEP-008 / dependency-map OQ-004 no longer open |
| `src/generated/vocabulary.json`, `issueDocs` | present | present; no documentation tables are generated (carried CR-005) | ✅ — the plan builds tables from `vocabulary.json` |
| Source export and command | `./export`, `graph-generator` | CPSE TICKET-005, TICKET-006 delivered | ✅ |
| Model tool | `./tool` | CPSE TICKET-007 delivered (`d0ab514`, under review) | ✅ — its README section is the source for `docs/model-tool.mdx` |
| Storybook | dev dependency | **absent**: no `.storybook/`, no `storybook` in `package.json`; latest `storybook` / `@storybook/react-vite` 10.6.5 (peer `vite` ^5–8, `react` ^16.8–19; repo has vite 8.3, react 19.3) | ⚠️ To add — needs Engineer approval to install (`storybook`, `@storybook/react-vite`, `@storybook/addon-docs`) |
| GitHub Pages | enabled, public | **repository is private; Pages is not enabled** (`has_pages: false`) | ⚠️ `docs.yml` can be written and dry-run (build + upload artifact); deploying needs Pages enabled with source "GitHub Actions", which on a private repository needs a paid plan, or the repository made public (also needed by TICKET-009) |
| CI generate freshness check | `ci.yml` | checks `src/generated` and `tests/fixtures/generated` only | ⚠️ the generated stories file needs adding to that check |
| Ruler width hazard ("at least 330 px") | — | superseded by NLC TICKET-008: at least about 130 px for any ruler, about 11 px per cm past about 12 cm (README, `RulerGraph.tsx`) | 🔁 the docs use the current wording |
| Carried hazards (limits and plain-text policy, `describe`/`normalize` throw, schema up to U+FFFF, `formatIssue` in examples, request-size note, memoizing, ruler width, text limits, twelve types, per-type entries claim, CPSE TICKET-005 CR-002 automatic runtime and ASCII-only exports) | — | — | 🔁 Carried — in the plan |

**Resolved from ground truth (not escalated):** every graph type has an example, so the site is complete at delivery (DEP-008). The circle definition is a pure factory since CPSE TICKET-004, so the per-type entries claim can be made as `tests/package/per-type-bundle.test.ts` proves it.

**Blocking findings:** None for building and checking the site. Publishing it waits on Pages being enabled.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-11-04
**Implemented by:** opus · high — routed as deliver-large from Tower

Built in a worktree from `d0ab514` (CPSE TICKET-007), with its own `node_modules`.

### Planned Files

- Dev dependencies (exact): `storybook`, `@storybook/react-vite`, `@storybook/addon-docs` 10.6.5. Scripts: `docs` (`storybook dev`), `docs:build` (`storybook build -o storybook-static`).
- `.storybook/main.ts` (react-vite; stories `docs/**/*.mdx` and `docs/stories/*.stories.tsx`; addon-docs; telemetry off), `.storybook/preview.ts`.
- `scripts/generate.ts` → `docs/stories/examples.stories.tsx`, one story per `examples/<name>.json` (CSF needs static exports, so it is generated); CI's freshness check covers `docs/stories`.
- `docs/components/`: an example page — description JSON, rendered `<Graph>`, the type's input table from `vocabulary.json` (required, kind, range, values with `valueDescriptions`, `maxItems`, `maxLength`, `ordered`, derivation groups, checks).
- `docs/vocabulary.mdx` (tables from `vocabulary.json`; limits; plain-text policy; schema vs `validate`), `docs/issue-codes.mdx` (`issueDocs`; a `formatIssue` example, never a raw path), `docs/components.mdx` (props; validation on every render → memoize or `createGraph`; keep a request-size limit; ruler at least about 130 px, NLC TICKET-008 wording), `docs/export.mdx` (`exportSource` and `npx @gener8v/graph-generator export`; automatic JSX runtime; ASCII-only files), `docs/model-tool.mdx` (`graphTool` / `handleGraphToolCall`; Anthropic, OpenAI strict and Gemini `parametersJsonSchema` snippets, no SDK dependency; unsupported modes).
- `tests/docs/examples-valid.test.ts`: every `examples/*.json` valid, every `examples/invalid/*.json` invalid, every ```json block in `docs/*.mdx` valid.
- `tests/e2e/docs-network.spec.ts`: serves `storybook-static`; every request same-origin (skipped when not built).
- `.github/workflows/docs.yml`: PR and main — build, examples test, network check, upload the Pages artifact; the deploy job runs only when `vars.PAGES_ENABLED == 'true'`.
- `README.md`: a link to the site; `.gitignore` and the ESLint ignore list gain `storybook-static`.

### How Acceptance Criteria Will Be Met

- One story per example with JSON, graph and input table: the generated stories file and the example page; `docs:build` in CI.
- `docs/` pages for vocabulary, issue codes, export and the model tool: the five MDX pages.
- CI validates every example and every JSON block in `docs/`: `tests/docs/examples-valid.test.ts` in the test jobs.
- `docs.yml` builds and publishes from main; README links it: the workflow (deploy gated until Pages is enabled); README.
- No runtime requests beyond the site's own files: `tests/e2e/docs-network.spec.ts` in `docs.yml`.

## Progress

- [x] dependencies and scripts
- [x] `.storybook/main.ts`, `.storybook/preview.ts`
- [x] `scripts/generate.ts` and `docs/stories/examples.stories.tsx`; CI freshness check
- [x] `docs/components/`
- [x] `docs/*.mdx` (five pages)
- [x] `tests/docs/examples-valid.test.ts`
- [x] `tests/e2e/docs-network.spec.ts`
- [x] `.github/workflows/docs.yml`
- [x] `README.md`, `.gitignore`, ESLint ignore

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `package.json`, `pnpm-lock.yaml`: dev dependencies `storybook`, `@storybook/react-vite`, `@storybook/addon-docs` 10.6.5 (exact); scripts `docs`, `docs:build`.
- `.storybook/main.ts` (react-vite, addon-docs, telemetry and the "what's new" check off), `.storybook/preview.ts` (layout, page order).
- `scripts/generated-files.ts` (`exampleStories`), `scripts/generate.ts` (comment) → `docs/stories/examples.stories.tsx`, one story per `examples/*.json`; covered by the generated-files freshness test; `.github/workflows/ci.yml` freshness paths include `docs/stories`.
- `docs/components/`: `ExamplePage.tsx`, `InputTable.tsx`, `ReferenceTables.tsx`, `RulerWidthNote.tsx`, `styles.ts`, `vocabulary.ts` — every table built at render time from `vocabulary.json`, `ISSUE_CODES` and `issueDocs`.
- `docs/components.mdx`, `docs/vocabulary.mdx`, `docs/issue-codes.mdx`, `docs/export.mdx`, `docs/model-tool.mdx`.
- `tests/docs/examples-valid.test.ts` (44 tests); `tests/e2e/docs-network.spec.ts` (every index entry, Chromium and WebKit).
- `.github/workflows/docs.yml`: build, docs tests, site build, network check, Pages artifact; deploy only on main when `vars.PAGES_ENABLED == 'true'`.
- `tsconfig.json`: `docs` and `.storybook` included, so the doc components and generated stories are type-checked.
- The specification's CPSE-REQ-044..046 coverage rows.

## Verification Run

| Command | Exit | Evidence |
|---------|------|----------|
| full verification loop in the worktree, after rebasing onto `main` f1c7c83 (`pnpm generate`, `lint`, `typecheck`, vitest ×3, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `check:changesets`, `size`, `publint`, `attw`, `audit --prod`, state) | 0 | vitest 2,546 passed ×3; bench 25 passed |
| `pnpm audit` | 1 | the accepted dev-only `minimatch` advisory (CPSE TICKET-004 SEC-002) |
| `pnpm docs:build` | 0 | 20 index entries: Components, 15 graph-type stories, Vocabulary, Issue codes, Source export, Model tool |
| `DOCS_SITE_REQUIRED=1 npx playwright test` | 0 | 78 passed, the docs network spec on Chromium and WebKit included |
| gener8v-state lint | 0 | 0 errors with `storybook-static/` absent; with the built site present the plugin's lint crashes reading a binary file (`UnicodeDecodeError`), a plugin defect — `storybook-static/` is gitignored and CI does not run it |
| mutants (implementer, each restored): an invalid ```json block in `docs/export.mdx`; a Google Fonts link in `preview-head.html`; a stale stories file | — | the docs test fails at `docs/export.mdx:18`; the network spec fails naming `fonts.googleapis.com`; the freshness test fails and `pnpm generate` restores the file |
| `actionlint` on both workflows (implementer) | 0 | — |

## Acceptance Criteria Verification

- [x] One story per `examples/<type>.json`, generated, showing the JSON, the graph and the type's input table — the generated stories file (freshness test), `pnpm docs:build` (15 stories), the network spec opening each.
- [x] `docs/` pages for the vocabulary (generated tables), issue codes (`issueDocs`), source export (function and command) and the model tool (Anthropic, OpenAI and Google examples, no SDK in the package) — the five MDX pages; `pnpm check:deps`.
- [x] CI validates every `examples/*.json` and every JSON block in `docs/` — `tests/docs/examples-valid.test.ts` in the test jobs and in `docs.yml`.
- [ ] `docs.yml` publishes to GitHub Pages from main — **Unverified**: the build, checks and artifact upload run on every push; the deploy job waits for Pages to be enabled ("GitHub Actions" source) and `PAGES_ENABLED` set (the repository is private). The README links the site.
- [x] The site makes no runtime network requests beyond its own files — `tests/e2e/docs-network.spec.ts`, every page, Chromium and WebKit.

## Decisions Made

### DEL-001: Stories take the description as an arg

**Context:** Each story shows one example.
**Decision:** `file` and `description` args; the Controls panel edits the description live and the fallback lists an invalid one's issues.
**Rationale:** Readers can try a change without leaving the page.
**Ticket Impact:** None.

### DEL-002: The site imports from `src/`, not `dist/`

**Context:** Storybook bundles with Vite.
**Decision:** The docs import the package's source; the site does not depend on `pnpm build`.
**Rationale:** One build less in `docs.yml` ordering; the same code the tests run.
**Ticket Impact:** OC-005's "same build" is the same source at the same commit.

### DEL-003: `json` fences hold descriptions only

**Context:** The examples test validates every ```json block.
**Decision:** Tool inputs, issue objects and printed output use ```ts or ```text; no GFM tables in MDX (Storybook's MDX does not enable GFM).
**Rationale:** The check stays exact.
**Ticket Impact:** None.

### DEL-004: The network check serves the built site and is required only in `docs.yml`

**Context:** The e2e job in `ci.yml` does not build the site.
**Decision:** The spec is skipped when `storybook-static/` is absent unless `DOCS_SITE_REQUIRED=1`, which `docs.yml` sets.
**Rationale:** The check runs where the site is built.
**Ticket Impact:** None.

### DEL-005: Pages actions v5, pinned to commit SHAs

**Context:** `docs.yml` uploads and deploys the site.
**Decision:** `actions/upload-pages-artifact` v5.0.0 and `actions/deploy-pages` v5.0.1, pinned to SHAs as `ci.yml` pins its actions; deploy gated on `vars.PAGES_ENABLED`.
**Rationale:** Latest releases (checked with `gh api`); approved gating.
**Ticket Impact:** None.

## Deviations from Plan

- `tsconfig.json` includes `docs` and `.storybook` (not in the plan), so `pnpm typecheck` checks the doc components; it found a JSON-import typing error, fixed with a commented cast in `docs/components/vocabulary.ts`.
- The README link, `.gitignore` and ESLint ignore entries were already present at `d0ab514`; nothing to add.
- Built on `d0ab514`, then rebased onto `main` (f1c7c83) after CPSE TICKET-007's review fixes; the model-tool page carries those fixes' guidance (untrusted text fields, `summary` not `issues`, `internal_error`).

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| CPSE-REQ-044 | `scripts/generated-files.ts`:exampleStories; `docs/components/ExamplePage.tsx`; `docs/components/InputTable.tsx` | `@spec CPSE-REQ-044` |
| CPSE-REQ-045 | `docs/components/ReferenceTables.tsx` (five places) | `@spec CPSE-REQ-045` |
| CPSE-REQ-044, CPSE-REQ-045 | `.storybook/main.ts`; `docs/components/ReferenceTables.tsx` | `@spec CPSE-REQ-044, CPSE-REQ-045` |

CPSE-REQ-046 is verified by `tests/docs/examples-valid.test.ts`, not annotated in code.

## Notes

- Implemented by opus · high in a worktree (`../gg-cpse-008`) with its own `node_modules`.
- One network-spec run timed out once (Chromium, circle story) on the implementer's first run and never again in about 270 runs; watch it in CI.
- Publishing waits on Pages; TICKET-009 also needs the repository public.

## Post-Review Amendments

### graph-library/component-packaging-and-source-export-ticket-008 security review SEC-001..SEC-006, code review CR-001, CR-002, quality review QR-001..QR-007 (one commit: the fixes share lines)

**Change:**
- SEC-001 / SEC-004 / SEC-005: `docs` runs `storybook dev -p 6006 --disable-telemetry --no-version-updates`, `docs:build` runs `storybook build -o storybook-static --disable-telemetry`; `core.disableProjectJson: true`. **Correction to this record:** "telemetry and the what's-new check off" overstated it — `disableWhatsNewNotifications` only hid the notification; the dev server's fetch is now stopped by `--no-version-updates`, and a failing `main.ts` no longer reports a crash.
- SEC-002: `file` bound in each generated story's `render`; `.storybook/preview-head.html` drops channel messages from other origins. **DEL-001 is narrowed:** only `description` is a story arg.
- SEC-003 accepted: `pnpm audit` now also reports the dev-only `glob` advisory (GHSA-3g3m-2fjr-6pw4) and a second path to `minimatch`, both through Storybook's docgen plugin, not reached; accepted with CPSE TICKET-004 SEC-002. SEC-006: `pnpm exec playwright` in `docs.yml`.
- CR-001 deferred to CPSE TICKET-009 (Known Hazard): the first live deploy. CR-002 / QR-003: every limit through `<Limit>` from the package's constants (the command's two moved to a Node-free `src/cli-limits.ts`, re-exported from `src/cli.ts`); a test against hand-typed limits; a Playwright check that the built Source export page shows them; the checker reads unlabelled and code fences holding a description.
- QR-001: the real export header. QR-002: `tests/docs/page-samples.test.ts` recomputes the seven samples (it found a second wrong one). QR-004: `tests/docs/snippets-typecheck.test.ts`. QR-005: safe story identifiers (`tests/docs/story-names.test.ts`). QR-006: README note on Pages; network spec on Chromium and WebKit in `docs.yml`. QR-007: wording.
**Files:** `.storybook/main.ts`, `.storybook/preview-head.html` (new), `package.json` (scripts), `scripts/generated-files.ts`, `docs/stories/examples.stories.tsx`, `docs/*.mdx`, `docs/components/ExamplePage.tsx`, `docs/components/Limit.tsx` (new), `src/cli-limits.ts` (new), `src/cli.ts`, `README.md`, `.github/workflows/docs.yml`, `tests/docs/*` (three new), `tests/e2e/docs-network.spec.ts`, `.gener8v/changes/graph-library/tickets/component-packaging-and-source-export/TICKET-009.md`
**Re-verification:** `DOCS_SITE_REQUIRED=1 pnpm exec playwright test` — 80 passed (both browsers, the limits check included); the built site has no `project.json`; full verification loop — all exit 0 except `pnpm audit` (accepted advisories); vitest ×3, 2,571 passed each; bench 25 passed; gener8v-state lint 0 errors with `storybook-static/` removed. The reviewer's postmessage probe: injection blocked on the fixed build, working again with the filter removed. Mutants: a hand-typed "250 characters" → the limits test fails; a wrong tool-summary sample → the sample test fails; an unlabelled invalid description fence → the checker fails naming the page and line.
