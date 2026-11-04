# component-packaging-and-source-export/TICKET-008: Publish the documentation site with a working example of every graph type — Code Review

## Summary

Reviewed the documentation site (Storybook config, generated example stories, doc components, five MDX pages, docs validity test, network spec, docs workflow) against TICKET-008 and CPSE-REQ-044..046. The site builds, every example and JSON block validates, and the carried hazards are all addressed in the pages; the one gap is that publishing to Pages is gated and unverified, as the delivery record states. 2 findings: 0 Critical, 1 Issue, 1 Observation.

**Delivery Record:** `.gener8v/changes/graph-library/delivery/component-packaging-and-source-export-ticket-008-delivery.md`
**Files Reviewed:**
- `.storybook/main.ts`
- `.storybook/preview.ts`
- `scripts/generated-files.ts`
- `scripts/generate.ts`
- `docs/stories/examples.stories.tsx`
- `docs/components/ExamplePage.tsx`
- `docs/components/InputTable.tsx`
- `docs/components/ReferenceTables.tsx`
- `docs/components/RulerWidthNote.tsx`
- `docs/components/styles.ts`
- `docs/components/vocabulary.ts`
- `docs/components.mdx`
- `docs/vocabulary.mdx`
- `docs/issue-codes.mdx`
- `docs/export.mdx`
- `docs/model-tool.mdx`
- `tests/docs/examples-valid.test.ts`
- `tests/e2e/docs-network.spec.ts`
- `.github/workflows/docs.yml`
- `.github/workflows/ci.yml`
- `package.json`
- `tsconfig.json`

**Findings:** 2
**Critical:** 0 | **Issues:** 1 | **Observations:** 1

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| One story per `examples/<type>.json`, generated, showing JSON, graph and the type's input table | Yes | `scripts/generated-files.ts`:exampleStories writes `docs/stories/examples.stories.tsx` (15 stories); `docs/components/ExamplePage.tsx` renders JSON, `<Graph>`, `<InputTable>` from `vocabulary.json`; `ci.yml` freshness check now includes `docs/stories`; reviewer's `storybook build` succeeded |
| `docs/` pages: vocabulary (generated), issue codes (`issueDocs`), source export, model tool (Anthropic, OpenAI, Google; no SDK) | Yes | `docs/vocabulary.mdx`, `docs/issue-codes.mdx`, `docs/export.mdx`, `docs/model-tool.mdx` with tables from `docs/components/ReferenceTables.tsx`; `package.json` gains only Storybook dev dependencies, no provider SDK |
| CI test validates every `examples/*.json` and every JSON block in `docs/` | Yes | `tests/docs/examples-valid.test.ts` (44 tests pass on re-run); runs in the normal vitest jobs and in `docs.yml` |
| `docs.yml` builds and publishes to GitHub Pages from main; README links it | Partial | Build, checks and artifact upload present in `.github/workflows/docs.yml`; deploy job gated on `vars.PAGES_ENABLED == 'true'` and never run (Pages not enabled, repository private); README line 16 links the Pages URL — see CR-001 |
| No runtime network requests beyond the site's own files | Yes | `tests/e2e/docs-network.spec.ts` opens every index entry and fails on any foreign origin; `docs.yml` requires it (`DOCS_SITE_REQUIRED`); `.storybook/main.ts` turns off telemetry and the what's-new check. Not re-run by the reviewer (the spec reads `storybook-static/` inside the worktree, which the review rules forbid creating); the built site's only external strings are inside Storybook's own bundles |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| CPSE-REQ-044 | Each graph type: inputs, working example, rendered graph | `scripts/generated-files.ts`:exampleStories; `docs/components/ExamplePage.tsx`:ExamplePage; `docs/components/InputTable.tsx`:InputTable | Yes |
| CPSE-REQ-045 | Vocabulary, issue codes, source export, model tool, each with a working example | `docs/vocabulary.mdx`, `docs/issue-codes.mdx`, `docs/export.mdx`, `docs/model-tool.mdx`, `docs/components.mdx`; `docs/components/ReferenceTables.tsx` | Yes |
| CPSE-REQ-046 | Every documented example validated in the checks | `tests/docs/examples-valid.test.ts` | Yes |

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/OC-005 | Static, free hosting | Partial | Static site, free Pages target; publishing not yet live (CR-001) |
| prd/CC-003 | No runtime network requests / no data collection | Yes | Network spec; telemetry disabled in `.storybook/main.ts` |
| CPSE-REQ-029 (Known Hazard) | No provider SDK in `package.json` | Yes | `package.json` diff adds only `storybook`, `@storybook/*` dev dependencies; model-tool snippets are ```ts blocks |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-016 | Storybook static site on GitHub Pages | Partial | Storybook site built and uploaded as a Pages artifact; deploy gated (CR-001) |
| AD-003 | Generated files from definitions, freshness-checked | Yes | Stories file added to `generatedFiles()` and to the CI freshness paths; `pnpm generate` leaves the tree unchanged |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| CPSE-REQ-044 | `@spec CPSE-REQ-044` | `scripts/generated-files.ts`:exampleStories; `docs/components/ExamplePage.tsx`:ExamplePage; `docs/components/InputTable.tsx`:InputTable; `.storybook/main.ts` | Yes |
| CPSE-REQ-045 | `@spec CPSE-REQ-045` | `docs/components/ReferenceTables.tsx`; `.storybook/main.ts` | Yes |
| CPSE-REQ-046 | `@spec CPSE-REQ-046` | `tests/docs/examples-valid.test.ts` (describe block) | Yes |

**Coverage:** 3 of 3 requirements annotated
**Missing:** None
**Specification table:** Yes — `## @spec Coverage` lists rows for CPSE-REQ-044..046 at these locations. (The delivery record says REQ-046 carries no annotation; the test file does carry one, and the spec row matches. A harmless record inaccuracy.)

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `vitest run --no-cache --maxWorkers=4 tests/docs` (subset of the vitest loop) | 0 (44 passed) | Yes |
| `tsc --noEmit` (`pnpm typecheck`, includes `docs`, `.storybook`) | 0 | Yes |
| `eslint docs .storybook scripts tests/docs` | 0 (no output) | Yes |
| `pnpm generate` (freshness; `git status` clean afterwards) | 0 | Yes |
| `storybook build -o <scratch>/site` (`pnpm docs:build`, output redirected) | 0 | Yes |
| Full loop, `pnpm audit`, Playwright, gener8v-state lint | not re-run | Not re-run: the full loop and Playwright write into the worktree (`storybook-static/`, `dist/`); the subset above covers the ticket's own artifacts |

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | Description as a story arg lets readers edit live |
| DEL-002 | Reasonable | Importing `src/` is the code the tests run; but the site then does not exercise `dist/` exports, which `check:dist` covers elsewhere |
| DEL-003 | Reasonable | Keeps the validity check exact; the rule is enforced only by convention (see CR-002) |
| DEL-004 | Reasonable | Spec required only where the site is built |
| DEL-005 | Reasonable | SHA-pinned actions, consistent with `ci.yml` |

## Findings

### CR-001: Publication to GitHub Pages is not delivered or exercised

**Severity:** Issue
**Location:** `.github/workflows/docs.yml` (deploy job)
**Traces To:** TICKET-008 acceptance criterion 4; AD-016; prd/OC-005
**Description:** The criterion requires `docs.yml` to publish to GitHub Pages from main. The deploy job is gated on `vars.PAGES_ENABLED == 'true'` and Pages is not enabled (private repository), so the deploy step has never run and the README and `package.json` `homepage` link to a URL that does not exist yet. The delivery record marks the criterion Unverified, and the gating was approved.
**Impact:** The criterion is only partly met until Pages is enabled; a defect in the deploy job (environment, permissions, artifact path) would surface only on first use.
**Recommendation:** Defer to the release step (TICKET-009 also needs the repository public): enable Pages with source "GitHub Actions", set `PAGES_ENABLED`, and confirm the first deploy and the live URL. Record it as a Known Hazard on TICKET-009.
**Status:** Resolved
**Resolution:** Deferred (Engineer — Thomas Eaves, 2026-11-04) to graph-library/component-packaging-and-source-export/TICKET-009 as a Known Hazard: when that ticket makes the repository public, enable Pages, set `PAGES_ENABLED` and confirm a deploy from `main`; that run is the evidence for this ticket's fourth criterion, Unverified until then.

---

### CR-002: Text-limit figures are hard-coded in prose rather than read from the vocabulary

**Severity:** Observation
**Location:** `docs/components/ExamplePage.tsx:42`, `docs/vocabulary.mdx:32`, `docs/issue-codes.mdx:59`
**Traces To:** CPSE-REQ-044, CPSE-REQ-045; TICKET-008 Known Hazards (text limits, GSV-REQ-052..054)
**Description:** The per-term `maxLength` column is generated from `vocabulary.json`, but the sentences "at most 200 characters ... `unit` at most 20" are typed in three places. If a limit changes, the tables follow and the prose does not; no test compares them. Similarly, the JSON-block check recognises only ```json fences, so a future ~~~json or ```jsonc example would escape CPSE-REQ-046.
**Impact:** Documentation drift is possible but not present today; all figures match the vocabulary now.
**Recommendation:** Optional: derive the sentence from the vocabulary's limit constants, or add a test that the prose figures equal the vocabulary's; consider failing on any non-`ts`/`text` fence that parses as a description.
**Status:** Resolved
**Resolution:** Fixed: the pages state every limit through `<Limit name="…" />` (`docs/components/Limit.tsx`), read from the package's constants (the command's two from a new Node-free `src/cli-limits.ts`); a test fails on a hand-typed limit, and a Playwright check confirms the built Source export page shows them. The examples checker also reads unlabelled, `js`/`ts`/`text`, `~~~` and `jsonc` fences holding a description.

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Deferred | to CPSE TICKET-009 (Known Hazard) | `.gener8v/changes/graph-library/tickets/component-packaging-and-source-export/TICKET-009.md` |
| CR-002 | Fixed | limits from constants; more fences checked | `docs/components/Limit.tsx`, `src/cli-limits.ts`, `src/cli.ts`, `docs/*.mdx`, `tests/docs/*`, `tests/e2e/docs-network.spec.ts` |

## Verdict

**Result:** Approved with Notes
**Unresolved Findings:** 0 (CR-001 deferred to CPSE TICKET-009; CR-002 fixed, 2026-11-04)
**Notes:** The first live deploy is carried to the ticket that makes the repository public.
