# TICKET-003: Deliver the x,y coordinate graph type — Security Review

## Summary

This review covers the delivery of `graph-library/number-lines-and-coordinate-graphs/TICKET-003` at HEAD of branch `ticket/graph-library-nlc-003`, the delivery commit `a108175`. No review has resolved anything on this ticket yet, so the code reviewed is the code as delivered. The `security-reviewer` agent ran the findings phase in a fresh context on 2026-10-27, in parallel with the code and quality reviews.

The delivery adds a new public attack surface: `validate`, `normalize`, `describe` and `createGraph` from `./core`, plus `<Graph>` and the new `<XyGraph>` (`./xy-graph`), now accept a caller- or model-written x,y graph. The caller controls:
- two axis ranges, each with its tick spacing and `showTickLabels`;
- `showGrid`;
- up to 1,000 points, each with `x`, `y`, a label and a color;
- up to 1,000 segments, each with two ends, a label and a color;
- a title and two axis labels.

Probed in memory, it holds up well against injection, crashes and pollution:
- **Bounds.** Every caller string is bounded at 200 characters by the validator and by both published schemas. Both lists have `maxItems: 1000` and closed item objects.
- **Drawn text.** Every drawn caller text goes through `cleanText` and is wrapped with a line cap: the title through `titleBlock` (3 lines), point and segment labels through `textBlock` (2 lines), and axis labels through `axisLabelLines`.
- **Spreads.** No caller-sized array is spread into arguments.
- **Fuzz.** 70,000 generated descriptions with extreme axes, spacings, coordinates and texts gave 21,845 valid ones. Every valid one rendered with no `internal_error`, no non-finite coordinate, and no node off the drawing, at most 5.2 ms each.
- **Pollution.** Polluting `Object.prototype` with 16 keys changed nothing. This held for enumerable and non-enumerable keys, set before or after the modules load.
- **Markup.** Ten hostile strings, in each of the five text terms, reached the markup only as escaped text. The markup holds only `svg`, `title`, `text`, `line` and `circle`, with fixed attribute names. Seven hostile colors were refused as `unknown_color`.
- **Dependencies.** `pnpm audit` and `pnpm audit --prod` are clean. The lockfile and dependencies are unchanged.

The weak point is size, as DEL-007 anticipated. It is larger than DEL-007 states, though:
- **SEC-001 (Medium):** DEL-007 calls 712,557 characters (2.24 MB of markup) "the largest description".
  - The 10,000-value limit allows about 2.0 million characters of text alternative and 8.7 MB of markup per render. That is 2.8 times DEL-007's figure for the text and 3.9 times for the markup. With characters outside the BMP it is 3.06 MB as UTF-8.
  - Coordinates are stated as written, so a 126 KB description of unlabelled subnormal points and segments yields a 1.79-million-character accessible name, almost all zeros, and 3.7 MB of markup (29.7 times the input).
  - The number line's accepted risk (NLC TICKET-002 SEC-001, 75,721 characters) rested on two premises: staying below the line graph's pinned 321,158 characters, and staying inside the CPSE TICKET-007 summary cap. This type breaks both.
  - The delivered test pins a case that is not the worst.
- **SEC-002 (Low):** CPSE TICKET-007's Known Hazards name the line graph (321,158 characters) as the largest valid description for testing the tool `summary` cap. The x,y graph is now about six times that. A cap test written from the hazard as it stands would miss the largest case.
- **SEC-003 (Informational):** label placement, under the accepted CPSE TICKET-002 SEC-004 risk, reaches about 0.4–0.5 s per `createGraph` on a ~69 KB description built so every label is blocked. Point labels have 12 candidates where that review advised at most 8. The delivered timing test is not adversarial, and its 5 s bound is about ten times what it measures.

**Reviewer:** `security-reviewer` agent, fresh context (findings phase only, 2026-10-27)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/number-lines-and-coordinate-graphs-ticket-003-delivery.md`. I read the Pre-Flight Reconciliation, the Implementation Plan, DEL-001..DEL-008, the Deviations, the Notes and the Post-Review Amendments (none).

**Files Reviewed:**
- `src/core/definitions/xy-graph.ts` (new: `XyGraph`, `XY_ELEMENT_LIMIT`, `PLANE_MIN_RATIO`/`PLANE_MAX_RATIO`, `planeShape`, `quadrantCount`, `defineXyGraphProperties`, `offAxis`, `pointsInRange`, `segmentsInRange`, `segmentsHaveLength`, `xyGraph` and its `describe`)
- `src/layout/xy-graph.ts` (new: `planeAxes`, `xyGraphLayout`, `MAX_PLOT_HEIGHT`, `MIN_PLOT_WIDTH`, `LABEL_MAX_LINES`, `widest`, `line`)
- `src/core/definitions/shared.ts` (modified: `POINTS_DESCRIPTION`)
- `src/core/definitions/number-line.ts` (modified: the `points` description only)
- `src/react/graphs/XyGraph.tsx`, `src/entries/xy-graph.ts` (new)
- `src/core/definitions/index.ts`, `src/layout/registry.ts`, `src/index.ts`, `package.json`, `tsup.config.ts`, `.size-limit.json` (registration and the `./xy-graph` entry)
- `src/generated/description.ts`, `src/generated/schema.json`, `src/generated/tool-schema.json`, `src/generated/vocabulary.json` (regenerated; the x,y graph's bounds checked in both schemas)
- `examples/xy-graph.json`, `examples/invalid/xy-graph-outside-range.json`, `examples/invalid/xy-graph-degenerate-segment.json` (new)
- `tests/core/xy-graph.test.ts`, `tests/layout/xy-graph.test.ts` (new); `tests/react/Graph.test.tsx`, `tests/package/per-type-bundle.test.ts`, `tests/core/definitions.test.ts` (modified)
- **Read unchanged, because the delivered code's values flow into them:**
  - `src/core/definitions/axis.ts` (`axisProperties`, `axisDomainChecks`) and `src/core/value-scale.ts` (`VALUE_LIMIT`, `SCALE_RESOLUTION`, `MAX_VALUE_TICKS`);
  - `src/core/format.ts` (`cleanText`, `quoteText`, `formatList`, `stateMeasurement`, `formatSupplied`, `plainDigits`);
  - `src/core/style.ts` (`resolveColor`);
  - `src/core/validate/structure.ts` (`DESCRIPTION_VALUE_LIMIT`, number and string checks);
  - `src/graph.ts` (`createGraphWith`);
  - `src/layout/kit/labels.ts` (`placeLabel`, `segmentCrossesBox`) and `src/layout/kit/title.ts` (`textBlock`, `titleBlock`);
  - `src/layout/scene.ts` (`aria-label`);
  - `src/react/SceneSvg.tsx` (`<title>`), `src/react/createGraphComponent.tsx` and `src/react/Placeholder.tsx`.

**Context read:**
- **The ticket and its Known Hazards:** caller text, domain checks, caller-sized arrays, `maxItems`, the definition contract and `textAlternative` not being a term.
- **`.gener8v/constraints/prd.md`** (CC-001..CC-004). There is no `constraints/number-lines-and-coordinate-graphs.md`.
- **`.gener8v/technical-design/system-design.md`** and **`.gener8v/context.md`.** The package is a library with no server, database, accounts or network calls, and it may be server-rendered.
- **`.gener8v/CONVENTIONS.md`.**
- **CPSE TICKET-007's Known Hazards,** for the tool `summary` cap.
- **The earlier security reviews in this change.** Their accepted risks are not raised again except where this type invalidates the stated rationale (SEC-001):
  - NLC TICKET-002 SEC-001: the subnormal echo, 75,721 characters;
  - CPSE TICKET-002 SEC-004: `placeLabel` quadratic cost;
  - CPSE TICKET-003 SEC-005: validation on every render;
  - GSV TICKET-002 SEC-002: no cap on the issue list, by Product Owner decision;
  - GSS TICKET-002 and DGP TICKET-003: caller colors are the caller's contrast choice.

**Findings:** 3
**Critical:** 0 | **High:** 0 | **Medium:** 1 | **Low:** 1 | **Informational:** 1

## Security Assessment

### Input Validation

**Status:** Gaps Found
**Notes:**

**Entry points.** These are `createGraph`, `validate`, `normalize` and `describe` from `./core`, and the `description` prop of `<Graph>` and `<XyGraph>`. All four core functions go through `validateWith`, and the components call `createGraphWith`.

**Structure.**
- Every number must be finite (`src/core/validate/structure.ts:118`). Axis ends are bounded to ±1,000,000,000 (`src/core/definitions/axis.ts:28-58`).
- `x` and `y` have no structural bound (`src/core/definitions/xy-graph.ts:85-98`). Only the domain checks bound them, to the axis range, as for the number line's `value`. So a subnormal such as `5e-324` is valid on any range that holds 0. That is the root of SEC-001.
- Every string term carries `maxLength: 200`, through the nested shared `label`, `title`, `xAxisLabel` and `yAxisLabel`.
- `points` and `segments` carry `maxItems: 1000`, and the whole description is capped at 10,000 values.
- The generated `schema.json` and `tool-schema.json` carry the same `maxItems` and `maxLength`, with `additionalProperties: false` on the items.

**Domain checks** (the ticket's carried GSV TICKET-004 CR-003 and SEC-004 hazard):
- `pointsInRange`, `segmentsInRange` and `segmentsHaveLength` (`src/core/definitions/xy-graph.ts:171-211`) declare their `inputs`.
- They only read the frozen description and build every issue with `createIssue`.
- Each is O(elements), with no enumeration of ticks. Axis checks go through `axisDomainChecks`, whose work is constant.

**Issue output.** 1,000 points and 857 segments with every coordinate off a −5..5 axis give 6,285 issues: 1.2 MB of issue JSON from a 50 KB description (24 times the input), in 25 ms. Values in messages are in exponent form (`1e+300`), at most 132 characters. The placeholder lists a capped number. This falls within the accepted no-cap decision (GSV TICKET-002 SEC-002), so it is not raised.

**Caller-sized arrays** (GSS TICKET-002 SEC-001 hazard). Every spread in the two new modules is an object spread or a fixed-length array:
- `src/layout/xy-graph.ts:203-204`, `:292`, `:304`;
- `src/core/definitions/xy-graph.ts:136`, `:159`, `:173`, `:188`, `:238`.

Widths are taken in loops: `widest` at `:100-104`, the y-label reach at `:183`, and `textBlock`. Scene nodes are pushed one at a time.

**Caller text.** Text is drawn only through `titleBlock`, `textBlock` → `textLines`, and `axisLabelLines` → `drawLeftAxisLabel`/`drawBottomAxisLabel`, each with a line cap. `describe` passes every caller string through `quoteText` after `cleanText`, and treats a blank title or label as absent.

**XSS and markup injection.** No vector found:
- Text reaches the markup only as React-escaped text or attribute values.
- The tokenised markup of 100 hostile renders contained only the elements `svg`, `title`, `text`, `line` and `circle`. Its attributes were `aria-label`, `role`, `viewBox`, `width`, `x`/`y`, `x1`..`y2`, `cx`/`cy`/`r`, `fill`, `stroke`, `stroke-width`, `font-*`, `text-anchor` and `transform`. There is no event handler, `href` or `style`.
- Colors go through `resolveColor`, which accepts only a name from a fixed list or `#rgb`/`#rrggbb`. `url(...)`, `expression(...)`, `currentColor`, `transparent`, `#12345g` and an attribute break-out were all refused as `unknown_color`.

**Prototype pollution.** 16 keys were set on `Object.prototype`: `points`, `segments`, `showGrid`, `title`, `xAxisLabel`, `yAxisLabel`, `label`, `color`, `tickSpacing`, `showTickLabels`, `from`, `to`, `x`, `y`, `min` and `max`. Whether the keys were enumerable or not, set before or after the modules load, the Scene and markup were byte-identical to the clean run. The optional `tickSpacing` is read own-key (`src/layout/xy-graph.ts:150-151`, `src/core/definitions/xy-graph.ts:253`).

**Robustness.** The fuzz ran in two passes:
- 30,000 descriptions with seed 12345, mixing in hidden-character texts;
- 40,000 with seed 987654.

Axis ends were drawn from {0, ±1, ±10, ±1e9, ±999999999.5, ±1e-9, 2e-9, ±0.5, ±1e6, 123456789.123, 5e-324, …}, including near-degenerate widths. Spacings included `0.1 * 3` and 2e9. Coordinates included the range ends and subnormals. Texts included 200 `W`s and 100 emoji.

Of 70,000 descriptions, 21,845 were valid. Every valid one gave a finite scene height, all node coordinates finite and inside the drawing, and a text alternative free of `NaN`, `Infinity` and `undefined`. None raised `internal_error`. The slowest took 5.2 ms. `planeShape` cannot divide by zero, because `axisTooNarrow` rejects any span under 1e-9 first.

**Gaps:**
- The size of the generated text alternative and markup at the limits (SEC-001).
- The stale size premise in CPSE TICKET-007's hazard (SEC-002).
- Placement cost (SEC-003, within an accepted risk).

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** The package is a library with no accounts, sessions, tokens, server or network calls (`.gener8v/context.md`). Whoever writes a description, whether a curriculum author or a model through the future tool, is trusted only as far as the validator's bounds. Any access control belongs to the consuming application.

### Data Protection

**Status:** Adequate
**Notes:**
- The delivered code collects, stores, transmits and logs nothing. There is no `console`, `fetch`, storage API, `eval`, `new Function` or `dangerouslySetInnerHTML` in the new files.
- Caller text appears only in the Scene, the text alternative, and issue messages returned to the caller.
- When a layout throws, `createGraph` returns a bare `internal_error` with no message or stack (`src/graph.ts:42-46`).
- No PII is in scope.

### Configuration Security

**Status:** Adequate
**Notes:**
- No secrets, credentials, keys or environment reads.
- The `./xy-graph` export in `package.json` points only into `dist/`, and the `tsup.config.ts` entry is the new entry file.
- No dependency was added or changed, and `pnpm-lock.yaml` is untouched by `a108175`.
- Security headers and CORS are not applicable to a component library.

**Dependency audit:** run 2026-10-27T17:14Z with pnpm 10.28.2:
- `pnpm audit`: "No known vulnerabilities found", exit 0.
- `pnpm audit --prod`: "No known vulnerabilities found", exit 0.

**Cryptography:** not applicable. The delivered code uses no cryptographic or random functions.

**Logging and monitoring:** not applicable. A library with no logging. Rejections are returned to the caller as structured issues, not logged.

**Compliance cross-reference:** checked against `.gener8v/constraints/prd.md`. No per-area constraints file exists.

| Constraint | Result |
|---|---|
| prd/CC-001 (licenses of dependencies and assets) | Met: no dependency or asset added |
| prd/CC-002 (WCAG 2.1 AA, non-text content) | **1.1.1: met.** Every Scene carries the generated text alternative: type, title, both ranges and spacings, quadrants, grid, axis labels, hidden tick labels, unequal units, and every point and segment with its label. A supplied `textAlternative` replaces it. Its size is SEC-001, not a 1.1.1 violation.<br>**1.4.11: met by the defaults.** The accent and grid colors come from the default palette, which is checked at 3:1 or better. A caller's own hex color is the caller's contrast choice, as settled in GSS TICKET-002.<br>**1.4.1: met.** Points and segments are told apart by position and labels, not color alone. |
| prd/CC-003 (no data collected or transmitted) | Met: no network, storage or telemetry in the new code |
| prd/CC-004 (no trademarked imagery) | Not applicable: no images |

No CC-XXX violation was found, so no finding is raised to Critical.

## Findings

### SEC-001: The largest x,y description gives a 2.0-million-character text alternative and 8.7 MB of markup per render, 2.8 and 3.9 times DEL-007's "largest"; unlabelled subnormal coordinates make 126 KB into a 1.79-million-character accessible name

**Severity:** Medium
**Category:** Input Validation
**OWASP Reference:** A06:2025 Insecure Design. Also CWE-400 (uncontrolled resource consumption) and CWE-770 (allocation of resources without limits or throttling).
**Location:**
- `src/core/definitions/xy-graph.ts:85-98` (`coordinates`): no structural bound on `x` or `y`. Only `pointsInRange` and `segmentsInRange` bound them, to the axis range (`:154-197`), so `5e-324` and `-2.2250738585072014e-308` are valid on any range holding 0.
- `src/core/definitions/xy-graph.ts:249-282` (`describe`): every coordinate is stated through `stateMeasurement(value, sourceOf(...))`, at `:250` and `:257`. Each point's and segment's label is stated in full, at `:258`, `:273` and `:277`.
- `src/core/format.ts:6`, `:45` (`plainDigits`, `formatSupplied`): a supplied value is written out with every digit. `5e-324` becomes 326 characters.
- `src/core/definitions/xy-graph.ts:49` (`XY_ELEMENT_LIMIT = 1000`): 10 times the number line's 100 points, two coordinates per point and four per segment.
- `src/layout/scene.ts:163` (`aria-label`) and `src/react/SceneSvg.tsx:46` (`<title>`): the text alternative is printed twice.
- `.gener8v/changes/graph-library/delivery/number-lines-and-coordinate-graphs-ticket-003-delivery.md:227-232` (DEL-007): "the text alternative is about 713,000 characters, and the markup is about 2.24 MB".
- `tests/react/Graph.test.tsx:666-686`: pins only DEL-007's case. That case has subnormal `x` on points but whole-number `y` and segment ends, and labels of `a`. It bounds the text alternative under 800,000 characters and the markup under 2,500,000.

**Description:**
DEL-007 measures one description and calls it "the largest". The 10,000-value limit lets a caller spend values on what costs most per value:
- coordinates with long written forms, at about 326 characters each and 2 or 4 per element;
- labels of characters that escape long in markup: `&` becomes `&amp;`, and `"` becomes `&quot;`.

**Probe:** `createGraph` and `renderToStaticMarkup(<XyGraph>)`, `NODE_ENV=production`, Node via `tsx`, 2026-10-27. Axes were −10..10. "Subnormal" means coordinates alternating `5e-324` and `-2.2250738585072014e-308`.

| Case | Description | Text alternative | Markup | Markup ÷ description | `createGraph` / render |
|---|---|---|---|---|---|
| DEL-007's pinned case (1,000 points + 700 segments, labels `a`) | 420,270 B | 712,557 characters | 2,256,508 B | 5.4× | 227 ms / 215 ms |
| Unlabelled, every coordinate subnormal (1,000 points + 857 segments) | 126,087 B | 1,794,693 characters | 3,741,445 B | 29.7× | 23 ms / 22 ms |
| Unlabelled, every coordinate subnormal (1,000 + 950) | 135,201 B | 1,917,918 characters | 3,996,730 B | 29.6× | 21 ms / 25 ms |
| Every coordinate subnormal, every text 200 × `a` (1,000 + 740) | 482,404 B | 2,007,470 characters | 4,865,719 B | 10.1× | 403 ms / 364 ms |
| Same, texts of `&` | 482,404 B | 2,007,470 characters | 7,792,599 B | 16.2× | 347 ms / 355 ms |
| Same, texts of `"` | 831,004 B | 2,007,470 characters | 8,736,209 B | 10.5× | 394 ms / 421 ms |
| Same, texts of U+1F600 (outside the BMP) | 831,004 B | 2,356,070 UTF-16 units, 3,060,242 B as UTF-8 | 7,007,761 B | 4.6× | 481 ms / 468 ms |

1,000 points with 1,000 segments, or with 750 labelled segments, is over 10,000 values (`too_large`). So the rows above are at or within a few percent of the ceiling.

**What a reader gets.** Every subnormal coordinate draws at the same place as 0. The 1.79 million characters of the unlabelled case describe 1,857 elements piled on the origin, almost entirely as runs of zeros.

**Comparison with what was accepted.** NLC TICKET-002 SEC-001 accepted the same "values stated as written" echo for the number line, at 75,721 characters and about 0.66 MB of markup. Its rationale was that the cost is "below the line graph's pinned bound and inside the CPSE TICKET-007 summary cap".
- The x,y graph's ceiling is 26 times the number line's.
- It is 6.2 times the line graph's pinned 321,158 characters (`tests/react/Graph.test.tsx:633-643`).
- The summary cap is not delivered, and its hazard does not name this type (SEC-002).

So the accepted rationale does not carry over to this type.

**Attack Scenario:**
- **Attacker:**
  - a curriculum author on a platform that stores x,y graph descriptions and server-renders them into lesson pages; or
  - a model whose tool call was steered by injected content into writing the description.
- **Steps:**
  1. Write an x,y graph on −10..10 by −10..10.
  2. Add 1,000 points and 857 segments, all unlabelled, every coordinate `5e-324` or `-2.2250738585072014e-308`.
  3. The 126 KB description validates, and `createGraph` reports `ok`. A request-body limit sized for "a JSON figure description", say 256 KB, lets it through.
  4. For the markup ceiling, use 1,000 labelled points and 740 labelled segments with every label 200 × `"` (831 KB) or 200 × `&` (482 KB).
- **Result:**
  - Every view of the page serves 3.7–8.7 MB of SVG markup for one figure.
  - The server spends about 0.4 s of synchronous render per view in the labelled case (see SEC-003).
  - A screen-reader user gets an accessible name of 1.8–2.0 million characters for a figure that shows one dot, or a pile of labels, at the origin.
- **Limits:**
  - The cost is bounded by the 10,000-value, 1,000-item and 200-character limits, whatever the request-body limit.
  - Nothing is disclosed, and nothing escapes the graph's `<svg>`.
  - The author can already write a long accessible name through labels: about 350,000 label characters at the limits. The subnormal coordinates add about 1.6 million characters that carry no information.

**Impact:**
- **Amplification.** Bounded bandwidth, memory and render-time amplification: about 30 times the description for unlabelled subnormals, and up to about 8.7 MB of markup per render at the ceiling.
- **Accessibility.** An accessible name too long to be usable, which works against the purpose of prd/CC-002 1.1.1. The letter of 1.1.1 is met: the alternative is present and complete.
- **A wrong record.** The record's "largest description" is understated by 2.8 times in characters, 3.9 times in markup, and 4.3 times in UTF-8 bytes. The pinning test passes for inputs well beyond its bounds, so a later change that raises the ceiling would go unnoticed.
- **Downstream.** The tool `summary` (CPSE TICKET-007) would carry this text to a model unless its cap is tested against this type (SEC-002).

**Recommendation:**
1. **Correct DEL-007 in the delivery record** (Post-Review Amendments). At the limits the text alternative reaches about 2.0 million characters (2.36 million UTF-16 units, or 3.06 MB as UTF-8, with text outside the BMP), and the markup about 8.7 MB per render. State that raising `XY_ELEMENT_LIMIT`, `DESCRIPTION_VALUE_LIMIT` or `CALLER_TEXT_LIMIT` raises them in proportion.
2. **Pin the worst case, not the measured one,** in `tests/react/Graph.test.tsx` beside `:666-686`. Use every coordinate subnormal and 1,000 points with 740 segments, labels of 200 × `"` and title and axis labels at the limit. Assert the text alternative under about 2.1 million characters, the markup under about 9 MB, and the `<text>` count as today.
3. **A decision for the Security role and Product Owner,** as offered for the number line (NLC TICKET-002 SEC-001) and the line graph (DGP TICKET-002 SEC-001). Either:
   - state a coordinate at its axis's resolution in the text alternative (for example 12 significant digits, or the tick spacing's decimals plus a few), so a value that draws at 0 is not stated with 326 digits. This brings the unlabelled case down to roughly 100,000 characters and keeps every valid description valid. It departs from "supplied values appear as written" for coordinates only, so it needs the Product Owner; or
   - report a non-zero `x` or `y` smaller in magnitude than `SCALE_RESOLUTION` (1e-9, `src/core/value-scale.ts:35`) as `out_of_range`, as non-zero axis ends near zero already are. This changes what validates and would apply to the number line's `value` too.

   Without either, accept the risk explicitly with this type's own numbers. Do not rely on the number line's rationale, whose premises do not hold here.
4. **Alternatively or as well, lower the ceiling.** For example, cap the combined points and segments below 1,000, or count each segment's ends toward one shared limit. This trades curriculum headroom for size, and is the Product Owner's call.

**Compliance Impact:** None. prd/CC-002 1.1.1 is met: the alternative is present and complete. Its usability at the ceiling is the concern.
**Status:** Resolved
**Resolution:** Fixed (Product Owner and Security — Thomas Eaves, 2026-10-27), option 3a. The text alternative states each point's and segment end's coordinate through `coordinate(value, axis)` (`src/core/definitions/xy-graph.ts`): closer to 0 than a trillionth of its axis's span is 0, and anything else at most 12 significant digits (`cleanDecimal`). So computed noise reads as the value meant (sin π = 1.2e-16 reads 0, 0.1 + 0.2 reads 0.3), a typed value reads as written, and a subnormal is never written out in 326 digits. Validity is unchanged; axis ends are still stated as written. Measured after the fix: the unlabeled subnormal case is under 100,000 characters (was 1,794,693); the worst cases are 224,391 characters unlabeled on a 2e-9-wide plane, 559,223 characters and 5,818,168 characters of markup with every text 200 × `"`, and about 908,000 UTF-16 units with text outside the BMP. DEL-007 is corrected in the delivery record's Post-Review Amendments. `tests/react/Graph.test.tsx` pins the worst cases (and the subnormal case) instead of DEL-007's; `tests/core/xy-graph.test.ts` pins the rule. With `coordinate` returning the raw value, both fail.

---

### SEC-002: CPSE TICKET-007's summary-cap hazard names the line graph as the largest valid description; the x,y graph is now about six times larger and is not in the cap's test

**Severity:** Low
**Category:** Input Validation
**OWASP Reference:** A06:2025 Insecure Design. Also OWASP LLM10:2025 Unbounded Consumption, for the model-tool path.
**Location:**
- `.gener8v/changes/graph-library/tickets/component-packaging-and-source-export/TICKET-007.md:63-67`: the summary cap's Known Hazards. They say "At the provisional limits, a 26 KB description gives a 321,158-character text alternative … include a line graph in the cap's test". The reconciliation note says to test with "the largest valid description … a line graph at `SERIES_LIMIT` series".
- `src/core/definitions/xy-graph.ts:249-282` (`describe`), which the tool's success `summary` will carry through `describeNormalized` (CPSE TICKET-007 hazard, line 61).

**Description:**
CPSE TICKET-007 (the model tool and `handleGraphToolCall`) is not delivered. Its hazards ask for a fixed cap on the text alternative inside the `summary`, tested against the largest valid description, which they name as the line graph at 321,158 characters. Since this delivery the largest is the x,y graph: about 2.0 million characters, or 1.79 million from a 126 KB unlabelled description (SEC-001).

A cap is length-based, so it should hold whichever type is largest. The risk is in the test and the ticket's framing:
- an implementer who sizes buffers, or picks the cap, from the "largest" figure in the hazard will be off by six times;
- a test that only feeds the line graph would not catch a cap that is skipped for one type, or applied after an expensive step.

The text alternative is also to be returned "in its own field of the tool result" (hazard line 65). That field is not covered by the summary cap at all. So a model calling `generate_graph` with an x,y graph would receive up to about 2 million characters of tool result, against the line graph's 321,158 that the ticket anticipates.

**Attack Scenario:** A prompt-injected document steers a model to call `generate_graph` with an x,y graph of 1,857 unlabelled subnormal elements. The handler returns `ok`, with the text alternative in its own field. The agent loop feeds about 1.8 million characters, hundreds of thousands of tokens of mostly zeros, back into the model's context. That exhausts or crowds out the context and inflates cost. The summary cap stops this only if it also governs the text-alternative field, or if that field is bounded too. Today the hazard asks for neither for this type.

**Impact:** A future, not present, exposure: the tool path is not delivered. It would be unbounded-consumption pressure on a model consumer, bounded by the validator's limits at about 2 million characters per call.

**Recommendation:** Defer to `graph-library/component-packaging-and-source-export/TICKET-007` with a Known Hazard that:
1. names the x,y graph as the largest valid description, at about 2.0 million characters at the limits and 1.79 million from 126 KB of unlabelled subnormal coordinates (this review, SEC-001);
2. adds an x,y graph at that ceiling to the summary-cap test;
3. decides whether the separate text-alternative field of the tool result is capped as well, or documents that a model consumer must bound it.

If SEC-001's resolution lowers the ceiling, carry the new figure instead.

**Compliance Impact:** None
**Status:** Deferred → component-packaging-and-source-export/TICKET-007
**Resolution:** Deferred (Engineer — Thomas Eaves, 2026-10-27) with a Known Hazard appended to graph-library/component-packaging-and-source-export/TICKET-007: the x,y graph is now the largest valid description, at the figures SEC-001's fix leaves; add it to the summary cap's test, and decide whether the tool result's separate text-alternative field is capped too.

---

### SEC-003: Label placement reaches about 0.4–0.5 s per `createGraph` on a ~69 KB adversarial description; point labels use 12 candidates against the advised 8, and the timing test is neither adversarial nor tight

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** N/A. Related to CWE-407 (inefficient algorithmic complexity).
**Location:**
- `src/layout/xy-graph.ts:41` (`LABEL_ROWS = 2`) and `:279-287`: a point label has 12 candidate places (2 rows × 6). A segment label has 8 (`:263-272`).
- `src/layout/xy-graph.ts:233-245`, `:291-296`: obstacles are the 2 axes, every segment and every marker, then each placed label.
- `src/layout/kit/labels.ts:79-90` (`placeLabel`): candidates × obstacles, with `segmentCrossesBox` allocating per test (`:31-62`).
- `tests/react/Graph.test.tsx:676`: `expect(performance.now() - started).toBeLessThan(5_000)` on a layout that measures about 0.2 s.

**Description:**
This is the accepted CPSE TICKET-002 SEC-004 risk (quadratic `placeLabel`, Security — Thomas, 2026-10-07), realised on the first type with up to about 1,740 labels and 2,000 line obstacles. That review forecast "up to about half a second of event-loop time on each adversarial render, at today's caps". It advised keeping candidates per label at most 8, plus "a timing test at those limits".

Probe: `createGraph`, `NODE_ENV=production`, 3 runs each, axes 0..10.

| Case | Description | Time |
|---|---|---|
| 1,000 points at one spot + 700 near-zero segments there, every label `a` | 69,497 B | 472 / 380 / 367 ms |
| Same, labels of 200 characters | 407,797 B | 487 / 473 / 478 ms |
| 1,000 points at one spot + 740 labelled segments elsewhere | 69,017 B | 394 / 379 / 395 ms |
| 1,000 points at one spot + 850 unlabelled far segments | 66,897 B | 204 / 193 / 192 ms |
| Lattice of 1,000 points + 700 crossing segments | 78,354 B | 113 / 106 / 122 ms |
| DEL-007's pinned case | 420,270 B | 227 ms |

`<XyGraph>` validates and lays out again on each render (accepted, CPSE TICKET-003 SEC-005), so a server render of the first case spends a similar 0.4 s. The cost is within the forecast the risk was accepted on. It is about 5 times the "about 94 ms at a realistic 2,500 labels" in that risk's resolution. It comes from a 69 KB description, and the 12-candidate point labels exceed the advised 8.

**Attack Scenario:** N/A (Informational)
**Impact:** A server-rendering consumer that renders user-supplied x,y graphs spends up to about half a second of synchronous event-loop time per view of a crafted ~69 KB description. That is about 2 such views per second per core.
**Recommendation:**
1. Replace the 5 s bound with an adversarial case at the limits: points stacked at one spot plus labelled segments. Bound it at about 1 s, so a regression to a costlier candidate set or obstacle list shows.
2. Consider 8 candidates per point label: drop the second row's centered pair, or the second row when the first has room. Or bucket obstacles in a coarse grid over the 400-unit drawing, as CPSE TICKET-002 SEC-004 suggested for larger limits.
3. Otherwise, record in the delivery record that the x,y graph realises CPSE TICKET-002 SEC-004's half-second forecast with these figures.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Resolved (Security — Thomas Eaves, 2026-10-27). The 5 s check on DEL-007's case is replaced by an adversarial timing test (1,000 labeled points stacked at one spot plus 700 labeled segments there, 69 KB) bounded at 1.5 s to allow for CI, measured at 0.37–0.53 s locally. Point labels keep their 12 candidate places, so no drawing changes. The figures are recorded in the delivery record: the x,y graph realises CPSE TICKET-002 SEC-004's half-second forecast.

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Fixed | Coordinates in the text alternative cleaned (noise as 0, 12 significant digits); worst cases pinned; DEL-007 corrected | No | `src/core/definitions/xy-graph.ts`, `tests/core/xy-graph.test.ts`, `tests/react/Graph.test.tsx` |
| SEC-002 | Deferred → CPSE TICKET-007 | Known Hazard appended | No | `tickets/component-packaging-and-source-export/TICKET-007.md` |
| SEC-003 | Resolved | Adversarial timing test at 1.5 s; figures recorded | No | `tests/react/Graph.test.tsx` |

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:** This verdict is provisional, from the findings phase. Resolution (steps 13–15) happens in the main session with the Security role.
- **SEC-001 (Medium)** should be resolved before the ticket closes: correct DEL-007, pin the real ceiling, and decide on the coordinate echo or accept it with this type's own numbers.
- **SEC-002** is a natural deferral to CPSE TICKET-007 with a Known Hazard.
- **SEC-003** is informational, within an accepted risk.
- **Dependency audit:** `pnpm audit` and `pnpm audit --prod` (pnpm 10.28.2), 2026-10-27T17:14Z, both "No known vulnerabilities found", exit 0. The lockfile is unchanged by this delivery.
- **Probe scripts** are kept outside the repository, in the session scratchpad (`sec-nlc003/`): `size.tsx`, `place.tsx`, `place2.tsx`, `fuzz.tsx`, `fuzz2.tsx`, `inject.tsx`, `inject2.tsx`, `pollute.ts`, `pollute-enum.ts`, `issues.tsx`.
- `npx vitest run --no-cache` on `tests/core/xy-graph.test.ts`, `tests/layout/xy-graph.test.ts` and `tests/react/Graph.test.tsx`: 107 passed. The project's global setup rebuilt the gitignored `dist/`.
