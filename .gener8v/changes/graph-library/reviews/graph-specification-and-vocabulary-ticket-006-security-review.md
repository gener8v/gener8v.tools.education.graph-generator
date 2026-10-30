# TICKET-006: All-types completeness checks — Security Review

## Summary

This review covers `graph-library/graph-specification-and-vocabulary/TICKET-006` (branch `ticket/graph-library-gsv-006`, delivery commit `dba9db7`). The `security-reviewer` agent ran the findings phase in a fresh context.

The delivery does three things:
- adds a test-only completeness check;
- narrows the declared types of the two internal registries, `definitions` and `layouts`;
- adds two `@spec Coverage` rows.

It adds no new runtime code, entry point, dependency or published type, so the attack surface is unchanged. I confirmed this directly rather than taking it from the delivery record:
- both changed source files transpile to byte-identical JavaScript before and after the commit;
- neither registry appears in any published `.d.ts`;
- both registries are still frozen, null-prototype tables of exactly the twelve `GRAPH_TYPES`.

The new test passes the real data. It also fails when a limit is removed or a type goes missing from the literal. Its string-limit walk can still pass vacuously if the vocabulary's `kind` field changes shape. That is recorded as one Informational finding (SEC-001).

One finding: 0 Critical, 0 High, 0 Medium, 0 Low, 1 Informational.

**Files Reviewed:**
- `tests/core/completeness.test.ts`
- `src/core/definitions/index.ts`
- `src/layout/registry.ts`
- `.gener8v/specifications/graph-specification-and-vocabulary.md` (the two `@spec Coverage` rows only)

Context read:
- the ticket, including its Known Hazards, and the delivery record;
- `.gener8v/constraints/prd.md` (CC-001 to CC-004; there is no per-area constraints file);
- the GSV TICKET-005 security review (for the registry and vocabulary trust model);
- the code the changed files touch or are matched by:
  - `tests/package/per-type-bundle.test.ts` (the injection regexes);
  - the `src/` call sites of `definitions` and `layouts`: `src/graph.ts`, `src/core/schema.ts`, `src/core/describe.ts`, `src/core/validate/index.ts`;
  - `tsconfig.json`;
  - `src/generated/vocabulary.json` and `src/generated/schema.json`.

**Findings:** 1
**Critical:** 0 | **High:** 0 | **Medium:** 0 | **Low:** 0 | **Informational:** 1

## Security Assessment

### Input Validation

**Status:** Adequate
**Notes:**

**No new entry point.** The delivery adds no runtime entry point. The only new code is a vitest file. It reads committed files at fixed, repository-relative URLs:
- `src/generated/vocabulary.json`;
- `src/generated/schema.json`;
- `examples/<type>.json`, where `<type>` comes from the constant `GRAPH_TYPES`.

None of it ships in `dist/` (`package.json` `files: ["dist"]`).

**No runtime behaviour change** (probe: `TSX_DISABLE_CACHE=1 npx tsx -e`, esbuild `transformSync` with `loader: "ts"`):

| File | Before (`dba9db7^`) vs after (`dba9db7`) |
|------|-------------------------------------------|
| `src/core/definitions/index.ts` | identical, 1,860 bytes |
| `src/layout/registry.ts` | identical, 1,164 bytes |

The change is in type annotations and `satisfies` clauses only. Both are erased before any code runs.

**Frozen null-prototype registries unchanged at runtime** (probe through `tsx`, importing the sources). This holds for both `definitions` and `layouts`:
- `Object.isFrozen` is `true`;
- `Object.getPrototypeOf` is `null`;
- each holds exactly 12 keys, and `registeredTypes(definitions)` returns all 12;
- `__proto__`, `toString`, `constructor` and `hasOwnProperty` all read `undefined`;
- `Object.defineProperty` throws.

`issueDocs` is also null-prototype, with 27 keys for 27 `ISSUE_CODES`.

**Lookup guards kept.** The narrower `Readonly<Record<GraphType, …>>` type could have let a call site drop its `undefined` check on a lookup by an unvalidated `type`. No call site can do so:
- every `src/` consumer passes the registry into a `…With(registry)` function typed by the partial `Registry` or `LayoutRegistry` (`src/graph.ts:61`, `src/core/describe.ts:29`, `src/core/validate/index.ts:53`, `src/core/schema.ts:393`);
- so lookups still yield `| undefined`, and `noUncheckedIndexedAccess` is on (`tsconfig.json:9`);
- even a stray lookup on an inherited key would read `undefined`, because the tables have a null prototype.

**Compile-time guard** (scratch typecheck, `$scratchpad/mutant.ts` with `tsc --ignoreConfig --strict --moduleResolution bundler`):
- dropping `cylinder` from a `satisfies Record<GraphType, GraphTypeDefinition>` literal gives 2 errors (TS2741, TS1360), as the delivery record claims;
- adding a key outside `GraphType` (`"not-a-graph-type"`) gives TS2353 under both the full and the partial `satisfies`.

So no unknown type can enter either table through the source literal.

**Bundle-test hazard.** The Known Hazard on the per-type bundle test is handled. `tests/package/per-type-bundle.test.ts:30,44` still match the unchanged `Object.create(null) as Partial<Record<…>>` cast text. The test throws if they stop matching, and `OTHER_TYPE` (`:20`) is outside `GRAPH_TYPES`.

**The new test is not vacuous on today's data.** Each check is anchored to a non-empty set:
- set and length equality against the 12 `GRAPH_TYPES`, for both registries, the 12 schema `anyOf` branches and the 12 vocabulary `graphTypes`;
- 94 vocabulary terms;
- 27 issue codes;
- 53 `kind: "string"` nodes under `graphTypes`, all with a numeric `maxLength`;
- the broken-copy and missing-entry tests, which prove the `undocumented` helper reports gaps.

Probe (`$scratchpad/probe-vacuity.txt`):
- removing every `maxLength` makes the walk report 53 gaps;
- emptying `graphTypes` is caught by "publishes a vocabulary entry for every graph type".

The one residual vacuous path is SEC-001.

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** This is a client-side rendering library with no authentication, sessions or authorization. The delivery adds none.

### Data Protection

**Status:** Adequate
**Notes:**
- No data is collected, transmitted, stored or logged (CC-003).
- The test only reads committed repository files.
- No PII, credentials or tokens appear anywhere in the diff.

### Configuration Security

**Status:** Adequate
**Notes:**
- No secrets, configuration or dependency changes. The commit touches no `package.json`, lockfile, CI or build configuration.
- **No published type changed.** Neither registry is exported:
  - `src/core/index.ts` exports only `GRAPH_TYPES` and the `GraphType` type from the definitions module;
  - a search of every `.d.ts` under `dist/` finds no `definitions` or `layouts` identifier (grep exit 1);
  - so the narrowing is invisible to consumers, and no changeset is needed.

**Dependencies:**

Tool: `pnpm audit` (pnpm 10.28.2), run 2026-10-30T12:53:02Z and `pnpm audit --prod` at 2026-10-30T12:53:03Z.

| Command | Result | Exit |
|---------|--------|------|
| `pnpm audit` | "No known vulnerabilities found" | 0 |
| `pnpm audit --prod` | "No known vulnerabilities found" | 0 |

Output: `$scratchpad/audit.txt`.

**Cryptography and logging:** Not applicable. There are no cryptographic operations, and the delivered code does no logging.

**Compliance:**
- CC-001 (licences): no dependency or asset added.
- CC-002 (WCAG): no rendering change.
- CC-003 (no data collection): satisfied.
- CC-004 (trademarked imagery): no images added.

No violations.

**Verification (re-run here, against the prebuilt `dist/`):**

| Command | Result |
|---------|--------|
| `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache tests/core/completeness.test.ts tests/package/per-type-bundle.test.ts tests/core/schema-agreement.test.ts` | 3 files, 63 tests passed, exit 0 |
| `GRAPH_GENERATOR_PREBUILT=1 npx vitest run --no-cache` | 73 files, 2,225 tests passed, exit 0 (matches the delivery record) |
| `npx tsc --noEmit -p .` | exit 0 |

No failures. `$scratchpad` is `/private/tmp/claude-501/-Users-thomas-Repositories-gener8v-gener8v-tools-education-graph-generator/90a37181-7c56-4f53-87c3-a87caf6952a9/scratchpad/security-review-gsv006/`.

## Findings

### SEC-001: The string-limit check can pass vacuously if the vocabulary's `kind` field changes shape

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** N/A (defence in depth around A06:2025 Insecure Design — published input bounds)
**Location:** `tests/core/completeness.test.ts:89-101` ("gives every string property of every graph type a maxLength"); also `tests/core/completeness.test.ts:32` (term loop), `:69-71` and `:74` (`firstTerm = ""` default)

**Description:** The walk only checks nodes whose `kind === "string"`. It never asserts that it found any. If the generator renames or restructures that field, the test still passes with zero nodes checked, and the published `maxLength` bounds could vanish unnoticed. Example renames: `type: "string"`, or a `kind` object. Probe, with every `maxLength` removed:
- `kind` left in place: 53 gaps reported;
- `kind` also renamed: 0 gaps, so the test passes.

The term check has the same shape. Nothing in this file asserts that `vocabulary.terms` is non-empty. With empty terms, "finds no undocumented entry" passes. The broken-copy test also still passes, because `firstTerm` defaults to `""` and the expected gap becomes `term `.

These bounds are what the tool schema and vocabulary tell callers and model providers about caller-text limits. Enforcement is separate: `validate` applies the limits, and `tests/core/validate-structure.test.ts` "caller text limits" covers every registered type. So this is a gap in the documentation guarantee, not in enforcement.

**Attack Scenario:** Not required (Informational). No attacker gains anything: oversized text is still rejected by `validate`, whatever the published schema says.

**Impact:** A future generator change could publish a vocabulary without its string limits, or without its terms, while this test stays green. The GSV-NFR-005 guarantee would erode silently.

**Recommendation:**
- In the walk, count the `kind === "string"` nodes visited and assert the count is greater than 0. Optionally, assert it equals the number of string properties in `propertiesOf(definitions[type])` for every type.
- Assert `Object.keys(vocabulary.terms).length > 0` before the documentation check.
- Drop the `= ""` default on `firstTerm`, or assert it is defined.

These are test-only changes, with no runtime effect.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed (Engineer — Thomas Eaves, 2026-10-30). The string-limit check must visit as many string values as the definitions declare (53), and the declared term list must be non-empty and equal the vocabulary's terms, so neither check can pass with nothing checked; `firstTerm` no longer falls back to `""`. Mutation-checked: renaming `kind` and stripping one `maxLength` each fail 2 tests. Committed in `e6d0b44`.

---

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Fix | Counts and non-empty lists required | No | `tests/core/completeness.test.ts` |

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:**
- SEC-001 fixed during resolution (`e6d0b44`); no runtime or published-type change.
- The delivery changes no runtime behaviour and no published type.
- The registries are still frozen and null-prototype, holding exactly `GRAPH_TYPES`.
- Both dependency audits are clean as of 2026-10-30T12:53Z.
- SEC-001 is a test-robustness note for resolution.
