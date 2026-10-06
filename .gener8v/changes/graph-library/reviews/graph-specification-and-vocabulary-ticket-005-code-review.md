# TICKET-005: Schema generator — published schema, strict tool schema, types and vocabulary — Code Review

## Summary

I reviewed the delivery of `graph-library/graph-specification-and-vocabulary/TICKET-005` (delivery commit `7d0f255`, branch `ticket/gsv-005`). I checked it against the ticket and its eight Known Hazards, the Graph Specification & Vocabulary specification, `constraints/prd.md` and `technical-design/system-design.md`. I also read the downstream tickets it hands work to: GSV TICKET-006, DGP TICKET-004 and TICKET-005, and CPSE TICKET-007 and TICKET-008.

- **Criteria and requirements:**
  - Seven of the ten acceptance criteria are met in full.
  - Generated TypeScript types: met as the criterion specifies, but the specified check is weak (CR-007).
  - Vocabulary: Partial, because `type` and `version` are not published (CR-002).
  - GSV-NFR-003 property test: Partial, because its generator almost never produces a description the validator accepts (CR-001).
  - Requirements: five of the eight are covered in full. GSV-REQ-011, GSV-REQ-013 and GSV-REQ-014 are Partial. GSV-NFR-002 is covered; GSV-NFR-003 is Partial.
- **Annotations:** all eight requirements carry `@spec` annotations, and their rows in the specification's `## @spec Coverage` table match. The GSV-REQ-035 row was not extended to the new `buildVocabulary` annotation (CR-004). The gener8v lint reports 0 errors and 0 warnings.
- **Verification:** all thirteen Verification Run commands reproduce with exit 0, including the freshness check after `pnpm generate`. The test count matches: 486 tests, of which 19 are in `schema-shape`, 5 in `schema-meta`, 4 in `schema-agreement` and 4 in `node-entry`.
- **Known Hazards:**
  - Seven of the eight are handled.
  - The image-manifest hazard was reassigned to the pictograph definition. No delivery decision records it, and no Known Hazard on the pictograph tickets carries it (CR-003).
- **Issue-level findings (4):**
  - The GSV-NFR-003 agreement test checks the property on almost nothing but three constant examples. It misses deliberately injected schema defects, and it will fail or flake once real types register (CR-001).
  - The vocabulary omits the `type` and `version` terms (CR-002).
  - The `unitImage` manifest hand-off leaves three tickets disagreeing on who reads the manifest (CR-003).
  - The `@spec Coverage` row for GSV-REQ-035 is stale (CR-004).
- **Observations (4):**
  - DEL-007 and the missing documentation tables put the design and CPSE TICKET-008 out of step with the generator (CR-005).
  - The zero-type tool schema uses `not`, and no test checks the real registry's tool schema against the profile (CR-006).
  - The type-level test cannot detect a dropped property (CR-007).
  - An in-memory `undefined`-valued unknown key makes the schema and the validator disagree (CR-008).

**Reviewer:** `code-reviewer` agent, fresh context (findings phase only, 2026-10-06)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/graph-specification-and-vocabulary-ticket-005-delivery.md`
**Files Reviewed:**
- `src/core/schema.ts`
- `src/core/index.ts`
- `scripts/generate.ts`
- `src/generated/description.ts`, `src/generated/schema.json`, `src/generated/tool-schema.json`, `src/generated/vocabulary.json`
- `tests/fixtures/generated/description.ts`
- `package.json` (the delivery's changes)
- `.github/workflows/ci.yml` (the delivery's change)
- `tests/core/schema-shape.test.ts`
- `tests/core/schema-meta.test.ts`
- `tests/core/schema-agreement.test.ts`
- `tests/package/node-entry.test.ts` (the delivery's changes)
- `.gener8v/specifications/graph-specification-and-vocabulary.md` (`## @spec Coverage` rows added by the delivery)
- Read for context, unchanged by this delivery:
  - source: `src/core/definitions/types.ts`, `src/core/definitions/index.ts`, `src/core/definitions/shared.ts`, `src/core/validate/index.ts`, `src/core/validate/envelope.ts`, `src/core/validate/structure.ts`, `src/core/validate/state.ts`, `src/core/validate/json.ts`, `src/core/style.ts`, `src/core/format.ts`;
  - tests: `tests/fixtures/definitions/*`, `tests/core/definitions.test.ts`;
  - configuration: `tsup.config.ts`, `tsconfig.json`;
  - build output after `pnpm build`: `dist/core/index.js`, `dist/core/index.d.ts`.

**Findings:** 8
**Critical:** 0 | **Issues:** 4 | **Observations:** 4

## Traceability Check

### Acceptance Criteria Coverage

| Criterion | Satisfied | Evidence |
|-----------|-----------|----------|
| `pnpm generate` writes `src/generated/description.ts`, `schema.json`, `tool-schema.json` and `vocabulary.json`; the build copies schema and vocabulary to `dist/schema.json` and `dist/vocabulary.json`, exported as `./schema.json` and `./vocabulary.json` | Yes | Generation:<br>- `scripts/generate.ts:26-29` writes the four files, and `:30` writes the fixture types.<br>- `package.json:64` adds the `generate` script.<br>Build and exports:<br>- `tsup.config.ts:24-29` copies both JSON files.<br>- `package.json:51-52` exports them.<br>Re-run:<br>- `pnpm generate` exits 0.<br>- After `pnpm build`, `cmp` shows `dist/schema.json` and `dist/vocabulary.json` byte-identical to `src/generated/`.<br>- `pnpm attw` resolves both subpaths.<br>Test: `tests/package/node-entry.test.ts:65-79` compares the built getters with the static files |
| CI fails when committed generated files differ from a fresh `pnpm generate` | Yes | CI: `.github/workflows/ci.yml:53-65` runs `pnpm generate` and fails on any change or untracked file under `src/generated` or `tests/fixtures/generated`.<br>Test: `tests/core/schema-shape.test.ts:182-188` also fails on drift.<br>Re-run: `git status --porcelain` on both directories is empty after `pnpm generate` |
| Published schema: JSON Schema 2020-12; root `anyOf` of one closed object per graph type, each with `type` as a `const`; optional properties not under `required`; every type and property carries a `description` | Yes | `src/core/schema.ts:145-154` (`buildSchema`): `$schema` 2020-12 and a root `anyOf` in `GRAPH_TYPES` order.<br>`src/core/schema.ts:109-135` (`typeSchema`):<br>- `additionalProperties: false` at `:100`;<br>- `type` as `{ const }` at `:119`;<br>- `version` dropped from `required` at `:129`;<br>- optional terms never pushed to `required` at `:98`;<br>- every value described at `:66`.<br>Tests: `tests/core/schema-shape.test.ts:43-77`.<br>With no type registered, the committed schema is `{ not: {} }` (DEL-002), since an empty `anyOf` is invalid. The shape is proven on the three fixture types |
| Tool schema: object root with `graph`, `required: ["graph"]`, `additionalProperties: false`; every object closed; every property under `required`; optional properties `[<kind>, "null"]`; no `oneOf`, `if`/`then`, `patternProperties` or `format` | Yes | `src/core/schema.ts`:<br>- `:161-171`: the root.<br>- `:95-98`: every property required; optional ones nullable.<br>- `:77`: optional enums gain `null`.<br>- `:123-124`: `type` as a one-value `enum` and a nullable `version` (DEL-007).<br>Tests: `tests/core/schema-shape.test.ts:109-141`, which also rule out `allOf`, `const` and `$ref`.<br>For the fixture types, the tool schema uses only `additionalProperties anyOf description enum exclusiveMaximum exclusiveMinimum items maxItems maximum minimum pattern properties required title type` (probed). The zero-type output uses `not`, and no test checks it (CR-006) |
| Vocabulary: every term with its plain-English definition, and per type the applicable terms, required/optional, value kind, range and derivation groups | Partial | `src/core/schema.ts:246-266` (`buildVocabulary`):<br>- `terms`: each term once, with definition and kind, sorted.<br>- Per type, `properties` (`:206-237`): `required`, `kind`, `range`, enum `values`, `maxItems`, `ordered` and nested terms.<br>- `derivations` (`:255-259`): members in defining order, description and `required`.<br>- Check names (`:260`), `colors` and `limits`.<br>Tests: `tests/core/schema-shape.test.ts:145-175`.<br>Neither `type` nor `version` appears in `terms` or in any type's `properties` (probed on the fixture registry). So the vocabulary never says that `type` is required (CR-002) |
| Generated TypeScript types match the definitions (a type-level test assigns each example to `GraphDescription`) | Yes, as specified | Generator: `src/core/schema.ts:271-316` (`buildDescriptionTypes`) produces `tests/fixtures/generated/description.ts` (three interfaces and the union).<br>Test: `tests/core/schema-shape.test.ts:19` assigns `fixtureExamples` to `readonly GraphDescription[]`. `tsconfig.json` includes `tests`, and `pnpm typecheck` exits 0.<br>The assignment is from a variable, so no excess-property check runs. A union missing five of the examples' properties also typechecks (probed; CR-007) |
| `getSchema()`, `getToolSchema()` and `getVocabulary()` are exported from `./core` | Yes | Source: `src/core/index.ts:15-16`.<br>Build: `dist/core/index.js` exports all three getters, and `dist/core/index.d.ts` exports the `JsonSchema`, `TermUse` and `Vocabulary` types.<br>The results are cached and deep-frozen (`src/core/schema.ts:318-323`).<br>Tests: `tests/core/schema-shape.test.ts:201-208` and `tests/package/node-entry.test.ts:65-79` |
| The published and tool schemas each validate against the 2020-12 meta-schema, verified by `tests/core/schema-meta.test.ts` with Ajv (dev dependency) in CI (GSV-NFR-002) | Yes | `tests/core/schema-meta.test.ts:13-35` runs `Ajv2020` `validateSchema` and `compile` on both schemas, for the real registry and the fixtures, plus a negative control. All 5 tests pass in the re-run, under `pnpm test` as CI runs it. `ajv` is a dev dependency (`package.json:85`). The relaxed `strictRequired` and `strictTypes` options affect compile-time lints only, not meta-schema validation |
| Property test `tests/core/schema-agreement.test.ts` generates ≥ 1,000 descriptions per registered graph type (valid, mutated and random), asserts no description Ajv rejects passes `validate` (GSV-NFR-003), and iterates over the registry | Partial | `tests/core/schema-agreement.test.ts:92-118` runs 1,000 descriptions per type, over the fixture types and over every registered type. It asserts `schemaValid \|\| !result.valid`, with floors `schemaRejected > 100` and `bothAccepted > 0`.<br>The "built (mostly well-formed)" family is almost never valid. Every description both sides accept is one of three constant examples, and the registered-type branch gets no examples. Injected stricter-than-validator schema defects mostly go undetected (CR-001) |
| No runtime dependency is added; Ajv is a dev dependency only | Yes | `package.json:85` and `:87` add `ajv` and `fast-check` under `devDependencies`. Only the two test files import them. `pnpm check:deps` reports 0 runtime dependencies |

### Requirement Coverage

| Requirement | Description | Code Location | Covered |
|-------------|-------------|---------------|---------|
| GSV-REQ-007 | Publish a machine-readable JSON Schema covering every type | `src/core/schema.ts:145-154` (`buildSchema`), `:327-329` (`getSchema`); `src/generated/schema.json`, copied to `dist/schema.json` | Yes. Every registered type is covered. None is registered yet (DEL-002); TICKET-006 asserts one branch per type |
| GSV-REQ-008 | Parameters of each type defined separately, selected by the graph-type field | `src/core/schema.ts:109-135`, `:152` | Yes. Each type is one closed object selected by a `type` `const`. This is the `anyOf` form AD-006 prescribes in place of `oneOf` |
| GSV-REQ-009 | Plain-English description of every type and property | `src/core/schema.ts:53-61` (`describeValue`), `:66`, `:112-115`, `:119-120` | Yes. Tested at `tests/core/schema-shape.test.ts:70-77` |
| GSV-REQ-010 | Schema available programmatically and as a static file | `src/core/schema.ts:327-340`; `tsup.config.ts:24-29`; `package.json:51-52` | Yes |
| GSV-REQ-011 | Reject every description the published schema rejects | The schema builders and the validator read the same definitions (`propertiesOf`); checked by `tests/core/schema-agreement.test.ts` | Partial. I found no disagreement on JSON input. Probes: case-varied color names, `#ABC`, the Kelvin sign, `version: null`, `title: null`, no derivation member, a parsed `__proto__` key, 1,001 points and a reversed axis. But the proof is weak (CR-001). And an in-memory description with an `undefined`-valued unknown key is rejected by the schema and accepted by `validate` (CR-008) |
| GSV-REQ-013 | Publish the vocabulary with definitions | `src/core/schema.ts:229-237`, `:246-266`; `getVocabulary`; `dist/vocabulary.json` | Partial. `type` and `version` are not published (CR-002) |
| GSV-REQ-014 | Publish, per type, applicable, required and optional terms and their value kinds | `src/core/schema.ts:206-237`, `:254` | Partial. Every type's terms leave out the required `type` and the optional `version` (CR-002) |
| GSV-REQ-015 | Vocabulary, schema and validation generated from one definition | Builders: every one in `src/core/schema.ts` reads the registry through `propertiesOf`.<br>Files: `scripts/generate.ts` writes their output.<br>Getters: they call the same builders (`:320-323`).<br>Validator: it reads `propertiesOf` (`src/core/validate/structure.ts:261`).<br>Freshness: checked in CI and in `tests/core/schema-shape.test.ts:182-188` | Yes |
| GSV-NFR-002 | The published schema is valid against the meta-schema it declares; meta-schema test in CI | `tests/core/schema-meta.test.ts` (runs under `pnpm test` in CI) | Yes. 5 tests pass in the re-run |
| GSV-NFR-003 | No description the schema rejects passes validation; property test of ≥ 1,000 descriptions per type in CI | `tests/core/schema-agreement.test.ts` | Partial. The test runs 1,000 descriptions per type and passes. But nearly all of them are rejected by both sides, so the property is rarely tested where it can fail (CR-001) |

*GSV-REQ-035 is not on the ticket. Its last Known Hazard (carried from the TICKET-004 code review, CR-005) asks this ticket to publish the derivation groups. `buildVocabulary` does so, and is annotated for it. The specification's row was not updated (CR-004).*

### Constraint Compliance

| Constraint | Description | Respected | Evidence |
|------------|-------------|-----------|----------|
| prd/IC-001 | The tool schema stays within the common provider subset: object root, closed objects, every property required, nullable optionals | Yes, except the zero-type output | The fixture tool schema uses only the keywords listed under the tool-schema criterion. It has none of `oneOf`, `if`/`then`/`else`, `patternProperties`, `format`, `discriminator`, `allOf`, `const` or `$ref`. The committed zero-type `src/generated/tool-schema.json` uses `not` (CR-006). Re-checking the profile against provider rules is CPSE TICKET-007's job (TQ-002) |
| prd/TC-008 | The generator is in-house; any library counts against the dependency rule and the budget | Yes | The builders are hand-written. `pnpm check:deps` reports 0 runtime dependencies. `pnpm size` reports `./core` at 9.13 kB of 25 kB |
| prd/TC-005 | Validation code loads no React DOM or browser globals | Yes | `src/core/schema.ts` imports only `src/core` modules. `pnpm lint` exits 0 with `src/core/**` under the non-rendering rules. `tests/package/node-entry.test.ts` loads `./core` with a hook that fails if React loads |
| prd/CC-003 | The package collects, transmits and stores no data | Yes | `pnpm check:dist` scans 4 built files and finds no network APIs or modules |

### Architecture Decision Adherence

| Decision | Description | Followed | Evidence |
|----------|-------------|----------|----------|
| AD-001 | `./core` exports `getSchema` and `getVocabulary` with no React; `./schema.json` and `./vocabulary.json` are static exports | Yes | The built `dist/core/index.js` export list contains both getters, plus `getToolSchema`. The static files are exported at `package.json:51-52`, and `pnpm attw` resolves both |
| AD-003 | The definitions are the single source; `scripts/generate.ts` writes the types, the schema, the tool schema, the vocabulary and documentation tables; CI fails on stale files | Partial | Everything is in place except the documentation tables. The ticket's Output does not list them, yet CPSE TICKET-008's Prior Art expects them (CR-005). `scripts/generate.ts` writes to `src/generated/`, and the build copies to `dist/`, as the Schema generator component describes |
| AD-006 | Two profiles: the published `anyOf` of closed objects with a `type` `const`; the strict tool profile with an object root | Yes, with one equivalent divergence | Published profile: `src/core/schema.ts:116-133`, `:145-154`.<br>Tool profile: `:161-171`, `:95-98`.<br>The tool profile gives `type` as a one-value `enum` (DEL-007), where AD-006's "as above" means a `const`. The two are equivalent, but neither the design nor the record's Deviations from Plan notes the change (CR-005). The zero-type tool output uses `not` (CR-006) |
| AD-016 | fast-check for property tests; tools are dev-only | Yes | `fast-check` 4.10.2 and `ajv` 8.20.0 are dev dependencies |
| Component Design › Schema generator | Interfaces `getSchema() → JSONSchema` and `getVocabulary() → Vocabulary`; dependencies on Definitions, Issue codes and the Image set manifest | Partial | Both interfaces are present, plus `getToolSchema`. The generator reads no image manifest: the record assigns that to the pictograph definition (CR-003) |

### @spec Annotation Coverage

| Requirement | Expected Annotation | Code Location | Present |
|-------------|-------------------|---------------|---------|
| GSV-REQ-007 | `@spec GSV-REQ-007` | `src/core/schema.ts:144` (`buildSchema`) | Yes |
| GSV-REQ-008 | `@spec GSV-REQ-008` | `src/core/schema.ts:144` | Yes |
| GSV-REQ-009 | `@spec GSV-REQ-009` | `src/core/schema.ts:144` | Yes |
| GSV-REQ-010 | `@spec GSV-REQ-010` | `src/core/schema.ts:326` (`getSchema`), `:337` (`getVocabulary`) | Yes |
| GSV-REQ-011 | `@spec GSV-REQ-011` | `src/core/schema.ts:144` | Yes |
| GSV-REQ-013 | `@spec GSV-REQ-013` | `src/core/schema.ts:245` (`buildVocabulary`), `:337` | Yes |
| GSV-REQ-014 | `@spec GSV-REQ-014` | `src/core/schema.ts:245` | Yes |
| GSV-REQ-015 | `@spec GSV-REQ-015` | `src/core/schema.ts:144`, `:160` (`buildToolSchema`), `:245`, `:300` (`buildDescriptionTypes`) | Yes |

**Coverage:** 8 of 8 requirements annotated. Each annotation sits on the line directly above its function, below the JSDoc block. `python3 …/gener8v-state.py lint --root .` reports 0 errors and 0 warnings. GSV-NFR-002 and GSV-NFR-003 are verified by tests and carry no source annotation, as the record states.
**Missing:** None
**Specification table:** Yes for the ticket's requirements. `## @spec Coverage` in `.gener8v/specifications/graph-specification-and-vocabulary.md:208-217` lists exactly these locations and the two NFR test files. The GSV-REQ-035 row (`:203`) does not list the new `src/core/schema.ts`:buildVocabulary annotation (CR-004).

### Verification Run

I re-ran the commands on Node.js v24.1.0 and pnpm 10.28.2, on branch `ticket/gsv-005` at `7d0f255`, the same environment as the record. `pnpm generate` rewrote its files identically. No source file changed. The only working-tree changes afterwards were hook-managed (`.gener8v/runs.jsonl`, `.gener8v/pipeline-state.yaml`) and the parallel security reviewer's report.

| Command (from delivery record) | Re-run exit | Matches record |
|--------------------------------|-------------|----------------|
| `pnpm generate` | 0 | Yes: wrote the four `src/generated/*` files and `tests/fixtures/generated/description.ts` |
| `pnpm lint` | 0 | Yes: no findings |
| `pnpm typecheck` | 0 | Yes: no errors (includes the type-level assignment) |
| `pnpm test` | 0 | Yes: 16 files, 486 tests passed (schema-shape 19, schema-meta 5, schema-agreement 4, node-entry 4) |
| `pnpm bench` | 0 | Yes: p95 circle 0.0107 ms, number-line 0.0194 ms, xy-graph 0.0409 ms (record 0.0107, 0.0189, 0.0378; limit 5 ms) |
| `pnpm build` | 0 | Yes: entries and declarations emitted; `dist/schema.json` and `dist/vocabulary.json` byte-identical to `src/generated/` |
| `pnpm check:dist` | 0 | Yes: 4 built files scanned, no network APIs or modules |
| `pnpm size` | 0 | Yes: `./core` 9.13 kB of 25 kB |
| `pnpm publint` | 0 | Yes: "All good!" |
| `pnpm attw` | 0 | Yes: only the ignored `node10` and CJS rows in the ESM-only profile; `./schema.json` and `./vocabulary.json` resolve |
| `pnpm check:deps` | 0 | Yes: 0 runtime dependencies |
| `pnpm check:changesets` | 0 | Yes: 0 changesets checked |
| `pnpm generate && git status --porcelain -- src/generated tests/fixtures/generated` | 0 | Yes: empty output, so the committed files are fresh |

## Delivery Decisions Review

| Decision | Assessment | Notes |
|----------|------------|-------|
| DEL-001 | Reasonable | The files, the getters and the tests share one code path. Nothing at runtime reads the generated JSON, so the copies cannot drift. `tests/core/schema-shape.test.ts:182-208` and the node-entry test pin this. The cost is small: `./core` is 9.13 kB of its 25 kB budget |
| DEL-002 | Reasonable | The output is valid under the meta-schema, and it matches the validator, which rejects every description today. The zero-type tool schema uses `not`, which is outside the strict profile (CR-006). "Never publish before types exist" relies on CPSE TICKET-009 |
| DEL-003 | Reasonable | The direction is right. GSV-NFR-003 only requires that what the validator accepts, the schema accepts, so a stricter validator is allowed. Each validator-only rule is written into a description (`src/core/schema.ts:20-24`, `:55`, `:58`). The hazard's other option, keeping the agreement generator away from such strings, is unnecessary in this direction |
| DEL-004 | Reasonable | `COLOR_PATTERN` and `resolveColor` agree on the tested list and on my probes ("Blue", "#ABC", and the Kelvin sign, which both reject). The pattern uses only ASCII character classes |
| DEL-005 | Reasonable | An `anyOf` of `required` inside the type object is standard 2020-12, and Ajv's `strictRequired` is only a lint. Only the published profile carries it; the tool profile keeps the rule in the description and the validator. The generated TypeScript leaves every member optional, so the types do not encode the group. That is consistent with the criterion |
| DEL-006 | Reasonable, but the proof is weak | The fixture types give the type generator something to check now. The assignment does no excess-property check (CR-007), and the type tickets are told to copy the pattern |
| DEL-007 | Reasonable in substance | A one-value `enum` is equivalent to a `const` and more widely supported. It departs from the letter of AD-006, though, and it was in neither the approved plan nor Deviations from Plan (CR-005) |

**Deviations from Plan:**
- **Known-valid examples in the agreement generator:** this hides the cause instead of fixing it. The record blames random building for the missing "accepted by both" cases. The main cause is the inverted `fc.option` frequencies, and the examples reach only the fixture branch (`tests/core/schema-agreement.test.ts:103`). See CR-001.
- **`tests/package/node-entry.test.ts`:** acceptable. It checks the built getters against the static files the package ships.

**Known Hazards (ticket):**
1. **`anyOf`, never `oneOf` or `discriminator`:** done. See `src/core/schema.ts:152`; the test at `tests/core/schema-shape.test.ts:57-61` checks the absence.
2. **Two profiles, both generated:** done. `typeSchema` takes a `profile`, and the two builders share it (`src/core/schema.ts:109-171`).
3. **`unitImage` names read from the manifest at generate time:** not done here. The record moves the job to the pictograph definition. No delivery decision records the move, and no Known Hazard on DGP TICKET-005 carries it. DGP TICKET-004 still expects the generator to emit the names and the vocabulary to list their descriptions (CR-003).
4. **RES-001:** nothing to do. This delivery does not change `GraphTypeDefinition`.
5. **Build from `propertiesOf`, publish no `appliesTo`/`elementsOf`, one entry per term:** done.
   - `src/core/schema.ts:126`, `:254` and `:310` all read `propertiesOf`.
   - `tests/core/schema-shape.test.ts:166-171` checks that neither field is published.
   - `terms[term] ??=` keeps one entry per term, and the consistency test guarantees a single kind and definition for each.
6. **Color names in any ASCII case:** done (DEL-004).
7. **`maxItems` published; the character policy and value limit documented as validator-only:** done (`src/core/schema.ts:84`, DEL-003).
8. **Derivation groups, `ordered`, `maxItems` and check names published:** done (`src/core/schema.ts:218-225`, `:255-260`). The design's Data Model amendment remains an open follow-up for the Technical Design skill, as the hazard says.

## Findings

### CR-001: The GSV-NFR-003 agreement test almost never generates a description the validator accepts, so it rarely tests the property

**Severity:** Issue
**Location:** `tests/core/schema-agreement.test.ts:56-70` (`object`, the `fc.option` frequencies at `:63`), `:75` (`version`), `:83` and `:103` (examples), `:114-115` (floors)
**Traces To:**
- GSV-NFR-003.
- Acceptance criterion "≥ 1,000 descriptions per registered graph type (valid, mutated and random)".
- GSV-REQ-011, which the ticket's Notes say is "proven by GSV-NFR-003's property test".
- The delivery record's first Deviation from Plan.

**Description:** A counterexample to GSV-NFR-003 is a description the validator accepts and the schema rejects, so the property only has power over descriptions the validator accepts. The "built" family, weighted 6 of 9 and commented "mostly well-formed", almost never produces one:
- In fast-check 4.10.2, `fc.option(arb, { freq })` returns `null` with probability `1/freq`. The `OptionConstraints.freq` documentation says: "The probability to build a nil value is of 1 / freq".
- So `{ freq: 8 }` at `:63` adds an unknown key to 7 objects in 8, at every nesting level.
- `{ freq: 6 }` deletes a key from 5 objects in 6.
- `version` at `:75` is present 3 times in 4, and only a quarter of those carry the value 1.
- The comment at `:56` says "now and then an extra key".
- Each value is out of kind or range about one time in three as well.

Measured with the test's own arbitraries, copied to a scratch file outside the repository (seed 42, 1,000 descriptions per fixture type):

| Type | Built descriptions | Validator accepts | With an extra top-level key | Accepted by both, all from the 3 constant examples |
|------|-------------------|-------------------|------------------------------|-----------------------------------------------------|
| number-line | 664 | 0 | 570 | 106 |
| xy-graph | 664 | 0 | 579 | 106 |
| circle | 664 | 1 | 585 | 106 |

To measure the test's power, I made the schema stricter than the validator in one place, in memory. I then ran the test's property at 1,000 runs with seeds 1 to 10:

| Injected schema defect | Found, as written | Found, with the frequencies the comment intends |
|------------------------|-------------------|-----------------------------------------------|
| number-line `arrowheads` without `"right"` | 0/10 | 8/10 |
| number-line `tickCount` maximum 10 instead of 100 | 0/10 | 10/10 |
| x,y graph `showGrid` required | 0/10 | 2/10 |
| circle `radius` maximum 1,000 instead of 1,000,000 | 2/10 | 2/10 |

Even at the intended frequencies, without the examples, only 13, 1 and 14 descriptions per 1,000 are accepted by both sides (number line, x,y graph, circle). The value-level noise compounds too.

**Impact:**
- **What the test checks:** in practice, the "valid" family is the three constant fixture examples, which `:120-126` already checks. GSV-NFR-003 passes, but the property is tested on almost nothing that could break it. GSV-REQ-011's stated proof is therefore weak.
- **Real types:** the registered-type branch passes no examples (`:103`). When a real type registers, `expect(bothAccepted).toBeGreaterThan(0)` (`:115`) will fail for number-line and x,y graph definitions shaped like the fixtures. For a circle it will pass or fail by seed, because fast-check is unseeded.
- **Downstream:** the type tickets are not told to supply examples. The record's Notes defer that "once a shared examples/ source exists".

**Recommendation:**
- **Frequencies:** fix them. `fc.option` makes `null` one time in `freq`. For "now and then", use for example `fc.oneof({ weight: 7, arbitrary: fc.constant(null) }, { weight: 1, arbitrary: … })`.
- **Families:** separate them.
  - A valid family builds only well-formed descriptions: required keys present, values in range, ordered pairs in order, one derivation member, no extra keys.
  - A mutated family applies exactly one mutation to a valid description, so most mutated cases sit next to the boundary.
  - Keep random JSON as the third family.
- **Registered types:** generate the valid family from the definition, or read `examples/<type>.json` (TICKET-006 requires one per type), so the branch does not depend on fixtures.
- **Floor:** raise `bothAccepted > 0` to a meaningful share, for example at least 10% of runs, so a weak generator fails loudly.
- **Self-test (optional):** keep a deliberately stricter schema, like the probes above, that must produce a counterexample.

**Status:** Resolved
**Resolution:** The agreement generator works one fault from a valid base per type, with lists at `maxItems` and one past it. There are floors of over 10% on each side and a negative control. Registered types read `examples/<type>.json`.

---

### CR-002: The vocabulary does not publish the `type` and `version` terms

**Severity:** Issue
**Location:** `src/core/schema.ts:246-266` (`buildVocabulary`), `:174-204` (`TermUse`, `Vocabulary`)
**Traces To:**
- GSV-REQ-012: "every property name in a description should be a term from that vocabulary".
- GSV-REQ-013 and GSV-REQ-014.
- Acceptance criterion "Vocabulary: every term with its plain-English definition, and per type the applicable terms, required/optional, value kind…".
- The specification's User Interactions: "write a description using only the published schema and vocabulary".

**Description:**
- **The gap:** every description carries a required `type` and may carry `version`. The vocabulary publishes neither. `terms` and each type's `properties` come only from `propertiesOf(type)` and the nested specs.
- **Probed on the fixture registry:** 30 terms, with no `type` and no `version`. The circle's properties are `title, lineColor, radius, diameter, circumference, showCenter, unit, shadedFraction`.
- **The other outputs:** the published schema and the generated TypeScript both include `type` and `version` (`src/core/schema.ts:116-125`, `:308-309`). Only the vocabulary leaves them out, and no delivery decision says why.

**Impact:**
- A reader of the vocabulary is never told that every description must carry `type`, what its values are, or that `version` exists and may only be 1.
- CPSE TICKET-008 builds each type's input table from the generated vocabulary, so the documented tables will lack both.
- TICKET-006's documentation test (GSV-NFR-005) checks vocabulary entries, so these two terms would escape it.

**Recommendation:**
- **Terms:** publish `terms.type` (kind `enum`) and `terms.version` (kind `integer`).
- **Per type:** add `type: { kind: "enum", required: true, values: [<type>] }` and `version: { kind: "integer", required: false, range: { min: 1, max: 1 } }` to each type's `properties`.
- **Wording:** take it from the schema's envelope descriptions (`src/core/schema.ts:119-124`), so the two have one source.
- **Test:** add a shape test.
- **Alternatively:** record a decision that the envelope fields are documented by the schema only, and settle that reading of GSV-REQ-012 through the Specification skill.

**Status:** Resolved
**Resolution:** `type` and `version` are published as terms and in each type's properties, worded from one constant.

---

### CR-003: The `unitImage` manifest hand-off is not recorded, and three tickets now disagree on who reads the manifest

**Severity:** Issue
**Location:**
- `scripts/generate.ts:12-30`: reads only the definitions.
- `src/core/schema.ts:174-204`: `Vocabulary` has no place for an enum value's description.
- Delivery record, Pre-Flight row "Image manifest for `unitImage`" and the Notes line "For DGP TICKET-005".

**Traces To:**
- The ticket's third Known Hazard: "read them from the manifest at generate time, never hard-code them".
- `.gener8v/technical-design/system-design.md:257` (Schema generator dependencies: "Image set manifest") and `:394` (ImageAsset: "listed in the vocabulary and schema as allowed `unitImage` values").
- `graph-library/data-graphs-and-pictographs/TICKET-004`, criterion at `:28` and Notes at `:54`.
- DGP-REQ-035.

**Description:**
- **The delivery's approach:** the generator reads only definitions. The pictograph definition (DGP TICKET-005) is expected to take its `unitImage` enum from the manifest. In substance this is sound, because one enum then feeds the validator, the schema and the vocabulary. But the move is recorded only as a pre-flight row and a line in Notes, not as a delivery decision.
- **DGP TICKET-005:** its Known Hazards do not say that the definition's `unitImage` values are the only route by which the image names reach the schema and the vocabulary.
- **DGP TICKET-004:** it still says `getImageNames()` exists "so the schema generator (GSV TICKET-005) emits it as the `unitImage` enum and the vocabulary lists each name with its description". Its Notes say: "Coordinate with GSV TICKET-005 so the generator reads `getImageNames()`".
- **Image descriptions:** `TermUse.values` is a plain list of strings, so "each name with its description" cannot be met without changing this ticket's vocabulary format.

**Impact:**
- GSV TICKET-005 says the definition reads the manifest, DGP TICKET-004 says the generator does, and DGP TICKET-005 is told neither.
- A pictograph implementer who follows their own ticket may hard-code the names or wait for the generator.
- The image descriptions DGP-REQ-035 publication expects have nowhere to go.

**Recommendation:**
- **Record the decision:** add a delivery decision for the hand-off.
- **Pictograph ticket:** in resolution, defer to `graph-library/data-graphs-and-pictographs/TICKET-005`, appending a Known Hazard: "build `unitImage` `values` from `getImageNames()`; never hard-code them; the generator reads only the definition".
- **Image descriptions, either:**
  - extend `Vocabulary` now, for example with an optional `images: Record<name, description>` or a `valueDescriptions` map on `TermUse`;
  - or defer to `graph-library/data-graphs-and-pictographs/TICKET-004` with a Known Hazard to extend the format, and correct its criterion's "the schema generator emits it".

**Status:** Resolved
**Resolution:** Recorded as DEL-008: the definition builds the `unitImage` enum from the manifest. `EnumValue.valueDescriptions` is published. Known Hazards on DGP TICKET-004 and TICKET-005.

---

### CR-004: The `@spec Coverage` row for GSV-REQ-035 does not list `buildVocabulary`

**Severity:** Issue
**Location:** `.gener8v/specifications/graph-specification-and-vocabulary.md:203`; `src/core/schema.ts:245`
**Traces To:** Code Review step 8 (the specification's table lists the code's locations); `.gener8v/CONVENTIONS.md` §2 (Delivery maintains `## @spec Coverage`); GSV-REQ-035
**Description:**
- **The annotation:** the delivery annotates `buildVocabulary` with `@spec GSV-REQ-035`, correctly. Publishing the derivation groups is what completes GSV-REQ-035 (this ticket's last Known Hazard, and TICKET-004 code review CR-005).
- **The stale row:** the specification's GSV-REQ-035 row still lists only `src/core/definitions/types.ts`:Derivation.
- **Why the lint passes:** the rows for the ticket's eight requirements match (`:208-215`), and the gener8v lint reports 0 errors. It does not compare annotation locations against existing rows.

**Impact:** The specification says GSV-REQ-035 is served by a type declaration alone. Anyone tracing "publish" from the table will not find the code that publishes.
**Recommendation:** Extend the row to: `src/core/definitions/types.ts`:Derivation; `src/core/schema.ts`:buildVocabulary.
**Status:** Resolved
**Resolution:** The coverage rows for GSV-REQ-035 and GSV-REQ-012 list `buildVocabulary`.

---

### CR-005: DEL-007 and the missing documentation tables put the design and CPSE TICKET-008 out of step with the generator

**Severity:** Observation
**Location:**
- `src/core/schema.ts:122-125`: the tool-profile `type` and `version`.
- `.gener8v/technical-design/system-design.md:52` (AD-003), `:93` (AD-006 tool schema) and `:253` (Schema generator responsibility).
- `.gener8v/changes/graph-library/tickets/component-packaging-and-source-export/TICKET-008.md:18`.
- The delivery record's Deviations from Plan.

**Traces To:** AD-006 (the tool `graph` is "<anyOf as above>", each object with `type` as a `const`); AD-003 ("… and documentation tables"); DEL-007
**Description:**
- **DEL-007:**
  - The tool profile gives `type` as `{ type: "string", enum: [<type>] }`, where AD-006 reuses the published `anyOf`, in which `type` is a `const`.
  - The two forms are equivalent, and DEL-007's portability reason is sound.
  - But the approved plan named only optional enums and `version` as changing in the tool profile, and Deviations from Plan does not mention DEL-007.
- **Documentation tables:**
  - AD-003 and the Schema generator component say `scripts/generate.ts` writes documentation tables.
  - CPSE TICKET-008's Prior Art reads "TICKET-005 output — `src/generated/vocabulary.json`, generated documentation tables".
  - TICKET-005's Output never asked for them and none are generated. So the code is not at fault, but a downstream ticket expects a file that does not exist.

**Impact:** Nothing breaks now. Two downstream tickets will meet the mismatch:
- CPSE TICKET-007 re-verifies the tool profile with AD-006 as its reference.
- CPSE TICKET-008 will look for the tables.

**Recommendation:**
- **Record the deviation:** add DEL-007 to the record's Deviations from Plan.
- **Design follow-up:** add AD-006's tool `type` form to the open Technical Design follow-up, which already holds the Data Model amendment carried from TICKET-004.
- **Documentation tables, either:**
  - in resolution, defer them to `graph-library/component-packaging-and-source-export/TICKET-008` with a Known Hazard: "no documentation tables are generated; build the input tables from `vocabulary.json`";
  - or amend AD-003.

**Status:** Resolved
**Resolution:** DEL-007 added to Deviations. Known Hazard on CPSE TICKET-008 (no generated tables). Design follow-up recorded.

---

### CR-006: With no type registered, the tool schema uses `not`, and no test checks the real registry's tool schema against the profile

**Severity:** Observation
**Location:** `src/core/schema.ts:163-165`; `src/generated/tool-schema.json`; `tests/core/schema-shape.test.ts:21-22`, `:136-141`
**Traces To:** prd/IC-001; AD-006 (strict profile); DEL-002; the ticket's Constraints line
**Description:**
- **What the committed file holds:** today `buildToolSchema(definitions)` returns `graph: { description, not: {} }`, and that is what `src/generated/tool-schema.json` contains.
- **What the profile tests check:** the shape test goes beyond the ticket's list and rules out `allOf`, `const` and `$ref`, because strict providers reject them. `not` is the same kind of composition keyword. Apart from it, the fixture tool schema uses no composition keyword except `anyOf`.
- **What is never checked:** the profile tests (closed objects, every property required, forbidden keywords) run only on `buildToolSchema(fixtureRegistry)`. The real registry's tool schema is checked only for freshness and meta-schema validity.

**Impact:**
- Low while DEL-002's "never publish before types exist" holds.
- But CPSE TICKET-007 imports this file as `inputSchema` and checks it against provider rules. Its Notes say it can be built before any type beyond the circle exists.
- Once types register, nothing would catch a real tool schema leaving the profile.

**Recommendation:**
- **Tests:** run the tool-profile tests over both registries (skip the per-type count when no type is registered), and add `not` to the forbidden list.
- **The zero-type output:** give `graph` a strict-profile form, for example a closed object with no properties and a description. The validator still rejects it with `unknown_graph_type`. Alternatively, record that the zero-type output is exempt.

**Status:** Resolved
**Resolution:** The tool-profile tests run on both registries with `not` forbidden; the zero-type `graph` is a closed, empty object.

---

### CR-007: The type-level test cannot tell when a generated interface drops a property

**Severity:** Observation
**Location:** `tests/core/schema-shape.test.ts:19`; `tests/fixtures/definitions/index.ts:16-39`
**Traces To:** Acceptance criterion "Generated TypeScript types match the definitions (a type-level test assigns each example to `GraphDescription`)"; GSV-REQ-015; DEL-006 (the type tickets copy the pattern)
**Description:**
- **Why it is blind:** `const typedExamples: readonly GraphDescription[] = fixtureExamples` assigns a variable, not a literal, so TypeScript skips the excess-property check.
- **What it catches:** a wrong value type, a wrong `type` literal, or a required property that an example lacks.
- **What it misses:** a property missing from the generated interface.
- **Probed with the repository's `tsc`:** this union still accepts all three examples (exit 0):
  - a circle interface without `title`, `lineColor`, `showCenter` and `unit`;
  - a number-line interface without `points`;
  - an x,y graph interface with nothing but the axes.

**Impact:** The criterion's method is met as written, but the test would still pass if `buildDescriptionTypes` stopped emitting shared options or optional terms. Each type ticket inherits the same blind spot.
**Recommendation:** Check the examples as literals. For example, write the `fixtureExamples` literal `as const satisfies readonly GraphDescription[]`, with a type-only import from `tests/fixtures/generated/description.ts`. Or add a key-equality check per interface, for example Vitest's `expectTypeOf<keyof CircleDescription>()` against the definition's terms.
**Status:** Resolved
**Resolution:** Fixture examples are checked as literals with `satisfies`, plus a structural test of every term in the generated types.

---

### CR-008: An `undefined`-valued unknown key is rejected by the schema and accepted by `validate`

**Severity:** Observation
**Location:** `src/core/validate/structure.ts:200-201`; `src/core/schema.ts:100`
**Traces To:** GSV-REQ-011; GSV-NFR-003; `TICKET-003/DEL-002` (`undefined` counts as absent)
**Description:**
- **The case:** for `{ type: "circle", radius: 1, sparkle: undefined }`, Ajv rejects the description, because `additionalProperties: false` sees the own key. `validateWith` accepts it, because TICKET-003/DEL-002 treats `undefined` as absent before the key is looked up.
- **Known keys:** a known key set to `undefined` gives the same answer on both sides, since both treat it as absent.
- **Why tests miss it:** the value is not JSON (GSV-REQ-005), so the JSON form of the description has no such key. `fc.jsonValue` never generates one.

**Impact:** Only an in-memory caller who checks an object with a JSON Schema validator and then with `validate` can see the two disagree. No tool call or file input can produce the case.
**Recommendation:** No code change is needed. State in the schema's root description, or in DEL-003's list and CPSE TICKET-008's documentation, that the schema and the validator agree on the JSON form of a description. The alternative, reporting an `undefined`-valued unknown key as unknown, would reverse TICKET-003/DEL-002.
**Status:** Resolved
**Resolution:** The root description states that agreement covers the JSON form; Known Hazard on CPSE TICKET-008.

## Resolution Log

| Finding | Decision | Action Taken | File Updated |
|---------|----------|-------------|--------------|
| CR-001 | Approved | The agreement generator works one fault from a valid base per type, with lists at `maxItems` and one past it. There are floors of over 10% on each side and a negative control. Registered types read `examples/<type>.json`. | see Post-Review Amendments |
| CR-002 | Approved | `type` and `version` are published as terms and in each type's properties, worded from one constant. | see Post-Review Amendments |
| CR-003 | Approved | Recorded as DEL-008: the definition builds the `unitImage` enum from the manifest. `EnumValue.valueDescriptions` is published. Known Hazards on DGP TICKET-004 and TICKET-005. | see Post-Review Amendments |
| CR-004 | Approved | The coverage rows for GSV-REQ-035 and GSV-REQ-012 list `buildVocabulary`. | see Post-Review Amendments |
| CR-005 | Approved | DEL-007 added to Deviations. Known Hazard on CPSE TICKET-008 (no generated tables). Design follow-up recorded. | see Post-Review Amendments |
| CR-006 | Approved | The tool-profile tests run on both registries with `not` forbidden; the zero-type `graph` is a closed, empty object. | see Post-Review Amendments |
| CR-007 | Approved | Fixture examples are checked as literals with `satisfies`, plus a structural test of every term in the generated types. | see Post-Review Amendments |
| CR-008 | Approved | The root description states that agreement covers the JSON form; Known Hazard on CPSE TICKET-008. | see Post-Review Amendments |

## Verdict

**Result:** Approved
**Unresolved Findings:** 0
**Notes:** Resolved with the Product Owner on 2026-10-06. All eight findings were fixed or carried to the tickets that need them, and re-verified with generate, lint, typecheck, 500 tests, bench, build, `check:dist`, size, publint, attw, `check:deps` and `check:changesets`, all exit 0 (see the delivery record's Post-Review Amendments). The Technical Design follow-up (Data Model, AD-006's tool `type` form, AD-003's tables) stays open for the Technical Design skill.
