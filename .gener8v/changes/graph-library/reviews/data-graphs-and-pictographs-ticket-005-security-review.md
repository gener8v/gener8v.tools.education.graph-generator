# TICKET-005: Pictograph — Security Review

## Summary

This review covers the delivery of `graph-library/data-graphs-and-pictographs/TICKET-005` at HEAD of branch `ticket/dgp-005` (`3687c99`): delivery commit `b877264`, the code-review resolution `3683daa` and the quality-review resolution `3687c99`. That last commit includes the shared-kit changes: rotated names, `rotate()`, `widestWord`, `slotSize` and `NAME_GAP`. The `security-reviewer` agent ran the findings phase in a fresh context on 2026-10-15.

The pictograph is the first registered type that draws pictures and category names, so the image set (DGP TICKET-004) and the category kit (DGP TICKET-001) can now be reached through `createGraph`, `<Graph>`, `<Pictograph>`, `validate` and `describe`, and both are in `dist/`. Most of the new surface is sound:
- **Picture cap:** the provisional cap of 400 pictures is counted arithmetically before anything is drawn. Over 20,000 fuzzed descriptions, including subnormal unit values and values at ±1e9 with decimal noise, no valid description drew more than 400 pictures and none became `internal_error`. The 106-byte description from DGP TICKET-004 SEC-003 is now `too_large`. At the cap, a description costs at most about 3,700 nodes and 260 KB of markup.
- **Image lookup and pollution:** `unitImage` is checked against the enum before `images` (null prototype) is read. A polluted `Object.prototype` changed nothing in the Scene.
- **Markup:** caller text reaches the markup only as text. 288 fixture descriptions produced no markup, control or direction characters, and no attribute value held caller text.
- **Dependencies:** the lockfile is unchanged, and `pnpm audit` is clean.

The findings are about caller-sized category names, which the pictograph now ships, and one assumption the crop makes about the host page:
- **SEC-001 (Medium):** category names still have no length bound (DGP TICKET-001 SEC-002, deferred to the Product Owner). The deferred path is now live.
  - Below a vertical plot, names made of narrow words are wrapped one word per line: about one text node per two bytes.
  - A valid 1 MB description costs about 1.8 s and 95 MB of markup per render.
  - At 4 MB, `<Pictograph>` throws `RangeError: Invalid array length` past its fallback.
  - The half-megabyte figure recorded for the Product Owner understates this case by about 7.5 times.
- **SEC-002 (Low):** every row is as tall as the tallest name, and a rotated name drops below the plot by its full width. An 11.8 KB description draws a figure 5,146 times taller than it is wide (2,058,210 drawing units).
- **SEC-003 (Informational):** the partial picture is cropped only by the user-agent default `overflow: hidden` on nested `<svg>`. A host-page rule such as `svg { overflow: visible }` would draw every partial picture whole, so 2.5 would look like 3.

Three findings: 0 Critical, 0 High, 1 Medium, 1 Low, 1 Informational.

**Reviewer:** `security-reviewer` agent, fresh context (findings phase only, 2026-10-15)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/data-graphs-and-pictographs-ticket-005-delivery.md` (DEL-001..005, Notes, Post-Review Amendments CR-001..008 and QR-001..007)

**Files Reviewed:**
- `src/core/definitions/pictograph.ts`
- `src/core/definitions/index.ts`
- `src/core/definitions/types.ts` (`EnumValue.unknownCode`, `ALWAYS_RUNS`, `DomainCheck.inputs`)
- `src/core/definitions/categories.ts` (`valuesPerCategoryCheck`, `valueUnitLabel` description)
- `src/core/validate/structure.ts` (`checkValue`, `enum` branch)
- `src/core/issues.ts` (`unknown_image`, `too_large`)
- `src/core/format.ts` (`isUnitShaped`, `stateMeasurement`)
- `src/layout/pictograph.ts`
- `src/layout/registry.ts`
- `src/layout/kit/value-scale.ts` (`categorySlots`, `rotatedLines`, `rotatedNameLines`, `drawCategoryNames`, `NAME_GAP`, `slotSize`)
- `src/layout/kit/format.ts` (`rotate`)
- `src/layout/kit/text.ts` (`widestWord`, `textWidth`)
- `src/react/graphs/PictographGraph.tsx`, `src/entries/pictograph.ts`, `src/index.ts`
- `package.json`, `tsup.config.ts`, `.size-limit.json`
- `examples/pictograph.json`, `examples/invalid/pictograph-unknown-image.json`, `examples/invalid/pictograph-zero-unit.json`
- `src/generated/schema.json`, `src/generated/tool-schema.json`, `src/generated/vocabulary.json`, `src/generated/description.ts` (the pictograph branch)
- `tests/core/pictograph.test.ts`, `tests/layout/pictograph.test.ts`, `tests/react/Graph.test.tsx` (the pictograph cases), `tests/package/per-type-bundle.test.ts` (the pictograph cases), `tests/core/validate-domain.test.ts`, `tests/layout/kit/value-scale.test.ts`, `tests/core/categories.test.ts` (the changed cases)

Context read:
- the ticket's Constraints and Known Hazards, including those carried from GSV TICKET-001, 003, 004 and 005, GSS TICKET-002, and DGP TICKET-001 and 004;
- the delivery record, with its Decisions, Notes and both Post-Review Amendments;
- the resolved code review and quality review for this ticket. Neither is raised again. SEC-001 starts from figures CR-005 recorded. SEC-002 concerns the drawn size, not the geometry QR-001 and QR-002 settled;
- `.gener8v/constraints/prd.md` (there is no `constraints/data-graphs-and-pictographs.md`);
- `.gener8v/technical-design/system-design.md`: AD-002, AD-004, AD-008, AD-011, AD-012, AD-014;
- `.gener8v/context.md`, `.gener8v/CONVENTIONS.md`;
- the DGP specification's Pictograph Units, Scale and Layout rules, Edge Cases and OQ-004;
- every earlier security review in this change, especially DGP TICKET-001 and 004, GSS TICKET-002 and CPSE TICKET-002 and 003. These are not raised again:
  - the accepted risks CPSE TICKET-002 SEC-004 (`placeLabel` cost) and CPSE TICKET-003 SEC-005 (validation on every render);
  - the settled unit-quoting rule of GSS TICKET-002 SEC-003.

  SEC-001 builds on DGP TICKET-001 SEC-002, which is still deferred to the Product Owner's caller-text length decision (GSS TICKET-002 SEC-002), because this delivery makes that path live.

Code this delivery depends on, read unchanged:
- `src/graph.ts` (`createGraphWith`);
- `src/core/validate/index.ts`, `domain.ts`, `state.ts`, `suggest.ts`;
- `src/core/value-scale.ts` (`intervalsIn`);
- `src/images/index.ts`;
- `src/layout/scene.ts`, `src/layout/kit/check.ts`, `src/layout/kit/title.ts`;
- `src/react/SceneSvg.tsx`;
- `src/tool/index.ts` and `src/export/index.ts`, which are still empty stubs. The tool handler and source export are therefore not reviewed here.

**Review environment note:**
- **How I probed:** every probe was an inline script, `node_modules/.bin/tsx -e '…'`, run from the repository root with `TSX_DISABLE_CACHE=1` so that tsx wrote no cache. Probes imported `./src/…`, `./examples/pictograph.json`, `./tests/fixtures/plain-text.ts` and the installed `react` and `react-dom/server`. Render timings used `NODE_ENV=production`. Probes that could exhaust memory ran in fresh processes under `timeout`. No file was written. No browser was run, because a headless browser writes a profile directory.
- **Runtime:** Node.js v24.1.0, pnpm 10.28.2, macOS (Darwin 25.6.0), default heap.
- **Commands run in the repository** (read-only apart from the git-ignored `dist/`, which the test setup rebuilds):

| Command | Exit | Evidence |
|---|---|---|
| `pnpm audit` | 0 | No known vulnerabilities found |
| `pnpm audit --prod` | 0 | No known vulnerabilities found |
| `pnpm lint` | 0 | `eslint .`, no output |
| `pnpm typecheck` | 0 | `tsc --noEmit`, no output |
| `pnpm test` (two runs) | 0 | 35 files, 972 tests passed (6.83 s). The global setup ran `pnpm build` (tsup), which rewrote `dist/` |
| `pnpm check:dist` | 0 | "Built files scanned: 10, no network APIs or network modules." |
| `pnpm check:deps` | 0 | "Runtime dependencies: 0, all justified." |
| `pnpm check:images` | 0 | "Images: 8 (apple, ball, book, fish, flower, person, star, tree), every license recorded and allowed (MIT, CC0-1.0)." |

- **Not run:**
  - `pnpm size`: its `@size-limit/rolldown` plugin bundles into the operating system's temporary directory. The delivery record gives `./pictograph` as 17.61 kB of 25 kB.
  - `pnpm generate`: it writes source.
- **Tree check:** `git status --short` before and after every command and probe showed only the pre-existing modification to `.gener8v/runs.jsonl`, plus this report once written.

**Findings:** 3
**Critical:** 0 | **High:** 0 | **Medium:** 1 | **Low:** 1 | **Informational:** 1

## Security Assessment

### Input Validation

**Status:** Gaps Found
**Notes:**
**Entry points:** no new core function. The pictograph is reached through:
- `validate`, `normalize` and `describe` on `./core`;
- `createGraph`, `Graph` and `Pictograph` on `.`;
- `Pictograph` on the new `./pictograph` entry.

`./tool` and `./export` are still empty, so no model tool handler or exporter runs this code yet. Whatever the tool handler becomes will call `validate` and `createGraph`, which are reviewed here.

**Caller-controlled values this delivery reads:**

| Value | Validation | Where it goes |
|---|---|---|
| `categories` | list, `maxItems` 100; at least one; distinct names (`nameKey`) | one row or column each |
| `categories[i].name` | plain-text policy; required; **no length bound** | wrapped names with no line cap, or rotated (SEC-001, SEC-002); quoted in the text alternative |
| `values` | list, `maxItems` 100; each a finite number from 0 to 1,000,000,000; one per category (`valuesPerCategoryCheck`) | picture counts (`imageCount`); printed exactly in the text alternative |
| `unitImage` | enum of the 8 published names; outside it, `unknown_image` | `images[p.unitImage]` (`src/layout/pictograph.ts:123`); its name in the key and the text alternative |
| `unitValue` | finite, greater than 0, at most 1,000,000,000 | counts; key (`formatSupplied`); text alternative |
| `orientation` | enum `horizontal`, `vertical` | layout branch |
| `valueUnitLabel` | plain-text policy; `""` dropped | key (wrapped, at most 2 lines); text alternative (after each value when unit-shaped, otherwise once and quoted) |
| `title` | plain-text policy; `""` dropped | `titleBlock` (at most 3 lines); text alternative, quoted |

**What is handled well:**
- **The picture cap (DEL-001, CR-001):**
  - `src/core/definitions/pictograph.ts:135-148` sums `imagesDrawn(imageCount(value, unitValue))` per value. That is constant work per value, never an enumeration.
  - The layout sizes rows from the same `imagesDrawn` (QR-005), so the cap bounds what is drawn.
  - The check is skipped only when `values/*` or `unitValue` failed. Every issue makes a description invalid (`src/core/validate/index.ts`), so a skipped cap never reaches the layout.
  - `intervalsIn` returns `Infinity` for an overflowing ratio, and `Infinity − Infinity` is `NaN`. The fraction test `fraction > 0` then yields 0, the total stays `Infinity`, and the check reports `too_large` with no `count` (QR-007).
  - **Probe:** 20,000 fuzzed descriptions through `createGraph`, with these inputs:
    - 1–100 categories;
    - unit values from `5e-324` to 1e9;
    - values at the cap with noise of ±1e-15, ±1e-10 and 1e-7;
    - subnormal values and values of 1e9;
    - both orientations.

    Results: 8,197 valid, 11,803 `too_large`, 0 `internal_error`, 0 other issues. No valid Scene drew more than 400 pictures (the largest drew 373).
  - **Cost at the cap:**
    - 1 category of 399.5 flowers: 3,611 nodes, 233 KB of markup, about 15 ms through `createGraph` and render.
    - 100 categories of 3.5 flowers each: 3,710 nodes, 257–263 KB.

    That is about 1,800 times a 129-byte body, but bounded.
- **Unpublished image names (DEL-004):**
  - The enum check runs before any lookup, and `images` has a null prototype.
  - `__proto__`, `constructor`, `toString`, `hasOwnProperty` and `valueOf` are each `unknown_image`.
  - A `JSON.parse`d `__proto__` key is `unknown_property /__proto__`.
  - The issue carries `code`, `path`, `message`, `allowed` and `suggestion` only, not the caller's raw value. Its message quotes the value, clips it to 40 characters and escapes it: `"apple\u0000"` is printed with the escape, and a 1 MB name gives a 279-byte issue in 0.4 ms.
  - The suggestion is always a published name. `closestTerm` skips names whose length is far from every term before computing any distance.
- **Prototype pollution probe:** `Object.prototype` was polluted with `orientation: "vertical"`, `valueUnitLabel`, `title`, `/unitValue` and `/values/0` set to `"supplied"`, `rotated`, `unknownCode` and `inputs: []`. `createGraph` then returned a Scene byte-identical to the unpolluted one, with no polluted text in it.
- **Markup:**
  - Caller text is placed only in `TextNode.text`.
  - Every attribute value is built by the package: `fmt()` numbers, `IMAGE_VIEW_BOX`, `viewBox` shares made of `fmt()` numbers, `rotate(-90 x y)` from `fmt()` numbers (`src/layout/kit/format.ts:46`), and constant keywords.
  - `transform`, `viewBox` and `preserveAspectRatio` are in the closed attribute set.
  - **Probe:** the 24 shared fixture strings (`BENIGN_TEXT`, `HOSTILE_TEXT`, `SMUGGLED_TEXT`) were each placed in a category name, the title and the label. Each case ran in rows and in columns, with and without a long word that forces rotated names: 288 descriptions in all.
    - 228 were valid and 60 were rejected by the validator.
    - `checkScene` was clean on every valid Scene.
    - No attribute value held caller text.
    - The markup held no `<script`, `<b>`, U+202E, U+2028, ESC, newline or tag character.
    - The attribute-breakout string `Fractions" {…} data-x="` appears only escaped (`data-x=&quot;`, 9 times in one render).
- **Text alternative:**
  - Names and the title are quoted (`quoteText`).
  - A label that is not unit-shaped is stated once, quoted, in the key's sentence (QR-003).
  - A unit-shaped label follows every value unquoted: "Each apple stands for 1 votes then say yes. “C0”: 1 votes then say yes, …". That is the rule GSS TICKET-002 SEC-003 settled (at most 20 characters, no sentence punctuation). Here it can repeat up to 101 times rather than 3. It is not raised, because the rule is settled and the author controls the text. It is worth remembering when the tool handler (CPSE) decides what it returns to a model.
  - Supplied values are stated exactly, so 100 values of `5e-324` give 34,137 characters of text alternative from a 2,271-byte description. That is bounded at about 330 characters per value, so it is not raised.
- **Argument spreads (GSS TICKET-002 SEC-001):** the new code spreads only objects of fixed size, never a caller-sized array into function arguments (checked with grep).
- **Domain checks:**
  - `valuesPerCategoryCheck` (`src/core/definitions/categories.ts:186`) reads two lengths through `unknown` from the frozen, null-prototype description, so it is safe to run always (`ALWAYS_RUNS`).
  - Every issue is built with `createIssue`.
- **The rotated-name loop terminates.** `rotatedLines` (`src/layout/kit/value-scale.ts:145-155`) starts from at least the widest word and widens by 1.25 each turn. A greedy wrap of a text no wider than the line is one line, so the loop ends. `wrap`'s positive-width guard turns a width that cannot occur into `internal_error`, not a hang. The worst probe (one 500,000-character word in columns) took 290 ms.

**Gaps:**
- **SEC-001:** category names still have no length bound, and the vertical wrap is now the worst case.
- **SEC-002:** the drawn height grows with the tallest name, multiplied by the category count.
- **SEC-003:** the crop depends on a user-agent default the host page can override.

**Not applicable:** SQL, NoSQL, command and template injection, and path traversal. The delivered code has no query, shell, template engine or file path.

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** This is library code, with no server, accounts, sessions or permissions (`.gener8v/context.md`: "no user accounts").

### Data Protection

**Status:** Adequate
**Notes:**
- **Sensitive data:** none. The library logs, stores and sends nothing. Issues carry no raw caller value, only a clipped, escaped quotation in the message.
- **Exceptions:** layout exceptions become the fixed `internal_error` (`src/graph.ts:42-46`). None occurred for valid input in the fuzz.
- **Secret scan:** I scanned the lines added by `git diff 94506a4..HEAD` outside `.gener8v/`. The patterns:
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
  - `package.json` gains only `exports["./pictograph"]`; `tsup.config.ts` gains its entry, and `.size-limit.json` gives it 25 kB.
  - No dependency, script, override or `files` entry changed, and `pnpm-lock.yaml` is unchanged since `94506a4`.
  - `sideEffects: false` stands. The definition is built in a `@__NO_SIDE_EFFECTS__` factory (DEL-002), so the circle's bundle still carries no drawing (bundle test).
- **Built output:**
  - `check:dist` scanned 10 files and found no network API.
  - `./core` now carries the eight drawings and the kit's `fmt` (DEL-002). That adds no capability, only static data.
  - The image-module import rule from DGP TICKET-004 SEC-002 still applies.
- **Secrets and defaults:** none. The new limits are constants, stated in the published descriptions: 400 pictures, 100 categories, values up to 1,000,000,000.
- **Cryptography:** not applicable.
- **Logging and monitoring:** not applicable. The package logs nothing (AD-014), and the delivery adds no logger.

**Dependency audit:** `pnpm audit` (pnpm 10.28.2, Node.js v24.1.0), run 2026-10-15 14:23 UTC in the repository against the HEAD lockfile (`3687c99`), read-only.
- `pnpm audit`: `No known vulnerabilities found`, exit 0.
- `pnpm audit --prod`: `No known vulnerabilities found`, exit 0. The package has no runtime dependencies; `react` is a peer.
- This delivery does not change the lockfile.
- **Images:** no image was added or changed. `pnpm check:images` passes.

**Carried Known Hazards (security-relevant):**

| Hazard | Result |
|---|---|
| GSV TICKET-003 SEC-001: `maxItems` on every array; limits in the description text | Honoured: `categories` and `values` have `maxItems` 100, and the definition's description states 100 categories and 400 pictures |
| GSV TICKET-004 CR-003 / SEC-004: `inputs` paths, frozen description, `createIssue`, work by size not magnitude | Honoured: the cap is counted arithmetically, and the length check is `ALWAYS_RUNS` and reads lengths only |
| GSS TICKET-002 SEC-001: no argument spreads; wrap labels with `maxLines`; titles with `titleBlock`; a half-megabyte test | Honoured for the title (3 lines) and the key (2 lines); half a megabyte of label and title gives at most 7 text nodes. Category names are exempt by design (SEC-001) |
| GSS TICKET-002 SEC-003: `stateMeasurement` in `describe` | Honoured: a unit that is not unit-shaped is quoted and stated once (QR-003) |
| DGP TICKET-001 SEC-002: include category names in the half-megabyte test and record the node count and markup size | Followed for one horizontal name of words (33,335 nodes, 7.5 MB). The worst shipped case is about 7.5 times that (SEC-001) |
| DGP TICKET-001 SEC-003: bound data values to ±`VALUE_LIMIT` | Honoured: values from 0 to 1e9, and `unitValue` in (0, 1e9] |
| DGP TICKET-004 SEC-003: count units arithmetically, `too_large` above a provisional limit, test it | Honoured: 400 (lowered from 1,000 by CR-001), tested at the boundary and at `5e-324`, `1e-300` and `1e-12`; flagged for the Product Owner (OQ-004) |
| DGP TICKET-004 SEC-003, recommendation 4: look images up only in `images`, after the enum check | Honoured (`src/layout/pictograph.ts:123`; `src/core/validate/structure.ts:127-142`) |
| AD-008 / prd/TC-003: no ids; crop with a nested viewport | Honoured: no ids, no `url(`, no clip paths. The crop relies on a user-agent default (SEC-003) |
| DGP TICKET-004 SEC-004: exported files print the MIT notice (`IMAGE_LICENSE_NOTICES`) | Not yet applicable: `./export` is empty. The delivery record's Notes carry the hazard to CPSE TICKET-005 |

**Compliance cross-reference:** checked against `.gener8v/constraints/prd.md`. No per-area constraints file exists. The ticket names prd/TC-003, TC-007 and TC-009.

| Constraint | Result |
|---|---|
| prd/CC-001 (licenses; bundled assets) | Met: no dependency or asset added; `check:images` passes. The notice for exported files belongs to CPSE TICKET-005 |
| prd/CC-002 (WCAG 2.1 AA, non-text content) | Met: every Scene has a text alternative naming the type, title, image, unit value and label, and every category with its value. The drawing colours are unchanged from DGP TICKET-004. SEC-001 and SEC-002 are availability and size problems, not missing alternatives |
| prd/CC-003 (no data collection or network) | Met: `check:dist` is clean, and no network API appears in the added lines |
| prd/CC-004 (no trademarked imagery) | Not affected: no image added |
| prd/TC-002 (rounding) | Met: every number goes through `fmt()`, and `checkScene` was clean on every probe Scene |
| prd/TC-003 / AD-008 (ids) | Met: no ids or references. See SEC-003 for the crop's dependence on host styles |
| prd/TC-005 (core without React) | Met: the boundaries tests pass in `pnpm test` |
| prd/TC-007 (side-effect-free, per-type entries) | Met: the bundle tests pass |
| prd/TC-009 (exported files embed images) | Met for the Scene: each picture's children are the image's own nodes |
| prd/TC-011 (computed wrapping) | Met: the kit's `wrap`, now with rotation below crowded columns |

No CC-XXX violation was found, so no finding is raised to Critical.

## Findings

### SEC-001: The pictograph ships unbounded category names: below a vertical plot a valid 4 MB description makes `<Pictograph>` throw past its fallback, and the figure recorded for the Product Owner understates the worst case about 7.5 times

**Severity:** Medium
**Category:** Input Validation
**OWASP Reference:** A06:2025 Insecure Design. Also CWE-770 (allocation of resources without limits or throttling) and CWE-400 (uncontrolled resource consumption).
**Location:**
- `src/core/definitions/categories.ts:50-55`: `name` has no length bound ("A long name wraps onto more lines; it is never cut short").
- `src/layout/kit/value-scale.ts:192-198`: below a vertical plot, when every word fits its slot, each name is wrapped to `share − NAME_GAP` with no line cap.
  - With 26 to 91 categories, that width is 10.2 down to 0.04 units.
  - A narrow word such as "i" (2.9 units) then takes a line of its own, because two of them with a space are 9.5 units.
- `src/layout/kit/value-scale.ts:253-268` (`drawCategoryNames`): one `<text>` node per line.
- `src/layout/pictograph.ts:157-178`: the columns branch, the default for `orientation: "vertical"`.
- `tests/react/Graph.test.tsx:347-358`: the recorded case, which is one horizontal name made of words.
- Delivery record, Post-Review Amendments CR-005 ("499,999 characters → 33,335 text nodes and 7,547,299 bytes of markup") and Notes ("Category names … measured").
- Earlier review: `graph-library/data-graphs-and-pictographs-ticket-001-security-review/SEC-002`, Deferred → the Product Owner's caller-text length decision (GSS TICKET-002 SEC-002).

**Description:**
DGP TICKET-001 SEC-002 was raised against the category kit before any registered type drew names. It was deferred to the Product Owner with a Known Hazard, and the delivery followed that hazard: it includes a half-megabyte name in a test and records the figures. This delivery changes the risk in three ways:
- **It is live.** The pictograph is the first registered type that draws category names. The path is in `dist/` and is reached through `createGraph`, `<Graph>` and `<Pictograph>`. No interim control was added:
  - The provisional-limit route DEL-001 took for pictures was not taken for names.
  - The Scene node budget DGP TICKET-001 SEC-002 suggested (its recommendation 2) does not exist.
- **The worst input changed with QR-002.** An unbroken word now rotates, and is drawn as a few long lines. A name made of narrow words that each fit the slot is still wrapped to the slot, one word per line. That is about one text node per two bytes of description. A horizontal name of words gives about one per fifteen.
- **The recorded figures understate it.** For the same 500 KB body the vertical narrow-word case gives 7.5 times the nodes and 6.3 times the markup. The pending Product Owner decision would rest on the smaller figures. That is the same problem CR-005 raised at 10 times.

Probes ran through `createGraph` and `renderToStaticMarkup` with `NODE_ENV=production`, in fresh processes unless noted. Each name has its own word count, so names stay distinct.

| Description | Body | Text nodes | Markup | Time | Result |
|---|---|---|---|---|---|
| 1 category, a name of 166,666 two-letter words, rows (the recorded shape) | 500 KB | 33,335 | 7.5 MB | 0.3 s create, 0.3 s render | renders |
| 1 category, one 500,000-character word of "@", rows | 500 KB | 71,430 | 14.5 MB | 0.4 s, 0.5 s | renders |
| 1 category, the same word, columns (rotated) | 500 KB | 2 | 1.5 MB | 0.3 s, 0.3 s | renders (see SEC-002 for its height) |
| 40 categories of "i i i …", columns | 100 KB | 50,781 | 9.7 MB | 0.1 s, 0.1 s | renders |
| the same | 500 KB | 250,781 | 47.7 MB | 0.3 s, 0.9 s | renders |
| the same | 1 MB | 500,781 | 95.5 MB | 1.8 s per render in `<Graph>` or `<Pictograph>`; heap 0.9–1.6 GB | renders |
| the same | 2 MB | 1,000,781 | 191 MB | 1.6 s create, 6.3 s render; heap 2.4 GB | renders |
| the same | 4 MB | about 2 million | — | `createGraph` 3.5 s, `ok: true`, 1.6 GB heap; render 7.0 s | `<Pictograph>` with a `fallback` function throws `RangeError: Invalid array length`. The fallback is not called |
| the 2 MB render, then the 4 MB one, in one process | | | | | Node.js aborted: "JavaScript heap out of memory", exit 134 |

The 4 MB failure is inside React's renderer, after `createGraph` reported the description valid. `createGraphWith`'s `try` and the component's fallback cannot catch it. That is the failure GSS TICKET-002 SEC-001 closed for labels and titles, and DGP TICKET-001 SEC-002 predicted for names.

**Attack Scenario:**
- **Attacker:** an author on a platform that stores pictograph descriptions and server-renders them with `<Graph>` or `<Pictograph>`, such as a worksheet or assessment builder. Text that steers a model into writing such a description also works, in an application that renders the model's tool output with `createGraph`. Authoring rights are the only access needed.
- **Steps:**
  1. Save a vertical pictograph with 40 categories, each named "i i i …" with about 12,500 words. That is 1 MB, within the 1 MB default body limits of Next.js and Fastify. `validate` accepts it.
  2. Every view renders 500,781 text nodes and 95.5 MB of SVG. That is about 1.8 s of blocked event loop and 0.9 to 1.6 GB of heap.
  3. With 4 MB (a raised body limit, a file import or a stored tool result), every render throws after about 7 s, past the fallback. Under heap pressure from another render in the same process, Node.js aborts instead.
- **Result:**
  - A few concurrent views exhaust a Node.js process's CPU or heap, and every user of that process is affected.
  - The page fails with a 500 error. On the client, React unmounts the root unless the consumer wrapped the graph in an error boundary.
  - It persists until the description is removed.
  - In a browser, the tab stalls on 95 MB of SVG.
- **Limits:**
  - The cost is linear and bounded by the consumer's body limit. Behind Express's 100 KB default, a view costs about 0.25 s and 10 MB.
  - Nothing is disclosed.

**Impact:** server CPU, memory and bandwidth amplified about 95 times per byte of description. From about 4 MB, a valid description makes the components throw past the fallback, against the never-throw design (AD-014; CPSE-REQ-018 as the earlier reviews read it). Under heap pressure, the process aborts.

**Recommendation:**
1. **Ship the type with a provisional bound, as DEL-001 did for pictures.** Reject a category name over a curriculum-sized length, for example 200 characters, with an issue at `/categories/<i>/name`. One option is `too_large` with a `characters` unit. Rejecting, rather than cutting, keeps "never cut short" true.
   - State the bound in the `name` description and run `pnpm generate`.
   - Flag it for the Product Owner beside DEL-001, under the pending GSS TICKET-002 SEC-002 decision.
   - With 100 categories of 200 characters, the vertical worst case is about 10,000 name nodes.
2. **As well, or instead, bound the Scene inside the guard** (DGP TICKET-001 SEC-002, recommendation 2). `createGraphWith` already walks every node in `checkScene`, so it can report `too_large` at `""` above a fixed node count, for example 20,000. That covers every caller-sized path at once, including those of the line and bar graphs.
3. **Correct the record for the decision.**
   - Replace the figures in the delivery record's Notes and CR-005 amendment with the worst case: vertical, 26 to 91 categories, narrow words. Add that case to `tests/react/Graph.test.tsx` beside the horizontal one.
   - If the decision stays deferred, append the corrected figures to the Known Hazards of DGP TICKET-002 and TICKET-003, which draw names through the same kit.

**Compliance Impact:** None. No CC-XXX constraint covers availability, and prd/CC-002 is not violated.
**Status:** Resolved
**Resolution:** Fixed — a category name is now at most `CATEGORY_NAME_LIMIT` = 200 characters (code points), a provisional limit flagged for the Product Owner beside DEL-001, under the pending GSS TICKET-002 SEC-002 decision.
  - A longer name is reported as `too_large` at `/categories/<i>/name` ("has N characters, more than the limit of 200; use fewer."), never cut. This uses a new optional `maxLength` on text properties (`src/core/definitions/types.ts`, `src/core/validate/structure.ts`), which both published schemas and the vocabulary carry, regenerated.
  - It applies to every data graph through the shared categories.
  - The worst case under the limit, names of narrow words in 53 columns, is 3,923 text nodes and 0.77 MB, rendered in 13 ms. Before, 1 MB drew about 500,000 nodes and 95.5 MB, and 4 MB threw past the fallback.
  - Tests: the limit, code-point counting, a megabyte name reported rather than drawn, the 1 MB columns description reported through both components' fallback, and the markup bounded at the limit.
  - The corrected figures are recorded in the delivery record.

  Approved by the user, 2026-10-15.

---

### SEC-002: Every row is as tall as the tallest category name, and a rotated name drops by its full width, so an 11.8 KB description draws a figure 5,146 times taller than it is wide

**Severity:** Low
**Category:** Input Validation
**OWASP Reference:** A06:2025 Insecure Design. Also CWE-1284 (improper validation of specified quantity in input).
**Location:**
- `src/layout/pictograph.ts:142-146`: in rows, `slotSize` is `(tallestName) => Math.max(step, tallestName + NAME_GAP)`. Every row takes the tallest name's height, and `box.height` is `rowHeight × categories.length`.
- `src/layout/kit/value-scale.ts:209-214`: `size = slotSize(tallest)` applies to every slot (QR-006).
- `src/layout/kit/value-scale.ts:145-155` and `:199-205`: a rotated name's `labelHeight` is the width of its longest line. A single word is never broken, so the drop is the whole word (QR-002).
- `src/layout/pictograph.ts:179` (`plotBottom = baseline + NAME_GAP + nameHeight`) and `:200` (the Scene's `height`).
- `src/layout/scene.ts:160-166`: `rootAttrs` sets `viewBox="0 0 400 <height>"` and `width="100%"`. The drawn height therefore scales with the container's width.

**Description:**
Probes through `createGraph`. The drawing is 400 units wide, and heights are in the same units.

| Description | Body | Text nodes | Markup | Scene height | Height ÷ width |
|---|---|---|---|---|---|
| 100 categories in rows; one named "@" × 10,000, the rest "C1"… | 11.8 KB | 1,529 | 0.43 MB | 2,058,210 | 5,146 |
| the same with "@" × 100,000 | 101.8 KB | 14,386 | 3.0 MB | 20,572,290 | 51,431 |
| 100 categories in columns; one named "@" × 100,000 | 101.8 KB | 101 | 0.44 MB | 1,339,867 | 3,350 |
| 1 category in columns; "@" × 500,000 | 500 KB | 2 | 1.5 MB | 6,699,150 | 16,748 |

- **Rows:** the long name's own row needs about 20,600 units. Because every row takes the tallest height, 100 categories multiply that by 100: about 206 drawing units of height per character of the name (175 per byte of the description), while the markup stays small.
- **Columns:** rotation keeps the node count bounded (two text nodes for a 500,000-character word). The word's width, about 13.4 units per character, becomes the drop below the plot.
- **What a browser does with it:** in a 700-pixel column, the first row of the table is a 3.6-million-pixel element and the second a 36-million-pixel one. That is beyond the largest box Chromium (about 33.5 million px) and Firefox (about 17.9 million px) can lay out. I did not render these in a browser.
- **Why it is separate from SEC-001:** SEC-001 is about node count and markup, which grow linearly with the name. The multiplier here comes from this layout's equal rows and from rotation. It has a fix that does not wait for the Product Owner's bound.

**Attack Scenario:** an author saves the 11.8 KB description on a page shared with others, such as an assessment with several questions or a class feed. The graph pushes everything after it millions of pixels down, out of reach.

Downstream effects were reasoned, not probed:
- an HTML-to-PDF print pipeline (prd/IC-004) receives a figure 5,146 times taller than wide;
- a consumer that rasterizes the SVG at one pixel per unit would allocate a 400 × 2,058,210 bitmap, about 3.3 GB in RGBA.

**Impact:** host-page layout is disrupted, and the content after the graph is hidden. Print and raster pipelines get oversized figures. Nothing is disclosed, and the cost stays linear in markup.
**Recommendation:**
1. **Size each row to its own name.** `categorySlots` already computes each name's `labelHeight`, so one long name would make one tall row, not a hundred.
   - Whether DGP-REQ-037's "same size and spacing" covers the gap between rows is a specification question for the user.
   - If it does, keep equal rows and use option 2.
2. **Bound the drawn height:**
   - either report `too_large` in the layout or in `createGraphWith` for a Scene taller than a fixed multiple of its width;
   - or add these figures to the Product Owner's caller-text decision beside SEC-001's. A 200-character name bound limits the 100-row case to about 41,700 units with equal rows, and about 3,600 with rows sized to their own names.
3. **Add a test** that pins the Scene height for 100 categories with one long name, in rows and in columns.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed — `categorySlots`' `slotSize` now sizes each row beside a horizontal plot from its own name, so one long name makes one tall row (DGP-REQ-037 is about picture size and spacing, not the gap between rows).
  - With the 200-character limit, 100 rows with one 200-character word draw 3,639.6 units tall, against 2,058,210 for the reviewer's 11.8 KB case. The same in columns draws 2,737.9.
  - Tests pin both heights and the per-slot sizing.

  Approved by the user, 2026-10-15.

---

### SEC-003: The partial picture's crop relies on the user-agent default `overflow: hidden` for nested `<svg>`, so a host-page rule such as `svg { overflow: visible }` draws every partial picture whole

**Severity:** Informational
**Category:** Misconfiguration
**OWASP Reference:** N/A
**Location:**
- `src/layout/pictograph.ts:56-79` (`partialPicture`): a nested `svg` whose `viewBox` covers only the remaining share, for example `0 0 50 100` in rows or `0 50 100 50` in columns.
- `.gener8v/technical-design/system-design.md:117` (AD-008): "nested SVG viewports clip by default".
- `src/layout/scene.ts:52-92`: the closed attribute set has no `overflow` or `style`, and AD-011 rules out `style`.

**Description:**
- **Where the clip comes from:** SVG 2's user-agent style sheet sets `overflow: hidden` on `svg:not(:root)`. That rule is what clips a nested viewport.
- **What overrides it:** author style sheets beat user-agent rules and presentation attributes. On a page whose CSS sets `overflow: visible` on `svg` elements (sometimes done so icon strokes are not clipped), the part of the drawing outside the partial's `viewBox` is painted too.
  - The `viewBox` is drawn at full scale (CR-001), so the hidden part lands exactly where the rest of a whole picture would be.
  - A value of 2.5 then looks like 3 whole pictures, while the key and the text alternative still say 2.5.
- **Whole pictures are unaffected:** each drawing stays inside its 100 × 100 box (DGP TICKET-004's test).
- **The host page's control:** a host page can already restyle any inline SVG, for example `text { fill: … }`. The difference is that this crop is the one place where a common, unrelated rule silently changes the data the figure shows.
- **No easy fix in the Scene:** an `overflow="hidden"` presentation attribute would lose to the same author rule, and `style` is excluded.
- Not probed in a browser, because the findings phase may not write the profile directory a headless browser needs.

**Attack Scenario:** N/A (Informational)
**Impact:** on such pages, every non-whole value is drawn rounded up to the next whole picture, so the drawing disagrees with its key and text alternative. Description input cannot trigger it.
**Recommendation:**
- Say it where consumers read about styling (CPSE documentation): the graph's nested `<svg>` elements must keep `overflow: hidden`, so scope any global `svg` rule away from the graph.
- Optionally, have the documentation site's Playwright run include one page with a global `svg { overflow: visible }`, so the dependency is visible.
- Add the dependency to the queued AD-008 amendment (CR-008).

**Compliance Impact:** None. It touches the design behind prd/TC-003 (AD-008's crop), which is met as delivered.
**Status:** Resolved
**Resolution:** Fixed (documented) — `README.md` gains a Styling section: the pictograph's partial picture relies on the default `overflow: hidden` of a nested `<svg>`, so a page should not set `overflow: visible` on every `svg`. The dependency is added to the queued AD-008 amendment (delivery record). Approved by the user, 2026-10-15.

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Fix | Provisional 200-character category-name limit via `maxLength`; schemas regenerated; tests; figures corrected | No | `src/core/definitions/types.ts`, `src/core/validate/structure.ts`, `src/core/issues.ts`, `src/core/schema.ts`, `src/core/definitions/categories.ts`, `src/generated/*`, `tests/core/categories.test.ts`, `tests/core/definitions.test.ts`, `tests/react/Graph.test.tsx` |
| SEC-002 | Fix | Each row sized to its own name; height tests | No | `src/layout/kit/value-scale.ts`, `src/layout/pictograph.ts`, `tests/layout/kit/value-scale.test.ts`, `tests/layout/pictograph.test.ts` |
| SEC-003 | Fix (document) | README styling note; AD-008 amendment queued | No | `README.md` |

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:**
- All three findings are fixed.
  - SEC-001's 200-character name limit is provisional, for the Product Owner beside the 400-picture cap (DGP OQ-004) and the image set (EXT-001), under the caller-text length decision (GSS TICKET-002 SEC-002).
  - SEC-003's dependency on the default `overflow` joins the queued AD-008 amendment.
- Re-verification: `pnpm generate` (schemas, vocabulary and description types regenerated for `maxLength`), `lint`, `typecheck`, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size`, `publint`, `attw`, `audit` and `gener8v-state lint` exit 0. `pnpm test` (976 tests) exits 0 on three runs.
- Seven deliberate breaks of the fixes, each made against a passing baseline of 257 tests and restored afterwards, all fail a test.
- Dependency audit: `pnpm audit` and `pnpm audit --prod`, 2026-10-15, no known vulnerabilities.
