# TICKET-002: Circle graph type (vertical slice) — Code Review

## Summary

I reviewed the delivery of `graph-library/geometric-shapes-and-solids/TICKET-002` (delivery commit `4c18451`, branch `ticket/gss-002`). I checked it against the ticket and its Known Hazards, the Geometric Shapes & Solids specification, `constraints/prd.md` and `technical-design/system-design.md`.

What holds:
- All twelve acceptance criteria are met, and all ten requirements are covered and annotated.
- The circle part of GSS-NFR-001 is verified by a property test that ran in the Verification Run.
- Every carried hazard is addressed: the definition contract rules, the envelope fallback, group member ranges, domain checks, the rich example with regenerated files, display precision, the per-type component, and the GSV `definitions` leak.
- Every Verification Run command reproduces with exit 0.

Extra checks beyond the record's commands:
- `gener8v-state.py lint`: 0 errors, 0 warnings.
- Scratch probes of `createGraph` and `validate` (outside the repository) to confirm the behaviour behind the findings.

There is one Issue:
- **CR-001.** A whitespace-only `title` is valid. The drawing then shows no title, but the text alternative says `A circle titled “” …`.

There are four Observations:
- **CR-002.** Labels reach the display precision through `formatMeasurement` rather than `displayValue()`, which AC 7, AD-007 and the CR-005 hazard all name. `displayValue` now has no production caller. Small derived values exceed "2 decimal places", and nothing records either point.
- **CR-003.** DEL-001's two-argument contract is not reflected in the technical design or in downstream tickets' Output. TypeScript would accept a one-argument layout.
- **CR-004.** A label with no clear spot is stacked below the figure without `placeLabel`, and nothing ties it to its measurement.
- **CR-005.** Custom label text replaces the unit as well as the value. Nothing records or documents this reading of GSS-REQ-033 and GSS-REQ-035.

**Reviewer:** `code-reviewer` agent, fresh context (findings phase only, 2026-10-12)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/geometric-shapes-and-solids-ticket-002-delivery.md`
**Files Reviewed:**
- `src/core/definitions/circle.ts`
- `src/core/definitions/index.ts`
- `src/core/definitions/types.ts`
- `src/core/describe.ts`
- `src/core/format.ts` (`sourceOf`, added here; `formatMeasurement`, `formatDerived`, `cleanText`, `quoteText` read for context)
- `src/core/validate/envelope.ts`
- `src/layout/registry.ts`
- `src/graph.ts`
- `src/layout/kit/measure.ts`
- `src/layout/kit/title.ts`
- `src/layout/circle.ts`
- `src/react/graphs/CircleGraph.tsx`
- `src/entries/circle.ts`
- `src/index.ts`
- `package.json`, `tsup.config.ts`, `.size-limit.json`
- `examples/circle.json`, `examples/invalid/circle-contradiction.json`, `examples/invalid/circle-negative-radius.json`
- `src/generated/description.ts`, `src/generated/schema.json`, `src/generated/tool-schema.json`, `src/generated/vocabulary.json` (circle branch)
- `tests/core/circle.test.ts`
- `tests/layout/circle.test.ts`
- `tests/package/per-type-bundle.test.ts`
- `tests/core/validate-envelope.test.ts`, `tests/core/describe.test.ts`, `tests/core/definitions.test.ts`, `tests/fixtures/layouts.ts`, `tests/react/Graph.test.tsx`
- Read for context, unchanged here: `src/core/validate/derive.ts`, `src/core/validate/domain.ts`, `src/core/validate/structure.ts`, `src/layout/kit/format.ts`, `src/layout/kit/labels.ts`, `src/layout/kit/check.ts`, `src/layout/kit/text.ts`, `src/react/createGraphComponent.tsx`, `src/react/Graph.tsx`, `tests/package/entries.test.ts`, `tests/core/schema-agreement.test.ts`, `tests/core/schema-shape.test.ts`

**Findings:** 5
**Critical:** 0 | **Issues:** 1 | **Observations:** 4

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| `{ "type": "circle", "radius": 5 }` validates; the normalized description contains diameter 10 and circumference ≈ 31.4159, with provenance radius = supplied, diameter and circumference = derived | Yes | `src/core/definitions/circle.ts:132-142` (`derive`) plugged into the shared `src/core/validate/derive.ts:checkDerivations`; `tests/core/circle.test.ts:26` asserts diameter 10, circumference ≈ 31.4159 and the exact provenance map |
| A circle defined by `diameter` alone or `circumference` alone validates and derives the other two | Yes | `tests/core/circle.test.ts:33` and `:40`, with provenance |
| `radius: 5, circumference: 31.4` is accepted (within 1%); `radius: 5, diameter: 12` returns one `contradiction` issue naming `/radius` and `/diameter` and stating the agreeing value | Yes | Tolerance in the shared stage (`src/core/validate/derive.ts:23`), not in the circle (hazard honoured). `tests/core/circle.test.ts:47`: 31.4 is kept and marked supplied. `tests/core/circle.test.ts:53`: exactly one issue, at `/diameter` with `conflicts: ["/radius"]`, message containing "a value of 10 would agree" |
| Zero or negative radius, diameter or circumference returns `out_of_range` and no graph is drawn | Yes | Member minimums 0.001 / 0.002 / 0.006 (`src/core/definitions/circle.ts:108-120`) give a stage-2 `out_of_range`. `tests/core/circle.test.ts:66-79`: six cases, each with `createGraph` returning `ok: false` and no `scene` |
| With `showRadius`, a segment runs from the center horizontally to the right to the circumference; with `showDiameter`, a segment through the center that does not lie on the radius segment; with `showCenter`, a center point is marked | Yes | `src/layout/circle.ts:127-152`: the diameter turns vertical when the radius is drawn (`diameterVertical = shown.radius.drawn`). `tests/layout/circle.test.ts:70`, `:77`, `:96` |
| Each of radius, diameter and circumference can be labeled independently; a label shows the value, then the unit when a unit is supplied; a custom label text (e.g. "r", "?") replaces the value while the text alternative still states the value | Yes | `circleDisplay` (`src/core/definitions/circle.ts:49-57`), `measurementLabel` (`src/layout/kit/measure.ts:12`) and the label loop (`src/layout/circle.ts:172-190`). `tests/layout/circle.test.ts:121` covers each label alone and together, `:130` no unit, `:154` custom text with the value still in the text alternative. See CR-005 on the unit beside custom text |
| A supplied value is displayed exactly as supplied (31.4 stays "31.4"); a derived value is shown with at most 2 decimal places, trailing zeros removed, via `displayValue()` (this precision rule is placed in `src/layout/kit/measure.ts` for reuse) | Yes | `measurementLabel` uses `formatMeasurement`, which calls `formatSupplied` / `formatDerived`; there is no second rounding rule. `tests/layout/circle.test.ts:134` (31.4, 1.2345 supplied; 2.47, 6.28 derived) and `:145`; `tests/core/circle.test.ts:154`. The route skips `displayValue()`, and small derived values keep 2 significant figures (CR-002) |
| The circumference label, which has no segment, is placed next to the outline using `placeLabel` | Yes | `besideOutline` candidates (`src/layout/circle.ts:40-51`) go through `placeLabel` (`src/layout/circle.ts:179`). `tests/layout/circle.test.ts:167`: outside the outline, nearest corner within a label height. Labels too long for any candidate fall back to a stack below the figure (CR-004) |
| The text alternative names the figure as a circle and states every shown measurement with its unit | Yes | `circle.describe` (`src/core/definitions/circle.ts:159-180`): always the radius, the diameter when drawn, the circumference when labeled, each via `formatMeasurement` with the unit. `tests/core/circle.test.ts:142-189`. See CR-001 for a whitespace-only title |
| Every Scene number passes through `fmt()`; the Scene contains no ids or `url(#…)` references | Yes | Every numeric attribute in `src/layout/circle.ts` and `src/layout/kit/title.ts` is `fmt(...)` (the `Rounded` brand enforces it). `sceneOf` runs `checkScene` on every Scene in the file (`tests/layout/circle.test.ts:16-21`); `:242` checks the example for `"id"` and `url(` |
| `CircleGraph` renders the example; `Graph` with the same description renders identical markup; `./circle` entry and a size-limit entry exist | Yes | `src/react/graphs/CircleGraph.tsx:11`, exported from `src/index.ts`. `tests/react/Graph.test.tsx:54-79` draws `examples/circle.json` through every shipped per-type component and through `Graph` and compares the markup. `package.json` `./circle`, `tsup.config.ts` `circle`, `.size-limit.json` `./circle` (25 kB), kept in step by `tests/package/entries.test.ts`. `pnpm size`: 14.2 kB |
| Circle drawn length ratios (radius : diameter segment) are within 1% of 1 : 2 at the default size | Yes | Segments are `DRAWN_RADIUS` and `2 × DRAWN_RADIUS` (`src/layout/circle.ts:127-131`). `tests/layout/circle.test.ts:104`: property test over radii 0.001–1,000,000 asserting \|r/d − 0.5\| ≤ 0.005 |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| GSS-REQ-001 | Draw a circle from a radius | `src/core/definitions/circle.ts:circle`; `src/layout/circle.ts:circleLayout` (outline at `DRAWN_RADIUS`); `src/react/graphs/CircleGraph.tsx:CircleGraph` | Yes |
| GSS-REQ-002 | Accept a diameter or a circumference in place of a radius | `src/core/definitions/circle.ts:circle` `derivations` (members `CIRCLE_MEASUREMENTS`, radius → diameter → circumference, `required: true`) | Yes |
| GSS-REQ-003 | Optionally draw the radius | `src/core/definitions/circle.ts:circle` `showRadius`, `circleDisplay`; `src/layout/circle.ts:circleLayout` (lines 127, 136-139) | Yes |
| GSS-REQ-004 | Optionally draw the diameter | `src/core/definitions/circle.ts:circle` `showDiameter`, `circleDisplay`; `src/layout/circle.ts:circleLayout` (lines 128-135) | Yes |
| GSS-REQ-005 | Optionally mark the center | `src/core/definitions/circle.ts:circle` `showCenter`; `src/layout/circle.ts:circleLayout` (lines 140-152) | Yes |
| GSS-REQ-006 | Optionally label radius, diameter and circumference independently | `src/core/definitions/circle.ts:circle` `labelRadius` / `labelDiameter` / `labelCircumference`, `circleDisplay`; `src/layout/circle.ts:circleLayout` label loop | Yes |
| GSS-REQ-033 | Measurement label shows the value, then the unit when supplied | `src/layout/kit/measure.ts:measurementLabel` → `src/core/format.ts:formatMeasurement`; `src/core/definitions/circle.ts:circle.describe` | Yes |
| GSS-REQ-034 | Supplied values as supplied, derived values at the documented display precision | `src/core/format.ts:sourceOf` + `formatMeasurement`, used by `circle.describe` and `measurementLabel`; provenance reaches both through DEL-001 | Yes (documentation gap: CR-002) |
| GSS-REQ-035 | Custom label text in place of the measurement value | `src/core/definitions/circle.ts:circle` `radiusLabelText` / `diameterLabelText` / `circumferenceLabelText`, `circleDisplay`; `src/layout/kit/measure.ts:measurementLabel`; `circle.describe` states the value and quotes the text | Yes |
| GSS-REQ-036 | Text alternative naming the figure and each shown measurement | `src/core/definitions/circle.ts:circle.describe`; `src/layout/circle.ts:circleLayout` (`textAlternative`, line 201) | Yes (CR-001) |
| GSS-NFR-001 (circle part) | Radius : diameter drawn-length ratio within 1% of 1 : 2 | `tests/layout/circle.test.ts:104` "draws radius : diameter within 1% of 1 : 2" (fast-check, 100 runs), passed in `pnpm test` | Yes |

*The ticket's Requirements Covered field lists the ten REQs. GSS-NFR-001 comes from acceptance criterion 12 and is checked here the same way.*

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/TC-001 | No measuring; output computed from the description alone | Yes | Label boxes come from `textWidth` / `wrap` estimates (`src/layout/circle.ts:28-32`); no DOM access. The layout is pure, and the same description gives the same Scene (`tests/layout/circle.test.ts:261`) |
| prd/TC-002 | Round computed coordinates before writing them | Yes | Every numeric attribute goes through `fmt()`, including `besideOutline` trig results; `checkScene` passes on every Scene |
| prd/TC-003 / AD-008 | No ids or `url(#…)` | Yes | Only closed-set `REACT_PROP` attributes are used; `checkScene` rejects `url(`; `tests/layout/circle.test.ts:242` |
| prd/CC-002 | Text alternative for every graph | Yes | `circleDefinition.describe(normalized, provenance)` becomes `Scene.textAlternative`, printed as `aria-label` and `<title>` by `SceneSvg`. CR-001 is an inconsistency in the text, not a missing alternative |
| prd/TC-007 | Per-type entry points, side-effect-free modules | Yes | `./circle` entry; `CircleGraph` and the `definitions` table are `/* @__PURE__ */`. `tests/package/per-type-bundle.test.ts` shows another type's definition and layout are absent from the circle entry and component, and present in `Graph` |
| prd/TC-011 | SVG text does not wrap; the package breaks lines | Yes | Labels wrap at `LABEL_MAX_WIDTH` 160 (`src/layout/circle.ts:28-32`) and titles at the drawing width (`src/layout/kit/title.ts:51`). A probe confirmed long single words are broken and stay inside the 400-unit width |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-001 | One package, per-type entry points | Yes | `./circle` in `package.json` `exports`, `tsup.config.ts` and `.size-limit.json`. `pnpm attw` resolves `@gener8v/graph-generator/circle` |
| AD-002 | Pure `layout(normalized) → Scene` | Yes, with the recorded adjustment | Now `draw(normalized, provenance)` (DEL-001, the ticket's sanctioned RD-001 adjustment). The design text still shows one argument (CR-003) |
| AD-003 | In-house definition as single source | Yes | `src/core/definitions/circle.ts` holds `properties` (via `defineProperties`), `derivations`, `checks` and `describe`. `pnpm generate` output is committed and fresh (`tests/core/schema-shape.test.ts:302`) |
| AD-004 | Staged validator; defining order; 1% tolerance in the shared stage | Yes | The circle supplies only `derive`; the order comes from `CIRCLE_MEASUREMENTS`. The seven domain checks run in stage 4 and are skipped when an input failed earlier |
| AD-005 | `type` kebab case, properties camel case | Yes | `type: "circle"`, `radius`, `diameter`, `circumference`, `showRadius`…; issue paths are JSON Pointers |
| AD-007 | `fmt()` for every Scene number; separate display-value function | Yes | `fmt()` is used throughout. Display values reach `formatSupplied` / `formatDerived` through `formatMeasurement`, not the `displayValue()` AD-007 names (CR-002) |
| AD-008 | No element ids or `url(#…)` | Yes | As prd/TC-003 |
| AD-010 | System font stack, estimated metrics, ordered candidates via `placeLabel`, each placed label an obstacle | Yes | Ordered candidates per measurement; outline as 72 segment obstacles; segments, center mark and each placed label are obstacles (`src/layout/circle.ts:116-152`, `:188`). The no-candidate fallback is outside `placeLabel` (CR-004) |
| AD-011 | Inline presentation attributes, default style | Yes | `stroke`, `fill`, `font-*` come from `defaultStyle`; `lineColor` is resolved to hex by the validator and used for the outline, segments and center mark (`tests/layout/circle.test.ts:114`) |
| AD-014 | Pure components; fallback receives issues | Yes | `CircleGraph` is built by the unchanged `createGraphComponent` |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| GSS-REQ-001 | `@spec GSS-REQ-001` | `src/core/definitions/circle.ts:circle` (line 101); `src/layout/circle.ts:circleLayout` (line 90); `src/react/graphs/CircleGraph.tsx:CircleGraph` (line 10) | Yes |
| GSS-REQ-002 | `@spec GSS-REQ-002` | `src/core/definitions/circle.ts:circle` (line 101) | Yes |
| GSS-REQ-003 | `@spec GSS-REQ-003` | `src/core/definitions/circle.ts:circleDisplay` (line 48), `circle` (line 101); `src/layout/circle.ts:circleLayout` (line 90) | Yes |
| GSS-REQ-004 | `@spec GSS-REQ-004` | `src/core/definitions/circle.ts:circleDisplay`, `circle`; `src/layout/circle.ts:circleLayout` | Yes |
| GSS-REQ-005 | `@spec GSS-REQ-005` | `src/core/definitions/circle.ts:circle`; `src/layout/circle.ts:circleLayout` | Yes |
| GSS-REQ-006 | `@spec GSS-REQ-006` | `src/core/definitions/circle.ts:circleDisplay`, `circle`; `src/layout/circle.ts:circleLayout` | Yes |
| GSS-REQ-033 | `@spec GSS-REQ-033` | `src/core/definitions/circle.ts:circle.describe` (line 158); `src/layout/kit/measure.ts:measurementLabel` (line 11); `src/layout/circle.ts:circleLayout` | Yes |
| GSS-REQ-034 | `@spec GSS-REQ-034` | `src/core/definitions/circle.ts:circle.describe`; `src/layout/kit/measure.ts:measurementLabel`; `src/layout/circle.ts:circleLayout` | Yes |
| GSS-REQ-035 | `@spec GSS-REQ-035` | `src/core/definitions/circle.ts:circleDisplay`, `circle`; `src/layout/kit/measure.ts:measurementLabel`; `src/layout/circle.ts:circleLayout` | Yes |
| GSS-REQ-036 | `@spec GSS-REQ-036` | `src/core/definitions/circle.ts:circle.describe`; `src/layout/circle.ts:circleLayout` | Yes |

**Coverage:** 10 of 10 requirements annotated. Each annotation sits on the line directly above its declaration, or directly above the `describe:` property after its JSDoc.
**Missing:** None
**Specification table:** Yes. `## @spec Coverage` in `.gener8v/specifications/geometric-shapes-and-solids.md` lists exactly these locations, plus the GSS-NFR-001 test row. The CPSE-REQ-004 (`src/entries/circle.ts`) and CPSE-REQ-007 (`src/react/graphs/CircleGraph.tsx:CircleGraph`) annotations are appended as rows to `.gener8v/specifications/component-packaging-and-source-export.md`.

### Verification Run

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm install --frozen-lockfile` | 0 | Yes (lockfile up to date) |
| `pnpm generate` | not re-run (it writes source files) | Yes. Freshness is proven inside `pnpm test` by "are committed exactly as a fresh build writes them" (`tests/core/schema-shape.test.ts:302`), which passed |
| `pnpm lint` | 0 | Yes |
| `pnpm typecheck` | 0 | Yes |
| `pnpm test` | 0 | Yes (27 files, 713 tests passed) |
| `pnpm build` | 0 | Yes (`dist/circle.js`, `dist/circle.d.ts`) |
| `pnpm check:dist` | 0 | Yes (7 built files scanned, no network APIs or modules) |
| `pnpm check:deps` | 0 | Yes (0 runtime dependencies) |
| `pnpm size` | 0 | Yes (`.` 14.24 kB / 120 kB; `./core` 11.53 kB / 25 kB; `./circle` 14.2 kB / 25 kB) |
| `pnpm publint` | 0 | Yes (All good) |
| `pnpm attw` | 0 | Yes (`@gener8v/graph-generator/circle` resolves under the esm-only profile) |
| `pnpm audit` | 0 | Yes (No known vulnerabilities) |
| `python3 …/gener8v-state.py lint` | 0 | Yes (0 errors, 0 warnings) |

*The working tree was unchanged after every command (`git status`: only `.gener8v/runs.jsonl`, which the hooks write).*

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | This is the RD-001 adjustment the ticket's Known Hazard anticipates. Provenance travels beside the description as the data model intends, and `describeNormalized` is not exported from `./core`. It is not yet reflected in `system-design.md` or downstream ticket Outputs (CR-003) |
| DEL-002 | Reasonable | The table is pure-marked; `propertiesOf` and `describeNormalized` have no default registry (grep finds no `= definitions` default left in `src` or `scripts`). It is proven by the extended `tests/package/per-type-bundle.test.ts` for both the `./circle` entry and the component |
| DEL-003 | Reasonable | It answers carried GSV TICKET-003 CR-007. The rule is applied the same way in `describe` (`cleanText(text) === ""`) and in the layout (`measurementLabel` cleans, then `text === ""` skips), is documented in each `…LabelText` description, and is tested (`tests/core/circle.test.ts:135`, `tests/layout/circle.test.ts:161`) |
| DEL-004 | Reasonable | It gives one shared title block for every type. Its rule that a blank-after-cleaning title is no title is not mirrored in `circle.describe` (CR-001) |
| DEL-005 | Reasonable | Seven `agrees` checks are built with `createIssue`, read only top-level inputs, and do constant work. Their messages read plainly (`radiusLabelText ("r") disagrees with labelRadius; …`), and each pair is tested (`tests/core/circle.test.ts:112-123`) |

*Deviations from the plan:*
- *Seven checks rather than three:* behaviour-neutral.
- *`sourceOf` in `src/core/format.ts`:* keeps that module import-free, as its header requires.
- *No title obstacle:* the candidate bounds keep labels below the title.
- *Extra envelope test:* pins the `internal_error` path.
- *Prop types exported from `./circle`:* additive.

*None of these affects traceability. One change is not listed among them: labels reach the precision rule through `formatMeasurement` instead of `displayValue()` (CR-002).*

## Findings

### CR-001: A whitespace-only title is not drawn, but the text alternative says the circle is titled “”

**Severity:** Issue
**Location:** `src/core/definitions/circle.ts:165` (`circle.describe`); compare `src/layout/kit/title.ts:48-49` (`titleBlock`)
**Traces To:** GSS-REQ-036; prd/CC-002; GSV Edge Cases ("Label text is empty → treat as no label"); DEL-003 and DEL-004 ("blank after cleaning counts the same"); ticket Known Hazard (vertical slice: every other type copies this ticket)
**Description:** The validator drops only an exactly empty presentation string (`src/core/validate/structure.ts`, `value === "" && presentation`). So `title: "   "` is valid and stays in the normalized description. `titleBlock` cleans it, finds it blank and draws nothing. `circle.describe`, however, tests only `circle.title === undefined` and quotes what is left.

Reproduced: `createGraph({ type: "circle", radius: 5, title: "   " })` gives no title node and the text alternative `A circle titled “” with radius 5.`

The same delivery treats blank-after-cleaning custom label text consistently in `describe` and in the layout (DEL-003). Only the title disagrees.
**Impact:** A screen-reader user is told about a title the figure does not show. The circle's `describe` is the pattern the square, triangle, cube and cylinder tickets will copy, so the mismatch would spread to every figure.
**Recommendation:** In `circle.describe`, treat a title that is blank after `cleanText` as absent, using the same test `titleBlock` uses. Add a `title: "   "` case to `tests/core/circle.test.ts`, and note the rule beside DEL-004 for later types. If the user prefers fixing it at the source, the alternative is to have the validator omit blank-after-cleaning presentation text. That is a GSV change, so it would become a ticket.
**Status:** Resolved
**Resolution:** Approved. `circle.describe` treats a title that is blank after `cleanText` as absent, as `titleBlock` does. Test added (fails without the fix). Rule passed to later types through the CR-003 Known Hazard.

---

### CR-002: Labels take the display precision through `formatMeasurement`, not `displayValue()`, and this is not recorded

**Severity:** Observation
**Location:** `src/layout/kit/measure.ts:12` (`measurementLabel`); `src/layout/kit/format.ts:50` (`displayValue`)
**Traces To:** Acceptance criterion 7; AD-007; ticket Known Hazard (graph-library/component-packaging-and-source-export-ticket-002-code-review/CR-005); GSS-REQ-034; GSS OQ-005
**Description:** Acceptance criterion 7 and the carried CR-005 hazard say displayed values come from `displayValue(n, provenance)` in `src/layout/kit/format.ts`. AD-007 also names `displayValue()` as the display-value function. `measurementLabel` calls `formatMeasurement` in `src/core/format.ts` instead.

Both reach the same `formatSupplied` / `formatDerived`. So there is no second rounding rule, and labels state the same numbers as the text alternative, which is what the hazard is for. Three things are left unrecorded:
- `displayValue` now has no production caller. Only `tests/layout/kit/format.test.ts` and `tests/fixtures/layouts.ts` use it.
- The record's AC 7 line restates the criterion as "derived via `formatDerived`", and the change is not listed under Deviations.
- Derived values below 0.005 keep two significant figures. For example, radius 0.001 labels the diameter "0.002", which is more than "at most 2 decimal places". The hazard sanctions this, but the spec's OQ-005 assumption ("up to 2 decimal places, trailing zeros removed") is the precision GSS-REQ-034 calls "documented", and it does not mention the exception.
**Impact:** None on behaviour. Later type tickets (TICKET-003, TICKET-005..007) read AD-007 and the hazard, and may call `displayValue` beside `measurementLabel`, leaving two display entry points. The documented precision does not describe what labels show for very small figures.
**Recommendation:**
- Record the route as a deviation in the delivery record.
- Either remove `displayValue`, or name `measurementLabel` / `formatMeasurement` as the single display entry point.
- Raise an AD-007 wording amendment (Technical Design) and an update to the GSS OQ-005 assumption (Specification), so the documented rule includes the small-value exception.
**Status:** Resolved
**Resolution:** Approved: recorded as a deviation in the delivery record. `measurementLabel` is documented as the one entry point for label text, and `displayValue`'s doc points to it. Known Hazard on GSS TICKET-003, 005, 006, 007. AD-007 / OQ-005 wording left for the next Technical Design / Specification amendment.

---

### CR-003: DEL-001's two-argument contract is not in the technical design or in downstream tickets, and TypeScript does not enforce it

**Severity:** Observation
**Location:** `src/layout/registry.ts` (`Layout`); `src/core/definitions/types.ts` (`GraphTypeDefinition.describe`)
**Traces To:** DEL-001; AD-002; technical design Component Design (Text alternatives, Layouts); ticket Known Hazard (RD-001, the one expected contract adjustment)
**Description:** DEL-001 makes the contract `describe(normalized, provenance)` and `Layout = draw(normalized, provenance)`, as the ticket allows. Several documents still give the one-argument form:
- `.gener8v/technical-design/system-design.md` still states `layout(normalized) → Scene` (AD-002, and the Layouts interface).
- The same file still states `describe(normalized: NormalizedDescription) → string` (Text alternatives interface).
- The Outputs of graph-library/number-lines-and-coordinate-graphs/TICKET-003 and TICKET-004 still say `layout(normalized) → Scene`.

TypeScript accepts a function with fewer parameters where more are expected. So a later `Layout<Square> = (normalized) => …` or `describe: (normalized) => …` compiles, and that type then has no provenance to tell a supplied value from a derived one.
**Impact:** A later type planned from the design or from its own Output can drop the provenance with no type error. GSS-REQ-034 would then regress for that type: supplied values would be shown rounded, without any failing check unless that type's tests cover it.
**Recommendation:** Raise a Technical Design amendment of AD-002 and the two Component Design interfaces to the two-argument contract. Also add a Known Hazard to the downstream type tickets pointing at DEL-001; the delivery record's Notes alone do not reach their Prior Art.
**Status:** Resolved
**Resolution:** Approved: Known Hazard on DEL-001 appended to DGP TICKET-002, 003, 005; GSS TICKET-003..007; NLC TICKET-002..004. The `system-design.md` wording is left for the next Technical Design amendment.

---

### CR-004: Labels with no clear spot are stacked below the figure, outside `placeLabel`, with nothing linking them to their measurement

**Severity:** Observation
**Location:** `src/layout/circle.ts:184-196` (the `unplaced` fallback)
**Traces To:** GSS Behaviors & Rules (Drawing: "the label should be placed next to the figure's outline"); acceptance criterion 8; AD-010
**Description:** When no candidate fits, the label is wrapped and stacked, centred, below the figure's label row, without `placeLabel` and without any mark of which measurement it labels. This happens with long custom text, or a long unit.

Reproduced: `radiusLabelText` and `circumferenceLabelText` both set to sentence-length prompts. The circle's bottom is at y 258.8, and two text blocks sit at y ≈ 288–394. A sighted reader cannot tell which is the radius label and which the circumference label.

The record's Notes acknowledge this, but no DEL or property description says it. In this case acceptance criterion 8 ("placed next to the outline using `placeLabel`") does not hold.
**Impact:** Low for ordinary labels: all short labels place normally, and the 300-run overlap property passes. For worksheet prompts written as long custom text, the drawing loses the link between label and measurement. The text alternative is unaffected.
**Recommendation:** Decide here, because the square, triangle and cylinder will copy this fallback. Either:
- accept and record it: a DEL, plus a sentence in each `…LabelText` description such as "text too long to fit beside the figure is placed below it"; or
- keep the link, for example by prefixing stacked text with its measurement name ("circumference: …").
**Status:** Resolved
**Resolution:** Approved: recorded as DEL-006 (Post-Review Amendments). The `…LabelText` descriptions say long text is placed below the figure, and the layout comment cites the decision. Vocabulary regenerated.

---

### CR-005: Custom label text replaces the unit as well as the value, and no decision or description says so

**Severity:** Observation
**Location:** `src/layout/kit/measure.ts:12-13` (`measurementLabel`); `src/core/definitions/circle.ts:67-73` (`labelText` descriptions)
**Traces To:** GSS-REQ-033; GSS-REQ-035; GSS Behaviors & Rules (Labels); GSV-REQ-009 (property descriptions are how a caller or model learns the vocabulary)
**Description:** The two requirements meet here:
- GSS-REQ-033: a label is "the measurement value, followed by its unit when a unit is supplied".
- GSS-REQ-035: custom text goes "in place of the measurement value".

`measurementLabel` returns the custom text alone, so `{ unit: "cm", circumferenceLabelText: "?" }` draws `?`, not `? cm`. The documented example draws `C = ?` beside a `cm` unit.

Dropping the unit is a defensible reading, since `r` should not become `r cm`. But no DEL records it, and the generated vocabulary suggests the opposite: the text is "shown in place of the radius value", and the unit is "shown after each measurement".
**Impact:** A caller, or a model reading the vocabulary, cannot predict whether the unit appears beside custom text. Every later figure inherits `measure.ts`'s answer.
**Recommendation:** Either:
- Record the rule as a DEL, say it in the `…LabelText` descriptions ("replaces the whole label, unit included; include a unit in the text if wanted"), and regenerate with `pnpm generate`; or
- If the Product Owner prefers `? cm`, append the cleaned unit to non-blank custom text in `measurementLabel` and update the tests.
**Status:** Resolved
**Resolution:** Approved: recorded as DEL-007. Custom text replaces the whole label, unit included. Descriptions, `measurementLabel` doc and a layout test say so. Vocabulary regenerated.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Approved | Blank title treated as absent in `describe`; test added | `src/core/definitions/circle.ts`, `tests/core/circle.test.ts` |
| CR-002 | Approved | Deviation recorded; single label entry point documented; Known Hazards | `src/layout/kit/measure.ts`, `src/layout/kit/format.ts`, GSS TICKET-003/005/006/007, delivery record |
| CR-003 | Approved | Known Hazard on DEL-001 appended to 11 graph-type tickets | DGP TICKET-002/003/005, GSS TICKET-003..007, NLC TICKET-002..004 |
| CR-004 | Approved | DEL-006 recorded; descriptions updated; regenerated | `src/core/definitions/circle.ts`, `src/layout/circle.ts`, `src/generated/*`, delivery record |
| CR-005 | Approved | DEL-007 recorded; descriptions and doc updated; test added; regenerated | `src/core/definitions/circle.ts`, `src/layout/kit/measure.ts`, `tests/layout/circle.test.ts`, `src/generated/*` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0 (5 resolved: 1 Issue fixed, 4 Observations resolved by recorded decisions and Known Hazards)
**Notes:** Resolved with the user (Thomas) on 2026-10-12, every recommendation approved.
- CR-001 is fixed and pinned by a test.
- CR-002, CR-004 and CR-005 are recorded in the delivery record (a deviation, DEL-006, DEL-007) and in the generated vocabulary.
- CR-002 and CR-003 are carried to every downstream graph-type ticket as Known Hazards.
- Two documentation follow-ups sit outside this review's remit: `system-design.md` (AD-002, AD-007, and the Text alternatives and Layouts interfaces) and the GSS OQ-005 assumption. They belong to the next Technical Design and Specification amendments.
- Re-verification passed: 715 tests, every command exit 0.
