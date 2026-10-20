# TICKET-001: Build the ruler mark rule and the graded-mark drawing kit — Security Review

## Summary

I reviewed the ruler mark rule (`src/core/ruler.ts`) and the graded-mark drawing kit (`src/layout/kit/ruler.ts`) of `rulers/number-lines-and-coordinate-graphs/TICKET-001`, as they stand at HEAD (`f34294e`) after both review resolutions. The posture is sound for code that nothing public reaches yet:
- the rule is bounded at 301 marks and never throws on any argument;
- the drawing writes only the numbers "0" to "30" as text;
- prototype pollution changes nothing it outputs;
- the dependency audit is clean.

The three findings are all Informational, and all are reached only by direct calls with values no validated description gives: 0 Critical, 0 High, 0 Medium, 0 Low, 3 Informational.

The code reviewed is the code after both reviews' Post-Review Amendments:
- the core rule is one frozen `rulerScale(unit, length, smallestDivision)` value with `marks`, `marksPerUnit` and `locate(value)`;
- the lower-level predicates are private;
- the kit checks its options in `checkedOptions`, reads `smallestDivision` and `fontSize` own-key, and exports `rulerMarksDepth` and `rulerNumberOverhang`.

Nothing in the package reaches this code yet:
- no registered graph type uses it;
- `src/core/index.ts`, `src/index.ts`, `src/entries/` and the `package.json` `exports` map are unchanged;
- no file in `dist/` contains a ruler identifier.

Its attack surface is therefore what TICKET-002 and TICKET-003 will expose: an untrusted or model-written ruler description, validated by a domain check that calls `rulerScale` and `locate`, then drawn by a layout that calls `drawRulerMarks`. Probed in memory:
- **The rule's bounds.** 8,432 combinations of unit, length and division, including subnormals, ±1e308, `NaN`, strings, BigInts, boxed values, arrays and objects with `valueOf`, `toString` and `Symbol.toPrimitive`, gave only valid rulers, at most 301 marks. Nothing threw and no conversion method was called. The whole sweep took 1 ms, and a 30 cm ruler takes 6.8 µs to build.
- **`locate` on numbers.** 400,000 doubles, from subnormals to ±1.8e308, never threw and never gave a non-finite result, a mark off the ruler or −0. On non-numbers it coerces (SEC-001).
- **Prototype pollution.** I polluted 66 `Object.prototype` keys, including every unit and division name and the numeric keys 0 to 32, and `Array.prototype` indexes 2 to 6. Whether the keys were enumerable or not, and whether the pollution came before or after the modules loaded, every mark, rank, length limit, location and drawing of 90 rulers was byte-identical to a clean run.
- **Text and markup.** Across 468 drawings, the only text nodes are the whole numbers 0 to 30. Every attribute is a package constant or a `fmt()`-ed number. The markup has no script, handler, `href`, `url(`, `style`, `class` or `id`.
- **Errors.** Every throw from the kit, whatever its class or message, becomes the fixed `internal_error` in `createGraph`.

The findings:
- **SEC-001 (Informational):** `locate` converts whatever it is given to a number. `null`, `""`, `[]` and `false` lie on the 0 mark, `true` on the 1 cm mark, and `"2.3"` on the 2.3 cm mark. An object's `valueOf` runs, and a BigInt or a Symbol throws `TypeError`.
- **SEC-002 (Informational):** the kit's guard checks the points through their iterator, but measures and draws them through other reads. It bounds neither the points nor the font size. `rulerMarksDepth` and `rulerNumberOverhang` check nothing.
- **SEC-003 (Informational):** the guard builds its messages with `String()` of the caller's values. A value whose `toString` throws escapes as that error instead of a `RangeError`, and a long value builds a message of 10 to 20 million characters.

**Reviewer:** `security-reviewer` agent, fresh context (findings phase only, 2026-10-20)
**Delivery Record:** `.gener8v/changes/rulers/delivery/number-lines-and-coordinate-graphs-ticket-001-delivery.md` (DEL-001..DEL-003, Notes, Post-Review Amendments CR-001..007 and QR-001..010)

**Files Reviewed:**
- `src/core/ruler.ts` (new)
- `src/layout/kit/ruler.ts` (new)
- `tests/core/ruler.test.ts` (new)
- `tests/layout/kit/ruler.test.ts` (new)
- `tests/fixtures/rulers.ts` (new)
- Read unchanged, because the delivered code's values flow into them:
  - `src/layout/kit/format.ts` (`fmt`), `src/layout/kit/scale.ts` (`linearScale`), `src/layout/kit/text.ts` (`textWidth`), `src/layout/kit/check.ts` (`checkScene`), `src/layout/kit/title.ts` (`LINE_HEIGHT`), `src/layout/kit/value-scale.ts` (`TICK_LABEL_DROP`), `src/layout/kit/axis.ts` (`checkedLabels`, for comparison);
  - `src/layout/scene.ts`, `src/layout/registry.ts`, `src/react/SceneSvg.tsx` (the printer and its escaping);
  - `src/core/style.ts`, `src/core/index.ts`, `src/core/issues.ts` (`describeValue`), `src/core/validate/index.ts`, `src/core/validate/structure.ts`, `src/core/validate/domain.ts`;
  - `src/graph.ts` (`createGraphWith`), `src/index.ts`, `src/entries/`, `src/export/index.ts`, `src/tool/index.ts`, `package.json`.

Context read:
- the ticket and its Known Hazards;
- TICKET-002's and TICKET-003's Known Hazards, including those the code and quality reviews added;
- the delivery record;
- `.gener8v/constraints/prd.md`. There is no `constraints/number-lines-and-coordinate-graphs.md`;
- `.gener8v/technical-design/system-design.md` (AD-001, AD-002, AD-004, AD-006, AD-007, AD-008, AD-010, AD-011, AD-014), `.gener8v/context.md` and `.gener8v/CONVENTIONS.md`;
- the resolved code review and quality review of this ticket. Their findings are not raised again. That covers CR-001 (`null` division), CR-003 (noise at the ends), CR-004 (mark width and contrast), CR-005 (font size), QR-001 (one `rulerScale` value), QR-007 (rank table), QR-008 (`checkedOptions`) and QR-009 (`fontSize: undefined`). CR-001's note that a non-iterable `from` throws `TypeError` is mentioned under SEC-003 only as part of that finding's contract;
- the graph-library security reviews, for the threat model and house style, especially `number-lines-and-coordinate-graphs-ticket-001-security-review` (SEC-002, own-key option reads; SEC-004, the kit fails closed on direct calls).

**Review environment note:**
- **How I probed:**
  - Every probe was an inline `TSX_DISABLE_CACHE=1 npx tsx -e '…'` run from the repository root.
  - Each pollution probe ran in a fresh process. It polluted `Object.prototype` and `Array.prototype`, with enumerable and with non-enumerable properties, then dynamically imported the modules, and hashed the outputs against a clean process.
  - Error-path probes registered a test layout through `createGraphWith(examples/circle.json, definitions, { circle: … })` that calls `drawRulerMarks` with hostile options.
  - Markup was rendered with `SceneSvg` and `react-dom/server`'s `renderToStaticMarkup`.
  - Bundles were built with esbuild's API and `write: false`.
  - Scratch files (a list of added lines, build and test logs) are under the session scratchpad only.
- **Runtime:** Node.js v24.1.0, pnpm 10.28.2, Vitest 5.0.3, esbuild 0.28.2, tsx 4.23.15, fast-check 4.10.2, macOS 26.6.2 (Darwin 25.6.0).
- **Commands run in the repository:**

| Command | Exit | Evidence |
|---|---|---|
| `pnpm audit` | 0 | No known vulnerabilities found |
| `pnpm audit --prod` | 0 | No known vulnerabilities found |
| `pnpm lint` | 0 | — |
| `pnpm typecheck` | 0 | `tsc --noEmit` |
| `pnpm test --no-cache`, twice | 0 | 47 files, 1,265 tests passed on each run. The first run's exit code was lost in a pipe; its summary shows every test passed. Its global setup (`tests/setup/build.ts`) runs `pnpm build`, which rewrites the git-ignored `dist/` |
| `pnpm build` | 0 | ESM and DTS build success |
| `pnpm check:dist` | 0 | 14 built files scanned, no network APIs or network modules |
| `pnpm check:deps` | 0 | 0 runtime dependencies |
| `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache tests/core/ruler.test.ts tests/layout/kit/ruler.test.ts`, 20 times | 0 on all 20 | 80 tests passed on each run |
| `src/core/ruler.ts` and `src/layout/kit/ruler.ts` each piped to `npx eslint --no-cache --stdin`, with `import "react"`, `fetch(…)` or `document.title` prepended (6 runs), and unmodified (2 runs) | 1 on each modified run; 0 unmodified | `no-restricted-imports` with the AD-001 / prd/TC-005 message, or `no-restricted-globals` with the CPSE-REQ-005 / prd/CC-003 or AD-001 / prd/TC-005 message |

- **Not run:**
  - `pnpm size` and `pnpm generate`, as instructed;
  - `pnpm bench`, `check:images`, `publint` and `attw`, which this delivery's code does not reach (no entry point imports it).
- **Tree check:** `git status --short` before and after every command and probe showed only ` M .gener8v/runs.jsonl`, and this report once written.

**Findings:** 3
**Critical:** 0 | **High:** 0 | **Medium:** 0 | **Low:** 0 | **Informational:** 3

## Security Assessment

### Input Validation

**Status:** Gaps Found
**Notes:**
**Entry points:**
- **Public:** none. `src/core/index.ts` exports nothing from the ruler, and no entry point imports either module.
- **Internal, core:** `rulerScale`, `marksPerUnit`, `isRulerLength` and the constants `RULER_UNITS`, `INCH_DIVISIONS`, `DEFAULT_INCH_DIVISION` and `RULER_MAX_LENGTH` (`src/core/ruler.ts`). TICKET-002's domain check will call `rulerScale` and `locate` on the validated description.
- **Internal, kit:** `drawRulerMarks`, `rulerMarksDepth` and `rulerNumberOverhang`, and the constants `RULER_MARK_LENGTHS` and `RULER_MIN_MARK_WIDTH` (`src/layout/kit/ruler.ts`). TICKET-003's layout will call them.

**Values that will reach this code:**

| Value | Source | Validation | Where it goes |
|---|---|---|---|
| `unit` | description, via TICKET-002's enum | `rulerScale` → `marksPerUnit` and `isRulerLength`: exactly `"centimeters"` or `"inches"`, own-key (`src/core/ruler.ts:73`, `:83-84`, `:92`) | the marks; `RULER_MARK_LENGTHS[ruler.unit]` (`src/layout/kit/ruler.ts:134`) |
| `length` | description | `Number.isInteger`, from 1 to `RULER_MAX_LENGTH[unit]` (`src/core/ruler.ts:92`), before the loop (`:155`) | the mark count (at most 301); the numbers' text |
| `smallestDivision` | description (inch rulers) | absent → a sixteenth; otherwise an own key of `INCH_DIVISIONS`; `null` and any division on a centimetre ruler are refused (`src/core/ruler.ts:82-87`, CR-001) | marks per unit |
| object start and end | description, via TICKET-002 | in the description, only finite numbers (`src/core/validate/structure.ts:118`); `locate` itself does not check the type (SEC-001) | `locate`: mark, between or off |
| `from`, `to`, `side`, `fontSize` | chosen by TICKET-003's layout | `checkedOptions` (`src/layout/kit/ruler.ts:69-82`): finite points, a non-zero edge, `left` or `right`, a finite font size that survives `fmt()`. The gaps are SEC-002 and SEC-003 | positions, the normal, widths, the numbers' size and place |

**What is handled well:**
- **Resource bounds.**
  - `rulerScale` refuses the unit, the division and the length before its loop, which runs at most `30 × 10 + 1` = 301 times. 8,432 hostile combinations took 1 ms together and gave at most 301 marks; the 15 that were rulers all belong to the valid set.
  - No argument's `valueOf`, `toString` or `Symbol.toPrimitive` was called. `Number.isInteger`, `typeof` and `Object.hasOwn` convert nothing.
  - A drawing has at most 332 nodes (301 marks and 31 numbers) and 34,001 bytes of markup. The mean time for a 30 cm drawing is 0.023 ms, and the worst of 468 was 0.44 ms.
- **`locate` on numbers.**
  - 400,000 doubles took 17 ms on the 30 cm and 12 in rulers. They ran from subnormals to ±1.8e308, biased toward the ruler, its marks (within 2e-9) and its ends.
  - None threw. Every result was finite, every mark index was inside the ruler and never −0, and every `between` pair was on the ruler and one mark apart.
  - `NaN`, ±`Infinity`, ±1e308 and `Number.MAX_VALUE` are `off`, and ±5e-324 and −0 are mark 0.
  - The allowance edges hold: 30 + 1e-10 is the 300th mark, and 30 + 1.5e-10 is off.
- **Prototype pollution.**
  - `isOwnKey` (`src/core/ruler.ts:73`) guards `INCH_DIVISIONS` and `RULER_MAX_LENGTH`.
  - `INCH_RANKS` (`:96`) is read only at the reduced denominators 1, 2, 4, 8 and 16, which are its own keys for every index and division a ruler can have. `markRank`'s `RangeError` (`:119`) cannot be reached.
  - `RULER_MARK_LENGTHS[ruler.unit]` and `lengths[rank]` read own entries of frozen tables.
  - `smallestDivision` and `fontSize` are read own-key (`src/layout/kit/ruler.ts:72-73`), and `tests/layout/kit/ruler.test.ts:185-199` tests it.
  - The pollution probe (Summary) changed no byte of any output.
  - Required options are still read through the prototype when absent: with `Object.prototype.side = "left"`, options without `side` draw on the left. Typed callers must pass every required option, and the own-key rule (graph-library DGP TICKET-003 SEC-003, NLC TICKET-001 SEC-002) is for optional fields, so this is not raised.
- **Text in the Scene.**
  - The only text is `String(Math.round(value))` for rank-0 marks (`src/layout/kit/ruler.ts:146`), whose values are `index / marksPerUnit` for whole units 0 to 30. 468 drawings (every ruler, three edges, both sides) gave exactly "0" to "30".
  - `fill`, `stroke`, `font-family` and `text-anchor` are constants from `defaultStyle`, `DEFAULT_FONT_STACK` and the literal `"middle"`.
  - The attribute names used are `x1`, `y1`, `x2`, `y2`, `stroke`, `stroke-width`, `x`, `y`, `fill`, `font-family`, `font-size` and `text-anchor`, all in the closed `REACT_PROP` set.
  - `SceneSvg` prints text as a text child. No caller string reaches the kit.
- **Numbers in the drawing.**
  - Every coordinate, the stroke width and the font size go through `fmt()` (`src/layout/kit/ruler.ts:104-109`, `:152-156`).
  - An edge of ±1e308 makes `hypot` infinite, and the normal `NaN`. `fmt()` then throws `RangeError`, and `createGraph` returns `internal_error`.
- **Spread arguments.**
  - `Math.max(...RULER_MARK_LENGTHS[unit])` (`src/layout/kit/ruler.ts:90`) spreads a frozen package table of 3 or 5 numbers for either unit. Only an unknown unit backed by a polluted prototype can make it caller-sized (SEC-002).
  - `[...from, ...to]` (`:74`) is an array literal, not call arguments. A 5,000,000-entry `from` costs 34 ms and no stack.
  - The tests' spreads (`tests/layout/kit/ruler.test.ts:63`, `:208-213`) are bounded by one ruler's nodes.
- **The kit's guard.**
  - `checkedOptions` runs before any mark is listed, and throws `RangeError` on each case the ticket lists and on a zero-length edge, an unknown side, and a font size that is 0, non-finite or rounds to 0 (`tests/layout/kit/ruler.test.ts:219-237`).
  - A `null` division is refused on both units.

**Gaps:**
- **SEC-001:** `locate` converts non-numbers, and throws on a BigInt or a Symbol.
- **SEC-002:** the guard checks the points through another read than the drawing uses, bounds neither the points nor the font size, and the two exported helpers check nothing.
- **SEC-003:** the guard's messages call `String()` on the caller's values.

**Not applicable:** SQL, NoSQL, command and template injection, and path traversal. The delivered code has no query, shell, template engine or file path.

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** This is library code with no server, accounts, sessions or permissions (`.gener8v/context.md`: "no user accounts").

### Data Protection

**Status:** Adequate
**Notes:**
- **Sensitive data:** none. The code logs, stores and sends nothing, and handles only numbers and the package's own unit and division names.
- **Exceptions:**
  - The kit throws `RangeError` (or, through SEC-003, a caller's own error) with values in the message.
  - `createGraphWith` (`src/graph.ts:21-47`) is the only place in `src` that calls a layout. Its bare `catch` returns one fixed `internal_error` (GSV TICKET-002 SEC-003).
  - Probed: an `Error` from a hostile `toString`, a 10-million-character `RangeError` message, a `RangeError` naming a marker unit, and a `TypeError` each gave the same 199-byte result, without the marker text.
  - `exportSource` (`src/export/index.ts`) and the tool handler (`src/tool/index.ts`) are empty modules.
- **Secret scan:** I scanned the 815 lines that `git diff main...HEAD -- src tests` adds. The patterns:
  - keys, tokens, passwords and private keys;
  - AWS, GitHub, npm and Slack token shapes;
  - URLs, `fetch`, `XMLHttpRequest`, `WebSocket` and `EventSource`;
  - `eval` and `Function(`, `innerHTML` and `dangerouslySetInnerHTML`, `document.` and `window.`;
  - storage, `console.`, `process.env`, `child_process`, `require(` and `import(`;
  - `__proto__`, `.prototype` and `Object.assign`;
  - timers, `Math.random` and `crypto`.

  The only match is the test's pollution probe (`tests/layout/kit/ruler.test.ts:186`, `Object.prototype as Record<string, unknown>`), which restores the prototype in a `finally`.

### Configuration Security

**Status:** Adequate
**Notes:**
- **Manifest:** `git diff main...HEAD` shows no change to `package.json`, `pnpm-lock.yaml`, `eslint.config.js`, `tsup.config.ts`, `.size-limit.json`, `.github/`, `src/core/index.ts`, `src/index.ts` or `src/entries/`. `sideEffects: false` and `files: ["dist"]` stand, and the `exports` map gains no entry.
- **Built output:** after `pnpm build`, no file in `dist/` contains `rulerScale`, `drawRulerMarks`, `RULER_MARK_LENGTHS`, `rulerMarksDepth`, `rulerNumberOverhang`, `INCH_DIVISIONS`, `RULER_MAX_LENGTH`, `marksPerUnit`, `sixteenth` or `centimeters`. `check:dist` and `check:deps` pass.
- **Module load:** importing both modules left the own keys of `globalThis` and of the `Object`, `Array`, `Function`, `Number` and `String` prototypes unchanged.
- **Tree-shaking** (esbuild, in memory):
  - a bare import of both modules bundles to 0 bytes, and unused named imports to 0 bytes;
  - `rulerScale` alone is 1,212 bytes minified, and `drawRulerMarks` with its imports 6,005.
- **Immutability:** the constants, each ruler value, its `marks` array and each mark are frozen (`tests/core/ruler.test.ts:104-109`). `rulerScale` builds a new value on every call, so there is no shared cache for a check to poison.
- **Secrets and defaults:** none. The limits (30 cm, 12 in, at most 301 marks, a 0.25 minimum mark width) are named constants.
- **Cryptography:** not applicable. No randomness or cryptographic function is used.
- **Logging and monitoring:** not applicable. The package logs nothing (AD-014), and the delivery adds no logger.

**Dependency audit:** `pnpm audit` (pnpm 10.28.2, Node.js v24.1.0), run 2026-10-20 17:38 UTC in the repository against the HEAD lockfile (`f34294e`), read-only.
- `pnpm audit`: `No known vulnerabilities found`, exit 0.
- `pnpm audit --prod`: `No known vulnerabilities found`, exit 0. The package has no runtime dependencies; `react` is a peer.
- This delivery does not change the lockfile.

**Carried Known Hazards (security-relevant):**

| Hazard | Result |
|---|---|
| Ticket: never draw marks with `drawAxis` (graph-library NLC TICKET-001 SEC-004's `MAX_VALUE_TICKS`); keep a separate ruler bound | Honoured. The kit imports no axis code, only the `TICK_LABEL_DROP` constant (`src/layout/kit/ruler.ts:8`). The bound is `RULER_MAX_LENGTH` through `isRulerLength`, checked before the loop: at most 301 marks, probed |
| Ticket: no text but the whole-unit numbers (NLC-REQ-055) | Honoured: 468 drawings show only "0" to "30" |
| graph-library NLC TICKET-001 SEC-004: the kit fails closed on options no validated description gives | Mostly honoured: `checkedOptions` throws `RangeError` on each listed case, before listing marks. Gaps: SEC-002 (what it checks is not what it draws; no upper bounds; the helpers) and SEC-003 (its messages) |
| graph-library NLC TICKET-001 SEC-002 and DGP TICKET-003 SEC-003: optional option fields read own-key | Honoured for `smallestDivision` and `fontSize`, and tested. `isOwnKey` also guards the core tables |
| GSS TICKET-002 SEC-001: no caller-sized spread into call arguments | Honoured in every path a valid unit reaches. `rulerMarksDepth`'s spread is caller-sized only for an unknown unit on a polluted prototype (SEC-002) |
| CPSE TICKET-002 SEC-003 and GSV TICKET-002 SEC-003: `fmt()` fails closed; no exception text reaches a caller | Holds. An infinite edge ends in `fmt()`'s `RangeError`, and every throw becomes the fixed `internal_error` (probed) |
| GSV TICKET-004 SEC-004: domain checks do bounded work and never throw on the description's values | `rulerScale` is fit for TICKET-002's check: at most 301 marks, 6.8 µs, and no throw on any argument. `locate` throws only on a BigInt, a Symbol or a hostile `valueOf` (SEC-001), none of which a validated description can hold |
| Code review CR-001: only an absent division takes the default | Holds: `null` is refused on both units, in core and in the kit |
| Quality review QR-008: a font size must survive `fmt()` | Holds at the bottom (0.0049 refused; 0.005 drawn as 0.01). There is no upper bound (SEC-002) |

**Compliance cross-reference:** checked against `.gener8v/constraints/prd.md`. No per-area constraints file exists. The ticket names prd/TC-001, TC-002 and TC-005.

| Constraint | Result |
|---|---|
| prd/CC-001 (licenses) | Met: no dependency, asset or font added; `check:deps` reports 0 runtime dependencies |
| prd/CC-002 (WCAG 2.1 AA) | Not applicable to the kit alone. Marks use the line color (15.9:1). Their rendered contrast at small sizes is TICKET-003's to settle (Known Hazard from CR-004), and the text alternative is TICKET-002's |
| prd/CC-003 (no data collection or network) | Met: `check:dist` is clean, the added lines hold no network API, and the boundary lint rejects `fetch` in both modules (probed) |
| prd/CC-004 (no trademarked imagery) | Not applicable |
| prd/TC-001 (no DOM measurement) | Met: number clearance and the helpers use `textWidth` estimates only |
| prd/TC-002 (rounding) | Met: every attribute number goes through `fmt()`, and `checkScene` is clean on the tests' drawings and on every probe drawing, the off-page ones included |
| prd/TC-005 (no React or browser globals in non-rendering code) | Met: `pnpm lint` passes, and `import "react"` or `document.title` prepended to either module fails the boundary rule |
| prd/TC-007 (side-effect-free, tree-shakable) | Met: unused imports bundle to 0 bytes |

No CC-XXX violation was found, so no finding is raised to Critical.

## Findings

### SEC-001: `locate` converts whatever it is given to a number: `null`, `""`, `[]` and `false` lie on the 0 mark, `true` on the 1 cm mark and `"2.3"` on the 2.3 cm mark, an object's `valueOf` runs, and a BigInt or a Symbol throws `TypeError`

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** N/A. Related to A10:2025 Mishandling of Exceptional Conditions and CWE-1287 (improper validation of specified type of input).
**Location:**
- `src/core/ruler.ts:131-137`: `locateOnRuler` computes `value * perUnit` (`:132`) before any type check, so JavaScript's number conversion decides the answer.
- `src/core/ruler.ts:163`: `locate: (value: number) => locateOnRuler(value, length, perUnit)`. `:69-70`: the `RulerScale` interface types `value` as `number`.
- For contrast: `rulerScale` (`:149-165`) and `marksPerUnit` (`:82-87`) take `unknown` and refuse anything that is not exactly a name or a whole number. CR-001 removed their one conversion, `null` read as the default division.

**Description:**
Since CR-001 the core rule's stance is that a value no description gives is refused, never read as a valid one. `rulerScale` keeps it (Input Validation). `locate` does not. Probes on a 30 cm ruler:

| `locate(…)` | Result |
|---|---|
| `null`, `""`, `" "`, `[]`, `false`, `new Date(0)` | `{ kind: "mark", index: 0, value: 0 }` |
| `true` | `{ kind: "mark", index: 10, value: 1 }` |
| `"2.3"` | `{ kind: "mark", index: 23, value: 2.3 }` |
| `"0x1e"` | `{ kind: "mark", index: 300, value: 30 }` |
| `[3]` | `{ kind: "mark", index: 30, value: 3 }` |
| `{ valueOf() { return 2.3 } }` | `{ kind: "mark", index: 23, value: 2.3 }`, after calling the caller's `valueOf` |
| an object whose `valueOf` throws | throws the caller's `Error` |
| `1n` | throws `TypeError: Cannot mix BigInt and other types, use explicit conversions` |
| `Symbol()` | throws `TypeError: Cannot convert a Symbol value to a number` |
| `undefined`, `{}`, `NaN`, ±`Infinity` | `{ kind: "off" }` |

On numbers it is sound: see Input Validation (400,000 doubles, no throw, no non-finite result).

**What keeps it latent:**
- Nothing calls `locate` yet except the tests.
- TICKET-002's check will read the object's ends from the frozen description. A number there has passed `typeof value === "number" && Number.isFinite(value)` (`src/core/validate/structure.ts:118`).
- A refused end is left out of the description, and `locate(undefined)` is `off`.

**Attack Scenario:** N/A (Informational)
**Impact:** none from a description today. The risk is a later caller that hands `locate` an unvalidated value:
- a check that reads before the tool handler drops `null`s, which the strict tool profile uses for an absent optional property (AD-006);
- a helper for TICKET-003's object ends;
- a consumer, once the rule is exported.

Such a caller would read a missing end as the 0 mark and `true` as 1 cm. That is the fail-open shape CR-001 closed for the division. A value that throws is the only way to make the core rule throw. Inside a domain check, `validateWith`'s `catch` would turn it into `internal_error` for the whole description.
**Recommendation:**
- In `locateOnRuler`, return `{ kind: "off" }` unless `typeof value === "number"`, before the multiplication. Type the parameter `unknown`, as `rulerScale`'s are:
  ```ts
  function locateOnRuler(value: unknown, length: number, perUnit: number): RulerLocation {
    if (typeof value !== "number") return { kind: "off" };
    const position = value * perUnit;
    // …unchanged
  }
  ```
  `locate(value: unknown)` on `RulerScale` follows.
- Add the table's non-numbers to the off-ruler cases in `tests/core/ruler.test.ts:193-195`.
- Or defer to TICKET-002 with a Known Hazard: pass `locate` only an end read from the validated description, and declare both ends in the check's `inputs`, so a refused end is not also reported as off the ruler (AD-004).

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed — `locate` takes `unknown` and returns `{ kind: "off" }` for anything but a number, before any arithmetic: `null`, `""`, `[]`, booleans, `"2.3"`, objects (whose `valueOf` never runs), BigInts and symbols. Tested; removing the check fails the test. Approved by the user, 2026-10-20.

---

### SEC-002: `drawRulerMarks` checks its points through their iterator but measures and draws them through other reads, and bounds neither the points nor the font size; `rulerMarksDepth` and `rulerNumberOverhang` check nothing

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** N/A. Related to A10:2025 Mishandling of Exceptional Conditions, CWE-367 (time-of-check time-of-use) and CWE-20 (improper input validation).
**Location:**
- `src/layout/kit/ruler.ts:74`: `[...from, ...to].every(Number.isFinite)` checks what the points' iterators yield.
- `src/layout/kit/ruler.ts:75`: the edge is `Math.hypot(to[0] - from[0], to[1] - from[1])`, read by index.
- `src/layout/kit/ruler.ts:81`: `checkedOptions` returns the caller's `from` and `to` objects, not the numbers it checked.
- `src/layout/kit/ruler.ts:128-136`: `drawRulerMarks` iterates the points again (`const [x0, y0] = from`) and builds the normal, the spacing and the width from them and the index-read edge.
- `src/layout/kit/ruler.ts:78`: the font size need only be finite and survive `fmt()`, with no upper bound.
- `src/layout/kit/ruler.ts:89-91` (`rulerMarksDepth`) and `:97-99` (`rulerNumberOverhang`): exported for TICKET-003 (QR-010), with no check on `unit`, `length` or `fontSize`.

**Description:**
graph-library `number-lines-and-coordinate-graphs-ticket-001-security-review/SEC-004` asked the kit to fail closed on options no validated description gives, so a layout bug becomes `internal_error` rather than a wrong drawing. `checkedOptions` does so for the unit, length, division and side, and for the font size's lower limit. Four gaps remain, each reached only by a direct call.

**1. The points are checked as one value and drawn as another.** Probes on a 10 cm ruler with `to` = [380, 100]:
- A `from` array whose iterator yields [20, 100] while its indexes hold [379, −5000] passes. The edge is measured as 5,100 units, so the normal is 360 / 5,100 of a unit long, and every mark is drawn at 0.07 of its length: the whole-centimetre mark is 1.41 units, not 20.
- A `Proxy` that returns [20, 100] while checked and [5e20, −5e20] afterwards passes. It draws the first mark at (5e20, −5e20) with zero length, and the last at (0, 0).
- `checkScene` reports nothing for either.

**2. Extra and missing coordinates.** [20, 100, 7] draws and ignores the 7. [20] and [] fail closed, but with "from and to must be different points".

**3. No upper bound.** `checkScene` reports nothing for either of these:
- Points at ±9e20 draw a 30 cm ruler from x = −9e20 to 9e20.
- `fontSize` 9.99e20 draws the numbers with `font-size` 998999999999999900000 at y = 8.49e20. Even 1e21 passes, because `fmt(1e21)` prints 999999999999999900000.

**4. The two helpers check nothing.**
- `rulerMarksDepth("feet")` and `rulerMarksDepth("toString")` throw `TypeError`.
- `rulerMarksDepth("inches", …)` returns:
  - NaN for `NaN`;
  - −95 for −100;
  - 25.0048 for 0.004, which `drawRulerMarks` refuses;
  - 1.2e21 for 1e21.
- `rulerNumberOverhang(31)` answers for a ruler that cannot exist, and `rulerNumberOverhang(30, −12)` gives negative overhangs.
- `rulerMarksDepth` spreads `RULER_MARK_LENGTHS[unit]` into `Math.max` (`:90`). For either unit that is a frozen table of 3 or 5 numbers. For an unknown unit whose name is on a polluted `Object.prototype`, it is whatever is there: `[1, 2, 3, 400]` gives a depth of 417.4, and a 2,000,000-entry array throws `RangeError: Maximum call stack size exceeded`.

**Attack Scenario:** N/A (Informational)
**Impact:** none from a description. TICKET-003 builds the points from literals, picks the font size from the length (Known Hazard from CR-005), and passes the validated unit and length, so every probe above needs a layout bug or a hostile direct caller. The risk is the one SEC-004 named: a later layout that computes a point or a size wrongly gets a silently wrong or off-page ruler instead of `internal_error`. A layout that sizes its body with a bad `fontSize` and passes the same value to `drawRulerMarks` still fails closed, because the drawing throws. A layout that passes the helpers some other value does not.
**Recommendation:**
- In `checkedOptions`, read each point once into numbers, then check and return those numbers. Measure and draw only from what it returns:
  ```ts
  const point = (p: unknown) => (Array.isArray(p) && p.length === 2 ? [p[0], p[1]] : []);
  const [x0, y0] = point(from);
  const [x1, y1] = point(to);
  if (![x0, y0, x1, y1].every(Number.isFinite)) throw refuse("from and to must each be two finite numbers");
  ```
- Bound the points and the font size to what a layout can use, and state the bounds in the doc comment. For example, every coordinate within ±10 × `SCENE_WIDTH`, and `fontSize` at most twice `defaultStyle.fontSizes.title`.
- Give `rulerMarksDepth` and `rulerNumberOverhang` the same checks, throwing `RangeError`: an own key of `RULER_MARK_LENGTHS` for the unit, `isRulerLength(unit, length)`, and the font-size rule. Or say in their doc comments that they take only the unit, length and font size given to `drawRulerMarks`, and add that to TICKET-003's QR-010 Known Hazard.
- Tests:
  - the two-faced point;
  - a three-coordinate point;
  - a coordinate of 1e20;
  - `fontSize` 1e20;
  - `rulerMarksDepth("feet")` and `rulerMarksDepth("inches", Number.NaN)`.

**Compliance Impact:** None. prd/TC-002 holds: every off-page value still passes through `fmt()`.
**Status:** Resolved
**Resolution:** Fixed — `checkedOptions` reads each point once by index into two numbers (`pointOf`), and only those are measured and drawn. Coordinates must be within ±4,000 (ten drawing widths) and `fontSize` from 0.01 to 36 (twice the title size), both stated in the doc comments. `rulerMarksDepth` and `rulerNumberOverhang` check their unit or length and font size and throw `RangeError`. Tests cover the two-faced point, three coordinates, a non-array, 1e20, 37 and the helpers' refusals; a Known Hazard on TICKET-003 states the limits. Approved by the user, 2026-10-20.

---

### SEC-003: The guard builds its messages with `String()` of the caller's values, so a value whose `toString` throws escapes as that error instead of the guard's `RangeError`, and a long `side` or `from` builds a message of 10 to 20 million characters

**Severity:** Informational
**Category:** Data Exposure
**OWASP Reference:** N/A. Related to A10:2025 Mishandling of Exceptional Conditions, CWE-755 (improper handling of exceptional conditions) and CWE-209 (error message containing sensitive information).
**Location:**
- `src/layout/kit/ruler.ts:70`: `refuse` puts its `problem` text into the `RangeError` message.
- `src/layout/kit/ruler.ts:74`, `:77`, `:78`, `:80`: `String(from)`, `String(to)`, `String(side)`, `String(fontSize)`, `String(length)`, `String(unit)` and `String(smallestDivision ?? "its default division")`, each a caller's value.
- `src/layout/kit/ruler.ts:64-68` and `:122-123`: the doc comments promise "Throws `RangeError`, naming the option".
- For comparison, `checkedLabels` (`src/layout/kit/axis.ts`) throws one fixed message, and `describeValue` (`src/core/issues.ts:198-221`) describes any value without calling into it.

**Description:**
QR-008 asked each failure to name its option, and the messages now quote the value refused. `String()` calls the value's own `toString`, or an array's elements', and copies a string whole. Probes:
- **A `toString` that throws.** On `side`, `length`, `unit`, `smallestDivision` or `fontSize`, or on an element of `from`, it makes `drawRulerMarks` throw the caller's `Error`, not a `RangeError`.
- **Message size.**
  - A `side` of 10,000,000 characters gives a 10,000,054-character message.
  - A `from` of 5,000,000 `NaN` gives a 20,000,068-character message, built in 65 ms.
- **Types hidden.** `fontSize: "12"`, `new Number(12)` and `12n` are each reported as "got 12", so the message hides the wrong type.
- **Not iterable.** A non-iterable `from` throws `TypeError` before any message is built. The code review noted this and did not raise it; it belongs to the same contract.

**Where a message can go:**
- `createGraphWith` (`src/graph.ts:21-47`) is the only place in `src` that calls a layout, and its bare `catch` returns one fixed `internal_error`.
- Through a test layout registry, all four kinds of failure above returned the same 199-byte result, with none of the probe's marker text.
- `exportSource` and the tool handler are still empty modules.

**Attack Scenario:** N/A (Informational)
**Impact:** none today. No message leaves the package, and the kit's only planned caller (TICKET-003) passes values it chose. But the promise "throws `RangeError`, naming the option" does not hold for a value with a hostile `toString`. A future path that surfaces a layout error, such as a debugging hook, the exporter or a log, would carry caller text of any size with it, which GSV TICKET-002 SEC-003 keeps out of issues.
**Recommendation:**
- Describe refused values with `describeValue` (`src/core/issues.ts:198`). It never calls `toString` or `valueOf`, caps a string at its quoting limit (a 10,000,000-character `side` becomes 42 characters), and names lists, objects, BigInts and symbols by kind. For example: `` refuse(`side must be "left" or "right", got ${describeValue(side)}`) ``. Print the points' numbers only once they are known to be numbers (SEC-002).
- Or name the option and not the value, as `checkedLabels` does.
- Tests: a `side` whose `toString` throws gives a `RangeError`, and a 10,000,000-character `side` gives a message under 200 characters.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed — refused values are described with `describeValue`, which never calls the caller's code and caps strings, so a throwing `toString` gives the guard's `RangeError` and a 10,000,000-character `side` gives a message under 200 characters. Points are never printed. Tested. Approved by the user, 2026-10-20.

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Fixed | Non-numbers are off the ruler; test | No | `src/core/ruler.ts`, `tests/core/ruler.test.ts` |
| SEC-002 | Fixed | Points read once; coordinate and font-size bounds; helpers checked; tests; Known Hazard on TICKET-003 | No | `src/layout/kit/ruler.ts`, `tests/layout/kit/ruler.test.ts`, TICKET-003 |
| SEC-003 | Fixed | `describeValue` in every message; tests | No | `src/layout/kit/ruler.ts`, `tests/layout/kit/ruler.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:**
- All three Informational findings are fixed and re-verified; each was reachable only by a direct call with values no validated description gives. TICKET-003 carries the kit's limits as a Known Hazard.
- Re-verification: `pnpm generate` (no change), `lint`, `typecheck`, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size`, `publint`, `attw`, `audit` and `gener8v-state lint` exit 0. `pnpm test` (1,276 tests) exits 0 on three runs. Seven deliberate breaks of the fixes each fail a test.
- Dependency audit: `pnpm audit` and `pnpm audit --prod`, 2026-10-20, no known vulnerabilities.
