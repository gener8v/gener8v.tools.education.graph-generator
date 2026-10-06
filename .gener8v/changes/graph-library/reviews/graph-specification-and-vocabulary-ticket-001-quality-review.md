# TICKET-001: Definition format, shared presentation properties and default style — Quality Review

## Summary

Reviewed the nine files delivered for graph-library/graph-specification-and-vocabulary/TICKET-001 (branch `ticket/gsv-001`, delivery commit `3276f1e`). The `quality-reviewer` agent ran the findings phase in a fresh context. The code is small, strictly typed and well documented, and every verify and CI command passes when re-run. The weak points are in the contract that the validator, the schema generator and up to eleven type tickets will build on:
- `describe.ts` holds both the registry dispatcher and the helpers that type definitions import. The first type module therefore creates an import cycle, which a scratchpad probe shows failing when that module is loaded first.
- Whether a graph type carries a shared presentation option is recorded in two places, and nothing keeps them in step.
- `formatNumber` rounds every number to two decimals, so distinct small values read as 0. The tests pin none of these cases.

There are no performance concerns. 5 findings in total: 0 Critical, 3 Concerns, 2 Suggestions. The verdict below is provisional until resolution with the user.

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

Neighbours read for patterns and context: `src/core/issues.ts`, `src/core/result.ts`, `src/index.ts`, `src/tool/index.ts`, `src/export/index.ts`, `tests/core/issues.test.ts`, `tests/setup/build.ts`, `eslint.config.js`, `tsconfig.json`, `vitest.config.ts`, `package.json`, the ticket (`.gener8v/changes/graph-library/tickets/graph-specification-and-vocabulary/TICKET-001.md`), the design's Component Design and Data Model sections (`.gener8v/technical-design/system-design.md`), and the sibling review `.gener8v/changes/graph-library/reviews/graph-specification-and-vocabulary-ticket-002-quality-review.md` for calibration.

**Findings:** 5
**Critical:** 0 | **Concerns:** 3 | **Suggestions:** 2

## Quality Assessment

### Code Organization

**Rating:** Adequate
**Notes:** The five source modules follow the design's layout (AD-003, Component Design › Definitions):
- `types.ts` holds the format.
- `shared.ts` holds the shared options.
- `definitions/index.ts` holds the registry.
- `style.ts` stands alone.
- `describe.ts` dispatches through the registry.

The kinds are a discriminated union (`ValueSpec`), so an `enum` without `values` or an `array` without `items` is a compile error. That is a good use of the type system for a format that many tickets will write against. `pnpm lint` confirms there are no React or browser imports in `src/core`.

`types.ts` imports `Terms` from `src/core/issues.ts` (type-only, erased at build). The definition format therefore depends on the message module for a general "non-empty list" type. This is harmless at runtime and is not raised as a finding.

Two structural problems:
- **QR-001:** `describe.ts` has two responsibilities, and they point in opposite directions. It depends on the registry, and every registered type will depend on its helpers.
- **QR-002:** applicability of shared options is split between `appliesTo` and each definition's `properties`.

### Readability

**Rating:** Strong
**Notes:** Names follow AD-005: camel-cased terms and kebab-case type values. Every export has a doc comment that cites the requirement or decision behind it, and functions are a few lines each. The less obvious constructs are explained where they appear:
- `DomainCheck` uses an indexed-access type over a method signature (`{ check(…) }["check"]`) to get bivariance (DEL-006).
- `resolveColor` documents why alpha is rejected.

Small nits, not raised as findings:
- The `seriesStyles` initialiser (`([...] as const).map((style) => Object.freeze({ ...style }))`) is dense.
- `defaultStyle.colors.grid` is the only color without a doc comment.
- The fixture check in `tests/core/definitions.test.ts:64` returns `[]` on both branches. Its only purpose is to prove the parameter's type, and it does not say so.

"describe" and "description" each carry several meanings:
- **"description"** is the caller's JSON, a property's definition and a type's summary.
- **"describe"** is the text alternative here and the message formatters in `issues.ts`.

The design's Data Model fixes these names, so this is noted but not raised.

### Error Handling

**Rating:** Adequate
**Notes:** What works:
- `resolveColor` is total over `unknown`. Non-strings, prototype keys (`toString`, `constructor`), alpha hex, `rgb(…)` and surrounding whitespace all return `undefined`, which the validator turns into `unknown_color`.
- `describe` guards the lookup with `Object.hasOwn` and throws an `Error` that quotes the type with `JSON.stringify`. This matches the guard-and-throw pattern of `issueMessage` in `src/core/issues.ts`.
- The formatting helpers return "NaN" or "Infinity" for non-finite input. Normalized descriptions exclude such values, so this is acceptable.

Minor observation, not raised: `toLowerCase` maps the Kelvin sign (U+212A) to "k", so `resolveColor("BLACK")` returns `#000000` (probe). The result is still the fixed published hex, so this is harmless.

The weak point is QR-001. When the import cycle leaves a registry entry `undefined`, `describe` reports "No definition is registered for graph type "circle"", which misattributes a load-order defect to a missing registration.

### Test Coverage

**Rating:** Adequate
**Notes:** I ran the `context.md` verify commands (`## Repositories`, row `.`) and the extra checks from the delivery record's Verification Run. Environment: Node.js v24.1.0, pnpm 10.28.2, branch `ticket/gsv-001` at `3276f1e`.

| Command | Exit | Result |
|---------|------|--------|
| `pnpm lint` | 0 | no findings |
| `pnpm typecheck` | 0 | no errors |
| `pnpm test` | 0 | 8 files, 218 tests passed; per file in `tests/core` (verbose run): definitions 10, style 50, describe 12, issues 36. The global setup ran `tsup` |
| `pnpm build` | 0 | all entries and declarations emitted |
| `pnpm check:dist` | 0 | "Built files scanned: 4, no network APIs or network modules." |
| `pnpm size` | 0 | `./core` 1.24 kB minified and gzipped (budget 25 kB) |
| `pnpm publint` | 0 | "All good!" |
| `pnpm attw` | 0 | ESM-only profile; only problems in ignored resolutions |
| `pnpm check:deps` | 0 | "Runtime dependencies: 0, all justified." |
| `pnpm check:changesets` | 0 | "Changesets checked: 0." |

After the runs, `git status` showed no change to any tracked file except the hook-managed `.gener8v/runs.jsonl`, which was already modified before the runs. No coverage provider is installed, so I assessed coverage by reading the tests against the code. I confirmed two gaps with mutation probes on scratchpad copies of the tests.

Every acceptance criterion has a test, and the tests assert behaviour:
- The WCAG formula is checked against known values (21:1, 1:1, `#767676` at 4.54:1) before it judges the palette.
- Each of the 18 colors is a named parameterised case, so a failing color is named in the CI log.
- The `resolveColor` accept and reject lists include prototype keys and non-strings.
- Registry typing is checked at compile time.
- The vocabulary check runs over whatever is registered, so it will cover type tickets automatically.

Gaps:
- No test pins any lossy `formatNumber` case (QR-003).
- No test ties `appliesTo` to registered definitions (QR-002).
- The empty-enum rule is never asserted (QR-005).
- The mocked registry in `tests/core/describe.test.ts` cannot see the import cycle (QR-001).

### Observability & Operability

**Rating:** Adequate
**Notes:** This is pure library code, and the package forbids telemetry (CPSE-REQ-005), so having no logging or metrics is correct. The operable surfaces are:
- `describe`'s thrown error, which is specific and names the type. Under the QR-001 cycle it names the wrong cause.
- The contrast check, which reports each color as its own test case, so a palette change that breaks 3:1 is attributed to one color in CI output.

Nothing else to flag.

## Findings

### QR-001: `describe.ts` holds both the registry dispatcher and the helpers that type definitions import, so the first type module creates an import cycle that fails when that module is loaded first

**Category:** Maintainability
**Severity:** Concern
**Location:** `src/core/describe.ts:1` (imports the registry), `src/core/describe.ts:16-31` (the helpers), `src/core/definitions/index.ts:8` (the registry each type ticket extends), `tests/core/describe.test.ts:5-18` (registry mocked)
**Description:** `describe.ts` imports `definitions` from `src/core/definitions/index.ts`. Each type ticket will add `src/core/definitions/<type>.ts` to that registry (AD-003). That type's `describe` will import `formatNumber`, `formatList` or `formatMeasurement` from `describe.ts`, as the fixture in `tests/core/describe.test.ts:14-15` models. That closes a loop:

`describe.ts` → `definitions/index.ts` → `<type>.ts` → `describe.ts`

Whether the loop works depends on which module loads first. For the probe I copied `src/core` to the scratchpad. I added a minimal `circle.ts` that imports `formatMeasurement`, and registered it in the index:

| Entry module | Runtime | Result |
|--------------|---------|--------|
| `describe.ts` first | tsx (Node ESM) | works |
| `definitions/index.ts` first | tsx (Node ESM) | works |
| `circle.ts` first | tsx (Node ESM) | `ReferenceError: Cannot access 'circleDefinition' before initialization`, at load |
| `circle.ts` first | esbuild bundle (as tsup builds) | loads; the registry holds `circle: undefined`; `describe` throws "No definition is registered for graph type "circle"" |
| `circle.ts` first | Vitest | same as the bundle |

**Impact:** Importing a type's definition directly is the ordinary path. The type's own unit tests, its layout and its per-type component all do it. So the first type ticket, the circle slice (GSS TICKET-002), is likely to hit this. In Vitest and in bundles the symptom is a misleading "not registered" error, not a cycle error, so the cause is hard to find. The current suite cannot show the problem, because `describe.test.ts` replaces the registry with `vi.mock`.
**Recommendation:**
- Move the three helpers to a module that imports nothing, for example `src/core/format.ts`, and have type definitions import from it. `describe.ts` keeps only the dispatcher.
- Guard the rule next to the existing boundary rules in `eslint.config.js`: a `no-restricted-imports` pattern on `src/core/definitions/**` that forbids `../describe`.
- Move the helper tests to `tests/core/format.test.ts`.

This deviates from the ticket's Output, which names `describe.ts` for both the dispatcher and the helpers, so record it as a DEL. If the finding is deferred instead, the natural target is GSS TICKET-002 (the first type ticket), as a Known Hazard.
**Status:** Resolved
**Resolution:** Approved. The helpers moved to `src/core/format.ts`, which imports nothing; `describe.ts` keeps only the dispatcher. A lint rule forbids `src/core/definitions/**` from importing `describe`, with tests in `tests/package/boundaries.test.ts`. The deviation from the ticket's Output is recorded in the delivery record.

---

### QR-002: Whether a graph type carries a shared presentation option is recorded in two places, `appliesTo` and the definition's `properties`, and nothing keeps them in step

**Category:** Maintainability
**Severity:** Concern
**Location:** `src/core/definitions/shared.ts:6-10` (doc comment), `src/core/definitions/shared.ts:12-77` (`appliesTo` lists), `tests/core/definitions.test.ts:50` (fixture lists `title` in its own `properties`), `tests/core/definitions.test.ts:89-103` (registry tests)
**Description:** Two parts of the delivery describe the mechanism differently:
- The doc comment says a type ticket adds a shared option "by listing it in `appliesTo`, never by redefining them", and every `appliesTo` list is already filled in for all eleven types.
- The circle fixture, which the delivery record uses to show type tickets the full format, also lists `title: sharedProperties.title` in its own `properties`.

So a type ticket cannot tell whether to list shared options in `properties`, rely on `appliesTo`, or do both. If it does both, nothing checks that they agree. Probe: I mocked the registry with a circle definition whose `properties` holds `xAxisLabel`, whose `appliesTo` is `["xy-graph", "xyz-graph"]`. All 10 tests in `tests/core/definitions.test.ts` still pass.

"Never by redefining them" is not enforced either: a type can declare its own `title` spec with a different description and pass. DEL-001 defers duplicate-term checks to TICKET-005 and TICKET-006.
**Impact:** Two later tickets read applicability from these files: the validator's `inapplicable_property` check (TICKET-003) and the schema and vocabulary generator (TICKET-005). Up to eleven type tickets will write definitions against them.

Suppose the validator reads `appliesTo` and the generator reads `properties`, or the other way round. The published schema and the validator then disagree about which options a type accepts. That is the drift AD-003's single source is meant to prevent, and it is cheapest to settle before the first type lands.
**Recommendation:** Choose one rule now, and enforce it with a test that runs over every registered definition.
- **Preferred, one source:** definitions never list shared options.
  - Add a `propertiesOf(type)` function next to the registry. It merges a definition's `properties` with the shared options whose `appliesTo` includes the type.
  - Have the validator, the generator and `describe` all use it.
  - Add a test that fails if a definition's `properties` contains a shared term.
- **Alternative:** definitions list shared options. Add a test that checks each registered definition against each shared term: `properties[term] === sharedProperties[term]` (the same object, so the spec is not redefined) must hold exactly when `appliesTo` includes the type.

Update the doc comment and the fixture to match whichever rule is chosen. If the finding is deferred, TICKET-003 is the first consumer.
**Status:** Resolved
**Resolution:** Approved. One source (`propertiesOf` plus `appliesTo`/`elementsOf`), checked over every definition; see code review CR-002.

---

### QR-003: `formatNumber` rounds every number to two decimals, so distinct small values read as 0, and the tests pin none of its lossy cases

**Category:** Maintainability
**Severity:** Concern
**Location:** `src/core/describe.ts:16-20` (`formatNumber`), `tests/core/describe.test.ts:33-44`; related: `src/core/issues.ts:225` (`describeNumber`)
**Description:** `formatNumber` rounds every value with `Math.round(value * 100) / 100`. Probe outputs, from the real module:
- Thousandths in metres, through `formatMeasurement` and `formatList`: `[0.001, 0.002, 0.003, 0.004]` → "0 m, 0 m, 0 m and 0 m".
- Tiny values: `1.5e-7` → "0".
- Halves round asymmetrically and with binary error: `0.125` → "0.13", `-0.125` → "-0.12", `1.005` → "1".
- Large values: `1e21` → "999999999999999900000".

The doc comment does not say which numbers the helper is for. The two-decimal rule matches GSS OQ-005's assumption for *derived* values, but the specifications treat supplied values differently:
- GSS-REQ-034 shows a supplied value as it was supplied.
- The DGP specification shows a bar value "as supplied, without rounding".
- The NLC specification gives tick labels as many decimal places as the spacing needs.

Even so, the delivery record's Notes tell CPSE TICKET-002 to reuse this helper for `displayValue`.

A second "number for reading" policy already exists: `describeNumber` in `src/core/issues.ts:225` uses four significant figures. For 0.0314159, an issue message says "0.03142", while a text alternative would say "0.03".

The tests cover integers, a π-like value, `-0` and one negative. None of the cases above is pinned.
**Impact:** Text alternatives are the accessible reading of the figure (NLC-REQ-012, DGP-REQ-004, GSS-REQ-036). Decimal axes are accepted (NLC-REQ-003), so a number line in thousandths would be described as having every point at 0, while the drawing labels each point correctly. Every type ticket and the layout kit are told to call this one helper, so whatever policy it has now becomes the policy for the whole package.
**Recommendation:**
- Name each rounding policy for its purpose, and say in its doc comment when to use it. For example:
  - `formatDerived(value)`: two decimals, per GSS OQ-005.
  - `formatSupplied(value)`: the value as written, `-0` shown as "0", never exponent form.

  A `decimals` parameter would also work. Revisit the Note that points CPSE TICKET-002 at this helper for displayed values.
- Round half away from zero on the decimal representation, not on `value * 100`, so that `1.005` becomes "1.01" and negative halves match positive ones.
- Pin small values, positive and negative halves, and large values in the helper tests.
- Decide whether `describeNumber` in `src/core/issues.ts` should share the policy, so an issue message and a text alternative state the same number.
**Status:** Resolved
**Resolution:** Approved. `formatSupplied` (as written) and `formatDerived` (two decimals, half away from zero on the decimal digits, two significant figures for small non-zero values). The lossy cases are pinned in `tests/core/format.test.ts`. `describeNumber` in `issues.ts` stays separate, documented as stating a value to type in.

---

### QR-004: `sharedProperties` and `itemProperties` are the only constant tables in `src/core` that are not frozen at runtime

**Category:** Patterns
**Severity:** Suggestion
**Location:** `src/core/definitions/shared.ts:12-77`, `src/core/definitions/shared.ts:86-101`, `tests/core/style.test.ts:73-79`
**Description:** Every other published table in `src/core` is `Object.freeze`d, and its tests check that: `GRAPH_TYPES`, `PROPERTY_KINDS`, `ISSUE_CODES`, `issueDocs`, `namedColors`, `defaultStyle`, `seriesStyles` and `definitions`. `sharedProperties` and `itemProperties` rely on `as const`, which applies only at compile time. Probe: `Object.isFrozen` returns false for both maps, for `sharedProperties.lineColor`, and for its `appliesTo` array.

These spec objects are shared by reference. Every definition that carries a shared option holds the same object (`tests/core/definitions.test.ts:50`).

Separately, the "cannot be changed at runtime" test checks only `defaultStyle`, `defaultStyle.colors`, `namedColors`, `seriesStyles` and `seriesStyles[0]`. It does not check `lineWidths`, `fontSizes` or series 2 to 6, although the code does freeze all of them.
**Impact:** Low today, because TypeScript's readonly types stop typed callers from mutating these objects. But a generator or validator step that annotates a spec in place, or a JavaScript caller, would change that option for every graph type at once, and nothing would report it.
**Recommendation:**
- Freeze each spec and its `appliesTo` array, for example with a small `deepFreeze` applied to both maps.
- Make the freeze tests walk every nested object. The `visit` walker in `tests/core/style.test.ts:47-56` can be reused.
**Status:** Resolved
**Resolution:** Approved. `defineProperties` freezes every map and spec deeply on a null prototype, and the freeze tests walk every depth in both the definitions and style tests.

---

### QR-005: The vocabulary-check fixture contains a valid enum, so the empty-enum rule is never asserted

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/core/definitions.test.ts:34` (the rule), `tests/core/definitions.test.ts:121` (the fixture's `shape` enum)
**Description:** `valueProblems` reports "enum with no values". However, the bad fixture's `shape` enum has `values: ["a"]`, and the expected problem list has no entry for it. Probe: with line 34 deleted from a scratchpad copy of the test file, all 10 tests still pass. Unknown kinds are exercised only at array-item level (`/labels/items`), never on a top-level property.
**Impact:** Minor. `Terms` already makes an empty enum a type error in typed code, so the rule only matters for casts and future generated data. But the test's name claims it catches each problem, and a later edit to `valueProblems` could drop the rule without any test failing.
**Recommendation:** Set `values: []` on `shape` (or add a second, empty enum) and expect `"/shape: enum with no values"`. Optionally, add a top-level property with an unknown kind.
**Status:** Resolved
**Resolution:** Approved. The fixture now has an empty enum and a top-level unknown kind, and both are asserted.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Approved | Helpers moved to `format.ts`; lint rule against the cycle | `src/core/format.ts`, `src/core/describe.ts`, `eslint.config.js`, `tests/package/boundaries.test.ts` |
| QR-002 | Approved | One source for applicability | `src/core/definitions/*`, `tests/core/definitions.test.ts` |
| QR-003 | Approved | Rounding split into supplied and derived; edge cases pinned | `src/core/format.ts`, `tests/core/format.test.ts` |
| QR-004 | Approved | Deep freeze; tests at every depth | `src/core/definitions/types.ts`, `tests/core/definitions.test.ts`, `tests/core/style.test.ts` |
| QR-005 | Approved | Empty-enum and unknown-kind cases asserted | `tests/core/definitions.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0
**Notes:** Resolved with the Product Owner on 2026-10-06. All five findings were fixed and re-verified with the full verification set (see the delivery record's Post-Review Amendments).
