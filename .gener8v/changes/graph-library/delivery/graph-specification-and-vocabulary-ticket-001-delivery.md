# TICKET-001: Definition format, shared presentation properties and default style — Delivery Record

## Ticket Reference

**Ticket:** graph-library/graph-specification-and-vocabulary/TICKET-001
**Change:** `.gener8v/changes/graph-library/change.md`, Approved when delivery started
**Specification:** `.gener8v/specifications/graph-specification-and-vocabulary.md`
**Requirements Covered:**
- GSV-REQ-003: Exactly the eleven supported graph types (declared as the `GraphType` union; completed by TICKET-006)
- GSV-REQ-012: Fixed vocabulary; every property name is a vocabulary term
- GSV-REQ-040: Line color, line label, axis labels, title and point labels where they apply
- GSV-REQ-042: Colors as published named colors or hexadecimal codes
- GSV-REQ-043: Labels and titles as plain text, never markup
- GSV-REQ-044: One published default style applied when options are omitted
- GSV-REQ-045: A presentation option applies only to the element it names
- GSV-NFR-004: Every default-style color has at least 3:1 contrast against the default background, verified by an automated contrast check in CI (`tests/core/style.test.ts`)

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Cross-area predecessor CPSE TICKET-001 delivered (DEP-001) | delivery record, Delivered | `component-packaging-and-source-export-ticket-001-delivery.md`: Delivered, verification passed, reviews resolved | ✅ |
| `package.json`, `tsconfig.json`, `eslint.config.js`, `src/core/index.ts` (Prior Art) | present | present. `src/core/index.ts` exports the issue contract since the GSV TICKET-002 review resolution (commit 9d957f7) | ✅ |
| Lint boundary: `src/core` may not import React or browser globals | rule in `eslint.config.js` | present for every script extension under `src/{core,tool,export,layout}` | ✅ |
| Output paths free (`src/core/definitions/*`, `src/core/style.ts`, `src/core/describe.ts`, both test files) | absent | absent | ✅ |
| Prior Art: specification Vocabulary, Presentation Options, Behaviors › Presentation | present | present, Approved | ✅ |
| Prior Art: design AD-003, AD-005, AD-010, AD-011, Data Model › GraphTypeDefinition and PropertySpec | present | present, Approved | ✅ |
| Prior Art: constraints prd/CC-001, prd/CC-002; dependency map RES-001, RES-004 | present | present, Approved | ✅ |
| `Issue` type for `DomainCheck` return values | defined by GSV TICKET-002 | `src/core/result.ts` (delivered; not a declared dependency but present) | ✅ |
| `NormalizedDescription` type for `describe` and `checks` | defined by GSV TICKET-004 | absent | ⚠️ Non-blocking. The definition is generic over the description type, and `describe` takes a minimal `{ type: GraphType }` shape that TICKET-004 narrows |
| PropertySpec bounds: ticket lists `min`/`max`/`exclusiveMin` | as listed | `Range` in `src/core/result.ts` also has `exclusiveMax` (GSV TICKET-002 DEL-002) | ⚠️ Resolved from ground truth. PropertySpec takes `exclusiveMax` too, so a spec's bounds map one-to-one onto an issue's `range` |
| PropertySpec kind `enum` | needs its allowed values | the ticket's field list has no field for them | ⚠️ Resolved in plan: an optional `values` list, required by the type when `kind` is `enum` |
| Carried findings from predecessor reviews | none deferred to this ticket | CPSE TICKET-001 and GSV TICKET-002 reviews defer nothing to GSV TICKET-001 | ✅ |

**Resolved from ground truth (not escalated):**
- GSV OQ-001 (property-name style) is settled by AD-005: camel case.
- GSV OQ-006 (named colors) is settled by the ticket's Notes, which give the list to use: black, gray, red, orange, green, blue, purple and brown. The hex values are chosen in the plan, and each is at least 3:1 on white.

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.` (branch `ticket/gsv-001`, cut from `ticket/gsv-002`)
**Plan approved by:** Engineer — Thomas, 2026-10-06

### Planned Files

- `src/core/definitions/types.ts`: the definition format (AD-003), kept small because the circle slice will adjust it once (RD-001).
  - `GRAPH_TYPES`, a frozen list of the 11 kebab-case values, from which the `GraphType` union is derived.
  - `PropertySpec`: `term`, `kind` (`number`, `integer`, `string`, `boolean`, `color`, `enum`, `object`, `array`), `description` and `required`; the bounds `min`, `max`, `exclusiveMin` and `exclusiveMax`; `items` for arrays, `properties` for objects and `values` for enums; and `presentation`, naming the shared option the property is, if any.
  - `GraphTypeDefinition`: `type`, `title`, `description`, `properties`, `derivations`, `checks` and `describe`.
  - `Derivation`: `members`, ordered by which value is preferred as the defining one, and `derive(term, value)`, which returns every member.
  - `DomainCheck`: a function from the description to its issues.
  - There is no markup or HTML kind, so labels can only ever be plain strings.
- `src/core/definitions/shared.ts`: `sharedProperties`, each defined once with the graph types it applies to.
  - `title` (string): all 11 types.
  - `lineColor` (color): number-line, circle, square, triangle, cube and cylinder.
  - `lineLabel` (string): number-line.
  - `xAxisLabel` and `yAxisLabel` (string): xy-graph and xyz-graph.
  - `zAxisLabel` (string): xyz-graph.
  - `categoryAxisLabel` and `valueAxisLabel` (string): line-graph and bar-graph.
  - `itemProperties` holds `label` and `color` for type tickets to nest inside points, segments and series. Because an option sits on the element itself, it affects nothing else (GSV-REQ-045).
- `src/core/definitions/index.ts`: the `definitions` registry, keyed by `GraphType` and empty until each type ticket adds one import and one entry. TICKET-006 tightens it to require all 11 types.
- `src/core/style.ts`: presentation-attribute values only (hex colors, numbers, dash strings and the font stack); no CSS or class names.
  - `defaultStyle`: background `#ffffff`, text `#1a1a1a`, lines `#222222`, grid `#8a8a8a` and point accent `#0072b2`; line widths, text sizes in the 400-unit drawing space, and the AD-010 system font stack.
  - `namedColors`: black `#000000`, gray `#595959`, red `#c62828`, orange `#b36b00`, green `#2e7d32`, blue `#0072b2`, purple `#6a1b9a` and brown `#795548`.
  - `seriesStyles`, six series from the Okabe–Ito palette, each with its own marker and dash. Yellow and sky blue are dropped and orange is darkened.
    1. `#0072b2`, circle, solid
    2. `#d55e00`, square, `8 4`
    3. `#009e73`, triangle, `2 4`
    4. `#cc79a7`, diamond, `8 4 2 4`
    5. `#b36b00`, cross, `12 4`
    6. `#000000`, star, `4 4`
  - `resolveColor(value)` turns a color name or a `#rgb`/`#rrggbb` code (any case) into lowercase `#rrggbb`. Anything else returns `undefined`, including alpha hex.
- `src/core/describe.ts`:
  - `describe(normalized)` dispatches to the type's `describe`, and throws when the type has no definition.
  - Helpers: `formatNumber` (at most 2 decimals, trailing zeros trimmed, `-0` shown as `0`), `formatList` ("a, b and c") and `formatMeasurement` (the value, then the unit).
- `src/core/index.ts`: exports `GRAPH_TYPES` and `GraphType`. `describe` stays internal until `validate` and `normalize` ship in GSV TICKET-004.
- `tests/core/definitions.test.ts`:
  - An exact snapshot of the 11 types.
  - Registry keys are graph types and match each definition's `type`.
  - The vocabulary check: every property key, nested ones included, equals its `term`, is camel case and has a description. It runs over the shared properties and every registered definition, and a bad fixture proves it catches each problem.
  - Shared properties apply only to real types, title and label properties are of kind `string`, and no unknown kind appears.
- `tests/core/style.test.ts`:
  - The WCAG contrast check (GSV-NFR-004): every default-style, named and series color is at least 3:1 against the background.
  - Every color is lowercase `#rrggbb`.
  - The series differ in color, marker and dash.
  - The style holds only presentation values (no `className`, `style` or `css` keys).
  - A list of values `resolveColor` must accept or reject.
- `tests/core/describe.test.ts` (an addition to the ticket's Output): dispatch through a fixture definition registered only in the test, and the helpers.

### How Acceptance Criteria Will Be Met

- `GraphType` union, the definition and PropertySpec fields, the registry, the shared properties and plain-text labels: typecheck and `tests/core/definitions.test.ts`.
- Default style, presentation attributes only, and 3:1 contrast (GSV-NFR-004): `tests/core/style.test.ts`, run in CI by `pnpm test`.
- `describe` dispatch and helpers: `tests/core/describe.test.ts`.
- No React or browser globals in `src/core`: `pnpm lint`.
- Full verification set: lint, typecheck, test, build, `check:dist`, size, publint, attw, `check:deps` and `check:changesets`.
- Decisions to record: DEL-001 (a term is declared by its PropertySpec), DEL-002 (where each presentation option applies), DEL-003 (named colors and palette adjustments), DEL-004 (alpha hex rejected) and DEL-005 (the registry is partial until TICKET-006).
- Flags for later tickets: `textAlternative` (NLC-REQ-013) goes to NLC TICKET-002, and treating an empty label as no label goes to normalization in TICKET-004.

## Progress

- [x] `src/core/definitions/types.ts`: written, annotated
- [x] `src/core/definitions/shared.ts`: written, annotated
- [x] `src/core/definitions/index.ts`: written, annotated
- [x] `src/core/style.ts`: written, annotated
- [x] `src/core/describe.ts`: written
- [x] `src/core/index.ts`: written
- [x] `tests/core/definitions.test.ts`: written
- [x] `tests/core/style.test.ts`: written
- [x] `tests/core/describe.test.ts`: written

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/core/definitions/types.ts`: `GRAPH_TYPES`/`GraphType`, `PROPERTY_KINDS`/`PropertyKind`, `PresentationOption`, `ValueSpec` (one variant per kind), `PropertySpec`, `PropertyMap`, `DescriptionBase`, `Derivation`, `DomainCheck`, `GraphTypeDefinition`
- `src/core/definitions/shared.ts`: `sharedProperties` (eight top-level presentation options, each with `appliesTo`), `itemProperties` (`label`, `color`), `SharedPropertySpec`, `SharedTerm`
- `src/core/definitions/index.ts`: `definitions`, a frozen registry, empty for now
- `src/core/style.ts`: `namedColors`, `resolveColor`, `defaultStyle`, `seriesStyles`, `MarkerShape`, `SeriesStyle`
- `src/core/describe.ts`: `describe`, `formatNumber`, `formatList`, `formatMeasurement`
- `src/core/index.ts`: now also exports `GRAPH_TYPES` and `GraphType`
- `tests/core/definitions.test.ts`: 10 tests (type snapshot, registry shape and typing, vocabulary check with a failing fixture, shared-property rules)
- `tests/core/style.test.ts`: 50 tests (a contrast check per color, presentation-attribute-only values, series distinctness, list of colors to accept or reject)
- `tests/core/describe.test.ts`: 12 tests (dispatch through a mocked registry, formatting helpers)

## Verification Run

Node.js v24.1.0, pnpm 10.28.2, branch `ticket/gsv-001`.

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm lint` | 0 | no findings; the `src/core` boundary rules apply to the new files |
| `pnpm typecheck` | 0 | no errors. This includes the registry-typing test, which first failed (`checks` was contravariant) and was fixed before this run |
| `pnpm test` | 0 | 8 files, 218 tests passed (`tests/core`: definitions 10, style 50, describe 12, issues 36) |
| `pnpm build` | 0 | all entries and declarations emitted |
| `pnpm check:dist` | 0 | no network APIs in built output |
| `pnpm size` | 0 | `./core` 1.24 kB of 25 kB, minified and gzipped |
| `pnpm publint` | 0 | "All good!" |
| `pnpm attw` | 0 | no problems in the ESM-only profile |
| `pnpm check:deps` | 0 | 0 runtime dependencies (prd/TC-008) |
| `pnpm check:changesets` | 0 | 0 changesets |

## Acceptance Criteria Verification

- [x] `GraphType` is a union of exactly the eleven values: `definitions.test.ts` "are exactly the eleven types of this change" (inline snapshot); `pnpm typecheck`
- [x] `GraphTypeDefinition` and `PropertySpec` carry the listed fields: `pnpm typecheck` over the `circleFixture` in `definitions.test.ts`, which uses every field. `PropertySpec` also carries `exclusiveMax` and, for enums, `values` (see the reconciliation table)
- [x] Property names are camel-cased vocabulary terms, and a unit test fails if any definition declares a property whose name is not its declared term: `definitions.test.ts` "every property name is its declared … term" over shared, item, fixture and registered definitions; "catches a name that is not its declared term, at any depth" proves the check fails on a mismatched key, spaces, Pascal case, snake case (nested), an empty description and an unknown item kind
- [x] `definitions` registry keyed by `GraphType`: `definitions.test.ts` "is keyed by graph type…" and "accepts a definition written for a type's own description shape" (a type-level assignment checked by `pnpm typecheck`)
- [x] Shared presentation properties defined once in `shared.ts`, each declaring its graph types: `definitions.test.ts` "each applies to at least one real graph type" and "covers title, line color, line label, axis labels and point labels"
- [x] Labels and titles are plain strings, with no markup kind: `definitions.test.ts` "accept labels and titles as plain strings … with no markup kind". The rendering assertion (`<b>x</b>` shown as literal text) belongs to the first renderer, as the ticket says
- [x] `style.ts` exports the default style, the named-color list and the series palette with markers and dashes: `style.test.ts` "default style values", "series styles", "publishes the plain-English color names"
- [x] Style is presentation-attribute values only: `style.test.ts` "holds only values for SVG presentation attributes" (every leaf is a string or number, and no key is `class`, `className`, `style`, `css` or `stylesheet`)
- [x] GSV-NFR-004, every default-style color at least 3:1 against the default background: `style.test.ts` "default style contrast", one test per color (default, named and series), with the WCAG formula checked against known values. It runs in CI through `pnpm test` (`.github/workflows/ci.yml` Test step)
- [x] `describe(normalized)` dispatches to the type's `describe`, with shared helpers: `describe.test.ts` (a fixture registered through `vi.mock`, plus tests for `formatNumber`, `formatList` and `formatMeasurement`)
- [x] No file under `src/core/` imports React or a browser global: `pnpm lint` exit 0

## Decisions Made

### DEL-001: A vocabulary term is declared by its PropertySpec

**Context:** The ticket requires a test that fails when "a definition declares a property whose name is not a declared term", but no vocabulary list exists before TICKET-005 generates it.
**Decision:** A property's spec declares its term: the map key must equal `spec.term`, be camel case, and carry a description, which is the term's plain-English definition. Array items are a `ValueSpec` (kind and description, no term), because an element has no property name.
**Rationale:** One source per term, as AD-003 requires. TICKET-005 builds the published vocabulary (GSV-REQ-013) by collecting terms from every spec. A separate term list would be a second source that could drift.
**Ticket Impact:** None to the Output. TICKET-005 and TICKET-006 should check that a term reused by several types (`radius`, `height`) has one definition; this ticket does not, because no types exist yet.

### DEL-002: Which presentation options exist and where they apply

**Context:** GSV-REQ-040 names line color, line label, axis labels, title and point labels "where they apply", without saying where.
**Decision:**
- `title`: all 11 types.
- `lineColor`: number-line, circle, square, triangle, cube and cylinder.
- `lineLabel`: number-line.
- `xAxisLabel` and `yAxisLabel`: xy-graph and xyz-graph.
- `zAxisLabel`: xyz-graph.
- `categoryAxisLabel` and `valueAxisLabel`: line-graph and bar-graph (DGP-REQ-002).
- Point, segment and series labels and colors are item properties (`label`, `color`) that type tickets nest in their item specs. A line graph's per-series `lineColor`/`lineLabel` (DGP-REQ-011) reuse the shared specs nested in the series item.
**Rationale:** This follows the per-type option lists in the NLC, DGP and GSS specifications. Putting element-level options on the element makes GSV-REQ-045 structural.
**Ticket Impact:** A type ticket that wants a shared option on another type must add the type to that option's `appliesTo` here, and record a DEL saying so.

### DEL-003: Named colors and series palette

**Context:** GSV OQ-006 left the named-color list open. AD-011 calls for Okabe–Ito, adjusted to 3:1.
**Decision:** The named colors are black `#000000`, gray `#595959`, red `#c62828`, orange `#b36b00`, green `#2e7d32`, blue `#0072b2`, purple `#6a1b9a` and brown `#795548`, all at least 4.2:1 on white. Six series:
- blue `#0072b2`: circle marker, solid line
- vermillion `#d55e00`: square marker, `8 4` dash
- bluish green `#009e73`: triangle marker, `2 4` dash
- reddish purple `#cc79a7` (3.06:1): diamond marker, `8 4 2 4` dash
- orange darkened to `#b36b00`: cross marker, `12 4` dash
- black: star marker, `4 4` dash

Okabe–Ito yellow (1.3:1) and sky blue (2.3:1) are dropped.
**Rationale:** The Known Hazard says to adjust or drop failing hues rather than relax the check. Black completes six distinct series. Reddish purple is the closest to the limit, so markers and dashes keep series apart without relying on color.
**Ticket Impact:** DGP TICKET-002 cycles `seriesStyles` for more than six series. The greyscale check (DGP-NFR-004) belongs to it.

### DEL-004: `resolveColor` accepts names in any case and `#rgb`/`#rrggbb` hex, and rejects alpha

**Context:** GSV-REQ-042 accepts named colors and hexadecimal codes.
**Decision:** Names are matched case-insensitively and with no surrounding whitespace allowed. Hex codes are `#rgb` or `#rrggbb` in any case, returned as lowercase `#rrggbb`. `#rgba`, `#rrggbbaa`, `rgb(…)` and lookups of inherited properties (`toString`) are rejected.
**Rationale:** Case-insensitivity helps human and model authors. Transparency would make the contrast of a drawn element unknowable.
**Ticket Impact:** The validator (TICKET-003) uses `resolveColor` for the `color` kind and reports `unknown_color` with `Object.keys(namedColors)` as `allowed`. A caller-chosen hex code with low contrast is accepted: the 3:1 guarantee covers the defaults and named colors only.

### DEL-005: The registry is partial until all types land

**Context:** The design types the registry as `Record<GraphType, GraphTypeDefinition>`, but no type exists yet.
**Decision:** `Readonly<Partial<Record<GraphType, GraphTypeDefinition>>>`, frozen. `describe` throws for a type with no definition.
**Rationale:** An honest type until TICKET-006 proves completeness. Type tickets add their definition by editing the literal.
**Ticket Impact:** TICKET-006 changes the type to the full `Record` once all eleven are registered.

### DEL-006: `DomainCheck` is declared with method syntax

**Context:** The registry-typing test failed typecheck: under `strictFunctionTypes` a `checks` function written for a circle's description could not be stored as a check of `DescriptionBase`.
**Decision:** `DomainCheck<D>` is defined through a method signature, so its parameter is bivariant, matching `describe`, which is also a method.
**Rationale:** The validator only calls a definition's checks with descriptions of that definition's type, so the bivariance cannot be exploited in practice.
**Ticket Impact:** None.

## Deviations from Plan

- `ALL_TYPES` was replaced by `GRAPH_TYPES`. While writing `shared.ts` I first duplicated the type list for `title.appliesTo`, then replaced it with `GRAPH_TYPES`, so there is one list. This has no impact.
- The plan did not list DEL-006 (`DomainCheck` method syntax). The registry-typing test found the problem and it was fixed during implementation.
- `tests/core/describe.test.ts` was added beyond the ticket's Output, as the plan said.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| GSV-REQ-003 | `src/core/definitions/types.ts`:GRAPH_TYPES; `src/core/definitions/index.ts`:definitions | `@spec GSV-REQ-003` |
| GSV-REQ-012 | `src/core/definitions/types.ts`:PropertySpec; `src/core/definitions/index.ts`:definitions | `@spec GSV-REQ-012` |
| GSV-REQ-040 | `src/core/definitions/types.ts`:PresentationOption; `src/core/definitions/shared.ts`:sharedProperties, itemProperties | `@spec GSV-REQ-040` |
| GSV-REQ-042 | `src/core/style.ts`:namedColors, resolveColor | `@spec GSV-REQ-042` |
| GSV-REQ-043 | `src/core/definitions/types.ts`:PropertySpec; `src/core/definitions/shared.ts`:sharedProperties, itemProperties | `@spec GSV-REQ-043` |
| GSV-REQ-044 | `src/core/style.ts`:defaultStyle, seriesStyles | `@spec GSV-REQ-044` |
| GSV-REQ-045 | `src/core/definitions/types.ts`:PresentationOption; `src/core/definitions/shared.ts`:itemProperties | `@spec GSV-REQ-045` |
| GSV-NFR-004 | `src/core/style.ts`:namedColors, defaultStyle, seriesStyles | `@spec GSV-NFR-004` |

`describe.ts` carries no annotation. It serves the text-alternative requirements of the rendering areas (NLC-REQ-012, DGP-REQ-004, GSS-REQ-036), which the type tickets annotate where they write each type's `describe`.

## Notes

- **Not here, by plan:**
  - A caller-supplied `textAlternative` (NLC-REQ-013; listed in the design's GraphDescription) is for NLC TICKET-002 to define. If other types also accept it, add it to `sharedProperties` with `appliesTo`.
  - Treating an empty label as no label (GSV Edge Cases) is normalization, in GSV TICKET-004.
- **For CPSE TICKET-002:** `formatNumber` here is the display rounding used in text alternatives. `displayValue` in `src/layout/kit/format.ts` should reuse it rather than define a second rounding for displayed numbers. AD-007's `fmt()` for drawing coordinates is a separate concern.
- **For the circle slice (GSS TICKET-002):** this is the one expected adjustment to `GraphTypeDefinition` (RD-001). The likely changes are a `units` concept for measurements (GSS-REQ-033) and the shape of `Derivation.derive`. After that slice, record any change to these types as a breaking DEL.
- `describe` is not exported from `./core` yet. GSV TICKET-004 exports it together with `validate` and `normalize`.
- The plugin's PreToolUse hook kept reporting "no delivery is In Progress" while this record said `**Status:** In Progress` and `pipeline-state.yaml` showed `in_progress`. It looks like a false warning from the hook; the work followed the approved plan.

## Post-Review Amendments

Resolution of `graph-library/graph-specification-and-vocabulary-ticket-001-code-review`, `-quality-review` and `-security-review`, 2026-10-06, decisions by the Product Owner. The reports overlapped, so the fixes are recorded once, by group.

- **graph-specification-and-vocabulary-ticket-001-code-review/CR-001, CR-002; graph-specification-and-vocabulary-ticket-001-quality-review/QR-002 (one source for where options apply):**
  - `sharedProperties` is now the single map of presentation options. Each option has `appliesTo` (top-level graph types) and `elementsOf` (graph types whose points, segments, series or categories carry it).
  - `itemProperties` is removed. `label` and `color` are entries of `sharedProperties`: `label` on number-line, xy-graph and xyz-graph elements; `color` on those plus bar-graph categories (DGP-REQ-019). Series of a line graph carry `lineColor` and `lineLabel` (DGP-REQ-011).
  - A definition never lists a shared top-level option. The new `propertiesOf(type)` (`src/core/definitions/index.ts`) merges the shared options into the type's own terms. Element options are nested as the same spec objects.
  - New tests check every definition: options listed at the top level, redefined, or nested where `elementsOf` does not allow, or the reverse.
  - **Correction to DEL-002:** it now reads through `appliesTo` and `elementsOf` as above. `PresentationOption` renames `itemLabel`/`itemColor` to `elementLabel`/`elementColor`.
  - Files: `src/core/definitions/shared.ts`, `src/core/definitions/index.ts`, `src/core/definitions/types.ts`, `tests/core/definitions.test.ts`.
- **graph-specification-and-vocabulary-ticket-001-code-review/CR-003 (Product Owner decision):** a number line keeps `title` and `lineColor`. A Known Hazard on NLC TICKET-002 requires it to draw and describe them. Recorded in the `sharedProperties` doc comment.
- **graph-specification-and-vocabulary-ticket-001-code-review/CR-004:** a Known Hazard on DGP TICKET-001 says not to redefine `categoryAxisLabel` and `valueAxisLabel`. A new consistency test fails when a term has two definitions (shared terms must be the same object; other terms must have one kind and description). This is the check DEL-001 deferred.
- **graph-specification-and-vocabulary-ticket-001-code-review/CR-005:** the series palette is retuned to `#006fad`, `#bd5300`, `#a77200`, `#009a70`, `#cb78a6` and `#000000`.
  - Every color is at least 3.1:1 on white, and the closest pair differs by 15.4% in relative luminance (DGP-NFR-004, read as relative as DGP TICKET-002 states).
  - The luminance check sits beside the contrast check in `tests/core/style.test.ts`.
  - **Correction to DEL-003:** these values replace the series colors listed there. The markers and dashes are unchanged, and the named colors are unchanged.
  - DGP TICKET-002 has a Known Hazard.
- **graph-specification-and-vocabulary-ticket-001-quality-review/QR-001:**
  - The helpers move to `src/core/format.ts`, which imports nothing. `describe.ts` keeps only the dispatcher.
  - A lint rule in `eslint.config.js` stops `src/core/definitions/**` from importing `describe`, and `tests/package/boundaries.test.ts` checks it.
  - **Deviation from the ticket's Output:** the helpers live in `format.ts`, not `describe.ts`. `tests/core/format.test.ts` is new.
- **graph-specification-and-vocabulary-ticket-001-quality-review/QR-003; graph-specification-and-vocabulary-ticket-001-code-review/CR-007:** `formatNumber` is replaced by:
  - `formatSupplied`: the value as written, never in exponent form or as `-0`.
  - `formatDerived`: two decimals, rounded half away from zero on the decimal digits, so `1.005` gives "1.01". A small non-zero value keeps two significant figures instead of showing "0".
  - `formatMeasurement(value, provenance, unit?)` chooses between them.
  - `describeNumber` in `issues.ts` stays separate: issue messages state a value to type in, at 4 significant figures.
  - CPSE TICKET-002 has a Known Hazard to build `displayValue` on these.
- **graph-specification-and-vocabulary-ticket-001-quality-review/QR-004; graph-specification-and-vocabulary-ticket-001-security-review/SEC-003:**
  - `defineProperties` builds every map and nested spec on a null prototype and deep-freezes it. Shared specs keep their identity.
  - `propertySpec(map, key)` looks up own keys only.
  - The registry and `propertiesOf` results have no prototype either.
  - Tests cover freezing at every depth, runtime mutation throwing, and `__proto__`/`constructor`/`toString` keys finding nothing.
  - The style freeze test now walks every depth.
  - GSV TICKET-003 and TICKET-004 have Known Hazards.
- **graph-specification-and-vocabulary-ticket-001-quality-review/QR-005:** the vocabulary-check fixture now has an empty enum and a top-level unknown kind, and both are asserted.
- **graph-specification-and-vocabulary-ticket-001-security-review/SEC-001:**
  - `StringValue` documents that every output encodes plain text for its context.
  - The new `tests/fixtures/plain-text.ts` holds benign and hostile strings for every renderer and the exporter.
  - The exporter's encoding rules are deferred to CPSE TICKET-005, plus CPSE TICKET-006 and TICKET-002, as Known Hazards.
- **graph-specification-and-vocabulary-ticket-001-security-review/SEC-002 (Product Owner decision):** plain text excludes control characters, line and paragraph separators, and direction overrides and isolates. The validator reports them (Known Hazard on GSV TICKET-003). Now: `cleanText` and `quoteText` in `format.ts` for every caller string a text alternative carries; zero-width joiners are kept.
- **graph-specification-and-vocabulary-ticket-001-security-review/SEC-004:** `resolveColor` matches names on ASCII letters only, and the Kelvin-sign spelling is in the rejection tests.
- **graph-specification-and-vocabulary-ticket-001-security-review/SEC-005:** `describe` checks that `type` is a string before looking it up. Its error shows the type through `describeValue` (quoted, escaped, at most 40 characters). Tests cover null, bigint, symbol, object and million-character types.
- **graph-specification-and-vocabulary-ticket-001-code-review/CR-006:** Known Hazards on GSV TICKET-004 (export `describe`), TICKET-005 (one vocabulary entry per term; color names in any case in the schema) and TICKET-006 (full `Record` type). **Correction to Notes:** treating an empty label as no label is GSV TICKET-003's criterion, not TICKET-004's.

Re-verification after the amendments (Node.js v24.1.0, pnpm 10.28.2):

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm lint` | 0 | no findings, including the new definitions block |
| `pnpm typecheck` | 0 | no errors |
| `pnpm test` | 0 | 9 files, 254 tests passed (`tests/core`: definitions 17, style 52, format 31, describe 3, issues 36; boundaries +5) |
| `pnpm build` | 0 | all entries and declarations emitted |
| `pnpm check:dist` | 0 | no network APIs in built output |
| `pnpm size` | 0 | `./core` 1.24 kB of 25 kB |
| `pnpm publint` | 0 | "All good!" |
| `pnpm attw` | 0 | no problems in the ESM-only profile |
| `pnpm check:deps` | 0 | 0 runtime dependencies |
| `pnpm check:changesets` | 0 | 0 changesets |
