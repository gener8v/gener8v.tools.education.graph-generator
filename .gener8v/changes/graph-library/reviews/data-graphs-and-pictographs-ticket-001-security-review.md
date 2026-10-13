# TICKET-001: Categories and value scale foundation — Security Review

## Summary

This review covers the delivery of `graph-library/data-graphs-and-pictographs/TICKET-001` as it stands at HEAD of branch `ticket/dgp-001` (`05b5ed6`): delivery commit `ce93ce9`, the code-review resolution `ba267ad` and the quality-review resolution `05b5ed6`, which moved the scale arithmetic to `src/core/value-scale.ts`. The `security-reviewer` agent ran the findings phase in a fresh context on 2026-10-13.

The delivery has almost no live attack surface today. No line graph, bar graph or pictograph is registered, so through the public entry points the new code only reports `valueScale` and `valueUnitLabel` on a circle as `inapplicable_property`. The built `dist/` holds the new property specs but none of the scale or kit functions. The findings are about what DGP TICKET-002, 003 and 005 will reach when they draw with this kit, as the delivery record's Notes tell them to:
- **SEC-001 (High):** `valueTicks` loops forever on a valid scale whose ends are far from zero and very close together. The quality-review change QR-002 counts grid ticks from zero, so the loop counter passes 2^53 and `k++` stops changing it. A valid 116-byte line-graph description made `createGraph` never return. No `try`, fallback or error boundary can catch a loop that never throws, so a Node.js server process is blocked for every user.
- **SEC-002 (Medium):** category names are wrapped with no line cap, by design (the spec says names are never truncated), and nothing bounds their length. 100 categories × 1,000 `@` (a 101 KB body) give 100,000 text nodes and 18.4 MB of SVG. About 2 MB gives about 2 million nodes, and `SceneSvg` then throws during render, past the fallback. This contradicts the Known Hazard already on the three type tickets.
- **SEC-003 (Low):** the scale's printable-size assumptions are enforced nowhere. A valid given end such as `5e-324` prints as a 326-character tick label that needs about 2,400 drawing units in a 400-unit drawing. The instruction to bound values to ±`VALUE_LIMIT` exists only in the delivery record's Notes, not in the type tickets' Known Hazards.
- **SEC-004 (Informational):** at extreme tick intervals the scale checks report the wrong thing: `NaN` at a path the caller never gave, a suggestion of "Infinity", and a non-dividing interval accepted (DGP-REQ-008).
- **SEC-005 (Informational):** the duplicate-name check compares code points, so canonically equivalent or invisibly different names (`Café` in NFC and NFD, `Mon` and `Mon` + U+200D) pass as different.

Five findings: 0 Critical, 1 High, 1 Medium, 1 Low, 2 Informational.

**Reviewer:** `security-reviewer` agent, fresh context (findings phase only, 2026-10-13)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/data-graphs-and-pictographs-ticket-001-delivery.md` (DEL-001..005, Notes, Post-Review Amendments from the code and quality reviews)

**Files Reviewed:**
- `src/core/value-scale.ts` (new with QR-005)
- `src/core/definitions/categories.ts`
- `src/layout/kit/value-scale.ts`
- `src/core/definitions/index.ts` (`scopedPropertyMaps`, `scopedProperty`, `propertiesOf`)
- `src/core/definitions/types.ts` (`StringValue.emptyIsAbsent`)
- `src/core/definitions/shared.ts` (`ScopedPropertySpec`, `@spec` change)
- `src/core/issues.ts` (`duplicate_name`)
- `src/core/validate/structure.ts` (`appliesToType`, `emptyIsAbsent`)
- `tests/core/categories.test.ts`, `tests/layout/kit/value-scale.test.ts`, `tests/core/definitions.test.ts`, `tests/core/issues.test.ts`

Context read:
- the ticket and its Known Hazards, and the Known Hazards on DGP TICKET-002, 003 and 005, including those appended by the GSS TICKET-002 security review;
- the delivery record, with its Notes and both Post-Review Amendments;
- the DGP specification's Scale and Layout rules and Edge Cases;
- `.gener8v/constraints/prd.md` (there is no `constraints/data-graphs-and-pictographs.md`);
- `.gener8v/technical-design/system-design.md`: AD-004, AD-007, AD-008, AD-010, AD-014;
- `.gener8v/context.md` and `.gener8v/CONVENTIONS.md`;
- the earlier security reviews in this change, especially GSS TICKET-002 and GSV TICKET-003 and 004, whose threat model this review follows. Their accepted or deferred items are not raised again. The exception is GSS TICKET-002 SEC-002, the pending caller-text length bound, which SEC-002 here builds on.

Code this delivery depends on, read unchanged:
- `src/core/format.ts` (`cleanText`, `formatSupplied`);
- `src/layout/kit/text.ts` (`wrap`, `textWidth`), `title.ts` (`textLines`), `format.ts` (`fmt`), `scale.ts`, `check.ts`;
- `src/core/validate/index.ts`, `domain.ts`, `state.ts`, `envelope.ts`;
- `src/graph.ts`, `src/react/SceneSvg.tsx`, `src/layout/registry.ts`.

**Review environment note:**
- **How I probed:** probe scripts lived in the session scratchpad (`…/scratchpad/dgp1-sec/`). They imported the repository's `src/` and its installed `tsx`, `react` and `react-dom` by absolute path, and ran under `node --import <repo>/node_modules/tsx/dist/esm/index.mjs` with `TMPDIR` set to the scratchpad. They exercised the delivered functions directly, and also through `validateWith` and `createGraphWith`, with a test-only registry: a stand-in line graph, bar graph and pictograph built as `tests/core/categories.test.ts` builds them, and a stand-in line-graph layout that draws as the delivery record's Notes direct. Probes that could hang ran in child processes under `timeout`.
- **Runtime:** Node.js v24.1.0, pnpm 10.28.2, default heap and stack.
- **Commands run in the repository** (read-only apart from the git-ignored `dist/`, which the test setup rebuilds):

| Command | Exit | Evidence |
|---|---|---|
| `pnpm audit` | 0 | No known vulnerabilities found |
| `pnpm audit --prod` | 0 | No known vulnerabilities found |
| `pnpm lint` | 0 | — |
| `pnpm typecheck` | 0 | — |
| `pnpm test` (first run) | 1 | 835 of 836 passed. `tests/layout/circle.test.ts` › "keeps the Scene small and the run short for caller-sized text" took 2,104 ms against its 2,000 ms bound. This is the timing flake the delivery record already notes; it is unrelated to this delivery |
| `pnpm vitest run tests/layout/circle.test.ts` | 0 | 29 of 29 passed alone |
| `pnpm test` (second run) | 0 | 30 files, 836 tests |

- **Tree check:** `git status --short` showed only the hook-written `.gener8v/runs.jsonl` before and after the probes and command runs.

**Findings:** 5
**Critical:** 0 | **High:** 1 | **Medium:** 1 | **Low:** 1 | **Informational:** 2

## Security Assessment

### Input Validation

**Status:** Gaps Found
**Notes:**
**Entry points:** no new public function. `src/core/index.ts` and `src/index.ts` export nothing from `categories.ts`, `value-scale.ts` or the kit, and no built `.d.ts` names them. Reachability today and later:
- **Today:** the new code is reached only through `validate`, `normalize`, `createGraph` and the components, by way of `propertiesOf` and `appliesToType`. Probe: `validate({ type: "circle", radius: 2, valueScale: { minimum: 0 }, valueUnitLabel: "x" })` gives two `inapplicable_property` issues, as AC 2 and 3 intend.
- **Later:** once DGP TICKET-002, 003 and 005 register their types, `categoriesCheck`, `tickIntervalCheck` and `checkValueScale` run as domain checks on every description. The layouts call `resolveValueScale`, `valueTicks`, `drawValueAxis`, `valueAxisExtent`, `categorySlots` and `drawCategoryNames` on every valid one.

**Caller-controlled values this delivery defines:**

| Value | Validation | Where it goes |
|---|---|---|
| `categories` | list, `maxItems` 100 (`too_large` beyond); empty → `missing_property` (domain) | category slots |
| `categories[i].name` | plain-text policy; required; no length bound | wrapped category names with no line cap (SEC-002); duplicate check (SEC-005) |
| `valueScale.minimum`, `.maximum` | finite, ±1,000,000,000; `ordered` | scale ends, printed exactly with `formatSupplied` (SEC-001, SEC-003) |
| `valueScale.tickInterval` | finite, at most 2,000,000,000, no lower bound so that ≤ 0 reaches `checkTickInterval` | tick grid and checks (SEC-004) |
| `valueUnitLabel` | plain-text policy; `""` dropped (`emptyIsAbsent`) | the pictograph key (TICKET-005) |

**What is handled well:**
- **Check cost is bounded by size, not magnitude** (GSV TICKET-004 SEC-004):
  - `checkValueScale` counts intervals arithmetically with `intervalsIn` and never enumerates ticks.
  - `extent` finds the lowest and highest value with a loop, not a spread.
  - `checkCategories` is one pass with a `Map`.
  - Probe: `tickInterval` `5e-324` and `1e-300` over valid ends return at once, with `too_many_ticks` or another issue.
- **Messages:** every issue is built with `createIssue`. The repeated name in `duplicate_name` is quoted, clipped to 40 characters and escaped by `describeValue`. Probe: 100 duplicated 20,000-character names gave 99 messages of normal length, each ending `"@@@…"`.
- **Skipping:** `categoriesCheck` reads `categories/*/name` only (CR-002). A failed list (`too_large`) or a missing list skips it, through `touchesFailed` and the `hasOwn` test in `runDomainChecks`. `tickIntervalCheck` is skipped when `valueScale` failed.
- **Scoped terms:**
  - `scopedProperty` looks up own keys only (`Object.hasOwn`), so `__proto__` and `constructor` are unknown properties, as before.
  - `dataGraphProperties` is built with `defineProperties`: frozen, with no prototypes.
  - `scopedPropertyMaps` is a plain array, but it is internal and not exported from any entry point.
- **Kit output:** every coordinate goes through `fmt()`, caller text goes only into `TextNode.text`, and no argument spreads were added (`drawCategoryNames` appends with a loop). `checkScene` reported no problems on any probe Scene.
- **Fuzzing:** I ran 300,000 random given scales and data sets within the declared bounds. Of these, 72,900 given scales and 59,795 default scales passed the checks. Every one drew in both orientations, included every value and had at most 100 ticks. The fuzz did not hit SEC-001's trigger, which is narrow; a targeted probe did.

**Gaps:**
- **SEC-001:** `valueTicks` (`src/core/value-scale.ts:150-166`) assumes its grid index is a safe integer.
- **SEC-002:** category names have no bound in the validator or the layout.
- **SEC-003:** nothing bounds the printed size of scale values.
- **SEC-004:** non-finite intermediate values reach issue messages and paths. An absolute tolerance accepts non-dividing intervals.
- **SEC-005:** the duplicate-name comparison is not canonical.

**Not applicable:** SQL, NoSQL, command, template and path-traversal injection. The delivered source has no query, shell, template engine or file path.

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** This is library code with no server, accounts, sessions or permissions (`.gener8v/context.md`: "no user accounts").

### Data Protection

**Status:** Adequate
**Notes:**
- **Sensitive data:** the delivered code holds no PII or credentials, and logs, stores and transmits nothing.
- **Exceptions:** `valueTicks` throws a `RangeError` whose message holds numbers only. Inside `createGraphWith` it becomes the fixed `internal_error` (GSV TICKET-002 SEC-003). SEC-001's loop throws nothing, so nothing is disclosed: it hangs.
- **Secret scan:** I scanned the lines added by `git diff 22ed903..HEAD` over `src/`, `tests/`, `package.json` and `pnpm-lock.yaml`. The patterns were API keys, tokens, passwords, private keys, AWS/GitHub/npm/Slack token shapes, URLs, network APIs, `eval`/`Function(`, `innerHTML`/`dangerouslySetInnerHTML`, `document.`/`window.`, storage, `console.`, `process.env`, `child_process` and `require(`. Nothing matched.

### Configuration Security

**Status:** Adequate
**Notes:**
- **Manifest and tooling:** `package.json`, `pnpm-lock.yaml`, `.github/`, `eslint.config.js` and `tsup.config.ts` are unchanged since `22ed903`. No dependency, script, export or override was added.
- **Built output:** after the test setup's rebuild, `dist/chunk-BBXY53CF.js` carries the `valueUnitLabel` and `valueScale` specs, because `propertiesOf` reads `dataGraphProperties`. No `dist/` file contains `valueTicks`, `categorySlots`, `resolveValueScale` or `checkValueScale`, and no `.d.ts` exports them.
- **Secrets and defaults:** none. The new limits are constants (`CATEGORY_LIMIT` 100, `VALUE_LIMIT` 1e9, `MAX_VALUE_TICKS` 100), stated in the property descriptions.
- **Cryptography:** not applicable; the code uses none.
- **Logging and monitoring:** not applicable. The package logs nothing by design (AD-014), and this delivery adds no logger.

**Dependency audit:** `pnpm audit` (pnpm 10.28.2, Node.js v24.1.0), run 2026-10-13 19:56 UTC in the repository against the HEAD lockfile (`05b5ed6`), read-only.
- `pnpm audit`: `No known vulnerabilities found`, exit 0.
- `pnpm audit --prod`: `No known vulnerabilities found`, exit 0. The package has no runtime dependencies; `react` is a peer.
- This delivery does not change the lockfile.

**Carried Known Hazards (security-relevant):**

| Hazard | Result |
|---|---|
| GSV TICKET-003 SEC-001: `maxItems` on every array, limits in the description text | Honoured: `categories` has `maxItems` 100, stated in its description; `too_large` beyond it |
| GSV TICKET-004 CR-003 / SEC-004: `inputs` paths, frozen description, `createIssue`, work by size not magnitude | Honoured by the three checks. The drawing side breaks the magnitude rule another way: whether `valueTicks` terminates depends on a value's magnitude (SEC-001) |
| GSV TICKET-003 CR-002: `ordered` on minimum/maximum | Honoured: `ordered: [["minimum", "maximum"]]`; equal ends fail in stage 2 and skip the scale check |
| GSV TICKET-003 CR-007: meaning of `""` on the value-unit label | Honoured: `emptyIsAbsent`, optional properties only (QR-006) |
| GSS TICKET-002 SEC-001: no argument spreads | Honoured in the kit (`drawCategoryNames`, `valueAxisExtent`, `extent` use loops) |
| GSS TICKET-002 SEC-001 / SEC-002 hazard on DGP TICKET-002, 003, 005: wrap every label with `maxLines`; a 500 KB text test with bounded text nodes | Not satisfiable for category names with this kit: `categorySlots` wraps with no `maxLines` by design, and nothing bounds the name (SEC-002) |

**Compliance cross-reference:** checked against `.gener8v/constraints/prd.md`; no per-area constraints file exists. The ticket names prd/TC-001, TC-002 and TC-011.

| Constraint | Result |
|---|---|
| prd/CC-001 (license) | Met: no dependency, asset or font added |
| prd/CC-002 (WCAG 2.1 AA, non-text content) | Met for what this ticket delivers: every value-axis tick has a text label (DGP-REQ-009); the axis and text use the default `#222222` and `#1a1a1a`. The text alternative belongs to the type tickets. SEC-001 and SEC-002 are availability failures, not missing alternatives |
| prd/CC-003 (no data collection) | Met: no network, storage or telemetry API in the added code |
| prd/CC-004 (trademarks) | Not applicable |
| prd/TC-001 (no measuring) | Met: widths come from `textWidth` estimates only |
| prd/TC-002 (rounding) | Met: every Scene number goes through `fmt()`; `checkScene` was clean on every probe Scene |
| prd/TC-003 / AD-008 (ids) | Met: no ids or references |
| prd/TC-011 (computed wrapping) | Met: names wrap with the kit's `wrap` |

No CC-XXX violation was found, so no finding is raised to Critical.

## Findings

### SEC-001: `valueTicks` never terminates on a valid scale whose ends are far from zero and very close together, so drawing one 116-byte line graph blocks the process for good

**Severity:** High
**Category:** Input Validation
**OWASP Reference:** A10:2025 Mishandling of Exceptional Conditions. Also CWE-835 (loop with unreachable exit condition) and CWE-1339 (insufficient precision of a real number).
**Location:**
- `src/core/value-scale.ts:152-153`: `first` and `last` are grid indices counted from `tickBase`.
- `src/core/value-scale.ts:155`: the guard checks only that `last - first + 1` is finite and at most 100.
- `src/core/value-scale.ts:160`: `for (let k = first; k <= last; k++)`.
- `src/core/value-scale.ts:139`: `tickBase` is 0 for a chosen interval (QR-002, `05b5ed6`).
- `src/core/value-scale.ts:26`, `:77-85`: a chosen interval can be as fine as `1e-9`, and given ends reach ±1e9.
- Callers: `src/layout/kit/value-scale.ts:49` (`valueAxisExtent`) and `:88` (`drawValueAxis`).
- `src/core/value-scale.ts:211-258`: `checkValueScale` accepts these scales.

**Description:**
Since QR-002, a chosen interval's grid counts from zero, so the grid index of a tick near the minimum is about `minimum / tickInterval`. The interval is chosen from the span: at most ten intervals, never finer than 1e-9. When a given end is large and the span is tiny, that index passes `Number.MAX_SAFE_INTEGER` (2^53 ≈ 9.0e15). There `k + 1 === k`, so `k++` never advances and the loop never ends.

The guard at `:155` does not catch it, because `last - first + 1` is small (9 in the example below).

Before QR-002 the loop ran on a bounded counter (`for (let i = 0; i < count; i++)` in `ba267ad`), so the code review saw no such loop. The QR-002 property test draws its ends from ±100 in steps of 0.1 (`tests/layout/kit/value-scale.test.ts:119`), so it never meets the condition.

Probes, each run in a child process killed after 10 s (exit 124). Each scale passes `checkTickInterval` and `checkValueScale` with no issue:

| Given scale | Values | Line graph | Chosen interval | First grid index | `valueTicks` |
|---|---|---|---|---|---|
| `{ minimum: 999999999.9999999, maximum: 1000000000 }` | `[1e9]` | yes | 2e-8 | 4.999999999999999e16 | never returns |
| `{ minimum: 999999999.9999999 }` | `[1e9]` | yes and no | 2e-8 | 4.999999999999999e16 | never returns |
| `{ maximum: -999999999.9999999 }` | `[-1e9]` | yes | 2e-8 | -5e16 | never returns |
| `{ minimum: 99999999.99999999, maximum: 100000000 }` | `[1e8]` | yes | 2e-9 | 4.999999999999999e16 | never returns |
| `{ minimum: 999999.9999, maximum: 1000000 }` (control) | `[1e6]` | yes | 1e-5 | 9.99999999e10 | 9 ticks, 0 ms |

`node -e` confirms the mechanism: `Math.ceil(999999999.9999999 / 2e-8)` is `49999999999999990`, and adding 1 to it gives the same number.

**End to end:** the stand-in line graph used the registry pattern of `tests/core/categories.test.ts`, with values bounded to ±`VALUE_LIMIT`. Its layout called `resolveValueScale`, then `drawValueAxis`, `categorySlots` and `drawCategoryNames`, as the delivery record's Notes tell TICKET-002 to do. Results through `createGraphWith`:
- `{"type":"line-graph","categories":[{"name":"Mon"},{"name":"Tue"}],"values":[3,7],"valueScale":{"maximum":10}}` returned `ok: true` with 25 nodes in 2 ms.
- `{"type":"line-graph","categories":[{"name":"Mon"}],"values":[1000000000],"valueScale":{"minimum":999999999.9999999}}`, a 116-byte description that `validate` accepts, never returned. The process was killed after 15 s.

`createGraphWith`'s `try`/`catch`, the components' `fallback` and React error boundaries all react to exceptions, and an infinite loop throws none.

**Which descriptions trigger it:** a chosen interval (no `tickInterval` given), together with a given end (or a data value next to a given end) whose magnitude is above about 10^15 times the span. With ends bounded to ±1e9, that means ends that differ only in the last one or two significant digits of a double, at magnitudes of about 10^7 and above.

**Which types reach it:**
- **Default scales:** never. The data extent always includes zero, so the span is at least as large as every value.
- **Given intervals:** never. The grid counts from the minimum, so `first` is 0.
- **Bar graphs:** avoid it only through DGP TICKET-003's own checks (a minimum above zero and negative values are errors).
- **Line graphs:** have no such check. DGP TICKET-002's Known Hazards say nothing about it.

**Attack Scenario:**
- **Attacker:** anyone whose description reaches `createGraph`, `<Graph>`, the line-graph component or `exportSource` on a server. This covers an author on a curriculum platform that stores descriptions and server-renders them, or anyone who can steer a model into calling the graph tool in an application that renders the result (for example, instructions planted in an uploaded worksheet). A 116-byte body passes any request-size limit.
- **Steps:**
  1. Submit `{"type":"line-graph","categories":[{"name":"Mon"}],"values":[1000000000],"valueScale":{"minimum":999999999.9999999}}`.
  2. `validate` reports it valid, so it is stored or rendered.
  3. The layout calls `drawValueAxis` (or `valueAxisExtent`), which calls `valueTicks`, which loops forever.
- **Result:**
  - The Node.js event loop is blocked at 100% CPU. Every request on that process stalls, not just the attacker's page, and health checks fail.
  - After a restart, the next render of the stored description hangs again.
  - Where several workers serve the page, a handful of views takes them all down.
  - In a browser, the tab freezes.
- **Limit:**
  - It becomes reachable once DGP TICKET-002 registers the line graph and draws with this kit, which the delivery record's Notes direct. It is not in the current `dist/`.
  - Nothing is disclosed.

**Impact:** A persistent, process-wide denial of service from one tiny valid description. It defeats CPSE-REQ-018 and AD-014's never-throw, always-fallback contract, because nothing ever returns. Rated High rather than Critical only because no registered graph type reaches it yet.

**Recommendation:**
1. **Make `valueTicks` terminate by construction.** Loop on a bounded counter and refuse grid indices that are not safe integers, for example:
   ```ts
   if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last) || …) throw new RangeError(…);
   for (let i = 0; i < gridTicks; i++) { const k = first + i; … }
   ```
2. **Keep such scales out of the layout.** With step 1 alone they become `internal_error`, a valid description reported as a package defect. Either:
   - in `checkValueScale`, report a given scale whose span is below a relative resolution of its ends, for example `maximum − minimum < 1e-9 × max(|minimum|, |maximum|)`, as `out_of_range` on the given end, and say so in the `valueScale` description; or
   - in `resolveValueScale`, count a chosen grid from the minimum (`tickBase = minimum`) whenever `|minimum / interval|` would exceed `Number.MAX_SAFE_INTEGER`.

   The first keeps the drawing readable as well (see SEC-003).
3. **Tests:**
   - the four scales above through `valueTicks`, `drawValueAxis` and `valueAxisExtent`, expecting either an issue from the checks or a drawing that returns;
   - widen the QR-002 property test's `end` generator to include ends near ±`VALUE_LIMIT` and spans down to one ulp;
   - run every `value-scale.ts` drawing test under a short per-test timeout, so a regression fails rather than hangs CI.
4. **Known Hazard on DGP TICKET-002 and 003:** draw ticks only through `valueTicks` and `drawValueAxis`; never loop on a floating-point counter; add the trigger scale to the type's own tests.

**Compliance Impact:** None. No CC-XXX constraint covers availability; prd/CC-002 is not violated because no graph is shown without its alternative.
**Status:** Resolved
**Resolution:** `valueTicks` loops on a bounded counter (at most `MAX_VALUE_TICKS` turns) and refuses grid indices outside the safe-integer range with a `RangeError`; `checkValueScale` reports a span narrower than `SCALE_RESOLUTION` (1e-9) of its ends' size as `out_of_range` at the given end (`{ minimum: 999999999.9999999 }` over 1e9 → `/valueScale/minimum`, at most 999999999). Tests: the trigger scale, a span test, and a 2,000-run property test with ends near ±`VALUE_LIMIT` and near 0 (every accepted scale draws at most 102 ticks with labels of at most 30 characters). Known Hazard on DGP TICKET-002 and 003. Approved by the user, 2026-10-13.

---

### SEC-002: Category names are wrapped with no line cap and no length bound, so a 101 KB description draws 100,000 text nodes and about 2 MB makes the render throw past the fallback

**Severity:** Medium
**Category:** Input Validation
**OWASP Reference:** A06:2025 Insecure Design. Also CWE-770 (allocation of resources without limits) and CWE-400 (uncontrolled resource consumption).
**Location:**
- `src/layout/kit/value-scale.ts:150`: `wrap(cleanText(category.name), labelWidth, fontSize)`, with no `maxLines` (compare `src/layout/kit/text.ts:157`).
- `src/layout/kit/value-scale.ts:24` and `:147`: below a vertical plot, names wrap to `max(MIN_NAME_WIDTH, slot − 4)`, which is 24 units for 100 categories. One `@` (about 13.4 units at 12 px) fills a line.
- `src/layout/kit/value-scale.ts:170-182` (`drawCategoryNames`): one `<text>` node per line of every name.
- `src/core/definitions/categories.ts:50-55`: `name` has no length bound. `src/core/validate/structure.ts:111-118` checks strings for characters only.
- `.gener8v/changes/graph-library/tickets/data-graphs-and-pictographs/TICKET-002.md:78-80` and the same hazard on TICKET-003 and 005: "Wrap every label with `wrap(…, maxLines)`…; add a test that … half a megabyte of unit or label text renders … with a bounded number of text nodes."

**Description:**
The DGP specification says a long category name is wrapped, never truncated (Scale and Layout; DEL-005; delivery record Notes, "Text size"). The kit does that faithfully, but with no length bound on the name, the Scene grows with the name's length. GSS TICKET-002 SEC-001 capped labels and titles for this reason. Its validator-level bound, SEC-002, is still awaiting a Product Owner decision, so category names are now the one caller-text path in the layout kit with neither cap.

Probes:
- `categorySlots` and `drawCategoryNames` on a 320 × 260 box, printed with `SceneSvg` and `renderToStaticMarkup`, with `NODE_ENV=production`.
- `validateWith` on the stand-in bar graph: both a single 500,000-character name and 100 distinct 20,000-character names are valid.

| Categories × name | Body | Orientation | Text nodes | Layout + `checkScene` | Render | Markup | Markup ÷ body |
|---|---|---|---|---|---|---|---|
| 5 day names | 131 B | vertical | 5 | 0.5 ms | 1.9 ms | 1 KB | 7.7× |
| 100 × 1,000 `@` | 101 KB | vertical | 100,000 | 94 ms | 204 ms | 18.4 MB | 182× |
| 100 × 1,000 `@` | 101 KB | horizontal | 14,300 | 38 ms | 17 ms | 2.7 MB | 26× |
| 100 × 200 `"word "` | 101 KB | vertical | 40,000 | 33 ms | 45 ms | 7.4 MB | 73× |
| 1 × 100,000 `@` | 100 KB | vertical | 4,348 | 33 ms | 4 ms | 0.9 MB | 8.9× |
| 100 × 10,000 `@` | 1.0 MB | vertical | 1,000,000 | 823 ms | 2,501 ms | 185 MB | 185× |
| 100 × 17,500 `@` | 1.75 MB | vertical | 1,750,000 | 542 ms (layout) | 6,107 ms | 325 MB | 185× |
| 100 × 20,000 `@` | 2.0 MB | vertical | 2,000,000 | 554 ms (layout); heap 1.5 GB | throws `RangeError: Invalid array length` | — | — |

Compared with GSS TICKET-002:
- The circle's worst case was about 64 bytes of markup per byte of text, and SEC-001's caps removed it. Here it is about 185.
- `SceneSvg` no longer spreads its children, but between 1.75 and 2.0 million nodes React's renderer exceeds V8's array limit. A Scene that `createGraph` reported as `ok: true` then throws during render: the failure GSS TICKET-002 SEC-001 closed for labels and titles.

The type tickets' Known Hazard asks for a test showing a bounded number of text nodes with half a megabyte of label text. With this kit, that test cannot pass for category names, and nothing tells the implementer so.

**Attack Scenario:**
- **Attacker:** an author on a platform that stores descriptions and server-renders them with `<Graph>` or the bar or line-graph component. Descriptions can also arrive another way: a file import, a stored model tool result, or a content repository.
- **Steps:**
  1. Save a bar graph with 100 categories, each named with 10,000 `@` (about 1 MB, under the 1 MB defaults of Next.js and Fastify). It is valid.
  2. Every view of the page builds 1,000,000 nodes and prints 185 MB of SVG: about 3.3 s of blocked event loop and about 1 GB of heap per render.
  3. With 2 MB (a raised body limit or a file import), every render throws during `renderToString`.
- **Result:**
  - A few concurrent views exhaust a Node.js process's CPU or heap.
  - At 2 MB, the page fails with a 500, or on the client, React unmounts the root unless the consumer wrapped the graph in an error boundary.
  - Even behind Express's 100 KB default, each view costs about 0.3 s and 18 MB.
  - It persists until the description is removed.
- **Limit:**
  - It becomes reachable when DGP TICKET-002, 003 or 005 draws names with `categorySlots` and `drawCategoryNames`, as the delivery record directs.
  - The cost is linear and bounded by the consumer's body limit.
  - Nothing is disclosed.

**Impact:** Server CPU, memory and bandwidth amplification of about 185× from a stored description. Above about 2 MB, a render failure past the never-throw guard and the fallback (CPSE-REQ-018).

**Recommendation:**
1. **Bound the name, not the drawing.** Rejecting an over-long name keeps "never truncated" true, so this needs the Product Owner decision already pending from GSS TICKET-002 SEC-002, scoped here to category names. Either:
   - a `maxLength` on `StringValue`, published in the schema; or
   - a check in `checkCategories` that reports a name over N characters, built with `createIssue`.

   N should be curriculum-sized, for example 60 to 100 characters, and stated in the `name` description. With 100 categories and a 100-character bound, the vertical worst case is about 10,000 name nodes.
2. **Until then, or as well, bound the Scene inside the guard** (GSS TICKET-002 SEC-001, option 3): `createGraphWith` already walks every node in `checkScene`, so it can report `too_large` for a Scene over a fixed node count, for example 10,000. That catches every caller-sized path at once.
3. **Reconcile the Known Hazard** on DGP TICKET-002, 003 and 005: name category names explicitly, state which bound applies to them, and include them in the 500 KB test (for example 100 categories × 5 KB names).
4. **Optional, to lower the rate:** a larger `MIN_NAME_WIDTH` or rotated names, so a line holds more than one wide character; and one `group` per name carrying the font attributes, instead of repeating them on every line.

**Compliance Impact:** None
**Status:** Deferred → Product Owner decision on a caller-text length bound (GSS TICKET-002 security review SEC-002); category names cannot be cut (DGP Scale and Layout), so a bound would reject, not truncate
**Resolution:** Known Hazards appended to DGP TICKET-002, 003 and 005: the line cap does not apply to category names; they wait on the Product Owner bound; the half-megabyte test includes them and records node count and markup size. Approved by the user, 2026-10-13.

---

### SEC-003: Nothing bounds the printed size of value-scale numbers, so valid scales print tick labels of more than 300 characters, and the bound on data values exists only in the delivery record's Notes

**Severity:** Low
**Category:** Input Validation
**OWASP Reference:** A06:2025 Insecure Design. Also CWE-1284 (improper validation of specified quantity in input).
**Location:**
- `src/layout/kit/value-scale.ts:39` (`tickLabel` = `formatSupplied`, which prints every digit) and `:45-51` (`valueAxisExtent` sizes the axis from the widest label).
- `src/core/definitions/categories.ts:66-67` and `:97-103`: the scale ends and the interval have no magnitude floor.
- `src/core/value-scale.ts:212`: `checkValueScale` returns `[]` when no scale is given, so it never looks at the values on the default path.
- `src/core/value-scale.ts:155`: `valueTicks` throws on a non-finite scale.
- `.gener8v/changes/graph-library/delivery/data-graphs-and-pictographs-ticket-001-delivery.md:214` ("Bound data values to ±`VALUE_LIMIT`") and `:218` ("Tick-label width"). Neither item appears in the Known Hazards of DGP TICKET-002, 003 or 005.

**Description:**
`VALUE_LIMIT`'s own comment says it exists "so every scale computed from them prints as a plain number in the drawing". The bound holds only for magnitude, and only where a type ticket applies it.

| Case | Valid? | Result |
|---|---|---|
| `valueScale: { minimum: 5e-324, maximum: 1 }`, value `0.5` | yes | longest tick label 326 characters; vertical axis needs 2,399 units in a 400-unit drawing |
| `{ minimum: 0, maximum: 9.9e-299, tickInterval: 1e-300 }` | yes | 100 ticks, each label about 300 characters; extent 2,223 units |
| `{ maximum: 1e-300 }`, value `0` | yes | 302-character label; extent 2,223 units |
| default scale over `[1e300]` (a type that does not bound values) | — | 301-character labels |
| default scale over `[Number.MAX_VALUE]` (same) | — | the maximum overflows to `Infinity`; `valueTicks` throws, so a valid description becomes `internal_error` |

`checkScene` accepts all of these, since labels are text, not attributes. What a type layout does with an axis six times wider than the drawing is up to that layout:
- the plot may be drawn off-canvas, which is unreadable;
- or a negative width reaches `wrap`, which throws, and the description is reported as a package defect.

Output size stays bounded: at most 100 labels of about 330 characters.

The delivery record does tell the type tickets to bound values and precision, but only in its Notes. The pipeline carries such rules as Known Hazards on the tickets (`CONVENTIONS.md` §2), and the three tickets' Known Hazards do not mention either rule.

**Attack Scenario:** N/A (Low). An author can make their own figure unreadable, or have a valid description reported as `internal_error`. Nothing reaches other users, and output stays bounded.
**Impact:** Unreadable or undrawable figures for valid descriptions. A false package-defect signal if a type ticket omits the value bound.
**Recommendation:**
1. **Bound printable size in `checkValueScale`:** report `out_of_range` for a given end or interval that is non-zero and smaller than 1e-9 in magnitude (the scale's own `MIN_CHOSEN_INTERVAL`), or whose `formatSupplied` text is longer than about 24 characters. State the rule in the `valueScale` description.
2. **Check values on every path:** before the `given === undefined` return, report any value beyond ±`VALUE_LIMIT` as `out_of_range` at its own path. A type that forgets the bound in its value spec then still never reaches `valueTicks`'s throw.
3. **Move the Notes into Known Hazards:** append "bound every value spec to ±`VALUE_LIMIT`" and "tick labels print supplied values in full; keep value precision bounded" to DGP TICKET-002, 003 and 005.
4. **Test:** the three valid cases above give an issue, or a vertical extent under about 120 units.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** `checkValueScale` reports a non-zero given minimum, maximum or tick interval smaller than 1e-9 as `out_of_range` (the interval after the `too_many_ticks` count, whose suggestion is more useful); ticks and chosen ends take a leftover far below the interval as 0 (`onGrid`), found by the property test (a 36-character label). The scale-end descriptions say "0, or at least 0.000000001 in size". Known Hazards on DGP TICKET-002, 003, 005: bound data values to ±`VALUE_LIMIT`. Approved by the user, 2026-10-13.

---

### SEC-004: At extreme tick intervals the scale checks report `NaN` at a path the caller never gave, suggest "Infinity", or accept an interval that does not divide the scale

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** A10:2025 Mishandling of Exceptional Conditions
**Location:**
- `src/core/value-scale.ts:117`, `:123-124`, `:135-136`: `resolveValueScale` divides by the given interval, with no finiteness check on the result.
- `src/core/value-scale.ts:222-232`: the `out_of_range` branch reports `/valueScale/maximum`.
- `src/core/value-scale.ts:243`: `fittingSpacing: niceInterval(span, …)` with `span` = `Infinity`.
- `src/core/value-scale.ts:59`, `:68-71`: `isWhole` uses an absolute tolerance below 1, so any ratio under 1e-9 counts as the whole number 0, and `intervalsIn` reports it `exact`.

**Description:**
`tickInterval` has no lower bound, so that 0 and negative values reach `checkTickInterval`. A tiny positive interval passes that check and reaches `checkValueScale`. Probes through `validateWith` on the stand-in registry:

| Description (line graph unless noted) | Issue reported |
|---|---|
| `valueScale: { tickInterval: 5e-324 }`, values `[-5, 3]` | `out_of_range /valueScale/maximum`: "valueScale.maximum must be a number; got NaN." No maximum was given, and the interval is not mentioned |
| `{ tickInterval: 5e-324 }`, values `[5, 3]` (bar) | `too_many_ticks`: "would draw 9007199254740991 ticks … use a larger tick spacing, such as Infinity." |
| `{ maximum: 0.35, tickInterval: 2e9 }`, value `0.1` (bar) | none: valid. The 2e9 interval does not divide 0..0.35, which DGP-REQ-008 says to report; the axis is drawn as 0 and 0.35 and the given interval is ignored |

In the random fuzz, 164 of 72,900 accepted given scales had a tick interval longer than the whole scale.

Every case fails closed or draws a sane axis, so nothing is exploitable. The cost is wrong feedback: the package's issues are what a model or an author reads to fix a description (GSV-REQ-031), so a model told to fix `valueScale.maximum` will change the wrong property.

**Attack Scenario:** N/A (Informational)
**Impact:** Misleading issues for extreme intervals, and a DGP-REQ-008 rule not enforced at the edge.
**Recommendation:**
- In `checkValueScale`, treat a non-finite resolved scale with a given interval as `too_many_ticks` at `/valueScale/tickInterval`, with `fittingSpacing` computed from a finite span (the given ends, or the data's extent).
- Count an interval as dividing only when `count >= 1`, or use a tolerance relative to the interval for the remainder.
- Add the three descriptions above to `tests/core/categories.test.ts`.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** An interval too fine for the scale is counted before the scale is resolved, so it is `too_many_ticks` with a finite count and suggestion (no `NaN`, no `Infinity`); `intervalsIn` needs at least one whole interval to call it dividing (`{ maximum: 0.35, tickInterval: 2e9 }` → `tick_interval_not_dividing`). Tests in `tests/core/categories.test.ts`. Approved by the user, 2026-10-13.

---

### SEC-005: The duplicate-name check compares code points, so canonically equivalent or invisibly different names pass as different categories

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** N/A. Related to CWE-1289 (improper validation of unsafe equivalence in input) and CWE-176 (improper handling of Unicode encoding).
**Location:** `src/core/definitions/categories.ts:132-133`: names are compared after `cleanText` only.
**Description:**
`cleanText` replaces line breaks, drops the characters the plain-text policy forbids, collapses runs of ASCII spaces and trims. It does not normalise, and it keeps the invisible characters the policy allows. Each pair below draws and reads the same, yet `validateWith` reported the line graph valid with no `duplicate_name`:
- `Café` (U+00E9) and `Café` (`e` + U+0301);
- `Mon` and `Mon` + U+200D (zero-width joiner);
- `Mon` and `Mo` + U+200C + `n`;
- `Mon` and `Mon` + U+FE0F (variation selector);
- `Mon` and `Mon` + U+034F (combining grapheme joiner);
- `Mon` and `Mon` + U+3164 (Hangul filler);
- `Mon day` and `Mon` + two U+3000 + `day`.

A trailing no-break space is caught, because `trim` removes it. Homoglyphs (`MON` against `M` + Cyrillic `О` + `N`) also pass. Those need confusable detection (UTS #39) and are out of scope here.

The DGP Edge Cases want a repeated name reported, so readers can tell categories apart. These variants defeat that without any forbidden character. The author already controls the figure's data, so this gives an attacker little, which is why it is Informational.

**Attack Scenario:** N/A (Informational)
**Impact:** Two categories that look and read identically can be drawn and stated in the text alternative, defeating the duplicate rule.
**Recommendation:**
- Compare a key, not the drawn text: `cleanText(name).normalize("NFC")`, with `\p{Default_Ignorable_Code_Point}` removed (this covers U+200C, U+200D, U+034F, U+FE00–U+FE0F and the Hangul fillers) and every `\s+` run collapsed to one space. Keep the name as written for drawing and messages.
- Document that homoglyphs are not detected.
- Add the pairs above to `tests/core/categories.test.ts`.

TICKET-002 can reuse the same key for series labels, as DEL-003 anticipates.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Duplicate names are compared by `nameKey`: cleaned, NFC-normalised, default-ignorable characters removed, spaces collapsed; drawn as written. Letter case still differs; cross-script lookalikes are not detected (stated in the doc comment). Six tests in `tests/core/categories.test.ts`. Approved by the user, 2026-10-13.

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Fix (bounded loop + reject) | Bounded tick loop; safe-index guard; span-resolution check; regression and property tests; Known Hazard | No | `src/core/value-scale.ts`, `tests/layout/kit/value-scale.test.ts`, DGP `TICKET-002.md`, `TICKET-003.md` |
| SEC-002 | Defer → Product Owner (caller-text length bound) | Known Hazards reconciled for category names | No | DGP `TICKET-002.md`, `TICKET-003.md`, `TICKET-005.md` |
| SEC-003 | Fix | Tiny given parts rejected; near-zero leftovers snapped to 0; descriptions; Known Hazards on value bounds | No | `src/core/value-scale.ts`, `src/core/definitions/categories.ts`, `tests/layout/kit/value-scale.test.ts`, DGP tickets |
| SEC-004 | Fix | Fine intervals counted first (finite `too_many_ticks`); dividing needs one whole interval | No | `src/core/value-scale.ts`, `tests/core/categories.test.ts` |
| SEC-005 | Fix | `nameKey`: NFC, default-ignorables removed, spaces collapsed | No | `src/core/definitions/categories.ts`, `tests/core/categories.test.ts` |

## Verdict

**Result:** Approved with Notes
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:**
- SEC-001 (High), SEC-003, SEC-004 and SEC-005 are fixed and re-verified. Each fix fails its tests when broken on purpose. The new property test found two more cases during resolution, a near-zero leftover tick and a tiny given interval, and both are fixed with their own tests.
- SEC-002 (Medium) is deferred to the Product Owner's caller-text length decision, already open from GSS TICKET-002 SEC-002. Category names cannot be cut, so the remedy is a length bound that rejects. The type tickets' Known Hazards now say so, and their large-text test must include category names.
- Re-verification: `pnpm generate`, `lint`, `typecheck`, `build`, `check:dist`, `check:deps`, `size`, `publint`, `attw`, `audit` and `gener8v-state lint` exit 0. `pnpm test` (30 files, 852 tests) exits 0 on two of three runs; the third failed only `tests/layout/circle.test.ts`' 2,000 ms timing bound (2,033 ms), a load flake outside this ticket.
- Dependency audit: `pnpm audit`, 2026-10-13, no known vulnerabilities.
