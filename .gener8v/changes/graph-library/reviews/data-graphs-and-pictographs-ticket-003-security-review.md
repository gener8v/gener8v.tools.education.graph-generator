# TICKET-003: Bar graph — Security Review

## Summary

This review covers the delivery of `graph-library/data-graphs-and-pictographs/TICKET-003` at HEAD of branch `ticket/dgp-003` (`b848ee5`): the delivery commit `1fd9f5e`, the code-review resolution `01a35a5` and the quality-review resolution `b848ee5`. The code reviewed is the code as it stands now, including both reviews' Post-Review Amendments: CR-001's value-label wrapping, and QR-005 and QR-007's kit helpers and horizontal re-measure loop. The `security-reviewer` agent ran the findings phase in a fresh context on 2026-10-19.

The bar graph adds no new kind of input. It reuses the categories, the value scale, colors and labels, and adds the one caller-sized text the specification forbids cutting: a value label written in full. Most of the new surface is sound:
- **Markup:** caller text reaches the markup only as text.
  - 240 fixture descriptions covered every text field, in both orientations, with value labels and a rotated name.
  - No attribute held caller text, and no markup, control, direction or tag character got through in 380 renders.
  - Bar colors reach `fill` only as a resolved `#rrggbb`.
- **Validation:**
  - Values are bounded from 0 to 1e9, at most 100 of them, and a negative one is `out_of_range` at its own path.
  - A scale minimum above zero is reported.
  - The `elementsHint` path reads only the definition's own string, and a polluted hint changes nothing.
- **Bounded loops:** `fitHorizontalValueAxis` makes at most 9 extra attempts, and `drawHorizontal` at most three plans.
  - 12,000 fuzzed bar graphs gave 3,705 valid ones, with no `internal_error`, no hang, and nothing slower than 18.5 ms.
  - 20,000 malformed descriptions threw nothing.
  - The narrowest plot is still 126.96 units wide.
- **Dependencies:** `pnpm audit` is clean, and the lockfile is unchanged.

The findings concern the bound the delivery recorded for the Product Owner's caller-text decision, and two new reads through the prototype chain:
- **SEC-001 (Low):** a given negative minimum puts a horizontal plot's zero line at its right end. Every value label then wraps to 72 units again, and a 2.3 KB description draws a figure 53,728 units tall, 134 times its width. That is the height CR-001 recorded as shrunk. Long names alone already reach 42,208 units, against the 22,048 recorded.
- **SEC-002 (Low):** names whose words are narrower than a space, such as single combining marks, wrap one word per line in crowded upright columns. With the value labels beside them, a 27.8 KB description draws 11,921 text nodes and 2.32 million characters of markup. That is three times the figures recorded and pinned as the limit (3,802 and 861,141). The same names push the pictograph and the line graph past their recorded figures too.
- **SEC-003 (Informational):** two reads added here go through the prototype chain: the empty value-label list, read for each bar when `showValues` is off, and `ScaleOptions.intervals`. With a polluted `Object.prototype`, the first draws text the description never held. The second makes every line and bar graph with a chosen interval an `internal_error`.

Three findings: 0 Critical, 0 High, 0 Medium, 2 Low, 1 Informational.

**Reviewer:** `security-reviewer` agent, fresh context (findings phase only, 2026-10-19)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/data-graphs-and-pictographs-ticket-003-delivery.md` (DEL-001..005, Notes, Post-Review Amendments CR-001..005 and QR-001..007)

**Files Reviewed:**
- `src/core/definitions/bar-graph.ts`
- `src/core/definitions/categories.ts` (`categoriesProperty`, `axisLabelSentences`, `ORIENTATION_DESCRIPTION`, `nameKey`, `checkCategories`, `valuesPerCategoryCheck`)
- `src/core/definitions/shared.ts` (the scoping of `color`, `label`, `lineColor` and both axis labels)
- `src/core/definitions/line-graph.ts`, `src/core/definitions/pictograph.ts` (the shared sentences and description only), `src/core/definitions/index.ts`
- `src/core/value-scale.ts` (`ScaleOptions.intervals`, `DEFAULT_VALUE_INTERVALS`, `resolveValueScale`, `valueTicks`, `checkValueScale`)
- `src/core/validate/structure.ts` (`checkStructure`'s `elementsHint`, `appliesToType`, `checkMap`, `checkValue`)
- `src/layout/bar-graph.ts`
- `src/layout/kit/value-scale.ts` (`categorySlots`, `rotatedNameLines`, `drawLeftAxisLabel`, `drawBottomAxisLabel`, `drawAxisLine`, `offsetAlong`, `tickLabelOverhang`, `tickLabelsFit`, `fitHorizontalValueAxis`)
- `src/layout/line-graph.ts` (`MARKER_REACH`, the renamed helpers)
- `src/layout/registry.ts`
- `src/react/graphs/BarGraphGraph.tsx`, `src/entries/bar-graph.ts`, `src/index.ts`
- `package.json`, `tsup.config.ts`, `.size-limit.json`
- `examples/bar-graph.json`, `examples/invalid/bar-graph-negative.json`, `examples/invalid/bar-graph-scale-above-zero.json`
- `src/generated/schema.json`, `src/generated/tool-schema.json` (the bar-graph branch)
- `tests/core/bar-graph.test.ts`, `tests/layout/bar-graph.test.ts` (the property, crowded-columns and bounded-text cases), `tests/react/Graph.test.tsx` (the bar-graph cases and the pictograph's at-limit case)

Context read:
- the ticket's Constraints and Known Hazards, including those carried from GSV TICKET-001, 003, 004 and 005, GSS TICKET-002, DGP TICKET-001, 002 and 005;
- the delivery record, with its Decisions, Notes and both Post-Review Amendments;
- the resolved code review and quality review for this ticket. Neither is raised again. SEC-001 and SEC-002 start from the figures CR-001 recorded;
- `.gener8v/constraints/prd.md` (there is no `constraints/data-graphs-and-pictographs.md`);
- `.gener8v/technical-design/system-design.md`: AD-002, AD-004, AD-007, AD-008, AD-011 and AD-014;
- `.gener8v/context.md`, `.gener8v/CONVENTIONS.md`;
- the earlier security reviews in this change, especially DGP TICKET-001, 002 and 005. These are not raised again:
  - the accepted risks CPSE TICKET-002 SEC-004 (`placeLabel` cost) and CPSE TICKET-003 SEC-005 (validation on every render);
  - the pending Product Owner decision on a caller-text length bound (GSS TICKET-002 SEC-002), which keeps the title and axis labels unbounded in the text alternative;
  - the provisional limits awaiting the Product Owner: 100 categories, 200-character names;
  - the settled rule that a caller's own color is the caller's contrast choice (GSS TICKET-002, the CC-002 row).

Code this delivery depends on, read unchanged:
- `src/graph.ts` (`createGraphWith`);
- `src/core/format.ts`, `src/core/style.ts` (`resolveColor`, `defaultStyle`);
- `src/layout/scene.ts`, `src/layout/kit/check.ts`, `src/layout/kit/title.ts`, `src/layout/kit/text.ts`, `src/layout/kit/format.ts`;
- `src/react/SceneSvg.tsx`, `src/react/createGraphComponent.tsx`;
- `src/tool/index.ts` and `src/export/index.ts`. Both are still empty stubs (`export {}`), so the tool handler and the source exporter do not run this code yet.

**Review environment note:**
- **How I probed:** every probe was an inline script, `npx tsx -e '…'`, run from the repository root with `TSX_DISABLE_CACHE=1` and `NODE_ENV=production`.
  - Probes imported `./src/…`, `./examples/…`, `./tests/fixtures/plain-text.ts`, and the installed `react` and `react-dom/server`.
  - Each prototype-pollution probe ran in a fresh process. Long runs were bounded with `timeout`.
  - No file was written. The scratch directory stayed empty.
- **Runtime:** Node.js v24.1.0, pnpm 10.28.2, macOS (Darwin 25.6.0), default heap.
- **Commands run in the repository** (read-only apart from the git-ignored `dist/`):

| Command | Exit | Evidence |
|---|---|---|
| `pnpm audit` | 0 | No known vulnerabilities found |
| `pnpm audit --prod` | 0 | No known vulnerabilities found |
| `pnpm lint` | 0 | `eslint .`, no output |
| `pnpm typecheck` | 0 | `tsc --noEmit`, no output |
| `pnpm test` | 0 | 41 files, 1,095 tests passed (18.97 s), run under `pipefail`. The global setup rebuilt `dist/` |
| `pnpm build` | 0 | tsup ESM and DTS, including `dist/bar-graph.js` and `dist/bar-graph.d.ts` |
| `pnpm check:dist` | 0 | "Built files scanned: 14, no network APIs or network modules." |
| `pnpm check:deps` | 0 | "Runtime dependencies: 0, all justified." |
| `pnpm check:images` | 0 | "Images: 8 (apple, ball, book, fish, flower, person, star, tree), every license recorded and allowed (MIT, CC0-1.0)." |

- **Not run:**
  - `pnpm size`, which bundles into the operating system's temporary directory. The delivery record gives `./bar-graph` as 18.8 kB of 25 kB.
  - `pnpm generate`, which writes source.
  - `pnpm bench`, `publint` and `attw`, which the quality review re-ran at the fixes.
- **Tree check:**
  - `git status --short` before and after every command and probe showed only the existing modifications to `.gener8v/pipeline-state.yaml` and `.gener8v/runs.jsonl`, plus this report once written.
  - The three `check:*` scripts run through tsx with its default transform cache, which lives in the operating system's temporary directory, outside the repository.

**Findings:** 3
**Critical:** 0 | **High:** 0 | **Medium:** 0 | **Low:** 2 | **Informational:** 1

## Security Assessment

### Input Validation

**Status:** Gaps Found
**Notes:**
**Entry points:** no new core function. The bar graph is reached through:
- `validate`, `normalize` and `describe` on `./core`;
- `createGraph`, `Graph` and `BarGraph` on `.`;
- `BarGraph` on the new `./bar-graph` entry.

`./tool` and `./export` are still empty. Whatever the tool handler becomes will call `validate` and `createGraph`, which are reviewed here.

**Caller-controlled values this delivery reads:**

| Value | Validation | Where it goes |
|---|---|---|
| `categories` | list, `maxItems` 100; at least one; distinct names (`nameKey`) | one slot or row each |
| `categories[i].name` | plain-text policy; required; at most 200 characters (code points) | wrapped below an upright plot or beside a horizontal one, or rotated; never cut (SEC-001, SEC-002); quoted in the text alternative |
| `categories[i].color` | `resolveColor`: eight names or `#rgb`/`#rrggbb` | that bar's `fill`, as lowercase `#rrggbb` |
| `values` | list, `maxItems` 100; each a finite number from 0 to 1e9; one per category (`valuesPerCategoryCheck`); `-0` is accepted and is stated and drawn as 0 | bar length (`barLength`, `fmt`); value label (`displayValue`, wrapped with no line cap, DEL-005); stated exactly in the text alternative |
| `orientation` | enum `vertical` (default), `horizontal` | layout branch |
| `barColor` | `resolveColor` | `fill` of every bar without its own color |
| `showValues` | boolean | value labels |
| `valueScale` | as DGP TICKET-001: ±1e9; parts below 1e-9 rejected; span resolution; tick count by arithmetic. In addition, `scaleStartsAtZeroCheck`: a minimum above 0 is `out_of_range` | value axis; a negative minimum moves the zero line (SEC-001) |
| `categoryAxisLabel`, `valueAxisLabel` | plain-text policy; `""` dropped; no length bound (pending GSS TICKET-002 SEC-002) | wrapped and cut at 2 lines; quoted in the text alternative |
| `title` | plain-text policy; `""` dropped | `titleBlock` (at most 3 lines); quoted |
| a top-level `color` | `inapplicable_property`: "give it on each category, or use barColor for every bar instead" | never reaches the description |

**What is handled well:**
- **Markup:**
  - Caller text is placed only in `TextNode.text`. Value labels and tick labels are package-printed digits.
  - Every attribute value is built by the package: `fmt()` numbers, `rotate(-90 x y)` from `fmt()` numbers, resolved colors and constants.
  - **Probe:** the 24 shared fixture strings (`BENIGN_TEXT`, `HOSTILE_TEXT`, `SMUGGLED_TEXT`) were each placed in five places: the title, both axis labels, a category name with its own color, and a name long enough to force rotation. Each ran in both orientations with `showValues` and a `barColor`, giving 240 descriptions.
    - 190 were valid. The 50 rejected were the 5 strings with unsafe characters, in each of the 5 places and 2 orientations.
    - `checkScene` was clean on every Scene, and no attribute value held caller text.
    - Across 380 renders through `<Graph>` and `<BarGraph>`, the markup held no `<script`, `<b>`, U+202E, U+2028, ESC, newline or tag character.
    - The attribute-breakout string appears only escaped (`data-x=&quot;`, in 20 renders), and `globalThis.pwned` was never set.
    - Rotated names were drawn in 19 of the valid cases.
- **Colors:** 26 hostile values were each given as `barColor` and as a category color.
  - `url(#x)`, `red" onload="alert(1)`, `javascript:alert(1)`, `" red"`, `#12`, `#1234`, `rgb(0,0,0)`, `currentColor`, the Kelvin sign, `__proto__`, `constructor`, `toString` and `""` are `unknown_color`.
  - Non-strings are `wrong_kind`.
  - `RED`, `Red`, `#0072B2` and `#abc` resolve to lowercase hex.
  - The only `fill` and `stroke` values drawn were `#222222`, `#1a1a1a`, `#c62828`, `#0072b2` and `#aabbcc`.
  - A 1 MB `barColor` gives a 163-character message that quotes a clipped, escaped copy, in 0.8 ms.
- **Text alternative:**
  - The title, both axis labels (`axisLabelSentences`) and every category name are cleaned and quoted (`quoteText`).
  - Values go through `stateMeasurement` with their source (`/values/<i>`) and no unit, so a value is stated with the digits supplied and nothing caller-written reads unquoted.
  - At the limits (100 names of 200 characters, every value `5e-324`) it is 53,415 characters, printed twice (`aria-label` and `<title>`). That is a sixth of the line graph's pinned 321,158, so the CPSE TICKET-007 cap hazard already covers it.
- **The element-option hint (`elementsHint`):**
  - `checkStructure` (`src/core/validate/structure.ts:301-303`) reads the definition's own string only. The bar graph sets its own hint (`src/core/definitions/bar-graph.ts:124`), which names `barColor`.
  - **Probe:**
    - A top-level `color` is `inapplicable_property` with the hint. A 1 MB value is never walked (0.1 ms).
    - A top-level `label` is `inapplicable_property` ("remove it"), because the shared `label` does not list the bar graph.
    - A category's `label` or `lineColor` is `inapplicable_property` at its own path.
    - A category's `JSON.parse`d `__proto__` is `unknown_property`, listing `name` and `color`.
    - A polluted `Object.prototype.elementsHint` changed nothing.
- **Domain checks:**
  - `scaleStartsAtZeroCheck` reads one number. `valueScaleCheck` declares `values/*`, so a failed value skips it, and its inputs are pinned (QR-003).
  - Every issue is built with `createIssue`, and the work grows with the 100 values at most.
  - Because a bar graph's minimum is at most 0, its span is at least the larger end's size. The too-fine-span case of DGP TICKET-001 SEC-001 therefore cannot arise, as `tests/core/bar-graph.test.ts:128` pins.
- **The new loops are bounded:**
  - **`fitHorizontalValueAxis`** (`src/layout/kit/value-scale.ts:360-374`): with a given interval it returns at once. Otherwise it makes at most `DEFAULT_VALUE_INTERVALS − 1` = 9 more resolutions. Each chosen-interval scale has at most about a dozen ticks, and `tickLabelsFit` is linear in them.
  - **`drawHorizontal`** (`src/layout/bar-graph.ts:210-219`): at most three `planHorizontal` calls, the first and two retries. The loop does not have to converge to end.
    - **Measured cost:** each plan cleans the whole category-axis label again. A 1 MB `categoryAxisLabel` therefore takes 922 ms in `createGraph` across, against about 570 ms for every other label and orientation.
    - That is linear, and within the pending caller-text decision, so it is not raised.
  - `rotatedLines` terminates (DGP TICKET-005's review), and `valueTicks` stops at `MAX_VALUE_TICKS`.
- **Narrowest plot:** I tried 28-character tick labels, such as a given minimum of `-1.2345678901234567e-9`, with both axis labels at two lines, a three-line title and value labels.
  - The horizontal value axis is still 126.96 units long, so `wrap` never receives a width of 0 or less.
  - None of 196 valid extreme scales was `internal_error`.
- **Fuzz:** 12,000 random bar graphs went through `createGraph`.
  - They had 1 to 100 categories, with names from seven shapes, and both orientations, with and without `showValues`.
  - Values came from a pool with `5e-324`, `2.2250738585072014e-308`, `1e-9`, `999999999.9999999` and `1e9`, plus noise. Scales mixed given and chosen parts.
  - 3,705 were valid. None was `internal_error`, `validate` and `createGraph` always agreed, and the slowest call took 18.5 ms.
- **Malformed input:** 20,000 structurally random descriptions went through `validate`, `createGraph` and 4,000 renders.
  - They held nulls, `NaN`, lists, objects, `__proto__` and `constructor` keys, inapplicable terms and null-prototype roots.
  - Nothing threw, none was `internal_error`, and the two always agreed.
- **Caller-sized text (GSS TICKET-002 SEC-001):**
  - The title and axis labels are capped, so a 1 MB label renders in at most 15 text nodes.
  - Only fixed-size object spreads appear in the new source (`src/layout/kit/value-scale.ts:218`, `:370`), checked with grep.
  - Value labels are uncapped by design (DEL-005: never cut). A single label is at most 327 characters, and their total is SEC-001 and SEC-002.

**Gaps:**
- **SEC-001:** a given negative minimum restores the pre-CR-001 height across, and long names alone exceed the recorded height.
- **SEC-002:** names of zero-width words, with value labels, exceed the recorded node count and markup size three times over.
- **SEC-003:** the empty `labels` list and `ScaleOptions.intervals` are read through the prototype chain.

**Not applicable:** SQL, NoSQL, command and template injection, and path traversal. The delivered code has no query, shell, template engine or file path.

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** This is library code, with no server, accounts, sessions or permissions (`.gener8v/context.md`: "no user accounts").

### Data Protection

**Status:** Adequate
**Notes:**
- **Sensitive data:** none. The library logs, stores and sends nothing.
- **Issues:** they carry no raw caller value, only clipped, escaped quotations in messages. The new hint is definition text, and the new minimum check quotes a number.
- **Exceptions:** layout exceptions become the fixed `internal_error` (`src/graph.ts:42-46`). None occurred for valid, unpolluted input in any probe.
- **Secret scan:** I scanned the 1,749 lines added by `git diff 4f633f7..HEAD` outside `.gener8v/`. The patterns:
  - keys, tokens, passwords and private keys;
  - AWS, GitHub, npm and Slack token shapes;
  - URLs, `fetch`, `XMLHttpRequest` and `WebSocket`;
  - `eval` and `Function(`, `innerHTML` and `dangerouslySetInnerHTML`, `document.` and `window.`;
  - storage, `console.`, `process.env`, `child_process` and `require(`.

  Nothing matched.

### Configuration Security

**Status:** Adequate
**Notes:**
- **Manifest:**
  - `package.json` gains only `exports["./bar-graph"]`.
  - `tsup.config.ts` gains its entry, and `.size-limit.json` gives it 25 kB.
  - No dependency, script, override or `files` entry changed. `pnpm-lock.yaml`, `.github/` and `eslint.config.js` are unchanged since `main` (`4f633f7`).
- **Built output:**
  - `check:dist` scanned 14 files and found no network API.
  - `./core` now carries the bar-graph definition. That adds no capability.
  - The per-type bundle tests pass both ways.
- **Published schemas:**
  - Both profiles close every object (`additionalProperties: false`).
  - Both carry `maxItems` 100 on `categories` and `values`, `minimum` 0 and `maximum` 1,000,000,000 on each value, and `maxLength` 200 with the plain-text pattern on names. Both carry the color pattern on `barColor` and on a category's `color`.
  - The tool profile lists every optional term as nullable and required (AD-006). The validator stays authoritative.
- **Secrets and defaults:** none.
  - The default bar color is the accent `#0072b2`, about 5.2:1 against white.
  - The new limits are the shared constants, stated in the published descriptions.
- **Cryptography:** not applicable.
- **Logging and monitoring:** not applicable. The package logs nothing (AD-014), and the delivery adds no logger.

**Dependency audit:** `pnpm audit` (pnpm 10.28.2, Node.js v24.1.0), run 2026-10-19 17:09 UTC in the repository against the HEAD lockfile (`b848ee5`), read-only.
- `pnpm audit`: `No known vulnerabilities found`, exit 0.
- `pnpm audit --prod`: `No known vulnerabilities found`, exit 0. The package has no runtime dependencies; `react` is a peer.
- This delivery does not change the lockfile.

**Carried Known Hazards (security-relevant):**

| Hazard | Result |
|---|---|
| GSV TICKET-001 CR-002, QR-001, QR-002: `defineProperties`, nested shared spec objects, no shared option in `properties`, text helpers from `format.ts`, `quoteText` in `describe` | Honoured: `categoriesProperty({ color: sharedProperties.color })`; axis labels, `valueScale` and `title` come through `propertiesOf`; every caller string is quoted |
| GSV TICKET-003 SEC-001: `maxItems` on every array; limits in the description text | Honoured: categories 100 and values 100. The type and value descriptions state 100 categories and values from 0 to 1e9 |
| GSV TICKET-004 CR-003 / SEC-004: `inputs` paths, frozen description, `createIssue`, work by size not magnitude | Honoured. Both new checks declare what they read (pinned by QR-003) and build issues with `createIssue` |
| GSS TICKET-002 CR-003: `describe` and `layout` take the provenance; the layout calls its own `describe`; `titleBlock`; a blank title is absent | Honoured (`src/layout/bar-graph.ts:271`; tests at `tests/core/bar-graph.test.ts:155-163`) |
| GSS TICKET-002 SEC-001: no caller-sized spreads; labels capped; titles with `titleBlock`; a half-megabyte test | Honoured for the title and axis labels: `tests/react/Graph.test.tsx:372`, and at most 15 text nodes per 1 MB label. Value labels are uncapped by design (DEL-005); their total is SEC-001 and SEC-002 |
| GSS TICKET-002 SEC-003: `stateMeasurement` | Honoured; there is no unit |
| DGP TICKET-001 SEC-002 and DGP TICKET-005 SEC-001: names of at most 200 characters; record the node count and markup size | Followed with 200-character single-word names. The recorded figures understate the worst case (SEC-002) |
| DGP TICKET-001 SEC-003: values bounded to ±`VALUE_LIMIT` | Honoured: 0 to 1e9 (`src/core/definitions/bar-graph.ts:92`) |
| DGP TICKET-001 SEC-001, SEC-004: `tickIntervalCheck`, a `checkValueScale` check, draw only checked scales, a tiny-span test | Honoured. The tiny span cannot arise because the minimum is at most 0, and that is tested. The fuzz found no undrawable valid scale |
| DGP TICKET-005 SEC-002: each row sized to its own name (`slotSize`) | Honoured, with the row's own value label too (QR-005). Every name being long is SEC-001 |
| DGP TICKET-002 CR-003 / SEC-002: `elementsHint` names `barColor`; read own-key | Honoured; pollution has no effect |
| Ticket hazard: negative values rejected, not the line graph's `allowNegative` path | Honoured: items `min: 0`; `allowNegative: false` in the check and both layouts |
| AD-008: no ids | Honoured: no ids, and nothing holds `url(` |

**Compliance cross-reference:** checked against `.gener8v/constraints/prd.md`. No per-area constraints file exists. The ticket names prd/TC-002 and CC-002.

| Constraint | Result |
|---|---|
| prd/CC-001 (licenses; bundled assets) | Met: no dependency or asset added, and `check:deps` and `check:images` pass |
| prd/CC-002 (WCAG 2.1 AA, non-text content) | Met. Every Scene has a text alternative naming the type, title, both axis labels and every category with its value (1.1.1). The default bar color is about 5.2:1 on white (1.4.11), and a caller's own color is the caller's contrast choice (settled in GSS TICKET-002). Bars are told apart by position and name, not by color (1.4.1). SEC-001 and SEC-002 concern size, not a missing alternative |
| prd/CC-003 (no data collection or network) | Met: `check:dist` is clean, and no network API appears in the added lines |
| prd/CC-004 (no trademarked imagery) | Not affected: no image added |
| prd/TC-001 (no DOM measurement) | Met: every room and wrap width comes from `textWidth` estimates |
| prd/TC-002 (rounding) | Met: every number goes through `fmt()`. `checkScene` was clean on every probe Scene; `createGraph` would have returned `internal_error` otherwise, and none occurred |
| prd/TC-003 / AD-008 (ids) | Met: no ids or references |
| prd/TC-005 (core without React) | Met: the boundaries tests pass in `pnpm test`, and lint enforces them |
| prd/TC-007 (side-effect-free, per-type entries) | Met: the bundle tests pass |
| prd/TC-011 (computed wrapping) | Met: the kit's `wrap` |

No CC-XXX violation was found, so no finding is raised to Critical.

## Findings

### SEC-001: A given negative minimum moves a horizontal plot's zero line to its right end, so every value label wraps to 72 units again and a 2.3 KB description draws a figure 53,728 units tall, the height code review CR-001 recorded as shrunk

**Severity:** Low
**Category:** Input Validation
**OWASP Reference:** A06:2025 Insecure Design. Also CWE-1284 (improper validation of specified quantity in input) and CWE-400 (uncontrolled resource consumption).
**Location:**
- `src/layout/bar-graph.ts:188-192` (`planHorizontal`): the zero line is at `left + offsetAlong(scale, width, 0)`, and each value label wraps to `max(VALUE_LABEL_WIDTH, free)`, where `free` is the width right of its own bar.
- `src/layout/bar-graph.ts:179-180`: the room right of the plot is reserved for at most `VALUE_LABEL_WIDTH` (72) plus the gap.
- `src/layout/bar-graph.ts:195-197`: each row is as tall as its name, or its value label's lines, whichever is taller.
- `src/core/definitions/bar-graph.ts:55-63` (`scaleStartsAtZeroCheck`): any minimum from −1e9 to 0 is valid, and `tests/core/bar-graph.test.ts:118` accepts one.
- `src/layout/kit/value-scale.ts:191-195`: names beside a horizontal plot wrap to `CATEGORY_NAME_WIDTH` (96) with no line cap.
- `tests/react/Graph.test.tsx:395-413`: the at-limits test uses a chosen scale and 200-character names of "x", and bounds the drawing at 23,000 units across.
- Delivery record, Post-Review Amendments CR-001: "across: 2,502 text nodes, 617,007 characters, and a drawing 22,048 units tall, down from 5,202 nodes and 53,728 units".

**Description:**
CR-001 shrank horizontal value labels by wrapping each one to the free width right of its own bar. On a scale from zero, a zero-length bar's label starts near the plot's left edge and has about 264 units: 10 lines for a 326-character `5e-324`.

A given negative minimum is valid, because bars start at the zero line. It puts the zero line at the minimum's share of the plot. With `{ minimum: -1, maximum: 1e-9 }` and values from 0 to 1e-9, the zero line is at the plot's right end. Every bar is then a zero-length bar at that end, the free width is the 72 units reserved, and each label wraps to 36 lines. The rows, and so the drawing, return to the height CR-001 measured before its fix.

Separately, names alone already exceed the recorded height. A 200-character single word of "@" or CJK characters is 29 lines in the 96-unit column. The recorded "x" names are 15.

**Probe:** 100 categories, every value `5e-324`, `showValues: true`, horizontal, through `createGraph` and `renderToStaticMarkup(<BarGraph>)` (warm mean of 3):

| Names | Scale | Body | Text nodes | Markup (characters) | Height (units) | Height ÷ width | Render |
|---|---|---|---|---|---|---|---|
| "C0" … "C99" | chosen (0 to 1e-9) | 2.3 KB | 1,102 | 304,097 | 14,848.4 | 37.1 | 6.8 ms |
| "C0" … "C99" | `{ minimum: -1, maximum: 1e-9 }` | 2.3 KB | 3,803 | 805,579 | 53,728.4 | 134.3 | 10.2 ms |
| 200 characters of "x" (the recorded case) | chosen | 22.0 KB | 2,502 | 616,995 | 22,048.4 | 55.1 | 24.0 ms |
| 200 characters of "x" | `{ minimum: -1, maximum: 1e-9 }` | 22.0 KB | 5,203 | 1,118,659 | 53,728.4 | 134.3 | 24.9 ms |
| 200 characters of "@" | chosen | 22.0 KB | 3,902 | 871,469 | 42,208.4 | 105.5 | 27.6 ms |
| 200 characters of "@" | `{ minimum: -1, maximum: 1e-9 }` | 22.0 KB | 6,603 | 1,372,612 | 53,728.4 | 134.3 | 28.8 ms |

`{ minimum: -1e9, maximum: 1e-9 }` gives the same 53,728.4. The recorded across case measures 616,995 characters at HEAD; the record's 617,007 predates the quality review's QR-005 and QR-007.

The names-only height is the shared kit's. The pictograph's rows with 100 such names draw 42,210 units, against the 3,639.6 recorded by DGP TICKET-005 SEC-002 for one long name.

**Attack Scenario:** N/A (Low). For example, an author on a worksheet platform that server-renders stored descriptions saves a 2.3 KB horizontal bar graph whose scale starts at −1. On every view, the figure is 134 times taller than it is wide:
- in a 700-pixel column, it is 94,025 pixels tall, and pushes everything after it out of reach;
- an HTML-to-PDF print pipeline (prd/IC-004), or a rasterizer at one pixel per unit, gets a 400 × 53,729 image (about 86 MB in RGBA).

The cost per render stays at 10 to 30 ms and under 1.4 MB of markup, and nothing is disclosed.

**Impact:**
- **Layout:** the host page's layout is disrupted, and print and raster pipelines get oversized output.
- **The record understates:** the across height that CR-001 recorded and pinned for the Product Owner's caller-text decision holds only for scales starting at zero and short names. The real bound is 2.4 times that.

**Recommendation:**
1. **Choose with the user** how a value label is placed when the room right of its bar is short.
   - **One option:** place a label on whichever side of the zero line has more room. Values are never negative, so the part of the plot left of a negative minimum's zero line holds no bar, and a label there would get that span (not measured).
   - **Or** keep the behaviour, and record it as the bound.
2. **Pin it:** add both the negative-minimum case and the 200-character single-word names to the at-limits test in `tests/react/Graph.test.tsx`, asserting the measured heights.
3. **Correct the record for the Product Owner,** beside the 200-character name limit:
   - in the delivery record's CR-001 amendment, state that the across figures hold only for a scale from zero;
   - give 53,728.4 units for a negative minimum and 42,208.4 for long names alone;
   - note that the pictograph's rows reach 42,210 units with 100 such names.

**Compliance Impact:** None. No CC-XXX constraint covers drawn size, and prd/CC-002 is not affected.
**Status:** Resolved
**Resolution:** Fixed — a value label across moves before the zero line when it would wrap after its bar and the plot left of the zero line is wider (`planHorizontal`, `ValueLabel.beforeZero` in `src/layout/bar-graph.ts`); values are never negative, so that part holds no bar, and a label that fits after its bar stays there. `{ minimum: -1, maximum: 1e-9 }` with short names now draws 19,168 units, down from 53,728; the worst over negative minimums is 29,248 (minimum about −2.2 of maximum 1). Names of 200 wide characters alone reach 42,208 units across, now the bound, recorded for the Product Owner. Two tests in `tests/layout/bar-graph.test.ts` and three new at-limits cases in `tests/react/Graph.test.tsx`; the delivery record's figures are corrected. Approved by the user, 2026-10-19.

---

### SEC-002: Names whose words are narrower than a space wrap one word per line in crowded upright columns, with 72-unit value labels beside them, so a 27.8 KB description draws 11,921 text nodes and 2.32 million characters of markup, three times the figure recorded and pinned as the limit

**Severity:** Low
**Category:** Input Validation
**OWASP Reference:** A06:2025 Insecure Design. Also CWE-400 (uncontrolled resource consumption) and CWE-770 (allocation of resources without limits or throttling).
**Location:**
- `src/layout/kit/value-scale.ts:197-203` (`categorySlots`, upright): when every word of every name fits its column, each name is wrapped to `share − NAME_GAP` with no line cap. It is rotated only when a word is too wide (`:204-211`).
- `src/layout/kit/text.ts:184-189` (`wrap`'s `push`): a word joins a line only if `lineWidth + spaceWidth + width <= maxWidth`. In a column narrower than a space (3.67 units at size 12), every word is a line of its own, however narrow the word.
- `src/layout/kit/text.ts:28-46` (`ZERO_WIDTH`): combining marks advance 0. They pass the plain-text policy, whose ranges and test are at `src/core/format.ts:76-119`, and are kept by `nameKey` (`src/core/definitions/categories.ts:168-174`), so names made of them are valid and distinct.
- `src/layout/bar-graph.ts:108-109`: in crowded columns, value labels wrap to `VALUE_LABEL_WIDTH` (72), which is 37 lines for `5e-324`.
- `tests/react/Graph.test.tsx:395-413`: the upright bound (fewer than 4,000 text nodes and 900,000 characters) uses rotated "x" names only. At `:445-457`, the pictograph's narrow-word test uses "i" names (at most 5,000 nodes, under 1,000,000 characters).
- Delivery record, Post-Review Amendments CR-001: "Measured at the limits … upright: 3,802 text nodes and 861,141 characters of markup".

**Description:**
CR-001 measured the upright limit with 200-character single-word names. These are wider than their column, so every name is rotated to one line. A name whose every word fits its column is not rotated. It is wrapped to the column instead, and once the column is narrower than a space, that means one word per line.

The extreme shape has words that are each a single combining mark, separated by spaces: 100 words in 199 code points, so 100 lines. Columns stay unrotated while their share is above `NAME_GAP` (4 units), which allows up to 87 columns under a short-tick scale. Each column's value label adds 37 lines at 72 units.

**Probe:** upright, every value `5e-324`, `showValues: true`, the worst category count from 1 to 100 for each shape, through `createGraph` and `<BarGraph>`:

| Names | Scale | Columns | Body | Text nodes | Markup, characters (UTF-8 bytes) | Height | Render (warm mean) |
|---|---|---|---|---|---|---|---|
| 200 characters of "x" (the recorded case) | chosen | 100 | 22.0 KB | 3,802 | 861,141 | 2,127.0 | 26 ms |
| "i i i …" (one "l" to keep them distinct) | chosen | 40 | 8.8 KB | 5,482 | 1,069,357 | 2,244.8 | 13 ms |
| "i i i …" | `{ maximum: 1, tickInterval: 1 }` | 50 | 11.0 KB | 6,852 | 1,334,833 | 2,244.8 | 15 ms |
| one combining mark per word (U+0300, one U+0301) | chosen | 70 | 22.3 KB | 9,592 | 1,871,080 | 2,244.8 | 27 ms |
| the same | `{ maximum: 1, tickInterval: 1 }` | 87 | 27.8 KB | 11,921: 8,700 name lines, 3,219 value-label lines, 2 ticks | 2,322,573 (2,349,369) | 2,244.8 | 33 ms |

The same name shape goes through the shared kit in the other two data graphs, which have no value labels:
- **Pictograph, vertical:** 9,101 text nodes and 1,766,952 characters (91 columns). That is above DGP TICKET-005 SEC-001's recorded worst, 3,923 nodes and 0.77 MB, and above its test's bound.
- **Line graph:** 8,602 text nodes and 1,635,659 characters (86 columns).

Other probed shapes stayed at 3,802 nodes: "W W …" words, CJK and emoji names. Emoji names reach 1,041,940 UTF-8 bytes at 100 columns.

**Attack Scenario:** N/A (Low). For example, on a platform that stores and server-renders authored graphs, each view of the 27.8 KB description sends 2.35 MB of SVG and costs about 33 ms of rendering. The cost is bounded, at about 84 bytes of markup per byte of description, and nothing is disclosed.
**Impact:**
- **Amplification:** bounded, at most about 2.35 MB of markup and 12,000 text nodes per render, roughly three times any other registered type's pinned figure.
- **The record understates:** the record and the tests give the Product Owner's pending caller-text decision figures about three times too small for the bar graph and more than twice too small for the pictograph.

**Recommendation:**
1. **Correct the record:**
   - In the delivery record's CR-001 amendment, replace the upright figures with 11,921 text nodes and 2,322,573 characters.
   - Record the kit's figures for the Product Owner beside the 200-character name limit: pictograph 9,101 and 1.77 M; line graph 8,602 and 1.64 M.
2. **Pin the shape:**
   - Add names of combining-mark words to the bar graph's at-limits test: 87 columns, scale `{ maximum: 1, tickInterval: 1 }`.
   - Add them to the pictograph's narrow-word test, which today uses "i" names only.
3. **Optionally, bound name lines in crowded columns** without cutting anything. This changes how crowded narrow-word names look in all three types, so it is a choice for the user.
   - In `categorySlots`, rotate every name below a vertical plot once one line no longer fits a column (a share below the line height, the threshold DEL-001 already uses for value labels), not only when a word is too wide.
   - A rotated name takes `floor(share / line height)` lines, which is one in crowded columns. The names' share of the worst case would drop from 8,700 nodes to about 87 (not measured).

**Compliance Impact:** None. No CC-XXX constraint covers availability, and prd/CC-002 is not affected.
**Status:** Resolved
**Resolution:** Fixed — `categorySlots` (`src/layout/kit/value-scale.ts`) rotates every name below a vertical plot once a line no longer fits across a column (share below 14.4 units), not only when a word is too wide, in all three data graphs; nothing is cut. Worst cases over 1 to 100 categories: bar graph 3,802 nodes and 860,841 characters (combining-mark words: was 11,921 and 2,322,573); pictograph 1,107 nodes (was 9,101); line graph 1,040 (was 8,602). A kit test pins the threshold, the at-limits test adds combining-mark names, and the pictograph's narrow-word bound tightens to 1,200 nodes and 250,000 characters. Approved by the user, 2026-10-19.

---

### SEC-003: Two new reads go through the prototype chain, the empty value-label list each bar reads when `showValues` is off and `ScaleOptions.intervals`, so a polluted `Object.prototype` draws text the description never held, or makes every line and bar graph with a chosen interval an `internal_error`

**Severity:** Informational
**Category:** Injection
**OWASP Reference:** N/A. Related to CWE-1321 (prototype pollution).
**Location:**
- **Upright:** `src/layout/bar-graph.ts:109`, `:129`. `labels` is `[]` without `showValues`, and `labels[slot.index]` is read for every bar.
- **Across:** `src/layout/bar-graph.ts:177`, `:189`, `:196`, `:235`. `written` and `labels` are `[]` without `showValues`. `labels[index]` sizes each row, and `labels[row.index]` is drawn.
- **`intervals`:** `src/core/value-scale.ts:139` reads `niceInterval(…, options.intervals)`, the optional field added by DEL-004 (`:66`).
  - Every caller passes an object literal: `src/layout/bar-graph.ts:99`, `:184`; `src/layout/kit/value-scale.ts:366`; `src/layout/line-graph.ts:148`; `src/core/definitions/bar-graph.ts:46`; `src/core/definitions/line-graph.ts:57`.

**Description:**
Earlier reviews made the package's own lookups resistant to a polluted `Object.prototype`:
- null-prototype descriptions and registries;
- own-key reads in `sourceOf`, `getLayout` and `scopedProperty`;
- since DGP TICKET-002 SEC-002, an own-key read of `elementsHint`.

Two reads added here are not resistant:
- **An index into an empty array falls through to `Object.prototype`.**
  - **Probe:** with `Object.prototype[0] = ["INJECTED: ignore the figure"]`, the three-category bar graph without `showValues` draws "INJECTED: ignore the figure" as a value label on its first bar, upright and across. With indices 0 to 4 polluted, it draws one on each of the three bars.
  - The text alternative does not read `labels`, so it is unchanged, and the drawing and its alternative disagree.
  - The circle, line-graph and pictograph examples, and the bar graph with `showValues`, rendered byte-identical.
- **`options.intervals` is read from object literals.**
  - **Probe:** with `Object.prototype.intervals` set to 1000, 0 or −1, every line and bar graph whose interval is chosen returned `internal_error`, upright and across, while `validate` still reported it valid.
  - With 50, an upright bar graph drew 25 numeric labels instead of 7.
  - Examples with a given `tickInterval` were unaffected.
- **Nothing else changed:** polluting `elementsHint`, `orientation`, `showValues`, `barColor`, `color` or `"/values/0"` left every output unchanged.

**Attack Scenario:** N/A (Informational)
**Impact:** this needs a separate prototype-pollution bug in the host process. Given one:
- text the attacker chose appears in the drawing beside a bar, styled like a value label;
- or every data graph with a chosen scale fails to render. That contradicts `createGraph`'s promise that a valid description never becomes `internal_error`.

Nothing changes otherwise.
**Recommendation:**
- **Read value labels only when they exist,** in any of these ways:
  - `const lines = g.showValues === true ? labels[slot.index] : undefined`;
  - build `labels` with one own entry per category;
  - check `Object.hasOwn(labels, index)`.
- **Read `intervals` as an own field,** for example `const intervals = Object.hasOwn(options, "intervals") ? options.intervals : DEFAULT_VALUE_INTERVALS`, and require a positive integer. Alternatively, pass the options on a null prototype.
- **Add two pollution tests** beside DGP TICKET-002 SEC-002's in `tests/core/validate-structure.test.ts`. One pollutes `Object.prototype[0]` with `showValues` off; the other pollutes `Object.prototype.intervals`. Each expects the unpolluted Scene.
- **Extend the rule** for later optional fields to option objects and to reads of possibly-empty lists: read them own-key.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed — value labels are read through `ownEntry` (`Object.hasOwn`) in both orientations, and `resolveValueScale` (`src/core/value-scale.ts`) reads `options.intervals` only as an own field. Two pollution tests in `tests/layout/bar-graph.test.ts` expect the unpolluted Scene: `Object.prototype[0..2]` without `showValues` in both orientations, and `Object.prototype.intervals` at 1000, 0, −1 and 50 for bar graphs (both orientations, given and chosen scale) and the line-graph example. Reading through the prototype again fails them. Approved by the user, 2026-10-19.

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Fixed | A label across moves before the zero line when it would wrap after its bar and there is more room there; tests and corrected figures | No | `src/layout/bar-graph.ts`, `tests/layout/bar-graph.test.ts`, `tests/react/Graph.test.tsx`, delivery record |
| SEC-002 | Fixed | Names below a vertical plot rotate once a line no longer fits a column; kit and at-limits tests; corrected figures | No | `src/layout/kit/value-scale.ts`, `tests/layout/kit/value-scale.test.ts`, `tests/react/Graph.test.tsx`, delivery record |
| SEC-003 | Fixed | Own-key reads of value labels and `intervals`; two pollution tests | No | `src/layout/bar-graph.ts`, `src/core/value-scale.ts`, `tests/layout/bar-graph.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:**
- All three findings are fixed. The across bound is now the names' 42,208 units (200 wide characters), and the upright bound stays at 3,802 text nodes and 861,141 characters. Both rest on the provisional 100-category and 200-character-name limits, pending with the Product Owner beside the caller-text decision (GSS TICKET-002 SEC-002).
- SEC-002's rotation applies to the pictograph and line graph too, and lowers their worst cases to 1,107 and 1,040 text nodes.
- Re-verification: `pnpm generate` (no change), `lint`, `typecheck`, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size` (`./bar-graph` 18.89 kB), `publint`, `attw`, `audit` and `gener8v-state lint` exit 0. `pnpm test` (1,101 tests) exits 0 on three runs.
- Five deliberate breaks of the fixes, against a passing baseline, each fail a test.
- Dependency audit: `pnpm audit` and `pnpm audit --prod`, 2026-10-19, no known vulnerabilities.
