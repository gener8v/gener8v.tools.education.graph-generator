# TICKET-002: Circle graph type (vertical slice) — Delivery Record

## Ticket Reference

**Ticket:** graph-library/geometric-shapes-and-solids/TICKET-002
**Change:** `.gener8v/changes/graph-library/change.md` — Approved when delivery started
**Specification:** `.gener8v/specifications/geometric-shapes-and-solids.md`
**Requirements Covered:**
- GSS-REQ-001: Draw a circle from a radius
- GSS-REQ-002: Accept a diameter or a circumference in place of a radius
- GSS-REQ-003: Optionally draw the radius
- GSS-REQ-004: Optionally draw the diameter
- GSS-REQ-005: Optionally mark the center
- GSS-REQ-006: Optionally label radius, diameter and circumference independently
- GSS-REQ-033: Measurement label shows value followed by unit when supplied
- GSS-REQ-034: Supplied values shown as supplied, derived values at the documented display precision
- GSS-REQ-035: Custom label text in place of the measurement value
- GSS-REQ-036: Text alternative naming the figure and each shown measurement
- GSS-NFR-001 (circle part): radius : diameter drawn-length ratio within 1% of 1 : 2 — verified by a geometry test on the rendered coordinates (TICKET-008 extends it to every figure)

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Specification GSS-REQ-001..006, 033..036, Behaviors & Rules, Edge Cases | present | `.gener8v/specifications/geometric-shapes-and-solids.md`, Approved 2026-10-04 | ✅ |
| Technical design AD-004, AD-005, AD-007, AD-008, AD-010, AD-011 | present | `.gener8v/technical-design/system-design.md` | ✅ |
| Definition contract (GSV TICKET-001) | `types.ts`, `index.ts`, `shared.ts`, `describe.ts` | present; `definitions` table empty; `defineProperties`, `Derivation`, `DomainCheck`, `GraphTypeDefinition<D>` | ✅ |
| Validator and derivation stage (GSV TICKET-003, TICKET-004) | `validate/index.ts`, `validate/derive.ts` | present; derivation picks the first supplied member, checks 1% tolerance, checks derived values against their own ranges, reports `contradiction` at the dependent member with `conflicts` = the defining member and `agreeingValue` | ✅ |
| Layout kit and renderer (CPSE TICKET-002) | `scene.ts`, `kit/format.ts`, `kit/text.ts`, `kit/labels.ts`, `SceneSvg.tsx` | present; also `kit/check.ts` (`checkScene`) and `kit/scale.ts` | ✅ |
| Layout registry and per-type factory (CPSE TICKET-003) | `layout/registry.ts`, `react/createGraphComponent.tsx` | present; `layouts` empty and pure-marked; `createGraphComponent(type, { definition, layout })` | ✅ |
| `examples/` directory | exists (ticket adds files to it) | absent — this ticket creates it with the first files | ✅ Created here |
| `src/entries/` directory | exists (ticket adds `circle.ts`) | absent — this ticket creates it; `tsup.config.ts` says type tickets add entries | ✅ Created here |
| Definition contract gives `describe` the provenance it needs for GSS-REQ-034 | `describe(normalized)` can tell supplied from derived values | **No:** `describe(normalized: D)` and `Layout(normalized: D)` receive no provenance, and provenance is kept beside the description, never inside it (`tests/core/validate-derive.test.ts`). Neither the text alternative nor the labels can show 31.4 "as supplied" vs a derived value | ⚠️ The contract does not fit — the expected RD-001 adjustment; raised as a Decision in the plan (not worked around locally) |
| `displayValue` precision vs the criterion "at most 2 decimal places" | one rule | `formatDerived` keeps 2 significant figures for a non-zero value that would round to 0 (`0.0012`) | ⚠️ Resolved by the carried hazard (CPSE TICKET-002 CR-005): follow `formatDerived`; no second rule |
| Carried: GSV-001 CR-002, QR-001, QR-002 (definition contract rules) | addressed here | — | 🔁 Carried — see plan |
| Carried: GSV-003 CR-007 (`""` custom label text) | decided here | — | 🔁 Carried — see plan |
| Carried: GSV-003 CR-004, QR-006 (envelope fallback test) | replaced here | `tests/core/validate-envelope.test.ts:71` | 🔁 Carried — see plan |
| Carried: GSV-003 SEC-001 (`maxItems`) | addressed here | the circle has no array property | ✅ Not applicable |
| Carried: GSV-004 CR-001, QR-001, QR-004 (group member ranges) | addressed here | — | 🔁 Carried — see plan |
| Carried: GSV-004 CR-003, SEC-004 (domain checks) | addressed here | — | 🔁 Carried — see plan |
| Carried: GSV-005 CR-001, QR-001, QR-002 (`examples/circle.json`, `pnpm generate`) | addressed here | — | 🔁 Carried — see plan |
| Carried: CPSE-002 CR-005 (display precision, `checkScene`, `pathData`) | addressed here | — | 🔁 Carried — see plan |
| Carried: CPSE-003 CR-002, CR-003, QR-002, QR-003 (per-type component, `Layout<Circle>`, GSV `definitions` leak) | addressed here | `definitions` built by unmarked calls; `propertiesOf` and `describeNormalized` default to it | 🔁 Carried — see plan |

**Resolved from ground truth (not escalated):**
- The tolerance check, the defining order and the derived-range check already live in the shared derivation stage (`src/core/validate/derive.ts`); the circle supplies only `derive`.
- The contradiction issue for `radius: 5, diameter: 12` is reported at `/diameter` with `conflicts: ["/radius"]` and `agreeingValue: 10`, which names both pointers and states the agreeing value as the criterion asks.
- The envelope's "every declared type" fallback is reachable only with an empty registry, which only tests construct.

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.`
**Plan approved by:** Engineer — Thomas, 2026-10-12

### Planned Files

- `src/core/definitions/circle.ts`: the circle definition. Measurements `radius` (0.001–1,000,000), `diameter` (0.002–2,000,000), `circumference` (0.006–6,283,186), chosen to agree. Options `showRadius`, `showDiameter`, `showCenter`; `labelRadius`, `labelDiameter`, `labelCircumference`; `radiusLabelText`, `diameterLabelText`, `circumferenceLabelText`; `unit`. Built with `defineProperties`; shared options not relisted. Derivation radius → diameter → circumference. Domain checks: label text implies its label; labeling the radius or diameter draws its segment; an explicit `false` contradicting either is a `contradiction`. `describe`: "A circle titled “Wheel” with radius 5 cm, diameter 10 cm and circumference 31.4 cm. Its center is marked, and its radius and diameter are drawn. The radius is labeled “r”." (radius always, plus each shown measurement).
- `src/core/definitions/index.ts`: register the circle; mark the table's construction `/* @__PURE__ */`; `propertiesOf` loses its default registry (DEL-002).
- `src/core/definitions/types.ts`: `describe(normalized, provenance)` (DEL-001).
- `src/core/describe.ts`: `describeNormalized(normalized, provenance, registry)`, no default registry; `describeWith` passes provenance.
- `src/core/validate/envelope.ts`: remove the "every declared type" fallback; `allowed` is the registered types.
- `src/layout/kit/measure.ts`: `measurementLabel(value, provenance, unit?, custom?)`, built on `formatMeasurement` (no second rounding rule).
- `src/layout/kit/title.ts`: shared wrapped-title block (DEL-004).
- `src/layout/circle.ts`: `circleLayout: Layout<Circle>`. Fixed drawn radius in the 400-unit space; radius horizontal right; diameter horizontal, vertical when the radius is shown; center dot; labels via `placeLabel` avoiding segments, outline pieces and each other; circumference label outside the outline; unplaceable labels stacked below; long text wrapped; title on top; `lineColor` honored; all numbers via `fmt`/`pathData`/`translate`.
- `src/layout/registry.ts`: `Layout = draw(normalized, provenance)`; register `circle`.
- `src/graph.ts`: pass provenance to the layout.
- `src/react/graphs/CircleGraph.tsx`: `/* @__PURE__ */ createGraphComponent("circle", { definition: circle, layout: circleLayout })`.
- `src/entries/circle.ts`, `src/index.ts`: export `CircleGraph`.
- `package.json` (`./circle`), `tsup.config.ts`, `.size-limit.json` (25 kB).
- `examples/circle.json` (every optional term once), `examples/invalid/circle-contradiction.json`, `examples/invalid/circle-negative-radius.json`.
- `src/generated/*`: regenerated with `pnpm generate`.
- `tests/fixtures/layouts.ts`, `tests/fixtures/definitions/circle.ts`, `tests/core/describe.test.ts`: follow the contract change.
- `tests/core/validate-envelope.test.ts`: replace the fallback test with `allowed` = registered types.
- `tests/package/per-type-bundle.test.ts`: second-type definition marker; the real `CircleGraph` bundle excludes other types' definitions and layouts.
- `tests/core/circle.test.ts`: derivation, tolerance, contradiction, range, domain checks, text alternative, definition rules.
- `tests/layout/circle.test.ts`: segment placement, labels, display precision, custom and blank labels, circumference placement, no overlaps, `checkScene`, no ids, 1 : 2 ratio.

### Decisions in the plan

- DEL-001: provenance passed to `describe` and to layouts (the RD-001 contract adjustment).
- DEL-002: the GSV `definitions` leak fixed here (pure-marked table, explicit registries).
- DEL-003: custom label text `""` is a blank label, kept; the text alternative says the label is left blank.
- DEL-004: `src/layout/kit/title.ts` added for the shared title block.

### How Acceptance Criteria Will Be Met

- Radius 5 validates with derived diameter 10 and circumference ≈ 31.4159 and provenance: `tests/core/circle.test.ts`.
- Diameter alone or circumference alone derives the other two: `tests/core/circle.test.ts`.
- 31.4 accepted; diameter 12 gives one `contradiction` naming `/radius` and `/diameter` with the agreeing value: `tests/core/circle.test.ts`.
- Zero or negative values give `out_of_range` and nothing drawn: `tests/core/circle.test.ts`, `createGraph` result.
- Radius segment right, diameter off the radius, center marked: `tests/layout/circle.test.ts`.
- Independent labels, unit, custom text with the value still in the text alternative: `tests/layout/circle.test.ts`.
- Supplied as supplied, derived via `formatDerived`, rule in `measure.ts`: `tests/layout/circle.test.ts`.
- Circumference label next to the outline via `placeLabel`: `tests/layout/circle.test.ts`.
- Text alternative names the circle and every shown measurement with its unit: `tests/core/circle.test.ts`.
- `fmt()` everywhere, no ids or `url(#…)`: `checkScene` in `tests/layout/circle.test.ts`.
- `CircleGraph` renders the example identically to `Graph`; `./circle` entry and size budget: `tests/react/Graph.test.tsx`, `tests/package/entries.test.ts`, `pnpm size`.
- Radius : diameter within 1% of 1 : 2: `tests/layout/circle.test.ts`.

## Progress

- [x] `src/core/definitions/types.ts`, `src/core/describe.ts`, `src/layout/registry.ts`, `src/graph.ts` — provenance contract (DEL-001)
- [x] `src/core/definitions/index.ts` — circle registered, pure-marked table, explicit registry (DEL-002)
- [x] `src/core/definitions/circle.ts`
- [x] `src/core/validate/envelope.ts`
- [x] `src/layout/kit/measure.ts`
- [x] `src/layout/kit/title.ts`
- [x] `src/layout/circle.ts`
- [x] `src/react/graphs/CircleGraph.tsx`, `src/entries/circle.ts`, `src/index.ts`
- [x] `package.json`, `tsup.config.ts`, `.size-limit.json`
- [x] `examples/circle.json`, `examples/invalid/circle-contradiction.json`, `examples/invalid/circle-negative-radius.json`
- [x] `src/generated/*`
- [x] test fixtures and existing tests updated
- [x] `tests/core/circle.test.ts`
- [x] `tests/layout/circle.test.ts`
- [x] `tests/package/per-type-bundle.test.ts`

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/core/definitions/circle.ts`: new — the circle definition (`Circle`, `circle`, `circleDisplay`, `CIRCLE_MEASUREMENTS`): three measurements with agreeing ranges, nine options and `unit`, the radius → diameter → circumference derivation, seven domain checks, and `describe(normalized, provenance)`
- `src/core/definitions/index.ts`: circle registered; table construction marked `/* @__PURE__ */`; `propertiesOf` takes its registry explicitly (DEL-002)
- `src/core/definitions/types.ts`: `GraphTypeDefinition.describe(normalized, provenance)` (DEL-001)
- `src/core/describe.ts`: `describeNormalized(normalized, provenance, registry)`, no default registry; `describeWith` passes the provenance
- `src/core/format.ts`: `sourceOf(provenance, term)`
- `src/core/validate/envelope.ts`: the "every declared type" fallback removed; `allowed` is the registered types
- `src/layout/registry.ts`: `Layout = draw(normalized, provenance)`; circle registered
- `src/graph.ts`: passes the provenance to the layout
- `src/layout/kit/measure.ts`: new — `measurementLabel(value, provenance, unit?, custom?)`
- `src/layout/kit/title.ts`: new — `titleBlock`, `textLines`, `SCENE_MARGIN`, `LINE_HEIGHT` (DEL-004)
- `src/layout/circle.ts`: new — `circleLayout: Layout<Circle>`, `DRAWN_RADIUS`
- `src/react/graphs/CircleGraph.tsx`: new — pure-marked `CircleGraph`
- `src/entries/circle.ts`: new — the `./circle` entry (component and prop types)
- `src/index.ts`: exports `CircleGraph`
- `package.json`, `tsup.config.ts`, `.size-limit.json`: `./circle` entry, build entry and 25 kB budget
- `examples/circle.json`, `examples/invalid/circle-contradiction.json`, `examples/invalid/circle-negative-radius.json`: new
- `src/generated/description.ts`, `schema.json`, `tool-schema.json`, `vocabulary.json`: regenerated with `pnpm generate`
- `tests/core/circle.test.ts`: new (34 tests)
- `tests/layout/circle.test.ts`: new (22 tests, two of them property tests)
- `tests/package/per-type-bundle.test.ts`: second-type definition marker; the circle entry and component exclude other types
- `tests/core/validate-envelope.test.ts`: fallback test replaced (registered types exactly; an empty registry is `internal_error`)
- `tests/core/describe.test.ts`, `tests/core/definitions.test.ts`, `tests/fixtures/layouts.ts`, `tests/react/Graph.test.tsx`: follow the contract change

## Verification Run

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm install --frozen-lockfile` | 0 | lockfile unchanged |
| `pnpm generate` | 0 | four `src/generated` files rewritten and committed; a second run leaves them unchanged |
| `pnpm lint` | 0 | — |
| `pnpm typecheck` | 0 | — |
| `pnpm test` | 0 | 27 files, 713 tests passed (630 → 653 at CPSE TICKET-003, +60 here) |
| `pnpm build` | 0 | `dist/circle.js` and `dist/circle.d.ts` built |
| `pnpm check:dist` | 0 | 7 built files scanned, no network APIs or modules |
| `pnpm check:deps` | 0 | 0 runtime dependencies |
| `pnpm size` | 0 | `.` 14.24 kB / 120 kB; `./core` 11.53 kB / 25 kB; `./circle` 14.2 kB / 25 kB |
| `pnpm publint` | 0 | All good |
| `pnpm attw` | 0 | `@gener8v/graph-generator/circle` resolves under the esm-only profile |
| `pnpm audit` | 0 | No known vulnerabilities |
| `python3 …/gener8v-state.py lint` | 0 | 0 errors, 0 warnings |

Mutation checks (each broken on purpose, then restored): disabling the domain checks fails 7 tests; dropping "a label draws its segment" fails 6; forcing every value to "derived" fails one test in `describe` and one in the layout; never turning the diameter vertical fails 1; dropping the bounds filter fails 1; removing the table's pure marks or restoring `propertiesOf`'s default registry fails the bundle test. See Notes for the survivors.

## Acceptance Criteria Verification

- [x] `{ "type": "circle", "radius": 5 }` validates with diameter 10, circumference ≈ 31.4159, radius supplied and the others derived — `tests/core/circle.test.ts` "derives diameter and circumference from a radius, with provenance"
- [x] Diameter alone or circumference alone derives the other two — `tests/core/circle.test.ts` "from a diameter alone", "from a circumference alone"
- [x] `radius: 5, circumference: 31.4` accepted; `radius: 5, diameter: 12` gives one `contradiction` at `/diameter` with `conflicts: ["/radius"]` and "a value of 10 would agree" — `tests/core/circle.test.ts`
- [x] Zero or negative radius, diameter or circumference gives `out_of_range` and `createGraph` returns no scene — `tests/core/circle.test.ts` (6 cases)
- [x] `showRadius` draws center → right to the circumference; `showDiameter` through the center, vertical when the radius is drawn; `showCenter` marks the center — `tests/layout/circle.test.ts` "circle segments"
- [x] Independent labels, value then unit, custom text replacing the value while the text alternative states it — `tests/layout/circle.test.ts` "labels each measurement independently", "replaces the value with custom text…"
- [x] Supplied values as supplied (31.4, 1.2345), derived via `formatDerived` (31.42, 2.47), rule reached through `src/layout/kit/measure.ts` — `tests/layout/circle.test.ts`, `tests/core/circle.test.ts`
- [x] Circumference label next to the outline via `placeLabel`, outside it — `tests/layout/circle.test.ts` "places the radius label beside the radius, and the circumference label next to the outline"
- [x] Text alternative names the circle and every shown measurement with its unit — `tests/core/circle.test.ts` "circle text alternative"
- [x] Every Scene number through `fmt()`; no ids or `url(#…)` — `checkScene` on every Scene in `tests/layout/circle.test.ts`, plus the example's markup
- [x] `CircleGraph` renders the example and `Graph` renders identical markup; `./circle` entry and size budget exist — `tests/react/Graph.test.tsx` package test, `tests/package/entries.test.ts`, `pnpm size`, `pnpm attw`
- [x] Radius : diameter within 1% of 1 : 2 — `tests/layout/circle.test.ts` property test over radii 0.001–1,000,000 (GSS-NFR-001, this figure)

## Decisions Made

### DEL-001: Provenance is passed to `describe` and to layouts

**Context:** GSS-REQ-034 requires labels and the text alternative to show a supplied value as written and a derived one rounded. `describe(normalized)` and `Layout(normalized)` received no provenance, and provenance is deliberately kept beside the description, never inside it. This is the circle slice's expected contract adjustment (RD-001).
**Decision:** `GraphTypeDefinition.describe(normalized, provenance)`, `Layout = draw(normalized, provenance)`, `describeNormalized(normalized, provenance, registry)`. `createGraphWith` and `describeWith` pass the provenance they already hold. `sourceOf(provenance, term)` in `src/core/format.ts` reads one value's source; a value missing from the provenance counts as derived.
**Rationale:** It keeps the normalized description plain caller data, uses what the validator already returns, and changes no public signature except `describeNormalized`, which is internal.
**Ticket Impact:** Every later type's `describe` and layout take the provenance as their second argument. Per the ticket's Known Hazard, any further change to `GraphTypeDefinition` is a breaking change.

### DEL-002: The GSV `definitions` leak is fixed here

**Context:** The ticket allowed fixing it here (as a DEL) or in a separate ticket. With an unmarked table and default registries, the `./circle` bundle would keep every type's definition once a second type lands.
**Decision:** The table's construction is marked `/* @__PURE__ */`. `propertiesOf` and `describeNormalized` take their registry explicitly; the one test that relied on the default now passes `fixtureRegistry`. `tests/package/per-type-bundle.test.ts` injects a second type's definition marker and checks that the circle entry and component leave it out, while `Graph` keeps it.
**Rationale:** Fixing it in the slice means no type ever ships with the leak, and the per-type budgets (CPSE TICKET-004) measure what they claim to.
**Ticket Impact:** Every call site passes a registry. Later types add one entry to the table and inherit the guarantee.

### DEL-003: Empty custom label text is a blank label

**Context:** Carried GSV TICKET-003 CR-007: decide whether `""` on custom measurement label text means no label or a blank label.
**Decision:** A blank label. The value is kept in the normalized description, nothing is drawn in the label's place (a radius with blank text still draws its segment), and the text alternative says "The radius label is left blank." Text that is blank after cleaning counts the same. No flag is added to `StringValue`.
**Rationale:** It supports worksheet blanks, and a caller who wants no label simply leaves the option out.
**Ticket Impact:** The square, triangle, cube and cylinder label texts follow the same rule.

### DEL-004: A shared title block in the layout kit

**Context:** The shared `title` option applies to every graph type, and the layout must draw it; the ticket's Output named no place for it.
**Decision:** `src/layout/kit/title.ts`: `titleBlock(title)` (wrapped, centered, bold, with its height), `textLines(...)` for multi-line text, `SCENE_MARGIN` and `LINE_HEIGHT`.
**Rationale:** Every type draws a title and multi-line labels. One helper keeps them identical and stops each type ticket copying the code.
**Ticket Impact:** Later layouts use it, and its constants, instead of their own.

### DEL-005: Label switches, implied segments and their contradictions

**Context:** GSS-REQ-006 and GSS-REQ-035 ask for independent labels and custom text, and the specification leaves the option shape open.
**Decision:** `labelRadius`, `labelDiameter` and `labelCircumference` (booleans) plus `radiusLabelText`, `diameterLabelText` and `circumferenceLabelText` (strings). Custom text labels its measurement, and a labeled radius or diameter is drawn, because its label sits on its segment. An explicit `false` against either rule is a `contradiction` (seven `DomainCheck`s, one per pair, since a check runs only when all its inputs are present). The shared rule lives in `circleDisplay`, which both `describe` and the layout read.
**Rationale:** A model can label a measurement with one option, and an explicit "don't draw" never silently loses to a label.
**Ticket Impact:** The first real use of `DomainCheck`. The square and cylinder can copy the `agrees` pattern.

## Deviations from Plan

- **Seven domain checks rather than "three":** the plan's three rules, with each pair as its own check, since a domain check runs only when every input it names is present. No change to behaviour.
- **`sourceOf` in `src/core/format.ts`:** not in the plan. `describe` (core) and the layout both need it, and that module imports nothing.
- **No title obstacle:** the title is kept clear by the label candidates' bounds rather than as an obstacle. Mutation testing showed the obstacle was never decisive.
- **Extra test:** `tests/core/validate-envelope.test.ts` also checks that an empty registry is reported as `internal_error`, the behaviour after the fallback's removal.
- **`./circle` exports the prop types too** (`Fallback`, `GraphComponent`, `GraphProps`), so a consumer importing only the circle can type its props.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| GSS-REQ-001 | `src/core/definitions/circle.ts:circle`; `src/layout/circle.ts:circleLayout`; `src/react/graphs/CircleGraph.tsx:CircleGraph` | `@spec GSS-REQ-001, …` |
| GSS-REQ-002 | `src/core/definitions/circle.ts:circle` | `@spec GSS-REQ-001, GSS-REQ-002, …` |
| GSS-REQ-003 | `src/core/definitions/circle.ts:circleDisplay`, `circle`; `src/layout/circle.ts:circleLayout` | `@spec GSS-REQ-003, …` |
| GSS-REQ-004 | `src/core/definitions/circle.ts:circleDisplay`, `circle`; `src/layout/circle.ts:circleLayout` | `@spec GSS-REQ-004, …` |
| GSS-REQ-005 | `src/core/definitions/circle.ts:circle`; `src/layout/circle.ts:circleLayout` | `@spec GSS-REQ-005, …` |
| GSS-REQ-006 | `src/core/definitions/circle.ts:circleDisplay`, `circle`; `src/layout/circle.ts:circleLayout` | `@spec GSS-REQ-006, …` |
| GSS-REQ-033 | `src/core/definitions/circle.ts:circle.describe`; `src/layout/kit/measure.ts:measurementLabel`; `src/layout/circle.ts:circleLayout` | `@spec GSS-REQ-033, …` |
| GSS-REQ-034 | `src/core/definitions/circle.ts:circle.describe`; `src/layout/kit/measure.ts:measurementLabel`; `src/layout/circle.ts:circleLayout` | `@spec GSS-REQ-034, …` |
| GSS-REQ-035 | `src/core/definitions/circle.ts:circleDisplay`, `circle`; `src/layout/kit/measure.ts:measurementLabel`; `src/layout/circle.ts:circleLayout` | `@spec GSS-REQ-035, …` |
| GSS-REQ-036 | `src/core/definitions/circle.ts:circle.describe`; `src/layout/circle.ts:circleLayout` | `@spec GSS-REQ-036, …` |
| GSS-NFR-001 (circle) | `tests/layout/circle.test.ts` "draws radius : diameter within 1% of 1 : 2" | verifying test, not annotated |

## Notes

- **For every later type ticket:**
  - `describe` and the layout receive `(normalized, provenance)` (DEL-001). Read a value's source with `sourceOf(provenance, term)`, and state it with `formatMeasurement` in `describe` and `measurementLabel` in labels.
  - The layout calls its own definition's `describe` directly, never `describeNormalized`, so no registry is reached.
  - Draw the title with `titleBlock` (DEL-004).
  - Keep the `agrees` pattern for options that imply one another (DEL-005).
- **Surviving mutations, kept on purpose:**
  - Removing either "placed label becomes an obstacle" or the radius-segment obstacle is not caught, even by 4,000 runs of the overlap property test. The circle's label candidate regions never intersect.
  - Both are kept because AD-010 makes each placed label an obstacle, and the square and other types copy this layout.
  - Dropping the blank-label guard is behaviour-neutral, but it would build a box of width `-Infinity`.
- **Labels with no clear spot** beside their line (very long custom text) are stacked, wrapped, below the circle. They then no longer sit by their measurement; the text alternative still names it.
- **The per-type size budgets (CPSE TICKET-004) are now meaningful:** the `definitions` leak is closed (DEL-002). `./circle` is 14.2 kB, close to `.` (14.24 kB), because the circle is the only type.
- **The fixture circle** (`tests/fixtures/definitions/circle.ts`) stays as the validator's test stand-in; the package circle is separate.

## Post-Review Amendments

### Code review (graph-library/geometric-shapes-and-solids-ticket-002-code-review), resolved with Thomas, 2026-10-12

- **CR-001** (Issue, approved): `circle.describe` now treats a title that is blank after `cleanText` as absent, matching `titleBlock`. A whitespace-only title is no longer stated as "titled “”". Test added to `tests/core/circle.test.ts`; removing the fix fails it. Files: `src/core/definitions/circle.ts`, `tests/core/circle.test.ts`.
- **CR-002** (Observation, approved): **deviation recorded.** Labels take their precision through `measurementLabel` → `formatMeasurement`, not `displayValue` as acceptance criterion 7, AD-007 and the carried CR-005 hazard name. It is the same `formatSupplied` / `formatDerived`, so there is no second rounding rule. Derived values below 0.005 keep two significant figures (radius 0.001 → diameter "0.002"), as the hazard allows.
  - `measurementLabel`'s doc now names it as the one entry point for label text. `displayValue`'s doc points to it.
  - Known Hazard appended to GSS TICKET-003, TICKET-005, TICKET-006 and TICKET-007.
  - The wording of AD-007 and the GSS OQ-005 assumption should gain the small-value exception at the next Technical Design / Specification amendment; this review does not edit them.
  - Files: `src/layout/kit/measure.ts`, `src/layout/kit/format.ts`, the four ticket files.
- **CR-003** (Observation, approved): Known Hazard pointing at DEL-001 appended to every undelivered graph-type ticket (DGP TICKET-002, 003, 005; GSS TICKET-003..007; NLC TICKET-002..004):
  - write `describe` and the layout with the provenance;
  - TypeScript does not catch a dropped provenance argument;
  - call your own `describe` from the layout;
  - draw titles with `titleBlock`.
  `system-design.md` (AD-002; the Text alternatives and Layouts interfaces) still shows one argument. It should be updated at the next Technical Design amendment.
- **CR-004** (Observation, approved): **DEL-006 — labels with no clear spot are stacked below the figure.**
  - **Context:** a label with no clear candidate beside its line (very long custom text or unit) is wrapped and stacked below the figure, outside `placeLabel`, so acceptance criterion 8 does not hold in that case.
  - **Decision:** accepted and documented. Each `…LabelText` description now says "Text too long to fit beside the figure is placed below it"; the layout comment cites DEL-006. The text alternative still names each measurement.
  - **Ticket Impact:** later figures follow the same fallback (Known Hazard on GSS TICKET-003, 005..007).
  - Files: `src/core/definitions/circle.ts`, `src/layout/circle.ts`, `src/generated/*` (regenerated).
- **CR-005** (Observation, approved): **DEL-007 — custom label text replaces the whole label, unit included.**
  - **Context:** GSS-REQ-033 puts the unit after the value, and GSS-REQ-035 puts custom text in place of the value. The vocabulary did not say which wins.
  - **Decision:** custom text replaces the whole label, so "r" never reads "r cm". The `…LabelText` descriptions say so, and to add the unit to the text if wanted. `measurementLabel`'s doc says so too, and a layout test pins it.
  - Files: `src/core/definitions/circle.ts`, `src/layout/kit/measure.ts`, `tests/layout/circle.test.ts`, `src/generated/*` (regenerated).

**Re-verification:** all exit 0, with a clean `pnpm install --frozen-lockfile`.

| Command | Result |
|---|---|
| `pnpm lint`, `pnpm typecheck` | pass |
| `pnpm test` | 27 files, 715 tests |
| `pnpm build`, `pnpm check:dist`, `pnpm check:deps` | pass |
| `pnpm size` | `.` 14.32 kB, `./core` 11.59 kB, `./circle` 14.27 kB |
| `pnpm publint`, `pnpm attw`, `pnpm audit` | pass |
| `pnpm generate` | re-run, regenerated files committed |

### Quality review (graph-library/geometric-shapes-and-solids-ticket-002-quality-review), resolved with Thomas, 2026-10-13

- **QR-001** (Concern, fixed): the GSS-NFR-003 overlap property now generates full-length strings (`size: "max"`; the default capped them at 10 characters), so labels and titles wrap and labels are stacked. Its oracle shrinks each box rebuilt from rounded coordinates by 0.01, so touching lines no longer read as overlapping. File: `tests/layout/circle.test.ts`.
- **QR-002** (Concern, fixed): `src/layout/kit/title.ts` has its own tests in the new `tests/layout/kit/title.test.ts`, and `sourceOf` has cases in `tests/core/format.test.ts`.
- **QR-003** (Concern, fixed): whitespace-only custom label text (DEL-003, blank after cleaning) is pinned in both `describe` and the layout. Files: `tests/core/circle.test.ts`, `tests/layout/circle.test.ts`.
- **QR-004** (Concern, deferred → GSS TICKET-003): the figure-agnostic label code in `src/layout/circle.ts` stays where it is. A Known Hazard on GSS TICKET-003 asks the square to extract it into the layout kit, shaped by both figures, rather than copy it.
- **QR-005** (Suggestion, fixed): both registry tables use `satisfies Partial<Record<GraphType, …>>` with no cast, which rejects an incomplete entry (TS2740). The factory's casts are removed too, and the comments are updated. Files: `src/core/definitions/index.ts`, `src/layout/registry.ts`, `src/react/createGraphComponent.tsx`.
- **QR-006** (Suggestion, fixed): the circle's layout tests call `circleLayout` directly after `validate`, so a layout exception shows its stack. One test still goes through `createGraph`. File: `tests/layout/circle.test.ts`.
- **QR-007** (Suggestion, fixed): `besideOutline` reads exact unit directions (`OUTLINE_DIRECTIONS`), not rounded `cos`/`sin`, and is exported for a direct test of its candidates. Files: `src/layout/circle.ts`, `tests/layout/circle.test.ts`.
- **QR-008** (Suggestion, fixed): the blank-title test asserts every case it lists; the zero-width title is asserted rejected. File: `tests/core/circle.test.ts`.
- **QR-009** (Suggestion, fixed): the GSV-NFR-001 bench covers every registered type's `examples/<type>.json` as well as the fixtures. Circle: p95 0.024 ms. The stale "until TICKET-002 lands" comments are updated. Files: `tests/core/validate.bench.ts`, `tests/react/Graph.test.tsx`, `tests/fixtures/layouts.ts`, `tests/fixtures/definitions/index.ts`.

**Mutation checks:** each new test was checked by breaking its code on purpose, then restoring it. All eight breaks are caught: title weight, title width, title height, line spacing, `sourceOf`'s default for a missing value, `describe`'s blank-label rule, an inexact outline direction, and label candidates in the title band.

**Re-verification:** all exit 0.

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | lockfile unchanged |
| `pnpm generate` | no changes to `src/generated` |
| `pnpm lint`, `pnpm typecheck` | pass |
| `pnpm test` | 28 files, 733 tests |
| `pnpm bench` | every case under 5 ms at p95 |
| `pnpm build`, `pnpm check:dist`, `pnpm check:deps` | pass |
| `pnpm size` | `.` 14.31 kB, `./core` 11.59 kB, `./circle` 14.26 kB |
| `pnpm publint`, `pnpm attw`, `pnpm audit` | pass |
| `python3 …/gener8v-state.py lint` | 0 errors, 0 warnings |

### Security review (graph-library/geometric-shapes-and-solids-ticket-002-security-review), resolved with Thomas, 2026-10-13

- **SEC-001** (Medium, fixed): a valid circle of about 401 KB made `<Graph>` and `<CircleGraph>` throw during render, past the fallback.
  - The cause: a Scene of about 120,000 nodes spread into `createElement`'s arguments, and the layout's own argument spreads.
  - `SceneSvg` now passes children as one keyed array; keys are not printed, so the markup is unchanged. The layout uses loops instead of spreads.
  - **DEL-008 — labels and titles are cut at a fixed number of lines.**
    - **Context:** nothing bounded the Scene's size, because a caller string can be any length (GSV Edge Cases accept long labels).
    - **Decision:** `wrap(text, maxWidth, fontSize, maxLines)` stops once the lines are full and ends the last line in "…". Circle labels are capped at `LABEL_MAX_LINES` (4), and `titleBlock` caps every title at `TITLE_MAX_LINES` (3). The text alternative still states the full text. The label-text and shared `title` descriptions say so.
    - **Ticket Impact:** every later graph type wraps with `maxLines` and draws titles with `titleBlock`. A Known Hazard is on DGP TICKET-002, 003, 005; GSS TICKET-003..007; NLC TICKET-002..004.
  - Files: `src/react/SceneSvg.tsx`, `src/layout/circle.ts`, `src/layout/kit/text.ts`, `src/layout/kit/title.ts`, `src/core/definitions/circle.ts`, `src/core/definitions/shared.ts`, `src/generated/*` and `tests/fixtures/generated/description.ts` (regenerated); tests in `tests/react/SceneSvg.test.tsx`, `tests/react/Graph.test.tsx`, `tests/layout/circle.test.ts`, `tests/layout/kit/text.test.ts`, `tests/layout/kit/title.test.ts`, `tests/core/circle.test.ts`.
- **SEC-002** (Low, partly fixed, rest deferred): DEL-008 bounds the drawing's nodes and markup. The text alternative stays linear in the caller's text.
  - A validator length bound would change the GSV specification, so it is deferred to the Product Owner.
  - A Known Hazard on CPSE TICKET-007 asks it to cap the text alternative inside the tool `summary`.
- **SEC-003** (Low, fixed): new `stateMeasurement` in `src/core/format.ts` quotes a unit longer than 20 characters or with sentence punctuation, and `circle.describe` uses it.
  - **Deviation from the approved option's wording:** drawn labels keep `formatMeasurement`, so the drawing never shows quotation marks.
  - The plain-text fixtures run through every circle string in `tests/core/circle.test.ts`.
  - Files: `src/core/format.ts`, `src/core/definitions/circle.ts`, `tests/core/format.test.ts`, `tests/core/circle.test.ts`.
- **SEC-004** (Informational, fixed): `quoteText` neutralises every double-quote lookalike. Single marks and apostrophes are kept: replacing all of `\p{Quotation_Mark}` would corrupt "Tom's". A Known Hazard on CPSE TICKET-007 says quotation is not a boundary. Files: `src/core/format.ts`, `tests/core/format.test.ts`.

**Mutation checks:** each fix was broken on purpose, then restored, and every break fails its tests:
- either spread restored in `SceneSvg`;
- either line cap dropped;
- `wrap`'s early stop removed;
- `describe` using `formatMeasurement`;
- the old two-character `quoteText`.

**Re-verification:** all exit 0.

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | lockfile unchanged |
| `pnpm generate` | `src/generated/*` and `tests/fixtures/generated/description.ts` regenerated (descriptions) and committed |
| `pnpm lint`, `pnpm typecheck` | pass |
| `pnpm test` | 28 files, 754 tests |
| `pnpm bench` | circle p95 0.021 ms; every case under 5 ms |
| `pnpm build`, `pnpm check:dist`, `pnpm check:deps` | pass |
| `pnpm size` | `.` 14.73 kB, `./core` 11.83 kB, `./circle` 14.68 kB |
| `pnpm publint`, `pnpm attw`, `pnpm audit` | pass; no known vulnerabilities |
| `python3 …/gener8v-state.py lint` | 0 errors, 0 warnings |

### Trivial test fix — flaky timing bound (2026-10-14, approved by the user during the DGP TICKET-004 code review)

- `tests/layout/circle.test.ts` › "keeps the Scene small…for caller-sized text (security review SEC-001, SEC-002)": the 2,000 ms wall-clock assertion is removed. Under machine load (load average about 8) it failed most full-suite runs at 2.0–4.0 s while passing alone. The test keeps its bounds on text-node and total-node counts, which are what prove the SEC-001/002 fix: a 1 MB title and a 500 KB unit yield at most 15 text nodes.
- **Re-verification:** `pnpm test` — see the DGP TICKET-004 code review amendment for the full run.

