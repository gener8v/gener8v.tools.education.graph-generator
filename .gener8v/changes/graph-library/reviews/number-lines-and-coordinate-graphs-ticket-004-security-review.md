# TICKET-004: Deliver the x,y,z coordinate graph type — Security Review

## Summary

This review covers the delivery of `graph-library/number-lines-and-coordinate-graphs/TICKET-004` at HEAD of branch `ticket/graph-library-nlc-004`, the delivery commit `bbd4ac1`. No review has resolved anything on this ticket yet, so the code reviewed is the code as delivered. The `security-reviewer` agent ran the findings phase in a fresh context on 2026-10-27, in parallel with the code and quality reviews.

The delivery adds a new public attack surface: `validate`, `normalize`, `describe` and `createGraph` from `./core`, plus `<Graph>` and the new `<XyzGraph>` (`./xyz-graph`), now accept a caller- or model-written x,y,z graph. The caller controls:
- three axis ranges, each with its tick spacing and `showTickLabels`;
- `guideLines`;
- up to 1,000 points, each with `x`, `y`, `z`, a label and a color;
- a title and three axis labels.

Probed in memory, it holds up against injection, crashes and pollution:
- **Bounds.** Every caller string is bounded at 200 characters and refused with hidden, control or direction characters, by the validator and by both published schemas. `points` has `maxItems: 1000` and closed item objects in `schema.json` and `tool-schema.json`. Unknown keys (`onload`, `href`, `textAlternative`) are refused as `unknown_property` at the top level, in an axis and in a point.
- **Drawn text.** Every drawn caller text goes through `cleanText` and is wrapped with a line cap: the title through `titleBlock`, axis labels through `textBlock` (`AXIS_LABEL_MAX_LINES`), point labels through `placeElementLabel` → `textBlock` (2 lines).
- **Projection overflow** (GSS TICKET-001 SEC-002). Every value is scaled into ±170 drawing units before `isometric()` (`src/layout/xyz-graph.ts:66-68`), so axis ends at ±1e9 project without overflow.
- **Spreads.** No caller-sized array is spread into arguments.
- **Fuzz.** 90,000 generated descriptions gave 34,370 valid ones. Every valid one rendered with no `internal_error`, no non-finite coordinate, no node off the drawing, and a text alternative free of `NaN`, `Infinity` and `undefined`. None took over 50 ms.
- **Pollution.** Polluting `Object.prototype` with 16 keys changed nothing, enumerable or not, set before or after the modules load.
- **Markup.** Ten hostile strings, in each of the five text terms, reached the markup only as escaped text. Nine hostile colors were refused as `unknown_color`.
- **Size.** At the limits the text alternative reaches about 322,000 characters and the markup about 3.7 MB. That is below the x,y graph's pinned ceiling (about 560,000 characters, 5.8 MB), so CPSE TICKET-007's hazard ("the largest valid description is now the x,y graph") still holds.
- **Dependencies.** `pnpm audit` and `pnpm audit --prod` are clean. The lockfile and dependencies are unchanged.

The one finding is a regression guard:
- **SEC-001 (Informational):** the type's size and placement-cost ceiling is not recorded in the delivery record and not pinned by a test. The at-limit test uses 4 points. The x,y graph has such a pin since its own SEC-001.

**Reviewer:** `security-reviewer` agent, fresh context (findings phase only, 2026-10-27)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/number-lines-and-coordinate-graphs-ticket-004-delivery.md`. I read the Pre-Flight Reconciliation, the Implementation Plan, DEL-001..DEL-006, the Deviations, the Notes and the Post-Review Amendments (none).

**Files Reviewed:**
- `src/core/definitions/xyz-graph.ts` (new: `XyzGraph`, `XyzPoint`, `XYZ_POINT_LIMIT`, `AXIS_LENGTH`, `AXIS_PAGE_LENGTH`, `xyzRooms`, `zCoordinate`, `defineXyzGraphProperties`, `pointsInRange`, `xyzGraph` and its `describe`)
- `src/layout/xyz-graph.ts` (new: `frameOf`, `axesOf`, `axisObstacles`, `tickLabels`, `guideSegments`, `axisLabels`, `pointLabels`, `xyzGraphLayout`)
- `src/core/definitions/xy-graph.ts` (modified: `coordinates` exported; `xAxis`/`yAxis` descriptions reworded)
- `src/react/graphs/XyzGraph.tsx`, `src/entries/xyz-graph.ts` (new)
- `src/core/definitions/index.ts`, `src/layout/registry.ts`, `src/index.ts`, `package.json`, `tsup.config.ts`, `.size-limit.json` (registration and the `./xyz-graph` entry)
- `src/generated/description.ts`, `src/generated/schema.json`, `src/generated/tool-schema.json`, `src/generated/vocabulary.json` (regenerated; the x,y,z graph's `additionalProperties`, `maxItems` and `maxLength` checked in both schemas)
- `examples/xyz-graph.json`, `examples/invalid/xyz-graph-outside-range.json` (new)
- `tests/core/xyz-graph.test.ts`, `tests/layout/xyz-graph.test.ts` (new); `tests/react/Graph.test.tsx`, `tests/package/per-type-bundle.test.ts`, `tests/core/definitions.test.ts` (modified)
- `.changeset/xyz-graph.md` (new)
- **Read unchanged, because the delivered code's values flow into them:**
  - `src/core/definitions/axis.ts` (`axisProperties`, `axisDomainChecks`) and `src/core/value-scale.ts` (`VALUE_LIMIT`, `MAX_VALUE_TICKS`, `axisTooNarrow`, `niceTicks`, `axisSpacing`);
  - `src/core/definitions/xy-graph.ts` (`coordinate`, `:310-312`);
  - `src/layout/kit/labels.ts` (`placeLabel`, `placeElementLabel`, `segmentCrossesBox`);
  - `src/graph.ts` (`createGraphWith`);
  - `src/layout/scene.ts` (`REACT_PROP`) and `src/layout/kit/check.ts` (`checkScene`).

**Context read:**
- **The ticket and its Known Hazards:** caller text, domain checks, caller-sized arrays, `maxItems`, the projection overflow, the definition contract and `textAlternative` not being a term.
- **`.gener8v/constraints/prd.md`** (CC-001..CC-004). There is no `constraints/number-lines-and-coordinate-graphs.md`.
- **`.gener8v/technical-design/system-design.md`** and **`.gener8v/context.md`.** The package is a library with no server, database, accounts or network calls, and it may be server-rendered.
- **`.gener8v/CONVENTIONS.md`.**
- **CPSE TICKET-007's Known Hazards** (`.gener8v/changes/graph-library/tickets/component-packaging-and-source-export/TICKET-007.md:66-71`), for the tool `summary` cap.
- **The earlier security reviews in this change,** chiefly NLC TICKET-003's (the x,y graph). Their accepted risks are not raised again:
  - CPSE TICKET-002 SEC-004: `placeLabel` quadratic cost;
  - CPSE TICKET-003 SEC-005: validation on every render;
  - GSV TICKET-002 SEC-002: no cap on the issue list, by Product Owner decision;
  - GSS TICKET-002 and DGP TICKET-003: caller colors are the caller's contrast choice.

**Findings:** 1
**Critical:** 0 | **High:** 0 | **Medium:** 0 | **Low:** 0 | **Informational:** 1

## Security Assessment

### Input Validation

**Status:** Adequate
**Notes:**

**Entry points.** These are `createGraph`, `validate`, `normalize` and `describe` from `./core`, and the `description` prop of `<Graph>` and `<XyzGraph>`. All four core functions go through `validateWith`, and the components call `createGraphWith`. The layout runs only on a valid description, inside the `try` of `createGraphWith` (`src/graph.ts:21-47`), so a throw would come back as a bare `internal_error`.

**Structure.**
- Every number must be finite (`src/core/validate/structure.ts:118`). Axis ends are bounded to ±1,000,000,000 (`src/core/definitions/axis.ts:28-58`).
- `x`, `y` and the new `z` have no structural bound (`src/core/definitions/xyz-graph.ts:90-95`, `src/core/definitions/xy-graph.ts:163-176`). `pointsInRange` bounds them to the axis range, as on the x,y graph.
- Every string term carries `maxLength: 200` and the plain-text pattern: the nested shared `label`, `title`, `xAxisLabel`, `yAxisLabel` and `zAxisLabel`. A label with U+200B and U+202E was refused as `wrong_kind`.
- `points` carries `maxItems: 1000` (`src/core/definitions/xyz-graph.ts:44`, `:122`), and the whole description is capped at 10,000 values. 1,000 points use at most 5,000 of them.

**Domain checks** (the ticket's carried GSV TICKET-004 CR-003 and SEC-004 hazard):
- `pointsInRange` (`src/core/definitions/xyz-graph.ts:140-154`) declares all nine of its `inputs`, reads only the frozen description, and builds every issue with `createIssue`. It is O(points).
- The three axes go through `axisDomainChecks`, whose work is constant. The definition registers no check that lists ticks (NLC TICKET-001 CR-006).
- 1,000 points with every coordinate off its axis give 3,000 `outside_axis_range` issues. That is half the x,y graph's 6,285, within the accepted no-cap decision (GSV TICKET-002 SEC-002).

**Arithmetic.**
- `frameOf` divides by each axis's span (`src/layout/xyz-graph.ts:66`). `axisTooNarrow` rejects any span under 1e-9 first.
- `axesOf` divides by each axis's drawn length (`:118-119`). That is always `ISO_SCALE × 170` on the page, never 0.
- `tickLabels` divides by the slanted axes' `direction[0]` (`:182`, `:200`). That is ±cos 30° for the x-axis and the y-axis, and the result is guarded by `Number.isFinite` (`:183`).
- Ticks come from `niceTicks` on a validated axis, at most `MAX_VALUE_TICKS` (100) per axis.

**Caller-sized arrays** (GSS TICKET-002 SEC-001 hazard). Every spread in the two new modules is an object spread or a fixed-length array:
- `src/layout/xyz-graph.ts:68` (a 3-tuple), `:378` (a node's fixed attrs), `:381` (an object);
- `src/core/definitions/xyz-graph.ts:128` (an object), `:175` (three 2-element arrays).

Scene nodes and obstacles are pushed one at a time.

**Caller text.** Text is drawn only through `titleBlock`, `textBlock` → `textLines`, and `placeElementLabel`, each with a line cap. `describe` passes every caller string through `quoteText` after `cleanText`, and treats a blank title or label as absent (`src/core/definitions/xyz-graph.ts:200-219`). Point coordinates are stated through `coordinate()` (`:198-199`), so a subnormal is stated as 0, not 326 digits: the x,y graph's SEC-001 fix carries to this type. `tests/core/xyz-graph.test.ts:163-168` pins that rule.

**XSS and markup injection.** No vector found:
- Text reaches the markup only as React-escaped text or attribute values.
- 100 hostile renders (10 strings × 5 terms × `<XyzGraph>` and `<Graph>`) were tokenised. They held only the elements `svg`, `title`, `text`, `line` and `circle`. The attributes were `role`, `aria-label`, `viewBox`, `width`, `x`/`y`, `cx`/`cy`/`r`, `fill`, `stroke`, `stroke-width`, `stroke-dasharray`, `font-*` and `text-anchor`. There was no event handler, `href` or `style`. The strings tried were:
  - `<script>`, an `<img onerror>` break-out, a quote break-out and `</title><script>`;
  - CDATA, an entity, a template expression and `javascript:`;
  - `<svg onload>` and `${7*7}`.
- The guide lines' only new attribute is `stroke-dasharray` with the constant `"4 3"` (`src/layout/xyz-graph.ts:24`, `:378`).
- Colors go through the shared `color` term. These were all refused as `unknown_color`: `url(#x)`, `expression(alert(1))`, `currentColor`, `transparent`, `#12345g`, `red" onload="x`, `javascript:x`, `#1234567` and `rgb(1,2,3)`.

**Prototype pollution.** 16 keys were set on `Object.prototype`: `guideLines`, `zAxis`, `zAxisLabel`, `xAxisLabel`, `yAxisLabel`, `title`, `points`, `x`, `y`, `z`, `label`, `color`, `tickSpacing`, `showTickLabels`, `min` and `max`. Each was set enumerable or not, before or after the modules load. The `createGraph` result and the `<XyzGraph>` markup were byte-identical to the clean run in all four modes. The optional `tickSpacing` is read own-key in both the layout and `describe` (`src/layout/xyz-graph.ts:127`, `src/core/definitions/xyz-graph.ts:193`).

**Robustness.** The fuzz ran in three passes:
- 30,000 descriptions with seed 12345 and 30,000 with seed 987654. Axis ends were drawn from {0, ±1, ±10, ±1e9, ±999999999.5, ±1e-9, 2e-9, ±0.5, ±1e6, 123456789.123, 5e-324, …}. Spacings included `0.1 * 3`, 2e9, 1e-9 and 5e-324. Coordinates were the range ends, the midpoint, 0, subnormals and random values. Texts included 200 `W`s, 100 emoji and hostile markup. `guideLines` and `showTickLabels` were random.
- 30,000 with seed 4242, biased to valid near-degenerate and extreme axes. These had widths down to just over `SCALE_RESOLUTION` at every magnitude, ends clamped to ±1e9, and spacings dividing the span.

Of 90,000 descriptions, 34,370 were valid. Every valid one gave a finite scene height, every node coordinate finite and inside the drawing (0..400 across, 0..height down), and a clean text alternative. None raised `internal_error`, and none took over 50 ms (axes, ticks and up to 200 points).

**Size and cost at the limits.** Probe: `createGraph` and `renderToStaticMarkup(<XyzGraph>)`, `NODE_ENV=production`, Node v24.1.0 via `tsx`, 2026-10-27.

| Case | Description | Text alternative | Markup | Markup ÷ description | `createGraph` |
|---|---|---|---|---|---|
| 1,000 unlabelled points on a 2e-9-wide cube, every coordinate about −1.2e-20 (12 significant digits, the longest `coordinate()` keeps), guide lines | 83,807 B | 111,212 characters | 626,370 B | 7.5× | 13 ms |
| Same, every label 200 × `"`, colors | 512,807 B | 322,212 characters | 3,673,370 B | 7.2× | 115 ms |
| Same, every label 100 × U+1F600 | 312,807 B | 322,212 UTF-16 units, 526,228 B as UTF-8 | 1,883,370 B | 6.0× | 101 ms |
| 1,000 points labelled `a`, stacked at one spot, guide lines | 33,795 B | 24,128 characters | 675,820 B | 20.0× | 287 ms (first run) |
| 1,000 points labelled `ab` on a diagonal, guide lines | 65,349 B | 34,910 characters | 681,866 B | 10.4× | 326 ms (first run) |

A sweep of 48 placement layouts (cluster spreads 0 to 10, in a cube, on the plane and on a line, with and without guide lines) found nothing slower: the warm maximum was 158 ms. The cost is within the accepted CPSE TICKET-002 SEC-004 risk, and below the x,y graph's 0.37–0.53 s.

**Gaps:** none exploitable. The ceiling above is recorded nowhere in the delivery and is not pinned (SEC-001).

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** The package is a library with no accounts, sessions, tokens, server or network calls (`.gener8v/context.md`). Whoever writes a description, whether a curriculum author or a model through the future tool, is trusted only as far as the validator's bounds. Any access control belongs to the consuming application.

### Data Protection

**Status:** Adequate
**Notes:**
- The delivered code collects, stores, transmits and logs nothing. There is no `console`, `fetch`, storage API, `process.env`, `Math.random`, `eval`, `new Function` or `dangerouslySetInnerHTML` in the new files.
- Caller text appears only in the Scene, the text alternative, and issue messages returned to the caller.
- When a layout throws, `createGraph` returns a bare `internal_error` with no message or stack (`src/graph.ts:42-46`).
- No PII is in scope.

### Configuration Security

**Status:** Adequate
**Notes:**
- No secrets, credentials, keys or environment reads.
- The `./xyz-graph` export in `package.json` points only into `dist/`. The `tsup.config.ts` entry is the new entry file, which exports only `XyzGraph` and prop types (`src/entries/xyz-graph.ts`).
- No dependency was added or changed, and `pnpm-lock.yaml` is untouched by `bbd4ac1`.
- Security headers and CORS are not applicable to a component library.

**Dependency audit:** run 2026-10-28T00:40:16Z (2026-10-27 20:40 local) with pnpm 10.28.2 on Node v24.1.0:
- `pnpm audit`: "No known vulnerabilities found", exit 0.
- `pnpm audit --prod`: "No known vulnerabilities found", exit 0.

**Cryptography:** not applicable. The delivered code uses no cryptographic or random functions.

**Logging and monitoring:** not applicable. A library with no logging. Rejections are returned to the caller as structured issues, not logged.

**Compliance cross-reference:** checked against `.gener8v/constraints/prd.md`. No per-area constraints file exists.

| Constraint | Result |
|---|---|
| prd/CC-001 (licenses of dependencies and assets) | Met: no dependency or asset added |
| prd/CC-002 (WCAG 2.1 AA, non-text content) | **1.1.1: met.** Every Scene carries the generated text alternative: type, title, the three ranges and spacings, the projection, guide lines, axis labels, hidden tick labels, unequal units, and every point with its label. A supplied `textAlternative` replaces it (`tests/react/Graph.test.tsx`, "the x,y,z graph's accessible name"). Overlapping tick labels of different axes (delivery record Notes, spec OQ-005) do not take information away from the alternative.<br>**1.4.11: met by the defaults.** The axes and markers use the default palette, already checked. The guide lines use the grid color `#8a8a8a`, about 3.5:1 on white. A caller's own hex color is the caller's contrast choice, as settled in GSS TICKET-002.<br>**1.4.1: met.** Points are told apart by position and labels, not color alone. |
| prd/CC-003 (no data collected or transmitted) | Met: no network, storage or telemetry in the new code |
| prd/CC-004 (no trademarked imagery) | Not applicable: no images |

No CC-XXX violation was found, so no finding is raised to Critical.

## Findings

### SEC-001: The x,y,z graph's size and placement-cost ceiling is neither recorded nor pinned; the at-limit test draws 4 points

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** N/A. Related to CWE-400 (uncontrolled resource consumption), as a regression guard only.
**Location:**
- `tests/react/Graph.test.tsx:593-615` ("draws a valid x,y,z graph with every text at its limit …"): every text at its limit, but 4 points.
- `tests/react/Graph.test.tsx:775-786` (the timing test): 1,000 points labelled `a`, stacked, bounded at 1.5 s. It bounds time only, not the text alternative or markup.
- `.gener8v/changes/graph-library/delivery/number-lines-and-coordinate-graphs-ticket-004-delivery.md` (Notes, Deviations): no figure for the text alternative or markup at the limits. Deviations gives only the timing (about 0.6 s against 1.5 s).
- `src/core/definitions/xyz-graph.ts:44` (`XYZ_POINT_LIMIT`), `:198-220` (`describe`'s per-point text); `src/layout/xyz-graph.ts:233-245`, `:376-379` (up to 3 dashed guide lines per point).
**Description:**
The type is well bounded today:
- about 322,000 characters of text alternative and 3.7 MB of markup at the limits;
- up to 20 times amplification from description to markup, with 1,000 stacked labelled points and guide lines;
- about 0.3 s of label placement on a crafted 34–65 KB description.

All of these are below the x,y graph's, so CPSE TICKET-007's hazard, which names the x,y graph as the largest description, stays correct. But nothing holds these figures. The x,y graph has a test pinning its worst cases ("keeps the x,y graph's text alternative and markup bounded at its limits", from NLC TICKET-003 SEC-001). This type has none. A later change could pass every test while raising the ceiling past the x,y graph's, which would make CPSE TICKET-007's "largest" premise wrong without anyone noticing. Examples:
- stating coordinates raw (the `coordinate()` test checks one point, not the size);
- adding segments (spec OQ-007);
- raising `XYZ_POINT_LIMIT`;
- adding a fourth guide line per point.
**Attack Scenario:** N/A (Informational)
**Impact:** No present exposure. A future regression in size or cost would go unnoticed, and the CPSE TICKET-007 summary-cap test, written from its hazard, would not include this type.
**Recommendation:**
1. Record this type's ceiling in the delivery record's Post-Review Amendments: about 322,000 characters (526 KB as UTF-8 with text outside the BMP) and about 3.7 MB of markup at the limits, below the x,y graph's, so CPSE TICKET-007's hazard stands.
2. Pin it in `tests/react/Graph.test.tsx` beside the x,y graph's ceiling test. Use 1,000 points on a 2e-9-wide cube, every coordinate about −1.2e-20, every label 200 × `"`, title and axis labels at the limit, and guide lines on. Assert the text alternative under about 350,000 characters, the markup under about 4 MB, and a bounded `<text>` count.
3. Optionally assert in the same test that the x,y,z ceiling stays below the x,y graph's. That keeps CPSE TICKET-007's "largest" premise checked by the suite.
**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed (Security — Thomas Eaves, 2026-10-28, the recommended option). `tests/react/Graph.test.tsx` adds "keeps the x,y,z graph's text alternative and markup bounded at its limits, below the x,y graph's":
- **Input:** the worst case recommended above (1,000 points on a 2e-9-wide cube, coordinates about −1.2e-20, every text 200 × `"`, guide lines on).
- **Bounds:** the text alternative under 350,000 characters, the markup under 4,000,000, and both under the x,y graph's own ceilings (600,000 and 6,200,000), so CPSE TICKET-007's "largest" premise is checked. The `<text>` count is at most 2 × 1,000 + 3 + 6 + 3 × 101.
- **Measured 2026-10-28:** 322,212 characters (526,228 bytes as UTF-8 with text outside the BMP) and 3,672,785 characters of markup.
- **Mutation check:** stating the points twice fails the test.

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Fixed | Ceiling recorded and pinned by a test, below the x,y graph's | No | `tests/react/Graph.test.tsx` |

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:** Resolved in the main session with the Security role, 2026-10-28. Re-verified after SEC-001, all exit 0:
- `pnpm generate`, lint, typecheck, bench, build, `check:dist`, `check:deps`, `check:images`, `check:changesets`, size, publint, attw;
- `pnpm test` ×3, 1,637 tests each run.

The code and quality resolutions in between (CR-001, CR-002, QR-003) were reviewed against this report's checks: they add no caller-sized work. Each tick label tries at most 8 candidates against the same obstacles, and an axis name at most 12.
- **Dependency audit:** `pnpm audit` and `pnpm audit --prod` (pnpm 10.28.2, Node v24.1.0), 2026-10-28T14:52Z, both "No known vulnerabilities found", exit 0. The lockfile is unchanged by this delivery.
- **Sizes:** `./xyz-graph` 21.29 kB of 25; `./core` 25.9 kB of 40.
- **Probe scripts** are kept outside the repository, in the session scratchpad (`sr004/`, `cr004fix/`).
