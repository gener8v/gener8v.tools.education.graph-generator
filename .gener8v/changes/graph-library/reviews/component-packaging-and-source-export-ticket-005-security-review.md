# TICKET-005: Export a description as a standalone React component source file — Security Review

## Summary

Reviewed the source exporter delivered for graph-library/component-packaging-and-source-export/TICKET-005 at commit `e0c30ac`: the JSX printer, `exportSource`, the React-free `componentName` and the generated version module. The printed component body holds up: every Scene string is a `JSON.stringify` literal in an expression container, so no caller text could break out of a string, JSX text or attribute in any probe, the header cannot be closed early, and the full MIT notice is printed. But the header comment carries the caller's description verbatim, and two mainstream compilers read JSX pragmas (`@jsxImportSource`, `@jsxRuntime`, `@jsx`) anywhere in a comment. A title such as `@jsxImportSource data:text/javascript,… x` therefore makes the compiled file import, and run, attacker-chosen code. 3 findings: 1 Critical, 0 High, 0 Medium, 0 Low, 2 Informational.

**Files Reviewed:**
- `src/export/print.ts`
- `src/export/exportSource.ts`
- `src/export/index.ts`
- `src/core/definitions/names.ts`
- `src/core/issues.ts` (`escapeChars`, `escapedInMessages`)
- `src/layout/scene.ts` (shared `ELEMENT_FOR_KIND`, `REACT_PROP`, `rootAttrs`, `textAlternativeFor`, read for the printer's inputs)
- `src/generated/version.ts`, `scripts/generated-files.ts` (`versionModule`)
- `src/images/types.ts` (`IMAGE_LICENSE_NOTICES`), `LICENSE`
- `tests/export/exportSource.test.ts`, `tests/export/equality.test.ts`, `tests/helpers/exported.ts`, `tests/fixtures/plain-text.ts`

**Findings:** 3
**Critical:** 1 | **High:** 0 | **Medium:** 0 | **Low:** 0 | **Informational:** 2

## Security Assessment

### Input Validation

**Status:** Gaps Found
**Notes:** Caller input reaches the generated `.tsx` file in two places: the component body and the header comment.

- **Component body:** adequate. Text and attribute values are printed only as `{escapeChars(JSON.stringify(s))}` (`src/export/print.ts:24`). Element and prop names come from the frozen shared tables and are checked against `^[A-Za-z][A-Za-z0-9-]*$`. Numbers must be finite. The component name must match `^[A-Z][A-Za-z0-9]*$` and is read own-key only.
- **Probes on the body:** every string in `tests/fixtures/plain-text.ts` (`UNSAFE_CHARS`, `SMUGGLED_TEXT`, `BENIGN_TEXT`, `HOSTILE_TEXT`) plus 22 of my own was placed in each of the circle's five text fields: 295 exports, 167 accepted, 128 refused by validation. The own probes covered backticks, `${`, `{`/`}`, `&quot;`/`&#123;` entities, literal `"` and `\"` sequences, `</title></svg><img onerror>`, U+2028/U+2029, lone surrogates, bidi controls, `*/`, `**/**/`, `<!--`, C0/C1 controls and `/*#__PURE__*/`.
- **Probe results:** each accepted export was compiled two ways, esbuild `transform` (automatic runtime, CJS) and TypeScript `transpileModule` (`react-jsx`), then loaded with only `react/jsx-runtime` resolvable and rendered with `renderToStaticMarkup`. Every one compiled, ran nothing (`globalThis.pwned` stayed unset), requested no other module, and rendered markup identical to the package's `Graph`. No raw U+2028/U+2029, bidi control, ZWSP or BOM reached the header or the body.
- **Numbers:** `Infinity`, `-Infinity`, `NaN`, `1e309`, `-0`, `1e-320`, `1e21`, `5e-7` and `Number.MAX_VALUE` as a radius are all refused by validation (`wrong_kind` / `out_of_range`) before the printer.
- **Component names:** names that shadow globals (`Object`, `Symbol`, `Function`, `NaN`, `Infinity`, `React`, `JSX`, `Promise`, `Reflect`, `Error`) compile and render.
- **Prototype pollution:** `Object.prototype.componentName` is ignored (own-key read, tested). A description holding accessors is refused without the getter being read. An array carrying its own `toJSON` is refused (`wrong_kind`).
- **Denial of service:** bounded by the validator's documented limits (`too_large` for lists, text and the whole description). A 100-category bar graph exports in about 5 ms (60 kB). 1,000 categories, a 10,000-character title and 100,000-deep nesting are each refused in under 1 ms.
- **Gap, the header comment (SEC-001):** it prints `JSON.stringify(input, null, 2)` of the caller's original input (`src/export/exportSource.ts:56`). `src/export/print.ts:71` neutralizes `*/` and the policy's unsafe characters but not `@`, so a JSX pragma in any string field becomes a compiler directive for the generated file.
- **Gap, the second read (SEC-002):** that same line reads the input a second time rather than serializing what was validated.

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** A pure library function with no identities, sessions or permissions. The trust boundary is between whoever wrote the description and the project that commits and builds the exported file. Per `.gener8v/technical-design/system-design.md`, the description's source is "curriculum developer, stored data or a model's tool call", so its text is untrusted.

### Data Protection

**Status:** Adequate
**Notes:** No secrets, PII handling or logging. `exportSource` turns every exception into a fixed `internal_error` issue with no message or stack (`src/export/exportSource.ts`, the `catch`), and a test asserts that a throwing option's message does not leak. The header deliberately records the caller's description (CPSE-REQ-023, DEL-003). Callers should know that whatever they put in a description is committed with the file.

### Configuration Security

**Status:** Adequate
**Notes:**
- No hardcoded credentials, keys or URLs. The exported file imports nothing and relies on React's automatic JSX runtime, so the consumer's compiler configuration decides what JSX compiles to. That is exactly the surface SEC-001 lets caller text reach through comment pragmas.
- `src/generated/version.ts` is generated from `package.json`, and CI's freshness check covers it.
- **Dependency audit:** run 2026-11-03T13:54Z.
  - `pnpm audit` (pnpm 10.28.2): 1 moderate, `minimatch <11.0.1` via `eslint` (GHSA-g3hv-75wg-m249), a dev-only path. This is the accepted risk graph-library CPSE TICKET-004 SEC-002, so it is not re-raised.
  - `pnpm audit --prod`: "No known vulnerabilities found".
- **Compliance (prd/CC-001):** met. A pictograph export's header names the embedded image and its author (`- apple, by gener8v, under the MIT license`) and contains the full `LICENSE` text, byte-identical, including the copyright line. That satisfies MIT's "this permission notice shall be included in all copies" and closes the carried hazard DGP TICKET-004 SEC-004.
- **Constraint prd/TC-009:** met. The drawing is inlined, and the file references no package or URL.

## Findings

### SEC-001: Caller text in the header comment is read as a JSX pragma, so the exported file imports attacker-chosen code

**Severity:** Critical
**Category:** Injection
**OWASP Reference:** A05:2025 Injection (also A08:2025 Software or Data Integrity Failures)
**Location:**
- `src/export/exportSource.ts:56` (`headerFor`, `JSON.stringify(input, null, 2)`)
- `src/export/print.ts:70-72` (`comment`)

**Description:** The carried hazard (GSV TICKET-001 SEC-001) says caller text must never become code in the exported file. The header escapes `*/` and the policy's unsafe characters, but it prints caller strings otherwise verbatim inside the leading block comment. Several compilers treat certain comment contents as directives:

- **TypeScript:** its pragma scanner matches `@(\S+)(\s+…)?$` anywhere in a multi-line leading comment and takes the first whitespace-separated word as the argument.
- **esbuild:** scans every comment for `@jsx`, `@jsxFrag`, `@jsxRuntime` and `@jsxImportSource`, taking the next non-whitespace token. esbuild is the transform behind Vite, Vitest and tsx.

So a description string `"@jsxImportSource evil-pkg x"` puts the line ` *   "title": "@jsxImportSource evil-pkg x",` in the header. Both compilers take `evil-pkg` as the JSX import source, and the compiled file imports `evil-pkg/jsx-runtime` instead of `react/jsx-runtime`.

**Reproduced at `e0c30ac`:**

1. `exportSource({ ...circle, title: "@jsxImportSource evil-pkg x" })` returns `ok: true`. esbuild 0.28.2 compiles the file to `import { jsx, jsxs } from "evil-pkg/jsx-runtime";`. TypeScript 6.0.3 compiles it to `import { jsx as _jsx, jsxs as _jsxs } from "evil-pkg/jsx-runtime";`.
2. No package is needed. A 120-character title produces an import of a data URL with the attacker's code, and it runs:
   - title: `@jsxImportSource data:text/javascript,console.log(%22PWNED%20at%20import%22);export%20const%20jsx=()=>null,jsxs=jsx;// x`
   - TypeScript output run by Node prints `PWNED at import`.
   - An esbuild `bundle` of an entry that imports the exported `.tsx` inlines the payload, and running it prints `PWNED at import` before `component loaded: function`.
3. `@jsxRuntime classic x` in one field plus `@jsx globalThis.alert x` in another makes both compilers emit `globalThis.alert("svg", …)` for every element. Caller text picks the function the component calls.

**Why the tests miss it:** the delivered tests and `tests/fixtures/plain-text.ts` hold no pragma-shaped string. The guard in `tests/helpers/exported.ts:21` refuses any module but `react/jsx-runtime`, so it would catch this once such a string is in the fixtures.

**Babel and SWC (not verified here, neither is installed):** both anchor pragmas to the start of a comment line. The header's ` *   "…` prefix should not match them, but that is a property of those tools, not of the exporter.

**Attack Scenario:**

1. **Attacker and access:** the attacker can influence one string in a graph description. They can prompt-inject the model that calls `generate_graph`, since the design names "a model's tool call" as a description source. Or they can contribute a description to a shared bank of curriculum graphs, or edit stored description data.
2. **Payload:** they set a title, axis label or category name to `@jsxImportSource data:text/javascript,<percent-encoded payload>;// x`, or name a typosquatted npm package.
3. **Export:** a developer exports the description with `exportSource`, or later the `graph-generator export` CLI (AD-013), and commits the `.tsx` file into a project that does not depend on this package. That is the feature's stated purpose.
4. **Concealment:** the payload is ASCII inside a long JSON comment, below text that says "To change the graph, export the description again". Code review of a generated file rarely reads it, and the drawn graph only shows an odd title.
5. **Execution:** the consumer's toolchain compiles the file. On every `tsc` build, Vite dev server or build, Vitest run or `tsx` script, the injected module is imported and runs at load time:
   - on developer and CI machines, with their credentials and tokens;
   - in production bundles, in every end user's browser that renders the page.

**Impact:** Arbitrary code execution in the consuming project's build, test and runtime environments, a supply-chain compromise carried by a data file. In the browser this is equivalent to stored XSS on every page that renders the graph, in an audience of K-12 schools. A weaker variant (`@jsxRuntime classic` + `@jsx <global>`) makes the component call an attacker-chosen global function on render. This defeats the purpose of the carried hazard, which is that caller text must never become code.

**Recommendation:** Neutralize `@` in everything the header prints, so no compiler can find a pragma there.

- In `comment()` (`src/export/print.ts:71`), after `escapeChars`, also replace `@` with `@`:

  ```ts
  ` * ${escapeChars(line).replace(/\*\//g, "*\\/").replace(/@/g, "\\u0040")}`
  ```

  In JSON output `@` can occur only inside strings, where `@` is a valid escape. The description therefore still reads back as the same JSON. I checked this on the reproduction: with `@` escaped, esbuild and TypeScript both import `react/jsx-runtime`, and `JSON.parse` of the header returns the original title.
- The package's own header lines contain no `@`. The exception is the header's `@gener8v/graph-generator` package name: escape it too, or print the name without `@`.
- Alternatively, as the hazard allowed, hold the description in a string constant rather than in the comment.
- Add `"@jsxImportSource evil x"`, `"@jsxRuntime classic x"`, `"@jsx globalThis.alert x"` and `"@jsxFrag x y"` to `HOSTILE_TEXT` in `tests/fixtures/plain-text.ts`.
- Compile each fixture export with TypeScript (`transpileModule`, `react-jsx`) as well as esbuild. The TypeScript output is the case that reached Node directly. Then assert, with the existing `loadExport` guard, that only `react/jsx-runtime` is requested.
- Assert that the header contains no raw `@` outside the escape.

**Compliance Impact:** None (no CC-XXX constraint covers code injection; it breaks the carried hazard graph-library/graph-specification-and-vocabulary-ticket-001-security-review/SEC-001)
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-11-04). `ascii()` in `src/export/print.ts` writes every UTF-16 unit outside printable ASCII, and every `@`, as `\uXXXX`, in the header and in every string literal, so no caller text can form a pragma or other comment- or text-borne directive anywhere in the file. Tests: JSX pragmas added to `HOSTILE_TEXT`, an export-only directive list (`@ts-nocheck`, `/// <reference`, `#!`, `sourceMappingURL`, `@__PURE__`, `@license`, `@jest-environment`, `@flow`), each export compiled with esbuild and TypeScript `transpileModule`, loaded allowing only `react/jsx-runtime`, globals unchanged, markup equal to `Graph`; no raw `@` in any export. Mutant (raw `@`): the export imports `data:text/javascript,…` and the tests fail.

---

### SEC-002: The header serializes the caller's input by a second read, not the description that was validated and drawn

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** A08:2025 Software or Data Integrity Failures
**Location:** `src/export/exportSource.ts:56` (`headerFor`)
**Description:** DEL-003 has the header print `JSON.stringify(input, null, 2)` of the caller's original object, after `createGraph` has validated it. The validator reads own data descriptors and refuses accessors without calling them. `JSON.stringify` reads through `[[Get]]`, so a `Proxy` whose `get` trap returns different values gets two different reads.

Reproduced: a `Proxy` over the circle example whose `get` trap returns `"Drawn title"` for `title` is accepted. The drawing uses the target's `"Find the circumference"`, but the header says `"Drawn title"`. With a trap returning a 5,000-character string, the header carries text that never passed `maxLength`.

Escaping still applies to whatever the second read returns, so the header cannot be closed or reach code, except through SEC-001's pragma. Only a JavaScript caller can supply a Proxy; JSON input from a model or a file cannot.

**Attack Scenario:** N/A (Informational)
**Impact:** The header's claim to record "the description" can be false for a crafted in-process input, and its size is not bounded by the validator's limits. Re-exporting the header's JSON would then draw a different graph.
**Recommendation:** Serialize the same plain snapshot the validator read: a structured, own-data-property copy of the input. Do not re-read the caller's object. Or document that the header records the input as `JSON.stringify` reads it.
**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed. `exportSource` validates the input as given, then serializes it once (`JSON.stringify` guarded: a throw or `undefined` → `internal_error`), checks, lays out and prints the parsed copy, so header, validation and drawing come from one read. Tests: a Proxy whose title changes per read draws the title its header records; one that grows past the limit after validation is refused at `/title`; a throwing `toJSON` gives `internal_error` without its message. Mutant (second read) → both Proxy tests fail.

---

### SEC-003: Some invisible code points reach the exported file unescaped

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** N/A
**Location:**
- `src/export/print.ts:24-25` (`literal`)
- `src/export/print.ts:71` (`comment`)
- `src/core/issues.ts:204` (`escapedInMessages`)

**Description:** The printer reuses the plain-text policy's escape set. It escapes C0/C1 controls, line and paragraph separators, bidi controls, ZWSP, BOM, ZWNJ and ZWJ, and the validator refuses U+180E and U+2060. Several code points that draw nothing, and that the policy accepts in drawn text, still reach the `.tsx` file raw, in both the string literals and the header comment:

- U+034F combining grapheme joiner
- U+115F and U+3164 Hangul fillers
- U+2800 braille blank
- U+FE0F variation selector
- U+FFF0 (unassigned)
- U+1D173 musical symbol begin beam (Cf)
- U+E0080 (unassigned tag-block code point)

They sit only inside JavaScript string literals and a comment, so they cannot change what the code does: no Trojan-Source reordering, since every bidi control is escaped. They can hide content from someone reviewing the committed file. The ticket's hazard asked for "the invisible characters" to be written as `\u` escapes.

**Attack Scenario:** N/A (Informational)
**Impact:** A reviewer of the generated file can miss characters that are there. The rendered markup is the same either way.
**Recommendation:** In the exporter only, also escape default-ignorable, unassigned (Cn) and format (Cf) code points, and the blank-looking fillers the `VISIBLE` test in `src/layout/scene.ts` already lists. A `\u` escape in a JS string yields the same string, so markup equality (CPSE-NFR-001) is unaffected. Add these code points to the plain-text fixture's export assertions.
**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed by the same `ascii()`: every export is pure ASCII (surrogate pairs as two escapes); markup equality holds over all 15 examples; a test asserts every export is ASCII with no `@`. Mutant (non-ASCII left raw) → four tests fail.

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Fixed | header and literals ASCII-only with `@` escaped; esbuild + tsc load tests | No | `src/export/print.ts`, `src/export/exportSource.ts`, `tests/export/exportSource.test.ts`, `tests/export/equality.test.ts`, `tests/helpers/exported.ts`, `tests/fixtures/plain-text.ts` |
| SEC-002 | Fixed | serialize once, draw and print the parsed copy | No | `src/export/exportSource.ts`, `tests/export/exportSource.test.ts` |
| SEC-003 | Fixed | every export ASCII-only | No | `src/export/print.ts`, `tests/export/equality.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:** All three findings fixed in resolution (Engineer — Thomas Eaves, 2026-11-04) and re-verified with mutants; the full verification loop passed. The fix also escapes directives outside comments (Vitest reads `@jest-environment` from raw text), and the refusal table added for QR-001 found and fixed a printer defect (a tag-less kind printed `<undefined />`). The `minimatch` advisory in `pnpm audit` remains the accepted risk of CPSE TICKET-004 SEC-002.
