# TICKET-003: Deliver the ruler: layout, component and entry point — Security Review

## Summary

I reviewed the ruler's layout, component and entry point for `rulers/number-lines-and-coordinate-graphs/TICKET-003` as they stand at HEAD (`7cc2dc9`). That includes the changes the code review (`dcce9d6`) and the quality review (`7cc2dc9`) made; delivery was `5e28148`. Commit `dee1d09` (GSV OQ-009 answered: caller text limited to 200 characters and a unit to 20, as GSV-REQ-052..054) was read as context only, since its implementing ticket is not yet written.

This ticket makes the ruler public:
- it is registered with its definition and layout;
- it is drawn by `createGraph`, `<Graph>` and the new `<RulerGraph>`;
- it is shipped as the `./ruler` entry point;
- it is published in `schema.json`, the tool schema and the vocabulary.

Against hostile input, the new code holds up:
- every valid ruler draws: no `internal_error`, no throw, no `checkScene` problem, at most 339 nodes;
- every caller string reaches the markup only as a React text child or an escaped attribute value;
- the object's color is a strict `#rrggbb`;
- the ruler's own code reads nothing through the prototype chain;
- the built entry loads with no side effect and holds no network or dynamic-code API;
- the dependency audit is clean.

There are 2 findings: 0 Critical, 0 High, 0 Medium, 0 Low, 2 Informational.
- **SEC-001:** the drawing bounds a label's lines, not its clusters. A label that is one cluster (a letter with a run of combining marks, a ZWJ chain) is drawn whole in one text node and gets a one-line box. At 200 characters, inside the coming GSV-REQ-052 limit, its marks render in Chromium as a column over the bar, the object's end marks and a number, the very things the ticket promises the label never hides. At caller size the drawn text is unbounded in characters (500,000 in one node) until GSV-REQ-052 lands.
- **SEC-002:** `renderGraph` reads `textAlternative`, `fallback` and `description` through the prototype chain, and `checkScene` tests `text` and `children` with `in`. With a polluted `Object.prototype`, every ruler, and every other graph, can be renamed, an invalid one's placeholder hidden, or every graph refused as `internal_error`. This code is older than the ticket and needs a separate pollution bug.

**Reviewer:** `security-reviewer` agent, fresh context (findings phase only, 2026-10-21)
**Delivery Record:** `.gener8v/changes/rulers/delivery/number-lines-and-coordinate-graphs-ticket-003-delivery.md`. I read DEL-001..DEL-003, the Deviations and Notes, and the Post-Review Amendments: CR-001..CR-003, the trivial `RULER_MAX_LENGTH` comment fix, and QR-001..QR-005.

**Earlier reviews read first.** Their findings are not raised again:
- this ticket's `…-code-review` and `…-quality-review`, both Approved:
  - CR-001: the `label` term says a long label is cut;
  - CR-002: no ruler code in other bundles, and the kit's limits made functions;
  - CR-003: the 330 px minimum, deferred to NLC TICKET-004 and CPSE TICKET-008;
  - QR-001: the geometry property;
  - QR-003: `locatedValue`;
  - QR-004: the layout's `RangeError` test.
- `rulers/number-lines-and-coordinate-graphs-ticket-001-security-review`:
  - SEC-001: `locate` refuses non-numbers;
  - SEC-002: the kit's limits, carried here as a Known Hazard and checked below;
  - SEC-003: `describeValue` in the kit's messages.
- `rulers/number-lines-and-coordinate-graphs-ticket-002-security-review`:
  - SEC-001: range bounds read own-key;
  - SEC-002: the label's length. It is deferred to the caller-text decision, now answered as GSV-REQ-052..054, with a 500 KB label test asked of this ticket. That residual is not raised again. SEC-001 here covers what the decision does not bound.
- `graph-library/geometric-shapes-and-solids-ticket-002-security-review`:
  - SEC-001: argument spreads, and line caps for labels and titles;
  - SEC-002: caller-text length, deferred;
  - SEC-003 and SEC-004: quoting.

  Its Input Validation notes weighed overflow from combining marks and left it unraised. SEC-001 says what is different for the ruler.
- `graph-library/component-packaging-and-source-export-ticket-003-security-review`, for the components' threat model. It probed the registries under pollution, and `textAlternative` with non-string values.

**Files Reviewed:**
- `src/layout/ruler.ts` (new)
- `src/react/graphs/RulerGraph.tsx` (new)
- `src/entries/ruler.ts` (new)
- `src/layout/kit/ruler.ts` (edited: pure annotations, `maxCoordinate()`, `maxFontSize()`)
- `src/core/ruler.ts` (edited: pure annotations, `locatedValue`)
- `src/core/definitions/ruler.ts` (edited: `describe` uses `locatedValue`)
- `src/core/definitions/shared.ts` (edited: the `label` description)
- `src/core/definitions/index.ts`, `src/layout/registry.ts` (the ruler registered)
- `src/index.ts`, `package.json` (`exports["./ruler"]`), `tsup.config.ts`, `.size-limit.json`
- `src/generated/schema.json`, `src/generated/tool-schema.json`, `src/generated/vocabulary.json`, `src/generated/description.ts` (regenerated)
- `tests/layout/ruler.test.ts`, `tests/react/Graph.test.tsx`, `tests/package/per-type-bundle.test.ts`, `tests/core/ruler.test.ts`, `tests/core/definitions.test.ts`
- Read unchanged, because the ruler's values flow through them:
  - `src/graph.ts` (`createGraphWith`);
  - `src/react/createGraphComponent.tsx` (`renderGraph`), `src/react/SceneSvg.tsx`, `src/react/Graph.tsx`, `src/react/Placeholder.tsx`;
  - `src/layout/scene.ts`, `src/layout/kit/check.ts`, `src/layout/kit/text.ts`, `src/layout/kit/title.ts`, `src/layout/kit/labels.ts`, `src/layout/kit/format.ts`;
  - `src/core/format.ts`, `src/core/style.ts`, `src/core/validate/structure.ts`, `src/core/index.ts`, `src/tool/index.ts`, `src/export/index.ts`;
  - `dist/ruler.js` and the three chunks it loads, as built by the test run.

**Context read:**
- the ticket and its Known Hazards;
- `.gener8v/constraints/prd.md`. There is no `constraints/number-lines-and-coordinate-graphs.md`;
- `.gener8v/technical-design/system-design.md`: AD-002, AD-007, AD-008, AD-010, AD-011, AD-014 and AD-015;
- `.gener8v/context.md` and `.gener8v/CONVENTIONS.md`;
- the GSV specification's amendment in `dee1d09`.

**Review environment note:**
- **How I probed:**
  - Most probes were inline `TSX_DISABLE_CACHE=1 npx tsx -e '…'` runs from the repository root, against `src/`.
  - Before-load pollution probes ran with plain `node --input-type=module` against the built `dist/ruler.js`, because the tsx loader itself fails once `Object.prototype` is polluted.
  - Browser renders used the Chromium headless shell already in the Playwright cache (Chrome for Testing 153.0.8010.12), on static HTML pages written to the session scratchpad.
  - All scratch files (logs, the list of added lines, HTML pages and screenshots) are in the session scratchpad, outside the repository.
- **Runtime:** Node.js v24.1.0, pnpm 10.28.2, React and React DOM 19.3.0, macOS (Darwin 25.6.0).
- **Commands run in the repository:**

| Command | Exit | Evidence |
|---|---|---|
| `pnpm audit` | 0 | No known vulnerabilities found |
| `pnpm audit --prod` | 0 | No known vulnerabilities found |
| `pnpm lint` | 0 | — |
| `pnpm typecheck` | 0 | `tsc --noEmit` |
| `npx vitest run --no-cache` | 0 | 49 files and 1,375 tests passed, on the first run, with no flake. Its global setup runs `pnpm build`, which rewrites the git-ignored `dist/` |
| `pnpm check:dist` | 0 | 16 built files scanned, no network APIs or network modules |
| `pnpm check:deps` | 0 | 0 runtime dependencies |
| `pnpm publint` | 0 | All good |
| `pnpm attw` | 0 | — |

- **Not run:** `pnpm size` and `pnpm generate`, as instructed. `pnpm bench` and `pnpm check:images` were also not run; they have no bearing on security.
- **Tree check:** before writing this report, `git status --short` showed only ` M .gener8v/runs.jsonl`.

**Findings:** 2
**Critical:** 0 | **High:** 0 | **Medium:** 0 | **Low:** 0 | **Informational:** 2

## Security Assessment

### Input Validation

**Status:** Gaps Found
**Notes:**
**Entry points this ticket opens to a ruler description:**
- `createGraph` (`src/graph.ts:60-62`), `<Graph>` (`src/react/Graph.tsx:22-25`) and `<RulerGraph>` (`src/react/graphs/RulerGraph.tsx:16`), from `.` and `./ruler`;
- `validate`, `normalize`, `describe`, `getSchema`, `getToolSchema` and `getVocabulary` from `./core` (`src/core/index.ts:13-15`), now that the ruler is in `definitions`;
- `./schema.json` and `./vocabulary.json`.

`./tool` and `./export` are still empty modules (`src/tool/index.ts`, `src/export/index.ts`).

**The guard.** `createGraphWith` (`src/graph.ts:21-47`) does three things:
- it validates, then calls `rulerLayout`;
- it runs `checkScene` on the result;
- it turns any throw into the fixed `internal_error`, with no message or stack.

`renderGraph` (`src/react/createGraphComponent.tsx:61-66`) prints only an `ok` Scene through `SceneSvg`.

**Caller values in the drawing:**

| Value | Checked by | Reaches the markup as |
|---|---|---|
| `rulerUnit`, `length`, `smallestDivision` | the definition's enums and checks (TICKET-002); `rulerScale` again in the layout, which throws `RangeError` on anything else (`src/layout/ruler.ts:84-86`) | marks and numbers from the kit: lines, and the texts "0" to "30" |
| `measuredObject.start`, `.end` | `endOnMark` and `objectInOrder` (TICKET-002) | the bar's `x` and `width`, from `locatedValue` (`src/layout/ruler.ts:125-128`), through `fmt()` |
| `measuredObject.color` | `resolveColor`: a color name or `#rgb`/`#rrggbb` only (`src/core/validate/structure.ts:138-143`) | the bar's `fill`, always `#rrggbb` |
| `measuredObject.label` | the plain-text policy (`src/core/format.ts:70-127`); no length bound (deferred) | `cleanText`, then `wrap` to 2 lines (`src/layout/ruler.ts:97-98`), then `<text>` children |
| `title` | the same policy | `titleBlock`, 3 lines (`src/layout/kit/title.ts:53-62`), then `<text>` children |
| the `textAlternative` prop | none; `textAlternativeFor` cleans it (`src/layout/scene.ts:148-152`) | `aria-label` and `<title>` |

**What is handled well:**
- **No markup injection.** I used one string as both label and title, and as the `textAlternative` prop: `</text><script>alert(1)</script><img src=x onerror=alert(1)> & " ' url(#x) \75 rl( javascript:alert(1)`. Through both components:
  - it printed only as escaped text and an escaped `aria-label`;
  - the markup holds only `svg`, `title`, `text`, `rect` and `line` elements;
  - their only attributes are `role`, `aria-label`, `viewBox`, `width`, `x`, `y`, `height`, `fill`, `stroke`, `stroke-width`, `font-family`, `font-size`, `font-weight` and `text-anchor`;
  - there is no `id`, `href`, `style`, `class` or `on*` attribute (AD-008, AD-011).
- **Strict color.** `url(#a)`, `red;stroke:url(#a)`, `#12345g`, `javascript:alert(1)`, `rgb(0,0,0)`, ` #000000` and U+202E + `orange` are each `unknown_color`. `ORANGE` resolves to `#b36b00`. The only `fill` values printed are `#1a1a1a`, `none` and the resolved color.
- **Fail-closed and fail-open fuzz.** I generated 20,000 random rulers, of which 15,254 were valid. They covered both units, every division, every length, and ends at every mark, with computed noise. Labels and titles were drawn from 15 kinds: words, 400 "@", ZWJ and flag emoji, CJK, Hebrew, Devanagari, no-break spaces, combining marks, blank and hidden text. Of the valid ones:
  - 0 were refused as `internal_error`, and 0 threw, in `createGraph` or (for one in ten) in `<RulerGraph>`;
  - 0 Scenes had a `checkScene` problem;
  - the most nodes in one Scene was 339: 301 marks, 31 numbers, the body, the bar, 2 label lines and 3 title lines;
  - every Scene's text alternative was exactly `describe(description)`.
- **The kit's limits (NLC TICKET-001 SEC-002 hazard).** The layout calls the kit within its limits:
  - the edge runs from 24 to 376 at a `y` of a few hundred units at most, well within ±4,000;
  - the number size is 12 down to 7.96 at 30 cm, within 0.01 to 36;
  - the unit and length are validated.

  The fuzz found no `RangeError` reaching the guard.
- **Hostile inputs through the components.** I rendered 26 hostile descriptions with `<RulerGraph>` and `<Graph>`, through both `renderToStaticMarkup` and `renderToString`, 104 renders in all. Each also passed the description as the `textAlternative` prop. The descriptions included:
  - `undefined`, `null`, a BigInt and a Symbol;
  - a revoked Proxy;
  - a getter that throws `file:///secret.js`;
  - nesting 100,000 levels deep;
  - a circle;
  - length 31 or 1e308, and a division on centimetres;
  - `__proto__` as the unit, or as a JSON key;
  - reversed and off-ruler ends, and a BigInt end;
  - a `url(` color, and a label with U+202E or a lone surrogate;
  - a 200,000-item unknown list.

  None threw. 102 renders were the fallback; the other 2 were the valid circle drawn by `<Graph>`. The longest output was 1,039 characters, and "secret.js" never appeared.
- **Bounded cost for a text-free ruler.** A 30 cm ruler with an object renders in 3.1 ms and prints a fixed 33,250 bytes.
- **No argument spreads.** The label's widest line, the mark nodes and the label nodes are appended with loops (`src/layout/ruler.ts:99-101`, `:121`, `:142`). The only spreads are into array literals, or of the kit's own 3- or 5-item table (`src/layout/kit/ruler.ts:126`).

**Gaps:**
- **SEC-001:** one cluster escapes the label's line and width bounds. It is drawn whole, its marks get no height in the box `placeLabel` checks, and in Chromium a 200-character label covers the object's end marks and a number.

**Not raised:**
- **The deferred caller-text residual** (rulers NLC TICKET-002 SEC-002, GSS TICKET-002 SEC-002), measured for the record as medians of 5:

  | Label and title | `validate` | `validate` + `describe` | `createGraph` | `<RulerGraph>` render | Markup ÷ body |
  |---|---|---|---|---|---|
  | 100 KB each | 11 ms | 66 ms | 92 ms | 99 ms | 2.18 |
  | 1 MB each | 113 ms | 789 ms | 1,134 ms | 1,146 ms | 2.02 |

  The layout adds one `cleanText` and one split over each string, about 0.34 s per 2 MB. That is the same pass every type's layout makes for its title and labels. The cost stays linear, and GSV-REQ-052's 200 characters bounds it. The asked-for test is present (`tests/react/Graph.test.tsx:420-435`: 36 text nodes for a 500 KB label and a 500 KB title).
- **A caller's hex color with low contrast** (white on white). It is accepted by design for every type (graph-library GSV TICKET-001 DEL-004; this delivery's DEL-003).
- **A label that states the object's length.** The label is the caller's text (ticket Known Hazard). NLC-REQ-055 governs the package's own text, which the suite's property checks.
- **Browser cost of huge clusters.** Chromium 153 rendered every page, including the 500,000-mark ones, in 0.14 to 0.26 s, process start included. WebKit was not measured.

**Not applicable:** SQL, NoSQL, command and template injection, and path traversal. The code has no query, shell, template engine or file path.

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** This is library code with no server, accounts, sessions or permissions (`.gener8v/context.md`: "no user accounts"). The technical design makes no authentication or authorization decision.

### Data Protection

**Status:** Adequate
**Notes:**
- **Sensitive data:** none. The code logs, stores and sends nothing. It handles description values and package text only.
- **Errors:**
  - The layout's one throw, `RangeError("rulerLayout(): the description is not a validated ruler")` (`src/layout/ruler.ts:86`), is unreachable from a validated description (fuzz).
  - Any throw becomes the fixed `internal_error`, whose message names nothing (`src/graph.ts:18`, `:42-46`).
  - A throwing getter's text never reached any output (hostile sweep).
- **Secret scan:** I scanned the 1,001 lines that `git diff 418a2b8..HEAD` adds under `src`, `tests` and `examples`, plus `package.json`, `tsup.config.ts` and `.size-limit.json`. The patterns covered:
  - keys, tokens, secrets, passwords and private keys;
  - AWS, GitHub, npm and Slack token shapes;
  - URLs and network APIs;
  - `eval` and `Function(`, `innerHTML` and `dangerouslySetInnerHTML`, `document.` and `window.`;
  - storage, `console.`, `process.env`, `child_process`, `require(` and `import(`;
  - `__proto__`, `.prototype` and `Object.assign`;
  - timers, `Math.random` and `crypto`.

  There were 0 matches, comments included.

### Configuration Security

**Status:** Adequate
**Notes:**
- **Manifest:**
  - `package.json` adds only `exports["./ruler"]`, with a `types` and a `default` condition. There are no wildcard exports.
  - `sideEffects: false` and `files: ["dist"]` are unchanged.
  - `tsup.config.ts` adds one entry. `.size-limit.json` adds a 25 kB budget.
  - No script, workflow, lint rule or lockfile changes on the branch.
- **Built output:**
  - `dist/ruler.js` is 110 bytes. It re-exports `RulerGraph` from `dist/chunk-QJ6YE57T.js` and imports `dist/chunk-T55UIS4J.js` and `dist/chunk-RXSHY6AA.js`.
  - Across the four files, the only external imports are `react` and `react/jsx-runtime`.
  - None holds `eval`, `Function(`, `innerHTML`, `dangerouslySetInnerHTML`, `document.`, `window.`, `fetch(`, `XMLHttpRequest`, `WebSocket`, storage, `process.env`, `console.`, dynamic `import(` or `require(`, timers, `Math.random` or `crypto`.
  - `check:dist`, `publint` and `attw` pass.
  - `dist/` also holds an empty `preview/` directory, dated 2026-10-16. It is not produced by this ticket, and `pnpm pack` leaves it out.
- **Module load:** importing `dist/ruler.js` left the own keys of `globalThis` and of `Object`, `Array`, and the `Object`, `Array`, `Function`, `Number` and `String` prototypes unchanged (prd/TC-007).
- **Pollution:**
  - **After load:** 67 keys × 6 values, enumerable or not, 804 cases. Only four keys changed output (SEC-002).
  - **Before load:** 52 keys plus `Array.prototype[0..7]`, hidden or enumerable, on the built entry. The output was byte-identical.
- **Secrets and defaults:** none. The limits are named constants: `RULER_EDGE`, `LABEL_MAX_LINES`, and the kit's `maxCoordinate()` and `maxFontSize()`. The code review turned the kit's two limits into functions, and they still return 4,000 and 36.
- **Cryptography:** not applicable. No randomness or cryptographic function is used.
- **Logging and monitoring:** not applicable. The package logs nothing (AD-014), and the delivery adds no logger.

**Dependency audit:** `pnpm audit` (pnpm 10.28.2, Node.js v24.1.0), run 2026-10-21 at 16:42 UTC in the repository against the HEAD lockfile (`7cc2dc9`), read-only.
- `pnpm audit`: `No known vulnerabilities found`, exit 0.
- `pnpm audit --prod`: `No known vulnerabilities found`, exit 0. The package has no runtime dependencies; `react` is a peer.
- This branch does not change `pnpm-lock.yaml`. It was last changed in `ad2452f` on `main` (2026-10-20).

**Carried Known Hazards (security-relevant):**

| Hazard | Result |
|---|---|
| NLC TICKET-001 SEC-002: compute the edge and font size inside the kit's limits, so a layout bug fails closed | Honoured. The values are under Input Validation, and the fuzz found no refusal. The layout's own unvalidated-ruler `RangeError` is tested (QR-004) |
| NLC TICKET-002 SEC-002: a caller-sized label test, a 500 KB label drawing a bounded number of text nodes without throwing | Honoured as asked (`tests/react/Graph.test.tsx:420-435`). Its label is 500,000 "@", which splits into ordinary clusters. A one-cluster label is drawn whole (SEC-001) |
| GSS TICKET-002 SEC-001 (carried on every type): `titleBlock` for titles, `wrap` every label, the type's own `describe`, no caller-sized argument spreads | Honoured (`src/layout/ruler.ts:91`, `:98`, `:149`; loops at `:99-101`, `:121`, `:142`) |
| AD-008: no ids or references | Honoured. `checkScene` runs on every Scene in the guard. The markup inventory found no `id`, `href` or `url(` attribute |
| AD-011: presentation attributes only | Honoured (the attribute inventory under Input Validation) |
| AD-014: never throw because of the description | Honoured (fuzz and hostile sweep). The never-throw path's prototype reads are SEC-002 |
| "The object sits beside the marks, not over them: the marks at its ends must stay readable" | The bar does. The caller's label can cover them (SEC-001) |

**Compliance cross-reference:** checked against `.gener8v/constraints/prd.md`. No per-area constraints file exists. The ticket names prd/TC-001..004, TC-007 and CC-002.

| Constraint | Result |
|---|---|
| prd/CC-001 (licenses) | Met: no dependency, asset or font added; `check:deps` reports 0 runtime dependencies |
| prd/CC-002 (WCAG 2.1 AA) | Met for what the package chooses. <ul><li>**1.1.1:** every valid ruler is named by its text alternative in `aria-label` and `<title>` (fuzz; Graph tests).</li><li>**1.4.11:** the mark color `#222222` is 15.91:1 against white, the text `#1a1a1a` 17.40:1, the default bar `#0072b2` 5.19:1, and the named colors at least 4.18:1 (`orange`).</li><li>**1.4.1:** the bar is the only object, told apart by shape, place and label.</li></ul>Two residuals are decisions already recorded elsewhere, so neither is raised as a violation: <ul><li>a caller's hex color is the caller's choice (GSV TICKET-001 DEL-004);</li><li>millimetre marks render lighter than 3:1 below about 330 px shown width (DEL-002, carried by CR-003).</li></ul> |
| prd/CC-003 (no data collection or network) | Met: no network API in the added lines or in the four built files; `check:dist` is clean |
| prd/CC-004 (no trademarked imagery) | Not applicable |
| prd/TC-001, TC-002, TC-003 (pure layout, `fmt()`, no ids) | Met: `checkScene` passes on every fuzzed Scene; markup inventory |
| prd/TC-004 (React 18 and 19 APIs) | Not a security matter. Probed on React 19.3.0 only |
| prd/TC-005 (core without React) | Met: `pnpm lint` passes |
| prd/TC-007 (side-effect-free per-type entry) | Met: module load leaves globals unchanged; `tests/package/per-type-bundle.test.ts` passes |
| prd/IC-001 (tool schema subset) | Met as far as the suite checks: the ruler is in `src/generated/tool-schema.json`, and `tests/core/schema-agreement.test.ts` passes. The ruler's schema branch and its `measuredObject` have `additionalProperties: false`. Its strings carry the plain-text `pattern`, and no `maxLength` yet (GSV-REQ-054, pending) |
| prd/IC-002 (Server Components) | Met: `RulerGraph` is `createGraphComponent`'s pure function, with no hooks |

No CC-XXX violation was found, so no finding is raised to Critical.

## Findings

### SEC-001: The drawing bounds a label's lines, not its clusters: one character with a run of combining marks is drawn whole in a one-line box, and renders over the bar, the object's end marks and a number, within the coming 200-character limit

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** N/A. Related to A06:2025 Insecure Design, CWE-451 (user interface misrepresentation of critical information) and CWE-400 (uncontrolled resource consumption).
**Location:**
- `src/layout/kit/text.ts:28-46` (`ZERO_WIDTH`; combining diacritical marks at `:29`): a combining mark has no advance. Nothing gives it any height.
- `src/layout/kit/text.ts:134-151` (`clusters`) and `:206-220`: a cluster is never split. A cluster wider than a line stays whole, so `wrap`'s `maxLines` bounds lines, not characters. `titleBlock` (`src/layout/kit/title.ts:57`) inherits this.
- `src/layout/ruler.ts:97-102`: the label's box is its lines' estimated width, by lines × 14 × 1.2 high. `:131-141`: `placeLabel` checks that box against the bar and the body.
- `src/layout/ruler.ts:38-42`: `LABEL_MAX_LINES`'s comment, "so caller-sized text yields a bounded Scene".
- `src/core/format.ts:70-127`: the plain-text policy, a Product Owner decision. It accepts any run of combining marks, ZWJ (U+200D) and the emoji variation selectors.
- `tests/react/Graph.test.tsx:420-435`: the caller-sized test's label is 500,000 "@", which splits.

**Description:**
The layout bounds the measured object's label two ways: 2 lines, and 240 units of estimated width. Both bounds count clusters. `wrap` never splits a cluster, and `textWidth` gives a combining mark no advance and no height. A label that is a single cluster escapes both bounds. Probed through `createGraph`, `<RulerGraph>` and Chromium 153:

| Label | Valid | Drawn | Effect |
|---|---|---|---|
| "x" + 199 combining below marks (U+0316–U+0339), 200 UTF-16 units, inside GSV-REQ-052's limit, on a 10 cm ruler with an object from 4.9 to 5.1 | yes, and `createGraph` is `ok` | one text node of 200 characters. Its estimated box is 7.70 × 16.8 units at y 16, above the bar at y 38.8 | the marks render as a column from the label down through the bar, both end marks, the number "5" (at y 88) and the ruler's body, so "5" cannot be read (screenshot in the session scratchpad) |
| "a" + 499,999 × U+0301 | yes | one text node of 500,000 characters | 1.53 MB of markup, against 1.03 MB when the label is 500,000 "@" drawn as two cut lines |
| a ZWJ chain of 166,667 women, 500,000 units | yes | one text node of 500,000 characters, at x = −1,282,951.9 | the same size, drawn off the page |
| "❤" + U+FE0F × 499,999, and "👍" + 249,999 skin-tone modifiers | yes | one text node each, 500,000 characters | the same size |
| a title of "a" + 99,999 × U+0301, or a 100,001-unit ZWJ chain | yes | one title node of 100,000 or 100,001 characters, past `TITLE_MAX_LINES` | the same, for titles |

The random fuzz hit it at ordinary sizes too. The longest drawn text among 15,254 valid rulers was 501 characters. Ordinary text cut to two lines draws at most about 30: 500,000 characters of words drew lines of 29 and 30.

Why it matters for the ruler:
- **The ticket's promises fail where it counts.** The criterion says the label is "placed by `placeLabel` without hiding a number". The Known Hazard says "the marks at its ends must stay readable". Both hold for the estimated box, so `createGraph`, `checkScene` and the layout tests all report a clean figure. In the browser, the first case hides both end marks and a number.
- **The precedent was weighed for other figures.** GSS TICKET-002's security review left combining-mark overflow unraised: the effect stays inside the graph's own `<svg>`, and the author already controls that figure. Both points still hold. Two things are new:
  - a ruler is read at its marks, and this ticket promises those stay visible;
  - the caller-text limit decided since (GSV OQ-009, GSV-REQ-052) bounds the size part, but not the column. 199 marks fit inside the 200-character limit and already cover a number.
- **No browser cost was found.** Chromium drew only the first few marks of a 500,000-mark cluster. Every page rendered in 0.14 to 0.26 s, process start included. WebKit was not measured.

**Attack Scenario:** N/A (Informational). For the record:
- An author, or a model whose tool call was steered by injected content, writes a "how long is it?" ruler. Its label is one letter plus about 200 below marks, and its object is short enough that the label centres on the end marks.
- It validates, draws with `ok: true`, and passes any platform check that trusts the package's no-overlap layout.
- Students see a column of marks over the reading they are asked to make. The text alternative still states the marks.
- The author already controls the figure, and could equally draw the bar at the wrong marks. What the author gains is that the package reports the figure as clean.

**Impact:**
- The caller's own label can cover the marks and numbers of a figure the package reports as clean, within the coming limit.
- Until GSV-REQ-052 lands, a one-cluster label is a third whole copy of the text in the markup, beside the two in the text alternative. The Scene is bounded in nodes but not in characters.
- Nothing escapes the graph's `<svg>`, which inline SVG clips. No markup or script is injected: the text is a React text child.

**Recommendation:**
1. **Bound clusters in the drawing.** This would go in the shared text kit, for every type's titles and labels at once. The text alternative keeps the full text, and the description contract does not change.
   - Draw at most a few combining marks per cluster, for example 4. That is enough for Vietnamese, Thai, Devanagari and Hebrew pointing. Unicode's Stream-Safe Text Format (UAX #15) allows 30 in a row, far more than real text needs.
   - Cut a cluster wider than the line with "…", as `withEllipsis` does for a line (`src/layout/kit/text.ts:233-239`).

   The line caps would then bound characters too, and the `LABEL_MAX_LINES` comment would be true.
2. **Or estimate a height for stacked marks** in the label box, so `placeLabel` moves the label clear of the bar and the numbers. This keeps the text but does not bound its size.
3. **Tests:** add one-cluster labels and titles (combining marks, a ZWJ chain) to the caller-sized test (`tests/react/Graph.test.tsx:420-435`), and expect drawn text bounded in characters. With (1), also expect at most the chosen number of marks per base.
4. **Known Hazard on the GSV-REQ-052..054 ticket, when it is written:** test the limit with one-cluster text as well as words.
5. **Or accept it** as GSS TICKET-002 did, with a `**Risk accepted by:**` line. The rationale would be that the author controls the figure and the effect stays inside the `<svg>`. The ticket's "without hiding a number" would then be recorded as holding for the estimated box only.

**Compliance Impact:** None. prd/CC-002's criteria still hold: the text alternative states the ends, and the package's colors meet contrast. It is the caller's own text that covers the figure.
**Status:** Deferred → the graph-library Graph Specification & Vocabulary ticket implementing GSV-REQ-052..054 (caller text limits), to be cut next by Ticket Breakdown
**Resolution:** Deferred (approved by Thomas, 2026-10-21). That ticket already changes how caller text is bounded for every type. Its breakdown carries this finding as a Known Hazard: bound stacked marks per character in the shared text kit, or count them in a label's estimated box, and test the limit with one-cluster text (combining marks, a ZWJ chain) as well as words.

---

### SEC-002: `renderGraph` reads `textAlternative`, `fallback` and `description` through the prototype chain, and `checkScene` tests `text` and `children` with `in`, so a polluted `Object.prototype` renames every ruler, hides every placeholder, or turns every graph into `internal_error`

**Severity:** Informational
**Category:** Injection
**OWASP Reference:** N/A. Related to A08:2025 Software or Data Integrity Failures and CWE-1321 (prototype pollution).
**Location:**
- `src/react/createGraphComponent.tsx:62`: `const { description, textAlternative, fallback } = props ?? ({} as GraphProps);`. React's props object is a plain object, so a prop the consumer did not pass is read from `Object.prototype`.
- `src/layout/kit/check.ts:43-44`: `"text" in node` and `"children" in node`, on Scene nodes the layouts build as plain object literals.
- Both are older than this ticket (CPSE TICKET-002 and TICKET-003). This ticket exposes the ruler through them: `<RulerGraph>` (`src/react/graphs/RulerGraph.tsx:16`), `<Graph>` and `createGraph`.

**Description:**
I polluted `Object.prototype` after load: 67 keys × 6 values (a string, 7, −1, `true`, an object and an array), enumerable and not, 804 cases. Each ran five rulers through `createGraph`, `<RulerGraph>` and `<Graph>`. The output was byte-identical except for these keys:

| `Object.prototype` | Result |
|---|---|
| `textAlternative = "PWN: this ruler is 3 cm"` | `examples/ruler.json`, and `examples/circle.json` through `<CircleGraph>`, are named "PWN: this ruler is 3 cm" in `aria-label` and `<title>` |
| `fallback = "none"` | an invalid ruler renders nothing instead of the placeholder |
| `description = { …a ruler titled "Injected"… }` | `<RulerGraph />` with no `description` draws the polluter's ruler. A description that is passed is unaffected |
| `text` or `children`, any value | every example of every type becomes `internal_error` |
| `value`, any value | React's own `Object.defineProperty` calls throw during render. This is React's gadget, not the package's |

The ruler's own code added no gadget:
- None of the keys the layout, the kit, the mark rule or the definition read changed anything: `rulerUnit`, `measuredObject`, `label`, `color`, `fill`, `x1`, `from`, `fontSize`, the unit and division names, and the indices `0` to `16`.
- Polluting 52 keys and `Array.prototype[0..7]` before load also left the built `./ruler` entry's output byte-identical.
- The polluted name is cleaned by `textAlternativeFor` and escaped by React, so it cannot add markup.

Earlier reviews made the validator's and the registries' reads own-key: rulers GSV TICKET-001 SEC-004, rulers NLC TICKET-002 SEC-001, and CPSE TICKET-003's registry probe. The component props and the Scene check were not covered.

**Attack Scenario:** N/A (Informational)
**Impact:** None without a separate prototype-pollution bug in the host application. Given one that writes strings, for example a deep merge of request JSON:
- every graph's accessible name, which a screen reader announces and the `<title>` tooltip shows, becomes the polluter's text instead of a description of the figure;
- invalid graphs disappear silently;
- every graph is refused as a package defect.

**Recommendation:**
- In `renderGraph`, read the three props own-key:
  ```ts
  const own = (key: keyof GraphProps): unknown => (props != null && Object.hasOwn(props, key) ? props[key] : undefined);
  ```
  then read `description`, `textAlternative` and `fallback` through it.
- In `checkNode`, use `Object.hasOwn(node, "text")` and `Object.hasOwn(node, "children")`.
- Add pollution tests beside the existing ones. With `Object.prototype.textAlternative`, `.fallback`, `.description`, `.text` and `.children` polluted, the ruler example's markup through `<RulerGraph>` and `<Graph>` must be unchanged, and an invalid ruler must still render the placeholder.
- The fix is in shared code, so it reaches every type. It can land here, in a commit of its own, or be deferred.

**Compliance Impact:** None. prd/CC-002's text alternative holds unless the host process is already compromised.
**Status:** Fixed
**Resolution:** Fixed (approved by Thomas, 2026-10-21), for every graph type:
- `renderGraph` (`src/react/createGraphComponent.tsx`) reads `description`, `textAlternative` and `fallback` as the props' own keys;
- `checkNode` (`src/layout/kit/check.ts`) tests `text` and `children` with `Object.hasOwn`.
- `tests/react/Graph.test.tsx` pollutes `Object.prototype` with each of `textAlternative`, `fallback`, `description`, `text` and `children`: the ruler example's markup through `<Graph>` and `<RulerGraph>` is unchanged, an invalid ruler still renders the placeholder, and a missing description draws nothing injected. Putting back the `in` reads or the destructuring fails these tests.

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Deferred | Carried to the GSV-REQ-052..054 ticket as a Known Hazard at its breakdown | No | — (the ticket does not exist yet) |
| SEC-002 | Fixed | Own-key reads of props and Scene node fields; pollution tests | No | `src/react/createGraphComponent.tsx`, `src/layout/kit/check.ts`, `tests/react/Graph.test.tsx` |

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:**
- **Final verdict** written in the main session on 2026-10-21, after resolution with the Engineer: SEC-002 fixed, SEC-001 deferred to the caller-text ticket.
- **Re-verification:** `pnpm generate` (no change), `lint`, `typecheck`, `build`, `check:dist`, `check:deps`, `check:images`, `size`, `publint`, `attw`, `bench` and `audit` exit 0; `pnpm test` passes 1,377 tests on three runs. The three own-key reads, each put back, fail a test.
- **Dependency audit:** `pnpm audit` and `pnpm audit --prod`, 2026-10-21 at 16:42 UTC: no known vulnerabilities.
