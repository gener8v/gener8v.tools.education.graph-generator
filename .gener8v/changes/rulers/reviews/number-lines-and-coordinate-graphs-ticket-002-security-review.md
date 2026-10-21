# TICKET-002: Define the ruler graph type: terms, checks and text alternative — Security Review

## Summary

I reviewed the ruler definition of `rulers/number-lines-and-coordinate-graphs/TICKET-002` as it stands at HEAD (`1d1736c`), after the code review (`0b24c7f`) and the quality review (`1d1736c`) changed it. Delivery was `61373bc`. Against hostile input, the definition holds up:
- every caller value is checked for kind before any check reads it, and nothing is coerced;
- every end is located by the one mark rule, and no probe made validation fail open;
- every caller string in the text alternative is cleaned and quoted;
- the checks do bounded work and never throw;
- the dependency audit is clean.

There are 2 findings: 0 Critical, 0 High, 0 Medium, 0 Low, 2 Informational. Both are latent or pending decisions made elsewhere:
- **SEC-001:** the bounds of a number range are read through the prototype chain. With a polluted `Object.prototype.min` or `.max`, the ruler's unbounded `length`, `start` and `end` get bounds, so valid rulers are refused. A polluted string `max` is written raw into the `ordered` issue's message. The reads are older than this ticket, but the ruler is the first type with number terms that have neither bound. It fails closed and needs a separate pollution bug.
- **SEC-002:** the measured object's label is stated in full in the text alternative, with no length bound. The ticket's security-derived `maxLength` hazard was not applied (a deviation recorded by code review CR-007). The cost that remains is the one graph-library GSS TICKET-002 SEC-002 left with the Product Owner.

**What reaches this code.** `ruler` is defined and exported from `src/core/definitions/ruler.ts`, but it is not registered (DEL-002). No source file and no entry point imports it, and no built file holds its terms. Today it is reachable only through `validateWith` with a registry that holds it. As instructed, I assessed it as if it were registered: a ruler description written by a model or an untrusted caller, passed to `validate` and `describe`, whose issue messages and text alternative go back to a model or a person. The one change that is already public is `not_on_mark`, which is now in `ISSUE_CODES`, `issueDocs` and the message templates.

What I probed in memory:
- **Hostile values.** I placed 32 values at each of 9 terms, 288 descriptions in all:
  - numbers: `NaN`, ±`Infinity`, −0, ±1e308, ±5e-324, `Number.MAX_VALUE`, 2^53 + 2, 1e21, and values at the edges of the noise allowance;
  - other primitives: `1n`, a Symbol, `"2"`, `""`, `null`, `true`;
  - lists: `[]` and `[3]`;
  - objects: with `valueOf` or `Symbol.toPrimitive`, a `Date`, `new Number(3)`, a function and a Proxy.

  None threw, none gave `internal_error`, and no conversion method ran. The longest message was 136 characters.
- **Fail-open fuzz.** I validated 100,000 random descriptions: both units, every division, every length, and ends on, near, between and off the marks, including computed noise and extremes. 10,580 were valid:
  - every valid ruler had both ends located as marks, with the start's index below the end's;
  - every valid ruler's text alternative named exactly those marks;
  - each of the 64,996 `not_on_mark` issues named two adjacent marks of its own ruler.
- **Non-plain values.**
  - Getters never ran. A getter or a hidden key is reported as `wrong_kind`.
  - A class instance or a revoked Proxy is refused as not an object.
  - A two-faced Proxy is read once per key, so the value checked is the value used.
- **Pollution.**
  - After load: 66 keys × 6 values, enumerable or not, over 34 inputs, 792 cases in all. Every output was byte-identical except when the polluted key was `min`, `max`, `exclusiveMin` or `exclusiveMax` (SEC-001).
  - Before load: every other key at once, plus `Array.prototype[0..6]`. Every output was byte-identical.
- **Cost.**
  - A 30 cm ruler with an object takes 43.7 µs to validate and describe.
  - A label and a title of 1,000,000 characters each take 0.86 s, most of it in `describe` (SEC-002).

**Reviewer:** `security-reviewer` agent, fresh context (findings phase only, 2026-10-21)
**Delivery Record:** `.gener8v/changes/rulers/delivery/number-lines-and-coordinate-graphs-ticket-002-delivery.md` (DEL-001..DEL-004, Deviations, Notes, and the Post-Review Amendments CR-001..CR-008 and QR-001..QR-005)

**Earlier reviews read first.** Their findings are not raised again:
- this ticket's `…-code-review` and `…-quality-review`, both Approved:
  - CR-001: exact marks;
  - CR-002: the unit's length range;
  - CR-003: located ends in the text alternative;
  - CR-005 and QR-003: the order range;
  - CR-007: the deviation from the `maxLength` hazard is recorded;
  - CR-008: one check per end;
  - QR-001: the order guards are pinned;
  - QR-002: the factory.

  SEC-002 concerns the security residual of that `maxLength` deviation, not how it was recorded.
- `rulers/number-lines-and-coordinate-graphs-ticket-001-security-review`. Its SEC-001 made `locate` refuse anything but a number without coercing it, so a BigInt cannot throw.
- `rulers/graph-specification-and-vocabulary-ticket-001-security-review`. Its SEC-004 added own-key reads of `optionalInputs` and of issue params (`ownParams`). SEC-001 here is about the nested `range` that fix does not reach.
- The graph-library security reviews, for the threat model: GSS TICKET-002 SEC-001..SEC-004, GSV TICKET-002..004, DGP TICKET-001..003 and CPSE TICKET-003.

**Files Reviewed:**
- `src/core/definitions/ruler.ts` (new)
- `src/core/issues.ts` (the `not_on_mark` additions: `ISSUE_CODES`, `issueDocs`, `IssueParamsByCode`, the template)
- `examples/ruler.json`, `examples/invalid/ruler-object-between-marks.json`, `examples/invalid/ruler-unknown-unit.json` (new)
- `tests/core/ruler-definition.test.ts` (new), `tests/core/definitions.test.ts` (the ruler block), `tests/core/issues.test.ts`
- Read unchanged, because the delivered code's values flow through them:
  - `src/core/ruler.ts` (`rulerScale`, `locate`);
  - `src/core/format.ts` (`cleanText`, `quoteText`, `formatSupplied`);
  - `src/core/validate/index.ts`, `structure.ts`, `domain.ts`, `state.ts`, `json.ts`, `numbers.ts`;
  - `src/core/definitions/types.ts`, `shared.ts`, `index.ts`;
  - `src/core/describe.ts`, `src/core/index.ts`, `src/tool/index.ts`, `src/export/index.ts`, `src/entries/`, `package.json`.

**Context read:**
- the ticket and its Known Hazards, and TICKET-003's Known Hazards and criteria, including those this delivery and its reviews added;
- `.gener8v/constraints/prd.md`. There is no `constraints/number-lines-and-coordinate-graphs.md`;
- `.gener8v/technical-design/system-design.md` (AD-001, AD-003, AD-004, AD-006, AD-008, AD-014, AD-015, the Validation API contract);
- `.gener8v/context.md` and `.gener8v/CONVENTIONS.md`.

**Review environment note:**
- **How I probed:**
  - Every probe was an inline `TSX_DISABLE_CACHE=1 npx tsx -e '…'` run from the repository root, against a registry holding only the ruler. The registered types were used only where noted.
  - Before-load pollution probes ran in a fresh process, which polluted the prototypes and then imported the modules dynamically. Results were hashed against a clean process.
  - Bundles were built in memory with esbuild's API (`write: false`).
  - Scratch files are under the session scratchpad only: the list of added lines, the test and lint logs, and a note on the corpus.
- **Runtime:** Node.js v24.1.0, pnpm 10.28.2, Vitest 5.0.3, tsx 4.23.15, esbuild 0.28.2, macOS (Darwin 25.6.0).
- **Commands run in the repository:**

| Command | Exit | Evidence |
|---|---|---|
| `pnpm audit` | 0 | No known vulnerabilities found |
| `pnpm audit --prod` | 0 | No known vulnerabilities found |
| `pnpm lint` | 0 | — |
| `pnpm typecheck` | 0 | `tsc --noEmit` |
| `npx vitest run --no-cache` (the `test` script, without the cache) | 0 | 48 files and 1,341 tests passed. Its global setup runs `pnpm build`, which rewrites the git-ignored `dist/` |
| `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache` on the `ruler-definition`, `definitions`, `issues`, `validate-structure` and `validate-domain` tests | 0 | 221 tests passed |
| `pnpm check:dist` | 0 | 14 built files scanned, no network APIs or network modules |
| `pnpm check:deps` | 0 | 0 runtime dependencies |
| `src/core/definitions/ruler.ts` piped to `npx eslint --no-cache --stdin`, with `import "react"`, `fetch("x")` or `document.title` prepended (3 runs), and unmodified (1 run) | 1 on each modified run; 0 unmodified | `no-restricted-imports` or `no-restricted-globals` |

- **Not run:**
  - `pnpm size` and `pnpm generate`, as instructed;
  - `pnpm bench`, `publint`, `attw` and `check:images`, which do not reach this code, since no entry point imports the ruler.
- **Tree check:** `git status --short` before and after every command and probe showed only ` M .gener8v/runs.jsonl`, and this report once written.

**Findings:** 2
**Critical:** 0 | **High:** 0 | **Medium:** 0 | **Low:** 0 | **Informational:** 2

## Security Assessment

### Input Validation

**Status:** Gaps Found
**Notes:**
**Entry points.**
- **Once registered (TICKET-003):** `validate`, `normalize` and `describe` on `./core` (`src/core/index.ts:13-14`), and through them the components, the source exporter and the model tool handler. The exporter and the handler are still empty modules (`src/export/index.ts`, `src/tool/index.ts`).
- **Today:** `validateWith(input, registry)` with a registry holding `ruler`, which only the tests build.
- `describe` validates first and throws one fixed error on an invalid input (`src/core/describe.ts:28-37`). `describeNormalized`, which calls `ruler.describe`, is internal, so the text alternative only ever reads a validated ruler.

**Values from the caller:**

| Value | Validation | Where it goes |
|---|---|---|
| `rulerUnit` | `enum` from `RULER_UNITS`: exactly `"centimeters"` or `"inches"` (`src/core/validate/structure.ts:144-159`). `"cm"`, `"__proto__"` and `"toString"` are `wrong_kind` with the package's `allowed` list (probed) | `UNIT_WORDS`, `RULER_MAX_LENGTH` and `rulerScale`, always as an own key |
| `length` | `integer`: a finite whole number, never coerced (`src/core/validate/structure.ts:118-119`). No structural bounds since CR-002. `lengthFitsUnit` reports anything outside 1 to the unit's maximum (`src/core/definitions/ruler.ts:124-131`) | `rulerScale` (which refuses it before listing any mark) and the text alternative, only once it is 1 to 30 |
| `smallestDivision` | `enum` from `INCH_DIVISIONS`, with `appliesWhen` on `rulerUnit` `inches`. `null` is `wrong_kind` on inches and `inapplicable_property` on centimetres (probed) | `rulerScale`, through `optionalInputs` (`src/core/definitions/ruler.ts:148`, `:176`), so a refused division skips both mark checks |
| `measuredObject` | `isPlainObject` and `readObject`: own data descriptors only, read once (`src/core/validate/json.ts:11-46`) | a null-prototype record (`src/core/validate/structure.ts:225`) |
| `start`, `end` | `number`: finite only, never coerced. No structural bounds (DEL-004). `ordered` (`src/core/definitions/ruler.ts:117`), then `endOnMark` and `objectInOrder` through `scaleOf` → `locate` | `out_of_range` and `not_on_mark` messages, through `describeValue`; the text alternative, as the located mark's own value (`src/core/definitions/ruler.ts:233-238`) |
| `label`, `title` | the shared plain-text policy (`findUnsafeTextChar`). Controls, line breaks, direction controls, invisible characters, tag characters and lone surrogates are refused (probed). No length bound (SEC-002) | the text alternative through `cleanText` and `quoteText`. They never enter an issue message except through `describeValue`, which clips them at 40 characters |
| `color` | a color name or hex code, resolved to `#rrggbb` | the normalized description only. TICKET-003 draws it |

**What is handled well:**
- **No coercion, no throw.** I ran the 288-description sweep from the Summary.
  - Every non-number end is `wrong_kind` and is described by kind: "got a big integer", "got a symbol", "got an object".
  - ±1e308, `Number.MAX_VALUE` and 2^53 + 2 are `out_of_range`, naming the ruler's 0 to length.
  - −0 and ±5e-324 are the 0 mark, and the text alternative states "the 0 cm mark".
  - Nothing threw, no `valueOf` or `Symbol.toPrimitive` ran, and no result was `internal_error`.
  - The longest issue list was 454 bytes of JSON.
- **No fail-open, and the text agrees with validation.** I ran the 100,000-description fuzz from the Summary, at a mean of 25 µs per description.
  - No valid ruler had an end off a mark or out of order.
  - No text alternative named a value that is not a mark of its ruler.
  - No `not_on_mark` issue named non-adjacent marks.
  - `endOnMark`, `objectInOrder` and `describe` all use `scaleOf` (`src/core/definitions/ruler.ts:44`), never a fresh comparison. The checks and the text use one rule.
- **Bounded work.** `scaleOf` builds at most 301 frozen marks, and runs at most four times per description: three checks and `describe`. A 30 cm ruler with a computed-noise object takes 43.7 µs to validate and describe (median over 9 runs of 1,000).
- **Non-plain values.**
  - A getter on `end` is `wrong_kind` "plain JSON data", and the getter never ran. A non-enumerable `label` is treated the same way.
  - A class instance and a revoked Proxy are `wrong_kind` "an object".
  - A Proxy object is read through 3 trap calls in all.
  - A Proxy whose descriptor for `end` changes on each read is read once, so the drawn and checked value is the one validated.
  - `Object.create(null)` is accepted.
- **Prototype keys.**
  - A JSON `"__proto__"` key, at the top level or inside `measuredObject`, is `unknown_property`, quoted by `describeTerm`.
  - Nothing it holds reaches the description. Polluting with `{ "title": "PWN", "smallestDivision": "half" }` under it changed nothing.
- **Pollution.** The description and the measured object are null-prototype records. The specs are null-prototype and frozen: `ruler.properties` passes the definitions test's `lockedDown` rule, and I probed it. Each check owns its `optionalInputs`.
  - So `describe`'s reads of `title`, `smallestDivision`, `measuredObject` and `label` never see a polluted value.
  - Neither do the checks' reads of the division.
  - The exceptions are the four range fields (SEC-001).
- **Messages.**
  - Caller values reach messages only through `describeValue`: numbers in shortest form; strings quoted, clipped at 40 characters and escaped; other values named by kind.
  - Terms are package paths (`measuredObject.end`).
  - `not_on_mark`'s marks are package numbers, `index / marksPerUnit`, printed with `formatSupplied` (`src/core/issues.ts:385-386`).
  - `allowed`, `conflicts` and the elements hint ("the measuredObject") are package text.
- **The text alternative.**
  - Every caller string is cleaned and then quoted (`src/core/definitions/ruler.ts:226-227`, `:239-240`).
  - Lookalike closing quotes are replaced, so a label holding `pencil”. The object is 5.5 cm long. “x` reads `labeled “pencil". The object is 5.5 cm long. "x”`.
  - Joiner emoji are kept, and a label of spaces and a no-break space reads as no label.
  - Every number in it is a package value: the length (1 to 30) and the located marks.
  - The unit and division words come from frozen tables, read at a validated key.

**Gaps:**
- **SEC-001:** range bounds are read through the prototype chain. The ruler's three unbounded number terms and its `ordered` pair are newly exposed.
- **SEC-002:** the label has no length bound, so its cost stays linear in `describe`. This is the pending GSS TICKET-002 SEC-002 decision.

**Not raised:**
- **The `ordered` pair compares an end with a start that is off the ruler.** This is not a security matter; it is noted for the main session.
  - DEL-004 removed the ends' structural bounds. So a start of 20 on a 15 cm ruler passes the structure stage, and `ordered` (`src/core/validate/structure.ts:165-175`) tells the end of 7.25 "must be a number greater than 20". No end on that ruler can meet that.
  - `ordered` also marks the end failed, so its own `not_on_mark` appears only on the next pass (probed). A start of 1e308 gives "greater than 1e+308".
  - Neither review raised it. QR-001 tested the reverse case, 5→3.25, where the start is on the ruler. It touches AD-004 and GSV-REQ-031.
- **`describe`'s raw-value fallback** (`src/core/definitions/ruler.ts:237`). For an end that is not a mark, `formatSupplied` would convert the value (`Math.abs`) and print a subnormal in full, over 300 digits. No validated ruler takes that branch (fuzz), and `describe` validates first.
- **Nested `null`s from the strict tool profile.** `measuredObject.label: null` is `wrong_kind`. That fails closed. Stripping nulls is CPSE TICKET-007's handler's job.
- **The definition object and its check objects are not frozen.** The same holds for every registered definition. Their property map is locked down, and `optionalInputs` is read own-key.
- **A label can state the object's length** ("pencil, 5.5 cm"). NLC-REQ-055 governs the figure's own text, and the label is the caller's text by design (TICKET-003 Known Hazard). The quotation marks are not a security boundary (`src/core/format.ts:182-185`).

**Not applicable:** SQL, NoSQL, command and template injection, path traversal, and XSS. The delivered code has no query, shell, template engine, file path or markup output. TICKET-003 draws the ruler.

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** This is library code with no server, accounts, sessions or permissions (`.gener8v/context.md`: "no user accounts"). The technical design makes no authentication or authorization decision.

### Data Protection

**Status:** Adequate
**Notes:**
- **Sensitive data:** none. The code logs, stores and sends nothing. It handles description values and package text only.
- **Issue content:** the new `not_on_mark` issue holds `code`, `path` and `message` only. `below` and `above` appear in the message and in no field (DEL-003). They are package numbers.
- **Exceptions:**
  - Any throw in a check becomes the fixed `internal_error` (`src/core/validate/index.ts:38-40`). A malformed issue is refused by `assertIssue` (`src/core/validate/domain.ts:10-15`).
  - No probe triggered either. No exception text reaches a caller.
- **Secret scan:** I scanned the 565 lines that `git diff main...HEAD -- src tests examples` adds. The patterns:
  - keys, tokens, passwords and private keys;
  - AWS, GitHub, npm and Slack token shapes;
  - URLs, `fetch`, `XMLHttpRequest`, `WebSocket` and `EventSource`;
  - `eval` and `Function(`, `innerHTML` and `dangerouslySetInnerHTML`, `document.` and `window.`;
  - storage, `console.`, `process.env`, `child_process`, `require(` and `import(`;
  - `__proto__`, `.prototype` and `Object.assign`;
  - timers, `Math.random` and `crypto`.

  The only match is the test's null-prototype registry (`tests/core/ruler-definition.test.ts:11-13`, `Object.assign(Object.create(null), …)`).

### Configuration Security

**Status:** Adequate
**Notes:**
- **Manifest:** `git diff main...HEAD` changes no `package.json`, `pnpm-lock.yaml`, workflow, build or lint configuration, and no file under `src/entries/`, `src/index.ts` or `src/core/index.ts`.
- **Built output:**
  - After the test suite's build, the only ruler text in `dist/` is the `not_on_mark` code, its documentation and its template, in `dist/chunk-ZOTTTH66.js` and `dist/types-CjJ2keNk.d.ts`.
  - No built file holds `rulerUnit`, `measuredObject`, `smallestDivision`, `rulerScale` or "lies along it".
  - `check:dist` and `check:deps` pass.
- **Module load:** importing `src/core/definitions/ruler.ts` left unchanged the own keys of `globalThis` and of `Object`, `Array`, and the `Object`, `Array`, `Function`, `Number` and `String` prototypes.
- **Tree-shaking (prd/TC-007):** a bare import of the definition, and an unused named import, each bundle to 0 bytes (esbuild, minified, in memory). The factory works as QR-002 intended.
- **Boundary:** the import-boundary lint rejects React, `fetch` and `document` in the file (probed, prd/TC-005).
- **Secrets and defaults:** none. The limits are named constants from the mark rule (`RULER_MAX_LENGTH`, at most 301 marks).
- **Cryptography:** not applicable. No randomness or cryptographic function is used.
- **Logging and monitoring:** not applicable. The package logs nothing (AD-014), and the delivery adds no logger.

**Dependency audit:** `pnpm audit` (pnpm 10.28.2, Node.js v24.1.0), run 2026-10-21 at about 13:15 UTC in the repository against the HEAD lockfile (`1d1736c`), read-only.
- `pnpm audit`: `No known vulnerabilities found`, exit 0.
- `pnpm audit --prod`: `No known vulnerabilities found`, exit 0. The package has no runtime dependencies; `react` is a peer.
- This branch does not change the lockfile. It was last changed in `ad2452f` on `main` (2026-10-20), the dependency commit that resolved rulers GSV TICKET-001 SEC-001 and SEC-002.

**Carried Known Hazards (security-relevant):**

| Hazard | Result |
|---|---|
| Ticket: every caller string through `quoteText` in `describe`, and capped with `maxLength` (graph-library GSS TICKET-002 SEC-001) | `quoteText`: honoured for `title` and `label`. `maxLength`: not applied. That is a deviation recorded by code review CR-007, for reasons of the specification. Its security residual is SEC-002 |
| Ticket: an off-mark end reported with TICKET-001's rule, never a fresh test; one fault, one issue; every path the check reads in `inputs` | Honoured. Both mark checks and `describe` use `scaleOf` → `locate`, and the fuzz found no disagreement. The one case of a fault that also produces a second, dependent issue is outside security (Not raised) |
| NLC TICKET-001 CR-001 (carried): the division in `optionalInputs`, not `inputs`; only an absent division takes the default | Honoured. An absent division runs at sixteenths. `"eighths"`, `null` and a division on centimetres skip both mark checks (tests, probe) |
| NLC TICKET-001 SEC-001: `locate` refuses non-numbers | Relied on, and not needed. Every end that reaches `locate` has passed `typeof === "number" && Number.isFinite`. A refused end is in `failed`, and its check is skipped |
| rulers GSV TICKET-001 SEC-004: optional inputs and issue params read own-key | Holds for `optionalInputs` (each check owns its list) and for top-level params. Not for the nested `range` (SEC-001) |
| graph-library GSV TICKET-004 SEC-004: domain checks do bounded work, never throw, build issues with `createIssue`, and read a frozen description | Honoured: 43.7 µs at worst, no throw over 100,288 probes, every issue from `createIssue`, and the description frozen before the checks run (`src/core/validate/domain.ts:35`) |
| graph-library GSV TICKET-002 SEC-001, CPSE TICKET-003 SEC-003: caller values in messages quoted, clipped and escaped | Honoured: the longest ruler message is 136 characters. The one raw interpolation is a polluted range field (SEC-001) |
| graph-library GSS TICKET-002 SEC-003, SEC-004: caller text in the text alternative quoted, with lookalike quotes neutralised | Honoured (probe under Input Validation) |
| graph-library DGP TICKET-002 SEC-002: `elementsHint` read as the definition's own string | Honoured: "the measuredObject" is an own string on the definition |
| graph-library GSV TICKET-003 SEC-001: the description's value limit | Unchanged: the measured object's keys count toward it |

**Compliance cross-reference:** checked against `.gener8v/constraints/prd.md`. No per-area constraints file exists. The ticket names prd/CC-002 and TC-005.

| Constraint | Result |
|---|---|
| prd/CC-001 (licenses) | Met: no dependency, asset or font added; `check:deps` reports 0 runtime dependencies |
| prd/CC-002 (WCAG 2.1 AA; text alternative, 1.1.1) | Met for this ticket's part. Every valid ruler in the fuzz has a text alternative that states its unit, length, division and, with an object, its marks. Wiring it as the accessible name is TICKET-003's |
| prd/CC-003 (no data collection or network) | Met: the added lines hold no network API, the boundary lint rejects `fetch` in the file, and `check:dist` is clean |
| prd/CC-004 (no trademarked imagery) | Not applicable |
| prd/TC-005 (core code; no React or browser globals) | Met: `pnpm lint` passes, and `import "react"` or `document.title` prepended to the file fails the boundary rule |
| prd/TC-007 (side-effect-free, tree-shakable) | Met: a bare or unused import of the definition bundles to 0 bytes |
| prd/TC-008 (one in-house definition) | Met: the lists come from the mark rule, and there are 0 runtime dependencies |
| prd/IC-001 (tool schema subset) | Not yet applicable. The ruler joins the tool schema with TICKET-003's `pnpm generate` (DEL-002). Its kinds (`enum`, `integer`, `number`, `object`, `string`, `color`) and `appliesWhen` are already published within the subset |

No CC-XXX violation was found, so no finding is raised to Critical.

## Findings

### SEC-001: Issue ranges are read through the prototype chain, so a polluted `Object.prototype.min` or `.max` bounds the ruler's unbounded `length`, `start` and `end` and refuses valid rulers, and a polluted string `max` is written raw into the `ordered` issue's message

**Severity:** Informational
**Category:** Injection
**OWASP Reference:** N/A. Related to A08:2025 Software or Data Integrity Failures and CWE-1321 (prototype pollution).
**Location:**
- `src/core/validate/numbers.ts:5-12`: `rangeOf` builds a plain `{}` (`:6`) and sets only the bounds its spec owns. `:17-21`: `rangeBroken` destructures all four fields (`:18`), so an absent one is read from `Object.prototype`.
- `src/core/issues.ts:261-272`: `normalizeRange` reads `min`, `max`, `exclusiveMin` and `exclusiveMax` from the range it is given, and returns a plain object.
- `src/core/issues.ts:275-283`: `describeBounds` destructures that result, so a field the result lacks is read through the prototype again. It interpolates the field with `${…}`, unescaped.
- `src/core/issues.ts:407-409` and `:430-436`: `ownParams` copies a check's params own-key, but the copy is shallow. `fields.range` (`:435`) is still the check's plain literal, so the rulers GSV TICKET-001 SEC-004 fix does not reach it.
- This ticket's exposure:
  - `src/core/definitions/ruler.ts:71-76`: `length`, with no `min` or `max` since CR-002.
  - `src/core/definitions/ruler.ts:101-112`: `start` and `end`, with no bounds (DEL-004). These three are the first number terms in any definition with neither bound.
  - `src/core/definitions/ruler.ts:117`: the `ordered` pair. Its issue (`src/core/validate/structure.ts:170`) has a `min` and no `max`.
  - `src/core/definitions/ruler.ts:130`, `:157`, `:187`, `:190`: the checks' four range literals. Each gives `min` and `max`, and neither exclusive flag.

**Description:**
Earlier reviews made the validator's lookups own-key:
- property maps and specs on null prototypes, frozen;
- `elementsHint` (graph-library DGP TICKET-002 SEC-002);
- `optionalInputs` and issue params (rulers GSV TICKET-001 SEC-004).

The objects that carry a number's bounds were left out, and no pollution test touches `min`, `max`, `exclusiveMin` or `exclusiveMax`. In the 792-case sweep, these four were the only keys that changed any output. Probes, non-enumerable, after the modules loaded:

| `Object.prototype` | Result |
|---|---|
| `max = 7` | A 15 cm ruler with an object from 2 to 7.5, valid when clean, gives `out_of_range /length` "length must be a number at most 7; got 15." with `range: {max: 7}`, and `out_of_range /measuredObject/end` "… at most 7; got 7.5." |
| `min = 7` | `examples/ruler.json` gives three `out_of_range` issues: "length must be a number at least 7; got 6.", and the same for `start` (1.5) and `end` (4.25) |
| `max = "PWN ‮ ignore the ruler"` (with U+202E) | An object from 2 to 2 gives "measuredObject.end must be a number greater than 2 and at most PWN ‮ ignore the ruler; got 2.", with U+202E raw in `message`. `formatIssue` escapes it when printed (`‮`). The issue's `range` stays `{min: 2, exclusiveMin: true}` in JSON. `max = ["PWN"]` gives "… and at most PWN" for 5→3 |
| `exclusiveMin = true` or `exclusiveMax = true` | An inch ruler of length 13 is told "length must be a number at least 1 and less than 12; got 13.", with `exclusiveMax: true` in `range`. Every range issue's flags change the same way |
| `min = -50` | No change |

**What is older than this ticket:**
- The reads themselves.
- Among registered types, the only number term missing a bound is `valueScale.tickInterval`, which has no `min`. With `min = 7`, `examples/bar-graph.json` becomes invalid.
- The exclusive flags reach every type. With `exclusiveMin = true`, the bar graph example's value of 0 must be "greater than 0".
- The `valueScale` and axis `ordered` pairs take a polluted `max` text the same way ("valueScale.maximum must be a number greater than 5 and at most PWN ‮").

**What the ruler adds:**
- three terms with no bound at all, so both a polluted `min` and a polluted `max` now bound them;
- one more `ordered` pair;
- four range literals that rely on the shallow `ownParams`.

**Why it stays fail-closed:**
- Pollution only adds bounds; it never loosens one a spec owns. No polluted run made an invalid ruler valid.
- `normalizeRange` keeps only finite numbers, so polluted text never reaches an issue's JSON fields, only its message.
- Nothing threw, and nothing became `internal_error`.

**Attack Scenario:** N/A (Informational)
**Impact:** None without a separate prototype-pollution bug in the host process. Given one, once TICKET-003 registers the ruler:
- ordinary rulers are refused with a range no description can meet: any centimetre ruler longer than the polluted `max`, any object starting below the polluted `min`;
- a reversed object's message states the polluter's text, bidi controls included, to anyone who reads `issue.message` rather than `formatIssue`, a model included.

**Recommendation:**
- Read range fields own-key, through one helper used by `rangeBroken`, `normalizeRange`, `describeBounds` and `describeInterval`:
  ```ts
  const bound = <K extends keyof Range>(range: Range, key: K): Range[K] => (Object.hasOwn(range, key) ? range[key] : undefined);
  ```
  `normalizeRange`'s plain result can then stay the issue's `range`, since every reader goes through `bound`.
- Add pollution tests beside the SEC-004 ones (`tests/core/validate-structure.test.ts:753`):
  - `Object.prototype.max = 7` and `.min = 7` leave valid each of `examples/ruler.json`, a 15 cm ruler with an object from 2 to 7.5, and `examples/bar-graph.json`;
  - `Object.prototype.max = "PWN"`, `.exclusiveMin = true` and `.exclusiveMax = true` leave the 2→2 issue and the length-13 inch ruler's issue exactly as they are unpolluted.
- The fix is in shared code (`numbers.ts`, `issues.ts`). It can land here, or in a commit of its own, or be deferred with a Known Hazard on TICKET-003, which makes the ruler public.

**Compliance Impact:** None
**Status:** Fixed
**Resolution:** Approved and fixed here. `ownRange` in `src/core/issues.ts` reads a range's fields own-key for `rangeOf`, `rangeBroken`, `normalizeRange`, `describeBounds` and `describeInterval`. Pollution tests keep valid rulers valid under `min`/`max` = 7, and leave four faults' issues unchanged under a string `max` and exclusive flags.

---

### SEC-002: The measured object's label is stated in full in the text alternative with no length bound, so the ticket's `maxLength` hazard is not applied and the ruler joins the caller-text cost awaiting the Product Owner's decision (graph-library GSS TICKET-002 SEC-002)

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** N/A. Related to A06:2025 Insecure Design, OWASP LLM10:2025 Unbounded Consumption, CWE-400 (uncontrolled resource consumption) and CWE-770 (allocation of resources without limits).
**Location:**
- `src/core/definitions/ruler.ts:114`: `label: sharedProperties.label`, nested as is (GSV-REQ-040). The shared `label` (`src/core/definitions/shared.ts:108-116`) has no `maxLength`, and neither has `title` (`:31-40`).
- `src/core/definitions/ruler.ts:226-227` and `:239-240`: `describe` cleans each caller string with `cleanText`, then quotes it with `quoteText`, which cleans it again (`src/core/format.ts:186-188`).
- `.gener8v/changes/rulers/tickets/number-lines-and-coordinate-graphs/TICKET-002.md`, Known Hazards: "Every caller string (the object's label) goes through `quoteText` in `describe` and is capped with `maxLength`, as the graph-library hazards require (GSS TICKET-002 SEC-001)".
- `.gener8v/changes/rulers/delivery/number-lines-and-coordinate-graphs-ticket-002-delivery.md`, Deviations: "The ticket's `maxLength` hazard is not applied to the object's label" (added by code review CR-007).

**Description:**
The hazard came from a security review. Its `maxLength` half was not applied, for sound reasons:
- the shared `label` must be nested as is;
- the GSV Edge Case accepts a very long label ("The system should accept it", `.gener8v/specifications/graph-specification-and-vocabulary.md:139`).

The code review recorded the departure as a deviation. Nobody holding the Security role has yet looked at what it leaves. Measured, as medians:

| Label and title | `validate` + `describe` | Text alternative |
|---|---|---|
| 100,000 characters each | 68 ms | 200,160 characters |
| 1,000,000 characters each | 784 ms (a separate run: `validate` 122 ms, `describe` 738 ms) | 2,000,160 characters |
| 10,000,000 characters each | 8.5 s | 20,000,160 characters |

- **Linear, not amplified.** Each string is stated once, so the text alternative is about 1.0 times the caller text. The circle's `unit` was stated three times (GSS TICKET-002 SEC-003).
- **The cost per string.** `describe` takes about 450 ms per million characters of each string, the same as the circle's title (463 ms), because both clean twice.
- **The drawing is bounded.** It is TICKET-003's. Its criterion "its label (wrapped, cut to its line limit)" bounds the label's text nodes, as GSS TICKET-002 SEC-001 did for the circle. TICKET-003 does not yet carry that hazard's caller-sized-text test.
- **The tool summary is capped.** CPSE TICKET-007's Known Hazard caps the text alternative in its `summary`.

What remains is GSS TICKET-002 SEC-002's residual: on every render, a long label costs CPU in `describe`, and it is printed twice (`aria-label` and `<title>`, AD-008). That finding is `Deferred → Product Owner decision on a GSV caller-text length bound`. The decision is still pending; DGP TICKET-001 SEC-002 also builds on it.

**Attack Scenario:** N/A (Informational)
**Impact:** None beyond the pending GSS residual. On a platform that renders stored descriptions, a 1 MB label costs about half a second of `describe` per render. The tool handler pays the same per call before its summary cap applies. The consumer's request-body limit bounds it.
**Recommendation:**
- No code change is needed in this ticket. In resolution, do one of these:
  - record the ruler's `label` (and `title`) under the decision pending from GSS TICKET-002 SEC-002. A `maxLength` on the shared `label` then reaches the ruler with no change here, because the ruler nests the shared spec;
  - or accept the residual for the ruler until that decision, with a `**Risk accepted by:**` line.
- Add a Known Hazard on TICKET-003: a caller-sized label test, for example a 500 KB label drawing a bounded number of text nodes without throwing. This is the test GSS TICKET-002 SEC-001's hazard asks for.
- Optionally, for every definition at once rather than the ruler alone, clean each caller string once. For example, add a `src/core/format.ts` helper that adds the marks and replaces lookalike quotes on text already cleaned. That halves `describe`'s cost.

**Compliance Impact:** None. prd/CC-002 is served: the text alternative states the label whole.
**Status:** Deferred → Product Owner decision on a GSV caller-text length bound (graph-library/geometric-shapes-and-solids-ticket-002-security-review/SEC-002); caller-sized label test → TICKET-003
**Resolution:** Approved: the ruler's label and title join the pending decision. A `maxLength` on the shared `label` will reach the ruler unchanged. A Known Hazard on TICKET-003 asks for a 500 KB label test.

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Fix | Approved and fixed here. `ownRange` in `src/core/issues.ts` reads a range's fields own-key for `rangeOf`, `rangeBroken`, `normalizeRange`, `describeBounds` and `describeInterval`. Pollution tests keep valid rulers valid under `min`/`max` = 7, and leave four faults' issues unchanged under a string `max` and exclusive flags. | No | `src/core/issues.ts`, `src/core/validate/numbers.ts`, `tests/core/ruler-definition.test.ts` |
| SEC-002 | Defer | Approved: the ruler's label and title join the pending decision. A `maxLength` on the shared `label` will reach the ruler unchanged. A Known Hazard on TICKET-003 asks for a 500 KB label test. | No | `.gener8v/changes/rulers/tickets/number-lines-and-coordinate-graphs/TICKET-003.md` |

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:**
- Both findings were resolved in the main session with the Engineer's approval (2026-10-21). The changes are recorded in the delivery record's `## Post-Review Amendments`.
- SEC-001 is fixed in the shared range helpers, for every type.
- SEC-002 is deferred to the pending Product Owner decision on caller-text length, with a Known Hazard on TICKET-003.
- The `ordered` cascade the reviewer noted is fixed too. The ruler's order is decided by mark index alone, so an end is never compared with a start off the ruler.
- Dependency audit: `pnpm audit` and `pnpm audit --prod`, 2026-10-21, no known vulnerabilities. Re-run in re-verification: exit 0.
