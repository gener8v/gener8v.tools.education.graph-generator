# TICKET-002: Build the Scene model and the shared rendering core — Security Review

## Summary

This review covers the Scene model, layout kit and `SceneSvg` printer delivered for `graph-library/component-packaging-and-source-export/TICKET-002` (branch `ticket/cpse-002`, commit `2bed490`). The `security-reviewer` agent ran the findings phase in a fresh context. Every probe ran on a scratch copy of the commit (`git archive 2bed490`, then `pnpm install --frozen-lockfile --offline`), and no file in the shared tree was changed.

The output path is sound:
- Every Scene string reaches React only as a text child or an attribute value. The carried `graph-library/graph-specification-and-vocabulary-ticket-001-security-review/SEC-001` assertion holds for all 23 fixture strings.
- There are no ids, hooks or `dangerouslySetInnerHTML`.
- The new code uses no network API and no browser API.
- `wrap` and `textWidth` run in linear time.
- The new jsdom dev dependencies are pinned by integrity hash, run no install scripts and have no known advisories.

The gaps are at the edges of the contracts this ticket sets for later tickets:
- **SEC-001:** the caller's text alternative defeats the blank check with invisible characters and skips the plain-text policy, and a non-string value throws.
- **SEC-002:** the closed attribute set constrains names but not values, so `url(…)` passes the type and every check.
- **SEC-003:** `fmt()` throws on values that valid but extreme axis ranges produce. The catch that keeps CPSE-REQ-018 is recorded only in the delivery record, not on TICKET-003.
- **SEC-004:** `placeLabel` is quadratic in the number of labels, used the way AD-010 describes. Today only the validator's value cap bounds it.

Four findings: 0 Critical, 0 High, 0 Medium, 3 Low, 1 Informational.

**Files Reviewed:**
- `src/layout/scene.ts`
- `src/layout/kit/format.ts`
- `src/layout/kit/scale.ts`
- `src/layout/kit/text.ts`
- `src/layout/kit/labels.ts`
- `src/react/SceneSvg.tsx`
- `tests/layout/kit/format.test.ts`
- `tests/layout/kit/scale.test.ts`
- `tests/layout/kit/text.test.ts`
- `tests/layout/kit/labels.test.ts`
- `tests/react/SceneSvg.test.tsx`
- `package.json`
- `pnpm-lock.yaml`

Context read:
- the ticket, and its delivery record (DEL-001 to DEL-007, Notes);
- `.gener8v/constraints/prd.md`;
- `.gener8v/technical-design/system-design.md`: AD-002, AD-007, AD-008, AD-010, AD-011, AD-013 and AD-014; the Layout kit and React renderer components; the Scene data model; the Component props contract;
- `.gener8v/context.md`;
- the CPSE specification (CPSE-REQ-011..018), plus NLC-REQ-013 and NLC-NFR-003;
- the downstream tickets CPSE TICKET-003 and TICKET-005, NLC TICKET-001, and DGP TICKET-004;
- the code this ticket builds on: `src/core/format.ts`, `src/core/style.ts`, `src/core/validate/structure.ts`, `eslint.config.js`, `scripts/check-dist.ts` and `tests/fixtures/plain-text.ts`;
- the earlier security reviews in this change, for calibration.

**Findings:** 4
**Critical:** 0 | **High:** 0 | **Medium:** 0 | **Low:** 3 | **Informational:** 1

## Security Assessment

### Input Validation

**Status:** Gaps Found
**Notes:** The ticket has no public entry point yet: `SceneSvg` is internal, and none of the new modules is in a built entry. It sets up two inputs that later tickets will expose:
- **`SceneSvg({ scene, textAlternative })`:** TICKET-003 wires it to `Graph` and the per-type components. Their `textAlternative` prop comes from the consumer and is passed through unchanged (DEL-007).
- **The kit functions:** layouts call `fmt`, `fmtPoints`, `linearScale`, `textWidth`, `wrap` and `placeLabel` with values taken from validated descriptions.

How I probed:
- `tsx` scripts in the scratch copy rendered through React's `renderToStaticMarkup` and `renderToString`.
- `tsc --strict` checked typed Scene fixtures.
- Timings ran on Node.js v24.1.0.

**What is handled well:**
- **Output encoding:**
  - `toElement` (`src/react/SceneSvg.tsx:11-17`) builds props only through `REACT_PROP` and passes `node.text` as a single text child.
  - The root's four attributes are fixed, and no caller prop is spread onto the `<svg>`. So a consumer cannot inject `on*` handlers or `dangerouslySetInnerHTML`.
  - I re-ran the `plain text renders literally` suite, which passed all 23 cases. Separate probes confirmed that `<`, `"`, `&`, `{…}` and `</text><script>` print escaped in `aria-label`, `<title>` and `text` nodes.
- **Carried SEC-001:** the `SceneSvg` half is met. The exporter half stays a Known Hazard on CPSE TICKET-005, and that file carries it.
- **Closed attribute names:**
  - `id`, `href`, `class`, `style`, `clip-path`, `marker-*` and event handlers are absent from `REACT_PROP`. The `@ts-expect-error` at `tests/layout/kit/format.test.ts:51-52` keeps `id` out at compile time.
  - Untyped runtime keys fail safe:
    - `onload` and `href` printed as a harmless `undefined="…"`.
    - React rejected `constructor` and `__proto__` as invalid attribute names.
    - Unknown node kinds throw inside React.
  - Both tables keep `Object.prototype`, so `REACT_PROP["toString"]` is a function. This is harmless while Scenes are typed, in-repository data. TICKET-005's printer emits these names as code tokens, so it should look them up with `Object.hasOwn`. I did not raise this as a finding.
- **`wrap` and `textWidth` are linear.** On 10,000,000 code units:
  - `textWidth` took 58–518 ms.
  - `wrap` took 4–645 ms. The inputs were short words, one unbroken word (the split path), alternating `a `, astral emoji, combining marks only, and whitespace only.
  - Degenerate arguments stay linear: `maxWidth` −1 or `NaN`, and `fontSize` `NaN`, `Infinity` or 0. The largest output was 8,000,000 one-code-point lines, which is proportional to the input.

  So the GSV TICKET-001 security review's note, which placed the bounding of long-text work on `wrap` and `placeLabel`, is met for `wrap`.
- **`fmt`:** rejects non-finite input. Every coordinate in `fmtPoints` goes through it, so a `points` value is digits, `.`, `-`, `,` and spaces only.

**Gaps:**
- **SEC-001:** the caller's text alternative is not checked. Invisible-only text replaces the generated name, unsafe characters reach the page, and a non-string value throws.
- **SEC-002:** attribute values are any string, so `fill="url(…)"` passes the type, the tests and `check:dist`.
- **SEC-003:** `linearScale` turns valid but extreme ranges into `NaN` or `Infinity`, and `fmt` then throws. Above about 1.8e306, `fmt` returns `Infinity` instead of throwing.
- **SEC-004:** `placeLabel` is quadratic over a layout. Only the validator's 10,000-value cap bounds it.

**Not applicable:** SQL, NoSQL, command, template and path injection. The delivered source has no query, shell, template engine or file path. The one file read in the tests uses a constant URL (`tests/react/SceneSvg.test.tsx:99`).

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** This is library rendering code. It has no server, accounts, sessions or permissions, and `.gener8v/context.md` states there are no user accounts.

### Data Protection

**Status:** Adequate
**Notes:**
- **Sensitive data:** the delivered code holds no PII and no credentials. It logs, stores and transmits nothing. The text alternative is written into the page by design.
- **Secret scan:** I scanned the `src/` and `tests/` diff of commit `2bed490` for API keys, tokens, passwords, private keys, and AWS, GitHub and npm token shapes. Nothing matched.
- **Network and URL scan:** I searched `src/layout` and `src/react` for `http(s):`, `url(`, network APIs, `eval`, `Function(`, storage, `document.`, `window.`, `innerHTML` and `console.`. The only matches are the two comments naming the `url(#…)` ban.

### Configuration Security

**Status:** Adequate
**Notes:**
- **Secrets and defaults:** no hardcoded secrets, debug flags or permissive defaults. `eslint.config.js`, `tsup.config.ts` and CI are unchanged.
- **Dependencies added:** `jsdom` ^30.1.2 and `@types/jsdom` ^30.0.0, both dev-only. They add 35 lockfile packages, counting jsdom's transitive dependencies, `@types/tough-cookie` and a re-keyed `vitest` snapshot.
  - Every package resolves from the default registry with a `sha512` integrity hash. There are no git, tarball or `file:` sources.
  - None declares a lifecycle script, and `node_modules/.modules.yaml` records `ignoredBuilds: []`.
  - jsdom's optional `canvas` peer, which is native, is not installed.
- **Tests use jsdom safely:** it runs with default options, so no scripts run and no subresources load. The test removes the globals it installs in a `finally` block.
- **Backstop for a jsdom import from `src/`:**
  - jsdom is a direct devDependency, so it resolves from `src/`. `undici` comes only transitively and does not resolve under pnpm's layout.
  - In a second scratch copy, an `import { JSDOM } from "jsdom"` in `src/index.ts` passed `eslint` (exit 0). tsup then inlined 10.6 MB of jsdom into `dist/index.js`.
  - `check:dist` failed on that build (exit 1), listing `EventSource, WebSocket, XMLHttpRequest, fetch, http, http2, https, net, node:net, tls`.

  So the backstop from CPSE TICKET-001's security review SEC-001 covers the new dev dependency. Adding `jsdom` to the boundary block's restricted imports would catch it earlier; I did not raise this as a finding.
- **Cryptography:** not applicable; the code uses none.
- **Logging and monitoring:** not applicable. The code logs nothing, and a pure rendering library has no security events to record.

**Dependency audit:** `pnpm audit` (pnpm 10.28.2, Node.js v24.1.0), run 2026-10-07 13:35 UTC on the scratch copy of `2bed490`.
- `pnpm audit`: `No known vulnerabilities found`, exit 0.
- `pnpm audit --prod`: `No known vulnerabilities found`, exit 0. The package still has no runtime dependencies, and `react` is a peer.
- Observation for Quality Review, not a vulnerability: jsdom 30.1.2 declares `engines.node: ^22.22.2 || ^24.15.0 || >=26.0.0`. The Verification Run used Node.js v24.1.0, which is outside that range, and pnpm does not enforce `engines` by default.

**Spot check of the builder's claims (scratch copy):**
- `pnpm lint` and `pnpm typecheck` exited 0.
- `pnpm exec vitest run tests/layout tests/react` reported 5 files and 66 tests passed.
- `pnpm check:dist` reported "Built files scanned: 4, no network APIs or network modules".
- No built entry contains `SceneSvg`, `wrap` or `placeLabel` yet.
- In the shared tree, `git status` before and after the review shows only the hook-written `.gener8v/runs.jsonl`.

**Compliance cross-reference:** checked against `.gener8v/constraints/prd.md`. No per-area constraints file exists for Component Packaging & Source Export. The ticket lists prd/TC-001, TC-002, TC-003, TC-011 and CC-002.

| Constraint | Result |
|---|---|
| prd/CC-001 (license) | Met: <ul><li>no runtime dependency or asset added</li><li>jsdom (MIT) and `@types/jsdom` are dev-only and not in `dist/`</li><li>`DEFAULT_FONT_STACK` re-exports the system stack from `defaultStyle.fontFamily`, with no bundled font (AD-010)</li></ul> |
| prd/CC-002 (WCAG 2.1 AA, non-text content) | Met for the package's own output: `role="img"`, `aria-label` and a first-child `<title>` carry the generated text alternative (1.1.1). Contrast and non-color cues (1.4.11, 1.4.1) belong to the layouts, so they are not applicable here. Weakened by SEC-001; not violated, because the gap needs the consumer's own input (see SEC-001's Compliance Impact) |
| prd/CC-003 (no data collection) | Met: no network, storage or telemetry API in `src/layout` or `src/react`; `check:dist` clean. Weakened by SEC-002, because attribute values are unconstrained. A jsdom import from `src/` is caught by `check:dist`, not by lint |
| prd/CC-004 (trademarks) | Not applicable: no images yet |
| prd/TC-001 (no measuring) | Met: widths come from a table, and the server and jsdom renders are equal |
| prd/TC-002 (rounding) | Met for drawing-space values. Above about 1.8e306, `fmt` returns `Infinity` (SEC-003) |
| prd/TC-003 (ids) | Met by having no ids (AD-008). The attribute-value gap is SEC-002 |
| prd/TC-011 (wrapping) | Met: `wrap` breaks lines, splits over-long words and is linear |

No CC-XXX violation was found, so no finding is raised to Critical.

## Findings

### SEC-001: A caller-supplied text alternative is used unchecked: invisible-only text replaces the generated name, unsafe characters reach `aria-label` and `<title>`, and a non-string value throws

**Severity:** Low
**Category:** Input Validation
**OWASP Reference:** A06:2025 Insecure Design. Also A10:2025 Mishandling of Exceptional Conditions (the throw), CWE-116 (improper encoding or escaping of output) and OWASP LLM01:2025 Prompt Injection (hidden text in the accessible name).
**Location:**
- `src/react/SceneSvg.tsx:31-32`: the blank check is `textAlternative !== undefined && textAlternative.trim() !== ""`, after which the value is used as given.
- `src/react/SceneSvg.tsx:4-8`: `textAlternative?: string` is a type-only guard.
- `tests/react/SceneSvg.test.tsx:122-129`: the only blank cases are `""` and `"   "`.
- `.gener8v/changes/graph-library/delivery/component-packaging-and-source-export-ticket-002-delivery.md:178-183` (DEL-007): "A supplied value is rendered as given (not cleaned)"; "Never ships an unnamed graph"; TICKET-003 passes the prop through unchanged.

**Description:**
Under DEL-007, the caller's text alternative replaces the generated one whenever `trim()` leaves anything. I ran three probes through `renderToStaticMarkup`.

1. **Text that is blank to a reader but not to `trim()`.** 12 of 15 strings replaced the generated name:
   - U+200B (zero-width space)
   - U+200C and U+200D (zero-width non-joiner and joiner)
   - U+FE0F (emoji variation selector)
   - U+0301 (a combining mark on its own)
   - U+2066 followed by U+2069 (a direction isolate pair)
   - U+00AD (soft hyphen)
   - U+2060 (word joiner)
   - U+180E (Mongolian vowel separator)
   - U+E0041 (a tag character)
   - U+2800 (braille blank)
   - U+3164 (Hangul filler)

   Only U+3000, U+00A0 and U+FEFF fell back, because `trim()` removes them. Each of the other twelve leaves the graph with an accessible name a screen reader cannot announce, so DEL-007's "never ships an unnamed graph" does not hold.
2. **Unsafe characters pass through as given.** The Product Owner's plain-text policy (GSV TICKET-001 security review SEC-002, 2026-10-06) excludes several kinds of character:
   - control characters and line separators;
   - direction overrides and isolates;
   - invisible format characters and tag characters.

   The validator rejects them in descriptions, and `describe` cleans them out of generated text alternatives. The prop path skips both, so these reached `aria-label` and `<title>` unchanged:
   - the newline-structured "Tool note: …" string;
   - `abc` + U+202E (right-to-left override) + `def`;
   - ESC `]0;pwned` BEL;
   - `SMUGGLED_TEXT`, which carries "Ignore prior instructions" in tag characters.
3. **Non-strings throw.** `null`, `42`, `{}`, `["a"]` and `false` each threw a `TypeError` during render: "Cannot read properties of null (reading 'trim')" or "textAlternative.trim is not a function".
   - The TypeScript type stops only typed callers. It does not stop JavaScript consumers, or props read from JSON or a database, where an unset column is `null`.
   - The Component props contract (system-design Interface Contracts) and AD-014 say components never throw.

React's escaping means none of this is markup injection.

**Attack Scenario:**
- **Attacker:** controls the text-alternative field that a platform passes to `<Graph textAlternative>`, which TICKET-003 passes through unchanged. Examples:
  - a content author on a multi-author curriculum platform;
  - a model steered by indirect prompt injection.
- **Steps:** any of three:
  1. The attacker sets the field to U+2800 or U+200B. The platform sees a non-empty value, and the component uses it in place of the generated description.
  2. The attacker sets it to visible text followed by tag characters or a direction override. Sighted reviewers see "Fractions". Screen readers, browser-based agents that read the accessibility tree, and the `<title>` tooltip receive the hidden or reordered text.
  3. Through an API that stores JSON, the attacker sets it to `null`. Every server render of that page then throws.
- **Result:**
  - Blind students get an unnamed figure in material that must meet WCAG 2.1 AA.
  - Hidden instructions travel in the accessible name.
  - The stored value takes the page down for every visitor until someone fixes it.
- **Limit:** the attacker must already control text that the consumer chose to pass in. Nothing is disclosed, and no script runs.

**Impact:**
- Assistive-technology users lose the text alternative (prd/CC-002 1.1.1; NLC-NFR-003, "a non-empty text alternative").
- The accessible name becomes a carrier for hidden prompt-injection text.
- A `null` value is a page-level denial of service.

**Recommendation:**
1. **Check the value in `SceneSvg`.** Accept only a string, clean it with `cleanText` (`src/core/format.ts`), and treat it as absent unless something visible remains:
   ```ts
   const BLANK_LOOKING = /[\p{M}‌‍⠀ㅤᅟᅠﾠ]/gu;
   const supplied = typeof textAlternative === "string" ? cleanText(textAlternative) : "";
   const name = supplied.replace(BLANK_LOOKING, "").trim() !== "" ? supplied : scene.textAlternative;
   ```
   In the scratch copy, this predicate:
   - judged all 18 blank-looking probes blank;
   - kept every `BENIGN_TEXT` and `HOSTILE_TEXT` string;
   - cleaned `SMUGGLED_TEXT` to "Fractions".

   Cleaning, rather than only rejecting, reverses DEL-007's "not cleaned", so the Engineer or Product Owner should decide it. The fixture test on the Scene's own text alternative is unaffected.
2. **Apply the same blank rule to `scene.textAlternative`,** or assert it in the layout contract, so that neither source can produce an empty name.
3. **Add tests:**
   - the 15 blank-looking strings fall back;
   - the hostile fixture strings come out cleaned when supplied as the prop;
   - `null`, numbers and objects render the generated name without throwing.
4. **If deferred,** record it as a Known Hazard on graph-library/component-packaging-and-source-export/TICKET-003. Its `Graph` and factory accept the prop, and its never-throw property test should include non-string `textAlternative` values.

**Compliance Impact:** prd/CC-002 is weakened: a caller's own input can defeat the control meant to keep every graph named (DEL-007). It is not violated: the package's own output always carries the generated, cleaned text alternative, and a text alternative the consumer supplies is the consumer's responsibility, as with `alt` on an `<img>`. NLC-NFR-003 is also affected.
**Status:** Resolved
**Resolution:** `textAlternativeFor` (`src/layout/scene.ts`) passes a string through `cleanText` and uses it only when a visible character (not a mark, format, separator, braille blank or Hangul filler) is left; any non-string falls back to the generated name. Tests cover the 15 probe classes (newline, RLO, ESC, tag smuggling, invisible-only, `null`, numbers, objects).

---

### SEC-002: The closed attribute set constrains names, not values, so `url(…)` paint references pass the type and every check

**Severity:** Low
**Category:** Input Validation
**OWASP Reference:** A06:2025 Insecure Design. Also CWE-20 (improper input validation).
**Location:**
- `src/layout/scene.ts:95`: `AttrValue = string | Rounded` allows any string for any attribute.
- `src/layout/scene.ts:71` and `:74`: `fill` and `stroke` are presentation attributes, and their CSS values accept `url(…)` paint-server references.
- `src/react/SceneSvg.tsx:13`: values are passed to React unchanged.
- `tests/react/SceneSvg.test.tsx:94-96`: the `url(#` scan runs only over the markup of the one sample Scene. Lines `:98-104` scan the source of `SceneSvg.tsx`.
- `scripts/check-dist.ts:6-22`: scans built code for network API names and module specifiers. It does not look at string data such as `"url(https://…)"`.

**Description:**
DEL-001 calls the attribute set "closed" and says it enforces AD-008 at compile time, and the ticket's criterion says `SceneSvg` uses no `url(#…)`. The names are closed, but the values are not.
- **What the type accepts:** `tsc --strict` accepted Scenes with:
  - `["fill", "url(#shared-gradient)"]`
  - `["fill", "url(https://tracker.example/p.svg#paint)"]`
  - `["stroke", "url(//tracker.example/s.svg#a) #000"]`
- **What prints:** `SceneSvg` printed all three verbatim.
- **What would notice:** nothing. Lint, the tests and `check:dist` would all pass such a value, whether it appeared in a layout or in an AD-012 image drawing (`src/images/<name>.ts`, which holds Scene nodes).

Two consequences:
- **`url(#id)`:** a Scene has no ids of its own, so the reference can only bind to an element elsewhere on the consumer's page. That is the cross-instance id problem that prd/TC-003 and AD-008 exist to remove.
- **`url(https://…)` and `url(//…)`:** an external resource reference in rendered output, which prd/CC-003's rationale rules out. Whether a browser requests it depends on the engine: Gecko loads external SVG resource documents, same-origin only, while Chromium resolves only same-document references. So the present exposure is small. The issue is that the control is a convention rather than a check.

Today colors reach Scenes only through `resolveColor`, which returns a canonical `#rrggbb`, and through `defaultStyle`. So no description text can produce either value yet.

Presentation-attribute values are parsed as CSS, where escapes apply: `\75 rl(` reads as `url(`. A substring denylist for `url(` would therefore be weaker than an allowlist.

**Attack Scenario:**
- **Attacker:** an outside contributor.
- **Steps:**
  1. The contributor opens a pictograph-image PR (graph-library/data-graphs-and-pictographs/TICKET-004) or a layout PR that uses `fill="url(https://cdn.example/apple.svg#g)"`, presented as giving a gradient look.
  2. Typecheck, lint, tests and `check:dist` are all green.
  3. A maintainer who relies on the checks (prd/OC-001) merges it.
- **Result:** every graph that uses the image references the contributor's host, or an id on the consumer's page.

**Impact:** Rendered graphs could reference page-level ids or external resources, against AD-008, prd/TC-003 and prd/CC-003, and no check would fail.

**Recommendation:**
1. **Constrain values per attribute.** Either approach works:
   - **Brand string values** the way `Rounded` brands numbers: a `Color` brand that only `resolveColor` and `defaultStyle` produce, for `fill` and `stroke`; a `Points` brand returned by `fmtPoints`; a small `pathData()` builder for `d`.
   - **Keep plain strings,** and add one table of allowlist patterns, for example:
     - `fill`, `stroke`: `^(#[0-9a-f]{6}|none)$`
     - `points`: numbers, commas and single spaces
     - `d`: `^[MLHVCSQTAZmlhvcsqtaz0-9 .,-]*$`
     - `transform`: `translate`, `rotate` or `scale` with numeric arguments only
     - `stroke-dasharray`: `none` or numbers
     - `font-family`: letters, digits, spaces, commas, hyphens and quotes, with no `(`, `\` or `;`
     - keyword attributes (`text-anchor`, `dominant-baseline`, `font-weight`, `font-style`, `stroke-linecap`, `stroke-linejoin`, `fill-rule`, `preserveAspectRatio`, `aria-hidden`): their keyword lists
2. **Enforce the table** in a test that walks the Scene of every registered example and every image drawing. As a cheap extra, add it as a development assertion in `SceneSvg` and in TICKET-005's printer.
3. **If deferred,** add a Known Hazard to the layout tickets and to graph-library/data-graphs-and-pictographs/TICKET-004: no `url(` in any attribute value, and colors only from `resolveColor` or `defaultStyle`.

**Compliance Impact:** prd/CC-003, and prd/TC-003 through AD-008, are weakened: their control has a gap. Neither is violated, because no Scene that produces such a value exists.
**Status:** Resolved
**Resolution:** `checkScene` reports `url(` in every attribute value; every layout test runs it (Known Hazard on GSS TICKET-002). Values remain `string` at the type level, so the guarantee holds through layout tests, not types.

---

### SEC-003: `fmt()` throws on values that valid but extreme axis ranges produce, and the catch that keeps components from throwing is not recorded on TICKET-003

**Severity:** Low
**Category:** Input Validation
**OWASP Reference:** A10:2025 Mishandling of Exceptional Conditions
**Location:**
- `src/layout/kit/format.ts:10-14`: `fmt` throws `RangeError` on non-finite input (DEL-003), but it checks only the input, and `n * 100` can overflow.
- `src/layout/kit/scale.ts:14-19`: only an exactly zero-width domain is special-cased.
  - `(r1 - r0) / (d1 - d0)` overflows to `Infinity` when the width is subnormal.
  - `d1 - d0` itself overflows when the domain is very wide.
- `.gener8v/changes/graph-library/delivery/component-packaging-and-source-export-ticket-002-delivery.md:150-155` (DEL-003) and `:207` (Notes): "TICKET-003 must catch layout errors".
- `.gener8v/changes/graph-library/tickets/component-packaging-and-source-export/TICKET-003.md:50-58`: the Known Hazards have no entry for layout exceptions.
- `tests/layout/kit/format.test.ts:34-38`: the test is named "throws on non-finite input so NaN and Infinity never reach markup".

**Description:**
Probe results:
- **Valid ranges, non-finite results:**
  - `linearScale([0, 5e-324], [0, 400])(0)` returns `NaN`.
  - `linearScale([0, 1e-310], [0, 400])(1)` returns `Infinity`.
  - `linearScale([-1e308, 1e308], [0, 400])(1e308)` returns `NaN`.

  `fmt` throws `RangeError` on each result.
- **`fmt` fails open the other way:**
  - `fmt(1.8e306)`, `fmt(1e307)` and `fmt(Number.MAX_VALUE)` return `Infinity`, and `fmt(-1e307)` returns `-Infinity`, because the rounded result is never checked.
  - `fmtPoints([[1e307, 0]])` returns `"Infinity,0"`.

  So the test name's guarantee does not hold for finite inputs above about 1.8e306.

The validator requires finite numbers but has no rule on the width of a range. graph-library/number-lines-and-coordinate-graphs/TICKET-001 explicitly accepts narrow ranges ("0 to 0.001"). A description can therefore pass validation and still make a layout throw.

DEL-003 hands the catch to TICKET-003, but only in this delivery record:
- TICKET-003's own Known Hazards, which its implementer reads (CONVENTIONS §2), do not mention it.
- Its never-throw property test runs against an empty registry until the type tickets land, so it would not exercise a layout.

**Attack Scenario:**
- **Attacker:** the author of a stored description that a server-rendering consumer renders.
- **Steps:**
  1. The attacker sets a number line's range to `{ "min": 0, "max": 1e-310 }`. It is finite and `min < max`, so it validates.
  2. The axis layout's `linearScale` returns `Infinity`, and `fmt` throws.
- **Result:** if TICKET-003 does not catch the error, `<Graph>` throws during render. Every request to that page gets a 500, or the client tree unmounts, instead of the fallback that CPSE-REQ-018 requires.
- **Limit:** no sink exists yet. This depends on TICKET-003 missing a catch that DEL-003 asks for.

**Impact:**
- A persistent, author-controlled denial of service for the page that renders the description.
- Silently broken drawings, with `Infinity` in the markup, for values above about 1.8e306.

**Recommendation:**
1. **Record a Known Hazard on graph-library/component-packaging-and-source-export/TICKET-003:**
   - `createGraph` wraps layout calls so that any exception becomes an `internal_error` issue and goes to the fallback. The existing rule still applies: no exception text in messages.
   - The never-throw tests add a fixture layout that throws.
2. **Check the result in `fmt`:** `if (!Number.isFinite(rounded)) throw new RangeError(…)`. Add `1e307` to the non-finite test.
3. **Treat degenerate domains as degenerate in `linearScale`:** any domain whose width or ratio is zero or not finite should be handled like a zero-width domain, or should throw a named error.
4. **Record a Known Hazard on graph-library/number-lines-and-coordinate-graphs/TICKET-001:** the axis domain check rejects ranges whose `max - min` or `400 / (max - min)` is not a finite normal number. graph-library/graph-specification-and-vocabulary-ticket-004-security-review/SEC-001 is a precedent: an underflow reachable from a valid description.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** `linearScale` maps a domain whose ratio overflows to the middle of the range; `fmt` throws on a non-finite or exponent-sized result instead of returning `Infinity`; Known Hazard on CPSE TICKET-003 for catching layout errors.

---

### SEC-004: `placeLabel` is quadratic in the number of labels as AD-010 uses it; the validator's value cap is its only bound

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** N/A. Related to CWE-407 (inefficient algorithmic complexity).
**Location:**
- `src/layout/kit/labels.ts:74-84`: `placeLabel` tests every candidate against every obstacle.
- `src/layout/kit/labels.ts:31-62`: `segmentCrossesBox` allocates a four-entry array on each test.
- AD-010: every placed label and every figure line is an obstacle.
- `src/core/validate/structure.ts:17`: `DESCRIPTION_VALUE_LIMIT = 10_000`.

**Description:**
One call costs candidates × obstacles. A layout that adds each placed label as an obstacle therefore does O(n²) work for n labels.

Timings, with 8 candidates per label and segment obstacles, on Node.js v24.1.0:

| Scenario | Labels | Time |
|---|---|---|
| Realistic: a dense x,y layout of labelled points joined by segments | 100 | 3 ms |
| | 500 | 9 ms |
| | 2,500 | 94 ms |
| Adversarial ordering: every candidate is blocked only by the newest obstacle | 1,000 | 68 ms |
| | 3,000 | 550 ms |
| | 10,000 | 5.9 s |

A labelled point costs at least four values against the validator's 10,000-value cap, so about 2,500 labels is the ceiling today. That means tens to a few hundred milliseconds of synchronous render per description.
- The cost is bounded, but it is the largest per-render cost in the pipeline so far.
- It rises with the number of candidates each layout chooses.
- It rises further for any graph type whose limits allow more labels.

`wrap` and `textWidth` are linear (see Input Validation), so the carried note on long text is met.

**Attack Scenario:** N/A (Informational)
**Impact:** A server-rendering consumer that renders user-supplied descriptions spends up to about half a second of event-loop time on each adversarial render, at today's caps.
**Recommendation:**
1. **Add a Known Hazard** to the layout tickets that place labels:
   - graph-library/number-lines-and-coordinate-graphs/TICKET-001, TICKET-002 and TICKET-004;
   - graph-library/geometric-shapes-and-solids/TICKET-002.

   It should ask each layout to:
   - keep the candidates per label small (at most 8);
   - keep labelled lists within a `maxItems` that bounds n, for example at most 1,000 labels;
   - add a timing test at those limits.
2. **If larger limits are ever wanted,** bucket obstacles in a coarse grid over the 400-unit space, so each query tests only nearby obstacles.

**Compliance Impact:** None
**Status:** Accepted Risk
**Risk accepted by:** Security — Thomas, 2026-10-07
**Resolution:** Quadratic cost accepted: about 94 ms at a realistic 2,500 labels, bounded by the validator's 10,000-value cap. Documented in `placeLabel`'s comment.

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Approved | `textAlternativeFor` (`src/layout/scene.ts`) passes a string through `cleanText` and uses it only when a visible character (not a mark, format, separator, braille blank or Hangul filler) is left; any non-string falls back to the generated name. Tests cover the 15 probe classes (newline, RLO, ESC, tag smuggling, invisible-only, `null`, numbers, objects). | — | `src/layout/scene.ts`, `src/react/SceneSvg.tsx`, `tests/react/SceneSvg.test.tsx` |
| SEC-002 | Approved | `checkScene` reports `url(` in every attribute value; every layout test runs it (Known Hazard on GSS TICKET-002). Values remain `string` at the type level, so the guarantee holds through layout tests, not types. | — | `src/layout/kit/check.ts`, `.gener8v/changes/graph-library/tickets/geometric-shapes-and-solids/TICKET-002.md` |
| SEC-003 | Approved | `linearScale` maps a domain whose ratio overflows to the middle of the range; `fmt` throws on a non-finite or exponent-sized result instead of returning `Infinity`; Known Hazard on CPSE TICKET-003 for catching layout errors. | — | `src/layout/kit/scale.ts`, `src/layout/kit/format.ts`, `.gener8v/changes/graph-library/tickets/component-packaging-and-source-export/TICKET-003.md` |
| SEC-004 | Accepted Risk | Quadratic cost accepted: about 94 ms at a realistic 2,500 labels, bounded by the validator's 10,000-value cap. Documented in `placeLabel`'s comment. | Yes — Thomas, 2026-10-07 | `src/layout/kit/labels.ts` |

## Verdict

**Result:** Approved with Notes
**Unresolved Critical/High:** 0
**Accepted Risks:** 1
**Notes:** Resolved with the user (Thomas) on 2026-10-07. SEC-001..SEC-003 fixed; SEC-004 (`placeLabel` quadratic cost, bounded by the validator's value cap) accepted and documented in code. The catch for layout errors is a Known Hazard on CPSE TICKET-003.
