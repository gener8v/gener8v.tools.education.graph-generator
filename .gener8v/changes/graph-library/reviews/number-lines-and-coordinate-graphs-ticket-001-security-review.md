# TICKET-001: Build the axis and tick foundation shared by all three axis-based graph types — Security Review

## Summary

This review covers the delivery of `graph-library/number-lines-and-coordinate-graphs/TICKET-001` at HEAD of branch `ticket/nlc-001` (`ac2ff1f`): the delivery commit `841bb5e`, the code-review resolution `33e1c92` and the quality-review resolution `ac2ff1f`. The code reviewed is the code as it stands now, including both reviews' Post-Review Amendments:
- `axisCheck` is now `axisDomainChecks`, two checks, and the definitions' parameter is `term` (CR-002, QR-006);
- `isTickValue`, `drawableTicks` and `AXIS_NOISE` are new (CR-001, CR-006, CR-007, QR-005);
- ticks are cleaned at the spacing's own precision (`axisTick`, QR-002);
- `drawAxis` moves labels clear of a sloping line (QR-007).

The `security-reviewer` agent ran the findings phase in a fresh context on 2026-10-20.

Nothing in the package reaches this code yet:
- no registered graph type uses the axis group;
- no file in `dist/` contains `drawAxis`, `niceTicks`, `drawableTicks`, `isTickValue` or `axisDomainChecks`;
- the kit is internal, with no public export.

Its attack surface is therefore what NLC TICKET-002, 003 and 004 will expose: an untrusted or model-written description validated through `axisDomainChecks`, then drawn with `niceTicks` and `drawAxis`. Probed in memory, most of it holds:
- **Tick arithmetic.** Tick counts are computed, never listed. Spacings of `5e-324`, `1e-300` and `2.2250738585072014e-308` on ±1e9 ends are reported as `too_many_ticks` in under 1 ms each. `drawableTicks` returned `undefined`, never threw, and never listed more than 100 ticks on 28 adversarial inputs, including `NaN`, ±`Infinity`, `-0`, subnormal ends and ends near 1e308.
- **Validated axes draw.** 200,000 random axes gave 75,945 valid ones. Every one of them drew through `niceTicks` and `drawAxis` on six orientations with no throw and a clean `checkScene`, at most 100 ticks, and at most 0.98 ms each.
- **Markup.** Every attribute number goes through `fmt()`, so no `NaN`, `Infinity` or exponent form reaches an attribute. Hostile label strings reach the SVG only as escaped text.
- **Messages.** Issue messages quote numbers only.
- **Dependencies.** `pnpm audit` is clean, and the lockfile is unchanged.

The findings:
- **SEC-001 (Low):** a tick spacing far larger than a range near zero yields a tick at 0 that is outside the range. It is drawn up to about two million axis lengths past the axis, and it can also fall inside the 400-unit drawing, where it reads as a 0 the axis does not reach.
- **SEC-002 (Informational):** `drawAxis` reads its optional `labels` through the prototype chain. A polluted `Object.prototype` then writes text on every axis drawn without custom labels, or makes each one an `internal_error`. The same exposure exists in two more places: `axisChecks` with a plain object, and, outside this delivery, `rangeOf`/`rangeBroken`, which this ticket's minimum-less `tickSpacing` exposes.
- **SEC-003 (Informational):** custom tick labels are drawn whole on one line, with no length bound or cut, and moved out by half their width on a sloping axis.
- **SEC-004 (Informational):** `drawAxis` and the tick helpers trust their callers. Unchecked options draw `-NaN` and `Infinity` labels, unbounded tick and label counts, 309-digit labels, and labels 6e10 units off the page.

Four findings: 0 Critical, 0 High, 0 Medium, 1 Low, 3 Informational.

**Reviewer:** `security-reviewer` agent, fresh context (findings phase only, 2026-10-20)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/number-lines-and-coordinate-graphs-ticket-001-delivery.md` (DEL-001..DEL-004, Notes, Post-Review Amendments CR-001..007 and QR-001..007)

**Files Reviewed:**
- `src/core/value-scale.ts` (modified: `AXIS_DEFAULT_INTERVALS`, `AXIS_NOISE`, `isMultiple`, `isTickValue`, `multiplesIn`, `axisTooNarrow`, `tickCount`, `axisSpacing`, `axisTick`, `drawableTicks`, `niceTicks`, `decimalPlaces`, `axisTickLabel`; `tooManyTicks` exported with its path and term)
- `src/core/definitions/axis.ts`
- `src/layout/kit/ticks.ts`
- `src/layout/kit/axis.ts`
- `tests/core/axis.test.ts`
- `tests/layout/kit/ticks.test.ts`
- `tests/layout/kit/axis.test.ts`
- Read unchanged, because the delivered code's values flow into them:
  - `src/layout/kit/format.ts` (`fmt`), `src/layout/kit/scale.ts` (`linearScale`), `src/layout/kit/text.ts` (`textWidth`, `wrap`), `src/layout/kit/check.ts` (`checkScene`), `src/layout/kit/value-scale.ts` (`TICK_LABEL_DROP`);
  - `src/layout/scene.ts` and `src/react/SceneSvg.tsx` (the printer and its escaping);
  - `src/core/issues.ts` (`createIssue`, `describeValue`, `describeNumber`, `normalizeRange`), `src/core/format.ts` (`formatSupplied`, `cleanText`), `src/core/style.ts`;
  - `src/core/validate/index.ts`, `structure.ts`, `domain.ts`, `state.ts`, `numbers.ts`, `json.ts`, `envelope.ts`, and `src/core/definitions/types.ts` (`defineProperties`, `propertySpec`);
  - `package.json`, `vitest.config.ts`, `tests/setup/build.ts`.

Context read:
- the ticket and its Known Hazards, including the carried GSS TICKET-001 SEC-002 (±1e9 axis bound);
- NLC TICKET-002, 003 and 004's Known Hazards, for what the consumers are already told;
- the NLC specification's NLC-REQ-019 and NLC-REQ-020 (custom tick labels are the number line's only);
- the delivery record;
- `.gener8v/constraints/prd.md`. There is no `constraints/number-lines-and-coordinate-graphs.md`;
- `.gener8v/technical-design/system-design.md`: AD-004, AD-007, AD-008 and AD-014;
- `.gener8v/context.md` and `.gener8v/CONVENTIONS.md`;
- the resolved code and quality reviews for this ticket. Their findings are not raised again: CR-001's ticks off the range far from zero, CR-006's throwing `niceTicks`, CR-007's label matching, and QR-002's tick precision;
- the earlier security reviews in this change, for the threat model and house style, especially GSS TICKET-001 (SEC-002, carried here) and DGP TICKET-003 (SEC-003, the own-key rule for optional option fields).

**Review environment note:**
- **How I probed:**
  - Every probe was an inline `TSX_DISABLE_CACHE=1 npx tsx -e '…'` run from the repository root.
  - Validation probes used a test-only registry built like `tests/core/axis.test.ts:8-17`: one `xy-graph` definition with `axisProperty("xAxis", "x")` and `...axisDomainChecks("xAxis")`.
  - Each pollution probe ran in a fresh process. Where load order mattered, it polluted `Object.prototype` (non-enumerable) before a dynamic import of the modules.
  - Bundles were built with esbuild's API and `write: false`.
  - The scratch directory held one probe script and three logs.
- **Runtime:** Node.js v24.1.0, pnpm 10.28.2, Vitest 5.0.3, macOS (Darwin 25.6.0).
- **Commands run in the repository:**

| Command | Exit | Evidence |
|---|---|---|
| `pnpm audit` | 0 | No known vulnerabilities found |
| `pnpm audit --prod` | 0 | No known vulnerabilities found |
| `pnpm lint` | 0 | — |
| `pnpm typecheck` | 0 | `tsc --noEmit` |
| `pnpm test --no-cache`, first run | 0 | 45 files, 1,169 tests passed. Its global setup (`tests/setup/build.ts`) runs `pnpm build`, which rewrites the git-ignored `dist/` |
| `pnpm test --no-cache`, second run | 1 | 1 of 1,169 failed: the QR-002 property in `tests/layout/kit/ticks.test.ts:63-77`. See the note below |
| `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache tests/layout/kit/ticks.test.ts`, 35 times | 1 on 8 runs | Every failure was the same QR-002 property |
| `pnpm check:dist` | 0 | 14 built files scanned, no network APIs or modules |
| `pnpm check:deps` | 0 | 0 runtime dependencies |
| Each of the four source files piped to `npx eslint --no-cache --stdin`, with `import "react"`, `fetch(…)` or `document.title` prepended (12 runs) | 1 each | `no-restricted-imports` with the AD-001 / prd/TC-005 message, or `no-restricted-globals` with the CPSE-REQ-005 / prd/CC-003 message. Unmodified, each exits 0 |

- **Not a security finding:** the QR-002 property ("keeps ticks far from zero on their multiples", `tests/layout/kit/ticks.test.ts:63-77`) is flaky. It failed in 9 of 37 runs, for example with counterexample `[0.01849959450125, 0.0025, 8]`.
  - The code is right. The tick and its label are `18499594.505`.
  - The test's expected value, `min + i * step` (`:73`), is one ulp off (`18499594.505000003`), and its tolerance, `step * 1e-6` = 2.5e-9, is smaller than one ulp at 1.8e7 (3.7e-9).
  - The record's "1,169 tests exit 0 on three runs" was therefore luck. This is for the resolution session or the quality review.
- **Not run:**
  - `pnpm size` and `pnpm generate`, as instructed;
  - `pnpm build` on its own, since the test setup ran it twice;
  - `pnpm bench`.
- **Tree check:** `git status --short` before and after every command and probe showed only ` M .gener8v/pipeline-state.yaml` and ` M .gener8v/runs.jsonl`, and this report once written.

**Findings:** 4
**Critical:** 0 | **High:** 0 | **Medium:** 0 | **Low:** 1 | **Informational:** 3

## Security Assessment

### Input Validation

**Status:** Gaps Found
**Notes:**
**Entry points:**
- **Public:** none yet. `validate`, `normalize`, `describe` and `createGraph` will reach the axis group once NLC TICKET-002, 003 or 004 registers a type that uses `axisProperty` and `axisDomainChecks`.
- **Internal:** the kit's `drawAxis`, `niceTicks`, `tickLabel`, `isTickValue` and `tickCount`, through `src/layout/kit/ticks.ts`, and core's `drawableTicks`, `axisChecks` and `tooManyTicks`. Only package code calls them, and only the tests call them today.

**Caller-controlled values this delivery reads:**

| Value | Validation | Where it goes |
|---|---|---|
| `<axis>.min`, `<axis>.max` | Required; a finite number from −1e9 to 1e9 (`src/core/definitions/axis.ts:29-44`); `min < max` by structure (`ordered`, reported once at `/…/max`); a range narrower than a billionth of its larger end (and than 1e-9) is `out_of_range` with a valid suggested end (`:88-97`, `:117-119`) | `drawableTicks` / `niceTicks`; `drawAxis`'s `domain` (`linearScale`) |
| `<axis>.tickSpacing` | Optional; a finite number at most 2e9, with deliberately no structural minimum (`:45-51`); 0 or less is `tick_spacing_invalid` (`:125`); more than 100 ticks is `too_many_ticks`, counted arithmetically (`:126-128`) | the tick list; label decimals (`decimalPlaces`); custom-label matching (`isTickValue`) |
| `<axis>.showTickLabels` | Optional boolean; absent means shown (DEL-004) | `drawAxis`'s `showTickLabels` |
| custom tick labels (NLC-REQ-019, TICKET-002) | Not defined yet. The Notes say to clean them with `cleanText` | `drawAxis`'s `labels`, drawn as `TextNode.text` (SEC-003) |

**What is handled well:**
- **Structure:**
  - Only finite numbers pass. `NaN`, `Infinity` and `"0"` are `wrong_kind` at their own path.
  - Ends beyond ±1e9 and a spacing over 2e9 are `out_of_range`, and `-0` as a spacing is `tick_spacing_invalid` ("got 0").
  - `JSON.parse`d `__proto__`, `constructor` and `toString` keys inside an axis are `unknown_property`. A `__proto__` holding `{ "tickSpacing": 1e-300 }` changed nothing else.
  - The normalized axis is a null-prototype object, so the domain checks and layouts read `tickSpacing` and `showTickLabels` from it own-key. Polluting `Object.prototype.tickSpacing`, `showTickLabels`, `presentation`, `ordered`, `exclusiveMin` or `exclusiveMax` changed no validation result. `min` is the exception (SEC-002).
- **Domain checks** (the GSV TICKET-004 SEC-004 hazard):
  - Both checks declare exactly what they read (`src/core/definitions/axis.ts:140`, `:145`, pinned by `tests/core/axis.test.ts:143-149`), build every issue with `createIssue`, and do constant work.
  - **Probe** through `validateWith`:
    - [0, 1] by `5e-324` took 0.74 ms;
    - [−1e9, 1e9] by `5e-324` and by `1e-300` took about 0.1 ms each;
    - [999999999, 1e9] by `2.2250738585072014e-308` took 0.06 ms.
    - Each is `too_many_ticks`. An overflowing count is reported as 9007199254740991, and the spacing suggested is finite.
- **Tick listing:**
  - `drawableTicks` (`src/core/value-scale.ts:435-446`) checks finite, increasing ends, range resolution, a finite positive spacing, safe-integer indices and the 100-tick limit, all before its loop, which is bounded by that count.
  - **Probe** with 28 direct inputs: `NaN` and ±`Infinity` in each position, spacings `0`, `-0`, `5e-324`, `1e-310`, `2e9` and `1.9999999999e9`, ends `±5e-324`, ±1e9 and ±1.7e308. Each returned `undefined` or at most 100 ticks, and nothing threw. `niceTicks` threw its `RangeError` exactly when `drawableTicks` returned `undefined`.
  - Spacings near the 2e9 limit on ±1e9 ends give the single tick 0, labelled "0".
- **Valid axes draw:**
  - **Fuzz:** 200,000 random axes, with ends drawn from a pool holding subnormals, ±1e9, `999999999.9999999`, ⅓ and ⅔, and spacings from 1e-11 to 1e9 plus `5e-324` and `2e9`. 75,945 were valid.
  - Each valid axis went through `niceTicks`, then `drawAxis` on one of six orientations: horizontal, vertical, two diagonals, and two within 1e-7 units of vertical or horizontal.
  - Results:
    - no throw and no `checkScene` problem;
    - at most 100 ticks and labels of at most 30 characters;
    - at most 0.98 ms per description, validation included.
  - The coordinates far outside the drawing all came from SEC-001's tick.
- **The too-narrow suggestion:** 111,981 random narrow ranges, including subnormal ends and ends at and near ±1e9. `axisChecks` never threw, and every suggested end was finite, within ±1e9, and valid on its own (CR-003 holds).
- **Numbers in the drawing:**
  - Every attribute number in `drawAxis` goes through `fmt()` (`src/layout/kit/axis.ts:40-50`, `:106-115`), which refuses `NaN`, ±`Infinity` and magnitudes from 1e21, and rounds a subnormal to 0. No exponent form or `-0` can reach an attribute.
  - A `NaN` coordinate fails closed with `RangeError`, which `createGraph` turns into the fixed `internal_error`.
  - `fill`, `stroke`, `font-family` and `text-anchor` are package constants.
- **Labels:**
  - `axisTickLabel` never prints exponent form or "-0" for a finite tick. Its `toFixed` precision is capped at 100.
  - The CR and QR probes cover the 0.25 → "0.75" rule. At the validated bounds the longest label I saw was 30 characters.
- **Markup:**
  - **Probe:** ten hostile strings as custom labels, cleaned and raw, rendered through `SceneSvg` with `renderToStaticMarkup`: `</text><script>…`, `" onload="…`, CDATA, `&amp;&lt;`, U+202E, NUL and ESC, a template expression, `url(#x)`, `javascript:` and a CSS escape.
  - Every one appears only as escaped text content. No attribute held label text, no `<script` or `onload` element appeared, and `globalThis.pwned` was never set.
  - Uncleaned U+202E, NUL and ESC do pass through `drawAxis` into the text. The validator's plain-text policy rejects them in descriptions, and the record's Notes tell TICKET-002 to `cleanText` labels, so this is not raised.
- **Custom-label lookup (`labelAt`, `src/layout/kit/axis.ts:83-86`):**
  - It is O(ticks × labels), but ticks are capped at 100 and labels by the 10,000-value description limit.
  - 100 ticks with 3,333 or 10,000 labels, none on a tick (the worst case), took 7.8 ms and 15.3 ms.
  - `[...labels]` spreads into an array, not into call arguments, so the GSS TICKET-002 SEC-001 hazard does not apply.
  - Only a direct call reaches larger inputs (SEC-004).
- **Messages:**
  - The axis issues quote only numbers (`describeValue`, `describeNumber`), and their terms are package-authored (`` `${term}.tickSpacing` ``).
  - Several messages print exponent form, for example "at least 1.000001e-9", "such as 1e-9" and "got -1e+308". That is plain text in a message, never in markup, so it is a readability matter and not raised.

**Gaps:**
- **SEC-001:** a phantom tick at 0 outside a range near zero, on a valid description.
- **SEC-002:** prototype-chain reads of `labels` (`drawAxis`), of `tickSpacing` (`axisChecks` on a plain object), and, outside this delivery, of `min` (`rangeOf`/`rangeBroken`).
- **SEC-003:** custom labels drawn whole, with no bound.
- **SEC-004:** the kit trusts unchecked options.

**Not applicable:** SQL, NoSQL, command and template injection, and path traversal. The delivered code has no query, shell, template engine or file path.

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** This is library code, with no server, accounts, sessions or permissions (`.gener8v/context.md`: "no user accounts").

### Data Protection

**Status:** Adequate
**Notes:**
- **Sensitive data:** none. The library logs, stores and sends nothing.
- **Issues:** they carry numbers, package-authored terms and JSON Pointers only. `describeTerm` and `formatIssue` quote anything that is not term-shaped (unchanged here).
- **Exceptions:** `niceTicks` and `fmt()` throw `RangeError` with numbers in the message, and `createGraph` replaces any layout exception with the fixed `internal_error` (GSV TICKET-002 SEC-003). None occurred for a valid, unpolluted description in any probe.
- **Secret scan:** I scanned the 941 lines that `git diff fd7fedf HEAD -- src tests` adds. The patterns:
  - keys, tokens, passwords and private keys;
  - AWS, GitHub, npm and Slack token shapes;
  - URLs, `fetch`, `XMLHttpRequest`, `WebSocket` and `EventSource`;
  - `eval` and `Function(`, `innerHTML` and `dangerouslySetInnerHTML`, `document.` and `window.`;
  - storage, `console.`, `process.env`, `child_process`, `require(` and `import(`;
  - `__proto__`, `.prototype` and `Object.assign`;
  - timers, `Math.random` and `crypto`.

  The only match is the test's null-prototype registry (`tests/core/axis.test.ts:17`, `Object.assign(Object.create(null), …)`).

### Configuration Security

**Status:** Adequate
**Notes:**
- **Manifest:** `git diff fd7fedf HEAD` shows no change to `package.json`, `pnpm-lock.yaml`, `eslint.config.js`, `tsup.config.ts`, `.size-limit.json` or `.github/`. `sideEffects: false` and `files: ["dist"]` stand, and the `exports` map has no `./*` pattern.
- **Module load:** importing the four modules left the own property names of `globalThis`, `Object.prototype`, `Array.prototype` and `Map.prototype` unchanged.
- **Tree-shaking** (esbuild, in memory):
  - a bare import of the four modules bundles to 0 bytes;
  - unused named imports of `drawAxis` and `axisProperties` bundle to 0 bytes;
  - using `axisProperties` gives 1,818 bytes. It is marked `/* @__PURE__ */` (`src/core/definitions/axis.ts:28`).
- **Immutability:**
  - `axisProperties` and each of its specs are frozen with a null prototype (`defineProperties`).
  - `axisProperty()` returns a fresh, unfrozen plain object (`:66-75`). A definition's own `defineProperties` copies it to a frozen null-prototype spec, as the test's does. The GSV CR-002 Known Hazard on TICKET-002..004 already requires that.
- **Built output:**
  - No new axis identifier is in `dist/`. The only change there is the data graphs' `tooManyTicks` taking its path and term (`dist/chunk-3BKES4FL.js`). The code review checked that the data graphs' results are unchanged.
  - `check:dist` and `check:deps` pass.
- **Secrets and defaults:** none. The new limits (±1e9, 2e9, 100 ticks, 19 intervals) are shared constants, stated in the published descriptions.
- **Cryptography:** not applicable. No randomness or cryptographic function is used.
- **Logging and monitoring:** not applicable. The package logs nothing (AD-014), and the delivery adds no logger.

**Dependency audit:** `pnpm audit` (pnpm 10.28.2, Node.js v24.1.0), run 2026-10-20 14:45 UTC in the repository against the HEAD lockfile (`ac2ff1f`), read-only.
- `pnpm audit`: `No known vulnerabilities found`, exit 0.
- `pnpm audit --prod`: `No known vulnerabilities found`, exit 0. The package has no runtime dependencies; `react` is a peer.
- This delivery does not change the lockfile.

**Carried Known Hazards (security-relevant):**

| Hazard | Result |
|---|---|
| GSS TICKET-001 SEC-002: bound every axis minimum, maximum and tick spacing; report `out_of_range`; state it in the descriptions | Honoured by the validator: `min`/`max` ±1e9 and `tickSpacing` ≤ 2e9, all stated in the descriptions (`src/core/definitions/axis.ts:35`, `:43`, `:50`); tested at `tests/core/axis.test.ts:53-56`. Every coordinate a valid axis yields is finite and below `fmt()`'s 1e21. The kit's own "can this axis be drawn" decision does not apply the bound (SEC-004) |
| Ticket: the 100-tick limit computed arithmetically, never by listing | Honoured: `tickCount` and `multiplesIn` are arithmetic, and `drawableTicks` lists only after counting. The constant-time probe is above |
| Ticket and GSV TICKET-003 CR-002: `ordered`; `min ≥ max` reported once; no tick check on a broken range (AD-004) | Honoured: `axisProperty` declares `ordered`; a failed `max` skips both checks, and a failed spacing skips only the spacing check (CR-002) |
| GSV TICKET-004 CR-003 / SEC-004: `inputs`, frozen description, `createIssue`, work by size not magnitude | Honoured (see Input Validation) |
| GSV TICKET-003 SEC-001: `maxItems` on every array | Not applicable: no array spec in this delivery. Custom labels arrive with TICKET-002 |
| DGP TICKET-003 SEC-003: read later optional fields of option objects own-key | Not honoured for `AxisOptions.labels` (SEC-002) |
| GSS TICKET-002 SEC-001: no caller-sized spreads; wrap and cap every label | No argument spread. Custom tick labels are drawn uncut (SEC-003) |
| CPSE TICKET-002 SEC-003: `fmt()` on extreme values fails closed; `createGraph` catches | Holds. `linearScale`'s wide-domain `NaN` (outside this delivery) still reproduces, for example `drawAxis` over [−1.7e308, 1.7e308], but the ±1e9 bound keeps it unreachable |
| CR-006 / QR-005 resolution: checks use `drawableTicks`, which never throws | Holds on every adversarial input probed |

**Compliance cross-reference:** checked against `.gener8v/constraints/prd.md`. No per-area constraints file exists. The ticket names prd/TC-001, TC-002 and TC-005.

| Constraint | Result |
|---|---|
| prd/CC-001 (licenses) | Met: no dependency, asset or font added; `check:deps` reports 0 runtime dependencies |
| prd/CC-002 (WCAG 2.1 AA, non-text content) | Not applicable yet: the axis has no text alternative of its own. NLC TICKET-002..004 carry it. SEC-001's phantom "0" is a correctness matter for the figure, not a missing alternative |
| prd/CC-003 (no data collection or network) | Met: `check:dist` is clean, the added lines hold no network API, and the boundary lint rejects `fetch` in all four modules (probed) |
| prd/CC-004 (no trademarked imagery) | Not applicable |
| prd/TC-001 (no DOM measurement) | Met: label clearance uses `textWidth` estimates only (`src/layout/kit/axis.ts:97`) |
| prd/TC-002 (rounding) | Met: every attribute number goes through `fmt()`, and `checkScene` was clean on every probe Scene |
| prd/TC-005 (no React or browser globals in non-rendering code) | Met: `pnpm lint` passes, and `import "react"` or `document.title` prepended to any of the four modules fails the boundary rule |
| prd/TC-007 (side-effect-free, tree-shakable) | Met: an unused import bundles to 0 bytes |

No CC-XXX violation was found, so no finding is raised to Critical.

## Findings

### SEC-001: A tick spacing far larger than a range near zero gives a phantom tick at 0 outside the range, drawn up to about two million axis lengths beyond the axis

**Severity:** Low
**Category:** Input Validation
**OWASP Reference:** N/A. Related to A10:2025 Mishandling of Exceptional Conditions and CWE-1339 (insufficient precision or accuracy of a real number).
**Location:**
- `src/core/value-scale.ts:357`, `:360-361`: `isMultiple` allows `AXIS_NOISE × max(|value|, spacing)`. The `spacing` term lets `k = 0` count as "on" an end up to 1e-12 × spacing away from zero, though `0 × spacing` carries no noise at all.
- `src/core/value-scale.ts:376-383`: `multiplesIn` then takes `first = last = 0` for a range that does not contain 0.
- `src/core/value-scale.ts:435-446`: `drawableTicks` and `niceTicks` list that tick, against their own doc comment ("every whole multiple `k × spacing` inside `[min, max]`", `:423-425`).
- `src/core/definitions/axis.ts:127-128`: the validator counts the same phantom, so it reports nothing.
- `src/layout/kit/axis.ts:90-117`: `drawAxis` draws the tick and its "0" label wherever `linearScale` puts it, with no clamp to the axis.

**Description:**
The condition is an end within 1e-12 × spacing of zero, on the same side of it as the other end. With the largest valid spacing, 2e9, that is any range within 0.002 of zero. A range only has to be 1e-9 wide there (`axisTooNarrow`), so the phantom can sit up to 2e-3 / 1e-9 = 2 × 10⁶ axis lengths from the axis.

**Probe** (every description valid through `axisDomainChecks`, drawn on a 360-unit horizontal axis from x = 20):

| Axis | `tickCount` | Ticks | Tick and label "0" at |
|---|---|---|---|
| `{ min: 0.001, max: 0.002, tickSpacing: 2e9 }` | 1 | `[0]` | x = −340 |
| `{ min: 0.0019, max: 0.0019000011, tickSpacing: 2e9 }` | 1 | `[0]` | x = −621,818,161.85 |
| `{ min: -0.002, max: -0.0019999989, tickSpacing: 2e9 }` | 1 | `[0]` | x = 654,545,474.58 |
| `{ min: 1e-7, max: 2e-7, tickSpacing: 1e6 }` | 1 | `[0]` | x = −340 |
| `{ min: 0.2, max: 0.8, tickSpacing: 1 }` (control) | 0 | `[]` | — |

A phantom can also land inside the drawing. On [0.0001, 0.002] by 2e9, the "0" is drawn at x ≈ 1, just before the axis starts, on an axis that begins at 0.0001.

**Further probes:**
- **Frequency:** in 396,276 random drawable axes biased toward small ends and large spacings, 86,301 ticks lay outside their range. Every one was this phantom 0. The worst was 1.836 × 10⁶ axis lengths out.
- **The fix:** changing only the allowance to `1e-12 × max(|value|, |k × spacing|)` changed the tick count on 1,465 of 199,924 ordinary ranges (decimal spacings, ends on and off the grid, out to ±1e9), and each of those was a phantom-zero case.
- **Not escalated:**
  - Nothing throws, since even 1.2e9 units is far below `fmt()`'s 1e21, and `checkScene` stays clean.
  - The count stays at 1, so there is no exhaustion.

**Attack Scenario:**
- **Who and what access:** an author or a model-driven tool that writes number-line or x,y descriptions, once NLC TICKET-002 or 003 registers the axis.
- **Steps:** it submits `{ "axis": { "min": 0.0019, "max": 0.0019000011, "tickSpacing": 2000000000 } }`. Or it writes a near-zero range with a spacing larger than the range, by mistake or to probe the renderer.
- **Result:**
  - The description validates and renders.
  - The Scene carries a tick and a "0" label 6.2 × 10⁸ units outside a 400-unit drawing. A layout that sizes its drawing or label room from what it draws would then produce an effectively blank figure.
  - On a slightly wider range, the "0" appears inside the drawing beside an axis that does not reach 0.
  - TICKET-002's `tick_label_not_on_tick` check is required to use `drawableTicks` with `isTickValue`. It would accept a custom label at 0 on such an axis, though 0 is outside the range, which NLC-REQ-020's report exists to catch.

**Impact:** integrity of the drawn figure only. A tick and label state a value the axis excludes, and coordinates up to about 1.2 × 10⁹ units are written into the Scene. No data is disclosed, nothing throws, and the cost per render is unchanged. The defect is latent until a type registers the axis group.
**Recommendation:**
1. **Measure the allowance against the multiple, not the spacing:** `Math.abs(k * spacing - value) <= AXIS_NOISE * Math.max(Math.abs(value), Math.abs(k * spacing))`. A `k = 0` multiple then counts as on an end only when the end is 0. Re-run CR-001's far-from-zero cases (`tests/layout/kit/ticks.test.ts:80-100`) and the multiples property, which my probe suggests are unaffected.
2. **Or, as well, keep only ticks inside the range** in `drawableTicks`: drop any tick below `min` or above `max` by more than the noise allowance. That keeps the doc comment's promise whatever the arithmetic.
3. **Add a test:** [0.001, 0.002] by 2e9, and [0.0019, 0.0019000011] by 2e9, have no ticks, `tickCount` 0, and `drawAxis` draws nothing outside its two ends.
4. **Optional, in `drawAxis`:** skip a tick whose position `t` lies outside [0, 1] by more than a rounding margin. Then no caller can draw a tick off its axis.

**Compliance Impact:** None. prd/TC-002 holds: every phantom coordinate goes through `fmt()`.
**Status:** Resolved
**Resolution:** Fixed — `isMultiple` (`src/core/value-scale.ts`) measures its allowance against the multiple, `1e-12 × max(|value|, |k × spacing|)`, so `0 × spacing` is on an end only when the end is 0. `drawableTicks` also drops any tick outside `[min, max]` by more than decimal noise. Tests: the five probe ranges have `tickCount` 0 and no ticks; an end at 0 keeps its tick; a property over near-zero ranges and large spacings finds no tick outside the range; `drawAxis` draws only its line for [0.001, 0.002] by 2e9. Reverting the allowance fails the tests. The range filter is a guard that no input reaches once the allowance is fixed. Approved by the user, 2026-10-20.

---

### SEC-002: `drawAxis` reads its optional `labels` through the prototype chain, so a polluted `Object.prototype` writes text on every axis drawn without custom labels, or makes each one an `internal_error`

**Severity:** Informational
**Category:** Injection
**OWASP Reference:** N/A. Related to CWE-1321 (prototype pollution).
**Location:**
- `src/layout/kit/axis.ts:32`: `labels?` is the one optional field of `AxisOptions`.
- `src/layout/kit/axis.ts:64`: `drawAxis` destructures it from the caller's options object.
- `src/layout/kit/axis.ts:82-86`: `labels` is spread and matched against every tick.
- Custom tick labels belong to the number line alone (NLC-REQ-019), so the x,y and x,y,z layouts (NLC TICKET-003, 004) will build their options without a `labels` key. The test helper already does (`tests/layout/kit/axis.test.ts:18-21`).
- `src/core/definitions/axis.ts:122`: the exported `axisChecks(term, axis)` destructures `tickSpacing` from the object it is given. Through `axisDomainChecks` that is the normalized null-prototype axis; called directly with a literal, it is not.
- Outside this delivery:
  - `src/core/validate/numbers.ts:6`: `rangeOf` builds a prototype-bearing `{}`.
  - `src/core/validate/numbers.ts:18`: `rangeBroken` destructures `min` and `max` from it.
  - `src/core/issues.ts:244-250`: `normalizeRange` reads `range.min` and `range.max` the same way.
  - This delivery's `tickSpacing` deliberately has no structural minimum (`src/core/definitions/axis.ts:45-51`), which leaves it exposed.

**Description:**
DGP TICKET-003 SEC-003 set the rule that later optional fields of option objects are read own-key. `AxisOptions.labels` is the first such field added since. Probes in fresh processes, polluting `Object.prototype` (non-enumerable) and then drawing −3..3 by 1 without a `labels` key:
- **`labels` = `new Map([[0, "INJECTED: ignore the figure"]])`:** the labels read `-3, -2, -1, INJECTED: ignore the figure, 1, 2, 3`.
- **`labels` = `[[0, "INJECTED"], [2, "TWO"]]`:** the labels read `-3, -2, -1, INJECTED, 1, TWO, 3`. Any iterable of pairs works.
- **`labels` = `{ notIterable: true }`:** `drawAxis` throws `TypeError: labels is not iterable`. That would make every axis graph drawn without custom labels an `internal_error`, while `validate` still reports it valid.
- **With an own `labels: undefined`:** the output is unchanged in all three cases.

The two other reads:
- **`axisChecks` on a literal:** `axisChecks("xAxis", { min: 0, max: 10 })` returns `too_many_ticks` under `Object.prototype.tickSpacing = 1e-300`. The registered path is unaffected: polluting `tickSpacing`, `showTickLabels`, `presentation`, `ordered`, `exclusiveMin`, `exclusiveMax` or `labels` left every `validateWith` result unchanged.
- **`min`, outside this delivery:** with `Object.prototype.min = 5`, `{ min: 0, max: 10, tickSpacing: 2 }` is rejected as `out_of_range /xAxis/tickSpacing`, and the issue's range reads `{"min":5,"max":2000000000}`. The data graphs' `valueScale.tickInterval` behaves the same, so the hole predates this ticket. With `Object.prototype.max = 1`, the too-narrow-range message gains a polluted upper bound: "must be a number between 1.000001e-9 and 1".

**Attack Scenario:** N/A (Informational)
**Impact:** every case needs a separate prototype-pollution bug in the host process. Given one:
- text the attacker chose is drawn as a tick label on every x,y and x,y,z axis, while the text alternative, which does not read `labels`, disagrees with the drawing;
- or every such graph renders as `internal_error`;
- or, through `rangeOf`, every axis with a tick spacing, and every data graph with a tick interval, is refused as invalid.

Nothing is disclosed.
**Recommendation:**
- **Make `labels` a required key** whose value may be `undefined` (`readonly labels: ReadonlyMap<number, string> | undefined`), so every call site writes it as an own property. Or read it own-key: `const labels = Object.hasOwn(options, "labels") ? options.labels : undefined`. Either way, also require `labels instanceof Map` before spreading.
- **In `axisChecks`,** read `tickSpacing` own-key, or state in its doc comment that `axis` must be the normalized (null-prototype) axis.
- **Outside this delivery, as a follow-up for the GSV validator:** build `rangeOf`'s range on a null prototype, and read `min`, `max`, `exclusiveMin` and `exclusiveMax` own-key in `rangeBroken` and `normalizeRange`. It affects the data graphs too, so it belongs on its own ticket, not in this delivery.
- **Add pollution tests** beside DGP TICKET-003's:
  - `Object.prototype.labels` set to a Map and to a non-iterable, expecting the unpolluted labels;
  - `Object.prototype.min = 5` with a valid tick spacing, expecting a valid result.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed in the kit; the validator part is deferred. `drawAxis` reads `labels` own-key and requires a `Map` (with SEC-004's guard). `axisChecks` reads `tickSpacing` own-key. Pollution tests: `Object.prototype.labels` as a Map, an array of pairs and a non-iterable leaves the labels unchanged; `Object.prototype.tickSpacing = 1e-300` adds no issue. Reverting either read fails its test. Deferred → its own ticket (GSV validator follow-up, affecting the data graphs too): build `rangeOf`'s range on a null prototype, and read `min`, `max`, `exclusiveMin` and `exclusiveMax` own-key in `rangeBroken` and `normalizeRange`. Approved by the user, 2026-10-20.

---

### SEC-003: `drawAxis` draws each custom tick label whole on one line, with no length bound or cut, and moves it out by half its width on a sloping axis

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** N/A. Related to CWE-400 (uncontrolled resource consumption).
**Location:**
- `src/layout/kit/axis.ts:27-32`: `labels` text is "already cleaned by the caller"; nothing says it is bounded.
- `src/layout/kit/axis.ts:96-117`: each label becomes one `TextNode` with the full text.
- `src/layout/kit/axis.ts:79-80`, `:97`: `climb(textWidth(text, fontSize))` moves a label out by half its estimated width times the slope.
- Delivery record `## Notes`: "Custom tick labels (`labels`) are drawn as given: clean them with `cleanText` first". It says nothing about length.
- `.gener8v/changes/graph-library/tickets/number-lines-and-coordinate-graphs/TICKET-002.md` Known Hazards (GSS TICKET-002 SEC-001): "Wrap every label with `wrap(text, maxWidth, fontSize, maxLines)` … so the Scene stays small however long the description's text". `drawAxis` has no way to do that for tick labels.

**Description:**
The kit draws a custom label as one line, uncut, at the tick. **Probe** (100 ticks, horizontal unless stated):

| Labels | Time | Text in the Scene | Furthest coordinate |
|---|---|---|---|
| one of 1,000,000 characters | 7.4 ms | 1,000,190 characters | 380 (the text itself is estimated at about 12.5 million units wide, in a 400-unit drawing) |
| the same, axis sloping 30°, side `below` | 7.3 ms | 1,000,190 characters | 3,597,342 (the label is moved 3.6 million units below the axis) |
| 100 of 100,000 characters | 69.6 ms | 10,000,000 characters | 380 |

**What bounds it today:**
- The description value limit counts values, not characters.
- No custom-label term exists yet, so its `maxLength` is TICKET-002's decision. Its Known Hazards ask for wrapped, capped labels but name `wrap`, which `drawAxis` cannot use for a tick label.

The markup grows linearly with the description, so this is not an amplification beyond the text the description already holds.

**Attack Scenario:** N/A (Informational)
**Impact:** once TICKET-002 registers custom tick labels without a length bound, a description of a few megabytes draws as a Scene of the same size, with labels running far off the drawing. Any layout that sizes its drawing or label room from label widths grows with them. The text alternative will repeat the text, printed twice (`aria-label` and `<title>`), which the CPSE TICKET-007 cap hazard already covers. No markup or attribute injection is possible: the text is escaped.
**Recommendation:**
- **Add a Known Hazard to NLC TICKET-002:**
  - give the custom-label text spec a curriculum-sized `maxLength` (tick labels are short: "½", "a", "−¾"; for example 40 characters), and state it in the description text;
  - cut each label to one line before it reaches `drawAxis`, with `wrap(text, maxWidth, fontSize, 1)`, so a longer one ends in "…";
  - add the half-megabyte label test the GSS TICKET-002 SEC-001 hazard asks for, with a bounded text length.
- **Or enforce it in the kit:** have `drawAxis` cut each custom label to one line of a stated width, for example the on-page distance between neighbouring ticks or a `maxLabelWidth` option. Compute `climb` from the cut label, and say so in the `labels` doc comment.

**Compliance Impact:** None
**Status:** Deferred
**Resolution:** Deferred → NLC TICKET-002 — a Known Hazard appended to `tickets/number-lines-and-coordinate-graphs/TICKET-002.md`: a curriculum-sized `maxLength` on the custom-label term, stated in its description; each label cut to one line before `drawAxis`; tests at and past the limit. Approved by the user, 2026-10-20.

---

### SEC-004: `drawAxis` and the tick helpers trust their callers: unchecked options draw `-NaN` and `Infinity` labels, unbounded tick and label counts, 309-digit labels and labels 6e10 units off the page

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** N/A. Related to A10:2025 Mishandling of Exceptional Conditions and CWE-20 (improper input validation).
**Location:**
- `src/layout/kit/axis.ts:63-122`: `drawAxis` checks none of `from`, `to`, `domain`, `ticks`, `spacing` or `side`.
- `src/layout/kit/scale.ts:15-18`: a zero-width or non-finite domain maps every value to the middle, so `fmt()` sees finite coordinates even for `NaN` ticks.
- `src/core/value-scale.ts:473-476`: `axisTickLabel` passes non-finite values to `formatSupplied`, and `src/core/format.ts:42-47` prints `NaN` as "-NaN". That is pre-existing.
- `src/core/value-scale.ts:368`: `isTickValue` with an infinite spacing matches every value.
- `src/core/value-scale.ts:435-441`: `drawableTicks`, "the one decision on whether an axis can be drawn" (QR-005), does not apply ±`AXIS_LIMIT` or the 2e9 spacing bound. It lists 100 ticks for [1e300, 1e308] by 1e306.
- `src/layout/kit/axis.ts:79-80`: `climb` divides by the axis's horizontal (or vertical) direction once it is above 1e-9, so a side that does not match the axis's direction moves a label by up to 1e9 times its width.

**Description:**
Reached only by a direct call that skips `niceTicks` or the validator. **Probes:**
- **Degenerate domain:** `domain: [0, 0]` or `[NaN, 1]` with `ticks: [NaN, Infinity, -Infinity]` draws the labels "-NaN", "Infinity" and "-Infinity" at the middle of the axis, and `checkScene` is clean, since it does not read text. With a sound domain, a `NaN` tick fails closed: `fmt()` throws.
- **Infinite spacing:** `spacing: Infinity` with one custom label at 3 writes that label on every tick. `spacing: NaN` matches none.
- **No count bound:**
  - 100,000 ticks draw 200,001 nodes in 53 ms;
  - with 1,000 labels, none on a tick, they take 1.36 s;
  - 100 ticks with 1,000,000 labels take 1.73 s (`labelAt` is O(ticks × labels)).
- **No value bound:** [1e300, 1e308] by 1e306 lists 100 ticks through `drawableTicks`, and `drawAxis` labels them with 309-digit numbers.
- **Side against direction:** `side: "below"` on an axis 1e-7 off vertical puts its label at y = 59,400,000,104.75. That is still under `fmt()`'s bound, so it is drawn silently. At 1e-9 off vertical the climb is 0, so the placement jumps at that threshold.

**Attack Scenario:** N/A (Informational)
**Impact:** none from a description today. Every value that reaches `drawAxis` through the validator and `niceTicks` is finite, increasing, within ±1e9 and at most 100 ticks. The risk is a later layout, including the `rulers` change, that builds options another way or picks `side` by rule on an isometric axis. It would draw nonsense text or very large Scenes without failing closed, unlike `niceTicks`, which throws.
**Recommendation:**
- **Guard `drawAxis` at its top,** throwing `RangeError` like `niceTicks`, so a layout bug becomes the fixed `internal_error` rather than a wrong drawing. It is O(ticks):
  - finite `from` and `to`;
  - a finite, increasing `domain`;
  - a finite `spacing` above 0;
  - `ticks.length <= MAX_VALUE_TICKS`, every tick finite;
  - `labels`, when given, a `Map` of at most a stated size.
- **Either make `drawableTicks` apply** the validator's bounds (ends within ±`AXIS_LIMIT`, spacing at most 2 × `AXIS_LIMIT`), so it is truly the one decision, **or say in its doc comment** that the bounds are the validator's.
- **Have `axisTickLabel` refuse a non-finite value.** Separately, `formatSupplied(NaN)` returning "-NaN" (`src/core/format.ts:42`) is a small pre-existing defect.
- **Optional:**
  - state in `AxisSide`'s doc comment that `below`/`above` are for axes within 45° of horizontal, and throw when the side and the direction disagree;
  - match custom labels by snapping each label once to its tick index, so `labelAt` is O(ticks + labels).

**Compliance Impact:** None. prd/TC-002 holds: the off-page coordinates still pass through `fmt()`.
**Status:** Resolved
**Resolution:** Fixed — `drawAxis` throws `RangeError` (`checkedLabels`, `src/layout/kit/axis.ts`) on non-finite ends, a domain that is not finite or does not increase, a spacing that is not a finite number above 0, more than `MAX_VALUE_TICKS` ticks or a non-finite tick, and labels that are not a `Map` of at most `MAX_VALUE_TICKS` entries. `createGraph` turns that into the fixed `internal_error`. `axisTickLabel` throws on a non-finite value. `drawableTicks`' doc comment says the ±1e9 end and spacing bounds are the validator's. Nine guard tests and three label tests; removing the guard, the `Map` check or the label check fails them. The optional side-against-direction check and O(ticks + labels) matching were not taken. Approved by the user, 2026-10-20.

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Fixed | Allowance against the multiple; out-of-range ticks dropped; tests | No | `src/core/value-scale.ts`, `tests/layout/kit/ticks.test.ts`, `tests/layout/kit/axis.test.ts` |
| SEC-002 | Fixed (kit); validator part Deferred → its own ticket | `labels` and `tickSpacing` read own-key; pollution tests | No | `src/layout/kit/axis.ts`, `src/core/definitions/axis.ts`, `tests/layout/kit/axis.test.ts`, `tests/core/axis.test.ts` |
| SEC-003 | Deferred → NLC TICKET-002 | Known Hazard: `maxLength`, one-line cut, tests | No | `tickets/number-lines-and-coordinate-graphs/TICKET-002.md` |
| SEC-004 | Fixed | `drawAxis` guard; `axisTickLabel` refuses non-finite values; `drawableTicks` doc comment; tests | No | `src/layout/kit/axis.ts`, `src/core/value-scale.ts`, `tests/layout/kit/axis.test.ts`, `tests/layout/kit/ticks.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:**
- SEC-001, SEC-002 (the kit part) and SEC-004 are fixed and re-verified. SEC-003 is carried to NLC TICKET-002, which defines the custom-label term. SEC-002's validator part (`rangeOf`/`rangeBroken`/`normalizeRange`) predates this ticket, affects the data graphs too, and is deferred to its own ticket.
- The QR-002 property's flakiness, found in the findings phase, is fixed: its tolerance now allows for the rounding of its own expected value. 60 runs of the tick and axis tests pass, and the delivery record's Post-Review Amendments say the earlier three-run passes were luck.
- Re-verification: `pnpm generate` (no change), `lint`, `typecheck`, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size`, `publint`, `attw`, `audit` and `gener8v-state lint` exit 0. `pnpm test` (1,185 tests) exits 0 on three runs.
- Dependency audit: `pnpm audit` and `pnpm audit --prod`, 2026-10-20, no known vulnerabilities.
