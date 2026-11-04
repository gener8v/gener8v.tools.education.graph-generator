# graph-library/component-packaging-and-source-export/TICKET-008: Publish the documentation site with a working example of every graph type — Quality Review

## Summary

Reviewed the Storybook documentation site: the generated stories, five doc components, five MDX pages, the examples test, the network spec, `docs.yml` and the supporting config. The code is small, typed and consistent with the repository, and the tables are built from `vocabulary.json`, `ISSUE_CODES` and `issueDocs`, so they cannot drift. The weaknesses are in the prose: the source-export page shows a file header that the real export does not produce, and the sample outputs and numeric limits in the pages are not checked by anything. Seven findings: 0 Critical, 2 Concerns, 5 Suggestions.

**Files Reviewed:**
- `.storybook/main.ts`, `.storybook/preview.ts`
- `scripts/generated-files.ts`, `scripts/generate.ts`, `docs/stories/examples.stories.tsx`
- `docs/components/ExamplePage.tsx`, `InputTable.tsx`, `ReferenceTables.tsx`, `RulerWidthNote.tsx`, `styles.ts`, `vocabulary.ts`
- `docs/components.mdx`, `docs/vocabulary.mdx`, `docs/issue-codes.mdx`, `docs/export.mdx`, `docs/model-tool.mdx`
- `tests/docs/examples-valid.test.ts`, `tests/e2e/docs-network.spec.ts`
- `.github/workflows/docs.yml`, `.github/workflows/ci.yml`, `package.json`, `tsconfig.json`, `README.md`

**Findings:** 7
**Critical:** 0 | **Concerns:** 2 | **Suggestions:** 5

## Quality Assessment

### Code Organization

**Rating:** Strong
**Notes:** One component per concern, with shared styles and a typed vocabulary import. The stories are generated from `examples/` so a new example gets a story from `pnpm generate`, and CI's freshness check now covers `docs/stories`. `.storybook/` and `docs/` are type-checked through `tsconfig.json`. The site imports from `src/`, not `dist/` (DEL-002), which is a reasonable and recorded choice. `docs.yml` builds the package first even though the site does not need it, because `tests/docs` imports the package source and some tests in the folder use `dist`. That is harmless.

### Readability

**Rating:** Strong
**Notes:** Functions are short and commented with what they return (`rows`, `kind`, `limits`, `accepts`, `leaf`). The only dense lines are the `typeof description === "object"` cast in `docs/components/ExamplePage.tsx:11` and the nested ternary sort in `docs/components/ReferenceTables.tsx:41`, neither worth a finding. The prose pages are plain and mostly consistent with the README and the code; see QR-001 for one inaccuracy and QR-007 for small style points.

### Error Handling

**Rating:** Adequate
**Notes:** The generator rejects example names that cannot become identifiers with a message that says what to do. `ExamplePage` renders the graph through `<Graph>`, which never throws, so an invalid description shows the fallback. `InputTable` guards a missing vocabulary entry. The static server in the network spec refuses paths outside the site and returns 404. One gap: a name that passes the regex but is a reserved word is not caught (QR-005).

### Test Coverage

**Rating:** Adequate
**Notes:** Commands run in `/Users/thomas/Repositories/gener8v/gg-cpse-008`:
- `npx tsc --noEmit`: exit 0.
- `npx eslint .`: exit 0.
- `npx vitest run --no-cache --maxWorkers=4 tests/docs tests/package`: 6 files, 218 tests, all passed.
- `npx storybook build -o <scratch>/site`: exit 0, "Storybook build completed successfully" (only a chunk-size warning). Built into the scratch directory; `git status` shows the worktree unchanged.
- Probe with `TSX_DISABLE_CACHE=1 npx tsx`: ran the page examples against `src/`. `validate`, `formatIssue`, `describe` and `handleGraphToolCall` output matched the pages. `exportSource` output did not match `docs/export.mdx` (QR-001).
- I did not re-run the Playwright network spec; the delivery record reports 78 passed.

The examples test checks every example, every counter-example and every ```json block in the pages, with a mutation-style test of the block reader. The network spec opens every index entry and fails on any outside request. What is not checked is the text that surrounds the JSON: sample outputs, numeric limits and the ts/tsx snippets (QR-002, QR-003, QR-004).

### Observability & Operability

**Rating:** Adequate
**Notes:** The network spec names the offending URL on failure, which is the main operational signal for the site. `docs.yml` builds and checks on every pull request and push, and the deploy waits for `vars.PAGES_ENABLED`, so a private repository does not fail the run. Actions are pinned to SHAs, as `ci.yml` does. The README links a URL that does not resolve until Pages is enabled (QR-006). The docs workflow runs the network check on Chromium only (QR-006).

## Findings

### QR-001: The source-export page shows a file header the export does not produce

**Category:** Maintainability
**Severity:** Concern
**Location:** `docs/export.mdx:50-73` (and the ASCII-only section at `docs/export.mdx:114-119`)
**Description:** The sample file on the page has `@gener8v/graph-generator` and `Aire du carré` with literal `@`, `é`, `“` and `”`. The real output, which I produced with `exportSource` for this description, writes `@gener8v/graph-generator`, `Aire du carré` and `“...”`, in the header comment as well as in the JSX. The page's own "ASCII only" section says every exported file is ASCII only and every `@` is escaped, so the sample contradicts the text a few lines below it.
**Impact:** A reader who copies the sample, or compares it with the file the command writes, sees a different file. The claim "renders the same markup" is true, but the page teaches the wrong text for the header and labels.
**Recommendation:** Show the real escaped text in the sample (`@gener8v/graph-generator <version>`, `carré`, `“`), or show it in full once and say that non-ASCII is escaped as in the section below. Better, check it (QR-002).
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-11-04): the export page shows the header `exportSource` prints (ASCII-only escapes).

---

### QR-002: Sample outputs in the pages are not checked by any test

**Category:** Testing
**Severity:** Concern
**Location:** `tests/docs/examples-valid.test.ts:34-39`; `docs/vocabulary.mdx:80`, `docs/issue-codes.mdx:41-54,68-71`, `docs/model-tool.mdx:32-43`, `docs/export.mdx:50-73`
**Description:** CPSE-REQ-046 is met for JSON descriptions, but the pages also give outputs as text: the `describe` string, the `formatIssue` lines, the issue object, the tool `summary` and the exported file. These are hand-written and no test runs the code and compares. QR-001 is the result: one of them is already wrong. The others matched when I ran them, but nothing keeps them matching when messages change.
**Impact:** Messages and issue text are edited often (the issue-code and plain-text work already changed them several times). The docs will drift quietly, and each wrong sample undermines the claim that every example works.
**Recommendation:** Add a small test beside the JSON-block check that runs the page examples (the circle `describe`, the `radius: -3` issue and `formatIssue` line, the tool summaries, the square export) and compares them with the strings on the page, or tag those blocks and read them. The test may read the block text and compare it to the call's result.
**Status:** Resolved
**Resolution:** Fixed: each sample on a page carries a `{/* sample: name */}` marker; `tests/docs/page-samples.test.ts` recomputes all seven and compares them, and fails on an unknown or missing marker. It found a second wrong sample (the bidi message on the issue-codes page), now fixed.

---

### QR-003: Numeric limits are repeated in prose rather than read from the package

**Category:** DRY
**Severity:** Suggestion
**Location:** `docs/components/ExamplePage.tsx:41-43`; `docs/vocabulary.mdx:32-36`; `docs/issue-codes.mdx:58-61`; `docs/export.mdx:98-99`; `docs/model-tool.mdx:154-163`
**Description:** The 200 and 20 character limits, the 10,000 values, the 20 printed issues, the 3 MiB file limit, `TOOL_INPUT_LIMIT` and `TEXT_ALTERNATIVE_LIMIT` appear as typed numbers. `vocabulary.json` already gives `maxLength` per term and `limits.descriptionValues`, and `LimitFacts` reads the last of these, so the pages mix generated and typed numbers. All the numbers I checked matched today.
**Impact:** A changed limit makes the docs wrong with no failing check. The mix also suggests all the numbers are generated.
**Recommendation:** Where a number is in the vocabulary, read it (the `200`/`20` in `ExamplePage` and the 10,000 on the issue-codes page). For constants that are not published (CLI and tool limits), add them to the QR-002 test or leave a comment on the page's source naming the constant.
**Status:** Resolved
**Resolution:** Fixed with code review CR-002: limits through `<Limit>`.

---

### QR-004: The ts and tsx snippets that use only this package are not type-checked

**Category:** Testing
**Severity:** Suggestion
**Location:** `docs/components.mdx:52-160`, `docs/vocabulary.mdx:75-83`, `docs/issue-codes.mdx:30-37`, `docs/export.mdx:28-39`
**Description:** The JSON blocks are validated, but the code that calls `Graph`, `createGraph`, `validate`, `formatIssue`, `describe` and `exportSource` is only read. The provider snippets cannot be checked without the SDKs, but these can.
**Impact:** A renamed export or changed result shape leaves the page showing code that does not compile.
**Recommendation:** Extract the package-only snippets in the same test and run `tsc` on them against `src/` (or the built types), or keep them as `.tsx` files under `docs/snippets/` that `pnpm typecheck` already covers and include them in the pages. Leave the provider snippets as they are.
**Status:** Resolved
**Resolution:** Fixed: `tests/docs/snippets-typecheck.test.ts` type-checks the ts/tsx snippets that import only this package, `react` or `node:*` (provider-SDK snippets excluded and named), with a self-test.

---

### QR-005: An example named like a reserved word generates an invalid story file

**Category:** Error Handling
**Severity:** Suggestion
**Location:** `scripts/generated-files.ts:20-24,38-41`
**Description:** The name check allows `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`, then uses the name as an identifier. A file such as `examples/class.json` or `default.json` passes and produces `import class from ...`, which fails at build time rather than at `pnpm generate`. A name that begins the same way as another after camel-casing cannot collide, because digits and hyphens map one to one, so only reserved words are affected.
**Impact:** Low: the example names are the twelve graph types and their variants. The error would appear in `docs:build` with a syntax message that does not name the file.
**Recommendation:** Prefix the import identifiers (for example `example` + PascalCase), which removes the case and keeps the exported story names unchanged.
**Status:** Resolved
**Resolution:** Fixed: story identifiers are prefixed when an example name starts with a digit or is a reserved name; collisions throw; `tests/docs/story-names.test.ts`.

---

### QR-006: The README links a site that does not exist yet, and the docs network check runs on one browser in CI

**Category:** Observability
**Severity:** Suggestion
**Location:** `README.md:16`; `.github/workflows/docs.yml:55-62`
**Description:** The README states `https://gener8v.github.io/gener8v.tools.education.graph-generator/` as the documentation, but Pages is not enabled and the repository is private, so the link returns 404. The delivery record states this and the deploy is gated. Separately, the delivery record's local run covered Chromium and WebKit, while `docs.yml` installs and runs Chromium only, and the `ci.yml` e2e job skips the spec because it does not build the site.
**Impact:** A reader who follows the link reaches an error page until Pages is enabled. The WebKit coverage that was reported locally is not repeated in CI.
**Recommendation:** Keep the link, but add a short note beside it (or in the changeset) that it is live once Pages is enabled, and close it out in TICKET-009. Either add `webkit` to the `docs.yml` install and `--project` list or say in the workflow comment that Chromium is enough because the check is about network requests.
**Status:** Resolved
**Resolution:** Fixed: the README says the site goes live once Pages is enabled; `docs.yml` runs the network spec on Chromium and WebKit.

---

### QR-007: Prose consistency and small wording points

**Category:** Readability
**Severity:** Suggestion
**Location:** `docs/vocabulary.mdx:30`; `docs/issue-codes.mdx:27,76`; `docs/model-tool.mdx:29,47-48,104-106`; `docs/components.mdx:27`
**Description:** The pages are plain and accurate against the README and the code. The ruler-width wording (about 130 px, about 11 px per centimetre) matches the README and `RulerGraph`, and the React 18 or 19 line matches `peerDependencies`. Small points:
- `docs/vocabulary.mdx:30` "Each list has its own most items, `maxItems`" is awkward; "Each list has its own maximum length, `maxItems`".
- `from \`./core\`` is used without the package name on `docs/issue-codes.mdx:27,76` and `docs/components.mdx:27`, while the code blocks use `@gener8v/graph-generator/core`; use the full specifier in prose, as the export page does.
- `docs/model-tool.mdx` says "Return `summary` to the model" twice (lines 29 and 47-48) and "code can test `issue.code`" on `docs/issue-codes.mdx:75` reads as a missing "your".
- The provider headings are "Anthropic", "OpenAI" and "Google", while the text and supported modes say "Gemini"; use one name.
**Impact:** Minor; none changes meaning. They matter because the pages are the package's public documentation.
**Recommendation:** Make the four wording edits.
**Status:** Resolved
**Resolution:** Fixed: the wording points, plus full `@gener8v/graph-generator/core` specifiers and "Gemini" for "Google".

---

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Fixed | real export header | `docs/export.mdx` |
| QR-002 | Fixed | sample-output test | `tests/docs/page-samples.test.ts`, `docs/*.mdx` |
| QR-003 | Fixed | limits from constants (CR-002) | `docs/components/Limit.tsx` |
| QR-004 | Fixed | snippet type-check | `tests/docs/snippets-typecheck.test.ts` |
| QR-005 | Fixed | safe story identifiers | `scripts/generated-files.ts`, `tests/docs/story-names.test.ts` |
| QR-006 | Fixed | README note; both browsers in docs.yml | `README.md`, `.github/workflows/docs.yml` |
| QR-007 | Fixed | wording | `docs/*.mdx` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (all seven fixed, 2026-11-04)
**Notes:** All findings fixed in resolution and re-verified.
