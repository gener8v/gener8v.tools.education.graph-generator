# TICKET-002: Build the Scene model and the shared rendering core — Quality Review

## Summary

This review covers the shared rendering core delivered for graph-library/component-packaging-and-source-export/TICKET-002 (branch `ticket/cpse-002`, delivery commit `2bed490`). The `quality-reviewer` agent ran the findings phase in a fresh context. It re-ran every verify command and probed behaviour in scratch copies of the commit (`git archive 2bed490`, and `26f296e` for comparison). The shared working tree was not used.

The kit modules are small, pure and well commented, and the branded `Rounded` type is a sound way to enforce AD-007 at compile time. Every verify command passes on React 19 and on React 18. The weak points are in what every NLC, DGP and GSS layout and TICKET-005's printer will build on:
- markup decisions that the printer must copy by hand;
- a `SceneNode` type and string attributes that let layout mistakes compile and render without complaint;
- a parity test whose teardown depends on a 20 ms timer;
- `@types/jsdom` removing the type checker's refusal of browser globals in `src/`;
- `wrap` rewriting no-break spaces.

There are 12 findings: 0 Critical, 6 Concerns and 6 Suggestions. The verdict below is provisional until resolution with the user.

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
- `package.json` (the `jsdom` and `@types/jsdom` dev dependencies)
- `pnpm-lock.yaml` (only the resolved `jsdom` 30.1.2 and `@types/jsdom` 30.0.0, checked in the installed tree)

Neighbours read for context and patterns: `src/core/format.ts`, `src/core/style.ts`, `src/core/result.ts`, `tests/fixtures/plain-text.ts`, `tsconfig.json`, `eslint.config.js`, `vitest.config.ts`, `tests/setup/build.ts`, `.github/workflows/ci.yml`, `CONTRIBUTING.md`, the TICKET-002, TICKET-003 and TICKET-005 ticket files, and `.gener8v/technical-design/system-design.md` (AD-002, AD-007, AD-008, AD-010, AD-011).

**Findings:** 12
**Critical:** 0 | **Concerns:** 6 | **Suggestions:** 6

## Quality Assessment

### Code Organization

**Rating:** Adequate
**Notes:** Responsibilities are cleanly split. `scene.ts` holds the data contract and the two mapping tables. Each kit module does one job (`format`, `scale`, `text`, `labels`). React appears only in `src/react/SceneSvg.tsx`. Dependencies point the right way, `src/react` → `src/layout` → `src/core`. `kit/format.ts` takes `Rounded` from `scene.ts` as a type-only import, so there is no runtime cycle, and `text.ts` re-exports the font stack from `defaultStyle` instead of copying it. `REACT_PROP` belongs in the framework-neutral `scene.ts`, because the exporter in `src/export` must not depend on `src/react`. Deriving `SvgAttr` from its keys gives the closed attribute set a single source.

The structural weakness is that only part of the markup is shared. The root element, the placement of `<title>` and the rules for each node live in `SceneSvg`'s code. The "one table both can import" therefore covers only half of what TICKET-005 must mirror (QR-001).

### Readability

**Rating:** Strong
**Notes:** Functions are short and named for what they do. Comments cite the decision behind each rule: AD-007 rounding, AD-008's ban on ids, and AD-010's 1.1 factor. The Liang–Barsky clip explains its `(p, q)` pairs, and the width table is annotated row by row. Test names describe behaviour, for example "treats boxes that only share an edge as not overlapping" and "never splits a surrogate pair". Two small points:
- `displayValue(n, true)` is a boolean flag, where neighbouring code uses the `"supplied" | "derived"` union (QR-010).
- `text.test.ts` contains two invisible characters that a reader cannot see (QR-011).

### Error Handling

**Rating:** Adequate
**Notes:** `fmt()` throws a `RangeError` that names the bad value. DEL-003 records that TICKET-003 must catch layout errors so that components never throw (CPSE-REQ-018). The policy is clear, but it is applied unevenly:
- `fmt` checks its input but not its result: `fmt(1e307)` returns `Infinity`, and `fmt(1e306)` prints `1e+306`.
- `wrap` accepts `NaN`, zero or negative sizes and returns lines that look plausible but are wrong (QR-009).

`linearScale` and `placeLabel` pass `NaN` through. That is acceptable, because `fmt` rejects it when the value reaches a Scene. `SceneSvg` relies on the types: an attribute name outside `REACT_PROP`, reachable only through a cast, renders as an attribute called `undefined`. Probe: `[["onclick", "x"], ["class", "y"]]` renders `<rect undefined="y">`. This is not raised as a finding, because the closed type makes it unreachable from typed code.

### Test Coverage

**Rating:** Adequate
**Notes:** Commands were run on Node.js v24.1.0 and pnpm 10.28.2, in a copy of `2bed490` extracted with `git archive` and installed with `pnpm install --offline --frozen-lockfile`. They are the verify commands from `context.md`'s `## Repositories` table, plus the delivery's extra checks:
- `pnpm lint`: exit 0, no findings.
- `pnpm typecheck`: exit 0.
- `pnpm test`: exit 0. 21 files and 566 tests passed in 3.00 s. Global setup built `dist/`.
- `pnpm build`: exit 0.
- `pnpm check:dist`: exit 0, "Built files scanned: 4, no network APIs or network modules."
- `pnpm check:deps`: exit 0, "Runtime dependencies: 0, all justified."
- `pnpm size`: exit 0. Every entry is 0 B gzipped, because no entry includes the new modules yet.
- `pnpm publint`: exit 0, "All good!".
- `GRAPH_GENERATOR_PREBUILT=1 pnpm vitest run tests/react tests/layout`: exit 0, 5 files and 66 tests.
- React 18.3.1, the CI matrix's other leg, in a second copy with React 18 added offline: `pnpm typecheck` exit 0; `pnpm vitest run tests/react tests/layout` exit 0 with 66 passed; `tests/react` run five times, 33 passed each time.

No run printed React warnings or anything to stderr.

Every acceptance criterion has a test, and the tests check behaviour:
- `SceneSvg` markup is checked by walking a parsed DOM against the Scene.
- Every `REACT_PROP` entry is round-tripped to its SVG name.
- The plain-text fixtures render literally in `aria-label`, `<title>` and a `text` node.
- The `@ts-expect-error` lines keep the brand check alive.
- The delivery's two mutation checks show that the parity test and the type test can fail.

Weak points:
- The parity test's teardown depends on a 20 ms timer (QR-002).
- No test covers no-break spaces (QR-006), grapheme clusters (QR-007), ill-formed nodes (QR-005), or edge inputs to `wrap` and `fmt` (QR-009).
- `linearScale`'s docstring says either interval may run in reverse, but only a reversed range is tested. A reversed domain does work: `linearScale([10, 0], [0, 400])` returns 0, 200 and 400 for 10, 5 and 0.
- The linear-time `wrap` test asserts a wall-clock time under 2,000 ms. It took 27 ms here, so the margin is wide enough not to flake.

### Observability & Operability

**Rating:** Adequate
**Notes:** This is a library with no logging, by design: CPSE-REQ-005 forbids telemetry. The rating is calibrated to that, so what matters here is whether a developer can diagnose a failure. `fmt`'s `RangeError` names the value but not the attribute or node. TICKET-003's fallback will surface it as an internal error, which is acceptable. The weak spot is the parity test. When it catches a real divergence, the report also contains five unrelated `ReferenceError: window is not defined` errors (QR-002).

## Findings

### QR-001: Only element and attribute names are shared; the root element, `<title>` and node rules that TICKET-005's printer must mirror live in `SceneSvg`'s code

**Category:** Maintainability
**Severity:** Concern
**Location:** `src/react/SceneSvg.tsx:14`, `src/react/SceneSvg.tsx:31-38`, `src/layout/scene.ts:1-4`
**Description:** `ELEMENT_FOR_KIND` and `REACT_PROP` fix which element each node kind prints as and which prop each attribute uses. Every other decision that shapes the markup is code inside `SceneSvg`:
- the root's attributes, their order and their value formats: `role`, `aria-label`, `` viewBox: `0 0 ${width} ${height}` `` and `width: "100%"` (`:35`);
- `<title>` as the first child (`:36`);
- `text` winning over `children` when a node has both (`:14`);
- how a repeated attribute resolves. Building a props object keeps the first position and the last value. Probe: `[["x", 1], ["y", 2], ["x", 3]]` renders `x="3" y="2"`. A printer that writes the pairs in order would emit `x` twice, which is a JSX compile error.

The delivery record's Notes pass the first two to TICKET-005 as prose: "print `role`, `aria-label`, `viewBox`, `width` on the root in that order, then `<title>`". The header comment in `scene.ts:1-4` says both printers "read the two mapping tables below, so their markup cannot drift". That overstates what the tables cover.
**Impact:** CPSE-NFR-001 needs the two printers to agree byte for byte. The ticket's Known Hazard asked for one table that both import, so that drift is impossible by construction. As delivered, any change to the root needs a matching edit in a second module, for example adding `focusable="false"`, a `height` or `preserveAspectRatio`. TICKET-005's equality test will only catch a divergence in shapes that its examples happen to contain, and only once both printers exist.
**Recommendation:** Move every markup decision into one framework-neutral function beside the tables in `src/layout/scene.ts`, for example:
```ts
export interface SvgElement {
  readonly tag: string;
  readonly props: ReadonlyArray<readonly [prop: string, value: string | number]>;
  readonly children: ReadonlyArray<SvgElement | string>;
}
export function sceneElement(scene: Scene, name: string): SvgElement;
```
It builds the root with its props in order, the `<title>`, and each node with the React prop names applied. It decides the text-versus-children rule once. `SceneSvg` then becomes a few lines that walk the tree with `createElement`, and TICKET-005's printer walks the same tree as JSX text. Keep the delivered tests, and add one asserting that the root's props are `role`, `aria-label`, `viewBox`, `width`, in that order. Either way, correct the `scene.ts` header comment.
**Status:** Resolved
**Resolution:** See code review CR-003: `rootAttrs` and `textAlternativeFor` in `src/layout/scene.ts` carry the root, `<title>` and naming rules; node shape rules are in the types and `checkScene`.

---

### QR-002: The server/browser parity test needs a 20 ms timer to tear down cleanly, and a real failure is reported among unrelated `window is not defined` errors

**Category:** Testing
**Severity:** Concern
**Location:** `tests/react/SceneSvg.test.tsx:170-171`, `tests/react/SceneSvg.test.tsx:172-185`, `tests/react/SceneSvg.test.tsx:186-187`, `tests/react/SceneSvg.test.tsx:188-192`
**Description:** After the renders, React's scheduler still has a task queued with `setImmediate`. It is the passive-effect flush at `react-dom-client.development.js:19555`, and its first statement reads `window.event`. For a tree with no hooks, React queues it only when the development build has measured a non-zero render duration (`finishedWork.actualDuration`). Whether any work is left at all therefore depends on timing. The `setTimeout(resolve, 20)` lets the task run before `finally` deletes the globals. It works because a `setImmediate` queued earlier runs before a 20 ms timer, which is an assumption about React's internals. Measured on copies of the test:
- **Without the wait:** all 10 of 10 runs exit 1. Each reports 8 to 11 unhandled `ReferenceError: window is not defined` errors from `Immediate.performWorkUntilDeadline`, while the test itself is reported as passed. The count varies from run to run, because whether a given root queues the task depends on its measured duration.
- **With a real mismatch** (scene 3 rendered with a different text alternative): the assertion throws out of `forEach`, which skips that root's `unmount()` and the wait. The run reports the correct `AssertionError` plus 5 unhandled `window is not defined` errors.
- **Import order:** `react-dom/client` is imported dynamically after the globals are installed, because it decides `canUseDOM` when the module loads. Nothing in the file says so. A static import at the top, which TICKET-004's hydration tests will want, would silently change what the test exercises.
**Impact:** This is the unit-level proof of CPSE-REQ-011, and TICKET-004 will extend it. When it catches a regression, the developer sees errors about `window` alongside the real cause. The 20 ms margin may also become too short as the list of scenes grows, because React's scheduler works in 5 ms slices and reschedules itself.
**Recommendation:** Drive the client render with React's `act`, which `react` exports in both 18.3 and 19:
- set `globalThis.IS_REACT_ACT_ENVIRONMENT = true` together with `window` and `document`;
- wrap the render and the unmount: `act(() => root.render(<SceneSvg scene={scene} />))` and `act(() => root.unmount())`;
- delete the timer;
- unmount every root in the outer `finally` before the globals are removed;
- add a one-line comment saying why `react-dom/client` is imported after the globals.

Measured on a copy: the `act` version passed 10 of 10 runs with no wait on React 19.3.0, and 3 of 3 on React 18.3.1. A forced mismatch reported only the assertion.
**Status:** Resolved
**Resolution:** The parity test uses `act()` (with `IS_REACT_ACT_ENVIRONMENT`) for render and unmount; the 20 ms timer is gone. 10/10 clean runs on React 19.3.0, and clean on React 18.3.1.

---

### QR-003: `@types/jsdom` adds the DOM library to the whole type-check program, so browser globals in `src/` now type-check

**Category:** Patterns
**Severity:** Concern
**Location:** `package.json:82`, `tsconfig.json:4`, `tsconfig.json:17`, `tsconfig.json:20`, `tests/react/SceneSvg.test.tsx:2`
**Description:** `node_modules/@types/jsdom/index.d.ts` contains `/// <reference lib="dom" />`. `tsconfig.json` is a single program over `src`, `tests` and `scripts` with `lib: ["ES2023"]`. Once the parity test imports `jsdom`, the DOM library therefore applies to every file, `src/` included. The test itself depends on this: `typeof window` at `tests/react/SceneSvg.test.tsx:153` would otherwise be an error.

Probe: I added `window.innerWidth` to a file in `src/react/` and `document.title` to a file in `src/core/`, then ran `tsc --noEmit`:
- at the parent commit `26f296e`: exit 2, with TS2304 "Cannot find name 'window'" and TS2584 for `document`;
- at `2bed490`: exit 0.

ESLint still rejects `document` in `src/core`, through the boundary rule. No lint rule covers browser globals in `src/react`, though. A component whose `width` depends on `typeof window` or `window.innerWidth` passes both `pnpm lint` and `pnpm typecheck`. That is exactly the delivery's own parity mutation.
**Impact:** CPSE-REQ-011 forbids browser-only facilities during render. `src/react` will gain `Graph`, `Placeholder` and the component factory in TICKET-003, and one component per graph type after that. Until this delivery, the type checker refused every browser global there. That guard is now gone for the whole program, and nothing records the change. The only check left is the runtime parity test, which covers `SceneSvg` alone.
**Recommendation:** Restore a static guard, in one of two ways:
- **Lint (cheaper, matches the established pattern):** add a `src/react/**` block to `eslint.config.js` that restricts `window`, `document`, `navigator` and `self`, together with the existing `globalThis.window` syntax selectors. Flat config replaces rule options per block, so this block must also spread `networkGlobals`. Add a case to `tests/package/boundaries.test.ts`.
- **Separate type-check programs:** exclude `tests` from `tsconfig.json`, add a `tests/tsconfig.json` with `lib: ["ES2023", "DOM"]`, and make `typecheck` run both programs.

The lint rule is enough for `src/react`. The split programs also restore the type-level check for `src/core`, as a second guard behind the lint rule.
**Status:** Resolved
**Resolution:** `eslint.config.js` gains a `src/react/**` block that rejects `window`, `document`, `navigator`, `self` and their `globalThis`/`self` forms, keeping the network rules; boundary tests added.

---

### QR-004: The `fmt()` guarantee stops at string attributes, and the kit offers no safe way to build `d`, `transform` or `viewBox` strings

**Category:** Maintainability
**Severity:** Concern
**Location:** `src/layout/scene.ts:94-95`, `src/layout/kit/format.ts:16-20`, `tests/layout/kit/format.test.ts:46-55`
**Description:** `AttrValue = string | Rounded` stops a raw number from entering a numeric attribute, but any string is accepted. DEL-002 records this and leaves `d` strings to convention. `fmtPoints` covers `points`, but nothing covers `d`, `transform` or a nested `viewBox`. Layouts will build those with template literals, where forgetting `fmt()` still compiles. Probe: `` ["d", `M ${raw} ${raw / 3} L 0 0`] `` and `` ["transform", `rotate(${raw} 0 0)`] `` both type-check, and the first renders `d="M 10.123456 3.374485333333333 L 0 0"`.
**Impact:** Path data is where raw trigonometry ends up: angle arcs, sectors, curves, isometric solids (GSS) and axis arrows. ECMAScript leaves the precision of `Math.sin`, `Math.cos` and `Math.atan2` to each implementation, so an unrounded result can differ in its last digits between V8 on the server and JavaScriptCore or SpiderMonkey in the browser. That breaks hydration (CPSE-NFR-005) and makes exported markup engine-dependent, which is the failure AD-007's `fmt()` exists to prevent (TR-002). The brand catches a raw number in a numeric attribute but not in path data, the attribute that carries the most numbers. Every NLC, DGP and GSS layout ticket will write these strings.
**Recommendation:** Add a tagged template to `src/layout/kit/format.ts` that accepts only `Rounded` interpolations, for example:
```ts
declare const svgNumbersBrand: unique symbol;
export type SvgNumbers = string & { readonly [svgNumbersBrand]: true };
export function svg(strings: TemplateStringsArray, ...values: Rounded[]): SvgNumbers;
```
- Make `fmtPoints` return `SvgNumbers` too.
- Type `d`, `points`, `transform` and `viewBox` as `SvgNumbers`, for example through a value type per attribute, so that a hand-built string fails `pnpm typecheck` the way a raw number does.
- Extend the `@ts-expect-error` test with a raw `d`.

If typing per attribute is too heavy, the tag alone still helps. A version that accepts `number` and passes each value through `fmt` makes the right thing the easy thing.
**Status:** Resolved
**Resolution:** See code review CR-001: `pathData`, `translate` and `checkScene`.

---

### QR-005: `SceneNode` allows `text` and `children` on every kind, and `SceneSvg` resolves ill-formed combinations without complaint

**Category:** Maintainability
**Severity:** Concern
**Location:** `src/layout/scene.ts:97-106`, `src/react/SceneSvg.tsx:13-14`
**Description:** `SceneNode` is a single interface. `children` and `text` are optional on every `kind`, and nothing prevents a repeated attribute. Each of the following type-checks and renders without complaint:

| Node | Rendered |
|------|----------|
| `text` with `text: "label"` and a child `rect` | `<text x="1">label</text>` (the child is dropped) |
| `circle` with a child `rect` | `<circle r="5"><rect></rect></circle>` |
| `rect` with `text: "hidden words"` | `<rect>hidden words</rect>` |
| `rect` with attributes `x`, `y`, `x` | `<rect x="3" y="2">` |

**Impact:** AD-002 makes layouts "testable as data". The geometry NFR tests (NLC-NFR-001, DGP-NFR-001, GSS-NFR-001, GSS-NFR-003) assert against Scene nodes with no DOM. A node that `SceneSvg` drops or nests invalidly therefore passes the layout's own tests, yet is wrong or missing in the drawing. Each implicit rule is also one more thing TICKET-005's printer must reproduce exactly (QR-001). Eleven layouts will write to this contract. The delivery already enforces the attribute set and rounding at compile time (DEL-001, DEL-002), and node shape is the remaining gap.
**Recommendation:** Make `SceneNode` a union discriminated by `kind`:
- `TextNode`: `{ kind: "text"; attrs; text: string }`
- `ContainerNode`: `{ kind: "group" | "svg"; attrs; children: readonly SceneNode[] }`
- `ShapeNode`: `{ kind: Exclude<SceneNodeKind, "text" | "group" | "svg">; attrs }`

`toElement` then switches on `kind`, and no precedence rule remains. For repeated attributes, add a shared test helper that layout tests call, for example `assertWellFormedScene(scene)` in `tests/helpers/`, which checks that attribute names are unique within each node. Add `@ts-expect-error` cases for a shape with children and for a non-text node with text.
**Status:** Resolved
**Resolution:** See code review CR-003: per-kind node types and `checkScene`.

---

### QR-006: `wrap` treats no-break spaces as break points and rewrites them as ordinary spaces

**Category:** Maintainability
**Severity:** Concern
**Location:** `src/layout/kit/text.ts:95`, `src/layout/kit/text.ts:104`
**Description:** `text.split(/\s+/)` splits on every character that JavaScript's `\s` matches. That includes the no-break space (U+00A0), the narrow no-break space (U+202F), the figure space (U+2007), the ideographic space (U+3000) and U+FEFF. The lines are then rejoined with U+0020. Probes:
- `wrap("radius 5 cm and diameter 10 cm", 60, 14)` returns `["radius 5", "cm and", "diameter", "10 cm"]`. The value and its unit land on different lines, and the no-break spaces become plain spaces.
- `"10 000"` comes back as `"10 000"` with U+0020.
- In `"数轴　数轴"`, the ideographic space becomes U+0020.

The docstring promises breaks "on word boundaries". A no-break space is by definition not one.
**Impact:** Every title and label in every graph type goes through `wrap`. Authors and language models use no-break spaces precisely to keep a number with its unit ("5 cm", "10 000"), and curriculum style guides require it. The drawn text also stops matching the caller's text and the text alternative, which keep the original characters. `BENIGN_TEXT` describes such text as text "a printer must keep exactly".
**Recommendation:** Split only on breakable whitespace. The simplest choice is ASCII whitespace, `/[ \t\n\v\f\r]+/`. U+00A0, U+2007, U+202F and the other space characters then stay inside words and come back unchanged. A long run of CJK text joined by U+3000 is already split between code points when it is too wide. Add tests that `wrap` never breaks at U+00A0 or U+202F and returns them unchanged.
**Status:** Resolved
**Resolution:** See code review CR-004.

---

### QR-007: Splitting an over-long word can break inside a grapheme cluster

**Category:** Maintainability
**Severity:** Suggestion
**Location:** `src/layout/kit/text.ts:119-132`
**Description:** A word wider than the line is cut between code points (DEL-004). That never splits a surrogate pair, but it can split something the reader sees as one character:
- Three teacher emoji in a row (U+1F469 U+200D U+1F3EB, from `BENIGN_TEXT`) at width 20 come back as `[U+1F469 U+200D]`, `[U+1F3EB]` and so on. The woman and the school land on separate lines, with a dangling joiner.
- A flag (U+1F1EB U+1F1F7) splits into its two regional-indicator letters.
- At very small widths, a combining mark ends up alone on its own line: `"Wé"` at width 1 returns `"W"`, `"e"`, `"́"`.
**Impact:** The damage is cosmetic and limited to words wider than the line. But emoji runs and long unspaced strings in labels are exactly the input this split exists for.
**Recommendation:** Keep a code point in the current piece when it has zero advance, or when it follows a ZWJ. Combining marks, ZWJ and variation selectors are already listed in `ZERO_WIDTH`. Keep a second regional indicator with the first. Do not use `Intl.Segmenter`: its ICU data differs between Node.js and browser versions, which would put CPSE-REQ-011 parity at risk. Add tests that use the `BENIGN_TEXT` emoji.
**Status:** Resolved
**Resolution:** Over-long words are split between clusters: a base with its marks, joiners, variation selectors and modifiers, a ZWJ sequence, a flag pair, or a Devanagari letter with its spacing sign. Tested for all of them.

---

### QR-008: `placeLabel` treats figure lines as zero-width straight segments, with no clearance for stroke width and no curves

**Category:** Maintainability
**Severity:** Suggestion
**Location:** `src/layout/kit/labels.ts:9-18`, `src/layout/kit/labels.ts:31-62`, `src/layout/kit/labels.ts:74-84`
**Description:** An obstacle is either a box or an infinitely thin straight segment, and touching does not count as overlapping. Figure strokes are 2 units wide by default (`defaultStyle.lineWidths.figure`, `src/core/style.ts:55`). Probe: a horizontal line at `y = 20.5` does not block a 40×20 label at the origin, although the drawn stroke spans y 19.5–21.5 and covers the label's bottom 0.5 units. Circles, ellipses, arcs and polylines cannot be obstacles at all, so each layout must convert them to lists of segments itself.
**Impact:** GSS-NFR-003 (labels do not overlap) is verified on these boxes. Every layout will either pad its own boxes and approximate its own curves, each slightly differently, or ship labels that touch the strokes next to them. A single shared placer was what RES-005 asked for.
**Recommendation:**
- Add a `clearance` option that enlarges the candidate box before testing, perhaps defaulting to half the figure stroke width.
- Add small helpers beside `placeLabel`, such as `polylineSegments(points)` and `circleSegments(cx, cy, r, count)`, or accept a circle obstacle directly, so curves are approximated in one place.
- Test both.
**Status:** Resolved
**Resolution:** `placeLabel` takes an optional `padding` (clearance on every side; the returned box is the label's own). Curves are passed by the layout as segments or boxes, as documented.

---

### QR-009: `fmt` checks its input but not its result, and `wrap` accepts sizes that cannot be valid

**Category:** Error Handling
**Severity:** Suggestion
**Location:** `src/layout/kit/format.ts:10-14`, `src/layout/kit/text.ts:94-97`
**Description:** DEL-003 treats a non-finite number as a layout bug that must throw, and `fmt`'s docstring says such a number "can never reach markup". There are two gaps:
- **`fmt` overflow:** `n * 100` overflows when `|n|` exceeds about 1.8e306. `fmt(1e307)` returns `Infinity` and `fmt(-1e307)` returns `-Infinity`, both typed as `Rounded`. Results from about 1e21 upward print in exponent form, for example `fmt(1e306)` prints `1e+306`.
- **`wrap` sizes:** `wrap` validates neither `maxWidth` nor `fontSize`. `wrap("one two three", NaN, 14)` returns one word per line, `wrap("ab cd", 0, 14)` returns one character per line, and `wrap("ab cd", 10, -14)` keeps everything on one line.
**Impact:** Both cases are layout bugs, such as a division by a near-zero length or a size read from the wrong field. Under the delivery's own policy they should fail loudly. Instead they produce markup that looks plausible but is wrong. In the 400-unit drawing space, any coordinate beyond about 1e6 is already a bug.
**Recommendation:**
- In `fmt`, check the rounded result: throw a `RangeError` unless `Number.isFinite(rounded) && Math.abs(rounded) < 1e15`. That bound also rules out exponent form.
- In `wrap`, throw a `RangeError` unless `maxWidth` and `fontSize` are positive finite numbers.
- Add a test for each.
**Status:** Resolved
**Resolution:** `fmt` checks its result: non-finite or at least 1e21 (exponent form) throws `RangeError`. `wrap` rejects a non-finite or non-positive width or font size.

---

### QR-010: `displayValue` takes a boolean flag where the codebase uses the provenance union, and repeats `formatMeasurement`'s choice of formatter

**Category:** Patterns
**Severity:** Suggestion
**Location:** `src/layout/kit/format.ts:28-30` (compare `src/core/format.ts:180` and `src/core/result.ts:34`)
**Description:** `displayValue(n, supplied: boolean)` maps `true` to `formatSupplied` and `false` to `formatDerived`. The validator reports provenance as `"supplied" | "derived"` (`Provenance`), and `formatMeasurement(value, provenance, unit?)` already chooses between the same two formatters from that union. Called without a unit, it returns exactly what `displayValue` returns.
**Impact:** Call sites read `displayValue(radius, true)`, and every layout has to turn `provenance[path] === "supplied"` into a boolean. Two functions in two modules each decide which formatter a provenance value gets. GSV TICKET-001 CR-007 and QR-003 asked for exactly that kind of drift between labels and text alternatives to be removed.
**Recommendation:** Type the second parameter as `"supplied" | "derived"`, exported as an alias from `src/core/result.ts`. Have `displayValue` call `formatMeasurement`, or the reverse, so that the choice of formatter is made in one place. This still satisfies the ticket's `displayValue(n, supplied)` wording.
**Status:** Resolved
**Resolution:** `displayValue(n, provenance: "supplied" | "derived")`. It stays separate from `formatMeasurement` because a label draws the number and unit as separate text.

---

### QR-011: `text.test.ts` contains invisible characters, and one assertion passes only because of them

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/layout/kit/text.test.ts:25`, `tests/layout/kit/text.test.ts:26`
**Description:**
- Line 25 compares `textWidth("é", 10)` with `textWidth("e", 10)`. The `é` in the file is `e` followed by U+0301 COMBINING ACUTE ACCENT, which no editor shows.
- Line 26 has a literal U+FE0F VARIATION SELECTOR-16 after the template expression, also invisible.

A precomposed `é` (U+00E9) is what most keyboards produce and what NFC-normalising tools write. It gets the fallback width of 667 instead of 556, so after normalisation the assertion would fail with a message that makes no sense to the reader. `tests/fixtures/plain-text.ts:1-4` sets the project's rule: invisible characters are built from code points, so files contain none.
**Impact:** The test breaks under normalisation and misleads anyone reading it. It also hides the behaviour it ought to document: precomposed and decomposed accents get different width estimates.
**Recommendation:** Write `"é"` and `"\u{1F44D}️"`, or use `String.fromCodePoint`. Add an explicit case showing that a precomposed `"é"` gets the fallback width.
**Status:** Resolved
**Resolution:** Invisible characters in `text.test.ts` are `\u` escapes; a scan of every file this ticket touched finds no format, nonspacing-mark or no-break-space character.

---

### QR-012: `jsdom` 30 raises the minimum Node.js version for development above what `engines` and `CONTRIBUTING.md` state

**Category:** Maintainability
**Severity:** Suggestion
**Location:** `package.json:90`, `package.json:27-29`, `CONTRIBUTING.md:27`
**Description:** jsdom 30.1.2 declares `node: ^22.22.2 || ^24.15.0 || >=26.0.0`. The package's `engines` field says `>=22`, and `CONTRIBUTING.md` says "Node.js 22 or later". The delivery's verification and this review both ran on Node.js v24.1.0, which jsdom declares unsupported, and the tests passed anyway. The gap is older than this ticket: vitest 5.0.3 (`^22.12.0 || ^24.0.0`) and size-limit 14.1.0 (`^22.19.0 || ^24.5.0`) already require more than `>=22`. jsdom widens it to 22.22.2 and 24.15.0. CI is unaffected, because `setup-node` installs the latest 22 and 24 releases.
**Impact:** A contributor on an older 22.x or 24.x release may hit a jsdom incompatibility. Nothing tells them which version they need, and pnpm only warns.
**Recommendation:** State the real minimum for development in `CONTRIBUTING.md`: Node.js 22.22.2 or 24.15.0. Optionally, declare it in `package.json`'s `devEngines` field and keep `engines` as the minimum for consumers.
**Status:** Resolved
**Resolution:** `jsdom` pinned to `^26.1.0` (engines `>=18`) and `@types/jsdom` to `^21.1.7`, inside `engines >=22`.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Approved | See code review CR-003: `rootAttrs` and `textAlternativeFor` in `src/layout/scene.ts` carry the root, `<title>` and naming rules; node shape rules are in the types and `checkScene`. | `src/layout/scene.ts`, `src/react/SceneSvg.tsx` |
| QR-002 | Approved | The parity test uses `act()` (with `IS_REACT_ACT_ENVIRONMENT`) for render and unmount; the 20 ms timer is gone. 10/10 clean runs on React 19.3.0, and clean on React 18.3.1. | `tests/react/SceneSvg.test.tsx` |
| QR-003 | Approved | `eslint.config.js` gains a `src/react/**` block that rejects `window`, `document`, `navigator`, `self` and their `globalThis`/`self` forms, keeping the network rules; boundary tests added. | `eslint.config.js`, `tests/package/boundaries.test.ts` |
| QR-004 | Approved | See code review CR-001: `pathData`, `translate` and `checkScene`. | `src/layout/kit/format.ts`, `src/layout/kit/check.ts` |
| QR-005 | Approved | See code review CR-003: per-kind node types and `checkScene`. | `src/layout/scene.ts`, `src/layout/kit/check.ts` |
| QR-006 | Approved | See code review CR-004. | `src/layout/kit/text.ts` |
| QR-007 | Approved | Over-long words are split between clusters: a base with its marks, joiners, variation selectors and modifiers, a ZWJ sequence, a flag pair, or a Devanagari letter with its spacing sign. Tested for all of them. | `src/layout/kit/text.ts`, `tests/layout/kit/text.test.ts` |
| QR-008 | Approved | `placeLabel` takes an optional `padding` (clearance on every side; the returned box is the label's own). Curves are passed by the layout as segments or boxes, as documented. | `src/layout/kit/labels.ts` |
| QR-009 | Approved | `fmt` checks its result: non-finite or at least 1e21 (exponent form) throws `RangeError`. `wrap` rejects a non-finite or non-positive width or font size. | `src/layout/kit/format.ts`, `src/layout/kit/text.ts` |
| QR-010 | Approved | `displayValue(n, provenance: "supplied" \| "derived")`. It stays separate from `formatMeasurement` because a label draws the number and unit as separate text. | `src/layout/kit/format.ts` |
| QR-011 | Approved | Invisible characters in `text.test.ts` are `\u` escapes; a scan of every file this ticket touched finds no format, nonspacing-mark or no-break-space character. | `tests/layout/kit/text.test.ts` |
| QR-012 | Approved | `jsdom` pinned to `^26.1.0` (engines `>=18`) and `@types/jsdom` to `^21.1.7`, inside `engines >=22`. | `package.json`, `pnpm-lock.yaml` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (12 resolved: 6 Concerns, 6 Suggestions)
**Notes:** Resolved with the user (Thomas) on 2026-10-07; every recommendation approved. The printer contract is now shared code, the parity test is deterministic with `act()`, and jsdom fits `engines`. Re-verification passed on React 19.3.0 and React 18.3.1.
