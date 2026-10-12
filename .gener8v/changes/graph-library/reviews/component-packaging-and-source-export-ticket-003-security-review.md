# TICKET-003: Provide the entry component, entry function, per-type component factory and invalid-description fallback — Security Review

## Summary

This review covers the delivery of `graph-library/component-packaging-and-source-export/TICKET-003` at HEAD of branch `ticket/cpse-003`: delivery commit `9f6fdfa` plus the code-review amendments in `401e89b`. The `security-reviewer` agent ran the findings phase in a fresh context. Probes ran on isolated scratch copies of `401e89b` made with `git archive`; no tracked file in the repository was changed. One side effect on the repository's untracked `node_modules` is described in the environment note below.

The output path is sound:
- Issue text reaches the page only as React text children. `formatIssue` escapes the path with the message escaper.
- The placeholder lists at most 20 issues. At the validator's limit, the worst case I could build is 34 KB of markup.
- No exception text, stack frame or file path reaches an issue.
- Hostile inputs never make `createGraph`, `Graph` or a per-type component throw. I tried revoked proxies, throwing getters, a polluted `Object.prototype`, nesting 200,000 levels deep and non-string `textAlternative` values.
- The new code has no network API, storage, logging or HTML sink.

The gaps:
- **SEC-001:** the delivered manifest and lockfile disagree, so `pnpm install --frozen-lockfile` fails. That is the first step of every CI job.
- **SEC-002:** the never-throw guard covers the call to the layout but not the Scene it returns.
- **SEC-003:** consumers receive the raw `issue.path` with no public formatter and no warning, from the `fallback` function that AD-014 designates as the notification.
- **SEC-004 to SEC-006** (Informational): the printed path carries up to 200 unquoted characters of caller text; validation runs on every render; the request-body note is missing from the shared props and per-type components.

Six findings: 0 Critical, 0 High, 0 Medium, 3 Low, 3 Informational.

**Files Reviewed:**
- `src/layout/registry.ts`
- `src/graph.ts`
- `src/core/issues.ts` (`formatIssue`; the message escaper it reuses)
- `src/react/Placeholder.tsx`
- `src/react/createGraphComponent.tsx`
- `src/react/Graph.tsx`
- `src/index.ts`
- `eslint.config.js` (the `src/react/**` purity block)
- `tests/fixtures/layouts.ts`
- `tests/graph.test.ts`
- `tests/react/Graph.test.tsx`
- `tests/core/issues.test.ts` (the `formatIssue` cases)
- `tests/package/boundaries.test.ts` (the purity cases)
- `tests/package/per-type-bundle.test.ts`
- `package.json`
- `pnpm-lock.yaml`

Context read:
- the ticket and its Known Hazards;
- the delivery record, including DEL-001 to DEL-006 and `## Post-Review Amendments`;
- the code review (`…-ticket-003-code-review.md`, Approved);
- `.gener8v/constraints/prd.md`;
- `.gener8v/technical-design/system-design.md`: AD-001, AD-002, AD-008, AD-014, AD-015, and the Interface Contracts;
- `.gener8v/context.md` and `.gener8v/CONVENTIONS.md`;
- downstream tickets CPSE TICKET-004, 006, 007 and 008;
- the earlier security reviews in this change: GSV TICKET-002 to 005 and CPSE TICKET-002;
- the code the delivered files depend on: `src/core/validate/index.ts`, `src/core/validate/envelope.ts`, `src/core/definitions/index.ts`, `src/core/result.ts`, `src/core/format.ts`, `src/core/index.ts`, `src/layout/scene.ts`, `src/layout/kit/check.ts`, `src/react/SceneSvg.tsx`, `tests/fixtures/definitions/*`, `.github/workflows/ci.yml` and `tsconfig.json`.

**Review environment note:** during setup, I ran `CI=true pnpm install` in a shared scratch directory (`…/scratchpad/copy`). An earlier reviewer had left its `node_modules` as a symlink to the repository's own `node_modules`.
- **What was lost:** pnpm removed the repository's top-level `node_modules` links, `.bin` and `.modules.yaml`. This was on 2026-10-11, from about 20:05 to 20:09 local time. The virtual store, `node_modules/.pnpm`, was not touched.
- **How I restored it:** I made a clean install of the same lockfile in an isolated scratch copy, then copied its top-level links, `.bin` shims and `.modules.yaml` into the repository. In the shims, I rewrote the scratch path to the repository path.
- **Verification:** in the repository, `vitest`, `tsc` and `eslint` resolve, and `tests/graph.test.ts` and `tests/react/Graph.test.tsx` pass (33 tests). `git status` shows only `.gener8v/runs.jsonl`.
- **Effect on the parallel review:** the quality reviewer could have seen failing commands in that window.
- **Follow-up:**
  - The `copy/node_modules` symlink is still in the shared scratchpad; delete it.
  - Once SEC-001 is fixed, `pnpm install` in the repository will reconcile `node_modules` completely.

**Findings:** 6
**Critical:** 0 | **High:** 0 | **Medium:** 0 | **Low:** 3 | **Informational:** 3

## Security Assessment

### Input Validation

**Status:** Gaps Found
**Notes:**
**Entry points:**
- `createGraph(description)`: public on `.`.
- `<Graph description textAlternative fallback>`: public on `.`.
- Per-type components made by `createGraphComponent(type, { definition, layout })`: internal factory. Type tickets export the components it makes.

**How I probed:**
- `tsx` scripts in an isolated scratch copy, rendering through `renderToStaticMarkup` and `renderToString`.
- The fixture registry and layouts, plus layouts written to throw or to return malformed Scenes.
- Node.js v24.1.0.

**What is handled well:**
- **Validation stays in GSV:**
  - `createGraphWith` (`src/graph.ts:20-41`) calls `validateWith` and passes only the normalized `description` to the layout.
  - After CR-001, no component reads the raw input.
  - The per-type component's mismatch check is the validator's own `unknown_graph_type`, run against a one-type table.
- **Never throws on a hostile description:** none of the following threw, through `createGraph`, the `Graph` render path or a per-type component, and none put a stack frame in the output:
  - a revoked Proxy;
  - a throwing `type` getter whose message contains `file:///secret.js`;
  - an inherited `type`;
  - a Proxy whose `get` disagrees with its own property;
  - a cycle;
  - `Symbol`, `BigInt` and a function;
  - `null` props;
  - nesting 200,000 levels deep, both as an unknown property and inside a known list;
  - `fc.jsonValue()`, through the delivered property tests.
- **Prototype pollution:**
  - With `Object.prototype.circle` set to a layout and `Object.prototype.type = "circle"`:
    - `getLayout("circle", layouts)` returned `undefined`;
    - `createGraph({})` reported `unknown_graph_type`.
  - Both registries are frozen, null-prototype records, read through `Object.hasOwn` (`src/layout/registry.ts:23-36`; `only()` in `src/react/createGraphComponent.tsx:68-69`).
- **`textAlternative`:**
  - Passed through unchanged (carried CPSE TICKET-002 SEC-003). `null`, `42`, `{}`, `["a"]`, `false` and a `Symbol` each rendered the generated name without throwing, through `textAlternativeFor` (`src/layout/scene.ts`).
  - Caller strings are cleaned there (CPSE TICKET-002 SEC-001, resolved).
- **`fallback`:**
  - Any value other than `"none"` or a function renders the placeholder (DEL-005), so a typo fails safe and visible.
  - A function receives a fresh array of the issues.
  - A class or a non-node return value throws inside the consumer's own code (DEL-004, documented on `Fallback`).
- **Output encoding:**
  - `Placeholder` (`src/react/Placeholder.tsx:28-42`) renders `formatIssue(issue)` as a text child of `<li>`. There is no `dangerouslySetInnerHTML`, Markdown or HTML anywhere in `src/`.
  - A key `<img src=x onerror=alert(1)>` followed by BEL and U+202E printed as `/&lt;img …&gt;\u0007‮: …`.
- **`formatIssue`** (`src/core/issues.ts:386-400`) escapes, in the path, every code point the message escaper escapes. I checked:
  - C0 and C1 controls, including U+0085 and U+009B;
  - U+2028;
  - the bidi controls;
  - zero-width characters;
  - the soft hyphen;
  - the BOM;
  - a lone surrogate left at the 200-character clip.
- **Display bound (carried GSV TICKET-002 SEC-002):** I built 9,990 unknown keys, each 300 × U+202E, near the 10,000-value cap. The result was 20 `<li>`, the longest 1,687 characters, 34,177 characters of markup in total, and no raw U+202E. The delivered test's bound of 20,000 is for its own shape; the worst case stays bounded.

**Gaps:**
- **SEC-002:** a layout that returns a malformed Scene rather than throwing gets past the guard. `Graph` and per-type components then throw during render.
- **SEC-003:** issues handed to consumers carry the raw `path`, and the package offers no public formatter.
- **SEC-004:** the printed path carries up to 200 characters of unquoted caller text.
- **SEC-005:** each render validates again.

**Not applicable:** SQL, NoSQL, command, template and path-traversal injection. The delivered source has no query, shell, template engine or file path. `tests/package/per-type-bundle.test.ts` reads `src/layout/registry.ts` by a fixed pattern at test time only.

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** This is library rendering code. It has no server, accounts, sessions or permissions; `.gener8v/context.md` states there are no user accounts.

### Data Protection

**Status:** Adequate
**Notes:**
- **Exception text (carried GSV TICKET-002 SEC-003):**
  - Every exception in `createGraphWith` becomes `createIssue("internal_error", "", {})`, whose message is fixed (`src/graph.ts:17` and `:36-40`).
  - I probed with a layout that throws `RangeError` from `fmt(Infinity)` and a getter whose message contains `file:///secret.js`. The result and the markup held no `file:`, `/node_modules/`, `    at `, `RangeError` or `Infinity`.
- **Sensitive data:** the code holds no PII or credentials, and logs, stores and transmits nothing.
- **Secret scan:** I scanned the `src/` and `tests/` diff from `618b413` to HEAD for API keys, tokens, passwords, private keys, and AWS, GitHub and npm token shapes. The only match is the test string `"boom at file:///secret.js"`, which is not a credential.
- **Network and sink scan:** I searched the new `src/` files for `http(s):`, `fetch(`, `XMLHttpRequest`, `WebSocket`, `eval(`, `Function(`, storage, `document.`, `window.`, `innerHTML` and `console.`. Nothing matched.

### Configuration Security

**Status:** Gaps Found
**Notes:**
- **Manifest and lockfile disagree (SEC-001):**
  - `package.json` adds `"esbuild": "^0.28.2"` as a devDependency, while the existing `pnpm.overrides` pins `esbuild` to `^0.28.1`.
  - The lockfile records the importer specifier as `^0.28.2`.
  - pnpm compares the overridden manifest (`^0.28.1`) with the lockfile, so `pnpm install --frozen-lockfile` fails with `ERR_PNPM_OUTDATED_LOCKFILE`. I reproduced this in a clean scratch copy of HEAD.
  - A non-frozen install rewrites `pnpm-lock.yaml`.
- **The new dev dependency, `esbuild` 0.28.2:**
  - It was already in the lockfile as a transitive dependency of tsup and vite, at the same version, so only the importer entry is new (`pnpm-lock.yaml:41-43`).
  - It resolves from the default registry with a `sha512` integrity hash. The lockfile has no git, tarball or `file:` sources.
  - Its `postinstall` (`node install.js`) was already allowed by `pnpm.onlyBuiltDependencies` before this ticket.
  - It is MIT-licensed, used only by `tests/package/per-type-bundle.test.ts`, and absent from `dist/`.
- **Purity lint:** the `src/react/**` block (`eslint.config.js`, `PURE_MESSAGE`, `pureImportOptions`, `pureSyntax`) rejects:
  - hooks;
  - `Component`, `PureComponent` and `createContext`;
  - `on*` handlers, as JSX attributes and in `createElement` props;
  - `"use client"`.

  So no event-handler prop can be added to the SVG or the placeholder unnoticed. It repeats the network restrictions for this block.
- **Secrets and defaults:** no hardcoded secrets or debug flags. The default `fallback` is the visible placeholder.
- **Cryptography:** not applicable; the code uses none.
- **Logging and monitoring:** not applicable.
  - The package logs nothing by design.
  - AD-014 leaves side effects such as logging to the consumer, through `validate()`.
  - The catch-all maps every internal failure to the fixed `internal_error`, which gives no diagnostic channel. That is the deliberate trade-off from GSV TICKET-002 SEC-003.

**Dependency audit:** `pnpm audit` (pnpm 10.28.2, Node.js v24.1.0), run 2026-10-12 00:09 UTC (2026-10-11 local) against the HEAD lockfile (`401e89b`) in a scratch copy.
- `pnpm audit`: `No known vulnerabilities found`, exit 0.
- `pnpm audit --prod`: `No known vulnerabilities found`, exit 0. The package has no runtime dependencies; `react` is a peer.

**Spot check of the builder's claims, on the isolated scratch copy (non-frozen install):**
- `pnpm typecheck`: exit 0.
- `pnpm test`: 25 files, 644 tests passed.
- `pnpm build`: exit 0.
- `pnpm check:dist`: "Built files scanned: 5, no network APIs or network modules".
- `eslint .`: exit 0, with my probe directory excluded.
- No test fixture or layout is in `dist/index.js`.
- `CI=true pnpm install --frozen-lockfile` fails (SEC-001). The Verification Run did not include a clean install.

**Carried Known Hazards:**

| Hazard | Result |
|---|---|
| AD-014 / TQ-007: no `onIssues`; the `fallback` function is the notification | Honoured: no `onIssues`, effect or memo; recorded as DEL-001 |
| Validation stays in GSV; render from the normalized description only | Honoured: `createGraphWith` passes `result.description` to the layout. CR-001 removed the last raw read |
| Empty registry; fixture layout in tests only; no fake type shipped | Honoured: `layouts` is empty and frozen; `tests/fixtures/layouts.ts` is test-only |
| GSV TICKET-002 SEC-001: shared `formatIssue` escaping `path`; text children only | Honoured for this ticket's sink (`src/core/issues.ts:386-400`, `src/react/Placeholder.tsx:36`). Consumers who receive issues still get the raw path (SEC-003); the printed path is unquoted (SEC-004) |
| GSV TICKET-002 SEC-002: at most 20 issues, then "…and N more"; a size test | Honoured: `PLACEHOLDER_ISSUE_LIMIT = 20`. The test uses 5,000 keys rather than 10,000, because 10,000 keys exceed the validator's value cap and give one `too_large`. The worst case I measured is 34 KB |
| GSV TICKET-002 SEC-003: no exception text; fixed `internal_error`; frame test | Honoured: `src/graph.ts:36-40`, `tests/graph.test.ts:63-69` and `:97-113`, `tests/react/Graph.test.tsx:215-227` |
| GSV TICKET-003 SEC-001: document the consumer's request-body limit | Honoured on `Graph` and `createGraph` (`src/react/Graph.tsx:17-19`, `src/graph.ts:49-51`). Not on `GraphProps` or per-type components, and not carried to TICKET-008 (SEC-006) |
| GSV TICKET-004 SEC-005: use `describeNormalized`, not `describe` | Honoured: no package code here calls `describe`, and the test layout uses `describeNormalized` |
| CPSE TICKET-002 SEC-003 / CR-006: layout inside `try`, thrown error → `internal_error`, tested with a throwing layout; `textAlternative` unchanged | Honoured as written: `src/graph.ts:35`, and the throwing-layout tests. A layout that returns a malformed Scene instead of throwing still reaches `SceneSvg` outside the guard (SEC-002) |

**Compliance cross-reference:** checked against `.gener8v/constraints/prd.md`. No per-area constraints file exists. The ticket names prd/IC-002, TC-001 and CC-002.

| Constraint | Result |
|---|---|
| prd/CC-001 (license) | Met: `esbuild` is MIT, dev-only and absent from `dist/`. No runtime dependency or asset added. The placeholder uses the system font stack |
| prd/CC-002 (WCAG 2.1 AA, non-text content) | Met: <ul><li>a valid graph keeps `role="img"`, `aria-label` and `<title>` through `SceneSvg`</li><li>the placeholder is text (black on white, 21:1, with a 2px black border), so 1.1.1 does not apply to it, and it reads in greyscale</li><li>`fallback="none"` renders no non-text content</li></ul> |
| prd/CC-003 (no data collection) | Met: no network, storage or telemetry API in the new code; lint clean; `check:dist` clean |
| prd/CC-004 (trademarks) | Not applicable: no images |
| prd/IC-002 (Server Components) | Met: no hooks, state, context, handlers or `"use client"`, enforced by lint. The function `fallback` is called during render, so it never crosses the boundary |
| prd/TC-001 (no measuring) | Met: output is computed from the description alone |

No CC-XXX violation was found, so no finding is raised to Critical.

## Findings

### SEC-001: The manifest and lockfile disagree on `esbuild`, so `pnpm install --frozen-lockfile` fails, and with it every CI job

**Severity:** Low
**Category:** Dependency
**OWASP Reference:** A03:2025 Software Supply Chain Failures. Also A08:2025 Software or Data Integrity Failures.
**Location:**
- `package.json:87`: `"esbuild": "^0.28.2"`, added by this ticket (CR-002 amendment).
- `package.json:107`: `pnpm.overrides.esbuild` is `"^0.28.1"`, unchanged since before the ticket.
- `pnpm-lock.yaml:7-8`: `overrides: esbuild: ^0.28.1`.
- `pnpm-lock.yaml:41-43`: the importer entry, `specifier: ^0.28.2`.
- `.github/workflows/ci.yml:41`: `run: pnpm install --frozen-lockfile`, the first step of every matrix job.

**Description:**
pnpm applies `pnpm.overrides` to the manifest before comparing it with the lockfile. The effective specifier is therefore `^0.28.1`, while the lockfile's importer records `^0.28.2`. In a clean scratch copy of HEAD:
- `CI=true pnpm install --frozen-lockfile --offline` failed with `ERR_PNPM_OUTDATED_LOCKFILE`: "specifiers in the lockfile don't match specifiers in package.json: esbuild (lockfile: ^0.28.2, manifest: ^0.28.1)".
- A plain `pnpm install` succeeded, but rewrote `pnpm-lock.yaml`.

The Verification Run and the code review's re-run both used an existing `node_modules`, so neither saw the failure.

As delivered, every CI job stops at "Install dependencies". None of the following then runs on this branch or on main after merge:
- the lint network and purity rules;
- the `check:dist` network scan;
- the tests;
- the publish path that depends on CI (prd/OC-002).

The obvious quick fix, `--no-frozen-lockfile` in CI, would remove the lockfile's integrity guarantee from every later build.

**Attack Scenario:** No direct exploit. The risk is the loss of a control:
1. CI goes red on every push.
2. The quickest unblock is to drop `--frozen-lockfile`, or to merge on red.
3. From then on, either:
   - CI resolves dependency versions at build time, and a compromised patch release within a caret range enters the build and the published package unreviewed; or
   - a later change that adds a network call or a browser global ships, because the checks that would catch it never ran.

**Impact:** The CI security gates (dependency pinning, network-API scans, boundary lint) do not run until the files agree. There is pressure to weaken the lockfile check.
**Recommendation:**
1. **Make the two agree,** then regenerate the lockfile with pnpm rather than by hand. Either:
   - raise the override to `"esbuild": "^0.28.2"`, or
   - set the devDependency to `"^0.28.1"`.

   I checked the first in a scratch copy: after `pnpm install`, the lockfile changes on three lines (`overrides`, and the two `peerDependencies` ranges that mirror the override), and `CI=true pnpm install --frozen-lockfile --offline` succeeds.
2. **Add a clean frozen install** (`CI=true pnpm install --frozen-lockfile` in a fresh checkout) to the Verification Run of any ticket that changes `package.json` or `pnpm-lock.yaml`.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed (Thomas, 2026-10-12). The `pnpm.overrides` entry for `esbuild` was raised to `^0.28.2`, and `pnpm install` regenerated the lockfile (3 lines changed). `pnpm install --frozen-lockfile` exits 0 in the repository and in a clean copy of the tracked files (`CI=true … --offline`). The delivery record's Verification Run now includes the frozen install. `pnpm audit` was re-run after the lockfile change: no known vulnerabilities.

---

### SEC-002: The never-throw guard covers the call to the layout but not the Scene it returns, so a malformed Scene throws during render in `Graph` and every per-type component

**Severity:** Low
**Category:** Input Validation
**OWASP Reference:** A10:2025 Mishandling of Exceptional Conditions
**Location:**
- `src/graph.ts:35`: `scene: layout(description)` is inside the `try`, but the result is returned as `ok: true` unchecked.
- `src/react/createGraphComponent.tsx:55`: `<SceneSvg scene={result.scene} …/>` is rendered by React after `renderGraph` returns, outside any guard.
- `src/react/SceneSvg.tsx:18-26` and `:39-46`: `toElement` and `scene.nodes.map` assume a well-formed Scene.
- `tests/graph.test.ts:63-69` and `tests/react/Graph.test.tsx:215-227`: only layouts that throw are tested.

**Description:**
The carried hazard (CPSE TICKET-002 SEC-003 and CR-006) is met as written: a layout that throws becomes `internal_error`. A layout defect that does not throw, but returns a malformed Scene, passes the guard. `createGraph` then reports `ok: true`, and React throws while printing the Scene.

I probed six non-throwing layouts. Each was accepted by `createGraphWith` as `ok: true`, and each made both the `Graph` render path and a per-type component throw:

| Layout returns | Error during render |
|---|---|
| `nodes: [undefined]` | `TypeError: Cannot read properties of undefined (reading 'attrs')` |
| `nodes: undefined` | `TypeError: … (reading 'map')` |
| a node of unknown kind | React's `Element type is invalid` |
| `attrs: undefined` | `TypeError: node.attrs is not iterable` |
| a text node whose `text` is an object | `Objects are not valid as a React child` |
| `undefined` | `TypeError: … (reading 'textAlternative')` |

Several things lower the likelihood:
- Layouts are package code, written against the `Scene` type.
- `tsconfig.json` sets `strict` and `noUncheckedIndexedAccess`.
- `checkScene` (`src/layout/kit/check.ts`) runs in every layout test, under a Known Hazard on the type tickets.

A malformed Scene therefore needs a cast, a non-null `!`, or an input the layout tests did not cover. Eleven graph types are still to be written, and CPSE-REQ-018 is a guarantee about every description, so this is a defense-in-depth gap rather than a present bug.

**Attack Scenario:**
- **Attacker:** the author of a stored description that a platform server-renders with `<Graph>`.
- **Steps:** the attacker finds an input that a future layout mishandles without throwing. For example, a list index that a `!` assumed was present leaves `undefined` in `nodes`.
- **Result:** every server render of that page throws, giving a 500 or an unmounted client tree, instead of the placeholder that CPSE-REQ-018 promises.
- **Limit:** this needs a layout defect that no layout test or `checkScene` run catches.

**Impact:** A persistent, author-triggered denial of service of the page that renders the description, contrary to CPSE-REQ-018 and the Component props contract ("never throws").
**Recommendation:**
1. **Check the Scene inside the guard.** In `createGraphWith`, after `layout(description)`, run a cheap structural check before returning `ok: true`, and send a failure to `internal_error`:
   - the Scene is an object;
   - `nodes` is an array;
   - every node is an object whose `kind` is an own key of `ELEMENT_FOR_KIND`;
   - `attrs` is an array of pairs;
   - `text` is a string;
   - `children` is an array.

   `checkScene` already does this. It throws on an `undefined` node, which the surrounding `catch` would catch. Reusing it would also enforce the `url(` and `fmt()` rules at runtime; weigh its cost against the 120 kB budget, or extract the structural part.
2. **Add a test** using one or more of the malformed layouts above, for `createGraph`, `Graph` and a per-type component.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed (Thomas, 2026-10-12). `createGraphWith` runs `checkScene` on the layout's result inside its `try`. Any problem, or a throw from the check itself, becomes the fixed `internal_error`. This also enforces the no-`url(` and `fmt()` rules at runtime. Size is within budget: `.` is now 9.83 kB of 120 kB. `malformedLayouts` in `tests/fixtures/layouts.ts` covers the reviewer's six shapes plus an unrounded number and a `url()` reference, and is tested against `createGraph`, the entry render path and a per-type component. Mutation check: removing the check fails 2 tests.

---

### SEC-003: Issues handed to consumers carry the raw `path`, the package offers no public formatter for it, and the docs steer consumers to log issues

**Severity:** Low
**Category:** Injection
**OWASP Reference:** A05:2025 Injection. Also CWE-117 (improper output neutralization for logs) and CWE-451 (UI misrepresentation of critical information; bidi reordering).
**Location:**
- `src/react/createGraphComponent.tsx:11-19`: `Fallback` says the function "receives every issue", and that a consumer who needs logging calls `validate()`.
- `src/react/createGraphComponent.tsx:40`: the function receives the issues as they are.
- `src/graph.ts:13-15`: `CreateGraphResult` returns `issues`.
- `src/core/result.ts:18-19`: `Issue.path` is documented only as a "JSON Pointer (RFC 6901) to the offending property".
- `src/core/index.ts:4-5`: "Construction and formatting helpers stay internal". `formatIssue` (`src/core/issues.ts:396`) is exported from neither `.` nor `./core`.

**Description:**
`issue.path` is a faithful RFC 6901 pointer, so it holds the caller's key exactly, including newlines, ESC, C1 controls and bidi overrides. GSV TICKET-002 SEC-001 accepted this for the data, on the condition that every text sink formats it. Its recommendation 5 was to "export one `formatIssue(issue)` from `./core`".

This ticket adds two public routes by which issues reach consumer code:
- the `fallback` function, which AD-014 designates as the notification;
- `createGraph`.

`formatIssue` is kept internal, and neither `Issue.path` nor `Fallback` warns that the path must be escaped before printing.

Probe: a description with the key `"x\n2026-10-11T12:00:00Z INFO admin login succeeded user=root‮abc"`.
- The `message` the fallback received was safe: quoted, escaped and clipped.
- The `path` it received held the raw newline and U+202E.
- A fallback rendering `${path}: ${message}` put both raw characters into the consumer's markup. React escapes markup, but not bidi controls or line structure.
- The same template sent to a log produced a forged second log line.

**Attack Scenario:**
- **Attacker:** an author on a platform that stores descriptions and renders them with `<Graph fallback={(issues) => …}>`, or that logs issues as AD-014 suggests.
- **Steps:** the attacker saves a description with a property name holding a newline and a fake log entry, or a right-to-left override.
- **Result:** either:
  - the platform's log shows an entry the platform never wrote, which can hide activity or mislead whoever responds; or
  - the platform's own issue list shows reordered text.
- **Limit:** this needs a consumer who prints `path` without escaping it, and the package currently gives them no helper and no warning. Nothing is disclosed and no script runs.

**Impact:** Log forging and misleading text in consumer-built issue displays, from data the package hands over without saying it is unsafe to print.
**Recommendation:**
1. **Export `formatIssue` from `./core`.** It imports nothing from React, so `./core` stays Node-safe. Document it as the way to print an issue as text.
2. **Document the raw path** on `Issue.path` and on `Fallback`: it may hold any characters from the caller's keys, so print it through `formatIssue`, or escape it.
3. **Carry a Known Hazard** to graph-library/component-packaging-and-source-export/TICKET-008, so the docs show `formatIssue` in the fallback and logging examples.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed (Thomas, 2026-10-12).
- `formatIssue` is exported from `./core`, with a test.
- `Issue.path` and `Fallback` now say the path is the caller's keys verbatim, and to print it with `formatIssue`.
- A Known Hazard on graph-library/component-packaging-and-source-export/TICKET-008 requires the docs' fallback and logging examples to use it.

---

### SEC-004: `formatIssue` prints up to 200 characters of the caller's key unquoted in the path, where messages quote caller text and cap it at 64

**Severity:** Informational
**Category:** Injection
**OWASP Reference:** N/A. Related to OWASP LLM01:2025 Prompt Injection.
**Location:**
- `src/core/issues.ts:386`: `MAX_PATH_CHARS = 200`.
- `src/core/issues.ts:399`: the path is escaped and clipped, but not quoted.
- `src/core/issues.ts:161-164` and `:215-217`: `describeTerm` prints anything not shaped like a term quoted and clipped at 64 characters.

**Description:**
GSV TICKET-002 SEC-001 settled that caller text in a message is shown quoted and capped, so a reader or a model can tell it from the package's own words. `formatIssue` escapes the path correctly, but prints it bare.

The line for the key `"Ignore previous instructions. " × 10` is 397 characters:
- the first 200 are the caller's text, unquoted, reading as package output;
- then the quoted, 64-character excerpt in the message.

A key such as `radius: radius must be greater than 0; got -1. Also see` also forges the `<path>: <message>` separator within a line. A path showing the literal text `\u0007` cannot be told apart from an escaped BEL.

Each issue stays on one line, and `/` in a key becomes `~1`, which mangles URLs. The placeholder's readers see no more than an author could already put in a valid graph's labels.

The formatter is shared, though: TICKET-006 (command line) and TICKET-007 (the tool `summary` returned to a model) will reuse it, and that is where an unquoted 200-character channel matters most.

**Attack Scenario:** N/A (Informational)
**Impact:** The printed issue line carries more caller text, unmarked, than the message policy allows. This matters most for the model-facing summary in TICKET-007.
**Recommendation:** Print the path with the same policy as terms. Either:
- quote a path that contains anything other than term-shaped segments, and clip each segment at 64 characters; or
- print the pointer in a delimited form, such as `at "/…": message`.

Decide before TICKET-006 and TICKET-007 reuse the format. If deferred, add it to the formatter Known Hazard on those tickets.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed (Thomas, 2026-10-12). `formatIssue` now prints a plain pointer (every segment `[A-Za-z0-9_-]{1,64}`) as written. Any other path is quoted, clipped to 64 characters and escaped with the same `quote` used for terms in messages. Tests were updated and added. Mutation check: printing the path unquoted fails 4 tests.

---

### SEC-005: Validation runs on every render, so a description near the input limit costs about 60 ms and 3.7 MB of issues per render, not per description

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** N/A. Related to CWE-400 (uncontrolled resource consumption).
**Location:**
- `src/react/createGraphComponent.tsx:51-56`: `renderGraph` validates on each call.
- `src/react/Graph.tsx:22-25`.
- `src/react/Placeholder.tsx:29`: slices 20 issues after the validator has built them all.
- Delivery record DEL-001: "There is no `onIssues` prop, no effect and no memoization; validation runs on every render."

**Description:**
The validator bounds its own work: one `too_large` issue past 10,000 values, and `maxItems` per list. GSV-REQ-029 still requires it to return every issue below the cap, by Product Owner decision. Measured through the fixture registry on Node.js v24.1.0:

| Unknown keys | Issues | Issue JSON | One render |
|---|---|---|---|
| 1,000 | 1,000 | 376 KB | 7 ms |
| 5,000 | 5,000 | 1.9 MB | 31 ms |
| 9,990 | 9,990 | 3.8 MB | 59 ms |
| 10,001 | 1 (`too_large`) | — | 1.6 ms |

The placeholder then shows 20 of them.
- **On the server:** one render per request. GSV TICKET-003 SEC-001 accepted this cost.
- **In a client tree:** the components are pure and unmemoized, so every re-render of a parent repeats the whole validation. Examples are a lesson editor that re-renders on each keystroke, or a page that animates nearby. On a low-end school laptop, several times slower than this machine, a stored description just under the cap could make each re-render take hundreds of milliseconds.

**Attack Scenario:** N/A (Informational)
**Impact:** A jank-level denial of service of a client page that re-renders often while showing an author-supplied description near the input limit.
**Recommendation:** Either:
- wrap `Graph` and per-type components in `React.memo`, which keeps them pure and works in Server Components, so a re-render with the same `description` object skips validation; or
- document that consumers who re-render often should memoize the element or validate once themselves.

Record the choice next to DEL-001.

**Compliance Impact:** None
**Status:** Accepted Risk
**Risk accepted by:** Security — Thomas, 2026-10-12
**Resolution:** Accepted with documentation. Components stay pure functions that validate on every render (DEL-001); no `React.memo` is added.
- **Rationale:** a memo only helps when the same description object is passed again, and it would turn every component into a memo object.
- **Bound on the cost:** the validator's own input caps limit it to about 59 ms per render at the limit.
- **Mitigation:** `GraphProps.description` now tells pages that re-render often to keep the element stable, or to call `createGraph` once. TICKET-008's Known Hazard carries the same advice to the site.

---

### SEC-006: The request-body-limit note is on `Graph` and `createGraph` only, not on the shared props, the per-type components or the documentation ticket

**Severity:** Informational
**Category:** Misconfiguration
**OWASP Reference:** N/A
**Location:**
- `src/react/Graph.tsx:17-19` and `src/graph.ts:49-51`: the note is present.
- `src/react/createGraphComponent.tsx:22-28`: `GraphProps.description` reads "any value; an invalid one renders the fallback", with no note.
- `src/react/createGraphComponent.tsx:71-80`: `createGraphComponent`'s TSDoc has no note.
- `.gener8v/changes/graph-library/tickets/component-packaging-and-source-export/TICKET-008.md`: the Known Hazards document the per-list and per-description limits, but not the consumer's request-body limit.

**Description:**
The carried hazard (GSV TICKET-003 SEC-001) asks the component documentation to say that a server rendering descriptions from requests must keep its own request-body limit. The validator reads the whole input object before it counts values.

`Graph` and `createGraph` carry the note. Per-type components do not. They are the tree-shakable path most consumers will import, and they get their TSDoc from the type tickets or from `GraphProps`. The documentation site ticket does not carry the note either.

**Attack Scenario:** N/A (Informational)
**Impact:** A consumer who uses a per-type component, or reads only the documentation site, is not told to bound request bodies before rendering.
**Recommendation:**
1. Put the note on `GraphProps.description`, which every component shares.
2. Add it to TICKET-008's Known Hazard on input limits, so the site states it too.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed (Thomas, 2026-10-12). The request-body-limit note is on `GraphProps.description`, which `Graph` and every per-type component share, and in TICKET-008's Known Hazard.

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Fixed | esbuild override raised to `^0.28.2`; lockfile regenerated; clean frozen install passes; frozen install added to the Verification Run | No | `package.json`, `pnpm-lock.yaml` |
| SEC-002 | Fixed | `checkScene` runs inside the `createGraph` guard; malformed Scenes become `internal_error`; 8 malformed-layout cases | No | `src/graph.ts`, `tests/fixtures/layouts.ts`, `tests/graph.test.ts`, `tests/react/Graph.test.tsx` |
| SEC-003 | Fixed | `formatIssue` exported from `./core`; raw-path warning on `Issue.path` and `Fallback`; TICKET-008 hazard | No | `src/core/index.ts`, `src/core/result.ts`, `src/react/createGraphComponent.tsx`, `tests/core/issues.test.ts`, CPSE `TICKET-008.md` |
| SEC-004 | Fixed | Plain pointers as written; other paths quoted and clipped at 64 like terms | No | `src/core/issues.ts`, `tests/core/issues.test.ts`, `tests/react/Graph.test.tsx` |
| SEC-005 | Accepted Risk | Validation per render kept (pure components); memoization advice documented on `GraphProps.description` and in the TICKET-008 hazard | Yes — Thomas, 2026-10-12 | `src/react/createGraphComponent.tsx`, CPSE `TICKET-008.md` |
| SEC-006 | Fixed | Request-body-limit note on `GraphProps.description` and in the TICKET-008 hazard | No | `src/react/createGraphComponent.tsx`, CPSE `TICKET-008.md` |

## Verdict

**Result:** Approved with Notes
**Unresolved Critical/High:** 0
**Accepted Risks:** 1
**Notes:** Resolved with the user (Thomas) on 2026-10-12. SEC-001 to SEC-004 and SEC-006 were fixed and re-verified. SEC-005 (validation per render) is accepted with documentation. Re-verification exits 0 for every command: frozen install in the repository and in a clean copy, lint, typecheck, test (25 files, 653 tests), build, check:dist, check:deps, size (`.` 9.83 kB of 120 kB), publint, attw. `pnpm audit` was re-run on the updated lockfile: no known vulnerabilities. The `node_modules` disruption during the findings phase was restored, and the scratch symlink that caused it was removed.
