# TICKET-002: Build the Scene model and the shared rendering core — Delivery Record

## Ticket Reference

**Ticket:** graph-library/component-packaging-and-source-export/TICKET-002
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/component-packaging-and-source-export.md`
**Requirements Covered:**
- CPSE-REQ-011: Render on server and in browser with identical output, using no browser-only facilities during render
- CPSE-REQ-012: Accept a text alternative, defaulting to one generated from the description
- CPSE-REQ-013: Scale to container width while keeping proportions

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| TICKET-001 delivered: `package.json`, `eslint.config.js`, `vitest.config.ts` | present | present; TICKET-001 record Delivered, reviews resolved | ✅ |
| Boundary lint covers `src/layout` | `src/layout/**` in the non-rendering block | `NON_RENDERING_DIRS` includes `layout`, all script extensions (after TICKET-001 CR-001) | ✅ |
| `src/react/` may import React | not in the boundary block | not restricted; `tests/package/boundaries.test.ts` asserts React allowed in `src/react` | ✅ |
| `src/core/format.ts` exports `formatSupplied`, `formatDerived` (carried CR-007 / QR-003) | present | present, half-away-from-zero, 2 dp, no `-0`, no exponent form | ✅ |
| `tests/fixtures/plain-text.ts` with `BENIGN_TEXT`, `HOSTILE_TEXT` (carried SEC-001) | present | present | ✅ |
| Default font stack in one place (AD-010) | system stack | `defaultStyle.fontFamily` in `src/core/style.ts` | ✅ — `text.ts` re-exports it, no second copy |
| `src/layout/`, `src/react/` exist | absent until this ticket | absent | ✅ Expected |
| Vitest with `.tsx` tests; `jsx: react-jsx` | configured | `include: tests/**/*.test.{ts,tsx}`, `environment: node`; tsconfig `react-jsx` | ✅ |
| A DOM implementation for the jsdom parity criterion | jsdom available | not installed (no jsdom, happy-dom or Testing Library) | ⚠️ Non-blocking — add `jsdom` + `@types/jsdom` dev dependencies (registry reachable: 30.1.2 / 30.0.0) |
| React / React DOM for `renderToString` | dev dependency | `react`, `react-dom` ^19.3.0 dev, `react` peer | ✅ |
| Prior Art: system-design AD-002, AD-007, AD-008, AD-010, AD-011; Layout kit, React renderer, Scene data model | present, Approved | present | ✅ |
| Prior Art: constraints prd/TC-001..003, TC-011, RF-001, RF-003, CC-002 | present | present | ✅ |
| Prior Art: dependency map RES-002, RES-005, RES-007 | present | present | ✅ |
| Carried: `graph-library/graph-specification-and-vocabulary-ticket-001-code-review/CR-007`, `…-quality-review/QR-003` — `displayValue` built on `formatSupplied`/`formatDerived` | addressed here | — | 🔁 Carried — see Implementation Plan |
| Carried: `graph-library/graph-specification-and-vocabulary-ticket-001-security-review/SEC-001` — Scene strings rendered only as React text/attribute values; fixture strings render literally | addressed here | — | 🔁 Carried — see Implementation Plan |
| Carried note: GSV TICKET-001 security review — bounding work on long text belongs to `wrap` / `placeLabel` | addressed here | — | 🔁 Carried — linear-time `wrap` |

**Resolved from ground truth (not escalated):** GSS OQ-005 (display precision) is already settled in code: `formatDerived` rounds to 2 decimal places, half away from zero, trailing zeros dropped — `displayValue` delegates to it, so no new precision rule is introduced.

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas, 2026-10-07

Setup: branch `ticket/cpse-002` from the current HEAD (`ticket/gsv-005`); dev dependencies `jsdom`, `@types/jsdom` (test environment only). Commit at the end; no push.

### Planned Files

- `src/layout/scene.ts`: `SCENE_WIDTH = 400`; `Scene { width: 400; height: Rounded; textAlternative; nodes }`; `SceneNode { kind; attrs: readonly [SvgAttr, AttrValue][]; children?; text? }`; `AttrValue = string | Rounded` where `Rounded` is a branded number only `fmt()` produces; `SvgAttr` a closed set of presentation/geometry attributes (no `id`, `href`, `class`, `style`, `clip-path`, `marker-*`, handlers); the shared mapping tables `ELEMENT_FOR_KIND` and `REACT_PROP`, imported by `SceneSvg` and TICKET-005's printer.
- `src/layout/kit/format.ts`: `fmt(n)` (`Math.round(n*100)/100`, `-0` → `0`, `RangeError` on non-finite), `fmtPoints(pairs)`, `displayValue(n, supplied)` delegating to `formatSupplied`/`formatDerived` (carried CR-007/QR-003).
- `src/layout/kit/scale.ts`: `linearScale([d0,d1],[r0,r1]) → (v) => number`, unrounded; zero-width domain → range midpoint.
- `src/layout/kit/text.ts`: `DEFAULT_FONT_STACK` re-exported from `defaultStyle.fontFamily`; `textWidth(text, fontSize)` per code point (Helvetica/Arial table for ASCII, 1 em for East Asian wide/emoji, 0 for combining marks/ZWJ/variation selectors) × 1.1; `wrap(text, maxWidth, fontSize)` greedy on whitespace, linear time, over-long words split at code points.
- `src/layout/kit/labels.ts`: `placeLabel(size, candidates, obstacles)` → first candidate box overlapping no obstacle (boxes or line segments, segment–box clip), else `undefined`; touching edges do not overlap.
- `src/react/SceneSvg.tsx`: `<svg role="img" aria-label viewBox="0 0 400 H" width="100%">`, `<title>` first; nodes via `createElement(tag, props, ...children)` with props in Scene order; strings only as text children or attribute values; no hooks, ids or keys; internal (TICKET-003 wires it).
- `tests/layout/kit/format.test.ts`, `tests/layout/kit/text.test.ts`, `tests/layout/kit/labels.test.ts`, `tests/react/SceneSvg.test.tsx`.

### How Acceptance Criteria Will Be Met

- Scene types: typed fixtures under `pnpm typecheck`.
- `fmt`/`displayValue`: unit tests on boundaries, negatives, `-0`, non-finite, and agreement with the core formatters.
- Scale/text/labels: unit tests.
- `SceneSvg` markup: `renderToStaticMarkup` assertions plus a source scan for `use[A-Z]`, `id` and `url(#`.
- Caller text alternative: test; "supplied" means a non-blank string.
- Server/jsdom parity: `renderToString` in Node with `window` undefined; then jsdom installed as globals, `react-dom/client` imported dynamically, `flushSync` render, compared after DOM normalization (hydration stays in TICKET-004).
- Raw number without `fmt()`: `attrs` accept only `Rounded | string`; a `@ts-expect-error` line makes `pnpm typecheck` fail if the brand is loosened.
- Plain-text fixture: every `BENIGN_TEXT`/`HOSTILE_TEXT` string renders literally (carried SEC-001).

Verification: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`, `pnpm check:dist`, `pnpm check:deps`, `pnpm size`.

## Progress

- [x] `package.json` / `pnpm-lock.yaml` — jsdom dev dependencies
- [x] `src/layout/scene.ts` — written, annotated
- [x] `src/layout/kit/format.ts` — written, annotated
- [x] `src/layout/kit/scale.ts` — written, annotated
- [x] `src/layout/kit/text.ts` — written, annotated
- [x] `src/layout/kit/labels.ts` — written, annotated
- [x] `src/react/SceneSvg.tsx` — written, annotated
- [x] `tests/layout/kit/format.test.ts` — written
- [x] `tests/layout/kit/text.test.ts` — written
- [x] `tests/layout/kit/labels.test.ts` — written
- [x] `tests/react/SceneSvg.test.tsx` — written
- [x] `tests/layout/kit/scale.test.ts` — written (not in the plan; see Deviations)
- [x] `.gener8v/specifications/component-packaging-and-source-export.md` — `## @spec Coverage` rows

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/layout/scene.ts`: `Scene`, `SceneNode`, `SceneNodeKind`, branded `Rounded`, `AttrValue`, closed `SvgAttr` set; shared printer tables `ELEMENT_FOR_KIND` and `REACT_PROP`; `SCENE_WIDTH = 400`
- `src/layout/kit/format.ts`: `fmt` (2 dp, `-0` → `0`, `RangeError` on non-finite), `fmtPoints`, `displayValue` on `formatSupplied`/`formatDerived`
- `src/layout/kit/scale.ts`: `linearScale`
- `src/layout/kit/text.ts`: `DEFAULT_FONT_STACK` (from `defaultStyle.fontFamily`), `TEXT_WIDTH_SAFETY`, `textWidth`, `wrap`
- `src/layout/kit/labels.ts`: `Box`, `Segment`, `Obstacle`, `placeLabel`
- `src/react/SceneSvg.tsx`: `SceneSvg` and `SceneSvgProps` (internal; not yet exported from a public entry)
- `tests/layout/kit/format.test.ts`, `tests/layout/kit/scale.test.ts`, `tests/layout/kit/text.test.ts`, `tests/layout/kit/labels.test.ts`, `tests/react/SceneSvg.test.tsx`
- `package.json`, `pnpm-lock.yaml`: dev dependencies `jsdom` ^30.1.2, `@types/jsdom` ^30.0.0
- `.gener8v/specifications/component-packaging-and-source-export.md`: `@spec Coverage` rows for CPSE-REQ-011..013

## Verification Run

Node.js v24.1.0, React 19.3.0, pnpm 10.28.2.

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm lint` | 0 | no findings (new `src/layout/**` files under the boundary rule) |
| `pnpm typecheck` | 0 | no errors; the two `@ts-expect-error` lines in `tests/layout/kit/format.test.ts` are live |
| `pnpm test` | 0 | 21 files, 566 tests passed (66 new across the five new files) |
| `pnpm build` | 0 | all entries and declarations emitted |
| `pnpm check:dist` | 0 | 4 built files, no network APIs or modules |
| `pnpm check:deps` | 0 | 0 runtime dependencies |
| `pnpm size` | 0 | all entries within budget (no entry includes the new modules yet) |
| `pnpm publint` | 0 | "All good!" |
| `GRAPH_GENERATOR_PREBUILT=1 pnpm vitest run tests/react` ×5 | 0 | 33 passed each run (parity test stable) |
| Mutation: `SceneSvg` width depends on `typeof window` → `pnpm vitest run tests/react` | 1 (expected) | parity test failed; source restored |
| Mutation: `AttrValue = string \| number` → `pnpm typecheck` | 2 (expected) | `TS2578: Unused '@ts-expect-error'` at `tests/layout/kit/format.test.ts:49`; source restored |

This ticket carries no NFR. CPSE-NFR-001 (export equality) and CPSE-NFR-005 (hydration) are verified under TICKET-005/006 and TICKET-004.

## Acceptance Criteria Verification

- [x] `src/layout/scene.ts` exports `Scene` (`width: 400`, `height`, `textAlternative`, `nodes`) and `SceneNode` (`kind` in the ten kinds; ordered `attrs`; optional `children`, `text`) — `pnpm typecheck` over the typed `sample` Scene in `tests/react/SceneSvg.test.tsx`, which uses every kind; `ELEMENT_FOR_KIND` test lists all ten elements
- [x] `fmt(n)` rounds to 2 dp and normalizes `-0`; `displayValue` returns supplied as given, derived at display precision; tests cover boundaries, negatives and `-0` — `tests/layout/kit/format.test.ts` (fmt, displayValue suites)
- [x] `linearScale`, `textWidth` (Helvetica/Arial table × 1.1), `wrap` (word boundaries, max width), `placeLabel` (first non-overlapping candidate) — `tests/layout/kit/scale.test.ts`, `tests/layout/kit/text.test.ts`, `tests/layout/kit/labels.test.ts`
- [x] `SceneSvg` renders `<svg role="img" aria-label viewBox="0 0 400 H" width="100%">` with `<title>` first, maps nodes one-to-one with attributes in Scene order, and uses no hooks, state, effects, ids or `url(#…)` — `SceneSvg markup` suite (prefix string, recursive element/attribute-order check, id/marker/clipPath scan, comment-stripped source scan)
- [x] A caller-supplied text alternative replaces the generated one in `aria-label` and `<title>` — `text alternative` suite (supplied, default, blank falls back)
- [x] `renderToString` in Node.js with no browser globals equals a jsdom render — `server and browser render the same markup` test: asserts `window`/`document` undefined, renders 24 Scenes (sample + every fixture string) on the server, then with jsdom globals via `react-dom/client` + `flushSync`; `innerHTML` and `isEqualNode` equal after DOM normalization (DEL-005). Mutation check proves it fails on divergence
- [x] A lint rule or test fails when a layout writes a raw number into Scene attrs without `fmt()` — branded `Rounded` type; `@ts-expect-error` in `tests/layout/kit/format.test.ts` makes `pnpm typecheck` fail if the brand is loosened (mutation check, exit 2) (DEL-002)
- [x] Carried SEC-001: every `BENIGN_TEXT` and `HOSTILE_TEXT` string renders literally in `aria-label`, `<title>` and a `text` node, creating no elements or attributes — `plain text renders literally` suite (23 cases)
- [x] Carried CR-007 / QR-003: `displayValue` agrees with `formatSupplied` / `formatDerived` — `displayValue … agrees with the text-alternative formatters`

## Decisions Made

### DEL-001: Scene attrs are ordered pairs from a closed attribute set, with shared printer tables

**Context:** AD-002 requires ordered attributes and identical markup from `SceneSvg` and TICKET-005's printer; React needs camelCase props for kebab-case SVG attributes.
**Decision:** `attrs` is `ReadonlyArray<readonly [SvgAttr, AttrValue]>`. `SvgAttr` is the key set of `REACT_PROP` (SVG name → React prop) in `src/layout/scene.ts`, alongside `ELEMENT_FOR_KIND`. The set has no `id`, `href`, `class`, `style`, `clip-path`, `marker-*` or event handlers.
**Rationale:** Pairs make order explicit rather than relying on object key order. A closed set enforces AD-008 and AD-011 at compile time and gives the exporter a single table to mirror.
**Ticket Impact:** A layout that needs another attribute adds it to `REACT_PROP`, and both printers pick it up.

### DEL-002: The raw-number check is a branded type, not an ESLint rule

**Context:** The criterion allows "a lint rule or test". A syntactic lint rule cannot tell a rounded number from a raw one.
**Decision:** `fmt()` returns `Rounded` (`number & { [brand] }`); `AttrValue = string | Rounded`; `Scene.height` is `Rounded`. A `@ts-expect-error` test keeps the check alive under `pnpm typecheck`.
**Rationale:** Types catch every raw number, wherever it was computed; a lint rule would only catch literals.
**Ticket Impact:** String attributes (`d`, `points`) are not covered; layouts build them from `fmt()` values or `fmtPoints`. A reviewer checks `d` strings by convention.

### DEL-003: `fmt()` throws on non-finite input

**Context:** `NaN`/`Infinity` in markup is a silent wrong drawing; CPSE-REQ-018 says components never throw.
**Decision:** `fmt` throws `RangeError`. **TICKET-003 must catch layout errors** in `Graph` / per-type components and route them to the fallback, so CPSE-REQ-018 holds.
**Rationale:** A layout bug surfaces in tests rather than as broken markup; the boundary that must not throw is the component, not the kit.
**Ticket Impact:** Known for TICKET-003 (see Notes).

### DEL-004: `wrap` splits a word wider than the line

**Context:** The ticket says "breaks on word boundaries at a maximum width"; a single long word (or hostile text with no spaces) would otherwise overflow.
**Decision:** Words that fit break on whitespace; a word wider than `maxWidth` is split between code points (never inside a surrogate pair). Runs of whitespace collapse.
**Rationale:** Every line fits, which is what label placement relies on; linear time bounds the work on long text (GSV TICKET-001 security review note).
**Ticket Impact:** None beyond the criterion.

### DEL-005: Server/browser parity compares DOM trees, not raw strings

**Context:** React's server escapes `'` and `"` in text (`&#x27;`, `&quot;`); a browser's `innerHTML` does not. Both are the same DOM.
**Decision:** The server string is parsed into the same jsdom document and serialized; that and the client `innerHTML` must be equal, and `isEqualNode` true.
**Rationale:** Parity of the tree is what hydration needs; string equality would fail on escaping alone. Full hydration warnings are TICKET-004.
**Ticket Impact:** None.

### DEL-006: jsdom installed as globals inside a Node-environment test

**Context:** The criterion needs both "Node.js with no browser globals" and a jsdom render in one comparison.
**Decision:** `tests/react/SceneSvg.test.tsx` runs in the default `node` environment, asserts no `window`/`document`, renders on the server, then installs jsdom's `window`/`document`, imports `react-dom/client` dynamically, and removes the globals after React's scheduler drains. `jsdom` and `@types/jsdom` are dev dependencies.
**Rationale:** Keeps both halves in one test without a second Vitest environment; no runtime dependency.
**Ticket Impact:** None.

### DEL-007: A caller-supplied text alternative counts only when not blank

**Context:** CPSE-REQ-012 says a generated text alternative is used "when none is given"; an empty `aria-label` would leave the graph without a name (prd/CC-002).
**Decision:** `textAlternative` replaces the Scene's when `trim() !== ""`; otherwise the generated one is used. A supplied value is rendered as given (not cleaned).
**Rationale:** Never ships an unnamed graph.
**Ticket Impact:** TICKET-003's `Graph` passes `textAlternative` through unchanged.

## Deviations from Plan

- `tests/layout/kit/scale.test.ts` added: the plan put `linearScale` tests in the kit test files without naming one; a file of its own keeps each kit module with its tests. No downstream impact.
- Nothing else — implementation followed the approved plan.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| CPSE-REQ-011 | `src/layout/scene.ts:SceneNode` | `@spec CPSE-REQ-011` |
| CPSE-REQ-011 | `src/layout/scene.ts:Scene` | `@spec CPSE-REQ-011, CPSE-REQ-012, CPSE-REQ-013` |
| CPSE-REQ-011 | `src/layout/kit/format.ts:fmt()`, `fmtPoints()` | `@spec CPSE-REQ-011` |
| CPSE-REQ-011 | `src/layout/kit/text.ts:textWidth()`, `wrap()` | `@spec CPSE-REQ-011` |
| CPSE-REQ-011 | `src/layout/kit/labels.ts:placeLabel()` | `@spec CPSE-REQ-011` |
| CPSE-REQ-011 | `src/react/SceneSvg.tsx:SceneSvg()` | `@spec CPSE-REQ-011, CPSE-REQ-012, CPSE-REQ-013` |
| CPSE-REQ-012 | `src/layout/scene.ts:Scene`, `src/react/SceneSvg.tsx:SceneSvg()` | as above |
| CPSE-REQ-013 | `src/layout/scene.ts:Scene`, `src/layout/kit/scale.ts:linearScale()`, `src/react/SceneSvg.tsx:SceneSvg()` | `@spec CPSE-REQ-013` / as above |

All covered requirements annotated. `displayValue` carries no CPSE annotation: it serves GSS-REQ-034, which GSS tickets annotate where labels are drawn. Text-measurement helpers are annotated CPSE-REQ-011 because they replace measuring during render (prd/TC-001).

## Notes

- **For TICKET-003:** wrap layout calls so a thrown error (DEL-003) reaches the fallback, keeping CPSE-REQ-018. Export `SceneSvg` only if the public surface needs it; it is internal today.
- **For TICKET-005:** the JSX printer must import `ELEMENT_FOR_KIND` and `REACT_PROP` from `src/layout/scene.ts` and print `role`, `aria-label`, `viewBox`, `width` on the root in that order, then `<title>`, then nodes with attrs in Scene order. Numbers print as `String(n)`, as React does.
- **For layout tickets (NLC, DGP, GSS):** every number goes through `fmt()`; `points` through `fmtPoints`; build `d` strings only from `fmt()` values (DEL-002). `placeLabel` returns `undefined` when all candidates are blocked — the layout chooses a fallback. Arrowheads are polygons; partial images use a nested `svg` node (AD-008).
- Tooling: the gener8v PreToolUse hook reads only the first 4,000 characters of each record, so it did not see `**Status:** In Progress` in this record (the line sits after the reconciliation table and plan) and warned "no delivery is In Progress" on every source write. The delivery was in progress throughout; the record's shape follows the template.

## Post-Review Amendments

Resolution of `graph-library/component-packaging-and-source-export-ticket-002-code-review`, `…-quality-review` and `…-security-review`, 2026-10-07, every recommendation approved by the Engineer (Thomas). The reviews' overlapping findings were decided once.

- **…-code-review/CR-001, …-quality-review/QR-004** — `pathData` and `translate` build `d`/`transform` strings from `fmt()` values; new `checkScene` (`src/layout/kit/check.ts`) reports unrounded or exponent-form numbers in string attributes and numbers that skipped `fmt()`. Correction to Acceptance Criteria Verification above: criterion 7 was **Partial** at delivery (strings were unguarded); it is now met by the type for numbers plus `checkScene` for strings, which every layout test must run (Known Hazard on GSS TICKET-002). Correction to DEL-002: types alone do not catch numbers written as strings. Files: `src/layout/kit/format.ts`, `src/layout/kit/check.ts`, `tests/layout/kit/format.test.ts`, `tests/layout/kit/check.test.ts`.
- **…-code-review/CR-002, …-security-review/SEC-002** — `checkScene` reports `url(` in any attribute value. Correction to DEL-001: the closed set limits names, not values. File: `src/layout/kit/check.ts`.
- **…-code-review/CR-003, …-quality-review/QR-001, QR-005** — `SceneNode` is `ShapeNode | TextNode | ContainerNode`; `rootAttrs` and `textAlternativeFor` in `src/layout/scene.ts` hold the root attributes and order, the `<title>`-first rule and the naming rule; `checkScene` reports repeated attributes and misplaced `text`/`children`. TICKET-005's printer imports `rootAttrs`, `textAlternativeFor`, `ELEMENT_FOR_KIND` and `REACT_PROP`. Files: `src/layout/scene.ts`, `src/react/SceneSvg.tsx`.
- **…-security-review/SEC-001** — DEL-007 revised: a supplied text alternative goes through `cleanText` and is used only when a visible character remains; non-strings fall back without throwing. Files: `src/layout/scene.ts`, `tests/react/SceneSvg.test.tsx`.
- **…-security-review/SEC-003, …-quality-review/QR-009, …-code-review/CR-006** — `fmt` throws on a non-finite result or one of 1e21 or more (exponent form); `linearScale` maps an overflowing ratio to the range midpoint; `wrap` rejects non-positive or non-finite sizes. Known Hazard appended to CPSE TICKET-003 (catch layout errors, route to the fallback). Files: `src/layout/kit/format.ts`, `src/layout/kit/scale.ts`, `src/layout/kit/text.ts`, `.gener8v/changes/graph-library/tickets/component-packaging-and-source-export/TICKET-003.md`.
- **…-quality-review/QR-002** — parity test uses `act()` for render and unmount; the 20 ms timer is removed (DEL-006 revised). File: `tests/react/SceneSvg.test.tsx`.
- **…-quality-review/QR-003** — `src/react/**` lint block rejects browser globals (`@types/jsdom` puts the DOM library in the type-check program). Files: `eslint.config.js`, `tests/package/boundaries.test.ts`.
- **…-code-review/CR-004, …-quality-review/QR-006, QR-007** — `wrap` breaks only at breaking whitespace (no-break spaces kept); over-long words split between clusters; Devanagari spacing signs have an advance (DEL-004 revised). File: `src/layout/kit/text.ts`, `tests/layout/kit/text.test.ts`.
- **…-quality-review/QR-008** — `placeLabel(size, candidates, obstacles, padding = 0)`. File: `src/layout/kit/labels.ts`.
- **…-quality-review/QR-010** — `displayValue(n, "supplied" | "derived")`. File: `src/layout/kit/format.ts`.
- **…-quality-review/QR-011** — invisible characters in tests written as `\u` escapes. File: `tests/layout/kit/text.test.ts`.
- **…-quality-review/QR-012** — `jsdom` `^26.1.0`, `@types/jsdom` `^21.1.7`, within `engines >=22`. Files: `package.json`, `pnpm-lock.yaml`.
- **…-code-review/CR-005** — Known Hazard appended to GSS TICKET-002 (one display-precision rule; `checkScene`, `pathData`, `translate` in layout tests).
- **…-security-review/SEC-004** — Accepted Risk (Security — Thomas, 2026-10-07): `placeLabel` is quadratic in label count, bounded by the validator's cap; documented in code.
- Specification `## @spec Coverage` rows for CPSE-REQ-011..013 updated with `pathData`, `translate`, `checkScene`, `textAlternativeFor`, `rootAttrs` and the `src/react` lint block.

Re-verification after the amendments (Node.js v24.1.0, React 19.3.0, pnpm 10.28.2):

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm lint` | 0 | no findings |
| `pnpm typecheck` | 0 | no errors; `@ts-expect-error` checks live |
| `pnpm test` | 0 | 22 files, 590 tests passed |
| `pnpm build` | 0 | all entries and declarations emitted |
| `pnpm check:dist` | 0 | 4 built files, no network APIs or modules |
| `pnpm check:deps` | 0 | 0 runtime dependencies |
| `pnpm size` | 0 | all entries within budget |
| `pnpm publint` | 0 | "All good!" |
| `pnpm attw` | 0 | no problems in the ESM-only profile |
| `GRAPH_GENERATOR_PREBUILT=1 pnpm vitest run tests/react` ×10 | 0 | 37 passed each run, no unhandled errors |
| Mutation: root `width` depends on `typeof window` → `pnpm vitest run tests/react` | 1 (expected) | parity test failed cleanly; source restored |
| React 18.3.1 (scratch copy, CI's swap command) → `pnpm typecheck`; `pnpm vitest run tests/react tests/layout` | 0; 0 | 88 passed |
| `gener8v-state.py lint` | 0 | 0 errors, 0 warnings |
