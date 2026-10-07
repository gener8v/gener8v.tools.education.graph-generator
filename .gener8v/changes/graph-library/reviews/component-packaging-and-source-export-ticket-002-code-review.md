# TICKET-002: Build the Scene model and the shared rendering core — Code Review

## Summary

I reviewed the delivery of `graph-library/component-packaging-and-source-export/TICKET-002` (delivery commit `2bed490`, branch `ticket/cpse-002`) against the ticket, the Component Packaging & Source Export specification, `constraints/prd.md` and `technical-design/system-design.md`. The Scene model, `fmt()`, the scale, text and label helpers and `SceneSvg` match the ticket closely. The shared `ELEMENT_FOR_KIND` / `REACT_PROP` tables put the matched-pair hazard in one place, and the three covered requirements are annotated and listed in the specification. Every Verification Run command reproduces, including both mutation checks. I also ran lint, typecheck and the test suite on the three matrix cells the record did not run (React 18.3.1 on Node.js 24.1.0 and 22.16.0, React 19.3.0 on Node.js 22.16.0), and all exit 0.

One acceptance criterion is only partly met. The raw-number guard is a branded type that rejects `number` values, but every attribute also accepts any string. So `String(n)`, a template string in `d`, `transform` or `viewBox`, or a stringified coordinate reaches markup unrounded, and typecheck and lint stay green (reviewer probe).

The other findings are about what the Scene contract lets through and what downstream tickets need to know:
- `url(#…)` in paint attributes is accepted
- `SceneSvg` lets text win over children and collapses duplicate attribute names, and the printer tables do not record either rule
- `wrap` breaks at no-break spaces, and Devanagari spacing marks are counted as zero width
- the record's account of the display precision clashes with `geometric-shapes-and-solids/TICKET-002`
- DEL-003's obligation on TICKET-003 is not on TICKET-003

There are 6 findings: 0 Critical, 1 Issue, 5 Observations.

**Reviewer:** `code-reviewer` agent, fresh context (findings phase only, 2026-10-07)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/component-packaging-and-source-export-ticket-002-delivery.md`
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
- `package.json` (dev dependencies `jsdom` ^30.1.2, `@types/jsdom` ^30.0.0)
- `pnpm-lock.yaml` (jsdom entries; reproduced with `pnpm install --frozen-lockfile --offline`)
- `.gener8v/specifications/component-packaging-and-source-export.md` (`## @spec Coverage` rows)
- Read as dependencies of the delivered code, not delivered here: `src/core/format.ts`, `src/core/style.ts`, `tests/fixtures/plain-text.ts`

**Findings:** 6
**Critical:** 0 | **Issues:** 1 | **Observations:** 5

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| `src/layout/scene.ts` exports `Scene` (`width: 400`, `height`, `textAlternative`, `nodes`) and `SceneNode` (`kind` in line, polyline, polygon, path, circle, ellipse, rect, text, group, svg; ordered `attrs`; optional `children`, `text`) | Yes | `Scene` at `src/layout/scene.ts:110-115`: `width: typeof SCENE_WIDTH` (literal `400`, `:16`), `height: Rounded`, `textAlternative`, `nodes`. `SceneNodeKind` at `:18-28` has exactly the ten kinds. `SceneNode` at `:99-106`: `attrs` is an array of `[name, value]` pairs, so order is explicit, plus optional `children` and `text`. The typed `sample` Scene in `tests/react/SceneSvg.test.tsx:16-46` uses all ten kinds and type-checks, and `:91` asserts the ten element names |
| `fmt(n)` rounds to 2 decimal places and normalizes `-0` to `0`; `displayValue(n, supplied)` returns a supplied value as given and a derived value at the documented display precision; unit tests cover boundaries, negatives and `-0` | Yes | `fmt` at `src/layout/kit/format.ts:10-14` is `Math.round(n * 100) / 100` (exactly AD-007), maps `0`/`-0` to `0`, and throws `RangeError` on non-finite input (DEL-003). `displayValue` at `:28-30` delegates to `formatSupplied` / `formatDerived` (carried CR-007/QR-003). Tests: boundaries `tests/layout/kit/format.test.ts:7-14` (1.235, 0.005, 0.004, 199.999), negatives `:16-20`, `-0` `:22-27`, non-finite `:34-38`, `displayValue` `:57-79`. What "documented display precision" means is taken up in CR-005 |
| `linearScale(domain, range)` maps values into the 400-unit space; `textWidth` estimates from a Helvetica/Arial per-character table × 1.1; `wrap` breaks on word boundaries at a maximum width; `placeLabel` returns the first candidate whose box overlaps no obstacle | Yes | `linearScale` at `src/layout/kit/scale.ts:8-20`, tests `tests/layout/kit/scale.test.ts:5-23`. `textWidth` at `src/layout/kit/text.ts:84-86` uses `ASCII_WIDTHS` (`:13-20`, 95 entries for U+0020–U+007E; I checked them against the Helvetica AFM advance widths) × `TEXT_WIDTH_SAFETY = 1.1` (`:8`); tests `tests/layout/kit/text.test.ts:12-17`. `wrap` at `:94-136` (greedy, linear time, over-long words split between code points per DEL-004); tests `:37-81`. `placeLabel` at `src/layout/kit/labels.ts:74-84` (boxes and Liang–Barsky segment clipping; touching edges do not overlap); tests `tests/layout/kit/labels.test.ts:7-59`. No-break spaces and Devanagari estimates: CR-004 |
| `SceneSvg` renders `<svg role="img" aria-label={textAlternative} viewBox="0 0 400 {height}" width="100%">` with a `<title>` first child and maps each node one-to-one to an SVG element with attributes in Scene order; it uses no hooks, state, effects, ids or `url(#…)` | Yes | Root props in the required order at `src/react/SceneSvg.tsx:35`, `<title>` first at `:36`, nodes through `toElement` (`:11-17`) with props inserted in Scene order (`:13`) and the tag from `ELEMENT_FOR_KIND` (`:16`). No hook, id or reference anywhere. Tests: exact root prefix `tests/react/SceneSvg.test.tsx:55-60`; recursive tag, attribute-order and child-count check `:62-75`; markup scan `:94-96`; comment-stripped source scan `:98-104`. One-to-one holds for nodes with either `text` or `children` and unique attribute names; see CR-003 |
| A caller-supplied text alternative replaces the Scene's generated one in `aria-label` and `<title>` | Yes | `src/react/SceneSvg.tsx:31-32` (a non-blank caller value wins, DEL-007). One `name` feeds both `aria-label` and `<title>` (`:35-36`). Tests `tests/react/SceneSvg.test.tsx:113-129` (default, supplied, blank falls back) |
| `renderToString` of a sample Scene in Node.js with no browser globals equals the markup produced in a jsdom render | Yes | `tests/react/SceneSvg.test.tsx:151-194`. It asserts `window`/`document` are undefined (`:153-154`) and server-renders 24 Scenes (`:163`). It then installs jsdom globals, imports `react-dom/client` and renders each Scene with `flushSync` (`:165-176`). Finally it compares `innerHTML` after parsing the server string through the same DOM, plus `isEqualNode` (`:179-182`). Comparing trees rather than raw strings (DEL-005) is justified: React escapes `'`/`"` in text and jsdom does not. Reviewer re-run: the record's `typeof window` mutation fails the test (exit 1); five consecutive runs pass; passes on React 18.3.1 and on Node.js 22.16.0 |
| A lint rule or test fails when a layout writes a raw number into Scene attrs without `fmt()` | Partial | `fmt()` returns the branded `Rounded` (`src/layout/scene.ts:13`, `src/layout/kit/format.ts:10`), and `AttrValue = string \| Rounded` (`src/layout/scene.ts:95`). The `@ts-expect-error` at `tests/layout/kit/format.test.ts:49-50` keeps the check alive; the record's `string \| number` mutation reproduces `TS2578` (exit 2). But every attribute also accepts any string. `["cx", String(n)]`, `` ["d", `M ${n} …`] ``, `` ["transform", `rotate(${n})`] `` and `` ["viewBox", `0 0 ${n} 25`] `` with unrounded `n` pass both `tsc` and ESLint and print 13-digit coordinates (reviewer probe). See CR-001 |
| *(Known Hazard, carried)* SEC-001: every Scene string is a React text child or attribute value; every `BENIGN_TEXT` / `HOSTILE_TEXT` string renders literally | Yes | `src/react/SceneSvg.tsx:14`, `:35-36` (strings only as children or prop values; no `dangerouslySetInnerHTML`). Tests `tests/react/SceneSvg.test.tsx:132-149`, 23 cases: text in `aria-label`, `<title>` and a `text` node, no extra elements or attributes |
| *(Known Hazard, carried)* CR-007 / QR-003: `displayValue` built on `formatSupplied` / `formatDerived`, not a second rounding rule | Yes | `src/layout/kit/format.ts:1`, `:28-30`; agreement test `tests/layout/kit/format.test.ts:73-78` |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| CPSE-REQ-011 | Render on server and in browser with identical output, using no browser-only facilities during render | `src/react/SceneSvg.tsx:30-39` (a pure function of its props); `src/layout/scene.ts:99-115` (plain data); `src/layout/kit/format.ts:10-20` (one rounding function); `src/layout/kit/text.ts:84-136` (estimation instead of measuring); `src/layout/kit/labels.ts:74-84`; parity test `tests/react/SceneSvg.test.tsx:151-194`; `src/layout/**` is under the TICKET-001 boundary lint | Yes, for this ticket's share. The components themselves are TICKET-003; hydration (CPSE-NFR-005) is TICKET-004. The rounding guard is partial (CR-001) |
| CPSE-REQ-012 | Accept a text alternative, defaulting to one generated from the description | `src/react/SceneSvg.tsx:6-7`, `:31-32`, `:35-36`; `src/layout/scene.ts:113` (the Scene carries the generated text alternative) | Yes. Generating the default from the description is `describe` (GSV) plus each layout |
| CPSE-REQ-013 | Scale to container width while keeping proportions | `src/react/SceneSvg.tsx:35` (`viewBox="0 0 400 H"`, `width="100%"`, no `height` attribute, so the aspect ratio comes from the viewBox); `src/layout/scene.ts:16`, `:111`; `src/layout/kit/scale.ts:8-20` (maps data into the 400-unit space); test `tests/react/SceneSvg.test.tsx:55-60` | Yes |

*This ticket carries no NFR. CPSE-NFR-001 and CPSE-NFR-005 belong to TICKET-005/006 and TICKET-004.*

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/TC-001 | No measuring during render | Yes | Widths come from a table (`src/layout/kit/text.ts:13-86`); container fit comes from `viewBox` + `width="100%"` (`src/react/SceneSvg.tsx:35`). Nothing touches the DOM |
| prd/TC-002 | Round every emitted coordinate before it reaches markup | Yes | The delivered code emits only rounded numbers: `fmt`, `fmtPoints`, and `Scene.height: Rounded` in the root `viewBox`. The guard meant to keep future layouts honest covers only `number`-typed values (CR-001) |
| prd/TC-003 | Element ids unique per instance and stable across renders | Yes | Resolved by having no ids (AD-008). `id`, `href`, `clip-path` and `marker-*` are outside the closed attribute set (`src/layout/scene.ts:44-90`); `tests/layout/kit/format.test.ts:51-52`. Paint attributes still accept `url(#…)` (CR-002) |
| prd/TC-011 | The package wraps text | Yes | `wrap` at `src/layout/kit/text.ts:94-136`. Break opportunities at no-break spaces: CR-004 |
| prd/CC-002 | A text alternative on every graph (WCAG 1.1.1) | Yes | `role="img"`, `aria-label` and a first-child `<title>` (`src/react/SceneSvg.tsx:35-36`). A blank caller value falls back to the generated one, so the graph is never unnamed (DEL-007) |
| prd/RF-001 | Label overlap avoided by layout rules and conservative estimates | Yes | Width table × 1.1 and first-free-candidate placement. Devanagari spacing marks are counted as zero width, which under-estimates (CR-004) |
| prd/RF-003 | One shared formatting function for coordinates and display values | Yes | `fmt` for coordinates; `displayValue` on the same formatters as text alternatives. The WebKit cross-engine comparison is TICKET-004 (Playwright) |
| prd/TC-004 | React 18 and 19 APIs only | Yes | `createElement` with spread children; the tests use `createRoot`/`flushSync`, both present in 18. Reviewer ran lint, typecheck and tests on React 18.3.1 (Node.js 24.1.0 and 22.16.0): exit 0 |
| prd/TC-005 | Non-rendering code loads no React or browser globals | Yes | `src/layout/**` imports only `src/core/format.ts` and `src/core/style.ts`; `pnpm lint` (boundary block) exits 0 |
| prd/CC-001 | No bundled font; licence-compatible dependencies | Yes | `DEFAULT_FONT_STACK` re-exports `defaultStyle.fontFamily` (`src/layout/kit/text.ts:5`); jsdom is a dev dependency only; `pnpm check:deps` reports 0 runtime dependencies |
| prd/IC-002 | Server Components: no state, effects or handlers | Yes | No hooks or handlers in `SceneSvg`; there are no handler attributes in `REACT_PROP` |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-002 | Framework-neutral Scene of SVG primitives with final, rounded attributes; `SceneSvg` maps nodes one-to-one; the exporter prints the same nodes in the same order | Yes | `src/layout/scene.ts` (ten kinds, ordered attribute pairs); both printers are meant to import `ELEMENT_FOR_KIND` and `REACT_PROP` (DEL-001). Two printing rules live only in `toElement` (CR-003) |
| AD-007 | 400-unit space; `viewBox` + `width="100%"`; every Scene number through `fmt()` (`Math.round(x * 100) / 100`, `-0` → `0`); separate `displayValue()`; "Lint forbids writing numbers into a Scene without `fmt()`" | Partial | `SCENE_WIDTH = 400`, `fmt` exactly as specified, `displayValue` separate. The enforcement half is a type rather than lint (DEL-002, allowed by the ticket's "lint rule or test"), and it misses numbers written as strings (CR-001) |
| AD-008 | No ids or `url(#…)`; arrowheads as polygons; partial images as nested `svg`; `role="img"` + `aria-label` + `<title>`, no `aria-labelledby` | Yes | `SceneSvg` emits none; the `polygon` and `svg` kinds exist (`tests/react/SceneSvg.test.tsx:33-39` shows both uses). A Scene can still carry `url(#…)` in a paint attribute (CR-002) |
| AD-010 | System font stack; Helvetica/Arial width table × 1.1; word-boundary wrapping; first candidate overlapping no placed label or figure line | Yes | `src/layout/kit/text.ts:5`, `:8`, `:13-20`, `:94-136`; `src/layout/kit/labels.ts:17-84` (boxes and segments). Edge cases: CR-004 |
| AD-011 | Presentation attributes only; no CSS, classes or style | Yes | `REACT_PROP` is limited to geometry, presentation, text and `aria-hidden`; there is no `class` or `style` (`src/layout/scene.ts:50-90`) |
| AD-014 | Pure components accepting `textAlternative?` | Yes | `SceneSvg` is pure and accepts `textAlternative`. `fallback` and never-throw handling belong to TICKET-003; DEL-003 adds a throw path that TICKET-003 must absorb (CR-006) |
| AD-016 | Toolchain: Vitest, development-only tools | Yes | `jsdom`/`@types/jsdom` added as dev dependencies; React Testing Library is not needed for these tests |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| CPSE-REQ-011 | `@spec CPSE-REQ-011` | `src/layout/scene.ts:98` (`SceneNode`), `:109` (`Scene`); `src/layout/kit/format.ts:9` (`fmt`), `:17` (`fmtPoints`); `src/layout/kit/text.ts:83` (`textWidth`), `:93` (`wrap`); `src/layout/kit/labels.ts:73` (`placeLabel`); `src/react/SceneSvg.tsx:29` (`SceneSvg`) | Yes |
| CPSE-REQ-012 | `@spec CPSE-REQ-012` | `src/layout/scene.ts:109` (`Scene`); `src/react/SceneSvg.tsx:29` (`SceneSvg`) | Yes |
| CPSE-REQ-013 | `@spec CPSE-REQ-013` | `src/layout/scene.ts:109` (`Scene`); `src/layout/kit/scale.ts:7` (`linearScale`); `src/react/SceneSvg.tsx:29` (`SceneSvg`) | Yes |

**Coverage:** 3 of 3 requirements annotated. Every annotation sits on the line directly above its declaration, after the JSDoc block.
**Missing:** None. `gener8v-state.py lint` on the exported commit reports 0 errors and 0 warnings. `displayValue` carries no annotation: it serves GSS-REQ-034, which `graph-library/geometric-shapes-and-solids/TICKET-002` covers (see CR-005).
**Specification table:** Yes. The rows for CPSE-REQ-011, CPSE-REQ-012 and CPSE-REQ-013 in `## @spec Coverage` of `.gener8v/specifications/component-packaging-and-source-export.md` list exactly these locations.

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm lint` | 0 | Yes |
| `pnpm typecheck` | 0 | Yes |
| `pnpm test` | 0 | Yes (21 files, 566 tests; 66 in the five new files: 10 + 3 + 12 + 8 + 33) |
| `pnpm build` | 0 | Yes |
| `pnpm check:dist` | 0 | Yes ("Built files scanned: 4, no network APIs or network modules.") |
| `pnpm check:deps` | 0 | Yes ("Runtime dependencies: 0, all justified.") |
| `pnpm size` | 0 | Yes (0 B per entry, minified and gzipped; no entry includes the new modules yet) |
| `pnpm publint` | 0 | Yes ("All good!") |
| `GRAPH_GENERATOR_PREBUILT=1 pnpm vitest run tests/react` ×5 | 0 | Yes (33 passed each run) |
| Mutation: `SceneSvg` width depends on `typeof window` → `pnpm vitest run tests/react` | 1 (expected) | Yes (the parity test fails; the other 32 pass) |
| Mutation: `AttrValue = string \| number` → `pnpm typecheck` | 2 (expected) | Yes (`TS2578: Unused '@ts-expect-error'` at `tests/layout/kit/format.test.ts:49`) |

*Where I ran it: an isolated export of commit `2bed490` (`git archive`) in the session scratchpad, installed with `pnpm install --frozen-lockfile --offline`, on Node.js v24.1.0 and pnpm 10.28.2. I applied the mutations and probes to a second scratch copy, never to the shared tree, whose delivered source is identical to `2bed490`. Beyond the record, I ran `pnpm lint`, `pnpm typecheck` and `pnpm test` on React 18.3.1 with Node.js 24.1.0, using the CI workflow's own `pnpm add --save-dev --save-exact` swap. I ran `pnpm typecheck` and `pnpm test` on React 18.3.1 with Node.js 22.16.0, and `pnpm test` on React 19.3.0 with Node.js 22.16.0. All exit 0 with 566 tests.*

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | Ordered pairs make attribute order explicit, and one closed table serves both printers, as the ticket's Known Hazard asks. The rationale overstates what the closed set enforces. It keeps `id`/`href`/`clip-path`/`marker-*` out, but not `url(#…)` inside paint values (CR-002), and the table does not capture `toElement`'s precedence and duplicate rules (CR-003). |
| DEL-002 | Reasonable | A brand catches computed numbers that a syntactic lint rule could not, and the `@ts-expect-error` keeps it alive. But "Types catch every raw number, wherever it was computed" is not accurate. Every attribute, not only `d` and `points`, accepts an unrounded number once it is a string (CR-001). |
| DEL-003 | Reasonable | Throwing beats printing `NaN`. But the duty it creates for TICKET-003 is written only in this record's Notes, and TICKET-003's never-throw tests run against an empty layout registry (CR-006). |
| DEL-004 | Reasonable | Every line fits, the work is linear, and surrogate pairs stay whole (`tests/layout/kit/text.test.ts:55-80`). |
| DEL-005 | Reasonable | Tree equality is what hydration needs. The string difference is only escaping, which I confirmed by reading the comparison. Hydration warnings stay with TICKET-004. |
| DEL-006 | Reasonable | It keeps both halves in one Node-environment test with no runtime dependency. The 20 ms wait for React's scheduler is a timing assumption, but it held over five runs and on all four matrix cells. |
| DEL-007 | Reasonable | It never ships an unnamed graph (prd/CC-002), and a supplied value is rendered as given. |
| *(deviation)* `tests/layout/kit/scale.test.ts` | Reasonable | It keeps each kit module with its own tests. No downstream impact. |

## Findings

### CR-001: The raw-number guard rejects `number` values only; every attribute accepts an unrounded number written as a string

**Severity:** Issue
**Location:** `src/layout/scene.ts:95` (`AttrValue = string | Rounded`), `src/layout/scene.ts:101` (`attrs`); `tests/layout/kit/format.test.ts:46-55`
**Traces To:** TICKET-002 acceptance criterion 7 ("A lint rule or test fails when a layout writes a raw number into Scene attrs without `fmt()`"); prd/TC-002; AD-007 (Consequences: "Lint forbids writing numbers into a Scene without `fmt()`"); prd/RF-003; TICKET-002/DEL-002
**Description:** `AttrValue` is `string | Rounded` for every attribute, so the brand only bites when the value is a JavaScript `number`. In a reviewer probe under `src/layout/`, all of the following passed `tsc --noEmit` (exit 0) and `eslint` (exit 0), with `const cx = Math.cos(1) * 123.456789`:
- `["cx", String(cx)]`, `` ["cy", `${cx}`] ``, `["r", cx.toString()]` on a `circle`
- `` ["d", `M ${cx} ${cx} L 0 0`] ``, `` ["transform", `rotate(${cx})`] ``, `` ["stroke-dasharray", `${cx} 2`] `` on a `path`
- `` ["viewBox", `0 0 ${cx} 25`] `` on a nested `svg`

`SceneSvg` printed them unrounded: `<circle cx="66.7039877717764" cy="66.7039877717764" r="66.7039877717764">`, `<path d="M 66.7039877717764 66.7039877717764 L 0 0" transform="rotate(66.7039877717764)" …>`. DEL-002 names `d` and `points` as the only uncovered attributes and says the brand catches "every raw number, wherever it was computed". In fact every numeric attribute (`x`, `cx`, `r`, `width`, `stroke-width`, `font-size`…) also takes a stringified raw number.
**Impact:** This guard is the only enforcement of prd/TC-002 for every layout the NLC, DGP and GSS tickets will write. Their Prior Art points them at it: `graph-library/number-lines-and-coordinate-graphs/TICKET-001` reads `src/layout/scene.ts` and `src/layout/kit/format.ts`. The most likely slip, a template string in path data or a transform, compiles cleanly. Trigonometric results can differ in their last digits between V8 and JavaScriptCore. Unrounded digits in markup therefore cause hydration warnings (CPSE-NFR-005) or unequal exported markup (CPSE-NFR-001) that show up only in some browsers (prd/RF-003, TR-002).
**Recommendation:** Either of these, or both:
- **Narrow the types.** Make the purely numeric attributes accept only `Rounded`: `x`, `y`, `x1`, `y1`, `x2`, `y2`, `cx`, `cy`, `r`, `rx`, `ry`, `width`, `height`, `stroke-width`, `font-size`, `opacity`, `fill-opacity`, `stroke-opacity`. Type `attrs` as a union of `readonly [K, ValueFor<K>]` pairs. Give the composite strings (`d`, `points`, `transform`, `viewBox`, `stroke-dasharray`) branded string types that only kit builders produce on top of `fmt()`. `fmtPoints` already exists; add, for example, a `fmtList(...)` and a tagged template that runs every interpolated number through `fmt()`.
- **Add a checker.** Add `assertSceneRounded(scene)` (or `checkScene`) to the kit. It fails on any attribute value containing a number with more than two decimals or in exponent form. The layout tickets then call it on every example Scene.

Add `@ts-expect-error` cases (or checker tests) for `["cx", String(1.234)]` and an unrounded `d` interpolation. Correct DEL-002's rationale in the record's Post-Review Amendments.
**Status:** Resolved
**Resolution:** Added `pathData` and `translate`, which build `d` and `transform` strings only from `fmt()` values (`viewBox` is built by `rootAttrs`). Added `checkScene`, which reports unrounded or exponent-form numbers inside string attributes, numbers that skipped `fmt()` despite the type, and a non-rounded `height`. Every layout test runs it (Known Hazard on GSS TICKET-002). Types still accept any string; the guard for strings is `checkScene` in layout tests. Tests: `tests/layout/kit/check.test.ts`, `tests/layout/kit/format.test.ts`.
**Resolution:** —

---

### CR-002: Paint attributes accept `url(#…)`, so the closed attribute set does not keep id references out of a Scene

**Severity:** Observation
**Location:** `src/layout/scene.ts:44-50` (`REACT_PROP` and its doc comment), `src/layout/scene.ts:95`
**Traces To:** AD-008 ("Scenes use no element ids and no `url(#…)` references"); TICKET-002 Known Hazard 1 ("none may appear in a Scene or in `SceneSvg`"); TICKET-002/DEL-001 (Rationale: "A closed set enforces AD-008 and AD-011 at compile time"); prd/TC-003
**Description:** `["fill", "url(#grad)"]` and `["stroke", "url(#other)"]` type-check, pass lint and render as `<rect fill="url(#grad)" stroke="url(#other)">` (reviewer probe). `SceneSvg` itself emits no reference. The guard test `tests/react/SceneSvg.test.tsx:94-96` scans only the sample Scene's markup, so it cannot catch a reference that a layout writes.
**Impact:** None today, because no layout exists. A future layout that reaches for a gradient or pattern compiles. Scenes carry no ids, so the reference resolves to whatever element on the page holds that id: another graph's, or the host page's. That is the cross-instance failure prd/TC-003 describes.
**Recommendation:** Reject `url(` in any attribute value in the same Scene checker CR-001 proposes, or give `fill`/`stroke` a `Paint` type (hex color, `none`, `currentColor`). In Post-Review Amendments, amend DEL-001's rationale to say which part of AD-008 the types enforce.
**Status:** Resolved
**Resolution:** `checkScene` reports `url(` (any case, any spacing) in every attribute, paint included (AD-008).
**Resolution:** —

---

### CR-003: Two printing rules live only in `toElement`: text silently replaces children, and duplicate attribute names collapse

**Severity:** Observation
**Location:** `src/react/SceneSvg.tsx:13-14` (`toElement`); `src/layout/scene.ts:99-106` (`SceneNode`)
**Traces To:** TICKET-002 acceptance criterion 4 ("maps each node one-to-one to an SVG element with attributes in Scene order"); TICKET-002 Known Hazard 2 (matched pair; "Keep the node-to-element mapping in one table that both can import"); AD-002; CPSE-NFR-001; `graph-library/component-packaging-and-source-export/TICKET-005`
**Description:** `SceneNode` allows `text` and `children` together, on any kind, and allows the same attribute name twice. In a reviewer probe:
- a `group` with `text: "hello"` and one `circle` child printed `<g>hello</g>`, because the child was dropped (`:14` prefers `text`)
- `attrs: [["x", fmt(1)], ["width", fmt(2)], ["x", fmt(3)]]` printed `<rect x="3" width="2">`: one `x`, at the first position, with the last value (`:13` writes into an object)

Neither rule is in `ELEMENT_FOR_KIND`, in `REACT_PROP`, or in the record's Notes for TICKET-005. Those Notes cover root attribute order, `<title>` placement, Scene attribute order and `String(n)`.
**Impact:** A TICKET-005 printer written from the shared tables and the Notes would print the children, or both `x` attributes. Two `x` attributes in the exported `.tsx` are a compile error (TS17001, duplicate JSX attribute). Either way markup equality (CPSE-NFR-001) fails for that Scene. The one-to-one mapping holds only for well-formed nodes, which nothing enforces.
**Recommendation:** Make `SceneNode` a discriminated union: the `text` kind carries `text` and no `children`; `group` and `svg` carry `children`; leaf kinds carry neither. Reject duplicate attribute names in the Scene checker (CR-001) or with a test helper. At minimum, document both rules in `src/layout/scene.ts` and add them to the record's TICKET-005 Notes.
**Status:** Resolved
**Resolution:** `SceneNode` is now `ShapeNode | TextNode | ContainerNode`: only `text` has `text`, only `group`/`svg` have `children`. `checkScene` reports repeated attributes and misplaced `text`/`children`. The root attributes and their order, the `<title>`-first rule and the accessible-name rule are shared code (`rootAttrs`, `textAlternativeFor`) that TICKET-005's printer imports.
**Resolution:** —

---

### CR-004: `wrap` breaks at no-break spaces, and Devanagari spacing marks are estimated at zero width

**Severity:** Observation
**Location:** `src/layout/kit/text.ts:95` (`text.split(/\s+/)`); `src/layout/kit/text.ts:32-33` (`ZERO_WIDTH` Devanagari ranges)
**Traces To:** TICKET-002 acceptance criterion 3 ("`wrap` breaks on word boundaries"); AD-010 ("estimated metrics with a margin are conservative"); prd/RF-001; prd/TC-011; GSS-REQ-033
**Description:**
- **No-break spaces.** JavaScript's `\s` matches U+00A0 (no-break space) and U+202F (narrow no-break space). `wrap("radius 5 cm", 60, 14)` returns `["radius 5", "cm"]`, and the U+202F variant does the same. `wrap("5 cm", 400, 14)` returns the line with an ordinary U+0020 in place of the no-break space. No-break spaces are not word boundaries (Unicode line-breaking class GL); SI style puts one between a value and its unit. The plain-text policy in `src/core/format.ts` allows both characters in labels.
- **Devanagari widths.** The ranges `[0x0900, 0x0903]` and `[0x093a, 0x094f]` include spacing marks: U+0903, U+093B, U+093E–U+0940, U+0949–U+094C, U+094E and U+094F. They also include the letter avagraha, U+093D. In a reviewer probe, `textWidth("का", 10)` equals `textWidth("क", 10)`, and `textWidth("ऽ", 10)` is `0`. Every other unknown character errs large (`FALLBACK_WIDTH = 667`); these err small.
**Impact:** A caller's label "5 cm" written with a no-break space can be split between value and unit, and loses the character. Devanagari labels are estimated narrower than they render, so `placeLabel` can accept a position that overlaps (prd/RF-001). Both cases are rare in the target curricula, and neither touches the ASCII path the tests cover.
**Recommendation:**
- Split only on breakable whitespace: leave U+00A0, U+2007, U+202F and U+2060 out of the separator class and keep them inside words.
- Narrow the Devanagari zero-width ranges to the nonspacing marks (U+0900–U+0902, U+093A, U+093C, U+0941–U+0948, U+094D), so the spacing marks fall through to `FALLBACK_WIDTH`.
- Add one test per case.
**Status:** Resolved
**Resolution:** `wrap` breaks only at breaking whitespace, so U+00A0, U+2007 and U+202F keep their words together and are kept as written. They get the space (or digit) width. Devanagari spacing vowel signs and visarga get an advance, and the avagraha is a letter; only nonspacing signs, nukta and virama are zero width.
**Resolution:** —

---

### CR-005: The record misstates the display precision `displayValue` implements, and GSS TICKET-002 expects a different rule in a different file

**Severity:** Observation
**Location:** `src/layout/kit/format.ts:28-30` (`displayValue`); delivery record, Pre-Flight Reconciliation ("Resolved from ground truth")
**Traces To:** GSS-REQ-034; `geometric-shapes-and-solids` OQ-005 (still open); AD-007 ("Displayed measurement values use a separate `displayValue()` with the documented display precision"); `graph-library/graph-specification-and-vocabulary-ticket-001-quality-review/QR-003` (resolution); `graph-library/geometric-shapes-and-solids/TICKET-002` acceptance criteria
**Description:** `displayValue` delegates to `formatDerived`, as the carried hazard requires, and the tests pin `displayValue(0.0012, false)` → `"0.0012"` and `displayValue(-0.001, false)` → `"-0.001"`. The record says GSS OQ-005 "is already settled in code: `formatDerived` rounds to 2 decimal places, half away from zero, trailing zeros dropped". That leaves out the rule QR-003 approved: a small non-zero value keeps two significant figures. OQ-005 is still open in `.gener8v/specifications/geometric-shapes-and-solids.md`, with the assumption "up to 2 decimal places". `graph-library/geometric-shapes-and-solids/TICKET-002`, which covers GSS-REQ-034, requires "at most 2 decimal places, trailing zeros removed, via `displayValue()` (this precision rule is placed in `src/layout/kit/measure.ts` for reuse)".
**Impact:** GSS TICKET-002's pre-flight will find `displayValue` in `src/layout/kit/format.ts`, with a rule its criterion contradicts for values below 0.005 in magnitude. It may then add a second rule in `src/layout/kit/measure.ts`. That is exactly the drift CR-007/QR-003 were carried here to prevent: labels and text alternatives stating different numbers.
**Recommendation:**
- Append a Known Hazard to `graph-library/geometric-shapes-and-solids/TICKET-002` (in its own file, `.gener8v/changes/graph-library/tickets/geometric-shapes-and-solids/TICKET-002.md`). It should say that `displayValue` lives in `src/layout/kit/format.ts`, follows `formatDerived` (two decimals; two significant figures for small non-zero values), and is reused, not re-implemented.
- Correct the pre-flight wording in Post-Review Amendments.
- Ask the Product Owner to close GSS OQ-005 with the `formatDerived` rule (a Specification amendment).
**Status:** Resolved
**Resolution:** Known Hazard appended to GSS TICKET-002: display precision comes from `displayValue` / `formatDerived`, including the small-value rule; no second rounding rule.
**Resolution:** —

---

### CR-006: DEL-003's obligation on TICKET-003 is written only in this record's Notes

**Severity:** Observation
**Location:** `src/layout/kit/format.ts:11` (`throw new RangeError(…)`); delivery record DEL-003 and Notes ("For TICKET-003")
**Traces To:** TICKET-002/DEL-003; AD-014 (components never throw); system design Interface Contracts "Component props" ("never throws"); CPSE-REQ-018; `graph-library/component-packaging-and-source-export/TICKET-003`
**Description:** `fmt` throws on non-finite input. DEL-003 states that "TICKET-003 must catch layout errors" so components keep their never-throw contract. TICKET-003's Prior Art names `src/layout/scene.ts` and `src/react/SceneSvg.tsx`, not this delivery record, and none of its Known Hazards mentions the throw. Its never-throw property tests (acceptance criteria 2 and 9) run while "the registry is empty" (its own Known Hazard), so no layout that calls `fmt` is exercised.
**Impact:** Suppose a later layout computes a non-finite value for an edge-case valid description, for example a division by a derived zero. `fmt` then throws through `Graph`, against AD-014 and the component contract. TICKET-003's tests would not have caught it, and the type tickets do not own the wrapper.
**Recommendation:** Append a Known Hazard to `graph-library/component-packaging-and-source-export/TICKET-003`. It should say: wrap every `layout()` call in `createGraph` so a thrown error becomes an `internal_error` issue with its fixed message (consistent with the carried SEC-003 hazard), and the fallback renders. Add a test with a fixture layout that calls `fmt(Number.NaN)`.
**Status:** Resolved
**Resolution:** Known Hazard appended to CPSE TICKET-003: call the layout in a `try`, send a thrown error to the fallback as `internal_error`, and test with a layout that throws.
**Resolution:** —

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Approved | Added `pathData` and `translate`, which build `d` and `transform` strings only from `fmt()` values (`viewBox` is built by `rootAttrs`). Added `checkScene`, which reports unrounded or exponent-form numbers inside string attributes, numbers that skipped `fmt()` despite the type, and a non-rounded `height`. Every layout test runs it (Known Hazard on GSS TICKET-002). Types still accept any string; the guard for strings is `checkScene` in layout tests. Tests: `tests/layout/kit/check.test.ts`, `tests/layout/kit/format.test.ts`. | `src/layout/kit/format.ts`, `src/layout/kit/check.ts`, `.gener8v/changes/graph-library/tickets/geometric-shapes-and-solids/TICKET-002.md` |
| CR-002 | Approved | `checkScene` reports `url(` (any case, any spacing) in every attribute, paint included (AD-008). | `src/layout/kit/check.ts` |
| CR-003 | Approved | `SceneNode` is now `ShapeNode \| TextNode \| ContainerNode`: only `text` has `text`, only `group`/`svg` have `children`. `checkScene` reports repeated attributes and misplaced `text`/`children`. The root attributes and their order, the `<title>`-first rule and the accessible-name rule are shared code (`rootAttrs`, `textAlternativeFor`) that TICKET-005's printer imports. | `src/layout/scene.ts`, `src/react/SceneSvg.tsx`, `src/layout/kit/check.ts` |
| CR-004 | Approved | `wrap` breaks only at breaking whitespace, so U+00A0, U+2007 and U+202F keep their words together and are kept as written. They get the space (or digit) width. Devanagari spacing vowel signs and visarga get an advance, and the avagraha is a letter; only nonspacing signs, nukta and virama are zero width. | `src/layout/kit/text.ts` |
| CR-005 | Approved | Known Hazard appended to GSS TICKET-002: display precision comes from `displayValue` / `formatDerived`, including the small-value rule; no second rounding rule. | `.gener8v/changes/graph-library/tickets/geometric-shapes-and-solids/TICKET-002.md` |
| CR-006 | Approved | Known Hazard appended to CPSE TICKET-003: call the layout in a `try`, send a thrown error to the fallback as `internal_error`, and test with a layout that throws. | `.gener8v/changes/graph-library/tickets/component-packaging-and-source-export/TICKET-003.md` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (6 resolved: 1 Issue, 5 Observations)
**Notes:** Resolved with the user (Thomas) on 2026-10-07; every recommendation approved. Acceptance criterion 7 is now met for numbers in strings too, through `pathData`/`translate` and `checkScene`, which every layout test runs (Known Hazard on GSS TICKET-002). The CPSE TICKET-003 duty to catch layout errors is a Known Hazard on that ticket. Re-verification passed (see the delivery record's Post-Review Amendments).
