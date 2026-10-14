# TICKET-005: Pictograph — Code Review

## Summary

I reviewed the delivery of `graph-library/data-graphs-and-pictographs/TICKET-005` (delivery commit `b877264`, branch `ticket/dgp-005`). I checked it against:
- the ticket, its eleven acceptance criteria and its Known Hazards (carried from GSV, GSS, DGP TICKET-001 and DGP TICKET-004 reviews);
- the Data Graphs & Pictographs specification (DGP-REQ-004, DGP-REQ-023..032, DGP-REQ-035, DGP-REQ-037, DGP-NFR-002, the Pictograph Units rules, the Edge Cases, and the fourteen `## @spec Coverage` rows this delivery added);
- `constraints/prd.md` and `technical-design/system-design.md` (AD-001..AD-008, AD-012, AD-014);
- the circle (GSS TICKET-002) as the pattern.

What holds:
- The pictograph is complete end to end: definition, layout, component, `./pictograph` entry (17.17 kB of 25 kB) and examples.
- Every requirement the ticket covers is implemented and annotated.
- The carried definition-contract rules are followed: `defineProperties`, `describe(normalized, provenance)`, `stateMeasurement`, `titleBlock`, `maxItems`, value bounds, an arithmetic picture cap and the side-effect-free factory.
- The image names now reach the validator, both schemas and the vocabulary from one enum (DGP-REQ-035).
- Every Verification Run command reproduces with exit 0. `pnpm generate` leaves no tracked change.

Extra checks beyond the record's commands: scratch probes of `validate`, `createGraph`, `<Pictograph>` and `<Graph>` against the real source, run outside the repository.

There are four Issues:
- **CR-001.** Near the 1,000-picture cap, the partial picture is drawn 0 wide, and DGP-NFR-002's 2% bound is exceeded. This starts from 455 pictures in a row and 407 in a column. The property test only goes up to 40 whole pictures, so it never reaches these sizes.
- **CR-002.** The one-value-per-category check names both whole lists as inputs. A failing value or category name therefore hides an independent length mismatch. DGP TICKET-001 CR-002 found the same defect.
- **CR-003.** A whitespace-only `valueUnitLabel` makes the key say "units", while the text alternative states no unit at all.
- **CR-004.** The published `valueUnitLabel` description says the key reads "each ★ = 2 students". It also does not say that a long label is cut.

There are four Observations:
- **CR-005.** The category-name measurement covers 50 KB, not the half megabyte the hazard asks for.
- **CR-006.** The noise-tolerant count drops a remainder below a billionth of the count, which nothing records.
- **CR-007.** The CPSE `@spec Coverage` rows for the new entry and component are missing, and DGP-REQ-035 now has two rows.
- **CR-008.** DEL-004 and DEL-005 depart from the wording of AD-004 and AD-008. Neither departure is queued for the technical design.

**Reviewer:** `code-reviewer` agent, fresh context (findings phase only, 2026-10-14)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/data-graphs-and-pictographs-ticket-005-delivery.md`
**Files Reviewed:**
- `src/core/definitions/pictograph.ts`
- `src/core/definitions/index.ts`
- `src/core/definitions/types.ts` (`EnumValue.unknownCode`)
- `src/core/validate/structure.ts` (`checkValue`, `enum` branch)
- `src/core/issues.ts` (`unknown_image`, `too_large`)
- `src/layout/pictograph.ts`
- `src/layout/registry.ts`
- `src/react/graphs/PictographGraph.tsx`
- `src/entries/pictograph.ts`, `src/index.ts`
- `package.json`, `tsup.config.ts`, `.size-limit.json`
- `examples/pictograph.json`, `examples/invalid/pictograph-unknown-image.json`, `examples/invalid/pictograph-zero-unit.json`
- `src/generated/description.ts`, `src/generated/schema.json`, `src/generated/tool-schema.json`, `src/generated/vocabulary.json` (pictograph branch)
- `tests/core/pictograph.test.ts`, `tests/layout/pictograph.test.ts`
- `tests/react/Graph.test.tsx`, `tests/package/per-type-bundle.test.ts` (the pictograph cases)
- `.gener8v/specifications/data-graphs-and-pictographs.md` (`## @spec Coverage`)
- Read for context, unchanged here:
  - `src/core/definitions/categories.ts`, `src/core/definitions/shared.ts`, `src/core/definitions/circle.ts`
  - `src/core/value-scale.ts` (`intervalsIn`), `src/core/format.ts`
  - `src/core/validate/domain.ts`, `src/core/validate/state.ts`
  - `src/layout/kit/value-scale.ts`, `src/layout/kit/format.ts`, `src/images/index.ts`
  - `tests/core/definitions.test.ts`, `tests/core/schema-agreement.test.ts`, `tests/package/entries.test.ts`, `tests/fixtures/generated/description.ts`
  - `.gener8v/specifications/component-packaging-and-source-export.md`
  - the circle's delivery record and code review, the DGP TICKET-001 and TICKET-004 code reviews, and DGP `TICKET-006.md`

**Findings:** 8
**Critical:** 0 | **Issues:** 4 | **Observations:** 4

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| `type: "pictograph"` with `categories`, `values`, `unitImage`, `unitValue`, optional `valueUnitLabel` and `orientation` validates and renders | Yes | **Code:** `definePictograph` (`src/core/definitions/pictograph.ts:66-161`), registered at `src/core/definitions/index.ts:22`. `pictographLayout` (`src/layout/pictograph.ts:127-209`), registered at `src/layout/registry.ts:33`. **Tests:** `tests/core/pictograph.test.ts:32-42` covers every term. `tests/layout/pictograph.test.ts:193-201` runs `createGraph` on the example. `tests/react/Graph.test.tsx:71-80` draws the example identically through `Graph` and `Pictograph` |
| Each category draws ⌊value ÷ unitValue⌋ whole images; a remainder draws one more image cropped to the remaining fraction with a nested `<svg>` whose width is that fraction; a remainder below 1% is still drawn; a zero value draws no images and keeps the row and name | Partial | **Code:** `imageCount` (`src/core/definitions/pictograph.ts:40-46`), `categoryPictures` (`src/layout/pictograph.ts:83-103`), and `partialPicture` (`:58-80`), which applies a 1% floor (`MIN_PARTIAL`). **Tests:** `tests/layout/pictograph.test.ts:46-75` and `tests/core/pictograph.test.ts:152-166`. A column's partial is cropped by height (DEL-005). **Gap:** from 455 pictures in a row, or 407 in a column, the floored remainder rounds to 0 and is not drawn (CR-001). A remainder below 1e-9 of the count is treated as decimal noise (CR-006) |
| All images have the same size and spacing, so equal values produce equal-length rows (DGP-REQ-037) | Yes | One `step` and one `size` per Scene, rounded once to the 0.01 grid (`src/layout/pictograph.ts:106`, `:143-144`, `:163-164`). `tests/layout/pictograph.test.ts:91-112` |
| `orientation` accepts `horizontal` (default, rows) and `vertical` (columns) | Yes | `orientation` enum (`src/core/definitions/pictograph.ts:102-112`). `upright = p.orientation === "vertical"` (`src/layout/pictograph.ts:129`). Tests: `tests/layout/pictograph.test.ts:116-138`, `tests/core/pictograph.test.ts:44-48` |
| The key reads "each <image name> = <unitValue> <valueUnitLabel>", using "units" when no label is given | Yes | `keyText` (`src/layout/pictograph.ts:31-34`) puts the image name and the supplied `unitValue` (`formatSupplied`) in the key. The key is drawn at `:187-201` and wrapped to `KEY_MAX_LINES`. `tests/layout/pictograph.test.ts:142-161`. For a whitespace-only label the key and the text alternative disagree (CR-003). For the published wording, see CR-004 |
| `unitValue` ≤ 0 is reported (`out_of_range` at `/unitValue`); a negative value is reported at `/values/<i>`; an unknown `unitImage` is reported with `unknown_image`, listing every published name in `allowed`, and suggesting the published name for a case or spelling near-miss | Yes | **Code:** `unitValue` is `min: 0, exclusiveMin: true` (`src/core/definitions/pictograph.ts:93-101`). Each value is `min: 0` (`:79`). `unknownCode: "unknown_image"` (`:90`) is handled at `src/core/validate/structure.ts:127-142`, with `closestTerm`. The message is at `src/core/issues.ts:336-338`. **Tests:** `tests/core/pictograph.test.ts:67-115`, including "Apple", "STAR", "aple", "persons" and both invalid examples |
| A per-category color or a `valueScale` on a pictograph is reported as inapplicable | Yes | `categories` carries names only (`src/core/definitions/categories.ts:64`). `valueScale.appliesTo` is line and bar graphs (`:109`). `tests/core/pictograph.test.ts:119-125` |
| The text alternative names the type, title, unit image, unit value and label, and every category with its value | Yes | `describe` (`src/core/definitions/pictograph.ts:145-160`) uses `quoteText`, `stateMeasurement` and `sourceOf`, and treats a blank title as absent. The layout uses its own definition's `describe` (`src/layout/pictograph.ts:206`). A probe shows per-value provenance is `supplied`, so 7.125 and 0.0001234 are stated as written. Tests: `tests/core/pictograph.test.ts:168-193`, `tests/layout/pictograph.test.ts:193-201`. See CR-003 for a whitespace-only label |
| DGP-NFR-002: for generated non-whole-multiple values, the partial image's visible width is within 2% of the exact remaining fraction of one image width, verified by `tests/layout/pictograph.test.ts` | Partial | The property test (`tests/layout/pictograph.test.ts:164-190`; 400 runs, rows and columns) passed in `pnpm test`. Its generator stops at 40 whole pictures. Near the cap, rounding to 0.01 exceeds 2%: 2.27% for a row at 999 + 0.75, and 2.5% for a column at 963 + 0.925 (CR-001) |
| No element ids or `url(#…)` references in the Scene | Yes | Only nested `svg` nodes with `x`, `y`, `width`, `height`, `viewBox` and `preserveAspectRatio`. `checkScene` runs on every Scene `sceneOf` builds (`tests/layout/pictograph.test.ts:13-19`). The markup check is at `:77-82` |
| `src/entries/pictograph.ts` exports `Pictograph`; package.json `exports` has `./pictograph`; `.size-limit.json` has a pictograph entry within 25 kB; `examples/pictograph.json` (with a non-whole value) and at least two `examples/invalid/pictograph-*.json` exist | Yes | `src/entries/pictograph.ts`, `package.json` `./pictograph`, `tsup.config.ts:14`, and `.size-limit.json` (25 kB) are kept in step by `tests/package/entries.test.ts`. `pnpm size`: 17.17 kB. `pnpm publint` and `pnpm attw` pass. The example has 5 ÷ 2 and 3 ÷ 2 (`tests/core/pictograph.test.ts:59-64`). Both invalid examples are tested at `:112-115`. The schema-agreement test reads `examples/pictograph.json` |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| DGP-REQ-004 | Plain-text alternative naming type, title, unit label, every category and value | `src/core/definitions/pictograph.ts:describe`; `src/layout/pictograph.ts:pictographLayout` (`textAlternative`) | Yes (CR-003) |
| DGP-REQ-023 | One row or column per category, built from repeated unit images | `src/core/definitions/pictograph.ts:pictograph`; `src/layout/pictograph.ts:pictographLayout`, `picture`; `src/react/graphs/PictographGraph.tsx:Pictograph` | Yes |
| DGP-REQ-024 | Unit image by name from the published set | `src/core/definitions/pictograph.ts:pictograph` (`unitImage` enum from `getImageNames()`) | Yes |
| DGP-REQ-025 | Unit value: units per image | `src/core/definitions/pictograph.ts:pictograph` (`unitValue`) | Yes |
| DGP-REQ-026 | Images per category = value ÷ unit value | `src/core/definitions/pictograph.ts:imageCount`; `src/layout/pictograph.ts:categoryPictures`, `pictographLayout` | Yes |
| DGP-REQ-027 | Key "each [image name] = [unit value] [value-unit label]" | `src/layout/pictograph.ts:keyText`, `pictographLayout` (key group) | Yes (CR-004 on the published wording) |
| DGP-REQ-028 | Non-whole multiple as whole images plus one cropped partial image | `src/core/definitions/pictograph.ts:imageCount`; `src/layout/pictograph.ts:partialPicture` | Partial (CR-001) |
| DGP-REQ-029 | Report a unit value that is not positive | `src/core/definitions/pictograph.ts:pictograph` (`unitValue` `min: 0, exclusiveMin`) | Yes |
| DGP-REQ-030 | Report a negative pictograph value | `src/core/definitions/pictograph.ts:pictograph` (`values` items `min: 0`) | Yes |
| DGP-REQ-031 | Report an unknown image name and list the available names | `src/core/definitions/pictograph.ts:pictograph` (`unknownCode`); `src/core/validate/structure.ts:checkValue`; `src/core/issues.ts` (`unknown_image`) | Yes |
| DGP-REQ-032 | Horizontal rows (default) or vertical columns | `src/core/definitions/pictograph.ts:pictograph` (`orientation`); `src/layout/pictograph.ts:pictographLayout` | Yes |
| DGP-REQ-037 | Every image at the same size and spacing | `src/layout/pictograph.ts:pictographLayout` (`gridStep`, one `size`) | Yes |
| DGP-REQ-035 (carried DGP TICKET-004 CR-002) | Image names listed in the vocabulary and published schema | `src/core/definitions/pictograph.ts:pictograph` (`unitImage`); `src/generated/schema.json`, `tool-schema.json`, `vocabulary.json`; `tests/core/pictograph.test.ts:196-219` | Yes |
| DGP-NFR-002 | Partial image's visible width within 2% of the exact remaining fraction | `tests/layout/pictograph.test.ts` "DGP-NFR-002…" (fast-check, 400 runs), passed in `pnpm test` | Partial (CR-001: the target fails near the cap, outside the generator's range) |

*Every requirement in the ticket's Requirements Covered field is listed. DGP-REQ-035 is added here because a carried Known Hazard publishes it in this ticket.*

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/TC-003 (resolved by AD-008) | No ids; crop without clip paths | Yes | The partial picture is a nested `svg` viewport cropped by its `viewBox`. There is no `id`, `clip-path` or `href` (`tests/layout/pictograph.test.ts:77-82`), and `checkScene` passes on every Scene |
| prd/TC-007, CPSE-NFR-002 | Per-type, side-effect-free entry; pictograph within 25 kB including images | Yes | `./pictograph` is 17.17 kB. `definePictograph` is `@__NO_SIDE_EFFECTS__` (DEL-002). Three bundle tests are added: the pictograph keeps every image and no circle, the circle carries no pictograph, and a consumer's bundle of the built `dist/circle.js` carries no drawing |
| prd/TC-009 | Exported files embed the image nodes | Yes (for the Scene) | Each picture's `children` are the image's own Scene nodes (`src/layout/pictograph.ts:47`, `:79`). Export itself is CPSE TICKET-005. The record's Notes carry the `IMAGE_LICENSE_NOTICES` hazard |
| prd/TC-002 | Round every emitted number | Yes | Every coordinate, size and `viewBox` number goes through `fmt()`. Rounding without a floor is the cause of CR-001 |
| prd/TC-011 | The package breaks lines | Yes | The key is wrapped with `wrap(…, KEY_MAX_LINES)`. Category names are wrapped by the kit's `categorySlots`, never cut |
| prd/CC-001 | Bundled assets licensed for redistribution | Yes | `pnpm check:images`: 8 images, MIT and CC0-1.0 |
| prd/CC-002 | A text alternative for every graph | Yes | `describe` becomes `Scene.textAlternative`. CR-003 is an inconsistency in the text, not a missing alternative |
| prd/CC-003 | No data collection or network use | Yes | `pnpm check:dist`: 10 built files, no network APIs |
| prd/CC-004 | No trademarked imagery | N/A | No image is added. The set comes from DGP TICKET-004, and its sign-off (EXT-001) is still pending |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-001 | One package, per-type entry points | Yes | `./pictograph` appears in `exports`, `tsup` and `size-limit`. `pnpm attw` passes `./pictograph` for node16 ESM and bundler. `Pictograph` is also exported from `.` (`src/index.ts`) |
| AD-002 | Pure layout → plain-data Scene | Yes | `pictographLayout(normalized, provenance)` returns plain nodes, using the two-argument contract (GSS TICKET-002 DEL-001). It uses the `svg` node kind the design names "for clipping" |
| AD-003 | In-house definition as the single source | Yes | One `GraphTypeDefinition`. The `unitImage` enum is built from `getImageNames()` and `imageDescriptions()`, never hard-coded. The regenerated files are committed and fresh |
| AD-004 | Staged validator; every independent problem reported, no cascades | Partial | The picture cap is skipped when a value or `unitValue` failed, which is correct. The length check hides an independent mismatch (CR-002). An unknown image is reported in stage 2, not as the stage-4 check AD-004 lists (DEL-004; CR-008) |
| AD-005 | Kebab-case `type`, camel-case terms, JSON Pointer paths | Yes | `pictograph`, `unitImage`, `unitValue`, `valueUnitLabel`, `orientation`. The paths are `/unitValue` and `/values/1` |
| AD-006 | Published and strict tool schemas | Yes | Both list the eight names (`tests/core/pictograph.test.ts:207-210`). The provider-profile fixture tests pass with the enum |
| AD-007 | 400-unit space; `fmt()` for every number | Yes | All numbers go through `fmt()`. The partial's extent is rounded after the 1% floor, which is what makes it vanish in dense rows (CR-001) |
| AD-008 | No ids; partial image as a nested `<svg>` "whose width is the remaining fraction" | Yes | Rows crop by width. Columns crop by height with a bottom-anchored `viewBox` (DEL-005), which the design's wording does not cover (CR-008) |
| AD-012 | In-house inline drawings bundled with the pictograph | Yes | `images[p.unitImage].nodes` are placed as each picture's children. All eight images are in the pictograph bundle (bundle test) |
| AD-014 | Pure components; fallback receives the issues | Yes | `createGraphComponent("pictograph", …)`. Half a megabyte of title and label text renders without throwing in `<Graph>` and `<Pictograph>` (`tests/react/Graph.test.tsx:328-345`) |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| DGP-REQ-004 | `@spec DGP-REQ-004` | `src/core/definitions/pictograph.ts:pictograph` (line 57), `describe` (line 144) | Yes |
| DGP-REQ-023 | `@spec DGP-REQ-023` | `src/core/definitions/pictograph.ts:pictograph` (57); `src/layout/pictograph.ts:pictographLayout` (126); `src/react/graphs/PictographGraph.tsx:Pictograph` (12) | Yes |
| DGP-REQ-024 | `@spec DGP-REQ-024` | `src/core/definitions/pictograph.ts:pictograph` (57), `unitImage` (81) | Yes |
| DGP-REQ-025 | `@spec DGP-REQ-025` | `src/core/definitions/pictograph.ts:pictograph` (57) | Yes |
| DGP-REQ-026 | `@spec DGP-REQ-026` | `src/core/definitions/pictograph.ts:imageCount` (39), `pictograph` (57), length check (120); `src/layout/pictograph.ts:pictographLayout` (126) | Yes |
| DGP-REQ-027 | `@spec DGP-REQ-027` | `src/core/definitions/pictograph.ts:describe` (144); `src/layout/pictograph.ts:keyText` (30), `pictographLayout` (126) | Yes |
| DGP-REQ-028 | `@spec DGP-REQ-028` | `src/core/definitions/pictograph.ts:imageCount` (39); `src/layout/pictograph.ts:partialPicture` (57), `pictographLayout` (126) | Yes |
| DGP-REQ-029 | `@spec DGP-REQ-029` | `src/core/definitions/pictograph.ts:pictograph` (57) | Yes |
| DGP-REQ-030 | `@spec DGP-REQ-030` | `src/core/definitions/pictograph.ts:pictograph` (57) | Yes |
| DGP-REQ-031 | `@spec DGP-REQ-031` | `src/core/definitions/pictograph.ts:unitImage` (81); `src/core/validate/structure.ts:checkValue` (87) | Yes |
| DGP-REQ-032 | `@spec DGP-REQ-032` | `src/core/definitions/pictograph.ts:pictograph` (57); `src/layout/pictograph.ts:pictographLayout` (126) | Yes |
| DGP-REQ-035 | `@spec DGP-REQ-035` | `src/core/definitions/pictograph.ts:unitImage` (81) | Yes |
| DGP-REQ-037 | `@spec DGP-REQ-037` | `src/layout/pictograph.ts:pictographLayout` (126) | Yes |
| DGP-NFR-002 | `@spec DGP-NFR-002` | `src/layout/pictograph.ts:partialPicture` (57) | Yes |

**Coverage:** 12 of 12 covered requirements annotated, plus DGP-REQ-035 and DGP-NFR-002. Each annotation sits on the line above its declaration or property.
**Missing:** None
**Specification table:** Partly. `## @spec Coverage` in `.gener8v/specifications/data-graphs-and-pictographs.md` lists every DGP location above, but DGP-REQ-035 now has two rows (`:162`, `:175`). The `@spec CPSE-REQ-004` (`src/entries/pictograph.ts`) and `@spec CPSE-REQ-007` (`src/react/graphs/PictographGraph.tsx:Pictograph`) annotations have no rows in `.gener8v/specifications/component-packaging-and-source-export.md`, whereas the circle's do (CR-007).

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm generate` | 0 | Yes. Afterwards `git status --short` shows no tracked change; only `.gener8v/runs.jsonl` was already modified. `tests/fixtures/generated/description.ts` is rewritten unchanged, which is why it is not in the commit |
| `pnpm lint` | 0 | Yes |
| `pnpm typecheck` | 0 | Yes |
| `pnpm test` | 0 | Yes (35 files, 943 tests) |
| `pnpm bench` | 0 | Yes (GSV-NFR-001 pictograph p95 0.0276 ms against a 5 ms limit; the record has 0.0266 ms) |
| `pnpm build` | 0 | Yes (`dist/pictograph.js`, `dist/pictograph.d.ts`) |
| `pnpm check:dist` | 0 | Yes (10 built files, no network APIs or modules) |
| `pnpm check:deps` | 0 | Yes (0 runtime dependencies) |
| `pnpm check:images` | 0 | Yes (8 images, every license recorded and allowed) |
| `pnpm size` | 0 | Yes (`./pictograph` 17.17 kB of 25 kB; `./core` 15.22 kB; `./circle` 15.62 kB; `.` 19.16 kB of 120 kB) |
| `pnpm publint` | 0 | Yes (All good) |
| `pnpm attw` | 0 | Yes (`./pictograph`: node16 ESM and bundler pass) |
| `pnpm audit` | 0 | Yes (no known vulnerabilities) |
| `gener8v-state.py lint` | 0 | Yes (0 errors, 0 warnings) |
| Mutation checks; visual check | not re-run | These are record evidence only, not commands. The scratch probes cited in the findings stand in for behaviour |

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable (flagged for the Product Owner) | It answers DGP TICKET-004 SEC-003 as the ticket's hazard directs: an arithmetic Σ ⌈value ÷ unitValue⌉ before anything is drawn. 1e9 ÷ 1e-300 is reported at once, and the limit is in the definition's description. Because the cap is a total, one row may hold up to 1,000 pictures, which is where CR-001 appears. The spec's Edge Case ("hundreds of images … should draw them") still stands beside it: five values of 300 pictures are now rejected. The Product Owner's OQ-004 decision should amend that row |
| DEL-002 | Reasonable | The decision the hazard asks for, chosen with the user. The factory keeps `./circle` free of the drawings, and a consumer-bundle test of the built entry proves it. `./core` and `.` grow by 2.8 kB, as measured. The core → image set → layout kit dependency is already queued as design drift (DGP TICKET-004 CR-004) |
| DEL-003 | Reasonable | The ticket names `Pictograph`. Note for CPSE TICKET-005: AD-013's default exported component name is the type plus `Graph` (`PictographGraph`), so exported source and the package component will be named differently |
| DEL-004 | Reasonable | One enum feeds the validator, both schemas and the vocabulary. Stage 2 is where schema agreement (GSV-NFR-003) wants the check. A non-text value is still `wrong_kind`. This departs from AD-004's stage list without saying so (CR-008) |
| DEL-005 | Reasonable | Nested viewports with a `viewBox` crop and one rounded step give exactly equal spacing with no ids. The 1% floor is applied before `fmt()`, so it can round away (CR-001). Cropping columns by height departs from AD-008's wording (CR-008) |

*Deviations from the plan:*
- *`too_large` unit `images` with its own message:* sound. The message names the fix ("use a larger unitValue or smaller values").
- *The side-effect-free factory:* added after measuring, as recorded in DEL-002.
- *The key centred as one picture-and-text group:* layout only. It is still wrapped and capped.
- *Large-text tests in `tests/react/Graph.test.tsx`:* the right home. The category-name case measures 50 KB rather than half a megabyte (CR-005).
- *Bundle tests:* they strengthen AD-001's evidence.
- *Files Produced lists `tests/fixtures/generated/description.ts` as regenerated:* the generator rewrites it unchanged. This is harmless.

*None of these affects traceability.*

## Findings

### CR-001: Near the 1,000-picture cap, the partial picture is drawn 0 wide and DGP-NFR-002 is exceeded

**Severity:** Issue
**Location:** `src/layout/pictograph.ts:58-61` (`partialPicture`: `extent = fmt(size * shown)`), `:106` (`gridStep`), `:143-144` and `:163-164` (step and size); `tests/layout/pictograph.test.ts:168` (the property test's `whole` range, 0–40)
**Traces To:** Acceptance criterion 2 ("a remainder below 1% is still drawn"); acceptance criterion 9 / DGP-NFR-002; DGP-REQ-028; DGP Pictograph Units ("still draw the partial image rather than drop it, so that no value is silently understated"); AD-007
**Description:** All pictures in a Scene shrink together so the longest row fits: 268 units across for rows, and 240 units up for columns. The partial picture's extent is `fmt(size × max(fraction, MIN_PARTIAL))`, rounded to 0.01 with no floor after rounding.

Below a picture size of 0.5 units, a 1% extent rounds to 0. The partial picture is then written with `width="0"` (rows) or `height="0"` (columns), which SVG does not render. Below 0.25 units, one 0.01 rounding step is already more than 2% of a picture.

Every such description is valid under DEL-001's cap. Probed through `createGraph` with `unitValue: 1` and one category:
- **Remainder vanishes:** with a 0.5% remainder, the partial is drawn 0 wide from 455 pictures in a row (a picture of 0.49 units) and from 407 in a column. At 999 whole pictures (size 0.22 for rows, 0.2 for columns), any remainder under about 2.3% (rows) or 2.5% (columns) vanishes.
- **NFR-002 exceeded:** `values: [999.75]` shows 0.727 of a picture, 2.27% off. A column at `963.925` is 2.5% off.
- **Drawing shrinks instead of cropping:** when the extent is rounded but the `viewBox` share is not, `meet` scaling shrinks the drawing instead of cropping it. For example, a 0.01-wide viewport shows a `0 0 6.77 100` `viewBox` at less than full scale.

The property test generates at most 40 whole pictures, so it never reaches this range. DGP TICKET-006 explicitly leaves DGP-NFR-002 to this ticket ("do not duplicate it here").
**Impact:** A long row can silently understate a value, which is exactly what the 1% floor exists to prevent. DGP-NFR-002 is not met over the whole valid domain. This is rare in classroom use, but it is within accepted input.
**Recommendation:**
1. Floor the drawn extent at one rounding step after `fmt()` (for example, `Math.max(0.01, fmt(size * shown))`). Compute the `viewBox` share from the drawn extent, so the crop stays at full scale.
2. Keep each picture at least 0.25 units, so 0.01 rounding stays within 2%. Columns can grow taller than `COLUMN_HEIGHT` when needed. For rows, choose with the user between two options:
   - lower the per-row count the cap allows;
   - record the resolution limit as a deviation for Product Owner sign-off, alongside DEL-001.
3. Extend the property test's `whole` range to the cap (0–999) in both orientations, and assert that the partial's extent is greater than 0.

**Status:** Resolved
**Resolution:** Resolved — the provisional cap is lowered to 400 pictures (`PICTOGRAPH_IMAGE_LIMIT`), so even one category's row or column keeps pictures at least 0.5 drawing units, where 0.01-unit rounding stays within 2%. A partial is never drawn under 0.01 units, and its `viewBox` share comes from the drawn width. The DGP-NFR-002 property test now generates up to the cap in rows and columns (600 runs), and checks the `viewBox` against the drawn width. Still flagged for the Product Owner under DGP OQ-004. Approved by the user, 2026-10-14.

---

### CR-002: The one-value-per-category check names both whole lists as inputs, so a failing value or category hides a length mismatch

**Severity:** Issue
**Location:** `src/core/definitions/pictograph.ts:117-125` (`inputs: ["categories", "values"]`); see `src/core/validate/state.ts:20-32` (`touchesFailed`) and `src/core/validate/domain.ts:24-30`
**Traces To:** AD-004 ("every independent problem is reported"); GSV-REQ-017; ticket Known Hazard (carried from graph-library/graph-specification-and-vocabulary-ticket-004-code-review/CR-003: "The check is skipped only when an earlier failure touches one of them"); precedent: graph-library/data-graphs-and-pictographs-ticket-001-code-review/CR-002 (`categoriesCheck`)
**Description:** The check reads only the two lists' lengths. But `touchesFailed("values", …)` is true for any failure at or below `/values`, and the same holds for `categories`. Probed through `validate` with two categories:
- `values: [7, -1, 3]` reports only `out_of_range /values/1`. The mismatch is not reported.
- `values: [7, "x", 3]` reports only `wrong_kind /values/1`.
- `values: [7, 4, 3]` with `categories: [{}, { name: "Dogs" }]` reports only `missing_property /categories/0/name`.

With every element valid, the mismatch is reported alongside other failures (`unitValue: 0`, a category color, a duplicate name), so the gap is specific to element failures. Stage 2 keeps a failed element's slot as `null`, and the list itself passes (`src/core/validate/structure.ts:176-180`). The lengths are therefore still right when this happens, and only `/values/<i>`, not `/values`, is marked failed.
**Impact:** A caller, or a model, fixes the reported issue and then meets a new one on the next pass. GSV-REQ-017 rules this out, and DGP TICKET-001 CR-002 fixed the same pattern for `categoriesCheck`. The line and bar graph tickets will likely copy this check.
**Recommendation:** Let the check run whenever both lists are present as lists, whatever their elements hold. For example, declare inputs that only a failure of the list itself touches. That may need a small `DomainCheck` addition, such as a length-only input, kept under `tests/core/definitions.test.ts`'s path check. Add a test that `values: [7, -1, 3]` for two categories reports both `out_of_range /values/1` and `series_length_mismatch /values`.
**Status:** Resolved
**Resolution:** Resolved — the length check has no inputs and reads only the two lists' lengths (a failed element stays `null`), guarding a missing or wholly failed list itself; `DomainCheck.inputs` may now be empty, documented in `types.ts`. Tests: `values: [7, -1, 3]` reports `out_of_range /values/1` and `series_length_mismatch /values`; a bad name and a mismatch are both reported. Approved by the user, 2026-10-14.

---

### CR-003: A whitespace-only `valueUnitLabel` makes the key say "units" while the text alternative states no unit

**Severity:** Issue
**Location:** `src/core/definitions/pictograph.ts:148` (`const unit = p.valueUnitLabel ?? UNITS`); compare `src/layout/pictograph.ts:31-34` (`keyText` cleans the label and falls back to "units")
**Traces To:** DGP-REQ-004; DGP-REQ-027; DGP Pictograph Units ("the plain word "units" when none is given"); acceptance criteria 5 and 8; ticket Known Hazard (carried from graph-library/geometric-shapes-and-solids-ticket-002-code-review/CR-001: treat text that is blank after cleaning as absent in `describe` too); prd/CC-002
**Description:** `emptyIsAbsent` drops only `""`, so `"   "` reaches both the layout and `describe`:
- `keyText` cleans the label to blank and draws "each apple = 2 units".
- `describe` passes the raw label to `stateMeasurement`, which cleans it to blank and states no unit.

Probed through `createGraph` with `valueUnitLabel: "   "`: the key reads "each apple = 2 units", and the text alternative reads "A pictograph. Each apple stands for 2. “Cats”: 7 and “Dogs”: 4.". The title already gets the blank-after-cleaning treatment (`:146-147`).
**Impact:** The drawing and its text alternative disagree, and the text alternative loses the unit the key shows. This is the same class of defect as the circle's CR-001.
**Recommendation:** In `describe`, clean the label and fall back to "units" when it is blank, as `keyText` does. One shared helper would keep the two in step. Add a test that a whitespace-only label gives "units" in both the key and the text alternative.
**Status:** Resolved
**Resolution:** Resolved — `unitLabelOf()` (`src/core/definitions/pictograph.ts`) cleans the label and falls back to "units" when it is missing or blank; `keyText` and `describe` both use it. Tests for a blank label in the text alternative and the key. Approved by the user, 2026-10-14.

---

### CR-004: The published `valueUnitLabel` description misstates the key and does not say a long label is cut

**Severity:** Issue
**Location:** `src/core/definitions/categories.ts:83-84`, published in `src/generated/schema.json`, `src/generated/tool-schema.json` and `src/generated/description.ts`; the cut is at `src/layout/pictograph.ts:26` (`KEY_MAX_LINES`) and `:191`
**Traces To:** DGP-REQ-027; ticket Known Hazards ("The key uses the image **name** ("each apple = …"), not its description"; carried from graph-library/geometric-shapes-and-solids-ticket-002-security-review/SEC-001: "Say so in the label-text descriptions, and keep the full text in the text alternative")
**Description:** This delivery is the first to publish the pictograph-only `valueUnitLabel`, since no pictograph was registered before. Its description has two problems:
- It says 'the key reads "each ★ = 2 students"'. The key actually reads "each apple = 2 students", using the image name.
- It does not say that the key cuts a label longer than two lines with "…" while the text alternative states it whole.

The title's description (`src/core/definitions/shared.ts:37`) and the circle's label texts (`src/core/definitions/circle.ts:72`) both state their cut.
**Impact:** A caller or model reading the schema learns the wrong key form and is not told the label can be cut.
**Recommendation:** Reword the description. For example: 'What one unit of value counts, as plain text, such as "students"; the key reads "each apple = 2 students". Left out or empty, the key says "units". In the drawing, a label longer than two lines is cut short with “…”; the text alternative states it whole.' Then run `pnpm generate` and commit the regenerated files.
**Status:** Resolved
**Resolution:** Resolved — the `valueUnitLabel` description now says the key names the picture ("each apple = 2 students"), that a missing, empty or blank label reads "units", and that a key longer than two lines is cut with “…” while the text alternative states it whole; `pnpm generate` rerun. Approved by the user, 2026-10-14.

---

### CR-005: The category-name measurement covers a tenth of the half megabyte the Known Hazard asks for

**Severity:** Observation
**Location:** `tests/react/Graph.test.tsx:347-357`; delivery record `## Notes` ("Category names … measured")
**Traces To:** ticket Known Hazard (carried from graph-library/data-graphs-and-pictographs-ticket-001-security-review/SEC-002: "include category names in the half-megabyte large-text test, record the node count and markup size it produces"); the pending caller-text length bound (GSS TICKET-002 SEC-002)
**Description:** The half-megabyte test (`:328`) keeps the category names short. Long names are tested separately with a 50,000-character name (3,335 text nodes, 753 KB), and the record's Notes quote those figures.

A scratch render of the half-megabyte case in `<Pictograph>` and `<Graph>` gives:
- 100,000 words: 33,335 text nodes and 7.5 MB of markup;
- a single 500,000-character word: 50,001 text nodes and 10.6 MB.

Both render without the fallback or an exception, in about half a second each.
**Impact:** The Product Owner's length-bound decision would rest on figures ten times too small. The behaviour itself is correct (names are never cut), and nothing claims a bound.
**Recommendation:** Use a half-megabyte category name in the test, or add one, and assert that it renders without the fallback. Record the measured node count and markup size in the delivery record's Notes for the pending decision.
**Status:** Resolved
**Resolution:** Resolved — the long-name test now uses a half-megabyte name (499,999 characters), asserting more than 30,000 text nodes and under 10 MB. Measured and recorded: 33,335 text nodes, 7,547,299 bytes of markup, rendered in about 0.9 s. Approved by the user, 2026-10-14.

---

### CR-006: The noise-tolerant count drops a real remainder below a billionth of the picture count

**Severity:** Observation
**Location:** `src/core/definitions/pictograph.ts:40-46` (`imageCount`), through `src/core/value-scale.ts:66` (`isWhole`, with a relative tolerance of `1e-9 × max(1, ratio)`) and `:81-86` (`intervalsIn`)
**Traces To:** DGP Pictograph Units (both rules: "only whole images" for a whole multiple, and a tiny remainder "still drawn … so that no value is silently understated"); acceptance criterion 2; DEL-005
**Description:** The tolerance that makes 0.3 ÷ 0.1 exactly 3 also treats any remainder up to 1e-9 × (value ÷ unitValue) of a picture as noise. Probed: `values: [2.000000001], unitValue: 2` draws one picture and no partial, and `999.0000005 ÷ 1` draws 999. DEL-005 and the tests state the floor as "a remainder below 1% is still drawn", without the threshold.
**Impact:** None in classroom use: such values sit at the edge of double precision anyway. The documented rule and the code differ only at that edge, but nothing records where the edge is.
**Recommendation:** Record the threshold in DEL-005. If the user wants it in the contract, add it as a note on the Pictograph Units rule at the next Specification amendment. No code change.
**Status:** Resolved
**Resolution:** Resolved (record only) — DEL-005's threshold is recorded under Post-Review Amendments: a remainder smaller than about a billionth of the picture count (`intervalsIn`'s relative tolerance) is treated as rounding noise and draws no partial picture. No code change. Approved by the user, 2026-10-14.

---

### CR-007: `## @spec Coverage`: the CPSE rows for the pictograph entry and component are missing, and DGP-REQ-035 has two rows

**Severity:** Observation
**Location:** `.gener8v/specifications/component-packaging-and-source-export.md` (`## @spec Coverage`); `.gener8v/specifications/data-graphs-and-pictographs.md:162`, `:175`
**Traces To:** CLAUDE.md, Traceability ("`grep -rn "@spec"` audits coverage"); Code Review step 8 (the specification table lists the annotated locations); precedent: GSS TICKET-002 added the CPSE rows for `src/entries/circle.ts` (CPSE-REQ-004) and `CircleGraph` (CPSE-REQ-007)
**Description:**
- **CPSE table:** `src/entries/pictograph.ts:3` carries `@spec CPSE-REQ-004`, and `src/react/graphs/PictographGraph.tsx:12` carries `@spec DGP-REQ-023, CPSE-REQ-007`. The CPSE table lists the circle's entry and component, but not these two.
- **DGP table, duplicate row:** the new DGP-REQ-035 row (`:175`) sits beside the older one (`:162`), which still says "published … by DGP TICKET-005's pictograph definition".
- **DGP table, order:** the fourteen new rows follow DGP-NFR-005 instead of their requirement order.

**Impact:** The specification tables no longer list every annotated location, and a reader looking up DGP-REQ-035 finds two rows.
**Recommendation:** Add the two CPSE rows, as the circle did. Merge the DGP-REQ-035 rows into one that lists `src/images/index.ts`:getImageNames, imageDescriptions and `src/core/definitions/pictograph.ts`:unitImage. Optionally, sort the new rows by requirement.
**Status:** Resolved
**Resolution:** Resolved — the CPSE specification's `@spec Coverage` table gains `src/entries/pictograph.ts` (CPSE-REQ-004) and `src/react/graphs/PictographGraph.tsx`:Pictograph (CPSE-REQ-007); the two DGP-REQ-035 rows are merged into one. Approved by the user, 2026-10-14.

---

### CR-008: DEL-004 and DEL-005 depart from AD-004's and AD-008's wording, and neither is queued for the technical design

**Severity:** Observation
**Location:** `.gener8v/technical-design/system-design.md:64-68` (AD-004: stage 4 lists "unknown image"), `:117` (AD-008: "a nested `<svg>` whose width is the remaining fraction"); delivery record DEL-004, DEL-005
**Traces To:** AD-004, AD-008; precedent: graph-library/geometric-shapes-and-solids-ticket-002-code-review/CR-003 and graph-library/data-graphs-and-pictographs-ticket-004-code-review/CR-004 (design drift queued for the next Technical Design pass)
**Description:**
- **DEL-004:** an unpublished image is reported in stage 2 (structure), as an enum value with `unknownCode`, rather than as the stage-4 domain check AD-004 lists. This is the better place, because it keeps the validator in agreement with the schema's enum (GSV-NFR-003).
- **DEL-005:** a column's partial picture is cropped by height, which AD-008's wording ("width") does not cover.

Neither decision names the AD it departs from. So neither joins the queued `system-design.md` amendments, where DGP TICKET-004's drift (the Definitions and Image set "Dependencies: none") already waits.
**Impact:** The design text describes a different validation stage and a width-only crop, and the next Technical Design pass may miss both.
**Recommendation:** Name AD-004 and AD-008 in the Ticket Impact of DEL-004 and DEL-005, and add both to the queued `system-design.md` amendments. No code change.
**Status:** Resolved
**Resolution:** Resolved (record only) — under Post-Review Amendments, DEL-004 names AD-004 (an unpublished image is reported in stage 2, not stage 4) and DEL-005 names AD-008 (columns crop by height, rows by width). Both are added to the queued `system-design.md` amendments for the next Technical Design pass. Approved by the user, 2026-10-14.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Approve (cap 400) | Cap lowered; partial never under 0.01, viewBox from drawn width; property test to the cap | `src/core/definitions/pictograph.ts`, `src/layout/pictograph.ts`, `tests/layout/pictograph.test.ts`, `tests/core/pictograph.test.ts` |
| CR-002 | Approve | Length check reads lengths only; empty inputs allowed | `src/core/definitions/pictograph.ts`, `src/core/definitions/types.ts`, `tests/core/pictograph.test.ts` |
| CR-003 | Approve | Shared `unitLabelOf()` | `src/core/definitions/pictograph.ts`, `src/layout/pictograph.ts`, both test files |
| CR-004 | Approve | `valueUnitLabel` description; regenerated | `src/core/definitions/categories.ts`, `src/generated/*` |
| CR-005 | Approve | Half-megabyte name test; figures recorded | `tests/react/Graph.test.tsx`, delivery record |
| CR-006 | Record | Threshold recorded in DEL-005's amendment | delivery record |
| CR-007 | Approve | CPSE coverage rows; DGP-REQ-035 rows merged | CPSE and DGP specifications |
| CR-008 | Record | AD-004 and AD-008 named; design amendments queued | delivery record |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (all 8 Resolved)
**Notes:** Every acceptance criterion is met after CR-001, and every requirement is covered and annotated. Re-verification: `pnpm generate`, `lint`, `typecheck`, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size`, `publint`, `attw`, `audit` and `gener8v-state lint` exit 0; `pnpm test` (945 tests) exits 0 on three runs. Deliberate breaks of CR-001, CR-002 and CR-003 each fail their tests. The 400-picture cap remains provisional, for the Product Owner under DGP OQ-004.
