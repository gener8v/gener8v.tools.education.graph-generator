# TICKET-005: Schema generator — published schema, strict tool schema, types and vocabulary — Quality Review

## Summary

This review covers the files delivered for graph-library/graph-specification-and-vocabulary/TICKET-005 (branch `ticket/gsv-005`, delivery commit `7d0f255`). The `quality-reviewer` agent ran the findings phase in a fresh context.

The production code is in good shape:
- `src/core/schema.ts` is one module of pure builders that the generator, the getters and the tests all share (DEL-001), so files, getters and tests cannot disagree;
- functions are short and named for what they build, and every non-obvious rule cites its decision;
- the generator script is thin, and the CI freshness step now covers the fixture types too.

All four verify commands from `context.md` pass when re-run, and so do the 32 tests in the delivered and changed test files.

The three Concerns are all about what the tests can prove:
- **QR-001:** the GSV-NFR-003 agreement test almost never generates a description the validator accepts, apart from the one fixed example per type. It therefore cannot detect a validator that misses a rule the schema has, which is the bug class GSV-REQ-011 depends on it to catch. Rules injected by probe were found in 0 of 20 seeds for five of nine cases. Lists are never longer than 4, so no `maxItems` limit is ever crossed.
- **QR-002:** the registered-type leg of that test passes no examples, yet asserts that some description passed both checks. When the first real type registers, it fails on 28–29 of 30 seeds for axis-based types and flakes on 2 of 30 for a circle-like type.
- **QR-003:** the type-level test assigns an existing constant, so TypeScript's excess-property check never applies. A generator that drops properties from a description interface still type-checks.

The six Suggestions cover:
- no positive test of the tool schema;
- a duplicated `registeredTypes`;
- the version literal hard-coded in five places;
- frozen getters typed as mutable;
- repeated per-property notes in the published text;
- the generated-file list and Ajv options written out twice.

9 findings: 0 Critical, 3 Concerns, 6 Suggestions. The verdict below is provisional until resolution with the user.

**Files Reviewed:**
- `src/core/schema.ts`
- `src/core/index.ts`
- `scripts/generate.ts`
- `src/generated/description.ts`, `src/generated/schema.json`, `src/generated/tool-schema.json`, `src/generated/vocabulary.json`
- `tests/fixtures/generated/description.ts`
- `package.json` (`generate` script, `ajv` and `fast-check` dev dependencies)
- `.github/workflows/ci.yml` (freshness step)
- `tests/core/schema-shape.test.ts`
- `tests/core/schema-meta.test.ts`
- `tests/core/schema-agreement.test.ts`
- `tests/package/node-entry.test.ts` (the new getters test)

**Neighbours read for patterns and context:**
- source: `src/core/definitions/types.ts`, `src/core/definitions/index.ts`, `src/core/definitions/shared.ts`, `src/core/validate/index.ts`, `src/core/validate/envelope.ts`, `src/core/validate/structure.ts`, `src/core/validate/state.ts`, `src/core/style.ts`, `src/core/result.ts`, `src/core/issues.ts` (exports and their typing)
- tests and fixtures: `tests/fixtures/definitions/*.ts`, `tests/core/definitions.test.ts` (the term-consistency and `stageProblems` rules this delivery relies on)
- config: `tsup.config.ts`, `vitest.config.ts`, `eslint.config.js`, `tsconfig.json`, `tests/setup/build.ts`
- tickets: `.gener8v/changes/graph-library/tickets/graph-specification-and-vocabulary/TICKET-005.md` (Known Hazards), `.gener8v/changes/graph-library/tickets/component-packaging-and-source-export/TICKET-007.md` (null stripping in the handler)
- design: AD-003, AD-006 and AD-015 in `.gener8v/technical-design/system-design.md`
- calibration: the GSV TICKET-003 and TICKET-004 and CPSE TICKET-001 quality reviews in this change

**Findings:** 9
**Critical:** 0 | **Concerns:** 3 | **Suggestions:** 6

## Quality Assessment

### Code Organization

**Rating:** Adequate
**Notes:** The split is right:
- `src/core/schema.ts` holds pure builders that take a registry, plus three cached getters;
- `scripts/generate.ts` only serialises their output;
- tests build from fixture registries through the same functions.

Nothing at runtime imports the generated JSON, so the published files and the getters cannot diverge (DEL-001). `src/core/index.ts` adds exactly the three getters and three types.

Three dependencies point the wrong way or are duplicated:
- `schema.ts` re-implements `registeredTypes` from the envelope stage instead of sharing it (QR-005);
- it reaches into validator-stage modules for `deepFreeze` (`src/core/validate/state.ts`) and `DESCRIPTION_VALUE_LIMIT` (`src/core/validate/structure.ts`);
- it hard-codes the description version that the envelope stage owns (QR-006).

`scripts/generate.ts` imports `tests/fixtures/definitions/index.ts` to write the fixture types. That is DEL-006's deliberate choice. It means a broken fixture also stops `pnpm generate` for the real files. This is acceptable for now, so it is noted but not raised.

### Readability

**Rating:** Strong
**Notes:** Names say what each function builds: `valueSchema`, `objectSchema`, `typeSchema`, `termUse`, `tsMembers`, `buildDescriptionTypes`. Each is short, and the per-kind `switch`es read top to bottom. Comments give reasons and cite decisions, for example: "The strict profile lists every property as required; optional ones accept null instead." The tests are grouped by requirement, and their names state behaviour. Tree assertions pass the JSON path as the failure message (`expect(node["additionalProperties"], path)`).

Nits, not raised as findings:
- `typeSchema` adds `version` to `required` through `objectSchema`'s `extra`, then filters it back out for the published profile (`src/core/schema.ts:126-129`), so the reader has to follow it twice.
- `termUses` also fills the `terms` accumulator as a side effect (`src/core/schema.ts:229-237`).
- `src/core/schema.ts:126` and `:315` run past 150 characters.
- `tests/core/schema-shape.test.ts:207` asserts `typedExamples.length` inside the getters test only so the type-level constant is used. The same test's "frozen" check is top-level only.

### Error Handling

**Rating:** Strong
**Notes:** There is little that can fail, and nothing is swallowed:
- the builders are total over `PropertyKind`, and `tsType`'s exhaustive `switch` is checked by the compiler;
- `alternatives()` relies on the `stageProblems` rule that a derivation group has at least two members (`tests/core/definitions.test.ts:327`);
- `termUses`' "first definition wins" relies on the term-consistency rule (`tests/core/definitions.test.ts:103-116`), which every registry is held to;
- `scripts/generate.ts` lets any exception end the process with a stack and a non-zero exit, which is right for a development script;
- a getter whose build throws rethrows on every call rather than caching a broken value.

### Test Coverage

**Rating:** Needs Improvement
**Notes:** I ran the `context.md` verify commands (`## Repositories`, row `.`) plus a verbose run of the delivered test files. Environment: Node.js v24.1.0, pnpm 10.28.2, branch `ticket/gsv-005` at `7d0f255`.

| Command | Exit | Result |
|---------|------|--------|
| `pnpm lint` | 0 | no findings |
| `pnpm typecheck` | 0 | no errors (includes the type-level assignment at `tests/core/schema-shape.test.ts:19`) |
| `pnpm test` | 0 | 16 files, 486 tests passed (global setup ran `tsup`) |
| `pnpm build` | 0 | entries and declarations emitted; `dist/schema.json` and `dist/vocabulary.json` copied |
| `GRAPH_GENERATOR_PREBUILT=1 npx vitest run tests/core/schema-shape.test.ts tests/core/schema-meta.test.ts tests/core/schema-agreement.test.ts tests/package/node-entry.test.ts --reporter=verbose` | 0 | 32 passed: schema-shape 19, schema-meta 5, schema-agreement 4, node-entry 4, matching the delivery record; agreement runs take 25–89 ms per type |

I did not run `pnpm generate`, because it rewrites tracked files under `src/generated/`. Its freshness is covered by "are committed exactly as a fresh build writes them", which passed. After all the runs, `git status` showed only the hook-managed `.gener8v/runs.jsonl`.

The probe results quoted in the findings come from scratchpad scripts. They import the source read-only and copy the agreement generator verbatim.

What is good:
- The shape tests check every acceptance criterion's structural rule. That includes closed objects and required-equals-properties walked through the whole tree, the forbidden-keyword list (with `const`, `allOf` and `$ref` added), and the color pattern against `resolveColor`, Kelvin sign included.
- `schema-meta.test.ts` has a negative control.
- The node-entry test checks the built getters against the shipped static files.

The weaknesses are in the two tests that carry the ticket's guarantees:
- the GSV-NFR-003 agreement test has very little power to find a disagreement (QR-001), and its registered-type leg will fail once real types arrive (QR-002);
- the type-level test cannot see a dropped or wrongly optional property (QR-003);
- nothing shows that the tool schema accepts any description at all (QR-004).

### Observability & Operability

**Rating:** Adequate
**Notes:** The package forbids telemetry (CPSE-REQ-005) and has no logging pattern, so the library code correctly logs nothing. The signals an operator sees are adequate:
- the generator prints each path it wrote;
- the CI freshness step prints the stale or untracked generated files and says to run `pnpm generate`;
- the meta-schema test passes `ajv.errors` as its failure message;
- fast-check reports the seed and shrunk counterexample on a property failure.

The one gap is the agreement test's two coverage assertions (`tests/core/schema-agreement.test.ts:114-115`). They fail with a bare "expected 0 to be greater than 0" that does not say which type or what to add. That is the first thing the next type ticket will see (QR-002).

## Findings

### QR-001: The GSV-NFR-003 agreement test almost never generates a description the validator accepts, so it cannot detect a validator that misses a schema rule

**Category:** Testing
**Severity:** Concern
**Location:** `tests/core/schema-agreement.test.ts:24-85` (the generator); `:52` (list length capped at 4); `:73-85` (`descriptions`: the only validator-valid inputs are the fixed examples)
**Description:** The property is "the schema accepts it, or the validator rejects it". A validator gap on rule R only shows on a description that breaks R and is valid in every other respect. The generator draws each value independently, and every value is off-kind or out of range with probability of about 1/6 to 1/3. Extra and dropped keys are added on top of that. So a description that is valid apart from one fault is exponentially rare in the number of properties. Ordered axes, derivation agreement and points inside the axes make it rarer still. The deviation note in the delivery record observes this for x,y graphs. Measured with the delivered generator (1,000 runs, seed 42):

| Fixture type | Validator-valid | Of those, not the fixed example |
|--------------|-----------------|---------------------------------|
| circle | 107 | 1 |
| number-line | 106 | 0 |
| xy-graph | 106 | 0 |

"Accepted by both" is therefore exercised almost only by one constant description per type, which is never mutated. To measure the effect, I injected one schema-only rule into a copy of the fixture schema. This is equivalent to a validator that forgot that rule. I then ran the delivered generator for 1,000 runs on each of 20 seeds:

| Type | Rule only the schema enforces | Found |
|------|-------------------------------|-------|
| circle | `radius` maximum 100 | 5/20 |
| circle | `unit` maxLength 3 | 9/20 |
| number-line | `tickCount` maximum 10 | 1/20 |
| number-line | `axis.tickSpacing` maximum 1 | 0/20 |
| xy-graph | `yAxis.tickSpacing` maximum 1 | 0/20 |
| xy-graph | `xAxis.showTickLabels` const false | 0/20 |
| xy-graph | `segments[].color` not "red" | 0/20 |
| xy-graph | `points` maxItems 2 | 20/20 (the fixed example has 3 points) |
| xy-graph | `showGrid` const false | 20/20 (the fixed example has `showGrid: true`) |

There is also a cap on list length. At `:52`, `maxLength: Math.min(spec.maxItems + 1, 4)` means to reach one past the limit, but the cap of 4 wins for any `maxItems` of 4 or more. Every fixture list has 1,000, and real types will have curriculum-sized limits. So no generated list ever crosses `maxItems`. An off-by-one in `length > spec.maxItems` (`src/core/validate/structure.ts:159`) or in the published `maxItems` would go unseen.

**Impact:**
- The ticket's Notes say GSV-REQ-011 is "guaranteed by construction and proven by GSV-NFR-003's property test". Construction covers the schema side. The property test is the only check that the validator enforces everything the schema says, and it would pass a validator that forgot most nested rules.
- The 1,000-per-type count and the "over 10% rejected" floor are met by inputs that both sides reject for many reasons at once. They show the test runs, not that it can fail.
- The same weakness lets QR-006's version drift through (0–9 of 20 seeds).

**Recommendation:** Generate inputs one fault away from a valid description:
- Start from a valid base per type (today the fixture examples; see QR-002 for the registered types).
- Apply exactly one change: pick one property path, present or absent and at any depth including list elements. Set it to a value from the existing `value(spec)` arbitrary, delete it, or add an unknown key beside it. Every description then differs from a valid one in one place, so a gap on that path decides the outcome.
- Add a family of lists with exactly `maxItems` and `maxItems + 1` elements, so the limit is crossed.
- Replace `bothAccepted > 0` with a meaningful share (for example at least 25%).
- Add a negative control like `schema-meta.test.ts`'s: inject one schema-only rule (a nested `maximum`) into a copy of the schema, and assert that `fc.check` finds a counterexample within the run budget. That proves the test can fail.

**Status:** Resolved
**Resolution:** A one-fault generator, list-limit families, floors and a negative control.

---

### QR-002: The registered-type leg passes no examples but asserts that something passed both checks, so it fails or flakes as soon as a real type registers

**Category:** Testing
**Severity:** Concern
**Location:** `tests/core/schema-agreement.test.ts:93-116`: `:103` passes `[]` as the examples for the registered leg, and `:114-115` assert `schemaRejected > RUNS / 10` and `bothAccepted > 0`
**Description:** The fixture leg passes `bothAccepted > 0` only because a fixed example is mixed in (QR-001). The registered leg gets `examplesOf(type, [])`, which is an empty list. While the real registry is empty, the leg runs no tests, so this is invisible today. The first type ticket registers a type, and the leg starts running with nothing to make "accepted by both" happen. I ran the delivered generator with no examples, as the registered leg will, on the fixture types over 30 seeds:

| Type shape | Seeds where the test's own assertions fail | `bothAccepted` per seed |
|------------|---------------------------------------------|-------------------------|
| circle | 2/30 | 0–6 |
| number-line | 28/30 | 0 on 28 seeds |
| xy-graph | 29/30 | 0 on 29 seeds |

fast-check draws a fresh seed on every run. So a circle-like type makes CI flaky (about 1 run in 15), and an axis-based type makes it fail almost every time. In each case the message is "expected 0 to be greater than 0". The delivery's Notes say to add each type's example "once a shared `examples/` source exists". No such source exists, the leg has no way to read one, and nothing warns that the test will break without it.

**Impact:** The first type ticket (GSS TICKET-002, the circle slice, per `src/core/validate/envelope.ts:48-49`) inherits a flaky test it did not write. NLC TICKET-002 and TICKET-003 inherit one that fails almost always, with a message that does not say what to do. The natural quick fix is to delete or weaken the assertion, which would leave GSV-NFR-003 weaker still for the real types.

**Recommendation:**
- Give the registered leg a valid base per type now. One option is an `example` on `GraphTypeDefinition`, since each type ticket already writes one, per the delivery's Notes. Another is a `tests/examples/index.ts` keyed by type, empty today, that the registered leg reads. QR-001's one-fault generator needs that base anyway.
- Fail with a message that names the fix: `` expect(bothAccepted, `no generated ${type} description passed both; add a valid ${type} example to …`).toBeGreaterThan(0) ``.
- If this is deferred, record it as a Known Hazard on GSS TICKET-002 and NLC TICKET-002 and TICKET-003.

**Status:** Resolved
**Resolution:** Registered types read `examples/<type>.json`, with a message naming the missing file. Known Hazards on every type ticket.

---

### QR-003: The type-level test assigns an existing constant, so it cannot detect a generated interface that drops a property or makes a required one optional

**Category:** Testing
**Severity:** Concern
**Location:** `tests/core/schema-shape.test.ts:17-19` (`const typedExamples: readonly GraphDescription[] = fixtureExamples`); `tests/fixtures/definitions/index.ts:16-39` (`fixtureExamples`, declared `as const` with no type check)
**Description:** TypeScript applies its excess-property check only to fresh object literals. Assigning the existing constant `fixtureExamples` checks only that each example has every property its interface requires, with compatible types. The probe:
- I removed `title?: string;` and `lineColor?: string;` from `CircleDescription` in a copy of `tests/fixtures/generated/description.ts`.
- The assignment exactly as written at `:19` still type-checks (`tsc` exit 0), although the circle example sets both properties.
- The same examples declared as `] as const satisfies readonly GraphDescription[]` fail: "TS2353: Object literal may only specify known properties, and 'title' does not exist in type 'CircleDescription'". They pass against the committed types.

Even with that change, the test only sees properties the three examples use. It would not see a wrong type or optionality on these:
- circle: `diameter`, `circumference`, `shadedFraction`;
- number-line: `tickCount`, `title`, `lineColor`;
- xy-graph: `showTickLabels`, `segments[].color`.

It would also not see a required property generated as optional. The freshness test cannot help, because the committed file and the fresh build come from the same generator.

**Impact:** This is the only test for the criterion "Generated TypeScript types match the definitions", and `GraphDescription` is the developer-facing type of the public contract. The likeliest regressions pass it: shared properties lost from `propertiesOf`, or optionality inverted, for instance when RES-001 changes the definition contract.

**Recommendation:**
- Declare the examples with `as const satisfies readonly GraphDescription[]` in `tests/fixtures/definitions/index.ts`, importing the type from `tests/fixtures/generated/description.ts`. The import is type-only, so it adds no runtime cycle with `scripts/generate.ts`.
- Add a structural test over `buildDescriptionTypes(fixtureRegistry)`. For every term of `propertiesOf(type)` at every depth, assert that the member appears, with `?` exactly when the term is optional and the expected TypeScript type for its kind. That makes every property checked, not just the ones an example happens to use.

**Status:** Resolved
**Resolution:** Literal `satisfies` checks, plus a structural test of every term at every depth.

---

### QR-004: No test shows that the tool schema accepts any description

**Category:** Testing
**Severity:** Suggestion
**Location:** `tests/core/schema-shape.test.ts:108-142` (the tool-schema group checks shape only); `tests/core/schema-meta.test.ts:25-29` (meta-validity only); `tests/core/schema-shape.test.ts:70-77` (the "describes every type and every property" walk covers the published schema only)
**Description:** The tool schema is checked for shape, closed objects, required-equals-properties, forbidden keywords and meta-validity. Nothing checks that a valid description in tool form, wrapped in `graph` with `null` for every absent optional, is accepted. The probe converted each fixture example to tool form, and Ajv accepts all three against `buildToolSchema(fixtureRegistry)` today. A regression that keeps the shape and makes the schema unsatisfiable would still pass every test. Examples are a mismatched `enum`/`type` pair on `version`, or `null` missing from a nullable enum. Descriptions in the tool profile are also never checked for presence.
**Impact:** CPSE TICKET-007 passes `getToolSchema()` straight to providers as the tool's `inputSchema`. A provider that enforces the schema would then refuse every call, and nothing in this repository would notice.
**Recommendation:** In the tool-schema group:
- Convert each fixture example to tool form and assert that Ajv accepts it.
- Assert that a required property set to `null` is rejected, and that an unknown key inside `graph` is rejected.
- Run the description walk over `tool` as well as `published`.

**Status:** Resolved
**Resolution:** Tool-form examples are accepted, `null` for a required property and unknown keys are rejected, and every tool property is described.

---

### QR-005: `schema.ts` re-implements `registeredTypes`, and the agreement test adds a third variant

**Category:** DRY
**Severity:** Suggestion
**Location:** `src/core/schema.ts:103-106` (`registered`); `src/core/validate/envelope.ts:11-14` (`registeredTypes`, exported, same body); `tests/core/schema-agreement.test.ts:90` (`registered`, without the `Object.hasOwn` guard)
**Description:** The rule for which graph types are registered, in `GRAPH_TYPES` order and own properties only, is written three times. The test's copy already differs: it uses `registry[type] !== undefined` without `Object.hasOwn`. The rule decides which types the validator accepts and which the schema, vocabulary and types publish. `schema.ts` also reaches into two validator-stage modules for general helpers: `deepFreeze` from `src/core/validate/state.ts`, which has a second private copy in `src/core/definitions/types.ts:124-130`, and `DESCRIPTION_VALUE_LIMIT` from `src/core/validate/structure.ts`.
**Impact:** If one copy changes, the validator and the published schema can disagree on the set of types. Examples would be skipping a type during a migration, or a registry with a prototype. Neither the agreement test nor the shape tests would notice, because they use the third copy. The GSV TICKET-003 review (QR-008) moved `Registry` beside `definitions` for the same reason.
**Recommendation:**
- Move `registeredTypes` beside `propertiesOf` in `src/core/definitions/index.ts`, and use it in the envelope stage, `schema.ts` and the agreement test.
- Optionally move `deepFreeze` to one neutral module and import it from both places.

**Status:** Resolved
**Resolution:** `registeredTypes` lives beside the registry and is used everywhere.

---

### QR-006: The description version `1` is hard-coded in five places instead of derived from `SUPPORTED_VERSIONS`

**Category:** Maintainability
**Severity:** Suggestion
**Location:** `src/core/schema.ts:120` (`const: 1`), `:124` (`enum: [1, null]`), `:186` and `:265` (`Vocabulary.version: 1`), `:309` (`version?: 1`); `src/core/validate/envelope.ts:8-9` (`SUPPORTED_VERSIONS`, `CURRENT_VERSION`)
**Description:** The validator accepts the versions in `SUPPORTED_VERSIONS`. The published schema, the tool schema and the generated types each write `1` by hand. When a version 2 is added to `SUPPORTED_VERSIONS`, the published schema would still say `const: 1`. It would reject descriptions the validator accepts, which is the one direction GSV-NFR-003 forbids. I simulated that drift by validating `version: 2` as `1`. The agreement test found it in 9 of 20 seeds for the circle, 2 of 20 for the number line and 0 of 20 for the x,y graph (QR-001). Separately, `Vocabulary.version` has no comment saying whether it versions the vocabulary format or the description schema.
**Impact:** A version bump is a major-version event for a public contract. It currently needs coordinated edits in two modules that nothing ties together, and the test meant to catch the mismatch mostly will not.
**Recommendation:**
- Build `version` from `SUPPORTED_VERSIONS`: `const` (or `enum`) in the published profile, `enum: [...SUPPORTED_VERSIONS, null]` in the tool profile, and a union of literals in the types.
- Move the version constants out of the envelope stage into a neutral module, so `schema.ts` does not import stage internals (QR-005).
- Add a doc comment on `Vocabulary.version` saying what it versions.

**Status:** Resolved
**Resolution:** Versions come from `SUPPORTED_VERSIONS` everywhere, and `Vocabulary.descriptionVersions` replaces the ambiguous `version`.

---

### QR-007: The getters return deep-frozen objects typed as mutable, unlike the codebase's other frozen public data

**Category:** Patterns
**Severity:** Suggestion
**Location:** `src/core/schema.ts:14` (`JsonSchema = { [keyword: string]: unknown }`), `:174-204` (`TermUse`, `Vocabulary`), `:318-340` (`built`, `getSchema`, `getToolSchema`, `getVocabulary`)
**Description:** The getters deep-freeze their result, but the types say it can be written. `getVocabulary().colors["teal"] = "#008080"` compiles with no cast. In strict ESM, which is how every consumer loads this ESM-only package, the probe gave:
- `getSchema()["x-provider"] = …`: `TypeError: Cannot add property x-provider, object is not extensible`
- `getVocabulary().colors.teal = …`: `TypeError: Cannot add property teal, object is not extensible`
- `delete getSchema().$schema`: `TypeError: Cannot delete property '$schema'`

Elsewhere `./core` types its frozen exports as read-only: `issueDocs: Readonly<Record<IssueCode, string>>` (`src/core/issues.ts:53`), `GRAPH_TYPES` (`src/core/definitions/types.ts:9`), and `defaultStyle`, whose type `Object.freeze` infers.
**Impact:** Adjusting a tool schema for one provider is common integration code, such as removing a keyword or adding a vendor field. Consumers who do it get a runtime `TypeError` with no compile-time warning. The vocabulary and tool definition are public interfaces under semantic versioning (`context.md`), and fixing the types is cheapest before the first release.
**Recommendation:**
- Return read-only types: a `DeepReadonly` helper, or at least `Readonly<JsonSchema>` and `readonly` fields in `Vocabulary` and `TermUse`. Read-only properties stay assignable to the mutable parameter types of provider SDKs, so passing the schema along still compiles.
- Say "frozen; use `structuredClone` to modify" in the getters' doc comments.

**Status:** Resolved
**Resolution:** The getters return `DeepReadonly`, with a `@ts-expect-error` test.

---

### QR-008: Per-property notes repeat what the property's own description already says, on every string and color property

**Category:** Readability
**Severity:** Suggestion
**Location:** `src/core/schema.ts:20` (`PLAIN_TEXT_NOTE`), `:38` (`COLOR_NOTE`), `:53-61` (`describeValue`); `src/core/definitions/shared.ts:31`, `:40-41`, `:113` (shared descriptions that already state the rule)
**Description:** `describeValue` appends the plain-text note to every string property and the color note to every color property. Several shared descriptions already say the same thing, so the published text repeats itself:
- `lineColor`: "… A color name or a hex code such as #0072b2. A color name (black, gray, red, orange, green, blue, purple, brown), in any case, or a hex code such as #0072b2."
- `title`: "A title shown above the graph, as plain text. Plain text: control, line-break, text-direction and invisible characters are not accepted."

For the three fixture types, the plain-text note appears 10 times (900 characters) and the color note 5 times (560 characters). Together that is about 14% of the 10,335-character tool schema. The color `pattern` adds another 5 copies of about 210 characters, which the tool profile's ban on `$ref` makes unavoidable.
**Impact:** The tool schema is sent with every model request (AD-015), so repeated text is paid for in tokens on every call. It grows with every string and color property across the eleven real types. The doubled sentences also read as careless to the people the published schema is for (GSV-REQ-009).
**Recommendation:**
- At minimum, stop stating the rule twice: drop the sentence from the shared descriptions, or have `describeValue` add the note only when the description does not already cover it.
- Consider stating the plain-text and color rules once, in the root and `graph` descriptions and in the vocabulary, and keeping per-property text to what is specific to the property. Weigh that against how well models follow root-level notes once CPSE TICKET-007 can measure it.

**Status:** Resolved
**Resolution:** The rules are stated once, at the root and in `graph`, and the per-property notes are removed.

---

### QR-009: The list of generated files, their serialization and the Ajv options are each written out twice

**Category:** DRY
**Severity:** Suggestion
**Location:** `scripts/generate.ts:17` (`json`) and `:26-30` (the five writes); `tests/core/schema-shape.test.ts:179-188` (a second `json` and the same five paths); `tests/core/schema-meta.test.ts:9-11` and `tests/core/schema-agreement.test.ts:17-19` (the same `Ajv2020` options and comment)
**Description:** The freshness test re-states which files the generator writes and how it serializes them. A file added to the generator, such as AD-003's documentation tables in CPSE TICKET-008, is not checked by the test unless someone remembers to add it. A change to the serializer, such as indentation or line endings, fails the test with a diff that looks like stale files. The two Ajv configurations, including the `strictRequired: false` rationale, must also be kept in step by hand.
**Impact:** This is minor today. It is the same hand-maintained-list pattern the CPSE TICKET-001 review raised for the entry points (QR-006 there).
**Recommendation:**
- Have the generator expose one `generatedFiles(): Record<string, string>` map of path to content. For example, put it in `scripts/generated-files.ts` and keep `scripts/generate.ts` as the writer. Have the freshness test iterate over that map.
- Put the Ajv instance in a shared test helper, such as `tests/helpers/ajv.ts`.

**Status:** Resolved
**Resolution:** One `generatedFiles()` map and one `createAjv()` helper.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| QR-001 | Approved | A one-fault generator, list-limit families, floors and a negative control. | see Post-Review Amendments |
| QR-002 | Approved | Registered types read `examples/<type>.json`, with a message naming the missing file. Known Hazards on every type ticket. | see Post-Review Amendments |
| QR-003 | Approved | Literal `satisfies` checks, plus a structural test of every term at every depth. | see Post-Review Amendments |
| QR-004 | Approved | Tool-form examples are accepted, `null` for a required property and unknown keys are rejected, and every tool property is described. | see Post-Review Amendments |
| QR-005 | Approved | `registeredTypes` lives beside the registry and is used everywhere. | see Post-Review Amendments |
| QR-006 | Approved | Versions come from `SUPPORTED_VERSIONS` everywhere, and `Vocabulary.descriptionVersions` replaces the ambiguous `version`. | see Post-Review Amendments |
| QR-007 | Approved | The getters return `DeepReadonly`, with a `@ts-expect-error` test. | see Post-Review Amendments |
| QR-008 | Approved | The rules are stated once, at the root and in `graph`, and the per-property notes are removed. | see Post-Review Amendments |
| QR-009 | Approved | One `generatedFiles()` map and one `createAjv()` helper. | see Post-Review Amendments |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0
**Notes:** Resolved with the Product Owner on 2026-10-06. All nine findings were fixed and re-verified with the full verification set (see the delivery record's Post-Review Amendments).
