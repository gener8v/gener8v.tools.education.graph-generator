# TICKET-005: Pictograph — Delivery Record

## Ticket Reference

**Ticket:** graph-library/data-graphs-and-pictographs/TICKET-005
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/data-graphs-and-pictographs.md`
**Requirements Covered:**
- DGP-REQ-004: Plain-text alternative naming type, title, unit label, every category and value
- DGP-REQ-023: One row or column per category built from repeated unit images
- DGP-REQ-024: Unit image by name from the published set
- DGP-REQ-025: Unit value — units per image
- DGP-REQ-026: Images per category = value ÷ unit value
- DGP-REQ-027: Key "each [image name] = [unit value] [value-unit label]"
- DGP-REQ-028: Non-whole multiple drawn as whole images plus one cropped partial image
- DGP-REQ-029: Report a unit value that is not positive
- DGP-REQ-030: Report a negative pictograph value
- DGP-REQ-031: Report an unknown image name and list available names
- DGP-REQ-032: Horizontal rows (default) or vertical columns
- DGP-REQ-037: Every image at the same size and spacing
- DGP-NFR-002: Partial image visible width within 2% of the exact remaining fraction — verified by a geometry test over generated non-whole-multiple values
- Also published here (carried DGP TICKET-004 CR-002): DGP-REQ-035, the image names in the schema and vocabulary

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Predecessors DGP TICKET-001, TICKET-004 | delivered | both delivered and done (all three reviews) | ✅ |
| Cross-area predecessors CPSE TICKET-003, GSV TICKET-004 | delivered | delivered and done | ✅ |
| `categories.ts`: categories, `valueUnitLabel`, checks | present | `categoriesProperty()`, `categories`, `categoriesCheck`, `dataGraphProperties.valueUnitLabel` (scoped to pictographs, `emptyIsAbsent`), `VALUE_LIMIT`; `valueScale` already reported as not applying on pictographs | ✅ |
| `value-scale.ts` (kit): category slots | present | `categorySlots(categories, box, orientation, nameWidth)`, `drawCategoryNames`; `intervalsIn` in `src/core/value-scale.ts` gives a noise-tolerant whole count (0.3 ÷ 0.1 = 3) | ✅ |
| `src/images/`: `images`, `getImageNames()`, `ImageAsset` | present | present; `getImageNames()` returns a non-empty tuple; `imageDescriptions()`; drawings in a 100 × 100 `viewBox` | ✅ |
| `suggest.ts` near-miss suggestion | present | `closestTerm(name, terms)` | ✅ |
| `registry.ts`, `createGraphComponent.tsx`, the circle as the pattern | present | circle registered in both tables, `CircleGraph`, `./circle` entry, `tsup`, `.size-limit.json`, examples | ✅ |
| `unknown_image` for an unpublished `unitImage`, with `allowed` and a suggestion | validator reports it | an `enum` value outside its list is reported as `wrong_kind` (`structure.ts`); `unknown_image` has no `suggestion` parameter | ⚠️ Needs a small validator change — see Implementation Plan |
| Partial image cropped with a nested `<svg>` (AD-008) | possible in the Scene | `svg` is a Scene container kind; `viewBox`, `width`, `height`, `x`, `y` are Scene attributes | ✅ |
| Category color and `valueScale` inapplicable on pictographs | reported | the shared `color` lists no pictograph in `elementsOf`; `valueScale` is scoped to line and bar graphs | ✅ Nothing to add |
| Carried: GSV CR-002/QR-001/QR-002 (definition contract) | addressed here | — | 🔁 Carried |
| Carried: GSV TICKET-003 SEC-001 (`maxItems`) | addressed here | — | 🔁 Carried |
| Carried: GSV TICKET-004 CR-003/SEC-004 (domain checks) | addressed here | — | 🔁 Carried |
| Carried: GSV TICKET-005 CR-001, CR-003 (examples; enum from the image set) | addressed here | — | 🔁 Carried |
| Carried: GSS TICKET-002 CR-003 (provenance contract), SEC-001..003 (caller-sized text) | addressed here | — | 🔁 Carried |
| Carried: DGP TICKET-001 SEC-002/003 (category names; value bounds) | addressed here | — | 🔁 Carried |
| Carried: DGP TICKET-004 CR-002, CR-004, QR-004/006, SEC-003 (publish DGP-REQ-035; bundle and core → layout import; unit cap) | addressed here | — | 🔁 Carried — two decisions in the plan |

**Resolved from ground truth (not escalated):**
- A category color and a `valueScale` on a pictograph are already reported as not applying (DGP TICKET-001's scoped terms and the shared `color`'s `elementsOf`); the tests here confirm it on the real type.
- "0.3 ÷ 0.1" style values: `intervalsIn` (DGP TICKET-001 quality review QR-003) already gives the noise-tolerant whole count, so a value that is a whole multiple draws only whole images.

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas Eaves, 2026-10-14

Decisions taken with the plan: a provisional cap of 1,000 images in total, pending the Product Owner's limit under DGP OQ-004 (DEL-001); core may import the layout kit's `fmt()` through the images (DEL-002); the component is exported as `Pictograph`, as the ticket says (DEL-003).

### Planned Files

- `src/core/definitions/pictograph.ts`: the definition, registered in `src/core/definitions/index.ts`.
  - **Terms:**
    - `categories` (names only);
    - `values`: one number per category, 0 to 1,000,000,000 (a negative value is `out_of_range` at `/values/<i>`);
    - `unitImage`: an enum built from `getImageNames()` and `imageDescriptions()`, annotated `@spec DGP-REQ-035`;
    - `unitValue`: greater than 0 (0 or less is `out_of_range` at `/unitValue`);
    - `orientation`: `horizontal` (default) or `vertical`.
  - **Checks:**
    - `categoriesCheck`;
    - values against categories (`series_length_mismatch` at `/values`);
    - an image cap, counted arithmetically: Σ ⌈value ÷ unitValue⌉ against 1,000, reported as `too_large`.
  - **`describe`:** type, title, image, unit value and label, and every category with its value; caller text through `quoteText` and `stateMeasurement`.
- `src/core/definitions/types.ts`, `src/core/validate/structure.ts`, `src/core/issues.ts`: an enum may declare `unknownCode: "unknown_image"`, so an unpublished name is reported as `unknown_image` with every published name in `allowed` and the `closestTerm` suggestion; `unknown_image` gains an optional `suggestion` and message wording.
- `src/layout/pictograph.ts`: the layout, registered in `src/layout/registry.ts`.
  - **Arrangement:** title (`titleBlock`), then one row per category with names in a left column. With `vertical`, columns grow upward with names below.
  - **Sizing:** one image size for every image, fitted so the longest row fits; whole images as nested `<svg>` elements holding the drawing's nodes.
  - **The partial image:**
    - it is a nested `<svg>` whose width (or, for columns, height) is the remaining fraction, cropped by its `viewBox` (AD-008);
    - a remainder under 1% is drawn at least 1% wide;
    - whole counts come from `intervalsIn`.
  - **Zero values:** a zero value keeps its row and name.
  - **The key:** a small image plus "each <name> = <unitValue> <label or "units">", wrapped and capped at 2 lines.
- `src/react/graphs/PictographGraph.tsx`: the component, exported as `Pictograph`. `src/entries/pictograph.ts`, `src/index.ts` export, `package.json` `exports["./pictograph"]`, `tsup.config.ts` entry, `.size-limit.json` entry (25 kB).
- `examples/pictograph.json` (rich, with a non-whole value), `examples/invalid/pictograph-unknown-image.json`, `examples/invalid/pictograph-zero-unit.json`; `pnpm generate` and the regenerated `src/generated/*`.
- `tests/core/pictograph.test.ts`: validation criteria; inapplicable category color and `valueScale`; text alternative; the generated schema, tool schema and vocabulary list every image name and description; the image cap; the invalid examples.
- `tests/layout/pictograph.test.ts`:
  - whole and partial counts, the tiny remainder and the zero value;
  - equal sizing, equal rows for equal values, and both orientations;
  - the key text;
  - DGP-NFR-002 as a property test;
  - no ids or `url(`;
  - large text, recording node count and markup size for long category names.
- Tests that assume the circle is the only registered type, updated.

### How Acceptance Criteria Will Be Met

- Validates and renders with every term: definition, layout, component — `tests/core/pictograph.test.ts`, `tests/layout/pictograph.test.ts`, the example
- ⌊value ÷ unitValue⌋ whole images, one cropped partial image (nested `<svg>`), a tiny remainder still drawn, a zero value keeps its row — `tests/layout/pictograph.test.ts`
- Same size and spacing; equal values give equal rows — `tests/layout/pictograph.test.ts`
- `orientation` horizontal (default) and vertical — both test files
- The key text, "units" without a label — `tests/layout/pictograph.test.ts`
- `unitValue` ≤ 0, a negative value, and `unknown_image` with `allowed` and a suggestion — `tests/core/pictograph.test.ts`
- Category color and `valueScale` inapplicable — `tests/core/pictograph.test.ts`
- Text alternative contents — `tests/core/pictograph.test.ts`
- DGP-NFR-002 — property test in `tests/layout/pictograph.test.ts`
- No ids or `url(#…)` — `checkScene` and a direct test
- Entry, `exports`, size-limit, examples — `pnpm build`, `pnpm size`, `pnpm publint`, `pnpm attw`, the schema-agreement test reading `examples/pictograph.json`

## Progress

- [x] `src/core/issues.ts`, `src/core/definitions/types.ts`, `src/core/validate/structure.ts` — `unknown_image` for an enum; `too_large` unit `images`
- [x] `src/core/definitions/pictograph.ts` and its registration
- [x] `src/layout/pictograph.ts` and its registration
- [x] `src/react/graphs/PictographGraph.tsx`, `src/entries/pictograph.ts`, `src/index.ts`, `package.json`, `tsup.config.ts`, `.size-limit.json`
- [x] `examples/pictograph.json`, `examples/invalid/pictograph-*.json`, `src/generated/*`
- [x] `tests/core/pictograph.test.ts`
- [x] `tests/layout/pictograph.test.ts`
- [x] tests that assume a single registered type — none needed changing; `tests/react/Graph.test.tsx` and `tests/package/per-type-bundle.test.ts` gained pictograph cases (see Deviations)

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/core/definitions/pictograph.ts`: new.
  - Exports `Pictograph`, `pictograph` (built by a side-effect-free factory), `imageCount`, `ImageCount` and `PICTOGRAPH_IMAGE_LIMIT` (1,000).
  - Terms: `categories`, `values`, `unitImage` (an enum from the image set, `unknownCode: "unknown_image"`), `unitValue`, `orientation`.
  - Checks: category names, one value per category, and the picture limit.
  - `describe(normalized, provenance)`.
- `src/core/definitions/index.ts`: pictograph registered.
- `src/core/definitions/types.ts`: `EnumValue.unknownCode`.
- `src/core/validate/structure.ts`: an unpublished `unitImage` is `unknown_image`, with `allowed` and a `closestTerm` suggestion.
- `src/core/issues.ts`: `unknown_image` takes an optional `suggestion` ("Did you mean apple?"); `too_large` takes the unit `images`, with its own message.
- `src/layout/pictograph.ts`: new.
  - Exports `pictographLayout`, `keyText`, `MAX_IMAGE_STEP`, `MIN_PARTIAL` and `KEY_MAX_LINES`.
  - Draws rows or columns of nested `<svg>` pictures and a partial picture cropped by its `viewBox`, at one rounded size and step.
  - Draws the key as a centred picture-and-text group.
- `src/layout/registry.ts`: pictograph layout registered.
- `src/react/graphs/PictographGraph.tsx` (`Pictograph`), `src/entries/pictograph.ts`, `src/index.ts`, `package.json` (`./pictograph`), `tsup.config.ts`, `.size-limit.json` (25 kB).
- `examples/pictograph.json`, `examples/invalid/pictograph-unknown-image.json`, `examples/invalid/pictograph-zero-unit.json`.
- `src/generated/description.ts`, `schema.json`, `tool-schema.json`, `vocabulary.json`, `tests/fixtures/generated/description.ts`: regenerated.
- `tests/core/pictograph.test.ts` (31 tests), `tests/layout/pictograph.test.ts` (16, one a property test), `tests/react/Graph.test.tsx` (2 added), `tests/package/per-type-bundle.test.ts` (3 added).

## Verification Run

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm generate` | 0 | the four generated files regenerated and committed |
| `pnpm lint` | 0 | — |
| `pnpm typecheck` | 0 | — |
| `pnpm test` | 0 | 35 files, 943 tests; five full runs, all exit 0 |
| `pnpm bench` | 0 | GSV-NFR-001 pictograph p95 0.0266 ms (limit 5 ms); circle 0.0207 ms |
| `pnpm build` | 0 | — |
| `pnpm check:dist` | 0 | — |
| `pnpm check:deps` | 0 | — |
| `pnpm check:images` | 0 | "Images: 8 (apple, …, tree), every license recorded and allowed" |
| `pnpm size` | 0 | `./pictograph` 17.17 kB (limit 25 kB); `./core` 12.41 → 15.22 kB; `./circle` 15.31 → 15.62 kB; `.` 15.38 → 19.16 kB |
| `pnpm publint` | 0 | — |
| `pnpm attw` | 0 | — |
| `pnpm audit` | 0 | No known vulnerabilities found |
| `gener8v-state.py lint` | 0 | 0 errors, 0 warnings |
| Mutation checks (scratchpad backups, restored) | — | each caught: `unknown_image` handling removed (6 tests), the picture cap removed, the 1% floor removed, the column crop's `viewBox` wrong, the rounded step removed, the noise-tolerant count replaced by plain division, the "units" default removed, the definition's side-effect-free marks removed (the consumer-bundle test of `dist/circle.js`) |
| Visual check | — | the example, a column pictograph and a crowded row rendered (scratchpad, via Quick Look) and inspected: equal pictures, cropped partials, the zero row kept, wrapped names, the key centred |

## Acceptance Criteria Verification

- [x] `type: "pictograph"` with `categories`, `values`, `unitImage`, `unitValue`, optional `valueUnitLabel` and `orientation` validates and renders — `tests/core/pictograph.test.ts` › "validates categories, values…", `tests/layout/pictograph.test.ts` › "is the Scene createGraph returns for the example…"
- [x] ⌊value ÷ unitValue⌋ whole pictures; a remainder draws one more cropped by a nested `<svg>` whose width is the fraction; a remainder below 1% is still drawn; a zero value draws none and keeps its row and name — `tests/layout/pictograph.test.ts` › "draws ⌊value ÷ unitValue⌋…", "draws a remainder below 1%…", "keeps a zero value's row and name…", "draws exactly whole pictures…(0.3 ÷ 0.1)"
- [x] Same size and spacing; equal values give equal-length rows (DGP-REQ-037) — `tests/layout/pictograph.test.ts` › "draws every picture at one size and one step…", "shrinks every picture together…"
- [x] `orientation` `horizontal` (default, rows) and `vertical` (columns) — `tests/layout/pictograph.test.ts` › "orientation" (2 tests); `tests/core/pictograph.test.ts` › "accepts every published image, and both orientations…"
- [x] The key reads "each <image name> = <unitValue> <valueUnitLabel>", "units" without a label — `tests/layout/pictograph.test.ts` › "the key" (3 tests)
- [x] `unitValue` ≤ 0 is `out_of_range` at `/unitValue`; a negative value at `/values/<i>`; an unknown `unitImage` is `unknown_image` listing every published name, with a suggestion for a case or spelling near miss — `tests/core/pictograph.test.ts` › "pictograph issues" (9 tests, including the invalid examples)
- [x] A per-category color or a `valueScale` is reported as inapplicable — `tests/core/pictograph.test.ts` › "reports a per-category color and a value scale as inapplicable"
- [x] The text alternative names the type, title, unit image, unit value and label, and every category with its value — `tests/core/pictograph.test.ts` › "the text alternative" (3 tests)
- [x] DGP-NFR-002: the partial picture's visible share is within 2% of the exact remainder, over generated non-whole values in rows and columns — `tests/layout/pictograph.test.ts` › "DGP-NFR-002…" (400-run property test)
- [x] No element ids or `url(#…)` — `tests/layout/pictograph.test.ts` › "crops by nesting a viewport, with no ids, clip paths or references"; `checkScene` on every Scene
- [x] `src/entries/pictograph.ts` exports `Pictograph`; `package.json` has `./pictograph`; `.size-limit.json` has a pictograph entry within 25 kB; `examples/pictograph.json` (non-whole values) and two `examples/invalid/pictograph-*.json` exist — `pnpm build`, `pnpm size` (17.17 kB), `pnpm publint`, `pnpm attw`; `tests/core/pictograph.test.ts` reads all three examples; the schema-agreement test mutates `examples/pictograph.json`

## Decisions Made

### DEL-001: A provisional cap of 1,000 pictures

**Context:** Carried DGP TICKET-004 SEC-003: one picture costs up to 9 Scene nodes, so an unbounded count lets a short description exhaust a server. The limit is the Product Owner's under DGP OQ-004.
**Decision:** At most 1,000 pictures in total, whole and partial, counted arithmetically (Σ ⌈value ÷ unitValue⌉) in a domain check before anything is drawn. Above it, `too_large` at `/values`: "values would draw 1001 pictures, more than the limit of 1000; use a larger unitValue or smaller values." Stated in the definition's description. Chosen by the user with the plan; **flagged for Product Owner sign-off**.
**Rationale:** Generous for classroom pictographs (100 categories × 10 pictures), bounded at about 9,000 nodes.
**Ticket Impact:** Replaces the ticket's original "do not invent a cap".

### DEL-002: Core imports the images, and through them the layout kit's `fmt()`; the definition is side-effect free

**Context:** Carried DGP TICKET-004 CR-004: the pictograph definition (core) needs `getImageNames()`, and the images use `fmt` from `src/layout/kit/format.ts`.
**Decision:**
- Accept the core → layout import of `fmt`. Chosen by the user with the plan.
- Build the definition in a function marked `@__NO_SIDE_EFFECTS__`.
  - The first build showed `./circle` growing from 15.31 to 17.23 kB, because the definitions module kept the pictograph and every drawing.
  - With the factory, a consumer's bundle of the circle drops them: 15.62 kB.
  - A test bundles the built `dist/circle.js` as a consumer would.
**Rationale:** Moving `fmt` would touch every layout for no behavioural change. The factory keeps per-type bundles to their own type (AD-001).
**Ticket Impact:** `./core` and `.` carry the images (+2.8 kB), as they validate pictographs.

### DEL-003: The component is exported as `Pictograph`

**Context:** The ticket names `Pictograph`; the circle's is `CircleGraph`.
**Decision:** `Pictograph`, from `src/react/graphs/PictographGraph.tsx`, as the ticket says. Chosen by the user with the plan.
**Ticket Impact:** None.

### DEL-004: `unknown_image` comes from the enum itself

**Context:** An enum value outside its list was `wrong_kind`; DGP-REQ-031 wants `unknown_image` listing the names, and the edge case wants a suggestion for a case near miss.
**Decision:**
- `EnumValue.unknownCode: "unknown_image"` makes the validator report an unpublished text value as `unknown_image`, with `allowed` = every name and the `closestTerm` suggestion. Case is ignored, so "Apple" suggests "apple".
- `unknown_image` gains an optional `suggestion`.
- One enum still feeds the validator, both schemas and the vocabulary (DGP-REQ-035).
**Ticket Impact:** Small validator and issue-code changes outside the declared Output.

### DEL-005: Pictures as nested viewports on one rounded grid

**Context:** AD-008 forbids clip paths; DGP-REQ-037 wants equal size and spacing; DGP-REQ-028 wants a cropped partial picture.
**Decision:**
- Every picture is a nested `<svg>` holding the image's own nodes, with `viewBox` `IMAGE_VIEW_BOX`.
- The partial picture's width (rows) or height (columns) is the remaining fraction, and its `viewBox` shows that share at full scale:
  - rows keep the left part (`0 0 50 100`);
  - columns, which grow upward, keep the bottom part (`0 50 100 50`).
- A remainder under 1% is drawn 1% wide (`MIN_PARTIAL`).
- The step and size are rounded once to the 0.01 grid, so spacing is exactly equal.
- The partial counts come from `intervalsIn`, so 0.3 ÷ 0.1 is exactly 3.
**Ticket Impact:** For columns, the crop is the partial picture's *height*, not its width as the criterion's wording ("a nested `<svg>` whose width is that fraction") says for rows.

## Deviations from Plan

- **Validator changes:** `src/core/issues.ts` also gains the `too_large` unit `images` and its own message, so the picture limit reads sensibly.
- **The definition factory:** the side-effect-free factory (DEL-002) was added after the first size measurement.
- **The key:** it is centred as a picture-and-text group, after the first render showed the picture far from its text.
- **Large-text tests:** they sit in `tests/react/Graph.test.tsx` beside the circle's.
- **Bundle tests:** `tests/package/per-type-bundle.test.ts` gained:
  - the pictograph component excludes the circle and keeps every image;
  - a consumer bundle of the built `./circle` carries no drawing.
- **No single-type tests needed changing.**

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| DGP-REQ-004 | `src/core/definitions/pictograph.ts`:pictograph, describe | `@spec DGP-REQ-004, …` / `@spec DGP-REQ-004, DGP-REQ-027` |
| DGP-REQ-023 | `src/core/definitions/pictograph.ts`:pictograph; `src/layout/pictograph.ts`:pictographLayout; `src/react/graphs/PictographGraph.tsx`:Pictograph | `@spec DGP-REQ-023, …` |
| DGP-REQ-024 | `src/core/definitions/pictograph.ts`:pictograph, unitImage | `@spec DGP-REQ-024, …` |
| DGP-REQ-025 | `src/core/definitions/pictograph.ts`:pictograph (`unitValue`) | `@spec …, DGP-REQ-025, …` |
| DGP-REQ-026 | `src/core/definitions/pictograph.ts`:imageCount, pictograph, the values check; `src/layout/pictograph.ts`:pictographLayout | `@spec DGP-REQ-026, …` |
| DGP-REQ-027 | `src/core/definitions/pictograph.ts`:describe; `src/layout/pictograph.ts`:keyText, pictographLayout | `@spec DGP-REQ-027` |
| DGP-REQ-028 | `src/core/definitions/pictograph.ts`:imageCount; `src/layout/pictograph.ts`:partialPicture, pictographLayout | `@spec DGP-REQ-028, …` |
| DGP-REQ-029, DGP-REQ-030 | `src/core/definitions/pictograph.ts`:pictograph (`unitValue` and `values` ranges) | `@spec …, DGP-REQ-029, DGP-REQ-030, …` |
| DGP-REQ-031 | `src/core/definitions/pictograph.ts`:unitImage; `src/core/validate/structure.ts`:checkValue | `@spec DGP-REQ-024, DGP-REQ-031, DGP-REQ-035` / `@spec …, DGP-REQ-031` |
| DGP-REQ-032 | `src/core/definitions/pictograph.ts`:pictograph; `src/layout/pictograph.ts`:pictographLayout | `@spec …, DGP-REQ-032` |
| DGP-REQ-035 | `src/core/definitions/pictograph.ts`:unitImage (published here, carried DGP TICKET-004 CR-002) | `@spec DGP-REQ-024, DGP-REQ-031, DGP-REQ-035` |
| DGP-REQ-037 | `src/layout/pictograph.ts`:pictographLayout | `@spec …, DGP-REQ-037` |
| DGP-NFR-002 | `src/layout/pictograph.ts`:partialPicture; verified by `tests/layout/pictograph.test.ts` | `@spec DGP-REQ-028, DGP-NFR-002` |

## Notes

- **Product Owner decisions pending:**
  - **The picture cap (DGP OQ-004):** 1,000 is provisional (DEL-001).
  - **The image set (EXT-001):** sign-off is still needed.
  - **The caller-text length bound (GSS SEC-002, DGP TICKET-001 SEC-002):** this still covers category names.
- **Category names (carried DGP TICKET-001 SEC-002), measured:** names are never cut, so a single 50,000-character name produces 3,335 text nodes and 753 KB of markup. It renders, and `tests/react/Graph.test.tsx` records it; it is unbounded until the Product Owner's length bound.
- **Bounded text:** the title (3 lines) and the key (2 lines) stay bounded. Half a megabyte of label and title text draws in `<Graph>` and `<Pictograph>` with at most 7 text nodes.
- **For CPSE TICKET-005 (source export):** a pictograph's Scene carries the image nodes inside nested `<svg>` elements. Export must print `IMAGE_LICENSE_NOTICES` for the embedded image (Known Hazard on that ticket).
- **For DGP TICKET-006:** `imageCount` and `MIN_PARTIAL` are exported for the accuracy suite.
- **Tooling:** the PreToolUse hook again warned "no delivery is In Progress" while this record was In Progress (the known first-4,000-characters limitation).

## Post-Review Amendments

None
