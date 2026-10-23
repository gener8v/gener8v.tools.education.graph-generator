# TICKET-002: Deliver the number line graph type — Security Review

## Summary

This review covers the delivery of `graph-library/number-lines-and-coordinate-graphs/TICKET-002` at HEAD of branch `ticket/nlc-002`, which is the delivery commit `4cd2f9c`. No review has resolved anything on this ticket yet, so the code reviewed is the code as delivered. The `security-reviewer` agent ran the findings phase in a fresh context on 2026-10-22, in parallel with the code and quality reviews.

The delivery is the first registered type to use the axis group. It adds a public attack surface: `validate`, `normalize`, `describe` and `createGraph` from `./core`, plus `<Graph>` and the new `<NumberLineGraph>` (`./number-line`), now accept a caller- or model-written number line. The caller controls these values:
- the axis range, tick spacing and `showTickLabels`;
- the two arrowhead booleans;
- up to 100 points, each with a value, label and color;
- up to 100 custom tick labels, each with a value and text;
- a title, a line label and a line color.

Probed in memory, it holds up well:
- **Bounds.** Every caller string is bounded by the validator and both published schemas. That is `title`, `lineLabel`, `points[].label` and `tickLabels[].text`, each at 200 characters. Both lists have `maxItems: 100`, and an over-limit list is one `too_large`.
- **Drawn text.** Every drawn caller text goes through `cleanText` and `wrap` with a line cap: title 3 lines, point label 2, line label 2, custom tick label 1.
- **Fuzz.** 60,000 generated descriptions with extreme axes gave 16,556 valid ones. Every valid one rendered: no `internal_error`, no reversed line, no node off the drawing, and at most 3.6 ms each.
- **Pollution.** Polluting `Object.prototype` with any of 16 keys, before or after the modules load, changed nothing.
- **Markup.** Ten hostile strings in every text term reached the markup only as escaped text, and four hostile colors were refused as `unknown_color`.
- **Dependencies.** `pnpm audit` is clean, and the lockfile is unchanged.

The finding:
- **SEC-001 (Low):** the delivery record puts the text alternative at "about 25 kB at the limit". At the limits it is 75,721 characters (BMP text), or 116,121 UTF-16 code units (197,729 bytes as UTF-8) with characters outside the BMP. `aria-label` and `<title>` print it twice, so a 47 KB description renders as 561 KB of markup. Point values are stated as written, so 100 unlabelled points at `5e-324` turn a 1,759-byte description into a 32,901-character accessible name and 75 KB of markup (42.7 times the input). Every one of those points is drawn at the same place as 0. No test pins the bound, as one pins the line graph's.

One finding: 0 Critical, 0 High, 0 Medium, 1 Low, 0 Informational.

**Reviewer:** `security-reviewer` agent, fresh context (findings phase only, 2026-10-22)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/number-lines-and-coordinate-graphs-ticket-002-delivery.md`. I read the Pre-Flight Reconciliation, the Implementation Plan (D1–D12), DEL-001..DEL-011, the Deviations, the Notes and the Post-Review Amendments (none).

**Files Reviewed:**
- `src/core/definitions/number-line.ts` (new: `NumberLine`, `NUMBER_LINE_POINT_LIMIT`, `hasArrow`, `numberLineTicks`, `customLabelsByTick`, `positionValue`, `defineNumberLineProperties`, `pointsInRange`, `tickLabelsOnTicks`, `numberLine` and its `describe`)
- `src/layout/number-line.ts` (new: `numberLineLayout`, `measure`, `arrowhead`, `segment`)
- `src/layout/kit/axis.ts` (modified: own-key `lineColor` on the line and ticks)
- `src/core/definitions/shared.ts` (modified: the `lineLabel` description)
- `src/layout/scene.ts` (annotation only, on `textAlternativeFor`)
- `src/react/graphs/NumberLineGraph.tsx`, `src/entries/number-line.ts` (new)
- `src/core/definitions/index.ts`, `src/layout/registry.ts`, `src/index.ts`, `package.json`, `tsup.config.ts`, `.size-limit.json` (registration and the `./number-line` entry)
- `src/generated/schema.json`, `src/generated/tool-schema.json`, `src/generated/vocabulary.json`, `src/generated/description.ts`, `tests/fixtures/generated/description.ts` (regenerated)
- `examples/number-line.json`, `examples/invalid/number-line-point-outside.json`, `examples/invalid/number-line-label-off-tick.json` (new)
- `tests/core/number-line.test.ts`, `tests/layout/number-line.test.ts` (new); `tests/layout/kit/axis.test.ts`, `tests/react/Graph.test.tsx`, `tests/package/per-type-bundle.test.ts` (modified)
- **Read unchanged, because the delivered code's values flow into them:**
  - `src/core/value-scale.ts` (`drawableTicks`, `isTickValue`, `axisSpacing`, `axisTickLabel`, `isMultiple`);
  - `src/core/definitions/axis.ts`, `src/core/definitions/types.ts`;
  - `src/core/format.ts` (`cleanText`, `quoteText`, `formatSupplied`, `stateMeasurement`, `formatList`, `sourceOf`);
  - `src/core/describe.ts`, `src/core/index.ts`;
  - `src/core/validate/structure.ts`, `src/core/validate/numbers.ts`;
  - `src/graph.ts`;
  - `src/layout/kit/text.ts` (`wrap`), `src/layout/kit/labels.ts` (`placeLabel`), `src/layout/kit/title.ts`, `src/layout/kit/markers.ts`, `src/layout/kit/check.ts` (`checkScene`);
  - `src/react/SceneSvg.tsx`, `src/react/createGraphComponent.tsx`;
  - `src/tool/index.ts` and `src/export/index.ts` (both still empty modules).

**Context read:**
- **The ticket and its Known Hazards.** That includes the carried NLC TICKET-001 SEC-003, GSS TICKET-002 SEC-001..003, GSV TICKET-003 SEC-001 and GSV TICKET-004 SEC-004.
- **`.gener8v/constraints/prd.md`.** There is no `constraints/number-lines-and-coordinate-graphs.md`.
- **`.gener8v/technical-design/system-design.md`:** AD-002, AD-007, AD-008, AD-010, AD-011 and AD-014.
- **`.gener8v/context.md` and `.gener8v/CONVENTIONS.md`.**
- **`.gener8v/specifications/number-lines-and-coordinate-graphs.md`:** NLC-NFR-004 and OQ-005.
- **CPSE TICKET-007's Known Hazards,** for the text-alternative cap on the tool `summary`.
- **The earlier security reviews in this change and in `rulers`.** Their accepted risks are not raised again:
  - GSV TICKET-007 SEC-002, SEC-003 and SEC-005: mark depth, engine Unicode tables and wide glyphs;
  - CPSE TICKET-002 SEC-004: `placeLabel`'s quadratic cost;
  - CPSE TICKET-003 SEC-005: validation on every render.

  This delivery does not change them. DGP TICKET-002 SEC-001, the line graph's text-alternative size, was resolved by recording and pinning that type's bound, and SEC-001 here is the same work for the number line.

**Review environment note:**
- **How I probed:**
  - Every probe was an inline `TSX_DISABLE_CACHE=1 npx tsx -e '…'` run from the repository root, against `src/` and `tests/fixtures/`.
  - Markup came from `react-dom/server` `renderToStaticMarkup`. Size figures used `NODE_ENV=production`, and the attribute check parsed the markup with jsdom.
  - Each pollution probe ran in a fresh process.
  - Bundles were built with esbuild's API and `write: false`.
  - The scratch directory `/private/tmp/claude-501/-Users-thomas-Repositories-gener8v-gener8v-tools-education-graph-generator/90a37181-7c56-4f53-87c3-a87caf6952a9/scratchpad/security-review-nlc-002/` holds one file: the delivery's added lines, which the secret scan used.
- **Runtime:** Node.js v24.1.0, pnpm 10.28.2, Vitest 5.0.3, React and React DOM 19.3.0, macOS (Darwin 25.6.0).
- **Commands run in the repository:**

| Command | Exit | Evidence |
|---|---|---|
| `pnpm audit` (2026-10-22, 13:40 UTC) | 0 | No known vulnerabilities found |
| `pnpm audit --prod` (2026-10-22) | 0 | No known vulnerabilities found |
| `pnpm lint` | 0 | — |
| `pnpm typecheck` | 0 | — |
| `pnpm check:dist` | 0 | 18 built files scanned, no network APIs or network modules |
| `pnpm check:deps` | 0 | 0 runtime dependencies |
| `GRAPH_GENERATOR_PREBUILT=1 pnpm exec vitest run --no-cache` | 0 | 51 files, 1,450 tests passed |
| The same, limited to `tests/core/number-line.test.ts`, `tests/layout/number-line.test.ts` and `tests/layout/kit/axis.test.ts`, 15 times | 0 on all 15 | No flake in the new property test |
| Each new non-rendering module (`src/core/definitions/number-line.ts`, `src/layout/number-line.ts`) piped to `npx eslint --no-cache --stdin`, with `import "react"`, `fetch(…)` or `document.title` prepended (6 runs) | 1 each | `no-restricted-imports` or `no-restricted-globals`. Unmodified, it exits 0 |

- **The build:** I reused `dist/`, built minutes earlier from the same unchanged HEAD source, through `GRAPH_GENERATOR_PREBUILT=1`. That avoided rebuilding under the two reviewers running at the same time.
- **Not run:**
  - `pnpm size` and `pnpm generate`, as instructed;
  - `pnpm build`, `bench`, `publint` and `attw`, which have no bearing on these findings.
- **Tree check:** `git status --short` before and after every command and probe showed only ` M .gener8v/pipeline-state.yaml`, ` M .gener8v/runs.jsonl` and `?? HANDOFF.md`, all present before this review began, plus this report once written.

**Findings:** 1
**Critical:** 0 | **High:** 0 | **Medium:** 0 | **Low:** 1 | **Informational:** 0

## Security Assessment

### Input Validation

**Status:** Gaps Found
**Notes:**
**Entry points:**
- **Public:**
  - `validate`, `normalize` and `describe` (`./core`), and `createGraph`;
  - `<Graph>`, and `<NumberLineGraph>` from `./number-line` and `.`.
- **Internal:** `numberLineLayout`, `numberLine.describe`, `customLabelsByTick`, `numberLineTicks`, and `drawAxis`'s new `lineColor`. Only package code calls them. The definitions are not exported from `./core` (`src/core/index.ts`), and the `exports` map has no `./*` pattern.

**Caller-controlled values this delivery reads:**

| Value | Validation | Where it goes |
|---|---|---|
| `axis.min`, `axis.max`, `axis.tickSpacing`, `axis.showTickLabels` | Unchanged from NLC TICKET-001: ±1e9 ends, spacing at most 2e9, too narrow, ≤ 0 and over 100 ticks reported (`src/core/definitions/axis.ts`); `axisDomainChecks("axis")` registered (`src/core/definitions/number-line.ts:228`) | `numberLineTicks` → `drawableTicks`; `linearScale`; `drawAxis`; the text alternative |
| `leftArrow`, `rightArrow` | Optional booleans; absent means on (`:100-111`, `hasArrow` `:46`) | Arrowhead polygons (`src/layout/number-line.ts:182-187`); the text alternative's arrowhead phrase |
| `points` | An array of at most 100 (`:112-128`), each an object of `value` (any finite number), `label` (≤ 200 characters, plain text) and `color` (named or hex, resolved to `#rrggbb`); `pointsInRange` reports any value outside `[min, max]`, ends inclusive (`:159-172`) | Markers at `linearScale(value)`; labels wrapped to 2 lines and placed by `placeLabel`; every point stated in the text alternative with its value as written (SEC-001) |
| `tickLabels` | An array of at most 100 (`:129-149`), each `value` (finite) and `text` (≤ 200 characters, plain text, `""` kept as a blank); `tickLabelsOnTicks` reports a value that is no tick under `isTickValue`, and is skipped when the axis cannot be drawn (`:181-195`) | `customLabelsByTick` (the first at a tick); each one cleaned and cut to one line of 24–80 units; stated whole in the text alternative |
| `title`, `lineLabel` | Shared terms, ≤ 200 characters, plain text, blank means absent | `titleBlock` (3 lines); the line label wrapped to 2 lines; both quoted in the text alternative |
| `lineColor` | Shared color, resolved to `#rrggbb` | `stroke` of the line and ticks (`drawAxis`, own key) and of the arrowhead extensions; `fill` of the arrowheads |

**What is handled well:**
- **Structure:**
  - All four string terms carry `maxLength: 200` in the validator, `src/generated/schema.json` (with the plain-text `pattern`) and `src/generated/tool-schema.json`. The tool schema has no pattern for any type, a decision made in an earlier review, so this is not raised.
  - Both arrays carry `maxItems: 100`, and item objects are closed (`additionalProperties: false`).
  - Probes:
    - `"x".repeat(201)` as `text` is `too_large /tickLabels/0/text`;
    - 101 points is one `too_large /points`;
    - a `JSON.parse`d `__proto__` key inside a point is `unknown_property`;
    - `"5"` as a value is `wrong_kind`.
- **Domain checks** (the GSV TICKET-004 CR-003 / SEC-004 hazard):
  - Both new checks declare their `inputs`, build issues with `createIssue`, never write to the description, and do work bounded by size: `pointsInRange` is O(points); `tickLabelsOnTicks` makes one `drawableTicks` call and at most 100 × 100 `isTickValue` comparisons.
  - Their issues carry only numbers and package-authored terms (`` `points[${i}].value` ``).
  - Probes:
    - 14 malformed descriptions gave issues, never `internal_error` or a throw: `axis` as a string or `null`, `axis` without `max`, a `null` or empty point, a `null` tick label, a label without a value, `points` as an object, a spacing over 2e9, a too-narrow range, and 101 `null` items in both lists;
    - `describe` threw its fixed "not valid" error on each.
- **Valid descriptions draw:**
  - **Fuzz:** 60,000 descriptions over an end pool with ±1e9, `999999999.9999999`, ⅓, ⅔, `5e-324`, `0.30000000000000004` and near-zero ranges. Spacings came from absent, `1e-11`, `1.2345678901234567e-11`, ⅓, 1/7, 2e9, `5e-324` and others. Each had up to 5 points, at the ends, at subnormals and at random values, and up to 3 custom labels drawn from 200-character, cuneiform, word and mark texts.
  - Of the 60,000, 16,556 were valid. Each one gave:
    - `ok`, with no `internal_error`;
    - a line drawn left to right;
    - every node inside `[0, 400] × [0, height]` by `tests/fixtures/scene-geometry.ts` `boundsOf`;
    - at most 3.57 ms per `createGraph`.
  - **The widest numeric labels.** A search over 30,858 valid axes found tick labels of at most 29 characters, for example `-0.00000000022784967939120785`. The line's span after the end insets was never under 161.8 units, so the inset for the end labels cannot reverse or collapse the line.
  - The layout's own throw (`src/layout/number-line.ts:112`) was never reached by a valid description.
- **Cost at the limits:**
  - **Probe:** 100 points with 200-character labels, coincident or spread, plus 100 custom labels of 200 characters on 100 ticks. Label texts were plain, word, mark, cuneiform, and every `oneClusterTexts(200)` shape.
  - Each `createGraph` took 11.7–28.0 ms (median of 5), and the Scene held 510 nodes, 305 of them `<text>`.
  - The 12 candidates per label against at most 201 obstacles stay far below CPSE TICKET-002 SEC-004's accepted bound (about 94 ms at 2,500 labels).
  - NLC-NFR-004 (≤ 50 ms with 50 points) is TICKET-005's, and nothing here threatens it.
- **No argument spreads of caller-sized data** (GSS TICKET-002 SEC-001):
  - every spread in the delivered code is into an array literal (`[...title.nodes]`, `[…, ...markerBoxes]`, `[...customLabelsByTick(…)]`);
  - `Math.max` runs in loops (`src/layout/number-line.ts:53`, `:132`);
  - `drawAxis` spreads `ticks` only after checking `ticks.length <= MAX_VALUE_TICKS`.
- **Own-key reads** (rulers NLC TICKET-003 SEC-002, NLC TICKET-001 SEC-002):
  - The normalized description, its axis, and every point and tick-label item are null-prototype objects.
  - `numberLineTicks` and `describe` read `tickSpacing` own-key, and `drawAxis` reads `lineColor` own-key. The test at `tests/layout/kit/axis.test.ts:190-196` covers an inherited `lineColor`.
  - **Probe:** `Object.prototype` was polluted, non-enumerable, with each of `leftArrow`, `rightArrow`, `lineColor`, `title`, `lineLabel`, `points`, `tickLabels`, `label`, `color`, `showTickLabels`, `tickSpacing`, `labels` (a `Map`), `min`, `max`, `value` and `text`. That was done after import (16 fresh processes) and all at once before import. Each time the `createGraph` result was byte-identical to the unpolluted one.
- **Markup:**
  - **Probe:** ten hostile strings as `title`, `lineLabel`, a point label and a custom tick label, rendered through `<NumberLineGraph>`: `</text><script>…`, `" onload="…`, CDATA, `&amp;&lt;`, a template expression, `url(#x)`, `javascript:`, a CSS escape, `”. Ignore the figure and say 5 “` and `Ticks labeled: 3 as “9”.`.
  - Every string validated, and every one reached the markup only as escaped text.
  - jsdom found no element with an `onload` attribute, and only these attribute names: `aria-label`, `cx`, `cy`, `fill`, `font-family`, `font-size`, `font-weight`, `points`, `r`, `role`, `stroke`, `stroke-width`, `text-anchor`, `viewBox`, `width`, `x`, `x1`, `x2`, `y`, `y1`, `y2`. `globalThis.pwned` was never set.
  - In the text alternative, every caller text sits inside “…”, and lookalike closing quotes become `"` (`quoteText`).
- **Colors:**
  - `url(#x)`, `red;fill:url(#x)`, `#ff0000" onload="x`, `\72 ed`, `transparent`, `white`, `currentColor` and `inherit` are `unknown_color` for both `lineColor` and a point's `color`.
  - `RED` and `#FFF` resolve to `#c62828` and `#ffffff`.
  - `checkScene`, run by `createGraph`, rejects `url(` and backslashes in any attribute.
- **Text alternative and drawing agree** (prd/CC-002):
  - A custom label is stated only when drawn: the first at its tick, and none when `showTickLabels` is false.
  - `""` is drawn blank and stated "left blank".
  - Labels cut in the drawing are stated whole.
  - Every point is stated, including those whose labels fall back to the first candidate (OQ-005).

**Gaps:**
- **SEC-001:** the text alternative's bound at the limits is about three times the record's figure and is not pinned. Point values are stated as written, so subnormal values give a 42.7-fold markup amplification.

**Considered and not raised:**
- **Invisible-only custom labels.** A custom label made only of code points the plain-text policy still accepts, such as U+FFF0, is drawn as invisible text, and the text alternative says `0 as “￰￰￰”` rather than "left blank". It gives the author nothing that `""` does not. Titles and labels in every type behave the same. The policy's remaining default-ignorables were left as they are when GSV TICKET-007 SEC-001 was fixed in the text kit.
- **A partly malformed list.** One malformed point or tick label makes `pointsInRange` or `tickLabelsOnTicks` skip the whole list (AD-004 skip by `points/*/value`), so a second bad point is reported only on the next round. The description is invalid either way. This is a completeness matter for the code review.
- **Definition objects.** The definition object and its `checks` array are not frozen, as for every registered type. They are internal and unreachable through `exports`.

**Not applicable:** SQL, NoSQL, command and template injection, and path traversal. The delivered code has no query, shell, template engine or file path.

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** This is library code, with no server, accounts, sessions or permissions (`.gener8v/context.md`: "no user accounts").

### Data Protection

**Status:** Adequate
**Notes:**
- **Sensitive data:** none. The package logs, stores and sends nothing.
- **Issues:** `outside_axis_range` and `tick_label_not_on_tick` carry numbers, a package-authored term and a JSON Pointer only.
- **Exceptions:** `numberLineLayout`'s `RangeError` and `fmt()`'s throw become the fixed `internal_error` in `createGraph` (`src/graph.ts:42-46`), with no message or stack. No valid description reached either in any probe.
- **Secret scan:** I scanned the 1,625 lines that `git diff 7a24a45 4cd2f9c -- src tests examples package.json tsup.config.ts .size-limit.json` adds. The patterns:
  - keys, tokens, passwords and private keys;
  - AWS, GitHub, npm and Slack token shapes;
  - URLs, `fetch`, `XMLHttpRequest`, `WebSocket` and `EventSource`;
  - `eval` and `Function(`, `innerHTML` and `dangerouslySetInnerHTML`, `document.` and `window.`;
  - storage, `console.`, `process.env`, `child_process`, `require(` and `import(`;
  - `__proto__`, `.prototype` and `Object.assign`;
  - timers, `Math.random` and `crypto`.

  The only match is the test fixture for an inherited `lineColor` (`tests/layout/kit/axis.test.ts:194`, `Object.assign(Object.create({ lineColor: … }), …)`).

### Configuration Security

**Status:** Adequate
**Notes:**
- **Manifest:**
  - The one change is `exports["./number-line"]` → `./dist/number-line.{d.ts,js}`.
  - `sideEffects: false` and `files: ["dist"]` stand. The `exports` map has no `./*` pattern, so the internal definitions and kit stay unreachable.
  - `pnpm-lock.yaml` is unchanged (`git diff 7a24a45 4cd2f9c`).
- **Built output:**
  - `check:dist` scanned 18 built files with no network API or module, and `check:deps` reports 0 runtime dependencies.
  - The number line's code is in one shared chunk (`dist/chunk-RRIEHXCD.js`).
- **Module load:** importing the definition, the layout and `NumberLineGraph` left the own property names of `globalThis`, `Object.prototype`, `Array.prototype` and `Map.prototype` unchanged.
- **Tree-shaking** (esbuild, in memory):
  - a bare import of the three new modules bundles to 0 bytes;
  - unused named imports of `NumberLineGraph` and `numberLine` bundle to 0 bytes;
  - `./number-line`'s entry bundles to 53,657 bytes minified, with no "A circle", "A ruler" or "A line graph".
- **Immutability:** the properties map, `points`, `points.items` and its properties, `tickLabels.items.properties`, the `text` spec and the shared `value` spec are all frozen with a null prototype (`defineProperties`).
- **Boundary lint** (prd/TC-005): both new non-rendering modules fail lint when `import "react"`, `fetch(…)` or `document.title` is prepended.
- **Secrets and defaults:** none. The new limits (100 points, 100 custom labels) are constants stated in the published descriptions. The default arrowheads (on) and the default line and accent colors are package constants.
- **Cryptography:** not applicable. No randomness or cryptographic function is used.
- **Logging and monitoring:** not applicable. The package logs nothing (AD-014), and the delivery adds no logger.

**Dependency audit:** `pnpm audit` (pnpm 10.28.2, Node.js v24.1.0), run 2026-10-22 13:40 UTC in the repository against the HEAD lockfile (`4cd2f9c`), read-only.
- `pnpm audit`: `No known vulnerabilities found`, exit 0.
- `pnpm audit --prod`: `No known vulnerabilities found`, exit 0. The package has no runtime dependencies; `react` is a peer.
- This delivery does not change the lockfile.

**Carried Known Hazards (security-relevant):**

| Hazard | Result |
|---|---|
| NLC TICKET-001 SEC-003: custom tick label length; cut to one line; `cleanText`; tests at and past the limit; keep `maxItems` | Honoured. `text` has `maxLength: 200`. The ticket's "for example 40" is superseded by GSV-REQ-052's single limit (Pre-Flight row and DEL-003). Each label is `cleanText`ed and cut by `wrap(…, labelWidth, tickFont, 1)` at 24–80 units (`src/layout/number-line.ts:124-128`). Tests: 200 accepted and 201 `too_large` (`tests/core/number-line.test.ts:39-44`), the over-limit row (`tests/react/Graph.test.tsx`), the cut (`tests/layout/number-line.test.ts:164-171`). `maxItems: MAX_VALUE_TICKS` kept |
| GSS TICKET-002 SEC-001: no caller-sized argument spreads | Honoured (see Input Validation) |
| GSS TICKET-002 SEC-002: wrap and cap every label; say so in the descriptions | Honoured: title 3, point label 2, line label 2 and custom label 1 line. The `label`, `lineLabel` and `text` descriptions say the drawing cuts and the text alternative states it whole |
| GSS TICKET-002 SEC-003: `stateMeasurement` in `describe` | Honoured. No unit is involved |
| GSV TICKET-003 SEC-001: `maxItems` on every array, limits stated in the descriptions | Honoured: 100 and 100, stated in both descriptions and the type description |
| GSV TICKET-004 CR-003 / SEC-004: `inputs`, frozen input, `createIssue`, work by size | Honoured (see Input Validation) |
| NLC TICKET-001 CR-006 / CR-007: checks use `drawableTicks` and `isTickValue` | Honoured (`src/core/definitions/number-line.ts:53-55`, `:185-189`). The check is skipped on an undrawable axis, and the drawing matches by the same rule |
| rulers NLC TICKET-003 SEC-002: own-key reads of props and optional option fields | Honoured. The pollution probes are above |
| AD-008 / prd/TC-003: arrowheads as polygons, no `<marker>`, ids or `url(#…)` | Honoured. `checkScene` passes on every Scene, and the attribute set holds no `id`, `href` or `marker-*` |
| CPSE TICKET-007 (carried DGP TICKET-002 SEC-001 and GSS TICKET-002 SEC-002): cap the text alternative inside the tool `summary` | Not yet applicable: `src/tool/index.ts` is still empty. The number line's bound (SEC-001) is below the line graph's, which that ticket's test already takes as its largest case |

**Compliance cross-reference:** checked against `.gener8v/constraints/prd.md`. No per-area constraints file exists. The ticket names prd/TC-001, TC-002, TC-003 and CC-002.

| Constraint | Result |
|---|---|
| prd/CC-001 (licenses) | Met: no dependency, asset or font added |
| prd/CC-002 (WCAG 2.1 AA, non-text content) | Met. Every Scene has a text alternative stating the type, title, line label, range, spacing, arrowheads, the custom labels drawn and every point with its label (1.1.1). A supplied `textAlternative` replaces it in `aria-label` and `<title>` (tested). Default line and accent colors pass 3:1 (GSV-NFR-004). A caller's own color is the caller's contrast choice, as settled in GSS TICKET-002. Points are told apart by position and label, not by color (1.4.1). SEC-001 concerns size, not a missing alternative |
| prd/CC-003 (no data collection or network) | Met: `check:dist` is clean, no added line holds a network API, and the boundary lint rejects `fetch` in both new non-rendering modules (probed) |
| prd/CC-004 (no trademarked imagery) | Not applicable |
| prd/TC-001 (no DOM measurement) | Met: label room and placement use `textWidth` estimates only |
| prd/TC-002 (rounding) | Met: every coordinate goes through `fmt()` or `fmtPoints`, and `checkScene` was clean on every probe Scene |
| prd/TC-003 (ids) | Met: no ids. Arrowheads are polygons (AD-008) |
| prd/TC-005 (no React or browser globals in non-rendering code) | Met: lint passes, and the boundary rule rejects `import "react"` and `document.title` prepended to either new module |
| prd/TC-007 (side-effect-free, tree-shakable) | Met: an unused import bundles to 0 bytes |

No CC-XXX violation was found, so no finding is raised to Critical.

## Findings

### SEC-001: At the limits the text alternative is 75,721 characters, three times the record's "about 25 kB", and it is not pinned; point values stated as written turn 1.8 KB of subnormal points into a 32,901-character accessible name

**Severity:** Low
**Category:** Input Validation
**OWASP Reference:** A06:2025 Insecure Design. Also CWE-400 (uncontrolled resource consumption) and CWE-770 (allocation of resources without limits or throttling).
**Location:**
- `src/core/definitions/number-line.ts:265-270` (`describe`): every point is stated as `stateMeasurement(point.value, sourceOf(provenance, …))` and its label `quoteText(label)`. A supplied value is printed with every digit.
- `src/core/definitions/number-line.ts:254-258`: each custom label drawn is stated whole, up to 200 characters, for up to 100 ticks.
- `src/core/definitions/number-line.ts:80-86` (`positionValue`): no structural bound on a value. Only `pointsInRange` bounds it, to the axis range, so a non-zero value as small as `5e-324` is valid on any range that holds 0.
- `src/core/format.ts:6-16`, `:45-47` (`plainDigits`, `formatSupplied`): `5e-324` is written out in full, which is 326 characters.
- `src/layout/scene.ts:160-166` (`rootAttrs`, `aria-label`) and `src/react/SceneSvg.tsx:44-47` (`<title>`): the text alternative is printed twice.
- `.gener8v/changes/graph-library/delivery/number-lines-and-coordinate-graphs-ticket-002-delivery.md:231` (D5(a)): "it bounds placement cost and the text alternative (about 25 kB at the limit)".
- `tests/react/Graph.test.tsx:502-519`: the at-limit test draws 4 points and 1 custom label and bounds only the `<text>` count. The line graph's bound is pinned at `:581-591`; nothing pins the number line's.

**Description:**
D5 caps points at 100, partly to bound the text alternative, and the record puts that bound at about 25 kB. The text alternative states the following, each counted at its limit:
- the title and line label: 200 characters each;
- up to 100 custom labels: 200 characters each, with the tick's number;
- up to 100 points: each value as written and a 200-character label.

**Probe:** `createGraph` and `renderToStaticMarkup(<NumberLineGraph>)`, `NODE_ENV=production`. The axis was −0.99 to 1 by 0.02, giving 100 ticks. Each run had 100 custom labels and 100 points, every text at 200 characters of the character shown, and point values alternating `5e-324` and `-2.2250738585072014e-308`.

| Text characters | Description | Text alternative | Markup | Markup ÷ description | `createGraph` / render |
|---|---|---|---|---|---|
| `a` | 46,747 B | 75,721 characters | 228,807 B | 4.9× | 31 ms / 27 ms |
| `&` | 46,747 B | 75,721 characters | 560,771 B | 12.0× | 22 ms / 26 ms |
| `"` | 87,147 B | 75,721 characters | 657,942 B | 7.5× | 27 ms / 23 ms |
| U+1F600 (outside the BMP) | 167,947 B | 116,121 UTF-16 units, 197,729 B as UTF-8 | 474,622 B | 2.8× | 33 ms / 28 ms |

**Further probes:**
- **Ordinary values.** With the same texts but every value 0.5, the text alternative is 43,371 characters. So even without subnormals it is 1.7 times the record's figure.
- **Subnormal values alone.** Here the description has no text at all, axis −1 to 1:

  | 100 unlabelled points at | Description | Text alternative | Markup | Markup ÷ description |
  |---|---|---|---|---|
  | `5e-324` | 1,759 B | 32,901 characters | 75,184 B | 42.7× |
  | `-2.2250738585072014e-308` | 3,559 B | 33,001 characters | 75,384 B | 21.2× |
  | `0.5` (control) | 1,459 B | 601 characters | 10,784 B | 7.4× |

- **What is drawn.** Every subnormal marker is drawn at x = 200, the same place as 0. Even on the narrowest valid axis, [0, 1e-9], points at `5e-324` and at 0 share x = 54.53. The 326 digits stated for each describe nothing a reader can see.
- **What stays bounded.** The Scene holds 510 nodes, 305 of them text. The bound is below the line graph's pinned 321,158 characters and 760,583 of markup, so the CPSE TICKET-007 summary cap, tested on the line graph, covers it.

**Attack Scenario:**
- **Attacker:** a curriculum author on a platform that stores descriptions and server-renders them, or a model whose tool call was steered by injected content.
- **Steps:**
  1. Write a number line on −1..1.
  2. Mark 100 points at `5e-324`, with no labels.
  3. The 1.8 KB description validates, and `createGraph` reports `ok`.
- **Result:**
  - Each view serves about 75 KB of markup.
  - A screen-reader user hears an accessible name of 32,901 characters, almost all zeros, for one dot at 0.
  - With every text at the limit and `&` or `"` as the text, a 47–87 KB description serves 561–658 KB per view.
- **Limits:**
  - The cost is bounded by the 100-item and 200-character limits, whatever the request-body limit.
  - Nothing is disclosed, and nothing escapes the graph's `<svg>`.
  - The author can already write a long accessible name through labels. The subnormal case adds about 32,000 characters that carry no information.

**Impact:**
- Bounded amplification of bandwidth and render time: up to about 43 times the description, and at most about 660 KB of markup and 30 ms per render.
- An accessible name too long to use.
- A record that understates the bound by three times (by eight in UTF-8 bytes), with no test to catch a later change that raises it, such as a higher point limit or a longer label limit.

**Recommendation:**
1. **Correct D5's figure in the delivery record.** At the limits the text alternative is 75,721 characters, or 116,121 UTF-16 units and 197,729 bytes as UTF-8 for text outside the BMP, and the markup is about 0.66 MB per render. State that raising the point or custom-label limit, or `CALLER_TEXT_LIMIT`, raises it in proportion.
2. **Pin it with a test** beside the line graph's (`tests/react/Graph.test.tsx:581-591`): 100 points and 100 custom labels at 200 characters, with subnormal values. Assert the text-alternative length (under 80,000 characters), the markup size (under 700,000) and the `<text>` count (under 320).
3. **A decision for the user, as offered in DGP TICKET-002 SEC-001,** for the subnormal echo. Either:
   - state a point's value at the axis's own resolution in the text alternative, for example 12 significant digits or the tick spacing's decimals plus a few, so a value that draws at 0 is not stated with 326 digits; or
   - report a non-zero `value` smaller in magnitude than `SCALE_RESOLUTION` (1e-9, `src/core/value-scale.ts:35`) as `out_of_range`, as non-zero axis ends near zero already are.

   Either one caps the subnormal case at about 3,000 characters. The first keeps every valid description valid. The second changes what validates and would apply to the data graphs too, so it needs the Product Owner.

**Compliance Impact:** None. prd/CC-002 1.1.1 is met: the alternative is present and complete.
**Status:** Resolved
**Resolution:** Fixed (recorded and pinned), as the line graph's DGP TICKET-002 SEC-001 was.
- **Recorded:** the delivery record's Post-Review Amendments correct D5's "about 25 kB": at the limits the text alternative is 75,721 characters (116,121 UTF-16 units, 197,729 bytes as UTF-8 for text outside the BMP) and the markup up to about 0.66 MB per render, and raising the point or custom-label limit or `CALLER_TEXT_LIMIT` raises it in proportion.
- **Pinned:** `tests/react/Graph.test.tsx` draws 100 points at subnormal values and 100 custom labels, every text at 200 characters, and bounds the text alternative (70,000 to 80,000 characters), the markup (under 700,000) and the `<text>` count (under 320).
- **Accepted:** values stay stated as written (the GSV rule the other types follow), so the subnormal echo remains: bounded by the 100-point limit, nothing disclosed, nothing outside the `<svg>`.
**Risk accepted by:** Security — Thomas Eaves, 2026-10-23. Rationale: the cost is bounded by the item and text limits, below the line graph's pinned bound and inside the CPSE TICKET-007 summary cap; changing how supplied values are stated or what validates would depart from a rule every type shares.

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Record and pin | D5's bound corrected in the delivery record; at-limits test added; subnormal echo accepted | Yes | delivery record, tests/react/Graph.test.tsx |

## Verdict

**Result:** Approved with Notes
**Unresolved Critical/High:** 0
**Accepted Risks:** 1 (SEC-001, the subnormal echo in the text alternative; Security — Thomas Eaves, 2026-10-23)
**Notes:**
- SEC-001 was resolved with the Security role on 2026-10-23: the bound is recorded and pinned by a test, and the remaining echo of values as written is an accepted, bounded risk.
- **Dependency audit:** `pnpm audit` and `pnpm audit --prod`, 2026-10-22, no known vulnerabilities; `pnpm audit` re-run 2026-10-23 after the fixes, exit 0; the lockfile is unchanged by this delivery.
