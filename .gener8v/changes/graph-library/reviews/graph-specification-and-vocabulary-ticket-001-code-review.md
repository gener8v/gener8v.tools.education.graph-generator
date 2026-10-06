# TICKET-001: Definition format, shared presentation properties and default style — Code Review

## Summary

I reviewed the delivery of `graph-library/graph-specification-and-vocabulary/TICKET-001` (delivery commit `3276f1e`, branch `ticket/gsv-001`) against:
- the ticket
- the Graph Specification & Vocabulary specification
- `constraints/prd.md`
- `technical-design/system-design.md`
- the dependency map (RES-001, RES-004)
- the downstream tickets that consume this contract

All ten Verification Run commands reproduce with exit 0. All eight covered requirements carry `@spec` annotations that match the specification's `## @spec Coverage` table, and the gener8v lint reports 0 errors and 0 warnings. 10 of the 11 acceptance criteria are met.

AC5 is Partial: point labels and element colors declare no graph types. The other findings are about how this contract meets the tickets built on it:
- Applicability of top-level options has two unsynchronised sources.
- `number-line` accepts `title` and `lineColor`, which the NLC specification and ticket do not carry.
- `categoryAxisLabel` and `valueAxisLabel` are also planned by DGP TICKET-001.
- The series palette cannot pass DGP-NFR-004's greyscale check, which AD-011 assigns to it.

There are 7 findings: 0 Critical, 5 Issues, 2 Observations.

**Reviewer:** `code-reviewer` agent, fresh context (findings phase only, 2026-10-06)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/graph-specification-and-vocabulary-ticket-001-delivery.md`
**Files Reviewed:**
- `src/core/definitions/types.ts`
- `src/core/definitions/shared.ts`
- `src/core/definitions/index.ts`
- `src/core/style.ts`
- `src/core/describe.ts`
- `src/core/index.ts`
- `tests/core/definitions.test.ts`
- `tests/core/style.test.ts`
- `tests/core/describe.test.ts`
- `src/core/result.ts`, `src/core/issues.ts` (`Issue`, `Range`, `Terms` used by the new types; context only)
- `eslint.config.js` (non-rendering boundary block, for AC11 and prd/TC-005 only)
- `.github/workflows/ci.yml` (to confirm GSV-NFR-004's check runs in CI)

**Findings:** 7
**Critical:** 0 | **Issues:** 5 | **Observations:** 2

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| `GraphType` is a union of exactly `number-line`, `xy-graph`, `xyz-graph`, `line-graph`, `bar-graph`, `pictograph`, `circle`, `square`, `triangle`, `cube`, `cylinder` | Yes | `src/core/definitions/types.ts:9-23`: `GRAPH_TYPES`, a frozen `as const` list, and `GraphType = (typeof GRAPH_TYPES)[number]`. `tests/core/definitions.test.ts:69-86` pins the list with an inline snapshot and checks that it is frozen |
| `GraphTypeDefinition` carries `type`, `title`, `description`, `properties`, `derivations`, `checks`, `describe`; `PropertySpec` carries `term`, `kind`, nested `items`/`properties`, `min`/`max`/`exclusiveMin`, `required`, `description`, `presentation` | Yes | `src/core/definitions/types.ts:131-141` (`GraphTypeDefinition`). `PropertySpec` (`types.ts:98-103`) is `ValueSpec & { term, required, presentation? }`, with the kind-specific fields on each `ValueSpec` variant: bounds on `NumberValue` (`:52-58`), `properties` on `ObjectValue` (`:79-82`), `items` on `ArrayValue` (`:84-88`). It also has `exclusiveMax` and enum `values`, both recorded in the reconciliation. `circleFixture` (`tests/core/definitions.test.ts:44-66`) uses every field, and `pnpm typecheck` passes |
| Property names are camel-cased vocabulary terms (AD-005); a unit test fails if any definition declares a property whose name is not a declared term | Yes | `tests/core/definitions.test.ts:17-36` (`vocabularyProblems`) checks every key, nested ones included: it must equal `spec.term`, match `^[a-z][a-zA-Z0-9]*$` and have a non-empty description. `:106-113` runs it over the shared, item, fixture and registered maps, and `:115-145` proves it fails on a mismatched key, spaces, Pascal case, nested snake case, a blank description and an unknown kind. Per DEL-001, a "declared term" is the spec's own `term` |
| `src/core/definitions/index.ts` exports a `definitions` registry keyed by `GraphType`, to which each type ticket adds its definition | Yes | `src/core/definitions/index.ts:8`: `Readonly<Partial<Record<GraphType, GraphTypeDefinition>>>`, frozen and empty (DEL-005). `tests/core/definitions.test.ts:90-102` checks keys against the definitions' `type` and, at type level, that a definition written for its own description shape fits the registry |
| Shared presentation properties (`title`, `lineColor`, `lineLabel`, axis labels, point labels) are defined once in `shared.ts`, each declaring which graph types it applies to | Partial | The eight top-level options in `src/core/definitions/shared.ts:12-77` each carry `appliesTo`, checked by `tests/core/definitions.test.ts:151-157`. The point label and element color in `itemProperties` (`shared.ts:86-101`) declare no graph types (CR-001). See also CR-002, CR-003 and CR-004 on how the declared applicability meets the type tickets |
| Label and title properties accept plain strings only; no markup kind | Yes | `PROPERTY_KINDS` (`src/core/definitions/types.ts:26-35`) has no markup or HTML kind. Every label and title option is `kind: "string"`, asserted by `tests/core/definitions.test.ts:181-188`. The rendering assertion (`<b>x</b>` as literal text) belongs to the first renderer, as the criterion says |
| `src/core/style.ts` exports the default style (colors, line widths, text sizes, font stack per AD-010), the named-color list and the default series palette with distinct markers and dash patterns (AD-011) | Yes | `defaultStyle` (`src/core/style.ts:41-68`): colors, `lineWidths`, `fontSizes`, and a `fontFamily` identical to AD-010's stack. `namedColors` (`:6-15`). `seriesStyles` (`:85-96`): six series with the markers AD-011 names and six distinct dashes. Checked by `tests/core/style.test.ts:39-98` |
| Style is expressed as values for SVG presentation attributes only — no CSS, class names or stylesheet | Yes | Every leaf is a string or number with no `class`, `className`, `style`, `css` or `stylesheet` key, asserted by `tests/core/style.test.ts:45-60`. `src/core/style.ts` emits no CSS |
| Every color in the default style has a contrast ratio ≥ 3:1 against the default background, verified by `tests/core/style.test.ts` run in CI (GSV-NFR-004) | Yes | `tests/core/style.test.ts:27-37`: the WCAG 2.1 formula is checked against known values, then applied once per color (default, named and series; 18 tests). My own computation matches: the lowest is `#cc79a7` at 3.06:1, then `#009e73` at 3.42:1 and grid `#8a8a8a` at 3.45:1. It runs in CI through the `Test` step (`.github/workflows/ci.yml`, `pnpm test`) |
| `describe(normalized)` in `src/core/describe.ts` dispatches to the type's `describe` and provides shared helpers (number and list formatting) | Yes | `src/core/describe.ts:8-14`: own-property lookup, throws for an unregistered type. `formatNumber`, `formatList`, `formatMeasurement` at `:17-31`. Tested by `tests/core/describe.test.ts` (dispatch through a mocked registry, the helpers) |
| No file under `src/core/` imports React or a browser global (lint passes) | Yes | `eslint.config.js` non-rendering block covers `src/core/**`; `pnpm lint` exit 0 on re-run |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| GSV-REQ-003 | Exactly the eleven supported graph types | `src/core/definitions/types.ts`:GRAPH_TYPES, GraphType; `src/core/definitions/index.ts`:definitions (keyed by `GraphType`); completion by TICKET-006 | Yes |
| GSV-REQ-012 | Fixed vocabulary; every property name is a vocabulary term | `src/core/definitions/types.ts`:PropertySpec (`term`); `tests/core/definitions.test.ts`:vocabularyProblems. Publishing the vocabulary is TICKET-005 | Yes |
| GSV-REQ-040 | Line color, line label, axis labels, title and point labels on every graph type to which each applies | `src/core/definitions/shared.ts`:sharedProperties (with `appliesTo`), itemProperties; `src/core/definitions/types.ts`:PresentationOption | Partial: point labels declare no applicable types (CR-001), and `number-line` is given `title`/`lineColor` against the NLC list (CR-003) |
| GSV-REQ-042 | Colors as published named colors or hexadecimal codes | `src/core/style.ts`:namedColors, resolveColor (names in any case, `#rgb`/`#rrggbb`; alpha rejected per DEL-004); `tests/core/style.test.ts:95-120` | Yes |
| GSV-REQ-043 | Labels and titles as plain text, never markup | `src/core/definitions/types.ts`:PROPERTY_KINDS, StringValue; `src/core/definitions/shared.ts` (all label and title options `kind: "string"`) | Yes |
| GSV-REQ-044 | One published default style applied when options are omitted | `src/core/style.ts`:defaultStyle, seriesStyles (defined here; applied by the renderers) | Yes |
| GSV-REQ-045 | A presentation option applies only to the element it names | `src/core/definitions/shared.ts`:itemProperties (element options nest on the element); `src/core/definitions/types.ts`:PresentationOption | Yes |
| GSV-NFR-004 | Every default-style color ≥ 3:1 against the default background, automated check in CI | `tests/core/style.test.ts` "default style contrast" (18 color tests): ran in the Verification Run and in CI's `Test` step; minimum 3.06:1 | Yes |

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/CC-002 | WCAG 2.1 AA non-text: 3:1 contrast for graphical objects; color not the only cue between series | Yes | Every default, named and series color is ≥ 3:1 on `#ffffff` (`tests/core/style.test.ts:34-36`). Each series has its own marker and dash (`src/core/style.ts:88-93`, asserted at `tests/core/style.test.ts:83-88`) |
| prd/CC-001 | No bundled font; licensing of bundled assets | Yes | `defaultStyle.fontFamily` is the system stack; no font file or `@font-face` (`tests/core/style.test.ts:68-71`) |
| prd/TC-008 | Definition is in-house; no runtime schema library | Yes | The definition format is plain TypeScript types (`src/core/definitions/types.ts`); `pnpm check:deps`: 0 runtime dependencies |
| prd/TC-005 | Non-rendering code loads no React DOM or browser globals | Yes | `pnpm lint` exit 0 with the `src/core/**` boundary rules (`eslint.config.js`) |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-003 | In-house definition format as the single source of truth; shared presentation properties defined once in `shared.ts` | Partial | The `GraphTypeDefinition`/`PropertySpec`/`Derivation`/`DomainCheck` shapes match the Data Model, and `derive(term, value)` is a reasonable reading of `derive(defining)`. But applicability of shared options has two sources, `appliesTo` and each definition's `properties`, with nothing to keep them consistent (CR-002). Two axis-label terms are also planned for a second definition (CR-004) |
| AD-005 | `type` values in kebab case, properties in camel case | Yes | `GRAPH_TYPES` values; every shared and item key is camel case and checked by the vocabulary test |
| AD-010 | System font stack, no bundled font | Yes | `src/core/style.ts:60` matches AD-010's stack character for character |
| AD-011 | Presentation attributes only; Okabe–Ito palette adjusted to 3:1; distinct markers and dashes; named colors; contrast and greyscale checks in CI | Partial | Presentation attributes, palette adjusted for contrast, the six named markers, distinct dashes and named colors are all done. The greyscale distinction AD-011 lists (DGP-NFR-004) is not checked, and the palette fails it under every reading (CR-005) |
| AD-004 | Domain checks return issues | Yes | `DomainCheck<D>` returns `readonly Issue[]` (`src/core/definitions/types.ts:126-128`) |
| AD-001 | `./core` entry, no React | Yes | `src/core/index.ts` adds `GRAPH_TYPES`/`GraphType`; boundary lint passes. `describe` is not yet exported from `./core`, and no ticket carries that export (CR-006) |
| AD-007 | 400-unit drawing space; one rounding function | Yes | Text sizes are in drawing-space units (`src/core/style.ts:61-65`). `formatNumber` is display rounding for text alternatives; its relation to `displayValue` is CR-007 |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| GSV-REQ-003 | `@spec GSV-REQ-003` | `src/core/definitions/types.ts`:GRAPH_TYPES; `src/core/definitions/index.ts`:definitions | Yes |
| GSV-REQ-012 | `@spec GSV-REQ-012` | `src/core/definitions/types.ts`:PropertySpec; `src/core/definitions/index.ts`:definitions | Yes |
| GSV-REQ-040 | `@spec GSV-REQ-040` | `src/core/definitions/types.ts`:PresentationOption; `src/core/definitions/shared.ts`:sharedProperties, itemProperties | Yes |
| GSV-REQ-042 | `@spec GSV-REQ-042` | `src/core/style.ts`:namedColors, resolveColor | Yes |
| GSV-REQ-043 | `@spec GSV-REQ-043` | `src/core/definitions/types.ts`:PropertySpec; `src/core/definitions/shared.ts`:sharedProperties, itemProperties | Yes |
| GSV-REQ-044 | `@spec GSV-REQ-044` | `src/core/style.ts`:defaultStyle, seriesStyles | Yes |
| GSV-REQ-045 | `@spec GSV-REQ-045` | `src/core/definitions/types.ts`:PresentationOption; `src/core/definitions/shared.ts`:itemProperties | Yes |
| GSV-NFR-004 | `@spec GSV-NFR-004` | `src/core/style.ts`:namedColors, defaultStyle, seriesStyles | Yes |

**Coverage:** 8 of 8 requirements annotated. Every annotation sits on the line directly above its declaration, below any doc comment.
**Missing:** None. `src/core/describe.ts` carries no annotation, which is correct: it serves NLC-REQ-012, DGP-REQ-004 and GSS-REQ-036, which are outside this ticket and annotated by the type tickets.
**Specification table:** Yes. The eight rows appended to `## @spec Coverage` in `.gener8v/specifications/graph-specification-and-vocabulary.md` (commit `3276f1e`) list exactly these locations. `gener8v-state.py lint`: 0 errors, 0 warnings.

### Verification Run

Re-run on Node.js v24.1.0, pnpm 10.28.2, branch `ticket/gsv-001` at `3276f1e`. These match the record's environment. The working tree is unchanged apart from `.gener8v/runs.jsonl`.

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm lint` | 0 | Yes: no findings |
| `pnpm typecheck` | 0 | Yes: no errors, the registry-typing assignment included |
| `pnpm test` | 0 | Yes: 8 files, 218 tests (definitions 10, style 50, describe 12, issues 36) |
| `pnpm build` | 0 | Yes: all entries and declarations emitted |
| `pnpm check:dist` | 0 | Yes: 4 built files, no network APIs |
| `pnpm size` | 0 | Yes: `./core` 1.24 kB of 25 kB |
| `pnpm publint` | 0 | Yes: "All good!" |
| `pnpm attw` | 0 | Yes: no problems in the ESM-only profile |
| `pnpm check:deps` | 0 | Yes: 0 runtime dependencies |
| `pnpm check:changesets` | 0 | Yes: 0 changesets |

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | Making the spec the declaration of its term keeps one source per term (AD-003) before TICKET-005 builds the vocabulary. The check it defers (a term reused by several types has one definition) is on no ticket's file (CR-006), and CR-004 shows a concrete collision coming |
| DEL-002 | Questionable | Putting element options on the element makes GSV-REQ-045 structural, which is sound. Three problems: `number-line` gets `title`/`lineColor`, which the NLC list it claims to follow does not have (CR-003). `categoryAxisLabel`/`valueAxisLabel` collide with DGP TICKET-001's planned `categories.ts` (CR-004). The item options declare no types (CR-001) |
| DEL-003 | Questionable | The contrast work is correct. My computation matches the quoted 1.3:1 (yellow), 2.3:1 (sky blue) and 3.06:1 (reddish purple). Orange `#b36b00` is 4.18:1, so "all at least 4.2:1" is slightly high. The greyscale target AD-011 also sets for this palette was deferred to DGP TICKET-002 without checking that the palette can meet it, and it cannot (CR-005) |
| DEL-004 | Reasonable | Rejecting alpha keeps contrast knowable. Case-insensitive names help authors, but they constrain the published schema, and that is not recorded where TICKET-005 will see it (CR-006) |
| DEL-005 | Reasonable | `Partial<Record<…>>` is honest while no type exists, and `describe` handles absence. Tightening the type is not on TICKET-006's file (CR-006) |
| DEL-006 | Reasonable | Method-syntax bivariance for `DomainCheck` matches `describe` and is safe: a definition's checks are typed by its own `D`, and the validator dispatches by type |

Deviations from Plan:
- `ALL_TYPES` → `GRAPH_TYPES`: no impact.
- DEL-006 was unplanned: recorded, no impact.
- The extra `tests/core/describe.test.ts`: covers AC10.

None of the three affects traceability.

## Findings

### CR-001: Point labels and element colors declare no graph types

**Severity:** Issue
**Location:** `src/core/definitions/shared.ts:86-101` (`itemProperties`)
**Traces To:** TICKET-001 acceptance criterion 5; GSV-REQ-040; GSV-REQ-041; DEL-002
**Description:** Acceptance criterion 5 requires each shared presentation property to be defined once in `shared.ts`, each declaring which graph types it applies to. It names point labels explicitly. The eight top-level options carry `appliesTo`, but `itemProperties.label` and `itemProperties.color` do not. Under DEL-002, a type applies them by nesting them in its item specs, so applicability is implicit. Nothing in `shared.ts` or the tests says which graph types accept a point label or an element color. The criterion is met for title, line color, line label and axis labels, but not for point labels.
**Impact:** Point-label and element-color applicability is spread across eleven type definitions, with no declared list to check them against. GSV-REQ-041, and the DGP edge case "Category color given on a pictograph → report it as an option that does not apply", need an element-level option on a type that lacks it reported as *inapplicable*, not *unknown*. TICKET-003 would have to infer that from `presentation` alone. A type ticket that forgets to nest `color` turns a legitimate option into `unknown_property` silently.
**Recommendation:** Two options:
- Give each `itemProperties` entry an `appliesTo` listing the graph types whose elements may carry it, taken from NLC-REQ-011, NLC-REQ-030, DGP-REQ-011, DGP-REQ-019 and the GSS lists. Add a registry test in `tests/core/definitions.test.ts` that a definition nests an item option exactly when its type is listed.
- Dismiss on DEL-002's rationale, and have Ticket Breakdown amend the criterion to say element-level options are declared by nesting.

The first costs two fields and one test.
**Status:** Resolved
**Resolution:** Approved. `label` and `color` are now `sharedProperties` entries with `elementsOf` lists taken from NLC-REQ-011, NLC-REQ-030 and DGP-REQ-019; series carry `lineColor`/`lineLabel` (`elementsOf: ["line-graph"]`). A test checks that a definition nests an element option exactly when the type is listed.

---

### CR-002: Top-level option applicability has two sources, `appliesTo` and each definition's `properties`, and nothing keeps them in step

**Severity:** Issue
**Location:** `src/core/definitions/shared.ts:6-11` (`sharedProperties` doc comment); `tests/core/definitions.test.ts:50` (`circleFixture.properties.title`)
**Traces To:** AD-003 (single source of truth); GSV-REQ-015; GSV-NFR-003; RES-001 / RD-001
**Description:** The `sharedProperties` doc comment says a type ticket adds a shared option to its type "by listing it in `appliesTo`, never by redefining them". But the fixture that stands for a type definition, `circleFixture`, also puts `title: sharedProperties.title` in its own `properties`. So do the planned definitions: NLC TICKET-003's `xy-graph.ts` Output lists `xAxisLabel`, `yAxisLabel` and `title`, and NLC TICKET-004's `xyz-graph.ts` lists axis labels and `title`. The contract can therefore be read two ways:
- a type's terms are its `properties` alone, or
- they are its `properties` plus every shared option whose `appliesTo` names the type.

No test asserts that the two agree for a registered definition.
**Impact:** TICKET-003 (applicability and `inapplicable_property`), TICKET-005 (schema and per-type vocabulary) and every type ticket must each choose a reading:
- If the validator and the schema generator choose differently, they disagree on which terms a type accepts, which is exactly the disagreement GSV-NFR-003 exists to prevent.
- If a type ticket updates one list and not the other, an option is accepted but never drawn, or drawn but rejected.

RD-001 expects this contract to change once, with the circle slice. An unresolved ambiguity here invites a second change.
**Recommendation:**
- Choose one model and state it in `src/core/definitions/types.ts`, next to `GraphTypeDefinition`.
- Make the `shared.ts` comment and `circleFixture` agree with it.
- Enforce it in `tests/core/definitions.test.ts` over the registry. For example: for every registered definition and every shared term, `sharedProperties[term].appliesTo.includes(definition.type)` holds exactly when `definition.properties[term] === sharedProperties[term]`.

TICKET-003 and TICKET-005 then read applicability one way.
**Status:** Resolved
**Resolution:** Approved. One source: definitions never list shared top-level options, and `propertiesOf(type)` merges them from `appliesTo`. A test fails if a definition lists, redefines or misplaces a shared option. The contract is documented on `GraphTypeDefinition.properties` and `SharedPropertySpec`.

---

### CR-003: `title` and `lineColor` apply to `number-line`, which neither the NLC specification nor NLC TICKET-002 carries

**Severity:** Issue
**Location:** `src/core/definitions/shared.ts:19` (`title.appliesTo: GRAPH_TYPES`), `src/core/definitions/shared.ts:27` (`lineColor.appliesTo`)
**Traces To:** GSV-REQ-040 ("on every graph type to which each applies"); GSV-REQ-041; DEL-002; NLC specification › Data Requirements; graph-library/number-lines-and-coordinate-graphs/TICKET-002 Output
**Description:** DEL-002 says the applicability lists follow "the per-type option lists in the NLC, DGP and GSS specifications". For the number line they do not:
- The NLC specification's Data Requirements list for the number line is "range, tick spacing, tick-label visibility, custom tick labels, left and right arrowhead settings, marked points (value, label, color), line label, text alternative". It has no title and no line color, while the x,y and x,y,z lists beside it do name a title.
- NLC TICKET-002's Output for `src/core/definitions/number-line.ts` has `lineLabel`, point `label`/`color` and `textAlternative`, but no `title` or `lineColor`, and none of its acceptance criteria draws them.

The delivery lists `number-line` in both `title.appliesTo` (via `GRAPH_TYPES`) and `lineColor.appliesTo`.
**Impact:** Once TICKET-003 reads `appliesTo`, a number line with a `title` or `lineColor` will validate. The number-line renderer, built to its ticket, will then ignore it. That is an accepted option with no effect, where GSV-REQ-041 would otherwise have reported it. The alternative, NLC TICKET-002 drawing them, is scope that ticket does not know about.
**Recommendation:** The Product Owner's call (does a number line have a title and a line color?) decides between two options:
- Remove `number-line` from both `appliesTo` lists, which matches the NLC specification and ticket. `title` then needs an explicit list rather than `GRAPH_TYPES`, and the test at `tests/core/definitions.test.ts:170` changes with it.
- Keep it, record in DEL-002 that it extends the NLC list, and append a Known Hazard to `.gener8v/changes/graph-library/tickets/number-lines-and-coordinate-graphs/TICKET-002.md` requiring the number line to accept, draw and describe `title` and `lineColor`.
**Status:** Resolved
**Resolution:** Product Owner decision: a number line keeps `title` and `lineColor`. A Known Hazard on NLC TICKET-002 requires it to draw and describe them, and the `sharedProperties` doc comment records the extension.

---

### CR-004: `categoryAxisLabel` and `valueAxisLabel` are defined here, and DGP TICKET-001 also plans them in `categories.ts`

**Severity:** Issue
**Location:** `src/core/definitions/shared.ts:61-76`
**Traces To:** TICKET-001 acceptance criterion 5 ("defined once"); AD-003; DEL-001 ("one source per term"); DEL-002; graph-library/data-graphs-and-pictographs/TICKET-001 Output and its second acceptance criterion
**Description:** DEL-002 puts `categoryAxisLabel` and `valueAxisLabel`, applying to `line-graph` and `bar-graph`, in `shared.ts`. DGP TICKET-001 is `ready` in `pipeline-state.yaml`, and its Output reads "`src/core/definitions/categories.ts` — shared PropertySpecs for `categories`, `categoryAxisLabel`, `valueAxisLabel`, `valueUnitLabel`, `valueScale`". Its second acceptance criterion requires the same two terms to be accepted on line and bar graphs and reported inapplicable elsewhere. DEL-002's Ticket Impact does not mention DGP TICKET-001, and that ticket's file has no Known Hazard about it.
**Impact:** If DGP TICKET-001 is delivered as written, each term gets a second definition, with its own description and its own applicability. That breaks DEL-001's premise that a spec is the single declaration of its term. TICKET-005's vocabulary then has to choose between two definitions, and the validator may use one while the schema uses the other.
**Recommendation:** Do one of the following:
- Append a Known Hazard to `.gener8v/changes/graph-library/tickets/data-graphs-and-pictographs/TICKET-001.md`: import `categoryAxisLabel` and `valueAxisLabel` from `src/core/definitions/shared.ts` (GSV TICKET-001 DEL-002) and do not redefine them; `valueUnitLabel` and the rest stay in `categories.ts`.
- Remove both terms from `shared.ts`, leave them to DGP TICKET-001, and update DEL-002.

Either way, add a test to `tests/core/definitions.test.ts` that no term is declared by two different spec objects across the shared, item and registered maps. That is also DEL-001's deferred check.
**Status:** Resolved
**Resolution:** Approved. A Known Hazard on DGP TICKET-001 says not to redefine the two terms. A consistency test fails when a term is defined twice: shared terms must be the same object, other terms must have one kind and description.

---

### CR-005: The default series palette cannot meet DGP-NFR-004's greyscale target, which AD-011 assigns to it

**Severity:** Issue
**Location:** `src/core/style.ts:85-96` (`seriesStyles`)
**Traces To:** AD-011 (Context: "greyscale distinction (DGP-NFR-004)"; Consequences: "contrast and greyscale checks run on it in CI"); RES-004; DGP-NFR-004; DEL-003; graph-library/data-graphs-and-pictographs/TICKET-002 acceptance criterion for `tests/core/series-palette.test.ts`
**Description:** AD-011 makes the default palette responsible for both 3:1 contrast (GSV-NFR-004) and greyscale distinction (DGP-NFR-004), and RES-004 makes this ticket its owner. DEL-003 tunes the palette for contrast only and defers the greyscale check to DGP TICKET-002. That ticket's criterion requires that "the first six default series colors differ pairwise by at least 15% relative luminance".

I computed relative luminance with the same WCAG formula as `tests/core/style.test.ts`:

| Series color | Relative luminance |
|--------------|--------------------|
| `#0072b2` | 0.153 |
| `#b36b00` | 0.201 |
| `#d55e00` | 0.222 |
| `#009e73` | 0.257 |
| `#cc79a7` | 0.293 |
| `#000000` | 0 |

The closest pair is `#d55e00`/`#b36b00`: 0.0205 apart, a 9.3% relative difference. How many of the 15 pairs fail depends on how the target is read:
- As an absolute luminance difference of 0.15: 10 pairs fail.
- As a 15% relative difference: 3 pairs fail.

Under the absolute reading, no six-color palette can pass both targets. 3:1 on white caps luminance at 0.30, and six values pairwise 0.15 apart need a span of 0.75.
**Impact:** DGP TICKET-002's palette test will fail against this palette. The palette will then have to change after renderers exist, which RES-004 warns reruns their visual tests. If the absolute reading is the intended one, the change contains a requirements conflict that no palette resolves, and nobody has raised it yet.
**Recommendation:** Settle the palette now, while nothing consumes it:
1. Add the DGP-NFR-004 luminance check to `tests/core/style.test.ts`, beside the contrast check, as AD-011 places them together.
2. Have Specification or Audit settle what "15% luminance difference" means. Relative is the only reading compatible with GSV-NFR-004.
3. Re-choose the six series colors to pass both checks, keeping the distinct markers and dashes, and update DEL-003.

If this is deferred instead, defer it to graph-library/data-graphs-and-pictographs/TICKET-002 with a Known Hazard carrying these figures and the feasibility point, and raise the specification conflict with Audit.
**Status:** Resolved
**Resolution:** Approved. The palette is retuned to `#006fad`, `#bd5300`, `#a77200`, `#009a70`, `#cb78a6` and `#000000`: each at least 3.1:1, closest pair 15.4% apart in relative luminance. The luminance check sits beside the contrast check, and DGP TICKET-002 has a Known Hazard explaining why the relative reading is the feasible one.

---

### CR-006: Follow-up work from DEL-001, DEL-004, DEL-005 and the Notes is not on the tickets that must do it

**Severity:** Observation
**Location:** `.gener8v/changes/graph-library/delivery/graph-specification-and-vocabulary-ticket-001-delivery.md` (DEL-001, DEL-004, DEL-005, Notes); `src/core/style.ts:26-33` (`resolveColor`)
**Traces To:** GSV-REQ-011; GSV-REQ-013; GSV-NFR-003; AD-001; graph-library/graph-specification-and-vocabulary/TICKET-003, TICKET-004, TICKET-005, TICKET-006
**Description:** The record leaves work for later tickets that none of those tickets' files carries:
- **DEL-001:** "TICKET-005 and TICKET-006 should check that a term reused by several types has one definition". Neither ticket says so.
- **DEL-004:** `resolveColor` accepts names in any case (`"Blue"`, `"GRAY"`). Suppose TICKET-005 publishes the `color` kind as a case-sensitive `enum` of the lowercase names. The schema then rejects `"Blue"` while `validate` accepts it, which breaks GSV-REQ-011 and GSV-NFR-003. DEL-004's Ticket Impact names TICKET-003 only.
- **DEL-005:** "TICKET-006 changes the type to the full `Record`". TICKET-006's criteria check the registry's contents at runtime but never mention the type.
- **Notes, `describe` export:** The record says "GSV TICKET-004 exports it together with `validate` and `normalize`". TICKET-004 has no such criterion or Output, and no ticket exports `describe` from `./core`, which AD-001 lists.
- **Notes, empty labels:** The record says treating an empty label as no label "goes to normalization in TICKET-004". This is already a TICKET-003 criterion, so the pointer is wrong but nothing is lost.
**Impact:** Later Deliveries work from their own ticket file. These points survive only in a record they may never open. As a result:
- the reused-term check and the full-`Record` type could be skipped;
- a case-sensitive color enum could ship;
- `describe` could stay unexported.
**Recommendation:** Append Known Hazards:
- to TICKET-005: one definition per reused term; the published `color` kind must accept names in any case, or DEL-004 must change, so that `validate` agrees with the schema.
- to TICKET-006: tighten `definitions` to `Readonly<Record<GraphType, GraphTypeDefinition>>`.
- to TICKET-004, or whichever ticket the user chooses: export `describe` from `src/core/index.ts` (AD-001).

Record the empty-label correction (TICKET-003, not TICKET-004) in the delivery record's `## Post-Review Amendments`.
**Status:** Resolved
**Resolution:** Approved. Known Hazards on GSV TICKET-004 (export `describe`), TICKET-005 (one entry per term; color names in any case in the schema) and TICKET-006 (full `Record`). The empty-label pointer is corrected in Post-Review Amendments.

---

### CR-007: `formatNumber` is a second display-rounding function, and the plan for `displayValue` to reuse it exists only in the record

**Severity:** Observation
**Location:** `src/core/describe.ts:17-20` (`formatNumber`), `src/core/describe.ts:29-31` (`formatMeasurement`)
**Traces To:** RES-002; prd/RF-003; AD-007; GSS-REQ-034; graph-library/component-packaging-and-source-export/TICKET-002 (`displayValue` criterion)
**Description:** The ticket asks for number-formatting helpers in `describe.ts`. `formatNumber` (two decimals, `-0` shown as `0`) meets that request. But RES-002 and prd/RF-003 call for one shared function for the display rounding of derived values. CPSE TICKET-002 (status `ready`) builds `displayValue(n, supplied)` in `src/layout/kit/format.ts`. It returns a supplied value as given and a derived value at the documented display precision (GSS-REQ-034). The record's Notes say `displayValue` should reuse `formatNumber`, but CPSE TICKET-002's file does not say so. Separately, `formatMeasurement` rounds every value, supplied values included.
**Impact:** A type's text alternative and its visible labels can state the same measurement differently. For example, a supplied radius of `3.14159` is drawn as "3.14159" under GSS-REQ-034 but described as "3.14". Two rounding rules written independently can also drift apart.
**Recommendation:** Append a Known Hazard to `.gener8v/changes/graph-library/tickets/component-packaging-and-source-export/TICKET-002.md`:
- build `displayValue`'s derived-value branch on `formatNumber` from `src/core/describe.ts`;
- type tickets' `describe` functions should state measurements with `displayValue`'s supplied/derived rule, so the text alternative matches the labels.

Alternatively, record a decision that text alternatives round independently of labels.
**Status:** Resolved
**Resolution:** Approved together with QR-003. The helpers become `formatSupplied` and `formatDerived`, and `formatMeasurement` takes the value's provenance. A Known Hazard on CPSE TICKET-002 requires `displayValue` to build on them.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Approved | `label`/`color` in `sharedProperties` with `elementsOf`; nesting test | `src/core/definitions/shared.ts`, `tests/core/definitions.test.ts` |
| CR-002 | Approved | `propertiesOf`; definitions never list shared top-level options; applicability test | `src/core/definitions/index.ts`, `src/core/definitions/types.ts`, `tests/core/definitions.test.ts` |
| CR-003 | Product Owner: keep | Known Hazard on NLC TICKET-002 | `tickets/number-lines-and-coordinate-graphs/TICKET-002.md`, `src/core/definitions/shared.ts` |
| CR-004 | Approved | Known Hazard on DGP TICKET-001; term-consistency test | `tickets/data-graphs-and-pictographs/TICKET-001.md`, `tests/core/definitions.test.ts` |
| CR-005 | Approved | Palette retuned; luminance check | `src/core/style.ts`, `tests/core/style.test.ts`, `tickets/data-graphs-and-pictographs/TICKET-002.md` |
| CR-006 | Approved | Known Hazards on GSV TICKET-004, 005, 006; Notes correction | ticket files; delivery record |
| CR-007 | Approved | `formatSupplied`/`formatDerived`; Known Hazard on CPSE TICKET-002 | `src/core/format.ts`, `tickets/component-packaging-and-source-export/TICKET-002.md` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0
**Notes:** Resolved with the Product Owner on 2026-10-06. All seven findings were fixed or carried to the tickets that need them, and re-verified: lint, typecheck, 254 tests, build, `check:dist`, size, publint, attw, `check:deps` and `check:changesets` all exit 0 (see the delivery record's Post-Review Amendments). Acceptance criterion 5 is now met for point labels and element colors as well.
