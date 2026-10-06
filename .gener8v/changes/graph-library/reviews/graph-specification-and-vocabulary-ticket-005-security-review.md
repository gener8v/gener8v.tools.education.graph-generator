# TICKET-005: Schema generator — published schema, strict tool schema, types and vocabulary — Security Review

## Summary

This review covers the schema generator delivered for `graph-library/graph-specification-and-vocabulary/TICKET-005` (branch `ticket/gsv-005`, commit `7d0f255`). The `security-reviewer` agent ran the findings phase in a fresh context.

The ticket adds:
- pure builders that turn the graph-type definitions into the published JSON Schema, the strict tool schema that model providers will receive, the vocabulary and the TypeScript description types;
- three input-free getters on `./core`, built on first call, cached and deep-frozen;
- a build-time generator script;
- dev-only Ajv and fast-check tests.

The runtime attack surface is small:
- the getters take no input;
- the builders are not reachable through the package's `exports` map;
- nothing in the built output evaluates code or touches the network.

The generated TypeScript, the colour pattern and the frozen getters held up under probing. The gaps are about trust in the published artifacts, not about code execution:
- the published schema accepts every character class the plain-text policy exists to block, and its own wording suggests otherwise (SEC-001);
- the vocabulary's term table is an ordinary object read with `??=`, so inherited keys silently remove published terms (SEC-002).

Two findings: 0 Critical, 0 High, 0 Medium, 1 Low, 1 Informational.

**Files Reviewed:**
- `src/core/schema.ts`
- `src/core/index.ts`
- `scripts/generate.ts`
- `src/generated/description.ts`
- `src/generated/schema.json`
- `src/generated/tool-schema.json`
- `src/generated/vocabulary.json`
- `tests/fixtures/generated/description.ts`
- `package.json`
- `pnpm-lock.yaml` (the delivery commit's additions; not listed under Files Produced, but changed by commit `7d0f255`)
- `.github/workflows/ci.yml`
- `tests/core/schema-shape.test.ts`
- `tests/core/schema-meta.test.ts`
- `tests/core/schema-agreement.test.ts`
- `tests/package/node-entry.test.ts`

Context read:
- the ticket, including its Known Hazards, and its delivery record;
- `.gener8v/constraints/prd.md` (no per-area constraints file exists);
- `.gener8v/technical-design/system-design.md`: AD-001, AD-003, AD-006, AD-015, and Component Design › Schema generator;
- `.gener8v/context.md`;
- the GSV TICKET-001, TICKET-003 and TICKET-004 security reviews;
- the code the builders read or mirror: `src/core/definitions/index.ts`, `src/core/definitions/types.ts`, `src/core/definitions/shared.ts`, `src/core/style.ts`, `src/core/format.ts` (the plain-text policy), `src/core/validate/structure.ts`, `src/core/validate/envelope.ts` and `src/core/validate/state.ts` (`deepFreeze`);
- the build and test plumbing: `tests/core/definitions.test.ts` (term rules), `tsup.config.ts`, `vitest.config.ts` and `tests/setup/build.ts`.

**Findings:** 2
**Critical:** 0 | **High:** 0 | **Medium:** 0 | **Low:** 1 | **Informational:** 1

## Security Assessment

### Input Validation

**Status:** Gaps Found
**Notes:**
**Entry points:**
- **Runtime:** `getSchema()`, `getToolSchema()` and `getVocabulary()` (`src/core/schema.ts:327-340`, exported at `src/core/index.ts:15-16`) take no arguments. They build once from the frozen, null-prototype `definitions` registry.
- **Build time:** `scripts/generate.ts` writes five fixed paths under the repository root from the real and fixture registries.
- **Builders not public:** `buildSchema`, `buildToolSchema`, `buildVocabulary`, `buildDescriptionTypes` and `COLOR_PATTERN` are not in `dist/core/index.d.ts`, and the `exports` map blocks deep imports.

So no caller-controlled value reaches this ticket's code. The security question is whether its outputs are what the package claims they are.

**How I probed:**
- I ran scripts in the session scratchpad through the repository's own `tsx`. They imported `src/core/schema.ts`, the getters through `src/core/index.ts`, the fixture registry and `validateWith`, and used Ajv 2020 from the repository's `node_modules`.
- No repository file was written. I did not run `pnpm generate` or `pnpm build`. Freshness was checked by comparing a fresh in-memory build with the committed files.
- `git status --porcelain` was the same before and after: only the hook-written `.gener8v/runs.jsonl` differs.

**What is handled well:**
- **Generated TypeScript cannot be injected through definition text:**
  - Descriptions go into `/** … */` comments with `*/` escaped (`src/core/schema.ts:269`). A probe description `A circle */ export const pwned = 1; /*` came out as `/** A circle *\/ export const pwned = 1; /* */`, still inside the comment.
  - Enum values and type names go through `JSON.stringify` (`:282`, `:308`).
  - Type names come from the fixed `GRAPH_TYPES`.
  - Terms are emitted as bare identifiers (`:292`), but `tests/core/definitions.test.ts:17,27` holds every term, at every depth, to `/^[a-z][a-zA-Z0-9]*$/`. That rules out `__proto__` and anything that is not an identifier.
- **The colour pattern is linear:**
  - `COLOR_PATTERN` (`src/core/schema.ts:34-36`, 200 characters) is an anchored alternation of fixed-length branches with no nested quantifier.
  - 1,000,000-character hostile inputs (`#aaaa…`, `blacblac…`, `#aBc#aBc…!`) took 0.004–0.006 ms per test, so it is no ReDoS risk to consumers or providers that compile it.
  - It agrees with `resolveColor`, including rejecting the Kelvin sign. The shape test checks this, and the agreement probe confirmed it.
- **No remote references:** neither schema has `$ref` or `$id`. `$schema` is the standard 2020-12 dialect identifier, which validators carry built in, and the package never fetches it. So the schema cannot make a consumer fetch anything.
- **Frozen, unshared getter output:**
  - Every object reachable from the three getters is frozen, and assigning to `getVocabulary().colors.blue` throws `TypeError`. One consumer in a process cannot alter the tool schema another hands to a model.
  - With the fixture registry, the built schema, tool schema and vocabulary share no object with the definitions (0 shared nodes). So `deepFreeze` never reaches definition internals, and a consumer cannot get a mutable alias into them.
- **Prototype hygiene in the schema builders:**
  - `registered()` uses `Object.hasOwn` (`:104-106`).
  - Specs are null-prototype and frozen, so `spec.min`, `spec.ordered` and the like cannot be inherited.
  - With `Object.prototype.radius` and `title` set, the published schema built identically.
- **The fail-closed empty state:** with no registered type, both schemas are `not: {}`, which rejects everything, as the validator does (DEL-002).
- **Agreement direction:** schema-rejects ⇒ validator-rejects (GSV-NFR-003) is tested over the fixture types and every registered type (`tests/core/schema-agreement.test.ts`). I re-ran it: it passed.
- **Freshness:** all five committed generated files equal a fresh in-memory build. The CI step (`.github/workflows/ci.yml:53-65`) and `tests/core/schema-shape.test.ts:182-188` both fail on drift. The getters build from definitions, not files, and `tests/package/node-entry.test.ts:65-79` checks them against the shipped `dist/schema.json` and `dist/vocabulary.json`.

**Gaps:**
- **SEC-001 (published schema):** the published schema accepts what the validator rejects as unsafe text. Probed against the fixture circle's `title`, Ajv accepted every one of:
  - a right-to-left override;
  - a line feed;
  - NUL;
  - a zero-width space;
  - Unicode tag characters.

  The root description lists what "this schema cannot" check and leaves the character policy out. Each string's description says the characters "are not accepted". A BMP-only `\uXXXX` pattern would close most of this portably and keep GSV-NFR-003.
- **SEC-002 (vocabulary terms):** the vocabulary's `terms` table is built on `{}` with `??=` (`src/core/schema.ts:233`, `:247`). Probe results:
  - With `Object.prototype.radius` and `title` set before the build, those two terms vanished from `terms` (30 → 28), while `graphTypes.circle.properties` still listed them.
  - Terms named `toString` or `constructor` pass the camel-case rule, appear in the schema, and vanish from `terms` the same way.

**Not raised as findings:**
- **Validator-only rules beyond the character policy:** derivation agreement, `ordered`, domain checks and the 10,000-value limit. An x,y graph with 1,000 points and 1,000 segments is schema-valid and `too_large` to the validator.
  - The validator is stricter, as GSV-REQ-011 and GSV-NFR-003 allow.
  - Every package path validates.
  - The root description names all four rules.
- **Length of a single string:** neither the schema nor the validator bounds it. A 5,000,000-character title passes both. This is unchanged by this ticket: it is the validator's contract from TICKET-003, whose review measured multi-megabyte strings as cheap.
- **Frozen values, mutable types:** `JsonSchema` and `Vocabulary` are declared mutable, while the values are frozen. Code or an SDK that mutates them in place compiles, then throws. That fails closed, so it is a quality matter.
- **Nested nulls in the tool profile:** optional properties are nullable at every depth of the tool profile, including inside list elements' objects. AD-006 requires the CPSE TICKET-007 handler to remove nulls before validation. It must do so recursively, or valid model calls fail. That is a functional point for that ticket.

**Not applicable:** SQL, NoSQL, command and template injection, and XSS. The delivered code builds JSON and TypeScript text from package-authored definitions only.
- **Paths:** the generator writes five fixed paths, with no caller-supplied path.
- **Generated text:** the only code text generated is TypeScript, covered above.

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** These are library functions and a build script. The package has no server, accounts, sessions or permissions (`.gener8v/context.md`), and the technical design makes no authentication or authorisation decision for this component.

### Data Protection

**Status:** Adequate
**Notes:**
- **Sensitive data:** the delivered code holds no PII or credentials, and the getters log and transmit nothing.
- **Generator output:** `scripts/generate.ts:23` prints `wrote <path>` at build time, with repository-relative paths only.
- **What is published:** the schema and vocabulary publish package-authored text only: definitions, colour values and the 10,000-value limit. None of it is secret.
- **Secret scan:** I scanned the added lines of commit `7d0f255` under `src/`, `scripts/`, `tests/`, `.github/` and `package.json` for:
  - API keys, tokens, passwords, private keys and `_authToken`;
  - AWS, GitHub and npm token shapes;
  - URLs and `process.env`;
  - `eval` and `new Function`;
  - `child_process`, network APIs and console output.

  The only matches were the generator's log line, the 2020-12 dialect identifier (`src/core/schema.ts:16`) and test assertions. `tests/package/node-entry.test.ts` already used `execFileSync`, with a static program.

### Configuration Security

**Status:** Adequate
**Notes:**
- **CI (`.github/workflows/ci.yml`):** the one changed line adds `tests/fixtures/generated` to the freshness check. That step now runs `tsx scripts/generate.ts` on `pull_request`, with the same trust as the existing lint and test steps:
  - the workflow has `permissions: contents: read`;
  - checkout has `persist-credentials: false`;
  - there is no `pull_request_target`, so fork pull requests get no secrets.
- **`package.json`:**
  - The changes are a `generate` script and two dev dependencies, `ajv` ^8.20.0 and `fast-check` ^4.10.2.
  - No runtime dependency was added: `pnpm check:deps` reports 0 in the delivery record, and no file under `src/` or `scripts/` imports either package.
  - `pnpm.onlyBuiltDependencies` still lists only `esbuild`, so none of the new packages can run install scripts.
- **`pnpm-lock.yaml`:** the added entries are listed below; each carries a `sha512` integrity hash, and CI installs with `--frozen-lockfile`.
  - `ajv@8.20.0`, with its dependencies `fast-deep-equal@3.1.3`, `fast-uri@3.1.8`, `json-schema-traverse@1.0.0` and `require-from-string@2.0.2`;
  - `fast-check@4.10.2`, with its dependency `pure-rand@8.4.2`.
- **Build output:**
  - `tsup.config.ts` copies only `schema.json` and `vocabulary.json` into `dist`, and `files: ["dist"]` keeps `tests/fixtures/generated` out of the package.
  - `dist/` (built 13:11, after the commit) contains no `eval`, `new Function`, Ajv or fast-check. That fits AD-003's rationale on strict Content Security Policies: the package does no runtime code generation.
- **Cryptography:** not applicable; none is used.
- **Logging and monitoring:** the library logs nothing, and there are no security events in this component.

**Dependency audit:** `pnpm audit` (pnpm 10.28.2, Node.js v24.1.0), run 2026-10-06 17:12 UTC (13:12 EDT).
- `pnpm audit`: `No known vulnerabilities found`, exit 0.
- `pnpm audit --prod`: `No known vulnerabilities found`, exit 0.
- **Licences of the new dev dependencies** (from the installed `package.json` files):
  - `ajv` 8.20.0: MIT;
  - `fast-check` 4.10.2: MIT;
  - `fast-uri` 3.1.8: BSD-3-Clause;
  - `json-schema-traverse` 1.0.0, `require-from-string` 2.0.2, `pure-rand` 8.4.2 and `fast-deep-equal` 3.1.3: MIT.

  None is bundled or redistributed.

**Spot check of the builder's claims:**
- **Tests:** `GRAPH_GENERATOR_PREBUILT=1 pnpm exec vitest run` on the three schema test files reported 3 files and 28 tests passed (19 + 5 + 4), as the delivery record says.
- **Freshness:** a fresh in-memory build equals all five committed generated files.
- **Repository state:** `git status` shows no source or test change.

**Compliance cross-reference:** checked against `.gener8v/constraints/prd.md`. No per-area constraints file exists for Graph Specification & Vocabulary. The ticket names prd/IC-001 and prd/TC-008.

| Constraint | Result |
|---|---|
| prd/CC-001 (licence) | Met. No runtime dependency, bundled asset or copied code was added. The new dev dependencies are MIT, except `fast-uri` (BSD-3-Clause), and none reaches `dist` |
| prd/CC-002 (WCAG 2.1 AA) | Not applicable: no rendering |
| prd/CC-003 (no data collection) | Met. No network, storage or telemetry API was added. The `$schema` URL is an identifier the package never fetches, and there is no `$ref` or `$id`. `dist` has no network API (`pnpm check:dist` in the delivery record, plus my grep) |
| prd/CC-004 (trademarks) | Not applicable: no images |
| prd/TC-005 (no React DOM or browser globals in `./core`) | Met. `src/core/schema.ts` imports only `src/core` modules, and `tests/package/node-entry.test.ts` imports `./core` with React blocked |
| prd/TC-008 (in-house generator, no runtime library) | Met. The builders are hand-written, and Ajv and fast-check are dev only |
| prd/IC-001 (provider subset) | No security bearing. The shape tests assert the strict-profile rules, and provider re-verification belongs to CPSE TICKET-007 (TQ-002) |

No CC-XXX violation was found, so no finding is raised to Critical.

## Findings

### SEC-001: The published schema accepts the control, text-direction and invisible characters the plain-text policy blocks, and its wording implies it does not

**Severity:** Low
**Category:** Input Validation
**OWASP Reference:** A06:2025 Insecure Design. Also CWE-20 (improper input validation), CWE-451 (user interface misrepresentation of critical information, for direction overrides) and OWASP LLM01:2025 Prompt Injection (tag-character smuggling).
**Location:**
- `src/core/schema.ts:64-88` (`valueSchema`): the `string` kind gets `type` and `description` only. There is no `case "string"`, so no pattern.
- `src/core/schema.ts:20`: `PLAIN_TEXT_NOTE`, "Plain text: control, line-break, text-direction and invisible characters are not accepted.", is added to every string property's description (`:55`).
- `src/core/schema.ts:21-24`: `VALIDATOR_NOTE`, "The package's validator also checks what this schema cannot:", lists agreement within 1%, minimum below maximum, type-specific rules and the value limit. It does not list the character policy. The tool profile repeats this note (`:167`).
- `src/core/format.ts:76-108`: the policy's ranges, which the validator enforces (`src/core/validate/structure.ts:114`).

**Description:**
The ticket's Known Hazard (carried from TICKET-003 SEC-001 and SEC-002) offered two options:
1. express the character policy as a `pattern`;
2. document it as validator-only.

DEL-003 chose to document it, on the grounds that a `u`-flag pattern with supplementary-plane ranges is unportable. Two things are left open.

**The documentation is incomplete and reads as a schema guarantee:**
- The root note is the one place that tells a reader what the schema does not check, and it omits the character policy. DEL-003 itself says "the root says what else the validator checks".
- Next to `"type": "string"`, the per-property sentence "… characters are not accepted" reads as a statement about the schema.
- The ticket's Value line presents the schema as one "that the package is guaranteed to honor". A reader can fairly conclude that validating against `schema.json` enforces plain text. It does not.

Probed against the fixture circle's `title`, Ajv with the published schema accepts each of these, and `validate` rejects each as `wrong_kind`:

| Input | What it is |
|---|---|
| `"Area ‮5 = r‬"` | right-to-left override |
| `"line1\nline2"` | line feed |
| `"a\u0000b"` | NUL |
| `"ad​min"` | zero-width space |
| `"hi\u{E0049}\u{E0047}"` | Unicode tag characters |

**Most of the policy is portable:** only the tag characters (U+E0000–E007F), the supplementary variation selectors and lone surrogates need a `u`-flag pattern. Every other range is in the Basic Multilingual Plane and can be written with plain `\uXXXX` escapes. I built that pattern from the BMP ranges in `src/core/format.ts` and tested it:
- **Superset:** over 200,000 random strings in each regex mode (with and without the `u` flag), it accepted every string `findUnsafeTextChar` accepts, so GSV-NFR-003 is kept.
- **Compiles:** under Ajv 2020 strict, and in Python's `re`.
- **Blocks:** direction overrides, line breaks, NUL, zero-width space and the byte-order mark.
- **Still allows:** accented text, ZWJ emoji sequences and emoji variation selectors.

**Attack Scenario:**
- **Attacker:** an author on a curriculum platform, or text injected into a model that writes descriptions for one.
- **The platform:**
  - takes the package at its word and gates incoming descriptions with Ajv against `@gener8v/graph-generator/schema.json`;
  - stores them;
  - lists their titles in its own UI;
  - feeds stored descriptions to an assistant model as context.
- **Steps:**
  1. The attacker submits a description whose `title` contains a right-to-left override, so the title displays reordered (for example, a worksheet title that reads differently from its stored text). Alternatively, the title hides an instruction in tag characters, which models read as ASCII.
  2. `schema.json` accepts it, and the platform stores it.
- **Result:**
  - The package's own component, tool handler and `describe` all call `validate` and reject it, so a package-rendered graph shows a placeholder.
  - The platform's listing shows the spoofed title.
  - The platform's assistant reads the hidden instruction.
- **Limit:**
  - The attack needs a consumer that uses `schema.json` as its only gate and then uses the text outside the package. Every package path is safe.
  - Tag characters would stay validator-only even with the recommended pattern.

**Impact:** Spoofed or hidden text reaches consumer surfaces that trusted the published schema. The package's own output is not affected.
**Recommendation:**
1. **Encode the BMP part of the policy in the published schema.** Export the BMP ranges from `src/core/format.ts`, so pattern and validator share one source and cannot drift. Then build a `PLAIN_TEXT_PATTERN` from them and add it to `valueSchema`'s `string` case for the published profile:
   ```ts
   // From the same ranges as isUnsafeCodePoint, BMP only. Tag characters (U+E0000–E007F),
   // supplementary variation selectors and lone surrogates stay validator-only (DEL-003).
   // Built: "^[^\\u0000-\\u001F\\u007F-\\u009F\\u00AD\\u061C\\u180E\\u200B\\u200E\\u200F\\u2028-\\u202E\\u2060-\\u206F\\uFEFF\\uFFF9-\\uFFFB]*$"
   case "string":
     if (profile === "published") schema["pattern"] = PLAIN_TEXT_PATTERN;
     break;
   ```
   Add a test like the colour one: over generated strings, the pattern accepts everything `findUnsafeTextChar` accepts. The agreement test then keeps holding without generator changes.
2. **Whether or not 1 is done, correct the wording:**
   - Add the character policy to `VALIDATOR_NOTE`, for example "… text must be plain: no control, line-break, text-direction or invisible characters (this schema checks only some of them) …".
   - Reword `PLAIN_TEXT_NOTE` so that it describes the package's validator, not the schema.
3. **Leave the tool profile to CPSE TICKET-007,** which re-verifies provider rules (TQ-002). Adding the same pattern there is an option if every target provider supports `pattern`, but the handler validates either way.
4. **Record a Known Hazard on CPSE TICKET-008 (documentation):** `schema.json` describes the shape, and `validate()` is the gate for untrusted text. TICKET-008 already documents the validator-only rules (DEL-003).

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** The published strings carry `PLAIN_TEXT_PATTERN` (up to U+FFFF, `\uXXXX` escapes only), proven never to reject what the validator accepts. The root wording is corrected. Known Hazards on CPSE TICKET-007 and TICKET-008.

---

### SEC-002: The vocabulary's term table is an ordinary object read with `??=`, so inherited keys drop published terms

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** A08:2025 Software or Data Integrity Failures. Also CWE-1321 (improperly controlled modification of object prototype attributes).
**Location:**
- `src/core/schema.ts:247`: `const terms: Vocabulary["terms"] = {};` is an ordinary object.
- `src/core/schema.ts:233`: `terms[spec.term] ??= { definition: spec.description, kind: spec.kind };` reads through the prototype chain, so an inherited value suppresses the assignment.
- `src/core/schema.ts:263-264`: `sortedTerms` is built from `Object.keys(terms)` (own keys only), so a suppressed term is gone from the output.
- `src/core/schema.ts:318-323`: the first call's result is cached and frozen for the life of the process.
- `tests/core/definitions.test.ts:17`: `CAMEL_CASE` admits the names of `Object.prototype` members (`toString`, `constructor`, `valueOf`, `hasOwnProperty`, `isPrototypeOf`, `propertyIsEnumerable`, `toLocaleString`).

**Description:**
The vocabulary is the published list of terms that authors, documentation (CPSE TICKET-008) and models learn the description language from (GSV-REQ-013). Two probes with the fixture registry:
- **Pollution:** with `Object.prototype.radius` and `Object.prototype.title` set before `buildVocabulary` ran:
  - `terms` lost `radius` and `title` (30 terms became 28);
  - `graphTypes.circle.properties` still listed both, so the vocabulary contradicted itself;
  - the published schema was unchanged.
- **Inherited names:** a copy of the fixture circle with extra terms `toString` and `constructor` passed the camel-case rule. Both terms appeared in the schema and in the type's `properties`, and both were missing from `terms`.

The rest of the package consistently guards against this class of problem: null-prototype maps, `Object.hasOwn` and `propertySpec`. See graph-library/graph-specification-and-vocabulary-ticket-001-security-review/SEC-003 and graph-library/graph-specification-and-vocabulary-ticket-003-security-review/SEC-003. This table is the exception.

Exploiting it needs a separate prototype-pollution bug in the consumer's process, before the first `getVocabulary()` call. The effect is limited to missing vocabulary entries. Validation and both schemas are unaffected.

**Attack Scenario:** N/A (Informational)
**Impact:** A published vocabulary that silently omits terms and disagrees with itself, for the life of the process, after a prototype pollution elsewhere. The same omission happens without any attack if a type ticket ever names a term after an `Object.prototype` member.
**Recommendation:**
1. **Use own-property semantics:** change the assignment to
   `if (!Object.hasOwn(terms, spec.term)) terms[spec.term] = { definition: spec.description, kind: spec.kind };`
   or build `terms` on `Object.create(null)`. `JSON.stringify` is unaffected either way.
2. **Reject inherited names:** add a rule to the vocabulary check in `tests/core/definitions.test.ts` that rejects a term that is `in Object.prototype`. That closes the non-attack case for every consumer of the definitions, not only this builder.
3. **Add a test:** with `Object.prototype.radius` set, `buildVocabulary(fixtureRegistry).terms` still has `radius`.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** The term table has a null prototype and is written through an own-property check; there is a pollution test, and definitions reject built-in names as terms.

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Approved | The published strings carry `PLAIN_TEXT_PATTERN` (up to U+FFFF, `\uXXXX` escapes only), proven never to reject what the validator accepts. The root wording is corrected. Known Hazards on CPSE TICKET-007 and TICKET-008. | — | see Post-Review Amendments |
| SEC-002 | Approved | The term table has a null prototype and is written through an own-property check; there is a pollution test, and definitions reject built-in names as terms. | — | see Post-Review Amendments |

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:** Resolved with the Product Owner on 2026-10-06. Both findings were fixed and re-verified (see the delivery record's Post-Review Amendments). Characters above U+FFFF (tag characters, supplementary variation selectors) and lone surrogates remain validator-only by design; `validate()` is the gate for untrusted text.
