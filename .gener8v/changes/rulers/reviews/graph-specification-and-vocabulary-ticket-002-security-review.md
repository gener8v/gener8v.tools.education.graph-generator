# TICKET-002: Publish the ruler's vocabulary terms and schema — Security Review

## Summary

I reviewed `rulers/graph-specification-and-vocabulary/TICKET-002`: the delivery commit `5e1ad02`, the lockfile-only dependency commit `2bd6bf1`, and the code review's test-only resolution `567aacc`, which landed while this review ran. The delivery changes no runtime behavior. It adds three requirement IDs to one `@spec` comment and seven tests. So the surface reviewed is what the delivery verifies: the ruler's published vocabulary, the published schema and the strict tool schema that a model reads, plus the fast-uri bump.

The ruler's limits are stated and enforced, and the strict tool schema leaves no gap a model's tool call can use:
- **Limits stated.** Each limit is stated in the terms' prose: 1 to 30 cm or 1 to 12 in; the division only on inch rulers, a sixteenth when left out; a mark from 0 to the ruler's length; at most 200 characters for a label or title. Each limit is built from the same constants the validator uses (`RULER_MAX_LENGTH`, `DEFAULT_INCH_DIVISION`, `CALLER_TEXT_LIMIT`), so the prose cannot drift from what is enforced.
- **Limits enforced.** Every public path that uses a description validates it first (`validate`, `normalize`, `describe`, `createGraph` and the components). In 29 probe cases written as strict-profile tool calls, the validator was never looser than either schema. Every limit the tool schema does not carry was refused by the validator in under 0.1 ms.

`pnpm audit` and `pnpm audit --prod` are both clean on the current lockfile. The four fast-uri advisories that `2bd6bf1` fixes reproduce on a scratch copy of the earlier lockfile, and they were development-only.

There are 0 findings: 0 Critical, 0 High, 0 Medium, 0 Low, 0 Informational.

**Reviewer:** `security-reviewer` agent, fresh context (findings phase only, 2026-10-25)
**Delivery Record:** `.gener8v/changes/rulers/delivery/graph-specification-and-vocabulary-ticket-002-delivery.md` (DEL-001, Verification Run, Notes)

**Earlier reviews read first:**
- The rulers security reviews: GSV TICKET-001, and NLC TICKET-001 through TICKET-004. None has an accepted risk.
- The graph-library GSV TICKET-007 reviews, which added `maxLength`.

Nothing they decided is raised again (see "Not raised" under Input Validation).

**Files Reviewed:**
- `src/core/definitions/ruler.ts` (`defineRulerProperties`: the `@spec` line, the six terms, value descriptions, `appliesWhen`; the checks `lengthFitsUnit`, `endOnMark`, `objectInOrder`; `describe`)
- `tests/core/schema-shape.test.ts` (the new block "the ruler's published vocabulary and schemas", `:407-472`, including `567aacc`'s CR-001 test; and the helpers `toolForm`, `generatedFiles`)
- `pnpm-lock.yaml` (`2bd6bf1`: `fast-uri@3.1.9` at `:1112`, `:2570`, `:2824`)
- Read unchanged, because the published output and its enforcement come from them:
  - `src/core/schema.ts` (`valueSchema`, `objectSchema`, `typeSchema`, `buildToolSchema`);
  - `src/core/ruler.ts` (`RULER_MAX_LENGTH`, `isRulerLength`, `rulerScale`);
  - `src/core/validate/structure.ts` (`charactersOver`, `checkValue`);
  - `src/generated/schema.json`, `src/generated/tool-schema.json`, `src/generated/vocabulary.json`;
  - `src/core/index.ts`, `src/graph.ts`, `src/tool/index.ts` (still a stub; the tool handler is CPSE TICKET-007);
  - `tests/helpers/ajv.ts`, `package.json`, `.github/workflows/ci.yml`, `.github/dependabot.yml`.

**Context read:**
- The ticket's Constraints (prd/IC-001, prd/TC-008) and its Known Hazards.
- `.gener8v/constraints/prd.md`. There is no `constraints/graph-specification-and-vocabulary.md`.
- `.gener8v/technical-design/system-design.md` (AD-003, AD-004, AD-006), `.gener8v/context.md` and `.gener8v/CONVENTIONS.md`.

**Review environment note:**
- **How I probed:**
  - Every probe was an inline `TSX_DISABLE_CACHE=1 npx tsx -e '…'` run from the repository root.
  - The tool-call probes compiled `getToolSchema()` and `getSchema()` with the tests' Ajv 2020 (`tests/helpers/ajv.ts`). Each case was written in tool form, with every optional value `null`, as a strict-profile model must send it. It was then validated two ways: as sent, and with nulls removed, as AD-006's handler will do.
  - Timings are medians of 9 runs of `validate`.
  - Scratch files (the probe script and its output, both audit JSONs, the pre-bump lockfile copy, the test log and the added lines) are only under the session scratchpad.
- **Runtime:** Node.js v24.1.0, pnpm 10.28.2, Vitest 5.0.3, macOS (Darwin 25.6.0).
- **Commands run:**

| Command | Exit | Evidence |
|---|---|---|
| `pnpm audit` | 0 | No known vulnerabilities found (387 dependencies) |
| `pnpm audit --prod` | 0 | No known vulnerabilities found |
| `pnpm audit --json` | 0 | 0 advisories at every severity |
| `pnpm audit` and `pnpm audit --prod` on a scratch copy of `package.json` and `pnpm-lock.yaml` at `2bd6bf1~1` | 0 and 0 | 4 vulnerabilities (2 moderate, 2 low), all `.>ajv>fast-uri` (see Configuration Security); `--prod`: none |
| `npm view fast-uri@3.1.9 dist.integrity` | 0 | Matches the lockfile's `sha512-hS/0Wt3Y…` |
| `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache` on `schema-shape`, `schema-meta`, `schema-agreement` and `definitions` tests | 0 | 4 files and 86 tests passed, `567aacc`'s test included |
| `pnpm lint`, `pnpm typecheck` | 0, 0 | No output |
| `pnpm check:deps` | 0 | Runtime dependencies: 0 |
| `pnpm check:dist` | 0 | 18 built files scanned, no network APIs or network modules |

- **Not run:** `pnpm size` and `pnpm generate`, as instructed. `pnpm build` was not run; `dist/` had been rebuilt at 20:11 by a concurrent session, and the test run used it.
- **Tree check:** `git status --short` before and after every command and probe showed only ` M .gener8v/runs.jsonl`, `?? HANDOFF.md`, the other reviewers' reports and this report. `.gener8v/pipeline-state.yaml` was briefly modified by another session's tooling.

**Findings:** 0
**Critical:** 0 | **High:** 0 | **Medium:** 0 | **Low:** 0 | **Informational:** 0

## Security Assessment

### Input Validation

**Status:** Adequate
**Notes:**
**Entry points.** The delivery adds no entry point and changes no runtime code.

The published surface it verifies is:
- `getVocabulary`, `getSchema` and `getToolSchema` on `./core`;
- the static `schema.json` and `vocabulary.json`.

All three return frozen objects (probed: `Object.isFrozen` is true for each, and repeated calls return the same object). So no caller can weaken the published limits for a later caller in the same process. In any case, validation never reads the schema; it reads the definitions.

The text a model reads (titles, descriptions, value descriptions, the `appliesWhen` note and `RULES`) is package text from the definitions. No caller text reaches it, so there is no prompt-injection path through the tool definition.

**What the strict tool schema leaves to the validator, and whether the validator closes it.** I ran 29 probe cases. "tool" means the strict tool schema accepts the case, and "pub" means the published schema accepts it.

| Value a model can send | Strict tool schema | Validator (nulls removed) |
|---|---|---|
| `length` 0, -1, 31 cm, 13 in, 1e9, 2^53+2, 1e308 | accepted (no `minimum`/`maximum`) | `out_of_range` with the unit's range |
| `length` 5.0 | accepted | valid (JSON `5.0` is the integer 5) |
| `start` -1, `end` 1e308, `start` after `end` | accepted (no bounds) | `out_of_range` |
| `start` 1.05 cm, 1.125 in on a quarter ruler | accepted | `not_on_mark` |
| `start` 5e-324, `start` -0 | accepted | valid as the 0 mark (the mark rule's noise allowance, DEL-004); `describe` says "the 0 cm mark" |
| `smallestDivision` on centimeters | accepted (condition is prose) | `inapplicable_property` |
| `label` with U+202E, a line break or a lone surrogate | accepted (no `pattern` in the tool profile) | `wrong_kind` (plain-text policy) |
| `label` 201 characters, 201 astral characters; `title` 201 | refused (`maxLength` 200) | `too_large` |
| `label` 200 astral characters | accepted | valid: both count code points (`charactersOver`, `src/core/validate/structure.ts:92-97`, and JSON Schema `maxLength`) |
| `color` `url(javascript:1)` | refused (`pattern`) | `unknown_color` |
| `rulerUnit` `centimetres`, `cm` | refused (`enum`) | `wrong_kind` |
| Any of the above sent with its nulls | — | fails closed: `unsupported_version` on `version: null`, until CPSE TICKET-007's handler removes nulls |

- **Agreement.** No case was valid to the validator yet refused by either schema, so the validator stays at least as strict as both (GSV-NFR-003).
- **Cost.** It does not grow with a caller's numbers. A 1e15 ruler with a 1e15 object takes 0.030 ms, and a 30 cm ruler with ends at ±1e308 takes 0.061 ms. Both fail before `rulerScale` builds any mark, because `isRulerLength` is checked first (`src/core/ruler.ts:155-157`). The largest valid ruler, 12 in to sixteenths, takes 0.087 ms.
- **Fail closed downstream.** `describe` throws "the description is not valid" on the 1e9 ruler, and `createGraph` returns `ok: false`. A caller-sized length never reaches layout.

**The delivery's tests.** They pin the surface this review relies on, against the real registered ruler rather than the `conditionalRuler` fixture:
- the stated limits;
- `appliesWhen`;
- `maxLength` 200 on `measuredObject.label` in the vocabulary, and in both schemas (`567aacc`);
- the ruler in both schemas, with its example accepted by each;
- no "centimetre" in any generated file.

They read only fixed repository paths (`examples/ruler.json`, the `generatedFiles()` list).

**Not raised:**
- **No numeric bounds for `length`, `start` or `end` in either schema or in the vocabulary's structured `TermUse`; the limits are prose only.** So a provider's constrained decoding cannot hold a model to them, and the validator is the only enforcement. It refuses each one, cheaply, on every public path (table above).
  - This is deliberate. The ends carry no bound so that a computed `30.000000000000004` is the 30 cm end (DEL-004, in the definition's comment). The length carries none so that its issue states the unit's own range, never the longer unit's (code review CR-002).
  - A unit-agnostic bound of 1 to 30 on the `PropertySpec` would report "1 to 30" for a 31 in ruler. A bound in the schema only would need a second source beside the definition (prd/TC-008).
  - Rulers NLC TICKET-002 SEC-001 already reviewed these values as unbounded.
- **The tool profile publishes no plain-text `pattern`.** That was decided in an earlier security review (the comment in `valueSchema`, `src/core/schema.ts:93-95`). The validator refuses each such character (table above).
- **One cluster of a letter and 199 combining marks is valid, and how it is drawn.** This is carried from rulers NLC TICKET-003 SEC-001 to graph-library GSV TICKET-007, whose code review records it (CR-001, CR-002). This delivery changes no layout or text code.
- **The strict tool schema uses `maxLength`, `minimum`, `maximum` and `maxItems`, which some providers' strict subsets have not documented.** That is the IC-001/AD-006 subset already shipped by graph-library GSV TICKET-007 and earlier. An unsupported keyword affects whether a provider accepts the tool, not what the validator enforces.
- **CI runs no `pnpm audit`.** This is unchanged by the delivery. Dependabot's weekly npm updates are configured (`.github/dependabot.yml:7-10`).

**Not applicable:** SQL, NoSQL, command, template and path injection, and XSS. The delivered code has no query, shell, template engine, caller-chosen file path or markup output. A label holding `<b>"x"</b>` stays text in the normalized description. The renderer's escaping was reviewed in rulers NLC TICKET-003.

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** This is library code with no server, accounts, sessions or permissions (`.gener8v/context.md`: "no user accounts"). The technical design makes no authentication or authorization decision.

### Data Protection

**Status:** Adequate
**Notes:**
- **Sensitive data:** none. The delivery logs, stores and sends nothing.
- **Published text:** the vocabulary and both schemas hold only package text (Input Validation).
- **Secret scan:** I scanned the 63 lines that `5e1ad02` adds under `src` and `tests`, and `567aacc`'s 12 test lines. The patterns:
  - keys, tokens, passwords and private keys;
  - AWS, GitHub, npm and Slack token shapes;
  - URLs, `fetch`, `XMLHttpRequest`, `WebSocket`, `eval` and `Function(`;
  - `innerHTML`, `document.` and `window.`;
  - storage, `console.`, `process.env`, `child_process`, `require(` and `import(`;
  - `__proto__`, `prototype`, `Math.random` and `crypto`.

  The only matches are two `Object.keys(…)` calls in `5e1ad02`, and a parameter named `key` in `567aacc`'s test.

### Configuration Security

**Status:** Adequate
**Notes:**
- **Manifest:** `package.json` is unchanged. The only manifest change is `2bd6bf1`, which moves `fast-uri` from 3.1.8 to 3.1.9 in `pnpm-lock.yaml`, in four lines.
  - `ajv` 8.20.0 is the only package that depends on `fast-uri`.
  - `ajv` is a devDependency (`package.json:111`), imported only by `tests/helpers/ajv.ts` and three schema tests.
  - Installed, `node_modules/.pnpm/ajv@8.20.0/node_modules/fast-uri` links to `fast-uri@3.1.9`. A 3.1.8 copy remains in the pnpm store, linked from nothing.
  - 3.1.9's integrity matches the npm registry. It has no install scripts and no dependencies (BSD-3-Clause). It was published 2026-10-19.
- **Built output:** `pnpm check:dist` and `pnpm check:deps` pass, with 0 runtime dependencies; `react` is a peer. No consumer receives `ajv` or `fast-uri`.
- **Cryptography:** not applicable. No randomness or cryptographic function is used.
- **Logging and monitoring:** not applicable. The package logs nothing (AD-014), and the delivery adds no logger.

**Dependency audit:** `pnpm audit` (pnpm 10.28.2, Node.js v24.1.0), run 2026-10-26 at 00:10 UTC (2026-10-25 20:10 local), read-only, in the repository against the current lockfile (`2bd6bf1` and later).
- `pnpm audit`: No known vulnerabilities found, exit 0.
- `pnpm audit --prod`: No known vulnerabilities found, exit 0.

The pre-bump lockfile (`2bd6bf1~1`), audited from a scratch copy, reports what `2bd6bf1` fixes. All four affect `fast-uri` < 3.1.9 by the path `.>ajv>fast-uri`, and `--prod` is clean:

| Advisory | Severity | CWE | Published (UTC) | Vulnerable |
|---|---|---|---|---|
| GHSA-w74x-v6f9-j3xg: URI scheme spoofing via percent-encoded scheme decoding | moderate | CWE-172, CWE-180 | 2026-10-23 21:41 | >=3.0.0 <3.1.9 |
| GHSA-wjr9-j795-jxcr: host confusion via unchecked WHATWG host canonicalization | moderate | CWE-20, CWE-436 | 2026-10-23 21:37 | >=3.1.3 <3.1.9 |
| GHSA-xhq7-xmqj-769h: improper path equivalence in relative reference normalization | low | CWE-41 | 2026-10-23 21:39 | >=3.0.0 <3.1.9 |
| GHSA-333x-w4r6-6crp: scheme injection via an unescaped first-segment colon in suffix references | low | CWE-41, CWE-116 | 2026-10-23 21:36 | >=3.0.0 <3.1.9 |

Exposure before the fix was nil in practice:
- the tests' Ajv resolves only the schemas' fixed `$schema` dialect URI and no caller URI;
- nothing ships.

The fix is in place, so no finding is raised.

**Carried Known Hazards (security-relevant):**

| Hazard | Result |
|---|---|
| Ticket: a clashing term is renamed in the ruler definition, never defined twice (GSV-REQ-015) | Holds. `length`, `start` and `end` are each defined once, and the definitions consistency check passes (`tests/core/definitions.test.ts`, run) |
| Ticket: "centimetres" offered nowhere | Holds. Absent from every generated file (test). As a value it is `wrong_kind`, refused by both schemas (probed) |
| Ticket: `measuredObject/label` at most 200 characters, published as `maxLength` (GSV-REQ-052) | Holds. 200 in the vocabulary and both schemas (tests, after `567aacc`). Schema and validator count code points alike (probed) |
| prd/IC-001 and AD-006: strict profile, object root | Holds. Root `{ type: "object", properties: { graph }, required: ["graph"], additionalProperties: false }`. The ruler's objects are closed, every property is required, and optional values are nullable. No `if`, `then`, `oneOf` or `const` |
| GSV-NFR-003: the validator is never looser than the schemas | Holds for the ruler. `schema-agreement` (1,000 descriptions from `examples/ruler.json`) passes, and none of the 29 probe cases broke it |
| GSV TICKET-001 (this change): nulls in the tool path fail closed | Holds. A tool-form ruler sent unstripped is `unsupported_version` |

**Compliance cross-reference:** checked against `.gener8v/constraints/prd.md`. No per-area constraints file exists.

| Constraint | Result |
|---|---|
| prd/CC-001 (licenses) | Met. No dependency, asset or copied code added. fast-uri 3.1.9 is BSD-3-Clause, the same license as 3.1.8, and dev-only |
| prd/CC-002 (WCAG 2.1 AA) | Not applicable. No rendering change |
| prd/CC-003 (no data collection or network) | Met. `check:dist` is clean, and the added lines hold no network API |
| prd/CC-004 (no trademarked imagery) | Not applicable |
| prd/IC-001 (tool schema: object root, common subset) | Met. See the Known Hazards table |
| prd/TC-008 (one definition; no schema library) | Met. Every published ruler limit and description comes from `defineRulerProperties` and the `src/core/ruler.ts` constants. `check:deps` reports 0 runtime dependencies |

No CC-XXX violation was found, so no finding is raised to Critical.

## Findings

None. The delivery changes no runtime code. The published ruler surface it verifies states every limit, and the validator, which every public path runs, enforces every limit the strict tool schema leaves open. The dependency advisories found during delivery are fixed in `2bd6bf1`, and the audit is clean.

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:** Final, written in resolution in the main session, 2026-10-26: the findings phase found nothing to resolve, and the code and quality fixes since changed tests and the specification only, no runtime code. `pnpm audit` and `pnpm audit --prod` exit 0 after the fixes (2026-10-26); re-run the dependency audit when the lockfile next changes. The ruler's tool path stays unverified end to end until graph-library CPSE TICKET-007 delivers `handleGraphToolCall`, which must remove nulls and then validate (AD-006).
