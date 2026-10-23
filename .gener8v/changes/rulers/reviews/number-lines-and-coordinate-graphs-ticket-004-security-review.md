# TICKET-004: Verify ruler accuracy, server rendering, accessibility and performance — Security Review

## Summary

I reviewed the delivery of `rulers/number-lines-and-coordinate-graphs/TICKET-004` at its delivery commit `f2b5891`, which is HEAD of `ticket/rulers-nlc-004`.

The delivery changes no source file. It adds:
- four test files;
- specification coverage rows;
- one devDependency, `axe-core@^4.14.0`, locked at 4.14.0. It is evaluated inside a JSDOM window by `tests/helpers/axe.ts`.

The attack surface is the new dependency and the way the tests run it. Against that surface, the delivery holds up:
- **axe-core 4.14.0 is the package its publisher built.** The lockfile's sha512 equals the registry's, and equals the subject of its SLSA v1 provenance. That provenance was built by GitHub Actions trusted publishing from `dequelabs/axe-core`. The installed tree is file-for-file the registry tarball. `npm audit signatures` reports no invalid or missing signature. The package has no dependencies and no install script.
- **It cannot reach the published package.** The pack list is `LICENSE`, `README.md`, `package.json` and `dist/**`. No built file mentions axe-core or jsdom. `check:deps` reports 0 runtime dependencies. If `src/` ever imported axe-core, tsup would bundle it, but `check:dist` and the size budgets would both fail in CI.
- **The JSDOM window runs nothing from the markup and fetches nothing.** No `<script>`, inline handler, `javascript:` link or `srcdoc` frame ran. A local server got 0 requests from external stylesheets, `@import`, images, scripts and frames, even on a full axe run.
- **The tests verify what they claim.** Every mutation that removes, empties, hides or renames the accessible name fails NLC-NFR-007's assertions. axe alone passes `aria-hidden="true"`; the assertion that `svg-img-alt` passed is what catches it. The built `./ruler` entry renders byte-identical markup in plain Node.js with no global added. Built `./core` validates and describes the ruler with React blocked.
- **The dependency audit is clean** (`pnpm audit`, `pnpm audit --prod`).

There is 1 finding: 0 Critical, 0 High, 0 Medium, 0 Low, 1 Informational.
- **SEC-001:** `import axe from "axe-core"` runs axe-core's 1.48 MB browser build in the test's own Node.js process. That happens before the helper evaluates it again inside the window. It defines no browser global and touches no built-in. It does leave `globalThis["__core-js_shared__"]`, and its code is not confined to the window. The helper's sentence and DEL-002 give the opposite impression, and graph-library NLC TICKET-005 is told to reuse the helper. Reading the source as text would make the claim exact.

**Reviewer:** `security-reviewer` agent, fresh context (findings phase only, 2026-10-23)
**Delivery Record:** `.gener8v/changes/rulers/delivery/number-lines-and-coordinate-graphs-ticket-004-delivery.md`. I read the Pre-Flight Reconciliation, the plan (D1 to D5), DEL-001 to DEL-003, the Verification Run, the Notes and the Post-Review Amendments (none).

**Earlier reviews read first.** Their findings are not raised again, because this delivery changes none of them:
- `rulers/number-lines-and-coordinate-graphs-ticket-003-security-review`:
  - SEC-001, one-cluster labels, is deferred to graph-library GSV TICKET-007. This delivery's benchmark includes a 200-character one-cluster title and label (`oneClusterTexts(...).latinMarks`). The delivery's worst p95 is 3.69 ms, which bounds render time and leaves the deferred drawing issue as it was.
  - SEC-002, prototype reads, is fixed.
- `rulers/number-lines-and-coordinate-graphs-ticket-002-security-review`: SEC-001 is fixed; SEC-002, caller-text length, is deferred.
- `rulers/number-lines-and-coordinate-graphs-ticket-001-security-review`: SEC-001 to SEC-003 are resolved.
- `rulers/graph-specification-and-vocabulary-ticket-001-security-review`: SEC-001 and SEC-002, the `vite` and `launch-editor` advisories, are resolved; the `launch-editor` override is still in `package.json`. SEC-003 and SEC-004 are resolved.
- None of these reviews records an accepted risk.

**Files Reviewed:**
- `tests/helpers/axe.ts` (new)
- `tests/react/ruler.test.tsx` (new)
- `tests/layout/ruler.bench.ts` (new)
- `tests/layout/ruler.test.ts` (edited: the NLC-NFR-005 property test)
- `package.json` (devDependency `axe-core`)
- `pnpm-lock.yaml` (`axe-core@4.14.0`, with no dependencies)
- `.gener8v/specifications/number-lines-and-coordinate-graphs.md` (`@spec Coverage` rows for NLC-NFR-005..008)
- Read unchanged, for the dependency's reach and the fidelity of the checks:
  - `tsup.config.ts`, `vitest.config.ts`, `tests/setup/build.ts`, `eslint.config.js`, `.size-limit.json`, `.github/workflows/ci.yml`;
  - `scripts/check-dependencies.ts`, `scripts/check-dist.ts`, and `CONTRIBUTING.md` (runtime dependency notes);
  - `tests/package/node-entry.test.ts`, `tests/package/per-type-bundle.test.ts`, `tests/fixtures/rulers.ts`, `examples/ruler.json`, `src/react/SceneSvg.tsx`;
  - `node_modules/axe-core/package.json`, and `node_modules/axe-core/axe.js` at its one network API (`:24185`);
  - `dist/ruler.js`, as built at delivery.

**Context read:**
- the ticket and its Known Hazards;
- `.gener8v/constraints/prd.md`. There is no `constraints/number-lines-and-coordinate-graphs.md`;
- `.gener8v/technical-design/system-design.md`: AD-001, AD-016, Build and release, and Infrastructure Requirements. AD-016 names axe-core as a development tool;
- `.gener8v/context.md` and `.gener8v/CONVENTIONS.md`;
- NLC-NFR-002, NLC-NFR-003 and NLC-NFR-005..008 in the specification.

**Review environment note:**
- **How I probed:**
  - Most probes were inline `TSX_DISABLE_CACHE=1 npx tsx -e '…'` runs from the repository root.
  - Global-state and built-entry probes ran with plain `node --input-type=module`.
  - The React-blocking probe of `./core` used a resolve hook written to the session scratchpad, the same hook `tests/package/node-entry.test.ts` uses.
  - The axe-core tarball was downloaded into its own empty scratchpad directory, extracted there, and only hashed and compared.
  - All scratch files are outside the repository.
- **Runtime:** Node.js v24.1.0, pnpm 10.28.2, Vitest 5.0.3, jsdom 26.1.0, axe-core 4.14.0, React and React DOM 19.3.0, macOS (Darwin 25.6.0).
- **Commands run in the repository:**

| Command | Exit | Evidence |
|---|---|---|
| `pnpm audit` | 0 | No known vulnerabilities found (387 dependencies) |
| `pnpm audit --prod` | 0 | No known vulnerabilities found |
| `npm audit signatures` | 0 | 581 packages have verified registry signatures, 204 verified attestations; `invalid: []`, `missing: []` |
| `npm view axe-core@4.14.0 …`, and the registry's attestations for it | 0 | See the supply-chain table under Configuration Security |
| `pnpm licenses list --json` | 0 | Licenses in the installed tree: MIT 245, ISC 17, Apache-2.0 16, BSD-2-Clause 8, BSD-3-Clause 6, MPL-2.0 3 (`axe-core`, `lightningcss` and its darwin binary), BlueOak-1.0.0 2, MIT-0 1 |
| `npm pack --dry-run --json --ignore-scripts` | 0 | 35 entries: `LICENSE`, `README.md`, `package.json` and `dist/**`. No test, helper or axe-core file |
| `pnpm lint` | 0 | — |
| `pnpm typecheck` | 0 | — |
| `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache tests/react/ruler.test.tsx tests/layout/ruler.test.ts` | 0 | 2 files, 38 tests passed |
| `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache` | 0 | 52 files, 1,468 tests passed, as in the delivery record; one worker per file |
| `pnpm check:deps` | 0 | Runtime dependencies: 0, all justified |
| `pnpm check:dist` | 0 | 18 built files scanned, no network APIs or network modules |
| `pnpm publint` | 0 | All good |

- **The build was not re-run.** `GRAPH_GENERATOR_PREBUILT=1` kept the test runs from rebuilding the git-ignored `dist/` while two other reviewers run concurrently. The existing build is current: `src/` is unchanged since `f2b5891`, and no file under `src/` is newer than `dist/ruler.js`.
- **Not run:** `pnpm size` and `pnpm generate`, as instructed. `pnpm build`, `pnpm bench`, `pnpm attw` and `pnpm check:images` were also not run; they have no bearing on this ticket's security. The NLC-NFR-008 p95 figures cited are the delivery record's.
- **Tree check:** before writing this report, `git status --short` showed only ` M .gener8v/runs.jsonl` and `?? HANDOFF.md`, neither of them mine.

**Findings:** 1
**Critical:** 0 | **High:** 0 | **Medium:** 0 | **Low:** 0 | **Informational:** 1

## Security Assessment

### Input Validation

**Status:** Adequate
**Notes:**
**The package.** This delivery adds no entry point, changes no validation, and changes nothing a caller's description reaches. The package code it exercises is the ruler's, reviewed under TICKET-003.

**The test helper's one input.** `axeSvgImage(markup)` (`tests/helpers/axe.ts:24-37`) puts its argument into a fixed HTML document. It loads that document in a fresh JSDOM window with `runScripts: "outside-only"`, then calls `dom.window.eval(axe.source)`.
- **What reaches it.** Every caller passes either the package's own `renderToStaticMarkup` output or a fixed literal (`tests/react/ruler.test.tsx:64`, `:73-80`). The eval runs the dependency's own source string, never markup or description data.
- **No in-page script runs.** I passed the helper a nameless `<svg role="img">` together with code that would name it: `<script>` inside and outside the SVG, `onload` on the `<svg>`, and `onerror` on an `<img>`. axe still reported `svg-img-alt`, so none of the code ran. In a window built with the same options:
  - a `<div onclick>` dispatched from outside did not run its handler;
  - a `javascript:` link and an `<iframe srcdoc>` with a script did nothing.
- **Nothing is fetched.** The markup held `<link rel="stylesheet">`, `<style>@import url(…)</style>`, `<img src>`, `<script src>`, `<iframe src>` and an SVG `<image href>`, all pointing at a local HTTP server. Neither the helper's five rules nor a full axe run (92 rules, default `preload`) sent a request: the server logged 0 requests. JSDOM's default `resources` loads no subresource. axe's one `XMLHttpRequest` (`node_modules/axe-core/axe.js:24185`, used to preload stylesheets) was never reached.
- **No shared state between runs.** Each call builds its own window and closes it in `finally`, so concurrent `axe.run` calls never share a window.

**The other delivered tests** take no outside input. They are fast-check generators, the 78-ruler fixture and `examples/ruler.json`.

**Not applicable:** SQL, NoSQL, command and template injection, and path traversal. The code has no query, shell, template engine or caller-chosen file path. `readFileSync` reads `examples/ruler.json` by a fixed URL.

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** This is library test code with no server, accounts, sessions or permissions (`.gener8v/context.md`: "no user accounts"). The technical design makes no authentication or authorization decision.

### Data Protection

**Status:** Adequate
**Notes:**
- **Sensitive data:** none. The tests handle ruler descriptions and the package's text alternatives only.
- **Logging:** the benchmark prints one line per case: `NLC-NFR-008 <case>: p95 <ms> over <n> runs` (`tests/layout/ruler.bench.ts:45-47`). The line holds no description text, path or environment value.
- **Secret scan:** I scanned the 191 lines that `f2b5891` adds under `tests/`, `package.json` and `pnpm-lock.yaml`. The patterns covered:
  - keys, tokens, secrets, passwords and private keys;
  - AWS, GitHub, npm and Slack token shapes;
  - URLs and network APIs;
  - `eval` and `Function(`, `innerHTML` and `dangerouslySetInnerHTML`;
  - `process.env`, `child_process`, `require(` and `import(`;
  - `__proto__`, `.prototype` and `Object.assign`;
  - timers, `Math.random`, `crypto` and `console.`.

  Two lines match, both expected. One is `dom.window.eval(axe.source)` (`tests/helpers/axe.ts:27`), the documented way to run axe-core in JSDOM. The other is the benchmark's `console.log`. The other matches are the word "evaluate" in comments.

### Configuration Security

**Status:** Gaps Found
**Notes:**
**Manifest and lockfile:**
- `package.json` adds one line, `"axe-core": "^4.14.0"`, under `devDependencies`. `files: ["dist"]`, `exports`, `sideEffects: false`, `peerDependencies` and `pnpm.onlyBuiltDependencies` (`esbuild` only) are unchanged.
- `pnpm-lock.yaml` adds 9 lines: the importer's devDependency, the package's resolution, and an empty snapshot. Nothing else in the tree depends on axe-core, and it depends on nothing.
- CI installs with `pnpm install --frozen-lockfile` (`.github/workflows/ci.yml:41`), so the caret range cannot drift in CI. CI has `permissions: contents: read`, checks out with `persist-credentials: false`, and uses no secret. There is no publish workflow yet.

**Supply chain of axe-core 4.14.0:**

| Check | Result |
|---|---|
| Lockfile integrity | `sha512-9WTZxEjs…3zzpcQ==`, equal to the registry's `dist.integrity` |
| Registry tarball | downloaded to the scratchpad: its sha512 equals the lockfile's. The extracted tree is identical, file for file, to `node_modules/.pnpm/axe-core@4.14.0/node_modules/axe-core` |
| Provenance | SLSA v1 and npm publish attestations. Subject `pkg:npm/axe-core@4.14.0`, whose digest equals the lockfile's. Built on a GitHub-hosted runner by `dequelabs/axe-core` `.github/workflows/deploy.yml` on `refs/heads/master`, commit `e797173108eadfa4355fe06af331791734e1757f` |
| Publisher | `_npmUser` is the GitHub Actions trusted publisher (OIDC). Maintainers are Deque Systems accounts |
| Age and tag | published 2026-10-05 17:43 UTC, 18 days before delivery. It is the `latest` dist-tag. The `next` tag is a canary that `^4.14.0` does not match |
| Signatures | `npm audit signatures`: none invalid, none missing |
| Install-time code | none. Its `scripts` are the project's own build and test scripts, with no `preinstall`, `install` or `postinstall`. pnpm 10 would block dependency lifecycle scripts anyway, outside `onlyBuiltDependencies` |
| Dependencies | none (`axe-core@4.14.0: {}`) |
| Known vulnerabilities | none (`pnpm audit`) |
| License | MPL-2.0 (see the compliance table) |

**Can axe-core reach the published package or a consumer's install?**

| Path | Result |
|---|---|
| The pack | `files: ["dist"]`. `npm pack --dry-run` lists only `LICENSE`, `README.md`, `package.json` and `dist/**` (35 entries). `tests/helpers/axe.ts` is not shipped |
| The build | `tsup.config.ts` builds only `src/` entries. No file under `src/`, `scripts/` or `examples/`, and nothing in `dist/`, mentions `axe-core`, `axe.source`, `deque`, `jsdom` or `JSDOM`. Only `tests/helpers/axe.ts:1` imports axe-core |
| A consumer's install | devDependencies are not installed for consumers. `check:deps` (`scripts/check-dependencies.ts:42-53`) counts dependencies, optional, bundled and non-React peers: 0 |
| A future accidental import from `src/` | No lint rule forbids importing a devDependency in `src/`, and tsup bundles anything not external (`tsup.config.ts:29`). Two CI checks would still fail: `check:dist`, whose `scanSource` finds `XMLHttpRequest` and `importScripts` in both `axe.js` and `axe.min.js`, and `pnpm size`, whose budgets of 25 kB per type and 120 kB for `.` are far below `axe.min.js`'s 652 kB |

**Script evaluation:**
- **Inside the window.** The window runs no in-page script and loads no resource (Input Validation).
- **In the test process (SEC-001).** `import axe from "axe-core"` (`tests/helpers/axe.ts:1`) first runs axe-core's UMD build in the Node.js process, to obtain `axe.source`. Measured in plain Node.js 24.1.0:
  - it defines no `window`, `document` or `axe` global;
  - it changes no own key of `Object`, `Array`, `Function`, `String`, `Number`, `Promise`, `Symbol`, `Reflect`, `Math`, `JSON`, or of their prototypes, `Map`, `Set`, `WeakMap` and `Iterator` included;
  - it adds one non-enumerable `globalThis["__core-js_shared__"]`, the shared store of the core-js-pure 3.50.0 that axe bundles. Importing jsdom adds nothing.
- **The window is not a sandbox.** JSDOM's window is a Node.js `vm` context. It isolates globals, not code, so the trust placed in axe-core is that of any devDependency running with the developer's and CI's privileges. The table above supports that trust.

**Secrets and defaults:** none. `P95_LIMIT_MS = 50` and `SVG_IMAGE_RULES` are named constants.
**Cryptography:** not applicable. No cryptographic function is used. fast-check's random generation is test input, not security.
**Logging and monitoring:** not applicable to the package, which logs nothing (AD-014). The benchmark's log line is under Data Protection.

**Dependency audit:** `pnpm audit` (pnpm 10.28.2, Node.js v24.1.0), run 2026-10-23 at 16:46 UTC in the repository against the HEAD lockfile (`f2b5891`), read-only.
- `pnpm audit`: `No known vulnerabilities found`, exit 0. 387 dependencies; info, low, moderate, high and critical all 0.
- `pnpm audit --prod`: `No known vulnerabilities found`, exit 0. The package has no runtime dependencies; `react` is a peer.
- This branch changes `pnpm-lock.yaml` only to add `axe-core@4.14.0`.

**Carried Known Hazards (security-relevant):**

| Hazard | Result |
|---|---|
| axe-core is not yet a devDependency: add it and record it, or share the setup | Honoured. Added as a devDependency, recorded in DEL-002, and shared as `tests/helpers/axe.ts`. Its isolation claim is SEC-001 |
| Cross-change ordering: graph-library NLC TICKET-005 may reuse the tests | Honoured. The helper is written to be shared, which is why SEC-001's wording matters beyond this ticket |
| rulers NLC TICKET-003 CR-003: run the accessibility test at the default size and state the 330 px minimum | Honoured. `renderToStaticMarkup(<RulerGraph description={…} />)` with no size props (`tests/react/ruler.test.tsx:73`). The 330 px and about 210 px minimums are in the delivery record's Notes |
| Benchmark at `CALLER_TEXT_LIMIT` as words and as one cluster | Honoured (`tests/layout/ruler.bench.ts:16`). It bounds the cost of rulers NLC TICKET-003 SEC-001's one-cluster text at 200 characters. The drawing issue stays deferred to GSV TICKET-007 |

**Compliance cross-reference:** checked against `.gener8v/constraints/prd.md`. No per-area constraints file exists. The ticket names prd/CC-002 and prd/TC-005. CC-001, CC-003 and TC-007 are added because the delivery adds a dependency.

| Constraint | Result |
|---|---|
| prd/CC-001 (licenses of runtime dependencies, bundled assets and exported code) | Met. axe-core is MPL-2.0, a file-level copyleft. It is a development-only test tool that is neither shipped nor bundled (the reach table), so CC-001 does not reach it. It is not the tree's first MPL-2.0 package: `lightningcss` 1.33.0 arrives through `vite`. The delivery record does not name the license. Worth recording if axe-core code is ever copied anywhere |
| prd/CC-002 (WCAG 2.1 AA non-text content) | Met for 1.1.1, and genuinely tested. See the 1.1.1, 1.4.11 and 1.4.1 rows below |
| CC-002 1.1.1, the evidence | For the example and the five maximum-length rulers: `role="img"`, a non-empty `aria-label` and a `<title>` equal to the text alternative, no violation of the five axe rules, and `svg-img-alt` among the passes (`tests/react/ruler.test.tsx:72-83`). The nameless-SVG control (`:63-66`) shows the rule runs in JSDOM |
| CC-002 1.1.1, the mutations | I applied these to the example's real markup. The test fails for each: `aria-label` removed; `<title>` removed; both emptied; `aria-label` replaced with "A circle"; `role` removed; `aria-hidden="true"` added. axe alone reports no violation for the last two: the `passes` assertion catches them |
| CC-002 1.1.1, one imprecision | not a security matter, so not raised. `svg.querySelector(":scope > title")` accepts a `<title>` anywhere among the SVG's children, while the delivery record says "first-child `<title>`". A title moved to the last child still passes. The accessible name is unaffected, because `aria-label` carries it |
| CC-002 1.4.11 | Not tested, by recorded decision (plan D5). axe's contrast rule does not evaluate SVG strokes. The 330 px minimum is a residual already recorded (TICKET-003 DEL-002, CR-003), so it is not raised again |
| CC-002 1.4.1 | Not applicable to these tests. A ruler has one object |
| prd/CC-003 (no data collection or network) | Met. No source change. `check:dist` passes over 18 built files. The test-side JSDOM window sent 0 requests, even when given external URLs |
| prd/TC-005 (non-rendering code loads no React DOM or browser global) | Met for the ruler. `tests/package/node-entry.test.ts` (unchanged, passing) imports built `./core`, `./tool` and `./export` in plain Node.js with React blocked. I also validated and described `examples/ruler.json` through built `./core` under the same hook: `valid: true`, with "A ruler titled “How long is the pencil?”…", and `window` and `document` undefined |
| NLC-NFR-006, which the ticket ties to TC-005 | Verified. `window` and `document` are undefined before and after all 79 renders through `<RulerGraph>` and `<Graph>` (`tests/react/ruler.test.tsx:36-51`). Those renders are of source modules. I rendered the built `dist/ruler.js` in plain Node.js for the example and both maximum-length rulers: its markup hashes equal the source renders', and no global was added. The axe-core load in the same process is SEC-001 |
| prd/TC-007 (side-effect-free per-type entry) | Not affected. No source change; `tests/package/per-type-bundle.test.ts` passes. Each test file runs in its own worker, so the axe-core load stays inside `tests/react/ruler.test.tsx`'s worker |

No CC-XXX violation was found, so no finding is raised to Critical.

## Findings

### SEC-001: `import axe from "axe-core"` runs axe-core's browser build in the test's own Node.js process before the helper evaluates it "inside that window"; it defines no browser global, but leaves `globalThis["__core-js_shared__"]`, and its code is not confined to the window the helper and DEL-002 describe

**Severity:** Informational
**Category:** Dependency
**OWASP Reference:** N/A. Related to A03:2025 Software Supply Chain Failures: where a dependency's code runs.
**Location:**
- `tests/helpers/axe.ts:1`: `import axe from "axe-core";`. This is a value import. Node.js's CommonJS loader runs `node_modules/axe-core/axe.js` (1,477,661 bytes) in the test worker, and `module.exports.source` is built from it.
- `tests/helpers/axe.ts:18-23`, the doc comment: "axe-core is evaluated inside that window, so no browser global reaches the Node environment the other tests run in".
- `tests/helpers/axe.ts:27`, the second evaluation, in the window.
- `tests/react/ruler.test.tsx:9` imports the helper at the top of the file whose `:36-51` asserts no browser global. axe-core has run in that process before those assertions.
- The delivery record: DEL-002 ("No global is installed") and the planned `tests/helpers/axe.ts` ("no globals leak into the test's Node environment"). Its Notes tell graph-library NLC TICKET-005 to reuse the helper.

**Description:**
The helper's design is that axe-core runs only inside a throwaway JSDOM window. In fact it runs twice. The import runs it once in Node.js, to get `axe.source`, and the helper then runs that string again in the window. I measured the import in plain Node.js 24.1.0 and under tsx:

| After | Result |
|---|---|
| `await import("jsdom")` | no own key added to `globalThis` |
| `await import("axe-core")` | one own key added: `__core-js_shared__`, non-enumerable, writable and configurable. It is the shared store of the core-js-pure 3.50.0 that axe bundles, with `versions`, `wks`, `keys`, `state` and `inspectSource` |
| | `window`, `document` and `axe` still undefined |
| | no own key added, removed or replaced on `Object`, `Array`, `Function`, `String`, `Number`, `Promise`, `Symbol`, `Reflect`, `Math`, `JSON`, or their prototypes, `Map`, `Set`, `WeakMap` and `Iterator` included. core-js's pure mode patches nothing |
| | one read of a lazy Node.js global creates `Symbol(undici.globalDispatcher.1)`, exactly as reading `globalThis.Headers` does. No request is made |
| `axeSvgImage(…)` | nothing further added to the Node.js realm |

So every assertion in `tests/react/ruler.test.tsx` is true. The comment is true of browser globals. What is not true is the picture the comment and DEL-002 give, of axe-core confined to the window:
- A 1.48 MB browser library runs in the same process as the NLC-NFR-006 assertions, before them.
- The window would not confine it in any case. JSDOM's window is a Node.js `vm` context, which isolates globals, not code.

Why this is worth fixing, though small:
- **The helper is meant to be shared.** graph-library NLC TICKET-005 may move it into `tests/react/nlc-server-render.test.ts`, beside a server-rendering or side-effect test. A test there that snapshots `globalThis` (as TC-007-style load checks do) would see `__core-js_shared__` and fail, with nothing in the helper explaining why.
- **The dependency's behaviour can change.** `^4.14.0` admits later 4.x releases. One that installed a global in Node.js when no `window` is present would act in that process. Today the lockfile and `--frozen-lockfile` hold CI at 4.14.0. The likely result would be a false failure, not a false pass: the package's rendering code is lint-barred from browser globals (`eslint.config.js:137-141`).
- **The evidence should say what it checks.** NLC-NFR-006's evidence rests partly on this isolation claim. Today the claim holds only for browser globals.

**Attack Scenario:** N/A (Informational). For the record, a compromised future axe-core 4.x release would run on `import`, in every developer's and CI's test process, whatever the helper does with the window afterwards. Reading the source as text does not change that, because the source is still run. It only keeps the run inside a context whose globals are discarded. The defences are those under Configuration Security:
- a locked, provenance-backed and signature-checked version;
- a frozen lockfile in CI;
- read-only CI permissions with no secrets.

**Impact:**
- None on today's results.
- The helper's isolation claim is wider than what it does, and TICKET-005 inherits it.
- A stray non-browser global in the test process that asserts server rendering with no browser globals.

**Recommendation:**
1. **Load axe-core's browser build as text instead of running the module in Node.js.** Type-only imports are erased, so `axe.js` then never runs outside the window. axe-core has no `exports` map, so the deep path resolves; I checked that `axe-core/axe.min.js` reads as 652,119 characters. For example:
   ```ts
   import { readFileSync } from "node:fs";
   import { createRequire } from "node:module";
   import type { AxeResults, RunOptions } from "axe-core";

   const AXE_SOURCE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
   // …
   dom.window.eval(AXE_SOURCE);
   const inWindow = (dom.window as unknown as { axe: { run(context: Element, options: RunOptions): Promise<AxeResults> } }).axe;
   ```
2. **Reword the doc comment** to say what holds then: axe-core runs only inside the window; the window isolates globals, not code; it is not a sandbox. Alternatively, keep the import and reword the comment and DEL-002 to say that axe-core also runs in the Node.js process, defines no browser global there, and leaves `__core-js_shared__`.
3. **Optional:** in the NLC-NFR-006 block, assert that `Reflect.ownKeys(globalThis)` is unchanged across the 79 renders, rather than checking only `window` and `document`. That makes "no browser globals" a measured property of the render itself.

**Compliance Impact:** None. prd/TC-005 and NLC-NFR-006 hold:
- `window` and `document` are undefined before and after every render;
- the built `./ruler` entry renders byte-identical markup in plain Node.js with no global added;
- built `./core` validates and describes the ruler with React blocked.

**Status:** Resolved
**Resolution:** Fixed (2026-10-23, approved by the Engineer, Thomas Eaves):
- Recommendation 1, with code review CR-001 (`60b7dfe`): `tests/helpers/axe.ts` reads `axe-core/axe.min.js` as text and keeps only a type import, so axe-core runs only inside the JSDOM window; a probe shows the helper adds no own key to `globalThis`.
- Recommendation 2: the helper's comment says the window isolates globals, not code; it is a Node.js `vm` context, not a sandbox, and axe-core is trusted as a pinned devDependency.
- Recommendation 3: `tests/react/ruler-server-render.test.tsx` asserts the global object's own keys and values are unchanged across the 79 renders (descriptors read once first, so Node.js's lazy undici symbol is not counted). A render that sets a global fails it.


## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Fix | axe-core read as text (with CR-001); comment reworded; global-object snapshot across the 79 server renders | No | tests/helpers/axe.ts, tests/react/ruler-server-render.test.tsx |

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:**
- SEC-001 was fixed in resolution, 2026-10-23: axe-core runs only inside the JSDOM window, the helper says what the window does and does not isolate, and the server-render test measures the global object itself. The helper's isolation claim is settled for graph-library NLC TICKET-005.
- **Dependency audit:** `pnpm audit` and `pnpm audit --prod`, 2026-10-23, no known vulnerabilities, re-run after the fixes (exit 0). Re-run when `axe-core`'s locked version changes.
