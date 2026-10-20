# TICKET-001: Open the vocabulary to rulers: type list, object options, value lists and conditional terms — Security Review

## Summary

I reviewed `rulers/graph-specification-and-vocabulary/TICKET-001` at HEAD (`e8f6e01`), after both the code review and the quality review had changed the code. The conditional-term mechanism is sound against caller input:
- no caller key reaches it;
- its messages and `conflicts` carry only package text;
- `leaveOut` removes exactly the left-out subtree;
- validation stays stricter than both schemas, and the tool profile keeps its subset (IC-001).

There are 4 findings: 0 Critical, 0 High, 0 Medium, 2 Low, 2 Informational. The two Low findings are the development-only dependency advisories published today, which the package does not ship and nothing here exposes. The two Informational findings are latent:
- a quadratic cost that QR-004 left for object and list conditional terms;
- two new reads through the prototype chain.

**What changed, and what reaches it.** The ticket adds:
- `ruler` to `GRAPH_TYPES`;
- `PropertySpec.appliesWhen`, decided in `checkConditional` after a map's other properties;
- `DomainCheck.optionalInputs`;
- `conflicts` and a `condition` on `inapplicable_property`, and `allowed` on `wrong_kind` for a fixed list;
- the `appliesWhen` note in both schemas and in the vocabulary.

No registered definition uses `appliesWhen` or `optionalInputs` yet. The ruler (NLC TICKET-002) will be the first, with `smallestDivision`, an enum leaf, at the top level. So every probe of the mechanism uses the test-only fixture (`tests/fixtures/definitions/conditional-ruler.ts`) or definitions built in the probe process.

Probed in memory:
- **Caller keys.** Each of these is `unknown_property` and never reaches the conditional path, at the top level, in `spare` and in an `extras` element:
  - `__proto__` (from `JSON.parse`), `constructor`, `toString`, `hasOwnProperty`, `valueOf`, `appliesWhen` and `condition`;
  - pointer-shaped keys such as `smallestDivision/x` and `spare/unit`;
  - sibling look-alikes such as `"unit "` and `unit` followed by U+202E.

  A getter on `unit` never ran. A hidden `unit` is `wrong_kind`, and the division is then decided as "cannot be known".
- **Messages and fields.**
  - **Fuzz:** 4,000 descriptions with hostile keys and values at every level gave 40,515 issues. The 52 conditional ones had exactly three message shapes, `conflicts` was always a package pointer, and no caller marker appeared. The longest message was 125 characters, with 15,000-character values in the input.
  - **`allowed` and the vocabulary's `appliesWhen`** are fresh copies of package text.
- **`leaveOut`.**
  - `/extras/1/detail` removes nothing under `/extras/10/` or `/extras/11/`, and nothing under the sibling terms `details` or `marksExtra`.
  - A pointer-shaped caller key is escaped (`/smallestDivision~1x`), so it can never share a prefix.
- **Schema agreement.** I validated 20,000 random fixture descriptions (383 valid). Every valid one is accepted by the published schema and by the tool schema with nulls, and none keeps a division beside a unit that is not `inches`. The tool schema's keywords are unchanged with a conditional term (IC-001).
- **Pollution.** Polluting `appliesWhen`, `term` or `values` left every output byte-identical. `optionalInputs` and `condition` did not (SEC-004).
- **Cost.** Leaf conditional terms are linear, as QR-004 left them. Object and list conditional terms under a failed sibling are not (SEC-003).

**Reviewer:** `security-reviewer` agent, fresh context (findings phase only, 2026-10-20)
**Delivery Record:** `.gener8v/changes/rulers/delivery/graph-specification-and-vocabulary-ticket-001-delivery.md` (DEL-001..DEL-003, Notes, and the Post-Review Amendments from both reviews)

**Earlier reviews read first:** `rulers/graph-specification-and-vocabulary-ticket-001-code-review` and `…-quality-review`, both Approved. Their findings are not raised again:
- CR-001: the term's own value is checked when the sibling failed;
- CR-002: `optionalInputs` itself;
- CR-003: `conflicts` and the full sibling name;
- CR-007: required and chained conditions refused;
- CR-008: `allowed`;
- QR-001: one decision in `checkConditional`;
- QR-004: leaf provenance deleted directly.

SEC-003 is the part of QR-004's cost that its fix leaves: object and list terms. SEC-004 concerns how `optionalInputs` is read, not what it means.

**Files Reviewed:**
- `src/core/definitions/types.ts` (`GRAPH_TYPES`, `PropertySpec.appliesWhen`, `AppliesWhen`, `describeCondition`, `DomainCheck.optionalInputs`)
- `src/core/validate/structure.ts` (`checkMap`, `checkConditional`, `leaveOut`, the `enum` branch of `checkValue`)
- `src/core/validate/domain.ts`
- `src/core/issues.ts` (`inapplicable_property` with `condition` and `conflicts`, `wrong_kind` with `allowed`, `aGraph`, `issueDocs`)
- `src/core/result.ts`, `src/core/definitions/shared.ts`, `src/core/definitions/index.ts`
- `src/core/schema.ts` (`describeProperty`, `objectSchema`, `termUses`, `RULES`)
- `src/generated/description.ts`, `src/generated/schema.json`, `src/generated/tool-schema.json`, `src/generated/vocabulary.json`, `tests/fixtures/generated/description.ts` (regenerated)
- `tests/core/validate-structure.test.ts`, `tests/core/validate-domain.test.ts`, `tests/core/definitions.test.ts`, `tests/core/schema-shape.test.ts`, `tests/fixtures/definitions/conditional-ruler.ts`
- Read unchanged, because the new code builds on them:
  - `src/core/validate/json.ts` (`readObject`), `src/core/validate/state.ts` (`touchesFailed`, `deepFreeze`), `src/core/validate/index.ts`, `src/core/validate/envelope.ts`, `src/core/validate/derive.ts` (`dropFailed`);
  - `src/core/format.ts`, `src/core/describe.ts`, `src/core/index.ts`;
  - the registered definitions' checks: `src/core/definitions/bar-graph.ts`, `line-graph.ts`, `pictograph.ts`, `circle.ts`, `categories.ts`, `axis.ts`;
  - `package.json`, `pnpm-lock.yaml`, `vitest.config.ts`, `.github/workflows/ci.yml`, `scripts/check-changesets.ts`.

**Context read:**
- the ticket and its Known Hazards;
- the Known Hazards of `rulers/number-lines-and-coordinate-graphs/TICKET-002`, which consumes this work;
- `.gener8v/constraints/prd.md`. There is no `constraints/graph-specification-and-vocabulary.md`;
- `.gener8v/technical-design/system-design.md` (AD-003, AD-004, AD-005, AD-006, AD-014, AD-015), `.gener8v/context.md` and `.gener8v/CONVENTIONS.md`;
- the threat model in the earlier security reviews:
  - graph-library GSV TICKET-003: input limits, null-prototype results, own-descriptor reads;
  - graph-library GSV TICKET-004: frozen description, `createIssue` in checks, missing values failed;
  - graph-library DGP TICKET-002 SEC-002 and DGP TICKET-003 SEC-003: own-key reads of optional fields;
  - rulers NLC TICKET-001.

**Review environment note:**
- **How I probed:**
  - Every probe was an inline `TSX_DISABLE_CACHE=1 npx tsx -e '…'` run from the repository root.
  - Pollution probes ran in a fresh process per case. Each polluted `Object.prototype` before or after the modules loaded, with enumerable and with non-enumerable properties, and hashed every result against a clean process.
  - Timings are medians of 7 or 9 runs of `validateWith`.
  - Scratch files (the audit JSON, test logs, the list of added lines) are only under the session scratchpad.
- **Runtime:** Node.js v24.1.0, pnpm 10.28.2, Vitest 5.0.3, tsx 4.23.15, esbuild 0.28.2, macOS (Darwin 25.6.0).
- **Commands run in the repository:**

| Command | Exit | Evidence |
|---|---|---|
| `pnpm audit` | 1 | 6 vulnerabilities (2 high, 4 moderate): three advisories, each against `vite` and `launch-editor` (SEC-001, SEC-002) |
| `pnpm audit --prod` | 0 | No known vulnerabilities found |
| `pnpm audit --json` | 1 | Advisory detail: GHSA IDs, CWE, paths, publication times |
| `pnpm lint` | 0 | `eslint .`, no output |
| `pnpm typecheck` | 0 | `tsc --noEmit`, no output |
| `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache` | 0 | 47 files and 1,299 tests passed. `dist/` was built 54 s before the HEAD commit, so the global setup skipped its build |
| `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache` on `validate-structure`, `validate-domain`, `definitions` and `schema-shape` tests, 10 times | 0 on all 10 | 172 tests passed on each run |
| `pnpm check:dist` | 0 | 14 built files scanned, no network APIs or network modules |
| `pnpm check:deps` | 0 | 0 runtime dependencies |
| `pnpm why vite`, `pnpm why launch-editor` | 0 | `vitest 5.0.3 > vite 8.3.2`; `@changesets/cli 3.0.3 > launch-editor 2.14.1`; both dev only |

- **Not run:** `pnpm size` and `pnpm generate`, as instructed. `pnpm build`, `bench`, `publint`, `attw` and `check:images` were also not run, because the build writes `dist/` and the others do not reach this ticket's code.
- **Tree check:** `git status --short` before and after every command and probe showed only ` M .gener8v/runs.jsonl`, and this report once written.

**Findings:** 4
**Critical:** 0 | **High:** 0 | **Medium:** 0 | **Low:** 2 | **Informational:** 2

## Security Assessment

### Input Validation

**Status:** Gaps Found
**Notes:**
**Entry points.** `validate`, `normalize` and `describe` on `./core`, reached from the components, the model tool handler (CPSE TICKET-007, not yet delivered) and consumers. `getSchema`, `getToolSchema` and `getVocabulary` publish the schema text and the vocabulary's `appliesWhen`.
- The ticket adds no public export. `describeCondition` and `AppliesWhen` are internal.
- `GRAPH_TYPES`, `issueDocs` and the `TermUse` type, which are exported, change in content only.
- No graph type a caller can send uses the new mechanism yet. `ruler` stays `unknown_graph_type` until NLC TICKET-002 registers it, as the code review probed.

**Values that reach the new code:**

| Value | Source | Validation | Where it goes |
|---|---|---|---|
| A description key | caller | `propertySpec`, an own-key lookup on null-prototype, frozen maps (`src/core/definitions/types.ts:213-215`). Only a vocabulary term reaches `checkConditional` | the term's place and pointer |
| The sibling's value (`unit`) | caller | its own `enum` check. Kept in the null-prototype `normalized` only when it passed, and read with `Object.hasOwn` (`src/core/validate/structure.ts:319`) | the decision between the three branches |
| The conditional term's value | caller | `checkValue` in branches 1 and 2. Not read at all in branch 3 | `normalized` (branch 2 only); never the conditional message |
| `appliesWhen.term`, `appliesWhen.values` | definition | the definitions test: an `enum` sibling, its own values, optional, not chained (`tests/core/definitions.test.ts:236-249`) | `describeCondition` into the message (through `describeDetail`), the schema description and the vocabulary; `conflicts` |
| An enum's `values` | definition | — | `expected`, `allowed` and the message |
| `optionalInputs` | definition, on a plain check object | the definitions test: real paths, never also in `inputs` | `touchesFailed` (SEC-004) |

**What is handled well:**
- **Keys never reach the conditional path.** See the Summary's list of keys. Every place in a conditional message is built from vocabulary terms and list indices (`child`, `item`, `src/core/validate/structure.ts:68-75`).
  - So the sibling's full place (`extras[1].unit`) and the `conflicts` pointer (`/extras/1/unit`) are package text.
  - `describeDetail` still escapes and clips it.
  - The issue's own `path` is built the same way.
- **One fault, one issue, without fail-open.** A division is left out when its sibling is in `walk.failed`, and `walk.failed` only ever holds a path with its own issue: a failed check, a hidden key, a missing required value or a failed `ordered` pair.
  - So a left-out term never yields `valid: true`. The 20,000-description probe found no valid result keeping a division beside a non-`inches` unit.
  - A hidden top-level key named `spare/unit`, `extras/0/unit` or `""` is reported at its own escaped pointer (`/spare~1unit`, `/extras~10~1unit`, `/`) and does not touch the nested siblings.
- **Branch 3 does no caller-sized work.** A term that does not apply is not walked, like an unknown key: it costs one counted value however large it is. In a list, 1,600 elements give 1,600 issues and 316 kB of issues from a 74 kB description (4.3 times). Wrong-kind list items give about 60 times (GSV TICKET-003 SEC-001).
- **`allowed` on `wrong_kind`.** It is a copy of the frozen `spec.values`. Mutating an earlier issue's `allowed` does not change the next issue.
  - It adds 26% to the issue output of a test-only list of 9,990 bad enum values: 2.40 MB against 1.90 MB, for 40 kB of input.
  - No registered definition has an enum inside a list. `orientation` (bar graph, pictograph) is top-level, and `unitImage` already carried `allowed` as `unknown_image`.
- **Schemas (GSV-NFR-003, IC-001).**
  - The `appliesWhen` note is a `description` string, the only change to either schema.
  - With the fixture, the tool schema keeps an object root and uses only `additionalProperties`, `anyOf`, `description`, `enum`, `items`, `maxItems`, `maximum`, `minimum`, `properties`, `required`, `title` and `type`, with no `if`, `then`, `else` or `dependent*`.
  - A conditional term is `["string", "null"]` with `null` in its `enum`.
  - The `RULES` sentence adds plain ASCII text only.
- **Definition-authored text.** `describeCondition` quotes each value with `JSON.stringify`.
  - A test-only enum value holding `"`, `\`, U+202E, a line break or 250 characters is escaped in the message (`‮`), and the message is clipped at 200 characters of detail.
  - In the schema the note shows the value exactly as the `enum` keyword already does. This is package text, and no registered value is anything but a lower-case word.
- **Nulls in the tool path.**
  - `smallestDivision: null` is refused by the validator: `inapplicable_property` on centimetres and nested, `wrong_kind` on inches.
  - CPSE TICKET-007's criterion removes null-valued optional properties inside `graph` before validation, so a strict-profile model's `null` division takes the default. Either way it fails closed.

**Gaps:**
- **SEC-003:** an object or list conditional term in list elements, left out because its sibling failed, still scans every provenance key. It is latent, since no definition has one.
- **SEC-004:** `check.optionalInputs` and the `condition` param are read through the prototype chain.

**Not raised:**
- `expected` on `wrong_kind` is not clipped, while the message is. Both are package text.
- The conditional `inapplicable_property` points `conflicts` at an absent optional sibling. That is by design: it is the term to add.
- `GRAPH_TYPES` lists `ruler` publicly before it registers, as it lists seven other unregistered types (code review criterion 1).

**Not applicable:** SQL, NoSQL, command, template and path injection, and XSS. The delivered code has no query, shell, template engine, file path or markup output.

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** This is library code with no server, accounts, sessions or permissions (`.gener8v/context.md`: "no user accounts"). The technical design makes no authentication or authorisation decision.

### Data Protection

**Status:** Adequate
**Notes:**
- **Sensitive data:** none. The changed code logs, stores and sends nothing, and handles only description values and package text.
- **Issue content:** the new fields hold package text only:
  - the conditional `inapplicable_property` message and its `conflicts`;
  - `wrong_kind`'s `allowed`.

  Caller strings still reach messages only through `describeTerm` and `describeValue`, and `path` stays a faithful pointer for `formatIssue` (graph-library GSV TICKET-002 SEC-001).
- **Exceptions:** any throw in the stages, including SEC-004's `TypeError`, becomes the fixed `internal_error` (`src/core/validate/index.ts:38-40`). No exception text reaches a caller.
- **Secret scan:** I scanned the 577 lines that `git diff main...HEAD -- src tests` adds. The patterns:
  - keys, tokens, passwords and private keys;
  - AWS, GitHub, npm and Slack token shapes;
  - URLs, `fetch`, `XMLHttpRequest`, `WebSocket` and `EventSource`;
  - `eval` and `Function(`, `innerHTML` and `dangerouslySetInnerHTML`, `document.` and `window.`;
  - storage, `console.`, `process.env`, `child_process`, `require(` and `import(`;
  - `__proto__`, `.prototype` and `Object.assign`;
  - timers, `Math.random` and `crypto`.

  The only matches are three null-prototype registry builders in the tests and the fixture (`Object.assign(Object.create(null), …)`).

### Configuration Security

**Status:** Gaps Found
**Notes:**
- **Manifest:** `git diff main...HEAD` changes no `package.json`, `pnpm-lock.yaml`, workflow, build or lint configuration, and no entry point. The lockfile was last changed in `6442d18` (2026-10-12).
- **Built output:** `pnpm check:dist` and `pnpm check:deps` pass, with 0 runtime dependencies.
- **Cryptography:** not applicable. No randomness or cryptographic function is used.
- **Logging and monitoring:** not applicable. The package logs nothing (AD-014), and the ticket adds no logger.
- **Gaps:** two development-only dependencies carry advisories published today (SEC-001, SEC-002).

**Dependency audit:** `pnpm audit` (pnpm 10.28.2, Node.js v24.1.0), run 2026-10-20 at about 22:40 UTC in the repository against the HEAD lockfile (`e8f6e01`), read-only.
- `pnpm audit`: 6 vulnerabilities, 2 high and 4 moderate, exit 1. They are three GitHub advisories against `launch-editor`, each reported for both `vite` 8.3.2 (through `vitest`, which bundles it in its dev server) and `launch-editor` 2.14.1 (through `@changesets/cli`):

| Advisory | Severity | CWE | Published (UTC) | Affects | Patched |
|---|---|---|---|---|---|
| GHSA-587h-7wmj-h5pm: the `fs.existsSync()` check can be bypassed on Windows | high | CWE-77 | 2026-10-20 19:48 | Windows only | `vite` ≥ 8.3.3, `launch-editor` ≥ 2.14.2 |
| GHSA-698v-4r3x-3vcv: `escapeCmdArgs()` omits `%` escaping on Windows | moderate | CWE-78 | 2026-10-20 18:30 | Windows only, with an attacker-placed file name and an injected environment variable or NTFS stream | as above |
| GHSA-r825-w8mm-5pxw: a path read as an editor CLI flag | moderate | CWE-88 | 2026-10-20 19:51 | Vim, Emacs or Notepad++ with a `+`/`-` entry in the working directory; for Vite, WSL only; for direct callers, also when the first argument starts with `+` or `-` | as above |

- The audit JSON gives no CVSS score for any of the three.
- `pnpm audit --prod`: `No known vulnerabilities found`, exit 0. The package has no runtime dependencies; `react` is a peer.
- The lockfile is unchanged on this branch. The rulers NLC TICKET-001 security review's audit at 17:38 UTC today was clean, so the advisories are new, not introduced by this ticket.

**Carried Known Hazards (security-relevant):**

| Hazard | Result |
|---|---|
| Ticket: the schema and the validator agree, and validation is stricter, never looser (GSV-NFR-003). No `if`/`then`/`dependentSchemas` in the strict tool profile (AD-006, prd/IC-001) | Honoured. 20,000 probe descriptions: every valid one passes both schemas. The tool profile's keyword set is unchanged |
| Ticket: issue codes stay stable (GSV-REQ-034) | Honoured. `ISSUE_CODES` is unchanged; `inapplicable_property` and `wrong_kind` gain optional fields only |
| Ticket: strict vocabulary, no synonyms | Holds: "cm" is `wrong_kind` listing `centimeters` and `inches` (probed) |
| GSV TICKET-003 SEC-001: work is bounded by the input (`DESCRIPTION_VALUE_LIMIT`, `maxItems`) | Holds for leaf conditional terms, which are linear. Not for object and list ones, which are quadratic below the limit (SEC-003) |
| GSV TICKET-003 SEC-003 and SEC-004: null-prototype results and own-descriptor reads | Holds. `normalized` and provenance stay null-prototype, the sibling is read with `Object.hasOwn`, and getters never run |
| DGP TICKET-002 SEC-002 and DGP TICKET-003 SEC-003: optional fields read own-key | Holds for `appliesWhen`, which sits on null-prototype, frozen specs. Not for `optionalInputs` or the `condition` param (SEC-004) |
| GSV TICKET-002 SEC-001 and CPSE TICKET-003 SEC-003: caller text in messages quoted, escaped and capped; `path` printed with `formatIssue` | Holds. The conditional message and `conflicts` hold package text only (fuzz) |
| GSV TICKET-004 SEC-003: a missing required value is failed | Relied on, and holds: a missing required sibling sends its term down branch 1 |
| GSV TICKET-004 SEC-004: the description is frozen, and checks build issues with `createIssue` | Unchanged. `optionalInputs` only adds a reason to skip |
| GSV TICKET-002 SEC-003: no exception text reaches a caller | Holds: SEC-004's `TypeError` becomes the fixed `internal_error` |
| NLC TICKET-002 (CR-001 hazard, as re-worded): list `smallestDivision` in `optionalInputs` | The mechanism behaves as the hazard says: absent runs, failed or not applying skips (`tests/core/validate-domain.test.ts`, probed). How it is read is SEC-004 |

**Compliance cross-reference:** checked against `.gener8v/constraints/prd.md`. No per-area constraints file exists. The ticket names prd/IC-001, TC-008 and TC-005.

| Constraint | Result |
|---|---|
| prd/CC-001 (licenses) | Met: no dependency, asset or copied code added |
| prd/CC-002 (WCAG 2.1 AA) | Not applicable: no rendering. Only the `label` and `color` description texts change |
| prd/CC-003 (no data collection or network) | Met: `check:dist` is clean, and the added lines hold no network API |
| prd/CC-004 (no trademarked imagery) | Not applicable |
| prd/IC-001 (tool schema: object root, common subset) | Met: object root; no keyword outside the subset; the condition is description text only (probed) |
| prd/TC-008 (one definition; no schema library) | Met: `appliesWhen` lives on the one `PropertySpec`; `check:deps` reports 0 runtime dependencies |
| prd/TC-005 (core code only; no React or browser globals) | Met: every change is under `src/core/`, and `pnpm lint` (with the boundary rules) passes |

No CC-XXX violation was found, so no finding is raised to Critical.

## Findings

### SEC-001: `vite` 8.3.2, through `vitest`, bundles `launch-editor` code with three advisories published today (one high, two moderate); exploiting them needs a Windows or WSL developer running a Vite dev server, which nothing in this repository starts

**Severity:** Low
**Category:** Dependency
**OWASP Reference:** A03:2025 Software Supply Chain Failures. Also CWE-77, CWE-78 and CWE-88.
**Location:**
- `pnpm-lock.yaml:1738` and `:3418` (`vite@8.3.2`); `:3432-3446` (`vitest@5.0.3` resolving `vite` 8.3.2); `:1797` (`vitest` accepts `vite` `^6.4.0 || ^7.0.0 || ^8.0.0`).
- `package.json:117` (`"vitest": "^5.0.3"`, a devDependency).
- `node_modules/.pnpm/vite@8.3.2_@types+node@22.20.5_esbuild@0.28.2_tsx@4.23.15_yaml@2.9.1/node_modules/vite/dist/node/chunks/node.js`: the dev server's open-in-editor code, the only place `vite` 8.3.2 holds `launch-editor`.

**Description:**
`pnpm audit` reports GHSA-587h-7wmj-h5pm (high), GHSA-698v-4r3x-3vcv (moderate) and GHSA-r825-w8mm-5pxw (moderate) against `vite` `>=8.3.0 <=8.3.2`, patched in 8.3.3. They are `launch-editor` flaws that Vite carries in its dev-server middleware. On Windows, a crafted file argument ending `\..:1:1` passes the existence check, and an unescaped `%` lets it reach `cmd.exe`. Under WSL, a path starting with `+` or `-` is read by Vim or Emacs as a command.

The real exposure here is much smaller than the advisories' ratings:
- **Not shipped.** `pnpm audit --prod` is clean, `check:deps` reports 0 runtime dependencies, and `check:dist` finds no network module in `dist/`. No consumer of the package receives `vite`.
- **No dev server is served.** `vitest run` (the `test` and `bench` scripts) does not listen for HTTP requests:
  - `vitest.config.ts` has no browser mode, `ui` or `api`;
  - `@vitest/ui` and the browser providers are not installed;
  - no script runs `vite`.

  The vulnerable endpoint only exists on a listening Vite dev server.
- **No Windows or WSL in CI.** CI runs only on `ubuntu-latest` (`.github/workflows/ci.yml:18`). This review ran on macOS.
- **Not introduced by this ticket.** The lockfile is unchanged since `6442d18`, and the advisories were published between 18:30 and 19:51 UTC today, after this morning's clean audits.

**Attack Scenario:**
- **Attacker:** a malicious web page, visited by a contributor. Outside contributors are expected once the repository is public (`.gener8v/context.md`).
- **Assumed conditions:**
  - the contributor works on Windows;
  - they start a Vite dev server from this toolchain, which nothing here does today, for example `npx vite` or a future browser-mode test or component catalogue.
- **Steps:**
  1. While the server listens, the page sends a request to its open-in-editor endpoint with a `file` value ending `\..:1:1` and holding `%…%` sequences.
  2. `launch-editor` passes the existence check and hands the value to `cmd.exe` unescaped.
- **Result:** a command runs on the contributor's machine.
- **Limit:** without a listening dev server on Windows or WSL, there is no path to the code.

**Impact:** Possible command execution on a developer's Windows or WSL machine under the conditions above. No effect on the published package, its consumers or CI.
**Recommendation:**
- In a dependency commit of its own, outside this ticket as the delivery record proposes, move the lockfile's `vite` to 8.3.3 or later:
  - `vitest` 5.0.3 already accepts any `vite` 8.x, so refreshing the transitive entry is enough;
  - a `pnpm.overrides` entry (`"vite": ">=8.3.3"`) works too, if the refresh will not take.
- Re-run `pnpm audit`, the full test suite and `pnpm bench` on the new lockfile.
- Until then, contributors on Windows or WSL should not run a Vite dev server from this checkout. If the update waits, record that as an accepted risk.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed — commit `ad2452f` (a dependency commit of its own): `vite` 8.3.4, declared as a direct dev dependency since it is `vitest`'s peer; `pnpm audit` clean, every check passes on the new lockfile. Approved by the user, 2026-10-20.

---

### SEC-002: `launch-editor` 2.14.1, pinned exactly by `@changesets/cli` 3.0.3, carries the same three advisories; the CLI passes it only paths it builds itself, so exploiting them needs a Windows or WSL developer and a local foothold

**Severity:** Low
**Category:** Dependency
**OWASP Reference:** A03:2025 Software Supply Chain Failures. Also CWE-77, CWE-78 and CWE-88.
**Location:**
- `pnpm-lock.yaml:1253` and `:2956` (`launch-editor@2.14.1`); `:1990` (`@changesets/cli@3.0.3` depends on `launch-editor: 2.14.1`, an exact version).
- `package.json:96` (`"@changesets/cli": "^3.0.3"`, a devDependency).
- `node_modules/.pnpm/@changesets+cli@3.0.3/node_modules/@changesets/cli/dist/add.mjs`:
  - `:24`: `launchEditor(tmpFile)`, the external-editor prompt;
  - `:287`: `launchEditor(changesetPath)`, for `changeset add --open`.

**Description:**
The same three advisories (see SEC-001 and the audit table) are reported against `launch-editor` `<=2.14.1`, patched in 2.14.2. In this repository the package is reached only through `@changesets/cli`'s `add` command, and both of its calls pass a path the CLI builds itself:
- an absolute `<os tmpdir>/<random>/changeset.md`;
- a relative `.changeset/<generated id>.md`.

Neither is attacker-chosen, and neither starts with `+` or `-`. So:
- GHSA-r825-w8mm-5pxw applies only under WSL with Vim, Emacs or Notepad++;
- GHSA-587h-7wmj-h5pm and GHSA-698v-4r3x-3vcv apply only on Windows, where an attacker must also inject an environment variable or an NTFS alternate data stream.

CI never runs `changeset add`. Its "Changesets carry a changelog category" step runs `pnpm check:changesets`, a script that only reads files (`scripts/check-changesets.ts`).

The pin is exact. A lockfile refresh cannot reach 2.14.2 until `@changesets/cli` releases one that takes it, or an override forces it.

**Attack Scenario:**
- **Attacker:** someone who can already set an environment variable or create an NTFS alternate data stream on a contributor's Windows machine.
- **Steps:** the contributor runs `pnpm changeset` and chooses the external editor, or passes `--open`. `launch-editor` builds the `cmd.exe` command without escaping `%`, and the attacker's variable expands into a second command.
- **Limit:** this needs a local foothold on a Windows or WSL developer machine. The paths the CLI passes are not attacker-controlled. No published artifact and no CI job is affected.

**Impact:** Possible command execution on a developer's Windows or WSL machine under those conditions. None on the package or its consumers.
**Recommendation:**
- In the same dependency commit as SEC-001, add a `pnpm.overrides` entry `"launch-editor": ">=2.14.2"`, a patch release in the same minor, or update `@changesets/cli` once a release takes the fix.
- Re-run `pnpm audit` and `pnpm changeset status` to confirm the CLI still loads.
- Until then, contributors on Windows or WSL should not use the changeset editor options. If the update waits on upstream, record that as an accepted risk.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed — commit `ad2452f`: `launch-editor` 2.14.2 through a `pnpm.overrides` entry; `pnpm audit` clean, and `pnpm changeset status` still runs. Approved by the user, 2026-10-20.

---

### SEC-003: An object or list conditional term in list elements still costs time quadratic in the description's size when its sibling fails, because `leaveOut` scans every provenance key for it; QR-004's fix covers only leaf terms

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** N/A. Related to A06:2025 Insecure Design, OWASP LLM10:2025 Unbounded Consumption and CWE-407 (inefficient algorithmic complexity).
**Location:**
- `src/core/validate/structure.ts:336-341` (`leaveOut`). For an object or list term, `:340` walks `Object.keys(walk.provenance)` once per left-out term.
- `src/core/validate/structure.ts:314-317`: branch 1 of `checkConditional`, which calls `checkValue` and then `leaveOut`.
- `tests/core/definitions.test.ts:236-249` (`conditionProblems`), which allows a conditional term of any kind, at any depth.
- For comparison, both of these delete one key and never scan:
  - `ordered`'s removal (`src/core/validate/structure.ts:171-174`);
  - `dropFailed` (`src/core/validate/derive.ts:32-37`).

**Description:**
QR-004 found that `leaveOut` scanned all provenance for every left-out term. Its fix deletes a leaf's own entry and keeps the scan "only below an object or list". The scan's cost still grows with everything kept before it, so object and list terms in list elements remain quadratic.

The probe used a test-only definition: a `values` list of numbers, then an `extras` list whose elements hold an optional enum `unit` and a term conditional on it. Each row is the median of `validateWith`, and every description is under `DESCRIPTION_VALUE_LIMIT`:

| Conditional term in each element | Numbers + elements | Input | Unit `"cm"` (left out) | Unit `"inches"` (control) |
|---|---|---|---|---|
| leaf `division: "half"` | 5,000 + 1,600 | 60 kB | 16.5 ms | 9.6 ms |
| object `detail: { a: 1 }` | 5,000 + 1,249 | 48 kB | 245.8 ms | 10.0 ms |
| list `marks: [1]` | 5,000 + 1,249 | 42 kB | 244.4 ms | 9.5 ms |
| object `detail: { a: 1 }` | 7,500 + 620 | 33 kB | 240.0 ms | — |
| object `detail: { a: 1 }` | 2,500 + 1,870 | 62 kB | 139.8 ms | — |
| object `detail: {}` | 4,990 + 1,665 | 53 kB | 154.4 ms (worst of 9: 192.5 ms) | 10.3 ms |
| object `detail: { a: 1 }` | 0 + 2,490 | 75 kB | 17.7 ms | — |

- **Not applying is cheap.** With `"centimeters"` the term does not apply, nothing is left out, and the 5,000 + 1,249 object shape takes 10.3 ms.
- **The limit does not stop the work in time.** A description just over the limit (5,000 + 1,300) spends 243 ms before returning `too_large`, because the limit is reached only near the end of the walk.
- **How large it is.** The cost is 15 to 25 times the control. A 33–75 kB description costs about what the suite allows a 1 MB hostile description (`tests/core/validate-structure.test.ts:419-426`, under 250 ms).

**What keeps it latent:**
- no registered definition uses `appliesWhen`;
- the ruler (NLC TICKET-002) gives `smallestDivision`, an enum leaf, at the top level, so `leaveOut` runs at most once per ruler;
- the fixture's conditional terms are leaves (`tests/fixtures/definitions/conditional-ruler.ts:14-21`), and the test-only object term (`tests/core/validate-structure.test.ts:680`) is top-level.

**Attack Scenario:** N/A (Informational)
**Impact:** None today. A later definition could give an object or list term a condition inside list elements, for example a measured object that applies to one unit only, in a list of rulers. A ~50 kB description could then hold a synchronous validation for about a quarter of a second, in a browser or on a server rendering stored descriptions. Ten such requests take a CPU-second. That is the cost GSV TICKET-003 SEC-001 set the value limit to bound.
**Recommendation:**
- **The simplest fix: a definitions rule.** A conditional term must be a leaf (`number`, `integer`, `string`, `boolean`, `color` or `enum`). Add it to `conditionProblems` with a broken-definition case, and state it in `appliesWhen`'s doc comment beside the existing rules. The ruler needs nothing more.
- **Or remove only what the check wrote.** In branch 1, run `checkValue` against a scratch provenance record that shares `issues`, `failed` and `count`, then discard it. `leaveOut` then needs no scan for any kind. The subtree-removal tests already in `tests/core/validate-structure.test.ts` pin the behaviour without a timing test.
- **Or defer** with a Known Hazard on whichever ticket first gives an object or list term a condition.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed — `checkLeftOut` checks a left-out term against a scratch provenance record that is dropped, sharing issues, failed set and value count, so no scan is needed for any kind; a test shows left-out values in two list elements still pass the description limit together. Approved by the user, 2026-10-20.

---

### SEC-004: Two new reads go through the prototype chain, `DomainCheck.optionalInputs` on the registered definitions' plain check objects and `inapplicable_property`'s `condition` on issue params, so a polluted `Object.prototype` makes every valid description `internal_error`, hides domain issues, or rewrites an issue's message

**Severity:** Informational
**Category:** Injection
**OWASP Reference:** N/A. Related to A08:2025 Software or Data Integrity Failures and CWE-1321 (prototype pollution).
**Location:**
- `src/core/validate/domain.ts:28-30`: `(check.optionalInputs ?? []).every(…)`. The field is declared at `src/core/definitions/types.ts:282`.
  - Every registered check is a plain, unfrozen object with no own `optionalInputs` (probed).
  - The checks are listed at `src/core/definitions/bar-graph.ts:122`, `line-graph.ts:149`, `pictograph.ts:132` and `circle.ts:149`.
- `src/core/issues.ts:322-327`: the `inapplicable_property` template tests `p.condition !== undefined` first, then the older `p.elements`. `p` is the object literal each caller builds (`src/core/validate/structure.ts:250`, `:255`, `:327`).
- `src/core/issues.ts:412-421`: `createIssue` copies `expected`, `range`, `conflicts`, `suggestion` and `allowed` from the same literal. These reads predate this ticket.

**Description:**
Earlier reviews made the validator's own lookups resistant to a polluted `Object.prototype`:
- null-prototype, frozen property maps and specs;
- own-key reads of `elementsHint` (DGP TICKET-002 SEC-002) and of `intervals` (DGP TICKET-003 SEC-003).

DGP TICKET-003 SEC-003 asked that later optional fields be read own-key too. `appliesWhen` complies: it sits on null-prototype, frozen specs. The two new optional fields here do not.

I ran each case in a fresh process, polluting before and after the modules loaded, with enumerable and with non-enumerable properties. Each run validated 16 real-registry inputs (4 examples, 8 invalid examples and 4 crafted ones) and 8 fixture inputs, built 6 schemas and vocabularies, and hashed everything against a clean run:

| `Object.prototype` pollution | Result |
|---|---|
| `appliesWhen = { term: "unit", values: ["inches"] }` or `{ term: "type", … }` | byte-identical |
| `term = "unit"`, `values = ["inches"]` | byte-identical |
| `optionalInputs` = `null`, `[""]` or `["values/*"]` | byte-identical |
| `optionalInputs = ["title"]` | A bar graph with `title: 5` and one value short loses its `series_length_mismatch`, and reports only `wrong_kind /title`. It stays invalid |
| `optionalInputs = 5` or `"unit"` | 12 of the 16 real inputs, including all four valid examples, become `internal_error`. The other four are circles whose checks all stopped at an absent or failed `inputs` path, so `optionalInputs` was never read. The fixture is unchanged, because each of its checks has its own `optionalInputs` or stopped at its `inputs` |
| `condition = "only when hacked ‮"` | `{ "type": "circle", "radius": 2, "label": "x" }` reads `label applies to a circle only when hacked ‮; remove it.` The text is escaped and clipped by `describeDetail`, but the rule it states is false |

**Why it stays fail-closed:**
- `touchesFailed` is false when nothing failed. So a polluted list only skips checks on a description that is already invalid.
- A non-list throws, and `validateWith`'s `catch` returns the fixed `internal_error`.
- No pollution made an invalid description valid.

**Older reads of the same kind.** Two reads in the lines this ticket edited predate it:
- `p.elements` reaches the message raw: `give it on EACH‮SERIES instead`, with U+202E unescaped.
- `createIssue` copies inherited fields into issues: `Object.prototype.conflicts = ["/hacked"]` adds `conflicts` to every issue.

**Attack Scenario:** N/A (Informational)
**Impact:** None without a separate prototype-pollution bug in the host process. Given one:
- every graph of a type with checks fails as `internal_error`, against `createGraph`'s promise that a valid description never does (the same effect DGP TICKET-003 SEC-003 removed for `intervals`);
- or domain issues are hidden from a model on a description that already has another issue;
- or every ordinary `inapplicable_property` states a condition the package never set.

**Recommendation:**
- **Read `optionalInputs` own-key, and only as a list:**
  ```ts
  const optional = Object.hasOwn(check, "optionalInputs") && Array.isArray(check.optionalInputs) ? check.optionalInputs : [];
  ```
  Alternatively, define checks on null prototypes and freeze them, and extend `lockedDown` to `definition.checks`.
- **Read issue params own-key, in one place.** At the top of `createIssue`, copy `params` into a null-prototype record (`Object.assign(Object.create(null), params)` copies own enumerable properties only). Pass that copy to `issueMessage` and read the copied fields from it. This one change covers the new `condition`, the older `elements`, and the five copied fields.
- **Add pollution tests** beside the `elementsHint` one (`tests/core/validate-structure.test.ts:111`):
  - `Object.prototype.optionalInputs = 5` leaves every example valid;
  - `Object.prototype.condition`, `.elements` and `.conflicts` leave the circle's `inapplicable_property` exactly as it is unpolluted.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed — `optionalInputsOf` reads a check's optional inputs own-key and only as a list; `createIssue` and `issueMessage` read params from an own-key null-prototype copy (`ownParams`); pollution tests for both. Approved by the user, 2026-10-20.

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Fixed | `vite` 8.3.4 as a direct dev dependency (commit `ad2452f`) | No | `package.json`, `pnpm-lock.yaml` |
| SEC-002 | Fixed | `launch-editor` 2.14.2 via `pnpm.overrides` (commit `ad2452f`) | No | `package.json`, `pnpm-lock.yaml` |
| SEC-003 | Fixed | `checkLeftOut` with a scratch provenance record; limit test across elements | No | `src/core/validate/structure.ts`, `tests/core/validate-structure.test.ts` |
| SEC-004 | Fixed | Own-key `optionalInputs` and issue params; pollution tests | No | `src/core/validate/domain.ts`, `src/core/issues.ts`, `tests/core/validate-structure.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:**
- Both dependency findings are fixed in their own commit (`ad2452f`); `pnpm audit` and `pnpm audit --prod`, re-run 2026-10-20 on the new lockfile, report no known vulnerabilities.
- SEC-003 and SEC-004 are fixed and re-verified; each fix fails a test when broken.
- Re-verification: every check exits 0; `pnpm test` (1,302 tests) on three runs.
