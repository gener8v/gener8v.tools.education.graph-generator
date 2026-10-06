# TICKET-005: Schema generator — published schema, strict tool schema, types and vocabulary — Delivery Record

## Ticket Reference

**Ticket:** graph-library/graph-specification-and-vocabulary/TICKET-005
**Change:** `.gener8v/changes/graph-library/change.md`, Approved when delivery started
**Specification:** `.gener8v/specifications/graph-specification-and-vocabulary.md`
**Requirements Covered:**
- GSV-REQ-007: Publish a machine-readable JSON Schema covering every type
- GSV-REQ-008: Parameters of each type defined separately, selected by the graph-type field
- GSV-REQ-009: Plain-English description of every type and property
- GSV-REQ-010: Schema available programmatically and as a static file
- GSV-REQ-011: Reject every description the published schema rejects
- GSV-REQ-013: Publish the vocabulary with definitions
- GSV-REQ-014: Publish, per type, applicable, required and optional terms and their value kinds
- GSV-REQ-015: Vocabulary, schema and validation generated from one definition
- GSV-NFR-002: The published schema is valid against the meta-schema it declares, verified by a meta-schema validation test in CI
- GSV-NFR-003: No description the schema rejects passes validation, verified by a fast-check property test generating at least 1,000 descriptions per graph type in CI

## Pre-Flight Reconciliation

**Verdict:** Go

| Assumption (from ticket) | Expected | Found in repo | Status |
|--------------------------|----------|---------------|--------|
| Depends On: TICKET-001 delivered | delivery record, Delivered | Delivered, reviews resolved (3276f1e, 86feceb) | ✅ |
| Depends On: TICKET-003 delivered | delivery record, Delivered | Delivered, reviews resolved (450c9f7, 6085609). TICKET-004, which this builds on through the validator, is also delivered and resolved (2e9d5b6, 6408c11) | ✅ |
| Definitions, `propertiesOf`, `sharedProperties` | present | present: `ValueSpec` kinds, `ordered`, `maxItems`, `Derivation { members, description, required }`, `DomainCheck { name, inputs }` | ✅ |
| `package.json` `exports` `./schema.json`, `./vocabulary.json` | present | present, pointing at `dist/schema.json` and `dist/vocabulary.json` | ✅ |
| `tsup.config.ts` copies the generated JSON into `dist/` | present | `onSuccess` copies `src/generated/{schema,vocabulary}.json` | ✅ |
| `package.json` `generate` script | present (CPSE TICKET-001 Output, DEL-007) | absent: CPSE TICKET-001 DEL-007 left it to this ticket | ⚠️ Non-blocking; this ticket adds it |
| CI freshness step (`.github/workflows/ci.yml`) | present | present; runs `pnpm generate` and fails on changes under `src/generated` once `scripts/generate.ts` exists | ✅ |
| `src/generated/schema.json`, `vocabulary.json` | placeholders to replace | placeholders (`"not": {}`, empty vocabulary) | ✅ |
| Ajv and fast-check available as dev dependencies | installable | not installed; `ajv` 8.20.0 and `fast-check` 4.10.2 are current on npm | ⚠️ Non-blocking; added as dev dependencies only (prd/TC-008) |
| Image manifest for `unitImage` (DGP TICKET-004) | read at generate time | absent: DGP TICKET-004 is not delivered and no pictograph is registered | ⚠️ Non-blocking. The generator reads only definitions; the pictograph definition (DGP TICKET-005) takes its `unitImage` enum from the manifest, so the schema follows the manifest with nothing hard-coded |
| Registered graph types | some | none: the real registry is empty until the type tickets land | ⚠️ Resolved in plan. The generated files describe zero types until then; the shape, meta-schema and agreement tests run on the fixture types and on every registered type |
| Carried findings deferred to this ticket | read the Known Hazards | `anyOf` (no `oneOf`); two profiles; manifest; RES-001; `propertiesOf` and one entry per term; case-insensitive color names; `maxItems` and validator-only rules; publish derivation groups, `ordered`, check names | 🔁 Carried. Each is addressed in the plan |

**Resolved from ground truth (not escalated):**
- **GSV-NFR-003's direction:** "no description the schema rejects passes validation" means everything the validator accepts must be accepted by the schema. Validator-only rules (the plain-text character policy, the 10,000-value limit, `ordered`, derivation agreement, domain checks) make the validator stricter than the schema, which the requirement allows. So they can be documented in descriptions instead of being forced into schema keywords, as the hazard permits.

**Blocking findings:** None.

## Implementation Plan

**Repository:** `.` (branch `ticket/gsv-005`, cut from `ticket/gsv-004`)
**Plan approved by:** Engineer — Thomas, 2026-10-06

### Planned Files

- `src/core/schema.ts`: pure builders from a registry, shared by the generator, the runtime getters and the tests (GSV-REQ-015).
  - `buildSchema(registry)`, the published JSON Schema 2020-12:
    - root `anyOf` of one closed object per registered type, in `GRAPH_TYPES` order; `type` as a `const`; `version` as `{ const: 1 }`;
    - properties from `propertiesOf(type)`; optional properties not `required`; a `description` on every type and property;
    - kinds: number with `minimum`/`maximum`/`exclusiveMinimum`/`exclusiveMaximum`, integer, string, boolean, string `enum`, closed object with `required`, array with `items` and `maxItems`, and color as a pattern for `#rgb`/`#rrggbb` plus the named colors in any ASCII case, matching `resolveColor`;
    - a required derivation group as `anyOf` of `required` alternatives inside its type, named in the type's description;
    - the validator-only rules (plain-text characters, `ordered`, derivation agreement, domain checks, the 10,000-value limit) written into the descriptions;
    - with no type registered: `{ "not": {} }` with a description.
  - `buildToolSchema(registry)`, the strict profile:
    - root `{ type: "object", properties: { graph: { anyOf } }, required: ["graph"], additionalProperties: false }`;
    - every object closed, with every property required; optional properties `[kind, "null"]`, with optional enums gaining `null` and `version` as `enum: [1, null]`;
    - no `oneOf`, `if`/`then`/`else`, `patternProperties`, `format` or `discriminator`, and no derivation-group `anyOf`.
  - `buildVocabulary(registry)`:
    - `terms`: one entry per term, with its definition and kind;
    - `graphTypes`: title, description, terms (required, kind, range, enum values, `maxItems`, `ordered`, nested terms), derivation groups (members in defining order, description, required) and check names;
    - `colors` and `limits`;
    - no `appliesTo` or `elementsOf`.
  - `buildDescriptionTypes(registry)`: TypeScript source for one interface per type plus the `GraphDescription` union, or `never`.
  - `getSchema()`, `getToolSchema()` and `getVocabulary()`: built from the real registry on first call, then cached and deep-frozen. Exported from `./core`.
- `scripts/generate.ts`: writes `src/generated/{description.ts, schema.json, tool-schema.json, vocabulary.json}` from the real registry, and `tests/fixtures/generated/description.ts` from the fixture types.
- `package.json`: `"generate": "tsx scripts/generate.ts"`, plus dev dependencies `ajv` (8) and `fast-check` (4). No runtime dependency.
- `.github/workflows/ci.yml`: the freshness step also watches `tests/fixtures/generated`.
- `tests/core/schema-shape.test.ts`: published and tool shapes, vocabulary contents, the empty-registry output, and committed files equal to a fresh build.
- `tests/core/schema-meta.test.ts` (GSV-NFR-002): Ajv 2020-12 meta-schema validation of both schemas, for the real registry and the fixtures.
- `tests/core/schema-agreement.test.ts` (GSV-NFR-003):
  - at least 1,000 descriptions per type with fast-check: valid, mutated (wrong kinds, out of range, extra and dropped keys) and random JSON;
  - Ajv rejects ⇒ `validate` rejects; valid fixtures pass both;
  - covers the fixture types and every registered type.
- Type-level test: each fixture example is assigned to the generated `GraphDescription` (typecheck).

### How Acceptance Criteria Will Be Met

- `pnpm generate` writes the four files; the build copies schema and vocabulary to `dist`: the Verification Run (`pnpm generate`, `pnpm build`) and `schema-shape.test.ts` (committed equals fresh).
- CI fails on stale generated files: the existing freshness step, now active, plus `schema-shape.test.ts`.
- Published and tool schema shapes: `schema-shape.test.ts`.
- Vocabulary contents: `schema-shape.test.ts`.
- Generated types match the definitions: the type-level test under `pnpm typecheck`.
- Getters exported from `./core`: `schema-shape.test.ts` and `tests/package/node-entry.test.ts`.
- GSV-NFR-002: `schema-meta.test.ts`. GSV-NFR-003: `schema-agreement.test.ts`.
- No runtime dependency: `pnpm check:deps`.
- Decisions to record:
  - DEL-001: shared builders;
  - DEL-002: the empty-registry schema;
  - DEL-003: validator-only rules documented, not encoded;
  - DEL-004: the color pattern;
  - DEL-005: derivation groups as `anyOf` of `required`, in the published schema only;
  - DEL-006: fixture-generated types.

## Progress

- [x] `src/core/schema.ts`: done
- [x] `src/core/index.ts` (getters): done
- [x] `scripts/generate.ts`: done
- [x] `package.json` (`generate`, dev dependencies): done
- [x] `.github/workflows/ci.yml`: done
- [x] `src/generated/*` and `tests/fixtures/generated/description.ts` (generated): done
- [x] `tests/core/schema-shape.test.ts`: done
- [x] `tests/core/schema-meta.test.ts`: done
- [x] `tests/core/schema-agreement.test.ts`: done
- [x] type-level test: done

## Delivery Summary

**Status:** Delivered
**Verification:** passed
**Reviews Deferred:** none
**Files Produced:**
- `src/core/schema.ts`:
  - builders `buildSchema`, `buildToolSchema`, `buildVocabulary` and `buildDescriptionTypes`, plus `COLOR_PATTERN`;
  - getters `getSchema`, `getToolSchema` and `getVocabulary` (lazily built, cached, deep-frozen);
  - types `JsonSchema`, `Vocabulary` and `TermUse`.
- `src/core/index.ts`: exports the three getters and the `JsonSchema`, `Vocabulary` and `TermUse` types.
- `scripts/generate.ts`: writes the four `src/generated/*` files and `tests/fixtures/generated/description.ts`.
- `src/generated/description.ts`, `schema.json`, `tool-schema.json`, `vocabulary.json`: generated from the real registry, which is empty for now (zero types).
- `tests/fixtures/generated/description.ts`: generated from the fixture types.
- `package.json`: the `generate` script, and dev dependencies `ajv` ^8.20.0 and `fast-check` ^4.10.2.
- `.github/workflows/ci.yml`: the freshness step also covers `tests/fixtures/generated`.
- `tests/core/schema-shape.test.ts` (19 tests, including the type-level assignment of every fixture example to the generated `GraphDescription`), `tests/core/schema-meta.test.ts` (5), `tests/core/schema-agreement.test.ts` (4).
- `tests/package/node-entry.test.ts`: the getters from the built `./core` equal `./schema.json` and `./vocabulary.json`.

## Verification Run

Node.js v24.1.0, pnpm 10.28.2, branch `ticket/gsv-005`.

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm generate` | 0 | wrote the four `src/generated/*` files and `tests/fixtures/generated/description.ts` |
| `pnpm lint` | 0 | no findings |
| `pnpm typecheck` | 0 | no errors; includes the type-level test (`const typedExamples: readonly GraphDescription[] = fixtureExamples`) |
| `pnpm test` | 0 | 16 files, 486 tests passed (schema-shape 19, schema-meta 5, schema-agreement 4, node-entry 4) |
| `pnpm bench` | 0 | p95: circle 0.0107 ms, number-line 0.0189 ms, xy-graph 0.0378 ms |
| `pnpm build` | 0 | entries and declarations emitted; `dist/schema.json` and `dist/vocabulary.json` copied |
| `pnpm check:dist` | 0 | no network APIs in built output |
| `pnpm size` | 0 | `./core` 9.13 kB of 25 kB |
| `pnpm publint` | 0 | "All good!" |
| `pnpm attw` | 0 | no problems in the ESM-only profile |
| `pnpm check:deps` | 0 | 0 runtime dependencies (`ajv` and `fast-check` are dev only) |
| `pnpm check:changesets` | 0 | 0 changesets |
| `pnpm generate && git status --porcelain -- src/generated tests/fixtures/generated` (after commit) | 0 | empty output: committed files are fresh |

## Acceptance Criteria Verification

- [x] `pnpm generate` writes the four files, and the build copies schema and vocabulary to `dist/`, exported as `./schema.json` and `./vocabulary.json`:
  - the Verification Run (`pnpm generate`, `pnpm build`);
  - `node-entry.test.ts` "serves the schema and vocabulary from ./core and as static files".
- [x] CI fails when committed generated files differ from a fresh run:
  - the `.github/workflows/ci.yml` freshness step, now active because `scripts/generate.ts` exists, covering `src/generated` and `tests/fixtures/generated`;
  - `schema-shape.test.ts` "are committed exactly as a fresh build writes them" fails on drift too;
  - the after-commit check in the Verification Run.
- [x] Published schema: 2020-12, a root `anyOf` of closed objects with `type` as a `const`, optional properties not required, a description everywhere. `schema-shape.test.ts` "published schema" group.
- [x] Tool schema: object root with `graph`, every object closed, every property required, optional properties `[kind, "null"]`, none of the forbidden keywords. `schema-shape.test.ts` "tool schema" group. It also rules out `const`, `allOf` and `$ref`.
- [x] Vocabulary: every term with its definition, and per type the applicable terms, required or optional, kind, range and derivation groups. `schema-shape.test.ts` "vocabulary" group.
- [x] Generated TypeScript types match the definitions: the type-level assignment of every fixture example in `schema-shape.test.ts`, checked by `pnpm typecheck`.
- [x] `getSchema()`, `getToolSchema()` and `getVocabulary()` are exported from `./core`: `schema-shape.test.ts` "are served by getters from ./core"; `node-entry.test.ts`.
- [x] GSV-NFR-002, both schemas validate against the 2020-12 meta-schema with Ajv in CI: `schema-meta.test.ts`, for the registered types and the fixture types, with a negative control.
- [x] GSV-NFR-003, at least 1,000 descriptions per registered type (valid, mutated, random) and nothing Ajv rejects passes `validate`: `schema-agreement.test.ts`, 1,000 runs per type over the fixture types and every registered type. It also asserts that over 10% are rejected by the schema and some are accepted by both, so both sides are exercised.
- [x] No runtime dependency; Ajv is a dev dependency only: `pnpm check:deps`, 0 runtime dependencies.

## Decisions Made

### DEL-001: One set of builders for the files, the getters and the tests

**Context:** AD-003 has a script write the files. The runtime needs `getSchema()` and `getVocabulary()`.
**Decision:** `src/core/schema.ts` holds pure builders that take a registry. `scripts/generate.ts` writes their output. The getters build from the real registry on first call, then cache and deep-freeze the result. Nothing at runtime imports the generated JSON.
**Rationale:** One code path cannot disagree with itself (GSV-REQ-015). Builder code is smaller in `./core` than eleven types' JSON would be, and the tests can build from fixture registries.
**Ticket Impact:** None to the Output. `./core` grew to 9.13 kB of its 25 kB budget.

### DEL-002: With no registered type, the schema describes zero types

**Context:** The real registry is empty until the type tickets land, and `anyOf` must not be empty under the meta-schema.
**Decision:**
- The published schema is `{ $schema, title, description: "No graph types are registered yet.", not: {} }`.
- The tool schema's `graph` is `{ description, not: {} }`.
- `GraphDescription` is `never`.
- The vocabulary has no graph types.

**Rationale:** All of this is valid against the meta-schema and honest. It matches the validator, which rejects every description today.
**Ticket Impact:** The committed `src/generated` files change as each type ticket registers its type: run `pnpm generate` in that delivery (the CI freshness step enforces it). Never publish the package before types exist (CPSE TICKET-009).

### DEL-003: Validator-only rules are described, not encoded

**Context:** Some rules have no JSON Schema form, or one that providers may reject:
- the plain-text character policy;
- `ordered` (minimum below maximum);
- derived values agreeing within 1%;
- domain checks;
- the 10,000-value limit.

**Decision:** These rules stay in the validator and are written into the descriptions:
- each string property says "Plain text: control, line-break, text-direction and invisible characters are not accepted";
- an object with `ordered` says "max must be greater than min";
- the root says what else the validator checks.

**Rationale:** GSV-NFR-003 and GSV-REQ-011 require that the validator never accept what the schema rejects. A stricter validator is allowed, and the agreement test proves the direction. Encoding the character policy as a `u`-flag pattern with supplementary-plane ranges would also be unportable to providers.
**Ticket Impact:** CPSE TICKET-008 documents these rules as validator-only.

### DEL-004: Colors as one pattern matching `resolveColor`

**Context:** `validate` accepts named colors in any ASCII case and `#rgb`/`#rrggbb`.
**Decision:** `COLOR_PATTERN` is `^(?:#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})|[Bb][Ll][Aa][Cc][Kk]|…)$`, built from `namedColors`. It is ASCII-only, so the Kelvin sign is rejected, as in `resolveColor`. A test checks that the pattern and `resolveColor` give the same answer on a list of values.
**Rationale:** One rule in both places, and the pattern uses only basic regular-expression syntax.
**Ticket Impact:** None.

### DEL-005: Required derivation groups are `anyOf` of `required`, in the published schema only

**Context:** A circle needs one of radius, diameter or circumference, and no single property is required.
**Decision:**
- In the published schema, a required group becomes `anyOf: [{ required: [radius] }, …]` inside its type's object (`allOf` of those when a type has several groups). The type's description says "Give one of …".
- The tool profile leaves it out: every property there is required and nullable, so the rule is in the description and the validator.

**Rationale:** The published schema should reject what it can. The tool profile must stay within the strict subset.
**Ticket Impact:** Ajv's `strictRequired` lint objects to this idiom, so the tests turn that lint off. It is not a JSON Schema rule.

### DEL-006: Fixture-generated types for the type-level test

**Context:** The type-level criterion needs examples and generated types, and no real type exists yet.
**Decision:** `pnpm generate` also writes `tests/fixtures/generated/description.ts` from the fixture registry. `schema-shape.test.ts` assigns every fixture example to its `GraphDescription`. Lists generate as `ReadonlyArray`, so `as const` examples can be assigned.
**Rationale:** It proves the type generator now. Each type ticket's example then joins the real generated types.
**Ticket Impact:** Type tickets assign their examples to `src/generated/description.ts`'s `GraphDescription` in their own tests.

### DEL-007: The tool profile names the graph type with `enum`, not `const`

**Context:** The published schema uses `type` as a `const`, as the criteria require. `const` support varies across provider subsets (prd/IC-001); `enum` is the most widely supported.
**Decision:** In the tool profile, `type` is `{ type: "string", enum: ["circle"] }`, and `version` is `{ type: ["integer", "null"], enum: [1, null] }`. The shape test asserts that the tool schema has no `const`.
**Rationale:** It is the same constraint in the most portable form, and keeps the tool profile within the common subset AD-006 aims for.
**Ticket Impact:** CPSE TICKET-007 re-verifies the profile against current provider rules (TQ-002) and changes the generator here if needed.

## Deviations from Plan

- **The agreement generator draws from known-valid examples** as well as built, mutated and random descriptions. Random building almost never produced a fully valid x,y graph (two ordered axes with every point inside), so "accepted by both" was not exercised. Type tickets add their examples for their type.
- **`tests/package/node-entry.test.ts`** was also changed, to check the getters against the static files from the built package.

## @spec Annotations

| Requirement | Code Location | Annotation |
|-------------|---------------|------------|
| GSV-REQ-007 | `src/core/schema.ts`:buildSchema | `@spec GSV-REQ-007` |
| GSV-REQ-008 | `src/core/schema.ts`:buildSchema | `@spec GSV-REQ-008` |
| GSV-REQ-009 | `src/core/schema.ts`:buildSchema | `@spec GSV-REQ-009` |
| GSV-REQ-010 | `src/core/schema.ts`:getSchema, getVocabulary | `@spec GSV-REQ-010` |
| GSV-REQ-011 | `src/core/schema.ts`:buildSchema | `@spec GSV-REQ-011` |
| GSV-REQ-013 | `src/core/schema.ts`:buildVocabulary, getVocabulary | `@spec GSV-REQ-013` |
| GSV-REQ-014 | `src/core/schema.ts`:buildVocabulary | `@spec GSV-REQ-014` |
| GSV-REQ-015 | `src/core/schema.ts`:buildSchema, buildToolSchema, buildVocabulary, buildDescriptionTypes | `@spec GSV-REQ-015` |
| GSV-NFR-002 | `tests/core/schema-meta.test.ts` (verification) | none in source |
| GSV-NFR-003 | `tests/core/schema-agreement.test.ts` (verification) | none in source |

## Notes

- **For the type tickets:**
  - Run `pnpm generate` and commit the changed `src/generated` files in the same delivery.
  - Add the type's example to the bench, and to the agreement test's examples once a shared `examples/` source exists.
  - Assign the example to the real `GraphDescription`.
- **For DGP TICKET-005 (pictograph):** build the `unitImage` enum values from the image manifest in the definition. The generator reads only definitions.
- **For CPSE TICKET-007:** `getToolSchema()` is the tool's `inputSchema`. Re-verify the profile against provider rules (TQ-002).
- **For CPSE TICKET-008:** publish the vocabulary's derivation groups, check names and limits, and document the validator-only rules (DEL-003).
- **Open follow-up, carried from TICKET-004:** the design's Data Model still needs amending through the Technical Design skill.

## Post-Review Amendments

Resolution of `graph-library/graph-specification-and-vocabulary-ticket-005-code-review`, `-quality-review` and `-security-review`, 2026-10-06, decisions by the Product Owner. The reports overlapped, so the fixes are recorded once, by group.

- **graph-specification-and-vocabulary-ticket-005-code-review/CR-001, CR-008; graph-specification-and-vocabulary-ticket-005-quality-review/QR-001, QR-002 (the agreement test's power):**
  - `tests/core/schema-agreement.test.ts` now works one fault away from a valid base description of each type. The families are: the base itself; one change at one place at any depth (a value replaced, a property deleted, or an unknown key added beside it, list elements included); a list grown to exactly `maxItems` or one past it; `version` variants; the base under another type; and random JSON.
  - Registered types take their base from `examples/<type>.json`. A missing file fails with a message naming it.
  - Each type must have over 10% of descriptions rejected by the schema and over 10% accepted by both.
  - A negative control injects a nested schema-only rule (number-line `tickCount` at most 10), and the test must find a counterexample.
  - A test confirms lists of 1,000 and 1,001 elements are generated.
  - **Correction to the Deviation** on known-valid examples: superseded by this generator.
  - **Correction to the GSV-NFR-003 criterion evidence:** agreement covers the JSON form of a description. An `undefined`-valued key is not JSON; this is now stated in the schema's root description, and a Known Hazard on CPSE TICKET-008 covers it.
- **graph-specification-and-vocabulary-ticket-005-code-review/CR-007; graph-specification-and-vocabulary-ticket-005-quality-review/QR-003 (type-level test):**
  - The fixture examples are now literals checked with `as const satisfies readonly GraphDescription[]`, so a property missing from the generated types fails typecheck.
  - A structural test checks that every term at every depth is declared, optional exactly when the term is.
- **graph-specification-and-vocabulary-ticket-005-code-review/CR-002; graph-specification-and-vocabulary-ticket-005-quality-review/QR-005, QR-006 (vocabulary completeness, one source for versions and types):**
  - The vocabulary publishes `type` and `version` as terms, and in every type's properties.
  - The schema, the tool schema, the vocabulary and the generated types all take their wording from `TYPE_DEFINITION` and `VERSION_DEFINITION`, and their versions from `SUPPORTED_VERSIONS`. The published `version` is now `enum: [1]`.
  - `Vocabulary.version` is replaced by `descriptionVersions`.
  - `SUPPORTED_VERSIONS`, `CURRENT_VERSION` and `registeredTypes` moved to `src/core/definitions/index.ts` and are used by the envelope stage, the builders and the tests. `envelope.ts` re-exports them.
  - `tests/core/definitions.test.ts` rejects `type` and `version` as definition terms.
- **graph-specification-and-vocabulary-ticket-005-code-review/CR-006; graph-specification-and-vocabulary-ticket-005-quality-review/QR-004 (tool schema):**
  - The tool-profile tests run on both registries, and `not` joins the forbidden keywords.
  - With no type registered, `graph` is a closed, empty object.
  - New tests: every example in tool form is accepted; `null` for a required property and unknown keys are rejected; every tool property is described.
- **graph-specification-and-vocabulary-ticket-005-security-review/SEC-001:**
  - The published schema's strings carry `PLAIN_TEXT_PATTERN` (`src/core/format.ts`), built from the same ranges as `isUnsafeCodePoint` (up to U+FFFF) and written only with `\uXXXX` escapes.
  - A property test (20,000 strings, with and without the `u` flag) shows it never rejects what the validator accepts.
  - The root description states which characters only the validator checks.
  - The tool profile is left to CPSE TICKET-007; CPSE TICKET-008 documents that `validate()` is the gate.
  - **Correction to DEL-003:** the character policy is now partly encoded.
- **graph-specification-and-vocabulary-ticket-005-security-review/SEC-002:** the vocabulary's term table has a null prototype and is written through an own-property check. A test pollutes `Object.prototype.radius` and `.title`, and every term remains. `tests/core/definitions.test.ts` rejects built-in object names (`toString`, `constructor` and others) as terms.
- **graph-specification-and-vocabulary-ticket-005-code-review/CR-003 (manifest hand-off), recorded as DEL-008:**
  - The schema generator reads only definitions.
  - DGP TICKET-005's pictograph definition builds its `unitImage` enum from `getImageNames()` and the manifest's descriptions.
  - `EnumValue` gains optional `valueDescriptions`, which the vocabulary publishes as `TermUse.valueDescriptions`; the definitions test checks that they describe real values.
  - Known Hazards on DGP TICKET-004 and TICKET-005.
- **graph-specification-and-vocabulary-ticket-005-code-review/CR-004:** the coverage rows for GSV-REQ-035 and GSV-REQ-012 list `buildVocabulary`, and the row for GSV-REQ-043 lists `PLAIN_TEXT_PATTERN`.
- **graph-specification-and-vocabulary-ticket-005-code-review/CR-005:**
  - **Addition to Deviations:** DEL-007 (`enum` in place of `const` for the tool profile's `type`) was not in the approved plan, which named only optional enums and `version`.
  - No documentation tables are generated; a Known Hazard on CPSE TICKET-008 says to build them from `vocabulary.json`.
  - **Open Technical Design follow-up** (with TICKET-004's Data Model amendment): record AD-006's tool `type` form (DEL-007) and that AD-003's documentation tables are built by CPSE TICKET-008.
- **graph-specification-and-vocabulary-ticket-005-quality-review/QR-007:** the getters return `DeepReadonly<…>` types and their doc comments say "Frozen; copy it to change it". A `@ts-expect-error` test confirms that a write does not compile and throws at run time.
- **graph-specification-and-vocabulary-ticket-005-quality-review/QR-008:** the plain-text and color rules are stated once, in the root and `graph` descriptions, instead of on every property. The repeated notes are gone from the per-property descriptions.
- **graph-specification-and-vocabulary-ticket-005-quality-review/QR-009:** `scripts/generated-files.ts` (`generatedFiles()`) is the one list the generator writes and the freshness test checks. `tests/helpers/ajv.ts` (`createAjv()`) is the one Ajv configuration.

Re-verification after the amendments (Node.js v24.1.0, pnpm 10.28.2):

| Command | Exit | Evidence |
|---------|------|----------|
| `pnpm generate` | 0 | the five files regenerated; committed with this resolution |
| `pnpm lint` | 0 | no findings |
| `pnpm typecheck` | 0 | no errors; includes the literal `satisfies` check of the fixture examples |
| `pnpm test` | 0 | 16 files, 500 tests passed (schema-shape 32, schema-agreement 5, schema-meta 5, definitions 19) |
| `pnpm bench` | 0 | p95: circle 0.0094 ms, number-line 0.0165 ms, xy-graph 0.0380 ms |
| `pnpm build` | 0 | entries, declarations, `dist/schema.json` and `dist/vocabulary.json` |
| `pnpm check:dist` | 0 | no network APIs in built output |
| `pnpm size` | 0 | `./core` 9.44 kB of 25 kB |
| `pnpm publint` | 0 | "All good!" |
| `pnpm attw` | 0 | no problems in the ESM-only profile |
| `pnpm check:deps` | 0 | 0 runtime dependencies |
| `pnpm check:changesets` | 0 | 0 changesets |
