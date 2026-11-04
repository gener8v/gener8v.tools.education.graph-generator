# TICKET-008: Publish the documentation site with a working example of every graph type — Security Review

## Summary

Reviewed the Storybook documentation site delivered for graph-library/component-packaging-and-source-export/TICKET-008. That covers the three new Storybook dev dependencies and their 170 new lockfile package versions, the `.storybook/` configuration, the generated stories file and its generator, the doc components, the five MDX pages and the snippets readers copy, the docs tests, and `.github/workflows/docs.yml`. The package's runtime code (`src/`) is unchanged. The site is static: it loads nothing from outside its own files, the manager's own routes included, and has no raw-HTML sink. The workflow is sound: `pull_request` only, a read-only token, SHA-pinned actions, and `pages: write` / `id-token: write` only on a deploy job gated to `main` and `vars.PAGES_ENABLED`. No new package runs an install script.

There are six findings: three Low and three Informational. The probes found the following:
- **SEC-001:** Storybook still sends a full crash report to `storybook.js.org` when `main.ts` fails to evaluate, in spite of `core.disableTelemetry: true`. A capture server received it.
- **SEC-002:** On the built site, another origin can rewrite an example page's title, graph and caption through Storybook's postMessage channel, and a crafted `?args=` link can change the caption. This is text-only content spoofing on the official site.
- **SEC-003:** The new dependency tree brings a second dev-only advisory (`glob`), and its code path is not reached. The delivery record's audit row names only `minimatch`.

**Reviewer:** `security-reviewer` agent, fresh context (findings phase only, 2026-11-04)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/component-packaging-and-source-export-ticket-008-delivery.md` (DEL-001..005, no Post-Review Amendments yet)
**Commit reviewed:** `e982da3` (diff `f1c7c83..e982da3`), worktree `../gg-cpse-008`, branch `ticket/graph-library-cpse-008`

**Files Reviewed:**
- `package.json` (scripts `docs`, `docs:build`; dev dependencies; `pnpm.onlyBuiltDependencies`, `pnpm.overrides`)
- `pnpm-lock.yaml` (the `storybook`, `@storybook/*` 10.6.5 trees and their transitive entries)
- `.storybook/main.ts`
- `.storybook/preview.ts`
- `.github/workflows/docs.yml`
- `.github/workflows/ci.yml` (the freshness-check path change; the rest read unchanged)
- `.github/dependabot.yml` (read, unchanged)
- `scripts/generated-files.ts` (`exampleStories`, `identifier`)
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
- `tsconfig.json`
- Storybook 10.6.5 internals that decide the findings: `node_modules/storybook/dist/_node-chunks/chunk-AZLAKLIP.js` (`withTelemetry`, `getErrorLevel`, `sendTelemetryError`), `node_modules/storybook/dist/_node-chunks/chunk-MCZW7I35.js` (`telemetry`, `sendTelemetry`), `node_modules/storybook/dist/channels/index.js` (`PostMessageTransport`, `getOriginValidator`), `node_modules/storybook/dist/core-server/presets/common-preset.js` (`initializeWhatsNew`), `node_modules/storybook/dist/core-server/index.js` (`updateCheck`, `disableProjectJson`), `node_modules/storybook/dist/manager-api/index.js` (the what's-new module's `init`)

**Findings:** 6
**Critical:** 0 | **High:** 0 | **Medium:** 0 | **Low:** 3 | **Informational:** 3

## Verification Evidence

All builds and probes ran from scratch directories outside the worktree (`/private/tmp/claude-501/…/scratchpad/review-cpse008-sec/`). `git status` was compared before and after: the only new worktree files are the parallel code and quality reviewers' reports.

| Command | Exit | Result |
|---------|------|--------|
| `pnpm audit` (pnpm 10.28.2, 2026-11-04 17:33 UTC) | 1 | 2 moderate: GHSA-g3hv-75wg-m249 `minimatch` 10.2.6 (<11.0.1) and GHSA-3g3m-2fjr-6pw4 `glob` 13.0.6 (>=9.0.0 <=14.0.1). Both are reported on the path `.>@storybook/react-vite>@joshwooding/vite-plugin-react-docgen-typescript>glob`. `minimatch` 10.2.6 is also still reached through `eslint` (SEC-003) |
| `pnpm audit --prod` | 0 | No known vulnerabilities found |
| lifecycle-script scan of every installed package's `package.json` (`preinstall`, `install`, `postinstall`, `prepare`) | 0 | Only `esbuild@0.28.2` has an install script (`postinstall`), already in `onlyBuiltDependencies`. Every other hit is `prepare`, which does not run for registry tarballs. None of the 170 new lockfile package versions adds an install script |
| `gh api repos/<action>/git/ref/tags/<tag>` | 0 | `actions/upload-pages-artifact` v5.0.0 → `fc324d3547104276b827a68afc52ff2a11cc49c9` and `actions/deploy-pages` v5.0.1 → `368f82528645a54fb793d4d04e342629a3f51346`, both matching the pins. The upload action's own `actions/upload-artifact` is SHA-pinned (v7.0.0) and its `tar` excludes `.git`, `.github` and dot-files |
| `pnpm exec storybook build -o <scratch>/site` | 0 | 20 index entries. No `*.map` files, and no absolute path (`/Users/…`, `/home/runner`, the scratch path) anywhere in the output. No secret-shaped strings. The only inlined config is `window.FEATURES`, `CONFIG_TYPE = "PRODUCTION"`, the builder and framework names. `project.json` is present (SEC-005) |
| static scan of the build for `fetch(`, `new WebSocket(`, `sendBeacon`, `EventSource` | 0 | Every `fetch` uses a relative URL (`./index.json`, `./services/…`, module preloads). The WebSocket is the dev-mode channel and is not used when `CONFIG_TYPE` is `PRODUCTION`. The external hosts in the bundles are documentation links inside error messages |
| Playwright probe: the built site's manager routes `/settings/about`, `/settings/whats-new`, `/settings/shortcuts`, `/settings/guide`, `/onboarding`, `?onboarding=true`, a pictograph story with its Controls tab, with every non-site request aborted | 0 | No request outside the site on any route |
| Capture server on `127.0.0.1:47123` + `STORYBOOK_TELEMETRY_URL` + `CI=1`; `storybook build` with the delivered config | 0 | **0 events** — `core.disableTelemetry` holds for a build that loads `main.ts` |
| Same capture, `storybook build -c <scratch>/badcfg` (a copy of the config with a syntax error in `main.ts`, `disableTelemetry: true` still in it) | 1 | **1 `error` event POSTed** with the full error: `MainFileEvaluationError`, the source line `"this is a syntax error"`, the config path, the stack, an `anonymousId`, `projectSince`, `inCI: true`, platform, Node version, and the project metadata (SEC-001) |
| Same broken build with `STORYBOOK_DISABLE_TELEMETRY=1` | 1 | **0 events** — the CLI-level opt-out suppresses it |
| Playwright probe: URL args on `iframe.html?id=graph-types--circle&args=…` and `index.html?path=/story/graph-types--circle&args=…` | 0 | `description.title:…`, `description.type:…` and an HTML payload are not applied. `file:Call+555-0100+to+unlock` **is** applied: the caption reads `examples/Call 555-0100 to unlock`. No dialog fired (SEC-002) |
| Playwright probe: a page on `http://localhost:<port>` opens the site (`http://127.0.0.1:<port>`) in a new tab and posts a `storybook-channel` `updateStoryArgs` message to `w.frames[i]` | 0 | The real-origin tab's circle page shows caption `examples/NOTICE.json` and `aria-label` "A circle titled “Your school account is locked. Call 555-0100 with your password.” with radius 3."; the title is drawn in the SVG (SEC-002) |
| `npx vitest run tests/docs --no-cache --maxWorkers=4` | 0 | 44 passed |
| `grep` of `src/`, `docs/`, `.storybook/` for `dangerouslySetInnerHTML`, `innerHTML`, `eval(`, `new Function` | 1 | None found |
| `grep` of `docs/*.mdx` for `npx`, API keys, tokens, secrets, `Bearer`, `process.env` | — | Only `npx @gener8v/graph-generator export …` (scoped) and `max_tokens`. No credential or key in any snippet |

## Security Assessment

### Input Validation

**Status:** Gaps Found
**Notes:**
- **Generator (`scripts/generated-files.ts`).** `exampleStories` turns `examples/*.json` file names into identifiers and import paths in generated TypeScript. Every name must match `^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$` before it is used, and string literals are written with `JSON.stringify`. So a crafted file name cannot inject code into `docs/stories/examples.stories.tsx`, and CI's freshness check catches a hand-edited file.
- **Doc components.** They render through React only: text children, `<code>` and attribute values, with no `dangerouslySetInnerHTML` (grep above).
  - `ExamplePage` sends the `description` arg to `<Graph>`, which validates it on every render and applies the plain-text policy.
  - `JSON.stringify(description)` is rendered as a text child.
  - Vocabulary, `issueDocs` and the `withCode` backtick splitter all render package-controlled text as React text.
- **Controls panel.** A reader's own edits to the description are self-input and render as escaped text: no XSS.
- **External control of story args (SEC-002).** Two ways in:
  - The `file` arg is a plain string that Storybook accepts from the URL (`?args=file:…`, characters limited to `[A-Za-z0-9 _-]`).
  - The built preview iframe accepts channel messages from any origin, so a page on another origin can replace both `file` and `description` on the real site. Everything injected is still React-escaped text; for the description it also has to pass the validator.
- **Network spec's test server (`tests/e2e/docs-network.spec.ts`).** It resolves paths and checks that they stay inside `storybook-static/`, and it binds to `127.0.0.1`. A malformed `%` escape would throw inside the test only.

### Authentication & Authorization

**Status:** Not Applicable
**Notes:**
- The site is public, static and anonymous. It has no login, session, cookie or user data, so content spoofing (SEC-002) cannot reach any account or token.
- In the workflow:
  - The default token is `contents: read`, with `persist-credentials: false`.
  - The trigger is `pull_request`, never `pull_request_target`, so fork PRs run without secrets and with a read-only token.
  - `pages: write` and `id-token: write` exist only on the `deploy` job, which runs only for `refs/heads/main` and `vars.PAGES_ENABLED == 'true'`. A pull request's ref is `refs/pull/N/merge`, and a fork cannot set repository variables.
  - Deploys go through the `github-pages` environment, whose default branch policy (once Pages is enabled with the "GitHub Actions" source) admits only `main`.
  - The deploy job checks out nothing and runs only `deploy-pages` on this run's artifact.

### Data Protection

**Status:** Gaps Found
**Notes:**
- **The site at runtime.** It transmits nothing: no request outside its own files, on any page, story or manager route. The fonts are self-hosted `nunito-sans-*.woff2` and the doc components use system fonts. Storybook keeps its UI state in the browser's own storage and sends it nowhere.
- **The artifact.** No source maps, no absolute paths, no environment values; `pnpm docs:build` inlines no `STORYBOOK_*` or `VITE_*` variables, and none are set in `docs.yml`. It does publish Storybook's `project.json` (toolchain versions, timestamps): no secret, but unneeded (SEC-005).
- **Build and dev tooling.** Storybook can still send data off the machine:
  - a full crash report from CI or a developer machine whenever `main.ts` fails to evaluate (SEC-001);
  - from the dev server, a daily `versions.json` check and a `whats-new/v1` fetch on every manager load (SEC-004).
- **Docs snippets.** No snippet holds a credential. The provider snippets take a reader's own `client`/`ai` and `model`. The model-tool page tells readers to return `summary` rather than `issues`, and to escape model-written text and treat it as data. The export snippet writes to `${result.componentName}.tsx`, a validated PascalCase identifier, so a description cannot steer the path.

### Configuration Security

**Status:** Gaps Found
**Notes:**
- **Actions and install.** Actions are pinned to verified commit SHAs, and Dependabot (`github-actions` weekly) proposes updates. The three Storybook packages are pinned exactly. The lockfile carries integrity hashes, and installs run `--frozen-lockfile` with build scripts limited to `esbuild` (`onlyBuiltDependencies`).
- **`main.ts` claims.** It says "No telemetry, and no 'what's new' check against storybook.js.org". The first holds only while `main.ts` evaluates (SEC-001). The second is not true: `disableWhatsNewNotifications` hides the notification but not the fetch (SEC-004).
- **`npx` in `docs.yml`.** It runs `npx playwright …`, while `ci.yml` uses `pnpm exec playwright …` (SEC-006).
- **Response headers.** GitHub Pages lets the site set none: no CSP, `frame-ancestors`, X-Frame-Options or COOP. That is why another origin can frame the site, or open it and post into its preview frame (SEC-002). The site holds no state a click could change, so framing alone is not a finding.
- **Concurrency.** `cancel-in-progress: true` on `docs-${{ github.ref }}` can cancel a deploy already in progress on `main` when a newer push lands. That affects availability, not security, so it is not a finding.

### Dependencies

- **Tool:** `pnpm audit` and `pnpm audit --prod` (pnpm 10.28.2), run 2026-11-04 17:33 UTC.
- **Full tree:** 2 moderate, exit 1, both dev-only (SEC-003):
  - GHSA-g3hv-75wg-m249 (`minimatch` 10.2.6), now reached also through the Storybook docgen plugin. It was already accepted through `eslint` as CPSE TICKET-004 SEC-002.
  - GHSA-3g3m-2fjr-6pw4 (`glob` 13.0.6), new with this ticket and published 2026-10-30 23:09 UTC, before this delivery. The delivery record's `pnpm audit` row names only the `minimatch` advisory.
- **Production tree:** no known vulnerabilities, exit 0.
- **New dependency surface:** 170 new lockfile package versions, 37 of them per-platform native bindings (`@oxc-parser/binding-*`, `@oxc-resolver/binding-*`) of which one installs per platform. None adds an install script. All are dev dependencies; the published package's `dependencies` are unchanged (`pnpm check:deps` in the delivery's Verification Run).

### Compliance Cross-Reference (`.gener8v/constraints/prd.md`)

- **CC-003 (the package must not collect, transmit or store any data; rules out remote fonts and telemetry):**
  - **The package:** `src/` is untouched, and the docs import the package's source.
  - **The site:** it requests nothing outside its own files, by the network spec and by this review's route probe. No CC-003 violation in either.
  - **The build tooling:** Storybook's crash report (SEC-001) and the dev server's version and what's-new fetches (SEC-004) come from developer and CI tooling, not from the package or from a reader's browser. As written, CC-003 binds the package, so neither is raised to Critical. Both contradict the constraint's intent (no telemetry) and the delivery's "telemetry … off" claim. Resolution should decide whether CC-003's scope covers the project's own tooling. If it does, SEC-001 becomes a CC-003 violation.
  - **Hosting:** GitHub Pages, as host, keeps its own access logs of visitors. The site adds no analytics, cookies or third-party requests. This was the choice made in OC-005/AD-016 and is noted here, not raised.
- **OC-005 (static, free hosting):** met. A static `storybook-static/` is deployed to GitHub Pages, and DEL-002 builds the examples from the same source at the same commit.
- **CC-001, CC-002, CC-004:** no runtime dependency, image or rendered output changed.
- No CC violation found.

## Findings

### SEC-001: Storybook sends a full crash report to storybook.js.org when `main.ts` fails to evaluate, in spite of `core.disableTelemetry: true`

**Severity:** Low
**Category:** Data Exposure
**OWASP Reference:** A02:2025 Security Misconfiguration
**Location:**
- `.storybook/main.ts:13` (`core: { disableTelemetry: true, … }`, the only opt-out)
- `package.json:130-131` (`docs`, `docs:build` without `--disable-telemetry`)
- `.github/workflows/docs.yml:53` (`pnpm docs:build`, no `STORYBOOK_DISABLE_TELEMETRY`)
- Upstream: `node_modules/storybook/dist/_node-chunks/chunk-AZLAKLIP.js` (`getErrorLevel`, `sendTelemetryError` with `force: true`), `node_modules/storybook/dist/_node-chunks/chunk-MCZW7I35.js` (`telemetry` sends when `options.force` even if the state is `disabled`)
**Description:**
- `core.disableTelemetry` is read from `main.ts`, so it takes effect only once `main.ts` has evaluated.
- When it cannot be evaluated, Storybook's `getErrorLevel` cannot read `core`. Examples: a syntax error, a failed import such as a renamed `@storybook/react-vite/node` export after a Dependabot bump, or a missing dependency.
- `getErrorLevel` then falls back to the crash-report cache or a prompt. In CI or without a TTY there is no prompt, and the default is `"full"`.
- `sendTelemetryError` then posts with `force: true`, which bypasses the disabled state.
- Reproduced:
  - A capture server set as `STORYBOOK_TELEMETRY_URL` received nothing from the delivered config.
  - It received one `error` event from a copy of the config whose `main.ts` had a syntax error but still said `disableTelemetry: true`.
  - With `STORYBOOK_DISABLE_TELEMETRY=1` it received nothing.
- The event carried:
  - `MainFileEvaluationError` with the offending source line of `main.ts`, the config path and the stack;
  - an `anonymousId`, which Storybook derives from the git remote, so it is stable for this private repository;
  - `projectSince`, `inCI`, platform, Node and Storybook versions, the agent name;
  - the project metadata: test, bundler and renderer package versions, package manager.
**Attack Scenario:** No attacker is needed; this is an unintended data flow. A Dependabot `dev-tools` group PR bumps Storybook to a version whose `defineMain` import path moved. `docs.yml`'s `pnpm docs:build` fails evaluating `main.ts`. Without a prompt in CI, Storybook posts a full crash report to `https://storybook.js.org/event-log` from the GitHub runner, with the `main.ts` source line, paths and a stable project identifier. The same happens on a developer's machine running `pnpm docs` with a broken `main.ts` who answers the crash-report prompt yes, or has answered it before.
**Impact:** Build metadata and a fragment of configuration source leave the project for a third party, against the project's stated no-telemetry intent (CC-003's rationale) and the delivery record's "telemetry … off" claim. No secrets or student data are involved; `main.ts` holds none.
**Recommendation:** Disable telemetry at the CLI level, which Storybook reads before `main.ts` (verified above):
```json
"docs": "storybook dev --disable-telemetry --no-version-updates -p 6006",
"docs:build": "storybook build --disable-telemetry -o storybook-static"
```
Set `STORYBOOK_DISABLE_TELEMETRY: "1"` in `docs.yml`'s workflow-level `env` as well, so any other `storybook` invocation in CI is covered too. Keep `core.disableTelemetry` in `main.ts` for anyone running `storybook` directly, and correct its comment.
**Compliance Impact:** prd/CC-003 (rationale only; the data flows from build tooling, not from the package — see the compliance cross-reference)
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-11-04): `docs` and `docs:build` pass `--disable-telemetry`, which Storybook reads before `main.ts`, so a failing `main.ts` sends no crash report; `main.ts`'s comment says what is and is not disabled.

---

### SEC-002: Another origin can rewrite an example page's title, graph and caption on the published site, and a crafted link can change the caption

**Severity:** Low
**Category:** Input Validation
**OWASP Reference:** A05:2025 Injection (content injection; CWE-346 origin validation)
**Location:**
- `docs/components/ExamplePage.tsx:25,29,32` (`entry?.title ?? file`, `<Graph description={description} />`, `examples/{file}`)
- `docs/stories/examples.stories.tsx:28-56` and `scripts/generated-files.ts:57` (both `file` and `description` are story args)
- Upstream: `node_modules/storybook/dist/channels/index.js` (`getOriginValidator` returns `null` when `CONFIG_TYPE` is not `DEVELOPMENT`; `isAllowedToContactPreview` then accepts any origin — Storybook's comment: "A built preview … has no validator and accepts any message")
**Description:**
- **Through the channel.** In a built Storybook, the preview iframe (`iframe.html`) accepts channel messages from any origin; the open channel supports composition. Another site can either frame `iframe.html` or `window.open` the real site and post into `w.frames[i]`. Either way it can send `updateStoryArgs` and replace the story's `description` and `file`. The real site then shows attacker-chosen text in a top-level tab whose address bar shows the real origin. Reproduced: the circle page showed the title "Your school account is locked. Call 555-0100 with your password." in its heading, SVG and `aria-label`, with the caption `examples/NOTICE.json`.
- **Through the URL.** The `file` arg is a plain string, so Storybook also takes it from a link: `?path=/story/graph-types--circle&args=file:Call+555-0100+to+unlock`, characters limited to `[A-Za-z0-9 _-]`. Nested `description.*` URL args are not applied (probed).
- **What contains it.** Everything injected is text. React escapes it, the description must pass `validate` and its plain-text policy (no bidi, invisible or control characters, at most 200 characters per title or label), and no injected value becomes a link, markup or script.
**Attack Scenario:** An attacker targeting teachers who use the library hosts a page that opens the official documentation site (`https://<owner>.github.io/<repo>/…`) in a new tab and posts a channel message into its preview frame. A teacher who follows the attacker's link sees, on the genuine documentation domain, an example graph titled with the attacker's message, such as a fake support number or a "new package name" to install. Alternatively, the attacker shares a link with `&args=file:…` that changes the caption only. No script runs, and the site has no session or data to steal; the gain is credibility for a phishing or typosquatting lure.
**Impact:** Text-only content spoofing on the project's official documentation site. No code execution, no data access, no state change.
**Recommendation:**
1. Stop exposing `file` as an arg. Make it a story parameter, or bind it in the generated story's `render` (for example `render: (args) => <ExamplePage {...args} file="circle.json" />`), and keep only `description` editable. This closes the URL vector.
2. For the channel, add `.storybook/preview-head.html` with a capture-phase listener that drops channel messages from other origins before Storybook's handler runs. Head scripts run before the preview bundle:
   ```html
   <script>
     window.addEventListener("message", (event) => {
       if (event.origin !== window.location.origin) event.stopImmediatePropagation();
     }, true);
   </script>
   ```
   This would also affect Storybook composition (refs); the site uses none. Re-run `tests/e2e/docs-network.spec.ts` and this review's probe (`…/scratchpad/review-cpse008-sec/probe/postmessage-probe.mjs`) to confirm.
3. Alternatively, accept the risk: the site is anonymous and static, and the injected content is validated plain text.
**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed: `file` is bound in each generated story's `render`, so only `description` is an arg (the URL vector is closed; `component: ExamplePage` is kept, without which Storybook took `description.*` from the URL); `.storybook/preview-head.html` drops channel messages from other origins in the capture phase. The reviewer's postmessage probe on the fixed build leaves the page unchanged; with the filter removed the injection works again.

---

### SEC-003: A new dev-only `glob` advisory (GHSA-3g3m-2fjr-6pw4) and a second path to the accepted `minimatch` advisory, both through Storybook's docgen plugin; the code path is not reached

**Severity:** Low
**Category:** Dependency
**OWASP Reference:** A03:2025 Software Supply Chain Failures
**Location:**
- `pnpm-lock.yaml`: `glob@13.0.6` and `minimatch@10.2.6` through `@joshwooding/vite-plugin-react-docgen-typescript@0.7.0`, a dependency of `@storybook/react-vite@10.6.5`
- `.gener8v/changes/graph-library/delivery/component-packaging-and-source-export-ticket-008-delivery.md` (Verification Run, the `pnpm audit` row)
**Description:**
- `pnpm audit` reports two moderate advisories on the new Storybook tree:
  - GHSA-3g3m-2fjr-6pw4 / CVE-2026-118773: `glob` >=9.0.0 <=14.0.1, "AbortSignal cancellation bypass allows post-timeout filesystem traversal", patched in >=14.0.2.
  - GHSA-g3hv-75wg-m249 / CVE-2026-118764: `minimatch` <11.0.1, accepted through `eslint` as CPSE TICKET-004 SEC-002.
- The `glob` advisory is new with this ticket, and it was published (2026-10-30 23:09 UTC) before this delivery. The delivery record's audit row describes the output as "the accepted dev-only `minimatch` advisory" only.
- Neither code path is reached:
  - Storybook loads the docgen-typescript plugin only when `typescript.reactDocgen` is `"react-docgen-typescript"` (`node_modules/@storybook/react-vite/dist/preset.js`). `.storybook/main.ts` keeps the default, `react-docgen`.
  - When loaded, the plugin calls `globSync` over the project's own files with no `AbortSignal`, which is not the vulnerable API.
- `pnpm audit --prod` is clean; nothing reaches the published package.
**Attack Scenario:** N/A (Low). Exploiting either advisory needs attacker-controlled glob patterns or a cancelled asynchronous glob, during a developer's or CI's own build, in a plugin that is not loaded.
**Impact:** None today. It is audit noise that hides new advisories behind a standing exit 1, and an inaccurate audit record in the delivery record.
**Recommendation:** Record both advisories in the delivery record's audit row. Then either accept the risk with CPSE TICKET-004 SEC-002 (same rationale: dev-only, not reached), or add a scoped override once a compatible release exists. For example, `"@joshwooding/vite-plugin-react-docgen-typescript>glob": "^14.0.2"` if `globSync`'s API is unchanged, verified by `pnpm docs:build`. Let the next Dependabot `dev-tools` bump clear it.
**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Risk accepted (Engineer — Thomas Eaves, 2026-11-04): the `glob` advisory (GHSA-3g3m-2fjr-6pw4) and the second path to the `minimatch` advisory come through Storybook's docgen plugin, are dev-only and not reached at build or run time; accepted with CPSE TICKET-004 SEC-002, for Dependabot's `dev-tools` group to clear.

---

### SEC-004: The dev server contacts storybook.js.org for update and "what's new" data; `disableWhatsNewNotifications` hides the notification but does not stop the fetch

**Severity:** Informational
**Category:** Misconfiguration
**OWASP Reference:** N/A
**Location:**
- `.storybook/main.ts:12-13` (comment "no 'what's new' check against storybook.js.org"; `disableWhatsNewNotifications: true`)
- `package.json:130` (`storybook dev -p 6006` without `--no-version-updates`)
- Upstream: `node_modules/storybook/dist/core-server/presets/common-preset.js` (`initializeWhatsNew`), `node_modules/storybook/dist/core-server/index.js` (`updateCheck`)
**Description:**
- The dev server makes two requests to `storybook.js.org` that the config does not stop:
  - On each manager load in dev mode, the manager emits `REQUEST_WHATS_NEW_DATA`, and the dev server fetches `https://storybook.js.org/whats-new/v1`. `disableWhatsNewNotifications` is read after the fetch and only suppresses the notification. Storybook 10.6.5 has no setting that stops this fetch.
  - `storybook dev` also runs `updateCheck`, which fetches `https://storybook.js.org/versions.json?current=10.6.5` at most daily, outside CI, unless `--no-version-updates` is given.
- These come from a developer's machine running `pnpm docs` only. Neither runs in `storybook build` or in the published site (both probed). The delivery record and `main.ts` say the "what's new" check is off.
**Attack Scenario:** N/A (Informational)
**Impact:** A developer's IP address and Storybook version reach a third party when they run the local docs server, contrary to the configuration's comment.
**Recommendation:** Add `--no-version-updates` to the `docs` script (with SEC-001's `--disable-telemetry`). Correct the `main.ts` comment and the delivery record to say that only the notification is disabled, and that the dev server still fetches what's-new data. Revisit if a later Storybook release adds an off switch.
**Compliance Impact:** None (developer tooling, not the package; see the compliance cross-reference)
**Status:** Resolved
**Resolution:** Fixed: `docs` (the dev server) also passes `--no-version-updates`; `storybook build` has no such flag and fetches nothing. The comment no longer claims the notification setting stops the fetch.

---

### SEC-005: The published artifact includes Storybook's `project.json` (toolchain metadata)

**Severity:** Informational
**Category:** Data Exposure
**OWASP Reference:** N/A
**Location:** `.storybook/main.ts:13` (no `disableProjectJson`); `storybook-static/project.json` in the Pages artifact (`.github/workflows/docs.yml:64-66`)
**Description:**
- `storybook build` writes `project.json` into the output, and `upload-pages-artifact` publishes it.
- It holds:
  - `generatedAt` and `userSince` timestamps;
  - test, bundler and renderer package versions (`@playwright/test`, `vitest`, `esbuild`, `vite`, `react`);
  - the package manager and its version, the framework, builder and addons.
- It is not needed by the site. Nothing in it is secret.
**Attack Scenario:** N/A (Informational)
**Impact:** Minor reconnaissance value: exact dev-tool versions of the project, published.
**Recommendation:** Set `core.disableProjectJson: true` in `.storybook/main.ts`; Storybook 10.6.5 honours it (`node_modules/storybook/dist/core-server/index.js`). The network spec does not depend on the file.
**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed: `core.disableProjectJson: true`; the built site has no `project.json`.

---

### SEC-006: `docs.yml` runs Playwright through `npx`, where `ci.yml` uses `pnpm exec`

**Severity:** Informational
**Category:** Misconfiguration
**OWASP Reference:** A03:2025 Software Supply Chain Failures
**Location:** `.github/workflows/docs.yml:56` (`npx playwright install --with-deps chromium`), `.github/workflows/docs.yml:60` (`npx playwright test …`); compare `.github/workflows/ci.yml:134` (`pnpm exec playwright install --with-deps chromium webkit`)
**Description:**
- After `pnpm install --frozen-lockfile`, `npx playwright` resolves the locked local binary `node_modules/.bin/playwright` from `@playwright/test` 1.64.1, so today it runs the pinned version.
- If that binary is ever absent, `npx` resolves `playwright` from the registry at its latest version and runs it, with `sudo` for `--with-deps`. Examples: a step reordered before install, or `@playwright/test` dropped or renamed.
- `pnpm exec` fails instead. The docs tell readers to scope their own `npx` commands for the same reason.
**Attack Scenario:** N/A (Informational)
**Impact:** Today the binary is the locked one. The `npx` form leaves a latent path to running an unpinned registry package in CI.
**Recommendation:** Use `pnpm exec playwright …` in both steps, as `ci.yml` does.
**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed: `docs.yml` uses `pnpm exec playwright`, as `ci.yml` does.

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Fixed | CLI-level telemetry opt-out | No | `package.json`, `.storybook/main.ts` |
| SEC-002 | Fixed | `file` bound in render; other-origin messages dropped | No | `scripts/generated-files.ts`, `docs/stories/examples.stories.tsx`, `.storybook/preview-head.html` |
| SEC-003 | Risk accepted | dev-only, not reached; Dependabot to clear | Yes | — |
| SEC-004 | Fixed | `--no-version-updates` on the dev server | No | `package.json`, `.storybook/main.ts` |
| SEC-005 | Fixed | no `project.json` in the site | No | `.storybook/main.ts` |
| SEC-006 | Fixed | `pnpm exec playwright` | No | `.github/workflows/docs.yml` |

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 1 (SEC-003, dev-only advisories through Storybook's docgen plugin)
**Notes:** Five findings fixed in resolution and re-verified (the postmessage probe, with its mutant, and a site build with no `project.json`); SEC-003 accepted with CPSE TICKET-004 SEC-002's `minimatch` advisory.
